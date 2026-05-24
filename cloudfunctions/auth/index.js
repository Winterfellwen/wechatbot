const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const users = db.collection('users');

// Ensure a doc with _id = openid exists. Migrates from legacy _openid if needed.
async function ensureUserDoc(openid) {
  const { data: byId } = await users.where({ _id: openid }).get();
  if (byId.length > 0) return { existed: true, user: byId[0] };

  const { data: legacy } = await users.where({ _openid: openid }).get();
  if (legacy.length > 0) {
    const old = legacy[0];
    const migrated = {
      openid,
      nickName: old.nickName || '微信用户',
      avatarUrl: old.avatarUrl || '',
      createdAt: old.createdAt,
      updatedAt: old.updatedAt
    };
    await users.doc(openid).set({ data: migrated });
    await users.doc(old._id).remove();
    return { existed: true, user: { ...migrated, _id: openid } };
  }

  const now = new Date();
  const fresh = { openid, nickName: '微信用户', avatarUrl: '', createdAt: now, updatedAt: now };
  await users.doc(openid).set({ data: fresh });
  return { existed: false, user: { ...fresh, _id: openid } };
}

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (action) {
    case 'login': {
      const { existed, user } = await ensureUserDoc(openid);
      user.id = user._id;
      return { success: true, user, isNew: !existed };
    }

    case 'updateProfile': {
      const updates = {};
      if (event.nickName !== undefined) updates.nickName = event.nickName;
      if (event.avatarUrl !== undefined) updates.avatarUrl = event.avatarUrl;
      if (Object.keys(updates).length === 0) return { success: false, error: 'no fields to update' };
      updates.updatedAt = new Date();

      await ensureUserDoc(openid);
      await users.doc(openid).update({ data: updates });

      const { data: list } = await users.where({ _id: openid }).get();
      if (list.length === 0) return { success: false, error: 'user not found' };
      var u = list[0];
      u.id = u._id;
      return { success: true, user: u };
    }

    case 'deleteAccount': {
      await Promise.all([
        users.doc(openid).remove(),
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
