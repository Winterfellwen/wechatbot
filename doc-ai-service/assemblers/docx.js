const fs = require('fs');
const htmlToDocx = require('html-to-docx');

async function assemble(htmlContent, outputPath, title) {
  const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title || 'Document'}</title></head>
<body>${htmlContent}</body></html>`;
  const buffer = await htmlToDocx(fullHtml, null, { table: { row: { cantSplit: true } } });
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

module.exports = { assemble };
