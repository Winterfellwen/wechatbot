const validationUtils = require('../../utils/validation-utils');
const dateUtils = require('../../utils/date-utils');
const zodiacUtils = require('../../utils/zodiac-utils');
const storageService = require('../../services/storage-service');

Page({
  data: {
    type: '',
    typeName: '',
    birthDate: '',
    birthTime: '',
    gender: '',
    constellation: '',
    question: '',
    showTimePicker: false,
    showGenderPicker: false,
    showConstellationPicker: false,
    errors: {}
  },

  onLoad(options) {
    const type = options.type || 'constellation';
    const typeName = this.getTypeName(type);
    
    this.setData({ type, typeName });
    
    this.loadUserInfo();
  },

  getTypeName(type) {
    const nameMap = {
      yijing: '易经卦象',
      bazi: '八字命理',
      ziwei: '紫微斗数',
      constellation: '星座分析',
      tarot: '塔罗占卜',
      astrology: '占星术'
    };
    return nameMap[type] || '运势分析';
  },

  loadUserInfo() {
    const userInfo = storageService.getUserInfo();
    if (userInfo) {
      this.setData({
        birthDate: userInfo.birthDate || '',
        birthTime: userInfo.birthTime || '',
        gender: userInfo.gender || '',
        constellation: userInfo.constellation || ''
      });
    }
  },

  handleDateChange(e) {
    this.setData({ birthDate: e.detail.value });
    this.clearError('birthDate');
  },

  handleTimeChange(e) {
    const times = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
    this.setData({ birthTime: times[e.detail.value] });
    this.clearError('birthTime');
  },

  handleGenderChange(e) {
    const genderValues = ['male', 'female'];
    this.setData({ 
      gender: genderValues[e.detail.value],
      showGenderPicker: false
    });
    this.clearError('gender');
  },

  handleConstellationChange(e) {
    const constellations = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
    this.setData({ 
      constellation: constellations[e.detail.value],
      showConstellationPicker: false
    });
    this.clearError('constellation');
  },

  handleQuestionInput(e) {
    this.setData({ question: e.detail.value });
    this.clearError('question');
  },

  clearError(field) {
    const errors = { ...this.data.errors };
    delete errors[field];
    this.setData({ errors });
  },

  validate() {
    const errors = {};
    
    if (['bazi', 'ziwei', 'astrology'].includes(this.data.type)) {
      const dateValidation = validationUtils.validateDate(this.data.birthDate);
      if (!dateValidation.valid) {
        errors.birthDate = dateValidation.message;
      }
    }
    
    if (['bazi', 'ziwei'].includes(this.data.type)) {
      const timeValidation = validationUtils.validate时辰(this.data.birthTime);
      if (!timeValidation.valid) {
        errors.birthTime = timeValidation.message;
      }
    }
    
    if (['bazi', 'ziwei'].includes(this.data.type)) {
      const genderValidation = validationUtils.validateGender(this.data.gender);
      if (!genderValidation.valid) {
        errors.gender = genderValidation.message;
      }
    }
    
    if (['constellation', 'tarot'].includes(this.data.type)) {
      const constellationValidation = validationUtils.validate星座(this.data.constellation);
      if (!constellationValidation.valid) {
        errors.constellation = constellationValidation.message;
      }
    }
    
    const questionValidation = validationUtils.validateQuestion(this.data.question);
    if (!questionValidation.valid) {
      errors.question = questionValidation.message;
    }
    
    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  handleSubmit() {
    if (!this.validate()) {
      return;
    }
    
    const userInfo = {
      birthDate: this.data.birthDate,
      birthTime: this.data.birthTime,
      gender: this.data.gender,
      constellation: this.data.constellation
    };
    storageService.saveUserInfo(userInfo);
    
    var params = 'type=' + encodeURIComponent(this.data.type) +
      '&birthDate=' + encodeURIComponent(this.data.birthDate) +
      '&birthTime=' + encodeURIComponent(this.data.birthTime) +
      '&gender=' + encodeURIComponent(this.data.gender) +
      '&constellation=' + encodeURIComponent(this.data.constellation) +
      '&question=' + encodeURIComponent(this.data.question);
    
    wx.navigateTo({
      url: '/fortune/pages/result/result?' + params
    });
  }
});
