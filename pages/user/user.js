var app = getApp();
var API_URL = 'https://wechatbot-api.onrender.com';
var API_KEY = 'rnd_cIEZYlFoB5pJx4byk0tiONKcCBnk';

Page({
  data: {
    userInfo: null,
    isLoggedIn: false
  },

  onLoad: function() { this.checkLoginStatus(); },
  onShow: function() { this.checkLoginStatus(); },

  checkLoginStatus: function() {
    var userInfo = wx.getStorageSync('userInfo');
    this.setData({ userInfo: userInfo || null, isLoggedIn: !!userInfo });
  },

  login: function() {
    var that = this;
    wx.showLoading({ title: '登录中...' });
    wx.login({
      success: function(res) {
        if (res.code) {
          that.loginWithCode(res.code);
        } else {
          wx.hideLoading();
          that.loginAfterSuccess({ openid: 'wx_' + Date.now() });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.loginAfterSuccess({ openid: 'wx_' + Date.now() });
      }
    });
  },

  handleUserTap: function() {
    if (!this.data.isLoggedIn) this.login();
  },

  onChooseAvatar: function(e) {
    var avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) return;
    var userData = {};
    for (var k in this.data.userInfo) {
      if (this.data.userInfo.hasOwnProperty(k)) userData[k] = this.data.userInfo[k];
    }
    userData.avatarUrl = avatarUrl;
    app.setUserInfo(userData);
    this.setData({ userInfo: userData });
    this.saveUserToBackend(userData);
    wx.showToast({ title: '头像已更新', icon: 'success' });
  },

  handleNicknameTap: function() {
    if (!this.data.isLoggedIn) return;
    var that = this;
    wx.showModal({
      title: '修改昵称',
      placeholderText: '请输入昵称',
      editable: true,
      success: function(res) {
        if (res.confirm && res.content) {
          var nickName = res.content.trim();
          if (nickName) {
            var userData = {};
            for (var k in that.data.userInfo) {
              if (that.data.userInfo.hasOwnProperty(k)) userData[k] = that.data.userInfo[k];
            }
            userData.nickName = nickName;
            app.setUserInfo(userData);
            that.setData({ userInfo: userData });
            that.saveUserToBackend(userData);
            wx.showToast({ title: '昵称已更新', icon: 'success' });
          }
        }
      }
    });
  },

  saveUserToBackend: function(userData) {
    if (!userData.openid) return;
    wx.request({
      url: API_URL + '/api/users/' + userData.openid,
      method: 'POST',
      data: { nickName: userData.nickName, avatarUrl: userData.avatarUrl },
      success: function() {}
    });
  },

  handleLogout: function() {
    var that = this;
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: function(res) {
        if (res.confirm) {
          app.clearUserInfo();
          that.setData({ userInfo: null, isLoggedIn: false });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  handleDeleteAccount: function() {
    var that = this;
    wx.showModal({
      title: '注销账号',
      content: '确定要注销账号吗？此操作不可恢复！',
      success: function(res) {
        if (res.confirm) {
          wx.showModal({
            title: '确认注销',
            content: '再次确认注销，所有数据将被清除',
            success: function(res2) {
              if (res2.confirm) that.deleteAccount();
            }
          });
        }
      }
    });
  },

  deleteAccount: function() {
    var userInfo = this.data.userInfo;
    if (!userInfo || !userInfo.openid) return;
    var that = this;
    wx.request({
      url: API_URL + '/api/users/' + userInfo.openid,
      method: 'DELETE',
      header: { 'x-api-key': API_KEY },
      success: function() {
        wx.removeStorageSync('openid');
        app.clearUserInfo();
        that.setData({ userInfo: null, isLoggedIn: false });
        wx.showToast({ title: '账号已注销', icon: 'success' });
      },
      fail: function(res) {
        if (res.statusCode === 404) {
          wx.removeStorageSync('openid');
          app.clearUserInfo();
          that.setData({ userInfo: null, isLoggedIn: false });
          wx.showToast({ title: '账号已注销', icon: 'success' });
        } else {
          wx.showToast({ title: '注销失败', icon: 'none' });
        }
      }
    });
  },

  loginWithCode: function(code) {
    var that = this;
    wx.request({
      url: API_URL + '/api/wechat/openid?code=' + code,
      method: 'GET',
      success: function(res) {
        wx.hideLoading();
        if (res.data && res.data.openid) {
          wx.setStorageSync('openid', res.data.openid);
          that.loginWithOpenid(res.data.openid);
        } else {
          that.loginAfterSuccess({ openid: 'wx_' + Date.now() });
        }
      },
      fail: function() {
        wx.hideLoading();
        that.loginAfterSuccess({ openid: 'wx_' + Date.now() });
      }
    });
  },

  loginWithOpenid: function(openid) {
    var that = this;
    wx.request({
      url: API_URL + '/api/users/' + openid + '/wx-login',
      method: 'POST',
      header: { 'x-api-key': API_KEY },
      data: {},
      success: function(res) {
        var user = (res.data && res.data.user) ? res.data.user : { openid: openid };
        that.loginAfterSuccess(user);
      },
      fail: function() {
        that.loginAfterSuccess({ openid: openid });
      }
    });
  },

  loginAfterSuccess: function(userData) {
    var randomNick = '用户' + Math.floor(Math.random() * 9000 + 1000);
    var userInfo = {
      openid: userData.openid,
      nickName: userData.nickname || randomNick,
      avatarUrl: userData.avatarurl || ''
    };
    app.setUserInfo(userInfo);
    this.setData({ userInfo: userInfo, isLoggedIn: true });
    wx.hideLoading();
    wx.showToast({ title: '登录成功', icon: 'success' });
  }
});
