# Parlant Server Configuration Integration

## Overview

This document outlines the comprehensive configuration management setup for integrating Parlant server with the Sim Studio ecosystem. The configuration system extends existing Sim patterns while maintaining consistency and operational excellence.

## Architecture Integration

### Configuration Hierarchy

```
sim/
├── apps/sim/.env.example                    # Main Sim app config
├── packages/db/.env.example                 # Database config
└── packages/parlant-server/                 # Parlant server config
    ├── .env.example                         # Parlant template config
    ├── .env.development                     # Development settings
    ├── .env.staging                         # Staging settings
    ├── .env.production                      # Production settings
    ├── validate-config.js                  # Node.js validator
    ├── validate-config.py                  # Python validator
    └── Dockerfile                          # Container config
```

### Docker Integration

Parlant server is fully integrated into existing Docker Compose configurations:

- **`docker-compose.local.yml`**: Development with local build
- **`docker-compose.prod.yml`**: Production with registry image
- **`docker-compose.ollama.yml`**: Local LLM support

## Environment Configuration

### Shared Variables

These variables are shared between Sim and Parlant services:

| Variable | Purpose | Shared Service |
|----------|---------|---------------|
| `DATABASE_URL` | PostgreSQL connection | Sim, Parlant, DB migrations |
| `BETTER_AUTH_SECRET` | Authentication | Sim, Parlant, Realtime |
| `BETTER_AUTH_URL` | Auth service URL | Sim, Parlant |
| `ENCRYPTION_KEY` | Data encryption | Sim, Parlant |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | Sim, CORS config |

### Parlant-Specific Variables

| Variable | Description | Environment |
|----------|-------------|-------------|
| `PARLANT_HOST` | Server bind address | All |
| `PARLANT_PORT` | Server port (8001) | All |
| `AI_PROVIDER` | LLM provider (openai/anthropic/ollama) | All |
| `AI_MODEL` | Specific model to use | All |
| `SESSION_STORAGE` | Storage backend (postgresql) | All |
| `MAX_CONCURRENT_SESSIONS` | Performance tuning | Production |

### Environment-Specific Settings

#### Development (`.env.development`)
- Debug mode enabled
- Local LLM support via Ollama
- Relaxed CORS and rate limiting
- Detailed logging
- Lower performance limits

#### Staging (`.env.staging`)
- Production-like settings
- Cloud LLM providers only
- Moderate performance limits
- JSON structured logging
- Tracing enabled

#### Production (`.env.production`)
- Maximum security settings
- Strict CORS and rate limiting
- Minimal logging (WARN level)
- High performance limits
- Backup enabled

## Validation System

### Dual Validation Scripts

#### Node.js Validator (`validate-config.js`)
- ES6 modules with modern syntax
- JSON configuration reporting
- Integration with npm scripts
- Detailed validation rules

#### Python Validator (`validate-config.py`)
- Native Python environment validation
- Python requirements checking
- Command-line interface with argparse
- Environment-specific validation

### Usage Examples

```bash
# Validate development config
npm run validate
python validate-config.py development

# Validate all environments
npm run validate:staging
npm run validate:production
python validate-config.py --check-python staging

# Validate configuration template
node validate-config.js example
```

### Validation Rules

#### Required Variables
- Database connectivity (`DATABASE_URL`)
- Server binding (`PARLANT_HOST`, `PARLANT_PORT`)
- AI provider settings (`AI_PROVIDER`, `OPENAI_API_KEY`)
- Sim integration (`SIM_API_URL`, `SIM_API_KEY`)

#### Format Validation
- Port numbers (1000-65535)
- URL formats (http/https)
- AI provider names
- Log levels
- Session timeouts

#### Environment-Specific Checks
- Production security warnings
- Debug mode detection
- Provider-specific API key requirements
- Database URL parsing

## Docker Integration

### Service Definition

Parlant server integrates seamlessly with existing Docker Compose services:

```yaml
parlant-server:
  build:
    context: ./packages/parlant-server
    dockerfile: Dockerfile
  ports:
    - '8001:8001'
  environment:
    # Shared variables from main .env
    - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
    # Parlant-specific configuration
    - PARLANT_PORT=8001
    - AI_PROVIDER=openai
    - OPENAI_API_KEY=${OPENAI_API_KEY}
  depends_on:
    db:
      condition: service_healthy
```

### Health Checks

Comprehensive health monitoring:
- Container health checks via `/health` endpoint
- Database connectivity validation
- AI provider API accessibility
- Resource usage monitoring

### Resource Management

Environment-specific resource allocation:
- **Development**: 2GB memory, relaxed limits
- **Staging**: 4GB memory, moderate limits
- **Production**: 4GB memory, optimized for scale

## Integration Points

### Database Integration

Parlant server uses the same PostgreSQL instance as Sim:
- Shared connection pool
- Consistent transaction handling
- Integrated backup strategy
- Migration coordination

### Authentication Integration

Leverages Sim's Better Auth system:
- Shared JWT secrets
- Consistent user session handling
- Unified authorization policies
- Cross-service authentication

