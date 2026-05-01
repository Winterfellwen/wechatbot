// word/utils/docx.js
// Shared DOCX generation (no DOM, no npm deps)
// Stack-based HTML parser + OOXML generators + ZIP utilities

var COLOR_NAMES = {
  red: 'FF0000', yellow: 'FFFF00', green: '008000', blue: '0000FF',
  black: '000000', white: 'FFFFFF', gray: '808080', grey: '808080',
  orange: 'FFA500', purple: '800080', pink: 'FFC0CB',
  cyan: '00FFFF', magenta: 'FF00FF', lime: '00FF00', navy: '000080',
  teal: '008080', maroon: '800000', silver: 'C0C0C0', aqua: '00FFFF',
  fuchsia: 'FF00FF', olive: '808000', brown: 'A52A2A', gold: 'FFD700',
  indigo: '4B0082', violet: 'EE82EE', tan: 'D2B48C', coral: 'FF7F50'
};

var FORMAT_DEFAULTS = {
  bold: false, italic: false, underline: false, strike: false,
  color: '', backgroundColor: '', fontSize: 0, fontFamily: ''
};

var TAG_DISPATCH = {
  b:       { bold: true },
  strong:  { bold: true },
  i:       { italic: true },
  em:      { italic: true },
  u:       { underline: true },
  s:       { strike: true },
  strike:  { strike: true },
  del:     { strike: true }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function htmlToDocx(html) {
  var blocks = htmlToBlocks(html);
  return buildDocx(blocks);
}

function htmlToDocxWithImages(html, imageDatas) {
  var blocks = htmlToBlocks(html);
  return buildDocx(blocks, imageDatas);
}

function getImageInfos(html) {
  var infos = [];
  if (!html) return infos;
  html.replace(/<img\s[^>]*?>/gi, function(match) {
    infos.push(parseImageAttrs(match));
    return '';
  });
  return infos;
}

// ---------------------------------------------------------------------------
// HTML Parser
// ---------------------------------------------------------------------------

function htmlToBlocks(html) {
  if (!html || !html.trim()) return [{ type: 'p', runs: [] }];

  // Normalize: <br> to placeholder, <div>/<section> to <p>
  html = html.replace(/<br\s*\/?>/gi, '\x00');
  html = html.replace(/<(div|section)(\s[^>]*)?>/gi, '<p>');
  html = html.replace(/<\/(div|section)>/gi, '</p>');

  var blocks = [];

  // Extract tables first, replace with placeholder tokens
  var tables = [];
  html = html.replace(/<table[\s\S]*?<\/table>/gi, function(match) {
    tables.push(parseTable(match));
    return '\x01TABLE_' + (tables.length - 1) + '\x01';
  });

  // Extract images, replace with placeholder tokens
  var images = [];
  html = html.replace(/<img\s[^>]*?>/gi, function(match) {
    var info = parseImageAttrs(match);
    images.push(info);
    return '\x02IMAGE_' + (images.length - 1) + '\x02';
  });

  // Split remaining HTML into block elements
  var parts = splitBlocks(html);
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    if (part.tableIdx !== undefined) {
      blocks.push(tables[part.tableIdx]);
      continue;
    }

    // Check if inner HTML contains table placeholders (e.g. <p> wraps a table)
    var inner = part.inner || '';
    var tableRe = /\x01TABLE_(\d+)\x01/g;
    var tableMatches = [];
    var tm;
    while ((tm = tableRe.exec(inner)) !== null) {
      tableMatches.push({ idx: parseInt(tm[1]), pos: tm.index, len: tm[0].length });
    }

    if (tableMatches.length > 0) {
      // Process inner in segments: text segments become paragraphs, placeholders become tables
      var parentAlign = extractAlign(part.attrs || '');
      var lastPos = 0;
      for (var ti = 0; ti < tableMatches.length; ti++) {
        var tMatch = tableMatches[ti];
        // Text before this placeholder
        if (tMatch.pos > lastPos) {
          var textBefore = inner.substring(lastPos, tMatch.pos).trim();
          if (textBefore) {
            var beforeRuns = parseInlineRuns(textBefore);
            blocks.push({ type: 'p', align: parentAlign, bullet: false, runs: beforeRuns });
          }
        }
        // The table
        blocks.push(tables[tMatch.idx]);
        lastPos = tMatch.pos + tMatch.len;
      }
      // Text after last placeholder
      if (lastPos < inner.length) {
        var textAfter = inner.substring(lastPos).trim();
        if (textAfter) {
          var afterRuns = parseInlineRuns(textAfter);
          blocks.push({ type: 'p', align: parentAlign, bullet: false, runs: afterRuns });
        }
      }
      continue;
    }

    var align = extractAlign(part.attrs || '');
    var runs = parseInlineRuns(inner);
    var type = part.tag || 'p';
    if (type === 'h1' || type === 'h2' || type === 'h3') {
      blocks.push({ type: type, align: align, runs: runs });
    } else if (type === 'li') {
      blocks.push({ type: 'li', align: align, bullet: true, runs: runs });
    } else {
      blocks.push({ type: 'p', align: align, bullet: false, runs: runs });
    }
  }

  if (blocks.length === 0) return [{ type: 'p', runs: [] }];
  return blocks;
}

