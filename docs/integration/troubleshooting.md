# Troubleshooting and Monitoring Guide

## Overview

This guide provides comprehensive troubleshooting procedures, monitoring strategies, and operational insights for the Sim-Parlant Integration Bridge. It covers common issues, diagnostic tools, monitoring setup, and performance optimization techniques.

## Common Issues and Solutions

### 1. Authentication Issues

#### Issue: "Invalid or expired session token"

**Symptoms:**
- 401 Unauthorized responses
- Users unable to access agents
- Intermittent authentication failures

**Diagnostic Steps:**
```bash
# Check token validity
curl -H "Authorization: Bearer <token>" \
     http://localhost:8001/api/v1/auth/status

# Check Sim API connectivity
curl -H "Authorization: Bearer <internal_api_key>" \
     http://localhost:3000/health

# Verify JWT secret configuration
python -c "
import os
from config.settings import get_settings
settings = get_settings()
print('JWT Secret configured:', bool(settings.jwt_secret_key))
print('JWT Algorithm:', settings.jwt_algorithm)
"
```

**Solutions:**
1. **Token Expiry**: Verify token hasn't expired
   ```bash
   # Check token expiration
   python -c "
   import jwt
   token = 'your_token_here'
   decoded = jwt.decode(token, options={'verify_signature': False})
   print('Token expires at:', decoded.get('exp'))
   "
   ```

2. **Sim API Connectivity**: Check network connectivity to Sim backend
   ```bash
   # Test Sim API endpoint
   curl -v http://localhost:3000/api/auth/session
   ```

3. **Configuration Issues**: Verify environment variables
   ```bash
   # Check configuration
   grep -E "JWT_|SIM_" .env
   ```

#### Issue: "Access denied to workspace"

**Symptoms:**
- 403 Forbidden responses for workspace operations
- Users can't create/access agents in their workspaces

**Diagnostic Steps:**
```bash
# Check user's workspace access
curl -H "Authorization: Bearer <token>" \
     "http://localhost:8001/api/v1/auth/workspaces/{workspace_id}/access"

# Check workspace exists in database
psql $DATABASE_URL -c "SELECT id, name FROM workspace WHERE id = 'workspace_id';"

# Check user-workspace relationship
psql $DATABASE_URL -c "
SELECT u.email, w.name, uw.role
FROM \"user\" u
JOIN user_workspace uw ON u.id = uw.user_id
JOIN workspace w ON uw.workspace_id = w.id
WHERE u.id = 'user_id';
"
```

**Solutions:**
1. **Missing Workspace Membership**: Add user to workspace
2. **Incorrect Workspace ID**: Verify workspace ID format and existence
3. **Permission Issues**: Check user role and permissions in workspace

### 2. Database Connection Issues

#### Issue: "Database connection failed"

**Symptoms:**
- 500 Internal Server Error responses
- "Connection refused" errors in logs
- Health check failures

**Diagnostic Steps:**
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Check connection pool status
curl http://localhost:8001/api/v1/health/detailed | jq '.dependencies.database'

# Monitor database connections
psql $DATABASE_URL -c "
SELECT count(*) as active_connections,
       datname,
       usename,
       state
FROM pg_stat_activity
WHERE datname = 'sim_db'
GROUP BY datname, usename, state;
"
```

**Solutions:**
1. **Connection Pool Exhaustion**:
   ```python
   # Increase pool size in configuration
   DATABASE_POOL_SIZE=20
   DATABASE_POOL_MAX_OVERFLOW=30
   ```

2. **Database Server Down**:
   ```bash
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

3. **Network Issues**:
   ```bash
   # Test network connectivity
   telnet db_host 5432
   ```

#### Issue: "Schema not found" or "Table doesn't exist"

**Symptoms:**
- SQL errors about missing tables
- Schema validation failures
- Migration errors

