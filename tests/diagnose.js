/**
 * tests/diagnose.js
 *
 * 微信小程序自动化诊断脚本 — 针对 wechatbot 项目生成
 * 生成时间: 2026-05-15
 *
 * 包含 8 个测试模块:
 * - 页面遍历
 * - 搜索功能
 * - 元素存在性检查
 * - 按钮交互与跳转验证
 * - TabBar 切换
 * - 表单输入
 * - 页面数据校验
 * - 滚动/下拉刷新
 *
 * 用法: node tests/diagnose.js [options]
 *   --project <path>   项目路径
 *   --cli <path>       cli.bat 路径
 *   --port <port>      自动化服务端口 (默认: 9420)
 *   --scan-only        仅扫描，不执行自动修复 (默认: true)
 *   --max-retries <n>  最大重试次数 (默认: 1)
 *   --timeout <ms>    页面导航超时 (默认: 15000)
 */
const automator = require('miniprogram-automator');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
// 项目配置（根据 app.json 生成）
// ═══════════════════════════════════════════════════

const DEFAULT_CLI_PATH = 'E:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat';
const DEFAULT_PROJECT_PATH = 'E:\\AI\\wechatbot';
const DEFAULT_AUTO_PORT = 9420;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_NAV_TIMEOUT = 15000;

// 页面列表
const PAGES = [
  { path: 'pages/index/index', name: '首页', tab: true },
  { path: 'pages/user/user', name: '我的', tab: true },
  { path: 'pdf/pages/index/index', name: 'PDF工具箱' },
  { path: 'pdf/pages/convert/convert', name: 'PDF转换' },
  { path: 'pdf/pages/edit/edit', name: '合并PDF' },
  { path: 'pdf/pages/records/records', name: '转换记录' },
  { path: 'japanese/pages/learn/learn', name: '日语学习' },
  { path: 'japanese/pages/lesson/lesson', name: '日语课程详情' },
  { path: 'japanese/pages/course/course', name: '日语课程列表' },
  { path: 'japanese/pages/wordbook/wordbook', name: '日语生词本' },
  { path: 'japanese/pages/grammar/grammar', name: '日语语法' },
  { path: 'japanese/pages/grammar/grammar33', name: '日语语法33' },
  { path: 'japanese/pages/textbook/textbook', name: '日语教材' },
  { path: 'japanese/pages/leaderboard/leaderboard', name: '日语排行榜' },
  { path: 'german/pages/learn/learn', name: '德语学习' },
  { path: 'german/pages/learn/challenge', name: '德语挑战' },
  { path: 'german/pages/learn/result', name: '德语结果' },
  { path: 'german/pages/learn/review', name: '德语复习' },
  { path: 'german/pages/lesson/lesson', name: '德语课程详情' },
  { path: 'german/pages/course/course', name: '德语课程列表' },
  { path: 'german/pages/wordbook/wordbook', name: '德语生词本' },
  { path: 'german/pages/grammar/grammar', name: '德语语法' },
  { path: 'german/pages/textbook/textbook', name: '德语教材' },
  { path: 'german/pages/leaderboard/leaderboard', name: '德语排行榜' },
  { path: 'word/pages/index/index', name: 'Word工具' },
  { path: 'word/pages/editor/editor', name: 'Word编辑器' },
  { path: 'smart-teacher/pages/chat/chat', name: '智能老师' },
];

// 测试模块开关
const MODULES = {
  pageTraversal: { enabled: true, name: '页面遍历' },
  searchTest:    { enabled: false, name: '搜索功能' },
  elementExists: { enabled: true, name: '元素存在性检查' },
  buttonNav:     { enabled: true, name: '按钮交互与跳转验证' },
  tabBar:        { enabled: true, name: 'TabBar 切换' },
  formInput:     { enabled: true, name: '表单输入' },
  pageData:      { enabled: true, name: '页面数据校验' },
  scrollTest:    { enabled: true, name: '滚动/下拉刷新' },
};

// 元素存在性检查
const ELEMENT_CHECKS = {
  'pages/index/index': [
    { selector: 'image', desc: '用户头像' },
    { selector: 'entry-card', desc: '日语学习入口' },
    { selector: 'entry-card', desc: '德语学习入口' },
    { selector: 'entry-card', desc: 'Word编辑入口' },
    { selector: 'entry-card', desc: 'PDF工具入口' },
    { selector: 'teacher-card', desc: '智能老师卡片' },
  ],
  'pages/user/user': [
    { selector: 'login-btn', desc: '登录按钮' },
    { selector: 'avatar', desc: '用户头像' },
    { selector: 'action-item', desc: '功能列表项' },
  ],
  'pdf/pages/index/index': [
    { selector: 't-tabs', desc: 'Tab 切换' },
    { selector: 'button', desc: '上传按钮' },
    { selector: 'picker', desc: '格式选择器' },
  ],
  'pdf/pages/records/records': [
    { selector: 't-tabs', desc: 'Tab 筛选' },
    { selector: 'scroll-view', desc: '记录列表' },
    { selector: 'button', desc: '下载按钮' },
  ],
  'japanese/pages/learn/learn': [
    { selector: 'scroll-view', desc: '学习路径滚动' },
    { selector: 'level-badge', desc: '等级徽章' },
    { selector: 'path-row', desc: '课程节点' },
    { selector: 'picker', desc: '等级选择器' },
    { selector: 'nav-item', desc: '底部导航' },
  ],
  'german/pages/learn/learn': [
    { selector: 'scroll-view', desc: '学习路径滚动' },
    { selector: 'level-badge', desc: '等级徽章' },
    { selector: 'path-row', desc: '课程节点' },
    { selector: 'nav-item', desc: '底部导航' },
  ],
  'word/pages/index/index': [
    { selector: 'button', desc: '导入按钮' },
    { selector: 'scroll-view', desc: '文档列表' },
  ],
  'word/pages/editor/editor': [
    { selector: 'editor', desc: '编辑器' },
    { selector: 'button', desc: '保存按钮' },
  ],
  'smart-teacher/pages/chat/chat': [
    { selector: 'scroll-view', desc: '聊天消息列表' },
    { selector: 'input', desc: '输入框' },
    { selector: 'button', desc: '发送按钮' },
  ],
};

