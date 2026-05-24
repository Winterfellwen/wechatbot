// utils/login.js
// Cloud-based login module — uses WeChat Cloud Development for auth

var STORAGE_USER = 'user';

function callCloud(name, data) {
  return new Promise(function(resolve, reject) {
    wx.cloud.callFunction({ name: name, data: data })
      .then(function(res) {
        if (res.result && res.result.success) {
          resolve(res.result);
        } else {
          reject(res.result || { error: 'cloud_call_failed' });
        }
      })
      .catch(function(err) {
        console.error('[callCloud]', name, err);
        reject({ error: 'cloud_call_error', detail: (err && err.message) || String(err), _raw: err });
      });
  });
}

module.exports = {
  callCloud: callCloud,

  login: function() {
    return callCloud('auth', { action: 'login' })
      .then(function(data) {
        var user = data.user;
        if (!user) return Promise.reject({ error: 'no user returned' });
        if (user.avatarUrl && (user.avatarUrl.indexOf('__tmp__') >= 0 || user.avatarUrl.indexOf('127.0.0.1') >= 0)) {
          user.avatarUrl = '/images/avatar-default.png';
        }
        wx.setStorageSync(STORAGE_USER, user);
        var app = getApp();
        if (app) app.globalData.userInfo = user;
        return { user: user, isNew: data.isNew || false };
      });
  },

  logout: function() {
    wx.removeStorageSync(STORAGE_USER);
    var app = getApp();
    if (app) app.globalData.userInfo = null;
  },

  isLoggedIn: function() {
    return !!wx.getStorageSync(STORAGE_USER);
  },

  getUserInfo: function() {
    return wx.getStorageSync(STORAGE_USER) || null;
  },

  updateProfile: function(data) {
    return callCloud('auth', { action: 'updateProfile', nickName: data.nickName, avatarUrl: data.avatarUrl })
      .then(function(result) {
        wx.setStorageSync(STORAGE_USER, result.user);
        var app = getApp();
        if (app) app.globalData.userInfo = result.user;
        return result.user;
      });
  },

  deleteAccount: function() {
    var that = this;
    return callCloud('auth', { action: 'deleteAccount' })
      .then(function() {
        that.logout();
      });
  },

  saveJpLessonScore: function(lessonId, score, total) {
    if (score <= 0) return Promise.resolve();
    return callCloud('jp', { action: 'save', lessonId: lessonId, score: score, total: total });
  },

  getJpLessonScores: function() {
    return callCloud('jp', { action: 'list' });
  }
};