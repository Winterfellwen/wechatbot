# Multi-Cloud Manager Platform Design Spec

**Project**: 多云管理平台 (Multi-Cloud Manager)
**Version**: 1.0
**Date**: 2026-06-05
**Status**: Approved

## Overview

A web-based multi-cloud management platform with AI-powered conversational interface for managing cloud resources across AWS, Azure, GCP, and OCI. The platform provides secure credential management, real-time resource viewing, and topology visualization through a hybrid chat/terminal interface.

### Core Principles

1. **Credential Isolation**: AI never directly accesses secrets; uses temporary tokens
2. **Real-time Interaction**: WebSocket-based dialogue flow with instant feedback
3. **Modular Design**: Each cloud provider implemented as pluggable adapter
4. **Complete Audit**: All credential access and operations logged

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Frontend (Next.js)                    │
├──────────────────┬──────────────────┬───────────────────────┤
│   Web Terminal   │  Dashboard UI    │  Resource Topology    │
│   (xterm.js)     │  (React)         │  (D3.js/vis.js)       │
└────────┬─────────┴────────┬─────────┴───────────┬───────────┘
         │                   │                     │
         ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Fastify)                    │
├──────────────────┬──────────────────┬───────────────────────┤
│  WebSocket      │  REST API        │  GraphQL              │
│  (Dialogue)     │  (CRUD)           │  (Queries)            │
└────────┬─────────┴────────┬─────────┴───────────┬───────────┘
         │                   │                     │
         ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Microservices Layer                       │
├──────────────────┬──────────────────┬───────────────────────┤
│  AI Dialogue    │  Cloud Engine    │  Vault Service         │
│  Service        │                  │                        │
├──────────────────┼──────────────────┼───────────────────────┤
│  - Multi-model  │  - AWS SDK       │  - Encrypted storage   │
│  - Context mgmt │  - Azure SDK     │  - Temp credentials    │
│  - Session mgmt │  - GCP SDK       │  - Permission isolation│
│                 │  - OCI SDK       │  - Audit logging       │
└────────┬─────────┴────────┬─────────┴───────────┬───────────┘
         │                   │                     │
         ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
├──────────────────┬──────────────────┬───────────────────────┤
│  PostgreSQL      │  Redis           │  Local Storage         │
│  (Metadata)      │  (Cache/Sessions)│  (Encrypted secrets)   │
└──────────────────┴──────────────────┴───────────────────────┘
```

### Design Decisions

**Chosen**: Web terminal + microservices architecture
**Rationale**: 
- Combines terminal power (proven in OpenCode/Claude Squad) with web accessibility (proven in KubeSphere)
- Microservices enable independent scaling and deployment
- Easier to maintain and extend than monolith

**Alternatives Considered**:
- Full terminal (Claude Code extension) - rejected: web accessibility required
- Pure chat interface (ChatGPT-style) - rejected: terminal better for complex operations
- Serverless - rejected: WebSocket cold start latency unacceptable

---

## AI Dialogue Service

### Architecture

```
User Input
    │
    ▼
┌──────────────────────────────────────────┐
│          Intent Parsing Layer            │
├──────────────────────────────────────────┤
│  1. Command classification              │
│     (resource query/operation/config)   │
│  2. Cloud platform inference             │
│     (AWS/Azure/GCP/OCI)                 │
│  3. Credential matching                  │
│     (auto-detect which credential)      │
│  4. Operation risk assessment            │
│     (high/medium/low)                   │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│          AI Model Layer                  │
├──────────────────────────────────────────┤
│  Supported: OpenAI/Claude/Local models  │
│  Functions:                              │
│  - Generate execution plan (JSON)       │
│  - Generate execution code (TypeScript) │
│  - Smart mode selection                 │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│          Execution Control Layer          │
├──────────────────────────────────────────┤
│  Three modes:                           │
│  1. Plan - output plan only, no exec    │
│  2. Ask - show plan, confirm before     │
│  3. Auto - execute all automatically    │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│          Execution Layer                 │
├──────────────────────────────────────────┤
│  - Load appropriate cloud credentials   │
│  - Execute SDK calls                    │
│  - Stream progress in real-time         │
│  - Record audit logs                    │
└──────────────────────────────────────────┘
```

### Three Dialogue Modes

**Plan Mode**:
- AI outputs JSON-formatted execution plan
- Frontend displays as tree structure
- No actual execution
- User can modify or export

**Ask Mode**:
- AI outputs plan first
- Frontend shows confirmation dialog
- User confirms before execution
- Supports per-operation confirmation

**Auto Mode**:
- AI generates plan then executes immediately
- Real-time progress display
- Pauses on exceptions

### Dialogue Protocol

```typescript
// Client → Server
{
  type: 'message',
  content: '查看AWS EC2实例',
  mode: 'ask' // plan | ask | auto
}

