# UI 动画增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 wechatbot 微信小程序增加 CSS 动画和滚动触发效果，提升视觉体验

**Architecture:** 全局基础动画定义在 `app.wxss`，首页入场动画在 `index.wxss`，IntersectionObserver 触发在 `index.js`，各页面按钮反馈通过 `.card-tap` class 复用

**Tech Stack:** 微信小程序原生 + CSS @keyframes + wx.createIntersectionObserver

---

### Task 1: 全局基础动画 (app.wxss)

**Files:**
- Modify: `app.wxss`

- [ ] **Step: 追加全局动画 keyframes + .card-tap**

在 `app.wxss` 末尾追加：

```css
/* ========== 全局动画 ========== */

/* 淡入上浮 - 卡片入场 */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30rpx); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 从右滑入 */
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(40rpx); }
  to   { opacity: 1; transform: translateX(0); }
}

/* 呼吸脉动 - 装饰元素 */
@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.08); }
}

/* 骨架屏闪光 */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* 按钮/卡片点击缩放反馈 */
.card-tap { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.card-tap:active { transform: scale(0.96); }
```

- [ ] **Step: commit** `git commit -m "feat: 全局基础动画 + .card-tap 点击反馈"`

---

### Task 2: 首页用户区域装饰动画

**Files:**
- Modify: `pages/index/index.wxss`

- [ ] **Step: header 装饰圆添加脉冲动画**

找到 `.header-bg::after`（第 30-39 行），追加 `animation: pulse 3s ease-in-out infinite;`

找到 `.header-bg::before`（第 41-49 行），追加 `animation: pulse 4s ease-in-out infinite 0.5s;`

- [ ] **Step: 用户信息文字渐入**

为 `.user-greeting`、`.user-nickname`、`.user-status` 各加：

```css
.user-greeting { animation: slideInRight 0.6s ease both; }
.user-nickname { animation: slideInRight 0.6s ease 0.15s both; }
.user-status   { animation: slideInRight 0.6s ease 0.3s both; }
```

- [ ] **Step: commit** `git commit -m "feat: 首页头部装饰动画 + 文字渐入"`

---

### Task 3: 首页卡片入场动画

**Files:**
- Modify: `pages/index/index.wxss`

- [ ] **Step: 功能卡片入场上浮**

在现有卡片样式后追加：

```css
/* ========== 卡片入场动画 ========== */
.entry-card {
  animation: fadeInUp 0.5s ease both;
}
.entry-card:nth-child(1) { animation-delay: 0.1s; }
.entry-card:nth-child(2) { animation-delay: 0.2s; }
.entry-card:nth-child(3) { animation-delay: 0.3s; }
.entry-card:nth-child(4) { animation-delay: 0.4s; }

.teacher-card {
  animation: fadeInUp 0.5s ease 0.5s both;
}
```

- [ ] **Step: 功能卡片加 .card-tap**

在 `.entry-card` 已有类上追加 `.card-tap` 到 WXML，或者直接在 WXSS 中为 `.entry-card` 增加 `.card-tap` 的效果。
最简单做法：在 `.entry-card` 现有的 `transition` 规则基础上改为匹配 `.card-tap` 的样式。编辑 `.entry-card` 的 active 规则（第 160-163 行）确保它已经有 `transform: scale(0.96)`，不用动。

实际上 `.entry-card:active` 已有 `transform: scale(0.96)`，所以无需修改。

但需要为 `.teacher-card` 加点击反馈。在其后追加：

```css
.teacher-card:active { transform: scale(0.98); }
```

（已有 `.teacher-card:active` 规则在第 317-320 行，已含 `transform: scale(0.98)`，无需修改）

- [ ] **Step: commit** `git commit -m "feat: 首页卡片入场 fadeInUp 动画"`

---

### Task 4: IntersectionObserver 滚动触发

**Files:**
- Modify: `pages/index/index.js`

- [ ] **Step: 添加 onReady 中的 Observer**

在 `onAvatarError` 之后、`onShareAppMessage` 之前追加：

```js
  onReady: function () {
    var that = this;
    this._observer = wx.createIntersectionObserver(this);
    this._observer.relativeToViewport({ bottom: 100 }).observe('.teacher-card', function (res) {
      if (res.intersectionRatio > 0) {
        that.setData({ teacherVisible: true });
        that._observer.disconnect();
      }
    });
  },

  onUnload: function () {
    if (this._observer) { this._observer.disconnect(); }
  },
```

- [ ] **Step: 在 WXML 中修改 teacher-card**

在 `pages/index/index.wxml` 中，为 `.teacher-card` 添加条件类：

```xml
    <view class="teacher-card {{teacherVisible ? 'visible' : ''}}" bindtap="handleEntryTap" data-type="teacher">
```

- [ ] **Step: 添加 visible 状态样式**

在 `pages/index/index.wxss` 追加：

```css
.teacher-card:not(.visible) {
  opacity: 0;
  transform: translateY(30rpx);
}
.teacher-card.visible {
  animation: fadeInUp 0.5s ease both;
}
```

- [ ] **Step: data 中初始化 teacherVisible**

在 `pages/index/index.js` 的 `data` 中加 `teacherVisible: false,`

- [ ] **Step: commit** `git commit -m "feat: IntersectionObserver 滚动触发智能老师动画"`

---

### Task 5: 用户页按钮反馈

**Files:**
- Modify: `pages/user/user.wxss`

- [ ] **Step: 为 action-item 加点击反馈**

在 `pages/user/user.wxss` 追加：

```css
/* ========== 按钮交互反馈 ========== */
.action-item:active { transform: scale(0.97); opacity: 0.85; }
.action-item-danger:active { transform: scale(0.97); opacity: 0.85; }
button:active { transform: scale(0.96); }
```

- [ ] **Step: edit-badge 加脉冲提示**

```css
.edit-badge { animation: pulse 2s ease-in-out 3; }
```

- [ ] **Step: commit** `git commit -m "feat: 用户页按钮交互反馈"`

---

### Task 6: section-title 装饰线动画

**Files:**
- Modify: `pages/index/index.wxss`

- [ ] **Step: 标题左侧装饰线宽度渐入**

修改 `.section-title::before`：

```css
.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4rpx;
  bottom: 4rpx;
  width: 6rpx;
  border-radius: 3rpx;
  background: linear-gradient(180deg, #2563EB 0%, #3B82F6 100%);
  animation: slideInRight 0.4s ease both;
}
```

- [ ] **Step: commit** `git commit -m "feat: section-title 装饰线动画"`

---

### Task 7: 智能老师卡片 hover 增强

**Files:**
- Modify: `pages/index/index.wxss`

- [ ] **Step: 智能老师卡片光效增强**

在 `.teacher-card` 现有样式基础上，增加微光效。在 `.teacher-card` 的伪元素（第 322-341 行）后追加一个渐变光晕：

```css
.teacher-card .teacher-left { position: relative; z-index: 1; }
.teacher-card .teacher-info { position: relative; z-index: 1; }
.teacher-card .teacher-arrow { position: relative; z-index: 1; }
```

确保文本层在装饰圆之上（z-index 管理），通常已有 `z-index: 1` 设置，检查即可。

- [ ] **Step: commit** `git commit -m "feat: 智能老师卡片 z-index 层级整理"`
