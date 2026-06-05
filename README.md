# Cloud Manager - Multi-Cloud Management Platform

A comprehensive monorepo project for managing multi-cloud resources across AWS, Azure, GCP, and OCI.

## Project Structure

```
cloud-manager/
├── apps/
│   ├── web/              # Next.js 14 frontend with xterm.js terminal
│   ├── api/              # Fastify REST API backend
│   └── worker/           # Background job processor
├── packages/
│   └── shared/           # Shared types, schemas, and utilities
├── docker-compose.yml    # Docker orchestration
├── Dockerfile.*          # Service-specific Dockerfiles
└── package.json          # Root monorepo configuration
```

## Technology Stack

### Frontend (apps/web)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Terminal**: xterm.js with FitAddon and WebLinksAddon
- **Testing**: Jest with React Testing Library

### Backend (apps/api)
- **Framework**: Fastify with TypeScript
- **Database**: PostgreSQL with pg driver
- **Cache**: Redis with ioredis
- **Logging**: Pino
- **Validation**: Zod
- **Authentication**: JWT with bcryptjs

### Worker (apps/worker)
- **Runtime**: Node.js with TypeScript
- **Queue**: Redis with ioredis
- **Cloud SDKs**: AWS SDK, Azure SDK, GCP SDK, OCI SDK

### Shared Package (packages/shared)
- **Type Safety**: TypeScript types and interfaces
- **Validation**: Zod schemas
- **Utilities**: Helper functions for formatting, validation, etc.

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development servers:
   ```bash
   npm run dev
   ```

Or use Docker Compose:
```bash
docker-compose up
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL
- `REDIS_HOST`, `REDIS_PORT` - Redis
- `JWT_SECRET` - Authentication secret
- `PORT` - API server port (default: 8080)

## Available Scripts

### Root Level
- `npm run dev` - Start all development servers
- `npm run build` - Build all applications
- `npm run test` - Run all tests

### Per Workspace
- `npm run dev -w apps/web` - Start web dev server
- `npm run dev -w apps/api` - Start API dev server
- `npm run build -w apps/web` - Build web app
- `npm run build -w apps/api` - Build API
- `npm run test -w apps/web` - Run web tests
- `npm run test -w apps/api` - Run API tests
- `npm run test -w packages/shared` - Run shared package tests

## Database Schema

The PostgreSQL schema includes:

### Tables
- `users` - User accounts with role-based access
- `credentials` - Encrypted cloud provider credentials
- `resources` - Cloud resources across providers
- `audit_logs` - Activity audit trail

### Features
- UUID extension enabled
- Automatic `updated_at` timestamp triggers
- Comprehensive indexes for performance
- Foreign key constraints with cascading deletes

See `apps/api/src/database/schema.sql` for full schema.

## Docker Services

- **web**: Next.js frontend (port 3000)
- **api**: Fastify backend (port 8080)
- **worker**: Background job processor
- **postgres**: PostgreSQL 15 (port 5432)
- **redis**: Redis 7 (port 6379)

Run with:
```bash
docker-compose up -d
```

## Testing

### Unit Tests
```bash
# Run all tests
npm run test

# Run specific workspace tests
npm run test -w apps/web
npm run test -w apps/api
npm run test -w packages/shared
```

### Test Coverage
```bash
npm run test -w apps/api -- --coverage
```

## Architecture

### Resource Management
- Fetch resources from cloud providers
- Sync and cache in PostgreSQL
- Background workers for periodic updates

### Credential Security
- Encrypted storage with AES-256
- Role-based access control
- Audit logging for all operations

### Terminal Integration
- Web-based terminal using xterm.js
- WebSocket connection to backend
- Execute commands across cloud providers

## Development Workflow

1. Create feature branch
2. Implement changes with tests
3. Run `npm run test` to verify
4. Create pull request
5. Merge to main

## License

ISC
