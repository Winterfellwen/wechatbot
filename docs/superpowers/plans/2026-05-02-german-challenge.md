# 德语闯关模块实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现德语闯关学习模块，包含15关/等级的阶梯式关卡设计，5种题型，科学的错题复习机制

**Architecture:** 采用动态数据加载模式，闯关页面从 german/data/ 读取关卡数据，错题通过本地存储管理，复习使用间隔重复算法

**Tech Stack:** 微信小程序原生开发，wx.setStorage 本地存储，TTS语音合成

---

## 文件结构

```
german/
├── pages/
│   ├── learn/
│   │   ├── learn.js         闯关主页（选择等级/关卡）
│   │   ├── learn.wxml
│   │   ├── learn.wxss
│   │   ├── learn.json
│   │   ├── challenge.js      闯关答题页面
│   │   ├── challenge.wxml
│   │   ├── challenge.wxss
│   │   └── challenge.json
│   │   ├── result.js         闯关结果页面
│   │   ├── result.wxml
│   │   ├── result.wxss
│   │   └── result.json
│   │   └── review.js         复习关卡页面
│   │   ├── review.wxml
│   │   ├── review.wxss
│   │   └── review.json
│   └── leaderboard/
│       └── ...
├── data/
│   ├── a1/
│   │   ├── levels.json      A1等级15关配置
│   │   ├── vocab.js         A1词汇（200词）
│   │   ├── grammar.js       A1语法（15-20个）
│   │   ├── pronunciation.js  A1发音规则（10个）
│   │   └── texts.js         A1课文（10篇）
│   ├── a2/
│   ├── b1/
│   └── b2/
└── utils/
    ├── storage.js           本地存储工具
    ├── tts.js               TTS发音工具
    └── algorithm.js         间隔重复算法
```

---

## Task 1: 准备数据结构和工具

**Files:**
- Create: `german/utils/storage.js`
- Create: `german/utils/tts.js`
- Create: `german/utils/algorithm.js`

- [ ] **Step 1: 创建存储工具**

```javascript
// german/utils/storage.js
const STORAGE_KEYS = {
  USER_PROGRESS: 'german_user_progress',    // 用户进度
  WRONG_WORDS: 'german_wrong_words',        // 错题记录
  WORD_BOOK: 'german_word_book',           // 生词本
  REVIEW_QUEUE: 'german_review_queue'      // 复习队列
};

function getUserProgress() {
  return wx.getStorageSync(STORAGE_KEYS.USER_PROGRESS) || {
    currentLevel: 'a1',
    currentLevelIndex: 1,
    completedLevels: [],
    totalPoints: 0
  };
}

function setUserProgress(data) {
  wx.setStorageSync(STORAGE_KEYS.USER_PROGRESS, data);
}

function getWrongWords() {
  return wx.getStorageSync(STORAGE_KEYS.WRONG_WORDS) || [];
}

function addWrongWord(word) {
  const list = getWrongWords();
  const exists = list.find(w => w.word === word.word);
  if (!exists) {
    list.push({
      ...word,
      wrongCount: 1,
      lastWrong: Date.now(),
      nextReview: Date.now() + 24 * 60 * 60 * 1000
    });
    wx.setStorageSync(STORAGE_KEYS.WRONG_WORDS, list);
  }
}

function getReviewQueue() {
  return wx.getStorageSync(STORAGE_KEYS.REVIEW_QUEUE) || [];
}

module.exports = {
  STORAGE_KEYS,
  getUserProgress,
  setUserProgress,
  getWrongWords,
  addWrongWord,
  getReviewQueue
};
```

- [ ] **Step 2: 创建TTS工具**

```javascript
// german/utils/tts.js
const app = getApp();

function speak(text, lang = 'de-DE') {
  return new Promise((resolve, reject) => {
    const audio = wx.createInnerAudioContext();
    const plugin = requirePlugin('WechatSI');
    
    plugin.textToSpeech({
      text: text,
      lang: lang,
      success: function(res) {
        audio.src = res.filename;
        audio.play();
        audio.onEnded(() => resolve());
        audio.onError((err) => reject(err));
      },
      fail: function(err) {
        reject(err);
      }
    });
  });
}

module.exports = {
  speak
};
```

- [ ] **Step 3: 创建间隔重复算法**