### API Integration

Internal API communication:
- Direct service-to-service calls
- Shared API key authentication
- Consistent error handling
- Request/response logging

### Realtime Integration

WebSocket coordination with Sim's realtime service:
- Shared event broadcasting
- Session synchronization
- Live status updates
- Connection pooling

## Operational Procedures

### Deployment Workflow

1. **Configuration Validation**
   ```bash
   # Validate all environment configs
   npm run validate:production
   python validate-config.py production --check-python
   ```

2. **Docker Build & Test**
   ```bash
   # Build and test container
   docker-compose -f docker-compose.local.yml build parlant-server
   docker-compose -f docker-compose.local.yml up parlant-server
   ```

3. **Health Verification**
   ```bash
   # Verify service health
   curl -f http://localhost:8001/health
   docker-compose logs parlant-server
   ```

### Monitoring Setup

#### Health Endpoints
- `/health` - Basic service health
- `/ready` - Kubernetes readiness probe
- `/metrics` - Prometheus metrics (if enabled)

#### Logging Strategy
- **Development**: Text format, DEBUG level
- **Staging**: JSON format, INFO level with tracing
- **Production**: JSON format, WARN level, structured

#### Alert Configuration
- Service availability
- Database connection issues
- AI provider API failures
- Resource utilization thresholds

## Security Considerations

### Development Security
- CORS enabled for localhost origins
- Rate limiting disabled for convenience
- Debug information exposed
- Local file logging

### Production Security
- Strict CORS policy enforcement
- Aggressive rate limiting (500 req/min)
- Minimal debug information
- Centralized logging
- Secret rotation policies

### Secret Management
- Environment variable injection
- Container secret mounting
- Key rotation procedures
- Audit trail maintenance

## Troubleshooting Guide

### Common Configuration Issues

1. **Database Connection Failures**
   ```bash
   # Verify database URL format
   python validate-config.py production

   # Test database connectivity
   docker-compose exec db pg_isready -U postgres
   ```

2. **AI Provider Authentication**
   ```bash
   # Verify API key configuration
   echo $OPENAI_API_KEY | cut -c1-10  # Show first 10 chars

   # Test API connectivity
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```

3. **Port Conflicts**
   ```bash
   # Check port availability
   lsof -i :8001

   # Use alternative port
   PARLANT_PORT=8002 docker-compose up parlant-server
   ```

4. **Container Issues**
   ```bash
   # Check container logs
   docker-compose logs --tail=50 parlant-server

   # Access container shell
   docker-compose exec parlant-server /bin/bash
   ```

### Performance Tuning

#### Memory Optimization
- Adjust `MAX_CONCURRENT_SESSIONS` based on load
- Monitor memory usage patterns
- Configure garbage collection thresholds

#### Database Performance
- Connection pool sizing
- Query optimization
- Index maintenance
- Session cleanup procedures

#### AI Provider Optimization
- Model selection based on use case
- Request batching strategies
- Response caching policies
- Fallback provider configuration

## Migration Strategy

### From Existing Setups

1. **Environment Variable Migration**
   - Map existing variables to new schema
   - Validate all required variables present
   - Test configuration in staging first

2. **Database Schema Updates**
   - Run Parlant-specific migrations
   - Verify backward compatibility
   - Plan rollback procedures

3. **Service Discovery Updates**
   - Update internal service URLs
   - Configure load balancer rules
   - Test cross-service communication

### Rollback Procedures

1. **Configuration Rollback**
   - Restore previous environment files
   - Restart affected services
   - Verify service health

2. **Database Rollback**
   - Execute rollback migrations
   - Restore from backup if needed
   - Verify data integrity

## Maintenance Procedures

### Regular Tasks

1. **Configuration Validation**
   - Weekly validation of all environments
   - Monthly security configuration review
   - Quarterly performance tuning review

2. **Log Rotation**
   - Daily log rotation in development
   - Weekly log archival in production
   - Monthly log analysis and cleanup

3. **Secret Rotation**
   - Monthly API key rotation
   - Quarterly database credential rotation
   - Annual encryption key rotation

### Monitoring and Alerting

1. **Health Monitoring**
   - Continuous health check monitoring
   - Database connection monitoring
   - AI provider API monitoring

2. **Performance Monitoring**
   - Response time tracking
   - Resource utilization monitoring
   - Session count monitoring

3. **Security Monitoring**
   - Failed authentication attempts
   - Rate limit violations
   - Unusual traffic patterns

## Best Practices

### Configuration Management
- Use environment-specific configuration files
- Validate all configurations before deployment
- Maintain configuration documentation
- Implement configuration change controls

### Security
- Regular security configuration reviews
- Principle of least privilege
- Secret rotation procedures
- Audit trail maintenance

### Performance
- Regular performance testing
- Resource usage monitoring
- Capacity planning procedures
- Performance optimization reviews

### Operational Excellence
- Comprehensive monitoring setup
- Automated health checks
- Incident response procedures
- Regular maintenance schedules