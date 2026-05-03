const wordsN5 = require('./words_n5.js');
const wordsN4 = require('./words_n4.js');
const wordsN3 = require('./words_n3.js');
const wordsN2 = require('./words_n2.js');
const wordsN1 = require('./words_n1.js');

const allWords = [...wordsN5, ...wordsN4, ...wordsN3, ...wordsN2, ...wordsN1];

module.exports = {
  all: allWords,
  byLesson(lesson) {
    return allWords.filter(w => w.lesson === lesson);
  },
  byLevel(level) {
    return allWords.filter(w => w.level === level);
  },
  n5: wordsN5,
  n4: wordsN4,
  n3: wordsN3,
  n2: wordsN2,
  n1: wordsN1
};
