var SYSTEM_PROMPT = '你是日语学习智能老师，用中日双语回答。先用中文解释，再给出日语例句（带假名注音），最后给一个小练习。语气亲切耐心。';

Page({
  data: {
    messages: [],
    input: '',
    loading: false,
    scrollTop: 0,
    apiMode: 'direct' // 'direct' or 'proxy'
  },

  onLoad: function() {
    this.setData({
      messages: [{
        id: Date.now(),
        role: 'assistant',
        content: '你好！我是你的日语智能老师。\nどんな日本語を勉強したいですか？想学什么日语呢？'
      }]
    });
  },

  onInput: function(e) { this.setData({ input: e.detail.value }); },

  sendMessage: function() {
    var that = this;
    var input = that.data.input.trim();
    if (!input || that.data.loading) return;

    var userMsg = { id: Date.now(), role: 'user', content: input };
    var messages = that.data.messages.concat([userMsg]);
    that.setData({ messages: messages, input: '', loading: true });

    that.callAPI(messages);
  },

  quickAsk: function(e) {
    this.setData({ input: e.currentTarget.dataset.q }, this.sendMessage);
  },

  callAPI: function(messages) {
    var that = this;
    var apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }];
    for (var i = Math.max(0, messages.length - 15); i < messages.length; i++) {
      apiMessages.push({ role: messages[i].role, content: messages[i].content });
    }

    // Try direct OpenRouter first
    wx.request({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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'
      },
      data: {
        model: 'google/gemini-2.0-flash-001',
        messages: apiMessages,
        max_tokens: 800
      },
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.choices && res.data.choices.length > 0) {
          var choice = res.data.choices[0];
          if (choice.message && choice.message.content) {
            that.addMessage('assistant', choice.message.content);
            return;
          }
        }
        // Fallback: try backend proxy
        that.tryProxy(apiMessages);
      },
      fail: function() {
        // Fallback: try backend proxy
        that.tryProxy(apiMessages);
      }
    });
  },

  tryProxy: function(apiMessages) {
    var that = this;
    wx.request({
      url: 'https://wechatbot-api.onrender.com/api/chat',
      method: 'POST',
      data: { messages: apiMessages },
      success: function(res) {
        var content = '';
        if (res.data && res.data.choices && res.data.choices[0]) {
          content = res.data.choices[0].message.content;
        }
        if (!content) {
          content = 'すみません、AI暂时无法回答。请稍后重试。';
        }
        that.addMessage('assistant', content);
      },
      fail: function() {
        that.addMessage('assistant', '网络连接失败。请在微信公众平台后台把 openrouter.ai 加入 request 合法域名列表。');
      }
    });
  },

  addMessage: function(role, content) {
    var msg = { id: Date.now(), role: role, content: content };
    this.setData({
      messages: this.data.messages.concat([msg]),
      loading: false,
      scrollTop: 99999
    });
  },

  goToLesson: function() { wx.redirectTo({ url: '/japanese/pages/learn/learn' }); },
  goToCourse: function() { wx.redirectTo({ url: '/japanese/pages/course/course' }); },
  goToAI: function() {},
  goToRank: function() { wx.navigateTo({ url: '/japanese/pages/leaderboard/leaderboard' }); }
});
