"""
Generate PDF from structured JSON using reportlab.
"""
import sys
import os
import json
import base64
import io
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, ListFlowable, ListItem,
)
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib import colors


def escape_html(text):
    """Escape HTML special characters."""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def build_pdf(json_doc, image_buffers, output_path):
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(
        ParagraphStyle(
            name="CustomBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=12,
            leading=14,
            spaceAfter=6,
        )
    )

    story = []

    for section in json_doc.get("sections", []):
        section_type = section.get("type")

        if section_type == "heading":
            level = section.get("level", 1)
            text = section.get("text", "")
            style_name = f"Heading{level}"
            style = styles.get(style_name, styles["Heading1"])
            story.append(Paragraph(escape_html(text), style))
            story.append(Spacer(1, 6))

        elif section_type == "paragraph":
            children = section.get("children", [])
            html_parts = []
            for child in children:
                text = escape_html(child.get("text", ""))
                if child.get("bold"):
                    text = f"<b>{text}</b>"
                if child.get("italic"):
                    text = f"<i>{text}</i>"
                if child.get("underline"):
                    text = f"<u>{text}</u>"
                html_parts.append(text)

            html = "".join(html_parts)
            align = section.get("alignment", "left")
            align_map = {
                "left": TA_LEFT,
                "center": TA_CENTER,
                "right": TA_RIGHT,
                "justify": TA_JUSTIFY,
            }

            para = Paragraph(
                html,
                styles["CustomBody"],
                alignment=align_map.get(align, TA_LEFT),
            )
            story.append(para)

        elif section_type == "image":
            index = section.get("index", 0)
            if index < len(image_buffers):
                img_data = base64.b64decode(image_buffers[index])
                img = Image(io.BytesIO(img_data))
                width = section.get("width", 400)
                height = section.get("height", 300)
                img.drawWidth = width
                img.drawHeight = height
                story.append(img)
                story.append(Spacer(1, 6))
            else:
                print(f"Warning: image index {index} not found", file=sys.stderr)

        elif section_type == "table":
            headers = section.get("headers", [])
            rows = section.get("rows", [])
            all_data = [headers] + rows if headers else rows

            if not all_data:
                continue

            # Escape HTML in table cells
            table_data = [
                [escape_html(str(cell)) for cell in row] for row in all_data
            ]

            col_count = (
                max(len(row) for row in table_data) if table_data else 1
            )
            col_widths = [doc.width / col_count] * col_count

            table = Table(table_data, colWidths=col_widths)
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#404040")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), white),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 10),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("BACKGROUND", (0, 1), (-1, -1), HexColor("#f5f5f5")),
                        ("GRID", (0, 0), (-1, -1), 1, black),
                    ]
                )
            )
            story.append(table)
            story.append(Spacer(1, 12))

        elif section_type == "list":
            items = section.get("items", [])
            ordered = section.get("ordered", False)

            list_items = []
            for item in items:
                para = Paragraph(escape_html(item), styles["CustomBody"])
                list_items.append(ListItem(para))

            if not list_items:
                continue

            flowable = ListFlowable(
                list_items,
                bulletType="1" if ordered else "bullet",
                leftIndent=20,
                bulletOffsetY=-2,
            )
            story.append(flowable)

    doc.build(story)


def main():
    if len(sys.argv) != 4:
        print(
            "Usage: pdf.py <input.json> <images_dir> <output.pdf>",
            file=sys.stderr,
        )
        sys.exit(1)

    json_path = Path(sys.argv[1])
    images_dir = Path(sys.argv[2])
    output_path = Path(sys.argv[3])

    try:
        with open(json_path) as f:
            json_doc = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError, OSError) as e:
        print(f"Error loading JSON: {e}", file=sys.stderr)
        sys.exit(1)

    # Load images as base64
    image_buffers = []
    if images_dir.exists():
        for img_path in sorted(images_dir.iterdir()):
            if img_path.suffix.lower() in (".jpg", ".jpeg", ".png", ".gif"):
                with open(img_path, "rb") as f:
                    image_buffers.append(base64.b64encode(f.read()).decode())

    build_pdf(json_doc, image_buffers, output_path)
    print(f"PDF created: {output_path}")


if __name__ == "__main__":
    main()
