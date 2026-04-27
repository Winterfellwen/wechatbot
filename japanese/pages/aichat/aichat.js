var SYSTEM_PROMPT = '你是"花子先生"，一位专业的日语教师。用中日双语回答学生的问题。\n先用中文解释，再给出日语例句（带假名注音），最后给一个练习。\n语气亲切耐心，适合日语学习者。';

Page({
  data: {
    messages: [],
    input: '',
    loading: false,
    scrollTop: 0
  },

  onLoad: function () {
    this.setData({
      messages: [{
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: 'こんにちは！花子先生です。欢迎来到日语学习！有什么问题都可以问我哦～'
      }]
    });
  },

  onInput: function (e) {
    this.setData({ input: e.detail.value });
  },

  sendMessage: function () {
    var that = this;
    var input = that.data.input.trim();
    if (!input || that.data.loading) return;

    var userMsg = { id: 'u-' + Date.now(), role: 'user', content: input };
    var messages = that.data.messages.concat([userMsg]);

    that.setData({ messages: messages, input: '', loading: true });
    that.scrollToBottom();

    that.callAI(messages);
  },

  quickAsk: function (e) {
    var q = e.currentTarget.dataset.q;
    this.setData({ input: q });
    this.sendMessage();
  },

  callAI: function (messages) {
    var that = this;

    var apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }];

    for (var i = 0; i < messages.length; i++) {
      apiMessages.push({ role: messages[i].role, content: messages[i].content });
    }

    wx.request({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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'
      },
      data: {
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: apiMessages,
        max_tokens: 800
      },
      success: function (res) {
        var content = '';
        if (res.data && res.data.choices && res.data.choices.length > 0) {
          var choice = res.data.choices[0];
          if (choice.message && choice.message.content) {
            content = choice.message.content;
          }
        }
        if (!content) {
          content = 'すみません、请稍后重试～';
        }

        var aiMsg = { id: 'a-' + Date.now(), role: 'assistant', content: content };
        var updated = that.data.messages.concat([aiMsg]);
        that.setData({ messages: updated, loading: false });
        that.scrollToBottom();
      },
      fail: function () {
        var aiMsg = {
          id: 'a-' + Date.now(),
          role: 'assistant',
          content: 'ネットワークエラーです。请检查网络后重试～'
        };
        var updated = that.data.messages.concat([aiMsg]);
        that.setData({ messages: updated, loading: false });
      }
    });
  },

  scrollToBottom: function () {
    var that = this;
    setTimeout(function () {
      that.setData({ scrollTop: 99999 });
    }, 200);
  },

  goToLesson: function () {
    wx.redirectTo({ url: '/pages/lesson/lesson' });
  },

  goToCourse: function () {
    wx.redirectTo({ url: '/pages/course/course' });
  },

  goToAI: function () {},

  goToRank: function () {
    wx.redirectTo({ url: '/pages/rank/rank' });
  }
});
