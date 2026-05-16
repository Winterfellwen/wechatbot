# AI 文档转换服务实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 构建并部署 AI 文档转换服务，支持 PDF/DOCX/HTML 格式任意互转 + AI 优化

**架构:** 新建 `doc-ai-service` Node.js Express 服务（独立 Render Web Service），队列异步处理。前端 `ai-convert/` 子包（与 pdf/、word/ 同级）。wechatbot-api 代理 `/api/doc-ai/*` 到新服务。

**Tech Stack:** Node 20, Express, multer, pdf-parse, mammoth, cheerio, html-to-docx, puppeteer, OpenRouter API

---

### Task 1: 创建 doc-ai-service 骨架

**Files:**
- Create: `doc-ai-service/package.json`
- Create: `doc-ai-service/config.js`
- Create: `doc-ai-service/index.js`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "doc-ai-service",
  "version": "1.0.0",
  "description": "AI-powered document conversion service (PDF/DOCX/HTML)",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "node --test tests/*.test.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.4",
    "pdf-parse": "^1.1.1",
    "cheerio": "^1.0.0-rc.12",
    "mammoth": "^1.6.0",
    "html-to-docx": "^1.9.0",
    "puppeteer": "^22.0.0"
  }
}
```

- [ ] **Step 2: 创建 config.js**

```js
const path = require('path');

const config = {
  port: process.env.PORT || 3002,
  dataDir: process.env.DOC_AI_DATA_DIR || '/tmp/doc-ai',
  openrouter: {
    apiKey: process.env.OPENROUTER_KEY || null,
    model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free',
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
    maxTokens: 4096,
    timeout: 20000,
    retries: 3,
  },
  limits: {
    fileSize: 20 * 1024 * 1024,
    allowedExts: ['.pdf', '.docx', '.html'],
  },
};

config.uploadsDir = path.join(config.dataDir, 'uploads');
config.outputsDir = path.join(config.dataDir, 'outputs');
config.jobsFile = path.join(config.dataDir, 'jobs.json');

module.exports = config;
```

- [ ] **Step 3: 创建 index.js 基础框架**

```js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const config = require('./config');
const { createQueue } = require('./queue');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

fs.mkdirSync(config.uploadsDir, { recursive: true });
fs.mkdirSync(config.outputsDir, { recursive: true });

const queue = createQueue();

app.all('/', (req, res) => res.json({ status: 'ok', service: 'doc-ai-service' }));
app.all('/health', (req, res) => res.json({ status: 'ok', service: 'doc-ai-service' }));

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`doc-ai-service running on port ${PORT}`);
  queue.resumePending();
});
```

- [ ] **Step 4: 安装依赖**

Run: `cd doc-ai-service && npm install`

- [ ] **Step 5: 提交**

```bash
git add doc-ai-service/
git commit -m "feat: create doc-ai-service skeleton"
```

---

### Task 2: 实现队列 + 持久化

**Files:**
- Create: `doc-ai-service/queue.js`

- [ ] **Step 1: 编写 queue.js**

```js
const fs = require('fs');
const path = require('path');
const config = require('./config');

function createQueue() {
  const jobs = {};
  const _queue = [];
  let _processing = false;

  function _save() {
    try {
      fs.writeFileSync(config.jobsFile, JSON.stringify(jobs));
    } catch (e) {
      console.error('[queue] save failed:', e.message);
    }
  }

  function _load() {
    try {
      if (fs.existsSync(config.jobsFile)) {
        const data = JSON.parse(fs.readFileSync(config.jobsFile, 'utf8'));
        Object.assign(jobs, data);
        console.log(`[queue] loaded ${Object.keys(jobs).length} jobs`);
      }
    } catch (e) {
      console.error('[queue] load failed:', e.message);
    }
  }

  function addJob(jobId, jobData) {
    jobs[jobId] = { ...jobData, status: 'pending', createdAt: Date.now() };
    _save();
    _queue.push(jobId);
    _processNext();
    return jobId;
  }

  function getJob(jobId) {
    return jobs[jobId] || null;
  }

  function updateJob(jobId, updates) {
    if (jobs[jobId]) {
      Object.assign(jobs[jobId], updates);
      _save();
    }
  }

  async function _processNext() {
    if (_processing || _queue.length === 0) return;
    _processing = true;

    const jobId = _queue.shift();
    if (!jobs[jobId]) { _processing = false; _processNext(); return; }

    updateJob(jobId, { status: 'processing' });

    try {
      const { processJob } = require('./index');
      await processJob(jobId);
      updateJob(jobId, { status: 'done' });
    } catch (err) {
      console.error(`[queue] job ${jobId} failed:`, err.message);
      updateJob(jobId, { status: 'error', error: err.message.substring(0, 200) });
    } finally {
      _processing = false;
      _processNext();
    }
  }

  function resumePending() {
    _load();
    const pending = Object.entries(jobs)
      .filter(([, j]) => j.status === 'pending' || j.status === 'processing')
      .map(([id]) => id);
    if (pending.length > 0) {
      console.log(`[queue] re-queueing ${pending.length} pending jobs`);
      pending.forEach(id => {
        if (jobs[id].status === 'processing') {
          updateJob(id, { status: 'pending', error: '服务重启，重新排队' });
        }
        _queue.push(id);
      });
      _processNext();
    }
  }

  _load();

  return { addJob, getJob, updateJob, resumePending };
}

