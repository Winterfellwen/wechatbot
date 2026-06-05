import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { config } from '../utils/config';

let pool: Pool | null = null;

export async function setupDatabase(server: FastifyInstance): Promise<void> {
  pool = new Pool({
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    user: config.dbUser,
    password: config.dbPassword,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    await pool.query('SELECT NOW()');
    server.log.info('Database connected successfully');
  } catch (error) {
    server.log.error('Database connection failed:', error);
    throw error;
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
