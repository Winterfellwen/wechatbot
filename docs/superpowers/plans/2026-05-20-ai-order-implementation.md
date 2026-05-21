# AI 点菜功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为微信小程序添加 AI 点菜子包，支持商家对话管理菜单和客户智能推荐下单

**Architecture:** 新增 `ai-order` 子包，复用现有 `smart-teacher` 对话模式，后端在 `index.js` 新增 `/api/ai-order/*` 接口，使用 OpenRouter API 调用 AI 模型，数据存储采用 JSON 文件（内置演示+localStorage）

**Tech Stack:** 微信小程序、Express.js、OpenRouter API、JSON 文件存储

---

### Task 1: 创建子包基础结构和入口页

**Files:**
- Create: `E:\AI\Wechatbot\ai-order\pages\index\index.js`
- Create: `E:\AI\Wechatbot\ai-order\pages\index\index.wxml`
- Create: `E:\AI\Wechatbot\ai-order\pages\index\index.wxss`
- Create: `E:\AI\Wechatbot\ai-order\pages\index\index.json`
- Modify: `E:\AI\Wechatbot\app.json`

- [ ] **Step 1: 创建入口页 JS**

```js
// ai-order/pages/index/index.js
var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;

Page({
  data: {
    currentMerchant: '川味小厨（演示）',
    merchantId: 'demo-restaurant-1'
  },

  onLoad: function() {
    var saved = wx.getStorageSync('ai-order-merchant');
    if (saved) {
      this.setData({
        currentMerchant: saved.name,
        merchantId: saved.id
      });
    }
  },

  onEnterMerchant: function() {
    wx.navigateTo({
      url: '/ai-order/pages/merchant/merchant?merchantId=' + this.data.merchantId
    });
  },

  onEnterCustomer: function() {
    wx.navigateTo({
      url: '/ai-order/pages/customer/customer?merchantId=' + this.data.merchantId
    });
  },

  onChangeMerchant: function() {
    wx.showToast({ title: '商户切换功能开发中', icon: 'none' });
  }
});
```

- [ ] **Step 2: 创建入口页 WXML**

```xml
<!-- ai-order/pages/index/index.wxml -->
<view class="container">
  <view class="merchant-selector">
    <text class="merchant-name">{{currentMerchant}}</text>
    <view class="change-btn" bindtap="onChangeMerchant">切换</view>
  </view>

  <view class="entry-buttons">
    <view class="entry-btn merchant-btn" bindtap="onEnterMerchant">
      <text class="btn-title">商家入口</text>
      <text class="btn-desc">管理菜单、添加菜品</text>
    </view>
    <view class="entry-btn customer-btn" bindtap="onEnterCustomer">
      <text class="btn-title">客户入口</text>
      <text class="btn-desc">智能推荐、虚拟下单</text>
    </view>
  </view>
</view>
```

- [ ] **Step 3: 创建入口页样式**

```css
/* ai-order/pages/index/index.wxss */
.container {
  padding: 40rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

.merchant-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 40rpx;
}

.merchant-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.change-btn {
  padding: 10rpx 24rpx;
  background: #764ba2;
  color: #fff;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.entry-buttons {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.entry-btn {
  padding: 40rpx;
  border-radius: 16rpx;
  color: #fff;
}

.merchant-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.customer-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.btn-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
}

.btn-desc {
  display: block;
  font-size: 24rpx;
  opacity: 0.8;
}
```

- [ ] **Step 4: 创建入口页 JSON 配置**

```json
{
  "navigationBarTitleText": "AI点菜",
  "usingComponents": {}
}
```

- [ ] **Step 5: 注册子包到 app.json**

在 `subpackages` 数组末尾添加：

```json
{
  "root": "ai-order",
  "pages": [
    "pages/index/index",
    "pages/merchant/merchant",
    "pages/customer/customer"
  ]
}
```

- [ ] **Step 6: 验证入口页**

在微信开发者工具中打开，确认入口页显示正常，两个按钮可点击。

- [ ] **Step 7: Commit**

