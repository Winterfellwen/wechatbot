import { buildApp } from '../../src/server';
import { FastifyInstance } from 'fastify';

describe('Dialogue API Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ testing: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should process dialogue message in plan mode', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/dialogue',
      payload: {
        content: '查看AWS EC2实例',
        mode: 'plan',
      },
    });

    expect(response.statusCode).toBe(200);
    const result = response.json();
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('data');
    expect(result.data).toHaveProperty('plan');
    expect(result.data.plan).toHaveProperty('steps');
    expect(result.data.plan.steps).toHaveLength(1);
    expect(result.data.plan.steps[0]).toHaveProperty('action', 'list_ec2_instances');
  });

  it('should process dialogue message with default mode', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/dialogue',
      payload: {
        content: '查看所有资源',
      },
    });

    expect(response.statusCode).toBe(200);
    const result = response.json();
    expect(result).toHaveProperty('success', true);
    expect(result.data).toHaveProperty('plan');
  });

  it('should handle empty message content', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/dialogue',
      payload: {
        content: '',
      },
    });

    expect(response.statusCode).toBe(400);
    const result = response.json();
    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('error', 'Message content cannot be empty');
  });

  it('should handle whitespace-only message content', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/dialogue',
      payload: {
        content: '   ',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should handle different resource types', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/dialogue',
      payload: {
        content: '列出所有S3存储桶',
        mode: 'plan',
      },
    });

    expect(response.statusCode).toBe(200);
    const result = response.json();
    expect(result.data.plan.steps[0]).toHaveProperty('action', 'list_s3_buckets');
  });

  it('should handle unknown message gracefully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/dialogue',
      payload: {
        content: 'random unrelated text',
        mode: 'plan',
      },
    });

    // AI service processes unknown messages as query with auto-detect
    expect(response.statusCode).toBe(200);
    const result = response.json();
    expect(result).toHaveProperty('success', true);
    expect(result.data).toHaveProperty('plan');
    // Should default to listing all resources
    expect(result.data.plan.steps[0]).toHaveProperty('action', 'list_all_resources');
  });
});