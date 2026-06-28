# AI运势功能重构 v2 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 lunar-javascript + iztro + Vant Weapp + mp-html 整洁重建 fortune/ 小程序模块，修复8项bug，移除思考/搜索开关，实现沉浸式深色UI。

**Architecture:** calc-service.js 封装 lunar/iztro 输出结构化排盘数据，ai-service.js 注入排盘数据到 prompt，4个页面用 Vant Weapp 重写为深色沉浸式风格（主页中性/易学暮云归/西方墨夜星河），对话页用卷轴流布局 + mp-html 渲染 Markdown。

**Tech Stack:** 微信小程序原生框架、lunar-javascript、iztro、@vant/weapp、mp-html、NVIDIA nemotron API

**Spec:** `docs/superpowers/specs/2026-06-28-fortune-overhaul-v2-design.md`

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|------|------|
| `fortune/app.js` | App() 生命周期，globalData 存 API key |
| `fortune/app.wxss` | 全局样式 + Vant 主题变量 + 三套背景 class |
| `fortune/package.json` | npm 依赖声明 |
| `fortune/services/calc-service.js` | 封装 lunar+iztro，输出排盘数据（纯JS，无wx依赖） |
| `fortune/tests/calc-service.test.js` | calc-service 的 Node 单元测试 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `fortune/app.json` | 添加 usingComponents |
| `fortune/services/ai-service.js` | 删开关、修bug、注入calcData、API key读globalData |
| `fortune/services/storage-service.js` | 新增 calcData/createdAtFormatted/html 字段 |
| `fortune/pages/index/index.js` | 修导航路径、加当日运势 |
| `fortune/pages/index/index.wxml` | Vant 重写 |
| `fortune/pages/index/index.wxss` | 深色中性背景 |
| `fortune/pages/reading/reading.js` | 集成calc-service、修导航路径 |
| `fortune/pages/reading/reading.wxml` | Vant 重写 + 三步进度 |
| `fortune/pages/reading/reading.wxss` | 体系背景 + 玻璃卡 |
| `fortune/pages/chat/chat.js` | 删开关、修滚动、修文件清除 |
| `fortune/pages/chat/chat.wxml` | 卷轴流重写 |
| `fortune/pages/chat/chat.wxss` | 体系背景 + 卷轴样式 |
| `fortune/pages/history/history.js` | 修导航路径、格式化时间戳 |
| `fortune/pages/history/history.wxml` | Vant swipe-cell 重写 |
| `fortune/pages/history/history.wxss` | 中性背景 |
| `fortune/components/chat-bubble/chat-bubble.js` | Markdown→HTML 转换 |
| `fortune/components/chat-bubble/chat-bubble.wxml` | mp-html 集成 |
| `fortune/components/chat-bubble/chat-bubble.json` | 声明 mp-html 依赖 |
| `fortune/components/fortune-card/fortune-card.wxml` | van-skeleton 集成 |
| `fortune/components/profile-form/profile-form.wxml` | Vant dialog+picker+field |

### 删除文件

| 文件 | 原因 |
|------|------|
| `fortune/services/prompt-service.js` | 死代码 |
| `fortune/utils/validation-utils.js` | 死代码 |
| `fortune/data/prompts/chinese_prompt.md` | 运行时不加载 |
| `fortune/data/prompts/western_prompt.md` | 运行时不加载 |

---

## Phase 1：基建清理

### Task 1：创建 app.js 和 app.wxss

**Files:**
- Create: `fortune/app.js`
- Create: `fortune/app.wxss`

- [ ] **Step 1：创建 app.js**

创建 `fortune/app.js`：

```javascript
App({
  globalData: {
    fortuneApiKey: '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',
    fortuneApiUrl: 'https://integrate.api.nvidia.com/v1',
    fortuneModel: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'
  }
});
```

- [ ] **Step 2：创建 app.wxss**

创建 `fortune/app.wxss`：

```css
/* 全局主题变量 */
page {
  --van-primary-color: #d97757;
  --van-success-color: #10b981;
  --van-warning-color: #fbbf24;
  --van-danger-color: #ef4444;
  --van-font-size-md: 28rpx;
  --van-border-radius-md: 16rpx;
  --van-background: transparent;
  --van-card-background: rgba(255,255,255,0.07);
  background-color: #1c1917;
  color: #fff;
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
}

/* 三套背景 class */
.bg-neutral {
  background: linear-gradient(180deg, #1c1917 0%, #292524 100%);
  position: relative;
}
.bg-neutral::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 15%, rgba(217,119,87,0.08), transparent 45%),
              radial-gradient(circle at 80% 85%, rgba(99,102,241,0.08), transparent 45%);
  pointer-events: none;
  z-index: 0;
}

.bg-chinese {
  background: linear-gradient(180deg, #1c1917 0%, #44403c 50%, #292524 100%);
  position: relative;
}
.bg-chinese::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 35%, rgba(217,119,87,0.15), transparent 55%),
              radial-gradient(circle at 70% 65%, rgba(120,113,108,0.1), transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.bg-western {
  background: linear-gradient(180deg, #0a0e27 0%, #1a1f3a 50%, #0d1b2a 100%);
  position: relative;
}
.bg-western::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, rgba(99,102,241,0.15), transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(14,165,233,0.1), transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* 玻璃拟态卡片 */
.glass-card {
  background: rgba(255,255,255,0.07);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 24rpx;
}

/* 页面内容层级 */
.page-content {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 3：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/app.js fortune/app.wxss
git commit -m "feat(fortune): add app.js and app.wxss with theme system"
```

---

### Task 2：创建 package.json 并安装依赖

**Files:**
- Create: `fortune/package.json`

- [ ] **Step 1：创建 package.json**

创建 `fortune/package.json`：

```json
{
  "name": "fortune-miniprogram",
  "version": "1.0.0",
  "description": "AI运势微信小程序",
  "dependencies": {
    "lunar-javascript": "^1.6.0",
    "iztro": "^1.0.0",
    "@vant/weapp": "^1.11.7",
    "mp-html": "^2.4.0"
  }
}
```

- [ ] **Step 2：安装依赖**

```bash
cd e:/AI/Wechatbot/fortune
npm install
```

Expected: `node_modules/` 创建，含 lunar-javascript、iztro、@vant/weapp、mp-html

- [ ] **Step 3：在微信开发者工具中构建 npm**

手动操作：打开微信开发者工具 → fortune 项目 → 工具菜单 → 构建 npm → 确认 `miniprogram_npm/` 目录生成

- [ ] **Step 4：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/package.json fortune/package-lock.json
git commit -m "feat(fortune): add npm dependencies for lunar, iztro, vant, mp-html"
```

---

### Task 3：更新 app.json 配置

**Files:**
- Modify: `fortune/app.json`

- [ ] **Step 1：重写 app.json**

替换 `fortune/app.json` 全部内容：

```json
{
  "pages": [
    "pages/index/index",
    "pages/reading/reading",
    "pages/chat/chat",
    "pages/history/history"
  ],
  "window": {
    "backgroundTextStyle": "dark",
    "navigationBarBackgroundColor": "#1c1917",
    "navigationBarTitleText": "AI运势",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#1c1917"
  },
  "usingComponents": {
    "van-button": "@vant/weapp/button/index",
    "van-cell": "@vant/weapp/cell/index",
    "van-cell-group": "@vant/weapp/cell-group/index",
    "van-grid": "@vant/weapp/grid/index",
    "van-grid-item": "@vant/weapp/grid-item/index",
    "van-tag": "@vant/weapp/tag/index",
    "van-notice-bar": "@vant/weapp/notice-bar/index",
    "van-empty": "@vant/weapp/empty/index",
    "van-swipe-cell": "@vant/weapp/swipe-cell/index",
    "van-skeleton": "@vant/weapp/skeleton/index",
    "van-overlay": "@vant/weapp/overlay/index",
    "van-field": "@vant/weapp/field/index",
    "van-picker": "@vant/weapp/picker/index",
    "van-popup": "@vant/weapp/popup/index",
    "van-toast": "@vant/weapp/toast/index",
    "mp-html": "mp-html/index"
  },
  "sitemapLocation": "../sitemap.json"
}
```

- [ ] **Step 2：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/app.json
git commit -m "feat(fortune): update app.json with vant components and dark theme"
```

---

### Task 4：删除死代码

**Files:**
- Delete: `fortune/services/prompt-service.js`
- Delete: `fortune/utils/validation-utils.js`
- Delete: `fortune/data/prompts/chinese_prompt.md`
- Delete: `fortune/data/prompts/western_prompt.md`

- [ ] **Step 1：删除文件**

删除以下4个文件：
- `fortune/services/prompt-service.js`
- `fortune/utils/validation-utils.js`
- `fortune/data/prompts/chinese_prompt.md`
- `fortune/data/prompts/western_prompt.md`

- [ ] **Step 2：确认无其他文件引用被删文件**

搜索 `prompt-service` 和 `validation-utils` 关键词，确认无残留 require。

- [ ] **Step 3：提交**

```bash
cd e:/AI/Wechatbot
git add -A fortune/services/prompt-service.js fortune/utils/validation-utils.js fortune/data/prompts/
git commit -m "chore(fortune): remove dead code (prompt-service, validation-utils, prompt md files)"
```

---

### Task 5：修复 ai-service.js（API key、temperature、删开关、修流式防重入）

**Files:**
- Modify: `fortune/services/ai-service.js`

- [ ] **Step 1：重写 ai-service.js 顶部配置和 prompt 函数**

替换 `fortune/services/ai-service.js` 第1-109行（从开头到 `buildChatPrompt` 函数结束）：

```javascript
// fortune/services/ai-service.js
const app = getApp();

function getConfig() {
  return {
    key: app.globalData.fortuneApiKey,
    apiUrl: app.globalData.fortuneApiUrl,
    model: app.globalData.fortuneModel,
    maxTokens: 20480
  };
}

const SYSTEM_PROMPT = `你是专业的AI命理分析师，精通中国传统文化和西方占星术。

【强制规则 - 最高优先级】
1. 你必须100%全程使用中文，绝对禁止输出任何英文单词、英文句子、英文标点
2. 所有内容必须是中文，包括星座名、术语、地名等全部使用中文翻译
3. 如果你输出任何英文，将被视为严重错误

【回答风格 - 防止循环】
- 直接给出分析结果，不要过度推理或自我验证
- 每个问题只回答一次，不要重复检查或反复推敲
- 保持回答简洁有力，避免冗长
- 不要自我怀疑或反复验证自己的答案
- 确信自己的专业判断，直接输出`;

function buildReadingPrompt(type, profile, calcData) {
  const typeNames = {
    bazi: '八字命理',
    ziwei: '紫微斗数',
    yijing: '易经卦象',
    constellation: '星座分析',
    tarot: '塔罗占卜',
    astrology: '占星术'
  };

  const typeName = typeNames[type] || '运势分析';

  let profileInfo = `姓名：${profile.name}\n生日：${profile.birthday}\n性别：${profile.gender === 'male' ? '男' : '女'}`;
  if (profile.birthTime) {
    profileInfo += `\n出生时辰：${profile.birthTime}`;
  }

  let calcSection = '';
  if (calcData && calcData.summary && !calcData.error && !calcData.needTime) {
    calcSection = `\n\n【排盘数据 · 由专业库计算】\n${calcData.summary}\n\n请基于以上真实排盘结果进行专业解读，禁止编造与排盘数据矛盾的内容。`;
  }

  return `请根据以下用户信息进行${typeName}分析。

【用户信息】
${profileInfo}
${calcSection}

【输出格式】

📊 基本信息概览
（简要总结）

🔮 核心分析
（深入分析）

📈 运势解读
（详细运势）

💡 开运建议
（3-5条建议）

⚠️ 注意事项
（特别提醒）

【要求】
1. 100%使用中文，禁止任何英文
2. 每个段落用emoji开头
3. 分析要专业有深度
4. 语言生动有趣
5. 星座名等全部用中文（如"白羊座"不是"Aries"）

