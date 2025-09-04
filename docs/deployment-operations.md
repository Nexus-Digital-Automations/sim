# Deployment and Operations Guide

## Table of Contents

1. [Installation Guide](#installation-guide)
2. [Configuration Management](#configuration-management)
3. [Database Setup](#database-setup)
4. [Security Configuration](#security-configuration)
5. [Monitoring Setup](#monitoring-setup)
6. [Scaling Guidelines](#scaling-guidelines)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance Procedures](#maintenance-procedures)
10. [Environment Management](#environment-management)

---

## Installation Guide

### System Requirements

#### Minimum Requirements
- **CPU**: 2 vCPU cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Linux (Ubuntu 20.04+), macOS, Windows 10+
- **Container Runtime**: Docker 20.10+ and Docker Compose 2.0+

#### Recommended Production Requirements
- **CPU**: 4+ vCPU cores
- **RAM**: 8GB+
- **Storage**: 100GB SSD with backup strategy
- **OS**: Linux (Ubuntu 22.04 LTS)
- **Network**: Static IP with proper DNS configuration
- **Load Balancer**: Nginx, Apache, or cloud load balancer

### Installation Methods

#### Method 1: NPM Package (Quickstart)

```bash
# Install and run Sim with single command
npx simstudio

# With custom options
npx simstudio --port 8080 --no-pull
```

**Prerequisites**: Docker must be installed and running.

#### Method 2: Docker Compose (Production)

```bash
# Clone repository
git clone https://github.com/simstudioai/sim.git
cd sim

# Create production environment file
cp .env.example .env

# Configure environment variables (see Configuration section)
nano .env

# Start production services
docker compose -f docker-compose.prod.yml up -d

# Verify deployment
docker compose -f docker-compose.prod.yml ps
```

#### Method 3: Kubernetes with Helm

```bash
# Add Sim Helm repository
helm repo add sim https://helm.sim.ai
helm repo update

# Create namespace
kubectl create namespace sim

# Create secrets (see Security Configuration)
kubectl create secret generic sim-secrets \
  --from-literal=database-password="your-secure-password" \
  --from-literal=auth-secret="$(openssl rand -hex 32)" \
  --from-literal=encryption-key="$(openssl rand -hex 32)" \
  -n sim

# Deploy with Helm
helm upgrade --install sim sim/sim \
  --namespace sim \
  --values values-production.yaml
```

#### Method 4: Manual Development Setup

```bash
# Prerequisites
# - Bun runtime (https://bun.sh/)
# - PostgreSQL 12+ with pgvector extension

# Clone and install
git clone https://github.com/simstudioai/sim.git
cd sim
bun install

# Set up PostgreSQL with pgvector
docker run --name simstudio-db \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=simstudio \
  -p 5432:5432 -d \
  pgvector/pgvector:pg17

# Configure environment
cd apps/sim
cp .env.example .env
# Edit .env file with your configuration

# Run database migrations
bunx drizzle-kit migrate

# Start development servers
bun run dev:full
```

### Installation Verification

```bash
# Check service status
curl -f http://localhost:3000/api/health || echo "Main app not responding"
curl -f http://localhost:3002/health || echo "Realtime server not responding"

# Check database connectivity
docker compose -f docker-compose.prod.yml exec simstudio \
  node -e "
    const { env } = require('./lib/env');
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    pool.query('SELECT 1')
      .then(() => console.log('✅ Database connected'))
      .catch(err => console.error('❌ Database error:', err));
  "

# Check logs for errors
docker compose -f docker-compose.prod.yml logs simstudio
docker compose -f docker-compose.prod.yml logs realtime
```

---

## Configuration Management

### Environment Variables

#### Core Configuration (Required)

```bash
# Core Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
BETTER_AUTH_URL=https://your-domain.com
BETTER_AUTH_SECRET=your-32-character-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# Realtime
SOCKET_SERVER_URL=http://localhost:3002
NEXT_PUBLIC_SOCKET_URL=wss://your-domain.com/socket
```

#### Security Configuration

```bash
# Access Control (Optional - leave empty to allow all users)
ALLOWED_LOGIN_EMAILS=admin@company.com,user@company.com
ALLOWED_LOGIN_DOMAINS=company.com,trusted-partner.com

# Rate Limiting (per minute)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_FREE_SYNC=10
RATE_LIMIT_PRO_SYNC=25
RATE_LIMIT_TEAM_SYNC=75
RATE_LIMIT_ENTERPRISE_SYNC=150
```

#### AI Provider Configuration

```bash
# OpenAI (Primary)
OPENAI_API_KEY=your-openai-key
OPENAI_API_KEY_1=additional-key-for-load-balancing
OPENAI_API_KEY_2=another-key-for-load-balancing

# Anthropic Claude
ANTHROPIC_API_KEY_1=your-anthropic-key
ANTHROPIC_API_KEY_2=backup-anthropic-key

# Local Models (Optional)
OLLAMA_URL=http://localhost:11434

# Other Providers
MISTRAL_API_KEY=your-mistral-key
ELEVENLABS_API_KEY=your-elevenlabs-key
```

#### Email Configuration

```bash
# Transactional Email
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL_ADDRESS="Sim <noreply@your-domain.com>"
EMAIL_DOMAIN=your-domain.com

# Azure Communication Services (Alternative)
AZURE_ACS_CONNECTION_STRING=your-azure-connection-string
```

#### OAuth Integration (Optional)

```bash
# Google Services
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub Integration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Microsoft Office 365
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

### Configuration Management Best Practices

#### Environment-Specific Configuration

**Development (.env.development)**
```bash
NODE_ENV=development
LOG_LEVEL=DEBUG
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/simstudio_dev
```

**Staging (.env.staging)**
```bash
NODE_ENV=production
LOG_LEVEL=INFO
NEXT_PUBLIC_APP_URL=https://staging.your-domain.com
DATABASE_URL=postgresql://user:pass@staging-db:5432/simstudio_staging
```

**Production (.env.production)**
```bash
NODE_ENV=production
LOG_LEVEL=WARN
NEXT_PUBLIC_APP_URL=https://your-domain.com
DATABASE_URL=postgresql://user:pass@prod-db:5432/simstudio_prod
```

#### Secret Management

```bash
# Generate secure secrets
openssl rand -hex 32  # For BETTER_AUTH_SECRET and ENCRYPTION_KEY

# Using external secret managers
# AWS Secrets Manager
BETTER_AUTH_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id sim/auth-secret \
  --query SecretString --output text)

# HashiCorp Vault
BETTER_AUTH_SECRET=$(vault kv get -field=auth-secret secret/sim)

# Kubernetes Secrets
kubectl create secret generic sim-secrets \
  --from-literal=auth-secret="$(openssl rand -hex 32)"
```

### Configuration Templates

#### Docker Compose Override

**docker-compose.override.yml** (for local customization):
```yaml
services:
  simstudio:
    environment:
      - LOG_LEVEL=DEBUG
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads

  db:
    ports:
      - "5432:5432"
    volumes:
      - ./db-data:/var/lib/postgresql/data
```

#### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sim-config
  namespace: sim
data:
  NEXT_PUBLIC_APP_URL: "https://sim.example.com"
  SOCKET_SERVER_URL: "http://realtime:3002"
  RATE_LIMIT_WINDOW_MS: "60000"
  RATE_LIMIT_FREE_SYNC: "10"
  LOG_LEVEL: "INFO"
```

---

## Database Setup

### PostgreSQL with pgvector Extension

#### Supported Versions
- PostgreSQL 12, 13, 14, 15, 16, 17
- pgvector extension 0.4.0+

#### Installation Options

**Option A: Docker (Recommended)**
```bash
# Official pgvector image
docker run --name sim-postgres \
  -e POSTGRES_DB=simstudio \
  -e POSTGRES_USER=simuser \
  -e POSTGRES_PASSWORD=secure-password \
  -e POSTGRES_INITDB_ARGS="--auth-host=md5" \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d pgvector/pgvector:pg17

# Verify pgvector extension
docker exec sim-postgres psql -U simuser -d simstudio \
  -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT * FROM pg_extension WHERE extname = 'vector';"
```

**Option B: Managed Database Services**

*AWS RDS*:
- Use RDS for PostgreSQL 15.2+ with pgvector support
- Enable pgvector: `CREATE EXTENSION vector;`

*Google Cloud SQL*:
- PostgreSQL 13+ with vector extension support
- Enable via Cloud Console or gcloud CLI

*Azure Database*:
- PostgreSQL flexible server with vector extension
- Enable in server parameters

#### Schema Initialization

```bash
# Run migrations (automatically creates all tables)
cd apps/sim
bunx drizzle-kit migrate

# Verify schema
bunx drizzle-kit check

# Generate new migration after schema changes
bunx drizzle-kit generate
```

#### Database Configuration Tuning

**postgresql.conf optimizations**:
```ini
# Memory
shared_buffers = 256MB                    # 25% of RAM for dedicated DB server
effective_cache_size = 1GB                # Available system cache
work_mem = 4MB                           # Per-operation memory

# Connections
max_connections = 200                     # Adjust based on connection pooling

# Write-Ahead Logging
wal_buffers = 16MB
max_wal_size = 4GB
min_wal_size = 80MB
checkpoint_completion_target = 0.9

# Vector-specific optimizations
shared_preload_libraries = 'vector'       # Load vector extension at startup
```

#### Connection Pooling

**Option A: Built-in Connection Management**
```javascript
// Already handled in the application code
// Pool configuration in lib/db/index.ts
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,              // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Option B: External Connection Pooler (PgBouncer)**
```ini
# pgbouncer.ini
[databases]
simstudio = host=localhost port=5432 dbname=simstudio

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
admin_users = postgres
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

#### Backup Strategy

**Automated Backup Script**:
```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="simstudio"
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump $DATABASE_URL > "$BACKUP_DIR/simstudio_backup_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/simstudio_backup_$DATE.sql"

# Remove old backups
find $BACKUP_DIR -name "simstudio_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: simstudio_backup_$DATE.sql.gz"
```

**Backup Verification**:
```bash
# Test backup restoration
createdb simstudio_test
gunzip -c /backups/postgres/simstudio_backup_latest.sql.gz | psql simstudio_test
dropdb simstudio_test
```

---

## Security Configuration

### SSL/TLS Configuration

#### Nginx SSL Proxy

```nginx
# /etc/nginx/sites-available/sim
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # WebSocket for realtime features
    location /socket.io/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Let's Encrypt SSL Setup

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Set up automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Database Security

#### PostgreSQL Security Configuration

```bash
# Create dedicated database user
sudo -u postgres psql
CREATE USER simuser WITH PASSWORD 'secure-random-password';
CREATE DATABASE simstudio OWNER simuser;
GRANT ALL PRIVILEGES ON DATABASE simstudio TO simuser;

# Configure PostgreSQL authentication
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add: host simstudio simuser 10.0.0.0/8 md5

# Enable SSL connections
sudo nano /etc/postgresql/15/main/postgresql.conf
# ssl = on
# ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
# ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
```

#### Network Security

```bash
# Firewall configuration (Ubuntu/ufw)
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from 10.0.0.0/8 to any port 5432  # PostgreSQL from private network only
```

### Authentication & Authorization

#### Better Auth Configuration

```typescript
// lib/auth/config.ts
export const authConfig = {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // 1 day
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user"
      }
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true
  }
}
```

#### Role-Based Access Control

```typescript
// lib/permissions/roles.ts
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer'
} as const;

export const PERMISSIONS = {
  WORKFLOW_CREATE: 'workflow:create',
  WORKFLOW_EDIT: 'workflow:edit',
  WORKFLOW_DELETE: 'workflow:delete',
  ADMIN_PANEL: 'admin:panel'
} as const;

export const rolePermissions = {
  admin: Object.values(PERMISSIONS),
  user: [PERMISSIONS.WORKFLOW_CREATE, PERMISSIONS.WORKFLOW_EDIT],
  viewer: []
};
```

### API Security

#### Rate Limiting Configuration

```typescript
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: env.REDIS_URL,
  token: env.REDIS_TOKEN,
});

export const rateLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
  analytics: true,
});

