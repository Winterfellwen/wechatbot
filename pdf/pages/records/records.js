var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;

Page({
  data: {
    activeTab: 'all',
    records: [],
    polling: false
  },

  onLoad: function() {
    this._loadRecords();
    this._startPolling();
  },

  onShow: function() {
    this._loadRecords();
    this._startPolling();
  },

  onHide: function() {
    this._stopPolling();
  },

  onUnload: function() {
    this._stopPolling();
  },

  _loadRecords: function() {
    var records = wx.getStorageSync('pdf_task_records') || [];
    this.setData({ records: records });
  },

  _saveRecords: function(records) {
    wx.setStorageSync('pdf_task_records', records);
    this.setData({ records: records });
  },

  _startPolling: function() {
    if (this.data.polling) return;
    this.setData({ polling: true });
    this._poll();
  },

  _stopPolling: function() {
    this.setData({ polling: false });
  },

  _poll: function() {
    var that = this;
    if (!this.data.polling) return;

    var records = wx.getStorageSync('pdf_task_records') || [];
    var pendingJobs = [];
    for (var i = 0; i < records.length; i++) {
      if (records[i].status === 'queued' || records[i].status === 'processing') {
        pendingJobs.push(records[i]);
      }
    }

    if (pendingJobs.length === 0) {
      setTimeout(function() { that._poll(); }, 5000);
      return;
    }

    // 只轮询最新的 1 个任务
    var job = pendingJobs[0];
    wx.request({
      url: SERVER + job.resultUrl,
      timeout: 30000,
      success: function(res) {
        if (!that.data.polling) return;
        if (res.statusCode !== 200 || !res.data) {
          setTimeout(function() { that._poll(); }, 5000);
          return;
        }
        var d = res.data;
        var allRecords = wx.getStorageSync('pdf_task_records') || [];
        for (var i = 0; i < allRecords.length; i++) {
          if (allRecords[i].jobId === job.jobId) {
            if (d.status === 'done' && d.url) {
              allRecords[i].status = 'done';
              allRecords[i].completedAt = Date.now();
              allRecords[i].duration = Math.round((allRecords[i].completedAt - allRecords[i].createdAt) / 1000);
              allRecords[i].resultUrl = d.url.replace(SERVER, '');
              wx.showToast({ title: '转换完成，可在记录页下载', icon: 'success', duration: 2000 });
            } else if (d.status === 'error') {
              allRecords[i].status = 'error';
              allRecords[i].completedAt = Date.now();
              allRecords[i].duration = Math.round((allRecords[i].completedAt - allRecords[i].createdAt) / 1000);
              allRecords[i].errorMsg = d.error || '转换失败';
            } else {
              allRecords[i].status = d.status || 'processing';
            }
            break;
          }
        }
        that._saveRecords(allRecords);
        setTimeout(function() { that._poll(); }, 3000);
      },
      fail: function() {
        setTimeout(function() { that._poll(); }, 5000);
      }
    });
  },

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  openFile: function(e) {
    var idx = e.currentTarget.dataset.idx;
    var record = this._getFilteredRecords()[idx];
    if (!record) return;
    if (record.status !== 'done') {
      wx.showToast({ title: '文件尚未完成', icon: 'none' });
      return;
    }
    if (record.localPath) {
      var fileType = record.to || (record.type === 'edit' ? 'pdf' : 'docx');
      wx.openDocument({ filePath: record.localPath, fileType: fileType, showMenu: true });
    } else {
      this._downloadAndOpen(record);
    }
  },

  _getFilteredRecords: function() {
    var records = this.data.records;
    var tab = this.data.activeTab;
    if (tab === 'all') return records;
    var filtered = [];
    for (var i = 0; i < records.length; i++) {
      if (records[i].type === tab) filtered.push(records[i]);
    }
    return filtered;
  },

  _downloadAndOpen: function(record) {
    var that = this;
    wx.showLoading({ title: '下载中...' });
    wx.downloadFile({
      url: SERVER + record.resultUrl,
      success: function(res) {
        wx.hideLoading();
        if (res.statusCode === 200) {
          var fs = wx.getFileSystemManager();
          var baseName = record.fileName.replace(/\.[^.]+$/, '');
          var ext = record.to || 'pdf';
          var savedName = baseName + '.' + ext;
          var savedPath = wx.env.USER_DATA_PATH + '/' + savedName;
          try { fs.saveFileSync(res.tempFilePath, savedPath); } catch(e) { savedPath = res.tempFilePath; }
          var records = wx.getStorageSync('pdf_task_records') || [];
          for (var i = 0; i < records.length; i++) {
            if (records[i].jobId === record.jobId) {
              records[i].localPath = savedPath;
              records[i].downloaded = true;
              break;
            }
          }
          that._saveRecords(records);
          wx.openDocument({ filePath: savedPath, showMenu: true });
        } else {
          wx.showToast({ title: '下载失败', icon: 'none' });
        }
      },
      fail: function() {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  },

  retryTask: function(e) {
    var idx = e.currentTarget.dataset.idx;
    var record = this._getFilteredRecords()[idx];
    if (!record || record.status !== 'error') return;
    wx.showToast({ title: '重试功能开发中', icon: 'none' });
  },

  deleteRecord: function(e) {
    var idx = e.currentTarget.dataset.idx;
    var record = this._getFilteredRecords()[idx];
    if (!record) return;
    var that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: function(res) {
        if (res.confirm) {
          var records = wx.getStorageSync('pdf_task_records') || [];
          var newRecords = [];
          for (var i = 0; i < records.length; i++) {
            if (records[i].jobId !== record.jobId) newRecords.push(records[i]);
          }
          that._saveRecords(newRecords);
          if (record.localPath) {
            try { wx.getFileSystemManager().unlinkSync(record.localPath); } catch(e) {}
          }
        }
      }
    });
  }
});
