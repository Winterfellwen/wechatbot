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

  onShow: function () {
    var that = this;
    var loggedIn = loginLib.isLoggedIn();
    if (loggedIn) {
      var user = loginLib.getUserInfo();
      var firstLoginPending = wx.getStorageSync('firstLoginPending');
      that.setData({
        isLoggedIn: true,
        userInfo: user,
        displayUserInfo: validation.getDisplayUserInfo(user, '微信用户'),
        isNewUser: !!firstLoginPending,
        showFirstSetup: !!firstLoginPending
      });
      // 仅在数据可能陈旧时才从服务端刷新（昵称/头像为空 或 首次登录中）
      var needRefresh = !user || !validation.isValidNickname(user.nickName) || !validation.isValidAvatarUrl(user.avatarUrl) || firstLoginPending;
      if (needRefresh) {
        wx.request({
          url: CONFIG.SERVER + '/api/users/me',
          method: 'GET',
          header: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN)
          },
          success: function (res) {
            if (res.statusCode === 200 && res.data) {
              wx.setStorageSync(CONFIG.STORAGE_KEYS.USER, res.data);
              that.setData({
                userInfo: res.data,
                displayUserInfo: validation.getDisplayUserInfo(res.data, '微信用户')
              });
            }
          }
        });
      }
    } else {
      that.setData({
        isLoggedIn: false,
        userInfo: null,
        displayUserInfo: null,
        isNewUser: false,
        showFirstSetup: false
      });
    }
  },

  onShareAppMessage: function () {
    return { title: '多功能小机器人 - 我的', path: '/pages/user/user' };
  },

  // ========== 登录 ==========

  handleLogin: function () {
    var that = this;
    wx.showLoading({ title: '登录中...' });
    loginLib.login().then(function (result) {
      wx.hideLoading();
      var user = result.user;
      var isNew = result.isNew;

      if (isNew) {
        // 首次登录：展示完善资料面板
        wx.setStorageSync('firstLoginPending', true);
        that.setData({
          isLoggedIn: true,
          isNewUser: true,
          showFirstSetup: true,
          setupAvatarUrl: user.avatarUrl || '/images/avatar-default.png',
          setupNickName: user.nickName || '',
          userInfo: user,
          displayUserInfo: validation.getDisplayUserInfo(user, user.nickName || '新朋友')
        });
      } else {
        // 老用户：直接进入
        that.setData({
          isLoggedIn: true,
          isNewUser: false,
          showFirstSetup: false,
          userInfo: user,
          displayUserInfo: validation.getDisplayUserInfo(user, '微信用户')
        });
        wx.showToast({ title: '欢迎回来', icon: 'success' });
      }
    }).catch(function (err) {
      wx.hideLoading();
      console.error('Login failed:', err);
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    });
  },

  // ========== 首次登录 → 完善资料 ==========

  onFirstSetupChooseAvatar: function (e) {
    var avatarUrl = e.detail.avatarUrl;
    if (avatarUrl) {
      this.setData({ setupAvatarUrl: avatarUrl });
    }
  },

  onFirstSetupNickInput: function (e) {
    this.setData({ setupNickName: e.detail.value });
  },

  /** 保存资料 → 上传到后端 */
  saveFirstSetup: function () {
    var that = this;
    var avatarUrl = that.data.setupAvatarUrl;
    var nickName = that.data.setupNickName.trim();
    var avatarChanged = avatarUrl && avatarUrl !== '/images/avatar-default.png';
    var nickChanged = !!nickName;

    if (!nickChanged && !avatarChanged) {
      that.skipFirstSetup();
      return;
    }

    var token = wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN);

    function done(user) {
      wx.setStorageSync('hasSetNickname', true);
      wx.removeStorageSync('firstLoginPending');
      wx.setStorageSync(CONFIG.STORAGE_KEYS.USER, user);
      that.setData({
        showFirstSetup: false,
        isNewUser: false,
        userInfo: user,
        displayUserInfo: validation.getDisplayUserInfo(user, user.nickName)
      });
    }

    function uploadAvatar(cb) {
      wx.uploadFile({
        url: CONFIG.SERVER + '/api/upload/avatar',
        filePath: avatarUrl,
        name: 'avatar',
        header: { 'Authorization': 'Bearer ' + token },
        success: function (res) {
          if (res.statusCode === 200) {
            var data = JSON.parse(res.data);
            cb(null, data.avatarUrl);
          } else {
            cb({ msg: 'upload_failed' });
          }
        },
        fail: function () { cb({ msg: 'network_error' }); }
      });
    }

    if (avatarChanged) {
      wx.showLoading({ title: '上传头像...' });
      uploadAvatar(function (err, serverAvatarUrl) {
        if (err) {
          wx.hideLoading();
          if (nickChanged) {
            // 头像上传失败，仍尝试保存昵称
            wx.showLoading({ title: '保存昵称...' });
            loginLib.updateProfile({ nickName: nickName }).then(function (u) {
              wx.hideLoading();
              done(u);
              wx.showToast({ title: '昵称已保存，头像上传失败', icon: 'none' });
            }).catch(function () {
              wx.hideLoading();
              wx.showToast({ title: '保存失败', icon: 'none' });
            });
          } else {
            wx.showToast({ title: '头像上传失败', icon: 'none' });
          }
          return;
        }
        // 头像上传成功，DB 中 avatarUrl 已更新
        if (nickChanged) {
          wx.showLoading({ title: '保存昵称...' });
          loginLib.updateProfile({ nickName: nickName }).then(function (u) {
            wx.hideLoading();
            done(u);
            wx.showToast({ title: '资料已保存', icon: 'success' });
          }).catch(function () {
            wx.hideLoading();
            // 昵称保存失败，头像已保存，构造当前状态
            var user = that.data.userInfo || {};
            var patched = Object.assign({}, user, { avatarUrl: serverAvatarUrl, nickName: nickName });
            done(patched);
            wx.showToast({ title: '头像已更新，昵称同步失败', icon: 'none' });
          });
        } else {
          wx.hideLoading();
          var user = that.data.userInfo || {};
          var patched = Object.assign({}, user, { avatarUrl: serverAvatarUrl });
          done(patched);
          wx.showToast({ title: '资料已保存', icon: 'success' });
        }
      });
    } else {
      // 仅昵称变更
      wx.showLoading({ title: '保存中...' });
      loginLib.updateProfile({ nickName: nickName }).then(function (u) {
        wx.hideLoading();
        done(u);
        wx.showToast({ title: '资料已保存', icon: 'success' });
      }).catch(function () {
        wx.hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
    }
  },

  /** 跳过 → 保持默认头像和系统昵称 */
  skipFirstSetup: function () {
    wx.removeStorageSync('firstLoginPending');
    var user = this.data.userInfo;
    this.setData({
      showFirstSetup: false,
      isNewUser: false
    });
    wx.showToast({ title: '已登录', icon: 'success' });
  },

  // ========== 头像（已登录后更换） ==========

  onAvatarError: function () {
    var display = this.data.displayUserInfo;
    if (display && display.avatarUrl !== '/images/avatar-default.png') {
      display.avatarUrl = '/images/avatar-default.png';
      this.setData({ displayUserInfo: display });
    }
  },

  onChooseAvatar: function (e) {
    var avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) {
      wx.showToast({ title: '选择头像失败', icon: 'none' });
      return;
    }
    var that = this;
    wx.showLoading({ title: '上传中...' });
    wx.uploadFile({
      url: CONFIG.SERVER + '/api/upload/avatar',
      filePath: avatarUrl,
      name: 'avatar',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync(CONFIG.STORAGE_KEYS.TOKEN)
      },
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

  // ========== 昵称（已登录后编辑） ==========

  showNickInput: function () {
    this.setData({ showNickInput: true, nickName: (this.data.userInfo && this.data.userInfo.nickName) || '' });
  },

  onNickInput: function (e) {
    this.setData({ nickName: e.detail.value });
  },

  confirmNickname: function () {
    var that = this;
    var nickName = this.data.nickName.trim();
    if (!nickName) return;
    wx.showLoading({ title: '保存中...' });
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

  // ========== 退出登录 ==========

  handleLogout: function () {
    var that = this;
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync('firstLoginPending');
          loginLib.logout();
          that.setData({
            isLoggedIn: false,
            userInfo: null,
            displayUserInfo: null,
            isNewUser: false,
            showFirstSetup: false,
            showNickInput: false
          });
          wx.showToast({ title: '已退出', icon: 'none' });
        }
      }
    });
  },

  // ========== 注销账号 ==========

  _showConfirm: function(title, content) {
    return new Promise(function(resolve) {
      wx.showModal({ title: title, content: content, success: function(res) { resolve(res.confirm); } });
    });
  },

  handleDeleteAccount: function () {
    var that = this;
    this._showConfirm('注销账号', '此操作不可恢复。将永久删除你的账号及所有关联数据（商家、菜单、学习记录等）。确定继续？')
      .then(function(confirmed) { if (!confirmed) return Promise.reject('cancelled'); return that._showConfirm('再次确认', '注销后所有数据将被永久删除'); })
      .then(function(confirmed2) { if (!confirmed2) return Promise.reject('cancelled'); return loginLib.deleteAccount(); })
      .then(function () {
        // loginLib.deleteAccount 成功后已调用 logout 清理本地
        that.setData({ isLoggedIn: false, userInfo: null, displayUserInfo: null });
        wx.showToast({ title: '账号已注销', icon: 'success' });
      })
      .catch(function (err) { if (err !== 'cancelled') wx.showToast({ title: '注销失败', icon: 'none' }); });
  }
});