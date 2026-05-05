const API_BASE = 'https://wechatbot-g6ez.onrender.com';

Page({
  data: {
    jobId: '',
    html: '',
    htmlNodes: '',
    reviewing: false,
    loading: true
  },

  onLoad: function(options) {
    const jobId = options.jobId || '';
    this.setData({ jobId: jobId });
    this.loadHtml(jobId);
  },

  loadHtml: function(jobId) {
    const that = this;
    this.setData({ loading: true });

    wx.request({
      url: API_BASE + '/api/aidoc/html/' + jobId + '.html',
      success: (res) => {
        console.log('HTML load response:', res.statusCode, res.data);
        if (res.statusCode === 200) {
          let html = res.data;
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          if (bodyMatch) {
            html = bodyMatch[1];
          }

          that.setData({
            html: res.data,
            htmlNodes: html,
            loading: false
          });
        } else {
          wx.showToast({ title: '加载失败: ' + res.statusCode, icon: 'none' });
          that.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('HTML load error:', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
        that.setData({ loading: false });
      }
    });
  },

  aiReview: function() {
    if (!this.data.html || this.data.reviewing) return;

    const that = this;
    this.setData({ reviewing: true });

    wx.showLoading({ title: 'AI修正中...' });

    wx.request({
      url: API_BASE + '/api/aidoc/ai-review',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        html_content: this.data.html,
        instructions: '检查HTML内容，修复布局问题，调整图片大小，确保格式正确，修复可能的HTML语法错误。'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.status === 'done') {
          that.setData({
            html: res.data.corrected_html,
            htmlNodes: res.data.corrected_html
          });

          const history = wx.getStorageSync('aidoc_history') || [];
          const idx = history.findIndex(h => h.jobId === that.data.jobId);
          if (idx >= 0) {
            history[idx].html = res.data.corrected_html;
            history[idx].status = '已修正';
            wx.setStorageSync('aidoc_history', history);
          }

          wx.showToast({ title: 'AI修正完成', icon: 'success' });
        } else {
          wx.showToast({ title: '修正失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('AI review failed:', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      },
      complete: () => {
        that.setData({ reviewing: false });
        wx.hideLoading();
      }
    });
  },

  showExportMenu: function() {
    wx.showActionSheet({
      itemList: ['导出为 PDF', '导出为 DOCX', '导出为 DOC'],
      success: (res) => {
        const format = ['pdf', 'docx', 'doc'][res.tapIndex];
        this.exportFile(format);
      }
    });
  },

  exportFile: function(format) {
    const that = this;

    wx.showLoading({ title: '导出中...' });

    wx.request({
      url: API_BASE + '/api/aidoc/export',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        html_content: this.data.html,
        format: format
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.file_base64) {
          const fs = wx.getFileSystemManager();
          const filePath = wx.env.USER_DATA_PATH + '/exported.' + format;

          fs.writeFile({
            filePath: filePath,
            data: res.data.file_base64,
            encoding: 'base64',
            success: () => {
              wx.saveFile({
                tempFilePath: filePath,
                success: (saveRes) => {
                  wx.showToast({ title: '导出成功', icon: 'success' });
                },
                fail: (err) => {
                  console.error('Save file failed:', err);
                  wx.showToast({ title: '保存失败', icon: 'none' });
                }
              });
            },
            fail: (err) => {
              console.error('Write file failed:', err);
              wx.showToast({ title: '写入失败', icon: 'none' });
            }
          });
        } else {
          wx.showToast({ title: '导出失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('Export failed:', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
});