# Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject classical Chinese/Western astrology knowledge into AI readings by adding local JSON knowledge chunks + index lookups + prompt injection.

**Architecture:** A Node.js preprocessing script converts 5 FOR-BAZI JSONs + existing MD files into tagged chunks (~500-600KB total). A runtime service (`knowledge-service.js`) reads a flat index (chinese-index.json/western-index.json) at match time, does key intersection to find relevant chunk IDs, loads only matched chunks, and returns them for prompt injection. Tarot upgraded from 1-card to 3-card spread with positional meanings.

**Tech Stack:** Node.js v24 (preprocessing), vanilla JS (WeChat Mini Program runtime)

---

### Task 1: Download FOR-BAZI classical text source files

**Files:**
- Create: `scripts/sources/` (directory)
- Fetch: 5 JSON files from `gaaiyun/FOR-BAZI` GitHub repo

- [ ] **Step 1: Create source directory**

```bash
New-Item -ItemType Directory -Path "scripts/sources" -Force
```

- [ ] **Step 2: Download 穷通宝鉴 (120 entries, tiaohou/yongshen)**

```bash
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/gaaiyun/FOR-BAZI/main/data/classical_texts/qiongtong_baojian.json" -OutFile "scripts/sources/qiongtong_baojian.json"
```

- [ ] **Step 3: Download 滴天髓 (principles/judgment rules)**

```bash
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/gaaiyun/FOR-BAZI/main/data/classical_texts/di_tian_sui.json" -OutFile "scripts/sources/di_tian_sui.json"
```

- [ ] **Step 4: Download 渊海子平 (comprehensive bazi treatise)**

```bash
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/gaaiyun/FOR-BAZI/main/data/classical_texts/yuanhai_ziping.json" -OutFile "scripts/sources/yuanhai_ziping.json"
```

- [ ] **Step 5: Download 子平真诠 (pattern/judgment methodology)**

```bash
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/gaaiyun/FOR-BAZI/main/data/classical_texts/ziping_zhenquan.json" -OutFile "scripts/sources/ziping_zhenquan.json"
```

- [ ] **Step 6: Download 三命通会 (shensha/relationships)**

```bash
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/gaaiyun/FOR-BAZI/main/data/classical_texts/sanming_tonghui.json" -OutFile "scripts/sources/sanming_tonghui.json"
```

- [ ] **Step 7: Verify all files downloaded**

```bash
Get-ChildItem "scripts/sources/*.json" | ForEach-Object { Write-Host "$($_.Name) - $($_.Length) bytes" }
```

Expected:
```
qiongtong_baojian.json - ~30000 bytes
di_tian_sui.json - ~6000 bytes
yuanhai_ziping.json - ~120000 bytes
ziping_zhenquan.json - ~7000 bytes
sanming_tonghui.json - ~6000 bytes
```

---

### Task 2: Build knowledge extraction preprocessing script

**Files:**
- Create: `scripts/prepare-knowledge.js`
- Output: `fortune/data/knowledge/chunks/*.json`, `fortune/data/knowledge/chinese-index.json`, `fortune/data/knowledge/western-index.json`

This single Node.js script handles all 5 FOR-BAZI JSONs + existing MD files + the 紫微 star data embedded inline. It generates the chunk files and index in one pass.

- [ ] **Step 1: Create the script**