// Usage in API routes
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await rateLimiter.limit(ip);
  
  if (!success) {
    return new Response("Too many requests", { status: 429 });
  }
  
  // Process request...
}
```

### Container Security

#### Docker Security Configuration

```dockerfile
# apps/sim/Dockerfile
FROM node:20-alpine AS base

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Security hardening
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

# Run as non-root user
USER nextjs

# Security labels
LABEL security.non-root=true
LABEL security.scan=required
```

**Docker Compose Security**:
```yaml
services:
  simstudio:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    read_only: true
    tmpfs:
      - /tmp
      - /var/tmp
```

---

## Monitoring Setup

### Application Monitoring

#### Health Check Endpoints

The application provides several health check endpoints:

```bash
# Main application health
curl -f http://localhost:3000/api/health
# Returns: {"status": "healthy", "timestamp": "2024-01-01T00:00:00.000Z"}

# Realtime server health
curl -f http://localhost:3002/health
# Returns: {"status": "ok", "uptime": 12345}

# Database connectivity check
curl -f http://localhost:3000/api/health/db
# Returns: {"database": "connected", "migrations": "up-to-date"}
```

#### Prometheus Metrics

**Enable metrics collection**:
```bash
# Add to environment variables
ENABLE_METRICS=true
METRICS_PORT=9090
```

**Custom metrics configuration**:
```typescript
// lib/monitoring/metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const httpRequests = new Counter({
  name: 'sim_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpDuration = new Histogram({
  name: 'sim_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const workflowExecutions = new Counter({
  name: 'sim_workflow_executions_total',
  help: 'Total number of workflow executions',
  labelNames: ['status', 'workflow_type'],
});

