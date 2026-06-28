// fortune/services/ai-service.js

const NVIDIA_CONFIG = {
  key: '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',
  apiUrl: 'https://integrate.api.nvidia.com/v1',
  model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  maxTokens: 20480,
  readingMaxTokens: 3000
};

const SYSTEM_PROMPT = `你是专业的AI命理分析师，精通中国传统文化和西方占星术。

【强制规则 - 最高优先级】
1. 你必须100%全程使用中文，绝对禁止输出任何英文单词、英文句子、英文标点
2. 所有内容必须是中文，包括星座名、术语、地名等全部使用中文翻译
3. 如果你输出任何英文，将被视为严重错误`;

function buildReadingPrompt(type, profile) {
  const typeNames = {
    bazi: '八字命理',
    ziwei: '紫微斗数',
    yijing: '易经卦象',
    constellation: '星座分析',
    tarot: '塔罗占卜',
    astrology: '占星术'
  };

  const typeName = typeNames[type] || '运势分析';

  let profileInfo = `姓名：${profile.name}\n生日：${profile.birthday}\n性别：${profile.gender === 'male' ? '男' : '女'}`;
  if (profile.birthTime) {
    profileInfo += `\n出生时辰：${profile.birthTime}`;
  }

  return `请根据以下用户信息进行${typeName}分析。

【用户信息】
${profileInfo}

【输出格式】

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
1. 100%使用中文，禁止任何英文
2. 每个段落用emoji开头
3. 分析要专业有深度
4. 语言生动有趣
5. 星座名等全部用中文（如"白羊座"不是"Aries"）

请直接输出分析结果。`;
}

function buildChatPrompt(profile, results, question) {
  let resultsText = '';
  if (results && results.length > 0) {
    resultsText = results.map(r => `【${r.typeName}】\n${r.content}`).join('\n\n');
  }

  return `你是一个专业的运势分析师。

【用户档案】
姓名：${profile.name}
生日：${profile.birthday}
性别：${profile.gender === 'male' ? '男' : '女'}
${profile.birthTime ? '出生时辰：' + profile.birthTime : ''}

【运势分析结果】
${resultsText}

请回答用户的问题。要求：100%中文，禁止英文，适当使用emoji。`;
}

// 非流式调用（兜底）
function callAI(prompt, enableThinking) {
  return new Promise(function(resolve, reject) {
    var requestData = {
      model: NVIDIA_CONFIG.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: enableThinking ? NVIDIA_CONFIG.maxTokens : NVIDIA_CONFIG.readingMaxTokens,
      temperature: enableThinking ? 0.6 : 0.7
    };
    if (enableThinking) {
      requestData.reasoning_budget = 16384;
      requestData.grace_period = 1024;
    } else {
      requestData.enable_thinking = false;
    }

    wx.request({
      url: NVIDIA_CONFIG.apiUrl + '/chat/completions',
      method: 'POST',
      timeout: 120000,
      header: {
        'Authorization': 'Bearer ' + NVIDIA_CONFIG.key,
        'Content-Type': 'application/json'
      },
      data: requestData,
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
          var message = res.data.choices[0].message;
          resolve(message.content || '');
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

// 流式调用 - 只取content字段，5秒无内容降级非流式
function streamAI(prompt, onChunk, onDone, onError, enableThinking) {
  var fullText = '';
  var finishCalled = false;
  var fallbackTriggered = false;

  function finish() {
    if (finishCalled) return;
    finishCalled = true;
    if (onDone) onDone(fullText);
  }

  // 5秒兜底：流式没出内容就降级
  var fallbackTimer = setTimeout(function() {
    if (finishCalled || fullText.length > 0) return;
    fallbackTriggered = true;
    callAI(prompt, enableThinking).then(function(content) {
      fullText = content;
      finish();
    }).catch(function(err) {
      if (onError) onError(err);
      finish();
    });
  }, 5000);

  var requestData = {
    model: NVIDIA_CONFIG.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: enableThinking ? NVIDIA_CONFIG.maxTokens : NVIDIA_CONFIG.readingMaxTokens,
    temperature: enableThinking ? 0.6 : 0.7,
    stream: true
  };
  if (enableThinking) {
    requestData.reasoning_budget = 16384;
    requestData.grace_period = 1024;
  } else {
    requestData.enable_thinking = false;
  }

  var task = wx.request({
    url: NVIDIA_CONFIG.apiUrl + '/chat/completions',
    method: 'POST',
    enableChunked: true,
    timeout: 120000,
    header: {
      'Authorization': 'Bearer ' + NVIDIA_CONFIG.key,
      'Content-Type': 'application/json'
    },
    data: requestData,
    success: function(res) {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (onError) onError(new Error('API error: ' + res.statusCode));
        clearTimeout(fallbackTimer);
        finish();
      }
    },
    fail: function(err) {
      if (onError) onError(new Error('Request failed: ' + (err.errMsg || 'unknown')));
      clearTimeout(fallbackTimer);
      finish();
    }
  });

  if (task && task.onChunkReceived) {
    task.onChunkReceived(function(res) {
      if (fallbackTriggered) return;
      try {
        var data = new TextDecoder().decode(res.data);
        var lines = data.split('\n');

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf('data: ') !== 0) continue;

          var jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            clearTimeout(fallbackTimer);
            finish();
            return;
          }

          try {
            var json = JSON.parse(jsonStr);
            if (!json.choices || !json.choices[0] || !json.choices[0].delta) continue;

            var delta = json.choices[0].delta;
            var chunk = delta.content || '';

            if (chunk) {
              fullText += chunk;
              clearTimeout(fallbackTimer);
              if (onChunk) onChunk(fullText);
            }
          } catch (e) {}
        }
      } catch (e) {}
    });
  }

  // 兜底：90秒超时强制完成
  setTimeout(function() {
    clearTimeout(fallbackTimer);
    finish();
  }, 90000);
}

// 串行流式测算
function streamReadings(category, profile, onReadingStart, onChunk, onReadingComplete, onAllComplete, onError) {
  var types = category === 'chinese'
    ? ['bazi', 'ziwei', 'yijing']
    : ['constellation', 'tarot', 'astrology'];

  var typeNames = {
    bazi: '八字命理', ziwei: '紫微斗数', yijing: '易经卦象',
    constellation: '星座分析', tarot: '塔罗占卜', astrology: '占星术'
  };

  var currentTypeIndex = 0;

  function processNext() {
    if (currentTypeIndex >= types.length) {
      if (onAllComplete) onAllComplete();
      return;
    }

    var type = types[currentTypeIndex];

    if (onReadingStart) onReadingStart(type, typeNames[type]);

    var prompt = buildReadingPrompt(type, profile);

    streamAI(prompt,
      function(content) {
        if (onChunk) onChunk(type, content);
      },
      function(cleanedContent) {
        if (onReadingComplete) onReadingComplete(type, typeNames[type], cleanedContent);
        currentTypeIndex++;
        processNext();
      },
      function(err) {
        if (onError) onError(type, err);
        currentTypeIndex++;
        processNext();
      },
      false
    );
  }

  processNext();
}

module.exports = {
  buildReadingPrompt,
  buildChatPrompt,
  streamAI,
  callAI,
  streamReadings
};
