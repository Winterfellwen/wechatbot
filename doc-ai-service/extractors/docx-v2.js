const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

function validateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    throw new Error(`File is empty: ${filePath}`);
  }
  // Accept files without extension (multer temp files) or .docx
  const ext = path.extname(filePath).toLowerCase();
  if (ext && ext !== '.docx') {
    throw new Error(`Invalid file extension: ${ext}, expected .docx`);
  }
}

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
  } catch (err) {
    console.error('[docx-v2] Image extraction failed:', err.message);
    return [];
  }
}

function extractText(docxPath) {
  try {
    // Use execSync with shell command instead of execFileSync for better compatibility
    const result = execSync(`pandoc "${docxPath}" -t json`, {
      encoding: 'utf-8',
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024,
    });
    return JSON.parse(result);
  } catch (err) {
    console.error('[docx-v2] Pandoc JSON extraction failed, falling back to plain text:', err.message);
    try {
      const text = execSync(`pandoc "${docxPath}" -t plain`, {
        encoding: 'utf-8',
        timeout: 120000,
        maxBuffer: 50 * 1024 * 1024,
      });
      return { blocks: [{ t: 'Para', c: [{ t: 'Str', c: text }] }] };
    } catch (fallbackErr) {
      console.error('[docx-v2] Pandoc plain text fallback also failed:', fallbackErr.message);
      return { blocks: [] };
    }
  }
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

function getHeaderContent(block) {
  const content = block.c;
  // Pandoc 3.x: [level, [attributes...], inlines]
  // Pandoc 2.x: [level, inlines]
  if (Array.isArray(content[1]) && content[1].length > 0 && typeof content[1][0] === 'string') {
    // 3.x: content[2] is inlines
    return content[2];
  }
  // 2.x: content[1] is inlines
  return content[1];
}

function getTableData(block) {
  const content = block.c;
  // Pandoc 3.x Table: [attr, caption, colspecs, head, bodies, foot]
  // Pandoc 2.x Table: [caption, aligns, widths, headers, rows]
  if (content[0] && typeof content[0] === 'object' && !Array.isArray(content[0]) && content[0].t === undefined) {
    // Likely 3.x: content[0] is attr object
    const head = content[3];
    const bodies = content[4];
    const headers = Array.isArray(head) ? head.map(h => extractInlineText(h)) : [];
    const rows = [];
    if (Array.isArray(bodies)) {
      for (const body of bodies) {
        if (body && Array.isArray(body[1])) {
          for (const row of body[1]) {
            rows.push(row.map(cell => extractInlineText(cell)));
          }
        }
      }
    }
    return { headers, rows };
  }
  // 2.x fallback
  const headers = content[3].map(h => extractInlineText(h));
  const rows = content[4].map(row => row.map(cell => extractInlineText(cell)));
  return { headers, rows };
}

function pandocToJsonSections(pandocJson) {
  const sections = [];

  for (const block of pandocJson.blocks || []) {
    switch (block.t) {
      case 'Header':
        sections.push({
          type: 'heading',
          level: block.c[0],
          text: extractInlineText(getHeaderContent(block)),
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
        const { headers, rows } = getTableData(block);
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

async function extract(filePath) {
  validateFile(filePath);

  const images = extractImages(filePath);
  const pandocJson = extractText(filePath);
  const sections = pandocToJsonSections(pandocJson);

  const title = sections
    .filter(s => s.type === 'heading' && s.level === 1)
    .map(s => s.text)[0] || '';

  const text = sections.map(s =>
    s.type === 'heading' ? s.text : s.children?.map(c => c.text).join('')
  ).join('\n');

  return {
    text,
    images,
    title,
    totalPages: 1,
    sections,
  };
}

module.exports = { extract };
