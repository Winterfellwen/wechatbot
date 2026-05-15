const config = require('./config');

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

async function callAI(sourceText, sourceFormat, targetFormat, mode, title) {
  if (!config.openrouter.apiKey) {
    throw new Error('AI 服务未配置：OPENROUTER_KEY 环境变量缺失，请管理员在 Render Dashboard 中设置');
  }
  const messages = buildPrompt(sourceText, sourceFormat, targetFormat, mode, title);
  let lastError;

  for (let attempt = 1; attempt <= config.openrouter.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.openrouter.timeout);

      try {
        const response = await fetch(config.openrouter.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.openrouter.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://doc-ai-service.onrender.com',
            'X-Title': 'DocAIService',
          },
          body: JSON.stringify({
            model: config.openrouter.model,
            messages,
            max_tokens: mode === 'summarize' ? 2000 : config.openrouter.maxTokens,
            temperature: mode === 'polish' ? 0.3 : mode === 'format' ? 0.2 : 0.5,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => 'Unknown');
          throw new Error(`OpenRouter ${response.status}: ${errText.substring(0, 100)}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        const htmlMatch = content.match(/```html\s*([\s\S]*?)```/);
        if (htmlMatch) return htmlMatch[1].trim();

        const cheerio = require('cheerio');
        const $ = cheerio.load(content);
        if ($('html').length > 0 || $('body').length > 0 || $('*').length > 0) {
          return $.html();
        }

        throw new Error('AI 输出无法解析为合法 HTML');
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      lastError = err;
      console.error(`[ai] attempt ${attempt}/${config.openrouter.retries} failed:`, err.message);
      if (attempt < config.openrouter.retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`AI 处理失败（已重试${config.openrouter.retries}次）: ${lastError.message}`);
}

module.exports = { callAI };