export const activeConnections = new Gauge({
  name: 'sim_websocket_connections_active',
  help: 'Number of active WebSocket connections',
});
```

#### Grafana Dashboard Configuration

**Dashboard JSON** (save as `grafana-dashboard.json`):
```json
{
  "dashboard": {
    "title": "Sim Application Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [{
          "expr": "rate(sim_http_requests_total[5m])",
          "legendFormat": "{{method}} {{route}}"
        }]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(sim_http_request_duration_seconds_bucket[5m]))",
          "legendFormat": "95th percentile"
        }]
      },
      {
        "title": "Workflow Executions",
        "type": "singlestat",
        "targets": [{
          "expr": "increase(sim_workflow_executions_total[1h])",
          "legendFormat": "Hourly executions"
        }]
      }
    ]
  }
}
```

### Infrastructure Monitoring

#### Docker Compose Monitoring Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana-dashboard.json:/etc/grafana/provisioning/dashboards/dashboard.json

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

volumes:
  prometheus_data:
  grafana_data:
```

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'sim-app'
    static_configs:
      - targets: ['simstudio:9090']
  
  - job_name: 'sim-realtime'
    static_configs:
      - targets: ['realtime:9090']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Logging Configuration

#### Structured Logging

```typescript
// lib/logs/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sim-app' },
  transports: [
    new winston.transports.File({ 
      filename: '/var/log/sim/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '/var/log/sim/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

// Usage examples
logger.info('User workflow executed', {
  userId: 'user123',
  workflowId: 'workflow456',
  duration: 1234,
  status: 'success'
});

logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  connectionString: 'postgresql://***:***@localhost:5432/simstudio'
});
```

#### Log Aggregation with ELK Stack

```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200

volumes:
  elasticsearch_data:
```

### Alerting Configuration

#### Alert Rules

```yaml
# alert_rules.yml
groups:
  - name: sim-app-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(sim_http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(sim_http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: DatabaseConnectionDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection is down"
          description: "PostgreSQL database is not responding"

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 85%"
```

#### Notification Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@your-domain.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    email_configs:
      - to: 'ops-team@your-domain.com'
        subject: 'Sim Alert: {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Labels: {{ range .Labels.SortedPairs }}{{ .Name }}: {{ .Value }} {{ end }}
          {{ end }}
    
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'Sim Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

---

## Scaling Guidelines

### Horizontal Scaling

#### Load Balancer Configuration

**Nginx Load Balancer**:
```nginx
# /etc/nginx/sites-available/sim-lb
upstream sim_app {
    least_conn;
    server app1.internal:3000 max_fails=3 fail_timeout=30s;
    server app2.internal:3000 max_fails=3 fail_timeout=30s;
    server app3.internal:3000 max_fails=3 fail_timeout=30s;
}

upstream sim_realtime {
    ip_hash;  # Sticky sessions for WebSocket
    server realtime1.internal:3002;
    server realtime2.internal:3002;
    server realtime3.internal:3002;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://sim_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health check
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_connect_timeout 2s;
        proxy_read_timeout 30s;
    }

    location /socket.io/ {
        proxy_pass http://sim_realtime;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

#### Kubernetes Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sim-app-hpa
  namespace: sim
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sim-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: nginx_ingress_controller_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### Database Scaling

#### Read Replicas Configuration

```bash
# PostgreSQL Primary configuration (postgresql.conf)
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
hot_standby = on

