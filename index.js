const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const demoMenus = require('./ai-order/data/demo-menus.json');
const http = require('http');
const { WebSocketServer } = require('ws');

const ociConfig = config.oci;

function ociMenuUrl(userId, merchantId) {
  return `${ociConfig.baseUrl}/menus/${userId}/${merchantId}.json`;
}

function getOciClient() {
  const common = require('oci-common');
  const os = require('oci-objectstorage');
  const fs = require('fs');
  const path = require('path');
  const os2 = require('os');
  const home = os2.homedir();
  // Try config file paths
  const configPaths = [];
  if (process.env.OCI_CONFIG_FILE) configPaths.push(process.env.OCI_CONFIG_FILE);
  configPaths.push(path.join(home, '.oci', 'config'), './oci-config');
  for (const p of configPaths) {
    try {
      if (fs.existsSync(p)) return new os.ObjectStorageClient({ authenticationDetailsProvider: new common.ConfigFileAuthenticationDetailsProvider(p) });
    } catch (_) {}
  }
  try { return new os.ObjectStorageClient({ authenticationDetailsProvider: new common.ConfigFileAuthenticationDetailsProvider() }); } catch (_) {}
  // Fallback: write a temporary config from env vars
  const user = process.env.OCI_USER_OCID;
  const tenancy = process.env.OCI_TENANCY_OCID;
  const fingerprint = process.env.OCI_FINGERPRINT;
  const pk = process.env.OCI_PRIVATE_KEY;
  const region = process.env.OCI_REGION || 'ap-singapore-1';
  if (user && tenancy && fingerprint && pk) {
    const keyFile = path.join(os2.tmpdir(), 'oci_key.pem');
    fs.writeFileSync(keyFile, pk, 'utf8');
    const configContent = `[DEFAULT]\nuser=${user}\nfingerprint=${fingerprint}\ntenancy=${tenancy}\nregion=${region}\nkey_file=${keyFile}\n`;
    const configFile = path.join(os2.tmpdir(), 'oci_config');
    fs.writeFileSync(configFile, configContent, 'utf8');
    return new os.ObjectStorageClient({ authenticationDetailsProvider: new common.ConfigFileAuthenticationDetailsProvider(configFile) });
  }
  throw new Error('OCI credentials not configured');
}

function ociSaveMenu(userId, merchantId, menuData) {
  const os = require('oci-objectstorage');
  const { Readable } = require('stream');
  const client = getOciClient();
  const tenancyId = client._authProvider.getTenantId();
  return client.getNamespace({ compartmentId: tenancyId }).then(nsResp => {
    const ns = nsResp.value;
    const key = `menus/${userId}/${merchantId}.json`;
    const body = JSON.stringify(menuData, null, 2);
    return client.putObject({
      namespaceName: ns,
      bucketName: ociConfig.bucketName,
      objectName: key,
      putObjectBody: Readable.from([body]),
      contentLength: Buffer.byteLength(body),
      contentLanguage: 'zh-CN'
    }).then(() => ({
      url: `${ociConfig.baseUrl}/${key}`
    }));
  });
}

const app = express();
app.set('trust proxy', 'loopback');
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(err, req, res, next) {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: '请求体过大（超过10MB限制），图片请压缩后再试', code: 413 } });
  }
  next(err);
});

// Retry helper with overall timeout (default 3 minutes)
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

