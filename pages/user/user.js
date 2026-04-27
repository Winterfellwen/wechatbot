const app = getApp();
const API_URL = 'https://wechatbot-api.onrender.com';
const API_KEY = 'rnd_cIEZYlFoB5pJx4byk0tiONKcCBnk';

Page({
  data: {
    userInfo: null,
    isLoggedIn: false
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
  },

  checkLoginStatus: function() {
    var userInfo = wx.getStorageSync('userInfo');
    var isLoggedIn = !!userInfo;
    this.setData({
      userInfo: userInfo || null,
      isLoggedIn: isLoggedIn
    });
  },

  login() {
    var that = this;
    wx.getUserProfile({
      desc: '用于完善个人资料，获取您的微信头像和昵称',
      success: function(res) {
        var wxInfo = res.userInfo || {};
        that.doWxLogin(wxInfo);
      },
      fail: function() {
        that.doWxLogin({});
      }
    });
  },

  doWxLogin: function(wxInfo) {
    var that = this;
    wx.showLoading({ title: '登录中...' });
    wx.login({
      success: function(res) {
        if (res.code) {
          that.loginWithCode(res.code, wxInfo.avatarUrl || '', wxInfo.nickName || '');
        } else {
          wx.hideLoading();
          that.loginAfterSuccess({ openid: 'wx_' + Date.now() }, wxInfo.avatarUrl || '', wxInfo.nickName || '');
        }
      },
      fail: function() {
        wx.hideLoading();
        that.loginAfterSuccess({ openid: 'wx_' + Date.now() }, wxInfo.avatarUrl || '', wxInfo.nickName || '');
      }
    });
  },

  handleUserTap() {
    if (!this.data.isLoggedIn) {
      this.login();
    }
  },

  handleChooseAvatarTap: function() {
    if (!this.data.isLoggedIn) {
      this.login();
      return;
    }
    var that = this;
    wx.getUserProfile({
      desc: '用于设置头像',
      success: function(res) {
        var userInfo = res.userInfo;
        var userData = {};
        for (var k in that.data.userInfo) {
          if (that.data.userInfo.hasOwnProperty(k)) userData[k] = that.data.userInfo[k];
        }
        userData.avatarUrl = userInfo.avatarUrl;
        app.setUserInfo(userData);
        that.setData({ userInfo: userData });
        wx.showToast({ title: '头像已更新', icon: 'success' });
      },
      fail: function() {
        wx.showToast({ title: '需要授权头像', icon: 'none' });
      }
    });
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
            var userInfo = {};
            for (var k in that.data.userInfo) {
              if (that.data.userInfo.hasOwnProperty(k)) userInfo[k] = that.data.userInfo[k];
            }
            userInfo.nickName = nickName;
            app.setUserInfo(userInfo);
            that.setData({ userInfo: userInfo });
            that.saveUserToBackend(userInfo);
            wx.showToast({ title: '昵称已更新', icon: 'success' });
          }
        }
      }
    });
  },

  saveUserToBackend: function(userInfo) {
    if (!userInfo.openid) return;
    wx.request({
      url: API_URL + '/api/users/' + userInfo.openid,
      method: 'POST',
      data: { nickName: userInfo.nickName, avatarUrl: userInfo.avatarUrl },
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
              if (res2.confirm) {
                that.deleteAccount();
              }
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

  loginWithCode(code, avatarUrl, nickName) {
    var that = this;
    wx.request({
      url: API_URL + '/api/wechat/openid?code=' + code,
      method: 'GET',
      success: function(res) {
        wx.hideLoading();
        if (res.data && res.data.openid) {
          wx.setStorageSync('openid', res.data.openid);
          that.loginWithOpenid(res.data.openid, avatarUrl, nickName);
        } else {
          that.loginAfterSuccess({ openid: 'wx_' + Date.now() }, avatarUrl, nickName);
        }
      },
      fail: function() {
        wx.hideLoading();
        that.loginAfterSuccess({ openid: 'wx_' + Date.now() }, avatarUrl, nickName);
      }
    });
  },

  loginWithOpenid: function(openid, avatarUrl, nickName) {
    var that = this;
    wx.request({
      url: API_URL + '/api/users/' + openid + '/wx-login',
      method: 'POST',
      header: { 'x-api-key': API_KEY },
      data: {},
      success: function(res) {
        that.loginAfterSuccess(res.data && res.data.user || { openid: openid }, avatarUrl, nickName);
      },
      fail: function() {
        that.loginAfterSuccess({ openid: openid }, avatarUrl, nickName);
      }
    });
  },

  loginAfterSuccess: function(userData, avatarUrl, nickName) {
    var randomNick = '用户' + Math.floor(Math.random() * 9000 + 1000);
    var userInfo = {
      openid: userData.openid,
      nickName: nickName || userData.nickname || randomNick,
      avatarUrl: avatarUrl || userData.avatarurl || ''
    };
    
    app.setUserInfo(userInfo);
    this.setData({ userInfo: userInfo, isLoggedIn: true });
    wx.hideLoading();
    wx.showToast({ title: '登录成功', icon: 'success' });
  },

  showNicknameInput: function(userInfo, defaultNick) {
    var that = this;
    var initial = defaultNick || userInfo.nickName || '';
    wx.showModal({
      title: '设置昵称',
      placeholderText: '请输入昵称',
      editable: true,
      success: function(res) {
        if (res.confirm && res.content && res.content.trim()) {
          userInfo.nickName = res.content.trim();
          that.saveAndCompleteLogin(userInfo);
        } else if (defaultNick) {
          userInfo.nickName = defaultNick;
          that.saveAndCompleteLogin(userInfo);
        } else {
          that.showNicknameInput(userInfo, defaultNick);
        }
      },
      fail: function() {
        userInfo.nickName = defaultNick || '用户' + Date.now() % 10000;
        that.saveAndCompleteLogin(userInfo);
      }
    });
  },

  saveAndCompleteLogin: function(userInfo) {
    app.setUserInfo(userInfo);
    this.setData({ userInfo: userInfo, isLoggedIn: true });
    wx.showToast({ title: '登录成功', icon: 'success' });
  },

  completeLogin: function(userInfo) {
    app.setUserInfo(userInfo);
    this.setData({ userInfo: userInfo, isLoggedIn: true });
    wx.showToast({ title: '登录成功', icon: 'success' });
  }
});