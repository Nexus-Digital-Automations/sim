# Deployment and Operations Guide

## Overview

This guide provides comprehensive instructions for deploying, configuring, and operating the Sim-Parlant Integration Bridge in development, staging, and production environments.

## Prerequisites

### System Requirements

#### Minimum Requirements (Development)
- **CPU**: 2 vCPUs
- **Memory**: 4GB RAM
- **Storage**: 20GB SSD
- **Network**: 100 Mbps

#### Recommended Requirements (Production)
- **CPU**: 4+ vCPUs
- **Memory**: 8+ GB RAM
- **Storage**: 100+ GB SSD with backup
- **Network**: 1 Gbps with redundancy

### Software Dependencies

#### Core Dependencies
- **Python 3.11+**: Required for FastAPI server
- **Node.js 18+**: Required for monitoring and tooling
- **PostgreSQL 14+**: Shared database with Sim
- **Redis 6+**: Optional caching layer

#### Python Packages
```bash
# Core FastAPI dependencies
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.4.2

# Database
asyncpg==0.29.0
sqlalchemy==2.0.23

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# HTTP Client
httpx==0.25.2

# Monitoring
prometheus-client==0.19.0
```

#### Node.js Packages
```json
{
  "dependencies": {
    "dotenv": "^16.3.1",
    "winston": "^3.11.0",
    "axios": "^1.6.0"
  }
}
```

## Environment Configuration

### Environment Variables

Create a `.env` file for each environment:

#### Development Environment
```bash
# Server Configuration
NODE_ENV=development
HOST=0.0.0.0
PORT=8001
LOG_LEVEL=DEBUG

# Database Configuration
DATABASE_URL=postgresql://sim_user:sim_password@localhost:5432/sim_dev
DATABASE_SSL_MODE=prefer
DATABASE_POOL_SIZE=10
DATABASE_POOL_MAX_OVERFLOW=20

# Authentication Configuration
JWT_SECRET_KEY=your-development-secret-key-change-in-production
JWT_ALGORITHM=HS256
SESSION_TIMEOUT=3600
AUTH_CACHE_TTL=300

# Sim Integration
SIM_BASE_URL=http://localhost:3000
SIM_API_KEY=dev-api-key
SIM_WEBHOOK_SECRET=dev-webhook-secret

# CORS Configuration
CORS_ORIGINS=["http://localhost:3000", "http://localhost:3001"]
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_BURST=200

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/dev/webhook

# Feature Flags
ENABLE_WORKSPACE_ISOLATION=true
ENABLE_AUDIT_LOGGING=true
ENABLE_CACHING=true
```

#### Production Environment
```bash
# Server Configuration
NODE_ENV=production
HOST=0.0.0.0
PORT=8001
LOG_LEVEL=INFO

# Database Configuration (Use connection pooling service)
DATABASE_URL=postgresql://sim_user:secure_password@db.sim.com:5432/sim_production?sslmode=require
DATABASE_SSL_MODE=require
DATABASE_POOL_SIZE=20
DATABASE_POOL_MAX_OVERFLOW=50
DATABASE_CONNECTION_TIMEOUT=30

# Authentication Configuration (Use secrets manager)
JWT_SECRET_KEY=${SECRETS_MANAGER:jwt_secret_key}
JWT_ALGORITHM=HS256
SESSION_TIMEOUT=3600
AUTH_CACHE_TTL=300

# Sim Integration
SIM_BASE_URL=https://api.sim.com
SIM_API_KEY=${SECRETS_MANAGER:sim_api_key}
SIM_WEBHOOK_SECRET=${SECRETS_MANAGER:sim_webhook_secret}

# CORS Configuration
CORS_ORIGINS=["https://app.sim.com", "https://admin.sim.com"]
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_PER_MINUTE=1000
RATE_LIMIT_BURST=2000

# Monitoring
METRICS_ENABLED=true
PROMETHEUS_PORT=9090
HEALTH_CHECK_INTERVAL=10
ALERT_WEBHOOK_URL=${SECRETS_MANAGER:alert_webhook_url}

# Security
ENABLE_SECURITY_HEADERS=true
ENABLE_REQUEST_VALIDATION=true
ENABLE_SQL_INJECTION_PROTECTION=true

# Performance
ENABLE_RESPONSE_COMPRESSION=true
ENABLE_HTTP_CACHING=true
CACHE_MAX_SIZE=1000
```

### Secrets Management

