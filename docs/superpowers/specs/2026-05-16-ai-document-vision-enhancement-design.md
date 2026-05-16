# AI 文档转换视觉增强设计

## 背景

当前 doc-ai-service 的提取器丢失文档中的图片、表格、文本框和排版布局：
- PDF 提取器（`pdf-parse`）仅返回纯文本
- DOCX 提取器（`mammoth`）返回 HTML 但丢弃图片
- `processJob` 传给 AI 的是 `result.text || result.html`，AI 从未见到结构

目标是让 AI 能"看"到文档的完整视觉布局，并保留所有内容。

## 整体管线

```
源文件
  │
  ├── PDF ──→ pdfjs-dist ──→ 每页截图(JPEG)
  │           pdf-parse ──→ 准确文本（保留作为 text 字段）
  │
  ├── DOCX ─→ mammoth ──→ HTML(含base64图片)
  │           puppeteer ──→ 每页截图(JPEG)
  │
  └──→ 合并输出：{ images[], text, html, title, totalPages, imageGroups }
         │
         ▼
  第一轮：视觉 AI（GLM-4.6V-Flash）
   输入：合并截图(看布局) + 提取文本(准确内容)
   输出：结构化 HTML（保留布局/表格/图片/文本框）
         │
         ▼
  如果模式 = polish/format/summarize：
   第二轮：文本 AI（GLM-4.7-Flash）
   输入：视觉 AI 输出的 HTML
   输出：精修后的 HTML
         │
         ▼
  组装器 → 输出文件
```

## 模块设计

### 1. PDF 提取器（extractors/pdf.js）

- 用 `pdfjs-dist` 替换 `pdf-parse`
- 缩放比例 scale=2，JPEG quality=80，平衡清晰度和大小
- 同时提取文本层（getTextContent），比 pdf-parse 更细粒度
- 输出 `{ text, images: Buffer[], title, totalPages }`

```js
async function extract(filePath) {
  const doc = await pdfjsLib.getDocument(filePath).promise
  const images = []
  const pages = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    // render page to canvas → JPEG buffer
    const textContent = await page.getTextContent()
    const text = textContent.items.map(item => item.str).join(' ')
    images.push(jpegBuf)
    pages.push({ text, pageNum: i })
  }
  return { text: pages.map(p => p.text).join('\n---\n'), images, title: '', totalPages: doc.numPages }
}
```

### 2. DOCX 提取器（extractors/docx.js）

- mammoth 提取 HTML（含 base64 图片）
- puppeteer 渲染 HTML → A4 视口截图
- 按 viewportHeight（1200px）分页，宽度 900px
- 输出 `{ text, html, images: Buffer[], title, totalPages }`

```js
async function extract(filePath) {
  const mammothResult = await mammoth.convertToHtml({ path: filePath })
  const html = mammothResult.value
  const $ = cheerio.load(html)
  const text = $.root().text().replace(/\s+/g, ' ').trim()
  const title = $('h1').first().text() || $('title').text() || ''

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const totalHeight = await page.evaluate(() => document.body.scrollHeight)

  const images = []
  const vh = config.vision.viewportHeight
  for (let y = 0; y < totalHeight; y += vh) {
    const buf = await page.screenshot({
      clip: { x: 0, y, width: config.vision.viewportWidth, height: Math.min(vh, totalHeight - y) },
      type: 'jpeg', quality: 80,
    })
    images.push(buf)
  }
  await browser.close()
  return { text, html, images, title, totalPages: images.length }
}
```

### 3. 图片合并平铺（lib/tiler.js）

提取器输出 `images: Buffer[]`（每页一张），平铺器将其合并为 `imageGroups` 供 AI 调用。

```js
function tileImages(images, { cols = 2, maxPagesPerTile = 4, pageW = 900, pageH = 1200 }) {
  const groups = []
  for (let i = 0; i < images.length; i += maxPagesPerTile) {
    const batch = images.slice(i, i + maxPagesPerTile)
    const rows = Math.ceil(batch.length / cols)
    const canvas = createCanvas(pageW * cols, pageH * rows)
    const ctx = canvas.getContext('2d')
    batch.forEach((buf, idx) => {
      const img = new Image()
      img.src = buf
      const col = idx % cols, row = Math.floor(idx / cols)
      ctx.drawImage(img, col * pageW, row * pageH, pageW, pageH)
    })
    const start = i + 1, end = Math.min(i + maxPagesPerTile, images.length)
    groups.push({ buffer: canvas.toBuffer('image/jpeg', { quality: 80 }), pages: `${start}-${end}` })
  }
  return groups
}
```

