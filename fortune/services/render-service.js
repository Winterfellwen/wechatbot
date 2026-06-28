// fortune/services/render-service.js
// Markdown 转 HTML + AI 图标渲染（::icon:: → SVG img）

// SVG 内容 → img 标签（用 data URI，mp-html 一定支持）
function svgToImg(svgInner, viewBox) {
  var vb = viewBox || '0 0 24 24';
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="24" height="24">' + svgInner + '</svg>';
  return '<img src="data:image/svg+xml,' + encodeURIComponent(svg) + '" style="width:36rpx;height:36rpx;vertical-align:-7rpx;margin-right:10rpx;" />';
}

// 八卦图 SVG（玄黄 #f59e0b，viewBox 44x44）
function baguaSvg() {
  var inner =
    '<g fill="#f59e0b">' +
    // 乾 ☰ 0° 上方 - 三阳爻
    '<g transform="translate(22,7) rotate(0)"><rect x="-4" y="-2.5" width="8" height="1"/><rect x="-4" y="0" width="8" height="1"/><rect x="-4" y="2.5" width="8" height="1"/></g>' +
    // 兑 ☱ 45° 右上 - 上阴中阳下阳
    '<g transform="translate(32.6,11.4) rotate(45)"><rect x="-4" y="-2.5" width="3.5" height="1"/><rect x="0.5" y="-2.5" width="3.5" height="1"/><rect x="-4" y="0" width="8" height="1"/><rect x="-4" y="2.5" width="8" height="1"/></g>' +
    // 离 ☲ 90° 右 - 上阳中阴下阳
    '<g transform="translate(37,22) rotate(90)"><rect x="-4" y="-2.5" width="8" height="1"/><rect x="-4" y="0" width="3.5" height="1"/><rect x="0.5" y="0" width="3.5" height="1"/><rect x="-4" y="2.5" width="8" height="1"/></g>' +
    // 震 ☳ 135° 右下 - 上阴中阴下阳
    '<g transform="translate(32.6,32.6) rotate(135)"><rect x="-4" y="-2.5" width="3.5" height="1"/><rect x="0.5" y="-2.5" width="3.5" height="1"/><rect x="-4" y="0" width="3.5" height="1"/><rect x="0.5" y="0" width="3.5" height="1"/><rect x="-4" y="2.5" width="8" height="1"/></g>' +
    // 坤 ☷ 180° 下方 - 三阴爻
    '<g transform="translate(22,37) rotate(180)"><rect x="-4" y="-2.5" width="3.5" height="1"/><rect x="0.5" y="-2.5" width="3.5" height="1"/><rect x="-4" y="0" width="3.5" height="1"/><rect x="0.5" y="0" width="3.5" height="1"/><rect x="-4" y="2.5" width="3.5" height="1"/><rect x="0.5" y="2.5" width="3.5" height="1"/></g>' +
    // 艮 ☶ 225° 左下 - 上阳中阴下阴
    '<g transform="translate(11.4,32.6) rotate(225)"><rect x="-4" y="-2.5" width="8" height="1"/><rect x="-4" y="0" width="3.5" height="1"/><rect x="0.5" y="0" width="3.5" height="1"/><rect x="-4" y="2.5" width="3.5" height="1"/><rect x="0.5" y="2.5" width="3.5" height="1"/></g>' +
    // 坎 ☵ 270° 左 - 上阴中阳下阴
    '<g transform="translate(7,22) rotate(270)"><rect x="-4" y="-2.5" width="3.5" height="1"/><rect x="0.5" y="-2.5" width="3.5" height="1"/><rect x="-4" y="0" width="8" height="1"/><rect x="-4" y="2.5" width="3.5" height="1"/><rect x="0.5" y="2.5" width="3.5" height="1"/></g>' +
    // 巽 ☴ 315° 左上 - 上阳中阳下阴
    '<g transform="translate(11.4,11.4) rotate(315)"><rect x="-4" y="-2.5" width="8" height="1"/><rect x="-4" y="0" width="8" height="1"/><rect x="-4" y="2.5" width="3.5" height="1"/><rect x="0.5" y="2.5" width="3.5" height="1"/></g>' +
    // 中心太极圆
    '<circle cx="22" cy="22" r="6" fill="none" stroke="#f59e0b" stroke-width="1"/>' +
    // 阴阳鱼（右半边填充）
    '<path d="M22,16 A3,3 0 0,1 22,22 A3,3 0 0,0 22,28 A6,6 0 0,1 22,16 Z" fill="#f59e0b"/>' +
    // 鱼眼
    '<circle cx="22" cy="19" r="1" fill="#1c1917"/>' +
    '<circle cx="22" cy="25" r="1" fill="#f59e0b"/>' +
    '</g>';
  return svgToImg(inner, '0 0 44 44');
}

