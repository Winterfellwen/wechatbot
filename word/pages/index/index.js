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
  data: { docs: [] },

  onShow: function () { this._loadDocs(); },

  _loadDocs: function () {
    var raw = wx.getStorageSync(STORAGE_KEY);
    if (!raw || !Array.isArray(raw)) { this.setData({ docs: [] }); return; }
    var list = raw.map(function (d) {
      d.timeStr = formatTime(d.updatedAt || d.createdAt);
      return d;
    }).sort(function (a, b) { return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt); });
    this.setData({ docs: list });
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
        that._parseDocx(file.path, name);
      },
      fail: function () {
        // 用户取消
      }
    });
  },

  _parseDocx: function (filePath, suggestedName) {
    var that = this;
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'binary',
      success: function (res) {
        var data = that._base64ToBytes(that._strToBase64(res.data));
        var zip = that._unzipDocx(data);
        if (!zip['word/document.xml']) {
          wx.hideLoading();
          wx.showToast({ title: '文件格式无效', icon: 'none' });
          return;
        }
        var xmlText = that._bytesToStr(zip['word/document.xml']);
        var html = that._parseDocumentXml(xmlText);
        var title = suggestedName || '导入文档';
        var now = Date.now();
        var doc = { id: 'doc_' + now, title: title, content: JSON.stringify(html), createdAt: now, updatedAt: now };
        var list = that._getList();
        list.unshift(doc);
        wx.setStorageSync(STORAGE_KEY, list);
        wx.hideLoading();
        wx.showToast({ title: '导入成功', icon: 'success' });
        setTimeout(function () { that._loadDocs(); }, 800);
      },
      fail: function (err) {
        wx.hideLoading();
        wx.showToast({ title: '读取文件失败', icon: 'none' });
        console.error('readFile fail:', err);
      }
    });
  },

  _unzipDocx: function (data) {
    var files = {};
    var view = new DataView(data.buffer);
    var offset = 0;
    while (offset < data.length) {
      if (data[offset] === 0x50 && data[offset + 1] === 0x4B) {
        var sig = data[offset + 2] + (data[offset + 3] << 8);
        if (sig === 0x0403) {
          // local file header
          var nameLen = data[offset + 26] + (data[offset + 27] << 8);
          var extraLen = data[offset + 28] + (data[offset + 29] << 8);
          var compressedSize = data[offset + 18] + (data[offset + 19] << 8) + (data[offset + 20] << 16) + (data[offset + 21] << 24);
          var compMethod = data[offset + 8] + (data[offset + 9] << 8);
          var nameBytes = data.slice(offset + 30, offset + 30 + nameLen);
          var name = '';
          for (var ni = 0; ni < nameBytes.length; ni++) name += String.fromCharCode(nameBytes[ni]);
          var fileData = data.slice(offset + 30 + nameLen + extraLen, offset + 30 + nameLen + extraLen + compressedSize);
          var content = compMethod === 0 ? fileData : that._inflateRaw(fileData);
          files[name] = content;
          offset += 30 + nameLen + extraLen + compressedSize;
        } else if (sig === 0x0201 || sig === 0x0505) {
          // central directory or eocd — stop
          break;
        } else {
          offset++;
        }
      } else {
        offset++;
      }
    }
    return files;
  },

  _inflateRaw: function (data) {
    // Minimal inflate: handle stored blocks only (no compression)
    var result = [];
    var pos = 0;
    var off = 0;
    while (pos < data.length) {
      var isLast = data[pos] & 1;
      var compMethod = data[pos] >> 1 & 3;
      var blockSize = data[pos + 1] + (data[pos + 2] << 8);
      if (compMethod !== 0) {
        // 只能用 stored 块，复杂的用拼接数据代替
        pos += 3 + blockSize;
        if (isLast) break;
        continue;
      }
      for (var i = 0; i < blockSize; i++) result.push(data[pos + 3 + i]);
      pos += 3 + blockSize;
      if (isLast) break;
    }
    return new Uint8Array(result);
  },

  _bytesToStr: function (bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return decodeURIComponent(escape(s));
  },

  _strToBase64: function (str) {
    var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var result = '';
    var i;
    for (i = 0; i < (str.length / 3) * 3 - (str.length % 3 === 1 ? 2 : 1); ) {
      var a = str.charCodeAt(i++), b = str.charCodeAt(i++), c = str.charCodeAt(i++);
      result += b64[a >> 2] + b64[((a & 3) << 4) | (b >> 4)] + b64[((b & 15) << 2) | (c >> 6)] + b64[c & 63];
    }
    var rem = str.length % 3;
    if (rem === 1) {
      var a = str.charCodeAt(i);
      result += b64[a >> 2] + b64[(a & 3) << 4] + '==';
    } else if (rem === 2) {
      var a = str.charCodeAt(i++), b = str.charCodeAt(i);
      result += b64[a >> 2] + b64[((a & 3) << 4) | (b >> 4)] + b64[(b & 15) << 2] + '=';
    }
    return result;
  },

  _base64ToBytes: function (b64Str) {
    var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var result = [];
    var i = 0;
    while (i < b64Str.length && b64Str[i] !== '=') {
      var a = b64.indexOf(b64Str[i++]);
      var b = b64.indexOf(b64Str[i++]);
      var c = b64.indexOf(b64Str[i++]);
      var d = b64.indexOf(b64Str[i++]);
      result.push((a << 2) | (b >> 4));
      if (b64Str[i - 1] !== '=') result.push(((b & 15) << 4) | (c >> 2));
      if (b64Str[i - 2] !== '=') result.push(((c & 3) << 6) | d);
    }
    return new Uint8Array(result);
  },

  _parseDocumentXml: function (xmlText) {
    var html = '';
    var paraMatches = xmlText.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
    for (var pi = 0; pi < paraMatches.length; pi++) {
      var pXml = paraMatches[pi];
      // 检测是否为标题
      var styleMatch = pXml.match(/<w:pStyle w:val="([^"]+)"/);
      var style = styleMatch ? styleMatch[1] : '';
      var isH = /^Heading/.test(style) || /^h[1-6]$/i.test(style);
      // 检测对齐
      var alignMatch = pXml.match(/<w:jc w:val="([^"]+)"/);
      var align = alignMatch ? alignMatch[1] : '';
      // 检测列表
      var isList = /<w:numPr/.test(pXml);
      // 提取文字
      var text = '';
      var runs = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      for (var ri = 0; ri < runs.length; ri++) {
        var run = runs[ri];
        var m = run.match(/<w:t[^>]*>([\s\S]*)/);
        if (m) text += m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      }
      text = text.trim();
      if (!text) continue;
      var openTag = '';
      if (isH) {
        var level = style === 'Heading1' ? 1 : style === 'Heading2' ? 2 : style === 'Heading3' ? 3 : 1;
        openTag = '<h' + level + '>';
      } else if (isList) {
        openTag = '<li>';
      } else {
        openTag = '<p>';
      }
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