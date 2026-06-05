import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPool } from '../database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';

export async function userRoutes(server: FastifyInstance): Promise<void> {
  // Register user
  server.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { username, email, password } = request.body as any;
    try {
      const pool = getPool();
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash) 
         VALUES ($1, $2, $3) RETURNING id, username, email, created_at`,
        [username, email, passwordHash]
      );
      return reply.status(201).send(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        return reply.status(409).send({ error: 'Username or email already exists' });
      }
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to register user' });
    }
  });

  // Login user
  server.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as any;
    try {
      const pool = getPool();
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }
      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
      });
      return reply.send({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to login' });
    }
  });

  // Get user profile
  server.get('/auth/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'No token provided' });
      }
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      const pool = getPool();
      const result = await pool.query(
        'SELECT id, username, email, created_at FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'User not found' });
      }
      return reply.send(result.rows[0]);
    } catch (error) {
      server.log.error(error);
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });
}
