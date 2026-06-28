# AI运势功能重构设计 v2

## 概述

对 `fortune/` 微信小程序模块进行整洁重建：用高星开源库替换手写计算逻辑、用 Vant Weapp 重写全部 UI 为沉浸式深色风格、修复 AI/对话已知 bug、移除未使用的开关功能。将原始不可用的原型升级为可上线的命理应用。

## 目标

1. 用 lunar-javascript + iztro 替换手写排盘，AI 解读基于真实计算数据
2. 用 Vant Weapp + mp-html 重写4个页面，沉浸式深色玄学风格
3. 按命理体系区分背景：易学=暮云归，西方=墨夜星河，主页=简约中性
4. 修复8项已知 bug，移除深度思考/联网搜索开关及关联代码
5. 保持原生微信小程序框架，NVIDIA nemotron 模型不换

## 约束

- 原生微信小程序框架（无构建工具）
- NVIDIA API（保留现有 nvapi key，搬至 app.js globalData）
- 中文输出强制执行
- 本地存储（wx.setStorage，无后端）
- 包体 ≤ 2MB（lunar ≈90KB，iztro ≈120KB，Vant 按需引入，mp-html 精简版）

---

## 第1节：架构与文件结构

### 目录结构

```
fortune/
├── app.js                    # 新建：App() 生命周期，全局存放 API key
├── app.wxss                  # 新建：全局样式 + Vant 主题变量 + 三套背景
├── app.json                  # 修改：页面配置 + usingComponents
├── package.json              # 新建：lunar-javascript, iztro, @vant/weapp, mp-html
├── services/
│   ├── calc-service.js       # 新建：封装 lunar+iztro，输出结构化排盘数据
│   ├── ai-service.js         # 修改：注入排盘数据到 prompt，修 bug，删开关
│   └── storage-service.js    # 修改：修时间戳格式化，新增 calcData/html 字段
├── components/
│   ├── chat-bubble/          # 修改：mp-html 渲染 Markdown
│   ├── chat-input/           # 保留
│   ├── fortune-card/         # 修改：van-skeleton 加载态
│   └── profile-form/         # 修改：Vant dialog + picker + field
├── pages/
│   ├── index/                # 重写：简约中性背景 + Vant grid + notice-bar
│   ├── reading/              # 重写：体系背景 + 三步进度 + 玻璃卡串行流式
│   ├── chat/                 # 重写：体系背景 + 卷轴流 + mp-html + 自动滚动
│   └── history/              # 重写：中性背景 + swipe-cell + tag + empty
├── utils/
│   ├── date-utils.js         # 精简：只留 formatDate、get时辰Name
│   └── zodiac-utils.js       # 保留（或委托 lunar）
└── data/                     # 知识库 md 保留作参考，运行时不加载
```

### 删除的死代码

- `services/prompt-service.js`
- `utils/validation-utils.js`
- `data/prompts/chinese_prompt.md`
- `data/prompts/western_prompt.md`

### 依赖流

```
Profile(生日+时辰+性别) → calc-service(lunar/iztro) → 结构化排盘JSON
                                                          ↓
                              ai-service(注入prompt) ← NVIDIA API → 解读文本
                                                          ↓
                              pages(chat/reading) ← mp-html渲染
```

---

## 第2节：计算引擎集成（calc-service.js）

### 模块划分

```javascript
module.exports = {
  calcBazi(profile)             // 八字排盘 → lunar
  calcZiwei(profile)            // 紫微斗数 → iztro
  calcConstellation(profile)    // 星座/生肖 → lunar
  calcYijing()                  // 易经卦象 → 自实现揲蓍
  calcTarot()                   // 塔罗抽牌 → 自实现随机
  buildContext(profile, types)  // 汇总 → AI prompt 片段
}
```

### 各模块实现

| 模块 | 库 | 输入 | 关键输出字段 |
|------|-----|------|-------------|
| 八字 | `lunar.Solar.fromYmdHms()` → `Lunar` | 年月日时辰性别 | 四柱(年月日时)、日主、十神、纳音、五行统计、缺五行、生肖、大运 |
| 紫微 | `iztro.astro.bySolar()` | 同上 | 命宫主星、身宫、十四主星分布、四化、大限、五行局 |
| 星座 | `lunar.Solar` | 生日月日 | 星座名、元素、守护星、日期范围 |
| 易经 | 自实现(50蓍草法) | 无 | 本卦名/卦辞、变卦名/卦辞、动爻位 |
| 塔罗 | 自实现(22大阿尔克那) | 无 | 牌名、正逆位、关键词、元素 |

