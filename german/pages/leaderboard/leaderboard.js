Page({
  data: {
    rankList: []
  },

  onLoad: function() {
    this.setData({
      rankList: [
        { rank: 1, name: '德语达人', exp: 1000 },
        { rank: 2, name: '德语新人', exp: 500 },
        { rank: 3, name: '德语爱好者', exp: 300 }
      ]
    });
  },

  goToLearn: function() { wx.redirectTo({ url: '/german/pages/learn/learn' }); },
  goToCourse: function() { wx.redirectTo({ url: '/german/pages/course/course' }); },
  goToAI: function() { wx.redirectTo({ url: '/german/pages/aichat/aichat' }); }
});