# Create replication user
CREATE USER replicator REPLICATION LOGIN ENCRYPTED PASSWORD 'replica-password';
```

```bash
# Set up read replica
pg_basebackup -h primary-host -D /var/lib/postgresql/12/replica -U replicator -v -P -W

# Configure replica (postgresql.conf)
hot_standby = on
primary_conninfo = 'host=primary-host port=5432 user=replicator password=replica-password'
```

#### Connection Pooling with PgBouncer

```ini
# pgbouncer.ini
[databases]
simstudio = host=primary-db.internal port=5432 dbname=simstudio
simstudio_read = host=replica-db.internal port=5432 dbname=simstudio

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 200
default_pool_size = 50
reserve_pool_size = 10
reserve_pool_timeout = 5
server_lifetime = 3600
server_idle_timeout = 600
```

### Performance Optimization

#### Application-Level Optimizations

```typescript
// lib/performance/cache.ts
import { Redis } from 'ioredis';

const redis = new Redis(env.REDIS_URL);

export class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  static async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  static async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Usage in API routes
export async function GET(request: Request) {
  const cacheKey = `workflows:${userId}`;
  
  let workflows = await CacheManager.get<Workflow[]>(cacheKey);
  
  if (!workflows) {
    workflows = await db.select().from(workflowsTable).where(eq(workflowsTable.userId, userId));
    await CacheManager.set(cacheKey, workflows, 300); // 5 minutes
  }
  
  return Response.json(workflows);
}
```

#### CDN Configuration

```typescript
// next.config.ts
const config = {
  images: {
    domains: ['your-cdn-domain.com'],
    loader: 'cloudinary', // or 'cloudfront', 'imgix'
  },
  
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=300',
          },
        ],
      },
    ];
  },
};
```

### Resource Requirements by Scale

#### Small Deployment (< 100 users)
- **Application**: 2 CPU, 4GB RAM
- **Database**: 2 CPU, 4GB RAM, 50GB SSD
- **Redis**: 1 CPU, 1GB RAM
- **Total**: ~$100-200/month (cloud hosting)

#### Medium Deployment (100-1000 users)
- **Application**: 2x instances (4 CPU, 8GB RAM each)
- **Database**: 4 CPU, 8GB RAM, 200GB SSD + 1 read replica
- **Redis**: 2 CPU, 2GB RAM
- **Load Balancer**: 1 instance
- **Total**: ~$500-800/month (cloud hosting)

#### Large Deployment (1000+ users)
- **Application**: Auto-scaling 3-10 instances (4 CPU, 8GB RAM each)
- **Database**: 8 CPU, 16GB RAM, 500GB SSD + 2 read replicas
- **Redis**: Cluster with 3 nodes (2 CPU, 4GB RAM each)
- **Load Balancer**: High availability setup
- **Monitoring**: Dedicated monitoring stack
- **Total**: ~$2000-5000/month (cloud hosting)

---

## Backup & Recovery

### Backup Strategy

#### Database Backups

**Automated Backup Script**:
```bash
#!/bin/bash
# /opt/sim/scripts/backup-database.sh

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/sim/backups/database"
S3_BUCKET="your-backup-bucket"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="simstudio"

# Logging
LOG_FILE="/var/log/sim/backup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "$(date): Starting database backup"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
BACKUP_FILE="$BACKUP_DIR/simstudio_${DATE}.sql"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Upload to S3 (if configured)
if command -v aws &> /dev/null && [ -n "${S3_BUCKET}" ]; then
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/database/"
    echo "$(date): Backup uploaded to S3"
fi

# Clean up old local backups
find "$BACKUP_DIR" -name "simstudio_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup integrity
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(stat -c%s "$BACKUP_FILE")
    if [ "$SIZE" -gt 1024 ]; then  # At least 1KB
        echo "$(date): Backup completed successfully ($SIZE bytes)"
    else
        echo "$(date): ERROR: Backup file too small, may be corrupted"
        exit 1
    fi
else
    echo "$(date): ERROR: Backup file not created"
    exit 1
fi

echo "$(date): Database backup completed"
```

**Cron Schedule**:
```bash
# /etc/cron.d/sim-backup
# Daily backup at 2 AM
0 2 * * * root /opt/sim/scripts/backup-database.sh

# Weekly backup verification
0 3 * * 0 root /opt/sim/scripts/verify-backup.sh
```

#### Application Data Backups

```bash
#!/bin/bash
# /opt/sim/scripts/backup-application.sh

