var lessons = require('../../data/lessons.js');
var grammarData = require('../../data/grammar.js');
var wordsIndex = require('../../data/words/index.js');
var textsData = require('../../data/texts.js');
var tts = require('../../utils/tts');
var iconGen = require('../../../utils/icon-generator');

function buildQuiz(lessonId) {
  var words = wordsIndex.byLesson(lessonId).slice(0, 10);
  var grammar = [];
  for (var i = 0; i < grammarData.length; i++) {
    if (grammarData[i].lesson === lessonId) grammar.push(grammarData[i]);
  }

  var q = [];

  for (var wi = 0; wi < words.length && wi < 5; wi++) {
    var correct = words[wi];
    var distractors = [];
    for (var d = 0; d < words.length && distractors.length < 3; d++) {
      if (d !== wi) distractors.push(words[d].meaning);
    }
    while (distractors.length < 3) distractors.push('不存在');
    var options = [correct.meaning].concat(distractors);
    for (var s = options.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var tmp = options[s]; options[s] = options[j]; options[j] = tmp;
    }
    var wordWithReading = correct.word === correct.reading ? correct.word : correct.word + ' (' + correct.reading + ')';
    q.push({ type: 'choice', prompt: '"' + correct.word + '" 的意思是？', options: options, answer: options.indexOf(correct.meaning) });
  }

  for (var ri = 0; ri < words.length && ri < 3; ri++) {
    var cw = words[ri];
    var dist = [];
    for (var dd2 = 0; dd2 < words.length && dist.length < 3; dd2++) {
      if (dd2 !== ri) {
        var dword = words[dd2];
        dist.push(dword.word === dword.reading ? dword.word : dword.word + ' (' + dword.reading + ')');
      }
    }
    while (dist.length < 3) dist.push('???');
    var correctWithReading = cw.word === cw.reading ? cw.word : cw.word + ' (' + cw.reading + ')';
    var ops = [correctWithReading].concat(dist);
    for (var s2 = ops.length - 1; s2 > 0; s2--) {
      var j2 = Math.floor(Math.random() * (s2 + 1));
      var t2 = ops[s2]; ops[s2] = ops[j2]; ops[j2] = t2;
    }
    q.push({ type: 'choice', prompt: '"' + cw.meaning + '" 对应的日语是？', options: ops, answer: ops.indexOf(correctWithReading) });
  }

  for (var pi = 0; pi < words.length && pi < 2; pi++) {
    var pw = words[pi];
    if (pw.word === pw.reading) continue;
    var pd = [];
    for (var pd2 = 0; pd2 < words.length && pd.length < 3; pd2++) {
      if (pd2 !== pi && words[pd2].word !== words[pd2].reading) pd.push(words[pd2].reading);
    }
    while (pd.length < 3) pd.push('?');
    var pops = [pw.reading].concat(pd);
    for (var ps = pops.length - 1; ps > 0; ps--) {
      var pj = Math.floor(Math.random() * (ps + 1));
      var pt = pops[ps]; pops[ps] = pops[pj]; pops[pj] = pt;
    }
    q.push({ type: 'choice', prompt: '"' + pw.word + '" 的读音是？', options: pops, answer: pops.indexOf(pw.reading) });
  }

  for (var fi = 0; fi < words.length && fi < 2; fi++) {
    var fw = words[fi];
    q.push({ type: 'fill', prompt: '"' + fw.meaning + '" 的日语（假名）怎么写？', hints: [fw.reading.charAt(0)], answer: fw.reading });
  }

  for (var hi = 0; hi < words.length && hi < 2; hi++) {
    var hw = words[hi];
    var hd = [];
    for (var hd2 = 0; hd2 < words.length && hd.length < 3; hd2++) {
      if (hd2 !== hi) hd.push(words[hd2].meaning);
    }
    while (hd.length < 3) hd.push('不存在');
    var hops = [hw.meaning].concat(hd);
    for (var hs = hops.length - 1; hs > 0; hs--) {
      var hj = Math.floor(Math.random() * (hs + 1));
      var ht = hops[hs]; hops[hs] = hops[hj]; hops[hj] = ht;
    }
    q.push({ type: 'listening', prompt: '听发音，选择正确意思：', audio: hw.reading, options: hops, answer: hops.indexOf(hw.meaning) });
  }

  for (var gi = 0; gi < grammar.length && gi < 3; gi++) {
    q.push({ type: 'choice', prompt: grammar[gi].explanation, options: [grammar[gi].pattern, grammar[gi].structure || '结构', '〜ません', '〜ましょう'], answer: 0 });
  }

  for (var gfi = 0; gfi < grammar.length && gfi < 2; gfi++) {
    var sent = grammar[gfi].example || '';
    var fillW = grammar[gfi].pattern || '';
    var masked = sent.replace(fillW, '____');
    if (masked !== sent) {
      q.push({ type: 'fill', prompt: '填空：' + masked + '\n（' + (grammar[gfi].translation || '') + '）', answer: fillW });
    }
  }

  for (var sq = q.length - 1; sq > 0; sq--) {
    var sj = Math.floor(Math.random() * (sq + 1));
    var st = q[sq]; q[sq] = q[sj]; q[sj] = st;
  }
  if (q.length > 18) q = q.slice(0, 18);
  return q;
}

