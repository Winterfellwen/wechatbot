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
    textList: [],
    playingWord: null
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
      const vocabList = level.vocab.slice(startIdx, endIdx);
      
      // 检测哪些单词已在生词本
      const wordBook = storage.getWordBook();
      const wordBookWords = new Set(wordBook.map(w => w.word));
      const vocabListWithStatus = vocabList.map(word => ({
        ...word,
        isInWordBook: wordBookWords.has(word.word)
      }));

      this.setData({
        vocabList: vocabListWithStatus,
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
    this.setData({ playingWord: word });
    
    // 播放后 1.5 秒清除动画状态
    tts.speak(word, () => {
      setTimeout(() => {
        this.setData({ playingWord: null });
      }, 1500);
    });
  },

  addToWordBook: function(e) {
    const word = e.currentTarget.dataset.word;
    const wordBook = storage.getWordBook();
    const exists = wordBook.find(w => w.word === word.word);
    
    if (exists) {
      // 已收录，移除
      storage.removeFromWordBook(word.word);
      this.setData({ 
        vocabList: this.data.vocabList.map(item => 
          item.word === word.word ? { ...item, isInWordBook: false } : item
        )
      });
      wx.showToast({ 
        title: '已移出生词本', 
        icon: 'none',
        duration: 1500
      });
    } else {
      // 未收录，添加
      storage.addToWordBook(word);
      this.setData({ 
        vocabList: this.data.vocabList.map(item => 
          item.word === word.word ? { ...item, isInWordBook: true } : item
        )
      });
      wx.showToast({ 
        title: '已加入生词本', 
        icon: 'success',
        duration: 1500
      });
    }
  },

  onShareAppMessage: function() {
    return {
      title: '德语课程学习',
      path: '/german/pages/course/course'
    };
  }
});
