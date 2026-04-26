const app = getApp();
const API_URL = 'https://wechatbot-api.onrender.com';

Page({
  data: {
    searchKey: '',
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
    const words = savedWords || this.getSampleWords();
    
    const mastered = words.filter(w => w.mastered).length;
    this.setData({
      allWords: words,
      filteredWords: words,
      totalWords: words.length,
      masteredWords: mastered,
      learningWords: words.length - mastered
    });
  },

  onSearch(e) {
    const key = e.detail.value.toLowerCase();
    if (!key) {
      this.setData({ filteredWords: this.data.allWords, searchKey: '' });
      return;
    }
    const filtered = this.data.allWords.filter(w => 
      w.word.includes(key) || w.meaning.includes(key)
    );
    this.setData({ filteredWords: filtered, searchKey: key });
  },

  clearSearch() {
    this.setData({ filteredWords: this.data.allWords, searchKey: '' });
  },

  toggleMaster(e) {
    const word = e.currentTarget.dataset.word;
    const words = this.data.allWords.map(w => {
      if (w.word === word) {
        w.mastered = !w.mastered;
      }
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
    const recorder = wx.createInnerAudioContext();
    if (recorder) {
      wx.showToast({ title: word, icon: 'none' });
    }
  },

  getSampleWords() {
    return [
      { word: '你好', meaning: '你好/早上好', reading: 'こんにちは', mastered: false },
      { word: '再见', meaning: '再见', reading: 'さようなら', mastered: false },
      { word: '谢谢', meaning: '谢谢', reading: 'ありがとう', mastered: false },
      { word: '对不起', meaning: '对不起', reading: 'ごめん', mastered: false },
      { word: '是', meaning: '是/不是', reading: 'はい/いいえ', mastered: false },
      { word: '我', meaning: '我', reading: 'わたし', mastered: false },
      { word: '你', meaning: '你', reading: 'あなた', mastered: false },
      { word: '他', meaning: '他', reading: 'かれ', mastered: false },
      { word: '她', meaning: '她', reading: 'かのじょ', mastered: false },
      { word: '这', meaning: '这/这个', reading: 'これ', mastered: false },
      { word: '那', meaning: '那/那个', reading: 'あれ', mastered: false },
      { word: '什么', meaning: '什么', reading: 'なに', mastered: false },
      { word: '哪里', meaning: '哪里', reading: 'どこ', mastered: false },
      { word: '谁', meaning: '谁', reading: 'だれ', mastered: false },
      { word: '早上好', meaning: '早上好', reading: 'おはよう', mastered: false },
      { word: '晚上好', meaning: '晚上好', reading: 'こんばんは', mastered: false },
      { word: '我回来了', meaning: '我回来了', reading: 'ただいま', mastered: false },
      { word: '我出门了', meaning: '我出门了', reading: 'いってきます', mastered: false },
      { word: '走好', meaning: '走好', reading: 'いってらっしゃい', mastered: false },
      { word: '我知道了', meaning: '我知道了', reading: 'わかりました', mastered: false }
    ];
  }
});