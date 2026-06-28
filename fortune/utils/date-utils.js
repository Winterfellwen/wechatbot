/**
 * 运势模块日期相关工具函数
 * 注意：storage-service.js 有自己的 formatDate（接收 timestamp），
 *       calc-service.js 有 parseBirthTime/parseBirthday/BIRTH_TIME_MAP，
 *       生肖与干支由 lunar-javascript 在 calc-service.js 中处理。
 *       本文件仅保留可能被外部直接引用的通用工具函数。
 */

/**
 * 将 24 小时制小时数转换为时辰名
 * @param {number} hour - 24 小时制小时数（0-23）
 * @returns {string} 时辰名
 */
function get时辰Name(hour) {
  const 时辰Names = [
    '子时', '丑时', '寅时', '卯时', '辰时', '巳时',
    '午时', '未时', '申时', '酉时', '戌时', '亥时'
  ];

  // 每个时辰覆盖 2 小时
  // 子时: 23:00-01:00，丑时: 01:00-03:00，以此类推
  let index;
  if (hour === 23 || hour === 0) {
    index = 0; // 子时
  } else {
    index = Math.floor((hour + 1) / 2);
  }

  return 时辰Names[index];
}

/**
 * 将 Date 对象格式化为 YYYY-MM-DD 字符串
 * @param {Date} date - Date 对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = {
  get时辰Name,
  formatDate
};
