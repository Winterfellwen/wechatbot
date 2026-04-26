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
    let completed = wx.getStorageSync('completedLessons') || [];
    
    progress = {
      ...progress,
      exp: (progress.exp || 0) + xp,
      level: Math.floor(((progress.exp || 0) + xp) / 100) + 1,
      lessonsCompleted: (progress.lessonsCompleted || 0) + 1,
      progress: ((progress.lessonsCompleted || 0) + 1) * 100 / 28
    };
    
    if (!completed.includes(this.data.lessonId)) {
      completed.push(this.data.lessonId);
    }
    
    wx.setStorageSync('learningProgress', progress);
    wx.setStorageSync('completedLessons', completed);
    wx.showToast({ title: `闯关成功 +${xp}XP`, icon: 'success' });
    setTimeout(() => wx.navigateBack(), 1500);
  },

  getSampleQuestions(lessonId, bookId) {
    const allQuestions = {
      1: [
        { question: '「你好」用日语怎么说?', options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'], correct: 0, xp: 10 },
        { question: '「谢谢」的正确读音是?', options: ['こうりゃ', 'ありやとう', 'ありと', 'ありとう'], correct: 3, xp: 10 },
        { question: '「早上好」用日语是?', options: ['こんばんは', 'おはよう', 'さようなら', 'こんにちは'], correct: 1, xp: 10 },
        { question: '「我」的女性用语是?', options: ['わたし', 'わたくし', 'あたし', 'ぼく'], correct: 2, xp: 10 },
        { question: '「不是」用日语说?', options: ['はい', 'いいえ', 'です', 'ます'], correct: 1, xp: 10 }
      ],
      2: [
        { question: '「再见」用日语是?', options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'], correct: 1, xp: 10 },
        { question: '「对不起」怎么说?', options: ['ごめん', 'ありがとう', 'すみません', 'さいど'], correct: 2, xp: 10 },
        { question: '「晚上好」是?', options: ['おはよう', 'こんばんは', 'さいよう', 'こんにちは'], correct: 1, xp: 10 },
        { question: '「我」男性用语?', options: ['わたし', 'わたくし', 'あたし', 'ぼく'], correct: 3, xp: 10 },
        { question: '「是」怎么说?', options: ['はい', 'いいえ', 'です', 'ます'], correct: 0, xp: 10 }
      ],
      3: [
        { question: '「这是什么」日语?', options: ['これです', 'それです', 'あれです', 'どれです'], correct: 0, xp: 10 },
        { question: '「那个人」日语?', options: ['この人', 'あのひと', 'そのひと', 'どのひと'], correct: 1, xp: 10 },
        { question: '「学生」日语?', options: ['がくせい', 'べんごし', 'かんごし', 'いしゃ'], correct: 0, xp: 10 },
        { question: '「老师」日语?', options: ['がくせい', 'せんせい', 'ゆうめい', 'びょういん'], correct: 1, xp: 10 },
        { question: '「公司」日语?', options: ['かいしゃ', 'がっこう', 'びょういん', 'えき'], correct: 0, xp: 10 }
      ],
      4: [
        { question: '「去」的敬体是?', options: ['いく', 'いきます', 'いった', 'いって'], correct: 1, xp: 10 },
        { question: '「吃」尊敬语是?', options: ['たべる', 'たべられます', 'たべない', 'たべました'], correct: 1, xp: 10 },
        { question: '「看」的过去式?', options: ['みる', 'みた', 'みる', 'みる'], correct: 1, xp: 10 },
        { question: '「听」的命令形?', options: ['きく', 'きいて', 'きけ', 'きこう'], correct: 2, xp: 10 },
        { question: '「说」的意志形?', options: ['いう', 'いえば', 'いい', 'いう'], correct: 2, xp: 10 }
      ],
      5: [
        { question: '「大きい」的类型?', options: ['い形容詞', 'な形容詞', '動詞', '名詞'], correct: 0, xp: 10 },
        { question: '「静か」的类型?', options: ['い形容詞', 'な形容詞', '動詞', '名詞'], correct: 1, xp: 10 },
        { question: '「漂亮」的日语?', options: ['きれいな', 'きれいに', 'きれいだ', 'きれい'], correct: 3, xp: 10 },
        { question: '「开心」怎么说?', options: ['楽しい', '早くて', '美味しい', '難しい'], correct: 0, xp: 10 },
        { question: '「难了?的类型?', options: ['い形容詞', 'な形容詞', '動詞', '名詞'], correct: 0, xp: 10 }
      ],
      6: [
        { question: '「です」的否定是?', options: ['ではありません', 'ないです', 'そうです', 'べきです'], correct: 0, xp: 10 },
        { question: '「ます」的否定是?', options: ['ません', 'ないです', 'そうです', 'べきです'], correct: 0, xp: 10 },
        { question: '「去公园」去哪里?', options: ['こうえん', 'びょういん', 'がっこう', 'えき'], correct: 0, xp: 10 },
        { question: '「电车」日语?', options: ['でしゃ', 'てんしゃ', 'でんしゃ', 'ない'], correct: 2, xp: 10 },
        { question: '「车站」日语?', options: ['えき', 'みせ', 'いえ', 'ばしょ'], correct: 0, xp: 10 }
      ],
      7: [
        { question: '「谁」用日语是?', options: ['だれ', 'なに', 'どこ', 'いつ'], correct: 0, xp: 10 },
        { question: '「什么」日语?', options: ['だれ', 'なに', 'どこ', 'いつ'], correct: 1, xp: 10 },
        { question: '「哪里」日语?', options: ['だれ', 'なに', 'どこ', 'いつ'], correct: 2, xp: 10 },
        { question: '「什么时候」?', options: ['だれ', 'なに', 'どこ', 'いつ'], correct: 3, xp: 10 },
        { question: '「为什么」日语?', options: ['なぜ', 'なに', 'どこ', 'いつ'], correct: 0, xp: 10 }
      ],
      8: [
        { question: '「昨天」日语?', options: ['きのう', 'きょう', 'あした', 'みょうにち'], correct: 0, xp: 10 },
        { question: '「今天」日语?', options: ['きのう', 'きょう', 'あした', 'みょうにち'], correct: 1, xp: 10 },
        { question: '「明天」日语?', options: ['きのう', 'きょう', 'あした', 'みょうにち'], correct: 2, xp: 10 },
        { question: '「现在」日语?', options: ['いま', 'きょう', 'あさ', 'よる'], correct: 0, xp: 10 },
        { question: '「早上」日语?', options: ['いま', 'きょう', 'あさ', 'よる'], correct: 2, xp: 10 }
      ],
      9: [
        { question: '「一点」日语?', options: ['いちじ', 'にじ', 'さんじ', 'よじ'], correct: 0, xp: 10 },
        { question: '「两点」日语?', options: ['いちじ', 'にじ', 'さんじ', 'よじ'], correct: 1, xp: 10 },
        { question: '「三点」日语?', options: ['いちじ', 'にじ', 'さんじ', 'よじ'], correct: 2, xp: 10 },
        { question: '「四点」日语?', options: ['いちじ', 'にじ', 'さんじ', 'よじ'], correct: 3, xp: 10 },
        { question: '「五点」日语?', options: ['ごじ', 'ろくじ', 'しちじ', 'はちじ'], correct: 0, xp: 10 }
      ],
      10: [
        { question: '「百」日语?', options: ['ひゃく', 'せん', 'まん', 'おく'], correct: 0, xp: 10 },
        { question: '「千」日语?', options: ['ひゃく', 'せん', 'まん', 'おく'], correct: 1, xp: 10 },
        { question: '「万」日语?', options: ['ひゃく', 'せん', 'まん', 'おく'], correct: 2, xp: 10 },
        { question: '「十万」日语?', options: ['じゅうまん', 'ひゃくせん', 'いちまん', 'おたく'], correct: 0, xp: 10 },
        { question: '「一百万」日语?', options: ['ひゃくまん', 'せんまん', 'いちおく', 'じゅうおく'], correct: 2, xp: 10 }
      ]
    };
    return allQuestions[lessonId] || allQuestions[1];
  }
});