- 在 `processJob` 中调用：`const imageGroups = tileImages(result.images)`
- 输出 `imageGroups: [{ buffer: Buffer, pages: '1-4' }, ...]`
- 用 canvas 的 `drawImage` 将多页拼接到大 canvas
- 每张合并图标明包含哪些页（用于 prompt）

```js
// config.vision
{
  tileGrid: { cols: 2 },
  maxPagesPerTile: 4,
}
```

### 4. AI 视觉调用（ai-vision.js）

调用 GLM-4.6V-Flash，传合并截图 + 提取文本。

```js
async function callVisionAI(imageGroups, text, html, sourceFmt, targetFmt, mode, title) {
  const content = [
    { type: 'text', text: buildVisionPrompt(sourceFmt, targetFmt, mode, title, imageGroups) },
    ...imageGroups.map(g => ({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${g.buffer.toString('base64')}` }
    })),
    { type: 'text', text: `提取文本（供参考）：\n\n${text.substring(0, 30000)}` },
  ]

  // 调用 GLM-4.6V-Flash
  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.bigmodel.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.bigmodel.visionModel,
      messages: [{ role: 'user', content }],
      max_tokens: 32000,
      temperature: mode === 'polish' ? 0.3 : mode === 'format' ? 0.2 : 0.5,
    }),
  })
  // 解析 HTML 输出（同 ai.js parseAIResponse）
}
```

#### 视觉 Prompt 设计

```
你是一个文档转换专家。将{sourceFmt}格式文档转换为{targetFmt}格式。
{modeInstructions}

截图说明：本次发送 {totalPages} 页，合并为 {groupCount} 张图：
{imageGroupList，如 "图1:第1-4页，图2:第5-8页"}

请仔细观察截图中的布局、表格、图片、文本框和排版样式。
同时参考提取文本获取准确文字内容。
截图和文本不一致时，以截图视觉布局为准，用文本补充准确文字。

输出完整 HTML（DOCTYPE+html+head+body），保留原始布局和结构。
```

### 5. processJob 串联

```js
async function processJob(jobId) {
  const result = await extractor.extract(job.filePath)

  let aiHtml
  if (result.images?.length > 0 && job.sourceFmt !== 'html') {
    const imageGroups = tileImages(result.images, config.vision)
    aiHtml = await callVisionAI(imageGroups, result.text, result.html || '', ...)
  } else {
    aiHtml = await callAI(result.text || result.html, ...)
  }

  // 第二轮（polish/format/summarize）
  if (job.mode !== 'raw') {
    aiHtml = await callAI(aiHtml, 'html', job.targetFmt, job.mode, result.title || '')
  }

  await assembler.assemble(aiHtml, outPath, result.title || '')
}
```

### 6. 组装器

不变。现有的三个组装器都接收 HTML 字符串，包含完整图片（data URI）和表格标签后，输出自然更丰富。

### 7. 配置变更（config.js）

```js
bigmodel: {
  apiKey: process.env.BIGMODEL_KEY || null,
  model: 'glm-4.7-flash',
  visionModel: 'glm-4.6v-flash',
  apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  maxTokens: 4096,
  timeout: 60000,
  retries: 2,
},
vision: {
  viewportWidth: 900,
  viewportHeight: 1200,
  pdfRenderScale: 2,
  jpegQuality: 80,
  tileGrid: { cols: 2 },
  maxPagesPerTile: 4,
}
```

## 边界情况处理

| 情况 | 处理 |
|------|------|
| 文档超过单次上限 | 平铺合并为最多 N 页/图，分批次发送 |
| canvas 不可用 | 回退到分批轮询（第一批→HTML→第二批添加上下文继续） |
| 视觉模型失败 | 降级到纯文本 AI（现有 callAI），不阻断流程 |
| 二次精修失败 | 返回视觉 HTML 而非报错 |
| 大图超限制 | JPEG quality=80 缩小，单张 <500KB |
| HTML 源 | 跳过视觉（已有 html，转为截图也无视觉增益） |

## 依赖变更

新增依赖：
- `pdfjs-dist`：PDF 渲染（纯 JS，无系统依赖）
- `canvas`：图片合并平铺（可能需要编译，但已有 root 依赖）

现有依赖（已存在，无需变更）：
- `puppeteer`（DOCX 截图 + PDF 组装）
- `mammoth`（DOCX 提取）
- `cheerio`（HTML 处理）
