// 课程数据 - 可动态配置
var CourseData = {
  
  // 获取所有教材册
  getBooks: function() {
    return [
      {
        id: 1,
        name: '第一册',
        lessons: [
          { id: 1, number: '①', title: '五十音图', description: '学习日语假名', xp: 10, type: 'hiragana' },
          { id: 2, number: '②', title: '浊音·半浊音', description: '学习浊音假名', xp: 10, type: 'hiragana' },
          { id: 3, number: '③', title: '长音·促音', description: '特殊音节发音', xp: 15, type: 'hiragana' },
          { id: 4, number: '④', title: '声调·语调', description: '日语声调规律', xp: 15, type: 'pronunciation' },
          { id: 5, number: '⑤', title: '第1课 森先生', description: '新标日第1课', xp: 20, type: 'dialogue' },
          { id: 6, number: '⑥', title: '第2课 这是书', description: '新标日第2课', xp: 20, type: 'dialogue' },
          { id: 7, number: '⑦', title: '第3课 商店', description: '新标日第3课', xp: 20, type: 'dialogue' },
          { id: 8, number: '⑧', title: '第4课 场所', description: '新标日第4课', xp: 20, type: 'dialogue' },
          { id: 9, number: '⑨', title: '第5课 一天', description: '新标日第5课', xp: 25, type: 'dialogue' },
          { id: 10, number: '⑩', title: '第6课 京都', description: '新标日第6课', xp: 25, type: 'dialogue' }
        ]
      },
      {
        id: 2,
        name: '第二册',
        lessons: [
          { id: 11, number: '①', title: '第7课 计划', description: '新标日第7课', xp: 25, type: 'dialogue' },
          { id: 12, number: '②', title: '第8课 神社', description: '新标日第8课', xp: 25, type: 'dialogue' },
          { id: 13, number: '③', title: '第9课 礼物', description: '新标日第9课', xp: 30, type: 'dialogue' },
          { id: 14, number: '④', title: '第10课 旅行', description: '新标日第10课', xp: 30, type: 'dialogue' },
          { id: 15, number: '⑤', title: '第11课 兴趣', description: '新标日第11课', xp: 30, type: 'dialogue' },
          { id: 16, number: '⑥', title: '第12课 料理', description: '新标日第12课', xp: 35, type: 'dialogue' }
        ]
      },
      {
        id: 3,
        name: '第三册',
        lessons: [
          { id: 17, number: '①', title: '第13课 机场', description: '新标日第13课', xp: 35, type: 'dialogue' },
          { id: 18, number: '②', title: '第14课 程度', description: '新标日第14课', xp: 35, type: 'dialogue' },
          { id: 19, number: '③', title: '第15课 拜年', description: '新标日第15课', xp: 40, type: 'dialogue' },
          { id: 20, number: '④', title: '第16课 反应', description: '新标日第16课', xp: 40, type: 'dialogue' }
        ]
      },
      {
        id: 4,
        name: '第四册',
        lessons: [
          { id: 21, number: '①', title: '第17课 限制', description: '新标日第17课', xp: 40, type: 'dialogue' },
          { id: 22, number: '②', title: '第18课 话题', description: '新标日第18课', xp: 45, type: 'dialogue' },
          { id: 23, number: '③', title: '第19课 使用', description: '新标日第19课', xp: 45, type: 'dialogue' },
          { id: 24, number: '④', title: '第20课 观光', description: '新标日第20课', xp: 50, type: 'dialogue' }
        ]
      },
      {
        id: 5,
        name: '第五册',
        lessons: [
          { id: 25, number: '①', title: '第21课 继承', description: '新标日第21课', xp: 50, type: 'dialogue' },
          { id: 26, number: '②', title: '第22课 相谈', description: '新标日第22课', xp: 50, type: 'dialogue' },
          { id: 27, number: '③', title: '第23课 对应', description: '新标日���23课', xp: 55, type: 'dialogue' },
          { id: 28, number: '④', title: '第24课 概要', description: '新标日第24课', xp: 55, type: 'dialogue' }
        ]
      }
    ];
  },

  // 获取题目模板类型
  getQuestionTemplates: function() {
    return {
      hiragana: [
        { question: '「あ」行第一个是?', options: ['あ', 'い', 'う', 'え'], correct: 0, xp: 10 },
        { question: '「か」行第一个是?', options: ['か', 'き', 'く', 'け'], correct: 0, xp: 10 },
        { question: '「さ」行第一个是?', options: ['さ', 'し', 'す', 'せ'], correct: 0, xp: 10 },
        { question: '「た」行第一个是?', options: ['た', 'ち', 'つ', 'て'], correct: 0, xp: 10 },
        { question: '「な」行第一个是?', options: ['な', 'に', 'ぬ', 'ね'], correct: 0, xp: 10 }
      ],
      pronunciation: [
        { question: '「あめ」的正确读音是?', options: ['あめ', 'ame', 'あみ', 'あむ'], correct: 0, xp: 10 },
        { question: '「つくえ」的正确读音是?', options: ['つくえ', 'つけ', 'つげ', 'つこ'], correct: 0, xp: 10 },
        { question: '「はい」的正确读音是?', options: ['はい', 'はい', 'はい', 'はい'], correct: 0, xp: 10 },
        { question: '「いい」的正确读音是?', options: ['いい', 'い', 'いい', 'いい'], correct: 0, xp: 10 },
        { question: '「先生」的正确读音是?', options: ['せんせい', 'せんせ', 'せいせい', 'せんせい'], correct: 0, xp: 10 }
      ],
      dialogue: [
        { question: '「你好」的日语是?', options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'], correct: 0, xp: 10 },
        { question: '「谢谢」的日语是?', options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'], correct: 2, xp: 10 },
        { question: '「再见」的日语是?', options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'], correct: 1, xp: 10 },
        { question: '「对不起」的日语是?', options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'], correct: 3, xp: 10 },
        { question: '「早上好」的日语是?', options: ['おはよう', 'こんばんは', 'こんにちは', 'さようなら'], correct: 0, xp: 10 }
      ]
    };
  },

  // 根据课程类型获取题目
  getQuestionsByType: function(type) {
    var templates = this.getQuestionTemplates();
    return templates[type] || templates.dialogue;
  },

  // 获取所有课程
  getAllLessons: function() {
    var all = [];
    var books = this.getBooks();
    for (var i = 0; i < books.length; i++) {
      var book = books[i];
      for (var j = 0; j < book.lessons.length; j++) {
        var lesson = book.lessons[j];
        all.push({
          id: lesson.id,
          number: lesson.number,
          title: lesson.title,
          description: lesson.description,
          xp: lesson.xp,
          type: lesson.type,
          bookId: book.id,
          bookName: book.name
        });
      }
    }
    return all;
  },

  // 根据ID获取课程
  getLessonById: function(lessonId) {
    var books = this.getBooks();
    for (var i = 0; i < books.length; i++) {
      var book = books[i];
      for (var j = 0; j < book.lessons.length; j++) {
        var lesson = book.lessons[j];
        if (lesson.id === lessonId) {
          return {
            id: lesson.id,
            number: lesson.number,
            title: lesson.title,
            description: lesson.description,
            xp: lesson.xp,
            type: lesson.type,
            bookId: book.id,
            bookName: book.name
          };
        }
      }
    }
    return null;
  },

  // 根据册ID获取课程列表
  getLessonsByBook: function(bookId) {
    var books = this.getBooks();
    for (var i = 0; i < books.length; i++) {
      if (books[i].id === bookId) {
        return books[i].lessons;
      }
    }
    return [];
  },

  // 获取总课程数
  getTotalLessons: function() {
    return this.getAllLessons().length;
  }
};

module.exports = CourseData;