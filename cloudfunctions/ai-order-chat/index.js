const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const chats = db.collection('chats');

const OPENROUTER_KEY = process.env.OPENROUTER_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(messages, maxTokens) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: OPENROUTER_MODEL, messages, max_tokens: maxTokens || 500 });
    const req = https.request(OPENROUTER_URL, {
      method: 'POST',
      timeout: 50000,
      headers: {
        'Authorization': 'Bearer ' + OPENROUTER_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://servicewechat.com',
        'X-Title': 'AIOrderAssistant'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(new Error('parse error'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(50000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (action) {
    case 'config': {
      return { success: true, key: OPENROUTER_KEY ? '***' : '', apiUrl: OPENROUTER_URL, model: OPENROUTER_MODEL, maxTokens: 500 };
    }

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

      const result = await callOpenRouter(apiMessages, 800);

      // Save to chat history
      if (result.statusCode === 200 && result.data && result.data.choices) {
        const lastUserMsg = messages.filter(m => m.role === 'user').pop();
        const aiReply = result.data.choices[0].message.content;
        await chats.add({
          data: {
            type: 'ai-order',
            merchantId: event.merchantId || '',
            mode: mode || 'customer',
            messages: [...messages, { role: 'assistant', content: aiReply }],
            createdAt: new Date()
          }
        });
      }

      if (result.statusCode >= 200 && result.statusCode < 300) {
        return { success: true, choices: result.data.choices };
      }
      return { success: false, error: result.data.error || 'OpenRouter error ' + result.statusCode, statusCode: result.statusCode };
    }

    case 'history': {
      const { data: history } = await chats
        .where({ _openid: openid, type: 'ai-order' })
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      return { success: true, data: history };
    }

    default:
      return { success: false, error: 'unknown action: ' + action };
  }
};