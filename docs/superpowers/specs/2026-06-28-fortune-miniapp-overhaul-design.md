# AI Fortune-Telling WeChat Mini Program — Full Overhaul Design

## Overview

Complete upgrade of the fortune-telling WeChat Mini Program: fix all bugs, integrate real calculation engines, overhaul UI with Vant Weapp, and add missing features. The goal is to transform a primitive, partially-broken prototype into a polished, functional fortune-telling app.

## Goals

1. Fix all known bugs and remove dead code
2. Add real fortune calculation engines (八字/紫微/星座) as structured context for AI
3. Overhaul UI with Vant Weapp components for professional polish
4. Add markdown rendering in chat, auto-scroll, share card, daily fortune
5. Keep native WeChat framework (no migration to Taro/uni-app)

## Constraints

- Native WeChat Mini Program framework (no build tools required)
- NVIDIA API for AI (keep existing `nvapi` key, model: `nemotron-3-nano-omni-30b-a3b-reasoning`)
- Chinese-only output (strict enforcement)
- Profile-driven (name, birthday, gender, birthTime optional)
- Local storage only (wx.setStorage, no backend)
- Max 2MB package size awareness (Vant Weapp ~200-500KB, mp-html ~50KB)

---

## Section 1: Bug Fixes & Cleanup

### 1.1 Critical Bugs

| Bug | File | Fix |
|-----|------|-----|
| `scrollToBottom()` never called | `chat.js` | Call after each message send/receive using `scroll-into-view` with message IDs |
| History timestamps display as raw numbers | `history.js` / `history.wxml` | Format with `date-utils.js` or inline formatter: `YYYY-MM-DD HH:mm` |
| Navigation `/fortune/` prefix broken | `index.js`, `history.js`, `chat.js`, `index.json` | Remove prefix, use relative paths: `/pages/reading/reading` |
| `temperature` ternary redundant | `ai-service.js` | Simplify to fixed `0.7` |
| API key hardcoded | `ai-service.js` | Move to `app.js` global data or config file (still client-side, but centralized) |
| No `app.js` / `app.wxss` | Project root | Create minimal `app.js` with `App({})` and `app.wxss` with global styles |

### 1.2 Dead Code Removal

| File | Action |
|------|--------|
| `services/prompt-service.js` | Delete — prompts are inline in `ai-service.js` |
| `utils/validation-utils.js` | Delete — validation is inline in profile-form |
| `utils/date-utils.js` | Keep `formatDate()` and `get时辰Name()`, remove unused exports |
| `utils/zodiac-utils.js` | Keep all — will be used by calc-service |
| `data/prompts/chinese_prompt.md` | Delete — reference only, not loaded at runtime |
| `data/prompts/western_prompt.md` | Delete — reference only, not loaded at runtime |

---

## Section 2: Real Calculations (Hybrid Approach)

### 2.1 Architecture

New file: `services/calc-service.js`

Flow:
```
Profile (birthday + birthTime + gender)
    ↓
calc-service.js computes raw data
    ↓
Structured context injected into AI prompt
    ↓
AI interprets with real calculation data
```

### 2.2 Calculation Modules

#### 八字排盘 (Bazi)

Based on `data/chinese/bazi.md` knowledge base.

**Inputs:** year, month, day, hour (from profile)
**Outputs:**
```javascript
{
  yearPillar: { stem: '庚', branch: '午', stemElement: '金', branchElement: '火' },
  monthPillar: { stem: '己', branch: '卯', stemElement: '土', branchElement: '木' },
  dayPillar: { stem: '丙', branch: '寅', stemElement: '火', branchElement: '木' },
  hourPillar: { stem: '戊', branch: '子', stemElement: '土', branchElement: '水' },
  dayMaster: '丙火',
  fiveElements: { 金: 1, 木: 2, 水: 1, 火: 3, 土: 1 },
  missingElements: ['水'],
  zodiac: '马',
  summary: '庚午年 己卯月 丙寅日 戊子时 | 日主丙火偏旺 | 五行缺水'
}
```

**Implementation:**
- 天干地支 lookup tables (10 stems × 12 branches = 60 cycle)
- Month pillar from solar month (not lunar)
- Day pillar from reference date calculation
- Hour pillar from birthTime (时辰)
- Five elements mapping from `data/chinese/wuxing.md`

