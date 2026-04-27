Page({
  data: {
    fileName: '',
    filePath: '',
    operation: '',
    processing: false,
    resultUrl: '',
    textContent: '',
    rotateAngle: 90
  },

  onLoad: function(options) {
    if (options.file) {
      this.setData({
        fileName: decodeURIComponent(options.file),
        filePath: decodeURIComponent(options.path || '')
      });
    }
  },

  selectOp: function(e) {
    this.setData({ operation: e.currentTarget.dataset.op, resultUrl: '' });
  },

  onTextInput: function(e) { this.setData({ textContent: e.detail.value }); },

  doOperation: function() {
    if (!this.data.filePath) { wx.showToast({ title: '请先上传文件', icon: 'none' }); return; }
    if (!this.data.operation) { wx.showToast({ title: '请选择操作', icon: 'none' }); return; }

    var that = this;
    that.setData({ processing: true });

    wx.uploadFile({
      url: 'https://wechatbot-g6ez.onrender.com/api/pdf/edit',
      filePath: that.data.filePath,
      name: 'file',
      formData: {
        op: that.data.operation,
        text: that.data.textContent,
        angle: String(that.data.rotateAngle)
      },
      success: function(res) {
        var data = {};
        try { data = JSON.parse(res.data); } catch(e) {}
        if (data.url) {
          that.setData({ resultUrl: data.url, processing: false });
          wx.showToast({ title: '处理成功', icon: 'success' });
        } else {
          that.setData({ processing: false });
          wx.showToast({ title: data.error || '处理失败', icon: 'none' });
        }
      },
      fail: function() {
        that.setData({ processing: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  downloadResult: function() {
    if (!this.data.resultUrl) return;
    wx.downloadFile({
      url: this.data.resultUrl,
      success: function(res) {
        wx.openDocument({ filePath: res.tempFilePath, showMenu: true, fileType: 'pdf' });
      }
    });
  },

  goBack: function() { wx.navigateBack(); }
});
