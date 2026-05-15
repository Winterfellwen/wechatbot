var retry = require('../../../utils/retry');
var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;

Page({
  data: {
    fileName: '',
    filePath: '',
    fileName2: '',
    filePath2: '',
    operation: '',
    processing: false,
    progressText: '',
    resultUrl: '',
    textContent: '',
    rotateAngle: 90,
    uploading: false,
    currentJobId: null
  },

  onLoad: function(options) {
    if (options.file) {
      this.setData({
        fileName: decodeURIComponent(options.file),
        filePath: decodeURIComponent(options.path || '')
      });
    }
  },

  onUnload: function() {
    if (this.data.uploading || this.data.processing) {
      this.setData({ uploading: false, processing: false, progressText: '' });
    }
  },

  selectOp: function(e) {
    this.setData({ operation: e.currentTarget.dataset.op, resultUrl: '' });
  },

  onTextInput: function(e) { this.setData({ textContent: e.detail.value }); },

  uploadSecondFile: function() {
    var that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf'],
      success: function(res) {
        var file = res.tempFiles[0];
        that.setData({
          fileName2: file.name,
          filePath2: file.path
        });
      }
    });
  },

  clearSecondFile: function() {
    this.setData({ fileName2: '', filePath2: '' });
  },

  doOperation: function() {
    if (!this.data.filePath) { wx.showToast({ title: '请先上传文件', icon: 'none' }); return; }
    if (!this.data.operation) { wx.showToast({ title: '请选择操作', icon: 'none' }); return; }
    if (this.data.operation === 'merge' && !this.data.filePath2) {
      wx.showToast({ title: '合并PDF需要选择第二个文件', icon: 'none' });
      return;
    }
    if (this.data.uploading) { wx.showToast({ title: '正在处理中', icon: 'none' }); return; }

    var that = this;
    that.setData({ processing: true, uploading: true, progressText: '处理中...' });

    if (that.data.operation === 'merge') {
      that._doMerge();
    } else {
      that._doSingleOp();
    }
  },

  _doSingleOp: function() {
    var that = this;
    var r = retry.createRetrier(that, { totalTimeout: 60000, maxRetries: 3 });

    r.operate(function(retry, stop) {
      wx.uploadFile({
        url: SERVER + '/api/pdf/edit',
        filePath: that.data.filePath,
        name: 'file',
        formData: {
          op: that.data.operation,
          text: that.data.textContent || '',
          angle: String(that.data.rotateAngle)
        },
        timeout: 60000,
        success: function(res) {
          that.setData({ uploading: false });
          var data = {};
          try { data = JSON.parse(res.data); } catch(e) {}
          if (data.url) {
            that.setData({ resultUrl: data.url, processing: false, progressText: '' });
            wx.showToast({ title: '处理成功', icon: 'success' });
          } else {
            stop(data.error || '处理失败');
          }
        },
        fail: function() {
          that.setData({ uploading: false });
          retry('网络错误');
        }
      });
    });
  },

  _doMerge: function() {
    var that = this;
    var mergeId = '';

    // Step 1: Upload second file
    wx.uploadFile({
      url: SERVER + '/api/pdf/edit/merge2',
      filePath: that.data.filePath2,
      name: 'file2',
      timeout: 60000,
      success: function(res2) {
        var data2 = {};
        try { data2 = JSON.parse(res2.data); } catch(e) {}
        if (!data2.merge_id) {
          that.setData({ processing: false, uploading: false, progressText: '' });
          wx.showToast({ title: data2.error || '第二个文件上传失败', icon: 'none' });
          return;
        }
        mergeId = data2.merge_id;

        // Step 2: Upload first file and trigger merge
        wx.uploadFile({
          url: SERVER + '/api/pdf/edit/merge',
          filePath: that.data.filePath,
          name: 'file',
          formData: { merge_id: mergeId },
          timeout: 120000,
          success: function(res) {
            that.setData({ uploading: false });
            var data = {};
            try { data = JSON.parse(res.data); } catch(e) {}
            if (data.url) {
              that.setData({ resultUrl: data.url, processing: false, progressText: '' });
              wx.showToast({ title: '合并成功', icon: 'success' });
            } else {
              that.setData({ processing: false, progressText: '' });
              wx.showToast({ title: data.error || '合并失败', icon: 'none' });
            }
          },
          fail: function() {
            that.setData({ processing: false, uploading: false, progressText: '' });
            wx.showToast({ title: '网络错误', icon: 'none' });
          }
        });
      },
      fail: function() {
        that.setData({ processing: false, uploading: false, progressText: '' });
        wx.showToast({ title: '第二个文件上传失败', icon: 'none' });
      }
    });
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

  _pollEditStatus: function(r, jobId) {
    var that = this;
    function poll() {
      wx.request({
        url: SERVER + '/api/pdf/status/' + jobId,
        timeout: 60000,
        success: function(res) {
          if (res.statusCode !== 200 || !res.data) {
            r.updateProgress('查询状态失败，重试中...');
            setTimeout(poll, 5000);
            return;
          }
          var d = res.data;
          if (d.status === 'done' && d.url) {
            that.setData({ resultUrl: d.url, processing: false, progressText: '' });
            that._updateRecordStatus(jobId, 'done', d.url);
            wx.showToast({ title: '处理成功', icon: 'success' });
          } else if (d.status === 'error') {
            that._updateRecordStatus(jobId, 'error', '', d.error);
            r.fail(d.error || '处理失败');
          } else {
            r.updateProgress('处理中');
            setTimeout(poll, 3000);
          }
        },
        fail: function() {
          r.updateProgress('网络错误，重试中...');
          setTimeout(poll, 5000);
        }
      });
    }
    poll();
  },

  _updateRecordStatus: function(jobId, status, url, errorMsg) {
    var records = wx.getStorageSync('pdf_task_records') || [];
    for (var i = 0; i < records.length; i++) {
      if (records[i].jobId === jobId) {
        records[i].status = status;
        records[i].completedAt = Date.now();
        records[i].duration = Math.round((records[i].completedAt - records[i].createdAt) / 1000);
        if (url) records[i].resultUrl = url.replace(SERVER, '');
        if (errorMsg) records[i].errorMsg = errorMsg;
        break;
      }
    }
    wx.setStorageSync('pdf_task_records', records);
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
