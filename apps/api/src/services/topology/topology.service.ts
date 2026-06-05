import { Pool } from 'pg';

export interface TopologyNode {
  id: string;
  label: string;
  type: string;
  status: string;
  metadata: Record<string, any>;
}

export interface TopologyEdge {
  from: string;
  to: string;
  type: string;
}

export interface TopologyGraph {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export class TopologyService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async generateTopology(credentialId: string): Promise<TopologyGraph> {
    const resources = await this.db.query(
      'SELECT * FROM resources WHERE credential_id = $1',
      [credentialId]
    );

    const nodes: TopologyNode[] = resources.rows.map((r) => ({
      id: r.resource_id,
      label: r.name || r.resource_id,
      type: r.resource_type,
      status: r.status,
      metadata: r.metadata,
    }));

    const edges = this.buildEdges(resources.rows);

    return { nodes, edges };
  }

  private buildEdges(resources: any[]): TopologyEdge[] {
    const edges: TopologyEdge[] = [];

    for (const resource of resources) {
      if (resource.metadata?.vpc_id) {
        edges.push({
          from: resource.metadata.vpc_id,
          to: resource.resource_id,
          type: 'contains',
        });
      }

      if (resource.metadata?.subnet_id) {
        edges.push({
          from: resource.metadata.subnet_id,
          to: resource.resource_id,
          type: 'contains',
        });
      }
    }

    return edges;
  }
}
