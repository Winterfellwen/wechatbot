import pino from 'pino';
import { buildApp } from './server';
import { setupDatabase } from './database';
import { setupRoutes } from './routes';
import { config } from './utils/config';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

async function start() {
  const server = await buildApp();

  // Additional database setup for legacy routes that use getPool()
  await setupDatabase(server);

  // Setup legacy routes (users, resources)
  await setupRoutes(server);

  try {
    const address = await server.listen({
      port: config.port,
      host: config.host,
    });
    logger.info(`API Server running at ${address}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

start();
