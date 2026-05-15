const mammoth = require('mammoth');

async function extract(filePath) {
  const result = await mammoth.convertToHtml({ path: filePath });
  const html = result.value;
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  const title = $('h1').first().text() || $('title').text() || '';
  const text = $.root().text().replace(/\s+/g, ' ').trim();
  return { text, html, title };
}

module.exports = { extract };