// Fetch wrapper with per-request timeout (AbortController) — prevents hanging retries
async function fetchWithTimeout(resource, options = {}, requestTimeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Root health check (for Render keepalive)
app.all('/', (req, res) => res.json({ status: 'ok', service: 'wechatbot-api' }));
app.all('/api/health', (req, res) => res.json({ status: 'ok', service: 'wechatbot-api' }));

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
    var [rows] = await pool.query('SELECT * FROM users WHERE token = ?', [token]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid token' });
    req.user = rows[0];
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

var db = config.database;
console.log('MYSQL_HOST:', db.host ? 'set (' + db.host + ':' + db.port + ')' : 'NOT SET');

if (!db.host || !db.password) {
  console.error('MySQL connection not configured - using fallback mode');
}

const pool = (db.host && db.password) ? mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  ssl: db.ssl,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
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
    await pool.query('UPDATE users SET avatarUrl = ?, updatedAt = NOW() WHERE openid = ?', [avatarUrl, req.user.openid]);
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

    var [userRows] = await pool.query('SELECT * FROM users WHERE openid = ?', [openid]);

    var user, token;
    if (userRows.length > 0) {
      var existing = userRows[0];
      token = generateToken();
      await pool.query('UPDATE users SET token = ? WHERE openid = ?', [token, openid]);
      user = existing;
    } else {
      var [countResult] = await pool.query('SELECT COUNT(*) AS cnt FROM users');
      var count = parseInt(countResult[0].cnt) + 1;
      var nickName = '微信用户' + String(count).padStart(3, '0');
      token = generateToken();
      await pool.query(
        'INSERT INTO users (openid, nickName, token, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
        [openid, nickName, token]
      );
      user = { openid, nickname: nickName, token, avatarurl: '' };
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
    await pool.query('UPDATE users SET token = NULL WHERE openid = ?', [req.user.openid]);
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
    await pool.query(
      'UPDATE users SET nickName = COALESCE(?, nickName), avatarUrl = COALESCE(?, avatarUrl), updatedAt = NOW() WHERE openid = ?',
      [req.body.nickName || null, req.body.avatarUrl || null, req.user.openid]
    );
    var [uRows] = await pool.query('SELECT * FROM users WHERE openid = ?', [req.user.openid]);
    var u = uRows[0];
    res.json({ openid: u.openid, nickName: u.nickname, avatarUrl: u.avatarurl || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/me', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM jp_lesson_scores WHERE openid = ?', [req.user.openid]);
    await conn.query('DELETE FROM users WHERE openid = ?', [req.user.openid]);
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
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
    await pool.query(
      `INSERT INTO jp_lesson_scores (openid, lesson_id, score, total, percentage, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         score = IF(VALUES(score) > score, VALUES(score), score),
         total = IF(VALUES(score) > score, VALUES(total), total),
         percentage = IF(VALUES(score) > score, VALUES(percentage), percentage),
         updated_at = IF(VALUES(score) > score, NOW(), updated_at)`,
      [req.user.openid, lessonId, score, total, percentage]
    );
    var [dataRows] = await pool.query(
      'SELECT * FROM jp_lesson_scores WHERE openid = ? AND lesson_id = ?',
      [req.user.openid, lessonId]
    );
    res.json({ ok: true, data: dataRows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jp/lesson-scores', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    var [rows] = await pool.query(
      'SELECT lesson_id, score, total, percentage FROM jp_lesson_scores WHERE openid = ?',
      [req.user.openid]
    );
    res.json({ scores: rows });
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
        createdAt DATETIME DEFAULT NOW(),
        updatedAt DATETIME DEFAULT NOW()
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // MySQL lacks ADD COLUMN IF NOT EXISTS, check information_schema
    var [colCheck] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted'"
    );
    if (colCheck.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN deleted TINYINT(1) DEFAULT 0');
    }

    // Japanese lesson scores table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jp_lesson_scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openid VARCHAR(255),
        lesson_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percentage INTEGER,
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW(),
        UNIQUE(openid, lesson_id),
        FOREIGN KEY (openid) REFERENCES users(openid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    res.json({ status: 'ok', message: 'Tables ready' });
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
        createdAt DATETIME DEFAULT NOW(),
        updatedAt DATETIME DEFAULT NOW()
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    var [colCheck] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted'"
    );
    if (colCheck.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN deleted TINYINT(1) DEFAULT 0');
    }

    // Japanese lesson scores table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jp_lesson_scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openid VARCHAR(255),
        lesson_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percentage INTEGER,
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW(),
        UNIQUE(openid, lesson_id),
        FOREIGN KEY (openid) REFERENCES users(openid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('DB initialized');
  } catch (err) {
    console.error('DB init error:', err.message);
  }
}
initDB();

// --- AI 点菜 API ---

// 获取 AI 配置
app.get('/api/ai-order/config', (req, res) => {
  const aiOrderConfig = config.aiOrder;
  if (!aiOrderConfig || !aiOrderConfig.apiKey) {
    return res.status(500).json({ error: 'AI Order API key not configured' });
  }
  res.json({
    key: aiOrderConfig.apiKey,
    model: aiOrderConfig.model,
    apiUrl: aiOrderConfig.apiUrl,
    maxTokens: aiOrderConfig.maxTokens
  });
});

// AI 点菜对话接口
app.post('/api/ai-order/chat', async (req, res) => {
  try {
    const { mode, merchantId, messages, menuData } = req.body;
    const aiOrderConfig = config.aiOrder;

    if (!aiOrderConfig || !aiOrderConfig.apiKey) {
      return res.status(500).json({ error: { message: 'AI Order API key not configured', code: 500 } });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: { message: 'Messages array is required and must not be empty', code: 400 } });
    }

    // 根据模式构建系统提示
    let systemPrompt = '';
    if (mode === 'merchant') {
      systemPrompt = '你是餐厅菜单管理助手。帮助商家添加、删除、更新菜品。' +
        '必需信息：菜品名、价格。可选信息：图片、描述、口味、辣度(0-5)。' +
        '添加/删除/更新前需要商家确认。' +
        '用中文回答，语气专业友好。';
    } else {
      systemPrompt = '你是智能点菜助手。你只能从下方提供的当前菜单中推荐菜品，绝不能推荐菜单外的菜品。' +
        '根据用户口味偏好推荐菜品，推荐时要说明推荐理由。' +
        '用户确认后生成虚拟订单。' +
        '用中文回答，语气热情友好。';
    }

    // 将菜单数据加入系统提示
    if (menuData && menuData.dishes) {
      const onlineDishes = menuData.dishes.filter(d => d.status === 'online');
      systemPrompt += '\n\n当前菜单：' + JSON.stringify(onlineDishes.map(d => ({
        name: d.name,
        price: d.price,
        taste: d.taste,
        spicyLevel: d.spicyLevel,
        description: d.description
      })));
    }

    const apiMessages = [{ role: 'system', content: systemPrompt }].concat(messages);

    const requestBody = {
      model: aiOrderConfig.model,
      messages: apiMessages,
      max_tokens: aiOrderConfig.maxTokens
    };

    const response = await fetchWithTimeout(aiOrderConfig.apiUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiOrderConfig.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wechatbot-api-sg.onrender.com',
        'X-Title': 'AIOrderBot'
      },
      body: JSON.stringify(requestBody)
    }, 30000);

    const data = await response.json();

    if (data.error) {
      const errMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
      console.error('AI Order API error:', response.status, errMsg);
      return res.status(response.status >= 400 ? response.status : 500).json({
        error: { message: errMsg, code: response.status }
      });
    }

    res.json(data);
  } catch (err) {
    console.error('AI Order chat error:', err);
    res.status(500).json({ error: { message: err.message, code: 500 } });
  }
});

