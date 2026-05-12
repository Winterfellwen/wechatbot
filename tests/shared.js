const { spawn } = require('child_process');
const { execSync } = require('child_process');

// ============================================================
// Config
// ============================================================
const CLI_PATH = 'E:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat';
const PROJECT_PATH = 'E:\\AI\\wechatbot';
const AUTO_PORT = 9420;
const NAVIGATE_TIMEOUT = 10000;

// ============================================================
// Page definitions (shared across test files)
// ============================================================
const PAGES = [
  { path: 'pages/index/index', name: '首页', tab: true },
  { path: 'pages/user/user', name: '个人中心', tab: true },
  { path: 'pdf/pages/index/index', name: 'PDF工具' },
  { path: 'pdf/pages/convert/convert', name: 'PDF转换' },
  { path: 'pdf/pages/edit/edit', name: 'PDF编辑' },
  { path: 'japanese/pages/learn/learn', name: '日语学习' },
  { path: 'japanese/pages/lesson/lesson', name: '日语课程' },
  { path: 'japanese/pages/course/course', name: '日语选课' },
  { path: 'japanese/pages/wordbook/wordbook', name: '日语生词本', search: 'jp' },
  { path: 'japanese/pages/grammar/grammar', name: '日语语法' },
  { path: 'japanese/pages/textbook/textbook', name: '日语教材' },
  { path: 'japanese/pages/leaderboard/leaderboard', name: '日语排行榜' },
  { path: 'german/pages/learn/learn', name: '德语学习' },
  { path: 'german/pages/lesson/lesson', name: '德语课程' },
  { path: 'german/pages/course/course', name: '德语选课' },
  { path: 'german/pages/wordbook/wordbook', name: '德语生词本' },
  { path: 'german/pages/grammar/grammar', name: '德语语法' },
  { path: 'german/pages/textbook/textbook', name: '德语教材' },
  { path: 'german/pages/aichat/aichat', name: '德语AI聊天' },
  { path: 'german/pages/leaderboard/leaderboard', name: '德语排行榜' },
  { path: 'word/pages/index/index', name: 'Word文档列表', search: 'word' },
  { path: 'word/pages/editor/editor', name: 'Word编辑器' },
  { path: 'smart-teacher/pages/chat/chat', name: '智能老师' },
];

// ============================================================
// Utilities
// ============================================================
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================================
// CLI management
// ============================================================
function startCLI() {
  return new Promise((resolve, reject) => {
    const args = ['/c', CLI_PATH, 'auto', '--project', PROJECT_PATH, '--auto-port', String(AUTO_PORT)];
    const proc = spawn('cmd.exe', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => out += d);
    proc.on('error', reject);
    const timer = setTimeout(() => {
      if (out.includes('√ auto')) resolve(proc);
      else reject(new Error('CLI auto timed out:\n' + out));
    }, 40000);
    proc.on('exit', code => {
      clearTimeout(timer);
      if (out.includes('√ auto')) resolve(proc);
      else reject(new Error(`CLI exited ${code}:\n${out}`));
    });
  });
}

// ============================================================
// Process cleanup (targeted - only kills WeChat devtools)
// ============================================================
function killWechatProcesses() {
  const targets = ['微信开发者工具', 'wechatdevtools'];
  for (const name of targets) {
    try {
      execSync(`taskkill /F /IM "${name}.exe" 2>nul`, { stdio: 'ignore' });
    } catch { }
  }
}

// ============================================================
// Navigation with retry
// ============================================================
async function navigateWithRetry(miniProgram, pageInfo, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const start = Date.now();
      if (pageInfo.tab) await miniProgram.switchTab('/' + pageInfo.path);
      else await miniProgram.redirectTo('/' + pageInfo.path);
      await sleep(2000);
      const cp = await miniProgram.currentPage();
      const route = cp ? cp.path || 'unknown' : 'unknown';
      return { ok: true, route, timeMs: Date.now() - start };
    } catch (err) {
      if (attempt < retries) {
        await sleep(1000);
        continue;
      }
      return { ok: false, error: err.message };
    }
  }
}

// ============================================================
// Search interaction test
// ============================================================
async function testSearchInteraction(miniProgram, page, pageInfo) {
  const results = [];
  const push = (ok, msg) => results.push({ ok, msg });

  try {
    if (pageInfo.search === 'jp') {
      await miniProgram.evaluate(() => {
        const p = getCurrentPages().pop();
        p.setData({ searchKey: 'test' });
        p.onSearch && p.onSearch({ detail: { value: 'test' } });
      });
      await sleep(500);
      const data = await page.data();
      push(data.searchKey === 'test', `输入搜索词 → searchKey="${data.searchKey}"`);
      await miniProgram.evaluate(() => {
        const p = getCurrentPages().pop();
        p.clearSearch && p.clearSearch();
      });
      await sleep(300);
      const cleared = await page.data();
      push(cleared.searchKey === '', `清除搜索 → searchKey="${cleared.searchKey}"`);
    } else if (pageInfo.search === 'word') {
      await miniProgram.evaluate(() => {
        const p = getCurrentPages().pop();
        p.setData({ searchKey: 'test' });
        p._filterDocs && p._filterDocs();
      });
      await sleep(500);
      const data = await page.data();
      push(data.searchKey === 'test', `输入搜索词 → searchKey="${data.searchKey}"`);
      await miniProgram.evaluate(() => {
        const p = getCurrentPages().pop();
        p.onSearchClear && p.onSearchClear();
      });
      await sleep(300);
      const cleared = await page.data();
      push(cleared.searchKey === '', `清除搜索 → searchKey="${cleared.searchKey}"`);
    }
  } catch (e) {
    push(false, `搜索异常: ${e.message}`);
  }
  return results;
}

module.exports = {
  CLI_PATH,
  PROJECT_PATH,
  AUTO_PORT,
  NAVIGATE_TIMEOUT,
  PAGES,
  sleep,
  startCLI,
  killWechatProcesses,
  navigateWithRetry,
  testSearchInteraction,
};
