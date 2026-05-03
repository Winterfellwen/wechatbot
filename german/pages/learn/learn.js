const storage = require('../../utils/storage');

Page({
  data: {
    levels: [],
    currentLevel: 'a1',
    currentLevelIndex: 1,
    userProgress: null,
    reviewCount: 0,
    showLevelSelect: true
  },

  onLoad: function(options) {
    this.loadLevels();
    this.loadUserProgress();
  },

  onShow: function() {
    this.loadUserProgress();
  },

  loadLevels: function() {
    this.setData({
      levels: [
        { id: 'a1', name: 'A1 基础', description: '掌握基础词汇和简单语法', total: 15 },
        { id: 'a2', name: 'A2 进阶', description: '扩展词汇和日常交流', total: 15 },
        { id: 'b1', name: 'B1 中级', description: '流利表达和复杂语法', total: 15 },
        { id: 'b2', name: 'B2 高级', description: '深入交流和学术表达', total: 15 }
      ],
      currentLevel: 'a1'
    });
  },

  loadUserProgress: function() {
    const progress = storage.getUserProgress();
    const reviewQueue = storage.getReviewQueue();
    
    this.setData({
      userProgress: progress,
      currentLevelIndex: progress.currentLevelIndex || 1,
      reviewCount: reviewQueue.length
    });
  },

  selectLevel: function(e) {
    const levelId = e.currentTarget.dataset.id;
    this.setData({ 
      currentLevel: levelId,
      showLevelSelect: true
    });
  },

  startChallenge: function(e) {
    const levelIndex = e.currentTarget.dataset.index;
    const level = this.data.currentLevel;
    
    if (levelIndex > this.data.currentLevelIndex) {
      wx.showToast({
        title: '请先完成前一关',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/german/pages/learn/challenge?level=${level}&index=${levelIndex}`
    });
  },

  goToReview: function() {
    const reviewQueue = storage.getReviewQueue();
    if (reviewQueue.length === 0) {
      wx.showToast({
        title: '暂无复习内容',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/german/pages/learn/review'
    });
  },

  goToCourse: function() {
    wx.navigateTo({
      url: '/german/pages/course/course'
    });
  },

  goToWordbook: function() {
    wx.navigateTo({
      url: '/german/pages/wordbook/wordbook'
    });
  },

  onShareAppMessage: function() {
    return {
      title: '德语闯关学习',
      path: '/german/pages/learn/learn'
    };
  }
});