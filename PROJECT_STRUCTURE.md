# Cloud Manager Project Structure

## Overview
This monorepo contains a multi-cloud management platform with three main applications and a shared package.

## Directory Layout

```
.
├── apps/
│   ├── web/                    # Next.js 14 Frontend
│   │   ├── src/
│   │   │   ├── app/           # App router pages
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/    # React components
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   └── Terminal.tsx
│   │   │   └── stores/       # Zustand stores
│   │   │       └── cloudStore.ts
│   │   ├── __tests__/        # Jest tests
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── postcss.config.js
│   │
│   ├── api/                    # Fastify REST API
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point
│   │   │   ├── routes/       # API routes
│   │   │   │   ├── index.ts
│   │   │   │   ├── resources.ts
│   │   │   │   ├── users.ts
│   │   │   │   └── credentials.ts
│   │   │   ├── database/     # Database setup
│   │   │   │   ├── index.ts
│   │   │   │   └── schema.sql
│   │   │   └── utils/        # Configuration
│   │   │       └── config.ts
│   │   ├── __tests__/        # Jest tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── worker/                 # Background Worker
│       ├── src/
│       │   ├── index.ts      # Entry point
│       │   ├── config.ts     # Configuration
│       │   ├── workers/      # Job handlers
│       │   │   ├── resourceWorker.ts
│       │   │   └── auditWorker.ts
│       │   └── services/     # Service logic
│       │       ├── resourceService.ts
│       │       └── auditService.ts
│       ├── __tests__/        # Jest tests
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                 # Shared Code
│       ├── src/
│       │   ├── index.ts      # Entry point
│       │   ├── types.ts      # TypeScript types
│       │   ├── schemas.ts    # Zod validation schemas
│       │   └── utils.ts      # Utility functions
│       ├── __tests__/        # Jest tests
│       ├── package.json
│       └── tsconfig.json
│
├── docker-compose.yml          # Docker orchestration
├── Dockerfile.web              # Web service container
├── Dockerfile.api              # API service container
├── Dockerfile.worker           # Worker service container
├── package.json                # Root monorepo config
├── README.md                   # Documentation
└── .env.example                # Environment template
```

## Package Details

### apps/web (Frontend)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Terminal**: xterm.js
- **Testing**: Jest + React Testing Library

### apps/api (Backend)
- **Framework**: Fastify with TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Logging**: Pino
- **Validation**: Zod
- **Auth**: JWT + bcryptjs

### apps/worker (Background Jobs)
- **Runtime**: Node.js + TypeScript
- **Queue**: Redis (ioredis)
- **Cloud SDKs**: AWS, Azure, GCP, OCI

### packages/shared (Shared Code)
- **Types**: TypeScript interfaces
- **Schemas**: Zod validation
- **Utils**: Helper functions

## Development Commands

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build all
npm run build

# Run tests
npm run test

# Start specific workspace
npm run dev -w apps/web
npm run dev -w apps/api

# Docker
docker-compose up -d
docker-compose down
```

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Web      │    │    API      │    │   Worker    │
│  (Next.js)  │◄──►│  (Fastify)  │◄──►│  (Redis)    │
└─────────────┘    └──────┬──────┘    └─────────────┘
                          │
                   ┌──────┴──────┐
                   │ PostgreSQL  │
                   └─────────────┘
```

## Key Features

1. **Multi-Cloud Support**: AWS, Azure, GCP, OCI
2. **Web Terminal**: Execute commands via xterm.js
3. **Credential Security**: Encrypted storage
4. **Audit Logging**: Track all operations
5. **Real-time Updates**: WebSocket support
6. **Role-based Access**: Admin, User, Viewer roles
