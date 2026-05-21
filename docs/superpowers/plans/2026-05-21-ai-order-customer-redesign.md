# 客户页分屏探索 UI 重构 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将客户点菜页从全屏聊天重构成"上菜下聊"分屏模式——上 60% 菜品网格（按口味分区，横向滑动卡片），下 35% 紧凑 AI 对话，底部购物车栏常驻

**Architecture:** 只修改 `ai-order/pages/customer/` 下的 4 个文件（JS/WXML/WXSS/JSON），不新增文件。后端 API 不变，复用现有 `/api/ai-order/*` 接口。核心改动：JS 新增口味分区数据、购物车、高亮联动、紧凑/展开双模式；WXML/WXSS 完全重写

**Tech Stack:** 微信小程序原生框架，`scroll-view` 横向/纵向滚动，CSS animation，localStorage

---

### Task 1: 重构 JS — 菜品数据+购物车状态+快捷操作

**Files:**
- Modify: `ai-order/pages/customer/customer.js` (全部重写)

**数据结构新增/改动 (data 部分):**
```js
data: {
  // 保留
  messages: [],
  inputText: '',
  loading: false,
  hasInput: false,
  merchantId: '',

  // 菜品网格
  tasteGroups: [],          // [{ taste: '麻辣', dishes: [...], color: '...' }]
  highlightedDishId: null,  // AI 关联高亮
  dishGradientMap: {},      // { dishId: 'background-style-string' }

  // 购物车
  cart: [],                 // [{ id, name, price, quantity }]
  totalPrice: 0,
  cartItemCount: 0,
  showCartPanel: false,
  orderNote: '',

  // 对话区模式
  chatExpanded: false,

  // 快捷提问
  quickReplies: ['看看菜单', '有什么推荐', '今天吃啥', '辣的'],
  lastOrder: null,          // localStorage 读出的上次点单
}
```

- [ ] **Step 1: 定义口味色系映射**

在 JS 顶部（Page 外）添加：

```js
var TASTE_CONFIG = {
  '麻辣': { bg: 'linear-gradient(135deg, #FF4500, #FF6B35)', light: '#FFF0ED' },
  '酸甜': { bg: 'linear-gradient(135deg, #FF8C00, #FFD700)', light: '#FFF8E1' },
  '咸甜': { bg: 'linear-gradient(135deg, #20B2AA, #48D1CC)', light: '#E0F7F5' },
  '清淡': { bg: 'linear-gradient(135deg, #66CDAA, #90EE90)', light: '#E8F5E9' }
};
var TASTE_DEFAULT = { bg: 'linear-gradient(135deg, #A8A8A8, #D0D0D0)', light: '#F5F5F5' };
```

- [ ] **Step 2: 重写 `loadMenu` → 将菜品按口味分组并计算渐变样式**

```js
loadMenu: function() {
  var that = this;
  var url = SERVER + '/api/ai-order/menu/list';
  if (that.data.merchantId) {
    url += '?merchantId=' + that.data.merchantId;
  }
  wx.request({
    url: url,
    timeout: 5000,
    success: function(res) {
      if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
        var rawMenu = res.data.data;
        menuData = rawMenu;
        var dishes = rawMenu.dishes || [];
        var groups = {};
        var gradientMap = {};
        for (var i = 0; i < dishes.length; i++) {
          var d = dishes[i];
          if (d.status !== 'online') continue;
          var taste = d.taste || '其他';
          if (!groups[taste]) groups[taste] = [];
          var tc = TASTE_CONFIG[taste] || TASTE_DEFAULT;
          d.bgStyle = tc.bg;
          d.avatarChar = d.name.slice(0, 1);
          groups[taste].push(d);
          gradientMap[d.id] = tc.bg;
        }
        var tasteGroups = [];
        var tasteOrder = ['麻辣', '酸甜', '咸甜', '清淡', '其他'];
        for (var t = 0; t < tasteOrder.length; t++) {
          var key = tasteOrder[t];
          if (groups[key] && groups[key].length > 0) {
            var tc = TASTE_CONFIG[key] || TASTE_DEFAULT;
            tasteGroups.push({ taste: key, dishes: groups[key], bgColor: tc.bg, lightColor: tc.light });
          }
        }
        that.setData({ tasteGroups: tasteGroups, dishGradientMap: gradientMap });
      }
    },
    fail: function(err) {
      console.warn('[customer] failed to load menu:', err);
    }
  });
},
```

