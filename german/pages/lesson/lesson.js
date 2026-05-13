const storage = require('../../utils/storage');
const tts = require('../../utils/tts');

Page({
  data: {
    words: [],
    grammars: []
  },

  onLoad: function(options) {
    const level = options.level || 'a1';
    const unit = parseInt(options.unit) || 1;
    this.loadLessonData(level, unit);
  },

  loadLessonData: function(level, unit) {
    const allWords = storage.getWordBook();
    this.setData({
      words: allWords.slice(0, 8),
      grammars: [
        { title: level.toUpperCase() + ' 语法要点', content: '本节课程核心语法内容正在完善中...' }
      ]
    });
  },

  playAudio: function(e) {
    const word = e.currentTarget.dataset.word;
    tts.speak(word);
  },

  startQuiz: function() {
    wx.navigateTo({
      url: '/german/pages/learn/challenge?level=a1&index=1'
    });
  },

  goBack: function() {
    wx.navigateBack();
  }
});