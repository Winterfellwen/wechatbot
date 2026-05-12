const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const app = express();
app.set('trust proxy', 'loopback');
app.use(cors());
app.use(express.json());

// Retry helper with timeout (default 3 minutes)
async function retryWithTimeout(fn, timeoutMs = 180000, retryIntervalMs = 3000) {
  const start = Date.now();
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const elapsed = Date.now() - start;
      if (elapsed >= timeoutMs) throw err;
      await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
    }
  }
}

const DATABASE_URL = config.database.url;

// Root health check (for Render keepalive)
app.all('/', (req, res) => res.json({ status: 'ok', service: 'wechatbot-api' }));

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

const WECHAT_APP_ID = config.wechat.appId;
const WECHAT_APP_SECRET = config.wechat.appSecret;

console.log('APP_SECRET:', WECHAT_APP_SECRET ? 'set' : 'NOT SET');

// Avatar upload
const avatarUpload = multer({ dest: config.storage.uploadDir + '/avatars' });
app.post('/api/upload/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    var ext = path.extname(req.file.originalname) || '.jpg';
    var newName = 'avatar_' + req.user.openid + '_' + Date.now() + ext;
    var destPath = config.storage.serveDir + '/' + newName;
    fs.renameSync(req.file.path, destPath);
    var avatarUrl = `${req.protocol}://${req.get('host')}/api/avatar/${newName}`;
    await pool.query('UPDATE users SET avatarUrl = $1, updatedAt = NOW() WHERE openid = $2', [avatarUrl, req.user.openid]);
    res.json({ avatarUrl: avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/avatar/:filename', (req, res) => {
  var filePath = config.storage.serveDir + '/' + req.params.filename;
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
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
      'https://api.weixin.qq.com/sns/jscode2session?appid=' + WECHAT_APP_ID +
        '&secret=' + WECHAT_APP_SECRET + '&js_code=' + code + '&grant_type=authorization_code'
    );
    var wxData = await wxRes.json();
    if (wxData.errcode) return res.status(400).json({ error: wxData.errmsg });
    var openid = wxData.openid;

    var userResult = await pool.query('SELECT * FROM users WHERE openid = $1', [openid]);

    var user, token;
    if (userResult.rows.length > 0) {
      var existing = userResult.rows[0];
      if (existing.deleted) {
        token = generateToken();
        await pool.query('UPDATE users SET deleted = false, token = $1, updatedAt = NOW() WHERE openid = $2', [token, openid]);
        var updatedResult = await pool.query('SELECT * FROM users WHERE openid = $1', [openid]);
        user = updatedResult.rows[0];
      } else {
        token = generateToken();
        await pool.query('UPDATE users SET token = $1 WHERE openid = $2', [token, openid]);
        user = existing;
      }
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
    await pool.query('UPDATE users SET deleted = true, token = NULL WHERE openid = $1', [req.user.openid]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Japanese lesson scores
app.post('/api/jp/lesson-scores', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    var { lessonId, score, total } = req.body;
    if (!lessonId || score == null || !total) return res.status(400).json({ error: 'Missing fields' });
    if (score <= 0) return res.json({ ok: true, message: 'Score not saved (zero or negative)' });

    var percentage = Math.round(score / total * 100);
    var result = await pool.query(
      `INSERT INTO jp_lesson_scores (openid, lesson_id, score, total, percentage, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT(openid, lesson_id)
       DO UPDATE SET score = EXCLUDED.score, total = EXCLUDED.total, percentage = EXCLUDED.percentage, updated_at = NOW()
       WHERE EXCLUDED.score > jp_lesson_scores.score
       RETURNING *`,
      [req.user.openid, lessonId, score, total, percentage]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jp/lesson-scores', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    var result = await pool.query(
      'SELECT lesson_id, score, total, percentage FROM jp_lesson_scores WHERE openid = $1',
      [req.user.openid]
    );
    res.json({ scores: result.rows });
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
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS token VARCHAR(64)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false');

    // Japanese lesson scores table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jp_lesson_scores (
        id SERIAL PRIMARY KEY,
        openid VARCHAR(255) REFERENCES users(openid),
        lesson_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percentage INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(openid, lesson_id)
      )
    `);
    res.json({ status: 'ok', message: 'Users table ready' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-init DB on startup
async function initDB() {
  if (!pool) { console.log('No DB - skip init'); return; }
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
        createdAt TIMESTAMP DEFAULT NOW(),
        updatedAt TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS token VARCHAR(64)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false');

    // Japanese lesson scores table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jp_lesson_scores (
        id SERIAL PRIMARY KEY,
        openid VARCHAR(255) REFERENCES users(openid),
        lesson_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percentage INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(openid, lesson_id)
      )
    `);
    console.log('DB initialized');
  } catch (err) {
    console.error('DB init error:', err.message);
  }
}
initDB();

const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Keep Python service warm when this service is active
const KEEPALIVE_INTERVAL = config.pdfService.keepaliveInterval;
setInterval(() => {
  console.log('Keepalive: warming Python service');
  fetch(config.pdfService.url + '/').catch(() => {});
}, KEEPALIVE_INTERVAL);

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    const openrouterKey = config.openrouter.apiKey;
    
    if (!openrouterKey) {
      return res.status(500).json({ error: { message: 'OpenRouter API key not configured', code: 500 } });
    }

    const chatModel = config.openrouter.model;
    const apiUrl = config.openrouter.apiUrl + '/chat/completions';

    // Detect if any message contains image content
    const hasImage = messages.some(m =>
      Array.isArray(m.content) && m.content.some(c => c.type === 'image_url')
    );

    const requestBody = {
      model: chatModel,
      messages: messages,
      max_tokens: hasImage ? 1024 : config.openrouter.maxTokens
    };

    console.log('Chat request - model:', chatModel, 'hasImage:', hasImage);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wechatbot-g6ez.onrender.com',
        'X-Title': 'SmartTeacherBot'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    // If OpenRouter returned an error, forward it with proper status code
    if (data.error) {
      const errMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
      console.error('OpenRouter error:', response.status, errMsg);
      return res.status(response.status >= 400 ? response.status : 500).json({
        error: { message: errMsg, code: response.status }
      });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: { message: err.message, code: 500 } });
  }
});

