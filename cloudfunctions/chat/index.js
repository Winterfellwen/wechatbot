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
      method: 'POST', timeout: 50000,
      headers: {
        'Authorization': 'Bearer ' + OPENROUTER_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://servicewechat.com',
        'X-Title': 'SmartTeacher'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { reject(new Error('parse error')); }
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
      const { messages } = event;
      if (!messages || !messages.length) return { success: false, error: 'messages required' };

      const result = await callOpenRouter(messages, messages.some(m => m.content && Array.isArray(m.content)) ? 1024 : 500);

      if (result.statusCode === 200 && result.data && result.data.choices) {
        await chats.add({
          data: {
            type: 'chat',
            messages: [...messages, { role: 'assistant', content: result.data.choices[0].message.content }],
            createdAt: new Date()
          }
        });
        return { success: true, choices: result.data.choices };
      }
      return { success: false, error: result.data.error || 'OpenRouter error ' + result.statusCode, statusCode: result.statusCode };
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