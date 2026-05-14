# PDF 编辑入口整合设计

## 背景

`pdf/pages/index/index`（PDF工具箱）已有完整的上传→转换→下载流程。`pdf/pages/edit/edit`（在线编辑：水印/旋转/合并）功能完整但无页面入口。

## 方案

选择 A：**从 PDF 工具箱入口编辑** — 上传文件后，通过"转换"/"编辑"双标签切换，编辑时跳转到 edit 独立页面。

## 改动范围

### `pdf/pages/index/index.js`

- 新增 `data.activeTab: 'convert'`（默认选中转换标签）
- 新增 `switchTab(e)` 方法，根据 `e.currentTarget.dataset.tab` 切换 `activeTab`
- 新增 `goEdit()` 方法，`navigateTo` 到 edit 页传递文件信息：
  ```js
  wx.navigateTo({
    url: '../edit/edit?file=' + encodeURIComponent(this.data.fileName) + '&path=' + encodeURIComponent(this.data.filePath)
  });
  ```
- 与转换流程不冲突：`converting` 状态不受编辑影响

### `pdf/pages/index/index.wxml`

文件卡片（`convert-section`）下方插入 tab 切换区：

```xml
<view class="tab-bar" wx:if="{{fileName}}">
  <view class="tab-item {{activeTab === 'convert' ? 'active' : ''}}" bindtap="switchTab" data-tab="convert">转换</view>
  <view class="tab-item {{activeTab === 'edit' ? 'active' : ''}}" bindtap="switchTab" data-tab="edit">编辑</view>
</view>
```

- `activeTab === 'convert'` 时显示现有转换 UI（target-list + convert-btn-wrap）
- `activeTab === 'edit'` 时显示编辑入口卡片（跳转到 edit 页），包含操作简表和水印/旋转/合并说明

### `pdf/pages/index/index.wxss`

- tab-bar 样式：水平等宽双按钮，选中态高亮
- edit-section 样式：编辑功能卡，带操作图标列表

### 不变的文件

- `pdf/pages/edit/edit.js` / `.wxml` / `.wxss` / `.json`（已支持接收 params，无需改动）
- `app.json`（edit 已在 subpackage 注册）
- 后端 API：`/api/pdf/convert` 和 `/api/pdf/edit` 均无变动

## 副作用

- 无。编辑页是独立页面，与转换流程不共享状态
- 文件数据通过 URL 参数传递，不存在共享资源冲突
