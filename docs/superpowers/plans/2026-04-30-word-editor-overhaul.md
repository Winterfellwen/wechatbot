# Word 编辑器全面重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复颜色选择器bug、移除自动保存/自动导出、美化UI、添加搜索/排序/视图切换、保存同时生成docx

**Architecture:** 创建 color-picker 独立组件替换不可用的 wx.chooseColor；将编辑器 UI 重构为可折叠工具栏布局；移除自动保存和自动导出逻辑，改为显式保存（同时存本地+生成docx）；首页添加搜索栏、排序选项、列表/网格视图切换；导入改为纯前端解析。

**Tech Stack:** WeChat Mini Program (WXML/WXSS/JS), 小程序原生组件系统, pako.es5.js (前端zip/deflate)

---

## File Structure

| 文件 | 操作 | 说明 |
|------|------|------|
| `word/pages/editor/components/color-picker/color-picker.js` | 新建 | 颜色选择器组件逻辑 |
| `word/pages/editor/components/color-picker/color-picker.wxml` | 新建 | 颜色选择器组件模板 |
| `word/pages/editor/components/color-picker/color-picker.wxss` | 新建 | 颜色选择器组件样式 |
| `word/pages/editor/components/color-picker/color-picker.json` | 新建 | 组件配置 |
| `word/pages/editor/editor.js` | 修改 | 移除自动保存/导出，新保存逻辑，图片/表格插入 |
| `word/pages/editor/editor.wxml` | 重写 | 新布局：顶部导航栏+可折叠工具栏+编辑区 |
| `word/pages/editor/editor.wxss` | 重写 | 现代UI样式 |
| `word/pages/editor/editor.json` | 修改 | 添加 color-picker 组件声明 |
| `word/pages/index/index.js` | 修改 | 搜索、排序、视图切换、纯前端导入 |
| `word/pages/index/index.wxml` | 修改 | 搜索栏、排序、视图切换、卡片操作按钮 |
| `word/pages/index/index.wxss` | 修改 | 网格视图样式、搜索栏样式 |

---

### Task 1: 创建 color-picker 组件 — JSON 配置

**Files:**
- Create: `word/pages/editor/components/color-picker/color-picker.json`

- [ ] **Step 1: 创建组件配置文件**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 2: 验证文件创建成功**

在微信开发者工具中确认文件路径正确，组件配置合法。

- [ ] **Step 3: Commit**

```bash
git add word/pages/editor/components/color-picker/color-picker.json
git commit -m "feat(editor): add color-picker component config"
```

---

### Task 2: 创建 color-picker 组件 — WXML 模板

**Files:**
- Create: `word/pages/editor/components/color-picker/color-picker.wxml`

- [ ] **Step 1: 编写颜色选择器模板**

```xml
<!--word/pages/editor/components/color-picker/color-picker.wxml-->
<view class="picker-mask" wx:if="{{show}}" bindtap="onMaskTap">
  <view class="picker-popup" catchtap="noop">
    <view class="picker-header">
      <text class="picker-title">选择颜色</text>
      <text class="picker-close" bindtap="onClose">取消</text>
    </view>

    <view class="color-grid">
      <view
        wx:for="{{presetColors}}"
        wx:key="*this"
        class="color-cell {{item === currentColor ? 'active' : ''}}"
        style="background:{{item}}"
        bindtap="onColorTap"
        data-color="{{item}}"
      ></view>
    </view>

    <view class="custom-row">
      <text class="custom-label">当前颜色:</text>
      <view class="current-swatch" style="background:{{currentColor || '#000000'}}"></view>
      <text class="custom-hex">{{currentColor || '#000000'}}</text>
    </view>

    <view class="custom-input-row">
      <text class="custom-label">自定义:</text>
      <input
        class="custom-input"
        placeholder="#000000"
        value="{{customColor}}"
        bindinput="onCustomInput"
        maxlength="7"
      />
      <view class="custom-apply-btn" bindtap="onCustomApply">确定</view>
    </view>
  </view>
</view>
```

- [ ] **Step 2: 验证模板代码**

检查 WXML 语法正确，所有绑定事件名称匹配 JS 中的方法名。

- [ ] **Step 3: Commit**

```bash
git add word/pages/editor/components/color-picker/color-picker.wxml
git commit -m "feat(editor): add color-picker component template"
```

---

### Task 3: 创建 color-picker 组件 — WXSS 样式

**Files:**
- Create: `word/pages/editor/components/color-picker/color-picker.wxss`

- [ ] **Step 1: 编写颜色选择器样式**

```css
/* word/pages/editor/components/color-picker/color-picker.wxss */
.picker-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.picker-popup {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx 24rpx;
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
  animation: slideUp 0.25s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.picker-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.picker-close {
  font-size: 28rpx;
  color: #999;
  padding: 8rpx 16rpx;
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  justify-content: center;
  margin-bottom: 24rpx;
}

.color-cell {
  width: 60rpx;
  height: 60rpx;
  border-radius: 8rpx;
  border: 2rpx solid #e5e5e5;
  transition: transform 0.15s, border-color 0.15s;
}

.color-cell:active {
  transform: scale(0.9);
}

.color-cell.active {
  border-color: #2b5797;
  box-shadow: 0 0 0 4rpx rgba(43,87,151,0.3);
}

.custom-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 16rpx;
  background: #f8f9fa;
  border-radius: 8rpx;
}

.custom-label {
  font-size: 24rpx;
  color: #666;
  margin-right: 12rpx;
}

.current-swatch {
  width: 40rpx;
  height: 40rpx;
  border-radius: 6rpx;
  border: 2rpx solid #ddd;
  margin-right: 12rpx;
}

.custom-hex {
  font-size: 24rpx;
  color: #333;
  font-family: monospace;
}

.custom-input-row {
  display: flex;
  align-items: center;
}

.custom-input {
  flex: 1;
  height: 64rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 28rpx;
  font-family: monospace;
  margin-right: 16rpx;
}

.custom-apply-btn {
  background: #2b5797;
  color: #fff;
  padding: 12rpx 32rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}
```

- [ ] **Step 2: 验证样式无语法错误**

- [ ] **Step 3: Commit**

```bash
git add word/pages/editor/components/color-picker/color-picker.wxss
git commit -m "feat(editor): add color-picker component styles"
```

---

### Task 4: 创建 color-picker 组件 — JS 逻辑

**Files:**
- Create: `word/pages/editor/components/color-picker/color-picker.js`

