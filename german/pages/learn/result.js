Page({
  data: {
    score: 0,
    total: 0,
    passed: false,
    wrongAnswers: [],
    percentage: 0
  },

  onLoad: function(options) {
    const score = parseInt(options.score) || 0;
    const total = parseInt(options.total) || 0;
    const passed = options.passed === 'true';
    let wrongAnswers = [];
    
    try {
      if (options.wrong) {
        wrongAnswers = JSON.parse(decodeURIComponent(options.wrong));
      }
    } catch(e) {
      wrongAnswers = [];
    }
    
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    
    this.setData({
      score: score,
      total: total,
      passed: passed,
      wrongAnswers: wrongAnswers,
      percentage: percentage
    });
  },

  goToReview: function() {
    wx.navigateTo({
      url: '/german/pages/learn/review'
    });
  },

  goToLearn: function() {
    wx.navigateBack();
  },

  retryChallenge: function() {
    const pages = getCurrentPages();
    const challengePage = pages.find(p => p.route.includes('challenge'));
    if (challengePage) {
      wx.navigateBack();
    } else {
      wx.redirectTo({
        url: '/german/pages/learn/learn'
      });
    }
  },

  nextLevel: function() {
    wx.switchTab({
      url: '/german/pages/learn/learn'
    });
  },

  onShareAppMessage: function() {
    const { score, total, passed } = this.data;
    return {
      title: passed ? `德语闯关通过！得分 ${score}/${total}` : `德语闯关得分 ${score}/${total}`,
      path: '/german/pages/learn/learn'
    };
  }
});