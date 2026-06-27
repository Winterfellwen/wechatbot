/**
 * AI API service for fortune-telling
 * Handles AI API calls with retry mechanism and local fallback
 */

const config = require('../../config');
const promptService = require('./prompt-service');
const storageService = require('./storage-service');

const AI_CONFIG = config.openrouter;

/**
 * Call AI API
 * @param {string} prompt - The prompt to send
 * @param {Object} config - API configuration
 * @returns {Promise<string>} AI response
 */
function callAI(prompt, apiConfig = AI_CONFIG) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiConfig.apiUrl}/chat/completions`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'HTTP-Referer': 'https://wechatbot.com',
        'X-Title': 'AI Fortune Telling'
      },
      data: {
        model: apiConfig.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的运势分析师，精通中国传统文化和西方占星术。请用中文回答。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: apiConfig.maxTokens || 1000,
        temperature: 0.7
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.choices && res.data.choices[0]) {
          resolve(res.data.choices[0].message.content);
        } else {
          reject(new Error(`API error: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(new Error(`Request failed: ${err.errMsg}`));
      }
    });
  });
}

/**
 * Generate fortune prediction
 * @param {string} type - Fortune type
 * @param {Object} userInfo - User information
 * @param {string} question - User's question
 * @returns {Promise<string>} Fortune prediction
 */
async function generateFortune(type, userInfo, question) {
  // Generate prompt
  const prompt = promptService.generatePrompt(type, userInfo, question);
  
  // Check cache first
  const cacheKey = `${type}_${JSON.stringify(userInfo)}_${question}`;
  const cachedResult = storageService.getCachedResult(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }
  
  // Call AI API
  const result = await callAI(prompt);
  
  // Cache the result
  storageService.saveCachedResult(cacheKey, result);
  
  return result;
}

/**
 * Generate local fallback fortune (when AI is unavailable)
 * @param {string} type - Fortune type
 * @param {Object} userInfo - User information
 * @param {string} question - User's question
 * @returns {string} Local fortune prediction
 */
function generateLocalFortune(type, userInfo, question) {
  const fortunes = {
    yijing: generateYijingFortune,
    bazi: generateBaziFortune,
    ziwei: generateZiweiFortune,
    wuxing: generateWuxingFortune,
    constellation: generateConstellationFortune,
    tarot: generateTarotFortune,
    astrology: generateAstrologyFortune
  };

  const generator = fortunes[type] || generateDefaultFortune;
  return generator(userInfo, question);
}

/**
 * Generate fortune with retry mechanism
 * @param {string} type - Fortune type
 * @param {Object} userInfo - User information
 * @param {string} question - User's question
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<string>} Fortune prediction
 */