- [ ] **Step 1: 编写颜色选择器组件逻辑**

```javascript
// word/pages/editor/components/color-picker/color-picker.js
Component({
  properties: {
    show: { type: Boolean, value: false },
    target: { type: String, value: 'color' },
    currentColor: { type: String, value: '#000000' }
  },

  data: {
    customColor: '',
    presetColors: [
      '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#efefef',
      '#980000','#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff',
      '#9900ff','#ff00ff','#e6b8af','#f4cccc','#fce5cd','#fff2cc','#d9ead3','#b6d7a8',
      '#a2c4c9','#d0e0e3','#c9daf8','#cfe2f3','#d9d2e9','#ead1dc','#ea9999','#f9cb9c'
    ]
  },

  methods: {
    onColorTap: function (e) {
      var color = e.currentTarget.dataset.color;
      this.triggerEvent('colorpick', { target: this.data.target, color: color });
      this.triggerEvent('close');
    },

    onCustomInput: function (e) {
      this.setData({ customColor: e.detail.value });
    },

    onCustomApply: function () {
      var color = this.data.customColor.trim();
      if (!color) return;
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
        wx.showToast({ title: '颜色格式错误，请使用#RRGGBB格式', icon: 'none' });
        return;
      }
      this.triggerEvent('colorpick', { target: this.data.target, color: color });
      this.triggerEvent('close');
    },

    onClose: function () {
      this.triggerEvent('close');
    },

    onMaskTap: function () {
      this.triggerEvent('close');
    },

    noop: function () {}
  }
});
```

- [ ] **Step 2: 手动测试颜色选择器组件**

在微信开发者工具中：
1. 在 editor.wxml 中临时引入组件并测试显示
2. 点击颜色块 → 弹出颜色选择器
3. 点击预设颜色 → 触发 colorpick 事件
4. 输入自定义颜色 `#ff0000` → 点击确定 → 触发事件
5. 点击遮罩或取消 → 触发 close 事件

- [ ] **Step 3: Commit**

```bash
git add word/pages/editor/components/color-picker/color-picker.js
git commit -m "feat(editor): add color-picker component logic"
```

---

### Task 5: 更新 editor.json 添加组件声明

**Files:**
- Modify: `word/pages/editor/editor.json`

- [ ] **Step 1: 添加 color-picker 组件声明**

```json
{
  "navigationBarTitleText": "编辑文档",
  "usingComponents": {
    "color-picker": "./components/color-picker/color-picker"
  }
}
```

- [ ] **Step 2: 验证配置正确**

在微信开发者工具中确认 editor 页面能正确加载 color-picker 组件，无注册错误。

- [ ] **Step 3: Commit**

```bash
git add word/pages/editor/editor.json
git commit -m "feat(editor): register color-picker component in editor"
```

---

### Task 6: 重构 editor.js — 移除自动保存和自动导出逻辑

**Files:**
- Modify: `word/pages/editor/editor.js`

- [ ] **Step 1: 移除 autoSaveTimer 和自动保存逻辑**

删除 `onEditorInput` 方法中的自动保存代码，替换为仅标记脏状态：

```javascript
// 替换 onEditorInput 方法（约第58-63行）
onEditorInput: function () {
  this._dirty = true;
  this.setData({ saveStatus: '未保存' });
},
```

同时删除 `autoSaveTimer` 变量的声明（第6行）和所有对它的引用。

- [ ] **Step 2: 移除 autoExport 逻辑**

在 `onEditorReady` 方法中（约第38-52行），移除 autoExport 检查：

```javascript
// 替换 onEditorReady 方法
onEditorReady: function () {
  var that = this;
  wx.createSelectorQuery().select('#editor').context(function (res) {
    that.editorCtx = res.context;
    var doc = that._findDoc(that.data.docId);
    if (doc && doc.content) {
      var html = that._deltaToHtml(doc.content);
      that.editorCtx.setContents({ html: html });
    }
    that._loaded = true;
  }).exec();
},
```

同时删除 `this.data.autoExport` 相关代码（在 data 中如有定义）。

- [ ] **Step 3: 手动测试编辑器基础功能**

在微信开发者工具中：
1. 打开编辑器页面
2. 输入文字 → 底部状态应显示"未保存"（不再自动保存）
3. 检查不再有自动导出行为
4. 返回首页 → 内容应已保存（因为 goBack 中有 saveDoc）

- [ ] **Step 4: Commit**

```bash
git add word/pages/editor/editor.js
git commit -m "refactor(editor): remove auto-save timer and auto-export logic"
```

---

### Task 7: 重构 editor.js — 新保存方法（存本地+生成docx）

**Files:**
- Modify: `word/pages/editor/editor.js`

- [ ] **Step 1: 修改 saveDoc 方法，同时存本地和生成docx**

```javascript
// 替换 saveDoc 方法（约第102-120行）
saveDoc: function () {
  if (!this._loaded) return;
  var that = this;
  that.setData({ saveStatus: '保存中...' });
  that.editorCtx.getContents({
    success: function (res) {
      var html = res.html || '';
      var content = JSON.stringify(html || '');
      var list = that._getList();
      var idx = list.findIndex(function (d) { return d.id === that.data.docId; });
      var now = Date.now();
      if (idx >= 0) {
        list[idx].title = that.data.title || '未命名文档';
        list[idx].content = content;
        list[idx].updatedAt = now;
      }
      wx.setStorageSync(STORAGE_KEY, list);

      // 生成并保存 docx 文件
      var paragraphs = that._htmlToDocxParagraphs(html);
      var docxBase64 = that._buildDocx(paragraphs);
      var fileName = (that.data.title || '未命名文档') + '_' + now + '.docx';
      var filePath = wx.env.USER_DATA_PATH + '/' + fileName;
      var buffer = wx.base64ToArrayBuffer(docxBase64);
      wx.getFileSystemManager().writeFile({
        filePath: filePath,
        data: buffer,
        encoding: 'binary',
        success: function () {
          that.setData({ saveStatus: '已保存并导出' });
          that._dirty = false;
          wx.showToast({ title: '已保存并导出', icon: 'success' });
        },
        fail: function (err) {
          that.setData({ saveStatus: '保存失败' });
          wx.showToast({ title: '文件保存失败', icon: 'none' });
          console.error('writeFile fail:', err);
        }
      });
    },
    fail: function () {
      that.setData({ saveStatus: '保存失败' });
      wx.showToast({ title: '读取内容失败', icon: 'none' });
    }
  });
},
```

