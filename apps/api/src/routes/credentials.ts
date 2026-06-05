import { FastifyInstance } from 'fastify';
import { VaultService } from '../services/vault/vault.service';

export async function credentialRoutes(fastify: FastifyInstance) {
  const getVaultService = (): VaultService => fastify.vaultService;

  // List credentials
  fastify.get('/', async (request, reply) => {
    const userId = (request as any).user?.id || 'test-user';
    const vault = getVaultService();
    const credentials = await vault.listCredentials(userId);
    return { credentials };
  });

  // Store credential
  fastify.post('/', async (request, reply) => {
    const userId = (request as any).user?.id || 'test-user';
    const vault = getVaultService();
    const result = await vault.storeCredential(userId, request.body as any);
    return { id: result.id };
  });

  // Delete credential
  fastify.delete('/:id', async (request, reply) => {
    const userId = (request as any).user?.id || 'test-user';
    const vault = getVaultService();
    await vault.deleteCredential(userId, (request.params as any).id);
    return { success: true };
  });
}
