# Parlant React Chat Interface - Deployment & Configuration Guide

## Table of Contents

- [Environment Setup](#environment-setup)
- [Production Deployment](#production-deployment)
- [Configuration Management](#configuration-management)
- [Infrastructure Requirements](#infrastructure-requirements)
- [Security Configuration](#security-configuration)
- [Performance Tuning](#performance-tuning)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Scaling Strategies](#scaling-strategies)
- [Troubleshooting Deployment](#troubleshooting-deployment)

## Environment Setup

### Development Environment

```bash
# Prerequisites
node --version    # >= 18.0.0
npm --version     # >= 8.0.0
python --version  # >= 3.9.0
postgresql --version  # >= 13.0
redis --version   # >= 6.0

# Clone repository
git clone <repository-url>
cd sim

# Install dependencies
npm install
cd packages/parlant-server && pip install -r requirements.txt

# Database setup
createdb sim_development
npm run db:migrate

# Environment configuration
cp .env.example .env.local
```

**.env.local Configuration:**
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sim_development"

# Parlant Server
PARLANT_SERVER_URL="http://localhost:8001"
PARLANT_API_KEY="dev_api_key_here"

# Better Auth
BETTER_AUTH_SECRET="your-dev-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# Redis
REDIS_URL="redis://localhost:6379"

# OpenAI (for AI features)
OPENAI_API_KEY="your-openai-key"

# Development flags
NODE_ENV="development"
NEXT_PUBLIC_APP_ENV="development"
LOG_LEVEL="debug"
```

### Staging Environment

```bash
# Staging-specific configuration
NODE_ENV="staging"
DATABASE_URL="postgresql://user:password@staging-db:5432/sim_staging"
PARLANT_SERVER_URL="https://parlant-staging.yourdomain.com"
BETTER_AUTH_URL="https://staging.yourdomain.com"
REDIS_URL="redis://staging-redis:6379"

# Security
BETTER_AUTH_SECRET="staging-secret-key-32-chars-min"
JWT_SECRET="staging-jwt-secret"

# Monitoring
SENTRY_DSN="https://your-sentry-dsn@sentry.io"
LOG_LEVEL="info"

# Performance
ENABLE_CACHING="true"
CACHE_TTL="300"
```

### Production Environment

```bash
# Production configuration
NODE_ENV="production"
DATABASE_URL="postgresql://user:password@prod-db:5432/sim_production"
PARLANT_SERVER_URL="https://parlant.yourdomain.com"
BETTER_AUTH_URL="https://app.yourdomain.com"
REDIS_URL="redis://prod-redis:6379"

# Security (use strong secrets)
BETTER_AUTH_SECRET="production-secret-key-min-32-chars"
JWT_SECRET="production-jwt-secret-key"
ENCRYPTION_KEY="production-encryption-key"

# SSL/TLS
SSL_CERT_PATH="/etc/ssl/certs/yourdomain.crt"
SSL_KEY_PATH="/etc/ssl/private/yourdomain.key"

# Performance
ENABLE_CACHING="true"
CACHE_TTL="600"
MAX_CONCURRENT_REQUESTS="1000"
RATE_LIMIT_WINDOW="60000"
RATE_LIMIT_MAX="100"

# Monitoring
SENTRY_DSN="https://your-sentry-dsn@sentry.io"
LOG_LEVEL="warn"
METRICS_ENABLED="true"
HEALTH_CHECK_INTERVAL="30000"
```

## Production Deployment

### Docker Deployment

**Dockerfile:**
```dockerfile
# Frontend and API
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

**Docker Compose for Production:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/sim
      - REDIS_URL=redis://redis:6379
      - PARLANT_SERVER_URL=http://parlant:8001
    depends_on:
      - postgres
      - redis
      - parlant
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  parlant:
    build: ./packages/parlant-server
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/sim
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=sim
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - app
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### Kubernetes Deployment

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: parlant-chat-app
  labels:
    app: parlant-chat
spec:
  replicas: 3
  selector:
    matchLabels:
      app: parlant-chat
  template:
    metadata:
      labels:
        app: parlant-chat
    spec:
      containers:
      - name: app
        image: your-registry/parlant-chat:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: parlant-chat-service
spec:
  selector:
    app: parlant-chat
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: parlant-chat-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - chat.yourdomain.com
    secretName: parlant-chat-tls
  rules:
  - host: chat.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: parlant-chat-service
            port:
              number: 80
```

### Cloud Provider Deployments

#### AWS Deployment with ECS

```json
{
  "family": "parlant-chat",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "parlant-chat-app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/parlant-chat:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:ssm:region:account:parameter/parlant-chat/database-url"
        },
        {
          "name": "BETTER_AUTH_SECRET",
          "valueFrom": "arn:aws:ssm:region:account:parameter/parlant-chat/auth-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/parlant-chat",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### Google Cloud Run Deployment

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: parlant-chat
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/execution-environment: gen2
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/memory: "1Gi"
        run.googleapis.com/cpu: "1"
        run.googleapis.com/max-scale: "10"
        run.googleapis.com/min-scale: "1"
    spec:
      containerConcurrency: 100
      containers:
      - image: gcr.io/your-project/parlant-chat:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
        startupProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 0
          timeoutSeconds: 240
          periodSeconds: 240
          failureThreshold: 1
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 0
          timeoutSeconds: 1
          periodSeconds: 3
          failureThreshold: 3
```

## Configuration Management

### Environment-Specific Configurations

```typescript
// config/environments.ts
interface EnvironmentConfig {
  app: {
    name: string
    version: string
    environment: 'development' | 'staging' | 'production'
    port: number
  }
  database: {
    url: string
    pool: {
      min: number
      max: number
      idle: number
    }
    ssl: boolean
  }
  redis: {
    url: string
    keyPrefix: string
    ttl: number
  }
  parlant: {
    serverUrl: string
    apiKey: string
    timeout: number
  }
  auth: {
    secret: string
    expiresIn: string
    issuer: string
  }
  security: {
    cors: {
      origin: string[]
      credentials: boolean
    }
    rateLimit: {
      windowMs: number
      max: number
    }
    helmet: {
      enabled: boolean
      contentSecurityPolicy: boolean
    }
  }
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug'
    format: 'json' | 'combined'
    destination: 'console' | 'file' | 'elasticsearch'
  }
  monitoring: {
    enabled: boolean
    metricsEndpoint: string
    healthCheckInterval: number
  }
}

const configurations: Record<string, EnvironmentConfig> = {
  development: {
    app: {
      name: 'Parlant Chat',
      version: process.env.npm_package_version || '1.0.0',
      environment: 'development',
      port: 3000
    },
    database: {
      url: process.env.DATABASE_URL!,
      pool: { min: 2, max: 10, idle: 30000 },
      ssl: false
    },
    redis: {
      url: process.env.REDIS_URL!,
      keyPrefix: 'dev:chat:',
      ttl: 300
    },
    parlant: {
      serverUrl: process.env.PARLANT_SERVER_URL!,
      apiKey: process.env.PARLANT_API_KEY!,
      timeout: 30000
    },
    auth: {
      secret: process.env.BETTER_AUTH_SECRET!,
      expiresIn: '7d',
      issuer: 'sim-chat-dev'
    },
    security: {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true
      },
      rateLimit: {
        windowMs: 60000,
        max: 1000
      },
      helmet: {
        enabled: true,
        contentSecurityPolicy: false
      }
    },
    logging: {
      level: 'debug',
      format: 'combined',
      destination: 'console'
    },
    monitoring: {
      enabled: false,
      metricsEndpoint: '/metrics',
      healthCheckInterval: 30000
    }
  },

  production: {
    app: {
      name: 'Parlant Chat',
      version: process.env.npm_package_version || '1.0.0',
      environment: 'production',
      port: parseInt(process.env.PORT || '3000')
    },
    database: {
      url: process.env.DATABASE_URL!,
      pool: { min: 5, max: 50, idle: 10000 },
      ssl: true
    },
    redis: {
      url: process.env.REDIS_URL!,
      keyPrefix: 'prod:chat:',
      ttl: 600
    },
    parlant: {
      serverUrl: process.env.PARLANT_SERVER_URL!,
      apiKey: process.env.PARLANT_API_KEY!,
      timeout: 30000
    },
    auth: {
      secret: process.env.BETTER_AUTH_SECRET!,
      expiresIn: '24h',
      issuer: 'sim-chat'
    },
    security: {
      cors: {
        origin: [process.env.ALLOWED_ORIGINS!.split(',')].flat(),
        credentials: true
      },
      rateLimit: {
        windowMs: 60000,
        max: 100
      },
      helmet: {
        enabled: true,
        contentSecurityPolicy: true
      }
    },
    logging: {
      level: 'warn',
      format: 'json',
      destination: 'elasticsearch'
    },
    monitoring: {
      enabled: true,
      metricsEndpoint: '/metrics',
      healthCheckInterval: 30000
    }
  }
}

export const getConfig = (): EnvironmentConfig => {
  const env = process.env.NODE_ENV || 'development'
  const config = configurations[env]

  if (!config) {
    throw new Error(`Configuration for environment "${env}" not found`)
  }

  return config
}
```

### Database Migrations

```sql
-- migrations/001_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users and workspaces (existing)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parlant-specific tables
CREATE TABLE IF NOT EXISTS parlant_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  configuration JSONB NOT NULL DEFAULT '{}',
  guidelines JSONB NOT NULL DEFAULT '[]',
  tools JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parlant_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES parlant_agents(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active',
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS parlant_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES parlant_sessions(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  sender_type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_id UUID, -- Reference to existing workflow system
  agent_id UUID REFERENCES parlant_agents(id) ON DELETE CASCADE,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  auth_type VARCHAR(50) DEFAULT 'public',
  password_hash VARCHAR(255),
  allowed_emails JSONB DEFAULT '[]',
  customizations JSONB DEFAULT '{}',
  output_configs JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parlant_agents_workspace_id ON parlant_agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_parlant_sessions_agent_id ON parlant_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_parlant_sessions_workspace_id ON parlant_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_parlant_messages_session_id ON parlant_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_parlant_messages_created_at ON parlant_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_deployments_subdomain ON chat_deployments(subdomain);
CREATE INDEX IF NOT EXISTS idx_chat_deployments_workspace_id ON chat_deployments(workspace_id);

-- Full-text search for messages
CREATE INDEX IF NOT EXISTS idx_parlant_messages_content_gin
ON parlant_messages USING gin((content::text));
```

### Migration Script

```typescript
// scripts/migrate.ts
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

interface Migration {
  id: number
  name: string
  sql: string
}

class MigrationRunner {
  private pool: Pool

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
  }

  async getMigrations(): Promise<Migration[]> {
    const migrationsDir = path.join(__dirname, '../migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    return files.map((file, index) => ({
      id: index + 1,
      name: file.replace('.sql', ''),
      sql: fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    }))
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await this.pool.query('SELECT name FROM migrations ORDER BY id')
    return result.rows.map(row => row.name)
  }

  async executeMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Execute migration SQL
      await client.query(migration.sql)

      // Record migration as executed
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration.name]
      )

      await client.query('COMMIT')
      console.log(`✅ Executed migration: ${migration.name}`)
    } catch (error) {
      await client.query('ROLLBACK')
      console.error(`❌ Failed to execute migration ${migration.name}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  async run(): Promise<void> {
    await this.initialize()

    const allMigrations = await this.getMigrations()
    const executedMigrations = await this.getExecutedMigrations()

    const pendingMigrations = allMigrations.filter(
      migration => !executedMigrations.includes(migration.name)
    )

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations')
      return
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations`)

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration)
    }

    console.log('✅ All migrations completed successfully')
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

// Run migrations
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const runner = new MigrationRunner(databaseUrl)

  try {
    await runner.run()
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await runner.close()
  }
}

if (require.main === module) {
  main()
}
```

## Infrastructure Requirements

### Minimum System Requirements

**Development Environment:**
- CPU: 2 cores, 2.0 GHz
- RAM: 8 GB
- Storage: 20 GB SSD
- Network: Broadband internet

**Production Environment (Small):**
- CPU: 4 cores, 2.5 GHz
- RAM: 16 GB
- Storage: 100 GB SSD
- Network: 1 Gbps connection
- Load capacity: ~1,000 concurrent users

**Production Environment (Large):**
- CPU: 8+ cores, 3.0 GHz
- RAM: 32+ GB
- Storage: 500+ GB SSD
- Network: 10 Gbps connection
- Load capacity: ~10,000+ concurrent users

### Database Requirements

**PostgreSQL Configuration:**
```conf
# postgresql.conf
shared_buffers = 256MB              # 25% of RAM for small systems
effective_cache_size = 1GB          # 75% of RAM
work_mem = 4MB                      # For sorting operations
maintenance_work_mem = 64MB         # For maintenance operations
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Connection settings
max_connections = 200
shared_preload_libraries = 'pg_stat_statements'

# Logging
log_statement = 'all'              # For development
log_min_duration_statement = 1000  # Log slow queries
```

**Redis Configuration:**
```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
timeout 300
tcp-keepalive 60

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass your-redis-password
```

### Load Balancer Configuration

**Nginx Configuration:**
```nginx
upstream parlant_chat {
    server app1:3000 weight=1;
    server app2:3000 weight=1;
    server app3:3000 weight=1;

    keepalive 32;
}

upstream parlant_api {
    server parlant1:8001;
    server parlant2:8001;

    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name chat.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name chat.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=chat:10m rate=5r/s;

    # Main application
    location / {
        proxy_pass http://parlant_chat;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://parlant_chat;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Chat endpoints with different rate limiting
    location /api/chat/ {
        limit_req zone=chat burst=10 nodelay;

        proxy_pass http://parlant_chat;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Longer timeout for streaming
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Parlant API proxy
    location /parlant/ {
        rewrite ^/parlant/(.*) /$1 break;
        proxy_pass http://parlant_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets with caching
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;

        proxy_pass http://parlant_chat;
        proxy_cache_valid 200 1y;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://parlant_chat;
        proxy_read_timeout 10s;
    }
}
```

## Security Configuration

### Environment Secrets Management

**Using AWS Secrets Manager:**
```typescript
// config/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

class SecretsManager {
  private client: SecretsManagerClient
  private cache: Map<string, { value: any; expiry: number }> = new Map()

  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    })
  }

  async getSecret(secretName: string): Promise<any> {
    // Check cache first
    const cached = this.cache.get(secretName)
    if (cached && cached.expiry > Date.now()) {
      return cached.value
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName })
      const result = await this.client.send(command)

      const secret = JSON.parse(result.SecretString || '{}')

      // Cache for 5 minutes
      this.cache.set(secretName, {
        value: secret,
        expiry: Date.now() + 300000
      })

      return secret
    } catch (error) {
      console.error(`Failed to retrieve secret ${secretName}:`, error)
      throw error
    }
  }

  async getDatabaseCredentials(): Promise<{
    host: string
    port: number
    database: string
    username: string
    password: string
  }> {
    return this.getSecret('parlant-chat/database')
  }

  async getAuthSecrets(): Promise<{
    jwtSecret: string
    encryptionKey: string
    sessionSecret: string
  }> {
    return this.getSecret('parlant-chat/auth')
  }
}

