const grammarDB = require('../../data/grammar.js');

Page({
  data: {
    currentLevel: 'N5',
    levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
    grammarList: []
  },

  onLoad() {
    this.loadGrammar();
  },

  switchLevel(e) {
    const level = e.currentTarget.dataset.level;
    this.setData({ currentLevel: level });
    this.loadGrammar();
  },

  loadGrammar() {
    const list = grammarDB.filter(g => g.level === this.data.currentLevel);
    this.setData({ grammarList: list });
  }
});