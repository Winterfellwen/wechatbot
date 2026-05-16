const fs = require('fs');
const htmlToDocx = require('html-to-docx');
const { deduplicateDocxImages } = require('../lib/deduplicate-docx');

async function assemble(htmlContent, outputPath, title) {
  const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title || 'Document'}</title></head>
<body>${htmlContent}</body></html>`;
  const buffer = await htmlToDocx(fullHtml, null, { table: { row: { cantSplit: true } } });
  fs.writeFileSync(outputPath, buffer);
  
  // Deduplicate images to reduce file size
  try {
    deduplicateDocxImages(outputPath);
  } catch (err) {
    console.error('[docx] Image deduplication failed:', err.message);
  }
  
  return outputPath;
}

module.exports = { assemble };
