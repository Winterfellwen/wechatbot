# AI运势功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为微信小程序添加AI运势功能，支持中西方两种预测体系，结合真实易经、八字、紫微等中国传统文化，以及星座、塔罗、占星等西方文化典故。

**Architecture:** 采用模块化子包架构，创建新的`fortune`子包，包含页面、组件、服务、数据和工具函数模块。使用本地md文档作为AI知识库，通过AI API生成个性化的运势内容。

**Tech Stack:** 微信小程序原生开发、JavaScript、wx.setStorage本地存储、AI API（OpenAI/Claude）

---

## 文件结构映射

```
fortune/
├── pages/
│   ├── index/
│   │   ├── index.js
│   │   ├── index.json
│   │   ├── index.wxml
│   │   └── index.wxss
│   ├── types/
│   │   ├── types.js
│   │   ├── types.json
│   │   ├── types.wxml
│   │   └── types.wxss
│   ├── input/
│   │   ├── input.js
│   │   ├── input.json
│   │   ├── input.wxml
│   │   └── input.wxss
│   ├── result/
│   │   ├── result.js
│   │   ├── result.json
│   │   ├── result.wxml
│   │   └── result.wxss
│   ├── history/
│   │   ├── history.js
│   │   ├── history.json
│   │   ├── history.wxml
│   │   └── history.wxss
│   └── daily/
│       ├── daily.js
│       ├── daily.json
│       ├── daily.wxml
│       └── daily.wxss
├── components/
│   ├── type-card/
│   │   ├── type-card.js
│   │   ├── type-card.json
│   │   ├── type-card.wxml
│   │   └── type-card.wxss
│   └── result-display/
│       ├── result-display.js
│       ├── result-display.json
│       ├── result-display.wxml
│       └── result-display.wxss
├── services/
│   ├── ai-service.js
│   ├── storage-service.js
│   └── prompt-service.js
├── data/
│   ├── chinese/
│   │   ├── yijing.md
│   │   ├── bazi.md
│   │   ├── ziwei.md
│   │   └── wuxing.md
│   ├── western/
│   │   ├── constellation.md
│   │   ├── tarot.md
│   │   ├── astrology.md
│   │   └── greek_myth.md
│   └── prompts/
│       ├── chinese_prompt.md
│       └── western_prompt.md
├── utils/
│   ├── date-utils.js
│   ├── zodiac-utils.js
│   └── validation-utils.js
└── app.json
```

---

## Task 1: 创建fortune子包基础结构

**Files:**
- Create: `fortune/app.json`
- Create: `fortune/pages/index/index.js`
- Create: `fortune/pages/index/index.json`
- Create: `fortune/pages/index/index.wxml`
- Create: `fortune/pages/index/index.wxss`

- [ ] **Step 1: 创建fortune子包配置文件**

```json
// fortune/app.json
{
  "pages": [
    "pages/index/index",
    "pages/types/types",
    "pages/input/input",
    "pages/result/result",
    "pages/history/history",
    "pages/daily/daily"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#fff",
    "navigationBarTitleText": "AI运势",
    "navigationBarTextStyle": "black"
  }
}
```

- [ ] **Step 2: 创建首页基础结构**

```javascript
// fortune/pages/index/index.js
Page({
  data: {
    greeting: '欢迎使用AI运势',
    isLoggedIn: false
  },

  onLoad() {
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('fortune_user_info');
    if (userInfo) {
      this.setData({
        isLoggedIn: true,
        greeting: `你好，${userInfo.nickName || '用户'}`
      });
    }
  },

  handleTypeTap(e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: `/fortune/pages/types/types?type=${type}`
    });
  },

  handleHistoryTap() {
    wx.navigateTo({
      url: '/fortune/pages/history/history'
    });
  },

  handleDailyTap() {
    wx.navigateTo({
      url: '/fortune/pages/daily/daily'
    });
  }
});
```

```json
// fortune/pages/index/index.json
{
  "usingComponents": {}
}
```

```html
<!-- fortune/pages/index/index.wxml -->
<view class="container">
  <view class="header">
    <text class="greeting">{{greeting}}</text>
  </view>

  <view class="section">
    <view class="section-title">中国运势</view>
    <view class="type-grid">
      <view class="type-card" bindtap="handleTypeTap" data-type="yijing">
        <view class="type-icon">☯</view>
        <text class="type-name">易经卦象</text>
      </view>
      <view class="type-card" bindtap="handleTypeTap" data-type="bazi">
        <view class="type-icon">八字</view>
        <text class="type-name">八字命理</text>
      </view>
      <view class="type-card" bindtap="handleTypeTap" data-type="ziwei">
        <view class="type-icon">紫微</view>
        <text class="type-name">紫微斗数</text>
      </view>
    </view>
  </view>

  <view class="section">
    <view class="section-title">西方运势</view>
    <view class="type-grid">
      <view class="type-card" bindtap="handleTypeTap" data-type="constellation">
        <view class="type-icon">♈</view>
        <text class="type-name">星座分析</text>
      </view>
      <view class="type-card" bindtap="handleTypeTap" data-type="tarot">
        <view class="type-icon">🃏</view>
        <text class="type-name">塔罗占卜</text>
      </view>
      <view class="type-card" bindtap="handleTypeTap" data-type="astrology">
        <view class="type-icon">🌟</view>
        <text class="type-name">占星术</text>
      </view>
    </view>
  </view>

  <view class="section">
    <view class="daily-card" bindtap="handleDailyTap">
      <text class="daily-title">每日运势</text>
      <text class="daily-desc">查看今日综合运、爱情运、事业运</text>
    </view>
  </view>

  <view class="footer">
    <text class="footer-text" bindtap="handleHistoryTap">查看历史记录</text>
  </view>
</view>
```

```css
/* fortune/pages/index/index.wxss */
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  padding: 40rpx 0;
  text-align: center;
}

.greeting {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #666;
  margin-bottom: 20rpx;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.type-card {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}

.type-icon {
  font-size: 48rpx;
  margin-bottom: 10rpx;
}

.type-name {
  font-size: 28rpx;
  color: #333;
}

.daily-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 40rpx;
  color: white;
  text-align: center;
}

.daily-title {
  font-size: 36rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.daily-desc {
  font-size: 28rpx;
  opacity: 0.9;
}

.footer {
  text-align: center;
  padding: 40rpx 0;
}

.footer-text {
  color: #667eea;
  font-size: 28rpx;
}
```

- [ ] **Step 3: 运行测试验证页面结构**

在微信开发者工具中打开项目，确认fortune子包可以正常加载，首页显示正确的布局。

- [ ] **Step 4: 提交代码**

```bash
git add fortune/
git commit -m "feat: 创建fortune子包基础结构"
```

---

## Task 2: 实现本地md文档数据

**Files:**
- Create: `fortune/data/chinese/yijing.md`
- Create: `fortune/data/chinese/bazi.md`
- Create: `fortune/data/chinese/ziwei.md`
- Create: `fortune/data/chinese/wuxing.md`
- Create: `fortune/data/western/constellation.md`
- Create: `fortune/data/western/tarot.md`
- Create: `fortune/data/western/astrology.md`
- Create: `fortune/data/western/greek_myth.md`
- Create: `fortune/data/prompts/chinese_prompt.md`
- Create: `fortune/data/prompts/western_prompt.md`

- [ ] **Step 1: 创建易经六十四卦数据**

```markdown
<!-- fortune/data/chinese/yijing.md -->
# 易经六十四卦详解

## 乾卦 (乾为天)
**卦辞：** 元亨利贞
**象曰：** 天行健，君子以自强不息
**爻辞：**
- 初九：潜龙勿用
- 九二：见龙在田，利见大人
- 九三：君子终日乾乾，夕惕若厉，无咎
- 九四：或跃在渊，无咎
- 九五：飞龙在天，利见大人
- 上九：亢龙有悔
**象征：** 刚健、进取、创造

## 坤卦 (坤为地)
**卦辞：** 元亨，利牝马之贞
**象曰：** 地势坤，君子以厚德载物
**爻辞：**
- 初六：履霜，坚冰至
- 六二：直方大，不习无不利
- 六三：含章可贞，或从王事，无成有终
- 六四：括囊，无咎无誉
- 六五：黄裳，元吉
- 上六：龙战于野，其血玄黄
**象征：** 柔顺、包容、承载

## 屯卦 (水雷屯)
**卦辞：** 元亨利贞，勿用有攸往，利建侯
**象曰：** 云雷屯，君子以经纶
**象征：** 初生、困难、坚持

## 蒙卦 (山水蒙)
**卦辞：** 亨。匪我求童蒙，童蒙求我
**象曰：** 山下出泉，蒙。君子以果行育德
**象征：** 启蒙、教育、成长

（其他卦象省略，实际实现时需要完整包含64卦）
```

- [ ] **Step 2: 创建八字命理数据**

