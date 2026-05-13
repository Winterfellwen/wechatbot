const automator = require('miniprogram-automator');
const fs = require('fs');
const path = require('path');

const AUTO_PORT = 9420;

// ============== CONFIG ==============
const PAGES = [
  { path: 'pages/index/index', name: '首页', tab: true },
  { path: 'pages/user/user', name: '个人中心', tab: true },
  { path: 'german/pages/learn/learn', name: '德语-闯关路径' },
  { path: 'german/pages/course/course', name: '德语-课程中心' },
  { path: 'german/pages/lesson/lesson', name: '德语-课程详情' },
  { path: 'german/pages/learn/challenge?level=a1&index=1', name: '德语-挑战' },
  { path: 'german/pages/learn/review', name: '德语-复习' },
  { path: 'german/pages/learn/result?score=5&total=8&passed=true&wrong=[]', name: '德语-结果' },
  { path: 'german/pages/wordbook/wordbook', name: '德语-生词本' },
  { path: 'german/pages/grammar/grammar', name: '德语-语法' },
  { path: 'german/pages/textbook/textbook', name: '德语-课本' },
  { path: 'german/pages/leaderboard/leaderboard', name: '德语-排行榜' },
  { path: 'japanese/pages/learn/learn', name: '日语-闯关路径' },
  { path: 'japanese/pages/course/course', name: '日语-课程中心' },
  { path: 'japanese/pages/lesson/lesson', name: '日语-课程详情' },
  { path: 'japanese/pages/wordbook/wordbook', name: '日语-生词本', search: true },
  { path: 'japanese/pages/grammar/grammar', name: '日语-语法' },
  { path: 'japanese/pages/grammar/grammar33', name: '日语-语法33' },
  { path: 'japanese/pages/textbook/textbook', name: '日语-课本' },
  { path: 'japanese/pages/leaderboard/leaderboard', name: '日语-排行榜' },
  { path: 'word/pages/index/index', name: '作文本', search: true },
  { path: 'word/pages/editor/editor', name: '作文编辑器' },
  { path: 'pdf/pages/index/index', name: 'PDF工具' },
  { path: 'pdf/pages/convert/convert', name: 'PDF转换' },
  { path: 'pdf/pages/edit/edit', name: 'PDF编辑' },
  { path: 'smart-teacher/pages/chat/chat', name: 'AI老师' },
];

const ELEMENT_CHECKS = {
  'pages/index/index': ['.container', '.entry-grid', '.entry-card', '.teacher-card', '.bottom-nav'],
  'pages/user/user': ['.login-section', '.profile-section', '.action-card', '.action-item', '.login-btn'],
  'german/pages/learn/learn': ['.container', '.level-bar', '.path-scroll', '.node-wrap', '.bottom-nav'],
  'german/pages/course/course': ['.level-selector', '.unit-list', '.vocab-card', '.bottom-nav'],
  'german/pages/lesson/lesson': ['.container', '.section', '.vocab-list', '.grammar-list', '.quiz-section'],
  'german/pages/learn/challenge': ['.container', '.progress-bar', '.question-box', '.options', '.option-btn'],
  'german/pages/learn/review': ['.container', '.card', '.answer-section', '.actions'],
  'german/pages/learn/result': ['.container', '.result-card', '.wrong-review', '.actions'],
  'german/pages/wordbook/wordbook': ['.container', '.word-list', '.word-item', '.review-mode', '.bottom-nav'],
  'german/pages/grammar/grammar': ['.container', '.level-tabs', '.grammar-card', '.card-header'],
  'german/pages/textbook/textbook': ['.container', '.book-list', '.book-card', '.lesson-list'],
  'german/pages/leaderboard/leaderboard': ['.container', '.personal-card', '.tabs', '.rank-list'],
  'japanese/pages/learn/learn': ['.container', '.level-bar', '.path-scroll', '.node-wrap', '.bottom-nav'],
  'japanese/pages/course/course': ['.container', '.hub-grid', '.hub-card', '.bottom-nav'],
  'japanese/pages/lesson/lesson': ['.container', '.study-word-card', '.quiz-container', '.options-list'],
  'japanese/pages/wordbook/wordbook': ['.container', '.search-bar', '.word-list', '.word-card'],
  'japanese/pages/grammar/grammar': ['.container', '.level-tabs', '.grammar-list', '.grammar-card'],
  'japanese/pages/grammar/grammar33': ['.container'],
  'japanese/pages/textbook/textbook': ['.container', '.book-list', '.book-card', '.lesson-list'],
  'japanese/pages/leaderboard/leaderboard': ['.container', '.personal-card', '.tabs', '.rank-list', '.bottom-nav'],
  'word/pages/index/index': ['.container', '.search-bar', '.doc-list', '.doc-card', '.new-btn'],
  'word/pages/editor/editor': ['.editor-page', '.toolbar', '.tool-btn', '.editor'],
  'pdf/pages/index/index': ['.container', '.upload-btn', '.target-list', '.convert-btn'],
  'pdf/pages/convert/convert': ['.container', '.back-btn', '.file-display', '.target-card', '.convert-btn'],
  'pdf/pages/edit/edit': ['.container', '.back-btn', '.op-list', '.op-card', '.do-btn'],
  'smart-teacher/pages/chat/chat': ['.chat-container', '.msg-list', '.input-bar', '.send-btn', '.quick-tag'],
};