// Server → Client (multiple updates)
{
  type: 'execution_update',
  step: 'scanning',
  progress: 0.5,
  data: { region: 'us-east-1' }
}

{
  type: 'plan_generated',
  plan: {
    steps: [
      { action: 'list_ec2', params: { region: 'us-east-1' } },
      { action: 'format_results', params: {} }
    ]
  }
}

{
  type: 'result',
  data: { instances: [...] },
  next_action: 'continue' // continue | confirm | stop
}
```

### Example Dialogue Flow

```
User: 查看AWS us-east-1的所有EC2实例

Intent Recognition:
- Resource type: EC2 instances
- Cloud: AWS
- Region: us-east-1
- Operation: query
- Credential inference: AWS credentials (by resource name)
- Risk level: low

Execution:
1. Load AWS credentials (temporary token)
2. Call EC2 SDK
3. Stream output results

User: 停止i-1234567890

Intent Recognition:
- Resource: i-1234567890
- Cloud: AWS
- Operation: stop instance
- Risk level: high

Execution (Ask mode):
1. Display operation confirmation
2. User confirms
3. Execute stop
4. Display result
```

---

## Credential Management (Agent Vault)

### Security Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend Layer                      │
├─────────────────────────────────────────────────────┤
│  Credential Management Page                        │
│  - Add/edit cloud platform credentials            │
│  - Assign to projects/users                       │
│  - View usage history                             │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              API Gateway (Auth verification)         │
├─────────────────────────────────────────────────────┤
│  - Verify user identity                            │
│  - Check credential access permissions             │
│  - Record audit logs                               │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              Vault Microservice                     │
├─────────────────────────────────────────────────────┤
│  Encrypted Storage:                                │
│  - AES-256-GCM encryption for secret values       │
│  - Stored in encrypted local files/database       │
│  - Encryption key derived from master key         │
│    (loaded at app startup)                         │
│                                                   │
│  Supported Credential Types:                       │
│  - AWS (Access Key + Secret Key)                  │
│  - Azure (Tenant + Client + Secret)               │
│  - GCP (Service Account JSON)                     │
│  - OCI (Config File + Profile)                    │
│  - Custom (arbitrary key-value pairs)             │
│                                                   │
│  Temporary Credential Generation:                  │
│  - Generate short-lived credentials for AI        │
│  - Credentials expire immediately after use       │
│  - Prevents credential caching or long-term use   │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              AI Service Credential Interface         │
├─────────────────────────────────────────────────────┤
│  Request Flow:                                     │
│  1. AI identifies cloud platform access needed     │
│  2. Requests temp credential (platform name only)  │
│  3. Returns encrypted session token (no secrets)   │
│  4. Uses token to execute operations               │
│  5. Session token auto-destroyed after use         │
│                                                   │
│  What AI sees (no secrets):                        │
│  - Session token: sess_xxxxxxxxxxxxxxx            │
│  - Cloud platform: AWS                            │
│  - Region: us-east-1                              │
│                                                   │
│  What AI cannot see:                               │
│  - Access Key ID                                  │
│  - Secret Access Key                              │
└─────────────────────────────────────────────────────┘
```

### Credential Lifecycle

```
Add Credential
   │
   ▼
Encrypted Storage (AES-256-GCM)
   │
   ├─► AI requests access → Generate temp credential → Use → Destroy
   │
   └─► Periodic rotation (optional)
```

### Audit Logging

Every credential access logs:
- Who accessed (user ID)
- When accessed (timestamp)
- Which cloud platform/credential
- Operation type (read/write)
- Operation result (success/failure)

---

## Cloud Resource Viewing & Topology

### Resource Discovery & Sync

