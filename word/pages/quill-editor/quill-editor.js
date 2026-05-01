var STORAGE_KEY = 'word_docs';
var SERVER_URL = 'https://wechatbot-g6ez.onrender.com';

Page({
  data: {
    url: ''
  },

  onLoad: function (options) {
    var that = this;
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

    // Upload content to server, get short temp ID
    wx.request({
      url: SERVER_URL + '/api/word/temp',
      method: 'POST',
      data: { title: title, html: html },
      success: function (res) {
        if (res.data && res.data.id) {
          that.setData({ url: SERVER_URL + '/word/editor?id=' + res.data.id });
        } else {
          wx.showToast({ title: '服务器错误', icon: 'none' });
        }
      },
      fail: function () {
        wx.showToast({ title: '连接服务器失败', icon: 'none' });
      }
    });
  },

  onMessage: function (e) {
    var data = e.detail.data;
    if (!data || !Array.isArray(data) || data.length === 0) return;
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

    // Clean up temp data on server
    if (last.tempId) {
      wx.request({
        url: SERVER_URL + '/api/word/temp/' + last.tempId,
        method: 'DELETE'
      });
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
