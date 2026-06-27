// fortune/services/ai-service.js

const NVIDIA_CONFIG = {
  key: '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',
  apiUrl: 'https://integrate.api.nvidia.com/v1',
  model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  maxTokens: 2000
};

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

  return `你是精通${typeName}的资深AI命理分析师。你必须全程使用中文回答，绝对不要使用英文。

请根据以下用户信息进行${typeName}分析。

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
1. 必须使用中文，绝对不要出现英文
2. 每个段落用emoji开头
3. 分析要专业有深度
4. 语言生动有趣

请直接输出分析结果。`;
}

function buildChatPrompt(profile, results, question) {
  let resultsText = '';
  if (results && results.length > 0) {
    resultsText = results.map(r => `【${r.typeName}】\n${r.content}`).join('\n\n');
  }

  return `你是一个专业的运势分析师。你必须全程使用中文回答，绝对不要使用英文。

【用户档案】
姓名：${profile.name}
生日：${profile.birthday}
性别：${profile.gender === 'male' ? '男' : '女'}
${profile.birthTime ? '出生时辰：' + profile.birthTime : ''}

【运势分析结果】
${resultsText}

请回答用户的问题。要求：使用中文，适当使用emoji。`;
}

// 清理thinking标签
function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// 流式调用
function streamAI(prompt, onChunk, onDone, onError, onThinking) {
  var buffer = '';
  var hasRealContent = false;
  var finishCalled = false;

  function finish() {
    if (finishCalled) return;
    finishCalled = true;
    if (onDone) onDone();
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
    data: {
      model: NVIDIA_CONFIG.model,
      messages: [
        { role: 'system', content: '你是专业的AI命理分析师，精通中国传统文化和西方占星术。你必须全程使用中文回答，绝对不要使用英文。' },
        { role: 'user', content: prompt }
      ],
      max_tokens: NVIDIA_CONFIG.maxTokens,
      temperature: 0.7,
      stream: true
    },
    success: function(res) {
      // success不调finish，等[DONE]或超时
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (onError) onError(new Error('API error: ' + res.statusCode));
        finish();
      }
    },
    fail: function(err) {
      if (onError) onError(new Error('Request failed: ' + (err.errMsg || 'unknown')));
      finish();
    }
  });

  if (task && task.onChunkReceived) {
    task.onChunkReceived(function(res) {
      try {
        var data = new TextDecoder().decode(res.data);
        buffer += data;

        var lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf('data: ') !== 0) continue;

          var jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            finish();
            return;
          }

          try {
            var json = JSON.parse(jsonStr);
            if (!json.choices || !json.choices[0] || !json.choices[0].delta) continue;

            var delta = json.choices[0].delta;
            var reasoning = delta.reasoning_content || '';
            var content = delta.content || '';

            // 从content中移除<think>标签
            content = stripThinking(content);

            // 只有reasoning没有content → 思考阶段
            if (reasoning && !content && !hasRealContent) {
              if (onThinking) onThinking(reasoning);
              continue;
            }

            // 有实际内容
            if (content) {
              hasRealContent = true;
              if (onChunk) onChunk(content);
            }
          } catch (e) {}
        }
      } catch (e) {}
    });
  }

  // 安全网：如果60秒内没收到[DONE]，强制完成
  setTimeout(function() {
    finish();
  }, 60000);
}

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
          { role: 'system', content: '你是专业的AI命理分析师。你必须全程使用中文回答。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: NVIDIA_CONFIG.maxTokens,
        temperature: 0.7
      },
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
          var message = res.data.choices[0].message;
          var content = message.content || message.reasoning_content || '';
          resolve(stripThinking(content));
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
    var content = '';

    if (onReadingStart) onReadingStart(type, typeNames[type]);

    var prompt = buildReadingPrompt(type, profile);

    streamAI(prompt,
      function(chunk) {
        content += chunk;
        if (onChunk) onChunk(type, content);
      },
      function() {
        if (onReadingComplete) onReadingComplete(type, typeNames[type], content);
        currentTypeIndex++;
        processNext();
      },
      function(err) {
        if (onError) onError(type, err);
        currentTypeIndex++;
        processNext();
      }
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