```javascript
// german/utils/algorithm.js
// 艾宾浩斯记忆曲线：1天后→3天后→7天后→30天
const REVIEW_INTERVALS = [1, 3, 7, 30]; // 天数

function getNextReviewTime(wrongCount) {
  const interval = REVIEW_INTERVALS[Math.min(wrongCount - 1, REVIEW_INTERVALS.length - 1)];
  return Date.now() + interval * 24 * 60 * 60 * 1000;
}

function shouldReview(word) {
  return word.nextReview && Date.now() >= word.nextReview;
}

function updateWrongWordReview(word, isCorrect) {
  if (isCorrect) {
    word.correctCount = (word.correctCount || 0) + 1;
    word.wrongCount = Math.max(0, (word.wrongCount || 1) - 1);
  } else {
    word.wrongCount = (word.wrongCount || 0) + 1;
  }
  word.lastReview = Date.now();
  word.nextReview = getNextReviewTime(word.wrongCount || 1);
  return word;
}

module.exports = {
  getNextReviewTime,
  shouldReview,
  updateWrongWordReview
};
```

- [ ] **Step 4: Commit**

```bash
git add german/utils/
git commit -m "feat(german): add storage, tts, algorithm utilities"
```

---

## Task 2: 创建A1等级数据

**Files:**
- Create: `german/data/a1/levels.json`
- Create: `german/data/a1/vocab.js`
- Create: `german/data/a1/grammar.js`
- Create: `german/data/a1/pronunciation.js`
- Create: `german/data/a1/texts.js`

- [ ] **Step 1: 创建A1关卡配置**

```javascript
// german/data/a1/levels.json
{
  "level": "a1",
  "name": "A1 基础",
  "description": "掌握德语基础词汇和简单语法",
  "totalLevels": 15,
  "levels": [
    {
      "id": 1,
      "name": "你好，德国",
      "vocab": ["hallo", "Guten Tag", "Tschüss", "ja", "nein"],
      "grammar": ["问候语", "德语字母"],
      "pronunciation": ["元音a", "元音e"],
      "unlock": 0
    },
    {
      "id": 2,
      "name": "自我介绍",
      "vocab": ["ich", "heißen", "kommen", "aus", "Deutschland"],
      "grammar": ["第一人称", "动词变位"],
      "pronunciation": ["元音i", "辅音ch"],
      "unlock": 1
    }
  ]
}
```

- [ ] **Step 2: 创建A1词汇数据**

```javascript
// german/data/a1/vocab.js
module.exports = [
  { word: "hallo", translation: "你好", phonetic: "哈咯", example: "Hallo, wie geht es dir?" },
  { word: "Guten Tag", translation: "日安", phonetic: "古腾 塔克", example: "Guten Tag, Herr Müller." },
  { word: "Tschüss", translation: "再见", phonetic: "去斯", example: "Tschüss, bis morgen!" },
  { word: "ja", translation: "是", phonetic: "呀", example: "Ja, das ist richtig." },
  { word: "nein", translation: "不", phonetic: "耐恩", example: "Nein, das ist falsch." },
  { word: "ich", translation: "我", phonetic: "以希", example: "Ich heiße Maria." },
  { word: "heißen", translation: "名叫", phonetic: "海森", example: "Ich heiße Anna." },
  { word: "kommen", translation: "来", phonetic: "可门", example: "Ich komme aus China." },
  { word: "aus", translation: "来自", phonetic: "奥斯", example: "Er kommt aus Berlin." },
  { word: "Deutschland", translation: "德国", phonetic: "多伊奇兰德", example: "Ich wohne in Deutschland." }
  // ... 继续添加200个词汇
];
```

- [ ] **Step 3: 创建A1语法数据**

```javascript
// german/data/a1/grammar.js
module.exports = [
  {
    title: "德语字母",
    content: "德语字母表与英语相同，但有一些特殊字符：Ä, Ö, Ü, ß",
    examples: ["Ä - 类似于英语A", "Ö - 发音类似于英语oi", "Ü - 发音类似于英语ee"]
  },
  {
    title: "人称代词",
    content: "ich (我), du (你), er/sie/es (他/她/它), wir (我们), ihr (你们), sie/Sie (他们/您)",
    examples: ["Ich bin Student.", "Du bist Studentin."]
  },
  // ... 继续添加15-20个语法点
];
```

