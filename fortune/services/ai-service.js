// fortune/services/ai-service.js

const NVIDIA_CONFIG = {
  key: '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',
  apiUrl: 'https://integrate.api.nvidia.com/v1',
  model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  maxTokens: 2000
};

// 构建测算提示词
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

【输出格式要求】
你必须严格按照以下格式输出，使用emoji作为段落标记：

📊 基本信息概览
（简要总结用户的关键命理信息）

🔮 核心分析
（根据${typeName}进行深入分析，分2-3个要点展开）

📈 运势解读
（详细的运势分析，包含各方面）

💡 开运建议
（给出3-5条具体实用的建议）

⚠️ 注意事项
（需要特别注意的事项）

【要求】
1. 必须使用中文，绝对不要出现英文
2. 每个段落用emoji开头
3. 分析要专业有深度，引用具体的命理知识
4. 语言生动有趣，通俗易懂
5. 建议要具体可执行

请直接输出分析结果，不要多余的开场白。`;
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

// 流式调用AI API
function streamAI(prompt, onChunk, onDone, onError, onThinking) {
  let task = null;
  let buffer = '';
  let hasRealContent = false;
  let doneCalled = false;

  function finish() {
    if (doneCalled) return;
    doneCalled = true;
    if (onDone) onDone();
  }

  try {
    task = wx.request({
      url: NVIDIA_CONFIG.apiUrl + '/chat/completions',
      method: 'POST',
      enableChunked: true,
      timeout: 60000,
      header: {
        'Authorization': 'Bearer ' + NVIDIA_CONFIG.key,
        'Content-Type': 'application/json'
      },
      data: {
        model: NVIDIA_CONFIG.model,
        messages: [
          { role: 'system', content: '你是专业的AI命理分析师，精通中国传统文化和西方占星术。你必须全程使用中文回答，绝对不要使用英文。输出要使用emoji作为段落标记，让内容更生动有趣。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: NVIDIA_CONFIG.maxTokens,
        temperature: 0.7,
        stream: true
      },
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          finish();
        } else {
          if (onError) onError(new Error('API error: ' + res.statusCode));
          finish();
        }
      },
      fail: function(err) {
        if (onError) onError(new Error('Request failed: ' + (err.errMsg || 'unknown')));
        finish();
      }
    });

    // 监听流式数据
    if (task && task.onChunkReceived) {
      task.onChunkReceived(function(res) {
        try {
          const data = new TextDecoder().decode(res.data);
          buffer += data;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') {
                finish();
                return;
              }
              try {
                const json = JSON.parse(jsonStr);
                if (json.choices && json.choices[0] && json.choices[0].delta) {
                  const reasoning = json.choices[0].delta.reasoning_content;
                  const content = json.choices[0].delta.content;
                  
                  // 如果有思考内容但还没有正式内容，继续思考阶段
                  if (reasoning && !content && !hasRealContent) {
                    if (onThinking) onThinking(reasoning);
                    continue;
                  }
                  
                  // 有正式内容时，标记进入输出阶段
                  if (content) {
                    if (!hasRealContent) {
                      hasRealContent = true;
                    }
                    if (onChunk) onChunk(content);
                  }
                }
              } catch (e) {
                // 解析失败，跳过
              }
            }
          }
        } catch (e) {
          console.error('Chunk parse error:', e);
        }
      });
    }
  } catch (e) {
    if (onError) onError(e);
  }

  return task;
}

// 非流式调用（用于对话）
function callAI(prompt) {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: NVIDIA_CONFIG.apiUrl + '/chat/completions',
      method: 'POST',
      timeout: 60000,
      header: {
        'Authorization': 'Bearer ' + NVIDIA_CONFIG.key,
        'Content-Type': 'application/json'
      },
      data: {
        model: NVIDIA_CONFIG.model,
        messages: [
          { role: 'system', content: '你是专业的AI命理分析师，精通中国传统文化和西方占星术。你必须全程使用中文回答，绝对不要使用英文。输出要使用emoji作为段落标记，让内容更生动有趣。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: NVIDIA_CONFIG.maxTokens,
        temperature: 0.7
      },
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
          var message = res.data.choices[0].message;
          var content = message.content || message.reasoning_content || message.reasoning || '';
          resolve(content);
        } else {
          reject(new Error('API error: ' + res.statusCode));
        }
      },
      fail: function(err) {
        reject(new Error('Request failed: ' + (err.errMsg || 'unknown')));
      }
    });
  });
}

// 流式测算（3个运势依次调用）
function streamReadings(category, profile, onReadingStart, onChunk, onReadingComplete, onAllComplete, onError) {
  const types = category === 'chinese' 
    ? ['bazi', 'ziwei', 'yijing']
    : ['constellation', 'tarot', 'astrology'];
  
  const typeNames = {
    bazi: '八字命理', ziwei: '紫微斗数', yijing: '易经卦象',
    constellation: '星座分析', tarot: '塔罗占卜', astrology: '占星术'
  };

  let currentTypeIndex = 0;
  let currentContent = '';

  function processNextType() {
    if (currentTypeIndex >= types.length) {
      if (onAllComplete) onAllComplete();
      return;
    }

    const type = types[currentTypeIndex];
    currentContent = '';
    
    if (onReadingStart) {
      onReadingStart(type, typeNames[type]);
    }

    const prompt = buildReadingPrompt(type, profile);
    
    streamAI(prompt, 
      // onChunk
      function(chunk) {
        currentContent += chunk;
        if (onChunk) onChunk(type, currentContent);
      },
      // onDone
      function() {
        if (onReadingComplete) onReadingComplete(type, typeNames[type], currentContent);
        currentTypeIndex++;
        processNextType();
      },
      // onError
      function(err) {
        if (onError) onError(type, err);
      }
    );
  }

  processNextType();
}

module.exports = {
  buildReadingPrompt,
  buildChatPrompt,
  streamAI,
  callAI,
  streamReadings
};
