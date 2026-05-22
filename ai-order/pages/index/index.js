var loginLib = require('../../../utils/login');
var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;
var demoData = require('../../data/demo-menus');

Page({
  data: {
    merchants: [],
    loading: true,
    selectedMerchantId: '',
    showCreateModal: false,
    newMerchantName: '',
    newMerchantDesc: '',
    creating: false
  },

  onLoad: function() {
    this.loadMerchants();
  },

  onShow: function() {
    if (this.data.merchants.length > 0) {
      this.loadMerchants();
    }
  },

  loadMerchants: function() {
    var that = this;
    if (!loginLib.isLoggedIn()) {
      that._loadLocalDemo();
      return;
    }
    that._fetchMerchants();
  },

  _loadLocalDemo: function() {
    var list = (demoData && demoData.merchants || []).map(function(m) {
      return { id: m.id, name: m.name, description: m.name + '（演示商家）', type: 'demo', dishCount: (m.dishes || []).length };
    });
    var selectedId = list.length > 0 ? list[0].id : '';
    this.setData({ merchants: list, selectedMerchantId: selectedId, loading: false });
    if (selectedId) wx.setStorageSync('ai-order-merchant-id', selectedId);
  },

  _fetchMerchants: function() {
    var that = this;
    that.setData({ loading: true });
    wx.request({
      url: SERVER + '/api/ai-order/merchants',
      header: { 'Authorization': 'Bearer ' + wx.getStorageSync('auth_token') },
      success: function(res) {
        var list = (res.data && res.data.success && res.data.data) || [];
        if (list.length === 0) { that._loadLocalDemo(); return; }
        var savedId = wx.getStorageSync('ai-order-merchant-id') || '';
        var selectedId = '';
        if (list.length > 0) {
          var found = false;
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === savedId) { found = true; selectedId = savedId; break; }
          }
          if (!found) selectedId = list[0].id;
        }
        that.setData({ merchants: list, selectedMerchantId: selectedId, loading: false });
        if (selectedId) wx.setStorageSync('ai-order-merchant-id', selectedId);
      },
      fail: function() {
        that._loadLocalDemo();
        wx.showToast({ title: '使用本地演示数据', icon: 'none' });
      }
    });
  },

  onSelectMerchant: function(e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    this.setData({ selectedMerchantId: id });
    wx.setStorageSync('ai-order-merchant-id', id);
  },

  getSelectedMerchant: function() {
    var list = this.data.merchants;
    var id = this.data.selectedMerchantId;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list.length > 0 ? list[0] : null;
  },

  onEnterMerchant: function() {
    var merchant = this.getSelectedMerchant();
    if (!merchant) {
      wx.showToast({ title: '请先选择或创建商家', icon: 'none' });
      return;
    }
    var user = wx.getStorageSync('auth_user') || {};
    wx.setStorageSync('ai-order-merchant-name', merchant.name);
    wx.navigateTo({
      url: '/ai-order/pages/merchant/merchant?merchantId=' + merchant.id + '&userId=' + (user.openid || '')
    });
  },

  onEnterCustomer: function() {
    var merchant = this.getSelectedMerchant();
    if (!merchant) {
      wx.showToast({ title: '请先选择或创建商家', icon: 'none' });
      return;
    }
    wx.setStorageSync('ai-order-merchant-name', merchant.name);
    wx.navigateTo({
      url: '/ai-order/pages/customer/customer?merchantId=' + merchant.id
    });
  },

  onShowCreate: function() {
    this.setData({ showCreateModal: true, newMerchantName: '', newMerchantDesc: '' });
  },

  onHideCreate: function() {
    this.setData({ showCreateModal: false });
  },

  onNewNameInput: function(e) {
    this.setData({ newMerchantName: e.detail.value });
  },

  onNewDescInput: function(e) {
    this.setData({ newMerchantDesc: e.detail.value });
  },

  onCreateMerchant: function() {
    var that = this;
    var name = that.data.newMerchantName.trim();
    if (!name) { wx.showToast({ title: '请输入商家名称', icon: 'none' }); return; }
    that.setData({ creating: true });
    wx.request({
      url: SERVER + '/api/ai-order/merchants',
      method: 'POST',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('auth_token'),
        'Content-Type': 'application/json'
      },
      data: { name: name, description: that.data.newMerchantDesc.trim() },
      success: function(res) {
        if (res.data && res.data.success) {
          wx.showToast({ title: '创建成功', icon: 'success' });
          that.setData({ showCreateModal: false, creating: false });
          that._fetchMerchants();
        } else {
          wx.showToast({ title: res.data && res.data.error || '创建失败', icon: 'none' });
          that.setData({ creating: false });
        }
      },
      fail: function() {
        wx.showToast({ title: '网络错误', icon: 'none' });
        that.setData({ creating: false });
      }
    });
  },

  onDeleteMerchant: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var name = '';
    var list = that.data.merchants;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { name = list[i].name; break; }
    }
    wx.showModal({
      title: '删除商家',
      content: '确定删除「' + name + '」吗？',
      success: function(confirm) {
        if (!confirm.confirm) return;
        wx.request({
          url: SERVER + '/api/ai-order/merchants/' + id,
          method: 'DELETE',
          header: { 'Authorization': 'Bearer ' + wx.getStorageSync('auth_token') },
          success: function(res) {
            if (res.data && res.data.success) {
              wx.showToast({ title: '已删除', icon: 'success' });
              that._fetchMerchants();
            } else {
              wx.showToast({ title: res.data && res.data.error || '删除失败', icon: 'none' });
            }
          },
          fail: function() {
            wx.showToast({ title: '网络错误', icon: 'none' });
          }
        });
      }
    });
  }
});
