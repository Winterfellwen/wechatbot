const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function extract(filePath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-extract-'));
  
  try {
    const scriptPath = path.join(__dirname, '../../pdf-service/extractors/pdf.py');
    const result = execSync(`python "${scriptPath}" "${filePath}" "${tempDir}"`, {
      encoding: 'utf-8',
      timeout: 120000,
    });
    
    const json = JSON.parse(result);
    
    // Load images
    const imageListPath = path.join(tempDir, 'images.json');
    const imagePaths = fs.existsSync(imageListPath)
      ? JSON.parse(fs.readFileSync(imageListPath, 'utf-8'))
      : [];
    
    const images = imagePaths
      .filter(p => fs.existsSync(p))
      .map(p => fs.readFileSync(p));
    
    return {
      text: JSON.stringify(json),
      images,
      title: json.title || '',
      totalPages: 1,
      sections: json.sections || [],
    };
  } finally {
    // Cleanup temp dir
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { extract };
