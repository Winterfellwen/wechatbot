// word/pages/editor/editor.js
// 完整重写 - 修复 pako 导入 + 字体选择功能
// DOCX = zip( [Content_Types].xml, _rels/.rels, word/document.xml, word/_rels/document.xml.rels )

var STORAGE_KEY = 'word_docs';
var autoSaveTimer = null;

// 使用 UMD 构建的 pako (已修复导入路径)
var pako = require('../../../miniprogram_npm/pako/dist/pako.es5.js');

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
      align: 'left',
      list: '',
      color: '#000000',
      backgroundColor: '',
      fontFamily: 'sans-serif'
    },
    saveStatus: '已保存',
    exporting: false,
    // 字体选项
    fontOptions: [
      { name: '默认', value: 'sans-serif' },
      { name: '宋体', value: 'SimSun' },
      { name: '微软雅黑', value: 'Microsoft YaHei' },
      { name: '黑体', value: 'SimHei' },
      { name: '楷体', value: 'KaiTi' },
      { name: '仿宋', value: 'FangSong' },
      { name: 'Times New Roman', value: '"Times New Roman"' },
      { name: 'Arial', value: 'Arial' }
    ],
    currentFontName: '默认'
  },

  editorCtx: null,
  _loaded: false,
  _dirty: false,

  onLoad: function(options) {
    this.setData({ docId: options.id || '' });
    var doc = this._findDoc(options.id);
    if (doc) this.setData({ title: doc.title });
  },

  onEditorReady: function() {
    var that = this;
    wx.createSelectorQuery().select('#editor').context(function(res) {
      that.editorCtx = res.context;
      var doc = that._findDoc(that.data.docId);
      if (doc && doc.content) {
        var html = that._deltaToHtml(doc.content);
        that.editorCtx.setContents({ html: html });
      }
      that._loaded = true;

      // Apply saved formatting to editor after content is set
      setTimeout(function() {
        that._applySavedFormatting();
      }, 100);
    }).exec();
  },

  // Apply saved formatting to editor
  _applySavedFormatting: function() {
    if (!this.editorCtx) return;

    var fmt = this.data.fmt;

    // Apply basic formatting
    if (fmt.bold) this.editorCtx.format('bold');
    if (fmt.italic) this.editorCtx.format('italic');
    if (fmt.underline) this.editorCtx.format('underline');
    if (fmt.strike) this.editorCtx.format('strike');

    // Apply alignment
    if (fmt.align) this.editorCtx.format('align', fmt.align);

    // Apply list
    if (fmt.list) this.editorCtx.format('list', fmt.list);

    // Apply header
    if (fmt.header) this.editorCtx.format('header', fmt.header);

    // Apply colors (if supported)
    if (fmt.color) {
      try {
        this.editorCtx.format('color', fmt.color);
      } catch(e) {
        console.log('Color format not fully supported:', e);
      }
    }

    if (fmt.backgroundColor) {
      try {
        this.editorCtx.format('backgroundColor', fmt.backgroundColor);
      } catch(e) {
        console.log('Background color format not fully supported:', e);
      }
    }

    // Apply font family (if supported)
    if (fmt.fontFamily) {
      try {
        this.editorCtx.format('fontFamily', fmt.fontFamily);
      } catch(e) {
        console.log('Font family format not fully supported:', e);
      }
    }
  },

  onStatusChange: function(e) {
    // Update fmt from editor status change
    this.setData({ fmt: e.detail });

    // Update currentFontName if fontFamily changed
    if (e.detail.fontFamily) {
      var fontName = '默认'; // default
      for (var i = 0; i < this.data.fontOptions.length; i++) {
        if (this.data.fontOptions[i].value === e.detail.fontFamily) {
          fontName = this.data.fontOptions[i].name;
          break;
        }
      }
      this.setData({ currentFontName: fontName });
    }
  },

  onEditorInput: function() {
    this._dirty = true;
    this.setData({ saveStatus: '编辑中...' });
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(function() { this.saveDoc(); }.bind(this), 1500);
  },

  onTitleInput: function(e) {
    this.setData({ title: e.detail.value });
    this._dirty = true;
  },

  // 格式化功能
  toggleBold: function() {
    this.editorCtx && this.editorCtx.format('bold');
    this._updateFmtFromEditor();
  },
  toggleItalic: function() {
    this.editorCtx && this.editorCtx.format('italic');
    this._updateFmtFromEditor();
  },
  toggleUnderline: function() {
    this.editorCtx && this.editorCtx.format('underline');
    this._updateFmtFromEditor();
  },
  toggleStrike: function() {
    this.editorCtx && this.editorCtx.format('strike');
    this._updateFmtFromEditor();
  },
  formatHeader: function(e) {
    var level = parseInt(e.currentTarget.dataset.level);
    this.editorCtx && this.editorCtx.format('header', level);
    this._updateFmtFromEditor();
  },
  setAlign: function(e) {
    var align = e.currentTarget.dataset.align;
    this.editorCtx && this.editorCtx.format('align', align);
    this._updateFmtFromEditor();
  },
  setList: function(e) {
    var list = e.currentTarget.dataset.list;
    this.editorCtx && this.editorCtx.format('list', list);
    this._updateFmtFromEditor();
  },

  // 更新 fmt 数据从编辑器状态
  _updateFmtFromEditor: function() {
    var that = this;
    // 注意: 小程序 editor 组件没有直接获取当前格式的API，除了 onStatusChange 回调
    // 我们依赖于 onStatusChange 来更新格式状态
  },

  // 字体选择 - 由于小程序 editor 组件限制，使用样式覆盖方法
  pickFont: function() {
    var that = this;
    var fontNames = this.data.fontOptions.map(function(f) { return f.name; });

    wx.showActionSheet({
      itemList: fontNames,
      success: function(res) {
        if (!res.cancel) {
          var selectedFont = that.data.fontOptions[res.tapIndex];
          // 保存选择的字体用于导出
          that.setData({
            currentFontName: selectedFont.name,
            'fmt.fontFamily': selectedFont.value
          });
          // 提示用户字体将在导出时生效
          wx.showToast({
            title: '字体已设置（导出时生效）',
            icon: 'none',
            duration: 1500
          });
        }
      }
    });
  },

  // 颜色选择 - 小程序 editor 组件支持有限
  pickColor: function(e) {
    var target = e.currentTarget.dataset.target;
    var that = this;
    var colors = [
      '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
      '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#800000',
      '#008000', '#000080', '#808000', '#800080', '#008080',
      '#FFA500', '#FFC0CB', '#A52A2A', '#DEB887', '#5F9EA0'
    ];

    wx.showActionSheet({
      itemList: colors,
      success: function(res) {
        if (!res.cancel) {
          var selectedColor = colors[res.tapIndex];
          // 尝试使用 editor 组件的格式化（可能有限支持）
          if (that.editorCtx) {
            if (target === 'color') {
              that.editorCtx.format('color', selectedColor);
            } else if (target === 'backgroundColor') {
              that.editorCtx.format('backgroundColor', selectedColor);
            }
          }

          // 无论如何保存选择用于导出
          var fmtUpdate = {};
          fmtUpdate[target] = selectedColor;
          that.setData({ fmt: Object.assign({}, that.data.fmt, fmtUpdate) });

          wx.showToast({
            title: target === 'color' ? '文本颜色已设置' : '背景色已设置',
            icon: 'success',
            duration: 1000
          });
        }
      }
    });
  },

  // 保存编辑器状态到本地数据
  _saveEditorState: function() {
    var that = this;
    // 这里我们依赖于 onStatusChange 来更新格式
    // 但我们也可以在需要时从编辑器获取内容
  },

  undo: function() {
    this.editorCtx && this.editorCtx.undo();
  },
  redo: function() {
    this.editorCtx && this.editorCtx.redo();
  },
  clearFormat: function() {
    this.editorCtx && this.editorCtx.removeFormat();
  },

  // 保存文档
  saveDoc: function() {
    if (!this._loaded) return;
    var that = this;
    this.editorCtx.getContents({
      success: function(res) {
        var content = JSON.stringify(res.html || res.delta || '');
        var list = that._getList();
        var idx = list.findIndex(function(d) { return d.id === that.data.docId; });
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

  
  // ZIP 解压
  _unzip: function(buf) {
    var view = new Uint8Array(buf);
    var files = {};
    var off = 0;
    while (off < view.length - 4) {
      if (view[off] !== 0x50 || view[off + 1] !== 0x4B) { off++; continue; }
      var sig = view[off + 2] | (view[off + 3] << 8);
      if (sig === 0x0403) {
        var cm = view[off + 8] | (view[off + 9] << 8);
        var flags = view[off + 6] | (view[off + 7] << 8);
        var hasDataDescriptor = (flags & 0x0008) !== 0;
        var csize = view[off + 18] | (view[off + 19] << 8) | (view[off + 20] << 16) | (view[off + 21] << 24);
        var usize = view[off + 22] | (view[off + 23] << 8) | (view[off + 24] << 16) | (view[off + 25] << 24);
        var nl = view[off + 26] | (view[off + 27] << 8);
        var el = view[off + 28] | (view[off + 29] << 8);
        var name = '';
        for (var i = 0; i < nl; i++) name += String.fromCharCode(view[off + 30 + i]);
        var dataOff = off + 30 + nl + el;
        var compressed, newOff;
        if (hasDataDescriptor) {
          let searchStart = dataOff;
          const maxSearch = Math.min(view.length, searchStart + 1024 * 1024);
          let descSigPos = -1;
          for (let i = searchStart; i <= maxSearch - 4; i++) {
            if (view[i] === 0x50 && view[i + 1] === 0x4B && view[i + 2] === 0x07 && view[i + 3] === 0x08) {
              descSigPos = i;
              break;
            }
          }
          if (descSigPos === -1) {
            compressed = view.slice(dataOff, dataOff + csize);
            newOff = dataOff + csize;
          } else {
            compressed = view.slice(dataOff, descSigPos);
            newOff = descSigPos + 12;
          }
        } else {
          compressed = view.slice(dataOff, dataOff + csize);
          newOff = dataOff + csize;
        }
        files[name] = cm === 0 ? compressed : this._inflate(compressed);
        off = newOff;
      } else if (sig === 0x0201 || sig === 0x0505) {
        break;
      } else {
        off++;
      }
    }
    return files;
  },

  // 解压函数
  _inflate: function(data) {
    try {
      return pako.inflate(data, { raw: true });
    } catch (e) {
      console.error('[inflate error]', e.message);
      return new Uint8Array(0);
    }
  },

  _bytesToStr: function(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return decodeURIComponent(escape(s));
  },

  // 解析 DOCX XML
  _parseDocXml: function(xmlText) {
    var html = '';
    var paraMatches = xmlText.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
    for (var pi = 0; pi < paraMatches.length; pi++) {
      var pXml = paraMatches[pi];
      var styleMatch = pXml.match(/<w:pStyle w:val="([^"]+)"/);
      var style = styleMatch ? styleMatch[1] : '';
      var isH = /^Heading/.test(style);
      var level = isH ? parseInt(style.replace('Heading', '')) : 0;
      var alignMatch = pXml.match(/<w:jc w:val="([^"]+)"/);
      var align = alignMatch ? alignMatch[1] : '';
      var isList = /<w:numPr/.test(pXml);
      var text = '';
      var runs = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      for (var ri = 0; ri < runs.length; ri++) {
        var run = runs[ri];
        var m = run.match(/<w:t[^>]*>([\s\S]*)/);
        if (m) text += m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      }
      text = text.trim();
      if (!text) continue;
      var openTag = isH ? '<h' + level + '>' : isList ? '<li>' : '<p>';
      var closeTag = openTag.replace('<', '</');
      if (align === 'center') openTag = openTag.replace('>', ' style="text-align:center">');
      if (align === 'right') openTag = openTag.replace('>', ' style="text-align:right">');
      html += openTag + text + closeTag;
    }
    return html || '<p></p>';
  },

  // 导出 DOCX
  exportDocx: function() {
    if (this.data.exporting) return;
    this.setData({ exporting: true });
    var that = this;
    if (!this._loaded) {
      var t = setInterval(function() {
        if (that._loaded) { clearInterval(t); that._doExport(); }
      }, 200);
      setTimeout(function() { clearInterval(t); }, 5000);
      return;
    }
    this._doExport();
  },

  _doExport: function() {
    var that = this;
    this.editorCtx.getContents({
      success: function(res) {
        var paragraphs = [];
        if (res.delta) {
          try {
            var delta = typeof res.delta === 'string' ? JSON.parse(res.delta) : res.delta;
            paragraphs = that._deltaToDocxParagraphs(delta);
          } catch (e) {
            paragraphs = that._htmlToDocxParagraphs(res.html || '');
          }
        } else {
          paragraphs = that._htmlToDocxParagraphs(res.html || '');
        }
        var docxBase64 = that._buildDocx(paragraphs);
        var fileName = (that.data.title || '未命名文档') + '.docx';
        var filePath = wx.env.USER_DATA_PATH + '/' + fileName;
        var buffer = wx.base64ToArrayBuffer(docxBase64);
        wx.getFileSystemManager().writeFile({
          filePath: filePath,
          data: buffer,
          encoding: 'binary',
          success: function() {
            that.setData({ exporting: false });
            wx.openDocument({
              filePath: filePath,
              fileType: 'docx',
              showMenu: true,
              fail: function(err) {
                wx.showToast({ title: '打开失败', icon: 'none' });
              }
            });
          },
          fail: function(err) {
            that.setData({ exporting: false });
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
        });
      },
      fail: function() {
        that.setData({ exporting: false });
        wx.showToast({ title: '读取内容失败', icon: 'none' });
      }
    });
  },

  // Delta 转段落
  _deltaToDocxParagraphs: function(delta) {
    if (!delta) return [{ type: 'p', text: '', format: {} }];
    var paragraphs = [];
    var currentPara = { type: 'p', text: '', format: {} };
    var ops = delta.ops || [];
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.insert) {
        if (typeof op.insert === 'string') {
          var text = op.insert;
          var attrs = op.attributes || {};
          if (text === '\n') {
            if (currentPara.text || Object.keys(currentPara.format).length > 0) {
              paragraphs.push(currentPara);
            }
            currentPara = { type: 'p', text: '', format: {} };
            continue;
          }
          currentPara.text += text;
          if (attrs.bold) currentPara.format.bold = true;
          if (attrs.italic) currentPara.format.italic = true;
          if (attrs.underline) currentPara.format.underline = true;
          if (attrs.strike) currentPara.format.strike = true;
          if (attrs.color) currentPara.format.color = attrs.color;
          if (attrs.fontFamily) currentPara.format.fontFamily = attrs.fontFamily;
          if (attrs.header) currentPara.type = 'h' + attrs.header;
        }
      }
    }
    if (currentPara.text || Object.keys(currentPara.format).length > 0) {
      paragraphs.push(currentPara);
    }
    if (paragraphs.length === 0) {
      paragraphs = [{ type: 'p', text: '', format: {} }];
    }
    return paragraphs;
  },

  _htmlToDocxParagraphs: function(html) {
    var paragraphs = [];
    // Simple HTML parsing for export
    var pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    for (var i = 0; i < pMatches.length; i++) {
      var text = pMatches[i].replace(/<[^>]+>/g, '').trim();
      if (text) paragraphs.push({ type: 'p', text: text, format: {} });
    }
    return paragraphs.length ? paragraphs : [{ type: 'p', text: '', format: {} }];
  },

  // 构建 DOCX
  _buildDocx: function(paragraphs) {
    var that = this;
    var bodyXml = '';
    for (var i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i];
      var bullet = p.type === 'li';
      var styleId = 'Normal';
      if (p.type === 'h1') styleId = 'Heading1';
      else if (p.type === 'h2') styleId = 'Heading2';
      else if (p.type === 'h3') styleId = 'Heading3';
      bodyXml += that._makeParagraph(p.text, styleId, bullet, p.format || {});
    }

    var docXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"',
      ' xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
      ' xmlns:o="urn:schemas-microsoft-com:office:office"',
      ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
      ' xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
      ' xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"',
      ' mc:Ignorable="w14">',
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
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
      '<w:docDefaults>',
      '<w:rPrDefault>',
      '<w:rPr>',
      '<w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体"/>',
      '<w:sz w:val="24"/>',
      '</w:rPr>',
      '</w:rPrDefault>',
      '</w:docDefaults>',
      '<w:style w:type="paragraph" w:styleId="Normal">',
      '<w:name w:val="Normal"/>',
      '<w:rPr>',
      '<w:sz w:val="24"/>',
      '</w:rPr>',
      '</w:style>',
      '<w:style w:type="paragraph" w:styleId="Heading1">',
      '<w:name w:val="heading 1"/>',
      '<w:rPr>',
      '<w:b/><w:sz w:val="48"/>',
      '</w:rPr>',
      '</w:style>',
      '<w:style w:type="paragraph" w:styleId="Heading2">',
      '<w:name w:val="heading 2"/>',
      '<w:rPr>',
      '<w:b/><w:sz w:val="36"/>',
      '</w:rPr>',
      '</w:style>',
      '<w:style w:type="paragraph" w:styleId="Heading3">',
      '<w:name w:val="heading 3"/>',
      '<w:rPr>',
      '<w:b/><w:sz w:val="32"/>',
      '</w:rPr>',
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

  _makeParagraph: function(text, styleId, bullet, format) {
    var xml = '<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">';
    xml += '<w:pPr><w:pStyle w:val="' + styleId + '"/>';
    if (bullet) xml += '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';
    xml += '</w:pPr>';
    xml += '<w:r><w:rPr>';
    if (format.fontFamily) {
      xml += '<w:rFonts w:ascii="' + format.fontFamily.replace(/"/g, '') + '" w:hAnsi="' + format.fontFamily.replace(/"/g, '') + '"/>';
    }
    if (format.color && format.color.startsWith('#')) {
      xml += '<w:color w:val="' + format.color.substring(1) + '"/>';
    }
    if (format.bold) xml += '<w:b/>';
    if (format.italic) xml += '<w:i/>';
    if (format.underline) xml += '<w:u/>';
    xml += '</w:rPr><w:t>' + this._xmlEscape(text) + '</w:t></w:r></w:p>';
    return xml;
  },

  _xmlEscape: function(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  // ---- 纯 JS ZIP 生成器（DEFLATE 压缩） ----
  _createZip: function() {
    var files = {};
    var that = this;
    return {
      add: function(name, content) { files[name] = content; },
      generate: function() {
        var parts = [];
        var names = Object.keys(files).sort();
        for (var i = 0; i < names.length; i++) {
          parts.push(that._strToBytes(files[names[i]]));
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

  _strToBytes: function(str) {
    var utf8 = unescape(encodeURIComponent(str));
    var arr = new Uint8Array(utf8.length);
    for (var i = 0; i < utf8.length; i++) arr[i] = utf8.charCodeAt(i);
    return arr;
  },

  _deflate: function(data) {
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
    var totalLen = 0;
    for (var i = 0; i < blocks.length; i++) totalLen += blocks[i].length;
    var result = new Uint8Array(totalLen);
    var off = 0;
    for (var j = 0; j < blocks.length; j++) {
      result.set(blocks[j], off); off += blocks[j].length;
    }
    return result;
  },

  _crc32: function(data) {
    var crc = 0xFFFFFFFF;
    var table = this._crcTable || (this._crcTable = this._makeCrcTable());
    for (var i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  },

  _makeCrcTable: function() {
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

  _makeLocalHeader: function(name, compressedSize, crc, uncompressedSize) {
    var nameBytes = this._strToBytes(name);
    var buf = new Uint8Array(30 + nameBytes.length);
    buf[0] = 0x50; buf[1] = 0x4B; buf[2] = 0x03; buf[3] = 0x04;
    buf[4] = 20; buf[5] = 0;
    buf[6] = 0; buf[7] = 0;
    buf[8] = 0; buf[9] = 0;
    buf[10] = crc & 0xFF; buf[11] = (crc >> 8) & 0xFF; buf[12] = (crc >> 16) & 0xFF; buf[13] = (crc >> 24) & 0xFF;
    buf[14] = compressedSize & 0xFF; buf[15] = (compressedSize >> 8) & 0xFF;
    buf[16] = (compressedSize >> 16) & 0xFF; buf[17] = (compressedSize >> 24) & 0xFF;
    buf[18] = uncompressedSize & 0xFF; buf[19] = (uncompressedSize >> 8) & 0xFF;
    buf[20] = (uncompressedSize >> 16) & 0xFF; buf[21] = (uncompressedSize >> 24) & 0xFF;
    buf[22] = nameBytes.length & 0xFF; buf[23] = (nameBytes.length >> 8) & 0xFF;
    buf[24] = 0; buf[25] = 0;
    buf.set(nameBytes, 26);
    return buf;
  },

  _makeCdEntry: function(name, compressedSize, crc, uncompressedSize, localOffset) {
    var nameBytes = this._strToBytes(name);
    var buf = new Uint8Array(46 + nameBytes.length);
    buf[0] = 0x50; buf[1] = 0x4B; buf[2] = 0x01; buf[3] = 0x02;
    buf[4] = 20; buf[5] = 0;
    buf[6] = 20; buf[7] = 0;
    buf[8] = 0; buf[9] = 0;
    buf[10] = 0; buf[11] = 0;
    buf[12] = crc & 0xFF; buf[13] = (crc >> 8) & 0xFF; buf[14] = (crc >> 16) & 0xFF; buf[15] = (crc >> 24) & 0xFF;
    buf[16] = compressedSize & 0xFF; buf[17] = (compressedSize >> 8) & 0xFF;
    buf[18] = (compressedSize >> 16) & 0xFF; buf[19] = (compressedSize >> 24) & 0xFF;
    buf[20] = uncompressedSize & 0xFF; buf[21] = (uncompressedSize >> 8) & 0xFF;
    buf[22] = (uncompressedSize >> 16) & 0xFF; buf[23] = (uncompressedSize >> 24) & 0xFF;
    buf[24] = nameBytes.length & 0xFF; buf[25] = (nameBytes.length >> 8) & 0xFF;
    buf[26] = 0; buf[27] = 0;
    buf[28] = 0; buf[29] = 0;
    buf[30] = 0; buf[31] = 0; buf[32] = 0; buf[33] = 0;
    buf[34] = localOffset & 0xFF; buf[35] = (localOffset >> 8) & 0xFF;
    buf[36] = (localOffset >> 16) & 0xFF; buf[37] = (localOffset >> 24) & 0xFF;
    buf.set(nameBytes, 38);
    return buf;
  },

  _makeEocd: function(numFiles, cdParts, cdOffset) {
    var cdSize = 0;
    for (var i = 0; i < cdParts.length; i++) cdSize += cdParts[i].length;
    var buf = new Uint8Array(22);
    buf[0] = 0x50; buf[1] = 0x4B; buf[2] = 0x05; buf[3] = 0x06;
    buf[4] = 0; buf[5] = 0;
    buf[6] = 0; buf[7] = 0;
    buf[8] = numFiles & 0xFF; buf[9] = (numFiles >> 8) & 0xFF;
    buf[10] = numFiles & 0xFF; buf[11] = (numFiles >> 8) & 0xFF;
    buf[12] = cdSize & 0xFF; buf[13] = (cdSize >> 8) & 0xFF;
    buf[14] = (cdSize >> 16) & 0xFF; buf[15] = (cdSize >> 24) & 0xFF;
    buf[16] = cdOffset & 0xFF; buf[17] = (cdOffset >> 8) & 0xFF;
    buf[18] = (cdOffset >> 16) & 0xFF; buf[19] = (cdOffset >> 24) & 0xFF;
    buf[20] = 0; buf[21] = 0;
    return buf;
  },

  _base64Encode: function(bytes) {
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
  _deltaToHtml: function(content) {
    if (!content) return '';
    try {
      var parsed = JSON.parse(content);
      if (typeof parsed === 'string') content = parsed;
      else if (typeof parsed === 'object' && parsed !== null) {
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
              html += tag + t;
              if (attrs.header) html += '</h' + attrs.header + '>';
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
    var trimmed = content.trim();
    if (trimmed.charAt(0) === '<') return trimmed;
    return content || '';
  },

  goBack: function() {
    if (this._dirty) this.saveDoc();
    wx.navigateBack();
  },

  _getList: function() {
    var raw = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(raw) ? raw : [];
  },

  _findDoc: function(id) {
    var list = this._getList();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }
});