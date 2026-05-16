const { createCanvas, loadImage } = require('canvas');

async function tileImages(images, { cols = 2, maxPagesPerTile = 4, pageW = 900, pageH = 1200, jpegQuality = 80 } = {}) {
  const groups = [];

  for (let i = 0; i < images.length; i += maxPagesPerTile) {
    const batch = images.slice(i, i + maxPagesPerTile);
    const rows = Math.ceil(batch.length / cols);
    const canvas = createCanvas(pageW * cols, pageH * rows);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let idx = 0; idx < batch.length; idx++) {
      const img = await loadImage(batch[idx]);
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      ctx.drawImage(img, col * pageW, row * pageH, pageW, pageH);
    }

    const start = i + 1;
    const end = Math.min(i + maxPagesPerTile, images.length);
    groups.push({
      buffer: canvas.toBuffer('image/jpeg', { quality: jpegQuality }),
      pages: `${start}-${end}`,
    });
  }

  return groups;
}

module.exports = { tileImages };
