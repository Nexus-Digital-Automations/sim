# Deployment Guide - Workflow to Journey Mapping System

## Overview

This guide provides comprehensive instructions for deploying the Workflow to Journey Mapping System to production environments. The system is designed for high availability, scalability, and security in enterprise environments.

## Architecture Overview

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[NGINX/HAProxy]
    end

    subgraph "Application Tier"
        APP1[Sim Server 1]
        APP2[Sim Server 2]
        APP3[Sim Server 3]
    end

    subgraph "Microservices"
        PS[Parlant Server]
        CWS[Conversational Workflow Service]
        NLP[NLP Processing Service]
    end

    subgraph "Data Tier"
        PG[(PostgreSQL Cluster)]
        REDIS[(Redis Cluster)]
    end

    subgraph "External Services"
        PARLANT[Parlant API]
        MONITORING[Monitoring Stack]
    end

    LB --> APP1
    LB --> APP2
    LB --> APP3

    APP1 --> CWS
    APP2 --> CWS
    APP3 --> CWS

    CWS --> PS
    CWS --> NLP
    CWS --> PG
    CWS --> REDIS

    PS --> PARLANT
    CWS --> MONITORING
```

## Prerequisites

### Infrastructure Requirements

#### Minimum System Resources
- **CPU**: 4 cores per application server
- **RAM**: 8GB per application server
- **Storage**: 100GB SSD per server
- **Network**: 1Gbps network connectivity

#### Recommended Production Resources
- **CPU**: 8 cores per application server
- **RAM**: 16GB per application server
- **Storage**: 500GB NVMe SSD per server
- **Network**: 10Gbps network connectivity

#### Database Requirements
- **PostgreSQL**: Version 14+ with streaming replication
- **Redis**: Version 6+ with clustering support
- **Minimum DB Resources**: 4 CPU cores, 16GB RAM, 1TB SSD
- **Recommended DB Resources**: 8 CPU cores, 32GB RAM, 2TB NVMe SSD

### External Dependencies

- **Parlant Server**: Deployed and accessible
- **Container Registry**: Docker registry for images
- **DNS**: Domain names configured
- **SSL Certificates**: Valid TLS certificates
- **Monitoring**: Prometheus/Grafana stack

## Pre-Deployment Checklist

### Environment Preparation

- [ ] **Infrastructure provisioned** (servers, databases, load balancers)
- [ ] **Network configuration** complete (firewalls, security groups)
- [ ] **DNS records** configured
- [ ] **SSL certificates** installed
- [ ] **Database instances** running and configured
- [ ] **Redis cluster** operational
- [ ] **Monitoring stack** deployed
- [ ] **Backup systems** configured

### Security Configuration

- [ ] **Firewall rules** implemented
- [ ] **Network segmentation** configured
- [ ] **Database access** restricted
- [ ] **API rate limiting** enabled
- [ ] **HTTPS enforcement** active
- [ ] **Secrets management** configured
- [ ] **Audit logging** enabled

### Application Prerequisites

- [ ] **Source code** tagged for release
- [ ] **Docker images** built and pushed
- [ ] **Database migrations** tested
- [ ] **Environment variables** configured
- [ ] **Feature flags** set appropriately

## Deployment Methods

### Method 1: Docker Compose (Development/Small Production)

#### 1.1 Docker Compose Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # Main Sim Application
  sim-app:
    image: sim/app:${SIM_VERSION}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - PARLANT_SERVER_URL=${PARLANT_SERVER_URL}
      - PARLANT_API_KEY=${PARLANT_API_KEY}
      - CONVERSATIONAL_WORKFLOWS_ENABLED=true
    volumes:
      - app-logs:/app/logs
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    networks:
      - app-network

  # Conversational Workflow Service
  conversation-service:
    image: sim/conversation-service:${CONVERSATION_SERVICE_VERSION}
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - PARLANT_SERVER_URL=${PARLANT_SERVER_URL}
      - PARLANT_API_KEY=${PARLANT_API_KEY}
      - NLP_MODEL_PATH=/models
    volumes:
      - nlp-models:/models
      - service-logs:/app/logs
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    networks:
      - app-network

  # PostgreSQL
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - app-network

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - app-network

  # NGINX Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    restart: unless-stopped
    depends_on:
      - sim-app
    networks:
      - app-network

volumes:
  postgres-data:
  redis-data:
  app-logs:
  service-logs:
  nlp-models:

networks:
  app-network:
    driver: bridge
```

