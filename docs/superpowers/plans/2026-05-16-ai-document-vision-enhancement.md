# AI 文档视觉增强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 doc-ai-service 添加视觉 AI 管线——提取器截图文档每页，合并为拼图，传给 GLM-4.6V-Flash 看布局后输出结构化 HTML。

**Architecture:** 提取器输出 `{ text, images: Buffer[], html?, title, totalPages }` → tiler 合并多页为拼图组 → ai-vision.js 调 GLM-4.6V-Flash → processJob 可选第二轮文本 AI 精修。PDF 用 pdfjs-dist 渲染，DOCX 用 puppeteer 渲染 mammoth HTML，HTML 源跳过视觉。

**Tech Stack:** pdfjs-dist (PDF 渲染), canvas (图片拼图), BigModel GLM-4.6V-Flash (视觉 AI), puppeteer (DOCX 截图)

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `doc-ai-service/package.json` | 修改 | 添加 pdfjs-dist、canvas 依赖 |
| `doc-ai-service/config.js` | 修改 | 添加 visionModel、vision 配置段 |
| `doc-ai-service/extractors/pdf.js` | 重写 | pdfjs-dist 渲染每页为 JPEG + 文本提取 |
| `doc-ai-service/extractors/docx.js` | 增强 | 添加 puppeteer 截屏逻辑 |
| `doc-ai-service/lib/tiler.js` | 创建 | canvas 拼图合并：Buffer[] → imageGroups |
| `doc-ai-service/ai-vision.js` | 创建 | 视觉 AI 调用（prompt 构建 + GLM-4.6V-Flash） |
| `doc-ai-service/ai.js` | 修改 | 提取 visionModel 配置到 config，其余不变 |
| `doc-ai-service/index.js` | 修改 | processJob 添加视觉分支逻辑 |

### Task 1: 添加依赖和配置

**Files:**
- Modify: `doc-ai-service/package.json`
- Modify: `doc-ai-service/config.js`
- Create: `doc-ai-service/lib/tiler.js`

- [ ] **Step 1: 添加 pdfjs-dist 和 canvas 到 package.json**

```json
{
  "dependencies": {
    "pdfjs-dist": "^4.0.379",
    "canvas": "^2.11.2"
  }
}
```

编辑 `doc-ai-service/package.json`，在现有 dependencies 中添加这两行（字母序插入）。

- [ ] **Step 2: 扩展 config.js 添加 vision 配置段**

在 `config.js` 的 `limits` 定义之后添加：

```js
  vision: {
    viewportWidth: 900,
    viewportHeight: 1200,
    pdfRenderScale: 2,
    jpegQuality: 80,
    tileGrid: { cols: 2 },
    maxPagesPerTile: 4,
  },
```

同时修改 `bigmodel` 段，添加 `visionModel` 字段：

```js
  bigmodel: {
    apiKey: process.env.BIGMODEL_KEY || null,
    model: process.env.BIGMODEL_MODEL || 'glm-4.7-flash',
    visionModel: 'glm-4.6v-flash',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    maxTokens: 4096,
    timeout: 60000,
    retries: 2,
  },
```

- [ ] **Step 3: 安装依赖**

Run: `cd doc-ai-service && npm install`

Expected: pdfjs-dist 和 canvas 安装成功，无报错。

- [ ] **Step 4: Commit**

```bash
git add doc-ai-service/package.json doc-ai-service/package-lock.json doc-ai-service/config.js
git commit -m "chore: add pdfjs-dist, canvas deps and vision config"
```

### Task 2: 创建 tiler.js

**Files:**
- Create: `doc-ai-service/lib/tiler.js`

- [ ] **Step 1: 实现 tileImages 函数**

```js
const { createCanvas, loadImage } = require('canvas');

async function tileImages(images, { cols = 2, maxPagesPerTile = 4, pageW = 900, pageH = 1200, jpegQuality = 80 } = {}) {
  const groups = [];

  for (let i = 0; i < images.length; i += maxPagesPerTile) {
    const batch = images.slice(i, i + maxPagesPerTile);
    const rows = Math.ceil(batch.length / cols);
    const canvas = createCanvas(pageW * cols, pageH * rows);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let idx = 0; idx < batch.length; idx++) {
      const img = await loadImage(batch[idx]);
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      ctx.drawImage(img, col * pageW, row * pageH, pageW, pageH);
    }

    const start = i + 1;
    const end = Math.min(i + maxPagesPerTile, images.length);
    groups.push({
      buffer: canvas.toBuffer('image/jpeg', { quality: jpegQuality }),
      pages: `${start}-${end}`,
    });
  }

  return groups;
}

module.exports = { tileImages };
```

- [ ] **Step 2: Commit**

```bash
git add doc-ai-service/lib/tiler.js
git commit -m "feat: add canvas tile merger for vision AI"
```

### Task 3: 重写 PDF 提取器

**Files:**
- Modify: `doc-ai-service/extractors/pdf.js`

