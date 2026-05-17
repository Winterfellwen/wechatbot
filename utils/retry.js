// utils/retry.js
// 通用重试模块 — 可配置的后台重试机制（默认 1 分钟，最多 3 次重试）

function createRetrier(page, options) {
  options = options || {};
  var TOTAL_TIMEOUT = options.totalTimeout || 60000;
  var MAX_RETRIES = options.maxRetries || 3;
  var startTime = Date.now();
  var active = true;
  var retryCount = 0;

  function elapsed() {
    return Math.round((Date.now() - startTime) / 1000);
  }

  function setData(obj) {
    if (page && page.setData) page.setData(obj);
  }

  function updateProgress(text) {
    if (!active) return;
    setData({ progressText: text + ' (' + elapsed() + 's)' });
  }

  function expireCheck() {
    if (elapsed() * 1000 < TOTAL_TIMEOUT) return false;
    active = false;
    var update = { progressText: '' };
    if (page.data.converting !== undefined) update.converting = false;
    if (page.data.processing !== undefined) update.processing = false;
    update.currentJobId = null;
    setData(update);
    wx.showToast({ title: '操作超时，请稍后重试或在记录中查看进度', icon: 'none', duration: 3000 });
    return true;
  }

  function fail(msg) {
    if (!active) return;
    active = false;
    var update = { progressText: msg };
    if (page.data.converting !== undefined) update.converting = false;
    if (page.data.processing !== undefined) update.processing = false;
    update.currentJobId = null;
    setData(update);
    wx.showToast({ title: msg, icon: 'none', duration: 3000 });
  }

  function operate(fn) {
    if (!active) return;
    var attempt = 0;

    function run() {
      if (!active) return;
      if (expireCheck()) return;
      attempt++;

      fn(
        function retry(reason) {
          if (!active) return;
          if (expireCheck()) return;
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            fail('重试次数已达上限，请检查网络后重试');
            return;
          }
          updateProgress('网络异常，正在重试 (' + attempt + '/' + MAX_RETRIES + ')' + (reason ? ' - ' + reason : ''));
          setTimeout(run, 2000);
        },
        function stop(msg) {
          fail(msg);
        },
        { attempt: attempt, elapsed: elapsed }
      );
    }

    run();
  }

  return {
    operate: operate,
    fail: fail,
    updateProgress: updateProgress,
    elapsed: elapsed,
    cancel: function() { active = false; }
  };
}

module.exports = { createRetrier: createRetrier };
