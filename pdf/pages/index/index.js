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
    that.setData({ converting: true });

    wx.uploadFile({
      url: 'https://wechatbot-g6ez.onrender.com/api/pdf/convert',
      filePath: that.data.filePath,
      name: 'file',
      formData: { from: that.data.fromFormat, to: that.data.toFormat },
      success: function(res) {
        var data = {};
        try { data = JSON.parse(res.data); } catch(e) {}
        if (data.url) {
          wx.downloadFile({
            url: data.url,
            success: function(dl) {
              that.setData({ converting: false });
              wx.openDocument({
                filePath: dl.tempFilePath,
                fileType: that.data.toFormat,
                showMenu: true,
                success: function() { wx.showToast({ title: '转换成功', icon: 'success' }); }
              });
            },
            fail: function() {
              that.setData({ converting: false });
              wx.showToast({ title: '下载失败', icon: 'none' });
            }
          });
        } else {
          that.setData({ converting: false });
          wx.showToast({ title: data.error || data.detail || '转换失败', icon: 'none' });
        }
      },
      fail: function() {
        that.setData({ converting: false });
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },

  clearFile: function() {
    this.setData({ fileName: '', filePath: '', fromFormat: '', toFormat: '', targetOptions: [] });
  }
});
