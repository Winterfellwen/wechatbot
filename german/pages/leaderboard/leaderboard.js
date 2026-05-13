Page({
  data: {
    myRank: '-',
    nickName: '',
    userInitial: '?',
    totalScore: 0,
    level: 1,
    currentTab: 'score',
    rankList: []
  },

  onLoad: function() {
    this.loadRankData();
  },

  onShow: function() {
    this.loadRankData();
  },

  loadRankData: function() {
    var progress = wx.getStorageSync('german_user_progress');
    var score = (progress && progress.totalPoints) || 0;
    this.setData({
      totalScore: score,
      level: (progress && progress.currentLevelIndex) || 1,
      nickName: '我',
      userInitial: 'W'
    });

    var mockData = [];
    for (var i = 0; i < 5; i++) {
      mockData.push({
        name: ['小明', '小红', '小张', '小李', '小王'][i],
        level: 3 + i,
        score: Math.max(0, score - i * 30),
        initial: ['X', 'H', 'Z', 'L', 'W'][i]
      });
    }
    mockData.sort(function(a, b) { return b.score - a.score; });
    var myIdx = mockData.findIndex(function(item) { return item.name === '我'; });
    if (myIdx === -1) {
      mockData.push({ name: '我', level: 1, score: score, initial: 'W' });
      mockData.sort(function(a, b) { return b.score - a.score; });
    }
    var rank = mockData.findIndex(function(item) { return item.name === '我'; }) + 1;
    this.setData({
      rankList: mockData,
      myRank: rank
    });
  },

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    this.loadRankData();
  }
});