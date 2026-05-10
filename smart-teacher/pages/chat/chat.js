// smart-teacher/pages/chat/chat.js

var SERVER = 'https://wechatbot-g6ez.onrender.com';
var msgIdCounter = 0;

Page({
  data: {
    messages: [],
    inputText: '',
    loading: false,
    scrollTop: 0,
    previewImage: ''
  },

  scrollToBottom: function () {
    var that = this;
    setTimeout(function () {
      that.setData({ scrollTop: 999999 });
    }, 100);
  },

  onInput: function (e) {
    this.setData({ inputText: e.detail.value });
  },

  onQuickAsk: function (e) {
    var q = e.currentTarget.dataset.q;
    this.setData({ inputText: q });
    this.sendMessage(q, '');
  },

  chooseImage: function () {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var path = res.tempFilePaths[0];
        // Convert to base64 for sending
        wx.getFileSystemManager().readFile({
          filePath: path,
          encoding: 'base64',
          success: function (readRes) {
            that.setData({
              previewImage: path,
              _imageBase64: readRes.data
            });
          }
        });
      }
    });
  },

  removePreviewImage: function () {
    this.setData({ previewImage: '', _imageBase64: '' });
  },

  previewImage: function (e) {
    var url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url] });
  },

  onSend: function () {
    var text = this.data.inputText.trim();
    var image = this.data._imageBase64 || '';
    if (!text && !image) return;
    this.sendMessage(text, image);
  },

  sendMessage: function (text, imageBase64) {
    if (this.data.loading) return;

    var hasImage = !!imageBase64;

    var userMsg = {
      id: ++msgIdCounter,
      role: 'user',
      content: text,
      imageUrl: imageBase64 ? 'data:image/jpeg;base64,' + imageBase64 : ''
    };

    var messages = this.data.messages.concat([userMsg]);
    this.setData({
      messages: messages,
      inputText: '',
      loading: true,
      previewImage: '',
      _imageBase64: ''
    });
    this.scrollToBottom();

    // Build API messages
    var apiMessages = [
      {
        role: 'system',
        content: '你是一位耐心、友善的智能老师，擅长用简单易懂的语言解释各种学习问题。回答时注意：1.用中文回答 2.解释要清晰有条理 3.适当举例帮助理解 4.鼓励学生思考'
      }
    ];

    for (var i = 0; i < this.data.messages.length; i++) {
      var m = this.data.messages[i];
      if (m.role === 'user') {
        var msgHasImage = m.imageUrl && m.imageUrl.indexOf('base64,') > -1;
        if (msgHasImage) {
          // Multimodal content for vision model
          var parts = [];
          if (m.content) {
            parts.push({ type: 'text', text: m.content });
          }
          var b64 = m.imageUrl.split('base64,')[1];
          parts.push({
            type: 'image_url',
            image_url: { url: 'data:image/jpeg;base64,' + b64 }
          });
          apiMessages.push({ role: 'user', content: parts });
        } else {
          // Plain text content - always use simple string
          apiMessages.push({ role: 'user', content: m.content || '' });
        }
      } else if (m.role === 'ai') {
        apiMessages.push({ role: 'assistant', content: m.content });
      }
    }

    var that = this;

    wx.request({
      url: SERVER + '/api/chat',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { messages: apiMessages },
      success: function (res) {
        var reply = '';
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
          reply = res.data.choices[0].message.content;
        } else if (res.data && res.data.error) {
          var err = res.data.error;
          var errMsg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
          // Provide user-friendly error messages
          if (errMsg.indexOf('User not found') > -1 || errMsg.indexOf('401') > -1) {
            reply = 'API密钥无效或未配置，请联系管理员。';
          } else if (errMsg.indexOf('Insufficient credits') > -1 || errMsg.indexOf('402') > -1) {
            reply = 'API额度不足，免费模型需要账号至少充值一次。';
          } else if (errMsg.indexOf('429') > -1 || errMsg.indexOf('rate limit') > -1) {
            reply = '请求过于频繁，请稍后再试。';
          } else {
            reply = '出错了：' + errMsg;
          }
        } else {
          reply = '抱歉，我暂时无法回答（HTTP ' + res.statusCode + '），请稍后再试。';
        }

        var aiMsg = {
          id: ++msgIdCounter,
          role: 'ai',
          content: reply
        };

        that.setData({
          messages: that.data.messages.concat([aiMsg]),
          loading: false
        });
        that.scrollToBottom();
      },
      fail: function () {
        var aiMsg = {
          id: ++msgIdCounter,
          role: 'ai',
          content: '网络请求失败，请检查网络后重试。'
        };
        that.setData({
          messages: that.data.messages.concat([aiMsg]),
          loading: false
        });
        that.scrollToBottom();
      }
    });
  }
});
