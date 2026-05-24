const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const users = db.collection('users');

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (action) {
    case 'login': {
      const { data: list } = await users.where({ _openid: openid }).get();
      let user, isNew = false;
      if (list.length === 0) {
        user = { nickName: '微信用户', avatarUrl: '', createdAt: new Date(), updatedAt: new Date() };
        const { _id } = await users.add({ data: user });
        user = { ...user, _id };
        isNew = true;
      } else {
        user = list[0];
        user.id = user._id;
      }
      return { success: true, user, isNew };
    }

    case 'updateProfile': {
      const updates = {};
      if (event.nickName !== undefined) updates.nickName = event.nickName;
      if (event.avatarUrl !== undefined) updates.avatarUrl = event.avatarUrl;
      if (Object.keys(updates).length === 0) return { success: false, error: 'no fields to update' };
      updates.updatedAt = new Date();
      await users.where({ _openid: openid }).update({ data: updates });
      const { data: [u] } = await users.where({ _openid: openid }).get();
      u.id = u._id;
      return { success: true, user: u };
    }

    case 'deleteAccount': {
      // Delete user and all related data
      await Promise.all([
        users.where({ _openid: openid }).remove(),
        db.collection('merchants').where({ _openid: openid }).remove(),
        db.collection('menus').where({ _openid: openid }).remove(),
        db.collection('scores').where({ _openid: openid }).remove(),
        db.collection('chats').where({ _openid: openid }).remove()
      ]);
      return { success: true };
    }

    default:
      return { success: false, error: 'unknown action: ' + action };
  }
};