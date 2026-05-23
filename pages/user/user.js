var CONFIG = require('../../utils/config');
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
    console.log('[DEBUG] user.onShow: getUserInfo=', JSON.stringify(user));
    if (!user) {
      this.setData({ isLoggedIn: false, userInfo: null, displayUserInfo: null, showFirstSetup: false });
      console.log('[DEBUG] user.onShow: no user, showing login');
      return;
    }
    var firstLoginPending = wx.getStorageSync('firstLoginPending');
    console.log('[DEBUG] user.onShow: firstLoginPending=', firstLoginPending);
    var display = validation.getDisplayUserInfo(user, '微信用户');
    console.log('[DEBUG] user.onShow: displayUserInfo=', JSON.stringify(display));
    this.setData({
      isLoggedIn: true,
      userInfo: user,
      displayUserInfo: display,
      isNewUser: !!firstLoginPending,
      showFirstSetup: !!firstLoginPending
    });
  },

  // ====== 登录 ======

  handleLogin: function () {
    var that = this;
    wx.showLoading({ title: '登录中...', mask: true });
    loginLib.login().then(function (result) {
      wx.hideLoading();
      if (result.isNew) {
        wx.setStorageSync('firstLoginPending', true);
        that.setData({
          isLoggedIn: true,
          isNewUser: true,
          showFirstSetup: true,
          setupAvatarUrl: result.user.avatarUrl || '/images/avatar-default.png',
          setupNickName: result.user.nickName || '',
          userInfo: result.user,
          displayUserInfo: validation.getDisplayUserInfo(result.user, result.user.nickName || '新朋友')
        });
      } else {
        that.setData({
          isLoggedIn: true,
          isNewUser: false,
          showFirstSetup: false,
          userInfo: result.user,
          displayUserInfo: validation.getDisplayUserInfo(result.user, '微信用户')
        });
        wx.showToast({ title: '欢迎回来', icon: 'success' });
      }
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

    var token = wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN);
    var serverAvatarUrl = null;

    function applyResult(user, toastTitle, toastIcon) {
      console.log('[DEBUG] applyResult user:', JSON.stringify(user));
      wx.setStorageSync('hasSetNickname', true);
      wx.removeStorageSync('firstLoginPending');
      wx.setStorageSync(CONFIG.STORAGE_KEYS.USER, user);
      console.log('[DEBUG] storage after set:', JSON.stringify(wx.getStorageSync(CONFIG.STORAGE_KEYS.USER)));
      that.setData({
        showFirstSetup: false,
        isNewUser: false,
        userInfo: user,
        displayUserInfo: validation.getDisplayUserInfo(user, user.nickName)
      });
      console.log('[DEBUG] after setData, displayUserInfo:', that.data.displayUserInfo);
      if (toastTitle) wx.showToast({ title: toastTitle, icon: toastIcon || 'success' });
    }

    wx.showLoading({ title: '保存中...', mask: true });

    // Promise 瀑布流：上传头像 → 更新昵称 → 应用结果
    var chain = Promise.resolve();

    if (avatarChanged) {
      chain = chain.then(function () {
        return new Promise(function (resolve, reject) {
          wx.uploadFile({
            url: CONFIG.SERVER + '/api/upload/avatar',
            filePath: avatarUrl,
            name: 'avatar',
            header: { 'Authorization': 'Bearer ' + token },
            success: function (res) {
              if (res.statusCode === 200) {
                var data = JSON.parse(res.data);
                serverAvatarUrl = data.avatarUrl;
                resolve(data.avatarUrl);
              } else { reject(new Error('upload_failed')); }
            },
            fail: function () { reject(new Error('network_error')); }
          });
        });
      });
    }

    if (nickChanged) {
      chain = chain.then(function () {
        var profileData = { nickName: nickName };
        if (avatarChanged && serverAvatarUrl) profileData.avatarUrl = serverAvatarUrl;
        console.log('[DEBUG] updateProfile with:', JSON.stringify(profileData));
        return loginLib.updateProfile(profileData).then(function (u) {
          console.log('[DEBUG] updateProfile response:', JSON.stringify(u));
          return u;
        });
      });
    } else if (avatarChanged) {
      chain = chain.then(function () {
        var user = that.data.userInfo || {};
        var patched = Object.assign({}, user, { avatarUrl: serverAvatarUrl });
        console.log('[DEBUG] avatarOnly patched:', JSON.stringify(patched));
        return patched;
      });
    }

    chain.then(function (user) {
      wx.hideLoading();
      applyResult(user, '资料已保存', 'success');
    }).catch(function (err) {
      console.error('[DEBUG] saveFirstSetup catch:', err);
      wx.hideLoading();
      if (serverAvatarUrl) {
        var user = that.data.userInfo || {};
        var patched = Object.assign({}, user, { avatarUrl: serverAvatarUrl });
        if (nickChanged) patched.nickName = nickName;
        applyResult(patched, '头像已更新，昵称同步失败', 'none');
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  skipFirstSetup: function () {
    wx.removeStorageSync('firstLoginPending');
    this.setData({ showFirstSetup: false, isNewUser: false });
    wx.showToast({ title: '已登录', icon: 'success' });
  },

  // ====== 头像（已登录后更换）======

  onChooseAvatar: function (e) {
    var avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) return;
    var that = this;
    wx.showLoading({ title: '上传中...', mask: true });
    wx.uploadFile({
      url: CONFIG.SERVER + '/api/upload/avatar',
      filePath: avatarUrl,
      name: 'avatar',
      header: { 'Authorization': 'Bearer ' + wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN) },
      success: function (res) {
        wx.hideLoading();
        if (res.statusCode === 200) {
          var data = JSON.parse(res.data);
          var user = that.data.userInfo || {};
          var updated = Object.assign({}, user, { avatarUrl: data.avatarUrl });
          wx.setStorageSync(CONFIG.STORAGE_KEYS.USER, updated);
          that.setData({
            userInfo: updated,
            displayUserInfo: validation.getDisplayUserInfo(updated, updated.nickName)
          });
          wx.showToast({ title: '头像已更新', icon: 'success' });
        } else {
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
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
          wx.removeStorageSync('firstLoginPending');
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