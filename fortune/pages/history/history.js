// fortune/pages/history/history.js
const storageService = require('../../services/storage-service');

Page({
  data: {
    history: [],
    isEmpty: true
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    this.loadHistory();
  },

  loadHistory() {
    const history = storageService.getHistory();
    this.setData({
      history: history,
      isEmpty: history.length === 0
    });
  },

  handleItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/fortune/pages/reading/reading?mode=view&id=${id}`
    });
  },

  handleDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          storageService.deleteHistory(id);
          this.loadHistory();
          wx.showToast({ title: '删除成功', icon: 'success' });
        }
      }
    });
  },

  handleClear() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          storageService.clearHistory();
          this.loadHistory();
          wx.showToast({ title: '清空成功', icon: 'success' });
        }
      }
    });
  },

  handleBack() {
    wx.navigateBack();
  }
});
