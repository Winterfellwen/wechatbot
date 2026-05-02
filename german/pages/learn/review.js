const storage = require('../../utils/storage');
const algorithm = require('../../utils/algorithm');

Page({
  data: {
    questions: [],
    currentQuestion: 0,
    totalQuestions: 0,
    showAnswer: false,
    correct: 0,
    wrong: 0,
    isFinished: false,
    reviewWords: []
  },

  onLoad: function() {
    this.loadReviewWords();
  },

  loadReviewWords: function() {
    const reviewQueue = storage.getReviewQueue();
    
    if (reviewQueue.length === 0) {
      this.setData({
        isFinished: true,
        totalQuestions: 0
      });
      return;
    }
    
    const reviewWords = algorithm.shuffleArray(reviewQueue).slice(0, 8);
    const questions = this.generateQuestions(reviewWords);
    
    this.setData({
      questions: questions,
      totalQuestions: questions.length,
      reviewWords: reviewWords
    });
  },

  generateQuestions: function(words) {
    return words.map((word, index) => {
      const type = index % 2 === 0 ? 'choice' : 'spell';
      const question = {
        id: index + 1,
        type: type,
        word: word.word,
        translation: word.translation,
        phonetic: word.phonetic || '',
        wordData: word
      };
      
      if (type === 'choice') {
        const wrongOptions = algorithm.shuffleArray(this.getRandomVocab(word.word)).slice(0, 3);
        const options = algorithm.shuffleArray([word.translation, ...wrongOptions]);
        question.options = options;
        question.correct = options.indexOf(word.translation);
      } else {
        question.answer = word.word;
      }
      
      return question;
    });
  },

  getRandomVocab: function(excludeWord) {
    const allWords = storage.getWrongWords();
    return allWords.filter(w => w.word !== excludeWord).map(w => w.translation);
  },

  toggleAnswer: function() {
    this.setData({ showAnswer: !this.data.showAnswer });
  },

  markCorrect: function() {
    this.processAnswer(true);
  },

  markWrong: function() {
    this.processAnswer(false);
  },

  processAnswer: function(isCorrect) {
    const { currentQuestion, questions, correct, wrong, reviewWords } = this.data;
    const currentWord = reviewWords[currentQuestion];
    
    storage.updateReviewWord(currentWord, isCorrect);
    
    const newCorrect = isCorrect ? correct + 1 : correct;
    const newWrong = isCorrect ? wrong : wrong + 1;
    const nextQuestion = currentQuestion + 1;
    
    if (nextQuestion >= questions.length) {
      this.setData({
        correct: newCorrect,
        wrong: newWrong,
        isFinished: true
      });
    } else {
      this.setData({
        currentQuestion: nextQuestion,
        correct: newCorrect,
        wrong: newWrong,
        showAnswer: false
      });
    }
  },

  goToLearn: function() {
    wx.navigateBack();
  },

  restartReview: function() {
    this.setData({
      questions: [],
      currentQuestion: 0,
      totalQuestions: 0,
      showAnswer: false,
      correct: 0,
      wrong: 0,
      isFinished: false,
      reviewWords: []
    });
    this.loadReviewWords();
  }
});