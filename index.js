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

app.post('/api/users/:openid/wx-login', async (req, res) => {
  try {
    const { openid } = req.params;
    const { code, deviceInfo } = req.body;
    
    const result = await pool.query(
      `INSERT INTO users (openid, nickName, createdAt, updatedAt)
       VALUES ($1, '微信用户', NOW(), NOW())
       ON CONFLICT (openid) DO UPDATE SET updatedAt = NOW()
       RETURNING *`,
      [openid]
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