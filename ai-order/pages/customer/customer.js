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

var GROUP_CONFIGS = {
  category: {
    '主食': { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', light: '#FFF8E1' },
    '菜': { bg: 'linear-gradient(135deg, #FF4500, #FF6B35)', light: '#FFF0ED' },
    '汤': { bg: 'linear-gradient(135deg, #4A90D9, #7EC8E3)', light: '#E8F4FD' }
  },
  price: {
    '~¥20': { bg: 'linear-gradient(135deg, #66CDAA, #90EE90)', light: '#E8F5E9' },
    '¥20~¥50': { bg: 'linear-gradient(135deg, #FF8C00, #FFB74D)', light: '#FFF3E0' },
    '¥50+': { bg: 'linear-gradient(135deg, #AB47BC, #CE93D8)', light: '#F3E5F5' }
  }
};
var CATEGORY_DEFAULT = { bg: 'linear-gradient(135deg, #A8A8A8, #D0D0D0)', light: '#F5F5F5' };

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

    // Group mode
    groupMode: 'taste',
    groupModeLabel: '按口味',
    groupModes: [{ key: 'taste', label: '按口味' }, { key: 'category', label: '按分类' }, { key: 'price', label: '按价格' }],
    allDishes: [],
    scrollToDishId: '',
    scrollToDishZone: '',

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
          var enriched = [];
          for (var i = 0; i < dishes.length; i++) {
            var d = dishes[i];
            if (d.status !== 'online') continue;
            d.bgStyle = (TASTE_CONFIG[d.taste] || TASTE_DEFAULT).bg;
            d.avatarChar = d.name.slice(0, 1);
            d.imageUrl = d.image ? SERVER + d.image : '';
            enriched.push(d);
          }
          var result = that._rebuildGroups(enriched, that.data.groupMode);
          that.setData({ tasteGroups: result.tasteGroups, dishGradientMap: result.dishGradientMap, allDishes: enriched });
        }
      },
      fail: function(err) {
        that.setData({ menuLoading: false });
        console.warn('[customer] failed to load menu:', err);
      }
    });
  },

  _rebuildGroups: function(dishes, mode) {
    mode = mode || this.data.groupMode;
    var groups = {};
    var gradientMap = {};
    var config = mode === 'taste' ? TASTE_CONFIG : GROUP_CONFIGS[mode] || {};
    var defaultCfg = mode === 'taste' ? TASTE_DEFAULT : CATEGORY_DEFAULT;

    for (var i = 0; i < dishes.length; i++) {
      var d = dishes[i];
      if (d.status !== 'online') continue;
      var key = '';
      if (mode === 'taste') {
        key = d.taste || '其他';
      } else if (mode === 'category') {
        key = d.category || '其他';
      } else if (mode === 'price') {
        var p = d.price;
        key = p <= 20 ? '~¥20' : (p <= 50 ? '¥20~¥50' : '¥50+');
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
      gradientMap[d.id] = (config[key] || defaultCfg).bg;
    }

    var orderedKeys = [];
    if (mode === 'taste') orderedKeys = ['麻辣', '酸甜', '咸甜', '清淡', '其他'];
    else if (mode === 'category') orderedKeys = ['主食', '菜', '汤', '其他'];
    else if (mode === 'price') orderedKeys = ['~¥20', '¥20~¥50', '¥50+'];

    var result = [];
    for (var t = 0; t < orderedKeys.length; t++) {
      var key = orderedKeys[t];
      if (groups[key] && groups[key].length > 0) {
        var cfg = config[key] || defaultCfg;
        result.push({ taste: key, dishes: groups[key], bgColor: cfg.bg, lightColor: cfg.light });
      }
    }
    return { tasteGroups: result, dishGradientMap: gradientMap };
  },

  _applyGroupMode: function(mode) {
    var dishes = this.data.allDishes;
    var label = '';
    var modes = this.data.groupModes;
    for (var i = 0; i < modes.length; i++) {
      if (modes[i].key === mode) { label = modes[i].label; break; }
    }
    var result = this._rebuildGroups(dishes, mode);
    this.setData({ groupMode: mode, groupModeLabel: label, tasteGroups: result.tasteGroups });
  },

  onGroupModeChange: function(e) {
    var idx = e.detail.value;
    var modes = this.data.groupModes;
    if (modes && modes[idx]) {
      this.clearHighlight();
      this._applyGroupMode(modes[idx].key);
    }
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
    that.clearHighlight();
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
    that.clearHighlight();
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
    // Build menu text for system prompt
    var menuText = '';
    if (menuData && menuData.dishes) {
      menuText = '\n\n当前餐厅菜单（只能从以下菜品中推荐，绝不要推荐菜单外的菜品）：\n';
      for (var mi = 0; mi < menuData.dishes.length; mi++) {
        var dd = menuData.dishes[mi];
        if (dd.status === 'online') {
          menuText += '- ' + dd.name + ' ¥' + dd.price + ' ' + (dd.taste || '') + (dd.spicyLevel > 0 ? ' 辣度' + dd.spicyLevel : '') + ' ' + (dd.category || '') + '\n';
        }
      }
      menuText += '\n如果顾客问某个具体菜品，请详细介绍并提供推荐理由。如果顾客说要某个菜品（如"来一份宫保鸡丁"），回复中加入下单确认信息。';
    }
    var apiMessages = [{
      role: 'system',
      content: '你是一位专业的AI点菜助手，帮助顾客推荐菜品。根据顾客的口味偏好、人数、预算等因素推荐合适的菜品。' + menuText + '\n回答时注意：1.用中文回答 2.推荐要具体实用 3.说明推荐理由 4.语气热情友善 5.推荐时务必使用菜品全名，不要缩写或改词'
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
    this.clearHighlight();

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

  previewImage: function(e) {
    var url = e.currentTarget.dataset.url;
    if (url) {
      wx.previewImage({ current: url, urls: [url] });
    }
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

  clearHighlight: function() {
    this.setData({ highlightedDishId: null, scrollToDishId: '', scrollToDishZone: '' });
  },

  highlightDish: function(dishId) {
    var that = this;
    // Find which taste zone this dish is in for vertical scroll
    var zones = this.data.tasteGroups;
    var zoneLabel = '';
    for (var z = 0; z < zones.length; z++) {
      var dishes = zones[z].dishes || [];
      for (var d = 0; d < dishes.length; d++) {
        if (dishes[d].id === dishId) {
          zoneLabel = zones[z].taste;
          break;
        }
      }
      if (zoneLabel) break;
    }
    var zoneId = zoneLabel ? 'zone-' + zoneLabel : '';
    that.setData({ highlightedDishId: dishId, scrollToDishId: 'dish-' + dishId, scrollToDishZone: zoneId });
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
