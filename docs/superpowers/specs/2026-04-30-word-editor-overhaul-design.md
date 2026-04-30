# Word 编辑器全面重构设计文档

**日期：** 2026-04-30
**范围：** word/pages/editor + word/pages/index
**目标：** 修复颜色选择器bug、移除自动保存/自动导出、美化UI、添加搜索/排序/视图切换、保存同时生成docx

---

## 1. 架构与组件结构

**当前状态：** 所有逻辑集中在单个 `editor.js`（769行），工具栏是内联WXML，3行按钮。

**新架构：**

```
word/pages/
├── index/          # 文档列表（增强）
│   ├── index.js    # + 搜索、排序、网格/列表切换
│   ├── index.wxml  # + 搜索栏、视图切换
│   ├── index.wxss  # + 网格布局样式
│   └── index.json
├── editor/         # 文档编辑器（全面重构）
│   ├── editor.js   # 精简：移除自动保存、自动导出；添加图片/表格插入
│   ├── editor.wxml # 可折叠工具栏（基础+高级两段）
│   ├── editor.wxss # 现代UI
│   ├── editor.json
│   ├── pako.es5.js
│   └── components/
│       ├── color-picker/   # 可复用颜色选择器弹窗
│       └── toolbar/         # 可折叠工具栏（非完整Word功能区，仅展开/折叠两段工具栏）
└── components/
    └── doc-card/    # 可复用文档卡片
```

**关键决策：**
- 将 `color-picker` 提取为独立组件（用于文字颜色和背景高亮）
- 可折叠功能区：默认显示基础格式，点击"更多"展开高级功能（字号、图片、表格）
- 编辑器页面：无自动保存定时器，无自动导出 — 仅显式保存
- 首页：每张卡片显示标题、日期和操作按钮（编辑/导出/删除），顶部添加搜索栏和视图切换

---

## 2. 编辑器页面 — 功能区、颜色选择器与新功能

### 2.1 颜色选择器组件

由于 `wx.chooseColor` 在基础库 3.15.2 不可用，构建自定义弹窗颜色选择器：

**布局：** 底部弹窗（`position: fixed; bottom: 0`）
- **预设颜色网格：** 4行 × 8列 = 32种常用颜色
- **当前颜色显示：** 显示当前选中的颜色
- **自定义输入：** 一行 `#RRGGBB` 输入框

**预设颜色：**
```
#000000 #434343 #666666 #999999 #b7b7b7 #cccccc #d9d9d9 #efefef
#980000 #ff0000 #ff9900 #ffff00 #00ff00 #00ffff #4a86e8 #0000ff
#9900ff #ff00ff #e6b8af #f4cccc #fce5cd #fff2cc #d9ead3 #b6d7a8
#a2c4c9 #d0e0e3 #c9daf8 #cfe2f3 #d9d2e9 #ead1dc #ea9999 #f9cb9c
```

**组件API：**
- 属性：`show`（Boolean）、`target`（String: "color" 或 "backgroundColor"）、`currentColor`（String）
- 事件：`colorpick`（返回 `{target, color}`）、`close`（关闭弹窗）

### 2.2 功能区工具栏（2种状态）

**折叠状态（默认）：**
```
[B] [I] [U] [S] | [H1] [H2] [H3] | [左] [中] [右] | [1.] [•] | A▼ [颜色] [高亮] | [更多▼]
```

**展开状态（点击更多▼后）：**
```
字号: [12▼] | 字体: [微软雅黑▼]
[插入图片] [插入表格] [清除格式] [撤销] [重做]
```
- **字号选项：** 10, 12, 14, 16, 18, 24, 36（通过 `editorCtx.format('fontSize', size)` 实现）
- **字体选项：** 微软雅黑、宋体、黑体、楷体、Arial、Times New Roman（通过 `editorCtx.format('fontFamily', font)` 实现）

**工具栏行为：**
- 激活的格式按钮高亮显示（`background: #2b5797; color: #fff`）
- 颜色色块以圆形小图标显示当前选中颜色
- 点击颜色色块打开 color-picker 组件
- "更多" 切换展开/折叠状态

### 2.3 新功能

**图片插入：**
- 使用 `wx.chooseImage` 从相册/相机选择
- 通过 `editorCtx.insertImage({ src, width, height })` 插入
- 图片以 base64 存入编辑器内容（小程序无服务器上传）

