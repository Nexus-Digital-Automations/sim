# Parlant Server Monitoring & Health Checks Documentation

## Overview

The Parlant Server monitoring system provides comprehensive health checking, error tracking, and alerting capabilities designed for production-ready monitoring and observability. This system includes multiple layers of monitoring from basic health checks to advanced error tracking and alerting.

## Architecture

### Core Components

1. **Health Check System** (`health.ts`) - Core health checking infrastructure
2. **Logging System** (`logging.ts`) - Structured logging with Parlant-specific context
3. **Monitoring Service** (`monitoring.ts`) - Metrics collection and performance monitoring
4. **Error Tracking** (`error-tracking.ts`) - Comprehensive error tracking and alerting framework

### API Endpoints

All health check endpoints are located under `/api/v1/health/` with the following structure:

```
/api/v1/health/
├── route.ts              # Main health check endpoint
├── database/route.ts     # Database-specific health checks
├── parlant/route.ts      # Parlant service health checks
├── auth/route.ts         # Authentication system health checks
├── dashboard/route.ts    # Monitoring dashboard data
└── alerts/route.ts       # Error tracking and alerts API
```

## Health Check Endpoints

### 1. Main Health Check - `/api/v1/health`

**Purpose**: Comprehensive system health overview

**Response Format**:
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "uptime": 86400,
  "services": {
    "database": { "status": "healthy", "details": {...} },
    "parlant": { "status": "healthy", "details": {...} },
    "integration": { "status": "healthy", "details": {...} }
  },
  "metrics": {
    "uptime": 86400,
    "memory": {...},
    "api": {
      "responseTime": 45.2,
      "endpoint": "/api/v1/health"
    }
  }
}
```

**Query Parameters**:
- `service` - Filter by specific service (database|parlant|integration|quick)

### 2. Database Health Check - `/api/v1/health/database`

**Purpose**: Detailed database connectivity and performance monitoring

**Features**:
- Connection pool status
- Query performance metrics (average, P95, P99)
- Slow query detection
- Database version and connection count

**Response Format**:
```json
{
  "service": "database",
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "details": {
    "connectionStatus": "connected",
    "activeConnections": 5,
    "queryTime": 23.5,
    "version": "PostgreSQL 15.4"
  },
  "metrics": {
    "database": {
      "connectionCount": 15,
      "activeQueries": 3,
      "averageQueryTime": 45.2,
      "slowQueries": 0
    },
    "responseTime": 23.5
  }
}
```

**Query Parameters**:
- `details=true` - Include extended diagnostics and connection pool information

### 3. Parlant Service Health Check - `/api/v1/health/parlant`

**Purpose**: Parlant-specific service monitoring including agent status and performance

**Features**:
- Agent performance metrics
- Session management status
- Integration health with Sim services
- Usage statistics

**Response Format**:
```json
{
  "service": "parlant",
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "requestId": "parlant-health-1234567890-abc123",
  "details": {
    "service": {
      "serviceStatus": "running",
      "agentCount": 5,
      "sessionCount": 12
    },
    "agents": {
      "performanceMetrics": [...],
      "summary": {
        "totalAgents": 5,
        "activeAgents": 3,
        "averageResponseTime": 1250
      }
    },
    "usage": {
      "agents": { "total": 5, "active": 3 },
      "sessions": { "total": 12, "active": 2 },
      "messages": { "total": 145, "user": 72, "agent": 73 }
    }
  }
}
```

**Additional Endpoints**:
- `/api/v1/health/parlant/agents` - Detailed agent performance metrics

### 4. Authentication Health Check - `/api/v1/health/auth`

**Purpose**: Authentication system health and OAuth integration status

**Features**:
- Core authentication system validation
- OAuth provider configuration status
- Session and token management health
- User and workspace table accessibility

**Response Format**:
```json
{
  "service": "auth",
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "requestId": "auth-health-1234567890-abc123",
  "components": {
    "authSystem": {
      "status": "healthy",
      "details": {
        "userTable": { "accessible": true, "recordCount": 150 },
        "workspaceTable": { "accessible": true, "recordCount": 25 }
      }
    },
    "oauthIntegration": {
      "status": "healthy",
      "details": {
        "providers": {
          "githubConfigured": true,
          "googleConfigured": true,
          "stripeConfigured": true
        },
        "configuration": {
          "totalProvidersConfigured": 3,
          "missingConfigs": []
        }
      }
    }
  },
  "summary": {
    "coreAuthFunctional": true,
    "oauthIntegrationHealthy": true,
    "totalProviders": 3,
    "userTableAccessible": true
  }
}
```

**Additional Endpoints**:
- `/api/v1/health/auth/validate` - Performs authentication functionality validation tests

### 5. Monitoring Dashboard - `/api/v1/health/dashboard`

**Purpose**: Comprehensive monitoring dashboard data for operational visibility

**Features**:
- System overview with status summary
- Service status details
- Performance metrics
- Usage statistics
- Active alerts and issues

**Response Format**:
```json
{
  "dashboard": "parlant-monitoring",
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "requestId": "dashboard-1234567890-abc123",
  "overview": {
    "systemStatus": "healthy",
    "uptime": 86400,
    "activeAlerts": 0,
    "services": {
      "total": 3,
      "healthy": 3,
      "degraded": 0,
      "unhealthy": 0
    }
  },
  "services": {...},
  "performance": {...},
  "usage": {...},
  "monitoring": {
    "alerts": [],
    "summary": {
      "total": 0,
      "critical": 0,
      "warning": 0
    }
  }
}
```

**Additional Endpoints**:
- `/api/v1/health/dashboard/summary` - Lightweight dashboard summary

## Error Tracking & Alerts

### Error Tracking System

The error tracking system automatically captures, categorizes, and analyzes errors across the Parlant integration:

**Error Categories**:
- `system` - System-level errors (memory, CPU, process issues)
- `database` - Database connectivity and query errors
- `authentication` - Auth failures and security issues
- `integration` - Sim-Parlant integration errors
- `agent` - Agent-specific operational errors
- `user` - User-facing errors and validation issues

**Error Levels**:
- `warning` - Non-critical issues that should be monitored
- `error` - Errors that affect functionality but don't break the system
- `critical` - Critical errors requiring immediate attention

### Alert Rules

**Default Alert Rules**:

1. **High Error Rate** - Triggers when >10 errors occur within 5 minutes
2. **Database Errors** - Triggers on 3+ database errors within 5 minutes
3. **Authentication Failures** - Triggers on 5+ auth failures within 10 minutes
4. **Agent Critical Errors** - Immediate alert on any critical agent error
5. **System Performance** - Alert on response times >30 seconds

### Alerts API - `/api/v1/health/alerts`

**Features**:
- Active alert retrieval with filtering
- Alert acknowledgment and resolution
- Error statistics and trends
- Alert rule configuration

**Key Endpoints**:
- `GET /api/v1/health/alerts` - Get active alerts and error statistics
- `POST /api/v1/health/alerts` - Acknowledge or resolve alerts
- `GET /api/v1/health/alerts/rules` - Get alert rule configuration
- `GET /api/v1/health/alerts/stats` - Get error and alert statistics

## Monitoring Integration

### Structured Logging

All monitoring components use structured logging with consistent context:

```typescript
import { parlantLoggers } from './logging'

