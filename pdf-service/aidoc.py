import os
import base64
import uuid
import json
import requests
import re
from pathlib import Path
from fastapi import APIRouter, HTTPException, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import fitz

router = APIRouter()

UPLOAD_DIR = Path("/tmp/aidoc")
UPLOAD_DIR.mkdir(exist_ok=True)

OUTPUT_DIR = Path("/tmp/aidoc-output")
OUTPUT_DIR.mkdir(exist_ok=True)

NODE_API_URL = os.environ.get("NODE_API_URL", "http://localhost:3000")


class ConvertToHtmlRequest(BaseModel):
    file_base64: str
    filename: str


class AIReviewRequest(BaseModel):
    html_content: str
    instructions: str = "检查HTML内容，修复布局问题，调整图片大小，确保格式正确。"


class ExportRequest(BaseModel):
    html_content: str
    format: str = "pdf"


def convert_pdf_to_html(file_data: bytes, filename: str) -> str:
    """使用PyMuPDF将PDF转换为HTML，保持原始页面布局"""
    import io
    import base64

    html_parts = []
    doc = fitz.open(stream=file_data, filetype="pdf")

    for page_num, page in enumerate(doc):
        page_width = page.rect.width
        page_height = page.rect.height

        html_parts.append(f'<div class="page" style="width:{page_width}px;height:{page_height}px;">')

        img_map = {}
        img_list = page.get_images()
        if img_list:
            for img_idx, img in enumerate(img_list):
                try:
                    xref = img[0]
                    base_img = page.parent.extract_image(xref)
                    img_data = base_img["image"]
                    img_ext = base_img["ext"]
                    img_base64 = base64.b64encode(img_data).decode('utf-8')
                    img_map[img_idx] = (img_base64, img_ext)
                except Exception as e:
                    print(f"Failed to extract image: {e}")

        blocks = page.get_text("dict")["blocks"]

        for block in blocks:
            if block.get("type") == 0:
                bbox = block.get("bbox", [0, 0, 0, 0])
                x, y, w, h = bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]

                lines = block.get("lines", [])
                texts = []
                for line in lines:
                    text = "".join([span.get("text", "") for span in line.get("spans", [])])
                    if text.strip():
                        texts.append(text.strip())

                if texts:
                    style = f'position:absolute;left:{x}px;top:{y}px;width:{w}px;'
                    html_parts.append(f'<p style="{style}font-size:12px;margin:0;">' + " ".join(texts) + '</p>')

            elif block.get("type") == 1:
                bbox = block.get("bbox", [0, 0, 0, 0])
                x, y = bbox[0], bbox[1]
                img_idx = block.get("number", 0) - 1

                if img_idx in img_map:
                    img_base64, img_ext = img_map[img_idx]
                    html_parts.append(f'<img src="data:image/{img_ext};base64,{img_base64}" style="position:absolute;left:{x}px;top:{y}px;max-width:100%;height:auto;" />')

        html_parts.append('</div>')

    doc.close()

    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif; 
               margin: 0; padding: 10px; background: #f0f0f0; }
        .page { position: relative; background: white; margin: 0 auto 20px; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.15); overflow: hidden; }
        .page p { margin: 0; white-space: pre-wrap; word-wrap: break-word; }
        .page img { position: absolute; }
    </style>
</head>
<body>
{chr(10).join(html_parts)}
</body>
</html>'''

    return html


def convert_docx_to_html(file_data: bytes) -> str:
    """使用mammoth将docx转换为HTML"""
    import mammoth

    result = mammoth.convert_to_html({"file_data": file_data})
    html = result.get("value", "")

    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif; 
               margin: 20px; line-height: 1.6; color: #333; }}
        img {{ max-width: 100%; height: auto; }}
        table {{ border-collapse: collapse; width: 100%; margin: 15px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        h1, h2, h3 {{ margin: 15px 0 10px; }}
        p {{ margin: 10px 0; }}
        ul, ol {{ margin: 10px 0; padding-left: 25px; }}
    </style>
</head>
<body>
{html}
</body>
</html>'''

    return html


@router.post("/convert-to-html")
async def convert_to_html(req: ConvertToHtmlRequest):
    """将PDF或DOCX文件转换为HTML5"""
    try:
        file_data = base64.b64decode(req.file_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64: {str(e)}")

    filename = req.filename.lower()
    job_id = uuid.uuid4().hex

    OUTPUT_DIR.mkdir(exist_ok=True)

    try:
        if filename.endswith('.pdf'):
            html = convert_pdf_to_html(file_data, filename)
        elif filename.endswith('.docx'):
            html = convert_docx_to_html(file_data)
        elif filename.endswith('.doc'):
            html = convert_docx_to_html(file_data)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use PDF, DOCX, or DOC")

        output_file = OUTPUT_DIR / f"{job_id}.html"
        output_file.write_text(html, encoding='utf-8')

        return {
            "job_id": job_id,
            "status": "done",
            "html": html,
            "html_url": f"/aidoc/html/{job_id}.html"
        }

    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}\n{traceback.format_exc()}")


