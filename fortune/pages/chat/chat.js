const storageService = require('../../services/storage-service');
const aiService = require('../../services/ai-service');

Page({
  data: {
    readingId: '',
    messages: [],
    inputValue: '',
    isLoading: false,
    enableThinking: false,
    enableWebSearch: false,
    fileName: '',
    filePath: '',
    fileContent: '',
    scrollToView: ''
  },

  onLoad(options) {
    const readingId = options.readingId || '';
    this.setData({ readingId });
    this.loadChatHistory();
  },

  loadChatHistory() {
    const messages = storageService.getChatHistory(this.data.readingId);
    if (messages.length === 0) {
      this.setData({
        messages: [{
          role: 'assistant',
          content: '你好！我是AI运势助手。基于你的运势分析，有什么想进一步了解的吗？',
          id: 'msg_0'
        }]
      });
    } else {
      this.setData({ messages });
    }
  },

  handleInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  toggleThinking() {
    this.setData({ enableThinking: !this.data.enableThinking });
    wx.showToast({
      title: this.data.enableThinking ? '深度思考已开启' : '深度思考已关闭',
      icon: 'none'
    });
  },

  toggleWebSearch() {
    this.setData({ enableWebSearch: !this.data.enableWebSearch });
    wx.showToast({
      title: this.data.enableWebSearch ? '联网搜索已开启' : '联网搜索已关闭',
      icon: 'none'
    });
  },

  handleChooseFile() {
    if (this.data.isLoading) return;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['txt', 'md', 'csv', 'pdf', 'doc', 'docx'],
      success: (res) => {
        const file = res.tempFiles[0];
        if (file.size > 10 * 1024 * 1024) {
          wx.showToast({ title: '文件不能超过10MB', icon: 'none' });
          return;
        }
        this.setData({
          fileName: file.name,
          filePath: file.path
        });
        wx.showToast({ title: '已选择: ' + file.name, icon: 'none' });
      }
    });
  },

  clearFile() {
    this.setData({ fileName: '', filePath: '', fileContent: '' });
  },

  handleSend(e) {
    const content = e.detail.content;
    if (!content || this.data.isLoading) return;

    const userMsg = { role: 'user', content, id: 'msg_' + Date.now() };
    const messages = [...this.data.messages, userMsg];
    this.setData({ messages, inputValue: '', isLoading: true });

    const history = storageService.getHistoryById(this.data.readingId);
    let results = [];
    if (history) results = history.results;
    const profile = history ? history.profile : storageService.getProfile();

    const assistantIndex = messages.length;
    const assistantMsg = { role: 'assistant', content: '', id: 'msg_' + Date.now() + '_ai' };
    messages.push(assistantMsg);
    this.setData({ messages });

    const doSend = (fileContent) => {
      const prompt = aiService.buildChatPrompt(profile, results, content, {
        webSearch: this.data.enableWebSearch,
        fileContent: fileContent,
        fileName: this.data.fileName
      });

      aiService.streamAI(prompt,
        (fullText) => {
          const messages = [...this.data.messages];
          messages[assistantIndex] = { role: 'assistant', content: fullText, id: assistantMsg.id };
          this.setData({ messages });
        },
        () => {
          this.setData({ isLoading: false, fileName: '', filePath: '', fileContent: '' });
          this.saveChatHistory();
        },
        (err) => {
          console.error('Chat error:', err);
          const messages = [...this.data.messages];
          messages[assistantIndex] = { role: 'assistant', content: '抱歉，回答出现问题，请重试。', id: assistantMsg.id };
          this.setData({ messages, isLoading: false, fileName: '', filePath: '', fileContent: '' });
        },
        this.data.enableThinking
      );
    };

    if (this.data.filePath) {
      aiService.readFileContent(this.data.filePath, this.data.fileName)
        .then(doSend)
        .catch((err) => {
          wx.showToast({ title: err.message || '文件读取失败', icon: 'none' });
          this.setData({ isLoading: false });
        });
    } else {
      doSend('');
    }
  },

  saveChatHistory() {
    storageService.saveChatHistory(this.data.readingId, this.data.messages);
  },

  scrollToBottom() {
    if (this.data.messages.length === 0) return;
    const lastId = this.data.messages[this.data.messages.length - 1].id;
    this.setData({ scrollToView: lastId });
  },

  handleBack() {
    wx.navigateBack();
  }
});
