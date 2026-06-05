import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { syncResourcesJob } from './jobs/sync-resources';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

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

