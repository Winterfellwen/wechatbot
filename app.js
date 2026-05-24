// app.js
var validation = require('./utils/validation');

App({
  globalData: {
    userInfo: null,
    isLoggedIn: false
  },

  onLaunch: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({ env: 'cloud1-7gzoz5cr22dd4354', traceUser: true });
    }
    this.checkAutoDownload();
  },

  onShow: function() {
    this.checkAutoDownload();
  },

  checkAutoDownload: function() {
    var records = wx.getStorageSync('pdf_task_records') || [];
    var pendingDownloads = records.filter(function(r) {
      return r.status === 'done' && !r.downloaded && r.resultUrl;
    });
    if (pendingDownloads.length === 0) return;

    var record = pendingDownloads[0];
    this._autoDownload(record);
  },

  _autoDownload: function(record) {
    var that = this;
    if (record.resultUrl && record.resultUrl.indexOf('cloud://') === 0) {
      wx.cloud.downloadFile({
        fileID: record.resultUrl,
        success: function(res) {
          that._saveDownloaded(record, res.tempFilePath);
        },
        fail: function() {}
      });
    } else {
      wx.downloadFile({
        url: record.resultUrl,
        success: function(res) {
          if (res.statusCode === 200) {
            that._saveDownloaded(record, res.tempFilePath);
          }
        },
        fail: function() {}
      });
    }
  },

  _saveDownloaded: function(record, tempFilePath) {
    var fs = wx.getFileSystemManager();
    var savedPath = wx.env.USER_DATA_PATH + '/' + record.fileName;
    try { fs.saveFileSync(tempFilePath, savedPath); } catch(e) { savedPath = tempFilePath; }
    var records = wx.getStorageSync('pdf_task_records') || [];
    for (var i = 0; i < records.length; i++) {
      if (records[i].jobId === record.jobId) {
        records[i].localPath = savedPath;
        records[i].downloaded = true;
        break;
      }
    }
    wx.setStorageSync('pdf_task_records', records);
    wx.showToast({ title: '已完成的任务文件已自动下载', icon: 'success' });
  },

  onShareAppMessage: function () {
    return { title: '多功能小机器人', path: '/pages/index/index' };
  },

  checkLoginStatus() {
    var STORAGE_USER = 'user';
    var userInfo = wx.getStorageSync(STORAGE_USER);
    if (userInfo) {
      if (!validation.isValidAvatarUrl(userInfo.avatarUrl)) {
        userInfo.avatarUrl = '/images/avatar-default.png';
        wx.setStorageSync(STORAGE_USER, userInfo);
      }
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
    }
  },

  setUserInfo(userInfo) {
    if (userInfo && !validation.isValidAvatarUrl(userInfo.avatarUrl)) {
      userInfo.avatarUrl = '/images/avatar-default.png';
    }
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('user', userInfo);
  },

  clearUserInfo() {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('user');
  }
});