**Diagnostic Steps:**
```bash
# Check schema status
python -c "
import asyncio
from database.init_schema import check_parlant_schema

async def main():
    status = await check_parlant_schema()
    print('Schema Status:')
    for table, exists in status['table_status'].items():
        print(f'  {table}: {\"✅\" if exists else \"❌\"}')

asyncio.run(main())
"

# Check migration status
psql $DATABASE_URL -c "SELECT * FROM parlant_migrations ORDER BY id;"
```

**Solutions:**
1. **Run Missing Migrations**:
   ```bash
   python migrations/migrate.py
   ```

2. **Recreate Schema**:
   ```bash
   # Only for development - destroys data!
   psql $DATABASE_URL -f migrations/sql/001_create_parlant_tables.sql
   ```

### 3. API Performance Issues

#### Issue: "Slow API responses"

**Symptoms:**
- High response times (>1 second)
- Timeout errors
- Poor user experience

**Diagnostic Steps:**
```bash
# Check API response times
curl -w "Total time: %{time_total}s\n" \
     -H "Authorization: Bearer <token>" \
     http://localhost:8001/api/v1/agents

# Monitor database query performance
psql $DATABASE_URL -c "
SELECT query,
       mean_time,
       calls,
       total_time/calls as avg_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"

# Check system resources
top -p $(pgrep -f "uvicorn")
```

**Solutions:**
1. **Database Query Optimization**:
   ```sql
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY idx_parlant_agent_workspace_user
   ON parlant_agent(workspace_id, user_id);

   -- Analyze query plans
   EXPLAIN ANALYZE SELECT * FROM parlant_agent WHERE workspace_id = 'workspace_1';
   ```

2. **Enable Caching**:
   ```python
   # Enable session caching
   ENABLE_CACHING=true
   AUTH_CACHE_TTL=300
   ```

3. **Connection Pool Tuning**:
   ```bash
   # Optimize pool settings
   DATABASE_POOL_SIZE=10
   DATABASE_POOL_MAX_OVERFLOW=20
   DATABASE_COMMAND_TIMEOUT=30
   ```

### 4. Memory and Resource Issues

#### Issue: "High memory usage" or "Memory leaks"

**Symptoms:**
- Increasing memory usage over time
- Out of memory errors
- System slowdown

**Diagnostic Steps:**
```bash
# Monitor memory usage
python -c "
import psutil
import os

process = psutil.Process(os.getpid())
memory_info = process.memory_info()
print(f'RSS: {memory_info.rss / 1024 / 1024:.2f} MB')
print(f'VMS: {memory_info.vms / 1024 / 1024:.2f} MB')
print(f'Memory percent: {process.memory_percent():.2f}%')
"

# Check for memory leaks
python -m memory_profiler main.py

# Monitor garbage collection
python -c "
import gc
print('Garbage collection stats:', gc.get_stats())
print('Uncollectable objects:', len(gc.garbage))
"
```

**Solutions:**
1. **Session Cache Size Limit**:
   ```python
   # Limit cache size
   SESSION_CACHE_MAX_SIZE=1000
   SESSION_CACHE_TTL=300
   ```

2. **Connection Pool Limits**:
   ```bash
   # Reduce pool size if memory constrained
   DATABASE_POOL_SIZE=5
   DATABASE_POOL_MAX_OVERFLOW=10
   ```

3. **Enable Garbage Collection**:
   ```python
   # Force garbage collection periodically
   import gc
   gc.collect()
   ```

## Monitoring and Alerting Setup

### 1. Application Metrics

