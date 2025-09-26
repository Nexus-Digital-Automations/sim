# Multi-Agent Orchestration System - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying and configuring the Multi-Agent Orchestration System within the Sim ecosystem. The system is fully integrated and ready for production deployment.

## Prerequisites

### System Requirements

- **Node.js**: Version 18.17+ or 20.5+
- **PostgreSQL**: Version 14+
- **Redis**: Version 6+ (for real-time features)
- **Docker**: Version 20+ (for containerized deployment)
- **Memory**: Minimum 4GB RAM
- **Storage**: Minimum 20GB available space

### Dependencies

- Next.js 15.4.1+
- TypeScript 5.3+
- Drizzle ORM 0.44.5+
- Socket.io 4.8.1+
- Better Auth (integrated with Sim)

## Deployment Steps

### 1. Environment Configuration

#### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/simstudio

# Authentication
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=https://your-domain.com

# Orchestration Service Configuration
ORCHESTRATION_ENABLED=true
ORCHESTRATION_MAX_CONCURRENT_PROCESSES=50
ORCHESTRATION_PROCESS_TIMEOUT=3600000  # 1 hour
ORCHESTRATION_HANDOFF_TIMEOUT=30000    # 30 seconds

# Real-time Communication
REDIS_URL=redis://localhost:6379
SOCKETIO_CORS_ORIGIN=https://your-frontend-domain.com

# Monitoring and Logging
LOG_LEVEL=info
MONITORING_ENABLED=true
METRICS_ENDPOINT=/api/orchestration/metrics
```

#### Optional Environment Variables

```bash
# Performance Tuning
ORCHESTRATION_WORKER_THREADS=4
ORCHESTRATION_MAX_MEMORY_MB=2048
ORCHESTRATION_CLEANUP_INTERVAL=300000  # 5 minutes

# Feature Flags
ORCHESTRATION_HUMAN_INTERVENTION_ENABLED=true
ORCHESTRATION_REAL_TIME_COLLABORATION=true
ORCHESTRATION_PROCESS_MONITORING=true

# Development/Testing
NODE_ENV=production
DEBUG=orchestration:*
```

### 2. Database Setup

#### Database Migrations

The orchestration system requires several database tables. If using Drizzle ORM (recommended):

```bash
# Run migrations
npm run db:migrate

# Verify tables created
npm run db:studio
```

#### Manual Database Setup

If setting up manually, ensure these core tables exist:

```sql
-- Agent teams table
CREATE TABLE agent_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orchestration processes table
CREATE TABLE orchestration_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  team_id UUID NOT NULL REFERENCES agent_teams(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  steps JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_agent_teams_workspace ON agent_teams(workspace_id);
CREATE INDEX idx_orchestration_processes_workspace ON orchestration_processes(workspace_id);
CREATE INDEX idx_orchestration_processes_status ON orchestration_processes(status);
CREATE INDEX idx_orchestration_processes_team ON orchestration_processes(team_id);
```

### 3. Service Configuration

#### Orchestration Services Initialization

The orchestration services are automatically initialized through the Parlant index. Ensure these services are properly configured:

```typescript
// In your application startup (e.g., app.ts)
import {
  multiAgentOrchestrationService,
  orchestrationCollaborationHub,
  orchestrationAPIService
} from '@/services/parlant'

// Services are automatically initialized
// No manual initialization required
```

#### Service Health Checks

Add health check endpoints to monitor service status:

```typescript
// Add to your health check route
import { checkParlantHealth } from '@/services/parlant'

export async function GET() {
  const parlantHealth = await checkParlantHealth()

  return Response.json({
    status: 'healthy',
    services: {
      parlant: parlantHealth,
      orchestration: {
        healthy: true,
        services: ['orchestration', 'collaboration', 'api']
      }
    }
  })
}
```

### 4. API Routes Deployment

#### Verify API Routes

Ensure all orchestration API routes are properly deployed:

```bash
# Check API route structure
ls -la apps/sim/app/api/orchestration/
```

Expected structure:
```
api/orchestration/
├── teams/
│   ├── route.ts
│   └── [teamId]/
│       └── route.ts
├── processes/
│   ├── route.ts
│   └── [processId]/
│       ├── route.ts
│       ├── interventions/
│       │   └── route.ts
│       └── metrics/
│           └── route.ts
├── interventions/
│   └── [interventionId]/
│       └── route.ts
└── collaboration/
    └── rooms/
        └── route.ts
```

#### API Route Testing

```bash
# Test team creation endpoint
curl -X POST http://localhost:3000/api/orchestration/teams \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: workspace-123" \
  -H "x-user-id: user-456" \
  -d '{
    "name": "Test Team",
    "description": "Testing deployment",
    "agents": [{
      "agentId": "agent-1",
      "role": "leader",
      "specialization": "General"
    }]
  }'

# Test process creation endpoint
curl -X POST http://localhost:3000/api/orchestration/processes \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: workspace-123" \
  -H "x-user-id: user-456" \
  -d '{
    "name": "Test Process",
    "description": "Testing deployment",
    "teamId": "team-id-from-previous-step",
    "steps": [{
      "name": "Test Step",
      "description": "Testing step",
      "assignedAgentId": "agent-1"
    }]
  }'
```

### 5. Real-time Communication Setup

#### Socket.io Configuration

Ensure Socket.io is configured for real-time collaboration:

```typescript
// In your Socket.io server setup
import { orchestrationCollaborationHub } from '@/services/parlant'

io.on('connection', (socket) => {
  // Handle orchestration events
  socket.on('join-collaboration-room', async (roomId) => {
    socket.join(`orchestration:${roomId}`)
  })

  socket.on('leave-collaboration-room', async (roomId) => {
    socket.leave(`orchestration:${roomId}`)
  })
})

