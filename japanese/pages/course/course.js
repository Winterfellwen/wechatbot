const app = getApp();

Page({
  data: {
    activeTab: 'textbook',
    currentTab: 'course',
    textbooks: [
      { id: 1, title: '日语入门', subtitle: 'N5 · 第1-20课', cover: '#4CAF50', level: 'N5', desc: '从五十音图到日常会话', progress: 0 },
      { id: 2, title: '日语初级', subtitle: 'N4 · 第21-38课', cover: '#2196F3', level: 'N4', desc: '旅行、文化、应用会话', progress: 0 },
      { id: 3, title: '日语中级', subtitle: 'N3 · 第39-56课', cover: '#FF9800', level: 'N3', desc: '语法深化、表达拓展', progress: 0 },
      { id: 4, title: '日语高级', subtitle: 'N2 · 第57-66课', cover: '#9C27B0', level: 'N2', desc: '商务日语、辩论、新闻', progress: 0 },
      { id: 5, title: '日语精通', subtitle: 'N1 · 第67-76课', cover: '#F44336', level: 'N1', desc: '学术日语、翻译实践', progress: 0 }
    ]
  },

  onShow() {
    const completed = wx.getStorageSync('completedLessons') || [];
    const texts = this.data.textbooks.map(b => {
      const start = b.id === 1 ? 1 : b.id === 2 ? 21 : b.id === 3 ? 39 : b.id === 4 ? 57 : 67;
      const end = b.id === 1 ? 20 : b.id === 2 ? 38 : b.id === 3 ? 56 : b.id === 4 ? 66 : 76;
      let done = 0;
      for (let i = start; i <= end; i++) {
        if (completed.indexOf(i) !== -1) done++;
      }
      return { ...b, progress: Math.round(done / (end - start + 1) * 100) };
    });
    this.setData({ textbooks: texts });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  openBook(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/japanese/pages/textbook/textbook' });
  },

  goToWordbook() { wx.navigateTo({ url: '/japanese/pages/wordbook/wordbook' }); },
  goToGrammar() { wx.navigateTo({ url: '/japanese/pages/grammar/grammar' }); },

  goToLesson() { wx.navigateTo({ url: '/japanese/pages/learn/learn' }); },
  goToCourse() { wx.navigateTo({ url: '/japanese/pages/course/course' }); },
  goToAI() { wx.navigateTo({ url: '/japanese/pages/aichat/aichat' }); },
  goToRank() { wx.navigateTo({ url: '/japanese/pages/leaderboard/leaderboard' }); }
});
