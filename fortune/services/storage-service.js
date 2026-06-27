/**
 * Local storage service for fortune-telling
 * Handles user info, history, and caching using wx storage API
 */

const STORAGE_KEYS = {
  USER_INFO: 'fortune_user_info',
  HISTORY: 'fortune_history',
  CACHE: 'fortune_cache'
};

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get user info from storage
 * @returns {Object|null} User info object or null if not found
 */
function getUserInfo() {
  try {
    const info = wx.getStorageSync(STORAGE_KEYS.USER_INFO);
    return info || null;
  } catch (e) {
    console.error('Failed to get user info:', e);
    return null;
  }
}

/**
 * Save user info to storage
 * @param {Object} userInfo - User info to save
 * @returns {boolean} True if successful
 */
function saveUserInfo(userInfo) {
  try {
    wx.setStorageSync(STORAGE_KEYS.USER_INFO, userInfo);
    return true;
  } catch (e) {
    console.error('Failed to save user info:', e);
    return false;
  }
}

/**
 * Get fortune history
 * @returns {Array} Array of history records
 */
function getHistory() {
  try {
    const history = wx.getStorageSync(STORAGE_KEYS.HISTORY);
    return Array.isArray(history) ? history : [];
  } catch (e) {
    console.error('Failed to get history:', e);
    return [];
  }
}

/**
 * Add history record
 * @param {Object} record - History record to add
 * @returns {boolean} True if successful
 */
function addHistory(record) {
  try {
    const history = getHistory();
    const newRecord = {
      id: Date.now().toString(),
      createTime: new Date().toISOString(),
      ...record
    };
    history.unshift(newRecord);
    wx.setStorageSync(STORAGE_KEYS.HISTORY, history);
    return true;
  } catch (e) {
    console.error('Failed to add history:', e);
    return false;
  }
}

/**
 * Delete history record by id
 * @param {string} id - Record id to delete
 * @returns {boolean} True if successful
 */
function deleteHistory(id) {
  try {
    const history = getHistory();
    const filtered = history.filter(item => item.id !== id);
    wx.setStorageSync(STORAGE_KEYS.HISTORY, filtered);
    return true;
  } catch (e) {
    console.error('Failed to delete history:', e);
    return false;
  }
}

/**
 * Clear all history
 * @returns {boolean} True if successful
 */
function clearHistory() {
  try {
    wx.setStorageSync(STORAGE_KEYS.HISTORY, []);
    return true;
  } catch (e) {
    console.error('Failed to clear history:', e);
    return false;
  }
}

/**
 * Get cached result by key
 * @param {string} key - Cache key
 * @returns {*} Cached result or null if expired/not found
 */
function getCachedResult(key) {
  try {
    const cache = wx.getStorageSync(STORAGE_KEYS.CACHE) || {};
    const item = cache[key];
    
    if (!item) return null;
    
    // Check if expired
    if (Date.now() - item.timestamp > CACHE_EXPIRY) {
      delete cache[key];
      wx.setStorageSync(STORAGE_KEYS.CACHE, cache);
      return null;
    }
    
    return item.result;
  } catch (e) {
    console.error('Failed to get cached result:', e);
    return null;
  }
}

/**
 * Save cached result
 * @param {string} key - Cache key
 * @param {*} result - Result to cache
 * @returns {boolean} True if successful
 */
function saveCachedResult(key, result) {
  try {
    const cache = wx.getStorageSync(STORAGE_KEYS.CACHE) || {};
    cache[key] = {
      result: result,
      timestamp: Date.now()
    };
    wx.setStorageSync(STORAGE_KEYS.CACHE, cache);
    return true;
  } catch (e) {
    console.error('Failed to save cached result:', e);
    return false;
  }
}

module.exports = {
  getUserInfo,
  saveUserInfo,
  getHistory,
  addHistory,
  deleteHistory,
  clearHistory,
  getCachedResult,
  saveCachedResult
};
