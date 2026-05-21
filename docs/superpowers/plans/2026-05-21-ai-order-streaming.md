# AI 点菜 WebSocket 流式加速 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 点菜从全同步 HTTP 改为 WebSocket 流式，逐 token 渲染到聊天框，解决长时间无反馈和总耗时感知问题。

**Architecture:** 在 Render 同一端口上挂载 `ws` WebSocket Server，小程序创建 SocketTask 连接；`chat` 消息经 WebSocket 发送，服务端以 `stream: true` 调 OpenRouter，解析 SSE 后逐 token 转发；前端收到 `token` 即时追加文本，收到 `done` 执行推荐提取。连接失败自动降级到现有 HTTP 代理。

**Tech Stack:** Node.js + Express + `ws` 库 + WeChat Mini-program SocketTask

**Spec:** `docs/superpowers/specs/2026-05-21-ai-order-streaming-design.md`

---

### 文件结构

```
E:\AI\Wechatbot\
├── index.js                     修改 — 加 ws server、SSE 流式 handler
├── package.json                 修改 — 加 ws 依赖
├── ai-order/pages/customer/
│   ├── customer.js              修改 — WebSocket 连接、发送、接收、降级
│   ├── customer.wxml            修改 — 流式消息渲染 + typing cursor
│   └── customer.wxss            修改 — typing cursor 动画样式
```

---

### Task 1: 服务端 WebSocket + SSE 流式转发

**Files:**
- Modify: `E:\AI\Wechatbot\package.json`
- Modify: `E:\AI\Wechatbot\index.js`

- [ ] **Step 1: 安装 ws 依赖**

```bash
npm install ws
```

- [ ] **Step 2: 改造 index.js — HTTP Server + WebSocket Server**

在文件顶部 `require` 区域追加：

```js
const http = require('http');
const { WebSocketServer } = require('ws');
```

文件末尾 `app.listen(PORT, ...)` 改为：

```js
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('WebSocket connected');
  ws.isBusy = false;
  let keepAliveTimer = setTimeout(() => { ws.terminate(); }, 30000);

  ws.on('message', (raw) => {
    clearTimeout(keepAliveTimer);
    keepAliveTimer = setTimeout(() => { ws.terminate(); }, 30000);
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

  ws.on('close', () => { clearTimeout(keepAliveTimer); });
  ws.on('error', () => { clearTimeout(keepAliveTimer); });
});

server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
```

- [ ] **Step 3: 添加 handleChatStream 函数**

在 `server.listen` 之前（或在 `wss.on('connection')` 之前）添加：

```js
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

    // Extract dish recommendations (same logic as existing _handleResponse)
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
```

- [ ] **Step 4: 验证语法**

```bash
node -c E:\AI\Wechatbot\index.js
```

Expected: 无语法错误。

---

### Task 2: 前端 WebSocket 连接管理

**Files:**
- Modify: `E:\AI\Wechatbot\ai-order\pages\customer\customer.js`

- [ ] **Step 1: 添加 WebSocket 常量**

在文件顶部 `var OCI_BASE` 下加入：

```js
var WS_URL = 'wss://wechatbot-api-sg.onrender.com/ws';
var wsTask = null;
var wsReconnectCount = 0;
var wsReconnectTimer = null;
var wsHeartbeatTimer = null;
```

- [ ] **Step 2: 添加 `_connectWebSocket` 方法**

在 `_buildApiMessages` 方法后添加：

