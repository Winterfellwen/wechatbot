const app = getApp();
const API_URL = 'https://wechatbot-api.onrender.com';

Page({
  data: {
    userInfo: null,
    myRank: 0,
    level: 1,
    totalScore: 0,
    currentTab: 'progress',
    rankList: [],
    wordsLearned: 0,
    lessonsCompleted: 0,
    streakDays: 0
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
    this.loadLeaderboard();
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    const progress = wx.getStorageSync('learningProgress') || {};
    this.setData({
      userInfo,
      wordsLearned: progress.wordsLearned || 0,
      lessonsCompleted: progress.lessonsCompleted || 0,
      streakDays: progress.streakDays || 0,
      level: progress.level || 1,
      totalScore: progress.totalScore || 0
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    this.sortLeaderboard(tab);
  },

  loadLeaderboard() {
    const leaderboard = wx.getStorageSync('leaderboard') || this.getSampleLeaderboard();
    this.setData({ rankList: leaderboard });
    this.calculateRank();
  },

  sortLeaderboard(tab) {
    let list = [...this.data.rankList];
    if (tab === 'progress') {
      list.sort((a, b) => b.progress - a.progress);
    } else if (tab === 'words') {
      list.sort((a, b) => b.words - a.words);
    } else {
      list.sort((a, b) => b.score - a.score);
    }
    this.setData({ rankList: list });
    this.calculateRank();
  },

  calculateRank() {
    const userInfo = this.data.userInfo;
    if (!userInfo) {
      this.setData({ myRank: '-' });
      return;
    }
    const list = this.data.rankList;
    const rank = list.findIndex(u => u.openid === userInfo.openid);
    this.setData({ myRank: rank >= 0 ? rank + 1 : '-' });
  },

  getSampleLeaderboard() {
    return [
      { openid: 'user1', nickName: '日语达人A', avatarUrl: '', level: 15, progress: 85, words: 1200, score: 12500 },
      { openid: 'user2', nickName: 'N1过过过', avatarUrl: '', level: 12, progress: 70, words: 980, score: 9800 },
      { openid: 'user3', nickName: '樱花酱', avatarUrl: '', level: 10, progress: 60, words: 850, score: 7200 },
      { openid: 'user4', nickName: '日语小白', avatarUrl: '', level: 5, progress: 30, words: 350, score: 2100 },
      { openid: 'user5', nickName: '学习爱好者', avatarUrl: '', level: 3, progress: 15, words: 180, score: 900 },
      { openid: 'user6', nickName: '新手入门', avatarUrl: '', level: 1, progress: 5, words: 50, score: 200 }
    ];
  }
});