#### AWS Secrets Manager Integration
```python
import boto3
import json
from botocore.exceptions import ClientError

class SecretsManager:
    def __init__(self, region_name='us-east-1'):
        self.client = boto3.client('secretsmanager', region_name=region_name)

    def get_secret(self, secret_name: str) -> dict:
        """Retrieve secret from AWS Secrets Manager."""
        try:
            response = self.client.get_secret_value(SecretId=secret_name)
            return json.loads(response['SecretString'])
        except ClientError as e:
            logger.error(f"Failed to retrieve secret {secret_name}: {e}")
            raise

    def get_database_url(self) -> str:
        """Get database connection URL from secrets."""
        db_secrets = self.get_secret('parlant/database')
        return (
            f"postgresql://{db_secrets['username']}:"
            f"{db_secrets['password']}@{db_secrets['host']}:"
            f"{db_secrets['port']}/{db_secrets['dbname']}?sslmode=require"
        )
```

## Deployment Methods

### Option 1: Docker Deployment (Recommended)

#### Dockerfile
```dockerfile
# Multi-stage build for efficiency
FROM python:3.11-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create and set work directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim as production

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home --shell /bin/bash app

# Set work directory and copy built dependencies
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Copy application code
COPY . .

# Set ownership and permissions
RUN chown -R app:app /app
USER app

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Start server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

#### Docker Compose (Development)
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  parlant-server:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "8001:8001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://sim_user:sim_password@db:5432/sim_dev
      - SIM_BASE_URL=http://sim-backend:3000
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db
      - redis
    networks:
      - sim-network

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: sim_dev
      POSTGRES_USER: sim_user
      POSTGRES_PASSWORD: sim_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - sim-network

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    networks:
      - sim-network

volumes:
  postgres_data:

networks:
  sim-network:
    external: true
```

#### Docker Compose (Production)
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  parlant-server:
    image: sim/parlant-server:latest
    restart: unless-stopped
    ports:
      - "8001:8001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SIM_BASE_URL=${SIM_BASE_URL}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    volumes:
      - /var/log/parlant:/app/logs
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - sim-production

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    depends_on:
      - parlant-server
    networks:
      - sim-production

networks:
  sim-production:
    external: true
```

### Option 2: Direct Deployment

#### Installation Script
```bash
#!/bin/bash
# install.sh - Installation script for Parlant Integration Bridge

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Installing Sim-Parlant Integration Bridge${NC}"

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."

    # Check Python version
    if ! command -v python3.11 &> /dev/null; then
        echo -e "${RED}Python 3.11+ is required${NC}"
        exit 1
    fi

    # Check PostgreSQL connection
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}PostgreSQL client is required${NC}"
        exit 1
    fi

    echo -e "${GREEN}Prerequisites check passed${NC}"
}

# Create application user
create_user() {
    if ! id "parlant" &>/dev/null; then
        echo "Creating parlant user..."
        sudo useradd --system --home /opt/parlant --shell /bin/bash parlant
        sudo mkdir -p /opt/parlant
        sudo chown parlant:parlant /opt/parlant
    fi
}

# Install Python dependencies
install_dependencies() {
    echo "Installing Python dependencies..."
    cd /opt/parlant
    sudo -u parlant python3.11 -m venv venv
    sudo -u parlant ./venv/bin/pip install --upgrade pip
    sudo -u parlant ./venv/bin/pip install -r requirements.txt
}

# Setup configuration
setup_config() {
    echo "Setting up configuration..."
    if [ ! -f /opt/parlant/.env ]; then
        sudo cp .env.example /opt/parlant/.env
        sudo chown parlant:parlant /opt/parlant/.env
        echo -e "${YELLOW}Please edit /opt/parlant/.env with your configuration${NC}"
    fi
}

# Setup systemd service
setup_service() {
    echo "Setting up systemd service..."
    sudo tee /etc/systemd/system/parlant-server.service > /dev/null <<EOF
[Unit]
Description=Parlant Integration Bridge Server
After=network.target postgresql.service

[Service]
Type=exec
User=parlant
Group=parlant
WorkingDirectory=/opt/parlant
Environment=PATH=/opt/parlant/venv/bin
ExecStart=/opt/parlant/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/parlant

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable parlant-server
}

# Setup log rotation
setup_logging() {
    echo "Setting up log rotation..."
    sudo tee /etc/logrotate.d/parlant > /dev/null <<EOF
/var/log/parlant/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    postrotate
        systemctl reload parlant-server
    endscript
}
EOF
}