#### 紫微斗数 (Ziwei) — Simplified

Based on `data/chinese/ziwei.md` knowledge base.

**Inputs:** year, month, day, hour, gender
**Outputs:**
```javascript
{
 命宫: '紫微天府',
  bodyStar: '紫微',
  lifePalace: '寅',
  fiveElements: '水二局',
  mainStars: ['紫微', '天府', '天相'],
  auxiliaryStars: ['左辅', '天魁'],
  fourTransformations: { 禄: '天机', 权: '天梁', 科: '天同', 忌: '太阴' },
  summary: '命宫在寅，紫微天府同坐，水二局'
}
```

**Implementation:**
- 命宫 calculation from birth month + birth hour
- 五行局 from 命宫 position
- 十四主星 placement from 命宫 + 五行局
- Simplified: skip 100+ 辅星, focus on 14 main stars + key auxiliaries

#### 星座计算 (Constellation)

Already exists in `utils/zodiac-utils.js` — just needs wiring.

**Inputs:** birthday (month, day)
**Outputs:**
```javascript
{
  sign: '双鱼座',
  element: '水象',
  rulingPlanet: '海王星',
  dateRange: '2月19日-3月20日',
  personality: ['直觉敏锐', '善解人意', '富有同情心']
}
```

#### 塔罗牌 (Tarot)

Based on `data/western/tarot.md`.

**Inputs:** none (random pull)
**Outputs:**
```javascript
{
  card: '愚者',
  number: 0,
  reversed: false,
  upright: ['新开始', '冒险', '自由', '天真'],
  reversedMeaning: ['鲁莽', '犹豫', '冒失'],
  element: '风',
  planet: '天王星'
}
```

**Implementation:** Random selection from 22 Major Arcana, random upright/reversed.

### 2.3 Prompt Integration

**Before (pure AI):**
```
请为1990年3月15日出生的男性分析八字命理
```

**After (with calculation data):**
```
【排盘数据】
八字：庚午年 己卯月 丙寅日 戊子时
日主：丙火（偏旺）
五行：金1 木2 水1 火3 土1（缺水）
生肖：马
纳音：路旁土

请基于以上排盘结果，进行专业的八字命理分析。要求：
1. 日主强弱判断及喜用神分析
2. 五行缺失对命运的影响
3. 性格特点与事业建议
4. 2024-2030年大运走势
```

---

## Section 3: UI Overhaul with Vant Weapp

### 3.1 Dependencies

```json
{
  "dependencies": {
    "@vant/weapp": "^1.11.7",
    "mp-html": "^2.4.0"
  }
}
```

Install via npm in project root, then build npm in WeChat DevTools.

### 3.2 Component Mapping

#### Index Page (Home)

| Element | Current | New (Vant) |
|---------|---------|------------|
| Navigation bar | Custom | `van-nav-bar` with title |
| Profile card | Plain div | `van-cell` with icon, value, is-link |
| Category grid | 2 plain cards | `van-grid` with `van-grid-item` (icon + text) |
| History link | Plain text | `van-cell` with is-link icon |
| Daily fortune | None | NEW: `van-notice-bar` with today's zodiac fortune |

**Layout:**
```
┌─────────────────────────┐
│ ☯ AI命理助手    [历史]  │  ← van-nav-bar
├─────────────────────────┤
│ 🔮 今日运势: 双鱼座...  │  ← van-notice-bar (scrolling)
├─────────────────────────┤
│ 👤 张三                  │
│ 📅 1990-03-15  ♂       │  ← van-cell (profile)
│ 🕐 子时            >    │
├─────────────────────────┤
│ ┌───────┐ ┌───────┐    │
│ │  ☯    │ │  ⭐    │    │  ← van-grid
│ │易学命理│ │西方星象│    │
│ └───────┘ └───────┘    │
├─────────────────────────┤
│ 📜 查看历史记录     >   │  ← van-cell
└─────────────────────────┘
```

#### Reading Page

