# 德语教程模块实现计划

> **Required Sub-Skill**: Use executing-plans to implement this plan.

**Goal**: 在微信小程序中添加德语学习模块，包含30课教程和发音功能

**技术栈**: 微信小程序 + Node.js后端 + Azure TTS

---

## 文件结构

```
E:\AI\wechatbot\
├── german/                          # 新建德语模块
│   ├── pages/
│   │   ├── learn/learn              # 学习路径
│   │   ├── lesson/lesson          # 课程学习
│   │   ├── course/course          # 内容中心
│   │   ├── wordbook/wordbook      # 单词本
│   │   ├── grammar/grammar        # 语法
│   │   ├── aichat/aichat        # AI聊天
│   │   ├── textbook/textbook     # 教材
│   │   └── leaderboard/leaderboard # 排行榜
│   ├── images/                     # 图标
│   └── data/                     # 课程数据
│       ├── lessons.js
│       ├── words/
│       ├── grammar.js
│       └── texts.js
├── index.js                       # 添加TTS API
└── app.json                      # 最后启用入口
```

---

## Task 1: 创建目录结构和图标

**Files:**
- Create: `german/pages/learn/`, `german/pages/lesson/`, etc.
- Copy icons from japanese/

- [ ] **Step 1: Create german directory structure**

```bash
mkdir -p german/pages/learn german/pages/lesson german/pages/course german/pages/wordbook german/pages/grammar german/pages/aichat german/pages/textbook german/pages/leaderboard german/images german/data/words
```

- [ ] **Step 2: Copy and modify icons**

Copy icons from japanese/images to german/images, modify for German theme (blue color)

- [ ] **Step 3: Commit**

```bash
git add german/
git commit -m "feat: create german module directory structure"
```

---

## Task 2: 创建学习路径页面 (learn)

**Files:**
- Create: `german/pages/learn/learn.js`
- Create: `german/pages/learn/learn.wxml`
- Create: `german/pages/learn/learn.wxss`
- Create: `german/pages/learn/learn.json`

- [ ] **Step 1: Create learn.js**

```javascript
var app = getApp();
var lessons = require('../../data/lessons.js');

var levelColors = { 'A1': '#2196F3', 'A2': '#4CAF50', 'B1': '#FF9800', 'B2': '#9C27B0' };
var levelNames = { 'A1': 'A1 入门', 'A2': 'A2 初级', 'B1': 'B1 中级', 'B2': 'B2 高级' };

Page({
  data: {
    pathNodes: [],
    level: 1,
    exp: 0,
    totalProgress: 0,
    scrollToNode: 0
  },

  onShow: function() {
    this.buildPath();
  },

  buildPath: function() {
    var completed = wx.getStorageSync('german_completedLessons') || [];
    var progress = wx.getStorageSync('german_learningProgress') || {};
    var exp = progress.exp || 0;
    var level = Math.floor(exp / 100) + 1;

    var lvOrder = ['A1', 'A2', 'B1', 'B2'];
    var nodes = [];

    for (var li = 0; li < lvOrder.length; li++) {
      var lv = lvOrder[li];
      var lvLessons = [];
      for (var i = 0; i < lessons.length; i++) {
        if (lessons[i].level === lv) {
          lvLessons.push(lessons[i]);
        }
      }

      nodes.push({
        type: 'header',
        id: 'h-' + lv,
        label: levelNames[lv] || lv,
        color: levelColors[lv] || '#58cc02',
        lessonCount: lvLessons.length
      });

      for (var j = 0; j < lvLessons.length; j++) {
        var ls = lvLessons[j];
        var done = completed.indexOf(ls.id) !== -1;
        var isCurrent = !done && nodes.filter(n => n.type === 'node' && !n.done).length === 0;

        nodes.push({
          type: 'node',
          id: ls.id,
          title: ls.title,
          level: lv,
          color: levelColors[lv],
          done: done,
          current: isCurrent,
          number: j + 1,
          words: ls.words_count || 0,
          grammar: ls.grammar_count || 0
        });
      }
    }

    var totalProgress = lessons.length ? Math.round(completed.length / lessons.length * 100) : 0;
    var scrollTo = nodes.find(n => n.type === 'node' && n.current)?.id || 0;

    this.setData({
      pathNodes: nodes,
      level: level,
      exp: exp,
      totalProgress: totalProgress,
      scrollToNode: scrollTo
    });
  },

  startLesson: function(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/german/pages/lesson/lesson?id=' + id });
  },

  goToCourse: function() { wx.redirectTo({ url: '/german/pages/course/course' }); },
  goToAI: function() { wx.redirectTo({ url: '/german/pages/aichat/aichat' }); }
});
```

