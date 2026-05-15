var retry = require('../../../utils/retry');
var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;

Page({
  data: {
    fileName: '',
    filePath: '',
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

  doOperation: function() {
    if (!this.data.filePath) { wx.showToast({ title: '请先上传文件', icon: 'none' }); return; }
    if (!this.data.operation) { wx.showToast({ title: '请选择操作', icon: 'none' }); return; }
    if (this.data.uploading) { wx.showToast({ title: '正在处理中', icon: 'none' }); return; }

    var that = this;
    that.setData({ processing: true, uploading: true, progressText: '处理中...' });

    var r = retry.createRetrier(that, { totalTimeout: 60000, maxRetries: 3 });

    r.operate(function(retry, stop) {
      wx.uploadFile({
        url: SERVER + '/api/pdf/edit',
        filePath: that.data.filePath,
        name: 'file',
        formData: {
          op: that.data.operation,
          text: that.data.textContent,
          angle: String(that.data.rotateAngle)
        },
        timeout: 60000,
        success: function(res) {
          that.setData({ uploading: false });
          var data = {};
          try { data = JSON.parse(res.data); } catch(e) {}
          if (data.job_id) {
            that.setData({ currentJobId: data.job_id });
            that._saveTaskRecord({
              jobId: data.job_id,
              type: 'edit',
              fileName: that.data.fileName,
              operation: that.data.operation,
              status: 'queued',
              createdAt: Date.now(),
              resultUrl: '/api/pdf/status/' + data.job_id
            });
            wx.showToast({ title: '文件已上传，完成后会有提示，或者可以在纪录里找到下载', icon: 'none', duration: 3000 });
            that._pollEditStatus(r, data.job_id);
          } else if (data.url) {
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
