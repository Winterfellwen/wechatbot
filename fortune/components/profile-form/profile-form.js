// fortune/components/profile-form/profile-form.js
Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    profile: {
      type: Object,
      value: null
    }
  },

  data: {
    name: '',
    birthday: '',
    gender: '',
    birthTime: '',
    genderOptions: ['男', '女'],
    timeOptions: ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时', '不填'],
    errors: {}
  },

  observers: {
    'profile': function(profile) {
      if (profile) {
        this.setData({
          name: profile.name || '',
          birthday: profile.birthday || '',
          gender: profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '',
          birthTime: profile.birthTime || ''
        });
      }
    }
  },

  methods: {
    handleNameInput(e) {
      this.setData({ name: e.detail.value });
      this.clearError('name');
    },

    handleDateChange(e) {
      this.setData({ birthday: e.detail.value });
      this.clearError('birthday');
    },

    handleGenderChange(e) {
      this.setData({ gender: this.data.genderOptions[e.detail.value] });
      this.clearError('gender');
    },

    handleTimeChange(e) {
      const value = this.data.timeOptions[e.detail.value];
      this.setData({ birthTime: value === '不填' ? '' : value });
    },

    clearError(field) {
      const errors = { ...this.data.errors };
      delete errors[field];
      this.setData({ errors });
    },

    validate() {
      const errors = {};
      if (!this.data.name.trim()) {
        errors.name = '请输入姓名';
      }
      if (!this.data.birthday) {
        errors.birthday = '请选择生日';
      }
      if (!this.data.gender) {
        errors.gender = '请选择性别';
      }
      this.setData({ errors });
      return Object.keys(errors).length === 0;
    },

    handleSave() {
      if (!this.validate()) {
        return;
      }
      const profile = {
        name: this.data.name.trim(),
        birthday: this.data.birthday,
        gender: this.data.gender === '男' ? 'male' : 'female',
        birthTime: this.data.birthTime
      };
      this.triggerEvent('save', { profile });
    },

    handleClose() {
      this.triggerEvent('close');
    }
  }
});
