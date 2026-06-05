import Redis from 'ioredis';
import { Logger } from 'pino';
import { ResourceService } from '../services/resourceService';

export class ResourceWorker {
  private redis: Redis;
  private logger: Logger;
  private resourceService: ResourceService;
  private isRunning: boolean = false;

  constructor(redis: Redis, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
    this.resourceService = new ResourceService();
  }

  async start(): Promise<void> {
    this.isRunning = true;
    this.logger.info('Resource worker started');

    while (this.isRunning) {
      try {
        const job = await this.redis.brpop('resource:sync', 0);
        if (job) {
          const [queue, data] = job;
          await this.processJob(JSON.parse(data));
        }
      } catch (error) {
        this.logger.error('Error processing resource job:', error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info('Resource worker stopped');
  }

  private async processJob(job: any): Promise<void> {
    this.logger.info('Processing resource sync job:', job);
    try {
      await this.resourceService.syncResources(job.credentialId, job.provider);
      this.logger.info('Resource sync completed for:', job.credentialId);
    } catch (error) {
      this.logger.error('Resource sync failed:', error);
      throw error;
    }
  }
}
