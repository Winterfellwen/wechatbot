const { readLoginState } = require('C:/Users/winte/AppData/Roaming/npm/node_modules/@wxcloud/cli/lib/utils/auth');
const cloudAPI = require('C:/Users/winte/AppData/Roaming/npm/node_modules/@wxcloud/cli/lib/api/cloudapi/src/index');
const { initCloudAPI } = require('C:/Users/winte/AppData/Roaming/npm/node_modules/@wxcloud/cli/lib/api/adapter');

async function main() {
  const { appid } = await readLoginState();
  initCloudAPI(appid);

  const envId = 'cloud1-7gzoz5cr22dd4354';
  // Update all functions that call AI to 30s
  const fns = { 'chat': 30, 'ai-order-chat': 30, 'ai-order-menu': 30 };

  for (const [fn, timeout] of Object.entries(fns)) {
    try {
      await cloudAPI.scfUpdateFunctionInfo({
        namespace: envId, region: '', functionName: fn, timeout,
      });
      console.log(`✅ ${fn} -> ${timeout}s`);
    } catch (e) {
      console.log(`❌ ${fn}: ${e.message}`);
    }
  }

  // Verify
  for (const fn of ['chat', 'ai-order-chat', 'ai-order-menu']) {
    const info = await cloudAPI.scfGetFunctionInfo({
      namespace: envId, region: '', functionName: fn
    });
    console.log(`  ${fn}: timeout=${info.timeout}s, status=${info.status}`);
  }
}

main().catch(console.error);
