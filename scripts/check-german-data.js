const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'german', 'data');
const levels = ['a1', 'a2', 'b1', 'b2'];

levels.forEach(level => {
  const filePath = path.join(baseDir, level, 'vocab.js');
  if (!fs.existsSync(filePath)) {
    console.log(`${level.toUpperCase()}: FILE MISSING`);
    return;
  }
  delete require.cache[require.resolve(filePath)];
  const vocab = require(filePath);
  console.log(`\n${level.toUpperCase()} - Total: ${vocab.length}`);

  const missingGender = vocab.filter(e => !e.gender);
  const missingIpa = vocab.filter(e => !e.ipa);
  const wrongSchaft = vocab.filter(e => e.word.toLowerCase().endsWith('schaft') && e.gender && e.gender !== 'f');
  const wrongHeit = vocab.filter(e => e.word.toLowerCase().endsWith('heit') && e.gender && e.gender !== 'f');
  const wrongKeit = vocab.filter(e => e.word.toLowerCase().endsWith('keit') && e.gender && e.gender !== 'f');
  const wrongUng = vocab.filter(e => e.word.toLowerCase().endsWith('ung') && e.gender && e.gender !== 'f');
  const wrongChen = vocab.filter(e => e.word.toLowerCase().endsWith('chen') && e.gender && e.gender !== 'n');
  const badIpa = vocab.filter(e => e.ipa && e.ipa.includes(e.word.toLowerCase()));

  if (missingGender.length) console.log(`  Missing gender: ${missingGender.length}`);
  if (missingIpa.length) console.log(`  Missing IPA: ${missingIpa.length}`);
  if (wrongSchaft.length) console.log(`  Wrong -schaft gender: ${wrongSchaft.map(e => e.word).join(', ')}`);
  if (wrongHeit.length) console.log(`  Wrong -heit gender: ${wrongHeit.map(e => e.word).join(', ')}`);
  if (wrongKeit.length) console.log(`  Wrong -keit gender: ${wrongKeit.map(e => e.word).join(', ')}`);
  if (wrongUng.length) console.log(`  Wrong -ung gender: ${wrongUng.map(e => e.word).join(', ')}`);
  if (wrongChen.length) console.log(`  Wrong -chen gender: ${wrongChen.map(e => e.word).join(', ')}`);
  if (badIpa.length) console.log(`  Bad IPA (contains word): ${badIpa.slice(0,5).map(e => e.word).join(', ')}`);
});