- [ ] **Step 4: 创建A1发音规则**

```javascript
// german/data/a1/pronunciation.js
module.exports = [
  { rule: "元音a", description: "类似英语father中的a，但更短促", example: "alt, Mann, Tag" },
  { rule: "元音e", description: "类似英语bed中的e", example: "Bett, Decke, legen" },
  { rule: "元音i", description: "类似英语bit中的i", example: "ich, links, mit" },
  // ... 继续添加10个发音规则
];
```

- [ ] **Step 5: 创建A1课文数据**

```javascript
// german/data/a1/texts.js
module.exports = [
  {
    title: "我的朋友",
    content: "Das ist mein Freund. Er heißt Peter. Er kommt aus Berlin. Er ist Student.",
    translation: "这是我的朋友。他叫Peter。他来自柏林。他是学生。",
    vocab: ["Freund", "Student", "heißen", "kommen"]
  },
  // ... 继续添加10篇课文
];
```

- [ ] **Step 6: Commit**

```bash
git add german/data/a1/
git commit -m "feat(german): add A1 level data (15 levels, 200 vocab, grammar, pronunciation, texts)"
```

---

## Task 3: 闯关主页（选择等级/关卡）

**Files:**
- Modify: `german/pages/learn/learn.js`
- Modify: `german/pages/learn/learn.wxml`
- Modify: `german/pages/learn/learn.wxss`
- Modify: `german/pages/learn/learn.json`

- [ ] **Step 1: 编写闯关主页逻辑**

```javascript
// german/pages/learn/learn.js
const storage = require('../../utils/storage');
const a1Data = require('../../data/a1/levels.json');

Page({
  data: {
    levels: [],
    currentLevel: 'a1',
    userProgress: null,
    selectedLevelIndex: 1
  },

  onLoad: function() {
    this.loadLevels();
    this.loadUserProgress();
  },

  loadLevels: function() {
    // 加载所有等级配置
    this.setData({
      levels: [
        { id: 'a1', name: 'A1 基础', description: '掌握基础词汇和简单语法', total: 15 },
        { id: 'a2', name: 'A2 进阶', description: '扩展词汇和基本交流', total: 15 },
        { id: 'b1', name: 'B1 中级', description: '流利表达和复杂语法', total: 15 },
        { id: 'b2', name: 'B2 高级', description: '深入交流和学术表达', total: 15 }
      ]
    });
  },

  loadUserProgress: function() {
    const progress = storage.getUserProgress();
    this.setData({ userProgress: progress });
  },

  selectLevel: function(e) {
    const levelId = e.currentTarget.dataset.id;
    this.setData({ currentLevel: levelId });
  },

  startChallenge: function(e) {
    const levelIndex = e.currentTarget.dataset.index;
    wx.navigateTo({
      url: `/german/pages/learn/challenge?level=${this.data.currentLevel}&index=${levelIndex}`
    });
  },

  goToReview: function() {
    wx.navigateTo({
      url: '/german/pages/learn/review'
    });
  }
});
```

- [ ] **Step 2: 编写闯关主页模板**

```xml
<!-- german/pages/learn/learn.wxml -->
<view class="container">
  <view class="header">
    <text class="title">德语闯关</text>
    <text class="subtitle">选择等级，开始学习</text>
  </view>

  <view class="level-grid">
    <view 
      wx:for="{{levels}}" 
      wx:key="id"
      class="level-card {{currentLevel === item.id ? 'active' : ''}}"
      bindtap="selectLevel"
      data-id="{{item.id}}">
      <text class="level-name">{{item.name}}</text>
      <text class="level-desc">{{item.description}}</text>
      <text class="level-progress">{{item.total}} 关</text>
    </view>
  </view>

  <view class="challenge-section">
    <view class="section-title">选择关卡</view>
    <view class="level-progress-bar">
      <view 
        wx:for="{{userProgress.completedLevels || []}}" 
        wx:key="*this"
        class="progress-item">
      </view>
    </view>
    <view class="level-buttons">
      <button 
        wx:for="{{15}}" 
        wx:key="*this"
        class="level-btn {{index + 1 <= userProgress.currentLevelIndex ? '' : 'locked'}}"
        bindtap="startChallenge"
        data-index="{{index + 1}}">
        {{index + 1}}
      </button>
    </view>
  </view>

  <view class="review-btn" bindtap="goToReview">
    <text>复习关卡</text>
  </view>
</view>
```