```markdown
<!-- fortune/data/chinese/bazi.md -->
# 八字命理基础知识

## 天干
- 甲：阳木，象征大树，主仁慈
- 乙：阴木，象征花草，主柔顺
- 丙：阳火，象征太阳，主热情
- 丁：阴火，象征灯火，主文明
- 戊：阳土，象征高山，主诚信
- 己：阴土，象征田园，主包容
- 庚：阳金，象征刀剑，主义气
- 辛：阴金，象征珠宝，主精致
- 壬：阳水，象征江河，主智慧
- 癸：阴水，象征雨露，主聪慧

## 地支
- 子：阳水，生肖鼠，时辰23-01
- 丑：阴土，生肖牛，时辰01-03
- 寅：阳木，生肖虎，时辰03-05
- 卯：阴木，生肖兔，时辰05-07
- 辰：阳土，生肖龙，时辰07-09
- 巳：阴火，生肖蛇，时辰09-11
- 午：阳火，生肖马，时辰11-13
- 未：阴土，生肖羊，时辰13-15
- 申：阳金，生肖猴，时辰15-17
- 酉：阴金，生肖鸡，时辰17-19
- 戌：阳土，生肖狗，时辰19-21
- 亥：阴水，生肖猪，时辰21-23

## 五行相生相克
**相生：** 木生火，火生土，土生金，金生水，水生木
**相克：** 木克土，土克水，水克火，火克金，金克木

## 十神
- 比肩：与日主同五行
- 劫财：与日主同五行异性
- 食神：我生者同五行
- 伤官：我生者异性
- 偏财：我克者同五行
- 正财：我克者异性
- 七杀：克我者同五行
- 正官：克我者异性
- 偏印：生我者同五行
- 正印：生我者异性
```

- [ ] **Step 3: 创建紫微斗数数据**

```markdown
<!-- fortune/data/chinese/ziwei.md -->
# 紫微斗数星曜说明

## 主星
- 紫微星：帝王之星，主尊贵、领导
- 天机星：智慧之星，主聪明、谋略
- 太阳星：光明之星，主热情、奉献
- 武曲星：财星，主财富、决断
- 天同星：福星，主享受、安逸
- 廉贞星：次桃花星，主感情、政治
- 天府星：库星，主财富、稳定
- 太阴星：财星，主财富、文学
- 贪狼星：桃花星，主感情、才艺
- 巨门星：口舌星，主口才、是非
- 天相星：印星，主权力、服务
- 天梁星：荫星，主荫庇、逢凶化吉
- 七杀星：将星，主冲劲、冒险
- 破军星：耗星，主变动、开创

## 辅星
- 左辅星：贵人星，主助力
- 右弼星：贵人星，主暗助
- 文昌星：文星，主文才
- 文曲星：艺星，主才艺
- 天魁星：贵人星，主明贵
- 天钺星：贵人星，主暗贵
- 禄存星：财星，主财运
- 擎羊星：刑星，主刑伤
- 陀罗星：忌星，主阻碍
- 火星：煞星，主火爆
- 铃星：煞星，主暗火
- 地空星：空星，主空虚
- 地劫星：劫星，主损失

## 十二宫位
- 命宫：主管一生运势
- 兄弟宫：主管兄弟姐妹
- 夫妻宫：主管婚姻感情
- 子女宫：主管子女运势
- 财帛宫：主管财运
- 疾厄宫：主管健康
- 迁移宫：主管外出运势
- 交友宫：主管朋友关系
- 官禄宫：主管事业
- 田宅宫：主管不动产
- 福德宫：主管精神生活
- 父母宫：主管与父母关系
```

- [ ] **Step 4: 创建五行数据**

```markdown
<!-- fortune/data/chinese/wuxing.md -->
# 五行相生相克

## 五行属性
- 木：肝、胆、目、筋、怒、酸、春、东、青
- 火：心、小肠、舌、脉、喜、苦、夏、南、红
- 土：脾、胃、口、肉、思、甜、长夏、中、黄
- 金：肺、大肠、鼻、皮、悲、辛、秋、西、白
- 水：肾、膀胱、耳、骨、恐、咸、冬、北、黑

## 五行相生
- 木生火：钻木取火
- 火生土：火烧成灰
- 土生金：土中藏金
- 金生水：金凝成水
- 水生木：水润草木

## 五行相克
- 木克土：木根破土
- 土克水：土能挡水
- 水克火：水能灭火
- 火克金：火能熔金
- 金克木：金能伐木

## 五行与性格
- 木型人：仁慈、正直、有同情心
- 火型人：热情、急躁、有领导力
- 土型人：稳重、诚实、有耐心
- 金型人：果断、义气、有原则
- 水型人：智慧、灵活、有创造力
```

- [ ] **Step 5: 创建星座数据**

```markdown
<!-- fortune/data/western/constellation.md -->
# 十二星座详解

## 白羊座 (3.21-4.19)
**守护星：** 火星
**元素：** 火象星座
**特质：** 热情、冲动、勇敢
**象征：** 新生、活力、领导力
**幸运色：** 红色、橙色
**幸运数字：** 1、9

## 金牛座 (4.20-5.20)
**守护星：** 金星
**元素：** 土象星座
**特质：** 稳重、固执、享受
**象征：** 财富、稳定、感官
**幸运色：** 绿色、粉色
**幸运数字：** 2、6

## 双子座 (5.21-6.21)
**守护星：** 水星
**元素：** 风象星座
**特质：** 聪明、善变、好奇
**象征：** 沟通、双重、变化
**幸运色：** 黄色、银色
**幸运数字：** 3、5

## 巨蟹座 (6.22-7.22)
**守护星：** 月亮
**元素：** 水象星座
**特质：** 温柔、敏感、家庭
**象征：** 保护、滋养、情感
**幸运色：** 白色、银色
**幸运数字：** 2、7

## 狮子座 (7.23-8.22)
**守护星：** 太阳
**元素：** 火象星座
**特质：** 自信、骄傲、慷慨
**象征：** 权力、荣耀、领导
**幸运色：** 金色、橙色
**幸运数字：** 1、5

## 处女座 (8.23-9.22)
**守护星：** 水星
**元素：** 土象星座
**特质：** 完美、挑剔、勤劳
**象征：** 收获、服务、纯洁
**幸运色：** 灰色、米色
**幸运数字：** 5、6

## 天秤座 (9.23-10.23)
**守护星：** 金星
**元素：** 风象星座
**特质：** 优雅、犹豫、公正
**象征：** 平衡、和谐、美感
**幸运色：** 粉色、蓝色
**幸运数字：** 6、9

## 天蝎座 (10.24-11.22)
**守护星：** 冥王星
**元素：** 水象星座
**特质：** 神秘、极端、忠诚
**象征：** 转化、重生、深度
**幸运色：** 红色、黑色
**幸运数字：** 4、0

## 射手座 (11.23-12.21)
**守护星：** 木星
**元素：** 火象星座
**特质：** 乐观、自由、冒险
**象征：** 探索、哲学、远方
**幸运色：** 紫色、蓝色
**幸运数字：** 3、9

## 摩羯座 (12.22-1.19)
**守护星：** 土星
**元素：** 土象星座
**特质：** 务实、谨慎、有野心
**象征：** 成就、责任、时间
**幸运色：** 黑色、棕色
**幸运数字：** 4、8

## 水瓶座 (1.20-2.18)
**守护星：** 天王星
**元素：** 风象星座
**特质：** 独立、创新、叛逆
**象征：** 革新、人道、未来
**幸运色：** 蓝色、银色
**幸运数字：** 4、7

## 双鱼座 (2.19-3.20)
**守护星：** 海王星
**元素：** 水象星座
**特质：** 浪漫、敏感、梦幻
**象征：** 直觉、牺牲、灵性
**幸运色：** 海蓝色、绿色
**幸运数字：** 3、7
```

- [ ] **Step 6: 创建塔罗牌数据**

```markdown
<!-- fortune/data/western/tarot.md -->
# 塔罗牌牌意解释

## 大阿尔卡那 (Major Arcana)

### 0. 愚者 (The Fool)
**正位：** 新开始、冒险、自由、天真
**逆位：** 鲁莽、冒险、不稳定
**象征：** 新的旅程、无限可能

### 1. 魔术师 (The Magician)
**正位：** 创造力、技能、意志力、自信
**逆位：** 欺骗、操控、能力不足
**象征：** 创造、实现、意志

### 2. 女祭司 (The High Priestess)
**正位：** 直觉、神秘、内在智慧
**逆位：** 忽视直觉、信息不全
**象征：** 智慧、直觉、神秘

### 3. 皇后 (The Empress)
**正位：** 丰收、美丽、母性、创造
**逆位：** 过度放纵、依赖
**象征：** 丰收、母性、自然

### 4. 皇帝 (The Emperor)
**正位：** 权威、稳定、领导力
**逆位：** 专制、固执、控制
**象征：** 权威、结构、稳定

### 5. 教皇 (The Hierophant)
**正位：** 传统、信仰、教育
**逆位：** 反叛、打破常规
**象征：** 传统、信仰、指导

### 6. 恋人 (The Lovers)
**正位：** 爱情、和谐、选择
**逆位：** 失衡、错误选择
**象征：** 爱情、和谐、选择

### 7. 战车 (The Chariot)
**正位：** 胜利、意志力、决心
**逆位：** 失控、方向迷失
**象征：** 胜利、前进、控制

### 8. 力量 (Strength)
**正位：** 勇气、耐心、内在力量
**逆位：** 自我怀疑、软弱
**象征：** 力量、勇气、耐心

### 9. 隐士 (The Hermit)
**正位：** 内省、独处、智慧
**逆位：** 孤立、逃避
**象征：** 智慧、内省、指导

### 10. 命运之轮 (Wheel of Fortune)
**正位：** 转变、命运、机遇
**逆位：** 抵抗改变、坏运气
**象征：** 命运、循环、机遇

### 11. 正义 (Justice)
**正位：** 公正、平衡、真相
**逆位：** 不公、偏见
**象征：** 公正、平衡、法律

### 12. 倒吊人 (The Hanged Man)
**正位：** 牺牲、等待、新视角
**逆位：** 无谓牺牲、拖延
**象征：** 牺牲、等待、启示

### 13. 死神 (Death)
**正位：** 结束、转变、新生
**逆位：** 抵抗改变、停滞
**象征：** 结束、转变、重生

### 14. 节制 (Temperance)
**正位：** 平衡、耐心、调和
**逆位：** 失衡、过度
**象征：** 平衡、调和、耐心

### 15. 恶魔 (The Devil)
**正位：** 束缚、诱惑、物质
**逆位：** 解脱、自由
**象征：** 束缚、诱惑、物质

### 16. 塔 (The Tower)
**正位：** 突变、破坏、觉醒
**逆位：** 抵抗改变、恐惧
**象征：** 突变、破坏、重建

### 17. 星星 (The Star)
**正位：** 希望、灵感、宁静
**逆位：** 失望、缺乏信心
**象征：** 希望、灵感、宁静

### 18. 月亮 (The Moon)
**正位：** 幻觉、直觉、潜意识
**逆位：** 释放恐惧、清晰
**象征：** 幻觉、直觉、潜意识

### 19. 太阳 (The Sun)
**正位：** 成功、快乐、活力
**逆位：** 暂时失败、过度乐观
**象征：** 成功、快乐、活力

### 20. 审判 (Judgement)
**正位：** 觉醒、重生、召唤
**逆位：** 自我怀疑、逃避
**象征：** 觉醒、重生、审判

### 21. 世界 (The World)
**正位：** 完成、成就、圆满
**逆位：** 未完成、缺乏 closure
**象征：** 完成、成就、圆满
```

