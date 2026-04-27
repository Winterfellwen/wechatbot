const texts = [
  // ==================== N5: Lesson 1 (五十音図) ====================
  { id: 1, lesson: 1, title: 'はじめまして', dialogue: [
    { speaker: 'A', text: 'はじめまして。私は田中です。', translation: '初次见面，我是田中。' },
    { speaker: 'B', text: 'はじめまして。私は李です。どうぞよろしくお願いします。', translation: '初次见面，我是李。请多关照。' },
    { speaker: 'A', text: 'よろしくお願いします。こちらこそ。', translation: '请多关照，我才是。' },
    { speaker: 'B', text: '李さんは学生ですか。', translation: '小李是学生吗？' },
    { speaker: 'A', text: 'はい、東京大学の学生です。', translation: '是的，是东京大学的学生。' },
  ]},
  { id: 2, lesson: 1, title: 'あいさつ', dialogue: [
    { speaker: 'A', text: 'おはようございます。', translation: '早上好。' },
    { speaker: 'B', text: 'おはようございます。今日はいい天気ですね。', translation: '早上好。今天天气真好啊。' },
    { speaker: 'A', text: 'そうですね。あ、すみません、今何時ですか。', translation: '是啊。啊，不好意思，现在几点了？' },
    { speaker: 'B', text: '九時半です。', translation: '九点半。' },
    { speaker: 'A', text: 'ありがとうございます。', translation: '谢谢。' },
    { speaker: 'B', text: 'どういたしまして。', translation: '不客气。' },
  ]},

  // ==================== N5: Lesson 2 (濁音・半濁音) ====================
  { id: 3, lesson: 2, title: '家族の写真', dialogue: [
    { speaker: 'A', text: 'これは誰の写真ですか。', translation: '这是谁的照片？' },
    { speaker: 'B', text: '私の家族の写真です。', translation: '我家人的照片。' },
    { speaker: 'A', text: 'この方はどなたですか。', translation: '这位是谁？' },
    { speaker: 'B', text: 'これは私の父です。会社員です。', translation: '这是我父亲，是公司职员。' },
    { speaker: 'A', text: 'それでは、この方は？', translation: '那这位呢？' },
    { speaker: 'B', text: '母です。料理が上手です。', translation: '是妈妈，做饭很好。' },
  ]},

  // ==================== N5: Lesson 3 (長音・促音) ====================
  { id: 4, lesson: 3, title: '教室で', dialogue: [
    { speaker: 'A', text: 'すみません、これは何ですか。', translation: '不好意思，这是什么？' },
    { speaker: 'B', text: 'それは消しゴムです。', translation: '那是橡皮。' },
    { speaker: 'A', text: 'あのう、この本は誰のですか。', translation: '那个，这本书是谁的？' },
    { speaker: 'B', text: 'あ、それは私のです。ありがとう。', translation: '啊，那是我的。谢谢。' },
  ]},

  // ==================== N5: Lesson 4 (拗音・撥音) ====================
  { id: 5, lesson: 4, title: '郵便局で', dialogue: [
    { speaker: 'A', text: 'すみません、郵便局はどこですか。', translation: '不好意思，邮局在哪里？' },
    { speaker: 'B', text: '郵便局は駅の隣にあります。', translation: '邮局在车站旁边。' },
    { speaker: 'A', text: 'ここから遠いですか。', translation: '从这里远吗？' },
    { speaker: 'B', text: 'いいえ、歩いて五分ぐらいです。', translation: '不，走路大概五分钟。' },
    { speaker: 'A', text: 'どうもありがとうございます。', translation: '非常感谢。' },
  ]},

  // ==================== N5: Lesson 5 (わたしは留学生です) ====================
  { id: 6, lesson: 5, title: '留学生の自己紹介', dialogue: [
    { speaker: 'A', text: '私は留学生です。中国から来ました。', translation: '我是留学生，从中国来的。' },
    { speaker: 'B', text: 'あ、そうですか。私も留学生です。韓国から来ました。', translation: '啊是吗。我也是留学生，从韩国来的。' },
    { speaker: 'A', text: '日本語の勉強は難しいですか。', translation: '日语学习难吗？' },
    { speaker: 'B', text: 'はい、ちょっと難しいですが、おもしろいです。', translation: '是的，有点难，但很有趣。' },
  ]},
  { id: 7, lesson: 5, title: '大学で', dialogue: [
    { speaker: 'A', text: '王さんはどこの国の人ですか。', translation: '小王是哪国人？' },
    { speaker: 'B', text: '私は中国人です。上海から来ました。', translation: '我是中国人，从上海来的。' },
    { speaker: 'A', text: '上海は大きい町ですね。', translation: '上海是个大城市呢。' },
    { speaker: 'B', text: 'はい、とても賑やかな町です。', translation: '是的，非常热闹的城市。' },
  ]},

  // ==================== N5: Lesson 6 (これは本です) ====================
  { id: 8, lesson: 6, title: '教室の持ち物', dialogue: [
    { speaker: 'A', text: 'これは何ですか。', translation: '这是什么？' },
    { speaker: 'B', text: 'これは教科書です。', translation: '这是教科书。' },
    { speaker: 'A', text: 'それは何の教科書ですか。', translation: '那是什么的教科书？' },
    { speaker: 'B', text: '日本語の教科書です。あれも日本語の辞書です。', translation: '是日语教科书。那也是日语词典。' },
  ]},
  { id: 9, lesson: 6, title: '買い物', dialogue: [
    { speaker: 'A', text: 'すみません、この時計はいくらですか。', translation: '不好意思，这块表多少钱？' },
    { speaker: 'B', text: 'それは三千円です。', translation: '那个是三千日元。' },
    { speaker: 'A', text: 'それでは、あのペンは？', translation: '那，那支笔呢？' },
    { speaker: 'B', text: 'あれは百五十円です。', translation: '那个是一百五十日元。' },
  ]},

  // ==================== N5: Lesson 7 (図書館はどこですか) ====================
  { id: 10, lesson: 7, title: '道案内', dialogue: [
    { speaker: 'A', text: 'すみません、図書館はどこですか。', translation: '不好意思，图书馆在哪里？' },
    { speaker: 'B', text: '図書館はあの建物の三階にあります。', translation: '图书馆在那栋楼的三楼。' },
    { speaker: 'A', text: 'あの建物の中に食堂もありますか。', translation: '那栋楼里也有食堂吗？' },
    { speaker: 'B', text: 'はい、一階にあります。エレベーターの隣です。', translation: '是的，在一楼，电梯旁边。' },
  ]},
  { id: 11, lesson: 7, title: '部屋の中', dialogue: [
    { speaker: 'A', text: '机の上に何がありますか。', translation: '桌子上有什么？' },
    { speaker: 'B', text: '本とノートとペンがあります。', translation: '有书、笔记本和笔。' },
    { speaker: 'A', text: 'かばんの中には？', translation: '包里呢？' },
    { speaker: 'B', text: '財布と携帯電話があります。', translation: '有钱包和手机。' },
  ]},

  // ==================== N5: Lesson 8 (今何時ですか) ====================
  { id: 12, lesson: 8, title: '時間を聞く', dialogue: [
    { speaker: 'A', text: '今何時ですか。', translation: '现在几点了？' },
    { speaker: 'B', text: '今十一時十分です。', translation: '现在十一点十分。' },
    { speaker: 'A', text: '昼休みは何時から何時までですか。', translation: '午休从几点到几点？' },
    { speaker: 'B', text: '十二時から一時までです。', translation: '从十二点到一点。' },
    { speaker: 'A', text: 'じゃ、あと五十分ですね。', translation: '那还有五十分钟呢。' },
  ]},
  { id: 13, lesson: 8, title: '曜日', dialogue: [
    { speaker: 'A', text: '今日は何曜日ですか。', translation: '今天是星期几？' },
    { speaker: 'B', text: '今日は水曜日です。', translation: '今天是星期三。' },
    { speaker: 'A', text: '日本語の授業は何曜日ですか。', translation: '日语课是星期几？' },
    { speaker: 'B', text: '月曜日と金曜日です。九時から十一時までです。', translation: '星期一和星期五。从九点到十一点。' },
  ]},

  // ==================== N5: Lesson 9 (花見に行きます) ====================
  { id: 14, lesson: 9, title: '花見の計画', dialogue: [
    { speaker: 'A', text: '今週の日曜日、花見に行きませんか。', translation: '这周日，要不要去看樱花？' },
    { speaker: 'B', text: 'いいですね。どこに行きますか。', translation: '好啊。去哪里？' },
    { speaker: 'A', text: '上野公園に行きましょう。電車で三十分ぐらいです。', translation: '去上野公园吧。坐电车大概三十分钟。' },
    { speaker: 'B', text: 'じゃ、駅で十時に会いましょう。', translation: '那，十点在车站见吧。' },
  ]},
  { id: 15, lesson: 9, title: '通学', dialogue: [
    { speaker: 'A', text: '毎日何で学校に来ますか。', translation: '每天怎么来学校？' },
    { speaker: 'B', text: 'バスで来ます。田中さんは？', translation: '坐公交车来。田中你呢？' },
    { speaker: 'A', text: '私は自転車で来ます。十五分ぐらいです。', translation: '我骑自行车来。大概十五分钟。' },
    { speaker: 'B', text: '自転車は便利ですね。', translation: '自行车很方便呢。' },
  ]},

  // ==================== N5: Lesson 10 (食事をします) ====================
  { id: 16, lesson: 10, title: '昨日のできごと', dialogue: [
    { speaker: 'A', text: '昨日何をしましたか。', translation: '昨天做了什么？' },
    { speaker: 'B', text: '映画を見ました。とても面白かったです。', translation: '看了电影，非常有趣。' },
    { speaker: 'A', text: '何の映画を見ましたか。', translation: '看了什么电影？' },
    { speaker: 'B', text: '日本のアニメです。スラムダンクを見ました。', translation: '日本的动画片。看了灌篮高手。' },
    { speaker: 'A', text: 'ああ、私も見たいです。', translation: '啊，我也想看。' },
  ]},
  { id: 17, lesson: 10, title: '食堂で', dialogue: [
    { speaker: 'A', text: '昼ご飯を食べましたか。', translation: '吃午饭了吗？' },
    { speaker: 'B', text: 'いいえ、まだ食べていません。', translation: '不，还没吃。' },
    { speaker: 'A', text: 'じゃ、一緒に食堂に行きませんか。', translation: '那一块去食堂吧？' },
    { speaker: 'B', text: 'はい、行きましょう。今日の定食は何ですか。', translation: '好的，走吧。今天的套餐是什么？' },
    { speaker: 'A', text: 'カレーライスだと思います。', translation: '我觉得是咖喱饭。' },
  ]},

  // ==================== N5: Lesson 11 (桜は本当に素晴らしいです) ====================
  { id: 18, lesson: 11, title: '公園で', dialogue: [
    { speaker: 'A', text: 'わあ、桜は本当にきれいですね。', translation: '哇，樱花真漂亮啊。' },
    { speaker: 'B', text: 'そうですね。とても美しいです。', translation: '是啊，非常美。' },
    { speaker: 'A', text: 'この公園は静かで、気持ちがいいですね。', translation: '这个公园又安静又舒服呢。' },
    { speaker: 'B', text: 'はい、のんびりできます。日本の春は素晴らしいです。', translation: '是的，能悠闲放松。日本的春天太棒了。' },
  ]},

  // ==================== N5: Lesson 12 (歌が大好きです) ====================
  { id: 19, lesson: 12, title: '趣味の話', dialogue: [
    { speaker: 'A', text: '李さん、趣味は何ですか。', translation: '小李，你的爱好是什么？' },
    { speaker: 'B', text: '音楽を聞くことが好きです。特にJ-POPが大好きです。', translation: '喜欢听音乐。特别喜欢J-POP。' },
    { speaker: 'A', text: '歌を歌うのも好きですか。', translation: '也喜欢唱歌吗？' },
    { speaker: 'B', text: 'はい、でもあまり上手じゃありません。', translation: '是的，但是不太擅长。' },
  ]},
  { id: 20, lesson: 12, title: '料理の話', dialogue: [
    { speaker: 'A', text: '料理が上手ですね。料理が好きですか。', translation: '料理很厉害呢。喜欢料理吗？' },
    { speaker: 'B', text: 'はい、料理を作るのが大好きです。', translation: '是的，非常喜欢做菜。' },
    { speaker: 'A', text: '和食も作れますか。', translation: '也会做日本料理吗？' },
    { speaker: 'B', text: 'はい、少しできます。でも天ぷらはまだ難しいです。', translation: '是的，会一点。但是天妇罗还很难。' },
  ]},

  // ==================== N5: Lesson 13 (東京は上海より静かです) ====================
  { id: 21, lesson: 13, title: '都市の比較', dialogue: [
    { speaker: 'A', text: '東京と上海とどちらが賑やかですか。', translation: '东京和上海哪个更热闹？' },
    { speaker: 'B', text: '上海のほうが賑やかだと思います。', translation: '我觉得上海更热闹。' },
    { speaker: 'A', text: 'じゃ、静かさはどちらですか。', translation: '那安静程度呢？' },
    { speaker: 'B', text: '東京は上海より静かです。', translation: '东京比上海安静。' },
    { speaker: 'A', text: '食べ物はどちらが美味しいですか。', translation: '吃的哪个更好吃？' },
    { speaker: 'B', text: 'どちらも美味しいです。', translation: '两个都好吃。' },
  ]},
  { id: 22, lesson: 13, title: '一番好きな季節', dialogue: [
    { speaker: 'A', text: '季節の中で、いつが一番好きですか。', translation: '季节中，最喜欢什么时候？' },
    { speaker: 'B', text: '春が一番好きです。桜が咲きますから。', translation: '最喜欢春天。因为樱花开。' },
    { speaker: 'A', text: '夏はどうですか。', translation: '夏天呢？' },
    { speaker: 'B', text: '夏は暑すぎます。冬のほうがいいです。', translation: '夏天太热了。冬天更好。' },
  ]},

  // ==================== N5: Lesson 14 (ゴールデンウィーク) ====================
  { id: 23, lesson: 14, title: '連休の計画', dialogue: [
    { speaker: 'A', text: 'ゴールデンウィークは何をするつもりですか。', translation: '黄金周打算做什么？' },
    { speaker: 'B', text: '友達と京都へ旅行に行くつもりです。', translation: '打算和朋友去京都旅行。' },
    { speaker: 'A', text: 'いいですね。京都のどこに行きたいですか。', translation: '好啊。想去京都哪里？' },
    { speaker: 'B', text: '金閣寺と清水寺を見たいです。', translation: '想看金阁寺和清水寺。' },
    { speaker: 'A', text: '気をつけて行ってきてください。', translation: '路上小心。' },
  ]},

  // ==================== N5: Lesson 15 (買い物をしましょう) ====================
  { id: 24, lesson: 15, title: 'デパートで', dialogue: [
    { speaker: 'A', text: 'すみません、この赤いセーターを見せてください。', translation: '不好意思，请给我看看这件红色毛衣。' },
    { speaker: 'B', text: 'はい、どうぞ。', translation: '好的，请。' },
    { speaker: 'A', text: 'これはいくらですか。', translation: '这个多少钱？' },
    { speaker: 'B', text: '五千八百円でございます。', translation: '五千八百日元。' },
    { speaker: 'A', text: 'じゃ、これをください。', translation: '那请给我这个。' },
  ]},
  { id: 25, lesson: 15, title: 'コンビニで', dialogue: [
    { speaker: 'A', text: 'すみません、これとこれをください。', translation: '不好意思，请给我这个和这个。' },
    { speaker: 'B', text: 'はい、お弁当とお茶ですね。合計で六百五十円です。', translation: '好的，便当和茶。一共六百五十日元。' },
    { speaker: 'A', text: '千円でお願いします。', translation: '给你一千日元。' },
    { speaker: 'B', text: '三百五十円のおつりです。ありがとうございました。', translation: '找您三百五十日元。谢谢。' },
  ]},

  // ==================== N5: Lesson 16 (夏休みの計画) ====================
  { id: 26, lesson: 16, title: '夏休みの相談', dialogue: [
    { speaker: 'A', text: '夏休みは国へ帰るつもりですか。', translation: '暑假打算回国吗？' },
    { speaker: 'B', text: 'いいえ、今回は日本に残ってアルバイトをするつもりです。', translation: '不，这次打算留在日本打工。' },
    { speaker: 'A', text: 'どんなアルバイトをしたいですか。', translation: '想做什么样的兼职？' },
    { speaker: 'B', text: 'コンビニで働きたいと思います。', translation: '想在便利店工作。' },
    { speaker: 'A', text: '大変かもしれませんが、頑張ってください。', translation: '可能会很辛苦，但请加油。' },
  ]},

  // ==================== N5: Lesson 17 (休んでもいいですか) ====================
  { id: 27, lesson: 17, title: '先生との会話', dialogue: [
    { speaker: 'A', text: '先生、すみません。ちょっと休んでもいいですか。', translation: '老师，不好意思，我可以稍微休息一下吗？' },
    { speaker: 'B', text: 'どうしましたか。', translation: '怎么了？' },
    { speaker: 'A', text: '頭が痛いんです。', translation: '头有点疼。' },
    { speaker: 'B', text: 'そうですか。それじゃ、保健室に行ったほうがいいですよ。', translation: '是吗。那最好去保健室哦。' },
    { speaker: 'A', text: 'はい、ありがとうございます。', translation: '好的，谢谢。' },
  ]},
  { id: 28, lesson: 17, title: '図書館で', dialogue: [
    { speaker: 'A', text: 'ここで携帯電話を使ってもいいですか。', translation: '可以在这里用手机吗？' },
    { speaker: 'B', text: 'すみません、ここでは使ってはいけません。', translation: '不好意思，这里不能使用。' },
    { speaker: 'A', text: 'あ、そうですか。外に出て使います。', translation: '啊，是吗。我出去用。' },
    { speaker: 'B', text: '静かにしてください。', translation: '请保持安静。' },
  ]},

  // ==================== N5: Lesson 18 (学生食堂は安くて美味しい) ====================
  { id: 29, lesson: 18, title: '食堂の評判', dialogue: [
    { speaker: 'A', text: 'この食堂の料理はどうですか。', translation: '这个食堂的菜怎么样？' },
    { speaker: 'B', text: '安くて美味しいですよ。', translation: '又便宜又好吃哦。' },
    { speaker: 'A', text: '何がおすすめですか。', translation: '有什么推荐的？' },
    { speaker: 'B', text: 'カツ丼が人気です。私もよく食べています。', translation: '炸猪排盖饭很受欢迎。我也经常吃。' },
    { speaker: 'A', text: 'じゃ、私もカツ丼にします。', translation: '那我也吃炸猪排盖饭。' },
  ]},

  // ==================== N5: Lesson 19 (料理を作ることができます) ====================
  { id: 30, lesson: 19, title: '料理の腕前', dialogue: [
    { speaker: 'A', text: '料理を作ることができますか。', translation: '会做菜吗？' },
    { speaker: 'B', text: 'はい、少しできます。', translation: '是的，会一点。' },
    { speaker: 'A', text: 'どんな料理が作れますか。', translation: '会做什么菜？' },
    { speaker: 'B', text: '餃子と麻婆豆腐が作れます。', translation: '会做饺子和麻婆豆腐。' },
    { speaker: 'A', text: 'すごいですね。今度教えてください。', translation: '好厉害。下次请教教我。' },
  ]},

  // ==================== N5: Lesson 20 (学校へ通うのは楽しい) ====================
  { id: 31, lesson: 20, title: '学校生活', dialogue: [
    { speaker: 'A', text: '学校へ通うのは楽しいですか。', translation: '上学快乐吗？' },
    { speaker: 'B', text: 'はい、毎日日本語を勉強するのが楽しいです。', translation: '是的，每天学日语很快乐。' },
    { speaker: 'A', text: '友達を作るのも楽しいですか。', translation: '交朋友也很快乐吗？' },
    { speaker: 'B', text: 'もちろんです。日本人の友達もできました。', translation: '当然。也交到了日本朋友。' },
    { speaker: 'A', text: 'それはよかったですね。', translation: '那真是太好了。' },
  ]},

  // ==================== N4: Lesson 21 (京都奈良へ行くことにします) ====================
  { id: 32, lesson: 21, title: '旅行の決定', dialogue: [
    { speaker: 'A', text: '春休みの予定はもう決めましたか。', translation: '春假的计划已经决定了吗？' },
    { speaker: 'B', text: 'はい、京都と奈良へ行くことにしました。', translation: '是的，决定去京都和奈良了。' },
    { speaker: 'A', text: 'それはいいですね。どうして京都と奈良にしたんですか。', translation: '真好。为什么决定去京都和奈良？' },
    { speaker: 'B', text: '歴史的な建物がたくさんあるからです。', translation: '因为有很多历史建筑。' },
    { speaker: 'A', text: '気をつけて楽しんできてください。', translation: '注意安全好好玩。' },
  ]},

  // ==================== N4: Lesson 22 (旅行の準備をしています) ====================
  { id: 33, lesson: 22, title: '旅行の準備', dialogue: [
    { speaker: 'A', text: 'もう旅行の準備はできましたか。', translation: '旅行的准备已经好了吗？' },
    { speaker: 'B', text: 'まだです。今準備をしています。', translation: '还没有。现在正在准备。' },
    { speaker: 'A', text: '何を持っていきますか。', translation: '要带什么去？' },
    { speaker: 'B', text: '着替えとカメラと地図を持っていくつもりです。', translation: '打算带换洗衣服、相机和地图。' },
    { speaker: 'A', text: 'ホテルはもう予約してありますか。', translation: '酒店已经预约好了吗？' },
    { speaker: 'B', text: 'はい、先週予約しておきました。', translation: '是的，上周预约好了。' },
  ]},

  // ==================== N4: Lesson 23 (鑑真について勉強したことがあります) ====================
  { id: 34, lesson: 23, title: '歴史の学習', dialogue: [
    { speaker: 'A', text: '鑑真について勉強したことがありますか。', translation: '学过鉴真吗？' },
    { speaker: 'B', text: 'はい、高校の歴史の授業で習ったことがあります。', translation: '是的，在高中历史课上学过。' },
    { speaker: 'A', text: '鑑真和上は日本に仏教を伝えたと聞きました。', translation: '听说鉴真和尚把佛教传到了日本。' },
    { speaker: 'B', text: 'そうです。何度も失敗しましたが、諦めませんでした。', translation: '是的。失败了好几次但没有放弃。' },
  ]},

  // ==================== N4: Lesson 24 (金閣寺を見たいです) ====================
  { id: 35, lesson: 24, title: '観光したい場所', dialogue: [
    { speaker: 'A', text: '日本で何を見たいですか。', translation: '在日本想看什么？' },
    { speaker: 'B', text: '金閣寺を見たいです。写真で見て、とても美しいと思いました。', translation: '想看金阁寺。看过照片觉得非常美。' },
    { speaker: 'A', text: '他には何かありますか。', translation: '还有别的什么吗？' },
    { speaker: 'B', text: '奈良の大仏も見たいです。歴史が長いそうです。', translation: '也想看奈良大佛。听说历史很悠久。' },
  ]},

  // ==================== N4: Lesson 25 (学校に通わなければなりません) ====================
  { id: 36, lesson: 25, title: '学校の規則', dialogue: [
    { speaker: 'A', text: '毎日学校に来なければなりませんか。', translation: '必须每天来学校吗？' },
    { speaker: 'B', text: 'はい、出席は義務です。', translation: '是的，出席是义务。' },
    { speaker: 'A', text: '病気の時はどうすればいいですか。', translation: '生病的时候怎么办？' },
    { speaker: 'B', text: 'その場合は学校に連絡しなくてはいけません。', translation: '那种情况必须联系学校。' },
    { speaker: 'A', text: 'わかりました。気をつけます。', translation: '明白了。我会注意的。' },
  ]},

  // ==================== N4: Lesson 26 (台風が来なければいい) ====================
  { id: 37, lesson: 26, title: '天気の心配', dialogue: [
    { speaker: 'A', text: 'ニュースによると、明日台風が来るそうです。', translation: '据新闻说，明天台风要来。' },
    { speaker: 'B', text: '本当ですか。台風が来なければいいですね。', translation: '真的吗？台风不来就好了。' },
    { speaker: 'A', text: 'もし台風が来たら、学校は休みになりますか。', translation: '如果台风来了，学校会放假吗？' },
    { speaker: 'B', text: 'たぶん、警報が出たら休校になるかもしれません。', translation: '大概，如果发出警报的话可能会停课。' },
  ]},

  // ==================== N4: Lesson 27 (学校へ来なくてもいい) ====================
  { id: 38, lesson: 27, title: '休みの許可', dialogue: [
    { speaker: 'A', text: '先生、明日学校へ来なくてもいいですか。', translation: '老师，明天不来学校可以吗？' },
    { speaker: 'B', text: 'わかりました。いいですよ。でも宿題は出してくださいね。', translation: '好的，可以哦。但是作业请提交哦。' },
    { speaker: 'A', text: 'はい、必ず出します。', translation: '好的，一定会提交。' },
    { speaker: 'B', text: '来週からは遅刻しなくてもいいように、早く起きてください。', translation: '为了下周开始不迟到，请早点起床。' },
  ]},

  // ==================== N4: Lesson 28 (テストには遅刻しないように) ====================
  { id: 39, lesson: 28, title: '試験前の注意', dialogue: [
    { speaker: 'A', text: '来週の月曜日はテストですね。', translation: '下周一是考试呢。' },
    { speaker: 'B', text: 'はい、遅刻しないようにしてください。', translation: '是的，请不要迟到。' },
    { speaker: 'A', text: 'テストに合格するために、毎日勉強しています。', translation: '为了通过考试，每天都在学习。' },
    { speaker: 'B', text: '私もです。良い点が取れるように頑張りましょう。', translation: '我也是。为了能拿到好成绩一起努力吧。' },
  ]},

  // ==================== N4: Lesson 29 (紅葉が見られます) ====================
  { id: 40, lesson: 29, title: '紅葉狩り', dialogue: [
    { speaker: 'A', text: '秋になると、京都で美しい紅葉が見られます。', translation: '一到秋天，在京都就能看到美丽的红叶。' },
    { speaker: 'B', text: '本当ですか。私も見に行きたいです。', translation: '真的吗？我也想去看看。' },
    { speaker: 'A', text: '十一月の終わりごろが一番きれいだそうです。', translation: '听说十一月底的时候最美。' },
    { speaker: 'B', text: 'じゃ、その時に行く計画を立てましょう。', translation: '那，那个时候制定计划去吧。' },
  ]},

  // ==================== N4: Lesson 30 (母に手紙を書こうと思います) ====================
  { id: 41, lesson: 30, title: '家族への連絡', dialogue: [
    { speaker: 'A', text: '最近、国にいる家族に連絡しましたか。', translation: '最近和国内的家人联系了吗？' },
    { speaker: 'B', text: 'まだです。母に手紙を書こうと思います。', translation: '还没有。想给妈妈写封信。' },
    { speaker: 'A', text: '手紙は温かくていいですね。', translation: '信件很温暖真好呢。' },
    { speaker: 'B', text: 'はい、母はメールより手紙のほうが好きかもしれません。', translation: '是啊，妈妈可能比起邮件更喜欢信。' },
  ]},

  // ==================== N4: Lesson 31 (敬語を使いましょう) ====================
  { id: 42, lesson: 31, title: '敬語の練習', dialogue: [
    { speaker: 'A', text: '社長はもういらっしゃいましたか。', translation: '社长已经来了吗？' },
    { speaker: 'B', text: 'はい、先ほどお戻りになりました。', translation: '是的，刚才回来了。' },
    { speaker: 'A', text: 'では、資料をお持ちします。', translation: '那我拿资料过去。' },
    { speaker: 'B', text: 'よろしくお願いいたします。', translation: '拜托了。' },
  ]},

  // ==================== N4: Lesson 32 (勉強すればするほど難しくなる) ====================
  { id: 43, lesson: 32, title: '勉強の悩み', dialogue: [
    { speaker: 'A', text: '日本語の勉強はどうですか。', translation: '日语学习怎么样了？' },
    { speaker: 'B', text: '勉強すればするほど難しくなります。', translation: '越学越难。' },
    { speaker: 'A', text: '特に何が難しいですか。', translation: '特别是哪里难？' },
    { speaker: 'B', text: '文法が難しいです。覚えてもすぐ忘れてしまいます。', translation: '语法很难。记住也会马上忘记。' },
  ]},

  // ==================== N4: Lesson 33 (日本語能力試験に合格するために) ====================
  { id: 44, lesson: 33, title: '試験対策', dialogue: [
    { speaker: 'A', text: 'JLPTの試験に合格するために、何をしていますか。', translation: '为了通过JLPT考试，在做什么？' },
    { speaker: 'B', text: '毎日単語を覚えて、問題集を解いています。', translation: '每天记单词，做习题集。' },
    { speaker: 'A', text: '合格できるといいですね。', translation: '能合格就好了。' },
    { speaker: 'B', text: 'ありがとうございます。一緒に頑張りましょう。', translation: '谢谢。一起加油吧。' },
  ]},

  // ==================== N4: Lesson 34 (クリスマスと元旦) ====================
  { id: 45, lesson: 34, title: '年末の行事', dialogue: [
    { speaker: 'A', text: '日本ではクリスマスをどう過ごしますか。', translation: '在日本怎么过圣诞节？' },
    { speaker: 'B', text: '友達や恋人と過ごすことが多いです。プレゼントを交換するようです。', translation: '多数和朋友或恋人过。好像会交换礼物。' },
    { speaker: 'A', text: '元旦は家族と過ごすそうですね。', translation: '听说元旦是和家人过呢。' },
    { speaker: 'B', text: 'はい、おせち料理を食べて、初詣に行くらしいです。', translation: '是的，好像会吃年菜去新年参拜。' },
  ]},

  // ==================== N4: Lesson 35 (紅白歌合戦) ====================
  { id: 46, lesson: 35, title: '大晦日の過ごし方', dialogue: [
    { speaker: 'A', text: '大晦日は何をしますか。', translation: '除夕做什么？' },
    { speaker: 'B', text: '紅白歌合戦を見るつもりです。ちょうど今出かけるところです。', translation: '打算看红白歌会。正要出门呢。' },
    { speaker: 'A', text: 'もう年越しそばは食べましたか。', translation: '已经吃了过年荞麦面了吗？' },
    { speaker: 'B', text: 'いいえ、これから食べるところです。', translation: '不，正要吃。' },
  ]},

  // ==================== N4: Lesson 36 (初詣はお祭りのようです) ====================
  { id: 47, lesson: 36, title: '初詣', dialogue: [
    { speaker: 'A', text: '初詣に行ったことがありますか。', translation: '去过新年参拜吗？' },
    { speaker: 'B', text: 'はい、去年初めて行きました。お祭りのようでとても賑やかでした。', translation: '是的，去年第一次去了。像节日一样非常热闹。' },
    { speaker: 'A', text: 'どんな願い事をしましたか。', translation: '许了什么愿？' },
    { speaker: 'B', text: '家族の健康と日本語の上達をお願いしました。', translation: '许了家人健康和日语进步的愿望。' },
  ]},

  // ==================== N4: Lesson 37 (成人式) ====================
  { id: 48, lesson: 37, title: '成人式の話', dialogue: [
    { speaker: 'A', text: '日本の成人式について知っていますか。', translation: '知道日本的成人礼吗？' },
    { speaker: 'B', text: 'はい、二十歳になった人を祝う行事ですね。', translation: '是的，是庆祝二十岁的人的仪式吧。' },
    { speaker: 'A', text: '女性は振袖を着るそうです。とてもきれいだと思います。', translation: '听说女性穿振袖和服。我觉得非常漂亮。' },
    { speaker: 'B', text: '私も来年二十歳になるので、楽しみにしています。', translation: '我明年也二十岁了，所以很期待。' },
  ]},

  // ==================== N4: Lesson 38 (節分) ====================
  { id: 49, lesson: 38, title: '節分の習慣', dialogue: [
    { speaker: 'A', text: '節分には何をしますか。', translation: '节分做什么？' },
    { speaker: 'B', text: '"鬼は外、福は内"と言いながら豆をまきます。', translation: '一边说"鬼出去，福进来"一边撒豆子。' },
    { speaker: 'A', text: '面白い習慣ですね。私にとって、こういう文化を学ぶのは楽しいです。', translation: '有趣的习惯呢。对我来说，学习这种文化很快乐。' },
    { speaker: 'B', text: '地域によってやり方が少し違うかもしれません。', translation: '根据地区做法可能略有不同。' },
  ]},

  // ==================== N3: Lesson 39 (春休みは復習しよう) ====================
  { id: 50, lesson: 39, title: '復習の誘い', dialogue: [
    { speaker: 'A', text: '春休みは一緒に復習しようじゃありませんか。', translation: '春假一起复习吧。' },
    { speaker: 'B', text: 'いいですね。どこでやりましょうか。', translation: '好啊。在哪里进行呢？' },
    { speaker: 'A', text: '図書館でやってみませんか。静かですから。', translation: '在图书馆试试吧？因为安静。' },
    { speaker: 'B', text: 'そうですね。毎日少しずつ復習することが大切です。', translation: '是啊。每天一点一点复习很重要。' },
  ]},

  // ==================== N3: Lesson 40 (桜の花が咲くまで待つ) ====================
  { id: 51, lesson: 40, title: '桜を待つ', dialogue: [
    { speaker: 'A', text: '今年の桜はまだですか。', translation: '今年的樱花还没开吗？' },
    { speaker: 'B', text: 'ええ、まだです。桜の花が咲くまで待たなければなりません。', translation: '嗯，还没有。必须等到樱花开放。' },
    { speaker: 'A', text: '満開になるまでにあとどのくらいですか。', translation: '到盛开还有多久？' },
    { speaker: 'B', text: '天気予報によると、あと一週間ぐらいだそうです。', translation: '据天气预报说，大概还有一周左右。' },
  ]},

  // ==================== N3: Lesson 41 (田中先生の下で勉強) ====================
  { id: 52, lesson: 41, title: '研究室で', dialogue: [
    { speaker: 'A', text: '田中先生の下でどんな研究をしていますか。', translation: '在田中老师的指导下做什么研究？' },
    { speaker: 'B', text: '日中文化交流の研究をしています。', translation: '做中日文化交流的研究。' },
    { speaker: 'A', text: '先生の指示に従って研究を進めていますか。', translation: '按照老师的指示推进研究吗？' },
    { speaker: 'B', text: 'はい、しかし研究が進むに伴って、新しい課題も出てきました。', translation: '是的，但随着研究的推进，也出现了新课题。' },
  ]},

  // ==================== N3: Lesson 42 (狭いながらも楽しい我が家) ====================
  { id: 53, lesson: 42, title: 'アパートの話', dialogue: [
    { speaker: 'A', text: '新しいアパートはどうですか。', translation: '新公寓怎么样？' },
    { speaker: 'B', text: '狭いながらも楽しい我が家です。', translation: '虽然小但快乐的家。' },
    { speaker: 'A', text: 'どこが気に入っていますか。', translation: '喜欢哪里？' },
    { speaker: 'B', text: '日当たりが良くて、ベランダから富士山が見えるんです。', translation: '日照好，从阳台能看到富士山。' },
    { speaker: 'A', text: 'それは素晴らしいですね。', translation: '那太棒了。' },
  ]},

  // ==================== N3: Lesson 43 (ゴミ出しルール) ====================
  { id: 54, lesson: 43, title: 'ゴミ出しの説明', dialogue: [
    { speaker: 'A', text: 'すみません、ゴミの出し方を教えてください。', translation: '不好意思，请教一下垃圾的扔法。' },
    { speaker: 'B', text: '燃えるゴミは月曜日と木曜日に出さなければいけません。', translation: '可燃垃圾必须在周一和周四扔。' },
    { speaker: 'A', text: '燃えないゴミはいつですか。', translation: '不可燃垃圾是什么时候？' },
    { speaker: 'B', text: '水曜日です。分別しないと収集してもらえません。', translation: '周三。不分类的话不会被收走。' },
  ]},

  // ==================== N3: Lesson 44 (東京六大学野球) ====================
  { id: 55, lesson: 44, title: '野球観戦', dialogue: [
    { speaker: 'A', text: '東京六大学野球を見たことがありますか。', translation: '看过东京六大学棒球赛吗？' },
    { speaker: 'B', text: 'はい、去年初めて見に行きました。日本において野球は本当に人気がありますね。', translation: '是的，去年第一次去看了。在日本棒球真有人气呢。' },
    { speaker: 'A', text: '学生のうちに一度見ておくといいですよ。', translation: '趁学生时去看一次比较好哦。' },
    { speaker: 'B', text: '長年にわたって多くの名選手を生み出してきた伝統あるリーグです。', translation: '是多年来培养出很多名选手的有传统的联赛。' },
  ]},

  // ==================== N3: Lesson 45 (仕事の最中に) ====================
  { id: 56, lesson: 45, title: '仕事の邪魔', dialogue: [
    { speaker: 'A', text: 'もしもし、今大丈夫ですか。', translation: '喂，现在方便吗？' },
    { speaker: 'B', text: 'すみません、今仕事の最中なんです。後でかけ直してもいいですか。', translation: '不好意思，正在工作中。可以等下回电话给你吗？' },
    { speaker: 'A', text: 'わかりました。失礼しました。', translation: '好的。抱歉打扰了。' },
  ]},

  // ==================== N3: Lesson 46 (上手く作れました) ====================
  { id: 57, lesson: 46, title: '料理成功', dialogue: [
    { speaker: 'A', text: 'わあ、これが作った料理ですか。上手く作れましたね。', translation: '哇，这是做的菜吗？做得很好呢。' },
    { speaker: 'B', text: 'はい、先生に教えてもらって、やっと作れるようになりました。', translation: '是的，请教了老师，终于能做了。' },
    { speaker: 'A', text: 'すごい。私はまだ上手に作れません。', translation: '厉害。我还不能做得好。' },
    { speaker: 'B', text: '練習すれば、誰でも作れるようになりますよ。', translation: '练习的话，谁都能变得会做的。' },
  ]},

  // ==================== N3: Lesson 47 (出費がちで旅行どころではない) ====================
  { id: 58, lesson: 47, title: 'お金の悩み', dialogue: [
    { speaker: 'A', text: '最近、遊びに行かないんですか。', translation: '最近不出去玩吗？' },
    { speaker: 'B', text: '出費がちで旅行どころじゃありません。', translation: '老是花钱哪能旅行。' },
    { speaker: 'A', text: 'そうですか。何にお金を使っているんですか。', translation: '是吗。钱花在什么上了？' },
    { speaker: 'B', text: '最近外食しがちで、つい無駄遣いしてしまいます。', translation: '最近经常在外面吃，不知不觉就浪费了。' },
  ]},

  // ==================== N3: Lesson 48 (日中書道展を契機に) ====================
  { id: 59, lesson: 48, title: '文化交流', dialogue: [
    { speaker: 'A', text: '日中書道展を見に行きませんか。', translation: '要不要去看中日书法展？' },
    { speaker: 'B', text: 'はい、ぜひ。書道展を契機に交流が深まるといいですね。', translation: '好的，一定。希望以书法展为契机加深交流。' },
    { speaker: 'A', text: 'こういうイベントを通じてお互いの文化を理解できます。', translation: '通过这样的活动可以理解彼此的文化。' },
    { speaker: 'B', text: '参加者のレベルに応じて、作品も様々ですね。', translation: '根据参加者的水平，作品也各种各样呢。' },
  ]},

  // ==================== N3: Lesson 49 (沢山の動物がいました) ====================
  { id: 60, lesson: 49, title: '動物園で', dialogue: [
    { speaker: 'A', text: '昨日動物園に行きました。沢山の動物がいました。', translation: '昨天去了动物园。有很多动物。' },
    { speaker: 'B', text: 'パンダもいましたか。', translation: '也有熊猫吗？' },
    { speaker: 'A', text: 'はい、友達に写真を撮ってもらいました。', translation: '是的，让朋友帮我拍了照片。' },
    { speaker: 'B', text: '見せてもらえますか。', translation: '能给我看看吗？' },
  ]},

  // ==================== N3: Lesson 50 (ご馳走になっています) ====================
  { id: 61, lesson: 50, title: '先輩の家で', dialogue: [
    { speaker: 'A', text: '今日は先輩にご馳走になっています。', translation: '今天被前辈请客了。' },
    { speaker: 'B', text: 'いいですね。何を食べていますか。', translation: '真好。在吃什么？' },
    { speaker: 'A', text: 'すき焼きです。先輩が作ってくれたんです。', translation: '是寿喜烧。前辈给我做的。' },
    { speaker: 'B', text: '先輩は本当に親切ですね。', translation: '前辈真是热心呢。' },
  ]},

  // ==================== N3: Lesson 51 (留学した上は頑張る) ====================
  { id: 62, lesson: 51, title: '留学の決意', dialogue: [
    { speaker: 'A', text: '留学した上は、しっかり頑張らないといけませんね。', translation: '既然留学了，就不好好努力不行呢。' },
    { speaker: 'B', text: 'そうですね。彼は頭がいい上に、努力家ですからきっと大丈夫です。', translation: '是啊。他不仅聪明还很努力，所以一定没问题。' },
    { speaker: 'A', text: 'よく考えた上で留学を決めたのでしょう。', translation: '应该是仔细考虑之后才决定留学的吧。' },
    { speaker: 'B', text: 'はい、家族とも相談したそうです。', translation: '是的，听说也和家人商量了。' },
  ]},

  // ==================== N3: Lesson 52 (湿っぽい日が続く) ====================
  { id: 63, lesson: 52, title: '梅雨の話', dialogue: [
    { speaker: 'A', text: '最近、湿っぽい日が続きますね。', translation: '最近潮湿的日子持续呢。' },
    { speaker: 'B', text: 'そうですね。梅雨の季節ですから。', translation: '是啊。因为是梅雨季节。' },
    { speaker: 'A', text: '最近ちょっと疲れ気味で、元気が出ません。', translation: '最近有点累，提不起精神。' },
    { speaker: 'B', text: '私もです。早く梅雨が終わってほしいですね。', translation: '我也是。希望梅雨快点结束。' },
  ]},

  // ==================== N3: Lesson 53 (語彙を増やさないことには) ====================
  { id: 64, lesson: 53, title: '語彙力の悩み', dialogue: [
    { speaker: 'A', text: '日本語で会話する時、言葉が出てこないんです。', translation: '用日语会话时，词总说不出来。' },
    { speaker: 'B', text: '語彙を増やさないことには、会話が上手になりませんよ。', translation: '不增加词汇量的话，会话不会变好的。' },
    { speaker: 'A', text: 'どうやって語彙を増やしたらいいでしょうか。', translation: '怎么增加词汇量好呢？' },
    { speaker: 'B', text: '毎日新しい単語を少しずつ覚えなくては。', translation: '每天必须一点一点记新单词。' },
  ]},

  // ==================== N3: Lesson 54 (七夕) ====================
  { id: 65, lesson: 54, title: '七夕の短冊', dialogue: [
    { speaker: 'A', text: '七夕には短冊に願い事を書くそうですね。', translation: '听说七夕把愿望写在签上。' },
    { speaker: 'B', text: 'はい、笹に飾ります。日本の七夕に関して調べたことがあります。', translation: '是的，装饰在竹子上。关于日本七夕我调查过。' },
    { speaker: 'A', text: 'どんな願い事を書きますか。', translation: '写什么样的愿望？' },
    { speaker: 'B', text: '事実に基づいてとは言えませんが、願いは自由です。', translation: '不能说基于事实，但愿望是自由的。' },
  ]},

  // ==================== N3: Lesson 55 (お盆の計画) ====================
  { id: 66, lesson: 55, title: 'お盆の帰省', dialogue: [
    { speaker: 'A', text: 'お盆は帰省しますか。', translation: '盂兰盆节回家吗？' },
    { speaker: 'B', text: 'はい、母の代わりに実家の手伝いをします。', translation: '是的，代替妈妈帮家里忙。' },
    { speaker: 'A', text: '去年に比べて、今年は休みが短いようです。', translation: '与去年相比，今年假期好像短。' },
    { speaker: 'B', text: 'でも故郷に帰るのは楽しいに違いありません。', translation: '但回故乡一定很快乐。' },
  ]},

  // ==================== N3: Lesson 56 (アルバイトをしています) ====================
  { id: 67, lesson: 56, title: 'コンビニバイト', dialogue: [
    { speaker: 'A', text: 'いらっしゃいませ。', translation: '欢迎光临。' },
    { speaker: 'B', text: 'すみません、温めてください。', translation: '不好意思，请给我加热。' },
    { speaker: 'A', text: 'かしこまりました。少々お待ちください。', translation: '好的，请稍等。' },
    { speaker: 'B', text: 'ありがとうございます。', translation: '谢谢。' },
    { speaker: 'A', text: 'またお越しくださいませ。', translation: '欢迎再次光临。' },
  ]},
];

module.exports = texts;