// 获取菜单（demo → OCI → 空）
app.get('/api/ai-order/menu/list', async (req, res) => {
  const merchantId = req.query.merchantId;
  if (!merchantId) {
    return res.status(400).json({ success: false, error: 'merchantId required' });
  }
  const demoMerchant = demoMenus.merchants.find(m => m.id === merchantId);
  if (demoMerchant) {
    return res.json({ success: true, data: demoMerchant, source: 'demo' });
  }
  try {
    const ociUrl = ociMenuUrl('default', merchantId);
    const resp = await fetch(ociUrl);
    if (resp.ok) {
      const data = await resp.json();
      return res.json({ success: true, data, source: 'oci' });
    }
  } catch (_) {}
  res.json({ success: true, data: { id: merchantId, name: '未知商家', dishes: [] }, source: 'empty' });
});

// 返回 OCI URL（客户端直读）
app.get('/api/ai-order/menu/oci-url', (req, res) => {
  const merchantId = req.query.merchantId;
  if (!merchantId) return res.status(400).json({ success: false, error: 'merchantId required' });
  const demoMerchant = demoMenus.merchants.find(m => m.id === merchantId);
  if (demoMerchant) {
    return res.json({ success: true, url: null, source: 'demo' });
  }
  res.json({ success: true, url: ociMenuUrl('default', merchantId), source: 'oci' });
});

