// ai-order/utils/image-upload.js
// Cloud storage image upload utility for merchant dishes
// Uploads to: ai-order/{merchantId}/dish-{id}.jpg
// Auto-compresses to <200KB

var MAX_SIZE = 200 * 1024; // 200KB

/**
 * Compress an image using Canvas
 * @returns {Promise<string>} compressed temp file path
 */
function compressImage(tempPath, quality) {
  return new Promise(function (resolve, reject) {
    wx.getImageInfo({
      src: tempPath,
      success: function (info) {
        var width = info.width;
        var height = info.height;
        var maxSide = 800;
        if (width > maxSide || height > maxSide) {
          var ratio = maxSide / Math.max(width, height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        var ctx = wx.createCanvasContext('upload-compress-canvas');
        // Use offscreen canvas approach via wx.createOffscreenCanvas (2.16.0+)
        // Fallback: scale down and use lower quality
        var canvasId = 'upload-compress-canvas';
        ctx.drawImage(tempPath, 0, 0, width, height);
        ctx.draw(false, function () {
          wx.canvasToTempFilePath({
            canvasId: canvasId,
            x: 0, y: 0, width: width, height: height,
            destWidth: width, destHeight: height,
            quality: quality || 0.6,
            fileType: 'jpg',
            success: function (res) { resolve(res.tempFilePath); },
            fail: reject
          });
        });
      },
      fail: reject
    });
  });
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  return new Promise(function (resolve, reject) {
    wx.getFileSystemManager().getFileInfo({
      filePath: filePath,
      success: function (res) { resolve(res.size); },
      fail: reject
    });
  });
}

/**
 * Choose and upload a dish image
 * @param {string} merchantId
 * @param {string} dishId
 * @returns {Promise<{fileID: string, cloudPath: string}>}
 */
function uploadDishImage(merchantId, dishId) {
  return new Promise(function (resolve, reject) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'], // Auto compress by WeChat
      sourceType: ['album', 'camera'],
      success: function (chooseRes) {
        var tempPath = chooseRes.tempFilePaths[0];
        uploadFromTempPath(tempPath, merchantId, dishId).then(resolve).catch(reject);
      },
      fail: reject
    });
  });
}

/**
 * Upload from an existing temp file path (no file picker)
 */
function uploadFromTempPath(tempPath, merchantId, dishId) {
  return new Promise(function (resolve, reject) {
    getFileSize(tempPath).then(function (size) {
      if (size <= MAX_SIZE) {
        return tempPath;
      }
      // Compress with decreasing quality until under 200KB
      function tryCompress(q) {
        return compressImage(tempPath, q).then(function (compressedPath) {
          return getFileSize(compressedPath).then(function (newSize) {
            if (newSize <= MAX_SIZE || q <= 0.2) return compressedPath;
            return tryCompress(q - 0.15);
          });
        });
      }
      return tryCompress(0.75);
    }).then(function (finalPath) {
      var cloudPath = 'ai-order/' + merchantId + '/dish-' + dishId + '.jpg';
      return wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: finalPath
      });
    }).then(function (uploadRes) {
      resolve({
        fileID: uploadRes.fileID,
        cloudPath: 'ai-order/' + merchantId + '/dish-' + dishId + '.jpg'
      });
    }).catch(reject);
  });
}

/**
 * Delete all dish images for a merchant
 * @param {string} merchantId
 * @param {string[]} dishIds
 * @returns {Promise}
 */
function deleteMerchantImages(merchantId, dishIds) {
  var fileList = dishIds.map(function (id) {
    return 'cloud://' + 'ai-order/' + merchantId + '/dish-' + id + '.jpg';
  });
  return wx.cloud.deleteFile({ fileList: fileList });
}

module.exports = {
  uploadDishImage: uploadDishImage,
  uploadFromTempPath: uploadFromTempPath,
  deleteMerchantImages: deleteMerchantImages,
  MAX_SIZE: MAX_SIZE
};