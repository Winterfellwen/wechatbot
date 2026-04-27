const app = getApp();

Page({
  data: {
    currentTab: 'course',
    wordCount: 0,
    masteredCount: 0,
    grammarCount: 264
  },

  onShow() {
    const wordbook = wx.getStorageSync('wordbook');
    if (wordbook && wordbook.length) {
      const mastered = wordbook.filter(w => w.mastered).length;
      this.setData({
        wordCount: wordbook.length,
        masteredCount: mastered
      });
    }
  },

  goToTextbook() { wx.navigateTo({ url: '/japanese/pages/textbook/textbook' }); },
  goToWordbook() { wx.navigateTo({ url: '/japanese/pages/wordbook/wordbook' }); },
  goToGrammar() { wx.navigateTo({ url: '/japanese/pages/grammar/grammar' }); },

  goToLesson() { wx.redirectTo({ url: '/japanese/pages/learn/learn' }); },
  goToCourse() { wx.redirectTo({ url: '/japanese/pages/course/course' }); },
  goToAI() { wx.redirectTo({ url: '/japanese/pages/aichat/aichat' }); },
  goToRank() { wx.navigateTo({ url: '/japanese/pages/leaderboard/leaderboard' }); }
});
