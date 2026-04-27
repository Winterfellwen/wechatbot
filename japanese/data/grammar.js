const grammar = [
  // ==================== N5: Lessons 1-4 (五十音/音声) ====================
  { id: 1, lesson: 1, level: 'N5', pattern: '～です', structure: 'N + です', explanation: '判断句的礼貌体，表示"是～"', example: '私は学生です。', translation: '我是学生。' },
  { id: 2, lesson: 1, level: 'N5', pattern: '～ですか', structure: 'N + ですか', explanation: '疑问句，在句末加か表示疑问', example: 'あなたは先生ですか。', translation: '你是老师吗？' },
  { id: 3, lesson: 1, level: 'N5', pattern: '～じゃありません', structure: 'N + じゃありません', explanation: '名词谓语句否定形，表示"不是～"', example: '私は日本人じゃありません。', translation: '我不是日本人。' },

  { id: 4, lesson: 2, level: 'N5', pattern: '～も', structure: 'N + も', explanation: '表示"也"，替代は/が使用', example: '私も学生です。', translation: '我也是学生。' },
  { id: 5, lesson: 2, level: 'N5', pattern: '～の', structure: 'N1 + の + N2', explanation: '表示所属、性质，"的"', example: 'これは私の本です。', translation: '这是我的书。' },

  { id: 6, lesson: 3, level: 'N5', pattern: '～があります/います', structure: 'N + が + あります/います', explanation: '表示存在，あります用于无生命物，います用于有生命物', example: '机の上に本があります。', translation: '桌子上有书。' },
  { id: 7, lesson: 3, level: 'N5', pattern: '～に', structure: '場所 + に + あります/います', explanation: '表示存在场所，在某处有～', example: '教室に学生がいます。', translation: '教室里有学生。' },

  { id: 8, lesson: 4, level: 'N5', pattern: '～で', structure: '場所 + で + 動作', explanation: '表示动作进行的场所', example: '図書館で勉強します。', translation: '在图书馆学习。' },
  { id: 9, lesson: 4, level: 'N5', pattern: '～と', structure: 'N1 + と + N2', explanation: '表示并列，"和"', example: 'りんごとバナナを買います。', translation: '买苹果和香蕉。' },

  // ==================== N5: Lesson 5 (わたしは留学生です) ====================
  { id: 10, lesson: 5, level: 'N5', pattern: '～は～です', structure: 'N1 + は + N2 + です', explanation: '主题句型，は提示主题，です表示断定', example: '私は留学生です。', translation: '我是留学生。' },
  { id: 11, lesson: 5, level: 'N5', pattern: '～は～ですか', structure: 'N1 + は + N2 + ですか', explanation: '疑问句，询问身份、职业等', example: 'あなたは中国人ですか。', translation: '你是中国人吗？' },
  { id: 12, lesson: 5, level: 'N5', pattern: '～も～です', structure: 'N1 + も + N2 + です', explanation: '表示"也是"', example: '李さんも留学生です。', translation: '小李也是留学生。' },
  { id: 13, lesson: 5, level: 'N5', pattern: '～から来ました', structure: '場所 + から + 来ました', explanation: '表示来自某地', example: '中国から来ました。', translation: '从中国来的。' },

  // ==================== N5: Lesson 6 (これは本です) ====================
  { id: 14, lesson: 6, level: 'N5', pattern: 'これは～です', structure: 'これ + は + N + です', explanation: '指示代名词これ，指代近处事物', example: 'これは本です。', translation: '这是书。' },
  { id: 15, lesson: 6, level: 'N5', pattern: 'それは～です', structure: 'それ + は + N + です', explanation: '指示代名词それ，指代对方近处事物', example: 'それは辞書ですか。', translation: '那是词典吗？' },
  { id: 16, lesson: 6, level: 'N5', pattern: 'あれは～です', structure: 'あれ + は + N + です', explanation: '指示代名词あれ，指代远处事物', example: 'あれは図書館です。', translation: '那是图书馆。' },
  { id: 17, lesson: 6, level: 'N5', pattern: 'この/その/あの', structure: 'この/その/あの + N', explanation: '连体词，修饰名词，この近称/その中称/あの远称', example: 'この本は誰のですか。', translation: '这本书是谁的？' },

  // ==================== N5: Lesson 7 (図書館はどこですか) ====================
  { id: 18, lesson: 7, level: 'N5', pattern: '～はどこですか', structure: '場所 + は + どこですか', explanation: '询问地点，どこ表示"哪里"', example: 'トイレはどこですか。', translation: '厕所在哪里？' },
  { id: 19, lesson: 7, level: 'N5', pattern: '～に～があります/います', structure: '場所 + に + N + が + あります/います', explanation: '表示某处存在某人或某物', example: '公園に猫がいます。', translation: '公园里有猫。' },
  { id: 20, lesson: 7, level: 'N5', pattern: '～に～がありません/いません', structure: '場所 + に + N + が + ありません/いません', explanation: '表示某处不存在～', example: '冷蔵庫に何もありません。', translation: '冰箱里什么都没有。' },

  // ==================== N5: Lesson 8 (今何時ですか) ====================
  { id: 21, lesson: 8, level: 'N5', pattern: '～時～分', structure: '数字 + 時 + 数字 + 分', explanation: '表示时间，"～点～分"', example: '今三時十五分です。', translation: '现在三点十五分。' },
  { id: 22, lesson: 8, level: 'N5', pattern: '～から～まで', structure: 'N + から + N + まで', explanation: '表示时间或空间范围，"从～到～"', example: '9時から5時まで働きます。', translation: '从九点工作到五点。' },
  { id: 23, lesson: 8, level: 'N5', pattern: '～日に', structure: '日期 + に + 動作', explanation: 'に接在具体日期后表示动作发生的时间', example: '月曜日にテストがあります。', translation: '星期一有考试。' },

  // ==================== N5: Lesson 9 (花見に行きます) ====================
  { id: 24, lesson: 9, level: 'N5', pattern: '～に行く/来る/帰る', structure: '場所 + へ/に + 行く/来る/帰る', explanation: '移动动词，に/へ表示方向', example: '学校に行きます。', translation: '去学校。' },
  { id: 25, lesson: 9, level: 'N5', pattern: '～で行く', structure: '交通手段 + で + 行く', explanation: 'で表示交通工具或手段', example: '電車で行きます。', translation: '坐电车去。' },
  { id: 26, lesson: 9, level: 'N5', pattern: '～へ', structure: '場所 + へ + 移動動詞', explanation: '表示移动方向，可与に互换', example: '日本へ旅行に行きます。', translation: '去日本旅行。' },
  { id: 27, lesson: 9, level: 'N5', pattern: '～ます', structure: 'V-ます', explanation: '动词的礼貌现在/将来时', example: '毎日日本語を勉強します。', translation: '每天学习日语。' },

  // ==================== N5: Lesson 10 (食事をします) ====================
  { id: 28, lesson: 10, level: 'N5', pattern: '～を', structure: 'N + を + 他動詞', explanation: 'を表示动作的对象、宾语', example: 'ご飯を食べます。', translation: '吃饭。' },
  { id: 29, lesson: 10, level: 'N5', pattern: '～ました', structure: 'V-ました', explanation: '动词礼貌过去时，表示动作已经完成', example: '昨日映画を見ました。', translation: '昨天看了电影。' },
  { id: 30, lesson: 10, level: 'N5', pattern: '～ません', structure: 'V-ません', explanation: '动词礼貌否定形', example: '朝ごはんを食べません。', translation: '不吃早饭。' },
  { id: 31, lesson: 10, level: 'N5', pattern: '～ませんでした', structure: 'V-ませんでした', explanation: '动词礼貌过去否定形', example: '昨日勉強しませんでした。', translation: '昨天没学习。' },

  // ==================== N5: Lesson 11 (桜は本当に素晴らしいです) ====================
  { id: 32, lesson: 11, level: 'N5', pattern: '形容詞～いです', structure: 'A-い + です', explanation: 'イ形容词礼貌体，直接接です', example: '桜は美しいです。', translation: '樱花很美。' },
  { id: 33, lesson: 11, level: 'N5', pattern: '形容動詞～です', structure: 'Na + です', explanation: 'ナ形容词礼貌体（词干接です）', example: 'この公園は静かです。', translation: '这个公园很安静。' },
  { id: 34, lesson: 11, level: 'N5', pattern: '～くないです', structure: 'A-く + ないです', explanation: 'イ形容词否定形', example: '今日は暑くないです。', translation: '今天不热。' },
  { id: 35, lesson: 11, level: 'N5', pattern: '～じゃないです', structure: 'Na + じゃないです', explanation: 'ナ形容词否定形', example: 'この部屋はきれいじゃないです。', translation: '这个房间不干净。' },

  // ==================== N5: Lesson 12 (歌が大好きです) ====================
  { id: 36, lesson: 12, level: 'N5', pattern: '～が好きです/嫌いです', structure: 'N + が + 好き/嫌い + です', explanation: '表示喜好，が表示对象', example: '私は音楽が好きです。', translation: '我喜欢音乐。' },
  { id: 37, lesson: 12, level: 'N5', pattern: '～が上手/下手です', structure: 'N + が + 上手/下手 + です', explanation: '表示擅长/不擅长', example: '彼女は日本語が上手です。', translation: '她日语很好。' },
  { id: 38, lesson: 12, level: 'N5', pattern: '～がわかります', structure: 'N + が + わかります', explanation: '表示懂得、明白，对象用が', example: '私は英語がわかります。', translation: '我懂英语。' },
  { id: 39, lesson: 12, level: 'N5', pattern: '～が欲しいです', structure: 'N + が + 欲しいです', explanation: '表示想要某物', example: '新しいパソコンが欲しいです。', translation: '想要新电脑。' },

  // ==================== N5: Lesson 13 (東京は上海より静かです) ====================
  { id: 40, lesson: 13, level: 'N5', pattern: '～より', structure: 'N1 + は + N2 + より + A', explanation: '比较句，表示N1比N2更～', example: '東京は上海より静かです。', translation: '东京比上海安静。' },
  { id: 41, lesson: 13, level: 'N5', pattern: '～のほうが', structure: 'N1 + のほうが + N2 + より + A', explanation: '强调N1比N2更～，"～的一方更～"', example: '電車のほうがバスより速いです。', translation: '电车比公交车快。' },
  { id: 42, lesson: 13, level: 'N5', pattern: '～で～が一番', structure: '範囲 + で + N + が一番 + A', explanation: '表示在范围内最～', example: 'クラスで彼が一番背が高いです。', translation: '班里他个子最高。' },
  { id: 43, lesson: 13, level: 'N5', pattern: '～と同じくらい', structure: 'N1 + は + N2 + と同じくらい + A', explanation: '表示N1和N2差不多一样～', example: '日本語は韓国語と同じくらい難しいです。', translation: '日语和韩语差不多一样难。' },

  // ==================== N5: Lesson 14 (ゴールデンウィーク) ====================
  { id: 44, lesson: 14, level: 'N5', pattern: '～つもりです', structure: 'V-る + つもりです', explanation: '表示打算、计划', example: '夏休みに旅行するつもりです。', translation: '暑假打算去旅行。' },
  { id: 45, lesson: 14, level: 'N5', pattern: '～予定です', structure: 'N/V-る + 予定です', explanation: '表示预定、安排', example: '来週京都に行く予定です。', translation: '下周预定去京都。' },
  { id: 46, lesson: 14, level: 'N5', pattern: '～たい', structure: 'V-ます + たい', explanation: '表示第一人称的愿望，"想～"', example: '日本へ行きたいです。', translation: '想去日本。' },
  { id: 47, lesson: 14, level: 'N5', pattern: '～たがっている', structure: 'V-ます + たがっています', explanation: '表示第三人称的愿望', example: '彼女は日本に行きたがっています。', translation: '她想去日本。' },

  // ==================== N5: Lesson 15 (買い物をしましょう) ====================
  { id: 48, lesson: 15, level: 'N5', pattern: '～ましょう', structure: 'V-ましょう', explanation: '表示劝诱、邀请，"～吧"', example: '一緒に買い物をしましょう。', translation: '一起去买东西吧。' },
  { id: 49, lesson: 15, level: 'N5', pattern: '～てください', structure: 'V-て + ください', explanation: '表示请求，"请～"', example: 'ここに名前を書いてください。', translation: '请在这里写名字。' },
  { id: 50, lesson: 15, level: 'N5', pattern: '～をください', structure: 'N + を + ください', explanation: '表示请求给予某物', example: 'これをください。', translation: '请给我这个。' },

  // ==================== N5: Lesson 16 (夏休みの計画) ====================
  { id: 51, lesson: 16, level: 'N5', pattern: '～と思う', structure: 'S(普通体) + と思う', explanation: '表示说话人的思考、判断，"我认为～"', example: '明日は雨だと思います。', translation: '我觉得明天会下雨。' },
  { id: 52, lesson: 16, level: 'N5', pattern: '～と言う', structure: 'S(普通体) + と言う', explanation: '表示引用，"说～"', example: '彼は来週来ると言いました。', translation: '他说下周来。' },
  { id: 53, lesson: 16, level: 'N5', pattern: '～前に', structure: 'V-る + 前に', explanation: '表示在～之前做某事', example: '寝る前に本を読みます。', translation: '睡觉前看书。' },
  { id: 54, lesson: 16, level: 'N5', pattern: '～た後で', structure: 'V-た + 後で', explanation: '表示在～之后做某事', example: '食事をした後で散歩します。', translation: '饭后散步。' },
  { id: 55, lesson: 16, level: 'N5', pattern: '～たり～たりする', structure: 'V-たり + V-たり + する', explanation: '表示列举动作，"又～又～"', example: '日曜日は本を読んだり、テレビを見たりします。', translation: '星期天看看书，看看电视。' },

  // ==================== N5: Lesson 17 (休んでもいいですか) ====================
  { id: 56, lesson: 17, level: 'N5', pattern: '～てもいいです', structure: 'V-て + もいいです', explanation: '表示许可，"可以～"', example: 'ここで写真を撮ってもいいですか。', translation: '可以在这里拍照吗？' },
  { id: 57, lesson: 17, level: 'N5', pattern: '～てはいけません', structure: 'V-て + はいけません', explanation: '表示禁止，"不可以～"', example: 'ここでタバコを吸ってはいけません。', translation: '不可以在这里抽烟。' },
  { id: 58, lesson: 17, level: 'N5', pattern: '～ないでください', structure: 'V-ない + でください', explanation: '表示请求不要做某事', example: 'ここで写真を撮らないでください。', translation: '请不要在这里拍照。' },
  { id: 59, lesson: 17, level: 'N5', pattern: '～ほうがいい', structure: 'V-た/ない + ほうがいい', explanation: '表示建议，"最好～"', example: '早く寝たほうがいいです。', translation: '最好早点睡。' },

  // ==================== N5: Lesson 18 (学生食堂は安くて美味しい) ====================
  { id: 60, lesson: 18, level: 'N5', pattern: '～て形（接続）', structure: 'A-くて/Na-で/N-で', explanation: 'て形用于连接并列的形容词、名词、形容动词', example: '安くて美味しいです。', translation: '又便宜又好吃。' },
  { id: 61, lesson: 18, level: 'N5', pattern: '～ている（状態）', structure: 'V-て + いる', explanation: '表示状态持续、正在进行', example: '窓が開いています。', translation: '窗户开着。' },
  { id: 62, lesson: 18, level: 'N5', pattern: '～ている（進行中）', structure: 'V-て + いる', explanation: '表示动作正在进行', example: '今勉強しています。', translation: '正在学习。' },
  { id: 63, lesson: 18, level: 'N5', pattern: '～てから', structure: 'V-て + から', explanation: '表示动作先后顺序，"～之后"', example: '手を洗ってから食べます。', translation: '洗手后再吃。' },

  // ==================== N5: Lesson 19 (料理を作ることができます) ====================
  { id: 64, lesson: 19, level: 'N5', pattern: 'ことができる', structure: 'V-る + ことができる', explanation: '表示能力或可能性，"能～"', example: '料理を作ることができます。', translation: '会做菜。' },
  { id: 65, lesson: 19, level: 'N5', pattern: '可能動詞', structure: 'V-可能形（え段）', explanation: '动词可能态，直接表达能力', example: '日本語が話せます。', translation: '会说日语。' },
  { id: 66, lesson: 19, level: 'N5', pattern: '～くなる', structure: 'A-く + なる', explanation: '表示客观变化，"变得～"', example: 'だんだん暖かくなります。', translation: '渐渐变暖和。' },
  { id: 67, lesson: 19, level: 'N5', pattern: '～にする', structure: 'N + に + する', explanation: '表示主观选择或决定', example: 'コーヒーにします。', translation: '我要咖啡。' },

  // ==================== N5: Lesson 20 (学校へ通うのは楽しい) ====================
  { id: 68, lesson: 20, level: 'N5', pattern: '～のは～だ', structure: 'V-る + のは + A', explanation: 'の将动词名词化做主语，表示做某事是～的', example: '学校へ通うのは楽しいです。', translation: '上学很快乐。' },
  { id: 69, lesson: 20, level: 'N5', pattern: '～のが～', structure: 'V-る + のが + 好き/上手/早い', explanation: 'の将动作名词化做对象语', example: '料理を作るのが好きです。', translation: '喜欢做菜。' },
  { id: 70, lesson: 20, level: 'N5', pattern: '～でも', structure: 'N + でも', explanation: '表示转折，"即使/但是"', example: '日曜日でも学校に行きます。', translation: '即使是星期天也去学校。' },
  { id: 71, lesson: 20, level: 'N5', pattern: '～ので', structure: 'S(普通体) + ので', explanation: '表示客观原因，"因为～所以～"', example: '雨が降っているので、出かけません。', translation: '因为下雨，所以不出门。' },
  { id: 72, lesson: 20, level: 'N5', pattern: '～から', structure: 'S(普通体) + から', explanation: '表示主观原因，"因为～"', example: '危ないから、触らないでください。', translation: '因为危险，请不要碰。' },

  // ==================== N4: Lesson 21 (京都奈良へ行くことにします) ====================
  { id: 73, lesson: 21, level: 'N4', pattern: '～ことにする', structure: 'V-る/ない + ことにする', explanation: '表示说话人主观决定，"决定～"', example: '京都へ行くことにします。', translation: '决定去京都。' },
  { id: 74, lesson: 21, level: 'N4', pattern: '～ことになる', structure: 'V-る/ない + ことになる', explanation: '表示客观决定或结果，"变成～（决定）"', example: '来月転勤することになりました。', translation: '下个月决定调职了。' },
  { id: 75, lesson: 21, level: 'N4', pattern: '～ことにしている', structure: 'V-る/ない + ことにしている', explanation: '表示习惯性决定、坚持做某事', example: '毎朝ジョギングすることにしています。', translation: '坚持每天早上跑步。' },
  { id: 76, lesson: 21, level: 'N4', pattern: '～ことになっている', structure: 'V-る/ない + ことになっている', explanation: '表示规定、预定，"规定～"', example: '学校では日本語を話すことになっています。', translation: '规定在学校要说日语。' },

  // ==================== N4: Lesson 22 (旅行の準備をしています) ====================
  { id: 77, lesson: 22, level: 'N4', pattern: '～ている（進行）', structure: 'V-て + いる', explanation: '表示动作正在进行', example: '旅行の準備をしています。', translation: '正在准备旅行。' },
  { id: 78, lesson: 22, level: 'N4', pattern: '～てある', structure: 'V-て + ある', explanation: '表示人为状态的持续（他动词て形+ある）', example: '壁に地図が貼ってあります。', translation: '墙上贴了地图。' },
  { id: 79, lesson: 22, level: 'N4', pattern: 'まだ～ていない', structure: 'まだ + V-て + いない', explanation: '表示还没～', example: 'まだ切符を買っていません。', translation: '还没买票。' },
  { id: 80, lesson: 22, level: 'N4', pattern: '～ておく', structure: 'V-て + おく', explanation: '表示事先做某事、做好准备', example: '旅行の前にホテルを予約しておきます。', translation: '旅行前先预约好酒店。' },

  // ==================== N4: Lesson 23 (鑑真について勉強したことがあります) ====================
  { id: 81, lesson: 23, level: 'N4', pattern: '～たことがある', structure: 'V-た + ことがある', explanation: '表示曾经有过的经历，"曾经～过"', example: '日本に行ったことがあります。', translation: '我去过日本。' },
  { id: 82, lesson: 23, level: 'N4', pattern: '～たことがない', structure: 'V-た + ことがない', explanation: '表示没有过的经历', example: 'まだ富士山に登ったことがありません。', translation: '还没爬过富士山。' },
  { id: 83, lesson: 23, level: 'N4', pattern: '～について', structure: 'N + について', explanation: '表示"关于～"', example: '日本の文化について勉強しています。', translation: '在学习日本的文化。' },
  { id: 84, lesson: 23, level: 'N4', pattern: '～に関する', structure: 'N + に関する + N', explanation: '表示相关，做连体修饰', example: '教育に関する本を読んでいます。', translation: '在读关于教育的书。' },

  // ==================== N4: Lesson 24 (金閣寺を見たいです) ====================
  { id: 85, lesson: 24, level: 'N4', pattern: '～たいです', structure: 'V-ます + たいです', explanation: '表示第一人称愿望', example: '金閣寺を見たいです。', translation: '想看金阁寺。' },
  { id: 86, lesson: 24, level: 'N4', pattern: '～ほしい', structure: 'N + が + ほしい', explanation: '表示想要某物', example: '新しいカメラが欲しいです。', translation: '想要新相机。' },
  { id: 87, lesson: 24, level: 'N4', pattern: '～てほしい', structure: 'V-て + ほしい', explanation: '表示希望别人做某事', example: '父に元気になってほしいです。', translation: '希望父亲好起来。' },
  { id: 88, lesson: 24, level: 'N4', pattern: 'Aそうだ（様態）', structure: 'A-そうだ', explanation: '表示样态推测，"看起来～"', example: 'そのケーキは美味しそうです。', translation: '那个蛋糕看起来很好吃。' },

  // ==================== N4: Lesson 25 (学校に通わなければなりません) ====================
  { id: 89, lesson: 25, level: 'N4', pattern: '～なければならない', structure: 'V-ない + なければならない', explanation: '表示义务，"必须～"', example: '毎日学校に通わなければなりません。', translation: '每天必须去上学。' },
  { id: 90, lesson: 25, level: 'N4', pattern: '～なくてはいけない', structure: 'V-なくて + はいけない', explanation: '表示义务、必要，口语常用', example: '宿題をしなくてはいけません。', translation: '必须做作业。' },
  { id: 91, lesson: 25, level: 'N4', pattern: '～なくてもいい', structure: 'V-なくて + もいい', explanation: '表示不必，"不用～也可以"', example: '急がなくてもいいです。', translation: '不用着急也可以。' },
  { id: 92, lesson: 25, level: 'N4', pattern: '～べきだ', structure: 'V-る + べきだ', explanation: '表示义务、理应，"应该～"', example: '約束は守るべきだ。', translation: '应该遵守约定。' },

  // ==================== N4: Lesson 26 (台風が来なければいい) ====================
  { id: 93, lesson: 26, level: 'N4', pattern: '～ば', structure: 'V-ば/ A-ければ/ Na-なら/ N-なら', explanation: '表示条件，"如果～的话"', example: '台風が来なければいいです。', translation: '台风不来就好了。' },
  { id: 94, lesson: 26, level: 'N4', pattern: '～たら', structure: 'V-た + ら', explanation: '表示条件（假设或确定发生后），"如果～"', example: '雨が降ったら、試合は中止です。', translation: '如果下雨，比赛就取消。' },
  { id: 95, lesson: 26, level: 'N4', pattern: '～と', structure: 'V-る/N-だ + と', explanation: '表示恒常条件或自然结果，"一～就～"', example: '春になると、桜が咲きます。', translation: '一到春天，樱花就开了。' },
  { id: 96, lesson: 26, level: 'N4', pattern: '～なら', structure: 'N + なら / V + なら', explanation: '表示假定前提，"如果～的话/要说～"', example: '日本語なら、少し話せます。', translation: '要说日语的话，我会说一点。' },

  // ==================== N4: Lesson 27 (学校へ来なくてもいい) ====================
  { id: 97, lesson: 27, level: 'N4', pattern: '～なくてもいい', structure: 'V-なくて + もいい', explanation: '表示不必做某事，许可不做', example: '明日学校へ来なくてもいいです。', translation: '明天不来学校也可以。' },
  { id: 98, lesson: 27, level: 'N4', pattern: '～てもかまわない', structure: 'V-て + もかまわない', explanation: '表示许可、不介意，"也可以"', example: 'ここに座ってもかまいませんか。', translation: '坐这里也可以吗？' },
  { id: 99, lesson: 27, level: 'N4', pattern: '～命令形', structure: 'V-命令形', explanation: '动词命令形，用于强硬命令', example: '早くしろ！', translation: '快一点！' },
  { id: 100, lesson: 27, level: 'N4', pattern: '～禁止形', structure: 'V-る + な', explanation: '表示禁止，"不准～"', example: 'ここに入るな。', translation: '不准进来。' },

  // ==================== N4: Lesson 28 (テストには遅刻しないように) ====================
  { id: 101, lesson: 28, level: 'N4', pattern: '～ように', structure: 'V-る/ない + ように', explanation: '表示目的（状态性动词）、劝告或祈愿', example: 'テストに遅刻しないようにしてください。', translation: '考试请不要迟到。' },
  { id: 102, lesson: 28, level: 'N4', pattern: '～ために', structure: 'V-る + ため(に)/N + のため(に)', explanation: '表示目的，意志动词用ために', example: '日本語を勉強するために、日本に来ました。', translation: '为了学日语来了日本。' },
  { id: 103, lesson: 28, level: 'N4', pattern: '～のに', structure: 'V-る/ N-な + のに', explanation: '表示用途或逆接,"用于～"或"明明～却～"', example: 'この辞書は日本語を勉強するのに便利です。', translation: '这本词典对学日语很方便。' },
  { id: 104, lesson: 28, level: 'N4', pattern: '～ようになる', structure: 'V-る + ようになる', explanation: '表示变化（能力或习惯的获得），"变得能～"', example: '日本語が話せるようになりました。', translation: '变得会说日语了。' },

  // ==================== N4: Lesson 29 (紅葉が見られます) ====================
  { id: 105, lesson: 29, level: 'N4', pattern: '～られる（受身/可能/自発）', structure: 'V-られる', explanation: 'れる/られる表示被动、可能、尊敬或自发', example: '紅葉が見られます。', translation: '能看到红叶。' },
  { id: 106, lesson: 29, level: 'N4', pattern: '～見える/聞こえる', structure: 'N + が + 見える/聞こえる', explanation: '見える表示自然映入眼帘，聞こえる表示自然传入耳朵', example: '窓から富士山が見えます。', translation: '从窗户能看到富士山。' },
  { id: 107, lesson: 29, level: 'N4', pattern: '～にくい/やすい', structure: 'V-ます + にくい/やすい', explanation: '表示难易，"难～/容易～"', example: 'このペンは書きやすいです。', translation: '这支笔好写。' },
  { id: 108, lesson: 29, level: 'N4', pattern: '～始める/終わる', structure: 'V-ます + 始める/終わる', explanation: '复合动词，表示开始～/结束～', example: '雨が降り始めました。', translation: '开始下雨了。' },

  // ==================== N4: Lesson 30 (母に手紙を書こうと思います) ====================
  { id: 109, lesson: 30, level: 'N4', pattern: '～う/ようと思う', structure: 'V-意向形 + と思う', explanation: '表示说话人的意向、打算', example: '母に手紙を書こうと思います。', translation: '想给妈妈写信。' },
  { id: 110, lesson: 30, level: 'N4', pattern: '～つもりだ', structure: 'V-る/ない + つもりだ', explanation: '表示强烈的打算', example: '来年留学するつもりです。', translation: '打算明年留学。' },
  { id: 111, lesson: 30, level: 'N4', pattern: '～予定だ', structure: 'V-る + 予定だ', explanation: '表示预定好的计划', example: '明日出発する予定です。', translation: '预定明天出发。' },
  { id: 112, lesson: 30, level: 'N4', pattern: '～かもしれない', structure: 'V/N/Na/A-普通体 + かもしれない', explanation: '表示可能、推测，"也许～"', example: '明日は雨が降るかもしれません。', translation: '明天也许下雨。' },

  // ==================== N4: Lesson 31 (敬語を使いましょう) ====================
  { id: 113, lesson: 31, level: 'N4', pattern: 'お～になる（尊敬語）', structure: 'お/ご + V-ます + になる', explanation: '尊敬语形式，表示对动作主体的敬意', example: '社長はお帰りになりました。', translation: '社长回去了。' },
  { id: 114, lesson: 31, level: 'N4', pattern: 'お～する（謙譲語）', structure: 'お/ご + V-ます + する', explanation: '谦让语形式，通过降低自己来抬高对方', example: 'お荷物をお持ちします。', translation: '我来拿您的行李。' },
  { id: 115, lesson: 31, level: 'N4', pattern: '～られる（尊敬語）', structure: 'V-られる', explanation: '用被动形式表示尊敬', example: '先生はもう帰られました。', translation: '老师已经回去了。' },
  { id: 116, lesson: 31, level: 'N4', pattern: 'ていねい語', structure: 'です/ます体', explanation: 'です・ます的礼貌文体，最基本的敬语形式', example: '本日はお忙しいところ、ありがとうございます。', translation: '今天百忙之中，非常感谢。' },

  // ==================== N4: Lesson 32 (勉強すればするほど難しくなる) ====================
  { id: 117, lesson: 32, level: 'N4', pattern: '～ば～ほど', structure: 'V-ば + V-る + ほど / A-ければ + A-い + ほど', explanation: '表示"越～越～"', example: '勉強すればするほど難しくなります。', translation: '越学越难。' },
  { id: 118, lesson: 32, level: 'N4', pattern: '～ても', structure: 'V-て + も', explanation: '表示逆接条件，"即使～也～"', example: '忙しくても、毎日運動します。', translation: '即使忙，也每天运动。' },
  { id: 119, lesson: 32, level: 'N4', pattern: 'いくら～ても', structure: 'いくら + V-て + も', explanation: '表示"无论怎么～也～"', example: 'いくら考えてもわからない。', translation: '怎么想也不明白。' },
  { id: 120, lesson: 32, level: 'N4', pattern: '～はずだ', structure: 'S(普通体) + はずだ', explanation: '表示基于客观根据的推测，"应该～"', example: '彼はもう着いたはずです。', translation: '他应该已经到了。' },

  // ==================== N4: Lesson 33 (日本語能力試験に合格するために) ====================
  { id: 121, lesson: 33, level: 'N4', pattern: '～ために（目的）', structure: 'V-る + ために / N + のために', explanation: '表示目的，意志性动作用ために', example: '試験に合格するために、毎日勉強しています。', translation: '为了通过考试，每天都在学习。' },
  { id: 122, lesson: 33, level: 'N4', pattern: '～ように（目的）', structure: 'V-る/ない + ように', explanation: '表示目的，多用于无意志动词或可能态', example: '忘れないようにメモしました。', translation: '为了不忘记，记了笔记。' },
  { id: 123, lesson: 33, level: 'N4', pattern: '～ために（原因）', structure: 'N + の + ために / V-た + ために', explanation: '表示原因，多为消极结果', example: '台風のために、飛行機が欠航しました。', translation: '因为台风，航班取消了。' },
  { id: 124, lesson: 33, level: 'N4', pattern: '～みたいだ', structure: 'N/V/A + みたいだ', explanation: '比喻或推测（口语），"像～"', example: '彼は子供みたいです。', translation: '他像小孩子一样。' },

  // ==================== N4: Lesson 34 (クリスマスと元旦) ====================
  { id: 125, lesson: 34, level: 'N4', pattern: '～そうだ（伝聞）', structure: 'S(普通体) + そうだ', explanation: '表示传闻，"听说～"', example: '明日は雪が降るそうです。', translation: '听说明天会下雪。' },
  { id: 126, lesson: 34, level: 'N4', pattern: '～ようだ', structure: 'N + の/V/A + ようだ', explanation: '表示比喻、推测或举例', example: '彼はまるで天使のようだ。', translation: '他简直像天使一样。' },
  { id: 127, lesson: 34, level: 'N4', pattern: '～らしい', structure: 'N/V/A + らしい', explanation: '表示典型特征或传闻推测', example: '彼は日本人らしいです。', translation: '他很有日本人样（传闻他是日本人）。' },
  { id: 128, lesson: 34, level: 'N4', pattern: '～かどうか', structure: 'S(普通体) + かどうか', explanation: '表示"是否～"', example: '彼が来るかどうかわかりません。', translation: '不知道他是否来。' },

  // ==================== N4: Lesson 35 (紅白歌合戦) ====================
  { id: 129, lesson: 35, level: 'N4', pattern: '～ところだ', structure: 'V-るところだ/V-ているところだ/V-たところだ', explanation: '表示动作的阶段，"正要～/正在～/刚～"', example: '今から出かけるところです。', translation: '正要出门。' },
  { id: 130, lesson: 35, level: 'N4', pattern: '～ばかりだ', structure: 'V-た + ばかりだ', explanation: '表示动作刚发生不久', example: 'さっき昼ご飯を食べたばかりです。', translation: '刚刚吃过午饭。' },
  { id: 131, lesson: 35, level: 'N4', pattern: '～まま', structure: 'V-た/N-の + まま', explanation: '表示保持某种状态不变', example: '電気をつけたまま寝てしまいました。', translation: '开着灯就睡着了。' },
  { id: 132, lesson: 35, level: 'N4', pattern: '～ような気がする', structure: 'V-た/N-の + ような気がする', explanation: '表示模糊的直觉，"感觉好像～"', example: 'どこかで彼に会ったような気がします。', translation: '感觉好像在哪里见过他。' },

  // ==================== N4: Lesson 36 (初詣はお祭りのようです) ====================
  { id: 133, lesson: 36, level: 'N4', pattern: '～のようだ', structure: 'N + の + ようだ', explanation: '表示比喻、"像～一样"', example: '初詣はお祭りのようです。', translation: '新年参拜像节日一样。' },
  { id: 134, lesson: 36, level: 'N4', pattern: '～みたいだ', structure: 'N/V/A + みたいだ', explanation: '口语比喻形式', example: 'あの人は映画スターみたいです。', translation: '那个人像电影明星一样。' },
  { id: 135, lesson: 36, level: 'N4', pattern: 'まるで～ようだ', structure: 'まるで + N + の + ようだ', explanation: '强调比喻，"简直像～"', example: 'まるで夢のようです。', translation: '简直像做梦一样。' },

  // ==================== N4: Lesson 37 (成人式) ====================
  { id: 136, lesson: 37, level: 'N4', pattern: '～ところを', structure: 'V-ている + ところを', explanation: '表示在～时候（打扰/被看到）', example: 'こっそりお菓子を食べているところを見られました。', translation: '偷吃点心的时候被看到了。' },
  { id: 137, lesson: 37, level: 'N4', pattern: '～ばかり', structure: 'N + ばかり / V-てばかり', explanation: '表示"净是～、光～"（消极）', example: '彼は遊んでばかりいます。', translation: '他总是光玩。' },
  { id: 138, lesson: 37, level: 'N4', pattern: '～になる', structure: 'N + に + なる', explanation: '表示客观变化,"成为～"', example: '来年二十歳になります。', translation: '明年就二十岁了。' },

  // ==================== N4: Lesson 38 (節分) ====================
  { id: 139, lesson: 38, level: 'N4', pattern: '～に関して', structure: 'N + に関して', explanation: '表示"关于～"（正式）', example: '節分に関して調べています。', translation: '在调查关于节分的事。' },
  { id: 140, lesson: 38, level: 'N4', pattern: '～にとって', structure: 'N + にとって', explanation: '表示"对～来说"', example: '私にとって、家族が一番大切です。', translation: '对我来说，家人最重要。' },
  { id: 141, lesson: 38, level: 'N4', pattern: '～によって', structure: 'N + によって', explanation: '表示手段、原因或根据，"通过～/因～而异"', example: '人によって考え方が違います。', translation: '因人而异，想法不同。' },

  // ==================== N3: Lesson 39 (春休みは復習しよう) ====================
  { id: 142, lesson: 39, level: 'N3', pattern: '～じゃありませんか', structure: 'V-る/N + じゃありませんか', explanation: '表示反问或委婉的劝诱，"不是～吗？"', example: '一緒に復習しようじゃありませんか。', translation: '一起复习吧。' },
  { id: 143, lesson: 39, level: 'N3', pattern: '～ないか', structure: 'V-ない + か', explanation: '表示劝诱或反问，"不～吗？"', example: 'そろそろ出かけないか。', translation: '差不多该出门了吧。' },
  { id: 144, lesson: 39, level: 'N3', pattern: '～てみる', structure: 'V-て + みる', explanation: '表示尝试做某事', example: 'この問題を解いてみましょう。', translation: '试试解这个题吧。' },
  { id: 145, lesson: 39, level: 'N3', pattern: '～ことだ', structure: 'V-る + ことだ', explanation: '表示劝告，强调重要，"应该～"', example: '毎日少しずつ復習することです。', translation: '每天一点一点地复习很重要。' },

  // ==================== N3: Lesson 40 (桜の花が咲くまで待つ) ====================
  { id: 146, lesson: 40, level: 'N3', pattern: '～まで', structure: 'V-る + まで', explanation: '表示时间终点，"直到～"', example: '桜の花が咲くまで待ちます。', translation: '一直等到樱花开放。' },
  { id: 147, lesson: 40, level: 'N3', pattern: '～までに', structure: 'V-る/N + までに', explanation: '表示期限，"在～之前完成"', example: '金曜日までにレポートを出してください。', translation: '请在周五前提交报告。' },
  { id: 148, lesson: 40, level: 'N3', pattern: '～間', structure: 'V-る/N-の + 間', explanation: '表示在一段时间内一直做某事', example: '夏休みの間、アルバイトをしていました。', translation: '暑假期间一直在打工。' },
  { id: 149, lesson: 40, level: 'N3', pattern: '～間に', structure: 'V-る/N-の + 間に', explanation: '表示在某个时间段内完成某事', example: '子供が寝ている間に掃除しました。', translation: '在小孩睡觉的时候打扫了。' },

  // ==================== N3: Lesson 41 (田中先生の下で勉強) ====================
  { id: 150, lesson: 41, level: 'N3', pattern: '～の下で', structure: 'N + の + 下で', explanation: '表示"在～指导下/在～影响下"', example: '田中先生の下で日本語を勉強しています。', translation: '在田中老师的指导下学习日语。' },
  { id: 151, lesson: 41, level: 'N3', pattern: '～に従って', structure: 'N + に従って / V-る + に従って', explanation: '表示"随着～/按照～"', example: '指示に従って作業してください。', translation: '请按照指示操作。' },
  { id: 152, lesson: 41, level: 'N3', pattern: '～に伴って', structure: 'N + に伴って / V-る + に伴って', explanation: '表示伴随变化', example: '経済の発展に伴って、生活が変わりました。', translation: '随着经济发展，生活改变了。' },

  // ==================== N3: Lesson 42 (狭いながらも楽しい我が家) ====================
  { id: 153, lesson: 42, level: 'N3', pattern: '～ながら（同時）', structure: 'V-ます + ながら', explanation: '表示一边～一边～', example: '音楽を聴きながら勉強します。', translation: '一边听音乐一边学习。' },
  { id: 154, lesson: 42, level: 'N3', pattern: '～ながらも', structure: 'N/A-い + ながらも', explanation: '表示逆接，"虽然～但是～"', example: '狭いながらも楽しい我が家です。', translation: '虽然小但是快乐的家。' },
  { id: 155, lesson: 42, level: 'N3', pattern: '～つつ', structure: 'V-ます + つつ', explanation: '书面语，表示同时进行或逆接', example: '悪いと知りつつ、嘘をついてしまった。', translation: '虽然知道不好，但还是说了谎。' },
  { id: 156, lesson: 42, level: 'N3', pattern: '～つつある', structure: 'V-ます + つつある', explanation: '表示变化正在进行', example: '地球温暖化が進みつつあります。', translation: '全球变暖正在加剧。' },

  // ==================== N3: Lesson 43 (ゴミ出しルール) ====================
  { id: 157, lesson: 43, level: 'N3', pattern: '～こと', structure: 'V-る + こと', explanation: '将动词名词化，做主语或宾语', example: 'ゴミを分別することは大切です。', translation: '垃圾分类很重要。' },
  { id: 158, lesson: 43, level: 'N3', pattern: '～わけだ', structure: 'S(普通体) + わけだ', explanation: '表示理所当然的结论或原因，"当然/所以"', example: '日本に10年も住んでいるから、日本語が上手なわけだ。', translation: '在日本住了十年，所以日语当然好。' },
  { id: 159, lesson: 43, level: 'N3', pattern: '～わけではない', structure: 'S(普通体) + わけではない', explanation: '表示否定推论，"并不是～"', example: '日本人だからといって、寿司が好きなわけではない。', translation: '并不是因为是日本人就喜欢寿司。' },
  { id: 160, lesson: 43, level: 'N3', pattern: '～なければいけない', structure: 'V-なければ + いけない', explanation: '表示必须、必要', example: 'ゴミは分別しなければいけません。', translation: '垃圾必须要分类。' },

  // ==================== N3: Lesson 44 (東京六大学野球) ====================
  { id: 161, lesson: 44, level: 'N3', pattern: '～うちに', structure: 'V-る/ている/N-の + うちに', explanation: '表示趁着～做某事', example: '若いうちにいろいろ経験したいです。', translation: '想趁年轻多经历一些。' },
  { id: 162, lesson: 44, level: 'N3', pattern: '～際に', structure: 'N-の/V-る + 際に', explanation: '正式场合表示"在～时候"', example: 'お帰りの際にお気をつけてください。', translation: '回去的时候请注意。' },
  { id: 163, lesson: 44, level: 'N3', pattern: '～において', structure: 'N + において', explanation: '表示"在～（场所/方面）"', example: '日本において野球は人気があります。', translation: '在日本，棒球很有人气。' },
  { id: 164, lesson: 44, level: 'N3', pattern: '～にわたって', structure: 'N + にわたって', explanation: '表示时间或范围的跨度，"长达～"', example: '長年にわたって研究を続けています。', translation: '长年持续研究。' },

  // ==================== N3: Lesson 45 (仕事の最中に) ====================
  { id: 165, lesson: 45, level: 'N3', pattern: '～最中に', structure: 'N-の/V-ている + 最中に', explanation: '表示正在做某事的时候，"正在～中"', example: '仕事の最中に電話がかかってきました。', translation: '工作中电话打来了。' },
  { id: 166, lesson: 45, level: 'N3', pattern: '～途中で', structure: 'N-の/V-る + 途中で', explanation: '表示在～的途中', example: '学校に行く途中で友達に会いました。', translation: '去学校的路上碰到了朋友。' },
  { id: 167, lesson: 45, level: 'N3', pattern: '～たびに', structure: 'V-る/N-の + たびに', explanation: '表示"每次～都～"', example: 'この写真を見るたびに故郷を思い出します。', translation: '每次看这张照片都会想起故乡。' },

  // ==================== N3: Lesson 46 (上手く作れました) ====================
  { id: 168, lesson: 46, level: 'N3', pattern: '～れる/られる（可能）', structure: 'V-可能形', explanation: '动词可能态，表示能力或可能性', example: '寿司が上手く作れました。', translation: '寿司做得很好。' },
  { id: 169, lesson: 46, level: 'N3', pattern: '～れる/られる（受身）', structure: 'V-受身形', explanation: '被动语态', example: '先生に褒められました。', translation: '被老师表扬了。' },
  { id: 170, lesson: 46, level: 'N3', pattern: '～せる/させる（使役）', structure: 'V-使役形', explanation: '使役态，让～做～', example: '子供に野菜を食べさせます。', translation: '让孩子吃蔬菜。' },
  { id: 171, lesson: 46, level: 'N3', pattern: '～せられる/させられる（使役受身）', structure: 'V-使役受身形', explanation: '使役被动，"被迫做～"', example: '嫌いな料理を食べさせられました。', translation: '被迫吃了讨厌的菜。' },

  // ==================== N3: Lesson 47 (出費がちで旅行どころではない) ====================
  { id: 172, lesson: 47, level: 'N3', pattern: '～がち', structure: 'V-ます/N + がち', explanation: '表示倾向、容易，"容易～/往往～"', example: '最近忘れがちです。', translation: '最近总是容易忘事。' },
  { id: 173, lesson: 47, level: 'N3', pattern: '～っぽい', structure: 'V-ます/N/A + っぽい', explanation: '表示带有某种倾向或感觉，"容易～/有点～"', example: '彼は怒りっぽいです。', translation: '他容易生气。' },
  { id: 174, lesson: 47, level: 'N3', pattern: '～どころではない', structure: 'V-る/N + どころではない', explanation: '表示不是做某事的时候、情况', example: '忙しくて旅行どころではありません。', translation: '忙得不是旅行的时候。' },

  // ==================== N3: Lesson 48 (日中書道展を契機に) ====================
  { id: 175, lesson: 48, level: 'N3', pattern: '～を契機に', structure: 'N + を契機に', explanation: '表示以～为契机', example: '書道展を契機に文化交流が始まりました。', translation: '以书法展为契机开始了文化交流。' },
  { id: 176, lesson: 48, level: 'N3', pattern: '～をきっかけに', structure: 'N + をきっかけに', explanation: '以～为开端/契机（口语化）', example: '留学をきっかけに日本語に興味を持ちました。', translation: '以留学为契机对日语产生了兴趣。' },
  { id: 177, lesson: 48, level: 'N3', pattern: '～を通じて', structure: 'N + を通じて', explanation: '表示"通过～"', example: 'SNSを通じて情報を集めています。', translation: '通过社交媒体收集信息。' },
  { id: 178, lesson: 48, level: 'N3', pattern: '～に応じて', structure: 'N + に応じて', explanation: '表示"根据～、按照～"', example: 'レベルに応じてクラスを選びます。', translation: '根据水平选择班级。' },

  // ==================== N3: Lesson 49 (沢山の動物がいました) ====================
  { id: 179, lesson: 49, level: 'N3', pattern: '～てもらう', structure: 'V-て + もらう', explanation: '得到别人为自己做某事', example: '友達に写真を撮ってもらいました。', translation: '让朋友帮我拍了照片。' },
  { id: 180, lesson: 49, level: 'N3', pattern: '～てくれる', structure: 'V-て + くれる', explanation: '别人（好意）为我做某事', example: '母が弁当を作ってくれました。', translation: '妈妈给我做了便当。' },
  { id: 181, lesson: 49, level: 'N3', pattern: '～てあげる', structure: 'V-て + あげる', explanation: '为别人做某事', example: '友達に日本語を教えてあげました。', translation: '教了朋友日语。' },
  { id: 182, lesson: 49, level: 'N3', pattern: '～ていただく', structure: 'V-て + いただく', explanation: 'もらう的谦让语形式', example: '先生に推薦状を書いていただきました。', translation: '请老师帮我写了推荐信。' },

  // ==================== N3: Lesson 50 (ご馳走になっています) ====================
  { id: 183, lesson: 50, level: 'N3', pattern: '～させていただく', structure: 'V-させて + いただく', explanation: '谦让语，请求允许做某事，"请让我～"', example: 'では、発表させていただきます。', translation: '那么，请允许我发表。' },
  { id: 184, lesson: 50, level: 'N3', pattern: 'お～いただく', structure: 'お/ご + V-ます + いただく', explanation: '谦让语，表示请对方做某事', example: 'お越しいただき、ありがとうございます。', translation: '感谢您的光临。' },
  { id: 185, lesson: 50, level: 'N3', pattern: '～てくださる', structure: 'V-て + くださる', explanation: 'くれる的尊敬语形式', example: '先生がアドバイスをくださいました。', translation: '老师给了我建议。' },

  // ==================== N3: Lesson 51 (留学した上は頑張る) ====================
  { id: 186, lesson: 51, level: 'N3', pattern: '～上に', structure: 'V-る/A-い/Na-な + 上に', explanation: '表示叠加，"不仅～而且～"', example: '彼は頭がいい上に、努力家です。', translation: '他不仅聪明，还很努力。' },
  { id: 187, lesson: 51, level: 'N3', pattern: '～上は', structure: 'V-る/た + 上は', explanation: '表示"既然～就～"', example: '留学した上は、しっかり勉強します。', translation: '既然留学了，就要好好学习。' },
  { id: 188, lesson: 51, level: 'N3', pattern: '～上で', structure: 'N-の/V-た + 上で', explanation: '表示"在～之后/在～方面"', example: 'よく考えた上で決めてください。', translation: '请仔细考虑之后再决定。' },

  // ==================== N3: Lesson 52 (湿っぽい日が続く) ====================
  { id: 189, lesson: 52, level: 'N3', pattern: '～っぽい', structure: 'N/V-ます + っぽい', explanation: '表示带有某种倾向的特征', example: '今日は湿っぽいですね。', translation: '今天很潮湿呢。' },
  { id: 190, lesson: 52, level: 'N3', pattern: '～気味', structure: 'N/V-ます + 気味', explanation: '表示稍微带有某种倾向', example: '最近疲れ気味です。', translation: '最近有点累。' },
  { id: 191, lesson: 52, level: 'N3', pattern: '～げ', structure: 'A-い/Na + げ', explanation: '表示"～的样子、神情"', example: '彼女は寂しげな顔をしています。', translation: '她露出寂寞的神情。' },

  // ==================== N3: Lesson 53 (語彙を増やさないことには) ====================
  { id: 192, lesson: 53, level: 'N3', pattern: '～ないことには', structure: 'V-ない + ことには', explanation: '表示"如果不～就不行"', example: '語彙を増やさないことには、会話が上手になりません。', translation: '不增加词汇量的话，会话就不会变好。' },
  { id: 193, lesson: 53, level: 'N3', pattern: '～ないと', structure: 'V-ない + と', explanation: '口语表示必须、如果不～就～', example: '早く行かないと間に合わないよ。', translation: '不快点去就来不及了。' },
  { id: 194, lesson: 53, level: 'N3', pattern: '～なくては', structure: 'V-なくて + は', explanation: '表示必须（口语省略形）', example: 'もっと勉強しなくては。', translation: '必须再努力学习了。' },

  // ==================== N3: Lesson 54 (七夕) ====================
  { id: 195, lesson: 54, level: 'N3', pattern: '～に関して', structure: 'N + に関して', explanation: '表示"关于～"', example: '七夕に関して調べています。', translation: '在调查关于七夕的事。' },
  { id: 196, lesson: 54, level: 'N3', pattern: '～に対して', structure: 'N + に対して', explanation: '表示"对于～、针对～"', example: '日本の文化に対して興味があります。', translation: '对日本文化有兴趣。' },
  { id: 197, lesson: 54, level: 'N3', pattern: '～に基づいて', structure: 'N + に基づいて', explanation: '表示"基于～、根据～"', example: '事実に基づいて話してください。', translation: '请基于事实说话。' },

  // ==================== N3: Lesson 55 (お盆の計画) ====================
  { id: 198, lesson: 55, level: 'N3', pattern: '～代わりに', structure: 'N-の/V-る + 代わりに', explanation: '表示替代或交换,"代替～"或"不～而～"', example: '母の代わりに料理を作ります。', translation: '代替妈妈做饭。' },
  { id: 199, lesson: 55, level: 'N3', pattern: '～に違いない', structure: 'S(普通体) + に違いない', explanation: '表示确信的推测，"一定～"', example: '彼はきっと成功するに違いありません。', translation: '他一定会成功。' },
  { id: 200, lesson: 55, level: 'N3', pattern: '～に比べて', structure: 'N + に比べて', explanation: '表示"与～相比"', example: '去年に比べて、今年は暑いです。', translation: '与去年相比，今年更热。' },

  // ==================== N3: Lesson 56 (アルバイトをしています) ====================
  { id: 201, lesson: 56, level: 'N3', pattern: '～まま', structure: 'V-た/N-の + まま', explanation: '保持原样、～的状态一直', example: 'エアコンをつけたまま出かけてしまいました。', translation: '开着空调就出门了。' },
  { id: 202, lesson: 56, level: 'N3', pattern: '敬語（バイト会話）', structure: 'いらっしゃいませ/かしこまりました', explanation: '服务行业的敬语表达', example: 'かしこまりました。少々お待ちください。', translation: '好的，请稍等。' },
  { id: 203, lesson: 56, level: 'N3', pattern: '～続ける', structure: 'V-ます + 続ける', explanation: '表示持续做某事', example: 'アルバイトを続けるつもりです。', translation: '打算继续打工。' },

  // ==================== N2: Lesson 57 (敬語の徹底練習) ====================
  { id: 204, lesson: 57, level: 'N2', pattern: 'いらっしゃる（尊敬語）', structure: 'N + でいらっしゃる / V-ていらっしゃる', explanation: 'いる・行く・来る的尊敬语', example: '社長はいらっしゃいますか。', translation: '社长在吗？' },
  { id: 205, lesson: 57, level: 'N2', pattern: '申す（謙譲語）', structure: '～と申します / N + でございます', explanation: '言う的谦让语，非常正式', example: '私は田中と申します。', translation: '我叫田中。' },
  { id: 206, lesson: 57, level: 'N2', pattern: 'おる（謙譲語）', structure: '～ております', explanation: 'いる的谦让语', example: 'ただいま外出しております。', translation: '现在外出了。' },

  // ==================== N2: Lesson 58 (ビジネス日本語入門) ====================
  { id: 207, lesson: 58, level: 'N2', pattern: '～一方だ', structure: 'V-る + 一方だ', explanation: '表示事态向一个方向不断发展,"越来越～"', example: '地球の気温は上がる一方です。', translation: '地球气温不断上升。' },
  { id: 208, lesson: 58, level: 'N2', pattern: '～限り', structure: 'V-る/N-の + 限り', explanation: '表示极限或条件范围，"只要～就～"', example: '私が知っている限り、彼は無実です。', translation: '就我所知，他是无辜的。' },
  { id: 209, lesson: 58, level: 'N2', pattern: '～かねる', structure: 'V-ます + かねる', explanation: '委婉否定，"难以～/不能～"', example: 'その件についてはお答えしかねます。', translation: '关于那件事难以回答。' },

  // ==================== N2: Lesson 59 (新聞記事を読む) ====================
  { id: 210, lesson: 59, level: 'N2', pattern: '～からして', structure: 'N + からして', explanation: '表示"从～来看"（举典型例子）', example: 'この空模様からして、雨が降りそうです。', translation: '从天空的样子来看，好像要下雨。' },
  { id: 211, lesson: 59, level: 'N2', pattern: '～から言うと', structure: 'N + から言うと', explanation: '表示"从～来说、从～角度"', example: '経済の面から言うと、状況は悪化しています。', translation: '从经济方面来说，情况在恶化。' },
  { id: 212, lesson: 59, level: 'N2', pattern: '～から見ると', structure: 'N + から見ると', explanation: '表示从某立场/角度判断', example: '学生から見ると、先生は厳しすぎます。', translation: '从学生角度来看，老师太严格了。' },

  // ==================== N2: Lesson 60 (ディベートをしよう) ====================
  { id: 213, lesson: 60, level: 'N2', pattern: '～に対して', structure: 'N + に対して', explanation: '表示对象或对比', example: '彼の意見に対して反論します。', translation: '针对他的意见进行反驳。' },
  { id: 214, lesson: 60, level: 'N2', pattern: '～に反して', structure: 'N + に反して', explanation: '表示"与～相反"', example: '予想に反して、結果は良かったです。', translation: '与预想相反，结果很好。' },
  { id: 215, lesson: 60, level: 'N2', pattern: '～にしても', structure: 'N/V/A + にしても', explanation: '表示让步，"即使～"', example: '賛成するにしても、十分な議論が必要です。', translation: '即使赞成，也需要充分讨论。' },

  // ==================== N2: Lesson 61 (日本の歴史) ====================
  { id: 216, lesson: 61, level: 'N2', pattern: '～につれて', structure: 'V-る/N + につれて', explanation: '表示"随着～"', example: '時間が経つにつれて、記憶が薄れていきました。', translation: '随着时间的流逝，记忆逐渐模糊了。' },
  { id: 217, lesson: 61, level: 'N2', pattern: '～にしたがって', structure: 'V-る/N + にしたがって', explanation: '表示"随着～/按照～"', example: '歴史の研究が進むにしたがって、新事実が明らかになりました。', translation: '随着历史研究的推进，新事实被揭示了。' },
  { id: 218, lesson: 61, level: 'N2', pattern: '～にほかならない', structure: 'N + にほかならない', explanation: '表示"正是～、不外乎～"', example: '成功の秘訣は努力にほかならない。', translation: '成功的秘诀不外乎努力。' },

  // ==================== N2: Lesson 62 (環境問題について) ====================
  { id: 219, lesson: 62, level: 'N2', pattern: '～をめぐって', structure: 'N + をめぐって', explanation: '表示围绕某个问题（讨论、争论等）', example: '環境問題をめぐって議論が続いています。', translation: '围绕环境问题的讨论仍在继续。' },
  { id: 220, lesson: 62, level: 'N2', pattern: '～をもとに', structure: 'N + をもとに', explanation: '表示"以～为基础"', example: 'データをもとに分析を行います。', translation: '基于数据进行分析。' },
  { id: 221, lesson: 62, level: 'N2', pattern: '～に基づいて', structure: 'N + に基づいて', explanation: '表示"基于～"', example: '法律に基づいて判断されました。', translation: '基于法律做出了判断。' },

  // ==================== N2: Lesson 63 (テクノロジーと社会) ====================
  { id: 222, lesson: 63, level: 'N2', pattern: '～において', structure: 'N + において', explanation: '表示"在～（场所、场合、方面）"正式', example: '現代社会においてIT技術は不可欠です。', translation: '在现代社会，IT技术不可或缺。' },
  { id: 223, lesson: 63, level: 'N2', pattern: '～によって', structure: 'N + によって', explanation: '表示原因、手段、被动动作主体', example: 'AIによって仕事が大きく変わります。', translation: '因AI工作方式发生了巨大改变。' },
  { id: 224, lesson: 63, level: 'N2', pattern: '～にしたがい', structure: 'N/V-る + にしたがい', explanation: '表示"依照、随着"', example: '技術革新にしたがい、生活が便利になっています。', translation: '随着技术创新，生活变得更便利了。' },

  // ==================== N2: Lesson 64 (文学を読む) ====================
  { id: 225, lesson: 64, level: 'N2', pattern: '～にしては', structure: 'N/V/A + にしては', explanation: '表示"作为～来说、以～标准来看"（意外）', example: '外国人にしては、日本語がとても上手です。', translation: '作为外国人来说，日语非常好。' },
  { id: 226, lesson: 64, level: 'N2', pattern: '～わりには', structure: 'N-の/V/A + わりには', explanation: '表示"与～相比"（出入意料）', example: '値段のわりには、美味しいです。', translation: '与价格相比，很好吃。' },
  { id: 227, lesson: 64, level: 'N2', pattern: '～抜きで', structure: 'N + 抜きで', explanation: '表示"除去～、没有～"', example: '文法抜きでは会話は難しいです。', translation: '没有语法的话会话很难。' },

  // ==================== N2: Lesson 65 (スピーチの練習) ====================
  { id: 228, lesson: 65, level: 'N2', pattern: '～次第', structure: 'V-ます + 次第', explanation: '表示"一～就立刻～"', example: '分かり次第、ご連絡いたします。', translation: '一知道就立刻联系您。' },
  { id: 229, lesson: 65, level: 'N2', pattern: '～とたん', structure: 'V-た + とたん(に)', explanation: '表示"刚一～就～"（往往有意外性）', example: '家を出たとたん、雨が降り始めました。', translation: '刚一出门就开始下雨了。' },
  { id: 230, lesson: 65, level: 'N2', pattern: '～かと思うと', structure: 'V-た + かと思うと', explanation: '表示"刚～就～"（前后变化快）', example: '泣いたかと思うと、もう笑っています。', translation: '刚哭，就已经笑了。' },

  // ==================== N2: Lesson 66 (面接対策) ====================
  { id: 231, lesson: 66, level: 'N2', pattern: '～にかかわらず', structure: 'N + にかかわらず', explanation: '表示"不管～、无论～"', example: '年齢にかかわらず、応募できます。', translation: '不管年龄大小都可以申请。' },
  { id: 232, lesson: 66, level: 'N2', pattern: '～にもかかわらず', structure: 'N/V/A + にもかかわらず', explanation: '表示"尽管～却～"（逆接）', example: '雨にもかかわらず、多くの人が集まりました。', translation: '尽管下雨，还是来了很多人。' },
  { id: 233, lesson: 66, level: 'N2', pattern: '～ざるを得ない', structure: 'V-ない(せざる) + ざるを得ない', explanation: '表示"不得不～"', example: 'この状況では、延期せざるを得ません。', translation: '在这种状况下不得不延期。' },

  // ==================== N1: Lesson 67 (社説を読む) ====================
  { id: 234, lesson: 67, level: 'N1', pattern: '～あっての', structure: 'N1 + あっての + N2', explanation: '表示"有～才有～"', example: 'お客様あっての商売です。', translation: '有顾客才有生意。' },
  { id: 235, lesson: 67, level: 'N1', pattern: '～いかんだ', structure: 'N + いかんだ', explanation: '表示"取决于～"', example: '成功は努力いかんです。', translation: '成功取决于努力。' },
  { id: 236, lesson: 67, level: 'N1', pattern: '～をおいて', structure: 'N + をおいて', explanation: '表示"除～之外没有"', example: '彼をおいて適任者はいない。', translation: '除他之外没有合适人选。' },

  // ==================== N1: Lesson 68 (学術論文の読解) ====================
  { id: 237, lesson: 68, level: 'N1', pattern: '～がてら', structure: 'V-ます/N + がてら', explanation: '表示顺便做某事，"顺便～"', example: '散歩がてら買い物をしました。', translation: '散步顺便买了东西。' },
  { id: 238, lesson: 68, level: 'N1', pattern: '～かたがた', structure: 'N + かたがた', explanation: '表示借某一机会同时做另一事', example: 'お見舞いかたがた近況報告に行きました。', translation: '探望顺便去报告了近况。' },
  { id: 239, lesson: 68, level: 'N1', pattern: '～かたわら', structure: 'N-の/V-る + かたわら', explanation: '表示一边～一边～（主要与次要）', example: '大学で教えるかたわら、研究も続けています。', translation: '在大学教书的同时，也在继续研究。' },

  // ==================== N1: Lesson 69 (同時通訳に挑戦) ====================
  { id: 240, lesson: 69, level: 'N1', pattern: '～や否や', structure: 'V-る + や否や', explanation: '表示"一～就立刻～"（书面）', example: 'ベルが鳴るや否や、学生たちは教室を飛び出した。', translation: '铃声一响，学生们就冲出了教室。' },
  { id: 241, lesson: 69, level: 'N1', pattern: '～そばから', structure: 'V-る/た + そばから', explanation: '表示"刚～就～"（反复、令人不快）', example: '覚えるそばから忘れてしまいます。', translation: '刚记住就忘记了。' },
  { id: 242, lesson: 69, level: 'N1', pattern: '～つ～つ', structure: 'V-ます + つ + V-ます + つ', explanation: '表示两个动作交替进行', example: '押しつ押されつの接戦でした。', translation: '是互相推拉不分胜负的激战。' },

  // ==================== N1: Lesson 70 (日本の政治制度) ====================
  { id: 243, lesson: 70, level: 'N1', pattern: '～こととて', structure: 'N-の/V + こととて', explanation: '表示理由（正式、谦逊），"因为～所以～"', example: '慣れぬこととて、失礼があるかもしれません。', translation: '因为不习惯，可能有失礼之处。' },
  { id: 244, lesson: 70, level: 'N1', pattern: '～しまつだ', structure: 'V-る + しまつだ', explanation: '表示（不好的）最终结果、下场', example: '酒に手を出して、ついには仕事を失う始末だ。', translation: '碰了酒，最终落得丢了工作的下场。' },
  { id: 245, lesson: 70, level: 'N1', pattern: '～ずくめ', structure: 'N + ずくめ', explanation: '表示"全是～、尽是～"', example: '今年はいいことずくめの一年でした。', translation: '今年是好事连连的一年。' },

  // ==================== N1: Lesson 71 (経済の仕組み) ====================
  { id: 246, lesson: 71, level: 'N1', pattern: '～ずにはいられない', structure: 'V-ない + ずにはいられない', explanation: '表示"忍不住要～、不由得～"', example: 'この映画を見ると、涙を流さずにはいられない。', translation: '看这部电影忍不住流眼泪。' },
  { id: 247, lesson: 71, level: 'N1', pattern: '～たりとも', structure: '最小数量 + たりとも', explanation: '表示"即使最少也～"（强烈否定）', example: '一円たりとも無駄にできない。', translation: '一日元也不能浪费。' },
  { id: 248, lesson: 71, level: 'N1', pattern: '～を皮切りに', structure: 'N + を皮切りに', explanation: '表示以～为开端、序幕', example: '東京を皮切りに全国ツアーが始まりました。', translation: '以东京为开端，全国巡演开始了。' },

  // ==================== N1: Lesson 72 (文学作品の鑑賞) ====================
  { id: 249, lesson: 72, level: 'N1', pattern: '～ならでは', structure: 'N + ならでは', explanation: '表示"只有～才有的"', example: '日本ならではの美しさです。', translation: '这是只有日本才有的美。' },
  { id: 250, lesson: 72, level: 'N1', pattern: '～ばこそ', structure: 'V-ば + こそ', explanation: '表示"正是因为～才"', example: '君のことを思えばこそ、厳しく言っているのです。', translation: '正是因为为你着想才说得严厉。' },
  { id: 251, lesson: 72, level: 'N1', pattern: '～まじき', structure: 'V-る + まじき', explanation: '表示"不应该～、与～不相称"', example: '教師にあるまじき行為だ。', translation: '这是教师不该有的行为。' },

  // ==================== N1: Lesson 73 (ビジネス交渉) ====================
  { id: 252, lesson: 73, level: 'N1', pattern: '～を限りに', structure: 'N + を限りに', explanation: '表示"以～为最后期限/界限"', example: '今月を限りに退職します。', translation: '到这个月为止就辞职了。' },
  { id: 253, lesson: 73, level: 'N1', pattern: '～をもって', structure: 'N + をもって', explanation: '表示"以～（方式/时间点）"', example: 'これをもって会議を終了します。', translation: '以此结束会议。' },
  { id: 254, lesson: 73, level: 'N1', pattern: '～にいたるまで', structure: 'N + にいたるまで', explanation: '表示"甚至到～地步/程度"', example: '細かい点にいたるまで注意を払いました。', translation: '甚至对细节都给予了注意。' },

  // ==================== N1: Lesson 74 (プレゼンテーション) ====================
  { id: 255, lesson: 74, level: 'N1', pattern: '～を踏まえて', structure: 'N + を踏まえて', explanation: '表示"基于～、考虑到～"', example: '前回の反省を踏まえて、改善策を提案します。', translation: '基于上次的反省，提出改善方案。' },
  { id: 256, lesson: 74, level: 'N1', pattern: '～を経て', structure: 'N + を経て', explanation: '表示"经过～"（时间或地点）', example: '多くの困難を経て、ようやく成功を収めました。', translation: '经过许多困难，终于取得了成功。' },
  { id: 257, lesson: 74, level: 'N1', pattern: '～に沿って', structure: 'N + に沿って', explanation: '表示"按照～、沿着～"', example: 'マニュアルに沿って操作してください。', translation: '请按照手册操作。' },

  // ==================== N1: Lesson 75 (翻訳の実践) ====================
  { id: 258, lesson: 75, level: 'N1', pattern: '～はおろか', structure: 'N + はおろか', explanation: '表示"别说～就连～也"', example: '彼は中国語はおろか、日本語さえ話せない。', translation: '别说中文了，他连日语都不会说。' },
  { id: 259, lesson: 75, level: 'N1', pattern: '～とあって', structure: 'N/V + とあって', explanation: '表示"因为是～所以"', example: '連休とあって、観光地は人で混雑していた。', translation: '因为是连休，观光地人很多。' },
  { id: 260, lesson: 75, level: 'N1', pattern: '～べからず', structure: 'V-る + べからず', explanation: '表示强烈禁止，"不可～"', example: '関係者以外立ち入るべからず。', translation: '无关人员不得入内。' },

  // ==================== N1: Lesson 76 (日本語総まとめ) ====================
  { id: 261, lesson: 76, level: 'N1', pattern: '～極まりない', structure: 'Na + 極まりない', explanation: '表示"极其～、非常～"', example: '失礼極まりない態度でした。', translation: '极其无礼的态度。' },
  { id: 262, lesson: 76, level: 'N1', pattern: '～の極み', structure: 'N + の極み', explanation: '表示"～之极"', example: '感激の極みです。', translation: '感激之极。' },
  { id: 263, lesson: 76, level: 'N1', pattern: '～にたえる', structure: 'N/V-る + にたえる', explanation: '表示"值得～"', example: 'この作品は批評にたえるものです。', translation: '这部作品经得起批评。' },
  { id: 264, lesson: 76, level: 'N1', pattern: '～にたらない', structure: 'V-る/N + にたらない', explanation: '表示"不值得～"', example: '心配するにたらない。', translation: '不值得担心。' },
];

module.exports = grammar;
