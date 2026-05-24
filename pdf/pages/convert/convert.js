var loginLib = require('../../../utils/login');

Page({
  data: {
    fileName: '',
    filePath: '',
    fromFormat: '',
    toFormat: '',
    converting: false,
    targetOptions: []
  },

  onLoad: function(options) {
    if (options.file) {
      var name = decodeURIComponent(options.file);
      var ext = name.split('.').pop().toLowerCase();
      var fromFmt = '';
      if (ext === 'pdf') fromFmt = 'pdf';
      else if (ext === 'docx') fromFmt = 'docx';
      else if (ext === 'doc') fromFmt = 'doc';
      
      var targets = this.getTargets(fromFmt);
      
      this.setData({
        fileName: name,
        filePath: decodeURIComponent(options.path || ''),
        fromFormat: fromFmt,
        toFormat: targets.length > 0 ? targets[0].value : '',
        targetOptions: targets
      });
    }
  },

  getTargets: function(from) {
    if (from === 'pdf') {
      return [
        { label: 'DOCX (Word文档)', value: 'docx' },
        { label: 'DOC (旧版Word)', value: 'doc' }
      ];
    } else if (from === 'docx') {
      return [
        { label: 'PDF', value: 'pdf' },
        { label: 'DOC (旧版Word)', value: 'doc' }
      ];
    } else if (from === 'doc') {
      return [
        { label: 'PDF', value: 'pdf' },
        { label: 'DOCX (Word文档)', value: 'docx' }
      ];
    }
    return [];
  },

  selectTarget: function(e) {
    this.setData({ toFormat: e.currentTarget.dataset.value });
  },

  doConvert: function() {
    if (!this.data.filePath) {
      wx.showToast({ title: '请先上传文件', icon: 'none' });
      return;
    }
    if (!this.data.toFormat) {
      wx.showToast({ title: '请选择目标格式', icon: 'none' });
      return;
    }
    var that = this;
    that.setData({ converting: true });

    var cloudPath = 'pdf/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + that.data.fromFormat;
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: that.data.filePath,
      success: function (uploadRes) {
        loginLib.callCloud('file', {
          action: 'convert',
          fileID: uploadRes.fileID,
          from: that.data.fromFormat,
          to: that.data.toFormat
        })
          .then(function (data) {
            if (data && data.url) {
              that.downloadAndOpen(data.url);
            } else if (data && data.fileID) {
              wx.cloud.downloadFile({
                fileID: data.fileID,
                success: function (dlRes) {
                  that.setData({ converting: false });
                  wx.openDocument({
                    filePath: dlRes.tempFilePath,
                    fileType: that.data.toFormat,
                    showMenu: true,
                    success: function () { wx.showToast({ title: '转换成功', icon: 'success' }); }
                  });
                },
                fail: function () {
                  that.setData({ converting: false });
                  wx.showToast({ title: '下载失败', icon: 'none' });
                }
              });
            } else {
              that.setData({ converting: false });
              wx.showToast({ title: data.error || '转换失败', icon: 'none' });
            }
          })
          .catch(function (err) {
            that.setData({ converting: false });
            wx.showToast({ title: err.error || '转换失败', icon: 'none' });
          });
      },
      fail: function () {
        that.setData({ converting: false });
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },

  downloadAndOpen: function(url) {
    var that = this;
    wx.downloadFile({
      url: url,
      success: function(res) {
        that.setData({ converting: false });
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: that.data.toFormat,
          showMenu: true,
          success: function() {
            wx.showToast({ title: '转换成功', icon: 'success' });
          }
        });
      },
      fail: function() {
        that.setData({ converting: false });
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  },

  goBack: function() { wx.navigateBack(); }
});
