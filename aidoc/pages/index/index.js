const app = getApp();
const API_BASE = 'https://wechatbot-g6ez.onrender.com';

Page({
  data: {
    currentFile: null,
    converting: false,
    history: []
  },

  onLoad: function() {
    const history = wx.getStorageSync('aidoc_history') || [];
    this.setData({ history: history.slice(0, 10) });
  },

  chooseFile: function() {
    wx.showActionSheet({
      itemList: ['PDF文件', 'DOCX文件'],
      success: (res) => {
        const type = res.tapIndex === 0 ? 'pdf' : 'docx';
        wx.chooseMessageFile({
          count: 1,
          type: 'file',
          extension: type === 'pdf' ? ['pdf'] : ['docx', 'doc'],
          success: (result) => {
            const file = result.tempFiles[0];
            const size = (file.size / 1024 / 1024).toFixed(2);
            this.setData({
              currentFile: {
                name: file.name,
                size: size + ' MB',
                path: file.path,
                type: type
              }
            });
          },
          fail: (err) => {
            console.error('Choose file failed:', err);
            wx.showToast({ title: '选择文件失败', icon: 'none' });
          }
        });
      }
    });
  },

  startConvert: function() {
    if (!this.data.currentFile) return;

    const that = this;
    const filename = this.data.currentFile.name;

    this.setData({ converting: true });
    wx.showLoading({ title: '上传中...' });

    wx.uploadFile({
      url: API_BASE + '/api/aidoc/convert-to-html',
      filePath: this.data.currentFile.path,
      name: 'file',
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          if (data.status === 'done') {
            const historyItem = {
              jobId: data.job_id,
              filename: filename,
              html: data.html,
              status: '已完成',
              time: new Date().toLocaleString()
            };

            const history = [historyItem, ...that.data.history];
            that.setData({ history: history });
            wx.setStorageSync('aidoc_history', history);

            wx.navigateTo({
              url: '/aidoc/pages/preview/preview?jobId=' + data.job_id
            });
          } else {
            wx.showToast({ title: '转换失败', icon: 'none' });
          }
        } catch (e) {
          console.error('Parse response failed:', e, res.data);
          wx.showToast({ title: '解析失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('Upload failed:', err);
        wx.showToast({ title: '上传失败', icon: 'none' });
      },
      complete: () => {
        that.setData({ converting: false });
        wx.hideLoading();
      }
    });
  },

  openPreview: function(e) {
    const jobId = e.currentTarget.dataset.jobid;
    const item = this.data.history.find(h => h.jobId === jobId);
    if (item && item.html) {
      wx.navigateTo({
        url: '/aidoc/pages/preview/preview?jobId=' + jobId + '&html=' + encodeURIComponent(item.html)
      });
    }
  }
});