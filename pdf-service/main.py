import os
import sys
import base64
import uuid
import asyncio
import subprocess
import shutil
import zipfile
import struct as _struct
import io as _io
import zlib as _zlib
import time
from pathlib import Path
from contextlib import contextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# === Config ===
MAX_FILE_SIZE = 30 * 1024 * 1024  # 30MB
MAX_CONCURRENT = int(os.environ.get("MAX_CONCURRENT", "2"))  # how many convert at once
JOB_CLEANUP_AGE = 3600  # 1 hour
UPLOAD_DIR = Path(os.environ.get("PDF_TEMP_DIR", "/tmp")) / "pdf-service"
OUTPUT_DIR = Path(os.environ.get("PDF_TEMP_DIR", "/tmp")) / "pdf-outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def find_libreoffice() -> str | None:
    env_path = os.environ.get("LIBREOFFICE_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path
    candidates = [
        "/usr/bin/libreoffice", "/usr/bin/soffice",
        "/usr/local/bin/libreoffice", "/usr/local/bin/soffice",
        "/snap/bin/libreoffice",
    ]
    if sys.platform == "win32":
        prog = os.environ.get("ProgramFiles", "C:\\Program Files")
        candidates += [
            os.path.join(prog, "LibreOffice", "program", "soffice.exe"),
            "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    for bin_name in ("libreoffice", "soffice"):
        try:
            r = subprocess.run(["which", bin_name], capture_output=True, text=True, timeout=5)
            if r.returncode == 0 and r.stdout.strip():
                return r.stdout.strip()
        except Exception:
            pass
    return None


LIBREOFFICE_BIN = find_libreoffice()
print(f"LibreOffice: {LIBREOFFICE_BIN or 'NOT FOUND'}")


# === Queue-based job management ===
jobs = {}
_queue = asyncio.Queue()
_queue_sem = asyncio.Semaphore(MAX_CONCURRENT)
_queue_position = 0
_last_cleanup = time.time()


def _cleanup_old_jobs():
    global _last_cleanup
    now = time.time()
    if now - _last_cleanup < 300:
        return
    _last_cleanup = now
    stale = [jid for jid, j in list(jobs.items()) if now - j.get("created_at", 0) > JOB_CLEANUP_AGE]
    for jid in stale:
        jobs.pop(jid, None)
        for p in Path(UPLOAD_DIR).glob(f"{jid}_*"):
            _safe_unlink(p)
        for p in Path(OUTPUT_DIR).glob(f"{jid}.*"):
            _safe_unlink(p)


async def _queue_worker():
    """Background worker: pulls jobs from queue, processes with limited concurrency."""
    while True:
        job_id, file_data, filename, from_fmt, to_fmt = await _queue.get()
        try:
            async with _queue_sem:
                await asyncio.get_event_loop().run_in_executor(
                    None, _run_convert, job_id, file_data, filename, from_fmt, to_fmt
                )
        finally:
            _queue.task_done()


@app.on_event("startup")
async def _start_workers():
    asyncio.create_task(_queue_worker())


class ConvertRequest(BaseModel):
    file_base64: str = Field(..., max_length=int(MAX_FILE_SIZE * 1.4))
    filename: str
    from_fmt: str = "pdf"
    to_fmt: str = "docx"


@app.post("/convert")
async def convert(req: ConvertRequest):
    _cleanup_old_jobs()

    try:
        file_data = base64.b64decode(req.file_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64: {e}")

    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large ({len(file_data)} bytes). Max: {MAX_FILE_SIZE}")

    job_id = uuid.uuid4().hex
    global _queue_position
    _queue_position += 1
    pos = _queue_position

    jobs[job_id] = {
        "status": "queued", "queue_position": pos, "created_at": time.time()
    }

    await _queue.put((job_id, file_data, req.filename, req.from_fmt, req.to_fmt))

    return {"job_id": job_id, "status": "queued", "queue_position": pos}


@app.get("/status/{job_id}")
async def get_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    resp = {k: v for k, v in job.items() if k != "created_at"}
    if job.get("status") == "queued":
        pending_before = sum(
            1 for j in jobs.values()
            if j.get("status") == "queued"
            and j.get("queue_position", 0) < job.get("queue_position", 0)
        )
        resp["ahead_in_queue"] = pending_before
    return resp


@app.get("/download/{filename}")
async def download(filename: str):
    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    ext = path.suffix[1:]
    return FileResponse(path, filename=f"converted.{ext}", media_type="application/octet-stream")


@app.get("/health")
@app.head("/health")
async def health():
    queued = sum(1 for j in jobs.values() if j.get("status") == "queued")
    processing = sum(1 for j in jobs.values() if j.get("status") == "processing")
    return {
        "status": "ok", "service": "PDF Converter",
        "queued": queued, "processing": processing, "max_concurrent": MAX_CONCURRENT
    }


# === Conversion logic ===
def _run_convert(job_id: str, file_data: bytes, filename: str, from_fmt: str, to_fmt: str):
    ext_in = from_fmt if from_fmt in ("pdf", "docx") else filename.rsplit(".", 1)[-1]
    input_path = UPLOAD_DIR / f"{job_id}_in.{ext_in}"
    try:
        jobs[job_id]["status"] = "processing"
        input_path.write_bytes(file_data)
        file_data = None  # free memory

        if from_fmt == "pdf" and to_fmt == "docx":
            output_path = _pdf_to_docx(input_path)
        elif from_fmt == "docx" and to_fmt == "pdf":
            output_path = _docx_to_pdf(input_path)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported conversion: {from_fmt} -> {to_fmt}")

        out_name = f"{job_id}.{to_fmt}"
        final_path = OUTPUT_DIR / out_name
        shutil.copy2(output_path, final_path)
        jobs[job_id] = {"status": "done", "result": out_name, "created_at": time.time()}
    except HTTPException as e:
        jobs[job_id] = {"status": "error", "error": e.detail, "created_at": time.time()}
    except Exception as e:
        jobs[job_id] = {"status": "error", "error": str(e), "created_at": time.time()}
    finally:
        _safe_unlink(input_path)
        for suffix in (".docx", ".pdf"):
            _safe_unlink(input_path.with_suffix(suffix))


def _safe_unlink(path: Path):
    try:
        if path.exists():
            path.unlink(missing_ok=True)
    except Exception:
        pass


# === DOCX repair (streaming, lower memory) ===
def _repair_docx(path: Path) -> None:
    raw = path.read_bytes()
    if len(raw) > 100 * 1024 * 1024:
        return  # skip repair for huge files
    out_buf = _io.BytesIO()
    with zipfile.ZipFile(_io.BytesIO(raw), 'r') as zin:
        with zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED) as zout:
            for info in zin.infolist():
                try:
                    data = zin.read(info.filename)
                except zipfile.BadZipFile:
                    hdr_off = info.header_offset
                    buf2 = _io.BytesIO(raw)
                    buf2.seek(hdr_off)
                    hdr = buf2.read(30)
                    comp_meth = _struct.unpack('<H', hdr[8:10])[0]
                    comp_sz = _struct.unpack('<I', hdr[18:22])[0]
                    name_len = _struct.unpack('<H', hdr[26:28])[0]
                    extra_len = _struct.unpack('<H', hdr[28:30])[0]
                    if comp_sz == 0 or comp_sz == 0xFFFFFFFF:
                        comp_sz = info.compress_size
                    buf2.seek(hdr_off + 30 + name_len + extra_len)
                    compressed = buf2.read(comp_sz)
                    if comp_meth == 0:
                        data = compressed
                    elif comp_meth == 8:
                        data = _zlib.decompress(compressed, -_zlib.MAX_WBITS)
                    else:
                        raise ValueError(f"Unknown compression {comp_meth} in {info.filename}")
                    info.CRC = _zlib.crc32(data) & 0xFFFFFFFF
                zout.writestr(info, data)
    path.write_bytes(out_buf.getvalue())
    raw = None  # free memory


# === PDF → DOCX ===
def _pdf_to_docx(input_path: Path) -> Path:
    from pdf2docx import Converter
    output_path = input_path.with_suffix(".docx")
    cv = Converter(str(input_path))
    cv.convert(str(output_path))
    cv.close()
    _repair_docx(output_path)
    return output_path


def _kill_libreoffice():
    try:
        subprocess.run(["pkill", "-f", "libreoffice"], capture_output=True, timeout=10)
        subprocess.run(["pkill", "-f", "soffice.bin"], capture_output=True, timeout=10)
    except Exception:
        pass


# === DOCX → PDF (no image re-render — returns LibreOffice output directly) ===
def _docx_to_pdf(input_path: Path) -> Path:
    if not LIBREOFFICE_BIN:
        raise RuntimeError("LibreOffice is required for DOCX→PDF conversion.")

    job_tag = uuid.uuid4().hex[:8]
    lo_home = UPLOAD_DIR / f"lo_home_{job_tag}"
    lo_home.mkdir(parents=True, exist_ok=True)
    tmp_out = UPLOAD_DIR / f"lo_out_{job_tag}"
    tmp_out.mkdir(exist_ok=True)

    try:
        # Validate DOCX
        with zipfile.ZipFile(input_path) as zf:
            if not any(n.endswith('.xml') for n in zf.namelist()):
                raise RuntimeError("DOCX has no XML content entries")

        lo_env = os.environ.copy()
        lo_env.pop("SAL_USE_VCLPLUGIN", None)
        lo_env["HOME"] = str(lo_home)
        # Limit LO memory usage
        lo_env["SAL_DISABLE_OPENGL_CHECK"] = "1"
        lo_env["SAL_VIDEO_DISABLE_ACCELERATE"] = "1"

        def _run_lo(timeout_sec: int) -> subprocess.CompletedProcess:
            cmd = [
                LIBREOFFICE_BIN,
                f"-env:UserInstallation=file://{lo_home}",
                "--headless", "--norestore", "--nofirststartwizard",
                "--convert-to", "pdf:writer_pdf_Export",
                "--outdir", str(tmp_out),
                str(input_path),
            ]
            return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_sec, env=lo_env)

        with _lo_lock():
            _kill_libreoffice()
            result = _run_lo(300)
            if result.returncode != 0:
                _kill_libreoffice()
                result = _run_lo(300)

            pdf_files = list(tmp_out.glob("*.pdf"))
            if not pdf_files:
                raise RuntimeError(f"LibreOffice produced no PDF. stderr: {(result.stderr or '')[:1000]}")
            lo_pdf_path = pdf_files[0]
            if lo_pdf_path.stat().st_size == 0:
                raise RuntimeError("LibreOffice produced an empty PDF")

            # Return LO output directly — no memory-intensive image re-render
            output_path = input_path.with_suffix(".pdf")
            shutil.copy2(lo_pdf_path, output_path)
            return output_path
    finally:
        shutil.rmtree(tmp_out, ignore_errors=True)
        shutil.rmtree(lo_home, ignore_errors=True)
        _kill_libreoffice()


import threading
_lo_lock_instance = threading.Lock()


@contextmanager
def _lo_lock():
    _lo_lock_instance.acquire()
    try:
        yield
    finally:
        _lo_lock_instance.release()


@app.get("/")
@app.head("/")
async def root():
    return {"status": "ok", "service": "PDF Converter"}


@app.on_event("startup")
async def _check_workers():
    """Warn if running with multiple workers (job dict won't be shared)."""
    import multiprocessing
    parent = multiprocessing.parent_process()
    if parent and parent.name != "MainProcess":
        print("WARNING: Multiple workers detected — in-memory jobs dict is NOT shared across workers.")
        print("Set --workers 1 or use a single process (Render default).")


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
