var lessons = require('../../data/lessons.js');

Page({
  data: {
    books: []
  },

  onLoad: function() {
    this.buildBooks();
  },

  onShow: function() {
    this.buildBooks();
  },

  buildBooks: function() {
    var completedLessons = wx.getStorageSync('completedLessons') || [];
    var levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
    var levelTitles = {
      'N5': '日语N5 入门基础',
      'N4': '日语N4 初级进阶',
      'N3': '日语N3 中级深化',
      'N2': '日语N2 高级应用',
      'N1': '日语N1 精通掌握'
    };
    var levelColors = {
      'N5': '#4CAF50',
      'N4': '#2196F3',
      'N3': '#FF9800',
      'N2': '#9C27B0',
      'N1': '#F44336'
    };
    var levelIds = {
      'N5': 1,
      'N4': 21,
      'N3': 39,
      'N2': 57,
      'N1': 67
    };

    var books = [];
    var i, j;
    for (i = 0; i < levels.length; i++) {
      var level = levels[i];
      var levelLessons = [];
      for (j = 0; j < lessons.length; j++) {
        if (lessons[j].level === level) {
          levelLessons = levelLessons.concat([lessons[j]]);
        }
      }

      var completed = 0;
      for (j = 0; j < levelLessons.length; j++) {
        if (completedLessons.indexOf(levelLessons[j].id) !== -1) {
          completed = completed + 1;
        }
      }
      var progress = levelLessons.length > 0 ? Math.round(completed / levelLessons.length * 100) : 0;

      var firstIncomplete = 0;
      for (j = 0; j < levelLessons.length; j++) {
        if (completedLessons.indexOf(levelLessons[j].id) === -1) {
          firstIncomplete = levelLessons[j].id;
          break;
        }
      }
      if (firstIncomplete === 0 && levelLessons.length > 0) {
        firstIncomplete = levelLessons[0].id;
      }

      var book = {
        level: level,
        title: levelTitles[level],
        color: levelColors[level],
        lessonCount: levelLessons.length,
        completedCount: completed,
        progress: progress,
        firstLessonId: firstIncomplete
      };
      books = books.concat([book]);
    }

    this.setData({ books: books });
  },

  openBook: function(e) {
    var lessonId = e.currentTarget.dataset.id;
    if (lessonId > 0) {
      wx.navigateTo({
        url: '/japanese/pages/lesson/lesson?id=' + lessonId
      });
    }
  },

  goBack: function() {
    wx.navigateBack();
  }
});
