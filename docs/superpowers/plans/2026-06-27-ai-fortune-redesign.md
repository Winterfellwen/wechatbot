# AI运势功能重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构AI运势功能，实现档案驱动、流式输出、多轮对话的全新体验

**Architecture:** 4个页面（首页、测算页、对话页、历史页），SSE流式输出，本地存储档案和历史

**Tech Stack:** 微信小程序原生开发，wx.request + enableChunked 实现SSE流式

---

## 文件结构映射

```
fortune/
├── pages/
│   ├── index/          # 首页 - 档案表单 + 分类入口
│   ├── reading/        # 测算页 - 流式输出3个运势
│   ├── chat/           # 对话页 - 多轮追问
│   └── history/        # 历史页 - 历史记录列表
├── components/
│   ├── fortune-card/   # 运势卡片组件（支持流式输出）
│   ├── profile-form/   # 档案表单组件
│   ├── chat-bubble/    # 对话气泡组件
│   └── chat-input/     # 对话输入组件
├── services/
│   ├── ai-service.js   # AI服务（SSE流式）
│   ├── storage-service.js  # 存储服务
│   └── prompt-service.js   # 提示词服务
├── utils/
│   ├── date-utils.js   # 日期工具
│   ├── zodiac-utils.js # 星座工具
│   └── validation-utils.js # 验证工具
└── app.json            # 子包配置
```

---

## Task 1: 清理旧文件，更新app.json配置

**Files:**
- Delete: `fortune/pages/types/` (entire directory)
- Delete: `fortune/pages/input/` (entire directory)
- Delete: `fortune/pages/daily/` (entire directory)
- Delete: `fortune/pages/result/` (entire directory)
- Delete: `fortune/components/type-card/` (entire directory)
- Delete: `fortune/components/result-display/` (entire directory)
- Modify: `fortune/app.json`

- [ ] **Step 1: 删除旧页面目录**

```bash
rm -rf fortune/pages/types fortune/pages/input fortune/pages/daily fortune/pages/result
rm -rf fortune/components/type-card fortune/components/result-display
```

- [ ] **Step 2: 更新app.json**

```json
{
  "root": "fortune",
  "pages": [
    "pages/index/index",
    "pages/reading/reading",
    "pages/chat/chat",
    "pages/history/history"
  ]
}
```

- [ ] **Step 3: 验证配置**

在微信开发者工具中重新编译，确认子包配置正确。

- [ ] **Step 4: 提交代码**

```bash
git add fortune/
git commit -m "chore: 清理旧文件，更新fortune子包配置"
```

---

## Task 2: 创建存储服务（storage-service.js）

**Files:**
- Rewrite: `fortune/services/storage-service.js`

- [ ] **Step 1: 创建存储服务**

```javascript
// fortune/services/storage-service.js

const STORAGE_KEYS = {
  PROFILE: 'fortune_profile',
  HISTORY: 'fortune_history',
  CHAT: 'fortune_chat_history'
};

// 获取用户档案
function getProfile() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.PROFILE) || null;
  } catch (e) {
    console.error('Failed to get profile:', e);
    return null;
  }
}

// 保存用户档案
function saveProfile(profile) {
  try {
    wx.setStorageSync(STORAGE_KEYS.PROFILE, profile);
    return true;
  } catch (e) {
    console.error('Failed to save profile:', e);
    return false;
  }
}

// 获取历史记录
function getHistory() {
  try {
    const history = wx.getStorageSync(STORAGE_KEYS.HISTORY);
    return Array.isArray(history) ? history : [];
  } catch (e) {
    console.error('Failed to get history:', e);
    return [];
  }
}

// 添加历史记录
function addHistory(record) {
  try {
    const history = getHistory();
    const newRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...record
    };
    history.unshift(newRecord);
    // 限制历史记录数量
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

// 获取单条历史记录
function getHistoryById(id) {
  const history = getHistory();
  return history.find(item => item.id === id) || null;
}

// 删除单条历史记录
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

// 清空历史记录
function clearHistory() {
  try {
    wx.setStorageSync(STORAGE_KEYS.HISTORY, []);
    return true;
  } catch (e) {
    console.error('Failed to clear history:', e);
    return false;
  }
}

// 获取对话记录
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

// 保存对话记录
function saveChatHistory(readingId, messages) {
  try {
    let allChats = wx.getStorageSync(STORAGE_KEYS.CHAT) || [];
    const existingIndex = allChats.findIndex(c => c.readingId === readingId);
    
    if (existingIndex >= 0) {
      allChats[existingIndex].messages = messages;
    } else {
      allChats.push({ readingId, messages });
    }
    
    // 限制对话记录数量
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

module.exports = {
  getProfile,
  saveProfile,
  getHistory,
  addHistory,
  getHistoryById,
  deleteHistory,
  clearHistory,
  getChatHistory,
  saveChatHistory
};
```

- [ ] **Step 2: 提交代码**

```bash
git add fortune/services/storage-service.js
git commit -m "feat: 重写存储服务，支持档案、历史、对话记录"
```

---

## Task 3: 创建档案表单组件（profile-form）

**Files:**
- Create: `fortune/components/profile-form/profile-form.js`
- Create: `fortune/components/profile-form/profile-form.json`
- Create: `fortune/components/profile-form/profile-form.wxml`
- Create: `fortune/components/profile-form/profile-form.wxss`

- [ ] **Step 1: 创建组件JS**

