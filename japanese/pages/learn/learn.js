var app = getApp();
var lessons = require('../../data/lessons.js');

var levelColors = { 'N5': '#4CAF50', 'N4': '#2196F3', 'N3': '#FF9800', 'N2': '#9C27B0', 'N1': '#F44336' };
var levelNames = { 'N5': 'N5 入门', 'N4': 'N4 初级', 'N3': 'N3 中级', 'N2': 'N2 高级', 'N1': 'N1 精通' };

Page({
  data: {
    pathNodes: [],
    level: 1,
    exp: 0,
    totalProgress: 0,
    currentTab: 'lesson',
    scrollToNode: 0,
    selectedLevel: 'all',
    levelOptions: ['all', 'N5', 'N4', 'N3', 'N2', 'N1']
  },

  onShow: function() {
    this.buildPath();
  },

  buildPath: function() {
    var completed = wx.getStorageSync('completedLessons') || [];
    var progress = wx.getStorageSync('learningProgress') || {};
    var exp = progress.exp || 0;
    var level = Math.floor(exp / 100) + 1;
    var selectedLevel = this.data.selectedLevel;

    var lvOrder = ['N5', 'N4', 'N3', 'N2', 'N1'];
    var nodes = [];
    var totalDone = 0;
    var totalLessons = 0;

    for (var li = 0; li < lvOrder.length; li++) {
      var lv = lvOrder[li];
      if (selectedLevel !== 'all' && selectedLevel !== lv) continue;

      var lvLessons = [];
      for (var i = 0; i < lessons.length; i++) {
        if (lessons[i].level === lv) {
          lvLessons.push(lessons[i]);
        }
      }

      nodes.push({
        type: 'header',
        id: 'h-' + lv,
        label: levelNames[lv] || lv,
        color: levelColors[lv] || '#58cc02',
        lessonCount: lvLessons.length
      });

      for (var j = 0; j < lvLessons.length; j++) {
        var ls = lvLessons[j];
        var done = completed.indexOf(ls.id) !== -1;
        if (done) totalDone++;
        totalLessons++;

        var isCurrent = false;
        if (!done) {
          var allDone = true;
          for (var k = 0; k < nodes.length; k++) {
            if (nodes[k].type === 'node' && !nodes[k].done) {
              allDone = false;
              break;
            }
          }
          if (allDone) isCurrent = true;
        }

        nodes.push({
          type: 'node',
          id: ls.id,
          title: ls.title,
          level: lv,
          color: levelColors[lv] || '#58cc02',
          done: done,
          current: isCurrent,
          number: j + 1,
          words: ls.words_count || 0,
          grammar: ls.grammar_count || 0
        });
      }
    }

    var totalProgress = totalLessons ? Math.round(totalDone / totalLessons * 100) : 0;
    var scrollTo = 0;
    for (var n = 0; n < nodes.length; n++) {
      if (nodes[n].type === 'node' && nodes[n].current) {
        scrollTo = nodes[n].id;
        break;
      }
    }

    this.setData({
      pathNodes: nodes,
      level: level,
      exp: exp,
      totalProgress: totalProgress,
      scrollToNode: scrollTo
    });
  },

  startLesson: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/japanese/pages/lesson/lesson?id=' + id + '&mode=quiz' });
  },

  goToLesson: function() { wx.redirectTo({ url: '/japanese/pages/learn/learn' }); },
  goToCourse: function() { wx.redirectTo({ url: '/japanese/pages/course/course' }); },
  goToRank: function() { wx.navigateTo({ url: '/japanese/pages/leaderboard/leaderboard' }); },

  onLevelChange: function(e) {
    var idx = parseInt(e.detail.value);
    var selectedLevel = this.data.levelOptions[idx];
    this.setData({ selectedLevel: selectedLevel });
    this.buildPath();
  }
});
