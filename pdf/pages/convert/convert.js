Page({
  data: {
    fileName: '',
    filePath: '',
    fromFormat: 'pdf',
    toFormat: 'docx',
    converting: false,
    resultUrl: ''
  },

  onLoad: function(options) {
    if (options.file) this.setData({ fileName: decodeURIComponent(options.file), filePath: decodeURIComponent(options.path || '') });
  },

  switchFrom: function(e) { this.setData({ fromFormat: e.currentTarget.dataset.f, resultUrl: '' }); },
  switchTo: function(e) { this.setData({ toFormat: e.currentTarget.dataset.f, resultUrl: '' }); },

  doConvert: function() {
    if (!this.data.filePath) {
      wx.showToast({ title: '请先上传文件', icon: 'none' });
      return;
    }
    var that = this;
    that.setData({ converting: true });

    wx.uploadFile({
      url: 'https://wechatbot-g6ez.onrender.com/api/pdf/convert',
      filePath: that.data.filePath,
      name: 'file',
      formData: {
        from: that.data.fromFormat,
        to: that.data.toFormat
      },
      success: function(res) {
        var data = {};
        try { data = JSON.parse(res.data); } catch(e) {}
        if (data.url) {
          that.setData({ resultUrl: data.url, converting: false });
          wx.showToast({ title: '转换成功', icon: 'success' });
        } else {
          that.setData({ converting: false });
          wx.showToast({ title: data.error || '转换失败', icon: 'none' });
        }
      },
      fail: function() {
        that.setData({ converting: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  downloadResult: function() {
    if (!this.data.resultUrl) return;
    wx.downloadFile({
      url: this.data.resultUrl,
      success: function(res) {
        var ext = '.' + this.data.toFormat;
        wx.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          fileType: this.data.toFormat
        });
      },
      fail: function() {
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  },

  goBack: function() { wx.navigateBack(); }
});
