Component({
  properties: {
    role: {
      type: String,
      value: 'user'
    },
    content: {
      type: String,
      value: '',
      observer: function(newVal) {
        if (this.data.role === 'assistant' && newVal) {
          this.setData({ htmlContent: this.markdownToHtml(newVal) });
        } else {
          this.setData({ htmlContent: '' });
        }
      }
    },
    themeColor: {
      type: String,
      value: '#d97757'
    }
  },
  data: {
    htmlContent: ''
  },
  lifetimes: {
    attached: function() {
      if (this.data.role === 'assistant' && this.data.content) {
        this.setData({ htmlContent: this.markdownToHtml(this.data.content) });
      }
    }
  },
  methods: {
    markdownToHtml: function(md) {
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
  }
});
