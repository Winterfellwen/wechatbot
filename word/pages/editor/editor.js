// word/pages/editor/editor.js
// 纯前端 DOCX 生成（无 npm 依赖）
// DOCX = zip( [Content_Types].xml, _rels/.rels, word/document.xml, word/_rels/document.xml.rels )

var STORAGE_KEY = 'word_docs';
var pako = require('./pako.es5');
var docxLib = require('../../utils/docx');

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
    saveStatus: '未保存',
    exporting: false,
    tablePicker: false,
    tableRows: 2,
    tableCols: 2,
    fontSizes: [10, 12, 14, 16, 18, 24, 36],
    fontFamilies: ['微软雅黑', '宋体', '黑体', '楷体', 'Arial', 'Times New Roman'],
    toolbarExpanded: false,
    showColorPicker: false,
    colorTarget: 'color'
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
    }).exec();
  },

  onStatusChange: function (e) {
    this.setData({ fmt: e.detail });
  },

  onEditorInput: function () {
    this._dirty = true;
    this.setData({ saveStatus: '未保存' });
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

  insertTable: function () {
    this.setData({ tablePicker: true });
  },

  confirmTable: function () {
    var rows = this.data.tableRows;
    var cols = this.data.tableCols;
    var html = '<table style="border-collapse:collapse;width:100%;margin:10px 0;">';
    for (var r = 0; r < rows; r++) {
      html += '<tr>';
      for (var c = 0; c < cols; c++) {
        html += '<td style="border:1px solid #ddd;padding:8px;min-width:60px;">' +
                (r === 0 ? '<strong>列' + (c + 1) + '</strong>' : '内容') +
                '</td>';
      }
      html += '</tr>';
    }
    html += '</table>';
    this.editorCtx && this.editorCtx.insertHTML(html);
    this.setData({ tablePicker: false });
  },

  changeTableRows: function (e) {
    var delta = parseInt(e.currentTarget.dataset.delta);
    var newVal = Math.min(6, Math.max(2, this.data.tableRows + delta));
    this.setData({ tableRows: newVal });
  },

  changeTableCols: function (e) {
    var delta = parseInt(e.currentTarget.dataset.delta);
    var newVal = Math.min(6, Math.max(2, this.data.tableCols + delta));
    this.setData({ tableCols: newVal });
  },

  cancelTable: function () {
    this.setData({ tablePicker: false });
  },

  noop: function () {},

  setFontSize: function (e) {
    var size = e.currentTarget.dataset.size;
    this.editorCtx && this.editorCtx.format('fontSize', size);
  },

  setFontFamily: function (e) {
    var family = e.currentTarget.dataset.family;
    this.editorCtx && this.editorCtx.format('fontFamily', family);
  },

  toggleExpand: function () {
    this.setData({ toolbarExpanded: !this.data.toolbarExpanded });
  },

  pickColor: function (e) {
    if (!this.editorCtx) return;
    var target = e.currentTarget.dataset.target;
    this.setData({
      showColorPicker: true,
      colorTarget: target
    });
  },

  onColorPick: function (e) {
    var detail = e.detail;
    if (!this.editorCtx) return;
    this.editorCtx.format(detail.target, detail.color);
    var fmtUpdate = {};
    fmtUpdate[detail.target] = detail.color;
    this.setData({ fmt: Object.assign({}, this.data.fmt, fmtUpdate) });
  },

  onColorClose: function () {
    this.setData({ showColorPicker: false });
  },

  insertImage: function () {
    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var tempFilePath = res.tempFilePaths[0];
        wx.getImageInfo({
          src: tempFilePath,
          success: function (imgInfo) {
            var maxWidth = 600;
            var width = imgInfo.width;
            var height = imgInfo.height;
            if (width > maxWidth) {
              height = Math.round(height * maxWidth / width);
              width = maxWidth;
            }
            that.editorCtx && that.editorCtx.insertImage({
              src: tempFilePath,
              width: width + 'px',
              height: height + 'px'
            });
          },
          fail: function () {
            that.editorCtx && that.editorCtx.insertImage({
              src: tempFilePath,
              width: '300px',
              height: 'auto'
            });
          }
        });
      }
    });
  },

  saveDoc: function () {
    if (!this._loaded) return;
    var that = this;
    that.setData({ saveStatus: '保存中...' });
    that.editorCtx.getContents({
      success: function (res) {
        var html = res.html || '';
        var content = JSON.stringify(html || '');
        var list = that._getList();
        var idx = list.findIndex(function (d) { return d.id === that.data.docId; });
        var now = Date.now();
        if (idx >= 0) {
          list[idx].title = that.data.title || '未命名文档';
          list[idx].content = content;
          list[idx].updatedAt = now;
        }
        wx.setStorageSync(STORAGE_KEY, list);

        // 提取图片信息并读取图片文件
        var imageInfos = docxLib.getImageInfos(html);
        if (imageInfos.length > 0) {
          var imageDatas = [];
          var loaded = 0;
          var thatSave = that;
          function tryGenerate() {
            loaded++;
            if (loaded === imageInfos.length) {
              generateAndSave(imageDatas);
            }
          }
          for (var ii = 0; ii < imageInfos.length; ii++) {
            (function (idx) {
              var info = imageInfos[idx];
              if (info.src && info.src.indexOf('wxfile') >= 0) {
                wx.getFileSystemManager().readFile({
                  filePath: info.src,
                  success: function (readRes) {
                    var ext = (info.src.match(/\.(\w+)$/) || [])[1] || 'png';
                    imageDatas[idx] = { data: readRes.data, ext: ext, width: info.width, height: info.height };
                    tryGenerate();
                  },
                  fail: function () {
                    imageDatas[idx] = { data: null, ext: 'png', width: info.width, height: info.height };
                    tryGenerate();
                  }
                });
              } else {
                imageDatas[idx] = { data: null, ext: 'png', width: info.width, height: info.height };
                tryGenerate();
              }
            })(ii);
          }
        } else {
          generateAndSave([]);
        }

        function generateAndSave(imageDatas) {
          var docxBase64 = imageDatas.length > 0
            ? docxLib.htmlToDocxWithImages(html, imageDatas)
            : docxLib.htmlToDocx(html);
          var fileName = (that.title || '未命名文档') + '_' + now + '.docx';
          var filePath = wx.env.USER_DATA_PATH + '/' + fileName;
          var buffer = wx.base64ToArrayBuffer(docxBase64);
          wx.getFileSystemManager().writeFile({
            filePath: filePath,
            data: buffer,
            encoding: 'binary',
            success: function () {
              that.setData({ saveStatus: '已保存并导出' });
              that._dirty = false;
              wx.showToast({ title: '已保存并导出', icon: 'success' });
              wx.shareFileMessage({
                filePath: filePath,
                fileName: fileName,
                fail: function (err) {
                  console.error('shareFileMessage fail:', err);
                }
              });
            },
            fail: function (err) {
              that.setData({ saveStatus: '保存失败' });
              wx.showToast({ title: '文件保存失败', icon: 'none' });
              console.error('writeFile fail:', err);
            }
          });
        }
      },
      fail: function () {
        that.setData({ saveStatus: '保存失败' });
        wx.showToast({ title: '读取内容失败', icon: 'none' });
      }
    });
  },

  importDocx: function () {
    var that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['docx', 'doc'],
      success: function (res) {
        var file = res.tempFiles[0];
        wx.showLoading({ title: '解析中...' });
        wx.getFileSystemManager().readFile({
          filePath: file.path,
          success: function (readRes) {
            wx.hideLoading();
            // readFile({ encoding:'base64' }) 返回 base64 字符串，直接用，跳过 btoa 往返
            var raw = readRes.data;
            var buf;
            if (typeof raw === 'string') {
              // 剥除换行/空格（某些微信版本会插入每76字符换行）
              var clean = raw.replace(/[\n\r\s]/g, '');
              buf = wx.base64ToArrayBuffer(clean);
            } else {
              // 没指定 encoding，微信直接返回 ArrayBuffer
              buf = raw;
            }
            console.log('[import] buf byteLength:', buf.byteLength);
            var files = that._unzip(buf);
            console.log('[import] files keys:', Object.keys(files));
            var docXml = files['word/document.xml'];
            if (!docXml) {
              wx.showToast({ title: '无效的 DOCX 文件', icon: 'none' });
              return;
            }
            var xmlStr = that._bytesToStr(docXml);
            var html = that._parseDocXml(xmlStr);
            if (that.editorCtx) {
              that.editorCtx.setContents({ html: html });
              that.setData({ title: file.name.replace(/\.[^.]+$/, '') });
              wx.showToast({ title: '导入成功', icon: 'success' });
            }
          },
          fail: function () {
            wx.hideLoading();
            wx.showToast({ title: '读取文件失败', icon: 'none' });
          }
        });
      },
      fail: function () {}
    });
  },

  _unzip: function (buf) {
    var view = new Uint8Array(buf);
    var files = {};
    var off = 0;
    while (off < view.length - 4) {
      if (view[off] !== 0x50 || view[off + 1] !== 0x4B) { off++; continue; }
      var sig = view[off + 2] | (view[off + 3] << 8);
      if (sig === 0x0403) {
        var cm = view[off + 8] | (view[off + 9] << 8);
        var flags = view[off + 6] | (view[off + 7] << 8); // general purpose bit flag
        var hasDataDescriptor = (flags & 0x0008) !== 0;
        var csize = view[off + 18] | (view[off + 19] << 8) | (view[off + 20] << 16) | (view[off + 21] << 24);
        var usize = view[off + 22] | (view[off + 23] << 8) | (view[off + 24] << 16) | (view[off + 25] << 24);
        var nl = view[off + 26] | (view[off + 27] << 8);
        var el = view[off + 28] | (view[off + 29] << 8);
        var name = '';
        for (var i = 0; i < nl; i++) name += String.fromCharCode(view[off + 30 + i]);
        var dataOff = off + 30 + nl + el;
        var compressed;
        var newOff;
        if (hasDataDescriptor) {
          // Find the data descriptor signature (0x08074b50) after the file data
          let searchStart = dataOff;
          // Safety limit to avoid infinite loop
          const maxSearch = Math.min(view.length, searchStart + 1024 * 1024); // 1MB max search
          let descSigPos = -1;
          for (let i = searchStart; i <= maxSearch - 4; i++) {
            if (view[i] === 0x50 && view[i + 1] === 0x4B && view[i + 2] === 0x07 && view[i + 3] === 0x08) {
              descSigPos = i;
              break;
            }
          }
          if (descSigPos === -1) {
            // Fallback: assume csize is correct (should not happen)
            compressed = view.slice(dataOff, dataOff + csize);
            newOff = dataOff + csize;
          } else {
            // compressed data is from dataOff up to descriptor signature
            compressed = view.slice(dataOff, descSigPos);
            // skip descriptor: signature (4) + crc (4) + compressed size (4) + uncompressed size (4)
            newOff = descSigPos + 4 + 4 + 4 + 4;
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

  // _inflate: 用 pako 替换手写 inflate（处理 ZLIB 封装，自动处理 header/adler32）
  _inflate: function (data) {
    try {
      return pako.inflate(data, { raw: true });
    } catch (e) {
      console.error('[inflate error]', e.message);
      return new Uint8Array(0);
    }
  },

  _bytesToStr: function (bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return decodeURIComponent(escape(s));
  },

  _parseDocXml: function (xmlText) {
    var html = '';
    var paraMatches = xmlText.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
    for (var pi = 0; pi < paraMatches.length; pi++) {
      var pXml = paraMatches[pi];
      var styleMatch = pXml.match(/<w:pStyle w:val="([^"]+)"/);
      var style = styleMatch ? styleMatch[1] : '';
      var isH = /^Heading/.test(style) || /^h[1-6]$/i.test(style);
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
      var level = style === 'Heading1' ? 1 : style === 'Heading2' ? 2 : style === 'Heading3' ? 3 : 0;
      var openTag = isH ? '<h' + level + '>' : isList ? '<li>' : '<p>';
      var closeTag = openTag.replace('<', '</');
      if (align === 'center' || align === 'right') openTag = openTag.replace('>', ' style="text-align:' + align + '">');
      html += openTag + text + closeTag;
    }
    return html || '<p></p>';
  },

  // ---- 导出 DOCX（纯前端，无 npm 依赖） ----
  exportDocx: function () {
    this.saveDoc();
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