```
┌─────────────────────────────────────────────────────┐
│              Resource Discovery Service              │
├─────────────────────────────────────────────────────┤
│  Periodic sync tasks (configurable interval):       │
│  - Sync resources every 15 minutes                 │
│  - Support manual trigger sync                     │
│  - Incremental sync to avoid duplicate scans       │
│                                                   │
│  Supported Resource Types:                         │
│  AWS:                                              │
│  - EC2 (instances, security groups, key pairs)    │
│  - VPC (VPC, subnets, route tables)               │
│  - RDS (database instances)                       │
│  - S3 (buckets)                                   │
│  - IAM (users, roles, policies)                   │
│                                                   │
│  Azure:                                            │
│  - Virtual Machines                               │
│  - Virtual Networks                               │
│  - SQL Databases                                  │
│  - Storage Accounts                               │
│                                                   │
│  GCP:                                              │
│  - Compute Engine                                 │
│  - VPC Networks                                   │
│  - Cloud SQL                                      │
│  - Cloud Storage                                  │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              Resource Storage Layer                  │
├─────────────────────────────────────────────────────┤
│  PostgreSQL                                         │
│  - Resource metadata (ID, name, type, status)     │
│  - Resource relationships (dependencies, links)   │
│  - Resource history (change records)              │
│  - Cloud platform info (account, region)          │
└─────────────────────────────────────────────────────┘
```

### Topology Generation

```
┌─────────────────────────────────────────────────────┐
│              Topology Engine                         │
├─────────────────────────────────────────────────────┤
│  Supported View Types:                              │
│  1. Global View - overview of all cloud resources  │
│  2. Regional View - detailed resources in region   │
│  3. Project View - resources grouped by project    │
│  4. Dependency View - resource relationship graph  │
│                                                   │
│  Visualization Libraries:                          │
│  - D3.js (custom topology)                        │
│  - vis-network (interactive network)              │
│  - React Flow (flowchart style)                   │
│                                                   │
│  Interaction Features:                             │
│  - Click node for details                         │
│  - Drag to adjust layout                          │
│  - Filter/search resources                        │
│  - Export as PNG/PDF                              │
│  - Zoom and scroll                                │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              Frontend Topology Component             │
├─────────────────────────────────────────────────────┤
│  - Resource node display (icon + status)           │
│  - Lines showing relationships (VPC→subnet→instance)│
│  - Colors indicating status (green=running, red=stopped)│
│  - Toolbar (filter, search, zoom, export)          │
│  - Sidebar (resource details, action buttons)      │
└─────────────────────────────────────────────────────┘
```

### Resource Detail View

```
Resource Type: EC2 Instance
──────────────────────
ID: i-1234567890
Name: web-server-1
Status: ● Running
Region: us-east-1
──────────────────────
Instance Type: t3.medium
Private IP: 10.0.1.100
Public IP: 54.123.45.67
──────────────────────
VPC: vpc-abc123
Subnet: subnet-def456
Security Group: sg-ghi789
──────────────────────
[Stop] [Restart] [Connect] [View Logs]
```

---

