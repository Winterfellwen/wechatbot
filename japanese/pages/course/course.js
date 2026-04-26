Page({
  data: {
    activeTab: 'textbook',
    currentTab: 'course',
    textbooks: [
      { id: 1, title: '新编日语教程第一册', desc: '入门基础' },
      { id: 2, title: '新编日语教程第二册', desc: '进阶内容' },
      { id: 3, title: '新编日语教程第三册', desc: '中级日语' },
      { id: 4, title: '新编日语教程第四册', desc: '中高级' },
      { id: 5, title: '新编日语教程第五册', desc: '高级日语' }
    ]
  },

  switchTab(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  openBook(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/japanese/pages/textbook/textbook'
    });
  },

  goToWordbook() {
    wx.navigateTo({ url: '/japanese/pages/wordbook/wordbook' });
  },

  goToGrammar() {
    wx.navigateTo({ url: '/japanese/pages/grammar/grammar' });
  },

  goToLesson() {
    wx.redirectTo({ url: '/japanese/pages/learn/learn' });
  },

  goToCourse() {
    wx.redirectTo({ url: '/japanese/pages/course/course' });
  },

  goToAI() {
    wx.redirectTo({ url: '/japanese/pages/aichat/aichat' });
  },

  goToRank() {
    wx.navigateTo({ url: '/japanese/pages/leaderboard/leaderboard' });
  }
});