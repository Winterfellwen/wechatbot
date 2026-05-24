const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const merchants = db.collection('merchants');
const menus = db.collection('menus');

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (action) {
    case 'list': {
      const { data: list } = await merchants.where({ _openid: openid }).orderBy('createdAt', 'desc').get();
      // Attach dish count for each merchant
      const enriched = [];
      for (const m of list) {
        const { data: menuDocs } = await menus.where({ merchantId: m._id }).limit(1).get();
        const menu = menuDocs[0];
        enriched.push({
          id: m._id,
          name: m.name,
          description: m.description || '',
          dishCount: menu && menu.dishes ? menu.dishes.length : 0,
          createdAt: m.createdAt
        });
      }
      return { success: true, data: enriched };
    }

    case 'create': {
      const doc = {
        _openid: openid,
        name: event.name,
        description: event.description || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const { _id } = await merchants.add({ data: doc });
      return { success: true, data: { id: _id, name: doc.name, description: doc.description, dishCount: 0 } };
    }

    case 'delete': {
      const id = event.id;
      const result = await merchants.doc(id).get().catch(() => null);
      if (!result || !result.data || !result.data.length) {
        // 无法读取文档（可能是旧数据缺少 _openid），尝试盲删
        await merchants.doc(id).remove().catch(() => {});
        await menus.where({ merchantId: id }).remove().catch(() => {});
        return { success: true };
      }
      await Promise.all([
        merchants.doc(id).remove(),
        menus.where({ merchantId: id, _openid: openid }).remove()
      ]);
      return { success: true };
    }

    default:
      return { success: false, error: 'unknown action: ' + action };
  }
};