// 保存菜单到 OCI
app.post('/api/ai-order/menu/save', async (req, res) => {
  const { merchantId, menu } = req.body;
  if (!merchantId || !menu) {
    return res.status(400).json({ success: false, error: 'merchantId and menu required' });
  }
  const demoMerchant = demoMenus.merchants.find(m => m.id === merchantId);
  if (demoMerchant) {
    return res.json({ success: true, message: '演示模式：未保存到 OCI', source: 'demo' });
  }
  try {
    const result = await ociSaveMenu('default', merchantId, menu);
    res.json({ success: true, message: '菜单已保存到 OCI', url: result.url });
  } catch (err) {
    res.status(500).json({ success: false, error: 'OCI 保存失败：' + err.message });
  }
});

async function handleChatStream(ws, msg) {
  try {
    const { messages, mode, menuData } = msg;
    const aiOrderConfig = config.aiOrder;

    if (!aiOrderConfig || !aiOrderConfig.apiKey) {
      ws.send(JSON.stringify({ type: 'error', message: 'AI Order API key not configured' }));
      ws.isBusy = false;
      return;
    }

    let systemPrompt = '';
    if (mode === 'merchant') {
      systemPrompt = '你是餐厅菜单管理助手。帮助商家添加、删除、更新菜品。必需信息：菜品名、价格。可选信息：图片、描述、口味、辣度(0-5)。添加/删除/更新前需要商家确认。用中文回答，语气专业友好。';
    } else {
      systemPrompt = '你是智能点菜助手。你只能从下方提供的当前菜单中推荐菜品，绝不能推荐菜单外的菜品。根据用户口味偏好推荐菜品，推荐时要说明推荐理由。用户确认后生成虚拟订单。用中文回答，语气热情友好。';
    }

    if (menuData && menuData.dishes) {
      const onlineDishes = menuData.dishes.filter(d => d.status === 'online');
      systemPrompt += '\n\n当前菜单：' + JSON.stringify(onlineDishes.map(d => ({
        name: d.name, price: d.price, taste: d.taste, spicyLevel: d.spicyLevel, description: d.description
      })));
    }

    const apiMessages = [{ role: 'system', content: systemPrompt }].concat(messages || []);
    const requestBody = {
      model: aiOrderConfig.model,
      messages: apiMessages,
      max_tokens: aiOrderConfig.maxTokens,
      stream: true
    };

    const response = await fetchWithTimeout(aiOrderConfig.apiUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiOrderConfig.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wechatbot-api-sg.onrender.com',
        'X-Title': 'AIOrderBot'
      },
      body: JSON.stringify(requestBody)
    }, 30000);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      ws.send(JSON.stringify({ type: 'error', message: `OpenRouter error ${response.status}: ${errText}` }));
      ws.isBusy = false;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            ws.send(JSON.stringify({ type: 'token', content: delta }));
          }
        } catch (_) { /* skip malformed SSE */ }
      }
    }

    // Extract dish recommendations by matching dish names in full content
    const recommendations = [];
    if (menuData && menuData.dishes) {
      const matched = {};
      for (const dish of menuData.dishes) {
        if (dish.status !== 'online') continue;
        if (fullContent.includes(dish.name) && !matched[dish.id]) {
          recommendations.push({ id: dish.id, name: dish.name, price: dish.price, taste: dish.taste, spicyLevel: dish.spicyLevel, category: dish.category });
          matched[dish.id] = true;
        }
      }
    }

    ws.send(JSON.stringify({ type: 'done', content: fullContent, recommendations }));
  } catch (err) {
    console.error('WebSocket chat error:', err);
    ws.send(JSON.stringify({ type: 'error', message: err.message }));
  } finally {
    ws.isBusy = false;
  }
}

