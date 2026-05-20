// ai-order/pages/customer/customer.js
// Customer AI chat page — direct OpenRouter with proxy fallback

var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;
var msgIdCounter = 0;

var openRouterConfig = null;
var configLoaded = false;
var configLoading = null;
var menuData = null;

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
    scrollTop: 0,
    hasInput: false
  },

  onLoad: function(options) {
    var that = this;
    that.addWelcomeMessage();
    that.loadMenu();
    initOpenRouter().catch(function(err) {
      console.warn('[customer] direct mode unavailable, will use proxy fallback:', err);
    });
  },

  loadMenu: function() {
    var that = this;
    wx.request({
      url: SERVER + '/api/ai-order/menu/list',
      timeout: 5000,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.menus) {
          menuData = res.data.menus;
        }
      },
      fail: function(err) {
        console.warn('[customer] failed to load menu:', err);
      }
    });
  },

  addWelcomeMessage: function() {
    var welcomeMsg = {
      id: ++msgIdCounter,
      role: 'ai',
      content: '欢迎使用智能点菜！告诉我您想吃什么口味，我来为您推荐菜品~'
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
      timeout: 15000,
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

    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: reply };
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

    initOpenRouter().then(function() {
      that._attemptRequest(0, startTime, apiMessages);
    }).catch(function() {
      openRouterConfig = null;
      that._attemptRequest(0, startTime, apiMessages);
    });
  },

  _attemptRequest: function(retryCount, startTime, apiMessages) {
    if (Date.now() - startTime >= 30000) {
      this._showError('当前使用人数过多，请稍后再试');
      return;
    }
    var that = this;
    if (openRouterConfig) {
      that._tryDirect(apiMessages, function(ok, res) {
        if (ok) { that._handleResponse(res); return; }
        that._tryProxy(apiMessages, function(ok2, res2) {
          if (ok2) { that._handleResponse(res2); return; }
          that._scheduleRetry(retryCount, startTime, apiMessages);
        });
      });
    } else {
      that._tryProxy(apiMessages, function(ok, res) {
        if (ok) { that._handleResponse(res); return; }
        that._scheduleRetry(retryCount, startTime, apiMessages);
      });
    }
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

  copyText: function(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.text || '' });
  }
});
