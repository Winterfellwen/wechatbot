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

var lunar = require('lunar-javascript');

// 天干 → 五行 映射（日主五行用）
var GAN_WUXING = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};

function calcBazi(profile) {
  try {
    var parts = parseBirthday(profile.birthday);
    var hour = parseBirthTime(profile.birthTime);

    // 时辰缺失时返回 needTime，由上层提示用户补全
    if (hour === null) {
      return { needTime: true, error: false };
    }

    var solar = lunar.Solar.fromYmdHms(parts.year, parts.month, parts.day, hour, 0, 0);
    var lunarObj = solar.getLunar();
    var eightChar = lunarObj.getEightChar();

    // lunar-javascript 的 getYear/getMonth/getDay/getTime 直接返回干支字符串（如"庚午"）
    var yearPillar = eightChar.getYear();
    var monthPillar = eightChar.getMonth();
    var dayPillar = eightChar.getDay();
    var hourPillar = eightChar.getTime();

    // getDayGan 返回天干字符串（如"己"），不是对象
    var dayGan = eightChar.getDayGan();
    var dayMasterElement = GAN_WUXING[dayGan] || '';

    // 五行统计：getXxxWuXing 返回2字符字符串（如"金火"=年柱天干五行+地支五行）
    var elements = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
    var wuxings = [
      eightChar.getYearWuXing(),
      eightChar.getMonthWuXing(),
      eightChar.getDayWuXing(),
      eightChar.getTimeWuXing()
    ];
    wuxings.forEach(function(wx) {
      for (var i = 0; i < wx.length; i++) {
        var ch = wx.charAt(i);
        if (elements[ch] !== undefined) {
          elements[ch]++;
        }
      }
    });

    var missingElements = [];
    Object.keys(elements).forEach(function(k) {
      if (elements[k] === 0) missingElements.push(k);
    });

    var zodiac = lunarObj.getYearShengXiao();

    var summary = yearPillar + '年 ' +
                  monthPillar + '月 ' +
                  dayPillar + '日 ' +
                  hourPillar + '时 | ' +
                  '日主' + dayGan + dayMasterElement +
                  (missingElements.length > 0 ? ' | 五行缺' + missingElements.join('') : '') +
                  ' | 生肖' + zodiac;

    return {
      needTime: false,
      error: false,
      yearPillar: yearPillar,
      monthPillar: monthPillar,
      dayPillar: dayPillar,
      hourPillar: hourPillar,
      dayMaster: dayGan + dayMasterElement,
      fiveElements: elements,
      missingElements: missingElements,
      zodiac: zodiac,
      summary: summary
    };
  } catch (e) {
    console.error('calcBazi error:', e);
    return { error: true, needTime: false, summary: '八字排盘失败' };
  }
}

var iztro = require('iztro');

function calcZiwei(profile) {
  try {
    var parts = parseBirthday(profile.birthday);
    var hour = parseBirthTime(profile.birthTime);

    // 紫微斗数必须有时辰才能排盘
    if (hour === null) {
      return { needTime: true, error: false };
    }

    // iztro 的时辰索引：早子时=0, 丑时=1, ... 亥时=11（hour/2 正好对应）
    var timeIndex = hour / 2;
    // iztro 接收字符串日期 "YYYY-M-D"
    var solarDateStr = parts.year + '-' + parts.month + '-' + parts.day;
    var gender = profile.gender === 'female' ? '女' : '男';

    // 实际 API 为 astrolabeBySolarDate（注意：计划中的 bySolar 是旧名）
    var astrolabe = iztro.astro.astrolabeBySolarDate(solarDateStr, timeIndex, gender);

    // 从命宫提取主星（palaces 数组，palace.name === '命宫'）
    var majorStars = [];
    var lifePalace = '';
    var fiveElementLevel = astrolabe.fiveElementsClass || '';

    if (astrolabe.palaces && astrolabe.palaces.length > 0) {
      for (var i = 0; i < astrolabe.palaces.length; i++) {
        var palace = astrolabe.palaces[i];
        if (palace.name === '命宫') {
          lifePalace = palace.name;
          if (palace.majorStars && palace.majorStars.length > 0) {
            palace.majorStars.forEach(function(s) {
              if (s && s.name) majorStars.push(s.name);
            });
          }
          break;
        }
      }
    }

    var summary;
    if (majorStars.length > 0) {
      summary = '命宫主星：' + majorStars.join('、') + ' | ' + fiveElementLevel + ' | 命主' + (astrolabe.soul || '') + ' 身主' + (astrolabe.body || '');
    } else {
      // 命宫为空宫时，借对宫主星说明
      summary = '命宫空宫 | ' + fiveElementLevel + ' | 命主' + (astrolabe.soul || '') + ' 身主' + (astrolabe.body || '');
    }

    return {
      needTime: false,
      error: false,
      lifePalace: lifePalace,
      majorStars: majorStars,
      fiveElementLevel: fiveElementLevel,
      soul: astrolabe.soul || '',
      body: astrolabe.body || '',
      sign: astrolabe.sign || '',
      zodiac: astrolabe.zodiac || '',
      summary: summary
    };
  } catch (e) {
    console.error('calcZiwei error:', e);
    return { error: true, needTime: false, summary: '紫微斗数排盘失败' };
  }
}

module.exports = {
  parseBirthTime: parseBirthTime,
  parseBirthday: parseBirthday,
  BIRTH_TIME_MAP: BIRTH_TIME_MAP,
  calcBazi: calcBazi,
  calcZiwei: calcZiwei
};
