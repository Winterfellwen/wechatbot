const exercises = [
  // 第一课练习
  {
    lesson: 1,
    type: 'choice',
    question: '"你好"日语怎么说？',
    options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'],
    answer: 0
  },
  {
    lesson: 1,
    type: 'choice',
    question: '"谢谢"日语怎么说？',
    options: ['こんにちは', 'さようなら', 'ありがとう', 'おはよう'],
    answer: 2
  },
  {
    lesson: 1,
    type: 'choice',
    question: '"再见"日语怎么说？',
    options: ['こんにちは', 'さようなら', 'ありがとう', 'すみません'],
    answer: 1
  },
  {
    lesson: 1,
    type: 'fill',
    question: '_____ございます（早上好礼貌形）',
    answer: 'おはよう'
  },
  {
    lesson: 1,
    type: 'fill',
    question: '如何回應"ありがとうございます"？',
    answer: 'どういたしまして'
  },

  // 第二课练习
  {
    lesson: 2,
    type: 'choice',
    question: '"我"日语怎么说？',
    options: ['あなた', 'わたし', 'かれ', 'かのじょ'],
    answer: 1
  },
  {
    lesson: 2,
    type: 'choice',
    question: '"老师"日语怎么说？',
    options: ['がくせい', 'せんせい', 'かいしゃいん', 'ともだち'],
    answer: 1
  },
  {
    lesson: 2,
    type: 'choice',
    question: '"朋友"日语怎么说？',
    options: ['がくせい', 'せんせい', 'かいしゃいん', 'ともだち'],
    answer: 3
  },
  {
    lesson: 2,
    type: 'fill',
    question: '私は学生____。',
    answer: 'です'
  },
  {
    lesson: 2,
    type: 'fill',
    question: 'あなたは学生です____？',
    answer: 'か'
  },

  // 第三课练习
  {
    lesson: 3,
    type: 'choice',
    question: '"这"日语哪个？',
    options: ['これ', 'それ', 'あれ', 'どれ'],
    answer: 0
  },
  {
    lesson: 3,
    type: 'choice',
    question: '"那（较远）"日语哪个？',
    options: ['これ', 'それ', 'あれ', 'どれ'],
    answer: 2
  },
  {
    lesson: 3,
    type: 'choice',
    question: '"哪里"日语哪个？',
    options: ['ここ', 'そこ', 'あそこ', 'どこ'],
    answer: 3
  },
  {
    lesson: 3,
    type: 'fill',
    question: '_____はどこですか。（厕所在哪里）',
    answer: 'トイレ'
  },
  {
    lesson: 3,
    type: 'fill',
    question: 'それは_____ですか。（那是什么）',
    answer: 'なん/何'
  },

  // 第四课练习
  {
    lesson: 4,
    type: 'choice',
    question: '"今天"日语哪个？',
    options: ['きのう', 'きょう', 'あした', '时候'],
    answer: 1
  },
  {
    lesson: 4,
    type: 'choice',
    question: '"明天"日语哪个？',
    options: ['きのう', 'きょう', 'あした', '时候'],
    answer: 2
  },
  {
    lesson: 4,
    type: 'choice',
    question: '"星期日"日语哪个？',
    options: ['にちようび', 'げつようび', 'かようび', 'すいようび'],
    answer: 0
  },
  {
    lesson: 4,
    type: 'fill',
    question: '今_____ですか。（现在几点）',
    answer: 'なんじ'
  },
  {
    lesson: 4,
    type: 'fill',
    question: '今日は水_____です。（今天是星期三）',
    answer: 'ようび'
  },

  // 第五课练习
  {
    lesson: 5,
    type: 'choice',
    question: '"吃"日语哪个？',
    options: ['たべる', 'のむ', 'みる', 'きく'],
    answer: 0
  },
  {
    lesson: 5,
    type: 'choice',
    question: '"去"日语哪个？',
    options: ['いく', 'くる', 'かえる', '��る'],
    answer: 0
  },
  {
    lesson: 5,
    type: 'choice',
    question: '"来"日语哪个？',
    options: ['いく', 'くる', 'かえる', 'みる'],
    answer: 1
  },
  {
    lesson: 5,
    type: 'fill',
    question: '学校に_____。（去学校）',
    answer: 'いく'
  },
  {
    lesson: 5,
    type: 'fill',
    question: '映画を_____。（看电影）',
    answer: 'みる'
  },

  // 第六课练习
  {
    lesson: 6,
    type: 'choice',
    question: '"好吃的"日语哪个？',
    options: ['まずい', 'おいしい', 'すごい', 'かわいい'],
    answer: 1
  },
  {
    lesson: 6,
    type: 'choice',
    question: '"可爱的"日语哪个？',
    options: ['まずい', 'おいしい', 'すごい', 'かわいい'],
    answer: 3
  },
  {
    lesson: 6,
    type: 'fill',
    question: 'この料理は美味しい_____。（好吃）',
    answer: 'です'
  },
  {
    lesson: 6,
    type: 'fill',
    question: '不高。用"いい"的否定：_____。（不好）',
    answer: 'よくない/じゃない'
  },

  // 第七课练习
  {
    lesson: 7,
    type: 'choice',
    question: '"家"日语哪个？',
    options: ['いえ', 'へや', 'がっこう', 'みせ'],
    answer: 0
  },
  {
    lesson: 7,
    type: 'choice',
    question: '"学校"日语哪个？',
    options: ['いえ', 'へや', 'がっこう', 'みせ'],
    answer: 2
  },
  {
    lesson: 7,
    type: 'fill',
    question: '机の上に本があり_____。（有书）',
    answer: 'ます'
  },
  {
    lesson: 7,
    type: 'fill',
    question: '银行はどこですか。（银行在哪里）',
    answer: 'どこ'
  },

  // 第八课练习
  {
    lesson: 8,
    type: 'choice',
    question: '"一个"日语哪个？',
    options: ['ひとつ', 'ふたつ', 'みつつ', 'よつつ'],
    answer: 0
  },
  {
    lesson: 8,
    type: 'choice',
    question: '"三个"日语哪个？',
    options: ['ひとつ', 'ふたつ', 'みつつ', 'よつつ'],
    answer: 2
  },
  {
    lesson: 8,
    type: 'fill',
    question: '苹果を三つ____。（买三个苹果）',
    answer: 'かう/買います'
  },
  {
    lesson: 8,
    type: 'fill',
    question: '成员が五人_____。（有五个人）',
    answer: 'います'
  },

  // 第九课练习
  {
    lesson: 9,
    type: 'choice',
    question: '"电车"日语哪个？',
    options: ['でんの', 'ちかてつ', 'バス', 'タクシー'],
    answer: 1
  },
  {
    lesson: 9,
    type: 'choice',
    question: '"公交车"日语哪个？',
    options: ['でんの', 'ちかてつ', 'バス', 'タクシー'],
    answer: 2
  },
  {
    lesson: 9,
    type: 'fill',
    question: 'バス_____行く。（坐公交车去）',
    answer: 'で'
  },
  {
    lesson: 9,
    type: 'fill',
    question: '歩いて_____。（走路去）',
    answer: 'いく'
  },

  // 第十课练习
  {
    lesson: 10,
    type: 'choice',
    question: '"晴天"日语哪个？',
    options: ['ターテ', '曇り', '雨', '雪'],
    answer: 0
  },
  {
    lesson: 10,
    type: 'choice',
    question: '"雨"日语哪个？',
    options: ['ターテ', '曇り', '雨', '雪'],
    answer: 2
  },
  {
    lesson: 10,
    type: 'fill',
    question: '今日_____晴れ_____。（今天晴天）',
    answer: 'は/です'
  },
  {
    lesson: 10,
    type: 'fill',
    question: '雨が降_____。（下雨）',
    answer: 'る/ります'
  }
];

module.exports = exercises;