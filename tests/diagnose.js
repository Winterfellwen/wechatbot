const automator = require('miniprogram-automator');
const { PAGES, sleep, startCLI, killWechatProcesses, navigateWithRetry, testSearchInteraction } = require('./shared');

const CONSOLE_LIMIT = 50;

async function run() {
  const jsonMode = process.argv.includes('--json');
  const log = jsonMode ? () => {} : (...args) => console.log(...args);
  const write = jsonMode ? () => {} : (...args) => process.stdout.write(...args);
  const report = { pages: { passed: 0, failed: 0, details: [] }, search: { passed: 0, failed: 0, details: [] }, console: { errors: [], warnings: [] }, exceptions: [], timing: {} };

  log('=== 微信小程序自动化诊断 ===\n');

  await killWechatProcesses();
  await sleep(1000);

  log('[启动] 启动自动化服务...');
  const cliProc = await startCLI();
  log('  OK 自动化服务已启动\n');
  await sleep(3000);

  let miniProgram;
  try {
    log('[连接] 连接开发者工具...');
    miniProgram = await automator.connect({ wsEndpoint: `ws://localhost:9420` });
    log('  OK 已连接\n');

    miniProgram.on('console', msg => {
      const entry = { type: msg.type || 'log', args: msg.args || [], time: new Date().toISOString() };
      if (msg.type === 'error' || msg.type === 'assert') report.console.errors.push(entry);
      else if (msg.type === 'warn') report.console.warnings.push(entry);
    });
    miniProgram.on('exception', err => { report.exceptions.push({ message: err.message, stack: err.stack }); });

    await sleep(2000);

    for (const pageInfo of PAGES) {
      const label = `[页面] ${pageInfo.name} (${pageInfo.path})`;
      write(`${label}... `);

      const nav = await navigateWithRetry(miniProgram, pageInfo, 1);
      report.timing[pageInfo.path] = nav.timeMs || 0;

      if (!nav.ok) {
        write(`FAIL ${nav.error}\n`);
        report.pages.failed++;
        report.pages.details.push({ name: pageInfo.name, ok: false, error: nav.error });
        continue;
      }

      write(`OK ${nav.route} (${nav.timeMs}ms)\n`);
      report.pages.passed++;
      report.pages.details.push({ name: pageInfo.name, ok: true, route: nav.route, timeMs: nav.timeMs });

      if (pageInfo.search) {
        write(`  [搜索] `);
        const results = await testSearchInteraction(miniProgram, await miniProgram.currentPage(), pageInfo);
        for (const r of results) {
          write(`${r.ok ? 'OK' : 'FAIL'} ${r.msg}\n          `);
          if (r.ok) report.search.passed++; else report.search.failed++;
          report.search.details.push(r);
        }
        write(`\n`);
      }
    }

    if (jsonMode) {
      console.log(JSON.stringify({
        pages: { passed: report.pages.passed, failed: report.pages.failed, total: PAGES.length },
        search: { passed: report.search.passed, failed: report.search.failed },
        console: { errors: report.console.errors.length, warnings: report.console.warnings.length },
        exceptions: report.exceptions.length,
        timing: report.timing,
      }));
    } else {
      const totalPages = PAGES.length;
      const totalSearch = report.search.passed + report.search.failed;

      log('\n=== 页面路由结果 ===');
      log(`${report.pages.passed}/${totalPages} 成功, ${report.pages.failed}/${totalPages} 失败`);
      for (const d of report.pages.details) {
        if (!d.ok) log(`  FAIL ${d.name}: ${d.error}`);
      }

      if (totalSearch > 0) {
        log('\n=== 搜索测试结果 ===');
        log(`${report.search.passed}/${totalSearch} 成功, ${report.search.failed}/${totalSearch} 失败`);
      }

      log('\n=== Console 消息 ===');
      log(`errors: ${report.console.errors.length}, warnings: ${report.console.warnings.length}`);
      for (const e of report.console.errors.slice(0, CONSOLE_LIMIT)) log(`  [${e.time}] ${e.args.join(' | ')}`);
      if (report.console.errors.length > CONSOLE_LIMIT) log(`  ... (${report.console.errors.length - CONSOLE_LIMIT} more)`);
      for (const w of report.console.warnings.slice(0, CONSOLE_LIMIT)) log(`  ${w.args.join(' | ')}`);

      log('\n=== JS 异常 ===');
      log(`${report.exceptions.length} 条`);
      for (const ex of report.exceptions) {
        log(`  ${ex.message}`);
        if (ex.stack) log(`  Stack: ${ex.stack.substring(0, 200)}`);
      }

      try {
        const appState = await miniProgram.evaluate(() => {
          const app = getApp();
          return JSON.stringify({ globalData: app.globalData || {} });
        });
        log('\n=== App 状态 ===');
        log(`  ${appState.substring(0, 500)}`);
      } catch (e) { /* skip */ }

      try {
        const sysInfo = await miniProgram.callWxMethod('getSystemInfoSync');
        log('\n=== 系统信息 ===');
        log(`  ${JSON.stringify(sysInfo, null, 2).substring(0, 500)}`);
      } catch (e) { /* skip */ }

      log('\nOK 诊断完成');
    }
  } finally {
    if (miniProgram) miniProgram.disconnect();
  }
}

run().catch(err => {
  console.error('\n诊断脚本异常:', err.message);
  process.exit(1);
});