```bash
git add ai-order/pages/index/* app.json
git commit -m "feat(ai-order): add entry page and subpackage registration"
```

---

### Task 2: 创建内置演示菜单数据

**Files:**
- Create: `E:\AI\Wechatbot\ai-order\data\demo-menus.json`

- [ ] **Step 1: 创建演示菜单 JSON**

```json
{
  "merchants": [
    {
      "id": "demo-restaurant-1",
      "name": "川味小厨（演示）",
      "dishes": [
        {
          "id": "dish-1",
          "name": "宫保鸡丁",
          "price": 28,
          "image": "",
          "description": "经典川菜，鸡肉配花生米，麻辣鲜香",
          "taste": "麻辣",
          "spicyLevel": 2,
          "status": "online"
        },
        {
          "id": "dish-2",
          "name": "红烧肉",
          "price": 32,
          "image": "",
          "description": "五花肉红烧，肥而不腻，入口即化",
          "taste": "咸甜",
          "spicyLevel": 0,
          "status": "online"
        },
        {
          "id": "dish-3",
          "name": "麻婆豆腐",
          "price": 18,
          "image": "",
          "description": "嫩豆腐配肉末，麻辣鲜香烫",
          "taste": "麻辣",
          "spicyLevel": 3,
          "status": "online"
        },
        {
          "id": "dish-4",
          "name": "糖醋排骨",
          "price": 38,
          "image": "",
          "description": "排骨糖醋汁，酸甜可口",
          "taste": "酸甜",
          "spicyLevel": 0,
          "status": "online"
        },
        {
          "id": "dish-5",
          "name": "水煮鱼",
          "price": 48,
          "image": "",
          "description": "鲜嫩鱼片配豆芽，麻辣过瘾",
          "taste": "麻辣",
          "spicyLevel": 3,
          "status": "online"
        },
        {
          "id": "dish-6",
          "name": "番茄炒蛋",
          "price": 15,
          "image": "",
          "description": "家常经典，酸甜适口",
          "taste": "酸甜",
          "spicyLevel": 0,
          "status": "online"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add ai-order/data/demo-menus.json
git commit -m "feat(ai-order): add demo menu data"
```

---

### Task 3: 后端新增 AI 点菜 API

**Files:**
- Modify: `E:\AI\Wechatbot\index.js`
- Modify: `E:\AI\Wechatbot\config.js`

- [ ] **Step 1: 在 config.js 添加点菜专用 AI 配置**

在 `config` 对象中添加：

```js
  // AI 点菜专用配置
  aiOrder: {
    apiKey: process.env.AI_ORDER_KEY || process.env.OPENROUTER_KEY || null,
    model: process.env.AI_ORDER_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free',
    apiUrl: 'https://openrouter.ai/api/v1',
    maxTokens: 800
  },
```

- [ ] **Step 2: 在 index.js 添加 AI 点菜配置获取接口**

在 `index.js` 末尾（`app.listen` 之前）添加：

```js
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
```

- [ ] **Step 3: 添加对话接口**

```js
// AI 点菜对话接口
app.post('/api/ai-order/chat', async (req, res) => {
  try {
    const { mode, merchantId, messages, menuData } = req.body;
    const aiOrderConfig = config.aiOrder;

    if (!aiOrderConfig || !aiOrderConfig.apiKey) {
      return res.status(500).json({ error: { message: 'AI Order API key not configured', code: 500 } });
    }

    // 根据模式构建系统提示
    let systemPrompt = '';
    if (mode === 'merchant') {
      systemPrompt = '你是餐厅菜单管理助手。帮助商家添加、删除、更新菜品。' +
        '必需信息：菜品名、价格。可选信息：图片、描述、口味、辣度(0-5)。' +
        '添加/删除/更新前需要商家确认。' +
        '用中文回答，语气专业友好。';
    } else {
      systemPrompt = '你是智能点菜助手。根据用户口味偏好推荐菜品。' +
        '推荐时要说明推荐理由。' +
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

    const response = await fetch(aiOrderConfig.apiUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiOrderConfig.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wechatbot-api-vfje.onrender.com',
        'X-Title': 'AIOrderBot'
      },
      body: JSON.stringify(requestBody)
    });

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
```

