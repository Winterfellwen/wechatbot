const TTS_API_URL = 'https://wechatbot-g6ez.onrender.com/api/tts';

let audioContext = null;
let currentAudio = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = wx.createInnerAudioContext();
  }
  return audioContext;
}

function speak(text, lang) {
  return new Promise((resolve, reject) => {
    if (!text || !text.trim()) {
      reject(new Error('Text is empty'));
      return;
    }

    const langCode = lang || 'de-DE';

    wx.request({
      url: TTS_API_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        text: text,
        lang: langCode
      },
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.audioUrl) {
          const audioUrl = res.data.audioUrl;
          const audio = getAudioContext();
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
          reject(new Error('TTS API error: ' + (res.data && res.data.error)));
        }
      },
      fail: function(err) {
        console.error('TTS request error:', err);
        reject(err);
      }
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

module.exports = {
  speak,
  stop,
  isPlaying
};