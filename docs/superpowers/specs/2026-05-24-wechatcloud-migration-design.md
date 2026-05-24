# 后端全面迁移至微信云开发 - 设计文档

日期：2026-05-24 | 分支：wechatcloud | 环境ID：cloud1-7gzoz5cr22dd4354

## 1. 目标

将现有后端从 Render + Express + Aiven MySQL + OCI 全面迁移到微信小程序云开发，包括数据库、云函数、云存储、认证体系。

## 2. 架构变更

```
迁移前：小程序 → wx.request → Render(Express) → MySQL/OCI/外部API
迁移后：小程序 → wx.cloud.callFunction → 云函数 → 云数据库/云存储/外部API
```

## 3. 云函数设计（方案 A：按功能域拆分，共 7 个）

每个云函数内部通过 `event.action` 路由分发。

| 云函数 | 职责 | Actions |
|--------|------|---------|
| `auth` | 登录、用户信息 | login, getUser, updateUser, deleteUser |
| `ai-order-merchant` | 商家 CRUD | list, create, delete |
| `ai-order-menu` | 菜单 CRUD | list, save, updateDish |
| `ai-order-chat` | AI 点菜聊天 | chat, history |
| `chat` | 通用聊天 | send, history |
| `file` | 文件处理 | pdfConvert, pdfStatus, pdfEdit, pdfMerge, wordImport |
| `jp` | 日语课程 | saveScore, getScores |

### 3.1 云函数通用模式

```js
// cloud/functions/<name>/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { action, data } = event;
  const { OPENID } = cloud.getWXContext();
  switch (action) {
    case 'xxx': return handleXxx(data, OPENID);
    // ...
  }
};
```

### 3.2 前端调用模式

```js
wx.cloud.callFunction({ name: 'ai-order-merchant', data: { action: 'list' } })
```

### 3.3 认证

- 完全依赖 `cloud.getWXContext().OPENID`，无需自建 token
- 去掉 `utils/login.js` 中的 token 管理和 `requireAuth` 中间件
- `auth` 云函数仅做登录时写入/更新用户信息

## 4. 数据库设计（NoSQL，5 个集合）

### 4.1 users
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 自动，用户标识 |
| nickName | string | 昵称 |
| avatarUrl | string | 云存储 fileID |
| createdAt | Date | 创建时间 |

安全规则：仅创建者可读写。

### 4.2 merchants
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 归属用户 |
| name | string | 商家名称 |
| description | string | 描述 |
| dishCount | number | 菜品数量 |
| createdAt | Date | 创建时间 |

安全规则：仅创建者可读写。

### 4.3 menus
| 字段 | 类型 | 说明 |
|------|------|------|
| merchantId | string | 商家 ID |
| dishes | array | 菜品数组（内嵌） |
| dishes[].name | string | 菜品名 |
| dishes[].price | number | 价格 |
| dishes[].image | string | 云存储 fileID |
| dishes[].description | string | 描述 |
| dishes[].taste | string | 口味 |
| dishes[].spicyLevel | number | 辣度 |
| dishes[].status | string | online/offline |
| dishes[].category | string | 分类 |
| updatedAt | Date | 更新时间 |
| version | number | 版本号（替代 ETag） |

安全规则：仅创建者可读写。

### 4.4 scores
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 归属用户 |
| lessonId | string | 课程 ID |
| score | number | 得分 |
| total | number | 总分 |
| createdAt | Date | 创建时间 |

安全规则：仅创建者可读写。

### 4.5 chats
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 归属用户 |
| type | string | "ai-order" / "general" |
| merchantId | string | AI点菜关联商家（可选） |
| messages | array | 对话历史 |
| createdAt | Date | 创建时间 |

安全规则：仅创建者可读写。

### 4.6 ETag 冲突检测

原 OCI ETag → 改用 menus 文档的 `version` 字段，save 时比对 version，匹配则写入并 +1，不匹配返回冲突要求刷新。

## 5. 云存储

替代 OCI 和本地文件存储，所有文件类型走云存储 CDN：

| 原存储 | 迁移后 |
|--------|--------|
| OCI 菜单 JSON | 云数据库 menus 集合 |
| OCI 菜品图片 | 云存储，fileID 存入 dishes[].image |
| 本地头像文件 | 云存储，fileID 存入 users.avatarUrl |
| 本地 PDF 产物 | 云存储 |
| 本地 TTS 音频 | 微信同声传译插件，不经过存储 |

前端上传直接使用 `wx.cloud.uploadFile`，下载使用 `wx.cloud.downloadFile` 或云存储临时链接。

## 6. 聊天改造

- WebSocket (`wss://.../ws`) → HTTP 请求-响应
- 每轮对话：前端 POST 云函数 → 云函数转发 OpenRouter API → 返回完整回复
- 对话历史存在 `chats` 集合中
- 前端通过轮询方式检测是否有新消息（如需异步）

## 7. 文件处理（PDF / Word）

### 7.1 PDF 转换
1. 前端 `wx.cloud.uploadFile` 上传 → 获取 fileID
2. 前端调云函数 `file` (action: `pdfConvert`)，传入 fileID
3. 云函数从云存储下载 → 调外部 PDF 服务 → 返回 taskId
4. 前端轮询 `file` (action: `pdfStatus`) 查询结果
5. 完成后云函数将结果上传云存储 → 返回结果 fileID

### 7.2 Word 导入
同理，上传 → 云函数转发 → 返回结果。

## 8. TTS 语音合成

- 废弃 Azure TTS 和 `/api/tts` 系列端点
- 前端直接调用微信同声传译插件 `WechatSI`（wx-plugin://WechatSI）
- 无需云函数参与

## 9. 演示数据

- 云数据库预置一条 demo merchant + demo menu 文档
- 云存储预置对应菜品图片
- 小程序首次加载时从云数据库拉取，缓存到本地 `wx.setStorageSync`

## 10. 废弃清单

| 废弃项 | 原因 |
|--------|------|
| Render Express 服务器 | 全部迁到云函数 |
| Aiven MySQL | 改用云数据库 |
| OCI 对象存储 | 改用云存储 |
| `utils/login.js` token 体系 | 改用云开发 OPENID |
| `config.js` 中的 SERVER/database/oci 配置 | 不再需要 |
| WebSocket `/ws` | 改为 HTTP |
| Azure TTS `/api/tts` | 改用 WechatSI 插件 |
| `/api/avatar/:filename` | 改用云存储 CDN |
| `/api/health` | 不再需要 |
| `/api/init` | 不再需要 |
| `/api/config` | 改用云函数环境变量 |
| demo-menus.js 本地 JSON | 改为云数据库预置数据 |

## 11. 风险评估

| 风险 | 影响 | 缓解 |
|------|------|------|
| 云函数 60s 超时 | 大型 PDF 处理可能超时 | 两步异步（提交+轮询），处理在外部服务完成 |
| 云函数冷启动延迟 | 首次调用慢 1-3s | 按功能域合并减少函数数量 |
| 云数据库并发限制 | 大量读写时受限 | 小程序用户量不大，风险低 |
| 云存储外网流量费 | CDN 流量收费 | 文件较小，影响可控 |
| WebSocket → HTTP 体验降级 | 聊天无流式输出 | 用户已接受 |