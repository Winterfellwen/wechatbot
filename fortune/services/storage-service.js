const STORAGE_KEYS = {
  PROFILE: 'fortune_profile',
  HISTORY: 'fortune_history',
  CHAT: 'fortune_chat_history',
  DAILY_CACHE: 'fortune_daily_cache',
  READING_CACHE: 'fortune_reading_cache'
};

function formatDate(timestamp) {
  if (!timestamp) return '';
  var d = new Date(timestamp);
  var year = d.getFullYear();
  var month = (d.getMonth() + 1).toString().padStart(2, '0');
  var day = d.getDate().toString().padStart(2, '0');
  var hour = d.getHours().toString().padStart(2, '0');
  var minute = d.getMinutes().toString().padStart(2, '0');
  return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
}

function getProfile() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.PROFILE) || null;
  } catch (e) {
    console.error('Failed to get profile:', e);
    return null;
  }
}

function saveProfile(profile) {
  try {
    wx.setStorageSync(STORAGE_KEYS.PROFILE, profile);
    return true;
  } catch (e) {
    console.error('Failed to save profile:', e);
    return false;
  }
}

function getHistory() {
  try {
    const history = wx.getStorageSync(STORAGE_KEYS.HISTORY);
    return Array.isArray(history) ? history : [];
  } catch (e) {
    console.error('Failed to get history:', e);
    return [];
  }
}

function addHistory(record) {
  try {
    const history = getHistory();
    var now = Date.now();
    const newRecord = {
      id: 'r_' + now,
      category: record.category,
      profile: record.profile,
      results: record.results || [],
      createdAt: now,
      createdAtFormatted: formatDate(now)
    };
    history.unshift(newRecord);
    if (history.length > 50) {
      history.pop();
    }
    wx.setStorageSync(STORAGE_KEYS.HISTORY, history);
    return newRecord;
  } catch (e) {
    console.error('Failed to add history:', e);
    return null;
  }
}

function getHistoryById(id) {
  const history = getHistory();
  return history.find(item => item.id === id) || null;
}

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

function clearHistory() {
  try {
    wx.setStorageSync(STORAGE_KEYS.HISTORY, []);
    return true;
  } catch (e) {
    console.error('Failed to clear history:', e);
    return false;
  }
}

function getChatHistory(readingId) {
  try {
    const allChats = wx.getStorageSync(STORAGE_KEYS.CHAT) || [];
    const chat = allChats.find(c => c.readingId === readingId);
    return chat ? chat.messages : [];
  } catch (e) {
    console.error('Failed to get chat history:', e);
    return [];
  }
}

function saveChatHistory(readingId, messages) {
  try {
    let allChats = wx.getStorageSync(STORAGE_KEYS.CHAT) || [];
    const existingIndex = allChats.findIndex(c => c.readingId === readingId);

    if (existingIndex >= 0) {
      allChats[existingIndex].messages = messages;
    } else {
      allChats.push({ readingId, messages });
    }

    if (allChats.length > 20) {
      allChats = allChats.slice(-20);
    }

    wx.setStorageSync(STORAGE_KEYS.CHAT, allChats);
    return true;
  } catch (e) {
    console.error('Failed to save chat history:', e);
    return false;
  }
}

function getDailyCache() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.DAILY_CACHE) || null;
  } catch (e) {
    return null;
  }
}

function saveDailyCache(cache) {
  try {
    wx.setStorageSync(STORAGE_KEYS.DAILY_CACHE, cache);
    return true;
  } catch (e) {
    return false;
  }
}

// 测算缓存：按 category + 日期（YYYY-MM-DD）缓存当天结果，当天不重算
function getReadingCache(category) {
  try {
    var all = wx.getStorageSync(STORAGE_KEYS.READING_CACHE) || {};
    var today = new Date().toISOString().slice(0, 10);
    var key = category + '_' + today;
    return all[key] || null;
  } catch (e) {
    return null;
  }
}

function saveReadingCache(category, data) {
  try {
    var all = wx.getStorageSync(STORAGE_KEYS.READING_CACHE) || {};
    var today = new Date().toISOString().slice(0, 10);
    var key = category + '_' + today;
    // 保留最近 10 条缓存（5 个 category × 2 天）
    var keys = Object.keys(all);
    if (keys.length >= 10) {
      delete all[keys[0]];
    }
    all[key] = {
      ...data,
      category,
      date: today,
      cachedAt: Date.now()
    };
    wx.setStorageSync(STORAGE_KEYS.READING_CACHE, all);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  formatDate,
  getProfile,
  saveProfile,
  getHistory,
  addHistory,
  getHistoryById,
  deleteHistory,
  clearHistory,
  getChatHistory,
  saveChatHistory,
  getDailyCache,
  saveDailyCache,
  getReadingCache,
  saveReadingCache
};
