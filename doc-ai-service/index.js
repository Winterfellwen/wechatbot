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
