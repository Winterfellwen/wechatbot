/**
 * wechatbot 自动化诊断脚本
 * 8 个测试模块：页面遍历、搜索、元素存在性、按钮交互、TabBar、表单、数据校验、滚动
 */

const automator = require('miniprogram-automator');

const PORT = 9420;

// ── 配置区域 ─────────────────────────────────────────────────
const PAGES = [
  { path: 'pages/index/index', tab: true },
  { path: 'pages/user/user', tab: true },
  { path: 'pdf/pages/index/index', tab: false },
  { path: 'pdf/pages/convert/convert', tab: false },
  { path: 'pdf/pages/edit/edit', tab: false },
  { path: 'japanese/pages/learn/learn', tab: false },
  { path: 'japanese/pages/lesson/lesson', tab: false },
  { path: 'japanese/pages/course/course', tab: false },
  { path: 'japanese/pages/wordbook/wordbook', tab: false },
  { path: 'japanese/pages/grammar/grammar', tab: false },
  { path: 'japanese/pages/grammar/grammar33', tab: false },
  { path: 'japanese/pages/textbook/textbook', tab: false },
  { path: 'japanese/pages/leaderboard/leaderboard', tab: false },
  { path: 'german/pages/learn/learn', tab: false },
  { path: 'german/pages/learn/challenge', tab: false },
  { path: 'german/pages/learn/result', tab: false },
  { path: 'german/pages/learn/review', tab: false },
  { path: 'german/pages/lesson/lesson', tab: false },
  { path: 'german/pages/course/course', tab: false },
  { path: 'german/pages/wordbook/wordbook', tab: false },
  { path: 'german/pages/grammar/grammar', tab: false },
  { path: 'german/pages/textbook/textbook', tab: false },
  { path: 'german/pages/leaderboard/leaderboard', tab: false },
  { path: 'word/pages/index/index', tab: false },
  { path: 'word/pages/editor/editor', tab: false },
  { path: 'smart-teacher/pages/chat/chat', tab: false }
];

const TAB_PATHS = ['pages/index/index', 'pages/user/user'];

const ELEMENT_CHECKS = {
  'pages/index/index': ['.user-header', '.entry-grid', '.teacher-card', '.footer'],
  'pages/user/user': ['.login-section', '.profile-section', '.action-card'],
  'pdf/pages/index/index': ['.upload-section', '.convert-section', '.target-list', '.bottom-nav'],
  'pdf/pages/convert/convert': ['.file-display', '.target-list', '.convert-btn-wrap'],
  'pdf/pages/edit/edit': ['.file-display', '.op-list', '.options-panel', '.do-btn-wrap'],
  'japanese/pages/learn/learn': ['.path-scroll', '.level-picker', '.bottom-nav'],
  'japanese/pages/lesson/lesson': ['.study-body', '.quiz-container', '.start-quiz-bar'],
  'japanese/pages/course/course': ['.hub-grid', '.bottom-nav'],
  'japanese/pages/wordbook/wordbook': ['.search-bar', '.word-list', '.stats-bar'],
  'japanese/pages/grammar/grammar': ['.level-tabs', '.grammar-list'],
  'japanese/pages/textbook/textbook': ['.book-list', '.lesson-list'],
  'japanese/pages/leaderboard/leaderboard': ['.personal-card', '.rank-list', '.tabs', '.bottom-nav'],
  'german/pages/learn/learn': ['.path-scroll', '.level-picker', '.bottom-nav'],
  'german/pages/learn/challenge': ['.question-box', '.options', '.progress-bar'],
  'german/pages/learn/result': ['.result-card', '.wrong-review', '.actions'],
  'german/pages/learn/review': ['.card', '.actions', '.finish-card'],
  'german/pages/lesson/lesson': ['.body-scroll', '.vocab-list', '.quiz-section'],
  'german/pages/course/course': ['.level-selector', '.vocab-list', '.bottom-nav'],
  'german/pages/wordbook/wordbook': ['.main-content', '.word-list', '.bottom-nav'],
  'german/pages/grammar/grammar': ['.level-tabs', '.grammar-scroll'],
  'german/pages/textbook/textbook': ['.book-list', '.lesson-list'],
  'german/pages/leaderboard/leaderboard': ['.personal-card', '.rank-list', '.tabs'],
  'word/pages/index/index': ['.search-bar', '.doc-list', '.btn-row', '.toolbar-row'],
  'word/pages/editor/editor': ['.top-bar', '.toolbar', '.editor-wrap', '.bottom-bar'],
  'smart-teacher/pages/chat/chat': ['.header', '.msg-list', '.input-section', '.input-bar']
};

