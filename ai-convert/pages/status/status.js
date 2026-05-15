const CONFIG = require('../../../utils/config');
const app = getApp();

Page({
  data: {
    jobId: '',
    fileName: '',
    targetFormat: '',
    mode: '',
    modeText: '',
    status: 'pending',
    statusText: '排队中...',
    downloadUrl: '',
    errorMsg: '',
    timer: null,
  },

  onLoad(options) {
    const records = wx.getStorageSync('ai_convert_records') || [];
    const record = records.find(r => r.jobId === options.jobId);
    const modeMap = { polish: '润色', format: '格式化', summarize: '摘要' };

    this.setData({
      jobId: options.jobId,
      fileName: record ? record.fileName : '',
      targetFormat: record ? record.targetFormat : '',
      mode: record ? record.mode : '',
      modeText: record ? modeMap[record.mode] || record.mode : '',
    });

    this.startPolling();
  },

  startPolling() {
    const that = this;
    that.data.timer = setInterval(() => {
      wx.request({
        url: CONFIG.SERVER + '/api/doc-ai/status/' + that.data.jobId,
        success(res) {
          if (res.data.status === 'done') {
            clearInterval(that.data.timer);
            that.setData({
              status: 'done',
              statusText: '转换完成',
              downloadUrl: CONFIG.SERVER + '/api/doc-ai/download/' + res.data.resultFile,
            });
            that.updateRecord('done', res.data.resultFile);
          } else if (res.data.status === 'error') {
            clearInterval(that.data.timer);
            that.setData({
              status: 'error',
              statusText: '转换失败',
              errorMsg: res.data.error || '未知错误',
            });
            that.updateRecord('error');
          } else if (res.data.status === 'processing') {
            that.setData({ status: 'processing', statusText: 'AI 处理中...' });
          }
        },
        fail() {
          // silent
        },
      });
    }, 3000);
  },

  updateRecord(status, resultUrl) {
    const records = wx.getStorageSync('ai_convert_records') || [];
    for (let i = 0; i < records.length; i++) {
      if (records[i].jobId === this.data.jobId) {
        records[i].status = status;
        if (resultUrl) records[i].resultUrl = resultUrl;
        break;
      }
    }
    wx.setStorageSync('ai_convert_records', records);
  },

  download() {
    const that = this;
    wx.downloadFile({
      url: that.data.downloadUrl,
      success(res) {
        if (res.statusCode === 200) {
          const fs = wx.getFileSystemManager();
          const ext = '.' + that.data.targetFormat;
          const savedPath = wx.env.USER_DATA_PATH + '/' + that.data.fileName.replace(/\.[^.]+$/, '') + ext;
          try { fs.saveFileSync(res.tempFilePath, savedPath); } catch (e) { /* ok */ }
          wx.openDocument({
            filePath: savedPath,
            success() {
              that.updateRecord('done', null);
            },
          });
        }
      },
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onUnload() {
    if (this.data.timer) clearInterval(this.data.timer);
  },
});
