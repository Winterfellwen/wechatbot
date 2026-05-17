const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const doc = {
  sections: [
    { type: 'heading', level: 1, text: 'Test Document' },
    { type: 'paragraph', children: [{ text: 'This is a test paragraph.', bold: false }] },
    { type: 'list', items: ['Item 1', 'Item 2', 'Item 3'], ordered: false }
  ]
};

const tempDir = 'C:\\Users\\winte\\AppData\\Local\\Temp\\opencode';
const jsonPath = path.join(tempDir, 'test-pdf.json');
const imagesDir = path.join(tempDir, 'test-pdf-images');
const outputPath = 'E:\\AI\\doc\\test-output.pdf';

fs.writeFileSync(jsonPath, JSON.stringify(doc));
fs.mkdirSync(imagesDir, { recursive: true });

const scriptPath = path.join(__dirname, 'pdf-service', 'assemblers', 'pdf.py');
execSync(`python "${scriptPath}" "${jsonPath}" "${imagesDir}" "${outputPath}"`, {
  timeout: 120000,
});

console.log('PDF created successfully');

// Cleanup
fs.unlinkSync(jsonPath);
fs.rmSync(imagesDir, { recursive: true, force: true });
