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

function calcConstellation(profile) {
  try {
    var parts = parseBirthday(profile.birthday);
    var solar = lunar.Solar.fromYmd(parts.year, parts.month, parts.day);
    // getXingZuo 返回2字符中文名（如"双鱼"）
    var star = solar.getXingZuo();

    var starMap = {
      '白羊': { element: '火象', rulingPlanet: '火星', dateRange: '3月21日-4月19日' },
      '金牛': { element: '土象', rulingPlanet: '金星', dateRange: '4月20日-5月20日' },
      '双子': { element: '风象', rulingPlanet: '水星', dateRange: '5月21日-6月21日' },
      '巨蟹': { element: '水象', rulingPlanet: '月亮', dateRange: '6月22日-7月22日' },
      '狮子': { element: '火象', rulingPlanet: '太阳', dateRange: '7月23日-8月22日' },
      '处女': { element: '土象', rulingPlanet: '水星', dateRange: '8月23日-9月22日' },
      '天秤': { element: '风象', rulingPlanet: '金星', dateRange: '9月23日-10月23日' },
      '天蝎': { element: '水象', rulingPlanet: '冥王星', dateRange: '10月24日-11月22日' },
      '射手': { element: '火象', rulingPlanet: '木星', dateRange: '11月23日-12月21日' },
      '摩羯': { element: '土象', rulingPlanet: '土星', dateRange: '12月22日-1月19日' },
      '水瓶': { element: '风象', rulingPlanet: '天王星', dateRange: '1月20日-2月18日' },
      '双鱼': { element: '水象', rulingPlanet: '海王星', dateRange: '2月19日-3月20日' }
    };

    var info = starMap[star] || {};
    var fullName = star + '座';
    var zodiac = solar.getLunar().getYearShengXiao();

    return {
      error: false,
      sign: fullName,
      element: info.element || '',
      rulingPlanet: info.rulingPlanet || '',
      dateRange: info.dateRange || '',
      zodiac: zodiac,
      summary: fullName + ' · ' + (info.element || '') + ' · 守护星' + (info.rulingPlanet || '') + ' | 生肖' + zodiac
    };
  } catch (e) {
    console.error('calcConstellation error:', e);
    return { error: true, summary: '星座计算失败' };
  }
}

// 易经64卦
var YIJING_HEXAGRAMS = [
  { name: '乾为天', judgment: '元亨利贞' },
  { name: '坤为地', judgment: '元亨，利牝马之贞' },
  { name: '水雷屯', judgment: '元亨利贞，勿用有攸往' },
  { name: '山水蒙', judgment: '亨，匪我求童蒙' },
  { name: '水天需', judgment: '有孚，光亨贞吉' },
  { name: '天水讼', judgment: '有孚窒惕，中吉终凶' },
  { name: '地水师', judgment: '贞，丈人吉无咎' },
  { name: '水地比', judgment: '吉，原筮元永贞' },
  { name: '风天小畜', judgment: '亨，密云不雨' },
  { name: '天泽履', judgment: '履虎尾，不咥人，亨' },
  { name: '地天泰', judgment: '小往大来，吉亨' },
  { name: '天地否', judgment: '否之匪人，不利君子贞' },
  { name: '天火同人', judgment: '同人于野，亨' },
  { name: '火天大有', judgment: '元亨' },
  { name: '地山谦', judgment: '亨，君子有终' },
  { name: '雷地豫', judgment: '利建侯行师' },
  { name: '泽雷随', judgment: '元亨利贞，无咎' },
  { name: '山风蛊', judgment: '元亨，利涉大川' },
  { name: '地泽临', judgment: '元亨，利贞' },
  { name: '风地观', judgment: '盥而不荐，有孚颙若' },
  { name: '火雷噬嗑', judgment: '亨，利用狱' },
  { name: '山火贲', judgment: '亨，小利有攸往' },
  { name: '山地剥', judgment: '不利有攸往' },
  { name: '地雷复', judgment: '亨，出入无疾' },
  { name: '天雷无妄', judgment: '元亨利贞' },
  { name: '山天大畜', judgment: '利贞，不家食吉' },
  { name: '山雷颐', judgment: '贞吉，观颐，自求口实' },
  { name: '泽风大过', judgment: '栋桡，利有攸往，亨' },
  { name: '坎为水', judgment: '习坎，有孚，维心亨' },
  { name: '离为火', judgment: '利贞，亨，畜牝牛吉' },
  { name: '泽山咸', judgment: '亨，利贞，取女吉' },
  { name: '雷风恒', judgment: '亨，无咎，利贞' },
  { name: '天山遁', judgment: '亨，小利贞' },
  { name: '雷天大壮', judgment: '利贞' },
  { name: '火地晋', judgment: '康侯用锡马蕃庶' },
  { name: '地火明夷', judgment: '利艰贞' },
  { name: '风火家人', judgment: '利女贞' },
  { name: '火泽睽', judgment: '小事吉' },
  { name: '水山蹇', judgment: '利西南，不利东北' },
  { name: '雷水解', judgment: '利西南，无所往' },
  { name: '山泽损', judgment: '有孚，元吉无咎' },
  { name: '风雷益', judgment: '利有攸往，利涉大川' },
  { name: '泽天夬', judgment: '扬于王庭，孚号有厉' },
  { name: '天风姤', judgment: '女壮，勿用取女' },
  { name: '泽地萃', judgment: '亨，王假有庙' },
  { name: '地风升', judgment: '元亨，用见大人' },
  { name: '泽水困', judgment: '亨，贞，大人吉' },
  { name: '水风井', judgment: '改邑不改井，无丧无得' },
  { name: '泽火革', judgment: '巳日乃孚，元亨利贞' },
  { name: '火风鼎', judgment: '元吉，亨' },
  { name: '震为雷', judgment: '亨，震来虩虩，笑言哑哑' },
  { name: '艮为山', judgment: '艮其背，不获其身' },
  { name: '风山渐', judgment: '女归吉，利贞' },
  { name: '雷泽归妹', judgment: '征凶，无攸利' },
  { name: '雷火丰', judgment: '亨，王假之' },
  { name: '火山旅', judgment: '小亨，旅贞吉' },
  { name: '巽为风', judgment: '小亨，利有攸往' },
  { name: '兑为泽', judgment: '亨，利贞' },
  { name: '风水涣', judgment: '亨，王假有庙' },
  { name: '水泽节', judgment: '亨，苦节不可贞' },
  { name: '风泽中孚', judgment: '豚鱼吉，利涉大川' },
  { name: '雷山小过', judgment: '亨利贞，可小事' },
  { name: '水火既济', judgment: '亨小，利贞' },
  { name: '火水未济', judgment: '亨，小狐汔济' }
];

