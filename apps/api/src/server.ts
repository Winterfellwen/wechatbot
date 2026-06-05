import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { Pool } from 'pg';
import { credentialRoutes } from './routes/credentials';
import { dialogueRoutes } from './routes/dialogue';
import { VaultService } from './services/vault/vault.service';

export async function buildApp(options: { testing?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: options.testing ? 'silent' : 'info',
    },
  });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(websocket);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Database connection
  const db = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:secret@localhost:5432/cloud_manager',
  });

  // Services
  const vaultService = new VaultService(db, process.env.VAULT_KEY || 'default-test-key');

  // Decorators
  app.decorate('db', db);
  app.decorate('vaultService', vaultService);

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Routes
  await app.register(credentialRoutes, { prefix: '/api/credentials' });
  await app.register(dialogueRoutes, { prefix: '/api/dialogue' });

  return app;
}

// Start server if run directly
if (require.main === module) {
  buildApp().then((app) => {
    app.listen({ port: 8765, host: '0.0.0.0' }, (err) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
    });
  });
}
