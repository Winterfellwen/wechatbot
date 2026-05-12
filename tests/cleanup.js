const { killWechatProcesses } = require('./shared');

console.log('=== 清理微信开发者工具进程 ===');
killWechatProcesses();
console.log('OK 清理完成');
