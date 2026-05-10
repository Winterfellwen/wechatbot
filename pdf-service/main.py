import os
import base64
import uuid
import threading
import subprocess
import shutil
from pathlib import Path
from fastapi import FastAPI, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Version marker for debugging
PDF_SERVICE_VERSION = "2026-05-11-libreoffice-v1"

UPLOAD_DIR = Path("/tmp/pdf-service")
UPLOAD_DIR.mkdir(exist_ok=True)

FONT_CACHE_DIR = Path("/tmp/font-cache")
FONT_CACHE_DIR.mkdir(exist_ok=True)

# ── LibreOffice path ──────────────────────────────────────────────────
def find_libreoffice() -> str | None:
    """Find LibreOffice binary path."""
    candidates = [
        "/usr/bin/libreoffice",
        "/usr/bin/soffice",
        "/usr/local/bin/libreoffice",
        "/usr/local/bin/soffice",
        "/snap/bin/libreoffice",
    ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    # Try which
    try:
        result = subprocess.run(["which", "libreoffice"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    try:
        result = subprocess.run(["which", "soffice"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None

LIBREOFFICE_BIN = find_libreoffice()
if LIBREOFFICE_BIN:
    print("LibreOffice found: " + LIBREOFFICE_BIN)
else:
    print("WARNING: LibreOffice not found, DOCX→PDF will use fallback")

# ── Job queue ──────────────────────────────────────────────────────────
jobs = {}           # job_id -> {"status": "pending"|"done"|"error", "result": ..., "error": ...}
jobs_lock = threading.Lock()
OUTPUT_DIR = Path("/tmp/pdf-outputs")
OUTPUT_DIR.mkdir(exist_ok=True)


def _run_convert(job_id: str, file_data: bytes, filename: str, from_fmt: str, to_fmt: str):
    """Background conversion worker (runs in thread)."""
    input_path = UPLOAD_DIR / f"{job_id}_in.{from_fmt}"
    try:
        input_path.write_bytes(file_data)

        if from_fmt == "pdf" and to_fmt in ("docx", "doc"):
            output_path = _pdf_to_docx(input_path, to_fmt)
        elif from_fmt in ("docx", "doc") and to_fmt == "pdf":
            output_path = _docx_to_pdf(input_path)
        elif from_fmt == "doc" and to_fmt == "docx":
            output_path = input_path.with_suffix(".docx")
            shutil.copy(input_path, output_path)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported: {from_fmt} -> {to_fmt}")

        # Move output to persistent dir with job_id
        out_name = f"{job_id}.{to_fmt}"
        final_path = OUTPUT_DIR / out_name
        final_path.write_bytes(output_path.read_bytes())

        with jobs_lock:
            jobs[job_id] = {"status": "done", "result": out_name}
    except HTTPException as e:
        with jobs_lock:
            jobs[job_id] = {"status": "error", "error": e.detail}
    except Exception as e:
        with jobs_lock:
            jobs[job_id] = {"status": "error", "error": str(e)}
    finally:
        if input_path.exists():
            input_path.unlink(missing_ok=True)


# ── /convert → submit job, return job_id immediately ──────────────────────────
class ConvertRequest(BaseModel):
    file_base64: str
    filename: str
    from_fmt: str = "pdf"
    to_fmt: str = "docx"

@app.post("/convert")
async def convert(req: ConvertRequest):
    try:
        file_data = base64.b64decode(req.file_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid base64 data: " + str(e))

    job_id = uuid.uuid4().hex
    with jobs_lock:
        jobs[job_id] = {"status": "pending", "result": None}

    thread = threading.Thread(target=_run_convert, args=(
        job_id, file_data, req.filename, req.from_fmt, req.to_fmt))
    thread.daemon = True
    thread.start()

    return {"job_id": job_id, "status": "pending"}


# ── /status/{job_id} ──────────────────────────────────────────────────────────
@app.get("/status/{job_id}")
async def get_status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ── /download/{filename} ─────────────────────────────────────────────────────
@app.get("/download/{filename}")
async def download(filename: str):
    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    fmt = path.suffix[1:]   # e.g. "docx"
    return FileResponse(path, filename=f"converted.{fmt}",
                        media_type="application/octet-stream")


# ── /edit → edit job (watermark / rotate) ─────────────────────────────────────
@app.post("/edit")
async def edit(file_base64: str = Form(...), op: str = Form(""), text: str = Form(""), angle: str = Form("90")):
    try:
        file_data = base64.b64decode(file_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 data")

    job_id = uuid.uuid4().hex
    with jobs_lock:
        jobs[job_id] = {"status": "pending"}

    def _run_edit():
        input_path = UPLOAD_DIR / f"{job_id}_in.pdf"
        input_path.write_bytes(file_data)
        try:
            if op == "watermark":
                output_path = _pdf_watermark(input_path, text)
            elif op == "rotate":
                output_path = _pdf_rotate(input_path, int(angle))
            else:
                raise HTTPException(status_code=400, detail=f"Unknown op: {op}")

            out_name = f"{job_id}.pdf"
            final_path = OUTPUT_DIR / out_name
            final_path.write_bytes(output_path.read_bytes())

            with jobs_lock:
                jobs[job_id] = {"status": "done", "result": out_name}
        except HTTPException as e:
            with jobs_lock:
                jobs[job_id] = {"status": "error", "error": e.detail}
        except Exception as e:
            with jobs_lock:
                jobs[job_id] = {"status": "error", "error": str(e)}
        finally:
            if input_path.exists():
                input_path.unlink(missing_ok=True)

    thread = threading.Thread(target=_run_edit)
    thread.daemon = True
    thread.start()

    return {"job_id": job_id, "status": "pending"}


# ── Conversion helpers (sync, called from thread) ────────────────────────────
def _pdf_to_docx(input_path: Path, to_fmt: str) -> Path:
    from pdf2docx import Converter
    output_path = input_path.with_suffix(".docx")
    cv = Converter(str(input_path))
    cv.convert(str(output_path))
    cv.close()
    if to_fmt == "doc":
        doc_path = input_path.with_suffix(".doc")
        output_path.rename(doc_path)
        return doc_path
    return output_path


def _docx_to_pdf(input_path: Path) -> Path:
    """Convert DOCX to PDF using LibreOffice headless (best fidelity)."""
    output_path = input_path.with_suffix(".pdf")

    # --- Method 1: LibreOffice headless (best quality) ---
    if LIBREOFFICE_BIN:
        try:
            # Use a temp output dir to avoid conflicts
            tmp_out = UPLOAD_DIR / f"lo_out_{uuid.uuid4().hex[:8]}"
            tmp_out.mkdir(exist_ok=True)

            cmd = [
                LIBREOFFICE_BIN,
                "--headless",
                "--norestore",
                "--safe-mode",
                "--convert-to", "pdf",
                "--outdir", str(tmp_out),
                str(input_path),
            ]
            print("LibreOffice cmd: " + " ".join(cmd))
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
            )
            print("LibreOffice stdout: " + result.stdout[:500] if result.stdout else "")
            print("LibreOffice stderr: " + result.stderr[:500] if result.stderr else "")
            print("LibreOffice returncode: " + str(result.returncode))

            # Find the generated PDF in the output dir
            pdf_files = list(tmp_out.glob("*.pdf"))
            if pdf_files:
                generated = pdf_files[0]
                shutil.copy2(generated, output_path)
                # Cleanup temp dir
                shutil.rmtree(tmp_out, ignore_errors=True)
                print("LibreOffice conversion success: " + str(output_path))
                return output_path
            else:
                print("LibreOffice produced no PDF, falling back...")
                shutil.rmtree(tmp_out, ignore_errors=True)
        except subprocess.TimeoutExpired:
            print("LibreOffice timeout, falling back...")
        except Exception as e:
            print("LibreOffice error: " + str(e) + ", falling back...")

    # --- Method 2: DOCX -> HTML -> Images -> PDF ---
    try:
        from mammoth import convert_to_html
        from PIL import Image, ImageDraw, ImageFont
        import fitz
        import io

        print("Fallback: Using mammoth + PIL for DOCX→PDF (image-based)...")

        # DOCX to HTML with embedded images
        with open(str(input_path), 'rb') as docx_file:
            result = convert_to_html(docx_file)
            html_content = result.value

        # Parse HTML to extract content
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')

        # A4 dimensions at 96 DPI
        DPI = 96
        PAGE_WIDTH = int(8.27 * DPI)   # ~794px
        PAGE_HEIGHT = int(11.69 * DPI)  # ~1123px
        MARGIN = int(0.5 * DPI)         # ~48px margins
        LINE_HEIGHT = 18

        def load_font(size, bold=False):
            """Try to load a font, fallback to default."""
            try:
                return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
            except:
                try:
                    return ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", size)
                except:
                    return ImageFont.load_default()

        def wrap_text(text, font, max_width):
            """Simple word wrap."""
            words = text.split()
            lines = []
            current_line = ""

            for word in words:
                test_line = (current_line + " " + word).strip()
                try:
                    bbox = font.getbbox(test_line)
                    width = bbox[2] - bbox[0]
                except:
                    width = len(test_line) * 6
                if width <= max_width:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = word

            if current_line:
                lines.append(current_line)

            return lines if lines else [""]

        def create_page():
            img = Image.new('RGB', (PAGE_WIDTH, PAGE_HEIGHT), 'white')
            draw = ImageDraw.Draw(img)
            return img, draw

        def save_page(img):
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            return buf.getvalue()

        # Collect all text elements in order
        all_elements = []
        for elem in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table']):
            all_elements.append(elem)

        pages = []
        current_img, current_draw = create_page()
        y_pos = MARGIN
        max_width = PAGE_WIDTH - 2 * MARGIN

        def add_new_page():
            nonlocal current_img, current_draw, y_pos
            pages.append(save_page(current_img))
            current_img, current_draw = create_page()
            y_pos = MARGIN

        # Process all text content
        for elem in all_elements:
            tag = elem.name
            text = elem.get_text(strip=True)

            if not text:
                continue

            font_size = 12
            bold = False
            if tag.startswith('h1'):
                font_size = 24
                bold = True
            elif tag.startswith('h2'):
                font_size = 18
                bold = True
            elif tag.startswith('h3'):
                font_size = 14
                bold = True

            font = load_font(font_size, bold)
            lines = wrap_text(text, font, max_width)

            for line in lines:
                if y_pos + font_size + 6 > PAGE_HEIGHT - MARGIN:
                    add_new_page()
                current_draw.text((MARGIN, y_pos), line, font=font, fill='black')
                y_pos += font_size + 6

            y_pos += 8  # paragraph spacing

        # Save last page if has content
        if y_pos > MARGIN + 20:
            pages.append(save_page(current_img))

        print(f"Generated {len(pages)} pages from DOCX content")

        # Create PDF from images
        pdf_doc = fitz.open()
        for page_img_bytes in pages:
            page_img = Image.open(io.BytesIO(page_img_bytes))
            if page_img.mode != 'RGB':
                page_img = page_img.convert('RGB')

            # Save temp PNG
            temp_png = UPLOAD_DIR / f"{uuid.uuid4().hex[:8]}.png"
            page_img.save(str(temp_png), 'PNG')

            # Add page to PDF
            page = pdf_doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
            page.insert_image(fitz.Rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT), filename=str(temp_png))
            temp_png.unlink(missing_ok=True)

        pdf_doc.save(str(output_path))
        pdf_doc.close()

        print("mammoth+PIL image-based PDF success: " + str(output_path))
        return output_path

    except ImportError as e:
        print("mammoth or weasyprint not available: " + str(e))
    except Exception as e:
        print("mammoth+weasyprint error: " + str(e))

    # --- Method 3: Final fallback - extract text only ---
    try:
        import fitz
        from docx import Document

        print("Final fallback: Extracting text only (format will be lost)...")

        doc = Document(str(input_path))
        pdf_doc = fitz.open()
        page = pdf_doc.new_page(width=595, height=842)
        y_pos = 50
        x_pos = 50

        for para in doc.paragraphs:
            text = para.text
            if not text.strip():
                y_pos += 14
                continue

            if y_pos > 780:
                page = pdf_doc.new_page(width=595, height=842)
                y_pos = 50

            page.insert_text((x_pos, y_pos), text, fontsize=11)
            y_pos += 16

        pdf_doc.save(str(output_path))
        pdf_doc.close()
        print("Text-only fallback done: " + str(output_path))
        return output_path

    except Exception as e2:
        raise Exception("DOCX→PDF conversion failed: " + str(e2))


def _pdf_watermark(input_path: Path, text: str) -> Path:
    import fitz
    doc = fitz.open(str(input_path))
    for page in doc:
        rect = page.rect
        page.insert_text(
            fitz.Point(rect.width / 2 - 80, rect.height / 2),
            text or "WATERMARK",
            fontsize=40, color=(0.7, 0.7, 0.7), rotate=45, overlay=True
        )
    output_path = input_path.with_suffix("_wm.pdf")
    doc.save(str(output_path))
    doc.close()
    return output_path


def _pdf_rotate(input_path: Path, angle: int = 90) -> Path:
    import fitz
    doc = fitz.open(str(input_path))
    for page in doc:
        page.set_rotation((page.rotation or 0) + angle)
    output_path = input_path.with_suffix("_rot.pdf")
    doc.save(str(output_path))
    doc.close()
    return output_path


def debug():
    result = {"tests": []}
    result["libreoffice_bin"] = LIBREOFFICE_BIN or "Not found"
    result["version"] = PDF_SERVICE_VERSION

    # Test: LibreOffice version
    if LIBREOFFICE_BIN:
        try:
            v = subprocess.run([LIBREOFFICE_BIN, "--version"], capture_output=True, text=True, timeout=10)
            result["libreoffice_version"] = v.stdout.strip()
        except Exception as e:
            result["libreoffice_version"] = str(e)

    # Test: pdf2docx
    try:
        import pdf2docx
        result["pdf2docx_version"] = pdf2docx.__version__
    except Exception as e:
        result["pdf2docx_version"] = str(e)

    # Test: PyMuPDF
    try:
        import fitz
        result["pymupdf_version"] = fitz.version[0]
    except Exception as e:
        result["pymupdf_version"] = str(e)

    return result


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "ok", "service": "PDF Converter", "version": PDF_SERVICE_VERSION}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "PDF Converter", "version": PDF_SERVICE_VERSION, "timestamp": __import__('datetime').datetime.now().isoformat()}

@app.get("/debug")
def debug_endpoint():
    return debug()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