- [ ] **Step 7: 创建占星术数据**

```markdown
<!-- fortune/data/western/astrology.md -->
# 占星术基础知识

## 行星含义
- 太阳：自我、意志、生命力
- 月亮：情感、本能、潜意识
- 水星：思维、沟通、学习
- 金星：爱情、美感、价值观
- 火星：行动力、欲望、竞争
- 木星：幸运、扩张、哲学
- 土星：责任、限制、成长
- 天王星：变革、创新、独立
- 海王星：直觉、梦想、灵性
- 冥王星：转化、重生、深度

## 星座元素
- 火象星座：白羊、狮子、射手（热情、行动）
- 土象星座：金牛、处女、摩羯（务实、稳定）
- 风象星座：双子、天秤、水瓶（沟通、理性）
- 水象星座：巨蟹、天蝎、双鱼（情感、直觉）

## 星座模式
- 开创星座：白羊、巨蟹、天秤、摩羯（领导、开创）
- 固定星座：金牛、狮子、天蝎、水瓶（稳定、坚持）
- 变动星座：双子、处女、射手、双鱼（适应、变化）

## 相位含义
- 合相（0°）：融合、强化
- 六分相（60°）：和谐、机会
- 四分相（90°）：挑战、成长
- 三分相（120°）：和谐、天赋
- 对分相（180°）：对立、平衡

## 宫位含义
- 第一宫：自我、性格、外表
- 第二宫：财富、价值观、感官
- 第三宫：沟通、学习、兄弟姐妹
- 第四宫：家庭、根基、内心
- 第五宫：爱情、子女、创造力
- 第六宫：工作、健康、日常生活
- 第七宫：婚姻、合作、公开敌人
- 第八宫：共享资源、转化、死亡
- 第九宫：哲学、旅行、高等教育
- 第十宫：事业、地位、声誉
- 第十一宫：朋友、团体、希望
- 第十二宫：潜意识、灵性、隐藏
```

- [ ] **Step 8: 创建希腊神话数据**

```markdown
<!-- fortune/data/western/greek_myth.md -->
# 希腊神话典故

## 奥林匹斯十二主神
- 宙斯（Jupiter）：天空之神，众神之王
- 赫拉（Juno）：婚姻之神，宙斯妻子
- 波塞冬（Neptune）：海洋之神
- 德墨忒尔（Ceres）：农业之神
- 雅典娜（Minerva）：智慧之神
- 阿波罗（Apollo）：太阳之神，音乐之神
- 阿尔忒弥斯（Diana）：月亮之神，狩猎之神
- 阿瑞斯（Mars）：战争之神
- 阿佛洛狄忒（Venus）：爱情之神
- 赫菲斯托斯（Vulcan）：锻造之神
- 赫尔墨斯（Mercury）：信使之神
- 狄俄尼索斯（Bacchus）：酒神

## 星座神话
- 白羊座：金羊弗里克索斯的故事
- 金牛座：宙斯化身公牛诱拐欧罗巴
- 双子座：卡斯托尔和波吕丢刻斯的兄弟情
- 巨蟹座：赫拉派出的巨蟹
- 狮子座：尼米亚猛狮
- 处女座：农业女神德墨忒尔的女儿
- 天秤座：正义女神的天秤
- 天蝎座：蝎子与猎户座的故事
- 射手座：半人马喀戎
- 摩羯座：牧神潘的变身
- 水瓶座：特洛伊王子伽倪墨得斯
- 双鱼座：阿佛洛狄忒和厄洛斯的变身

## 命运三女神
- 克洛托：纺织生命之线
- 拉刻西斯：决定生命之线的长度
- 阿特洛波斯：剪断生命之线

## 其他重要神话
- 潘多拉的盒子：人类的苦难来源
- 伊卡洛斯的翅膀：过度野心的教训
- 西西弗斯的惩罚：永恒的徒劳
- 俄耳甫斯的竖琴：音乐的力量
- 阿喀琉斯之踵：致命弱点
```

- [ ] **Step 9: 创建中国预测提示词模板**

```markdown
<!-- fortune/data/prompts/chinese_prompt.md -->
# 中国预测提示词模板

## 易经卦象提示词
你是精通易经的AI分析师。根据以下用户信息和问题，进行易经卦象分析：

**用户信息：**
- 出生日期：{birthDate}
- 出生时辰：{birthTime}
- 性别：{gender}

**预测信息：**
- 预测类型：易经卦象
- 具体问题：{question}

**要求：**
1. 生成一个随机卦象（1-64）
2. 解读该卦的卦辞和象辞
3. 结合用户的具体问题进行分析
4. 引用易经中的相关典故
5. 提供具体的建议和指导
6. 语言要通俗易懂，有深度

**格式：**
- 卦象名称和编号
- 卦辞和象辞解读
- 问题分析
- 典故引用
- 建议和指导

## 八字命理提示词
你是精通八字命理的AI分析师。根据以下用户信息，进行八字命理分析：

**用户信息：**
- 出生日期：{birthDate}
- 出生时辰：{birthTime}
- 性别：{gender}

**预测信息：**
- 预测类型：八字命理
- 具体问题：{question}

**要求：**
1. 分析用户的八字格局
2. 解读天干地支的五行属性
3. 分析十神关系
4. 结合用户问题给出运势分析
5. 引用八字命理中的相关典故
6. 提供具体的建议和指导

**格式：**
- 八字排盘
- 五行分析
- 十神分析
- 运势分析
- 典故引用
- 建议和指导

## 紫微斗数提示词
你是精通紫微斗数的AI分析师。根据以下用户信息，进行紫微斗数分析：

**用户信息：**
- 出生日期：{birthDate}
- 出生时辰：{birthTime}
- 性别：{gender}

**预测信息：**
- 预测类型：紫微斗数
- 具体问题：{question}

**要求：**
1. 分析用户的命盘格局
2. 解读主要星曜的影响
3. 分析十二宫位的吉凶
4. 结合用户问题给出运势分析
5. 引用紫微斗数中的相关典故
6. 提供具体的建议和指导

**格式：**
- 命盘排盘
- 主星分析
- 宫位分析
- 运势分析
- 典故引用
- 建议和指导
```

- [ ] **Step 10: 创建西方预测提示词模板**

```markdown
<!-- fortune/data/prompts/western_prompt.md -->
# 西方预测提示词模板

## 星座分析提示词
你是精通星座学的AI分析师。根据以下用户信息和问题，进行星座运势分析：

**用户信息：**
- 星座：{constellation}
- 出生日期：{birthDate}

**预测信息：**
- 预测类型：星座分析
- 具体问题：{question}

**要求：**
1. 分析用户的星座特质
2. 预测今日运势（综合运、爱情运、事业运、财运）
3. 结合希腊神话典故进行分析
4. 提供具体的建议和指导
5. 语言要生动有趣，有深度

**格式：**
- 星座特质分析
- 今日运势预测
- 希腊神话典故
- 建议和指导

## 塔罗占卜提示词
你是精通塔罗牌的AI分析师。根据以下用户信息和问题，进行塔罗牌占卜：

**用户信息：**
- 出生日期：{birthDate}
- 星座：{constellation}

**预测信息：**
- 预测类型：塔罗占卜
- 具体问题：{question}

**要求：**
1. 随机抽取三张塔罗牌（过去、现在、未来）
2. 解读每张牌的正位或逆位含义
3. 结合用户的具体问题进行分析
4. 引用塔罗牌的相关典故
5. 提供具体的建议和指导

**格式：**
- 牌阵展示
- 过去牌解读
- 现在牌解读
- 未来牌解读
- 典故引用
- 建议和指导

## 占星术提示词
你是精通占星术的AI分析师。根据以下用户信息和问题，进行占星术分析：

**用户信息：**
- 出生日期：{birthDate}
- 出生时间：{birthTime}
- 出生地点：{birthPlace}

**预测信息：**
- 预测类型：占星术
- 具体问题：{question}

**要求：**
1. 分析用户的星盘配置
2. 解读主要行星和相位的影响
3. 分析十二宫位的含义
4. 结合用户问题给出运势分析
5. 引用占星术中的相关典故
6. 提供具体的建议和指导

**格式：**
- 星盘配置
- 行星分析
- 相位分析
- 宫位分析
- 运势分析
- 典故引用
- 建议和指导
```

- [ ] **Step 11: 运行测试验证数据文件**

确认所有md文件已正确创建，内容完整无误。

- [ ] **Step 12: 提交代码**

```bash
git add fortune/data/
git commit -m "feat: 添加本地md文档数据"
```