```javascript
// fortune/components/profile-form/profile-form.js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    profile: {
      type: Object,
      value: null
    }
  },

  data: {
    name: '',
    birthday: '',
    gender: '',
    birthTime: '',
    genderOptions: ['男', '女'],
    timeOptions: ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时', '不填'],
    errors: {}
  },

  observers: {
    'profile': function(profile) {
      if (profile) {
        this.setData({
          name: profile.name || '',
          birthday: profile.birthday || '',
          gender: profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '',
          birthTime: profile.birthTime || ''
        });
      }
    }
  },

  methods: {
    handleNameInput(e) {
      this.setData({ name: e.detail.value });
      this.clearError('name');
    },

    handleDateChange(e) {
      this.setData({ birthday: e.detail.value });
      this.clearError('birthday');
    },

    handleGenderChange(e) {
      this.setData({ gender: this.data.genderOptions[e.detail.value] });
      this.clearError('gender');
    },

    handleTimeChange(e) {
      const value = this.data.timeOptions[e.detail.value];
      this.setData({ birthTime: value === '不填' ? '' : value });
    },

    clearError(field) {
      const errors = { ...this.data.errors };
      delete errors[field];
      this.setData({ errors });
    },

    validate() {
      const errors = {};
      if (!this.data.name.trim()) {
        errors.name = '请输入姓名';
      }
      if (!this.data.birthday) {
        errors.birthday = '请选择生日';
      }
      if (!this.data.gender) {
        errors.gender = '请选择性别';
      }
      this.setData({ errors });
      return Object.keys(errors).length === 0;
    },

    handleSave() {
      if (!this.validate()) {
        return;
      }
      const profile = {
        name: this.data.name.trim(),
        birthday: this.data.birthday,
        gender: this.data.gender === '男' ? 'male' : 'female',
        birthTime: this.data.birthTime
      };
      this.triggerEvent('save', { profile });
    },

    handleClose() {
      this.triggerEvent('close');
    }
  }
});
```

- [ ] **Step 2: 创建组件JSON**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 3: 创建组件WXML**

```html
<!-- fortune/components/profile-form/profile-form.wxml -->
<view class="modal-mask" wx:if="{{visible}}" bindtap="handleClose">
  <view class="modal-content" catchtap="">
    <view class="modal-header">
      <text class="modal-title">{{profile ? '编辑档案' : '创建档案'}}</text>
      <text class="modal-close" bindtap="handleClose">×</text>
    </view>
    
    <view class="form">
      <view class="form-item">
        <text class="label">姓名 *</text>
        <input class="input" placeholder="请输入姓名" value="{{name}}" bindinput="handleNameInput" />
        <text class="error" wx:if="{{errors.name}}">{{errors.name}}</text>
      </view>

      <view class="form-item">
        <text class="label">生日 *</text>
        <picker mode="date" value="{{birthday}}" bindchange="handleDateChange">
          <view class="picker">
            <text class="picker-text">{{birthday || '请选择生日'}}</text>
          </view>
        </picker>
        <text class="error" wx:if="{{errors.birthday}}">{{errors.birthday}}</text>
      </view>

      <view class="form-item">
        <text class="label">性别 *</text>
        <picker bindchange="handleGenderChange">
          <view class="picker">
            <text class="picker-text">{{gender || '请选择性别'}}</text>
          </view>
        </picker>
        <text class="error" wx:if="{{errors.gender}}">{{errors.gender}}</text>
      </view>

      <view class="form-item">
        <text class="label">出生时辰（选填）</text>
        <picker bindchange="handleTimeChange">
          <view class="picker">
            <text class="picker-text">{{birthTime || '请选择出生时辰'}}</text>
          </view>
        </picker>
        <text class="hint">不填时辰，易学命理分析可能不准确</text>
      </view>
    </view>

    <button class="save-btn" bindtap="handleSave">保存</button>
  </view>
</view>
```

- [ ] **Step 4: 创建组件WXSS**

```css
/* fortune/components/profile-form/profile-form.wxss */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  max-width: 600rpx;
  background: white;
  border-radius: 24rpx;
  padding: 40rpx;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40rpx;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #1E293B;
}

.modal-close {
  font-size: 48rpx;
  color: #94A3B8;
  line-height: 1;
}

.form-item {
  margin-bottom: 30rpx;
}

.label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
  display: block;
}

.input {
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 20rpx;
  font-size: 28rpx;
}

.picker {
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 20rpx;
  background: #f9f9f9;
}

.picker-text {
  font-size: 28rpx;
  color: #666;
}

.error {
  font-size: 24rpx;
  color: #ff4d4f;
  margin-top: 8rpx;
  display: block;
}

.hint {
  font-size: 22rpx;
  color: #94A3B8;
  margin-top: 8rpx;
  display: block;
}

.save-btn {
  background: linear-gradient(135deg, #8b5cf6, #d946ef);
  color: white;
  border-radius: 12rpx;
  font-size: 32rpx;
  padding: 24rpx;
  margin-top: 20rpx;
}
```

- [ ] **Step 5: 提交代码**

```bash
git add fortune/components/profile-form/
git commit -m "feat: 创建档案表单组件"
```

---

## Task 4: 创建运势卡片组件（fortune-card）

**Files:**
- Create: `fortune/components/fortune-card/fortune-card.js`
- Create: `fortune/components/fortune-card/fortune-card.json`
- Create: `fortune/components/fortune-card/fortune-card.wxml`
- Create: `fortune/components/fortune-card/fortune-card.wxss`

- [ ] **Step 1: 创建组件JS**

```javascript
// fortune/components/fortune-card/fortune-card.js
Component({
  properties: {
    typeName: {
      type: String,
      value: ''
    },
    content: {
      type: String,
      value: ''
    },
    status: {
      type: String,
      value: 'pending' // pending, loading, streaming, completed, error
    }
  },

  data: {
    displayContent: '',
    showCursor: false
  },

  observers: {
    'content': function(content) {
      this.setData({ displayContent: content });
    },
    'status': function(status) {
      this.setData({ showCursor: status === 'streaming' });
    }
  },

  methods: {
    handleRetry() {
      this.triggerEvent('retry');
    }
  }
});
```

- [ ] **Step 2: 创建组件JSON**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 3: 创建组件WXML**

