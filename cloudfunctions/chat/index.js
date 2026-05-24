const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const chats = db.collection('chats');

// 云函数中调用 AI 需使用 @cloudbase/node-sdk（3.16.0+）
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV, timeout: 60000 });
const ai = app.ai();

async function callAI(messages) {
  const model = ai.createModel('hunyuan-v3');
  const res = await model.generateText({
    model: 'hy3-preview',
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
        // @cloudbase/node-sdk 返回 result.text，需要转为 OpenAI 兼容格式
        const content = result.text || '';

        await chats.add({
          data: {
            type: 'chat',
            messages: [...messages, { role: 'assistant', content }],
            createdAt: new Date()
          }
        });

        return { success: true, choices: [{ message: { content } }] };
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