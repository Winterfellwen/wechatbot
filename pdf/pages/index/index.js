var retry = require('../../../utils/retry');
var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;

Page({
  data: {
    fileName: '',
    filePath: '',
    fromFormat: '',
    toFormat: '',
    uploading: false,
    activeTab: 'convert',
    targetOptions: []
  },

  onLoad: function() {},

  onUnload: function() {
    if (this.data.uploading) {
      this.setData({ uploading: false });
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
          activeTab: 'convert', uploading: false
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
    that.setData({ uploading: true });

    var r = retry.createRetrier(that, { totalTimeout: 60000, maxRetries: 3 });

    r.operate(function(retry, stop) {
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
          // 保存任务记录
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
          // 重置页面
          that.setData({
            fileName: '', filePath: '', fromFormat: '', toFormat: '',
            targetOptions: [], uploading: false
          });
          wx.showToast({ title: '文件已上传，完成后会有提示，或者可以在纪录里找到下载', icon: 'none', duration: 3000 });
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
    this.setData({ fileName: '', filePath: '', fromFormat: '', toFormat: '', targetOptions: [], uploading: false });
  }
});
