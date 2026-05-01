var loginLib = require('../../utils/login');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    showNickInput: false,
    nickName: ''
  },

  onShow: function () {
    var loggedIn = loginLib.isLoggedIn();
    this.setData({
      isLoggedIn: loggedIn,
      userInfo: loggedIn ? loginLib.getUserInfo() : null
    });
  },

  // --- Login ---
  handleLogin: function () {
    var that = this;
    wx.showLoading({ title: '登录中...' });
    loginLib.login().then(function (data) {
      wx.hideLoading();
      that.setData({ isLoggedIn: true, userInfo: data.user });
      wx.showToast({ title: '登录成功', icon: 'success' });
    }).catch(function (err) {
      wx.hideLoading();
      console.error('Login failed:', err);
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    });
  },

  // --- Avatar ---
  onChooseAvatar: function (e) {
    var avatarUrl = e.detail.avatarUrl;
    var that = this;
    loginLib.updateProfile({ avatarUrl: avatarUrl }).then(function (updated) {
      that.setData({ userInfo: updated });
      wx.showToast({ title: '头像已更新', icon: 'success' });
    }).catch(function () {
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
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
              loginLib.logout();
              that.setData({ isLoggedIn: false, userInfo: null });
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
