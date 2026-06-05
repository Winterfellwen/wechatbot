import Redis from 'ioredis';
import pino from 'pino';
import { config } from './config';
import { ResourceWorker } from './workers/resourceWorker';
import { AuditWorker } from './workers/auditWorker';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

async function startWorker() {
  const redis = new Redis({
    host: config.redisHost,
    port: config.redisPort,
  });

  logger.info('Worker started, listening for jobs...');

  const resourceWorker = new ResourceWorker(redis, logger);
  const auditWorker = new AuditWorker(redis, logger);

  await resourceWorker.start();
  await auditWorker.start();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...');
    await resourceWorker.stop();
    await auditWorker.stop();
    await redis.quit();
    process.exit(0);
  });
}

startWorker().catch((error) => {
  logger.error('Failed to start worker:', error);
  process.exit(1);
});
