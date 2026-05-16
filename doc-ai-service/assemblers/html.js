const fs = require('fs');

function assemble(htmlContent, outputPath, title) {
  // AI may already return a complete HTML page; detect and use as-is
  const trimmed = htmlContent.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    fs.writeFileSync(outputPath, trimmed, 'utf8');
    return outputPath;
  }

  const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title || 'Document'}</title>
<style>
  body { font-family: sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
  h1, h2, h3 { color: #333; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ccc; padding: 8px; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
  fs.writeFileSync(outputPath, fullHtml, 'utf8');
  return outputPath;
}

module.exports = { assemble };