BACKUP_DIR="/opt/sim/backups/application"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup uploaded files
if [ -d "/opt/sim/app/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_${DATE}.tar.gz" -C /opt/sim/app uploads
fi

# Backup configuration files
tar -czf "$BACKUP_DIR/config_${DATE}.tar.gz" \
    /opt/sim/docker-compose.yml \
    /opt/sim/.env \
    /opt/sim/nginx.conf \
    --exclude='*.log'

# Backup certificates (if using Let's Encrypt)
if [ -d "/etc/letsencrypt" ]; then
    sudo tar -czf "$BACKUP_DIR/certificates_${DATE}.tar.gz" -C / etc/letsencrypt
fi

echo "Application backup completed: ${DATE}"
```

### Disaster Recovery Procedures

#### Complete System Recovery

**1. Infrastructure Setup**:
```bash
# Provision new server/infrastructure
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone https://github.com/simstudioai/sim.git /opt/sim
cd /opt/sim
```

**2. Restore Configuration**:
```bash
# Restore configuration files from backup
tar -xzf config_backup.tar.gz

# Update environment variables if needed
nano .env
```

**3. Database Recovery**:
```bash
# Start database container
docker compose -f docker-compose.prod.yml up -d db

# Wait for database to be ready
sleep 30

# Restore database from backup
gunzip -c simstudio_backup.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d simstudio

# Run any pending migrations
docker compose -f docker-compose.prod.yml run --rm migrations
```

**4. Application Recovery**:
```bash
# Restore uploaded files
tar -xzf uploads_backup.tar.gz -C /opt/sim/app/

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Verify services
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost:3000/api/health
```

#### Point-in-Time Recovery

```bash
#!/bin/bash
# Point-in-time recovery script

RECOVERY_TIME="2024-01-15 10:30:00"
BACKUP_FILE="simstudio_20240115_020000.sql.gz"
WAL_ARCHIVE_DIR="/opt/sim/backups/wal"

# Stop application
docker compose -f docker-compose.prod.yml stop simstudio realtime

# Create recovery database
docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "DROP DATABASE IF EXISTS simstudio_recovery;"
docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "CREATE DATABASE simstudio_recovery;"

# Restore base backup
gunzip -c "$BACKUP_FILE" | docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d simstudio_recovery

# Configure recovery
cat > /tmp/recovery.conf << EOF
recovery_target_time = '$RECOVERY_TIME'
recovery_target_action = 'promote'
EOF

# Apply WAL files for point-in-time recovery
docker compose -f docker-compose.prod.yml exec db cp /tmp/recovery.conf /var/lib/postgresql/data/

# Start database in recovery mode
docker compose -f docker-compose.prod.yml restart db

# Wait for recovery to complete
sleep 60

# Promote and rename database
docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "ALTER DATABASE simstudio RENAME TO simstudio_old;"
docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "ALTER DATABASE simstudio_recovery RENAME TO simstudio;"

# Start application
docker compose -f docker-compose.prod.yml up -d
```

### Backup Testing

#### Automated Backup Verification

```bash
#!/bin/bash
# /opt/sim/scripts/verify-backup.sh

BACKUP_DIR="/opt/sim/backups/database"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/simstudio_*.sql.gz | head -n1)
TEST_DB="simstudio_test_$(date +%s)"

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup files found"
    exit 1
fi

echo "Testing backup: $LATEST_BACKUP"

# Create test database
docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "CREATE DATABASE $TEST_DB;"

# Restore backup to test database
gunzip -c "$LATEST_BACKUP" | docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d "$TEST_DB"

