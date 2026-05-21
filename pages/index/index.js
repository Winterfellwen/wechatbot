var loginLib = require('../../utils/login');
var validation = require('../../utils/validation');

Page({
  data: {
    userInfo: null,
    displayUserInfo: null,
    isLoggedIn: false,
    greeting: '你好',
    teacherVisible: false
  },

  getGreeting: function () {
    var h = new Date().getHours();
    if (h >= 6 && h < 12) return '早上好';
    if (h >= 12 && h < 14) return '中午好';
    if (h >= 14 && h < 18) return '下午好';
    if (h >= 18 && h < 22) return '晚上好';
    return '夜深了';
  },

  onShow: function () {
    var loggedIn = loginLib.isLoggedIn();
    var user = loggedIn ? loginLib.getUserInfo() : null;
    var displayUserInfo = validation.getDisplayUserInfo(user, '游客');
    this.setData({
      isLoggedIn: loggedIn,
      userInfo: user,
      displayUserInfo: displayUserInfo,
      greeting: this.getGreeting()
    });
  },

  handleUserTap: function () {
    wx.switchTab({ url: '/pages/user/user' });
  },

  onAvatarError: function () {
    this.setData({ userInfo: { avatarUrl: '/images/avatar-default.png' } });
  },

  onReady: function () {
    var that = this;
    this._observer = wx.createIntersectionObserver(this);
    this._observer.relativeToViewport({ bottom: 100 }).observe('.teacher-card', function (res) {
      if (res.intersectionRatio > 0) {
        that.setData({ teacherVisible: true });
        that._observer.disconnect();
      }
    });
    that._drawCanvasIcons();
  },

  _drawCanvasIcons: function () {
    var dpr = wx.getSystemInfoSync().pixelRatio || 2;
    var that = this;
    var drawFn = { 'learn': '_drawLearn', 'tool': '_drawTool', 'order': '_drawOrder' };
    Object.keys(drawFn).forEach(function (id) {
      wx.createSelectorQuery().select('#icon-' + id).node(function (res) {
        var canvas = res.node;
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var px = 72;
        canvas.width = px * dpr;
        canvas.height = px * dpr;
        ctx.scale(dpr, dpr);
        that[drawFn[id]](ctx, px);
      }).exec();
    });
  },

  _drawLearn: function (ctx, px) {
    var s = px / 100;
    ctx.save();
    // left page
    ctx.beginPath();
    ctx.moveTo(20 * s, 20 * s);
    ctx.quadraticCurveTo(25 * s, 18 * s, 48 * s, 20 * s);
    ctx.lineTo(48 * s, 78 * s);
    ctx.quadraticCurveTo(25 * s, 76 * s, 20 * s, 78 * s);
    ctx.closePath();
    ctx.fillStyle = '#7C3AED';
    ctx.fill();
    // right page
    ctx.beginPath();
    ctx.moveTo(52 * s, 20 * s);
    ctx.quadraticCurveTo(75 * s, 18 * s, 80 * s, 20 * s);
    ctx.lineTo(80 * s, 78 * s);
    ctx.quadraticCurveTo(75 * s, 76 * s, 52 * s, 78 * s);
    ctx.closePath();
    ctx.fillStyle = '#8B5CF6';
    ctx.fill();
    // spine
    ctx.beginPath();
    ctx.moveTo(48 * s, 20 * s);
    ctx.lineTo(48 * s, 78 * s);
    ctx.strokeStyle = '#5B21B6';
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    ctx.moveTo(52 * s, 20 * s);
    ctx.lineTo(52 * s, 78 * s);
    ctx.stroke();
    // bookmark
    ctx.beginPath();
    ctx.moveTo(48 * s, 74 * s);
    ctx.lineTo(42 * s, 82 * s);
    ctx.lineTo(50 * s, 84 * s);
    ctx.lineTo(58 * s, 82 * s);
    ctx.lineTo(52 * s, 74 * s);
    ctx.fillStyle = '#F59E0B';
    ctx.fill();
    ctx.restore();
  },

  _drawTool: function (ctx, px) {
    var s = px / 100;
    ctx.save();
    // document body
    ctx.beginPath();
    ctx.moveTo(24 * s, 16 * s);
    ctx.lineTo(66 * s, 16 * s);
    ctx.lineTo(76 * s, 26 * s);
    ctx.lineTo(76 * s, 84 * s);
    ctx.lineTo(24 * s, 84 * s);
    ctx.closePath();
    ctx.fillStyle = '#EC4899';
    ctx.fill();
    // folded corner
    ctx.beginPath();
    ctx.moveTo(66 * s, 16 * s);
    ctx.lineTo(66 * s, 26 * s);
    ctx.lineTo(76 * s, 26 * s);
    ctx.closePath();
    ctx.fillStyle = '#BE185D';
    ctx.fill();
    // text lines
    ctx.strokeStyle = '#FDF2F8';
    ctx.lineWidth = 3 * s;
    ctx.lineCap = 'round';
    [35, 47, 59, 71].forEach(function (y) {
      ctx.beginPath();
      ctx.moveTo(34 * s, y * s);
      ctx.lineTo(66 * s, y * s);
      ctx.stroke();
    });
    // gear/wheel on right
    var cx = 70 * s, cy = 50 * s, r = 16 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#FDF2F8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, (r - 5 * s), 0, Math.PI * 2);
    ctx.fillStyle = '#EC4899';
    ctx.fill();
    // gear teeth
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * (r - 1 * s), cy + Math.sin(a) * (r - 1 * s));
      ctx.rotate(a);
      ctx.fillStyle = '#FDF2F8';
      ctx.fillRect(-2 * s, -3 * s, 4 * s, 6 * s);
      ctx.restore();
    }
    ctx.restore();
  },

  _drawOrder: function (ctx, px) {
    var s = px / 100;
    ctx.save();
    // plate (ellipse via scaled arc)
    ctx.save();
    ctx.scale(1.3, 1);
    ctx.beginPath();
    ctx.arc(38.5 * s, 56 * s, 22 * s, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#F43F5E';
    ctx.fill();
    ctx.restore();
    // plate inner
    ctx.save();
    ctx.scale(1.3, 1);
    ctx.beginPath();
    ctx.arc(38.5 * s, 56 * s, 14 * s, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#FFF1F2';
    ctx.fill();
    ctx.restore();
    // chopstick 1
    ctx.beginPath();
    ctx.moveTo(34 * s, 24 * s);
    ctx.lineTo(46 * s, 56 * s);
    ctx.strokeStyle = '#9F1239';
    ctx.lineWidth = 3 * s;
    ctx.lineCap = 'round';
    ctx.stroke();
    // chopstick 2
    ctx.beginPath();
    ctx.moveTo(54 * s, 24 * s);
    ctx.lineTo(66 * s, 56 * s);
    ctx.strokeStyle = '#9F1239';
    ctx.lineWidth = 3 * s;
    ctx.stroke();
    // steam
    ctx.strokeStyle = '#FDA4AF';
    ctx.lineWidth = 2 * s;
    [62, 72, 82].forEach(function (x) {
      ctx.beginPath();
      ctx.moveTo(x * s, 38 * s);
      ctx.quadraticCurveTo((x - 4) * s, 32 * s, x * s, 26 * s);
      ctx.quadraticCurveTo((x + 4) * s, 20 * s, x * s, 14 * s);
      ctx.stroke();
    });
    ctx.restore();
  },

  onUnload: function () {
    if (this._observer) { this._observer.disconnect(); }
  },

  onShareAppMessage: function () {
    return { title: '多功能小机器人', path: '/pages/index/index' };
  },

  handleEntryTap: function (e) {
    var type = e.currentTarget.dataset.type;
    if (type === 'learn-hub') {
      wx.navigateTo({ url: '/pages/learnhub/learnhub' });
    } else if (type === 'tool-hub') {
      wx.navigateTo({ url: '/pages/toolhub/toolhub' });
    } else if (type === 'assistant') {
      wx.navigateTo({ url: '/smart-teacher/pages/chat/chat' });
    } else if (type === 'ai-order') {
      wx.navigateTo({ url: '/ai-order/pages/index/index' });
    } else if (type === 'developing') {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  }
});
