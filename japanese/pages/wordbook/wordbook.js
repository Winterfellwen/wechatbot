var wordsIndex = require('../../data/words/index.js');

Page({
  data: {
    searchKey: '',
    totalWords: 0,
    masteredWords: 0,
    learningWords: 0,
    filteredWords: [],
    allWords: []
  },

  onLoad: function() {
    this.loadWords();
  },

  onShow: function() {
    this.loadWords();
  },

  loadWords: function() {
    var savedWords = wx.getStorageSync('wordbook');
    var baseWords;
    if (savedWords && savedWords.length) {
      baseWords = savedWords;
    } else {
      baseWords = wordsIndex.all;
    }

    var mastered = 0;
    var i;
    for (i = 0; i < baseWords.length; i++) {
      if (baseWords[i].mastered) {
        mastered = mastered + 1;
      }
    }

    this.setData({
      allWords: baseWords,
      filteredWords: baseWords,
      totalWords: baseWords.length,
      masteredWords: mastered,
      learningWords: baseWords.length - mastered,
      searchKey: ''
    });
  },

  onSearch: function(e) {
    var key = e.detail.value;
    var words = this.data.allWords;
    if (key) {
      var filtered = [];
      var i;
      for (i = 0; i < words.length; i++) {
        var w = words[i];
        if ((w.word && w.word.indexOf(key) !== -1) ||
            (w.meaning && w.meaning.indexOf(key) !== -1) ||
            (w.reading && w.reading.indexOf(key) !== -1)) {
          filtered = filtered.concat([w]);
        }
      }
      this.setData({ filteredWords: filtered, searchKey: key });
    } else {
      this.setData({ filteredWords: words, searchKey: '' });
    }
  },

  clearSearch: function() {
    this.setData({ filteredWords: this.data.allWords, searchKey: '' });
  },

  goBack: function() {
    wx.navigateBack();
  },

  toggleMaster: function(e) {
    var id = e.currentTarget.dataset.id;
    var words = this.data.allWords;
    var filtered = this.data.filteredWords;
    var mastered = 0;
    var i;
    for (i = 0; i < words.length; i++) {
      if (words[i].id === id) {
        words[i].mastered = !words[i].mastered;
      }
      if (words[i].mastered) {
        mastered = mastered + 1;
      }
    }
    for (i = 0; i < filtered.length; i++) {
      if (filtered[i].id === id) {
        filtered[i].mastered = !filtered[i].mastered;
      }
    }
    wx.setStorageSync('wordbook', words);
    this.setData({
      allWords: words,
      filteredWords: filtered,
      masteredWords: mastered,
      learningWords: words.length - mastered
    });
  }
});
