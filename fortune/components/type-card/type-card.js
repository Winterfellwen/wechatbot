Component({
  properties: {
    type: {
      type: String,
      value: ''
    },
    name: {
      type: String,
      value: ''
    },
    icon: {
      type: String,
      value: ''
    }
  },

  methods: {
    handleTap() {
      this.triggerEvent('tap', { type: this.properties.type });
    }
  }
});
