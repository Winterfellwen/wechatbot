const storageService = require('../../services/storage-service');
const aiService = require('../../services/ai-service');
const calcService = require('../../services/calc-service');
const renderService = require('../../services/render-service');

// 中式算命文言文语录
const LOADING_TEXTS_CN = [
  '天地玄黄，宇宙洪荒',
  '日月盈昃，辰宿列张',
  '天行健，君子以自强不息',
  '地势坤，君子以厚德载物',
  '观乎天文，以察时变',
  '一阴一阳之谓道',
  '命由天定，运由己生',
  '紫微斗数，星命推演',
  '四柱八字，五行生克',
  '易经六十四卦，变化无穷',
  '乾坤运转，阴阳调和',
  '天干地支，六十甲子',
  '五行相生相克，命运轮回',
  '福兮祸所伏，祸兮福所倚',
  '大衍之数五十，其用四十有九',
  '贞观之道，在乎天人合一'
];

// 西式占星拉丁语语录
const LOADING_TEXTS_EN = [
  'Ad astra per aspera',
  'Per aspera ad astra',
  'Stella cadens, fatum ducit',
  'Caelum et terra, omnia mutant',
  'Sidera ducunt, fatum sequitur',
  'Ars longa, vita brevis',
  'Corona stellarum, fatum tuum',
  'Luna plena, energy crescit',
  'Sol illuminat, Luna revelat',
  'Virtus unita fortior',
  'Fata viam invenient',
  'Amor vincit omnia',
  'Tempus fugit, momenta manent',
  'Cogito ergo sum',
  'Festina lente',
  'Gnothi seauton'
];

// 随机取 count 条不重复短语
function getRandomTexts(category, count) {
  const texts = category === 'chinese' ? LOADING_TEXTS_CN : LOADING_TEXTS_EN;
  const shuffled = [...texts].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count || 6);
}

// 构建详细排盘卡片数据
function buildDetailCards(category, calcResults) {
  var cards = [];

  if (category === 'chinese') {
    // 八字卡片
    if (calcResults.bazi && !calcResults.bazi.error && !calcResults.bazi.needTime) {
      var bazi = calcResults.bazi;
      var CN_NUM = ['零','一','二','三','四','五','六','七','八'];
      var elements = bazi.fiveElements;
      var fiveElements = Object.keys(elements)
        .filter(function(k) { return elements[k] > 0; })
        .sort(function(a, b) { return elements[b] - elements[a]; })
        .map(function(k) { return k + CN_NUM[parseInt(elements[k], 10)]; })
        .join(' ');
      cards.push({
        id: 'bazi',
        title: '八字命理',
        icon: '四柱',
        rows: [
          { label: '年柱', value: bazi.yearPillar, color: '#ef4444' },
          { label: '月柱', value: bazi.monthPillar, color: '#f59e0b' },
          { label: '日柱', value: bazi.dayPillar, color: '#22c55e' },
          { label: '时柱', value: bazi.hourPillar, color: '#3b82f6' },
          { label: '日主', value: bazi.dayMaster, color: '#a78bfa' },
          { label: '五行', value: fiveElements.trim(), color: '#fbbf24' },
          { label: '缺失', value: bazi.missingElements.length > 0 ? bazi.missingElements.join('') : '齐全', color: bazi.missingElements.length > 0 ? '#ef4444' : '#22c55e' },
          { label: '生肖', value: bazi.zodiac, color: '#60a5fa' }
        ]
      });
    }

    // 紫微卡片
    if (calcResults.ziwei && !calcResults.ziwei.error && !calcResults.ziwei.needTime) {
      var ziwei = calcResults.ziwei;
      cards.push({
        id: 'ziwei',
        title: '紫微斗数',
        icon: '命宫',
        rows: [
          { label: '主星', value: ziwei.majorStars.length > 0 ? ziwei.majorStars.join('、') : '空宫', color: '#a78bfa' },
          { label: '五行', value: ziwei.fiveElementLevel || '-', color: '#f59e0b' },
          { label: '命主', value: ziwei.soul || '-', color: '#3b82f6' },
          { label: '身主', value: ziwei.body || '-', color: '#22c55e' },
          { label: '命宫', value: ziwei.lifePalace || '-', color: '#fbbf24' },
          { label: '星座', value: ziwei.sign || '-', color: '#e879f9' }
        ]
      });
    }

    // 易经卡片
    if (calcResults.yijing && !calcResults.yijing.error) {
      var yijing = calcResults.yijing;
      cards.push({
        id: 'yijing',
        title: '易经卦象',
        icon: '卦',
        rows: [
          { label: '本卦', value: yijing.hexagramName, color: '#f59e0b' },
          { label: '卦辞', value: yijing.judgment, color: '#fbbf24' },
          { label: '动爻', value: '第' + yijing.changingLine + '爻', color: '#a78bfa' }
        ]
      });
    }
  } else {
    // 星座卡片
    if (calcResults.constellation && !calcResults.constellation.error) {
      var star = calcResults.constellation;
      cards.push({
        id: 'star',
        title: '星座分析',
        icon: '星',
        rows: [
          { label: '太阳星座', value: star.sign, color: '#fbbf24' },
          { label: '元素属性', value: star.element || '-', color: star.element === '火象' ? '#ef4444' : star.element === '土象' ? '#f59e0b' : star.element === '风象' ? '#60a5fa' : '#3b82f6' },
          { label: '守护星', value: star.rulingPlanet || '-', color: '#e879f9' },
          { label: '日期范围', value: star.dateRange || '-', color: '#22c55e' },
        ]
      });
    }

    // 占星卡片
    if (calcResults.astrology && !calcResults.astrology.error) {
      var astro = calcResults.astrology;
      cards.push({
        id: 'astro',
        title: '占星术',
        icon: '轨',
        rows: [
          { label: '本命星座', value: astro.sign, color: '#fbbf24' },
          { label: '元素属性', value: astro.element || '-', color: astro.element === '火象' ? '#ef4444' : astro.element === '土象' ? '#f59e0b' : astro.element === '风象' ? '#60a5fa' : '#3b82f6' },
          { label: '守护星', value: astro.rulingPlanet || '-', color: '#e879f9' },
        ]
      });
    }
  }

  return cards;
}

