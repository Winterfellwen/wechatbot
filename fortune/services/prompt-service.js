/**
 * Prompt generation service for fortune-telling
 * Uses embedded prompts for WeChat Mini Program compatibility
 */

// Embedded prompt templates
const PROMPT_TEMPLATES = {
  yijing: `你是精通易经的AI分析师。根据以下用户信息和问题，进行易经卦象分析：

**用户信息：**
- 出生日期：{birthDate}
- 出生时辰：{birthTime}
- 性别：{gender}

**预测信息：**
- 预测类型：易经卦象
- 具体问题：{question}

**要求：**
1. 生成一个随机卦象（1-64）
2. 解读该卦的卦辞和象辞
3. 结合用户的具体问题进行分析
4. 引用易经中的相关典故
5. 提供具体的建议和指导
6. 语言要通俗易懂，有深度`,

  bazi: `你是精通八字命理的AI分析师。根据以下用户信息，进行八字命理分析：

**用户信息：**
- 出生日期：{birthDate}
- 出生时辰：{birthTime}
- 性别：{gender}

**预测信息：**
- 预测类型：八字命理
- 具体问题：{question}

**要求：**
1. 分析用户的八字格局
2. 解读天干地支的五行属性
3. 分析十神关系
4. 结合用户问题给出运势分析
5. 引用八字命理中的相关典故
6. 提供具体的建议和指导`,

  ziwei: `你是精通紫微斗数的AI分析师。根据以下用户信息，进行紫微斗数分析：

**用户信息：**
- 出生日期：{birthDate}
- 出生时辰：{birthTime}
- 性别：{gender}

**预测信息：**
- 预测类型：紫微斗数
- 具体问题：{question}

**要求：**
1. 分析用户的命盘格局
2. 解读主要星曜的影响
3. 分析十二宫位的吉凶
4. 结合用户问题给出运势分析
5. 引用紫微斗数中的相关典故
6. 提供具体的建议和指导`,

  constellation: `你是精通星座学的AI分析师。根据以下用户信息和问题，进行星座运势分析：

**用户信息：**
- 星座：{constellation}

**预测信息：**
- 预测类型：星座分析
- 具体问题：{question}

**要求：**
1. 分析星座特质
2. 预测今日运势
3. 结合希腊神话典故
4. 给出具体建议
5. 包含幸运数字、幸运颜色
6. 语言要生动有趣`,

  tarot: `你是精通塔罗牌的AI分析师。根据以下用户信息和问题，进行塔罗牌占卜：

**用户信息：**
- 星座：{constellation}

**预测信息：**
- 预测类型：塔罗占卜
- 具体问题：{question}

**要求：**
1. 随机抽取三张塔罗牌
2. 解读每张牌的含义
3. 结合用户问题进行分析
4. 给出具体建议
5. 引用塔罗牌的相关典故
6. 语言要有神秘感`,

  astrology: `你是精通占星术的AI分析师。根据以下用户信息，进行占星术分析：

**用户信息：**
- 出生日期：{birthDate}
- 星座：{constellation}

**预测信息：**
- 预测类型：占星术
- 具体问题：{question}

**要求：**
1. 分析用户的星盘配置
2. 解读主要行星和相位的影响
3. 分析十二宫位的含义
4. 结合用户问题给出运势分析
5. 引用占星术中的相关典故
6. 提供具体的建议和指导`
};

// Fortune type to Chinese name mapping
const TYPE_NAMES = {
  yijing: '易经卦象',
  bazi: '八字命理',
  ziwei: '紫微斗数',
  constellation: '星座分析',
  tarot: '塔罗占卜',
  astrology: '占星术'
};

/**
 * Generate complete prompt for AI
 * @param {string} type - Fortune type
 * @param {Object} userInfo - User information
 * @param {string} question - User's question
 * @returns {string} Complete prompt
 */
function generatePrompt(type, userInfo, question) {
  const template = PROMPT_TEMPLATES[type];
  if (!template) {
    return generateDefaultPrompt(type, userInfo, question);
  }

  let prompt = template;

  // Replace placeholders with user info
  const replacements = {
    '{birthDate}': userInfo.birthDate || '未知',
    '{birthTime}': userInfo.birthTime || '未知',
    '{gender}': userInfo.gender === 'male' ? '男' : userInfo.gender === 'female' ? '女' : '未知',
    '{constellation}': userInfo.constellation || '未知',
    '{question}': question || '综合运势'
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    prompt = prompt.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  return prompt;
}

/**
 * Generate default prompt when template is not available
 * @param {string} type - Fortune type
 * @param {Object} userInfo - User information
 * @param {string} question - User's question
 * @returns {string} Default prompt
 */
function generateDefaultPrompt(type, userInfo, question) {
  const typeName = TYPE_NAMES[type] || '运势分析';

  return `你是精通${typeName}的AI分析师。根据以下用户信息和问题，进行${typeName}分析：

**用户信息：**
- 出生日期：${userInfo.birthDate || '未知'}
- 出生时辰：${userInfo.birthTime || '未知'}
- 性别：${userInfo.gender === 'male' ? '男' : userInfo.gender === 'female' ? '女' : '未知'}
- 星座：${userInfo.constellation || '未知'}

**预测信息：**
- 预测类型：${typeName}
- 具体问题：${question || '综合运势'}

**要求：**
1. 提供专业的${typeName}分析
2. 结合用户的具体问题进行解读
3. 给出有深度的建议和指导
4. 语言要通俗易懂`;
}

module.exports = {
  generatePrompt,
  TYPE_NAMES
};