# Main installation
main() {
    check_prerequisites
    create_user
    install_dependencies
    setup_config
    setup_service
    setup_logging

    echo -e "${GREEN}Installation completed successfully!${NC}"
    echo -e "${YELLOW}Please:${NC}"
    echo "1. Edit /opt/parlant/.env with your configuration"
    echo "2. Run database migrations"
    echo "3. Start the service: sudo systemctl start parlant-server"
}

main "$@"
```

### Option 3: Kubernetes Deployment

#### Deployment Manifest
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: parlant-server
  namespace: sim
  labels:
    app: parlant-server
    version: v1.0.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: parlant-server
  template:
    metadata:
      labels:
        app: parlant-server
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
      - name: parlant-server
        image: sim/parlant-server:v1.0.0
        ports:
        - containerPort: 8001
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: parlant-secrets
              key: database-url
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: parlant-secrets
              key: jwt-secret
        - name: SIM_API_KEY
          valueFrom:
            secretKeyRef:
              name: parlant-secrets
              key: sim-api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /app/.env
          subPath: .env
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: parlant-config

---
apiVersion: v1
kind: Service
metadata:
  name: parlant-server-service
  namespace: sim
  labels:
    app: parlant-server
spec:
  selector:
    app: parlant-server
  ports:
  - name: http
    port: 80
    targetPort: 8001
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: 9090
    protocol: TCP
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: parlant-server-ingress
  namespace: sim
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.sim.com
    secretName: parlant-tls
  rules:
  - host: api.sim.com
    http:
      paths:
      - path: /parlant
        pathType: Prefix
        backend:
          service:
            name: parlant-server-service
            port:
              number: 80
```

## Database Setup and Migration

### Initial Schema Setup

```bash
# Run schema initialization
cd /opt/parlant
./venv/bin/python -c "
import asyncio
from database.init_schema import check_parlant_schema

async def main():
    status = await check_parlant_schema()
    print('Schema Status:', status)

asyncio.run(main())
"
```

### Database Migration Scripts

#### Migration Framework Setup
```python
# migrations/migrate.py
import asyncio
import logging
from pathlib import Path
from datetime import datetime

import asyncpg
from database.connection import get_database_url

logger = logging.getLogger(__name__)

class MigrationManager:
    def __init__(self):
        self.database_url = get_database_url()
        self.migrations_dir = Path(__file__).parent / 'sql'

    async def create_migration_table(self):
        """Create migrations tracking table."""
        conn = await asyncpg.connect(self.database_url)

        await conn.execute("""
            CREATE TABLE IF NOT EXISTS parlant_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT NOW(),
                checksum VARCHAR(64) NOT NULL
            )
        """)

        await conn.close()

    async def get_applied_migrations(self):
        """Get list of applied migrations."""
        conn = await asyncpg.connect(self.database_url)

        rows = await conn.fetch("""
            SELECT filename FROM parlant_migrations ORDER BY id
        """)

        await conn.close()
        return [row['filename'] for row in rows]

    async def apply_migration(self, migration_file: Path):
        """Apply a single migration file."""
        logger.info(f"Applying migration: {migration_file.name}")

        conn = await asyncpg.connect(self.database_url)

        try:
            # Read migration SQL
            sql_content = migration_file.read_text()

            # Calculate checksum
            import hashlib
            checksum = hashlib.sha256(sql_content.encode()).hexdigest()

            # Execute migration in transaction
            async with conn.transaction():
                await conn.execute(sql_content)

                # Record migration
                await conn.execute("""
                    INSERT INTO parlant_migrations (filename, checksum)
                    VALUES ($1, $2)
                """, migration_file.name, checksum)

            logger.info(f"Successfully applied: {migration_file.name}")

        except Exception as e:
            logger.error(f"Failed to apply {migration_file.name}: {e}")
            raise
        finally:
            await conn.close()

    async def run_migrations(self):
        """Run all pending migrations."""
        await self.create_migration_table()
        applied = set(await self.get_applied_migrations())

        # Find all migration files
        migration_files = sorted(self.migrations_dir.glob('*.sql'))

        for migration_file in migration_files:
            if migration_file.name not in applied:
                await self.apply_migration(migration_file)

async def main():
    manager = MigrationManager()
    await manager.run_migrations()
    logger.info("All migrations completed successfully")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
```

#### Sample Migration Files

