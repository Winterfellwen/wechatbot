import { FastifyInstance } from 'fastify';
import { resourceRoutes } from './resources';
import { userRoutes } from './users';

export async function setupRoutes(server: FastifyInstance): Promise<void> {
  // credentialRoutes are registered in server.ts with VaultService decorator
  await server.register(resourceRoutes, { prefix: '/api' });
  await server.register(userRoutes, { prefix: '/api' });
}
