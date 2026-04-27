const grammar = [
  // 第一课 - 寒暄语
  {
    lesson: 1,
    pattern: 'N你好',
    structure: 'こんにちは',
    explanation: '用于下午打招呼，相当于"你好"',
    example: 'こんにちは、老师。',
    translation: '你好，老师。'
  },
  {
    lesson: 1,
    pattern: 'N早上好',
    structure: 'おはよう（ございます）',
    explanation: '用于早上打招呼，相当于"早上好"',
    example: 'おはようございます。',
    translation: '早上好。'
  },
  {
    lesson: 1,
    pattern: 'N晚上好',
    structure: 'こんばんは',
    explanation: '用于晚上打招呼，相当于"晚上好"',
    example: 'こんばんは、朋友。',
    translation: '晚上好，朋友。'
  },
  {
    lesson: 1,
    pattern: 'N再见',
    structure: 'さようなら',
    explanation: '用于道别，相当于"再见"',
    example: 'さようなら、また明日。',
    translation: '再见，明天见。'
  },
  {
    lesson: 1,
    pattern: 'N谢谢',
    structure: 'ありがとう（ございます）',
    explanation: '表示感谢，相当于"谢谢"',
    example: 'ありがとうございます。',
    translation: '谢谢。'
  },

  // 第二课 - 一般会话
  {
    lesson: 2,
    pattern: 'N我是~',
    structure: ' 저는 ~ です',
    explanation: '表示身份或职业，です是动词be的礼貌形',
    example: '私は学生です。',
    translation: '我是学生。'
  },
  {
    lesson: 2,
    pattern: 'N你是~吗？',
    structure: 'あなたは~ですか？',
    explanation: '疑问句，か表示疑问',
    example: 'あなたは誰ですか？',
    translation: '你是谁？'
  },
  {
    lesson: 2,
    pattern: 'N也不是~',
    structure: '~でもありません',
    explanation: '表示否定',
    example: '学生でもありません。',
    translation: '也不是学生。'
  },
  {
    lesson: 2,
    pattern: 'N这个是~',
    structure: 'これは~です',
    explanation: 'これ是"这"，指示物品',
    example: 'これは本です。',
    translation: '这是书。'
  },

  // 第三课 - 指示代词
  {
    lesson: 3,
    pattern: 'N这个/那个',
    structure: 'これ/それ/あれ',
    explanation: 'これ=这，それ=那，あれ=那（更远）',
    example: 'それは何ですか？',
    translation: '那是什么？'
  },
  {
    lesson: 3,
    pattern: 'N连体词+名词',
    structure: 'この/その/あの~',
    explanation: '连体词，后接名词',
    example: 'この本は誰のです？',
    translation: '这本书是谁的？'
  },
  {
    lesson: 3,
    pattern: 'N哪里',
    structure: 'どこ',
    explanation: '询问地点',
    example: 'トイレはどこですか？',
    translation: '厕所在哪里？'
  },

  // 第四课 - 时间表达
  {
    lesson: 4,
    pattern: 'N几点',
    structure: '何時',
    explanation: '询问时间',
    example: '今何時ですか？',
    translation: '现在几点？'
  },
  {
    lesson: 4,
    pattern: 'N星期~',
    structure: '~曜日',
    explanation: '表示星期几',
    example: '今日は水曜日です。',
    translation: '今天是星期三。'
  },
  {
    lesson: 4,
    pattern: 'N从~到~',
    structure: '~から~まで',
    explanation: '表示时间范围',
    example: '朝9時から夜6時まで。',
    translation: '从早上9点到晚上6点。'
  },

  // 第五课 - 动词
  {
    lesson: 5,
    pattern: 'N做~',
    structure: '~を~する',
    explanation: '表示动作を是宾语助词',
    example: '日本語を勉強します。',
    translation: '学习日语。'
  },
  {
    lesson: 5,
    pattern: 'N去~',
    structure: '~に行く',
    explanation: '表示去向，に是方向助词',
    example: '学校に行きます。',
    translation: '去学校。'
  },
  {
    lesson: 5,
    pattern: 'N来~',
    structure: '~に来て',
    explanation: '表示来某地',
    example: 'ここに並んで。',
    translation: '来这里。'
  },

  // 第六课 - 形容词
  {
    lesson: 6,
    pattern: 'N形容词',
    structure: '~いです',
    explanation: '形容词结句，い是词尾',
    example: 'この料理は美味しいです。',
    translation: '这个菜很好吃。'
  },
  {
    lesson: 6,
    pattern: 'N不~',
    structure: '~くないです/~じゃないです',
    explanation: '形容词否定',
    example: '高くないです。',
    translation: '不贵。'
  },
  {
    lesson: 6,
    pattern: 'N很~',
    structure: '~いです',
    explanation: '形容词肯定加强',
    example: 'とても可愛いですね。',
    translation: '真可爱啊。'
  },

  // 第七课 - 存在
  {
    lesson: 7,
    pattern: 'N有~',
    structure: '~があります/います',
    explanation: ' 있습니다用于物品，います用于人和动物',
    example: '教室に先生が生徒がいます。',
    translation: '教室里有老师和学生。'
  },
  {
    lesson: 7,
    pattern: 'N没有~',
    structure: '~がありません/いません',
    explanation: '表示不存在',
    example: 'お金がありません。',
    translation: '没有钱。'
  },
  {
    lesson: 7,
    pattern: 'N在~',
    structure: '~に~があります',
    explanation: '表示在某处有某物',
    example: '机の上に本があります。',
    translation: '桌子上有书。'
  },

  // 第八课 - 数量
  {
    lesson: 8,
    pattern: 'N几个',
    structure: '~つ',
    explanation: '日语量词，用于物品数量',
    example: 'りんごを三つください。',
    translation: '请给我三个苹果。'
  },
  {
    lesson: 8,
    pattern: 'N人',
    structure: '~人',
    explanation: '用于人数',
    example: 'メンバーが五人います。',
    translation: '有五名成员。'
  },
  {
    lesson: 8,
    pattern: 'N杯/本',
    structure: '~杯/~本',
    explanation: '杯用于饮料，本用于长条物品',
    example: 'お茶を二杯飲みます。',
    translation: '喝两杯茶。'
  },

  // 第九课 - 移动
  {
    lesson: 9,
    pattern: 'N乘坐~',
    structure: '~で行く/で来る',
    explanation: 'で表示手段',
    example: 'バスで行きます。',
    translation: '坐公交车去。'
  },
  {
    lesson: 9,
    pattern: 'N从~到~',
    structure: '~から~まで',
    explanation: '表示起点和终点',
    example: '東京から大阪まで。',
    translation: '从东京到大阪。'
  },
  {
    lesson: 9,
    pattern: 'N大约~',
    structure: '~くらい',
    explanation: '表示大约数量或时间',
    example: '一時間くらいかかります。',
    translation: '大约需要一个小时。'
  },

  // 第十课 - 天気
  {
    lesson: 10,
    pattern: 'N天气~',
    structure: '~です',
    explanation: '描述天气',
    example: '今日は晴天です。',
    translation: '今天是晴天。'
  },
  {
    lesson: 10,
    pattern: 'N喜欢~',
    structure: '~が好きです',
    explanation: '表达喜好',
    example: '雪景色が好きです。',
    translation: '喜欢雪景。'
  },
  {
    lesson: 10,
    pattern: 'N因为~',
    structure: '~ので',
    explanation: '表示原因',
    example: '雨なので、うちにいます。',
    translation: '因为下雨，待在家里。'
  }
];

module.exports = grammar;