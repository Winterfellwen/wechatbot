var app = getApp();

Page({
  data: {
    userInfo: null,
    myRank: '-',
    level: 1,
    totalScore: 0,
    currentTab: 'score',
    rankList: [],
    wordsLearned: 0,
    lessonsCompleted: 0,
    streakDays: 0,
    isRealData: false
  },

  onLoad: function() {
    this.loadData();
  },

  onShow: function() {
    this.loadData();
  },

  loadData: function() {
    var userInfo = wx.getStorageSync('userInfo');
    var progress = wx.getStorageSync('learningProgress') || {};
    var completed = wx.getStorageSync('completedLessons') || [];
    
    // Count only mastered words, not all words
    var wordbook = wx.getStorageSync('wordbook') || [];
    var masteredCount = 0;
    for (var i = 0; i < wordbook.length; i++) {
      if (wordbook[i].mastered) masteredCount++;
    }

    // Check if real leaderboard data exists
    var realData = wx.getStorageSync('leaderboard_real');
    var isReal = false;
    var leaderboard;
    if (realData && realData.length) {
      leaderboard = realData;
      isReal = true;
    } else {
      leaderboard = this.getSampleData();
      isReal = false;
    }

    this.setData({
      userInfo: userInfo,
      wordsLearned: masteredCount,
      lessonsCompleted: completed.length,
      streakDays: progress.streakDays || 0,
      level: progress.level || 1,
      totalScore: progress.exp || 0,
      rankList: leaderboard,
      isRealData: isReal
    });
    this.calculateRank();
  },

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab;
    var list = this.data.rankList.slice();
    if (tab === 'score') {
      list.sort(function(a, b) { return b.score - a.score; });
    } else if (tab === 'words') {
      list.sort(function(a, b) { return b.words - a.words; });
    } else {
      list.sort(function(a, b) { return b.progress - a.progress; });
    }
    this.setData({ currentTab: tab, rankList: list });
    this.calculateRank();
  },

  calculateRank: function() {
    var userInfo = this.data.userInfo;
    if (!userInfo || !userInfo.openid) {
      this.setData({ myRank: '-' });
      return;
    }
    var list = this.data.rankList;
    for (var i = 0; i < list.length; i++) {
      if (list[i].openid === userInfo.openid) {
        this.setData({ myRank: i + 1 });
        return;
      }
    }
    this.setData({ myRank: '-' });
  },

  getSampleData: function() {
    return [
      { openid: 'sample1', nickName: '日语达人A', avatarUrl: '', level: 15, score: 12500, words: 1200, progress: 85 },
      { openid: 'sample2', nickName: 'N1过过过', avatarUrl: '', level: 12, score: 9800, words: 980, progress: 70 },
      { openid: 'sample3', nickName: '樱花酱', avatarUrl: '', level: 10, score: 7200, words: 850, progress: 60 },
      { openid: 'sample4', nickName: '日语小白', avatarUrl: '', level: 5, score: 2100, words: 350, progress: 30 },
      { openid: 'sample5', nickName: '学习爱好者', avatarUrl: '', level: 3, score: 900, words: 180, progress: 15 },
      { openid: 'sample6', nickName: '新手入门', avatarUrl: '', level: 1, score: 200, words: 50, progress: 5 }
    ];
  },

  goToLesson: function() { wx.redirectTo({ url: '/japanese/pages/learn/learn' }); },
  goToCourse: function() { wx.redirectTo({ url: '/japanese/pages/course/course' }); },
  goToRank: function() { wx.redirectTo({ url: '/japanese/pages/leaderboard/leaderboard' }); }
});