- [ ] **Step 3: 购物车操作方法**

```js
addToCart: function(e) {
  var dishId = e.currentTarget.dataset.dishid;
  var dishName = e.currentTarget.dataset.name;
  var price = parseFloat(e.currentTarget.dataset.price) || 0;
  var cart = this.data.cart;
  var found = false;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].id === dishId) {
      cart[i].quantity += 1;
      found = true;
      break;
    }
  }
  if (!found) {
    cart.push({ id: dishId, name: dishName, price: price, quantity: 1 });
  }
  this._recalcCart(cart);
  wx.showToast({ title: '+1 ' + dishName, icon: 'none', duration: 1000 });
},

updateItemQty: function(e) {
  var dishId = e.currentTarget.dataset.dishid;
  var delta = parseInt(e.currentTarget.dataset.delta) || 0;
  var cart = this.data.cart;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].id === dishId) {
      cart[i].quantity = Math.max(0, cart[i].quantity + delta);
      if (cart[i].quantity <= 0) {
        cart.splice(i, 1);
      }
      break;
    }
  }
  this._recalcCart(cart);
},

_recalcCart: function(cart) {
  var total = 0;
  var count = 0;
  for (var i = 0; i < cart.length; i++) {
    total += cart[i].price * cart[i].quantity;
    count += cart[i].quantity;
  }
  this.setData({ cart: cart, totalPrice: total, cartItemCount: count });
},

onCartTap: function() {
  if (this.data.cart.length === 0) {
    wx.showToast({ title: '购物车是空的', icon: 'none' });
    return;
  }
  this.setData({ showCartPanel: true });
},

onCloseCartPanel: function() {
  this.setData({ showCartPanel: false, orderNote: '' });
},

onOrderNoteInput: function(e) {
  this.setData({ orderNote: e.detail.value });
},
```

- [ ] **Step 4: 重写提交订单方法（保存 localStorage + 对话区消息）**

```js
onSubmitOrder: function() {
  var that = this;
  var cart = this.data.cart;
  if (cart.length === 0) return;
  var dishNames = [];
  for (var i = 0; i < cart.length; i++) {
    for (var j = 0; j < cart[i].quantity; j++) {
      dishNames.push(cart[i].name);
    }
  }
  this.setData({ showCartPanel: false });
  wx.setStorageSync('ai-order-last-order', { dishes: dishNames, total: this.data.totalPrice });
  var orderMsg = {
    id: ++msgIdCounter,
    role: 'ai',
    content: '✅ 下单成功！\n已点：' + dishNames.join('、') + '\n合计：¥' + this.data.totalPrice + '\n\n感谢使用智能点菜，祝用餐愉快！'
  };
  var newMsgs = that.data.messages.concat([orderMsg]);
  that.setData({
    messages: newMsgs,
    cart: [],
    totalPrice: 0,
    cartItemCount: 0,
    chatExpanded: true
  });
  that._scrollChatBottom();
},
```

- [ ] **Step 5: 高亮/联动/对话展开方法**

```js
highlightDish: function(dishId) {
  var that = this;
  that.setData({ highlightedDishId: dishId });
  setTimeout(function() {
    that.setData({ highlightedDishId: null });
  }, 2000);
},

expandChat: function() {
  this.setData({ chatExpanded: true });
  var that = this;
  setTimeout(function() { that._scrollChatBottom(); }, 200);
},

collapseChat: function() {
  if (!this.data.inputText && !this.data.loading) {
    this.setData({ chatExpanded: false });
  }
},

onInput: function(e) {
  var value = e.detail.value;
  this.setData({
    inputText: value,
    hasInput: value.trim().length > 0,
    chatExpanded: true
  });
},

onSend: function() {
  var text = this.data.inputText.trim();
  if (!text) return;
  this.sendMessage(text);
  this.setData({ chatExpanded: true });
},

onChatBlur: function() {
  if (!this.data.inputText) {
    setTimeout(this.collapseChat.bind(this), 500);
  }
},
```