```js
  _connectWebSocket: function() {
    var that = this;
    if (wsTask) {
      try { wsTask.close({}); } catch (_) {}
      wsTask = null;
    }
    wsTask = wx.connectSocket({ url: WS_URL });
    wsTask.onOpen(function() {
      wsReconnectCount = 0;
      that._startWsHeartbeat();
    });
    wsTask.onError(function() { that._onWsFail(); });
    wsTask.onClose(function() { that._onWsFail(); });
    wsTask.onMessage(function(res) { that._onWsMessage(res); });
  },

  _onWsFail: function() {
    var that = this;
    if (wsHeartbeatTimer) { clearInterval(wsHeartbeatTimer); wsHeartbeatTimer = null; }
    wsTask = null;
    if (wsReconnectCount < 3) {
      wsReconnectCount++;
      var delay = [1000, 2000, 4000][wsReconnectCount - 1] || 4000;
      wsReconnectTimer = setTimeout(function() { that._connectWebSocket(); }, delay);
    }
  },

  _startWsHeartbeat: function() {
    var that = this;
    if (wsHeartbeatTimer) clearInterval(wsHeartbeatTimer);
    wsHeartbeatTimer = setInterval(function() {
      if (!wsTask) return;
      try { wsTask.send({ data: JSON.stringify({ type: 'ping' }) }); } catch (_) {}
    }, 15000);
  },

  _sendWsMessage: function(data, callback) {
    if (!wsTask) { if (callback) callback(false); return; }
    try {
      wsTask.send({
        data: JSON.stringify(data),
        success: function() { if (callback) callback(true); },
        fail: function() { if (callback) callback(false); }
      });
    } catch (_) {
      if (callback) callback(false);
    }
  },

  _disconnectWs: function() {
    if (wsHeartbeatTimer) { clearInterval(wsHeartbeatTimer); wsHeartbeatTimer = null; }
    if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
    wsReconnectCount = 0;
    if (wsTask) { try { wsTask.close({}); } catch (_) {} wsTask = null; }
  },
```

- [ ] **Step 3: 在 `onLoad` 中连接 WebSocket**

找到 `onLoad` 方法，在其中加入：

```js
    this._connectWebSocket();
```

- [ ] **Step 4: 在 `onHide` 中断开、`onShow` 中重连**

找到 `onHide` 和 `onShow`（如果没有则添加 Page 生命周期）：

```js
  onHide: function() {
    this._disconnectWs();
  },

  onShow: function() {
    this._connectWebSocket();
  },
```

---

### Task 3: 前端 WebSocket 消息发送 + 流式接收

**Files:**
- Modify: `E:\AI\Wechatbot\ai-order\pages\customer\customer.js`

- [ ] **Step 1: 添加 `_onWsMessage` 方法**

```js
  _onWsMessage: function(res) {
    var that = this;
    try {
      var msg = JSON.parse(res.data);
      if (msg.type === 'pong') return;
      if (msg.type === 'token') {
        var cur = that.data.streamingText || '';
        that.setData({ streamingText: cur + msg.content });
        that._scrollChatBottom();
        return;
      }
      if (msg.type === 'done') {
        var fullContent = msg.content || '';
        var recommendations = msg.recommendations || [];

        that._applyAiRecommendations(recommendations);

        var aiMsg = {
          id: ++msgIdCounter,
          role: 'ai',
          content: fullContent,
          recommendations: recommendations
        };
        that.setData({
          messages: that.data.messages.concat([aiMsg]),
          loading: false,
          streamingText: ''
        });
        that._scrollChatBottom();
        return;
      }
      if (msg.type === 'error') {
        // Show error in chat, fallback not needed here since error came from server
        var errAiMsg = { id: ++msgIdCounter, role: 'ai', content: '出错了：' + (msg.message || '未知错误') };
        that.setData({ messages: that.data.messages.concat([errAiMsg]), loading: false, streamingText: '' });
        that._scrollChatBottom();
        return;
      }
    } catch (_) { /* ignore */ }
  },
```

- [ ] **Step 2: 改造 `sendMessage` — 优先走 WebSocket**

将 `sendMessage` 中 `initOpenRouter().then(...)` 代码块替换为：

