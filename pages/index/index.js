var loginLib = require('../../utils/login');

Page({
  data: {
    userInfo: null,
    displayUserInfo: null,
    isLoggedIn: false,
    greeting: '你好',
    teacherVisible: false
  },

  getGreeting: function () {
    var h = new Date().getHours();
    if (h >= 6 && h < 12) return '早上好';
    if (h >= 12 && h < 14) return '中午好';
    if (h >= 14 && h < 18) return '下午好';
    if (h >= 18 && h < 22) return '晚上好';
    return '夜深了';
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

  isValidNickname: function(nick) {
    if (!nick) return false;
    var trimmed = nick.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.indexOf('微信用户') === 0) return false;
    if (trimmed === '游客') return false;
    return true;
  },

  getDisplayUserInfo: function(user) {
    if (!user) return { avatarUrl: '/images/avatar-default.png', nickName: '游客' };
    var display = { avatarUrl: '/images/avatar-default.png', nickName: '游客' };
    if (this.isValidAvatarUrl(user.avatarUrl)) {
      display.avatarUrl = user.avatarUrl;
    }
    if (this.isValidNickname(user.nickName)) {
      display.nickName = user.nickName;
    }
    return display;
  },

  onShow: function () {
    var loggedIn = loginLib.isLoggedIn();
    var user = loggedIn ? loginLib.getUserInfo() : null;
    var displayUserInfo = this.getDisplayUserInfo(user);
    this.setData({
      isLoggedIn: loggedIn,
      userInfo: user,
      displayUserInfo: displayUserInfo,
      greeting: this.getGreeting()
    });
  },

  handleUserTap: function () {
    wx.switchTab({ url: '/pages/user/user' });
  },

  onAvatarError: function () {
    this.setData({ userInfo: { avatarUrl: '/images/avatar-default.png' } });
  },

  onReady: function () {
    var that = this;
    this._observer = wx.createIntersectionObserver(this);
    this._observer.relativeToViewport({ bottom: 100 }).observe('.teacher-card', function (res) {
      if (res.intersectionRatio > 0) {
        that.setData({ teacherVisible: true });
        that._observer.disconnect();
      }
    });
  },

  onUnload: function () {
    if (this._observer) { this._observer.disconnect(); }
  },

  onShareAppMessage: function () {
    return { title: '多功能小机器人', path: '/pages/index/index' };
  },

  handleEntryTap: function (e) {
    var type = e.currentTarget.dataset.type;
    if (type === 'japanese') {
      wx.navigateTo({ url: '/japanese/pages/learn/learn' });
    } else if (type === 'german') {
      wx.navigateTo({ url: '/german/pages/learn/learn' });
    } else if (type === 'word') {
      wx.navigateTo({ url: '/word/pages/index/index' });
    } else if (type === 'pdf') {
      wx.navigateTo({ url: '/pdf/pages/index/index' });
    } else if (type === 'teacher') {
      wx.navigateTo({ url: '/smart-teacher/pages/chat/chat' });
    } else if (type === 'developing') {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  }
});