### 时辰处理（当前 bug 源）

- profile.birthTime 存中文（"子时"），需映射为 `0-23` 时
- 建立映射表（取各时辰中点）：子时→0点、丑时→2点、寅时→4点、卯时→6点、辰时→8点、巳时→10点、午时→12点、未时→14点、申时→16点、酉时→18点、戌时→20点、亥时→22点
- 缺时辰时：八字/紫微返回 `{needTime: true}`，reading 页显示提示而非报错；星座/塔罗不受影响

### AI prompt 注入示例（八字）

```
【排盘数据 · 由 lunar-javascript 计算】
八字：庚午年 己卯月 丙寅日 戊子时
日主：丙火 ｜ 纳音：路旁土
十神：偏印·正官·日主·食神
五行统计：金1 木2 水1 火3 土1（缺水）
生肖：马 ｜ 大运：每10年一运，当前第3运

请基于以上真实排盘结果进行专业解读，禁止编造与排盘数据矛盾的内容。
```

### 错误降级

- 库计算异常 → catch 后返回 `{error: true, summary: '排盘失败'}`，AI 改用纯文本模式
- 时辰缺失 → calcBazi/calcZiwei 返回 `{needTime: true}`

### 依赖体积

- lunar-javascript ≈ 90KB
- iztro ≈ 120KB
- 均在 2MB 限额内充裕

---

## 第3节：Bug 修复清单

| # | Bug | 文件 | 修复方式 |
|---|-----|------|---------|
| 1 | `scrollToBottom()` 定义但从未调用 | `chat.js` | 流式 onChunk 和 onDone 后 setData scrollToView = 最新msg.id |
| 2 | 历史时间戳显示原始数字 | `history.js/wxml` | 用 date-utils.formatDate 格式化为 YYYY-MM-DD HH:mm |
| 3 | 导航路径 `/fortune/` 前缀错误 | `index.js/history.js/chat.js` | 改为相对路径 `/pages/reading/reading` |
| 4 | `temperature: enableThinking ? 0.7 : 0.7` 冗余三元 | `ai-service.js` | 简化为 `0.7` |
| 5 | API key 硬编码在源码 | `ai-service.js` | 移到 app.js globalData，ai-service 从 getApp() 读取 |
| 6 | 缺 app.js / app.wxss | `fortune/` 根目录 | 新建 app.js `App({})` + app.wxss 全局主题 |
| 7 | 文件清除后 fileContent 残留 | `chat.js` | clearFile 同步清 fileContent，doSend 前重置 |
| 8 | 流式5秒兜底降级可能重复回调 | `ai-service.js` | fallbackTriggered 后忽略 onChunk，finishCalled 防重入 |

---

## 第4节：功能删除（深度思考/联网搜索）

| 删除项 | 影响文件 | 处理 |
|--------|---------|------|
| 深度思考开关 | `chat.js`(toggleThinking/enableThinking)、`chat.wxml` | 删除 data 字段、方法、UI |
| 联网搜索开关 | `chat.js`(toggleWebSearch/enableWebSearch)、`chat.wxml` | 删除 data 字段、方法、UI |
| WEB_SEARCH_SUFFIX | `ai-service.js` | 删除常量 |
| buildChatPrompt 的 webSearch 选项 | `ai-service.js` | 删除参数与分支 |
| streamAI/callAI 的 enableThinking 参数 | `ai-service.js` | 删除参数，reasoning_budget 固定为 0 |
| streamReadings 的 enableThinking 传参 | `ai-service.js` | 删除末尾 `false` 参数 |

### 简化后的 AI 调用签名

```javascript
// 从
streamAI(prompt, onChunk, onDone, onError, enableThinking)
// 到
streamAI(prompt, onChunk, onDone, onError)
```

### 保留不动的 AI 逻辑

