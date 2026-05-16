// Polyfills for canvas + pdfjs-dist (Node 20 compatibility)
if (!Promise.withResolvers) {
  Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}
// Must set canvas globals BEFORE pdfjs-dist is loaded
const _canvas = require('canvas');
const _setGlobal = (name, val) => {
  if (!globalThis[name]) globalThis[name] = val;
  if (!global[name]) global[name] = val;
};
_setGlobal('ImageData', _canvas.ImageData);
_setGlobal('Image', _canvas.Image);
_setGlobal('HTMLImageElement', _canvas.Image);
_setGlobal('Canvas', _canvas.Canvas);
_setGlobal('HTMLCanvasElement', _canvas.Canvas);

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('./config');
const { createQueue } = require('./queue');
const pdfExtractor = require('./extractors/pdf');
const docxExtractor = require('./extractors/docx');
const htmlExtractor = require('./extractors/html');
const htmlAssembler = require('./assemblers/html');
const docxAssembler = require('./assemblers/docx');
const pdfAssembler = require('./assemblers/pdf');
const { callAI } = require('./ai');
const { tileImages } = require('./lib/tiler');
const { callVisionAI } = require('./ai-vision');

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

let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD', { timeout: 3000 }).toString().trim();
} catch (_) {}

function injectExtractedImages(html, images) {
  if (!images || images.length === 0) return html;
  const cheerio = require('cheerio');
  const $ = cheerio.load(html, null, false);
  const imgTags = $('img');

  // Replace AI-placed <img> tags with actual images
  imgTags.each((i) => {
    if (i < images.length) {
      const dataUri = `data:image/jpeg;base64,${images[i].toString('base64')}`;
      $(imgTags[i]).attr('src', dataUri);
    }
  });

  // If AI placed fewer images than available, inject remaining at logical positions
  if (imgTags.length < images.length) {
    // Try <body> first, then fall back to root element
    let container = $('body');
    if (container.length === 0) {
      container = $.root();
    }
    if (container.length > 0) {
      for (let i = imgTags.length; i < images.length; i++) {
        const dataUri = `data:image/jpeg;base64,${images[i].toString('base64')}`;
        container.append(`<img src="${dataUri}" alt="Document image ${i+1}" style="max-width:400px;display:block;margin:10px auto;" />`);
      }
    }
  }

  // Return only the body content to avoid double-wrapping when assembler adds its own HTML structure
  const bodyContent = $('body').length > 0 ? $('body').html() : $.html();
  return bodyContent;
}

function needsVision(result, sourceFmt) {
  if (sourceFmt === 'html' || !result.images || result.images.length === 0) return false;
  if (result.totalPages > 1) return true;
  if (result.text && /\t|\|{2,}| {4,}/.test(result.text)) return true;
  return false;
}

async function processJob(jobId) {
  const job = queue.getJob(jobId);
  if (!job) throw new Error('Job not found');

  console.log(`[process] job=${jobId} ${job.sourceFmt}→${job.targetFmt} mode=${job.mode}`);

  const extractor = extractors[job.sourceFmt];
  if (!extractor) throw new Error(`Unsupported source format: ${job.sourceFmt}`);

  const result = await extractor.extract(job.filePath);

  // Pass image info to AI so it knows where to place <img> tags
  const imageInfo = result.images && result.images.length > 0
    ? { count: result.images.length }
    : null;

  // Single text AI call (mode instructions baked into prompt)
  let aiHtml = await callAI(result.text || result.html, job.sourceFmt, job.targetFmt, job.mode, result.title || '', imageInfo);

  // Optional vision post-processing (only for complex layout docs)
  if (needsVision(result, job.sourceFmt)) {
    try {
      const imageGroups = await tileImages(result.images, config.vision);
      console.log(`[process] vision enhancement: ${result.totalPages} pages → ${imageGroups.length} tile groups`);
      aiHtml = await callVisionAI(
        imageGroups, result.text, aiHtml,
        job.sourceFmt, job.targetFmt, job.mode, result.title || '', result.totalPages
      );
      queue.updateJob(jobId, { visionNotice: '视觉精修已完成' });
    } catch (err) {
      console.error(`[process] vision enhancement failed, using text AI result:`, err.message);
      queue.updateJob(jobId, { visionNotice: `跳过视觉精修: ${err.message.substring(0, 100)}` });
    }
  }

  // Inject actual extracted images into AI-generated <img> tags
  if (result.images && result.images.length > 0) {
    aiHtml = injectExtractedImages(aiHtml, result.images);
  }

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
    if (!['raw', 'polish', 'format', 'summarize'].includes(mode)) return res.status(400).json({ error: 'AI 模式无效' });

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
  if (job.visionNotice) resp.visionNotice = job.visionNotice;
  res.json(resp);
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.resolve(config.outputsDir, req.params.filename);
  if (!filePath.startsWith(path.resolve(config.outputsDir))) return res.status(403).json({ error: 'Forbidden' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

app.all('/', (req, res) => res.json({ status: 'ok', service: 'doc-ai-service' }));
app.all('/health', (req, res) => res.json({ status: 'ok', service: 'doc-ai-service', commit: commitHash }));

app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: '文件大小超过限制（最大 20MB）' });
  res.status(500).json({ error: err.message || 'Internal error' });
});

module.exports = { processJob };

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`doc-ai-service running on port ${PORT} (commit ${commitHash})`);
  queue.resumePending();
});
