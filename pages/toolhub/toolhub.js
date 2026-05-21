Page({
  data: {
    entries: [
      { type: 'word', title: 'Word编辑', desc: '文档编辑工具', icon: '/images/icon-word.png', bgClass: 'bg-word' },
      { type: 'pdf', title: 'PDF工具', desc: 'PDF处理工具', icon: '/images/icon-pdf.png', bgClass: 'bg-pdf' }
    ]
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
