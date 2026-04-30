// word/pages/index/index.js
var STORAGE_KEY = 'word_docs';

function formatTime(ts) {
  var d = new Date(ts);
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  var hh = String(d.getHours()).padStart(2, '0');
  var mi = String(d.getMinutes()).padStart(2, '0');
  return mm + '-' + dd + ' ' + hh + ':' + mi;
}

Page({
  data: {
    docs: [],
    filteredDocs: [],
    searchKey: '',
    sortBy: 'updatedAt_desc',
    viewMode: 'list',
    showSortMenu: false
  },

  onShow: function () { this._loadDocs(); },

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

  createDoc: function () {
    var now = Date.now();
    var doc = { id: 'doc_' + now, title: '未命名文档', content: '', createdAt: now, updatedAt: now };
    var list = this._getList();
    list.unshift(doc);
    wx.setStorageSync(STORAGE_KEY, list);
    wx.navigateTo({ url: '/word/pages/editor/editor?id=' + doc.id });
  },

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
              var clean = raw.replace(/[
\s]/g, '');
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
        var run = runs[ri];
        var m = run.match(/<w:t[^>]*>([\s\S]*)/);
        if (m) text += m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      }
      text = text.trim();
      if (!text) continue;
      var openTag = isH ? '<h' + (style === 'Heading1' ? 1 : style === 'Heading2' ? 2 : style === 'Heading3' ? 3 : 1) + '>' : isList ? '<li>' : '<p>';
      var closeTag = openTag.replace('<', '</');
      if (align === 'center' || align === 'right') {
        openTag = openTag.replace('>', ' style="text-align:' + align + '">');
      }
      html += openTag + text + closeTag;
    }
    return html || '<p></p>';
  },

  openDoc: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/word/pages/editor/editor?id=' + id });
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

  exportDoc: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/word/pages/editor/editor?id=' + id + '&export=1' });
  },

  _getList: function () {
    var raw = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(raw) ? raw : [];
  }
});
  // 以下方法从 editor.js 复制，用于纯前端导入 docx
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
  }