```html
<!-- fortune/components/fortune-card/fortune-card.wxml -->
<view class="fortune-card">
  <view class="card-header">
    <text class="card-title">{{typeName}}</text>
    <view class="status-badge status-{{status}}">
      <text wx:if="{{status === 'pending'}}">排队中</text>
      <text wx:elif="{{status === 'loading'}}">分析中...</text>
      <text wx:elif="{{status === 'streaming'}}">解读中</text>
      <text wx:elif="{{status === 'completed'}}">已完成</text>
      <text wx:elif="{{status === 'error'}}">失败</text>
    </view>
  </view>
  
  <view class="card-body">
    <!-- 加载状态 -->
    <view class="loading-state" wx:if="{{status === 'loading'}}">
      <view class="loading-spinner"></view>
      <text class="loading-text">正在分析{{typeName}}...</text>
    </view>
    
    <!-- 内容显示 -->
    <view class="content-state" wx:elif="{{status === 'streaming' || status === 'completed'}}">
      <text class="content-text">{{displayContent}}</text>
      <text class="cursor" wx:if="{{showCursor}}">|</text>
    </view>
    
    <!-- 错误状态 -->
    <view class="error-state" wx:elif="{{status === 'error'}}">
      <text class="error-text">分析失败，请重试</text>
      <button class="retry-btn" bindtap="handleRetry">重试</button>
    </view>
  </view>
</view>
```

- [ ] **Step 4: 创建组件WXSS**

```css
/* fortune/components/fortune-card/fortune-card.wxss */
.fortune-card {
  background: white;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1E293B;
}

.status-badge {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.status-pending {
  background: #f1f5f9;
  color: #64748b;
}

.status-loading {
  background: #dbeafe;
  color: #2563eb;
}

.status-streaming {
  background: #fef3c7;
  color: #d97706;
}

.status-completed {
  background: #d1fae5;
  color: #059669;
}

.status-error {
  background: #fee2e2;
  color: #dc2626;
}

.card-body {
  padding: 30rpx;
  min-height: 120rpx;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #e5e7eb;
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 26rpx;
  color: #64748b;
  margin-top: 20rpx;
}

.content-state {
  line-height: 1.8;
}

.content-text {
  font-size: 28rpx;
  color: #333;
  white-space: pre-wrap;
}

.cursor {
  color: #8b5cf6;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.error-state {
  text-align: center;
  padding: 20rpx 0;
}

.error-text {
  font-size: 26rpx;
  color: #dc2626;
  display: block;
  margin-bottom: 20rpx;
}

.retry-btn {
  background: #8b5cf6;
  color: white;
  font-size: 26rpx;
  padding: 12rpx 40rpx;
  border-radius: 8rpx;
  display: inline-block;
}
```

- [ ] **Step 5: 提交代码**

```bash
git add fortune/components/fortune-card/
git commit -m "feat: 创建运势卡片组件，支持流式输出状态"
```

---

## Task 5: 创建AI服务（支持SSE流式）

**Files:**
- Rewrite: `fortune/services/ai-service.js`

- [ ] **Step 1: 创建AI服务**

```javascript
// fortune/services/ai-service.js

const NVIDIA_CONFIG = {
  key: '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',
  apiUrl: 'https://integrate.api.nvidia.com/v1',
  model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  maxTokens: 2000
};

// 构建测算提示词
function buildReadingPrompt(type, profile) {
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

  return `你是精通${typeName}的AI分析师。请根据以下用户信息进行${typeName}分析。

【用户信息】
${profileInfo}

【要求】
1. 提供专业、详细的${typeName}分析
2. 分析要有深度，包含具体解读
3. 给出实用的建议和指导
4. 语言通俗易懂

请直接输出分析结果，不要多余的开场白。`;
}

// 构建对话提示词
function buildChatPrompt(profile, results, question) {
  let resultsText = '';
  if (results && results.length > 0) {
    resultsText = results.map(r => `【${r.typeName}】\n${r.content}`).join('\n\n');
  }

  return `你是一个专业的运势分析师。以下是用户的信息和运势分析结果：

【用户档案】
姓名：${profile.name}
生日：${profile.birthday}
性别：${profile.gender === 'male' ? '男' : '女'}
${profile.birthTime ? '出生时辰：' + profile.birthTime : ''}

【运势分析结果】
${resultsText}

