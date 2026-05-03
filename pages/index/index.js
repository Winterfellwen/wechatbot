var loginLib = require('../../utils/login');

Page({
  data: {
    userInfo: null,
    isLoggedIn: false
  },

  onShow: function () {
    this.setData({
      isLoggedIn: loginLib.isLoggedIn(),
      userInfo: loginLib.getUserInfo()
    });
  },

  handleUserTap: function () {
    wx.switchTab({ url: '/pages/user/user' });
  },

  handleEntryTap: function (e) {
    var type = e.currentTarget.dataset.type;
    if (type === 'japanese') {
      wx.navigateTo({ url: '/japanese/pages/learn/learn' });
    } else if (type === 'german') {
      wx.navigateTo({ url: '/german/pages/learn/learn' });
    } else if (type === 'word') {
      wx.navigateTo({ url: '/word/pages/index/index' });
    } else if (type === 'pdf') {
      wx.navigateTo({ url: '/pdf/pages/index/index' });
    } else if (type === 'developing') {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  }
});
