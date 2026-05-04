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
    scrollTop: 0,
    selectedLevel: '全部级别',
    selectedLevelIndex: 0,
    levelOptions: ['全部级别', 'N5', 'N4', 'N3', 'N2', 'N1'],
    jpScores: {}
  },

  onShow: function() {
    var that = this;
    var loggedIn = wx.getStorageSync('auth_token');
    if (loggedIn) {
      var loginLib = require('../../../utils/login');
      loginLib.getJpLessonScores().then(function(res) {
        var scores = {};
        if (res.scores) {
          for (var i = 0; i < res.scores.length; i++) {
            scores[res.scores[i].lesson_id] = res.scores[i];
          }
        }
        that.setData({ jpScores: scores });
        that.buildPath();
      }).catch(function() {
        that.buildPath();
      });
    } else {
      this.buildPath();
    }
  },

  buildPath: function() {
    var completed = wx.getStorageSync('completedLessons') || [];
    var progress = wx.getStorageSync('learningProgress') || {};
    var exp = progress.exp || 0;
    var level = Math.floor(exp / 100) + 1;
    var selectedLevel = this.data.selectedLevel;
    var that = this;

    var lvOrder = ['N5', 'N4', 'N3', 'N2', 'N1'];
    var nodes = [];
    var totalDone = 0;
    var totalLessons = 0;

    for (var li = 0; li < lvOrder.length; li++) {
      var lv = lvOrder[li];
      if (selectedLevel !== '全部级别' && selectedLevel !== lv) continue;

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

        var nodeData = {
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
        };
        var scoreData = that.data.jpScores[ls.id];
        if (scoreData && scoreData.score > 0) {
          nodeData.jpScore = scoreData.score;
          nodeData.jpTotal = scoreData.total;
          nodeData.jpStarData = that.getJpStarData(scoreData.score, scoreData.total);
        }
        nodes.push(nodeData);
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
    }, function() {
      if (scrollTo) {
        var query = wx.createSelectorQuery().in(this);
        query.select('.path-scroll').boundingClientRect();
        query.select('#node-' + scrollTo).boundingClientRect();
        query.exec(function(res) {
          if (res && res[0] && res[1]) {
            var scrollView = res[0];
            var node = res[1];
            var scrollTop = node.top - scrollView.top - (scrollView.height / 2) + (node.height / 2);
            scrollTop = Math.max(0, scrollTop);
            this.setData({ scrollTop: scrollTop });
          }
        }.bind(this));
      }
    }.bind(this));
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
    this.setData({ selectedLevel: selectedLevel, selectedLevelIndex: idx });
    this.buildPath();
  },

  getJpStarData: function(score, total) {
    if (!score || !total) return { full: 0, half: 0, empty: 5 };
    var percentage = score / total * 100;
    var stars = percentage / 20;
    var fullStars = Math.floor(stars);
    var hasHalf = (stars - fullStars) >= 0.5;
    var halfStars = hasHalf ? 1 : 0;
    var emptyStars = 5 - fullStars - halfStars;
    return { full: fullStars, half: halfStars, empty: emptyStars };
  }
});
