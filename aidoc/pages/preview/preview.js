const API_BASE = 'https://wechatbot-g6ez.onrender.com';

Page({
  data: {
    jobId: '',
    htmlUrl: '',
    editUrl: '',
    editMode: false,
    loading: true
  },

  onLoad: function(options) {
    const jobId = options.jobId || '';
    this.setData({
      jobId: jobId,
      htmlUrl: API_BASE + '/api/aidoc/html/' + jobId + '.html',
      editUrl: API_BASE + '/api/aidoc/edit/' + jobId + '.html'
    });
    // 等待一下让web-view加载
    setTimeout(() => {
      this.setData({ loading: false });
    }, 1000);
  },

  toggleEdit: function() {
    this.setData({ editMode: !this.data.editMode });
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
        html_content: '', // 后端会从文件中获取
        format: format,
        job_id: this.data.jobId
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.file_base64) {
          const fs = wx.getFileSystemManager();
          const filePath = wx.env.USER_DATA_PATH + '/exported.' + format;

          fs.writeFile({
            filePath: filePath,
            data: res.data.file_base64,
            encoding: 'base64',
            success: () => {
              wx.openDocument({
                filePath: filePath,
                fileType: format,
                success: () => {
                  wx.showToast({ title: '导出成功', icon: 'success' });
                },
                fail: () => {
                  wx.saveFile({
                    tempFilePath: filePath,
                    success: () => wx.showToast({ title: '已保存', icon: 'success' }),
                    fail: () => wx.showToast({ title: '保存失败', icon: 'none' })
                  });
                }
              });
            },
            fail: () => wx.showToast({ title: '导出失败', icon: 'none' })
          });
        } else {
          wx.showToast({ title: '导出失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
});