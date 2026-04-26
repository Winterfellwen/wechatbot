const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set - using fallback mode');
}

const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
}) : null;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/users/:openid', async (req, res) => {
  try {
    const { openid } = req.params;
    const { nickName, avatarUrl, gender, country, province, city, language } = req.body;
    
    const result = await pool.query(
      `INSERT INTO users (openid, nickName, avatarUrl, gender, country, province, city, language, createdAt, updatedAt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (openid) DO UPDATE SET
         nickName = COALESCE(EXCLUDED.nickName, users.nickName),
         avatarUrl = COALESCE(EXCLUDED.avatarUrl, users.avatarUrl),
         updatedAt = NOW()
       RETURNING *`,
      [openid, nickName, avatarUrl, gender, country, province, city, language]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:openid', async (req, res) => {
  try {
    const { openid } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE openid = $1', [openid]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:openid/wx-login', async (req, res) => {
  try {
    const { openid } = req.params;
    const { code } = req.body;
    
    const result = await pool.query(
      `INSERT INTO users (openid, nickName, createdAt, updatedAt)
       VALUES ($1, '微信用户', NOW(), NOW())
       ON CONFLICT (openid) DO UPDATE SET updatedAt = NOW()
       RETURNING *`,
      [openid, '微信用户']
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