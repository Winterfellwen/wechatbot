const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const chats = db.collection('chats');

async function callAI(messages) {
  const ai = cloud.extend.AI;
  const model = ai.createModel('hunyuan-exp');
  const res = await model.generateText({
    model: 'hunyuan-2.0-instruct-20251111',
    messages: messages
  });
  return res;
}

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (action) {
    case 'chat': {
      const { messages } = event;
      if (!messages || !messages.length) return { success: false, error: 'messages required' };

      try {
        const result = await callAI(messages);
        const content = result.choices[0].message.content;

        await chats.add({
          data: {
            type: 'chat',
            messages: [...messages, { role: 'assistant', content }],
            createdAt: new Date()
          }
        });

        return { success: true, choices: result.choices };
      } catch (e) {
        return { success: false, error: e.message || 'AI call failed' };
      }
    }

    case 'history': {
      const { data: history } = await chats
        .where({ _openid: openid, type: 'chat' })
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      return { success: true, data: history };
    }

    default:
      return { success: false, error: 'unknown action: ' + action };
  }
};