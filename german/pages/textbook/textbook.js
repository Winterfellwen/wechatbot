Page({
  data: {
    books: [],
    currentBook: null,
    lessons: []
  },

  onLoad: function() {
    this.loadBooks();
  },

  loadBooks: function() {
    this.setData({
      books: [
        { level: 'A1', title: '基础德语 A1', color: 'linear-gradient(135deg, #2563EB, #3B82F6)', lessonCount: 15, wordCount: 200, progress: 0 },
        { level: 'A2', title: '进阶德语 A2', color: 'linear-gradient(135deg, #22C55E, #16A34A)', lessonCount: 15, wordCount: 300, progress: 0 },
        { level: 'B1', title: '中级德语 B1', color: 'linear-gradient(135deg, #F97316, #EA580C)', lessonCount: 15, wordCount: 400, progress: 0 },
        { level: 'B2', title: '高级德语 B2', color: 'linear-gradient(135deg, #EF4444, #DC2626)', lessonCount: 15, wordCount: 500, progress: 0 }
      ]
    });
  },

  openBook: function(e) {
    var level = e.currentTarget.dataset.level;
    var progress = wx.getStorageSync('german_user_progress') || {};
    var completed = progress.completedLevels || [];

    var lessons = [];
    for (var i = 1; i <= 15; i++) {
      lessons.push({
        id: level.toLowerCase() + '-' + i,
        number: i,
        title: '第 ' + i + ' 课',
        words: 10 + i,
        done: completed.indexOf(level.toLowerCase() + '_' + i) !== -1
      });
    }

    this.setData({
      currentBook: { level: level, title: level + ' 德语' },
      lessons: lessons
    });
  },

  startLesson: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/german/pages/lesson/lesson?level=' + id.split('-')[0] + '&unit=' + id.split('-')[1]
    });
  },

  closeBook: function() {
    this.setData({ currentBook: null });
  },

  goBack: function() {
    wx.navigateBack();
  }
});