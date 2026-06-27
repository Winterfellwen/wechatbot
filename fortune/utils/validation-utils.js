/**
 * Validation utility functions for fortune-telling
 */

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateStr - Date string to validate
 * @returns {object} { valid: boolean, message: string }
 */
function validateDate(dateStr) {
  if (!dateStr) return { valid: false, message: '请输入出生日期' };
  
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return { valid: false, message: '日期格式应为YYYY-MM-DD' };
  }
  
  const parts = dateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  
  if (year < 1900 || year > 2100) {
    return { valid: false, message: '年份应在1900-2100之间' };
  }
  
  if (month < 1 || month > 12) {
    return { valid: false, message: '月份应在1-12之间' };
  }
  
  if (day < 1 || day > 31) {
    return { valid: false, message: '日期应在1-31之间' };
  }
  
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { valid: false, message: '请输入有效的日期' };
  }
  
  return { valid: true, message: '' };
}

/**
 * Validate Chinese hour name
 * @param {string} 时辰 - Chinese hour name to validate
 * @returns {object} { valid: boolean, message: string }
 */
function validate时辰(时辰) {
  const valid时辰 = [
    '子时', '丑时', '寅时', '卯时', '辰时', '巳时',
    '午时', '未时', '申时', '酉时', '戌时', '亥时'
  ];
  
  if (!时辰) return { valid: false, message: '请选择出生时辰' };
  if (!valid时辰.includes(时辰)) {
    return { valid: false, message: '请选择有效的时辰' };
  }
  return { valid: true, message: '' };
}

/**
 * Validate gender value
 * @param {string} gender - Gender to validate
 * @returns {object} { valid: boolean, message: string }
 */
function validateGender(gender) {
  if (!gender) return { valid: false, message: '请选择性别' };
  if (!['male', 'female'].includes(gender)) {
    return { valid: false, message: '请选择有效的性别' };
  }
  return { valid: true, message: '' };
}

/**
 * Validate zodiac sign
 * @param {string} constellation - Zodiac sign to validate
 * @returns {object} { valid: boolean, message: string }
 */
function validate星座(constellation) {
  const valid星座 = [
    '白羊座', '金牛座', '双子座', '巨蟹座',
    '狮子座', '处女座', '天秤座', '天蝎座',
    '射手座', '摩羯座', '水瓶座', '双鱼座'
  ];
  
  if (!constellation) return { valid: false, message: '请选择星座' };
  if (!valid星座.includes(constellation)) {
    return { valid: false, message: '请选择有效的星座' };
  }
  return { valid: true, message: '' };
}

/**
 * Validate question input
 * @param {string} question - Question to validate
 * @returns {object} { valid: boolean, message: string }
 */
function validateQuestion(question) {
  if (!question || question.trim() === '') {
    return { valid: false, message: '请输入您想要预测的问题' };
  }
  if (question.length > 200) {
    return { valid: false, message: '问题长度不能超过200字' };
  }
  return { valid: true, message: '' };
}

module.exports = {
  validateDate,
  validate时辰,
  validateGender,
  validate星座,
  validateQuestion
};
