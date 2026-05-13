const automator = require('miniprogram-automator');
const AUTO_PORT = 9420;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label || '操作'}超时 (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function run() {
  console.log('='.repeat(60));
  console.log('  微信小程序全功能自动化诊断 — 页面路由 + 搜索 + 按钮交互');
  console.log('='.repeat(60));

  const miniProgram = await automator.connect({ wsEndpoint: `ws://localhost:${AUTO_PORT}` });
  console.log('\n✓ 已连接\n');

  const allConsole = [], allExceptions = [];
  miniProgram.on('console', msg => {
    allConsole.push({ type: msg.type || 'log', args: msg.args || [], time: new Date().toISOString() });
  });
  miniProgram.on('exception', err => { allExceptions.push(err); });

  await sleep(2000);

  const results = { page: { pass: 0, fail: 0 }, search: { pass: 0, fail: 0 }, button: { pass: 0, fail: 0 } };

  async function navTo(cfg) {
    const label = `[${cfg.name}]`;
    process.stdout.write(`${label} ${cfg.path}... `);
    try {
      if (cfg.tab) await withTimeout(miniProgram.switchTab('/' + cfg.path), 15000, 'switchTab');
      else await withTimeout(miniProgram.redirectTo('/' + cfg.path), 15000, 'redirectTo');
      await sleep(2500);
      const cp = await miniProgram.currentPage();
      const route = cp ? cp.path || 'unknown' : 'unknown';
      process.stdout.write(`✓ ${route}\n`);
      results.page.pass++;
      return cp;
    } catch (err) {
      process.stdout.write(`✗ ${err.message}\n`);
      results.page.fail++;
      return null;
    }
  }

  async function testBtn(cp, selector, desc, fn) {
    process.stdout.write(`  [按钮] ${desc}... `);
    try {
      const el = await cp.$(selector);
      if (!el) { process.stdout.write(`⚠ 未找到 ${selector}\n`); return; }
      await el.tap();
      await sleep(500);
      if (fn) await fn(cp);
      process.stdout.write(`✓\n`);
      results.button.pass++;
    } catch (e) {
      process.stdout.write(`✗ ${e.message}\n`);
      results.button.fail++;
    }
  }

  async function testBtnDirect(cp, selector, desc) {
    process.stdout.write(`  [按钮] ${desc}... `);
    try {
      const el = await cp.$(selector);
      if (!el) { process.stdout.write(`⚠ 未找到 ${selector}\n`); return; }
      await el.tap();
      await sleep(500);
      process.stdout.write(`✓\n`);
      results.button.pass++;
    } catch (e) {
      process.stdout.write(`✗ ${e.message}\n`);
      results.button.fail++;
    }
  }

  // ============== 1. Home Page ==============
  let cp = await navTo({ path: 'pages/index/index', name: '首页', tab: true });
  if (cp) {
    await testBtn(cp, '.card-japanese', '日语学习入口');
    await sleep(1000);
    cp = await navTo({ path: 'pages/index/index', name: '首页', tab: true });
    if (cp) {
      await testBtn(cp, '.card-german', '德语学习入口');
      await sleep(1000);
    }
    cp = await navTo({ path: 'pages/index/index', name: '首页', tab: true });
    if (cp) {
      await testBtn(cp, '.card-word', 'Word编辑入口');
      await sleep(1000);
    }
    cp = await navTo({ path: 'pages/index/index', name: '首页', tab: true });
    if (cp) {
      await testBtn(cp, '.card-pdf', 'PDF工具入口');
      await sleep(1000);
    }
    cp = await navTo({ path: 'pages/index/index', name: '首页', tab: true });
    if (cp) {
      await testBtn(cp, '.teacher-card', '智能老师入口');
      await sleep(1000);
    }
  }

  // ============== 2. PDF Tool ==============
  cp = await navTo({ path: 'pdf/pages/index/index', name: 'PDF工具' });
  if (cp) {
    // Test: upload button exists
    await testBtnDirect(cp, '.upload-btn', '上传文件按钮(存在)');

    // Simulate file selection via evaluate
    process.stdout.write(`  [模拟] 模拟选择文件... `);
    try {
      await miniProgram.evaluate(() => {
        const p = getCurrentPages().pop();
        p.setData({
          fileName: 'test.docx',
          filePath: wx.env.USER_DATA_PATH + '/test.docx',
          fromFormat: 'docx',
          toFormat: 'pdf',
          targetOptions: [{ label: '转为 PDF', value: 'pdf' }]
        });
      });
      await sleep(500);
      process.stdout.write(`✓\n`);
      results.button.pass++;
    } catch (e) {
      process.stdout.write(`✗ ${e.message}\n`);
      results.button.fail++;
    }

    // Test: format selector
    await testBtnDirect(cp, '.target-card', '选择目标格式');

    // Test: convert button (will fail network but should handle error)
    await testBtn(cp, '.convert-btn', '开始转换(触发转换)', async (c) => {
      await sleep(2000);
      const data = await c.data();
      const converting = data.converting;
      process.stdout.write(`  [状态] converting=${converting}`);
      // Either converting starts OR toast is shown (no file selected behind the scenes)
    });

    // Test: clear file button
    await testBtnDirect(cp, '.file-del', '清除文件');
  }

  // ============== 3. PDF Convert ==============
  cp = await navTo({ path: 'pdf/pages/convert/convert', name: 'PDF转换' });
  if (cp) {
    await testBtnDirect(cp, '.back-btn', '返回按钮');

    // Simulate having a file
    await miniProgram.evaluate(() => {
      const p = getCurrentPages().pop();
      p.setData({
        fileName: 'test.pdf',
        filePath: wx.env.USER_DATA_PATH + '/test.pdf',
        fromFormat: 'pdf',
        toFormat: 'docx',
        targetOptions: [{ label: 'DOCX (Word文档)', value: 'docx' }]
      });
    });
    await sleep(500);

    await testBtnDirect(cp, '.target-card', '选择目标格式');
    await testBtnDirect(cp, '.convert-btn', '开始转换(触发网络)');
  }

  // ============== 4. PDF Edit ==============
  cp = await navTo({ path: 'pdf/pages/edit/edit', name: 'PDF编辑' });
  if (cp) {
    await testBtnDirect(cp, '.back-btn', '返回按钮');

    // Simulate having a file
    await miniProgram.evaluate(() => {
      const p = getCurrentPages().pop();
      p.setData({
        fileName: 'test.pdf',
        filePath: wx.env.USER_DATA_PATH + '/test.pdf'
      });
    });
    await sleep(500);

    // Test operation selection
    await testBtnDirect(cp, '.op-card[data-op="watermark"]', '选择水印操作');
    await testBtnDirect(cp, '.op-card[data-op="rotate"]', '选择旋转操作');
    await testBtnDirect(cp, '.op-card[data-op="merge"]', '选择合并操作');

    // Test text input for watermark
    process.stdout.write(`  [输入] 输入水印文字... `);
    try {
      const input = await cp.$('.opt-input');
      if (input) {
        await input.input('测试水印');
        process.stdout.write(`✓\n`);
        results.button.pass++;
      } else {
        process.stdout.write(`⚠ 未找到\n`);
      }
    } catch (e) {
      process.stdout.write(`✗ ${e.message}\n`);
      results.button.fail++;
    }

    // Test do operation button
    await testBtnDirect(cp, '.do-btn', '开始处理按钮');
  }

  // ============== 5. Smart Teacher Chat ==============
  cp = await navTo({ path: 'smart-teacher/pages/chat/chat', name: 'AI老师' });
  if (cp) {
    // Quick ask tags
    await testBtnDirect(cp, '.quick-tag', '快捷提问标签');

    // Input text
    process.stdout.write(`  [输入] 输入聊天文字... `);
    try {
      const input = await cp.$('.msg-input');
      if (input) {
        await input.input('你好老师');
        process.stdout.write(`✓\n`);
        results.button.pass++;
      } else {
        process.stdout.write(`⚠ 未找到输入框\n`);
      }
    } catch (e) {
      process.stdout.write(`✗ ${e.message}\n`);
      results.button.fail++;
    }

    // Send button
    await testBtn(cp, '.send-btn', '发送按钮', async (c) => {
      await sleep(1500);
      const data = await c.data();
      process.stdout.write(`  [状态] loading=${data.loading}, hasInput=${data.hasInput}`);
    });
  }

  // ============== 6. Word Index ==============
  cp = await navTo({ path: 'word/pages/index/index', name: '作文本', search: true });
  if (cp) {
    // Search input
    process.stdout.write(`  [搜索] 输入搜索关键字... `);
    try {
      const input = await cp.$('input');
      if (input) {
        await input.input('test搜索');
        await sleep(500);
        const data = await cp.data();
        process.stdout.write(`searchKey="${data.searchKey}" ✓\n`);
        results.button.pass++;
      } else {
        process.stdout.write(`⚠\n`);
      }
    } catch (e) {
      process.stdout.write(`✗ ${e.message}\n`);
      results.button.fail++;
    }

    // Test create new doc button
    const createBtn = await cp.$('.create-btn, .add-btn, .fab-btn, [bindtap*="create"]');
    if (createBtn) {
      await testBtnDirect(cp, '.create-btn, .add-btn, .fab-btn', '新建文档按钮');
    } else {
      process.stdout.write(`  [按钮] 新建文档按钮... ⚠ 未找到\n`);
    }
  }

  // ============== 7. Word Editor ==============
  cp = await navTo({ path: 'word/pages/editor/editor', name: '作文编辑器' });
  if (cp) {
    // Toolbar buttons
    await testBtnDirect(cp, '.tool-btn[toggleBold], .tool-btn:has(.bold)', '粗体按钮');
    await testBtnDirect(cp, '.tool-btn[toggleItalic], .tool-btn:has(.italic)', '斜体按钮');
    await testBtnDirect(cp, '.tool-btn[toggleUnderline], .tool-btn:has(.underline)', '下划线按钮');

    // Save button
    await testBtnDirect(cp, '.save-btn-top', '保存按钮');

    // Preview toggle
    await testBtnDirect(cp, '.mode-btn', '预览切换按钮');

    // Toggle expand
    await testBtnDirect(cp, '.expand-row', '展开更多工具');

    // Close button
    await testBtnDirect(cp, '.close-btn', '关闭按钮');
  }

  // ============== 8. German Learn ==============
  cp = await navTo({ path: 'german/pages/learn/learn', name: '德语-闯关路径' });
  if (cp) {
    // Level picker
    process.stdout.write(`  [交互] 级别选择器存在... `);
    try {
      const picker = await cp.$('.level-picker, picker');
      process.stdout.write(`${picker ? '✓' : '⚠ 未找到'}\n`);
      if (picker) results.button.pass++;
    } catch (e) {
      process.stdout.write(`✗ ${e.message}\n`);
      results.button.fail++;
    }

    // Bottom nav
    await testBtnDirect(cp, '.nav-item:not(.active)', '底部导航(课程/生词本)');
  }

  // ============== 9. German Challenge ==============
  cp = await navTo({ path: 'german/pages/learn/challenge?level=a1&index=1', name: '德语-挑战' });
  if (cp) {
    await sleep(1000);
    // Check if challenge loaded properly
    const data = await cp.data();
    process.stdout.write(`  [校验] 题目数=${data.questions ? data.questions.length : 'N/A'} ✓\n`);
    if (data.questions && data.questions.length > 0) results.button.pass++;
  }

  // ============== 10. Japanese Learn ==============
  cp = await navTo({ path: 'japanese/pages/learn/learn', name: '日语-闯关路径' });
  if (cp) {
    // Level picker
    process.stdout.write(`  [交互] 级别选择器存在... `);
    try {
      const picker = await cp.$('.level-picker, picker');
      process.stdout.write(`${picker ? '✓' : '⚠ 未找到'}\n`);
      if (picker) results.button.pass++;
    } catch (e) {
      process.stdout.write(`✗ ${e.message}\n`);
      results.button.fail++;
    }
  }

  // ============== 12. German Wordbook ==============
  cp = await navTo({ path: 'german/pages/wordbook/wordbook', name: '德语-生词本' });
  if (cp) {
    await sleep(500);
  }

  // ============== 13. German Grammar ==============
  cp = await navTo({ path: 'german/pages/grammar/grammar', name: '德语-语法' });
  if (cp) { await sleep(500); }

  // ============== 14. German Textbook ==============
  cp = await navTo({ path: 'german/pages/textbook/textbook', name: '德语-课本' });
  if (cp) { await sleep(500); }

  // ============== 15. German Leaderboard ==============
  cp = await navTo({ path: 'german/pages/leaderboard/leaderboard', name: '德语-排行榜' });
  if (cp) { await sleep(500); }

  // ============== 16. German Course ==============
  cp = await navTo({ path: 'german/pages/course/course', name: '德语-课程中心' });
  if (cp) { await sleep(500); }

  // ============== 17. German Lesson ==============
  cp = await navTo({ path: 'german/pages/lesson/lesson', name: '德语-课程详情' });
  if (cp) { await sleep(500); }

  // ============== 18. German Review ==============
  cp = await navTo({ path: 'german/pages/learn/review', name: '德语-复习' });
  if (cp) { await sleep(500); }

  // ============== 19. German Result ==============
  cp = await navTo({ path: 'german/pages/learn/result?score=5&total=8&passed=true&wrong=[]', name: '德语-结果' });
  if (cp) { await sleep(500); }

  // ============== 20-24. Japanese pages ==============
  for (const p of [
    { path: 'japanese/pages/lesson/lesson', name: '日语-课程详情' },
    { path: 'japanese/pages/course/course', name: '日语-课程中心' },
    { path: 'japanese/pages/wordbook/wordbook', name: '日语-生词本' },
    { path: 'japanese/pages/grammar/grammar', name: '日语-语法' },
    { path: 'japanese/pages/textbook/textbook', name: '日语-课本' },
    { path: 'japanese/pages/leaderboard/leaderboard', name: '日语-排行榜' },
  ]) {
    cp = await navTo(p);
    if (cp) await sleep(500);
  }

  // ============== 25. User Page ==============
  cp = await navTo({ path: 'pages/user/user', name: '个人中心', tab: true });
  if (cp) {
    // Login button (visible when not logged in)
    await testBtnDirect(cp, '.login-btn', '微信登录按钮');

    // Logout and delete account buttons (visible when logged in)
    const logoutBtn = await cp.$('.action-item:has(.icon-logout), .action-item:has-text("退出")');
    const deleteBtn = await cp.$('.action-item-danger, .action-item:has-text("注销")');
    if (logoutBtn) {
      process.stdout.write(`  [按钮] 退出登录... 存在 ✓\n`);
      results.button.pass++;
    }
    if (deleteBtn) {
      process.stdout.write(`  [按钮] 注销账号... 存在 ✓\n`);
      results.button.pass++;
    }
  }

  // ============== SUMMARY ==============
  console.log('\n' + '='.repeat(60));
  console.log('  诊断报告');
  console.log('='.repeat(60));
  console.log(`  页面路由:   ${results.page.pass} 通过, ${results.page.fail} 失败`);
  console.log(`  搜索测试:   ${results.search.pass} 通过, ${results.search.fail} 失败`);
  console.log(`  按钮交互:   ${results.button.pass} 通过, ${results.button.fail} 失败`);
  console.log(`  总交互数:   ${results.page.pass + results.search.pass + results.button.pass} 通过`);

  const errors = allConsole.filter(m => m.type === 'error' || m.type === 'assert');
  const warnings = allConsole.filter(m => m.type === 'warn');
  console.log(`\n  Console:     ${errors.length} errors, ${warnings.length} warnings`);
  for (const e of errors) console.log(`    [${e.time}] ${e.args.join(' | ')}`);
  for (const w of warnings) console.log(`    ${w.args.join(' | ')}`);

  console.log(`\n  JS异常:      ${allExceptions.length} 条`);
  for (const ex of allExceptions) {
    console.log(`    ${ex.message}`);
    if (ex.stack) console.log(`    Stack: ${ex.stack.substring(0, 200)}`);
  }

  const allPassed = results.page.fail === 0 && results.button.fail === 0 && errors.length === 0 && allExceptions.length === 0;
  console.log(`\n  ${allPassed ? '✓ 全部通过' : '✗ 有失败项目'}`);
  console.log('='.repeat(60));

  miniProgram.disconnect();
}

run().catch(err => {
  console.error('\n!!! 诊断脚本异常:', err.message);
  process.exit(1);
});