// 图标字典：标记名 → img 标签
var ICONS = {
  // 通用段落图标
  overview: svgToImg('<circle cx="12" cy="12" r="8" fill="none" stroke="#60a5fa" stroke-width="1.5"/><circle cx="12" cy="12" r="2.5" fill="#60a5fa"/>'),
  core: svgToImg('<polygon points="12,3 21,18 3,18" fill="#fbbf24"/><polygon points="12,21 3,6 21,6" fill="#fbbf24" opacity="0.5"/>'),
  trend: svgToImg('<polyline points="3,18 9,12 13,16 21,6" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="20" x2="21" y2="20" stroke="#34d399" stroke-width="1.5" opacity="0.4"/>'),
  advice: svgToImg('<rect x="6" y="6" width="12" height="12" fill="none" stroke="#fb923c" stroke-width="1.5" transform="rotate(45 12 12)"/><rect x="9.5" y="9.5" width="5" height="5" fill="#fb923c" transform="rotate(45 12 12)"/>'),
  warn: svgToImg('<circle cx="12" cy="12" r="8" fill="none" stroke="#ef4444" stroke-width="1.5"/><line x1="12" y1="8" x2="12" y2="13" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1.2" fill="#ef4444"/>'),
  // 中式三大类
  bazi: svgToImg('<rect x="3" y="6" width="3" height="12" rx="0.5" fill="#4ade80"/><rect x="8" y="8" width="3" height="10" rx="0.5" fill="#4ade80"/><rect x="13" y="5" width="3" height="13" rx="0.5" fill="#4ade80"/><rect x="18" y="9" width="3" height="9" rx="0.5" fill="#4ade80"/>'),
  ziwei: svgToImg('<circle cx="12" cy="12" r="2.5" fill="#a78bfa"/><circle cx="5" cy="12" r="1.3" fill="#a78bfa"/><circle cx="19" cy="12" r="1.3" fill="#a78bfa"/><circle cx="12" cy="5" r="1.3" fill="#a78bfa"/><circle cx="12" cy="19" r="1.3" fill="#a78bfa"/><circle cx="12" cy="12" r="9" fill="none" stroke="#a78bfa" stroke-width="0.8" stroke-dasharray="2 2"/>'),
  yijing: baguaSvg(),
  // 西式三大类
  star: svgToImg('<polygon points="12,2 14.5,9.5 22,12 14.5,14.5 12,22 9.5,14.5 2,12 9.5,9.5" fill="#e879f9"/>'),
  tarot: svgToImg('<rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="#c084fc" stroke-width="1.5"/><circle cx="12" cy="9" r="2" fill="#c084fc"/><line x1="9" y1="14" x2="15" y2="14" stroke="#c084fc" stroke-width="1"/><line x1="9" y1="17" x2="15" y2="17" stroke="#c084fc" stroke-width="1"/>'),
  astro: svgToImg('<ellipse cx="12" cy="12" rx="11" ry="4" fill="none" stroke="#38bdf8" stroke-width="1.5" transform="rotate(-22 12 12)"/><circle cx="12" cy="12" r="4" fill="none" stroke="#38bdf8" stroke-width="1.5"/><circle cx="10" cy="10" r="1.2" fill="#38bdf8"/>'),
  // 时间维度
  today: svgToImg('<circle cx="12" cy="12" r="4" fill="#fbbf24"/><g stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="7" y2="7"/><line x1="17" y1="17" x2="19" y2="19"/><line x1="5" y1="19" x2="7" y2="17"/><line x1="17" y1="7" x2="19" y2="5"/></g>'),
  year: svgToImg('<path d="M 20 12 A 8 8 0 1 1 12 4" fill="none" stroke="#f87171" stroke-width="1.5" stroke-linecap="round"/><circle cx="20" cy="12" r="2" fill="#f87171"/>')
};

// 把 ::icon:: 标记替换为 SVG img 标签
function renderIcons(text) {
  if (!text) return '';
  return text.replace(/::(\w+)::/g, function(match, name) {
    var img = ICONS[name];
    return img || match; // 未识别的标记原样返回
  });
}

// Markdown 转 HTML（从 chat-bubble.js 提取，保持一致）
function markdownToHtml(md) {
  if (!md) return '';
  var html = md;

  // 转义 HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 标题 ### ## #
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 粗体 **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 列表 - item
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
    return '<ul>' + match + '</ul>';
  });

  // 引用块 > text
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // 代码块 `code`
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // 换行
  html = html.replace(/\n/g, '<br/>');

  return html;
}

// 剥离 AI 思考内容（以 <think>...</think> 标记包裹）
// 兼容流式场景：</think> 未到达时也剥离未闭合的 <think> 块
function stripThinkTags(text) {
  if (!text) return '';
  var result = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  result = result.replace(/<think>[\s\S]*$/, '');
  return result.trim();
}

// 组合：Markdown → HTML → 图标渲染
// 顺序：先 markdown 转换（含 HTML 转义），再替换图标标记
// ::icon:: 标记不含 & < > 字符，转义不影响它
function toHtml(md) {
  var text = stripThinkTags(md || '');
  var html = markdownToHtml(text);
  html = renderIcons(html);
  return html;
}

module.exports = {
  renderIcons: renderIcons,
  markdownToHtml: markdownToHtml,
  toHtml: toHtml
};
