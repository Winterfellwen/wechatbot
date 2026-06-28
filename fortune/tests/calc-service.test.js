// fortune/tests/calc-service.test.js
// Node 环境运行: node fortune/tests/calc-service.test.js

var calc = require('../services/calc-service');
var passed = 0;
var failed = 0;

function assert(name, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log('  ✓ ' + name);
    passed++;
  } else {
    console.log('  ✗ ' + name);
    console.log('    expected: ' + JSON.stringify(expected));
    console.log('    actual:   ' + JSON.stringify(actual));
    failed++;
  }
}

console.log('\nparseBirthTime:');
assert('子时 → 0', calc.parseBirthTime('子时'), 0);
assert('丑时 → 2', calc.parseBirthTime('丑时'), 2);
assert('亥时 → 22', calc.parseBirthTime('亥时'), 22);
assert('null → null', calc.parseBirthTime(null), null);
assert('空字符串 → null', calc.parseBirthTime(''), null);
assert('无效值 → null', calc.parseBirthTime('无效'), null);

console.log('\nparseBirthday:');
assert('1990-03-15', calc.parseBirthday('1990-03-15'), { year: 1990, month: 3, day: 15 });
assert('2000-12-01', calc.parseBirthday('2000-12-01'), { year: 2000, month: 12, day: 1 });

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
