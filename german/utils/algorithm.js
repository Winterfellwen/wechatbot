const REVIEW_INTERVALS = [1, 3, 7, 30];

function getNextReviewTime(wrongCount) {
  const idx = Math.min((wrongCount || 1) - 1, REVIEW_INTERVALS.length - 1);
  const interval = REVIEW_INTERVALS[Math.max(0, idx)];
  return Date.now() + interval * 24 * 60 * 60 * 1000;
}

function shouldReview(word) {
  return word.nextReview && Date.now() >= word.nextReview;
}

function getIntervalDescription(wrongCount) {
  const intervals = {
    0: '已掌握',
    1: '1天后复习',
    2: '3天后复习',
    3: '7天后复习',
    4: '30天后复习'
  };
  return intervals[wrongCount] || '30天后复习';
}

function calculateMasteryLevel(word) {
  if (!word) return 0;
  
  const correct = word.correctCount || 0;
  const wrong = word.wrongCount || 0;
  const total = correct + wrong;
  
  if (total === 0) return 0;
  
  const rate = correct / total;
  
  if (rate >= 0.9 && wrong === 0) return 5;
  if (rate >= 0.8) return 4;
  if (rate >= 0.6) return 3;
  if (rate >= 0.4) return 2;
  return 1;
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function generateQuestionsFromVocab(vocabList, count, types) {
  const questions = [];
  const shuffledVocab = shuffleArray(vocabList);
  
  for (let i = 0; i < Math.min(count, shuffledVocab.length); i++) {
    const word = shuffledVocab[i];
    const type = types[i % types.length];
    
    const question = {
      id: i + 1,
      type: type,
      word: word.word,
      translation: word.translation,
      phonetic: word.phonetic || '',
      example: word.example || ''
    };
    
    if (type === 'choice') {
      question.question = `"${word.translation}" 用德语怎么说？`;
      const wrongOptions = shuffleArray(shuffledVocab.filter(v => v.word !== word.word))
        .slice(0, 3)
        .map(v => v.word);
      const options = shuffleArray([word.word, ...wrongOptions]);
      question.options = options;
      question.correct = options.indexOf(word.word);
    } else if (type === 'listen') {
      question.question = '听录音，选择正确的中文含义';
      const wrongOptions = shuffleArray(shuffledVocab.filter(v => v.word !== word.word))
        .slice(0, 3)
        .map(v => v.translation);
      const options = shuffleArray([word.translation, ...wrongOptions]);
      question.options = options;
      question.correct = options.indexOf(word.translation);
    } else if (type === 'spell') {
      question.question = '听录音，写出德语单词';
      question.answer = word.word;
    }
    
    questions.push(question);
  }
  
  return questions;
}

module.exports = {
  getNextReviewTime,
  shouldReview,
  getIntervalDescription,
  calculateMasteryLevel,
  shuffleArray,
  generateQuestionsFromVocab
};