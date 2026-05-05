const API_BASE = 'https://wechatbot-g6ez.onrender.com';

Page({
  data: {
    jobId: '',
    reviewing: false,
    htmlContent: ''
  },

  onLoad: function(options) {
    const jobId = options.jobId || '';
    this.setData({ jobId: jobId });
    this.loadHtml();
  },

  loadHtml: function() {
    const that = this;
    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: API_BASE + '/api/aidoc/html/' + this.data.jobId + '.html',
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          that.setData({ htmlContent: res.data });
        }
      },
      fail: () => {
        wx.hideLoading();
      }
    });
  },

  openPdf: function() {
    const that = this;
    wx.showLoading({ title: '生成PDF...' });

    wx.request({
      url: API_BASE + '/api/aidoc/export',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        html_content: this.data.htmlContent || '',
        format: 'pdf'
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.file_base64) {
          const fs = wx.getFileSystemManager();
          const filePath = wx.env.USER_DATA_PATH + '/document_' + this.data.jobId + '.pdf';

          fs.writeFile({
            filePath: filePath,
            data: res.data.file_base64,
            encoding: 'base64',
            success: () => {
              wx.openDocument({
                filePath: filePath,
                fileType: 'pdf',
                success: () => {
                  wx.showToast({ title: '已打开PDF', icon: 'success' });
                },
                fail: (err) => {
                  console.error('Open failed:', err);
                  wx.saveFile({
                    tempFilePath: filePath,
                    success: () => {
                      wx.showToast({ title: '已保存到文件', icon: 'success' });
                    },
                    fail: () => {
                      wx.showToast({ title: '打开失败', icon: 'none' });
                    }
                  });
                }
              });
            },
            fail: () => {
              wx.showToast({ title: '生成失败', icon: 'none' });
            }
          });
        } else {
          wx.showToast({ title: '生成失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  aiReview: function() {
    if (!this.data.htmlContent || this.data.reviewing) return;

    const that = this;
    this.setData({ reviewing: true });
    wx.showLoading({ title: 'AI修正中...' });

    wx.request({
      url: API_BASE + '/api/aidoc/ai-review',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        html_content: this.data.htmlContent,
        instructions: '检查并修复文档格式问题，使其更美观易读'
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.status === 'done') {
          that.setData({ htmlContent: res.data.corrected_html });
          wx.showToast({ title: 'AI修正完成', icon: 'success' });
        } else {
          wx.showToast({ title: '修正失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        that.setData({ reviewing: false });
      }
    });
  }
});