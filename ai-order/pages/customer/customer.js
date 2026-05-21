// ai-order/pages/customer/customer.js
var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;
var msgIdCounter = 0;

var openRouterConfig = null;
var configLoaded = false;
var configLoading = null;
var menuData = null;

var TASTE_CONFIG = {
  '麻辣': { bg: 'linear-gradient(135deg, #FF4500, #FF6B35)', light: '#FFF0ED' },
  '酸甜': { bg: 'linear-gradient(135deg, #FF8C00, #FFD700)', light: '#FFF8E1' },
  '咸甜': { bg: 'linear-gradient(135deg, #20B2AA, #48D1CC)', light: '#E0F7F5' },
  '清淡': { bg: 'linear-gradient(135deg, #66CDAA, #90EE90)', light: '#E8F5E9' }
};
var TASTE_DEFAULT = { bg: 'linear-gradient(135deg, #A8A8A8, #D0D0D0)', light: '#F5F5F5' };

var FILTER_CATEGORIES = [{ key: '', label: '全部' }, { key: '主食', label: '主食' }, { key: '菜', label: '菜' }, { key: '汤', label: '汤' }];
var FILTER_PRICES = [{ key: '', label: '全部' }, { key: 'low', label: '~¥20' }, { key: 'mid', label: '¥20~¥50' }, { key: 'high', label: '¥50+' }];
var FILTER_TASTES = [{ key: '', label: '全部' }, { key: '麻辣', label: '麻辣' }, { key: '酸甜', label: '酸甜' }, { key: '咸甜', label: '咸甜' }, { key: '清淡', label: '清淡' }];

function initOpenRouter() {
  if (openRouterConfig && configLoaded) return Promise.resolve();
  if (configLoading) return configLoading;
  configLoading = new Promise(function(resolve, reject) {
    wx.request({
      url: SERVER + '/api/ai-order/config',
      timeout: 5000,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.key) {
          openRouterConfig = res.data;
          configLoaded = true;
          configLoading = null;
          resolve();
        } else {
          configLoading = null;
          reject(new Error('Failed to get OpenRouter config'));
        }
      },
      fail: function(err) {
        configLoading = null;
        reject(err);
      }
    });
  });
  return configLoading;
}