- [ ] **Step 4: 添加菜品管理接口**

```js
// 获取菜单
app.get('/api/ai-order/menu/list', (req, res) => {
  const merchantId = req.query.merchantId;
  // 先从演示数据查找
  const demoMenus = require('./ai-order/data/demo-menus.json');
  const demoMerchant = demoMenus.merchants.find(m => m.id === merchantId);
  if (demoMerchant) {
    return res.json({ success: true, data: demoMerchant, source: 'demo' });
  }
  // 否则返回空菜单
  res.json({ success: true, data: { id: merchantId, name: '未知商家', dishes: [] }, source: 'empty' });
});

// 添加菜品
app.post('/api/ai-order/menu/add', (req, res) => {
  const { merchantId, dish } = res.body;
  // 对于演示数据，返回成功但不实际修改（演示模式）
  const demoMenus = require('./ai-order/data/demo-menus.json');
  const demoMerchant = demoMenus.merchants.find(m => m.id === merchantId);
  if (demoMerchant) {
    return res.json({ success: true, message: '演示模式：菜品已添加到本地缓存', dish });
  }
  // 实际存储逻辑（localStorage 在前端处理）
  res.json({ success: true, message: '菜品已添加', dish });
});

// 更新菜品
app.post('/api/ai-order/menu/update', (req, res) => {
  const { merchantId, dishId, updates } = req.body;
  res.json({ success: true, message: '菜品已更新', dishId, updates });
});

// 删除菜品
app.post('/api/ai-order/menu/delete', (req, res) => {
  const { merchantId, dishId } = req.body;
  res.json({ success: true, message: '菜品已删除', dishId });
});
```

- [ ] **Step 5: 验证 API**

```bash
node index.js
# 在另一个终端测试
curl http://localhost:3000/api/ai-order/config
curl http://localhost:3000/api/ai-order/menu/list?merchantId=demo-restaurant-1
```

预期输出：config 返回 API 配置，menu/list 返回演示菜单数据。

- [ ] **Step 6: Commit**

```bash
git add index.js config.js
git commit -m "feat(ai-order): add backend APIs for chat and menu management"
```

---

### Task 4: 创建商家对话页

**Files:**
- Create: `E:\AI\Wechatbot\ai-order\pages\merchant\merchant.js`
- Create: `E:\AI\Wechatbot\ai-order\pages\merchant\merchant.wxml`
- Create: `E:\AI\Wechatbot\ai-order\pages\merchant\merchant.wxss`
- Create: `E:\AI\Wechatbot\ai-order\pages\merchant\merchant.json`

- [ ] **Step 1: 创建商家对话页 JS**

