var loginLib = require('../../../utils/login');

Page({
  data: {
    activeTab: 'all',
    records: []
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
    // 页面卸载时不做任何操作，避免 webviewId 错误
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
    if (this._polling) return;
    this._polling = true;
    this._poll();
  },

  _stopPolling: function() {
    this._polling = false;
  },

  _poll: function() {
    var that = this;
    if (!this._polling) return;

    var records = wx.getStorageSync('pdf_task_records') || [];
    var pendingJobs = [];
    var now = Date.now();
    var TIMEOUT = 30 * 60 * 1000; // 30 分钟超时

    // 检查超时任务
    var changed = false;
    for (var i = 0; i < records.length; i++) {
      if ((records[i].status === 'queued' || records[i].status === 'processing') &&
          (now - records[i].createdAt) > TIMEOUT) {
        records[i].status = 'error';
        records[i].errorMsg = '任务处理超时，请重新提交';
        records[i].completedAt = now;
        records[i].duration = Math.round((now - records[i].createdAt) / 1000);
        changed = true;
      }
    }
    if (changed) {
      that._saveRecords(records);
    }

    // 重新获取最新记录
    records = wx.getStorageSync('pdf_task_records') || [];
    pendingJobs = [];
    for (var i = 0; i < records.length; i++) {
      if (records[i].status === 'queued' || records[i].status === 'processing') {
        pendingJobs.push(records[i]);
      }
    }

    if (pendingJobs.length === 0) {
      setTimeout(function() { that._poll(); }, 5000);
      return;
    }

    // Cloud-based: jobs complete immediately, just refresh records
    that._loadRecords();
    setTimeout(function() { that._poll(); }, 5000);
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
      wx.showToast({ title: '文件正在处理中，请稍后再试', icon: 'none' });
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
    if (record.resultUrl && record.resultUrl.indexOf('cloud://') === 0) {
      wx.cloud.downloadFile({
        fileID: record.resultUrl,
        success: function (res) {
          wx.hideLoading();
          that._saveLocalAndOpen(record, res.tempFilePath);
        },
        fail: function () {
          wx.hideLoading();
          wx.showToast({ title: '下载失败', icon: 'none' });
        }
      });
    } else {
      wx.downloadFile({
        url: record.resultUrl,
        success: function (res) {
          wx.hideLoading();
          if (res.statusCode === 200) {
            that._saveLocalAndOpen(record, res.tempFilePath);
          } else {
            wx.showToast({ title: '下载失败，请检查网络后重试', icon: 'none' });
          }
        },
        fail: function () {
          wx.hideLoading();
          wx.showToast({ title: '下载失败，请检查网络后重试', icon: 'none' });
        }
      });
    }
  },

  _saveLocalAndOpen: function (record, tempFilePath) {
    var fs = wx.getFileSystemManager();
    var baseName = record.fileName.replace(/\.[^.]+$/, '');
    var ext = record.to || 'pdf';
    var savedName = baseName + '.' + ext;
    var savedPath = wx.env.USER_DATA_PATH + '/' + savedName;
    try { fs.saveFileSync(tempFilePath, savedPath); } catch (e) { savedPath = tempFilePath; }
    var records = wx.getStorageSync('pdf_task_records') || [];
    for (var i = 0; i < records.length; i++) {
      if (records[i].jobId === record.jobId) {
        records[i].localPath = savedPath;
        records[i].downloaded = true;
        break;
      }
    }
    this._saveRecords(records);
    wx.openDocument({ filePath: savedPath, showMenu: true });
  },

  retryTask: function(e) {
    var idx = e.currentTarget.dataset.idx;
    var record = this._getFilteredRecords()[idx];
    if (!record || record.status !== 'error') return;
    wx.showToast({ title: '重试功能即将上线，敬请期待', icon: 'none' });
  },

  deleteRecord: function(e) {
    var idx = e.currentTarget.dataset.idx;
    var record = this._getFilteredRecords()[idx];
    if (!record) return;
    var that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除此记录吗？删除后无法恢复',
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
