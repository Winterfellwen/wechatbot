const path = require('path');

const config = {
  port: process.env.PORT || 3002,
  dataDir: process.env.DOC_AI_DATA_DIR || '/tmp/doc-ai',
  bigmodel: {
    apiKey: process.env.BIGMODEL_KEY || null,
    model: process.env.BIGMODEL_MODEL || 'glm-4.7-flash',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    maxTokens: 4096,
    timeout: 60000,
    retries: 2,
    visionModel: process.env.BIGMODEL_VISION_MODEL || 'glm-4.6v-flash',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_KEY || null,
    model: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free',
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
    maxTokens: 4096,
    timeout: 180000,
    retries: 3,
  },
  limits: {
    fileSize: 20 * 1024 * 1024,
    allowedExts: ['.pdf', '.docx', '.html'],
  },
  vision: {
    viewportWidth: 900,
    viewportHeight: 1200,
    pdfRenderScale: 2,
    jpegQuality: 80,
    tileGrid: { cols: 2 },
    maxPagesPerTile: 4,
  },
};

config.uploadsDir = path.join(config.dataDir, 'uploads');
config.outputsDir = path.join(config.dataDir, 'outputs');
config.jobsFile = path.join(config.dataDir, 'jobs.json');

module.exports = config;
