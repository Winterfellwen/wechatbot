var lessons = require('../../data/lessons.js');
var exercises = require('../../data/exercises.js');
var grammarData = require('../../data/grammar.js');
var wordsIndex = require('../../data/words/index.js');
var textsData = require('../../data/texts.js');

Page({
  data: {
    lessonId: 0,
    lessonTitle: '',
    level: '',
    segment: 'words',
    words: [],
    grammar: [],
    textDialogue: null,
    questions: [],
    current: 0,
    total: 0,
    progress: 0,
    showResult: false,
    isCorrect: false,
    selectedIndex: -1,
    correctIndex: -1,
    currentQuestion: null,
    score: 0
  },

  onLoad: function(options) {
    var lessonId = parseInt(options.id) || 1;
    var lesson = null;
    for (var i = 0; i < lessons.length; i++) {
      if (lessons[i].id === lessonId) {
        lesson = lessons[i];
        break;
      }
    }

    if (!lesson) {
      wx.showToast({ title: '课程不存在', icon: 'none' });
      setTimeout(function() { wx.navigateBack(); }, 1500);
      return;
    }

    var lessonWords = wordsIndex.byLesson(lessonId).slice(0, 20);

    var lessonGrammar = [];
    for (var gi = 0; gi < grammarData.length; gi++) {
      if (grammarData[gi].lesson === lessonId) {
        lessonGrammar.push(grammarData[gi]);
      }
    }

    var lessonTexts = [];
    for (var ti = 0; ti < textsData.length; ti++) {
      if (textsData[ti].lesson === lessonId) {
        lessonTexts.push(textsData[ti]);
      }
    }

    var lessonExercises = [];
    for (var ei = 0; ei < exercises.length; ei++) {
      if (exercises[ei].lesson === lessonId) {
        lessonExercises.push(exercises[ei]);
      }
    }

    this.setData({
      lessonId: lessonId,
      lessonTitle: lesson.title,
      level: lesson.level,
      words: lessonWords,
      grammar: lessonGrammar,
      textDialogue: lessonTexts.length > 0 ? lessonTexts[0] : null,
      questions: lessonExercises,
      segment: 'words'
    });
  },

  goBack: function() {
    wx.navigateBack();
  },

  selectSegment: function(e) {
    if (this.data.showResult) return;
    var seg = e.currentTarget.dataset.seg;
    if (seg === 'quiz') {
      this.startQuiz();
    } else {
      this.setData({ segment: seg });
    }
  },

  startQuiz: function() {
    var quizQuestions = this.data.questions;
    if (!quizQuestions || quizQuestions.length === 0) {
      wx.showToast({ title: '暂无练习', icon: 'none' });
      return;
    }

    var firstQ = quizQuestions[0];
    var isChoice = (firstQ.type === 'choice' && firstQ.options);
    var correctVal = isChoice ? firstQ.answer : 0;

    this.setData({
      segment: 'quiz',
      current: 1,
      total: quizQuestions.length,
      score: 0,
      showResult: false,
      selectedIndex: -1,
      currentQuestion: firstQ,
      correctIndex: correctVal,
      fillAnswer: '',
      isChoice: isChoice,
      progress: Math.round(1 / quizQuestions.length * 100)
    });
  },

  onFillInput: function(e) {
    this.setData({ fillAnswer: e.detail.value });
  },

  selectOption: function(e) {
    if (this.data.showResult) return;

    var index = parseInt(e.currentTarget.dataset.index);
    var question = this.data.currentQuestion;
    var correct = question.answer;
    var isCorrect = (index === correct);

    this.setData({
      selectedIndex: index,
      correctIndex: correct,
      showResult: true,
      isCorrect: isCorrect,
      score: this.data.score + (isCorrect ? 1 : 0)
    });
  },

  checkFill: function() {
    if (this.data.showResult) return;

    var question = this.data.currentQuestion;
    var userAnswer = (this.data.fillAnswer || '').trim().toLowerCase();
    var correctAnswer = (question.answer || '').trim().toLowerCase();
    var isCorrect = userAnswer === correctAnswer;

    this.setData({
      showResult: true,
      isCorrect: isCorrect,
      score: this.data.score + (isCorrect ? 1 : 0)
    });
  },

  nextQuestion: function() {
    var questions = this.data.questions;
    var next = this.data.current;

    if (next >= questions.length) {
      this.completeLesson();
      return;
    }

    var q = questions[next];
    var isChoice = (q.type === 'choice' && q.options);
    var correctVal = isChoice ? q.answer : 0;

    this.setData({
      current: next + 1,
      showResult: false,
      selectedIndex: -1,
      currentQuestion: q,
      correctIndex: correctVal,
      fillAnswer: '',
      isChoice: isChoice,
      progress: Math.round((next + 1) / questions.length * 100)
    });
  },

  completeLesson: function() {
    var lessonId = this.data.lessonId;
    var completed = wx.getStorageSync('completedLessons') || [];
    var progress = wx.getStorageSync('learningProgress') || {};

    if (completed.indexOf(lessonId) === -1) {
      completed.push(lessonId);
    }

    var score = this.data.score;
    var maxScore = this.data.questions.length;
    var divisor = maxScore > 0 ? maxScore : 1;
    var xpEarned = Math.round(score / divisor * 20);
    var newExp = (progress.exp || 0) + xpEarned;
    var newLevel = Math.floor(newExp / 100) + 1;

    var newProgress = {};
    for (var key in progress) {
      if (progress.hasOwnProperty(key)) {
        newProgress[key] = progress[key];
      }
    }
    newProgress.exp = newExp;
    newProgress.level = newLevel;
    newProgress.lessonsCompleted = completed.length;
    newProgress.progress = Math.round(completed.length / lessons.length * 100);

    wx.setStorageSync('completedLessons', completed);
    wx.setStorageSync('learningProgress', newProgress);

    var that = this;
    wx.showModal({
      title: '课程完成',
      content: '得分: ' + score + '/' + maxScore + '\n获得 ' + xpEarned + ' XP',
      confirmText: '返回',
      success: function() {
        wx.navigateBack();
      }
    });
  }
});