const PORT = config.server.port;
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('WebSocket connected');
  ws.isBusy = false;
  let idleTimer = setTimeout(() => { ws.terminate(); }, 30000);

  ws.on('message', (raw) => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { ws.terminate(); }, 30000);
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      if (msg.type === 'chat') {
        if (ws.isBusy) {
          ws.send(JSON.stringify({ type: 'error', message: '上一轮对话尚未完成，请稍候' }));
          return;
        }
        ws.isBusy = true;
        handleChatStream(ws, msg);
        return;
      }
    } catch (_) { /* ignore invalid messages */ }
  });

  ws.on('close', () => { clearTimeout(idleTimer); });
  ws.on('error', () => { clearTimeout(idleTimer); });
});

server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });

// Keep both services warm: self-ping (Node API) + Python service keepalive
const SELF_URL = process.env.RENDER_EXTERNAL_URL || config.frontend.apiBaseUrl;
const KEEPALIVE_INTERVAL = config.pdfService.keepaliveInterval;

// Pre-warm all PDF backends immediately on startup
function warmPythonService() {
  pdfBackends.forEach(function(url) {
    fetchWithTimeout(url + '/health', {}, 30000).catch(function() {});
  });
}
setTimeout(warmPythonService, 1000);

setInterval(function() {
  console.log('Keepalive: warming services');
  pdfBackends.forEach(function(url) {
    fetchWithTimeout(url + '/health', {}, 30000).catch(function() {});
  });
  fetchWithTimeout(SELF_URL + '/api/health', {}, 30000).catch(function() {});
}, KEEPALIVE_INTERVAL);

app.get('/api/chat/key', (req, res) => {
  const apiKey = config.openrouter.apiKey;
  if (!apiKey) return res.status(500).json({ error: 'OpenRouter API key not configured' });
  res.json({
    key: apiKey,
    model: config.openrouter.model,
    apiUrl: config.openrouter.apiUrl,
    maxTokens: config.openrouter.maxTokens
  });
});

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
        'HTTP-Referer': 'https://wechatbot-api-sg.onrender.com',
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

// --- PDF backend load balancing ---
// Supports comma-separated PDF_SERVICE_URLS or single PDF_SERVICE_URL
const pdfBackends = (function() {
  var raw = process.env.PDF_SERVICE_URLS || config.pdfService.url || '';
  return raw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
})();
console.log('PDF backends:', pdfBackends.length > 0 ? pdfBackends.join(', ') : 'NONE');
var _rrIndex = 0;
var _jobBackends = {};

function _pickBackend() {
  if (pdfBackends.length === 0) throw new Error('No PDF backends configured');
  var url = pdfBackends[_rrIndex % pdfBackends.length];
  _rrIndex++;
  return url;
}

function _backendForJob(jobId) {
  return _jobBackends[jobId] || pdfBackends[0];
}

// PDF conversion endpoint - submit job, return job_id immediately (client polls)
fs.mkdirSync(config.storage.uploadDir, { recursive: true });
fs.mkdirSync(config.storage.serveDir, { recursive: true });
const upload = multer({
  dest: config.storage.uploadDir + '/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

app.post('/api/pdf/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });
  const from = req.body.from || req.query.from || 'pdf';
  const to = req.body.to || req.query.to || 'docx';
  const toFmt = to;
  const backend = _pickBackend();
  const t0 = Date.now();

  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const sizeKB = Math.round(fileBuffer.length / 1024);
    const fileBase64 = fileBuffer.toString('base64');
    console.log(`[pdf] submit ${sizeKB}KB ${req.file.originalname || '?'} to ${backend}`);

    // Submit job to Python with retry (3 min total, 120s per attempt for large files)
    const submitRes = await retryWithTimeout(async () => {
      const res = await fetchWithTimeout(backend + '/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_base64: fileBase64,
          filename: req.file.originalname || 'file.' + (from || 'pdf'),
          from_fmt: from || 'pdf',
          to_fmt: toFmt
        })
      }, 120000);
      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(errText);
      }
      return res;
    }, 180000, 5000);

    fs.unlinkSync(req.file.path);

    const { job_id } = await submitRes.json();
    _jobBackends[job_id] = backend;
    console.log(`[pdf] submit OK job=${job_id} backend=${backend} (${Date.now()-t0}ms)`);
    return res.json({ job_id: job_id, status_url: '/api/pdf/status/' + job_id });
  } catch (err) {
    console.error(`[pdf] submit FAIL (${Date.now()-t0}ms):`, err.message);
    res.status(500).json({ error: err.message.substring(0, 200) });
  }
});

