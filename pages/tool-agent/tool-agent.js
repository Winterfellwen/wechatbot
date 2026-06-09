Page({
  handleTap: function (e) {
    var type = e.currentTarget.dataset.type;
    if (type === 'word') {
      wx.navigateTo({ url: '/word/pages/index/index' });
    } else if (type === 'pdf') {
      wx.navigateTo({ url: '/pdf/pages/index/index' });
    } else if (type === 'ai-order') {
      wx.navigateTo({ url: '/ai-order/pages/index/index' });
    }
  }
});
