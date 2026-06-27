Page({
  data: {
    greeting: '欢迎使用AI运势',
    isLoggedIn: false
  },

  onLoad() {
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('fortune_user_info');
    if (userInfo) {
      this.setData({
        isLoggedIn: true,
        greeting: `你好，${userInfo.nickName || '用户'}`
      });
    }
  },

  handleTypeTap(e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: `/fortune/pages/types/types?type=${type}`
    });
  },

  handleHistoryTap() {
    wx.navigateTo({
      url: '/fortune/pages/history/history'
    });
  },

  handleDailyTap() {
    wx.navigateTo({
      url: '/fortune/pages/daily/daily'
    });
  }
});
