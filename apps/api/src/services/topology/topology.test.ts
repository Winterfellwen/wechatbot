import { TopologyService } from './topology.service';
import { Pool } from 'pg';

describe('TopologyService', () => {
  let service: TopologyService;
  let mockDb: Pool;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;
    service = new TopologyService(mockDb);
  });

  describe('generateTopology', () => {
    it('should generate topology graph from resources', async () => {
      const resources = [
        {
          resource_id: 'vpc-123',
          resource_type: 'vpc',
          name: 'main-vpc',
          metadata: {},
        },
        {
          resource_id: 'subnet-456',
          resource_type: 'subnet',
          name: 'public-subnet',
          metadata: { vpc_id: 'vpc-123' },
        },
        {
          resource_id: 'i-789',
          resource_type: 'instance',
          name: 'web-server',
          metadata: { subnet_id: 'subnet-456' },
        },
      ];

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: resources });

      const topology = await service.generateTopology('cred-1');

      expect(topology).toHaveProperty('nodes');
      expect(topology).toHaveProperty('edges');
      expect(topology.nodes.length).toBe(3);
      expect(topology.edges.length).toBe(2);
    });
  });
});
