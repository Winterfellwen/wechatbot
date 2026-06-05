import { parseIntent, IntentResult } from './intent-parser';

describe('Intent Parser', () => {
  describe('cloud platform detection', () => {
    it('should detect AWS from explicit mention', () => {
      const result = parseIntent('查看AWS us-east-1的所有EC2实例');
      expect(result.cloudPlatform).toBe('aws');
    });

    it('should detect AWS from resource ID prefix', () => {
      const result = parseIntent('查看vpc-abc123def的详情');
      expect(result.cloudPlatform).toBe('aws');
    });

    it('should detect AWS from i- instance ID', () => {
      const result = parseIntent('查看i-1234567890abcdef0的状态');
      expect(result.cloudPlatform).toBe('aws');
    });

    it('should detect Azure from subscription path', () => {
      const result = parseIntent('查看/subscriptions/abc-123/resourceGroups/myRG');
      expect(result.cloudPlatform).toBe('azure');
    });

    it('should detect GCP from projects path', () => {
      const result = parseIntent('查看projects/my-project/zones/us-central1-a');
      expect(result.cloudPlatform).toBe('gcp');
    });

    it('should return auto-detect when no platform hint found', () => {
      const result = parseIntent('今天天气怎么样');
      expect(result.cloudPlatform).toBe('auto-detect');
    });
  });

  describe('action detection', () => {
    it('should detect query action with Chinese keyword', () => {
      const result = parseIntent('查看所有实例');
      expect(result.action).toBe('query');
      expect(result.riskLevel).toBe('low');
    });

    it('should detect query action with English keyword', () => {
      const result = parseIntent('list all instances');
      expect(result.action).toBe('query');
      expect(result.riskLevel).toBe('low');
    });

    it('should detect stop action with Chinese keyword', () => {
      const result = parseIntent('停止i-1234567890');
      expect(result.action).toBe('stop');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect stop action with English keyword', () => {
      const result = parseIntent('stop instance i-1234567890');
      expect(result.action).toBe('stop');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect start action with Chinese keyword', () => {
      const result = parseIntent('启动i-1234567890');
      expect(result.action).toBe('start');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect start action with English keyword', () => {
      const result = parseIntent('start instance i-1234567890');
      expect(result.action).toBe('start');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect delete action with Chinese keyword', () => {
      const result = parseIntent('删除i-1234567890');
      expect(result.action).toBe('delete');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect delete action with English keyword', () => {
      const result = parseIntent('delete instance i-1234567890');
      expect(result.action).toBe('delete');
      expect(result.riskLevel).toBe('high');
    });

    it('should default to query with low risk for unknown input', () => {
      const result = parseIntent('hello world');
      expect(result.action).toBe('query');
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('region extraction', () => {
    it('should extract us-east-1 region', () => {
      const result = parseIntent('查看AWS us-east-1的所有EC2实例');
      expect(result.region).toBe('us-east-1');
    });

    it('should extract us-west-2 region', () => {
      const result = parseIntent('list instances in us-west-2');
      expect(result.region).toBe('us-west-2');
    });

    it('should extract eu-west-1 region', () => {
      const result = parseIntent('查看eu-west-1区域的资源');
      expect(result.region).toBe('eu-west-1');
    });

    it('should extract ap-southeast-1 region', () => {
      const result = parseIntent('ap-southeast-1区域有哪些实例');
      expect(result.region).toBe('ap-southeast-1');
    });

    it('should return undefined when no region found', () => {
      const result = parseIntent('查看所有实例');
      expect(result.region).toBeUndefined();
    });
  });

  describe('resource type detection', () => {
    it('should detect EC2 from keyword', () => {
      const result = parseIntent('查看AWS us-east-1的所有EC2实例');
      expect(result.resourceType).toBe('ec2');
    });

    it('should detect VPC from resource ID prefix', () => {
      const result = parseIntent('查看vpc-abc123def的详情');
      expect(result.resourceType).toBe('vpc');
    });

    it('should detect EC2 from instance keyword', () => {
      const result = parseIntent('list all instances');
      expect(result.resourceType).toBe('ec2');
    });

    it('should detect S3 from keyword', () => {
      const result = parseIntent('查看所有S3存储桶');
      expect(result.resourceType).toBe('s3');
    });

    it('should detect RDS from keyword', () => {
      const result = parseIntent('查看RDS数据库');
      expect(result.resourceType).toBe('rds');
    });
  });

  describe('resource ID extraction', () => {
    it('should extract instance ID', () => {
      const result = parseIntent('停止i-1234567890abcdef0');
      expect(result.resourceId).toBe('i-1234567890abcdef0');
    });

    it('should extract VPC ID', () => {
      const result = parseIntent('查看vpc-abc123def的详情');
      expect(result.resourceId).toBe('vpc-abc123def');
    });

    it('should return undefined when no resource ID in input', () => {
      const result = parseIntent('查看所有实例');
      expect(result.resourceId).toBeUndefined();
    });
  });

  describe('composite parsing', () => {
    it('should parse cloud resource query with all fields', () => {
      const result: IntentResult = parseIntent('查看AWS us-east-1的所有EC2实例');
      expect(result).toEqual({
        action: 'query',
        cloudPlatform: 'aws',
        resourceType: 'ec2',
        region: 'us-east-1',
        riskLevel: 'low',
      });
    });

    it('should parse resource stop operation', () => {
      const result: IntentResult = parseIntent('停止i-1234567890');
      expect(result).toEqual({
        action: 'stop',
        resourceId: 'i-1234567890',
        cloudPlatform: 'aws',
        resourceType: 'ec2',
        riskLevel: 'high',
      });
    });

    it('should infer cloud platform from resource name', () => {
      const result: IntentResult = parseIntent('查看vpc-abc123def的详情');
      expect(result.cloudPlatform).toBe('aws');
    });
  });
});