function splitBlocks(html) {
  var parts = [];
  var re = /<(p|h([1-6])|li)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  var match;
  var lastEnd = 0;
  while ((match = re.exec(html)) !== null) {
    // Check for table placeholders between blocks
    if (match.index > lastEnd) {
      var between = html.substring(lastEnd, match.index).trim();
      if (between) extractPlaceholders(between, parts);
    }
    var tag = match[1].toLowerCase();
    var attrs = match[3] || '';
    var inner = match[4];
    if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
      tag = 'h3'; // collapse h4-h6 to h3
    }
    parts.push({ tag: tag, attrs: attrs, inner: inner });
    lastEnd = match.index + match[0].length;
  }
  // Handle text after last block
  if (lastEnd < html.length) {
    var trailing = html.substring(lastEnd).trim();
    if (trailing) extractPlaceholders(trailing, parts);
  }
  // If no blocks found, check for table placeholders or treat as one paragraph
  if (parts.length === 0) {
    extractPlaceholders(html, parts);
    if (parts.length === 0) {
      parts.push({ tag: 'p', attrs: '', inner: html });
    }
  }
  return parts;
}

function extractPlaceholders(text, parts) {
  var re = /\x01TABLE_(\d+)\x01/g;
  var match;
  while ((match = re.exec(text)) !== null) {
    parts.push({ tableIdx: parseInt(match[1]) });
  }
}

function parseInlineRuns(innerHtml) {
  if (!innerHtml) return [{ text: '', bold: false, italic: false, underline: false, strike: false, color: '', backgroundColor: '', fontSize: 0, fontFamily: '', lineBreak: false }];

  // Tokenize: tags and text content
  var tokens = [];
  var re = /(<[^>]+>)|([^<]+)/g;
  var m;
  while ((m = re.exec(innerHtml)) !== null) {
    if (m[1]) tokens.push({ type: 'tag', raw: m[1] });
    else if (m[2]) tokens.push({ type: 'text', raw: m[2] });
  }

  if (tokens.length === 0) {
    return [{ text: '', bold: false, italic: false, underline: false, strike: false, color: '', backgroundColor: '', fontSize: 0, fontFamily: '', lineBreak: false }];
  }

  var runs = [];
  var state = copyFormat(FORMAT_DEFAULTS);
  var stack = [];

  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (t.type === 'text') {
      var text = decodeEntities(t.raw);
      // Check for line break placeholder within text
      // Check for image placeholder
      if (text.indexOf('\x02') >= 0) {
        var imgRe = /\x02IMAGE_(\d+)\x02/g;
        var imgMatch;
        var imgLastIdx = 0;
        while ((imgMatch = imgRe.exec(text)) !== null) {
          if (imgMatch.index > imgLastIdx) {
            var beforeText = text.substring(imgLastIdx, imgMatch.index);
            runs.push(createRun(beforeText, state, false));
          }
          runs.push(createImageRun(parseInt(imgMatch[1])));
          imgLastIdx = imgMatch.index + imgMatch[0].length;
        }
        if (imgLastIdx < text.length) {
          runs.push(createRun(text.substring(imgLastIdx), state, false));
        }
      } else if (text.indexOf('\x00') >= 0) {
        var segments = text.split('\x00');
        for (var s = 0; s < segments.length; s++) {
          if (s > 0) {
            runs.push(createRun('', state, true));
          }
          if (segments[s]) {
            runs.push(createRun(segments[s], state, false));
          }
        }
      } else {
        runs.push(createRun(text, state, false));
      }
    } else {
      // Tag
      var closing = t.raw.substring(0, 2) === '</';
      var tagName = '';
      var attrs = '';
      if (closing) {
        tagName = t.raw.substring(2, t.raw.length - 1).toLowerCase();
      } else {
        var spaceIdx = t.raw.indexOf(' ');
        if (spaceIdx > 0) {
          tagName = t.raw.substring(1, spaceIdx).toLowerCase();
          attrs = t.raw.substring(spaceIdx, t.raw.length - 1);
        } else {
          tagName = t.raw.substring(1, t.raw.length - 1).toLowerCase();
        }
      }

      if (closing) {
        if (tagName === 'span') {
          state = stack.pop() || copyFormat(FORMAT_DEFAULTS);
        } else if (TAG_DISPATCH[tagName]) {
          state = stack.pop() || copyFormat(FORMAT_DEFAULTS);
        }
      } else {
        // Opening tag
        if (tagName === 'span') {
          stack.push(copyFormat(state));
          var spanProps = parseStyleAttr(attrs);
          applyFormat(state, spanProps);
        } else if (TAG_DISPATCH[tagName]) {
          stack.push(copyFormat(state));
          var tagProps = TAG_DISPATCH[tagName];
          applyFormat(state, tagProps);
        }
      }
    }
  }

  return coalesceRuns(runs);
}

