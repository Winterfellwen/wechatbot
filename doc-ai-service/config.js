const path = require('path');

const config = {
  port: process.env.PORT || 3002,
  dataDir: process.env.DOC_AI_DATA_DIR || '/tmp/doc-ai',
  openrouter: {
    apiKey: process.env.OPENROUTER_KEY || null,
    model: process.env.OPENROUTER_MODEL || 'google/gemma-2-9b-it:free',
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
    maxTokens: 4096,
    timeout: 90000,
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
