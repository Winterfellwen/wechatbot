import Redis from 'ioredis';
import { Logger } from 'pino';
import { AuditService } from '../services/auditService';

export class AuditWorker {
  private redis: Redis;
  private logger: Logger;
  private auditService: AuditService;
  private isRunning: boolean = false;

  constructor(redis: Redis, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
    this.auditService = new AuditService();
  }

  async start(): Promise<void> {
    this.isRunning = true;
    this.logger.info('Audit worker started');

    while (this.isRunning) {
      try {
        const job = await this.redis.brpop('audit:log', 0);
        if (job) {
          const [queue, data] = job;
          await this.processJob(JSON.parse(data));
        }
      } catch (error) {
        this.logger.error('Error processing audit job:', error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info('Audit worker stopped');
  }

  private async processJob(job: any): Promise<void> {
    this.logger.info('Processing audit log job:', job);
    try {
      await this.auditService.logActivity(job);
      this.logger.info('Audit log recorded for action:', job.action);
    } catch (error) {
      this.logger.error('Audit log failed:', error);
      throw error;
    }
  }
}
