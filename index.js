const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DATABASE_URL = process.env.DATABASE_URL;

console.log('DATABASE_URL:', DATABASE_URL ? 'set' : 'NOT SET');

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set - using fallback mode');
}

const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
}) : null;

const APP_ID = 'wx2510f82943d7741e';
const APP_SECRET = '2ebc324a6ee1d9baabf7223511006366';

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/wechat/openid', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }
    
    const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${APP_ID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`);
    const data = await response.json();
    
    if (data.errcode) {
      return res.status(400).json({ error: data.errmsg });
    }
    
    res.json({ openid: data.openid, session_key: data.session_key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/init', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'No database' });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        openid VARCHAR(255) PRIMARY KEY,
        nickName VARCHAR(255),
        avatarUrl TEXT,
        gender INTEGER,
        country VARCHAR(100),
        province VARCHAR(100),
        city VARCHAR(100),
        language VARCHAR(50),
        createdAt TIMESTAMP DEFAULT NOW(),
        updatedAt TIMESTAMP DEFAULT NOW()
      )
    `);
    res.json({ status: 'ok', message: 'Users table created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:openid', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }
    const { openid } = req.params;
    const { nickName, avatarUrl } = req.body;
    
    const result = await pool.query(
      `INSERT INTO users (openid, nickName, avatarUrl, createdAt, updatedAt)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (openid) DO UPDATE SET
         nickName = COALESCE(EXCLUDED.nickName, users.nickName),
         avatarUrl = COALESCE(EXCLUDED.avatarUrl, users.avatarUrl),
         updatedAt = NOW()
       RETURNING *`,
      [openid, nickName, avatarUrl || null]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/users/:openid error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:openid', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }
    const { openid } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE openid = $1', [openid]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/users/:openid error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:openid', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }
    const { openid } = req.params;
    
    await pool.query('DELETE FROM users WHERE openid = $1', [openid]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/users/:openid error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:openid/wx-login', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }
    const { openid } = req.params;
    
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const count = parseInt(countResult.rows[0].count) + 1;
    const nickName = '微信用户' + String(count).padStart(3, '0');
    
    const result = await pool.query(
      `INSERT INTO users (openid, nickName, createdAt, updatedAt)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (openid) DO UPDATE SET updatedAt = NOW()
       RETURNING *`,
      [openid, nickName]
    );
    
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Keep Python service warm when this service is active
const KEEPALIVE_INTERVAL = 14 * 60 * 1000;
setInterval(() => {
  console.log('Keepalive: warming Python service');
  fetch('https://pdf-converter-idfi.onrender.com/').catch(() => {});
}, KEEPALIVE_INTERVAL);

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const openrouterKey = process.env.OPENROUTER_KEY;
    
    if (!openrouterKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: messages,
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PDF conversion endpoint - submit job, return job_id immediately (client polls)
fs.mkdirSync('/tmp/uploads', { recursive: true });
fs.mkdirSync('/tmp/serve', { recursive: true });
const upload = multer({ dest: '/tmp/uploads/' });
const pdfServiceUrl = process.env.PDF_SERVICE_URL || 'https://pdf-converter-idfi.onrender.com';

app.post('/api/pdf/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });
  const { from, to } = req.body;
  const toFmt = to || 'docx';

  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileBase64 = fileBuffer.toString('base64');

    // Submit job to Python (returns job_id immediately)
    const submitRes = await fetch(pdfServiceUrl + '/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_base64: fileBase64,
        filename: req.file.originalname || 'file.' + (from || 'pdf'),
        from_fmt: from || 'pdf',
        to_fmt: toFmt
      })
    });
    fs.unlinkSync(req.file.path);

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => 'Unknown error');
      let errMsg = errText;
      try { errMsg = JSON.parse(errText).detail || errText; } catch(e) {}
      return res.status(400).json({ error: errMsg.substring(0, 200) });
    }

    const { job_id } = await submitRes.json();
    // Return job_id immediately; client polls /api/pdf/status/:job_id
    return res.json({ job_id: job_id, status_url: '/api/pdf/status/' + job_id });
  } catch (err) {
    console.error('Convert error:', err.message);
    res.status(500).json({ error: err.message.substring(0, 200) });
  }
});

