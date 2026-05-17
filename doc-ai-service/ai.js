const config = require('./config');

const PROVIDERS = [
  { name: 'BigModel', key: 'bigmodel', label: '智谱AI' },
  { name: 'OpenRouter', key: 'openrouter', label: 'OpenRouter' },
];

function buildPrompt(sourceText, sourceFormat, targetFormat, mode, title, imageInfo) {
  const modeInstructions = {
    polish: '润色文档内容：修正语法错误，优化表达方式，保持原意不变。改善段落结构和可读性。',
    format: '格式化文档：优化标题层级，整理段落结构，美化表格和列表，使其布局清晰专业。',
    summarize: '提取文档的核心内容，生成结构化摘要。保留关键信息、主要论点和结论。省略次要细节。',
  };

  const imageNote = imageInfo
    ? `\n⚠️ 重要：原文档包含 ${imageInfo.count} 张图片。你必须在输出中包含 ${imageInfo.count} 个 image section，每个 image section 的 index 从 0 开始递增。`
    : '';

  const textPreservationNote = `
⚠️ 严格保留原文中的所有事实信息，不得修改、替换或省略：
- 公司名称、人名、职位、联系方式（邮箱、电话必须逐字保留）
- 日期、时间、地点、数字
- 证书名称、学校名称、专业名称
- 项目名称、技术名词（如 VMware, AWS, Azure 等）
仅优化排版和格式，不改变任何实质性内容。`;

  const schemaExample = JSON.stringify({
    title: title || 'Document',
    sections: [
      { type: 'heading', level: 1, text: 'John Doe' },
      { type: 'paragraph', children: [{ text: 'Software Engineer with 5 years experience.', bold: false }] },
      { type: 'heading', level: 2, text: 'Work Experience' },
      { type: 'paragraph', children: [{ text: 'Company Name', bold: true }, { text: ' - Software Engineer' }] },
      { type: 'list', items: ['Led team of 5 developers', 'Delivered project 2 weeks early'], ordered: false },
      { type: 'image', index: 0, width: 400, height: 300, alignment: 'center' },
    ],
  }, null, 2);

  return [
    { role: 'system', content: `你是一个文档转换专家。你需要将${sourceFormat}格式的文档转换为${targetFormat}格式。
${modeInstructions[mode] || modeInstructions.polish}
${imageNote}
${textPreservationNote}

你必须输出一个 JSON 对象，包含 sections 数组。每个 section 必须是以下类型之一：
- heading: { type: "heading", level: 1-4, text: "标题文本" }
- paragraph: { type: "paragraph", children: [{ text: "文本", bold: false, italic: false }], alignment: "left" }
- image: { type: "image", index: 数字, width: 宽度, height: 高度, alignment: "center" }
- table: { type: "table", headers: ["列1"], rows: [["行1列1"]] }
- list: { type: "list", items: ["项目1"], ordered: false }

示例输出：
\`\`\`json
${schemaExample}
\`\`\`

不输出任何解释、前言、后语。只输出 JSON。` },
    { role: 'user', content: `以下是需要处理的文档内容：\n\n${sourceText.substring(0, 30000)}` },
  ];
}

function parseAIResponse(content) {
  const { parseAIResponse: parseJson } = require('./lib/json-fixer');
  const { validate } = require('./lib/json-schema');
  
  const { doc, error } = parseJson(content);
  if (error) throw new Error(`AI JSON 解析失败: ${error}`);
  
  const validation = validate(doc);
  if (!validation.valid) throw new Error(`AI JSON 验证失败: ${validation.error}`);
  
  return doc;
}

async function callProvider(cfg, messages, mode) {
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
        model: cfg.model,
        messages,
        max_tokens: mode === 'summarize' ? 2000 : cfg.maxTokens,
        temperature: mode === 'polish' ? 0.3 : mode === 'format' ? 0.2 : 0.5,
        ...(cfg.apiUrl.includes('bigmodel') ? { thinking: { type: 'disabled' } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown');
      throw new Error(`${response.status}: ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.delta?.content || '';
    if (!content) throw new Error('AI 返回内容为空');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

async function callAI(sourceText, sourceFormat, targetFormat, mode, title, imageInfo) {
  const messages = buildPrompt(sourceText, sourceFormat, targetFormat, mode, title, imageInfo);
  const errors = [];

  for (const provider of PROVIDERS) {
    const cfg = config[provider.key];
    if (!cfg.apiKey) {
      console.log(`[ai] ${provider.name} skipped: no API key`);
      continue;
    }

    for (let attempt = 1; attempt <= cfg.retries; attempt++) {
      try {
        const content = await callProvider(cfg, messages, mode);
        return parseAIResponse(content);
      } catch (err) {
        errors.push(`[${provider.name}] attempt ${attempt}/${cfg.retries}: ${err.message}`);
        console.error(`[ai] ${provider.name} attempt ${attempt}/${cfg.retries} failed:`, err.message);
        if (attempt < cfg.retries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    console.log(`[ai] ${provider.name} exhausted, falling back to next provider`);
  }

  throw new Error(`AI 处理失败（已重试所有服务商）:\n${errors.join('\n')}`);
}

module.exports = { callAI };
