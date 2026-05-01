# Login Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify two separate login implementations into one shared module with token-based auth, fix all 12 known bugs, and implement WeChat's recommended chooseAvatar + nickname auth UI.

**Architecture:** Shared `utils/login.js` module provides login/logout/getUserInfo/updateProfile. Server uses `/api/auth/*` and `/api/users/me` with Bearer token auth. `pages/user/user` is the sole login/profile page. `pages/index/index` only reads user state.

**Tech Stack:** WeChat mini-program JS, Node.js/Express, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-05-01-login-overhaul-design.md`

---

### Task 1: Update render.yaml environment variables

**Files:**
- Modify: `render.yaml:7-9`

**Why first:** Server needs these env vars before deployment.

- [ ] **Step 1: Add WeChat credential env vars**

In `render.yaml`, replace the existing `envVars` block for `wechatbot-api`:

```yaml
services:
  - type: web
    name: wechatbot-api
    runtime: node
    buildCommand: npm install
    startCommand: node index.js
    envVars:
      - key: NODE_VERSION
        value: "20"
      - key: DATABASE_URL
        sync: false
      - key: WECHAT_APP_ID
        value: "wx2510f82943d7741e"
      - key: WECHAT_APP_SECRET
        sync: false
      - key: OPENROUTER_KEY
        sync: false
      - key: PDF_SERVICE_URL
        value: "https://pdf-converter-idfi.onrender.com"
```

The `WECHAT_APP_SECRET` must be set to `sync: false` so users manually input the secret in Render dashboard (never committed to git). The current hardcoded secret on line 25 of index.js (value `2ebc324a6ee1d9baabf7223511006366`) will be removed in Task 2.

- [ ] **Step 2: Commit**

```bash
git add render.yaml
git commit -m "chore: add WECHAT_APP_ID and WECHAT_APP_SECRET env vars to render.yaml

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Rewrite server auth routes (index.js)