// Listen to orchestration events
orchestrationCollaborationHub.on('process.updated', (process) => {
  io.to(`orchestration:process:${process.id}`).emit('process-update', process)
})

orchestrationCollaborationHub.on('handoff.initiated', (handoff) => {
  io.to(`orchestration:process:${handoff.processId}`).emit('handoff-initiated', handoff)
})

orchestrationCollaborationHub.on('human.intervention.requested', (intervention) => {
  io.to(`orchestration:process:${intervention.processId}`).emit('intervention-requested', intervention)
})
```

### 6. Docker Deployment

#### Dockerfile Configuration

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose Configuration

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=${BETTER_AUTH_URL}
      - ORCHESTRATION_ENABLED=true
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    networks:
      - sim-network

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=simstudio
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - sim-network

  redis:
    image: redis:6-alpine
    networks:
      - sim-network

volumes:
  postgres_data:

networks:
  sim-network:
    driver: bridge
```

### 7. Kubernetes Deployment

#### Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sim-orchestration
  labels:
    app: sim-orchestration
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sim-orchestration
  template:
    metadata:
      labels:
        app: sim-orchestration
    spec:
      containers:
      - name: sim-orchestration
        image: your-registry/sim-orchestration:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: database-url
        - name: ORCHESTRATION_ENABLED
          value: "true"
        - name: ORCHESTRATION_MAX_CONCURRENT_PROCESSES
          value: "50"
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: sim-orchestration-service
spec:
  selector:
    app: sim-orchestration
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

### 8. Monitoring and Logging

#### Application Monitoring

```typescript
// Add monitoring middleware
import { createLogger } from '@/lib/logs/console/logger'

const orchestrationLogger = createLogger('Orchestration')

// Log orchestration events
multiAgentOrchestrationService.on('process.started', (process) => {
  orchestrationLogger.info('Process started', {
    processId: process.id,
    teamId: process.teamId,
    stepCount: process.totalSteps
  })
})

multiAgentOrchestrationService.on('process.completed', (process) => {
  orchestrationLogger.info('Process completed', {
    processId: process.id,
    duration: process.metrics.duration,
    successRate: process.metrics.successRate
  })
})
```

#### Metrics Collection

```typescript
// Add metrics endpoint
export async function GET() {
  const metrics = {
    activeProcesses: await getActiveProcessCount(),
    completedProcesses: await getCompletedProcessCount(),
    averageProcessDuration: await getAverageProcessDuration(),
    handoffCount: await getTotalHandoffCount(),
    interventionCount: await getTotalInterventionCount()
  }

  return Response.json(metrics)
}
```

### 9. Security Configuration

#### CORS Configuration

```typescript
// Configure CORS for orchestration APIs
const corsOptions = {
  origin: [
    'https://your-frontend-domain.com',
    'https://your-admin-domain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-workspace-id',
    'x-user-id'
  ]
}
```

#### Rate Limiting

```typescript
// Add rate limiting for orchestration endpoints
const rateLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many orchestration requests, please try again later'
}
```

### 10. Production Checklist

#### Pre-deployment Verification

- [ ] Database migrations completed successfully
- [ ] Environment variables configured correctly
- [ ] API endpoints responding correctly
- [ ] Real-time communication working
- [ ] Health checks passing
- [ ] Logging configured and working
- [ ] Monitoring setup complete
- [ ] Security measures in place
- [ ] Load balancer configured (if applicable)
- [ ] SSL certificates installed and valid

#### Post-deployment Verification

- [ ] All orchestration services running
- [ ] Team creation working
- [ ] Process orchestration functional
- [ ] Agent handoffs working
- [ ] Human interventions functional
- [ ] Real-time collaboration active
- [ ] Performance monitoring active
- [ ] Error alerting configured
- [ ] Backup procedures tested
- [ ] Documentation updated

### 11. Troubleshooting

#### Common Issues

**Issue**: API endpoints returning 404
```bash
# Solution: Verify API routes are properly built
npm run build
# Check if routes exist in .next/server/app/api/orchestration/
```

**Issue**: Database connection errors
```bash
# Solution: Verify database configuration
psql $DATABASE_URL -c "SELECT version();"
# Run database migrations if needed
npm run db:migrate
```

**Issue**: Real-time features not working
```bash
# Solution: Check Redis connection
redis-cli ping
# Verify Socket.io configuration in server setup
```

**Issue**: Process execution failures
```bash
# Solution: Check orchestration service logs
docker logs <container-id> | grep -i orchestration
# Verify agent service integration
curl http://localhost:3000/api/agents
```

#### Debug Mode

Enable debug mode for detailed logging:

```bash
export DEBUG=orchestration:*
export LOG_LEVEL=debug
npm start
```

### 12. Performance Optimization

#### Production Optimization

1. **Connection Pooling**
   ```typescript
   // Database connection pooling
   const dbConfig = {
     max: 20,
     min: 5,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000
   }
   ```

2. **Caching Strategy**
   ```typescript
   // Redis caching for frequently accessed data
   const cacheConfig = {
     ttl: 300, // 5 minutes
     checkPeriod: 120 // Check for expired keys every 2 minutes
   }
   ```

3. **Load Balancing**
   ```yaml
   # Nginx load balancer configuration
   upstream sim_orchestration {
     server app1:3000;
     server app2:3000;
     server app3:3000;
   }
   ```

## Conclusion

The Multi-Agent Orchestration System is now ready for production deployment. Follow this guide systematically to ensure a successful deployment with all features fully functional and properly monitored.

For additional support or questions, refer to the architecture documentation or contact the development team.