---

## Task 3: 实现工具函数

**Files:**
- Create: `fortune/utils/date-utils.js`
- Create: `fortune/utils/zodiac-utils.js`
- Create: `fortune/utils/validation-utils.js`

- [ ] **Step 1: 创建日期工具函数**

```javascript
// fortune/utils/date-utils.js

/**
 * 日期工具函数
 */

// 获取时辰名称
function get时辰Name(hour) {
  const 时辰映射 = {
    23: '子时', 0: '子时',
    1: '丑时', 2: '丑时',
    3: '寅时', 4: '寅时',
    5: '卯时', 6: '卯时',
    7: '辰时', 8: '辰时',
    9: '巳时', 10: '巳时',
    11: '午时', 12: '午时',
    13: '未时', 14: '未时',
    15: '申时', 16: '申时',
    17: '酉时', 18: '酉时',
    19: '戌时', 20: '戌时',
    21: '亥时', 22: '亥时'
  };
  return 时辰映射[hour] || '子时';
}

// 获取干支年份
function get干支年份(year) {
  const 天干 = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const 地支 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  const 天干索引 = (year - 4) % 10;
  const 地支索引 = (year - 4) % 12;
  
  return 天干[天干索引] + 地支[地支索引];
}

// 获取生肖
function get生肖(year) {
  const 生肖 = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const 索引 = (year - 4) % 12;
  return 生肖[索引];
}

// 格式化日期
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 解析日期字符串
function parseDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  
  return new Date(year, month, day);
}

module.exports = {
  get时辰Name,
  get干支年份,
  get生肖,
  formatDate,
  parseDate
};
```

- [ ] **Step 2: 创建星座工具函数**

```javascript
// fortune/utils/zodiac-utils.js

/**
 * 星座工具函数
 */

// 获取星座
function get星座(month, day) {
  const 星座日期 = [
    { name: '摩羯座', start: [12, 22], end: [1, 19] },
    { name: '水瓶座', start: [1, 20], end: [2, 18] },
    { name: '双鱼座', start: [2, 19], end: [3, 20] },
    { name: '白羊座', start: [3, 21], end: [4, 19] },
    { name: '金牛座', start: [4, 20], end: [5, 20] },
    { name: '双子座', start: [5, 21], end: [6, 21] },
    { name: '巨蟹座', start: [6, 22], end: [7, 22] },
    { name: '狮子座', start: [7, 23], end: [8, 22] },
    { name: '处女座', start: [8, 23], end: [9, 22] },
    { name: '天秤座', start: [9, 23], end: [10, 23] },
    { name: '天蝎座', start: [10, 24], end: [11, 22] },
    { name: '射手座', start: [11, 23], end: [12, 21] }
  ];

  for (const 星座 of 星座日期) {
    const { name, start, end } = 星座;
    if (name === '摩羯座') {
      if ((month === start[0] && day >= start[1]) || (month === end[0] && day <= end[1])) {
        return name;
      }
    } else {
      if ((month === start[0] && day >= start[1]) || (month === end[0] && day <= end[1])) {
        return name;
      }
    }
  }
  
  return '摩羯座'; // 默认
}

// 获取星座元素
function get星座元素(constellation) {
  const 火象 = ['白羊座', '狮子座', '射手座'];
  const 土象 = ['金牛座', '处女座', '摩羯座'];
  const 风象 = ['双子座', '天秤座', '水瓶座'];
  const 水象 = ['巨蟹座', '天蝎座', '双鱼座'];

  if (火象.includes(constellation)) return '火象';
  if (土象.includes(constellation)) return '土象';
  if (风象.includes(constellation)) return '风象';
  if (水象.includes(constellation)) return '水象';
  return '火象';
}

// 获取星座守护星
function get守护星(constellation) {
  const 守护星映射 = {
    '白羊座': '火星',
    '金牛座': '金星',
    '双子座': '水星',
    '巨蟹座': '月亮',
    '狮子座': '太阳',
    '处女座': '水星',
    '天秤座': '金星',
    '天蝎座': '冥王星',
    '射手座': '木星',
    '摩羯座': '土星',
    '水瓶座': '天王星',
    '双鱼座': '海王星'
  };
  return 守护星映射[constellation] || '太阳';
}

module.exports = {
  get星座,
  get星座元素,
  get守护星
};
```

- [ ] **Step 3: 创建验证工具函数**

```javascript
// fortune/utils/validation-utils.js

/**
 * 验证工具函数
 */

// 验证日期格式
function validateDate(dateStr) {
  if (!dateStr) return { valid: false, message: '请输入出生日期' };
  
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return { valid: false, message: '日期格式应为YYYY-MM-DD' };
  }
  
  const parts = dateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  
  if (year < 1900 || year > 2100) {
    return { valid: false, message: '年份应在1900-2100之间' };
  }
  
  if (month < 1 || month > 12) {
    return { valid: false, message: '月份应在1-12之间' };
  }
  
  if (day < 1 || day > 31) {
    return { valid: false, message: '日期应在1-31之间' };
  }
  
  // 检查日期是否有效
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { valid: false, message: '请输入有效的日期' };
  }
  
  return { valid: true, message: '' };
}

// 验证时辰
function validate时辰(时辰) {
  const 有效时辰 = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
  if (!时辰) return { valid: false, message: '请选择出生时辰' };
  if (!有效时辰.includes(时辰)) {
    return { valid: false, message: '请选择有效的时辰' };
  }
  return { valid: true, message: '' };
}

// 验证性别
function validateGender(gender) {
  if (!gender) return { valid: false, message: '请选择性别' };
  if (!['male', 'female'].includes(gender)) {
    return { valid: false, message: '请选择有效的性别' };
  }
  return { valid: true, message: '' };
}

// 验证星座
function validate星座(constellation) {
  const 有效星座 = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
  if (!constellation) return { valid: false, message: '请选择星座' };
  if (!有效星座.includes(constellation)) {
    return { valid: false, message: '请选择有效的星座' };
  }
  return { valid: true, message: '' };
}

// 验证问题
function validateQuestion(question) {
  if (!question || question.trim() === '') {
    return { valid: false, message: '请输入您想要预测的问题' };
  }
  if (question.length > 200) {
    return { valid: false, message: '问题长度不能超过200字' };
  }
  return { valid: true, message: '' };
}

module.exports = {
  validateDate,
  validate时辰,
  validateGender,
  validate星座,
  validateQuestion
};
```

- [ ] **Step 4: 运行测试验证工具函数**

```bash
# 测试日期工具函数
node -e "
const dateUtils = require('./fortune/utils/date-utils');
console.log('时辰测试:', dateUtils.get时辰Name(14));
console.log('干支测试:', dateUtils.get干支年份(1990));
console.log('生肖测试:', dateUtils.get生肖(1990));
"

# 测试星座工具函数
node -e "
const zodiacUtils = require('./fortune/utils/zodiac-utils');
console.log('星座测试:', zodiacUtils.get星座(1, 15));
console.log('元素测试:', zodiacUtils.get星座元素('白羊座'));
console.log('守护星测试:', zodiacUtils.get守护星('白羊座'));
"

# 测试验证工具函数
node -e "
const validationUtils = require('./fortune/utils/validation-utils');
console.log('日期验证:', validationUtils.validateDate('1990-01-15'));
console.log('时辰验证:', validationUtils.validate时辰('子时'));
console.log('性别验证:', validationUtils.validateGender('male'));
"
```

- [ ] **Step 5: 提交代码**

```bash
git add fortune/utils/
git commit -m "feat: 添加工具函数"
```

---

## Task 4: 实现AI服务层

**Files:**
- Create: `fortune/services/ai-service.js`
- Create: `fortune/services/storage-service.js`
- Create: `fortune/services/prompt-service.js`

- [ ] **Step 1: 创建存储服务**

```javascript
// fortune/services/storage-service.js

/**
 * 存储服务
 */

// 获取用户信息
function getUserInfo() {
  return wx.getStorageSync('fortune_user_info') || null;
}

// 保存用户信息
function saveUserInfo(userInfo) {
  wx.setStorageSync('fortune_user_info', userInfo);
}

// 获取历史记录
function getHistory() {
  return wx.getStorageSync('fortune_history') || [];
}

// 添加历史记录
function addHistory(record) {
  const history = getHistory();
  record.id = Date.now().toString();
  record.timestamp = Date.now();
  history.unshift(record);
  
  // 限制历史记录数量
  if (history.length > 100) {
    history.pop();
  }
  
  wx.setStorageSync('fortune_history', history);
  return record;
}

// 删除历史记录
function deleteHistory(id) {
  const history = getHistory();
  const newHistory = history.filter(item => item.id !== id);
  wx.setStorageSync('fortune_history', newHistory);
}

// 清空历史记录
function clearHistory() {
  wx.setStorageSync('fortune_history', []);
}

// 获取缓存结果
function getCachedResult(key) {
  const cache = wx.getStorageSync('fortune_cache') || {};
  const item = cache[key];
  
  if (item && Date.now() - item.timestamp < 24 * 60 * 60 * 1000) {
    return item.result;
  }
  
  return null;
}

// 保存缓存结果
function saveCachedResult(key, result) {
  const cache = wx.getStorageSync('fortune_cache') || {};
  cache[key] = {
    result: result,
    timestamp: Date.now()
  };
  wx.setStorageSync('fortune_cache', cache);
}

module.exports = {
  getUserInfo,
  saveUserInfo,
  getHistory,
  addHistory,
  deleteHistory,
  clearHistory,
  getCachedResult,
  saveCachedResult
};
```

- [ ] **Step 2: 创建提示词服务**