- [ ] **Step 1: 用 pdfjs-dist 改写 extract 函数**

```js
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
const { createCanvas } = require('canvas');
const path = require('path');
const config = require('../config');

async function extract(filePath) {
  const doc = await pdfjsLib.getDocument(filePath).promise;
  const images = [];
  const pageTexts = [];
  const scale = config.vision.pdfRenderScale;
  let title = '';

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const jpegBuf = canvas.toBuffer('image/jpeg', { quality: config.vision.jpegQuality });
    images.push(jpegBuf);

    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    pageTexts.push(pageText);

    if (i === 1) {
      const lines = pageText.split('\n').filter(Boolean);
      title = lines[0] || '';
    }
  }

  const text = pageTexts.join('\n---\n');
  return { text, images, title, totalPages: doc.numPages };
}

module.exports = { extract };
```

- [ ] **Step 2: Commit**

```bash
git add doc-ai-service/extractors/pdf.js
git commit -m "feat: rewrite PDF extractor using pdfjs-dist with page screenshots"
```

### Task 4: 增强 DOCX 提取器（添加截图）

**Files:**
- Modify: `doc-ai-service/extractors/docx.js`

- [ ] **Step 1: 增强 extract，mammoth HTML + puppeteer 截图**

```js
const mammoth = require('mammoth');
const puppeteer = require('puppeteer');
const config = require('../config');

async function extract(filePath) {
  const mammothResult = await mammoth.convertToHtml({ path: filePath });
  const html = mammothResult.value;
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  const title = $('h1').first().text() || $('title').text() || '';
  const text = $.root().text().replace(/\s+/g, ' ').trim();

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();

  await page.setViewport({
    width: config.vision.viewportWidth,
    height: config.vision.viewportHeight,
  });

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const vh = config.vision.viewportHeight;

  const images = [];
  for (let y = 0; y < totalHeight; y += vh) {
    const clipHeight = Math.min(vh, totalHeight - y);
    const buf = await page.screenshot({
      clip: { x: 0, y, width: config.vision.viewportWidth, height: clipHeight },
      type: 'jpeg',
      quality: config.vision.jpegQuality,
    });
    images.push(buf);
  }

  await browser.close();
  return { text, html, images, title, totalPages: images.length };
}

module.exports = { extract };
```

- [ ] **Step 2: Commit**

```bash
git add doc-ai-service/extractors/docx.js
git commit -m "feat: enhance DOCX extractor with puppeteer page screenshots"
```

### Task 5: 创建视觉 AI 调用（ai-vision.js）

**Files:**
- Create: `doc-ai-service/ai-vision.js`

- [ ] **Step 1: 实现 callVisionAI 函数 + prompt 构建**

