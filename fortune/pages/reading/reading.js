const storageService = require('../../services/storage-service');
const aiService = require('../../services/ai-service');
const calcService = require('../../services/calc-service');

Page({
  data: {
    category: '',
    categoryName: '',
    profile: null,
    readings: [],
    isViewMode: false,
    historyId: null,
    themeClass: 'bg-chinese',
    themeColor: '#d97757',
    needTimeWarn: false
  },

  onLoad(options) {
    const category = options.category || 'chinese';
    const categoryName = category === 'chinese' ? '易学命理' : '西方星象';
    const themeClass = category === 'chinese' ? 'bg-chinese' : 'bg-western';
    const themeColor = category === 'chinese' ? '#d97757' : '#818cf8';

    this.setData({ category, categoryName, themeClass, themeColor });

    if (options.mode === 'view' && options.id) {
      this.loadHistoryReading(options.id);
    } else {
      this.startNewReading(category, categoryName);
    }
  },

  loadHistoryReading(id) {
    const record = storageService.getHistoryById(id);
    if (record) {
      const themeClass = record.category === 'chinese' ? 'bg-chinese' : 'bg-western';
      const themeColor = record.category === 'chinese' ? '#d97757' : '#818cf8';
      this.setData({
        category: record.category,
        categoryName: record.category === 'chinese' ? '易学命理' : '西方星象',
        profile: record.profile,
        readings: record.results.map(r => ({
          type: r.type,
          typeName: r.typeName,
          content: r.content,
          summary: r.calcData ? r.calcData.summary : '',
          status: 'completed'
        })),
        isViewMode: true,
        historyId: id,
        themeClass,
        themeColor
      });
    }
  },

  startNewReading(category, categoryName) {
    const profile = storageService.getProfile();
    if (!profile) {
      wx.showToast({ title: '请先填写档案', icon: 'none' });
      wx.navigateBack();
      return;
    }

    const types = category === 'chinese'
      ? [{ type: 'bazi', typeName: '八字命理' }, { type: 'ziwei', typeName: '紫微斗数' }, { type: 'yijing', typeName: '易经卦象' }]
      : [{ type: 'constellation', typeName: '星座分析' }, { type: 'tarot', typeName: '塔罗占卜' }, { type: 'astrology', typeName: '占星术' }];

    // 计算排盘数据
    var typeStrings = types.map(function(t) { return t.type; });
    var calcResults = calcService.buildContext(profile, typeStrings);

    // 检查是否缺时辰
    var needTimeWarn = false;
    if (category === 'chinese') {
      if (calcResults.bazi && calcResults.bazi.needTime) needTimeWarn = true;
    }

    this.setData({
      profile,
      readings: types.map(function(t) {
        var calcData = calcResults[t.type];
        return {
          type: t.type,
          typeName: t.typeName,
          content: '',
          summary: (calcData && !calcData.error && !calcData.needTime) ? calcData.summary : '',
          status: 'pending'
        };
      }),
      needTimeWarn: needTimeWarn
    });

    this.startStreamReadings(calcResults);
  },

  startStreamReadings(calcResults) {
    const { category, profile } = this.data;

    aiService.streamReadings(
      category,
      profile,
      calcResults,
      (type, typeName) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], status: 'loading', content: '' };
          this.setData({ readings });
        }
      },
      (type, content) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], content, status: 'streaming' };
          this.setData({ readings });
        }
      },
      (type, typeName, content) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], content, status: 'completed' };
          this.setData({ readings });
        }
      },
      () => {
        this.saveToHistory(calcResults);
      },
      (type, err) => {
        // 详细打印错误对象，便于定位 API 问题
        var errMsg = err && err.message ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
        console.error('Reading error:', type, errMsg, err);
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], status: 'error', content: '推演失败：' + errMsg };
          this.setData({ readings });
        }
      }
    );
  },

  saveToHistory(calcResults) {
    const { category, profile, readings } = this.data;
    const record = {
      category,
      profile,
      results: readings.map(r => ({
        type: r.type,
        typeName: r.typeName,
        content: r.content,
        calcData: calcResults[r.type] || null
      }))
    };
    var saved = storageService.addHistory(record);
    if (saved) {
      this.setData({ historyId: saved.id });
    }
  },

  handleChatTap() {
    const { readings, historyId } = this.data;
    const allCompleted = readings.every(r => r.status === 'completed');

    if (!allCompleted) {
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
  }
});