@router.post("/ai-review")
async def ai_review(req: AIReviewRequest):
    """使用AI修正HTML内容"""
    try:
        prompt = f"""你是一个HTML文档修正专家。请检查以下HTML内容，找出并修复以下问题：
1. 布局问题（如元素重叠、溢出）
2. 图片大小问题（过大、过小、变形）
3. 格式问题（字体、颜色、间距）
4. 语法错误（如未闭合的标签）

用户指令: {req.instructions}

请直接返回修正后的HTML代码（包含完整的<!DOCTYPE html>和<html>标签），不要添加任何解释或markdown格式。"""

        messages = [
            {"role": "system", "content": "你是一个专业的HTML文档修正助手。"},
            {"role": "user", "content": f"{prompt}\n\n原始HTML:\n{req.html_content}"}
        ]

        node_response = requests.post(
            f"{NODE_API_URL}/api/chat",
            json={"messages": messages},
            timeout=120
        )

        if node_response.status_code != 200:
            raise HTTPException(status_code=500, detail="AI service unavailable")

        result = node_response.json()

        if 'choices' in result and len(result['choices']) > 0:
            corrected_html = result['choices'][0]['message']['content']

            corrected_html = re.sub(r'^```html\n?', '', corrected_html)
            corrected_html = re.sub(r'^```\n?$', '', corrected_html)
            corrected_html = corrected_html.strip()

            return {
                "status": "done",
                "original_html": req.html_content,
                "corrected_html": corrected_html
            }
        else:
            raise HTTPException(status_code=500, detail="AI response invalid")

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Review failed: {str(e)}")


@router.post("/export")
async def export_html(req: ExportRequest):
    """将HTML导出为PDF、DOCX或DOC格式"""
    import mammoth
    import weasyprint
    from docx import Document
    from io import BytesIO

    OUTPUT_DIR.mkdir(exist_ok=True)

    job_id = uuid.uuid4().hex
    html = req.html_content
    fmt = req.format.lower()

    if fmt not in ['pdf', 'docx', 'doc']:
        raise HTTPException(status_code=400, detail="Format must be pdf, docx, or doc")

    try:
        if fmt == 'pdf':
            output_path = OUTPUT_DIR / f"{job_id}.pdf"
            weasyprint.HTML(string=html).write_pdf(str(output_path))

            with open(output_path, 'rb') as f:
                file_data = base64.b64encode(f.read()).decode()

            return {
                "job_id": job_id,
                "format": "pdf",
                "file_base64": file_data,
                "filename": f"exported_{job_id}.pdf"
            }

        elif fmt in ['docx', 'doc']:
            result = mammoth.convert_to_html({"file_data": html.encode('utf-8')})
            html_content = result.get("value", "")

            doc = Document()
            doc.add_heading('Document', 0)

            temp_html = f"<html><body>{html_content}</body></html>"
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(temp_html, 'html.parser')

            for tag in soup.find_all(['p', 'h1', 'h2', 'h3', 'li']):
                if tag.name == 'h1':
                    doc.add_heading(tag.get_text(), level=1)
                elif tag.name == 'h2':
                    doc.add_heading(tag.get_text(), level=2)
                elif tag.name == 'h3':
                    doc.add_heading(tag.get_text(), level=3)
                elif tag.name == 'li':
                    doc.add_paragraph(tag.get_text(), style='List Bullet')
                else:
                    doc.add_paragraph(tag.get_text())

            if fmt == 'doc':
                docx_path = OUTPUT_DIR / f"{job_id}.docx"
                doc.save(str(docx_path))

                docx_file = docx_path.read_bytes()

                import zipfile
                from pathlib import Path as PathLib
                doc_path = OUTPUT_DIR / f"{job_id}.doc"
                with zipfile.ZipFile(BytesIO(docx_file)) as z_in:
                    with zipfile.ZipFile(doc_path, 'w', zipfile.ZIP_DEFLATED) as z_out:
                        for item in z_in.infolist():
                            if item.filename != 'word/document.xml':
                                z_out.writestr(item, z_in.read(item.filename))
                            else:
                                content = z_in.read(item.filename).decode('utf-8')
                                content = content.replace('w: vals="1"', 'w: vals="0 1 2"')
                                content = content.replace('w:fldCharType="end"', 'w:fldCharType="begin"')
                                z_out.writestr(item, content.encode('utf-8'))

                with open(doc_path, 'rb') as f:
                    file_data = base64.b64encode(f.read()).decode()
                return {
                    "job_id": job_id,
                    "format": "doc",
                    "file_base64": file_data,
                    "filename": f"exported_{job_id}.doc"
                }
            else:
                docx_path = OUTPUT_DIR / f"{job_id}.docx"
                doc.save(str(docx_path))

                with open(docx_path, 'rb') as f:
                    file_data = base64.b64encode(f.read()).decode()

                return {
                    "job_id": job_id,
                    "format": "docx",
                    "file_base64": file_data,
                    "filename": f"exported_{job_id}.docx"
                }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/html/{filename}")
async def get_html(filename: str):
    """获取HTML文件"""
    from fastapi.responses import Response

    OUTPUT_DIR.mkdir(exist_ok=True)
    path = OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")

    try:
        content = path.read_text(encoding='utf-8')
        return Response(content=content, media_type="text/html")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Read error: {str(e)}")