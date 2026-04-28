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

FONT_CACHE_DIR = Path("/tmp/font-cache")
FONT_CACHE_DIR.mkdir(exist_ok=True)
CJK_FONT_PATH = FONT_CACHE_DIR / "NotoSansSC-Regular.ttf"


def download_cjk_font():
    """Download Noto Sans SC TTF font"""
    if CJK_FONT_PATH.exists() and CJK_FONT_PATH.stat().st_size > 50000:
        print("Font already cached: " + str(CJK_FONT_PATH))
        return str(CJK_FONT_PATH)
    
    urls = [
        "https://github.com/googlefonts/noto-cjk/raw/main/Sans/SubsetTTF/SC/NotoSansSC-Regular.ttf",
        "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetTTF/SC/NotoSansSC-Regular.ttf",
    ]
    
    for url in urls:
        try:
            print("Downloading font from " + url)
            data = urllib.request.urlopen(url, timeout=60).read()
            if len(data) > 50000:
                CJK_FONT_PATH.write_bytes(data)
                print("Downloaded font: " + str(len(data)) + " bytes")
                return str(CJK_FONT_PATH)
        except Exception as e:
            print("Download failed: " + str(e))
            continue
    
    return None


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
        with open(input_path, \"wb\") as f:
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
            raise HTTPException(status_code=400, detail=f"Unsupported {req.from_fmt} -> {req.to_fmt}")

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
        with open(input_path, \"wb\") as f:
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
    """Convert DOCX to PDF using fpdf2 with CJK TTF font"""
    from docx import Document
    from fpdf import FPDF
    
    output_path = input_path.with_suffix(".pdf")
    
    # Get CJK font
    font_path = download_cjk_font()
    if not font_path:
        raise Exception("Failed to download CJK font")
    
    doc = Document(str(input_path))
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Add and set CJK font
    pdf.add_font("CJK", style="", fname=font_path)
    pdf.set_font("CJK", size=11)
    print("Using CJK font: " + font_path)
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            pdf.ln(3)
            continue
        
        try:
            pdf.multi_cell(w=0, h=7, txt=text)
            pdf.ln(2)
        except Exception as e:
            print("Text error: " + str(e))
            continue
    
    pdf.output(str(output_path))
    print("PDF generated: " + str(output_path))
    return output_path


@app.get("/")
def health():
    return {"status": "ok", "service": "PDF Converter"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
