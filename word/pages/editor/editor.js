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
    fontSizes: [10, 12, 14, 16, 18, 24, 36],
    fontFamilies: ['微软雅黑', '宋体', '黑体', '楷体', 'Arial', 'Times New Roman'],
    toolbarExpanded: false,
    showColorPicker: false,
    colorTarget: 'color',
    previewMode: false,
    previewNodes: ''
  },

  editorCtx: null,
  _loaded: false,
  _dirty: false,
  _imageStore: {},
  _tableStore: [],

  onLoad: function (options) {
    this.setData({ docId: options.id || '' });
    var doc = this._findDoc(options.id);
    if (doc) this.setData({ title: doc.title });
    // Load existing tables for this document
    if (doc && doc.tables) this._tableStore = doc.tables.slice();
  },

  onShow: function () {
    var pending = wx.getStorageSync('word_pending_table');
    if (!pending) return;
    wx.removeStorageSync('word_pending_table');
    var that = this;
    if (pending.index >= 0 && pending.index < this._tableStore.length) {
      // Edit existing table — just update data, placeholder stays
      this._tableStore[pending.index] = pending.data;
      this._dirty = true;
      this.setData({ saveStatus: '未保存' });
      wx.showToast({ title: '表格已更新', icon: 'success' });
    } else {
      // New table — add data and insert table image into editor
      var idx = this._tableStore.length;
      this._tableStore.push(pending.data);
      if (this.editorCtx && this._loaded) {
        // First insert marker, then insert table image on top
        that.editorCtx.getContents({
          success: function (res) {
            var html = (res.html || '') + '<p>〓表格' + (idx + 1) + '〓</p>';
            that.editorCtx.setContents({ html: html });
            // After content set, insert the table image
            setTimeout(function () {
              that._renderTableAsImage(idx, function (imgPath) {
                if (imgPath) {
                  that.editorCtx.insertImage({ src: imgPath, width: '100%', height: 'auto' });
                }
              });
            }, 200);
            that._dirty = true;
            that.setData({ saveStatus: '未保存' });
          }
        });
      }
    }
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
    // Pass current table store so table-editor can load existing data
    wx.setStorageSync('word_edit_table', { tables: this._tableStore, index: -1 });
    wx.navigateTo({
      url: '/word/pages/table-editor/table-editor?id=' + this.data.docId
    });
  },

  editTable: function () {
    var that = this;
    if (this._tableStore.length === 0) {
      wx.showToast({ title: '暂无表格', icon: 'none' });
      return;
    }
    var items = [];
    for (var i = 0; i < this._tableStore.length; i++) {
      var t = this._tableStore[i];
      items.push('表格' + (i + 1) + ' (' + t.rows + '×' + t.cols + ')');
    }
    wx.showActionSheet({
      itemList: items,
      success: function (res) {
        var idx = res.tapIndex;
        // Save table data before navigating
        wx.setStorageSync('word_edit_table', { tables: that._tableStore, index: idx });
        wx.navigateTo({
          url: '/word/pages/table-editor/table-editor?id=' + that.data.docId + '&idx=' + idx
        });
      }
    });
  },

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

  togglePreview: function () {
    var that = this;
    if (!this.data.previewMode) {
      // Switch to preview: get editor content, build preview HTML
      if (!this.editorCtx) return;
      this.editorCtx.getContents({
        success: function (res) {
          var html = res.html || '';
          // Replace 【表格N】 placeholders with real table HTML for display
          html = that._renderTablesInHtml(html);
          that.setData({ previewMode: true, previewNodes: html });
        }
      });
    } else {
      this.setData({ previewMode: false });
    }
  },

  _renderTablesInHtml: function (html) {
    // Replace 【表格N】 placeholders with actual <table> HTML for rich-text preview
    var store = this._tableStore;
    return html.replace(/〓表格(\d+)〓/g, function (match, num) {
      var idx = parseInt(num) - 1;
      if (idx >= 0 && idx < store.length) {
        var t = store[idx];
        var tbl = '<table style="border-collapse:collapse;width:100%;margin:10px 0;">';
        for (var r = 0; r < t.rows; r++) {
          tbl += '<tr>';
          for (var c = 0; c < t.cols; c++) {
            var cellText = (t.cells[r] && t.cells[r][c]) || '';
            if (r === 0) {
              tbl += '<th style="border:1px solid #999;padding:8px;background:#f0f0f0;">' + cellText + '</th>';
            } else {
              tbl += '<td style="border:1px solid #ccc;padding:8px;">' + cellText + '</td>';
            }
          }
          tbl += '</tr>';
        }
        tbl += '</table>';
        return tbl;
      }
      return match;
    });
  },

  // Render table as image on hidden canvas, insert into editor
  _renderTableAsImage: function (tableIdx, callback) {
    var t = this._tableStore[tableIdx];
    if (!t) { callback && callback(''); return; }
    var that = this;
    var cellW = 160, cellH = 36, headerH = 40;
    var padX = 8, padY = 8;
    var totalW = t.cols * cellW + 2;
    var totalH = t.rows * cellH + 2;

    var ctx = wx.createCanvasContext('tableCanvas');
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, totalW, totalH);

    // Grid lines
    ctx.setStrokeStyle('#cccccc');
    ctx.setLineWidth(1);
    for (var r = 0; r <= t.rows; r++) { ctx.moveTo(0, r * cellH); ctx.lineTo(totalW, r * cellH); }
    for (var c = 0; c <= t.cols; c++) { ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, totalH); }
    ctx.stroke();

    // Cells
    ctx.setFontSize(12);
    for (var r2 = 0; r2 < t.rows; r2++) {
      for (var c2 = 0; c2 < t.cols; c2++) {
        var cellText = (t.cells[r2] && t.cells[r2][c2]) || '';
        if (r2 === 0) {
          ctx.setFillStyle('#e8ecf1');
          ctx.fillRect(c2 * cellW + 1, r2 * cellH + 1, cellW - 1, cellH - 1);
          ctx.setFillStyle('#222222');
        } else {
          ctx.setFillStyle(r2 % 2 === 1 ? '#f9f9f9' : '#ffffff');
          ctx.fillRect(c2 * cellW + 1, r2 * cellH + 1, cellW - 1, cellH - 1);
          ctx.setFillStyle('#333333');
        }
        var maxChars = Math.floor((cellW - padX * 2) / 7);
        var displayText = cellText.length > maxChars ? cellText.substring(0, maxChars - 1) + '…' : cellText;
        ctx.fillText(displayText, c2 * cellW + padX, r2 * cellH + 24);
      }
    }
    ctx.draw(false, function () {
      wx.canvasToTempFilePath({
        canvasId: 'tableCanvas',
        width: totalW,
        height: totalH,
        success: function (res) {
          callback && callback(res.tempFilePath);
        },
        fail: function () {
          callback && callback('');
        }
      });
    });
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
        // Read image data immediately while temp file is guaranteed valid
        wx.getFileSystemManager().readFile({
          filePath: tempFilePath,
          success: function (readRes) {
            var ext = (tempFilePath.match(/\.(\w+)(\?|$)/) || [])[1] || 'png';
            that._imageStore[tempFilePath] = { data: readRes.data, ext: ext };
            that._insertImageToEditor(tempFilePath);
          },
          fail: function () {
            that._insertImageToEditor(tempFilePath);
          }
        });
      }
    });
  },

  _insertImageToEditor: function (tempFilePath) {
    var that = this;
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
          list[idx].tables = that._tableStore.slice();
        }
        wx.setStorageSync(STORAGE_KEY, list);

        // 提取图片信息并组装图片数据
        var imageInfos = docxLib.getImageInfos(html);
        console.log('[saveDoc] imageInfos count:', imageInfos.length, 'html length:', html.length);
        if (imageInfos.length > 0) {
          for (var dbg = 0; dbg < imageInfos.length; dbg++) {
            console.log('[saveDoc] image ' + dbg + ':', JSON.stringify(imageInfos[dbg]));
          }
          // Try to use cached image data from insertImage
          var cachedKeys = Object.keys(that._imageStore);
          console.log('[saveDoc] cached images:', cachedKeys.length);
        }
        if (imageInfos.length > 0) {
          var imageDatas = [];
          var loaded = 0;
          function tryGenerate() {
            loaded++;
            if (loaded === imageInfos.length) {
              generateAndSave(imageDatas);
            }
          }
          for (var ii = 0; ii < imageInfos.length; ii++) {
            (function (idx) {
              var info = imageInfos[idx];
              // Try cache lookup by src first
              var cached = that._imageStore[info.src];
              if (!cached) {
                // Try suffix match (editor may normalize paths)
                var keys = Object.keys(that._imageStore);
                for (var ki = 0; ki < keys.length; ki++) {
                  if (info.src.indexOf(keys[ki]) >= 0 || keys[ki].indexOf(info.src) >= 0) {
                    cached = that._imageStore[keys[ki]];
                    break;
                  }
                }
              }
              if (cached) {
                imageDatas[idx] = { data: cached.data, ext: cached.ext, width: info.width, height: info.height };
                tryGenerate();
              } else if (info.src) {
                // Fallback: try reading the file directly
                wx.getFileSystemManager().readFile({
                  filePath: info.src,
                  success: function (readRes) {
                    var ext = (info.src.match(/\.(\w+)(\?|$)/) || [])[1] || 'png';
                    imageDatas[idx] = { data: readRes.data, ext: ext, width: info.width, height: info.height };
                    tryGenerate();
                  },
                  fail: function (err) {
                    console.error('[saveDoc] read image fail:', info.src, err);
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
            ? docxLib.htmlToDocxWithImages(html, imageDatas, that._tableStore)
            : docxLib.htmlToDocx(html, that._tableStore);
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
              wx.openDocument({
                filePath: filePath,
                fileType: 'docx',
                showMenu: true,
                fail: function (err) {
                  console.error('openDocument fail:', err);
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