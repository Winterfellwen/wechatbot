var wordsIndex = require('../../data/words/index.js');

var PAGE_SIZE = 60;

Page({
  data: {
    searchKey: '',
    totalWords: 0,
    masteredWords: 0,
    learningWords: 0,
    filteredWords: [],
    allWords: [],
    page: 0,
    hasMore: true,
    displayWords: []
  },

  onLoad: function() {
    this.loadWords();
  },

  onShow: function() {
    this.loadWords();
  },

  getDisplayPage: function(words, page) {
    return words.slice(0, (page + 1) * PAGE_SIZE);
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
      searchKey: '',
      page: 0,
      hasMore: baseWords.length > PAGE_SIZE,
      displayWords: this.getDisplayPage(baseWords, 0)
    });
  },

  onSearch: function(e) {
    var key = e.detail.value;
    var words = this.data.allWords;
    var filtered;
    if (key) {
      filtered = [];
      var i;
      for (i = 0; i < words.length; i++) {
        var w = words[i];
        if ((w.word && w.word.indexOf(key) !== -1) ||
            (w.meaning && w.meaning.indexOf(key) !== -1) ||
            (w.reading && w.reading.indexOf(key) !== -1)) {
          filtered = filtered.concat([w]);
        }
      }
    } else {
      filtered = words;
    }
    this.setData({
      filteredWords: filtered,
      searchKey: key,
      page: 0,
      hasMore: filtered.length > PAGE_SIZE,
      displayWords: this.getDisplayPage(filtered, 0)
    });
  },

  clearSearch: function() {
    this.setData({
      filteredWords: this.data.allWords,
      searchKey: '',
      page: 0,
      hasMore: this.data.allWords.length > PAGE_SIZE,
      displayWords: this.getDisplayPage(this.data.allWords, 0)
    });
  },

  loadMore: function() {
    if (!this.data.hasMore) return;
    var nextPage = this.data.page + 1;
    var allDisplay = this.getDisplayPage(this.data.filteredWords, nextPage);
    this.setData({
      page: nextPage,
      displayWords: allDisplay,
      hasMore: allDisplay.length < this.data.filteredWords.length
    });
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
      learningWords: words.length - mastered,
      displayWords: this.getDisplayPage(filtered, this.data.page)
    });
  }
});
