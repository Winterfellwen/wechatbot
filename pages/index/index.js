var loginLib = require('../../utils/login');
var validation = require('../../utils/validation');

Page({
  data: {
    userInfo: null,
    displayUserInfo: null,
    isLoggedIn: false,
    greeting: '你好'
  },

  getGreeting: function () {
    var h = new Date().getHours();
    if (h >= 6 && h < 12) return '早上好';
    if (h >= 12 && h < 14) return '中午好';
    if (h >= 14 && h < 18) return '下午好';
    if (h >= 18 && h < 22) return '晚上好';
    return '夜深了';
  },

  onShow: function () {
    var loggedIn = loginLib.isLoggedIn();
    var user = loggedIn ? loginLib.getUserInfo() : null;
    var displayUserInfo = validation.getDisplayUserInfo(user, '游客');
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

  onShareAppMessage: function () {
    return { title: '多功能小机器人', path: '/pages/index/index' };
  },

  handleEntryTap: function (e) {
    var type = e.currentTarget.dataset.type;
    if (type === 'learn') {
      wx.navigateTo({ url: '/pages/learn-agent/learn-agent' });
    } else if (type === 'tool') {
      wx.navigateTo({ url: '/pages/tool-agent/tool-agent' });
    } else if (type === 'cloud') {
      wx.navigateTo({ url: '/cloud-manager/pages/index/index' });
    } else if (type === 'fortune') {
      wx.navigateTo({ url: '/fortune/pages/index/index' });
    }
  }
});
