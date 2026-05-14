var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;

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

    wx.uploadFile({
      url: SERVER + '/api/pdf/convert',
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
          that.downloadAndOpen(data.url);
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
