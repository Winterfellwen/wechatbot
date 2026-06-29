// fortune/pages/tarot/tarot.js
// 塔罗占卜完整仪式流程：提问 → 牌阵 → 洗牌 → 切牌 → 抽牌 → 翻牌 → AI解读

var calcService = require('../../services/calc-service');
var aiService = require('../../services/ai-service');
var renderService = require('../../services/render-service');
var storageService = require('../../services/storage-service');
var tarotArt = require('./tarot-art.js');

var TAROT_MAJOR = calcService.TAROT_MAJOR;

// 牌阵配置
var SPREADS = {
  single: {
    name: '单牌指引',
    desc: '一张牌的简洁讯息',
    count: 1,
    positions: [
      { name: '指引', meaning: '当下最核心的能量讯息' }
    ]
  },
  three: {
    name: '时间之流',
    desc: '过去 · 现在 · 未来',
    count: 3,
    positions: [
      { name: '过去', meaning: '过去的能量与影响，问题的根源' },
      { name: '现在', meaning: '当下的状态、挑战与机遇' },
      { name: '未来', meaning: '未来的发展趋势与潜在结果' }
    ]
  },
  five: {
    name: '命运之牌',
    desc: '现状 · 挑战 · 根源 · 趋势 · 建议',
    count: 5,
    positions: [
      { name: '现状', meaning: '当下的处境与核心议题' },
      { name: '挑战', meaning: '面临的主要阻碍或课题' },
      { name: '根源', meaning: '问题的深层根源与潜意识动因' },
      { name: '趋势', meaning: '若维持现状的发展走向' },
      { name: '建议', meaning: '塔罗给出的行动指引' }
    ]
  }
};

// 洗牌提示语
var SHUFFLE_TEXTS = [
  '闭上双眼，深呼吸...',
  '将意念集中于你的问题...',
  '感受牌面能量的流动...',
  '让潜意识与塔罗连接...',
  '命运的丝线正在交织...'
];

