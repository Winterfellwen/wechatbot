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
    results: []
  },

  onLoad: function() {
    this._restoreResult();
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
          activeTab: 'convert', files: [], currentJobId: null
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
    that.setData({ converting: true, currentJobId: null, progressText: '准备中...' });

    var r = retry.createRetrier(that);

    // Phase 1: upload file, get job_id
    r.operate(function(retry, stop, ctx) {
      var task = wx.uploadFile({
        url: SERVER + '/api/pdf/convert',
        filePath: that.data.filePath,
        name: 'file',
        formData: { from: that.data.fromFormat, to: that.data.toFormat },
        timeout: 120000,
        success: function(res) {
          if (res.statusCode !== 200) {
            if (res.statusCode >= 500) return retry('服务器错误');
            var errData = {};
            try { errData = JSON.parse(res.data || '{}'); } catch(e) {}
            return stop(errData.error || '提交失败(' + res.statusCode + ')');
          }
          var data = {};
          try { data = JSON.parse(res.data); } catch(e) {}
          if (!data.job_id && !data.url) return stop(data.error || '提交失败');
          if (data.url) {
            // legacy: direct URL, skip poll
            return that._retryDownload(r, data.url);
          }
          // job submitted, start polling
          that.setData({ currentJobId: data.job_id });
          that._retryPoll(r, data.job_id);
        },
        fail: function() { retry('网络错误'); }
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
            that._retryDownload(r, d.url);
          } else if (d.status === 'error') {
            var errMsg = d.error || '转换失败';
            console.error('PDF转换失败:', errMsg);
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
          that.setData({ converting: false, progressText: '', currentJobId: null, results: results });
          that._saveResults();
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
  clearFile: function() {
    this.setData({ fileName: '', filePath: '', fromFormat: '', toFormat: '', targetOptions: [], currentJobId: null, converting: false, progressText: '' });
  }
});
