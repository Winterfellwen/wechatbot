import os
import base64
import tempfile
import uuid
import urllib.request
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


class ConvertRequest(BaseModel):
    file_base64: str
    filename: str
    from_fmt: str = "pdf"
    to_fmt: str = "docx"


@app.post("/convert")
async def convert(req: ConvertRequest):
    input_id = uuid.uuid4().hex
    input_path = UPLOAD_DIR / f"{input_id}.{req.from_fmt}"

    try:
        file_data = base64.b64decode(req.file_base64)
        with open(input_path, "wb") as f:
            f.write(file_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 data")

    try:
        if req.from_fmt == "pdf" and req.to_fmt == "docx":
            output_path = await pdf_to_docx(input_path)
        elif req.from_fmt in ("docx", "doc") and req.to_fmt == "pdf":
            output_path = await docx_to_pdf(input_path)
        elif req.from_fmt == "pdf" and req.to_fmt == "doc":
            output_path = await pdf_to_docx(input_path)
            new_path = output_path.with_suffix(".doc")
            output_path.rename(new_path)
            output_path = new_path
        elif req.from_fmt == "doc" and req.to_fmt == "docx":
            import shutil
            output_path = input_path.with_suffix(".docx")
            shutil.copy(input_path, output_path)
        else:
            raise HTTPException(status_code=400, detail=f"不支持 {req.from_fmt} -> {req.to_fmt}")

        return FileResponse(output_path, filename=f"converted.{req.to_fmt}",
                            media_type="application/octet-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            input_path.unlink(missing_ok=True)


@app.post("/edit")
async def edit(file_base64: str = Form(...), op: str = Form(""), text: str = Form(""), angle: str = Form("90")):
    input_id = uuid.uuid4().hex
    input_path = UPLOAD_DIR / f"{input_id}.pdf"

    try:
        file_data = base64.b64decode(file_base64)
        with open(input_path, "wb") as f:
            f.write(file_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 data")

    try:
        if op == "watermark":
            output_path = await pdf_watermark(input_path, text)
        elif op == "rotate":
            output_path = await pdf_rotate(input_path, int(angle))
        else:
            raise HTTPException(status_code=400, detail=f"Unknown operation: {op}")

        return FileResponse(output_path, filename="edited.pdf",
                            media_type="application/octet-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            input_path.unlink(missing_ok=True)


async def pdf_to_docx(input_path: Path) -> Path:
    from pdf2docx import Converter
    output_path = input_path.with_suffix(".docx")
    cv = Converter(str(input_path))
    cv.convert(str(output_path))
    cv.close()
    return output_path


async def pdf_watermark(input_path: Path, text: str) -> Path:
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


async def pdf_rotate(input_path: Path, angle: int = 90) -> Path:
    import fitz
    doc = fitz.open(str(input_path))
    for page in doc:
        page.set_rotation((page.rotation or 0) + angle)
    output_path = input_path.with_suffix("_rot.pdf")
    doc.save(str(output_path))
    doc.close()
    return output_path


async def docx_to_pdf(input_path: Path) -> Path:
    """Convert DOCX to PDF - tries PyMuPDF font first, then download"""
    from docx import Document
    from fpdf import FPDF

    doc = Document(str(input_path))
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(True, margin=15)
    
    # Get CJK font bytes
    font_bytes = _get_cjk_font()
    
    if font_bytes:
        pdf.add_font("CJK", "", font_bytes, uni=True)
        pdf.set_font("CJK", size=11)
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            pdf.multi_cell(0, 7, text)
            pdf.ln(2)
    else:
        pdf.set_font("Helvetica", size=11)
        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                pdf.multi_cell(0, 7, text)

    output_path = input_path.with_suffix(".pdf")
    pdf.output(str(output_path))
    return output_path


def _get_cjk_font() -> bytes:
    """Get CJK font bytes, trying multiple sources"""
    import json, hashlib
    
    cache_dir = Path("/tmp/font-cache")
    cache_dir.mkdir(exist_ok=True)
    cache_path = cache_dir / "cjk-font.ttf"
    
    if cache_path.exists() and cache_path.stat().st_size > 50000:
        return cache_path.read_bytes()
    
    # Try to use any available system font with CJK support
    system_paths = [
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    ]
    for sp in system_paths:
        if os.path.exists(sp):
            return Path(sp).read_bytes()[:1000000]  # First 1MB should have enough glyphs
    
    # Download from multiple CDNs
    urls = [
        "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/SubsetOTF/CN/NotoSansSC-Regular.otf",
        "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf",
        "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf",
    ]
    for url in urls:
        try:
            data = urllib.request.urlopen(url, timeout=20).read()
            if len(data) > 50000:
                cache_path.write_bytes(data)
                return data
        except:
            continue
    
    return None


@app.get("/")
def health():
    return {"status": "ok", "service": "PDF Converter"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
