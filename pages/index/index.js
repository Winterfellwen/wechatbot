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
    function s(str) { return 'data:image/svg+xml,' + encodeURIComponent(str); }
    return {
      learn: s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3" fill="#fff"/><rect x="11" y="3" width="2" height="18" fill="rgba(255,255,255,0.3)"/></svg>'),
      tool: s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2.5" fill="#fff"/><path d="M16 2 L16 7 L19 7" fill="rgba(255,255,255,0.3)"/><rect x="8" y="10" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.35)"/><rect x="8" y="13" width="6" height="1.5" rx="0.75" fill="rgba(255,255,255,0.35)"/><rect x="8" y="16" width="7" height="1.5" rx="0.75" fill="rgba(255,255,255,0.35)"/></svg>'),
      order: s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill="#fff"/></svg>')
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
