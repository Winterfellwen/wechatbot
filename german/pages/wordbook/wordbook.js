const storage = require('../../utils/storage');
const tts = require('../../utils/tts');
const algorithm = require('../../utils/algorithm');

Page({
  data: {
    wordList: [],
    currentTab: 'list',
    currentCard: 0,
    showAnswer: false,
    isEmpty: true
  },

  onLoad: function() {
    this.loadWordBook();
  },

  onShow: function() {
    this.loadWordBook();
  },

  loadWordBook: function() {
    const words = storage.getWordBook();
    this.setData({
      wordList: words,
      isEmpty: words.length === 0
    });
  },

  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ 
      currentTab: tab,
      currentCard: 0,
      showAnswer: false
    });
  },

  playAudio: function(e) {
    const word = e.currentTarget.dataset.word;
    tts.speak(word);
  },

  removeWord: function(e) {
    const word = e.currentTarget.dataset.word;
    storage.removeFromWordBook(word);
    this.loadWordBook();
    wx.showToast({ title: '已删除', icon: 'success' });
  },

  startReview: function() {
    if (this.data.wordList.length === 0) {
      wx.showToast({ title: '生词本为空', icon: 'none' });
      return;
    }
    this.setData({
      currentTab: 'review',
      currentCard: 0,
      showAnswer: false
    });
  },

  toggleAnswer: function() {
    this.setData({ showAnswer: !this.data.showAnswer });
  },

  markKnown: function() {
    const { currentCard, wordList } = this.data;
    if (currentCard >= wordList.length - 1) {
      wx.showToast({ title: '复习完成！', icon: 'success' });
      this.setData({ currentTab: 'list' });
    } else {
      this.setData({
        currentCard: currentCard + 1,
        showAnswer: false
      });
    }
  },

  markUnknown: function() {
    const { currentCard, wordList } = this.data;
    const word = wordList[currentCard];
    storage.addWrongWord(word);
    
    if (currentCard >= wordList.length - 1) {
      wx.showToast({ title: '复习完成！', icon: 'success' });
      this.setData({ currentTab: 'list' });
    } else {
      this.setData({
        currentCard: currentCard + 1,
        showAnswer: false
      });
    }
  },

  goBack: function() {
    this.setData({ currentTab: 'list' });
  },

  goToLearn: function() {
    wx.navigateTo({
      url: '/german/pages/learn/learn'
    });
  },

  goToCourse: function() {
    wx.navigateTo({
      url: '/german/pages/course/course'
    });
  },

  onShareAppMessage: function() {
    return {
      title: '德语生词本',
      path: '/german/pages/wordbook/wordbook'
    };
  }
});