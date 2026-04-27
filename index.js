const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

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

// PDF conversion endpoint
const multer = require('multer');
const upload = multer({ dest: '/tmp/uploads/' });
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

app.post('/api/pdf/convert', upload.single('file'), async (req, res) => {
  try {
    const { from, to } = req.body;
    const filePath = req.file.path;
    
    if (from === 'pdf' && (to === 'docx' || to === 'doc')) {
      // PDF to DOCX - use a simple approach: extract text and create text file
      // Full conversion would require LibreOffice which isn't available on Render free
      res.json({ error: 'PDF→DOCX需要LibreOffice，免费服务器暂不支持。请使用在线工具。' });
    } else if ((from === 'docx' || from === 'doc') && to === 'pdf') {
      // DOCX to PDF - same limitation
      res.json({ error: 'DOCX→PDF需要LibreOffice，免费服务器暂不支持。请使用在线工具。' });
    } else {
      res.json({ error: '不支持此转换格式' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pdf/edit', upload.single('file'), async (req, res) => {
  try {
    const { op, text, angle } = req.body;
    const filePath = req.file.path;
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    if (op === 'rotate') {
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const currentRotation = page.getRotation().angle || 0;
        page.setRotation({ angle: (currentRotation + parseInt(angle || 90)) % 360 });
      }
    } else if (op === 'watermark') {
      const pages = pdfDoc.getPages();
      const helveticaFont = await pdfDoc.embedFont('Helvetica');
      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(text || 'WATERMARK', {
          x: width / 2 - 100, y: height / 2,
          size: 30, font: helveticaFont,
          opacity: 0.3, color: { red: 0.5, green: 0.5, blue: 0.5 }
        });
      }
    } else if (op === 'merge') {
      res.json({ error: '合并需要两个文件，请分别上传' });
      return;
    }
    
    const modifiedPdfBytes = await pdfDoc.save();
    const outputPath = '/tmp/output_' + Date.now() + '.pdf';
    fs.writeFileSync(outputPath, modifiedPdfBytes);
    const downloadUrl = 'https://wechatbot-api.onrender.com/api/pdf/download/' + path.basename(outputPath);
    // Move file to serve location
    const servePath = '/tmp/serve/' + path.basename(outputPath);
    fs.mkdirSync('/tmp/serve', { recursive: true });
    fs.renameSync(outputPath, servePath);
    res.json({ url: downloadUrl });
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

const path = require('path');