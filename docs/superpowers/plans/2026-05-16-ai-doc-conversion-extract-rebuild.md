# AI Document Conversion (Extract → AI Rebuild) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor PDF↔DOCX conversion to use direct content extraction + AI rebuild with structured JSON, eliminating HTML intermediate format.

**Architecture:** Extract source content (text/images/tables) → AI generates structured JSON → docx-js builds DOCX or reportlab builds PDF. Old HTML pipeline preserved as fallback.

**Tech Stack:** Node.js (docx npm), Python (pdfplumber, reportlab), Anthropic docx/pdf skills patterns

---

## File Structure

| File | Responsibility | Status |
|------|---------------|--------|
| `doc-ai-service/lib/json-schema.js` | JSON Schema definition + validation | New |
| `doc-ai-service/lib/json-fixer.js` | AI JSON repair utilities | New |
| `doc-ai-service/extractors/pdf-v2.js` | pdfplumber-based PDF extraction → JSON | New |
| `doc-ai-service/extractors/docx-v2.js` | pandoc-based DOCX extraction → JSON | New |
| `doc-ai-service/assemblers/docx-v2.js` | docx-js DOCX builder from JSON | New |
| `doc-ai-service/assemblers/pdf-v2.js` | reportlab PDF builder (Python bridge) | New |
| `doc-ai-service/ai.js` | Updated to output JSON instead of HTML | Modify |
| `doc-ai-service/index.js` | Updated pipeline with v2 + fallback | Modify |
| `pdf-service/extractors/pdf.py` | pdfplumber + pdfimages extraction script | New |
| `pdf-service/assemblers/pdf.py` | reportlab PDF generation script | New |

---

### Task 1: JSON Schema Definition

**Files:**
- Create: `doc-ai-service/lib/json-schema.js`
- Create: `doc-ai-service/lib/json-fixer.js`

- [ ] **Step 1: Create JSON Schema definition**

```javascript
// doc-ai-service/lib/json-schema.js

const SCHEMA = {
  type: 'object',
  required: ['sections'],
  properties: {
    title: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            required: ['type', 'level', 'text'],
            properties: {
              type: { const: 'heading' },
              level: { enum: [1, 2, 3, 4] },
              text: { type: 'string' },
            },
          },
          {
            type: 'object',
            required: ['type', 'children'],
            properties: {
              type: { const: 'paragraph' },
              children: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['text'],
                  properties: {
                    text: { type: 'string' },
                    bold: { type: 'boolean' },
                    italic: { type: 'boolean' },
                    underline: { type: 'boolean' },
                    fontSize: { type: 'number' },
                    color: { type: 'string' },
                  },
                },
              },
              alignment: { enum: ['left', 'center', 'right', 'justify'] },
            },
          },
          {
            type: 'object',
            required: ['type', 'index'],
            properties: {
              type: { const: 'image' },
              index: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' },
              alignment: { enum: ['left', 'center', 'right'] },
            },
          },
          {
            type: 'object',
            required: ['type', 'rows'],
            properties: {
              type: { const: 'table' },
              headers: { type: 'array', items: { type: 'string' } },
              rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
              columnWidths: { type: 'array', items: { type: 'number' } },
            },
          },
          {
            type: 'object',
            required: ['type', 'items', 'ordered'],
            properties: {
              type: { const: 'list' },
              items: { type: 'array', items: { type: 'string' } },
              ordered: { type: 'boolean' },
            },
          },
        ],
      },
    },
  },
};

function validate(doc) {
  if (!doc || !Array.isArray(doc.sections)) {
    return { valid: false, error: 'Missing sections array' };
  }
  for (let i = 0; i < doc.sections.length; i++) {
    const s = doc.sections[i];
    if (!s.type) return { valid: false, error: `Section ${i} missing type` };
    switch (s.type) {
      case 'heading':
        if (!s.level || !s.text) return { valid: false, error: `Section ${i}: heading needs level+text` };
        if (![1, 2, 3, 4].includes(s.level)) return { valid: false, error: `Section ${i}: invalid heading level` };
        break;
      case 'paragraph':
        if (!Array.isArray(s.children)) return { valid: false, error: `Section ${i}: paragraph needs children` };
        break;
      case 'image':
        if (typeof s.index !== 'number') return { valid: false, error: `Section ${i}: image needs index` };
        break;
      case 'table':
        if (!Array.isArray(s.rows)) return { valid: false, error: `Section ${i}: table needs rows` };
        break;
      case 'list':
        if (!Array.isArray(s.items)) return { valid: false, error: `Section ${i}: list needs items` };
        break;
      default:
        return { valid: false, error: `Section ${i}: unknown type "${s.type}"` };
    }
  }
  return { valid: true };
}

module.exports = { SCHEMA, validate };
```