请直接输出分析结果。`;
}

function buildChatPrompt(profile, results, question, options) {
  options = options || {};
  let resultsText = '';
  if (results && results.length > 0) {
    resultsText = results.map(r => `【${r.typeName}】\n${r.content}`).join('\n\n');
  }

  let prompt = `你是一个专业的运势分析师。

【用户档案】
姓名：${profile.name}
生日：${profile.birthday}
性别：${profile.gender === 'male' ? '男' : '女'}
${profile.birthTime ? '出生时辰：' + profile.birthTime : ''}

【运势分析结果】
${resultsText}`;

  if (options.fileContent) {
    prompt += `\n\n【用户上传的文件内容】\n文件名：${options.fileName}\n内容：\n${options.fileContent}`;
  }

  prompt += `\n\n请回答用户的问题。要求：100%中文，禁止英文，适当使用emoji。`;

  return prompt;
}
```

- [ ] **Step 2：重写 callAI 和 streamAI（删 enableThinking 参数、修 temperature、修防重入）**

替换 `fortune/services/ai-service.js` 中 `callAI` 和 `streamAI` 两个函数（原第111-261行）：

```javascript
// 非流式调用（兜底）
function callAI(prompt) {
  var config = getConfig();
  return new Promise(function(resolve, reject) {
    var requestData = {
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: config.maxTokens,
      temperature: 0.7,
      reasoning_budget: 0
    };

    wx.request({
      url: config.apiUrl + '/chat/completions',
      method: 'POST',
      timeout: 120000,
      header: {
        'Authorization': 'Bearer ' + config.key,
        'Content-Type': 'application/json'
      },
      data: requestData,
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
          var message = res.data.choices[0].message;
          resolve(message.content || '');
        } else {
          reject(new Error('API error: ' + (res.statusCode || 'unknown')));
        }
      },
      fail: function(err) {
        reject(new Error('Request failed: ' + (err.errMsg || 'unknown')));
      }
    });
  });
}

// 流式调用 - 5秒无内容降级非流式
function streamAI(prompt, onChunk, onDone, onError) {
  var config = getConfig();
  var fullText = '';
  var finishCalled = false;
  var fallbackTriggered = false;

  function finish() {
    if (finishCalled) return;
    finishCalled = true;
    if (onDone) onDone(fullText);
  }

  // 5秒兜底：流式没出内容就降级
  var fallbackTimer = setTimeout(function() {
    if (finishCalled || fullText.length > 0) return;
    fallbackTriggered = true;
    callAI(prompt).then(function(content) {
      fullText = content;
      if (onChunk) onChunk(fullText);
      finish();
    }).catch(function(err) {
      if (onError) onError(err);
      finish();
    });
  }, 5000);

  var requestData = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: config.maxTokens,
    temperature: 0.7,
    reasoning_budget: 0,
    stream: true
  };

  var task = wx.request({
    url: config.apiUrl + '/chat/completions',
    method: 'POST',
    enableChunked: true,
    timeout: 120000,
    header: {
      'Authorization': 'Bearer ' + config.key,
      'Content-Type': 'application/json'
    },
    data: requestData,
    success: function(res) {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (onError) onError(new Error('API error: ' + res.statusCode));
        clearTimeout(fallbackTimer);
        finish();
      }
    },
    fail: function(err) {
      if (onError) onError(new Error('Request failed: ' + (err.errMsg || 'unknown')));
      clearTimeout(fallbackTimer);
      finish();
    }
  });

  if (task && task.onChunkReceived) {
    task.onChunkReceived(function(res) {
      if (fallbackTriggered || finishCalled) return;
      try {
        var data = new TextDecoder().decode(res.data);
        var lines = data.split('\n');

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf('data: ') !== 0) continue;

          var jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            clearTimeout(fallbackTimer);
            finish();
            return;
          }

          try {
            var json = JSON.parse(jsonStr);
            if (!json.choices || !json.choices[0] || !json.choices[0].delta) continue;

            var delta = json.choices[0].delta;
            var chunk = delta.content || '';

            if (chunk) {
              fullText += chunk;
              clearTimeout(fallbackTimer);
              if (onChunk) onChunk(fullText);
            }
          } catch (e) {}
        }
      } catch (e) {}
    });
  }

  // 兜底：90秒超时强制完成
  setTimeout(function() {
    clearTimeout(fallbackTimer);
    finish();
  }, 90000);
}
```

- [ ] **Step 3：重写 streamReadings（删 enableThinking 参数、传 calcData）**

替换 `fortune/services/ai-service.js` 中 `streamReadings` 函数及 `readFileContent` 和 `module.exports`（原第263行到文件末尾）：

```javascript
// 串行流式测算
function streamReadings(category, profile, calcResults, onReadingStart, onChunk, onReadingComplete, onAllComplete, onError) {
  var types = category === 'chinese'
    ? ['bazi', 'ziwei', 'yijing']
    : ['constellation', 'tarot', 'astrology'];

  var typeNames = {
    bazi: '八字命理', ziwei: '紫微斗数', yijing: '易经卦象',
    constellation: '星座分析', tarot: '塔罗占卜', astrology: '占星术'
  };

  var currentTypeIndex = 0;

  function processNext() {
    if (currentTypeIndex >= types.length) {
      if (onAllComplete) onAllComplete();
      return;
    }

    var type = types[currentTypeIndex];

    if (onReadingStart) onReadingStart(type, typeNames[type]);

    var calcData = calcResults[type] || null;
    var prompt = buildReadingPrompt(type, profile, calcData);

    streamAI(prompt,
      function(content) {
        if (onChunk) onChunk(type, content);
      },
      function(cleanedContent) {
        if (onReadingComplete) onReadingComplete(type, typeNames[type], cleanedContent);
        currentTypeIndex++;
        processNext();
      },
      function(err) {
        if (onError) onError(type, err);
        currentTypeIndex++;
        processNext();
      }
    );
  }

  processNext();
}

// 读取文件内容
function readFileContent(filePath, fileName) {
  return new Promise(function(resolve, reject) {
    var ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'txt' || ext === 'md' || ext === 'csv') {
      wx.getFileSystemManager().readFile({
        filePath: filePath,
        encoding: 'utf-8',
        success: function(res) {
          var content = res.data || '';
          if (content.length > 3000) {
            content = content.substring(0, 3000) + '\n...(内容过长已截断)';
          }
          resolve(content);
        },
        fail: function(err) {
          reject(new Error('读取文件失败: ' + (err.errMsg || 'unknown')));
        }
      });
    } else {
      resolve('[文件: ' + fileName + ' - 暂不支持解析此格式，仅支持txt/md/csv]');
    }
  });
}

module.exports = {
  buildReadingPrompt,
  buildChatPrompt,
  streamAI,
  callAI,
  streamReadings,
  readFileContent
};
```

- [ ] **Step 4：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/services/ai-service.js
git commit -m "fix(fortune): move API key to globalData, fix temperature, remove thinking/search switches, fix stream fallback reentry"
```

---

### Task 6：修复 storage-service.js（新增字段、时间戳格式化）

**Files:**
- Modify: `fortune/services/storage-service.js`

- [ ] **Step 1：重写 storage-service.js**

替换 `fortune/services/storage-service.js` 全部内容：

```javascript
const STORAGE_KEYS = {
  PROFILE: 'fortune_profile',
  HISTORY: 'fortune_history',
  CHAT: 'fortune_chat_history',
  DAILY_CACHE: 'fortune_daily_cache'
};

function formatDate(timestamp) {
  if (!timestamp) return '';
  var d = new Date(timestamp);
  var year = d.getFullYear();
  var month = (d.getMonth() + 1).toString().padStart(2, '0');
  var day = d.getDate().toString().padStart(2, '0');
  var hour = d.getHours().toString().padStart(2, '0');
  var minute = d.getMinutes().toString().padStart(2, '0');
  return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
}

function getProfile() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.PROFILE) || null;
  } catch (e) {
    console.error('Failed to get profile:', e);
    return null;
  }
}

function saveProfile(profile) {
  try {
    wx.setStorageSync(STORAGE_KEYS.PROFILE, profile);
    return true;
  } catch (e) {
    console.error('Failed to save profile:', e);
    return false;
  }
}

function getHistory() {
  try {
    const history = wx.getStorageSync(STORAGE_KEYS.HISTORY);
    return Array.isArray(history) ? history : [];
  } catch (e) {
    console.error('Failed to get history:', e);
    return [];
  }
}

function addHistory(record) {
  try {
    const history = getHistory();
    var now = Date.now();
    const newRecord = {
      id: 'r_' + now,
      category: record.category,
      profile: record.profile,
      results: record.results || [],
      createdAt: now,
      createdAtFormatted: formatDate(now)
    };
    history.unshift(newRecord);
    if (history.length > 50) {
      history.pop();
    }
    wx.setStorageSync(STORAGE_KEYS.HISTORY, history);
    return newRecord;
  } catch (e) {
    console.error('Failed to add history:', e);
    return null;
  }
}

function getHistoryById(id) {
  const history = getHistory();
  return history.find(item => item.id === id) || null;
}

function deleteHistory(id) {
  try {
    const history = getHistory();
    const filtered = history.filter(item => item.id !== id);
    wx.setStorageSync(STORAGE_KEYS.HISTORY, filtered);
    return true;
  } catch (e) {
    console.error('Failed to delete history:', e);
    return false;
  }
}

function clearHistory() {
  try {
    wx.setStorageSync(STORAGE_KEYS.HISTORY, []);
    return true;
  } catch (e) {
    console.error('Failed to clear history:', e);
    return false;
  }
}

function getChatHistory(readingId) {
  try {
    const allChats = wx.getStorageSync(STORAGE_KEYS.CHAT) || [];
    const chat = allChats.find(c => c.readingId === readingId);
    return chat ? chat.messages : [];
  } catch (e) {
    console.error('Failed to get chat history:', e);
    return [];
  }
}

function saveChatHistory(readingId, messages) {
  try {
    let allChats = wx.getStorageSync(STORAGE_KEYS.CHAT) || [];
    const existingIndex = allChats.findIndex(c => c.readingId === readingId);

    if (existingIndex >= 0) {
      allChats[existingIndex].messages = messages;
    } else {
      allChats.push({ readingId, messages });
    }

    if (allChats.length > 20) {
      allChats = allChats.slice(-20);
    }

    wx.setStorageSync(STORAGE_KEYS.CHAT, allChats);
    return true;
  } catch (e) {
    console.error('Failed to save chat history:', e);
    return false;
  }
}

function getDailyCache() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.DAILY_CACHE) || null;
  } catch (e) {
    return null;
  }
}

