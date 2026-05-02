const TTS_KEY_URL = 'https://wechatbot-g6ez.onrender.com/api/tts/key';
const TTS_API_BASE = 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1';

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
  if (apiKey) return Promise.resolve();
  if (keyLoading) return keyLoading;

  keyLoading = new Promise((resolve, reject) => {
    wx.request({
      url: TTS_KEY_URL,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.key) {
          apiKey = res.data.key;
          keyLoaded = true;
          resolve();
        } else {
          reject(new Error('Failed to get API key'));
        }
      },
      fail: function(err) {
        reject(err);
      }
    });
  });
  return keyLoading;
}

function speak(text, lang) {
  return new Promise((resolve, reject) => {
    if (!text || !text.trim()) {
      reject(new Error('Text is empty'));
      return;
    }

    const langCode = lang || 'ja-JP';
    const voiceName = langCode === 'ja-JP' ? 'ja-JP-NanamiNeural' : 'ja-JP-NanamiNeural';

    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${langCode}'>
      <voice name='${voiceName}'>
        ${text}
      </voice>
    </speak>`;

    initApiKey()
      .then(() => {
        wx.request({
          url: TTS_API_BASE,
          method: 'POST',
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
  speak,
  stop,
  isPlaying,
  preLoad: function() { initApiKey(); }
};