export const secretsManager = new SecretsManager()
```

**Using HashiCorp Vault:**
```typescript
// config/vault.ts
import axios from 'axios'

class VaultClient {
  private baseUrl: string
  private token: string
  private cache: Map<string, { value: any; expiry: number }> = new Map()

  constructor() {
    this.baseUrl = process.env.VAULT_URL || 'https://vault.yourdomain.com'
    this.token = process.env.VAULT_TOKEN || ''
  }

  async authenticate(): Promise<void> {
    const response = await axios.post(`${this.baseUrl}/v1/auth/aws/login`, {
      role: process.env.VAULT_ROLE || 'parlant-chat'
    })

    this.token = response.data.auth.client_token
  }

  async getSecret(path: string): Promise<any> {
    const cached = this.cache.get(path)
    if (cached && cached.expiry > Date.now()) {
      return cached.value
    }

    const response = await axios.get(
      `${this.baseUrl}/v1/secret/data/${path}`,
      {
        headers: {
          'X-Vault-Token': this.token
        }
      }
    )

    const secret = response.data.data.data

    // Cache for 10 minutes
    this.cache.set(path, {
      value: secret,
      expiry: Date.now() + 600000
    })

    return secret
  }
}
```

### SSL/TLS Configuration

**Automated SSL with Certbot:**
```bash
#!/bin/bash
# scripts/setup-ssl.sh

