// japanese/utils/tts.js
// Japanese TTS — thin wrapper around shared engine with multi-language voice map

var core = require('../../utils/tts');

var VOICE_MAP = {
  'ja-JP': 'ja-JP-NanamiNeural',
  'en-US': 'en-US-JennyNeural',
  'zh-CN': 'zh-CN-XiaoxiaoNeural',
  'ko-KR': 'ko-KR-SunHiNeural'
};

function getOpts(lang) {
  var langCode = lang || 'ja-JP';
  return {
    voiceName: VOICE_MAP[langCode] || 'ja-JP-NanamiNeural',
    outputFormat: 'audio-16khz-64kbitrate-mono-mp3',
    timeout: 30000
  };
}

module.exports = {
  speak: function(text, lang) {
    return core.speak(text, lang || 'ja-JP', getOpts(lang));
  },
  stop: core.stop,
  isPlaying: core.isPlaying,
  preLoad: core.preLoad,
  preLoadWords: function(wordList, lang) {
    return core.preLoadWords(wordList, lang || 'ja-JP', getOpts(lang));
  }
};
