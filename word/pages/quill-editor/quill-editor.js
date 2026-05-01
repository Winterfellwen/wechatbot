var STORAGE_KEY = 'word_docs';
var SERVER_URL = 'https://wechatbot-g6ez.onrender.com/word/editor';

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

    // Encode content as base64 JSON in URL hash
    var payload = JSON.stringify({ title: title, html: html });
    var hash = btoa(unescape(encodeURIComponent(payload)));
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
