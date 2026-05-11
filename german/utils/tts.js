const TTS_KEY_URL = 'https://wechatbot-g6ez.onrender.com/api/tts/key';
const TTS_API_BASE = 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1';

let audioContext = null;
let currentAudio = null;
let apiKey = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = wx.createInnerAudioContext();
  }
  return audioContext;
}

function initApiKey() {
  return new Promise((resolve, reject) => {
    if (apiKey) {
      resolve();
      return;
    }

    wx.request({
      url: TTS_KEY_URL,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.key) {
          apiKey = res.data.key;
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
}

function speak(text, lang, callback) {
  return new Promise((resolve, reject) => {
    if (!text || !text.trim()) {
      reject(new Error('Text is empty'));
      return;
    }

    const langCode = lang || 'de-DE';
    const voiceName = langCode === 'de-DE' ? 'de-DE-ConradNeural' : 'de-DE-ConradNeural';

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
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
          },
          data: ssml,
          responseType: 'arraybuffer',
          success: function(res) {
            if (res.statusCode === 200) {
              const audioBuffer = res.data;
              const base64 = wx.arrayBufferToBase64(audioBuffer);
              const audioUrl = 'data:audio/mpeg;base64,' + base64;

              const audio = getAudioContext();
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
                console.error('Audio play error:', err);
                if (callback) callback();
                reject(err);
              });
            } else {
              if (callback) callback();
              reject(new Error('TTS API error: ' + res.statusCode));
            }
          },
          fail: function(err) {
            console.error('TTS request error:', err);
            if (callback) callback();
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
  isPlaying
};