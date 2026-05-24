// ai-order/pages/merchant/merchant.js
// Merchant AI chat page — uses cloud functions

var loginLib = require('../../../utils/login');
var DEMO_MERCHANT_IDS = ['demo-restaurant-1', 'demo-restaurant-2', 'demo-restaurant-3'];
var msgIdCounter = 0;
var menuData = null;

Page({
  data: {
    messages: [],
    inputText: '',
    loading: false,
    scrollTop: 0,
    hasInput: false
  },

  onLoad: function(options) {
    var that = this;
    var merchantId = options.merchantId || '';
    msgIdCounter = 0;
    that.setData({ merchantId: merchantId });
    var merchantName = wx.getStorageSync('ai-order-merchant-name') || '';
    wx.setNavigationBarTitle({ title: merchantName ? merchantName + ' - AI菜单助手' : 'AI菜单助手' });
    that.addWelcomeMessage();
    that.loadMenu();
  },

  loadMenu: function() {
    var that = this;
    var merchantId = that.data.merchantId;
    var cacheKey = 'menu-cache-' + merchantId;
    
    // 从服务器加载（强制刷新，获取最新ETag）
    if (merchantId && DEMO_MERCHANT_IDS.indexOf(merchantId) !== -1) {
      that._loadMenuFromDemoData(merchantId);
      return;
    }
    var path = '/api/ai-order/menu/list';
    if (merchantId) path += '?merchantId=' + merchantId;
    loginLib.callCloud('ai-order-menu', { action: 'list', merchantId: merchantId })
      .then(function(data) {
        if (data && data.success && data.data) {
          menuData = data.data;
          // 存储菜单和ETag信息
          var cacheInfo = {
            menu: data.data,
            updatedAt: data.updatedAt || new Date().toISOString(),
            etag: data.etag || null
          };
          wx.setStorageSync(cacheKey, cacheInfo);
        }
      })
      .catch(function(err) {
        console.warn('[merchant] failed to load menu:', err);
        // 降级：尝试读取缓存
        var cached = wx.getStorageSync(cacheKey);
        if (cached && cached.menu) {
          menuData = cached.menu;
        }
      });
  },

  _loadMenuFromDemoData: function(merchantId) {
    var that = this;
    var demoMenus = require('../../data/demo-menus');
    var found = demoMenus.getMerchant(merchantId);
    if (found) {
      var menu = { dishes: found.dishes || [] };
      menuData = menu;
      var cacheInfo = {
        menu: menu,
        updatedAt: new Date().toISOString(),
        etag: null
      };
      wx.setStorageSync('menu-cache-' + merchantId, cacheInfo);
    }
  },

  saveMenu: function(menu) {
    var that = this;
    var merchantId = that.data.merchantId;
    if (!merchantId || !menu) return;
    
    var cacheKey = 'menu-cache-' + merchantId;
    var cached = wx.getStorageSync(cacheKey);
    var expectedEtag = cached && cached.etag ? cached.etag : null;
    
    var requestData = {
      merchantId: merchantId,
      menu: menu
    };
    if (expectedEtag) {
      requestData.expectedEtag = expectedEtag;
    }
    
    loginLib.callCloud('ai-order-menu', {
      action: 'save',
      merchantId: merchantId,
      menu: menu,
      expectedEtag: expectedEtag
    })
      .then(function(data) {
          // 更新缓存信息，使用服务器返回的真实ETag
          var newCacheInfo = {
            menu: menu,
            updatedAt: new Date().toISOString(),
            etag: data.etag || new Date().getTime().toString()
          };
          wx.setStorageSync(cacheKey, newCacheInfo);
          console.log('[merchant] menu saved to server');
        })
      .catch(function(err) {
        if (err && err.error === 'CONFLICT') {
          // 冲突处理：刷新菜单
          console.warn('[merchant] save conflict, refreshing menu...');
          that.loadMenu();
          wx.showToast({
            title: '菜单已被修改，请重试',
            icon: 'none',
            duration: 2000
          });
        } else {
          console.warn('[merchant] failed to save menu:', err);
        }
      });
  },

  addWelcomeMessage: function() {
    var welcomeMsg = {
      id: ++msgIdCounter,
      role: 'ai',
      content: '你好，我是AI菜单助手！我可以帮你：\n\u2460 添加菜品（如"加一道红烧排骨 35元 咸甜口味"）\n\u2461 修改菜品信息\n\u2462 优化菜单描述\n\u2463 推荐菜品搭配\n有什么需要帮忙的？'
    };
    this.setData({ messages: [welcomeMsg] });
  },

  scrollToBottom: function() {
    var that = this;
    setTimeout(function() {
      that.setData({ scrollTop: 999999 });
    }, 100);
  },

  onInput: function(e) {
    var value = e.detail.value;
    this.setData({
      inputText: value,
      hasInput: value.trim().length > 0
    });
  },

  onSend: function() {
    var text = this.data.inputText.trim();
    if (!text) return;
    this.sendMessage(text);
  },

  _buildApiMessages: function(messages) {
    // 构建当前菜单文本
    var menuText = '';
    if (menuData && menuData.dishes) {
      menuText = '\n\n当前菜单（' + menuData.dishes.length + ' 道菜品）：\n';
      for (var mi = 0; mi < menuData.dishes.length; mi++) {
        var dd = menuData.dishes[mi];
        var status = dd.status === 'online' ? '' : '【已下架】';
        menuText += '- ' + dd.name + ' ¥' + dd.price + ' ' + (dd.taste || '') + ' ' + (dd.category || '') + ' ' + status + '\n';
      }
    }
    var apiMessages = [{
      role: 'system',
      content: '你是一位专业的AI菜单助手，帮助商家管理菜品。' + menuText + '\n\n核心规则：当商家要求添加菜品时，你必须在回复末尾输出一个名为 dish-add 的 JSON 代码块。格式如下：\n```dish-add\n{"name":"菜品名","price":价格数字,"taste":"口味","category":"分类","description":"简短描述","spicyLevel":辣度0-3}\n```\n例如：\n```dish-add\n{"name":"红烧排骨","price":35,"taste":"咸甜","category":"菜","description":"经典红烧，肉质鲜嫩","spicyLevel":0}\n```\n\n注意：\n1. 每次只能添加一道菜品，多道菜品分多次添加\n2. 只在商家明确要求添加菜品时才输出 dish-add 代码块\n3. dish-add 代码块必须放在回复末尾\n4. 回复正文先友好地告知商家你已准备添加该菜品\n5. name 必填，price 必填，taste 选填（如 麻辣/酸甜/咸甜/清淡），category 选填（如 菜/主食/汤），description 选填，spicyLevel 选填（0-3）'
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
    loginLib.callCloud('ai-order-chat', {
      action: 'chat',
      messages: apiMessages,
      mode: 'merchant',
      menuData: menuData
    })
      .then(function(data) {
        // Convert cloud function response to expected format
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

    // 解析 AI 回复中的 dish-add 代码块，实际创建菜品
    var displayReply = reply;
    var newDishes = [];
    var dishAddRegex = /```dish-add\s*\n([\s\S]*?)\n```/g;
    var match;
    while ((match = dishAddRegex.exec(reply)) !== null) {
      try {
        var dishData = JSON.parse(match[1]);
        if (dishData.name && typeof dishData.price === 'number') {
          var newDish = {
            id: 'dish-' + Date.now() + '-' + newDishes.length,
            name: dishData.name,
            price: dishData.price,
            image: dishData.image || '',
            description: dishData.description || '',
            taste: dishData.taste || '',
            spicyLevel: dishData.spicyLevel || 0,
            status: 'online',
            category: dishData.category || ''
          };
          newDishes.push(newDish);
        }
      } catch (e) {
        console.warn('[merchant] failed to parse dish-add JSON:', match[1], e);
      }
    }
    // 从显示文本中移除 dish-add 代码块
    displayReply = reply.replace(/```dish-add\s*\n[\s\S]*?\n```/g, '').trim();

    // 如果有成功解析的新菜品，添加到菜单并保存
    if (newDishes.length > 0) {
      // 先读取当前最新菜单（避免基于过时数据操作）
      var merchantId = that.data.merchantId;
      if (merchantId) {
        var cacheKey = 'menu-cache-' + merchantId;
        var cached = wx.getStorageSync(cacheKey);
        var currentMenu = cached && cached.menu ? cached.menu : { dishes: [] };
        if (!currentMenu.dishes) currentMenu.dishes = [];
        
        // 添加新菜品
        for (var nd = 0; nd < newDishes.length; nd++) {
          currentMenu.dishes.push(newDishes[nd]);
        }
        that.saveMenu(currentMenu);
        // 更新全局 menuData
        menuData = currentMenu;
      } else {
        // 降级：使用内存中的 menuData
        if (!menuData) menuData = { dishes: [] };
        if (!menuData.dishes) menuData.dishes = [];
        for (var nd = 0; nd < newDishes.length; nd++) {
          menuData.dishes.push(newDishes[nd]);
        }
        that.saveMenu(menuData);
      }
      // 追加操作结果到回复
      var addedNames = newDishes.map(function(d) { return d.name; }).join('、');
      displayReply = displayReply + '\n\n✅ 已成功添加：' + addedNames;
    }

    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: displayReply };
    that.setData({ messages: that.data.messages.concat([aiMsg]), loading: false });
    that.scrollToBottom();
  },

  _showError: function(msg) {
    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: msg };
    this.setData({ messages: this.data.messages.concat([aiMsg]), loading: false });
    this.scrollToBottom();
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
    this.scrollToBottom();

    var apiMessages = this._buildApiMessages(messages);
    var startTime = Date.now();

    that._attemptRequest(0, startTime, apiMessages);
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

  copyText: function(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.text || '' });
  }
});
