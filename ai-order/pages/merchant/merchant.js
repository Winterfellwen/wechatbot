var loginLib = require('../../../utils/login');
var DEMO_MERCHANT_IDS = ['demo-restaurant-1', 'demo-restaurant-2', 'demo-restaurant-3'];
var msgIdCounter = 0;
var menuData = null;

var TASTE_CONFIG = {
  '麻辣': { bg: 'linear-gradient(135deg, #FF4500, #FF6B35)', light: '#FFF0ED' },
  '酸甜': { bg: 'linear-gradient(135deg, #FF8C00, #FFD700)', light: '#FFF8E1' },
  '咸甜': { bg: 'linear-gradient(135deg, #20B2AA, #48D1CC)', light: '#E0F7F5' },
  '清淡': { bg: 'linear-gradient(135deg, #66CDAA, #90EE90)', light: '#E8F5E9' }
};
var TASTE_DEFAULT = { bg: 'linear-gradient(135deg, #A8A8A8, #D0D0D0)', light: '#F5F5F5' };
var GROUP_CONFIGS = {
  category: {
    '主食': { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', light: '#FFF8E1' },
    '菜': { bg: 'linear-gradient(135deg, #FF4500, #FF6B35)', light: '#FFF0ED' },
    '汤': { bg: 'linear-gradient(135deg, #4A90D9, #7EC8E3)', light: '#E8F4FD' }
  },
  price: {
    '~¥20': { bg: 'linear-gradient(135deg, #66CDAA, #90EE90)', light: '#E8F5E9' },
    '¥20~¥50': { bg: 'linear-gradient(135deg, #FF8C00, #FFB74D)', light: '#FFF3E0' },
    '¥50+': { bg: 'linear-gradient(135deg, #AB47BC, #CE93D8)', light: '#F3E5F5' }
  }
};
var CATEGORY_DEFAULT = { bg: 'linear-gradient(135deg, #A8A8A8, #D0D0D0)', light: '#F5F5F5' };

Page({
  data: {
    messages: [],
    inputText: '',
    loading: false,
    scrollTop: 0,
    hasInput: false,
    merchantId: '',
    showMenuOverlay: false,
    menuOverlayDishes: [],
    tasteGroups: [],
    groupMode: 'taste',
    groupModeLabel: '按口味',
    groupModes: [{ key: 'taste', label: '按口味' }, { key: 'category', label: '按分类' }, { key: 'price', label: '按价格' }],
    pendingImages: null,
    pendingDishId: '',
    pendingDishName: ''
  },

  onLoad: function(options) {
    var that = this;
    var merchantId = options.merchantId || '';
    msgIdCounter = 0;
    that.setData({ merchantId: merchantId });
    var merchantName = wx.getStorageSync('ai-order-merchant-name') || '';
    wx.setNavigationBarTitle({ title: merchantName ? merchantName + ' - AI菜单助手' : 'AI菜单助手' });
    that.addWelcomeMessage();
    that.loadMenu();
  },

  loadMenu: function() {
    var that = this;
    var merchantId = that.data.merchantId;
    var cacheKey = 'menu-cache-' + merchantId;

    if (merchantId && DEMO_MERCHANT_IDS.indexOf(merchantId) !== -1) {
      that._loadMenuFromDemoData(merchantId);
      return;
    }
    loginLib.callCloud('ai-order-menu', { action: 'list', merchantId: merchantId })
      .then(function(data) {
        if (data && data.success && data.data) {
          menuData = data.data;
          var cacheInfo = {
            menu: data.data,
            updatedAt: data.updatedAt || new Date().toISOString(),
            etag: data.etag || null
          };
          wx.setStorageSync(cacheKey, cacheInfo);
        }
      })
      .catch(function(err) {
        console.warn('[merchant] failed to load menu:', err);
        var cached = wx.getStorageSync(cacheKey);
        if (cached && cached.menu) {
          menuData = cached.menu;
        }
      });
  },

  _loadMenuFromDemoData: function(merchantId) {
    var demoMenus = require('../../data/demo-menus');
    var found = demoMenus.getMerchant(merchantId);
    if (found) {
      var menu = { dishes: found.dishes || [] };
      menuData = menu;
      wx.setStorageSync('menu-cache-' + merchantId, {
        menu: menu,
        updatedAt: new Date().toISOString(),
        etag: null
      });
    }
  },

  saveMenu: function(menu) {
    var that = this;
    var merchantId = that.data.merchantId;
    if (!merchantId || !menu) return;

    var cacheKey = 'menu-cache-' + merchantId;
    var cached = wx.getStorageSync(cacheKey);
    var expectedEtag = cached && cached.etag ? cached.etag : null;

    loginLib.callCloud('ai-order-menu', {
      action: 'save',
      merchantId: merchantId,
      menu: menu,
      expectedEtag: expectedEtag
    })
      .then(function(data) {
        var newCacheInfo = {
          menu: menu,
          updatedAt: new Date().toISOString(),
          etag: data.etag || new Date().getTime().toString()
        };
        wx.setStorageSync(cacheKey, newCacheInfo);
      })
      .catch(function(err) {
        if (err && err.error === 'CONFLICT') {
          that.loadMenu();
          wx.showToast({ title: '菜单已被修改，请重试', icon: 'none', duration: 2000 });
        } else {
          console.warn('[merchant] failed to save menu:', err);
        }
      });
  },

  addWelcomeMessage: function() {
    var welcomeMsg = {
      id: ++msgIdCounter,
      role: 'ai',
      content: '你好，我是AI菜单助手！\n请选择你要做的操作：',
      actions: [
        { id: '__send__0', label: '📝 添加菜品', type: 'primary', data: { reply: '我要添加菜品' } },
        { id: '__send__1', label: '✏️ 修改菜品', type: 'default', data: { reply: '我要修改菜品' } },
        { id: '__send__2', label: '🗑️ 删除菜品', type: 'danger', data: { reply: '我要删除菜品' } },
        { id: '__view_menu__', label: '📋 查看菜单', type: 'ghost', data: {} }
      ]
    };
    this.setData({ messages: [welcomeMsg] });
  },

  scrollToBottom: function() {
    var that = this;
    setTimeout(function() {
      that.setData({ scrollTop: 999999 });
    }, 100);
  },

  onInput: function(e) {
    var value = e.detail.value;
    this.setData({
      inputText: value,
      hasInput: value.trim().length > 0
    });
  },

  onSend: function() {
    var text = this.data.inputText.trim();
    if (!text) return;
    this.sendMessage(text);
  },

  _buildApiMessages: function(messages) {
    var menuText = '';
    if (menuData && menuData.dishes) {
      menuText = '\n\n当前菜单（' + menuData.dishes.length + ' 道菜品）：\n';
      for (var mi = 0; mi < menuData.dishes.length; mi++) {
        var dd = menuData.dishes[mi];
        var status = dd.status === 'online' ? '' : '【已下架】';
        menuText += '- ID:' + dd.id + ' ' + dd.name + ' ¥' + dd.price + ' ' + (dd.taste || '') + ' ' + (dd.category || '') + ' ' + status + '\n';
      }
    }
    var apiMessages = [{
      role: 'system',
      content: '你是一位专业的AI菜单助手，帮助商家管理菜品。采用**引导式工作流**，每次回复在末尾提供可点击选项按钮。' + menuText + '\n\n' +
        '## 工作流规则\n\n' +
        '### 操作风格\n' +
        '- **灵活接受信息**：商家一次提供了多少信息就用多少，不重复追问已提供的内容\n' +
        '- **添加时**：缺少口味/分类/描述等时问"需要我帮你补全其他信息吗？"，不强求\n' +
        '- **添加时始终提供图片选项**：确认添加后必须输出 image-options 代码块提供 [上传/AI/跳过] 三个按钮，除非商家已明确说不需要图片\n' +
        '- **修改时只改指定的字段**：商家说改什么就改什么，不询问补全，不覆盖未提及的字段\n' +
        '- **操作后引导**：添加/修改/删除/图片更新/取消 等任何操作完成后，**必须**输出 actions 代码块提供操作选项（添加菜品 / 修改菜品 / 删除菜品 / 查看菜单 / 完成），不得只回复文字\n\n' +
        '### 系统事件消息（前端自动发送，操作已由前端执行完毕）\n' +
        '当用户发送以下格式消息时，它们是前端在数据库操作完成后自动发送的，不是用户打字输入的：\n' +
        '- "菜品「XXX」已确认添加" → 菜品已入库。回复确认并**必须**输出 image-options 代码块（提供上传/AI/跳过三个选项），最后给后续选项\n' +
        '- "菜品「XXX」已修改" → 菜品已更新。回复确认，给后续选项\n' +
        '- "菜品「XXX」已删除" → 菜品已删除。回复确认，给后续选项\n' +
        '- "取消" → 用户取消了操作。回复确认，给主操作选项\n' +
        '- "跳过图片，不需要了" → 用户跳过图片。回复确认，给后续选项\n' +
        '- "菜品图片已更新" → 图片已保存。回复确认，**必须**输出 actions 代码块提供后续操作选项\n' +
        '- "未找到菜品「XXX」…" 或 "修改/删除失败…" → 操作失败。回复说明，让用户确认名称后重试\n' +
        '**重要：这些消息表示数据库操作已被前端执行，你不需要再输出 dish-add/dish-modify/dish-remove 等操作代码块！**\n\n' +
        '### 通用选项按钮\n' +
        '在回复末尾输出 actions 代码块提供可点击按钮：\n' +
        '```actions\n' +
        '[{"label":"按钮文字","type":"primary|default|danger|ghost","reply":"点击后发送的回复"}]\n' +
        '```\n' +
        '注意：\n' +
        '- 涉及口味时给出常见按钮：咸鲜、酸甜、麻辣、清淡等\n' +
        '- 涉及分类时给出：热菜、凉菜、汤品、主食、饮品等\n' +
        '- 确认步骤给出：确认 / 取消\n' +
        '- 操作完成后给出全部操作选项：添加菜品 / 修改菜品 / 删除菜品 / 查看菜单 / 完成\n' +
        '- __view_menu__ 作为 reply 值会直接打开菜单预览\n\n' +
        '### 添加菜品\n' +
        '当商家要求添加菜品时：\n' +
        '1. 从商家消息中提取已有信息（名称、价格、口味、分类等），用了即可\n' +
        '2. 如果只有名称和价格，问"需要我帮你补全口味/分类等信息吗？"\n' +
        '3. 如果商家同意，给出建议让商家确认，允许修改\n' +
        '4. 确认后输出 dish-add 代码块\n\n' +
        '```dish-add\n{"name":"菜品名","price":价格数字,"taste":"口味","category":"分类","description":"简短描述","spicyLevel":辣度0-3}\n```\n' +
        '每次只能添加一道菜品，name 和 price 必填，其余选填。\n\n' +
        '### 修改菜品\n' +
        '当商家要求修改菜品时：\n' +
        '1. 只修改商家指定的字段（价格、口味、分类等），其他字段保持不变\n' +
        '2. 不要询问是否需要补全其他信息\n' +
        '3. 不要覆盖商家未提及的已有信息\n' +
        '4. 确认后输出 dish-modify JSON 代码块\n\n' +
        '```dish-modify\n{"name":"原菜品名","price":新价格,"taste":"新口味","category":"新分类","description":"新描述","spicyLevel":辣度0-3,"newName":"新名称"}\n```\n' +
        'name 必填（标识要修改的菜品），其余选填（只填要修改的字段）。\n\n' +
        '### 删除菜品\n' +
        '当商家要求删除菜品时，输出 dish-remove JSON 代码块：\n' +
        '```dish-remove\n{"name":"菜品名"}\n```\n\n' +
        '### 图片选项（每次添加菜品后必须输出）\n' +
        '菜品确认添加后，**必须**输出 image-options 代码块让用户选择图片处理方式：\n' +
        '```image-options\n{"dishName":"菜品名","dishId":"dish-xxx"}\n```\n' +
        '如果还没生成 dishId，dishId 留空。\n' +
        '用户有三个选项：上传图片 / AI提供图片 / 暂不需要。这是每次添加菜品后的必要步骤。\n\n' +
        '### 查看菜单\n' +
        '当商家要求查看完整菜单时，在回复末尾输出：\n' +
        '```menu-preview\n```\n\n' +
        '注意：\n' +
        '- dish-add、dish-modify、dish-remove、image-options、menu-preview、actions 代码块放在回复末尾，每次只输出一个操作代码块（可以与 actions 共存，actions 放在最后）\n' +
        '- **必须始终包含说明文字**：每个回复必须包含自然语言引导，不能只有代码块。代码块前面要有清晰说明（如"请确认："、"请选择图片："）。'
    }];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.role === 'user') {
        apiMessages.push({ role: 'user', content: m.content || '' });
      } else if (m.role === 'ai') {
        apiMessages.push({ role: 'assistant', content: m.content });
      }
    }
    return apiMessages;
  },

  _tryProxy: function(apiMessages, callback) {
    loginLib.callCloud('ai-order-chat', {
      action: 'chat',
      messages: apiMessages,
      mode: 'merchant',
      menuData: menuData
    })
      .then(function(data) {
        callback(true, { statusCode: 200, data: data });
      })
      .catch(function(err) {
        var errData = { error: err.error || 'cloud error' };
        if (err.statusCode) errData._statusCode = err.statusCode;
        callback(false, { statusCode: err.statusCode || 500, data: errData });
      });
  },

  _handleResponse: function(res) {
    var that = this;
    var reply = '';
    if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
      reply = res.data.choices[0].message.content || '';
      if (!reply) reply = '抱歉，现在访问的人数过多，请重试。';
    } else if (res.statusCode === 413) {
      reply = '消息过长，请缩短后重试。';
    } else if (res.data && res.data.error) {
      var err = res.data.error;
      var errMsg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
      if (errMsg.indexOf('401') > -1 || errMsg.indexOf('Insufficient credits') > -1) {
        reply = 'API额度不足或密钥无效，请联系管理员。';
      } else if (errMsg.indexOf('429') > -1 || errMsg.indexOf('rate limit') > -1) {
        reply = '请求过于频繁，请稍后再试。';
      } else {
        reply = '出错了：' + errMsg;
      }
    } else {
      reply = '抱歉，我暂时无法回答（HTTP ' + res.statusCode + '），请稍后再试。';
    }

    var displayReply = reply;
    var hasDishAdd = false, dishAddData = null;
    var hasDishRemove = false, dishRemoveData = null;
    var hasDishModify = false, dishModifyData = null;
    console.log('[merchant] AI reply:', reply.substring(0, 200));
    var hasImageOptions = false, imageOptionsData = null;
    var hasMenuPreview = false;

    // Parse dish-add
    var addMatch = reply.match(/```dish-add\s*\n([\s\S]*?)\n```/);
    if (addMatch) {
      try {
        var parsed = JSON.parse(addMatch[1]);
        if (parsed.name && typeof parsed.price === 'number') {
          hasDishAdd = true;
          dishAddData = parsed;
        }
      } catch(e) {
        console.warn('[merchant] dish-add parse error:', e);
      }
    }

    // Parse dish-remove
    var removeMatch = reply.match(/```dish-remove\s*\n([\s\S]*?)\n```/);
    if (removeMatch) {
      try {
        var parsed = JSON.parse(removeMatch[1]);
        if (parsed.name) {
          hasDishRemove = true;
          dishRemoveData = parsed;
        }
      } catch(e) {
        console.warn('[merchant] dish-remove parse error:', e);
      }
    }

    // Parse dish-modify
    var modifyMatch = reply.match(/```dish-modify\s*\n([\s\S]*?)\n```/);
    if (modifyMatch) {
      try {
        var parsed = JSON.parse(modifyMatch[1]);
        if (parsed.name) {
          hasDishModify = true;
          dishModifyData = parsed;
        }
      } catch(e) {
        console.warn('[merchant] dish-modify parse error:', e);
      }
    }

    // Parse image-options
    var imgMatch = reply.match(/```image-options\s*\n([\s\S]*?)\n```/);
    if (imgMatch) {
      try {
        var parsed = JSON.parse(imgMatch[1]);
        if (parsed.dishName) {
          hasImageOptions = true;
          imageOptionsData = parsed;
        }
      } catch(e) {
        console.warn('[merchant] image-options parse error:', e);
      }
    }

    // Parse menu-preview
    if (reply.indexOf('```menu-preview') >= 0) {
      hasMenuPreview = true;
    }

    // Parse generic actions
    var hasActions = false, actionsData = null;
    var actionsMatch = reply.match(/```actions\s*\n([\s\S]*?)\n```/);
    if (actionsMatch) {
      try {
        var parsed = JSON.parse(actionsMatch[1]);
        if (parsed && parsed.length > 0) {
          hasActions = true;
          actionsData = parsed;
        }
      } catch(e) {
        console.warn('[merchant] actions parse error:', e);
      }
    }

    // Clean all code blocks from display text
    displayReply = reply.replace(/```(?:dish-add|dish-remove|dish-modify|image-options|menu-preview|actions)\s*\n[\s\S]*?\n```/g, '').trim();

    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: displayReply };

    // Attach actions based on what was found (priority: dish-add > dish-modify > dish-remove > image-options > actions)
    console.log('[merchant] _handleResponse hasDishAdd=' + hasDishAdd + ' hasDishModify=' + hasDishModify + ' hasDishRemove=' + hasDishRemove + ' hasImageOptions=' + hasImageOptions + ' hasActions=' + hasActions + ' hasMenuPreview=' + hasMenuPreview);
    if (hasDishAdd) {
      aiMsg.actions = [
        { id: 'confirm-add', label: '✓ 确认添加', type: 'primary', data: dishAddData },
        { id: 'cancel', label: '✗ 取消', type: 'default' }
      ];
    } else if (hasDishRemove) {
      aiMsg.actions = [
        { id: 'confirm-remove', label: '✓ 确认删除', type: 'danger', data: dishRemoveData },
        { id: 'cancel', label: '✗ 取消', type: 'default' }
      ];
    } else if (hasDishModify) {
      aiMsg.actions = [
        { id: 'confirm-modify', label: '✓ 确认修改', type: 'primary', data: dishModifyData },
        { id: 'cancel', label: '✗ 取消', type: 'default' }
      ];
    } else if (hasDishRemove) {
      aiMsg.actions = [
        { id: 'confirm-remove', label: '✓ 确认删除', type: 'danger', data: dishRemoveData },
        { id: 'cancel', label: '✗ 取消', type: 'default' }
      ];
    } else if (hasImageOptions) {
      aiMsg.actions = [
        { id: 'upload-image', label: '📷 上传图片', type: 'default', data: imageOptionsData },
        { id: 'ai-image', label: '🤖 AI提供图片', type: 'primary', data: imageOptionsData },
        { id: 'skip-image', label: '⏭ 暂不需要', type: 'ghost' }
      ];
    } else if (hasActions) {
      aiMsg.actions = actionsData.map(function(a, idx) {
        return { id: '__send__' + idx, label: a.label, type: a.type || 'default', data: { reply: a.reply || a.label } };
      });
    }

    if (hasMenuPreview) {
      console.log('[merchant] _handleResponse: hasMenuPreview -> showMenuButton=true');
      aiMsg.showMenuButton = true;
    }

    that.setData({ messages: that.data.messages.concat([aiMsg]), loading: false });
    that.scrollToBottom();
  },

  _showError: function(msg) {
    var aiMsg = { id: ++msgIdCounter, role: 'ai', content: msg };
    this.setData({ messages: this.data.messages.concat([aiMsg]), loading: false });
    this.scrollToBottom();
  },

  sendMessage: function(text) {
    if (this.data.loading) return;
    var that = this;

    var userMsg = {
      id: ++msgIdCounter,
      role: 'user',
      content: text
    };

    var messages = this.data.messages.concat([userMsg]);
    this.setData({ messages: messages, inputText: '', loading: true, hasInput: false });
    this.scrollToBottom();

    var apiMessages = this._buildApiMessages(messages);
    var startTime = Date.now();

    that._attemptRequest(0, startTime, apiMessages);
  },

  _attemptRequest: function(retryCount, startTime, apiMessages) {
    if (Date.now() - startTime >= 180000) {
      this._showError('当前使用人数过多，请稍后再试');
      return;
    }
    var that = this;
    that._tryProxy(apiMessages, function(ok, res) {
      if (ok) { that._handleResponse(res); return; }
      if (res && res.data && res.data.error) {
        that._handleResponse(res);
        return;
      }
      that._scheduleRetry(retryCount, startTime, apiMessages);
    });
  },

  _scheduleRetry: function(retryCount, startTime, apiMessages) {
    var that = this;
    var delay = Math.min(2000 * Math.pow(1.5, retryCount), 8000);
    setTimeout(function() {
      that._attemptRequest(retryCount + 1, startTime, apiMessages);
    }, delay);
  },

  // ====== Action Handlers ======

  onActionTap: function(e) {
    var action = e.currentTarget.dataset.action;
    var data = e.currentTarget.dataset.data;
    console.log('[merchant] onActionTap action=' + action + ' data=', JSON.stringify(data));
    if (!action) return;

    // Generic send action (ids are __send__0, __send__1, ...)
    if (action && action.indexOf('__send__') === 0) {
      var reply = data && data.reply ? data.reply : '';
      console.log('[merchant] onActionTap __send__ handler, reply=' + reply);
      // __view_menu__ opens the menu overlay directly, not sent to AI
      if (reply === '__view_menu__') {
        this.onShowMenu();
        return;
      }
      if (reply) this.sendMessage(reply);
      return;
    }

    // View menu directly
    if (action === '__view_menu__') {
      console.log('[merchant] onActionTap __view_menu__ -> onShowMenu()');
      this.onShowMenu();
      return;
    }

    switch (action) {
      case 'confirm-add':
        this._executeAddDish(data);
        break;
      case 'confirm-modify':
        this._executeModifyDish(data);
        break;
      case 'confirm-remove':
        this._executeRemoveDish(data);
        break;
      case 'cancel':
        this.sendMessage('取消');
        break;
      case 'upload-image':
        this._pickAndUploadImage(data);
        break;
      case 'ai-image':
        this._searchAiImages(data);
        break;
      case 'skip-image':
        this.sendMessage('跳过图片，不需要了');
        break;
    }
  },

  _rebuildGroups: function(dishes, mode) {
    mode = mode || this.data.groupMode;
    var groups = {};
    var config = mode === 'taste' ? TASTE_CONFIG : GROUP_CONFIGS[mode] || {};
    var defaultCfg = mode === 'taste' ? TASTE_DEFAULT : CATEGORY_DEFAULT;

    for (var i = 0; i < dishes.length; i++) {
      var d = dishes[i];
      var key = '';
      if (mode === 'taste') {
        key = d.taste || '其他';
      } else if (mode === 'category') {
        key = d.category || '其他';
      } else if (mode === 'price') {
        var p = d.price;
        key = p <= 20 ? '~¥20' : (p <= 50 ? '¥20~¥50' : '¥50+');
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }

    var orderedKeys = [];
    if (mode === 'taste') orderedKeys = ['麻辣', '酸甜', '咸甜', '清淡', '其他'];
    else if (mode === 'category') orderedKeys = ['主食', '菜', '汤', '其他'];
    else if (mode === 'price') orderedKeys = ['~¥20', '¥20~¥50', '¥50+'];

    var result = [];
    for (var t = 0; t < orderedKeys.length; t++) {
      var key = orderedKeys[t];
      if (groups[key] && groups[key].length > 0) {
        var cfg = config[key] || defaultCfg;
        result.push({ taste: key, dishes: groups[key], bgColor: cfg.bg, lightColor: cfg.light });
      }
    }
    return result;
  },

  onShowMenu: function() {
    var dishes = (menuData && menuData.dishes) || [];
    console.log('[merchant] onShowMenu: total dishes=' + dishes.length + ' online dishes=', dishes.filter(function(d) { return d.status === 'online'; }).map(function(d) { return d.name + ' image=' + (d.image ? d.image.substring(0, 40) : 'EMPTY'); }));
    var enriched = [];
    for (var i = 0; i < dishes.length; i++) {
      var d = dishes[i];
      if (d.status === 'online') {
        d.bgStyle = (TASTE_CONFIG[d.taste] || TASTE_DEFAULT).bg;
        d.avatarChar = d.name.slice(0, 1);
        d.imageUrl = d.image || '';
        enriched.push(d);
      }
    }
    var groups = this._rebuildGroups(enriched, this.data.groupMode);
    this.setData({ showMenuOverlay: true, menuOverlayDishes: enriched, tasteGroups: groups });
  },

  onHideMenu: function() {
    this.setData({ showMenuOverlay: false, menuOverlayDishes: [], tasteGroups: [] });
  },

  onGroupModeChange: function(e) {
    var idx = e.detail.value;
    var modes = this.data.groupModes;
    if (modes && modes[idx]) {
      var mode = modes[idx].key;
      var label = modes[idx].label;
      var dishes = this.data.menuOverlayDishes;
      var groups = this._rebuildGroups(dishes, mode);
      this.setData({ groupMode: mode, groupModeLabel: label, tasteGroups: groups });
    }
  },

  onCloseImagePicker: function() {
    this.setData({ pendingImages: null, pendingDishId: '', pendingDishName: '' });
  },

  onUploadFromPicker: function(e) {
    var that = this;
    var dishId = e.currentTarget.dataset.dishid || '';
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(chooseRes) {
        wx.showLoading({ title: '上传中...', mask: true });
        var cloudPath = 'ai-order/' + that.data.merchantId + '/dishes/' + Date.now() + '.jpg';
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: chooseRes.tempFilePaths[0],
          success: function(upRes) {
            wx.hideLoading();
            that._updateDishImage(dishId, that.data.pendingDishName, upRes.fileID);
            that.setData({ pendingImages: null, pendingDishId: '', pendingDishName: '' });
          },
          fail: function() {
            wx.hideLoading();
            wx.showToast({ title: '上传失败', icon: 'none' });
          }
        });
      }
    });
  },

  onPickAiImage: function(e) {
    var that = this;
    var imgUrl = e.currentTarget.dataset.url;
    var dishId = this.data.pendingDishId;
    var dishName = this.data.pendingDishName;
    console.log('[merchant] onPickAiImage dishId=' + dishId + ' dishName=' + dishName + ' imgUrl=' + (imgUrl ? imgUrl.substring(0, 80) : 'EMPTY'));
    if (!imgUrl) return;

    wx.showLoading({ title: '下载图片中...', mask: true });
    // Download image from pexels to temp path
    wx.downloadFile({
      url: imgUrl,
      success: function(dlRes) {
        if (dlRes.statusCode !== 200) {
          wx.hideLoading();
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }
        // Upload to cloud storage
        var cloudPath = 'ai-order/' + that.data.merchantId + '/dishes/' + Date.now() + '.jpg';
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: dlRes.tempFilePath,
          success: function(upRes) {
            wx.hideLoading();
            var fileID = upRes.fileID;
            that._updateDishImage(dishId, that.data.pendingDishName, fileID);
            that.setData({ pendingImages: null, pendingDishId: '', pendingDishName: '' });
          },
          fail: function() {
            wx.hideLoading();
            wx.showToast({ title: '上传失败', icon: 'none' });
          }
        });
      },
      fail: function() {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  },

  // ====== Internal Actions ======

  _executeAddDish: function(data) {
    if (!menuData) menuData = { dishes: [] };
    if (!menuData.dishes) menuData.dishes = [];

    var newDish = {
      id: 'dish-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: data.name,
      price: data.price,
      image: '',
      description: data.description || '',
      taste: data.taste || '',
      spicyLevel: data.spicyLevel || 0,
      status: 'online',
      category: data.category || ''
    };

    menuData.dishes.push(newDish);
    this.saveMenu(menuData);

    this.sendMessage('菜品「' + data.name + '」已确认添加');
  },

  _executeModifyDish: function(data) {
    if (!menuData || !menuData.dishes) {
      this.sendMessage('修改失败，菜单数据不存在');
      return;
    }

    var name = data.name;
    var found = false;
    for (var i = 0; i < menuData.dishes.length; i++) {
      if (menuData.dishes[i].name === name) {
        if (typeof data.price === 'number') menuData.dishes[i].price = data.price;
        if (data.taste) menuData.dishes[i].taste = data.taste;
        if (data.category) menuData.dishes[i].category = data.category;
        if (data.description) menuData.dishes[i].description = data.description;
        if (typeof data.spicyLevel === 'number') menuData.dishes[i].spicyLevel = data.spicyLevel;
        if (data.image) menuData.dishes[i].image = data.image;
        if (data.newName) menuData.dishes[i].name = data.newName;
        found = true;
        break;
      }
    }

    if (!found) {
      this.sendMessage('未找到菜品「' + name + '」，无法修改');
      return;
    }

    this.saveMenu(menuData);
    this.sendMessage('菜品「' + name + '」已修改');
  },

  _executeRemoveDish: function(data) {
    if (!menuData || !menuData.dishes) {
      this.sendMessage('删除失败，菜单数据不存在');
      return;
    }

    var name = data.name;
    var found = false;
    for (var i = 0; i < menuData.dishes.length; i++) {
      if (menuData.dishes[i].name === name) {
        menuData.dishes.splice(i, 1);
        found = true;
        break;
      }
    }

    if (!found) {
      this.sendMessage('未找到菜品「' + name + '」，无法删除');
      return;
    }

    this.saveMenu(menuData);
    this.sendMessage('菜品「' + name + '」已删除');
  },

  _pickAndUploadImage: function(data) {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(chooseRes) {
        wx.showLoading({ title: '上传中...', mask: true });
        var cloudPath = 'ai-order/' + that.data.merchantId + '/dishes/' + Date.now() + '.jpg';
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: chooseRes.tempFilePaths[0],
          success: function(upRes) {
            wx.hideLoading();
            that._updateDishImage(data.dishId, data.dishName, upRes.fileID);
          },
          fail: function() {
            wx.hideLoading();
            wx.showToast({ title: '上传失败', icon: 'none' });
          }
        });
      }
    });
  },

  _searchAiImages: function(data) {
    var that = this;
    console.log('[merchant] _searchAiImages called with dishId=' + data.dishId + ' dishName=' + data.dishName);
    wx.showLoading({ title: '搜索图片中...', mask: true });

    loginLib.callCloud('ai-order-chat', {
      action: 'searchDishImages',
      dishName: data.dishName
    })
      .then(function(result) {
        wx.hideLoading();
        console.log('[merchant] _searchAiImages got ' + (result.images ? result.images.length : 0) + ' images');
        if (result.success && result.images && result.images.length > 0) {
          that.setData({
            pendingImages: result.images,
            pendingDishId: data.dishId,
            pendingDishName: data.dishName
          });
        } else {
          wx.showToast({ title: '未找到相关图片', icon: 'none' });
        }
      })
      .catch(function() {
        wx.hideLoading();
        wx.showToast({ title: '搜索图片失败', icon: 'none' });
      });
  },

  _updateDishImage: function(dishId, dishName, fileID) {
    console.log('[merchant] _updateDishImage dishId=' + dishId + ' dishName=' + dishName + ' fileID=' + (fileID ? fileID.substring(0, 60) : 'EMPTY'));
    if (!menuData || !menuData.dishes) {
      console.warn('[merchant] _updateDishImage: menuData is null or empty');
      wx.showToast({ title: '菜单数据异常', icon: 'none' });
      return;
    }

    console.log('[merchant] _updateDishImage: dishes count=' + menuData.dishes.length + ' names=' + menuData.dishes.map(function(d) { return d.name + '(' + d.image + ')'; }).join(', '));

    var found = false;
    var matchType = '';
    // First, try matching by dish ID
    if (dishId) {
      for (var i = 0; i < menuData.dishes.length; i++) {
        if (menuData.dishes[i].id === dishId) {
          console.log('[merchant] _updateDishImage: matched by ID ' + dishId);
          menuData.dishes[i].image = fileID;
          found = true;
          matchType = 'id';
          break;
        }
      }
    }

    // Second, try matching by dish name
    if (!found && dishName) {
      for (var i = 0; i < menuData.dishes.length; i++) {
        if (menuData.dishes[i].name === dishName) {
          console.log('[merchant] _updateDishImage: matched by name "' + dishName + '"');
          menuData.dishes[i].image = fileID;
          found = true;
          matchType = 'name';
          break;
        }
      }
      if (!found) console.warn('[merchant] _updateDishImage: name "' + dishName + '" not found among dishes');
    }

    // Last resort: most recent dish without an image
    if (!found) {
      console.log('[merchant] _updateDishImage: trying fallback (most recent without image)');
      for (var j = menuData.dishes.length - 1; j >= 0; j--) {
        if (!menuData.dishes[j].image) {
          console.log('[merchant] _updateDishImage: fallback matched dish "' + menuData.dishes[j].name + '"');
          menuData.dishes[j].image = fileID;
          found = true;
          matchType = 'fallback';
          break;
        }
      }
    }

    if (found) {
      console.log('[merchant] _updateDishImage: SUCCESS via ' + matchType + ', image now=' + menuData.dishes.map(function(d) { return d.name + ':' + (d.image ? d.image.substring(0, 30) : 'EMPTY'); }).join(' '));
      this.saveMenu(menuData);
      wx.showToast({ title: '图片已更新', icon: 'success' });
      this.sendMessage('菜品图片已更新');
    } else {
      console.warn('[merchant] _updateDishImage: FAILED - no matching dish found');
      wx.showToast({ title: '未找到对应菜品', icon: 'none' });
    }
  },

  _addSystemMessage: function(content) {
    var msg = { id: ++msgIdCounter, role: 'ai', content: content };
    this.setData({ messages: this.data.messages.concat([msg]) });
    this.scrollToBottom();
  },

  copyText: function(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.text || '' });
  }
});