Page({
  data: {
    step: 'question',        // question / spread / shuffle / cut / draw / reveal / reading
    question: '',
    topic: 'general',
    spreadType: '',
    drawnCards: [],           // [{ card, reversed, positionIdx, flipped }]
    deckCards: [],            // 抽牌阶段展示的牌背数组
    cardsToDraw: 0,           // 还需抽几张
    shuffleText: '',
    readingContent: '',
    readingHtml: '',
    readingStatus: '',        // '' / thinking / streaming / done / error
    historyId: null,
    profile: null,
    statusBarHeight: 20,
    tagStyle: null,
    cutProgress: 0,           // 切牌动画 0/1/2
    isView: false             // 历史记录查看模式
  },

  onLoad: function(options) {
    var profile = storageService.getProfile();
    var sys = wx.getSystemInfoSync();
    this.setData({
      profile: profile,
      statusBarHeight: sys.statusBarHeight || 20,
      tagStyle: {
        h1: 'font-size:30rpx;font-weight:600;color:#c4b5fd;margin:12rpx 0 6rpx;',
        h2: 'font-size:28rpx;font-weight:600;color:#c4b5fd;margin:12rpx 0 6rpx;',
        h3: 'font-size:26rpx;font-weight:600;color:#c4b5fd;margin:12rpx 0 6rpx;',
        strong: 'color:#c4b5fd;font-weight:600;',
        p: 'margin:4rpx 0;color:rgba(255,255,255,0.88);',
        li: 'margin:3rpx 0;color:rgba(255,255,255,0.85);'
      }
    });

    // 历史记录查看模式
    if (options.mode === 'view' && options.id) {
      this._loadHistoryView(options.id);
    }
  },

  // 从历史记录加载查看
  _loadHistoryView: function(id) {
    var record = storageService.getHistoryById(id);
    if (!record || !record.results || record.results.length === 0) return;

    var result = record.results[0];
    var drawnCards = [];
    // 从 calcData.summary 解析牌面信息
    if (result.calcData && result.calcData.summary) {
      var parts = result.calcData.summary.split(' | ');
      drawnCards = parts.map(function(part, idx) {
        var match = part.match(/^(.+?)：(.+?)（(.+?)）$/);
        if (!match) return null;
        var cardName = match[2];
        var reversed = match[3] === '逆位';
        // 从 TAROT_MAJOR 查找牌面数据
        var card = TAROT_MAJOR.find(function(c) { return c.name === cardName; }) || { name: cardName, number: 0, upright: '', reversed: '' };
        var art = tarotArt.getCardArt(card.number);
        var imgPath = tarotArt.getCardImagePath(card.number);
        return {
          card: card,
          reversed: reversed,
          positionIdx: idx,
          flipped: true,
          useImage: !!imgPath,
          artImage: imgPath,
          artUri: art
        };
      }).filter(function(c) { return c !== null; });
    }

    this.setData({
      step: 'reading',
      readingContent: result.content || '',
      readingHtml: renderService.toHtml(result.content || ''),
      readingStatus: 'done',
      historyId: id,
      drawnCards: drawnCards,
      isView: true
    });
  },

  onUnload: function() {
    this._aborted = true;
    this._clearAllTimers();
  },

  _clearAllTimers: function() {
    if (this._shuffleTimer) { clearInterval(this._shuffleTimer); this._shuffleTimer = null; }
    if (this._revealTimer) { clearTimeout(this._revealTimer); this._revealTimer = null; }
    if (this._phaseTimer) { clearTimeout(this._phaseTimer); this._phaseTimer = null; }
  },

  // 本地图片加载失败时回退到 SVG
  handleArtError: function(e) {
    var idx = e.currentTarget.dataset.idx;
    var drawn = this.data.drawnCards;
    if (drawn[idx]) {
      drawn[idx].useImage = false;
      this.setData({ drawnCards: drawn });
    }
  },

  // ===== 第1步：提问 =====
  handleQuestionInput: function(e) {
    this.setData({ question: e.detail.value });
  },

  handleTopicTap: function(e) {
    this.setData({ topic: e.currentTarget.dataset.key });
  },

  handleStartDivination: function() {
    var q = this.data.question.trim();
    if (!q) {
      wx.showToast({ title: '请先输入你的问题', icon: 'none' });
      return;
    }
    this.setData({ step: 'spread' });
  },

  // ===== 第2步：选择牌阵 =====
  handleSpreadTap: function(e) {
    var type = e.currentTarget.dataset.type;
    var spread = SPREADS[type];
    this.setData({
      step: 'shuffle',
      spreadType: type,
      shuffleText: SHUFFLE_TEXTS[0]
    });
    this._startShuffle();
  },

  // ===== 第3步：洗牌动画 =====
  _startShuffle: function() {
    var that = this;
    var idx = 0;

    // 每 800ms 更换提示语
    this._shuffleTimer = setInterval(function() {
      idx++;
      if (idx >= SHUFFLE_TEXTS.length) {
        clearInterval(that._shuffleTimer);
        that._shuffleTimer = null;
        return;
      }
      that.setData({ shuffleText: SHUFFLE_TEXTS[idx] });
    }, 800);

    // 2.8 秒后进入切牌
    this._phaseTimer = setTimeout(function() {
      if (that._shuffleTimer) {
        clearInterval(that._shuffleTimer);
        that._shuffleTimer = null;
      }
      that.setData({ step: 'cut', cutProgress: 0 });
    }, 2800);
  },

  // ===== 第4步：切牌 =====
  handleCutTap: function() {
    if (this.data.cutProgress > 0) return;
    var that = this;
    this.setData({ cutProgress: 1 });

    // 切牌动画后进入抽牌
    this._phaseTimer = setTimeout(function() {
      that.setData({ cutProgress: 2 });
      that._phaseTimer = setTimeout(function() {
        that._initDrawPhase();
      }, 600);
    }, 600);
  },

  // ===== 第5步：抽牌 =====
  _initDrawPhase: function() {
    var spread = SPREADS[this.data.spreadType];
    // 生成 22 张牌背供选择
    var deck = [];
    for (var i = 0; i < 22; i++) {
      deck.push({ id: i, picked: false });
    }
    this.setData({
      step: 'draw',
      deckCards: deck,
      drawnCards: [],
      cardsToDraw: spread.count
    });
  },

  handlePickCard: function(e) {
    var id = e.currentTarget.dataset.id;
    var deck = this.data.deckCards;

    // 已抽过的牌不可再选
    if (deck[id].picked) return;

    var spread = SPREADS[this.data.spreadType];
    var drawn = this.data.drawnCards;

    // 还需要抽的牌数已满
    if (drawn.length >= spread.count) return;

    // 随机选一张大阿尔卡那（不重复）
    var usedIndices = drawn.map(function(c) { return c.cardIndex; });
    var available = [];
    for (var i = 0; i < TAROT_MAJOR.length; i++) {
      if (usedIndices.indexOf(i) === -1) available.push(i);
    }
    var pickIdx = available[Math.floor(Math.random() * available.length)];
    var card = TAROT_MAJOR[pickIdx];
    var reversed = Math.random() < 0.5;

    drawn.push({
      card: card,
      cardIndex: pickIdx,
      reversed: reversed,
      positionIdx: drawn.length,
      flipped: false,
      artUri: tarotArt.getCardArt(card.number),
      artImage: tarotArt.getCardImagePath(card.number),
      useImage: true
    });

    deck[id].picked = true;

    this.setData({
      deckCards: deck,
      drawnCards: drawn,
      cardsToDraw: spread.count - drawn.length
    });

    // 抽完所有牌，进入翻牌
    if (drawn.length >= spread.count) {
      var that = this;
      this._phaseTimer = setTimeout(function() {
        that.setData({ step: 'reveal' });
        that._startReveal();
      }, 600);
    }
  },

  // ===== 第6步：翻牌动画 =====
  _startReveal: function() {
    var that = this;
    var drawn = this.data.drawnCards;
    var i = 0;

    function flipNext() {
      if (i >= drawn.length) {
        // 全部翻完，进入解读
        that._phaseTimer = setTimeout(function() {
          that.setData({ step: 'reading', readingStatus: 'thinking' });
          that._startReading();
        }, 800);
        return;
      }
      drawn[i].flipped = true;
      that.setData({ drawnCards: drawn });
      i++;
      that._revealTimer = setTimeout(flipNext, 700);
    }

    this._revealTimer = setTimeout(flipNext, 400);
  },

  // ===== 第7步：AI 解读 =====
  _startReading: function() {
    var that = this;
    var spread = SPREADS[this.data.spreadType];
    var prompt = aiService.buildTarotPrompt(
      this.data.question,
      this.data.topic,
      spread.name,
      spread.positions,
      this.data.drawnCards
    );

    this._aborted = false;

    aiService.streamAI(prompt,
      function(content) {
        if (that._aborted) return;
        that.setData({
          readingContent: content,
          readingHtml: renderService.toHtml(content),
          readingStatus: 'streaming'
        });
      },
      function() {
        if (that._aborted) return;
        that.setData({ readingStatus: 'done' });
        that._saveToHistory();
      },
      function(err) {
        if (that._aborted) return;
        var msg = err && err.message ? err.message : '解读失败';
        that.setData({
          readingStatus: 'error',
          readingContent: '解读失败：' + msg,
          readingHtml: renderService.toHtml('解读失败：' + msg)
        });
      }
    );
  },

  _saveToHistory: function() {
    var spread = SPREADS[this.data.spreadType];
    var profile = this.data.profile || {};
    var calcSummary = this.data.drawnCards.map(function(c, i) {
      var pos = spread.positions[i] || {};
      return pos.name + '：' + c.card.name + (c.reversed ? '（逆位）' : '（正位）');
    }).join(' | ');

    var record = {
      category: 'western',
      profile: profile,
      results: [{
        type: 'tarot',
        typeName: '塔罗占卜',
        content: this.data.readingContent,
        calcData: { summary: calcSummary }
      }]
    };
    var saved = storageService.addHistory(record);
    if (saved) {
      this.setData({ historyId: saved.id });
    }
  },

  // ===== 重新占卜 =====
  handleRestart: function() {
    this._aborted = true;
    this._clearAllTimers();
    this.setData({
      step: 'question',
      question: '',
      topic: 'general',
      spreadType: '',
      drawnCards: [],
      deckCards: [],
      cardsToDraw: 0,
      readingContent: '',
      readingHtml: '',
      readingStatus: '',
      historyId: null,
      cutProgress: 0
    });
  },

  // ===== 跳转追问对话 =====
  handleChatTap: function() {
    if (!this.data.historyId) {
      wx.showToast({ title: '请等待解读完成', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/fortune/pages/chat/chat?readingId=' + this.data.historyId
    });
  },

  handleBack: function() {
    // 在流程中途返回时确认
    var step = this.data.step;
    if (step === 'reading' && this.data.readingStatus === 'streaming') {
      wx.showModal({
        title: '提示',
        content: '解读正在进行中，确定离开吗？',
        success: function(res) {
          if (res.confirm) wx.navigateBack();
        }
      });
      return;
    }
    wx.navigateBack();
  }
});