function saveDailyCache(cache) {
  try {
    wx.setStorageSync(STORAGE_KEYS.DAILY_CACHE, cache);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  formatDate,
  getProfile,
  saveProfile,
  getHistory,
  addHistory,
  getHistoryById,
  deleteHistory,
  clearHistory,
  getChatHistory,
  saveChatHistory,
  getDailyCache,
  saveDailyCache
};
```

- [ ] **Step 2：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/services/storage-service.js
git commit -m "feat(fortune): add calcData/createdAtFormatted/html fields, daily cache, formatDate export"
```

---

## Phase 2：计算引擎

### Task 7：创建 calc-service.js 骨架 + 时辰映射

**Files:**
- Create: `fortune/services/calc-service.js`
- Create: `fortune/tests/calc-service.test.js`

- [ ] **Step 1：创建 calc-service.js 骨架**

创建 `fortune/services/calc-service.js`：

```javascript
// fortune/services/calc-service.js
// 纯JS模块，无wx.*依赖，可在Node中测试

// 时辰名 → 小时映射（取各时辰中点）
var BIRTH_TIME_MAP = {
  '子时': 0,
  '丑时': 2,
  '寅时': 4,
  '卯时': 6,
  '辰时': 8,
  '巳时': 10,
  '午时': 12,
  '未时': 14,
  '申时': 16,
  '酉时': 18,
  '戌时': 20,
  '亥时': 22
};

function parseBirthTime(birthTime) {
  if (!birthTime) return null;
  var hour = BIRTH_TIME_MAP[birthTime];
  return hour !== undefined ? hour : null;
}

function parseBirthday(birthday) {
  // birthday 格式: "1990-03-15"
  var parts = birthday.split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10)
  };
}

module.exports = {
  parseBirthTime: parseBirthTime,
  parseBirthday: parseBirthday,
  BIRTH_TIME_MAP: BIRTH_TIME_MAP
};
```

- [ ] **Step 2：创建测试文件**

创建 `fortune/tests/calc-service.test.js`：

```javascript
// fortune/tests/calc-service.test.js
// Node 环境运行: node fortune/tests/calc-service.test.js

var calc = require('../services/calc-service');
var passed = 0;
var failed = 0;

function assert(name, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log('  ✓ ' + name);
    passed++;
  } else {
    console.log('  ✗ ' + name);
    console.log('    expected: ' + JSON.stringify(expected));
    console.log('    actual:   ' + JSON.stringify(actual));
    failed++;
  }
}

console.log('\nparseBirthTime:');
assert('子时 → 0', calc.parseBirthTime('子时'), 0);
assert('丑时 → 2', calc.parseBirthTime('丑时'), 2);
assert('亥时 → 22', calc.parseBirthTime('亥时'), 22);
assert('null → null', calc.parseBirthTime(null), null);
assert('空字符串 → null', calc.parseBirthTime(''), null);
assert('无效值 → null', calc.parseBirthTime('无效'), null);

console.log('\nparseBirthday:');
assert('1990-03-15', calc.parseBirthday('1990-03-15'), { year: 1990, month: 3, day: 15 });
assert('2000-12-01', calc.parseBirthday('2000-12-01'), { year: 2000, month: 12, day: 1 });

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 3：运行测试验证通过**

```bash
cd e:/AI/Wechatbot
node fortune/tests/calc-service.test.js
```

Expected: 全部 ✓，0 failed

- [ ] **Step 4：提交**

```bash
git add fortune/services/calc-service.js fortune/tests/calc-service.test.js
git commit -m "feat(fortune): add calc-service skeleton with birth time mapping and tests"
```

---

### Task 8：实现 calcBazi（八字排盘）

**Files:**
- Modify: `fortune/services/calc-service.js`
- Modify: `fortune/tests/calc-service.test.js`

- [ ] **Step 1：在 calc-service.js 中添加 calcBazi 函数**

在 `fortune/services/calc-service.js` 的 `module.exports` 之前添加：

```javascript
var lunar = require('lunar-javascript');

function calcBazi(profile) {
  try {
    var parts = parseBirthday(profile.birthday);
    var hour = parseBirthTime(profile.birthTime);

    if (hour === null) {
      return { needTime: true, error: false };
    }

    var solar = lunar.Solar.fromYmdHms(parts.year, parts.month, parts.day, hour, 0, 0);
    var lunarObj = solar.getLunar();
    var eightChar = lunarObj.getEightChar();

    var yearPillar = eightChar.getYear();
    var monthPillar = eightChar.getMonth();
    var dayPillar = eightChar.getDay();
    var hourPillar = eightChar.getTime();

    var dayGan = eightChar.getDayGan();
    var dayZhi = eightChar.getDayZhi();
    var dayMasterElement = eightChar.getDayGan().getElement();

    // 五行统计
    var elements = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
    var pillars = [yearPillar, monthPillar, dayPillar, hourPillar];
    pillars.forEach(function(p) {
      var ganElement = p.getGan().getElement();
      var zhiElement = p.getZhi().getElement();
      // lunar-javascript 的 getElement 返回的是对象，需用 getName()
      if (ganElement && ganElement.getName) elements[ganElement.getName()]++;
      if (zhiElement && zhiElement.getName) elements[zhiElement.getName()]++;
    });

    var missingElements = [];
    Object.keys(elements).forEach(function(k) {
      if (elements[k] === 0) missingElements.push(k);
    });

    var zodiac = lunarObj.getYearShengXiao();

    var summary = yearPillar.getGanZhi() + '年 ' +
                  monthPillar.getGanZhi() + '月 ' +
                  dayPillar.getGanZhi() + '日 ' +
                  hourPillar.getGanZhi() + '时 | ' +
                  '日主' + dayGan.getName() + dayMasterElement.getName() +
                  (missingElements.length > 0 ? ' | 五行缺' + missingElements.join('') : '') +
                  ' | 生肖' + zodiac;

    return {
      needTime: false,
      error: false,
      yearPillar: yearPillar.getGanZhi(),
      monthPillar: monthPillar.getGanZhi(),
      dayPillar: dayPillar.getGanZhi(),
      hourPillar: hourPillar.getGanZhi(),
      dayMaster: dayGan.getName() + dayMasterElement.getName(),
      fiveElements: elements,
      missingElements: missingElements,
      zodiac: zodiac,
      summary: summary
    };
  } catch (e) {
    console.error('calcBazi error:', e);
    return { error: true, needTime: false, summary: '八字排盘失败' };
  }
}
```

- [ ] **Step 2：更新 module.exports 添加 calcBazi**

修改 `fortune/services/calc-service.js` 的 module.exports：

```javascript
module.exports = {
  parseBirthTime: parseBirthTime,
  parseBirthday: parseBirthday,
  BIRTH_TIME_MAP: BIRTH_TIME_MAP,
  calcBazi: calcBazi
};
```

- [ ] **Step 3：添加测试用例**

在 `fortune/tests/calc-service.test.js` 的 `console.log('\n' + passed...` 之前添加：

```javascript
console.log('\ncalcBazi:');
var baziResult = calc.calcBazi({ name: '张三', birthday: '1990-03-15', gender: 'male', birthTime: '子时' });
if (baziResult.error || baziResult.needTime) {
  console.log('  ✗ calcBazi should return valid result');
  failed++;
} else {
  console.log('  ✓ calcBazi returns result without error');
  passed++;
  if (baziResult.yearPillar && baziResult.yearPillar.length === 2) {
    console.log('  ✓ yearPillar is 2-char GanZhi: ' + baziResult.yearPillar);
    passed++;
  } else {
    console.log('  ✗ yearPillar invalid: ' + baziResult.yearPillar);
    failed++;
  }
  if (baziResult.dayMaster && baziResult.dayMaster.length >= 2) {
    console.log('  ✓ dayMaster: ' + baziResult.dayMaster);
    passed++;
  } else {
    console.log('  ✗ dayMaster invalid');
    failed++;
  }
  if (baziResult.summary && baziResult.summary.length > 10) {
    console.log('  ✓ summary generated');
    passed++;
  } else {
    console.log('  ✗ summary missing');
    failed++;
  }
}

var baziNoTime = calc.calcBazi({ name: '张三', birthday: '1990-03-15', gender: 'male' });
if (baziNoTime.needTime === true) {
  console.log('  ✓ calcBazi returns needTime when birthTime missing');
  passed++;
} else {
  console.log('  ✗ calcBazi should return needTime when birthTime missing');
  failed++;
}
```

- [ ] **Step 4：运行测试**

```bash
cd e:/AI/Wechatbot
node fortune/tests/calc-service.test.js
```

Expected: 全部 ✓（注意：lunar-javascript 的 API 需要验证，如失败需调整属性访问方式）

- [ ] **Step 5：提交**

```bash
git add fortune/services/calc-service.js fortune/tests/calc-service.test.js
git commit -m "feat(fortune): implement calcBazi with lunar-javascript"
```

---

### Task 9：实现 calcZiwei（紫微斗数）

**Files:**
- Modify: `fortune/services/calc-service.js`
- Modify: `fortune/tests/calc-service.test.js`

- [ ] **Step 1：在 calc-service.js 中添加 calcZiwei 函数**

在 `fortune/services/calc-service.js` 的 calcBazi 之后、module.exports 之前添加：

```javascript
var iztro = require('iztro');

function calcZiwei(profile) {
  try {
    var parts = parseBirthday(profile.birthday);
    var hour = parseBirthTime(profile.birthTime);

    if (hour === null) {
      return { needTime: true, error: false };
    }

    // iztro 的时辰索引：子时=0, 丑时=1, ... 亥时=11
    var timeIndex = hour / 2;

    var astrolabe = iztro.astro.bySolar(
      parts.year, parts.month, parts.day,
      timeIndex,
      profile.gender === 'female' ? '女' : '男'
    );

    var summary = '命宫：' + (astrolabe.solarChart && astrolabwe.solarChart.length > 0 ? '已排盘' : '排盘完成');

    // 尝试提取主要信息，iztro 输出结构因版本而异
    var majorStars = [];
    var lifePalace = '';
    var fiveElementLevel = '';

    if (astrolabe.solarChart) {
      astrolabwe.solarChart.forEach(function(palace) {
        if (palace.name === '命宫' || palace.type === '命宫') {
          lifePalace = palace.name;
          if (palace.majorStars) {
            palace.majorStars.forEach(function(s) {
              if (s && s.name) majorStars.push(s.name);
            });
          }
        }
      });
    }

    if (majorStars.length > 0) {
      summary = '命宫主星：' + majorStars.join('、');
    }

    return {
      needTime: false,
      error: false,
      lifePalace: lifePalace,
      majorStars: majorStars,
      fiveElementLevel: fiveElementLevel,
      summary: summary
    };
  } catch (e) {
    console.error('calcZiwei error:', e);
    return { error: true, needTime: false, summary: '紫微斗数排盘失败' };
  }
}
```

注意：iztro 的 API 输出结构需在实际运行时验证。如果属性名不匹配，需在测试中调整。上面的代码用了 try/catch 保护，即使 iztro 结构变化也会降级返回 summary 字符串。

- [ ] **Step 2：修复 typo 并更新 module.exports**

修复上面代码中的 `astrolabwe` typo（应为 `astrolabe`），然后更新 module.exports：

```javascript
module.exports = {
  parseBirthTime: parseBirthTime,
  parseBirthday: parseBirthday,
  BIRTH_TIME_MAP: BIRTH_TIME_MAP,
  calcBazi: calcBazi,
  calcZiwei: calcZiwei
};
```

- [ ] **Step 3：添加测试用例**

在 `fortune/tests/calc-service.test.js` 的最终统计之前添加：

```javascript
console.log('\ncalcZiwei:');
var ziweiResult = calc.calcZiwei({ name: '张三', birthday: '1990-03-15', gender: 'male', birthTime: '子时' });
if (ziweiResult.error || ziweiResult.needTime) {
  console.log('  ✗ calcZiwei should return valid result, got: ' + JSON.stringify(ziweiResult));
  failed++;
} else {
  console.log('  ✓ calcZiwei returns result without error');
  passed++;
  if (ziweiResult.summary && ziweiResult.summary.length > 0) {
    console.log('  ✓ summary: ' + ziweiResult.summary);
    passed++;
  } else {
    console.log('  ✗ summary missing');
    failed++;
  }
}

var ziweiNoTime = calc.calcZiwei({ name: '张三', birthday: '1990-03-15', gender: 'male' });
if (ziweiNoTime.needTime === true) {
  console.log('  ✓ calcZiwei returns needTime when birthTime missing');
  passed++;
} else {
  console.log('  ✗ calcZiwei should return needTime when birthTime missing');
  failed++;
}
```

- [ ] **Step 4：运行测试**

```bash
cd e:/AI/Wechatbot
node fortune/tests/calc-service.test.js
```

Expected: 全部 ✓（iztro API 结构可能需调整属性名，根据实际输出修正）

- [ ] **Step 5：提交**

```bash
git add fortune/services/calc-service.js fortune/tests/calc-service.test.js
git commit -m "feat(fortune): implement calcZiwei with iztro"
```

---

### Task 10：实现 calcConstellation、calcYijing、calcTarot、buildContext

**Files:**
- Modify: `fortune/services/calc-service.js`
- Modify: `fortune/tests/calc-service.test.js`

- [ ] **Step 1：在 calc-service.js 中添加三个函数和 buildContext**

在 `fortune/services/calc-service.js` 的 calcZiwei 之后、module.exports 之前添加：

```javascript
function calcConstellation(profile) {
  try {
    var parts = parseBirthday(profile.birthday);
    var solar = lunar.Solar.fromYmd(parts.year, parts.month, parts.day);
    var star = solar.getXingZuo();

    var starMap = {
      '白羊': { element: '火象', rulingPlanet: '火星', dateRange: '3月21日-4月19日' },
      '金牛': { element: '土象', rulingPlanet: '金星', dateRange: '4月20日-5月20日' },
      '双子': { element: '风象', rulingPlanet: '水星', dateRange: '5月21日-6月21日' },
      '巨蟹': { element: '水象', rulingPlanet: '月亮', dateRange: '6月22日-7月22日' },
      '狮子': { element: '火象', rulingPlanet: '太阳', dateRange: '7月23日-8月22日' },
      '处女': { element: '土象', rulingPlanet: '水星', dateRange: '8月23日-9月22日' },
      '天秤': { element: '风象', rulingPlanet: '金星', dateRange: '9月23日-10月23日' },
      '天蝎': { element: '水象', rulingPlanet: '冥王星', dateRange: '10月24日-11月22日' },
      '射手': { element: '火象', rulingPlanet: '木星', dateRange: '11月23日-12月21日' },
      '摩羯': { element: '土象', rulingPlanet: '土星', dateRange: '12月22日-1月19日' },
      '水瓶': { element: '风象', rulingPlanet: '天王星', dateRange: '1月20日-2月18日' },
      '双鱼': { element: '水象', rulingPlanet: '海王星', dateRange: '2月19日-3月20日' }
    };

    var info = starMap[star] || {};
    var fullName = star + '座';
    var zodiac = solar.getLunar().getYearShengXiao();

    return {
      error: false,
      sign: fullName,
      element: info.element || '',
      rulingPlanet: info.rulingPlanet || '',
      dateRange: info.dateRange || '',
      zodiac: zodiac,
      summary: fullName + ' · ' + (info.element || '') + ' · 守护星' + (info.rulingPlanet || '') + ' | 生肖' + zodiac
    };
  } catch (e) {
    console.error('calcConstellation error:', e);
    return { error: true, summary: '星座计算失败' };
  }
}

// 易经64卦
var YIJING_HEXAGRAMS = [
  { name: '乾为天', judgment: '元亨利贞' },
  { name: '坤为地', judgment: '元亨，利牝马之贞' },
  { name: '水雷屯', judgment: '元亨利贞，勿用有攸往' },
  { name: '山水蒙', judgment: '亨，匪我求童蒙' },
  { name: '水天需', judgment: '有孚，光亨贞吉' },
  { name: '天水讼', judgment: '有孚窒惕，中吉终凶' },
  { name: '地水师', judgment: '贞，丈人吉无咎' },
  { name: '水地比', judgment: '吉，原筮元永贞' },
  { name: '风天小畜', judgment: '亨，密云不雨' },
  { name: '天泽履', judgment: '履虎尾，不咥人，亨' },
  { name: '地天泰', judgment: '小往大来，吉亨' },
  { name: '天地否', judgment: '否之匪人，不利君子贞' },
  { name: '天火同人', judgment: '同人于野，亨' },
  { name: '火天大有', judgment: '元亨' },
  { name: '地山谦', judgment: '亨，君子有终' },
  { name: '雷地豫', judgment: '利建侯行师' },
  { name: '泽雷随', judgment: '元亨利贞，无咎' },
  { name: '山风蛊', judgment: '元亨，利涉大川' },
  { name: '地泽临', judgment: '元亨，利贞' },
  { name: '风地观', judgment: '盥而不荐，有孚颙若' },
  { name: '火雷噬嗑', judgment: '亨，利用狱' },
  { name: '山火贲', judgment: '亨，小利有攸往' },
  { name: '山地剥', judgment: '不利有攸往' },
  { name: '地雷复', judgment: '亨，出入无疾' },
  { name: '天雷无妄', judgment: '元亨利贞' },
  { name: '山天大畜', judgment: '利贞，不家食吉' },
  { name: '山雷颐', judgment: '贞吉，观颐，自求口实' },
  { name: '泽风大过', judgment: '栋桡，利有攸往，亨' },
  { name: '坎为水', judgment: '习坎，有孚，维心亨' },
  { name: '离为火', judgment: '利贞，亨，畜牝牛吉' },
  { name: '泽山咸', judgment: '亨，利贞，取女吉' },
  { name: '雷风恒', judgment: '亨，无咎，利贞' },
  { name: '天山遁', judgment: '亨，小利贞' },
  { name: '雷天大壮', judgment: '利贞' },
  { name: '火地晋', judgment: '康侯用锡马蕃庶' },
  { name: '地火明夷', judgment: '利艰贞' },
  { name: '风火家人', judgment: '利女贞' },
  { name: '火泽睽', judgment: '小事吉' },
  { name: '水山蹇', judgment: '利西南，不利东北' },
  { name: '雷水解', judgment: '利西南，无所往' },
  { name: '山泽损', judgment: '有孚，元吉无咎' },
  { name: '风雷益', judgment: '利有攸往，利涉大川' },
  { name: '泽天夬', judgment: '扬于王庭，孚号有厉' },
  { name: '天风姤', judgment: '女壮，勿用取女' },
  { name: '泽地萃', judgment: '亨，王假有庙' },
  { name: '地风升', judgment: '元亨，用见大人' },
  { name: '泽水困', judgment: '亨，贞，大人吉' },
  { name: '水风井', judgment: '改邑不改井，无丧无得' },
  { name: '泽火革', judgment: '巳日乃孚，元亨利贞' },
  { name: '火风鼎', judgment: '元吉，亨' },
  { name: '震为雷', judgment: '亨，震来虩虩，笑言哑哑' },
  { name: '艮为山', judgment: '艮其背，不获其身' },
  { name: '风山渐', judgment: '女归吉，利贞' },
  { name: '雷泽归妹', judgment: '征凶，无攸利' },
  { name: '雷火丰', judgment: '亨，王假之' },
  { name: '火山旅', judgment: '小亨，旅贞吉' },
  { name: '巽为风', judgment: '小亨，利有攸往' },
  { name: '兑为泽', judgment: '亨，利贞' },
  { name: '风水涣', judgment: '亨，王假有庙' },
  { name: '水泽节', judgment: '亨，苦节不可贞' },
  { name: '风泽中孚', judgment: '豚鱼吉，利涉大川' },
  { name: '雷山小过', judgment: '亨利贞，可小事' },
  { name: '水火既济', judgment: '亨小，利贞' },
  { name: '火水未济', judgment: '亨，小狐汔济' }
];

function calcYijing() {
  try {
    var index = Math.floor(Math.random() * 64);
    var hexagram = YIJING_HEXAGRAMS[index];
    var changingLine = Math.floor(Math.random() * 6) + 1;

    return {
      error: false,
      hexagramName: hexagram.name,
      judgment: hexagram.judgment,
      changingLine: changingLine,
      summary: '本卦：' + hexagram.name + ' | 卦辞：' + hexagram.judgment + ' | 动爻：第' + changingLine + '爻'
    };
  } catch (e) {
    return { error: true, summary: '易经卦象生成失败' };
  }
}

// 塔罗22张大阿尔克那
var TAROT_MAJOR = [
  { name: '愚者', number: 0, upright: ['新开始', '冒险', '自由', '天真'], reversed: ['鲁莽', '犹豫', '冒失'], element: '风', planet: '天王星' },
  { name: '魔术师', number: 1, upright: ['创造力', '意志力', '技巧'], reversed: ['操纵', '无能', '欺骗'], element: '风', planet: '水星' },
  { name: '女祭司', number: 2, upright: ['直觉', '神秘', '智慧'], reversed: ['隐秘', '压抑', '被动'], element: '水', planet: '月亮' },
  { name: '皇后', number: 3, upright: ['丰饶', '母性', '创造'], reversed: ['依赖', '过度保护', '停滞'], element: '土', planet: '金星' },
  { name: '皇帝', number: 4, upright: ['权威', '结构', '控制'], reversed: ['专制', '僵化', '无力'], element: '火', planet: '白羊座' },
  { name: '教皇', number: 5, upright: ['传统', '信仰', '教导'], reversed: ['反叛', '异端', '自由思想'], element: '土', planet: '金牛座' },
  { name: '恋人', number: 6, upright: ['爱情', '选择', '和谐'], reversed: ['分裂', '错误选择', '失衡'], element: '风', planet: '双子座' },
  { name: '战车', number: 7, upright: ['胜利', '意志', '前进'], reversed: ['失控', '方向迷失', '侵略'], element: '水', planet: '巨蟹座' },
  { name: '力量', number: 8, upright: ['勇气', '耐心', '内在力量'], reversed: ['自我怀疑', '软弱', '缺乏信心'], element: '火', planet: '狮子座' },
  { name: '隐者', number: 9, upright: ['内省', '孤独', '智慧'], reversed: ['孤立', '退缩', '固执'], element: '土', planet: '处女座' },
  { name: '命运之轮', number: 10, upright: ['转折', '机遇', '命运'], reversed: ['厄运', '抗拒变化', '失控'], element: '火', planet: '木星' },
  { name: '正义', number: 11, upright: ['公平', '真相', '因果'], reversed: ['不公', '偏见', '不诚实'], element: '风', planet: '天秤座' },
  { name: '倒吊人', number: 12, upright: ['牺牲', '放下', '新视角'], reversed: ['无谓牺牲', '停滞', '抵抗'], element: '水', planet: '海王星' },
  { name: '死神', number: 13, upright: ['终结', '转变', '重生'], reversed: ['抗拒变化', '停滞', '恐惧'], element: '水', planet: '天蝎座' },
  { name: '节制', number: 14, upright: ['平衡', '调和', '耐心'], reversed: ['失衡', '过度', '缺乏耐心'], element: '火', planet: '射手座' },
  { name: '恶魔', number: 15, upright: ['束缚', '欲望', '物质主义'], reversed: ['解放', '觉醒', '挣脱'], element: '土', planet: '摩羯座' },
  { name: '高塔', number: 16, upright: ['突变', '破坏', '觉醒'], reversed: ['避免灾难', '恐惧变化', '延迟'], element: '火', planet: '火星' },
  { name: '星星', number: 17, upright: ['希望', '灵感', '宁静'], reversed: ['绝望', '失去信心', '消极'], element: '风', planet: '水瓶座' },
  { name: '月亮', number: 18, upright: ['幻觉', '直觉', '潜意识'], reversed: ['清晰', '真相显露', '释放恐惧'], element: '水', planet: '双鱼座' },
  { name: '太阳', number: 19, upright: ['喜悦', '成功', '活力'], reversed: ['暂时阴霾', '过度乐观', '延迟成功'], element: '火', planet: '太阳' },
  { name: '审判', number: 20, upright: ['重生', '觉醒', '救赎'], reversed: ['自我谴责', '犹豫', '错过呼唤'], element: '火', planet: '冥王星' },
  { name: '世界', number: 21, upright: ['完成', '成就', '圆满'], reversed: ['未完成', '停滞', '接近尾声'], element: '土', planet: '土星' }
];

function calcTarot() {
  try {
    var index = Math.floor(Math.random() * 22);
    var card = TAROT_MAJOR[index];
    var isReversed = Math.random() < 0.5;
    var meaning = isReversed ? card.reversed : card.upright;

    return {
      error: false,
      card: card.name,
      number: card.number,
      reversed: isReversed,
      meanings: meaning,
      element: card.element,
      planet: card.planet,
      summary: card.name + (isReversed ? '（逆位）' : '（正位）') + ' | 关键词：' + meaning.join('、') + ' | 元素' + card.element
    };
  } catch (e) {
    return { error: true, summary: '塔罗抽牌失败' };
  }
}

function calcAstrology(profile) {
  // 占星术复用星座数据，补充更多解读角度
  try {
    var conResult = calcConstellation(profile);
    if (conResult.error) return conResult;

    return {
      error: false,
      sign: conResult.sign,
      element: conResult.element,
      rulingPlanet: conResult.rulingPlanet,
      zodiac: conResult.zodiac,
      summary: conResult.sign + '占星分析 | ' + conResult.element + ' | 守护星' + conResult.rulingPlanet + ' | 生肖' + conResult.zodiac
    };
  } catch (e) {
    return { error: true, summary: '占星术分析失败' };
  }
}

function buildContext(profile, types) {
  var results = {};
  types.forEach(function(type) {
    switch (type) {
      case 'bazi':
        results.bazi = calcBazi(profile);
        break;
      case 'ziwei':
        results.ziwei = calcZiwei(profile);
        break;
      case 'yijing':
        results.yijing = calcYijing();
        break;
      case 'constellation':
        results.constellation = calcConstellation(profile);
        break;
      case 'tarot':
        results.tarot = calcTarot();
        break;
      case 'astrology':
        results.astrology = calcAstrology(profile);
        break;
    }
  });
  return results;
}
```

- [ ] **Step 2：更新 module.exports**

```javascript
module.exports = {
  parseBirthTime: parseBirthTime,
  parseBirthday: parseBirthday,
  BIRTH_TIME_MAP: BIRTH_TIME_MAP,
  calcBazi: calcBazi,
  calcZiwei: calcZiwei,
  calcConstellation: calcConstellation,
  calcYijing: calcYijing,
  calcTarot: calcTarot,
  calcAstrology: calcAstrology,
  buildContext: buildContext
};
```

- [ ] **Step 3：添加测试用例**

在 `fortune/tests/calc-service.test.js` 的最终统计之前添加：

```javascript
console.log('\ncalcConstellation:');
var conResult = calc.calcConstellation({ name: '张三', birthday: '1990-03-15', gender: 'male' });
if (conResult.error) {
  console.log('  ✗ calcConstellation failed');
  failed++;
} else {
  console.log('  ✓ sign: ' + conResult.sign);
  passed++;
  if (conResult.summary && conResult.summary.length > 5) {
    console.log('  ✓ summary generated');
    passed++;
  } else {
    console.log('  ✗ summary missing');
    failed++;
  }
}

console.log('\ncalcYijing:');
var yijingResult = calc.calcYijing();
if (yijingResult.error) {
  console.log('  ✗ calcYijing failed');
  failed++;
} else {
  console.log('  ✓ hexagram: ' + yijingResult.hexagramName);
  passed++;
  if (yijingResult.changingLine >= 1 && yijingResult.changingLine <= 6) {
    console.log('  ✓ changingLine: ' + yijingResult.changingLine);
    passed++;
  } else {
    console.log('  ✗ changingLine out of range');
    failed++;
  }
}

console.log('\ncalcTarot:');
var tarotResult = calc.calcTarot();
if (tarotResult.error) {
  console.log('  ✗ calcTarot failed');
  failed++;
} else {
  console.log('  ✓ card: ' + tarotResult.card + (tarotResult.reversed ? ' (逆位)' : ' (正位)'));
  passed++;
  if (tarotResult.meanings && tarotResult.meanings.length > 0) {
    console.log('  ✓ meanings: ' + tarotResult.meanings.join(', '));
    passed++;
  } else {
    console.log('  ✗ meanings missing');
    failed++;
  }
}

console.log('\nbuildContext:');
var ctx = calc.buildContext({ name: '张三', birthday: '1990-03-15', gender: 'male', birthTime: '子时' }, ['bazi', 'ziwei', 'yijing']);
if (ctx.bazi && ctx.ziwei && ctx.yijing) {
  console.log('  ✓ buildContext returns all 3 results');
  passed++;
} else {
  console.log('  ✗ buildContext missing results');
  failed++;
}

var ctxWest = calc.buildContext({ name: '张三', birthday: '1990-03-15', gender: 'male' }, ['constellation', 'tarot', 'astrology']);
if (ctxWest.constellation && ctxWest.tarot && ctxWest.astrology) {
  console.log('  ✓ buildContext returns western results');
  passed++;
} else {
  console.log('  ✗ buildContext missing western results');
  failed++;
}
```

- [ ] **Step 4：运行全部测试**

```bash
cd e:/AI/Wechatbot
node fortune/tests/calc-service.test.js
```

Expected: 全部 ✓，0 failed

- [ ] **Step 5：提交**

```bash
git add fortune/services/calc-service.js fortune/tests/calc-service.test.js
git commit -m "feat(fortune): implement calcConstellation, calcYijing, calcTarot, calcAstrology, buildContext"
```

---

## Phase 3：UI 重写

### Task 11：重写首页 Index

**Files:**
- Modify: `fortune/pages/index/index.js`
- Modify: `fortune/pages/index/index.wxml`
- Modify: `fortune/pages/index/index.wxss`
- Modify: `fortune/pages/index/index.json`

- [ ] **Step 1：重写 index.json**

替换 `fortune/pages/index/index.json`：

```json
{
  "usingComponents": {
    "profile-form": "../../components/profile-form/profile-form"
  }
}
```

- [ ] **Step 2：重写 index.js**

替换 `fortune/pages/index/index.js` 全部内容：

```javascript
const storageService = require('../../services/storage-service');
const calcService = require('../../services/calc-service');
const aiService = require('../../services/ai-service');

Page({
  data: {
    profile: null,
    showProfileForm: false,
    dailyFortune: ''
  },

  onLoad() {
    this.loadProfile();
    this.loadDailyFortune();
  },

  onShow() {
    this.loadProfile();
  },

  loadProfile() {
    const profile = storageService.getProfile();
    this.setData({ profile });
  },

  loadDailyFortune() {
    var cache = storageService.getDailyCache();
    var today = new Date().toISOString().slice(0, 10);

    if (cache && cache.date === today && cache.fortune) {
      this.setData({ dailyFortune: cache.fortune });
      return;
    }

    var profile = storageService.getProfile();
    if (!profile) {
      this.setData({ dailyFortune: '完善档案后查看今日运势' });
      return;
    }

    // 用星座生成简要运势
    var conResult = calcService.calcConstellation(profile);
    if (conResult.error) {
      this.setData({ dailyFortune: '今日运势加载中…' });
      return;
    }

    var prompt = '请为' + conResult.sign + '的人生成一句简短的今日运势（30字以内），包含星级评分（★☆）。要求100%中文。';
    aiService.callAI(prompt).then(function(content) {
      var fortune = content.trim().substring(0, 50);
      this.setData({ dailyFortune: fortune });
      storageService.saveDailyCache({ date: today, fortune: fortune });
    }.bind(this)).catch(function() {
      this.setData({ dailyFortune: conResult.sign + ' · 今日宜静心思考' });
    }.bind(this));
  },

  handleShowProfileForm() {
    this.setData({ showProfileForm: true });
  },

  handleCloseProfileForm() {
    this.setData({ showProfileForm: false });
  },

  handleSaveProfile(e) {
    const { profile } = e.detail;
    storageService.saveProfile(profile);
    this.setData({ profile, showProfileForm: false });
    wx.showToast({ title: '档案已保存', icon: 'success' });
    this.loadDailyFortune();
  },

  handleCategoryTap(e) {
    const category = e.currentTarget.dataset.category;

    if (!this.data.profile) {
      wx.showModal({
        title: '提示',
        content: '请先填写档案信息',
        confirmText: '去填写',
        success: (res) => {
          if (res.confirm) {
            this.setData({ showProfileForm: true });
          }
        }
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/reading/reading?category=' + category
    });
  },

  handleHistoryTap() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  }
});
```

- [ ] **Step 3：重写 index.wxml**

替换 `fortune/pages/index/index.wxml` 全部内容：

```xml
<view class="page-container bg-neutral">
  <view class="page-content">
    <!-- Nav -->
    <view class="nav-bar">
      <text class="nav-title">☯ AI命理</text>
      <text class="nav-icon" bindtap="handleHistoryTap">📜</text>
    </view>

    <!-- Hero -->
    <view class="hero">
      <text class="hero-label">TODAY · 今日</text>
      <text class="hero-text">{{dailyFortune || '完善档案后查看今日运势'}}</text>
    </view>

    <!-- Profile -->
    <view class="glass-card profile-card" bindtap="handleShowProfileForm">
      <view class="profile-avatar">{{profile ? profile.name[0] : '?'}}</view>
      <view class="profile-info">
        <text class="profile-name">{{profile ? profile.name : '点击填写档案'}}</text>
        <text class="profile-detail" wx:if="{{profile}}">{{profile.birthday}} · {{profile.gender === 'male' ? '♂' : '♀'}}{{profile.birthTime ? ' · ' + profile.birthTime : ''}}</text>
      </view>
      <text class="arrow">›</text>
    </view>

    <!-- Grid -->
    <view class="grid">
      <view class="grid-item grid-chinese" data-category="chinese" bindtap="handleCategoryTap">
        <text class="grid-icon">☯</text>
        <text class="grid-title">易学命理</text>
        <text class="grid-sub">八字·紫微·易经</text>
      </view>
      <view class="grid-item grid-western" data-category="western" bindtap="handleCategoryTap">
        <text class="grid-icon">⭐</text>
        <text class="grid-title">西方星象</text>
        <text class="grid-sub">星座·塔罗·占星</text>
      </view>
    </view>

    <!-- History -->
    <view class="glass-card history-entry" bindtap="handleHistoryTap">
      <text class="history-label">📜 历史记录</text>
      <text class="arrow">›</text>
    </view>
  </view>

  <!-- Profile Form -->
  <profile-form wx:if="{{showProfileForm}}" bind:close="handleCloseProfileForm" bind:save="handleSaveProfile" profile="{{profile}}" />
</view>
```

- [ ] **Step 4：重写 index.wxss**

替换 `fortune/pages/index/index.wxss` 全部内容：

```css
.page-container {
  min-height: 100vh;
  color: #fff;
}

.page-content {
  position: relative;
  z-index: 1;
  padding: 0 0 40rpx;
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 32rpx 20rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.nav-icon {
  font-size: 36rpx;
  opacity: 0.7;
}

.hero {
  text-align: center;
  padding: 40rpx 40rpx 20rpx;
}

.hero-label {
  display: block;
  font-size: 20rpx;
  opacity: 0.5;
  letter-spacing: 6rpx;
}

.hero-text {
  display: block;
  font-size: 26rpx;
  margin-top: 12rpx;
  opacity: 0.9;
  line-height: 1.5;
}

.profile-card {
  margin: 24rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.profile-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #d97757, #818cf8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
}

.profile-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
}

.profile-detail {
  display: block;
  font-size: 22rpx;
  opacity: 0.6;
  margin-top: 6rpx;
}

.arrow {
  opacity: 0.4;
  font-size: 28rpx;
}

.grid {
  padding: 0 24rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.grid-item {
  border-radius: 24rpx;
  padding: 40rpx 20rpx;
  text-align: center;
}

.grid-chinese {
  background: linear-gradient(135deg, rgba(217,119,87,0.15), rgba(120,113,108,0.1));
  border: 1px solid rgba(217,119,87,0.3);
}

.grid-western {
  background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(14,165,233,0.1));
  border: 1px solid rgba(129,140,248,0.3);
}

.grid-icon {
  display: block;
  font-size: 56rpx;
}

.grid-title {
  display: block;
  font-size: 24rpx;
  margin-top: 12rpx;
  font-weight: 500;
}

.grid-sub {
  display: block;
  font-size: 18rpx;
  opacity: 0.6;
  margin-top: 4rpx;
}

.history-entry {
  margin: 24rpx;
  padding: 28rpx 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-label {
  font-size: 26rpx;
}
```

- [ ] **Step 5：在微信开发者工具中验证**

手动操作：打开微信开发者工具 → 编译 → 确认首页显示深色背景、档案卡、双入口网格、无报错

- [ ] **Step 6：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/pages/index/
git commit -m "feat(fortune): rewrite index page with dark theme and daily fortune"
```

---

### Task 12：重写解读页 Reading

**Files:**
- Modify: `fortune/pages/reading/reading.js`
- Modify: `fortune/pages/reading/reading.wxml`
- Modify: `fortune/pages/reading/reading.wxss`
- Modify: `fortune/pages/reading/reading.json`

- [ ] **Step 1：重写 reading.json**

替换 `fortune/pages/reading/reading.json`：

```json
{
  "usingComponents": {
    "fortune-card": "../../components/fortune-card/fortune-card"
  }
}
```

- [ ] **Step 2：重写 reading.js（集成 calc-service、修导航路径）**

替换 `fortune/pages/reading/reading.js` 全部内容：

```javascript
const storageService = require('../../services/storage-service');
const aiService = require('../../services/ai-service');
const calcService = require('../../services/calc-service');

Page({
  data: {
    category: '',
    categoryName: '',
    profile: null,
    readings: [],
    isViewMode: false,
    historyId: null,
    themeClass: 'bg-chinese',
    themeColor: '#d97757',
    needTimeWarn: false
  },

  onLoad(options) {
    const category = options.category || 'chinese';
    const categoryName = category === 'chinese' ? '易学命理' : '西方星象';
    const themeClass = category === 'chinese' ? 'bg-chinese' : 'bg-western';
    const themeColor = category === 'chinese' ? '#d97757' : '#818cf8';

    this.setData({ category, categoryName, themeClass, themeColor });

    if (options.mode === 'view' && options.id) {
      this.loadHistoryReading(options.id);
    } else {
      this.startNewReading(category, categoryName);
    }
  },

  loadHistoryReading(id) {
    const record = storageService.getHistoryById(id);
    if (record) {
      const themeClass = record.category === 'chinese' ? 'bg-chinese' : 'bg-western';
      const themeColor = record.category === 'chinese' ? '#d97757' : '#818cf8';
      this.setData({
        category: record.category,
        categoryName: record.category === 'chinese' ? '易学命理' : '西方星象',
        profile: record.profile,
        readings: record.results.map(r => ({
          type: r.type,
          typeName: r.typeName,
          content: r.content,
          summary: r.calcData ? r.calcData.summary : '',
          status: 'completed'
        })),
        isViewMode: true,
        historyId: id,
        themeClass,
        themeColor
      });
    }
  },

  startNewReading(category, categoryName) {
    const profile = storageService.getProfile();
    if (!profile) {
      wx.showToast({ title: '请先填写档案', icon: 'none' });
      wx.navigateBack();
      return;
    }

    const types = category === 'chinese'
      ? [{ type: 'bazi', typeName: '八字命理' }, { type: 'ziwei', typeName: '紫微斗数' }, { type: 'yijing', typeName: '易经卦象' }]
      : [{ type: 'constellation', typeName: '星座分析' }, { type: 'tarot', typeName: '塔罗占卜' }, { type: 'astrology', typeName: '占星术' }];

    // 计算排盘数据
    var typeStrings = types.map(function(t) { return t.type; });
    var calcResults = calcService.buildContext(profile, typeStrings);

    // 检查是否缺时辰
    var needTimeWarn = false;
    if (category === 'chinese') {
      if (calcResults.bazi && calcResults.bazi.needTime) needTimeWarn = true;
    }

    this.setData({
      profile,
      readings: types.map(function(t) {
        var calcData = calcResults[t.type];
        return {
          type: t.type,
          typeName: t.typeName,
          content: '',
          summary: (calcData && !calcData.error && !calcData.needTime) ? calcData.summary : '',
          status: 'pending'
        };
      }),
      needTimeWarn: needTimeWarn
    });

    this.startStreamReadings(calcResults);
  },

  startStreamReadings(calcResults) {
    const { category, profile } = this.data;

    aiService.streamReadings(
      category,
      profile,
      calcResults,
      (type, typeName) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], status: 'loading', content: '' };
          this.setData({ readings });
        }
      },
      (type, content) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], content, status: 'streaming' };
          this.setData({ readings });
        }
      },
      (type, typeName, content) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], content, status: 'completed' };
          this.setData({ readings });
        }
      },
      () => {
        this.saveToHistory(calcResults);
      },
      (type, err) => {
        console.error('Reading error:', type, err);
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], status: 'error' };
          this.setData({ readings });
        }
      }
    );
  },

  saveToHistory(calcResults) {
    const { category, profile, readings } = this.data;
    const record = {
      category,
      profile,
      results: readings.map(r => ({
        type: r.type,
        typeName: r.typeName,
        content: r.content,
        calcData: calcResults[r.type] || null
      }))
    };
    var saved = storageService.addHistory(record);
    if (saved) {
      this.setData({ historyId: saved.id });
    }
  },

  handleChatTap() {
    const { readings, historyId } = this.data;
    const allCompleted = readings.every(r => r.status === 'completed');

    if (!allCompleted) {
      wx.showToast({ title: '请等待测算完成', icon: 'none' });
      return;
    }

    var id = historyId;
    if (!id) {
      const history = storageService.getHistory();
      if (history.length > 0) {
        id = history[0].id;
      }
    }

    wx.navigateTo({
      url: '/pages/chat/chat?readingId=' + id
    });
  },

  handleBack() {
    wx.navigateBack();
  }
});
```

- [ ] **Step 3：重写 reading.wxml**

替换 `fortune/pages/reading/reading.wxml` 全部内容：

```xml
<view class="page-container {{themeClass}}">
  <view class="page-content">
    <!-- Nav -->
    <view class="nav-bar">
      <text class="nav-back" bindtap="handleBack">‹</text>
      <text class="nav-title">{{categoryName}} · {{profile.name}}</text>
    </view>

    <!-- Tags -->
    <view class="tags" wx:if="{{profile}}">
      <view class="tag" style="border-color:{{themeColor}};color:{{themeColor}}">📅 {{profile.birthday}}</view>
      <view class="tag" style="border-color:{{themeColor}};color:{{themeColor}}">{{profile.gender === 'male' ? '♂ 男' : '♀ 女'}}</view>
      <view class="tag" wx:if="{{profile.birthTime}}" style="border-color:{{themeColor}};color:{{themeColor}}">🕐 {{profile.birthTime}}</view>
    </view>

    <!-- Notice -->
    <view class="notice" wx:if="{{needTimeWarn}}">
      <text>⚠️ 八字/紫微需出生时辰，请完善档案</text>
    </view>

    <!-- Steps -->
    <view class="steps">
      <block wx:for="{{readings}}" wx:key="type">
        <view class="step {{item.status === 'completed' ? 'step-done' : item.status === 'loading' || item.status === 'streaming' ? 'step-active' : 'step-pending'}}" style="{{item.status === 'completed' || item.status === 'loading' || item.status === 'streaming' ? 'background:' + themeColor : ''}}">
          <text wx:if="{{item.status === 'completed'}}">✓</text>
          <text wx:elif="{{item.status === 'loading' || item.status === 'streaming'}}">{{index + 1}}</text>
          <text wx:else>{{index + 1}}</text>
        </view>
        <view class="step-line" wx:if="{{index < readings.length - 1}}" style="background:{{item.status === 'completed' ? themeColor : 'rgba(255,255,255,0.15)'}}"></view>
      </block>
    </view>

    <!-- Cards -->
    <view class="cards">
      <view class="card {{item.status === 'streaming' ? 'card-streaming' : item.status === 'completed' ? 'card-done' : item.status === 'loading' ? 'card-loading' : 'card-pending'}}" wx:for="{{readings}}" wx:key="type" style="{{item.status === 'streaming' || item.status === 'loading' ? 'border-color:' + themeColor + ';box-shadow:0 0 30rpx ' + themeColor + '33' : ''}}">
        <view class="card-header">
          <text class="card-title">{{item.typeName}}</text>
          <text class="card-status" wx:if="{{item.status === 'completed'}}" style="color:{{themeColor}};background:{{themeColor}}22">✓ 完成</text>
          <text class="card-status" wx:if="{{item.status === 'loading' || item.status === 'streaming'}}" style="color:{{themeColor}}">● 推演中</text>
          <text class="card-status" wx:if="{{item.status === 'pending'}}" style="opacity:0.4">排队中</text>
        </view>
        <view class="card-summary" wx:if="{{item.summary}}">{{item.summary}}</view>
        <view class="card-content" wx:if="{{item.content}}">{{item.content}}</view>
        <view class="card-loading-dots" wx:if="{{item.status === 'loading'}}">
          <view class="dot" style="background:{{themeColor}}"></view>
          <view class="dot" style="background:{{themeColor}}"></view>
          <view class="dot" style="background:{{themeColor}}"></view>
        </view>
      </view>
    </view>

    <!-- FAB -->
    <view class="fab" bindtap="handleChatTap" style="background:linear-gradient(135deg,{{themeColor}},{{themeColor}}aa);box-shadow:0 8rpx 32rpx {{themeColor}}66">
      <text>💬 AI提问</text>
    </view>
  </view>
</view>
```

- [ ] **Step 4：重写 reading.wxss**

替换 `fortune/pages/reading/reading.wxss` 全部内容：

```css
.page-container {
  min-height: 100vh;
  color: #fff;
}

.page-content {
  position: relative;
  z-index: 1;
  padding-bottom: 120rpx;
}

.nav-bar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 30rpx 32rpx 20rpx;
}

.nav-back {
  font-size: 36rpx;
  opacity: 0.7;
}

.nav-title {
  font-size: 30rpx;
  font-weight: 600;
  flex: 1;
}

.tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  padding: 0 32rpx 16rpx;
}

.tag {
  border: 1px solid;
  border-radius: 40rpx;
  padding: 6rpx 20rpx;
  font-size: 20rpx;
  background: rgba(255,255,255,0.05);
}

.notice {
  margin: 0 24rpx 16rpx;
  background: rgba(251,191,36,0.12);
  border: 1px solid rgba(251,191,36,0.25);
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  font-size: 22rpx;
  color: #fbbf24;
}

.steps {
  display: flex;
  align-items: center;
  margin: 0 24rpx 24rpx;
  padding: 24rpx;
  background: rgba(255,255,255,0.06);
  border-radius: 20rpx;
  border: 1px solid rgba(255,255,255,0.08);
}

.step {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  flex-shrink: 0;
}

.step-done {
  color: #fff;
}

.step-active {
  color: #fff;
  animation: pulse 1.5s infinite;
}

.step-pending {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  opacity: 0.4;
}

.step-line {
  flex: 1;
  height: 2rpx;
  margin: 0 12rpx;
  margin-top: -28rpx;
}

.cards {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.card {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 24rpx;
  overflow: hidden;
  transition: all 0.3s;
}

.card-streaming {
  border-width: 2rpx;
}

.card-pending {
  opacity: 0.5;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.card-title {
  font-size: 26rpx;
  font-weight: 600;
}

.card-status {
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.card-summary {
  padding: 16rpx 28rpx;
  font-size: 20rpx;
  font-family: monospace;
  color: #fbbf24;
  opacity: 0.9;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.card-content {
  padding: 20rpx 28rpx;
  font-size: 22rpx;
  line-height: 1.7;
  opacity: 0.9;
  white-space: pre-wrap;
}

.card-loading-dots {
  display: flex;
  gap: 8rpx;
  padding: 20rpx 28rpx;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  opacity: 0.6;
}

.dot:nth-child(1) { animation: blink 1s infinite; }
.dot:nth-child(2) { animation: blink 1s 0.2s infinite; }
.dot:nth-child(3) { animation: blink 1s 0.4s infinite; }

.fab {
  position: fixed;
  bottom: 48rpx;
  left: 48rpx;
  right: 48rpx;
  border-radius: 48rpx;
  padding: 24rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes blink {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
```

- [ ] **Step 5：在微信开发者工具中验证**

手动操作：编译 → 从首页点击"易学命理" → 确认三步进度条显示、排盘数据摘要出现在卡片头部、流式文字更新、无报错

- [ ] **Step 6：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/pages/reading/
git commit -m "feat(fortune): rewrite reading page with theme system, steps, and calc-data injection"
```

---

### Task 13：重写对话页 Chat（删开关、修滚动、卷轴流）

**Files:**
- Modify: `fortune/pages/chat/chat.js`
- Modify: `fortune/pages/chat/chat.wxml`
- Modify: `fortune/pages/chat/chat.wxss`
- Modify: `fortune/pages/chat/chat.json`

- [ ] **Step 1：重写 chat.json**

替换 `fortune/pages/chat/chat.json`：

```json
{
  "usingComponents": {
    "chat-input": "../../components/chat-input/chat-input",
    "chat-bubble": "../../components/chat-bubble/chat-bubble"
  }
}
```

- [ ] **Step 2：重写 chat.js（删开关、修滚动、修文件清除）**

替换 `fortune/pages/chat/chat.js` 全部内容：

```javascript
const storageService = require('../../services/storage-service');
const aiService = require('../../services/ai-service');

Page({
  data: {
    readingId: '',
    messages: [],
    isLoading: false,
    fileName: '',
    filePath: '',
    fileContent: '',
    scrollToView: '',
    themeClass: 'bg-chinese',
    themeColor: '#d97757',
    baziSummary: ''
  },

  onLoad(options) {
    const readingId = options.readingId || '';
    this.setData({ readingId });
    this.loadTheme();
    this.loadChatHistory();
  },

  loadTheme() {
    var history = storageService.getHistoryById(this.data.readingId);
    if (history) {
      var isChinese = history.category === 'chinese';
      this.setData({
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
          content: '你好！我是AI运势助手。基于你的运势分析，有什么想进一步了解的吗？',
          id: 'msg_0'
        }]
      });
    } else {
      this.setData({ messages });
    }
    this.scrollToBottom();
  },

  handleInput(e) {
    this.setData({ inputValue: e.detail.value });
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

  handleSend(e) {
    const content = e.detail.content;
    if (!content || this.data.isLoading) return;

    const userMsg = { role: 'user', content, id: 'msg_' + Date.now() };
    const messages = [...this.data.messages, userMsg];
    this.setData({ messages, inputValue: '', isLoading: true });
    this.scrollToBottom();

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
      });

      aiService.streamAI(prompt,
        (fullText) => {
          const messages = [...this.data.messages];
          messages[assistantIndex] = { role: 'assistant', content: fullText, id: assistantMsg.id };
          this.setData({ messages });
          this.scrollToBottom();
        },
        () => {
          this.setData({ isLoading: false, fileName: '', filePath: '', fileContent: '' });
          this.saveChatHistory();
          this.scrollToBottom();
        },
        (err) => {
          console.error('Chat error:', err);
          const messages = [...this.data.messages];
          messages[assistantIndex] = { role: 'assistant', content: '抱歉，回答出现问题，请重试。', id: assistantMsg.id };
          this.setData({ messages, isLoading: false, fileName: '', filePath: '', fileContent: '' });
          this.scrollToBottom();
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
```

- [ ] **Step 3：重写 chat.wxml（卷轴流布局）**

替换 `fortune/pages/chat/chat.wxml` 全部内容：

```xml
<view class="page-container {{themeClass}}">
  <view class="page-content">
    <!-- Nav -->
    <view class="nav-bar">
      <text class="nav-back" bindtap="handleBack">‹</text>
      <view class="nav-info">
        <text class="nav-title">深度对话</text>
        <text class="nav-sub" wx:if="{{baziSummary}}">BASED ON {{baziSummary}}</text>
      </view>
    </view>

    <!-- Messages -->
    <scroll-view class="messages" scroll-y scroll-into-view="{{scrollToView}}" scroll-with-animation>
      <!-- Session start -->
      <view class="session-start">
        <text class="session-icon">☯</text>
        <text class="session-label">SESSION START</text>
      </view>

      <block wx:for="{{messages}}" wx:key="id">
        <!-- User message: pill tag -->
        <view class="user-msg" wx:if="{{item.role === 'user'}}" id="{{item.id}}">
          <view class="user-pill">
            <text class="user-prefix">问</text>
            <text class="user-text">{{item.content}}</text>
          </view>
        </view>

        <!-- AI message: scroll stream -->
        <view class="ai-msg" wx:if="{{item.role === 'assistant'}}" id="{{item.id}}">
          <view class="ai-stream-line" style="background:linear-gradient(180deg,{{themeColor}},transparent)"></view>
          <view class="ai-content">
            <view class="ai-label" style="color:{{themeColor}}">
              <text>AI 命理师 · {{item.content ? '推演' : '推演中'}}</text>
            </view>
            <chat-bubble role="assistant" content="{{item.content}}" themeColor="{{themeColor}}" />
          </view>
        </view>
      </block>

      <!-- Separator -->
      <view class="separator" wx:if="{{messages.length > 1}}">✦ ✦ ✦</view>
    </scroll-view>

    <!-- File hint -->
    <view class="file-hint" wx:if="{{fileName}}">
      <text>📎 {{fileName}}</text>
      <text class="file-close" bindtap="clearFile">✕</text>
    </view>

    <!-- Input bar -->
    <view class="input-bar">
      <text class="input-icon" bindtap="handleChooseFile">📎</text>
      <chat-input value="{{inputValue}}" bind:input="handleInput" bind:send="handleSend" disabled="{{isLoading}}" />
    </view>
  </view>
</view>
```

- [ ] **Step 4：重写 chat.wxss（卷轴流样式）**

替换 `fortune/pages/chat/chat.wxss` 全部内容：

```css
.page-container {
  min-height: 100vh;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.page-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.nav-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 30rpx 32rpx 20rpx;
}

.nav-back {
  font-size: 40rpx;
  opacity: 0.7;
}

.nav-info {
  flex: 1;
}

.nav-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
}

.nav-sub {
  display: block;
  font-size: 18rpx;
  opacity: 0.5;
  letter-spacing: 2rpx;
  margin-top: 4rpx;
}

.messages {
  flex: 1;
  padding: 24rpx 32rpx;
  padding-bottom: 120rpx;
}

.session-start {
  text-align: center;
  margin-bottom: 40rpx;
}

.session-icon {
  display: block;
  font-size: 48rpx;
  margin-bottom: 16rpx;
}

.session-label {
  font-size: 18rpx;
  opacity: 0.4;
  letter-spacing: 6rpx;
}

.user-msg {
  margin-bottom: 32rpx;
}

.user-pill {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2));
  border: 1px solid rgba(139,92,246,0.4);
  border-radius: 32rpx;
  padding: 12rpx 28rpx;
}

.user-prefix {
  font-size: 20rpx;
  opacity: 0.6;
}

.user-text {
  font-size: 24rpx;
}

.ai-msg {
  position: relative;
  padding-left: 32rpx;
  margin-bottom: 32rpx;
}

.ai-stream-line {
  position: absolute;
  left: 0;
  top: 16rpx;
  bottom: 16rpx;
  width: 4rpx;
}

.ai-content {
  position: relative;
}

.ai-label {
  font-size: 18rpx;
  letter-spacing: 4rpx;
  margin-bottom: 16rpx;
  opacity: 0.7;
}

.separator {
  text-align: center;
  color: rgba(255,255,255,0.15);
  font-size: 20rpx;
  letter-spacing: 8rpx;
  margin: 40rpx 0;
}

.file-hint {
  margin: 0 32rpx 12rpx;
  background: rgba(251,191,36,0.15);
  border: 1px solid rgba(251,191,36,0.3);
  border-radius: 16rpx;
  padding: 12rpx 20rpx;
  font-size: 20rpx;
  color: #fbbf24;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-close {
  opacity: 0.7;
}

.input-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 32rpx 32rpx;
  border-top: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.2);
}

