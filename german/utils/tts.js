// german/utils/tts.js
// German TTS — thin wrapper around shared engine

var core = require('../../utils/tts');

var GERMAN_VOICE = {
  voiceName: 'de-DE-ConradNeural',
  outputFormat: 'audio-16khz-128kbitrate-mono-mp3',
  timeout: 15000
};

module.exports = {
  speak: function(text, lang, callback) {
    return core.speak(text, lang || 'de-DE', {
      voiceName: GERMAN_VOICE.voiceName,
      outputFormat: GERMAN_VOICE.outputFormat,
      timeout: GERMAN_VOICE.timeout,
      onEnded: callback
    });
  },
  stop: core.stop,
  isPlaying: core.isPlaying,
  preLoad: core.preLoad,
  preLoadWords: function(wordList, lang) {
    return core.preLoadWords(wordList, lang || 'de-DE', GERMAN_VOICE);
  }
};
