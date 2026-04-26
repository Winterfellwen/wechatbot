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
      url: '/pages/lesson/lesson?id=' + id
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