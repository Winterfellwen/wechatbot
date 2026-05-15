const fs = require('fs');
const puppeteer = require('puppeteer');

async function assemble(htmlContent, outputPath, title) {
  const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title || 'Document'}</title>
<style>
  body { font-family: sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
  h1, h2, h3 { color: #333; page-break-after: avoid; }
  table { border-collapse: collapse; width: 100%; page-break-inside: avoid; }
  td, th { border: 1px solid #ccc; padding: 8px; }
  @page { margin: 20mm; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }
  return outputPath;
}

module.exports = { assemble };
