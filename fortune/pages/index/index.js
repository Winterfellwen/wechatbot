const storageService = require('../../services/storage-service');

Page({
  data: {
    profile: null,
    showProfileForm: false,
    chineseMethods: [
      { name: '八字', desc: '四柱八字推算命运格局' },
      { name: '紫微', desc: '紫微斗数剖析人生轨迹' },
      { name: '易经', desc: '卦象阴阳五行解疑释惑' }
    ],
    westernMethods: [
      { name: '星座', desc: '十二星座性格基本分析' },
      { name: '占星', desc: '星盘行星宫位综合推演' }
    ]
  },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    this.loadProfile();
  },

  loadProfile() {
    const profile = storageService.getProfile();
    this.setData({ profile });
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
      url: '/fortune/pages/reading/reading?category=' + category
    });
  },

  handleHistoryTap() {
    wx.navigateTo({
      url: '/fortune/pages/history/history'
    });
  },

  handleTarotTap() {
    wx.navigateTo({
      url: '/fortune/pages/tarot/tarot'
    });
  }
});