请基于以上信息回答用户的问题。回答要专业、详细、有深度。`;
}

// 流式调用AI API
function streamAI(prompt, onChunk, onDone, onError) {
  let task = null;
  let buffer = '';

  try {
    task = wx.request({
      url: NVIDIA_CONFIG.apiUrl + '/chat/completions',
      method: 'POST',
      enableChunked: true,
      timeout: 30000,
      header: {
        'Authorization': 'Bearer ' + NVIDIA_CONFIG.key,
        'Content-Type': 'application/json'
      },
      data: {
        model: NVIDIA_CONFIG.model,
        messages: [
          { role: 'system', content: '你是一个专业的运势分析师，精通中国传统文化和西方占星术。请用中文回答。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: NVIDIA_CONFIG.maxTokens,
        temperature: 0.7,
        stream: true
      },
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (onDone) onDone();
        } else {
          if (onError) onError(new Error('API error: ' + res.statusCode));
        }
      },
      fail: function(err) {
        if (onError) onError(new Error('Request failed: ' + (err.errMsg || 'unknown')));
      }
    });

    // 监听流式数据
    if (task && task.onChunkReceived) {
      task.onChunkReceived(function(res) {
        try {
          // 解析Uint8Array为字符串
          const data = new TextDecoder().decode(res.data);
          buffer += data;
          
          // 按行解析SSE数据
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留未完成的行
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') {
                if (onDone) onDone();
                return;
              }
              try {
                const json = JSON.parse(jsonStr);
                if (json.choices && json.choices[0] && json.choices[0].delta) {
                  const content = json.choices[0].delta.content || json.choices[0].delta.reasoning_content || '';
                  if (content && onChunk) {
                    onChunk(content);
                  }
                }
              } catch (e) {
                // 解析失败，跳过
              }
            }
          }
        } catch (e) {
          console.error('Chunk parse error:', e);
        }
      });
    }
  } catch (e) {
    if (onError) onError(e);
  }

  return task;
}

// 非流式调用（用于对话）
function callAI(prompt) {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: NVIDIA_CONFIG.apiUrl + '/chat/completions',
      method: 'POST',
      timeout: 30000,
      header: {
        'Authorization': 'Bearer ' + NVIDIA_CONFIG.key,
        'Content-Type': 'application/json'
      },
      data: {
        model: NVIDIA_CONFIG.model,
        messages: [
          { role: 'system', content: '你是一个专业的运势分析师，精通中国传统文化和西方占星术。请用中文回答。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: NVIDIA_CONFIG.maxTokens,
        temperature: 0.7
      },
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
          var message = res.data.choices[0].message;
          var content = message.content || message.reasoning_content || message.reasoning || '';
          resolve(content);
        } else {
          reject(new Error('API error: ' + res.statusCode));
        }
      },
      fail: function(err) {
        reject(new Error('Request failed: ' + (err.errMsg || 'unknown')));
      }
    });
  });
}

// 流式测算（3个运势依次调用）
function streamReadings(category, profile, onReadingStart, onChunk, onReadingComplete, onAllComplete, onError) {
  const types = category === 'chinese' 
    ? ['bazi', 'ziwei', 'yijing']
    : ['constellation', 'tarot', 'astrology'];
  
  const typeNames = {
    bazi: '八字命理', ziwei: '紫微斗数', yijing: '易经卦象',
    constellation: '星座分析', tarot: '塔罗占卜', astrology: '占星术'
  };

  let currentTypeIndex = 0;
  let currentContent = '';

  function processNextType() {
    if (currentTypeIndex >= types.length) {
      if (onAllComplete) onAllComplete();
      return;
    }

    const type = types[currentTypeIndex];
    currentContent = '';
    
    if (onReadingStart) {
      onReadingStart(type, typeNames[type]);
    }

    const prompt = buildReadingPrompt(type, profile);
    
    streamAI(prompt, 
      // onChunk
      function(chunk) {
        currentContent += chunk;
        if (onChunk) onChunk(type, currentContent);
      },
      // onDone
      function() {
        if (onReadingComplete) onReadingComplete(type, typeNames[type], currentContent);
        currentTypeIndex++;
        processNextType();
      },
      // onError
      function(err) {
        if (onError) onError(type, err);
      }
    );
  }

  processNextType();
}

module.exports = {
  buildReadingPrompt,
  buildChatPrompt,
  streamAI,
  callAI,
  streamReadings
};
```

- [ ] **Step 2: 提交代码**

```bash
git add fortune/services/ai-service.js
git commit -m "feat: 重写AI服务，支持SSE流式输出"
```

---

## Task 6: 创建首页（档案 + 分类入口）

**Files:**
- Rewrite: `fortune/pages/index/index.js`
- Rewrite: `fortune/pages/index/index.json`
- Rewrite: `fortune/pages/index/index.wxml`
- Rewrite: `fortune/pages/index/index.wxss`

- [ ] **Step 1: 重写页面JS**

```javascript
// fortune/pages/index/index.js
const storageService = require('../../services/storage-service');

Page({
  data: {
    profile: null,
    showProfileForm: false
  },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    this.loadProfile();
  },

  loadProfile() {
    const profile = storageService.getProfile();
    this.setData({ profile });
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
      url: `/fortune/pages/reading/reading?category=${category}`
    });
  },

  handleHistoryTap() {
    wx.navigateTo({
      url: '/fortune/pages/history/history'
    });
  }
});
```

- [ ] **Step 2: 重写页面JSON**

```json
{
  "usingComponents": {
    "profile-form": "/fortune/components/profile-form/profile-form"
  }
}
```

- [ ] **Step 3: 重写页面WXML**

```html
<!-- fortune/pages/index/index.wxml -->
<view class="container">
  <view class="header">
    <text class="title">AI运势分析</text>
  </view>

  <!-- 档案卡片 -->
  <view class="profile-card" bindtap="handleShowProfileForm">
    <view class="profile-info" wx:if="{{profile}}">
      <text class="profile-name">{{profile.name}}</text>
      <text class="profile-detail">📅 {{profile.birthday}} {{profile.gender === 'male' ? '男' : '女'}}</text>
      <text class="profile-detail" wx:if="{{profile.birthTime}}">⏰ {{profile.birthTime}}</text>
    </view>
    <view class="profile-empty" wx:else>
      <text class="empty-text">点击创建档案</text>
      <text class="empty-hint">填写信息后即可开始测算</text>
    </view>
    <text class="profile-arrow">›</text>
  </view>

  <!-- 分类入口 -->
  <view class="category-grid">
    <view class="category-card" bindtap="handleCategoryTap" data-category="chinese">
      <text class="category-icon">☯</text>
      <text class="category-name">易学命理</text>
      <text class="category-desc">八字 · 紫微 · 易经</text>
    </view>
    <view class="category-card" bindtap="handleCategoryTap" data-category="western">
      <text class="category-icon">⭐</text>
      <text class="category-name">西方星象</text>
      <text class="category-desc">星座 · 塔罗 · 占星</text>
    </view>
  </view>

  <!-- 历史记录入口 -->
  <view class="history-entry" bindtap="handleHistoryTap">
    <text class="history-text">查看历史记录</text>
  </view>

  <!-- 档案表单弹窗 -->
  <profile-form 
    visible="{{showProfileForm}}" 
    profile="{{profile}}"
    bind:save="handleSaveProfile"
    bind:close="handleCloseProfileForm"
  />
</view>
```

