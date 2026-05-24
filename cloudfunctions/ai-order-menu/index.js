const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const menus = db.collection('menus');

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (action) {
    case 'list': {
      const merchantId = event.merchantId;
      if (!merchantId) return { success: false, error: 'merchantId required' };
      const { data: docs } = await menus.where({ merchantId, _openid: openid }).limit(1).get();
      const doc = docs[0];
      return {
        success: true,
        data: doc ? { dishes: doc.dishes || [] } : { dishes: [] },
        etag: doc ? String(doc._updateTime || doc.updatedAt || '') : null,
        updatedAt: doc ? doc.updatedAt : null
      };
    }

    case 'save': {
      const { merchantId, menu, expectedEtag } = event;
      if (!merchantId || !menu) return { success: false, error: 'merchantId and menu required' };

      // Check for conflict if expectedEtag provided
      const { data: existing } = await menus.where({ merchantId, _openid: openid }).limit(1).get();

      if (existing.length > 0) {
        const doc = existing[0];
        if (expectedEtag) {
          const currentEtag = String(doc._updateTime || doc.updatedAt || '');
          if (currentEtag && currentEtag !== expectedEtag) {
            return { success: false, error: 'CONFLICT', existingEtag: currentEtag };
          }
        }
        await menus.doc(doc._id).update({
          data: {
            dishes: menu.dishes || [],
            updatedAt: new Date()
          }
        });
        const { data: [updated] } = await menus.doc(doc._id).get();
        return {
          success: true,
          etag: String(updated._updateTime || updated.updatedAt || '')
        };
      } else {
        const { _id } = await menus.add({
          data: {
            merchantId,
            dishes: menu.dishes || [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        const { data: [created] } = await menus.doc(_id).get();
        return {
          success: true,
          etag: String(created._updateTime || created.updatedAt || '')
        };
      }
    }

    default:
      return { success: false, error: 'unknown action: ' + action };
  }
};