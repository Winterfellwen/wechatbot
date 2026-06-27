/**
 * Validation utility functions for fortune-telling
 */

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid
 */
function validateDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Basic range checks
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // Check actual date validity
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

/**
 * Validate Chinese hour name
 * @param {string} 时辰 - Chinese hour name to validate
 * @returns {boolean} True if valid
 */
function validate时辰(时辰) {
  const valid时辰 = [
    '子时', '丑时', '寅时', '卯时', '辰时', '巳时',
    '午时', '未时', '申时', '酉时', '戌时', '亥时'
  ];
  
  return valid时辰.includes(时辰);
}

/**
 * Validate gender value
 * @param {string} gender - Gender to validate
 * @returns {boolean} True if valid
 */
function validateGender(gender) {
  const validGenders = ['male', 'female', '男', '女'];
  return validGenders.includes(gender);
}

/**
 * Validate zodiac sign
 * @param {string} constellation - Zodiac sign to validate
 * @returns {boolean} True if valid
 */
function validate星座(constellation) {
  const valid星座 = [
    '白羊座', '金牛座', '双子座', '巨蟹座',
    '狮子座', '处女座', '天秤座', '天蝎座',
    '射手座', '摩羯座', '水瓶座', '双鱼座'
  ];
  
  return valid星座.includes(constellation);
}

/**
 * Validate question input
 * @param {string} question - Question to validate
 * @returns {boolean} True if valid
 */
function validateQuestion(question) {
  if (typeof question !== 'string') return false;
  
  const trimmed = question.trim();
  
  // Check minimum length
  if (trimmed.length < 2) return false;
  
  // Check maximum length
  if (trimmed.length > 500) return false;
  
  // Check for only whitespace
  if (trimmed.length === 0) return false;
  
  return true;
}

module.exports = {
  validateDate,
  validate时辰,
  validateGender,
  validate星座,
  validateQuestion
};
