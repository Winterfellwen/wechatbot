// utils/login.js
// Shared login module — single source of truth for auth state

var SERVER = 'https://wechatbot-g6ez.onrender.com';
var STORAGE_TOKEN = 'auth_token';
var STORAGE_USER = 'auth_user';

function request(method, path, data, needAuth) {
  return new Promise(function (resolve, reject) {
    var header = { 'Content-Type': 'application/json' };
    if (needAuth) {
      var token = wx.getStorageSync(STORAGE_TOKEN);
      if (token) header['Authorization'] = 'Bearer ' + token;
    }
    wx.request({
      url: SERVER + path,
      method: method,
      header: header,
      data: data,
      success: function (res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: reject
    });
  });
}

module.exports = {
  login: function () {
    return new Promise(function (resolve, reject) {
      wx.login({
        success: function (res) {
          if (!res.code) return reject({ error: 'wx.login() returned no code' });
          request('POST', '/api/auth/login', { code: res.code }, false)
            .then(function (data) {
              if (!data.token || !data.user) return reject({ error: 'Server returned incomplete data', data: data });
              wx.setStorageSync(STORAGE_TOKEN, data.token);
              wx.setStorageSync(STORAGE_USER, data.user);
              var app = getApp();
              if (app) app.globalData.userInfo = data.user;
              resolve(data);
            })
            .catch(function (err) {
              console.error('[login] request failed:', err);
              reject(err);
            });
        },
        fail: function (err) {
          console.error('[login] wx.login failed:', err);
          reject({ error: 'wx.login failed: ' + JSON.stringify(err) });
        }
      });
    });
  },

  logout: function () {
    request('POST', '/api/auth/logout', {}, true)
      .catch(function () {}); // fire-and-forget
    wx.removeStorageSync(STORAGE_TOKEN);
    wx.removeStorageSync(STORAGE_USER);
    var app = getApp();
    if (app) app.globalData.userInfo = null;
  },

  isLoggedIn: function () {
    return !!wx.getStorageSync(STORAGE_TOKEN);
  },

  getUserInfo: function () {
    return wx.getStorageSync(STORAGE_USER) || null;
  },

  updateProfile: function (data) {
    var that = this;
    return request('PUT', '/api/users/me', data, true)
      .then(function (updated) {
        wx.setStorageSync(STORAGE_USER, updated);
        var app = getApp();
        if (app) app.globalData.userInfo = updated;
        return updated;
      });
  },

  deleteAccount: function () {
    return request('DELETE', '/api/users/me', {}, true);
  }
};
