const config = require('./config');

const PROVIDERS = [
  { name: 'BigModel', key: 'bigmodel', label: '智谱AI' },
  { name: 'OpenRouter', key: 'openrouter', label: 'OpenRouter' },
];

function buildPrompt(sourceText, sourceFormat, targetFormat, mode, title) {
  const modeInstructions = {
    polish: '润色文档内容：修正语法错误，优化表达方式，保持原意不变。改善段落结构和可读性。',
    format: '格式化文档：优化标题层级，整理段落结构，美化表格和列表，使其布局清晰专业。',
    summarize: '提取文档的核心内容，生成结构化摘要。保留关键信息、主要论点和结论。省略次要细节。',
  };

  return [
    { role: 'system', content: `你是一个文档转换专家。你需要将${sourceFormat}格式的文档转换为${targetFormat}格式。
${modeInstructions[mode] || modeInstructions.polish}

你必须严格按照以下格式输出，不要包含任何其他内容：
\`\`\`html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title || 'Document'}</title></head>
<body>
<!-- 在此输出完整的 HTML 内容 -->
</body>
</html>
\`\`\`

不输出任何解释、前言、后语。只输出上述格式包裹的 HTML 代码。` },
    { role: 'user', content: `以下是需要处理的文档内容：\n\n${sourceText.substring(0, 30000)}` },
  ];
}

function parseAIResponse(content) {
  const htmlMatch = content.match(/```html\s*([\s\S]*?)```/);
  if (htmlMatch) return htmlMatch[1].trim();

  const cheerio = require('cheerio');
  const $ = cheerio.load(content);
  if ($('html').length > 0 || $('body').length > 0 || $('*').length > 0) {
    return $.html();
  }

  throw new Error('AI 输出无法解析为合法 HTML');
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
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown');
      throw new Error(`${response.status}: ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) throw new Error('AI 返回内容为空');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

async function callAI(sourceText, sourceFormat, targetFormat, mode, title) {
  const messages = buildPrompt(sourceText, sourceFormat, targetFormat, mode, title);
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
