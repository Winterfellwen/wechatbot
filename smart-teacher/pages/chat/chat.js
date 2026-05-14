// smart-teacher/pages/chat/chat.js
// 现代AI聊天 - 直连 OpenRouter，Render 仅提供 API Key

var CONFIG = require('../../../utils/config');
var SERVER = CONFIG.SERVER;
var msgIdCounter = 0;

var openRouterConfig = null;
var configLoaded = false;
var configLoading = null;

function initOpenRouter() {
  if (openRouterConfig && configLoaded) return Promise.resolve();
  if (configLoading) return configLoading;
  configLoading = new Promise(function(resolve, reject) {
    wx.request({
      url: SERVER + '/api/chat/key',
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
    previewImage: '',
    hasInput: false,
    _imageBase64: '',
    _configError: false
  },

  onLoad: function () {
    initOpenRouter().catch(function (err) {
      console.error('[chat] initOpenRouter failed:', err);
      that.setData({ _configError: true });
    });
  },

  // 滚动到底部
  scrollToBottom: function () {
    var that = this;
    setTimeout(function () {
      that.setData({ scrollTop: 999999 });
    }, 100);
  },

  // 输入监听
  onInput: function (e) {
    var value = e.detail.value;
    this.setData({
      inputText: value,
      hasInput: value.trim().length > 0 || !!this.data.previewImage
    });
  },

  // 快捷提问
  onQuickAsk: function (e) {
    var q = e.currentTarget.dataset.q;
    this.setData({ inputText: q, hasInput: true });
    this.sendMessage(q, '');
  },

  // 选择图片 — 自动压缩再编码
  chooseImage: function () {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var path = res.tempFilePaths[0];
        wx.compressImage({
          src: path,
          quality: 60,
          success: function (compressed) {
            wx.getFileSystemManager().readFile({
              filePath: compressed.tempFilePath,
              encoding: 'base64',
              success: function (readRes) {
                that.setData({
                  previewImage: compressed.tempFilePath,
                  _imageBase64: readRes.data,
                  hasInput: true
                });
              }
            });
          },
          fail: function () {
            wx.getFileSystemManager().readFile({
              filePath: path,
              encoding: 'base64',
              success: function (readRes) {
                that.setData({
                  previewImage: path,
                  _imageBase64: readRes.data,
                  hasInput: true
                });
              }
            });
          }
        });
      }
    });
  },

  // 移除预览图片
  removePreviewImage: function () {
    this.setData({
      previewImage: '',
      _imageBase64: '',
      hasInput: this.data.inputText.trim().length > 0
    });
  },

  // 预览图片
  previewImage: function (e) {
    var url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url] });
  },

  // 发送消息
  onSend: function () {
    var text = this.data.inputText.trim();
    var image = this.data._imageBase64 || '';
    if (!text && !image) return;
    this.sendMessage(text, image);
  },

  // 打字机效果 — 批量显示
  typeWriter: function (msgIndex, fullText, callback) {
    var that = this;
    var displayText = '';
    var index = 0;
    var messages = that.data.messages;
    var BATCH_MIN = 3;
    var BATCH_MAX = 5;

    if (!messages[msgIndex] || messages[msgIndex].role !== 'ai' || !fullText) {
      if (callback) callback();
      return;
    }

    function typeNext() {
      if (index >= fullText.length) {
        var finalUpdate = {};
        finalUpdate['messages[' + msgIndex + '].content'] = fullText;
        finalUpdate['messages[' + msgIndex + '].displayContent'] = null;
        that.setData(finalUpdate);
        if (callback) callback();
        return;
      }

      var batchSize = BATCH_MIN;
      var hasNewline = false;
      for (var i = 0; i < BATCH_MAX && index < fullText.length; i++, index++) {
        var ch = fullText[index];
        displayText += ch;
        if (ch === '\n') { batchSize = i + 1; hasNewline = true; break; }
        if (i >= BATCH_MIN && (index % 10 === 0 || fullText[index + 1] === undefined)) {
          batchSize = i + 1; break;
        }
      }

      var updateData = {};
      updateData['messages[' + msgIndex + '].displayContent'] = displayText;
      that.setData(updateData);

      if (index % 15 === 0 || index >= fullText.length) {
        that.scrollToBottom();
      }

      var delay = hasNewline ? 80 : (batchSize > BATCH_MIN ? 40 : 50);
      setTimeout(typeNext, delay);
    }

    typeNext();
  },

  // 发送消息核心 — 直连 OpenRouter
  sendMessage: function (text, imageBase64) {
    if (this.data.loading) return;

    var that = this;
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
      _imageBase64: '',
      hasInput: false
    });
    this.scrollToBottom();

    // 构建 API 消息（OpenRouter/OpenAI 格式）
    var apiMessages = [
      {
        role: 'system',
        content: '你是一位耐心、友善的智能老师，擅长用简单易懂的语言解释各种学习问题。回答时注意：1.用中文回答 2.解释要清晰有条理 3.适当举例帮助理解 4.鼓励学生思考'
      }
    ];

    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.role === 'user') {
        var msgHasImage = m.imageUrl && m.imageUrl.indexOf('base64,') > -1;
        if (msgHasImage) {
          var parts = [];
          if (m.content) parts.push({ type: 'text', text: m.content });
          var b64 = m.imageUrl.split('base64,')[1];
          parts.push({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + b64 } });
          apiMessages.push({ role: 'user', content: parts });
        } else {
          apiMessages.push({ role: 'user', content: m.content || '' });
        }
      } else if (m.role === 'ai') {
        apiMessages.push({ role: 'assistant', content: m.content });
      }
    }

    // 确保配置已加载
    initOpenRouter().then(function () {
      var maxTokens = hasImage ? 1024 : (openRouterConfig.maxTokens || 500);

      wx.request({
        url: openRouterConfig.apiUrl + '/chat/completions',
        method: 'POST',
        timeout: 60000,
        header: {
          'Authorization': 'Bearer ' + openRouterConfig.key,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://wechatbot-g6ez.onrender.com',
          'X-Title': 'SmartTeacherBot'
        },
        data: {
          model: openRouterConfig.model,
          messages: apiMessages,
          max_tokens: maxTokens
        },
        success: function (res) {
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

          var aiMsgIndex = that.data.messages.length;
          var aiMsg = {
            id: ++msgIdCounter,
            role: 'ai',
            content: reply,
            displayContent: undefined
          };

          that.setData({
            messages: that.data.messages.concat([aiMsg]),
            loading: false
          }, function () {
            that.scrollToBottom();
            that.typeWriter(aiMsgIndex, reply);
          });
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
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showToast({ title: '无法获取API配置', icon: 'none' });
      console.error('[chat] initOpenRouter failed:', err);
    });
  }
});