- NVIDIA nemotron 模型 + nvapi key（搬家到 app.js）
- 串行流式排盘 streamReadings
- 5秒降级兜底（修防重入后保留）
- 90秒超时强制完成

---

## 第5节：UI 设计

### 背景体系（按命理分类）

| 场景 | 背景名 | 配色 | 强调色 |
|------|--------|------|--------|
| 主页 | 简约中性 | 暖灰褐 `#1c1917→#292524` + 左赭橙右靛紫双微光 | 双色融合 |
| 易学命理（reading/chat） | 暮云归 | 暖灰褐 `#1c1917→#44403c→#292524` + 赭橙微光 | `#d97757` |
| 西方星象（reading/chat） | 墨夜星河 | 深蓝黑 `#0a0e27→#1a1f3a→#0d1b2a` + 靛紫微光 | `#818cf8` |
| 历史 | 简约中性 | 同主页 | 卡片左侧色条区分体系 |

### 页面设计

#### 首页 Index（简约中性）

- 顶部：☯ AI命理 + 📜历史
- Hero：今日运势（星座+星级+简评）
- 档案卡：玻璃拟态，头像+姓名+生日性别时辰
- 双入口网格：易学(赭橙边框) / 西方(靛紫边框)
- 历史记录入口

#### 解读页 Reading（体系背景）

- 顶部：返回 + 标题"易学命理·张三" / "西方星象·张三"
- 标签组：生日/性别/时辰（体系色调）
- 时辰提示条（黄色 notice，仅易学且缺时辰时）
- 三步进度条：✓完成 → ●推演中 → ○排队（体系色调）
- 三张玻璃卡：完成态(体系色边框) / 流式中(发光边框+脉冲) / 排队(半透灰)
- 卡片头部显示真实排盘数据（四柱/星座等）
- 底部"AI提问"渐变按钮（体系色渐变）

#### 对话页 Chat（体系背景·卷轴流）

- 顶部：返回 + "深度对话" + 排盘数据副标题（如 BASED ON 庚午·己卯·丙寅·戊子）
- **无思考/搜索开关**
- 开场：☯ + SESSION START
- 用户问题：胶囊标签（渐变紫底 + "问" 前缀）
- AI 回复：左侧光带（体系色渐变）+ 卷轴展开式内容
  - mp-html 渲染 Markdown（标题/列表/引用块/表格）
  - 支持宜忌双栏卡片、引用块高亮
- 轮次分隔：✦ ✦ ✦
- 流式：末尾脉冲点动画 + "推演中"标签
- 底部输入：悬浮玻璃胶囊 + 附件图标 + 渐变发送按钮

#### 历史页 History（中性背景）

- 顶部：返回 + "历史记录" + "清空"
- 卡片列表：左侧体系色条（橙=易学/紫=西方）
- 每卡：图标 + 标题 + 格式化时间戳 + 摘要 + 分类tag
- 左滑删除（van-swipe-cell 露出红色按钮）
- 空态：van-empty

### Vant 主题覆盖（app.wxss）

```css
page {
  --van-primary-color: #d97757;  /* 易学主色，西方页动态覆盖为 #818cf8 */
  --van-success-color: #10b981;
  --van-warning-color: #fbbf24;
  --van-danger-color: #ef4444;
  --van-font-size-md: 28rpx;
  --van-border-radius-md: 16rpx;
  --van-background: transparent;
  --van-card-background: rgba(255,255,255,0.07);
}
```

页面级动态切换强调色：reading/chat 页根据 category 设置 page data 中的 themeColor，wxml 用 style 绑定。

---

## 第6节：数据流与存储

### 存储结构

```javascript
// Profile 档案
{
  name: '张三',
  birthday: '1990-03-15',
  gender: 'male',
  birthTime: '子时'        // 可空，中文时辰名
}

// Reading 记录
{
  id: 'r_1782615697',
  category: 'chinese',      // 'chinese' | 'western'
  profile: { ... },         // 快照
  results: [
    { type: 'bazi', typeName: '八字命理', 
      content: '...',       // AI 解读文本
      calcData: { ... }     // lunar/iztro 原始排盘数据
    }
  ],
  createdAt: 1782615697,
  createdAtFormatted: '2024-06-28 14:30'  // 预格式化
}

// Chat 消息
[
  { role: 'user', content: '...', id: 'msg_xxx' },
  { role: 'assistant', content: '...', id: 'msg_xxx_ai', html: '<p>...</p>' }
]
```

