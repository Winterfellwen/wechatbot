/**
 * Prompt generation service for fortune-telling
 * Loads templates and generates complete prompts for AI
 */

const fs = require('fs');
const path = require('path');

const PROMPT_DIR = path.join(__dirname, '..', 'data', 'prompts');

// Fortune type to prompt section mapping
const FORTUNE_TYPE_MAP = {
  // Chinese types
  yijing: { file: 'chinese_prompt.md', section: '易经卦象' },
  bazi: { file: 'chinese_prompt.md', section: '八字命理' },
  ziwei: { file: 'chinese_prompt.md', section: '紫微斗数' },
  wuxing: { file: 'chinese_prompt.md', section: '五行分析' },
  // Western types
  constellation: { file: 'western_prompt.md', section: '星座分析' },
  tarot: { file: 'western_prompt.md', section: '塔罗占卜' },
  astrology: { file: 'western_prompt.md', section: '占星术' }
};

/**
 * Load prompt template for fortune type
 * @param {string} type - Fortune type (e.g., 'yijing', 'tarot')
 * @returns {string|null} Prompt template or null if not found
 */
function loadPromptTemplate(type) {
  const typeConfig = FORTUNE_TYPE_MAP[type];
  if (!typeConfig) {
    console.error(`Unknown fortune type: ${type}`);
    return null;
  }

  try {
    const filePath = path.join(PROMPT_DIR, typeConfig.file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract the section for this fortune type
    const sectionStart = content.indexOf(`## ${typeConfig.section}提示词`);
    if (sectionStart === -1) {
      console.error(`Section not found: ${typeConfig.section}`);
      return null;
    }
    
    // Find the next section or end of file
    const nextSection = content.indexOf('\n## ', sectionStart + 1);
    const section = nextSection === -1 
      ? content.substring(sectionStart)
      : content.substring(sectionStart, nextSection);
    
    return section;
  } catch (e) {
    console.error('Failed to load prompt template:', e);
    return null;
  }
}

/**
 * Generate complete prompt for AI
 * @param {string} type - Fortune type
 * @param {Object} userInfo - User information
 * @param {string} question - User's question
 * @returns {string} Complete prompt
 */
function generatePrompt(type, userInfo, question) {
  const template = loadPromptTemplate(type);
  if (!template) {
    return generateDefaultPrompt(type, userInfo, question);
  }

  let prompt = template;

  // Replace placeholders with user info
  const replacements = {
    '{birthDate}': userInfo.birthDate || '未知',
    '{birthTime}': userInfo.birthTime || '未知',
    '{gender}': userInfo.gender || '未知',
    '{constellation}': userInfo.constellation || '未知',
    '{birthPlace}': userInfo.birthPlace || '未知',
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
  const typeNames = {
    yijing: '易经卦象',
    bazi: '八字命理',
    ziwei: '紫微斗数',
    wuxing: '五行分析',
    constellation: '星座分析',
    tarot: '塔罗占卜',
    astrology: '占星术'
  };

  const typeName = typeNames[type] || '运势分析';

  return `你是精通${typeName}的AI分析师。根据以下用户信息和问题，进行${typeName}分析：

**用户信息：**
- 出生日期：${userInfo.birthDate || '未知'}
- 出生时辰：${userInfo.birthTime || '未知'}
- 性别：${userInfo.gender || '未知'}
- 星座：${userInfo.constellation || '未知'}

**预测信息：**
- 预测类型：${typeName}
- 具体问题：${question || '综合运势'}

**要求：**
1. 提供专业的${typeName}分析
2. 结合用户的具体问题进行解读
3. 给出有深度的建议和指导
4. 语言要通俗易懂

**格式：**
- 分析结果
- 建议和指导`;
}

module.exports = {
  loadPromptTemplate,
  generatePrompt,
  FORTUNE_TYPE_MAP
};
