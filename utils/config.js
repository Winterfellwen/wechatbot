// utils/config.js
// Front-end unified configuration — single source of truth

var CONFIG = {
  SERVER: 'https://wechatbot-g6ez.onrender.com',
  STORAGE_KEYS: {
    TOKEN: 'auth_token',
    USER: 'auth_user',
    TASK_RECORDS: 'pdf_task_records'
  },
  SUBSCRIBE_MESSAGE: {
    TEMPLATE_ID: 'YOUR_TEMPLATE_ID_HERE'  // 需要在微信公众平台配置
  }
};

module.exports = CONFIG;