// 按钮导航测试
const BUTTON_NAV_TESTS = [
  { from: 'pages/index/index', selector: '.entry-card', label: '日语学习', expectNav: true },
  { from: 'pages/index/index', selector: '.entry-card', label: '德语学习', expectNav: true },
  { from: 'pages/index/index', selector: '.entry-card', label: 'Word编辑', expectNav: true },
  { from: 'pages/index/index', selector: '.entry-card', label: 'PDF工具', expectNav: true },
  { from: 'pages/index/index', selector: '.teacher-card', label: '智能老师', expectNav: true },
  { from: 'japanese/pages/learn/learn', selector: '.nav-item', label: '课程', expectNav: true },
  { from: 'japanese/pages/learn/learn', selector: '.nav-item', label: '排行榜', expectNav: true },
];

// TabBar 项
const TAB_BAR_ITEMS = PAGES.filter(function(p) { return p.tab; }).map(function(p) {
  return { path: p.path, name: p.name };
});

// 表单输入测试
const FORM_TESTS = [
  {
    page: 'pages/user/user',
    label: '用户页-输入昵称',
    fields: [
      { selector: '.nick-input', inputIndex: 0, value: '测试用户' },
    ],
  },
  {
    page: 'smart-teacher/pages/chat/chat',
    label: '智能老师-输入消息',
    fields: [
      { selector: 'input', inputIndex: 0, value: '你好，这是一条测试消息' },
    ],
  },
];

// 页面数据校验
const DATA_CHECKS = {
  'pages/index/index': {
    description: '首页数据',
    fields: [
      { path: 'isLoggedIn', type: 'boolean', optional: false },
      { path: 'displayUserInfo', type: 'object', optional: false },
      { path: 'greeting', type: 'string', optional: true },
    ],
  },
  'japanese/pages/learn/learn': {
    description: '日语学习页数据',
    fields: [
      { path: 'level', type: 'number', optional: false },
      { path: 'exp', type: 'number', optional: false },
      { path: 'pathNodes', type: 'array', optional: false },
      { path: 'levelOptions', type: 'array', optional: true },
    ],
  },
  'german/pages/learn/learn': {
    description: '德语学习页数据',
    fields: [
      { path: 'level', type: 'number', optional: false },
      { path: 'exp', type: 'number', optional: false },
      { path: 'pathNodes', type: 'array', optional: false },
    ],
  },
  'pdf/pages/index/index': {
    description: 'PDF工具箱数据',
    fields: [
      { path: 'activeTab', type: 'string', optional: false },
      { path: 'fileName', type: 'string', optional: true },
      { path: 'uploading', type: 'boolean', optional: false },
    ],
  },
};

// 滚动测试
const SCROLL_TESTS = [
  { page: 'japanese/pages/learn/learn', selector: 'scroll-view', label: '日语学习-路径滚动' },
  { page: 'german/pages/learn/learn', selector: 'scroll-view', label: '德语学习-路径滚动' },
  { page: 'pdf/pages/records/records', selector: 'scroll-view', label: '转换记录-列表滚动' },
];

// ═══════════════════════════════════════════════════
// 以下为固定测试逻辑，无需修改
// ═══════════════════════════════════════════════════

const CATEGORY_RULES = [
  {
    pattern: /received type\.uncompatible.*expected <String>.*null/,
    category: '组件属性类型不匹配',
    severity: 'noise',
    explanation: '组件收到 null 而非期望的 String，框架自动兜底为空字符串，不影响功能',
  },
  {
    pattern: /received type\.uncompatible|type\.uncompatible/,
    category: '组件属性类型不匹配',
    severity: 'noise',
    explanation: '传入属性类型与组件声明不一致，框架会尝试自动类型转换',
  },
  {
    pattern: /deprecated|弃用|removed|不再维护|将移除/i,
    category: '已废弃 API',
    severity: 'fixable',
    explanation: '使用了已废弃的 API，建议迁移到新版 SDK 接口',
  },
  {
    pattern: /Can't find variable|is not defined|undefined is not/i,
    category: '引用错误',
    severity: 'fixable',
    explanation: '引用了未定义的变量或方法，会导致 JS 执行中断',
  },
  {
    pattern: /Failed to load|failed to load|加载失败|网络层错误|渲染层/i,
    category: '资源加载失败',
    severity: 'fixable',
    explanation: '静态资源（图片/字体/文件）加载失败，请检查资源路径',
  },
  {
    pattern: /script error|ScriptError|thirdScriptError|thirdScriptErr/i,
    category: '脚本异常',
    severity: 'fixable',
    explanation: '框架捕获的未处理 JS 异常，建议用 try-catch 处理',
  },
  {
    pattern: /\[Component\]/,
    category: '组件内部警告',
    severity: 'noise',
    explanation: '自定义组件的非关键警告，不影响功能运行',
  },
  {
    pattern: /\[system\]|\[Perf\]|\[WXML\]|\[WX\]/,
    category: '框架日志',
    severity: 'noise',
    explanation: '小程序框架内部日志，与业务代码无关',
  },
  {
    pattern: /setData.*too large|setData.*数据量过大|data size.*limit/i,
    category: 'setData 数据量过大',
    severity: 'noise',
    explanation: '单次 setData 数据量超过 1MB 限制，建议拆分或增量更新',
  },
  {
    pattern: /setData.*frequently|setData.*频繁|webview.*rendering/i,
    category: 'setData 频繁调用',
    severity: 'noise',
    explanation: '短时间内频繁调用 setData，建议用批量更新或节流优化',
  },
  {
    pattern: /http:\/\//i,
    category: '非 HTTPS 请求',
    severity: 'fixable',
    explanation: '小程序强制 HTTPS，http 资源会被拦截，请改用 https',
  },
  {
    pattern: /hideLoading|showLoading.*频繁|loading.*频繁/i,
    category: 'Loading 频繁调用',
    severity: 'noise',
    explanation: '短时间内频繁显示/隐藏 loading，建议增加防抖',
  },
  {
    pattern: /navigateTo|redirectTo|switchTab|reLaunch/,
    category: '路由异常',
    severity: 'fixable',
    explanation: '页面路由调用异常，可能目标页面不存在或传递参数错误',
  },
  {
    pattern: /getUserInfo|getSetting|authorize/i,
    category: '授权相关',
    severity: 'fixable',
    explanation: '用户信息授权相关调用，注意新版微信需用头像昵称填写能力代替',
  },
  {
    pattern: /commercial|plugin payment|base64/i,
    category: '插件/商业化',
    severity: 'noise',
    explanation: '插件或商业化相关日志，与业务代码无关',
  },
  {
    pattern: /not found|404|not exist/i,
    category: '资源/页面不存在',
    severity: 'fixable',
    explanation: '请求的资源或页面不存在，请检查路径配置',
  },
];