```javascript
// scripts/prepare-knowledge.js
var fs = require('fs');
var path = require('path');

var SOURCES_DIR = path.join(__dirname, 'sources');
var OUTPUT_DIR = path.join(__dirname, '..', 'fortune', 'data', 'knowledge');
var CHUNKS_DIR = path.join(OUTPUT_DIR, 'chunks');

// Ensure output directories
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });

// ---- Helpers ----
function loadJSON(name) {
  var p = path.join(SOURCES_DIR, name);
  if (!fs.existsSync(p)) { console.log('  SKIP: ' + name + ' not found'); return null; }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJSON(dir, name, data) {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 0), 'utf8');
  console.log('  WROTE: ' + name + ' (' + JSON.stringify(data).length + ' bytes)');
}

var allChunks = [];
var chineseIndex = {};

function addChunk(id, source, tags, text, summary) {
  var chunk = { id: id, source: source, tags: tags, text: text, summary: summary || '' };
  allChunks.push(chunk);
  // Index: for each tag value, add chunk id
  Object.keys(tags).forEach(function(key) {
    var val = tags[key];
    if (!val) return;
    var idxKey = val;
    if (!chineseIndex[idxKey]) chineseIndex[idxKey] = [];
    if (chineseIndex[idxKey].indexOf(id) === -1) chineseIndex[idxKey].push(id);
    // Also index by category
    if (key === 'type') {
      var catKey = 'type:' + val;
      if (!chineseIndex[catKey]) chineseIndex[catKey] = [];
      if (chineseIndex[catKey].indexOf(id) === -1) chineseIndex[catKey].push(id);
    }
  });
}

// ---- Process 穷通宝鉴 ----
function processQiongtong() {
  console.log('\nProcessing 穷通宝鉴...');
  var data = loadJSON('qiongtong_baojian.json');
  if (!data || !data.entries) return;
  var source = data.source || '穷通宝鉴';
  var entries = data.entries;
  Object.keys(entries).forEach(function(key, i) {
    var entry = entries[key];
    var id = 'qt_' + String(i + 1).padStart(3, '0');
    addChunk(
      id, source,
      { dayMaster: entry.day_master, month: entry.month_zhi, type: entry.category },
      entry['原文'] || '',
      entry.day_master + '日' + entry.month_zhi + '月调候用神'
    );
  });
  console.log('  Total: ' + Object.keys(entries).length + ' entries');
}

// ---- Process 滴天髓 ----
function processDitiansui() {
  console.log('\nProcessing 滴天髓...');
  var data = loadJSON('di_tian_sui.json');
  if (!data || !data.entries) return;
  var source = data.source || '滴天髓';
  var entries = data.entries;
  Object.keys(entries).forEach(function(key, i) {
    var entry = entries[key];
    var id = 'dts_' + String(i + 1).padStart(3, '0');
    addChunk(
      id, source,
      { dayMaster: entry.day_master || '', month: entry.month_zhi || '', type: entry.category || entry.section || '' },
      entry['原文'] || entry.content || '',
      entry.summary || entry.title || ''
    );
  });
  console.log('  Total: ' + Object.keys(entries).length + ' entries');
}

// ---- Process 渊海子平 ----
function processYuanhai() {
  console.log('\nProcessing 渊海子平...');
  var data = loadJSON('yuanhai_ziping.json');
  if (!data || !data.entries) return;
  var source = data.source || '渊海子平';
  var entries = data.entries;
  Object.keys(entries).forEach(function(key, i) {
    var entry = entries[key];
    var id = 'yh_' + String(i + 1).padStart(3, '0');
    addChunk(
      id, source,
      { dayMaster: entry.day_master || '', month: entry.month_zhi || '', type: entry.category || entry.section || '', tags: (entry.tags || []).join(',') },
      entry['原文'] || entry.content || '',
      entry.title || entry.summary || ''
    );
  });
  console.log('  Total: ' + Object.keys(entries).length + ' entries');
}

// ---- Process 子平真诠 ----
function processZiping() {
  console.log('\nProcessing 子平真诠...');
  var data = loadJSON('ziping_zhenquan.json');
  if (!data || !data.entries) return;
  var source = data.source || '子平真诠';
  var entries = data.entries;
  Object.keys(entries).forEach(function(key, i) {
    var entry = entries[key];
    var id = 'zp_' + String(i + 1).padStart(3, '0');
    addChunk(
      id, source,
      { dayMaster: entry.day_master || '', month: entry.month_zhi || '', type: entry.category || '' },
      entry['原文'] || entry.content || '',
      entry.title || entry.summary || ''
    );
  });
  console.log('  Total: ' + Object.keys(entries).length + ' entries');
}

// ---- Process 三命通会 ----
function processSanming() {
  console.log('\nProcessing 三命通会...');
  var data = loadJSON('sanming_tonghui.json');
  if (!data || !data.entries) return;
  var source = data.source || '三命通会';
  var entries = data.entries;
  Object.keys(entries).forEach(function(key, i) {
    var entry = entries[key];
    var id = 'sm_' + String(i + 1).padStart(3, '0');
    addChunk(
      id, source,
      { dayMaster: entry.day_master || '', month: entry.month_zhi || '', type: entry.category || '', shensha: (entry.shensha || entry.tags || []).join(',') },
      entry['原文'] || entry.content || '',
      entry.title || entry.summary || ''
    );
  });
  console.log('  Total: ' + Object.keys(entries).length + ' entries');
}

// ---- Process Western MD files (ShipBreaker + existing) ----
function processWestern() {
  console.log('\nProcessing Western references...');
  var westernDir = path.join(__dirname, '..', 'fortune', 'data', 'western');
  var westernIndex = {};

  var mdFiles = ['astrology.md', 'constellation.md', 'greek_myth.md'];
  mdFiles.forEach(function(fname) {
    var fp = path.join(westernDir, fname);
    if (!fs.existsSync(fp)) { console.log('  SKIP: ' + fname + ' not found'); return; }
    var content = fs.readFileSync(fp, 'utf8');
    // Split by ## sections
    var sections = content.split(/(?=^## )/m);
    sections.forEach(function(sec, i) {
      if (!sec.trim()) return;
      var lines = sec.trim().split('\n');
      var title = lines[0].replace(/^##\s*/, '').trim();
      var body = lines.slice(1).join('\n').trim();
      if (!body) return;
      var id = 'western_' + fname.replace('.md', '') + '_' + String(i + 1).padStart(2, '0');
      // Determine sign/element tags from title
      var signMap = { '白羊': 'Aries', '金牛': 'Taurus', '双子': 'Gemini', '巨蟹': 'Cancer', '狮子': 'Leo', '处女': 'Virgo', '天秤': 'Libra', '天蝎': 'Scorpio', '射手': 'Sagittarius', '摩羯': 'Capricorn', '水瓶': 'Aquarius', '双鱼': 'Pisces' };
      var elementMap = { '火象': 'Fire', '土象': 'Earth', '风象': 'Air', '水象': 'Water' };
      var planetMap = { '太阳': 'Sun', '月亮': 'Moon', '水星': 'Mercury', '金星': 'Venus', '火星': 'Mars', '木星': 'Jupiter', '土星': 'Saturn' };
      var tags = {};
      Object.keys(signMap).forEach(function(k) { if (title.indexOf(k) !== -1) tags.sign = signMap[k]; });
      Object.keys(elementMap).forEach(function(k) { if (title.indexOf(k) !== -1) tags.element = elementMap[k]; });
      Object.keys(planetMap).forEach(function(k) { if (title.indexOf(k) !== -1) tags.planet = planetMap[k]; });
      tags.source = fname;
      allChunks.push({ id: id, source: fname.replace('.md', ''), tags: tags, text: body, summary: title });
      // Build western index
      Object.keys(tags).forEach(function(key) {
        var val = tags[key];
        if (!val || key === 'source') return;
        if (!westernIndex[val]) westernIndex[val] = [];
        if (westernIndex[val].indexOf(id) === -1) westernIndex[val].push(id);
      });
    });
  });
  console.log('  Total western chunks: ' + mdFiles.length + ' files processed');
  return westernIndex;
}

// ---- Process 紫微 star data (embedded inline) ----
function processZiwei() {
  console.log('\nProcessing 紫微 data...');
  // Key star interpretations (14主星)
  var ziweiStars = {
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
    '破军': { nature: '耗星，变动大，敢于破旧立新', palaces: ['命宫主变', '兄弟主消耗', '夫妻主配偶冲动'] }
  };

  Object.keys(ziweiStars).forEach(function(starName, i) {
    var entry = ziweiStars[starName];
    var id = 'zw_star_' + String(i + 1).padStart(2, '0');
    addChunk(id, '紫微斗数', { star: starName, type: '主星' }, entry.nature, starName + '主星特质');
    // Palace-specific chunks
    entry.palaces.forEach(function(palace, j) {
      var pid = 'zw_star_' + String(i + 1).padStart(2, '0') + '_p' + (j + 1);
      var palaceNames = ['命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫', '迁移宫', '交友宫', '官禄宫', '田宅宫', '福德宫', '父母宫'];
      var pName = palaceNames[j] || '宫位' + (j + 1);
      addChunk(pid, '紫微斗数', { star: starName, palace: pName, type: '星宫组合' }, starName + '在' + pName + '：' + palace, starName + '在' + pName);
    });
  });
  console.log('  Total: ' + Object.keys(ziweiStars).length + ' stars');
}

// ---- Build structured data files ----
function buildStructuredData() {
  console.log('\nBuilding structured data...');

  // 穷通调候表 (dayMaster × month lookup)
  var tiaohou = {};
  var qiongData = loadJSON('qiongtong_baojian.json');
  if (qiongData && qiongData.entries) {
    Object.keys(qiongData.entries).forEach(function(key) {
      var e = qiongData.entries[key];
      var rowKey = e.day_master + '_' + e.month_zhi;
      tiaohou[rowKey] = e['原文'] || '';
    });
  }
  writeJSON(path.join(OUTPUT_DIR, 'structured'), 'tiaohou.json', tiaohou);
}

// ---- Main ----
console.log('=== Knowledge Base Preparation ===');
processQiongtong();
processDitiansui();
processYuanhai();
processZiping();
processSanming();
processZiwei();
var westernIdx = processWestern();

// Write all chunks as a single file (small enough, ~400KB)
writeJSON(CHUNKS_DIR, 'all.json', allChunks);
console.log('\nTotal chunks: ' + allChunks.length);

// Write chinese-index.json
writeJSON(OUTPUT_DIR, 'chinese-index.json', chineseIndex);

// Write western-index.json
writeJSON(OUTPUT_DIR, 'western-index.json', westernIdx || {});

buildStructuredData();

// Summary
var totalBytes = JSON.stringify(allChunks).length;
console.log('\n=== Summary ===');
console.log('Chunks: ' + allChunks.length);
console.log('Chinese index keys: ' + Object.keys(chineseIndex).length);
console.log('Western index keys: ' + Object.keys(westernIdx || {}).length);
console.log('Total data size: ~' + Math.round(totalBytes / 1024) + 'KB');
// Verify total fortune subpackage size
var fortuneDir = path.join(__dirname, '..', 'fortune');
function dirSize(dir) {
  var total = 0;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function(dirent) {
    var fp = path.join(dir, dirent.name);
    if (dirent.isDirectory()) total += dirSize(fp);
    else total += fs.statSync(fp).size;
  });
  return total;
}
var fortuneBytes = dirSize(fortuneDir);
console.log('fortune/ total size: ~' + Math.round(fortuneBytes / 1024) + 'KB');
console.log('Under 2MB limit: ' + (fortuneBytes < 2 * 1024 * 1024 ? 'YES' : 'NO - TOO LARGE!'));
```