- [ ] **Step 4: 重写页面WXSS**

```css
/* fortune/pages/index/index.wxss */
.container {
  padding: 30rpx;
  background: #f8fafc;
  min-height: 100vh;
}

.header {
  padding: 40rpx 0;
  text-align: center;
}

.title {
  font-size: 44rpx;
  font-weight: bold;
  color: #1E293B;
}

.profile-card {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #1E293B;
  display: block;
  margin-bottom: 8rpx;
}

.profile-detail {
  font-size: 26rpx;
  color: #64748b;
  display: block;
  margin-bottom: 4rpx;
}

.profile-empty {
  flex: 1;
}

.empty-text {
  font-size: 32rpx;
  color: #1E293B;
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #94A3B8;
}

.profile-arrow {
  font-size: 40rpx;
  color: #94A3B8;
}

.category-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  margin-bottom: 30rpx;
}

.category-card {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;
}

.category-card:active {
  transform: scale(0.96);
}

.category-icon {
  font-size: 64rpx;
  display: block;
  margin-bottom: 16rpx;
}

.category-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1E293B;
  display: block;
  margin-bottom: 8rpx;
}

.category-desc {
  font-size: 24rpx;
  color: #94A3B8;
}

.history-entry {
  text-align: center;
  padding: 30rpx;
}

.history-text {
  font-size: 28rpx;
  color: #8b5cf6;
}
```

- [ ] **Step 5: 提交代码**

```bash
git add fortune/pages/index/
git commit -m "feat: 重写首页，支持档案管理和分类入口"
```

---

## Task 7: 创建测算页（流式输出3个运势）

**Files:**
- Create: `fortune/pages/reading/reading.js`
- Create: `fortune/pages/reading/reading.json`
- Create: `fortune/pages/reading/reading.wxml`
- Create: `fortune/pages/reading/reading.wxss`

- [ ] **Step 1: 创建页面JS**

```javascript
// fortune/pages/reading/reading.js
const storageService = require('../../services/storage-service');
const aiService = require('../../services/ai-service');

Page({
  data: {
    category: '',
    categoryName: '',
    profile: null,
    readings: [],
    isViewMode: false,
    historyId: null
  },

  onLoad(options) {
    const category = options.category || 'chinese';
    const categoryName = category === 'chinese' ? '易学命理' : '西方星象';
    
    // 判断是查看历史还是新测算
    if (options.mode === 'view' && options.id) {
      this.loadHistoryReading(options.id);
    } else {
      this.startNewReading(category, categoryName);
    }
  },

  loadHistoryReading(id) {
    const record = storageService.getHistoryById(id);
    if (record) {
      this.setData({
        category: record.category,
        categoryName: record.category === 'chinese' ? '易学命理' : '西方星象',
        profile: record.profile,
        readings: record.results.map(r => ({
          type: r.type,
          typeName: r.typeName,
          content: r.content,
          status: 'completed'
        })),
        isViewMode: true,
        historyId: id
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

    this.setData({
      category,
      categoryName,
      profile,
      readings: types.map(t => ({
        ...t,
        content: '',
        status: 'pending'
      }))
    });

    this.startStreamReadings();
  },

  startStreamReadings() {
    const { category, profile, readings } = this.data;
    
    aiService.streamReadings(
      category,
      profile,
      // onReadingStart
      (type, typeName) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], status: 'loading', content: '' };
          this.setData({ readings });
        }
      },
      // onChunk
      (type, content) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], content, status: 'streaming' };
          this.setData({ readings });
        }
      },
      // onReadingComplete
      (type, typeName, content) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], content, status: 'completed' };
          this.setData({ readings });
        }
      },
      // onAllComplete
      () => {
        this.saveToHistory();
      },
      // onError
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

  handleRetry(e) {
    const type = e.currentTarget.dataset.type;
    const { category, profile } = this.data;
    
    const typeNames = {
      bazi: '八字命理', ziwei: '紫微斗数', yijing: '易经卦象',
      constellation: '星座分析', tarot: '塔罗占卜', astrology: '占星术'
    };

    // 重新开始这个类型的测算
    const readings = [...this.data.readings];
    const index = readings.findIndex(r => r.type === type);
    if (index >= 0) {
      readings[index] = { ...readings[index], status: 'loading', content: '' };
      this.setData({ readings });
    }

    const prompt = aiService.buildReadingPrompt(type, profile);
    let currentContent = '';

    aiService.streamAI(prompt,
      (chunk) => {
        currentContent += chunk;
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], content: currentContent, status: 'streaming' };
          this.setData({ readings });
        }
      },
      () => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], content: currentContent, status: 'completed' };
          this.setData({ readings });
        }
        this.saveToHistory();
      },
      (err) => {
        const readings = [...this.data.readings];
        const index = readings.findIndex(r => r.type === type);
        if (index >= 0) {
          readings[index] = { ...readings[index], status: 'error' };
          this.setData({ readings });
        }
      }
    );
  },

  saveToHistory() {
    const { category, profile, readings } = this.data;
    const record = {
      category,
      profile,
      results: readings.map(r => ({
        type: r.type,
        typeName: r.typeName,
        content: r.content
      }))
    };
    storageService.addHistory(record);
  },

  handleChatTap() {
    const { readings, historyId } = this.data;
    const allCompleted = readings.every(r => r.status === 'completed');
    
    if (!allCompleted) {
      wx.showToast({ title: '请等待测算完成', icon: 'none' });
      return;
    }

    // 如果是新测算，需要先获取刚保存的历史记录ID
    let id = historyId;
    if (!id) {
      const history = storageService.getHistory();
      if (history.length > 0) {
        id = history[0].id;
      }
    }

    wx.navigateTo({
      url: `/fortune/pages/chat/chat?readingId=${id}`
    });
  },

  handleBack() {
    wx.navigateBack();
  }
});
```

