const app = getApp();

const SYSTEM_PROMPT = `你是"花子先生"（Hanako-sensei），一位专业且亲切的日语教师。你有以下特质和能力：

【身份】
- 日本东京出身，母语日语，精通中文
- 有10年JLPT教学经验，擅长N5到N1全级别教学
- 性格温柔耐心，善于鼓励学生，用简单易懂的方式解释复杂语法

【能力】
1. 可以讲解日语五十音、发音规则、声调
2. 可以分析任何日语语法结构，并用中文对照解释
3. 可以教授JLPT N5~N1各级别词汇和语法
4. 可以进行日汉互译，并提供逐词解析
5. 可以编写适合不同级别的日语对话和阅读材料
6. 可以纠正学生的日语错误并解释原因

【教学风格】
- 回答时尽量用中日双语对照
- 语法解释要循序渐进，先给简单例子再深入
- 如果学生犯错，先鼓励再纠正
- 适当使用emoji增加亲和力，但不要过度

【回复格式】
当你讲解一个知识点时，请按以下格式：
1. 先简要回答（中文）
2. 然后给出日语例句（带假名注音）
3. 逐词解析
4. 最后给一个小练习或延伸

现在请用日语和中文欢迎学生，并询问他们想学什么。`;

Page({
  data: {
    messages: [
      { id: 0, role: 'assistant', content: 'こんにちは！私は花子先生です。\n你好！我是花子老师。\n\n今天想学什么日语呢？单词、语法、对话，还是考试准备？\n今日はどんな日本語を勉強したいですか？' }
    ],
    input: '',
    loading: false,
    currentTab: 'aichat',
    scrollTop: 0
  },

  onLoad() {
    this.setData({ currentTab: 'aichat' });
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  sendMessage() {
    const input = this.data.input.trim();
    if (!input || this.data.loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: input };
    const messages = [...this.data.messages, userMsg];

    this.setData({
      messages,
      input: '',
      loading: true,
      scrollTop: 99999
    });

    this.callAI(messages);
  },

  quickAsk(e) {
    const q = e.currentTarget.dataset.q;
    this.setData({ input: q }, () => this.sendMessage());
  },

  callAI(messages) {
    const history = messages.slice(-15).map(m => ({
      role: m.role,
      content: m.content
    }));

    wx.request({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      method: 'POST',
      header: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json'
      },
      data: {
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        max_tokens: 800,
        temperature: 0.7
      },
      success: (res) => {
        let content = '抱歉，AI暂时无法回答，请稍后再试。';
        if (res.data && res.data.choices && res.data.choices[0]) {
          content = res.data.choices[0].message.content;
        } else if (res.data && res.data.error) {
          content = '出错: ' + (res.data.error.message || '未知错误');
        }

        const assistantMsg = { id: Date.now() + 1, role: 'assistant', content };
        this.setData({
          messages: [...this.data.messages, assistantMsg],
          loading: false,
          scrollTop: 99999
        });
      },
      fail: (err) => {
        console.log('API error:', err);
        const assistantMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: '网络连接失败，请检查网络后重试。'
        };
        this.setData({
          messages: [...this.data.messages, assistantMsg],
          loading: false,
          scrollTop: 99999
        });
      }
    });
  },

  goToLesson() { wx.redirectTo({ url: '/japanese/pages/learn/learn' }); },
  goToCourse() { wx.redirectTo({ url: '/japanese/pages/course/course' }); },
  goToAI() { wx.redirectTo({ url: '/japanese/pages/aichat/aichat' }); },
  goToRank() { wx.navigateTo({ url: '/japanese/pages/leaderboard/leaderboard' }); }
});
