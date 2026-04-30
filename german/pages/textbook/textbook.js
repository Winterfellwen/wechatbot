var lessons = require('../../data/lessons.js');

Page({
  data: {
    books: [],
    currentBook: null,
    currentBookLessons: []
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
      'N5': '#4CAF50', 'N4': '#0EA5E9', 'N3': '#F59E0B', 'N2': '#8B5CF6', 'N1': '#EF4444'
    };

    var books = [];
    for (var i = 0; i < levels.length; i++) {
      var level = levels[i];
      var levelLessons = [];
      for (var j = 0; j < lessons.length; j++) {
        if (lessons[j].level === level) levelLessons.push(lessons[j]);
      }

      var completed = 0;
      for (var k = 0; k < levelLessons.length; k++) {
        if (completedLessons.indexOf(levelLessons[k].id) !== -1) completed++;
      }
      var progress = levelLessons.length > 0 ? Math.round(completed / levelLessons.length * 100) : 0;

      books.push({
        level: level,
        title: levelTitles[level],
        color: levelColors[level],
        lessonCount: levelLessons.length,
        completedCount: completed,
        progress: progress,
        lessons: levelLessons
      });
    }

    this.setData({ books: books });
  },

  openBook: function(e) {
    var level = e.currentTarget.dataset.level;
    var book = null;
    for (var i = 0; i < this.data.books.length; i++) {
      if (this.data.books[i].level === level) { book = this.data.books[i]; break; }
    }
    if (!book) return;

    var completed = wx.getStorageSync('completedLessons') || [];
    var mapped = [];
    for (var j = 0; j < book.lessons.length; j++) {
      var ls = book.lessons[j];
      mapped.push({
        id: ls.id,
        title: ls.title,
        subtitle: ls.description || '',
        done: completed.indexOf(ls.id) !== -1,
        number: j + 1,
        words: ls.words_count || 0,
        grammar: ls.grammar_count || 0
      });
    }

    this.setData({
      currentBook: { title: book.title, level: book.level, color: book.color },
      currentBookLessons: mapped
    });
  },

  closeBook: function() {
    this.setData({ currentBook: null, currentBookLessons: [] });
  },

  startLesson: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/japanese/pages/lesson/lesson?id=' + id });
  },

  goBack: function() {
    if (this.data.currentBook) {
      this.closeBook();
    } else {
      wx.navigateBack();
    }
  }
});