- [ ] **Step 6: 重写 `_handleResponse` 加入菜品关联高亮**

在 `_handleResponse` 中 AI 计算推荐菜品后，额外触发高亮：

```js
// 在原有逻辑末尾添加:
if (recommendations.length > 0) {
  var firstDish = recommendations[0];
  that.highlightDish(firstDish.id);
}
```

同时添加 `showLastOrder` 改为返回格式化数据供快捷 chip 使用：

```js
// 修改 showLastOrder 方法签名: 从 data 读取 lastOrder，不重新 fetch
// 在 onLoad 中读取
var savedOrder = wx.getStorageSync('ai-order-last-order');
this.setData({ lastOrder: savedOrder });
```

- [ ] **Step 7: 新增快捷回复 "上次点了什么" 重写**

```js
showLastOrder: function() {
  var that = this;
  var lastOrder = this.data.lastOrder;
  var msg = '';
  if (lastOrder && lastOrder.dishes && lastOrder.dishes.length > 0) {
    msg = '🕐 上次点单：\n' + lastOrder.dishes.join('、') + '\n合计：¥' + lastOrder.total;
  } else {
    msg = '还没有点单记录';
  }
  var userMsg = { id: ++msgIdCounter, role: 'user', content: '上次点了什么' };
  var aiMsg = { id: ++msgIdCounter, role: 'ai', content: msg };
  var newMsgs = that.data.messages.concat([userMsg, aiMsg]);
  that.setData({ messages: newMsgs, chatExpanded: true });
  that._scrollChatBottom();
},
```

- [ ] **Step 8: 提交**

```bash
git add ai-order/pages/customer/customer.js
git commit -m "feat(customer): restructure JS with dish grid, cart, highlight linkage"
```

---

### Task 2: 重构 WXML — 分屏布局：菜品网格区

**Files:**
- Modify: `ai-order/pages/customer/customer.wxml` (全部重写)

- [ ] **Step 1: 外层容器改为垂直分屏结构**

```xml
<!--ai-order/pages/customer/customer.wxml-->
<view class="customer-container">

  <!-- ========== 菜品网格区 ~60% ========== -->
  <scroll-view class="dish-grid-area" scroll-y enhanced show-scrollbar="{{false}}">
    <view wx:for="{{tasteGroups}}" wx:key="taste" class="taste-zone">
      <!-- 口味区头部 -->
      <view class="taste-header">
        <view class="taste-indicator" style="background: {{item.bgColor}}"></view>
        <text class="taste-label">{{item.taste}}</text>
      </view>
      <!-- 横向滑动卡片行 -->
      <scroll-view class="dish-row" scroll-x enhanced show-scrollbar="{{false}}">
        <view wx:for="{{item.dishes}}" wx:key="id" class="dish-card {{highlightedDishId === item.id ? 'pulse' : ''}}" catchtap="addToCart" data-dishid="{{item.id}}" data-name="{{item.name}}" data-price="{{item.price}}">
          <view class="dish-avatar" style="background: {{item.bgStyle}}">
            <text class="dish-avatar-char">{{item.avatarChar}}</text>
          </view>
          <text class="dish-card-name">{{item.name}}</text>
          <text class="dish-card-price">¥{{item.price}}</text>
          <view wx:if="{{item.spicyLevel > 0}}" class="spicy-indicator">
            <text wx:for="{{item.spicyLevel}}" wx:key="index">🌶</text>
          </view>
        </view>
      </scroll-view>
    </view>
    <!-- 底部留白 -->
    <view class="grid-bottom-spacer"></view>
  </scroll-view>
```