function calcYijing() {
  try {
    // 50蓍草法简化：随机取一卦，再随机取动爻（1~6）
    var index = Math.floor(Math.random() * 64);
    var hexagram = YIJING_HEXAGRAMS[index];
    var changingLine = Math.floor(Math.random() * 6) + 1;

    return {
      error: false,
      hexagramName: hexagram.name,
      judgment: hexagram.judgment,
      changingLine: changingLine,
      summary: '本卦：' + hexagram.name + ' | 卦辞：' + hexagram.judgment + ' | 动爻：第' + changingLine + '爻'
    };
  } catch (e) {
    return { error: true, summary: '易经卦象生成失败' };
  }
}

// 塔罗22张大阿尔克那
var TAROT_MAJOR = [
  { name: '愚者', number: 0, upright: ['新开始', '冒险', '自由', '天真'], reversed: ['鲁莽', '犹豫', '冒失'], element: '风', planet: '天王星' },
  { name: '魔术师', number: 1, upright: ['创造力', '意志力', '技巧'], reversed: ['操纵', '无能', '欺骗'], element: '风', planet: '水星' },
  { name: '女祭司', number: 2, upright: ['直觉', '神秘', '智慧'], reversed: ['隐秘', '压抑', '被动'], element: '水', planet: '月亮' },
  { name: '皇后', number: 3, upright: ['丰饶', '母性', '创造'], reversed: ['依赖', '过度保护', '停滞'], element: '土', planet: '金星' },
  { name: '皇帝', number: 4, upright: ['权威', '结构', '控制'], reversed: ['专制', '僵化', '无力'], element: '火', planet: '白羊座' },
  { name: '教皇', number: 5, upright: ['传统', '信仰', '教导'], reversed: ['反叛', '异端', '自由思想'], element: '土', planet: '金牛座' },
  { name: '恋人', number: 6, upright: ['爱情', '选择', '和谐'], reversed: ['分裂', '错误选择', '失衡'], element: '风', planet: '双子座' },
  { name: '战车', number: 7, upright: ['胜利', '意志', '前进'], reversed: ['失控', '方向迷失', '侵略'], element: '水', planet: '巨蟹座' },
  { name: '力量', number: 8, upright: ['勇气', '耐心', '内在力量'], reversed: ['自我怀疑', '软弱', '缺乏信心'], element: '火', planet: '狮子座' },
  { name: '隐者', number: 9, upright: ['内省', '孤独', '智慧'], reversed: ['孤立', '退缩', '固执'], element: '土', planet: '处女座' },
  { name: '命运之轮', number: 10, upright: ['转折', '机遇', '命运'], reversed: ['厄运', '抗拒变化', '失控'], element: '火', planet: '木星' },
  { name: '正义', number: 11, upright: ['公平', '真相', '因果'], reversed: ['不公', '偏见', '不诚实'], element: '风', planet: '天秤座' },
  { name: '倒吊人', number: 12, upright: ['牺牲', '放下', '新视角'], reversed: ['无谓牺牲', '停滞', '抵抗'], element: '水', planet: '海王星' },
  { name: '死神', number: 13, upright: ['终结', '转变', '重生'], reversed: ['抗拒变化', '停滞', '恐惧'], element: '水', planet: '天蝎座' },
  { name: '节制', number: 14, upright: ['平衡', '调和', '耐心'], reversed: ['失衡', '过度', '缺乏耐心'], element: '火', planet: '射手座' },
  { name: '恶魔', number: 15, upright: ['束缚', '欲望', '物质主义'], reversed: ['解放', '觉醒', '挣脱'], element: '土', planet: '摩羯座' },
  { name: '高塔', number: 16, upright: ['突变', '破坏', '觉醒'], reversed: ['避免灾难', '恐惧变化', '延迟'], element: '火', planet: '火星' },
  { name: '星星', number: 17, upright: ['希望', '灵感', '宁静'], reversed: ['绝望', '失去信心', '消极'], element: '风', planet: '水瓶座' },
  { name: '月亮', number: 18, upright: ['幻觉', '直觉', '潜意识'], reversed: ['清晰', '真相显露', '释放恐惧'], element: '水', planet: '双鱼座' },
  { name: '太阳', number: 19, upright: ['喜悦', '成功', '活力'], reversed: ['暂时阴霾', '过度乐观', '延迟成功'], element: '火', planet: '太阳' },
  { name: '审判', number: 20, upright: ['重生', '觉醒', '救赎'], reversed: ['自我谴责', '犹豫', '错过呼唤'], element: '火', planet: '冥王星' },
  { name: '世界', number: 21, upright: ['完成', '成就', '圆满'], reversed: ['未完成', '停滞', '接近尾声'], element: '土', planet: '土星' }
];

