var loginLib = require('../../utils/login');
var validation = require('../../utils/validation');

Page({
  data: {
    userInfo: null,
    displayUserInfo: null,
    isLoggedIn: false,
    greeting: '你好',
    teacherVisible: false,
    iconSrc: {}
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

  onReady: function () {
    var that = this;
    this._observer = wx.createIntersectionObserver(this);
    this._observer.relativeToViewport({ bottom: 100 }).observe('.teacher-card', function (res) {
      if (res.intersectionRatio > 0) {
        that.setData({ teacherVisible: true });
        that._observer.disconnect();
      }
    });
    that.setData({ iconSrc: that._getIconSrc() });
  },

  _getIconSrc: function () {
    function svg(str) { return 'data:image/svg+xml,' + encodeURIComponent(str); }
    return {
      learn: svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="6" y="10" width="36" height="28" rx="4" fill="#fff"/><rect x="9" y="14" width="11" height="14" rx="2" fill="#C4B5FD"/><rect x="28" y="14" width="11" height="14" rx="2" fill="#C4B5FD"/><line x1="24" y1="10" x2="24" y2="38" stroke="#C4B5FD" stroke-width="3"/></svg>'),
      tool: svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="6" y="12" width="36" height="26" rx="4" fill="#fff"/><path d="M6 20 L14 20 L17 16 L31 16 L34 20 L42 20" fill="#FBCFE8" opacity=".5"/><line x1="14" y1="26" x2="34" y2="26" stroke="#FBCFE8" stroke-width="3" stroke-linecap="round"/><line x1="14" y1="31" x2="28" y2="31" stroke="#FBCFE8" stroke-width="3" stroke-linecap="round"/></svg>'),
      order: svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 4 L28 20 L44 24 L28 28 L24 44 L20 28 L4 24 L20 20 Z" fill="#fff"/><circle cx="36" cy="10" r="4.5" fill="#fff" opacity=".5"/><circle cx="42" cy="37" r="3.5" fill="#fff" opacity=".35"/></svg>')
    };
  },

  onUnload: function () {
    if (this._observer) { this._observer.disconnect(); }
  },

  onShareAppMessage: function () {
    return { title: '多功能小机器人', path: '/pages/index/index' };
  },

  handleEntryTap: function (e) {
    var type = e.currentTarget.dataset.type;
    if (type === 'learn-hub') {
      wx.navigateTo({ url: '/pages/learnhub/learnhub' });
    } else if (type === 'tool-hub') {
      wx.navigateTo({ url: '/pages/toolhub/toolhub' });
    } else if (type === 'assistant') {
      wx.navigateTo({ url: '/smart-teacher/pages/chat/chat' });
    } else if (type === 'ai-order') {
      wx.navigateTo({ url: '/ai-order/pages/index/index' });
    } else if (type === 'developing') {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  }
});
