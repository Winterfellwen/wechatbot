// fortune 模块自动化诊断脚本
// 用法：先在微信开发者工具中开启自动化端口（设置→安全设置→服务端口开启）
// 然后确保 fortune 项目已打开，运行：node tests/fortune-diagnose.js
const automator = require('miniprogram-automator');
const path = require('path');

// 微信开发者工具 cli 路径（用 cli.js 避免 .bat 中文路径问题）
const WX_CLI = 'E:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.js';

async function run() {
  let miniProgram;
  try {
    // 尝试连接已打开的实例
    console.log('[1] 尝试连接微信开发者工具 (ws://localhost:9420)...');
    miniProgram = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
    console.log('[1] ✓ 已连接');
  } catch (e) {
    console.log('[1] 连接失败，尝试启动微信开发者工具...');
    try {
      miniProgram = await automator.launch({
        cliPath: WX_CLI,
        projectPath: path.join(__dirname, '..', 'fortune'),
      });
      console.log('[1] ✓ 已启动并连接');
    } catch (e2) {
      console.error('[1] ✗ 启动失败:', e2.message);
      console.error('请手动打开微信开发者工具，并开启自动化端口');
      process.exit(1);
    }
  }

  const allLogs = [];
  miniProgram.on('console', msg => {
    const text = msg.args.join(' ');
    allLogs.push({ type: msg.type, text, time: new Date().toISOString() });
    if (msg.type === 'error' || msg.type === 'warn') {
      console.log(`[${msg.type}] ${text.substring(0, 500)}`);
    }
  });

  miniProgram.on('exception', err => {
    console.log('[exception]', JSON.stringify(err).substring(0, 500));
  });

  // 等待初始化
  await new Promise(r => setTimeout(r, 3000));

  // === 测试首页 ===
  console.log('\n=== 测试首页 pages/index/index ===');
  try {
    await miniProgram.reLaunch('/fortune/pages/index/index');
    await new Promise(r => setTimeout(r, 3000));
    const page = await miniProgram.currentPage();
    console.log('  route:', page.path);

    // 检查渲染的 WXML
    const pageEl = await page.$('.page-container');
    if (pageEl) {
      const wxml = await pageEl.outerWxml();
      console.log('  首页WXML长度:', wxml.length);
      // 检查背景class是否存在
      if (wxml.includes('bg-neutral')) {
        console.log('  ✓ bg-neutral 背景class存在');
      } else {
        console.log('  ✗ bg-neutral 背景class缺失');
      }
      // 检查档案卡
      if (wxml.includes('profile-card')) {
        console.log('  ✓ 档案卡存在');
      }
      // 检查grid
      if (wxml.includes('grid-chinese')) {
        console.log('  ✓ 易学入口存在');
      }
    } else {
      console.log('  ✗ .page-container 元素未找到');
    }

    // 检查页面数据
    const data = await page.data();
    console.log('  页面data:', JSON.stringify(data).substring(0, 300));

    // 尝试点击易学命理入口
    console.log('\n  --- 尝试点击易学命理 ---');
    const gridChinese = await page.$('.grid-chinese');
    if (gridChinese) {
      await gridChinese.tap();
      await new Promise(r => setTimeout(r, 3000));
      const afterTap = await miniProgram.currentPage();
      console.log('  点击后路由:', afterTap.path);
      if (afterTap.path.includes('reading')) {
        console.log('  ✓ 点击成功，跳转到解读页');
      } else {
        console.log('  ✗ 点击未跳转，仍在:', afterTap.path);
        // 检查是否有 profile 未填写
        if (JSON.stringify(data).includes('profile') && !data.profile) {
          console.log('  原因: profile 未填写，点击触发了弹窗提示');
        }
      }
    } else {
      console.log('  ✗ .grid-chinese 元素未找到');
    }
  } catch (e) {
    console.log('  ✗ 首页测试失败:', e.message);
  }

  // === 测试解读页 ===
  console.log('\n=== 测试解读页 pages/reading/reading ===');
  try {
    // 先确保有 profile（通过 storage 注入）
    await miniProgram.evaluate(() => {
      wx.setStorageSync('fortune_profile', {
        name: '测试',
        birthday: '1990-03-15',
        gender: 'male',
        birthTime: '子时'
      });
      console.log('已注入测试profile');
    });
    await new Promise(r => setTimeout(r, 1000));

    await miniProgram.reLaunch('/fortune/pages/reading/reading?category=chinese');
    await new Promise(r => setTimeout(r, 5000));
    const page = await miniProgram.currentPage();
    console.log('  route:', page.path);

    const data = await page.data();
    console.log('  category:', data.category);
    console.log('  themeClass:', data.themeClass);
    console.log('  readings数量:', data.readings ? data.readings.length : 0);
    if (data.readings && data.readings.length > 0) {
      console.log('  第一项:', JSON.stringify(data.readings[0]).substring(0, 200));
      console.log('  summary:', data.readings[0].summary);
    }
    console.log('  needTimeWarn:', data.needTimeWarn);

    // 检查WXML
    const container = await page.$('.page-container');
    if (container) {
      const wxml = await container.outerWxml();
      console.log('  解读页WXML长度:', wxml.length);
      if (wxml.includes('bg-chinese')) {
        console.log('  ✓ bg-chinese 背景存在');
      }
      if (wxml.includes('card')) {
        console.log('  ✓ 卡片存在');
      }
    }

    // 等待流式输出（最多15秒）
    console.log('\n  --- 等待AI流式输出 (15秒) ---');
    await new Promise(r => setTimeout(r, 15000));
    const dataAfter = await page.data();
    if (dataAfter.readings && dataAfter.readings.length > 0) {
      const r0 = dataAfter.readings[0];
      console.log('  八字状态:', r0.status);
      console.log('  八字内容长度:', r0.content ? r0.content.length : 0);
      if (r0.content && r0.content.length > 0) {
        console.log('  ✓ 八字已有内容输出');
        console.log('  内容预览:', r0.content.substring(0, 100));
      } else {
        console.log('  ✗ 八字无内容输出');
      }
    }
  } catch (e) {
    console.log('  ✗ 解读页测试失败:', e.message);
  }

  // === 汇总控制台日志 ===
  console.log('\n\n=== 控制台错误/警告汇总 ===');
  const errors = allLogs.filter(l => l.type === 'error');
  const warns = allLogs.filter(l => l.type === 'warn');
  console.log('错误数:', errors.length, ' 警告数:', warns.length);
  for (const e of errors) {
    console.log(`[error] ${e.text.substring(0, 500)}`);
  }
  for (const w of warns) {
    console.log(`[warn] ${w.text.substring(0, 300)}`);
  }

  await miniProgram.disconnect();
  console.log('\n[完成] 已断开连接');
  process.exit(0);
}

run().catch(e => {
  console.error('致命错误:', e);
  process.exit(1);
});