.input-icon {
  font-size: 36rpx;
  opacity: 0.5;
}
```

- [ ] **Step 5：在微信开发者工具中验证**

手动操作：编译 → 完成一次解读 → 点"AI提问" → 确认卷轴流布局、无思考/搜索开关、流式回复更新、自动滚动到底部

- [ ] **Step 6：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/pages/chat/
git commit -m "feat(fortune): rewrite chat page with scroll-stream layout, remove thinking/search switches, fix auto-scroll"
```

---

### Task 14：更新 chat-bubble 组件（mp-html + Markdown 转换）

**Files:**
- Modify: `fortune/components/chat-bubble/chat-bubble.js`
- Modify: `fortune/components/chat-bubble/chat-bubble.wxml`
- Modify: `fortune/components/chat-bubble/chat-bubble.wxss`
- Modify: `fortune/components/chat-bubble/chat-bubble.json`

- [ ] **Step 1：重写 chat-bubble.json**

替换 `fortune/components/chat-bubble/chat-bubble.json`：

```json
{
  "usingComponents": {
    "mp-html": "mp-html/index"
  }
}
```

- [ ] **Step 2：重写 chat-bubble.js（Markdown→HTML 转换）**

替换 `fortune/components/chat-bubble/chat-bubble.js` 全部内容：

