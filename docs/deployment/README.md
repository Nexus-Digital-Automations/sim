# Deployment Documentation

Comprehensive deployment guides and environment configuration for the Sim workflow automation platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Configuration Management](#configuration-management)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

Sim supports multiple deployment strategies to accommodate different environments and requirements:

- **Local Development**: Docker Compose for development and testing
- **Docker**: Containerized deployment for any Docker-compatible environment  
- **Kubernetes**: Scalable production deployment with Helm charts
- **Cloud**: Native cloud deployments on AWS, Azure, and GCP
- **Hybrid**: Mix of cloud and on-premise components

### Deployment Architecture Options

```
Development     Docker          Kubernetes      Cloud Native
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│Local Stack  │ │ Containers  │ │ K8s Cluster │ │ Managed SVCs│
│             │ │             │ │             │ │             │
│• Docker     │ │• Compose    │ │• Helm       │ │• RDS        │
│  Compose    │ │• Swarm      │ │• Ingress    │ │• ElastiCache│
│• Hot Reload │ │• Registry   │ │• Auto Scale │ │• EKS/AKS    │
│• Debug Mode │ │• Networks   │ │• Monitoring │ │• CDN        │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

## ✅ Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB
- OS: Linux, macOS, or Windows with WSL2

**Recommended Production:**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 100GB+ SSD
- OS: Ubuntu 20.04+ or similar

### Software Dependencies

**Required:**
- Docker 24.0+ and Docker Compose 2.0+
- Node.js 18+ and npm/yarn/pnpm
- Git for source code management

**Optional:**
- Kubernetes 1.25+ for production scaling
- Terraform 1.0+ for infrastructure as code
- Helm 3.0+ for Kubernetes deployment

### Network Requirements

**Ports:**
- 3000: Web application (HTTP)
- 5432: PostgreSQL database
- 6379: Redis cache
- 443/80: HTTPS/HTTP (production)

**External Access:**
- GitHub/GitLab for OAuth authentication
- SMTP server for email notifications
- Third-party API endpoints for integrations

## 🏠 Local Development

### Quick Start

1. **Clone Repository**
```bash
git clone https://github.com/your-org/sim.git
cd sim
```

2. **Environment Setup**
```bash
# Copy environment template
cp .env.example .env.local

# Install dependencies
npm install

# Start development stack
docker-compose -f docker-compose.local.yml up -d
```

3. **Database Setup**
```bash
# Run database migrations
npm run db:migrate

# Seed development data (optional)
npm run db:seed
```

4. **Start Development Server**
```bash
npm run dev
```

5. **Access Application**
- Web UI: http://localhost:3000
- API Docs: http://localhost:3000/api/docs
- Database: localhost:5432 (postgres/postgres)

### Development Configuration

**Environment Variables (.env.local)**
```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sim_dev
REDIS_URL=redis://localhost:6379

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-development-secret

# OAuth Providers (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Email (optional)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_OAUTH=false
ENABLE_ANALYTICS=false
```

**Docker Compose Configuration**
```yaml
# docker-compose.local.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: sim_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

volumes:
  postgres_data:
  redis_data:
```

## 🐳 Docker Deployment

### Single-Node Deployment

**Docker Compose Production**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: docker/app.Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

**Deployment Commands**
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Update deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres sim > backup.sql
```

### Docker Swarm Deployment

**Initialize Swarm**
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml sim

# View services
docker service ls

# Scale services
docker service scale sim_app=3
```

## ☁️ Cloud Deployment

### AWS Deployment

**ECS with Fargate**
```yaml
# terraform/aws/main.tf
resource "aws_ecs_cluster" "sim" {
  name = "sim-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_service" "sim_app" {
  name            = "sim-app"
  cluster         = aws_ecs_cluster.sim.id
  task_definition = aws_ecs_task_definition.sim_app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "sim-app"
    container_port   = 3000
  }
}

resource "aws_rds_cluster" "postgres" {
  cluster_identifier      = "sim-postgres"
  engine                 = "aurora-postgresql"
  engine_version         = "13.7"
  database_name          = "sim"
  master_username        = var.db_username
  master_password        = var.db_password
  backup_retention_period = 7
  preferred_backup_window = "07:00-09:00"
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  skip_final_snapshot = false
  final_snapshot_identifier = "sim-final-snapshot"
}
```

**Deployment Commands**
```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file="production.tfvars"

# Apply deployment
terraform apply -var-file="production.tfvars"

# Update application
aws ecs update-service --cluster sim-cluster --service sim-app --force-new-deployment
```

### Kubernetes Deployment

**Helm Installation**
```bash
# Add Helm repository
helm repo add sim https://charts.sim.dev
helm repo update

# Install with custom values
helm install sim sim/sim \
  --namespace sim \
  --create-namespace \
  --values values-production.yaml
```

**Production Values (values-production.yaml)**
```yaml
replicaCount: 3

image:
  repository: sim/sim
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: sim.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: sim-tls
      hosts:
        - sim.example.com

postgresql:
  enabled: true
  postgresqlDatabase: sim
  postgresqlUsername: sim
  postgresqlPassword: secure-password
  persistence:
    enabled: true
    size: 100Gi

redis:
  enabled: true
  auth:
    enabled: false
  persistence:
    enabled: true
    size: 10Gi

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
```

## ⚙️ Configuration Management

### Environment Variables

**Application Configuration**
```bash
# Core Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://sim.example.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/sim
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5

# Cache
REDIS_URL=redis://host:6379/0
REDIS_POOL_MAX=10

# Authentication
NEXTAUTH_URL=https://sim.example.com
NEXTAUTH_SECRET=your-production-secret-32-chars-min

# OAuth Providers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
FROM_EMAIL=noreply@sim.example.com

# Storage
S3_BUCKET=sim-uploads
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
ENABLE_ANALYTICS=true
ANALYTICS_ID=your-analytics-id

# Security
ALLOWED_ORIGINS=https://sim.example.com,https://app.sim.example.com
CSRF_SECRET=your-csrf-secret
RATE_LIMIT_MAX=100

# Features
ENABLE_REGISTRATION=true
ENABLE_OAUTH=true
ENABLE_TEMPLATES=true
ENABLE_MONITORING=true
```

### Secrets Management

**Kubernetes Secrets**
```bash
# Create secrets from environment file
kubectl create secret generic sim-secrets \
  --from-env-file=.env.production \
  --namespace=sim

# Or create individual secrets
kubectl create secret generic database-secret \
  --from-literal=DATABASE_URL="postgresql://..." \
  --namespace=sim

kubectl create secret generic auth-secret \
  --from-literal=NEXTAUTH_SECRET="..." \
  --namespace=sim
```

**Docker Swarm Secrets**
```bash
# Create secrets
echo "postgresql://user:pass@host:5432/sim" | docker secret create database_url -
echo "your-nextauth-secret" | docker secret create nextauth_secret -

# Reference in compose file
services:
  app:
    secrets:
      - database_url
      - nextauth_secret
    environment:
      - DATABASE_URL_FILE=/run/secrets/database_url
      - NEXTAUTH_SECRET_FILE=/run/secrets/nextauth_secret

secrets:
  database_url:
    external: true
  nextauth_secret:
    external: true
```

## 📊 Monitoring & Maintenance

### Health Checks

**Application Health Endpoints**
- GET /api/health - Basic health check
- GET /api/health/ready - Readiness check (database connectivity)
- GET /api/health/live - Liveness check (application status)

**Monitoring Stack**
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"

volumes:
  grafana_data:
```

### Backup Strategy

**Database Backups**
```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="sim_backup_$DATE.sql"

# Create backup
pg_dump $DATABASE_URL > /backups/$BACKUP_FILE

# Compress backup
gzip /backups/$BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp /backups/$BACKUP_FILE.gz s3://sim-backups/

# Cleanup old backups (keep 30 days)
find /backups -name "sim_backup_*.sql.gz" -mtime +30 -delete
```

**Automated Backup with Cron**
```bash
# Add to crontab
0 2 * * * /opt/sim/scripts/backup-db.sh
```

### Log Management

**Application Logs**
```javascript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'sim-app' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

**Log Rotation**
```bash
# /etc/logrotate.d/sim
/var/log/sim/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 sim sim
    postrotate
        systemctl reload sim || true
    endscript
}
```

## 🔧 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check database connectivity
pg_isready -h localhost -p 5432

# Test connection with credentials
psql $DATABASE_URL -c "SELECT version();"

# Check connection pool
SELECT * FROM pg_stat_activity WHERE datname = 'sim';
```

