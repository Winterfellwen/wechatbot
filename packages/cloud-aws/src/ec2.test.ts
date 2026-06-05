import { EC2Adapter } from './ec2.adapter';
import { EC2Client } from '@aws-sdk/client-ec2';

jest.mock('@aws-sdk/client-ec2');

describe('EC2Adapter', () => {
  let adapter: EC2Adapter;
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();
    (EC2Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
      config: {
        region: 'us-east-1',
      },
    }));

    adapter = new EC2Adapter({
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      region: 'us-east-1',
    });
  });

  describe('listInstances', () => {
    it('should return list of EC2 instances', async () => {
      mockSend.mockResolvedValue({
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-1234567890abcdef0',
                Tags: [{ Key: 'Name', Value: 'Test Instance' }],
                State: { Name: 'running' },
                InstanceType: 't2.micro',
                PrivateIpAddress: '10.0.0.1',
                PublicIpAddress: '54.123.45.67',
              },
            ],
          },
        ],
      });

      const instances = await adapter.listInstances();

      expect(Array.isArray(instances)).toBe(true);
      expect(instances).toHaveLength(1);
      instances.forEach((instance) => {
        expect(instance).toHaveProperty('id');
        expect(instance).toHaveProperty('name');
        expect(instance).toHaveProperty('status');
        expect(instance).toHaveProperty('type');
      });
    });

    it('should filter by region', async () => {
      mockSend.mockResolvedValue({
        Reservations: [
          {
            Instances: [
              {
                InstanceId: 'i-1234567890abcdef0',
                Tags: [{ Key: 'Name', Value: 'Test Instance' }],
                State: { Name: 'running' },
                InstanceType: 't2.micro',
              },
            ],
          },
        ],
      });

      const instances = await adapter.listInstances({ region: 'us-west-2' });

      instances.forEach((instance) => {
        expect(instance.region).toBe('us-east-1');
      });
    });
  });

  describe('stopInstance', () => {
    it('should stop an instance', async () => {
      mockSend.mockResolvedValue({});

      const result = await adapter.stopInstance('i-test123');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('status', 'stopping');
    });
  });
});
