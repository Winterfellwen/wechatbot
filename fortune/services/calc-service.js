// fortune/services/calc-service.js
// 纯JS模块，无wx.*依赖，可在Node中测试

// 时辰名 → 小时映射（取各时辰中点）
var BIRTH_TIME_MAP = {
  '子时': 0,
  '丑时': 2,
  '寅时': 4,
  '卯时': 6,
  '辰时': 8,
  '巳时': 10,
  '午时': 12,
  '未时': 14,
  '申时': 16,
  '酉时': 18,
  '戌时': 20,
  '亥时': 22
};

function parseBirthTime(birthTime) {
  if (!birthTime) return null;
  var hour = BIRTH_TIME_MAP[birthTime];
  return hour !== undefined ? hour : null;
}

function parseBirthday(birthday) {
  // birthday 格式: "1990-03-15"
  var parts = birthday.split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10)
  };
}

module.exports = {
  parseBirthTime: parseBirthTime,
  parseBirthday: parseBirthday,
  BIRTH_TIME_MAP: BIRTH_TIME_MAP
};
