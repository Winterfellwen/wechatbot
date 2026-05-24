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
    console.log('[DEBUG] index.onShow: loggedIn=', loggedIn, ', getUserInfo=', JSON.stringify(user));
    var displayUserInfo = validation.getDisplayUserInfo(user, '游客');
    console.log('[DEBUG] index.onShow: displayUserInfo=', JSON.stringify(displayUserInfo));
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
    var display = this.data.displayUserInfo;
    if (display && display.avatarUrl !== '/images/avatar-default.png') {
      display.avatarUrl = '/images/avatar-default.png';
      this.setData({ displayUserInfo: display });
    }
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
      learn: s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="a" x1="0" y1="0" x2="100" y2="100"><stop offset="0" stop-color="#A78BFA"/><stop offset="100" stop-color="#7C3AED"/></linearGradient></defs><rect x="14" y="14" width="72" height="72" rx="20" fill="url(#a)"/><rect x="14" y="14" width="72" height="72" rx="20" fill="none" stroke="white" stroke-width="3" opacity="0.3"/><path d="M50 30 C50 30 32 36 32 44 L32 64 C32 64 40 60 50 60 C60 60 68 64 68 64 L68 44 C68 36 50 30 50 30Z" fill="white" opacity="0.9"/></svg>'),
      tool: s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="a" x1="0" y1="0" x2="100" y2="100"><stop offset="0" stop-color="#2DD4BF"/><stop offset="100" stop-color="#0D9488"/></linearGradient></defs><rect x="14" y="14" width="72" height="72" rx="20" fill="url(#a)"/><rect x="14" y="14" width="72" height="72" rx="20" fill="none" stroke="white" stroke-width="3" opacity="0.3"/><rect x="44" y="28" width="12" height="44" rx="5" fill="white" opacity="0.9"/><rect x="28" y="44" width="44" height="12" rx="5" fill="white" opacity="0.9"/></svg>'),
      order: s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="a" x1="0" y1="0" x2="100" y2="100"><stop offset="0" stop-color="#FB923C"/><stop offset="100" stop-color="#EA580C"/></linearGradient></defs><rect x="14" y="14" width="72" height="72" rx="20" fill="url(#a)"/><rect x="14" y="14" width="72" height="72" rx="20" fill="none" stroke="white" stroke-width="3" opacity="0.3"/><rect x="32" y="28" width="10" height="10" rx="3" fill="white" opacity="0.9"/><rect x="46" y="30" width="22" height="6" rx="3" fill="white" opacity="0.9"/><rect x="32" y="46" width="10" height="10" rx="3" fill="white" opacity="0.9"/><rect x="46" y="48" width="22" height="6" rx="3" fill="white" opacity="0.9"/><rect x="32" y="64" width="10" height="10" rx="3" fill="white" opacity="0.9"/><rect x="46" y="66" width="16" height="6" rx="3" fill="white" opacity="0.9"/></svg>')
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
      if (!loginLib.isLoggedIn()) {
        wx.showModal({
          title: '需要注册',
          content: '使用AI点菜需要先注册账号',
          confirmText: '去注册',
          cancelText: '取消',
          success: function(res) {
            if (res.confirm) wx.switchTab({ url: '/pages/user/user' });
          }
        });
        return;
      }
      wx.navigateTo({ url: '/ai-order/pages/index/index' });
    } else if (type === 'developing') {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  }
});