- [ ] **Step 2: 提交**

```bash
git commit -m "feat(customer): dish grid WXML with taste zones and horizontal scroll"
```

---

### Task 3: 重构 WXML — 分屏布局：快速提问栏 + AI 对话区 + 购物车栏 + 下单面板

- [ ] **Step 1: 在菜片区之后写入快速提问栏、对话区、输入栏、购物车栏、下单面板**

```xml
  <!-- ========== 快速提问栏 ========== -->
  <view class="quick-chips">
    <scroll-view scroll-x enhanced show-scrollbar="{{false}}" class="chips-scroll">
      <view wx:for="{{quickReplies}}" wx:key="index" class="chip" catchtap="onQuickReply" data-text="{{item}}">
        <text>{{item}}</text>
      </view>
      <view wx:if="{{lastOrder && lastOrder.dishes && lastOrder.dishes.length > 0}}" class="chip chip-reorder" catchtap="showLastOrder">
        <text>🔄 再来一单</text>
      </view>
    </scroll-view>
  </view>

  <!-- ========== AI 对话区 ~35% ========== -->
  <scroll-view class="chat-area {{chatExpanded ? 'expanded' : 'compact'}}" scroll-y enhanced show-scrollbar="{{false}}" scroll-into-view="{{chatScrollToId}}" scroll-with-animation>
    <!-- 对话区折叠提示 -->
    <view wx:if="{{!chatExpanded && messages.length > 2}}" class="chat-collapse-hint">
      <text class="hint-line"></text>
      <text class="hint-text">展开全部对话</text>
      <text class="hint-line"></text>
    </view>

    <view wx:for="{{messages}}" wx:key="id" class="msg-wrapper" id="msg-{{item.id}}">
      <!-- AI 消息 -->
      <view wx:if="{{item.role === 'ai'}}" class="msg-row ai">
        <view class="ai-avatar-mini">
          <text class="ai-avatar-text">AI</text>
        </view>
        <view class="msg-content">
          <view class="bubble ai-bubble">
            <text class="bubble-text" selectable="true" user-select="true">{{item.content}}</text>
          </view>
          <!-- 推荐菜品快捷加入 -->
          <view wx:if="{{item.recommendations && item.recommendations.length > 0}}" class="rec-actions">
            <view wx:for="{{item.recommendations}}" wx:key="id" class="rec-btn" catchtap="addToCart" data-dishid="{{item.id}}" data-name="{{item.name}}" data-price="{{item.price}}">
              <text>+ {{item.name}}</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 用户消息 -->
      <view wx:if="{{item.role === 'user'}}" class="msg-row user">
        <view class="bubble user-bubble">
          <text class="bubble-text user-bubble-text" selectable="true" user-select="true">{{item.content}}</text>
        </view>
      </view>
    </view>

    <!-- 加载指示 -->
    <view wx:if="{{loading}}" class="msg-wrapper">
      <view class="msg-row ai">
        <view class="ai-avatar-mini">
          <text class="ai-avatar-text">AI</text>
        </view>
        <view class="bubble ai-bubble typing-bubble">
          <view class="typing-indicator">
            <view class="typing-dot"></view>
            <view class="typing-dot"></view>
            <view class="typing-dot"></view>
          </view>
        </view>
      </view>
    </view>

    <view class="chat-bottom" id="chat-bottom"></view>
  </scroll-view>

  <!-- ========== 输入栏 ========== -->
  <view class="input-section">
    <view class="input-bar">
      <input class="msg-input"
        placeholder="输入想吃的口味..."
        value="{{inputText}}"
        bindinput="onInput"
        bindfocus="expandChat"
        bindblur="onChatBlur"
        confirm-type="send"
        bindconfirm="onSend"
        cursor-spacing="20"
      />
      <view class="send-btn {{hasInput ? 'active' : ''}}" bindtap="onSend">
        <text class="icon-send">↑</text>
      </view>
    </view>
  </view>

  <!-- ========== 购物车栏（常驻底部） ========== -->
  <view wx:if="{{cartItemCount > 0}}" class="cart-bar">
    <view class="cart-bar-left">
      <view class="cart-icon-wrap">
        <text class="cart-icon">🛒</text>
        <text class="cart-badge">{{cartItemCount}}</text>
      </view>
      <view class="cart-summary">
        <text class="cart-label">购物车</text>
        <text class="cart-total">¥{{totalPrice}}</text>
      </view>
    </view>
    <view class="cart-checkout-btn" catchtap="onCartTap">
      <text>去下单</text>
    </view>
  </view>

  <!-- ========== 半屏下单面板 ========== -->
  <view wx:if="{{showCartPanel}}" class="cart-panel-overlay" catchtap="onCloseCartPanel">
    <view class="cart-panel" catchtap="">
      <view class="panel-header">
        <text class="panel-title">确认订单</text>
        <view class="panel-close" catchtap="onCloseCartPanel">
          <text>✕</text>
        </view>
      </view>
      <scroll-view class="panel-dish-list" scroll-y>
        <view wx:for="{{cart}}" wx:key="id" class="panel-dish-item">
          <view class="panel-dish-info">
            <text class="panel-dish-name">{{item.name}}</text>
            <text class="panel-dish-price">¥{{item.price}}</text>
          </view>
          <view class="panel-qty-controls">
            <view class="qty-btn" catchtap="updateItemQty" data-dishid="{{item.id}}" data-delta="{{-1}}">−</view>
            <text class="qty-num">{{item.quantity}}</text>
            <view class="qty-btn qty-plus" catchtap="updateItemQty" data-dishid="{{item.id}}" data-delta="{{1}}">+</view>
          </view>
        </view>
      </scroll-view>
      <input class="panel-note" placeholder="备注（选填）" value="{{orderNote}}" bindinput="onOrderNoteInput" />
      <view class="panel-footer">
        <text class="panel-total">合计：¥{{totalPrice}}</text>
        <view class="panel-confirm-btn" catchtap="onSubmitOrder">确认下单</view>
      </view>
    </view>
  </view>

</view>
```

