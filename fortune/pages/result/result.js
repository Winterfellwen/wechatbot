const aiService = require('../../services/ai-service');
const storageService = require('../../services/storage-service');

Page({
  data: {
    type: '',
    typeName: '',
    result: '',
    loading: false,
    error: '',
    userInfo: {}
  },

  onLoad(options) {
    const type = options.type || 'constellation';
    const typeName = this.getTypeName(type);
    
    this.setData({ type, typeName });
    
    const userInfo = {
      birthDate: options.birthDate || '',
      birthTime: options.birthTime || '',
      gender: options.gender || '',
      constellation: options.constellation || ''
    };
    
    const question = options.question || '';
    
    this.setData({ userInfo });
    
    this.generateFortune(userInfo, question);
  },

  getTypeName(type) {
    const nameMap = {
      yijing: '易经卦象',
      bazi: '八字命理',
      ziwei: '紫微斗数',
      constellation: '星座分析',
      tarot: '塔罗占卜',
      astrology: '占星术'
    };
    return nameMap[type] || '运势分析';
  },

  async generateFortune(userInfo, question) {
    this.setData({ loading: true, error: '' });
    
    try {
      console.log('开始生成运势, type:', this.data.type);
      var result = await aiService.generateFortuneWithRetry(
        this.data.type,
        userInfo,
        question
      );
      
      console.log('生成结果:', result);
      this.setData({ result: result || '', loading: false });
      
      this.saveToHistory(userInfo, question, result);
    } catch (error) {
      console.error('生成运势失败:', error);
      this.setData({ 
        error: '生成运势失败，请稍后重试',
        loading: false 
      });
    }
  },

  saveToHistory(userInfo, question, result) {
    const record = {
      type: this.data.type,
      typeName: this.data.typeName,
      userInfo,
      question,
      result
    };
    
    storageService.addHistory(record);
  },

  handleRetry() {
    const question = this.data.userInfo.question || '';
    this.generateFortune(this.data.userInfo, question);
  },

  handleBack() {
    wx.navigateBack();
  },

  handleHome() {
    wx.switchTab({
      url: '/fortune/pages/index/index'
    });
  }
});