#### Prometheus Integration
```python
# monitoring/prometheus_metrics.py
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
import time
from functools import wraps

# Create custom registry
registry = CollectorRegistry()

# Define metrics
request_count = Counter(
    'parlant_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
    registry=registry
)

request_duration = Histogram(
    'parlant_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    registry=registry
)

active_sessions = Gauge(
    'parlant_active_sessions',
    'Number of active agent sessions',
    registry=registry
)

database_connections = Gauge(
    'parlant_database_connections',
    'Database connection pool status',
    ['state'],
    registry=registry
)

auth_cache_hits = Counter(
    'parlant_auth_cache_hits_total',
    'Authentication cache hits',
    ['result'],
    registry=registry
)

def monitor_request(func):
    """Decorator to monitor API requests."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        status = "success"

        try:
            result = await func(*args, **kwargs)
            return result
        except Exception as e:
            status = "error"
            raise
        finally:
            duration = time.time() - start_time

            # Record metrics
            request_count.labels(
                method=kwargs.get('method', 'unknown'),
                endpoint=kwargs.get('endpoint', 'unknown'),
                status=status
            ).inc()

            request_duration.labels(
                method=kwargs.get('method', 'unknown'),
                endpoint=kwargs.get('endpoint', 'unknown')
            ).observe(duration)

    return wrapper

async def update_session_metrics():
    """Update session-related metrics."""
    from database.connection import get_connection

    async with get_connection() as conn:
        # Count active sessions
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM parlant_session WHERE status = 'active'"
        )
        active_sessions.set(count)

async def update_database_metrics():
    """Update database connection metrics."""
    from database.pool_manager import db_pool

    stats = await db_pool.get_pool_stats()
    database_connections.labels(state='active').set(stats.get('size', 0))
    database_connections.labels(state='idle').set(stats.get('idle_connections', 0))

# Metrics endpoint
from fastapi import Response

@app.get('/metrics')
async def metrics_endpoint():
    """Prometheus metrics endpoint."""
    await update_session_metrics()
    await update_database_metrics()

    return Response(
        generate_latest(registry),
        media_type='text/plain'
    )
```

