// TTS utility for WeChat Mini Program
const TTS_KEY_URL = 'https://wechatbot-g6ez.onrender.com/api/tts/key';
const TTS_API_BASE = 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1';

// Simple cache for recent TTS requests
const ttsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 20;

let audioContext = null;
let currentAudio = null;
let apiKey = null;
let keyLoaded = false;
let keyLoading = null;

// Voice mapping
const VOICE_MAP = {
  'ja-JP': 'ja-JP-NanamiNeural',
  'en-US': 'en-US-JennyNeural',
  'zh-CN': 'zh-CN-XiaoxiaoNeural',
  'ko-KR': 'ko-KR-SunHiNeural'
};

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
  
  keyLoading = new Promise((resolve, reject) => {
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
  return (lang || 'ja-JP') + ':' + text;
}

function getFromCache(text, lang) {
  const key = getCacheKey(text, lang);
  const cached = ttsCache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.audioUrl;
  }
  if (cached) {
    ttsCache.delete(key);
  }
  return null;
}

function saveToCache(text, lang, audioUrl) {
  const key = getCacheKey(text, lang);
  if (ttsCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = ttsCache.keys().next().value;
    ttsCache.delete(oldestKey);
  }
  ttsCache.set(key, {
    audioUrl: audioUrl,
    timestamp: Date.now()
  });
}

function speak(text, lang) {
  return new Promise((resolve, reject) => {
    if (!text || !text.trim()) {
      reject(new Error('Text is empty'));
      return;
    }
    
    // Check cache first
    const cachedAudioUrl = getFromCache(text, lang);
    if (cachedAudioUrl) {
      const audio = getAudioContext();
      if (currentAudio && currentAudio !== audio) {
        try { currentAudio.stop(); } catch(e) {}
      }
      currentAudio = audio;
      audio.src = cachedAudioUrl;
      audio.stopped = false;
      
      audio.play();
      
      audio.onEnded(function() {
        audio.stopped = true;
        resolve();
      });
      
      audio.onError(function(err) {
        audio.stopped = true;
        console.error('Audio play error:', err);
        reject(err);
      });
      return;
    }
    
    const langCode = lang || 'ja-JP';
    const voiceName = VOICE_MAP[langCode] || 'ja-JP-NanamiNeural';
    
    const ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' + langCode + '">\n' +
      '  <voice name="' + voiceName + '">\n' +
      '    ' + text + '\n' +
      '  </voice>\n' +
      '</speak>';
    
    initApiKey()
      .then(() => {
        wx.request({
          url: TTS_API_BASE,
          method: 'POST',
          timeout: 30000, // 30 second timeout for TTS (increased from 8s)
          header: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-64kbitrate-mono-mp3'
          },
          data: ssml,
          responseType: 'arraybuffer',
          success: function(res) {
            if (res.statusCode === 200) {
              const audioBuffer = res.data;
              const base64 = wx.arrayBufferToBase64(audioBuffer);
              const audioUrl = 'data:audio/mpeg;base64,' + base64;
              
              saveToCache(text, lang, audioUrl);
              
              const audio = getAudioContext();
              if (currentAudio && currentAudio !== audio) {
                try { currentAudio.stop(); } catch(e) {}
              }
              currentAudio = audio;
              audio.src = audioUrl;
              audio.stopped = false;
              
              audio.play();
              
              audio.onEnded(function() {
                audio.stopped = true;
                resolve();
              });
              
              audio.onError(function(err) {
                audio.stopped = true;
                console.error('Audio play error:', err);
                reject(err);
              });
            } else {
              reject(new Error('TTS API error: ' + res.statusCode));
            }
          },
          fail: function(err) {
            console.error('TTS request error:', err);
            reject(err);
          }
        });
      })
      .catch(reject);
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

module.exports = {
  speak: speak,
  stop: stop,
  isPlaying: isPlaying,
  preLoad: function() { 
    initApiKey().catch(function() {});
    getAudioContext();
  },
  preLoadWords: function(wordList, lang) {
    if (!wordList || wordList.length === 0) return Promise.resolve();
    var texts = [];
    for (var i = 0; i < wordList.length; i++) {
      if (wordList[i].word) texts.push(wordList[i].word);
      if (wordList[i].example && texts.indexOf(wordList[i].example) < 0) texts.push(wordList[i].example);
    }
    return initApiKey().then(function() {
      return new Promise(function(resolve, reject) {
        var results = [];
        var count = 0;
        var processed = 0;
        
        function processNext(idx) {
          if (idx >= texts.length) {
            if (processed === texts.length) resolve(results);
            return;
          }
          var text = texts[idx];
          if (getFromCache(text, lang)) {
            processed++;
            if (processed === texts.length) resolve(results);
            processNext(idx + 1);
            return;
          }
          var langCode = lang || 'ja-JP';
          var voiceName = VOICE_MAP[langCode] || 'ja-JP-NanamiNeural';
          
          var ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' + langCode + '">\n' +
            '  <voice name="' + voiceName + '">\n' +
            '    ' + text + '\n' +
            '  </voice>\n' +
            '</speak>';
          
          wx.request({
            url: TTS_API_BASE,
            method: 'POST',
            timeout: 30000,
            header: {
              'Ocp-Apim-Subscription-Key': apiKey,
              'Content-Type': 'application/ssml+xml',
              'X-Microsoft-OutputFormat': 'audio-16khz-64kbitrate-mono-mp3'
            },
            data: ssml,
            responseType: 'arraybuffer',
            success: function(res) {
              if (res.statusCode === 200) {
                var audioBuffer = res.data;
                var base64 = wx.arrayBufferToBase64(audioBuffer);
                var audioUrl = 'data:audio/mpeg;base64,' + base64;
                saveToCache(text, lang, audioUrl);
                results.push({ text: text, url: audioUrl });
                processed++;
                if (processed >= texts.length) resolve(results);
              } else {
                processed++;
                if (processed >= texts.length) resolve(results);
              }
            },
            fail: function(err) {
              processed++;
              if (processed >= texts.length) resolve(results);
            }
          });
          
          setTimeout(function() { processNext(idx + 1); }, 100);
        }
        
        processNext(0);
      });
    });
  }
};