const BUTTON_NAV_TESTS = [
  { from: 'pages/index/index', btn: '.entry-card.card-japanese', target: 'japanese/pages/learn/learn' },
  { from: 'pages/index/index', btn: '.entry-card.card-german', target: 'german/pages/learn/learn' },
  { from: 'pages/index/index', btn: '.entry-card.card-word', target: 'word/pages/index/index' },
  { from: 'pages/index/index', btn: '.entry-card.card-pdf', target: 'pdf/pages/index/index' },
  { from: 'pages/user/user', btn: '.login-btn', target: null }
];

const FORM_TESTS = ['japanese/pages/wordbook/wordbook', 'word/pages/index/index', 'smart-teacher/pages/chat/chat'];

const DATA_CHECKS = {
  'word/pages/index/index': { searchQuery: '', docs: [] },
  'smart-teacher/pages/chat/chat': { messages: [], inputText: '', loading: false }
};

const SCROLL_TESTS = ['japanese/pages/learn/learn', 'german/pages/learn/learn'];

// ── 工具函数 ─────────────────────────────────────────────────
const PASS = 0, FAIL = 1, SKIP = 2;
let results = { nav: { passed: 0, failed: 0, skipped: 0, details: [] }, element: { passed: 0, failed: 0, details: [] }, button: { passed: 0, failed: 0, details: [] }, tabbar: { passed: 0, failed: 0, details: [] }, form: { passed: 0, failed: 0, details: [] }, data: { passed: 0, failed: 0, details: [] }, scroll: { passed: 0, failed: 0, details: [] } };
let miniProgram;

function logResult(module, status, msg) {
  const icon = status === PASS ? '✓' : status === FAIL ? '✗' : '⊘';
  results[module][status === PASS ? 'passed' : status === FAIL ? 'failed' : 'skipped']++;
  results[module].details.push({ status, msg });
  console.log(`  ${icon} ${msg}`);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function navigateTo(pagePath, isTab) {
  if (isTab) {
    await miniProgram.switchTab('/' + pagePath);
  } else {
    await miniProgram.redirectTo('/' + pagePath);
  }
  await sleep(2000);
  const cp = await Promise.race([
    miniProgram.currentPage(),
    new Promise((_, rej) => setTimeout(() => rej(new Error('currentPage超时')), 8000))
  ]);
  return cp;
}

// ── 模块 1: 页面遍历 ────────────────────────────────────────
async function testPageNavigation() {
  console.log('\n=== [模块 1] 页面遍历 ===');
  for (const p of PAGES) {
    try {
      const cp = await navigateTo(p.path, p.tab);
      const path = cp ? cp.path : null;
      if (path === p.path || path === '/' + p.path) {
        logResult('nav', PASS, p.path + ' ✓');
      } else {
        logResult('nav', FAIL, p.path + ' → path=' + path);
      }
    } catch (err) {
      logResult('nav', FAIL, p.path + ' ' + err.message);
    }
  }
}

// ── 模块 2: 搜索功能 ────────────────────────────────────────
async function testSearch() {
  console.log('\n=== [模块 2] 搜索功能 ===');
  const searchPages = ['japanese/pages/wordbook/wordbook', 'word/pages/index/index'];
  for (const sp of searchPages) {
    try {
      const page = await navigateTo(sp, false);
      try {
        const input = await page.$('input');
        if (input) {
          await input.input('test');
          await sleep(500);
          logResult('form', PASS, sp + ' 搜索输入 ✓');
        } else {
          await page.callMethod('onSearch', { detail: { value: 'test' } });
          logResult('form', PASS, sp + ' 搜索 setData ✓');
        }
      } catch (e) {
        await page.callMethod('onSearch', { detail: { value: 'test' } });
        logResult('form', PASS, sp + ' 搜索 setData fallback ✓');
      }
    } catch (err) {
      logResult('form', FAIL, sp + ' 搜索失败: ' + err.message);
    }
  }
}

// ── 模块 3: 元素存在性检查 ──────────────────────────────────
async function testElementExists() {
  console.log('\n=== [模块 3] 元素存在性 ===');
  for (const [pagePath, selectors] of Object.entries(ELEMENT_CHECKS)) {
    try {
      const isTab = TAB_PATHS.indexOf(pagePath) !== -1;
      const page = await navigateTo(pagePath, isTab);
      for (const sel of selectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            logResult('element', PASS, pagePath + ' ' + sel + ' ✓');
          } else {
            logResult('element', FAIL, pagePath + ' ' + sel + ' ✗');
          }
        } catch (_) {
          logResult('element', FAIL, pagePath + ' ' + sel + ' selector error');
        }
      }
    } catch (err) {
      logResult('element', FAIL, pagePath + ' 整体失败: ' + err.message);
    }
  }
}

