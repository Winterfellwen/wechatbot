import os
import sys
import base64
import uuid
import threading
import subprocess
import shutil
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

UPLOAD_DIR = Path(os.environ.get("PDF_TEMP_DIR", "/tmp")) / "pdf-service"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR = Path(os.environ.get("PDF_TEMP_DIR", "/tmp")) / "pdf-outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def find_libreoffice() -> str | None:
    env_path = os.environ.get("LIBREOFFICE_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    candidates = [
        "/usr/bin/libreoffice",
        "/usr/bin/soffice",
        "/usr/local/bin/libreoffice",
        "/usr/local/bin/soffice",
        "/snap/bin/libreoffice",
    ]

    if sys.platform == "win32":
        prog_files = os.environ.get("ProgramFiles", "C:\\Program Files")
        candidates.extend([
            os.path.join(prog_files, "LibreOffice", "program", "soffice.exe"),
            os.path.join(prog_files, "LibreOffice", "program", "swriter.exe"),
            "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
            "C:\\Program Files\\LibreOffice\\program\\swriter.exe",
        ])

    for p in candidates:
        if os.path.isfile(p):
            return p
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
    print(f"LibreOffice found: {LIBREOFFICE_BIN}")
else:
    print("WARNING: LibreOffice not found — DOCX→PDF will fail")


jobs = {}
jobs_lock = threading.Lock()
_lo_lock = threading.Lock()


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
        raise HTTPException(status_code=400, detail=f"Invalid base64: {e}")

    job_id = uuid.uuid4().hex
    with jobs_lock:
        jobs[job_id] = {"status": "pending"}

    thread = threading.Thread(
        target=_run_convert, args=(job_id, file_data, req.filename, req.from_fmt, req.to_fmt)
    )
    thread.daemon = True
    thread.start()

    return {"job_id": job_id, "status": "pending"}


@app.get("/status/{job_id}")
async def get_status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/download/{filename}")
async def download(filename: str):
    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    ext = path.suffix[1:]
    return FileResponse(
        path,
        filename=f"converted.{ext}",
        media_type="application/octet-stream",
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "PDF Converter"}


def _run_convert(job_id: str, file_data: bytes, filename: str, from_fmt: str, to_fmt: str):
    ext_in = from_fmt if from_fmt in ("pdf", "docx") else filename.rsplit(".", 1)[-1]
    input_path = UPLOAD_DIR / f"{job_id}_in.{ext_in}"
    try:
        input_path.write_bytes(file_data)

        if from_fmt == "pdf" and to_fmt == "docx":
            output_path = _pdf_to_docx(input_path)
        elif from_fmt == "docx" and to_fmt == "pdf":
            output_path = _docx_to_pdf(input_path)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported conversion: {from_fmt} -> {to_fmt}",
            )

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
        _safe_unlink(input_path)
        intermediate = input_path.with_suffix(f".{to_fmt}")
        _safe_unlink(intermediate)


def _safe_unlink(path: Path):
    try:
        if path.exists():
            path.unlink(missing_ok=True)
    except Exception:
        pass


def _pdf_to_docx(input_path: Path) -> Path:
    from pdf2docx import Converter

    output_path = input_path.with_suffix(".docx")
    cv = Converter(str(input_path))
    cv.convert(str(output_path))
    cv.close()
    return output_path


def _kill_libreoffice():
    """Kill any leftover LibreOffice processes to avoid port conflicts."""
    try:
        subprocess.run(["pkill", "-f", "libreoffice"], capture_output=True, timeout=10)
        subprocess.run(["pkill", "-f", "soffice.bin"], capture_output=True, timeout=10)
    except Exception:
        pass


