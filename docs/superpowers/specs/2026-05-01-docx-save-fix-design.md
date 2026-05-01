# Fix: DOCX Save Not Available to User in Editor Page

**Date:** 2026-05-01  
**Status:** Approved  
**Branch:** silly-almeida-e1bdb1  

## Problem

In the Word editor page (`word/pages/editor/editor.js`), clicking the "保存" (Save) button generates a `.docx` file and writes it to `wx.env.USER_DATA_PATH`, but never surfaces the file to the user. The file is trapped in the mini-program sandbox with no way for the user to preview, share, or download it.

The document list page (`word/pages/index/index.js`) has a working `exportDoc()` function that correctly calls `wx.openDocument({ showMenu: true })` after writing the file — the editor page is simply missing this call.

## Root Cause

`editor.js` `saveDoc()` lines 238-251: the `writeFile` success callback sets save status and shows a toast "已保存并导出" (Saved and Exported), but never calls `wx.openDocument()`. The file exists on disk but is inaccessible.

## Fix

Add `wx.openDocument()` call in the `writeFile` success callback of `editor.js` `saveDoc()`.

### File Changed
- `word/pages/editor/editor.js` — `saveDoc()` function, `writeFile` success callback

### Before (lines 242-246)
```javascript
success: function () {
    that.setData({ saveStatus: '已保存并导出' });
    that._dirty = false;
    wx.showToast({ title: '已保存并导出', icon: 'success' });
},
```

### After
```javascript
success: function () {
    that.setData({ saveStatus: '已保存并导出' });
    that._dirty = false;
    wx.showToast({ title: '已保存并导出', icon: 'success' });
    wx.openDocument({
        filePath: filePath,
        showMenu: true,
        fail: function (err) {
            console.error('openDocument fail:', err);
        }
    });
},
```

### Why `showMenu: true`

The WeChat native document viewer with `showMenu: true` displays a `...` menu in the top-right corner with options:
- **发送给朋友** (Send to Chat) — equivalent to `wx.shareFileMessage`
- **收藏** (Favorite)
- **保存到手机** (Save to Phone)

This single API call covers preview + share + download.

### Consistency

This matches the existing implementation in `word/pages/index/index.js` `exportDoc()` (lines 627-632), which already uses the same pattern.

## Edge Cases

| Scenario | Handling |
|----------|----------|
| `openDocument` fails | Non-critical — Toast already confirms save; error logged to console |
| User navigates back (`goBack`) | `goBack()` calls `saveDoc()` then `wx.navigateBack()` — document preview appears during transition |
| Empty document | Guarded by `_loaded` check; even if triggered, generates valid minimal DOCX |
| File name collision | Prevented by timestamp suffix: `title_timestamp.docx` |

## Not Changed

- DOCX generation logic (`_buildDocx`, `_htmlToDocxParagraphs`) — working correctly
- Local storage (`wx.setStorageSync`) — working correctly
- `word/pages/index/index.js` `exportDoc()` — already correct
- WXML/WXSS templates — no UI changes needed
