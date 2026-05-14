// app.js
var validation = require('./utils/validation');
var CONFIG = require('./utils/config');

App({  
  globalData: {
    userInfo: null,
    isLoggedIn: false
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