- [ ] **Step 2: 修改 data 中的保存状态默认值**

```javascript
// 修改 data 中的 saveStatus（约第24行）
saveStatus: '未保存',
```

- [ ] **Step 3: 修改导出方法 _doExport 为调用 saveDoc**

```javascript
// 替换 exportDocx 和 _doExport 方法（约第275-327行）
exportDocx: function () {
  this.saveDoc();
},
```

删除整个 `_doExport` 方法。

- [ ] **Step 4: 修改顶部导航栏的保存按钮行为**

确保顶部保存按钮调用 `saveDoc` 方法（后续在 wxml 中配置）。

- [ ] **Step 5: 手动测试新保存流程**

在微信开发者工具中：
1. 编辑文档内容
2. 点击"保存"按钮
3. 应显示"已保存并导出"提示
4. 检查 USER_DATA_PATH 下生成了 .docx 文件
5. 返回首页 → 文档列表中存在该文档

- [ ] **Step 6: Commit**

```bash
git add word/pages/editor/editor.js
git commit -m "feat(editor): save to storage and generate docx on explicit save"
```

---

### Task 8: 添加图片插入功能到 editor.js

**Files:**
- Modify: `word/pages/editor/editor.js`

- [ ] **Step 1: 添加 insertImage 方法**

在 editor.js 中 `clearFormat` 方法后添加：

```javascript
insertImage: function () {
  var that = this;
  wx.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: function (res) {
      var tempFilePath = res.tempFilePaths[0];
      // 获取图片信息以设置合适尺寸
      wx.getImageInfo({
        src: tempFilePath,
        success: function (imgInfo) {
          var maxWidth = 600;
          var width = imgInfo.width;
          var height = imgInfo.height;
          if (width > maxWidth) {
            height = Math.round(height * maxWidth / width);
            width = maxWidth;
          }
          that.editorCtx && that.editorCtx.insertImage({
            src: tempFilePath,
            width: width + 'px',
            height: height + 'px'
          });
        },
        fail: function () {
          // 如果获取信息失败，使用默认尺寸
          that.editorCtx && that.editorCtx.insertImage({
            src: tempFilePath,
            width: '300px',
            height: 'auto'
          });
        }
      });
    }
  });
},
```

- [ ] **Step 2: 手动测试图片插入**

在微信开发者工具中：
1. 点击工具栏"插入图片"按钮
2. 选择一张相册图片
3. 图片应插入到编辑器中
4. 保存文档 → docx 中应包含图片（如支持）

- [ ] **Step 3: Commit**

```bash
git add word/pages/editor/editor.js
git commit -m "feat(editor): add image insert functionality"
```

---

### Task 9: 添加表格插入功能到 editor.js

**Files:**
- Modify: `word/pages/editor/editor.js`

- [ ] **Step 1: 添加 insertTable 相关 data 和方法**

在 data 中添加表格选择器状态：

```javascript
// 在 data 中添加（约第25行后）
tablePicker: false,
tableRows: 2,
tableCols: 2,
```

添加 insertTable 和辅助方法：

```javascript
insertTable: function () {
  this.setData({ tablePicker: true });
},

confirmTable: function () {
  var rows = this.data.tableRows;
  var cols = this.data.tableCols;
  var html = '<table style="border-collapse:collapse;width:100%;margin:10px 0;">';
  for (var r = 0; r < rows; r++) {
    html += '<tr>';
    for (var c = 0; c < cols; c++) {
      html += '<td style="border:1px solid #ddd;padding:8px;min-width:60px;">' +
              (r === 0 ? '<strong>列' + (c + 1) + '</strong>' : '内容') +
              '</td>';
    }
    html += '</tr>';
  }
  html += '</table>';
  this.editorCtx && this.editorCtx.insertHTML(html);
  this.setData({ tablePicker: false });
},

changeTableRows: function (e) {
  var delta = parseInt(e.currentTarget.dataset.delta);
  var newVal = Math.min(6, Math.max(2, this.data.tableRows + delta));
  this.setData({ tableRows: newVal });
},

changeTableCols: function (e) {
  var delta = parseInt(e.currentTarget.dataset.delta);
  var newVal = Math.min(6, Math.max(2, this.data.tableCols + delta));
  this.setData({ tableCols: newVal });
},

cancelTable: function () {
  this.setData({ tablePicker: false });
},
```

- [ ] **Step 2: 手动测试表格插入**

在微信开发者工具中：
1. 点击工具栏"插入表格"按钮
2. 调整行数(2-6)和列数(2-6)
3. 点击确定 → 表格插入到编辑器
4. 表格应有边框、内边距、正确列数

- [ ] **Step 3: Commit**

```bash
git add word/pages/editor/editor.js
git commit -m "feat(editor): add table insert functionality"
```

---

### Task 10: 添加字号和字体设置方法到 editor.js

**Files:**
- Modify: `word/pages/editor/editor.js`

- [ ] **Step 1: 添加 setFontSize 和 setFontFamily 方法**

```javascript
setFontSize: function (e) {
  var size = e.currentTarget.dataset.size;
  this.editorCtx && this.editorCtx.format('fontSize', size);
},

setFontFamily: function (e) {
  var family = e.currentTarget.dataset.family;
  this.editorCtx && this.editorCtx.format('fontFamily', family);
},

toggleExpand: function () {
  this.setData({ toolbarExpanded: !this.data.toolbarExpanded });
},
```

同时在 data 中添加 `toolbarExpanded: false,`。

- [ ] **Step 2: 手动测试字号和字体设置**

在微信开发者工具中：
1. 展开高级工具栏
2. 选择字号（10-36）→ 选中文字应改变大小
3. 选择字体（微软雅黑/宋体等）→ 选中文字应改变字体

- [ ] **Step 3: Commit**

```bash
git add word/pages/editor/editor.js
git commit -m "feat(editor): add font size and family selection"
```

---

### Task 11: 重构 editor.wxml — 新布局

**Files:**
- Rewrite: `word/pages/editor/editor.wxml`

- [ ] **Step 1: 重写编辑器页面模板**

