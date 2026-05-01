var STORAGE_KEY = 'word_docs';
var SERVER_URL = 'https://wechatbot-g6ez.onrender.com/word/editor';

var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function base64Encode(str) {
  var bytes = [];
  var utf8 = unescape(encodeURIComponent(str));
  for (var i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i));
  var result = '';
  var i;
  for (i = 0; i < bytes.length - 2; i += 3) {
    var a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    result += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)] + B64[((b & 15) << 2) | (c >> 6)] + B64[c & 63];
  }
  var rem = bytes.length - i;
  if (rem === 1) result += B64[bytes[i] >> 2] + B64[(bytes[i] & 3) << 4] + '==';
  else if (rem === 2) result += B64[bytes[i] >> 2] + B64[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)] + B64[(bytes[i + 1] & 15) << 2] + '=';
  return result;
}

Page({
  data: {
    url: ''
  },

  onLoad: function (options) {
    var docId = options.id || '';
    var doc = this._findDoc(docId);
    var html = '';
    var title = '未命名文档';
    if (doc) {
      title = doc.title || '未命名文档';
      try {
        var parsed = JSON.parse(doc.content);
        html = typeof parsed === 'string' ? parsed : (doc.content || '');
      } catch (e) {
        html = doc.content || '';
      }
    }

    this._docId = docId;

    // Encode content as URL-safe base64 JSON in URL hash
    var payload = JSON.stringify({ title: title, html: html });
    var hash = base64Encode(payload);
    this.setData({ url: SERVER_URL + '#' + hash });
  },

  onMessage: function (e) {
    var data = e.detail.data;
    if (!data || !Array.isArray(data) || data.length === 0) return;
    // postMessage sends array of data objects; take the last one
    var last = data[data.length - 1];
    if (!last.html) return;

    var docId = this._docId;
    var now = Date.now();
    var list = this._getList();
    var idx = list.findIndex(function (d) { return d.id === docId; });
    if (idx >= 0) {
      list[idx].title = last.title || '未命名文档';
      list[idx].content = JSON.stringify(last.html);
      list[idx].updatedAt = now;
      wx.setStorageSync(STORAGE_KEY, list);
    }
  },

  _getList: function () {
    var raw = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(raw) ? raw : [];
  },

  _findDoc: function (id) {
    var list = this._getList();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }
});