// Poll job status from Python, download result when ready
app.get('/api/pdf/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  try {
    const statusRes = await fetch(pdfServiceUrl + '/status/' + jobId);
    if (!statusRes.ok) {
      const errText = await statusRes.text().catch(() => 'Unknown error');
      return res.status(502).json({ error: '查询失败: ' + errText.substring(0, 100) });
    }

    const status = await statusRes.json();
    if (status.status === 'pending' || status.status === 'processing') {
      return res.json({ status: 'processing' });
    } else if (status.status === 'done') {
      // Download result from Python and cache locally
      const dlRes = await fetch(pdfServiceUrl + '/download/' + status.result);
      if (!dlRes.ok) return res.status(502).json({ error: '下载转换结果失败' });

      const buffer = await dlRes.arrayBuffer();
      const outFile = '/tmp/serve/conv_' + jobId;
      fs.writeFileSync(outFile, Buffer.from(buffer));
      return res.json({
        status: 'done',
        url: 'https://wechatbot-g6ez.onrender.com/api/pdf/download/' + path.basename(outFile)
      });
    } else if (status.status === 'error') {
      return res.json({ status: 'error', error: status.error || '转换失败' });
    }
    return res.json(status);
  } catch (err) {
    console.error('Status poll error:', err.message);
    res.status(500).json({ error: err.message.substring(0, 200) });
  }
});

app.post('/api/pdf/edit', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });
    const pdfServiceUrl = process.env.PDF_SERVICE_URL || 'https://pdf-converter-idfi.onrender.com';
    const { op, text, angle } = req.body;
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileBase64 = fileBuffer.toString('base64');

    var body = new URLSearchParams();
    body.append('file_base64', fileBase64);
    body.append('op', op || '');
    body.append('text', text || '');
    body.append('angle', angle || '90');

    const pyRes = await fetch(pdfServiceUrl + '/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!pyRes.ok) {
      const err = await pyRes.json();
      return res.status(400).json(err);
    }

    const buffer = await pyRes.arrayBuffer();
    const outFile = '/tmp/serve/edit_' + Date.now() + '.pdf';
    fs.mkdirSync('/tmp/serve', { recursive: true });
    fs.writeFileSync(outFile, Buffer.from(buffer));

    res.json({ url: 'https://wechatbot-g6ez.onrender.com/api/pdf/download/' + path.basename(outFile) });
    fs.unlinkSync(req.file.path);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pdf/download/:filename', (req, res) => {
  const filePath = '/tmp/serve/' + req.params.filename;
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Word import: receive .docx, unzip with zlib, return document.xml text
app.post('/api/word/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });
  try {
    const buf = fs.readFileSync(req.file.path);
    fs.unlinkSync(req.file.path);
    const zip = parseZip(buf);
    const docXml = zip['word/document.xml'];
    if (!docXml) return res.status(400).json({ error: '无效的 DOCX 文件' });
    // Return raw XML text as string
    res.json({ xml: docXml });
  } catch (err) {
    console.error('Word import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Minimal ZIP parser using Node zlib
function parseZip(buf) {
  const files = {};
  let offset = 0;
  const zlib = require('zlib');
  while (offset < buf.length) {
    if (buf[offset] !== 0x50 || buf[offset + 1] !== 0x4B) { offset++; continue; }
    const sig = buf.readUInt16LE(offset + 2);
    if (sig === 0x0403) {
      const nameLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const compSize = buf.readUInt32LE(offset + 18);
      const compMethod = buf.readUInt16LE(offset + 8);
      const name = buf.toString('utf8', offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      const compressed = buf.slice(dataStart, dataStart + compSize);
      const uncompressed = compMethod === 0 ? compressed : zlib.inflateRawSync(compressed);
      files[name] = uncompressed.toString('utf8');
      offset = dataStart + compSize;
    } else if (sig === 0x0201 || sig === 0x0505) {
      break;
    } else {
      offset++;
    }
  }
  return files;
}

