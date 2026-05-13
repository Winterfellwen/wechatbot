// utils/retry.js
// 通用重试模块 — 为文件操作提供 5 分钟后台重试机制

function createRetrier(page, options) {
  options = options || {};
  var TOTAL_TIMEOUT = options.totalTimeout || 300000;
  var startTime = Date.now();
  var active = true;

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
    wx.showToast({ title: '操作超时，请稍后重试', icon: 'none', duration: 3000 });
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
          updateProgress('重试中 第' + attempt + '次' + (reason ? ' - ' + reason : ''));
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