function parseTable(tableHtml) {
  var rows = [];
  var trRe = /<tr[\s\S]*?<\/tr>/gi;
  var trMatch;
  while ((trMatch = trRe.exec(tableHtml)) !== null) {
    var cells = [];
    var tdRe = /<t[dh](\s[^>]*)?>([\s\S]*?)<\/t[dh]>/gi;
    var tdMatch;
    while ((tdMatch = tdRe.exec(trMatch[0])) !== null) {
      cells.push({ runs: parseInlineRuns(tdMatch[2]) });
    }
    if (cells.length > 0) rows.push({ cells: cells });
  }
  return { type: 'table', rows: rows };
}

function parseStyleAttr(styleStr) {
  var props = {};
  if (!styleStr) return props;
  // Extract style attribute value
  var m = styleStr.match(/style\s*=\s*"([^"]*)"/i);
  if (!m) m = styleStr.match(/style\s*=\s*'([^']*)'/i);
  var val = m ? m[1] : styleStr;
  var parts = val.split(';');
  for (var i = 0; i < parts.length; i++) {
    var kv = parts[i].split(':');
    if (kv.length < 2) continue;
    var key = kv[0].trim().toLowerCase();
    var v = kv.slice(1).join(':').trim();
    if (key === 'color') { props.color = resolveColor(v); }
    else if (key === 'background-color' || key === 'background') { props.backgroundColor = resolveColor(v); }
    else if (key === 'font-size') { props.fontSize = parseFloat(v) * 2; }
    else if (key === 'font-family') { props.fontFamily = v.replace(/^['"]|['"]$/g, ''); }
  }
  return props;
}

function resolveColor(str) {
  if (!str || str === 'transparent') return '';
  str = String(str).trim().toLowerCase();
  if (str.charAt(0) === '#') {
    var hex = str.substring(1);
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return hex.toUpperCase();
  }
  var rgbMatch = str.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])]
      .map(function(c) { var h = c.toString(16).toUpperCase(); return h.length === 1 ? '0' + h : h; })
      .join('');
  }
  return COLOR_NAMES[str] || '';
}

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function extractAlign(attrStr) {
  var m = (attrStr || '').match(/text-align\s*:\s*(left|center|right|justify)/i);
  if (m) {
    var a = m[1].toLowerCase();
    return a === 'justify' ? 'both' : a;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function copyFormat(src) {
  return {
    bold: src.bold, italic: src.italic, underline: src.underline, strike: src.strike,
    color: src.color, backgroundColor: src.backgroundColor,
    fontSize: src.fontSize, fontFamily: src.fontFamily
  };
}

function applyFormat(state, props) {
  if (props.bold !== undefined) state.bold = props.bold;
  if (props.italic !== undefined) state.italic = props.italic;
  if (props.underline !== undefined) state.underline = props.underline;
  if (props.strike !== undefined) state.strike = props.strike;
  if (props.color !== undefined && props.color) state.color = props.color;
  if (props.backgroundColor !== undefined && props.backgroundColor) state.backgroundColor = props.backgroundColor;
  if (props.fontSize !== undefined && props.fontSize) state.fontSize = props.fontSize;
  if (props.fontFamily !== undefined && props.fontFamily) state.fontFamily = props.fontFamily;
}

function createRun(text, state, lineBreak) {
  return {
    text: text,
    bold: state.bold, italic: state.italic, underline: state.underline, strike: state.strike,
    color: state.color, backgroundColor: state.backgroundColor,
    fontSize: state.fontSize, fontFamily: state.fontFamily,
    lineBreak: lineBreak
  };
}

function createImageRun(imageId) {
  return {
    text: '', bold: false, italic: false, underline: false, strike: false,
    color: '', backgroundColor: '', fontSize: 0, fontFamily: '',
    lineBreak: false, imageId: imageId
  };
}

function parseImageAttrs(imgTag) {
  var info = { src: '', width: 0, height: 0 };
  var srcMatch = imgTag.match(/src\s*=\s*"([^"]*)"/i);
  if (!srcMatch) srcMatch = imgTag.match(/src\s*=\s*'([^']*)'/i);
  if (srcMatch) info.src = srcMatch[1];
  var wMatch = imgTag.match(/width\s*=\s*"?(\d+)(px)?"?/i);
  if (wMatch) info.width = parseInt(wMatch[1]);
  var hMatch = imgTag.match(/height\s*=\s*"?(\d+)(px)?"?/i);
  if (hMatch && hMatch[1].toLowerCase() !== 'auto') info.height = parseInt(hMatch[1]);
  if (!info.width) info.width = 300;
  if (!info.height) info.height = 200;
  return info;
}

