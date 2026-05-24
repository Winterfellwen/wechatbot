const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 云函数中调用 AI 需使用 @cloudbase/node-sdk（3.16.0+）
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV, timeout: 60000 });
const ai = app.ai();

async function callAI(messages) {
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
      const { messages, mode, menuData } = event;
      if (!messages || !messages.length) return { success: false, error: 'messages required' };

      // For customer mode, inject menu info into system prompt
      let apiMessages = [...messages];
      if (mode === 'customer' && menuData && menuData.dishes) {
        const menuText = menuData.dishes.filter(d => d.status === 'online').map(d =>
          '- ' + d.name + ' ¥' + d.price + ' ' + (d.taste || '') + ' ' + (d.category || '')
        ).join('\n');
        const sysMsg = apiMessages.find(m => m.role === 'system');
        if (sysMsg) {
          sysMsg.content += '\n\n当前菜单：\n' + menuText + '\n只能推荐以上菜单中的菜品。';
        }
      }

      try {
        const result = await callAI(apiMessages);
        const content = result.text || '';

        return { success: true, choices: [{ message: { content } }] };
      } catch (e) {
        return { success: false, error: e.message || 'AI call failed' };
      }
    }

    default:
      return { success: false, error: 'unknown action: ' + action };
  }
};