**Files:**
- Modify: `index.js:24-25` (remove hardcoded secrets)
- Modify: `index.js:31-49` (replace GET /api/wechat/openid)
- Modify: `index.js:74-159` (replace all /api/users/* routes)
- Modify: `index.js:119-133` (remove unauthenticated DELETE)

**Overview:** Remove all old routes. Add new `/api/auth/login`, `/api/auth/logout`, `/api/users/me` (GET/PUT/DELETE) with token auth middleware.

- [ ] **Step 1: Remove hardcoded secrets**

Replace lines 24-25:
```javascript
const APP_ID = 'wx2510f82943d7741e';
const APP_SECRET = '2ebc324a6ee1d9baabf7223511006366';
```

With:
```javascript
const APP_ID = process.env.WECHAT_APP_ID;
const APP_SECRET = process.env.WECHAT_APP_SECRET;
```

- [ ] **Step 2: Add auth middleware and helpers**

Add after the express imports section (after line 9):

```javascript
// --- Auth helpers ---
function generateToken() {
  var chars = 'abcdef0123456789';
  var token = '';
  for (var i = 0; i < 32; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

// Auth middleware: verify Bearer token against DB
async function requireAuth(req, res, next) {
  var authHeader = req.headers.authorization || '';
  var token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !pool) return res.status(401).json({ error: 'Unauthorized' });
  try {
    var result = await pool.query(
      'SELECT * FROM users WHERE token = $1',
      [token]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 3: Replace old routes with new auth routes**

Remove all of these old routes from index.js:
- `GET /api/wechat/openid` (lines 31-49)
- `POST /api/users/:openid` (lines 74-98)
- `GET /api/users/:openid` (lines 100-117)
- `DELETE /api/users/:openid` (lines 119-133)
- `POST /api/users/:openid/wx-login` (lines 135-159)

Replace with:

```javascript
// --- Auth routes ---

// POST /api/auth/login — exchange WeChat code for token + user
app.post('/api/auth/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not available' });
  try {
    var code = req.body.code;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    // Exchange code for openid
    var wxRes = await fetch(
      'https://api.weixin.qq.com/sns/jscode2session?appid=' + APP_ID +
      '&secret=' + APP_SECRET + '&js_code=' + code + '&grant_type=authorization_code'
    );
    var wxData = await wxRes.json();
    if (wxData.errcode) return res.status(400).json({ error: wxData.errmsg });
    var openid = wxData.openid;

    // Find or create user
    var userResult = await pool.query(
      'SELECT * FROM users WHERE openid = $1',
      [openid]
    );

    var user, token;
    if (userResult.rows.length > 0) {
      // Existing user: generate new token
      token = generateToken();
      await pool.query('UPDATE users SET token = $1 WHERE openid = $2', [token, openid]);
      user = userResult.rows[0];
    } else {
      // New user: auto-generate nickname
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

// POST /api/auth/logout — invalidate token
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET token = NULL WHERE openid = $1', [req.user.openid]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/me — get current user profile
app.get('/api/users/me', requireAuth, async (req, res) => {
  res.json({ openid: req.user.openid, nickName: req.user.nickname, avatarUrl: req.user.avatarurl || '' });
});

// PUT /api/users/me — update nickName/avatarUrl
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

// DELETE /api/users/me — delete account
app.delete('/api/users/me', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE openid = $1', [req.user.openid]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**Note on column name case:** PostgreSQL lowercases column names by default. The `nickName` column in the CREATE TABLE becomes `nickname` in query results. The `avatarUrl` becomes `avatarurl`. The above code uses `user.nickname` and `user.avatarurl` (lowercase) which matches PostgreSQL's default behavior.

- [ ] **Step 4: Verify syntax**

```bash
node --check index.js
```

Expected: exit code 0 (no errors).

- [ ] **Step 5: Commit**

```bash
git add index.js
git commit -m "feat(server): rewrite auth with token-based API, remove secrets

- Replace GET /api/wechat/openid with POST /api/auth/login
- Add Bearer token auth middleware (requireAuth)
- New routes: POST /api/auth/login, POST /api/auth/logout,
  GET/PUT/DELETE /api/users/me
- Remove old /api/users/:openid routes (no more openid-in-URL)
- Remove hardcoded APP_ID/APP_SECRET, use env vars
- Token: 32-char random hex, stored on user row

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Create shared login module (utils/login.js)

**Files:**
- Create: `utils/login.js`

- [ ] **Step 1: Write the module**

```javascript
// utils/login.js
// Shared login module — single source of truth for auth state

var SERVER = 'https://wechatbot-g6ez.onrender.com';
var STORAGE_TOKEN = 'auth_token';
var STORAGE_USER = 'auth_user';

function request(method, path, data, needAuth) {
  return new Promise(function (resolve, reject) {
    var header = { 'Content-Type': 'application/json' };
    if (needAuth) {
      var token = wx.getStorageSync(STORAGE_TOKEN);
      if (token) header['Authorization'] = 'Bearer ' + token;
    }
    wx.request({
      url: SERVER + path,
      method: method,
      header: header,
      data: data,
      success: function (res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: reject
    });
  });
}

module.exports = {
  /**
   * Login: get WeChat code, exchange for token + user
   * Returns Promise<{ token, user }>
   */
  login: function () {
    var that = this;
    return new Promise(function (resolve, reject) {
      wx.login({
        success: function (res) {
          if (!res.code) return reject({ error: 'wx.login failed' });
          request('POST', '/api/auth/login', { code: res.code }, false)
            .then(function (data) {
              wx.setStorageSync(STORAGE_TOKEN, data.token);
              wx.setStorageSync(STORAGE_USER, data.user);
              var app = getApp();
              if (app) app.globalData.userInfo = data.user;
              resolve(data);
            })
            .catch(reject);
        },
        fail: reject
      });
    });
  },

  /**
   * Logout: clear token on server and locally
   */
  logout: function () {
    return request('POST', '/api/auth/logout', {}, true)
      .catch(function () {}); // fire-and-forget
    wx.removeStorageSync(STORAGE_TOKEN);
    wx.removeStorageSync(STORAGE_USER);
    var app = getApp();
    if (app) app.globalData.userInfo = null;
  },

  /**
   * Check if user is logged in (has stored token)
   */
  isLoggedIn: function () {
    return !!wx.getStorageSync(STORAGE_TOKEN);
  },

  /**
   * Get cached user info
   */
  getUserInfo: function () {
    return wx.getStorageSync(STORAGE_USER) || null;
  },

  /**
   * Update profile (nickName/avatarUrl) on server and in cache
   */
  updateProfile: function (data) {
    var that = this;
    return request('PUT', '/api/users/me', data, true)
      .then(function (updated) {
        wx.setStorageSync(STORAGE_USER, updated);
        var app = getApp();
        if (app) app.globalData.userInfo = updated;
        return updated;
      });
  },

  /**
   * Delete account
   */
  deleteAccount: function () {
    return request('DELETE', '/api/users/me', {}, true);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add utils/login.js
git commit -m "feat: add shared login module (utils/login.js)

Single source of truth for auth state. Provides:
- login() — wx.login → POST /api/auth/login → cache token + user
- logout() — clear server token + local cache
- isLoggedIn() / getUserInfo() — read cached state
- updateProfile() — PUT /api/users/me + update cache
- deleteAccount() — DELETE /api/users/me

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Rewrite pages/user/user page

**Files:**
- Rewrite: `pages/user/user.js`
- Rewrite: `pages/user/user.wxml`
- Rewrite: `pages/user/user.wxss`

**Note:** The existing `pages/user/user.json` stays as-is (it only has navigation settings).

- [ ] **Step 1: Write user.js**

```javascript
var loginLib = require('../../utils/login');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    showNickInput: false,
    nickName: ''
  },

  onShow: function () {
    var loggedIn = loginLib.isLoggedIn();
    this.setData({
      isLoggedIn: loggedIn,
      userInfo: loggedIn ? loginLib.getUserInfo() : null
    });
  },

  // --- Login ---
  handleLogin: function () {
    var that = this;
    wx.showLoading({ title: '登录中...' });
    loginLib.login().then(function (data) {
      wx.hideLoading();
      that.setData({ isLoggedIn: true, userInfo: data.user });
      wx.showToast({ title: '登录成功', icon: 'success' });
    }).catch(function (err) {
      wx.hideLoading();
      console.error('Login failed:', err);
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    });
  },

  // --- Avatar ---
  onChooseAvatar: function (e) {
    var avatarUrl = e.detail.avatarUrl;
    var that = this;
    loginLib.updateProfile({ avatarUrl: avatarUrl }).then(function (updated) {
      that.setData({ userInfo: updated });
      wx.showToast({ title: '头像已更新', icon: 'success' });
    }).catch(function () {
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  // --- Nickname ---
  showNickInput: function () {
    this.setData({ showNickInput: true, nickName: this.data.userInfo.nickName || '' });
  },

  onNickInput: function (e) {
    this.setData({ nickName: e.detail.value });
  },

  confirmNickname: function () {
    var that = this;
    var nickName = this.data.nickName.trim();
    if (!nickName) return;
    loginLib.updateProfile({ nickName: nickName }).then(function (updated) {
      that.setData({ showNickInput: false, userInfo: updated });
      wx.showToast({ title: '昵称已更新', icon: 'success' });
    }).catch(function () {
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  cancelNickname: function () {
    this.setData({ showNickInput: false });
  },

  // --- Logout ---
  handleLogout: function () {
    var that = this;
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: function (res) {
        if (res.confirm) {
          loginLib.logout();
          that.setData({ isLoggedIn: false, userInfo: null });
          wx.showToast({ title: '已退出', icon: 'none' });
        }
      }
    });
  },

  // --- Delete account ---
  handleDeleteAccount: function () {
    var that = this;
    wx.showModal({
      title: '注销账号',
      content: '此操作不可恢复，确定要注销账号吗？',
      success: function (res) {
        if (!res.confirm) return;
        wx.showModal({
          title: '再次确认',
          content: '注销后所有数据将被永久删除',
          success: function (res2) {
            if (!res2.confirm) return;
            loginLib.deleteAccount().then(function () {
              loginLib.logout();
              that.setData({ isLoggedIn: false, userInfo: null });
              wx.showToast({ title: '账号已注销', icon: 'success' });
            }).catch(function () {
              wx.showToast({ title: '注销失败', icon: 'none' });
            });
          }
        });
      }
    });
  }
});
```

- [ ] **Step 2: Write user.wxml**

```xml
<pages/user/user.wxml -->
<view class="page">
  <!-- Not logged in -->
  <view class="login-section" wx:if="{{!isLoggedIn}}">
    <image class="avatar-lg" src="/images/avatar-default.png" mode="aspectFill"></image>
    <text class="login-desc">微信一键登录，同步文档数据</text>
    <button class="login-btn" bindtap="handleLogin">微信一键登录</button>
  </view>

  <!-- Logged in -->
  <view class="profile-section" wx:if="{{isLoggedIn}}">
    <!-- Avatar -->
    <view class="avatar-row">
      <button class="avatar-btn" open-type="chooseAvatar" bindchooseavatar="onChooseAvatar">
        <image class="avatar-lg" src="{{userInfo.avatarUrl || '/images/avatar-default.png'}}" mode="aspectFill"></image>
      </button>
    </view>

    <!-- Nickname -->
    <view class="nick-row" wx:if="{{!showNickInput}}">
      <text class="nickname">{{userInfo.nickName || '微信用户'}}</text>
      <text class="edit-link" bindtap="showNickInput">✎ 修改昵称</text>
    </view>
    <view class="nick-input-row" wx:if="{{showNickInput}}">
      <input class="nick-input" type="nickname" placeholder="请输入昵称" value="{{nickName}}" bindinput="onNickInput" focus="{{true}}" />
      <view class="nick-actions">
        <text class="btn-cancel" bindtap="cancelNickname">取消</text>
        <text class="btn-confirm" bindtap="confirmNickname">确定</text>
      </view>
    </view>

    <view class="divider"></view>

    <!-- Danger zone -->
    <view class="danger-zone">
      <view class="danger-item" bindtap="handleLogout">
        <text class="danger-text">退出登录</text>
      </view>
      <view class="danger-item" bindtap="handleDeleteAccount">
        <text class="danger-text">注销账号</text>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 3: Write user.wxss**

```css
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 60rpx 30rpx;
}

/* Login section */
.login-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
}
.login-desc {
  font-size: 28rpx;
  color: #999;
  margin: 30rpx 0 40rpx;
}
.login-btn {
  width: 500rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: #07c160;
  color: #fff;
  border: 0;
  border-radius: 44rpx;
  font-size: 32rpx;
  text-align: center;
}
.login-btn::after { border: 0; }

