const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV, timeout: 60000 });
const ai = app.ai();

const https = require('https');
const PEXELS_KEY = 'PzT8XG5LOcqcN6NGY8Yw5mcqlcCCYcWspHH9gyFs1XGsgngUpAhFQEB2';

function pexelsGet(url) {
  return new Promise(function(resolve, reject) {
    https.get(url, { headers: { 'Authorization': PEXELS_KEY } }, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', function(e) {
      reject(e);
    });
  });
}

async function callAI(messages) {
  const model = ai.createModel('hunyuan-v3');
  const res = await model.generateText({
    model: 'hy3-preview',
    messages: messages
  });
  return res;
}

async function searchPexelsImages(query) {
  const url = 'https://api.pexels.com/v1/search?query=' + encodeURIComponent('chinese food ' + query) + '&per_page=3';
  const data = await pexelsGet(url);
  if (!data.photos || data.photos.length === 0) return [];
  return data.photos.map(function(p) {
    return {
      url: p.src.medium,
      originalUrl: p.src.original,
      photographer: p.photographer,
      photographerUrl: p.photographer_url,
      pexelsUrl: p.url
    };
  });
}

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (action) {
    case 'chat': {
      const { messages, mode, menuData } = event;
      if (!messages || !messages.length) return { success: false, error: 'messages required' };

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

    case 'searchDishImages': {
      const { dishName } = event;
      if (!dishName) return { success: false, error: 'dishName required' };
      try {
        const images = await searchPexelsImages(dishName);
        return { success: true, images: images };
      } catch (e) {
        return { success: false, error: e.message || 'image search failed' };
      }
    }

    default:
      return { success: false, error: 'unknown action: ' + action };
  }
};
