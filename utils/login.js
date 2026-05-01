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
    var that = this;
    return new Promise(function (resolve, reject) {
      wx.login({
        success: function (res) {
          if (!res.code) return reject({ error: 'wx.login() returned no code' });
          // Try new auth endpoint first, fall back to old openid endpoint
          request('POST', '/api/auth/login', { code: res.code }, false)
            .then(function (data) {
              if (data.token && data.user) {
                wx.setStorageSync(STORAGE_TOKEN, data.token);
                wx.setStorageSync(STORAGE_USER, data.user);
                var app = getApp();
                if (app) app.globalData.userInfo = data.user;
                resolve(data);
              } else {
                reject({ error: 'Server returned incomplete data' });
              }
            })
            .catch(function () {
              // Fallback: try old GET /api/wechat/openid endpoint
              wx.request({
                url: SERVER + '/api/wechat/openid?code=' + res.code,
                method: 'GET',
                success: function (oldRes) {
                  if (oldRes.data && oldRes.data.openid) {
                    var openid = oldRes.data.openid;
                    // Check or create user via old endpoint
                    wx.request({
                      url: SERVER + '/api/users/' + openid,
                      method: 'GET',
                      success: function (userRes) {
                        if (userRes.statusCode === 200 && userRes.data) {
                          var u = userRes.data;
                          var userInfo = { openid: u.openid, nickName: u.nickname || '微信用户', avatarUrl: u.avatarurl || '' };
                          wx.setStorageSync(STORAGE_USER, userInfo);
                          var app = getApp();
                          if (app) app.globalData.userInfo = userInfo;
                          resolve({ user: userInfo });
                        } else {
                          // Create user on old endpoint
                          var nickName = '微信用户' + String(Date.now() % 1000);
                          wx.request({
                            url: SERVER + '/api/users/' + openid + '/wx-login',
                            method: 'POST',
                            success: function (createRes) {
                              var cu = (createRes.data && createRes.data.user) || { openid: openid, nickname: nickName, avatarurl: '' };
                              var userInfo = { openid: cu.openid, nickName: cu.nickname || nickName, avatarUrl: cu.avatarurl || '' };
                              wx.setStorageSync(STORAGE_USER, userInfo);
                              var app = getApp();
                              if (app) app.globalData.userInfo = userInfo;
                              resolve({ user: userInfo });
                            },
                            fail: function (err) {
                              reject({ error: 'All login methods failed: ' + JSON.stringify(err) });
                            }
                          });
                        }
                      },
                      fail: function (err) {
                        reject({ error: 'User lookup failed: ' + JSON.stringify(err) });
                      }
                    });
                  } else {
                    reject({ error: 'WeChat auth failed: ' + (oldRes.data && oldRes.data.error || 'unknown') });
                  }
                },
                fail: function (err) {
                  reject({ error: 'Network error: ' + JSON.stringify(err) });
                }
              });
            });
        },
        fail: reject
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