**表格插入：**
- 弹出选择器："行数 × 列数"（2×2 到 6×6 网格）
- 通过 `editorCtx.insertHTML()` 插入 HTML 表格，带内联样式
- 基础表格：边框、单元格内边距、简约样式

### 2.4 保存行为

**移除：**
- `autoSaveTimer` 及 `onEditorInput` 中的所有自动保存逻辑
- `this.data.autoExport` 及 `onEditorReady` 中的自动导出检查

**替换为显式保存：**
- 顶部导航栏的"保存"按钮同时完成：
  1. 保存到本地存储（`wx.setStorageSync`）
  2. 生成 `.docx` 文件并保存到用户目录（`wx.getFileSystemManager().writeFile`）
- 返回按钮 → 触发保存 + 返回首页
- 保存状态显示："已保存" / "未保存" / "保存中..."

---

## 3. 首页 — 搜索、排序、视图切换与保存

### 3.1 首页布局

```
┌─────────────────────────────┐
│  Word 文档          🔍 [搜索框] │
│  在线编辑，随时保存并导出       │
├─────────────────────────────┤
│ [+ 新建文档]  [↑ 导入Word]   │
│                              │
│  📋 全部文档  [最新▼] [⊞⊟]  │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ W  我的文档        编辑  │ │
│ │    04-28 14:30    导出  │ │
│ │                   删除  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 3.2 搜索栏

- 位于顶部，标题下方
- 实时过滤：输入时按标题过滤文档列表
- 显示"找到 X 个文档"，无结果时显示"未找到相关文档"
- 清除按钮（×）重置搜索

### 3.3 排序选项

点击"最新▼"弹出选择器：
- 最新修改（默认）— 按 `updatedAt` 降序
- 最早修改 — 按 `updatedAt` 升序
- 按名称 — 按 `title` A→Z
- 最近创建 — 按 `createdAt` 降序

### 3.4 视图切换（列表 ↔ 网格）

- **列表视图（默认）：** 全宽卡片
- **网格视图：** 2列网格，较小卡片只显示图标 + 标题 + 编辑按钮

```css
/* 网格模式 */
.doc-list.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.doc-list.grid .doc-card {
  width: calc(50% - 8rpx);
  flex-direction: column;
  align-items: center;
  padding: 24rpx 16rpx;
}
```

### 3.5 文档卡片操作

每张卡片显示：
- **标题**（可点击 → 打开编辑器）
- **时间**（最后修改时间）
- **三个操作按钮：** `编辑` | `导出` | `删除`

### 3.6 导入流程调整

**移除**当前首页对服务器的依赖（`https://wechatbot-g6ez.onrender.com/api/word/import`），改为纯前端解析（复用编辑器中的 `_unzip` 和 `_parseDocXml` 方法）：

```
chooseMessageFile 选择docx
   ↓
getFileSystemManager().readFile() 读取文件
   ↓
_unzip(buf) → 解压获取 word/document.xml
   ↓
_parseDocXml(xmlStr) → 转为HTML
   ↓
创建doc对象 → 存入storage → 跳转编辑器
```

---

## 4. 编辑器页面 — 完整UI布局

### 4.1 整体布局

```
┌──────────────────────────────┐
│  "文档标题"          ✕ 保存  │  ← 顶部导航栏
├──────────────────────────────┤
│ [B][I][U][S]│[H1][H2][H3]│  ← 工具栏第一行
│ [左][中][右]│[1.][•]│🎨🖌│
├──────────────────────────────┤
│ [更多▼]                     │  ← 可展开区域（字号、字体、图片、表格）
│  字号:[12▼] 字体:[微软雅黑▼]│
│  [插入图片] [插入表格]       │
│  [清除格式] [撤销] [重做]    │
├──────────────────────────────┤
│                              │
│        编辑区域               │  ← 富文本编辑器
│    （白色卡片，圆角阴影）      │
│                              │
│                              │
└──────────────────────────────┘
```

### 4.2 顶部导航栏

- **左侧：** 文档标题（可编辑）
- **右侧：** `保存` 按钮（主色渐变）+ `✕` 关闭按钮

### 4.3 颜色选择器弹窗