#### 1.2 Environment Configuration

Create `.env.prod`:

```bash
# Version tags
SIM_VERSION=v2.1.0
CONVERSATION_SERVICE_VERSION=v1.0.0

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/sim_production
POSTGRES_DB=sim_production
POSTGRES_USER=sim_user
POSTGRES_PASSWORD=secure_password_here

# Redis
REDIS_URL=redis://:redis_password@redis:6379
REDIS_PASSWORD=secure_redis_password

# Parlant Integration
PARLANT_SERVER_URL=https://parlant.yourdomain.com
PARLANT_API_KEY=prod_parlant_api_key_here

# Security
JWT_SECRET=secure_jwt_secret_here
ENCRYPTION_KEY=32_character_encryption_key_here

# Application
NODE_ENV=production
LOG_LEVEL=info
METRICS_ENABLED=true
```

#### 1.3 NGINX Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream sim-app {
        server sim-app:3000;
    }

    upstream conversation-service {
        server conversation-service:3001;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # Main application
    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;

        # Main app
        location / {
            proxy_pass http://sim-app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Conversational API
        location /api/v1/conversational-workflows {
            proxy_pass http://conversation-service;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket support
        location /socket.io/ {
            proxy_pass http://sim-app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### 1.4 Deployment Commands

```bash
# Deploy to production
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec sim-app npm run db:migrate

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

### Method 2: Kubernetes (Large Scale Production)

#### 2.1 Namespace Configuration

Create `namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sim-production
  labels:
    name: sim-production
    environment: production
```

#### 2.2 ConfigMap for Environment Variables

Create `configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sim-config
  namespace: sim-production
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PARLANT_SERVER_URL: "https://parlant.yourdomain.com"
  CONVERSATIONAL_WORKFLOWS_ENABLED: "true"
  METRICS_ENABLED: "true"
  REDIS_URL: "redis://redis-service:6379"
  DATABASE_URL: "postgresql://sim_user@postgres-service:5432/sim_production"
```

#### 2.3 Secrets Configuration

Create `secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: sim-secrets
  namespace: sim-production
type: Opaque
data:
  PARLANT_API_KEY: <base64-encoded-api-key>
  JWT_SECRET: <base64-encoded-jwt-secret>
  ENCRYPTION_KEY: <base64-encoded-encryption-key>
  POSTGRES_PASSWORD: <base64-encoded-db-password>
  REDIS_PASSWORD: <base64-encoded-redis-password>
```

#### 2.4 Application Deployment

Create `app-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sim-app
  namespace: sim-production
  labels:
    app: sim-app
    version: v2.1.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sim-app
  template:
    metadata:
      labels:
        app: sim-app
    spec:
      containers:
      - name: sim-app
        image: sim/app:v2.1.0
        ports:
        - containerPort: 3000
          name: http
        envFrom:
        - configMapRef:
            name: sim-config
        - secretRef:
            name: sim-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"

---
apiVersion: v1
kind: Service
metadata:
  name: sim-app-service
  namespace: sim-production
spec:
  selector:
    app: sim-app
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
    name: http
  type: ClusterIP
```

#### 2.5 Conversational Workflow Service Deployment

Create `conversation-service-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: conversation-service
  namespace: sim-production
  labels:
    app: conversation-service
    version: v1.0.0
spec:
  replicas: 2
  selector:
    matchLabels:
      app: conversation-service
  template:
    metadata:
      labels:
        app: conversation-service
    spec:
      containers:
      - name: conversation-service
        image: sim/conversation-service:v1.0.0
        ports:
        - containerPort: 3001
          name: http
        envFrom:
        - configMapRef:
            name: sim-config
        - secretRef:
            name: sim-secrets
        volumeMounts:
        - name: nlp-models
          mountPath: /models
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 30
          periodSeconds: 5
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
      volumes:
      - name: nlp-models
        persistentVolumeClaim:
          claimName: nlp-models-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: conversation-service
  namespace: sim-production
spec:
  selector:
    app: conversation-service
  ports:
  - port: 3001
    targetPort: 3001
    protocol: TCP
    name: http
  type: ClusterIP
```

#### 2.6 Ingress Configuration

Create `ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sim-ingress
  namespace: sim-production
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/websocket-services: "sim-app-service"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - yourdomain.com
    secretName: sim-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /api/v1/conversational-workflows
        pathType: Prefix
        backend:
          service:
            name: conversation-service
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sim-app-service
            port:
              number: 3000
```

#### 2.7 Database and Redis (External Services)

For production, use managed database services:

```yaml
# External service references
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: sim-production
spec:
  type: ExternalName
  externalName: prod-postgres.c123456789.us-west-2.rds.amazonaws.com

---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: sim-production
spec:
  type: ExternalName
  externalName: prod-redis.abc123.cache.amazonaws.com
```

#### 2.8 Kubernetes Deployment Commands

```bash
# Apply all configurations
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f app-deployment.yaml
kubectl apply -f conversation-service-deployment.yaml
kubectl apply -f ingress.yaml

# Run database migrations
kubectl exec -n sim-production deployment/sim-app -- npm run db:migrate

# Monitor deployment
kubectl get pods -n sim-production -w
kubectl logs -n sim-production -l app=sim-app
```

## Database Migration

### Production Migration Strategy

#### 1. Pre-migration Backup

```bash
# Create backup
pg_dump -h production-db-host -U sim_user -d sim_production \
  --no-owner --no-privileges --clean > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
pg_restore --list backup_*.sql
```

#### 2. Migration Execution

```bash
# Run migrations in transaction
npm run db:migrate:production

# Verify migration status
npm run db:migrate:status

# Rollback if needed (prepare rollback scripts beforehand)
npm run db:rollback:production
```

#### 3. Data Validation

```sql
-- Validate new tables exist
SELECT schemaname, tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'conversational_%';

-- Check indexes
SELECT indexname, tablename FROM pg_indexes
WHERE tablename LIKE 'conversational_%';

-- Verify constraints
SELECT conname, contype, conkey FROM pg_constraint
WHERE conrelid IN (
  SELECT oid FROM pg_class
  WHERE relname LIKE 'conversational_%'
);
```

## Configuration Management

### Environment Variables

#### Production Environment Configuration

```bash
# Application Settings
NODE_ENV=production
LOG_LEVEL=info
DEBUG=false
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://user:password@prod-db:5432/sim_production
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_IDLE_TIMEOUT=30000

# Redis Configuration
REDIS_URL=redis://prod-redis:6379
REDIS_PASSWORD=secure_redis_password
REDIS_CLUSTER_MODE=true
REDIS_KEY_PREFIX=sim_prod:

# Parlant Integration
PARLANT_SERVER_URL=https://parlant-api.yourdomain.com
PARLANT_API_KEY=prod_parlant_key_here
PARLANT_TIMEOUT=30000
PARLANT_RETRY_ATTEMPTS=3

# Conversational Workflows
CONVERSATIONAL_WORKFLOWS_ENABLED=true
CONVERSATIONAL_WORKFLOWS_DEBUG=false
SESSION_TIMEOUT_MS=1800000
SESSION_CLEANUP_INTERVAL_MS=300000
MAX_CONCURRENT_SESSIONS=1000

# NLP Configuration
NLP_PROVIDER=openai
NLP_MODEL=gpt-3.5-turbo
NLP_CONFIDENCE_THRESHOLD=0.8
NLP_CACHE_TTL=3600

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000
WS_CONNECTION_TIMEOUT=60000
WS_MAX_CONNECTIONS=5000

# Security
JWT_SECRET=your_secure_jwt_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key
API_RATE_LIMIT_WINDOW=900000
API_RATE_LIMIT_MAX=1000

# Monitoring and Logging
METRICS_ENABLED=true
METRICS_PORT=9090
LOG_FORMAT=json
AUDIT_LOG_ENABLED=true
```

### Feature Flags

```json
{
  "conversationalWorkflows": {
    "enabled": true,
    "percentage": 100,
    "rules": {
      "workspaceWhitelist": ["enterprise_customers"],
      "userRoles": ["admin", "user"]
    }
  },
  "nlpProviders": {
    "openai": {
      "enabled": true,
      "percentage": 80
    },
    "internal": {
      "enabled": true,
      "percentage": 20
    }
  },
  "realTimeUpdates": {
    "enabled": true,
    "maxConnections": 5000
  }
}
```

## Monitoring and Health Checks

### Health Check Endpoints

#### Application Health

```typescript
// /health endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    services: {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      parlant: await checkParlantHealth(),
      conversationalWorkflows: await checkConversationalWorkflowsHealth()
    }
  }

  const isHealthy = Object.values(health.services).every(service => service.status === 'healthy')

  res.status(isHealthy ? 200 : 503).json(health)
})
```

#### Readiness Check

```typescript
// /ready endpoint
app.get('/ready', async (req, res) => {
  const readiness = {
    ready: true,
    checks: {
      databaseMigrations: await checkMigrationsComplete(),
      serviceConnections: await checkServiceConnections(),
      cacheWarming: await checkCacheStatus()
    }
  }

  const isReady = Object.values(readiness.checks).every(check => check === true)

  res.status(isReady ? 200 : 503).json(readiness)
})
```

### Monitoring Configuration

#### Prometheus Metrics

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'sim-app'
    static_configs:
      - targets: ['sim-app:9090']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'conversation-service'
    static_configs:
      - targets: ['conversation-service:9090']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

#### Grafana Dashboard

Key metrics to monitor:

- **Request Rate**: HTTP requests per second
- **Response Time**: 95th percentile response times
- **Error Rate**: 4xx and 5xx error percentage
- **Database Performance**: Connection pool usage, query time
- **Redis Performance**: Hit rate, memory usage
- **Conversational Metrics**: Active sessions, command success rate
- **WebSocket Connections**: Active connections, message throughput

### Alerting Rules

```yaml
# alerts.yml
groups:
  - name: sim-app-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: ConversationalWorkflowsDown
        expr: up{job="conversation-service"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Conversational workflows service is down"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Database connection usage is high"
```

## Security Configuration

### SSL/TLS Configuration

```nginx
# SSL configuration for NGINX
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;

ssl_stapling on;
ssl_stapling_verify on;

add_header Strict-Transport-Security "max-age=63072000" always;
```

### Network Security

#### Firewall Rules

```bash
# Application servers (port 3000, 3001)
ufw allow from 10.0.1.0/24 to any port 3000
ufw allow from 10.0.1.0/24 to any port 3001

# Database (port 5432) - restrict to app servers only
ufw allow from 10.0.2.0/24 to any port 5432

# Redis (port 6379) - restrict to app servers only
ufw allow from 10.0.2.0/24 to any port 6379

# HTTPS (port 443) - public access
ufw allow 443

# SSH (port 22) - restrict to management network
ufw allow from 10.0.0.0/24 to any port 22
```

### Application Security

#### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
})

// Conversational API specific limiting
const conversationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 conversational commands per minute
  message: 'Too many conversational commands',
  keyGenerator: (req) => req.user?.id || req.ip
})

app.use('/api/', generalLimiter)
app.use('/api/v1/conversational-workflows/', conversationLimiter)
```

## Backup and Recovery

### Database Backup Strategy

#### Automated Backups

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_HOST="prod-postgres.yourdomain.com"
DB_NAME="sim_production"
DB_USER="backup_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Full backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --no-owner --no-privileges --clean \
  --file="$BACKUP_DIR/sim_production_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/sim_production_$DATE.sql"

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/sim_production_$DATE.sql.gz" \
  s3://your-backup-bucket/postgresql/
```

#### Backup Cron Configuration

```bash
# Add to crontab
0 2 * * * /scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

### Disaster Recovery

#### Recovery Procedures

```bash
# 1. Restore database from backup
gunzip sim_production_20240101_020000.sql.gz
psql -h new-db-host -U postgres -d sim_production_new < sim_production_20240101_020000.sql

# 2. Update application configuration
export DATABASE_URL="postgresql://user:password@new-db-host:5432/sim_production_new"

# 3. Run health checks
curl -f http://localhost:3000/health || exit 1

# 4. Verify conversational workflows
curl -f http://localhost:3000/api/v1/conversational-workflows/health || exit 1
```

## Performance Optimization

### Application Performance

#### Connection Pooling

```typescript
// Database connection pool configuration
const dbConfig = {
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || '5432'),

  // Connection pool settings
  min: 5,
  max: 20,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100
}
```

#### Caching Strategy

```typescript
// Redis caching for conversational workflows
const cacheConfig = {
  // Session state cache
  sessionCache: {
    keyPrefix: 'session:',
    ttl: 30 * 60, // 30 minutes
    maxMemory: '1gb'
  },

  // NLP results cache
  nlpCache: {
    keyPrefix: 'nlp:',
    ttl: 60 * 60, // 1 hour
    maxMemory: '512mb'
  },

  // Journey mapping cache
  journeyCache: {
    keyPrefix: 'journey:',
    ttl: 4 * 60 * 60, // 4 hours
    maxMemory: '256mb'
  }
}
```

### Database Performance

#### Index Optimization

```sql
-- Performance indexes for conversational workflows
CREATE INDEX CONCURRENTLY idx_cws_active_sessions
ON conversational_workflow_sessions(user_id, execution_status)
WHERE execution_status IN ('running', 'paused', 'waiting-for-input');

CREATE INDEX CONCURRENTLY idx_ct_recent_conversations
ON conversation_turns(session_id, created_at DESC)
WHERE created_at >= NOW() - INTERVAL '7 days';

CREATE INDEX CONCURRENTLY idx_wee_performance_monitoring
ON workflow_execution_events(created_at DESC, event_type, duration_ms)
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

#### Query Optimization

```sql
-- Optimize session lookup queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT cws.*, ct.content
FROM conversational_workflow_sessions cws
LEFT JOIN LATERAL (
  SELECT content
  FROM conversation_turns ct
  WHERE ct.session_id = cws.session_id
  ORDER BY created_at DESC
  LIMIT 5
) ct ON true
WHERE cws.user_id = $1 AND cws.execution_status = 'running';
```

## Troubleshooting

### Common Deployment Issues

#### Issue: Service Won't Start

**Symptoms:**
- Containers exit immediately
- Health checks fail
- Connection refused errors

**Diagnosis:**
```bash
# Check container logs
docker logs container-name

# Verify environment variables
docker exec container-name env | grep -E "(DATABASE|REDIS|PARLANT)"

# Test connectivity
docker exec container-name nc -zv postgres-host 5432
```

**Solutions:**
- Verify environment variable configuration
- Check database connectivity and credentials
- Ensure all required services are running
- Validate SSL certificates and network access

#### Issue: High Memory Usage

**Symptoms:**
- Out of memory errors
- Container restarts
- Performance degradation

**Diagnosis:**
```bash
# Monitor memory usage
docker stats

# Check application metrics
curl http://localhost:9090/metrics | grep memory

# Analyze heap dumps (Node.js)
node --inspect app.js
```

**Solutions:**
- Increase memory limits
- Optimize session cleanup intervals
- Review caching strategies
- Implement memory leak detection

#### Issue: Database Connection Pool Exhaustion

**Symptoms:**
- "Connection pool exhausted" errors
- Slow query performance
- Timeout errors

**Diagnosis:**
```sql
-- Check active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Monitor connection pool
SELECT * FROM pg_stat_database
WHERE datname = 'sim_production';
```

**Solutions:**
- Increase connection pool size
- Optimize query performance
- Implement connection timeouts
- Review database indexing

### Performance Monitoring

#### Key Metrics to Monitor

```bash
# Application metrics
curl -s http://localhost:9090/metrics | grep -E "(http_requests|session_count|command_processing)"

# System metrics
top -p $(piddof node)
iostat -x 1
netstat -tuln | grep -E "(3000|3001|5432|6379)"

# Database metrics
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

#### Log Analysis

```bash
# Application logs
tail -f /var/log/sim/application.log | jq 'select(.level == "error")'

# Nginx access logs
tail -f /var/log/nginx/access.log | grep -E "(5[0-9]{2}|4[0-9]{2})"

# System logs
journalctl -u sim-app -f --no-pager
```

This deployment guide provides a comprehensive foundation for deploying the Workflow to Journey Mapping System in production environments. Adjust configurations based on your specific infrastructure and requirements.

---

*Deployment Guide last updated: $(date)*