- [ ] **Step 2: Run the preprocessing script**

```bash
node scripts/prepare-knowledge.js
```

Expected output:
```
=== Knowledge Base Preparation ===

Processing 穷通宝鉴...
  Total: 120 entries
Processing 滴天髓...
  ...
Processing 渊海子平...
  ...
Processing 子平真诠...
  ...
Processing 三命通会...
  ...
Processing 紫微 data...
  Total: 14 stars
Processing Western references...
  ...

WROTE: all.json (... bytes)
WROTE: chinese-index.json (... bytes)
WROTE: western-index.json (... bytes)

=== Summary ===
Chunks: ...
Chinese index keys: ...
Western index keys: ...
Total data size: ~...KB
fortune/ total size: ~...KB
Under 2MB limit: YES
```

- [ ] **Step 3: Verify output structure**

```bash
Get-ChildItem -Recurse "fortune/data/knowledge/" | ForEach-Object { Write-Host $_.FullName.Replace($pwd.Path + '\', '') + " - " + $_.Length + " bytes" }
```

Expected files:
```
fortune/data/knowledge/chinese-index.json
fortune/data/knowledge/western-index.json
fortune/data/knowledge/chunks/all.json
fortune/data/knowledge/structured/tiaohou.json
```

---

### Task 3: Create knowledge-service.js (runtime service)

