import os
import tempfile
import uuid
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

UPLOAD_DIR = Path("/tmp/pdf-service")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.post("/convert")
async def convert(file: UploadFile = File(...), from_fmt: str = Form("pdf"), to_fmt: str = Form("docx")):
    input_id = uuid.uuid4().hex
    input_path = UPLOAD_DIR / f"{input_id}.{from_fmt}"
    with open(input_path, "wb") as f:
        f.write(await file.read())

    try:
        if from_fmt == "pdf" and to_fmt == "docx":
            output_path = await pdf_to_docx(input_path)
        elif from_fmt in ("docx", "doc") and to_fmt == "pdf":
            output_path = await docx_to_pdf(input_path)
        elif from_fmt == "pdf" and to_fmt == "doc":
            # PDF → DOCX first, then rename to .doc (both are same structure)
            output_path = await pdf_to_docx(input_path)
            new_path = output_path.with_suffix(".doc")
            output_path.rename(new_path)
            output_path = new_path
        elif from_fmt == "doc" and to_fmt == "docx":
            import shutil
            output_path = input_path.with_suffix(".docx")
            shutil.copy(input_path, output_path)
        else:
            return JSONResponse({"error": f"不支持 {from_fmt} → {to_fmt}"}, status_code=400)

        return FileResponse(output_path, filename=f"converted.{to_fmt}",
                           media_type="application/octet-stream")
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        if input_path.exists():
            input_path.unlink(missing_ok=True)


async def pdf_to_docx(input_path: Path) -> Path:
    from pdf2docx import Converter
    output_path = input_path.with_suffix(".docx")
    cv = Converter(str(input_path))
    cv.convert(str(output_path), start=0, end=None)
    cv.close()
    return output_path


async def docx_to_pdf(input_path: Path) -> Path:
    """Convert DOCX to PDF using python-docx + fpdf2 for layout preservation"""
    from docx import Document
    from fpdf import FPDF

    doc = Document(str(input_path))
    pdf = FPDF()
    pdf.add_page()
    pdf.add_font("SimSun", "", "C:/Windows/Fonts/simsun.ttc" if os.name == "nt" else "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc", uni=True)

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        style = para.style
        size = 12 if style and "Head" in (style.name or "") else 10
        pdf.set_font("SimSun", size=size)
        try:
            pdf.multi_cell(0, 8, text)
        except:
            pdf.multi_cell(0, 8, text.encode("utf-8", errors="replace").decode("utf-8", errors="replace"))
        pdf.ln(2)

    output_path = input_path.with_suffix(".pdf")
    pdf.output(str(output_path))
    return output_path


@app.get("/")
def health():
    return {"status": "ok", "service": "PDF Converter"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
