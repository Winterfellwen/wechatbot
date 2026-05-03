const storage = require('../../utils/storage');
const tts = require('../../utils/tts');
const a1Vocab = require('../../data/a1/vocab.js');
const a1Grammar = require('../../data/a1/grammar.js');
const a1Pronunciation = require('../../data/a1/pronunciation.js');
const a1Texts = require('../../data/a1/texts.js');
const a2Vocab = require('../../data/a2/vocab.js');

const levelData = {
  a1: {
    name: 'A1 基础',
    vocab: a1Vocab,
    grammar: a1Grammar,
    pronunciation: a1Pronunciation,
    texts: a1Texts,
    units: 15
  },
  a2: {
    name: 'A2 进阶',
    vocab: a2Vocab,
    grammar: [],
    pronunciation: [],
    texts: [],
    units: 15
  }
};

Page({
  data: {
    currentLevel: 'a1',
    levels: [
      { id: 'a1', name: 'A1 基础', units: 15 },
      { id: 'a2', name: 'A2 进阶', units: 15 },
      { id: 'b1', name: 'B1 中级', units: 15 },
      { id: 'b2', name: 'B2 高级', units: 15 }
    ],
    currentUnit: 1,
    showUnitSelector: false,
    vocabList: [],
    grammarList: [],
    pronunciationList: [],
    textList: []
  },

  onLoad: function() {
    this.loadLevelData();
  },

  onShow: function() {
    this.loadLevelData();
  },

  loadLevelData: function() {
    const level = levelData[this.data.currentLevel];
    if (level) {
      const startIdx = (this.data.currentUnit - 1) * 15;
      const endIdx = startIdx + 15;
      
      this.setData({
        vocabList: level.vocab.slice(startIdx, endIdx),
        grammarList: level.grammar,
        pronunciationList: level.pronunciation,
        textList: level.texts
      });
    }
  },

  selectLevel: function(e) {
    const levelId = e.currentTarget.dataset.id;
    this.setData({
      currentLevel: levelId,
      currentUnit: 1
    });
    this.loadLevelData();
  },

  selectUnit: function(e) {
    const unit = e.currentTarget.dataset.unit;
    this.setData({
      currentUnit: unit,
      showUnitSelector: false
    });
    this.loadLevelData();
  },

  toggleUnitSelector: function() {
    this.setData({ showUnitSelector: !this.data.showUnitSelector });
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

  onShareAppMessage: function() {
    return {
      title: '德语课程学习',
      path: '/german/pages/course/course'
    };
  }
});