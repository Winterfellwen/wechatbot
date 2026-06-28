// fortune/services/ai-service.js
const app = getApp();
const knowledgeService = require('./knowledge-service');

function getConfig() {
  return {
    key: app.globalData.fortuneApiKey,
    apiUrl: app.globalData.fortuneApiUrl,
    model: app.globalData.fortuneModel,
    maxTokens: 20480
  };
}

const SYSTEM_PROMPT = `你是一个资深的命理分析师，精通中国传统文化和西方占星术。语言自然流畅，有深度。`;

function buildReadingPrompt(type, profile, calcData) {
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

  let calcSection = '';
  if (calcData && calcData.summary && !calcData.error && !calcData.needTime) {
    calcSection = `\n\n【排盘数据 · 由专业库计算】\n${calcData.summary}\n\n请基于以上真实排盘结果进行专业解读，禁止编造与排盘数据矛盾的内容。`;
  }

  return `请根据以下用户信息进行${typeName}分析。

【用户信息】
${profileInfo}
${calcSection}

【输出格式】

::overview:: 基本信息概览
（简要总结）

::core:: 核心分析
（深入分析）

::trend:: 运势解读
（详细运势）

::advice:: 开运建议
（3-5条建议）

::warn:: 注意事项
（特别提醒）

【要求】
1. 100%使用中文，禁止任何英文
2. 每个段落用 ::图标标记:: 开头，禁止使用 emoji
3. 分析要专业有深度
4. 语言生动有趣
5. 星座名等全部用中文（如"白羊座"不是"Aries"）

请直接输出分析结果。`;
}

// 构建综合测算 prompt（合并三类排盘数据为一次调用，按三类分别输出）
function buildUnifiedReadingPrompt(category, profile, calcResults) {
  var typeMap = category === 'chinese'
    ? { bazi: '八字命理', ziwei: '紫微斗数', yijing: '易经卦象' }
    : { constellation: '星座分析', tarot: '塔罗占卜', astrology: '占星术' };

  var iconMap = category === 'chinese'
    ? { bazi: 'bazi', ziwei: 'ziwei', yijing: 'yijing' }
    : { constellation: 'star', tarot: 'tarot', astrology: 'astro' };

  var profileInfo = '姓名：' + profile.name + '\n生日：' + profile.birthday + '\n性别：' + (profile.gender === 'male' ? '男' : '女');
  if (profile.birthTime) {
    profileInfo += '\n出生时辰：' + profile.birthTime;
  }

  var calcSection = '';
  var validCount = 0;
  Object.keys(typeMap).forEach(function(type) {
    var calcData = calcResults[type];
    if (calcData && calcData.summary && !calcData.error && !calcData.needTime) {
      calcSection += '\n\n【' + typeMap[type] + ' · 排盘数据】\n' + calcData.summary;
      validCount++;
    }
  });

  if (validCount === 0) return null;

  // === Classic Knowledge Injection ===
  var knowledgeText = '';
  if (category === 'chinese' && calcResults.bazi && !calcResults.bazi.error) {
    var baziKeys = [];
    if (calcResults.bazi.dayMaster) baziKeys.push(calcResults.bazi.dayMaster);
    if (calcResults.bazi.monthZhi) baziKeys.push(calcResults.bazi.monthZhi);
    var result = knowledgeService.match('chinese', baziKeys);
    if (result.chunks && result.chunks.length) {
      knowledgeText = '\n\n【经典依据】\n';
      result.chunks.forEach(function(c) {
        knowledgeText += '· ' + c.source + '（' + (c.summary || c.tags.dayMaster || '') + '）: ' + c.text + '\n';
      });
    }
  }

  var now = new Date();
  var today = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
  var weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  var weekDay = weekDays[now.getDay()];
  var yearInfo = now.getFullYear() + '年';

  var categoryName = category === 'chinese' ? '易学命理' : '西方星象';
  var typeList = Object.keys(typeMap).map(function(t) { return typeMap[t]; }).join('、');

  var methodOutlines = Object.keys(typeMap).map(function(type) {
    return '::' + iconMap[type] + ':: ' + typeMap[type] + '分析';
  }).join('\n');

  return '你是一个资深的运势分析师。请根据以下用户信息，用' + typeList + '三个方法进行综合分析。\n\n' +
    '【当前日期】\n' + today + ' 星期' + weekDay + '\n' + yearInfo + '\n\n' +
    '【用户信息】\n' + profileInfo + '\n' +
    calcSection +
    knowledgeText + '\n\n' +
    '【输出要求】\n' +
    '先给出今日运势概述（用 ::today:: 开头），\n' +
    '然后分别用三个方法推演（每个方法用对应标记开头）：\n' +
    methodOutlines + '\n' +
    '最后给出实用建议（用 ::advice:: 开头）。\n\n' +
    '基于排盘数据和经典依据分析，自由发挥，语言自然有深度。';
}

