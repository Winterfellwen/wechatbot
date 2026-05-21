Page({
  data: {
    entries: [
      { type: 'japanese', title: '日语学习', desc: '日语学习好帮手', icon: '/images/icon-japanese.png', bgClass: 'bg-japanese', cardClass: 'card-japanese' },
      { type: 'german', title: '德语学习', desc: '德语学习好帮手', icon: '/images/icon-german.png', bgClass: 'bg-german', cardClass: 'card-german' }
    ]
  },

  handleEntryTap: function (e) {
    var type = e.currentTarget.dataset.type;
    if (type === 'japanese') {
      wx.navigateTo({ url: '/japanese/pages/learn/learn' });
    } else if (type === 'german') {
      wx.navigateTo({ url: '/german/pages/learn/learn' });
    }
  }
});
