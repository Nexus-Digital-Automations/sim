# Administrative Deployment Guide - Hybrid Visual/Conversational Workflow Experience

## Overview

This comprehensive guide provides administrators with everything needed to deploy, configure, and manage the Hybrid Visual/Conversational Workflow Experience in production environments. The guide covers system requirements, installation procedures, configuration options, monitoring, security, and troubleshooting.

## Table of Contents

- [System Requirements](#system-requirements)
- [Pre-Installation Checklist](#pre-installation-checklist)
- [Installation Procedures](#installation-procedures)
- [Configuration Management](#configuration-management)
- [Security Configuration](#security-configuration)
- [Performance Tuning](#performance-tuning)
- [Monitoring and Analytics](#monitoring-and-analytics)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)
- [Maintenance Procedures](#maintenance-procedures)

---

## System Requirements

### Minimum System Requirements

#### Hardware Requirements
```yaml
CPU: 4 cores @ 2.4GHz (8 cores recommended)
RAM: 8GB (16GB recommended)
Storage: 50GB SSD available space
Network: 100Mbps internet connection
```

#### Software Requirements
```yaml
Operating System:
  - Ubuntu 20.04 LTS or later
  - CentOS 8 or later
  - Windows Server 2019 or later
  - macOS 11.0 or later (development only)

Node.js: 18.0 or later
Python: 3.8 or later
PostgreSQL: 14.0 or later
Redis: 6.0 or later
Docker: 20.10 or later (optional)
```

#### Browser Support (End Users)
```yaml
Desktop:
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+

Mobile (Limited Support):
  - Chrome Mobile 90+
  - Safari Mobile 14+
```

### Recommended Production Requirements

#### Hardware Requirements
```yaml
CPU: 8+ cores @ 3.0GHz
RAM: 32GB+
Storage: 200GB+ NVMe SSD
Network: 1Gbps connection with low latency
Load Balancer: External (nginx, HAProxy, or cloud provider)
```

#### Scalability Requirements
```yaml
Concurrent Users: 100+ per instance
Concurrent Workflows: 50+ executing simultaneously
Database Connections: 100+ connection pool
Socket.io Connections: 200+ concurrent
```

### Cloud Platform Support

#### AWS Requirements
```yaml
EC2 Instance: t3.large (minimum), m5.xlarge (recommended)
RDS: PostgreSQL 14.x (db.t3.medium minimum)
ElastiCache: Redis 6.x (cache.t3.micro minimum)
ALB: Application Load Balancer for multi-instance
S3: For file storage and backups
CloudWatch: For monitoring and logging
```

#### Google Cloud Requirements
```yaml
Compute Engine: n2-standard-4 (minimum), n2-standard-8 (recommended)
Cloud SQL: PostgreSQL 14 (db-standard-2 minimum)
Memorystore: Redis 6.x (basic tier minimum)
Cloud Load Balancing: HTTP(S) Load Balancer
Cloud Storage: For file storage and backups
Cloud Monitoring: For metrics and alerts
```

#### Azure Requirements
```yaml
Virtual Machine: Standard_D4s_v3 (minimum), Standard_D8s_v3 (recommended)
Azure Database: PostgreSQL 14 (General Purpose, 2 vCores minimum)
Azure Cache: Redis 6.x (Basic C1 minimum)
Application Gateway: For load balancing
Blob Storage: For file storage and backups
Azure Monitor: For monitoring and alerting
```

---

## Pre-Installation Checklist

### Infrastructure Preparation

#### Network Configuration
- [ ] Open required ports (3000, 3001, 3002, 5432, 6379, 8001)
- [ ] Configure SSL/TLS certificates
- [ ] Set up domain name and DNS records
- [ ] Configure firewall rules
- [ ] Verify internet connectivity for external API calls

#### Database Setup
- [ ] Install PostgreSQL 14 or later
- [ ] Create dedicated database user with appropriate permissions
- [ ] Configure connection pooling (recommended: pgbouncer)
- [ ] Set up database backups
- [ ] Verify database connectivity

#### Redis Setup
- [ ] Install Redis 6.0 or later
- [ ] Configure Redis persistence (AOF recommended)
- [ ] Set up Redis authentication
- [ ] Configure memory limits and eviction policies
- [ ] Verify Redis connectivity

### Application Preparation

#### Environment Setup
- [ ] Install Node.js 18+ and npm
- [ ] Install Python 3.8+ and pip
- [ ] Clone repository and verify access
- [ ] Prepare environment variable files
- [ ] Set up logging directories

#### Service Dependencies
- [ ] Verify Sim platform installation and functionality
- [ ] Install and configure Parlant server
- [ ] Set up Better Auth authentication
- [ ] Configure Socket.io server
- [ ] Test all service connectivity

---

## Installation Procedures

### Step 1: Base System Installation

#### 1.1 Install System Dependencies

**Ubuntu/Debian:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.8+
sudo apt install python3 python3-pip python3-venv -y

# Install PostgreSQL 14
sudo apt install postgresql-14 postgresql-client-14 -y

# Install Redis
sudo apt install redis-server -y

# Install additional tools
sudo apt install git curl build-essential -y
```

**CentOS/RHEL:**
```bash
# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs -y

# Install Python 3.8+
sudo yum install python3 python3-pip -y

# Install PostgreSQL 14
sudo yum install postgresql14-server postgresql14 -y
sudo /usr/pgsql-14/bin/postgresql-14-setup initdb
sudo systemctl enable postgresql-14
sudo systemctl start postgresql-14

# Install Redis
sudo yum install redis -y
sudo systemctl enable redis
sudo systemctl start redis
```

#### 1.2 Configure Services

**PostgreSQL Configuration:**
```bash
# Switch to postgres user
sudo -u postgres psql

-- Create database and user
CREATE DATABASE sim_hybrid_workflows;
CREATE USER sim_hybrid WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE sim_hybrid_workflows TO sim_hybrid;
ALTER USER sim_hybrid CREATEDB;
\q
```

**Redis Configuration:**
```bash
# Edit Redis configuration
sudo vi /etc/redis/redis.conf

# Key settings:
# maxmemory 1gb
# maxmemory-policy allkeys-lru
# save 900 1
# requirepass your_redis_password_here

# Restart Redis
sudo systemctl restart redis
```

### Step 2: Application Installation

#### 2.1 Clone and Setup Repository

```bash
# Clone the repository
git clone https://github.com/your-org/sim-platform.git
cd sim-platform

# Install Node.js dependencies
npm install

# Install Python dependencies for Parlant server
cd packages/parlant-server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..
```

#### 2.2 Environment Configuration

Create environment files for each component:

**Main Application (.env):**
```env
# Database Configuration
DATABASE_URL=postgresql://sim_hybrid:secure_password_here@localhost:5432/sim_hybrid_workflows
POSTGRES_DB=sim_hybrid_workflows
POSTGRES_USER=sim_hybrid
POSTGRES_PASSWORD=secure_password_here
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# Authentication
BETTER_AUTH_SECRET=your_very_secure_secret_key_here
BETTER_AUTH_TRUSTED_ORIGINS=https://your-domain.com
JWT_SECRET=another_secure_secret_for_jwt

# Parlant Integration
PARLANT_SERVER_URL=http://localhost:8001
PARLANT_API_KEY=your_parlant_api_key_here

# Application Configuration
NODE_ENV=production
PORT=3000
SOCKET_IO_PORT=3002
HOST=0.0.0.0

# Feature Flags
ENABLE_HYBRID_WORKFLOWS=true
ENABLE_CONVERSATIONAL_MODE=true
ENABLE_DEBUG_LOGGING=false

# Performance Configuration
MAX_CONCURRENT_WORKFLOWS=50
MAX_CONVERSATION_HISTORY=100
SESSION_TIMEOUT_MS=3600000
CACHE_TTL_SECONDS=300

# External Services
WEBHOOK_SECRET=your_webhook_secret_here
API_RATE_LIMIT_PER_MINUTE=60

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info
```

**Parlant Server (.env.parlant):**
```env
# Database Configuration
DATABASE_URL=postgresql://sim_hybrid:secure_password_here@localhost:5432/sim_hybrid_workflows

# Server Configuration
PARLANT_HOST=0.0.0.0
PARLANT_PORT=8001
PARLANT_DEBUG=false

# API Configuration
API_KEY=your_parlant_api_key_here
CORS_ORIGINS=https://your-domain.com,http://localhost:3000

# AI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
MAX_TOKENS=2000
TEMPERATURE=0.7

# Performance
MAX_CONCURRENT_SESSIONS=100
SESSION_TIMEOUT_SECONDS=3600
```

#### 2.3 Database Migration

```bash
# Run database migrations
npm run db:migrate

# Verify migration success
npm run db:status

# Seed initial data (optional)
npm run db:seed
```

### Step 3: Service Configuration

#### 3.1 Systemd Service Files

**Main Application Service (/etc/systemd/system/sim-hybrid.service):**
```ini
[Unit]
Description=Sim Hybrid Workflow Application
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=sim-app
WorkingDirectory=/opt/sim-platform
Environment=NODE_ENV=production
EnvironmentFile=/opt/sim-platform/.env
ExecStart=/usr/bin/node apps/sim/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=sim-hybrid

# Resource limits
LimitNOFILE=65536
LimitNPROC=32768

[Install]
WantedBy=multi-user.target
```

**Parlant Server Service (/etc/systemd/system/parlant-server.service):**
```ini
[Unit]
Description=Parlant AI Server
After=network.target postgresql.service

[Service]
Type=simple
User=sim-app
WorkingDirectory=/opt/sim-platform/packages/parlant-server
Environment=PYTHONPATH=/opt/sim-platform/packages/parlant-server
EnvironmentFile=/opt/sim-platform/.env.parlant
ExecStart=/opt/sim-platform/packages/parlant-server/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=parlant-server

[Install]
WantedBy=multi-user.target
```

#### 3.2 Enable and Start Services

```bash
# Create application user
sudo useradd -r -s /bin/false sim-app
sudo chown -R sim-app:sim-app /opt/sim-platform

# Enable services
sudo systemctl daemon-reload
sudo systemctl enable sim-hybrid
sudo systemctl enable parlant-server

# Start services
sudo systemctl start sim-hybrid
sudo systemctl start parlant-server

# Verify services are running
sudo systemctl status sim-hybrid
sudo systemctl status parlant-server
```

### Step 4: Web Server Configuration

#### 4.1 Nginx Configuration

**Main Configuration (/etc/nginx/sites-available/sim-hybrid):**
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=socket:10m rate=30r/s;

# Upstream servers
upstream sim_app {
    least_conn;
    server localhost:3000 max_fails=3 fail_timeout=30s;
    # Add more servers for load balancing
    # server localhost:3001 max_fails=3 fail_timeout=30s;
}

upstream parlant_server {
    least_conn;
    server localhost:8001 max_fails=3 fail_timeout=30s;
}

upstream socket_server {
    least_conn;
    server localhost:3002 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

    # Main application
    location / {
        proxy_pass http://sim_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://sim_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # API-specific timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 120s;
    }

    # Socket.io
    location /socket.io/ {
        limit_req zone=socket burst=50 nodelay;

        proxy_pass http://socket_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Parlant server
    location /parlant/ {
        proxy_pass http://parlant_server/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /opt/sim-platform/public/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health checks
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

#### 4.2 Enable Nginx Configuration

```bash
# Test configuration
sudo nginx -t

# Enable site
sudo ln -s /etc/nginx/sites-available/sim-hybrid /etc/nginx/sites-enabled/

# Reload Nginx
sudo systemctl reload nginx
```

---

## Configuration Management

### Environment-Specific Configuration

#### Development Configuration
```yaml
Features:
  debug_mode: true
  hot_reload: true
  detailed_logging: true
  development_tools: true

Performance:
  max_concurrent_sessions: 10
  cache_ttl: 60
  session_timeout: 1800000

Security:
  cors_strict: false
  rate_limiting: disabled
  https_required: false
```

#### Staging Configuration
```yaml
Features:
  debug_mode: true
  hot_reload: false
  detailed_logging: true
  development_tools: false

Performance:
  max_concurrent_sessions: 25
  cache_ttl: 300
  session_timeout: 3600000

Security:
  cors_strict: true
  rate_limiting: lenient
  https_required: true
```

#### Production Configuration
```yaml
Features:
  debug_mode: false
  hot_reload: false
  detailed_logging: false
  development_tools: false

Performance:
  max_concurrent_sessions: 100
  cache_ttl: 600
  session_timeout: 3600000

Security:
  cors_strict: true
  rate_limiting: strict
  https_required: true
```

### Configuration Templates

#### Docker Configuration (docker-compose.yml)
```yaml
version: '3.8'

services:
  sim-hybrid:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
      - "3002:3002"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
      - parlant-server
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  parlant-server:
    build:
      context: ./packages/parlant-server
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    env_file:
      - .env.parlant
    depends_on:
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=sim_hybrid_workflows
      - POSTGRES_USER=sim_hybrid
      - POSTGRES_PASSWORD=secure_password_here
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sim_hybrid"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:6-alpine
    command: redis-server --requirepass your_redis_password_here
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:
```

### Advanced Configuration Options

#### Feature Toggles
```typescript
interface FeatureConfig {
  enableHybridMode: boolean          // Enable/disable hybrid workflows
  enableConversationalMode: boolean  // Enable/disable chat interface
  enableAdvancedNLP: boolean         // Enable advanced language processing
  enableWorkflowAnalytics: boolean   // Enable workflow performance analytics
  enableMultiAgentSupport: boolean   // Enable multi-agent conversations
  enableVoiceCommands: boolean       // Enable voice command recognition
  enableWorkflowTemplates: boolean   // Enable workflow template system
  enableRealTimeCollaboration: boolean // Enable multi-user collaboration
}
```

#### Performance Configuration
```typescript
interface PerformanceConfig {
  maxConcurrentSessions: number      // Maximum simultaneous chat sessions
  maxWorkflowsPerUser: number        // Workflow limit per user
  sessionTimeoutMs: number           // Chat session timeout
  cacheConfiguration: {
    ttl: number                      // Cache time-to-live in seconds
    maxSize: number                  // Maximum cache size in MB
    compressionEnabled: boolean      // Enable cache compression
  }
  rateLimiting: {
    apiRequestsPerMinute: number     // API rate limit
    socketConnectionsPerIP: number   // Socket.io connection limit
    commandsPerSession: number       // Commands per chat session
  }
}
```

---

## Security Configuration

### Authentication and Authorization

#### Better Auth Configuration
```typescript
// auth.config.ts
export const authConfig = {
  database: process.env.DATABASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.BETTER_AUTH_TRUSTED_ORIGINS],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: true,
  },
  user: {
    deleteUser: {
      enabled: true,
      sendEmail: true,
    },
    changeEmail: {
      enabled: true,
      sendEmailVerification: true,
    },
    changePassword: {
      enabled: true,
      sendEmail: true,
    },
  },
  emailVerification: {
    enabled: true,
    autoSignIn: true,
    expiresIn: 60 * 60 * 2, // 2 hours
  },
  socialProviders: {
    github: {
      enabled: process.env.ENABLE_GITHUB_AUTH === 'true',
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
    google: {
      enabled: process.env.ENABLE_GOOGLE_AUTH === 'true',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
}
```

#### Role-Based Access Control
```sql
-- Create roles and permissions
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  workspace_id UUID REFERENCES workspaces(id),
  role VARCHAR(50) NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id)
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  granted BOOLEAN DEFAULT true
);

-- Insert default permissions
INSERT INTO role_permissions (role, resource, action) VALUES
('admin', 'workflows', 'create'),
('admin', 'workflows', 'read'),
('admin', 'workflows', 'update'),
('admin', 'workflows', 'delete'),
('admin', 'workflows', 'execute'),
('admin', 'chat_sessions', 'create'),
('admin', 'chat_sessions', 'read'),
('admin', 'chat_sessions', 'delete'),
('admin', 'system', 'configure'),

('editor', 'workflows', 'create'),
('editor', 'workflows', 'read'),
('editor', 'workflows', 'update'),
('editor', 'workflows', 'execute'),
('editor', 'chat_sessions', 'create'),
('editor', 'chat_sessions', 'read'),

('viewer', 'workflows', 'read'),
('viewer', 'workflows', 'execute'),
('viewer', 'chat_sessions', 'create'),
('viewer', 'chat_sessions', 'read');
```

### Input Validation and Sanitization

#### API Input Validation
```typescript
import { z } from 'zod'

// Conversation input validation
export const conversationInputSchema = z.object({
  sessionId: z.string().uuid(),
  workflowId: z.string().uuid(),
  naturalLanguageInput: z.string()
    .min(1, 'Input cannot be empty')
    .max(1000, 'Input too long')
    .refine(
      (input) => !containsMaliciousPatterns(input),
      'Input contains invalid content'
    ),
  context: z.record(z.any()).optional(),
})

// Workflow configuration validation
export const workflowConfigSchema = z.object({
  conversationalConfig: z.object({
    personalityProfile: z.enum(['helpful-assistant', 'professional', 'casual']),
    communicationStyle: z.enum(['formal', 'casual', 'technical', 'friendly']),
    verbosityLevel: z.enum(['minimal', 'normal', 'detailed', 'verbose']),
    showProgress: z.boolean(),
    explainSteps: z.boolean(),
    askForConfirmation: z.boolean(),
  }).optional(),
  executionConfig: z.object({
    mode: z.enum(['step-by-step', 'autonomous', 'hybrid']),
    timeoutMs: z.number().min(1000).max(3600000),
    autoApproval: z.boolean(),
  }).optional(),
})

function containsMaliciousPatterns(input: string): boolean {
  const maliciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ]

  return maliciousPatterns.some(pattern => pattern.test(input))
}
```

### Network Security

#### SSL/TLS Configuration
```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# HSTS
add_header Strict-Transport-Security "max-age=63072000" always;
```

#### Firewall Configuration
```bash
# UFW configuration for Ubuntu
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow application ports (restrict to specific IPs in production)
sudo ufw allow from 10.0.0.0/8 to any port 3000
sudo ufw allow from 10.0.0.0/8 to any port 3002
sudo ufw allow from 10.0.0.0/8 to any port 8001

# Database and Redis (restrict to application servers only)
sudo ufw allow from 10.0.1.0/24 to any port 5432
sudo ufw allow from 10.0.1.0/24 to any port 6379

# Enable firewall
sudo ufw enable
```

---

## Performance Tuning

### Database Optimization

#### PostgreSQL Configuration
```postgresql
-- postgresql.conf optimization for hybrid workflows

# Memory settings
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9

# Connection settings
max_connections = 200
shared_preload_libraries = 'pg_stat_statements'

# Logging
log_statement = 'none'
log_min_duration_statement = 1000
log_checkpoints = on
log_lock_waits = on

# Performance monitoring
track_activities = on
track_counts = on
track_io_timing = on
track_functions = pl
```

#### Database Indexes
```sql
-- Optimized indexes for hybrid workflow queries

-- Conversational workflow sessions
CREATE INDEX CONCURRENTLY idx_conv_sessions_user_workspace
ON conversational_workflow_sessions(user_id, workspace_id);

CREATE INDEX CONCURRENTLY idx_conv_sessions_workflow_active
ON conversational_workflow_sessions(workflow_id)
WHERE expires_at > NOW();

CREATE INDEX CONCURRENTLY idx_conv_sessions_state_gin
ON conversational_workflow_sessions
USING gin(state);

-- Conversation history
CREATE INDEX CONCURRENTLY idx_conversation_turns_session_created
ON conversation_turns(session_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_conversation_turns_search
ON conversation_turns
USING gin(to_tsvector('english', user_input || ' ' || agent_response));

-- Workflow execution performance
CREATE INDEX CONCURRENTLY idx_workflow_executions_status_created
ON workflow_executions(status, created_at);

CREATE INDEX CONCURRENTLY idx_workflow_nodes_workflow_position
ON workflow_nodes(workflow_id, position_x, position_y);

-- Performance metrics
CREATE INDEX CONCURRENTLY idx_session_metrics_name_time
ON session_metrics(metric_name, recorded_at DESC);
```

### Application Performance

#### Node.js Optimization
```javascript
// app.js performance configuration
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  // Fork workers equal to CPU cores
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Worker processes
  const app = require('./server');

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received');
    app.close(() => {
      console.log('Process terminated');
    });
  });
}
```

#### Connection Pooling
```typescript
// database/pool.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  min: 5,                    // Minimum connections
  max: 50,                   // Maximum connections
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Wait 2s for connection
  statement_timeout: 30000,  // Query timeout
});

// Redis connection pooling
import Redis from 'ioredis';

const redis = new Redis.Cluster([
  { port: 6379, host: '127.0.0.1' }
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
  },
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
});
```

### Caching Strategy

#### Multi-Level Caching
```typescript
// cache/manager.ts
interface CacheConfig {
  levels: {
    memory: {
      ttl: number;
      maxSize: number;
    };
    redis: {
      ttl: number;
      cluster: boolean;
    };
    database: {
      materializedViews: boolean;
    };
  };
}

class CacheManager {
  private memoryCache = new Map();
  private redis: Redis;

  async get(key: string): Promise<any> {
    // Level 1: Memory cache
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // Level 2: Redis cache
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      const parsed = JSON.parse(redisValue);
      this.memoryCache.set(key, parsed);
      return parsed;
    }

    return null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    // Store in both levels
    this.memoryCache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

### Load Balancing

#### HAProxy Configuration
```haproxy
# /etc/haproxy/haproxy.cfg
global
    daemon
    user haproxy
    group haproxy
    log 127.0.0.1:514 local0

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog

# Frontend
frontend sim_frontend
    bind *:80
    bind *:443 ssl crt /path/to/certificate.pem
    redirect scheme https if !{ ssl_fc }

    # Route based on path
    use_backend sim_app if { path_beg /api/ }
    use_backend socket_backend if { path_beg /socket.io/ }
    use_backend parlant_backend if { path_beg /parlant/ }
    default_backend sim_app

# Backends
backend sim_app
    balance roundrobin
    option httpchk GET /health
    server app1 10.0.1.10:3000 check
    server app2 10.0.1.11:3000 check
    server app3 10.0.1.12:3000 check

backend socket_backend
    balance source
    option httpchk GET /health
    server socket1 10.0.1.10:3002 check
    server socket2 10.0.1.11:3002 check

backend parlant_backend
    balance roundrobin
    option httpchk GET /health
    server parlant1 10.0.1.20:8001 check
    server parlant2 10.0.1.21:8001 check

# Stats interface
listen stats
    bind *:8080
    stats enable
    stats uri /stats
    stats refresh 30s
```

---

## Monitoring and Analytics

### System Monitoring

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'sim-hybrid'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 5s
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['localhost:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "alerts.yml"
```

#### Custom Metrics Collection
```typescript
// monitoring/metrics.ts
import client from 'prom-client';

// Create custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 500]
});

const conversationalSessionsActive = new client.Gauge({
  name: 'conversational_sessions_active',
  help: 'Number of active conversational sessions'
});

const workflowExecutionsTotal = new client.Counter({
  name: 'workflow_executions_total',
  help: 'Total number of workflow executions',
  labelNames: ['status', 'mode']
});

const nlpProcessingDuration = new client.Histogram({
  name: 'nlp_processing_duration_ms',
  help: 'Duration of NLP processing in ms',
  buckets: [10, 50, 100, 250, 500, 1000]
});

export {
  httpRequestDuration,
  conversationalSessionsActive,
  workflowExecutionsTotal,
  nlpProcessingDuration
};
```

#### Alert Rules
```yaml
# alerts.yml
groups:
  - name: sim-hybrid-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} requests per second"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High database connection usage"
          description: "Database has {{ $value }} active connections"

      - alert: ConversationalSessionsStuck
        expr: increase(conversational_sessions_active[10m]) == 0 and conversational_sessions_active > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Conversational sessions may be stuck"
          description: "{{ $value }} sessions have not changed in 10 minutes"

      - alert: NLPProcessingTimeHigh
        expr: histogram_quantile(0.95, rate(nlp_processing_duration_ms_bucket[5m])) > 2000
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "NLP processing time is high"
          description: "95th percentile processing time is {{ $value }}ms"