function calcTarot() {
  try {
    var index = Math.floor(Math.random() * 22);
    var card = TAROT_MAJOR[index];
    var isReversed = Math.random() < 0.5;
    var meaning = isReversed ? card.reversed : card.upright;

    return {
      error: false,
      card: card.name,
      number: card.number,
      reversed: isReversed,
      meanings: meaning,
      element: card.element,
      planet: card.planet,
      summary: card.name + (isReversed ? '（逆位）' : '（正位）') + ' | 关键词：' + meaning.join('、') + ' | 元素' + card.element
    };
  } catch (e) {
    return { error: true, summary: '塔罗抽牌失败' };
  }
}

function calcAstrology(profile) {
  // 占星术复用星座数据，补充更多解读角度
  try {
    var conResult = calcConstellation(profile);
    if (conResult.error) return conResult;

    return {
      error: false,
      sign: conResult.sign,
      element: conResult.element,
      rulingPlanet: conResult.rulingPlanet,
      zodiac: conResult.zodiac,
      summary: conResult.sign + '占星分析 | ' + conResult.element + ' | 守护星' + conResult.rulingPlanet + ' | 生肖' + conResult.zodiac
    };
  } catch (e) {
    return { error: true, summary: '占星术分析失败' };
  }
}

function buildContext(profile, types) {
  // 汇总函数：按 types 数组依次调用对应排盘函数
  var results = {};
  types.forEach(function(type) {
    switch (type) {
      case 'bazi':
        results.bazi = calcBazi(profile);
        break;
      case 'ziwei':
        results.ziwei = calcZiwei(profile);
        break;
      case 'yijing':
        results.yijing = calcYijing();
        break;
      case 'constellation':
        results.constellation = calcConstellation(profile);
        break;
      case 'tarot':
        results.tarot = calcTarot();
        break;
      case 'astrology':
        results.astrology = calcAstrology(profile);
        break;
    }
  });
  return results;
}

module.exports = {
  parseBirthTime: parseBirthTime,
  parseBirthday: parseBirthday,
  BIRTH_TIME_MAP: BIRTH_TIME_MAP,
  calcBazi: calcBazi,
  calcZiwei: calcZiwei,
  calcConstellation: calcConstellation,
  calcYijing: calcYijing,
  calcTarot: calcTarot,
  calcAstrology: calcAstrology,
  buildContext: buildContext
};
