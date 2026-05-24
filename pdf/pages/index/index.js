var retry = require('../../../utils/retry');
var loginLib = require('../../../utils/login');

Page({
  data: {
    fileName: '',
    filePath: '',
    fromFormat: '',
    toFormat: '',
    uploading: false,
    activeTab: 'convert',
    targetOptions: [],
    // 编辑功能状态
    editOp: '',
    textContent: '',
    rotateAngle: 90,
    editUploading: false,
    editResultUrl: ''
  },

  onLoad: function() {},

  onUnload: function() {
    // 页面卸载时不做任何操作，避免 webviewId 错误
  },

  _saveTaskRecord: function(record) {
    var records = wx.getStorageSync('pdf_task_records') || [];
    for (var i = 0; i < records.length; i++) {
      if (records[i].jobId === record.jobId) {
        records[i] = Object.assign({}, records[i], record);
        wx.setStorageSync('pdf_task_records', records);
        return;
      }
    }
    records.unshift(record);
    if (records.length > 50) records = records.slice(0, 50);
    wx.setStorageSync('pdf_task_records', records);
  },

  // === 转换功能 ===
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
          targets = [{ label: '转为 Word (DOCX)', value: 'docx' }];
        } else if (fromFmt === 'docx') {
          targets = [{ label: '转为 PDF', value: 'pdf' }];
        } else {
          targets = [{ label: '转为 PDF', value: 'pdf' }, { label: '转为 Word (DOCX)', value: 'docx' }];
        }

        that.setData({
          fileName: name, filePath: file.path, fromFormat: fromFmt,
          toFormat: targets[0].value, targetOptions: targets
        });
      }
    });
  },

  selectTarget: function(e) {
    this.setData({ toFormat: e.currentTarget.dataset.value });
  },

  doConvert: function() {
    if (!this.data.filePath) {
      wx.showToast({ title: '请先选择要处理的文件', icon: 'none' });
      return;
    }
    if (this.data.uploading) {
      wx.showToast({ title: '文件正在上传中，请耐心等待', icon: 'none' });
      return;
    }
    var that = this;
    that.setData({ uploading: true });

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
            that._saveTaskRecord({
              jobId: data.job_id || ('convert_' + Date.now()),
              type: 'convert',
              fileName: that.data.fileName,
              from: that.data.fromFormat,
              to: that.data.toFormat,
              status: 'queued',
              createdAt: Date.now(),
              resultUrl: data.url || (data.fileID || '')
            });
            that.setData({
              fileName: '', filePath: '', fromFormat: '', toFormat: '',
              targetOptions: [], uploading: false
            });
            wx.showToast({ title: '文件已提交，处理完成后将自动通知您，也可在记录中查看下载', icon: 'none', duration: 3000 });
          })
          .catch(function (err) {
            that.setData({ uploading: false });
            wx.showToast({ title: err.error || '提交失败', icon: 'none' });
          });
      },
      fail: function () {
        that.setData({ uploading: false });
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },

  clearFile: function() {
    this.setData({ fileName: '', filePath: '', fromFormat: '', toFormat: '', targetOptions: [], uploading: false });
  },

  // === 编辑功能（水印、旋转） ===
  selectEditOp: function(e) {
    this.setData({ editOp: e.currentTarget.dataset.op, editResultUrl: '' });
  },

  onTextInput: function(e) { this.setData({ textContent: e.detail.value }); },

  doEditOp: function() {
    if (!this.data.filePath) { wx.showToast({ title: '请先选择要处理的文件', icon: 'none' }); return; }
    if (!this.data.editOp) { wx.showToast({ title: '请选择要执行的操作', icon: 'none' }); return; }
    if (this.data.editUploading) { wx.showToast({ title: '正在处理中，请耐心等待', icon: 'none' }); return; }

    var that = this;
    that.setData({ editUploading: true });

    var cloudPath = 'pdf/' + Date.now() + '-edit.pdf';
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: that.data.filePath,
      success: function (uploadRes) {
        loginLib.callCloud('file', {
          action: 'convert',
          fileID: uploadRes.fileID,
          operation: that.data.editOp,
          text: that.data.textContent || '',
          angle: String(that.data.rotateAngle)
        })
          .then(function (data) {
            that.setData({ editUploading: false });
            if (data && data.url) {
              that.setData({ editResultUrl: data.url });
              that._saveTaskRecord({
                jobId: 'edit_' + Date.now(),
                type: 'edit',
                fileName: that.data.fileName,
                operation: that.data.editOp,
                status: 'done',
                createdAt: Date.now(),
                completedAt: Date.now(),
                duration: 0,
                resultUrl: data.url,
                downloaded: false,
                localPath: ''
              });
              wx.showToast({ title: '处理完成', icon: 'success' });
            } else if (data && data.fileID) {
              wx.cloud.downloadFile({
                fileID: data.fileID,
                success: function (dlRes) {
                  that.setData({ editResultUrl: dlRes.tempFilePath });
                  wx.showToast({ title: '处理完成', icon: 'success' });
                },
                fail: function () {
                  wx.showToast({ title: '下载失败', icon: 'none' });
                }
              });
            } else {
              wx.showToast({ title: (data && data.error) || '处理失败', icon: 'none' });
            }
          })
          .catch(function (err) {
            that.setData({ editUploading: false });
            wx.showToast({ title: err.error || '处理失败', icon: 'none' });
          });
      },
      fail: function () {
        that.setData({ editUploading: false });
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },

  downloadEditResult: function() {
    if (!this.data.editResultUrl) return;
    wx.downloadFile({
      url: this.data.editResultUrl,
      success: function(res) {
        wx.openDocument({ filePath: res.tempFilePath, showMenu: true, fileType: 'pdf' });
      }
    });
  },

  // === 导航 ===
  switchTab: function(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  goMerge: function() {
    wx.navigateTo({ url: '../edit/edit' });
  },

  goRecords: function() {
    wx.navigateTo({ url: '../records/records' });
  }
});
