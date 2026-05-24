// ai-order/pages/customer/customer.js
var loginLib = require('../../../utils/login');
var msgIdCounter = 0;

var menuData = null;

var DEMO_MERCHANT_IDS = ['demo-restaurant-1', 'demo-restaurant-2', 'demo-restaurant-3'];

var plugin = null;
var recordRecoManager = null;

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

Page({
  data: {
    messages: [],
    inputText: '',
    loading: false,
    hasInput: false,
    inputMode: 'voice',
    isRecording: false,
    merchantId: '',

    tasteGroups: [],
    menuLoading: false,
    highlightedDishId: null,
    dishGradientMap: {},

    cart: [],
    totalPrice: 0,
    cartItemCount: 0,
    cartQtyMap: {},
    showCartPanel: false,
    orderNote: '',

    chatExpanded: false,
    chatSlideY: '100%',
    chatSliding: false,
    scrollToView: '',
    lastAiContent: '',

    quickReplies: ['有什么推荐', '热量低的食品', '辣的'],

    // Group mode
    groupMode: 'taste',
    groupModeLabel: '按口味',
    groupModes: [{ key: 'taste', label: '按口味' }, { key: 'category', label: '按分类' }, { key: 'price', label: '按价格' }],
    allDishes: [],
    aiRecommendations: [],
    recDishIds: {},
    showRecGlow: false,
    streamingText: '',
    scrollToDishId: '',
    scrollToDishZone: '',
    dishScrollTop: null,

    lastOrder: null,
  },

  onLoad: function(options) {
    var that = this;
    var merchantId = options.merchantId || '';
    msgIdCounter = 0;
    that.setData({ merchantId: merchantId });
    var merchantName = wx.getStorageSync('ai-order-merchant-name') || '';
    wx.setNavigationBarTitle({ title: merchantName ? merchantName + ' - 智能点菜' : '智能点菜' });
    that.addWelcomeMessage();
    that.loadMenu();
    var savedOrder = wx.getStorageSync('ai-order-last-order');
    if (savedOrder && savedOrder.dishes) {
      that.setData({ lastOrder: savedOrder });
    }

    if (!plugin) {
      try {
        plugin = requirePlugin('WechatSI');
        recordRecoManager = plugin.getRecordRecognitionManager();
        recordRecoManager.onStop = function(res) {
          that.setData({ isRecording: false });
          if (res.result) {
            that.sendMessage(res.result);
          }
        };
        recordRecoManager.onError = function(res) {
          that.setData({ isRecording: false });
          console.error('[voice] recognition error:', res);
        };
      } catch (e) {
        console.warn('[voice] WechatSI plugin not available:', e);
      }
    }
  },

  onHide: function() {
    // No WebSocket to clean up
  },

  onShow: function() {
    // No WebSocket to connect
  },

  loadMenu: function() {
    var that = this;
    that.setData({ menuLoading: true });
    var merchantId = that.data.merchantId;

    // 1. Try localStorage cache
    var cacheKey = 'menu-cache-' + merchantId;
    var cached = wx.getStorageSync(cacheKey);
    if (cached && cached.dishes && cached.dishes.length > 0) {
      that.setData({ menuLoading: false });
      that._applyMenuData(cached);
      return;
    }

    // 2. Demo merchant: load from local data
    if (DEMO_MERCHANT_IDS.indexOf(merchantId) !== -1) {
      that._loadMenuFromDemoData(merchantId);
      return;
    }

    // 3. Load from cloud function
    that._loadMenuFromServer();
  },

  _loadMenuFromServer: function() {
    var that = this;
    loginLib.callCloud('ai-order-menu', { action: 'list', merchantId: that.data.merchantId })
      .then(function(data) {
        that.setData({ menuLoading: false });
        if (data && data.success && data.data) {
          that._applyMenuData(data.data);
        }
      })
      .catch(function() {
        that.setData({ menuLoading: false });
        console.warn('[customer] failed to load menu from server');
      });
  },

  _loadMenuFromDemoData: function(merchantId) {
    var that = this;
    var demoMenus = require('../../data/demo-menus');
    var found = demoMenus.getMerchant(merchantId);
    that.setData({ menuLoading: false });
    if (found) {
      var menu = { dishes: found.dishes || [] };
      wx.setStorageSync('menu-cache-' + merchantId, menu);
      that._applyMenuData(menu);
    } else {
      that._loadMenuFromServer();
    }
  },

  _applyMenuData: function(rawMenu) {
    var that = this;
    menuData = rawMenu;
    var dishes = rawMenu.dishes || [];
    var enriched = [];
    for (var i = 0; i < dishes.length; i++) {
      var d = dishes[i];
      if (d.status !== 'online') continue;
      d.bgStyle = (TASTE_CONFIG[d.taste] || TASTE_DEFAULT).bg;
      d.avatarChar = d.name.slice(0, 1);
      d.imageUrl = d.image ? (d.image.indexOf('http') === 0 ? d.image : d.image) : '';
      enriched.push(d);
    }
    var result = that._rebuildGroups(enriched, that.data.groupMode);
    var aiRecs = that.data.aiRecommendations || [];
    if (aiRecs.length > 0) {
      result.tasteGroups.unshift({
        taste: 'AI推荐',
        dishes: aiRecs,
        bgColor: 'linear-gradient(135deg, #667eea, #764ba2)',
        lightColor: '#F0E6FF'
      });
    }
    that.setData({ tasteGroups: result.tasteGroups, dishGradientMap: result.dishGradientMap, allDishes: enriched });
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
    var aiRecs = this.data.aiRecommendations || [];
    if (aiRecs.length > 0) {
      result.tasteGroups.unshift({
        taste: 'AI推荐',
        dishes: aiRecs,
        bgColor: 'linear-gradient(135deg, #667eea, #764ba2)',
        lightColor: '#F0E6FF'
      });
    }
    this.setData({ groupMode: mode, groupModeLabel: label, tasteGroups: result.tasteGroups });
  },

  _applyAiRecommendations: function(recommendations) {
    var that = this;
    var allDishes = that.data.allDishes;
    var enriched = [];
    var recIds = {};
    for (var i = 0; i < recommendations.length; i++) {
      var rec = recommendations[i];
      recIds[rec.id] = true;
      for (var j = 0; j < allDishes.length; j++) {
        if (allDishes[j].id === rec.id) {
          enriched.push(allDishes[j]);
          break;
        }
      }
    }
    var result = that._rebuildGroups(allDishes, that.data.groupMode);
    if (enriched.length > 0) {
      result.tasteGroups.unshift({
        taste: 'AI推荐',
        dishes: enriched,
        bgColor: 'linear-gradient(135deg, #667eea, #764ba2)',
        lightColor: '#F0E6FF'
      });
    }
    that.setData({ aiRecommendations: enriched, recDishIds: recIds, showRecGlow: false, tasteGroups: result.tasteGroups, dishGradientMap: result.dishGradientMap });
    if (enriched.length > 0) {
      that._suppressGlowClear = true;
      that.setData({ dishScrollTop: 0 });
      setTimeout(function() {
        that._suppressGlowClear = false;
        that.setData({ recDishIds: recIds, showRecGlow: true });
      }, 400);
    }
  },

  _clearRecGlow: function() {
    if (!this.data.showRecGlow) return;
    this.setData({ recDishIds: {}, showRecGlow: false });
  },

  onDishTap: function(e) {
    this._clearRecGlow();
  },

  onDishGridScroll: function() {
    if (!this._suppressGlowClear) {
      this._clearRecGlow();
    }
    var that = this;
    if (that.data.dishScrollTop === 0) {
      that.setData({ dishScrollTop: null });
    }
  },

  onGroupModeChange: function(e) {
    var idx = e.detail.value;
    var modes = this.data.groupModes;
    if (modes && modes[idx]) {
      this._clearRecGlow();
      this._applyGroupMode(modes[idx].key);
    }
  },

  addWelcomeMessage: function() {
    var welcomeMsg = {
      id: ++msgIdCounter,
      role: 'ai',
      content: '欢迎使用智能点菜！告诉我您想吃什么口味，我来为您推荐菜品~'
    };
    this.setData({ messages: [welcomeMsg], lastAiContent: welcomeMsg.content });
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
      content: '你是一位专业的AI点菜助手，帮助顾客推荐菜品。根据顾客的口味偏好、人数、预算等因素推荐合适的菜品。' + menuText + '\n回答时注意：1.用中文回答 2.推荐要实用且简短，给顾客精简但重要的信息，如营养，口味，食品热量 3.推荐时务必使用菜品全名，不要缩写或改词'
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

  _startVoiceInput: function() {
    if (this.data.loading) return;
    if (!recordRecoManager) {
      wx.showToast({ title: '语音识别不可用', icon: 'none' });
      return;
    }
    this.setData({ isRecording: true });
    recordRecoManager.start({ duration: 60000, lang: 'zh_CN' });
  },

  _stopVoiceInput: function() {
    if (!this.data.isRecording) return;
    this.setData({ isRecording: false });
    if (recordRecoManager) recordRecoManager.stop();
  },

  _switchToText: function() {
    this.setData({ inputMode: 'text' });
  },

  _switchToVoice: function() {
    this.setData({ inputMode: 'voice' });
  },

  _tryProxy: function(apiMessages, callback) {
    loginLib.callCloud('ai-order-chat', {
      action: 'chat',
      messages: apiMessages,
      mode: 'customer',
      menuData: menuData
    })
      .then(function(data) {
        callback(true, { statusCode: 200, data: data });
      })
      .catch(function(err) {
        var errData = { error: err.error || 'cloud error' };
        if (err.statusCode) errData._statusCode = err.statusCode;
        callback(false, { statusCode: err.statusCode || 500, data: errData });
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

    that._applyAiRecommendations(recommendations);

    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: reply, recommendations: recommendations };
    that.setData({ messages: that.data.messages.concat([aiMsg]), loading: false, lastAiContent: reply });
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
    that._clearRecGlow();
    that.setData({ aiRecommendations: [] });

    var userMsg = { id: ++msgIdCounter, role: 'user', content: text };
    var messages = this.data.messages.concat([userMsg]);
    this.setData({ messages: messages, inputText: '', loading: true, hasInput: false });
    this._scrollChatBottom();

    var apiMessages = this._buildApiMessages(messages);

    that._attemptRequest(0, Date.now(), apiMessages);
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

  _scheduleRetry: function(retryCount, startTime, apiMessages) {
    var that = this;
    var delay = Math.min(2000 * Math.pow(1.5, retryCount), 8000);
    setTimeout(function() {
      that._attemptRequest(retryCount + 1, startTime, apiMessages);
    }, delay);
  },

  previewImage: function(e) {
    this._clearRecGlow();
    var url = e.currentTarget.dataset.url;
    if (url) {
      wx.previewImage({ current: url, urls: [url] });
    }
  },

  addToCart: function(e) {
    this._clearRecGlow();
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
    this._clearRecGlow();
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
    var qtyMap = {};
    for (var i = 0; i < cart.length; i++) {
      total += cart[i].price * cart[i].quantity;
      count += cart[i].quantity;
      qtyMap[cart[i].id] = cart[i].quantity;
    }
    this.setData({ cart: cart, totalPrice: total, cartItemCount: count, cartQtyMap: qtyMap });
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
    this.setData({
      chatExpanded: true,
      chatSlideY: '0%',
      chatSliding: false
    });
    var that = this;
    setTimeout(function() { that._scrollChatBottom(); }, 200);
  },

  collapseChat: function() {
    this.setData({
      chatExpanded: false,
      chatSlideY: '100%',
      chatSliding: false
    });
  },

  onChatTouchStart: function(e) {
    this.setData({
      chatSlideY: '0%',
      chatSliding: true,
      chatExpanded: true
    });
    var that = this;
    setTimeout(function() { that._scrollChatBottom(); }, 200);
  },

  onChatTouchMove: function() {
  },

  onChatBlur: function() {
    if (!this.data.inputText) {
      setTimeout(this.collapseChat.bind(this), 500);
    }
  },

  _scrollChatBottom: function() {
    var that = this;
    if (!that.data.chatExpanded) return;
    that.setData({ scrollToView: 'chat-bottom' });
    setTimeout(function() {
      if (that.data.chatExpanded) that.setData({ scrollToView: '' });
    }, 300);
  },

  copyText: function(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.text || '' });
  }
});