```javascript
Component({
  properties: {
    role: {
      type: String,
      value: 'user'
    },
    content: {
      type: String,
      value: '',
      observer: function(newVal) {
        if (this.data.role === 'assistant' && newVal) {
          this.setData({ htmlContent: this.markdownToHtml(newVal) });
        } else {
          this.setData({ htmlContent: '' });
        }
      }
    },
    themeColor: {
      type: String,
      value: '#d97757'
    }
  },
  data: {
    htmlContent: ''
  },
  lifetimes: {
    attached: function() {
      if (this.data.role === 'assistant' && this.data.content) {
        this.setData({ htmlContent: this.markdownToHtml(this.data.content) });
      }
    }
  },
  methods: {
    markdownToHtml: function(md) {
      if (!md) return '';
      var html = md;

      // 转义 HTML
      html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      // 标题 ### ## #
      html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
      html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
      html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

      // 粗体 **text**
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

      // 列表 - item
      html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
        return '<ul>' + match + '</ul>';
      });

      // 引用块 > text
      html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

      // 代码块 `code`
      html = html.replace(/`(.+?)`/g, '<code>$1</code>');

      // 换行
      html = html.replace(/\n/g, '<br/>');

      return html;
    }
  }
});
```

- [ ] **Step 3：重写 chat-bubble.wxml**

