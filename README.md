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