## Frontend Interface

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Multi-Cloud Manager                         [User] [Settings]│
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  Sidebar │              Main Content Area                   │
│          │  ┌──────────────────────────────────────────┐    │
│  ┌────┐  │  │                                          │    │
│  │Chat│  │  │         Web Terminal Interface            │    │
│  │    │  │  │    (xterm.js)                           │    │
│  ├────┤  │  │                                          │    │
│  │Res-│  │  │  user@cloud-manager:~$ 查看AWS EC2      │    │
│  │ourc│  │  │  Scanning region us-east-1...           │    │
│  │es  │  │  │  ✓ Found 5 instances                    │    │
│  ├────┤  │  │                                          │    │
│  │Top-│  │  │  NAME          STATUS    IP              │    │
│  │olo-│  │  │  web-server-1  running   10.0.1.100      │    │
││y│  │  │  │  api-server-1  running   10.0.1.101      │    │
│  ├────┤  │  │  db-server-1   stopped   10.0.1.102      │    │
│  │Cred│  │  │                                          │    │
│  │-ent-│  │  │  user@cloud-manager:~$ █                 │    │
│  │ial │  │  └──────────────────────────────────────────┘    │
│  ├────┤  │                                                  │
│  │MCP │  │  ┌──────────────────────────────────────────┐    │
│  │    │  │  │ Dialogue Control Bar                     │    │
│  └────┘  │  │ [Plan] [Ask] [Auto]  [Export] [Reset]   │    │
│          │  └──────────────────────────────────────────┘    │
│  Quick   │                                                  │
│  ┌────┐  │  ┌──────────────────────────────────────────┐    │
│  │Skill│  │  │ AI Suggestions                          │    │
│  │List│  │  │ 💡 Suggestion: db-server-1 stopped 2d   │    │
│  └────┘  │  │    View stop reason or restart?         │    │
│          │  └──────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────┤
│  Status Bar: Cloud connection status | Recent ops | Alerts   │
└──────────────────────────────────────────────────────────────┘
```

### Hybrid Mode Implementation

**Normal Dialogue**: Web chat style (bubble interface)

```
┌─────────────────────────────────────┐
│ 👤 查看所有AWS资源的概览           │
└─────────────────────────────────────┘
                                     ┌─────────────────────────────────────┐
                                     │ 🤖 Scanning AWS resources...       │
                                     │                                     │
                                     │ 📊 Resource Overview:              │
                                     │ - EC2 instances: 15                │
                                     │ - VPCs: 3                          │
                                     │ - RDS: 5                           │
                                     │ - S3: 12                           │
                                     │                                     │
                                     │ [View Details] [Generate Topology] │
                                     └─────────────────────────────────────┘
```

**Command Execution**: Auto-switch to terminal style

```
user@cloud-manager:~$ stop i-1234567890

⚠️  Confirm operation?
    Stop EC2 instance i-1234567890 (web-server-1)
    
    This will:
    - Stop instance execution
    - Release public IP (unless using Elastic IP)
    - May affect dependent services
    
    [Confirm] [Cancel]

> Stopping instance i-1234567890...
✓ Instance stopped
  New status: stopped
  Stop time: 2024-01-15 10:30:45

user@cloud-manager:~$ █
```

### Responsive Design

- **Desktop**: Full layout, sidebar + main content
- **Tablet**: Collapsible sidebar, expanded main content
- **Mobile**: Bottom tab navigation, fullscreen chat

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (React)
- **Terminal**: xterm.js + xterm-addon-fit
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Charts**: D3.js + vis-network
- **UI Components**: shadcn/ui

### Backend
- **Runtime**: Node.js 20
- **API Framework**: Fastify (better performance)
- **WebSocket**: Socket.io
- **Task Queue**: Bull (Redis-backed)
- **Logging**: Pino

### Data Storage
- **Primary Database**: PostgreSQL 15
- **Cache**: Redis 7
- **File Storage**: Local encrypted files

### Cloud SDKs
- **AWS**: @aws-sdk/client-* (v3)
- **Azure**: @azure/arm-*
- **GCP**: @google-cloud/*
- **OCI**: oci-sdk (Node.js)

### Security
- **Encryption**: AES-256-GCM
- **Authentication**: JWT + refresh tokens
- **Authorization**: RBAC (role-based access control)
- **Audit**: Structured logging + ELK

---

## Project Structure

```
cloud-manager/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── terminal/ # xterm.js integration
│   │   │   │   ├── topology/ # topology components
│   │   │   │   └── dashboard/# management UI
│   │   │   ├── pages/
│   │   │   └── stores/
│   │   └── package.json
│   │
│   ├── api/                  # Fastify API
│   │   ├── src/
│   │   │   ├── services/
│   │   │   │   ├── ai/       # AI dialogue service
│   │   │   │   ├── cloud/    # cloud management engine
│   │   │   │   ├── vault/    # credential management
│   │   │   │   └── topology/ # topology generation
│   │   │   ├── plugins/
│   │   │   └── routes/
│   │   └── package.json
│   │
│   └── worker/               # background tasks
│       ├── src/
│       │   ├── jobs/
│       │   │   ├── sync-cloud-resources/
│       │   │   └── rotate-credentials/
│       │   └── index.ts
│       └── package.json
│
├── packages/
│   ├── cloud-aws/            # AWS adapter
│   ├── cloud-azure/          # Azure adapter
│   ├── cloud-gcp/            # GCP adapter
│   ├── cloud-oci/            # OCI adapter
│   └── shared/               # shared types/utils
│
├── config/
│   ├── development/
│   ├── production/
│   └── docker/
│
└── docs/
    └── superpowers/
        └── specs/
