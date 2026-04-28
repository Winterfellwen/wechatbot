// word/pages/editor/editor.js
// 纯前端 DOCX 生成（无 npm 依赖）
// DOCX = zip( [Content_Types].xml, _rels/.rels, word/document.xml, word/_rels/document.xml.rels )

var STORAGE_KEY = 'word_docs';
var autoSaveTimer = null;

Page({
  data: {
    docId: '',
    title: '',
    fmt: {
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      header: 0,
      align: '',
      list: '',
      color: '#000000',
      backgroundColor: ''
    },
    saveStatus: '已保存',
    exporting: false
  },

  editorCtx: null,
  _loaded: false,
  _dirty: false,

  onLoad: function (options) {
    this.setData({ docId: options.id || '' });
    var doc = this._findDoc(options.id);
    if (doc) this.setData({ title: doc.title });
  },

  onEditorReady: function () {
    var that = this;
    wx.createSelectorQuery().select('#editor').context(function (res) {
      that.editorCtx = res.context;
      var doc = that._findDoc(that.data.docId);
      if (doc && doc.content) {
        var html = that._deltaToHtml(doc.content);
        that.editorCtx.setContents({ html: html });
      }
      that._loaded = true;
      if (that.data.autoExport) {
        setTimeout(function () { that.exportDocx(); }, 500);
      }
    }).exec();
  },

  onStatusChange: function (e) {
    this.setData({ fmt: e.detail });
  },

  onEditorInput: function () {
    this._dirty = true;
    this.setData({ saveStatus: '编辑中...' });
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(function () { this.saveDoc(); }.bind(this), 1500);
  },

  onTitleInput: function (e) {
    this.setData({ title: e.detail.value });
    this._dirty = true;
  },

  toggleBold: function () { this.editorCtx && this.editorCtx.format('bold'); },
  toggleItalic: function () { this.editorCtx && this.editorCtx.format('italic'); },
  toggleUnderline: function () { this.editorCtx && this.editorCtx.format('underline'); },
  toggleStrike: function () { this.editorCtx && this.editorCtx.format('strike'); },
  formatHeader: function (e) {
    var level = parseInt(e.currentTarget.dataset.level);
    this.editorCtx && this.editorCtx.format('header', level);
  },
  setAlign: function (e) {
    var align = e.currentTarget.dataset.align;
    this.editorCtx && this.editorCtx.format('align', align);
  },
  setList: function (e) {
    var list = e.currentTarget.dataset.list;
    this.editorCtx && this.editorCtx.format('list', list);
  },
  pickColor: function (e) {
    var target = e.currentTarget.dataset.target;
    var that = this;
    wx.chooseColor({
      success: function (res) {
        that.editorCtx && that.editorCtx.format(target, res.color);
        var fmtUpdate = {};
        fmtUpdate[target] = res.color;
        that.setData({ fmt: Object.assign({}, that.data.fmt, fmtUpdate) });
      }
    });
  },
  undo: function () { this.editorCtx && this.editorCtx.undo(); },
  redo: function () { this.editorCtx && this.editorCtx.redo(); },
  clearFormat: function () { this.editorCtx && this.editorCtx.removeFormat(); },

  saveDoc: function () {
    if (!this._loaded) return;
    var that = this;
    this.editorCtx.getContents({
      success: function (res) {
        var content = JSON.stringify(res.html || res.delta || '');
        var list = that._getList();
        var idx = list.findIndex(function (d) { return d.id === that.data.docId; });
        if (idx >= 0) {
          list[idx].title = that.data.title || '未命名文档';
          list[idx].content = content;
          list[idx].updatedAt = Date.now();
        }
        wx.setStorageSync(STORAGE_KEY, list);
        that.setData({ saveStatus: '已保存' });
        that._dirty = false;
      }
    });
  },

  // ---- 导出 DOCX（纯前端，无 npm 依赖） ----
  exportDocx: function () {
    if (this.data.exporting) return;
    this.setData({ exporting: true });
    var that = this;
    if (!this._loaded) {
      var t = setInterval(function () {
        if (that._loaded) { clearInterval(t); that._doExport(); }
      }, 200);
      setTimeout(function () { clearInterval(t); }, 5000);
      return;
    }
    this._doExport();
  },

  _doExport: function () {
    var that = this;
    this.editorCtx.getContents({
      success: function (res) {
        var html = res.html || '';
        var paragraphs = that._htmlToDocxParagraphs(html);
        var docxBase64 = that._buildDocx(paragraphs);
        var fileName = (that.data.title || '未命名文档') + '.docx';
        var filePath = wx.env.USER_DATA_PATH + '/' + fileName;
        var buffer = wx.base64ToArrayBuffer(docxBase64);
        wx.getFileSystemManager().writeFile({
          filePath: filePath,
          data: buffer,
          encoding: 'binary',
          success: function () {
            that.setData({ exporting: false });
            wx.openDocument({
              filePath: filePath,
              fileType: 'docx',
              showMenu: true,
              fail: function (err) {
                wx.showToast({ title: '打开失败', icon: 'none' });
                console.error('openDocument fail:', err);
              }
            });
          },
          fail: function (err) {
            that.setData({ exporting: false });
            wx.showToast({ title: '保存失败', icon: 'none' });
            console.error('writeFile fail:', err);
          }
        });
      },
      fail: function () {
        that.setData({ exporting: false });
        wx.showToast({ title: '读取内容失败', icon: 'none' });
      }
    });
  },

  // ---- HTML → paragraphs ----
  _htmlToDocxParagraphs: function (html) {
    if (!html) return [{ type: 'p', text: '' }];
    var paragraphs = [];
    html = html.replace(/<br\s*\/?>/gi, '\n');
    var parts = html.split(/<\/?(p|h[1-6]|div|section|li|ul|ol)[^>]*>/i);
    for (var i = 0; i < parts.length; i++) {
      var raw = parts[i].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
      // 判断标题级别
      var hMatch = parts[i].match(/<h([1-6])/i);
      // 判断是否列表项
      var liMatch = parts[i].match(/<li/i);
      var lines = raw.split('\n');
      for (var j = 0; j < lines.length; j++) {
        var line = lines[j].trim();
        if (!line) continue;
        var pType = 'p';
        if (hMatch) pType = 'h' + hMatch[1];
        else if (liMatch) pType = 'li';
        paragraphs.push({ type: pType, text: line });
      }
    }
    return paragraphs.length > 0 ? paragraphs : [{ type: 'p', text: '' }];
  },

  // ---- 构建 DOCX（纯 base64，无外部依赖） ----
  _buildDocx: function (paragraphs) {
    var that = this;
    var bodyXml = '';
    for (var i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i];
      if (p.type === 'h1') bodyXml += that._makeParagraph(p.text, 'Heading1');
      else if (p.type === 'h2') bodyXml += that._makeParagraph(p.text, 'Heading2');
      else if (p.type === 'h3') bodyXml += that._makeParagraph(p.text, 'Heading3');
      else if (p.type === 'li') bodyXml += that._makeParagraph(p.text, 'ListParagraph', true);
      else bodyXml += that._makeParagraph(p.text, 'Normal');
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
      '<w:pPr>',
      '<w:keepNext/>',
      '<w:spacing w:before="480" w:after="120"/>',
      '</w:pPr>',
      '<w:rPr>',
      '<w:rFonts w:ascii="微软雅黑" w:hAnsi="微软雅黑" w:eastAsia="微软雅黑"/>',
      '<w:b/>',
      '<w:sz w:val="48"/>',
      '<w:szCs w:val="48"/>',
      '</w:rPr>',
      '</w:style>',
      '<w:style w:type="paragraph" w:styleId="Heading2">',
      '<w:name w:val="heading 2"/>',
      '<w:basedOn w:val="Normal"/>',
      '<w:pPr>',
      '<w:keepNext/>',
      '<w:spacing w:before="360" w:after="80"/>',
      '</w:pPr>',
      '<w:rPr>',
      '<w:rFonts w:ascii="微软雅黑" w:hAnsi="微软雅黑" w:eastAsia="微软雅黑"/>',
      '<w:b/>',
      '<w:sz w:val="36"/>',
      '<w:szCs w:val="36"/>',
      '</w:rPr>',
      '</w:style>',
      '<w:style w:type="paragraph" w:styleId="Heading3">',
      '<w:name w:val="heading 3"/>',
      '<w:basedOn w:val="Normal"/>',
      '<w:pPr>',
      '<w:keepNext/>',
      '<w:spacing w:before="240" w:after="60"/>',
      '</w:pPr>',
      '<w:rPr>',
      '<w:rFonts w:ascii="微软雅黑" w:hAnsi="微软雅黑" w:eastAsia="微软雅黑"/>',
      '<w:b/>',
      '<w:sz w:val="32"/>',
      '<w:szCs w:val="32"/>',
      '</w:rPr>',
      '</w:style>',
      '<w:style w:type="paragraph" w:styleId="ListParagraph">',
      '<w:name w:val="List Paragraph"/>',
      '<w:basedOn w:val="Normal"/>',
      '<w:pPr>',
      '<w:ind w:left="720"/>',
      '</w:pPr>',
      '</w:style>',
      '</w:styles>'
    ].join('');

    var contentTypesXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
      '</Types>'
    ].join('');

    var relsXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
      '</Relationships>'
    ].join('');

    var docRelsXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
      '</Relationships>'
    ].join('');

    var zip = that._createZip();
    zip.add('__rels/.rels', relsXml);
    zip.add('[Content_Types].xml', contentTypesXml);
    zip.add('word/document.xml', docXml);
    zip.add('word/_rels/document.xml.rels', docRelsXml);
    zip.add('word/styles.xml', stylesXml);

    return zip.generate();
  },

  _makeParagraph: function (text, styleId, bullet) {
    var xml = '<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">';
    xml += '<w:pPr><w:pStyle w:val="' + styleId + '"/>';
    if (bullet) xml += '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';
    xml += '</w:pPr>';
    xml += '<w:r><w:rPr>';
    if (styleId === 'Heading1' || styleId === 'Heading2' || styleId === 'Heading3') {
      xml += '<w:rFonts w:ascii="微软雅黑" w:hAnsi="微软雅黑" w:eastAsia="微软雅黑"/>';
      xml += '<w:b/>';
    }
    xml += '</w:rPr><w:t>' + this._xmlEscape(text) + '</w:t></w:r></w:p>';
    return xml;
  },

  _xmlEscape: function (str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  // ---- 纯 JS ZIP 生成器（DEFLATE 压缩） ----
  _createZip: function () {
    var files = {};
    return {
      add: function (name, content) { files[name] = content; },
      generate: function () {
        // 按 UTF-8 拼接所有文件内容
        var parts = [];
        var offsets = [];
        var totalOffset = 0;
        var names = Object.keys(files).sort();
        for (var i = 0; i < names.length; i++) {
          offsets.push(totalOffset);
          var data = that._strToBytes(files[names[i]]);
          parts.push(data);
          totalOffset += data.length;
        }
        // local file headers + data
        var localParts = [];
        var localOffsets = [];
        var localTotal = 0;
        for (var j = 0; j < names.length; j++) {
          localOffsets.push(localTotal);
          var nameBytes = that._strToBytes(names[j]);
          var dataBytes = that._deflate(parts[j]);
          var crc = that._crc32(parts[j]);
          var header = that._makeLocalHeader(names[j], dataBytes.length, crc, parts[j].length);
          localParts.push(header);
          localParts.push(dataBytes);
          localTotal += header.length + dataBytes.length;
        }
        // central directory
        var cdParts = [];
        var cdOffset = localTotal;
        for (var k = 0; k < names.length; k++) {
          var nameB = that._strToBytes(names[k]);
          var dataB = that._deflate(parts[k]);
          var crcB = that._crc32(parts[k]);
          cdParts.push(that._makeCdEntry(names[k], dataB.length, crcB, parts[k].length, localOffsets[k]));
          cdOffset += cdParts[k].length;
        }
        // end of central directory
        var eocd = that._makeEocd(names.length, cdParts, cdOffset);
        // 拼接
        var result = new Uint8Array(localTotal + cdOffset + eocd.length);
        var pos = 0;
        for (var x = 0; x < localParts.length; x++) {
          result.set(localParts[x], pos); pos += localParts[x].length;
        }
        for (var y = 0; y < cdParts.length; y++) {
          result.set(cdParts[y], pos); pos += cdParts[y].length;
        }
        result.set(eocd, pos);
        return that._base64Encode(result);
      }
    };
  },

  _strToBytes: function (str) {
    var utf8 = unescape(encodeURIComponent(str));
    var arr = new Uint8Array(utf8.length);
    for (var i = 0; i < utf8.length; i++) arr[i] = utf8.charCodeAt(i);
    return arr;
  },

  _deflate: function (data) {
    // 使用 Raw Deflate（无 header），与 Python zipfile 兼容
    var MAX_BLOCK = 65535;
    var blocks = [];
    var pos = 0;
    while (pos < data.length) {
      var chunk = data.slice(pos, pos + MAX_BLOCK);
      pos += chunk.length;
      var isLast = pos >= data.length;
      var header = new Uint8Array(5);
      header[0] = isLast ? 1 : 0;
      header[1] = chunk.length & 0xFF;
      header[2] = (chunk.length >> 8) & 0xFF;
      header[3] = (~chunk.length) & 0xFF;
      header[4] = ((~chunk.length) >> 8) & 0xFF;
      blocks.push(header);
      blocks.push(chunk);
    }
    // 拼接所有块
    var totalLen = 0;
    for (var i = 0; i < blocks.length; i++) totalLen += blocks[i].length;
    var result = new Uint8Array(totalLen);
    var off = 0;
    for (var j = 0; j < blocks.length; j++) {
      result.set(blocks[j], off); off += blocks[j].length;
    }
    return result;
  },

  _crc32: function (data) {
    var crc = 0xFFFFFFFF;
    var table = this._crcTable || (this._crcTable = this._makeCrcTable());
    for (var i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  },

  _makeCrcTable: function () {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    return table;
  },

  _makeLocalHeader: function (name, compressedSize, crc, uncompressedSize) {
    var nameBytes = this._strToBytes(name);
    var buf = new Uint8Array(30 + nameBytes.length);
    buf[0] = 0x50; buf[1] = 0x4B; buf[2] = 0x03; buf[3] = 0x04; // local file header
    buf[4] = 20; buf[5] = 0; // version needed
    buf[6] = 0; buf[7] = 0; // flags, compression method (stored=0)
    buf[8] = 0; buf[9] = 0; // mod time, date
    buf[10] = crc & 0xFF; buf[11] = (crc >> 8) & 0xFF; buf[12] = (crc >> 16) & 0xFF; buf[13] = (crc >> 24) & 0xFF;
    buf[14] = compressedSize & 0xFF; buf[15] = (compressedSize >> 8) & 0xFF;
    buf[16] = (compressedSize >> 16) & 0xFF; buf[17] = (compressedSize >> 24) & 0xFF;
    buf[18] = uncompressedSize & 0xFF; buf[19] = (uncompressedSize >> 8) & 0xFF;
    buf[20] = (uncompressedSize >> 16) & 0xFF; buf[21] = (uncompressedSize >> 24) & 0xFF;
    buf[22] = nameBytes.length & 0xFF; buf[23] = (nameBytes.length >> 8) & 0xFF;
    buf[24] = 0; buf[25] = 0; // extra field length
    buf.set(nameBytes, 26);
    return buf;
  },

  _makeCdEntry: function (name, compressedSize, crc, uncompressedSize, localOffset) {
    var nameBytes = this._strToBytes(name);
    var buf = new Uint8Array(46 + nameBytes.length);
    buf[0] = 0x50; buf[1] = 0x4B; buf[2] = 0x01; buf[3] = 0x02; // central dir header
    buf[4] = 20; buf[5] = 0; // version made by
    buf[6] = 20; buf[7] = 0; // version needed
    buf[8] = 0; buf[9] = 0; // flags, compression
    buf[10] = 0; buf[11] = 0; // mod time/date
    buf[12] = crc & 0xFF; buf[13] = (crc >> 8) & 0xFF; buf[14] = (crc >> 16) & 0xFF; buf[15] = (crc >> 24) & 0xFF;
    buf[16] = compressedSize & 0xFF; buf[17] = (compressedSize >> 8) & 0xFF;
    buf[18] = (compressedSize >> 16) & 0xFF; buf[19] = (compressedSize >> 24) & 0xFF;
    buf[20] = uncompressedSize & 0xFF; buf[21] = (uncompressedSize >> 8) & 0xFF;
    buf[22] = (uncompressedSize >> 16) & 0xFF; buf[23] = (uncompressedSize >> 24) & 0xFF;
    buf[24] = nameBytes.length & 0xFF; buf[25] = (nameBytes.length >> 8) & 0xFF;
    buf[26] = 0; buf[27] = 0; // extra field, comment
    buf[28] = 0; buf[29] = 0; // disk start, internal attr
    buf[30] = 0; buf[31] = 0; buf[32] = 0; buf[33] = 0; // external attr, local offset
    buf[34] = localOffset & 0xFF; buf[35] = (localOffset >> 8) & 0xFF;
    buf[36] = (localOffset >> 16) & 0xFF; buf[37] = (localOffset >> 24) & 0xFF;
    buf.set(nameBytes, 38);
    return buf;
  },

  _makeEocd: function (numFiles, cdParts, cdOffset) {
    var cdSize = 0;
    for (var i = 0; i < cdParts.length; i++) cdSize += cdParts[i].length;
    var buf = new Uint8Array(22);
    buf[0] = 0x50; buf[1] = 0x4B; buf[2] = 0x05; buf[3] = 0x06; // end of central dir
    buf[4] = 0; buf[5] = 0; // disk numbers
    buf[6] = 0; buf[7] = 0;
    buf[8] = numFiles & 0xFF; buf[9] = (numFiles >> 8) & 0xFF;
    buf[10] = numFiles & 0xFF; buf[11] = (numFiles >> 8) & 0xFF;
    buf[12] = cdSize & 0xFF; buf[13] = (cdSize >> 8) & 0xFF;
    buf[14] = (cdSize >> 16) & 0xFF; buf[15] = (cdSize >> 24) & 0xFF;
    buf[16] = cdOffset & 0xFF; buf[17] = (cdOffset >> 8) & 0xFF;
    buf[18] = (cdOffset >> 16) & 0xFF; buf[19] = (cdOffset >> 24) & 0xFF;
    buf[20] = 0; buf[21] = 0; // comment length
    return buf;
  },

  _base64Encode: function (bytes) {
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
  },

  // ---- Delta → HTML ----
  _deltaToHtml: function (content) {
    if (!content) return '';
    // 去掉 JSON 包装（存储时用了 JSON.stringify）
    try {
      var parsed = JSON.parse(content);
      if (typeof parsed === 'string') content = parsed;
      else if (typeof parsed === 'object' && parsed !== null) {
        // 真正的 delta 格式
        if (Array.isArray(parsed.ops)) {
          var html = '';
          for (var i = 0; i < parsed.ops.length; i++) {
            var op = parsed.ops[i];
            if (typeof op.insert === 'string') {
              var attrs = op.attributes || {};
              var tag = '';
              if (attrs.bold) tag += '<b>';
              if (attrs.italic) tag += '<i>';
              if (attrs.underline) tag += '<u>';
              if (attrs.strike) tag += '<s>';
              if (attrs.header) tag += '<h' + attrs.header + '>';
              var t = op.insert.replace(/</g, '&lt;').replace(/>/g, '&gt;');
              html += tag + t + (attrs.header ? '</h' + attrs.header + '>' : '</s>');
              if (attrs.strike) html += '</s>';
              if (attrs.underline) html += '</u>';
              if (attrs.italic) html += '</i>';
              if (attrs.bold) html += '</b>';
            }
          }
          return html;
        }
      }
    } catch (e) { /* 不是 JSON，走下面判断 */ }
    // 已经是 HTML（直接存或从 JSON.parse 还原的）
    var trimmed = content.trim();
    if (trimmed.charAt(0) === '<') return trimmed;
    return content || '';
  },

  goBack: function () {
    if (this._dirty) this.saveDoc();
    wx.navigateBack();
  },

  _getList: function () {
    var raw = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(raw) ? raw : [];
  },

  _findDoc: function (id) {
    var list = this._getList();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }
});