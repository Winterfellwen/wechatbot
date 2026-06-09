Page({
  handleTap: function (e) {
    var type = e.currentTarget.dataset.type;
    if (type === 'japanese') {
      wx.navigateTo({ url: '/japanese/pages/learn/learn' });
    } else if (type === 'german') {
      wx.navigateTo({ url: '/german/pages/learn/learn' });
    } else if (type === 'teacher') {
      wx.navigateTo({ url: '/smart-teacher/pages/chat/chat' });
    }
  }
});
