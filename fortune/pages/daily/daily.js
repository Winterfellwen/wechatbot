const aiService = require('../../services/ai-service');
const storageService = require('../../services/storage-service');
const zodiacUtils = require('../../utils/zodiac-utils');

Page({
  data: {
    constellation: '',
    constellationName: '',
    dailyFortune: '',
    loading: false,
    error: ''
  },

  onLoad() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const userInfo = storageService.getUserInfo();
    if (userInfo && userInfo.constellation) {
      this.setData({
        constellation: userInfo.constellation,
        constellationName: userInfo.constellation
      });
      this.generateDailyFortune();
    } else {
      this.setData({
        constellation: '白羊座',
        constellationName: '白羊座'
      });
      this.generateDailyFortune();
    }
  },

  handleConstellationChange(e) {
    const constellations = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
    const constellation = constellations[e.detail.value];
    
    this.setData({
      constellation,
      constellationName: constellation
    });
    
    this.generateDailyFortune();
  },

  async generateDailyFortune() {
    this.setData({ loading: true, error: '' });
    
    try {
      const userInfo = {
        constellation: this.data.constellation
      };
      
      const question = '请分析今日综合运势、爱情运、事业运、财运';
      
      const result = await aiService.generateFortuneWithRetry(
        'constellation',
        userInfo,
        question
      );
      
      this.setData({ dailyFortune: result, loading: false });
    } catch (error) {
      console.error('生成每日运势失败:', error);
      this.setData({ 
        error: '生成每日运势失败，请稍后重试',
        loading: false 
      });
    }
  },

  handleRetry() {
    this.generateDailyFortune();
  }
});