**migrations/sql/001_create_parlant_tables.sql**
```sql
-- Create Parlant core tables
-- Migration: 001_create_parlant_tables.sql

-- Create enums
CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'error');
CREATE TYPE session_status AS ENUM ('active', 'ended', 'error');
CREATE TYPE event_type AS ENUM ('message', 'action', 'error', 'system');

-- Create agent table
CREATE TABLE parlant_agent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    guidelines JSONB DEFAULT '[]',
    tools JSONB DEFAULT '[]',
    model VARCHAR(100) DEFAULT 'claude-3-sonnet-20240229',
    temperature REAL DEFAULT 0.7,
    status agent_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_agent_name_per_workspace UNIQUE (workspace_id, name),
    CONSTRAINT fk_agent_workspace FOREIGN KEY (workspace_id)
        REFERENCES workspace(id) ON DELETE CASCADE,
    CONSTRAINT fk_agent_user FOREIGN KEY (user_id)
        REFERENCES "user"(id) ON DELETE CASCADE
);

-- Create session table
CREATE TABLE parlant_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    status session_status DEFAULT 'active',
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,

    CONSTRAINT fk_session_agent FOREIGN KEY (agent_id)
        REFERENCES parlant_agent(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_workspace FOREIGN KEY (workspace_id)
        REFERENCES workspace(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id)
        REFERENCES "user"(id) ON DELETE CASCADE
);

-- Create event/message table
CREATE TABLE parlant_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    event_type event_type NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_event_session FOREIGN KEY (session_id)
        REFERENCES parlant_session(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_parlant_agent_workspace ON parlant_agent(workspace_id);
CREATE INDEX idx_parlant_agent_user ON parlant_agent(user_id);
CREATE INDEX idx_parlant_session_agent ON parlant_session(agent_id);
CREATE INDEX idx_parlant_session_workspace ON parlant_session(workspace_id);
CREATE INDEX idx_parlant_session_user ON parlant_session(user_id);
CREATE INDEX idx_parlant_event_session ON parlant_event(session_id);
CREATE INDEX idx_parlant_event_created ON parlant_event(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parlant_agent_updated_at
    BEFORE UPDATE ON parlant_agent
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Load Balancing and Reverse Proxy

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/parlant
upstream parlant_backend {
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;

    # Health check
    keepalive 32;
}

server {
    listen 80;
    server_name api.sim.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.sim.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/sim.com.crt;
    ssl_certificate_key /etc/ssl/private/sim.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Parlant API
    location /parlant/ {
        proxy_pass http://parlant_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 8k;
        proxy_buffers 8 8k;

        # Health check
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }

    # WebSocket support
    location /parlant/ws/ {
        proxy_pass http://parlant_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket specific timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Health check endpoint (bypass auth)
    location /parlant/health {
        proxy_pass http://parlant_backend;
        access_log off;
    }

    # Metrics endpoint (restrict access)
    location /parlant/metrics {
        proxy_pass http://parlant_backend;
        allow 10.0.0.0/8;
        deny all;
    }
}
```

## Monitoring and Alerting

### Prometheus Configuration

**prometheus.yml**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "parlant_alerts.yml"

scrape_configs:
  - job_name: 'parlant-server'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: /metrics
    scrape_interval: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

**parlant_alerts.yml**
```yaml
groups:
- name: parlant.rules
  rules:

  # High error rate
  - alert: ParlantHighErrorRate
    expr: rate(parlant_http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate in Parlant server"
      description: "Error rate is {{ $value }} errors per second"

  # High response time
  - alert: ParlantHighLatency
    expr: parlant_http_request_duration_seconds{quantile="0.95"} > 1.0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time in Parlant server"
      description: "95th percentile latency is {{ $value }} seconds"

  # Database connection issues
  - alert: ParlantDatabaseDown
    expr: parlant_database_connections_active == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Parlant database connection lost"
      description: "No active database connections"

  # Memory usage
  - alert: ParlantHighMemoryUsage
    expr: parlant_memory_usage_percent > 90
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage in Parlant server"
      description: "Memory usage is {{ $value }}%"

  # Service down
  - alert: ParlantServiceDown
    expr: up{job="parlant-server"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Parlant server is down"
      description: "Parlant server has been down for more than 1 minute"
```

### Health Check Scripts

