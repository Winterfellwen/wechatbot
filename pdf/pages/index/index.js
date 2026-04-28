Page({
  data: {
    fileName: '',
    filePath: '',
    fromFormat: '',
    toFormat: '',
    converting: false,
    targetOptions: [],
    files: [],
    currentJobId: null
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

  // 下载并打开结果
  _downloadResult: function(url, jobId) {
    var that = this;
    wx.downloadFile({
      url: url,
      success: function(dl) {
        that.setData({ converting: false, progressText: '', currentJobId: null });
        var fs = wx.getFileSystemManager();
        var savedPath = wx.env.USER_DATA_PATH + '/converted.' + that.data.toFormat;
        try { fs.saveFileSync(dl.tempFilePath, savedPath); } catch(e) { savedPath = dl.tempFilePath; }
        wx.showModal({
          title: '转换完成',
          content: '文件已保存。是否立即打开？',
          confirmText: '打开',
          cancelText: '稍后',
          success: function(r) { if (r.confirm) wx.openDocument({ filePath: savedPath, fileType: that.data.toFormat, showMenu: true }); }
        });
      },
      fail: function() {
        that.setData({ converting: false, progressText: '', currentJobId: null });
        wx.showToast({ title: '下载失败，请重试', icon: 'none', duration: 3000 });
      }
    });
  },

  clearFile: function() {
    this.setData({ fileName: '', filePath: '', fromFormat: '', toFormat: '', targetOptions: [], currentJobId: null, converting: false, progressText: '' });
  }
});
