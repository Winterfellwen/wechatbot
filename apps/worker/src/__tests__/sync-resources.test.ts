import { syncResourcesJob } from '../jobs/sync-resources';

describe('Sync Resources Job', () => {
  it('should be defined', () => {
    expect(syncResourcesJob).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof syncResourcesJob).toBe('function');
  });
});
