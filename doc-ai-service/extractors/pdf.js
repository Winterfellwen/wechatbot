// Set canvas globals BEFORE pdfjs-dist loads
const { createCanvas, Image } = require('canvas');
if (!globalThis.Image) globalThis.Image = Image;
if (!globalThis.HTMLImageElement) globalThis.HTMLImageElement = Image;

const pdfjsLib = require('pdfjs-dist');
const config = require('../config');

async function extract(filePath) {
  const loadingTask = pdfjsLib.getDocument(filePath);
  const doc = await loadingTask.promise;
  const images = [];
  const pageTexts = [];
  const scale = config.vision.pdfRenderScale;
  let title = '';

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const jpegBuf = canvas.toBuffer('image/jpeg', { quality: config.vision.jpegQuality });
    images.push(jpegBuf);

    const textContent = await page.getTextContent();
    // Group text items by y-position to preserve line breaks
    let lastY = null;
    const lines = [];
    let currentLine = '';
    for (const item of textContent.items) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(currentLine.trim());
        currentLine = '';
      }
      currentLine += item.str;
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    const pageText = lines.join('\n');
    pageTexts.push(pageText);

    if (i === 1) {
      title = doc.info?.Title || pageText.split('\n').filter(Boolean)[0] || '';
    }
  }

  const text = pageTexts.join('\n---\n');
  return { text, images, title, totalPages: doc.numPages };
}

module.exports = { extract };
