const automator = require('miniprogram-automator');
const { startCLI, killWechatProcesses, sleep } = require('./shared');

async function run() {
  let passed = 0, failed = 0;
  const ok = (msg) => { console.log(`  OK ${msg}`); passed++; };
  const fail = (msg) => { console.log(`  FAIL ${msg}`); failed++; };

  console.log('=== 基础自动化测试 ===\n');

  await killWechatProcesses();
  await sleep(1000);

  console.log('[1/5] 启动自动化服务...');
  await startCLI();
  ok('CLI auto started');
  await sleep(3000);

  let miniProgram;
  try {
    console.log('[2/5] 连接开发者工具...');
    miniProgram = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
    ok('connected to devtools');

    console.log('[3/5] 监听控制台...');
    const errors = [];
    miniProgram.on('console', msg => {
      if (msg.type === 'error') errors.push(msg.args.join(' '));
    });
    miniProgram.on('exception', err => { errors.push(`Exception: ${err.message}`); });
    ok('console listener attached');

    console.log('[4/5] 页面导航测试...');
    const pages = [
      { path: '/pages/index/index', name: '首页', tab: true },
      { path: '/pages/user/user', name: '个人中心', tab: true },
    ];
    for (const p of pages) {
      try {
        if (p.tab) await miniProgram.switchTab(p.path);
        else await miniProgram.navigateTo(p.path);
        await sleep(1500);
        const cp = await miniProgram.currentPage();
        const route = cp ? cp.path : 'unknown';
        ok(`navigated to ${p.name} -> ${route}`);
      } catch (e) {
        fail(`navigate to ${p.name}: ${e.message}`);
      }
    }

    console.log('[5/5] 系统信息采集...');
    try {
      const sysInfo = await miniProgram.callWxMethod('getSystemInfoSync');
      console.log(`  SDK: ${sysInfo.SDKVersion}, Brand: ${sysInfo.brand}, Model: ${sysInfo.model}`);
      ok('system info retrieved');
    } catch (e) {
      fail(`system info: ${e.message}`);
    }

    console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
    if (errors.length > 0) {
      console.log(`\nConsole errors (${errors.length}):`);
      errors.forEach(e => console.log(`  ${e}`));
    }
  } finally {
    if (miniProgram) miniProgram.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\n测试异常:', err.message);
  process.exit(1);
});
