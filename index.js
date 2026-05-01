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

// --- Auth helpers ---
function generateToken() {
  var chars = 'abcdef0123456789';
  var token = '';
  for (var i = 0; i < 32; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

async function requireAuth(req, res, next) {
  var authHeader = req.headers.authorization || '';
  var token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !pool) return res.status(401).json({ error: 'Unauthorized' });
  try {
    var result = await pool.query('SELECT * FROM users WHERE token = $1', [token]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

console.log('DATABASE_URL:', DATABASE_URL ? 'set' : 'NOT SET');

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set - using fallback mode');
}

const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
}) : null;

const APP_ID = process.env.WECHAT_APP_ID;
const APP_SECRET = process.env.WECHAT_APP_SECRET;

console.log('WECHAT_APP_ID:', APP_ID ? APP_ID.substring(0, 6) + '...' : 'NOT SET');
console.log('WECHAT_APP_SECRET:', APP_SECRET ? 'set (length=' + APP_SECRET.length + ')' : 'NOT SET');

app.get('/api/debug/env', (req, res) => {
  res.json({
    appIdSet: !!APP_ID,
    appIdLen: APP_ID ? APP_ID.length : 0,
    appSecretSet: !!APP_SECRET,
    appSecretLen: APP_SECRET ? APP_SECRET.length : 0,
    dbSet: !!DATABASE_URL
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Auth routes ---

app.post('/api/auth/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    var code = req.body.code;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    var wxRes = await fetch(
      'https://api.weixin.qq.com/sns/jscode2session?appid=' + APP_ID +
      '&secret=' + APP_SECRET + '&js_code=' + code + '&grant_type=authorization_code'
    );
    var wxData = await wxRes.json();
    if (wxData.errcode) return res.status(400).json({ error: wxData.errmsg });
    var openid = wxData.openid;

    var userResult = await pool.query('SELECT * FROM users WHERE openid = $1', [openid]);

    var user, token;
    if (userResult.rows.length > 0) {
      token = generateToken();
      await pool.query('UPDATE users SET token = $1 WHERE openid = $2', [token, openid]);
      user = userResult.rows[0];
    } else {
      var countResult = await pool.query('SELECT COUNT(*) FROM users');
      var count = parseInt(countResult.rows[0].count) + 1;
      var nickName = '微信用户' + String(count).padStart(3, '0');
      token = generateToken();
      var insertResult = await pool.query(
        'INSERT INTO users (openid, nickName, token, createdAt, updatedAt) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
        [openid, nickName, token]
      );
      user = insertResult.rows[0];
    }

    res.json({
      token: token,
      user: { openid: user.openid, nickName: user.nickname, avatarUrl: user.avatarurl || '' }
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET token = NULL WHERE openid = $1', [req.user.openid]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/me', requireAuth, async (req, res) => {
  res.json({ openid: req.user.openid, nickName: req.user.nickname, avatarUrl: req.user.avatarurl || '' });
});

app.put('/api/users/me', requireAuth, async (req, res) => {
  try {
    var result = await pool.query(
      'UPDATE users SET nickName = COALESCE($1, nickName), avatarUrl = COALESCE($2, avatarUrl), updatedAt = NOW() WHERE openid = $3 RETURNING *',
      [req.body.nickName || null, req.body.avatarUrl || null, req.user.openid]
    );
    var u = result.rows[0];
    res.json({ openid: u.openid, nickName: u.nickname, avatarUrl: u.avatarurl || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/me', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE openid = $1', [req.user.openid]);
    res.json({ ok: true });
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
        token VARCHAR(64),
        gender INTEGER,
        country VARCHAR(100),
        province VARCHAR(100),
        city VARCHAR(100),
        language VARCHAR(50),
        createdAt TIMESTAMP DEFAULT NOW(),
        updatedAt TIMESTAMP DEFAULT NOW()
      )
    `);
    // Add token column to existing tables that don't have it
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS token VARCHAR(64)');
    res.json({ status: 'ok', message: 'Users table ready' });
  } catch (err) {
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
      const flags = buf.readUInt16LE(offset + 6); // general purpose bit flag
      const hasDataDescriptor = (flags & 0x0008) !== 0;
      const name = buf.toString('utf8', offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      let compressed;
      let newOffset;
      if (hasDataDescriptor) {
        // Find the data descriptor signature (0x08074b50) after the file data
        let searchStart = dataStart;
        // Safety limit to avoid infinite loop
        const maxSearch = Math.min(buf.length, searchStart + 1024 * 1024); // 1MB max search
        let descSigPos = -1;
        for (let i = searchStart; i <= maxSearch - 4; i++) {
          if (buf[i] === 0x50 && buf[i + 1] === 0x4B && buf[i + 2] === 0x07 && buf[i + 3] === 0x08) {
            descSigPos = i;
            break;
          }
        }
        if (descSigPos === -1) {
          // Fallback: assume compSize is correct (should not happen)
          compressed = buf.slice(dataStart, dataStart + compSize);
          newOffset = dataStart + compSize;
        } else {
          // compressed data is from dataStart up to descriptor signature
          compressed = buf.slice(dataStart, descSigPos);
          // skip descriptor: signature (4) + crc (4) + compressed size (4) + uncompressed size (4)
          newOffset = descSigPos + 4 + 4 + 4 + 4;
        }
      } else {
        compressed = buf.slice(dataStart, dataStart + compSize);
        newOffset = dataStart + compSize;
      }
      const uncompressed = compMethod === 0 ? compressed : zlib.inflateRawSync(compressed);
      files[name] = uncompressed.toString('utf8');
      offset = newOffset;
    } else if (sig === 0x0201 || sig === 0x0505) {
      break;
    } else {
      offset++;
    }
  }
  return files;
}

// Azure TTS API for German pronunciation
app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang } = req.body;
    const subscriptionKey = process.env.AZURE_SPEECH_KEY;
    if (!subscriptionKey) {
      return res.status(500).json({ error: 'Azure speech key not configured' });
    }
    const region = 'eastasia';
    
    // Use German voice
    const voiceName = lang === 'de-DE' ? 'de-DE-ConradNeural' : 'de-DE-ConradNeural';
    
    const response = await fetch(`https://${region}.api.cognitive.microsoft.com/cognitiveservices/v3.0/tts`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/ssml+xml'
      },
      body: `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang || 'de-DE'}'>
        <voice name='${voiceName}'>
          ${text}
        </voice>
      </speak>`
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('TTS API error:', error);
      return res.status(500).json({ error: 'TTS error: ' + error });
    }

    const audioBuffer = await response.arrayBuffer();
    const fileName = 'tts_' + Date.now() + '.mp3';
    const filePath = '/tmp/serve/' + fileName;
    fs.mkdirSync('/tmp/serve', { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(audioBuffer));

    res.json({ 
      audioUrl: 'https://wechatbot-g6ez.onrender.com/api/tts/download/' + fileName 
    });
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tts/download/:filename', (req, res) => {
  const filePath = '/tmp/serve/' + req.params.filename;
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

