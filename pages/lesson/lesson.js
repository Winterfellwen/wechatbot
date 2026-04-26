const app = getApp();
const CourseData = require('../../data/courseData');

Page({
  data: {
    lessonId: 0,
    lessonTitle: '',
    current: 1,
    total: 5,
    progress: 0,
    currentQuestion: {},
    selectedIndex: -1,
    correctIndex: 0,
    showResult: false,
    isCorrect: false,
    questions: []
  },

  onLoad(options) {
    const lessonId = parseInt(options.id) || 1;
    this.setData({ lessonId: lessonId });
    this.loadLesson(lessonId);
  },

  loadLesson(lessonId) {
    const lesson = CourseData.getLessonById(lessonId);
    if (!lesson) {
      wx.showToast({ title: '课程不存在', icon: 'none' });
      return;
    }

    const questions = CourseData.getQuestionsByType(lesson.type);
    this.setData({
      lessonTitle: lesson.title,
      lessonType: lesson.type,
      total: questions.length,
      currentQuestion: questions[0],
      questions: questions
    });
  },

  selectOption(e) {
    if (this.data.showResult) return;
    const index = e.currentTarget.dataset.index;
    const correct = this.data.currentQuestion.correct;
    this.setData({
      selectedIndex: index,
      correctIndex: correct,
      showResult: true,
      isCorrect: index === correct
    });
  },

  nextQuestion() {
    if (this.data.current >= this.data.total) {
      this.completeLesson();
      return;
    }
    const next = this.data.current + 1;
    this.setData({
      current: next,
      currentQuestion: this.data.questions[next - 1],
      selectedIndex: -1,
      showResult: false,
      isCorrect: false,
      progress: (next / this.data.total) * 100
    });
  },

  goBack() {
    wx.navigateBack();
  },

  playAudio() {
    wx.showToast({ title: '播放音频', icon: 'none' });
  },

  completeLesson() {
    let xp = 0;
    for (let i = 0; i < this.data.questions.length; i++) {
      if (i === this.data.questions[i].correct) {
        xp += this.data.questions[i].xp;
      }
    }
    
    let progress = wx.getStorageSync('learningProgress') || {};
    let completed = wx.getStorageSync('completedLessons') || [];
    let totalLessons = CourseData.getTotalLessons();
    
    progress = {
      exp: (progress.exp || 0) + xp,
      level: Math.floor(((progress.exp || 0) + xp) / 100) + 1,
      lessonsCompleted: (progress.lessonsCompleted || 0) + 1,
      progress: ((progress.lessonsCompleted || 0) + 1) / totalLessons * 100
    };
    
    if (completed.indexOf(this.data.lessonId) === -1) {
      completed.push(this.data.lessonId);
    }
    
    wx.setStorageSync('learningProgress', progress);
    wx.setStorageSync('completedLessons', completed);
    wx.showToast({ title: '闯关成功 +' + xp + 'XP', icon: 'success' });
    var that = this;
    setTimeout(function() { wx.navigateBack(); }, 1500);
  }
});