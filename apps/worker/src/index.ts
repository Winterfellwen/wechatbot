import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { syncResourcesJob } from './jobs/sync-resources';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.warn('REDIS_URL not set. Worker will run in standalone mode without job queue.');
  console.log('Starting standalone worker...');

  // Standalone mode - run sync immediately
  const runStandalone = async () => {
    try {
      console.log('Running resource sync in standalone mode...');
      // You can add periodic sync logic here
      console.log('Standalone worker ready. Add periodic sync logic as needed.');
    } catch (error) {
      console.error('Standalone worker error:', error);
    }
  };

  runStandalone();

  process.on('SIGTERM', async () => {
    console.log('Shutting down standalone worker...');
    process.exit(0);
  });
} else {
  const connection = new IORedis(REDIS_URL);

  // Create queue
  export const syncQueue = new Queue('cloud-resource-sync', { connection });

  // Create worker
  const worker = new Worker(
    'cloud-resource-sync',
    async (job) => {
      console.log(`Processing job ${job.id} of type ${job.name}`);

      if (job.name === 'sync-resources') {
        await syncResourcesJob(job.data);
      }
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed: ${err.message}`);
  });

  console.log('Worker started and listening for jobs...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down worker...');
    await worker.close();
    await connection.quit();
    process.exit(0);
  });
}