替换 `fortune/components/chat-bubble/chat-bubble.wxml` 全部内容：

```xml
<view class="bubble">
  <mp-html wx:if="{{htmlContent}}" content="{{htmlContent}}" />
  <text wx:else class="plain-text">{{content}}</text>
</view>
```

- [ ] **Step 4：重写 chat-bubble.wxss**

替换 `fortune/components/chat-bubble/chat-bubble.wxss` 全部内容：

```css
.bubble {
  font-size: 24rpx;
  line-height: 1.8;
}

.plain-text {
  opacity: 0.9;
}

/* mp-html 内部样式覆盖 */
.bubble h1, .bubble h2, .bubble h3 {
  color: #fbbf24;
  font-weight: 400;
  margin: 16rpx 0 8rpx;
}

.bubble h1 { font-size: 30rpx; }
.bubble h2 { font-size: 28rpx; }
.bubble h3 { font-size: 26rpx; }

.bubble strong {
  color: #fbbf24;
}

.bubble ul {
  padding-left: 32rpx;
  margin: 8rpx 0;
}

.bubble li {
  margin: 4rpx 0;
}

.bubble blockquote {
  border-left: 4rpx solid #8b5cf6;
  background: rgba(139,92,246,0.08);
  padding: 12rpx 24rpx;
  margin: 12rpx 0;
  font-size: 22rpx;
}

.bubble code {
  background: rgba(255,255,255,0.1);
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
}
```