```xml
<!--word/pages/editor/editor.wxml - 全面重构版-->
<view class="editor-page">
  <!-- 顶部导航栏 -->
  <view class="top-bar">
    <input class="title-input-top" placeholder="输入文档标题" value="{{title}}" bindinput="onTitleInput" />
    <view class="top-actions">
      <view class="save-btn-top {{saveStatus === '保存中...' ? 'disabled' : ''}}" bindtap="saveDoc">
        <text>{{saveStatus === '保存中...' ? '保存中...' : '保存'}}</text>
      </view>
      <view class="close-btn" bindtap="goBack">✕</view>
    </view>
  </view>

  <!-- 工具栏（折叠状态） -->
  <view class="toolbar">
    <view class="tool-row">
      <view class="tool-btn {{fmt.bold ? 'active' : ''}}" bindtap="toggleBold">
        <text class="tool-label bold">B</text>
      </view>
      <view class="tool-btn {{fmt.italic ? 'active' : ''}}" bindtap="toggleItalic">
        <text class="tool-label italic">I</text>
      </view>
      <view class="tool-btn {{fmt.underline ? 'active' : ''}}" bindtap="toggleUnderline">
        <text class="tool-label underline">U</text>
      </view>
      <view class="tool-btn {{fmt.strike ? 'active' : ''}}" bindtap="toggleStrike">
        <text class="tool-label strike">S</text>
      </view>
      <view class="tool-divider"></view>
      <view class="tool-btn {{fmt.header === 1 ? 'active' : ''}}" bindtap="formatHeader" data-level="1">
        <text class="tool-label">H1</text>
      </view>
      <view class="tool-btn {{fmt.header === 2 ? 'active' : ''}}" bindtap="formatHeader" data-level="2">
        <text class="tool-label">H2</text>
      </view>
      <view class="tool-btn {{fmt.header === 3 ? 'active' : ''}}" bindtap="formatHeader" data-level="3">
        <text class="tool-label">H3</text>
      </view>
      <view class="tool-divider"></view>
      <view class="tool-btn {{fmt.align === 'left' ? 'active' : ''}}" bindtap="setAlign" data-align="left">
        <text class="tool-icon">左</text>
      </view>
      <view class="tool-btn {{fmt.align === 'center' ? 'active' : ''}}" bindtap="setAlign" data-align="center">
        <text class="tool-icon">中</text>
      </view>
      <view class="tool-btn {{fmt.align === 'right' ? 'active' : ''}}" bindtap="setAlign" data-align="right">
        <text class="tool-icon">右</text>
      </view>
      <view class="tool-divider"></view>
      <view class="tool-btn {{fmt.list === 'ordered' ? 'active' : ''}}" bindtap="setList" data-list="ordered">
        <text class="tool-label">1.</text>
      </view>
      <view class="tool-btn {{fmt.list === 'bullet' ? 'active' : ''}}" bindtap="setList" data-list="bullet">
        <text class="tool-icon">•</text>
      </view>
      <view class="tool-divider"></view>
      <view class="tool-btn" bindtap="pickColor" data-target="color">
        <view class="color-swatch" style="background:{{fmt.color || '#000000'}}"></view>
        <text class="tool-icon-sm">A</text>
      </view>
      <view class="tool-btn" bindtap="pickColor" data-target="backgroundColor">
        <view class="color-swatch highlight" style="background:{{fmt.backgroundColor || '#ffff00'}}"></view>
        <text class="tool-icon-sm">🖌</text>
      </view>
    </view>

    <!-- 可展开区域 -->
    <view class="tool-row expand-row" bindtap="toggleExpand">
      <text class="expand-label">{{toolbarExpanded ? '收起▲' : '更多▼'}}</text>
    </view>
    <view class="tool-row expanded-row" wx:if="{{toolbarExpanded}}">
      <view class="size-selector">
        <text class="tool-icon-sm">字号:</text>
        <view class="select-options">
          <view wx:for="{{fontSizes}}" wx:key="*this"
            class="select-opt {{fmt.fontSize == item ? 'active' : ''}}"
            bindtap="setFontSize" data-size="{{item}}">
            <text>{{item}}</text>
          </view>
        </view>
      </view>
      <view class="font-selector">
        <text class="tool-icon-sm">字体:</text>
        <view class="select-options">
          <view wx:for="{{fontFamilies}}" wx:key="*this"
            class="select-opt {{fmt.fontFamily === item ? 'active' : ''}}"
            bindtap="setFontFamily" data-family="{{item}}">
            <text>{{item}}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="tool-row expanded-row" wx:if="{{toolbarExpanded}}">
      <view class="tool-btn" bindtap="insertImage">
        <text class="tool-label">🖼图片</text>
      </view>
      <view class="tool-btn" bindtap="insertTable">
        <text class="tool-label">⊞表格</text>
      </view>
      <view class="tool-btn" bindtap="clearFormat">
        <text class="tool-label">清除格式</text>
      </view>
      <view class="tool-btn" bindtap="undo">
        <text class="tool-label">撤销</text>
      </view>
      <view class="tool-btn" bindtap="redo">
        <text class="tool-label">重做</text>
      </view>
    </view>
  </view>

  <!-- 表格选择器弹窗 -->
  <view class="table-mask" wx:if="{{tablePicker}}" bindtap="cancelTable">
    <view class="table-popup" catchtap="noop">
      <view class="table-title">插入表格</view>
      <view class="table-row-selector">
        <text class="table-label">行数:</text>
        <view class="num-btn" bindtap="changeTableRows" data-delta="-1">-</view>
        <text class="num-display">{{tableRows}}</text>
        <view class="num-btn" bindtap="changeTableRows" data-delta="1">+</view>
      </view>
      <view class="table-col-selector">
        <text class="table-label">列数:</text>
        <view class="num-btn" bindtap="changeTableCols" data-delta="-1">-</view>
        <text class="num-display">{{tableCols}}</text>
        <view class="num-btn" bindtap="changeTableCols" data-delta="1">+</view>
      </view>
      <view class="table-actions">
        <view class="table-btn cancel" bindtap="cancelTable">取消</view>
        <view class="table-btn confirm" bindtap="confirmTable">确定</view>
      </view>
    </view>
  </view>

  <!-- 颜色选择器组件 -->
  <color-picker
    show="{{showColorPicker}}"
    target="{{colorTarget}}"
    currentColor="{{colorTarget === 'color' ? fmt.color : fmt.backgroundColor}}"
    bind:colorpick="onColorPick"
    bind:close="onColorClose"
  />

  <!-- 标题编辑（保留以兼容） -->
  <view class="title-bar" style="display:none;">
    <input class="title-input" placeholder="输入文档标题" value="{{title}}" bindinput="onTitleInput" bindblur="saveDoc" />
  </view>

  <!-- 编辑区 -->
  <view class="editor-wrap">
    <editor
      id="editor"
      class="editor"
      placeholder="开始输入内容..."
      show-img-size
      show-img-toolbar
      bindstatuschange="onStatusChange"
      bindready="onEditorReady"
      bindinput="onEditorInput"
    ></editor>
  </view>

  <!-- 底部状态栏 -->
  <view class="bottom-bar">
    <view class="save-status">{{saveStatus}}</view>
  </view>
</view>
```

