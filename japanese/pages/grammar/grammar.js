Page({
  data: {
    currentCategory: 1,
    categories: [
      { id: 1, name: '基础' },
      { id: 2, name: '助词' },
      { id: 3, name: '动词' },
      { id: 4, name: '形容词' },
      { id: 5, name: 'N3' },
      { id: 6, name: 'N2' },
      { id: 7, name: 'N1' }
    ],
    currentGrammar: []
  },

  onLoad() {
    this.loadGrammar();
  },

  switchCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ currentCategory: id });
    this.loadGrammar();
  },

  loadGrammar() {
    const data = this.getGrammarData(this.data.currentCategory);
    this.setData({ currentGrammar: data });
  },

  getGrammarData(categoryId) {
    const grammar = {
      1: [
        { id: 1, title: 'です', level: 'N5', usage: '表示判断/肯定', example: '私は学生です。', exampleCn: '我是学生。' },
        { id: 2, title: 'ます', level: 'N5', usage: '动词敬体形', example: '食べます。', exampleCn: '吃。' },
        { id: 3, title: 'ません', level: 'N5', usage: '动词否定形', example: '行きません。', exampleCn: '不去。' },
        { id: 4, title: 'ました', level: 'N5', usage: '动词过去形', example: '食べました。', exampleCn: '吃了。' }
      ],
      2: [
        { id: 5, title: 'は', level: 'N5', usage: '提示主题', example: '私は学生です。', exampleCn: '我是学生。' },
        { id: 6, title: 'が', level: 'N5', usage: '主语/对象语', example: '私が使之。', exampleCn: '我做。' },
        { id: 7, title: 'を', level: 'N5', usage: '宾语', example: '水を飲みます。', exampleCn: '喝水。' },
        { id: 8, title: 'に', level: 'N5', usage: '时间/地点/目的', example: '9時に行く。', exampleCn: '9点去。' },
        { id: 9, title: 'で', level: 'N5', usage: '手段/场所', example: 'バスで行く。', exampleCn: '坐公交去。' },
        { id: 10, title: 'と', level: 'N5', usage: '和/引用', example: '友達と行く。', exampleCn: '和朋友一起去。' },
        { id: 11, title: 'から', level: 'N5', usage: '从/因为', example: '朝から。', exampleCn: '从早上。' },
        { id: 12, title: 'まで', level: 'N5', usage: '到...为止', example: '夜まで。', exampleCn: '到晚上。' }
      ],
      3: [
        { id: 13, title: 'て形', level: 'N5', usage: '动词て形变化', example: '食べる→食べて', exampleCn: '吃→吃(中)' },
        { id: 14, title: 'ている', level: 'N5', usage: '进行时/状态', example: '食べている。', exampleCn: '正在吃。' },
        { id: 15, title: 'てください', level: 'N5', usage: '请...', example: '食べてください。', exampleCn: '请吃。' },
        { id: 16, title: 'てもいい', level: 'N5', usage: '可以...', example: '食べてもいい。', exampleCn: '可以吃。' }
      ],
      4: [
        { id: 17, title: 'い形容詞', level: 'N5', usage: 'イ形容词', example: '広い。', exampleCn: '宽敞。' },
        { id: 18, title: 'な形容詞', level: 'N5', usage: 'ナ形容词', example: '靜かです。', exampleCn: '安静。' },
        { id: 19, title: 'くて', level: 'N5', usage: '形容词连接', example: '広くて靜かです。', exampleCn: '宽敞又安静。' },
        { id: 20, title: 'ではありません', level: 'N5', usage: '形容词否定', example: '高くありません。', exampleCn: '不高。' }
      ],
      5: [
        { id: 21, title: 'そうです', level: 'N3', usage: '样态/听说', example: '雨が降りそうです。', exampleCn: '好像要下雨。' },
        { id: 22, title: 'ようです', level: 'N3', usage: '推测', example: '病気のようです。', exampleCn: '好像生病了。' },
        { id: 23, title: 'はずです', level: 'N3', usage: '应该', example: '来るはずです。', exampleCn: '应该会来。' },
        { id: 24, title: 'ようです', level: 'N3', usage: '比喻/举例', example: '雪のように白い。', exampleCn: '像雪一样白。' }
      ],
      6: [
        { id: 25, title: 'ようです', level: 'N2', usage: '变化结果', example: '大人になりました。', exampleCn: '变成大人了。' },
        { id: 26, title: 'そうだ', level: 'N2', usage: '样态', example: '旨そうだ。', exampleCn: '看起来好吃。' },
        { id: 27, title: 'らしい', level: 'N2', usage: '典型性', example: '学生らしい。', exampleCn: '像学生。' },
        { id: 28, title: 'はずだ', level: 'N2', usage: '理由/原因', example: ' потому что。', exampleCn: '因为...' }
      ],
      7: [
        { id: 29, title: 'ことだ', level: 'N1', usage: '强调', example: '勉強ことだ。', exampleCn: '要学习。' },
        { id: 30, title: 'ものではない', level: 'N1', usage: '不是...的', example: ' 그런 게 아니야. ', exampleCn: '不是那种事。' }
      ]
    };
    return grammar[categoryId] || [];
  }
});