```js
    var that = this;
    that.setData({ aiRecommendations: [] });

    var userMsg = { id: ++msgIdCounter, role: 'user', content: text };
    var messages = this.data.messages.concat([userMsg]);
    this.setData({ messages: messages, inputText: '', loading: true, hasInput: false });
    this._scrollChatBottom();

    var apiMessages = this._buildApiMessages(messages);

    // Try WebSocket first
    var sentViaWs = false;
    if (wsTask) {
      this._sendWsMessage({ type: 'chat', messages: apiMessages, mode: 'customer', menuData: menuData }, function(ok) {
        if (ok) {
          sentViaWs = true;
          // Set a timeout for WS response
          setTimeout(function() {
            if (that.data.loading) {
              // No response via WS in time, fallback to HTTP
              that.setData({ streamingText: '', loading: true }); // reset streaming state
              that._attemptRequest(0, Date.now(), apiMessages);
            }
          }, 25000);
        } else {
          // WS send failed, fallback to HTTP immediately
          that._attemptRequest(0, Date.now(), apiMessages);
        }
      });
      // If wsTask.send fails synchronously, it will call callback(false) in _sendWsMessage
    } else {
      that._attemptRequest(0, Date.now(), apiMessages);
    }
```

- [ ] **Step 3: 添加 `streamingText` 到 data**

在 `onLoad` 或页面 data 初始化中找到 `data` 定义，追加：

```js
    streamingText: '',
```

- [ ] **Step 4: 添加 `ws-interrupted` class 来补全路由情况**

无额外改动。原有的 `_attemptRequest` / `_tryProxy` 链路保留，仅在 WebSocket 不可用时走 HTTP。

---

### Task 4: 前端流式消息渲染 UI

**Files:**
- Modify: `E:\AI\Wechatbot\ai-order\pages\customer\customer.wxml`
- Modify: `E:\AI\Wechatbot\ai-order\pages\customer\customer.wxss`

- [ ] **Step 1: WXML — 添加流式消息气泡**

在 `<view wx:for="{{messages}}"...>` 循环之后、loading 指示器之前，追加：

```xml
    <view wx:if="{{streamingText}}" class="msg-wrapper">
      <view class="msg-row ai">
        <view class="ai-avatar-mini">
          <text class="ai-avatar-text">AI</text>
        </view>
        <view class="msg-content">
          <view class="bubble ai-bubble">
            <text class="bubble-text" selectable="true" user-select="true">{{streamingText}}</text>
            <text class="typing-cursor">▋</text>
          </view>
        </view>
      </view>
    </view>

将现有 loading 指示器的 `wx:if` 改为 `wx:elif`，防止 streamingText 与 loading 同时显示：

```diff
-    <view wx:if="{{loading}}" class="msg-wrapper">
+    <view wx:elif="{{loading}}" class="msg-wrapper">
```

- [ ] **Step 2: WXSS — 添加 typing cursor 动画**

在 customer.wxss 末尾追加：

```css
.typing-cursor {
  display: inline;
  font-size: 28rpx;
  line-height: 1.6;
  color: #666;
  animation: blink-cursor 0.8s step-end infinite;
}

@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

- [ ] **Step 3: 验证 WXML 语法**

```bash
wechat-miniprogram 无 CLI 检查工具，手动 review：streamingText 非空时显示 AI 气泡 + 打字光标，loading=true + streamingText 为空时显示现有 typing-dots。
```

---

### Task 5: 验证整体流程

- [ ] **Step 1: 本地启动服务端**

```bash
cd E:\AI\Wechatbot
node index.js
```

检查输出 `Server running on port 3000`，无 `ws` 相关报错。

- [ ] **Step 2: WebSocket 连通性测试**

用 wscat 或类似工具测试：

```bash
npx wscat -c ws://localhost:3000/ws
```

连接成功后发送 `{"type":"ping"}`，应收到 `{"type":"pong"}`。

- [ ] **Step 3: 小程序真机/模拟器测试**

用微信开发者工具，进入 AI 点菜页面，检查：
- 页面加载后 WebSocket 连接建立（服务端打印 `WebSocket connected`）
- 发送消息后 tokens 逐段出现
- 流结束后推荐分组出现
- 手动断开 WebSocket（关闭开发者工具网络），发送消息走 HTTP fallback

---

### 回退方案

如果 WebSocket 方案出现问题：
- 保留完整 HTTP `/api/ai-order/chat` 端点
- 前端 `wsTask` 断开时自动走 `_attemptRequest` → `_tryProxy` → `_tryDirect` 链路
- 仅需还原 `sendMessage` 到旧逻辑即可完全回退