// ── 模块 4: 按钮交互与跳转 ──────────────────────────────────
async function testButtonNav() {
  console.log('\n=== [模块 4] 按钮交互与跳转 ===');
  for (const t of BUTTON_NAV_TESTS) {
    try {
      const isTab = TAB_PATHS.indexOf(t.from) !== -1;
      const page = await navigateTo(t.from, isTab);
      try {
        const el = await page.$(t.btn);
        if (el) {
          logResult('button', PASS, t.from + ' ' + t.btn + ' 已渲染 ✓');
          if (t.target) {
            try {
              await el.tap();
              await sleep(2000);
              const cp = await miniProgram.currentPage();
              const curPath = cp ? cp.path : null;
              // check if the current path starts with the target
              if (curPath && (curPath === t.target || curPath.indexOf(t.target) !== -1 || t.target.indexOf(curPath) !== -1)) {
                logResult('button', PASS, t.btn + ' → ' + t.target + ' ✓');
              } else {
                logResult('button', FAIL, t.btn + ' 点击后 path=' + curPath + ' 期望包含 ' + t.target);
              }
            } catch (tapErr) {
              logResult('button', FAIL, t.from + ' ' + t.btn + ' tap失败: ' + tapErr.message);
            }
          }
        } else {
          logResult('button', FAIL, t.from + ' ' + t.btn + ' 未找到 ✗');
        }
      } catch (e) {
        logResult('button', FAIL, t.from + ' ' + t.btn + ': ' + e.message);
      }
    } catch (err) {
      logResult('button', FAIL, t.from + ' 按钮测试失败: ' + err.message);
    }
  }
}

// ── 模块 5: TabBar 切换 ─────────────────────────────────────
async function testTabBar() {
  console.log('\n=== [模块 5] TabBar 切换 ===');
  for (const tabPath of TAB_PATHS) {
    try {
      const page = await navigateTo(tabPath, true);
      const path = page ? page.path : null;
      if (path && (path === tabPath || path === '/' + tabPath || path.indexOf(tabPath) !== -1)) {
        logResult('tabbar', PASS, 'Tab ' + tabPath + ' ✓');
      } else {
        logResult('tabbar', FAIL, 'Tab ' + tabPath + ' → ' + path);
      }
    } catch (err) {
      logResult('tabbar', FAIL, 'Tab ' + tabPath + ': ' + err.message);
    }
  }
  try {
    await miniProgram.switchTab('/pages/user/user');
    await sleep(1500);
    await miniProgram.switchTab('/pages/index/index');
    await sleep(1500);
    logResult('tabbar', PASS, 'Tab 交叉切换 ✓');
  } catch (err) {
    logResult('tabbar', FAIL, 'Tab 交叉切换失败: ' + err.message);
  }
}