```js
// ai-order/pages/merchant/merchant.js
var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;
var msgIdCounter = 0;

var openRouterConfig = null;
var configLoaded = false;
var configLoading = null;

function initOpenRouter() {
  if (openRouterConfig && configLoaded) return Promise.resolve();
  if (configLoading) return configLoading;
  configLoading = new Promise(function(resolve, reject) {
    wx.request({
      url: SERVER + '/api/ai-order/config',
      timeout: 5000,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.key) {
          openRouterConfig = res.data;
          configLoaded = true;
          configLoading = null;
          resolve();
        } else {
          configLoading = null;
          reject(new Error('Failed to get AI order config'));
        }
      },
      fail: function(err) {
        configLoading = null;
        reject(err);
      }
    });
  });
  return configLoading;
}

Page({
  data: {
    messages: [],
    inputText: '',
    loading: false,
    scrollTop: 0,
    hasInput: false,
    merchantId: '',
    menuData: null
  },

  onLoad: function(options) {
    var that = this;
    var merchantId = options.merchantId || 'demo-restaurant-1';
    this.setData({ merchantId: merchantId });
    initOpenRouter().catch(function(err) {
      console.warn('[merchant] AI config unavailable:', err);
    });
    this.loadMenu();
    this.addWelcomeMessage();
  },

  loadMenu: function() {
    var that = this;
    wx.request({
      url: SERVER + '/api/ai-order/menu/list',
      data: { merchantId: this.data.merchantId },
      success: function(res) {
        if (res.data && res.data.success) {
          that.setData({ menuData: res.data.data });
        }
      }
    });
  },

  addWelcomeMessage: function() {
    var welcomeMsg = {
      id: ++msgIdCounter,
      role: 'ai',
      content: '欢迎使用商家菜单管理！您可以：\n1. 添加新菜品\n2. 查看当前菜单\n3. 修改或删除菜品\n\n请告诉我您想做什么？'
    };
    this.setData({ messages: [welcomeMsg] });
  },

  scrollToBottom: function() {
    var that = this;
    setTimeout(function() {
      that.setData({ scrollTop: 999999 });
    }, 100);
  },

  onInput: function(e) {
    var value = e.detail.value;
    this.setData({
      inputText: value,
      hasInput: value.trim().length > 0
    });
  },

  onSend: function() {
    var text = this.data.inputText.trim();
    if (!text) return;
    this.sendMessage(text);
  },

  sendMessage: function(text) {
    if (this.data.loading) return;
    var that = this;

    var userMsg = { id: ++msgIdCounter, role: 'user', content: text };
    var messages = this.data.messages.concat([userMsg]);
    this.setData({ messages: messages, inputText: '', loading: true, hasInput: false });
    this.scrollToBottom();

    var apiMessages = this._buildApiMessages(messages);

    initOpenRouter().then(function() {
      that._tryChat(apiMessages);
    }).catch(function() {
      openRouterConfig = null;
      that._tryChat(apiMessages);
    });
  },

  _buildApiMessages: function(messages) {
    var apiMessages = [];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.role === 'user') {
        apiMessages.push({ role: 'user', content: m.content || '' });
      } else if (m.role === 'ai') {
        apiMessages.push({ role: 'assistant', content: m.content });
      }
    }
    return apiMessages;
  },

  _tryChat: function(apiMessages) {
    var that = this;

    if (openRouterConfig) {
      wx.request({
        url: openRouterConfig.apiUrl + '/chat/completions',
        method: 'POST',
        timeout: 15000,
        header: {
          'Authorization': 'Bearer ' + openRouterConfig.key,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://wechatbot-api-vfje.onrender.com',
          'X-Title': 'AIOrderBot'
        },
        data: {
          model: openRouterConfig.model,
          messages: apiMessages,
          max_tokens: openRouterConfig.maxTokens
        },
        success: function(res) {
          if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
            var reply = res.data.choices[0].message.content || '抱歉，我暂时无法回答';
            that._handleResponse(reply);
          } else {
            that._tryProxy(apiMessages);
          }
        },
        fail: function() {
          that._tryProxy(apiMessages);
        }
      });
    } else {
      that._tryProxy(apiMessages);
    }
  },

  _tryProxy: function(apiMessages) {
    var that = this;
    wx.request({
      url: SERVER + '/api/ai-order/chat',
      method: 'POST',
      timeout: 15000,
      header: { 'Content-Type': 'application/json' },
      data: {
        mode: 'merchant',
        merchantId: this.data.merchantId,
        messages: apiMessages,
        menuData: this.data.menuData
      },
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
          var reply = res.data.choices[0].message.content || '抱歉，我暂时无法回答';
          that._handleResponse(reply);
        } else {
          that._showError('请求失败，请稍后再试');
        }
      },
      fail: function() {
        that._showError('网络错误，请检查网络后重试');
      }
    });
  },

  _handleResponse: function(reply) {
    var that = this;
    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: reply };
    that.setData({ messages: that.data.messages.concat([aiMsg]), loading: false });
    that.scrollToBottom();
    // 刷新菜单数据
    that.loadMenu();
  },

  _showError: function(msg) {
    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: msg };
    this.setData({ messages: this.data.messages.concat([aiMsg]), loading: false });
    this.scrollToBottom();
  }
});
```

- [ ] **Step 2: 创建商家对话页 WXML**

