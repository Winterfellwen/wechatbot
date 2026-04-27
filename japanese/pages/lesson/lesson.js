var lessons = require('../../data/lessons.js');
var grammarData = require('../../data/grammar.js');
var wordsIndex = require('../../data/words/index.js');
var textsData = require('../../data/texts.js');

// Build dynamic quiz questions from lesson data
function buildQuiz(lessonId, lesson) {
  var words = wordsIndex.byLesson(lessonId).slice(0, 12);
  var grammar = [];
  for (var i = 0; i < grammarData.length; i++) {
    if (grammarData[i].lesson === lessonId) grammar.push(grammarData[i]);
  }

  var q = [];

  // Type 1: 单词选择 (word→meaning)
  for (var wi = 0; wi < words.length && wi < 5; wi++) {
    var correct = words[wi];
    var distractors = [];
    for (var d = 0; d < words.length && distractors.length < 3; d++) {
      if (d !== wi) distractors.push(words[d].meaning);
    }
    while (distractors.length < 3) distractors.push('不存在');
    var options = [correct.meaning];
    for (var dd = 0; dd < distractors.length; dd++) {
      options.push(distractors[dd]);
    }
    // shuffle
    for (var s = options.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var tmp = options[s]; options[s] = options[j]; options[j] = tmp;
    }
    var ansIdx = options.indexOf(correct.meaning);
    q.push({
      type: 'choice',
      prompt: '"' + correct.word + '" (' + correct.reading + ') 的意思是？',
      options: options,
      answer: ansIdx
    });
  }

  // Type 2: 逆向选择 (meaning→word)
  for (var ri = 0; ri < words.length && ri < 3; ri++) {
    var cw = words[ri];
    var dist = [];
    for (var dd2 = 0; dd2 < words.length && dist.length < 3; dd2++) {
      if (dd2 !== ri) dist.push(words[dd2].word + ' (' + words[dd2].reading + ')');
    }
    while (dist.length < 3) dist.push('???');
    var ops = [cw.word + ' (' + cw.reading + ')'];
    for (var dd3 = 0; dd3 < dist.length; dd3++) ops.push(dist[dd3]);
    for (var s2 = ops.length - 1; s2 > 0; s2--) {
      var j2 = Math.floor(Math.random() * (s2 + 1));
      var t2 = ops[s2]; ops[s2] = ops[j2]; ops[j2] = t2;
    }
    var aidx = ops.indexOf(cw.word + ' (' + cw.reading + ')');
    q.push({
      type: 'choice',
      prompt: '"' + cw.meaning + '" 对应的日语是？',
      options: ops,
      answer: aidx
    });
  }

  // Type 3: 读音选择 (word→reading)
  for (var pi = 0; pi < words.length && pi < 3; pi++) {
    var pw = words[pi];
    var pd = [];
    for (var pd2 = 0; pd2 < words.length && pd.length < 3; pd2++) {
      if (pd2 !== pi) pd.push(words[pd2].reading);
    }
    while (pd.length < 3) pd.push('?');
    var pops = [pw.reading];
    for (var pd3 = 0; pd3 < pd.length; pd3++) pops.push(pd[pd3]);
    for (var ps = pops.length - 1; ps > 0; ps--) {
      var pj = Math.floor(Math.random() * (ps + 1));
      var pt = pops[ps]; pops[ps] = pops[pj]; pops[pj] = pt;
    }
    var paidx = pops.indexOf(pw.reading);
    q.push({
      type: 'choice',
      prompt: '"' + pw.word + '" 的读音是？',
      options: pops,
      answer: paidx
    });
  }

  // Type 4: 拼写 (fill blank for word)
  for (var fi = 0; fi < words.length && fi < 3; fi++) {
    var fw = words[fi];
    q.push({
      type: 'fill',
      prompt: '"' + fw.meaning + '" 的日语（假名）怎么写？',
      hints: [fw.reading.charAt(0)],
      answer: fw.reading
    });
  }

  // Type 5: 听力选择 (phonetic choice)
  for (var hi = 0; hi < words.length && hi < 3; hi++) {
    var hw = words[hi];
    var hd = [];
    for (var hd2 = 0; hd2 < words.length && hd.length < 3; hd2++) {
      if (hd2 !== hi) hd.push(words[hd2].meaning);
    }
    while (hd.length < 3) hd.push('不存在');
    var hops = [hw.meaning];
    for (var hd3 = 0; hd3 < hd.length; hd3++) hops.push(hd[hd3]);
    for (var hs = hops.length - 1; hs > 0; hs--) {
      var hj = Math.floor(Math.random() * (hs + 1));
      var ht = hops[hs]; hops[hs] = hops[hj]; hops[hj] = ht;
    }
    var haidx = hops.indexOf(hw.meaning);
    q.push({
      type: 'listening',
      prompt: '听发音，选择正确意思：',
      audio: hw.reading,
      options: hops,
      answer: haidx
    });
  }

  // Type 6: 语法选择
  for (var gi = 0; gi < grammar.length && gi < 4; gi++) {
    var g = grammar[gi];
    q.push({
      type: 'choice',
      prompt: g.explanation,
      options: [g.pattern, g.structure || g.pattern + ' (结构)', '〜ません', '〜ましょう'],
      answer: 0
    });
  }

  // Type 7: 填空句子
  for (var gfi = 0; gfi < grammar.length && gfi < 3; gfi++) {
    var gf = grammar[gfi];
    var sentence = gf.example || '';
    if (sentence) {
      var fillWord = gf.pattern || '';
      var masked = sentence.replace(fillWord, '____');
      if (masked !== sentence) {
        q.push({
          type: 'fill',
          prompt: '填空：' + masked + '\n（' + (gf.translation || '') + '）',
          answer: fillWord
        });
      }
    }
  }

  // Shuffle all questions
  for (var sq = q.length - 1; sq > 0; sq--) {
    var sj = Math.floor(Math.random() * (sq + 1));
    var st = q[sq]; q[sq] = q[sj]; q[sj] = st;
  }

  // Limit to ~15 questions
  if (q.length > 18) q = q.slice(0, 18);

  return q;
}

