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

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const isLoggedIn = !!userInfo;
    this.setData({
      userInfo: userInfo || null,
      isLoggedIn: isLoggedIn
    });
  },

login() {
    wx.showLoading({ title: '登录中...' });
    wx.login({
      success: (res) => {
        if (res.code) {
          this.loginWithCode(res.code, '');
        } else {
          wx.hideLoading();
          wx.showToast({ title: '登录失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '登录失败', icon: 'none' });
      }
    });
  },

  handleUserTap() {
    if (!this.data.isLoggedIn) {
      this.login();
    }
  },

  loginWithCode(code, avatarUrl) {
    wx.request({
      url: `${API_URL}/api/wechat/openid?code=${code}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.openid) {
          const openid = res.data.openid;
          this.checkOrCreateUser(openid, avatarUrl);
        } else {
          wx.showToast({ title: '登录失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  checkOrCreateUser(openid, avatarUrl) {
    wx.request({
      url: `${API_URL}/api/users/${openid}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const userInfo = res.data;
          app.setUserInfo(userInfo);
          this.setData({ userInfo, isLoggedIn: true });
        } else if (res.statusCode === 404) {
          this.promptNickname(openid, avatarUrl);
        }
      },
      fail: () => {
        this.promptNickname(openid, avatarUrl);
      }
    });
  },

  promptNickname(openid, avatarUrl) {
    wx.showModal({
      title: '设置昵称',
      editable: true,
      placeholderText: '请输入昵称',
      success: (res) => {
        if (res.content && res.content.trim()) {
          this.createUser(openid, avatarUrl, res.content.trim());
        } else {
          wx.showToast({ title: '昵称不能为空', icon: 'none' });
        }
      }
    });
  },

  createUser(openid, avatarUrl, nickName) {
    wx.request({
      url: `${API_URL}/api/users/${openid}`,
      method: 'POST',
      data: { openid, nickName, avatarUrl },
      success: (res) => {
        if (res.data) {
          const userInfo = { openid, nickName, avatarUrl };
          app.setUserInfo(userInfo);
          this.setData({ userInfo, isLoggedIn: true });
          wx.showToast({ title: '登录成功', icon: 'success' });
        }
      }
    });
  },

  handleEntryTap(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'developing') {
      wx.showToast({ title: '功能开发中', icon: 'none' });
      return;
    }
    wx.showToast({ title: '功能待开发', icon: 'none' });
  }
});