#### Custom Health Checks
```python
# monitoring/health_checks.py
import asyncio
import time
from typing import Dict, Any, List
from dataclasses import dataclass
from enum import Enum

class HealthStatus(Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"

@dataclass
class HealthCheck:
    name: str
    status: HealthStatus
    response_time_ms: float
    details: Dict[str, Any]
    error: str = None

class HealthMonitor:
    """Comprehensive health monitoring system."""

    def __init__(self):
        self.checks = {
            'database': self._check_database,
            'sim_api': self._check_sim_api,
            'memory': self._check_memory,
            'disk_space': self._check_disk_space,
            'auth_cache': self._check_auth_cache
        }

    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks concurrently."""
        results = {}

        # Run checks concurrently
        tasks = {name: check() for name, check in self.checks.items()}
        completed = await asyncio.gather(*tasks.values(), return_exceptions=True)

        overall_status = HealthStatus.HEALTHY

        for name, result in zip(tasks.keys(), completed):
            if isinstance(result, Exception):
                check_result = HealthCheck(
                    name=name,
                    status=HealthStatus.UNHEALTHY,
                    response_time_ms=0,
                    details={},
                    error=str(result)
                )
            else:
                check_result = result

            results[name] = {
                'status': check_result.status.value,
                'response_time_ms': check_result.response_time_ms,
                'details': check_result.details,
                'error': check_result.error
            }

            # Determine overall status
            if check_result.status == HealthStatus.UNHEALTHY:
                overall_status = HealthStatus.UNHEALTHY
            elif (check_result.status == HealthStatus.DEGRADED and
                  overall_status == HealthStatus.HEALTHY):
                overall_status = HealthStatus.DEGRADED

        return {
            'overall_status': overall_status.value,
            'timestamp': time.time(),
            'checks': results
        }

    async def _check_database(self) -> HealthCheck:
        """Check database connectivity and performance."""
        start_time = time.time()

        try:
            from database.pool_manager import db_pool

            # Test query
            result = await db_pool.execute_query(
                "SELECT COUNT(*) FROM parlant_agent"
            )

            # Get pool stats
            stats = await db_pool.get_pool_stats()

            response_time = (time.time() - start_time) * 1000

            # Determine status based on response time and pool health
            if response_time > 1000:  # > 1 second
                status = HealthStatus.DEGRADED
            elif stats.get('idle_connections', 0) == 0:
                status = HealthStatus.DEGRADED
            else:
                status = HealthStatus.HEALTHY

            return HealthCheck(
                name='database',
                status=status,
                response_time_ms=response_time,
                details={
                    'agent_count': result,
                    'pool_stats': stats
                }
            )

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheck(
                name='database',
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                details={},
                error=str(e)
            )

    async def _check_sim_api(self) -> HealthCheck:
        """Check Sim API connectivity."""
        start_time = time.time()

        try:
            import httpx
            from config.settings import get_settings

            settings = get_settings()

            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{settings.sim_base_url}/health")

            response_time = (time.time() - start_time) * 1000

            if response.status_code == 200:
                status = HealthStatus.HEALTHY
            else:
                status = HealthStatus.DEGRADED

            return HealthCheck(
                name='sim_api',
                status=status,
                response_time_ms=response_time,
                details={
                    'status_code': response.status_code,
                    'url': settings.sim_base_url
                }
            )

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheck(
                name='sim_api',
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                details={},
                error=str(e)
            )

    async def _check_memory(self) -> HealthCheck:
        """Check memory usage."""
        start_time = time.time()

        try:
            import psutil

            process = psutil.Process()
            memory_info = process.memory_info()
            memory_percent = process.memory_percent()

            response_time = (time.time() - start_time) * 1000

            # Determine status based on memory usage
            if memory_percent > 90:
                status = HealthStatus.UNHEALTHY
            elif memory_percent > 70:
                status = HealthStatus.DEGRADED
            else:
                status = HealthStatus.HEALTHY

            return HealthCheck(
                name='memory',
                status=status,
                response_time_ms=response_time,
                details={
                    'rss_mb': memory_info.rss / 1024 / 1024,
                    'vms_mb': memory_info.vms / 1024 / 1024,
                    'percent': memory_percent
                }
            )

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheck(
                name='memory',
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                details={},
                error=str(e)
            )

    async def _check_disk_space(self) -> HealthCheck:
        """Check disk space usage."""
        start_time = time.time()

        try:
            import shutil

            total, used, free = shutil.disk_usage('/')
            used_percent = (used / total) * 100

            response_time = (time.time() - start_time) * 1000

            # Determine status based on disk usage
            if used_percent > 95:
                status = HealthStatus.UNHEALTHY
            elif used_percent > 85:
                status = HealthStatus.DEGRADED
            else:
                status = HealthStatus.HEALTHY

            return HealthCheck(
                name='disk_space',
                status=status,
                response_time_ms=response_time,
                details={
                    'total_gb': total / (1024**3),
                    'used_gb': used / (1024**3),
                    'free_gb': free / (1024**3),
                    'used_percent': used_percent
                }
            )

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheck(
                name='disk_space',
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                details={},
                error=str(e)
            )

    async def _check_auth_cache(self) -> HealthCheck:
        """Check authentication cache health."""
        start_time = time.time()

        try:
            from auth.middleware import get_auth_bridge

            auth_bridge = get_auth_bridge()
            cache_stats = auth_bridge.get_cache_stats()

            response_time = (time.time() - start_time) * 1000

            # Check cache hit ratio and expired sessions
            hit_ratio = cache_stats.get('active_sessions', 0) / max(
                cache_stats.get('total_cached_sessions', 1), 1
            )

            if hit_ratio < 0.5:  # Low hit ratio
                status = HealthStatus.DEGRADED
            elif cache_stats.get('expired_sessions', 0) > 100:
                status = HealthStatus.DEGRADED
            else:
                status = HealthStatus.HEALTHY

            return HealthCheck(
                name='auth_cache',
                status=status,
                response_time_ms=response_time,
                details={
                    'cache_stats': cache_stats,
                    'hit_ratio': hit_ratio
                }
            )

        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheck(
                name='auth_cache',
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time,
                details={},
                error=str(e)
            )

# Health endpoint with detailed monitoring
health_monitor = HealthMonitor()

@app.get('/api/v1/health/detailed')
async def detailed_health_check():
    """Detailed health check endpoint."""
    return await health_monitor.run_all_checks()
```

### 2. Logging Configuration

