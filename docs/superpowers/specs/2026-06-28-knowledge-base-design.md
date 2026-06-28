# 命理知识库设计

## 概述

为 fortune/ 小程序添加经典命理知识注入系统。在前端（非云函数）完成古籍分块、索引匹配、prompt 注入的全流程，使 AI 解读基于真实经典依据而非泛泛而谈。

## 约束

- 原生微信小程序框架，子包 2MB 限额（当前 ~1.5MB，余量约 500KB）
- 全部知识文件放在 `fortune/data/knowledge/` 子包内
- 无云函数，无后端服务
- 每次注入 prompt 的知识片段 ≤ 800 tokens（约 5-8 块）
- 知识更新通过发版走 App Store 审核流程（无热更新需求）

## 架构

```
reading.js
  │
  ├─ calc-service.buildContext(profile, types)
  │   → calcResults { bazi, ziwei, yijing, constellation, tarot, astrology }
  │
  ├─ knowledge-service.match(category, calcResults)
  │   ├─ 从 calcResults 提取索引键
  │   │   ├─ 中文: 日主, 月令, 年干, 格局, 神煞类型
  │   │   └─ 西方: 星座, 元素, 守护星
  │   ├─ 查 chinese-index.json / western-index.json → 匹配 chunkID
  │   ├─ 并行 require() 匹配的 chunk .json
  │   │   └─ 控制在 800 tokens 内（超出则截断）
  │   └─ 返回 [{ source, text, summary }, ...]
  │
  ├─ ai-service.buildUnifiedReadingPrompt()
  │   └─ prompt 结构:
  │       [用户信息] + [排盘数据] + [经典依据] + [要求]
  │
  └─ streamAIWithThinking → NVIDIA API
```

### 数据流

```
古籍原文 (FOR-BAZI / 紫微阁 / ShipBreaker)
  → 预处理脚本 (单次离线执行)
    → 按章节/规则切块
    → 每块打元数据标签
    → 构建 chinese-index.json
    → 写入 fortune/data/knowledge/
      ↓
reading.js 运行时:
  1. calc-service → 结构化排盘
  2. knowledge-service.match() → 取排盘字段 → 查索引 → 读块
  3. ai-service 构建 prompt → 注入知识片段
  4. NVIDIA API → 流式解读
```

## 数据组织

### 目录结构

```
fortune/data/knowledge/
├── chinese-index.json       ← 中文索引 (日主/月令/年干/神煞类型 → [chunkID])
├── western-index.json       ← 西方索引 (星座/行星 → [chunkID])
├── chunks/                  ← 古籍分块文件
│   ├── qiongtong_01..N.json   ← 穷通宝鉴 120条
│   ├── ditiansui_01..N.json   ← 滴天髓 按章
│   ├── yuanhai_01..N.json     ← 渊海子平 按章节
│   ├── ziping_01..N.json      ← 子平真诠 按条目
│   ├── sanming_01..N.json     ← 三命通会 按条目
│   ├── ziwei_stars.json       ← 紫微主星解读
│   ├── ziwei_palaces.json     ← 紫微宫位解读
│   └── western_*.json         ← 西方占星参考
├── structured/              ← 结构化表 (直接查)
│   ├── tiaohou.json           ← 穷通调候表
│   └── wuxing.json            ← 五行生克表
```

### 单块格式

```json
{
  "id": "qiongtong_01",
  "source": "穷通宝鉴",
  "tags": { "dayMaster": "丙", "month": "寅", "type": "调候" },
  "text": "丙火寅月，壬水为用……",
  "summary": "丙火生于寅月，调候用壬水"
}
```

### 索引结构

```json
{
  "丙火": ["qiongtong_01", "qiongtong_02", "ditiansui_05"],
  "寅月": ["qiongtong_01", "qiongtong_15", "ziping_03"],
  "庚金": ["qiongtong_20", "ditiansui_07", "yuanhai_12"]
}
```

执行时取交集：`丙火 ∩ 寅月 → ["qiongtong_01"]`。

### 知识总大小

| 来源 | 文本大小 | 说明 |
|------|---------|------|
| FOR-BAZI 5本古籍 | ~165KB | 穷通宝鉴28K + 渊海子平119K + 其他 |
| 紫微阁经典 | ~23KB | 骨髓赋/全集/全书 |
| 紫微星格 | ~79KB | 星格/格局/四化 |
| ShipBreaker 占星 | ~120KB | 13个markdown |
| 索引+结构化 | ~60KB | 索引 + 调候表 + 五行 |
| **合计** | **~450KB** | 打包后预计 500-600KB |

## 各方法知识覆盖

