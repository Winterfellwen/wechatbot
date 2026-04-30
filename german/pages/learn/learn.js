var app = getApp();
var lessons = require('../../data/lessons.js');

var levelColors = { 'A1': '#2196F3', 'A2': '#4CAF50', 'B1': '#FF9800', 'B2': '#9C27B0' };
var levelNames = { 'A1': 'A1 入门', 'A2': 'A2 初级', 'B1': 'B1 中级', 'B2': 'B2 高级' };

Page({
  data: {
    pathNodes: [],
    level: 1,
    exp: 0,
    totalProgress: 0,
    scrollToNode: 0
  },

  onShow: function() {
    this.buildPath();
  },

  buildPath: function() {
    var completed = wx.getStorageSync('german_completedLessons') || [];
    var progress = wx.getStorageSync('german_learningProgress') || {};
    var exp = progress.exp || 0;
    var level = Math.floor(exp / 100) + 1;

    var lvOrder = ['A1', 'A2', 'B1', 'B2'];
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
          color: levelColors[lv],
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
    wx.navigateTo({ url: '/german/pages/lesson/lesson?id=' + id });
  },

  goToCourse: function() { wx.redirectTo({ url: '/german/pages/course/course' }); },
  goToAI: function() { wx.redirectTo({ url: '/german/pages/aichat/aichat' }); }
});