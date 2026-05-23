Page({
  data: {
    entries: [
      { type: 'word', title: 'Word编辑', desc: '文档编辑工具', icon: '/images/icon-word.png', bgClass: 'bg-word' },
      { type: 'pdf', title: 'PDF工具', desc: 'PDF处理工具', icon: '/images/icon-pdf-v2.png', bgClass: 'bg-pdf' }
    ],
    heroIcon: ''
  },

  onLoad: function () {
    this.setData({ heroIcon: this._getHeroIcon() });
  },

  _getHeroIcon: function () {
    function s(str) { return 'data:image/svg+xml,' + encodeURIComponent(str); }
    return s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="a" x1="0" y1="0" x2="100" y2="100"><stop offset="0" stop-color="#2DD4BF"/><stop offset="100" stop-color="#0D9488"/></linearGradient></defs><rect x="14" y="14" width="72" height="72" rx="20" fill="url(#a)"/><rect x="14" y="14" width="72" height="72" rx="20" fill="none" stroke="white" stroke-width="3" opacity="0.3"/><rect x="44" y="28" width="12" height="44" rx="5" fill="white" opacity="0.9"/><rect x="28" y="44" width="44" height="12" rx="5" fill="white" opacity="0.9"/></svg>');
  },

  handleEntryTap: function (e) {
    var type = e.currentTarget.dataset.type;
    if (type === 'word') {
      wx.navigateTo({ url: '/word/pages/index/index' });
    } else if (type === 'pdf') {
      wx.navigateTo({ url: '/pdf/pages/index/index' });
    }
  }
});