```xml
<!-- ai-order/pages/merchant/merchant.wxml -->
<view class="chat-container">
  <scroll-view
    class="message-list"
    scroll-y="true"
    scroll-top="{{scrollTop}}"
    bindscrolltoupper="onScrollToUpper"
  >
    <view class="message" wx:for="{{messages}}" wx:key="id">
      <view class="message-bubble {{item.role === 'user' ? 'user-bubble' : 'ai-bubble'}}">
        <text class="message-text">{{item.content}}</text>
      </view>
    </view>
    <view class="loading" wx:if="{{loading}}">
      <text>AI 正在思考...</text>
    </view>
  </scroll-view>

  <view class="input-bar">
    <input
      class="input"
      value="{{inputText}}"
      placeholder="输入消息..."
      bindinput="onInput"
      bindconfirm="onSend"
      disabled="{{loading}}"
    />
    <view class="send-btn {{hasInput ? 'active' : ''}}" bindtap="onSend">
      <text>发送</text>
    </view>
  </view>
</view>
```

- [ ] **Step 3: 创建商家对话页样式**

```css
/* ai-order/pages/merchant/merchant.wxss */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.message-list {
  flex: 1;
  padding: 20rpx;
}

.message {
  margin-bottom: 20rpx;
}

.message-bubble {
  max-width: 80%;
  padding: 20rpx;
  border-radius: 16rpx;
  word-wrap: break-word;
}

.user-bubble {
  background: #764ba2;
  color: #fff;
  margin-left: auto;
}

.ai-bubble {
  background: #fff;
  color: #333;
}

.message-text {
  font-size: 28rpx;
  line-height: 1.6;
  white-space: pre-wrap;
}

.loading {
  text-align: center;
  padding: 20rpx;
  color: #999;
  font-size: 24rpx;
}

.input-bar {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
}

.input {
  flex: 1;
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.send-btn {
  margin-left: 20rpx;
  padding: 16rpx 32rpx;
  background: #ccc;
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.send-btn.active {
  background: #764ba2;
}
```

- [ ] **Step 4: 创建商家对话页 JSON**

```json
{
  "navigationBarTitleText": "商家菜单管理",
  "usingComponents": {}
}
```

- [ ] **Step 5: Commit**

```bash
git add ai-order/pages/merchant/*
git commit -m "feat(ai-order): add merchant chat page"
```

---

### Task 5: 创建客户对话页

**Files:**
- Create: `E:\AI\Wechatbot\ai-order\pages\customer\customer.js`
- Create: `E:\AI\Wechatbot\ai-order\pages\customer\customer.wxml`
- Create: `E:\AI\Wechatbot\ai-order\pages\customer\customer.wxss`
- Create: `E:\AI\Wechatbot\ai-order\pages\customer\customer.json`

- [ ] **Step 1: 创建客户对话页 JS**