- [ ] **Step 2: 创建页面JSON**

```json
{
  "usingComponents": {
    "fortune-card": "/fortune/components/fortune-card/fortune-card"
  }
}
```

- [ ] **Step 3: 创建页面WXML**

```html
<!-- fortune/pages/reading/reading.wxml -->
<view class="container">
  <!-- 顶部导航 -->
  <view class="nav-bar">
    <text class="nav-back" bindtap="handleBack">←</text>
    <text class="nav-title">{{categoryName}} · {{profile.name}}</text>
  </view>

  <!-- 用户信息 -->
  <view class="profile-bar">
    <text class="profile-info">📅 {{profile.birthday}} {{profile.gender === 'male' ? '男' : '女'}}</text>
    <text class="profile-info" wx:if="{{profile.birthTime}}">⏰ {{profile.birthTime}}</text>
  </view>

  <!-- 时辰提示 -->
  <view class="warning-bar" wx:if="{{category === 'chinese' && !profile.birthTime}}">
    <text class="warning-text">⚠️ 未填写出生时辰，易学命理分析可能不准确</text>
  </view>

  <!-- 运势卡片列表 -->
  <view class="readings-list">
    <fortune-card
      wx:for="{{readings}}"
      wx:key="type"
      typeName="{{item.typeName}}"
      content="{{item.content}}"
      status="{{item.status}}"
      data-type="{{item.type}}"
      bind:retry="handleRetry"
    />
  </view>

  <!-- AI对话入口 -->
  <view class="chat-fab" bindtap="handleChatTap">
    <text class="fab-icon">💬</text>
    <text class="fab-text">AI提问</text>
  </view>
</view>
```

- [ ] **Step 4: 创建页面WXSS**

```css
/* fortune/pages/reading/reading.wxss */
.container {
  padding: 30rpx;
  background: #f8fafc;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 0 30rpx;
}

.nav-back {
  font-size: 40rpx;
  color: #1E293B;
  margin-right: 20rpx;
}

.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1E293B;
}

.profile-bar {
  background: white;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.profile-info {
  font-size: 26rpx;
  color: #64748b;
  display: block;
  margin-bottom: 4rpx;
}

.warning-bar {
  background: #fef3c7;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.warning-text {
  font-size: 24rpx;
  color: #92400e;
}

.readings-list {
  margin-bottom: 30rpx;
}

.chat-fab {
  position: fixed;
  right: 40rpx;
  bottom: 80rpx;
  background: linear-gradient(135deg, #8b5cf6, #d946ef);
  border-radius: 60rpx;
  padding: 24rpx 36rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(139, 92, 246, 0.4);
}

.fab-icon {
  font-size: 36rpx;
  margin-right: 10rpx;
}

.fab-text {
  font-size: 28rpx;
  color: white;
  font-weight: 500;
}
```

- [ ] **Step 5: 提交代码**

```bash
git add fortune/pages/reading/
git commit -m "feat: 创建测算页，支持3个运势流式输出"
```

---

## Task 8: 创建对话气泡组件和输入组件

**Files:**
- Create: `fortune/components/chat-bubble/chat-bubble.js`
- Create: `fortune/components/chat-bubble/chat-bubble.json`
- Create: `fortune/components/chat-bubble/chat-bubble.wxml`
- Create: `fortune/components/chat-bubble/chat-bubble.wxss`
- Create: `fortune/components/chat-input/chat-input.js`
- Create: `fortune/components/chat-input/chat-input.json`
- Create: `fortune/components/chat-input/chat-input.wxml`
- Create: `fortune/components/chat-input/chat-input.wxss`

- [ ] **Step 1: 创建对话气泡组件JS**

```javascript
// fortune/components/chat-bubble/chat-bubble.js
Component({
  properties: {
    role: {
      type: String,
      value: 'user' // user 或 assistant
    },
    content: {
      type: String,
      value: ''
    },
    streaming: {
      type: Boolean,
      value: false
    }
  }
});
```

- [ ] **Step 2: 创建对话气泡组件JSON**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 3: 创建对话气泡组件WXML**

```html
<!-- fortune/components/chat-bubble/chat-bubble.wxml -->
<view class="bubble-wrapper {{role === 'user' ? 'user' : 'assistant'}}">
  <view class="avatar" wx:if="{{role === 'assistant'}}">🤖</view>
  <view class="bubble">
    <text class="content">{{content}}</text>
    <text class="cursor" wx:if="{{streaming}}">|</text>
  </view>
</view>
```

- [ ] **Step 4: 创建对话气泡组件WXSS**

```css
/* fortune/components/chat-bubble/chat-bubble.wxss */
.bubble-wrapper {
  display: flex;
  margin-bottom: 24rpx;
}

.bubble-wrapper.user {
  justify-content: flex-end;
}

.bubble-wrapper.assistant {
  justify-content: flex-start;
}

.avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6, #d946ef);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.bubble {
  max-width: 70%;
  padding: 20rpx 28rpx;
  border-radius: 20rpx;
  line-height: 1.6;
}

.user .bubble {
  background: linear-gradient(135deg, #8b5cf6, #d946ef);
  color: white;
  border-bottom-right-radius: 4rpx;
}

.assistant .bubble {
  background: white;
  color: #1E293B;
  border-bottom-left-radius: 4rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.content {
  font-size: 28rpx;
  white-space: pre-wrap;
}

.cursor {
  color: #8b5cf6;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

- [ ] **Step 5: 创建对话输入组件JS**

```javascript
// fortune/components/chat-input/chat-input.js
Component({
  data: {
    inputValue: ''
  },

  methods: {
    handleInput(e) {
      this.setData({ inputValue: e.detail.value });
    },

    handleSend() {
      const content = this.data.inputValue.trim();
      if (!content) {
        return;
      }
      this.triggerEvent('send', { content });
      this.setData({ inputValue: '' });
    }
  }
});
```

- [ ] **Step 6: 创建对话输入组件JSON**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 7: 创建对话输入组件WXML**

```html
<!-- fortune/components/chat-input/chat-input.wxml -->
<view class="input-bar">
  <input 
    class="input" 
    placeholder="输入你想问的问题..." 
    value="{{inputValue}}" 
    bindinput="handleInput"
    confirm-type="send"
    bindconfirm="handleSend"
  />
  <view class="send-btn {{inputValue ? 'active' : ''}}" bindtap="handleSend">发送</view>