- [ ] **Step 3: 编写闯关主页样式**

```css
/* german/pages/learn/learn.wxss */
.container {
  padding: 20rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.subtitle {
  font-size: 28rpx;
  color: #666;
}

.level-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 40rpx;
}

.level-card {
  width: 48%;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.level-card.active {
  border: 2rpx solid #1890ff;
}

.level-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.level-desc {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-top: 8rpx;
}

.level-progress {
  font-size: 24rpx;
  color: #1890ff;
  margin-top: 12rpx;
  display: block;
}

.level-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}

.level-btn {
  width: 80rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 40rpx;
  background: #1890ff;
  color: #fff;
  font-size: 28rpx;
}

.level-btn.locked {
  background: #ccc;
}

.review-btn {
  margin-top: 40rpx;
  text-align: center;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
```

- [ ] **Step 4: 更新JSON配置**

```json
// german/pages/learn/learn.json
{
  "navigationBarTitleText": "德语闯关",
  "usingComponents": {}
}
```

- [ ] **Step 5: Commit**

```bash
git add german/pages/learn/
git commit -m "feat(german): add learn page (level selection)"
```

---

## Task 4: 闯关答题页面

**Files:**
- Create: `german/pages/learn/challenge.js`
- Create: `german/pages/learn/challenge.wxml`
- Create: `german/pages/learn/challenge.wxss`
- Create: `german/pages/learn/challenge.json`

- [ ] **Step 1: 编写闯关答题逻辑**

```javascript
// german/pages/learn/challenge.js
const storage = require('../../utils/storage');
const tts = require('../../utils/tts');
const a1Vocab = require('../../data/a1/vocab.js');

Page({
  data: {
    level: '',
    levelIndex: 1,
    currentQuestion: 0,
    questions: [],
    totalQuestions: 8,
    score: 0,
    wrongAnswers: [],
    isPlaying: false
  },

  onLoad: function(options) {
    this.setData({
      level: options.level || 'a1',
      levelIndex: parseInt(options.index) || 1
    });
    this.generateQuestions();
  },

  generateQuestions: function() {
    // 从词汇和语法数据生成5种题型的题目
    const questions = [];
    const vocab = a1Vocab;
    
    // 听力题
    questions.push({
      type: 'listen',
      question: '听录音，选择正确含义',
      audioText: vocab[0].word,
      options: [vocab[0].translation, '再见', '谢谢', '对不起'],
      correct: 0
    });
    
    // 选择题
    questions.push({
      type: 'choice',
      question: '"你好"用德语怎么说？',
      options: ['Hallo', 'Tschüss', 'Danke', 'Bitte'],
      correct: 0
    });
    
    // 拼写题
    questions.push({
      type: 'spell',
      question: '听录音，写出德语单词',
      audioText: vocab[1].word,
      answer: vocab[1].word
    });
    
    // 排序题
    questions.push({
      type: 'order',
      question: '将词语组成正确句子',
      words: ['Ich', 'heiße', 'Maria'],
      answer: 'Ich heiße Maria'
    });
    
    // 配对题
    questions.push({
      type: 'match',
      question: '连线德语单词和中文含义',
      pairs: [
        { left: 'hallo', right: '你好' },
        { left: 'Tschüss', right: '再见' },
        { left: 'Danke', right: '谢谢' },
        { left: 'Bitte', right: '不客气' }
      ],
      correctMatches: 0
    });
    
    // 补齐到8题
    while (questions.length < 8) {
      questions.push({
        type: 'choice',
        question: `选择题 ${questions.length + 1}`,
        options: ['A', 'B', 'C', 'D'],
        correct: 0
      });
    }
    
    this.setData({ questions: questions.slice(0, 8) });
  },

  playAudio: function() {
    const q = this.data.questions[this.data.currentQuestion];
    if (q.audioText) {
      tts.speak(q.audioText);
    }
  },

  selectAnswer: function(e) {
    const index = e.currentTarget.dataset.index;
    const q = this.data.questions[this.data.currentQuestion];
    const isCorrect = index === q.correct;
    
    this.showFeedback(isCorrect);
  },

  submitSpellAnswer: function(e) {
    const answer = e.detail.value;
    const q = this.data.questions[this.data.currentQuestion];
    const isCorrect = answer.toLowerCase() === q.answer.toLowerCase();
    
    this.showFeedback(isCorrect);
  },

  submitOrderAnswer: function(e) {
    const order = e.currentTarget.dataset.order;
    const q = this.data.questions[this.data.currentQuestion];
    const isCorrect = order === q.answer;
    
    this.showFeedback(isCorrect);
  },

  showFeedback: function(isCorrect) {
    const { currentQuestion, score, wrongAnswers, questions } = this.data;
    let newScore = score;
    let newWrongAnswers = wrongAnswers;
    
    if (isCorrect) {
      newScore++;
    } else {
      newWrongAnswers.push({
        question: questions[currentQuestion],
        userAnswer: '错误'
      });
    }
    
    this.setData({
      score: newScore,
      wrongAnswers: newWrongAnswers
    });
    
    wx.showToast({
      title: isCorrect ? '正确！' : '错误',
      icon: isCorrect ? 'success' : 'none',
      duration: 1000
    });
    
    setTimeout(() => {
      this.nextQuestion();
    }, 1000);
  },

  nextQuestion: function() {
    const next = this.data.currentQuestion + 1;
    if (next >= this.data.totalQuestions) {
      // 闯关结束
      this.saveProgress();
      wx.redirectTo({
        url: `/german/pages/learn/result?score=${this.data.score}&total=${this.data.totalQuestions}&wrong=${JSON.stringify(this.data.wrongAnswers)}`
      });
    } else {
      this.setData({ currentQuestion: next });
    }
  },

  saveProgress: function() {
    const progress = storage.getUserProgress();
    if (this.data.score >= this.data.totalQuestions * 0.6) {
      // 通关
      if (!progress.completedLevels) progress.completedLevels = [];
      progress.completedLevels.push(`${this.data.level}_${this.data.levelIndex}`);
      if (this.data.levelIndex >= progress.currentLevelIndex) {
        progress.currentLevelIndex = this.data.levelIndex + 1;
      }
    }
    progress.totalPoints = (progress.totalPoints || 0) + this.data.score;
    storage.setUserProgress(progress);
    
    // 保存错题
    this.data.wrongAnswers.forEach(w => {
      storage.addWrongWord(w.question);
    });
  }
});
```

