// smart-teacher/pages/chat/chat.js
// AI Chat — uses cloud function for OpenRouter

var loginLib = require('../../../utils/login');
var msgIdCounter = 0;

Page({
  data: {
    messages: [],
    inputText: '',
    loading: false,
    scrollTop: 0,
    previewImage: '',
    hasInput: false,
    _imageBase64: ''
  },

  onLoad: function () {
    // No initialization needed
  },

  scrollToBottom: function () {
    var that = this;
    setTimeout(function () {
      that.setData({ scrollTop: 999999 });
    }, 100);
  },

  onInput: function (e) {
    var value = e.detail.value;
    this.setData({
      inputText: value,
      hasInput: value.trim().length > 0 || !!this.data.previewImage
    });
  },

  chooseImage: function () {
    var that = this;
    wx.chooseImage({
      count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
      success: function (res) {
        var path = res.tempFilePaths[0];
        wx.compressImage({
          src: path, quality: 60,
          success: function (compressed) {
            wx.getFileSystemManager().readFile({
              filePath: compressed.tempFilePath, encoding: 'base64',
              success: function (readRes) {
                that.setData({ previewImage: compressed.tempFilePath, _imageBase64: readRes.data, hasInput: true });
              }
            });
          },
          fail: function () {
            wx.getFileSystemManager().readFile({
              filePath: path, encoding: 'base64',
              success: function (readRes) {
                that.setData({ previewImage: path, _imageBase64: readRes.data, hasInput: true });
              }
            });
          }
        });
      }
    });
  },

  removePreviewImage: function () {
    this.setData({ previewImage: '', _imageBase64: '', hasInput: this.data.inputText.trim().length > 0 });
  },

  previewImage: function (e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.url] });
  },

  onSend: function () {
    var text = this.data.inputText.trim();
    var image = this.data._imageBase64 || '';
    if (!text && !image) return;
    this.sendMessage(text, image);
  },

  // 通用响应处理（直连 & 代理 返回格式相同）
  _handleResponse: function (res) {
    var that = this;
    var reply = '';
    if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
      reply = res.data.choices[0].message.content || '';
      if (!reply) reply = '抱歉，现在访问的人数过多，请重试。';
    } else if (res.statusCode === 413) {
      reply = '图片太大或消息过长，请压缩图片后重试。';
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

  // 构建 API 消息体（OpenRouter 格式）
  _buildApiMessages: function (messages) {
    var apiMessages = [{
      role: 'system',
      content: '你是一位耐心、友善的智能老师，擅长用简单易懂的语言解释各种学习问题。回答时注意：1.用中文回答 2.解释要清晰有条理 3.适当举例帮助理解 4.鼓励学生思考'
    }];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.role === 'user') {
        var msgHasImage = m.imageUrl && m.imageUrl.indexOf('base64,') > -1;
        if (msgHasImage) {
          var parts = [];
          if (m.content) parts.push({ type: 'text', text: m.content });
          parts.push({ type: 'image_url', image_url: { url: m.imageUrl } });
          apiMessages.push({ role: 'user', content: parts });
        } else {
          apiMessages.push({ role: 'user', content: m.content || '' });
        }
      } else if (m.role === 'ai') {
        apiMessages.push({ role: 'assistant', content: m.content });
      }
    }
    return apiMessages;
  },

  sendMessage: function (text, imageBase64) {
    if (this.data.loading) return;
    var that = this;
    var hasImage = !!imageBase64;

    var userMsg = {
      id: ++msgIdCounter, role: 'user', content: text,
      imageUrl: imageBase64 ? 'data:image/jpeg;base64,' + imageBase64 : ''
    };

    var messages = this.data.messages.concat([userMsg]);
    this.setData({ messages: messages, inputText: '', loading: true, previewImage: '', _imageBase64: '', hasInput: false });
    this.scrollToBottom();

    var apiMessages = this._buildApiMessages(messages);
    var startTime = Date.now();

    that._attemptRequest(0, startTime, apiMessages);
  },

  _attemptRequest: function (retryCount, startTime, apiMessages) {
    if (Date.now() - startTime >= 30000) {
      this._showError('当前使用人数过多，请稍后再试');
      return;
    }
    var that = this;
    that._tryProxy(apiMessages, function (ok, res) {
      if (ok) { that._handleResponse(res); return; }
      if (res && res.data && res.data.error) {
        that._handleResponse(res);
        return;
      }
      that._scheduleRetry(retryCount, startTime, apiMessages);
    });
  },

  _scheduleRetry: function (retryCount, startTime, apiMessages) {
    var that = this;
    var delay = Math.min(2000 * Math.pow(1.5, retryCount), 8000);
    setTimeout(function () {
      that._attemptRequest(retryCount + 1, startTime, apiMessages);
    }, delay);
  },

  _tryProxy: function (apiMessages, callback) {
    loginLib.callCloud('chat', {
      action: 'chat',
      messages: apiMessages
    })
      .then(function (data) {
        callback(true, { statusCode: 200, data: data });
      })
      .catch(function (err) {
        var errData = { error: err.error || 'cloud error' };
        if (err.statusCode) errData._statusCode = err.statusCode;
        callback(false, { statusCode: err.statusCode || 500, data: errData });
      });
  },

  copyText: function (e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.text || '' });
  },

  _showError: function (msg) {
    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: msg };
    this.setData({ messages: this.data.messages.concat([aiMsg]), loading: false });
    this.scrollToBottom();
  }
});
