"""
Isolated subprocess worker for PDF conversion.
Runs in a subprocess so ALL memory is reclaimed when the process exits.
PDF→DOCX uses page-by-page processing (fitz + python-docx) to stay under 512MB.
DOCX→PDF uses LibreOffice (also subprocess, already isolated).
Usage: python converter_worker.py <input_path> <output_path> <from_fmt> <to_fmt>
"""

import os
import sys
import shutil
import gc
import subprocess
import uuid
import time
import struct
import zlib
import zipfile
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


# ============================================================
# PDF → DOCX (page-by-page, keeps ~1 page in memory)
# ============================================================
def pdf_to_docx(input_path: Path, output_path: Path):
    try:
        import fitz
    except ImportError:
        raise RuntimeError("PyMuPDF (fitz) is required. pip install PyMuPDF")
    try:
        from docx import Document
        from docx.shared import Inches, Pt, Emu
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.oxml.ns import qn
    except ImportError:
        raise RuntimeError("python-docx is required. pip install python-docx")

    print(f"[worker] Opening PDF: {input_path.name}", flush=True)
    pdf = fitz.open(str(input_path))
    num_pages = len(pdf)
    print(f"[worker] Pages: {num_pages}", flush=True)

    doc = Document()
    # Set default font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Liberation Serif'
    font.size = Pt(11)

    for i in range(num_pages):
        page = pdf[i]
        page_size = len(page.get_text())
        print(f"[worker] Page {i+1}/{num_pages} text={page_size}b", flush=True)

        # --- Extract text blocks with position ---
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if block["type"] == 0:  # text block
                para_text = ""
                for line in block["lines"]:
                    line_text = "".join(span["text"] for span in line["spans"])
                    if line_text.strip():
                        para_text += line_text + " "
                para_text = para_text.strip()
                if para_text:
                    p = doc.add_paragraph(para_text)
                    # Try to preserve heading-like formatting
                    spans = block["lines"][0]["spans"] if block["lines"] else []
                    if spans:
                        size = spans[0].get("size", 11)
                        is_bold = spans[0].get("flags", 0) & 2
                        if is_bold and size > 14:
                            p.style = doc.styles['Heading1']
                        elif is_bold and size > 12:
                            p.style = doc.styles['Heading2']

            elif block["type"] == 1:  # image block
                try:
                    xref = block.get("image", None)
                    if xref is None:
                        xref = block.get("xref", 0)
                    if xref:
                        pix = fitz.Pixmap(pdf, xref)
                        img_bytes = pix.tobytes("png")
                        pix = None
                        # Save temp image and insert
                        img_path = UPLOAD_DIR / f"img_{uuid.uuid4().hex[:8]}.png"
                        img_path.write_bytes(img_bytes)
                        img_bytes = None
                        try:
                            doc.add_picture(str(img_path), width=Inches(5))
                        finally:
                            safe_unlink(img_path)
                        gc.collect()
                except Exception as e:
                    print(f"[worker]  Image skip: {e}", flush=True)

        # Free page memory
        page = None
        if i % 10 == 0:
            gc.collect()

    pdf.close()
    print(f"[worker] Saving DOCX: {output_path.name}", flush=True)
    doc.save(str(output_path))
    doc = None
    gc.collect()
    print(f"[worker] DOCX saved: {output_path.name} size={output_path.stat().st_size}", flush=True)


# ============================================================
# DOCX → PDF (via LibreOffice subprocess)
# ============================================================
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


# ============================================================
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
