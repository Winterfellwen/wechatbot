Page({
  data: {
    fileName: '',
    filePath: '',
    fromFormat: '',
    toFormat: '',
    converting: false,
    targetOptions: [],
    files: []
  },

  uploadFile: function() {
    var that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'doc', 'docx'],
      success: function(res) {
        var file = res.tempFiles[0];
        var name = file.name;
        var ext = name.split('.').pop().toLowerCase();
        var fromFmt = ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : 'doc';
        var targets = [];
        if (fromFmt === 'pdf') {
          targets = [{ label: '转为 Word (DOCX)', value: 'docx' }, { label: '转为 旧版Word (DOC)', value: 'doc' }];
        } else if (fromFmt === 'docx') {
          targets = [{ label: '转为 PDF', value: 'pdf' }, { label: '转为 旧版Word (DOC)', value: 'doc' }];
        } else {
          targets = [{ label: '转为 PDF', value: 'pdf' }, { label: '转为 Word (DOCX)', value: 'docx' }];
        }

        that.setData({
          fileName: name, filePath: file.path, fromFormat: fromFmt,
          toFormat: targets[0].value, targetOptions: targets,
          files: []
        });
      }
    });
  },

  selectTarget: function(e) {
    this.setData({ toFormat: e.currentTarget.dataset.value });
  },

  doConvert: function(retryCount) {
    retryCount = retryCount || 0;
    if (!this.data.filePath) {
      wx.showToast({ title: '请先上传文件', icon: 'none' });
      return;
    }
    var that = this;
    that.setData({ converting: true, progressText: retryCount > 0 ? '重试中...' : '上传中 0%' });

    var task = wx.uploadFile({
      url: 'https://wechatbot-g6ez.onrender.com/api/pdf/convert',
      filePath: that.data.filePath,
      name: 'file',
      formData: { from: that.data.fromFormat, to: that.data.toFormat },
      success: function(res) {
        that.setData({ progressText: '处理中...' });
        if (res.statusCode === 200) {
          var data = {};
          try { data = JSON.parse(res.data); } catch(e) { data = {}; }
          if (data.url) {
            that.setData({ progressText: '下载中...' });
            wx.downloadFile({
              url: data.url,
              success: function(dl) {
                that.setData({ converting: false, progressText: '' });
                var fs = wx.getFileSystemManager();
                var savedPath = wx.env.USER_DATA_PATH + '/converted.' + that.data.toFormat;
                try { fs.saveFileSync(dl.tempFilePath, savedPath); } catch(e) { savedPath = dl.tempFilePath; }
                wx.showModal({
                  title: '转换完成',
                  content: '文件已保存。是否立即打开？',
                  confirmText: '打开',
                  cancelText: '稍后',
                  success: function(r) { if (r.confirm) wx.openDocument({ filePath: savedPath, fileType: that.data.toFormat, showMenu: true }); }
                });
              },
              fail: function(e) {
                that.setData({ converting: false, progressText: '' });
                wx.showToast({ title: '下载失败，请重试', icon: 'none' });
              }
            });
          } else {
            that.setData({ converting: false, progressText: '' });
            var err = data.error || data.detail || '转换失败';
            // Auto-retry on server timeout/error
            if (retryCount < 2 && (err.indexOf('超时') !== -1 || err.indexOf('timeout') !== -1 || (res.statusCode >= 500))) {
              wx.showToast({ title: '服务器启动中，自动重试...', icon: 'loading', duration: 2000 });
              setTimeout(function() { that.doConvert(retryCount + 1); }, 3000);
            } else {
              wx.showToast({ title: err.substring(0, 40), icon: 'none', duration: 3000 });
            }
          }
        } else {
          // Auto-retry on 503/504
          if (retryCount < 2 && res.statusCode >= 500) {
            wx.showToast({ title: '服务器启动中(' + res.statusCode + ')，自动重试...', icon: 'loading', duration: 2000 });
            setTimeout(function() { that.doConvert(retryCount + 1); }, 3000);
          } else {
            that.setData({ converting: false, progressText: '' });
            wx.showToast({ title: '失败(' + res.statusCode + ')请重试', icon: 'none' });
          }
        }
      },
      fail: function(err) {
        var msg = err.errMsg || '';
        // Auto-retry on timeout (cold start)
        if (retryCount < 2) {
          wx.showToast({ title: '服务器启动中，自动重试...', icon: 'loading', duration: 2000 });
          setTimeout(function() { that.doConvert(retryCount + 1); }, 3000);
        } else {
          that.setData({ converting: false, progressText: '' });
          wx.showToast({ title: '网络超时，请稍后重试', icon: 'none', duration: 3000 });
        }
      }
    });

    task.onProgressUpdate(function(res) {
      that.setData({ progressText: '上传中 ' + res.progress + '%' });
    });
  },

  clearFile: function() {
    this.setData({ fileName: '', filePath: '', fromFormat: '', toFormat: '', targetOptions: [] });
  }
});