const BUTTON_NAV_TESTS = [
  { page: 'pages/index/index', selector: '.entry-card', desc: '功能入口卡片' },
  { page: 'german/pages/learn/learn', selector: '.nav-item', desc: '导航到底部课程' },
  { page: 'german/pages/lesson/lesson', selector: '.start-quiz-btn', desc: '开始测验' },
  { page: 'german/pages/learn/review', selector: '.action-btn.wrong', desc: '标记错误' },
  { page: 'german/pages/learn/result', selector: '.action-btn', desc: '结果页操作按钮' },
  { page: 'german/pages/course/course', selector: '.unit-item', desc: '选择单元' },
  { page: 'german/pages/grammar/grammar', selector: '.tab', desc: '切换级别标签' },
  { page: 'german/pages/leaderboard/leaderboard', selector: '.tab', desc: '切换排行榜标签' },
  { page: 'japanese/pages/course/course', selector: '.hub-card', desc: '功能卡片' },
  { page: 'japanese/pages/lesson/lesson', selector: '.option-btn', desc: '选择题选项' },
  { page: 'japanese/pages/leaderboard/leaderboard', selector: '.tab', desc: '切换标签' },
  { page: 'pdf/pages/index/index', selector: '.upload-btn', desc: '上传文件' },
  { page: 'pdf/pages/edit/edit', selector: '.op-card', desc: '选择操作' },
  { page: 'smart-teacher/pages/chat/chat', selector: '.send-btn', desc: '发送消息' },
  { page: 'smart-teacher/pages/chat/chat', selector: '.quick-tag', desc: '快捷提问' },
  { page: 'word/pages/index/index', selector: '.new-btn', desc: '新建文档' },
  { page: 'word/pages/editor/editor', selector: '.tool-btn', desc: '工具栏按钮' },
  { page: 'word/pages/editor/editor', selector: '.save-btn-top', desc: '保存文档' },
  { page: 'pages/user/user', selector: '.login-btn', desc: '微信登录' },
];

const FORM_TESTS = [
  { page: 'smart-teacher/pages/chat/chat', selector: '.msg-input', value: '你好老师', desc: '聊天输入框' },
  { page: 'japanese/pages/lesson/lesson', selector: '.fill-input', value: '回答', desc: '填空题输入' },
  { page: 'german/pages/learn/challenge', selector: '.spell-input', value: 'test', desc: '拼写输入' },
];

const DATA_CHECKS = [
  { page: 'word/pages/index/index', field: 'searchKey', type: 'string' },
  { page: 'japanese/pages/wordbook/wordbook', field: 'searchKey', type: 'string' },
  { page: 'german/pages/learn/challenge', field: 'questions', type: 'array' },
  { page: 'german/pages/learn/result', field: 'score', type: 'number' },
];

const SCROLL_TESTS = [
  { page: 'german/pages/learn/learn', selector: '.path-scroll', desc: '闯关路径滚动' },
  { page: 'german/pages/lesson/lesson', selector: '.body-scroll', desc: '课程内容滚动' },
  { page: 'german/pages/grammar/grammar', selector: '.grammar-scroll', desc: '语法列表滚动' },
  { page: 'japanese/pages/learn/learn', selector: '.path-scroll', desc: '日语闯关滚动' },
];

