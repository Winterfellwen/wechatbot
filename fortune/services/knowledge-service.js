// fortune/services/knowledge-service.js
// 知识匹配服务：读取本地JSON知识块，按key匹配，高效返回≤800 tokens

var chineseIndex = require('../data/knowledge/chinese-index');
var westernIndex = require('../data/knowledge/western-index');
var tiaohouData = require('../data/knowledge/structured/tiaohou');
var allChunks = null;

var INDICES = {
  chinese: chineseIndex,
  western: westernIndex
};

function ensureChunks() {
  if (!allChunks) {
    try {
      allChunks = {};
      var data = require('../data/knowledge/chunks/all');
      for (var i = 0; i < data.length; i++) {
        allChunks[data[i].id] = data[i];
      }
    } catch (e) {
      allChunks = {};
    }
  }
  return allChunks;
}

function estimateTokens(text) {
  if (!text) return 0;
  var count = 0;
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    if (code > 127) {
      count += 1;
    } else {
      count += 0.25;
    }
  }
  return Math.ceil(count);
}

function match(category, keys) {
  try {
    if (!category || !keys || keys.length === 0) {
      return { chunks: [], totalTokens: 0, error: false };
    }

    var index = INDICES[category];
    if (!index) {
      return { chunks: [], totalTokens: 0, error: false };
    }

    ensureChunks();

    var chunkScores = {};
    var chunkKeys = {};

    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var ids = index[key];
      if (!ids) continue;

      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (!allChunks[id]) continue;

        if (!chunkScores[id]) {
          chunkScores[id] = 0;
          chunkKeys[id] = {};
        }
        chunkScores[id]++;
        chunkKeys[id][key] = true;
      }
    }

    var scoredIds = Object.keys(chunkScores);
    scoredIds.sort(function(a, b) {
      return chunkScores[b] - chunkScores[a];
    });

    var selected = [];
    var totalTokens = 0;
    var MAX_TOKENS = 800;

    for (var s = 0; s < scoredIds.length; s++) {
      var id = scoredIds[s];
      var chunk = allChunks[id];
      var tokens = estimateTokens(chunk.text || '');

      if (totalTokens + tokens <= MAX_TOKENS) {
        selected.push(chunk);
        totalTokens += tokens;
      } else {
        break;
      }
    }

    return {
      chunks: selected,
      totalTokens: totalTokens,
      error: false
    };
  } catch (e) {
    return { chunks: [], totalTokens: 0, error: true };
  }
}

function getTiaohou(dayMaster, monthZhi) {
  try {
    var key = dayMaster + '_' + monthZhi;
    return tiaohouData[key] || '';
  } catch (e) {
    return '';
  }
}

module.exports = {
  match: match,
  getTiaohou: getTiaohou
};
