const exercises = [
  // ==================== N5: Lessons 1-4 (音声) ====================
  // Lesson 1: 五十音図
  { id: 1, lesson: 1, type: 'choice', question: '"こんにちは"是什么意思？', options: ['早上好', '你好', '晚上好', '再见'], answer: 1 },
  { id: 2, lesson: 1, type: 'choice', question: '"さようなら"是什么意思？', options: ['谢谢', '对不起', '再见', '你好'], answer: 2 },
  { id: 3, lesson: 1, type: 'fill', question: '初次见面时，日语应说"____"？', answer: 'はじめまして' },
  { id: 4, lesson: 1, type: 'choice', question: '下面哪个是"谢谢（礼貌形）"？', options: ['すみません', 'ありがとう', 'ありがとうございます', 'ごめんなさい'], answer: 2 },

  // Lesson 2: 濁音・半濁音
  { id: 5, lesson: 2, type: 'choice', question: '"わたし"是什么意思？', options: ['你', '他', '她', '我'], answer: 3 },
  { id: 6, lesson: 2, type: 'choice', question: '"おかあさん"是什么意思？', options: ['爸爸', '妈妈', '哥哥', '姐姐'], answer: 1 },
  { id: 7, lesson: 2, type: 'fill', question: '"朋友"的日语是_____', answer: 'ともだち' },
  { id: 8, lesson: 2, type: 'choice', question: '表示"我也是学生"用哪个助词？', options: ['は', 'が', 'も', 'の'], answer: 2 },

  // Lesson 3: 長音・促音
  { id: 9, lesson: 3, type: 'choice', question: '日语数字"三"的读音是？', options: ['いち', 'に', 'さん', 'よん'], answer: 2 },
  { id: 10, lesson: 3, type: 'choice', question: '"本"的日语读音是？', options: ['ほん', 'ぼん', 'ぽん', 'はん'], answer: 0 },
  { id: 11, lesson: 3, type: 'fill', question: '"学校"的读音是_____', answer: 'がっこう' },
  { id: 12, lesson: 3, type: 'fill', question: '机の上に本が_____。（有书）', answer: 'あります' },

  // Lesson 4: 拗音・撥音
  { id: 13, lesson: 4, type: 'choice', question: '表示动作进行场所的助词是？', options: ['に', 'で', 'を', 'へ'], answer: 1 },
  { id: 14, lesson: 4, type: 'choice', question: '"図書館"的读音是？', options: ['としょかん', 'としょがん', 'ずしょかん', 'ずしょがん'], answer: 0 },
  { id: 15, lesson: 4, type: 'fill', question: '教室_____勉強します。（在教室学习）', answer: 'で' },
  { id: 16, lesson: 4, type: 'fill', question: '"邮局"的日语是_____', answer: 'ゆうびんきょく' },

  // ==================== N5: Lessons 5-8 (初級文法) ====================
  // Lesson 5: わたしは留学生です
  { id: 17, lesson: 5, type: 'choice', question: '"留学生"日语读音是？', options: ['りゅうがくせい', 'りょうがくせい', 'るがくせい', 'りゅうがっせい'], answer: 0 },
  { id: 18, lesson: 5, type: 'choice', question: '"わたしは中国人です"的意思是？', options: ['我是日本人', '我是中国人', '我是韩国人', '我是学生'], answer: 1 },
  { id: 19, lesson: 5, type: 'fill', question: 'あなたは学生です_____？（疑问句）', answer: 'か' },
  { id: 20, lesson: 5, type: 'fill', question: '中国_____来ました。', answer: 'から' },

  // Lesson 6: これは本です
  { id: 21, lesson: 6, type: 'choice', question: '"这"的日语是？', options: ['それ', 'あれ', 'これ', 'どれ'], answer: 2 },
  { id: 22, lesson: 6, type: 'choice', question: '"この本"是什么意思？', options: ['那本书', '哪本书', '那本书（远）', '这本书'], answer: 3 },
  { id: 23, lesson: 6, type: 'fill', question: '_____は私の辞書ですか。（那是我的词典吗？）', answer: 'それ' },
  { id: 24, lesson: 6, type: 'fill', question: 'あれは_____ですか。（那是什么？）', answer: 'なん' },

  // Lesson 7: 図書館はどこですか
  { id: 25, lesson: 7, type: 'choice', question: '"どこ"的意思是？', options: ['这里', '那里', '哪里', '那里（远）'], answer: 2 },
  { id: 26, lesson: 7, type: 'choice', question: '"猫がいます"意思是？', options: ['有书', '有猫', '没有猫', '猫在这里'], answer: 1 },
  { id: 27, lesson: 7, type: 'fill', question: '公園_____猫がいます。', answer: 'に' },
  { id: 28, lesson: 7, type: 'fill', question: '教室に誰_____いません。', answer: 'も' },

  // Lesson 8: 今何時ですか
  { id: 29, lesson: 8, type: 'choice', question: '"きょう"的意思是？', options: ['昨天', '今天', '明天', '后天'], answer: 1 },
  { id: 30, lesson: 8, type: 'choice', question: '"九時から五時まで"意思是？', options: ['从五点开始', '从九点到五点', '九点结束', '五点到九点'], answer: 1 },
  { id: 31, lesson: 8, type: 'fill', question: '今_____ですか。（现在几点？）', answer: 'なんじ' },
  { id: 32, lesson: 8, type: 'fill', question: '日本語の授業は九時_____十一時までです。', answer: 'から' },

  // ==================== N5: Lessons 9-12 ====================
  // Lesson 9: 花見に行きます
  { id: 33, lesson: 9, type: 'choice', question: '"行きます"的意思是？', options: ['来', '去', '回', '走'], answer: 1 },
  { id: 34, lesson: 9, type: 'choice', question: '表示方向的助词是？', options: ['を', 'で', 'に/へ', 'が'], answer: 2 },
  { id: 35, lesson: 9, type: 'fill', question: '電車_____学校に行きます。', answer: 'で' },
  { id: 36, lesson: 9, type: 'fill', question: '日本へ旅行_____行きます。', answer: 'に' },

  // Lesson 10: 食事をします
  { id: 37, lesson: 10, type: 'choice', question: '宾语助词是哪个？', options: ['が', 'は', 'を', 'に'], answer: 2 },
  { id: 38, lesson: 10, type: 'choice', question: '"食べませんでした"意思是？', options: ['吃了', '不吃', '没吃（过去）', '吃吧'], answer: 2 },
  { id: 39, lesson: 10, type: 'fill', question: '昨日映画を_____。（看了电影）', answer: 'みました' },
  { id: 40, lesson: 10, type: 'fill', question: '朝ごはんを食べ_____。（不吃早饭）', answer: 'ません' },

  // Lesson 11: 桜は本当に素晴らしいです
  { id: 41, lesson: 11, type: 'choice', question: '"美味しい"的否定形是？', options: ['美味しくない', '美味しいじゃない', '美味しません', '美味しいではありません'], answer: 0 },
  { id: 42, lesson: 11, type: 'choice', question: '"静かじゃないです"意思是？', options: ['很安静', '不安静', '安静吗', '非常安静'], answer: 1 },
  { id: 43, lesson: 11, type: 'fill', question: '桜は_____です。（樱花很美）', answer: 'きれい' },
  { id: 44, lesson: 11, type: 'fill', question: '今日は暑_____です。（今天不热）', answer: 'くない' },

  // Lesson 12: 歌が大好きです
  { id: 45, lesson: 12, type: 'choice', question: '"好きです"的对象用哪个助词？', options: ['を', 'が', 'に', 'で'], answer: 1 },
  { id: 46, lesson: 12, type: 'choice', question: '"上手"的读音是？', options: ['じょうず', 'じょうずう', 'じょず', 'じょずう'], answer: 0 },
  { id: 47, lesson: 12, type: 'fill', question: '私は日本語_____わかりません。', answer: 'が' },
  { id: 48, lesson: 12, type: 'fill', question: '新しいパソコン_____欲しいです。', answer: 'が' },

  // ==================== N5: Lessons 13-16 ====================
  // Lesson 13: 東京は上海より静かです
  { id: 49, lesson: 13, type: 'choice', question: '"AはBより大きい"意思是？', options: ['A和B一样大', 'A比B大', 'B比A大', 'A和B都不大'], answer: 1 },
  { id: 50, lesson: 13, type: 'choice', question: '"クラスで一番"中的"で"表示？', options: ['场所', '范围', '手段', '原因'], answer: 1 },
  { id: 51, lesson: 13, type: 'fill', question: '電車の_____がバスより速いです。', answer: 'ほう' },
  { id: 52, lesson: 13, type: 'fill', question: '日本語は英語_____難しいですか。', answer: 'より' },

  // Lesson 14: ゴールデンウィーク
  { id: 53, lesson: 14, type: 'choice', question: '"夏休みに旅行するつもりです"意思是？', options: ['暑假旅行了', '暑假打算旅行', '暑假不想旅行', '暑假不能旅行'], answer: 1 },
  { id: 54, lesson: 14, type: 'choice', question: '"～たい"表示？', options: ['过去', '禁止', '愿望', '命令'], answer: 2 },
  { id: 55, lesson: 14, type: 'fill', question: '日本へ_____たいです。（想去日本）', answer: 'いき' },
  { id: 56, lesson: 14, type: 'fill', question: '来週京都に行く_____です。（预定去京都）', answer: 'よてい' },

  // Lesson 15: 買い物をしましょう
  { id: 57, lesson: 15, type: 'choice', question: '"行きましょう"是什么意思？', options: ['去了', '不去', '去吧', '可以去'], answer: 2 },
  { id: 58, lesson: 15, type: 'choice', question: '"～てください"表示？', options: ['命令', '请求', '禁止', '愿望'], answer: 1 },
  { id: 59, lesson: 15, type: 'fill', question: 'ここに名前を_____ください。', answer: 'かいて' },
  { id: 60, lesson: 15, type: 'fill', question: '一緒に買い物を_____。', answer: 'しましょう' },

  // Lesson 16: 夏休みの計画
  { id: 61, lesson: 16, type: 'choice', question: '"～と思う"的意思是？', options: ['他说', '我想/觉得', '我认为他', '你说'], answer: 1 },
  { id: 62, lesson: 16, type: 'choice', question: '"寝る前に本を読む"中"前に"前面接什么形？', options: ['ます形', 'て形', '辞書形', 'た形'], answer: 2 },
  { id: 63, lesson: 16, type: 'fill', question: '食事_____後で散歩します。', answer: 'した' },
  { id: 64, lesson: 16, type: 'fill', question: '日曜日は_____り_____たりします。', answer: 'た/し' },

  // ==================== N5: Lessons 17-20 ====================
  // Lesson 17: 休んでもいいですか
  { id: 65, lesson: 17, type: 'choice', question: '"～てもいい"的意思是？', options: ['不可以', '必须', '可以', '最好'], answer: 2 },
  { id: 66, lesson: 17, type: 'choice', question: '"～てはいけない"的意思是？', options: ['可以', '不可以', '最好', '不用'], answer: 1 },
  { id: 67, lesson: 17, type: 'fill', question: 'ここで写真を撮って_____いけません。', answer: 'は' },
  { id: 68, lesson: 17, type: 'fill', question: '早く寝たほう_____いいです。', answer: 'が' },

  // Lesson 18: 学生食堂は安くて美味しい
  { id: 69, lesson: 18, type: 'choice', question: 'イ形容词的て形是？', options: ['～くて', '～で', '～て', '～って'], answer: 0 },
  { id: 70, lesson: 18, type: 'choice', question: '"食べている"的意思是？', options: ['吃了', '正在吃', '吃过', '想吃'], answer: 1 },
  { id: 71, lesson: 18, type: 'fill', question: 'この店は安_____美味しいです。', answer: 'くて' },
  { id: 72, lesson: 18, type: 'fill', question: '手を洗って_____食べます。', answer: 'から' },

  // Lesson 19: 料理を作ることができます
  { id: 73, lesson: 19, type: 'choice', question: '"ことができる"的意思是？', options: ['必须做', '可以做/会做', '想做', '做了'], answer: 1 },
  { id: 74, lesson: 19, type: 'choice', question: '"話せます"是哪个动词的可能形？', options: ['読む', '書く', '話す', '聞く'], answer: 2 },
  { id: 75, lesson: 19, type: 'fill', question: 'だんだん暖か_____なります。', answer: 'く' },
  { id: 76, lesson: 19, type: 'fill', question: 'コーヒー_____します。', answer: 'に' },

  // Lesson 20: 学校へ通うのは楽しい
  { id: 77, lesson: 20, type: 'choice', question: '"学校へ通うのは楽しい"中"の"的作用是？', options: ['所属', '代词化', '名词化', '疑问'], answer: 2 },
  { id: 78, lesson: 20, type: 'choice', question: '"～ので"表示？', options: ['转折', '原因', '并列', '条件'], answer: 1 },
  { id: 79, lesson: 20, type: 'fill', question: '雨_____降っているので、出かけません。', answer: 'が' },
  { id: 80, lesson: 20, type: 'fill', question: '料理を作る_____が好きです。', answer: 'の' },

  // ==================== N4: Lessons 21-24 (旅行会話) ====================
  // Lesson 21: 京都奈良へ行くことにします
  { id: 81, lesson: 21, type: 'choice', question: '"～ことにする"表示？', options: ['变成', '决定', '能够', '听说'], answer: 1 },
  { id: 82, lesson: 21, type: 'choice', question: '"～ことになる"表示？', options: ['主观决定', '客观决定/结果', '习惯', '禁止'], answer: 1 },
  { id: 83, lesson: 21, type: 'fill', question: '京都へ行く_____にします。', answer: 'こと' },
  { id: 84, lesson: 21, type: 'fill', question: '毎朝ジョギングする_____にしています。', answer: 'こと' },

  // Lesson 22: 旅行の準備をしています
  { id: 85, lesson: 22, type: 'choice', question: '"～てある"表示？', options: ['正在进行', '人为状态的持续', '准备', '完成'], answer: 1 },
  { id: 86, lesson: 22, type: 'choice', question: '"～ておく"表示？', options: ['试试看', '做完', '事先准备/放置', '正在～'], answer: 2 },
  { id: 87, lesson: 22, type: 'fill', question: 'まだ切符を買って_____。（还没买票）', answer: 'いません' },
  { id: 88, lesson: 22, type: 'fill', question: 'ホテルを予約して_____ました。（预约好了酒店）', answer: 'おき' },

  // Lesson 23: 鑑真について勉強したことがあります
  { id: 89, lesson: 23, type: 'choice', question: '"～たことがある"表示？', options: ['想做', '曾经～过', '完成', '预定'], answer: 1 },
  { id: 90, lesson: 23, type: 'choice', question: '"～について"表示？', options: ['因为', '关于', '对于', '为了'], answer: 1 },
  { id: 91, lesson: 23, type: 'fill', question: '日本に行った_____がありますか。', answer: 'こと' },
  { id: 92, lesson: 23, type: 'fill', question: '日本の文化_____ついて勉強しています。', answer: 'に' },

  // Lesson 24: 金閣寺を見たいです
  { id: 93, lesson: 24, type: 'choice', question: '"～てほしい"表示？', options: ['想要', '想得到', '想给别人', '希望别人做～'], answer: 3 },
  { id: 94, lesson: 24, type: 'choice', question: '"美味しそうだ"表示？', options: ['听说是', '看起来', '据说是', '像'], answer: 1 },
  { id: 95, lesson: 24, type: 'fill', question: '金閣寺を_____たいです。', answer: 'み' },
  { id: 96, lesson: 24, type: 'fill', question: 'そのケーキは_____そうですね。', answer: 'おいし' },

  // ==================== N4: Lessons 25-30 (日常会話) ====================
  // Lesson 25: 学校に通わなければなりません
  { id: 97, lesson: 25, type: 'choice', question: '"～なければならない"表示？', options: ['可以不做', '不用做', '必须做', '希望做'], answer: 2 },
  { id: 98, lesson: 25, type: 'choice', question: '"～なくてもいい"表示？', options: ['必须做', '不可以做', '不用做也可以', '应该做'], answer: 2 },
  { id: 99, lesson: 25, type: 'fill', question: '宿題をし_____はいけません。', answer: 'なくて' },
  { id: 100, lesson: 25, type: 'fill', question: '急が_____もいいです。', answer: 'なくて' },

  // Lesson 26: 台風が来なければいい
  { id: 101, lesson: 26, type: 'choice', question: '条件形"～ば"的动词构成，一段动词接？', options: ['～ば', '～れば', '～ければ', '～たら'], answer: 1 },
  { id: 102, lesson: 26, type: 'choice', question: '"～たら"的接续方式是？', options: ['辞書形+ら', 'ない形+ら', 'た形+ら', 'ます形+ら'], answer: 2 },
  { id: 103, lesson: 26, type: 'fill', question: '雨が降_____ら、試合は中止です。', answer: 'った' },
  { id: 104, lesson: 26, type: 'fill', question: '春になる_____、桜が咲きます。', answer: 'と' },

  // Lesson 27: 学校へ来なくてもいい
  { id: 105, lesson: 27, type: 'choice', question: '"入学禁止"的命令式"入るな"中的"な"表示？', options: ['许可', '禁止', '命令', '否定'], answer: 1 },
  { id: 106, lesson: 27, type: 'choice', question: '"～てもかまわない"的意思是？', options: ['不行', '必须', '可以/不介意', '禁止'], answer: 2 },
  { id: 107, lesson: 27, type: 'fill', question: '明日学校へ来_____もいいです。', answer: 'なくて' },
  { id: 108, lesson: 27, type: 'fill', question: 'ここに座っても_____ませんか。', answer: 'かまい' },

  // Lesson 28: テストには遅刻しないように
  { id: 109, lesson: 28, type: 'choice', question: '"遅刻しないように"中的"ように"表示？', options: ['比喻', '目的/期望', '原因', '传闻'], answer: 1 },
  { id: 110, lesson: 28, type: 'choice', question: '"～ために"和"～ように"的区别是？', options: ['没有区别', 'ために接意志动词', 'ために接无意志动词', 'ように接意志动词'], answer: 1 },
  { id: 111, lesson: 28, type: 'fill', question: '忘れない_____メモしました。', answer: 'ように' },
  { id: 112, lesson: 28, type: 'fill', question: '日本語が話せる_____になりました。', answer: 'よう' },

  // Lesson 29: 紅葉が見られます
  { id: 113, lesson: 29, type: 'choice', question: '"見える"和"見られる"的区别？', options: ['一样', '見える是自发,見られる是可能', '見られる是自发', '見える是主动'], answer: 1 },
  { id: 114, lesson: 29, type: 'choice', question: '"食べやすい"的意思是？', options: ['好吃', '容易吃', '想吃', '不好吃'], answer: 1 },
  { id: 115, lesson: 29, type: 'fill', question: '雨が降り_____ました。（开始下雨了）', answer: 'はじめ' },
  { id: 116, lesson: 29, type: 'fill', question: 'このペンは書き_____です。', answer: 'やすい' },

  // Lesson 30: 母に手紙を書こうと思います
  { id: 117, lesson: 30, type: 'choice', question: '"書こう"是哪个动词的意向形？', options: ['読む', '書く', '話す', '聞く'], answer: 1 },
  { id: 118, lesson: 30, type: 'choice', question: '"～かもしれない"表示？', options: ['一定', '也许/可能', '应该', '听说'], answer: 1 },
  { id: 119, lesson: 30, type: 'fill', question: '母に手紙を書_____と思います。', answer: 'こう' },
  { id: 120, lesson: 30, type: 'fill', question: '明日は雨が降る_____もしれません。', answer: 'か' },

  // ==================== N4: Lessons 31-38 ====================
  // Lesson 31: 敬語を使いましょう
  { id: 121, lesson: 31, type: 'choice', question: '"お帰りになりました"是哪种敬语？', options: ['謙譲語', '尊敬語', '丁寧語', 'タメ口'], answer: 1 },
  { id: 122, lesson: 31, type: 'choice', question: '"お持ちします"是哪种敬语？', options: ['尊敬語', '謙譲語', '丁寧語', '普通体'], answer: 1 },
  { id: 123, lesson: 31, type: 'fill', question: '社長はお_____になりました。（社长回去了）', answer: 'かえり' },
  { id: 124, lesson: 31, type: 'fill', question: 'お荷物を_____します。', answer: 'おもち' },

  // Lesson 32: 勉強すればするほど難しくなる
  { id: 125, lesson: 32, type: 'choice', question: '"勉強すればするほど"句型表示？', options: ['越学', '学完', '不学', '开始学'], answer: 0 },
  { id: 126, lesson: 32, type: 'choice', question: '"いくら考えても"意思是？', options: ['不考虑', '怎么想也', '稍微想', '一直想'], answer: 1 },
  { id: 127, lesson: 32, type: 'fill', question: '勉強_____ばする_____難しくなります。', answer: 'すれ/ほど' },
  { id: 128, lesson: 32, type: 'fill', question: '彼はもう着いた_____です。（他应该已经到了）', answer: 'はず' },

  // Lesson 33: 日本語能力試験に合格するために
  { id: 129, lesson: 33, type: 'choice', question: '"合格するために"中的"ために"表示？', options: ['原因', '目的', '手段', '条件'], answer: 1 },
  { id: 130, lesson: 33, type: 'choice', question: '"～みたいだ"多用于？', options: ['书面语', '口语', '敬语', '古语'], answer: 1 },
  { id: 131, lesson: 33, type: 'fill', question: '試験に合格する_____に勉強しています。', answer: 'ため' },
  { id: 132, lesson: 33, type: 'fill', question: '彼は子供_____たいです。', answer: 'み' },

  // Lesson 34: クリスマスと元旦
  { id: 133, lesson: 34, type: 'choice', question: '"明日は雪だそうだ"中的"そうだ"表示？', options: ['样态', '传闻', '比喻', '推测'], answer: 1 },
  { id: 134, lesson: 34, type: 'choice', question: '"～ようだ"不表示？', options: ['比喻', '推测', '举例', '传闻'], answer: 3 },
  { id: 135, lesson: 34, type: 'fill', question: '彼が来る_____どうかわかりません。', answer: 'か' },
  { id: 136, lesson: 34, type: 'fill', question: '彼は日本人_____しいです。（他好像/像日本人）', answer: 'ら' },

  // Lesson 35: 紅白歌合戦
  { id: 137, lesson: 35, type: 'choice', question: '"今出かけるところです"的意思是？', options: ['刚出门', '正要出门', '在出门中', '出过门了'], answer: 1 },
  { id: 138, lesson: 35, type: 'choice', question: '"食べたばかり"的意思是？', options: ['只吃', '刚吃', '正在吃', '会吃'], answer: 1 },
  { id: 139, lesson: 35, type: 'fill', question: '電気をつけた_____寝てしまいました。', answer: 'まま' },
  { id: 140, lesson: 35, type: 'fill', question: 'どこかで会った_____気がします。', answer: 'ような' },

  // Lesson 36: 初詣はお祭りのようです
  { id: 141, lesson: 36, type: 'choice', question: '"まるで夢のようだ"中"まるで"的作用是？', options: ['否定', '强调比喻', '质疑', '转折'], answer: 1 },
  { id: 142, lesson: 36, type: 'choice', question: '口语表示"像～"的句型是？', options: ['～ようだ', '～らしい', '～みたいだ', '～そうだ'], answer: 2 },
  { id: 143, lesson: 36, type: 'fill', question: '初詣はお祭りの_____です。', answer: 'よう' },
  { id: 144, lesson: 36, type: 'fill', question: 'あの人は_____スターみたいです。', answer: 'えいが' },

  // Lesson 37: 成人式
  { id: 145, lesson: 37, type: 'choice', question: '"遊んでばかり"的意思是？', options: ['一直玩', '玩完了', '开始玩', '会玩'], answer: 0 },
  { id: 146, lesson: 37, type: 'choice', question: '"～になる"表示？', options: ['主观决定', '变成（客观变化）', '能够', '可能'], answer: 1 },
  { id: 147, lesson: 37, type: 'fill', question: '彼は_____ばかりいます。（他总是光玩）', answer: 'あそんで' },
  { id: 148, lesson: 37, type: 'fill', question: '来年二十歳_____なります。', answer: 'に' },

  // Lesson 38: 節分
  { id: 149, lesson: 38, type: 'choice', question: '"～に関して"的意思是？', options: ['因为', '关于', '虽然', '但是'], answer: 1 },
  { id: 150, lesson: 38, type: 'choice', question: '"私にとって"的意思是？', options: ['根据我', '对我来说', '关于我', '为了我'], answer: 1 },
  { id: 151, lesson: 38, type: 'fill', question: '人_____よって考え方が違います。', answer: 'に' },
  { id: 152, lesson: 38, type: 'fill', question: '節分_____関して調べています。', answer: 'に' },

  // ==================== N3: Lessons 39-42 ====================
  // Lesson 39: 春休みは復習しよう
  { id: 153, lesson: 39, type: 'choice', question: '"復習しようじゃありませんか"是？', options: ['命令', '禁止', '劝诱', '否定'], answer: 2 },
  { id: 154, lesson: 39, type: 'choice', question: '"～てみる"表示？', options: ['看到', '试着做', '完成', '开始'], answer: 1 },
  { id: 155, lesson: 39, type: 'fill', question: 'この問題を解いて_____ましょう。', answer: 'み' },
  { id: 156, lesson: 39, type: 'fill', question: '毎日少しずつ復習する_____です。', answer: 'こと' },

  // Lesson 40: 桜の花が咲くまで待つ
  { id: 157, lesson: 40, type: 'choice', question: '"～まで"和"～までに"的区别是？', options: ['一样', 'まで是到～持续,までに是期限', 'まで是期限', 'までに是起点'], answer: 1 },
  { id: 158, lesson: 40, type: 'choice', question: '"夏休みの間"的意思是？', options: ['暑假前', '暑假期间', '暑假后', '暑假左右'], answer: 1 },
  { id: 159, lesson: 40, type: 'fill', question: '金曜日_____にレポートを出してください。', answer: 'まで' },
  { id: 160, lesson: 40, type: 'fill', question: '子供が寝ている_____掃除しました。', answer: 'あいだに' },

  // Lesson 41: 田中先生の下で勉強
  { id: 161, lesson: 41, type: 'choice', question: '"～の下で"表示？', options: ['在～下面', '在～指导下', '在～之前', '在～之后'], answer: 1 },
  { id: 162, lesson: 41, type: 'choice', question: '"～に従って"的意思是？', options: ['反抗', '按照/随着', '反对', '忽略'], answer: 1 },
  { id: 163, lesson: 41, type: 'fill', question: '田中先生の_____で勉強しています。', answer: 'もと' },
  { id: 164, lesson: 41, type: 'fill', question: '経済の発展_____伴って、生活が変わりました。', answer: 'に' },

  // Lesson 42: 狭いながらも楽しい我が家
  { id: 165, lesson: 42, type: 'choice', question: '"音楽を聴きながら勉強する"中"ながら"表示？', options: ['一边～一边', '虽然', '但是', '之后'], answer: 0 },
  { id: 166, lesson: 42, type: 'choice', question: '"狭いながらも"中"ながらも"表示？', options: ['同时', '逆接（虽然～但）', '目的', '原因'], answer: 1 },
  { id: 167, lesson: 42, type: 'fill', question: '音楽を_____ながら勉強します。', answer: 'きき' },
  { id: 168, lesson: 42, type: 'fill', question: '地球温暖化が進み_____あります。', answer: 'つつ' },

  // ==================== N3: Lessons 43-48 ====================
  // Lesson 43: ゴミ出しルール
  { id: 169, lesson: 43, type: 'choice', question: '"～わけだ"表示？', options: ['不是', '当然/难怪', '可能', '应该'], answer: 1 },
  { id: 170, lesson: 43, type: 'choice', question: '"～わけではない"表示？', options: ['当然是', '并不是', '一定是', '可能是'], answer: 1 },
  { id: 171, lesson: 43, type: 'fill', question: '日本人だからと言って、寿司が好きな_____ではない。', answer: 'わけ' },
  { id: 172, lesson: 43, type: 'fill', question: 'ゴミは分別し_____いけません。', answer: 'なければ' },

  // Lesson 44: 東京六大学野球
  { id: 173, lesson: 44, type: 'choice', question: '"若いうちに"意思是？', options: ['趁年轻', '年轻时', '老了后', '和年轻时'], answer: 0 },
  { id: 174, lesson: 44, type: 'choice', question: '"～において"表示？', options: ['根据', '关于', '在～（方面/场所）', '对于'], answer: 2 },
  { id: 175, lesson: 44, type: 'fill', question: '日本_____おいて野球は人気があります。', answer: 'に' },
  { id: 176, lesson: 44, type: 'fill', question: '若い_____にいろいろ経験したいです。', answer: 'うち' },

  // Lesson 45: 仕事の最中に
  { id: 177, lesson: 45, type: 'choice', question: '"～最中に"表示？', options: ['开始', '结束', '正在～中', '即将'], answer: 2 },
  { id: 178, lesson: 45, type: 'choice', question: '"～たびに"表示？', options: ['一次', '每次～都', '偶尔', '从不'], answer: 1 },
  { id: 179, lesson: 45, type: 'fill', question: '仕事の_____に電話がかかってきた。', answer: 'さいちゅう/最中' },
  { id: 180, lesson: 45, type: 'fill', question: 'この写真を見る_____に故郷を思い出します。', answer: 'たび' },

  // Lesson 46: 上手く作れました
  { id: 181, lesson: 46, type: 'choice', question: '"作れる"是哪个动词的可能形？', options: ['食べる', '作る', '見る', '聞く'], answer: 1 },
  { id: 182, lesson: 46, type: 'choice', question: '"先生に褒められた"属于？', options: ['可能', '被动', '使役', '自发'], answer: 1 },
  { id: 183, lesson: 46, type: 'fill', question: '子供に野菜を食べ_____ます。（让孩子吃蔬菜）', answer: 'させ' },
  { id: 184, lesson: 46, type: 'fill', question: '嫌いな料理を_____られました。（被迫吃了）', answer: 'たべさせ' },

  // Lesson 47: 出費がちで旅行どころではない
  { id: 185, lesson: 47, type: 'choice', question: '"～がち"表示？', options: ['完全不', '容易/往往', '绝对', '偶尔'], answer: 1 },
  { id: 186, lesson: 47, type: 'choice', question: '"旅行どころではない"意思是？', options: ['想去旅行', '不是旅行的时候', '喜欢旅行', '旅行中'], answer: 1 },
  { id: 187, lesson: 47, type: 'fill', question: '最近忘れ_____です。（最近容易忘事）', answer: 'がち' },
  { id: 188, lesson: 47, type: 'fill', question: '忙しくて旅行_____ではありません。', answer: 'どころ' },

  // Lesson 48: 日中書道展を契機に
  { id: 189, lesson: 48, type: 'choice', question: '"～を契機に"表示？', options: ['以～为契机', '因为～', '虽然～', '关于～'], answer: 0 },
  { id: 190, lesson: 48, type: 'choice', question: '"～を通じて"表示？', options: ['反对', '通过', '因为', '虽然'], answer: 1 },
  { id: 191, lesson: 48, type: 'fill', question: '書道展_____契機に交流が始まった。', answer: 'を' },
  { id: 192, lesson: 48, type: 'fill', question: 'レベル_____応じてクラスを選びます。', answer: 'に' },

  // ==================== N3: Lessons 49-56 ====================
  // Lesson 49: 沢山の動物がいました
  { id: 193, lesson: 49, type: 'choice', question: '"～てもらう"表示？', options: ['给别人做', '得到别人为自己做', '自己做', '禁止'], answer: 1 },
  { id: 194, lesson: 49, type: 'choice', question: '"～てくれる"表示？', options: ['我给别人做', '别人给我做（好意）', '命令', '请求'], answer: 1 },
  { id: 195, lesson: 49, type: 'fill', question: '友達に写真を撮って_____ました。', answer: 'もらい' },
  { id: 196, lesson: 49, type: 'fill', question: '母が弁当を作って_____ました。', answer: 'くれ' },

  // Lesson 50: ご馳走になっています
  { id: 197, lesson: 50, type: 'choice', question: '"発表させていただきます"是？', options: ['尊敬语', '谦让语', '丁寧語', '普通体'], answer: 1 },
  { id: 198, lesson: 50, type: 'choice', question: '"お越しいただき"是？', options: ['（我）去', '（对方）光临', '（对方）回去', '（我）回去'], answer: 1 },
  { id: 199, lesson: 50, type: 'fill', question: '先生がアドバイスを_____ました。（老师给了我建议）', answer: 'ください' },
  { id: 200, lesson: 50, type: 'fill', question: 'では、発表_____いただきます。', answer: 'させて' },

  // Lesson 51: 留学した上は頑張る
  { id: 201, lesson: 51, type: 'choice', question: '"～上に"表示？', options: ['之后', '不仅～而且', '既然', '代替'], answer: 1 },
  { id: 202, lesson: 51, type: 'choice', question: '"よく考えた上で"意思是？', options: ['不考虑', '在仔细考虑之后', '不考虑也行', '粗略想一下'], answer: 1 },
  { id: 203, lesson: 51, type: 'fill', question: '留学した_____は頑張ります。', answer: 'うえ' },
  { id: 204, lesson: 51, type: 'fill', question: '彼は頭がいい_____に、努力家です。', answer: 'うえ' },

  // Lesson 52: 湿っぽい日が続く
  { id: 205, lesson: 52, type: 'choice', question: '"～っぽい"表示？', options: ['完全不', '带有某种倾向', '正是', '绝对'], answer: 1 },
  { id: 206, lesson: 52, type: 'choice', question: '"疲れ気味"的意思是？', options: ['很累', '有点累', '不累', '非常累'], answer: 1 },
  { id: 207, lesson: 52, type: 'fill', question: '彼女は_____しげな顔をしています。', answer: 'さび' },
  { id: 208, lesson: 52, type: 'fill', question: '最近疲れ_____です。', answer: 'ぎみ' },

  // Lesson 53: 語彙を増やさないことには
  { id: 209, lesson: 53, type: 'choice', question: '"～ないことには"表示？', options: ['一定', '如果不～就不行', '已经', '即将'], answer: 1 },
  { id: 210, lesson: 53, type: 'choice', question: '"早く行かないと"的省略是？', options: ['行かないとだめだ', '行く', '行った', '行くだろう'], answer: 0 },
  { id: 211, lesson: 53, type: 'fill', question: '語彙を増やさない_____には合格できない。', answer: 'こと' },
  { id: 212, lesson: 53, type: 'fill', question: 'もっと勉強し_____は。', answer: 'なくて' },

  // Lesson 54: 七夕
  { id: 213, lesson: 54, type: 'choice', question: '"～に対して"表示？', options: ['对于/针对', '关于', '为了', '根据'], answer: 0 },
  { id: 214, lesson: 54, type: 'choice', question: '"～に基づいて"表示？', options: ['基于', '关于', '对于', '反对'], answer: 0 },
  { id: 215, lesson: 54, type: 'fill', question: '七夕_____関して調べています。', answer: 'に' },
  { id: 216, lesson: 54, type: 'fill', question: '事実_____基づいて話してください。', answer: 'に' },

  // Lesson 55: お盆の計画
  { id: 217, lesson: 55, type: 'choice', question: '"代わりに"表示？', options: ['替换', '代替/不～而', '之前', '之后'], answer: 1 },
  { id: 218, lesson: 55, type: 'choice', question: '"～に違いない"表示？', options: ['可能', '也许', '一定', '应该'], answer: 2 },
  { id: 219, lesson: 55, type: 'fill', question: '母の_____に料理を作ります。', answer: 'かわり' },
  { id: 220, lesson: 55, type: 'fill', question: '去年_____比べて、今年は暑い。', answer: 'に' },

  // Lesson 56: アルバイトをしています
  { id: 221, lesson: 56, type: 'choice', question: '"エアコンをつけたまま"意思是？', options: ['关着空调', '开着空调就', '关空调时', '开开空调'], answer: 1 },
  { id: 222, lesson: 56, type: 'choice', question: '"かしこまりました"常用于？', options: ['朋友间', '家庭', '服务行业', '学校'], answer: 2 },
  { id: 223, lesson: 56, type: 'fill', question: 'アルバイトを_____続けるつもりです。', answer: 'つづけ/続け' },
  { id: 224, lesson: 56, type: 'fill', question: 'かしこまりました。少々_____ください。', answer: 'おまち' },

  // ==================== N2: Lessons 57-60 ====================
  // Lesson 57: 敬語の徹底練習
  { id: 225, lesson: 57, type: 'choice', question: '"社長はいらっしゃいますか"中"いらっしゃる"是？', options: ['いる的尊敬語', '行く的謙譲語', '来る的普通語', 'いるの謙譲語'], answer: 0 },
  { id: 226, lesson: 57, type: 'choice', question: '谦让语"おる"对应的是？', options: ['行く', '食べる', 'いる', 'する'], answer: 2 },
  { id: 227, lesson: 57, type: 'fill', question: '私は田中と_____ます。', answer: 'もうし' },
  { id: 228, lesson: 57, type: 'fill', question: 'ただいま外出して_____ます。', answer: 'おり' },

  // Lesson 58: ビジネス日本語入門
  { id: 229, lesson: 58, type: 'choice', question: '"上がる一方だ"表示？', options: ['上下波动', '不断上升', '下降', '稳定'], answer: 1 },
  { id: 230, lesson: 58, type: 'choice', question: '"お答えしかねます"中的"～かねる"表示？', options: ['可以', '容易', '难以/不能', '必须'], answer: 2 },
  { id: 231, lesson: 58, type: 'fill', question: '私が知っている_____、彼は無実です。', answer: 'かぎり' },
  { id: 232, lesson: 58, type: 'fill', question: 'その件についてはお答え_____ます。', answer: 'しかね' },

  // Lesson 59: 新聞記事を読む
  { id: 233, lesson: 59, type: 'choice', question: '"～からして"表示？', options: ['从～开始', '从～来看', '从～结束', '从～之后'], answer: 1 },
  { id: 234, lesson: 59, type: 'choice', question: '"経済の面から言うと"意思是？', options: ['从经济角度说', '不谈经济', '经济之外', '经济结束'], answer: 0 },
  { id: 235, lesson: 59, type: 'fill', question: 'この空模様_____して、雨が降りそうだ。', answer: 'から' },
  { id: 236, lesson: 59, type: 'fill', question: '学生_____見ると、先生は厳しすぎる。', answer: 'から' },

  // Lesson 60: ディベートをしよう
  { id: 237, lesson: 60, type: 'choice', question: '"～に反して"表示？', options: ['符合', '与～相反', '关于', '由于'], answer: 1 },
  { id: 238, lesson: 60, type: 'choice', question: '"賛成するにしても"意思是？', options: ['反对', '即使赞成', '完全赞成', '不赞成'], answer: 1 },
  { id: 239, lesson: 60, type: 'fill', question: '彼の意見_____対して反論します。', answer: 'に' },
  { id: 240, lesson: 60, type: 'fill', question: '予想_____反して、結果は良かった。', answer: 'に' },

  // ==================== N2: Lessons 61-66 ====================
  // Lesson 61: 日本の歴史
  { id: 241, lesson: 61, type: 'choice', question: '"時間が経つにつれて"中"つれて"表示？', options: ['随着', '逆着', '停止', '开始'], answer: 0 },
  { id: 242, lesson: 61, type: 'choice', question: '"～にほかならない"表示？', options: ['不是', '不仅是', '正是/不外乎', '可能是'], answer: 2 },
  { id: 243, lesson: 61, type: 'fill', question: '研究が進む_____したがって、新事実が明らかに。', answer: 'に' },
  { id: 244, lesson: 61, type: 'fill', question: '成功の秘訣は努力に_____ならない。', answer: 'ほか' },

  // Lesson 62: 環境問題について
  { id: 245, lesson: 62, type: 'choice', question: '"～をめぐって"的意思是？', options: ['围绕', '关于', '针对', '为了'], answer: 0 },
  { id: 246, lesson: 62, type: 'choice', question: '"データをもとに"中的"もとに"表示？', options: ['结果', '基础', '反对', '替代'], answer: 1 },
  { id: 247, lesson: 62, type: 'fill', question: '環境問題_____めぐって議論が続いている。', answer: 'を' },
  { id: 248, lesson: 62, type: 'fill', question: '法律_____基づいて判断された。', answer: 'に' },

  // Lesson 63: テクノロジーと社会
  { id: 249, lesson: 63, type: 'choice', question: '"現代社会において"中的"において"表示？', options: ['关于', '在～', '对于', '由于'], answer: 1 },
  { id: 250, lesson: 63, type: 'choice', question: '"AIによって仕事が変わる"中的"によって"表示？', options: ['根据', '手段/原因', '关于', '地方'], answer: 1 },
  { id: 251, lesson: 63, type: 'fill', question: '現代社会_____おいてIT技術は不可欠です。', answer: 'に' },
  { id: 252, lesson: 63, type: 'fill', question: '技術革新_____したがい、生活が便利に。', answer: 'に' },

  // Lesson 64: 文学を読む
  { id: 253, lesson: 64, type: 'choice', question: '"外国人にしては"的含意是？', options: ['因为是外国人', '作为外国人来说（意外）', '外国人不行', '外国人很好'], answer: 1 },
  { id: 254, lesson: 64, type: 'choice', question: '"～抜きで"表示？', options: ['补充', '加上', '除去/没有', '包含'], answer: 2 },
  { id: 255, lesson: 64, type: 'fill', question: '外国人_____しては、日本語が上手だ。', answer: 'に' },
  { id: 256, lesson: 64, type: 'fill', question: '文法_____では会話は難しい。', answer: 'ぬき' },

  // Lesson 65: スピーチの練習
  { id: 257, lesson: 65, type: 'choice', question: '"分かり次第"表示？', options: ['不知道', '一知道就立刻', '慢慢知道', '知道但'], answer: 1 },
  { id: 258, lesson: 65, type: 'choice', question: '"家を出たとたん"中的"とたん"表示？', options: ['很久后', '刚～就～', '之前', '之后很久'], answer: 1 },
  { id: 259, lesson: 65, type: 'fill', question: '分かり_____、ご連絡いたします。', answer: 'しだい' },
  { id: 260, lesson: 65, type: 'fill', question: '泣いた_____思うと、もう笑っている。', answer: 'かと' },

  // Lesson 66: 面接対策
  { id: 261, lesson: 66, type: 'choice', question: '"年齢にかかわらず"表示？', options: ['因为年龄', '不管年龄', '关于年龄', '年龄太大'], answer: 1 },
  { id: 262, lesson: 66, type: 'choice', question: '"雨にもかかわらず"表示？', options: ['因为下雨', '尽管下雨', '下雨了', '要下雨'], answer: 1 },
  { id: 263, lesson: 66, type: 'fill', question: '年齢_____かかわらず、応募できます。', answer: 'に' },
  { id: 264, lesson: 66, type: 'fill', question: 'この状況では、延期_____を得ない。', answer: 'せざる' },

  // ==================== N1: Lessons 67-70 ====================
  // Lesson 67: 社説を読む
  { id: 265, lesson: 67, type: 'choice', question: '"お客様あっての商売"中的"あっての"表示？', options: ['没有也有', '有～才有', '不需要', '虽然'], answer: 1 },
  { id: 266, lesson: 67, type: 'choice', question: '"努力いかんだ"中的"いかん"表示？', options: ['不管', '取决于', '因为', '虽然'], answer: 1 },
  { id: 267, lesson: 67, type: 'fill', question: 'お客様_____の商売です。', answer: 'あって' },
  { id: 268, lesson: 67, type: 'fill', question: '彼_____おいて適任者はいない。', answer: 'を' },

  // Lesson 68: 学術論文の読解
  { id: 269, lesson: 68, type: 'choice', question: '"散歩がてら買い物をする"中的"がてら"表示？', options: ['代替', '顺便', '专门', '因为'], answer: 1 },
  { id: 270, lesson: 68, type: 'choice', question: '"～かたわら"表示？', options: ['顺便', '一边～一边～（主副业）', '代替', '因为'], answer: 1 },
  { id: 271, lesson: 68, type: 'fill', question: '散歩_____買い物をしました。', answer: 'がてら' },
  { id: 272, lesson: 68, type: 'fill', question: '大学で教える_____研究も続けている。', answer: 'かたわら' },

  // Lesson 69: 同時通訳に挑戦
  { id: 273, lesson: 69, type: 'choice', question: '"ベルが鳴るや否や"中的"や否や"表示？', options: ['很久后', '一～就立刻', '否定的', '可能'], answer: 1 },
  { id: 274, lesson: 69, type: 'choice', question: '"覚えるそばから忘れる"中的"そばから"表示？', options: ['记住', '刚～就～', '旁边', '之前'], answer: 1 },
  { id: 275, lesson: 69, type: 'fill', question: 'ベルが鳴る_____、学生たちは飛び出した。', answer: 'やいなや' },
  { id: 276, lesson: 69, type: 'fill', question: '押し_____押され_____の接戦だった。', answer: 'つ/つ' },

  // Lesson 70: 日本の政治制度
  { id: 277, lesson: 70, type: 'choice', question: '"慣れぬこととて"中的"こととて"表示？', options: ['但是', '因为～所以（谦逊）', '虽然', '如果'], answer: 1 },
  { id: 278, lesson: 70, type: 'choice', question: '"いいことずくめ"中的"ずくめ"表示？', options: ['没有', '全是/尽是', '一半', '部分'], answer: 1 },
  { id: 279, lesson: 70, type: 'fill', question: '慣れぬ_____、失礼があるかもしれません。', answer: 'こととて' },
  { id: 280, lesson: 70, type: 'fill', question: '今年はいいこと_____の一年だった。', answer: 'ずくめ' },

  // ==================== N1: Lessons 71-76 ====================
  // Lesson 71: 経済の仕組み
  { id: 281, lesson: 71, type: 'choice', question: '"～ずにはいられない"表示？', options: ['可以不做', '忍不住要做', '没做', '做不了'], answer: 1 },
  { id: 282, lesson: 71, type: 'choice', question: '"一円たりとも～ない"表示？', options: ['一元也（不）', '很多钱', '有点钱', '没有钱'], answer: 0 },
  { id: 283, lesson: 71, type: 'fill', question: 'この映画を見ると、涙を流さ_____いられない。', answer: 'ずには' },
  { id: 284, lesson: 71, type: 'fill', question: '東京_____皮切りに全国ツアーが始まった。', answer: 'を' },

  // Lesson 72: 文学作品の鑑賞
  { id: 285, lesson: 72, type: 'choice', question: '"日本ならでは"表示？', options: ['日本以外', '只有日本才有的', '日本没有的', '日本的'], answer: 1 },
  { id: 286, lesson: 72, type: 'choice', question: '"君のことを思えばこそ"中的"ばこそ"表示？', options: ['因为', '正是因为', '虽然', '如果'], answer: 1 },
  { id: 287, lesson: 72, type: 'fill', question: '日本_____の美しさです。', answer: 'ならでは' },
  { id: 288, lesson: 72, type: 'fill', question: '教師にある_____行為だ。', answer: 'まじき' },

  // Lesson 73: ビジネス交渉
  { id: 289, lesson: 73, type: 'choice', question: '"今月を限りに退職する"中的"を限りに"表示？', options: ['以后也', '以～为最后期限', '关于', '不管'], answer: 1 },
  { id: 290, lesson: 73, type: 'choice', question: '"これをもって会議を終了する"中的"をもって"表示？', options: ['反对', '以～（方式/时间点）', '关于', '因为'], answer: 1 },
  { id: 291, lesson: 73, type: 'fill', question: '今月_____限りに退職します。', answer: 'を' },
  { id: 292, lesson: 73, type: 'fill', question: '細かい点_____いたるまで注意を払った。', answer: 'に' },

  // Lesson 74: プレゼンテーション
  { id: 293, lesson: 74, type: 'choice', question: '"～を踏まえて"表示？', options: ['忽略', '基于/考虑到', '反对', '忘记'], answer: 1 },
  { id: 294, lesson: 74, type: 'choice', question: '"多くの困難を経て"中的"を経て"表示？', options: ['避开', '经过', '创造', '增加'], answer: 1 },
  { id: 295, lesson: 74, type: 'fill', question: '前回の反省_____踏まえて改善策を提案します。', answer: 'を' },
  { id: 296, lesson: 74, type: 'fill', question: 'マニュアル_____沿って操作してください。', answer: 'に' },

  // Lesson 75: 翻訳の実践
  { id: 297, lesson: 75, type: 'choice', question: '"～はおろか"表示？', options: ['不用说', '别说～就连也', '而且', '但是'], answer: 1 },
  { id: 298, lesson: 75, type: 'choice', question: '"連休とあって"中的"とあって"表示？', options: ['虽然是', '因为是', '如果是', '但是'], answer: 1 },
  { id: 299, lesson: 75, type: 'fill', question: '彼は中国語_____おろか、日本語さえ話せない。', answer: 'は' },
  { id: 300, lesson: 75, type: 'fill', question: '関係者以外立ち入る_____。', answer: 'べからず' },

  // Lesson 76: 日本語総まとめ
  { id: 301, lesson: 76, type: 'choice', question: '"～極まりない"表示？', options: ['一点也不', '极其/非常', '有点', '不太'], answer: 1 },
  { id: 302, lesson: 76, type: 'choice', question: '"～にたえない"表示？', options: ['无法忍受/不值得', '非常值得', '可以', '想要'], answer: 0 },
  { id: 303, lesson: 76, type: 'fill', question: '失礼_____態度でした。', answer: 'きわまりない/極まりない' },
  { id: 304, lesson: 76, type: 'fill', question: '心配する_____たらない。', answer: 'に' },
];

module.exports = exercises;
