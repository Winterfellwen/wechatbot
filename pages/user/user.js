const app = getApp();

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
    if (!this.data.isLoggedIn) {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  handleChooseAvatar(e) {
    if (!this.data.isLoggedIn) return;
    const avatarUrl = e.detail.avatarUrl;
    if (avatarUrl) {
      const userInfo = { ...this.data.userInfo, avatarUrl: avatarUrl };
      app.setUserInfo(userInfo);
      this.setData({ userInfo: userInfo });
      wx.showToast({ title: '头像已更新', icon: 'success' });
    }
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
  }
});