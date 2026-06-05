export interface IntentResult {
  action: string;
  cloudPlatform: string;
  resourceType?: string;
  resourceId?: string;
  region?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

const AWS_RESOURCE_ID_PATTERNS = /^(i-|vpc-|subnet-|sg-|ami-|snap-)/;
const AZURE_RESOURCE_PATTERNS = /\/subscriptions\//;
const GCP_RESOURCE_PATTERNS = /projects\/[^/]+\/zones\//;

const KNOWN_REGIONS = [
  'us-east-1',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-northeast-1',
];

const RESOURCE_TYPE_KEYWORDS: Record<string, string> = {
  ec2: 'ec2',
  instance: 'ec2',
  实例: 'ec2',
  vpc: 'vpc',
  subnet: 'subnet',
  子网: 'subnet',
  s3: 's3',
  bucket: 's3',
  rds: 'rds',
  database: 'rds',
  数据库: 'rds',
};

/**
 * Parse user input to extract intent information including
 * cloud platform, action, resource type, resource ID, region, and risk level.
 */
export function parseIntent(input: string): IntentResult {
  let cloudPlatform = 'auto-detect';
  let resourceType: string | undefined;
  let resourceId: string | undefined;
  let region: string | undefined;
  let action = 'query';
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // Detect cloud platform from explicit mention
  const lowerInput = input.toLowerCase();
  if (/\baws\b/.test(lowerInput)) {
    cloudPlatform = 'aws';
  } else if (/\bazure\b/.test(lowerInput)) {
    cloudPlatform = 'azure';
  } else if (/\bgcp\b/.test(lowerInput) || /\bgoogle cloud\b/.test(lowerInput)) {
    cloudPlatform = 'gcp';
  }

  // Detect cloud platform from resource IDs in the input
  const resourceIdCandidates = input.match(/\b[a-z]{1,3}-[a-z0-9]{8,}\b/g);
  if (resourceIdCandidates) {
    for (const candidate of resourceIdCandidates) {
      if (AWS_RESOURCE_ID_PATTERNS.test(candidate)) {
        cloudPlatform = 'aws';
        resourceId = candidate;
        // Derive resource type from the ID prefix
        const prefix = candidate.split('-')[0];
        if (prefix === 'i') resourceType = 'ec2';
        else if (prefix === 'vpc') resourceType = 'vpc';
        else if (prefix === 'sg') resourceType = 'security-group';
        else if (prefix === 'ami') resourceType = 'ami';
        else if (prefix === 'snap') resourceType = 'snapshot';
        else if (prefix === 'subnet') resourceType = 'subnet';
        break;
      }
    }
  }

  // Detect cloud platform from Azure/GCP resource path patterns
  if (cloudPlatform === 'auto-detect') {
    if (AZURE_RESOURCE_PATTERNS.test(input)) {
      cloudPlatform = 'azure';
    } else if (GCP_RESOURCE_PATTERNS.test(input)) {
      cloudPlatform = 'gcp';
    }
  }

  // Detect resource type from keywords in the input
  if (!resourceType) {
    for (const [keyword, type] of Object.entries(RESOURCE_TYPE_KEYWORDS)) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        resourceType = type;
        break;
      }
    }
  }

  // Detect action and associated risk level
  if (input.includes('删除') || input.includes('delete') || input.includes('destroy')) {
    action = 'delete';
    riskLevel = 'high';
  } else if (input.includes('停止') || input.includes('stop') || input.includes('shutdown')) {
    action = 'stop';
    riskLevel = 'high';
  } else if (input.includes('启动') || input.includes('start') || input.includes('launch')) {
    action = 'start';
    riskLevel = 'high';
  } else if (input.includes('重启') || input.includes('restart') || input.includes('reboot')) {
    action = 'restart';
    riskLevel = 'medium';
  } else if (input.includes('查看') || input.includes('list') || input.includes('查询') || input.includes('describe')) {
    action = 'query';
    riskLevel = 'low';
  }

  // Extract region
  for (const knownRegion of KNOWN_REGIONS) {
    if (input.includes(knownRegion)) {
      region = knownRegion;
      break;
    }
  }

  return {
    action,
    cloudPlatform,
    resourceType,
    resourceId,
    region,
    riskLevel,
  };
}
