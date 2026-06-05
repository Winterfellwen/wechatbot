import 'fastify';
import { Pool } from 'pg';
import { VaultService } from './services/vault/vault.service';

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
    vaultService: VaultService;
  }
}
