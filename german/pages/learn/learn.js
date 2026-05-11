const storage = require('../../utils/storage');

Page({
  data: {
    levels: [
      { id: 'a1', name: 'A1 基础', description: '掌握基础词汇和简单语法' },
      { id: 'a2', name: 'A2 进阶', description: '扩展词汇和日常交流' },
      { id: 'b1', name: 'B1 中级', description: '流利表达和复杂语法' },
      { id: 'b2', name: 'B2 高级', description: '深入交流和学术表达' }
    ],
    levelOptions: ['A1 基础', 'A2 进阶', 'B1 中级', 'B2 高级'],
    selectedLevelIndex: 0,
    selectedLevel: 'A1 基础',
    currentLevel: 'a1',
    userProgress: null,
    pathNodes: []
  },

  onLoad: function(options) {
    this.loadUserProgress();
  },

  onShow: function() {
    this.loadUserProgress();
  },

  loadUserProgress: function() {
    const progress = storage.getUserProgress();
    this.setData({
      userProgress: progress
    });
    this.buildPathNodes();
  },

  buildPathNodes: function() {
    const { currentLevel, levels, userProgress } = this.data;
    const totalLevels = 15;
    const levelData = userProgress?.levelProgress?.[currentLevel] || {};
    const currentLevelIndex = levelData.currentIndex || 0;
    
    // 构建路径节点
    const pathNodes = [];
    for (let i = 1; i <= totalLevels; i++) {
      const nodeData = levelData.nodes?.[i] || {};
      pathNodes.push({
        id: `${currentLevel}-${i}`,
        number: i,
        done: nodeData.done || false,
        current: i === currentLevelIndex,
        score: nodeData.score || 0
      });
    }

    this.setData({ pathNodes });
  },

  onLevelChange: function(e) {
    const index = e.detail.value;
    const level = this.data.levels[index];
    
    this.setData({
      selectedLevelIndex: index,
      selectedLevel: level.name,
      currentLevel: level.id
    }, () => {
      this.buildPathNodes();
    });
  },

  startChallenge: function(e) {
    const levelIndex = e.currentTarget.dataset.index;
    const levelData = this.data.userProgress?.levelProgress?.[this.data.currentLevel] || {};
    const currentLevelIndex = levelData.currentIndex || 0;
    
    if (levelIndex > currentLevelIndex && levelIndex > 1) {
      wx.showToast({
        title: '请先完成前一关',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/german/pages/learn/challenge?level=${this.data.currentLevel}&index=${levelIndex}`
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
