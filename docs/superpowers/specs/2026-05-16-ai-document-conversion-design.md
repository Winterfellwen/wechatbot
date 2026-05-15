# AI 文档转换服务设计

## 概述

在现有微信小程序中新增 AI 文档转换功能，支持 PDF / DOCX / HTML 三种格式任意互转，并在转换过程中通过 OpenRouter API 进行 AI 优化（润色、格式化、摘要）。

## 架构

### 独立服务

新建 `doc-ai-service`，作为 Render 上的独立 Web Service（Node.js runtime），与现有的 `wechatbot-api`（Node）和 `pdf-service`（Python/Docker）并列。

```
微信小程序 ──POST──→ wechatbot-api (代理转发 /api/doc-ai/*)
                          │
                          ▼
                   doc-ai-service
                          │
                    ┌─────┼─────┐
                    ▼     ▼     ▼
               PDF   DOCX   HTML
               Extractor       → Clean Text → OpenRouter → Clean HTML → Assembler
                                                    ↓
                                              重试 3 次，单次 20s 超时
```

### 入口

小程序主页新增"AI 文档转换"图标按钮，跳转到 `docs/ai-convert/` 页面。

## 数据流

```
1. 用户选择文件 + 目标格式 + AI 模式 (polish/format/summarize)
2. wechatbot-api 接收上传 → POST /api/doc-ai/convert → doc-ai-service
3. doc-ai-service:
   a. 校验格式 (.pdf/.docx/.html) 和大小 (≤20MB)
   b. 文件写入 /tmp/doc-ai-uploads/
   c. 入队 (单线程处理)
   d. 提取文本（PDF→pdf-parse，DOCX→parseZip，HTML→clean body）
   e. 构建 prompt → 调用 OpenRouter（最多重试 3 次）
   f. AI 返回 Clean HTML
   g. 组装为目标格式（HTML 直出 / DOCX 用 html-to-docx / PDF 用 puppeteer）
   h. 写入 /tmp/doc-ai-outputs/
   i. 标记 job 完成
4. 小程序轮询 /api/doc-ai/status/{jobId}
5. 下载结果
```

### 外部 API（wechatbot-api 端点，转发到 doc-ai-service）

| 前端调用端点 | 方法 | 说明 |
|---|---|---|
| `/api/doc-ai/convert` | POST | 上传文件，参数: file + to + mode，返回 job_id |
| `/api/doc-ai/status/{jobId}` | GET | 轮询状态: pending/processing/done/error |
| `/api/doc-ai/download/{filename}` | GET | 下载结果文件 |

### 内部 API（doc-ai-service 内部端点，由 wechatbot-api 转发）

| 端点 | 方法 | 说明 |
|---|---|---|
| `/convert` | POST | 接收文件 + 元数据，返回 job_id |
| `/status/{jobId}` | GET | 返回 job 状态和结果 |
| `/download/{filename}` | GET | 返回文件流 |
| `/health` | GET | 健康检查 |

### 队列持久化

与 pdf-service 相同方案：`/tmp/doc-ai/jobs.json` 文件记录所有 job 状态（job_id、status、原文件名、目标格式、AI 模式、创建时间），服务重启时从磁盘恢复未完成 job。

### AI 指令设计

系统 prompt 固定三段式：
1. "你是一个文档转换专家" — 角色设定
2. 源格式 → 目标格式说明
3. 模式指令（polish/format/summarize）

AI 输出必须被 ` ```html...``` ` 包裹，服务端用正则提取。如果无法提取合法 HTML，标记为 error（不降级为纯文本）。

### 重试策略

OpenRouter 调用：最多重试 3 次，每次超时 20s，总计 ≤ 60s。超过 3 次标记 error。

### 存储结构

```
/tmp/doc-ai-uploads/     ← 上传暂存
/tmp/doc-ai-outputs/     ← 转换结果
/tmp/doc-ai/jobs.json    ← 队列持久化

docs/ai-convert/         ← 前端页面
├── index                ← 上传页
└── status               ← 状态/结果页
```

### 前端

与现有 PDF 转换风格一致：
- **上传页**：文件选择器 + 目标格式选择（PDF/DOCX/HTML）+ AI 模式选择（润色/格式化/摘要）+ 上传按钮
- **状态页**：排队位置显示 + 进度轮询 + 完成后自动下载
- 任务记录存储在 `wx.setStorageSync('ai_convert_records', ...)`
- 复用 `app.js` 的 `checkAutoDownload` 机制

### 约束

- 文件格式：仅 `.pdf` `.docx` `.html`
- 文件大小：≤ 20MB
- 转换方向：任意格式到任意格式（共 6 种方向）
- AI 模型：通过现有 OpenRouter 配置，可配置化