```

### Application Logging

#### Structured Logging Configuration
```typescript
// logging/logger.ts
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'sim-hybrid',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    }),
    // Elasticsearch for production
    ...(process.env.NODE_ENV === 'production' ? [
      new ElasticsearchTransport({
        level: 'info',
        clientOpts: {
          node: process.env.ELASTICSEARCH_URL,
        },
        index: 'sim-hybrid-logs'
      })
    ] : [])
  ]
});

export default logger;
```

### Analytics Dashboard

#### Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "Sim Hybrid Workflows",
    "panels": [
      {
        "title": "Active Sessions",
        "type": "stat",
        "targets": [
          {
            "expr": "conversational_sessions_active",
            "legendFormat": "Active Sessions"
          }
        ]
      },
      {
        "title": "Workflow Execution Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(workflow_executions_total[5m])",
            "legendFormat": "Executions/sec"
          }
        ]
      },
      {
        "title": "NLP Processing Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(nlp_processing_duration_ms_bucket[5m]))",
            "legendFormat": "50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, rate(nlp_processing_duration_ms_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          },
          {
            "expr": "rate(http_requests_total{status=~\"4..\"}[5m])",
            "legendFormat": "4xx errors"
          }
        ]
      }
    ]
  }
}
```

---

## Backup and Recovery