从底部弹出，覆盖半透明遮罩：

```
┌──────────────────────────────┐
│      选择颜色                │
│ ┌─┬─┬─┬─┬─┬─┬─┬─┐      │
│ │█│█│█│█│█│█│█│█│      │
│ ├─┼─┼─┼─┼─┼─┼─┼─┤      │
│ │█│█│█│█│█│█│█│█│      │
│ ├─┼─┼─┼─┼─┼─┼─┼─┤      │
│ │█│█│█│█│█│█│█│█│      │
│ ├─┼─┼─┼─┼─┼─┼─┼─┤      │
│ │█│█│█│█│█│█│█│█│      │
│ └─┴─┴─┴─┴─┴─┴─┴─┘      │
│ 当前颜色: ■ #000000        │
│ 自定义: [#______] [确定]   │
│           [取消]            │
└──────────────────────────────┘
```

---

## 5. 数据流程与错误处理

### 5.1 编辑器数据流程

```
用户编辑
   ↓
点击"保存"
   ↓
editorCtx.getContents()  ← 获取HTML内容
   ↓
├─ that._buildDocx(html) ← 生成DOCX base64
├─ that._saveToStorage(html) ← 存到本地存储
   ↓
wx.getFileSystemManager().writeFile()  ← 写入docx文件到USER_DATA_PATH
   ↓
wx.showToast('已保存并导出')
   ↓
更新 saveStatus: '已保存'
```

### 5.2 首页数据流程

```
onShow()
   ↓
_loadDocs() → wx.getStorageSync('word_docs')
   ↓
按排序规则处理 → setData({ docs })
   ↓
搜索过滤（如有）→ setData({ docs: filtered })
```

### 5.3 错误处理

**编辑器页面：**

| 场景 | 处理方式 |
|------|---------|
| 获取内容失败 | `wx.showToast('读取内容失败')` |
| DOCX生成失败 | `wx.showToast('生成文档失败')`，控制台输出错误 |
| 文件写入失败 | `wx.showToast('保存失败')`，设置 `exporting: false` |
| 未输入标题 | 自动使用"未命名文档"作为标题 |

**首页：**

| 场景 | 处理方式 |
|------|---------|
| 导入时网络错误 | `wx.showToast('网络错误')` |
| 导入返回解析失败 | `wx.showToast(data.error || '解析失败')` |
| 删除确认取消 | 不执行任何操作 |

**颜色选择器：**

| 场景 | 处理方式 |
|------|---------|
| 自定义颜色格式错误 | 提示"颜色格式错误，请使用#RRGGBB格式" |
| 选择颜色后编辑器未就绪 | 不执行format，等待ready |

### 5.4 文件存储管理

- **本地存储（word_docs）：** 存储文档列表（id, title, content[HTML], createdAt, updatedAt）
- **文件系统（USER_DATA_PATH）：** 保存 `.docx` 文件，命名格式 `{title}_{timestamp}.docx`
- 每次保存时覆盖同名文件，避免文件堆积

---

## 6. 实现要点总结

| 编号 | 任务 | 文件 |
|------|------|------|
| 1 | 创建 color-picker 组件 | `editor/components/color-picker/` |
| 2 | 创建 ribbon 组件 | `editor/components/ribbon/` |
| 3 | 修复颜色选择器（替换 wx.chooseColor） | `editor.js` pickColor 方法 |
| 4 | 移除自动保存逻辑 | `editor.js` 删除 autoSaveTimer |
| 5 | 移除自动导出逻辑 | `editor.js` 删除 autoExport |
| 6 | 修改保存按钮：存本地+生成docx | `editor.js` saveDoc 方法 |
| 7 | 重构编辑器UI布局 | `editor.wxml` + `editor.wxss` |
| 8 | 添加图片插入功能 | `editor.js` insertImage 方法 |
| 9 | 添加表格插入功能 | `editor.js` insertTable 方法 |
| 10 | 首页添加搜索栏 | `index.wxml` + `index.js` |
| 11 | 首页添加排序和视图切换 | `index.wxml` + `index.js` |
| 12 | 首页导入改为纯前端解析 | `index.js` importDoc 方法 |
| 13 | 首页卡片添加编辑/导出/删除按钮 | `index.wxml` |