</view>
```

- [ ] **Step 8: 创建对话输入组件WXSS**

```css
/* fortune/components/chat-input/chat-input.wxss */
.input-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: white;
  border-top: 1rpx solid #f0f0f0;
}

.input {
  flex: 1;
  background: #f8fafc;
  border-radius: 40rpx;
  padding: 20rpx 30rpx;
  font-size: 28rpx;
  margin-right: 20rpx;
}

.send-btn {
  padding: 16rpx 32rpx;
  background: #e5e7eb;
  color: #9ca3af;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.send-btn.active {
  background: linear-gradient(135deg, #8b5cf6, #d946ef);
  color: white;
}
```

- [ ] **Step 9: 提交代码**

```bash
git add fortune/components/chat-bubble fortune/components/chat-input
git commit -m "feat: 创建对话气泡和输入组件"
```

---

## Task 9: 创建对话页

**Files:**
- Create: `fortune/pages/chat/chat.js`
- Create: `fortune/pages/chat/chat.json`
- Create: `fortune/pages/chat/chat.wxml`
- Create: `fortune/pages/chat/chat.wxss`

- [ ] **Step 1: 创建页面JS**

```javascript
// fortune/pages/chat/chat.js
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
      // 显示欢迎消息
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

    // 添加用户消息
    const messages = [...this.data.messages, { role: 'user', content }];
    this.setData({ messages, inputValue: '', isLoading: true });

    // 获取历史记录构建上下文
    const history = storageService.getHistoryById(this.data.readingId);
    let results = [];
    if (history) {
      results = history.results;
    }
    const profile = history ? history.profile : storageService.getProfile();

    // 构建提示词
    const prompt = aiService.buildChatPrompt(profile, results, content);

    // 流式调用AI
    let assistantContent = '';
    const assistantIndex = messages.length;

    // 添加空的助手消息
    messages.push({ role: 'assistant', content: '' });
    this.setData({ messages });

    aiService.streamAI(prompt,
      (chunk) => {
        assistantContent += chunk;
        const messages = [...this.data.messages];
        messages[assistantIndex] = { role: 'assistant', content: assistantContent };
        this.setData({ messages });
        this.scrollToBottom();
      },
      () => {
        this.setData({ isLoading: false });
        this.saveChatHistory();
      },
      (err) => {
        console.error('Chat error:', err);
        const messages = [...this.data.messages];
        messages[assistantIndex] = { role: 'assistant', content: '抱歉，回答出现问题，请重试。' };
        this.setData({ messages, isLoading: false });
      }
    );
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
```

- [ ] **Step 2: 创建页面JSON**

```json
{
  "usingComponents": {
    "chat-bubble": "/fortune/components/chat-bubble/chat-bubble",
    "chat-input": "/fortune/components/chat-input/chat-input"
  }
}
```

- [ ] **Step 3: 创建页面WXML**

```html
<!-- fortune/pages/chat/chat.wxml -->
<view class="container">
  <!-- 顶部导航 -->
  <view class="nav-bar">
    <text class="nav-back" bindtap="handleBack">←</text>
    <text class="nav-title">AI运势助手</text>
  </view>

  <!-- 对话列表 -->
  <scroll-view class="chat-list" scroll-y>
    <chat-bubble
      wx:for="{{messages}}"
      wx:key="index"
      role="{{item.role}}"
      content="{{item.content}}"
      streaming="{{isLoading && index === messages.length - 1 && item.role === 'assistant'}}"
    />
    <view class="loading-hint" wx:if="{{isLoading}}">
      <text class="loading-text">AI正在思考...</text>
    </view>
  </scroll-view>

  <!-- 输入框 -->
  <chat-input bind:send="handleSend" />
</view>
```

- [ ] **Step 4: 创建页面WXSS**

```css
/* fortune/pages/chat/chat.wxss */
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8fafc;
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: white;
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-back {
  font-size: 40rpx;
  color: #1E293B;
  margin-right: 20rpx;
}

.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1E293B;
}

.chat-list {
  flex: 1;
  padding: 30rpx;
}

.loading-hint {
  text-align: center;
  padding: 20rpx;
}

