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

  handleUserTap() {
    if (this.data.isLoggedIn) {
      wx.switchTab({ url: '/pages/user/user' });
    } else {
      this.login();
    }
  },

  login() {
    wx.showLoading({ title: '登录中...' });
    
    wx.login({
      success: (res) => {
        if (res.code) {
          this.loginWithCode(res.code);
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

loginWithCode(code) {
    wx.showLoading({ title: '登录中...' });

    wx.getSystemInfo({
      success: (sysInfo) => {
        const deviceId = sysInfo.deviceId || sysInfo.system + '_' + sysInfo.model;
        const OPENID = 'user_' + Math.abs(deviceId.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
        wx.setStorageSync('openid', OPENID);

        wx.request({
          url: `${API_URL}/api/users/${OPENID}/wx-login`,
          method: 'POST',
          header: {
            'Authorization': API_KEY,
            'Content-Type': 'application/json'
          },
          data: { code: code, deviceInfo: sysInfo.brand + ' ' + sysInfo.model },
          success: (res) => {
            wx.hideLoading();
            if (res.data && res.data.user) {
              const userInfo = {
                openid: res.data.user.openid,
                nickName: res.data.user.nickname || '微信用户',
                avatarUrl: res.data.user.avatarurl || ''
              };
              app.setUserInfo(userInfo);
              this.setData({ userInfo: userInfo, isLoggedIn: true });
              wx.showToast({ title: '登录成功', icon: 'success' });
            } else {
              this.simpleLogin(OPENID);
            }
          },
          fail: () => {
            wx.hideLoading();
            this.simpleLogin(OPENID);
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        this.simpleLogin('wx_' + Date.now());
      }
    });
  },

  simpleLogin(openid) {
    const userInfo = {
      openid: openid,
      nickName: '微信用户',
      avatarUrl: ''
    };
    app.setUserInfo(userInfo);
    this.setData({ userInfo: userInfo, isLoggedIn: true });
    wx.showToast({ title: '登录成功', icon: 'success' });
  },

  handleUserTap() {
    if (this.data.isLoggedIn) {
      wx.switchTab({ url: '/pages/user/user' });
    }
  },

  handleChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    if (avatarUrl) {
      const userInfo = { ...this.data.userInfo, avatarUrl: avatarUrl };
      app.setUserInfo(userInfo);
      this.setData({ userInfo: userInfo });
      wx.showToast({ title: '头像已更新', icon: 'success' });
    }
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