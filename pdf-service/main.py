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
    
    # Register Chinese font
    font_registered = False
    font_path = _get_cjk_font_path()
    
    if font_path and os.path.exists(font_path):
        try:
            pdfmetrics.registerFont(TTFont('CJK', font_path))
            font_registered = True
        except Exception as e:
            print(f"Failed to register font: {e}")
    
    # Create PDF
    doc_template = SimpleDocTemplate(str(output_path), pagesize=A4,
                                     rightMargin=2*cm, leftMargin=2*cm,
                                     topMargin=2*cm, bottomMargin=2*cm)
    
    # Define styles
    styles = getSampleStyleSheet()
    if font_registered:
        # Create custom style with CJK font
        if 'CJKNormal' not in styles:
            styles.add(ParagraphStyle(name='CJKNormal', fontName='CJK', 
                                      fontSize=11, leading=16))
        normal_style = styles['CJKNormal']
    else:
        normal_style = styles['Normal']
    
    # Build content
    story = []
    docx_doc = Document(str(input_path))
    
    for para in docx_doc.paragraphs:
        text = para.text.strip()
        if not text:
            story.append(Spacer(1, 0.3*cm))
            continue
        
        try:
            p = Paragraph(text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'), 
                         normal_style)
            story.append(p)
            story.append(Spacer(1, 0.2*cm))
        except Exception as e:
            print(f"Paragraph error: {e}")
            # Fallback: add as plain text
            story.append(Spacer(1, 0.2*cm))
    
    doc_template.build(story)
    return output_path


def _get_cjk_font_path() -> str:
    """Get CJK font file path, trying multiple sources"""
    import hashlib
    
    cache_dir = Path("/tmp/font-cache")
    # Windows cache path
    if os.name == 'nt':
        cache_dir = Path.home() / ".cache" / "font-cache"
    cache_dir.mkdir(exist_ok=True)
    cache_path = cache_dir / "NotoSansSC-Regular.otf"
    
    # Check if cached font exists
    if cache_path.exists() and cache_path.stat().st_size > 50000:
        return str(cache_path)
    
    # Try system fonts - Linux/Mac
    system_paths = [
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansSC-Regular.otf",
    ]
    
    # Windows system fonts
    if os.name == 'nt':
        windir = os.environ.get('WINDIR', 'C:\\Windows')
        system_paths.extend([
            f"{windir}\\Fonts\\msyh.ttc",  # Microsoft YaHei
            f"{windir}\\Fonts\\simhei.ttf",  # SimHei
            f"{windir}\\Fonts\\simsun.ttc",  # SimSun
            f"{windir}\\Fonts\\kaiti.ttf",  # KaiTi
        ])
    
    for sp in system_paths:
        if os.path.exists(sp):
            return sp
    
    # Download from CDNs
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
                return str(cache_path)
        except Exception as e:
            print(f"Font download failed from {url}: {e}")
            continue
    
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