// Poll job status from Python, download result when ready
app.get('/api/pdf/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const backend = _backendForJob(jobId);
  const t0 = Date.now();
  try {
    const statusRes = await retryWithTimeout(async () => {
      const res = await fetchWithTimeout(backend + '/status/' + jobId, {}, 120000);
      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error('查询失败: ' + errText.substring(0, 100));
      }
      return res;
    }, 600000, 3000);

    const status = await statusRes.json();
    if (status.status === 'pending' || status.status === 'processing') {
      return res.json({ status: 'processing' });
    } else if (status.status === 'done') {
      console.log(`[pdf] status done job=${jobId} (${Date.now()-t0}ms)`);
      // Download result from Python and cache locally
      const dlRes = await retryWithTimeout(async () => {
        const res = await fetchWithTimeout(backend + '/download/' + status.result, {}, 300000);
        if (!res.ok) throw new Error('下载转换结果失败');
        return res;
      }, 600000, 5000);

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
      console.log(`[pdf] download cached job=${jobId} (${Math.round(buffer.byteLength/1024)}KB, ${Date.now()-t0}ms)`);

      // 触发订阅消息通知（如果有 openid）
      const fileName = status.result || 'file';
      if (req.query.openid) {
        sendSubscribeMessage(req.query.openid, jobId, 'done', fileName).catch(console.error);
      }

      return res.json({
        status: 'done',
         url: `${req.protocol}://${req.get('host')}/api/pdf/download/${path.basename(outFile)}`
      });
    } else if (status.status === 'error') {
      console.error(`[pdf] status error job=${jobId}:`, status.error);

      // 触发订阅消息通知（如果有 openid）
      const fileName = jobId || 'file';
      if (req.query.openid) {
        sendSubscribeMessage(req.query.openid, jobId, 'error', fileName).catch(console.error);
      }

      return res.json({ status: 'error', error: status.error || '转换失败' });
    }
    return res.json(status);
  } catch (err) {
    console.error(`[pdf] status FAIL job=${jobId} (${Date.now()-t0}ms):`, err.message);
    res.status(500).json({ error: err.message.substring(0, 200) });
  }
});

