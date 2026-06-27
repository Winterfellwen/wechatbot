const storageService = require('../../services/storage-service');
const aiService = require('../../services/ai-service');

Page({
  data: {
    readingId: '',
    messages: [],
    inputValue: '',
    isLoading: false
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
          content: '你好！我是AI运势助手。基于你的运势分析，有什么想进一步了解的吗？'
        }]
      });
    } else {
      this.setData({ messages });
    }
  },

  handleInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  handleSend(e) {
    const content = e.detail.content;
    if (!content || this.data.isLoading) {
      return;
    }

    const messages = [...this.data.messages, { role: 'user', content }];
    this.setData({ messages, inputValue: '', isLoading: true });

    const history = storageService.getHistoryById(this.data.readingId);
    let results = [];
    if (history) {
      results = history.results;
    }
    const profile = history ? history.profile : storageService.getProfile();

    const prompt = aiService.buildChatPrompt(profile, results, content);

    const assistantIndex = messages.length;

    messages.push({ role: 'assistant', content: '' });
    this.setData({ messages });

    aiService.callAI(prompt).then((reply) => {
      const messages = [...this.data.messages];
      messages[assistantIndex] = { role: 'assistant', content: reply };
      this.setData({ messages, isLoading: false });
      this.saveChatHistory();
      this.scrollToBottom();
    }).catch((err) => {
      console.error('Chat error:', err);
      const messages = [...this.data.messages];
      messages[assistantIndex] = { role: 'assistant', content: '抱歉，回答出现问题，请重试。' };
      this.setData({ messages, isLoading: false });
    });
  },

  saveChatHistory() {
    storageService.saveChatHistory(this.data.readingId, this.data.messages);
  },

  scrollToBottom() {
    wx.pageScrollTo({
      selector: '.chat-list',
      duration: 100
    });
  },

  handleBack() {
    wx.navigateBack();
  }
});