module.exports = { createQueue };
```

- [ ] **Step 2: 提交**

```bash
git add doc-ai-service/queue.js
git commit -m "feat: add job queue with disk persistence"
```

---

### Task 3: 实现文档提取器

**Files:**
- Create: `doc-ai-service/extractors/pdf.js`
- Create: `doc-ai-service/extractors/docx.js`
- Create: `doc-ai-service/extractors/html.js`

- [ ] **Step 1: 创建 PDF 提取器 doc-ai-service/extractors/pdf.js**

```js
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
```

- [ ] **Step 2: 创建 DOCX 提取器 doc-ai-service/extractors/docx.js**

```js
const mammoth = require('mammoth');

async function extract(filePath) {
  const result = await mammoth.convertToHtml({ path: filePath });
  const html = result.value;
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  const title = $('h1').first().text() || $('title').text() || '';
  const text = $.root().text().replace(/\s+/g, ' ').trim();
  return { text, html, title };
}

module.exports = { extract };
```

- [ ] **Step 3: 创建 HTML 提取器 doc-ai-service/extractors/html.js**

```js
const fs = require('fs');
const cheerio = require('cheerio');

function extract(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(raw);
  $('script, style, nav, footer, header').remove();
  const title = $('title').text() || $('h1').first().text() || '';
  const html = $.html();
  const text = $.root().text().replace(/\s+/g, ' ').trim();
  return { text, html, title };
}

module.exports = { extract };
```

- [ ] **Step 4: 提交**

```bash
git add doc-ai-service/extractors/
git commit -m "feat: add document extractors (pdf/docx/html)"
```

---

### Task 4: 实现 AI 引擎

**Files:**
- Create: `doc-ai-service/ai.js`

- [ ] **Step 1: 创建 ai.js**

```js
const config = require('./config');

function buildPrompt(sourceText, sourceFormat, targetFormat, mode, title) {
  const modeInstructions = {
    polish: '润色文档内容：修正语法错误，优化表达方式，保持原意不变。改善段落结构和可读性。',
    format: '格式化文档：优化标题层级，整理段落结构，美化表格和列表，使其布局清晰专业。',
    summarize: '提取文档的核心内容，生成结构化摘要。保留关键信息、主要论点和结论。省略次要细节。',
  };

  return [
    { role: 'system', content: `你是一个文档转换专家。你需要将${sourceFormat}格式的文档转换为${targetFormat}格式。
${modeInstructions[mode] || modeInstructions.polish}

你必须严格按照以下格式输出，不要包含任何其他内容：
\`\`\`html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title || 'Document'}</title></head>
<body>
<!-- 在此输出完整的 HTML 内容 -->
</body>
</html>
\`\`\`

不输出任何解释、前言、后语。只输出上述格式包裹的 HTML 代码。` },
    { role: 'user', content: `以下是需要处理的文档内容：\n\n${sourceText.substring(0, 30000)}` },
  ];
}

