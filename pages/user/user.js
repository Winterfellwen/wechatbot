var loginLib = require('../../utils/login');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    displayUserInfo: null,
    showNickInput: false,
    nickName: ''
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
    if (!user) return null;
    var display = { avatarUrl: '/images/avatar-default.png', nickName: '微信用户' };
    if (this.isValidAvatarUrl(user.avatarUrl)) {
      display.avatarUrl = user.avatarUrl;
    }
    if (this.isValidNickname(user.nickName)) {
      display.nickName = user.nickName;
    }
    return display;
  },

  validateUserInfo: function(user) {
    var needsUpdate = false;
    var updates = {};
    if (user && !this.isValidAvatarUrl(user.avatarUrl)) {
      updates.avatarUrl = '/images/avatar-default.png';
      needsUpdate = true;
    }
    if (user && !this.isValidNickname(user.nickName)) {
      updates.nickName = '';
      needsUpdate = true;
    }
    return { needsUpdate: needsUpdate, updates: updates };
  },

  onShow: function () {
    var that = this;
    var loggedIn = loginLib.isLoggedIn();
    var user = loggedIn ? loginLib.getUserInfo() : null;
    var displayUserInfo = this.getDisplayUserInfo(user);
    if (user) {
      var validation = this.validateUserInfo(user);
      if (validation.needsUpdate) {
        user = Object.assign({}, user, validation.updates);
        loginLib.updateProfile(validation.updates).catch(function(){});
      }
    }
    this.setData({
      isLoggedIn: loggedIn,
      userInfo: user,
      displayUserInfo: displayUserInfo,
      showNickInput: user && !this.isValidNickname(user.nickName) || false
    });
  },

  // --- Login ---
  handleLogin: function () {
    var that = this;
    var isNewUser = !wx.getStorageSync('hasSetNickname');
    wx.showLoading({ title: '登录中...' });
    loginLib.login().then(function (data) {
      wx.hideLoading();
      var user = data.user;
      var validation = that.validateUserInfo(user);
      if (validation.needsUpdate) {
        user = Object.assign({}, user, validation.updates);
        loginLib.updateProfile(validation.updates).catch(function(){});
      }
      var displayUserInfo = that.getDisplayUserInfo(user);
      that.setData({ isLoggedIn: true, userInfo: user, displayUserInfo: displayUserInfo });
      if (isNewUser && (!user.nickName || user.nickName.indexOf('微信用户') === 0)) {
        setTimeout(function () {
          that.showNickInput();
        }, 500);
      }
      wx.showToast({ title: '登录成功', icon: 'success' });
    }).catch(function (err) {
      wx.hideLoading();
      console.error('Login failed:', err);
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    });
  },

  // --- Avatar ---
  onAvatarError: function () {
    var user = this.data.userInfo;
    if (user) {
      var updated = Object.assign({}, user, { avatarUrl: '/images/avatar-default.png' });
      this.setData({ userInfo: updated, displayUserInfo: this.getDisplayUserInfo(updated) });
    }
  },

  onChooseAvatar: function (e) {
    var avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) {
      wx.showToast({ title: '选择头像失败', icon: 'none' });
      return;
    }
    var user = this.data.userInfo || {};
    var updated = Object.assign({}, user, { avatarUrl: avatarUrl });
    wx.setStorageSync('auth_user', updated);
    var displayUserInfo = this.getDisplayUserInfo(updated);
    this.setData({ userInfo: updated, displayUserInfo: displayUserInfo });
    wx.showToast({ title: '头像已更新', icon: 'success' });
  },

  // --- Nickname ---
  showNickInput: function () {
    this.setData({ showNickInput: true, nickName: (this.data.userInfo && this.data.userInfo.nickName) || '' });
  },

  onNickInput: function (e) {
    this.setData({ nickName: e.detail.value });
  },

  confirmNickname: function () {
    var that = this;
    var nickName = this.data.nickName.trim();
    if (!nickName) return;
    loginLib.updateProfile({ nickName: nickName }).then(function (updated) {
      wx.setStorageSync('hasSetNickname', true);
      that.setData({ showNickInput: false, userInfo: updated });
      wx.showToast({ title: '昵称已更新', icon: 'success' });
    }).catch(function () {
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  cancelNickname: function () {
    this.setData({ showNickInput: false });
  },

  // --- Logout ---
  handleLogout: function () {
    var that = this;
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: function (res) {
        if (res.confirm) {
          loginLib.logout();
          that.setData({ isLoggedIn: false, userInfo: null });
          wx.showToast({ title: '已退出', icon: 'none' });
        }
      }
    });
  },

  // --- Delete account ---
  handleDeleteAccount: function () {
    var that = this;
    wx.showModal({
      title: '注销账号',
      content: '此操作不可恢复，确定要注销账号吗？',
      success: function (res) {
        if (!res.confirm) return;
        wx.showModal({
          title: '再次确认',
          content: '注销后所有数据将被永久删除',
          success: function (res2) {
            if (!res2.confirm) return;
            loginLib.deleteAccount().then(function () {
              // 服务端已清 token，只清理本地存储即可，不再调 logout 接口
              wx.removeStorageSync('auth_token');
              wx.removeStorageSync('auth_user');
              var app = getApp();
              if (app) app.globalData.userInfo = null;
              that.setData({ isLoggedIn: false, userInfo: null, displayUserInfo: null });
              wx.showToast({ title: '账号已注销', icon: 'success' });
            }).catch(function () {
              wx.showToast({ title: '注销失败', icon: 'none' });
            });
          }
        });
      }
    });
  }
});
