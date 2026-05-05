import os
import base64
import uuid
import threading
import subprocess
import ssl
from pathlib import Path
from fastapi import FastAPI, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Try to find CJK font from multiple sources
def find_cjk_font():
    """Find CJK font from repo, pymupdf-fonts, or system"""
    import os
    
    # 1. Check repo's fonts/ directory (user provided)
    repo_font = Path(__file__).parent / "fonts" / "NotoSansSC-Regular.otf"
    if repo_font.exists() and repo_font.stat().st_size > 50000:
        print("Found CJK font in repo: " + str(repo_font))
        return str(repo_font)
    
    # 2. Check pymupdf-fonts package
    try:
        import pymupdf_fonts
        pymupdf_path = Path(pymupdf_fonts.__file__).parent / "fonts" / "NotoSansSC-Regular.ttf"
        if pymupdf_path.exists() and pymupdf_path.stat().st_size > 50000:
            print("Found CJK font in pymupdf-fonts: " + str(pymupdf_path))
            return str(pymupdf_path)
    except:
        pass
    
    # 3. Check temp cache
    if CJK_FONT_PATH.exists() and CJK_FONT_PATH.stat().st_size > 50000:
        print("Found CJK font in cache: " + str(CJK_FONT_PATH))
        return str(CJK_FONT_PATH)
    
    return None

CJK_FONT = find_cjk_font()
if CJK_FONT:
    print("CJK font available: " + CJK_FONT)
    try:
        register_font_for_weasyprint(CJK_FONT)
    except Exception as e:
        print("Font registration failed: " + str(e))
else:
    print("WARNING: No CJK font found, will use system fonts")

UPLOAD_DIR = Path("/tmp/pdf-service")
UPLOAD_DIR.mkdir(exist_ok=True)

FONT_CACHE_DIR = Path("/tmp/font-cache")
FONT_CACHE_DIR.mkdir(exist_ok=True)
CJK_FONT_PATH = FONT_CACHE_DIR / "NotoSansSC-Regular.ttf"

# Try to find font from pymupdf-fonts package
try:
    import pymupdf_fonts
    pymupdf_fonts_path = Path(pymupdf_fonts.__file__).parent / "fonts" / "NotoSansSC-Regular.ttf"
    if pymupdf_fonts_path.exists() and pymupdf_fonts_path.stat().st_size > 50000:
        CJK_FONT_PATH = pymupdf_fonts_path
        print("Using pymupdf-fonts CJK font: " + str(CJK_FONT_PATH))
except Exception as e:
    print("pymupdf-fonts not available: " + str(e))

# ── Job queue ──────────────────────────────────────────────────────────
jobs = {}           # job_id -> {"status": "pending"|"done"|"error", "result": ..., "error": ...}
jobs_lock = threading.Lock()
OUTPUT_DIR = Path("/tmp/pdf-outputs")
OUTPUT_DIR.mkdir(exist_ok=True)


def ensure_cjk_font():
    """Download CJK font to a known location for WeasyPrint"""
    # 1. Check if font already cached
    print(f"ensure_cjk_font: Checking {CJK_FONT_PATH}")
    print(f"ensure_cjk_font: File exists: {CJK_FONT_PATH.exists()}")
    if CJK_FONT_PATH.exists():
        print(f"ensure_cjk_font: File size: {CJK_FONT_PATH.stat().st_size}")
    if CJK_FONT_PATH.exists() and CJK_FONT_PATH.stat().st_size > 50000:
        print("Using cached CJK font: " + str(CJK_FONT_PATH))
        return str(CJK_FONT_PATH)
    
    # 2. Download from network
    print("ensure_cjk_font: Starting download...")
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    urls = [
        "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetTTF/SC/NotoSansSC-Regular.ttf",
        "https://github.com/googlefonts/noto-cjk/raw/main/Sans/SubsetTTF/SC/NotoSansSC-Regular.ttf"
    ]
    
    for url in urls:
        try:
            print(f"ensure_cjk_font: Trying {url}")
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            response = urllib.request.urlopen(req, timeout=120, context=ssl_context)
            print(f"ensure_cjk_font: Response status: {response.status}")
            print(f"ensure_cjk_font: Content-Type: {response.headers.get('Content-Type')}")
            data = response.read()
            print(f"ensure_cjk_font: Downloaded {len(data)} bytes")
            if len(data) > 50000:
                CJK_FONT_PATH.write_bytes(data)
                print("Downloaded CJK font: " + str(len(data)) + " bytes")
                return str(CJK_FONT_PATH)
            else:
                print(f"ensure_cjk_font: File too small: {len(data)} bytes")
        except Exception as e:
            print(f"ensure_cjk_font: Download failed from {url}: {e}")
            continue
    
    print("WARNING: CJK font download failed")
    return None


def register_font_for_weasyprint(font_path):
    """Register font with fc-cache for WeasyPrint/Pango"""
    try:
        import subprocess
        # Add font directory to fontconfig cache
        result = subprocess.run(
            ['fc-cache', '-fv', str(Path(font_path).parent)],
            capture_output=True, text=True, timeout=30
        )
        print("fc-cache output: " + str(result.stdout)[:200])
        if result.stderr:
            print("fc-cache errors: " + str(result.stderr)[:200])
        return True
    except Exception as e:
        print("fc-cache failed: " + str(e))
        return False

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
            import shutil
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


