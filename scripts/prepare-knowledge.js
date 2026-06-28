const fs = require('fs');
const path = require('path');

const SOURCES_DIR = path.join(__dirname, 'sources');
const WESTERN_DIR = path.join(__dirname, '..', 'fortune', 'data', 'western');
const OUTPUT_DIR = path.join(__dirname, '..', 'fortune', 'data', 'knowledge');

const sourceFiles = [
  { file: 'qiongtong_baojian.json', prefix: 'qt', name: '穷通宝鉴' },
  { file: 'di_tian_sui.json', prefix: 'dts', name: '滴天髓' },
  { file: 'yuanhai_ziping.json', prefix: 'yhz', name: '渊海子平' },
  { file: 'ziping_zhenquan.json', prefix: 'zzq', name: '子平真诠' },
  { file: 'sanming_tonghui.json', prefix: 'smt', name: '三命通会' },
];

const palaceNames = ['命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫', '迁移宫', '交友宫', '官禄宫', '田宅宫', '福德宫', '父母宫'];

const ziweiStars = {
  '紫微': { nature: '帝星，尊贵之星，领导力强，好面子', palaces: ['命宫主贵', '兄弟主孤独', '夫妻主配偶有地位'] },
  '天机': { nature: '智星，聪明善谋，变动之星', palaces: ['命宫主智', '兄弟主手足情深', '夫妻主配偶聪明'] },
  '太阳': { nature: '官禄主星，光明磊落，慷慨大方', palaces: ['命宫主贵', '兄弟主手足相助', '夫妻主配偶阳光'] },
  '武曲': { nature: '财星，刚毅果断，重义气', palaces: ['命宫主财', '兄弟主手足竞争', '夫妻主配偶刚强'] },
  '天同': { nature: '福星，温和仁慈，享福之命', palaces: ['命宫主福', '兄弟主和睦', '夫妻主配偶温和'] },
  '廉贞': { nature: '次桃花星，复杂多变，才华横溢', palaces: ['命宫主桃花', '兄弟主助力', '夫妻主感情复杂'] },
  '天府': { nature: '令星，稳重保守，有领导才能', palaces: ['命宫主富', '兄弟主助力', '夫妻主配偶稳重'] },
  '太阴': { nature: '田宅主星，温柔细腻，有艺术气质', palaces: ['命宫主富', '兄弟主和睦', '夫妻主配偶温柔'] },
  '贪狼': { nature: '桃花星，多才多艺，交际广', palaces: ['命宫主桃花', '兄弟主交际', '夫妻主配偶多才'] },
  '巨门': { nature: '暗星，口才好，思虑深', palaces: ['命宫主口舌', '兄弟主争执', '夫妻主配偶唠叨'] },
  '天相': { nature: '印星，公正温和，有协调能力', palaces: ['命宫主贵', '兄弟主和睦', '夫妻主配偶贤惠'] },
  '天梁': { nature: '荫星，正直有威望，有服务精神', palaces: ['命宫主寿', '兄弟主护佑', '夫妻主配偶年长'] },
  '七杀': { nature: '将星，果断勇敢，有开创精神', palaces: ['命宫主权', '兄弟主竞争', '夫妻主配偶刚烈'] },
  '破军': { nature: '耗星，变动大，敢于破旧立新', palaces: ['命宫主变', '兄弟主消耗', '夫妻主配偶冲动'] },
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getChunkId(prefix, index) {
  return prefix + '_' + String(index).padStart(3, '0');
}

function getEntryText(entry) {
  var excludeKeys = ['category', 'key', 'day_master', 'month_zhi', 'tags', '出处', 'section', 'title', 'summary'];
  var parts = [];
  Object.keys(entry).forEach(function(k) {
    if (excludeKeys.indexOf(k) === -1 && typeof entry[k] === 'string' && entry[k].trim()) {
      parts.push(entry[k]);
    }
  });
  return parts.join(' | ');
}

function getCategoryField(entry) {
  return entry['category'] || entry['section'] || '';
}

function buildSummary(entry, sourceName) {
  const category = getCategoryField(entry);
  const key = entry['key'] || '';
  const dayMaster = entry['day_master'] || '';
  const monthZhi = entry['month_zhi'] || '';
  if (dayMaster && monthZhi && category) {
    return dayMaster + '日' + monthZhi + '月' + category;
  }
  if (category && key) return category + '-' + key;
  if (category) return sourceName + '-' + category;
  if (key) return sourceName + '-' + key;
  return sourceName;
}

function processSourceFile(data, prefix, sourceName) {
  const chunks = [];
  const entries = data['entries'] || {};
  const keys = Object.keys(entries);
  let index = 0;

  for (const entryKey of keys) {
    const entry = entries[entryKey] || {};
    index++;
    const chunkId = getChunkId(prefix, index);
    const text = getEntryText(entry);
    const category = getCategoryField(entry);
    const tags = entry['tags'] || [];
    const dayMaster = entry['day_master'] || '';
    const monthZhi = entry['month_zhi'] || '';

    const tagObj = { type: category };
    if (dayMaster) tagObj['dayMaster'] = dayMaster;
    if (monthZhi) tagObj['month'] = monthZhi;

    chunks.push({
      id: chunkId,
      source: sourceName,
      tags: tagObj,
      text: text,
      summary: buildSummary(entry, sourceName)
    });
  }

  return chunks;
}

function processWesternMd(filePath, fileId) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const chunks = [];
  let currentSection = '';
  let currentText = [];
  let chunkIndex = 0;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection && currentText.length > 0) {
        chunkIndex++;
        const sectionTitle = currentSection.replace(/^##\s+/, '').trim();
        const tags = inferWesternTags(sectionTitle);
        chunks.push({
          id: fileId + '_' + String(chunkIndex).padStart(3, '0'),
          source: path.basename(filePath, '.md'),
          tags: tags,
          text: currentText.join('\n').trim(),
          summary: sectionTitle
        });
      }
      currentSection = line;
      currentText = [];
    } else if (currentSection) {
      currentText.push(line);
    }
  }

  if (currentSection && currentText.length > 0) {
    chunkIndex++;
    const sectionTitle = currentSection.replace(/^##\s+/, '').trim();
    const tags = inferWesternTags(sectionTitle);
    chunks.push({
      id: fileId + '_' + String(chunkIndex).padStart(3, '0'),
      source: path.basename(filePath, '.md'),
      tags: tags,
      text: currentText.join('\n').trim(),
      summary: sectionTitle
    });
  }

  return chunks;
}

