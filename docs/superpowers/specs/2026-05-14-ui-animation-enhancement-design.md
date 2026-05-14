# UI 动画增强设计 — wechatbot 小程序

## 范围
为 wechatbot 微信小程序（26 页面，含 tabBar）增加互动动画与视觉优化，风格为现代简洁。

## 动画分类

### 1. 全局基础动画 (app.wxss)
- `@keyframes fadeInUp` — 卡片淡入上浮，用于入场
- `@keyframes pulse` — 呼吸脉动，用于装饰元素
- `@keyframes shimmer` — 骨架屏闪光效果
- `.card-tap` class — 按钮/卡片点击缩放反馈 (`transition: transform 0.2s ease; :active { scale: 0.96 }`)

### 2. 首页卡片入场动画 (pages/index/index.wxss)
- 四张功能卡 `.entry-card` 加载时 `fadeInUp`，通过 `:nth-child` 逐张延迟 0.1-0.4s
- 智能老师卡 `.teacher-card` 延迟 0.5s
- 顶部用户区域标题文字渐入

### 3. 滚动触发动画 (IntersectionObserver)
- 首页智能老师卡片在滚动到视口时触发 `fadeInUp`（非首次加载时）
- 使用 `wx.createIntersectionObserver()` 监听 `.teacher-card`，进入时添加 `.visible` 类

### 4. 按钮交互反馈
- 所有可点击元素（entry-card, teacher-card, button 等）统一加 `.card-tap`
- 格式工具栏按钮加悬停缩放
- 上传/转换按钮加微渐变

### 5. 加载状态骨架屏
- 首页用户信息加载前显示灰色脉冲块
- 各列表页加载时显示 shimmer 占位

### 6. 页面切换过渡
- 使用 WeChat `page-container` 或 `animation` API 实现页面滑入效果

## 实施文件清单
- `app.wxss` — 全局基础动画
- `pages/index/index.wxss` — 首页入场 + 装饰动画
- `pages/index/index.js` — IntersectionObserver 滚动触发
- `pages/user/user.wxss` — 用户页按钮反馈
- 其他页面按需增加 `.card-tap` 和动画类

## 性能原则
- 优先 CSS 动画，避免 JS 频繁 setData
- 动画使用 `transform` + `opacity`（GPU 加速属性）
- 避免同时触发大量动画