**Files:**
- Create: `fortune/services/knowledge-service.js`

This service runs in the WeChat Mini Program. It loads the index, does key matching, loads only matched chunks, and returns them for prompt injection.

- [ ] **Step 1: Create the service**

```javascript
// fortune/services/knowledge-service.js
// Runtime service: reads local index + chunks, matches by keys, returns ≤800 tokens of knowledge

var chineseIndex = require('../data/knowledge/chinese-index.json');
var westernIndex = require('../data/knowledge/western-index.json');
var allChunks = null; // lazy loaded

function ensureChunks() {
  if (!allChunks) {
    allChunks = {};
    var data = require('../data/knowledge/chunks/all.json');
    data.forEach(function(c) { allChunks[c.id] = c; });
  }
  return allChunks;
}

// Estimate token count (Chinese chars ~= tokens, English roughly 4 chars per token)
function estimateTokens(text) {
  var chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  var asciiChars = (text.match(/[\x00-\x7f]/g) || []).length;
  return chineseChars + Math.ceil(asciiChars / 4);
}

var MAX_TOKENS = 800;

module.exports = {
  // category: 'chinese' or 'western'
  // keys: array of lookup keys, e.g. ['丙', '寅月', '正官']
  match: function(category, keys) {
    try {
      var index = category === 'western' ? westernIndex : chineseIndex;
      ensureChunks();

      // Collect candidate chunk IDs from each key
      var candidates = [];
      var seen = {};
      keys.forEach(function(key) {
        var ids = index[key];
        if (!ids || !ids.length) return;
        ids.forEach(function(id) {
          if (!seen[id]) {
            seen[id] = true;
            candidates.push(id);
          }
        });
      });

      // Sort: chunks matching more keys first (intersection priority)
      var scored = candidates.map(function(id) {
        var score = 0;
        keys.forEach(function(k) {
          var ids = index[k];
          if (ids && ids.indexOf(id) !== -1) score++;
        });
        return { id: id, score: score };
      });
      scored.sort(function(a, b) { return b.score - a.score; });

      // Select chunks up to MAX_TOKENS
      var selected = [];
      var tokenCount = 0;
      scored.forEach(function(item) {
        if (tokenCount >= MAX_TOKENS) return;
        var chunk = allChunks[item.id];
        if (!chunk) return;
        var tokens = estimateTokens(chunk.text);
        if (tokenCount + tokens > MAX_TOKENS && tokenCount > 0) return; // skip if would overflow, but allow first chunk even if large
        selected.push(chunk);
        tokenCount += tokens;
      });

      return {
        chunks: selected,
        totalTokens: tokenCount,
        error: false
      };
    } catch (e) {
      return { chunks: [], totalTokens: 0, error: true, message: e.message };
    }
  },

  // Direct tiaohou lookup by dayMaster + month
  getTiaohou: function(dayMaster, monthZhi) {
    try {
      var tiaohou = require('../data/knowledge/structured/tiaohou.json');
      var key = dayMaster + '_' + monthZhi;
      return tiaohou[key] || '';
    } catch (e) {
      return '';
    }
  }
};
```

