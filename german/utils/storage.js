const STORAGE_KEYS = {
  USER_PROGRESS: 'german_user_progress',
  WRONG_WORDS: 'german_wrong_words',
  WORD_BOOK: 'german_word_book',
  REVIEW_QUEUE: 'german_review_queue'
};

function getUserProgress() {
  return wx.getStorageSync(STORAGE_KEYS.USER_PROGRESS) || {
    currentLevel: 'a1',
    currentLevelIndex: 1,
    completedLevels: [],
    totalPoints: 0,
    streakDays: 0,
    lastStudyDate: null
  };
}

function setUserProgress(data) {
  wx.setStorageSync(STORAGE_KEYS.USER_PROGRESS, data);
}

function getWrongWords() {
  return wx.getStorageSync(STORAGE_KEYS.WRONG_WORDS) || [];
}

function addWrongWord(word) {
  const list = getWrongWords();
  const exists = list.find(w => w.word === word.word);
  if (!exists) {
    list.push({
      word: word.word,
      translation: word.translation,
      phonetic: word.phonetic,
      level: word.level || 'a1',
      wrongCount: 1,
      correctCount: 0,
      lastWrong: Date.now(),
      nextReview: Date.now() + 24 * 60 * 60 * 1000,
      createTime: Date.now()
    });
  } else {
    exists.wrongCount += 1;
    exists.lastWrong = Date.now();
  }
  wx.setStorageSync(STORAGE_KEYS.WRONG_WORDS, list);
}

function getWordBook() {
  return wx.getStorageSync(STORAGE_KEYS.WORD_BOOK) || [];
}

function addToWordBook(word) {
  const list = getWordBook();
  const exists = list.find(w => w.word === word.word);
  if (!exists) {
    list.push({
      ...word,
      addTime: Date.now(),
      reviewCount: 0
    });
    wx.setStorageSync(STORAGE_KEYS.WORD_BOOK, list);
  }
}

function removeFromWordBook(word) {
  const list = getWordBook();
  const newList = list.filter(w => w.word !== word);
  wx.setStorageSync(STORAGE_KEYS.WORD_BOOK, newList);
}

function getReviewQueue() {
  const wrongWords = getWrongWords();
  const now = Date.now();
  return wrongWords.filter(w => w.nextReview && now >= w.nextReview);
}

function updateReviewWord(word, isCorrect) {
  const list = getWrongWords();
  const idx = list.findIndex(w => w.word === word.word);
  if (idx !== -1) {
    if (isCorrect) {
      list[idx].correctCount = (list[idx].correctCount || 0) + 1;
      list[idx].wrongCount = Math.max(0, (list[idx].wrongCount || 1) - 1);
    } else {
      list[idx].wrongCount = (list[idx].wrongCount || 0) + 1;
    }
    list[idx].lastReview = Date.now();
    const intervals = [1, 3, 7, 30];
    const interval = intervals[Math.min(list[idx].wrongCount - 1 || 0, intervals.length - 1)];
    list[idx].nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;
    wx.setStorageSync(STORAGE_KEYS.WRONG_WORDS, list);
  }
}

function clearAllData() {
  wx.removeStorageSync(STORAGE_KEYS.USER_PROGRESS);
  wx.removeStorageSync(STORAGE_KEYS.WRONG_WORDS);
  wx.removeStorageSync(STORAGE_KEYS.WORD_BOOK);
  wx.removeStorageSync(STORAGE_KEYS.REVIEW_QUEUE);
}

module.exports = {
  STORAGE_KEYS,
  getUserProgress,
  setUserProgress,
  getWrongWords,
  addWrongWord,
  getWordBook,
  addToWordBook,
  removeFromWordBook,
  getReviewQueue,
  updateReviewWord,
  clearAllData
};