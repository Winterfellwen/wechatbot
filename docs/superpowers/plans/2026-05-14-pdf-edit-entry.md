# PDF 编辑入口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "编辑" entry in the PDF toolbox page after file upload, navigating to the existing edit page.

**Architecture:** Upload file on main page → "转换"/"编辑" tab switch → "编辑" tab shows operation cards → tap navigates to `pdf/pages/edit/edit?file=&path=`

**Tech Stack:** 微信小程序原生 (WXML/WXSS/JS)

---

### Task 1: `index.js` — add tab switching + edit navigation

**Files:**
- Modify: `pdf/pages/index/index.js:6` (data), before `uploadFile` (new methods)

- [ ] **Step 1: Add `activeTab` to data**

```js
// after fileName: '', add:
activeTab: 'convert'
```

- [ ] **Step 2: Add `switchTab` and `goEdit` methods**

```js
// after clearFile function, before closing brace of Page({}):
switchTab: function(e) {
  this.setData({ activeTab: e.currentTarget.dataset.tab });
},
goEdit: function() {
  wx.navigateTo({
    url: '../edit/edit?file=' + encodeURIComponent(this.data.fileName) + '&path=' + encodeURIComponent(this.data.filePath)
  });
}
```

- [ ] **Step 3: Verify edit.js receives params correctly**

`edit.js` already has `onLoad(options)` handling `options.file` and `options.path` — no change needed.

---

### Task 2: `index.wxml` — add tab bar + edit section

**Files:**
- Modify: `pdf/pages/index/index.wxml:18` (after convert-section opening)

- [ ] **Step 1: Add tab bar after file card**

Insert after `</view>` closing `.file-card` (line ~25):

```xml
<!-- Tab: 转换 / 编辑 -->
<view wx:if="{{fileName}}" class="tab-bar">
  <view class="tab-item {{activeTab === 'convert' ? 'active' : ''}}" bindtap="switchTab" data-tab="convert">转换</view>
  <view class="tab-item {{activeTab === 'edit' ? 'active' : ''}}" bindtap="switchTab" data-tab="edit">编辑</view>
</view>
```

- [ ] **Step 2: Wrap convert content with conditional**

Change the convert-section from `wx:if="{{fileName}}"` to `wx:if="{{fileName && activeTab === 'convert'}}"`:

```xml
<view wx:if="{{fileName && activeTab === 'convert'}}" class="convert-section">
```

- [ ] **Step 3: Add edit section**

Add after `</view>` closing convert-section:

```xml
<view wx:if="{{fileName && activeTab === 'edit'}}" class="edit-section">
  <view class="edit-card" bindtap="goEdit">
    <text class="edit-card-icon">T</text>
    <view class="edit-card-info">
      <text class="edit-card-title">添加水印</text>
      <text class="edit-card-desc">在PDF页面上添加自定义文字水印</text>
    </view>
    <text class="edit-card-arrow">›</text>
  </view>
  <view class="edit-card" bindtap="goEdit">
    <text class="edit-card-icon">↻</text>
    <view class="edit-card-info">
      <text class="edit-card-title">旋转页面</text>
      <text class="edit-card-desc">旋转PDF页面的方向</text>
    </view>
    <text class="edit-card-arrow">›</text>
  </view>
  <view class="edit-card" bindtap="goEdit">
    <text class="edit-card-icon">⊞</text>
    <view class="edit-card-info">
      <text class="edit-card-title">合并PDF</text>
      <text class="edit-card-desc">上传两个文件进行合并</text>
    </view>
    <text class="edit-card-arrow">›</text>
  </view>
  <view class="edit-tip">编辑功能将打开新页面进行处理</view>
</view>
```

---

### Task 3: `index.wxss` — add tab bar + edit section styles

**Files:**
- Modify: `pdf/pages/index/index.wxss:210-260` (between section-label and convert-btn-wrap)

- [ ] **Step 1: Add tab bar styles before `.section-label`**

```css
/* ========== Tab 切换 ========== */
.tab-bar {
  display: flex;
  margin: 0 32rpx 24rpx;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  padding: 6rpx;
  box-shadow: var(--shadow);
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: 10rpx;
  transition: all 0.2s;
}
.tab-item.active {
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4rpx 16rpx rgba(99, 102, 241, 0.3);
}
```

- [ ] **Step 2: Add edit section styles after `.convert-btn.loading`**

```css
/* ========== 编辑区域 ========== */
.edit-section { padding: 0 32rpx 24rpx; }
.edit-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: var(--bg-card);
  border: 2rpx solid var(--border);
  border-radius: var(--radius-sm);
  padding: 24rpx;
  margin-bottom: 16rpx;
  transition: all 0.2s;
}
.edit-card:active {
  transform: scale(0.98);
  border-color: var(--primary);
  background: #fafbff;
}
.edit-card-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 14rpx;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: var(--primary);
  flex-shrink: 0;
}
.edit-card-info { flex: 1; min-width: 0; }
.edit-card-title { font-size: 28rpx; font-weight: 600; color: var(--text-primary); display: block; }
.edit-card-desc { font-size: 24rpx; color: var(--text-muted); display: block; margin-top: 4rpx; }
.edit-card-arrow { font-size: 36rpx; color: var(--text-muted); flex-shrink: 0; }
.edit-tip { font-size: 22rpx; color: var(--text-muted); text-align: center; margin-top: 8rpx; }
```

---

### Task 4: Verify

- [ ] **Step 1: Manual check**

Run DevTools, navigate to PDF toolbox, upload a file, confirm "转换" and "编辑" tabs appear. Tap "编辑" → confirm navigates to edit page with file info.
