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
    that.setData({ converting: true, resultUrl: '' });

    wx.uploadFile({
      url: 'https://wechatbot-g6ez.onrender.com/api/pdf/convert',
      filePath: that.data.filePath,
      name: 'file',
      formData: {
        from: that.data.fromFormat,
        to: that.data.toFormat
      },
      success: function(res) {
        var resultPath = wx.env.USER_DATA_PATH + '/converted.' + that.data.toFormat;
        var fs = wx.getFileSystemManager();
        
        // The response is binary file data
        try {
          fs.writeFileSync(resultPath, res.data, 'utf8');
          that.setData({ converting: false });
          wx.showModal({
            title: '转换成功',
            content: '文件已保存，是否打开？',
            success: function(modalRes) {
              if (modalRes.confirm) {
                wx.openDocument({
                  filePath: resultPath,
                  fileType: that.data.toFormat,
                  showMenu: true
                });
              }
            }
          });
        } catch(e) {
          // Try arraybuffer
          if (res.data instanceof ArrayBuffer) {
            fs.writeFileSync(resultPath, res.data, 'binary');
          }
          that.setData({ converting: false });
          wx.showToast({ title: '转换成功', icon: 'success' });
          wx.openDocument({
            filePath: resultPath,
            fileType: that.data.toFormat,
            showMenu: true
          });
        }
      },
      fail: function(err) {
        that.setData({ converting: false });
        wx.showToast({ title: '转换失败: ' + (err.errMsg || '网络错误'), icon: 'none' });
      }
    });
  },

  goBack: function() { wx.navigateBack(); }
});