- [ ] **Step 2: Create JSON fixer utility**

```javascript
// doc-ai-service/lib/json-fixer.js

function fixJson(content) {
  // Remove markdown code fences
  content = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '');
  content = content.trim();

  // Fix trailing commas before } or ]
  content = content.replace(/,\s*([}\]])/g, '$1');

  // Fix unescaped newlines in strings
  content = content.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  });

  return content;
}

function parseAIResponse(content) {
  // Try direct parse first
  try {
    const doc = JSON.parse(content);
    return { doc, error: null };
  } catch {
    // Try fixing common issues
    const fixed = fixJson(content);
    try {
      const doc = JSON.parse(fixed);
      return { doc, error: null };
    } catch (e) {
      return { doc: null, error: e.message };
    }
  }
}

module.exports = { fixJson, parseAIResponse };
```

- [ ] **Step 3: Commit**

```bash
git add doc-ai-service/lib/json-schema.js doc-ai-service/lib/json-fixer.js
git commit -m "feat: add JSON schema and fixer for AI document conversion"
```

---

### Task 2: PDF Extractor v2 (pdfplumber → JSON)

**Files:**
- Create: `pdf-service/extractors/pdf.py`
- Create: `doc-ai-service/extractors/pdf-v2.js`

- [ ] **Step 1: Create Python PDF extraction script**

```python
# pdf-service/extractors/pdf.py
"""
Extract text, tables, and images from PDF using pdfplumber + pdfimages.
Outputs structured JSON + image files to a temp directory.
"""
import sys, os, json, subprocess, tempfile
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
    all_images = []
    
    with pdfplumber.open(str(pdf_path)) as pdf:
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
                    # Simple heuristic: short lines with no periods might be headings
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
    
    return sections

def main():
    if len(sys.argv) != 3:
        print("Usage: pdf.py <input.pdf> <output_dir>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Extract text and tables
    sections = extract_text_and_tables(pdf_path)
    
    # Extract images
    image_paths = extract_images(pdf_path, str(output_dir))
    
    # Output JSON
    result = {
        'title': pdf_path.stem,
        'sections': sections,
        'imageCount': len(image_paths)
    }
    
    # Write JSON to stdout
    print(json.dumps(result, ensure_ascii=False))
    
    # Write image list to file
    with open(output_dir / 'images.json', 'w') as f:
        json.dump(image_paths, f)

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Create Node.js PDF extractor wrapper**

```javascript
// doc-ai-service/extractors/pdf-v2.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function extract(filePath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-extract-'));
  
  try {
    const scriptPath = path.join(__dirname, '../../pdf-service/extractors/pdf.py');
    const result = execSync(`python "${scriptPath}" "${filePath}" "${tempDir}"`, {
      encoding: 'utf-8',
      timeout: 120000,
    });
    
    const json = JSON.parse(result);
    
    // Load images
    const imageListPath = path.join(tempDir, 'images.json');
    const imagePaths = fs.existsSync(imageListPath)
      ? JSON.parse(fs.readFileSync(imageListPath, 'utf-8'))
      : [];
    
    const images = imagePaths
      .filter(p => fs.existsSync(p))
      .map(p => fs.readFileSync(p));
    
    return {
      text: JSON.stringify(json),
      images,
      title: json.title || '',
      totalPages: 1,
      sections: json.sections || [],
    };
  } finally {
    // Cleanup temp dir
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { extract };
```

- [ ] **Step 3: Commit**

```bash
git add pdf-service/extractors/pdf.py doc-ai-service/extractors/pdf-v2.js
git commit -m "feat: add PDF extractor v2 using pdfplumber → JSON"
```

---

### Task 3: DOCX Extractor v2 (pandoc → JSON)

**Files:**
- Create: `doc-ai-service/extractors/docx-v2.js`

- [ ] **Step 1: Create DOCX extractor using pandoc**

```javascript
// doc-ai-service/extractors/docx-v2.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function extractImages(docxPath) {
  try {
    const zip = new AdmZip(docxPath);
    const entries = zip.getEntries();
    const images = [];
    
    for (const entry of entries) {
      if (entry.entryName.startsWith('word/media/')) {
        images.push(entry.getData());
      }
    }
    
    return images;
  } catch {
    return [];
  }
}