---

### Task 4: Update calcTarot → 3-card spread with positional meanings

**Files:**
- Modify: `fortune/services/calc-service.js` (lines 343-363)

- [ ] **Step 1: Replace calcTarot function**

Replace the existing `function calcTarot()` with the 3-card spread version:

```javascript
function calcTarot() {
  try {
    // Draw 3 unique cards
    var drawn = [];
    var indices = [];
    while (indices.length < 3) {
      var idx = Math.floor(Math.random() * 22);
      if (indices.indexOf(idx) === -1) indices.push(idx);
    }

    var positions = [
      { name: '过去', meaning: '过去的能量和影响，问题的根源' },
      { name: '现在', meaning: '当下的状态、挑战与机遇' },
      { name: '未来', meaning: '未来的发展趋势和潜在结果' }
    ];

    var spread = indices.map(function(idx, i) {
      var card = TAROT_MAJOR[idx];
      var isRev = Math.random() < 0.5;
      return {
        position: positions[i].name,
        positionMeaning: positions[i].meaning,
        card: card.name,
        number: card.number,
        reversed: isRev,
        meanings: isRev ? card.reversed : card.upright,
        element: card.element,
        planet: card.planet
      };
    });

    return {
      error: false,
      spread: spread,
      summary: '过去「' + spread[0].card + '」→ 现在「' + spread[1].card + '」→ 未来「' + spread[2].card + '」'
    };
  } catch (e) {
    return { error: true, summary: '塔罗抽牌失败' };
  }
}
```