function coalesceRuns(runs) {
  var merged = [];
  for (var i = 0; i < runs.length; i++) {
    var r = runs[i];
    if (r.lineBreak) { merged.push(r); continue; }
    var last = merged.length > 0 ? merged[merged.length - 1] : null;
    if (last && !last.lineBreak &&
        last.bold === r.bold && last.italic === r.italic &&
        last.underline === r.underline && last.strike === r.strike &&
        last.color === r.color && last.backgroundColor === r.backgroundColor &&
        last.fontSize === r.fontSize && last.fontFamily === r.fontFamily) {
      last.text += r.text;
    } else {
      merged.push(r);
    }
  }
  if (merged.length === 0) {
    merged.push(createRun('', FORMAT_DEFAULTS, false));
  }
  return merged;
}

// ---------------------------------------------------------------------------
// OOXML Generators
// ---------------------------------------------------------------------------

function makeRunXml(run, imageInfos) {
  if (run.imageId !== undefined) {
    return makeImageRunXml(run.imageId, imageInfos);
  }
  var xml = '<w:r>';
  var needRPr = run.bold || run.italic || run.underline || run.strike ||
                run.color || run.backgroundColor || run.fontSize || run.fontFamily;
  if (needRPr) {
    xml += '<w:rPr>';
    if (run.bold) xml += '<w:b/>';
    if (run.italic) xml += '<w:i/>';
    if (run.underline) xml += '<w:u w:val="single"/>';
    if (run.strike) xml += '<w:strike/>';
    if (run.color) xml += '<w:color w:val="' + run.color + '"/>';
    if (run.backgroundColor) xml += '<w:shd w:fill="' + run.backgroundColor + '" w:val="clear"/>';
    if (run.fontSize) xml += '<w:sz w:val="' + run.fontSize + '"/><w:szCs w:val="' + run.fontSize + '"/>';
    if (run.fontFamily) xml += '<w:rFonts w:ascii="' + run.fontFamily + '" w:hAnsi="' + run.fontFamily + '" w:eastAsia="' + run.fontFamily + '"/>';
    xml += '</w:rPr>';
  }
  if (run.lineBreak) {
    xml += '<w:br/>';
  } else {
    xml += '<w:t xml:space="preserve">' + xmlEscape(run.text) + '</w:t>';
  }
  xml += '</w:r>';
  return xml;
}

