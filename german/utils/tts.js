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
    const WechatSI = requirePlugin('WechatSI');
    
    if (!WechatSI) {
      console.warn('WechatSI plugin not available');
      reject(new Error('TTS插件未加载'));
      return;
    }

    let langCode = lang || 'de_DE';
    
    WechatSI.textToSpeech({
      text: text,
      lang: langCode,
      success: function(res) {
        if (res.filename) {
          const audio = getAudioContext();
          currentAudio = audio;
          audio.src = res.filename;
          audio.stopped = false;
          
          audio.play();
          
          audio.onEnded(function() {
            audio.stopped = true;
            resolve();
          });
          
          audio.onError(function(err) {
            audio.stopped = true;
            console.error('TTS play error:', err);
            reject(err);
          });
        } else {
          reject(new Error('TTS生成失败'));
        }
      },
      fail: function(err) {
        console.error('TTS error:', err);
        reject(err);
      }
    });
  });
}

function stop() {
  if (currentAudio) {
    currentAudio.stop();
    currentAudio.stopped = true;
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