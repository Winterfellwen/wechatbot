const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
const { createCanvas } = require('canvas');
const config = require('../config');

async function extract(filePath) {
  const doc = await pdfjsLib.getDocument(filePath).promise;
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
    const pageText = textContent.items.map(item => item.str).join(' ');
    pageTexts.push(pageText);

    if (i === 1) {
      title = doc.info?.Title || pageText.split('\n').filter(Boolean)[0] || '';
    }
  }

  const text = pageTexts.join('\n---\n');
  return { text, images, title, totalPages: doc.numPages };
}

module.exports = { extract };