```js
const config = require('./config');

function buildVisionPrompt(sourceFmt, targetFmt, mode, title, imageGroups, totalPages) {
  const modeInstructions = {
    raw: '保持文档原有结构和内容，准确还原文本、表格、图片和布局。',
    polish: '润色文档内容：修正语法错误，优化表达方式，保持原意不变。改善段落结构和可读性。保留原始布局和图片。',
    format: '格式化文档：优化标题层级，整理段落结构，美化表格和列表，使其布局清晰专业。保留所有内容。',
    summarize: '提取文档的核心内容，生成结构化摘要。保留关键信息、主要论点和结论。省略次要细节。',
  };

  const groupList = imageGroups
    .map((g, i) => `图${i + 1}:第${g.pages}页`)
    .join('，');

  return [
    `你是一个文档转换专家。将${sourceFmt}格式文档转换为${targetFmt}格式。`,
    modeInstructions[mode] || modeInstructions.raw,
    '',
    `截图说明：本文档共${totalPages}页，发送${imageGroups.length}张合并图：`,
    groupList,
    '',
    '请仔细观察截图中的布局、表格、图片、文本框和排版样式。',
    '同时参考提取文本获取准确文字内容。',
    '截图和文本不一致时，以截图视觉布局为准，用文本补充准确文字。',
    '',
    '输出完整 HTML，包含 DOCTYPE、html、head、body 标签，保留原始布局和结构。',
    '表格用 <table>，图片用 <img src="data:...">，标题用 <h1>-<h3>。',
    '',
    '只输出 HTML 代码，用 ```html ... ``` 包裹，不输出其他内容。',
  ].join('\n');
}

function parseVisionResponse(content) {
  const htmlMatch = content.match(/```html\s*([\s\S]*?)```/);
  if (htmlMatch) return htmlMatch[1].trim();

  const cheerio = require('cheerio');
  const $ = cheerio.load(content);
  if ($('html').length > 0 || $('body').length > 0) {
    return $.html();
  }

  throw new Error('视觉 AI 输出无法解析为合法 HTML');
}

async function callVisionAI(imageGroups, text, htmlContent, sourceFmt, targetFmt, mode, title, totalPages) {
  const cfg = config.bigmodel;
  if (!cfg.apiKey) throw new Error('BIGMODEL_KEY 未配置');

  const prompt = buildVisionPrompt(sourceFmt, targetFmt, mode, title, imageGroups, totalPages);

  const contentParts = [
    { type: 'text', text: prompt },
    ...imageGroups.map(g => ({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${g.buffer.toString('base64')}` },
    })),
    { type: 'text', text: `以下是从文档中提取的文本（供参考，布局以截图为准）：\n\n${text.substring(0, 25000)}` },
  ];

  if (htmlContent && htmlContent.length < 10000) {
    contentParts.push({ type: 'text', text: `原始 HTML（供结构参考）：\n\n${htmlContent}` });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeout);

  try {
    const response = await fetch(cfg.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.visionModel,
        messages: [{ role: 'user', content: contentParts }],
        max_tokens: 32000,
        temperature: mode === 'polish' ? 0.3 : mode === 'format' ? 0.2 : 0.5,
        thinking: { type: 'disabled' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown');
      throw new Error(`${response.status}: ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('视觉 AI 返回内容为空');
    return parseVisionResponse(content);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { callVisionAI };
```

- [ ] **Step 2: Commit**

```bash
git add doc-ai-service/ai-vision.js
git commit -m "feat: add vision AI calling module with GLM-4.6V-Flash"
```

### Task 6: 修改 processJob 串联视觉管线

**Files:**
- Modify: `doc-ai-service/index.js`

- [ ] **Step 1: 在 index.js 中添加 vision 相关引用和过程逻辑**

在文件顶部已有的 require 之后添加：

```js
const { tileImages } = require('./lib/tiler');
const { callVisionAI } = require('./ai-vision');
```

修改 `processJob` 函数：

```js
async function processJob(jobId) {
  const job = queue.getJob(jobId);
  if (!job) throw new Error('Job not found');

  console.log(`[process] job=${jobId} ${job.sourceFmt}→${job.targetFmt} mode=${job.mode}`);

  const extractor = extractors[job.sourceFmt];
  if (!extractor) throw new Error(`Unsupported source format: ${job.sourceFmt}`);

  const result = await extractor.extract(job.filePath);

  let aiHtml;
  const hasImages = result.images && result.images.length > 0;
  const skipVision = job.sourceFmt === 'html' || !hasImages;

  if (!skipVision) {
    try {
      const imageGroups = await tileImages(result.images, config.vision);
      console.log(`[process] vision AI: ${result.totalPages} pages → ${imageGroups.length} tile groups`);
      aiHtml = await callVisionAI(
        imageGroups, result.text, result.html || '',
        job.sourceFmt, job.targetFmt, job.mode, result.title || '', result.totalPages
      );
    } catch (err) {
      console.error(`[process] vision AI failed, falling back to text AI:`, err.message);
      aiHtml = null;
    }
  }

  if (!aiHtml) {
    console.log('[process] using text AI fallback');
    aiHtml = await callAI(result.text || result.html, job.sourceFmt, job.targetFmt, job.mode, result.title || '');
  }

  // 第二轮（polish/format/summarize）
  if (job.mode !== 'raw') {
    aiHtml = await callAI(aiHtml, 'html', job.targetFmt, job.mode, result.title || '');
  }

  const assembler = assemblers[job.targetFmt];
  if (!assembler) throw new Error(`Unsupported target format: ${job.targetFmt}`);

  const outName = `${jobId}.${job.targetFmt}`;
  const outPath = path.join(config.outputsDir, outName);
  await assembler.assemble(aiHtml, outPath, result.title || '');

  queue.updateJob(jobId, { resultFile: outName });

  fs.unlink(job.filePath, () => {});
}
```

- [ ] **Step 2: Commit**

```bash
git add doc-ai-service/index.js
git commit -m "feat: integrate vision pipeline into processJob"
```

### Task 7: 验证启动

- [ ] **Step 1: 启动服务验证无启动错误**

Run: `cd doc-ai-service && node -e "require('./config'); require('./lib/tiler'); require('./ai-vision'); console.log('OK')"`

Expected: OK，无模块加载错误。

---

## 自审清单

1. **Spec 覆盖度：** 每项 spec 需求都有对应 task
   - PDF 截图提取 → Task 3
   - DOCX puppeteer 截图 → Task 4
   - 拼图合并 → Task 2
   - 视觉 AI 调用 → Task 5
   - processJob 串联 → Task 6
   - 配置变更 → Task 1
   - 降级回退 → Task 6（try/catch fallback）
   - HTML 源跳过视觉 → Task 6（skipVision 检查）

2. **占位符扫描：** 所有代码块包含完整实现，无 TBD/TODO

3. **类型一致性：**
   - `extract()` 返回 `{ text, images: Buffer[], html?, title, totalPages }` — 一致
   - `tileImages(images, config)` 接收 Buffer[]，返回 `[{ buffer, pages }]` — 一致
   - `callVisionAI(imageGroups, ...)` 接收 imageGroups — 一致