#### Structured Logging Setup
```python
# logging/config.py
import logging
import json
import sys
from datetime import datetime
from typing import Dict, Any

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }

        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)

        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno',
                          'pathname', 'filename', 'module', 'lineno',
                          'funcName', 'created', 'msecs', 'relativeCreated',
                          'thread', 'threadName', 'processName', 'process',
                          'getMessage', 'exc_info', 'exc_text', 'stack_info']:
                log_entry[key] = value

        return json.dumps(log_entry)

def setup_logging(log_level: str = "INFO", log_file: str = None):
    """Setup structured logging configuration."""

    # Create formatters
    json_formatter = JSONFormatter()
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # File handler (JSON format)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(json_formatter)
        root_logger.addHandler(file_handler)

    # Silence noisy loggers
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)

# Context manager for adding context to logs
import contextvars
from contextlib import contextmanager

request_context = contextvars.ContextVar('request_context', default={})

@contextmanager
def log_context(**kwargs):
    """Add context to all log messages within this context."""
    token = request_context.set(kwargs)
    try:
        yield
    finally:
        request_context.reset(token)

class ContextFilter(logging.Filter):
    """Add request context to log records."""

    def filter(self, record):
        context = request_context.get({})
        for key, value in context.items():
            setattr(record, key, value)
        return True

# Usage in API middleware
from fastapi import Request
import uuid

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Add request context to all logs."""
    request_id = str(uuid.uuid4())

    with log_context(
        request_id=request_id,
        method=request.method,
        url=str(request.url),
        user_id=getattr(request.state, 'user_id', None)
    ):
        logger = logging.getLogger(__name__)
        logger.info("Request started")

        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        logger.info("Request completed", extra={
            'status_code': response.status_code,
            'duration_ms': duration * 1000
        })

        response.headers['X-Request-ID'] = request_id
        return response
```

### 3. Alerting Configuration

#### Alert Rules
```yaml
# alerts/parlant_alerts.yml
groups:
- name: parlant.rules
  interval: 30s
  rules:

  # Service availability
  - alert: ParlantServiceDown
    expr: up{job="parlant-server"} == 0
    for: 1m
    labels:
      severity: critical
      service: parlant-server
    annotations:
      summary: "Parlant server is down"
      description: "Parlant server has been down for more than 1 minute"
      runbook_url: "https://docs.sim.com/runbooks/parlant-service-down"

  # High error rate
  - alert: ParlantHighErrorRate
    expr: rate(parlant_http_requests_total{status=~"5.."}[5m]) / rate(parlant_http_requests_total[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
      service: parlant-server
    annotations:
      summary: "High error rate in Parlant server"
      description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

  # High response time
  - alert: ParlantHighLatency
    expr: histogram_quantile(0.95, rate(parlant_http_request_duration_seconds_bucket[5m])) > 1.0
    for: 5m
    labels:
      severity: warning
      service: parlant-server
    annotations:
      summary: "High response time in Parlant server"
      description: "95th percentile latency is {{ $value }}s"

  # Database issues
  - alert: ParlantDatabaseConnectionsHigh
    expr: parlant_database_connections{state="active"} / 20 > 0.8
    for: 3m
    labels:
      severity: warning
      service: parlant-server
    annotations:
      summary: "High database connection usage"
      description: "Database connection pool is {{ $value | humanizePercentage }} full"

  - alert: ParlantDatabaseDown
    expr: parlant_database_connections{state="active"} == 0
    for: 1m
    labels:
      severity: critical
      service: parlant-server
    annotations:
      summary: "Database connections lost"
      description: "No active database connections available"

  # Authentication issues
  - alert: ParlantAuthFailureRate
    expr: rate(parlant_auth_cache_hits_total{result="miss"}[5m]) / rate(parlant_auth_cache_hits_total[5m]) > 0.5
    for: 5m
    labels:
      severity: warning
      service: parlant-server
    annotations:
      summary: "High authentication failure rate"
      description: "Auth cache miss rate is {{ $value | humanizePercentage }}"

  # Memory usage
  - alert: ParlantHighMemoryUsage
    expr: process_resident_memory_bytes{job="parlant-server"} / 1024 / 1024 / 1024 > 2
    for: 5m
    labels:
      severity: warning
      service: parlant-server
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value }}GB"

  # Session management
  - alert: ParlantTooManySessions
    expr: parlant_active_sessions > 1000
    for: 5m
    labels:
      severity: warning
      service: parlant-server
    annotations:
      summary: "High number of active sessions"
      description: "{{ $value }} active sessions"
```