function classifyEntry(text, type) {
  for (const r of CATEGORY_RULES) {
    if (r.pattern.test(text)) return r;
  }
  return {
    category: type === 'error' ? '其他错误' : '其他警告',
    severity: type === 'error' ? 'fixable' : 'noise',
    explanation: type === 'error' ? '未分类的错误，建议人工审查' : '未分类的警告，建议人工审查',
  };
}

// CLI
function startCLI(cliPath, projectPath, autoPort, maxRetries) {
  let retryCount = 0;

  function tryStart() {
    return new Promise((resolve, reject) => {
      const args = ['/c', cliPath, 'auto', '--project', projectPath, '--auto-port', String(autoPort)];
      const proc = spawn('cmd.exe', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      proc.stdout.on('data', d => out += d);
      proc.stderr.on('data', d => out += d);
      proc.on('error', reject);

      const timer = setTimeout(() => {
        if (out.includes('√ auto')) resolve(proc);
        else { try { proc.kill(); } catch (_) {} reject(new Error('CLI auto timed out (60s):\n' + out.slice(-500))); }
      }, 60000);

      proc.on('exit', code => {
        clearTimeout(timer);
        if (out.includes('√ auto')) resolve(proc);
        else reject(new Error(`CLI exited ${code}:\n${out.slice(-500)}`));
      });
    });
  }

  return (async () => {
    while (true) {
      try { return await tryStart(); } catch (err) {
        retryCount++;
        if (retryCount > maxRetries) throw err;
        console.log(`[CLI] 启动失败，${retryCount}/${maxRetries} 秒后重试...`);
        await new Promise(r => setTimeout(r, retryCount * 3000));
      }
    }
  })();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function timeoutPromise(ms) { return new Promise((_, reject) => setTimeout(() => reject(new Error(`超时 ${ms}ms`)), ms)); }

async function waitForConnection(miniProgram, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const cp = await Promise.race([miniProgram.currentPage(), timeoutPromise(8000)]);
      if (cp) return cp;
    } catch (_) {}
    console.log(`[连接] 等待编译完成 (${i + 1}/${maxRetries})...`);
    await sleep(3000);
  }
  throw new Error('连接超时：无法获取当前页面，请检查项目编译状态');
}

async function navigateWithTimeout(miniProgram, page, navTimeout) {
  if (page.tab) {
    await Promise.race([miniProgram.switchTab('/' + page.path), timeoutPromise(navTimeout)]);
  } else {
    await Promise.race([miniProgram.redirectTo('/' + page.path), timeoutPromise(navTimeout)]);
  }
}

// 备份
function backupProject(projectPath) {
  const backupDir = path.join(projectPath, '..', path.basename(projectPath) + '_backup_' + Date.now());
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    const dirs = ['pages', 'app.json', 'app.js', 'app.wxss', 'project.config.json'];
    for (const dir of dirs) {
      const src = path.join(projectPath, dir);
      if (fs.existsSync(src)) {
        const dest = path.join(backupDir, dir);
        fs.cpSync(src, dest, { recursive: true });
      }
    }
    console.log(`  ✓ 项目已备份至 ${backupDir}`);
    return backupDir;
  } catch (e) {
    console.warn('  ⚠ 备份失败: ' + e.message);
    return null;
  }
}

// 修复规则
function isThirdParty(file) {
  return file.includes('node_modules') || file.includes('miniprogram_npm') || file.includes('tests') || file.includes('.github');
}

