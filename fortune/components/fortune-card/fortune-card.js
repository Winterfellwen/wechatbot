Component({
  properties: {
    typeName: {
      type: String,
      value: ''
    },
    content: {
      type: String,
      value: ''
    },
    status: {
      type: String,
      value: 'pending'
    }
  },

  data: {
    displayContent: '',
    showCursor: false
  },

  observers: {
    'content': function(content) {
      this.setData({ displayContent: content });
    },
    'status': function(status) {
      this.setData({ showCursor: status === 'streaming' });
    }
  },

  methods: {
    handleRetry() {
      this.triggerEvent('retry');
    }
  }
});