app.post('/api/pdf/edit', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });
    const backend = _pickBackend();
    const { op, text, angle } = req.body;
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileBase64 = fileBuffer.toString('base64');
    const t0 = Date.now();
    console.log(`[pdf] edit op=${op} size=${Math.round(fileBuffer.length/1024)}KB backend=${backend}`);

    var body = new URLSearchParams();
    body.append('file_base64', fileBase64);
    body.append('op', op || '');
    body.append('text', text || '');
    body.append('angle', angle || '90');

    const pyRes = await fetchWithTimeout(backend + '/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }, 120000);

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

// 合并PDF：接收第二个文件
const mergeFiles = {};
app.post('/api/pdf/edit/merge2', upload.single('file2'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传第二个文件' });
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileBase64 = fileBuffer.toString('base64');
    const mergeId = 'merge_' + Date.now();
    mergeFiles[mergeId] = fileBase64;
    fs.unlinkSync(req.file.path);
    res.json({ merge_id: mergeId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 执行合并
app.post('/api/pdf/edit/merge', upload.single('file'), async (req, res) => {
  try {
    const { merge_id } = req.body;
    if (!req.file) return res.status(400).json({ error: '请上传第一个文件' });
    if (!merge_id || !mergeFiles[merge_id]) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '缺少文件数据' });
    }
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileBase64 = fileBuffer.toString('base64');
    fs.unlinkSync(req.file.path);

    const backend = _pickBackend();
    const t0 = Date.now();

    const pyRes = await fetchWithTimeout(backend + '/edit/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file1_base64: fileBase64,
        file2_base64: mergeFiles[merge_id]
      })
    }, 120000);

    delete mergeFiles[merge_id];

    if (!pyRes.ok) {
      const err = await pyRes.json();
      return res.status(400).json(err);
    }

    const buffer = await pyRes.arrayBuffer();
    const outFile = config.storage.serveDir + '/edit_' + Date.now() + '.pdf';
    fs.mkdirSync(config.storage.serveDir, { recursive: true });
    fs.writeFileSync(outFile, Buffer.from(buffer));
    console.log(`[pdf] merge done (${Date.now()-t0}ms)`);

    res.json({ url: `${req.protocol}://${req.get('host')}/api/pdf/download/${path.basename(outFile)}` });
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

// 获取 access_token
let cachedAccessToken = null;
let tokenExpireTime = 0;

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpireTime) {
    return cachedAccessToken;
  }
  const res = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`);
  const data = await res.json();
  if (data.access_token) {
    cachedAccessToken = data.access_token;
    tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;
    return cachedAccessToken;
  }
  throw new Error('获取 access_token 失败');
}

// 发送订阅消息
async function sendSubscribeMessage(openid, jobId, status, fileName) {
  try {
    const token = await getAccessToken();
    const templateId = process.env.WECHAT_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
    const page = 'pdf/pages/records/records';

    const statusText = status === 'done' ? '转换完成' : '转换失败';
    const body = {
      touser: openid,
      template_id: templateId,
      page: page,
      data: {
        thing1: { value: fileName.substring(0, 20) },
        thing2: { value: statusText },
        time3: { value: new Date().toLocaleString('zh-CN') }
      }
    };

    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.errcode !== 0) {
      console.error('订阅消息发送失败:', result);
    }
  } catch (err) {
    console.error('发送订阅消息异常:', err);
  }
}

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

// 文件清理定时任务（每小时执行）
setInterval(() => {
  const serveDir = config.storage.serveDir;
  if (!fs.existsSync(serveDir)) return;

  const files = fs.readdirSync(serveDir);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 小时

  // 检查磁盘使用率
  let totalSize = 0;
  const fileStats = files.map(f => {
    const stat = fs.statSync(serveDir + '/' + f);
    totalSize += stat.size;
    return { name: f, mtime: stat.mtimeMs, size: stat.size };
  });

  // 删除超过 24 小时的文件
  fileStats.forEach(f => {
    if (now - f.mtime > maxAge) {
      try {
        fs.unlinkSync(serveDir + '/' + f.name);
        console.log(`[cleanup] deleted old file: ${f.name}`);
      } catch(e) {}
    }
  });

  // 如果磁盘使用率 > 85%，按 LRU 删除
  // 简化处理：保留最近 100 个文件
  const remaining = fs.readdirSync(serveDir);
  if (remaining.length > 100) {
    const sorted = remaining.map(f => ({
      name: f,
      mtime: fs.statSync(serveDir + '/' + f).mtimeMs
    })).sort((a, b) => a.mtime - b.mtime);

    const toDelete = sorted.slice(0, sorted.length - 100);
    toDelete.forEach(f => {
      try {
        fs.unlinkSync(serveDir + '/' + f.name);
        console.log(`[cleanup] LRU deleted: ${f.name}`);
      } catch(e) {}
    });
  }

  console.log(`[cleanup] done. files: ${fs.readdirSync(serveDir).length}, totalSize: ${Math.round(totalSize/1024/1024)}MB`);
}, 60 * 60 * 1000);