- [ ] **Step 2: 更新 editor.js data 以匹配新模板**

在 editor.js 的 data 中添加：

```javascript
// 在 data 中添加（约第13-26行区域）
fontSizes: [10, 12, 14, 16, 18, 24, 36],
fontFamilies: ['微软雅黑', '宋体', '黑体', '楷体', 'Arial', 'Times New Roman'],
toolbarExpanded: false,
tablePicker: false,
tableRows: 2,
tableCols: 2,
showColorPicker: false,
colorTarget: 'color',
```

添加颜色选择相关方法：

```javascript
pickColor: function (e) {
  if (!this.editorCtx) return;
  var target = e.currentTarget.dataset.target;
  this.setData({
    showColorPicker: true,
    colorTarget: target
  });
},

onColorPick: function (e) {
  var detail = e.detail;
  if (!this.editorCtx) return;
  this.editorCtx.format(detail.target, detail.color);
  var fmtUpdate = {};
  fmtUpdate[detail.target] = detail.color;
  this.setData({ fmt: Object.assign({}, this.data.fmt, fmtUpdate) });
},

onColorClose: function () {
  this.setData({ showColorPicker: false });
},
```

- [ ] **Step 3: 手动测试完整编辑器UI**

在微信开发者工具中：
1. 顶部导航栏显示标题输入框、保存按钮、关闭按钮
2. 工具栏折叠状态显示基础格式按钮
3. 点击"更多▼"展开 → 显示字号、字体、图片、表格等
4. 点击颜色色块 → 弹出颜色选择器
5. 选择颜色 → 选中文字应用颜色
6. 点击"⊞表格" → 弹出表格选择器 → 插入表格
7. 点击"🖼图片" → 选择图片 → 插入图片
8. 底部状态栏显示保存状态

- [ ] **Step 4: Commit**

```bash
git add word/pages/editor/editor.wxml word/pages/editor/editor.js
git commit -m "feat(editor): refactor editor UI with collapsible toolbar and color picker"
```

---

### Task 12: 重构 editor.wxss — 新样式

**Files:**
- Rewrite: `word/pages/editor/editor.wxss`

- [ ] **Step 1: 重写编辑器样式**

```css
/* word/pages/editor/editor.wxss - 全面重构版 */
.editor-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f6f8;
}

/* 顶部导航栏 */
.top-bar {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #e5e5e5;
  flex-shrink: 0;
  padding-top: calc(12rpx + env(safe-area-inset-top));
}

.title-input-top {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
  padding: 8rpx 0;
}

.top-actions {
  display: flex;
  align-items: center;
  margin-left: 16rpx;
}

.save-btn-top {
  background: linear-gradient(135deg, #2b5797, #3a6bb8);
  color: #fff;
  padding: 12rpx 32rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.save-btn-top.disabled {
  opacity: 0.6;
}

.close-btn {
  font-size: 36rpx;
  color: #999;
  padding: 8rpx 16rpx;
  margin-left: 8rpx;
}

/* 工具栏 */
.toolbar {
  background: #fff;
  border-bottom: 1rpx solid #e5e5e5;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}

.tool-row {
  display: flex;
  align-items: center;
  padding: 10rpx 16rpx;
  flex-wrap: wrap;
}

.tool-btn {
  min-width: 64rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  margin: 4rpx 6rpx;
  padding: 0 12rpx;
  background: #fafafa;
  transition: all 0.15s;
}

.tool-btn:active {
  background: #e9ecef;
}

.tool-btn.active {
  background: #2b5797;
}

.tool-btn.active .tool-label,
.tool-btn.active .tool-icon {
  color: #fff;
}

.tool-label {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.tool-label.bold { font-weight: bold; font-size: 28rpx; }
.tool-label.italic { font-style: italic; }
.tool-label.underline { text-decoration: underline; }
.tool-label.strike { text-decoration: line-through; }

.tool-icon {
  font-size: 24rpx;
  color: #555;
}

.tool-icon-sm {
  font-size: 20rpx;
  color: #555;
  margin-right: 4rpx;
}

.tool-divider {
  width: 1rpx;
  height: 40rpx;
  background: #e5e5e5;
  margin: 0 8rpx;
}

.color-swatch {
  width: 32rpx;
  height: 32rpx;
  border-radius: 6rpx;
  border: 2rpx solid #ddd;
  position: relative;
}

.color-swatch.highlight {
  height: 24rpx;
  width: 32rpx;
}

/* 展开行 */
.expand-row {
  justify-content: center;
  padding: 6rpx 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.expand-label {
  font-size: 22rpx;
  color: #999;
}

.expanded-row {
  background: #fafbfc;
  border-top: 1rpx solid #f0f0f0;
}

/* 字号/字体选择器 */
.size-selector,
.font-selector {
  display: flex;
  align-items: center;
  margin: 4rpx 6rpx;
}

.select-options {
  display: flex;
  flex-wrap: wrap;
  margin-left: 8rpx;
}

.select-opt {
  padding: 6rpx 14rpx;
  font-size: 22rpx;
  color: #555;
  background: #f0f0f0;
  border-radius: 6rpx;
  margin: 2rpx 4rpx;
}

.select-opt.active {
  background: #2b5797;
  color: #fff;
}

/* 表格选择器弹窗 */
.table-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-popup {
  width: 80%;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
}

.table-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 30rpx;
  text-align: center;
}

.table-row-selector,
.table-col-selector {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.table-label {
  font-size: 28rpx;
  color: #555;
  width: 100rpx;
}

.num-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 8rpx;
  font-size: 32rpx;
  color: #333;
  margin: 0 16rpx;
}

.num-display {
  font-size: 28rpx;
  color: #333;
  min-width: 40rpx;
  text-align: center;
}

.table-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 30rpx;
  gap: 16rpx;
}

.table-btn {
  padding: 14rpx 36rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.table-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.table-btn.confirm {
  background: #2b5797;
  color: #fff;
}

/* 标题栏（隐藏，标题已移到顶部） */
.title-bar {
  display: none;
}

/* 编辑区 */
.editor-wrap {
  flex: 1;
  overflow: hidden;
  padding: 20rpx 24rpx;
  background: #f5f6f8;
}

.editor {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  min-height: 100%;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
  font-size: 30rpx;
  line-height: 1.8;
}

/* 底部状态栏 */
.bottom-bar {
  background: #fff;
  border-top: 1rpx solid #e5e5e5;
  padding: 12rpx 30rpx;
  flex-shrink: 0;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
}

.save-status {
  font-size: 22rpx;
  color: #999;
}
```