---

### Task 5: Update ai-service.js to inject knowledge

**Files:**
- Modify: `fortune/services/ai-service.js` (add require at line 2, modify buildUnifiedReadingPrompt return at lines 102-113)

- [ ] **Step 1: Add require for knowledge-service at top of file**

Insert after line 1:
```javascript
const knowledgeService = require('./knowledge-service');
```

Edit lines 1-3 from:
```javascript
// fortune/services/ai-service.js
const app = getApp();
```
to:
```javascript
// fortune/services/ai-service.js
const app = getApp();
const knowledgeService = require('./knowledge-service');
```

- [ ] **Step 2: Modify buildUnifiedReadingPrompt to inject knowledge**

After line 91 (`if (validCount === 0) return null;`), add the knowledge injection block:

```javascript
  // === Classic Knowledge Injection ===
  var knowledgeText = '';
  if (category === 'chinese' && calcResults.bazi && !calcResults.bazi.error) {
    var baziKeys = [];
    if (calcResults.bazi.dayMaster) baziKeys.push(calcResults.bazi.dayMaster);
    if (calcResults.bazi.monthZhi) baziKeys.push(calcResults.bazi.monthZhi);
    var result = knowledgeService.match('chinese', baziKeys);
    if (result.chunks && result.chunks.length) {
      knowledgeText = '\n\n【经典依据】\n';
      result.chunks.forEach(function(c) {
        knowledgeText += '· ' + c.source + '（' + (c.summary || c.tags.dayMaster || '') + '）: ' + c.text + '\n';
      });
    }
  }
```

Then modify the return statement to inject knowledgeText between calcSection and the analysis requirements. Change lines 102-113 from:

```javascript
  return '你是一个资深的运势分析师。请根据以下用户信息，用' + typeList + '三个方法进行综合分析。\n\n' +
    '【当前日期】\n' + today + ' 星期' + weekDay + '\n' + yearInfo + '\n\n' +
    '【用户信息】\n' + profileInfo + '\n' +
    calcSection + '\n\n' +
    '请基于以上真实排盘数据进行分析。\n\n' +
    '【分析要求】\n' +
    '1. 先给出今日运势概述，再展开今年整体运势分析\n' +
    '2. 将今日运势和今年整体运势自然融入到各方法的分析中，不需要单独分段落\n' +
    '3. 只用中文回答，不需要掺杂英文\n' +
    '4. 自由发挥，语言自然，不需要套固定格式\n\n' +
    '请直接输出分析结果。';
```

to:

