const app = getApp();
const CourseData = require('../../data/courseData');

Page({
  data: {
    progress: 0,
    level: 1,
    exp: 0,
    currentBook: 1,
    books: [],
    currentLessonData: []
  },

  onLoad() {
    this.loadData();
  },

  goBack() {
    wx.navigateBack();
  },

  onShow() {
    this.loadProgress();
  },

  loadData() {
    const books = CourseData.getBooks();
    const completed = wx.getStorageSync('completedLessons') || [];
    const totalLessons = CourseData.getTotalLessons();
    const progress = wx.getStorageSync('learningProgress') || {};
    
    const currentData = CourseData.getLessonsByBook(this.data.currentBook).map(lesson => ({
      ...lesson,
      completed: completed.includes(lesson.id)
    }));
    
    this.setData({
      books: books,
      currentLessonData: currentData,
      progress: (progress.lessonsCompleted || 0) / totalLessons * 100,
      level: progress.level || 1,
      exp: progress.exp || 0
    });
  },

  loadProgress() {
    const completed = wx.getStorageSync('completedLessons') || [];
    const progress = wx.getStorageSync('learningProgress') || {};
    const totalLessons = CourseData.getTotalLessons();
    
    const currentData = CourseData.getLessonsByBook(this.data.currentBook).map(lesson => ({
      ...lesson,
      completed: completed.includes(lesson.id)
    }));
    
    this.setData({
      progress: progress.progress || ((progress.lessonsCompleted || 0) / totalLessons * 100),
      level: progress.level || 1,
      exp: progress.exp || 0,
      currentLessonData: currentData
    });
  },

  switchLesson(e) {
    const id = e.currentTarget.dataset.id;
    const completed = wx.getStorageSync('completedLessons') || [];
    const currentData = CourseData.getLessonsByBook(id).map(lesson => ({
      ...lesson,
      completed: completed.includes(lesson.id)
    }));
    
    this.setData({
      currentBook: id,
      currentLessonData: currentData
    });
  },

  startLesson(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/lesson/lesson?id=${id}`
    });
  },

  goToWords() {
    wx.navigateTo({ url: '/pages/wordbook/wordbook' });
  },

  goToGrammar() {
    wx.navigateTo({ url: '/pages/grammar/grammar' });
  },

  goToTextbook() {
    wx.navigateTo({ url: '/pages/textbook/textbook' });
  },

  goToRank() {
    wx.navigateTo({ url: '/pages/leaderboard/leaderboard' });
  }
});
  },

  switchLesson(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      currentLesson: id,
      currentLessonData: this.getSampleLessons(id)
    });
  },

  startLesson(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/lesson/lesson?id=${id}&book=${this.data.currentLesson}`
    });
  },

  goToWords() {
    wx.navigateTo({ url: '/pages/wordbook/wordbook' });
  },

  goToGrammar() {
    wx.navigateTo({ url: '/pages/grammar/grammar' });
  },

  goToTextbook() {
    wx.navigateTo({ url: '/pages/textbook/textbook' });
  },

  goToRank() {
    wx.navigateTo({ url: '/pages/leaderboard/leaderboard' });
  },

  getSampleLessons(bookId, completed = []) {
    const lessons = {
      1: [
        { id: 1, number: '①', title: '五十音图', description: '学习日语假名', xp: 10, completed: completed.includes(1) },
        { id: 2, number: '②', title: '浊音·半浊音', description: '学习浊音假名', xp: 10, completed: completed.includes(2) },
        { id: 3, number: '③', title: '长音·促音', description: '特殊音节发音', xp: 15, completed: completed.includes(3) },
        { id: 4, number: '④', title: '声调·语调', description: '日语声调规律', xp: 15, completed: completed.includes(4) },
        { id: 5, number: '⑤', title: '第1课 森先生', description: '新标日第1课', xp: 20, completed: completed.includes(5) },
        { id: 6, number: '⑥', title: '第2课 这是书', description: '新标日第2课', xp: 20, completed: completed.includes(6) },
        { id: 7, number: '⑦', title: '第3课 商店', description: '新标日第3课', xp: 20, completed: completed.includes(7) },
        { id: 8, number: '⑧', title: '第4课 场所', description: '新标日第4课', xp: 20, completed: completed.includes(8) },
        { id: 9, number: '⑨', title: '第5课 一天', description: '新标日第5课', xp: 25, completed: completed.includes(9) },
        { id: 10, number: '⑩', title: '第6课 京都', description: '新标日第6课', xp: 25, completed: completed.includes(10) }
      ],
      2: [
        { id: 11, number: '①', title: '第7课 计划', description: '新标日第7课', xp: 25, completed: completed.includes(11) },
        { id: 12, number: '②', title: '第8课 神社', description: '新标日第8课', xp: 25, completed: completed.includes(12) },
        { id: 13, number: '③', title: '第9课 礼物', description: '新标日第9课', xp: 30, completed: completed.includes(13) },
        { id: 14, number: '④', title: '第10课 旅行', description: '新标日第10课', xp: 30, completed: completed.includes(14) },
        { id: 15, number: '⑤', title: '第11课 兴趣', description: '新标日第11课', xp: 30, completed: completed.includes(15) },
        { id: 16, number: '⑥', title: '第12课 料理', description: '新标日第12课', xp: 35, completed: completed.includes(16) }
      ],
      3: [
        { id: 17, number: '①', title: '第13课 机场', description: '新标日第13课', xp: 35, completed: completed.includes(17) },
        { id: 18, number: '②', title: '第14课 程度', description: '新标日第14课', xp: 35, completed: completed.includes(18) },
        { id: 19, number: '③', title: '第15课 拜年', description: '新标日第15课', xp: 40, completed: completed.includes(19) },
        { id: 20, number: '④', title: '第16课 反应', description: '新标日第16课', xp: 40, completed: completed.includes(20) }
      ],
      4: [
        { id: 21, number: '①', title: '第17课 限制', description: '新标日第17课', xp: 40, completed: completed.includes(21) },
        { id: 22, number: '②', title: '第18课 话题', description: '新标日第18课', xp: 45, completed: completed.includes(22) },
        { id: 23, number: '③', title: '第19课 使用', description: '新标日第19课', xp: 45, completed: completed.includes(23) },
        { id: 24, number: '④', title: '第20课 观光', description: '新标日第20课', xp: 50, completed: completed.includes(24) }
      ],
      5: [
        { id: 25, number: '①', title: '第21课 继承', description: '新标日第21课', xp: 50, completed: completed.includes(25) },
        { id: 26, number: '②', title: '第22课 相谈', description: '新标日第22课', xp: 50, completed: completed.includes(26) },
        { id: 27, number: '③', title: '第23课 对应', description: '新标日第23课', xp: 55, completed: completed.includes(27) },
        { id: 28, number: '④', title: '第24课 概要', description: '新标日第24课', xp: 55, completed: completed.includes(28) }
      ]
    };
    return lessons[bookId] || [];
  }
});