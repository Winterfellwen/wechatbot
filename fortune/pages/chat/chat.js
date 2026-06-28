const storageService = require('../../services/storage-service');
const aiService = require('../../services/ai-service');

const LOADING_TEXTS_CN = [
  '天地玄黄，宇宙洪荒',
  '日月盈昃，辰宿列张',
  '天行健，君子以自强不息',
  '地势坤，君子以厚德载物',
  '观乎天文，以察时变',
  '一阴一阳之谓道',
  '命由天定，运由己生',
  '紫微斗数，星命推演',
  '四柱八字，五行生克',
  '易经六十四卦，变化无穷',
  '乾坤运转，阴阳调和',
  '天干地支，六十甲子',
  '五行相生相克，命运轮回',
  '福兮祸所伏，祸兮福所倚',
  '大衍之数五十，其用四十有九',
  '贞观之道，在乎天人合一'
];

const LOADING_TEXTS_EN = [
  'Ad astra per aspera',
  'Per aspera ad astra',
  'Stella cadens, fatum ducit',
  'Caelum et terra, omnia mutant',
  'Sidera ducunt, fatum sequitur',
  'Ars longa, vita brevis',
  'Corona stellarum, fatum tuum',
  'Luna plena, energy crescit',
  'Sol illuminat, Luna revelat',
  'Virtus unita fortior',
  'Fata viam invenient',
  'Amor vincit omnia',
  'Tempus fugit, momenta manent',
  'Cogito ergo sum',
  'Festina lente',
  'Gnothi seauton'
];

function getRandomTexts(category, count) {
  var texts = category === 'chinese' ? LOADING_TEXTS_CN : LOADING_TEXTS_EN;
  var shuffled = texts.slice().sort(function() { return 0.5 - Math.random(); });
  return shuffled.slice(0, count || 4);
}

Page({
  data: {
    readingId: '',
    messages: [],
    inputValue: '',
    isLoading: false,
    fileName: '',
    filePath: '',
    fileContent: '',
    scrollToView: '',
    themeClass: 'bg-chinese',
    themeColor: '#d97757',
    category: 'chinese',
    baziSummary: '',
    thinkingTexts: [],
    keyboardHeight: 0,
    keyboardStyle: ''
  },

  _thinkingTimer: null,

  onLoad(options) {
    const readingId = options.readingId || '';
    this.setData({ readingId });
    this.loadTheme();
    this.loadChatHistory();
  },

  onShow() {
    try {
      wx.onKeyboardHeightChange(function(res) {
        var h = res.height;
        this.setData({
          keyboardHeight: h,
          keyboardStyle: h > 0 ? 'padding-bottom:' + h + 'px' : ''
        });
      }.bind(this));
    } catch (e) {}
  },

  onUnload() {
    if (this._thinkingTimer) {
      clearInterval(this._thinkingTimer);
      this._thinkingTimer = null;
    }
  },

  loadTheme() {
    var history = storageService.getHistoryById(this.data.readingId);
    if (history) {
      var isChinese = history.category === 'chinese';
      this.setData({
        category: history.category || 'chinese',
        themeClass: isChinese ? 'bg-chinese' : 'bg-western',
        themeColor: isChinese ? '#d97757' : '#818cf8',
        baziSummary: history.results && history.results.length > 0 && history.results[0].calcData
          ? history.results[0].calcData.summary : ''
      });
    }
  },

  loadChatHistory() {
    const messages = storageService.getChatHistory(this.data.readingId);
    if (messages.length === 0) {
      this.setData({
        messages: [{
          role: 'assistant',
          content: '星轨已开启，命盘已现。\n\n有什么想深入了解的吗？我会结合你的运势，为你揭示更多天机。',
          id: 'msg_0'
        }]
      });
    } else {
      this.setData({ messages });
    }
    this.scrollToBottom();
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
          filePath: file.path,
          fileContent: ''
        });
        wx.showToast({ title: '已选择: ' + file.name, icon: 'none' });
      }
    });
  },

  clearFile() {
    this.setData({ fileName: '', filePath: '', fileContent: '' });
  },

  handleInputChange(e) {
    this.setData({ inputValue: e.detail.value });
  },

  handleConfirm(e) {
    if (this.data.isLoading) return;
    const content = e.detail.content;
    if (!content) return;
    this.handleSend({ detail: { content } });
  },

  handleTapSend() {
    if (this.data.isLoading) return;
    const content = this.data.inputValue.trim();
    if (!content) return;
    this.handleSend({ detail: { content } });
  },

  handleSend(e) {
    const content = e.detail.content;
    if (!content || this.data.isLoading) return;

    const userMsg = { role: 'user', content, id: 'msg_' + Date.now() };
    const messages = [...this.data.messages, userMsg];
    this.setData({ messages, inputValue: '', isLoading: true, thinkingTexts: getRandomTexts(this.data.category, 4) });
    this.scrollToBottom();

    // 思考动画：每 3 秒换一批短语
    var that = this;
    if (this._thinkingTimer) clearInterval(this._thinkingTimer);
    this._thinkingTimer = setInterval(function() {
      if (!that.data.isLoading) {
        clearInterval(that._thinkingTimer);
        that._thinkingTimer = null;
        return;
      }
      that.setData({ thinkingTexts: getRandomTexts(that.data.category, 4) });
    }, 3000);

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
        fileContent: fileContent,
        fileName: this.data.fileName
      }, this.data.messages);

      aiService.streamAI(prompt,
        (fullText) => {
          // 首次内容到达时停止思考动画
          if (that._thinkingTimer) {
            clearInterval(that._thinkingTimer);
            that._thinkingTimer = null;
          }
          const messages = [...that.data.messages];
          messages[assistantIndex] = { role: 'assistant', content: fullText, id: assistantMsg.id };
          that.setData({ messages, thinkingTexts: [] });
          that.scrollToBottom();
        },
        () => {
          that.setData({ isLoading: false, fileName: '', filePath: '', fileContent: '' });
          that.saveChatHistory();
          that.scrollToBottom();
        },
        (err) => {
          console.error('Chat error:', err);
          const messages = [...that.data.messages];
          messages[assistantIndex] = { role: 'assistant', content: '抱歉，回答出现问题，请重试。', id: assistantMsg.id };
          that.setData({ messages, isLoading: false, fileName: '', filePath: '', fileContent: '', thinkingTexts: [] });
          that.scrollToBottom();
        }
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