- [ ] **Step 2: 编写闯关答题模板**

```xml
<!-- german/pages/learn/challenge.wxml -->
<view class="container">
  <view class="progress-bar">
    <view class="progress-fill" style="width: {{currentQuestion / totalQuestions * 100}}%"></view>
    <text class="progress-text">{{currentQuestion + 1}} / {{totalQuestions}}</text>
  </view>

  <view class="score">得分: {{score}}</view>

  <view class="question-box">
    <!-- 听力题 -->
    <view wx:if="{{questions[currentQuestion].type === 'listen'}}" class="question-listen">
      <view class="audio-btn" bindtap="playAudio">
        <text class="icon">🔊</text>
        <text>播放录音</text>
      </view>
      <view class="question-text">{{questions[currentQuestion].question}}</view>
      <view class="options">
        <button 
          wx:for="{{questions[currentQuestion].options}}" 
          wx:key="*this"
          class="option-btn"
          bindtap="selectAnswer"
          data-index="{{index}}">
          {{item}}
        </button>
      </view>
    </view>

    <!-- 选择题 -->
    <view wx:elif="{{questions[currentQuestion].type === 'choice'}}" class="question-choice">
      <view class="question-text">{{questions[currentQuestion].question}}</view>
      <view class="options">
        <button 
          wx:for="{{questions[currentQuestion].options}}" 
          wx:key="*this"
          class="option-btn"
          bindtap="selectAnswer"
          data-index="{{index}}">
          {{item}}
        </button>
      </view>
    </view>

    <!-- 拼写题 -->
    <view wx:elif="{{questions[currentQuestion].type === 'spell'}}" class="question-spell">
      <view class="audio-btn" bindtap="playAudio">
        <text class="icon">🔊</text>
        <text>播放录音</text>
      </view>
      <view class="question-text">请输入听到的单词</view>
      <input class="spell-input" placeholder="请输入德语单词" bindconfirm="submitSpellAnswer" />
    </view>

    <!-- 排序题 -->
    <view wx:elif="{{questions[currentQuestion].type === 'order'}}" class="question-order">
      <view class="question-text">{{questions[currentQuestion].question}}</view>
      <view class="words">
        <button 
          wx:for="{{questions[currentQuestion].words}}" 
          wx:key="*this"
          class="word-btn"
          bindtap="selectWord"
          data-word="{{item}}">
          {{item}}
        </button>
      </view>
      <view class="answer-area">
        <text>答案: {{userAnswer}}</text>
        <button class="submit-btn" bindtap="submitOrderAnswer" data-order="{{userAnswer}}">确认</button>
      </view>
    </view>

    <!-- 配对题 -->
    <view wx:elif="{{questions[currentQuestion].type === 'match'}}" class="question-match">
      <view class="question-text">{{questions[currentQuestion].question}}</view>
      <view class="pairs">
        <view class="pair-left">
          <view wx:for="{{questions[currentQuestion].pairs}}" wx:key="*this" class="pair-item">
            {{item.left}}
          </view>
        </view>
        <view class="pair-right">
          <view wx:for="{{questions[currentQuestion].pairs}}" wx:key="*this" class="pair-item">
            {{item.right}}
          </view>
        </view>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 3: 编写闯关答题样式**

```css
/* german/pages/learn/challenge.wxss */
.container {
  padding: 20rpx;
  min-height: 100vh;
  background: #f5f5f5;
}

