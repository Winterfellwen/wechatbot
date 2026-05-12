// word/pages/index/index.js
var STORAGE_KEY = 'word_docs';
var docxLib = require('../../utils/docx');

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
              var clean = raw.replace(/[\s]/g, '');
              buf = wx.base64ToArrayBuffer(clean);
            } else {
              buf = raw;
            }
            var files = that._unzip(buf);
            var docXml = files['word/document.xml'];
            if (!docXml) {
              wx.showModal({ title: '导入失败', content: 'ZIP中未找到 word/document.xml。包含的文件: ' + Object.keys(files).join(', '), showCancel: false });
              return;
            }
            var xmlStr = that._bytesToStr(docXml);
            if (!xmlStr || xmlStr.length < 50) {
              wx.showModal({ title: 'XML为空', content: 'document.xml 长度: ' + (xmlStr ? xmlStr.length : 0) + '，前100字符: ' + (xmlStr ? xmlStr.substring(0, 100) : 'null'), showCancel: false });
              return;
            }
            var html = that._parseDocXml(xmlStr);
            if (!html || html === '<p></p>' || html.length < 10) {
              wx.showModal({ title: '解析为空', content: 'html长度: ' + html.length + '，xml前300字符: ' + xmlStr.substring(0, 300), showCancel: false });
              return;
            }
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
    var that = this;
    var id = e.currentTarget.dataset.id;
    var doc = this._findDoc(id);
    if (!doc) { wx.showToast({ title: '文档不存在', icon: 'none' }); return; }
    var html = '';
    try {
      var parsed = JSON.parse(doc.content);
      html = typeof parsed === 'string' ? parsed : doc.content || '';
    } catch (ex) { html = doc.content || ''; }
    if (!html) { wx.showToast({ title: '文档内容为空', icon: 'none' }); return; }
    wx.showLoading({ title: '生成中...' });
    var docxBase64 = docxLib.htmlToDocx(html);
    var fileName = (doc.title || '未命名文档') + '.docx';
    var filePath = wx.env.USER_DATA_PATH + '/' + fileName;
    var buffer = wx.base64ToArrayBuffer(docxBase64);
    wx.getFileSystemManager().writeFile({
      filePath: filePath,
      data: buffer,
      encoding: 'binary',
      success: function () {
        wx.hideLoading();
        wx.openDocument({
          filePath: filePath,
          fileType: 'docx',
          showMenu: true,
          success: function () { wx.showToast({ title: '已保存', icon: 'success' }); },
          fail: function () { wx.showToast({ title: '打开失败', icon: 'none' }); }
        });
      },
      fail: function (err) {
        wx.hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
        console.error('writeFile fail:', err);
      }
    });
  },

  _getList: function () {
    var raw = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(raw) ? raw : [];
  },

  _findDoc: function (id) {
    var list = this._getList();
    return list.find(function (d) { return d.id === id; }) || null;
  },
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
          var pako = require('../editor/pako.es5');
          if (cm === 0) {
            files[name] = compressed;
          } else {
            // 先尝试 zlib 格式（带 header），失败再尝试 raw deflate
            try { files[name] = pako.inflate(compressed); }
            catch (e1) {
              try { files[name] = pako.inflate(compressed, { raw: true }); }
              catch (e2) { files[name] = compressed; }
            }
          }
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
    var s = '', i = 0;
    while (i < bytes.length) {
      var c = bytes[i++];
      if (c < 128) {
        s += String.fromCharCode(c);
      } else if (c >= 192 && c < 224) {
        var c2 = bytes[i++];
        s += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      } else if (c >= 224 && c < 240) {
        var c2 = bytes[i++], c3 = bytes[i++];
        s += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      } else if (c >= 240) {
        var c2 = bytes[i++], c3 = bytes[i++], c4 = bytes[i++];
        var cp = ((c & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63);
        s += String.fromCharCode(0xD800 + ((cp - 0x10000) >> 10), 0xDC00 + ((cp - 0x10000) & 0x3FF));
      }
    }
    return s;
  }
});
