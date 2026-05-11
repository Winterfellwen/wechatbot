const fs = require('fs');
const path = require('path');

// 从add-german-grammar.js复制过来的getIPA和knownIPA
const knownIPA = {
  'hallo': '[ˈhalo]', 'Guten Tag': '[ˈɡuːtn̩ taːk]', 'Tschüss': '[t͡ʃʏs]',
  'ja': '[jaː]', 'nein': '[naɪn]', 'danke': '[ˈdaŋkə]', 'Bitte': '[ˈbɪtə]',
  'Entschuldigung': '[ɛntˈʃʊldɪɡʊŋ]', 'Ich': '[ɪç]', 'du': '[duː]', 'er': '[eːɐ]',
  'sie': '[ziː]', 'es': '[ɛs]', 'wir': '[viːɐ]', 'ihr': '[iːɐ]',
  'Sie': '[ziː]', 'guten Morgen': '[ˈɡuːtn̩ ˈmɔʁɡn̩]', 'gute Nacht': '[ˈɡuːtə naχt]',
  'Auf Wiedersehen': '[aʊf ˈviːdɐzeːən]', 'Bis bald': '[bɪs ˈbalt]',
  'Wie heißt du': '[viː haɪst duː]', 'Wie geht es dir': '[viː ɡeːt ɛs diːɐ]',
  'Mir geht es gut': '[miːɐ ɡeːt ɛs ɡuːt]', 'Mir geht es nicht gut': '[miːɐ ɡeːt ɛs nɪçt ɡuːt]',
  'Woher kommst du': '[voˈheːɐ ˈkɔmst duː]', 'Ich komme aus China': '[ɪç ˈkɔmə aʊs ˈçiːna]',
  'Wie alt bist du': '[viː ˈalt bɪst duː]', 'Ich bin 25 Jahre alt': '[ɪç bɪn ˈfʏnf ʊnt ˈtsvantsɪç ˈjaːɐ ˈalt]',
};

function getIPA(word) {
  if (knownIPA[word]) {
    return knownIPA[word];
  }
  let ipa = word.toLowerCase()
    .replace(/sch/g, 'ʃ')
    .replace(/ch/g, 'ç')
    .replace(/ng/g, 'ŋ')
    .replace(/nk/g, 'ŋk')
    .replace(/ie/g, 'iː')
    .replace(/ei/g, 'aɪ')
    .replace(/eu/g, 'ɔɪ')
    .replace(/äu/g, 'ɔɪ')
    .replace(/au/g, 'aʊ')
    .replace(/ä/g, 'ɛː')
    .replace(/ö/g, 'øː')
    .replace(/ü/g, 'yː')
    .replace(/ß/g, 's')
    .replace(/st/g, 'ʃt')
    .replace(/sp/g, 'ʃp')
    .replace(/th/g, 't')
    .replace(/ph/g, 'f')
    .replace(/qu/g, 'kv')
    .replace(/x/g, 'ks')
    .replace(/z/g, 't͡s')
    .replace(/v/g, 'f')
    .replace(/w/g, 'v')
    .replace(/j/g, 'j')
    .replace(/c([^h]|$)/g, 'k$1')
    .replace(/y/g, 'ʏ')
    .replace(/r/g, 'ʁ')
    .replace(/g/g, 'ɡ')
    .replace(/s(?=[aeiouäöüy])/g, 'z')
    .replace(/e(?![iː])/g, 'ɛ')
    .replace(/o(?![ːu])/g, 'ɔ')
    .replace(/u(?![ː])/g, 'ʊ')
    .replace(/i(?![ː])/g, 'ɪ')
    .replace(/a(?![ːu])/g, 'a');
  const syllables = ipa.split(/[aɛiouɔyøɪʊəɐː]/).filter(Boolean);
  if (syllables.length >= 2) {
    ipa = 'ˈ' + ipa;
  }
  return '[' + ipa + ']';
}

const files = [
  path.join(__dirname, '..', 'german', 'data', 'a1', 'vocab.js'),
  path.join(__dirname, '..', 'german', 'data', 'a2', 'vocab.js'),
  path.join(__dirname, '..', 'german', 'data', 'b1', 'vocab.js'),
  path.join(__dirname, '..', 'german', 'data', 'b2', 'vocab.js'),
];

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/module\.exports\s*=\s*(\[.*?\]);/s);
  if (!match) return;
  let vocab = eval(match[1]);
  let fixedCount = 0;
  
  vocab = vocab.map(entry => {
    const w = entry.word.toLowerCase();
    // 如果IPA明显包含原始单词（长度超过2且ipa包含word），则重新生成
    if (entry.ipa && w.length > 2 && entry.ipa.toLowerCase().includes(w)) {
      const newIpa = getIPA(entry.word);
      if (newIpa.toLowerCase() !== entry.ipa.toLowerCase()) {
        console.log(`Fixing ${path.basename(path.dirname(filePath))}/${path.basename(filePath)}: ${entry.word} ${entry.ipa} -> ${newIpa}`);
        entry.ipa = newIpa;
        fixedCount++;
      }
    }
    return entry;
  });
  
  if (fixedCount > 0) {
    const entries = vocab.map(entry => {
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
    console.log(`  Fixed ${fixedCount} entries in ${filePath}`);
  }
});