Page({
  data: {
    lessonId: 0,
    lessonTitle: '',
    level: '',
    questions: [],
    current: 0,
    total: 0,
    progress: 0,
    score: 0,
    showResult: false,
    isCorrect: false,
    selectedIndex: -1,
    correctIndex: -1,
    currentQuestion: null,
    fillAnswer: '',
    streak: 0,
    combo: 0,
    showComplete: false,
    xpEarned: 0
  },

  onLoad: function(options) {
    var lessonId = parseInt(options.id) || 1;
    var lesson = null;
    for (var i = 0; i < lessons.length; i++) {
      if (lessons[i].id === lessonId) { lesson = lessons[i]; break; }
    }
    if (!lesson) {
      wx.showToast({ title: '课程不存在', icon: 'none' });
      setTimeout(function() { wx.navigateBack(); }, 1500);
      return;
    }

    var quiz = buildQuiz(lessonId, lesson);
    this.setData({
      lessonId: lessonId,
      lessonTitle: lesson.title,
      level: lesson.level,
      questions: quiz,
      total: quiz.length
    });

    if (quiz.length > 0) {
      this.showQuestion(0);
    }
  },

  showQuestion: function(index) {
    var q = this.data.questions[index];
    if (!q) return;
    this.setData({
      current: index + 1,
      progress: Math.round((index + 1) / this.data.total * 100),
      currentQuestion: q,
      showResult: false,
      selectedIndex: -1,
      correctIndex: q.type === 'choice' || q.type === 'listening' ? q.answer : -1,
      fillAnswer: '',
      isCorrect: false
    });
  },

  selectOption: function(e) {
    if (this.data.showResult) return;
    var idx = parseInt(e.currentTarget.dataset.index);
    var q = this.data.currentQuestion;
    var correct = q.answer;
    var isRight = idx === correct;

    this.setData({
      selectedIndex: idx,
      correctIndex: correct,
      showResult: true,
      isCorrect: isRight,
      score: this.data.score + (isRight ? 1 : 0),
      streak: isRight ? this.data.streak + 1 : 0,
      combo: isRight ? this.data.combo + 1 : 0
    });

    if (!isRight) this.setData({ combo: 0 });
  },

  onFillInput: function(e) {
    this.setData({ fillAnswer: e.detail.value });
  },

  checkFill: function() {
    if (this.data.showResult) return;
    var q = this.data.currentQuestion;
    var userAns = (this.data.fillAnswer || '').trim().toLowerCase();
    var correctAns = (q.answer || '').trim().toLowerCase();
    var isRight = userAns === correctAns;

    this.setData({
      showResult: true,
      isCorrect: isRight,
      score: this.data.score + (isRight ? 1 : 0),
      streak: isRight ? this.data.streak + 1 : 0,
      combo: isRight ? this.data.combo + 1 : 0
    });
    if (!isRight) this.setData({ combo: 0 });
  },

  playAudio: function() {
    var q = this.data.currentQuestion;
    if (q && q.audio) {
      wx.showToast({ title: q.audio, icon: 'none' });
    }
  },

  nextQuestion: function() {
    var idx = this.data.current;
    if (idx >= this.data.total) {
      this.finishQuiz();
      return;
    }
    this.showQuestion(idx);
  },

  finishQuiz: function() {
    var score = this.data.score;
    var total = this.data.total;
    var xp = total > 0 ? Math.round(score / total * 20) : 10;
    if (score === total) xp = 30; // perfect bonus

    var lessonId = this.data.lessonId;
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

    this.setData({
      showComplete: true,
      xpEarned: xp
    });
  },

  goBack: function() { wx.navigateBack(); },

  startAgain: function() {
    var quiz = buildQuiz(this.data.lessonId, null);
    this.setData({
      questions: quiz, total: quiz.length, current: 0, score: 0,
      showResult: false, showComplete: false, streak: 0, combo: 0
    });
    if (quiz.length > 0) this.showQuestion(0);
  }
});
