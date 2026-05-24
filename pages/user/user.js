var loginLib = require('../../utils/login');
var validation = require('../../utils/validation');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    displayUserInfo: null,
    // 首次登录完善资料
    isNewUser: false,
    showFirstSetup: false,
    setupAvatarUrl: '/images/avatar-default.png',
    setupNickName: '',
    // 编辑昵称（非首次）
    showNickInput: false,
    nickName: ''
  },

  // ====== Lifecycle ======

  onShow: function () {
    var user = loginLib.getUserInfo();
    if (!user) {
      this.setData({ isLoggedIn: false, userInfo: null, displayUserInfo: null, showFirstSetup: false, isNewUser: false });
      return;
    }
    // 根据实际用户数据判断是否需要完善资料，不使用持久标志
    var needsSetup = !validation.isValidAvatarUrl(user.avatarUrl) || !validation.isValidNickname(user.nickName);
    var display = validation.getDisplayUserInfo(user, '微信用户');
    this.setData({
      isLoggedIn: true,
      userInfo: user,
      displayUserInfo: display,
      isNewUser: needsSetup,
      showFirstSetup: needsSetup
    });
  },

  // ====== 登录 ======

  handleLogin: function () {
    var that = this;
    wx.showLoading({ title: '登录中...', mask: true });
    loginLib.login().then(function (result) {
      wx.hideLoading();
      var user = result.user;
      var needsSetup = !validation.isValidAvatarUrl(user.avatarUrl) || !validation.isValidNickname(user.nickName);
      that.setData({
        isLoggedIn: true,
        userInfo: user,
        displayUserInfo: validation.getDisplayUserInfo(user, '微信用户'),
        isNewUser: needsSetup,
        showFirstSetup: needsSetup,
        setupAvatarUrl: user.avatarUrl || '/images/avatar-default.png',
        setupNickName: needsSetup ? '' : user.nickName
      });
      if (!needsSetup) wx.showToast({ title: '欢迎回来', icon: 'success' });
    }).catch(function () {
      wx.hideLoading();
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    });
  },

  // ====== 首次登录完善资料 ======

  onFirstSetupChooseAvatar: function (e) {
    var avatarUrl = e.detail.avatarUrl;
    if (avatarUrl) this.setData({ setupAvatarUrl: avatarUrl });
  },

  saveFirstSetupForm: function (e) {
    var formNick = e.detail.value.nickname;
    if (formNick) this.setData({ setupNickName: formNick });
    this.saveFirstSetup(formNick);
  },

  saveFirstSetup: function (formNick) {
    var that = this;
    var avatarUrl = that.data.setupAvatarUrl;
    var nickName = (formNick || that.data.setupNickName || '').trim();
    var avatarChanged = avatarUrl && avatarUrl !== '/images/avatar-default.png';
    var nickChanged = !!nickName;

    if (!nickChanged && !avatarChanged) {
      that.skipFirstSetup();
      return;
    }

    var serverAvatarUrl = null;

    function applyResult(user, toastTitle, toastIcon) {
      if (user) wx.setStorageSync('user', user);
      that.setData({
        showFirstSetup: false,
        isNewUser: false,
        userInfo: user,
        displayUserInfo: validation.getDisplayUserInfo(user, user && user.nickName)
      });
      if (toastTitle) wx.showToast({ title: toastTitle, icon: toastIcon || 'success' });
    }

    wx.showLoading({ title: '保存中...', mask: true });

    // Promise 瀑布流：上传头像 → updateProfile → 应用结果
    // 始终调用 updateProfile 确保 DB 也更新（避免下次登录旧数据覆盖缓存）
    var chain = Promise.resolve();

    if (avatarChanged) {
      chain = chain.then(function () {
        return new Promise(function (resolve, reject) {
          var cloudPath = 'avatars/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.jpg';
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: avatarUrl,
            success: function (res) {
              serverAvatarUrl = res.fileID;
              resolve(res.fileID);
            },
            fail: function () { reject(new Error('network_error')); }
          });
        });
      });
    }

    chain = chain.then(function () {
      var profileData = {};
      if (nickChanged) profileData.nickName = nickName;
      if (avatarChanged && serverAvatarUrl) profileData.avatarUrl = serverAvatarUrl;
      if (Object.keys(profileData).length === 0) return that.data.userInfo;
      return loginLib.updateProfile(profileData).then(function (u) {
        console.log('[DEBUG] updateProfile response:', JSON.stringify(u));
        return u;
      });
    });

    chain.then(function (user) {
      wx.hideLoading();
      applyResult(user, '资料已保存', 'success');
    }).catch(function (err) {
      wx.hideLoading();
      if (serverAvatarUrl) {
        var user = that.data.userInfo || {};
        var patched = Object.assign({}, user, { avatarUrl: serverAvatarUrl });
        if (nickChanged) patched.nickName = nickName;
        applyResult(patched, '头像已更新，昵称同步失败', 'none');
      } else {
        applyResult(null);
      }
    });
  },

  skipFirstSetup: function () {
    this.setData({ showFirstSetup: false, isNewUser: false });
    wx.showToast({ title: '已登录', icon: 'success' });
  },

  // ====== 头像（已登录后更换）======

  onChooseAvatar: function (e) {
    var avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) return;
    var that = this;
    wx.showLoading({ title: '上传中...', mask: true });
    var cloudPath = 'avatars/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.jpg';
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: avatarUrl,
      success: function (res) {
        wx.hideLoading();
        var data = { avatarUrl: res.fileID };
        var user = that.data.userInfo || {};
        var updated = Object.assign({}, user, { avatarUrl: data.avatarUrl });
        wx.setStorageSync('user', updated);
        that.setData({
          userInfo: updated,
          displayUserInfo: validation.getDisplayUserInfo(updated, updated.nickName)
        });
        wx.showToast({ title: '头像已更新', icon: 'success' });
      },
      fail: function () {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  onAvatarError: function () {
    var display = this.data.displayUserInfo;
    if (display && display.avatarUrl !== '/images/avatar-default.png') {
      display.avatarUrl = '/images/avatar-default.png';
      this.setData({ displayUserInfo: display });
    }
  },

  // ====== 昵称（已登录后编辑）======

  showNickInput: function () {
    this.setData({ showNickInput: true, nickName: (this.data.userInfo && this.data.userInfo.nickName) || '' });
  },

  confirmNicknameForm: function (e) {
    var nickName = e.detail.value.nickname;
    if (nickName) this.setData({ nickName: nickName });
    this.confirmNickname();
  },

  confirmNickname: function () {
    var that = this;
    var nickName = (this.data.nickName || '').trim();
    if (!nickName) return;
    wx.showLoading({ title: '保存中...', mask: true });
    loginLib.updateProfile({ nickName: nickName }).then(function (updated) {
      wx.hideLoading();
      wx.setStorageSync('hasSetNickname', true);
      that.setData({
        showNickInput: false,
        userInfo: updated,
        displayUserInfo: validation.getDisplayUserInfo(updated, updated.nickName)
      });
      wx.showToast({ title: '昵称已更新', icon: 'success' });
    }).catch(function () {
      wx.hideLoading();
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  cancelNickname: function () {
    this.setData({ showNickInput: false });
  },

  // ====== 退出 / 注销 ======

  handleLogout: function () {
    var that = this;
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: function (res) {
        if (res.confirm) {
          loginLib.logout();
          that.setData({ isLoggedIn: false, userInfo: null, displayUserInfo: null, isNewUser: false, showFirstSetup: false, showNickInput: false });
          wx.showToast({ title: '已退出', icon: 'none' });
        }
      }
    });
  },

  _showConfirm: function (title, content) {
    return new Promise(function (resolve) {
      wx.showModal({ title: title, content: content, success: function (res) { resolve(res.confirm); } });
    });
  },

  handleDeleteAccount: function () {
    var that = this;
    this._showConfirm('注销账号', '此操作不可恢复。将永久删除你的账号及所有关联数据（商家、菜单、学习记录等）。确定继续？')
      .then(function (confirmed) { if (!confirmed) return Promise.reject('cancelled'); return that._showConfirm('再次确认', '注销后所有数据将被永久删除'); })
      .then(function (confirmed2) { if (!confirmed2) return Promise.reject('cancelled'); return loginLib.deleteAccount(); })
      .then(function () {
        that.setData({ isLoggedIn: false, userInfo: null, displayUserInfo: null });
        wx.showToast({ title: '账号已注销', icon: 'success' });
      })
      .catch(function (err) { if (err !== 'cancelled') wx.showToast({ title: '注销失败', icon: 'none' }); });
  }
});