### Database Backup Strategy

#### Automated Backup Script
```bash
#!/bin/bash
# backup-database.sh

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="sim_hybrid_workflows"
DB_USER="sim_hybrid"
BACKUP_DIR="/opt/backups/postgresql"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/sim_hybrid_${TIMESTAMP}.sql"
BACKUP_FILE_COMPRESSED="$BACKUP_FILE.gz"

# Perform backup
echo "Starting backup at $(date)"
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d $DB_NAME \
  --verbose \
  --no-password \
  --format=custom \
  --compress=9 \
  --file=$BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Verify backup
if [ -f "$BACKUP_FILE_COMPRESSED" ]; then
  echo "Backup completed: $BACKUP_FILE_COMPRESSED"
  echo "Backup size: $(du -h $BACKUP_FILE_COMPRESSED | cut -f1)"
else
  echo "ERROR: Backup failed!"
  exit 1
fi

# Clean up old backups
find $BACKUP_DIR -name "sim_hybrid_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than $RETENTION_DAYS days"

# Test backup integrity (weekly)
if [ $(date +%u) -eq 1 ]; then
  echo "Testing backup integrity..."
  gunzip -c $BACKUP_FILE_COMPRESSED | head -20 | grep -q "PostgreSQL database dump"
  if [ $? -eq 0 ]; then
    echo "Backup integrity check passed"
  else
    echo "WARNING: Backup integrity check failed"
  fi
fi
```

