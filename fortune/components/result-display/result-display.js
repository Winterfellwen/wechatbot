Component({
  properties: {
    result: {
      type: String,
      value: ''
    },
    type: {
      type: String,
      value: ''
    }
  },

  methods: {
    handleCopy() {
      wx.setClipboardData({
        data: this.properties.result,
        success() {
          wx.showToast({
            title: '已复制',
            icon: 'success'
          });
        }
      });
    },

    handleShare() {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      });
    }
  }
});