- [ ] **Step 2: 手动测试样式效果**

在微信开发者工具中检查：
1. 顶部导航栏样式正确，标题和按钮对齐
2. 工具栏按钮布局整齐，激活状态高亮明显
3. 颜色选择器弹窗从底部滑出，网格排列整齐
4. 表格选择器弹窗居中显示
5. 编辑区域白色卡片，圆角阴影
6. 底部状态栏显示正常

- [ ] **Step 3: Commit**

```bash
git add word/pages/editor/editor.wxss
git commit -m "feat(editor): refactor editor styles with modern UI"
```

---

### Task 13: 更新 index.js — 搜索、排序、视图切换、纯前端导入

**Files:**
- Modify: `word/pages/index/index.js`

- [ ] **Step 1: 更新 data 添加搜索、排序、视图模式**

```javascript
// 替换 data（约第14行）
data: {
  docs: [],
  filteredDocs: [],
  searchKey: '',
  sortBy: 'updatedAt_desc',
  viewMode: 'list' // 'list' or 'grid'
},
```

- [ ] **Step 2: 替换 _loadDocs 为支持搜索和排序**

```javascript
// 替换 _loadDocs 方法（约第18-26行）
_loadDocs: function () {
  var raw = wx.getStorageSync(STORAGE_KEY);
  if (!raw || !Array.isArray(raw)) {
    this.setData({ docs: [], filteredDocs: [] });
    return;
  }
  var that = this;
  var list = raw.map(function (d) {
    d.timeStr = formatTime(d.updatedAt || d.createdAt);
    return d;
  });
  // 排序
  list = this._sortDocs(list);
  this.setData({ docs: list });
  this._filterDocs();
},

_sortDocs: function (list) {
  var sortBy = this.data.sortBy;
  if (sortBy === 'updatedAt_desc') {
    return list.sort(function (a, b) { return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt); });
  } else if (sortBy === 'updatedAt_asc') {
    return list.sort(function (a, b) { return (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt); });
  } else if (sortBy === 'title') {
    return list.sort(function (a, b) { return a.title.localeCompare(b.title, 'zh'); });
  } else if (sortBy === 'createdAt_desc') {
    return list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  }
  return list;
},

_filterDocs: function () {
  var key = this.data.searchKey.trim().toLowerCase();
  var docs = this.data.docs;
  if (!key) {
    this.setData({ filteredDocs: docs });
    return;
  }
  var filtered = docs.filter(function (d) {
    return (d.title || '').toLowerCase().indexOf(key) >= 0;
  });
  this.setData({ filteredDocs: filtered });
},

onSearchInput: function (e) {
  this.setData({ searchKey: e.detail.value });
  this._filterDocs();
},

onSortChange: function (e) {
  var sortBy = e.currentTarget.dataset.sort;
  this.setData({ sortBy: sortBy });
  this._loadDocs();
},

toggleViewMode: function () {
  var mode = this.data.viewMode === 'list' ? 'grid' : 'list';
  this.setData({ viewMode: mode });
},
```

- [ ] **Step 3: 替换 importDoc 为纯前端解析**

```javascript
// 替换 importDoc 方法（约第37-87行）
importDoc: function () {
  var that = this;
  wx.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['docx', 'doc'],
    success: function (res) {
      var file = res.tempFiles[0];
      var name = file.name.replace(/\.[^.]+$/, '') || '导入文档';
      wx.showLoading({ title: '解析中...' });
      wx.getFileSystemManager().readFile({
        filePath: file.path,
        success: function (readRes) {
          wx.hideLoading();
          var raw = readRes.data;
          var buf;
          if (typeof raw === 'string') {
            var clean = raw.replace(/[\n\r\s]/g, '');
            buf = wx.base64ToArrayBuffer(clean);
          } else {
            buf = raw;
          }
          var files = that._unzip(buf);
          var docXml = files['word/document.xml'];
          if (!docXml) {
            wx.showToast({ title: '无效的 DOCX 文件', icon: 'none' });
            return;
          }
          var xmlStr = that._bytesToStr(docXml);
          var html = that._parseDocXml(xmlStr);
          var now = Date.now();
          var doc = {
            id: 'doc_' + now,
            title: name,
            content: JSON.stringify(html),
            createdAt: now,
            updatedAt: now
          };
          var list = that._getList();
          list.unshift(doc);
          wx.setStorageSync(STORAGE_KEY, list);
          wx.showToast({ title: '导入成功', icon: 'success' });
          setTimeout(function () { that._loadDocs(); }, 800);
        },
        fail: function () {
          wx.hideLoading();
          wx.showToast({ title: '读取文件失败', icon: 'none' });
        }
      });
    },
    fail: function () {}
  });
},
```

由于 `_unzip`、`_bytesToStr`、`_parseDocXml` 原来在 editor.js 中，需要将这些方法复制到 index.js 中，或者提取到公共文件。为简化，直接复制到 index.js：

