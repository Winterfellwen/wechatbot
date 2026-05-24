const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const scores = db.collection('scores');

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (action) {
    case 'save': {
      const { lessonId, score, total } = event;
      if (!lessonId || score == null) return { success: false, error: 'lessonId and score required' };
      await scores.add({
        data: { lessonId, score, total: total || 0, createdAt: new Date() }
      });
      return { success: true };
    }

    case 'list': {
      const { data: list } = await scores
        .where({ _openid: openid })
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      return { success: true, data: list };
    }

    default:
      return { success: false, error: 'unknown action: ' + action };
  }
};