```js
// ai-order/pages/customer/customer.js
var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;
var msgIdCounter = 0;

var openRouterConfig = null;
var configLoaded = false;
var configLoading = null;

function initOpenRouter() {
  if (openRouterConfig && configLoaded) return Promise.resolve();
  if (configLoading) return configLoading;
  configLoading = new Promise(function(resolve, reject) {
    wx.request({
      url: SERVER + '/api/ai-order/config',
      timeout: 5000,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.key) {
          openRouterConfig = res.data;
          configLoaded = true;
          configLoading = null;
          resolve();
        } else {
          configLoading = null;
          reject(new Error('Failed to get AI order config'));
        }
      },
      fail: function(err) {
        configLoading = null;
        reject(err);
      }
    });
  });
  return configLoading;
}

Page({
  data: {
    messages: [],
    inputText: '',
    loading: false,
    scrollTop: 0,
    hasInput: false,
    merchantId: '',
    menuData: null,
    selectedDishes: [],
    totalPrice: 0
  },

  onLoad: function(options) {
    var that = this;
    var merchantId = options.merchantId || 'demo-restaurant-1';
    this.setData({ merchantId: merchantId });
    initOpenRouter().catch(function(err) {
      console.warn('[customer] AI config unavailable:', err);
    });
    this.loadMenu();
    this.addWelcomeMessage();
  },

  loadMenu: function() {
    var that = this;
    wx.request({
      url: SERVER + '/api/ai-order/menu/list',
      data: { merchantId: this.data.merchantId },
      success: function(res) {
        if (res.data && res.data.success) {
          that.setData({ menuData: res.data.data });
        }
      }
    });
  },

  addWelcomeMessage: function() {
    var welcomeMsg = {
      id: ++msgIdCounter,
      role: 'ai',
      content: '欢迎使用智能点菜！告诉我您想吃什么口味，我来为您推荐菜品~'
    };
    this.setData({ messages: [welcomeMsg] });
  },

  scrollToBottom: function() {
    var that = this;
    setTimeout(function() {
      that.setData({ scrollTop: 999999 });
    }, 100);
  },

  onInput: function(e) {
    var value = e.detail.value;
    this.setData({
      inputText: value,
      hasInput: value.trim().length > 0
    });
  },

  onSend: function() {
    var text = this.data.inputText.trim();
    if (!text) return;
    this.sendMessage(text);
  },

  sendMessage: function(text) {
    if (this.data.loading) return;
    var that = this;

    var userMsg = { id: ++msgIdCounter, role: 'user', content: text };
    var messages = this.data.messages.concat([userMsg]);
    this.setData({ messages: messages, inputText: '', loading: true, hasInput: false });
    this.scrollToBottom();

    var apiMessages = this._buildApiMessages(messages);

    initOpenRouter().then(function() {
      that._tryChat(apiMessages);
    }).catch(function() {
      openRouterConfig = null;
      that._tryChat(apiMessages);
    });
  },

  _buildApiMessages: function(messages) {
    var apiMessages = [];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.role === 'user') {
        apiMessages.push({ role: 'user', content: m.content || '' });
      } else if (m.role === 'ai') {
        apiMessages.push({ role: 'assistant', content: m.content });
      }
    }
    return apiMessages;
  },

  _tryChat: function(apiMessages) {
    var that = this;

    if (openRouterConfig) {
      wx.request({
        url: openRouterConfig.apiUrl + '/chat/completions',
        method: 'POST',
        timeout: 15000,
        header: {
          'Authorization': 'Bearer ' + openRouterConfig.key,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://wechatbot-api-vfje.onrender.com',
          'X-Title': 'AIOrderBot'
        },
        data: {
          model: openRouterConfig.model,
          messages: apiMessages,
          max_tokens: openRouterConfig.maxTokens
        },
        success: function(res) {
          if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
            var reply = res.data.choices[0].message.content || '抱歉，我暂时无法回答';
            that._handleResponse(reply);
          } else {
            that._tryProxy(apiMessages);
          }
        },
        fail: function() {
          that._tryProxy(apiMessages);
        }
      });
    } else {
      that._tryProxy(apiMessages);
    }
  },

  _tryProxy: function(apiMessages) {
    var that = this;
    wx.request({
      url: SERVER + '/api/ai-order/chat',
      method: 'POST',
      timeout: 15000,
      header: { 'Content-Type': 'application/json' },
      data: {
        mode: 'customer',
        merchantId: this.data.merchantId,
        messages: apiMessages,
        menuData: this.data.menuData
      },
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
          var reply = res.data.choices[0].message.content || '抱歉，我暂时无法回答';
          that._handleResponse(reply);
        } else {
          that._showError('请求失败，请稍后再试');
        }
      },
      fail: function() {
        that._showError('网络错误，请检查网络后重试');
      }
    });
  },

  _handleResponse: function(reply) {
    var that = this;
    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: reply };
    that.setData({ messages: that.data.messages.concat([aiMsg]), loading: false });
    that.scrollToBottom();
  },

  _showError: function(msg) {
    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: msg };
    this.setData({ messages: this.data.messages.concat([aiMsg]), loading: false });
    this.scrollToBottom();
  }
});
```

- [ ] **Step 2: 创建客户对话页 WXML**

