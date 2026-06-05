import { Pool } from 'pg';
import { config } from '../config';

interface AuditLog {
  userId?: number;
  action: string;
  resourceId?: number;
  resourceType?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.dbHost,
      port: config.dbPort,
      database: config.dbName,
      user: config.dbUser,
      password: config.dbPassword,
    });
  }

  async logActivity(log: AuditLog): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_id, resource_type, details, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        log.userId || null,
        log.action,
        log.resourceId || null,
        log.resourceType || null,
        log.details ? JSON.stringify(log.details) : null,
        log.ipAddress || null,
        log.userAgent || null,
      ]
    );
  }
}
