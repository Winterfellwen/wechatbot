// utils/tts.js
// Unified TTS engine — shared by German & Japanese subpackages

var CONFIG = require('./config');

var TTS_KEY_URL = CONFIG.SERVER + '/api/tts/key';
var TTS_API_BASE = 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1';

var ttsCache = new Map();
var CACHE_TTL = 5 * 60 * 1000;
var MAX_CACHE_SIZE = 30;
var audioContext = null;
var currentAudio = null;
var apiKey = null;
var keyLoaded = false;
var keyLoading = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = wx.createInnerAudioContext();
    audioContext.volume = 1;
  }
  return audioContext;
}

function initApiKey() {
  if (apiKey && keyLoaded) return Promise.resolve();
  if (keyLoading) return keyLoading;
  keyLoading = new Promise(function(resolve, reject) {
    wx.request({
      url: TTS_KEY_URL,
      timeout: 5000,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.key) {
          apiKey = res.data.key;
          keyLoaded = true;
          keyLoading = null;
          resolve();
        } else {
          keyLoading = null;
          reject(new Error('Failed to get API key'));
        }
      },
      fail: function(err) {
        keyLoading = null;
        reject(err);
      }
    });
  });
  return keyLoading;
}

function getCacheKey(text, lang) {
  return (lang || 'de-DE') + ':' + text;
}

function getFromCache(text, lang) {
  var key = getCacheKey(text, lang);
  var cached = ttsCache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.audioUrl;
  }
  if (cached) ttsCache.delete(key);
  return null;
}

function saveToCache(text, lang, audioUrl) {
  var key = getCacheKey(text, lang);
  if (ttsCache.size >= MAX_CACHE_SIZE) {
    var oldestKey = ttsCache.keys().next().value;
    ttsCache.delete(oldestKey);
  }
  ttsCache.set(key, { audioUrl: audioUrl, timestamp: Date.now() });
}

function fetchTTS(text, lang, opts) {
  return new Promise(function(resolve, reject) {
    var langCode = lang || 'de-DE';
    var voiceName = (opts && opts.voiceName) || 'de-DE-ConradNeural';
    var ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' + langCode + '">\n' +
      '  <voice name="' + voiceName + '">\n' +
      '    ' + text + '\n' +
      '  </voice>\n' +
      '</speak>';
    wx.request({
      url: TTS_API_BASE,
      method: 'POST',
      timeout: (opts && opts.timeout) || 15000,
      header: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': (opts && opts.outputFormat) || 'audio-16khz-128kbitrate-mono-mp3'
      },
      data: ssml,
      responseType: 'arraybuffer',
      success: function(res) {
        if (res.statusCode === 200) {
          var base64 = wx.arrayBufferToBase64(res.data);
          var audioUrl = 'data:audio/mpeg;base64,' + base64;
          saveToCache(text, lang, audioUrl);
          resolve(audioUrl);
        } else {
          reject(new Error('TTS API error: ' + res.statusCode));
        }
      },
      fail: reject
    });
  });
}

function playAudio(audioUrl, onEnded) {
  return new Promise(function(resolve, reject) {
    var audio = getAudioContext();
    if (currentAudio && currentAudio !== audio) {
      try { currentAudio.stop(); } catch(e) {}
    }
    currentAudio = audio;
    audio.src = audioUrl;
    audio.stopped = false;
    audio.play();
    audio.onEnded(function() {
      audio.stopped = true;
      if (onEnded) onEnded();
      resolve();
    });
    audio.onError(function(err) {
      audio.stopped = true;
      if (onEnded) onEnded();
      reject(err);
    });
  });
}

function speak(text, lang, opts) {
  return new Promise(function(resolve, reject) {
    if (!text || !text.trim()) {
      reject(new Error('Text is empty'));
      return;
    }
    var cached = getFromCache(text, lang);
    if (cached) {
      playAudio(cached, opts && opts.onEnded).then(resolve).catch(reject);
      return;
    }
    initApiKey()
      .then(function() { return fetchTTS(text, lang, opts); })
      .then(function(audioUrl) { return playAudio(audioUrl, opts && opts.onEnded); })
      .then(resolve)
      .catch(function(err) {
        if (opts && opts.onEnded) opts.onEnded();
        reject(err);
      });
  });
}

function stop() {
  if (currentAudio) {
    try { currentAudio.stop(); currentAudio.stopped = true; }
    catch (e) { console.error('Stop audio error:', e); }
  }
}

function isPlaying() {
  return currentAudio && !currentAudio.stopped;
}

function preLoad() {
  initApiKey().catch(function(){});
  getAudioContext();
}

function preLoadWords(wordList, lang, opts) {
  if (!wordList || wordList.length === 0) return Promise.resolve();
  var texts = [];
  for (var i = 0; i < wordList.length; i++) {
    if (wordList[i].word) texts.push(wordList[i].word);
    if (wordList[i].example && texts.indexOf(wordList[i].example) < 0) texts.push(wordList[i].example);
  }
  return initApiKey().then(function() {
    return new Promise(function(resolve) {
      var results = [];
      var processed = 0;
      var total = texts.length;
      function processNext(idx) {
        if (idx >= texts.length) {
          if (processed >= total) resolve(results);
          return;
        }
        var text = texts[idx];
        if (getFromCache(text, lang)) {
          processed++;
          if (processed >= total) resolve(results);
          processNext(idx + 1);
          return;
        }
        fetchTTS(text, lang, opts).then(function(audioUrl) {
          results.push({ text: text, url: audioUrl });
          processed++;
          if (processed >= total) resolve(results);
        }).catch(function() {
          processed++;
          if (processed >= total) resolve(results);
        });
        setTimeout(function() { processNext(idx + 1); }, 50);
      }
      processNext(0);
    });
  }).catch(function() {});
}

module.exports = {
  speak: speak,
  stop: stop,
  isPlaying: isPlaying,
  preLoad: preLoad,
  preLoadWords: preLoadWords,
  initApiKey: initApiKey,
  getAudioContext: getAudioContext
};
