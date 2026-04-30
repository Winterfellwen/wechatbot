// word/pages/editor/components/color-picker/color-picker.js
Component({
  properties: {
    show: { type: Boolean, value: false },
    target: { type: String, value: 'color' },
    currentColor: { type: String, value: '#000000' }
  },

  data: {
    customColor: '',
    presetColors: [
      '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#efefef',
      '#980000','#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff',
      '#9900ff','#ff00ff','#e6b8af','#f4cccc','#fce5cd','#fff2cc','#d9ead3','#b6d7a8',
      '#a2c4c9','#d0e0e3','#c9daf8','#cfe2f3','#d9d2e9','#ead1dc','#ea9999','#f9cb9c'
    ]
  },

  methods: {
    onColorTap: function (e) {
      var color = e.currentTarget.dataset.color;
      this.triggerEvent('colorpick', { target: this.data.target, color: color });
      this.triggerEvent('close');
    },

    onCustomInput: function (e) {
      this.setData({ customColor: e.detail.value });
    },

    onCustomApply: function () {
      var color = this.data.customColor.trim();
      if (!color) return;
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
        wx.showToast({ title: '颜色格式错误，请使用#RRGGBB格式', icon: 'none' });
        return;
      }
      this.triggerEvent('colorpick', { target: this.data.target, color: color });
      this.triggerEvent('close');
    },

    onClose: function () {
      this.triggerEvent('close');
    },

    onMaskTap: function () {
      this.triggerEvent('close');
    },

    noop: function () {}
  }
});