function extractText(docxPath) {
  try {
    const result = execSync(`pandoc "${docxPath}" -t json`, {
      encoding: 'utf-8',
      timeout: 30000,
    });
    return JSON.parse(result);
  } catch {
    // Fallback: plain text
    const text = execSync(`pandoc "${docxPath}" -t plain`, {
      encoding: 'utf-8',
      timeout: 30000,
    });
    return { blocks: [{ t: 'Para', c: [{ t: 'Str', c: text }] }] };
  }
}

function pandocToJsonSections(pandocJson) {
  const sections = [];
  
  for (const block of pandocJson.blocks || []) {
    switch (block.t) {
      case 'Header':
        sections.push({
          type: 'heading',
          level: block.c[0],
          text: extractInlineText(block.c[2]),
        });
        break;
      case 'Para':
        sections.push({
          type: 'paragraph',
          children: extractInlines(block.c),
        });
        break;
      case 'BulletList':
        sections.push({
          type: 'list',
          items: block.c.map(item => extractInlineText(item)),
          ordered: false,
        });
        break;
      case 'OrderedList':
        sections.push({
          type: 'list',
          items: block.c[1].map(item => extractInlineText(item)),
          ordered: true,
        });
        break;
      case 'Table':
        const tableData = block.c;
        const headers = tableData[0].map(h => extractInlineText(h));
        const rows = tableData[3].map(row => row.map(cell => extractInlineText(cell)));
        sections.push({
          type: 'table',
          headers,
          rows,
        });
        break;
    }
  }
  
  return sections;
}

function extractInlineText(inlines) {
  if (!inlines) return '';
  if (typeof inlines === 'string') return inlines;
  return inlines.map(inline => {
    if (typeof inline === 'string') return inline;
    if (inline.t === 'Str') return inline.c;
    if (inline.t === 'Space') return ' ';
    if (inline.t === 'Emph') return extractInlineText(inline.c);
    return extractInlineText(inline.c);
  }).join('');
}

function extractInlines(inlines) {
  if (!Array.isArray(inlines)) return [{ text: String(inlines || '') }];
  
  return inlines.map(inline => {
    if (typeof inline === 'string') return { text: inline };
    const run = { text: '' };
    
    switch (inline.t) {
      case 'Str':
        run.text = inline.c;
        break;
      case 'Space':
        run.text = ' ';
        break;
      case 'Emph':
        run.text = extractInlineText(inline.c);
        run.italic = true;
        break;
      case 'Strong':
        run.text = extractInlineText(inline.c);
        run.bold = true;
        break;
      case 'Underline':
        run.text = extractInlineText(inline.c);
        run.underline = true;
        break;
      default:
        run.text = extractInlineText(inline.c);
    }
    
    return run;
  }).filter(r => r.text);
}

async function extract(filePath) {
  const images = extractImages(filePath);
  const pandocJson = extractText(filePath);
  const sections = pandocToJsonSections(pandocJson);
  
  const title = sections
    .filter(s => s.type === 'heading' && s.level === 1)
    .map(s => s.text)[0] || '';
  
  return {
    text: JSON.stringify({ sections }),
    images,
    title,
    totalPages: 1,
    sections,
  };
}