### 存储键

```
fortune_profile          → Profile 对象
fortune_history_list     → [readingId, ...] 列表索引
fortune_history_{id}     → 单条 Reading 记录
fortune_chat_{id}        → 该 reading 的消息数组
fortune_daily_cache      → { date: '2024-06-28', fortune: '...' } 当日运势缓存
```

### 数据流

```
1. 首页 → 选分类 → reading 页
2. reading onLoad: 读 profile → calcService.calcBazi/Ziwei → calcData
3. 串行 streamReadings: buildReadingPrompt(type, profile, calcData) → streamAI → 更新卡片 → 存 results
4. 三项完成 → saveHistory(profile, results, calcData)
5. 点"AI提问" → chat 页
6. chat handleSend: 读 history → buildChatPrompt(profile, results, question) → streamAI → 更新气泡 → saveChatHistory
7. 消息渲染: content(Markdown) → chat-bubble.js 转 HTML → mp-html 渲染
```

### 当日运势缓存（首页 notice-bar）

- 首次进首页：检查 `fortune_daily_cache.date` 是否今天
- 非今天：用星座+calcService 算简要数据，调 AI 生成一句话运势，缓存 24h
- 今天：直接读缓存

### 旧数据兼容

- 旧历史记录无 `calcData`/`createdAtFormatted`/`html` 字段
- 读取时 try/catch，缺失字段降级显示（时间戳用 createdAt 兜底，无 html 则纯文本渲染）
- 不做强制迁移

---

## 第7节：实施顺序

| 阶段 | 内容 | 产出 |
|------|------|------|
| 1. 基建清理 | 新建 app.js/app.wxss/package.json；删死代码；修导航路径、temperature、API key 搬家 | 项目可正常启动 |
| 2. 依赖安装 | npm install lunar-javascript iztro @vant/weapp mp-html；构建 npm；配置 usingComponents | 依赖可用 |
| 3. 计算引擎 | 实现 calc-service.js 全5模块+buildContext；时辰映射；错误降级 | 排盘数据正确 |
| 4. UI 首页+解读页 | index：Vant grid+notice-bar+当日缓存；reading：三步进度+玻璃卡+串行流式+calcData注入 | 核心路径走通 |
| 5. UI 对话页+历史页 | chat：卷轴流+mp-html+自动滚动+删开关；history：时间戳+swipe删除+tag+empty | 对话历史可用 |
| 6. 收尾打磨 | 流式防重入；文件清除bug；旧数据兼容；动画；真机预览 | 全功能可用 |

**依赖**：1→2 必须先完成；3 与 4 可并行；5 依赖 4；6 最后。

---

## 第8节：风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| lunar/iztro 在小程序 `require` 不兼容 | 计算引擎不可用 | 阶段2先写最小测试页验证；不兼容则用打包单文件版本 |
| Vant 包体超 2MB | 上传被拒 | 按需引入组件；mp-html 精简版；阶段2后检查体积 |
| iztro 紫微 API 输出复杂，映射成本高 | 阶段3延期 | 先用 summary 字段，不深挖全量星盘；后续迭代 |
| 深色 + Vant 默认浅色主题冲突 | 视觉割裂 | app.wxss CSS 变量覆盖；卡片背景 `!important` 兜底 |
| AI 流式仍不稳定 | 对话体验差 | 保留5秒降级+90秒超时；本次不换模型 |
| 旧历史数据无新字段 | 历史页报错 | 读取 try/catch + 字段兜底 |

---

## 成功标准

1. lunar/iztro 真实排盘数据出现在 AI prompt 和卡片头部
2. 4个页面全部沉浸式深色风格（主页中性 + 易学暮云归 + 西方墨夜星河）
3. 对话页卷轴流布局 + Markdown 渲染 + 自动滚动正常
4. 深度思考/搜索开关及关联代码完全移除
5. 8项 bug 全部修复
6. 微信开发者工具无报错，真机可预览