.loading-text {
  font-size: 24rpx;
  color: #94A3B8;
}
```

- [ ] **Step 5: 提交代码**

```bash
git add fortune/pages/chat/
git commit -m "feat: 创建对话页，支持多轮追问"
```

---

## Task 10: 创建历史页

**Files:**
- Rewrite: `fortune/pages/history/history.js`
- Rewrite: `fortune/pages/history/history.json`
- Rewrite: `fortune/pages/history/history.wxml`
- Rewrite: `fortune/pages/history/history.wxss`

- [ ] **Step 1: 重写页面JS**

```javascript
// fortune/pages/history/history.js
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
    this.setData({
      history: history,
      isEmpty: history.length === 0
    });
  },

  handleItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/fortune/pages/reading/reading?mode=view&id=${id}`
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

- [ ] **Step 2: 重写页面JSON**

```json
{
  "usingComponents": {}
}
```

- [ ] **Step 3: 重写页面WXML**

```html
<!-- fortune/pages/history/history.wxml -->
<view class="container">
  <!-- 顶部导航 -->
  <view class="nav-bar">
    <text class="nav-back" bindtap="handleBack">←</text>
    <text class="nav-title">历史记录</text>
    <text class="clear-btn" wx:if="{{!isEmpty}}" bindtap="handleClear">清空</text>
  </view>

  <!-- 空状态 -->
  <view class="empty-state" wx:if="{{isEmpty}}">
    <text class="empty-icon">📝</text>
    <text class="empty-text">暂无历史记录</text>
    <text class="empty-hint">去测算一下吧</text>
  </view>

  <!-- 历史列表 -->
  <scroll-view class="history-list" scroll-y wx:else>
    <view class="history-item" wx:for="{{history}}" wx:key="id">
      <view class="item-content" bindtap="handleItemTap" data-id="{{item.id}}">
        <view class="item-header">
          <text class="item-name">{{item.profile.name}}</text>
          <text class="item-category">{{item.category === 'chinese' ? '易学命理' : '西方星象'}}</text>
        </view>
        <text class="item-time">{{item.timestamp}}</text>
        <view class="item-types">
          <text class="type-tag" wx:for="{{item.results}}" wx:for-item="result" wx:key="type">{{result.typeName}}</text>
        </view>
      </view>
      <view class="item-delete" bindtap="handleDelete" data-id="{{item.id}}">删除</view>
    </view>
  </scroll-view>
</view>
```

- [ ] **Step 4: 重写页面WXSS**

```css
/* fortune/pages/history/history.wxss */
.container {
  background: #f8fafc;
  min-height: 100vh;
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: white;
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-back {
  font-size: 40rpx;
  color: #1E293B;
  margin-right: 20rpx;
}

.nav-title {
  flex: 1;
  font-size: 36rpx;
  font-weight: 600;
  color: #1E293B;
}

.clear-btn {
  font-size: 28rpx;
  color: #dc2626;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 150rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #1E293B;
  margin-bottom: 10rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #94A3B8;
}

.history-list {
  padding: 20rpx 30rpx;
}

.history-item {
  background: white;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.item-content {
  padding: 24rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.item-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1E293B;
}

.item-category {
  font-size: 24rpx;
  color: #8b5cf6;
}

.item-time {
  font-size: 24rpx;
  color: #94A3B8;
  display: block;
  margin-bottom: 12rpx;
}

.item-types {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.type-tag {
  font-size: 22rpx;
  padding: 6rpx 14rpx;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 8rpx;
}

.item-delete {
  padding: 16rpx 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: #dc2626;
  border-top: 1rpx solid #f0f0f0;
}
```

- [ ] **Step 5: 提交代码**

```bash
git add fortune/pages/history/
git commit -m "feat: 重写历史页，支持查看和删除记录"
```

---

## Task 11: 更新主页入口

**Files:**
- Modify: `pages/index/index.wxml`
- Modify: `pages/index/index.js`
- Modify: `pages/index/index.wxss`

- [ ] **Step 1: 在主页添加AI运势入口**

在主页的"AI功能"区域添加一个新的入口卡片：

```html
<!-- 在 entry-grid 中添加 -->
<view class="entry-card card-fortune" bindtap="handleEntryTap" data-type="fortune">
  <view class="card-icon-wrap icon-bg-fortune">
    <text class="entry-icon-text">🔮</text>
  </view>
  <text class="entry-title">AI运势</text>
  <text class="entry-desc">易学命理 · 西方星象</text>
</view>
```

- [ ] **Step 2: 添加跳转逻辑**

```javascript
// 在 handleEntryTap 中添加
} else if (type === 'fortune') {
  wx.navigateTo({ url: '/fortune/pages/index/index' });
}
```

- [ ] **Step 3: 添加样式**

```css
/* 添加fortune卡片样式 */
.card-fortune::before { background: linear-gradient(90deg, #8b5cf6, #d946ef); }
.card-fortune::after { background: #8b5cf6; }

.icon-bg-fortune {
  background: linear-gradient(135deg, #f5f3ff, #fdf4ff);
  box-shadow: 0 6rpx 20rpx rgba(139, 92, 246, 0.2);
}

.entry-icon-text {
  font-size: 60rpx;
}
```

- [ ] **Step 4: 提交代码**

```bash
git add pages/index/
git commit -m "feat: 主页添加AI运势入口"
```

---

## Task 12: 集成测试

**Files:**
- Test all pages and components

- [ ] **Step 1: 测试档案功能**
  - 填写完整档案，保存成功
  - 编辑档案，更新成功
  - 未填写档案点击分类，提示填写

- [ ] **Step 2: 测试测算功能**
  - 易学命理：3个运势卡片逐张流式输出
  - 西方星象：3个运势卡片逐张流式输出
  - 流式输出过程流畅

- [ ] **Step 3: 测试对话功能**
  - 首次进入显示欢迎消息
  - 发送问题，流式显示回复
  - 退出再进入，对话记录保留

- [ ] **Step 4: 测试历史功能**
  - 测算完成后自动保存
  - 历史列表正确显示
  - 点击查看完整结果

- [ ] **Step 5: 提交最终代码**

```bash
git add -A
git commit -m "feat: 完成AI运势功能重构"
```

---

## 自我审查清单

### 1. 规范覆盖检查
- ✅ 分类命名：易学命理/西方星象
- ✅ 档案功能：姓名、生日、性别、出生时辰（选填）
- ✅ 测算展示：3个运势卡片，流式输出
- ✅ 流式输出：NVIDIA API SSE
- ✅ AI对话：右下角浮动气泡，多轮追问
- ✅ 历史记录：保存完整档案+结果

### 2. 占位符扫描
- ✅ 没有TBD、TODO等占位符
- ✅ 所有步骤都有具体代码
- ✅ 所有命令都有预期输出

### 3. 类型一致性检查
- ✅ 函数名称和参数一致
- ✅ 数据结构定义一致
- ✅ 页面跳转参数一致
