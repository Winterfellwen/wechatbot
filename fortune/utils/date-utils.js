/**
 * Date-related utility functions for fortune-telling
 */

/**
 * Get Chinese hour name from 24-hour format
 * @param {number} hour - Hour in 24-hour format (0-23)
 * @returns {string} Chinese hour name (时辰)
 */
function get时辰Name(hour) {
  const 时辰Names = [
    '子时', '丑时', '寅时', '卯时', '辰时', '巳时',
    '午时', '未时', '申时', '酉时', '戌时', '亥时'
  ];
  
  // Each 时辰 covers 2 hours
  // 子时: 23:00-01:00, 丑时: 01:00-03:00, etc.
  let index;
  if (hour === 23 || hour === 0) {
    index = 0; // 子时
  } else {
    index = Math.floor((hour + 1) / 2);
  }
  
  return 时辰Names[index];
}

/**
 * Get Heavenly Stems and Earthly Branches for a year
 * @param {number} year - Year in 4-digit format
 * @returns {string} 干支年份 (e.g., "庚午年")
 */
function get干支年份(year) {
  const 天干 = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const 地支 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  // Calculate based on the year
  // The cycle starts from 甲子年 (year 4 in the Gregorian calendar)
  const 天干Index = (year - 4) % 10;
  const 地支Index = (year - 4) % 12;
  
  return 天干[天干Index] + 地支[地支Index] + '年';
}

/**
 * Get Chinese zodiac animal for a year
 * @param {number} year - Year in 4-digit format
 * @returns {string} Chinese zodiac animal
 */
function get生肖(year) {
  const 生肖 = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const index = (year - 4) % 12;
  return 生肖[index];
}

/**
 * Format Date object to YYYY-MM-DD string
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date object
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object
 */
function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

module.exports = {
  get时辰Name,
  get干支年份,
  get生肖,
  formatDate,
  parseDate
};
