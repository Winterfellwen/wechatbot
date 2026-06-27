// fortune/data/thinking-texts.js

// 中式算命文言文语录
const CHINESE_TEXTS = [
  '☯ 天地玄黄，宇宙洪荒...',
  '🔮 日月盈昃，辰宿列张...',
  '📜 天行健，君子以自强不息...',
  '🏮 地势坤，君子以厚德载物...',
  '✨ 观乎天文，以察时变...',
  '🎋 一阴一阳之谓道...',
  '🌸 命由天定，运由己生...',
  '🌙 紫微斗数，星命推演...',
  '⭐ 四柱八字，五行生克...',
  '🔮 易经六十四卦，变化无穷...',
  '🏯 乾坤运转，阴阳调和...',
  '🎋 天干地支，六十甲子...',
  '✨ 五行相生相克，命运轮回...',
  '🌸 福兮祸所伏，祸兮福所倚...',
  '🌙 大衍之数五十，其用四十有九...',
  '🔮 贞观之道，在乎天人合一...'
];

// 西式占星拉丁语语录
const WESTERN_TEXTS = [
  '🌟 Ad astra per aspera (循此苦旅，以达星辰)...',
  '⭐ Per aspera ad astra (历经磨难，终抵繁星)...',
  '🌙 Stella cadens, fatum ducit (流星坠落，命运指引)...',
  '✨ Caelum et terra, omnia mutant (天地万物，皆在变化)...',
  '🔮 Per aspera, ad astra (穿越荆棘，直抵星辰)...',
  '⭐ Sidera ducunt, fatum sequitur (星辰指引，命运随行)...',
  '🌙 Ars longa, vita brevis (技艺永恒，人生短暂)...',
  '✨ Corona stellarum, fatum tuum (星冠加冕，命运已定)...',
  '🔮 Luna plena, energy crescit (月圆之时，能量渐增)...',
  '⭐ Sol illuminat, Luna revelat (太阳照耀，月亮揭示)...',
  '🌙 Per aspera ad astra, semper (历经磨难，终抵星辰)...',
  '✨ Virtus unita fortior (美德合一，更为强大)...',
  '🔮 Fata viam invenient (命运自会寻得出路)...',
  '⭐ Amor vincit omnia (爱能征服一切)...',
  '🌙 Tempus fugit, momenta manent (时光飞逝，瞬间永恒)...',
  '✨ Cogito ergo sum (我思故我在)...'
];

function getRandomText(category) {
  const texts = category === 'chinese' ? CHINESE_TEXTS : WESTERN_TEXTS;
  const index = Math.floor(Math.random() * texts.length);
  return texts[index];
}

function getRandomTexts(category, count) {
  const texts = category === 'chinese' ? CHINESE_TEXTS : WESTERN_TEXTS;
  const shuffled = [...texts].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count || 3);
}

module.exports = {
  CHINESE_TEXTS,
  WESTERN_TEXTS,
  getRandomText,
  getRandomTexts
};
