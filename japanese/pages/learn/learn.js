const app = getApp();
const lessons = require('../../data/lessons.js');

Page({
  data: {
    progress: 0,
    level: 1,
    exp: 0,
    currentLevel: 'N5',
    levels: [
      { id: 'N5', name: 'N5入门', desc: '1-20课' },
      { id: 'N4', name: 'N4初级', desc: '21-38课' },
      { id: 'N3', name: 'N3中级', desc: '39-56课' },
      { id: 'N2', name: 'N2高级', desc: '57-66课' },
      { id: 'N1', name: 'N1精通', desc: '67-76课' }
    ],
    currentLessons: [],
    currentTab: 'lesson'
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadProgress();
  },

  loadData() {
    const completed = wx.getStorageSync('completedLessons') || [];
    const progress = wx.getStorageSync('learningProgress') || {};
    const totalLessons = lessons.length;

    const currentList = lessons.filter(l => l.level === this.data.currentLevel);
    const mapped = currentList.map((l, i) => ({
      id: l.id,
      number: l.id,
      title: l.title,
      subtitle: l.subtitle,
      description: l.description,
      words: l.words_count,
      grammar: l.grammar_count,
      level: l.level,
      completed: completed.indexOf(l.id) !== -1
    }));

    this.setData({
      currentLessons: mapped,
      progress: totalLessons ? Math.round((completed.length || 0) / totalLessons * 100) : 0,
      level: progress.level || 1,
      exp: progress.exp || 0
    });
  },

  loadProgress() {
    const completed = wx.getStorageSync('completedLessons') || [];
    const progress = wx.getStorageSync('learningProgress') || {};
    const totalLessons = lessons.length;

    const currentList = lessons.filter(l => l.level === this.data.currentLevel);
    const mapped = currentList.map(l => ({
      id: l.id,
      number: l.id,
      title: l.title,
      subtitle: l.subtitle,
      description: l.description,
      words: l.words_count,
      grammar: l.grammar_count,
      level: l.level,
      completed: completed.indexOf(l.id) !== -1
    }));

    const doneInLevel = currentList.filter(l => completed.indexOf(l.id) !== -1).length;
    const levelProgress = currentList.length ? Math.round(doneInLevel / currentList.length * 100) : 0;

    this.setData({
      currentLessons: mapped,
      progress: totalLessons ? Math.round(completed.length / totalLessons * 100) : 0,
      level: progress.level || 1,
      exp: progress.exp || 0
    });
  },

  switchLevel(e) {
    const level = e.currentTarget.dataset.level;
    this.setData({ currentLevel: level });
    this.loadProgress();
  },

  startLesson(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/japanese/pages/lesson/lesson?id=${id}`
    });
  },

  goToLesson() { wx.navigateTo({ url: '/japanese/pages/learn/learn' }); },
  goToCourse() { wx.navigateTo({ url: '/japanese/pages/course/course' }); },
  goToAI() { wx.navigateTo({ url: '/japanese/pages/aichat/aichat' }); },
  goToRank() { wx.navigateTo({ url: '/japanese/pages/leaderboard/leaderboard' }); }
});
