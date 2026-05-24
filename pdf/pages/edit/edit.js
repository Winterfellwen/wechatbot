var loginLib = require('../../../utils/login');

Page({
  data: {
    file1Name: '',
    file1Path: '',
    file2Name: '',
    file2Path: '',
    processing: false,
    progressText: '',
    resultUrl: ''
  },

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

  uploadFile1: function() {
    var that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf'],
      success: function(res) {
        var file = res.tempFiles[0];
        that.setData({ file1Name: file.name, file1Path: file.path });
      }
    });
  },

  uploadFile2: function() {
    var that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf'],
      success: function(res) {
        var file = res.tempFiles[0];
        that.setData({ file2Name: file.name, file2Path: file.path });
      }
    });
  },

  clearFile1: function() {
    this.setData({ file1Name: '', file1Path: '' });
  },

  clearFile2: function() {
    this.setData({ file2Name: '', file2Path: '' });
  },

  swapFiles: function() {
    var f1Name = this.data.file1Name;
    var f1Path = this.data.file1Path;
    var f2Name = this.data.file2Name;
    var f2Path = this.data.file2Path;
    this.setData({
      file1Name: f2Name, file1Path: f2Path,
      file2Name: f1Name, file2Path: f1Path
    });
  },

  doMerge: function() {
    if (!this.data.file1Path) { wx.showToast({ title: '请先选择第一个 PDF 文件', icon: 'none' }); return; }
    if (!this.data.file2Path) { wx.showToast({ title: '请先选择第二个 PDF 文件', icon: 'none' }); return; }
    if (this.data.processing) { wx.showToast({ title: '正在合并中，请耐心等待', icon: 'none' }); return; }

    var that = this;
    that.setData({ processing: true, progressText: '上传中...' });

    var cp1 = 'pdf/' + Date.now() + '-1.pdf';
    var cp2 = 'pdf/' + Date.now() + '-2.pdf';

    var p1 = new Promise(function (resolve, reject) {
      wx.cloud.uploadFile({ cloudPath: cp1, filePath: that.data.file1Path, success: function (r) { resolve(r.fileID); }, fail: reject });
    });
    var p2 = new Promise(function (resolve, reject) {
      wx.cloud.uploadFile({ cloudPath: cp2, filePath: that.data.file2Path, success: function (r) { resolve(r.fileID); }, fail: reject });
    });

    Promise.all([p1, p2])
      .then(function (fileIDs) {
        that.setData({ progressText: '合并中...' });
        return loginLib.callCloud('file', {
          action: 'convert',
          operation: 'merge',
          fileID1: fileIDs[0],
          fileID2: fileIDs[1]
        });
      })
      .then(function (data) {
        that.setData({ processing: false, progressText: '' });
        if (data && data.url) {
          that.setData({ resultUrl: data.url });
          that._saveTaskRecord({
            jobId: 'merge_' + Date.now(),
            type: 'edit',
            fileName: that.data.file1Name + ' + ' + that.data.file2Name,
            operation: 'merge',
            status: 'done',
            createdAt: Date.now(),
            completedAt: Date.now(),
            duration: 0,
            resultUrl: data.url,
            downloaded: false,
            localPath: ''
          });
          wx.showToast({ title: '合并完成', icon: 'success' });
        } else if (data && data.fileID) {
          wx.cloud.downloadFile({
            fileID: data.fileID,
            success: function (dlRes) {
              that.setData({ resultUrl: dlRes.tempFilePath });
              wx.showToast({ title: '合并完成', icon: 'success' });
            },
            fail: function () { wx.showToast({ title: '下载失败', icon: 'none' }); }
          });
        } else {
          wx.showToast({ title: data ? data.error : '合并失败', icon: 'none' });
        }
      })
      .catch(function (err) {
        that.setData({ processing: false, progressText: '' });
        wx.showToast({ title: err && err.error ? err.error : '合并失败，请重试', icon: 'none' });
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
