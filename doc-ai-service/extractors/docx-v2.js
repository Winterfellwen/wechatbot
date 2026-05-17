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
