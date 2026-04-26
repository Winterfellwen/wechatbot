const app = getApp();

function getBooks() {
  return [
    { id: 1, name: '第一册', lessons: [
      { id: 1, number: '①', title: '五十音图', description: '学习日语假名', xp: 10, type: 'hiragana' },
      { id: 2, number: '②', title: '浊音·半浊音', description: '学习浊音假名', xp: 10, type: 'hiragana' },
      { id: 3, number: '③', title: '长音·促音', description: '特殊音节发音', xp: 15, type: 'pronunciation' },
      { id: 4, number: '④', title: '声调·语调', description: '日语声调规律', xp: 15, type: 'pronunciation' },
      { id: 5, number: '⑤', title: '第1课', description: '新标日第1课', xp: 20, type: 'dialogue' },
      { id: 6, number: '⑥', title: '第2课', description: '新标日第2课', xp: 20, type: 'dialogue' },
      { id: 7, number: '⑦', title: '第3课', description: '新标日第3课', xp: 20, type: 'dialogue' },
      { id: 8, number: '⑧', title: '第4课', description: '新标日第4课', xp: 20, type: 'dialogue' },
      { id: 9, number: '⑨', title: '第5课', description: '新标日第5课', xp: 25, type: 'dialogue' },
      { id: 10, number: '⑩', title: '第6课', description: '新标日第6课', xp: 25, type: 'dialogue' }
    ]},
    { id: 2, name: '第二册', lessons: [
      { id: 11, number: '①', title: '第7课', description: '新标日第7课', xp: 25, type: 'dialogue' },
      { id: 12, number: '②', title: '第8课', description: '新标日第8课', xp: 25, type: 'dialogue' },
      { id: 13, number: '③', title: '第9课', description: '新标日第9课', xp: 30, type: 'dialogue' },
      { id: 14, number: '④', title: '第10课', description: '新标日第10课', xp: 30, type: 'dialogue' },
      { id: 15, number: '⑤', title: '第11课', description: '新标日第11课', xp: 30, type: 'dialogue' },
      { id: 16, number: '⑥', title: '第12课', description: '新标日第12课', xp: 35, type: 'dialogue' }
    ]},
    { id: 3, name: '第三册', lessons: [
      { id: 17, number: '①', title: '第13课', description: '新标日第13课', xp: 35, type: 'dialogue' },
      { id: 18, number: '②', title: '第14课', description: '新标日第14课', xp: 35, type: 'dialogue' },
      { id: 19, number: '③', title: '第15课', description: '新标日第15课', xp: 40, type: 'dialogue' },
      { id: 20, number: '④', title: '第16课', description: '新标日第16课', xp: 40, type: 'dialogue' }
    ]},
    { id: 4, name: '第四册', lessons: [
      { id: 21, number: '①', title: '第17课', description: '新标日第17课', xp: 40, type: 'dialogue' },
      { id: 22, number: '②', title: '第18课', description: '新标日第18课', xp: 45, type: 'dialogue' },
      { id: 23, number: '③', title: '第19课', description: '新标日第19课', xp: 45, type: 'dialogue' },
      { id: 24, number: '④', title: '第20课', description: '新标日第20课', xp: 50, type: 'dialogue' }
    ]},
    { id: 5, name: '第五册', lessons: [
      { id: 25, number: '①', title: '第21课', description: '新标日第21课', xp: 50, type: 'dialogue' },
      { id: 26, number: '②', title: '第22课', description: '新标日第22课', xp: 50, type: 'dialogue' },
      { id: 27, number: '③', title: '第23课', description: '新标日第23课', xp: 55, type: 'dialogue' },
      { id: 28, number: '④', title: '第24课', description: '新标日第24课', xp: 55, type: 'dialogue' }
    ]}
  ];
}

function getTotalLessons() {
  var books = getBooks();
  var total = 0;
  for (var i = 0; i < books.length; i++) {
    total += books[i].lessons.length;
  }
  return total;
}

function getLessonsByBook(bookId) {
  var books = getBooks();
  for (var i = 0; i < books.length; i++) {
    if (books[i].id === bookId) {
      return books[i].lessons;
    }
  }
  return [];
}