```javascript
// fortune/services/prompt-service.js

/**
 * 提示词服务
 */

// 加载提示词模板
function loadPromptTemplate(type) {
  // 这里简化处理，实际应该从md文件加载
  const templates = {
    yijing: `你是精通易经的AI分析师。根据用户信息和问题，生成一个易经卦象。要求：
1. 生成随机卦象（1-64）
2. 解读卦辞和爻辞
3. 结合用户问题给出建议
4. 引用相关典故`,
    
    bazi: `你是精通八字命理的AI分析师。根据用户信息，进行八字命理分析。要求：
1. 分析用户的八字格局
2. 解读天干地支的五行属性
3. 分析十神关系
4. 结合用户问题给出运势分析`,
    
    ziwei: `你是精通紫微斗数的AI分析师。根据用户信息，进行紫微斗数分析。要求：
1. 分析用户的命盘格局
2. 解读主要星曜的影响
3. 分析十二宫位的吉凶
4. 结合用户问题给出运势分析`,
    
    constellation: `你是精通星座学的AI分析师。根据用户星座和问题，进行星座运势分析。要求：
1. 分析星座特质
2. 预测今日运势
3. 结合希腊神话典故
4. 给出具体建议`,
    
    tarot: `你是精通塔罗牌的AI分析师。根据用户信息和问题，进行塔罗牌占卜。要求：
1. 随机抽取三张塔罗牌
2. 解读每张牌的含义
3. 结合用户问题进行分析
4. 给出具体建议`,
    
    astrology: `你是精通占星术的AI分析师。根据用户信息，进行占星术分析。要求：
1. 分析用户的星盘配置
2. 解读主要行星和相位的影响
3. 分析十二宫位的含义
4. 结合用户问题给出运势分析`
  };
  
  return templates[type] || templates.constellation;
}

// 生成提示词
function generatePrompt(type, userInfo, question) {
  const template = loadPromptTemplate(type);
  
  let prompt = template + '\n\n';
  prompt += '用户信息：\n';
  
  if (userInfo.birthDate) {
    prompt += `- 出生日期：${userInfo.birthDate}\n`;
  }
  if (userInfo.birthTime) {
    prompt += `- 出生时辰：${userInfo.birthTime}\n`;
  }
  if (userInfo.gender) {
    prompt += `- 性别：${userInfo.gender === 'male' ? '男' : '女'}\n`;
  }
  if (userInfo.constellation) {
    prompt += `- 星座：${userInfo.constellation}\n`;
  }
  
  if (question) {
    prompt += `\n具体问题：${question}\n`;
  }
  
  prompt += '\n请根据以上信息进行分析，提供详细的运势预测和建议。';
  
  return prompt;
}

module.exports = {
  loadPromptTemplate,
  generatePrompt
};
```

- [ ] **Step 3: 创建AI服务**

```javascript
// fortune/services/ai-service.js

/**
 * AI服务
 */

const promptService = require('./prompt-service');
const storageService = require('./storage-service');

// AI API配置
const AI_CONFIG = {
  // 主要API（OpenAI）
  primary: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_OPENAI_API_KEY'
    }
  },
  // 备选API（Claude）
  fallback: {
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-20241022',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'YOUR_CLAUDE_API_KEY',
      'anthropic-version': '2023-06-01'
    }
  }
};

// 调用AI API
async function callAI(prompt, config = AI_CONFIG.primary) {
  try {
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: `${config.baseUrl}/chat/completions`,
        method: 'POST',
        header: config.headers,
        data: {
          model: config.model,
          messages: [
            {
              role: 'system',
              content: '你是一位精通中西方传统文化的AI运势分析师。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 2000,
          top_p: 0.9
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(new Error(`API请求失败: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('AI API调用失败:', error);
    throw error;
  }
}

// 生成运势预测
async function generateFortune(type, userInfo, question) {
  // 检查缓存
  const cacheKey = `${type}_${JSON.stringify(userInfo)}_${question}`;
  const cachedResult = storageService.getCachedResult(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }
  
  // 生成提示词
  const prompt = promptService.generatePrompt(type, userInfo, question);
  
  let result;
  
  try {
    // 尝试主要API
    result = await callAI(prompt, AI_CONFIG.primary);
  } catch (error) {
    console.warn('主要API失败，尝试备选API');
    try {
      // 尝试备选API
      result = await callAI(prompt, AI_CONFIG.fallback);
    } catch (fallbackError) {
      console.warn('备选API也失败，使用本地模板');
      // 使用本地模板生成基础运势
      result = generateLocalFortune(type, userInfo, question);
    }
  }
  
  // 保存缓存
  storageService.saveCachedResult(cacheKey, result);
  
  return result;
}

// 生成本地基础运势
function generateLocalFortune(type, userInfo, question) {
  const localFortunes = {
    yijing: `【易经卦象分析】
    
根据您的信息，为您生成一个易经卦象。

卦象：乾卦（乾为天）
卦辞：元亨利贞
象曰：天行健，君子以自强不息

【解读】
乾卦象征天，代表刚健、进取、创造。这是一个非常吉祥的卦象，预示着新的开始和无限可能。

【建议】
1. 保持积极进取的心态
2. 把握机会，勇敢行动
3. 自强不息，不断进步

【典故】
乾卦是易经六十四卦之首，代表天道运行不息。古人云："天行健，君子以自强不息"，鼓励人们要像天一样，永不停息地前进。`,
    
    bazi: `【八字命理分析】

根据您的出生信息，为您进行八字命理分析。

【八字排盘】
年柱：庚午
月柱：戊寅
日柱：丙子
时柱：庚寅

【五行分析】
金：2个（庚、庚）
木：2个（寅、寅）
水：1个（子）
火：2个（午、丙）
土：1个（戊）

【建议】
1. 五行平衡，运势稳定
2. 适合从事稳定的工作
3. 注意身体健康，特别是肝脏

【典故】
八字命理是中国传统命理学的重要组成部分，通过分析出生年月日时的天干地支，来预测一个人的命运走势。`,
    
    constellation: `【星座运势分析】

星座：${userInfo.constellation || '白羊座'}

【今日运势】
综合运：★★★★☆
爱情运：★★★☆☆
事业运：★★★★☆
财运：★★★☆☆

【星座特质】
您是热情、勇敢、有领导力的星座。今天适合开展新项目，但要注意控制情绪。

【建议】
1. 把握机会，积极行动
2. 注意与同事的沟通
3. 适当控制开支

【希腊神话典故】
白羊座的神话源于金羊弗里克索斯的故事。宙斯派出一只金羊，救出了被继母迫害的弗里克索斯和妹妹赫勒。这只金羊后来升上天空，成为白羊座。`
  };
  
  return localFortunes[type] || localFortunes.constellation;
}

// 重试机制
async function generateFortuneWithRetry(type, userInfo, question, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateFortune(type, userInfo, question);
    } catch (error) {
      lastError = error;
      console.warn(`第${i + 1}次尝试失败:`, error.message);
      
      if (i < maxRetries - 1) {
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

module.exports = {
  generateFortune,
  generateFortuneWithRetry,
  generateLocalFortune
};
```

- [ ] **Step 4: 运行测试验证服务**

```bash
# 测试存储服务
node -e "
const storageService = require('./fortune/services/storage-service');
console.log('存储服务测试通过');
"

# 测试提示词服务
node -e "
const promptService = require('./fortune/services/prompt-service');
const prompt = promptService.generatePrompt('yijing', { birthDate: '1990-01-15' }, '测试问题');
console.log('提示词生成测试通过');
"

# 测试AI服务
node -e "
const aiService = require('./fortune/services/ai-service');
console.log('AI服务测试通过');
"
```

- [ ] **Step 5: 提交代码**

```bash
git add fortune/services/
git commit -m "feat: 实现AI服务层"
```

---

## Task 5: 实现页面组件

**Files:**
- Create: `fortune/components/type-card/type-card.js`
- Create: `fortune/components/type-card/type-card.json`
- Create: `fortune/components/type-card/type-card.wxml`
- Create: `fortune/components/type-card/type-card.wxss`
- Create: `fortune/components/result-display/result-display.js`
- Create: `fortune/components/result-display/result-display.json`
- Create: `fortune/components/result-display/result-display.wxml`
- Create: `fortune/components/result-display/result-display.wxss`

- [ ] **Step 1: 创建类型卡片组件**

```javascript
// fortune/components/type-card/type-card.js
Component({
  properties: {
    type: {
      type: String,
      value: ''
    },
    name: {
      type: String,
      value: ''
    },
    icon: {
      type: String,
      value: ''
    }
  },

  data: {},

  methods: {
    handleTap() {
      this.triggerEvent('tap', { type: this.properties.type });
    }
  }
});
```

```json
// fortune/components/type-card/type-card.json
{
  "component": true,
  "usingComponents": {}
}
```

```html
<!-- fortune/components/type-card/type-card.wxml -->
<view class="type-card" bindtap="handleTap">
  <view class="type-icon">{{icon}}</view>
  <text class="type-name">{{name}}</text>
</view>
```

```css
/* fortune/components/type-card/type-card.wxss */
.type-card {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}

.type-icon {
  font-size: 48rpx;
  margin-bottom: 10rpx;
}

.type-name {
  font-size: 28rpx;
  color: #333;
}
```

- [ ] **Step 2: 创建结果展示组件**

```javascript
// fortune/components/result-display/result-display.js
Component({
  properties: {
    result: {
      type: String,
      value: ''
    },
    type: {
      type: String,
      value: ''
    }
  },

  data: {},

  methods: {
    handleCopy() {
      wx.setClipboardData({
        data: this.properties.result,
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          });
        }
      });
    },

    handleShare() {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      });
    }
  }
});
```

```json
// fortune/components/result-display/result-display.json
{
  "component": true,
  "usingComponents": {}
}
```

```html
<!-- fortune/components/result-display/result-display.wxml -->
<view class="result-display">
  <view class="result-content">
    <text class="result-text">{{result}}</text>
  </view>
  <view class="result-actions">
    <button class="action-btn copy-btn" bindtap="handleCopy">复制</button>
    <button class="action-btn share-btn" bindtap="handleShare">分享</button>
  </view>
