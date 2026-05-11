/**
 * Canvas 图标绘制工具
 * 用于在小程序中动态绘制 UI 图标
 */

/**
 * 在 Canvas 上绘制扬声器图标并导出为临时图片路径
 * @param {Object} canvas - Canvas 2D 节点
 * @param {number} dpr - 设备像素比
 * @param {string} color - 图标主色
 * @param {string} bgColor - 背景圆颜色（可选，用于激活状态）
 * @param {number} size - 逻辑尺寸（px）
 * @returns {Promise<string>} 临时图片路径
 */
function drawSpeaker(canvas, dpr, color, bgColor, size) {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d');
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    // 绘制背景圆（激活状态）
    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 计算绘制参数（居中）
    const cx = size / 2;
    const cy = size / 2;
    const scale = size / 64; // 基准尺寸 64px

    ctx.save();
    ctx.translate(cx - 8 * scale, cy);
    ctx.scale(scale, scale);

    // 扬声器后部（圆角矩形）
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.lineTo(-6, -7);
    ctx.quadraticCurveTo(-4, -7, -4, -9);
    ctx.lineTo(-4, -13);
    ctx.quadraticCurveTo(-4, -15, -2, -15);
    ctx.lineTo(4, -15);
    ctx.quadraticCurveTo(6, -15, 6, -13);
    ctx.lineTo(6, -9);
    ctx.quadraticCurveTo(6, -7, 8, -7);
    ctx.lineTo(12, -7);
    ctx.quadraticCurveTo(14, -7, 14, -5);
    ctx.lineTo(14, 5);
    ctx.quadraticCurveTo(14, 7, 12, 7);
    ctx.lineTo(8, 7);
    ctx.quadraticCurveTo(6, 7, 6, 9);
    ctx.lineTo(6, 13);
    ctx.quadraticCurveTo(6, 15, 4, 15);
    ctx.lineTo(-2, 15);
    ctx.quadraticCurveTo(-4, 15, -4, 13);
    ctx.lineTo(-4, 9);
    ctx.quadraticCurveTo(-4, 7, -6, 7);
    ctx.lineTo(-12, 7);
    ctx.quadraticCurveTo(-14, 7, -14, 5);
    ctx.lineTo(-14, -5);
    ctx.quadraticCurveTo(-14, -7, -12, -7);
    ctx.closePath();
    ctx.fill();

    // 声波弧线 1
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(18, 0, 7, -0.7, 0.7);
    ctx.stroke();

    // 声波弧线 2
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(18, 0, 13, -0.55, 0.55);
    ctx.stroke();

    ctx.restore();

    // 导出图片
    wx.canvasToTempFilePath({
      canvas: canvas,
      destWidth: size * dpr,
      destHeight: size * dpr,
      success: function(res) {
        resolve(res.tempFilePath);
      },
      fail: function(err) {
        reject(err);
      }
    });
  });
}

/**
 * 初始化扬声器图标（普通 + 激活状态）
 * @param {string} canvasId - Canvas 元素 id
 * {Object} pageInstance - 页面实例（this）
 * @returns {Promise<Object>} { speakerNormal, speakerActive }
 */
function initSpeakerIcons(canvasId, pageInstance) {
  return new Promise((resolve, reject) => {
    const query = wx.createSelectorQuery().in(pageInstance);
    query.select('#' + canvasId).fields({ node: true, size: true }).exec(function(res) {
      if (!res[0] || !res[0].node) {
        reject(new Error('Canvas node not found: ' + canvasId));
        return;
      }
      const canvas = res[0].node;
      const dpr = wx.getSystemInfoSync().pixelRatio;

      // 绘制普通状态
      drawSpeaker(canvas, dpr, '#2563EB', null, 128).then(function(normalPath) {
        // 绘制激活状态
        return drawSpeaker(canvas, dpr, '#FFFFFF', '#2563EB', 128).then(function(activePath) {
          resolve({
            speakerNormal: normalPath,
            speakerActive: activePath
          });
        });
      }).catch(reject);
    });
  });
}

module.exports = {
  drawSpeaker: drawSpeaker,
  initSpeakerIcons: initSpeakerIcons
};
