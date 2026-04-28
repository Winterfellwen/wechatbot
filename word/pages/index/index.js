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
        wx.uploadFile({
          url: 'https://wechatbot-g6ez.onrender.com/api/word/import',
          filePath: file.path,
          name: 'file',
          success: function (uploadRes) {
            wx.hideLoading();
            if (uploadRes.statusCode === 200) {
              var data = {};
              try { data = JSON.parse(uploadRes.data); } catch(e) {}
              if (data.xml) {
                var html = that._parseDocXml(data.xml);
                var now = Date.now();
                var doc = { id: 'doc_' + now, title: name, content: JSON.stringify(html), createdAt: now, updatedAt: now };
                var list = that._getList();
                list.unshift(doc);
                wx.setStorageSync(STORAGE_KEY, list);
                wx.showToast({ title: '导入成功', icon: 'success' });
                setTimeout(function () { that._loadDocs(); }, 800);
              } else if (data.error) {
                wx.showToast({ title: data.error, icon: 'none' });
              } else {
                wx.showToast({ title: '解析失败', icon: 'none' });
              }
            } else {
              var errData = {};
              try { errData = JSON.parse(uploadRes.data || '{}'); } catch(e) {}
              wx.showToast({ title: errData.error || '上传失败(' + uploadRes.statusCode + ')', icon: 'none' });
            }
          },
          fail: function (err) {
            wx.hideLoading();
            wx.showToast({ title: '网络错误', icon: 'none' });
            console.error('upload fail:', err);
          }
        });
      },
      fail: function () {
        // 用户取消
      }
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