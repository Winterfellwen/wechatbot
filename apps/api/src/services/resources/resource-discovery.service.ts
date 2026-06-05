import { Pool } from 'pg';

export interface DiscoveredResource {
  cloudPlatform: string;
  resourceType: string;
  resourceId: string;
  name: string;
  status: string;
  region: string;
  metadata: Record<string, any>;
}

export class ResourceDiscoveryService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async discoverResources(cloudPlatform: string, credentialId: string): Promise<DiscoveredResource[]> {
    // Placeholder - will integrate with cloud adapters
    const resources: DiscoveredResource[] = [];

    // Store discovered resources
    for (const resource of resources) {
      await this.storeResource(credentialId, resource);
    }

    return resources;
  }

  async syncResources(cloudPlatform: string, credentialId: string): Promise<void> {
    // Get existing resources
    const existing = await this.db.query(
      'SELECT resource_id, metadata FROM resources WHERE credential_id = $1',
      [credentialId]
    );

    // Discover new state
    const discovered = await this.discoverResources(cloudPlatform, credentialId);

    // Update changed resources
    for (const resource of discovered) {
      const existingResource = existing.rows.find(
        (r) => r.resource_id === resource.resourceId
      );

      if (!existingResource) {
        await this.storeResource(credentialId, resource);
      } else if (JSON.stringify(existingResource.metadata) !== JSON.stringify(resource.metadata)) {
        await this.updateResource(credentialId, resource);
      }
    }
  }

  private async storeResource(credentialId: string, resource: DiscoveredResource): Promise<void> {
    await this.db.query(
      `INSERT INTO resources (credential_id, cloud_platform, resource_type, resource_id, name, status, region, metadata, last_synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        credentialId,
        resource.cloudPlatform,
        resource.resourceType,
        resource.resourceId,
        resource.name,
        resource.status,
        resource.region,
        resource.metadata,
      ]
    );
  }

  private async updateResource(credentialId: string, resource: DiscoveredResource): Promise<void> {
    await this.db.query(
      `UPDATE resources
       SET name = $1, status = $2, metadata = $3, last_synced_at = NOW()
       WHERE credential_id = $4 AND resource_id = $5`,
      [resource.name, resource.status, resource.metadata, credentialId, resource.resourceId]
    );
  }
}