// EMU = pixels * 9525 (at 96 DPI)
function pxToEmu(px) { return Math.round(px * 9525); }

function makeImageRunXml(imageId, imageInfos) {
  var info = (imageInfos && imageInfos[imageId]) || { width: 300, height: 200, ext: 'png' };
  var cx = pxToEmu(info.width);
  var cy = pxToEmu(info.height);
  var rId = 'rIdImg' + (imageId + 1);
  var name = 'image' + (imageId + 1) + '.' + (info.ext || 'png');

  var xml = '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">';
  xml += '<wp:extent cx="' + cx + '" cy="' + cy + '"/>';
  xml += '<wp:docPr id="' + (imageId + 1) + '" name="' + name + '"/>';
  xml += '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">';
  xml += '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">';
  xml += '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">';
  xml += '<pic:nvPicPr><pic:cNvPr id="' + (imageId + 1) + '" name="' + name + '"/><pic:cNvPicPr/></pic:nvPicPr>';
  xml += '<pic:blipFill><a:blip r:embed="' + rId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>';
  xml += '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>';
  xml += '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>';
  xml += '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  return xml;
}

function makeParagraphXml(para, imageInfos) {
  var styleMap = { h1: 'Heading1', h2: 'Heading2', h3: 'Heading3', li: 'ListParagraph', p: 'Normal' };
  var styleId = styleMap[para.type] || 'Normal';
  var xml = '<w:p>';

  var hasPPr = para.align || para.bullet || para.type === 'h1' || para.type === 'h2' || para.type === 'h3' || para.type === 'li';
  if (hasPPr) {
    xml += '<w:pPr>';
    xml += '<w:pStyle w:val="' + styleId + '"/>';
    if (para.align) xml += '<w:jc w:val="' + para.align + '"/>';
    if (para.bullet) xml += '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';
    xml += '</w:pPr>';
  }

  if (para.runs && para.runs.length > 0) {
    for (var i = 0; i < para.runs.length; i++) {
      xml += makeRunXml(para.runs[i], imageInfos);
    }
  } else {
    xml += '<w:r><w:t></w:t></w:r>';
  }
  xml += '</w:p>';
  return xml;
}

function makeTableXml(table, imageInfos) {
  var colCount = (table.rows && table.rows[0] && table.rows[0].cells) ? table.rows[0].cells.length : 1;
  var colWidth = Math.floor(9000 / colCount);

  var xml = '<w:tbl>';
  xml += '<w:tblPr>';
  xml += '<w:tblW w:w="0" w:type="auto"/>';
  xml += '<w:tblBorders>';
  xml += '<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
  xml += '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
  xml += '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
  xml += '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
  xml += '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
  xml += '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>';
  xml += '</w:tblBorders>';
  xml += '</w:tblPr>';
  xml += '<w:tblGrid>';
  for (var c = 0; c < colCount; c++) {
    xml += '<w:gridCol w:w="' + colWidth + '"/>';
  }
  xml += '</w:tblGrid>';

  for (var r = 0; r < table.rows.length; r++) {
    xml += '<w:tr>';
    for (var c2 = 0; c2 < table.rows[r].cells.length; c2++) {
      var cell = table.rows[r].cells[c2];
      xml += '<w:tc><w:tcPr><w:tcW w:w="' + colWidth + '" w:type="dxa"/></w:tcPr>';
      if (cell.runs && cell.runs.length > 0) {
        xml += makeParagraphXml({ type: 'p', runs: cell.runs, align: '', bullet: false }, imageInfos);
      } else {
        xml += '<w:p><w:r><w:t></w:t></w:r></w:p>';
      }
      xml += '</w:tc>';
    }
    xml += '</w:tr>';
  }
  xml += '</w:tbl>';
  return xml;
}