async function callAI(sourceText, sourceFormat, targetFormat, mode, title) {
  const messages = buildPrompt(sourceText, sourceFormat, targetFormat, mode, title);
  let lastError;

  for (let attempt = 1; attempt <= config.openrouter.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.openrouter.timeout);

      const response = await fetch(config.openrouter.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://doc-ai-service.onrender.com',
          'X-Title': 'DocAIService',
        },
        body: JSON.stringify({
          model: config.openrouter.model,
          messages,
          max_tokens: mode === 'summarize' ? 2000 : config.openrouter.maxTokens,
          temperature: mode === 'polish' ? 0.3 : mode === 'format' ? 0.2 : 0.5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown');
        throw new Error(`OpenRouter ${response.status}: ${errText.substring(0, 100)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      const htmlMatch = content.match(/```html\s*([\s\S]*?)```/);
      if (htmlMatch) return htmlMatch[1].trim();

      const cheerio = require('cheerio');
      const $ = cheerio.load(content);
      if ($('html').length > 0 || $('body').length > 0 || $('*').length > 0) {
        return $.html();
      }

      throw new Error('AI 输出无法解析为合法 HTML');
    } catch (err) {
      lastError = err;
      console.error(`[ai] attempt ${attempt}/${config.openrouter.retries} failed:`, err.message);
      if (attempt < config.openrouter.retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`AI 处理失败（已重试${config.openrouter.retries}次）: ${lastError.message}`);
}

module.exports = { callAI };
```

- [ ] **Step 2: 提交**

```bash
git add doc-ai-service/ai.js
git commit -m "feat: implement AI engine with OpenRouter and retry"
```

---

### Task 5: 实现输出组装器

**Files:**
- Create: `doc-ai-service/assemblers/html.js`
- Create: `doc-ai-service/assemblers/docx.js`
- Create: `doc-ai-service/assemblers/pdf.js`

- [ ] **Step 1: 创建 HTML 组装器 assemblers/html.js**

```js
const fs = require('fs');

function assemble(htmlContent, outputPath, title) {
  const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title || 'Document'}</title>
<style>
  body { font-family: sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
  h1, h2, h3 { color: #333; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ccc; padding: 8px; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
  fs.writeFileSync(outputPath, fullHtml, 'utf8');
  return outputPath;
}

module.exports = { assemble };
```

- [ ] **Step 2: 创建 DOCX 组装器 assemblers/docx.js**

```js
const fs = require('fs');
const htmlToDocx = require('html-to-docx');

async function assemble(htmlContent, outputPath, title) {
  const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title || 'Document'}</title></head>
<body>${htmlContent}</body></html>`;
  const buffer = await htmlToDocx(fullHtml, null, { table: { row: { cantSplit: true } } });
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

module.exports = { assemble };
```

- [ ] **Step 3: 创建 PDF 组装器 assemblers/pdf.js**

```js
const fs = require('fs');
const puppeteer = require('puppeteer');

async function assemble(htmlContent, outputPath, title) {
  const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title || 'Document'}</title>
<style>
  body { font-family: sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
  h1, h2, h3 { color: #333; page-break-after: avoid; }
  table { border-collapse: collapse; width: 100%; page-break-inside: avoid; }
  td, th { border: 1px solid #ccc; padding: 8px; }
  @page { margin: 20mm; }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }
  return outputPath;
}

module.exports = { assemble };
```

- [ ] **Step 4: 提交**

```bash
git add doc-ai-service/assemblers/
git commit -m "feat: implement output assemblers (html/docx/pdf)"
```

---

### Task 6: 串联主处理流程

**Files:**
- Modify: `doc-ai-service/index.js`（添加完整路由和 processJob）

- [ ] **Step 1: 更新 index.js 添加所有路由和处理逻辑**

```js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { createQueue } = require('./queue');
const pdfExtractor = require('./extractors/pdf');
const docxExtractor = require('./extractors/docx');
const htmlExtractor = require('./extractors/html');
const htmlAssembler = require('./assemblers/html');
const docxAssembler = require('./assemblers/docx');
const pdfAssembler = require('./assemblers/pdf');
const { callAI } = require('./ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

fs.mkdirSync(config.uploadsDir, { recursive: true });
fs.mkdirSync(config.outputsDir, { recursive: true });

const queue = createQueue();
const upload = multer({ dest: config.uploadsDir + '/', limits: { fileSize: config.limits.fileSize } });

const extractors = { pdf: pdfExtractor, docx: docxExtractor, html: htmlExtractor };
const assemblers = { html: htmlAssembler, docx: docxAssembler, pdf: pdfAssembler };

const formatMap = { '.pdf': 'pdf', '.docx': 'docx', '.html': 'html' };

async function processJob(jobId) {
  const job = queue.getJob(jobId);
  if (!job) throw new Error('Job not found');

  console.log(`[process] job=${jobId} ${job.sourceFmt}→${job.targetFmt} mode=${job.mode}`);

  const extractor = extractors[job.sourceFmt];
  if (!extractor) throw new Error(`Unsupported source format: ${job.sourceFmt}`);

  const result = await extractor.extract(job.filePath);

  const aiHtml = await callAI(result.text || result.html, job.sourceFmt, job.targetFmt, job.mode, result.title || '');

  const assembler = assemblers[job.targetFmt];
  if (!assembler) throw new Error(`Unsupported target format: ${job.targetFmt}`);

  const outName = `${jobId}.${job.targetFmt}`;
  const outPath = path.join(config.outputsDir, outName);
  await assembler.assemble(aiHtml, outPath, result.title || '');

  queue.updateJob(jobId, { resultFile: outName });

  fs.unlink(job.filePath, () => {});
}

app.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const sourceFmt = formatMap[ext];
    if (!sourceFmt) return res.status(400).json({ error: '不支持的文件格式，仅支持 .pdf .docx .html' });

    const targetFmt = req.body.to;
    if (!targetFmt || !formatMap['.' + targetFmt]) return res.status(400).json({ error: '目标格式无效' });

    const mode = req.body.mode || 'polish';
    if (!['polish', 'format', 'summarize'].includes(mode)) return res.status(400).json({ error: 'AI 模式无效' });

    const fileName = req.file.originalname;
    const jobId = require('crypto').randomUUID().replace(/-/g, '');

    queue.addJob(jobId, {
      filePath: req.file.path,
      fileName,
      sourceFmt,
      targetFmt,
      mode,
      status: 'pending',
    });

    res.json({ job_id: jobId });
  } catch (err) {
    console.error('[convert] error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/status/:jobId', (req, res) => {
  const job = queue.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const resp = { status: job.status };
  if (job.status === 'done') resp.resultFile = job.resultFile;
  if (job.status === 'error') resp.error = job.error;
  res.json(resp);
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join(config.outputsDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

app.all('/', (req, res) => res.json({ status: 'ok', service: 'doc-ai-service' }));
app.all('/health', (req, res) => res.json({ status: 'ok', service: 'doc-ai-service' }));

module.exports = { processJob };

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`doc-ai-service running on port ${PORT}`);
  queue.resumePending();
});
```

- [ ] **Step 2: 提交**

```bash
git add doc-ai-service/index.js
git commit -m "feat: wire up convert API with full pipeline"
```

---

### Task 7: wechatbot-api 添加代理路由

**Files:**
- Modify: `index.js` (wechatbot-api)

- [ ] **Step 1: 在 config.js 中添加 doc-ai-service URL**

Edit `config.js` and add after the pdfService section:

```js
// AI 文档转换服务配置
docAiService: {
  url: process.env.DOC_AI_SERVICE_URL || 'http://localhost:3002',
},
```

- [ ] **Step 2: 在 index.js 中添加 doc-ai-service 代理路由**

在 `index.js` 的 `pdfBackends` 相关代码后、或文件末尾（`app.listen` 前），添加以下路由：

```js
// --- AI 文档转换服务代理 ---
const DOC_AI_URL = config.docAiService.url;

app.post('/api/doc-ai/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
    formData.append('file', blob, req.file.originalname);
    formData.append('to', req.body.to || 'html');
    formData.append('mode', req.body.mode || 'polish');

    const resp = await fetchWithTimeout(DOC_AI_URL + '/convert', {
      method: 'POST',
      body: formData,
    }, 120000);

    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
  }
});

app.get('/api/doc-ai/status/:jobId', async (req, res) => {
  try {
    const resp = await fetchWithTimeout(DOC_AI_URL + '/status/' + req.params.jobId, {}, 30000);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/doc-ai/download/:filename', async (req, res) => {
  try {
    const resp = await fetchWithTimeout(DOC_AI_URL + '/download/' + req.params.filename, {}, 60000);
    if (!resp.ok) return res.status(resp.status).json({ error: '文件不存在' });
    const buffer = await resp.arrayBuffer();
    res.set('Content-Type', resp.headers.get('content-type') || 'application/octet-stream');
    res.set('Content-Disposition', resp.headers.get('content-disposition') || `attachment; filename="${req.params.filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 3: 提交**

```bash
git add config.js index.js
git commit -m "feat: add doc-ai-service proxy routes to wechatbot-api"
```

---

### Task 8: 更新 render.yaml

**Files:**
- Modify: `render.yaml`

- [ ] **Step 1: 在 render.yaml 中添加 doc-ai-service 条目**

在 `<` 文件末尾（pdf-service 条目后）添加：

```yaml
  - type: web
    name: doc-ai-service
    runtime: node
    rootDir: doc-ai-service
    buildCommand: npm install
    startCommand: node index.js
    healthCheckPath: /health
    envVars:
      - key: NODE_VERSION
        value: "20"
      - key: OPENROUTER_KEY
        sync: false
```

- [ ] **Step 2: 提交**

```bash
git add render.yaml
git commit -m "chore: add doc-ai-service to render.yaml"
```

---

### Task 9: 创建前端页面

**Files:**
- Create: `ai-convert/pages/index/index.wxml`
- Create: `ai-convert/pages/index/index.js`
- Create: `ai-convert/pages/index/index.wxss`
- Create: `ai-convert/pages/index/index.json`
- Create: `ai-convert/pages/status/status.wxml`
- Create: `ai-convert/pages/status/status.js`
- Create: `ai-convert/pages/status/status.wxss`
- Create: `ai-convert/pages/status/status.json`
- Modify: `app.json`
- Modify: `app.js`

- [ ] **Step 1: 更新 app.json 添加子包**

Add to `subpackages` array:

```json
{
  "root": "ai-convert",
  "pages": [
    "pages/index/index",
    "pages/status/status"
  ]
}
```

- [ ] **Step 2: 创建 ai-convert/pages/index/index.wxml**

参考 `pdf/pages/index/index.wxml` 的风格，编写：

```xml
<!-- 与 pdf/pages/index/index.wxml 风格一致 -->
<view class="container">
  <view class="header">
    <text class="title">AI 文档转换</text>
    <text class="desc">支持 PDF / DOCX / HTML 格式互转，AI 自动优化</text>
  </view>

  <view class="section">
    <text class="label">选择文件</text>
    <view class="file-picker" bindtap="chooseFile">
      <text wx:if="{{!fileName}}" class="placeholder">点击选择文件</text>
      <text wx:else class="file-name">{{fileName}}</text>
    </view>
  </view>

  <view class="section">
    <text class="label">转换格式</text>
    <view class="format-group">
      <view class="format-btn {{targetFormat==='pdf'?'active':''}}" data-format="pdf" bindtap="selectFormat">PDF</view>
      <view class="format-btn {{targetFormat==='docx'?'active':''}}" data-format="docx" bindtap="selectFormat">DOCX</view>
      <view class="format-btn {{targetFormat==='html'?'active':''}}" data-format="html" bindtap="selectFormat">HTML</view>
    </view>
  </view>

  <view class="section">
    <text class="label">AI 模式</text>
    <view class="mode-group">
      <view class="mode-btn {{mode==='polish'?'active':''}}" data-mode="polish" bindtap="selectMode">润色</view>
      <view class="mode-btn {{mode==='format'?'active':''}}" data-mode="format" bindtap="selectMode">格式化</view>
      <view class="mode-btn {{mode==='summarize'?'active':''}}" data-mode="summarize" bindtap="selectMode">摘要</view>
    </view>
  </view>

  <button class="upload-btn" bindtap="upload" disabled="{{!fileName || uploading}}">
    <text wx:if="{{!uploading}}">开始转换</text>
    <text wx:else>上传中...</text>
  </button>
</view>
```

- [ ] **Step 3: 创建 ai-convert/pages/index/index.js**

参考 `pdf/pages/index/index.js` 的风格：

```js
const CONFIG = require('../../../utils/config');
const app = getApp();

Page({
  data: {
    fileName: '',
    filePath: '',
    targetFormat: 'html',
    mode: 'polish',
    uploading: false,
  },
  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'docx', 'html'],
      success: (res) => {
        const file = res.tempFiles[0];
        this.setData({ fileName: file.name, filePath: file.path });
      },
    });
  },
  selectFormat(e) {
    this.setData({ targetFormat: e.currentTarget.dataset.format });
  },
  selectMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },
  upload() {
    const that = this;
    wx.showLoading({ title: '上传中...' });
    that.setData({ uploading: true });

    wx.uploadFile({
      url: CONFIG.SERVER + '/api/doc-ai/convert',
      filePath: that.data.filePath,
      name: 'file',
      formData: {
        to: that.data.targetFormat,
        mode: that.data.mode,
      },
      success(res) {
        const data = JSON.parse(res.data);
        if (data.job_id) {
          // 保存任务记录
          const records = wx.getStorageSync('ai_convert_records') || [];
          records.unshift({
            jobId: data.job_id,
            fileName: that.data.fileName,
            targetFormat: that.data.targetFormat,
            mode: that.data.mode,
            status: 'pending',
            timestamp: Date.now(),
          });
          wx.setStorageSync('ai_convert_records', records);

          wx.navigateTo({
            url: '/ai-convert/pages/status/status?jobId=' + data.job_id,
          });
        } else {
          wx.showToast({ title: data.error || '上传失败', icon: 'none' });
        }
      },
      fail() {
        wx.showToast({ title: '网络异常', icon: 'none' });
      },
      complete() {
        wx.hideLoading();
        that.setData({ uploading: false });
      },
    });
  },
});
```

- [ ] **Step 4: 创建 ai-convert/pages/index/index.wxss**

参考 `pdf/pages/index/index.wxss`：

```css
.container { padding: 20px; }
.header { text-align: center; margin-bottom: 30px; }
.title { font-size: 22px; font-weight: bold; color: #333; display: block; }
.desc { font-size: 14px; color: #888; margin-top: 8px; display: block; }
.section { margin-bottom: 20px; }
.label { font-size: 15px; color: #555; display: block; margin-bottom: 10px; }
.file-picker { border: 2px dashed #ccc; border-radius: 12px; padding: 30px; text-align: center; }
.placeholder { color: #aaa; font-size: 14px; }
.file-name { color: #333; font-size: 14px; }
.format-group, .mode-group { display: flex; gap: 10px; }
.format-btn, .mode-btn { flex: 1; text-align: center; padding: 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 14px; }
.active { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-color: transparent; }
.upload-btn { width: 100%; margin-top: 30px; padding: 14px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 10px; }
.upload-btn[disabled] { opacity: 0.5; }
```

- [ ] **Step 5: 创建 ai-convert/pages/index/index.json**

```json
{
  "navigationBarTitleText": "AI 文档转换",
  "usingComponents": {}
}
```

- [ ] **Step 6: 创建 ai-convert/pages/status/status.wxml**

```xml
<view class="container">
  <view class="status-card">
    <view class="status-icon">
      <image wx:if="{{status==='pending'}}" src="/images/loading.gif" mode="aspectFit"></image>
      <image wx:elif="{{status==='processing'}}" src="/images/loading.gif" mode="aspectFit"></image>
      <image wx:elif="{{status==='done'}}" src="/images/success.png" mode="aspectFit"></image>
      <image wx:elif="{{status==='error'}}" src="/images/error.png" mode="aspectFit"></image>
    </view>
    <text class="status-text">{{statusText}}</text>
    <text wx:if="{{errorMsg}}" class="error-msg">{{errorMsg}}</text>
  </view>

  <view class="info">
    <text class="info-item">文件：{{fileName}}</text>
    <text class="info-item">目标格式：{{targetFormat.toUpperCase()}}</text>
    <text class="info-item">AI 模式：{{modeText}}</text>
  </view>

  <button wx:if="{{status==='done' && downloadUrl}}" class="download-btn" bindtap="download">下载文件</button>
  <button wx:if="{{status==='error'}}" class="retry-btn" bindtap="goBack">重新上传</button>
</view>
```

- [ ] **Step 7: 创建 ai-convert/pages/status/status.js**

```js
const CONFIG = require('../../../utils/config');
const app = getApp();

Page({
  data: {
    jobId: '',
    fileName: '',
    targetFormat: '',
    mode: '',
    modeText: '',
    status: 'pending',
    statusText: '排队中...',
    downloadUrl: '',
    errorMsg: '',
    timer: null,
  },

  onLoad(options) {
    const records = wx.getStorageSync('ai_convert_records') || [];
    const record = records.find(r => r.jobId === options.jobId);
    const modeMap = { polish: '润色', format: '格式化', summarize: '摘要' };

    this.setData({
      jobId: options.jobId,
      fileName: record ? record.fileName : '',
      targetFormat: record ? record.targetFormat : '',
      mode: record ? record.mode : '',
      modeText: record ? modeMap[record.mode] || record.mode : '',
    });

    this.startPolling();
  },

  startPolling() {
    const that = this;
    that.data.timer = setInterval(() => {
      wx.request({
        url: CONFIG.SERVER + '/api/doc-ai/status/' + that.data.jobId,
        success(res) {
          if (res.data.status === 'done') {
            clearInterval(that.data.timer);
            that.setData({
              status: 'done',
              statusText: '转换完成',
              downloadUrl: CONFIG.SERVER + '/api/doc-ai/download/' + res.data.resultFile,
            });
            // 更新任务记录
            that.updateRecord('done', res.data.resultFile);
          } else if (res.data.status === 'error') {
            clearInterval(that.data.timer);
            that.setData({
              status: 'error',
              statusText: '转换失败',
              errorMsg: res.data.error || '未知错误',
            });
            that.updateRecord('error');
          } else if (res.data.status === 'processing') {
            that.setData({ status: 'processing', statusText: 'AI 处理中...' });
          }
        },
        fail() {
          // silent
        },
      });
    }, 3000);
  },

  updateRecord(status, resultUrl) {
    const records = wx.getStorageSync('ai_convert_records') || [];
    for (let i = 0; i < records.length; i++) {
      if (records[i].jobId === this.data.jobId) {
        records[i].status = status;
        if (resultUrl) records[i].resultUrl = resultUrl;
        break;
      }
    }
    wx.setStorageSync('ai_convert_records', records);
  },

  download() {
    const that = this;
    wx.downloadFile({
      url: that.data.downloadUrl,
      success(res) {
        if (res.statusCode === 200) {
          const fs = wx.getFileSystemManager();
          const ext = '.' + that.data.targetFormat;
          const savedPath = wx.env.USER_DATA_PATH + '/' + that.data.fileName.replace(/\.[^.]+$/, '') + ext;
          try { fs.saveFileSync(res.tempFilePath, savedPath); } catch (e) { /* ok */ }
          wx.openDocument({
            filePath: savedPath,
            success() {
              that.updateRecord('done', null);
            },
          });
        }
      },
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onUnload() {
    if (this.data.timer) clearInterval(this.data.timer);
  },
});
```

- [ ] **Step 8: 创建 ai-convert/pages/status/status.wxss**

```css
.container { padding: 20px; }
.status-card { text-align: center; padding: 40px 0; }
.status-icon image { width: 80px; height: 80px; }
.status-text { display: block; font-size: 18px; margin-top: 15px; color: #333; }
.error-msg { display: block; font-size: 13px; color: #e74c3c; margin-top: 8px; }
.info { margin: 20px 0; padding: 15px; background: #f8f8f8; border-radius: 10px; }
.info-item { display: block; font-size: 14px; color: #555; margin-bottom: 6px; }
.download-btn, .retry-btn { width: 100%; margin-top: 20px; padding: 14px; border-radius: 10px; }
.download-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
.retry-btn { background: #f0f0f0; color: #333; }
```

- [ ] **Step 9: 创建 ai-convert/pages/status/status.json**

```json
{
  "navigationBarTitleText": "转换状态",
  "usingComponents": {}
}
```

- [ ] **Step 10: 提交**

```bash
git add ai-convert/ app.json
git commit -m "feat: add AI document conversion frontend pages"
```

---

### Task 10: 自审与校验

- [ ] **Step 1: 检查一致性**

核对以下内容：
1. `config.js` 中 `docAiService.url` 是否配置
2. `render.yaml` 新增 service 中 `rootDir: doc-ai-service` 是否正确
3. `app.json` 中 `ai-convert` 子包 pages 路径是否正确
4. `index.js` (wechatbot-api) 代理路由的 URL 是否与 `config.docAiService.url` 一致

- [ ] **Step 2: 检查覆盖率**

Spec 中的每个需求对应的任务：
- AI 独立服务 → Task 1, 2, 6
- 三种格式提取 → Task 3
- OpenRouter AI 调用 + 重试 → Task 4
- 三种格式输出 → Task 5
- 队列 + 持久化 → Task 2
- 小程序入口 + 前端页面 → Task 9
- 代理路由 → Task 7
- Render 部署配置 → Task 8

- [ ] **Step 3: 最终提交**

```bash
git status
```
