// app.js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'your-env-id',
        traceUser: true,
      });
    }

    this.checkLoginStatus();

    try {
      var ttsJP = require('./japanese/utils/tts.js');
      if (ttsJP && ttsJP.preLoad) ttsJP.preLoad();
    } catch(e) {}
  },
  
  globalData: {
    userInfo: null,
    isLoggedIn: false
  },
  
  isValidAvatarUrl: function(url) {
    if (!url) return false;
    if (url.indexOf('/images/') === 0) return true;
    if (url.indexOf('http') !== 0) return false;
    if (url.indexOf('__tmp__') >= 0) return false;
    if (url.indexOf('wxfile://') >= 0) return false;
    if (url.indexOf('127.0.0.1') >= 0) return false;
    if (url.indexOf('localhost') >= 0) return false;
    return true;
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('auth_user');
    if (userInfo) {
      if (!this.isValidAvatarUrl(userInfo.avatarUrl)) {
        userInfo.avatarUrl = '/images/avatar-default.png';
        wx.setStorageSync('auth_user', userInfo);
      }
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
    }
  },
  
  setUserInfo(userInfo) {
    if (userInfo && !this.isValidAvatarUrl(userInfo.avatarUrl)) {
      userInfo.avatarUrl = '/images/avatar-default.png';
    }
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('auth_user', userInfo);
  },
  
  clearUserInfo() {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('auth_user');
  }
});