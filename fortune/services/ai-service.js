/**
 * AI API service for fortune-telling
 * 直连 NVIDIA API
 */

var NVIDIA_CONFIG = {
  key: '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',
  apiUrl: 'https://integrate.api.nvidia.com/v1',
  model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  maxTokens: 2000
};

/**
 * 调用 AI API
 */
function callAI(prompt) {
  return new Promise(function(resolve, reject) {
    var apiMessages = [
      { role: 'system', content: '你是一个专业的运势分析师，精通中国传统文化和西方占星术。请用中文回答。' },
      { role: 'user', content: prompt }
    ];

    wx.request({
      url: NVIDIA_CONFIG.apiUrl + '/chat/completions',
      method: 'POST',
      timeout: 30000,
      header: {
        'Authorization': 'Bearer ' + NVIDIA_CONFIG.key,
        'Content-Type': 'application/json'
      },
      data: {
        model: NVIDIA_CONFIG.model,
        messages: apiMessages,
        max_tokens: NVIDIA_CONFIG.maxTokens,
        temperature: 0.7
      },
      success: function(res) {
        console.log('NVIDIA API response:', res.statusCode);
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
          var message = res.data.choices[0].message;
          // reasoning 模型可能把内容放在 reasoning_content 而不是 content
          var content = message.content || message.reasoning_content || message.reasoning || '';
          console.log('AI content:', content ? content.substring(0, 100) + '...' : 'empty');
          resolve(content);
        } else {
          console.error('API error:', res);
          reject(new Error('API error: ' + res.statusCode));
        }
      },
      fail: function(err) {
        console.error('Request failed:', err);
        reject(new Error('Request failed: ' + (err.errMsg || 'unknown')));
      }
    });
  });
}

/**
 * 生成运势预测（带重试）
 */
function generateFortuneWithRetry(type, userInfo, question, maxRetries) {
  maxRetries = maxRetries || 3;
  var prompt = generatePrompt(type, userInfo, question);

  function attempt(retryCount) {
    return callAI(prompt).catch(function(err) {
      console.warn('AI attempt ' + (retryCount + 1) + ' failed:', err.message);
      if (retryCount < maxRetries - 1) {
        return new Promise(function(resolve) {
          setTimeout(resolve, 1000 * Math.pow(1.5, retryCount));
        }).then(function() {
          return attempt(retryCount + 1);
        });
      }
      // 所有重试失败，使用本地降级
      return generateLocalFortune(type, userInfo, question);
    });
  }

  return attempt(0);
}

/**
 * 生成提示词
 */
function generatePrompt(type, userInfo, question) {
  var typeNames = {
    yijing: '易经卦象',
    bazi: '八字命理',
    ziwei: '紫微斗数',
    constellation: '星座分析',
    tarot: '塔罗占卜',
    astrology: '占星术'
  };

  var typeName = typeNames[type] || '运势分析';

  var userInfoStr = '';
  if (userInfo.birthDate) userInfoStr += '- 出生日期：' + userInfo.birthDate + '\n';
  if (userInfo.birthTime) userInfoStr += '- 出生时辰：' + userInfo.birthTime + '\n';
  if (userInfo.gender) userInfoStr += '- 性别：' + (userInfo.gender === 'male' ? '男' : '女') + '\n';
  if (userInfo.constellation) userInfoStr += '- 星座：' + userInfo.constellation + '\n';

  return '你是精通' + typeName + '的AI分析师。请直接输出分析结果，不要过多思考。\n\n' +
    '用户信息：\n' + (userInfoStr || '- 未知\n') + '\n' +
    '具体问题：' + (question || '综合运势') + '\n\n' +
    '请直接提供' + typeName + '分析结果和建议，语言通俗易懂。';
}

/**
 * 本地降级运势生成
 */
function generateLocalFortune(type, userInfo, question) {
  var fortunes = {
    yijing: '【易经卦象分析】\n\n根据您的问题"' + (question || '综合运势') + '"，为您解读：\n\n当前时运正处于转折期，需要保持平和心态，顺应自然规律。\n\n建议：\n1. 保持内心平静，不急不躁\n2. 把握时机，顺势而为\n3. 多行善事，积累福报',
    
    bazi: '【八字命理分析】\n\n根据您的问题"' + (question || '综合运势') + '"，为您分析：\n\n五行分布较为均衡，当前流年有利于事业发展。\n\n建议：\n1. 把握事业机遇\n2. 注意理财规划\n3. 保持良好心态',
    
    ziwei: '【紫微斗数分析】\n\n根据您的问题"' + (question || '综合运势') + '"，为您解读：\n\n紫微星入命宫，主贵气与领导力。当前流年有贵人相助。\n\n建议：\n1. 发挥领导才能\n2. 把握贵人机遇\n3. 稳步推进事业',
    
    constellation: '【星座运势分析】\n\n根据您的问题"' + (question || '综合运势') + '"，为您分析：\n\n综合运势：★★★★☆\n今天整体运势不错，适合处理重要事务。\n\n建议：\n1. 把握事业机遇\n2. 多与伴侣沟通\n3. 保持积极心态',
    
    tarot: '【塔罗占卜分析】\n\n根据您的问题"' + (question || '综合运势') + '"，为您解读：\n\n您正处于一个关键的转折点，需要谨慎应对即将到来的变化。\n\n建议：\n1. 珍惜过去的收获\n2. 把握当下的机会\n3. 为未来做好准备',
    
    astrology: '【占星术分析】\n\n根据您的问题"' + (question || '综合运势') + '"，为您解读：\n\n当前木星与您的太阳形成有利相位，适合拓展视野，把握机遇。\n\n建议：\n1. 发挥创造力\n2. 信任直觉\n3. 注重细节'
  };

  return Promise.resolve(fortunes[type] || fortunes.constellation);
}

module.exports = {
  generateFortuneWithRetry: generateFortuneWithRetry
};