// ============== UTILITIES ==============
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label || '操作'}超时 (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function formatTime() { return new Date().toISOString().replace('T', ' ').substring(0, 19); }

// ============== REPORTING ==============
const report = {
  modules: {}, console: { errors: [], warnings: [], others: [] }, exceptions: [],
  add(module, status, msg) {
    if (!this.modules[module]) this.modules[module] = { passed: 0, failed: 0, skipped: 0, details: [] };
    this.modules[module].details.push({ status, msg, time: formatTime() });
    this.modules[module][status === '✓' ? 'passed' : status === '✗' ? 'failed' : 'skipped']++;
  }
};

async function navToPage(miniProgram, cfg) {
  const label = `[页面] ${cfg.name} (${cfg.path})`;
  process.stdout.write(`${label}... `);
  try {
    if (cfg.tab) await withTimeout(miniProgram.switchTab('/' + cfg.path), 15000, 'switchTab');
    else await withTimeout(miniProgram.redirectTo('/' + cfg.path), 15000, 'redirectTo');
    await sleep(2500);
    const cp = await withTimeout(miniProgram.currentPage(), 8000, 'currentPage');
    const route = cp ? cp.path || 'unknown' : 'unknown';
    process.stdout.write(`✓ ${route}\n`);
    report.add('pageNav', '✓', `${cfg.name} → ${route}`);
    return cp;
  } catch (err) {
    process.stdout.write(`✗ ${err.message}\n`);
    report.add('pageNav', '✗', `${cfg.name}: ${err.message}`);
    return null;
  }
}

async function testElementExists(cp, pagePath, selector, desc) {
  process.stdout.write(`  [元素] ${desc}... `);
  try {
    const el = await cp.$(selector);
    if (el) {
      process.stdout.write(`✓\n`);
      report.add('elementCheck', '✓', `${pagePath}: ${desc} (${selector})`);
      return true;
    }
    process.stdout.write(`⚠ 未找到 ${selector}\n`);
    report.add('elementCheck', '⚠', `${pagePath}: ${desc} (${selector}) 未渲染`);
    return false;
  } catch (e) {
    process.stdout.write(`✗ ${e.message}\n`);
    report.add('elementCheck', '✗', `${pagePath}: ${desc} - ${e.message}`);
    return false;
  }
}

async function testButtonTap(cp, pagePath, selector, desc) {
  process.stdout.write(`  [按钮] ${desc}... `);
  try {
    const el = await cp.$(selector);
    if (!el) {
      process.stdout.write(`⚠ 未找到 ${selector}\n`);
      report.add('buttonNav', '⚠', `${pagePath}: ${desc} - 未找到 ${selector}`);
      return;
    }
    await el.tap();
    await sleep(500);
    process.stdout.write(`✓\n`);
    report.add('buttonNav', '✓', `${pagePath}: ${desc}`);
  } catch (e) {
    process.stdout.write(`✗ ${e.message}\n`);
    report.add('buttonNav', '✗', `${pagePath}: ${desc} - ${e.message}`);
  }
}

async function testFormInput(cp, pagePath, selector, value, desc) {
  process.stdout.write(`  [表单] ${desc}... `);
  try {
    const el = await cp.$(selector);
    if (!el) {
      process.stdout.write(`⚠ 未找到 ${selector}\n`);
      report.add('formTest', '⚠', `${pagePath}: ${desc} - 未找到`);
      return;
    }
    await el.input(value);
    await sleep(300);
    process.stdout.write(`✓ 输入"${value}"\n`);
    report.add('formTest', '✓', `${pagePath}: ${desc} 输入"${value}"`);
  } catch (e) {
    process.stdout.write(`✗ ${e.message}\n`);
    report.add('formTest', '✗', `${pagePath}: ${desc} - ${e.message}`);
  }
}

async function testDataField(cp, pagePath, field, expectedType) {
  process.stdout.write(`  [数据] ${field} 类型=${expectedType}... `);
  try {
    const data = await cp.data();
    const val = data[field];
    if (val === undefined || val === null) {
      process.stdout.write(`⚠ ${field} 未定义\n`);
      report.add('dataCheck', '⚠', `${pagePath}: ${field} 未定义`);
    } else if (Array.isArray(val) && expectedType === 'array') {
      process.stdout.write(`✓ ${val.length}项\n`);
      report.add('dataCheck', '✓', `${pagePath}: ${field} array(${val.length})`);
    } else if (typeof val === expectedType) {
      process.stdout.write(`✓ ${val}\n`);
      report.add('dataCheck', '✓', `${pagePath}: ${field}=${val}`);
    } else {
      process.stdout.write(`⚠ 类型不匹配: 期望${expectedType}, 实际${typeof val}\n`);
      report.add('dataCheck', '⚠', `${pagePath}: ${field} 类型=${typeof val}, 期望=${expectedType}`);
    }
  } catch (e) {
    process.stdout.write(`✗ ${e.message}\n`);
    report.add('dataCheck', '✗', `${pagePath}: ${field} - ${e.message}`);
  }
}

async function testScrollView(cp, pagePath, selector, desc) {
  process.stdout.write(`  [滚动] ${desc}... `);
  try {
    const el = await cp.$(selector);
    if (!el) {
      process.stdout.write(`⚠ 未找到 ${selector}\n`);
      report.add('scrollTest', '⚠', `${pagePath}: ${desc} - 未找到`);
      return;
    }
    await el.touchstart({ x: 100, y: 400 });
    await el.touchmove({ x: 100, y: 100 });
    await el.touchend({ x: 100, y: 100 });
    await sleep(500);
    process.stdout.write(`✓\n`);
    report.add('scrollTest', '✓', `${pagePath}: ${desc}`);
  } catch (e) {
    process.stdout.write(`⚠ 模拟滚动: ${e.message}\n`);
    report.add('scrollTest', '⚠', `${pagePath}: ${desc} - ${e.message}`);
  }
}

async function testSearchFunction(miniProgram, cp, pagePath, pageName) {
  process.stdout.write(`  [搜索] 搜索功能... `);
  try {
    const searchInput = await cp.$('input');
    if (!searchInput) {
      process.stdout.write(`⚠ 未找到 input\n`);
      report.add('searchTest', '⚠', `${pageName}: 未找到 input`);
      return;
    }
    await searchInput.input('test');
    await sleep(500);
    const data = await cp.data();
    const searchKey = data.searchKey;
    process.stdout.write(`searchKey="${searchKey}" ${searchKey !== undefined ? '✓' : '⚠'}\n`);
    report.add('searchTest', searchKey !== undefined ? '✓' : '⚠', `${pageName}: searchKey="${searchKey}"`);

    const clearBtn = await cp.$('.clear-btn, .search-clear');
    if (clearBtn) {
      await clearBtn.tap();
      await sleep(300);
      const data2 = await cp.data();
      process.stdout.write(`  [搜索] 清除后="${data2.searchKey}" ${!data2.searchKey ? '✓' : '⚠'}\n`);
      report.add('searchTest', !data2.searchKey ? '✓' : '⚠', `${pageName}: 清除 searchKey="${data2.searchKey}"`);
    }
  } catch (e) {
    process.stdout.write(`✗ ${e.message}\n`);
    report.add('searchTest', '✗', `${pageName}: ${e.message}`);
  }
}

// ============== MAIN ==============
async function run() {
  const args = process.argv.slice(2);
  const scanOnly = args.includes('--scan-only');
  const mode = scanOnly ? '扫描模式' : '修复模式';
  console.log(`=== 微信小程序全功能自动化诊断 [${mode}] ===`);
  console.log(`启动时间: ${formatTime()}\n`);

  const miniProgram = await automator.connect({ wsEndpoint: `ws://localhost:${AUTO_PORT}` });
  console.log('✓ 已连接\n');

  const allConsole = [], allExceptions = [];
  miniProgram.on('console', msg => { allConsole.push(msg); });
  miniProgram.on('exception', err => { allExceptions.push(err); });
  await sleep(2000);

  // === Module 1: Page Navigation ===
  console.log('--- [模块1] 页面遍历 ---');
  let firstPage = null;
  for (const pageCfg of PAGES) {
    const cp = await navToPage(miniProgram, pageCfg);
    if (!firstPage && cp) firstPage = cp;
  }

  // === Module 2: Element Existence Check ===
  console.log('\n--- [模块2] 元素存在性检查 ---');
  for (const [pagePath, selectors] of Object.entries(ELEMENT_CHECKS)) {
    const pageCfg = PAGES.find(p => p.path === pagePath || p.path.startsWith(pagePath));
    if (!pageCfg) continue;
    const cp = await navToPage(miniProgram, pageCfg);
    if (!cp) continue;
    for (const sel of selectors) {
      await testElementExists(cp, pagePath, sel, sel.replace(/^\./, ''));
    }
  }

  // === Module 3: Search Function ===
  console.log('\n--- [模块3] 搜索功能测试 ---');
  for (const pageCfg of PAGES.filter(p => p.search)) {
    const cp = await navToPage(miniProgram, pageCfg);
    if (cp) await testSearchFunction(miniProgram, cp, pageCfg.path, pageCfg.name);
  }

  // === Module 4: Button Nav Tests ===
  console.log('\n--- [模块4] 按钮交互与跳转 ---');
  for (const btn of BUTTON_NAV_TESTS) {
    const pageCfg = PAGES.find(p => p.path === btn.page || p.path.startsWith(btn.page));
    if (!pageCfg) continue;
    const cp = await navToPage(miniProgram, pageCfg);
    if (cp) await testButtonTap(cp, btn.page, btn.selector, btn.desc);
  }

  // === Module 5: TabBar Switch ===
  console.log('\n--- [模块5] TabBar 切换 ---');
  for (const pageCfg of PAGES.filter(p => p.tab)) {
    const cp = await navToPage(miniProgram, pageCfg);
    if (cp) process.stdout.write(`  [Tab] ${pageCfg.name} ✓\n`);
    report.add('tabSwitch', cp ? '✓' : '✗', `${pageCfg.name}`);
  }

  // === Module 6: Form Input ===
  console.log('\n--- [模块6] 表单输入 ---');
  for (const form of FORM_TESTS) {
    const pageCfg = PAGES.find(p => p.path === form.page || p.path.startsWith(form.page));
    if (!pageCfg) continue;
    const cp = await navToPage(miniProgram, pageCfg);
    if (cp) await testFormInput(cp, form.page, form.selector, form.value, form.desc);
  }

  // === Module 7: Data Validation ===
  console.log('\n--- [模块7] 页面数据校验 ---');
  for (const dc of DATA_CHECKS) {
    const pageCfg = PAGES.find(p => p.path === dc.page || p.path.startsWith(dc.page));
    if (!pageCfg) continue;
    const cp = await navToPage(miniProgram, pageCfg);
    if (cp) await testDataField(cp, dc.page, dc.field, dc.type);
  }

  // === Module 8: Scroll / Pull-to-refresh ===
  console.log('\n--- [模块8] 滚动/下拉刷新 ---');
  for (const sc of SCROLL_TESTS) {
    const pageCfg = PAGES.find(p => p.path === sc.page || p.path.startsWith(sc.page));
    if (!pageCfg) continue;
    const cp = await navToPage(miniProgram, pageCfg);
    if (cp) await testScrollView(cp, sc.page, sc.selector, sc.desc);
  }

  // === Console Analysis ===
  for (const msg of allConsole) {
    const entry = { type: msg.type || 'log', args: msg.args || [], time: new Date().toISOString() };
    if (entry.type === 'error' || entry.type === 'assert') report.console.errors.push(entry);
    else if (entry.type === 'warn') report.console.warnings.push(entry);
    else report.console.others.push(entry);
  }
  report.exceptions.push(...allExceptions);

  // === Summary ===
  console.log('\n' + '='.repeat(60));
  console.log('  诊断报告');
  console.log('='.repeat(60));

  const summary = {};
  for (const [mod, data] of Object.entries(report.modules)) {
    const modName = { pageNav: '页面遍历', elementCheck: '元素检查', searchTest: '搜索测试',
      buttonNav: '按钮交互', tabSwitch: 'TabBar切换', formTest: '表单输入',
      dataCheck: '数据校验', scrollTest: '滚动测试' }[mod] || mod;
    console.log(`  ${modName}: ${data.passed} ✓ ${data.failed} ✗ ${data.skipped} ⚠`);
    summary[mod] = data;
  }

  console.log(`\n  Console: ${report.console.errors.length} errors, ${report.console.warnings.length} warnings`);
  for (const e of report.console.errors) console.log(`    [${e.time}] ${e.args.join(' | ')}`);
  for (const w of report.console.warnings) console.log(`    ${w.args.join(' | ')}`);

  console.log(`\n  JS异常: ${report.exceptions.length} 条`);
  for (const ex of report.exceptions) {
    console.log(`    ${ex.message}`);
    if (ex.stack) console.log(`    ${ex.stack.substring(0, 200)}`);
  }

  const totalPassed = Object.values(report.modules).reduce((s, m) => s + m.passed, 0);
  const totalFailed = Object.values(report.modules).reduce((s, m) => s + m.failed, 0);
  console.log(`\n  总计: ${totalPassed} 通过, ${totalFailed} 失败`);
  console.log(`  模式: ${mode}`);
  console.log('='.repeat(60));

  // Save report
  const reportPath = path.join(__dirname, `diagnose-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    time: formatTime(), mode, summary,
    console: { errors: report.console.errors.length, warnings: report.console.warnings.length },
    exceptions: report.exceptions.length,
    details: report.modules
  }, null, 2));
  console.log(`\n报告已保存: ${reportPath}`);

  miniProgram.disconnect();
  console.log('\n✓ 诊断完成');
}

run().catch(err => {
  console.error('\n!!! 诊断脚本异常:', err.message);
  process.exit(1);
});
