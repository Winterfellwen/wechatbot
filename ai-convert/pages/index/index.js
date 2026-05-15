const CONFIG = require('../../../utils/config');
const app = getApp();

Page({
  data: {
    fileName: '',
    filePath: '',
    targetFormat: 'html',
    mode: 'polish',
    uploading: false,
  },
  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'docx', 'html'],
      success: (res) => {
        const file = res.tempFiles[0];
        this.setData({ fileName: file.name, filePath: file.path });
      },
    });
  },
  selectFormat(e) {
    this.setData({ targetFormat: e.currentTarget.dataset.format });
  },
  selectMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },
  upload() {
    const that = this;
    wx.showLoading({ title: '上传中...' });
    that.setData({ uploading: true });

    wx.uploadFile({
      url: CONFIG.SERVER + '/api/doc-ai/convert',
      filePath: that.data.filePath,
      name: 'file',
      formData: {
        to: that.data.targetFormat,
        mode: that.data.mode,
      },
      success(res) {
        const data = JSON.parse(res.data);
        if (data.job_id) {
          const records = wx.getStorageSync('ai_convert_records') || [];
          records.unshift({
            jobId: data.job_id,
            fileName: that.data.fileName,
            targetFormat: that.data.targetFormat,
            mode: that.data.mode,
            status: 'pending',
            timestamp: Date.now(),
          });
          wx.setStorageSync('ai_convert_records', records);

          wx.navigateTo({
            url: '/ai-convert/pages/status/status?jobId=' + data.job_id,
          });
        } else {
          wx.showToast({ title: data.error || '上传失败', icon: 'none' });
        }
      },
      fail() {
        wx.showToast({ title: '网络异常', icon: 'none' });
      },
      complete() {
        wx.hideLoading();
        that.setData({ uploading: false });
      },
    });
  },
});