Page({
  data: {
    messages: [],
    inputText: '',
    loading: false,
    hasInput: false,
    merchantId: '',

    tasteGroups: [],
    menuLoading: false,
    highlightedDishId: null,
    dishGradientMap: {},

    cart: [],
    totalPrice: 0,
    cartItemCount: 0,
    showCartPanel: false,
    orderNote: '',

    chatExpanded: false,
    chatScrollToId: '',

    quickReplies: ['看看菜单', '有什么推荐', '今天吃啥', '辣的'],

    // Filters
    filterCategory: '',
    filterPrice: '',
    filterTaste: '',
    allDishes: [],
    FILTER_CATEGORIES: [{ key: '', label: '全部' }, { key: '主食', label: '主食' }, { key: '菜', label: '菜' }, { key: '汤', label: '汤' }],
    FILTER_PRICES: [{ key: '', label: '全部' }, { key: 'low', label: '~¥20' }, { key: 'mid', label: '¥20~¥50' }, { key: 'high', label: '¥50+' }],
    FILTER_TASTES: [{ key: '', label: '全部' }, { key: '麻辣', label: '麻辣' }, { key: '酸甜', label: '酸甜' }, { key: '咸甜', label: '咸甜' }, { key: '清淡', label: '清淡' }],

    lastOrder: null,
  },

  onLoad: function(options) {
    var that = this;
    var merchantId = options.merchantId || '';
    msgIdCounter = 0;
    that.setData({ merchantId: merchantId });
    that.addWelcomeMessage();
    that.loadMenu();
    var savedOrder = wx.getStorageSync('ai-order-last-order');
    if (savedOrder && savedOrder.dishes) {
      that.setData({ lastOrder: savedOrder });
    }
    initOpenRouter().catch(function(err) {
      console.warn('[customer] direct mode unavailable, will use proxy fallback:', err);
    });
  },

  loadMenu: function() {
    var that = this;
    that.setData({ menuLoading: true });
    var url = SERVER + '/api/ai-order/menu/list';
    if (that.data.merchantId) {
      url += '?merchantId=' + that.data.merchantId;
    }
    wx.request({
      url: url,
      timeout: 5000,
      success: function(res) {
        that.setData({ menuLoading: false });
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
          var rawMenu = res.data.data;
          menuData = rawMenu;
          var dishes = rawMenu.dishes || [];
          var groups = {};
          var gradientMap = {};
          for (var i = 0; i < dishes.length; i++) {
            var d = dishes[i];
            if (d.status !== 'online') continue;
            var taste = d.taste || '其他';
            if (!groups[taste]) groups[taste] = [];
            var tc = TASTE_CONFIG[taste] || TASTE_DEFAULT;
            d.bgStyle = tc.bg;
            d.avatarChar = d.name.slice(0, 1);
            groups[taste].push(d);
            gradientMap[d.id] = tc.bg;
          }
          var tasteGroups = [];
          var tasteOrder = ['麻辣', '酸甜', '咸甜', '清淡', '其他'];
          for (var t = 0; t < tasteOrder.length; t++) {
            var key = tasteOrder[t];
            if (groups[key] && groups[key].length > 0) {
              var tc = TASTE_CONFIG[key] || TASTE_DEFAULT;
              tasteGroups.push({ taste: key, dishes: groups[key], bgColor: tc.bg, lightColor: tc.light });
            }
          }
          that.setData({ tasteGroups: tasteGroups, dishGradientMap: gradientMap, allDishes: dishes });
        }
      },
      fail: function(err) {
        that.setData({ menuLoading: false });
        console.warn('[customer] failed to load menu:', err);
      }
    });
  },

  _rebuildTasteGroups: function(dishes) {
    var groups = {};
    var gradientMap = {};
    for (var i = 0; i < dishes.length; i++) {
      var d = dishes[i];
      if (d.status !== 'online') continue;
      var taste = d.taste || '其他';
      if (!groups[taste]) groups[taste] = [];
      groups[taste].push(d);
      gradientMap[d.id] = d.bgStyle;
    }
    var tasteGroups = [];
    var tasteOrder = ['麻辣', '酸甜', '咸甜', '清淡', '其他'];
    for (var t = 0; t < tasteOrder.length; t++) {
      var key = tasteOrder[t];
      if (groups[key] && groups[key].length > 0) {
        var tc = TASTE_CONFIG[key] || TASTE_DEFAULT;
        tasteGroups.push({ taste: key, dishes: groups[key], bgColor: tc.bg, lightColor: tc.light });
      }
    }
    return { tasteGroups: tasteGroups, dishGradientMap: gradientMap };
  },

  _applyFilters: function() {
    var dishes = this.data.allDishes;
    var cat = this.data.filterCategory;
    var price = this.data.filterPrice;
    var taste = this.data.filterTaste;
    var filtered = [];
    for (var i = 0; i < dishes.length; i++) {
      var d = dishes[i];
      if (cat && d.category !== cat) continue;
      if (taste && d.taste !== taste) continue;
      if (price === 'low' && d.price >= 20) continue;
      if (price === 'mid' && (d.price < 20 || d.price > 50)) continue;
      if (price === 'high' && d.price <= 50) continue;
      filtered.push(d);
    }
    var result = this._rebuildTasteGroups(filtered);
    this.setData({ tasteGroups: result.tasteGroups });
  },

  onFilterCategory: function(e) {
    this.setData({ filterCategory: e.currentTarget.dataset.key });
    this._applyFilters();
  },
  onFilterPrice: function(e) {
    this.setData({ filterPrice: e.currentTarget.dataset.key });
    this._applyFilters();
  },
  onFilterTaste: function(e) {
    this.setData({ filterTaste: e.currentTarget.dataset.key });
    this._applyFilters();
  },

  addWelcomeMessage: function() {
    var welcomeMsg = {
      id: ++msgIdCounter,
      role: 'ai',
      content: '欢迎使用智能点菜！告诉我您想吃什么口味，我来为您推荐菜品~'
    };
    this.setData({ messages: [welcomeMsg] });
  },

  onInput: function(e) {
    var value = e.detail.value;
    this.setData({
      inputText: value,
      hasInput: value.trim().length > 0,
      chatExpanded: true
    });
  },

  onSend: function() {
    var text = this.data.inputText.trim();
    if (!text) return;
    this.sendMessage(text);
    this.setData({ chatExpanded: true });
  },

  onQuickReply: function(e) {
    var text = e.currentTarget.dataset.text;
    if (text === '看看菜单') {
      this.showMenuDirectly();
      return;
    }
    this.sendMessage(text);
  },

  showMenuDirectly: function() {
    var that = this;
    var menuText = '📋 当前菜单：\n\n';
    if (menuData && menuData.dishes) {
      for (var i = 0; i < menuData.dishes.length; i++) {
        var d = menuData.dishes[i];
        if (d.status === 'online') {
          menuText += '• ' + d.name + '  ¥' + d.price + '  (' + d.taste + ')\n';
        }
      }
    } else {
      menuText += '暂无菜单数据';
    }
    var userMsg = { id: ++msgIdCounter, role: 'user', content: '看看菜单' };
    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: menuText };
    var newMsgs = that.data.messages.concat([userMsg, aiMsg]);
    that.setData({ messages: newMsgs, chatExpanded: true });
    that._scrollChatBottom();
  },

  showLastOrder: function() {
    var that = this;
    var lastOrder = this.data.lastOrder;
    var msg = '';
    if (lastOrder && lastOrder.dishes && lastOrder.dishes.length > 0) {
      msg = '🕐 上次点单：\n' + lastOrder.dishes.join('、') + '\n合计：¥' + lastOrder.total;
    } else {
      msg = '还没有点单记录';
    }
    var userMsg = { id: ++msgIdCounter, role: 'user', content: '上次点了什么' };
    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: msg };
    var newMsgs = that.data.messages.concat([userMsg, aiMsg]);
    that.setData({ messages: newMsgs, chatExpanded: true });
    that._scrollChatBottom();
  },

  _buildApiMessages: function(messages) {
    var apiMessages = [{
      role: 'system',
      content: '你是一位专业的AI点菜助手，帮助顾客推荐菜品。根据顾客的口味偏好、人数、预算等因素推荐合适的菜品。回答时注意：1.用中文回答 2.推荐要具体实用 3.说明推荐理由 4.语气热情友善'
    }];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.role === 'user') {
        apiMessages.push({ role: 'user', content: m.content || '' });
      } else if (m.role === 'ai') {
        apiMessages.push({ role: 'assistant', content: m.content });
      }
    }
    return apiMessages;
  },

  _tryProxy: function(apiMessages, callback) {
    wx.request({
      url: SERVER + '/api/ai-order/chat',
      method: 'POST',
      timeout: 60000,
      header: { 'Content-Type': 'application/json' },
      data: {
        messages: apiMessages,
        mode: 'customer',
        menuData: menuData
      },
      success: function(res) {
        callback(res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0], res);
      },
      fail: function() {
        callback(false, null);
      }
    });
  },

  _handleResponse: function(res) {
    var that = this;
    var reply = '';
    if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
      reply = res.data.choices[0].message.content || '';
      if (!reply) reply = '抱歉，现在访问的人数过多，请重试。';
    } else if (res.statusCode === 413) {
      reply = '消息过长，请缩短后重试。';
    } else if (res.data && res.data.error) {
      var err = res.data.error;
      var errMsg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
      if (errMsg.indexOf('401') > -1 || errMsg.indexOf('Insufficient credits') > -1) {
        reply = 'API额度不足或密钥无效，请联系管理员。';
      } else if (errMsg.indexOf('429') > -1 || errMsg.indexOf('rate limit') > -1) {
        reply = '请求过于频繁，请稍后再试。';
      } else {
        reply = '出错了：' + errMsg;
      }
    } else {
      reply = '抱歉，我暂时无法回答（HTTP ' + res.statusCode + '），请稍后再试。';
    }

    var recommendations = [];
    var userAskedRec = false;
    var msgs = that.data.messages;
    for (var u = msgs.length - 1; u >= 0; u--) {
      if (msgs[u].role === 'user') {
        var txt = msgs[u].content || '';
        if (txt.indexOf('推荐') > -1 || txt.indexOf('有什么') > -1 || txt.indexOf('吃啥') > -1) {
          userAskedRec = true;
        }
        break;
      }
    }
    if (menuData && menuData.dishes && reply.indexOf('出错了') === -1) {
      var matched = {};
      for (var d = 0; d < menuData.dishes.length; d++) {
        var dish = menuData.dishes[d];
        if (dish.status !== 'online') continue;
        if (reply.indexOf(dish.name) > -1 && !matched[dish.id]) {
          recommendations.push({ id: dish.id, name: dish.name, price: dish.price, taste: dish.taste, spicyLevel: dish.spicyLevel, category: dish.category });
          matched[dish.id] = true;
        }
      }
      if (recommendations.length === 0 && userAskedRec) {
        for (var d2 = 0; d2 < menuData.dishes.length && recommendations.length < 5; d2++) {
          var dish2 = menuData.dishes[d2];
          if (dish2.status !== 'online') continue;
          recommendations.push({ id: dish2.id, name: dish2.name, price: dish2.price, taste: dish2.taste, spicyLevel: dish2.spicyLevel, category: dish2.category });
        }
      }
    }

    if (recommendations.length > 0) {
      that.highlightDish(recommendations[0].id);
    }

    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: reply, recommendations: recommendations };
    that.setData({ messages: that.data.messages.concat([aiMsg]), loading: false });
    that._scrollChatBottom();
  },

  _showError: function(msg) {
    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: msg };
    this.setData({ messages: this.data.messages.concat([aiMsg]), loading: false });
    this._scrollChatBottom();
  },

  sendMessage: function(text) {
    if (this.data.loading) return;
    var that = this;

    var userMsg = {
      id: ++msgIdCounter,
      role: 'user',
      content: text
    };

    var messages = this.data.messages.concat([userMsg]);
    this.setData({ messages: messages, inputText: '', loading: true, hasInput: false });
    this._scrollChatBottom();

    var apiMessages = this._buildApiMessages(messages);
    var startTime = Date.now();

    initOpenRouter().then(function() {
      that._attemptRequest(0, startTime, apiMessages);
    }).catch(function() {
      openRouterConfig = null;
      that._attemptRequest(0, startTime, apiMessages);
    });
  },

  _attemptRequest: function(retryCount, startTime, apiMessages) {
    if (Date.now() - startTime >= 180000) {
      this._showError('当前使用人数过多，请稍后再试');
      return;
    }
    var that = this;
    that._tryProxy(apiMessages, function(ok, res) {
      if (ok) { that._handleResponse(res); return; }
      if (res && res.data && res.data.error) {
        that._handleResponse(res);
        return;
      }
      that._scheduleRetry(retryCount, startTime, apiMessages);
    });
  },

  _tryDirect: function(apiMessages, callback) {
    var that = this;
    wx.request({
      url: openRouterConfig.apiUrl + '/chat/completions',
      method: 'POST',
      timeout: 15000,
      header: {
        'Authorization': 'Bearer ' + openRouterConfig.key,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wechatbot-api-vfje.onrender.com',
        'X-Title': 'AIOrderCustomer'
      },
      data: {
        model: openRouterConfig.model,
        messages: apiMessages,
        max_tokens: openRouterConfig.maxTokens || 500
      },
      success: function(res) {
        callback(res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0], res);
      },
      fail: function() {
        callback(false, null);
      }
    });
  },

  _scheduleRetry: function(retryCount, startTime, apiMessages) {
    var that = this;
    var delay = Math.min(2000 * Math.pow(1.5, retryCount), 8000);
    setTimeout(function() {
      that._attemptRequest(retryCount + 1, startTime, apiMessages);
    }, delay);
  },

  addToCart: function(e) {
    var dishId = e.currentTarget.dataset.dishid;
    var dishName = e.currentTarget.dataset.name;
    var price = parseFloat(e.currentTarget.dataset.price) || 0;
    var cart = this.data.cart;
    var found = false;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === dishId) {
        cart[i].quantity += 1;
        found = true;
        break;
      }
    }
    if (!found) {
      cart.push({ id: dishId, name: dishName, price: price, quantity: 1 });
    }
    this._recalcCart(cart);
    wx.showToast({ title: '+1 ' + dishName, icon: 'none', duration: 1000 });
  },

  updateItemQty: function(e) {
    var dishId = e.currentTarget.dataset.dishid;
    var delta = parseInt(e.currentTarget.dataset.delta) || 0;
    var cart = this.data.cart;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === dishId) {
        cart[i].quantity = Math.max(0, cart[i].quantity + delta);
        if (cart[i].quantity <= 0) {
          cart.splice(i, 1);
        }
        break;
      }
    }
    this._recalcCart(cart);
  },

  _recalcCart: function(cart) {
    var total = 0;
    var count = 0;
    for (var i = 0; i < cart.length; i++) {
      total += cart[i].price * cart[i].quantity;
      count += cart[i].quantity;
    }
    this.setData({ cart: cart, totalPrice: total, cartItemCount: count });
  },

  onCartTap: function() {
    if (this.data.cart.length === 0) {
      wx.showToast({ title: '购物车是空的', icon: 'none' });
      return;
    }
    this.setData({ showCartPanel: true });
  },

  onCloseCartPanel: function() {
    this.setData({ showCartPanel: false, orderNote: '' });
  },

  onOrderNoteInput: function(e) {
    this.setData({ orderNote: e.detail.value });
  },

  onSubmitOrder: function() {
    var that = this;
    var cart = this.data.cart;
    if (cart.length === 0) return;
    var dishNames = [];
    for (var i = 0; i < cart.length; i++) {
      for (var j = 0; j < cart[i].quantity; j++) {
        dishNames.push(cart[i].name);
      }
    }
    this.setData({ showCartPanel: false });
    wx.setStorageSync('ai-order-last-order', { dishes: dishNames, total: this.data.totalPrice });
    var orderMsg = {
      id: ++msgIdCounter,
      role: 'ai',
      content: '✅ 下单成功！\n已点：' + dishNames.join('、') + '\n合计：¥' + this.data.totalPrice + '\n\n感谢使用智能点菜，祝用餐愉快！'
    };
    var newMsgs = that.data.messages.concat([orderMsg]);
    that.setData({
      messages: newMsgs,
      cart: [],
      totalPrice: 0,
      cartItemCount: 0,
      chatExpanded: true
    });
    that._scrollChatBottom();
  },

  highlightDish: function(dishId) {
    var that = this;
    that.setData({ highlightedDishId: dishId });
    setTimeout(function() {
      that.setData({ highlightedDishId: null });
    }, 2000);
  },

  expandChat: function() {
    this.setData({ chatExpanded: true });
    var that = this;
    setTimeout(function() { that._scrollChatBottom(); }, 200);
  },

  collapseChat: function() {
    if (!this.data.inputText && !this.data.loading) {
      this.setData({ chatExpanded: false });
    }
  },

  onChatBlur: function() {
    if (!this.data.inputText) {
      setTimeout(this.collapseChat.bind(this), 500);
    }
  },

  _scrollChatBottom: function() {
    var that = this;
    setTimeout(function() {
      that.setData({ chatScrollToId: 'chat-bottom' });
    }, 100);
  },

  copyText: function(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.text || '' });
  }
});
