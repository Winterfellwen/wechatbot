import { buildApp } from './server';

describe('Fastify Server', () => {
  let app: any;

  beforeEach(async () => {
    app = await buildApp({ testing: true });
    // Mock VaultService methods to avoid real DB calls
    app.vaultService.listCredentials = jest.fn().mockResolvedValue([
      { id: '1', name: 'test-cred', cloudPlatform: 'AWS', credentialType: 'api_key', createdAt: new Date(), lastUsedAt: null },
    ]);
    app.vaultService.storeCredential = jest.fn().mockResolvedValue({ id: 'new-cred-id' });
    app.vaultService.deleteCredential = jest.fn().mockResolvedValue(undefined);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should respond to health check', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('status', 'ok');
    expect(response.json()).toHaveProperty('timestamp');
  });

  it('should handle credential list request', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/credentials',
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('credentials');
    expect(response.json().credentials).toHaveLength(1);
    expect(app.vaultService.listCredentials).toHaveBeenCalledWith('test-user');
  });

  it('should handle credential creation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/credentials',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      },
      payload: {
        name: 'My AWS Key',
        cloudPlatform: 'AWS',
        credentialType: 'api_key',
        data: { accessKey: 'AKIAIOSFODNN7EXAMPLE' },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('id', 'new-cred-id');
    expect(app.vaultService.storeCredential).toHaveBeenCalledWith('test-user', expect.objectContaining({
      name: 'My AWS Key',
      cloudPlatform: 'AWS',
    }));
  });

  it('should handle credential deletion', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/credentials/cred-123',
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('success', true);
    expect(app.vaultService.deleteCredential).toHaveBeenCalledWith('test-user', 'cred-123');
  });
});