**Memory Issues**
```bash
# Check memory usage
docker stats

# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Monitor memory leaks
node --inspect app.js
```

**Performance Issues**
```bash
# Enable slow query logging (PostgreSQL)
ALTER DATABASE sim SET log_min_duration_statement = 1000;

# Monitor Redis performance
redis-cli --latency-history

# Profile application
npm run profile
```

### Diagnostic Commands

**Docker Diagnostics**
```bash
# View container logs
docker logs sim_app_1 --tail=100 -f

# Execute commands in container
docker exec -it sim_app_1 /bin/bash

# Check container resource usage
docker stats sim_app_1

# Inspect container configuration
docker inspect sim_app_1
```

**Kubernetes Diagnostics**
```bash
# View pod logs
kubectl logs -f deployment/sim-app -n sim

# Describe pod issues
kubectl describe pod -l app=sim-app -n sim

# Execute commands in pod
kubectl exec -it deployment/sim-app -n sim -- /bin/bash

# Check resource usage
kubectl top pods -n sim
```

### Recovery Procedures

**Database Recovery**
```bash
# Restore from backup
gunzip sim_backup_20250904_020000.sql.gz
psql $DATABASE_URL < sim_backup_20250904_020000.sql

# Point-in-time recovery (PostgreSQL)
pg_basebackup -h host -D /var/lib/postgresql/backup
```

**Application Recovery**
```bash
# Rolling restart (zero downtime)
kubectl rollout restart deployment/sim-app -n sim

# Rollback to previous version
helm rollback sim 1 -n sim

# Scale up for high availability
kubectl scale deployment sim-app --replicas=5 -n sim
```

---

**Last Updated**: 2025-09-04 | **Version**: 1.0 | **Maintained by**: DevOps Team