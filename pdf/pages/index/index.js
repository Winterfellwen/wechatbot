var retry = require('../../../utils/retry');
var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;

Page({
  data: {
    fileName: '',
    filePath: '',
    fromFormat: '',
    toFormat: '',
    converting: false,
    activeTab: 'convert',
    targetOptions: [],
    files: [],
    currentJobId: null,
    results: [],
    uploading: false
  },

  onLoad: function() {
    this._restoreResult();
  },

  onUnload: function() {
    if (this.data.uploading) {
      wx.showModal({
        title: '提示',
        content: '上传已被取消，任务已保存至记录页',
        showCancel: false
      });
      if (this.data.currentJobId) {
        this._saveTaskRecord({
          jobId: this.data.currentJobId,
          type: 'convert',
          fileName: this.data.fileName,
          from: this.data.fromFormat,
          to: this.data.toFormat,
          status: 'processing',
          createdAt: Date.now()
        });
      }
    }
  },

  _restoreResult: function() {
    var list = wx.getStorageSync('pdf_convert_results');
    if (!list || !list.length) return;
    var fs = wx.getFileSystemManager();
    var valid = [];
    for (var i = 0; i < list.length; i++) {
      try { fs.accessSync(list[i].path); valid.push(list[i]); } catch(e) {}
    }
    this.setData({ results: valid });
    if (valid.length < list.length) wx.setStorageSync('pdf_convert_results', valid);
  },

  _saveResults: function() {
    wx.setStorageSync('pdf_convert_results', this.data.results);
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
          toFormat: targets[0].value, targetOptions: targets,
          activeTab: 'convert', files: [], currentJobId: null, uploading: false
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
    if (this.data.uploading) {
      wx.showToast({ title: '正在上传中，请勿重复提交', icon: 'none' });
      return;
    }
    var that = this;
    that.setData({ converting: true, uploading: true, currentJobId: null, progressText: '准备中...' });

    var r = retry.createRetrier(that, { totalTimeout: 60000, maxRetries: 3 });

    r.operate(function(retry, stop, ctx) {
      var task = wx.uploadFile({
        url: SERVER + '/api/pdf/convert',
        filePath: that.data.filePath,
        name: 'file',
        formData: { from: that.data.fromFormat, to: that.data.toFormat },
        timeout: 60000,
        success: function(res) {
          if (res.statusCode !== 200) {
            if (res.statusCode >= 500) return retry('服务器错误');
            var errData = {};
            try { errData = JSON.parse(res.data || '{}'); } catch(e) {}
            that.setData({ uploading: false });
            return stop(errData.error || '提交失败(' + res.statusCode + ')');
          }
          var data = {};
          try { data = JSON.parse(res.data); } catch(e) {}
          if (!data.job_id && !data.url) {
            that.setData({ uploading: false });
            return stop(data.error || '提交失败');
          }
          if (data.url) {
            that.setData({ uploading: false });
            return that._retryDownload(r, data.url);
          }
          that.setData({ currentJobId: data.job_id, uploading: false });
          that._saveTaskRecord({
            jobId: data.job_id,
            type: 'convert',
            fileName: that.data.fileName,
            from: that.data.fromFormat,
            to: that.data.toFormat,
            status: 'queued',
            createdAt: Date.now(),
            resultUrl: '/api/pdf/status/' + data.job_id
          });
          that._retryPoll(r, data.job_id);
        },
        fail: function() {
          that.setData({ uploading: false });
          retry('网络错误');
        }
      });
      task.onProgressUpdate(function(prog) {
        r.updateProgress('上传中 ' + prog.progress + '%');
      });
    });
  },

  _retryPoll: function(r, jobId) {
    var that = this;
    r.operate(function(retry, stop) {
      wx.request({
        url: SERVER + '/api/pdf/status/' + jobId,
        timeout: 60000,
        success: function(res) {
          if (!that.data.converting || that.data.currentJobId !== jobId) {
            r.cancel();
            return;
          }
          if (res.statusCode !== 200 || !res.data) return setTimeout(retry, 5000);
          var d = res.data;
          if (d.status === 'done' && d.url) {
            that._updateRecordStatus(jobId, 'done', d.url);
            that._retryDownload(r, d.url);
          } else if (d.status === 'error') {
            var errMsg = d.error || '转换失败';
            console.error('PDF转换失败:', errMsg);
            that._updateRecordStatus(jobId, 'error', '', errMsg);
            wx.showModal({
              title: '转换失败',
              content: errMsg.length > 200 ? errMsg.substring(0, 200) + '...' : errMsg,
              showCancel: false,
              confirmText: '确定'
            });
            stop(errMsg);
          } else {
            r.updateProgress('转换中');
            setTimeout(retry, 3000);
          }
        },
        fail: function() { setTimeout(retry, 5000); }
      });
    });
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

  _retryDownload: function(r, url) {
    var that = this;
    r.operate(function(retry, stop) {
      r.updateProgress('下载中');
      wx.downloadFile({
        url: url,
        timeout: 120000,
        success: function(dl) {
          if (dl.statusCode !== 200) return retry('下载失败');
          var fs = wx.getFileSystemManager();
          var baseName = that.data.fileName.replace(/\.[^.]+$/, '');
          var ext = that.data.toFormat === 'doc' ? 'doc' : that.data.toFormat;
          var savedName = 'pdf_convert_' + Date.now() + '.' + ext;
          var savedPath = wx.env.USER_DATA_PATH + '/' + savedName;
          try { fs.saveFileSync(dl.tempFilePath, savedPath); } catch(e) { savedPath = dl.tempFilePath; }
          var item = { path: savedPath, name: baseName + '.' + ext, format: ext, time: Date.now() };
          var results = that.data.results.slice();
          results.push(item);
          if (results.length > 10) {
            var removed = results.splice(0, results.length - 10);
            var rmFs = wx.getFileSystemManager();
            for (var i = 0; i < removed.length; i++) {
              try { rmFs.unlinkSync(removed[i].path); } catch(e) {}
            }
          }
          that._saveResults();
          // 更新记录 - capture jobId before clearing
          var jobId = that.data.currentJobId;
          that.setData({ converting: false, progressText: '', currentJobId: null, results: results });
          that._updateRecordStatus(jobId || '', 'done', url);
          wx.showToast({ title: '转换成功', icon: 'success' });
        },
        fail: function() { retry('网络错误'); }
      });
    });
  },

  openResult: function(e) {
    var idx = e.currentTarget.dataset.idx;
    var item = this.data.results[idx];
    if (!item) return;
    wx.openDocument({ filePath: item.path, fileType: item.format, showMenu: true });
  },

  removeResult: function(e) {
    var idx = e.currentTarget.dataset.idx;
    var item = this.data.results[idx];
    if (!item) return;
    try { wx.getFileSystemManager().unlinkSync(item.path); } catch(e) {}
    var results = this.data.results.slice();
    results.splice(idx, 1);
    this.setData({ results: results });
    this._saveResults();
  },

  switchTab: function(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  goEdit: function() {
    wx.navigateTo({
      url: '../edit/edit?file=' + encodeURIComponent(this.data.fileName) + '&path=' + encodeURIComponent(this.data.filePath)
    });
  },

  goRecords: function() {
    wx.navigateTo({
      url: '../records/records'
    });
  },

  clearFile: function() {
    this.setData({ fileName: '', filePath: '', fromFormat: '', toFormat: '', targetOptions: [], currentJobId: null, converting: false, progressText: '', uploading: false });
  }
});
