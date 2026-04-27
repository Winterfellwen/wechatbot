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
    scrollToNode: 0
  },

  onShow: function() {
    this.buildPath();
  },

  buildPath: function() {
    var completed = wx.getStorageSync('completedLessons') || [];
    var progress = wx.getStorageSync('learningProgress') || {};
    var exp = progress.exp || 0;
    var level = Math.floor(exp / 100) + 1;

    // Group lessons by level, then build path nodes
    var lvOrder = ['N5', 'N4', 'N3', 'N2', 'N1'];
    var nodes = [];
    var totalDone = 0;

    for (var li = 0; li < lvOrder.length; li++) {
      var lv = lvOrder[li];
      var lvLessons = [];
      for (var i = 0; i < lessons.length; i++) {
        if (lessons[i].level === lv) {
          lvLessons.push(lessons[i]);
        }
      }

      // Unit header
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

        // Find the current one: first incomplete lesson
        var isCurrent = false;
        if (!done) {
          // Check if this is the first incomplete overall
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

    var totalProgress = lessons.length ? Math.round(totalDone / lessons.length * 100) : 0;
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
    wx.navigateTo({ url: '/japanese/pages/lesson/lesson?id=' + id });
  },

  goToLesson: function() { wx.redirectTo({ url: '/japanese/pages/learn/learn' }); },
  goToCourse: function() { wx.redirectTo({ url: '/japanese/pages/course/course' }); },
  goToAI: function() { wx.redirectTo({ url: '/japanese/pages/aichat/aichat' }); },
  goToRank: function() { wx.navigateTo({ url: '/japanese/pages/leaderboard/leaderboard' }); }
});