.progress-bar {
  height: 40rpx;
  background: #e0e0e0;
  border-radius: 20rpx;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #1890ff;
  transition: width 0.3s;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24rpx;
  color: #333;
}

.score {
  text-align: center;
  font-size: 32rpx;
  color: #1890ff;
  margin: 20rpx 0;
}

.question-box {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}

.question-text {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 30rpx;
}

.audio-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  background: #e6f7ff;
  border-radius: 8rpx;
  margin-bottom: 30rpx;
}

.audio-btn .icon {
  margin-right: 10rpx;
  font-size: 40rpx;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.option-btn {
  padding: 24rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  text-align: left;
  font-size: 28rpx;
}

.spell-input {
  border: 1rpx solid #d9d9d9;
  padding: 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}
```

- [ ] **Step 4: 配置JSON**

```json
// german/pages/learn/challenge.json
{
  "navigationBarTitleText": "闯关中",
  "usingComponents": {}
}
```

- [ ] **Step 5: Commit**

```bash
git add german/pages/learn/challenge.*
git commit -m "feat(german): add challenge page with 5 question types"
```

---

## Task 5: 闯关结果页面

**Files:**
- Create: `german/pages/learn/result.js`
- Create: `german/pages/learn/result.wxml`
- Create: `german/pages/learn/result.wxss`
- Create: `german/pages/learn/result.json`

- [ ] **Step 1-4: 创建结果页面代码**（结构类似前面任务，简化实现）

- [ ] **Step 5: Commit**

---

## Task 6: 复习关卡页面

**Files:**
- Create: `german/pages/learn/review.js`
- Create: `german/pages/learn/review.wxml`
- Create: `german/pages/learn/review.wxss`
- Create: `german/pages/learn/review.json`

- [ ] **Step 1-4: 创建复习页面代码**（从错题队列获取题目，重复练习）

- [ ] **Step 5: Commit**

---

## Task 7: 添加其他等级数据

**Files:**
- Create: `german/data/a2/`
- Create: `german/data/b1/`
- Create: `german/data/b2/`

- [ ] **Step 1: 参考A1数据结构，创建A2/B1/B2数据**

- [ ] **Step 2: Commit**

---

## Task 8: 集成测试

- [ ] **Step 1: 在开发者工具中测试闯关流程**

- [ ] **Step 2: 测试所有5种题型**

- [ ] **Step 3: 测试错题记录和复习功能**

- [ ] **Step 4: 测试TTS发音功能**

- [ ] **Step 5: Commit**

---

## 实现顺序建议

1. Task 1: 工具类（优先）
2. Task 2: 数据结构（优先）
3. Task 3: 闯关主页
4. Task 4: 答题页面（核心）
5. Task 5: 结果页面
6. Task 6: 复习页面
7. Task 7: 其他等级数据
8. Task 8: 集成测试