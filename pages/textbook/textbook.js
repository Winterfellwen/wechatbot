Page({
  data: {
    textbooks: [
      { id: 1, name: '第1册', title: '新编日语教程第一册', progress: 0 },
      { id: 2, name: '第2册', title: '新编日语教程第二册', progress: 0 },
      { id: 3, name: '第3册', title: '新编日语教程第三册', progress: 0 },
      { id: 4, name: '第4册', title: '新编日语教程第四册', progress: 0 },
      { id: 5, name: '第5册', title: '新编日语教程第五册', progress: 0 }
    ]
  },

  onLoad() {
    this.loadProgress();
  },

  onShow() {
    this.loadProgress();
  },

  loadProgress() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.openid) {
      return;
    }
    const bookProgress = wx.getStorageSync('bookProgress') || {};
    const textbooks = this.data.textbooks.map(b => ({
      ...b,
      progress: bookProgress[b.id] || 0
    }));
    this.setData({ textbooks });
  },

  openBook(e) {
    const id = e.currentTarget.dataset.id;
    const pdfFiles = [
      '新编日语教程第一册.pdf',
      '新编日语教程第二册.pdf',
      '新编日语教程第三册.pdf',
      '新编日语教程第四册.pdf',
      '新编日语教程第五册.pdf'
    ];
    const fileName = pdfFiles[id - 1];
    
    wx.showModal({
      title: '选择打开方式',
      content: fileName,
      confirmText: '小程序内打开',
      cancelText: '系统阅读器',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: `/pages/pdfviewer/pdfviewer?file=${fileName}`
          });
        } else {
          this.openInSystem(fileName);
        }
      }
    });
  },

  openInSystem(fileName) {
    wx.showToast({
      title: '请在手机文件管理中打开',
      icon: 'none'
    });
  },

  openResource(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'words') {
      wx.navigateTo({
        url: '/pages/wordbook/wordbook'
      });
    } else if (type === 'kanji') {
      wx.navigateTo({
        url: '/pages/grammar/grammar'
      });
    } else if (type === 'course') {
      wx.showToast({
        title: '视频课程开发中',
        icon: 'none'
      });
    }
  }
});