var app = getApp();
var lessons = require('../../data/lessons.js');

var levelNames = { 'N5': '入门基础', 'N4': '初级进阶', 'N3': '中级语法', 'N2': '高级日语', 'N1': '精通' };
var levelColors = { 'N5': '#4CAF50', 'N4': '#2196F3', 'N3': '#FF9800', 'N2': '#9C27B0', 'N1': '#F44336' };

Page({
  data: {
    units: [],
    activeUnit: 0,
    currentTab: 'lesson',
    level: 1,
    exp: 0,
    overallProgress: 0
  },

  onShow: function() {
    this.loadProgress();
  },

  loadProgress: function() {
    var completed = wx.getStorageSync('completedLessons') || [];
    var progress = wx.getStorageSync('learningProgress') || {};
    var exp = progress.exp || 0;
    var level = Math.floor(exp / 100) + 1;

    var levelMap = {};
    for (var i = 0; i < lessons.length; i++) {
      var lv = lessons[i].level;
      if (!levelMap[lv]) {
        levelMap[lv] = [];
      }
      levelMap[lv].push(lessons[i]);
    }

    var levels = [];
    for (var k in levelMap) {
      if (levelMap.hasOwnProperty(k)) {
        levels.push(k);
      }
    }
    levels.sort();

    var units = [];
    for (var li = 0; li < levels.length; li++) {
      var lv = levels[li];
      var levelLessons = levelMap[lv];
      var done = 0;
      var firstIncompleteFound = false;
      var lessonItems = [];

      for (var j = 0; j < levelLessons.length; j++) {
        var l = levelLessons[j];
        var isCompleted = completed.indexOf(l.id) !== -1;
        if (isCompleted) {
          done++;
        }
        var isActive = false;
        if (!isCompleted && !firstIncompleteFound) {
          isActive = true;
          firstIncompleteFound = true;
        }
        lessonItems.push({
          id: l.id,
          title: l.title,
          completed: isCompleted,
          active: isActive
        });
      }

      var unitProgress = levelLessons.length ? Math.round(done / levelLessons.length * 100) : 0;

      units.push({
        id: li + 1,
        name: 'Unit ' + (li + 1),
        subtitle: lv + ' ' + (levelNames[lv] || ''),
        level: lv,
        color: levelColors[lv] || '#58cc02',
        lessons: lessonItems,
        progress: unitProgress,
        total: levelLessons.length
      });
    }

    var totalLessons = lessons.length;
    var overallProgress = totalLessons ? Math.round(completed.length / totalLessons * 100) : 0;

    this.setData({
      units: units,
      exp: exp,
      level: level,
      overallProgress: overallProgress,
      activeUnit: units.length > 0 ? units[0].id : 0
    });
  },

  switchUnit: function(e) {
    var id = parseInt(e.currentTarget.dataset.id) || 0;
    this.setData({ activeUnit: id });
  },

  startLesson: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/japanese/pages/lesson/lesson?id=' + id });
  },

  goToLesson: function() {
    wx.redirectTo({ url: '/japanese/pages/learn/learn' });
  },

  goToCourse: function() {
    wx.redirectTo({ url: '/japanese/pages/course/course' });
  },

  goToAI: function() {
    wx.redirectTo({ url: '/japanese/pages/aichat/aichat' });
  },

  goToRank: function() {
    wx.navigateTo({ url: '/japanese/pages/leaderboard/leaderboard' });
  }
});
