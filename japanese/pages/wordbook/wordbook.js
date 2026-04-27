const app = getApp();
const API_URL = 'https://wechatbot-api.onrender.com';
const wordsIndex = require('../../data/words/index.js');

Page({
  data: {
    searchKey: '',
    selectedLesson: 0,
    selectedLevel: 'all',
    totalWords: 0,
    masteredWords: 0,
    learningWords: 0,
    filteredWords: [],
    allWords: []
  },

  onLoad() {
    this.loadWords();
  },

  onShow() {
    this.loadWords();
  },

  loadWords() {
    const savedWords = wx.getStorageSync('wordbook');
    const baseWords = savedWords || wordsIndex.all;
    
    const mastered = baseWords.filter(w => w.mastered).length;
    this.setData({
      allWords: baseWords,
      filteredWords: baseWords,
      totalWords: baseWords.length,
      masteredWords: mastered,
      learningWords: baseWords.length - mastered
    });
  },

  onSearch(e) {
    const key = e.detail.value.toLowerCase();
    let words = this.data.allWords;
    if (key) {
      words = words.filter(w => 
        (w.word && w.word.includes(key)) || 
        (w.meaning && w.meaning.includes(key)) || 
        (w.reading && w.reading.includes(key))
      );
    }
    this.setData({ filteredWords: words, searchKey: key });
  },

  clearSearch() {
    this.setData({ filteredWords: this.data.allWords, searchKey: '' });
  },

  toggleMaster(e) {
    const id = e.currentTarget.dataset.id;
    const words = this.data.allWords.map(w => {
      if (w.id === id) w.mastered = !w.mastered;
      return w;
    });
    wx.setStorageSync('wordbook', words);
    const mastered = words.filter(w => w.mastered).length;
    this.setData({
      allWords: words,
      filteredWords: words,
      masteredWords: mastered,
      learningWords: words.length - mastered
    });
  },

  playAudio(e) {
    const word = e.currentTarget.dataset.word;
    wx.showToast({ title: word, icon: 'none' });
  }
});