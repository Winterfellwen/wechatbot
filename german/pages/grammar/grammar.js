const a1Grammar = require('../../data/a1/grammar.js');
const a2Grammar = require('../../data/a2/grammar.js');
const b1Grammar = require('../../data/b1/grammar.js');
const b2Grammar = require('../../data/b2/grammar.js');

const grammarData = {
  'A1': a1Grammar,
  'A2': a2Grammar,
  'B1': b1Grammar,
  'B2': b2Grammar
};

Page({
  data: {
    levels: ['A1', 'A2', 'B1', 'B2'],
    currentLevel: 'A1',
    grammarList: []
  },

  onLoad: function() {
    this.loadGrammar('A1');
  },

  switchLevel: function(e) {
    const level = e.currentTarget.dataset.level;
    this.setData({ currentLevel: level });
    this.loadGrammar(level);
  },

  loadGrammar: function(level) {
    const data = grammarData[level] || [];
    const list = data.map(function(item, idx) {
      return {
        id: level + '-' + idx,
        title: item.title || item.pattern || '语法点',
        category: level,
        rule: item.content || item.explanation || item.structure || '详细信息加载中...',
        example: item.example || item.content || '示例加载中...'
      };
    });
    this.setData({ grammarList: list });
  },

  goBack: function() {
    wx.navigateBack();
  }
});