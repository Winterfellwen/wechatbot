// OCI Always Free VM 自动创建脚本
// 每30分钟尝试创建 Ampere A1 和 AMD E2.1.Micro
const common = require('oci-common');
const core = require('oci-core');
const path = require('path');
const os = require('os');
const fs = require('fs');

const SUBSCRIPTION_ID = 'weapp-subnet';
const SSH_KEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILHcRft25Q8ezMjyRmhLL02Bt3x08SLLksxkx7rXpJBC winte@Wen-Desktop';
const LOG_FILE = path.join(__dirname, 'oci-create-vms.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

async function main() {
  log('=== 开始尝试创建 VM ===');

  const configPath = path.join(os.homedir(), '.oci', 'config');
  if (!fs.existsSync(configPath)) {
    log('ERROR: OCI config not found at ' + configPath);
    return;
  }

  const provider = new common.ConfigFileAuthenticationDetailsProvider(configPath);
  const compute = new core.ComputeClient({ authenticationDetailsProvider: provider });

  // 获取 subnet ID
  const subnetId = process.env.OCI_SUBNET_ID;
  if (!subnetId) {
    log('ERROR: OCI_SUBNET_ID env var not set');
    return;
  }

  // 定义要尝试的 VM 配置
  const targets = [
    {
      name: 'wechatbot-a1',
      shape: 'VM.Standard.A1.Flex',
      shapeConfig: { ocpus: 4, memoryInGBs: 24 },
      imageId: 'ocid1.image.oc1.ap-singapore-1.aaaaaaaamynzciw3t7fypsdqahuupzsvbv5ewlubquu3ksfqugxchksgxm4q', // Ubuntu 24.04 aarch64
      label: 'Ampere A1 (4 OCPU / 24 GB)'
    },
    {
      name: 'wechatbot-e2',
      shape: 'VM.Standard.E2.1.Micro',
      shapeConfig: null,
      imageId: 'ocid1.image.oc1.ap-singapore-1.aaaaaaaahf4nmubnkrnlqowg3xj6gezdg6fwe2phcf3l5tgkgc6yo5xehsca', // Ubuntu 24.04 x86_64
      label: 'AMD E2.1.Micro (1 OCPU / 1 GB)'
    }
  ];

  for (const t of targets) {
    // 检查是否已存在同名 VM
    const existing = await compute.listInstances({
      compartmentId: provider.getTenantId(),
      displayName: t.name
    }).catch(() => ({ items: [] }));

    const running = existing.items.filter(i =>
      i.lifecycleState !== 'TERMINATED' && i.lifecycleState !== 'TERMINATING'
    );

    if (running.length > 0) {
      log(`SKIP ${t.label}: 已存在 (状态: ${running[0].lifecycleState})`);
      continue;
    }

    try {
      const details = {
        compartmentId: provider.getTenantId(),
        availabilityDomain: 'spNV:AP-SINGAPORE-1-AD-1',
        displayName: t.name,
        shape: t.shape,
        sourceDetails: {
          sourceType: 'image',
          imageId: t.imageId
        },
        createVnicDetails: {
          subnetId: subnetId,
          assignPublicIp: true
        },
        metadata: { ssh_authorized_keys: SSH_KEY }
      };

      if (t.shapeConfig) {
        details.shapeConfig = t.shapeConfig;
      }

      const resp = await compute.launchInstance({ launchInstanceDetails: details });
      log(`SUCCESS ${t.label} 创建成功! ID: ${resp.instance.id} State: ${resp.instance.lifecycleState}`);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Out of host capacity')) {
        log(`RETRY ${t.label}: 容量不足，下次重试`);
      } else {
        log(`ERROR ${t.label}: ${msg.substring(0, 200)}`);
      }
    }
  }

  log('=== 本轮完成 ===');
}

main().catch(e => {
  log('FATAL: ' + e.message);
  process.exit(1);
});