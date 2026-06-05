import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import pino from 'pino';
import { setupRoutes } from './routes';
import { setupDatabase } from './database';
import { config } from './utils/config';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: logger,
  });

  // CORS
  await server.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // WebSocket
  await server.register(websocket);

  // Rate limiting
  await server.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
  });

  // Database connection
  await setupDatabase(server);

  // Setup routes
  await setupRoutes(server);

  // Health check
  server.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  return server;
}

async function start() {
  const server = await buildServer();

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
