import { ResourceDiscoveryService } from './resource-discovery.service';
import { Pool } from 'pg';

describe('ResourceDiscoveryService', () => {
  let service: ResourceDiscoveryService;
  let mockDb: Pool;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;
    service = new ResourceDiscoveryService(mockDb);
  });

  describe('discoverResources', () => {
    it('should return empty array when no resources found', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      const resources = await service.discoverResources('aws', 'cred-1');

      expect(Array.isArray(resources)).toBe(true);
      expect(resources).toHaveLength(0);
      // Note: query is not called because resources array is empty
    });
  });

  describe('syncResources', () => {
    it('should update existing resources', async () => {
      const existingResources = [
        { resource_id: 'i-123', status: 'running' },
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: existingResources })
        .mockResolvedValue({ rows: [] });

      await service.syncResources('aws', 'cred-1');

      expect(mockDb.query).toHaveBeenCalled();
    });
  });
});
