// fortune/pages/tarot/tarot-art.js
// 22张大阿尔卡那原创 SVG 矢量图案 — 紫金神秘风格，零版权风险
// 统一 viewBox 100x140，金色线条 + 深紫背景

var SVG_TEMPLATE = function(inner) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">' +
    '<rect width="100" height="140" rx="8" fill="#1e1b4b"/>' +
    '<rect x="3" y="3" width="94" height="134" rx="6" fill="none" stroke="#c4b5fd" stroke-width="0.8" opacity="0.4"/>' +
    inner +
    '</svg>';
};

var ART = {
  // 0 愚者 — 悬崖上的旅人 + 星辰
  0: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<circle cx="50" cy="45" r="14" fill="none"/>' +
    '<path d="M50 31 L50 59 M36 45 L64 45 M40 35 L60 55 M60 35 L40 55" stroke-width="1" opacity="0.6"/>' +
    '<circle cx="50" cy="45" r="4" fill="#fbbf24"/>' +
    '<path d="M30 100 Q50 80 70 100" fill="none" stroke="#c4b5fd" stroke-width="1.5"/>' +
    '<circle cx="25" cy="110" r="2" fill="#c4b5fd"/>' +
    '<circle cx="75" cy="108" r="1.5" fill="#c4b5fd"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">FOOL</text>' +
    '</g>'
  ),
  // 1 魔术师 — 无限符号∞ + 四元素
  1: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round">' +
    '<path d="M35 55 Q25 55 25 65 Q25 75 35 75 Q45 75 50 65 Q55 55 65 55 Q75 55 75 65 Q75 75 65 75 Q55 75 50 65 Q45 55 35 55 Z"/>' +
    '<line x1="50" y1="40" x2="50" y2="90" stroke="#c4b5fd" stroke-width="1" opacity="0.5"/>' +
    '<circle cx="50" cy="35" r="3" fill="#fbbf24"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">I</text>' +
    '</g>'
  ),
  // 2 女祭司 — 新月 + 柱子
  2: SVG_TEMPLATE(
    '<g fill="none" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M40 50 A15 15 0 1 0 60 50 A12 12 0 1 1 40 50 Z" fill="#c4b5fd" opacity="0.3"/>' +
    '<line x1="25" y1="40" x2="25" y2="90" stroke-width="2"/>' +
    '<line x1="75" y1="40" x2="75" y2="90" stroke-width="2"/>' +
    '<text x="25" y="105" text-anchor="middle" fill="#fbbf24" font-size="10">B</text>' +
    '<text x="75" y="105" text-anchor="middle" fill="#fbbf24" font-size="10">J</text>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">II</text>' +
    '</g>'
  ),
  // 3 皇后 — 花冠 + 麦穗
  3: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M35 50 Q50 35 65 50 Q65 60 50 55 Q35 60 35 50 Z" fill="#fbbf24" opacity="0.2"/>' +
    '<circle cx="42" cy="48" r="2" fill="#fbbf24"/>' +
    '<circle cx="50" cy="45" r="2" fill="#fbbf24"/>' +
    '<circle cx="58" cy="48" r="2" fill="#fbbf24"/>' +
    '<path d="M40 75 L40 90 M45 73 L45 90 M50 72 L50 90 M55 73 L55 90 M60 75 L60 90" stroke="#c4b5fd"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">III</text>' +
    '</g>'
  ),
  // 4 皇帝 — 王座 + 王冠
  4: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M35 35 L40 28 L45 35 L50 25 L55 35 L60 28 L65 35" fill="#fbbf24" opacity="0.3"/>' +
    '<rect x="35" y="50" width="30" height="40" fill="none" stroke="#c4b5fd"/>' +
    '<line x1="42" y1="60" x2="58" y2="60" stroke="#c4b5fd"/>' +
    '<line x1="42" y1="70" x2="58" y2="70" stroke="#c4b5fd"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">IV</text>' +
    '</g>'
  ),
  // 5 教皇 — 三重十字
  5: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round">' +
    '<line x1="50" y1="35" x2="50" y2="90"/>' +
    '<line x1="40" y1="45" x2="60" y2="45"/>' +
    '<line x1="42" y1="55" x2="58" y2="55"/>' +
    '<line x1="44" y1="65" x2="56" y2="65"/>' +
    '<path d="M35 85 Q50 75 65 85" stroke="#c4b5fd"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">V</text>' +
    '</g>'
  ),
  // 6 恋人 — 双心 + 天使
  6: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M35 55 Q30 50 30 45 Q30 40 35 40 Q40 40 40 45 Q40 50 35 55 Z" fill="#fbbf24" opacity="0.2"/>' +
    '<path d="M65 55 Q60 50 60 45 Q60 40 65 40 Q70 40 70 45 Q70 50 65 55 Z" fill="#fbbf24" opacity="0.2"/>' +
    '<path d="M50 30 L50 40 M45 35 L55 35" stroke="#c4b5fd"/>' +
    '<circle cx="50" cy="28" r="3" fill="#c4b5fd"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">VI</text>' +
    '</g>'
  ),
  // 7 战车 — 战车方阵
  7: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<rect x="30" y="50" width="40" height="25" fill="none" stroke="#c4b5fd"/>' +
    '<circle cx="35" cy="85" r="6" fill="none"/>' +
    '<circle cx="65" cy="85" r="6" fill="none"/>' +
    '<line x1="35" y1="78" x2="35" y2="72" stroke="#c4b5fd"/>' +
    '<line x1="65" y1="78" x2="65" y2="72" stroke="#c4b5fd"/>' +
    '<path d="M40 45 L45 38 L55 38 L60 45" fill="#fbbf24" opacity="0.3"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">VII</text>' +
    '</g>'
  ),
  // 8 力量 — 无限结 + 狮子
  8: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M40 50 Q30 50 30 60 Q30 70 40 70 Q50 70 50 60 Q50 50 60 50 Q70 50 70 60 Q70 70 60 70 Q50 70 50 60" stroke="#c4b5fd"/>' +
    '<circle cx="50" cy="85" r="12" fill="none" stroke="#fbbf24"/>' +
    '<circle cx="46" cy="83" r="1.5" fill="#fbbf24"/>' +
    '<circle cx="54" cy="83" r="1.5" fill="#fbbf24"/>' +
    '<path d="M45 90 Q50 93 55 90" stroke-width="1"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">VIII</text>' +
    '</g>'
  ),
  // 9 隐者 — 提灯
  9: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<line x1="50" y1="35" x2="50" y2="60"/>' +
    '<path d="M42 60 L58 60 L55 75 L45 75 Z" fill="#fbbf24" opacity="0.2"/>' +
    '<circle cx="50" cy="67" r="4" fill="#fbbf24"/>' +
    '<path d="M40 80 Q50 95 60 80" stroke="#c4b5fd"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">IX</text>' +
    '</g>'
  ),
  // 10 命运之轮 — 轮盘
  10: SVG_TEMPLATE(
    '<g fill="none" stroke="#c4b5fd" stroke-width="1.5">' +
    '<circle cx="50" cy="60" r="18" stroke="#fbbf24"/>' +
    '<circle cx="50" cy="60" r="12" stroke="#c4b5fd"/>' +
    '<line x1="32" y1="60" x2="68" y2="60" stroke="#c4b5fd" stroke-width="1"/>' +
    '<line x1="50" y1="42" x2="50" y2="78" stroke="#c4b5fd" stroke-width="1"/>' +
    '<line x1="37" y1="47" x2="63" y2="73" stroke="#c4b5fd" stroke-width="0.8"/>' +
    '<line x1="63" y1="47" x2="37" y2="73" stroke="#c4b5fd" stroke-width="0.8"/>' +
    '<circle cx="50" cy="60" r="3" fill="#fbbf24"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">X</text>' +
    '</g>'
  ),
  // 11 正义 — 天平
  11: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<line x1="50" y1="35" x2="50" y2="85"/>' +
    '<line x1="30" y1="50" x2="70" y2="50"/>' +
    '<path d="M25 50 L30 65 L35 50" fill="none" stroke="#c4b5fd"/>' +
    '<path d="M65 50 L70 65 L75 50" fill="none" stroke="#c4b5fd"/>' +
    '<path d="M45 85 Q50 80 55 85" stroke="#c4b5fd"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">XI</text>' +
    '</g>'
  ),
  // 12 倒吊人 — 倒三角
  12: SVG_TEMPLATE(
    '<g fill="none" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round">' +
    '<line x1="50" y1="35" x2="50" y2="60"/>' +
    '<path d="M40 60 L60 60 L50 80 Z" fill="#c4b5fd" opacity="0.2"/>' +
    '<circle cx="50" cy="68" r="3" fill="#fbbf24"/>' +
    '<path d="M35 90 Q50 100 65 90" stroke="#fbbf24" stroke-width="1"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">XII</text>' +
    '</g>'
  ),
  // 13 死神 — 骷髅
  13: SVG_TEMPLATE(
    '<g fill="none" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round">' +
    '<circle cx="50" cy="50" r="15" fill="none" stroke="#fbbf24"/>' +
    '<circle cx="44" cy="48" r="3" fill="#fbbf24"/>' +
    '<circle cx="56" cy="48" r="3" fill="#fbbf24"/>' +
    '<path d="M46 58 L48 62 L50 58 L52 62 L54 58" fill="none" stroke="#fbbf24" stroke-width="1"/>' +
    '<path d="M40 75 L45 90 M50 72 L50 90 M60 75 L55 90" stroke="#c4b5fd"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">XIII</text>' +
    '</g>'
  ),
  // 14 节制 — 天使翅膀 + 杯子
  14: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M30 45 Q25 55 30 65 Q35 55 35 45 Z" fill="#fbbf24" opacity="0.2"/>' +
    '<path d="M70 45 Q75 55 70 65 Q65 55 65 45 Z" fill="#fbbf24" opacity="0.2"/>' +
    '<path d="M42 55 L58 55 L54 70 L46 70 Z" stroke="#c4b5fd"/>' +
    '<path d="M50 40 L50 55" stroke="#c4b5fd"/>' +
    '<path d="M45 50 Q50 48 55 50" stroke-width="1"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">XIV</text>' +
    '</g>'
  ),
  // 15 恶魔 — 山羊角 + 五芒星倒
  15: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M35 45 Q30 35 32 28 M65 45 Q70 35 68 28" stroke="#c4b5fd"/>' +
    '<circle cx="50" cy="55" r="12" fill="none"/>' +
    '<circle cx="45" cy="53" r="2" fill="#fbbf24"/>' +
    '<circle cx="55" cy="53" r="2" fill="#fbbf24"/>' +
    '<path d="M44 62 L56 62" stroke-width="1"/>' +
    '<path d="M50 70 L45 78 L55 78 Z" fill="#c4b5fd" opacity="0.2"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">XV</text>' +
    '</g>'
  ),
  // 16 高塔 — 塔楼 + 闪电
  16: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<rect x="38" y="45" width="24" height="45" fill="none" stroke="#c4b5fd"/>' +
    '<path d="M44 40 L44 45 M50 38 L50 45 M56 40 L56 45" stroke="#c4b5fd"/>' +
    '<path d="M45 55 L55 65 L48 65 L55 75" fill="none" stroke="#fbbf24" stroke-width="2"/>' +
    '<circle cx="50" cy="85" r="1.5" fill="#fbbf24"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">XVI</text>' +
    '</g>'
  ),
  // 17 星星 — 八角星
  17: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M50 30 L54 50 L70 50 L57 62 L62 78 L50 68 L38 78 L43 62 L30 50 L46 50 Z" fill="#fbbf24" opacity="0.3"/>' +
    '<circle cx="50" cy="55" r="4" fill="#c4b5fd"/>' +
    '<path d="M35 90 Q50 85 65 90" stroke="#c4b5fd" stroke-width="1"/>' +
    '<circle cx="30" cy="95" r="1.5" fill="#c4b5fd"/>' +
    '<circle cx="70" cy="95" r="1.5" fill="#c4b5fd"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">XVII</text>' +
    '</g>'
  ),
  // 18 月亮 — 弯月 + 星
  18: SVG_TEMPLATE(
    '<g fill="none" stroke="#c4b5fd" stroke-width="1.5" stroke-linecap="round">' +
    '<path d="M40 45 A15 15 0 1 0 60 45 A12 12 0 1 1 40 45 Z" fill="#c4b5fd" opacity="0.25"/>' +
    '<circle cx="30" cy="60" r="1.5" fill="#fbbf24"/>' +
    '<circle cx="70" cy="60" r="1.5" fill="#fbbf24"/>' +
    '<path d="M35 80 L40 88 M50 78 L50 90 M65 80 L60 88" stroke="#fbbf24" stroke-width="1"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">XVIII</text>' +
    '</g>'
  ),
  // 19 太阳 — 太阳光芒
  19: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<circle cx="50" cy="55" r="14" fill="#fbbf24" opacity="0.3"/>' +
    '<circle cx="50" cy="55" r="14" fill="none" stroke="#fbbf24" stroke-width="2"/>' +
    '<g stroke="#fbbf24" stroke-width="1.5">' +
    '<line x1="50" y1="30" x2="50" y2="37"/>' +
    '<line x1="50" y1="73" x2="50" y2="80"/>' +
    '<line x1="25" y1="55" x2="32" y2="55"/>' +
    '<line x1="68" y1="55" x2="75" y2="55"/>' +
    '<line x1="32" y1="37" x2="37" y2="42"/>' +
    '<line x1="63" y1="37" x2="58" y2="42"/>' +
    '<line x1="32" y1="73" x2="37" y2="68"/>' +
    '<line x1="63" y1="73" x2="58" y2="68"/>' +
    '</g>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">XIX</text>' +
    '</g>'
  ),
  // 20 审判 — 喇叭 + 天使
  20: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<circle cx="50" cy="38" r="5" fill="#fbbf24" opacity="0.2"/>' +
    '<path d="M40 45 Q35 50 30 55 L35 58 L40 52" fill="none" stroke="#c4b5fd"/>' +
    '<path d="M30 55 Q25 60 28 65" fill="none" stroke="#c4b5fd"/>' +
    '<line x1="45" y1="50" x2="45" y2="85" stroke="#c4b5fd"/>' +
    '<path d="M40 85 Q50 95 60 85" stroke="#c4b5fd"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">XX</text>' +
    '</g>'
  ),
  // 21 世界 — 花环 + 地球
  21: SVG_TEMPLATE(
    '<g fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">' +
    '<ellipse cx="50" cy="55" rx="22" ry="20" fill="none" stroke="#c4b5fd"/>' +
    '<ellipse cx="50" cy="55" rx="16" ry="14" fill="none" stroke="#fbbf24" opacity="0.5"/>' +
    '<circle cx="50" cy="55" r="8" fill="#fbbf24" opacity="0.2"/>' +
    '<line x1="42" y1="50" x2="58" y2="60" stroke="#fbbf24" stroke-width="1"/>' +
    '<line x1="58" y1="50" x2="42" y2="60" stroke="#fbbf24" stroke-width="1"/>' +
    '<text x="50" y="128" text-anchor="middle" fill="#c4b5fd" font-size="8" font-family="serif">XXI</text>' +
    '</g>'
  )
};

// 本地图片路径（韦特塔罗公共领域扫描件，需运行 download-tarot.sh 下载）
function getCardImagePath(number) {
  var padded = number < 10 ? '0' + number : '' + number;
  return '/fortune/pages/tarot/images/tarot-' + padded + '.jpg';
}

// 获取牌面艺术资源：优先本地图片，回退 SVG 矢量图
function getCardArt(number) {
  var svg = ART[number];
  if (!svg) return '';
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

module.exports = {
  getCardArt: getCardArt,
  getCardImagePath: getCardImagePath,
  ART: ART
};