def _docx_to_pdf(input_path: Path) -> Path:
    if not LIBREOFFICE_BIN:
        raise RuntimeError(
            "LibreOffice is required for DOCX→PDF conversion but was not found. "
            "Install it with: apt-get install libreoffice-writer"
        )

    import fitz

    job_tag = uuid.uuid4().hex[:8]
    lo_home = UPLOAD_DIR / f"lo_home_{job_tag}"
    lo_home.mkdir(parents=True, exist_ok=True)
    tmp_out = UPLOAD_DIR / f"lo_out_{job_tag}"
    tmp_out.mkdir(exist_ok=True)

    if not input_path.exists() or input_path.stat().st_size == 0:
        raise RuntimeError(f"Input file missing or empty: {input_path}")

    try:
        import zipfile
        with zipfile.ZipFile(input_path) as zf:
            if not any(n.endswith('.xml') for n in zf.namelist()):
                raise RuntimeError(f"DOCX file has no XML content entries: {input_path}")
    except zipfile.BadZipFile:
        raise RuntimeError(f"Input file is not a valid DOCX (bad ZIP): {input_path}")
    except Exception as e:
        raise RuntimeError(f"Input file validation failed: {e}")

    lo_env = os.environ.copy()
    lo_env.pop("SAL_USE_VCLPLUGIN", None)
    lo_env["HOME"] = str(lo_home)

    def _run_lo(timeout_sec: int) -> subprocess.CompletedProcess:
        cmd = [
            LIBREOFFICE_BIN,
            "--headless",
            "--norestore",
            "--nofirststartwizard",
            "--convert-to", "pdf",
            "--outdir", str(tmp_out),
            str(input_path),
        ]
        print(f"LibreOffice: {' '.join(cmd)}")
        print(f"LO HOME={lo_env.get('HOME')}, file={input_path}, size={input_path.stat().st_size}, exists={input_path.exists()}")
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_sec, env=lo_env)

    with _lo_lock:
        _kill_libreoffice()
        try:
            result = _run_lo(300)
            print(f"LO stdout: {(result.stdout or '')[:500]}")
            print(f"LO stderr: {(result.stderr or '')[:500]}")
            print(f"LO returncode: {result.returncode}")

            # Retry once if LO exits with error (sometimes transient)
            if result.returncode != 0:
                _kill_libreoffice()
                print("LibreOffice failed, retrying once...")
                result = _run_lo(300)
                print(f"LO retry stdout: {(result.stdout or '')[:500]}")
                print(f"LO retry stderr: {(result.stderr or '')[:500]}")
                print(f"LO retry returncode: {result.returncode}")

        pdf_files = list(tmp_out.glob("*.pdf"))
        if not pdf_files:
            raise RuntimeError(
                f"LibreOffice produced no PDF. returncode={result.returncode} "
                f"stderr: {(result.stderr or '')[:1000]}"
            )

        lo_pdf_path = pdf_files[0]
        lo_size = lo_pdf_path.stat().st_size
        print(f"LO PDF created: {lo_pdf_path}, size={lo_size}")
        if lo_size == 0:
            raise RuntimeError("LibreOffice produced an empty PDF")

        zoom = 300.0 / 72.0
        lo_doc = fitz.open(str(lo_pdf_path))
        num_pages = len(lo_doc)
        print(f"Rendering {num_pages} page(s) at 300 DPI")

        out_doc = fitz.open()
        A4_W, A4_H = 595, 842

        for i in range(num_pages):
            page = lo_doc[i]
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
            img_bytes = pix.tobytes("png")
            new_page = out_doc.new_page(width=A4_W, height=A4_H)
            new_page.insert_image(fitz.Rect(0, 0, A4_W, A4_H), stream=img_bytes)
            print(f"  Page {i+1}: {pix.width}x{pix.height}px, {len(img_bytes)} bytes")

        lo_doc.close()

        output_path = input_path.with_suffix(".pdf")
        out_doc.save(str(output_path), garbage=4, deflate=True)
        out_doc.close()
        print(f"Image PDF saved: {output_path}, size={output_path.stat().st_size}")

        return output_path
    finally:
        shutil.rmtree(tmp_out, ignore_errors=True)
        shutil.rmtree(lo_home, ignore_errors=True)
        _kill_libreoffice()


@app.get("/")
async def root():
    return {"status": "ok", "service": "PDF Converter"}


@app.get("/debug")
async def debug():
    info = {"libreoffice": LIBREOFFICE_BIN or "not found"}
    try:
        import pdf2docx
        info["pdf2docx"] = pdf2docx.__version__
    except Exception as e:
        info["pdf2docx"] = str(e)
    try:
        import fitz
        info["pymupdf"] = fitz.version[0]
    except Exception as e:
        info["pymupdf"] = str(e)
    try:
        import PIL
        info["pillow"] = PIL.__version__
    except Exception as e:
        info["pillow"] = str(e)
    try:
        from pymupdf_fonts import font_version
        info["pymupdf_fonts"] = font_version
    except Exception as e:
        info["pymupdf_fonts"] = str(e)
    return info


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
