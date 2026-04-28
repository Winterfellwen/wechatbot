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
    docs: []
  },

  onShow: function () {
    this._loadDocs();
  },

  _loadDocs: function () {
    var raw = wx.getStorageSync(STORAGE_KEY);
    if (!raw || !Array.isArray(raw)) {
      this.setData({ docs: [] });
      return;
    }
    var list = raw.map(function (d) {
      d.timeStr = formatTime(d.updatedAt || d.createdAt);
      return d;
    }).sort(function (a, b) { return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt); });
    this.setData({ docs: list });
  },

  createDoc: function () {
    var now = Date.now();
    var doc = {
      id: 'doc_' + now,
      title: '未命名文档',
      content: '',
      createdAt: now,
      updatedAt: now
    };
    var list = this._getList();
    list.unshift(doc);
    wx.setStorageSync(STORAGE_KEY, list);
    wx.navigateTo({ url: '/word/pages/editor/editor?id=' + doc.id });
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