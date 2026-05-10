/**
 * 统一配置文件 - 集中管理所有后端和外部服务配置
 * 用户只需修改此文件或使用环境变量即可完成所有配置
 */

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
  },

  // 数据库配置
  database: {
    url: process.env.DATABASE_URL || null,
  },

  // 微信配置
  wechat: {
    appId: 'wx2510f82943d7741e', // 可改为 process.env.WECHAT_APP_ID
    appSecret: process.env.WECHAT_APP_SECRET || null,
  },

  // PDF 转换服务配置
  pdfService: {
    url: process.env.PDF_SERVICE_URL || 'https://pdf-converter-idfi.onrender.com',
    keepaliveInterval: 14 * 60 * 1000, // 14 minutes
  },

  // OpenRouter API 配置
  openrouter: {
    apiKey: process.env.OPENROUTER_KEY || null,
    model: 'nvidia/nemotron-nano-12b-v2-vl:free',
    apiUrl: 'https://openrouter.ai/api/v1',
    maxTokens: 500,
  },

  // Azure TTS 配置
  azureTts: {
    apiKey: process.env.TTS_API_AZURE || null,
    region: process.env.AZURE_TTS_REGION || 'eastasia',
    voiceMap: {
      'ja-JP': 'ja-JP-NanamiNeural',
      'en-US': 'en-US-JennyNeural',
      'zh-CN': 'zh-CN-XiaoxiaoNeural',
      'ko-KR': 'ko-KR-SunHiNeural'
    }
  },

  // 文件存储配置
  storage: {
    uploadDir: '/tmp/uploads',
    serveDir: '/tmp/serve',
  },

  // 微信小程序配置的 API 基础 URL（前端使用）
  frontend: {
    apiBaseUrl: process.env.API_BASE_URL || 'https://wechatbot-g6ez.onrender.com',
    ttsKeyUrl: process.env.TTS_KEY_URL || 'https://wechatbot-g6ez.onrender.com/api/tts/key',
  }
};

module.exports = config;