function buildDocx(blocks, imageDatas) {
  var imageInfos = imageDatas || [];

  var bodyXml = '';
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (block.type === 'table') {
      bodyXml += makeTableXml(block, imageInfos);
    } else {
      bodyXml += makeParagraphXml(block, imageInfos);
    }
  }

  var docXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"',
    ' xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    ' xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"',
    ' xmlns:v="urn:schemas-microsoft-com:vml"',
    ' xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"',
    ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
    ' xmlns:w10="urn:schemas-microsoft-com:office:word"',
    ' xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
    ' xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"',
    ' xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"',
    ' xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"',
    ' xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"',
    ' xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"',
    ' mc:Ignorable="w14 wp14">',
    '<w:body>',
    bodyXml,
    '<w:sectPr>',
    '<w:pgSz w:w="12240" w:h="15840"/>',
    '<w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="720" w:footer="720" w:gutter="0"/>',
    '</w:sectPr>',
    '</w:body>',
    '</w:document>'
  ].join('');

  var stylesXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<w:docDefaults>',
    '<w:rPrDefault>',
    '<w:rPr>',
    '<w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体"/>',
    '<w:sz w:val="24"/>',
    '<w:szCs w:val="24"/>',
    '</w:rPr>',
    '</w:rPrDefault>',
    '</w:docDefaults>',
    '<w:style w:type="paragraph" w:styleId="Normal">',
    '<w:name w:val="Normal"/>',
    '<w:rPr>',
    '<w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体"/>',
    '<w:sz w:val="24"/>',
    '</w:rPr>',
    '</w:style>',
    '<w:style w:type="paragraph" w:styleId="Heading1">',
    '<w:name w:val="heading 1"/>',
    '<w:basedOn w:val="Normal"/>',
    '<w:pPr><w:keepNext/><w:spacing w:before="480" w:after="120"/></w:pPr>',
    '<w:rPr><w:rFonts w:ascii="微软雅黑" w:hAnsi="微软雅黑" w:eastAsia="微软雅黑"/><w:b/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr>',
    '</w:style>',
    '<w:style w:type="paragraph" w:styleId="Heading2">',
    '<w:name w:val="heading 2"/>',
    '<w:basedOn w:val="Normal"/>',
    '<w:pPr><w:keepNext/><w:spacing w:before="360" w:after="80"/></w:pPr>',
    '<w:rPr><w:rFonts w:ascii="微软雅黑" w:hAnsi="微软雅黑" w:eastAsia="微软雅黑"/><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr>',
    '</w:style>',
    '<w:style w:type="paragraph" w:styleId="Heading3">',
    '<w:name w:val="heading 3"/>',
    '<w:basedOn w:val="Normal"/>',
    '<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="60"/></w:pPr>',
    '<w:rPr><w:rFonts w:ascii="微软雅黑" w:hAnsi="微软雅黑" w:eastAsia="微软雅黑"/><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>',
    '</w:style>',
    '<w:style w:type="paragraph" w:styleId="ListParagraph">',
    '<w:name w:val="List Paragraph"/>',
    '<w:basedOn w:val="Normal"/>',
    '<w:pPr><w:ind w:left="720"/></w:pPr>',
    '</w:style>',
    '</w:styles>'
  ].join('');

  // Content Types — add image extensions if present
  var ctParts = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>'
  ];
  var seenExt = {};
  for (var ei = 0; ei < imageInfos.length; ei++) {
    var ext = (imageInfos[ei].ext || 'png').toLowerCase();
    if (!seenExt[ext]) {
      seenExt[ext] = true;
      var mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
      ctParts.push('<Default Extension="' + ext + '" ContentType="' + mime + '"/>');
    }
  }
  ctParts.push('<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>');
  ctParts.push('<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>');
  ctParts.push('</Types>');
  var contentTypesXml = ctParts.join('');

  var relsXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>'
  ].join('');

  // Document relationships — include image relationships
  var drParts = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
  ];
  for (var dj = 0; dj < imageInfos.length; dj++) {
    var imgExt = (imageInfos[dj].ext || 'png').toLowerCase();
    var imgName = 'image' + (dj + 1) + '.' + imgExt;
    drParts.push('<Relationship Id="rIdImg' + (dj + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + imgName + '"/>');
  }
  drParts.push('</Relationships>');
  var docRelsXml = drParts.join('');

  var zip = createZip();
  zip.add('_rels/.rels', relsXml);
  zip.add('[Content_Types].xml', contentTypesXml);
  zip.add('word/document.xml', docXml);
  zip.add('word/_rels/document.xml.rels', docRelsXml);
  zip.add('word/styles.xml', stylesXml);

  // Add image files to ZIP (skip images with null data)
  for (var ii = 0; ii < imageInfos.length; ii++) {
    var imgInfo = imageInfos[ii];
    var imgExt2 = (imgInfo.ext || 'png').toLowerCase();
    var imgPath = 'word/media/image' + (ii + 1) + '.' + imgExt2;
    if (imgInfo.data && imgInfo.data.byteLength > 0) {
      zip.add(imgPath, imgInfo.data);
    }
  }

  return zip.generate();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// ZIP generator (stored, no compression)
// ---------------------------------------------------------------------------

function createZip() {
  var files = {};
  return {
    add: function(name, content) { files[name] = content; },
    generate: function() {
      var names = Object.keys(files).sort();
      var entries = [];
      var localTotal = 0;
      for (var i = 0; i < names.length; i++) {
        var nameStr = names[i];
        var nb = strToBytes(nameStr);
        var raw = files[nameStr];
        var db = (raw instanceof ArrayBuffer) ? new Uint8Array(raw) : strToBytes(raw);
        var crc = crc32(db);
        entries.push({ name: nameStr, nameBytes: nb, data: db, crc: crc, localOffset: localTotal });
        localTotal += 30 + nb.length + db.length;
      }
      var zipLen = localTotal;
      var cdSize = 0;
      for (var k = 0; k < entries.length; k++) {
        cdSize += 46 + entries[k].nameBytes.length;
      }
      zipLen += cdSize;
      zipLen += 22;
      var zip = new Uint8Array(zipLen);
      for (var j = 0; j < entries.length; j++) {
        var e = entries[j];
        var hdr = new Uint8Array(30 + e.nameBytes.length);
        hdr[0] = 0x50; hdr[1] = 0x4B; hdr[2] = 0x03; hdr[3] = 0x04;
        hdr[4] = 20; hdr[5] = 0;
        hdr[6] = 0; hdr[7] = 0;
        hdr[8] = 0; hdr[9] = 0;
        hdr[10] = 0; hdr[11] = 0;
        hdr[12] = 0; hdr[13] = 0;
        hdr[14] = e.crc & 0xFF; hdr[15] = (e.crc >> 8) & 0xFF; hdr[16] = (e.crc >> 16) & 0xFF; hdr[17] = (e.crc >> 24) & 0xFF;
        hdr[18] = e.data.length & 0xFF; hdr[19] = (e.data.length >> 8) & 0xFF; hdr[20] = (e.data.length >> 16) & 0xFF; hdr[21] = (e.data.length >> 24) & 0xFF;
        hdr[22] = e.data.length & 0xFF; hdr[23] = (e.data.length >> 8) & 0xFF; hdr[24] = (e.data.length >> 16) & 0xFF; hdr[25] = (e.data.length >> 24) & 0xFF;
        hdr[26] = e.nameBytes.length & 0xFF; hdr[27] = (e.nameBytes.length >> 8) & 0xFF;
        hdr[28] = 0; hdr[29] = 0;
        hdr.set(e.nameBytes, 30);
        zip.set(hdr, e.localOffset);
        zip.set(e.data, e.localOffset + 30 + e.nameBytes.length);
      }
      var cdOffset = localTotal;
      var cdPos = cdOffset;
      for (var m = 0; m < entries.length; m++) {
        var e2 = entries[m];
        var cd = new Uint8Array(46 + e2.nameBytes.length);
        cd[0] = 0x50; cd[1] = 0x4B; cd[2] = 0x01; cd[3] = 0x02;
        cd[4] = 20; cd[5] = 0;
        cd[6] = 20; cd[7] = 0;
        cd[8] = 0; cd[9] = 0;
        cd[10] = 0; cd[11] = 0;
        cd[12] = 0; cd[13] = 0;
        cd[14] = e2.crc & 0xFF; cd[15] = (e2.crc >> 8) & 0xFF; cd[16] = (e2.crc >> 16) & 0xFF; cd[17] = (e2.crc >> 24) & 0xFF;
        cd[18] = e2.data.length & 0xFF; cd[19] = (e2.data.length >> 8) & 0xFF; cd[20] = (e2.data.length >> 16) & 0xFF; cd[21] = (e2.data.length >> 24) & 0xFF;
        cd[22] = e2.data.length & 0xFF; cd[23] = (e2.data.length >> 8) & 0xFF; cd[24] = (e2.data.length >> 16) & 0xFF; cd[25] = (e2.data.length >> 24) & 0xFF;
        cd[26] = e2.nameBytes.length & 0xFF; cd[27] = (e2.nameBytes.length >> 8) & 0xFF;
        cd[28] = 0; cd[29] = 0;
        cd[30] = 0; cd[31] = 0; cd[32] = 0; cd[33] = 0;
        cd[34] = 0; cd[35] = 0; cd[36] = 0; cd[37] = 0;
        cd[38] = e2.localOffset & 0xFF; cd[39] = (e2.localOffset >> 8) & 0xFF; cd[40] = (e2.localOffset >> 16) & 0xFF; cd[41] = (e2.localOffset >> 24) & 0xFF;
        cd.set(e2.nameBytes, 42);
        zip.set(cd, cdPos);
        cdPos += cd.length;
      }
      var eocd = new Uint8Array(22);
      eocd[0] = 0x50; eocd[1] = 0x4B; eocd[2] = 0x05; eocd[3] = 0x06;
      eocd[4] = 0; eocd[5] = 0;
      eocd[6] = 0; eocd[7] = 0;
      eocd[8] = entries.length & 0xFF; eocd[9] = (entries.length >> 8) & 0xFF;
      eocd[10] = entries.length & 0xFF; eocd[11] = (entries.length >> 8) & 0xFF;
      eocd[12] = cdSize & 0xFF; eocd[13] = (cdSize >> 8) & 0xFF; eocd[14] = (cdSize >> 16) & 0xFF; eocd[15] = (cdSize >> 24) & 0xFF;
      eocd[16] = cdOffset & 0xFF; eocd[17] = (cdOffset >> 8) & 0xFF; eocd[18] = (cdOffset >> 16) & 0xFF; eocd[19] = (cdOffset >> 24) & 0xFF;
      eocd[20] = 0; eocd[21] = 0;
      zip.set(eocd, cdPos);
      return base64Encode(zip);
    }
  };
}

function strToBytes(str) {
  var utf8 = unescape(encodeURIComponent(str));
  var arr = new Uint8Array(utf8.length);
  for (var i = 0; i < utf8.length; i++) arr[i] = utf8.charCodeAt(i);
  return arr;
}

var _crcTable = null;
function crc32(data) {
  var crc = 0xFFFFFFFF;
  if (!_crcTable) _crcTable = makeCrcTable();
  for (var i = 0; i < data.length; i++) {
    crc = _crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCrcTable() {
  var table = new Uint32Array(256);
  for (var i = 0; i < 256; i++) {
    var c = i;
    for (var j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

function base64Encode(bytes) {
  var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var result = '';
  var i;
  for (i = 0; i < bytes.length - 2; i += 3) {
    var a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    result += b64[a >> 2] + b64[((a & 3) << 4) | (b >> 4)] + b64[((b & 15) << 2) | (c >> 6)] + b64[c & 63];
  }
  var remaining = bytes.length - i;
  if (remaining === 1) {
    result += b64[bytes[i] >> 2] + b64[(bytes[i] & 3) << 4] + '==';
  } else if (remaining === 2) {
    result += b64[bytes[i] >> 2] + b64[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)] + b64[(bytes[i + 1] & 15) << 2] + '=';
  }
  return result;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

module.exports = {
  htmlToDocx: htmlToDocx,
  htmlToDocxWithImages: htmlToDocxWithImages,
  getImageInfos: getImageInfos,
  htmlToBlocks: htmlToBlocks,
  buildDocx: buildDocx,
  parseInlineRuns: parseInlineRuns,
  parseTable: parseTable,
  parseStyleAttr: parseStyleAttr,
  resolveColor: resolveColor,
  decodeEntities: decodeEntities,
  coalesceRuns: coalesceRuns,
  extractAlign: extractAlign,
  makeParagraphXml: makeParagraphXml,
  makeRunXml: makeRunXml,
  makeTableXml: makeTableXml,
  xmlEscape: xmlEscape,
  createZip: createZip,
  strToBytes: strToBytes,
  crc32: crc32,
  makeCrcTable: makeCrcTable,
  base64Encode: base64Encode
};