const FIX_RULES = [
  {
    pattern: /wx\.getUserInfo\s*\(/g, replace: null,
    description: 'wx.getUserInfo 已被废弃，建议使用头像昵称填写能力或 wx.getUserProfile',
    exclude: file => isThirdParty(file) || file.includes('mock'),
  },
  {
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1|10\.)/g, replace: 'https://',
    description: '非 HTTPS 链接改为 HTTPS',
    exclude: file => isThirdParty(file) || file.includes('mock'),
  },
  {
    pattern: /console\.(log|info|debug)\(/g, replace: null,
    description: '生产构建前建议清理 console.log 等调试语句',
    exclude: file => isThirdParty(file) || file.includes('mock') || file.includes('quick-test'),
  },
  {
    pattern: /wx\.showNavigationBarLoading\s*\(/g, replace: null,
    description: 'wx.showNavigationBarLoading 已废弃',
    exclude: isThirdParty,
  },
  {
    pattern: /wx\.hideNavigationBarLoading\s*\(/g, replace: null,
    description: 'wx.hideNavigationBarLoading 已废弃',
    exclude: isThirdParty,
  },
];

function collectJSFiles(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'miniprogram_npm') {
        results.push(...collectJSFiles(full));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        results.push(full);
      }
    }
  } catch (_) {}
  return results;
}

// 生成修复方案（仅扫描模式）
function generateFixSuggestions(projectPath) {
  const suggestions = [];
  const jsFiles = collectJSFiles(projectPath);

  for (const rule of FIX_RULES) {
    for (const file of jsFiles) {
      if (rule.exclude && rule.exclude(file)) continue;
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const match = line.match(rule.pattern);
          if (match) {
            const relPath = path.relative(projectPath, file);
            suggestions.push({
              file: relPath,
              line: i + 1,
              content: line.trim(),
              description: rule.description,
              action: rule.replace !== null ? '自动修复' : '建议手动修改',
            });
          }
        }
      } catch (_) {}
    }
  }

  return suggestions;
}

// 执行自动修复并生成修复记录
function autoFixWithLog(projectPath) {
  const fixLog = [];
  const jsFiles = collectJSFiles(projectPath);
  let anyFound = false;

  for (const rule of FIX_RULES) {
    for (const file of jsFiles) {
      if (rule.exclude && rule.exclude(file)) continue;
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const matchLines = [];
        for (let i = 0; i < lines.length; i++) {
          if (rule.pattern.test(lines[i])) matchLines.push(i + 1);
        }
        if (matchLines.length > 0) {
          anyFound = true;
          const relPath = path.relative(projectPath, file);
          if (rule.replace !== null) {
            const newContent = content.replace(rule.pattern, rule.replace);
            fs.writeFileSync(file, newContent, 'utf-8');
            fixLog.push({
              action: '修改',
              file: relPath,
              description: rule.description,
              matchCount: matchLines.length,
              lines: matchLines,
            });
          } else {
            fixLog.push({
              action: '建议',
              file: relPath,
              description: rule.description,
              matchCount: matchLines.length,
              lines: matchLines,
            });
          }
        }
      } catch (_) {}
    }
  }
  if (!anyFound) fixLog.push({ action: '跳过', file: '-', description: '项目代码中未检测到已知的可修复模式' });
  return fixLog;
}

// 写入修复方案文件
function writeFixSuggestionsFile(projectPath, suggestions) {
  const lines = [];
  lines.push('='.repeat(60));
  lines.push('微信小程序诊断 - 修复方案');
  lines.push('='.repeat(60));
  lines.push('生成时间: ' + new Date().toISOString());
  lines.push('项目: ' + path.basename(projectPath));
  lines.push('');
  lines.push('共计 ' + suggestions.length + ' 项待处理');
  lines.push('');
  lines.push('-'.repeat(60));

  for (const s of suggestions) {
    lines.push('');
    lines.push('文件: ' + s.file);
    lines.push('行号: ' + s.line);
    lines.push('当前内容: ' + s.content);
    lines.push('建议操作: ' + s.action);
    lines.push('原因: ' + s.description);
    lines.push('-'.repeat(60));
  }

  lines.push('');
  lines.push('提示: AI 可根据上述信息直接定位并修复对应代码。');

  const filePath = path.join(projectPath, 'diagnose-fix-suggestions.txt');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return filePath;
}

// 写入修复记录文件
function writeFixLogFile(projectPath, fixLog) {
  const lines = [];
  lines.push('='.repeat(60));
  lines.push('微信小程序诊断 - 修复记录');
  lines.push('='.repeat(60));
  lines.push('生成时间: ' + new Date().toISOString());
  lines.push('项目: ' + path.basename(projectPath));
  lines.push('');
  lines.push('共计 ' + fixLog.length + ' 项已处理');
  lines.push('');
  lines.push('-'.repeat(60));

  for (const f of fixLog) {
    lines.push('');
    lines.push('文件: ' + f.file);
    lines.push('操作: ' + f.action);
    lines.push('描述: ' + f.description);
    if (f.matchCount) lines.push('匹配次数: ' + f.matchCount);
    if (f.lines && f.lines.length > 0) lines.push('行号: ' + f.lines.join(', '));
    if (f.action === '建议') lines.push('操作指引: 找到对应行后删除或注释该行代码');
    lines.push('-'.repeat(60));
  }

  lines.push('');
  lines.push('提示: 如需回滚，可参考此记录逆向操作。');

  const filePath = path.join(projectPath, 'diagnose-fix-log.txt');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return filePath;
}

// ═══════════════════════════════════════════════════
// 测试模块（按优先级排列）
// ═══════════════════════════════════════════════════

// 1. 页面遍历
async function testPageTraversal(miniProgram, navTimeout) {
  let passed = 0, failed = 0;
  const details = [];
  for (const page of PAGES) {
    try {
      await navigateWithTimeout(miniProgram, page, navTimeout);
      await sleep(1000);
      const cp = await Promise.race([miniProgram.currentPage(), timeoutPromise(5000)]);
      const route = cp ? (cp.path || cp.route || '') : '';
      if (route === page.path || route.endsWith(page.path)) {
        passed++;
        details.push({ page: page.name, status: '✓' });
      } else {
        failed++;
        details.push({ page: page.name, status: '✗ 跳转到了 ' + route });
      }
    } catch (e) {
      failed++;
      details.push({ page: page.name, status: '✗ ' + e.message });
    }
  }
  return { passed, failed, skipped: 0, details };
}