module.exports = { extract };
```

- [ ] **Step 2: Add adm-zip dependency**

```bash
cd doc-ai-service && npm install adm-zip
```

- [ ] **Step 3: Commit**

```bash
git add doc-ai-service/extractors/docx-v2.js doc-ai-service/package.json
git commit -m "feat: add DOCX extractor v2 using pandoc → JSON"
```

---

### Task 4: AI Module Update (JSON Output)

**Files:**
- Modify: `doc-ai-service/ai.js`

- [ ] **Step 1: Update buildPrompt for JSON output**

Replace the existing `buildPrompt` function with:

```javascript
function buildPrompt(sourceText, sourceFormat, targetFormat, mode, title, imageInfo) {
  const modeInstructions = {
    polish: '润色文档内容：修正语法错误，优化表达方式，保持原意不变。改善段落结构和可读性。',
    format: '格式化文档：优化标题层级，整理段落结构，美化表格和列表，使其布局清晰专业。',
    summarize: '提取文档的核心内容，生成结构化摘要。保留关键信息、主要论点和结论。省略次要细节。',
  };

  const imageNote = imageInfo
    ? `\n⚠️ 重要：原文档包含 ${imageInfo.count} 张图片。你必须在输出中包含 ${imageInfo.count} 个 image section，每个 image section 的 index 从 0 开始递增。`
    : '';

  const textPreservationNote = `
⚠️ 严格保留原文中的所有事实信息，不得修改、替换或省略：
- 公司名称、人名、职位、联系方式（邮箱、电话必须逐字保留）
- 日期、时间、地点、数字
- 证书名称、学校名称、专业名称
- 项目名称、技术名词（如 VMware, AWS, Azure 等）
仅优化排版和格式，不改变任何实质性内容。`;

  const schemaExample = JSON.stringify({
    title: title || 'Document',
    sections: [
      { type: 'heading', level: 1, text: 'John Doe' },
      { type: 'paragraph', children: [{ text: 'Software Engineer with 5 years experience.', bold: false }] },
      { type: 'heading', level: 2, text: 'Work Experience' },
      { type: 'paragraph', children: [{ text: 'Company Name', bold: true }, { text: ' - Software Engineer' }] },
      { type: 'list', items: ['Led team of 5 developers', 'Delivered project 2 weeks early'], ordered: false },
      { type: 'image', index: 0, width: 400, height: 300, alignment: 'center' },
    ],
  }, null, 2);

  return [
    { role: 'system', content: `你是一个文档转换专家。你需要将${sourceFormat}格式的文档转换为${targetFormat}格式。
${modeInstructions[mode] || modeInstructions.polish}
${imageNote}
${textPreservationNote}

你必须输出一个 JSON 对象，包含 sections 数组。每个 section 必须是以下类型之一：
- heading: { type: "heading", level: 1-4, text: "标题文本" }
- paragraph: { type: "paragraph", children: [{ text: "文本", bold: false, italic: false }], alignment: "left" }
- image: { type: "image", index: 数字, width: 宽度, height: 高度, alignment: "center" }
- table: { type: "table", headers: ["列1"], rows: [["行1列1"]] }
- list: { type: "list", items: ["项目1"], ordered: false }

示例输出：
\`\`\`json
${schemaExample}
\`\`\`

不输出任何解释、前言、后语。只输出 JSON。` },
    { role: 'user', content: `以下是需要处理的文档内容：\n\n${sourceText.substring(0, 30000)}` },
  ];
}
```

- [ ] **Step 2: Update parseAIResponse for JSON**

Replace the existing `parseAIResponse` function with:

```javascript
function parseAIResponse(content) {
  const { parseAIResponse: parseJson } = require('./lib/json-fixer');
  const { validate } = require('./lib/json-schema');
  
  const { doc, error } = parseJson(content);
  if (error) throw new Error(`AI JSON 解析失败: ${error}`);
  
  const validation = validate(doc);
  if (!validation.valid) throw new Error(`AI JSON 验证失败: ${validation.error}`);
  
  return doc;
}
```

- [ ] **Step 3: Commit**

```bash
git add doc-ai-service/ai.js
git commit -m "feat: update AI module to output structured JSON instead of HTML"
```

---

### Task 5: DOCX Assembler v2 (docx-js)

**Files:**
- Create: `doc-ai-service/assemblers/docx-v2.js`

- [ ] **Step 1: Create docx-js assembler**

```javascript
// doc-ai-service/assemblers/docx-v2.js
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ImageRun, NumberingLevel, LevelFormat } = require('docx');
const fs = require('fs');

// DXA conversions (1 inch = 1440 DXA)
const INCH = 1440;
const CM = 567;

function createHeading(level, text) {
  const headingLevels = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
  };
  
  return new Paragraph({
    heading: headingLevels[level],
    children: [new TextRun({ text, font: 'Arial', size: 24 - level * 2 })],
    spacing: { before: 200, after: 100 },
  });
}

