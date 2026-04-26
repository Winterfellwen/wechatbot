const app = getApp();

Page({
  data: {
    lessonId: 0,
    bookId: 1,
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
    const lessonId = options.id || 1;
    const bookId = options.book || 1;
    this.setData({
      lessonId,
      bookId,
      lessonTitle: `第${lessonId}课`
    });
    this.loadQuestions(lessonId, bookId);
  },

  loadQuestions(lessonId, bookId) {
    const questions = this.getSampleQuestions(lessonId, bookId);
    this.setData({
      questions,
      total: questions.length,
      currentQuestion: questions[0]
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
    const xp = this.data.questions.filter((q, i) => q.correct === i).reduce((sum, q) => sum + q.xp, 0);
    let progress = wx.getStorageSync('learningProgress') || {};
    progress = {
      ...progress,
      exp: (progress.exp || 0) + xp,
      level: Math.floor(((progress.exp || 0) + xp) / 100) + 1,
      lessonsCompleted: (progress.lessonsCompleted || 0) + 1
    };
    wx.setStorageSync('learningProgress', progress);
    wx.showToast({ title: `闯关成功 +${xp}XP`, icon: 'success' });
    setTimeout(() => wx.navigateBack(), 1500);
  },

  getSampleQuestions(lessonId, bookId) {
    return [
      {
        question: '「你好」的正确日语是?',
        options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'],
        correct: 0,
        xp: 10
      },
      {
        question: '「谢谢」的读音是?',
        options: ['こうりゃ', 'ありやとう', 'ありと', 'ありとう'],
        correct: 3,
        xp: 10
      },
      {
        question: '「早上好」的正确日语是?',
        options: ['こんばんは', 'おはよう', 'さようなら', 'こんにちは'],
        correct: 1,
        xp: 10
      },
      {
        question: '「我」的女性用语是?',
        options: ['わたし', 'わたくし', 'あたし', 'ぼく'],
        correct: 2,
        xp: 10
      },
      {
        question: '「不是」的日语是?',
        options: ['はい', 'いいえ', 'です', 'ます'],
        correct: 1,
        xp: 10
      }
    ];
  }
});