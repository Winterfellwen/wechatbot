const fs = require('fs');

const API_KEY = '42b1e3d8fc82459fb528c1c8782f775c.8GI2WjrtTUKel1S5';

async function main() {
  const text = '个人简历\n\n姓名：张三\n电话：13800138000\n邮箱：zhangsan@example.com\n\n教育背景\n2018-2022 北京大学 计算机科学与技术 本科\n\n工作经历\n2022-至今 字节跳动 高级软件工程师\n- 负责微服务架构设计\n- 主导核心模块开发\n- 团队代码审查\n\n技能\n- JavaScript/TypeScript, Python, Go\n- React, Node.js, Docker\n- MySQL, Redis, Kafka'.repeat(5);

  const systemPrompt = `你是一个文档转换专家。你需要将pdf格式的文档转换为docx格式。
润色文档内容：修正语法错误，优化表达方式，保持原意不变。改善段落结构和可读性。

你必须严格按照以下格式输出，不要包含任何其他内容：
\`\`\`html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Document</title></head>
<body>
<!-- 在此输出完整的 HTML 内容 -->
</body>
</html>
\`\`\`

不输出任何解释、前言、后语。只输出上述格式包裹的 HTML 代码。`;

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'glm-4.7-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `以下是需要处理的文档内容：\n\n${text}` },
      ],
      max_tokens: 4096,
      temperature: 0.3,
      thinking: { type: 'disabled' },
    }),
  });

  const data = await response.json();
  const msg = data.choices?.[0]?.message || {};
  console.log('Status:', response.status);
  console.log('content length:', msg.content?.length);
  console.log('has HTML:', msg.content?.includes('<html>'));
  console.log('finish_reason:', data.choices?.[0]?.finish_reason);
  if (msg.content?.includes('<html>')) {
    fs.writeFileSync('E:\\AI\\wechatbot\\scripts\\test-output.html', msg.content);
    console.log('HTML output saved to test-output.html');
  } else {
    console.log('preview:', (msg.content || '').substring(0, 500));
  }
}

main().catch(e => console.error('Error:', e.message));
