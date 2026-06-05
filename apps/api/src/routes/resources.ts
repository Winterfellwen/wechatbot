import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPool } from '../database';
import { authenticate } from '../middleware/auth';
import { CreateResourceSchema } from '@cloud-manager/shared';

export async function resourceRoutes(server: FastifyInstance): Promise<void> {
  // Apply authentication to all resource routes
  server.addHook('preHandler', authenticate);

  // Get all resources
  server.get('/resources', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const pool = getPool();
      const result = await pool.query('SELECT * FROM resources ORDER BY created_at DESC');
      return reply.send(result.rows);
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch resources' });
    }
  });

  // Get resource by ID
  server.get<{ Params: { id: string } }>('/resources/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const pool = getPool();
      const result = await pool.query('SELECT * FROM resources WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Resource not found' });
      }
      return reply.send(result.rows[0]);
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch resource' });
    }
  });

  // Create resource
  server.post('/resources', async (request: FastifyRequest, reply: FastifyReply) => {
    const validationResult = CreateResourceSchema.safeParse(request.body);
    if (!validationResult.success) {
      return reply.status(400).send({ error: validationResult.error.issues });
    }

    const { cloudProvider, resourceType, name, status, region, metadata } = validationResult.data;
    try {
      const pool = getPool();
      const result = await pool.query(
        `INSERT INTO resources (cloud_provider, resource_type, name, status, region, metadata)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [cloudProvider, resourceType, name, status || 'pending', region, metadata ? JSON.stringify(metadata) : null]
      );
      return reply.status(201).send(result.rows[0]);
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to create resource' });
    }
  });

  // Update resource
  server.put<{ Params: { id: string } }>('/resources/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, status, metadata } = request.body as { name?: string; status?: string; metadata?: Record<string, unknown> };
    try {
      const pool = getPool();
      const result = await pool.query(
        `UPDATE resources SET name = $1, status = $2, metadata = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 RETURNING *`,
        [name, status, metadata ? JSON.stringify(metadata) : null, id]
      );
      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Resource not found' });
      }
      return reply.send(result.rows[0]);
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to update resource' });
    }
  });

  // Delete resource
  server.delete<{ Params: { id: string } }>('/resources/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const pool = getPool();
      const result = await pool.query('DELETE FROM resources WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Resource not found' });
      }
      return reply.send({ message: 'Resource deleted successfully' });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete resource' });
    }
  });
}