- [ ] **Step 5：在微信开发者工具中验证**

手动操作：编译 → 对话页发消息 → 确认 AI 回复的 Markdown 格式正确渲染（粗体、列表、标题）

- [ ] **Step 6：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/components/chat-bubble/
git commit -m "feat(fortune): integrate mp-html for markdown rendering in chat-bubble"
```

---

### Task 15：重写历史页 History

**Files:**
- Modify: `fortune/pages/history/history.js`
- Modify: `fortune/pages/history/history.wxml`
- Modify: `fortune/pages/history/history.wxss`
- Modify: `fortune/pages/history/history.json`

- [ ] **Step 1：重写 history.json**

替换 `fortune/pages/history/history.json`：

```json
{
  "usingComponents": {}
}
```

- [ ] **Step 2：重写 history.js（修导航路径、格式化时间戳）**

替换 `fortune/pages/history/history.js` 全部内容：

```javascript
const storageService = require('../../services/storage-service');

Page({
  data: {
    history: [],
    isEmpty: true
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    this.loadHistory();
  },

  loadHistory() {
    const history = storageService.getHistory();
    // 为每条记录补充格式化时间戳（兼容旧数据）
    var formatted = history.map(function(item) {
      return {
        ...item,
        timeText: item.createdAtFormatted || (item.timestamp ? storageService.formatDate(item.timestamp) : '未知时间'),
        isChinese: item.category === 'chinese'
      };
    });
    this.setData({
      history: formatted,
      isEmpty: formatted.length === 0
    });
  },

  handleItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/reading/reading?mode=view&id=' + id
    });
  },

  handleDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          storageService.deleteHistory(id);
          this.loadHistory();
          wx.showToast({ title: '删除成功', icon: 'success' });
        }
      }
    });
  },

  handleClear() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          storageService.clearHistory();
          this.loadHistory();
          wx.showToast({ title: '清空成功', icon: 'success' });
        }
      }
    });
  },

  handleBack() {
    wx.navigateBack();
  }
});
```

- [ ] **Step 3：重写 history.wxml（卡片 + 左侧色条 + 滑动删除）**

替换 `fortune/pages/history/history.wxml` 全部内容：

```xml
<view class="page-container bg-neutral">
  <view class="page-content">
    <!-- Nav -->
    <view class="nav-bar">
      <text class="nav-back" bindtap="handleBack">‹</text>
      <text class="nav-title">历史记录</text>
      <text class="nav-clear" wx:if="{{!isEmpty}}" bindtap="handleClear">清空</text>
    </view>

    <!-- Empty -->
    <view class="empty" wx:if="{{isEmpty}}">
      <text class="empty-icon">📜</text>
      <text class="empty-text">暂无历史记录</text>
    </view>

    <!-- List -->
    <view class="list" wx:if="{{!isEmpty}}">
      <view class="item" wx:for="{{history}}" wx:key="id" data-id="{{item.id}}" bindtap="handleItemTap">
        <view class="item-bar {{item.isChinese ? 'bar-chinese' : 'bar-western'}}"></view>
        <view class="item-icon {{item.isChinese ? 'icon-chinese' : 'icon-western'}}">
          <text>{{item.isChinese ? '☯' : '⭐'}}</text>
        </view>
        <view class="item-body">
          <view class="item-header">
            <text class="item-title">{{item.isChinese ? '易学命理' : '西方星象'}} · {{item.profile.name}}</text>
            <text class="item-time">{{item.timeText}}</text>
          </view>
          <text class="item-summary" wx:if="{{item.results && item.results.length > 0}}">{{item.results[0].content}}</text>
          <view class="item-tags">
            <text class="tag {{item.isChinese ? 'tag-chinese' : 'tag-western'}}" wx:for="{{item.results}}" wx:for-item="result" wx:key="type">{{result.typeName}}</text>
          </view>
        </view>
        <text class="item-arrow" data-id="{{item.id}}" catchtap="handleDelete">🗑</text>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 4：重写 history.wxss**