**health_check.py**
```python
#!/usr/bin/env python3
"""
Comprehensive health check script for Parlant Integration Bridge
"""

import asyncio
import sys
import time
import json
from typing import Dict, Any
from dataclasses import dataclass

import httpx
import asyncpg
from config.settings import get_settings

@dataclass
class HealthResult:
    name: str
    healthy: bool
    response_time_ms: float
    details: Dict[str, Any]
    error: str = None

class HealthChecker:
    def __init__(self):
        self.settings = get_settings()
        self.results = []

    async def check_http_endpoint(self, url: str, name: str) -> HealthResult:
        """Check HTTP endpoint health."""
        start_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response_time = (time.time() - start_time) * 1000

                return HealthResult(
                    name=name,
                    healthy=response.status_code == 200,
                    response_time_ms=response_time,
                    details={
                        'status_code': response.status_code,
                        'response_size': len(response.content)
                    }
                )

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthResult(
                name=name,
                healthy=False,
                response_time_ms=response_time,
                details={},
                error=str(e)
            )

    async def check_database(self) -> HealthResult:
        """Check database connectivity and performance."""
        start_time = time.time()

        try:
            conn = await asyncpg.connect(self.settings.database_url)

            # Test query
            result = await conn.fetchval("SELECT COUNT(*) FROM parlant_agent")
            await conn.close()

            response_time = (time.time() - start_time) * 1000

            return HealthResult(
                name="database",
                healthy=True,
                response_time_ms=response_time,
                details={
                    'agent_count': result,
                    'connection_pool_size': self.settings.database_pool_size
                }
            )

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthResult(
                name="database",
                healthy=False,
                response_time_ms=response_time,
                details={},
                error=str(e)
            )

    async def check_sim_integration(self) -> HealthResult:
        """Check Sim API connectivity."""
        return await self.check_http_endpoint(
            f"{self.settings.sim_base_url}/health",
            "sim_integration"
        )

    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks concurrently."""
        checks = [
            self.check_http_endpoint("http://localhost:8001/health", "server"),
            self.check_database(),
            self.check_sim_integration()
        ]

        results = await asyncio.gather(*checks, return_exceptions=True)

        # Process results
        health_results = []
        overall_healthy = True

        for result in results:
            if isinstance(result, Exception):
                health_results.append(HealthResult(
                    name="unknown",
                    healthy=False,
                    response_time_ms=0,
                    details={},
                    error=str(result)
                ))
                overall_healthy = False
            else:
                health_results.append(result)
                if not result.healthy:
                    overall_healthy = False

        return {
            'overall_healthy': overall_healthy,
            'timestamp': time.time(),
            'checks': [
                {
                    'name': r.name,
                    'healthy': r.healthy,
                    'response_time_ms': r.response_time_ms,
                    'details': r.details,
                    'error': r.error
                }
                for r in health_results
            ]
        }

async def main():
    """Main health check entry point."""
    checker = HealthChecker()
    results = await checker.run_all_checks()

    # Print results
    print(json.dumps(results, indent=2))

    # Exit with appropriate code
    sys.exit(0 if results['overall_healthy'] else 1)

if __name__ == "__main__":
    asyncio.run(main())
```

## Backup and Recovery

### Database Backup
```bash
#!/bin/bash
# backup_database.sh

set -e

# Configuration
BACKUP_DIR="/opt/parlant/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="parlant_backup_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Dump database
pg_dump "${DATABASE_URL}" \
    --verbose \
    --clean \
    --no-owner \
    --no-privileges \
    --format=plain \
    --file="${BACKUP_DIR}/${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_DIR}/${BACKUP_FILE}"

# Upload to S3 (optional)
if [ -n "$AWS_S3_BACKUP_BUCKET" ]; then
    aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}.gz" \
        "s3://${AWS_S3_BACKUP_BUCKET}/parlant/$(date +%Y/%m/%d)/"
fi

# Clean up old backups (keep 7 days)
find "${BACKUP_DIR}" -name "*.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

### Recovery Procedure
```bash
#!/bin/bash
# restore_database.sh

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Stop Parlant server
sudo systemctl stop parlant-server

# Create recovery database
createdb parlant_recovery

# Restore backup
gunzip -c "$BACKUP_FILE" | psql parlant_recovery

# Verify data integrity
psql parlant_recovery -c "SELECT COUNT(*) FROM parlant_agent;"

# Switch databases (manual step - requires planning)
echo "Backup restored to parlant_recovery database"
echo "Manual steps required to switch production database"
```

This comprehensive deployment guide provides all necessary information for successfully deploying and operating the Sim-Parlant Integration Bridge across different environments and deployment methods.