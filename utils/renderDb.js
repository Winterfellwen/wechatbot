const API_KEY = 'rnd_cIEZYlFoB5pJx4byk0tiONKcCBnk';
const BASE_URL = 'https://render-db-api.onrender.com/api';

class RenderDB {
  static async getUser(openid) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${BASE_URL}/users/${openid}`,
        method: 'GET',
        header: {
          'Authorization': API_KEY
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(res);
          }
        },
        fail: reject
      });
    });
  }

  static async saveUser(userData) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${BASE_URL}/users/${userData.openid}`,
        method: 'POST',
        header: {
          'Authorization': API_KEY,
          'Content-Type': 'application/json'
        },
        data: userData,
        success: (res) => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(res.data);
          } else {
            reject(res);
          }
        },
        fail: reject
      });
    });
  }

  static async updateUser(openid, userData) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${BASE_URL}/users/${openid}`,
        method: 'PUT',
        header: {
          'Authorization': API_KEY,
          'Content-Type': 'application/json'
        },
        data: userData,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(res);
          }
        },
        fail: reject
      });
    });
  }

  static async getUserData(openid, dataType) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${BASE_URL}/users/${openid}/${dataType}`,
        method: 'GET',
        header: {
          'Authorization': API_KEY
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(res);
          }
        },
        fail: reject
      });
    });
  }

  static async saveUserData(openid, dataType, data) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${BASE_URL}/users/${openid}/${dataType}`,
        method: 'POST',
        header: {
          'Authorization': API_KEY,
          'Content-Type': 'application/json'
        },
        data: data,
        success: (res) => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(res.data);
          } else {
            reject(res);
          }
        },
        fail: reject
      });
    });
  }
}

module.exports = {
  RenderDB,
  API_KEY,
  BASE_URL
};