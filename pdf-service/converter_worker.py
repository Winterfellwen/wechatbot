"""
Isolated subprocess worker for PDF conversion.
Purpose: memory-heavy operations (pdf2docx, LibreOffice) run in a separate
process so ALL memory is reclaimed when the process exits.
Usage: python converter_worker.py <input_path> <output_path> <from_fmt> <to_fmt>
Exit code: 0 = success, 1 = error (error message printed to stderr)
"""

import os
import sys
import shutil
import zipfile
import struct
import zlib
import gc
import subprocess
import uuid
import time
from pathlib import Path


UPLOAD_DIR = Path(os.environ.get("PDF_TEMP_DIR", "/tmp")) / "pdf-service"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def safe_unlink(path: Path):
    try:
        if path.exists():
            path.unlink(missing_ok=True)
    except Exception:
        pass


def find_libreoffice() -> str | None:
    env_path = os.environ.get("LIBREOFFICE_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path
    candidates = [
        "/usr/bin/libreoffice", "/usr/bin/soffice",
        "/usr/local/bin/libreoffice", "/usr/local/bin/soffice",
        "/snap/bin/libreoffice",
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


def repair_docx(path: Path) -> None:
    size = path.stat().st_size
    if size > 20 * 1024 * 1024:
        return
    tmp = path.with_suffix(".tmp.docx")
    try:
        with zipfile.ZipFile(path, 'r') as zin:
            with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
                for info in zin.infolist():
                    try:
                        data = zin.read(info.filename)
                    except zipfile.BadZipFile:
                        hdr_off = info.header_offset
                        with open(path, 'rb') as f:
                            f.seek(hdr_off)
                            hdr = f.read(30)
                            comp_meth = struct.unpack('<H', hdr[8:10])[0]
                            comp_sz = struct.unpack('<I', hdr[18:22])[0]
                            name_len = struct.unpack('<H', hdr[26:28])[0]
                            extra_len = struct.unpack('<H', hdr[28:30])[0]
                            if comp_sz == 0 or comp_sz == 0xFFFFFFFF:
                                comp_sz = info.compress_size
                            f.seek(hdr_off + 30 + name_len + extra_len)
                            compressed = f.read(comp_sz)
                        if comp_meth == 0:
                            data = compressed
                        elif comp_meth == 8:
                            data = zlib.decompress(compressed, -zlib.MAX_WBITS)
                        else:
                            raise ValueError(f"Unknown compression {comp_meth} in {info.filename}")
                        info.CRC = zlib.crc32(data) & 0xFFFFFFFF
                    zout.writestr(info, data)
        shutil.move(tmp, path)
    finally:
        safe_unlink(tmp)


def pdf_to_docx(input_path: Path, output_path: Path):
    from pdf2docx import Converter
    cv = Converter(str(input_path))
    cv.convert(str(output_path))
    cv.close()
    gc.collect()
    repair_docx(output_path)


def kill_libreoffice():
    try:
        subprocess.run(["pkill", "-f", "libreoffice"], capture_output=True, timeout=10)
        subprocess.run(["pkill", "-f", "soffice.bin"], capture_output=True, timeout=10)
    except Exception:
        pass


def docx_to_pdf(input_path: Path, output_path: Path):
    libreoffice_bin = find_libreoffice()
    if not libreoffice_bin:
        raise RuntimeError("LibreOffice not found")

    job_tag = uuid.uuid4().hex[:8]
    lo_home = UPLOAD_DIR / f"lo_home_{job_tag}"
    lo_home.mkdir(parents=True, exist_ok=True)
    tmp_out = UPLOAD_DIR / f"lo_out_{job_tag}"
    tmp_out.mkdir(exist_ok=True)

    try:
        lo_env = os.environ.copy()
        lo_env.pop("SAL_USE_VCLPLUGIN", None)
        lo_env["HOME"] = str(lo_home)
        lo_env["SAL_DISABLE_OPENGL_CHECK"] = "1"
        lo_env["SAL_VIDEO_DISABLE_ACCELERATE"] = "1"
        lo_env["LIBREOFFICE_MEMORY_MULTIPLIER"] = "0.3"
        lo_env["OOO_DISABLE_RECOVERY"] = "1"

        cmd = [
            libreoffice_bin,
            f"-env:UserInstallation=file://{lo_home}",
            "--headless", "--norestore", "--nofirststartwizard",
            "--convert-to", "pdf:writer_pdf_Export",
            "--outdir", str(tmp_out),
            str(input_path),
        ]

        kill_libreoffice()
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300, env=lo_env)
        if result.returncode != 0:
            kill_libreoffice()
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300, env=lo_env)

        pdf_files = list(tmp_out.glob("*.pdf"))
        if not pdf_files:
            raise RuntimeError(f"LibreOffice produced no PDF. stderr: {(result.stderr or '')[:1000]}")
        lo_pdf_path = pdf_files[0]
        if lo_pdf_path.stat().st_size == 0:
            raise RuntimeError("LibreOffice produced an empty PDF")

        shutil.copy2(lo_pdf_path, output_path)
    finally:
        shutil.rmtree(tmp_out, ignore_errors=True)
        shutil.rmtree(lo_home, ignore_errors=True)
        kill_libreoffice()
        gc.collect()


def main():
    if len(sys.argv) != 5:
        print("Usage: converter_worker.py <input_path> <output_path> <from_fmt> <to_fmt>", file=sys.stderr)
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    from_fmt = sys.argv[3]
    to_fmt = sys.argv[4]

    if not input_path.exists():
        print(f"Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    try:
        start = time.time()
        print(f"[worker] start {from_fmt}→{to_fmt} input={input_path.name}", flush=True)

        if from_fmt == "pdf" and to_fmt == "docx":
            pdf_to_docx(input_path, output_path)
        elif from_fmt == "docx" and to_fmt == "pdf":
            docx_to_pdf(input_path, output_path)
        else:
            print(f"Unsupported conversion: {from_fmt} -> {to_fmt}", file=sys.stderr)
            sys.exit(1)

        elapsed = time.time() - start
        print(f"[worker] done in {elapsed:.1f}s output={output_path.name} size={output_path.stat().st_size}", flush=True)
        sys.exit(0)
    except Exception as e:
        print(f"[worker] error: {e}", file=sys.stderr, flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
