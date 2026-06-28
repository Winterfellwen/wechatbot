// fortune/components/chat-input/chat-input.js
Component({
  properties: {
    value: {
      type: String,
      value: ''
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },

  data: {
    inputValue: ''
  },

  observers: {
    'value': function(val) {
      if (val !== this.data.inputValue) {
        this.setData({ inputValue: val });
      }
    }
  },

  methods: {
    handleInput(e) {
      const val = e.detail.value;
      this.setData({ inputValue: val });
      this.triggerEvent('input', { value: val });
    },

    handleConfirm() {
      if (this.properties.disabled) return;
      const content = this.data.inputValue.trim();
      if (!content) return;
      this.triggerEvent('confirm', { content });
    }
  }
});