| Element | Current | New (Vant) |
|---------|---------|------------|
| Nav bar | Custom | `van-nav-bar` with back arrow |
| Profile bar | Plain div | `van-tag` group (birthday, gender, birthTime) |
| Warning bar | Yellow div | `van-notice-bar` (warning type) |
| Fortune cards | Custom divs | Custom components with `van-skeleton` loading |
| Progress | None | `van-steps` showing 3 steps (1/2/3) |
| FAB (chat) | Custom gradient | `van-button` (round, gradient) |
| Completion toast | None | `van-toast` on all 3 complete |

**Layout:**
```
┌─────────────────────────┐
│ ← 易学命理 · 张三       │  ← van-nav-bar
├─────────────────────────┤
│ 🏷️ 1990-03-15 🏷️ ♂    │  ← van-tag group
├─────────────────────────┤
│ ⚠️ 八字分析需出生时辰... │  ← van-notice-bar
├─────────────────────────┤
│ ○ ─── ● ─── ○          │  ← van-steps (1=done, 2=active, 3=pending)
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 八字命理    推演中...│ │  ← fortune-card with van-skeleton
│ │ ┌─────────────────┐ │ │
│ │ │ ☯  正在分析...  │ │ │  ← thinking animation
│ │ └─────────────────┘ │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 紫微斗数    排队中  │ │  ← van-skeleton
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 易经卦象    排队中  │ │  ← van-skeleton
│ └─────────────────────┘ │
├─────────────────────────┤
│        💬 AI提问         │  ← van-button (round, gradient)
└─────────────────────────┘
```

#### Chat Page

| Element | Current | New (Vant) |
|---------|---------|------------|
| Nav bar | Custom | `van-nav-bar` with title |
| Toolbar | Plain buttons | `van-switch` for thinking + search toggles |
| Chat bubbles | Plain divs | Custom with `mp-html` for markdown rendering |
| File hint | Plain div | `van-tag` with close icon |
| Input bar | Custom | `van-field` + `van-button` |
| Empty state | None | `van-empty` description="开始提问吧" |

**Markdown Rendering:**
- Install `mp-html` component
- In `chat-bubble.wxml`, replace `<text>{{content}}</text>` with `<mp-html content="{{htmlContent}}" />`
- Convert markdown to HTML in `chat-bubble.js` using simple regex (bold, lists, headers) or mp-html's markdown plugin

#### History Page

| Element | Current | New (Vant) |
|---------|---------|------------|
| Nav bar | Custom | `van-nav-bar` with title + right action |
| History list | Plain cards | `van-swipe-cell` with delete button |
| Empty state | Plain emoji | `van-empty` with image |
| Clear all | Red button | `van-button` (danger, plain) |
| Timestamp | Raw number | Formatted: `2024-06-28 14:30` |
| Category tag | Plain span | `van-tag` (primary/success for chinese/western) |

#### Profile Form (Modal)

| Element | Current | New (Vant) |
|---------|---------|------------|
| Overlay | Custom | `van-overlay` |
| Modal card | Custom | `van-dialog` with custom content |
| Name input | Custom | `van-field` with input |
| Birthday picker | `picker` | `van-datetime-picker` |
| Gender picker | `picker` | `van-picker` |
| Birth time picker | `picker` | `van-picker` with columns |
| Save button | Custom gradient | `van-button` (block, gradient) |
| Error messages | Plain text | `van-field` with error prop |

### 3.3 Theme & Colors

Keep existing purple theme, customize via Vant CSS variables:

```css
page {
  --van-primary-color: #8b5cf6;
  --van-success-color: #10b981;
  --van-warning-color: #f59e0b;
  --van-danger-color: #ef4444;
  --van-font-size-md: 28rpx;
  --van-border-radius-md: 16rpx;
}
```

### 3.4 Animations

Keep existing CSS animations (float, spin, pulse, fadeSlideIn) from fortune-card.wxss.
Add:
- Page transition: `van-transition` for smooth page enters
- Card entrance: staggered `fadeSlideUp` for 3 fortune cards
- Button ripple: Vant's built-in tap feedback

---

## Section 4: Enhanced Features

### 4.1 Markdown in Chat

- `mp-html` component renders: **bold**, lists, headers, code blocks
- `chat-bubble.js`: convert markdown to HTML before rendering
- Keep `white-space: pre-wrap` for plain text fallback

