Page({
  data: {
    category: '',
    types: []
  },

  onLoad(options) {
    const category = options.category || 'chinese';
    this.setData({ category });
    
    const types = this.getTypesByCategory(category);
    this.setData({ types });
  },

  getTypesByCategory(category) {
    const typesMap = {
      chinese: [
        { type: 'yijing', name: '易经卦象', icon: '☯', desc: '基于易经六十四卦的占卜分析' },
        { type: 'bazi', name: '八字命理', icon: '八字', desc: '基于出生年月日时的八字分析' },
        { type: 'ziwei', name: '紫微斗数', icon: '紫微', desc: '中国传统紫微斗数命盘分析' }
      ],
      western: [
        { type: 'constellation', name: '星座分析', icon: '♈', desc: '十二星座的性格分析、运势预测' },
        { type: 'tarot', name: '塔罗占卜', icon: '🃏', desc: '塔罗牌阵解读' },
        { type: 'astrology', name: '占星术', icon: '🌟', desc: '行星位置、相位分析' }
      ]
    };
    
    return typesMap[category] || typesMap.chinese;
  },

  handleTypeTap(e) {
    const type = e.detail.type;
    wx.navigateTo({
      url: `/fortune/pages/input/input?type=${type}`
    });
  }
});