// Agent operations
parlantLoggers.agent.info('Agent created', {
  operation: 'agent_create',
  agentId: 'agent-123',
  workspaceId: 'workspace-456',
  duration: 150
})

// Integration events
parlantLoggers.integration.info('Tool executed', {
  operation: 'tool_execute',
  toolName: 'weather_api',
  responseTime: 250,
  success: true
})
```

### Performance Monitoring

The monitoring system tracks:

- **Database Performance**: Query times, connection pool usage, slow queries
- **System Resources**: Memory usage, CPU utilization, uptime
- **API Performance**: Response times, error rates, throughput
- **Agent Performance**: Response times, session success rates, error counts

### Metrics Collection

Automatic metrics collection includes:

- **System Metrics**: Memory, CPU, uptime, process statistics
- **Database Metrics**: Connection counts, query performance, error rates
- **Usage Metrics**: Agent counts, session statistics, message volumes
- **Performance Metrics**: Response times, error rates, throughput

## Production Deployment

### Health Check Configuration

**Rate Limiting**:
- Standard health checks: 60 requests/minute
- Detailed health checks: 20 requests/minute
- Dashboard access: 30 requests/minute
- Alert management: 10 requests/minute

**Caching**:
- Dashboard summary: 10 seconds
- Alert rules: 5 minutes
- Other endpoints: No caching (real-time data)

### Monitoring Setup

**Recommended Monitoring Schedule**:
- Basic health check: Every 30 seconds
- Detailed health checks: Every 5 minutes
- Dashboard data: Every 2 minutes
- Alert evaluation: Every 30 seconds

**Alert Thresholds** (configurable):
- Database connections: >50 active connections
- Query response time: P95 >1s, P99 >5s
- Memory usage: >80% heap utilization
- Error rate: >5% of requests
- Agent response time: >30 seconds

### Integration with External Monitoring

The health check endpoints are designed for integration with:

- **Uptime Monitors**: Pingdom, StatusPage, UptimeRobot
- **APM Tools**: New Relic, Datadog, AppDynamics
- **Alerting Systems**: PagerDuty, Slack, email notifications
- **Log Aggregation**: ELK Stack, Splunk, CloudWatch

### Example Monitoring Configurations

**Uptime Monitor** (Pingdom/StatusPage):
```
URL: https://your-domain.com/api/v1/health
Method: GET
Expected Response: 200
Check Interval: 30 seconds
Timeout: 30 seconds
```

**Detailed System Monitor** (Custom Script):
```bash
#!/bin/bash
# Check comprehensive health status
curl -s "https://your-domain.com/api/v1/health/dashboard" | jq '.overview.systemStatus'
```

**Alert Webhook Integration**:
```json
{
  "webhook": {
    "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check `/api/v1/health/database` for detailed diagnostics
   - Verify connection pool settings
   - Check PostgreSQL server status

2. **Authentication Failures**:
   - Use `/api/v1/health/auth/validate` to test auth functionality
   - Verify environment variables for OAuth providers
   - Check user and workspace table accessibility

3. **High Error Rates**:
   - Check `/api/v1/health/alerts` for active alerts
   - Review error patterns in alerts statistics
   - Use dashboard endpoint for comprehensive system overview

4. **Performance Degradation**:
   - Monitor `/api/v1/health/dashboard` performance metrics
   - Check database query performance
   - Review memory and CPU usage

### Debug Mode

Enable detailed logging by setting environment variable:
```bash
export DEBUG_MONITORING=true
```

This enables additional debug logs in all monitoring components.

## API Rate Limits

| Endpoint | Limit | Window |
|----------|-------|---------|
| `/api/v1/health` | 60 requests | 1 minute |
| `/api/v1/health/database` | 30 requests | 1 minute |
| `/api/v1/health/parlant` | 30 requests | 1 minute |
| `/api/v1/health/auth` | 20 requests | 1 minute |
| `/api/v1/health/dashboard` | 30 requests | 1 minute |
| `/api/v1/health/alerts` | 20 requests | 1 minute |

Rate limits are enforced per IP address and can be configured via environment variables.

## Security Considerations

- All health check endpoints require proper authentication in production
- Sensitive information (credentials, tokens) is never exposed in responses
- Error details are sanitized to prevent information leakage
- Rate limiting prevents abuse and DoS attacks
- Request correlation IDs enable security audit trails

## Future Enhancements

- Real-time WebSocket monitoring updates
- Custom alert rule configuration via API
- Historical trend analysis and reporting
- Integration with Prometheus/Grafana
- Automated incident response workflows
- Advanced anomaly detection using machine learning