替换 `fortune/pages/history/history.wxss` 全部内容：

```css
.page-container {
  min-height: 100vh;
  color: #fff;
}

.page-content {
  position: relative;
  z-index: 1;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 32rpx 20rpx;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.nav-back {
  font-size: 36rpx;
  opacity: 0.7;
}

.nav-title {
  font-size: 28rpx;
  font-weight: 600;
}

.nav-clear {
  font-size: 22rpx;
  color: #ef4444;
  opacity: 0.8;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
}

.empty-icon {
  display: block;
  font-size: 80rpx;
  opacity: 0.3;
}

.empty-text {
  display: block;
  font-size: 24rpx;
  opacity: 0.4;
  margin-top: 24rpx;
}

.list {
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.item {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}

.item-bar {
  width: 6rpx;
  height: 80rpx;
  border-radius: 3rpx;
  flex-shrink: 0;
  margin-top: 8rpx;
}

.bar-chinese { background: #d97757; }
.bar-western { background: #818cf8; }

.item-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}

.icon-chinese { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
.icon-western { background: linear-gradient(135deg, #f59e0b, #ec4899); }

.item-body {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.item-title {
  font-size: 24rpx;
  font-weight: 600;
}

.item-time {
  font-size: 18rpx;
  opacity: 0.5;
}

.item-summary {
  display: block;
  font-size: 20rpx;
  opacity: 0.7;
  line-height: 1.4;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.tag {
  font-size: 18rpx;
  border: 1px solid;
  border-radius: 16rpx;
  padding: 2rpx 12rpx;
}

.tag-chinese {
  background: rgba(139,92,246,0.2);
  border-color: rgba(139,92,246,0.4);
  color: #c4b5fd;
}

.tag-western {
  background: rgba(236,72,153,0.2);
  border-color: rgba(236,72,153,0.4);
  color: #f9a8d4;
}

.item-arrow {
  opacity: 0.4;
  font-size: 28rpx;
  flex-shrink: 0;
  padding: 8rpx;
}
```

- [ ] **Step 5：在微信开发者工具中验证**

手动操作：编译 → 首页点"历史记录" → 确认卡片列表显示、时间戳格式化（YYYY-MM-DD HH:mm）、左侧色条区分体系、删除按钮可点

- [ ] **Step 6：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/pages/history/
git commit -m "feat(fortune): rewrite history page with formatted timestamps, category bars, and tags"
```

---

### Task 16：更新 profile-form 组件（Vant 弹窗）

**Files:**
- Modify: `fortune/components/profile-form/profile-form.wxml`
- Modify: `fortune/components/profile-form/profile-form.wxss`
- Modify: `fortune/components/profile-form/profile-form.json`

- [ ] **Step 1：重写 profile-form.json**

替换 `fortune/components/profile-form/profile-form.json`：

```json
{
  "usingComponents": {}
}
```

注意：profile-form 保持自定义实现，不依赖 Vant，避免弹窗嵌套复杂度。

- [ ] **Step 2：检查 profile-form 现有代码是否能正常工作**

读取 `fortune/components/profile-form/profile-form.js` 和 `.wxml`，确认：
- 能接收 `profile` 属性
- 能触发 `save` 和 `close` 事件
- 表单含姓名、生日、性别、时辰

如现有代码功能正常，仅需调整 wxss 适配深色主题。如有 bug，修复。

- [ ] **Step 3：调整 profile-form.wxss 适配深色主题**

在 `fortune/components/profile-form/profile-form.wxss` 末尾追加（或调整现有样式）：

```css
.profile-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-form-card {
  width: 80%;
  max-width: 600rpx;
  background: #292524;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 32rpx;
  padding: 40rpx;
  color: #fff;
}

.profile-form-title {
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  margin-bottom: 32rpx;
}

.profile-form-label {
  font-size: 24rpx;
  opacity: 0.7;
  margin-bottom: 8rpx;
  display: block;
}

.profile-form-input {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  color: #fff;
  font-size: 26rpx;
  margin-bottom: 24rpx;
  width: 100%;
  box-sizing: border-box;
}

.profile-form-picker {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  color: #fff;
  font-size: 26rpx;
  margin-bottom: 24rpx;
}

.profile-form-btn {
  background: linear-gradient(135deg, #d97757, #92400e);
  color: #fff;
  border: none;
  border-radius: 24rpx;
  padding: 20rpx;
  font-size: 28rpx;
  font-weight: 600;
  width: 100%;
  text-align: center;
  margin-top: 16rpx;
}

.profile-form-cancel {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: none;
  border-radius: 24rpx;
  padding: 20rpx;
  font-size: 28rpx;
  width: 100%;
  text-align: center;
  margin-top: 12rpx;
}
```

注意：需确保 wxml 中的 class 名与上述 wxss 匹配。如果现有 wxml 的 class 名不同，调整 wxss 或 wxml 使之一致。

- [ ] **Step 4：在微信开发者工具中验证**

手动操作：编译 → 首页点档案卡 → 确认弹窗显示深色主题、表单可填写、保存后关闭

- [ ] **Step 5：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/components/profile-form/
git commit -m "style(fortune): adapt profile-form to dark theme"
```

---

## Phase 4：收尾打磨

### Task 17：精简 date-utils.js

**Files:**
- Modify: `fortune/utils/date-utils.js`

- [ ] **Step 1：读取现有 date-utils.js**

读取 `fortune/utils/date-utils.js`，确认哪些函数被其他文件引用。

- [ ] **Step 2：精简 date-utils.js**

保留 `formatDate` 和 `get时辰Name`（如有），删除未导出/未使用的函数。确保 storage-service 不依赖 date-utils（storage-service 已有自己的 formatDate）。

- [ ] **Step 3：提交**

```bash
cd e:/AI/Wechatbot
git add fortune/utils/date-utils.js
git commit -m "chore(fortune): trim unused functions from date-utils"
```

---

### Task 18：全量测试与最终验证

**Files:** 无新文件

- [ ] **Step 1：运行 calc-service 全部测试**

```bash
cd e:/AI/Wechatbot
node fortune/tests/calc-service.test.js
```

Expected: 全部 ✓，0 failed

- [ ] **Step 2：微信开发者工具全面验证**

手动操作清单：
1. 编译无报错
2. 首页：深色背景、档案卡、双入口、今日运势
3. 填写档案 → 保存 → 档案卡更新
4. 点"易学命理" → 解读页：
   - 暮云归背景
   - 三步进度条显示
   - 排盘数据摘要出现在卡片头部（如"庚午年 己卯月…"）
   - 流式文字逐字出现
   - 三项完成后"AI提问"可点
5. 点"AI提问" → 对话页：
   - 暮云归背景
   - 无思考/搜索开关
   - 卷轴流布局（左侧光带 + 标签式提问）
   - 输入问题 → AI流式回复 → 自动滚动
   - Markdown 格式正确渲染
6. 返回 → 首页点"西方星象" → 确认墨夜星河背景
7. 首页点"历史记录" → 确认：
   - 时间戳格式化（YYYY-MM-DD HH:mm）
   - 左侧色条区分体系
   - 删除按钮可点
   - 点击进入查看模式

- [ ] **Step 3：检查包体积**

手动操作：微信开发者工具 → 详情 → 基本信息 → 确认包体 < 2MB

如超限，检查 miniprogram_npm 是否按需引入，移除未使用的 Vant 组件。

- [ ] **Step 4：最终提交**

```bash
cd e:/AI/Wechatbot
git add -A
git commit -m "test(fortune): final verification complete"
```

---

## 成功标准核对

- [ ] lunar/iztro 真实排盘数据出现在 AI prompt 和卡片头部
- [ ] 4个页面全部沉浸式深色风格（主页中性 + 易学暮云归 + 西方墨夜星河）
- [ ] 对话页卷轴流布局 + Markdown 渲染 + 自动滚动正常
- [ ] 深度思考/搜索开关及关联代码完全移除
- [ ] 8项 bug 全部修复
- [ ] 微信开发者工具无报错，真机可预览
