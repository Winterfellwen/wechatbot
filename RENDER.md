# Render Deployment Guide

## Overview

This guide explains how to deploy the Multi-Cloud Manager to Render using free tier resources.

## Prerequisites

- Render account (free tier)
- GitHub repository connected to Render
- PostgreSQL database on Render
- Redis on Render (optional - app works without it)

## Deployment Steps

### 1. Connect Repository

1. Go to Render Dashboard
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will detect `render.yaml` automatically

### 2. Configure Environment Variables

In Render Dashboard, go to each service and set environment variables:

#### For `multicloud-api` service:
```
DATABASE_URL=postgresql://user:password@host:port/dbname
REDIS_URL=redis://user:password@host:port (optional)
JWT_SECRET=your-secure-jwt-secret
VAULT_KEY=your-encryption-key
CORS_ORIGIN=https://multicloud-web.onrender.com
```

#### For `multicloud-web` service:
```
NEXT_PUBLIC_API_URL=https://multicloud-api.onrender.com
```

### 3. Deploy

Render will automatically deploy when you push to the `multicloud-render` branch.

**Note**: The deployment uses Docker containers with all necessary build tools (python3, make, g++) to compile native modules like `better-sqlite3`.

### 4. Access Your Application

- **Web UI**: https://multicloud-web.onrender.com
- **API**: https://multicloud-api.onrender.com
- **Health Check**: https://multicloud-api.onrender.com/health

## Free Tier Limitations

- **Web Services**: 750 hours/month per service
- **PostgreSQL**: 512MB storage, expires after 90 days
- **Redis**: Not available on free tier (app works without it)

## Architecture on Render (Free Tier)

```
┌─────────────────────────────────────┐
│     multicloud-app (Free)           │
│     Next.js + Fastify Combined      │
│     Port 3000 (Web)                 │
│     Port 8765 (API)                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     PostgreSQL Database (Free)      │
└─────────────────────────────────────┘
```

**Note**: For free tier, we combine web and API into a single service to save hours (750 hours/month limit).

## Troubleshooting

### Issue: API cannot connect to database

**Solution**: Ensure `DATABASE_URL` is correctly set in the API service environment variables.

### Issue: Frontend cannot reach API

**Solution**: Ensure `NEXT_PUBLIC_API_URL` is set to the correct API URL.

### Issue: Worker fails to start

**Solution**: Worker will run in standalone mode if `REDIS_URL` is not set. This is normal for free tier.

## Monitoring

- Check service logs in Render Dashboard
- Monitor resource usage in the "Metrics" tab
- Set up health check notifications

## Cost Optimization

- Use free tier for all services
- Monitor PostgreSQL usage (90-day expiry)
- Consider upgrading if you need persistent Redis
- Use Render's auto-suspend feature to save hours

## Next Steps

- Set up custom domain
- Configure SSL certificates
- Set up automated backups
- Monitor performance metrics
