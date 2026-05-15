var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;

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
    if (this.data.processing) {
      this.setData({ processing: false, progressText: '' });
    }
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
    if (!this.data.file1Path) { wx.showToast({ title: '请选择第一个文件', icon: 'none' }); return; }
    if (!this.data.file2Path) { wx.showToast({ title: '请选择第二个文件', icon: 'none' }); return; }
    if (this.data.processing) { wx.showToast({ title: '正在处理中', icon: 'none' }); return; }

    var that = this;
    that.setData({ processing: true, progressText: '上传中...' });

    // Step 1: Upload second file first (to get merge_id)
    wx.uploadFile({
      url: SERVER + '/api/pdf/edit/merge2',
      filePath: that.data.file2Path,
      name: 'file2',
      timeout: 60000,
      success: function(res2) {
        var data2 = {};
        try { data2 = JSON.parse(res2.data); } catch(e) {}
        if (!data2.merge_id) {
          that.setData({ processing: false, progressText: '' });
          wx.showToast({ title: data2.error || '第二个文件上传失败', icon: 'none' });
          return;
        }
        var mergeId = data2.merge_id;
        that.setData({ progressText: '合并中...' });

        // Step 2: Upload first file and trigger merge
        wx.uploadFile({
          url: SERVER + '/api/pdf/edit/merge',
          filePath: that.data.file1Path,
          name: 'file',
          formData: { merge_id: mergeId },
          timeout: 120000,
          success: function(res) {
            that.setData({ processing: false, progressText: '' });
            var data = {};
            try { data = JSON.parse(res.data); } catch(e) {}
            if (data.url) {
              that.setData({ resultUrl: data.url });
              // 保存任务记录
              that._saveTaskRecord({
                jobId: 'merge_' + Date.now(),
                type: 'edit',
                fileName: that.data.file1Name + ' + ' + that.data.file2Name,
                operation: 'merge',
                status: 'done',
                createdAt: Date.now(),
                completedAt: Date.now(),
                duration: 0,
                resultUrl: data.url.replace(SERVER, ''),
                downloaded: false,
                localPath: ''
              });
              wx.showToast({ title: '合并成功', icon: 'success' });
            } else {
              wx.showToast({ title: data.error || '合并失败', icon: 'none' });
            }
          },
          fail: function() {
            that.setData({ processing: false, progressText: '' });
            wx.showToast({ title: '网络错误', icon: 'none' });
          }
        });
      },
      fail: function() {
        that.setData({ processing: false, progressText: '' });
        wx.showToast({ title: '第二个文件上传失败', icon: 'none' });
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