// 带深度思考的流式调用（reasoning 内容不显示，只触发 onThinking 回调）
function streamAIWithThinking(prompt, onThinking, onChunk, onDone, onError) {
  var config = getConfig();
  var fullText = '';
  var finishCalled = false;
  var fallbackTriggered = false;
  var hasThinking = false;

  function finish() {
    if (finishCalled) return;
    finishCalled = true;
    if (onDone) onDone(fullText);
  }

  // 思考阶段不降级，只在 30 秒完全无响应（无 reasoning 也无 content）才降级
  var fallbackTimer = setTimeout(function() {
    if (finishCalled || fullText.length > 0 || hasThinking) return;
    fallbackTriggered = true;
    callAI(prompt).then(function(content) {
      fullText = content;
      if (onChunk) onChunk(fullText);
      finish();
    }).catch(function(err) {
      if (onError) onError(err);
      finish();
    });
  }, 30000);

  var requestData = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: config.maxTokens,
    temperature: 0.7,
    reasoning_budget: 2048,
    stream: true
  };

  var task = wx.request({
    url: config.apiUrl + '/chat/completions',
    method: 'POST',
    enableChunked: true,
    timeout: 180000,
    header: {
      'Authorization': 'Bearer ' + config.key,
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
      if (fallbackTriggered || finishCalled) return;
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

            // reasoning 内容（深度思考）：不显示，只触发回调
            if (delta.reasoning) {
              hasThinking = true;
              clearTimeout(fallbackTimer);
              if (onThinking) onThinking();
            }

            // content 内容（最终回答）：显示给用户
            var chunk = delta.content || '';
            if (Array.isArray(chunk)) {
              chunk = chunk.map(function(c) { return c.text || ''; }).join('');
            }
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

  // 兜底：180 秒超时强制完成
  setTimeout(function() {
    clearTimeout(fallbackTimer);
    finish();
  }, 180000);
}

// 综合流式测算（一次调用，融合所有排盘）
function streamUnifiedReading(category, profile, calcResults, onThinking, onChunk, onDone, onError) {
  var prompt = buildUnifiedReadingPrompt(category, profile, calcResults);
  if (!prompt) {
    if (onError) onError(new Error('无有效排盘数据'));
    return;
  }
  streamAIWithThinking(prompt, onThinking, onChunk, onDone, onError);
}

function buildChatPrompt(profile, results, question, options, messages) {
  options = options || {};
  let resultsText = '';
  if (results && results.length > 0) {
    resultsText = results.map(r => `【${r.typeName}】\n${r.content}`).join('\n\n');
  }

  // 最近对话历史（最多 3 轮）
  var historyText = '';
  if (messages && messages.length > 0) {
    var recent = messages.slice(-6);
    historyText = recent.map(function(m) {
      var role = m.role === 'user' ? '用户' : '你';
      return role + ': ' + (m.content || '（思考中...）');
    }).join('\n');
  }

  let prompt = '你是一个专业的运势分析师，正在与用户进行一对一的追问对话。\n\n' +
    '【用户档案】\n' +
    '姓名：' + profile.name + '\n' +
    '生日：' + profile.birthday + '\n' +
    '性别：' + (profile.gender === 'male' ? '男' : '女') + '\n' +
    (profile.birthTime ? '出生时辰：' + profile.birthTime + '\n' : '') +
    '\n【运势分析结果（作为背景参考）】\n' + resultsText;

  if (options.fileContent) {
    prompt += '\n\n【用户上传的文件内容】\n文件名：' + options.fileName + '\n内容：\n' + options.fileContent;
  }

  if (historyText) {
    prompt += '\n\n【对话历史】\n' + historyText;
  }

  prompt += '\n\n【用户本次提问】\n' + question + '\n\n' +
    '【回答要求】\n' +
    '1. 结合运势分析结果和对话历史来回答\n' +
    '2. 简洁直接，问什么答什么\n' +
    '3. 语言自然，像真人对话\n' +
    '4. 需要时可用 ::advice:: 或 ::warn:: 图标标记重点';

  return prompt;
}

// 非流式调用（兜底）
function callAI(prompt) {
  var config = getConfig();
  return new Promise(function(resolve, reject) {
    var requestData = {
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.7,
      reasoning_budget: 0,
      stream: false
    };

    wx.request({
      url: config.apiUrl + '/chat/completions',
      method: 'POST',
      timeout: 120000,
      header: {
        'Authorization': 'Bearer ' + config.key,
        'Content-Type': 'application/json'
      },
      data: requestData,
      success: function(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.choices && res.data.choices[0]) {
          var message = res.data.choices[0].message;
          var content = message.content;
          // NVIDIA 部分模型 content 可能是数组格式 [{type:'text', text:'...'}]，需提取文本
          if (Array.isArray(content)) {
            content = content.map(function(c) { return c.text || ''; }).join('');
          }
          resolve(content || '');
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

// 流式调用 - 5秒无内容降级非流式
function streamAI(prompt, onChunk, onDone, onError) {
  var config = getConfig();
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
    callAI(prompt).then(function(content) {
      fullText = content;
      if (onChunk) onChunk(fullText);
      finish();
    }).catch(function(err) {
      if (onError) onError(err);
      finish();
    });
  }, 5000);

  var requestData = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: config.maxTokens,
    temperature: 0.7,
    reasoning_budget: 0,
    stream: true
  };

  var task = wx.request({
    url: config.apiUrl + '/chat/completions',
    method: 'POST',
    enableChunked: true,
    timeout: 120000,
    header: {
      'Authorization': 'Bearer ' + config.key,
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
      if (fallbackTriggered || finishCalled) return;
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
            // NVIDIA 部分模型 content 可能是数组格式
            if (Array.isArray(chunk)) {
              chunk = chunk.map(function(c) { return c.text || ''; }).join('');
            }

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
function streamReadings(category, profile, calcResults, onReadingStart, onChunk, onReadingComplete, onAllComplete, onError) {
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

    var calcData = calcResults[type] || null;
    var prompt = buildReadingPrompt(type, profile, calcData);

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
      }
    );
  }

  processNext();
}

// 读取文件内容
function readFileContent(filePath, fileName) {
  return new Promise(function(resolve, reject) {
    var ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'txt' || ext === 'md' || ext === 'csv') {
      wx.getFileSystemManager().readFile({
        filePath: filePath,
        encoding: 'utf-8',
        success: function(res) {
          var content = res.data || '';
          if (content.length > 3000) {
            content = content.substring(0, 3000) + '\n...(内容过长已截断)';
          }
          resolve(content);
        },
        fail: function(err) {
          reject(new Error('读取文件失败: ' + (err.errMsg || 'unknown')));
        }
      });
    } else {
      resolve('[文件: ' + fileName + ' - 暂不支持解析此格式，仅支持txt/md/csv]');
    }
  });
}

module.exports = {
  buildReadingPrompt,
  buildUnifiedReadingPrompt,
  buildChatPrompt,
  streamAI,
  streamAIWithThinking,
  streamUnifiedReading,
  callAI,
  streamReadings,
  readFileContent
};