function createParagraph(section) {
  const children = section.children.map(child => {
    const run = {
      text: child.text,
      font: 'Arial',
      size: 24, // 12pt
    };
    if (child.bold) run.bold = true;
    if (child.italic) run.italic = true;
    if (child.underline) run.underline = { type: 'single' };
    if (child.fontSize) run.size = child.fontSize * 2; // pt to half-points
    if (child.color) run.color = child.color.replace('#', '');
    return new TextRun(run);
  });
  
  const alignMap = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  };
  
  return new Paragraph({
    children,
    alignment: alignMap[section.alignment] || AlignmentType.LEFT,
    spacing: { after: 120 },
  });
}

function createImage(section, imageBuffers) {
  if (!imageBuffers || !imageBuffers[section.index]) {
    return new Paragraph({
      children: [new TextRun({ text: `[Image ${section.index} not found]`, italics: true })],
    });
  }
  
  const alignMap = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
  };
  
  return new Paragraph({
    children: [
      new ImageRun({
        data: imageBuffers[section.index],
        transformation: {
          width: section.width || 400,
          height: section.height || 300,
        },
        type: 'jpg',
      }),
    ],
    alignment: alignMap[section.alignment] || AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
  });
}

function createTable(section) {
  const allRows = section.headers ? [section.headers, ...section.rows] : section.rows;
  
  const tableRows = allRows.map((row, i) => {
    const cells = row.map(cell => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({
          text: cell,
          font: 'Arial',
          size: 22,
          bold: i === 0,
        })],
      })],
      width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
    }));
    
    return new TableRow({ children: cells });
  });
  
  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function createList(section) {
  return section.items.map((item, i) => {
    return new Paragraph({
      children: [new TextRun({ text: item, font: 'Arial', size: 24 })],
      bullet: {
        level: 0,
      },
      numbering: {
        reference: 'default-list',
        level: 0,
      },
      spacing: { after: 60 },
    });
  });
}

async function assemble(jsonDoc, outputPath, imageBuffers) {
  const children = [];
  
  for (const section of jsonDoc.sections) {
    switch (section.type) {
      case 'heading':
        children.push(createHeading(section.level, section.text));
        break;
      case 'paragraph':
        children.push(createParagraph(section));
        break;
      case 'image':
        children.push(createImage(section, imageBuffers));
        break;
      case 'table':
        children.push(createTable(section));
        break;
      case 'list':
        children.push(...createList(section));
        break;
    }
  }
  
  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });
  
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  
  return outputPath;
}

module.exports = { assemble };
```

- [ ] **Step 2: Commit**

```bash
git add doc-ai-service/assemblers/docx-v2.js
git commit -m "feat: add DOCX assembler v2 using docx-js"
```

---

### Task 6: PDF Assembler v2 (reportlab)

**Files:**
- Create: `pdf-service/assemblers/pdf.py`

- [ ] **Step 1: Create reportlab PDF assembler**

```python
# pdf-service/assemblers/pdf.py
"""
Generate PDF from structured JSON using reportlab.
"""
import sys, os, json, base64
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, ListFlowable, ListItem
)
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib import colors