- [ ] **Step 2: 移除旧文件内容，写入新内容**

文件完整内容即上面 Step 1 的 XML。

- [ ] **Step 3: 提交**

```bash
git add ai-order/pages/customer/customer.wxml
git commit -m "feat(customer): split-screen WXML - dish grid, compact chat, cart panel"
```

---

### Task 4: 重构 WXSS — 菜品网格样式（口味分区 + 卡片 + 高亮动画）

**Files:**
- Modify: `ai-order/pages/customer/customer.wxss` (全部重写)

- [ ] **Step 1: 基础容器 + 菜品网格区样式**

```css
/* ai-order/pages/customer/customer.wxss - Split Screen Explorer */

.customer-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F8F9FA;
  overflow: hidden;
}

/* ====== 菜品网格区 ====== */
.dish-grid-area {
  flex: 0 0 auto;
  max-height: 60vh;
  background: #FFFFFF;
  padding: 16rpx 0 0;
}

.taste-zone {
  margin-bottom: 24rpx;
}

.taste-header {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  margin-bottom: 12rpx;
}

.taste-indicator {
  width: 8rpx;
  height: 32rpx;
  border-radius: 4rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.taste-label {
  font-size: 28rpx;
  font-weight: 700;
  color: #1A1A1A;
}

/* 横向卡片行 */
.dish-row {
  display: flex;
  flex-direction: row;
  white-space: nowrap;
  padding: 0 16rpx;
  padding-bottom: 8rpx;
}

/* 菜品卡片 */
.dish-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 160rpx;
  background: #FFFFFF;
  border: 2rpx solid rgba(0,0,0,0.04);
  border-radius: 20rpx;
  padding: 20rpx 12rpx;
  margin: 0 8rpx;
  flex-shrink: 0;
  transition: all 0.3s ease;
  position: relative;
}

.dish-card:active {
  transform: scale(0.95);
  opacity: 0.85;
}

/* 高亮脉冲动画 */
.dish-card.pulse {
  animation: dishPulse 0.6s ease-in-out 3;
  border-color: #f5576c;
  box-shadow: 0 0 20rpx rgba(245,87,108,0.3);
}

@keyframes dishPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(245,87,108,0); }
  50% { transform: scale(1.08); box-shadow: 0 0 30rpx rgba(245,87,108,0.4); }
}

/* 首字渐变头像 */
.dish-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  box-shadow: 0 6rpx 20rpx rgba(0,0,0,0.1);
}

.dish-avatar-char {
  font-size: 44rpx;
  font-weight: 700;
  color: #FFFFFF;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.15);
}

.dish-card-name {
  font-size: 24rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.dish-card-price {
  font-size: 28rpx;
  font-weight: 700;
  color: #f5576c;
}

.spicy-indicator {
  display: flex;
  flex-direction: row;
  font-size: 16rpx;
  margin-top: 4rpx;
}

.grid-bottom-spacer {
  height: 16rpx;
}
```

