const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function extract(filePath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-extract-'));

  try {
    const scriptPath = path.join(__dirname, '../../pdf-service/extractors/pdf.py');
    const { status, stdout, stderr } = spawnSync('python', [scriptPath, filePath, tempDir], {
      encoding: 'utf-8',
      timeout: 120000,
    });

    if (status !== 0) {
      const err = stderr ? stderr.trim() : 'Unknown error';
      throw new Error(`PDF extraction failed: ${err}`);
    }

    const json = JSON.parse(stdout);

    // Image paths are included in the main JSON output (no separate images.json)
    const imagePaths = json.imagePaths || [];
    const images = imagePaths
      .filter(p => fs.existsSync(p))
      .map(p => fs.readFileSync(p));

    return {
      text: JSON.stringify(json),
      images,
      title: json.title || '',
      totalPages: json.pageCount || 1,
      sections: json.sections || [],
    };
  } finally {
    // Cleanup temp dir
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { extract };