#### Slack Alert Integration
```python
# alerting/slack.py
import asyncio
import json
from typing import Dict, Any
import httpx

class SlackAlerter:
    """Send alerts to Slack webhook."""

    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url

    async def send_alert(
        self,
        title: str,
        message: str,
        severity: str = "warning",
        details: Dict[str, Any] = None
    ):
        """Send alert to Slack."""

        color_map = {
            "critical": "danger",
            "warning": "warning",
            "info": "good"
        }

        payload = {
            "attachments": [
                {
                    "color": color_map.get(severity, "warning"),
                    "title": title,
                    "text": message,
                    "fields": [],
                    "footer": "Parlant Integration Bridge",
                    "ts": int(asyncio.get_event_loop().time())
                }
            ]
        }

        # Add detail fields
        if details:
            for key, value in details.items():
                payload["attachments"][0]["fields"].append({
                    "title": key.replace('_', ' ').title(),
                    "value": str(value),
                    "short": True
                })

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.webhook_url,
                    json=payload,
                    timeout=10.0
                )
                response.raise_for_status()
        except Exception as e:
            logging.error(f"Failed to send Slack alert: {e}")

# Usage in health monitoring
slack_alerter = SlackAlerter(os.getenv('SLACK_WEBHOOK_URL'))

async def check_and_alert():
    """Check health and send alerts if needed."""
    health_status = await health_monitor.run_all_checks()

    if health_status['overall_status'] != 'healthy':
        await slack_alerter.send_alert(
            title="🚨 Parlant Service Health Alert",
            message=f"Service status: {health_status['overall_status']}",
            severity="critical" if health_status['overall_status'] == 'unhealthy' else "warning",
            details={
                'timestamp': health_status['timestamp'],
                'failed_checks': [
                    name for name, check in health_status['checks'].items()
                    if check['status'] != 'healthy'
                ]
            }
        )
```

## Performance Monitoring

### 1. Performance Metrics Dashboard

#### Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "Parlant Integration Bridge",
    "tags": ["parlant", "integration"],
    "timezone": "utc",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(parlant_http_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(parlant_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(parlant_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(parlant_http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors/sec"
          },
          {
            "expr": "rate(parlant_http_requests_total{status=~\"4..\"}[5m])",
            "legendFormat": "4xx errors/sec"
          }
        ]
      },
      {
        "title": "Active Sessions",
        "type": "singlestat",
        "targets": [
          {
            "expr": "parlant_active_sessions",
            "legendFormat": "Sessions"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "parlant_database_connections{state=\"active\"}",
            "legendFormat": "Active"
          },
          {
            "expr": "parlant_database_connections{state=\"idle\"}",
            "legendFormat": "Idle"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes / 1024 / 1024",
            "legendFormat": "RSS (MB)"
          }
        ]
      }
    ]
  }
}
```

### 2. Performance Testing

#### Load Testing Script
```python
# tests/performance/load_test.py
import asyncio
import aiohttp
import time
import statistics
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class TestResult:
    url: str
    status_code: int
    response_time: float
    error: str = None