function inferWesternTags(title) {
  const tags = {};
  const elementMap = {
    '火象': 'fire', '土象': 'earth', '风象': 'air', '水象': 'water',
  };
  const planetMap = {
    '太阳': 'sun', '月亮': 'moon', '水星': 'mercury', '金星': 'venus',
    '火星': 'mars', '木星': 'jupiter', '土星': 'saturn',
    '天王星': 'uranus', '海王星': 'neptune', '冥王星': 'pluto',
  };
  const signs = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];

  for (const sign of signs) {
    if (title.includes(sign)) {
      tags['sign'] = sign + '座';
      break;
    }
  }

  for (const [cn, en] of Object.entries(elementMap)) {
    if (title.includes(cn)) {
      tags['element'] = en;
      break;
    }
  }

  for (const [cn, en] of Object.entries(planetMap)) {
    if (title.includes(cn)) {
      tags['planet'] = en;
      break;
    }
  }

  return tags;
}

function processZiweiStars() {
  const chunks = [];
  let index = 0;

  for (const [starName, starData] of Object.entries(ziweiStars)) {
    index++;
    chunks.push({
      id: 'zw_' + String(index).padStart(3, '0'),
      source: '紫微斗数',
      tags: { type: '星曜', star: starName },
      text: starData.nature,
      summary: starName + '星性'
    });

    for (let pi = 0; pi < starData.palaces.length; pi++) {
      index++;
      const palaceName = palaceNames[pi] || palaceNames[Math.min(pi, palaceNames.length - 1)];
      chunks.push({
        id: 'zw_' + String(index).padStart(3, '0'),
        source: '紫微斗数',
        tags: { type: '星曜', star: starName, palace: palaceName },
        text: starName + '在' + palaceName + '：' + starData.palaces[pi],
        summary: starName + '在' + palaceName
      });
    }
  }

  return chunks;
}

