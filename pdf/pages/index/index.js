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

  doConvert: function() {
    if (!this.data.filePath) {
      wx.showToast({ title: '请先上传文件', icon: 'none' });
      return;
    }
    var that = this;
    that.setData({ converting: true, progressText: '上传中 0%' });

    var task = wx.uploadFile({
      url: 'https://wechatbot-g6ez.onrender.com/api/pdf/convert',
      filePath: that.data.filePath,
      name: 'file',
      formData: { from: that.data.fromFormat, to: that.data.toFormat },
      success: function(res) {
        that.setData({ progressText: '转换中...' });
        if (res.statusCode === 200) {
          var data = {};
          try { data = JSON.parse(res.data); } catch(e) {}
          if (data.url) {
            that.setData({ progressText: '下载中...' });
            wx.downloadFile({
              url: data.url,
              success: function(dl) {
                that.setData({ converting: false, progressText: '' });
                wx.openDocument({
                  filePath: dl.tempFilePath,
                  fileType: that.data.toFormat,
                  showMenu: true,
                  success: function() { wx.showToast({ title: '转换成功', icon: 'success' }); }
                });
              },
              fail: function() {
                that.setData({ converting: false, progressText: '' });
                wx.showToast({ title: '下载失败', icon: 'none' });
              }
            });
          } else {
            that.setData({ converting: false, progressText: '' });
            wx.showToast({ title: data.error || data.detail || '转换失败', icon: 'none' });
          }
        } else {
          that.setData({ converting: false, progressText: '' });
          wx.showToast({ title: '服务器错误(' + res.statusCode + ')，请重试', icon: 'none' });
        }
      },
      fail: function(err) {
        that.setData({ converting: false, progressText: '' });
        var msg = err.errMsg || '';
        if (msg.indexOf('timeout') !== -1) {
          wx.showModal({
            title: '转换超时',
            content: '免费服务器首次启动较慢(30-60秒)，请点击重试',
            showCancel: false,
            success: function() { that.doConvert(); }
          });
        } else {
          wx.showToast({ title: '上传失败，请重试', icon: 'none' });
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
