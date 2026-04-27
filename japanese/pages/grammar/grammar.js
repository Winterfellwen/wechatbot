var grammarDB = require('../../data/grammar.js');

Page({
  data: {
    currentLevel: 'N5',
    levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
    grammarList: []
  },

  onLoad: function() {
    this.loadGrammar();
  },

  switchLevel: function(e) {
    var level = e.currentTarget.dataset.level;
    this.setData({ currentLevel: level });
    this.loadGrammar();
  },

  loadGrammar: function() {
    var currentLevel = this.data.currentLevel;
    var list = [];
    var i;
    for (i = 0; i < grammarDB.length; i++) {
      if (grammarDB[i].level === currentLevel) {
        list = list.concat([grammarDB[i]]);
      }
    }
    this.setData({ grammarList: list });
  },

  goBack: function() {
    wx.navigateBack();
  }
});
