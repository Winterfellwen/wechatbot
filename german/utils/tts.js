const TTS_KEY_URL = 'https://wechatbot-g6ez.onrender.com/api/tts/key';
const TTS_API_BASE = 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1';

// 缓存
const ttsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟
const MAX_CACHE_SIZE = 30;

let audioContext = null;
let currentAudio = null;
let apiKey = null;
let keyLoaded = false;
let keyLoading = null;

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
  if (cached) {
    ttsCache.delete(key);
  }
  return null;
}

function saveToCache(text, lang, audioUrl) {
  var key = getCacheKey(text, lang);
  if (ttsCache.size >= MAX_CACHE_SIZE) {
    var oldestKey = ttsCache.keys().next().value;
    ttsCache.delete(oldestKey);
  }
  ttsCache.set(key, {
    audioUrl: audioUrl,
    timestamp: Date.now()
  });
}

function fetchTTS(text, lang) {
  return new Promise(function(resolve, reject) {
    var langCode = lang || 'de-DE';
    var voiceName = 'de-DE-ConradNeural';

    var ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' + langCode + '">\n' +
      '  <voice name="' + voiceName + '">\n' +
      '    ' + text + '\n' +
      '  </voice>\n' +
      '</speak>';

    wx.request({
      url: TTS_API_BASE,
      method: 'POST',
      timeout: 15000,
      header: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
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
      fail: function(err) {
        reject(err);
      }
    });
  });
}

function speak(text, lang, callback) {
  return new Promise(function(resolve, reject) {
    if (!text || !text.trim()) {
      reject(new Error('Text is empty'));
      return;
    }

    // 优先使用缓存
    var cachedAudioUrl = getFromCache(text, lang);
    if (cachedAudioUrl) {
      var audio = getAudioContext();
      if (currentAudio && currentAudio !== audio) {
        try { currentAudio.stop(); } catch(e) {}
      }
      currentAudio = audio;
      audio.src = cachedAudioUrl;
      audio.stopped = false;
      audio.play();

      audio.onEnded(function() {
        audio.stopped = true;
        if (callback) callback();
        resolve();
      });

      audio.onError(function(err) {
        audio.stopped = true;
        if (callback) callback();
        reject(err);
      });
      return;
    }

    initApiKey()
      .then(function() {
        return fetchTTS(text, lang);
      })
      .then(function(audioUrl) {
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
          if (callback) callback();
          resolve();
        });

        audio.onError(function(err) {
          audio.stopped = true;
          if (callback) callback();
          reject(err);
        });
      })
      .catch(function(err) {
        if (callback) callback();
        reject(err);
      });
  });
}

function stop() {
  if (currentAudio) {
    try {
      currentAudio.stop();
      currentAudio.stopped = true;
    } catch (e) {
      console.error('Stop audio error:', e);
    }
  }
}

function isPlaying() {
  return currentAudio && !currentAudio.stopped;
}

/**
 * 预加载 API Key（页面加载时调用，避免首次播放延迟）
 */
function preLoad() {
  initApiKey().catch(function() {});
  getAudioContext();
}

/**
 * 批量预加载单词音频
 * @param {Array} wordList - 单词列表 [{word, example}, ...]
 * @param {string} lang - 语言代码
 */
function preLoadWords(wordList, lang) {
  if (!wordList || wordList.length === 0) return;
  return initApiKey().then(function() {
    var texts = [];
    for (var i = 0; i < wordList.length; i++) {
      if (wordList[i].word) texts.push(wordList[i].word);
      if (wordList[i].example && texts.indexOf(wordList[i].example) < 0) texts.push(wordList[i].example);
    }

    var processed = 0;
    function processNext(idx) {
      if (idx >= texts.length) return;
      var text = texts[idx];
      if (getFromCache(text, lang)) {
        processed++;
        processNext(idx + 1);
        return;
      }
      fetchTTS(text, lang).then(function() {
        processed++;
      }).catch(function() {
        processed++;
      });
      // 间隔 50ms 避免并发过多
      setTimeout(function() { processNext(idx + 1); }, 50);
    }
    processNext(0);
  }).catch(function() {});
}

module.exports = {
  speak: speak,
  stop: stop,
  isPlaying: isPlaying,
  preLoad: preLoad,
  preLoadWords: preLoadWords
};