# Run basic validation queries
TABLES=$(docker compose -f docker-compose.prod.yml exec db psql -U postgres -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
USERS=$(docker compose -f docker-compose.prod.yml exec db psql -U postgres -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM users;")

echo "Tables restored: $TABLES"
echo "Users count: $USERS"

# Clean up test database
docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "DROP DATABASE $TEST_DB;"

if [ "$TABLES" -gt 0 ] && [ "$USERS" -ge 0 ]; then
    echo "✅ Backup verification successful"
    exit 0
else
    echo "❌ Backup verification failed"
    exit 1
fi
```

---

## Troubleshooting

### Common Issues

#### Application Won't Start

**Issue**: Container fails to start with "Cannot connect to database"

**Diagnosis**:
```bash
# Check database connectivity
docker compose -f docker-compose.prod.yml exec db pg_isready -U postgres

# Check database logs
docker compose -f docker-compose.prod.yml logs db

# Verify environment variables
docker compose -f docker-compose.prod.yml exec simstudio printenv | grep DATABASE_URL
```

**Solutions**:
```bash
# Wait for database to be ready
docker compose -f docker-compose.prod.yml up -d db
sleep 30
docker compose -f docker-compose.prod.yml up -d simstudio

# Reset database if corrupted
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d db
sleep 30
docker compose -f docker-compose.prod.yml run --rm migrations
docker compose -f docker-compose.prod.yml up -d
```

#### High Memory Usage

**Issue**: Application consuming too much memory

**Diagnosis**:
```bash
# Check container memory usage
docker stats

# Check Node.js heap usage
docker compose -f docker-compose.prod.yml exec simstudio node -e "console.log(process.memoryUsage())"

# Monitor memory over time
docker compose -f docker-compose.prod.yml exec simstudio \
  node -e "setInterval(() => console.log(new Date(), process.memoryUsage()), 5000)"
```

**Solutions**:
```bash
# Increase container memory limits
# In docker-compose.prod.yml:
services:
  simstudio:
    deploy:
      resources:
        limits:
          memory: 4G  # Increase from 2G

# Optimize Node.js memory usage
environment:
  - NODE_OPTIONS=--max-old-space-size=2048

# Enable garbage collection monitoring
environment:
  - NODE_OPTIONS=--trace-gc --max-old-space-size=2048
```

#### Database Performance Issues

**Issue**: Slow query performance

**Diagnosis**:
```bash
# Enable query logging
docker compose -f docker-compose.prod.yml exec db \
  psql -U postgres -c "ALTER SYSTEM SET log_statement = 'all';"
docker compose -f docker-compose.prod.yml exec db \
  psql -U postgres -c "SELECT pg_reload_conf();"

# Check slow queries
docker compose -f docker-compose.prod.yml exec db \
  psql -U postgres -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check database connections
docker compose -f docker-compose.prod.yml exec db \
  psql -U postgres -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"
```

**Solutions**:
```bash
# Add database indexes (example)
docker compose -f docker-compose.prod.yml exec db \
  psql -U postgres -d simstudio -c "CREATE INDEX CONCURRENTLY idx_workflows_user_id ON workflows(user_id);"

# Increase connection pool size
# In .env:
DATABASE_MAX_CONNECTIONS=50

# Optimize PostgreSQL configuration
# Add to postgresql.conf:
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 256MB
```

#### SSL Certificate Issues

**Issue**: SSL certificate expired or invalid

**Diagnosis**:
```bash
# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -noout -dates

# Check certificate chain
openssl s509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -noout -text

# Test SSL connection
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

**Solutions**:
```bash
# Renew Let's Encrypt certificate
sudo certbot renew --force-renewal

# Test certificate renewal
sudo certbot renew --dry-run

# Reload Nginx
sudo systemctl reload nginx

# Check Nginx configuration
sudo nginx -t
```

### Debugging Tools

#### Application Debugging

```typescript
// Enable debug logging
// In .env:
LOG_LEVEL=DEBUG
NODE_ENV=development

// Add debug endpoints
// app/api/debug/health/route.ts
export async function GET() {
  const health = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    env: process.env.NODE_ENV,
    database: await testDatabaseConnection(),
    redis: await testRedisConnection(),
  };
  
  return Response.json(health);
}
```

#### Database Debugging

```sql
-- Check active connections
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    backend_start,
    query_start,
    state,
    query
FROM pg_stat_activity
WHERE state = 'active';

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
```

#### Network Debugging

```bash
# Check port connectivity
nc -zv localhost 3000
nc -zv localhost 3002
nc -zv localhost 5432

# Check DNS resolution
nslookup your-domain.com
dig your-domain.com

# Check SSL/TLS
curl -I https://your-domain.com
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check load balancer health
curl -f http://your-domain.com/health
```

### Performance Troubleshooting

#### Identifying Bottlenecks

```bash
# CPU usage per container
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Database performance
docker compose -f docker-compose.prod.yml exec db \
  psql -U postgres -c "SELECT * FROM pg_stat_database WHERE datname = 'simstudio';"

# Application response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# WebSocket connection count
docker compose -f docker-compose.prod.yml exec realtime \
  node -e "console.log('Active connections:', process.env.ACTIVE_CONNECTIONS || 0)"
```

**curl-format.txt**:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

---

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily Tasks (Automated)

```bash
#!/bin/bash
# /opt/sim/scripts/daily-maintenance.sh

LOG_FILE="/var/log/sim/maintenance.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "$(date): Starting daily maintenance tasks"

# 1. Health check
if ! curl -f -s http://localhost:3000/api/health > /dev/null; then
    echo "$(date): WARNING: Application health check failed"
    # Send alert (implement your alerting mechanism)
fi

# 2. Database maintenance
docker compose -f docker-compose.prod.yml exec db \
    psql -U postgres -d simstudio -c "ANALYZE;"

# 3. Clean up old logs (keep 7 days)
find /var/log/sim -name "*.log" -mtime +7 -delete

# 4. Clean up temporary files
docker compose -f docker-compose.prod.yml exec simstudio \
    find /tmp -type f -mtime +1 -delete 2>/dev/null || true

# 5. Check disk usage
DISK_USAGE=$(df -h /opt/sim | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "$(date): WARNING: Disk usage is ${DISK_USAGE}%"
fi

echo "$(date): Daily maintenance completed"
```

#### Weekly Tasks (Automated)

```bash
#!/bin/bash
# /opt/sim/scripts/weekly-maintenance.sh

echo "$(date): Starting weekly maintenance tasks"

# 1. Database vacuum and analyze
docker compose -f docker-compose.prod.yml exec db \
    psql -U postgres -d simstudio -c "VACUUM ANALYZE;"

# 2. Update database statistics
docker compose -f docker-compose.prod.yml exec db \
    psql -U postgres -d simstudio -c "SELECT pg_stat_reset();"

# 3. Clean up old workflow execution logs (older than 30 days)
docker compose -f docker-compose.prod.yml exec db \
    psql -U postgres -d simstudio -c "
    DELETE FROM workflow_execution_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';"

# 4. Check and rotate container logs
docker system prune -f --filter "until=168h"  # 7 days

# 5. Backup verification
/opt/sim/scripts/verify-backup.sh

echo "$(date): Weekly maintenance completed"
```

#### Monthly Tasks (Manual)

```bash
#!/bin/bash
# /opt/sim/scripts/monthly-maintenance.sh

echo "$(date): Starting monthly maintenance tasks"

# 1. Security updates
apt update && apt list --upgradable

# 2. SSL certificate check
certbot certificates

# 3. Database index maintenance
docker compose -f docker-compose.prod.yml exec db \
    psql -U postgres -d simstudio -c "REINDEX DATABASE simstudio;"

# 4. Performance analysis
docker compose -f docker-compose.prod.yml exec db \
    psql -U postgres -d simstudio -c "
    SELECT schemaname, tablename, 
           n_tup_ins, n_tup_upd, n_tup_del, n_tup_hot_upd,
           last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
    FROM pg_stat_user_tables 
    ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;"

# 5. Capacity planning report
echo "=== Storage Usage ==="
df -h

echo "=== Database Size ==="
docker compose -f docker-compose.prod.yml exec db \
    psql -U postgres -d simstudio -c "
    SELECT pg_database.datname, 
           pg_database_size(pg_database.datname) AS size,
           pg_size_pretty(pg_database_size(pg_database.datname)) AS size_pretty
    FROM pg_database;"

echo "=== Top Tables by Size ==="
docker compose -f docker-compose.prod.yml exec db \
    psql -U postgres -d simstudio -c "
    SELECT schemaname, tablename,
           pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10;"

echo "$(date): Monthly maintenance completed"
```

### Update Procedures

#### Application Updates

```bash
#!/bin/bash
# /opt/sim/scripts/update-application.sh

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/sim/backups/pre-update"
UPDATE_LOG="/var/log/sim/updates.log"

exec 1> >(tee -a "$UPDATE_LOG")
exec 2>&1

echo "$(date): Starting application update"

# 1. Create pre-update backup
mkdir -p "$BACKUP_DIR"
/opt/sim/scripts/backup-database.sh
/opt/sim/scripts/backup-application.sh

# 2. Pull latest code
cd /opt/sim
git fetch origin
CURRENT_VERSION=$(git rev-parse HEAD)
echo "Current version: $CURRENT_VERSION"

# 3. Check for updates
LATEST_VERSION=$(git rev-parse origin/main)
if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ]; then
    echo "No updates available"
    exit 0
fi

echo "Updating to version: $LATEST_VERSION"

# 4. Update code
git pull origin main

# 5. Check for environment variable changes
if [ -f ".env.example" ]; then
    echo "=== Check for new environment variables ==="
    diff .env .env.example || true
fi

# 6. Update containers
docker compose -f docker-compose.prod.yml pull

# 7. Run database migrations
docker compose -f docker-compose.prod.yml run --rm migrations

# 8. Restart services with zero-downtime deployment
echo "Performing rolling update..."

# Update realtime service first
docker compose -f docker-compose.prod.yml up -d --no-deps realtime

# Wait for realtime to be healthy
sleep 10
curl -f http://localhost:3002/health || (echo "Realtime service failed to start"; exit 1)

# Update main application
docker compose -f docker-compose.prod.yml up -d --no-deps simstudio

# Wait for application to be healthy
sleep 30
curl -f http://localhost:3000/api/health || (echo "Application failed to start"; exit 1)

# 9. Clean up old images
docker image prune -f

echo "$(date): Application update completed successfully"
echo "Previous version: $CURRENT_VERSION"
echo "Current version: $LATEST_VERSION"
```

#### Security Updates

```bash
#!/bin/bash
# /opt/sim/scripts/security-update.sh

echo "$(date): Starting security updates"

# 1. System updates
apt update
apt upgrade -y

# 2. Docker security updates
docker system prune -af
docker compose -f docker-compose.prod.yml pull

# 3. SSL certificate renewal
certbot renew --quiet

# 4. Update secrets if needed (manual verification required)
echo "Please verify the following secrets are up to date:"
echo "- BETTER_AUTH_SECRET"
echo "- ENCRYPTION_KEY"
echo "- Database passwords"
echo "- API keys"

# 5. Security scan (if tools are available)
if command -v docker-bench-security.sh &> /dev/null; then
    docker-bench-security.sh
fi

echo "$(date): Security updates completed"
```

### Health Monitoring

#### Continuous Health Checks

```bash
#!/bin/bash
# /opt/sim/scripts/health-monitor.sh

while true; do
    # Application health
    if ! curl -f -s http://localhost:3000/api/health > /dev/null; then
        echo "$(date): Application unhealthy, attempting restart"
        docker compose -f docker-compose.prod.yml restart simstudio
        sleep 30
    fi
    
    # Realtime service health
    if ! curl -f -s http://localhost:3002/health > /dev/null; then
        echo "$(date): Realtime service unhealthy, attempting restart"
        docker compose -f docker-compose.prod.yml restart realtime
        sleep 30
    fi
    
    # Database health
    if ! docker compose -f docker-compose.prod.yml exec db pg_isready -U postgres > /dev/null 2>&1; then
        echo "$(date): Database unhealthy"
        # Don't automatically restart database - requires manual intervention
    fi
    
    sleep 60  # Check every minute
done
```

---

## Environment Management

### Development Environment

#### Local Development Setup

```bash
# Clone repository
git clone https://github.com/simstudioai/sim.git
cd sim

# Install dependencies
bun install

# Set up development database
docker run --name simstudio-dev-db \
    -e POSTGRES_PASSWORD=devpassword \
    -e POSTGRES_DB=simstudio_dev \
    -p 5433:5432 -d \
    pgvector/pgvector:pg17

# Configure development environment
cd apps/sim
cp .env.example .env.development

# Edit .env.development
cat > .env.development << EOF
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:devpassword@localhost:5433/simstudio_dev
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002
SOCKET_SERVER_URL=http://localhost:3002
LOG_LEVEL=DEBUG
EOF

# Run migrations
bunx drizzle-kit migrate

# Start development servers
bun run dev:full
```

#### Development Docker Compose

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: apps/sim/Dockerfile
      target: development
    ports:
      - "3000:3000"
      - "9229:9229"  # Node.js debugging
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=DEBUG
    volumes:
      - ./apps/sim:/app
      - /app/node_modules
      - ./uploads:/app/uploads
    command: ["bun", "run", "dev"]
    depends_on:
      - db
      - redis

  realtime:
    build:
      context: .
      dockerfile: apps/sim/Dockerfile
      target: development
    ports:
      - "3002:3002"
    volumes:
      - ./apps/sim:/app
      - /app/node_modules
    command: ["bun", "run", "dev:sockets"]
    depends_on:
      - db

  db:
    image: pgvector/pgvector:pg17
    environment:
      - POSTGRES_DB=simstudio_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=devpassword
    ports:
      - "5433:5432"
    volumes:
      - dev_postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    volumes:
      - dev_redis_data:/data

volumes:
  dev_postgres_data:
  dev_redis_data:
```

### Staging Environment

#### Staging Configuration

```bash
# Staging environment variables
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.sim.your-domain.com
DATABASE_URL=postgresql://staging_user:staging_pass@staging-db:5432/simstudio_staging
BETTER_AUTH_URL=https://staging.sim.your-domain.com
BETTER_AUTH_SECRET=staging-secret-32-chars
ENCRYPTION_KEY=staging-encryption-key-32-chars

# Reduced resources for staging
RATE_LIMIT_FREE_SYNC=5
RATE_LIMIT_PRO_SYNC=10
LOG_LEVEL=INFO

# Use staging credentials for external services
OPENAI_API_KEY=staging-openai-key
ANTHROPIC_API_KEY_1=staging-anthropic-key
```

#### Staging Deployment Script

```bash
#!/bin/bash
# /opt/sim/scripts/deploy-staging.sh

set -euo pipefail

echo "Deploying to staging environment"

# 1. Pull latest code
cd /opt/sim
git fetch origin
git checkout origin/staging  # Use staging branch

# 2. Build and deploy
docker compose -f docker-compose.staging.yml build
docker compose -f docker-compose.staging.yml down
docker compose -f docker-compose.staging.yml up -d

# 3. Run migrations
docker compose -f docker-compose.staging.yml run --rm migrations

# 4. Health check
sleep 30
curl -f https://staging.sim.your-domain.com/api/health

# 5. Run smoke tests
./scripts/smoke-tests.sh https://staging.sim.your-domain.com

echo "Staging deployment completed"
```

### Production Environment

#### Production Checklist

**Pre-deployment Checklist**:
- [ ] Environment variables configured and secured
- [ ] SSL certificates installed and valid
- [ ] Database backups configured and tested
- [ ] Monitoring and alerting set up
- [ ] Load balancer configured (if applicable)
- [ ] Firewall rules configured
- [ ] DNS records configured
- [ ] SMTP/email service configured
- [ ] External API keys configured
- [ ] Rate limiting configured
- [ ] Log aggregation configured
- [ ] Security headers configured
- [ ] Health check endpoints tested

#### Blue-Green Deployment

```bash
#!/bin/bash
# /opt/sim/scripts/blue-green-deploy.sh

set -euo pipefail

BLUE_PORT=3000
GREEN_PORT=3001
HEALTH_ENDPOINT="/api/health"

# Determine current active environment
if curl -f http://localhost:$BLUE_PORT$HEALTH_ENDPOINT > /dev/null 2>&1; then
    ACTIVE_PORT=$BLUE_PORT
    INACTIVE_PORT=$GREEN_PORT
    ACTIVE_ENV="blue"
    INACTIVE_ENV="green"
else
    ACTIVE_PORT=$GREEN_PORT
    INACTIVE_PORT=$BLUE_PORT
    ACTIVE_ENV="green"
    INACTIVE_ENV="blue"
fi

echo "Current active environment: $ACTIVE_ENV (port $ACTIVE_PORT)"
echo "Deploying to: $INACTIVE_ENV (port $INACTIVE_PORT)"

# 1. Deploy to inactive environment
docker compose -f docker-compose.prod.yml -f docker-compose.$INACTIVE_ENV.yml build
docker compose -f docker-compose.prod.yml -f docker-compose.$INACTIVE_ENV.yml up -d

# 2. Run database migrations (if needed)
docker compose -f docker-compose.prod.yml -f docker-compose.$INACTIVE_ENV.yml run --rm migrations

# 3. Health check on inactive environment
echo "Waiting for $INACTIVE_ENV environment to be healthy..."
for i in {1..30}; do
    if curl -f http://localhost:$INACTIVE_PORT$HEALTH_ENDPOINT > /dev/null 2>&1; then
        echo "$INACTIVE_ENV environment is healthy"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo "ERROR: $INACTIVE_ENV environment failed health check"
        exit 1
    fi
    
    sleep 10
done

# 4. Run smoke tests
./scripts/smoke-tests.sh http://localhost:$INACTIVE_PORT

# 5. Switch load balancer to new environment
echo "Switching load balancer from $ACTIVE_ENV to $INACTIVE_ENV"
./scripts/update-load-balancer.sh $INACTIVE_PORT

# 6. Verify traffic is flowing to new environment
sleep 30
curl -f https://your-domain.com$HEALTH_ENDPOINT

# 7. Stop old environment
echo "Stopping $ACTIVE_ENV environment"
docker compose -f docker-compose.prod.yml -f docker-compose.$ACTIVE_ENV.yml down

echo "Blue-green deployment completed successfully"
```

#### Rollback Procedures

```bash
#!/bin/bash
# /opt/sim/scripts/rollback.sh

set -euo pipefail

ROLLBACK_VERSION=${1:-""}

if [ -z "$ROLLBACK_VERSION" ]; then
    echo "Usage: $0 <git-commit-hash>"
    echo "Available versions:"
    git log --oneline -10
    exit 1
fi

echo "Rolling back to version: $ROLLBACK_VERSION"

# 1. Create emergency backup
./scripts/backup-database.sh

# 2. Checkout previous version
git checkout $ROLLBACK_VERSION

# 3. Check for database migrations that need to be reverted
echo "WARNING: Check if database migrations need to be reverted manually"
echo "Current migration status:"
docker compose -f docker-compose.prod.yml run --rm migrations bunx drizzle-kit status

# 4. Deploy previous version
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 5. Health check
sleep 30
curl -f http://localhost:3000/api/health

echo "Rollback completed. Please verify functionality and check logs."
echo "If database schema changes were involved, manual intervention may be required."
```

---

## Conclusion

This comprehensive deployment and operations guide provides the foundation for successfully deploying, managing, and scaling the Sim workflow automation platform. Key points to remember:

1. **Security First**: Always use strong secrets, enable SSL/TLS, and follow security best practices
2. **Monitor Everything**: Set up comprehensive monitoring, logging, and alerting from day one
3. **Test Backups**: Regularly verify that your backup and recovery procedures work
4. **Automate Operations**: Use scripts and automation to reduce human error and ensure consistency
5. **Plan for Scale**: Design your infrastructure to handle growth from the beginning
6. **Document Changes**: Keep this guide updated as your deployment evolves

For additional support and updates, refer to:
- [Official Sim Documentation](https://docs.sim.ai)
- [GitHub Repository](https://github.com/simstudioai/sim)
- [Community Discord](https://discord.gg/Hr4UWYEcTT)

Remember to customize the configurations and procedures in this guide to match your specific infrastructure, security requirements, and operational practices.