Page({
  data: {
    cart: [],
    totalPrice: 0,
    merchantId: '',
    orderNote: ''
  },

  onLoad: function(options) {
    var that = this;
    var merchantId = options.merchantId || '';
    var cartKey = 'ai-order-cart-' + merchantId;
    var saved = wx.getStorageSync(cartKey);
    var note = wx.getStorageSync('ai-order-note') || '';
    if (saved) {
      var cart = saved.cart || [];
      var total = saved.totalPrice || 0;
      var dishes = [];
      for (var i = 0; i < cart.length; i++) {
        dishes.push({
          id: cart[i].id,
          name: cart[i].name,
          price: cart[i].price,
          quantity: cart[i].quantity,
          subtotal: (cart[i].price * cart[i].quantity).toFixed(2)
        });
      }
      that.setData({
        cart: cart,
        dishes: dishes,
        totalPrice: total,
        totalDisplay: total.toFixed(2),
        merchantId: merchantId,
        orderNote: note
      });
    }
    wx.removeStorageSync('ai-order-note');
  },

  onBack: function() {
    wx.navigateBack();
  },

  onVirtualPay: function() {
    var that = this;
    var cart = this.data.cart;
    if (cart.length === 0) return;
    var dishNames = [];
    for (var i = 0; i < cart.length; i++) {
      for (var j = 0; j < cart[i].quantity; j++) {
        dishNames.push(cart[i].name);
      }
    }
    wx.setStorageSync('ai-order-last-order', { dishes: dishNames, total: this.data.totalPrice });
    wx.setStorageSync('ai-order-completed', true);
    wx.showModal({
      title: '下单成功',
      content: '✅ 订单已创建！\n\n已点：' + dishNames.join('、') + '\n合计：¥' + that.data.totalPrice + '\n\n（此为演示环境，未进行真实扣款）',
      showCancel: false,
      success: function() {
        wx.navigateBack();
      }
    });
  }
});