```javascript
  return '你是一个资深的运势分析师。请根据以下用户信息，用' + typeList + '三个方法进行综合分析。\n\n' +
    '【当前日期】\n' + today + ' 星期' + weekDay + '\n' + yearInfo + '\n\n' +
    '【用户信息】\n' + profileInfo + '\n' +
    calcSection +
    knowledgeText + '\n\n' +
    '请基于以上真实排盘数据和经典依据进行分析。\n\n' +
    '【分析要求】\n' +
    '1. 先给出今日运势概述，再展开今年整体运势分析\n' +
    '2. 将今日运势和今年整体运势自然融入到各方法的分析中，不需要单独分段落\n' +
    '3. 引用【经典依据】中的古籍内容来支撑你的分析，让解读有据可依\n' +
    '4. 只用中文回答，不需要掺杂英文\n' +
    '5. 自由发挥，语言自然，不需要套固定格式\n\n' +
    '请直接输出分析结果。';
```

- [ ] **Step 3: Verify the changes**

```bash
node -e "var m = require('./fortune/services/ai-service'); console.log('Module loaded OK, exports:', Object.keys(m).join(', '));"
```

Expected: Module loaded with no errors.

---

### Task 6: Update reading.js tarot card display

**Files:**
- Modify: `fortune/pages/reading/reading.js` (lines 135-147)

- [ ] **Step 1: Replace the tarot detail card section**

Replace lines 135-147:

```javascript
if (calcResults.tarot && !calcResults.tarot.error) {
  var tarot = calcResults.tarot;
  var items = [];
  tarot.spread.forEach(function(card) {
    items.push(
      { label: card.position, value: card.card + (card.reversed ? '（逆位）' : '（正位）'), color: card.reversed ? '#ef4444' : '#22c55e' },
      { label: card.position + '含义', value: card.positionMeaning, color: '#60a5fa' },
      { label: '关键词', value: card.meanings.join('、'), color: '#fbbf24' },
      { label: '元素', value: card.element, color: card.element === '火' ? '#ef4444' : card.element === '土' ? '#f59e0b' : card.element === '风' ? '#60a5fa' : '#3b82f6' }
    );
  });
  items.push({ label: '牌阵', value: tarot.spread.map(function(c) { return c.position + '·' + c.card; }).join(' → '), color: '#c084fc' });
  cards.push({
    id: 'tarot',
    typeName: '塔罗占卜',
    summary: tarot.summary,
    details: items
  });
}
```

---

### Task 7: Integration verification

**Files:**
- Test: `fortune/tests/calc-service.test.js`
- Manual: Verify in mini-program

- [ ] **Step 1: Run existing calc service tests**

```bash
node -e "var c = require('./fortune/services/calc-service'); var r = c.calcTarot(); console.log(JSON.stringify(r, null, 2));"
```

Expected: 3-card spread with positions (过去/现在/未来), each with card name, reversal, meanings.

- [ ] **Step 2: Verify knowledge-service basic match**

```bash
node -e "
var ks = require('./fortune/services/knowledge-service');
var r = ks.match('chinese', ['丙', '寅']);
console.log('Matched: ' + r.chunks.length + ' chunks');
console.log('Tokens: ' + r.totalTokens);
r.chunks.forEach(function(c) { console.log(c.id + ': ' + c.source + ' - ' + (c.text || '').substring(0, 40)); });
"
```

Expected: At least 1 chunk from 穷通宝鉴 matching 丙+寅.

- [ ] **Step 3: Verify fortune subpackage size**

```bash
$fortuneSize = (Get-ChildItem -Recurse "fortune/" | Measure-Object -Property Length -Sum).Sum
Write-Host "fortune/ size: $([Math]::Round($fortuneSize / 1KB))KB"
if ($fortuneSize -gt 2MB) { Write-Host "WARNING: exceeds 2MB limit!" }
```

Expected: Under 2MB (should be ~1.6MB after adding ~500-600KB knowledge data).