function buildChineseIndex(chunks) {
  const index = {};

  for (const chunk of chunks) {
    const tagObj = chunk.tags || {};

    if (tagObj['dayMaster']) {
      const dm = tagObj['dayMaster'];
      if (!index[dm]) index[dm] = [];
      if (index[dm].indexOf(chunk.id) === -1) index[dm].push(chunk.id);
    }

    if (tagObj['month']) {
      const month = tagObj['month'];
      if (!index[month]) index[month] = [];
      if (index[month].indexOf(chunk.id) === -1) index[month].push(chunk.id);
    }

    if (tagObj['type']) {
      const typeKey = 'type:' + tagObj['type'];
      if (!index[typeKey]) index[typeKey] = [];
      if (index[typeKey].indexOf(chunk.id) === -1) index[typeKey].push(chunk.id);
    }

    if (tagObj['star']) {
      const starKey = 'star:' + tagObj['star'];
      if (!index[starKey]) index[starKey] = [];
      if (index[starKey].indexOf(chunk.id) === -1) index[starKey].push(chunk.id);
    }

    if (tagObj['palace']) {
      const palaceKey = 'palace:' + tagObj['palace'];
      if (!index[palaceKey]) index[palaceKey] = [];
      if (index[palaceKey].indexOf(chunk.id) === -1) index[palaceKey].push(chunk.id);
    }
  }

  return index;
}

function buildWesternIndex(chunks) {
  const index = {};

  for (const chunk of chunks) {
    const tags = chunk.tags || {};

    if (tags['sign']) {
      if (!index[tags['sign']]) index[tags['sign']] = [];
      if (index[tags['sign']].indexOf(chunk.id) === -1) index[tags['sign']].push(chunk.id);
    }
    if (tags['element']) {
      const key = 'element:' + tags['element'];
      if (!index[key]) index[key] = [];
      if (index[key].indexOf(chunk.id) === -1) index[key].push(chunk.id);
    }
    if (tags['planet']) {
      const key = 'planet:' + tags['planet'];
      if (!index[key]) index[key] = [];
      if (index[key].indexOf(chunk.id) === -1) index[key].push(chunk.id);
    }
  }

  return index;
}

function buildTiaohou(chunks) {
  const lookup = {};
  for (const chunk of chunks) {
    const tags = chunk.tags || {};
    if (tags['type'] === '调候用神' && tags['dayMaster'] && tags['month']) {
      const key = tags['dayMaster'] + '_' + tags['month'];
      if (!lookup[key]) {
        lookup[key] = chunk.text;
      }
    }
  }
  return lookup;
}

function getDirSizeKB(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      total += getDirSizeKB(fullPath);
    } else if (item.isFile()) {
      total += fs.statSync(fullPath).size;
    }
  }
  return Math.round(total / 1024);
}

