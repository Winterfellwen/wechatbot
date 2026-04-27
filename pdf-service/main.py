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
    """Convert DOCX to PDF using WeasyPrint for proper mixed content support"""
    import subprocess
    import sys
    
    output_path = input_path.with_suffix(".pdf")
    
    # Try using LibreOffice (best quality)
    try:
        # Check if LibreOffice is available
        result = subprocess.run(['which', 'libreoffice'], capture_output=True, text=True)
        if result.returncode == 0:
            print("Using LibreOffice for conversion")
            result = subprocess.run([
                'libreoffice', '--headless', '--convert-to', 'pdf',
                '--outdir', str(input_path.parent), str(input_path)
            ], capture_output=True, timeout=120)
            
            if result.returncode == 0:
                generated = input_path.with_suffix('.pdf')
                if generated.exists():
                    generated.rename(output_path)
                    return output_path
    except Exception as e:
        print(f"LibreOffice conversion failed: {e}")
    
    # Fallback: Use mammoth + WeasyPrint
    try:
        print("Trying mammoth + WeasyPrint")
        import mammoth
        from weasyprint import HTML, CSS
        from weasyprint.text.fonts import FontConfiguration
        
        # Convert docx to HTML
        with open(input_path, 'rb') as docx_file:
            result = mammoth.convert_to_html(docx_file)
            html = result.value
        
        # Add CSS for better rendering
        css = CSS(string='''
            @page { margin: 2cm; }
            body { font-family: "Noto Sans CJK SC", "WenQuanYi Zen Hei", sans-serif; }
        ''')
        
        # Convert HTML to PDF with font config
        font_config = FontConfiguration()
        HTML(string=html).write_pdf(str(output_path), stylesheets=[css], font_config=font_config)
        print("WeasyPrint conversion successful")
        return output_path
    except Exception as e:
        print(f"WeasyPrint conversion failed: {e}")
    
    # Last resort: Use python-docx + reportlab with proper font handling
    print("Falling back to reportlab")
    return await docx_to_pdf_reportlab(input_path)


async def docx_to_pdf_reportlab(input_path: Path) -> Path:
    """Fallback DOCX to PDF using reportlab with font fallback"""
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
    
    # Try to register CJK font
    font_path = _get_cjk_ttf_font()
    cjk_font_available = False
    
    if font_path and os.path.exists(font_path):
        try:
            pdfmetrics.registerFont(TTFont('CJKFont', font_path))
            cjk_font_available = True
        except:
            pass
    
    doc_template = SimpleDocTemplate(
        str(output_path), 
        pagesize=A4,
        rightMargin=2*cm, 
        leftMargin=2*cm,
    )
    
    styles = getSampleStyleSheet()
    
    if cjk_font_available:
        # Create style with CJK font
        # reportlab will use this font for all chars it supports
        normal_style = ParagraphStyle(
            'CJKNormal',
            fontName='CJKFont',
            fontSize=11,
            leading=18,
        )
    else:
        normal_style = styles['Normal']
    
    story = []
    docx_doc = Document(str(input_path))
    
    for para in docx_doc.paragraphs:
        text = para.text.strip()
        if not text:
            story.append(Spacer(1, 0.3*cm))
            continue
        
        try:
            escaped_text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            p = Paragraph(escaped_text, normal_style)
            story.append(p)
            story.append(Spacer(1, 0.2*cm))
        except:
            continue
    
    doc_template.build(story)
    return output_path
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
