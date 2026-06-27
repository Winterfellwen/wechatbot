// fortune/components/chat-input/chat-input.js
Component({
  data: {
    inputValue: ''
  },

  methods: {
    handleInput(e) {
      this.setData({ inputValue: e.detail.value });
    },

    handleSend() {
      const content = this.data.inputValue.trim();
      if (!content) {
        return;
      }
      this.triggerEvent('send', { content });
      this.setData({ inputValue: '' });
    }
  }
});