function main() {
  console.log('Starting knowledge preparation...\n');

  ensureDir(path.join(OUTPUT_DIR, 'chunks'));
  ensureDir(path.join(OUTPUT_DIR, 'structured'));

  const allChunks = [];
  let chunkCounter = 0;

  for (const sf of sourceFiles) {
    const filePath = path.join(SOURCES_DIR, sf.file);
    if (!fs.existsSync(filePath)) {
      console.log('Warning: Source file ' + sf.file + ' not found, skipping');
      continue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const chunks = processSourceFile(data, sf.prefix, sf.name);
    chunkCounter += chunks.length;
    allChunks.push(...chunks);
    console.log('  ' + sf.name + ': ' + chunks.length + ' chunks');
  }

  const ziweiChunks = processZiweiStars();
  chunkCounter += ziweiChunks.length;
  allChunks.push(...ziweiChunks);
  console.log('  紫微斗数: ' + ziweiChunks.length + ' chunks');

  const westernFiles = [
    { file: 'astrology.md', id: 'ast' },
    { file: 'constellation.md', id: 'con' },
    { file: 'greek_myth.md', id: 'grm' },
  ];

  const westernChunks = [];
  for (const wf of westernFiles) {
    const filePath = path.join(WESTERN_DIR, wf.file);
    if (!fs.existsSync(filePath)) {
      console.log('Warning: Western file ' + wf.file + ' not found, skipping');
      continue;
    }
    const chunks = processWesternMd(filePath, wf.id);
    westernChunks.push(...chunks);
    chunkCounter += chunks.length;
    allChunks.push(...chunks);
    console.log('  western/' + wf.file + ': ' + chunks.length + ' chunks');
  }

  const chineseChunks = allChunks.filter(c => c.source !== 'astrology' && c.source !== 'constellation' && c.source !== 'greek_myth');
  const chineseIndex = buildChineseIndex(chineseChunks);
  const westernIndex = buildWesternIndex(westernChunks);
  const tiaohou = buildTiaohou(allChunks);

  const allJson = JSON.stringify(allChunks, null, 2);
  const chineseIndexJson = JSON.stringify(chineseIndex, null, 2);
  const westernIndexJson = JSON.stringify(westernIndex, null, 2);
  const tiaohouJson = JSON.stringify(tiaohou, null, 2);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'chunks', 'all.json'), allJson, 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'chinese-index.json'), chineseIndexJson, 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'western-index.json'), westernIndexJson, 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'structured', 'tiaohou.json'), tiaohouJson, 'utf-8');

  const totalBytes = Buffer.byteLength(allJson, 'utf-8') + Buffer.byteLength(chineseIndexJson, 'utf-8') + Buffer.byteLength(westernIndexJson, 'utf-8') + Buffer.byteLength(tiaohouJson, 'utf-8');
  const totalKB = Math.round(totalBytes / 1024);
  const fortuneDirKB = getDirSizeKB(path.join(__dirname, '..', 'fortune'));
  const underLimit = totalKB < 2048;

  console.log('\n--- Summary ---');
  console.log('Total chunks: ' + allChunks.length);
  console.log('Chinese index keys: ' + Object.keys(chineseIndex).length);
  console.log('Western index keys: ' + Object.keys(westernIndex).length);
  console.log('Knowledge data size: ' + totalKB + ' KB');
  console.log('fortune/ directory size: ' + fortuneDirKB + ' KB');
  console.log('Under 2MB limit: ' + (underLimit ? 'YES' : 'NO'));

  // Convert JSON to JS modules for WeChat Mini Program compatibility
  console.log('\nConverting JSON to JS modules...');
  var jsonFiles = [
    'chinese-index.json',
    'western-index.json',
    'chunks/all.json',
    'structured/tiaohou.json'
  ];
  jsonFiles.forEach(function(relPath) {
    var fp = path.join(OUTPUT_DIR, relPath);
    if (!fs.existsSync(fp)) return;
    var content = fs.readFileSync(fp, 'utf8');
    var jsPath = fp.replace(/\.json$/, '.js');
    fs.writeFileSync(jsPath, 'module.exports = ' + content + ';\n', 'utf8');
    console.log('  JS: ' + path.relative(OUTPUT_DIR, jsPath));
  });
}

main();