```

---

## Deployment

### Development (Docker Compose)

```yaml
version: '3.8'

services:
  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8080
    depends_on:
      - api
  
  api:
    build: ./apps/api
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:secret@postgres:5432/cloud-manager
      - REDIS_URL=redis://redis:6379
      - VAULT_KEY=${VAULT_KEY}
    depends_on:
      - postgres
      - redis
  
  worker:
    build: ./apps/worker
    environment:
      - DATABASE_URL=postgresql://postgres:secret@postgres:5432/cloud-manager
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=cloud-manager
      - POSTGRES_PASSWORD=secret
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Production (Kubernetes)

```
Namespace: cloud-manager

Deployments:
- web (2 replicas) - Next.js frontend
- api (3 replicas) - Fastify API
- worker (2 replicas) - background tasks

StatefulSets:
- postgres (1 replica) - persistent storage
- redis (1 replica) - cache

Services:
- web-svc (ClusterIP)
- api-svc (ClusterIP)
- postgres-svc (ClusterIP)
- redis-svc (ClusterIP)

Ingress:
- TLS termination
- Path-based routing (/ → web, /api → api)
```

### Scalability Design

**Horizontal Scaling**:
- API service: Stateless, scale independently (3+ replicas)
- Worker service: Scale based on job queue depth
- Frontend: Static, serve via CDN

**Performance Optimization**:
- Redis caching for hot resources (TTL: 15 min)
- WebSocket connection pooling
- Database indexing optimization
- Static resource CDN

**Monitoring & Alerting**:
- Prometheus metrics collection
- Grafana visualization dashboards
- Alert rules: API latency > 500ms, error rate > 1%, disk > 80%

### Security Best Practices

1. **Network Isolation**:
   - Frontend → API Gateway only
   - API → Database/Redis only
   - Worker → Database only

2. **Secret Management**:
   - Environment variable injection, not committed to Git
   - Use Docker Secrets or Kubernetes Secrets
   - Regular password rotation

3. **Access Control**:
   - JWT token authentication
   - RBAC role permissions
   - API rate limiting

4. **Data Encryption**:
   - Transmission: TLS 1.3
   - Storage: AES-256
   - Backups: Encrypted storage

---

## Implementation Phases

### Phase 1: Foundation (3-4 weeks)
- Set up project structure and dev environment
- Implement credential management (Agent Vault)
- Basic AI dialogue service with single cloud support
- Simple resource listing

### Phase 2: Multi-Cloud Integration (2-3 weeks)
- AWS, Azure, GCP SDK adapters
- Resource discovery and sync service
- Advanced resource filtering and search

### Phase 3: Advanced Features (2-3 weeks)
- Topology generation engine
- Advanced dialogue features (skill/MCP support)
- Hybrid interface implementation

### Phase 4: Polish & Testing (1-2 weeks)
- Performance optimization
- Security hardening
- Comprehensive testing
- Documentation

**Total Estimated Effort**: 8-12 weeks (1 developer) or 4-6 weeks (2 developers)

---

## Success Criteria

1. ✅ AI can query resources from multiple cloud platforms
2. ✅ Credentials are never exposed to AI (verified via audit logs)
3. ✅ Hybrid interface works seamlessly (chat ↔ terminal)
4. ✅ Topology visualization renders correctly for complex architectures
5. ✅ System handles 100+ concurrent users
6. ✅ All operations are audited and traceable

---

## Open Questions

None - all requirements clarified and design approved.

---

## Appendix: Research Sources

Based on analysis of high-star GitHub projects:

1. **KubeSphere** (⭐17k) - Multi-cloud Kubernetes management
2. **OpenCode** (⭐12.8k) - Terminal AI coding agent
3. **Superset** (⭐11.5k) - AI agent code editor
4. **Claude Squad** (⭐7.7k) - Multi-agent terminal manager
5. **External Secrets** (⭐2.5k) - Secrets management integration

Design combines proven patterns from these successful projects.

---

**Document Version**: 1.0
**Last Updated**: 2026-06-05
**Next Review**: After Phase 1 completion