| 方法 | 源 | 注入内容 | 匹配键 |
|------|-----|---------|--------|
| 八字 | 穷通宝鉴 | 调候用神 1-2 条 | 日主 + 月令 |
| 八字 | 滴天髓 | 日主体性 / 格局 | 日主 / 格局 |
| 八字 | 子平真诠 | 格局取用 | 月令 |
| 八字 | 三命通会 | 神煞解读 | 神煞类型 |
| 八字 | 渊海子平 | 十神 / 纳音 | 日主 / 年柱 |
| 紫微 | 紫微阁经典 | 主星 + 宫位解读 | 星名 / 宫位 |
| 星座 | ShipBreaker | 星座 / 行星 / 宫位 | 太阳星座 |
| 占星 | ShipBreaker | 星座 / 行星 / 宫位 | 太阳星座 |
| 易经 | — (跳过) | 64 卦辞已在 calc-service | 自包含 |
| 塔罗 | — (升级) | 改为 3 张牌阵 | 见下文 |

### 塔罗升级

从单张 22 大牌改为 **3 张牌阵（过去/现在/未来）** + 位义：

```javascript
function calcTarot() {
  // 抽 3 张不重复大牌
  var drawn = [];
  var indices = [];
  while (indices.length < 3) {
    var idx = Math.floor(Math.random() * 22);
    if (!indices.includes(idx)) indices.push(idx);
  }
  var positions = [
    { name: '过去', meaning: '过去的能量和影响' },
    { name: '现在', meaning: '当下的状态和挑战' },
    { name: '未来', meaning: '未来的发展趋势' }
  ];
  return {
    spread: indices.map(function(idx, i) {
      var card = TAROT_MAJOR[idx];
      var isRev = Math.random() < 0.5;
      return {
        position: positions[i].name,
        positionMeaning: positions[i].meaning,
        card: card.name,
        reversed: isRev,
        meanings: isRev ? card.reversed : card.upright
      };
    }),
    summary: '过去「' + spread[0].card + '」→ 现在「' + spread[1].card + '」→ 未来「' + spread[2].card + '」'
  };
}
```

AI 按位置含义解读，而非三张牌独立解读。

## 注入逻辑 (knowledge-service.js)

```javascript
module.exports = {
  match(category, calcResults) {
    // 1. 提取索引键
    var keys = extractKeys(category, calcResults);
    // 2. 加载索引
    var index = loadIndex(category);
    // 3. 匹配 chunkID (交集)
    var matched = intersect(keys.map(k => index[k]));
    // 4. 读取 chunks (惰性 require，上限 800 tokens)
    var chunks = loadChunks(matched.slice(0, 8));
    // 5. 构建注入段
    return chunks.map(c => `· ${c.source}（${c.summary}）: ${c.text}`);
  }
};
```

注入段插入 prompt 的 `[排盘数据]` 与 `[要求]` 之间：

```
【经典依据】
· 穷通宝鉴（丙火寅月调候）: 丙火寅月，壬水为用……
· 滴天髓（丙火体性）: 丙火猛烈，欺霜侮雪……
```

## 文件修改清单

### 新增

| 文件 | 职责 |
|------|------|
| `fortune/services/knowledge-service.js` | 索引匹配 + chunk 加载 + token 控制 |
| `fortune/data/knowledge/chinese-index.json` | 中文索引 |
| `fortune/data/knowledge/western-index.json` | 西方索引 |
| `fortune/data/knowledge/chunks/*.json` | 古籍分块 |
| `fortune/data/knowledge/structured/*.json` | 结构化表 |

### 修改

| 文件 | 改动 |
|------|------|
| `fortune/services/calc-service.js` | calcTarot 改为 3 张牌阵 |
| `fortune/services/ai-service.js` | buildUnifiedReadingPrompt 添加知识注入段 |
| `fortune/pages/reading/reading.js` | buildDetailCards 塔罗卡片显示 3 张牌信息 |

## 实施顺序

### Phase 1: 数据准备
1. 下载 FOR-BAZI 5 本古籍原始 JSON
2. 下载 紫微阁 经典数据
3. 下载 ShipBreaker 西方占星参考
4. 离线预处理：切块 → 打标签 → 构建索引
5. 写入 `fortune/data/knowledge/`

### Phase 2: 代码实现
6. 实现 `knowledge-service.js`（索引加载、匹配、chunk 读取、token 控制）
7. 修改 `calcTarot()` 为 3 张牌阵
8. 修改 `buildUnifiedReadingPrompt()` 注入知识片段
9. 修改 `reading.js` 塔罗卡片展示 3 张牌
10. 测试全流程

## 风险

| 风险 | 对策 |
|------|------|
| 索引键不匹配（如古籍用"丙阳火"而非"丙"） | 人工标引时补充同义词，索引支持多键 |
| chunk 过多导致包体积超标 | 上限 600KB，控制在 ~450KB 预留余量 |
| 小程序 require 大量 JSON 文件性能 | 惰性加载 + 只 load 匹配的 chunk |
| 古籍原文含 HTML/格式标记 | 预处理时 strip 格式化文本 |

## 成功标准

1. 八字解读中包含穷通宝鉴/滴天髓等经典原文引用
2. 紫微解读包含星格/宫位依据
3. 塔罗展示 3 张牌位（过去/现在/未来）
4. 知识注入不影响流式响应速度（≤ 100ms 附加延迟）
5. fortune 子包大小 ≤ 2MB
