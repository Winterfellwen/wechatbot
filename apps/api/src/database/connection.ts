import { Pool, PoolConfig, QueryResult } from 'pg';

export interface DatabaseConnection {
  pool: Pool;
  query: (text: string, params?: any[]) => Promise<QueryResult>;
  close: () => Promise<void>;
}

export async function createDatabaseConnection(config: PoolConfig): Promise<DatabaseConnection> {
  const pool = new Pool({
    ...config,
    max: config.max || 20,
    idleTimeoutMillis: config.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
  });

  // Test connection
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    await pool.end();
    throw new Error(`Database connection failed: ${(error as Error).message}`);
  }

  return {
    pool,
    query: (text: string, params?: any[]) => pool.query(text, params),
    close: () => pool.end(),
  };
}
