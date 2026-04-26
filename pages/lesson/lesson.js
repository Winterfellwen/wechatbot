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

  onLoad: function(options) {
    var lessonId = parseInt(options.id) || 1;
    this.setData({ lessonId: lessonId });
    this.loadLesson(lessonId);
  },

  getLessonById: function(lessonId) {
    var allLessons = [
      { id: 1, title: '五十音图', type: 'hiragana', xp: 10 },
      { id: 2, title: '浊音半浊音', type: 'hiragana', xp: 10 },
      { id: 3, title: '长音促音', type: 'pronunciation', xp: 15 },
      { id: 4, title: '声调语调', type: 'pronunciation', xp: 15 },
      { id: 5, title: '第1课', type: 'dialogue', xp: 20 },
      { id: 6, title: '第2课', type: 'dialogue', xp: 20 },
      { id: 7, title: '第3课', type: 'dialogue', xp: 20 },
      { id: 8, title: '第4课', type: 'dialogue', xp: 20 },
      { id: 9, title: '第5课', type: 'dialogue', xp: 25 },
      { id: 10, title: '第6课', type: 'dialogue', xp: 25 },
      { id: 11, title: '第7课', type: 'dialogue', xp: 25 },
      { id: 12, title: '第8课', type: 'dialogue', xp: 25 },
      { id: 13, title: '第9课', type: 'dialogue', xp: 30 },
      { id: 14, title: '第10课', type: 'dialogue', xp: 30 },
      { id: 15, title: '第11课', type: 'dialogue', xp: 30 },
      { id: 16, title: '第12课', type: 'dialogue', xp: 35 },
      { id: 17, title: '第13课', type: 'dialogue', xp: 35 },
      { id: 18, title: '第14课', type: 'dialogue', xp: 35 },
      { id: 19, title: '第15课', type: 'dialogue', xp: 40 },
      { id: 20, title: '第16课', type: 'dialogue', xp: 40 },
      { id: 21, title: '第17课', type: 'dialogue', xp: 40 },
      { id: 22, title: '第18课', type: 'dialogue', xp: 45 },
      { id: 23, title: '第19课', type: 'dialogue', xp: 45 },
      { id: 24, title: '第20课', type: 'dialogue', xp: 50 },
      { id: 25, title: '第21课', type: 'dialogue', xp: 50 },
      { id: 26, title: '第22课', type: 'dialogue', xp: 50 },
      { id: 27, title: '第23课', type: 'dialogue', xp: 55 },
      { id: 28, title: '第24课', type: 'dialogue', xp: 55 }
    ];
    for (var i = 0; i < allLessons.length; i++) {
      if (allLessons[i].id === lessonId) {
        return allLessons[i];
      }
    }
    return null;
  },

  getQuestionsByType: function(type) {
    var templates = {
      hiragana: [
        { question: '"あ"行第一个是?', options: ['あ', 'い', 'う', 'え'], correct: 0, xp: 10 },
        { question: '"か"行第一个是?', options: ['か', 'き', 'く', 'け'], correct: 0, xp: 10 },
        { question: '"さ"行第一个是?', options: ['さ', 'し', 'す', 'せ'], correct: 0, xp: 10 },
        { question: '"た"行第一个是?', options: ['た', 'ち', 'つ', 'て'], correct: 0, xp: 10 },
        { question: '"な"行第一个是?', options: ['な', 'に', 'ぬ', 'ね'], correct: 0, xp: 10 }
      ],
      pronunciation: [
        { question: '"あめ"的读音是?', options: ['あめ', 'ame', 'あみ', 'あむ'], correct: 0, xp: 10 },
        { question: '"つくえ"的读音是?', options: ['つくえ', 'つけ', 'つげ', 'つこ'], correct: 0, xp: 10 },
        { question: '"はい"的读音是?', options: ['はい', 'はい', 'はい', 'はい'], correct: 0, xp: 10 },
        { question: '"いい"的读音是?', options: ['いい', 'い', 'いい', 'いい'], correct: 0, xp: 10 },
        { question: '"先生"的读音是?', options: ['せんせい', 'せんせ', 'せいせい', 'せんせい'], correct: 0, xp: 10 }
      ],
      dialogue: [
        { question: '"你好"的日语是?', options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'], correct: 0, xp: 10 },
        { question: '"谢谢"的日语是?', options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'], correct: 2, xp: 10 },
        { question: '"再见"的日语是?', options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'], correct: 1, xp: 10 },
        { question: '"对不起"的日语是?', options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'], correct: 3, xp: 10 },
        { question: '"早上好"的日语是?', options: ['おはよう', 'こんばんは', 'こんにちは', 'さようなら'], correct: 0, xp: 10 }
      ]
    };
    return templates[type] || templates.dialogue;
  },

  getTotalLessons: function() {
    return 28;
  },

  loadLesson: function(lessonId) {
    var lesson = this.getLessonById(lessonId);
    if (!lesson) {
      wx.showToast({ title: '课程不存在', icon: 'none' });
      return;
    }

    var questions = this.getQuestionsByType(lesson.type);
    this.setData({
      lessonTitle: lesson.title,
      lessonType: lesson.type,
      total: questions.length,
      currentQuestion: questions[0],
      questions: questions
    });
  },

  selectOption: function(e) {
    if (this.data.showResult) return;
    var index = e.currentTarget.dataset.index;
    var correct = this.data.currentQuestion.correct;
    this.setData({
      selectedIndex: index,
      correctIndex: correct,
      showResult: true,
      isCorrect: index === correct
    });
  },

  nextQuestion: function() {
    if (this.data.current >= this.data.total) {
      this.completeLesson();
      return;
    }
    var next = this.data.current + 1;
    this.setData({
      current: next,
      currentQuestion: this.data.questions[next - 1],
      selectedIndex: -1,
      showResult: false,
      isCorrect: false,
      progress: (next / this.data.total) * 100
    });
  },

  goBack: function() {
    wx.navigateBack();
  },

  playAudio: function() {
    wx.showToast({ title: '播放音频', icon: 'none' });
  },

  completeLesson: function() {
    var xp = 0;
    for (var i = 0; i < this.data.questions.length; i++) {
      if (i === this.data.questions[i].correct) {
        xp += this.data.questions[i].xp;
      }
    }
    
    var progress = wx.getStorageSync('learningProgress') || {};
    var completed = wx.getStorageSync('completedLessons') || [];
    var totalLessons = this.getTotalLessons();
    
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