// app.js
var validation = require('./utils/validation');
var CONFIG = require('./utils/config');

App({  
  globalData: {
    userInfo: null,
    isLoggedIn: false
  },

  onLaunch: function() {
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
    wx.downloadFile({
      url: CONFIG.SERVER + record.resultUrl,
      success: function(res) {
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
          wx.setStorageSync('pdf_task_records', records);
          wx.showToast({ title: '已完成的任务文件已自动下载', icon: 'success' });
        }
      },
      fail: function() {
        // 自动下载失败，静默忽略（用户可在记录页手动下载）
      }
    });
  },

  onShareAppMessage: function () {
    return { title: '多功能小机器人', path: '/pages/index/index' };
  },

  checkLoginStatus() {
    var STORAGE_USER = CONFIG.STORAGE_KEYS.USER;
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
    wx.setStorageSync(CONFIG.STORAGE_KEYS.USER, userInfo);
  },

  clearUserInfo() {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync(CONFIG.STORAGE_KEYS.USER);
  }
});
