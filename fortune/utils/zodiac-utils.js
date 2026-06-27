/**
 * Zodiac-related utility functions for fortune-telling
 */

/**
 * Get Western zodiac sign from month and day
 * @param {number} month - Month (1-12)
 * @param {number} day - Day of month
 * @returns {string} Western zodiac sign
 */
function get星座(month, day) {
  const 星座Dates = [
    { sign: '水瓶座', start: [1, 20], end: [2, 18] },
    { sign: '双鱼座', start: [2, 19], end: [3, 20] },
    { sign: '白羊座', start: [3, 21], end: [4, 19] },
    { sign: '金牛座', start: [4, 20], end: [5, 20] },
    { sign: '双子座', start: [5, 21], end: [6, 21] },
    { sign: '巨蟹座', start: [6, 22], end: [7, 22] },
    { sign: '狮子座', start: [7, 23], end: [8, 22] },
    { sign: '处女座', start: [8, 23], end: [9, 22] },
    { sign: '天秤座', start: [9, 23], end: [10, 23] },
    { sign: '天蝎座', start: [10, 24], end: [11, 22] },
    { sign: '射手座', start: [11, 23], end: [12, 21] },
    { sign: '摩羯座', start: [12, 22], end: [1, 19] }
  ];
  
  for (const { sign, start, end } of 星座Dates) {
    const [startMonth, startDay] = start;
    const [endMonth, endDay] = end;
    
    if (month === startMonth && day >= startDay) {
      return sign;
    }
    if (month === endMonth && day <= endDay) {
      return sign;
    }
  }
  
  // Default case (shouldn't happen with valid input)
  return '摩羯座';
}

/**
 * Get zodiac element (fire, earth, air, water)
 * @param {string} constellation - Western zodiac sign
 * @returns {string} Zodiac element in Chinese
 */
function get星座元素(constellation) {
  const 元素 = {
    '白羊座': '火',
    '狮子座': '火',
    '射手座': '火',
    '金牛座': '土',
    '处女座': '土',
    '摩羯座': '土',
    '双子座': '风',
    '天秤座': '风',
    '水瓶座': '风',
    '巨蟹座': '水',
    '天蝎座': '水',
    '双鱼座': '水'
  };
  
  return 元素[constellation] || '未知';
}

/**
 * Get ruling planet for a zodiac sign
 * @param {string} constellation - Western zodiac sign
 * @returns {string} Ruling planet in Chinese
 */
function get守护星(constellation) {
  const 守护星 = {
    '白羊座': '火星',
    '金牛座': '金星',
    '双子座': '水星',
    '巨蟹座': '月亮',
    '狮子座': '太阳',
    '处女座': '水星',
    '天秤座': '金星',
    '天蝎座': '冥王星',
    '射手座': '木星',
    '摩羯座': '土星',
    '水瓶座': '天王星',
    '双鱼座': '海王星'
  };
  
  return 守护星[constellation] || '未知';
}

module.exports = {
  get星座,
  get星座元素,
  get守护星
};
