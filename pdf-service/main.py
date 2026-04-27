import os
import base64
import tempfile
import uuid
import urllib.request
from pathlib import Path
from fastapi import FastAPI, HTTPException
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
        raise HTTPException(status_code=400, detail="Invalid base64 file data")
    
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
            raise HTTPException(status_code=400, detail=f"不支持 {req.from_fmt} → {req.to_fmt}")
        
        return FileResponse(output_path, filename=f"converted.{req.to_fmt}",
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


async def docx_to_pdf(input_path: Path) -> Path:
    from docx import Document
    from fpdf import FPDF
    import urllib.request

    doc = Document(str(input_path))
    pdf = FPDF()
    pdf.add_page()
    
    # Download CJK font if not present
    font_path = Path("/tmp/NotoSansSC-Regular.ttf")
    if not font_path.exists():
        try:
            url = "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf"
            urllib.request.urlretrieve(url, str(font_path))
        except:
            pass
    
    font_ok = False
    for fp in [str(font_path), 
               "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
               "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"]:
        if os.path.exists(fp):
            try:
                pdf.add_font("Uni", "", fp, uni=True)
                font_ok = True
                break
            except:
                pass
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        size = 11
        if font_ok:
            pdf.set_font("Uni", size=size)
        else:
            pdf.set_font("Helvetica", size=size)
        try:
            pdf.multi_cell(0, 7, text)
        except:
            safe = text.encode("ascii", errors="replace").decode("ascii")
            pdf.set_font("Helvetica", size=size)
            pdf.multi_cell(0, 7, safe)
        pdf.ln(2)

    output_path = input_path.with_suffix(".pdf")
    pdf.output(str(output_path))
    return output_path


@app.get("/")
def health():
    return {"status": "ok", "service": "PDF Converter"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