#### Continuous WAL Archiving
```postgresql
-- postgresql.conf for WAL archiving
wal_level = replica
archive_mode = on
archive_command = 'cp %p /opt/backups/wal/%f'
max_wal_senders = 3
wal_keep_segments = 32
```

### Application State Backup

#### Redis Backup Script
```bash
#!/bin/bash
# backup-redis.sh

REDIS_HOST="localhost"
REDIS_PORT="6379"
BACKUP_DIR="/opt/backups/redis"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p $BACKUP_DIR

# Create Redis backup
redis-cli -h $REDIS_HOST -p $REDIS_PORT BGSAVE

# Wait for backup to complete
while [ $(redis-cli -h $REDIS_HOST -p $REDIS_PORT LASTSAVE) -eq $LAST_SAVE ]; do
  sleep 1
done

# Copy RDB file
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_${TIMESTAMP}.rdb

echo "Redis backup completed: $BACKUP_DIR/redis_${TIMESTAMP}.rdb"
```

#### File System Backup
```bash
#!/bin/bash
# backup-files.sh

SOURCE_DIRS=(
  "/opt/sim-platform/logs"
  "/opt/sim-platform/uploads"
  "/opt/sim-platform/config"
)

BACKUP_DIR="/opt/backups/files"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="files_${TIMESTAMP}.tar.gz"

mkdir -p $BACKUP_DIR

# Create compressed archive
tar -czf "$BACKUP_DIR/$BACKUP_NAME" "${SOURCE_DIRS[@]}"

echo "File backup completed: $BACKUP_DIR/$BACKUP_NAME"
```