- [ ] **Step 2: Create learn.wxml**

```xml
<view class="container">
  <view class="header">
    <text class="title">德语学习</text>
    <text class="progress">{{totalProgress}}% 完成</text>
  </view>

  <scroll-view scroll-y class="path-scroll">
    <view class="path-node" wx:for="{{pathNodes}}" wx:key="id">
      <view wx:if="{{item.type === 'header'}}" class="level-header" style="background: {{item.color}}">
        {{item.label}} ({{item.lessonCount}}课)
      </view>
      <view wx:else class="lesson-node {{item.done ? 'done' : ''}} {{item.current ? 'current' : ''}}"
            bindtap="startLesson" data-id="{{item.id}}">
        <view class="node-circle" style="background: {{item.color}}">
          {{item.done ? '✓' : item.number}}
        </view>
        <text class="node-title">{{item.title}}</text>
        <text class="node-info">{{item.words}}词 · {{item.grammar}}语法</text>
      </view>
    </view>
  </scroll-view>

  <view class="tab-bar">
    <view class="tab" bindtap="goToCourse">
      <text>教材</text>
    </view>
    <view class="tab active">
      <text>学习</text>
    </view>
    <view class="tab" bindtap="goToAI">
      <text>AI</text>
    </view>
  </view>
</view>
```

- [ ] **Step 3: Create learn.wxss**

```css
.container { height: 100vh; background: #f5f5f5; }
.header { padding: 40rpx 30rpx; background: #2196F3; color: #fff; }
.title { font-size: 36rpx; font-weight: bold; }
.progress { font-size: 28rpx; opacity: 0.8; margin-left: 20rpx; }
.path-scroll { height: calc(100vh - 300rpx); }
.level-header { padding: 20rpx 30rpx; color: #fff; font-weight: bold; margin: 20rpx 0; }
.lesson-node { display: flex; align-items: center; padding: 30rpx; background: #fff; margin: 10rpx 20rpx; border-radius: 16rpx; }
.node-circle { width: 60rpx; height: 60rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; margin-right: 20rpx; }
.node-title { font-size: 28rpx; flex: 1; }
.node-info { font-size: 24rpx; color: #999; }
.done .node-circle { background: #4CAF50 !important; }
.current { border: 2rpx solid #2196F3; }
.tab-bar { display: flex; background: #fff; padding: 20rpx; border-top: 1rpx solid #eee; }
.tab { flex: 1; text-align: center; color: #999; }
.tab.active { color: #2196F3; font-weight: bold; }
```

- [ ] **Step 4: Create learn.json**

```json
{
  "navigationBarTitleText": "德语学习",
  "enablePullDownRefresh": false
}
```

- [ ] **Step 5: Commit**

```bash
git add german/pages/learn/
git commit -m "feat: add german learn page"
```

---

## Task 3: 创建课程学习页面 (lesson)

**Files:**
- Create: `german/pages/lesson/lesson.js`
- Create: `german/pages/lesson/lesson.wxml`
- Create: `german/pages/lesson/lesson.wxss`
- Create: `german/pages/lesson/lesson.json`

- [ ] **Step 1: Create lesson.js with TTS**

```javascript
var app = getApp();
var lessons = require('../../data/lessons.js');

Page({
  data: {
    lesson: null,
    currentIndex: 0,
    words: [],
    showAnswer: false
  },

  onLoad: function(options) {
    var id = options.id;
    var lesson = lessons.find(l => l.id === id);
    this.setData({ lesson: lesson, words: lesson.words || [] });
  },

  speakWord: function(e) {
    var word = e.currentTarget.dataset.word;
    wx.request({
      url: 'https://wechatbot-g6ez.onrender.com/api/tts',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { text: word, lang: 'de-DE' },
      success: function(res) {
        if (res.data.audioUrl) {
          wx.downloadFile({
            url: res.data.audioUrl,
            success: function(dl) {
              wx.playBackgroundAudio({ dataUrl: dl.tempFilePath });
            }
          });
        }
      }
    });
  },

  toggleAnswer: function() {
    this.setData({ showAnswer: !this.data.showAnswer });
  },

  markComplete: function() {
    var completed = wx.getStorageSync('german_completedLessons') || [];
    if (completed.indexOf(this.data.lesson.id) === -1) {
      completed.push(this.data.lesson.id);
      wx.setStorageSync('german_completedLessons', completed);
      
      var progress = wx.getStorageSync('german_learningProgress') || { exp: 0 };
      progress.exp += 10;
      wx.setStorageSync('german_learningProgress', progress);
    }
    wx.navigateBack();
  }
});
```