def _docx_to_pdf(input_path: Path) -> Path:
    try:
        import mammoth
        import weasyprint
    except ImportError as e:
        raise Exception("Missing dependency: " + str(e) + ". Run: pip install mammoth weasyprint")

    output_path = input_path.with_suffix(".pdf")
    try:
        # Step 1: Find CJK font
        print("Finding CJK font...")
        cjk_font = CJK_FONT  # from find_cjk_font()
        if cjk_font:
            print("CJ K font found: " + cjk_font)
            try:
                register_font_for_weasyprint(cjk_font)
            except Exception as e:
                print("Font registration warning: " + str(e))
        else:
            print("WARNING: No CJK font found, will use system fonts")
        
        # Step 2: Convert docx to HTML with mammoth
        print("Converting " + str(input_path) + " to HTML with mammoth...")
        with open(input_path, 'rb') as f:
            result = mammoth.convert_to_html(f)
            html = result.value
            messages = result.messages
            for msg in messages:
                print("Mammoth: " + str(msg))
        
        # Step 3: Generate CSS with font-face if font available
        font_face = ""
        if cjk_font:
            font_face = f"""
        @font-face {{
            font-family: 'NotoSansSC';
            src: url('file://{cjk_font}') format('truetype');
            font-weight: normal;
            font-style: normal;
        }}"""
        
        html_with_style = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>{font_face}
        body {{ font-family: 'NotoSansSC', 'Noto Sans CJK SC', 'WenQuanYi Micro Hei', 
              'Microsoft YaHei', 'SimHei', 'sans-serif'; 
              margin: 2cm; line-height: 1.8; font-size: 12pt; }}
        img {{ max-width: 100%; height: auto; display: block; margin: 1em auto; }}
        table {{ border-collapse: collapse; width: 100%; margin: 1.5em 0; 
              font-size: 10pt; table-layout: fixed; word-wrap: break-word; }}
        th, td {{ border: 1px solid #666; padding: 6px 10px; 
                   text-align: left; vertical-align: top; }}
        th {{ background-color: #e8e8e8; font-weight: bold; }}
        tr:nth-child(even) {{ background-color: #f9f9f9; }}
        h1 {{ font-size: 1.8em; margin: 1em 0 0.5em 0; page-break-after: avoid; }}
        h2 {{ font-size: 1.4em; margin: 0.8em 0 0.4em 0; page-break-after: avoid; }}
        h3 {{ font-size: 1.2em; margin: 0.6em 0 0.3em 0; page-break-after: avoid; }}
        p {{ margin: 0.6em 0; }}
        ul, ol {{ margin: 0.5em 0; padding-left: 2em; }}
        li {{ margin: 0.3em 0; }}
    </style>
</head>
<body>""" + html + """</body></html>"""
        
        # Step 4: Convert HTML to PDF with weasyprint
        print("Converting HTML to PDF with weasyprint...")
        try:
            from weasyprint.text.fonts import FontConfiguration
            font_config = FontConfiguration()
            print("Using FontConfiguration")
            weasyprint.HTML(string=html_with_style).write_pdf(str(output_path), font_config=font_config)
        except Exception as fe:
            print("FontConfiguration failed: " + str(fe) + ", trying without...")
            weasyprint.HTML(string=html_with_style).write_pdf(str(output_path))
        
        print("PDF generated with mammoth+weasyprint: " + str(output_path))
        return output_path
    except Exception as e:
        raise Exception("Mammoth/WeasyPrint conversion failed: " + str(e))

@app.get("/debug")
def debug():
    result = {"tests": []}
    
    # Get the actual font path being used
    cjk_font = find_cjk_font()
    result["cjk_font_path"] = cjk_font if cjk_font else "None"
    result["cjk_font_exists"] = Path(cjk_font).exists() if cjk_font else False
    if cjk_font and Path(cjk_font).exists():
        result["cjk_font_size"] = Path(cjk_font).stat().st_size
    
    # Test: WeasyPrint version
    try:
        import weasyprint
        result["weasyprint_version"] = weasyprint.__version__
    except Exception as e:
        result["weasyprint_version"] = str(e)
    
    # Test: FontConfiguration
    try:
        from weasyprint.text.fonts import FontConfiguration
        result["font_config"] = "FontConfiguration available"
    except Exception as e:
        result["font_config"] = str(e)
    
    # Test: List fonts directory
    try:
        import os
        fonts_dir = Path(__file__).parent / "fonts"
        if fonts_dir.exists():
            files = os.listdir(fonts_dir)
            result["repo_fonts_dir"] = files
        else:
            result["repo_fonts_dir"] = "Directory not found"
    except Exception as e:
        result["repo_fonts_dir"] = str(e)
    
    return result

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "ok", "service": "PDF Converter"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "PDF Converter", "timestamp": __import__('datetime').datetime.now().isoformat()}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