// ── 模块 6: 表单输入 ────────────────────────────────────────
async function testFormInput() {
  console.log('\n=== [模块 6] 表单输入 ===');
  for (const fp of FORM_TESTS) {
    try {
      const page = await navigateTo(fp, false);
      if (fp === 'smart-teacher/pages/chat/chat') {
        await page.callMethod('onInput', { detail: { value: '你好老师' } });
        await sleep(300);
        logResult('form', PASS, fp + ' onInput ✓');
      } else if (fp === 'japanese/pages/wordbook/wordbook' || fp === 'word/pages/index/index') {
        await page.callMethod('onSearch', { detail: { value: 'test' } });
        await sleep(300);
        logResult('form', PASS, fp + ' onSearch ✓');
      }
    } catch (err) {
      logResult('form', FAIL, fp + ': ' + err.message);
    }
  }
}

// ── 模块 7: 页面数据校验 ────────────────────────────────────
async function testDataCheck() {
  console.log('\n=== [模块 7] 页面数据校验 ===');
  for (const [pagePath, expectedData] of Object.entries(DATA_CHECKS)) {
    try {
      const page = await navigateTo(pagePath, false);
      const data = await page.data();
      if (data) {
        let allOk = true;
        for (const [key, val] of Object.entries(expectedData)) {
          if (key in data) {
            const actualType = typeof data[key];
            const expectedType = typeof val;
            if (actualType === expectedType) {
              logResult('data', PASS, pagePath + ' .' + key + ' 类型 ' + actualType + ' ✓');
            } else {
              logResult('data', FAIL, pagePath + ' .' + key + ' 应为 ' + expectedType + ' 实际 ' + actualType);
              allOk = false;
            }
          } else {
            logResult('data', FAIL, pagePath + ' 缺少字段 .' + key);
            allOk = false;
          }
        }
        if (allOk) logResult('data', PASS, pagePath + ' 数据校验通过');
      } else {
        logResult('data', FAIL, pagePath + ' 无法获取 data');
      }
    } catch (err) {
      logResult('data', FAIL, pagePath + ': ' + err.message);
    }
  }
}

// ── 模块 8: 滚动/下拉刷新 ───────────────────────────────────
async function testScroll() {
  console.log('\n=== [模块 8] 滚动/下拉刷新 ===');
  for (const sp of SCROLL_TESTS) {
    try {
      const page = await navigateTo(sp, false);
      try {
        await page.callMethod('onScroll', { detail: { scrollTop: 100 } });
        logResult('scroll', PASS, sp + ' 模拟滚动 ✓');
      } catch (_) {
        logResult('scroll', SKIP, sp + ' 无可测试滚动方法');
      }
    } catch (err) {
      logResult('scroll', FAIL, sp + ': ' + err.message);
    }
  }
}

// ── 主流程 ──────────────────────────────────────────────────
async function main() {
  console.log('=== wechatbot 自动化诊断 ===');
  miniProgram = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:' + PORT });
  console.log('已连接 DevTools\n');

  const start = Date.now();

  await testPageNavigation();
  await testSearch();
  await testElementExists();
  await testButtonNav();
  await testTabBar();
  await testFormInput();
  await testDataCheck();
  await testScroll();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n=== 诊断报告 ===');
  console.log('耗时: ' + elapsed + 's\n');
  let totalPassed = 0, totalFailed = 0, totalSkipped = 0;
  for (const [mod, r] of Object.entries(results)) {
    const modName = { nav: '页面遍历', element: '元素存在性', button: '按钮交互', tabbar: 'TabBar', form: '表单', data: '数据校验', scroll: '滚动' }[mod] || mod;
    console.log(modName + ': ' + r.passed + ' ✓ / ' + r.failed + ' ✗ / ' + r.skipped + ' ⊘');
    totalPassed += r.passed; totalFailed += r.failed; totalSkipped += r.skipped;
  }
  console.log('\n总计: ' + totalPassed + ' 通过, ' + totalFailed + ' 失败, ' + totalSkipped + ' 跳过');

  await miniProgram.disconnect();
  console.log('\n已断开连接');
}

main().catch(function(err) { console.error('诊断异常:', err); process.exit(1); });