async function generateFortuneWithRetry(type, userInfo, question, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateFortune(type, userInfo, question);
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${i + 1} failed:`, error.message);
      
      // Wait before retry (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  // All retries failed, use local fallback
  console.warn('All AI attempts failed, using local fallback');
  return generateLocalFortune(type, userInfo, question);
}

// Local fortune generators

function generateYijingFortune(userInfo, question) {
  const卦名 = ['乾', '坤', '屯', '蒙', '需', '讼', '师', '比', '小畜', '履', '泰', '否'];
  const randomIndex = Math.floor(Math.random() *卦名.length);
  const selected卦 =卦名[randomIndex];
  
  return `【易经卦象分析】

卦象：${selected卦}卦

根据您的问题"${question || '综合运势'}"，为您解读此卦：

卦辞解读：
${selected卦}卦象征着变化与机遇。当前时运正处于转折期，需要保持平和心态，顺应自然规律。

建议：
1. 保持内心平静，不急不躁
2. 把握时机，顺势而为
3. 多行善事，积累福报

愿您运势亨通，万事如意！`;
}

function generateBaziFortune(userInfo, question) {
  const天干 = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const地支 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  const年柱 =天干[Math.floor(Math.random() * 10)] +地支[Math.floor(Math.random() * 12)];
  
  return `【八字命理分析】

八字排盘：${年柱}年

根据您的问题"${question || '综合运势'}"，为您分析八字命理：

五行分析：
您的八字中五行分布较为均衡，木火土金水各有显现。当前流年有利于事业发展。

十神分析：
正官星旺盛，利于工作晋升；偏财星有力，有意外之财。

建议：
1. 把握事业机遇
2. 注意理财规划
3. 保持良好心态

祝您运势昌隆！`;
}

function generateZiweiFortune(userInfo, question) {
  return `【紫微斗数分析】

命盘格局：紫微星坐命

根据您的问题"${question || '综合运势'}"，为您解读命盘：

主星分析：
紫微星入命宫，主贵气与领导力。当前流年有左辅右弼星相助，贵人运旺。

宫位分析：
- 命宫：紫微星坐镇，气质出众
- 财帛宫：武曲星入主，财运亨通
- 事业宫：天相星照耀，事业顺利

建议：
1. 发挥领导才能
2. 把握贵人机遇
3. 稳步推进事业

愿您前程似锦！`;
}

function generateWuxingFortune(userInfo, question) {
  return `【五行分析】

五行分布：木2 火1 土3 金2 水1

根据您的问题"${question || '综合运势'}"，为您分析五行：

五行强弱：
土旺木弱，需要补木。土旺之人性格稳重，但需注意变通。

五行与性格：
您性格踏实稳重，做事有条理，但有时过于固执。

五行调理建议：
1. 多接触绿色植物，补木气
2. 佩戴木质饰品
3. 多食用绿色蔬菜

祝您五行调和，运势顺畅！`;
}

function generateConstellationFortune(userInfo, question) {
  const星座 = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
  const random星座 =星座[Math.floor(Math.random() * 12)];
  
  return `【星座运势分析】

星座：${random星座}

根据您的问题"${question || '综合运势'}"，为您分析今日运势：

综合运势：★★★★☆
今天整体运势不错，适合处理重要事务。

爱情运势：★★★☆☆
感情方面需要更多沟通，避免误解。

事业运势：★★★★☆
工作中有贵人相助，项目进展顺利。

财运：★★★★☆
财运亨通，可适当进行投资。

幸运数字：7
幸运颜色：蓝色

建议：
1. 把握事业机遇
2. 多与伴侣沟通
3. 保持积极心态

愿您今天运势亨通！`;
}

function generateTarotFortune(userInfo, question) {
  const塔罗牌 = ['愚者', '魔术师', '女祭司', '皇后', '皇帝', '教皇', '恋人', '战车', '力量', '隐士'];
  const随机牌 = [];
  for (let i = 0; i < 3; i++) {
    随机牌.push(塔罗牌[Math.floor(Math.random() * 塔罗牌.length)]);
  }
  
  return `【塔罗占卜分析】

牌阵：过去-现在-未来三牌阵

根据您的问题"${question || '综合运势'}"，为您解读牌面：

过去牌：${随机牌[0]}（正位）
代表过去的状况，您经历了一段充满可能性的时期。

现在牌：${随机牌[1]}（正位）
代表当前状况，您正处于一个关键的转折点。

未来牌：${随机牌[2]}（逆位）
代表未来趋势，需要谨慎应对即将到来的变化。

建议：
1. 珍惜过去的收获
2. 把握当下的机会
3. 为未来做好准备

愿塔罗指引您的方向！`;
}

function generateAstrologyFortune(userInfo, question) {
  return `【占星术分析】

星盘配置：太阳狮子座，月亮天蝎座，上升处女座

根据您的问题"${question || '综合运势'}"，为您解读星盘：

行星分析：
- 太阳在狮子座：充满自信与创造力
- 月亮在天蝎座：情感深沉，直觉敏锐
- 上升处女座：注重细节，追求完美

相位分析：
日月相位良好，内心与外在表现协调。

运势分析：
当前木星与您的太阳形成有利相位，适合拓展视野，把握机遇。

建议：
1. 发挥创造力
2. 信任直觉
3. 注重细节

愿星辰守护您的旅程！`;
}

function generateDefaultFortune(userInfo, question) {
  return `【运势分析】

根据您的问题"${question || '综合运势'}"，为您进行综合分析：

整体运势：
您近期运势平稳，各方面都在稳步发展中。保持积极心态，把握机遇。

建议：
1. 保持乐观心态
2. 把握身边机会
3. 多行善事积累福报

祝您运势昌隆，万事如意！`;
}

module.exports = {
  callAI,
  generateFortune,
  generateLocalFortune,
  generateFortuneWithRetry
};
