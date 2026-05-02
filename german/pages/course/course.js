const storage = require('../../utils/storage');
const tts = require('../../utils/tts');
const a1Vocab = require('../../data/a1/vocab.js');
const a1Grammar = require('../../data/a1/grammar.js');
const a1Pronunciation = require('../../data/a1/pronunciation.js');
const a1Texts = require('../../data/a1/texts.js');

Page({
  data: {
    currentTab: 'vocab',
    level: 'a1',
    vocabList: [],
    grammarList: [],
    pronunciationList: [],
    textList: [],
    searchKeyword: ''
  },

  onLoad: function(options) {
    this.loadData();
  },

  loadData: function() {
    this.setData({
      vocabList: a1Vocab,
      grammarList: a1Grammar,
      pronunciationList: a1Pronunciation,
      textList: a1Texts
    });
  },

  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  playAudio: function(e) {
    const word = e.currentTarget.dataset.word;
    tts.speak(word);
  },

  addToWordBook: function(e) {
    const word = e.currentTarget.dataset.word;
    storage.addToWordBook(word);
    wx.showToast({ title: '已加入生词本', icon: 'success' });
  },

  onSearch: function(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
  },

  goToLesson: function(e) {
    const index = e.currentTarget.dataset.index;
    wx.navigateTo({
      url: `/german/pages/lesson/lesson?index=${index}`
    });
  },

  onShareAppMessage: function() {
    return {
      title: '德语课程学习',
      path: '/german/pages/course/course'
    };
  }
});