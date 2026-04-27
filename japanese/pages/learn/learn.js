const app = getApp();
const lessons = require('../../data/lessons.js');

Page({
  data: {
    units: [],
    activeUnit: 0,
    currentTab: 'lesson'
  },

  onShow() {
    this.loadProgress();
  },

  loadProgress() {
    const completed = wx.getStorageSync('completedLessons') || [];
    const progress = wx.getStorageSync('learningProgress') || {};
    const exp = progress.exp || 0;
    const level = Math.floor(exp / 100) + 1;

    const unitDefs = [
      { id: 1, name: 'Unit 1', subtitle: 'N5 入门基础', level: 'N5', color: '#4CAF50' },
      { id: 2, name: 'Unit 2', subtitle: 'N5 日常会话', level: 'N5', color: '#66BB6A' },
      { id: 3, name: 'Unit 3', subtitle: 'N4 初级进阶', level: 'N4', color: '#2196F3' },
      { id: 4, name: 'Unit 4', subtitle: 'N4 应用会话', level: 'N4', color: '#42A5F5' },
      { id: 5, name: 'Unit 5', subtitle: 'N3 中级语法', level: 'N3', color: '#FF9800' },
      { id: 6, name: 'Unit 6', subtitle: 'N3 表达拓展', level: 'N3', color: '#FFA726' },
      { id: 7, name: 'Unit 7', subtitle: 'N2 高级日语', level: 'N2', color: '#9C27B0' },
      { id: 8, name: 'Unit 8', subtitle: 'N1 精通', level: 'N1', color: '#F44336' }
    ];

    let lessonIdx = 0;
    const units = unitDefs.map((ud, ui) => {
      const levelLessons = lessons.filter(l => l.level === ud.level);
      const halfway = Math.ceil(levelLessons.length / 2);
      const myLessons = ui % 2 === 0 ? levelLessons.slice(0, halfway) : levelLessons.slice(halfway);
      
      const done = myLessons.filter(l => completed.indexOf(l.id) !== -1).length;
      const progress = myLessons.length ? Math.round(done / myLessons.length * 100) : 0;
      
      return {
        ...ud,
        lessons: myLessons.map((l, i) => ({
          id: l.id,
          title: l.title,
          completed: completed.indexOf(l.id) !== -1,
          active: !completed[l.id - 1] && i === 0
        })),
        progress,
        total: myLessons.length
      };
    });

    const totalLessons = lessons.length;
    const overallProgress = totalLessons ? Math.round(completed.length / totalLessons * 100) : 0;

    this.setData({ units, exp, level, overallProgress });
  },

  switchUnit(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeUnit: id });
  },

  startLesson(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/japanese/pages/lesson/lesson?id=${id}` });
  },

  goToLesson() { wx.redirectTo({ url: '/japanese/pages/learn/learn' }); },
  goToCourse() { wx.redirectTo({ url: '/japanese/pages/course/course' }); },
  goToAI() { wx.redirectTo({ url: '/japanese/pages/aichat/aichat' }); },
  goToRank() { wx.navigateTo({ url: '/japanese/pages/leaderboard/leaderboard' }); }
});
