# AI 点菜 WebSocket 流式加速

## 问题

AI 点菜经 OpenRouter 免费模型（nemotron-nano）回复慢：
1. 发消息后 15-30s 无反馈，用户不知道有没有进展
2. 总耗时过长

## 方案

WebSocket 流式传输。小程序连接 Render 的 WebSocket，Render 以 `stream: true` 调 OpenRouter，逐 token 转发，前端逐字渲染。

## 架构

```
小程序 → Render (ws://host/ws) → OpenRouter (stream:true)
                                            ↓ (SSE token chunks)
小程序 ← token-by-token ← Render
小程序 ← { type:"done", recommendations }
```

Render 同一端口同时服务 HTTP（Express）和 WebSocket（ws 库）。

## 消息协议

### 小程序 → 服务端

| type | 字段 | 说明 |
|------|------|------|
| `chat` | `messages`, `mode`, `menuData` | 发起对话请求 |
| `ping` | — | 心跳 |

### 服务端 → 小程序

| type | 字段 | 说明 |
|------|------|------|
| `token` | `content: string` | 一段文本增量 |
| `done` | `content: string`, `recommendations: [...]` | 流结束，完整回复+推荐 |
| `error` | `message: string` | 错误 |
| `pong` | — | 心跳回复 |

## 服务端改动

### 依赖
- 新增 `ws` npm 包

### WebSocket Server（index.js）
- 创建 `http.Server` 包裹 Express app
- 挂载 `WebSocketServer`，path `/ws`
- 收到 `chat` 消息：
  1. 构建 system prompt（复用现有逻辑）
  2. 调 OpenRouter `POST /chat/completions`，`stream: true`
  3. 用 `response.body.getReader()` 读 SSE 流
  4. 解析 `data: {...}` 行，提取 `choices[0].delta.content`
  5. 每个非空 token 发 `{ type: "token", content }` 给客户端
  6. 流结束（`[DONE]`），积累完整文本，扫描菜品名生成 recommendations
  7. 发 `{ type: "done", content, recommendations }`
- 异常时发 `{ type: "error", message }`
- 心跳：接收 `ping` 回复 `pong`，30s 无消息自动断开
- 单连接 serial 执行（新 chat 消息等待前一个完成）

### 保留 HTTP 端点
- `/api/ai-order/chat` 不动，做 fallback

## 前端改动（customer.js）

### 连接管理（SocketTask）
- `onLoad` 时创建 `SocketTask`：`wx.connectSocket({ url: "wss://wechatbot-api-sg.onrender.com/ws" })`
- 通过 `task.onOpen / onMessage / onClose / onError` 绑定回调
- 自动重连：`onClose` 时 1s/2s/4s 递增重试，最多 3 次
- `onHide` 时 `task.close()`，`onShow` 时重新 `connectSocket`
- 心跳：每 15s `task.send({ data: '{"type":"ping"}' })`

### 发送消息（sendMessage 改造）
- 原 `_tryProxy` → 改为先尝试 WebSocket 发送 `{ type: "chat", messages, menuData }`
- WebSocket 发送失败或 30s 无响应 → 降级到 HTTP `_tryProxy`

### 接收渲染
- `wx.onSocketMessage` 收到 `token` → 追加到当前 AI 消息文本，更新 `data.messages`
- 收到 `done` → 执行 `_applyAiRecommendations`
- 收到 `error` → 显示错误信息

### UI 变化
- `loading=true` 时：显示打字光标动画（`chat-typing` 组件，闪烁 "▋"），替代现有 spinner
- 首 token 到达：光标保留在文本末尾，用户看到文字逐段出现
- `done` 到达：移除光标，完整静态消息

## 未触及

- 现有 HTTP `/api/ai-order/chat` 端点保留完整
- 现有 `_tryDirect` 直连 OpenRouter 保留
- AI 推荐分组逻辑 `_applyAiRecommendations` 不变
- 菜单数据、购物车、下单流程不变
