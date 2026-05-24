// utils/validation.js
// Shared validation & display helpers — single source of truth

function isValidAvatarUrl(url) {
  if (!url) return false;
  // 本地默认图片
  if (url.indexOf('/images/') === 0) return true;
  // 临时路径（微信返回的）不算有效
  if (url.indexOf('http://tmp/') === 0) return false;
  if (url.indexOf('wxfile://') >= 0) return false;
  // 服务器返回的永久 URL
  if (url.indexOf('http') === 0) return true;
  // 云存储 fileID
  if (url.indexOf('cloud://') === 0) return true;
  return false;
}

function isValidNickname(nick) {
  if (!nick) return false;
  var trimmed = (nick + '').trim();
  if (trimmed.length === 0) return false;
  // 放宽：只要不是"游客"就接受，"微信用户"也接受（因为可能是用户自己填的）
  if (trimmed === '游客') return false;
  return true;
}

function getDisplayUserInfo(user, defaultNick) {
  if (!user) return { avatarUrl: '/images/avatar-default.png', nickName: defaultNick || '游客' };
  
  // 优先使用用户数据
  var avatarUrl = user.avatarUrl;
  var nickName = user.nickName;
  
  // 头像：如果无效，用默认
  if (!isValidAvatarUrl(avatarUrl)) {
    avatarUrl = '/images/avatar-default.png';
  }
  
  // 昵称：如果无效，尝试用默认，否则用"微信用户"
  if (!isValidNickname(nickName)) {
    nickName = defaultNick || '微信用户';
  }
  
  return { avatarUrl: avatarUrl, nickName: nickName };
}

module.exports = { isValidAvatarUrl: isValidAvatarUrl, isValidNickname: isValidNickname, getDisplayUserInfo: getDisplayUserInfo };