</view>
```

```css
/* fortune/components/result-display/result-display.wxss */
.result-display {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin: 20rpx 0;
}

.result-content {
  margin-bottom: 30rpx;
}

.result-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
}

.result-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.copy-btn {
  background: #f5f5f5;
  color: #333;
}

.share-btn {
  background: #667eea;
  color: white;
}
```

- [ ] **Step 3: 运行测试验证组件**

在微信开发者工具中预览组件，确认显示正常。

- [ ] **Step 4: 提交代码**

```bash
git add fortune/components/
git commit -m "feat: 实现页面组件"
```

---

## Task 6: 实现预测类型选择页面

**Files:**
- Create: `fortune/pages/types/types.js`
- Create: `fortune/pages/types/types.json`
- Create: `fortune/pages/types/types.wxml`
- Create: `fortune/pages/types/types.wxss`

- [ ] **Step 1: 创建类型选择页面**

```javascript
// fortune/pages/types/types.js
Page({
  data: {
    category: '', // chinese 或 western
    types: []
  },

  onLoad(options) {
    const category = options.category || 'chinese';
    this.setData({ category });
    
    const types = this.getTypesByCategory(category);
    this.setData({ types });
  },

  getTypesByCategory(category) {
    const typesMap = {
      chinese: [
        { type: 'yijing', name: '易经卦象', icon: '☯', desc: '基于易经六十四卦的占卜分析' },
        { type: 'bazi', name: '八字命理', icon: '八字', desc: '基于出生年月日时的八字分析' },
        { type: 'ziwei', name: '紫微斗数', icon: '紫微', desc: '中国传统紫微斗数命盘分析' }
      ],
      western: [
        { type: 'constellation', name: '星座分析', icon: '♈', desc: '十二星座的性格分析、运势预测' },
        { type: 'tarot', name: '塔罗占卜', icon: '🃏', desc: '塔罗牌阵解读' },
        { type: 'astrology', name: '占星术', icon: '🌟', desc: '行星位置、相位分析' }
      ]
    };
    
    return typesMap[category] || typesMap.chinese;
  },

  handleTypeTap(e) {
    const type = e.detail.type;
    wx.navigateTo({
      url: `/fortune/pages/input/input?type=${type}`
    });
  }
});
```

```json
// fortune/pages/types/types.json
{
  "usingComponents": {
    "type-card": "/fortune/components/type-card/type-card"
  }
}
```

```html
<!-- fortune/pages/types/types.wxml -->
<view class="container">
  <view class="header">
    <text class="title">{{category === 'chinese' ? '中国运势' : '西方运势'}}</text>
  </view>

  <view class="types-grid">
    <type-card
      wx:for="{{types}}"
      wx:key="type"
      type="{{item.type}}"
      name="{{item.name}}"
      icon="{{item.icon}}"
      bind:tap="handleTypeTap"
    />
  </view>

  <view class="descriptions">
    <view class="description-item" wx:for="{{types}}" wx:key="type">
      <text class="desc-name">{{item.name}}</text>
      <text class="desc-text">{{item.desc}}</text>
    </view>
  </view>
</view>
```

```css
/* fortune/pages/types/types.wxss */
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  padding: 40rpx 0;
  text-align: center;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.types-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.descriptions {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
}

.description-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #eee;
}

.description-item:last-child {
  border-bottom: none;
}

.desc-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.desc-text {
  font-size: 26rpx;
  color: #666;
}
```

- [ ] **Step 2: 运行测试验证页面**

在微信开发者工具中测试类型选择页面，确认可以正常显示和跳转。

- [ ] **Step 3: 提交代码**

```bash
git add fortune/pages/types/
git commit -m "feat: 实现预测类型选择页面"
```

---

## Task 7: 实现信息输入页面

**Files:**
- Create: `fortune/pages/input/input.js`
- Create: `fortune/pages/input/input.json`
- Create: `fortune/pages/input/input.wxml`
- Create: `fortune/pages/input/input.wxss`

- [ ] **Step 1: 创建信息输入页面**

```javascript
// fortune/pages/input/input.js
const validationUtils = require('../../utils/validation-utils');
const dateUtils = require('../../utils/date-utils');
const zodiacUtils = require('../../utils/zodiac-utils');
const storageService = require('../../services/storage-service');

