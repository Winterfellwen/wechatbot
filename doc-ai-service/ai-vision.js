const config = require('./config');
const cheerio = require('cheerio');

const VISION_PROVIDERS = [
  { name: 'OpenRouter', key: 'openrouter', modelField: 'visionModel' },
  { name: 'BigModel', key: 'bigmodel', modelField: 'visionModel' },
];

function buildVisionPrompt(sourceFmt, targetFmt, mode, title, imageGroups, totalPages) {
  const modeInstructions = {
    raw: '保持原有结构和内容。',
    polish: '润色表达方式，修正语法。',
    format: '优化标题层级和段落结构。',
    summarize: '提取核心内容生成摘要。',
  };

  const groupList = imageGroups
    .map((g, i) => `图${i + 1}:第${g.pages}页`)
    .join('，');

  return [
    `你是一个文档布局优化专家。用户已将${sourceFmt}文档转换为${targetFmt}（附后），`,
    '你需要参考原始文档截图，修复转换结果中的布局问题。',
    modeInstructions[mode] || modeInstructions.raw,
    '',
    `截图：共${totalPages}页，${imageGroups.length}张合并图：`,
    groupList,
    '',
    '你的任务：',
    '1. 对比截图和下方 HTML，修复布局/表格/图片/标题问题',
    '2. 补充截图中有但 HTML 中缺失的结构元素',
    '3. 保持文字内容不变，只调整结构和样式',
    '',
    '输出完整 HTML，用 ```html ... ``` 包裹。',
  ].join('\n');
}

function parseVisionResponse(content) {
  const htmlMatch = content.match(/```html\s*([\s\S]*?)```/);
  if (htmlMatch) return htmlMatch[1].trim();

  const $ = cheerio.load(content);
  if ($('html').length > 0 || $('body').length > 0) {
    return $.html();
  }

  throw new Error('视觉 AI 输出无法解析为合法 HTML');
}

async function callVisionProvider(provider, contentParts, mode) {
  const cfg = config[provider.key];
  if (!cfg || !cfg.apiKey) throw new Error(`${provider.name} API key 未配置`);

  const model = provider.modelField ? cfg[provider.modelField] || cfg.model : cfg.model;
  const isBigModel = cfg.apiUrl.includes('bigmodel');
  const timeout = isBigModel ? 90000 : 120000;

  const retries = cfg.retries || 2;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const body = {
          model,
          messages: [{ role: 'user', content: contentParts }],
          max_tokens: 32000,
          temperature: mode === 'polish' ? 0.3 : mode === 'format' ? 0.2 : 0.5,
        };
        if (isBigModel) body.thinking = { type: 'disabled' };

        const response = await fetch(cfg.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cfg.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => 'Unknown');
          throw new Error(`${response.status}: ${errText.substring(0, 100)}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        if (!content) throw new Error('视觉 AI 返回内容为空');
        return parseVisionResponse(content);
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      const isRateLimit = err.message.includes('429') || err.message.includes('1305');
      const isLastAttempt = attempt >= retries;
      if (isRateLimit && !isLastAttempt) {
        const delay = 3000 * attempt;
        console.log(`[vision] ${provider.name} attempt ${attempt}/${retries} rate limited, retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      } else if (isRateLimit && isLastAttempt) {
        console.log(`[vision] ${provider.name} exhausted (rate limited), falling back`);
        throw err;
      } else {
        throw err;
      }
    }
  }
}

async function callVisionAI(imageGroups, text, textAiHtml, sourceFmt, targetFmt, mode, title, totalPages) {
  const prompt = buildVisionPrompt(sourceFmt, targetFmt, mode, title, imageGroups, totalPages);

  const contentParts = [
    { type: 'text', text: prompt },
    ...imageGroups.map(g => ({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${g.buffer.toString('base64')}` },
    })),
    { type: 'text', text: `以下是文本 AI 已生成的 HTML（请参考截图修复其布局）：\n\n${textAiHtml.substring(0, 15000)}` },
    { type: 'text', text: `原始提取文本（供参考）：\n\n${text.substring(0, 10000)}` },
  ];

  const errors = [];
  for (const provider of VISION_PROVIDERS) {
    const cfg = config[provider.key];
    if (!cfg || !cfg.apiKey) {
      console.log(`[vision] ${provider.name} skipped: no API key`);
      continue;
    }
    try {
      return await callVisionProvider(provider, contentParts, mode);
    } catch (err) {
      errors.push(`[${provider.name}] ${err.message}`);
      console.error(`[vision] ${provider.name} failed:`, err.message);
    }
  }

  throw new Error(`所有视觉 AI 服务商均失败:\n${errors.join('\n')}`);
}

module.exports = { callVisionAI };
