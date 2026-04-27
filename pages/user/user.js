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
          this.loginWithCode(res.code);
        } else {
          wx.hideLoading();
          this.loginAfterSuccess({ openid: 'wx_' + Date.now() });
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

  handleChooseAvatarTap() {
    if (!this.data.isLoggedIn) {
      this.login();
      return;
    }
    wx.getUserProfile({
      desc: '用于设置头像',
      success: (res) => {
        const userInfo = res.userInfo;
        const userData = { ...this.data.userInfo, avatarUrl: userInfo.avatarUrl };
        app.setUserInfo(userData);
        this.setData({ userInfo: userData });
        wx.showToast({ title: '头像已更新', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '需要授权头像', icon: 'none' });
      }
    });
  },

  handleNicknameTap() {
    if (!this.data.isLoggedIn) return;
    wx.showModal({
      title: '修改昵称',
      placeholderText: '请输入昵称',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const nickName = res.content.trim();
          if (nickName) {
            const userInfo = { ...this.data.userInfo, nickName: nickName };
            app.setUserInfo(userInfo);
            this.setData({ userInfo: userInfo });
            this.saveUserToBackend(userInfo);
            wx.showToast({ title: '昵称已更新', icon: 'success' });
          }
        }
      }
    });
  },

  saveUserToBackend(userInfo) {
    if (!userInfo.openid) return;
    wx.request({
      url: `${API_URL}/api/users/${userInfo.openid}`,
      method: 'POST',
      data: { nickName: userInfo.nickName, avatarUrl: userInfo.avatarUrl },
      success: () => {}
    });
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.clearUserInfo();
          this.setData({ userInfo: null, isLoggedIn: false });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  loginWithCode(code, avatarUrl) {
    let userWxInfo = null;
    if (!code && avatarUrl && avatarUrl.includes('://')) {
    } else if (avatarUrl && avatarUrl.includes('://')) {
      userWxInfo = { avatarUrl: avatarUrl, nickName: '' };
    }
    wx.request({
      url: `${API_URL}/api/wechat/openid?code=${code}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.openid) {
          wx.setStorageSync('openid', res.data.openid);
          this.loginWithOpenid(res.data.openid, userWxInfo?.avatarUrl, userWxInfo?.nickName);
        } else {
          this.loginAfterSuccess({ openid: 'wx_' + Date.now() }, userWxInfo?.avatarUrl || '');
        }
      },
      fail: () => {
        wx.hideLoading();
        this.loginAfterSuccess({ openid: 'wx_' + Date.now() }, userWxInfo?.avatarUrl || '');
      }
    });
  },

  loginWithOpenid(openid, avatarUrl, nickName) {
    wx.request({
      url: `${API_URL}/api/users/${openid}/wx-login`,
      method: 'POST',
      header: { 'x-api-key': API_KEY },
      data: {},
      success: (res) => {
        this.loginAfterSuccess(res.data?.user || { openid: openid }, avatarUrl, nickName);
      },
      fail: () => {
        this.loginAfterSuccess({ openid: openid }, avatarUrl, nickName);
      }
    });
  },

  loginAfterSuccess(userData, avatarUrl, nickName) {
    const randomNick = '用户' + Math.floor(Math.random() * 9000 + 1000);
    const userInfo = {
      openid: userData.openid,
      nickName: nickName || userData.nickname || randomNick,
      avatarUrl: avatarUrl || userData.avatarurl || ''
    };
    
    app.setUserInfo(userInfo);
    this.setData({ userInfo: userInfo, isLoggedIn: true });
    wx.hideLoading();
    wx.showToast({ title: '登录成功', icon: 'success' });
  },

  showNicknameInput(userInfo, defaultNick) {
    const initial = defaultNick || userInfo.nickName || '';
    wx.showModal({
      title: '设置昵称',
      placeholderText: '请输入昵称',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          userInfo.nickName = res.content.trim();
          this.saveAndCompleteLogin(userInfo);
        } else if (defaultNick) {
          userInfo.nickName = defaultNick;
          this.saveAndCompleteLogin(userInfo);
        } else {
          this.showNicknameInput(userInfo, defaultNick);
        }
      },
      fail: () => {
        userInfo.nickName = defaultNick || '用户' + Date.now() % 10000;
        this.saveAndCompleteLogin(userInfo);
      }
    });
  },

  saveAndCompleteLogin(userInfo) {
    app.setUserInfo(userInfo);
    this.setData({ userInfo: userInfo, isLoggedIn: true });
    wx.showToast({ title: '登录成功', icon: 'success' });
  },

  completeLogin(userInfo) {
    app.setUserInfo(userInfo);
    this.setData({ userInfo: userInfo, isLoggedIn: true });
    wx.showToast({ title: '登录成功', icon: 'success' });
  }
});