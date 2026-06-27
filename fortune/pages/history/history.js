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
    const index = e.currentTarget.dataset.index;
    const item = this.data.history[index];
    
    var params = 'type=' + encodeURIComponent(item.type) +
      '&birthDate=' + encodeURIComponent(item.userInfo.birthDate || '') +
      '&birthTime=' + encodeURIComponent(item.userInfo.birthTime || '') +
      '&gender=' + encodeURIComponent(item.userInfo.gender || '') +
      '&constellation=' + encodeURIComponent(item.userInfo.constellation || '') +
      '&question=' + encodeURIComponent(item.question || '');
    
    wx.navigateTo({
      url: '/fortune/pages/result/result?' + params
    });
  },

  handleDelete(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.history[index];
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          storageService.deleteHistory(item.id);
          this.loadHistory();
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
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
          wx.showToast({
            title: '清空成功',
            icon: 'success'
          });
        }
      }
    });
  }
});
