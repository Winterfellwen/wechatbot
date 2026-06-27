const storageService = require('../../services/storage-service');
const aiService = require('../../services/ai-service');

Page({
  data: {
    category: '',
    categoryName: '',
    profile: null,
    readings: [],
    isViewMode: false,
    historyId: null
  },

  onLoad(options) {
    const category = options.category || 'chinese';
    const categoryName = category === 'chinese' ? '易学命理' : '西方星象';

    if (options.mode === 'view' && options.id) {
      this.loadHistoryReading(options.id);
    } else {
      this.startNewReading(category, categoryName);
    }
  },

  loadHistoryReading(id) {
    const record = storageService.getHistoryById(id);
    if (record) {
      this.setData({
        category: record.category,
        categoryName: record.category === 'chinese' ? '易学命理' : '西方星象',
        profile: record.profile,
        readings: record.results.map(r => ({
          type: r.type,
          typeName: r.typeName,
          content: r.content,
          status: 'completed'
        })),
        isViewMode: true,
        historyId: id
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

    this.setData({
      category,
      categoryName,
      profile,
      readings: types.map(t => ({
        ...t,
        content: '',
        status: 'pending'
      }))
    });

    this.startStreamReadings();
  },

  startStreamReadings() {
    const { category, profile } = this.data;

    aiService.streamReadings(
      category,
      profile,
      // onReadingStart — 全部同时变loading
      (type, typeName) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], status: 'loading', content: '' };
          this.setData({ readings });
        }
      },
      // onChunk — 打字效果
      (type, content) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], content, status: 'streaming' };
          this.setData({ readings });
        }
      },
      // onReadingComplete — 单个卡片完成
      (type, typeName, content) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], content, status: 'completed' };
          this.setData({ readings });
        }
      },
      // onAllComplete
      () => {
        this.saveToHistory();
      },
      // onError
      (type, err) => {
        console.error('Reading error:', type, err);
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], status: 'error' };
          this.setData({ readings });
        }
      }
    );
  },

  handleRetry(e) {
    const type = e.currentTarget.dataset.type;
    const { category, profile } = this.data;

    const readings = [...this.data.readings];
    const index = readings.findIndex(r => r.type === type);
    if (index >= 0) {
      readings[index] = { ...readings[index], status: 'loading', content: '' };
      this.setData({ readings });
    }

    const typeName = readings[index].typeName;
    const prompt = aiService.buildReadingPrompt(type, profile);
    let content = '';

    aiService.streamAI(prompt,
      (chunk) => {
        content += chunk;
        const readings = [...this.data.readings];
        const idx = readings.findIndex(r => r.type === type);
        if (idx >= 0) {
          readings[idx] = { ...readings[idx], content, status: 'streaming' };
          this.setData({ readings });
        }
      },
      () => {
        const readings = [...this.data.readings];
        const idx = readings.findIndex(r => r.type === type);
        if (idx >= 0) {
          readings[idx] = { ...readings[idx], content, status: 'completed' };
          this.setData({ readings });
        }
        this.saveToHistory();
      },
      (err) => {
        console.error('Retry error:', err);
        const readings = [...this.data.readings];
        const idx = readings.findIndex(r => r.type === type);
        if (idx >= 0) {
          readings[idx] = { ...readings[idx], status: 'error' };
          this.setData({ readings });
        }
      }
    );
  },

  saveToHistory() {
    const { category, profile, readings } = this.data;
    const record = {
      category,
      profile,
      results: readings.map(r => ({
        type: r.type,
        typeName: r.typeName,
        content: r.content
      }))
    };
    storageService.addHistory(record);
  },

  handleChatTap() {
    const { readings, historyId } = this.data;
    const allCompleted = readings.every(r => r.status === 'completed');

    if (!allCompleted) {
      wx.showToast({ title: '请等待测算完成', icon: 'none' });
      return;
    }

    let id = historyId;
    if (!id) {
      const history = storageService.getHistory();
      if (history.length > 0) {
        id = history[0].id;
      }
    }

    wx.navigateTo({
      url: `/fortune/pages/chat/chat?readingId=${id}`
    });
  },

  handleBack() {
    wx.navigateBack();
  }
});