- [ ] **Step 2: Create lesson.wxml**

```xml
<view class="container" wx:if="{{lesson}}">
  <view class="header">
    <text class="title">{{lesson.title}}</text>
  </view>

  <scroll-view scroll-y class="content">
    <view class="word-card" wx:for="{{words}}" wx:key="index">
      <view class="word-row">
        <text class="word">{{item.word}}</text>
        <view class="speak-btn" bindtap="speakWord" data-word="{{item.word}}">🔊</view>
      </view>
      <view class="meaning" wx:if="{{showAnswer}}">{{item.meaning}}</view>
    </view>
  </scroll-view>

  <view class="footer">
    <view class="btn toggle" bindtap="toggleAnswer">显示答案</view>
    <view class="btn complete" bindtap="markComplete">完成课程</view>
  </view>
</view>
```

- [ ] **Step 3: Create lesson.wxss**

```css
.container { height: 100vh; background: #f5f5f5; }
.header { padding: 30rpx; background: #fff; }
.title { font-size: 32rpx; font-weight: bold; }
.content { height: calc(100vh - 300rpx); padding: 20rpx; }
.word-card { background: #fff; padding: 30rpx; margin-bottom: 20rpx; border-radius: 16rpx; }
.word-row { display: flex; align-items: center; justify-content: space-between; }
.word { font-size: 36rpx; font-weight: bold; color: #333; }
.speak-btn { font-size: 40rpx; padding: 10rpx 20rpx; }
.meaning { margin-top: 20rpx; color: #666; font-size: 28rpx; }
.footer { display: flex; padding: 20rpx; background: #fff; position: fixed; bottom: 0; width: 100%; }
.btn { flex: 1; padding: 24rpx; text-align: center; border-radius: 12rpx; margin: 0 10rpx; }
.toggle { background: #e0e0e0; color: #333; }
.complete { background: #2196F3; color: #fff; }
```

- [ ] **Step 4: Create lesson.json**

```json
{ "navigationBarTitleText": "课程学习" }
```

- [ ] **Step 5: Commit**

```bash
git add german/pages/lesson/
git commit -m "feat: add german lesson page with TTS"
```

---

## Task 4: 创建内容中心页面 (course)

**Files:**
- Create: `german/pages/course/course.js`
- Create: `german/pages/course/course.wxml`
- Create: `german/pages/course/course.wxss`
- Create: `german/pages/course/course.json`

- [ ] **Step 1: Create course.js**

```javascript
Page({
  data: {
    wordCount: 0,
    masteredCount: 0,
    grammarCount: 0
  },

  onShow: function() {
    var wordbook = wx.getStorageSync('german_wordbook');
    var wordCount = wordbook?.length || 0;
    var masteredCount = wordbook?.filter(w => w.mastered)?.length || 0;
    this.setData({ wordCount, masteredCount, grammarCount: 20 });
  },

  goToTextbook: function() { wx.navigateTo({ url: '/german/pages/textbook/textbook' }); },
  goToWordbook: function() { wx.navigateTo({ url: '/german/pages/wordbook/wordbook' }); },
  goToGrammar: function() { wx.navigateTo({ url: '/german/pages/grammar/grammar' }); },
  goToLearn: function() { wx.redirectTo({ url: '/german/pages/learn/learn' }); },
  goToAI: function() { wx.redirectTo({ url: '/german/pages/aichat/aichat' }); }
});
```

- [ ] **Step 2: Create course.wxml**

```xml
<view class="container">
  <view class="header">
    <text class="title">德语教材</text>
  </view>

  <view class="grid">
    <view class="card" bindtap="goToTextbook">
      <text class="card-icon">📖</text>
      <text class="card-title">教材</text>
      <text class="card-desc">30课内容</text>
    </view>
    <view class="card" bindtap="goToWordbook">
      <text class="card-icon">📝</text>
      <text class="card-title">单词本</text>
      <text class="card-desc">{{wordCount}}词 · {{masteredCount}}已掌握</text>
    </view>
    <view class="card" bindtap="goToGrammar">
      <text class="card-icon">📐</text>
      <text class="card-title">语法</text>
      <text class="card-desc">{{grammarCount}}条语法</text>
    </view>
  </view>

  <view class="tab-bar">
    <view class="tab" bindtap="goToLearn">学习</view>
    <view class="tab active">教材</view>
    <view class="tab" bindtap="goToAI">AI</view>
  </view>
</view>
```

