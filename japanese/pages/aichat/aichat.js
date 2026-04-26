var API_URL = 'https://wechatbot-api.onrender.com/api/chat';
var SYSTEM_PROMPT = '你是日语学习智能老师，擅长用简单易懂的方式教日语。可以回答日语语法、词汇、发音、日常对话等问题。你的回复应该简洁、有帮助，适合初学者。可以用中文回答，也可以中日双语对照。';

Page({
  data: {
    messages: [
      { id: 0, role: 'assistant', content: '你好！我是你的日语智能老师。任何日语问题都可以问我哦~' }
    ],
    input: '',
    loading: false,
    currentTab: 'aichat'
  },

  onLoad() {
    this.setData({ currentTab: 'aichat' });
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  sendMessage() {
    var that = this;
    var input = that.data.input;
    if (!input || that.data.loading) return;

    var userMsg = { id: that.data.messages.length, role: 'user', content: input };
    that.setData({
      messages: that.data.messages.concat(userMsg),
      input: '',
      loading: true
    });

    wx.request({
      url: API_URL,
      method: 'POST',
      data: {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT }
        ].concat(that.data.messages.slice(-10).map(function(m) {
          return { role: m.role, content: m.content };
        }))
      },
      success: function(res) {
        var content = '';
        if (res.data && res.data.choices && res.data.choices[0]) {
          content = res.data.choices[0].message.content;
        } else if (res.data && res.data.error) {
          content = '抱歉，出错了: ' + res.data.error.message;
        } else {
          content = '抱歉，无法获取回答，请稍后重试。';
        }

        var assistantMsg = { id: that.data.messages.length + 1, role: 'assistant', content: content };
        that.setData({
          messages: that.data.messages.concat(assistantMsg),
          loading: false
        });
      },
      fail: function(err) {
        console.log('error:', err);
        var assistantMsg = { 
          id: that.data.messages.length + 1, 
          role: 'assistant', 
          content: '网络错误，请检查网络后重试。' 
        };
        that.setData({
          messages: that.data.messages.concat(assistantMsg),
          loading: false
        });
      }
    });
  },

  goToLesson() {
    wx.redirectTo({ url: '/japanese/pages/learn/learn' });
  },

  goToCourse() {
    wx.redirectTo({ url: '/japanese/pages/course/course' });
  },

  goToAI() {
    wx.redirectTo({ url: '/japanese/pages/aichat/aichat' });
  },

  goToRank() {
    wx.navigateTo({ url: '/japanese/pages/leaderboard/leaderboard' });
  }
});