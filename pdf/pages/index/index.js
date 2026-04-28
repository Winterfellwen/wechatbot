Page({
  data: {
    fileName: '',
    filePath: '',
    fromFormat: '',
    toFormat: '',
    converting: false,
    targetOptions: [],
    files: [],
    currentJobId: null,
    resultFilePath: '',
    resultFileName: '',
    resultFormat: ''
  },

  onLoad: function() {
    this._cleanupOldFiles();
  },

  _cleanupOldFiles: function() {
    var fs = wx.getFileSystemManager();
    var dir = wx.env.USER_DATA_PATH;
    try {
      var files = fs.readdirSync(dir);
      for (var i = 0; i < files.length; i++) {
        if (files[i].indexOf('pdf_convert_') === 0) {
          try { fs.unlinkSync(dir + '/' + files[i]); } catch(e) {}
        }
      }
    } catch(e) {}
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
          files: [], currentJobId: null
        });
      }
    });
  },

  selectTarget: function(e) {
    this.setData({ toFormat: e.currentTarget.dataset.value });
  },

  doConvert: function(retryCount) {
    retryCount = retryCount || 0;
    if (!this.data.filePath) {
      wx.showToast({ title: '请先上传文件', icon: 'none' });
      return;
    }
    var that = this;
    that.setData({ converting: true, progressText: retryCount > 0 ? '重试中...' : '提交任务...' });

    var task = wx.uploadFile({
      url: 'https://wechatbot-g6ez.onrender.com/api/pdf/convert',
      filePath: that.data.filePath,
      name: 'file',
      formData: { from: that.data.fromFormat, to: that.data.toFormat },
      success: function(res) {
        if (res.statusCode === 200) {
          var data = {};
          try { data = JSON.parse(res.data); } catch(e) { data = {}; }

          if (data.job_id) {
            // 提交成功，开始轮询
            that.setData({ currentJobId: data.job_id, progressText: '转换中，请稍候...' });
            that._pollStatus(data.job_id, retryCount);
          } else if (data.url) {
            // 兼容旧版直接返回 URL
            that._downloadResult(data.url);
          } else {
            that.setData({ converting: false, progressText: '' });
            wx.showToast({ title: data.error || '提交失败', icon: 'none' });
          }
        } else if (res.statusCode >= 500) {
          // 服务端错误，自动重试
          if (retryCount < 2) {
            wx.showToast({ title: '服务器启动中，自动重试...', icon: 'loading', duration: 2000 });
            setTimeout(function() { that.doConvert(retryCount + 1); }, 3000);
          } else {
            that.setData({ converting: false, progressText: '' });
            wx.showToast({ title: '服务器异常，请稍后重试', icon: 'none' });
          }
        } else {
          // 400/其他错误，显示错误信息
          var errData = {};
          try { errData = JSON.parse(res.data || '{}'); } catch(e) {}
          that.setData({ converting: false, progressText: '' });
          wx.showToast({ title: errData.error || '提交失败(' + res.statusCode + ')', icon: 'none', duration: 3000 });
        }
      },
      fail: function(err) {
        if (retryCount < 2) {
          wx.showToast({ title: '网络不稳定，自动重试...', icon: 'loading', duration: 2000 });
          setTimeout(function() { that.doConvert(retryCount + 1); }, 3000);
        } else {
          that.setData({ converting: false, progressText: '' });
          wx.showToast({ title: '网络超时，请稍后重试', icon: 'none', duration: 3000 });
        }
      }
    });

    task.onProgressUpdate(function(res) {
      that.setData({ progressText: '上传中 ' + res.progress + '%' });
    });
  },

  // 轮询任务状态
  _pollStatus: function(jobId, retryCount) {
    var that = this;
    var maxWait = 360000; // 6 分钟
    var start = Date.now();
    var pollTimer = null;

    function doPoll() {
      if (!that.data.converting || that.data.currentJobId !== jobId) {
        // 任务已取消
        return;
      }
      if (Date.now() - start > maxWait) {
        that.setData({ converting: false, progressText: '', currentJobId: null });
        wx.showToast({ title: '转换超时，请稍后重试', icon: 'none', duration: 3000 });
        return;
      }

      wx.request({
        url: 'https://wechatbot-g6ez.onrender.com/api/pdf/status/' + jobId,
        timeout: 30000,
        success: function(r) {
          if (!that.data.converting || that.data.currentJobId !== jobId) return;

          if (r.statusCode === 200 && r.data) {
            if (r.data.status === 'done' && r.data.url) {
              that.setData({ progressText: '下载中...' });
              that._downloadResult(r.data.url, jobId);
            } else if (r.data.status === 'error') {
              that.setData({ converting: false, progressText: '', currentJobId: null });
              wx.showToast({ title: r.data.error || '转换失败', icon: 'none', duration: 3000 });
            } else {
              // processing / pending，继续轮询
              var elapsed = Math.round((Date.now() - start) / 1000);
              that.setData({ progressText: '转换中 ' + elapsed + 's...' });
              pollTimer = setTimeout(doPoll, 3000);
            }
          } else {
            // 网络抖动，继续轮询
            pollTimer = setTimeout(doPoll, 5000);
          }
        },
        fail: function() {
          if (!that.data.converting || that.data.currentJobId !== jobId) return;
          pollTimer = setTimeout(doPoll, 5000);
        }
      });
    }

    // 首次轮询，稍作延迟
    pollTimer = setTimeout(doPoll, 2000);
  },

  // 下载到小程序缓存，展示结果卡片
  _downloadResult: function(url, jobId) {
    var that = this;
    wx.downloadFile({
      url: url,
      success: function(dl) {
        if (dl.statusCode !== 200) {
          that.setData({ converting: false, progressText: '', currentJobId: null });
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }
        var fs = wx.getFileSystemManager();
        var baseName = that.data.fileName.replace(/\.[^.]+$/, '');
        var ext = that.data.toFormat === 'doc' ? 'doc' : that.data.toFormat;
        var savedName = 'pdf_convert_' + Date.now() + '.' + ext;
        var savedPath = wx.env.USER_DATA_PATH + '/' + savedName;
        try { fs.saveFileSync(dl.tempFilePath, savedPath); } catch(e) { savedPath = dl.tempFilePath; }
        that.setData({
          converting: false, progressText: '', currentJobId: null,
          resultFilePath: savedPath, resultFileName: baseName + '.' + ext, resultFormat: ext
        });
      },
      fail: function() {
        that.setData({ converting: false, progressText: '', currentJobId: null });
        wx.showToast({ title: '下载失败，请重试', icon: 'none', duration: 3000 });
      }
    });
  },

  previewResult: function() {
    var path = this.data.resultFilePath;
    var fmt = this.data.resultFormat;
    if (!path) return;
    wx.openDocument({ filePath: path, fileType: fmt, showMenu: true });
  },

  saveResult: function() {
    var path = this.data.resultFilePath;
    var name = this.data.resultFileName;
    if (!path) return;
    if (wx.saveFileToDisk) {
      wx.saveFileToDisk({
        filePath: path,
        success: function() { wx.showToast({ title: '已保存', icon: 'success' }); },
        fail: function() { wx.showToast({ title: '保存失败', icon: 'none' }); }
      });
    } else {
      wx.openDocument({
        filePath: path,
        fileType: this.data.resultFormat,
        showMenu: true,
        success: function() { wx.showToast({ title: '请点击右上角菜单保存', icon: 'none' }); }
      });
    }
  },

  shareResult: function() {
    var path = this.data.resultFilePath;
    var name = this.data.resultFileName;
    if (!path) return;
    wx.shareFileMessage({
      filePath: path,
      fileName: name,
      success: function() {},
      fail: function() { wx.showToast({ title: '转发失败', icon: 'none' }); }
    });
  },

  clearResult: function() {
    var path = this.data.resultFilePath;
    if (path) {
      try { wx.getFileSystemManager().unlinkSync(path); } catch(e) {}
    }
    this.setData({ resultFilePath: '', resultFileName: '', resultFormat: '' });
  },

  clearFile: function() {
    this.clearResult();
    this.setData({ fileName: '', filePath: '', fromFormat: '', toFormat: '', targetOptions: [], currentJobId: null, converting: false, progressText: '' });
  }
});
