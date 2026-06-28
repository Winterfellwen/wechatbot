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

console.log('\ncalcBazi:');
var baziResult = calc.calcBazi({ name: '张三', birthday: '1990-03-15', gender: 'male', birthTime: '子时' });
if (baziResult.error || baziResult.needTime) {
  console.log('  ✗ calcBazi should return valid result');
  failed++;
} else {
  console.log('  ✓ calcBazi returns result without error');
  passed++;
  if (baziResult.yearPillar && baziResult.yearPillar.length === 2) {
    console.log('  ✓ yearPillar is 2-char GanZhi: ' + baziResult.yearPillar);
    passed++;
  } else {
    console.log('  ✗ yearPillar invalid: ' + baziResult.yearPillar);
    failed++;
  }
  if (baziResult.dayMaster && baziResult.dayMaster.length >= 2) {
    console.log('  ✓ dayMaster: ' + baziResult.dayMaster);
    passed++;
  } else {
    console.log('  ✗ dayMaster invalid');
    failed++;
  }
  if (baziResult.summary && baziResult.summary.length > 10) {
    console.log('  ✓ summary generated');
    passed++;
  } else {
    console.log('  ✗ summary missing');
    failed++;
  }
}

var baziNoTime = calc.calcBazi({ name: '张三', birthday: '1990-03-15', gender: 'male' });
if (baziNoTime.needTime === true) {
  console.log('  ✓ calcBazi returns needTime when birthTime missing');
  passed++;
} else {
  console.log('  ✗ calcBazi should return needTime when birthTime missing');
  failed++;
}

console.log('\ncalcZiwei:');
var ziweiResult = calc.calcZiwei({ name: '张三', birthday: '1990-03-15', gender: 'male', birthTime: '子时' });
if (ziweiResult.error || ziweiResult.needTime) {
  console.log('  ✗ calcZiwei should return valid result, got: ' + JSON.stringify(ziweiResult));
  failed++;
} else {
  console.log('  ✓ calcZiwei returns result without error');
  passed++;
  if (ziweiResult.summary && ziweiResult.summary.length > 0) {
    console.log('  ✓ summary: ' + ziweiResult.summary);
    passed++;
  } else {
    console.log('  ✗ summary missing');
    failed++;
  }
}

var ziweiNoTime = calc.calcZiwei({ name: '张三', birthday: '1990-03-15', gender: 'male' });
if (ziweiNoTime.needTime === true) {
  console.log('  ✓ calcZiwei returns needTime when birthTime missing');
  passed++;
} else {
  console.log('  ✗ calcZiwei should return needTime when birthTime missing');
  failed++;
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