// PDF conversion endpoint - submit job, return job_id immediately (client polls)
fs.mkdirSync(config.storage.uploadDir, { recursive: true });
fs.mkdirSync(config.storage.serveDir, { recursive: true });
const upload = multer({ dest: config.storage.uploadDir + '/' });
const pdfServiceUrl = config.pdfService.url;

app.post('/api/pdf/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });
  const { from, to } = req.body;
  const toFmt = to || 'docx';

    try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileBase64 = fileBuffer.toString('base64');

    // Submit job to Python with retry (3 min timeout)
    const submitRes = await retryWithTimeout(async () => {
      const res = await fetch(pdfServiceUrl + '/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_base64: fileBase64,
          filename: req.file.originalname || 'file.' + (from || 'pdf'),
          from_fmt: from || 'pdf',
          to_fmt: toFmt
        })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(errText);
      }
      return res;
    }, 180000, 5000);
    
    fs.unlinkSync(req.file.path);

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
    const statusRes = await retryWithTimeout(async () => {
      const res = await fetch(pdfServiceUrl + '/status/' + jobId);
      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error('查询失败: ' + errText.substring(0, 100));
      }
      return res;
    }, 180000, 5000);

    const status = await statusRes.json();
    if (status.status === 'pending' || status.status === 'processing') {
      return res.json({ status: 'processing' });
    } else if (status.status === 'done') {
      // Download result from Python and cache locally
      const dlRes = await retryWithTimeout(async () => {
        const res = await fetch(pdfServiceUrl + '/download/' + status.result);
        if (!res.ok) throw new Error('下载转换结果失败');
        return res;
      }, 180000, 5000);

      const buffer = await dlRes.arrayBuffer();
      // Verify file header to avoid "bad magic number" errors
      const header = Buffer.from(buffer.slice(0, 8)).toString('ascii');
      const isPdf = header.startsWith('%PDF');
      const isZip = header.startsWith('PK'); // DOCX, XLSX, etc.
      if (!isPdf && !isZip) {
        console.error('Invalid file header from Python:', header);
        return res.json({ status: 'error', error: '转换结果格式无效，请重试' });
      }
      const outFile = config.storage.serveDir + '/conv_' + jobId;
      fs.writeFileSync(outFile, Buffer.from(buffer));
      return res.json({
        status: 'done',
         url: `${req.protocol}://${req.get('host')}/api/pdf/download/${path.basename(outFile)}`
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
    const pdfServiceUrl = config.pdfService.url;
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
    const outFile = config.storage.serveDir + '/edit_' + Date.now() + '.pdf';
    fs.mkdirSync(config.storage.serveDir, { recursive: true });
    fs.writeFileSync(outFile, Buffer.from(buffer));

     res.json({ url: `${req.protocol}://${req.get('host')}/api/pdf/download/${path.basename(outFile)}` });
    fs.unlinkSync(req.file.path);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pdf/download/:filename', (req, res) => {
  const filePath = config.storage.serveDir + '/' + req.params.filename;
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

// Azure TTS API - Get API key for frontend
app.get('/api/tts/key', (req, res) => {
  const key = config.azureTts.apiKey;
  if (!key) {
    return res.status(500).json({ error: 'API key not configured' });
  }
  res.json({ key: key, region: config.azureTts.region });
});

// Frontend config API - Provide frontend with necessary config
app.get('/api/config', (req, res) => {
  res.json({
    ttsKeyUrl: config.frontend.ttsKeyUrl,
    apiBaseUrl: config.frontend.apiBaseUrl
  });
});

// Azure TTS API for German pronunciation
app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang } = req.body;
    const subscriptionKey = config.azureTts.apiKey;
    if (!subscriptionKey) {
      return res.status(500).json({ error: 'Azure speech key not configured' });
    }
    const region = config.azureTts.region;
    
    // Get voice based on language
    const voiceName = config.azureTts.voiceMap[lang || 'de-DE'] || 'de-DE-ConradNeural';
    
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
    const filePath = config.storage.serveDir + '/' + fileName;
    fs.mkdirSync(config.storage.serveDir, { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(audioBuffer));

     res.json({ 
       audioUrl: `${req.protocol}://${req.get('host')}/api/tts/download/${fileName}` 
     });
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tts/download/:filename', (req, res) => {
  const filePath = config.storage.serveDir + '/' + req.params.filename;
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

