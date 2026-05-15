var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;

Page({
  data: {
    activeTab: 'all',
    records: [],
    loading: false
  },

  onLoad: function() {
    this._loadRecords();
  },

  onShow: function() {
    this._loadRecords();
  },

  _loadRecords: function() {
    var records = wx.getStorageSync('pdf_task_records') || [];
    this.setData({ records: records });
  },

  _saveRecords: function(records) {
    wx.setStorageSync('pdf_task_records', records);
    this.setData({ records: records });
  },

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  getFilteredRecords: function() {
    var records = this.data.records;
    var tab = this.data.activeTab;
    if (tab === 'all') return records;
    return records.filter(function(r) { return r.type === tab; });
  },

  openFile: function(e) {
    var idx = e.currentTarget.dataset.idx;
    var record = this.getFilteredRecords()[idx];
    if (!record) return;
    if (record.status !== 'done') {
      wx.showToast({ title: '文件尚未完成', icon: 'none' });
      return;
    }
    if (record.localPath) {
      wx.openDocument({ filePath: record.localPath, showMenu: true });
    } else {
      this._downloadAndOpen(record);
    }
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
          var savedPath = wx.env.USER_DATA_PATH + '/' + record.fileName;
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
    var record = this.getFilteredRecords()[idx];
    if (!record || record.status !== 'error') return;
    wx.showToast({ title: '重试功能开发中', icon: 'none' });
  },

  deleteRecord: function(e) {
    var idx = e.currentTarget.dataset.idx;
    var record = this.getFilteredRecords()[idx];
    if (!record) return;
    var that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: function(res) {
        if (res.confirm) {
          var records = wx.getStorageSync('pdf_task_records') || [];
          var newRecords = records.filter(function(r) { return r.jobId !== record.jobId; });
          that._saveRecords(newRecords);
          if (record.localPath) {
            try { wx.getFileSystemManager().unlinkSync(record.localPath); } catch(e) {}
          }
        }
      }
    });
  }
});
