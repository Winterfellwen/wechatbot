Page({
  data: {
    heroIcon: '',
    entries: [
      { type: 'japanese', title: '日语学习', desc: '日语学习好帮手', icon: '', bgClass: 'bg-japanese', cardClass: 'card-japanese' },
      { type: 'german', title: '德语学习', desc: '德语学习好帮手', icon: '', bgClass: 'bg-german', cardClass: 'card-german' }
    ]
  },

  onLoad: function () {
    var icons = this._getIconSrc();
    var entries = this.data.entries;
    entries[0].icon = icons.jp;
    entries[1].icon = icons.de;
    this.setData({ heroIcon: icons.learn, entries: entries });
  },

  _getIconSrc: function () {
    function s(str) { return 'data:image/svg+xml,' + encodeURIComponent(str); }
    return {
      learn: s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="a" x1="0" y1="0" x2="100" y2="100"><stop offset="0" stop-color="#A78BFA"/><stop offset="100" stop-color="#7C3AED"/></linearGradient></defs><rect x="14" y="14" width="72" height="72" rx="20" fill="url(#a)"/><rect x="14" y="14" width="72" height="72" rx="20" fill="none" stroke="white" stroke-width="3" opacity="0.3"/><path d="M50 30 C50 30 32 36 32 44 L32 64 C32 64 40 60 50 60 C60 60 68 64 68 64 L68 44 C68 36 50 30 50 30Z" fill="white" opacity="0.9"/></svg>'),
      jp: s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="a" x1="0" y1="0" x2="100" y2="100"><stop offset="0" stop-color="#FB7185"/><stop offset="100" stop-color="#E11D48"/></linearGradient></defs><rect x="14" y="14" width="72" height="72" rx="20" fill="url(#a)"/><rect x="14" y="14" width="72" height="72" rx="20" fill="none" stroke="white" stroke-width="3" opacity="0.3"/><text x="50" y="62" text-anchor="middle" fill="white" opacity="0.95" font-size="28" font-weight="bold" font-family="Arial">日</text></svg>'),
      de: s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="a" x1="0" y1="0" x2="100" y2="100"><stop offset="0" stop-color="#4ADE80"/><stop offset="100" stop-color="#16A34A"/></linearGradient></defs><rect x="14" y="14" width="72" height="72" rx="20" fill="url(#a)"/><rect x="14" y="14" width="72" height="72" rx="20" fill="none" stroke="white" stroke-width="3" opacity="0.3"/><text x="50" y="62" text-anchor="middle" fill="white" opacity="0.95" font-size="28" font-weight="bold" font-family="Arial">DE</text></svg>')
    };
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
