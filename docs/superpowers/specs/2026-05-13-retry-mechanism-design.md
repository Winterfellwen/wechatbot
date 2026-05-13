# 文件操作重试机制设计

## 问题

PDF/DOCX 互转及其他文件操作在服务器冷启动时经常网络超时，前端直接报错体验差。

## 目标

服务器无反应或返回错误时，前端不立即报错，而是在后台等待重试，只有总等待时间超过 5 分钟才显示错误。

## 范围

- `pdf/pages/index/index.js` — PDF↔DOCX 转换（上传 → 轮询 → 下载）
- `pdf/pages/edit/edit.js` — PDF 编辑（上传 → 立即响应）

Word 编辑器的导入/导出为纯客户端操作，不在范围内。

## 架构

### 新增文件

`utils/retry.js` — 通用重试模块

### 修改文件

- `pdf/pages/index/index.js` — 替换现有重试/轮询逻辑为 Retrier
- `pdf/pages/edit/edit.js` — 加入重试逻辑

### Retrier API

```js
function createRetrier(page, options)

// page: 当前页面实例（用于 setData）
// options:
//   totalTimeout: 总超时，默认 300000 (5min)
//   onProgress(text): 进度回调，默认调用 page.setData

// 返回值：
{
  // 执行一个操作，失败自动重试
  // fn(retry, stop, ctx):
  //   retry(reason) — 触发重试（自动回到 fn 开头）
  //   stop(msg) — 停止，显示错误
  //   ctx.elapsed — 已用秒数
  //   ctx.attempt — 当前重试次数（从 1 开始）
  operate(fn),

  // 轮询转换状态，请求失败时自动重试
  // fn(retry, stop) — 执行一次轮询请求
  // check(data) → { status, result?, error? }
  //   status: 'done' | 'error' | 'pending'
  poll(fn, check),

  // 成功/失败/取消
  complete(result?),
  fail(msg),
  cancel(),

  // 已用秒数
  getElapsed()
}
```

### 重试规则

- 4xx 客户端错误（400 参数错误等）：不重试，直接 `stop(msg)`
- 5xx 服务端错误 + 网络失败：自动重试
- 轮询阶段：`pending` 继续轮询（间隔 3s），请求失败也自动重试（间隔 5s）
- 超过 `totalTimeout`：自动 `fail('操作超时，请稍后重试')`

### 进度文本

每条进度文本末尾追加已用秒数 `(Xs)`：
- `上传中...` → `上传失败，重试中 (10s)...` → `转换中 (15s)...` → `下载中 (30s)...`
- 最终失败：`操作超时，请稍后重试` 或具体错误信息

### 集成方案

#### PDF 转换页

```
doConvert → operate(上传文件)
  ├─ 成功 → poll(轮询状态)
  │           ├─ done → operate(下载结果) → complete(展示结果卡片)
  │           ├─ error → fail(显示转换错误)
  │           └─ pending → 继续轮询
  └─ 失败 → 自动重试
```

#### PDF 编辑页

```
doOperation → operate(上传文件 + 等待响应)
  ├─ 成功 → complete(打开下载)
  └─ 失败 → 自动重试
```