# Install certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d chat.yourdomain.com -d api.yourdomain.com

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

# Test renewal
sudo certbot renew --dry-run
```

### Security Headers Configuration

```typescript
// middleware/security.ts
import helmet from 'helmet'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  )

  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.socket.io;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' wss: https:;
    media-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim()

  response.headers.set('Content-Security-Policy', cspHeader)

  return response
}
```

## Performance Tuning

### Caching Strategy

```typescript
// lib/cache.ts
import Redis from 'ioredis'
import { LRUCache } from 'lru-cache'

class CacheManager {
  private redis: Redis
  private localCache: LRUCache<string, any>

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!)
    this.localCache = new LRUCache({
      max: 1000,
      ttl: 300000 // 5 minutes
    })
  }

  async get(key: string): Promise<any> {
    // Try local cache first
    const localValue = this.localCache.get(key)
    if (localValue) {
      return localValue
    }

    // Fallback to Redis
    const redisValue = await this.redis.get(key)
    if (redisValue) {
      const parsed = JSON.parse(redisValue)
      this.localCache.set(key, parsed)
      return parsed
    }

    return null
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value)

    // Set in both caches
    this.localCache.set(key, value)

    if (ttl) {
      await this.redis.setex(key, ttl, serialized)
    } else {
      await this.redis.set(key, serialized)
    }
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear local cache
    this.localCache.clear()

    // Clear Redis keys
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}

export const cacheManager = new CacheManager()
```

### Database Optimization

```sql
-- Performance optimization queries
-- Monitor slow queries
SELECT
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;

-- Analyze table statistics
ANALYZE parlant_messages;
ANALYZE parlant_sessions;
ANALYZE parlant_agents;

-- Create additional indexes for common queries
CREATE INDEX CONCURRENTLY idx_messages_session_created
ON parlant_messages(session_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_sessions_active
ON parlant_sessions(workspace_id, status)
WHERE status = 'active';

-- Partition large tables by date
CREATE TABLE parlant_messages_y2024m01
PARTITION OF parlant_messages
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

This deployment and configuration guide provides comprehensive instructions for setting up, securing, and optimizing the Parlant React Chat Interface in various environments, from development to production scale deployments.