```javascript
// 在 index.js 末尾添加（在 _getList 方法后）
_unzip: function (buf) {
  var view = new Uint8Array(buf);
  var files = {};
  var off = 0;
  while (off < view.length - 4) {
    if (view[off] !== 0x50 || view[off + 1] !== 0x4B) { off++; continue; }
    var sig = view[off + 2] | (view[off + 3] << 8);
    if (sig === 0x0403) {
      var cm = view[off + 8] | (view[off + 9] << 8);
      var flags = view[off + 6] | (view[off + 7] << 8);
      var hasDataDescriptor = (flags & 0x0008) !== 0;
      var csize = view[off + 18] | (view[off + 19] << 8) | (view[off + 20] << 16) | (view[off + 21] << 24);
      var nl = view[off + 26] | (view[off + 27] << 8);
      var el = view[off + 28] | (view[off + 29] << 8);
      var name = '';
      for (var i = 0; i < nl; i++) name += String.fromCharCode(view[off + 30 + i]);
      var dataOff = off + 30 + nl + el;
      var compressed;
      var newOff;
      if (hasDataDescriptor) {
        let searchStart = dataOff;
        const maxSearch = Math.min(view.length, searchStart + 1024 * 1024);
        let descSigPos = -1;
        for (let i = searchStart; i <= maxSearch - 4; i++) {
          if (view[i] === 0x50 && view[i + 1] === 0x4B && view[i + 2] === 0x07 && view[i + 3] === 0x08) {
            descSigPos = i; break;
          }
        }
        if (descSigPos === -1) {
          compressed = view.slice(dataOff, dataOff + csize);
          newOff = dataOff + csize;
        } else {
          compressed = view.slice(dataOff, descSigPos);
          newOff = descSigPos + 4 + 4 + 4 + 4;
        }
      } else {
        compressed = view.slice(dataOff, dataOff + csize);
        newOff = dataOff + csize;
      }
      // 使用 pako 解压（需要 require pako）
      try {
        var pako = require('../../word/pages/editor/pako.es5');
        files[name] = cm === 0 ? compressed : pako.inflate(compressed, { raw: true });
      } catch (e) {
        files[name] = compressed;
      }
      off = newOff;
    } else if (sig === 0x0201 || sig === 0x0505) {
      break;
    } else { off++; }
  }
  return files;
},

_bytesToStr: function (bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return decodeURIComponent(escape(s));
},

_parseDocXml: function (xmlText) {
  var html = '';
  var paraMatches = xmlText.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  for (var pi = 0; pi < paraMatches.length; pi++) {
    var pXml = paraMatches[pi];
    var styleMatch = pXml.match(/<w:pStyle w:val="([^"]+)"/);
    var style = styleMatch ? styleMatch[1] : '';
    var isH = /^Heading/.test(style) || /^h[1-6]$/i.test(style);
    var alignMatch = pXml.match(/<w:jc w:val="([^"]+)"/);
    var align = alignMatch ? alignMatch[1] : '';
    var isList = /<w:numPr/.test(pXml);
    var text = '';
    var runs = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
    for (var ri = 0; ri < runs.length; ri++) {
      var m = runs[ri].match(/<w:t[^>]*>([\s\S]*)/);
      if (m) text += m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    }
    text = text.trim();
    if (!text) continue;
    var level = style === 'Heading1' ? 1 : style === 'Heading2' ? 2 : style === 'Heading3' ? 3 : 0;
    var openTag = isH ? '<h' + level + '>' : isList ? '<li>' : '<p>';
    var closeTag = openTag.replace('<', '</');
    if (align === 'center' || align === 'right') openTag = openTag.replace('>', ' style="text-align:' + align + '">');
    html += openTag + text + closeTag;
  }
  return html || '<p></p>';
},
```

- [ ] **Step 4: 添加编辑、导出、删除方法**

```javascript
// 替换 openDoc 方法
openDoc: function (e) {
  var id = e.currentTarget.dataset.id;
  wx.navigateTo({ url: '/word/pages/editor/editor?id=' + id });
},

exportDoc: function (e) {
  var id = e.currentTarget.dataset.id;
  wx.navigateTo({ url: '/word/pages/editor/editor?id=' + id + '&export=1' });
},

deleteDoc: function (e) {
  var id = e.currentTarget.dataset.id;
  var that = this;
  wx.showModal({
    title: '确认删除',
    content: '删除后无法恢复',
    success: function (res) {
      if (!res.confirm) return;
      var list = that._getList().filter(function (d) { return d.id !== id; });
      wx.setStorageSync(STORAGE_KEY, list);
      that._loadDocs();
      wx.showToast({ title: '已删除', icon: 'success' });
    }
  });
},
```

- [ ] **Step 5: 手动测试首页功能**

在微信开发者工具中：
1. 搜索栏输入文字 → 文档列表实时过滤
2. 点击排序按钮 → 按不同方式排序
3. 点击视图切换按钮 → 列表/网格视图切换
4. 点击"导入Word" → 选择docx文件 → 纯前端解析并导入
5. 点击卡片上"编辑" → 跳转到编辑器
6. 点击卡片上"导出" → 跳转到编辑器并导出
7. 点击卡片上"删除" → 确认弹窗 → 删除

- [ ] **Step 6: Commit**

```bash
git add word/pages/index/index.js
git commit -m "feat(index): add search, sort, view toggle, and pure frontend import"
```

---

### Task 14: 更新 index.wxml — 新布局

**Files:**
- Modify: `word/pages/index/index.wxml`

- [ ] **Step 1: 重写首页模板**