- [ ] **Step 2: 提交**

```bash
git commit -m "feat(customer): dish grid styles - taste zones, gradient avatars, pulse animation"
```

---

### Task 5: 重构 WXSS — 快速提问栏 + AI 对话区 + 购物车栏 + 下单面板

- [ ] **Step 1: 在 WXSS 文件末尾追加以下样式**

```css
/* ====== 快速提问栏 ====== */
.quick-chips {
  flex-shrink: 0;
  padding: 8rpx 16rpx;
  background: #FFFFFF;
  border-bottom: 1rpx solid rgba(0,0,0,0.04);
}

.chips-scroll {
  display: flex;
  flex-direction: row;
  white-space: nowrap;
}

.chip {
  display: inline-flex;
  padding: 12rpx 24rpx;
  background: #F2F2F7;
  border-radius: 32rpx;
  margin-right: 12rpx;
  font-size: 24rpx;
  color: #666;
  flex-shrink: 0;
}

.chip:active {
  background: #f5576c;
  color: #FFFFFF;
}

.chip-reorder {
  background: #FFF0F3;
  color: #f5576c;
}

.chip-reorder:active {
  background: #f5576c;
  color: #fff;
}

/* ====== AI 对话区 ====== */
.chat-area {
  flex: 1;
  min-height: 120rpx;
  padding: 8rpx 0;
  background: #FFFFFF;
  transition: all 0.3s ease;
}

/* 紧凑模式：只显示最近 2 条 */
.chat-area.compact .msg-wrapper:nth-last-child(-n+2 of .msg-wrapper) {
  display: flex;
}
.chat-area.compact .msg-wrapper {
  display: none;
}

/* 展开模式 */
.chat-area.expanded {
  max-height: none;
}

/* 折叠提示 */
.chat-collapse-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx 24rpx;
  gap: 16rpx;
}

.hint-line {
  flex: 1;
  height: 1rpx;
  background: #E0E0E0;
}

.hint-text {
  font-size: 20rpx;
  color: #999;
  flex-shrink: 0;
}

/* ====== 消息行 ====== */
.msg-wrapper {
  margin-bottom: 16rpx;
  animation: fadeInUp 0.25s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.msg-row {
  display: flex;
  padding: 0 20rpx;
  align-items: flex-start;
}

.msg-row.user {
  justify-content: flex-end;
}

/* AI 头像（紧凑版：小圆标） */
.ai-avatar-mini {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #f5576c, #ff6b81);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 12rpx;
  margin-top: 6rpx;
}

.ai-avatar-text {
  font-size: 18rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.msg-content {
  max-width: 75%;
  display: flex;
  flex-direction: column;
}

/* 气泡 */
.bubble {
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  word-break: break-word;
  line-height: 1.5;
  font-size: 26rpx;
}

.ai-bubble {
  background: #F2F2F7;
  border-top-left-radius: 4rpx;
}

.user-bubble {
  background: linear-gradient(135deg, #f5576c, #ff6b81);
  border-top-right-radius: 4rpx;
  max-width: 70%;
}

.bubble-text {
  line-height: 1.5;
  user-select: true;
  -webkit-user-select: true;
}

.ai-bubble .bubble-text {
  color: #1A1A1A;
}

.user-bubble-text {
  color: #FFFFFF;
}

/* 推荐快捷加入按钮 */
.rec-actions {
  margin-top: 8rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.rec-btn {
  padding: 10rpx 20rpx;
  background: #FFF0F3;
  border: 1rpx solid #ffd6dd;
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #f5576c;
  font-weight: 600;
}

.rec-btn:active {
  background: #f5576c;
  color: #fff;
  border-color: #f5576c;
}

/* ====== 正在输入 ====== */
.typing-bubble {
  padding: 20rpx 24rpx;
  min-width: 80rpx;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 28rpx;
}

.typing-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #94A3B8;
  animation: typingBounce 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-8rpx); opacity: 1; }
}

.chat-bottom {
  height: 16rpx;
}

/* ====== 输入栏 ====== */
.input-section {
  flex-shrink: 0;
  background: #FFFFFF;
  border-top: 1rpx solid rgba(0,0,0,0.06);
  padding: 12rpx 20rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
}

.input-bar {
  display: flex;
  align-items: center;
  background: #F2F2F7;
  border-radius: 40rpx;
  padding: 4rpx 4rpx 4rpx 20rpx;
  min-height: 72rpx;
}

.msg-input {
  flex: 1;
  height: 64rpx;
  font-size: 28rpx;
  color: #1A1A1A;
  background: transparent;
}

.send-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #D1D5DB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.send-btn.active {
  background: linear-gradient(135deg, #f5576c, #ff6b81);
  box-shadow: 0 4rpx 16rpx rgba(245,87,108,0.3);
}

.icon-send {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 600;
  line-height: 1;
}

/* ====== 购物车栏 ====== */
.cart-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #1A1A1A;
  flex-shrink: 0;
}

.cart-bar-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.cart-icon-wrap {
  position: relative;
}

.cart-icon {
  font-size: 40rpx;
}

.cart-badge {
  position: absolute;
  top: -8rpx;
  right: -12rpx;
  background: #f5576c;
  color: #fff;
  font-size: 18rpx;
  font-weight: 700;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-summary {
  display: flex;
  flex-direction: column;
}

.cart-label {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
}

.cart-total {
  font-size: 30rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.cart-checkout-btn {
  padding: 16rpx 40rpx;
  background: linear-gradient(135deg, #f5576c, #ff6b81);
  color: #fff;
  border-radius: 36rpx;
  font-size: 26rpx;
  font-weight: 700;
}

.cart-checkout-btn:active {
  opacity: 0.85;
  transform: scale(0.96);
}

/* ====== 半屏下单面板 ====== */
.cart-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.cart-panel {
  width: 100%;
  max-height: 70vh;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.panel-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1A1A1A;
}

.panel-close {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #F2F2F7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #666;
}

.panel-dish-list {
  max-height: 40vh;
  overflow-y: auto;
}

.panel-dish-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F2F2F7;
}

.panel-dish-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.panel-dish-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.panel-dish-price {
  font-size: 24rpx;
  color: #f5576c;
  font-weight: 600;
}

.panel-qty-controls {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.qty-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #F2F2F7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #666;
}

.qty-btn:active {
  background: #E0E0E0;
}

.qty-plus {
  background: #FFF0F3;
  color: #f5576c;
}

.qty-num {
  font-size: 28rpx;
  font-weight: 700;
  color: #1A1A1A;
  min-width: 32rpx;
  text-align: center;
}

.panel-note {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  background: #F2F2F7;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #1A1A1A;
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #1A1A1A;
}

.panel-total {
  font-size: 32rpx;
  font-weight: 700;
  color: #1A1A1A;
}

.panel-confirm-btn {
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #f5576c, #ff6b81);
  color: #fff;
  border-radius: 36rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.panel-confirm-btn:active {
  opacity: 0.85;
  transform: scale(0.96);
}
```