function buildTagStyle(color) {
  return {
    h1: 'font-size:30rpx;font-weight:600;color:' + color + ';margin:12rpx 0 6rpx;',
    h2: 'font-size:28rpx;font-weight:600;color:' + color + ';margin:12rpx 0 6rpx;',
    h3: 'font-size:26rpx;font-weight:600;color:' + color + ';margin:12rpx 0 6rpx;',
    strong: 'color:' + color + ';font-weight:600;',
    em: 'color:rgba(255,255,255,0.7);font-style:italic;',
    p: 'margin:4rpx 0;color:rgba(255,255,255,0.88);',
    li: 'margin:3rpx 0;color:rgba(255,255,255,0.85);',
    blockquote: 'border-left:3rpx solid ' + color + ';background:rgba(255,255,255,0.04);padding:10rpx 20rpx;margin:10rpx 0;font-size:22rpx;border-radius:0 8rpx 8rpx 0;color:rgba(255,255,255,0.75);',
    code: 'background:rgba(255,255,255,0.08);padding:2rpx 10rpx;border-radius:6rpx;font-size:22rpx;font-family:"SF Mono","Menlo",monospace;color:' + color + ';'
  };
}

Page({
  data: {
    category: '',
    categoryName: '',
    profile: null,
    reading: null,
    readingHtml: '',
    detailCards: [],
    isViewMode: false,
    historyId: null,
    themeClass: 'bg-chinese',
    themeColor: '#d97757',
    needTimeWarn: false,
    tagStyle: null,
    generateLabel: ''
  },

  onLoad(options) {
    const category = options.category || 'chinese';
    const categoryName = category === 'chinese' ? '易学命理' : '西方星象';
    const themeClass = category === 'chinese' ? 'bg-chinese' : 'bg-western';
    const themeColor = category === 'chinese' ? '#d97757' : '#818cf8';

    this.setData({ category, categoryName, themeClass, themeColor, tagStyle: buildTagStyle(themeColor) });

    if (options.mode === 'view' && options.id) {
      this.loadHistoryReading(options.id);
    } else {
      this.initIdleState(category, categoryName);
    }

    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  loadHistoryReading(id) {
    const record = storageService.getHistoryById(id);
    if (record) {
      const themeClass = record.category === 'chinese' ? 'bg-chinese' : 'bg-western';
      const themeColor = record.category === 'chinese' ? '#d97757' : '#818cf8';
      const result = record.results[0] || {};
      var content = result.content || '';
      var types = record.category === 'chinese'
        ? ['bazi', 'ziwei', 'yijing']
        : ['constellation', 'astrology'];
      var calcResults = calcService.buildContext(record.profile, types);
      var detailCards = buildDetailCards(record.category, calcResults);
      var needTimeWarn = false;
      if (record.category === 'chinese' && calcResults.bazi && calcResults.bazi.needTime) {
        needTimeWarn = true;
      }
      this.setData({
        category: record.category,
        categoryName: record.category === 'chinese' ? '易学命理' : '西方星象',
        profile: record.profile,
        reading: {
          status: 'completed',
          content: content,
          summaries: result.calcData && result.calcData.summary
            ? [{ typeName: result.typeName, summary: result.calcData.summary }]
            : []
        },
        readingHtml: renderService.toHtml(content),
        isViewMode: true,
        historyId: id,
        themeClass,
        themeColor,
        detailCards,
        needTimeWarn,
        tagStyle: buildTagStyle(themeColor)
      });
    }
  },

  initIdleState(category, categoryName) {
    const profile = storageService.getProfile();
    if (!profile) {
      wx.showToast({ title: '请先填写档案', icon: 'none' });
      wx.navigateBack();
      return;
    }

    var types = category === 'chinese'
      ? ['bazi', 'ziwei', 'yijing']
      : ['constellation', 'astrology'];
    var calcResults = calcService.buildContext(profile, types);
    var detailCards = buildDetailCards(category, calcResults);
    var needTimeWarn = category === 'chinese' && calcResults.bazi && calcResults.bazi.needTime;
    var generateLabel = category === 'chinese' ? '推演命盘' : '星象推演';

    // 有当天缓存则直接显示，否则进入待生成状态
    var cached = storageService.getReadingCache(category);
    if (cached && cached.content) {
      this.setData({
        profile,
        detailCards,
        needTimeWarn,
        reading: {
          status: 'completed',
          content: cached.content,
          summaries: cached.summaries || [],
          thinkingTexts: []
        },
        readingHtml: renderService.toHtml(cached.content),
        historyId: cached.historyId || null,
        isViewMode: false
      });
      return;
    }

    this.setData({
      profile,
      detailCards,
      needTimeWarn,
      generateLabel,
      reading: {
        status: 'idle',
        content: '',
        summaries: [],
        thinkingTexts: []
      },
      readingHtml: '',
      historyId: null,
      isViewMode: false
    });
  },

  handleGenerate() {
    const { category, categoryName, profile } = this.data;
    if (!profile) return;

    var cached = storageService.getReadingCache(category);
    if (cached && cached.content) {
      this.setData({
        reading: {
          status: 'completed',
          content: cached.content,
          summaries: cached.summaries || [],
          thinkingTexts: []
        },
        readingHtml: renderService.toHtml(cached.content),
        historyId: cached.historyId || null
      });
      return;
    }

    this._doStreamReading(category, categoryName, profile);
  },

  // 生成 / 重新生成（点击按钮后派发）
  handleGenerateOrRegenerate() {
    if (this.data.reading.status === 'idle') {
      this.handleGenerate();
    } else {
      this.handleRegenerate();
    }
  },

  // 重新生成（用户主动点击）
  handleRegenerate() {
    const { category, categoryName, profile } = this.data;
    if (!profile) return;

    var that = this;
    var confirmText = category === 'chinese'
      ? '天命虽有定数，然心可转运。确定重新推演命盘吗？'
      : '星辰已移位，命运可重塑。确定重新解读星象吗？';

    wx.showModal({
      title: category === 'chinese' ? '重算天机' : 'Restart Reading',
      content: confirmText,
      confirmText: '确定重算',
      cancelText: '作罢',
      success: (res) => {
        if (res.confirm) {
          that._doStreamReading(category, categoryName, profile);
        }
      }
    });
  },

  // 实际执行流式测算（新算或重算共用）
  _doStreamReading(category, categoryName, profile) {
    const types = category === 'chinese'
      ? [{ type: 'bazi', typeName: '八字命理' }, { type: 'ziwei', typeName: '紫微斗数' }, { type: 'yijing', typeName: '易经卦象' }]
      : [{ type: 'constellation', typeName: '星座分析' }, { type: 'astrology', typeName: '占星术' }];

    var typeStrings = types.map(function(t) { return t.type; });
    var calcResults = calcService.buildContext(profile, typeStrings);

    // 收集所有有效排盘摘要
    var summaries = [];
    types.forEach(function(t) {
      var calcData = calcResults[t.type];
      if (calcData && calcData.summary && !calcData.error && !calcData.needTime) {
        summaries.push({ typeName: t.typeName, summary: calcData.summary });
      }
    });

    var needTimeWarn = false;
    if (category === 'chinese' && calcResults.bazi && calcResults.bazi.needTime) {
      needTimeWarn = true;
    }

    var themeColor = category === 'chinese' ? '#d97757' : '#818cf8';
    var generateLabel = category === 'chinese' ? '推演命盘' : '星象推演';

    // 思考动画：每 3 秒自动更换一段话
    var that = this;
    if (this._thinkingTimer) clearInterval(this._thinkingTimer);
    this._thinkingTimer = setInterval(function() {
      if (!that.data.reading || that.data.reading.status !== 'thinking') {
        clearInterval(that._thinkingTimer);
        that._thinkingTimer = null;
        return;
      }
      that.setData({ 'reading.thinkingTexts': getRandomTexts(category, 4) });
    }, 3000);

    this.setData({
      profile,
      reading: {
        status: 'thinking',
        content: '',
        summaries,
        thinkingTexts: getRandomTexts(category, 4)
      },
      readingHtml: '',
      needTimeWarn,
      historyId: null,
      tagStyle: buildTagStyle(themeColor)
    });

    this.startStreamReading(calcResults);
  },

  startStreamReading(calcResults) {
    const { category, profile } = this.data;

    aiService.streamUnifiedReading(
      category,
      profile,
      calcResults,
      // onThinking - 深度思考中，保持 thinking 状态（不显示思考内容，只显示动画）
      () => {
        // 已在 thinking 状态，无需操作；动画持续播放
      },
      // onChunk - 有内容输出，切换到 streaming
      (content) => {
        if (!this.data.reading) return;
        if (this._thinkingTimer) {
          clearInterval(this._thinkingTimer);
          this._thinkingTimer = null;
        }
        this.setData({
          reading: { ...this.data.reading, content, status: 'streaming', thinkingTexts: [] },
          readingHtml: renderService.toHtml(content)
        });
      },
      // onDone - 完成
      () => {
        if (!this.data.reading) return;
        this.setData({
          reading: { ...this.data.reading, status: 'completed', thinkingTexts: [] }
        });
        this.saveToHistory(calcResults);
        // 保存当天缓存
        storageService.saveReadingCache(category, {
          content: this.data.reading.content,
          summaries: this.data.reading.summaries,
          historyId: this.data.historyId
        });
      },
      // onError
      (err) => {
        var errMsg = err && err.message ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
        console.error('Reading error:', errMsg, err);
        if (!this.data.reading) return;
        var errorContent = '推演失败：' + errMsg;
        this.setData({
          reading: { ...this.data.reading, status: 'error', content: errorContent, thinkingTexts: [] },
          readingHtml: renderService.toHtml(errorContent)
        });
      }
    );
  },

  onUnload() {
    if (this._thinkingTimer) {
      clearInterval(this._thinkingTimer);
      this._thinkingTimer = null;
    }
  },

  saveToHistory(calcResults) {
    const { category, profile, reading, categoryName } = this.data;
    const record = {
      category,
      profile,
      results: [{
        type: 'unified',
        typeName: categoryName,
        content: reading.content,
        calcData: {
          summary: reading.summaries.map(s => s.summary).join('\n')
        }
      }]
    };
    var saved = storageService.addHistory(record);
    if (saved) {
      this.setData({ historyId: saved.id });
    }
  },

  handleChatTap() {
    const { reading, historyId } = this.data;

    if (!reading || reading.status !== 'completed') {
      wx.showToast({ title: '请等待测算完成', icon: 'none' });
      return;
    }

    var id = historyId;
    if (!id) {
      const history = storageService.getHistory();
      if (history.length > 0) {
        id = history[0].id;
      }
    }

    wx.navigateTo({
      url: '/fortune/pages/chat/chat?readingId=' + id
    });
  },

  handleBack() {
    wx.navigateBack();
  },

  handleCopyContent() {
    var content = this.data.reading && this.data.reading.content;
    if (!content) return;
    wx.setClipboardData({
      data: content,
      success: function() {
        wx.showToast({ title: '已复制', icon: 'none' });
      }
    });
  },

  // ===== 分享 =====
  onShareAppMessage() {
    var category = this.data.category;
    var categoryName = this.data.categoryName || (category === 'chinese' ? '易学命理' : '西方星象');
    var title = categoryName + '运势';
    var path = '/fortune/pages/reading/reading?category=' + category;
    if (this.data.readingId) {
      path = '/fortune/pages/reading/reading?mode=view&id=' + this.data.readingId;
    }
    return {
      title: title,
      path: path
    };
  },

  onShareTimeline() {
    var category = this.data.category;
    var categoryName = this.data.categoryName || (category === 'chinese' ? '易学命理' : '西方星象');
    var query = '';
    if (this.data.readingId) {
      query = 'mode=view&id=' + this.data.readingId;
    }
    return {
      title: categoryName + '运势',
      query: query
    };
  }
});