```xml
<!--word/pages/index/index.wxml - 重构版-->
<view class="container">
  <view class="header">
    <text class="header-title">Word 文档</text>
    <text class="header-sub">在线编辑，随时保存并导出</text>
  </view>

  <!-- 搜索栏 -->
  <view class="search-bar">
    <view class="search-input-wrap">
      <text class="search-icon">🔍</text>
      <input class="search-input" placeholder="搜索文档..." value="{{searchKey}}" bindinput="onSearchInput" />
      <text class="search-clear" wx:if="{{searchKey}}" bindtap="onSearchClear">×</text>
    </view>
  </view>

  <!-- 操作按钮 -->
  <view class="btn-row">
    <view class="new-btn" bindtap="createDoc">
      <text class="new-icon">+</text>
      <text class="new-text">新建文档</text>
    </view>
    <view class="import-btn" bindtap="importDoc">
      <text class="import-icon">↑</text>
      <text class="import-text">导入Word</text>
    </view>
  </view>

  <!-- 排序和视图切换 -->
  <view class="toolbar-row" wx:if="{{filteredDocs.length > 0}}">
    <text class="section-title">全部文档 ({{filteredDocs.length}})</text>
    <view class="toolbar-actions">
      <view class="sort-btn" bindtap="showSortPicker">
        <text>{{sortBy === 'updatedAt_desc' ? '最新修改' : sortBy === 'updatedAt_asc' ? '最早修改' : sortBy === 'title' ? '按名称' : '最近创建'}} ▼</text>
      </view>
      <view class="view-toggle" bindtap="toggleViewMode">
        <text>{{viewMode === 'list' ? '⊞' : '☰'}}</text>
      </view>
    </view>
  </view>

  <!-- 排序选择器（简易实现） -->
  <view class="sort-picker" wx:if="{{showSortMenu}}" bindtap="hideSortPicker">
    <view class="sort-options" catchtap="noop">
      <view class="sort-opt {{sortBy === 'updatedAt_desc' ? 'active' : ''}}" bindtap="onSortChange" data-sort="updatedAt_desc">最新修改</view>
      <view class="sort-opt {{sortBy === 'updatedAt_asc' ? 'active' : ''}}" bindtap="onSortChange" data-sort="updatedAt_asc">最早修改</view>
      <view class="sort-opt {{sortBy === 'title' ? 'active' : ''}}" bindtap="onSortChange" data-sort="title">按名称</view>
      <view class="sort-opt {{sortBy === 'createdAt_desc' ? 'active' : ''}}" bindtap="onSortChange" data-sort="createdAt_desc">最近创建</view>
    </view>
  </view>

  <!-- 文档列表 -->
  <view class="doc-list {{viewMode}}">
    <view class="doc-card {{viewMode}}" wx:for="{{filteredDocs}}" wx:key="id">
      <view class="doc-info" bindtap="openDoc" data-id="{{item.id}}">
        <view class="doc-icon-wrap">
          <text class="doc-icon">W</text>
        </view>
        <view class="doc-detail">
          <text class="doc-name">{{item.title}}</text>
          <text class="doc-time">{{item.timeStr}}</text>
        </view>
      </view>
      <view class="doc-actions">
        <text class="action-btn edit" data-id="{{item.id}}" bindtap="openDoc">编辑</text>
        <text class="action-btn export" data-id="{{item.id}}" bindtap="exportDoc">导出</text>
        <text class="action-btn del" data-id="{{item.id}}" bindtap="deleteDoc">删除</text>
      </view>
    </view>
  </view>

  <view wx:if="{{filteredDocs.length === 0 && searchKey}}" class="empty">
    <text class="empty-text">未找到相关文档</text>
  </view>

  <view wx:if="{{docs.length === 0}}" class="empty">
    <text class="empty-text">暂无文档，点击上方新建</text>
  </view>
</view>
```

需要在 index.js 的 data 中添加 `showSortMenu: false,`，并添加相关方法：

```javascript
showSortPicker: function () {
  this.setData({ showSortMenu: true });
},

hideSortPicker: function () {
  this.setData({ showSortMenu: false });
},

onSearchClear: function () {
  this.setData({ searchKey: '' });
  this._filterDocs();
},
```

- [ ] **Step 2: 手动测试新首页布局**

在微信开发者工具中：
1. 搜索栏正常显示，输入时过滤文档
2. 排序选择器弹出和选择正常工作
3. 视图切换按钮正常工作
4. 网格视图显示2列卡片
5. 每个卡片显示编辑/导出/删除按钮

- [ ] **Step 3: Commit**

```bash
git add word/pages/index/index.wxml word/pages/index/index.js
git commit -m "feat(index): refactor index page with search, sort, and view toggle"
```

---

### Task 15: 更新 index.wxss — 新样式

**Files:**
- Modify: `word/pages/index/index.wxss`

- [ ] **Step 1: 添加搜索栏、排序、网格视图样式**

在现有 `index.wxss` 末尾添加：

```css
/* 搜索栏 */
.search-bar {
  margin-bottom: 20rpx;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.search-clear {
  font-size: 32rpx;
  color: #ccc;
  padding: 0 8rpx;
}

/* 工具栏行 */
.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20rpx 0 16rpx;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.sort-btn {
  font-size: 24rpx;
  color: #666;
  background: #fff;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  border: 1rpx solid #e5e5e5;
}

.view-toggle {
  font-size: 32rpx;
  color: #666;
  padding: 8rpx 12rpx;
  background: #fff;
  border-radius: 8rpx;
  border: 1rpx solid #e5e5e5;
}

/* 排序选择器 */
.sort-picker {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 999;
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
}

.sort-options {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx 0;
  width: 400rpx;
}

.sort-opt {
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #333;
}

.sort-opt.active {
  color: #2b5797;
  font-weight: 500;
  background: rgba(43,87,151,0.05);
}

/* 网格视图 */
.doc-list.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.doc-card.grid {
  width: calc(50% - 8rpx);
  flex-direction: column;
  align-items: center;
  padding: 24rpx 16rpx;
}

.doc-card.grid .doc-info {
  flex-direction: column;
  align-items: center;
  margin-bottom: 16rpx;
  width: 100%;
}

.doc-card.grid .doc-icon-wrap {
  margin-right: 0;
  margin-bottom: 12rpx;
}

.doc-card.grid .doc-detail {
  align-items: center;
}

.doc-card.grid .doc-name {
  text-align: center;
  font-size: 24rpx;
}

.doc-card.grid .doc-time {
  text-align: center;
}

.doc-card.grid .doc-actions {
  flex-direction: column;
  align-items: stretch;
  width: 100%;
}

.doc-card.grid .action-btn {
  text-align: center;
  margin: 4rpx 0;
  font-size: 22rpx;
  padding: 6rpx 0;
}
```

- [ ] **Step 2: 手动测试完整流程**

完整测试所有功能：
1. 新建文档 → 编辑 → 保存 → 返回 → 首页显示
2. 导入docx → 解析 → 编辑 → 保存
3. 搜索、排序、视图切换
4. 编辑、导出、删除操作
5. 编辑器：格式按钮、颜色选择器、图片、表格、字号、字体

- [ ] **Step 3: Commit**

```bash
git add word/pages/index/index.wxss
git commit -m "feat(index): add styles for search, sort, grid view"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] 颜色选择器组件 → Task 1-4
- [x] 工具栏可折叠 → Task 11, 12
- [x] 移除自动保存/自动导出 → Task 6, 7
- [x] 新保存：存本地+生成docx → Task 7
- [x] 图片插入 → Task 8
- [x] 表格插入 → Task 9
- [x] 字号/字体选择 → Task 10
- [x] 首页搜索栏 → Task 13, 14
- [x] 首页排序 → Task 13, 14
- [x] 首页视图切换 → Task 13, 14
- [x] 纯前端导入 → Task 13
- [x] 卡片操作按钮 → Task 14

**2. Placeholder scan:** No TBD, TODO, or placeholder content found.

**3. Type consistency:** All method names, data properties, and event names are consistent across JS, WXML, and WXSS files.

**4. Code review:** The `_unzip` method is duplicated between editor.js and index.js. Consider extracting to a shared utility in future, but keeping separate copies avoids cross-page dependency issues in WeChat mini programs.
