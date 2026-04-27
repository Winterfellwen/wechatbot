const lessons = require('../../data/lessons.js');
const exercises = require('../../data/exercises.js');
// const texts = require('../../data/texts.js');
const wordsIndex = require('../../data/words/index.js');

Page({
  data: {
    lessonId: 0,
    lessonTitle: '',
    level: '',
    current: 0,
    total: 0,
    progress: 0,
    showResult: false,
    isCorrect: false,
    selectedIndex: -1,
    correctIndex: -1,
    currentQuestion: null,
    questions: [],
    score: 0,
    segment: 'words',
    segments: [
      { key: 'words', label: '词汇' },
      { key: 'grammar', label: '语法' },
      { key: 'text', label: '课文' },
      { key: 'quiz', label: '练习' }
    ],
    currentSegmentIndex: 0,
    words: [],
    grammar: [],
    textDialogue: null,
    segmentProgress: 0
  },

  onLoad(options) {
    const lessonId = parseInt(options.id) || 1;
    const lesson = lessons.find(l => l.id === lessonId);

    if (!lesson) {
      wx.showToast({ title: '课程不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const lessonExercises = exercises.filter(e => e.lesson === lessonId);
    const lessonWords = wordsIndex.byLesson(lessonId);

    this.setData({
      lessonId,
      lessonTitle: lesson.title,
      level: lesson.level,
      questions: lessonExercises,
      total: 4, // 4 segments total
      words: lessonWords.slice(0, 15),
      grammar: [],
      currentSegmentIndex: 0
    });

    this.goToSegment('words');
  },

  goToSegment(key) {
    if (key === 'quiz') {
      this.startQuiz();
    } else {
      this.setData({ segment: key });
    }
  },

  selectSegment(e) {
    if (this.data.showResult) return;
    const seg = e.currentTarget.dataset.seg;
    this.goToSegment(seg);
  },

  // Quiz logic
  startQuiz() {
    const quizQuestions = this.data.questions;
    if (!quizQuestions || quizQuestions.length === 0) {
      wx.showToast({ title: '暂无练习', icon: 'none' });
      return;
    }

    this.setData({
      segment: 'quiz',
      current: 1,
      total: quizQuestions.length,
      score: 0,
      showResult: false,
      selectedIndex: -1,
      currentQuestion: quizQuestions[0],
      correctIndex: quizQuestions[0].answer || 0,
      progress: Math.round(1 / quizQuestions.length * 100)
    });
  },

  selectOption(e) {
    if (this.data.showResult) return;

    const index = e.currentTarget.dataset.index;
    const question = this.data.currentQuestion;
    const correct = question.answer || 0;
    const isCorrect = index === correct;
    const newScore = this.data.score + (isCorrect ? 1 : 0);

    this.setData({
      selectedIndex: index,
      correctIndex: correct,
      showResult: true,
      isCorrect: isCorrect,
      score: newScore
    });
  },

  nextQuestion() {
    const questions = this.data.questions;
    const next = this.data.current;

    if (next >= questions.length) {
      this.completeLesson();
      return;
    }

    const quiz = questions[next];
    this.setData({
      current: next + 1,
      showResult: false,
      selectedIndex: -1,
      currentQuestion: quiz,
      correctIndex: quiz.answer || 0,
      progress: Math.round((next + 1) / questions.length * 100)
    });
  },

  completeLesson() {
    const progress = wx.getStorageSync('learningProgress') || {};
    const completed = wx.getStorageSync('completedLessons') || [];
    const lessonId = this.data.lessonId;

    if (completed.indexOf(lessonId) === -1) {
      completed.push(lessonId);
    }

    const score = this.data.score;
    const maxScore = this.data.questions.length;
    const xpEarned = Math.round(score / Math.max(maxScore, 1) * 20);
    const newExp = (progress.exp || 0) + xpEarned;
    const newLevel = Math.floor(newExp / 100) + 1;

    wx.setStorageSync('completedLessons', completed);
    wx.setStorageSync('learningProgress', {
      ...progress,
      exp: newExp,
      level: newLevel,
      lessonsCompleted: completed.length,
      progress: Math.round(completed.length / lessons.length * 100)
    });

    wx.showModal({
      title: '课程完成',
      content: `得分: ${score}/${maxScore}\n获得 ${xpEarned} XP`,
      confirmText: '返回',
      success: () => { wx.navigateBack(); }
    });
  }
});