class LoadTester:
    """Load testing for Parlant API endpoints."""

    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }

    async def single_request(self, session: aiohttp.ClientSession, url: str) -> TestResult:
        """Execute single HTTP request."""
        start_time = time.time()

        try:
            async with session.get(url, headers=self.headers) as response:
                response_time = time.time() - start_time
                return TestResult(
                    url=url,
                    status_code=response.status,
                    response_time=response_time
                )
        except Exception as e:
            response_time = time.time() - start_time
            return TestResult(
                url=url,
                status_code=0,
                response_time=response_time,
                error=str(e)
            )

    async def load_test(
        self,
        endpoint: str,
        concurrent_requests: int = 10,
        total_requests: int = 100
    ) -> Dict[str, Any]:
        """Execute load test against endpoint."""

        url = f"{self.base_url}{endpoint}"
        results: List[TestResult] = []

        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(concurrent_requests)

        async def bounded_request(session):
            async with semaphore:
                return await self.single_request(session, url)

        # Execute requests
        connector = aiohttp.TCPConnector(limit=100)
        async with aiohttp.ClientSession(connector=connector) as session:
            tasks = [bounded_request(session) for _ in range(total_requests)]
            results = await asyncio.gather(*tasks)

        # Analyze results
        successful_results = [r for r in results if r.status_code == 200]
        error_results = [r for r in results if r.status_code != 200]

        response_times = [r.response_time for r in successful_results]

        return {
            'endpoint': endpoint,
            'total_requests': total_requests,
            'concurrent_requests': concurrent_requests,
            'successful_requests': len(successful_results),
            'failed_requests': len(error_results),
            'success_rate': len(successful_results) / total_requests,
            'response_times': {
                'min': min(response_times) if response_times else 0,
                'max': max(response_times) if response_times else 0,
                'mean': statistics.mean(response_times) if response_times else 0,
                'median': statistics.median(response_times) if response_times else 0,
                'p95': statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else 0
            },
            'errors': [{'status': r.status_code, 'error': r.error} for r in error_results[:10]]
        }

async def run_load_tests():
    """Run comprehensive load tests."""
    tester = LoadTester('http://localhost:8001', 'test_token')

    test_scenarios = [
        ('/health', 50, 500),  # Health check - high load
        ('/api/v1/agents', 10, 100),  # Agent listing - medium load
        ('/api/v1/auth/status', 20, 200),  # Auth status - medium load
    ]

    results = []
    for endpoint, concurrent, total in test_scenarios:
        print(f"Testing {endpoint}...")
        result = await tester.load_test(endpoint, concurrent, total)
        results.append(result)

        print(f"  Success rate: {result['success_rate']:.2%}")
        print(f"  Mean response time: {result['response_times']['mean']:.3f}s")
        print(f"  95th percentile: {result['response_times']['p95']:.3f}s")
        print()

    return results

if __name__ == '__main__':
    asyncio.run(run_load_tests())
```

## Operational Procedures

### 1. Backup and Recovery

#### Automated Backup Script
```bash
#!/bin/bash
# backup_and_monitor.sh - Automated backup with health monitoring

set -e

BACKUP_DIR="/opt/parlant/backups"
LOG_FILE="/var/log/parlant/backup.log"
RETENTION_DAYS=7
S3_BUCKET="sim-parlant-backups"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Health check before backup
health_check() {
    log "Performing health check..."

    if ! curl -f http://localhost:8001/health >/dev/null 2>&1; then
        log "ERROR: Service health check failed"
        return 1
    fi

    if ! psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        log "ERROR: Database health check failed"
        return 1
    fi

    log "Health checks passed"
    return 0
}

# Create backup
create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/parlant_backup_$timestamp.sql"

    log "Starting database backup..."

    pg_dump "$DATABASE_URL" \
        --verbose \
        --clean \
        --no-owner \
        --no-privileges \
        --format=plain \
        --file="$backup_file"

    # Compress backup
    gzip "$backup_file"
    backup_file="${backup_file}.gz"

    log "Backup created: $backup_file"

    # Upload to S3
    if [ -n "$S3_BUCKET" ]; then
        aws s3 cp "$backup_file" \
            "s3://$S3_BUCKET/parlant/$(date +%Y/%m/%d)/" || log "S3 upload failed"
    fi

    echo "$backup_file"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
    log "Cleanup completed"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"

    log "Verifying backup integrity..."

    # Create temporary test database
    local test_db="parlant_backup_test_$(date +%s)"
    createdb "$test_db" || { log "Failed to create test database"; return 1; }

    # Restore backup to test database
    if gunzip -c "$backup_file" | psql "$test_db" >/dev/null 2>&1; then
        log "Backup verification successful"
        dropdb "$test_db"
        return 0
    else
        log "ERROR: Backup verification failed"
        dropdb "$test_db" 2>/dev/null || true
        return 1
    fi
}