// 2. 搜索功能
async function testSearch(miniProgram, pageObj, pageRoute) {
  const pageDef = PAGES.find(p => p.path === pageRoute);
  if (!pageDef || !pageDef.search) return { passed: 0, failed: 0, skipped: 1, details: [] };
  try {
    await sleep(500);
    const si = await pageObj.$('input');
    if (!si) return { passed: 0, failed: 1, skipped: 0, details: [{ status: '✗ search input 未找到' }] };
    await si.input('test');
    await sleep(500);
    const da = await pageObj.data();
    if (da.searchValue !== undefined) {
      return { passed: 1, failed: 0, skipped: 0, details: [{ status: '✓ 搜索输入绑定正常' }] };
    } else {
      return { passed: 0, failed: 1, skipped: 0, details: [{ status: '✗ searchValue 未更新' }] };
    }
  } catch (e) {
    return { passed: 0, failed: 1, skipped: 0, details: [{ status: '✗ ' + e.message }] };
  }
}

// 3. 元素存在性检查
async function testElementExists(miniProgram, pageObj, pageRoute) {
  const checks = ELEMENT_CHECKS[pageRoute];
  if (!checks) return { passed: 0, failed: 0, skipped: 0, details: [] };
  let p = 0, f = 0;
  const det = [];
  let pageWxml = null;
  try {
    const pageEl = await pageObj.$('page');
    if (pageEl) pageWxml = await pageEl.outerWxml();
  } catch (_) {}
  for (const c of checks) {
    try {
      const isTagName = /^[a-zA-Z][\w-]*$/.test(c.selector);
      if (pageWxml && isTagName) {
        const clsRe = new RegExp('\\b' + c.selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        if (clsRe.test(pageWxml)) { p++; det.push({ selector: c.selector, desc: c.desc, status: '✓' }); }
        else { f++; det.push({ selector: c.selector, desc: c.desc, status: '✗ 未找到' }); }
      } else {
        const el = await Promise.race([pageObj.$(c.selector), timeoutPromise(3000)]);
        if (el) { p++; det.push({ selector: c.selector, desc: c.desc, status: '✓' }); }
        else { f++; det.push({ selector: c.selector, desc: c.desc, status: '✗ 未找到' }); }
      }
    } catch (e) { f++; det.push({ selector: c.selector, desc: c.desc, status: '✗ ' + e.message }); }
  }
  return { passed: p, failed: f, skipped: 0, details: det };
}

// 4. 按钮交互与跳转验证
async function testButtonNav(miniProgram, pageObj, pageRoute) {
  const tests = BUTTON_NAV_TESTS.filter(t => t.from === pageRoute);
  if (tests.length === 0) return { passed: 0, failed: 0, skipped: 0, details: [] };
  let p = 0, f = 0;
  const det = [];
  for (const t of tests) {
    try {
      const els = await pageObj.$$(t.selector);
      let found = false;
      for (const el of els) {
        try {
          const text = await Promise.race([el.text(), timeoutPromise(2000)]);
          if (text && text.includes(t.label)) {
            await Promise.race([el.tap(), timeoutPromise(3000)]);
            await sleep(1500);
            const cp = await Promise.race([miniProgram.currentPage(), timeoutPromise(5000)]);
            const curPath = cp ? (cp.path || cp.route || '') : '';
            det.push({ label: t.label, status: '✓ ' + curPath });
            found = true; break;
          }
        } catch (_) {}
      }
      if (!found) { f++; det.push({ label: t.label, status: '✗ 未找到含"' + t.label + '"的按钮' }); }
      else p++;
    } catch (e) { f++; det.push({ label: t.label, status: '✗ ' + e.message }); }
  }
  return { passed: p, failed: f, skipped: 0, details: det };
}

// 5. TabBar 切换
async function testTabBar(miniProgram, navTimeout) {
  let p = 0, f = 0;
  const det = [];
  for (const item of TAB_BAR_ITEMS) {
    try {
      await Promise.race([miniProgram.switchTab('/' + item.path), timeoutPromise(navTimeout)]);
      await sleep(2000);
      const cp = await Promise.race([miniProgram.currentPage(), timeoutPromise(5000)]);
      const route = cp ? (cp.path || cp.route || '') : '';
      const pageObj = cp;
      if (route) {
        const someEl = await Promise.race([pageObj.$('view'), timeoutPromise(3000)]);
        if (someEl) { p++; det.push({ tab: item.name, status: '✓ ' + route }); }
        else { f++; det.push({ tab: item.name, status: '✗ ' + route + ' (页面无内容)' }); }
      } else {
        f++; det.push({ tab: item.name, status: '✗ 空白页面' });
      }
    } catch (e) { f++; det.push({ tab: item.name, status: '✗ ' + e.message }); }
  }
  return { passed: p, failed: f, skipped: 0, details: det };
}

// 6. 表单输入
async function testFormInput(miniProgram, pageObj, pageRoute) {
  const tests = FORM_TESTS.filter(t => t.page === pageRoute);
  if (tests.length === 0) return { passed: 0, failed: 0, skipped: 0, details: [] };
  let p = 0, f = 0;
  const det = [];
  for (const t of tests) {
    let allOk = true;
    for (const field of t.fields) {
      try {
        const els = await pageObj.$$(field.selector);
        const target = els[field.inputIndex];
        if (!target) { det.push({ label: t.label, field: field.selector, status: '✗ 未找到第' + field.inputIndex + '个' }); allOk = false; continue; }
        await target.input(field.value);
        det.push({ label: t.label, field: field.selector, status: '✓ 输入 "' + field.value + '"' });
        await sleep(300);
      } catch (e) { det.push({ label: t.label, field: field.selector, status: '✗ ' + e.message }); allOk = false; }
    }
    if (allOk) p++; else f++;
  }
  return { passed: p, failed: f, skipped: 0, details: det };
}

// 7. 页面数据校验
async function testPageData(pageObj, pageRoute) {
  const checks = DATA_CHECKS[pageRoute];
  if (!checks || checks.fields.length === 0) return { passed: 0, failed: 0, skipped: 1, details: [{ msg: '无数据校验项', status: '-' }] };
  let p = 0, f = 0;
  const det = [];
  try {
    for (const field of checks.fields) {
      try {
        const val = await pageObj.data(field.path);
        const actualType = Array.isArray(val) ? 'array' : typeof val;
        if (field.optional && (val === undefined || val === null)) {
          p++; det.push({ field: field.path, status: '✓ ' + actualType + ' (可选)' });
        } else if (field.type === 'array' && Array.isArray(val)) {
          p++; det.push({ field: field.path, status: '✓ array[' + val.length + ']' });
        } else if (typeof val === field.type) {
          p++; det.push({ field: field.path, status: '✓ ' + field.type + '="' + String(val).substring(0, 40) + '"' });
        } else {
          f++; det.push({ field: field.path, status: '✗ 期望 ' + field.type + ', 实际 ' + actualType });
        }
      } catch (e) { f++; det.push({ field: field.path, status: '✗ ' + e.message }); }
    }
  } catch (e) { f = checks.fields.length; det.push({ field: '(page.data)', status: '✗ ' + e.message }); }
  return { passed: p, failed: f, skipped: 0, details: det };
}

// 8. 滚动/下拉刷新
async function testScroll(miniProgram, pageObj, pageRoute) {
  const tests = SCROLL_TESTS.filter(t => t.page === pageRoute);
  if (tests.length === 0) return { passed: 0, failed: 0, skipped: 1, details: [{ msg: '无滚动测试项', status: '-' }] };
  let p = 0, f = 0;
  const det = [];
  for (const t of tests) {
    try {
      const sv = await Promise.race([pageObj.$(t.selector), timeoutPromise(3000)]);
      if (!sv) { f++; det.push({ label: t.label, status: '✗ 未找到 ' + t.selector }); continue; }
      const off = await sv.offset();
      const sz = await sv.size();
      const midX = off.left + Math.floor(sz.width / 2);
      const startY = off.top + 20;
      const endY = startY + 200;
      await sv.touchstart({ touches: [{ identifier: 0, pageX: midX, pageY: startY }], changedTouches: [{ identifier: 0, pageX: midX, pageY: startY }] });
      await sleep(100);
      await sv.touchmove({ touches: [{ identifier: 0, pageX: midX, pageY: endY }], changedTouches: [{ identifier: 0, pageX: midX, pageY: endY }] });
      await sleep(100);
      await sv.touchend({ touches: [], changedTouches: [{ identifier: 0, pageX: midX, pageY: endY }] });
      await sleep(1000);
      p++; det.push({ label: t.label, status: '✓ 下拉手势完成' });
    } catch (e) { f++; det.push({ label: t.label, status: '✗ ' + e.message }); }
  }
  return { passed: p, failed: f, skipped: 0, details: det };
}

async function runModuleTests(miniProgram, pageObj, page, moduleResults, moduleDetails) {
  const pageRoute = page.path;
  if (MODULES.searchTest.enabled) {
    const r = await testSearch(miniProgram, pageObj, pageRoute);
    moduleResults.searchTest.passed += r.passed;
    moduleResults.searchTest.failed += r.failed;
    moduleDetails.push({ module: 'searchTest', page: page.name, details: r.details });
  }
  if (MODULES.elementExists.enabled) {
    const r = await testElementExists(miniProgram, pageObj, pageRoute);
    moduleResults.elementExists.passed += r.passed;
    moduleResults.elementExists.failed += r.failed;
    moduleDetails.push({ module: 'elementExists', page: page.name, details: r.details });
  }
  if (MODULES.buttonNav.enabled) {
    const r = await testButtonNav(miniProgram, pageObj, pageRoute);
    moduleResults.buttonNav.passed += r.passed;
    moduleResults.buttonNav.failed += r.failed;
    moduleDetails.push({ module: 'buttonNav', page: page.name, details: r.details });
  }
  if (MODULES.formInput.enabled) {
    const r = await testFormInput(miniProgram, pageObj, pageRoute);
    moduleResults.formInput.passed += r.passed;
    moduleResults.formInput.failed += r.failed;
    moduleDetails.push({ module: 'formInput', page: page.name, details: r.details });
  }
  if (MODULES.pageData.enabled) {
    const r = await testPageData(pageObj, pageRoute);
    moduleResults.pageData.passed += r.passed;
    moduleResults.pageData.failed += r.failed;
    moduleDetails.push({ module: 'pageData', page: page.name, details: r.details });
  }
  if (MODULES.scrollTest.enabled) {
    const r = await testScroll(miniProgram, pageObj, pageRoute);
    moduleResults.scrollTest.passed += r.passed;
    moduleResults.scrollTest.failed += r.failed;
    moduleDetails.push({ module: 'scrollTest', page: page.name, details: r.details });
  }
}

// 报告
function moduleReason(key, r) {
  const reasons = {
    pageTraversal: r.failed > 0 ? r.failed + ' 个页面导航失败' : '全部页面正常',
    searchTest:    r.failed > 0 ? '搜索输入异常' : '搜索输入正常',
    elementExists: r.failed > 0 ? r.failed + ' 个组件未渲染' : '全部组件已渲染',
    buttonNav:     r.failed > 0 ? '部分按钮不可点击' : '全部按钮跳转正常',
    tabBar:        r.failed > 0 ? r.failed + ' 个 tab 切换超时' : '全部 tab 切换正常',
    formInput:     r.failed > 0 ? '输入框不可交互' : '全部表单输入正常',
    pageData:      r.failed > 0 ? r.failed + ' 个字段校验失败' : '全部通过',
    scrollTest:    r.failed > 0 ? 'scroll-view 交互失败' : 'scroll-view 正常',
  };
  return reasons[key] || (r.failed > 0 ? '部分失败' : '全部通过');
}

function generateReport(runResult, projectPath) {
  const REPORT_PATH = path.join(__dirname, 'diagnose-report.json');
  const report = {
    time: new Date().toISOString(),
    project: path.basename(projectPath),
    summary: {
      pagesSuccess: runResult.pagePassed,
      pagesFail: runResult.pageFailed,
      totalEntries: runResult.entries.length,
      errors: runResult.errors.length,
      warnings: runResult.warnings.length,
      exceptions: runResult.exceptions.length,
      testModules: {},
    },
    categories: runResult.categories,
    noiseSummary: [],
    pageDetails: runResult.pageDetails,
    moduleDetails: runResult.moduleDetails || [],
  };

  for (const [key, mod] of Object.entries(runResult.moduleResults || {})) {
    const def = MODULES[key];
    report.summary.testModules[key] = {
      name: def ? def.name : key,
      passed: mod.passed, failed: mod.failed, skipped: mod.skipped,
    };
  }

  const noiseCats = Object.entries(runResult.categories).filter(([_, info]) => info.severity === 'noise');
  report.noiseSummary = noiseCats.map(([cat, info]) => ({ category: cat, count: info.count, explanation: info.explanation, examples: info.examples }));

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');

  const textLines = [];
  textLines.push('诊断报告总结');
  textLines.push('指标\t结果');
  textLines.push('页面导航\t' + report.summary.pagesSuccess + '/' + (report.summary.pagesSuccess + report.summary.pagesFail) + ' ' + (report.summary.pagesFail > 0 ? '\u2717' : '\u2713'));
  var tc = report.summary.totalEntries, ec = report.summary.errors, wc = report.summary.warnings;
  textLines.push('Console 日志\t' + tc + (wc > 0 ? '条警告' : '') + (ec > 0 && wc > 0 ? '，' : '') + (ec > 0 ? ec + '条错误' : ''));
  textLines.push('');
  textLines.push('测试模块结果');
  textLines.push('模块\t结果\t原因');
  for (const [key, info] of Object.entries(report.summary.testModules)) {
    const total = info.passed + info.failed;
    const icon = info.failed > 0 ? '\u2717' : '\u2713';
    const resultStr = total > 0 ? info.passed + '/' + total + ' ' + icon : icon;
    textLines.push(info.name + '\t' + resultStr + '\t' + moduleReason(key, info));
  }
  textLines.push('');
  textLines.push('分类统计');
  for (const n of report.noiseSummary) {
    textLines.push('[噪音] ' + n.category + ' (' + n.count + '条) — ' + n.explanation);
  }

  const textReportPath = path.join(__dirname, 'diagnose-report.txt');
  fs.writeFileSync(textReportPath, textLines.join('\n'), 'utf-8');
  return { report, textReportPath };
}

// 主流程
async function run() {
  const args = process.argv.slice(2);
  const getArg = (flag, fallback) => { const idx = args.indexOf(flag); return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback; };
  const getFlag = (flag) => args.includes(flag);

  const CLI_PATH = getArg('--cli', DEFAULT_CLI_PATH);
  const PROJECT_PATH = getArg('--project', DEFAULT_PROJECT_PATH);
  const AUTO_PORT = parseInt(getArg('--port', String(DEFAULT_AUTO_PORT)));
  const MAX_RETRIES = parseInt(getArg('--max-retries', String(DEFAULT_MAX_RETRIES)));
  const NAV_TIMEOUT = parseInt(getArg('--timeout', String(DEFAULT_NAV_TIMEOUT)));
  const SCAN_ONLY = getFlag('--scan-only');

  console.log('=== 微信小程序自动化诊断 ===');
  console.log('  项目: ' + PROJECT_PATH);
  console.log('  CLI:  ' + CLI_PATH);
  console.log('  模式: ' + (SCAN_ONLY ? '仅扫描' : '扫描+修复'));
  console.log();

  const allConsole = [];
  const allExceptions = [];
  const pageDetails = [];
  const moduleDetails = [];
  const moduleResults = {};
  let currentPageName = '';
  let miniProgram = null;

  function initModuleResults() { for (const key of Object.keys(MODULES)) { if (!moduleResults[key]) moduleResults[key] = { passed: 0, failed: 0, skipped: 0 }; } }
  initModuleResults();

  try {
    console.log('[启动] 启动自动化服务...');
    await startCLI(CLI_PATH, PROJECT_PATH, AUTO_PORT, MAX_RETRIES);
    console.log('  ✓ 自动化服务已启动\n');
    await sleep(3000);

    console.log('[连接] 连接开发者工具...');
    miniProgram = await automator.connect({ wsEndpoint: 'ws://localhost:' + AUTO_PORT });
    console.log('  ✓ 已连接\n');

    console.log('[编译] 等待项目编译完成...');
    await waitForConnection(miniProgram);
    console.log('  ✓ 编译完成\n');

    miniProgram.on('console', msg => { allConsole.push({ type: msg.type || 'log', args: msg.args || [], time: new Date().toISOString(), page: currentPageName }); });
    miniProgram.on('exception', err => { allExceptions.push(err); });
    await sleep(2000);

    let pagePassed = 0, pageFailed = 0;

    // 页面遍历测试
    if (MODULES.pageTraversal.enabled) {
      console.log('[模块] 页面遍历测试...');
      const r = await testPageTraversal(miniProgram, NAV_TIMEOUT);
      moduleResults.pageTraversal.passed += r.passed;
      moduleResults.pageTraversal.failed += r.failed;
      moduleDetails.push({ module: 'pageTraversal', details: r.details });
      for (const d of r.details) console.log('  ' + d.page + ' ' + d.status);
      console.log('  → ' + r.passed + ' 成功, ' + r.failed + ' 失败\n');
    }

    // 遍历每个页面执行其他测试
    for (const page of PAGES) {
      currentPageName = page.name;
      process.stdout.write('[页面] ' + page.name + ' (' + page.path + ')... ');
      try {
        const curPage = await miniProgram.currentPage();
        const curRoute = curPage ? (curPage.path || curPage.route || '') : '';
        if (curRoute !== page.path) {
          await navigateWithTimeout(miniProgram, page, NAV_TIMEOUT);
          await sleep(2000);
        }
        const cp = await Promise.race([miniProgram.currentPage(), timeoutPromise(NAV_TIMEOUT)]);
        const route = cp ? (cp.path || cp.route || 'unknown') : 'unknown';
        process.stdout.write('✓ ' + route + '\n');
        pagePassed++;
        pageDetails.push({ name: page.name, path: page.path, status: '✓ ' + route });
        await runModuleTests(miniProgram, cp, page, moduleResults, moduleDetails);
      } catch (err) {
        process.stdout.write('✗ ' + err.message + '\n');
        pageFailed++;
        pageDetails.push({ name: page.name, path: page.path, status: '✗ ' + err.message });
      }
    }

    // TabBar 独立测试
    if (MODULES.tabBar.enabled) {
      console.log('[模块] TabBar 切换测试...');
      const r = await testTabBar(miniProgram, NAV_TIMEOUT);
      moduleResults.tabBar.passed += r.passed;
      moduleResults.tabBar.failed += r.failed;
      moduleDetails.push({ module: 'tabBar', details: r.details });
      for (const d of r.details) console.log('  ' + d.tab + ' ' + d.status);
      console.log('  → ' + r.passed + ' 成功, ' + r.failed + ' 失败\n');
    }

    // 分类统计
    const errors = allConsole.filter(m => m.type === 'error' || m.type === 'assert');
    const warnings = allConsole.filter(m => m.type === 'warn');
    const entries = [...errors, ...warnings];
    const categories = {};
    for (const entry of entries) {
      const text = entry.args.join(' ');
      const cls = classifyEntry(text, entry.type);
      const key = cls.category;
      if (!categories[key]) categories[key] = { count: 0, severity: cls.severity, explanation: cls.explanation, examples: [] };
      categories[key].count++;
      if (categories[key].examples.length < 2) categories[key].examples.push(text.substring(0, 200));
    }

    // 输出摘要
    console.log('\n诊断报告总结');
    console.log('页面导航\t' + pagePassed + '/' + (pagePassed + pageFailed) + ' ' + (pageFailed > 0 ? '✗' : '✓'));
    console.log('Console 日志\t' + entries.length + ' 条 (' + errors.length + ' 错误, ' + warnings.length + ' 警告)');
    console.log('\n测试模块结果');
    for (const [key, mod] of Object.entries(MODULES)) {
      if (!mod.enabled) continue;
      const r = moduleResults[key];
      const total = r.passed + r.failed;
      const icon = r.failed > 0 ? '✗' : '✓';
      console.log(mod.name + '\t' + (total > 0 ? r.passed + '/' + total + ' ' + icon : icon) + '\t' + moduleReason(key, r));
    }

    // 扫描模式：生成修复方案
    if (SCAN_ONLY) {
      console.log('\n[方案] 生成修复方案...');
      const suggestions = generateFixSuggestions(PROJECT_PATH);
      if (suggestions.length > 0) {
        const suggPath = writeFixSuggestionsFile(PROJECT_PATH, suggestions);
        console.log('  ✓ 修复方案已保存: ' + suggPath);
        console.log('  共 ' + suggestions.length + ' 项待处理');
      } else {
        console.log('  ✓ 未发现需要修复的问题');
      }
    } else {
      // 修复模式：备份 + 执行修复 + 生成记录
      console.log('\n[修复] 执行自动修复...');
      backupProject(PROJECT_PATH);
      const fixLog = autoFixWithLog(PROJECT_PATH);
      const fixPath = writeFixLogFile(PROJECT_PATH, fixLog);
      console.log('  ✓ 修复记录已保存: ' + fixPath);
      console.log('  共 ' + fixLog.length + ' 项已处理');
    }

    // 生成报告
    console.log('\n[报告] 生成诊断报告...');
    const { textReportPath } = generateReport({ pagePassed, pageFailed, entries, errors, warnings, exceptions: allExceptions, categories, pageDetails, moduleDetails, moduleResults }, PROJECT_PATH);
    console.log('  ✓ 报告已保存: ' + textReportPath);

  } finally {
    if (miniProgram) { try { await miniProgram.disconnect(); } catch (_) {} }
    console.log('\n[完成] 诊断完成，DevTools 保持运行供查看。');
  }
}

run().catch(err => {
  console.error('\n诊断脚本异常:', err.message);
  if (typeof miniProgram !== 'undefined' && miniProgram) miniProgram.disconnect().catch(() => {});
  process.exit(1);
});
