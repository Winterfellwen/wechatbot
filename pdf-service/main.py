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
    """Convert DOCX to PDF with proper Chinese support using reportlab"""
    from docx import Document
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    import os

    output_path = input_path.with_suffix(".pdf")
    
    # Register Chinese TTF font
    font_registered = False
    font_path = _get_cjk_ttf_font()
    
    if font_path and os.path.exists(font_path):
        try:
            pdfmetrics.registerFont(TTFont('CJKFont', font_path))
            font_registered = True
            print(f"Registered CJK font: {font_path}")
        except Exception as e:
            print(f"Failed to register font: {e}")
    
    # Create PDF
    doc_template = SimpleDocTemplate(
        str(output_path), 
        pagesize=A4,
        rightMargin=2*cm, 
        leftMargin=2*cm,
        topMargin=2*cm, 
        bottomMargin=2*cm
    )
    
    # Define styles
    styles = getSampleStyleSheet()
    
    if font_registered:
        # Use registered CJK font for all text (it supports Latin chars too)
        normal_style = ParagraphStyle(
            name='CJKNormal',
            fontName='CJKFont',
            fontSize=11,
            leading=18,
        )
    else:
        # Fallback
        normal_style = styles['Normal']
        print("Warning: No CJK font, using default")
    
    # Build content
    story = []
    docx_doc = Document(str(input_path))
    
    for para in docx_doc.paragraphs:
        text = para.text.strip()
        if not text:
            story.append(Spacer(1, 0.3*cm))
            continue
        
        try:
            # Escape XML special chars for reportlab Paragraph
            # But preserve spaces and handle mixed content
            escaped_text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            p = Paragraph(escaped_text, normal_style)
            story.append(p)
            story.append(Spacer(1, 0.2*cm))
        except Exception as e:
            print(f"Paragraph error: {e}")
            continue
    
    doc_template.build(story)
    return output_path


def _get_cjk_ttf_font() -> str:
    """Get CJK TTF/TTC font file path for fpdf2"""
    import hashlib
    
    cache_dir = Path("/tmp/font-cache")
    cache_dir.mkdir(exist_ok=True)
    
    # Prefer TTF fonts over OTF for fpdf2 compatibility
    # Try cached TTF font first
    ttf_cache = cache_dir / "NotoSansSC-Regular.ttf"
    if ttf_cache.exists() and ttf_cache.stat().st_size > 50000:
        return str(ttf_cache)
    
    # Try cached TTC (TrueType Collection)
    ttc_cache = cache_dir / "wqy-zenhei.ttc"
    if ttc_cache.exists() and ttc_cache.stat().st_size > 50000:
        return str(ttc_cache)
    
    # Try system TTF/TTC fonts (Linux)
    system_paths = [
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",  # WenQuanYi Zen Hei
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/arphic/uming.ttc",  # AR PL UMing
    ]
    
    for sp in system_paths:
        if os.path.exists(sp):
            return sp
    
    # Download TTF font from CDN
    # Noto Sans SC TTF version
    ttf_urls = [
        "https://github.com/googlefonts/noto-cjk/raw/main/Sans/SubsetTTF/SC/NotoSansSC-Regular.ttf",
        "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetTTF/SC/NotoSansSC-Regular.ttf",
    ]
    
    for url in ttf_urls:
        try:
            print(f"Downloading TTF font from {url}")
            data = urllib.request.urlopen(url, timeout=30).read()
            if len(data) > 50000:
                ttf_cache.write_bytes(data)
                print(f"Downloaded TTF font: {len(data)} bytes")
                return str(ttf_cache)
        except Exception as e:
            print(f"TTF font download failed from {url}: {e}")
            continue
    
    # Fallback: try to download Droid Sans Fallback
    fallback_url = "https://github.com/android/platform_frameworks_base/raw/master/data/fonts/DroidSansFallback.ttf"
    try:
        print(f"Trying fallback font: {fallback_url}")
        data = urllib.request.urlopen(fallback_url, timeout=30).read()
        if len(data) > 50000:
            fallback_path = cache_dir / "DroidSansFallback.ttf"
            fallback_path.write_bytes(data)
            return str(fallback_path)
    except Exception as e:
        print(f"Fallback font download failed: {e}")
    
    return None


def _get_cjk_font() -> bytes:
    """Get CJK font bytes, trying multiple sources"""
    font_path = _get_cjk_font_path()
    if font_path and os.path.exists(font_path):
        return Path(font_path).read_bytes()
    return None


@app.get("/")
def health():
    return {"status": "ok", "service": "PDF Converter"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
