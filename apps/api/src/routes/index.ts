import { FastifyInstance } from 'fastify';
import { resourceRoutes } from './resources';
import { userRoutes } from './users';
import { credentialRoutes } from './credentials';

export async function setupRoutes(server: FastifyInstance): Promise<void> {
  await server.register(resourceRoutes, { prefix: '/api' });
  await server.register(userRoutes, { prefix: '/api' });
  await server.register(credentialRoutes, { prefix: '/api' });
}