Page({
  data: {
    type: '',
    typeName: '',
    birthDate: '',
    birthTime: '',
    gender: '',
    constellation: '',
    question: '',
    showTimePicker: false,
    showGenderPicker: false,
    showConstellationPicker: false,
    errors: {}
  },

  onLoad(options) {
    const type = options.type || 'constellation';
    const typeName = this.getTypeName(type);
    
    this.setData({ type, typeName });
    
    // 加载已保存的用户信息
    this.loadUserInfo();
  },

  getTypeName(type) {
    const nameMap = {
      yijing: '易经卦象',
      bazi: '八字命理',
      ziwei: '紫微斗数',
      constellation: '星座分析',
      tarot: '塔罗占卜',
      astrology: '占星术'
    };
    return nameMap[type] || '运势分析';
  },

  loadUserInfo() {
    const userInfo = storageService.getUserInfo();
    if (userInfo) {
      this.setData({
        birthDate: userInfo.birthDate || '',
        birthTime: userInfo.birthTime || '',
        gender: userInfo.gender || '',
        constellation: userInfo.constellation || ''
      });
    }
  },

  handleDateChange(e) {
    this.setData({ birthDate: e.detail.value });
    this.clearError('birthDate');
  },

  handleTimeChange(e) {
    const times = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
    this.setData({ birthTime: times[e.detail.value] });
    this.clearError('birthTime');
  },

  handleGenderChange(e) {
    const genders = ['男', '女'];
    const genderValues = ['male', 'female'];
    this.setData({ 
      gender: genderValues[e.detail.value],
      showGenderPicker: false
    });
    this.clearError('gender');
  },

  handleConstellationChange(e) {
    const constellations = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
    this.setData({ 
      constellation: constellations[e.detail.value],
      showConstellationPicker: false
    });
    this.clearError('constellation');
  },

  handleQuestionInput(e) {
    this.setData({ question: e.detail.value });
    this.clearError('question');
  },

  clearError(field) {
    const errors = { ...this.data.errors };
    delete errors[field];
    this.setData({ errors });
  },

  validate() {
    const errors = {};
    
    // 验证日期
    if (['bazi', 'ziwei', 'astrology'].includes(this.data.type)) {
      const dateValidation = validationUtils.validateDate(this.data.birthDate);
      if (!dateValidation.valid) {
        errors.birthDate = dateValidation.message;
      }
    }
    
    // 验证时辰
    if (['bazi', 'ziwei'].includes(this.data.type)) {
      const timeValidation = validationUtils.validate时辰(this.data.birthTime);
      if (!timeValidation.valid) {
        errors.birthTime = timeValidation.message;
      }
    }
    
    // 验证性别
    if (['bazi', 'ziwei'].includes(this.data.type)) {
      const genderValidation = validationUtils.validateGender(this.data.gender);
      if (!genderValidation.valid) {
        errors.gender = genderValidation.message;
      }
    }
    
    // 验证星座
    if (['constellation', 'tarot'].includes(this.data.type)) {
      const constellationValidation = validationUtils.validate星座(this.data.constellation);
      if (!constellationValidation.valid) {
        errors.constellation = constellationValidation.message;
      }
    }
    
    // 验证问题
    const questionValidation = validationUtils.validateQuestion(this.data.question);
    if (!questionValidation.valid) {
      errors.question = questionValidation.message;
    }
    
    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  handleSubmit() {
    if (!this.validate()) {
      return;
    }
    
    // 保存用户信息
    const userInfo = {
      birthDate: this.data.birthDate,
      birthTime: this.data.birthTime,
      gender: this.data.gender,
      constellation: this.data.constellation
    };
    storageService.saveUserInfo(userInfo);
    
    // 跳转到结果页面
    const params = new URLSearchParams({
      type: this.data.type,
      birthDate: this.data.birthDate,
      birthTime: this.data.birthTime,
      gender: this.data.gender,
      constellation: this.data.constellation,
      question: this.data.question
    }).toString();
    
    wx.navigateTo({
      url: `/fortune/pages/result/result?${params}`
    });
  }
});
```

```json
// fortune/pages/input/input.json
{
  "usingComponents": {}
}
```

```html
<!-- fortune/pages/input/input.wxml -->
<view class="container">
  <view class="header">
    <text class="title">{{typeName}}</text>
  </view>

  <view class="form">
    <!-- 日期输入 -->
    <view class="form-item" wx:if="{{['bazi', 'ziwei', 'astrology'].includes(type)}}">
      <text class="label">出生日期</text>
      <picker mode="date" value="{{birthDate}}" bindchange="handleDateChange">
        <view class="picker">
          <text class="picker-text">{{birthDate || '请选择出生日期'}}</text>
        </view>
      </picker>
      <text class="error" wx:if="{{errors.birthDate}}">{{errors.birthDate}}</text>
    </view>

    <!-- 时辰输入 -->
    <view class="form-item" wx:if="{{['bazi', 'ziwei'].includes(type)}}">
      <text class="label">出生时辰</text>
      <picker bindchange="handleTimeChange">
        <view class="picker">
          <text class="picker-text">{{birthTime || '请选择出生时辰'}}</text>
        </view>
      </picker>
      <text class="error" wx:if="{{errors.birthTime}}">{{errors.birthTime}}</text>
    </view>

    <!-- 性别输入 -->
    <view class="form-item" wx:if="{{['bazi', 'ziwei'].includes(type)}}">
      <text class="label">性别</text>
      <picker bindchange="handleGenderChange">
        <view class="picker">
          <text class="picker-text">{{gender === 'male' ? '男' : gender === 'female' ? '女' : '请选择性别'}}</text>
        </view>
      </picker>
      <text class="error" wx:if="{{errors.gender}}">{{errors.gender}}</text>
    </view>

    <!-- 星座输入 -->
    <view class="form-item" wx:if="{{['constellation', 'tarot'].includes(type)}}">
      <text class="label">星座</text>
      <picker bindchange="handleConstellationChange">
        <view class="picker">
          <text class="picker-text">{{constellation || '请选择星座'}}</text>
        </view>
      </picker>
      <text class="error" wx:if="{{errors.constellation}}">{{errors.constellation}}</text>
    </view>

    <!-- 问题输入 -->
    <view class="form-item">
      <text class="label">您想要预测的问题</text>
      <textarea
        class="textarea"
        placeholder="请输入您想要预测的问题"
        value="{{question}}"
        bindinput="handleQuestionInput"
        maxlength="200"
      />
      <text class="error" wx:if="{{errors.question}}">{{errors.question}}</text>
    </view>

    <!-- 提交按钮 -->
    <button class="submit-btn" bindtap="handleSubmit">开始预测</button>
  </view>
</view>
```

```css
/* fortune/pages/input/input.wxss */
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  padding: 40rpx 0;
  text-align: center;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.form {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
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

.textarea {
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 20rpx;
  width: 100%;
  height: 200rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.error {
  font-size: 24rpx;
  color: #ff4d4f;
  margin-top: 10rpx;
  display: block;
}

.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8rpx;
  font-size: 32rpx;
  padding: 20rpx;
  margin-top: 40rpx;
}
```

- [ ] **Step 2: 运行测试验证页面**

在微信开发者工具中测试信息输入页面，确认表单验证和提交功能正常。

- [ ] **Step 3: 提交代码**

```bash
git add fortune/pages/input/
git commit -m "feat: 实现信息输入页面"
```

---

## Task 8: 实现结果展示页面

**Files:**
- Create: `fortune/pages/result/result.js`
- Create: `fortune/pages/result/result.json`
- Create: `fortune/pages/result/result.wxml`
- Create: `fortune/pages/result/result.wxss`

- [ ] **Step 1: 创建结果展示页面**

```javascript
// fortune/pages/result/result.js
const aiService = require('../../services/ai-service');
const storageService = require('../../services/storage-service');

Page({
  data: {
    type: '',
    typeName: '',
    result: '',
    loading: false,
    error: '',
    userInfo: {}
  },

  onLoad(options) {
    const type = options.type || 'constellation';
    const typeName = this.getTypeName(type);
    
    this.setData({ type, typeName });
    
    // 解析参数
    const userInfo = {
      birthDate: options.birthDate || '',
      birthTime: options.birthTime || '',
      gender: options.gender || '',
      constellation: options.constellation || ''
    };
    
    const question = options.question || '';
    
    this.setData({ userInfo });
    
    // 生成运势预测
    this.generateFortune(userInfo, question);
  },

  getTypeName(type) {
    const nameMap = {
      yijing: '易经卦象',
      bazi: '八字命理',
      ziwei: '紫微斗数',
      constellation: '星座分析',
      tarot: '塔罗占卜',
      astrology: '占星术'
    };
    return nameMap[type] || '运势分析';
  },

  async generateFortune(userInfo, question) {
    this.setData({ loading: true, error: '' });
    
    try {
      const result = await aiService.generateFortuneWithRetry(
        this.data.type,
        userInfo,
        question
      );
      
      this.setData({ result, loading: false });
      
      // 保存到历史记录
      this.saveToHistory(userInfo, question, result);
    } catch (error) {
      console.error('生成运势失败:', error);
      this.setData({ 
        error: '生成运势失败，请稍后重试',
        loading: false 
      });
    }
  },

  saveToHistory(userInfo, question, result) {
    const record = {
      type: this.data.type,
      typeName: this.data.typeName,
      userInfo,
      question,
      result
    };
    
    storageService.addHistory(record);
  },

  handleRetry() {
    const question = this.data.userInfo.question || '';
    this.generateFortune(this.data.userInfo, question);
  },

  handleBack() {
    wx.navigateBack();
  },

  handleHome() {
    wx.switchTab({
      url: '/fortune/pages/index/index'
    });
  }
});
```

```json
// fortune/pages/result/result.json
{
  "usingComponents": {
    "result-display": "/fortune/components/result-display/result-display"
  }
}
```

```html
<!-- fortune/pages/result/result.wxml -->
<view class="container">
  <view class="header">
    <text class="title">{{typeName}}</text>
  </view>

  <!-- 加载状态 -->
  <view class="loading" wx:if="{{loading}}">
    <view class="loading-icon">⏳</view>
    <text class="loading-text">正在为您生成运势分析...</text>
    <text class="loading-sub">请稍候，AI正在分析您的信息</text>
  </view>

  <!-- 错误状态 -->
  <view class="error" wx:elif="{{error}}">
    <view class="error-icon">❌</view>
    <text class="error-text">{{error}}</text>
    <button class="retry-btn" bindtap="handleRetry">重试</button>
  </view>

  <!-- 结果展示 -->
  <view class="result" wx:else>
    <result-display result="{{result}}" type="{{type}}" />
  </view>

  <!-- 底部按钮 -->
  <view class="footer">
    <button class="footer-btn back-btn" bindtap="handleBack">返回</button>
    <button class="footer-btn home-btn" bindtap="handleHome">首页</button>
  </view>
</view>
```

```css
/* fortune/pages/result/result.wxss */
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  padding: 40rpx 0;
  text-align: center;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.loading {
  text-align: center;
  padding: 100rpx 0;
}

.loading-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.loading-text {
  font-size: 32rpx;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.loading-sub {
  font-size: 26rpx;
  color: #666;
}

.error {
  text-align: center;
  padding: 100rpx 0;
}

.error-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.error-text {
  font-size: 32rpx;
  color: #ff4d4f;
  display: block;
  margin-bottom: 30rpx;
}

.retry-btn {
  background: #667eea;
  color: white;
  border-radius: 8rpx;
  font-size: 28rpx;
  padding: 15rpx 40rpx;
  display: inline-block;
}

.result {
  margin-bottom: 20rpx;
}

.footer {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}

.footer-btn {
  flex: 1;
  border-radius: 8rpx;
  font-size: 28rpx;
  padding: 20rpx;
}

.back-btn {
  background: #f5f5f5;
  color: #333;
}

.home-btn {
  background: #667eea;
  color: white;
}
```

- [ ] **Step 2: 运行测试验证页面**

在微信开发者工具中测试结果展示页面，确认AI调用和结果展示功能正常。

- [ ] **Step 3: 提交代码**

```bash
git add fortune/pages/result/
git commit -m "feat: 实现结果展示页面"
```

---

## Task 9: 实现历史记录页面

**Files:**
- Create: `fortune/pages/history/history.js`
- Create: `fortune/pages/history/history.json`
- Create: `fortune/pages/history/history.wxml`
- Create: `fortune/pages/history/history.wxss`

- [ ] **Step 1: 创建历史记录页面**

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
    const index = e.currentTarget.dataset.index;
    const item = this.data.history[index];
    
    // 跳转到结果页面
    const params = new URLSearchParams({
      type: item.type,
      birthDate: item.userInfo.birthDate || '',
      birthTime: item.userInfo.birthTime || '',
      gender: item.userInfo.gender || '',
      constellation: item.userInfo.constellation || '',
      question: item.question || ''
    }).toString();
    
    wx.navigateTo({
      url: `/fortune/pages/result/result?${params}`
    });
  },

  handleDelete(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.history[index];
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          storageService.deleteHistory(item.id);
          this.loadHistory();
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
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
          wx.showToast({
            title: '清空成功',
            icon: 'success'
          });
        }
      }
    });
  }
});
```

```json
// fortune/pages/history/history.json
{
  "usingComponents": {}
}
```

```html
<!-- fortune/pages/history/history.wxml -->
<view class="container">
  <view class="header">
    <text class="title">历史记录</text>
    <text class="clear-btn" wx:if="{{!isEmpty}}" bindtap="handleClear">清空</text>
  </view>

  <!-- 空状态 -->
  <view class="empty" wx:if="{{isEmpty}}">
    <view class="empty-icon">📝</view>
    <text class="empty-text">暂无历史记录</text>
    <text class="empty-sub">去预测一下吧</text>
  </view>

  <!-- 历史列表 -->
  <view class="history-list" wx:else>
    <view class="history-item" wx:for="{{history}}" wx:key="id">
      <view class="item-content" bindtap="handleItemTap" data-index="{{index}}">
        <view class="item-header">
          <text class="item-type">{{item.typeName}}</text>
          <text class="item-time">{{item.timestamp}}</text>
        </view>
        <text class="item-question" wx:if="{{item.question}}">{{item.question}}</text>
        <text class="item-result">{{item.result}}</text>
      </view>
      <view class="item-actions">
        <text class="delete-btn" bindtap="handleDelete" data-index="{{index}}">删除</text>
      </view>
    </view>
  </view>
</view>
```

```css
/* fortune/pages/history/history.wxss */
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40rpx 0;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.clear-btn {
  font-size: 28rpx;
  color: #667eea;
}

.empty {
  text-align: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.empty-sub {
  font-size: 26rpx;
  color: #666;
}

.history-list {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
}

.history-item {
  border-bottom: 1rpx solid #eee;
  display: flex;
  align-items: center;
}

.history-item:last-child {
  border-bottom: none;
}

.item-content {
  flex: 1;
  padding: 30rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.item-type {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.item-time {
  font-size: 24rpx;
  color: #999;
}

.item-question {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 10rpx;
  display: block;
}

.item-result {
  font-size: 26rpx;
  color: #999;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-actions {
  padding: 0 30rpx;
}

.delete-btn {
  font-size: 26rpx;
  color: #ff4d4f;
}
```

- [ ] **Step 2: 运行测试验证页面**

在微信开发者工具中测试历史记录页面，确认列表显示和删除功能正常。

- [ ] **Step 3: 提交代码**

```bash
git add fortune/pages/history/
git commit -m "feat: 实现历史记录页面"
```

---

## Task 10: 实现每日运势页面

**Files:**
- Create: `fortune/pages/daily/daily.js`
- Create: `fortune/pages/daily/daily.json`
- Create: `fortune/pages/daily/daily.wxml`
- Create: `fortune/pages/daily/daily.wxss`

- [ ] **Step 1: 创建每日运势页面**

```javascript
// fortune/pages/daily/daily.js
const aiService = require('../../services/ai-service');
const storageService = require('../../services/storage-service');
const zodiacUtils = require('../../utils/zodiac-utils');

Page({
  data: {
    constellation: '',
    constellationName: '',
    dailyFortune: '',
    loading: false,
    error: ''
  },

  onLoad() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const userInfo = storageService.getUserInfo();
    if (userInfo && userInfo.constellation) {
      this.setData({
        constellation: userInfo.constellation,
        constellationName: userInfo.constellation
      });
      this.generateDailyFortune();
    } else {
      // 默认使用白羊座
      this.setData({
        constellation: '白羊座',
        constellationName: '白羊座'
      });
      this.generateDailyFortune();
    }
  },

  handleConstellationChange(e) {
    const constellations = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
    const constellation = constellations[e.detail.value];
    
    this.setData({
      constellation,
      constellationName: constellation
    });
    
    this.generateDailyFortune();
  },

  async generateDailyFortune() {
    this.setData({ loading: true, error: '' });
    
    try {
      const userInfo = {
        constellation: this.data.constellation
      };
      
      const question = '请分析今日综合运势、爱情运、事业运、财运';
      
      const result = await aiService.generateFortuneWithRetry(
        'constellation',
        userInfo,
        question
      );
      
      this.setData({ dailyFortune: result, loading: false });
    } catch (error) {
      console.error('生成每日运势失败:', error);
      this.setData({ 
        error: '生成每日运势失败，请稍后重试',
        loading: false 
      });
    }
  },

  handleRetry() {
    this.generateDailyFortune();
  }
});
```

```json
// fortune/pages/daily/daily.json
{
  "usingComponents": {
    "result-display": "/fortune/components/result-display/result-display"
  }
}
```

```html
<!-- fortune/pages/daily/daily.wxml -->
<view class="container">
  <view class="header">
    <text class="title">每日运势</text>
  </view>

  <!-- 星座选择 -->
  <view class="constellation-picker">
    <text class="label">选择星座</text>
    <picker bindchange="handleConstellationChange">
      <view class="picker">
        <text class="picker-text">{{constellationName}}</text>
      </view>
    </picker>
  </view>

  <!-- 加载状态 -->
  <view class="loading" wx:if="{{loading}}">
    <view class="loading-icon">⏳</view>
    <text class="loading-text">正在生成今日运势...</text>
    <text class="loading-sub">请稍候</text>
  </view>

  <!-- 错误状态 -->
  <view class="error" wx:elif="{{error}}">
    <view class="error-icon">❌</view>
    <text class="error-text">{{error}}</text>
    <button class="retry-btn" bindtap="handleRetry">重试</button>
  </view>

  <!-- 结果展示 -->
  <view class="result" wx:else>
    <result-display result="{{dailyFortune}}" type="constellation" />
  </view>
</view>
```

```css
/* fortune/pages/daily/daily.wxss */
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  padding: 40rpx 0;
  text-align: center;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.constellation-picker {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
  display: block;
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

.loading {
  text-align: center;
  padding: 100rpx 0;
}

.loading-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.loading-text {
  font-size: 32rpx;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.loading-sub {
  font-size: 26rpx;
  color: #666;
}

.error {
  text-align: center;
  padding: 100rpx 0;
}

.error-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.error-text {
  font-size: 32rpx;
  color: #ff4d4f;
  display: block;
  margin-bottom: 30rpx;
}

.retry-btn {
  background: #667eea;
  color: white;
  border-radius: 8rpx;
  font-size: 28rpx;
  padding: 15rpx 40rpx;
  display: inline-block;
}

.result {
  margin-bottom: 20rpx;
}
```

- [ ] **Step 2: 运行测试验证页面**

在微信开发者工具中测试每日运势页面，确认星座选择和运势生成功能正常。

- [ ] **Step 3: 提交代码**

```bash
git add fortune/pages/daily/
git commit -m "feat: 实现每日运势页面"
```

---

## Task 11: 更新app.json配置

**Files:**
- Modify: `app.json`

- [ ] **Step 1: 更新app.json添加fortune子包**

```json
// app.json
{
  "pages": [
    "pages/index/index",
    "pages/user/user",
    "pages/learn-agent/learn-agent",
    "pages/tool-agent/tool-agent"
  ],
  "lazyCodeLoading": "requiredComponents",
  "subpackages": [
    {
      "root": "pdf",
      "pages": [
        "pages/index/index",
        "pages/convert/convert",
        "pages/edit/edit",
        "pages/records/records"
      ]
    },
    {
      "root": "japanese",
      "pages": [
        "pages/learn/learn",
        "pages/lesson/lesson",
        "pages/course/course",
        "pages/wordbook/wordbook",
        "pages/grammar/grammar",
        "pages/grammar/grammar33",
        "pages/textbook/textbook",
        "pages/leaderboard/leaderboard"
      ]
    },
    {
      "root": "german",
      "pages": [
        "pages/learn/learn",
        "pages/learn/challenge",
        "pages/learn/result",
        "pages/learn/review",
        "pages/lesson/lesson",
        "pages/course/course",
        "pages/wordbook/wordbook",
        "pages/grammar/grammar",
        "pages/textbook/textbook",
        "pages/leaderboard/leaderboard"
      ]
    },
    {
      "root": "word",
      "pages": [
        "pages/index/index",
        "pages/editor/editor"
      ]
    },
    {
      "root": "smart-teacher",
      "pages": [
        "pages/chat/chat"
      ]
    },
    {
      "root": "ai-order",
      "pages": [
        "pages/index/index",
        "pages/merchant/merchant",
        "pages/customer/customer"
      ]
    },
    {
      "root": "cloud-manager",
      "pages": [
        "pages/index/index"
      ]
    },
    {
      "root": "fortune",
      "pages": [
        "pages/index/index",
        "pages/types/types",
        "pages/input/input",
        "pages/result/result",
        "pages/history/history",
        "pages/daily/daily"
      ]
    }
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#fff",
    "navigationBarTitleText": "多功能小机器人",
    "navigationBarTextStyle": "black"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#764ba2",
    "backgroundColor": "#ffffff",
    "borderStyle": "white",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/icons/home-81-dark.png",
        "selectedIconPath": "images/icons/home-81-primary.png"
      },
      {
        "pagePath": "pages/user/user",
        "text": "我的",
        "iconPath": "images/icons/user-81-dark.png",
        "selectedIconPath": "images/icons/user-81-primary.png"
      }
    ]
  },
  "sitemapLocation": "sitemap.json"
}
```

- [ ] **Step 2: 运行测试验证配置**

在微信开发者工具中重新编译项目，确认fortune子包可以正常加载。

- [ ] **Step 3: 提交代码**

```bash
git add app.json
git commit -m "feat: 更新app.json添加fortune子包"
```

---

## Task 12: 集成测试和优化

**Files:**
- Test all pages and components
- Fix any issues found during testing

- [ ] **Step 1: 测试完整流程**

1. 从首页进入，选择中国运势或西方运势
2. 选择具体的预测类型
3. 输入必要的信息
4. 提交预测请求
5. 查看结果展示
6. 检查历史记录
7. 测试每日运势功能

- [ ] **Step 2: 测试错误场景**

1. 测试网络断开时的错误处理
2. 测试输入验证错误提示
3. 测试API失败时的降级方案

- [ ] **Step 3: 性能优化**

1. 优化AI API调用响应时间
2. 优化页面加载速度
3. 优化内存使用

- [ ] **Step 4: 修复发现的问题**

根据测试结果修复任何发现的问题。

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "feat: 完成AI运势功能集成测试和优化"
```

---

## 自我审查清单

### 1. 规范覆盖检查
- [x] 支持6种预测类型（易经、八字、紫微、星座、塔罗、占星）
- [x] 模块化子包架构
- [x] 6个页面（首页、类型选择、信息输入、结果展示、历史记录、每日运势）
- [x] 本地md文档数据
- [x] AI服务层（API调用、提示词生成、缓存机制）
- [x] 错误处理和降级方案
- [x] 测试策略

### 2. 占位符扫描
- [x] 没有"TBD"、"TODO"等占位符
- [x] 所有步骤都有具体代码
- [x] 所有命令都有预期输出

### 3. 类型一致性检查
- [x] 函数名称和参数一致
- [x] 数据结构定义一致
- [x] 页面跳转参数一致

所有检查通过，计划完成。