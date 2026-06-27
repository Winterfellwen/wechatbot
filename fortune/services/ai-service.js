// fortune/services/ai-service.js

const NVIDIA_CONFIG = {
  key: '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',
  apiUrl: 'https://integrate.api.nvidia.com/v1',
  model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  maxTokens: 4000
};

// 构建测算提示词（一次返回3个运势）
function buildReadingPrompt(category, profile) {
  const isChinese = category === 'chinese';
  const types = isChinese
    ? '八字命理、紫微斗数、易经卦象'
    : '星座分析、塔罗占卜、占星术';

  let profileInfo = `姓名：${profile.name}\n生日：${profile.birthday}\n性别：${profile.gender === 'male' ? '男' : '女'}`;
  if (profile.birthTime) {
    profileInfo += `\n出生时辰：${profile.birthTime}`;
  }

  return `你是精通中国传统命理和西方星象学的资深AI分析师。你必须全程使用中文，绝对不要使用英文。

请根据以下用户信息，同时进行${types}的分析。

【用户信息】
${profileInfo}

【输出格式要求】
你必须严格按照以下格式输出，每个运势之间用三个井号分隔：

===第一项===

📊 基本信息概览
（简要总结）

🔮 核心分析
（深入分析）

📈 运势解读
（详细运势）

💡 开运建议
（3-5条建议）

⚠️ 注意事项
（特别提醒）

===第二项===

📊 基本信息概览
（简要总结）

🔮 核心分析
（深入分析）

📈 运势解读
（详细运势）

💡 开运建议
（3-5条建议）

⚠️ 注意事项
（特别提醒）

===第三项===

📊 基本信息概览
（简要总结）

🔮 核心分析
（深入分析）

📈 运势解读
（详细运势）

💡 开运建议
（3-5条建议）

⚠️ 注意事项
（特别提醒）

【要求】
1. 必须使用中文，绝对不要出现英文
2. 每个段落用emoji开头
3. 分析要专业有深度
4. 语言生动有趣，通俗易懂
5. 三个运势之间必须用===第X项===分隔
6. 不要输出其他多余内容

请直接输出分析结果。`;
}

// 构建对话提示词
function buildChatPrompt(profile, results, question) {
  let resultsText = '';
  if (results && results.length > 0) {
    resultsText = results.map(r => `【${r.typeName}】\n${r.content}`).join('\n\n');
  }

  return `你是一个专业的运势分析师，精通中国传统文化和西方占星术。你必须全程使用中文回答，绝对不要使用英文。

以下是用户的信息和运势分析结果：

【用户档案】
姓名：${profile.name}
生日：${profile.birthday}
性别：${profile.gender === 'male' ? '男' : '女'}
${profile.birthTime ? '出生时辰：' + profile.birthTime : ''}

【运势分析结果】
${resultsText}

请基于以上信息回答用户的问题。要求：
1. 必须使用中文，绝对不要出现英文
2. 回答要专业、详细、有深度
3. 适当使用emoji增加可读性`;
}

// 非流式调用AI API
function callAI(prompt) {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: NVIDIA_CONFIG.apiUrl + '/chat/completions',
      method: 'POST',
      timeout: 120000,
      header: {
        'Authorization': 'Bearer ' + NVIDIA_CONFIG.key,
        'Content-Type': 'application/json'
      },
      data: {
        model: NVIDIA_CONFIG.model,
        messages: [
          { role: 'system', content: '你是专业的AI命理分析师，精通中国传统文化和西方占星术。你必须全程使用中文回答，绝对不要使用英文。输出要使用emoji作为段落标记。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: NVIDIA_CONFIG.maxTokens,
        temperature: 0.7
      },
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
          var message = res.data.choices[0].message;
          var content = message.content || message.reasoning_content || '';
          resolve(content);
        } else {
          reject(new Error('API error: ' + (res.statusCode || 'unknown')));
        }
      },
      fail: function(err) {
        reject(new Error('Request failed: ' + (err.errMsg || 'unknown')));
      }
    });
  });
}

// 解析3个运势内容
function parseReadings(fullText) {
  // 清理thinking内容
  let cleaned = fullText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // 按分隔符切割
  const parts = cleaned.split(/===第[一二三]项===/);
  const filtered = parts.filter(p => p.trim().length > 0);

  // 如果没有分隔符，尝试按其他方式分割
  if (filtered.length < 3) {
    // 尝试按"###"分割
    const altParts = cleaned.split(/#{3,}/);
    const altFiltered = altParts.filter(p => p.trim().length > 0);
    if (altFiltered.length >= 3) {
      return altFiltered.slice(0, 3).map(t => t.trim());
    }
    // 尝试按段落长度平均分割
    const lines = cleaned.split('\n');
    const totalLines = lines.length;
    const perType = Math.ceil(totalLines / 3);
    return [
      lines.slice(0, perType).join('\n').trim(),
      lines.slice(perType, perType * 2).join('\n').trim(),
      lines.slice(perType * 2).join('\n').trim()
    ];
  }

  return filtered.map(t => t.trim());
}

// 模拟打字效果，逐个卡片输出
function streamReadings(category, profile, onReadingStart, onChunk, onReadingComplete, onAllComplete, onError) {
  const types = category === 'chinese'
    ? ['bazi', 'ziwei', 'yijing']
    : ['constellation', 'tarot', 'astrology'];

  const typeNames = {
    bazi: '八字命理', ziwei: '紫微斗数', yijing: '易经卦象',
    constellation: '星座分析', tarot: '塔罗占卜', astrology: '占星术'
  };

  const prompt = buildReadingPrompt(category, profile);

  // 第一步：发起AI请求，显示所有卡片为loading
  types.forEach(function(type) {
    if (onReadingStart) onReadingStart(type, typeNames[type]);
  });

  callAI(prompt).then(function(fullText) {
    // 第二步：解析出3个运势内容
    const contents = parseReadings(fullText);

    // 第三步：逐个卡片输出
    let cardIndex = 0;

    function outputNextCard() {
      if (cardIndex >= types.length) {
        if (onAllComplete) onAllComplete();
        return;
      }

      const type = types[cardIndex];
      const content = contents[cardIndex] || '分析结果获取失败，请重试。';
      let charIndex = 0;
      const chunkSize = 3;

      const timer = setInterval(function() {
        charIndex += chunkSize;
        if (charIndex >= content.length) {
          charIndex = content.length;
          clearInterval(timer);
          if (onChunk) onChunk(type, content.substring(0, charIndex));
          if (onReadingComplete) onReadingComplete(type, typeNames[type], content);
          cardIndex++;
          outputNextCard();
          return;
        }
        if (onChunk) onChunk(type, content.substring(0, charIndex));
      }, 30);
    }

    outputNextCard();
  }).catch(function(err) {
    console.error('Reading error:', err);
    types.forEach(function(type) {
      if (onError) onError(type, err);
    });
  });
}

module.exports = {
  buildReadingPrompt,
  buildChatPrompt,
  callAI,
  streamReadings,
  parseReadings
};
