const pdfParse = require('pdf-parse');

async function extract(filePath) {
  const buf = require('fs').readFileSync(filePath);
  const data = await pdfParse(buf);
  return {
    text: data.text,
    title: '',
    metadata: { pages: data.numpages },
  };
}

module.exports = { extract };