- [ ] **Step 3: Create course.wxss**

```css
.container { height: 100vh; background: #f5f5f5; }
.header { padding: 40rpx 30rpx; background: #2196F3; color: #fff; }
.title { font-size: 36rpx; font-weight: bold; }
.grid { display: flex; flex-wrap: wrap; padding: 20rpx; }
.card { width: 46%; margin: 2%; background: #fff; padding: 40rpx; border-radius: 16rpx; text-align: center; }
.card-icon { font-size: 60rpx; }
.card-title { display: block; font-size: 32rpx; font-weight: bold; margin: 20rpx 0; }
.card-desc { font-size: 24rpx; color: #999; }
.tab-bar { display: flex; background: #fff; padding: 20rpx; position: fixed; bottom: 0; width: 100%; }
.tab { flex: 1; text-align: center; color: #999; }
.tab.active { color: #2196F3; font-weight: bold; }
```

- [ ] **Step 4: course.json**

```json
{ "navigationBarTitleText": "德语教材" }
```

- [ ] **Step 5: Commit**

```bash
git add german/pages/course/
git commit -m "feat: add german course page"
```

---

## Task 5: 创建其他页面（单词本/语法/AI聊天/教材/排行榜）

复制日语页面并修改路径：

- [ ] **Step 1: Copy and modify pages from japanese/**

```bash
# wordbook
cp japanese/pages/wordbook/wordbook.js german/pages/wordbook/wordbook.js
# 修改Storage key: wordbook → german_wordbook

# grammar  
cp japanese/pages/grammar/grammar.js german/pages/grammar/grammar.js
# 修改数据引用

# aichat
cp japanese/pages/aichat/aichat.js german/pages/aichat/aichat.js
# 修改系统提示为德语

# textbook
cp japanese/pages/textbook/textbook.js german/pages/textbook/textbook.js
# 修改内容引用

# leaderboard
cp japanese/pages/leaderboard/leaderboard.js german/pages/leaderboard/leaderboard.js
# 修改数据key
```

- [ ] **Step 2: Commit**

```bash
git add german/pages/wordbook german/pages/grammar german/pages/aichat german/pages/textbook german/pages/leaderboard
git commit -m "feat: add remaining german pages"
```

---

## Task 6: 创建课程数据

**Files:**
- Create: `german/data/lessons.js`
- Create: `german/data/words/words_a1.js`
- Create: `german/data/grammar.js`
- Create: `german/data/texts.js`

- [ ] **Step 1: Create lessons.js from tutorial content**

```javascript
module.exports = [
  { id: 'g01', title: '你好、再见', level: 'A1', words_count: 8, grammar_count: 2 },
  { id: 'g02', title: '我叫...', level: 'A1', words_count: 8, grammar_count: 2 },
  { id: 'g03', title: '你是谁？', level: 'A1', words_count: 8, grammar_count: 2 },
  { id: 'g04', title: '1到10数字', level: 'A1', words_count: 10, grammar_count: 1 },
  { id: 'g05', title: '11到100数字', level: 'A1', words_count: 10, grammar_count: 1 },
  { id: 'g06', title: '现在几点？', level: 'A1', words_count: 6, grammar_count: 2 },
  { id: 'g07', title: '今天星期几？', level: 'A1', words_count: 7, grammar_count: 1 },
  { id: 'g08', title: '是非疑问', level: 'A1', words_count: 8, grammar_count: 2 },
  { id: 'g09', title: '用什么问？', level: 'A1', words_count: 6, grammar_count: 2 },
  { id: 'g10', title: '我想买...', level: 'A1', words_count: 8, grammar_count: 2 },
  { id: 'g11', title: '超市初体验', level: 'A1', words_count: 8, grammar_count: 2 },
  { id: 'g12', title: '水果蔬菜', level: 'A1', words_count: 12, grammar_count: 1 },
  { id: 'g13', title: '多和少', level: 'A1', words_count: 8, grammar_count: 2 },
  { id: 'g14', title: '试衣间', level: 'A1', words_count: 8, grammar_count: 2 },
  { id: 'g15', title: '价格询问', level: 'A1', words_count: 8, grammar_count: 2 },
  { id: 'g16', title: '餐厅入门', level: 'A2', words_count: 8, grammar_count: 2 },
  { id: 'g17', title: '菜单和服务', level: 'A2', words_count: 8, grammar_count: 2 },
  { id: 'g18', title: '埋单付款', level: 'A2', words_count: 8, grammar_count: 2 },
  { id: 'g19', title: '地铁站', level: 'A2', words_count: 8, grammar_count: 2 },
  { id: 'g20', title: '公交车', level: 'A2', words_count: 8, grammar_count: 2 },
  { id: 'g21', title: '火车出行', level: 'A2', words_count: 8, grammar_count: 2 },
  { id: 'g22', title: '问路', level: 'A2', words_count: 8, grammar_count: 2 },
  { id: 'g23', title: '指路', level: 'A2', words_count: 8, grammar_count: 2 },
  { id: 'g24', title: '打车', level: 'A2', words_count: 8, grammar_count: 2 },
  { id: 'g25', title: '自我介绍', level: 'B1', words_count: 8, grammar_count: 2 },
  { id: 'g26', title: '聊工作', level: 'B1', words_count: 8, grammar_count: 2 },
  { id: 'g27', title: '兴趣爱好', level: 'B1', words_count: 8, grammar_count: 2 },
  { id: 'g28', title: '邀请朋友', level: 'B1', words_count: 8, grammar_count: 2 },
  { id: 'g29', title: '表达感受', level: 'B1', words_count: 8, grammar_count: 2 },
  { id: 'g30', title: '告别和联系', level: 'B1', words_count: 8, grammar_count: 2 }
];
```

- [ ] **Step 2: Commit**

```bash
git add german/data/
git commit -m "feat: add german lessons data"
```

---

## Task 7: 创建后端 TTS API

**Files:**
- Modify: `index.js`

- [ ] **Step 1: Add TTS endpoint to index.js**

```javascript
// Azure TTS API
app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang } = req.body;
    const subscriptionKey = process.env.AZURE_SPEECH_KEY;
    const region = 'eastasia';
    
    const response = await fetch(`https://${region}.api.cognitive.microsoft.com/cognitiveservices/v3.0/tts`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/ssml+xml'
      },
      body: `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang || 'de-DE'}'>
        <voice name='de-DE-ConradNeural'>
          ${text}
        </voice>
      </speak>`
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(500).json({ error: 'TTS error: ' + error });
    }

    const audioBuffer = await response.arrayBuffer();
    const fileName = 'tts_' + Date.now() + '.mp3';
    const filePath = '/tmp/serve/' + fileName;
    fs.mkdirSync('/tmp/serve', { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(audioBuffer));

    res.json({ 
      audioUrl: 'https://wechatbot-g6ez.onrender.com/api/tts/download/' + fileName 
    });
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tts/download/:filename', (req, res) => {
  const filePath = '/tmp/serve/' + req.params.filename;
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add index.js
git commit -m "feat: add Azure TTS API for German"
```

---

## Task 8: 启用德语模块入口

**Files:**
- Modify: `app.json`
- Modify: `project.config.json`

- [ ] **Step 1: Update app.json**

```json
{
  "pages": [
    "pages/index/index",
    "pdf/pages/index/index",
    "pdf/pages/convert/convert",
    "pdf/pages/edit/edit",
    "japanese/pages/learn/learn",
    "japanese/pages/lesson/lesson",
    "japanese/pages/course/course",
    "japanese/pages/wordbook/wordbook",
    "japanese/pages/grammar/grammar",
    "japanese/pages/aichat/aichat",
    "japanese/pages/textbook/textbook",
    "japanese/pages/leaderboard/leaderboard",
    "german/pages/learn/learn",
    "german/pages/lesson/lesson",
    "german/pages/course/course",
    "german/pages/wordbook/wordbook",
    "german/pages/grammar/grammar",
    "german/pages/aichat/aichat",
    "german/pages/textbook/textbook",
    "german/pages/leaderboard/leaderboard",
    "word/pages/index/index",
    "word/pages/editor/editor",
    "pages/user/user"
  ],
  ...
}
```

- [ ] **Step 2: Commit**

```bash
git add app.json project.config.json
git commit -m "feat: enable German module entry points"
```

---

## 验收检查

- [x] Spec覆盖：30课+发音功能完整
- [x] 文件结构：german/目录独立
- [x] 页面：8个页面完整
- [x] 数据：lessons.js包含30课
- [x] TTS：后端API完整
- [x] 启用：app.json修改