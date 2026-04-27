const lessons = require('../../data/lessons.js');

Page({
  data: {
    textbooks: [
      { id: 1, title: '日语入门', subtitle: 'N5 (第1-20课)', level: 'N5', cover: '#4CAF50', lessons: [1,20], desc: '从五十音图到日常会话' },
      { id: 2, title: '日语初级', subtitle: 'N4 (第21-38课)', level: 'N4', cover: '#2196F3', lessons: [21,38], desc: '旅行、文化、应用会话' },
      { id: 3, title: '日语中级', subtitle: 'N3 (第39-56课)', level: 'N3', cover: '#FF9800', lessons: [39,56], desc: '语法深化、表达拓展' },
      { id: 4, title: '日语高级', subtitle: 'N2 (第57-66课)', level: 'N2', cover: '#9C27B0', lessons: [57,66], desc: '商务日语、辩论、新闻阅读' },
      { id: 5, title: '日语精通', subtitle: 'N1 (第67-76课)', level: 'N1', cover: '#F44336', lessons: [67,76], desc: '学术日语、翻译实践' }
    ],
    currentBook: 0,
    bookLessons: []
  },

  onLoad() {
    this.loadProgress();
  },

  onShow() {
    this.loadProgress();
  },

  loadProgress() {
    const bookProgress = wx.getStorageSync('bookProgress') || {};
    const textbooks = this.data.textbooks.map(b => {
      const levelLessons = lessons.filter(l => l.level === b.level);
      const completed = levelLessons.filter(l => l.progress >= 100).length;
      return { ...b, progress: Math.round(completed / levelLessons.length * 100) };
    });
    this.setData({ textbooks });
  },

  openBook(e) {
    const id = e.currentTarget.dataset.id;
    const book = this.data.textbooks.find(b => b.id === id);
    if (!book) return;
    
    const bookLessons = lessons.filter(l => l.level === book.level);
    this.setData({ currentBook: id, bookLessons });
  },

  goBack() {
    this.setData({ currentBook: 0, bookLessons: [] });
  },

  openLesson(e) {
    const lessonId = e.currentTarget.dataset.id;
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    
    wx.navigateTo({
      url: `/japanese/pages/lesson/lesson?id=${lessonId}&title=${lesson.title}&level=${lesson.level}`
    });
  }
});