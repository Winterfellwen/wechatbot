import os
import sys
import base64
import uuid
import json
import asyncio
import subprocess
import shutil
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Form
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
JOBS_FILE = UPLOAD_DIR / "jobs.json"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
# Track memory pressure — if /tmp is nearly full, reject new jobs
_LOW_MEM_MODE = False


def _save_jobs():
    """Persist jobs dict to disk."""
    try:
        JOBS_FILE.write_text(json.dumps(jobs))
    except Exception as e:
        print(f"[jobs] save failed: {e}", flush=True)


def _load_jobs():
    """Load jobs dict from disk on startup."""
    global jobs
    if JOBS_FILE.exists():
        try:
            jobs = json.loads(JOBS_FILE.read_text())
            print(f"[jobs] loaded {len(jobs)} jobs from disk", flush=True)
        except Exception as e:
            print(f"[jobs] load failed: {e}", flush=True)
            jobs = {}
    else:
        jobs = {}


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
    _save_jobs()


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
    _load_jobs()
    asyncio.create_task(_queue_worker())
    # Re-queue pending jobs from disk
    pending = [(jid, j) for jid, j in jobs.items() if j.get("status") in ("queued", "processing")]
    if pending:
        print(f"[jobs] re-queueing {len(pending)} pending jobs", flush=True)
        for jid, j in pending:
            # Check if input file still exists
            input_path = UPLOAD_DIR / f"{jid}_in.*"
            matches = list(UPLOAD_DIR.glob(f"{jid}_in.*"))
            if matches:
                input_file = matches[0]
                ext_in = input_file.suffix[1:] if input_file.suffix else "pdf"
                filename = j.get("filename", f"{jid}.{ext_in}")
                from_fmt = j.get("from_fmt", "pdf")
                to_fmt = j.get("to_fmt", "docx")
                j["status"] = "queued"
                await _queue.put((jid, input_file, filename, from_fmt, to_fmt))
                _save_jobs()
            else:
                # Input file lost (server restart cleared /tmp)
                j["status"] = "error"
                j["error"] = "服务器重启，输入文件丢失，请重新上传"
                _save_jobs()


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
        "status": "queued", "queue_position": pos, "size": size, "created_at": time.time(),
        "filename": req.filename, "from_fmt": req.from_fmt, "to_fmt": req.to_fmt
    }
    _save_jobs()

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
async def edit_pdf(request: Request):
    """Accept both JSON and form-urlencoded body."""
    tmp = None
    try:
        ct = request.headers.get("content-type", "")
        if "application/json" in ct:
            body = await request.json()
            file_base64 = body.get("file_base64", "")
            op = body.get("op", "")
            text = body.get("text", "")
            angle = body.get("angle", "90")
        else:
            form = await request.form()
            file_base64 = form.get("file_base64", "")
            op = form.get("op", "")
            text = form.get("text", "")
            angle = form.get("angle", "90")

        if not file_base64:
            raise HTTPException(status_code=400, detail="Missing file_base64")

        raw = base64.b64decode(file_base64)
        if len(raw) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File too large ({len(raw)} bytes). Max: {MAX_FILE_SIZE}")

        tmp = UPLOAD_DIR / f"edit_{uuid.uuid4().hex}.pdf"
        tmp.write_bytes(raw)

        import fitz  # PyMuPDF

        doc = fitz.open(str(tmp))

        if op == "watermark":
            wm_text = text or "WATERMARK"
            for page in doc:
                r = page.rect
                # Center watermark, 45 degree rotation, semi-transparent gray
                page.insert_text(
                    fitz.Point(r.width * 0.15, r.height * 0.5),
                    wm_text,
                    fontsize=56,
                    color=(0.5, 0.5, 0.5),
                    overlay=True,
                    rotate=45,
                )
        elif op == "rotate":
            rot_angle = int(angle or "90")
            for page in doc:
                page.set_rotation((page.rotation or 0) + rot_angle)
        elif op == "merge":
            # Merge is handled by /edit/merge endpoint
            doc.close()
            raise HTTPException(status_code=400, detail="Use /edit/merge for two-file merge")
        else:
            doc.close()
            raise HTTPException(status_code=400, detail=f"Unknown operation: {op}")

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


@app.post("/edit/merge")
async def merge_pdfs(request: Request):
    """Merge two PDF files."""
    tmp1 = tmp2 = None
    try:
        body = await request.json()
        file1_base64 = body.get("file1_base64", "")
        file2_base64 = body.get("file2_base64", "")

        if not file1_base64 or not file2_base64:
            raise HTTPException(status_code=400, detail="Missing file data")

        import fitz

        raw1 = base64.b64decode(file1_base64)
        raw2 = base64.b64decode(file2_base64)

        tmp1 = UPLOAD_DIR / f"merge1_{uuid.uuid4().hex}.pdf"
        tmp2 = UPLOAD_DIR / f"merge2_{uuid.uuid4().hex}.pdf"
        tmp1.write_bytes(raw1)
        tmp2.write_bytes(raw2)

        doc1 = fitz.open(str(tmp1))
        doc2 = fitz.open(str(tmp2))

        new_doc = fitz.open()
        new_doc.insert_pdf(doc1)
        new_doc.insert_pdf(doc2)

        out_bytes = new_doc.tobytes(garbage=4, deflate=True)
        doc1.close()
        doc2.close()
        new_doc.close()

        return Response(content=out_bytes, media_type="application/pdf")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp1 and tmp1.exists():
            _safe_unlink(tmp1)
        if tmp2 and tmp2.exists():
            _safe_unlink(tmp2)


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
CONVERT_TIMEOUT = int(os.environ.get("CONVERT_TIMEOUT", 600))  # 10 min per conversion


def _run_convert(job_id: str, input_path_str: str, filename: str, from_fmt: str, to_fmt: str):
    input_path = Path(input_path_str)
    if not input_path.exists():
        jobs[job_id] = {"status": "error", "error": "Input file lost", "created_at": time.time()}
        _save_jobs()
        return

    out_name = f"{job_id}.{to_fmt}"
    output_path = OUTPUT_DIR / out_name
    try:
        jobs[job_id]["status"] = "processing"
        _save_jobs()

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

        jobs[job_id] = {"status": "done", "result": out_name, "created_at": time.time(),
                        "filename": filename, "from_fmt": from_fmt, "to_fmt": to_fmt}
        _save_jobs()
    except subprocess.TimeoutExpired:
        jobs[job_id] = {"status": "error", "error": f"Conversion timed out ({CONVERT_TIMEOUT}s)", "created_at": time.time()}
        _save_jobs()
    except Exception as e:
        jobs[job_id] = {"status": "error", "error": str(e), "created_at": time.time()}
        _save_jobs()
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