function getLessonById(lessonId) {
  var books = getBooks();
  for (var i = 0; i < books.length; i++) {
    var book = books[i];
    for (var j = 0; j < book.lessons.length; j++) {
      var lesson = book.lessons[j];
      if (lesson.id === lessonId) {
        return { id: lesson.id, title: lesson.title, type: lesson.type, xp: lesson.xp };
      }
    }
  }
  return null;
}

function getQuestionTemplates() {
  return {
    hiragana: [
      { question: '「あ」行第一个是?', options: ['あ', 'い', 'う', 'え'], correct: 0, xp: 10 },
      { question: '「か」行第一个是?', options: ['か', 'き', 'く', 'け'], correct: 0, xp: 10 },
      { question: '「さ」行第一个是?', options: ['さ', 'し', 'す', 'せ'], correct: 0, xp: 10 },
      { question: '「た」行第一个是?', options: ['た', 'ち', 'つ', 'て'], correct: 0, xp: 10 },
      { question: '「な」行第一个是?', options: ['な', 'に', 'ぬ', 'ね'], correct: 0, xp: 10 }
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
}

function getQuestionsByType(type) {
  var templates = getQuestionTemplates();
  return templates[type] || templates.dialogue;
}

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

  onLoad: function() {
    this.loadData();
  },

  goBack: function() {
    wx.navigateBack();
  },

  onShow: function() {
    this.loadProgress();
  },

  loadData: function() {
    var books = getBooks();
    var completed = wx.getStorageSync('completedLessons') || [];
    var totalLessons = getTotalLessons();
    var progress = wx.getStorageSync('learningProgress') || {};
    
    var currentData = getLessonsByBook(this.data.currentBook);
    var mappedData = [];
    for (var i = 0; i < currentData.length; i++) {
      var lesson = currentData[i];
      mappedData.push({
        id: lesson.id,
        number: lesson.number,
        title: lesson.title,
        description: lesson.description,
        xp: lesson.xp,
        completed: completed.indexOf(lesson.id) !== -1
      });
    }
    
    this.setData({
      books: books,
      currentLessonData: mappedData,
      progress: (progress.lessonsCompleted || 0) / totalLessons * 100,
      level: progress.level || 1,
      exp: progress.exp || 0
    });
  },

  loadProgress: function() {
    var completed = wx.getStorageSync('completedLessons') || [];
    var progress = wx.getStorageSync('learningProgress') || {};
    var totalLessons = getTotalLessons();
    
    var currentData = getLessonsByBook(this.data.currentBook);
    var mappedData = [];
    for (var i = 0; i < currentData.length; i++) {
      var lesson = currentData[i];
      mappedData.push({
        id: lesson.id,
        number: lesson.number,
        title: lesson.title,
        description: lesson.description,
        xp: lesson.xp,
        completed: completed.indexOf(lesson.id) !== -1
      });
    }
    
    this.setData({
      progress: progress.progress || ((progress.lessonsCompleted || 0) / totalLessons * 100),
      level: progress.level || 1,
      exp: progress.exp || 0,
      currentLessonData: mappedData
    });
  },

  switchLesson: function(e) {
    var id = e.currentTarget.dataset.id;
    var completed = wx.getStorageSync('completedLessons') || [];
    var bookData = getLessonsByBook(id);
    var mappedData = [];
    for (var i = 0; i < bookData.length; i++) {
      var lesson = bookData[i];
      mappedData.push({
        id: lesson.id,
        number: lesson.number,
        title: lesson.title,
        description: lesson.description,
        xp: lesson.xp,
        completed: completed.indexOf(lesson.id) !== -1
      });
    }
    
    this.setData({
      currentBook: id,
      currentLessonData: mappedData
    });
  },

  startLesson: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/lesson/lesson?id=' + id
    });
  },

  goToLesson: function() {
    wx.redirectTo({ url: '/pages/learn/learn' });
  },

  goToCourse: function() {
    wx.redirectTo({ url: '/pages/course/course' });
  },

  goToAI: function() {
    wx.redirectTo({ url: '/pages/aichat/aichat' });
  },

  goToRank: function() {
    wx.navigateTo({ url: '/pages/leaderboard/leaderboard' });
  }
});