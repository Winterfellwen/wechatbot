Page({
  data: {
    wordCount: 0,
    masteredCount: 0,
    grammarCount: 0
  },

  onShow: function() {
    var wordbook = wx.getStorageSync('german_wordbook');
    var wordCount = wordbook ? wordbook.length : 0;
    var masteredCount = 0;
    if (wordbook) {
      for (var i = 0; i < wordbook.length; i++) {
        if (wordbook[i].mastered) masteredCount++;
      }
    }
    this.setData({ wordCount: wordCount, masteredCount: masteredCount, grammarCount: 20 });
  },

  goToTextbook: function() { wx.navigateTo({ url: '/german/pages/textbook/textbook' }); },
  goToWordbook: function() { wx.navigateTo({ url: '/german/pages/wordbook/wordbook' }); },
  goToGrammar: function() { wx.navigateTo({ url: '/german/pages/grammar/grammar' }); },
  goToLearn: function() { wx.redirectTo({ url: '/german/pages/learn/learn' }); },
  goToAI: function() { wx.redirectTo({ url: '/german/pages/aichat/aichat' }); }
});