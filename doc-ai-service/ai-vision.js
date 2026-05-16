const config = require('./config');
const cheerio = require('cheerio');

function buildVisionPrompt(sourceFmt, targetFmt, mode, title, imageGroups, totalPages) {
  const modeInstructions = {
    raw: '保持文档原有结构和内容，准确还原文本、表格、图片和布局。',
    polish: '润色文档内容：修正语法错误，优化表达方式，保持原意不变。改善段落结构和可读性。保留原始布局和图片。',
    format: '格式化文档：优化标题层级，整理段落结构，美化表格和列表，使其布局清晰专业。保留所有内容。',
    summarize: '提取文档的核心内容，生成结构化摘要。保留关键信息、主要论点和结论。省略次要细节。',
  };

  const groupList = imageGroups
    .map((g, i) => `图${i + 1}:第${g.pages}页`)
    .join('，');

  return [
    `你是一个文档转换专家。将${sourceFmt}格式文档转换为${targetFmt}格式。`,
    modeInstructions[mode] || modeInstructions.raw,
    '',
    `截图说明：本文档共${totalPages}页，发送${imageGroups.length}张合并图：`,
    groupList,
    '',
    '请仔细观察截图中的布局、表格、图片、文本框和排版样式。',
    '同时参考提取文本获取准确文字内容。',
    '截图和文本不一致时，以截图视觉布局为准，用文本补充准确文字。',
    '',
    '输出完整 HTML，包含 DOCTYPE、html、head、body 标签，保留原始布局和结构。',
    '表格用 <table>，图片用 <img src="data:...">，标题用 <h1>-<h3>。',
    '',
    '只输出 HTML 代码，用 ```html ... ``` 包裹，不输出其他内容。',
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

async function callVisionAI(imageGroups, text, htmlContent, sourceFmt, targetFmt, mode, title, totalPages) {
  const cfg = config.bigmodel;
  if (!cfg.apiKey) throw new Error('BIGMODEL_KEY 未配置');

  const prompt = buildVisionPrompt(sourceFmt, targetFmt, mode, title, imageGroups, totalPages);

  const contentParts = [
    { type: 'text', text: prompt },
    ...imageGroups.map(g => ({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${g.buffer.toString('base64')}` },
    })),
    { type: 'text', text: `以下是从文档中提取的文本（供参考，布局以截图为准）：\n\n${text.substring(0, 25000)}` },
  ];

  if (htmlContent && htmlContent.length < 10000) {
    contentParts.push({ type: 'text', text: `原始 HTML（供结构参考）：\n\n${htmlContent}` });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeout);

  try {
    const response = await fetch(cfg.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.visionModel,
        messages: [{ role: 'user', content: contentParts }],
        max_tokens: 32000,
        temperature: mode === 'polish' ? 0.3 : mode === 'format' ? 0.2 : 0.5,
        thinking: { type: 'disabled' },
      }),
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
}

module.exports = { callVisionAI };
