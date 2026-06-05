import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPool } from '../database';
import { authenticate } from '../middleware/auth';
import { CreateCredentialSchema } from '@cloud-manager/shared';

export async function credentialRoutes(server: FastifyInstance): Promise<void> {
  // Apply authentication to all credential routes
  server.addHook('preHandler', authenticate);

  // Get credentials for user
  server.get('/credentials', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const pool = getPool();
      const result = await pool.query(
        'SELECT id, cloud_provider, name, created_at FROM credentials ORDER BY created_at DESC'
      );
      return reply.send(result.rows);
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch credentials' });
    }
  });

  // Create credential
  server.post('/credentials', async (request: FastifyRequest, reply: FastifyReply) => {
    const validationResult = CreateCredentialSchema.safeParse(request.body);
    if (!validationResult.success) {
      return reply.status(400).send({ error: validationResult.error.issues });
    }

    const { cloud_provider, name, encrypted_data, metadata } = validationResult.data;
    try {
      const pool = getPool();
      const result = await pool.query(
        `INSERT INTO credentials (cloud_provider, name, encrypted_data, metadata)
         VALUES ($1, $2, $3, $4) RETURNING id, cloud_provider, name, created_at`,
        [cloud_provider, name, encrypted_data, metadata ? JSON.stringify(metadata) : null]
      );
      return reply.status(201).send(result.rows[0]);
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to create credential' });
    }
  });

  // Delete credential
  server.delete<{ Params: { id: string } }>('/credentials/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const pool = getPool();
      const result = await pool.query(
        'DELETE FROM credentials WHERE id = $1 RETURNING id',
        [id]
      );
      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Credential not found' });
      }
      return reply.send({ message: 'Credential deleted successfully' });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete credential' });
    }
  });
}