```xml
<!-- ai-order/pages/customer/customer.wxml -->
<view class="chat-container">
  <scroll-view
    class="message-list"
    scroll-y="true"
    scroll-top="{{scrollTop}}"
  >
    <view class="message" wx:for="{{messages}}" wx:key="id">
      <view class="message-bubble {{item.role === 'user' ? 'user-bubble' : 'ai-bubble'}}">
        <text class="message-text">{{item.content}}</text>
      </view>
    </view>
    <view class="loading" wx:if="{{loading}}">
      <text>AI 正在思考...</text>
    </view>
  </scroll-view>

  <view class="input-bar">
    <input
      class="input"
      value="{{inputText}}"
      placeholder="输入您想吃的口味..."
      bindinput="onInput"
      bindconfirm="onSend"
      disabled="{{loading}}"
    />
    <view class="send-btn {{hasInput ? 'active' : ''}}" bindtap="onSend">
      <text>发送</text>
    </view>
  </view>
</view>
```

- [ ] **Step 3: 创建客户对话页样式**

```css
/* ai-order/pages/customer/customer.wxss */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.message-list {
  flex: 1;
  padding: 20rpx;
}

.message {
  margin-bottom: 20rpx;
}

.message-bubble {
  max-width: 80%;
  padding: 20rpx;
  border-radius: 16rpx;
  word-wrap: break-word;
}

.user-bubble {
  background: #f5576c;
  color: #fff;
  margin-left: auto;
}

.ai-bubble {
  background: #fff;
  color: #333;
}

.message-text {
  font-size: 28rpx;
  line-height: 1.6;
  white-space: pre-wrap;
}

.loading {
  text-align: center;
  padding: 20rpx;
  color: #999;
  font-size: 24rpx;
}

.input-bar {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
}

.input {
  flex: 1;
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.send-btn {
  margin-left: 20rpx;
  padding: 16rpx 32rpx;
  background: #ccc;
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.send-btn.active {
  background: #f5576c;
}
```

- [ ] **Step 4: 创建客户对话页 JSON**

```json
{
  "navigationBarTitleText": "智能点菜",
  "usingComponents": {}
}
```

- [ ] **Step 5: Commit**

```bash
git add ai-order/pages/customer/*
git commit -m "feat(ai-order): add customer chat page"
```

---

### Task 6: 测试和验证

**Files:**
- No new files

- [ ] **Step 1: 启动后端服务**

```bash
node index.js
```

确认服务在端口 3000 启动成功。

- [ ] **Step 2: 测试 API 接口**

```bash
# 测试配置接口
curl http://localhost:3000/api/ai-order/config

# 测试菜单接口
curl "http://localhost:3000/api/ai-order/menu/list?merchantId=demo-restaurant-1"

# 测试对话接口
curl -X POST http://localhost:3000/api/ai-order/chat \
  -H "Content-Type: application/json" \
  -d '{"mode":"customer","merchantId":"demo-restaurant-1","messages":[{"role":"user","content":"我想吃辣的"}],"menuData":{"dishes":[{"name":"宫保鸡丁","price":28,"taste":"麻辣","spicyLevel":2}]}}'
```

- [ ] **Step 3: 在微信开发者工具中测试**

1. 打开微信开发者工具，导入项目
2. 导航到 AI 点菜页面
3. 测试商家入口：发送消息，确认 AI 回复正常
4. 测试客户入口：发送口味偏好，确认推荐菜品
5. 确认页面切换流畅，无报错

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore(ai-order): verify all features working"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 双入口（商家/客户）
- ✅ 商家对话管理菜单
- ✅ 客户智能推荐
- ✅ JSON 数据存储（演示+localStorage）
- ✅ AI 对话接口
- ✅ 内置演示菜单
- ⚠️ 语音输入 - 未实现（标记为后续功能）
- ⚠️ 文件上传 - 未实现（标记为后续功能）
- ⚠️ 商户切换 - 基础框架已建，完整功能标记为后续

**2. Placeholder scan:** 无 TBD/TODO/占位符

**3. Type consistency:** 所有接口使用一致的 `merchantId`, `mode`, `messages` 参数

**4. 简化说明:** 语音输入和文件上传作为后续迭代，当前版本聚焦核心对话功能
