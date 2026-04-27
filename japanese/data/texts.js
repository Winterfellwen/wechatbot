const texts = [
  // 第一课对话
  {
    lesson: 1,
    title: '初次见面',
    dialogue: [
      { speaker: 'A', text: 'こんにちは。はじめまして。', translation: '你好，初次见面。' },
      { speaker: 'B', text: 'こんにちは。はじめまして。李です。どうぞよろしく。', translation: '你好，初次见面。我叫李，请多关照。' },
      { speaker: 'A', text: '私は田中です。よろしくお願いします。', translation: '我是田中，请多关照。' },
      { speaker: 'B', text: 'おはようございます。', translation: '早上好。' }
    ]
  },
  {
    lesson: 1,
    title: '道别',
    dialogue: [
      { speaker: 'A', text: 'さようなら、また明日。', translation: '再见，明天见。' },
      { speaker: 'B', text: 'さようなら。いってらっしゃい。', translation: '再见，走好。' },
      { speaker: 'A', text: 'ただいま。', translation: '我回来了。' },
      { speaker: 'B', text: 'おかえりなさい。', translation: '欢迎回来。' }
    ]
  },

  // 第二课对话
  {
    lesson: 2,
    title: '自我介绍',
    dialogue: [
      { speaker: 'A', text: '人間は学生ですか。', translation: '你是学生吗？' },
      { speaker: 'B', text: 'はい、学生です。あなたも学生ですか。', translation: '是的，我是学生。你也是学生吗？' },
      { speaker: 'A', text: 'いいえ、私は先生です。', translation: '不，我是老师。' },
      { speaker: 'B', text: 'ああ、そうですか。', translation: '啊，是吗。' }
    ]
  },
  {
    lesson: 2,
    title: '介绍家人',
    dialogue: [
      { speaker: 'A', text: 'これは誰の写真ですか。', translation: '这是谁的照片？' },
      { speaker: 'B', text: '私の家族の写真です。', translation: '这是我家人的照片。' },
      { speaker: 'A', text: 'この人は誰ですか。', translation: '这个人是谁？' },
      { speaker: 'B', text: 'これは私の父です。', translation: '这是我父亲。' }
    ]
  },

  // 第三课对话
  {
    lesson: 3,
    title: '指示物品',
    dialogue: [
      { speaker: 'A', text: 'それは何ですか。', translation: '那是什么？' },
      { speaker: 'B', text: 'これは本です。', translation: '这是书。' },
      { speaker: 'A', text: 'その本は谁のです。', translation: '那本书是谁的？' },
      { speaker: 'B', text: 'この本は私のです。', translation: '这本书是我的。' }
    ]
  },
  {
    lesson: 3,
    title: '问路',
    dialogue: [
      { speaker: 'A', text: 'すみません。厕所はどこですか。', translation: '不好意思，厕所在哪里？' },
      { speaker: 'B', text: '厕所はあの建物の二楼です。', translation: '厕所在那栋楼的二楼。' },
      { speaker: 'A', text: 'ありがとうございます。', translation: '谢谢。' },
      { speaker: 'B', text: 'どういたしまして。', translation: '不客气。' }
    ]
  },

  // 第四课对话
  {
    lesson: 4,
    title: '问时间',
    dialogue: [
      { speaker: 'A', text: '今何時ですか。', translation: '现在几点？' },
      { speaker: 'B', text: '今九時十五分です。', translation: '现在九点十五分。' },
      { speaker: 'A', text: '今日の 수업は何時からですか。', translation: '今天的课从几点开始？' },
      { speaker: 'B', text: '十時から始まります。', translation: '从十点开始。' }
    ]
  },
  {
    lesson: 4,
    title: '问日期',
    dialogue: [
      { speaker: 'A', text: '今日は何曜日ですか。', translation: '今天是星期几？' },
      { speaker: 'B', text: '今���は火曜日です。', translation: '今天是星期二。' },
      { speaker: 'A', text: '明日は水曜日ですか。', translation: '明天是星期三吗？' },
      { speaker: 'B', text: 'いいえ、明日は木曜日です。', translation: '不，明天是星期四。' }
    ]
  },

  // 第五课对话
  {
    lesson: 5,
    title: '做什么',
    dialogue: [
      { speaker: 'A', text: '昨日何をしましたか。', translation: '昨天做了什么？' },
      { speaker: 'B', text: '映画を見ました。 movies', translation: '看了电影。' },
      { speaker: 'A', text: '今晚干什么？', translation: '今晚干什么？' },
      { speaker: 'B', text: '友達とご飯を食べるつもりです。', translation: '打算和朋友吃饭。' }
    ]
  },
  {
    lesson: 5,
    title: '兴趣爱好',
    dialogue: [
      { speaker: 'A', text: '有何爱好？', translation: '你有什么爱好？' },
      { speaker: 'B', text: '音楽を聴くこととスポーツすることです。', translation: '听音乐和运动。' },
      { speaker: 'A', text: '私も音楽を聴くのが好きです。', translation: '我也喜欢听音乐。' }
    ]
  },

  // 第六课对话
  {
    lesson: 6,
    title: '评价物品',
    dialogue: [
      { speaker: 'A', text: 'この料理は美味しいですか。', translation: '这个菜好吃吗？' },
      { speaker: 'B', text: 'はい、とても美味しいです。', translation: '是的，非常好吃。' },
      { speaker: 'A', text: 'あの店の料理は美味しいですか。', translation: '那家店的菜好吃吗？' },
      { speaker: 'B', text: 'いいえ、あまり美味しくありません。', translation: '不，不太好吃。' }
    ]
  },

  // 第七课对话
  {
    lesson: 7,
    title: '在哪里',
    dialogue: [
      { speaker: 'A', text: '銀行はどこですか。', translation: '银行在哪里？' },
      { speaker: 'B', text: 'あのスーパーの隣にあります。', translation: '在那家超市旁边。' },
      { speaker: 'A', text: '遠いですか。', translation: '远吗？' },
      { speaker: 'B', text: 'いいえ、あそこです。近い니다。', translation: '不，就在那里，很近。' }
    ]
  },

  // 第八课对话
  {
    lesson: 8,
    title: '购物',
    dialogue: [
      { speaker: '店', text: 'いにしますか。', translation: '您要点什么？' },
      { speaker: '客', text: 'お茶を三つお願いします。', translation: '请给我三杯茶。' },
      { speaker: '店', text: 'はい。三つで三百五十円いただきます。', translation: '好的，三杯350日元。' },
      { speaker: '客', text: '五百円お願いします。', translation: '给你500日元。' }
    ]
  },

  // 第九课对话
  {
    lesson: 9,
    title: '交通',
    dialogue: [
      { speaker: 'A', text: '学校へ怎么去？', translation: '去学校怎么走？' },
      { speaker: 'B', text: 'バスで行くと便利です。', translation: '坐公交车去很方便。' },
      { speaker: 'A', text: 'ここから遠どのくらいですか。', translation: '从这里有多远？' },
      { speaker: 'B', text: '三十分くらいで、成都', translation: '大概30分钟。' }
    ]
  },

  // 第十课对话
  {
    lesson: 10,
    title: '天气',
    dialogue: [
      { speaker: 'A', text: '今日の天气は如何？', translation: '今天天气怎么样？' },
      { speaker: 'B', text: '今日は快晴です。', translation: '今天是晴天。' },
      { speaker: 'A', text: '明日も晴れますか。', translation: '明天也是晴天吗？' },
      { speaker: 'B', text: '明日は雨が降るそうです。', translation: '听说明天会下雨。' }
    ]
  }
];

module.exports = texts;