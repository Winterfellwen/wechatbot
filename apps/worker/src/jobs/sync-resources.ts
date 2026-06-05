import { Pool } from 'pg';
import { ResourceDiscoveryService } from '../../../api/src/services/resources/resource-discovery.service';

export interface SyncJobData {
  credentialId: string;
  cloudPlatform: string;
}

export async function syncResourcesJob(data: SyncJobData): Promise<void> {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const discoveryService = new ResourceDiscoveryService(db);

    console.log(`Syncing resources for credential ${data.credentialId}...`);

    await discoveryService.syncResources(data.cloudPlatform, data.credentialId);

    console.log(`Sync completed for credential ${data.credentialId}`);
  } catch (error) {
    console.error(`Sync failed: ${(error as Error).message}`);
    throw error;
  } finally {
    await db.end();
  }
}
