import os
import sys
import base64
import uuid
import asyncio
import subprocess
import shutil
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    """Reject oversized requests early (before FastAPI parses body)."""
    if request.method in ("POST", "PUT"):
        cl = request.headers.get("content-length")
        if cl and int(cl) > int(MAX_FILE_SIZE * 1.5):
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=413, content={"detail": f"Request too large. Max: {MAX_FILE_SIZE} bytes"})
    return await call_next(request)


@app.on_event("startup")
async def _log_memory_periodically():
    """Log RSS every 30s to help diagnose OOM."""
    async def _loop():
        while True:
            await asyncio.sleep(30)
            try:
                import psutil
                proc = psutil.Process()
                rss = proc.memory_info().rss
                print(f"[mem] RSS={rss // 1024 // 1024}MB", flush=True)
            except ImportError:
                pass
    asyncio.create_task(_loop())

# === Config ===
MAX_FILE_SIZE = int(os.environ.get("MAX_FILE_SIZE", 100 * 1024 * 1024))  # 100MB
MAX_CONCURRENT = int(os.environ.get("MAX_CONCURRENT", "1"))  # one at a time
JOB_CLEANUP_AGE = 3600
UPLOAD_DIR = Path(os.environ.get("PDF_TEMP_DIR", "/tmp")) / "pdf-service"
OUTPUT_DIR = Path(os.environ.get("PDF_TEMP_DIR", "/tmp")) / "pdf-outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
# Track memory pressure — if /tmp is nearly full, reject new jobs
_LOW_MEM_MODE = False


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


def _write_input(job_id: str, file_data: bytes, ext_in: str) -> Path:
    """Write file to disk immediately and free memory before queue wait."""
    input_path = UPLOAD_DIR / f"{job_id}_in.{ext_in}"
    input_path.write_bytes(file_data)
    return input_path


async def _queue_worker():
    """Process one job at a time. Semaphore prevents concurrent LibreOffice clashes."""
    while True:
        job_id, input_path, filename, from_fmt, to_fmt = await _queue.get()
        try:
            async with _queue_sem:
                await asyncio.get_event_loop().run_in_executor(
                    None, _run_convert, job_id, str(input_path), filename, from_fmt, to_fmt
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


class EditRequest(BaseModel):
    file_base64: str = Field(..., max_length=int(MAX_FILE_SIZE * 1.4))
    op: str = ""
    text: str = ""
    angle: str = "90"


@app.post("/convert")
async def convert(req: ConvertRequest):
    _cleanup_old_jobs()

    try:
        file_data = base64.b64decode(req.file_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64: {e}")

    size = len(file_data)
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large ({size} bytes). Max: {MAX_FILE_SIZE}")

    job_id = uuid.uuid4().hex
    ext_in = req.from_fmt if req.from_fmt in ("pdf", "docx") else req.filename.rsplit(".", 1)[-1]

    # Write to disk NOW — don't hold file_data in queue memory
    input_path = _write_input(job_id, file_data, ext_in)
    file_data = None  # free immediately

    global _queue_position
    _queue_position += 1
    pos = _queue_position

    jobs[job_id] = {
        "status": "queued", "queue_position": pos, "size": size, "created_at": time.time()
    }

    await _queue.put((job_id, input_path, req.filename, req.from_fmt, req.to_fmt))

    return {"job_id": job_id, "status": "queued", "queue_position": pos}


@app.get("/status/{job_id}")
async def get_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    resp = {k: v for k, v in job.items() if k not in ("created_at", "size")}
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


# ── Edit (watermark / rotate / merge) ────────────────────

@app.post("/edit")
async def edit_pdf(req: EditRequest):
    tmp = None
    try:
        raw = base64.b64decode(req.file_base64)
        if len(raw) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File too large ({len(raw)} bytes). Max: {MAX_FILE_SIZE}")

        tmp = UPLOAD_DIR / f"edit_{uuid.uuid4().hex}.pdf"
        tmp.write_bytes(raw)

        import fitz  # PyMuPDF

        doc = fitz.open(str(tmp))

        if req.op == "watermark":
            text = req.text or "WATERMARK"
            for page in doc:
                r = page.rect
                page.insert_text(
                    fitz.Point(r.width * 0.1, r.height * 0.5),
                    text,
                    fontsize=48,
                    color=(0.6, 0.6, 0.6),
                    overlay=False,
                    rotate=30,
                )
        elif req.op == "rotate":
            angle = int(req.angle or "90")
            for page in doc:
                page.set_rotation((page.rotation or 0) + angle)
        elif req.op == "merge":
            doc.insert_pdf(doc)
        else:
            doc.close()
            raise HTTPException(status_code=400, detail=f"Unknown operation: {req.op}")

        out_bytes = doc.tobytes(garbage=4, deflate=True)
        doc.close()

        return Response(content=out_bytes, media_type="application/pdf")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp and tmp.exists():
            _safe_unlink(tmp)


@app.get("/health")
@app.head("/health")
async def health():
    queued = sum(1 for j in jobs.values() if j.get("status") == "queued")
    processing = sum(1 for j in jobs.values() if j.get("status") == "processing")
    return {
        "status": "ok", "service": "PDF Converter",
        "queued": queued, "processing": processing, "max_concurrent": MAX_CONCURRENT
    }


# === Conversion via subprocess (memory isolated) ===
# All heavy work (pdf2docx, LibreOffice) runs in a subprocess so memory is
# fully reclaimed when the worker exits. The main process stays lean.

CONVERTER_SCRIPT = Path(__file__).parent / "converter_worker.py"
CONVERT_TIMEOUT = int(os.environ.get("CONVERT_TIMEOUT", 360))  # 6 min per conversion


def _run_convert(job_id: str, input_path_str: str, filename: str, from_fmt: str, to_fmt: str):
    input_path = Path(input_path_str)
    if not input_path.exists():
        jobs[job_id] = {"status": "error", "error": "Input file lost", "created_at": time.time()}
        return

    out_name = f"{job_id}.{to_fmt}"
    output_path = OUTPUT_DIR / out_name
    try:
        jobs[job_id]["status"] = "processing"

        proc = subprocess.run(
            [sys.executable, str(CONVERTER_SCRIPT), str(input_path), str(output_path), from_fmt, to_fmt],
            capture_output=True, text=True, timeout=CONVERT_TIMEOUT,
        )

        # Print worker logs to parent stdout/stderr
        for line in (proc.stdout or "").splitlines():
            print(f"  [worker] {line}", flush=True)
        for line in (proc.stderr or "").splitlines():
            print(f"  [worker:err] {line}", flush=True)

        if proc.returncode != 0:
            err_msg = (proc.stderr or "").strip() or f"Worker exited with code {proc.returncode}"
            raise RuntimeError(err_msg)

        if not output_path.exists():
            raise RuntimeError("Worker finished but output file not found")

        jobs[job_id] = {"status": "done", "result": out_name, "created_at": time.time()}
    except subprocess.TimeoutExpired:
        jobs[job_id] = {"status": "error", "error": f"Conversion timed out ({CONVERT_TIMEOUT}s)", "created_at": time.time()}
    except Exception as e:
        jobs[job_id] = {"status": "error", "error": str(e), "created_at": time.time()}
    finally:
        _safe_unlink(input_path)


def _safe_unlink(path: Path):
    try:
        if path.exists():
            path.unlink(missing_ok=True)
    except Exception:
        pass


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
    except Exception:
        pass
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
