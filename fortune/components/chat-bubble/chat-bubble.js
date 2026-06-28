var renderService = require('../../services/render-service');

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
          this.setData({ htmlContent: renderService.toHtml(newVal) });
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
        this.setData({ htmlContent: renderService.toHtml(this.data.content) });
      }
    }
  },
  methods: {
  }
});
