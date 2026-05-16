const fs = require('fs');
const AdmZip = require('adm-zip');

/**
 * Post-process DOCX to deduplicate media files
 * html-to-docx creates duplicate image files with different names
 * This function removes duplicates and updates relationships
 */
function deduplicateDocxImages(docxPath) {
  const zip = new AdmZip(docxPath);
  const entries = zip.getEntries();
  
  // Find media files and group by content hash
  const mediaMap = new Map(); // hash -> { name, data, refs: [] }
  const mediaEntries = [];
  
  for (const entry of entries) {
    const name = entry.entryName;
    if (name.startsWith('word/media/') && !entry.isDirectory && entry.getData().length > 100) {
      const data = entry.getData();
      const hash = hashBuffer(data);
      
      if (!mediaMap.has(hash)) {
        mediaMap.set(hash, { name, data, refs: [] });
      }
      mediaEntries.push({ name, hash });
    }
  }
  
  // If no duplicates, return early
  if (mediaEntries.length === mediaMap.size) {
    return;
  }
  
  // Build mapping: duplicate name -> canonical name
  const canonicalNames = {};
  const toRemove = new Set();
  
  for (const [hash, info] of mediaMap) {
    const canonicalName = info.name;
    for (const entry of mediaEntries) {
      if (entry.hash === hash && entry.name !== canonicalName) {
        canonicalNames[entry.name] = canonicalName;
        toRemove.add(entry.name);
      }
    }
  }
  
  // Update document.xml.rels to point to canonical names
  const relsEntry = zip.getEntry('word/_rels/document.xml.rels');
  if (relsEntry) {
    let relsXml = relsEntry.getData().toString('utf8');
    for (const [dupName, canonicalName] of Object.entries(canonicalNames)) {
      const dupBase = path.basename(dupName);
      const canonicalBase = path.basename(canonicalName);
      const escapedDup = dupBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      relsXml = relsXml.replace(new RegExp(`Target="media/${escapedDup}"`, 'g'), `Target="media/${canonicalBase}"`);
    }
    zip.updateFile('word/_rels/document.xml.rels', Buffer.from(relsXml, 'utf8'));
  }
  
  // Remove duplicate entries
  for (const name of toRemove) {
    zip.deleteFile(name);
  }
  
  // Save
  zip.writeZip(docxPath);
}

function hashBuffer(buf) {
  // Simple hash for deduplication
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < buf.length; i++) {
    h1 = 31 * h1 ^ buf[i];
    h2 = 31 * h2 ^ buf[i];
  }
  return h1.toString(36) + h2.toString(36);
}

const path = require('path');

// Test
if (require.main === module) {
  const docxPath = process.argv[2];
  if (!docxPath) {
    console.error('Usage: node deduplicate-docx.js <path.docx>');
    process.exit(1);
  }
  
  const fs = require('fs');
  const before = fs.statSync(docxPath).size;
  deduplicateDocxImages(docxPath);
  const after = fs.statSync(docxPath).size;
  console.log(`DOCX deduplicated: ${before} -> ${after} bytes (${Math.round((1 - after/before) * 100)}% reduction)`);
}

module.exports = { deduplicateDocxImages };