Page({
   data: {
    lessonId: 0, lessonTitle: '', lessonSubtitle: '', level: '',
    mode: 'study', // 'study' or 'quiz'
    words: [], grammar: [], textDialogue: null,
    current: 0, total: 0, progress: 0, score: 0,
    showResult: false, isCorrect: false,
    selectedIndex: -1, correctIndex: -1,
    currentQuestion: null, fillAnswer: '', streak: 0, combo: 0,
    showComplete: false, xpEarned: 0,
    questions: [],
    playingWord: '',
    nextUnitId: 0,
    completeStars: { full: 0, half: 0, empty: 5 },
    speakerNormal: '',
    speakerActive: ''
  },

   onLoad: function(options) {
      var lessonId = parseInt(options.id) || 1;
      var initialMode = options.mode || 'study';

      var lesson = null;
      for (var i = 0; i < lessons.length; i++) {
        if (lessons[i].id === lessonId) { lesson = lessons[i]; break; }
      }
      if (!lesson) {
        wx.showToast({ title: '课程不存在', icon: 'none' });
        setTimeout(function() { wx.navigateBack(); }, 1500);
        return;
      }

      var lessonWords = wordsIndex.byLesson(lessonId).slice(0, 20).map(function(w) { w.expanded = false; return w; });
      var lessonGrammar = [];
      for (var gi = 0; gi < grammarData.length; gi++) {
        if (grammarData[gi].lesson === lessonId) lessonGrammar.push(grammarData[gi]);
      }
      var lessonTexts = [];
      for (var ti = 0; ti < textsData.length; ti++) {
        if (textsData[ti].lesson === lessonId) lessonTexts.push(textsData[ti]);
      }

      this.setData({
        lessonId: lessonId, lessonTitle: lesson.title, lessonSubtitle: lesson.subtitle || '', level: lesson.level,
        mode: initialMode,
        words: lessonWords, grammar: lessonGrammar,
        textDialogue: lessonTexts.length > 0 ? lessonTexts[0] : null
      });

      // Preload TTS for all words in this lesson when page loads
      tts.preLoad();
      tts.preLoadWords(lessonWords, 'ja-JP');

      if (initialMode === 'quiz') {
        this.startQuiz();
      }
    },

  onReady: function() {
    var that = this;
    iconGen.initSpeakerIcons('icon-canvas', that).then(function(paths) {
      that.setData({
        speakerNormal: paths.speakerNormal,
        speakerActive: paths.speakerActive
      });
    }).catch(function(err) {
      console.error('Failed to generate speaker icons:', err);
    });
  },

  goBack: function() { wx.navigateBack(); },

  startQuiz: function() {
    var quiz = buildQuiz(this.data.lessonId);
    if (!quiz || quiz.length === 0) {
      wx.showToast({ title: '暂无练习', icon: 'none' });
      return;
    }
    var firstQ = quiz[0];
    this.setData({
      mode: 'quiz', questions: quiz, total: quiz.length,
      current: 1, score: 0, showResult: false, selectedIndex: -1,
      currentQuestion: firstQ, correctIndex: firstQ.type === 'choice' || firstQ.type === 'listening' ? firstQ.answer : -1,
      fillAnswer: '', progress: Math.round(1 / quiz.length * 100)
    });
  },

  selectOption: function(e) {
    if (this.data.showResult) return;
    var idx = parseInt(e.currentTarget.dataset.index);
    var q = this.data.currentQuestion;
    var isRight = idx === q.answer;
    this.setData({
      selectedIndex: idx, correctIndex: q.answer, showResult: true,
      isCorrect: isRight, score: this.data.score + (isRight ? 1 : 0),
      streak: isRight ? this.data.streak + 1 : 0,
      combo: isRight ? this.data.combo + 1 : 0,
      showFirework: isRight, showShake: !isRight
    });
    if (!isRight) this.setData({ combo: 0 });
    if (!isRight) {
      var that = this;
      setTimeout(function() { that.setData({ showShake: false }); }, 500);
    }
    if (isRight) {
      var that = this;
      setTimeout(function() { that.setData({ showFirework: false }); }, 1500);
    }
  },

  onFillInput: function(e) { this.setData({ fillAnswer: e.detail.value }); },

  checkFill: function() {
    if (this.data.showResult) return;
    var user = (this.data.fillAnswer || '').trim().toLowerCase();
    var correct = (this.data.currentQuestion.answer || '').trim().toLowerCase();
    var isRight = user === correct;
    this.setData({
      showResult: true, isCorrect: isRight,
      score: this.data.score + (isRight ? 1 : 0),
      streak: isRight ? this.data.streak + 1 : 0,
      combo: isRight ? this.data.combo + 1 : 0
    });
    if (!isRight) this.setData({ combo: 0 });
  },

  playAudio: function() {
    var q = this.data.currentQuestion;
    if (q && q.audio) wx.showToast({ title: q.audio, icon: 'none' });
  },

  nextQuestion: function() {
    var idx = this.data.current;
    if (idx >= this.data.total) { this.finishQuiz(); return; }
    var q = this.data.questions[idx];
    this.setData({
      current: idx + 1, showResult: false, selectedIndex: -1,
      currentQuestion: q, correctIndex: q.answer, fillAnswer: '',
      progress: Math.round((idx + 1) / this.data.total * 100)
    });
  },

  finishQuiz: function() {
    var score = this.data.score, total = this.data.total;
    var xp = total > 0 ? Math.round(score / total * 20) : 10;
    if (score === total) xp = 30;
    var lessonId = this.data.lessonId;

    // Save Japanese lesson score
    if (score > 0) {
      var loginLib = require('../../../utils/login');
      loginLib.saveJpLessonScore(lessonId, score, total).catch(function(){});
    }
    var completed = wx.getStorageSync('completedLessons') || [];
    var progress = wx.getStorageSync('learningProgress') || {};
    if (score >= total * 0.6) {
      if (completed.indexOf(lessonId) === -1) completed.push(lessonId);
    }
    var newProgress = {};
    for (var k in progress) { if (progress.hasOwnProperty(k)) newProgress[k] = progress[k]; }
    newProgress.exp = (newProgress.exp || 0) + xp;
    newProgress.level = Math.floor(newProgress.exp / 100) + 1;
    newProgress.lessonsCompleted = completed.length;
    newProgress.progress = Math.round(completed.length / lessons.length * 100);
    wx.setStorageSync('completedLessons', completed);
    wx.setStorageSync('learningProgress', newProgress);

    var currentIdx = -1;
    for (var i = 0; i < lessons.length; i++) {
      if (lessons[i].id === lessonId) { currentIdx = i; break; }
    }
    var nextId = 0;
    if (currentIdx >= 0 && currentIdx < lessons.length - 1) {
      nextId = lessons[currentIdx + 1].id;
    }

    var stars = this.getStarData(score, total);
    this.setData({ showComplete: true, xpEarned: xp, nextUnitId: nextId, completeStars: stars });
  },

  startAgain: function() { this.startQuiz(); },

  nextUnit: function() {
    if (this._isNavigating) return;
    this._isNavigating = true;
    var that = this;
    var nextId = this.data.nextUnitId;
    setTimeout(function() {
      if (nextId) {
        wx.redirectTo({ url: '/japanese/pages/lesson/lesson?id=' + nextId + '&mode=quiz', complete: function() { that._isNavigating = false; } });
      } else {
        that.startQuiz();
        that._isNavigating = false;
      }
    }, 200);
  },

  playAudio: function(e) {
    var word = e && e.currentTarget && e.currentTarget.dataset.word;
    if (!word) {
      var q = this.data.currentQuestion;
      if (q && q.audio) word = q.audio;
    }
    if (word) {
      var that = this;
      that.setData({ playingWord: word });
      tts.speak(word).finally(function() {
        that.setData({ playingWord: '' });
      });
    }
  },

  toggleWordExpand: function(e) {
    var idx = parseInt(e.currentTarget.dataset.index);
    var words = this.data.words;
    words[idx].expanded = !words[idx].expanded;
    this.setData({ words: words });
  },

  getStarData: function(score, total) {
    if (!score || !total) return { full: 0, half: 0, empty: 5 };
    var percentage = score / total * 100;
    var stars = percentage / 20;
    var fullStars = Math.floor(stars);
    var hasHalf = (stars - fullStars) >= 0.5;
    var halfStars = hasHalf ? 1 : 0;
    var emptyStars = 5 - fullStars - halfStars;
    return { full: fullStars, half: halfStars, empty: emptyStars };
  }
});