- [ ] **Step 2: 使用完整的新 WXSS 替换旧文件的全部内容**

- [ ] **Step 3: 提交**

```bash
git add ai-order/pages/customer/customer.wxss
git commit -m "feat(customer): split-screen styles - chips, compact chat, cart bar, order panel"
```

---

### Task 6: JS 收尾 — 新增缺少的 `_scrollChatBottom` 方法，确保全部方法完整

- [ ] **Step 1: 在 JS 中添加 `_scrollChatBottom` 方法**

```js
_scrollChatBottom: function() {
  var that = this;
  setTimeout(function() {
    that.setData({ chatScrollToId: 'chat-bottom' });
  }, 100);
},
```

- [ ] **Step 2: 确认 `onQuickReply` 方法正确**

```js
onQuickReply: function(e) {
  var text = e.currentTarget.dataset.text;
  if (text === '看看菜单') {
    this.showMenuDirectly();
    return;
  }
  this.sendMessage(text);
},

showMenuDirectly: function() {
  var that = this;
  var menuText = '📋 当前菜单：\n\n';
  if (menuData && menuData.dishes) {
    for (var i = 0; i < menuData.dishes.length; i++) {
      var d = menuData.dishes[i];
      if (d.status === 'online') {
        menuText += '• ' + d.name + '  ¥' + d.price + '  (' + d.taste + ')\n';
      }
    }
  } else {
    menuText += '暂无菜单数据';
  }
  var userMsg = { id: ++msgIdCounter, role: 'user', content: '看看菜单' };
  var aiMsg = { id: ++msgIdCounter, role: 'ai', content: menuText };
  var newMsgs = that.data.messages.concat([userMsg, aiMsg]);
  that.setData({ messages: newMsgs, chatExpanded: true });
  that._scrollChatBottom();
},
```

