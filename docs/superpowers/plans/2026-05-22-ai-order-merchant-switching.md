# AI 点菜 - 多租户商家切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement user-isolated merchant CRUD + UI for ai-order module

**Architecture:** 
- Server: new `ai_order_merchants` MySQL table + 3 API endpoints (list/create/delete)
- Client: redesigned index page with merchant card list, creation modal, deletion; merchant/customer pages read current merchant from storage
- Isolation: all APIs use `requireAuth`, filter by `req.user.openid`

**Tech Stack:** Node.js/Express (server), WeChat Mini Program (client), MySQL (data)

---

### Task 1: Server - merchants table + auto-seed

**Files:**
- Modify: `index.js` (add table creation in initDB)

- [ ] **Step 1: Add merchants table creation in initDB()**

In `index.js`, find the `initDB()` function. After the existing table creation, add the merchants table:

```js
// After line ~409 (end of jp_lesson_scores table)
await pool.query(`
  CREATE TABLE IF NOT EXISTS ai_order_merchants (
    id VARCHAR(64) PRIMARY KEY,
    openid VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT '',
    type ENUM('demo','custom') DEFAULT 'custom',
    createdAt DATETIME DEFAULT NOW(),
    INDEX idx_openid (openid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`);
```

- [ ] **Step 2: Add demo merchant seeding helper**

Near the `demoMenus` require at the top of `index.js`, but inside a function:

```js
async function seedDemoMerchants(openid) {
  if (!pool) return;
  const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM ai_order_merchants WHERE openid = ?', [openid]);
  if (existing[0].cnt > 0) return;
  const demoList = demoMenus.merchants || [];
  for (const m of demoList) {
    await pool.query(
      'INSERT INTO ai_order_merchants (id, openid, name, description, type) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=name',
      ['demo-' + m.id, openid, m.name, m.description || m.name + '（演示商家）', 'demo']
    );
  }
}
```

Place this after `function ociMenuUrl` (around line 16).

---

### Task 2: Server - merchant API endpoints

**Files:**
- Modify: `index.js` (add 3 routes after the ai-order menu routes, ~line 557)

- [ ] **Step 1: Add GET /api/ai-order/merchants**

```js
// List user's merchants (with auto-seed for new users)
app.get('/api/ai-order/merchants', requireAuth, async (req, res) => {
  try {
    const openid = req.user.openid;
    // Fallback: if no DB, return demo list
    if (!pool) {
      const demos = (demoMenus.merchants || []).map(m => ({
        id: 'demo-' + m.id,
        name: m.name,
        description: m.name + '（演示商家）',
        type: 'demo',
        dishCount: (m.dishes || []).length
      }));
      return res.json({ success: true, data: demos });
    }
    await seedDemoMerchants(openid);
    const [rows] = await pool.query(
      'SELECT id, name, description, type, createdAt FROM ai_order_merchants WHERE openid = ? ORDER BY createdAt ASC',
      [openid]
    );
    // Attach dishCount for demo merchants
    const data = rows.map(r => {
      let dishCount = 0;
      if (r.type === 'demo') {
        const demo = demoMenus.merchants.find(m => 'demo-' + m.id === r.id);
        if (demo) dishCount = (demo.dishes || []).length;
      }
      return { ...r, dishCount };
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/ai-order/merchants error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
```

- [ ] **Step 2: Add POST /api/ai-order/merchants**

```js
app.post('/api/ai-order/merchants', requireAuth, async (req, res) => {
  try {
    const openid = req.user.openid;
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: '商家名称不能为空' });
    }
    const id = 'usr_' + openid + '_' + Date.now();
    if (pool) {
      await pool.query(
        'INSERT INTO ai_order_merchants (id, openid, name, description, type) VALUES (?, ?, ?, ?, ?)',
        [id, openid, name.trim(), (description || '').trim(), 'custom']
      );
    }
    res.json({ success: true, data: { id, name: name.trim(), description: (description || '').trim(), type: 'custom', dishCount: 0 } });
  } catch (err) {
    console.error('POST /api/ai-order/merchants error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
```

- [ ] **Step 3: Add DELETE /api/ai-order/merchants/:id**

```js
app.delete('/api/ai-order/merchants/:id', requireAuth, async (req, res) => {
  try {
    const openid = req.user.openid;
    const { id } = req.params;
    if (!pool) {
      return res.status(400).json({ success: false, error: '非演示模式不支持删除' });
    }
    const [result] = await pool.query(
      'DELETE FROM ai_order_merchants WHERE id = ? AND openid = ?',
      [id, openid]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '商家不存在或无权操作' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/ai-order/merchants error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
```

---

### Task 3: Server - update menu/list and menu/save to use openid

**Files:**
- Modify: `index.js` (update existing menu/list and menu/save)

- [ ] **Step 1: Update GET /api/ai-order/menu/list to support userId param**

In the existing route (~line 510), add userId support:

```js
app.get('/api/ai-order/menu/list', async (req, res) => {
  const merchantId = req.query.merchantId;
  if (!merchantId) {
    return res.status(400).json({ success: false, error: 'merchantId required' });
  }
  // Check if it's a demo merchant
  const demoMerchant = demoMenus.merchants.find(m => m.id === merchantId || 'demo-' + m.id === merchantId);
  if (demoMerchant) {
    return res.json({ success: true, data: { id: merchantId, name: demoMerchant.name, dishes: demoMerchant.dishes }, source: 'demo' });
  }
  // For custom merchants, use userId from query or default
  const userId = req.query.userId || 'default';
  try {
    const ociUrl = ociMenuUrl(userId, merchantId);
    const resp = await fetch(ociUrl);
    if (resp.ok) {
      const data = await resp.json();
      return res.json({ success: true, data, source: 'oci' });
    }
  } catch (_) {}
  res.json({ success: true, data: { id: merchantId, name: '未知商家', dishes: [] }, source: 'empty' });
});
```

- [ ] **Step 2: Update POST /api/ai-order/menu/save to use openid**

Find the existing route (~line 542). Update it:

```js
app.post('/api/ai-order/menu/save', requireAuth, async (req, res) => {
  const { merchantId, menu } = req.body;
  if (!merchantId || !menu) {
    return res.status(400).json({ success: false, error: 'merchantId and menu required' });
  }
  const demoMerchant = demoMenus.merchants.find(m => m.id === merchantId || 'demo-' + m.id === merchantId);
  if (demoMerchant) {
    return res.json({ success: true, message: '演示模式：未保存到 OCI', source: 'demo' });
  }
  const userId = req.user ? req.user.openid : 'default';
  try {
    const result = await ociSaveMenu(userId, merchantId, menu);
    res.json({ success: true, message: '菜单已保存到 OCI', url: result.url });
  } catch (err) {
    res.status(500).json({ success: false, error: 'OCI 保存失败：' + err.message });
  }
});
```

---

### Task 4: Client - index page redesign (JS)

**Files:**
- Rewrite: `ai-order/pages/index/index.js`

- [ ] **Step 1: Rewrite index.js with merchant list + create/delete**

Full replacement:

```js
var loginLib = require('../../../utils/login');
var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;

Page({
  data: {
    merchants: [],
    loading: true,
    selectedMerchantId: '',
    showCreateModal: false,
    newMerchantName: '',
    newMerchantDesc: '',
    creating: false
  },

  onLoad: function() {
    this.loadMerchants();
  },

  onShow: function() {
    // Refresh if needed (e.g. after deleting from another page)
    if (this.data.merchants.length === 0) return;
    this.loadMerchants();
  },

  loadMerchants: function() {
    var that = this;
    if (!loginLib.isLoggedIn()) {
      loginLib.login().then(function() {
        that._fetchMerchants();
      }).catch(function() {
        that.setData({ loading: false, merchants: [] });
        wx.showToast({ title: '请先登录', icon: 'none' });
      });
      return;
    }
    that._fetchMerchants();
  },

  _fetchMerchants: function() {
    var that = this;
    that.setData({ loading: true });
    wx.request({
      url: SERVER + '/api/ai-order/merchants',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('auth_token')
      },
      success: function(res) {
        var list = (res.data && res.data.success && res.data.data) || [];
        var savedId = wx.getStorageSync('ai-order-merchant-id') || '';
        var selectedId = '';
        if (list.length > 0) {
          var found = false;
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === savedId) { found = true; selectedId = savedId; break; }
          }
          if (!found) selectedId = list[0].id;
        }
        that.setData({ merchants: list, selectedMerchantId: selectedId, loading: false });
        if (selectedId) wx.setStorageSync('ai-order-merchant-id', selectedId);
      },
      fail: function() {
        that.setData({ loading: false });
        wx.showToast({ title: '加载商家列表失败', icon: 'none' });
      }
    });
  },

  onSelectMerchant: function(e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    this.setData({ selectedMerchantId: id });
    wx.setStorageSync('ai-order-merchant-id', id);
  },

  getSelectedMerchant: function() {
    var list = this.data.merchants;
    var id = this.data.selectedMerchantId;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list.length > 0 ? list[0] : null;
  },

  onEnterMerchant: function() {
    var merchant = this.getSelectedMerchant();
    if (!merchant) {
      wx.showToast({ title: '请先选择或创建商家', icon: 'none' });
      return;
    }
    wx.setStorageSync('ai-order-merchant-name', merchant.name);
    wx.navigateTo({
      url: '/ai-order/pages/merchant/merchant?merchantId=' + merchant.id + '&userId=' + (wx.getStorageSync('auth_user') || {}).openid
    });
  },

  onEnterCustomer: function() {
    var merchant = this.getSelectedMerchant();
    if (!merchant) {
      wx.showToast({ title: '请先选择或创建商家', icon: 'none' });
      return;
    }
    wx.setStorageSync('ai-order-merchant-name', merchant.name);
    wx.navigateTo({
      url: '/ai-order/pages/customer/customer?merchantId=' + merchant.id
    });
  },

  onShowCreate: function() {
    this.setData({ showCreateModal: true, newMerchantName: '', newMerchantDesc: '' });
  },

  onHideCreate: function() {
    this.setData({ showCreateModal: false });
  },

  onNewNameInput: function(e) {
    this.setData({ newMerchantName: e.detail.value });
  },

  onNewDescInput: function(e) {
    this.setData({ newMerchantDesc: e.detail.value });
  },

  onCreateMerchant: function() {
    var that = this;
    var name = that.data.newMerchantName.trim();
    if (!name) { wx.showToast({ title: '请输入商家名称', icon: 'none' }); return; }
    that.setData({ creating: true });
    wx.request({
      url: SERVER + '/api/ai-order/merchants',
      method: 'POST',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('auth_token'),
        'Content-Type': 'application/json'
      },
      data: { name: name, description: that.data.newMerchantDesc.trim() },
      success: function(res) {
        if (res.data && res.data.success) {
          wx.showToast({ title: '创建成功', icon: 'success' });
          that.setData({ showCreateModal: false, creating: false });
          that._fetchMerchants();
        } else {
          wx.showToast({ title: res.data.error || '创建失败', icon: 'none' });
          that.setData({ creating: false });
        }
      },
      fail: function() {
        wx.showToast({ title: '网络错误', icon: 'none' });
        that.setData({ creating: false });
      }
    });
  },

  onDeleteMerchant: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var name = '';
    var list = that.data.merchants;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { name = list[i].name; break; }
    }
    wx.showModal({
      title: '删除商家',
      content: '确定删除「' + name + '」吗？相关菜单数据也会被删除。',
      success: function(confirm) {
        if (!confirm.confirm) return;
        wx.request({
          url: SERVER + '/api/ai-order/merchants/' + id,
          method: 'DELETE',
          header: { 'Authorization': 'Bearer ' + wx.getStorageSync('auth_token') },
          success: function(res) {
            if (res.data && res.data.success) {
              wx.showToast({ title: '已删除', icon: 'success' });
              that._fetchMerchants();
            } else {
              wx.showToast({ title: res.data.error || '删除失败', icon: 'none' });
            }
          },
          fail: function() {
            wx.showToast({ title: '网络错误', icon: 'none' });
          }
        });
      }
    });
  }
});
```

---

### Task 5: Client - index page (WXML)

**Files:**
- Rewrite: `ai-order/pages/index/index.wxml`

- [ ] **Step 1: Rewrite index.wxml**

```xml
<!-- ai-order/pages/index/index.wxml -->
<view class="container">
  <view class="header">
    <text class="header-title">AI 点菜</text>
  </view>

  <view class="section-label">我的商家</view>

  <view wx:if="{{loading}}" class="loading-wrap">
    <text class="loading-text">加载中...</text>
  </view>

  <scroll-view wx:else class="merchant-scroll" scroll-y>
    <view
      wx:for="{{merchants}}"
      wx:key="id"
      class="merchant-card {{item.id === selectedMerchantId ? 'selected' : ''}}"
      catchtap="onSelectMerchant" data-id="{{item.id}}"
      bindlongpress="onDeleteMerchant" data-id="{{item.id}}"
    >
      <view class="card-top">
        <text class="card-name">{{item.name}}</text>
        <text class="card-badge" wx:if="{{item.type === 'demo'}}">演示</text>
      </view>
      <text class="card-desc" wx:if="{{item.description}}">{{item.description}}</text>
      <text class="card-dishes">{{item.dishCount || 0}} 个菜品</text>
      <view class="card-check" wx:if="{{item.id === selectedMerchantId}}">
        <text class="check-icon">✓</text>
      </view>
    </view>

    <view class="create-card" catchtap="onShowCreate">
      <text class="create-icon">+</text>
      <text class="create-text">新建商家</text>
    </view>
  </scroll-view>

  <view class="bottom-buttons" wx:if="{{!loading && merchants.length > 0}}">
    <view class="btn btn-merchant" catchtap="onEnterMerchant">
      <text class="btn-icon">🏪</text>
      <text class="btn-label">进入商家管理</text>
    </view>
    <view class="btn btn-customer" catchtap="onEnterCustomer">
      <text class="btn-icon">🍽️</text>
      <text class="btn-label">进入点菜</text>
    </view>
  </view>

  <!-- Create modal -->
  <view class="modal-overlay" wx:if="{{showCreateModal}}" catchtap="onHideCreate">
    <view class="modal-content" catchtap="">
      <text class="modal-title">新建商家</text>
      <input class="modal-input" placeholder="商家名称" value="{{newMerchantName}}" bindinput="onNewNameInput" maxlength="50" />
      <input class="modal-input modal-input-desc" placeholder="商家描述（选填）" value="{{newMerchantDesc}}" bindinput="onNewDescInput" maxlength="200" />
      <view class="modal-buttons">
        <view class="modal-btn modal-btn-cancel" catchtap="onHideCreate">取消</view>
        <view class="modal-btn modal-btn-confirm {{creating ? 'disabled' : ''}}" catchtap="onCreateMerchant">
          <text wx:if="{{creating}}">创建中...</text>
          <text wx:else>创建</text>
        </view>
      </view>
    </view>
  </view>
</view>
```

---

### Task 6: Client - index page (WXSS)

**Files:**
- Rewrite: `ai-order/pages/index/index.wxss`

- [ ] **Step 1: Rewrite index.wxss**

```css
/* ai-order/pages/index/index.wxss */
.container {
  padding: 30rpx;
  background: #f5f5f5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 20rpx 0 30rpx;
}

.header-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.section-label {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 20rpx;
  padding-left: 10rpx;
}

.loading-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text {
  color: #999;
  font-size: 28rpx;
}

.merchant-scroll {
  flex: 1;
  max-height: 65vh;
}

.merchant-card {
  position: relative;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  border: 2rpx solid transparent;
  transition: border-color 0.2s;
}

.merchant-card.selected {
  border-color: #764ba2;
  background: #faf5ff;
}

.card-top {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.card-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.card-badge {
  margin-left: 12rpx;
  padding: 4rpx 12rpx;
  background: #e8e0f0;
  color: #764ba2;
  border-radius: 6rpx;
  font-size: 20rpx;
}

.card-desc {
  font-size: 26rpx;
  color: #888;
  margin-bottom: 10rpx;
  display: block;
}

.card-dishes {
  font-size: 24rpx;
  color: #aaa;
}

.card-check {
  position: absolute;
  right: 30rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 48rpx;
  height: 48rpx;
  background: #764ba2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  color: #fff;
  font-size: 28rpx;
}

.create-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 2rpx dashed #ccc;
  margin-bottom: 20rpx;
}

.create-icon {
  font-size: 36rpx;
  color: #764ba2;
  margin-right: 12rpx;
}

.create-text {
  font-size: 28rpx;
  color: #764ba2;
}

.bottom-buttons {
  display: flex;
  gap: 20rpx;
  margin-top: auto;
  padding: 20rpx 0;
}

.btn {
  flex: 1;
  padding: 28rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  color: #fff;
}

.btn-merchant {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.btn-customer {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.btn-icon {
  font-size: 32rpx;
}

.btn-label {
  font-size: 28rpx;
  font-weight: bold;
}

/* Create modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  width: 600rpx;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
  display: block;
  text-align: center;
}

.modal-input {
  width: 100%;
  padding: 20rpx 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 10rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
  box-sizing: border-box;
}

.modal-input-desc {
  font-size: 26rpx;
  color: #888;
}

.modal-buttons {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.modal-btn {
  flex: 1;
  padding: 22rpx;
  border-radius: 10rpx;
  text-align: center;
  font-size: 28rpx;
}

.modal-btn-cancel {
  background: #f0f0f0;
  color: #666;
}

.modal-btn-confirm {
  background: #764ba2;
  color: #fff;
}

.modal-btn-confirm.disabled {
  opacity: 0.6;
}
```

---

### Task 7: Client - update merchant/customer pages

**Files:**
- Modify: `ai-order/pages/merchant/merchant.js`
- Modify: `ai-order/pages/customer/customer.js`

- [ ] **Step 1: Update merchant.js to load merchant name from storage**

In `merchant.js` onLoad, after getting merchantId:

```js
// After line 55: that.setData({ merchantId: merchantId });
// Add:
var merchantName = wx.getStorageSync('ai-order-merchant-name') || '';
wx.setNavigationBarTitle({ title: merchantName ? merchantName + ' - AI菜单助手' : 'AI菜单助手' });
```

- [ ] **Step 2: Update customer.js to load merchant name**

In `customer.js` onLoad, after merchantId setup:

```js
// After setting merchantId
var merchantName = wx.getStorageSync('ai-order-merchant-name') || '';
wx.setNavigationBarTitle({ title: merchantName ? merchantName + ' - 智能点菜' : '智能点菜' });
```

Also update `_loadMenuFromDemoData` to use the updated demo data path (already done in earlier fix):

```js
// Line 94 in merchant.js, change:
// var data = require('../../data/demo-menus.json');
// to:
var data = require('../../data/demo-menus');
```

---

### Task 8: Client - demo-menus require fix for merchant.js

**Files:**
- Modify: `ai-order/pages/merchant/merchant.js`

- [ ] **Step 1: Fix the require path for demo-menus**

Line 94: Change `require('../../data/demo-menus.json')` to `require('../../data/demo-menus')`
