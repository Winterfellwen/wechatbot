const app = getApp();
const CourseData = require('../../data/courseData');

Page({
  data: {
    progress: 0,
    level: 1,
    exp: 0,
    currentBook: 1,
    books: [],
    currentLessonData: [],
    currentTab: 'lesson'
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
    var books = CourseData.getBooks();
    var completed = wx.getStorageSync('completedLessons') || [];
    var totalLessons = CourseData.getTotalLessons();
    var progress = wx.getStorageSync('learningProgress') || {};
    
    var currentData = CourseData.getLessonsByBook(this.data.currentBook).map(function(lesson) {
      return { ...lesson, completed: completed.indexOf(lesson.id) !== -1 };
    });
    
    this.setData({
      books: books,
      currentLessonData: currentData,
      progress: (progress.lessonsCompleted || 0) / totalLessons * 100,
      level: progress.level || 1,
      exp: progress.exp || 0
    });
  },

  loadProgress() {
    var completed = wx.getStorageSync('completedLessons') || [];
    var progress = wx.getStorageSync('learningProgress') || {};
    var totalLessons = CourseData.getTotalLessons();
    
    var currentData = CourseData.getLessonsByBook(this.data.currentBook).map(function(lesson) {
      return { ...lesson, completed: completed.indexOf(lesson.id) !== -1 };
    });
    
    this.setData({
      progress: progress.progress || ((progress.lessonsCompleted || 0) / totalLessons * 100),
      level: progress.level || 1,
      exp: progress.exp || 0,
      currentLessonData: currentData
    });
  },

  switchLesson(e) {
    var id = e.currentTarget.dataset.id;
    var completed = wx.getStorageSync('completedLessons') || [];
    var currentData = CourseData.getLessonsByBook(id).map(function(lesson) {
      return { ...lesson, completed: completed.indexOf(lesson.id) !== -1 };
    });
    
    this.setData({
      currentBook: id,
      currentLessonData: currentData
    });
  },

  startLesson(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/lesson/lesson?id=' + id
    });
  },

  goToLesson() {
    wx.redirectTo({ url: '/pages/learn/learn' });
  },

  goToCourse() {
    wx.redirectTo({ url: '/pages/course/course' });
  },

  goToAI() {
    wx.redirectTo({ url: '/pages/aichat/aichat' });
  },

  goToRank() {
    wx.navigateTo({ url: '/pages/leaderboard/leaderboard' });
  }
});