### 4.2 Auto-Scroll

- `chat.js`: maintain `scrollToView` property = last message ID
- After each `setData` with new message, set `scrollToView` to that message's ID
- Use `scroll-into-view` on `scroll-view` component

### 4.3 Daily Fortune

- On index page load, calculate today's zodiac sign from profile birthday
- Show brief fortune in `van-notice-bar`: "今日双鱼座运势：★★★★☆ 适合社交和创作..."
- AI generates 1-sentence daily fortune on first load (cached for 24h)

### 4.4 Reading Progress

- `van-steps` component on reading page
- Step 1: 八字 → Step 2: 紫微 → Step 3: 易经
- Updates as each card completes
- All 3 complete → show `van-toast` "分析完成"

### 4.5 Share Card

- After all 3 readings complete, show "分享" button
- Use `wx.canvasToTempFilePath` to generate image from reading summary
- Share via `wx.shareAppMessage` with image

---

## Section 5: File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `app.js` | Global App() lifecycle |
| `app.wxss` | Global styles + Vant theme variables |
| `services/calc-service.js` | 八字/紫微/星座/塔罗 calculations |
| `package.json` | npm dependencies (Vant Weapp, mp-html) |

### Modified Files

| File | Changes |
|------|---------|
| `ai-service.js` | Remove `/fortune/` paths, fix temperature, enhance prompts with calc data |
| `chat.js` | Add auto-scroll, integrate calc-service for context |
| `chat.wxml` | Vant components + mp-html |
| `chat.wxss` | Vant overrides + mp-html styles |
| `reading.js` | Integrate calc-service, add progress tracking |
| `reading.wxml` | Vant steps + skeleton + notice-bar |
| `reading.wxss` | Vant overrides |
| `history.js` | Format timestamps |
| `history.wxml` | Vant swipe-cell + empty + tag |
| `history.wxss` | Vant overrides |
| `index.js` | Fix navigation paths, add daily fortune |
| `index.wxml` | Vant grid + cell + notice-bar |
| `index.wxss` | Vant overrides |
| `storage-service.js` | Fix timestamp formatting |
| `components/chat-bubble/chat-bubble.wxml` | mp-html integration |
| `components/chat-bubble/chat-bubble.js` | Markdown → HTML conversion |
| `components/fortune-card/fortune-card.wxml` | van-skeleton integration |
| `components/profile-form/profile-form.wxml` | Vant dialog + picker + field |
| `components/profile-form/profile-form.wxss` | Vant overrides |

### Deleted Files

| File | Reason |
|------|--------|
| `services/prompt-service.js` | Dead code |
| `utils/validation-utils.js` | Dead code |
| `data/prompts/chinese_prompt.md` | Reference only, not loaded |
| `data/prompts/western_prompt.md` | Reference only, not loaded |

---

## Section 6: Implementation Order

1. **Phase 1: Cleanup** — Delete dead code, fix bugs, create app.js/app.wxss
2. **Phase 2: Dependencies** — npm init, install Vant Weapp + mp-html, build npm
3. **Phase 3: Calculations** — Build calc-service.js with 八字/紫微/星座/塔罗
4. **Phase 4: UI Components** — Upgrade each page to Vant components (index → reading → chat → history → profile-form)
5. **Phase 5: Features** — Markdown rendering, auto-scroll, daily fortune, reading progress
6. **Phase 6: Polish** — Animations, transitions, error handling, edge cases

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vant Weapp package too large | Exceed 2MB limit | Use npm + lazy loading, only import needed components |
| 八字 calculation accuracy | Wrong predictions | Use verified lookup tables from `bazi.md`, add fallback to AI-only |
| mp-html compatibility | Markdown rendering broken | Test thoroughly, fallback to plain text `pre-wrap` |
| API key still exposed | Security risk | Accept for now (client-side mini program), add note for future cloud function migration |

---

## Success Criteria

1. All 12 known bugs fixed
2. Real calculation data appears in AI prompts
3. All 4 pages use Vant components
4. Chat renders markdown properly
5. Auto-scroll works in chat
6. History timestamps display correctly
7. No dead code remaining
8. App runs without errors in WeChat DevTools
