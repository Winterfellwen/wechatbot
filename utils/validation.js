// utils/validation.js
// Shared validation & display helpers — single source of truth

function isValidAvatarUrl(url) {
  if (!url) return false;
  if (url.indexOf('/images/') === 0) return true;
  if (url.indexOf('http') !== 0) return false;
  if (url.indexOf('__tmp__') >= 0) return false;
  if (url.indexOf('wxfile://') >= 0) return false;
  if (url.indexOf('127.0.0.1') >= 0) return false;
  if (url.indexOf('localhost') >= 0) return false;
  return true;
}

function isValidNickname(nick) {
  if (!nick) return false;
  var trimmed = (nick + '').trim();
  if (trimmed.length === 0) return false;
  if (trimmed.indexOf('微信用户') === 0) return false;
  if (trimmed === '游客') return false;
  return true;
}

function getDisplayUserInfo(user, defaultNick) {
  if (!user) return { avatarUrl: '/images/avatar-default.png', nickName: defaultNick || '游客' };
  var display = { avatarUrl: '/images/avatar-default.png', nickName: defaultNick || '游客' };
  if (isValidAvatarUrl(user.avatarUrl)) {
    display.avatarUrl = user.avatarUrl;
  }
  if (isValidNickname(user.nickName)) {
    display.nickName = user.nickName;
  }
  return display;
}

module.exports = { isValidAvatarUrl: isValidAvatarUrl, isValidNickname: isValidNickname, getDisplayUserInfo: getDisplayUserInfo };
