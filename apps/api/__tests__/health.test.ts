import Fastify, { FastifyInstance } from 'fastify';

describe('Health Check', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = Fastify();
    server.get('/health', async () => {
      return { status: 'healthy', timestamp: new Date().toISOString() };
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return healthy status', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('healthy');
    expect(body.timestamp).toBeDefined();
  });
});
