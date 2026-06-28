const storageService = require('../../services/storage-service');
const calcService = require('../../services/calc-service');
const aiService = require('../../services/ai-service');

Page({
  data: {
    profile: null,
    showProfileForm: false,
    dailyFortune: ''
  },

  onLoad() {
    this.loadProfile();
    this.loadDailyFortune();
  },

  onShow() {
    this.loadProfile();
  },

  loadProfile() {
    const profile = storageService.getProfile();
    this.setData({ profile });
  },

  loadDailyFortune() {
    var cache = storageService.getDailyCache();
    var today = new Date().toISOString().slice(0, 10);

    if (cache && cache.date === today && cache.fortune) {
      this.setData({ dailyFortune: cache.fortune });
      return;
    }

    var profile = storageService.getProfile();
    if (!profile) {
      this.setData({ dailyFortune: '完善档案后查看今日运势' });
      return;
    }

    // 用星座生成简要运势
    var conResult = calcService.calcConstellation(profile);
    if (conResult.error) {
      this.setData({ dailyFortune: '今日运势加载中…' });
      return;
    }

    var prompt = '请为' + conResult.sign + '的人生成一句简短的今日运势（30字以内），包含星级评分（★☆）。要求100%中文。';
    aiService.callAI(prompt).then(function(content) {
      var fortune = content.trim().substring(0, 50);
      this.setData({ dailyFortune: fortune });
      storageService.saveDailyCache({ date: today, fortune: fortune });
    }.bind(this)).catch(function() {
      this.setData({ dailyFortune: conResult.sign + ' · 今日宜静心思考' });
    }.bind(this));
  },

  handleShowProfileForm() {
    this.setData({ showProfileForm: true });
  },

  handleCloseProfileForm() {
    this.setData({ showProfileForm: false });
  },

  handleSaveProfile(e) {
    const { profile } = e.detail;
    storageService.saveProfile(profile);
    this.setData({ profile, showProfileForm: false });
    wx.showToast({ title: '档案已保存', icon: 'success' });
    this.loadDailyFortune();
  },

  handleCategoryTap(e) {
    const category = e.currentTarget.dataset.category;

    if (!this.data.profile) {
      wx.showModal({
        title: '提示',
        content: '请先填写档案信息',
        confirmText: '去填写',
        success: (res) => {
          if (res.confirm) {
            this.setData({ showProfileForm: true });
          }
        }
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/reading/reading?category=' + category
    });
  },

  handleHistoryTap() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  }
});
