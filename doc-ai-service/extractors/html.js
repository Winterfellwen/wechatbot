const fs = require('fs');
const cheerio = require('cheerio');

function extract(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(raw);
  $('script, style, nav, footer, header').remove();
  const title = $('title').text() || $('h1').first().text() || '';
  const html = $.html();
  const text = $.root().text().replace(/\s+/g, ' ').trim();
  return { text, html, title };
}

module.exports = { extract };
