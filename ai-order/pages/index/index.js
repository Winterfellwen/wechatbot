// ai-order/pages/index/index.js

Page({
  data: {
    currentMerchant: '川味小厨（演示）',
    merchantId: 'demo-restaurant-1'
  },

  onLoad: function() {
    var saved = wx.getStorageSync('ai-order-merchant');
    if (saved) {
      this.setData({
        currentMerchant: saved.name,
        merchantId: saved.id
      });
    }
  },

  onEnterMerchant: function() {
    wx.navigateTo({
      url: '/ai-order/pages/merchant/merchant?merchantId=' + this.data.merchantId
    });
  },

  onEnterCustomer: function() {
    wx.navigateTo({
      url: '/ai-order/pages/customer/customer?merchantId=' + this.data.merchantId
    });
  },

  onChangeMerchant: function() {
    wx.showToast({ title: '商户切换功能开发中', icon: 'none' });
  }
});