def build_pdf(json_doc, image_buffers, output_path):
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
    styles.add(ParagraphStyle(
        name='CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=14,
        spaceAfter=6,
    ))
    
    story = []
    
    for section in json_doc.get('sections', []):
        section_type = section.get('type')
        
        if section_type == 'heading':
            level = section.get('level', 1)
            text = section.get('text', '')
            style_name = f'Heading{level}'
            style = styles.get(style_name, styles['Heading1'])
            story.append(Paragraph(text, style))
            story.append(Spacer(1, 6))
        
        elif section_type == 'paragraph':
            children = section.get('children', [])
            html_parts = []
            for child in children:
                text = escape_html(child.get('text', ''))
                if child.get('bold'):
                    text = f'<b>{text}</b>'
                if child.get('italic'):
                    text = f'<i>{text}</i>'
                if child.get('underline'):
                    text = f'<u>{text}</u>'
                html_parts.append(text)
            
            html = ''.join(html_parts)
            align = section.get('alignment', 'left')
            align_map = {
                'left': TA_LEFT,
                'center': TA_CENTER,
                'right': TA_RIGHT,
                'justify': TA_JUSTIFY,
            }
            
            para = Paragraph(
                html,
                styles['CustomBody'],
                alignment=align_map.get(align, TA_LEFT),
            )
            story.append(para)
        
        elif section_type == 'image':
            index = section.get('index', 0)
            if index < len(image_buffers):
                img_data = base64.b64decode(image_buffers[index])
                import io
                img = Image(io.BytesIO(img_data))
                width = section.get('width', 400)
                height = section.get('height', 300)
                img.drawWidth = width
                img.drawHeight = height
                story.append(img)
                story.append(Spacer(1, 6))
        
        elif section_type == 'table':
            headers = section.get('headers', [])
            rows = section.get('rows', [])
            all_data = [headers] + rows if headers else rows
            
            # Escape HTML in table cells
            table_data = [[escape_html(str(cell)) for cell in row] for row in all_data]
            
            col_count = max(len(row) for row in table_data) if table_data else 1
            col_widths = [doc.width / col_count] * col_count
            
            table = Table(table_data, colWidths=col_widths)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#404040')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f5f5f5')),
                ('GRID', (0, 0), (-1, -1), 1, black),
            ]))
            story.append(table)
            story.append(Spacer(1, 12))
        
        elif section_type == 'list':
            items = section.get('items', [])
            ordered = section.get('ordered', False)
            
            list_items = []
            for item in items:
                para = Paragraph(escape_html(item), styles['CustomBody'])
                list_items.append(ListItem(para))
            
            flowable = ListFlowable(
                list_items,
                bulletType='1' if ordered else 'bullet',
                leftIndent=20,
                bulletOffsetY=-2,
            )
            story.append(flowable)
    
    doc.build(story)

def escape_html(text):
    """Escape HTML special characters."""
    return (
        str(text)
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
    )

def main():
    if len(sys.argv) != 4:
        print("Usage: pdf.py <input.json> <images_dir> <output.pdf>", file=sys.stderr)
        sys.exit(1)
    
    json_path = Path(sys.argv[1])
    images_dir = Path(sys.argv[2])
    output_path = Path(sys.argv[3])
    
    with open(json_path) as f:
        json_doc = json.load(f)
    
    # Load images as base64
    image_buffers = []
    if images_dir.exists():
        for img_path in sorted(images_dir.iterdir()):
            if img_path.suffix.lower() in ('.jpg', '.jpeg', '.png', '.gif'):
                with open(img_path, 'rb') as f:
                    image_buffers.append(base64.b64encode(f.read()).decode())
    
    build_pdf(json_doc, image_buffers, output_path)
    print(f"PDF created: {output_path}")

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Commit**

```bash
git add pdf-service/assemblers/pdf.py
git commit -m "feat: add PDF assembler v2 using reportlab"
```

---

### Task 7: Main Pipeline Integration

**Files:**
- Modify: `doc-ai-service/index.js`

- [ ] **Step 1: Add v2 imports and feature flag**

Add at the top of `index.js`:

```javascript
const pdfExtractorV2 = require('./extractors/pdf-v2');
const docxExtractorV2 = require('./extractors/docx-v2');
const docxAssemblerV2 = require('./assemblers/docx-v2');
const { validate } = require('./lib/json-schema');
```

Add config for v2 pipeline:

```javascript
const USE_V2_PIPELINE = process.env.USE_V2_PIPELINE === 'true';
```

- [ ] **Step 2: Create v2 processJob function**

Add new function `processJobV2`:

```javascript
async function processJobV2(jobId) {
  const job = queue.getJob(jobId);
  if (!job) throw new Error('Job not found');

  console.log(`[process-v2] job=${jobId} ${job.sourceFmt}→${job.targetFmt} mode=${job.mode}`);

  // Extract content using v2 extractors
  const extractor = job.sourceFmt === 'pdf' ? pdfExtractorV2 : docxExtractorV2;
  const result = await extractor.extract(job.filePath);

  // Call AI with extracted content
  const imageInfo = result.images && result.images.length > 0
    ? { count: result.images.length }
    : null;

  const aiJson = await callAI(result.text, job.sourceFmt, job.targetFmt, job.mode, result.title || '', imageInfo);

  // Validate AI output
  const validation = validate(aiJson);
  if (!validation.valid) {
    console.error(`[process-v2] AI JSON validation failed: ${validation.error}, falling back to v1`);
    return processJob(jobId);
  }

  // Assemble output
  const outName = `${jobId}.${job.targetFmt}`;
  const outPath = path.join(config.outputsDir, outName);

  if (job.targetFmt === 'docx') {
    await docxAssemblerV2.assemble(aiJson, outPath, result.images);
  } else if (job.targetFmt === 'pdf') {
    // Call Python reportlab assembler
    const jsonPath = path.join(config.outputsDir, `${jobId}.json`);
    const imagesDir = path.join(config.outputsDir, `${jobId}-images`);
    fs.mkdirSync(imagesDir, { recursive: true });
    
    // Save JSON and images for Python script
    fs.writeFileSync(jsonPath, JSON.stringify(aiJson));
    if (result.images) {
      result.images.forEach((img, i) => {
        fs.writeFileSync(path.join(imagesDir, `img-${i}.jpg`), img);
      });
    }
    
    const scriptPath = path.join(__dirname, '../pdf-service/assemblers/pdf.py');
    execSync(`python "${scriptPath}" "${jsonPath}" "${imagesDir}" "${outPath}"`, {
      timeout: 120000,
    });
    
    // Cleanup temp files
    fs.unlinkSync(jsonPath);
    fs.rmSync(imagesDir, { recursive: true, force: true });
  }

  queue.updateJob(jobId, { resultFile: outName });
  fs.unlink(job.filePath, () => {});
}
```

- [ ] **Step 3: Update processJob to route to v2 or v1**

Modify the existing `processJob` function:

```javascript
async function processJob(jobId) {
  if (USE_V2_PIPELINE) {
    return processJobV2(jobId);
  }
  // ... existing v1 code unchanged ...
}
```

- [ ] **Step 4: Commit**

```bash
git add doc-ai-service/index.js
git commit -m "feat: integrate v2 pipeline with fallback to v1"
```

---

### Task 8: Testing & Verification

**Files:**
- Test: Manual testing with sample PDF and DOCX files

- [ ] **Step 1: Test PDF → DOCX with v2 pipeline**

```bash
# Enable v2 pipeline
export USE_V2_PIPELINE=true

# Start service
cd doc-ai-service && node index.js &

# Test PDF → DOCX
curl -X POST http://localhost:3002/convert \
  -F "file=@test.pdf" \
  -F "to=docx" \
  -F "mode=polish"

# Check result
curl http://localhost:3002/status/<job_id>
curl http://localhost:3002/download/<result_file> -o output.docx
```

- [ ] **Step 2: Test DOCX → PDF with v2 pipeline**

```bash
# Test DOCX → PDF
curl -X POST http://localhost:3002/convert \
  -F "file=@test.docx" \
  -F "to=pdf" \
  -F "mode=polish"

# Check result
curl http://localhost:3002/status/<job_id>
curl http://localhost:3002/download/<result_file> -o output.pdf
```

- [ ] **Step 3: Verify text is selectable in output PDF**

Open output.pdf and verify text can be selected with mouse.

- [ ] **Step 4: Verify images are preserved**

Check that output files contain the same number of images as input.

- [ ] **Step 5: Test fallback to v1 pipeline**

```bash
# Disable v2 pipeline
export USE_V2_PIPELINE=false

# Test that v1 pipeline still works
curl -X POST http://localhost:3002/convert \
  -F "file=@test.pdf" \
  -F "to=docx" \
  -F "mode=polish"
```

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during v2 pipeline testing"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| pdfplumber text/table extraction | Task 2 |
| pdfimages image extraction | Task 2 |
| pandoc DOCX text extraction | Task 3 |
| DOCX image unpacking | Task 3 |
| AI JSON output format | Task 4 |
| docx-js DOCX assembly | Task 5 |
| reportlab PDF assembly | Task 6 |
| V2 pipeline integration | Task 7 |
| Fallback to v1 | Task 7 |
| JSON schema validation | Task 1 |
| JSON repair utilities | Task 1 |

### Placeholder Scan

No placeholders found. All code steps contain actual implementation code.

### Type Consistency

- JSON schema types match across all tasks
- Section types: heading, paragraph, image, table, list
- Image index is 0-based numeric
- All file paths are consistent

---

Plan complete and saved to `docs/superpowers/plans/2026-05-16-ai-doc-conversion-extract-rebuild.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