# Main backup process
main() {
    log "Starting backup process..."

    # Check if service is healthy
    if ! health_check; then
        log "ERROR: Health check failed, aborting backup"
        exit 1
    fi

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Create backup
    backup_file=$(create_backup)

    # Verify backup
    if verify_backup "$backup_file"; then
        log "Backup process completed successfully"
    else
        log "ERROR: Backup verification failed"
        exit 1
    fi

    # Cleanup old backups
    cleanup_old_backups

    log "Backup process finished"
}

main "$@"
```

### 2. Incident Response Procedures

#### Service Restart Procedure
```bash
#!/bin/bash
# restart_service.sh - Safe service restart procedure

set -e

SERVICE_NAME="parlant-server"
LOG_FILE="/var/log/parlant/restart.log"
HEALTH_CHECK_URL="http://localhost:8001/health"
MAX_WAIT_TIME=60

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

wait_for_service() {
    local wait_time=0

    log "Waiting for service to become healthy..."

    while [ $wait_time -lt $MAX_WAIT_TIME ]; do
        if curl -f "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
            log "Service is healthy"
            return 0
        fi

        sleep 5
        wait_time=$((wait_time + 5))
        log "Waiting... ($wait_time/${MAX_WAIT_TIME}s)"
    done

    log "ERROR: Service failed to become healthy within $MAX_WAIT_TIME seconds"
    return 1
}

restart_service() {
    log "Starting graceful restart of $SERVICE_NAME..."

    # Check if service is running
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "Service is running, performing graceful restart..."

        # Graceful restart
        systemctl reload "$SERVICE_NAME" || {
            log "Reload failed, performing full restart..."
            systemctl restart "$SERVICE_NAME"
        }
    else
        log "Service is not running, starting..."
        systemctl start "$SERVICE_NAME"
    fi

    # Wait for service to be healthy
    if wait_for_service; then
        log "Service restart completed successfully"
        return 0
    else
        log "ERROR: Service restart failed"
        return 1
    fi
}

# Pre-restart checks
pre_restart_checks() {
    log "Performing pre-restart checks..."

    # Check disk space
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log "WARNING: Disk usage is high: ${disk_usage}%"
    fi

    # Check memory
    local mem_usage=$(free | grep '^Mem' | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$mem_usage" -gt 90 ]; then
        log "WARNING: Memory usage is high: ${mem_usage}%"
    fi

    # Check database connectivity
    if ! psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        log "ERROR: Cannot connect to database"
        return 1
    fi

    log "Pre-restart checks passed"
    return 0
}

# Post-restart validation
post_restart_validation() {
    log "Performing post-restart validation..."

    # Check critical endpoints
    local endpoints=(
        "/health"
        "/api/v1/auth/status"
        "/metrics"
    )

    for endpoint in "${endpoints[@]}"; do
        local url="${HEALTH_CHECK_URL%/health}${endpoint}"
        if ! curl -f "$url" >/dev/null 2>&1; then
            log "ERROR: Endpoint $endpoint is not responding"
            return 1
        fi
    done

    log "Post-restart validation passed"
    return 0
}

main() {
    log "=== Parlant Service Restart Procedure ==="

    if pre_restart_checks && restart_service && post_restart_validation; then
        log "Service restart procedure completed successfully"
        exit 0
    else
        log "ERROR: Service restart procedure failed"
        exit 1
    fi
}

main "$@"
```

This comprehensive troubleshooting and monitoring guide provides the tools and procedures necessary to maintain a healthy, performant Sim-Parlant Integration Bridge in production environments.