### Disaster Recovery Plan

#### Recovery Procedures

**Complete System Recovery:**
```bash
#!/bin/bash
# disaster-recovery.sh

echo "Starting disaster recovery process..."

# 1. Install base system
echo "Ensure base system is installed and configured"

# 2. Restore database
echo "Restoring database from backup..."
LATEST_DB_BACKUP=$(ls -t /opt/backups/postgresql/sim_hybrid_*.sql.gz | head -n1)
gunzip -c $LATEST_DB_BACKUP | pg_restore -d sim_hybrid_workflows

# 3. Restore Redis data
echo "Restoring Redis data..."
LATEST_REDIS_BACKUP=$(ls -t /opt/backups/redis/redis_*.rdb | head -n1)
cp $LATEST_REDIS_BACKUP /var/lib/redis/dump.rdb
systemctl restart redis

# 4. Restore application files
echo "Restoring application files..."
LATEST_FILE_BACKUP=$(ls -t /opt/backups/files/files_*.tar.gz | head -n1)
tar -xzf $LATEST_FILE_BACKUP -C /

# 5. Start services
echo "Starting services..."
systemctl start sim-hybrid
systemctl start parlant-server

# 6. Verify system health
echo "Verifying system health..."
curl -f http://localhost:3000/health
curl -f http://localhost:8001/health

echo "Disaster recovery completed"
```

#### RTO and RPO Targets

```yaml
Recovery Objectives:
  RTO (Recovery Time Objective): 4 hours
  RPO (Recovery Point Objective): 1 hour

Backup Schedule:
  Database: Every 4 hours
  Redis: Every 1 hour
  Files: Daily
  WAL Archive: Continuous

Testing Schedule:
  Backup Restoration: Monthly
  Full DR Drill: Quarterly
  Documentation Review: Quarterly
```

---

*This administrative deployment guide provides comprehensive instructions for deploying, configuring, and managing the Hybrid Visual/Conversational Workflow Experience in production environments. For technical implementation details, refer to the Technical API Documentation. For user guidance, see the User Guide documentation.*