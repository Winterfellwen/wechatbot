import os
import base64
import uuid
import threading
import subprocess
from pathlib import Path
from fastapi import FastAPI, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

UPLOAD_DIR = Path("/tmp/pdf-service")
UPLOAD_DIR.mkdir(exist_ok=True)



# ── Job queue ──────────────────────────────────────────────────────────────────
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
        # Debug: check weasyprint version and fonts
        print("Weasyprint version: " + str(weasyprint.__version__))
        try:
            result = subprocess.run(['fc-list', ':lang=zh'], capture_output=True, text=True, timeout=10)
            print("Available Chinese fonts:")
            print(result.stdout[:500] if result.stdout else "None found")
        except Exception as fl:
            print("fc-list failed: " + str(fl))
        
        try:
            from weasyprint.text.fonts import FontConfiguration
            font_config = FontConfiguration()
            print("FontConfiguration created successfully")
        except Exception as fe:
            print("Font config error: " + str(fe))
            font_config = None

        # Convert docx to HTML with mammoth (preserves images and basic formatting)
        print("Converting " + str(input_path) + " to HTML with mammoth...")
        with open(input_path, 'rb') as f:
            result = mammoth.convert_to_html(f)
            html = result.value
            messages = result.messages
            for msg in messages:
                print("Mammoth: " + str(msg))

        # Add basic CSS for better rendering
        # Expanded font list for Pango/WeasyPrint
        html_with_style = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Noto Sans CJK SC', 'Noto Sans SC', 'Noto Sans CJK', 'WenQuanYi Micro Hei', 
              'Microsoft YaHei', 'SimHei', 'SimSun', 'FangSong', 'KaiTi', 
              sans-serif; margin: 2cm; line-height: 1.8; font-size: 12pt; }
        img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
        table { border-collapse: collapse; width: 100%; margin: 1.5em 0; 
              font-size: 10pt; table-layout: fixed; word-break: break-word; }
        th, td { border: 1px solid #666; padding: 6px 10px; 
                 text-align: left; vertical-align: top; }
        th { background-color: #e8e8e8; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        h1 { font-size: 1.8em; margin: 1em 0 0.5em 0; page-break-after: avoid; }
        h2 { font-size: 1.4em; margin: 0.8em 0 0.4em 0; page-break-after: avoid; }
        h3 { font-size: 1.2em; margin: 0.6em 0 0.3em 0; page-break-after: avoid; }
        p { margin: 0.6em 0; }
        ul, ol { margin: 0.5em 0; padding-left: 2em; }
        li { margin: 0.3em 0; }
    </style>
</head>
<body>""" + html + """</body></html>"""

        # Convert HTML to PDF with weasyprint
        print("Converting HTML to PDF with weasyprint...")
        try:
            from weasyprint.text.fonts import FontConfiguration
            font_config = FontConfiguration()
            print("Using custom font configuration")
        except Exception as fe:
            print("Font config not available: " + str(fe))
            font_config = None

        if font_config:
            weasyprint.HTML(string=html_with_style).write_pdf(str(output_path), font_config=font_config)
        else:
            weasyprint.HTML(string=html_with_style).write_pdf(str(output_path))

        print("PDF generated with mammoth+weasyprint: " + str(output_path))
        return output_path
    except Exception as e:
        raise Exception("Mammoth/WeasyPrint conversion failed: " + str(e))

@app.get("/debug")
def debug():
    try:
        result = subprocess.run(['fc-list', ':lang=zh'], capture_output=True, text=True, timeout=10)
        fonts = result.stdout[:2000]
    except Exception as e:
        fonts = str(e)
    try:
        import weasyprint
        wp_ver = weasyprint.__version__
    except Exception as e:
        wp_ver = str(e)
    try:
        from weasyprint.text.fonts import FontConfiguration
        font_config = "FontConfiguration available"
    except Exception as e:
        font_config = str(e)
    return {"fonts": fonts, "weasyprint_version": wp_ver, "font_config": font_config}

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "ok", "service": "PDF Converter"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "PDF Converter", "timestamp": __import__('datetime').datetime.now().isoformat()}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
