const API_BASE = 'https://wechatbot-g6ez.onrender.com';

Page({
  data: {
    jobId: '',
    htmlContent: '',
    previewNodes: '',
    editorContent: '',
    previewMode: false,
    loading: true,
    hasChanges: false
  },

  onLoad: function(options) {
    const jobId = options.jobId || '';
    this.setData({ jobId: jobId });
    this.loadContent();
  },

  loadContent: function() {
    const that = this;
    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: API_BASE + '/api/aidoc/html/' + this.data.jobId + '.html',
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          let html = res.data;
          // 提取body内容
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          if (bodyMatch) {
            html = bodyMatch[1];
          }
          this.setData({
            htmlContent: html,
            previewNodes: html,
            loading: false
          });
          // 延迟设置editor内容，等待组件ready
          setTimeout(() => {
            this.setEditorContent(html);
          }, 500);
        } else {
          wx.showToast({ title: '加载失败', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  },

  onEditorReady: function() {
    this.setEditorContent(this.data.htmlContent);
  },

  setEditorContent: function(html) {
    if (!html) return;
    const that = this;
    const query = wx.createSelectorQuery();
    query.select('#editor').context(function(res) {
      if (res.context) {
        // 转换HTML为editor可用的格式（简单处理）
        // editor组件需要delta格式，这里先用setContents设置纯文本
        // 实际上更好的做法是后端生成更简洁的HTML
        res.context.setContents({
          delta: {
            ops: [{ insert: that.stripHtml(html) }]
          },
          success: function() {
            console.log('Editor content set');
          }
        });
      }
    });
    query.exec();
  },

  stripHtml: function(html) {
    // 简单去除HTML标签，保留文字
    return html.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').trim();
  },

  onEditorInput: function(e) {
    this.setData({
      editorContent: e.detail.html || e.detail.delta,
      hasChanges: true
    });
  },

  togglePreview: function() {
    const that = this;
    if (!this.data.previewMode) {
      // 切换到预览模式，获取editor内容
      const query = wx.createSelectorQuery();
      query.select('#editor').context(function(res) {
        if (res.context) {
          res.context.getContents({
            success: function(data) {
              // 将delta转换为HTML显示
              let html = that.deltaToHtml(data.delta);
              that.setData({
                previewMode: true,
                previewNodes: html
              });
            }
          });
        }
      });
      query.exec();
    } else {
      this.setData({ previewMode: false });
    }
  },

  deltaToHtml: function(delta) {
    if (!delta || !delta.ops) return '';
    let html = '';
    for (const op of delta.ops) {
      if (op.insert) {
        if (typeof op.insert === 'string') {
          html += op.insert;
        } else if (op.insert.image) {
          html += `<img src="${op.insert.image}" />`;
        }
      }
    }
    return html;
  },

  showExportMenu: function() {
    wx.showActionSheet({
      itemList: ['导出为 PDF', '导出为 DOCX', '导出为 DOC'],
      success: (res) => {
        const format = ['pdf', 'docx', 'doc'][res.tapIndex];
        this.exportFile(format);
      }
    });
  },

  exportFile: function(format) {
    const that = this;
    wx.showLoading({ title: '导出中...' });

    // 获取editor内容或当前HTML
    let htmlContent = this.data.htmlContent;
    if (this.data.hasChanges && this.data.editorContent) {
      // 如果有编辑，使用编辑后的内容
      htmlContent = this.data.editorContent;
    }

    wx.request({
      url: API_BASE + '/api/aidoc/export',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        html_content: htmlContent,
        format: format
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.file_base64) {
          const fs = wx.getFileSystemManager();
          const filePath = wx.env.USER_DATA_PATH + '/exported.' + format;

          fs.writeFile({
            filePath: filePath,
            data: res.data.file_base64,
            encoding: 'base64',
            success: () => {
              wx.openDocument({
                filePath: filePath,
                fileType: format,
                success: () => {
                  wx.showToast({ title: '导出成功', icon: 'success' });
                },
                fail: () => {
                  wx.saveFile({
                    tempFilePath: filePath,
                    success: () => {
                      wx.showToast({ title: '已保存', icon: 'success' });
                    }
                  });
                }
              });
            },
            fail: () => {
              wx.showToast({ title: '导出失败', icon: 'none' });
            }
          });
        } else {
          wx.showToast({ title: '导出失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
});