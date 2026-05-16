# PDF 异步转换与任务记录系统设计

## 概述
将 PDF 转换/编辑功能从同步阻塞改为异步后台处理，新增"转换记录"页面，支持订阅消息通知与自动下载。

## 架构

### 数据流
```
用户上传 → Node.js 接收 → Python 队列 → 返回 job_id
  ↓
前端显示"已加入队列" → 用户可离开页面
  ↓
Python 处理完成 → 更新状态 → 触发通知
  ↓
小程序自动下载 → 存入本地 → 用户打开
```

### 任务状态机
`queued` → `processing` → `done` / `error`

### 通知机制
1. **订阅消息**：首次使用时授权 → 完成后微信服务通知推送
2. **轮询兜底**：小程序切回前台时轮询 `processing` 任务 → 完成时 toast 提醒

## 数据模型

### 本地存储 (pdf_task_records)
```javascript
{
  jobId: "abc123",
  type: "convert" | "edit",
  fileName: "resume.pdf",
  from: "pdf", to: "docx",
  status: "queued" | "processing" | "done" | "error",
  createdAt: 1715760000000,
  completedAt: 1715760120000,
  duration: 120,
  resultUrl: "/api/pdf/download/xxx.docx",
  errorMsg: "",
  downloaded: false,
  localPath: "",
  serverExpiresAt: 1715846400000,
  retryCount: 0
}
```

### 保留策略
- 本地最多 50 条记录，超量删除最旧
- 服务器文件保留 24 小时，空间不足时 LRU 清理

## 页面结构

### 新增页面：`pdf/pages/records/records`
- 顶部筛选 tabs：全部 | 转换 | 编辑
- 时间线列表：文件名、类型、状态、耗时
- 点击卡片：打开文件 / 查看详情 / 重试

### 修改页面：`pdf/pages/index/index`
- 上传后改为异步提交
- 新增"转换记录"入口

### 修改页面：`pdf/pages/edit/edit`
- 编辑操作改为异步提交

## 文件生命周期

### 服务器端
- 转换完成后文件存入临时目录
- 定时任务每小时清理：
  - 超过 24 小时未下载 → 删除
  - 磁盘使用率 > 85% → LRU 删除最旧文件

### 小程序端
- `app.onShow()` 检查 `status="done"` 但未下载的任务
- 自动后台下载 → 保存至 `wx.env.USER_DATA_PATH`
- 更新记录：`downloaded: true, localPath: "..."`
- 不限制网络环境，失败重试 3 次

## 上传逻辑优化

### 重试策略
- **总超时**：1 分钟 (60 秒)
- **最大重试次数**：3 次
- **重试间隔**：2 秒
- **失败通知**：显示 toast "上传失败，请重试"

### 页面锁定
- 点击上传后，按钮 `disabled: true`，防止重复提交
- 上传期间禁止退出页面（`onUnload` 拦截）
- 强制退出时提示："上传已被取消，任务已保存至记录页"
- 上传成功后解除锁定，允许正常导航

### 关键决策
- 上传失败不创建任务记录（未成功提交到服务器）
- 上传成功但转换失败才创建失败记录
- 按钮锁定状态与 `converting` 绑定