/* Profile section */
.profile-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx 30rpx;
}
.avatar-row {
  display: flex;
  justify-content: center;
  margin-bottom: 30rpx;
}
.avatar-btn {
  width: 160rpx;
  height: 160rpx;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: 1;
}
.avatar-btn::after { border: 0; }
.avatar-lg {
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
}

.nick-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-bottom: 20rpx;
}
.nickname {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}
.edit-link {
  font-size: 26rpx;
  color: #07c160;
}
.nick-input-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.nick-input {
  width: 400rpx;
  height: 72rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}
.nick-actions {
  display: flex;
  gap: 12rpx;
}
.btn-cancel {
  font-size: 26rpx;
  color: #999;
  padding: 12rpx 20rpx;
}
.btn-confirm {
  font-size: 26rpx;
  color: #07c160;
  padding: 12rpx 20rpx;
  font-weight: bold;
}

.divider {
  height: 1rpx;
  background: #eee;
  margin: 40rpx 0;
}

.danger-zone {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.danger-item {
  padding: 24rpx 0;
  text-align: center;
}
.danger-text {
  font-size: 28rpx;
  color: #e74c3c;
}
```

- [ ] **Step 4: Verify syntax**

```bash
node --check pages/user/user.js
```

- [ ] **Step 5: Commit**

```bash
git add pages/user/user.js pages/user/user.wxml pages/user/user.wxss
git commit -m "feat(user): rewrite profile page with login module + chooseAvatar

- Use shared utils/login.js instead of inline login logic
- Implement WeChat recommended chooseAvatar button + nickname input
- Clean logged-out view with green login button
- Logged-in view: tappable avatar, editable nickname, logout/delete
- No more fake openid fallback, no more empty callbacks

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Simplify pages/index/index

**Files:**
- Modify: `pages/index/index.js` (remove login functions, use loginLib)
- Modify: `pages/index/index.wxml` (minor — read-only user display)
- Modify: `pages/index/index.wxss` (minor — adjust styles if needed)

- [ ] **Step 1: Remove login code from index.js, use loginLib**

Remove the following from `pages/index/index.js`:
- `login()` function
- `loginWithCode()` function
- `checkOrCreateUser()` function
- `promptNickname()` function
- `createUser()` function

Replace with simple auth state reading:

At the top of `pages/index/index.js`, add the require:
```javascript
var loginLib = require('../../utils/login');
```

In the `Page({ data: ... })`, add:
```javascript
isLoggedIn: false,
userInfo: null,
```

In `onShow()` (or create one if it doesn't exist), add:
```javascript
onShow: function () {
  this.setData({
    isLoggedIn: loginLib.isLoggedIn(),
    userInfo: loginLib.getUserInfo()
  });
},
```

Update `handleUserTap`:
```javascript
handleUserTap: function () {
  if (this.data.isLoggedIn) {
    wx.switchTab({ url: '/pages/user/user' });
  } else {
    wx.switchTab({ url: '/pages/user/user' });
    wx.showToast({ title: '请先登录', icon: 'none' });
  }
},
```

- [ ] **Step 2: Update index.wxml**

Ensure the user display reads from data. If the existing bindings use `userInfo.avatarUrl` and `userInfo.nickName`, keep them. Just make sure `isLoggedIn` and `userInfo` are populated from loginLib on show.

- [ ] **Step 3: Verify syntax**

```bash
node --check pages/index/index.js
```

- [ ] **Step 4: Commit**

```bash
git add pages/index/index.js pages/index/index.wxml
git commit -m "refactor(index): simplify to read auth state from loginLib

Remove all inline login functions. Use loginLib.isLoggedIn() and
loginLib.getUserInfo() instead. Tapping header always navigates to
user page for login/profile management.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Clean up dead code

**Files:**
- Delete: `utils/renderDb.js`

- [ ] **Step 1: Delete unused utility**

```bash
rm utils/renderDb.js
```

- [ ] **Step 2: Commit**

```bash
git add utils/renderDb.js
git commit -m "chore: remove unused utils/renderDb.js

This file targeted a different API service and was never imported.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Final verification

- [ ] **Step 1: Verify all files have valid syntax**

```bash
node --check index.js
node --check utils/login.js
node --check pages/user/user.js
node --check pages/index/index.js
echo "All syntax OK"
```

- [ ] **Step 2: Review the complete diff**

```bash
git diff --stat origin/master
```

Expected: ~10 files changed, substantial deletions in index.js, user/* rewritten.

- [ ] **Step 3: Deploy and test checklist (manual in WeChat DevTools)**

1. Clear all local storage in DevTools
2. Open app → index page shows "点击头像登录"
3. Tap header → navigates to user page
4. User page shows login prompt
5. Tap "微信一键登录" → wx.login → server returns token + user
6. User page shows avatar + generated nickname
7. Tap avatar → WeChat avatar picker → save to server
8. Tap "修改昵称" → input appears → enter name → confirm
9. Kill app, reopen → still logged in (token in storage)
10. Tap "退出登录" → cleared, back to login prompt
11. Re-login → server returns same user with saved profile
12. Tap "注销账号" → double confirm → account deleted, cleared

- [ ] **Step 4: Deploy to Render**

Push to GitHub, Render auto-deploys. Set WECHAT_APP_SECRET in Render dashboard environment variables.
