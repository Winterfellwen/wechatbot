const mammoth = require('mammoth');
const puppeteer = require('puppeteer');
const config = require('../config');

async function extract(filePath) {
  const mammothResult = await mammoth.convertToHtml({ path: filePath });
  const html = mammothResult.value;
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  const title = $('h1').first().text() || $('title').text() || '';
  const text = $.root().text().replace(/\s+/g, ' ').trim();

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();

  await page.setViewport({
    width: config.vision.viewportWidth,
    height: config.vision.viewportHeight,
  });

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const vh = config.vision.viewportHeight;

  const images = [];
  for (let y = 0; y < totalHeight; y += vh) {
    const clipHeight = Math.min(vh, totalHeight - y);
    const buf = await page.screenshot({
      clip: { x: 0, y, width: config.vision.viewportWidth, height: clipHeight },
      type: 'jpeg',
      quality: config.vision.jpegQuality,
    });
    images.push(buf);
  }

  await browser.close();
  return { text, html, images, title, totalPages: images.length };
}

module.exports = { extract };