- [ ] **Step 3: 确认 API 调用中的 `_scrollChatBottom` 替换旧的 `scrollToBottom`**

检查 `sendMessage`、`_handleResponse`、`_showError` 等方法中所有 `scrollToBottom` 调用，替换为 `_scrollChatBottom`。确认 `scrollToBottom` 方法从 data 的 `scrollTop` 改为 `chatScrollToId`。

```js
// 删除旧的 scrollToBottom 方法，统一使用 _scrollChatBottom
```

- [ ] **Step 4: 确认 `copyText` 方法保留**

```js
copyText: function(e) {
  wx.setClipboardData({ data: e.currentTarget.dataset.text || '' });
},
```

- [ ] **Step 5: 提交最终 JS**

```bash
git add ai-order/pages/customer/customer.js
git commit -m "feat(customer): final JS methods - chat scroll, quick reply, copy text"
```

---

### Task 7: 验证构建

- [ ] **Step 1: 检查 WXML 语法**

确认：
- 标签闭合正确
- `wx:for` 的 `wx:key` 值匹配数据字段
- 事件绑定方法名与 JS 一致
- `scroll-into-view` 目标 ID 存在

- [ ] **Step 2: 检查 WXSS 选择器与 WXML class 匹配**

对所有 WXML 中出现的 class 名（`customer-container`, `dish-grid-area`, `taste-zone` 等），确保 WXSS 中有对应选择器。

- [ ] **Step 3: 检查 JS 方法签名一致性**

确认 WXML 中 `catchtap` 绑定的方法都在 JS 中存在：
- `addToCart`, `onQuickReply`, `showLastOrder`
- `expandChat`, `onChatBlur`, `onInput`, `onSend`
- `onCartTap`, `onCloseCartPanel`, `onSubmitOrder`
- `updateItemQty`, `onOrderNoteInput`

- [ ] **Step 4: 提交收尾**

```bash
git add -A
git commit -m "chore: final verification and cleanup for customer redesign"
```
