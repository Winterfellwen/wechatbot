var loginLib = require('../../../utils/login');
var demoMenus = require('../../data/demo-menus');

Page({
  data: {
    merchants: [],
    loading: true,
    selectedMerchantId: '',
    showCreateModal: false,
    newMerchantName: '',
    newMerchantDesc: '',
    creating: false,
    copyFromDemo: false,
    demoMerchants: [],
    selectedDemoMerchantId: ''
  },

  onLoad: function() {
    this.loadMerchants();
  },

  onShow: function() {
    if (!loginLib.isLoggedIn()) {
      wx.showModal({
        title: '需要注册',
        content: '使用AI点菜需要先注册账号',
        confirmText: '去注册',
        cancelText: '返回',
        success: function(res) {
          if (res.confirm) wx.switchTab({ url: '/pages/user/user' });
          else wx.navigateBack({ delta: 1 });
        }
      });
      return;
    }
    if (this.data.merchants.length > 0) {
      this.loadMerchants();
    }
  },

  loadMerchants: function() {
    var that = this;
    if (!loginLib.isLoggedIn()) {
      that.setData({ loading: false, merchants: [] });
      return;
    }
    that._fetchMerchants();
  },

  _loadLocalDemo: function() {
    var list = demoMenus.getMerchantList();
    var selectedId = list.length > 0 ? list[0].id : '';
    this.setData({ merchants: list, selectedMerchantId: selectedId, loading: false });
    if (selectedId) wx.setStorageSync('ai-order-merchant-id', selectedId);
  },

  _fetchMerchants: function() {
    var that = this;
    that.setData({ loading: true });

    // 安全超时：8 秒无响应自动 fallback 到本地演示数据
    var safetyTimer = setTimeout(function() {
      if (that.data.loading) {
        that._loadLocalDemo();
        wx.showToast({ title: '服务器响应超时，使用本地数据', icon: 'none' });
      }
    }, 8000);

    loginLib.callCloud('ai-order-merchant', { action: 'list' })
      .then(function(data) {
        clearTimeout(safetyTimer);
        var list = (data && data.data) || [];
        // 始终在列表末尾追加 demo 商家，方便浏览
        var demoList = demoMenus.getMerchantList();
        for (var di = 0; di < demoList.length; di++) {
          var isDup = false;
          for (var ri = 0; ri < list.length; ri++) {
            if (list[ri].id === demoList[di].id) { isDup = true; break; }
          }
          if (!isDup) list.push(demoList[di]);
        }
        if (list.length === 0) { that._loadLocalDemo(); return; }
        var savedId = wx.getStorageSync('ai-order-merchant-id') || '';
        var selectedId = '';
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === savedId) { selectedId = savedId; break; }
        }
        if (!selectedId) selectedId = list[0].id;
        that.setData({ merchants: list, selectedMerchantId: selectedId, loading: false });
        if (selectedId) wx.setStorageSync('ai-order-merchant-id', selectedId);
      })
      .catch(function() {
        clearTimeout(safetyTimer);
        that._loadLocalDemo();
        wx.showToast({ title: '使用本地演示数据', icon: 'none' });
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
    var demoList = demoMenus.getMerchantList();
    this.setData({
      showCreateModal: true,
      newMerchantName: '',
      newMerchantDesc: '',
      creating: false,
      copyFromDemo: false,
      demoMerchants: demoList,
      selectedDemoMerchantId: demoList.length > 0 ? demoList[0].id : ''
    });
  },

  onHideCreate: function() {
    this.setData({ showCreateModal: false, creating: false });
  },

  noop: function() {},

  onNewNameInput: function(e) {
    this.setData({ newMerchantName: e.detail.value });
  },

  onNewDescInput: function(e) {
    this.setData({ newMerchantDesc: e.detail.value });
  },

  onToggleCopyDemo: function() {
    this.setData({ copyFromDemo: !this.data.copyFromDemo });
  },

  onSelectDemoMerchant: function(e) {
    this.setData({ selectedDemoMerchantId: e.currentTarget.dataset.id });
  },

  onCreateMerchant: function() {
    var that = this;
    if (that.data.creating) return;
    var name = that.data.newMerchantName.trim();
    if (!name) { wx.showToast({ title: '请输入商家名称', icon: 'none' }); return; }
    var copyFromDemo = that.data.copyFromDemo;
    var selectedDemoId = that.data.selectedDemoMerchantId;
    that.setData({ creating: true });
    loginLib.callCloud('ai-order-merchant', {
      action: 'create',
      name: name,
      description: that.data.newMerchantDesc.trim()
    })
      .then(function(data) {
        if (data) {
          var newMerchant = data.data;
          if (copyFromDemo && selectedDemoId && newMerchant && newMerchant.id) {
            // 从演示商家复制菜单
            var demo = demoMenus.getMerchant(selectedDemoId);
            if (demo && demo.dishes) {
              var ts = Date.now();
              var dishes = demo.dishes.map(function(d, idx) {
                return {
                  id: d.id || ('dish-' + ts + '-' + idx),
                  name: d.name,
                  price: d.price,
                  image: d.image || '',
                  description: d.description || '',
                  taste: d.taste || '',
                  spicyLevel: d.spicyLevel || 0,
                  status: 'online',
                  category: d.category || ''
                };
              });
              loginLib.callCloud('ai-order-menu', {
                action: 'save',
                merchantId: newMerchant.id,
                menu: { dishes: dishes }
              }).then(function() {
                wx.showToast({ title: '创建成功，已复制演示菜单', icon: 'success' });
                // 直接更新本地列表，带上正确的菜品数量，避免服务器不返回 dishCount 导致显示 0
                var newEntry = {
                  id: newMerchant.id,
                  name: newMerchant.name,
                  description: newMerchant.description || '',
                  dishCount: dishes.length
                };
                var updatedList = [newEntry].concat(that.data.merchants);
                that.setData({
                  showCreateModal: false,
                  creating: false,
                  merchants: updatedList,
                  selectedMerchantId: newMerchant.id
                });
                wx.setStorageSync('ai-order-merchant-id', newMerchant.id);
              }).catch(function() {
                wx.showToast({ title: '创建成功，菜单复制失败', icon: 'none' });
                that.setData({ showCreateModal: false, creating: false });
                that._fetchMerchants();
              });
              return;
            }
          }
          wx.showToast({ title: '创建成功', icon: 'success' });
          that.setData({ showCreateModal: false, creating: false });
          that._fetchMerchants();
        } else {
          wx.showToast({ title: (data && data.error) || '创建失败', icon: 'none' });
          that.setData({ creating: false });
        }
      })
      .catch(function() {
        wx.showToast({ title: '网络错误', icon: 'none' });
        that.setData({ creating: false });
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
        loginLib.callCloud('ai-order-merchant', { action: 'delete', id: id })
          .then(function(data) {
            if (data) {
              wx.showToast({ title: '已删除', icon: 'success' });
              that._fetchMerchants();
            } else {
              wx.showToast({ title: (data && data.error) || '删除失败', icon: 'none' });
            }
          })
          .catch(function(err) {
            var msg = (err && err.error) || '网络错误';
            wx.showToast({ title: msg, icon: 'none', duration: 2500 });
          });
      }
    });
  }
});
