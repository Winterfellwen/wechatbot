"""
Extract text, tables, and images from PDF using pdfplumber + pdfimages.
Outputs structured JSON + image files to a temp directory.
"""
import sys, os, json, subprocess
from pathlib import Path

def extract_images(pdf_path, output_dir):
    """Extract images using pdfimages (poppler)."""
    prefix = os.path.join(output_dir, 'img')
    try:
        subprocess.run(
            ['pdfimages', '-j', str(pdf_path), prefix],
            capture_output=True, text=True, timeout=60
        )
        # Find extracted images
        images = sorted(Path(output_dir).glob('img-*.*'))
        return [str(img) for img in images]
    except FileNotFoundError:
        print("pdfimages not found, skipping image extraction", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Image extraction failed: {e}", file=sys.stderr)
        return []

def extract_text_and_tables(pdf_path):
    """Extract text and tables using pdfplumber."""
    import pdfplumber

    sections = []
    page_count = 0

    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            page_count = len(pdf.pages)
            for page_num, page in enumerate(pdf.pages, 1):
                # Extract text with layout
                text = page.extract_text()
                if text:
                    # Split into lines and detect structure
                    lines = text.split('\n')
                    for line in lines:
                        line = line.strip()
                        if not line:
                            continue
                        # Naive heading detection: short, no periods, all uppercase
                        # Heuristic may miss non-uppercase headings or false-positive short sentences
                        if len(line) < 80 and not line.endswith('.') and line.isupper():
                            sections.append({
                                'type': 'heading',
                                'level': 1,
                                'text': line
                            })
                        else:
                            sections.append({
                                'type': 'paragraph',
                                'children': [{'text': line}]
                            })

                # Extract tables
                tables = page.extract_tables()
                for table in tables:
                    if table and len(table) > 1:
                        sections.append({
                            'type': 'table',
                            'headers': [str(c) if c else '' for c in table[0]],
                            'rows': [[str(c) if c else '' for c in row] for row in table[1:]]
                        })
    except Exception as e:
        error_msg = str(e).lower()
        if 'encrypted' in error_msg or 'password' in error_msg or 'decrypt' in error_msg:
            raise ValueError(f"PDF is encrypted: {pdf_path.name}") from e
        raise ValueError(f"Failed to open PDF: {pdf_path.name} - {e}") from e

    return sections, page_count

def main():
    if len(sys.argv) != 3:
        print("Usage: pdf.py <input.pdf> <output_dir>", file=sys.stderr)
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])

    if not pdf_path.exists():
        print(f"Error: file not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    if pdf_path.suffix.lower() != '.pdf':
        print(f"Error: expected .pdf file, got: {pdf_path.suffix}", file=sys.stderr)
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    # Extract text and tables
    sections, page_count = extract_text_and_tables(pdf_path)

    # Extract images
    image_paths = extract_images(pdf_path, str(output_dir))

    # Output JSON
    result = {
        'title': pdf_path.stem,
        'sections': sections,
        'imageCount': len(image_paths),
        'imagePaths': image_paths,
        'pageCount': page_count,
    }

    # Write JSON to stdout (use sys.stdout.write to avoid newline pollution)
    sys.stdout.write(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
