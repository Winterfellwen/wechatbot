const automator = require('miniprogram-automator');

async function run() {
  const miniProgram = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
  console.log('[连接] ✓ 已连接');
  
  const allConsole = [];
  miniProgram.on('console', msg => {
    const text = msg.args.join(' ');
    if (text.includes('not-found') || text.includes('not found') || msg.type === 'error' || msg.type === 'warn') {
      allConsole.push({ type: msg.type, text, time: new Date().toISOString() });
      console.log(`[${msg.type}] ${text.substring(0, 300)}`);
    }
  });
  
  miniProgram.on('exception', err => {
    console.log('[exception]', JSON.stringify(err));
  });
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Test the 2 most likely pages
  const pages = [
    { path: 'pages/index/index', name: '首页', tab: true },
    { path: 'word/pages/index/index', name: 'Word工具' },
    { path: 'word/pages/editor/editor', name: 'Word编辑器' },
    { path: 'pdf/pages/index/index', name: 'PDF工具箱' },
    { path: 'german/pages/learn/learn', name: '德语学习' },
    { path: 'japanese/pages/learn/learn', name: '日语学习' },
    { path: 'smart-teacher/pages/chat/chat', name: '智能老师' },
  ];
  
  for (const p of pages) {
    try {
      console.log(`\n[导航] ${p.name}...`);
      if (p.tab) {
        await Promise.race([miniProgram.switchTab('/' + p.path), new Promise((_, rj) => setTimeout(() => rj('timeout'), 15000))]);
      } else {
        await Promise.race([miniProgram.redirectTo('/' + p.path), new Promise((_, rj) => setTimeout(() => rj('timeout'), 15000))]);
      }
      await new Promise(r => setTimeout(r, 3000));
      const cp = await miniProgram.currentPage();
      console.log(`  route: ${cp.path}`);
      
      // Get page wxml to check for components
      try {
        const pageEl = await cp.$('page');
        if (pageEl) {
          const wxml = await pageEl.outerWxml();
          // Check for wx://not-found in rendered WXML
          if (wxml.includes('not-found') || wxml.includes('wx://')) {
            console.log(`  ⚠ WXML contains placeholder references`);
          }
        }
      } catch(e) {}
    } catch(e) {
      console.log(`  ✗ ${e.message}`);
    }
  }
  
  console.log(`\n\n=== 控制台错误/警告汇总 ===`);
  for (const c of allConsole) {
    console.log(`[${c.type}] ${c.text}`);
  }
  if (allConsole.length === 0) console.log('(无)');
  
  await miniProgram.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
