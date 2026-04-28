// word/pages/editor/editor.js
var STORAGE_KEY = 'word_docs';
var Packer = require('docx').Packer;
var Document = require('docx').Document;
var Paragraph = require('docx').Paragraph;
var TextRun = require('docx').TextRun;
var HeadingLevel = require('docx').HeadingLevel;
var AlignmentType = require('docx').AlignmentType;

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
    exporting: false,
    autoExport: false
  },

  editorCtx: null,
  _loaded: false,
  _dirty: false,

  onLoad: function (options) {
    this.setData({
      docId: options.id || '',
      autoExport: !!options.export
    });
    var doc = this._findDoc(options.id);
    if (doc) {
      this.setData({ title: doc.title });
    }
  },

  onEditorReady: function () {
    var that = this;
    wx.createSelectorQuery().select('#editor').context(function (res) {
      that.editorCtx = res.context;
      var doc = that._findDoc(that.data.docId);
      if (doc && doc.content) {
        // 恢复内容
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
    autoSaveTimer = setTimeout(function () {
      this.saveDoc();
    }.bind(this), 1500);
  },

  onTitleInput: function (e) {
    this.setData({ title: e.detail.value });
    this._dirty = true;
  },

  // ---- 格式操作 ----
  toggleBold: function () {
    this.editorCtx && this.editorCtx.format('bold');
  },
  toggleItalic: function () {
    this.editorCtx && this.editorCtx.format('italic');
  },
  toggleUnderline: function () {
    this.editorCtx && this.editorCtx.format('underline');
  },
  toggleStrike: function () {
    this.editorCtx && this.editorCtx.format('strike');
  },
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
  undo: function () {
    this.editorCtx && this.editorCtx.undo();
  },
  redo: function () {
    this.editorCtx && this.editorCtx.redo();
  },
  clearFormat: function () {
    this.editorCtx && this.editorCtx.removeFormat();
  },

  // ---- 保存 ----
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

  // ---- 导出 DOCX ----
  exportDocx: function () {
    if (this.data.exporting) return;
    this.setData({ exporting: true });
    var that = this;

    if (!this._loaded) {
      var checkTimer = setInterval(function () {
        if (that._loaded) {
          clearInterval(checkTimer);
          that._doExport();
        }
      }, 200);
      setTimeout(function () { clearInterval(checkTimer); }, 5000);
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
        var doc = new Document({
          sections: [{
            properties: {},
            children: paragraphs
          }]
        });
        Packer.toBuffer(doc).then(function (buffer) {
          var fileName = (that.data.title || '未命名文档') + '.docx';
          var filePath = wx.env.USER_DATA_PATH + '/' + fileName;
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
                success: function () {
                  console.log('文档已打开');
                },
                fail: function (err) {
                  wx.showToast({ title: '打开失败', icon: 'none' });
                  console.error('openDocument fail:', err);
                }
              });
            },
            fail: function (err) {
              that.setData({ exporting: false });
              wx.showToast({ title: '导出失败', icon: 'none' });
              console.error('writeFile fail:', err);
            }
          });
        }).catch(function (err) {
          that.setData({ exporting: false });
          wx.showToast({ title: '生成失败: ' + (err.message || err), icon: 'none', duration: 3000 });
          console.error('Packer.toBuffer fail:', err);
        });
      },
      fail: function () {
        that.setData({ exporting: false });
        wx.showToast({ title: '读取内容失败', icon: 'none' });
      }
    });
  },

  // ---- HTML → DOCX 转换 ----
  _htmlToDocxParagraphs: function (html) {
    if (!html) return [new Paragraph({ children: [new TextRun('')] })];

    var paragraphs = [];
    // 简单 HTML 解析：按段落/标题/列表分割
    var blocks = this._parseHtmlBlocks(html);
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var children = [];
      if (block.type === 'heading') {
        var hLevel = block.level || 1;
        var headingMap = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 };
        children.push(new TextRun({ text: block.text, bold: true, size: 32 - (hLevel - 1) * 4 }));
        paragraphs.push(new Paragraph({
          heading: headingMap[hLevel] || HeadingLevel.HEADING_1,
          children: children
        }));
      } else if (block.type === 'list') {
        paragraphs.push(new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: block.text })]
        }));
      } else {
        // 普通段落：解析内联格式
        var runs = this._parseInlineRuns(block.text, block.bold, block.italic, block.underline, block.strike);
        paragraphs.push(new Paragraph({ children: runs }));
      }
    }
    return paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [new TextRun('')] })];
  },

  _parseHtmlBlocks: function (html) {
    var blocks = [];
    // 替换 <br> 为换行标记
    html = html.replace(/<br\s*\/?>/gi, '\n');
    // 按 block 标签分割
    var parts = html.split(/<\/?(h[1-6]|p|div|li|ul|ol|section)[^>]*>/gi);
    for (var i = 0; i < parts.length; i++) {
      var text = parts[i].replace(/<[^>]+>/g, '').trim();
      if (!text) continue;
      // 检测标题
      var hMatch = html.match(/<h([1-6])[^>]*>/gi);
      var block = { type: 'paragraph', text: text };
      if (text.length > 100) {
        // 长文本按换行分割
        var lines = text.split('\n');
        for (var j = 0; j < lines.length; j++) {
          var line = lines[j].trim();
          if (line) blocks.push({ type: 'paragraph', text: line });
        }
      } else {
        blocks.push(block);
      }
    }
    return blocks;
  },

  _parseInlineRuns: function (text, bold, italic, underline, strike) {
    // 简单文本转 TextRun
    return [new TextRun({
      text: text || '',
      bold: !!bold,
      italics: !!italic,
      underline: underline ? { type: 'single' } : undefined,
      strike: !!strike
    })];
  },

  // ---- Delta → HTML ----
  _deltaToHtml: function (content) {
    if (!content) return '';
    try {
      // 如果存的是 html 字符串直接返回
      if (content.charAt(0) === '<') return content;
      // 如果是 JSON delta，简单转换
      var delta = JSON.parse(content);
      if (Array.isArray(delta)) {
        var html = '';
        for (var i = 0; i < delta.length; i++) {
          var op = delta[i];
          if (typeof op.insert === 'string') {
            var attrs = op.attributes || {};
            var tag = '';
            if (attrs.bold) tag += '<b>';
            if (attrs.italic) tag += '<i>';
            if (attrs.underline) tag += '<u>';
            if (attrs.strike) tag += '<s>';
            if (attrs.header) tag += '<h' + attrs.header + '>';
            html += tag + op.insert.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</' + (attrs.header ? 'h' + attrs.header : 's') + '>';
            if (attrs.strike) html += '</s>';
            if (attrs.underline) html += '</u>';
            if (attrs.italic) html += '</i>';
            if (attrs.bold) html += '</b>';
          }
        }
        return html;
      }
      return content;
    } catch (e) {
      return content || '';
    }
  },

  // ---- 导航 ----
  goBack: function () {
    if (this._dirty) this.saveDoc();
    wx.navigateBack();
  },

  // ---- 工具方法 ----
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