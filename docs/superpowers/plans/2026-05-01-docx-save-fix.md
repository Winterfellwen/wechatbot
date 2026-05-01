# DOCX Save Fix - Editor Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the editor page save button so users can preview, share, and download the generated .docx file after saving.

**Architecture:** Single-file fix — add `wx.openDocument({ showMenu: true })` call in the `writeFile` success callback of `editor.js` `saveDoc()`. This mirrors the existing working implementation in `index.js` `exportDoc()`.

**Tech Stack:** WeChat Mini-Program (WXS), vanilla JavaScript, WeChat native APIs (`wx.openDocument`, `wx.getFileSystemManager`)

**Spec:** `docs/superpowers/specs/2026-05-01-docx-save-fix-design.md`

---

### Task 1: Add wx.openDocument call in saveDoc()

**Files:**
- Modify: `word/pages/editor/editor.js:242-246`

- [ ] **Step 1: Add wx.openDocument after successful writeFile**

In `word/pages/editor/editor.js`, locate the `saveDoc` function, find the `writeFile` success callback at line 242. Add `wx.openDocument` call after `wx.showToast`:

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

- [ ] **Step 2: Verify the edit was applied correctly**

Run a diff to confirm only the intended lines changed:

```bash
git diff word/pages/editor/editor.js
```

Expected: Only the `success` callback in `saveDoc()` is modified — the three new lines for `wx.openDocument(...)` are added between `wx.showToast(...)` and the closing `},`.

- [ ] **Step 3: Verify no syntax errors**

Check that the JavaScript is syntactically valid:

```bash
node --check word/pages/editor/editor.js
```

Expected: Exit code 0, no output (or just deprecation warnings which are non-blocking).

Note: May fail on `require('./pako.es5')` if pako has syntax issues — that's pre-existing and unrelated. If the check fails, manually verify the edit: the closing `},` for the success callback must not be missing or duplicated, and the new `wx.openDocument({...})` block must have matching braces.

- [ ] **Step 4: Verify consistency with index.js exportDoc**

Confirm the added code matches the same pattern used in `word/pages/index/index.js`:

```bash
grep -A 8 "wx.openDocument" word/pages/index/index.js
```

Expected output shows:
```javascript
wx.openDocument({
    filePath: filePath,
    showMenu: true,
    success: function () { wx.showToast({ title: '已保存', icon: 'success' }); },
    fail: function () { wx.showToast({ title: '打开失败', icon: 'none' }); }
});
```

Our call uses the same `filePath` and `showMenu: true`. The toast is already shown before `openDocument` in our fix, which is fine — it avoids a redundant second toast.

- [ ] **Step 5: Commit**

```bash
git add word/pages/editor/editor.js
git commit -m "$(cat <<'EOF'
fix(editor): add wx.openDocument after docx save to let users download/share

Previously saveDoc() wrote the .docx to USER_DATA_PATH but never
surfaced it to the user. Adding wx.openDocument({ showMenu: true })
opens the native document viewer with share/save menu options.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Verification Checklist (post-implementation, manual)

Since this is a WeChat mini-program without an automated test framework, verify manually in WeChat DevTools or on device:

- [ ] Open the Word editor, type some content, tap **保存**
- [ ] Confirm toast "已保存并导出" appears
- [ ] Confirm the document opens in WeChat's native document viewer
- [ ] Tap the `...` menu in the viewer — confirm **发送给朋友**, **收藏**, **保存到手机** are available
- [ ] Tap **返回** from an unsaved editor — confirm save triggers and document preview appears before navigation
- [ ] Verify `index.js` export (from document list page) still works unchanged
