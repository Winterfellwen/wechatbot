var app = getApp();
var lessons = require('../../data/lessons.js');

Page({
  data: {
    lesson: null,
    currentIndex: 0,
    words: [],
    showAnswer: false
  },

  onLoad: function(options) {
    var id = options.id;
    var lesson = lessons.find(function(l) { return l.id === id; });
    if (lesson) {
      this.setData({ 
        lesson: lesson, 
        words: lesson.words || [] 
      });
    }
  },

  speakWord: function(e) {
    var word = e.currentTarget.dataset.word;
    var that = this;
    wx.showLoading({ title: '播放中...' });
    wx.request({
      url: 'https://wechatbot-g6ez.onrender.com/api/tts',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { text: word, lang: 'de-DE' },
      success: function(res) {
        wx.hideLoading();
        if (res.data && res.data.audioUrl) {
          wx.downloadFile({
            url: res.data.audioUrl,
            success: function(dl) {
              wx.playBackgroundAudio({
                dataUrl: dl.tempFilePath,
                success: function() {
                  console.log('Playing audio');
                },
                fail: function(err) {
                  console.error('Play failed:', err);
                  wx.showToast({ title: '播放失败', icon: 'none' });
                }
              });
            },
            fail: function(err) {
              console.error('Download failed:', err);
              wx.showToast({ title: '下载失败', icon: 'none' });
            }
          });
        } else {
          wx.showToast({ title: '生成音频失败', icon: 'none' });
        }
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('TTS request failed:', err);
        wx.showToast({ title: '请求失败', icon: 'none' });
      }
    });
  },

  toggleAnswer: function() {
    this.setData({ showAnswer: !this.data.showAnswer });
  },

  markComplete: function() {
    var completed = wx.getStorageSync('german_completedLessons') || [];
    if (completed.indexOf(this.data.lesson.id) === -1) {
      completed.push(this.data.lesson.id);
      wx.setStorageSync('german_completedLessons', completed);
      
      var progress = wx.getStorageSync('german_learningProgress') || { exp: 0 };
      progress.exp += 10;
      wx.setStorageSync('german_learningProgress', progress);
    }
    wx.navigateBack();
  }
});