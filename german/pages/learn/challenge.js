const storage = require('../../utils/storage');
const tts = require('../../utils/tts');
const algorithm = require('../../utils/algorithm');
const a1Vocab = require('../../data/a1/vocab.js');
const a2Vocab = require('../../data/a2/vocab.js');
const b1Vocab = require('../../data/b1/vocab.js');
const b2Vocab = require('../../data/b2/vocab.js');

Page({
  data: {
    level: 'a1',
    levelIndex: 1,
    currentQuestion: 0,
    questions: [],
    totalQuestions: 8,
    score: 0,
    wrongAnswers: [],
    isPlaying: false,
    showFeedback: false,
    lastAnswerCorrect: false,
    currentOrder: [],
    selectedPairs: [],
    userAnswer: ''
  },

  onLoad: function(options) {
    const level = options.level || 'a1';
    const levelIndex = parseInt(options.index) || 1;
    
    this.setData({
      level: level,
      levelIndex: levelIndex
    });
    
    this.loadVocabData(level);
  },

  loadVocabData: function(level) {
    let vocabData;
    switch(level) {
      case 'a1':
        vocabData = a1Vocab;
        break;
      case 'a2':
        vocabData = a2Vocab;
        break;
      case 'b1':
        vocabData = b1Vocab;
        break;
      case 'b2':
        vocabData = b2Vocab;
        break;
      default:
        vocabData = a1Vocab;
    }
    
    this.generateQuestions(vocabData);
  },

  generateQuestions: function(vocabData) {
    const shuffledVocab = algorithm.shuffleArray(vocabData);
    const questions = [];
    const types = ['choice', 'listen', 'choice', 'listen', 'spell', 'order', 'choice', 'match'];
    
    for (let i = 0; i < 8; i++) {
      const word = shuffledVocab[i];
      const type = types[i];
      const q = this.createQuestion(word, type, i + 1, vocabData);
      questions.push(q);
    }
    
    this.setData({ questions: questions });
  },

  createQuestion: function(word, type, id, vocabData) {
    const question = {
      id: id,
      type: type,
      word: word.word,
      translation: word.translation,
      phonetic: word.phonetic || '',
      example: word.example || ''
    };
    
    const shuffledVocab = algorithm.shuffleArray(vocabData.filter(v => v.word !== word.word));
    
    if (type === 'choice') {
      question.question = `"${word.translation}" 用德语怎么说？`;
      const wrongOptions = shuffledVocab.slice(0, 3).map(v => v.word);
      const options = algorithm.shuffleArray([word.word, ...wrongOptions]);
      question.options = options;
      question.correct = options.indexOf(word.word);
    } else if (type === 'listen') {
      question.question = '听录音，选择正确的中文含义';
      const wrongOptions = shuffledVocab.slice(0, 3).map(v => v.translation);
      const options = algorithm.shuffleArray([word.translation, ...wrongOptions]);
      question.options = options;
      question.correct = options.indexOf(word.translation);
    } else if (type === 'spell') {
      question.question = '听录音，写出德语单词';
      question.answer = word.word;
    } else if (type === 'order') {
      question.question = '将词语组成正确句子';
      const words = ['Ich', 'heiße', word.word];
      question.words = algorithm.shuffleArray(words);
      question.answer = 'Ich heiße ' + word.word;
    } else if (type === 'match') {
      question.question = '连线德语单词和中文含义';
      const pairs = [
        { left: word.word, right: word.translation, correct: false },
        { left: shuffledVocab[0].word, right: shuffledVocab[0].translation, correct: false },
        { left: shuffledVocab[1].word, right: shuffledVocab[1].translation, correct: false },
        { left: shuffledVocab[2].word, right: shuffledVocab[2].translation, correct: false }
      ];
      question.pairs = algorithm.shuffleArray(pairs);
    }
    
    return question;
  },

  playAudio: function() {
    const q = this.data.questions[this.data.currentQuestion];
    if (q && q.word) {
      this.setData({ isPlaying: true });
      tts.speak(q.word).then(() => {
        this.setData({ isPlaying: false });
      }).catch(err => {
        this.setData({ isPlaying: false });
        wx.showToast({ title: '播放失败', icon: 'none' });
      });
    }
  },

  selectAnswer: function(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const q = this.data.questions[this.data.currentQuestion];
    const isCorrect = index === q.correct;
    this.handleAnswer(isCorrect, index);
  },

  submitSpellAnswer: function(e) {
    const answer = e.detail.value.trim();
    const q = this.data.questions[this.data.currentQuestion];
    const isCorrect = answer.toLowerCase() === q.answer.toLowerCase();
    this.handleAnswer(isCorrect, -1, answer);
  },

  selectOrderWord: function(e) {
    const word = e.currentTarget.dataset.word;
    const currentOrder = this.data.currentOrder;
    currentOrder.push(word);
    this.setData({ currentOrder: currentOrder });
  },

  clearOrder: function() {
    this.setData({ currentOrder: [] });
  },

  submitOrderAnswer: function() {
    const orderStr = this.data.currentOrder.join(' ');
    const q = this.data.questions[this.data.currentQuestion];
    const isCorrect = orderStr === q.answer;
    this.handleAnswer(isCorrect, -1, orderStr);
  },

  selectPair: function(e) {
    const idx = parseInt(e.currentTarget.dataset.index);
    const q = this.data.questions[this.data.currentQuestion];
    const selectedPairs = this.data.selectedPairs;
    
    if (selectedPairs.includes(idx)) {
      this.setData({ selectedPairs: selectedPairs.filter(i => i !== idx) });
    } else {
      if (selectedPairs.length < 2) {
        selectedPairs.push(idx);
        this.setData({ selectedPairs: selectedPairs });
      }
    }
  },

  checkPairAnswer: function() {
    const q = this.data.questions[this.data.currentQuestion];
    const selectedPairs = this.data.selectedPairs;
    
    if (selectedPairs.length !== 2) {
      wx.showToast({ title: '请选择两个进行配对', icon: 'none' });
      return;
    }
    
    const left = q.pairs[selectedPairs[0]];
    const right = q.pairs[selectedPairs[1]];
    
    const isCorrect = left.right === right.left;
    this.handleAnswer(isCorrect, -1, `${left.left}-${right.right}`);
  },

  handleAnswer: function(isCorrect, selectedIndex, userAnswer) {
    const { currentQuestion, score, wrongAnswers, questions } = this.data;
    let newScore = score;
    let newWrongAnswers = wrongAnswers;
    const currentQ = questions[currentQuestion];
    
    if (isCorrect) {
      newScore++;
    } else {
      newWrongAnswers.push({
        question: currentQ,
        userAnswer: userAnswer || '选择错误',
        correctAnswer: currentQ.correct !== undefined ? 
          (currentQ.options ? currentQ.options[currentQ.correct] : currentQ.answer) : currentQ.answer
      });
      
      storage.addWrongWord({
        word: currentQ.word,
        translation: currentQ.translation,
        phonetic: currentQ.phonetic,
        level: this.data.level
      });
    }
    
    this.setData({
      score: newScore,
      wrongAnswers: newWrongAnswers,
      showFeedback: true,
      lastAnswerCorrect: isCorrect
    });
    
    wx.showToast({
      title: isCorrect ? '正确！' : '错误',
      icon: isCorrect ? 'success' : 'none',
      duration: 800
    });
    
    setTimeout(() => {
      this.nextQuestion();
    }, 1000);
  },

  nextQuestion: function() {
    const next = this.data.currentQuestion + 1;
    this.setData({
      showFeedback: false,
      currentQuestion: next,
      currentOrder: [],
      selectedPairs: [],
      userAnswer: ''
    });
    
    if (next >= this.data.totalQuestions) {
      this.finishChallenge();
    }
  },

  finishChallenge: function() {
    const { score, totalQuestions, wrongAnswers, level, levelIndex } = this.data;
    const passed = score >= totalQuestions * 0.6;
    
    if (passed) {
      const progress = storage.getUserProgress();
      if (!progress.completedLevels) progress.completedLevels = [];
      
      const levelKey = `${level}_${levelIndex}`;
      if (!progress.completedLevels.includes(levelKey)) {
        progress.completedLevels.push(levelKey);
      }
      
      if (levelIndex >= progress.currentLevelIndex) {
        progress.currentLevelIndex = levelIndex + 1;
      }
      
      progress.totalPoints = (progress.totalPoints || 0) + score;
      progress.lastStudyDate = Date.now();
      storage.setUserProgress(progress);
    }
    
    wx.redirectTo({
      url: `/german/pages/learn/result?score=${score}&total=${totalQuestions}&passed=${passed}&wrong=${encodeURIComponent(JSON.stringify(wrongAnswers))}`
    });
  },

  onUnload: function() {
    tts.stop();
  }
});