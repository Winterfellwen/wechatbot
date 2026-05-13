var app = getApp();
var grammarData = require('../../data/grammar.js');

Page({
  data: {
    currentTab: 'course',
    wordCount: 0,
    masteredCount: 0,
    grammarCount: 0
  },

  onLoad: function() {
    this.setData({ grammarCount: grammarData.length });
  },

  onShow: function() {
    var wordbook = wx.getStorageSync('wordbook');
    var wordCount = 0;
    var masteredCount = 0;
    if (wordbook && wordbook.length) {
      wordCount = wordbook.length;
      var i;
      for (i = 0; i < wordbook.length; i++) {
        if (wordbook[i].mastered) {
          masteredCount = masteredCount + 1;
        }
      }
    }
    this.setData({
      wordCount: wordCount,
      masteredCount: masteredCount
    });
  },

  goToTextbook: function() { wx.redirectTo({ url: '/japanese/pages/textbook/textbook' }); },
  goToWordbook: function() { wx.redirectTo({ url: '/japanese/pages/wordbook/wordbook' }); },
  goToGrammar: function() { wx.redirectTo({ url: '/japanese/pages/grammar/grammar' }); },

  goToLesson: function() { wx.redirectTo({ url: '/japanese/pages/learn/learn' }); },
  goToCourse: function() { wx.redirectTo({ url: '/japanese/pages/course/course' }); },
  goToRank: function() { wx.redirectTo({ url: '/japanese/pages/leaderboard/leaderboard' }); }
});
