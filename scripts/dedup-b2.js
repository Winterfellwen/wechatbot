const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'german', 'data', 'b2', 'vocab.js');
const content = fs.readFileSync(filePath, 'utf-8');
const match = content.match(/module\.exports\s*=\s*(\[.*?\]);/s);
if (!match) {
  console.log('Could not parse');
  process.exit(1);
}
let vocab = eval(match[1]);
const seen = new Set();
const deduped = [];
vocab.forEach(entry => {
  if (!seen.has(entry.word.toLowerCase())) {
    seen.add(entry.word.toLowerCase());
    deduped.push(entry);
  } else {
    console.log('Duplicate removed:', entry.word);
  }
});
console.log(`Before: ${vocab.length}, After: ${deduped.length}`);

const entries = deduped.map(entry => {
  const fields = [];
  fields.push(`  word: "${entry.word}"`);
  fields.push(`  translation: "${entry.translation}"`);
  fields.push(`  phonetic: "${entry.phonetic}"`);
  if (entry.ipa) fields.push(`  ipa: "${entry.ipa}"`);
  if (entry.gender) fields.push(`  gender: "${entry.gender}"`);
  if (entry.pos) fields.push(`  pos: "${entry.pos}"`);
  if (entry.plural) fields.push(`  plural: "${entry.plural}"`);
  fields.push(`  example: "${entry.example}"`);
  return `  {\n    ${fields.join(',\n    ')}\n  }`;
});

const output = `module.exports = [\n${entries.join(',\n')}\n];\n`;
fs.writeFileSync(filePath, output, 'utf-8');
console.log('Done');
