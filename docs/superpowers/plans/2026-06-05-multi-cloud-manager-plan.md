# Multi-Cloud Manager Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-cloud management platform with AI-powered conversational interface for managing cloud resources across AWS, Azure, GCP, and OCI, featuring secure credential management (Agent Vault), real-time resource viewing, and topology visualization.

**Architecture:** Web terminal + microservices architecture using Next.js frontend with xterm.js for terminal interface, Fastify backend for API/WebSocket, PostgreSQL for data storage, Redis for caching, and pluggable cloud SDK adapters for multi-cloud support.

**Tech Stack:** Next.js 14, xterm.js, Zustand, Tailwind CSS, Fastify, Socket.io, PostgreSQL 15, Redis 7, @aws-sdk/*, @azure/arm-*, @google-cloud/*, oci-sdk

---

## Phase 1: Foundation (3-4 weeks)

### Task 1: Project Structure Setup

**Files:**
- Create: `package.json` (root)
- Create: `apps/web/package.json`
- Create: `apps/api/package.json`
- Create: `apps/worker/package.json`
- Create: `packages/shared/package.json`
- Create: `docker-compose.yml`
- Create: `tsconfig.json` (root)

- [ ] **Step 1: Initialize root package.json**

```json
{
  "name": "cloud-manager",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev -w apps/web\" \"npm run dev -w apps/api\"",
    "build": "npm run build -w apps/web && npm run build -w apps/api",
    "test": "npm run test -w apps/api && npm run test -w apps/web"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: Initialize web app**

```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --app --src-dir
```

- [ ] **Step 3: Add xterm.js dependency to web**

```bash
cd apps/web
npm install xterm @xterm/addon-fit @xterm/addon-web-links
npm install zustand
npm install -D @types/node
```

- [ ] **Step 4: Initialize Fastify API**

```bash
mkdir -p apps/api/src
cd apps/api
npm init -y
npm install fastify @fastify/websocket @fastify/cors @fastify/rate-limit
npm install pino pino-pretty
npm install -D typescript @types/node tsx jest @types/jest
npx tsc --init
```

- [ ] **Step 5: Create database schema**

```sql
-- apps/api/src/database/schema.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  cloud_platform VARCHAR(50) NOT NULL,
  credential_type VARCHAR(50) NOT NULL,
  encrypted_data BYTEA NOT NULL,
  iv BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID REFERENCES credentials(id),
  cloud_platform VARCHAR(50) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  status VARCHAR(50),
  region VARCHAR(100),
  metadata JSONB,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  credential_id UUID REFERENCES credentials(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  result VARCHAR(50) NOT NULL,
  error_message TEXT,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] **Step 6: Setup docker-compose**

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8080
    depends_on:
      - api

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:secret@postgres:5432/cloud_manager
      - REDIS_URL=redis://redis:6379
      - VAULT_KEY=${VAULT_KEY}
      - NODE_ENV=development
    depends_on:
      - postgres
      - redis

  worker:
    build:
      context: ./apps/worker
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://postgres:secret@postgres:5432/cloud_manager
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./apps/api/src/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    environment:
      - POSTGRES_DB=cloud_manager
      - POSTGRES_PASSWORD=secret

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

- [ ] **Step 7: Commit project structure**

```bash
git add .
git commit -m "chore: initialize project structure with monorepo setup"
```

---

### Task 2: Credential Management System (Vault Service)

**Files:**
- Create: `apps/api/src/services/vault/vault.service.ts`
- Create: `apps/api/src/services/vault/vault.types.ts`
- Create: `apps/api/src/services/vault/vault.test.ts`
- Create: `apps/api/src/services/vault/encryption.util.ts`

- [ ] **Step 1: Write encryption utility tests**

```typescript
// apps/api/src/services/vault/encryption.test.ts
import { encrypt, decrypt, generateIV, deriveKey } from './encryption.util';

describe('Encryption Utility', () => {
  const masterKey = 'test-master-key-32-char-long!!';

  it('should encrypt and decrypt data correctly', async () => {
    const plaintext = 'my-secret-access-key-123';
    const iv = generateIV();
    const key = deriveKey(masterKey, iv);

    const encrypted = encrypt(plaintext, key, iv);
    const decrypted = decrypt(encrypted, key, iv);

    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext with different IVs', async () => {
    const plaintext = 'same-secret';
    const iv1 = generateIV();
    const iv2 = generateIV();
    const key1 = deriveKey(masterKey, iv1);
    const key2 = deriveKey(masterKey, iv2);

    const encrypted1 = encrypt(plaintext, key1, iv1);
    const encrypted2 = encrypt(plaintext, key2, iv2);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should fail to decrypt with wrong key', async () => {
    const plaintext = 'secret-data';
    const iv = generateIV();
    const correctKey = deriveKey(masterKey, iv);
    const wrongKey = deriveKey('wrong-master-key', iv);

    const encrypted = encrypt(plaintext, correctKey, iv);

    expect(() => decrypt(encrypted, wrongKey, iv)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api
npm test -- encryption.test.ts
```

Expected: FAIL with "Module not found"

- [ ] **Step 3: Implement encryption utility**

```typescript
// apps/api/src/services/vault/encryption.util.ts
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export function generateIV(): Buffer {
  return randomBytes(IV_LENGTH);
}

export function deriveKey(masterKey: string, iv: Buffer): Buffer {
  return pbkdf2Sync(masterKey, iv, ITERATIONS, KEY_LENGTH, 'sha512');
}

export function encrypt(plaintext: string, key: Buffer, iv: Buffer): Buffer {
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted;
}

export function decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer): string {
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api
npm test -- encryption.test.ts
```

Expected: PASS

- [ ] **Step 5: Write vault service tests**

```typescript
// apps/api/src/services/vault/vault.test.ts
import { VaultService } from './vault.service';
import { Pool } from 'pg';

describe('VaultService', () => {
  let vaultService: VaultService;
  let mockDb: Pool;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;
    vaultService = new VaultService(mockDb, 'test-master-key');
  });

  describe('storeCredential', () => {
    it('should store credential encrypted', async () => {
      const credential = {
        name: 'AWS Production',
        cloudPlatform: 'aws',
        credentialType: 'access_key',
        data: {
          accessKeyId: 'AKIA1234567890',
          secretAccessKey: 'secret123',
        },
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'cred-1' }] });

      const result = await vaultService.storeCredential('user-1', credential);

      expect(result).toHaveProperty('id', 'cred-1');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO credentials'),
        expect.arrayContaining([
          'user-1',
          'AWS Production',
          'aws',
          'access_key',
          expect.any(Buffer),
          expect.any(Buffer),
        ])
      );
    });
  });

  describe('getTemporaryCredential', () => {
    it('should return temp credential without exposing secrets', async () => {
      const credId = 'cred-1';
      const userId = 'user-1';

      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: credId,
          encrypted_data: Buffer.from('encrypted'),
          iv: Buffer.from('iv'),
          cloud_platform: 'aws',
          credential_type: 'access_key',
        }],
      });

      const result = await vaultService.getTemporaryCredential(userId, credId);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('cloudPlatform', 'aws');
      expect(result).not.toHaveProperty('secretAccessKey');
      expect(result).not.toHaveProperty('accessKeyId');
    });

    it('should reject access if credential not owned by user', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(
        vaultService.getTemporaryCredential('wrong-user', 'cred-1')
      ).rejects.toThrow('Credential not found');
    });
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

```bash
cd apps/api
npm test -- vault.test.ts
```

Expected: FAIL with "VaultService not defined"

- [ ] **Step 7: Implement vault service**

```typescript
// apps/api/src/services/vault/vault.service.ts
import { Pool } from 'pg';
import { encrypt, decrypt, generateIV, deriveKey } from './encryption.util';
import { randomBytes } from 'crypto';
import { StoreCredentialInput, TemporaryCredential, VaultCredential } from './vault.types';

export class VaultService {
  private db: Pool;
  private masterKey: string;

  constructor(db: Pool, masterKey: string) {
    this.db = db;
    this.masterKey = masterKey;
  }

  async storeCredential(userId: string, input: StoreCredentialInput): Promise<{ id: string }> {
    const iv = generateIV();
    const key = deriveKey(this.masterKey, iv);
    const plaintext = JSON.stringify(input.data);
    const encrypted = encrypt(plaintext, key, iv);

    const result = await this.db.query(
      `INSERT INTO credentials (user_id, name, cloud_platform, credential_type, encrypted_data, iv)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, input.name, input.cloudPlatform, input.credentialType, encrypted, iv]
    );

    return { id: result.rows[0].id };
  }

  async getTemporaryCredential(userId: string, credentialId: string): Promise<TemporaryCredential> {
    const result = await this.db.query(
      `SELECT * FROM credentials WHERE id = $1 AND user_id = $2`,
      [credentialId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Credential not found');
    }

    const cred = result.rows[0];
    const key = deriveKey(this.masterKey, cred.iv);
    const decrypted = decrypt(cred.encrypted_data, key, cred.iv);
    const credentialData = JSON.parse(decrypted);

    const token = `sess_${randomBytes(16).toString('hex')}`;

    await this.db.query(
      `UPDATE credentials SET last_used_at = NOW() WHERE id = $1`,
      [credentialId]
    );

    return {
      token,
      cloudPlatform: cred.cloud_platform,
      credentialType: cred.credential_type,
      credentialId: cred.id,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    };
  }

  async listCredentials(userId: string): Promise<VaultCredential[]> {
    const result = await this.db.query(
      `SELECT id, name, cloud_platform, credential_type, created_at, last_used_at
       FROM credentials
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async deleteCredential(userId: string, credentialId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM credentials WHERE id = $1 AND user_id = $2`,
      [credentialId, userId]
    );
  }
}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
cd apps/api
npm test -- vault.test.ts
```

Expected: PASS

- [ ] **Step 9: Commit vault service**

```bash
git add apps/api/src/services/vault/
git commit -m "feat: add credential management service with AES-256-GCM encryption"
```

---

### Task 3: Fastify API Setup with WebSocket

**Files:**
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/plugins/websocket.ts`
- Create: `apps/api/src/routes/credentials.ts`

- [ ] **Step 1: Write server startup test**

```typescript
// apps/api/src/server.test.ts
import { buildApp } from './server';

describe('Fastify Server', () => {
  let app: any;

  beforeEach(async () => {
    app = await buildApp({ testing: true });
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
  });
});
```

- [ ] **Step 2: Implement Fastify server**

```typescript
// apps/api/src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { Pool } from 'pg';
import { credentialRoutes } from './routes/credentials';
import { VaultService } from './services/vault/vault.service';

export async function buildApp(options: { testing?: boolean } = {}) {
  const app = Fastify({
    logger: {
      level: options.testing ? 'silent' : 'info',
    },
  });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(websocket);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Database connection
  const db = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:secret@localhost:5432/cloud_manager',
  });

  // Services
  const vaultService = new VaultService(db, process.env.VAULT_KEY || 'default-test-key');

  // Decorators
  app.decorate('db', db);
  app.decorate('vaultService', vaultService);

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Routes
  await app.register(credentialRoutes, { prefix: '/api/credentials' });

  return app;
}

// Start server if run directly
if (require.main === module) {
  buildApp().then((app) => {
    app.listen({ port: 8080, host: '0.0.0.0' }, (err) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
    });
  });
}
```

- [ ] **Step 3: Create credential routes**

```typescript
// apps/api/src/routes/credentials.ts
import { FastifyInstance } from 'fastify';
import { VaultService } from '../services/vault/vault.service';

export async function credentialRoutes(fastify: FastifyInstance) {
  const getVaultService = (): VaultService => fastify.vaultService;

  // List credentials
  fastify.get('/', async (request, reply) => {
    const userId = request.user?.id || 'test-user';
    const vault = getVaultService();
    const credentials = await vault.listCredentials(userId);
    return { credentials };
  });

  // Store credential
  fastify.post('/', async (request, reply) => {
    const userId = request.user?.id || 'test-user';
    const vault = getVaultService();
    const result = await vault.storeCredential(userId, request.body as any);
    return { id: result.id };
  });

  // Delete credential
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.user?.id || 'test-user';
    const vault = getVaultService();
    await vault.deleteCredential(userId, (request.params as any).id);
    return { success: true };
  });
}
```

- [ ] **Step 4: Commit API setup**

```bash
git add apps/api/src/server.ts apps/api/src/routes/credentials.ts
git commit -m "feat: setup Fastify API with WebSocket and credential routes"
```

---

### Task 4: Basic AI Dialogue Service

**Files:**
- Create: `apps/api/src/services/ai/ai.service.ts`
- Create: `apps/api/src/services/ai/ai.types.ts`
- Create: `apps/api/src/services/ai/intent-parser.ts`
- Create: `apps/api/src/services/ai/ai.test.ts`

- [ ] **Step 1: Write intent parser tests**

```typescript
// apps/api/src/services/ai/intent-parser.test.ts
import { parseIntent, IntentResult } from './intent-parser';

describe('Intent Parser', () => {
  it('should parse cloud resource query', () => {
    const input = '查看AWS us-east-1的所有EC2实例';
    const result: IntentResult = parseIntent(input);

    expect(result).toEqual({
      action: 'query',
      cloudPlatform: 'aws',
      resourceType: 'ec2',
      region: 'us-east-1',
      riskLevel: 'low',
    });
  });

  it('should parse resource operation', () => {
    const input = '停止i-1234567890';
    const result: IntentResult = parseIntent(input);

    expect(result).toEqual({
      action: 'stop',
      resourceId: 'i-1234567890',
      cloudPlatform: 'auto-detect',
      riskLevel: 'high',
    });
  });

  it('should infer cloud platform from resource name', () => {
    const input = '查看vpc-abc123的详情';
    const result: IntentResult = parseIntent(input);

    expect(result.cloudPlatform).toBe('aws');
  });
});
```

- [ ] **Step 2: Implement intent parser**

```typescript
// apps/api/src/services/ai/intent-parser.ts
export interface IntentResult {
  action: string;
  cloudPlatform: string;
  resourceType?: string;
  resourceId?: string;
  region?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

const AWS_RESOURCE_PATTERNS = /^(i-|vpc-|subnet-|sg-|ami-|snap-)/;
const AZURE_RESOURCE_PATTERNS = /^\/subscriptions\//;
const GCP_RESOURCE_PATTERNS = /^projects\//;

export function parseIntent(input: string): IntentResult {
  let cloudPlatform = 'auto-detect';
  let resourceType: string | undefined;
  let resourceId: string | undefined;
  let region: string | undefined;
  let action = 'query';
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // Detect cloud platform from resource IDs
  const resourceMatch = input.match(/([a-z]{2,3}-[a-z0-9]+)/);
  if (resourceMatch) {
    const resource = resourceMatch[1];
    if (AWS_RESOURCE_PATTERNS.test(resource)) {
      cloudPlatform = 'aws';
      resourceType = resource.split('-')[0];
    }
  }

  // Detect action
  if (input.includes('停止') || input.includes('stop')) {
    action = 'stop';
    riskLevel = 'high';
  } else if (input.includes('启动') || input.includes('start')) {
    action = 'start';
    riskLevel = 'high';
  } else if (input.includes('删除') || input.includes('delete')) {
    action = 'delete';
    riskLevel = 'high';
  } else if (input.includes('查看') || input.includes('list')) {
    action = 'query';
    riskLevel = 'low';
  }

  // Extract region
  const regionMatch = input.match(/(us-east-1|us-west-2|eu-west-1|ap-southeast-1)/);
  if (regionMatch) {
    region = regionMatch[1];
  }

  return {
    action,
    cloudPlatform,
    resourceType,
    resourceId,
    region,
    riskLevel,
  };
}
```

- [ ] **Step 3: Write AI service tests**

```typescript
// apps/api/src/services/ai/ai.test.ts
import { AIService } from './ai.service';
import { VaultService } from '../vault/vault.service';

describe('AIService', () => {
  let aiService: AIService;
  let mockVault: VaultService;

  beforeEach(() => {
    mockVault = {
      getTemporaryCredential: jest.fn(),
    } as any;
    aiService = new AIService(mockVault);
  });

  describe('processMessage', () => {
    it('should generate plan for resource query', async () => {
      (mockVault.getTemporaryCredential as jest.Mock).mockResolvedValue({
        token: 'sess_test123',
        cloudPlatform: 'aws',
      });

      const result = await aiService.processMessage(
        '查看AWS EC2实例',
        { mode: 'plan' }
      );

      expect(result).toHaveProperty('plan');
      expect(result.plan).toHaveProperty('steps');
      expect(result.plan.steps.length).toBeGreaterThan(0);
    });

    it('should request temp credential before execution', async () => {
      (mockVault.getTemporaryCredential as jest.Mock).mockResolvedValue({
        token: 'sess_test123',
        cloudPlatform: 'aws',
      });

      await aiService.processMessage('查看AWS EC2实例', { mode: 'auto' });

      expect(mockVault.getTemporaryCredential).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 4: Implement AI service**

```typescript
// apps/api/src/services/ai/ai.service.ts
import { VaultService } from '../vault/vault.service';
import { parseIntent, IntentResult } from './intent-parser';

export interface ProcessMessageOptions {
  mode: 'plan' | 'ask' | 'auto';
  userId?: string;
}

export interface PlanStep {
  action: string;
  params: Record<string, any>;
}

export interface ProcessResult {
  plan?: { steps: PlanStep[] };
  execution?: any;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export class AIService {
  private vault: VaultService;

  constructor(vault: VaultService) {
    this.vault = vault;
  }

  async processMessage(message: string, options: ProcessMessageOptions): Promise<ProcessResult> {
    const intent = parseIntent(message);

    if (intent.action === 'query') {
      return this.handleQuery(intent, options);
    } else if (['stop', 'start', 'delete'].includes(intent.action)) {
      return this.handleOperation(intent, options);
    }

    throw new Error('Unknown action type');
  }

  private async handleQuery(intent: IntentResult, options: ProcessMessageOptions): Promise<ProcessResult> {
    const plan: PlanStep[] = [];

    if (intent.resourceType === 'ec2') {
      plan.push({
        action: 'list_ec2_instances',
        params: {
          region: intent.region || 'us-east-1',
        },
      });
    }

    if (options.mode === 'plan') {
      return { plan: { steps: plan } };
    }

    // Get temp credential and execute
    const tempCred = await this.vault.getTemporaryCredential(
      options.userId || 'anonymous',
      'cred-placeholder'
    );

    return {
      plan: { steps: plan },
      execution: {
        token: tempCred.token,
        status: 'ready',
      },
    };
  }

  private async handleOperation(intent: IntentResult, options: ProcessMessageOptions): Promise<ProcessResult> {
    const plan: PlanStep[] = [
      {
        action: `${intent.action}_resource`,
        params: {
          resourceId: intent.resourceId,
          region: intent.region,
        },
      },
    ];

    if (options.mode === 'plan') {
      return { plan: { steps: plan } };
    }

    if (options.mode === 'ask') {
      return {
        plan: { steps: plan },
        requiresConfirmation: true,
        confirmationMessage: `确认${intent.action}资源 ${intent.resourceId}？`,
      };
    }

    // Auto mode - execute
    const tempCred = await this.vault.getTemporaryCredential(
      options.userId || 'anonymous',
      'cred-placeholder'
    );

    return {
      plan: { steps: plan },
      execution: {
        token: tempCred.token,
        status: 'executing',
      },
    };
  }
}
```

- [ ] **Step 5: Run AI service tests**

```bash
cd apps/api
npm test -- ai.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit AI service**

```bash
git add apps/api/src/services/ai/
git commit -m "feat: add AI dialogue service with intent parsing and execution modes"
```

---

### Task 5: PostgreSQL Database Integration

**Files:**
- Create: `apps/api/src/database/connection.ts`
- Create: `apps/api/src/database/connection.test.ts`

- [ ] **Step 1: Write connection test**

```typescript
// apps/api/src/database/connection.test.ts
import { createDatabaseConnection, DatabaseConnection } from './connection';

describe('Database Connection', () => {
  let db: DatabaseConnection;

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('should connect to database', async () => {
    db = await createDatabaseConnection({
      connectionString: 'postgresql://postgres:secret@localhost:5432/cloud_manager',
    });

    expect(db).toBeDefined();
    expect(db.pool).toBeDefined();
  });

  it('should execute query', async () => {
    db = await createDatabaseConnection({
      connectionString: 'postgresql://postgres:secret@localhost:5432/cloud_manager',
    });

    const result = await db.query('SELECT 1 as num');
    expect(result.rows[0].num).toBe(1);
  });
});
```

- [ ] **Step 2: Implement database connection**

```typescript
// apps/api/src/database/connection.ts
import { Pool, PoolConfig } from 'pg';

export interface DatabaseConnection {
  pool: Pool;
  query: (text: string, params?: any[]) => Promise<any>;
  close: () => Promise<void>;
}

export async function createDatabaseConnection(config: PoolConfig): Promise<DatabaseConnection> {
  const pool = new Pool(config);

  // Test connection
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }

  return {
    pool,
    query: (text: string, params?: any[]) => pool.query(text, params),
    close: () => pool.end(),
  };
}
```

- [ ] **Step 3: Commit database integration**

```bash
git add apps/api/src/database/
git commit -m "feat: add PostgreSQL database connection and integration"
```

---

### Task 6: Redis Cache Integration

**Files:**
- Create: `apps/api/src/cache/redis.ts`
- Create: `apps/api/src/cache/redis.test.ts`

- [ ] **Step 1: Write Redis cache tests**

```typescript
// apps/api/src/cache/redis.test.ts
import { RedisCache } from './redis';

describe('Redis Cache', () => {
  let cache: RedisCache;

  beforeEach(async () => {
    cache = new RedisCache({
      url: 'redis://localhost:6379',
    });
    await cache.connect();
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  it('should set and get value', async () => {
    await cache.set('test-key', { data: 'test-value' }, 60);
    const value = await cache.get('test-key');
    expect(value).toEqual({ data: 'test-value' });
  });

  it('should expire keys', async () => {
    await cache.set('expire-key', 'value', 1); // 1 second TTL
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const value = await cache.get('expire-key');
    expect(value).toBeNull();
  });

  it('should delete keys', async () => {
    await cache.set('delete-me', 'value');
    await cache.delete('delete-me');
    const value = await cache.get('delete-me');
    expect(value).toBeNull();
  });
});
```

- [ ] **Step 2: Implement Redis cache**

```typescript
// apps/api/src/cache/redis.ts
import Redis from 'ioredis';

export interface RedisCacheConfig {
  url: string;
}

export class RedisCache {
  private client: Redis;
  private connected = false;

  constructor(config: RedisCacheConfig) {
    this.client = new Redis(config.url, {
      maxRetriesPerRequest: 3,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    this.connected = false;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.client.setex(key, ttlSeconds, serialized);
  }

  async get(key: string): Promise<any | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(value);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
```

- [ ] **Step 3: Commit Redis integration**

```bash
git add apps/api/src/cache/
git commit -m "feat: add Redis cache integration for hot resources"
```

---

### Task 7: Basic Web Terminal Interface

**Files:**
- Create: `apps/web/src/components/terminal/WebTerminal.tsx`
- Create: `apps/web/src/components/terminal/useTerminal.ts`
- Create: `apps/web/src/stores/dialogueStore.ts`

- [ ] **Step 1: Create terminal component**

```tsx
// apps/web/src/components/terminal/WebTerminal.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import 'xterm/css/xterm.css';

interface WebTerminalProps {
  onCommand: (command: string) => void;
  output: string;
}

export function WebTerminal({ onCommand, output }: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#1a1a2e',
        foreground: '#eaeaea',
        cursor: '#00d4aa',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    terminal.onData((data) => {
      if (data === '\r') {
        const line = terminal.buffer.active.getLine(terminal.buffer.active.cursorY);
        const command = line?.translateToString(true) || '';
        onCommand(command);
        terminal.write('\r\n');
      } else {
        terminal.write(data);
      }
    });

    xtermRef.current = terminal;

    return () => {
      terminal.dispose();
    };
  }, [onCommand]);

  useEffect(() => {
    if (xtermRef.current && output) {
      xtermRef.current.write(output);
    }
  }, [output]);

  return (
    <div
      ref={terminalRef}
      className="w-full h-full bg-[#1a1a2e] rounded-lg overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
}
```

- [ ] **Step 2: Create dialogue store**

```typescript
// apps/web/src/stores/dialogueStore.ts
import { create } from 'zustand';

type DialogueMode = 'plan' | 'ask' | 'auto';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DialogueState {
  mode: DialogueMode;
  messages: Message[];
  isProcessing: boolean;
  setMode: (mode: DialogueMode) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setProcessing: (processing: boolean) => void;
  clearMessages: () => void;
}

export const useDialogueStore = create<DialogueState>((set) => ({
  mode: 'ask',
  messages: [],
  isProcessing: false,
  setMode: (mode) => set({ mode }),
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),
  setProcessing: (processing) => set({ isProcessing: processing }),
  clearMessages: () => set({ messages: [] }),
}));
```

- [ ] **Step 3: Commit terminal components**

```bash
git add apps/web/src/components/terminal/ apps/web/src/stores/
git commit -m "feat: add web terminal component with xterm.js integration"
```

---

## Phase 2: Multi-Cloud Integration (2-3 weeks)

### Task 8: AWS Cloud Adapter

**Files:**
- Create: `packages/cloud-aws/src/index.ts`
- Create: `packages/cloud-aws/src/ec2.adapter.ts`
- Create: `packages/cloud-aws/src/ec2.test.ts`

- [ ] **Step 1: Write EC2 adapter tests**

```typescript
// packages/cloud-aws/src/ec2.test.ts
import { EC2Adapter } from './ec2.adapter';

describe('EC2Adapter', () => {
  let adapter: EC2Adapter;

  beforeEach(() => {
    adapter = new EC2Adapter({
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      region: 'us-east-1',
    });
  });

  describe('listInstances', () => {
    it('should return list of EC2 instances', async () => {
      const instances = await adapter.listInstances();

      expect(Array.isArray(instances)).toBe(true);
      instances.forEach((instance) => {
        expect(instance).toHaveProperty('id');
        expect(instance).toHaveProperty('name');
        expect(instance).toHaveProperty('status');
        expect(instance).toHaveProperty('type');
      });
    });

    it('should filter by region', async () => {
      const instances = await adapter.listInstances({ region: 'us-west-2' });

      instances.forEach((instance) => {
        expect(instance.region).toBe('us-west-2');
      });
    });
  });

  describe('stopInstance', () => {
    it('should stop an instance', async () => {
      const result = await adapter.stopInstance('i-test123');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('status', 'stopping');
    });
  });
});
```

- [ ] **Step 2: Implement EC2 adapter**

```typescript
// packages/cloud-aws/src/ec2.adapter.ts
import {
  EC2Client,
  DescribeInstancesCommand,
  StopInstancesCommand,
  StartInstancesCommand,
  Instance,
} from '@aws-sdk/client-ec2';

export interface AWSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface EC2Instance {
  id: string;
  name: string;
  status: string;
  type: string;
  region: string;
  privateIp?: string;
  publicIp?: string;
}

export class EC2Adapter {
  private client: EC2Client;

  constructor(config: AWSConfig) {
    this.client = new EC2Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: config.region,
    });
  }

  async listInstances(options?: { region?: string }): Promise<EC2Instance[]> {
    const command = new DescribeInstancesCommand({});
    const response = await this.client.send(command);

    const instances: EC2Instance[] = [];

    for (const reservation of response.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        instances.push(this.mapInstance(instance));
      }
    }

    return instances;
  }

  async stopInstance(instanceId: string): Promise<{ success: boolean; status: string }> {
    const command = new StopInstancesCommand({
      InstanceIds: [instanceId],
    });

    await this.client.send(command);

    return {
      success: true,
      status: 'stopping',
    };
  }

  async startInstance(instanceId: string): Promise<{ success: boolean; status: string }> {
    const command = new StartInstancesCommand({
      InstanceIds: [instanceId],
    });

    await this.client.send(command);

    return {
      success: true,
      status: 'pending',
    };
  }

  private mapInstance(instance: Instance): EC2Instance {
    const nameTag = instance.Tags?.find((t) => t.Key === 'Name');

    return {
      id: instance.InstanceId || '',
      name: nameTag?.Value || 'unnamed',
      status: instance.State?.Name || 'unknown',
      type: instance.InstanceType || 'unknown',
      region: this.client.config.region || 'unknown',
      privateIp: instance.PrivateIpAddress,
      publicIp: instance.PublicIpAddress,
    };
  }
}
```

- [ ] **Step 3: Commit AWS adapter**

```bash
git add packages/cloud-aws/
git commit -m "feat: add AWS EC2 adapter for instance management"
```

---

### Task 9: Resource Discovery Service

**Files:**
- Create: `apps/api/src/services/resources/resource-discovery.service.ts`
- Create: `apps/api/src/services/resources/resource-discovery.test.ts`

- [ ] **Step 1: Write resource discovery tests**

```typescript
// apps/api/src/services/resources/resource-discovery.test.ts
import { ResourceDiscoveryService } from './resource-discovery.service';
import { Pool } from 'pg';

describe('ResourceDiscoveryService', () => {
  let service: ResourceDiscoveryService;
  let mockDb: Pool;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;
    service = new ResourceDiscoveryService(mockDb);
  });

  describe('discoverResources', () => {
    it('should discover EC2 instances', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      const resources = await service.discoverResources('aws', 'cred-1');

      expect(Array.isArray(resources)).toBe(true);
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('syncResources', () => {
    it('should update existing resources', async () => {
      const existingResources = [
        { resource_id: 'i-123', status: 'running' },
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: existingResources })
        .mockResolvedValue({ rows: [] });

      await service.syncResources('aws', 'cred-1');

      expect(mockDb.query).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Implement resource discovery**

```typescript
// apps/api/src/services/resources/resource-discovery.service.ts
import { Pool } from 'pg';

export interface DiscoveredResource {
  cloudPlatform: string;
  resourceType: string;
  resourceId: string;
  name: string;
  status: string;
  region: string;
  metadata: Record<string, any>;
}

export class ResourceDiscoveryService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async discoverResources(cloudPlatform: string, credentialId: string): Promise<DiscoveredResource[]> {
    // Placeholder - will integrate with cloud adapters
    const resources: DiscoveredResource[] = [];

    // Store discovered resources
    for (const resource of resources) {
      await this.storeResource(credentialId, resource);
    }

    return resources;
  }

  async syncResources(cloudPlatform: string, credentialId: string): Promise<void> {
    // Get existing resources
    const existing = await this.db.query(
      'SELECT resource_id, metadata FROM resources WHERE credential_id = $1',
      [credentialId]
    );

    // Discover new state
    const discovered = await this.discoverResources(cloudPlatform, credentialId);

    // Update changed resources
    for (const resource of discovered) {
      const existingResource = existing.rows.find(
        (r) => r.resource_id === resource.resourceId
      );

      if (!existingResource) {
        await this.storeResource(credentialId, resource);
      } else if (JSON.stringify(existingResource.metadata) !== JSON.stringify(resource.metadata)) {
        await this.updateResource(credentialId, resource);
      }
    }
  }

  private async storeResource(credentialId: string, resource: DiscoveredResource): Promise<void> {
    await this.db.query(
      `INSERT INTO resources (credential_id, cloud_platform, resource_type, resource_id, name, status, region, metadata, last_synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        credentialId,
        resource.cloudPlatform,
        resource.resourceType,
        resource.resourceId,
        resource.name,
        resource.status,
        resource.region,
        resource.metadata,
      ]
    );
  }

  private async updateResource(credentialId: string, resource: DiscoveredResource): Promise<void> {
    await this.db.query(
      `UPDATE resources
       SET name = $1, status = $2, metadata = $3, last_synced_at = NOW()
       WHERE credential_id = $4 AND resource_id = $5`,
      [resource.name, resource.status, resource.metadata, credentialId, resource.resourceId]
    );
  }
}
```

- [ ] **Step 3: Commit resource discovery**

```bash
git add apps/api/src/services/resources/
git commit -m "feat: add resource discovery and sync service"
```

---

### Task 10: Background Worker for Resource Sync

**Files:**
- Create: `apps/worker/src/index.ts`
- Create: `apps/worker/src/jobs/sync-resources.ts`

- [ ] **Step 1: Create worker entry point**

```typescript
// apps/worker/src/index.ts
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { syncResourcesJob } from './jobs/sync-resources';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create queue
export const syncQueue = new Queue('cloud-resource-sync', { connection });

// Create worker
const worker = new Worker(
  'cloud-resource-sync',
  async (job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'sync-resources') {
      await syncResourcesJob(job.data);
    }
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});

console.log('Worker started and listening for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});
```

- [ ] **Step 2: Create sync resources job**

```typescript
// apps/worker/src/jobs/sync-resources.ts
import { Pool } from 'pg';
import { ResourceDiscoveryService } from '../../api/src/services/resources/resource-discovery.service';

export interface SyncJobData {
  credentialId: string;
  cloudPlatform: string;
}

export async function syncResourcesJob(data: SyncJobData): Promise<void> {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const discoveryService = new ResourceDiscoveryService(db);

    console.log(`Syncing resources for credential ${data.credentialId}...`);

    await discoveryService.syncResources(data.cloudPlatform, data.credentialId);

    console.log(`Sync completed for credential ${data.credentialId}`);
  } catch (error) {
    console.error(`Sync failed: ${error.message}`);
    throw error;
  } finally {
    await db.end();
  }
}
```

- [ ] **Step 3: Commit worker**

```bash
git add apps/worker/
git commit -m "feat: add background worker for cloud resource synchronization"
```

---

## Phase 3: Advanced Features (2-3 weeks)

### Task 11: Topology Generation Service

**Files:**
- Create: `apps/api/src/services/topology/topology.service.ts`
- Create: `apps/api/src/services/topology/topology.test.ts`

- [ ] **Step 1: Write topology tests**

```typescript
// apps/api/src/services/topology/topology.test.ts
import { TopologyService } from './topology.service';
import { Pool } from 'pg';

describe('TopologyService', () => {
  let service: TopologyService;
  let mockDb: Pool;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;
    service = new TopologyService(mockDb);
  });

  describe('generateTopology', () => {
    it('should generate topology graph from resources', async () => {
      const resources = [
        {
          resource_id: 'vpc-123',
          resource_type: 'vpc',
          name: 'main-vpc',
          metadata: {},
        },
        {
          resource_id: 'subnet-456',
          resource_type: 'subnet',
          name: 'public-subnet',
          metadata: { vpc_id: 'vpc-123' },
        },
        {
          resource_id: 'i-789',
          resource_type: 'instance',
          name: 'web-server',
          metadata: { subnet_id: 'subnet-456' },
        },
      ];

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: resources });

      const topology = await service.generateTopology('cred-1');

      expect(topology).toHaveProperty('nodes');
      expect(topology).toHaveProperty('edges');
      expect(topology.nodes.length).toBe(3);
      expect(topology.edges.length).toBe(2);
    });
  });
});
```

- [ ] **Step 2: Implement topology service**

```typescript
// apps/api/src/services/topology/topology.service.ts
import { Pool } from 'pg';

export interface TopologyNode {
  id: string;
  label: string;
  type: string;
  status: string;
  metadata: Record<string, any>;
}

export interface TopologyEdge {
  from: string;
  to: string;
  type: string;
}

export interface TopologyGraph {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export class TopologyService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async generateTopology(credentialId: string): Promise<TopologyGraph> {
    const resources = await this.db.query(
      'SELECT * FROM resources WHERE credential_id = $1',
      [credentialId]
    );

    const nodes: TopologyNode[] = resources.rows.map((r) => ({
      id: r.resource_id,
      label: r.name || r.resource_id,
      type: r.resource_type,
      status: r.status,
      metadata: r.metadata,
    }));

    const edges = this.buildEdges(resources.rows);

    return { nodes, edges };
  }

  private buildEdges(resources: any[]): TopologyEdge[] {
    const edges: TopologyEdge[] = [];

    for (const resource of resources) {
      if (resource.metadata?.vpc_id) {
        edges.push({
          from: resource.metadata.vpc_id,
          to: resource.resource_id,
          type: 'contains',
        });
      }

      if (resource.metadata?.subnet_id) {
        edges.push({
          from: resource.metadata.subnet_id,
          to: resource.resource_id,
          type: 'contains',
        });
      }
    }

    return edges;
  }
}
```

- [ ] **Step 3: Commit topology service**

```bash
git add apps/api/src/services/topology/
git commit -m "feat: add topology generation service for resource visualization"
```

---

### Task 12: WebSocket Dialogue Handler

**Files:**
- Create: `apps/api/src/plugins/websocket-handler.ts`
- Create: `apps/api/src/plugins/websocket-handler.test.ts`

- [ ] **Step 1: Write WebSocket handler tests**

```typescript
// apps/api/src/plugins/websocket-handler.test.ts
import { WebSocketHandler } from './websocket-handler';

describe('WebSocketHandler', () => {
  let handler: WebSocketHandler;

  beforeEach(() => {
    handler = new WebSocketHandler();
  });

  it('should handle message event', async () => {
    const mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
    } as any;

    handler.handleConnection(mockSocket);

    expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('should process dialogue message', async () => {
    const result = await handler.processMessage({
      type: 'message',
      content: '查看AWS EC2',
      mode: 'ask',
    });

    expect(result).toHaveProperty('plan');
  });
});
```

- [ ] **Step 2: Implement WebSocket handler**

```typescript
// apps/api/src/plugins/websocket-handler.ts
import { Socket } from 'socket.io';
import { AIService } from '../services/ai/ai.service';
import { VaultService } from '../services/vault/vault.service';

export class WebSocketHandler {
  private aiService: AIService;
  private vaultService: VaultService;

  constructor(aiService: AIService, vaultService: VaultService) {
    this.aiService = aiService;
    this.vaultService = vaultService;
  }

  handleConnection(socket: Socket): void {
    console.log('Client connected:', socket.id);

    socket.on('message', async (data) => {
      try {
        const result = await this.processMessage(data);
        socket.emit('response', result);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  }

  async processMessage(data: any): Promise<any> {
    const { content, mode } = data;

    const result = await this.aiService.processMessage(content, {
      mode: mode || 'ask',
    });

    return result;
  }
}
```

- [ ] **Step 3: Commit WebSocket handler**

```bash
git add apps/api/src/plugins/
git commit -m "feat: add WebSocket handler for real-time dialogue"
```

---

## Phase 4: Polish & Testing (1-2 weeks)

### Task 13: Integration Tests

**Files:**
- Create: `apps/api/tests/integration/credentials.test.ts`
- Create: `apps/api/tests/integration/dialogue.test.ts`

- [ ] **Step 1: Write credential integration tests**

```typescript
// apps/api/tests/integration/credentials.test.ts
import { buildApp } from '../../src/server';
import { FastifyInstance } from 'fastify';

describe('Credential API Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ testing: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create and list credentials', async () => {
    // Create credential
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/credentials',
      payload: {
        name: 'Test AWS',
        cloudPlatform: 'aws',
        credentialType: 'access_key',
        data: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      },
    });

    expect(createResponse.statusCode).toBe(200);
    const { id } = createResponse.json();

    // List credentials
    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/credentials',
    });

    expect(listResponse.statusCode).toBe(200);
    const { credentials } = listResponse.json();
    expect(credentials.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Commit integration tests**

```bash
git add apps/api/tests/
git commit -m "test: add integration tests for credentials and dialogue APIs"
```

---

### Task 14: Frontend Layout and Navigation

**Files:**
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/components/sidebar/Sidebar.tsx`
- Create: `apps/web/src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Create main layout**

```tsx
// apps/web/src/components/layout/MainLayout.tsx
'use client';

import { Sidebar } from '../sidebar/Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create sidebar component**

```tsx
// apps/web/src/components/sidebar/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: '对话', href: '/', icon: 'chat' },
    { name: '资源', href: '/resources', icon: 'server' },
    { name: '拓扑图', href: '/topology', icon: 'diagram' },
    { name: '凭证', href: '/credentials', icon: 'key' },
    { name: '设置', href: '/settings', icon: 'cog' },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4">
        <h1 className="text-xl font-bold">Multi-Cloud Manager</h1>
      </div>
      <nav className="flex-1 p-4">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`block p-2 rounded mb-2 ${
              pathname === item.href
                ? 'bg-gray-700'
                : 'hover:bg-gray-800'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Commit frontend layout**

```bash
git add apps/web/src/components/layout/ apps/web/src/components/sidebar/
git commit -m "feat: add main layout and sidebar navigation"
```

---

### Task 15: Documentation and README

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `docs/api.md`

- [ ] **Step 1: Create README**

```markdown
# Multi-Cloud Manager

A web-based multi-cloud management platform with AI-powered conversational interface for managing cloud resources across AWS, Azure, GCP, and OCI.

## Features

- **AI Dialogue Interface**: Hybrid chat/terminal interface for natural language cloud management
- **Credential Security**: Agent Vault pattern ensures AI never directly accesses secrets
- **Multi-Cloud Support**: Manage AWS, Azure, GCP, and OCI resources from one place
- **Resource Topology**: Visualize cloud infrastructure and dependencies
- **Real-time Sync**: Automatic resource discovery and synchronization

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

### Setup

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start the services:
   ```bash
   docker-compose up -d
   ```

4. Access the application:
   - Web UI: http://localhost:3000
   - API: http://localhost:8080
   - Health Check: http://localhost:8080/health

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation.

## API Documentation

See [docs/api.md](docs/api.md) for API reference.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
```

- [ ] **Step 2: Commit documentation**

```bash
git add README.md CONTRIBUTING.md docs/
git commit -m "docs: add README and API documentation"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-05-multi-cloud-manager-plan.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
