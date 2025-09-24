# Troubleshooting Guide - Workflow to Journey Mapping System

## Overview

This guide provides comprehensive troubleshooting procedures for common issues in the Workflow to Journey Mapping System. Use this guide to diagnose and resolve problems quickly.

## Quick Diagnosis Checklist

### System Health Check (2 minutes)

Run these commands to get a quick system overview:

```bash
# Check service status
curl -f http://localhost:3000/health
curl -f http://localhost:3000/api/v1/conversational-workflows/health

# Check database connectivity
psql -h localhost -U sim_user -d sim_production -c "SELECT 1;"

# Check Redis connectivity
redis-cli ping

# Check Parlant server
curl -H "Authorization: Bearer $PARLANT_API_KEY" $PARLANT_SERVER_URL/health

# Check logs for errors
tail -n 50 /var/log/sim/application.log | grep -i error
```

If any of these fail, jump to the relevant section below.

## Common Issues and Solutions

### 1. Conversational Interface Not Loading

#### Symptoms
- Chat button doesn't appear on workflow pages
- Empty chat panel when clicked
- "Conversational workflows not available" message

#### Diagnosis Steps

```bash
# Check feature flag
curl http://localhost:3000/api/v1/feature-flags | jq '.conversationalWorkflows'

# Check service logs
docker logs sim-app | grep -i conversational

# Verify database tables exist
psql -d sim_production -c "
  SELECT tablename FROM pg_tables
  WHERE tablename LIKE 'conversational_%';
"
```

#### Solutions

**Feature Flag Disabled:**
```bash
# Enable conversational workflows
export CONVERSATIONAL_WORKFLOWS_ENABLED=true
# Restart application
systemctl restart sim-app
```

**Database Tables Missing:**
```bash
# Run migrations
npm run db:migrate
# Verify tables created
npm run db:migrate:status
```

**Service Not Running:**
```bash
# Check process status
ps aux | grep conversational-workflow
# Restart service
systemctl restart conversational-workflow-service
```

### 2. Session Creation Failures

#### Symptoms
- "Failed to create session" errors
- Sessions timeout immediately
- Cannot start workflow conversations

#### Diagnosis Steps

```bash
# Check session creation logs
grep "createConversationalWorkflow" /var/log/sim/application.log | tail -20

# Test session endpoint directly
curl -X POST http://localhost:3000/api/v1/conversational-workflows/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "workflowId": "test-workflow-id",
    "workspaceId": "test-workspace-id"
  }'

# Check Redis connectivity
redis-cli get test-key || echo "Redis connection failed"

# Verify Parlant server
curl -X POST $PARLANT_SERVER_URL/agents/sessions \
  -H "Authorization: Bearer $PARLANT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test", "journey_id": "test"}'
```

#### Solutions

**Redis Connection Issues:**
```bash
# Check Redis status
systemctl status redis
# Restart Redis
systemctl restart redis
# Update Redis configuration
vim /etc/redis/redis.conf
```

**Parlant Server Issues:**
```bash
# Check Parlant server status
docker logs parlant-server

# Verify API key
echo $PARLANT_API_KEY | base64 -d

# Test connectivity
telnet parlant-server-host 8000
```

**Database Connection Issues:**
```bash
# Check database connections
psql -d sim_production -c "
  SELECT count(*) as active_connections, max_conn
  FROM pg_stat_activity, (SELECT setting::int as max_conn FROM pg_settings WHERE name='max_connections') mc;
"

# Kill idle connections if needed
psql -d sim_production -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle' AND state_change < now() - interval '1 hour';
"
```

### 3. Natural Language Processing Failures

#### Symptoms
- Commands not recognized
- "I had trouble processing that request" responses
- High confidence threshold errors

#### Diagnosis Steps

```bash
# Check NLP service logs
grep "NLP" /var/log/sim/application.log | tail -20

# Test NLP endpoint directly
curl -X POST http://localhost:3000/api/v1/conversational-workflows/nlp/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"input": "start the workflow"}'

# Check NLP model loading
ls -la /models/nlp/
du -sh /models/nlp/

# Verify OpenAI API key (if using OpenAI)
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

#### Solutions

**Low Confidence Scores:**
```bash
# Lower confidence threshold temporarily
export NLP_CONFIDENCE_THRESHOLD=0.6
systemctl restart conversational-workflow-service

# Check for common typos in commands
grep -i "command not recognized" /var/log/sim/application.log | sort | uniq -c
```

**Model Loading Issues:**
```bash
# Download models
wget -O /models/nlp/model.bin https://your-model-repository.com/model.bin

# Set correct permissions
chown -R sim:sim /models/nlp/
chmod -R 755 /models/nlp/
```

**OpenAI API Issues:**
```bash
# Check API quota
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/usage

# Test with different model
export NLP_MODEL=gpt-3.5-turbo-instruct
```

### 4. WebSocket Connection Issues

#### Symptoms
- Real-time updates not working
- "Connection failed" in browser console
- Progress not syncing between visual and chat modes

#### Diagnosis Steps

```bash
# Test WebSocket endpoint
wscat -c ws://localhost:3000/socket.io/?transport=websocket

# Check connection limits
netstat -an | grep :3000 | wc -l

# Monitor WebSocket logs
grep -i websocket /var/log/sim/application.log | tail -20

# Check browser console
# Open browser dev tools → Console → look for WebSocket errors
```

#### Solutions

**Connection Limits Exceeded:**
```bash
# Increase connection limits
echo "WS_MAX_CONNECTIONS=10000" >> /etc/sim/environment
systemctl restart sim-app

# Check system limits
ulimit -n
# Increase if needed
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
```

**Proxy Configuration Issues:**
```nginx
# Update NGINX configuration
location /socket.io/ {
    proxy_pass http://sim-app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

**Firewall Blocking:**
```bash
# Allow WebSocket connections
ufw allow from any to any port 3000
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

### 5. Workflow Execution Errors

#### Symptoms
- Workflows get stuck in "running" state
- Steps fail with timeout errors
- Tool executions fail

#### Diagnosis Steps

```bash
# Check workflow execution logs
grep "executeWorkflowNode" /var/log/sim/application.log | tail -20

# Check active workflow sessions
psql -d sim_production -c "
  SELECT session_id, execution_status, current_node_id, error_count, last_updated_at
  FROM conversational_workflow_sessions
  WHERE execution_status IN ('running', 'failed')
  ORDER BY last_updated_at DESC;
"

# Test tool adapters
curl -X POST http://localhost:3000/api/v1/tools/test \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Check for zombie processes
ps aux | grep -E "(workflow|parlant)" | grep -v grep
```

#### Solutions

**Stuck Sessions:**
```sql
-- Clean up stuck sessions
UPDATE conversational_workflow_sessions
SET execution_status = 'failed',
    updated_at = NOW(),
    last_error = '{"error": "Session cleanup", "reason": "Stuck session resolved by admin"}'
WHERE execution_status = 'running'
  AND updated_at < NOW() - INTERVAL '1 hour';
```

**Tool Adapter Issues:**
```bash
# Restart tool adapter service
systemctl restart tool-adapter-service

# Check tool configurations
curl http://localhost:3000/api/v1/tools | jq '.[] | select(.status != "healthy")'

# Test specific tool
curl -X POST http://localhost:3000/api/v1/tools/openai/test \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Timeout Issues:**
```bash
# Increase timeouts
export WORKFLOW_EXECUTION_TIMEOUT=60000
export TOOL_EXECUTION_TIMEOUT=30000
systemctl restart sim-app
```

### 6. Performance Issues

#### Symptoms
- Slow response times
- High CPU/memory usage
- Timeouts under load

#### Diagnosis Steps

```bash
# Check system resources
top -p $(pgrep -f sim-app)
free -h
df -h

# Monitor database performance
psql -d sim_production -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  ORDER BY total_time DESC
  LIMIT 10;
"

# Check cache hit rates
redis-cli info stats | grep keyspace_hits

# Profile application
node --prof app.js
# Run load test
# node --prof-process isolate-*.log > processed.txt
```

#### Solutions

**Database Performance:**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_cws_user_status
ON conversational_workflow_sessions(user_id, execution_status);

-- Update table statistics
ANALYZE conversational_workflow_sessions;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 1000;
```

**Memory Issues:**
```bash
# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean up sessions more frequently
export SESSION_CLEANUP_INTERVAL_MS=60000

# Implement session limits per user
export MAX_SESSIONS_PER_USER=5
```

**Cache Optimization:**
```bash
# Increase Redis memory
redis-cli config set maxmemory 2gb
redis-cli config set maxmemory-policy allkeys-lru

# Warm cache with common queries
curl http://localhost:3000/api/v1/conversational-workflows/warm-cache
```

## Error Message Reference

### Application Errors

#### "Session not found"
**Cause:** Session expired or invalid session ID
**Solution:**
- Check session timeout settings
- Verify Redis is running and accessible
- Create new session

#### "Workflow mapping not found"
**Cause:** Workflow not converted to journey format
**Solution:**
- Run workflow conversion: `POST /workflows/{id}/convert`
- Check workflow exists and is accessible
- Verify user permissions

#### "Command processing failed"
**Cause:** NLP processing error or invalid command
**Solution:**
- Check NLP service status
- Verify command syntax
- Review confidence thresholds

#### "Parlant integration error"
**Cause:** Parlant server communication failure
**Solution:**
- Verify Parlant server is running
- Check API key validity
- Test network connectivity

### Database Errors

#### "Connection pool exhausted"
**Cause:** Too many concurrent database connections
**Solution:**
```javascript
// Increase pool size
const dbConfig = {
  pool: {
    min: 10,
    max: 50,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  }
}
```

#### "Relation does not exist"
**Cause:** Database migrations not run
**Solution:**
```bash
npm run db:migrate
npm run db:migrate:status
```

### Network Errors

#### "ECONNREFUSED"
**Cause:** Service not running or wrong port
**Solution:**
- Check service status: `systemctl status service-name`
- Verify port configuration
- Check firewall rules

#### "ETIMEDOUT"
**Cause:** Network timeout
**Solution:**
- Increase timeout values
- Check network connectivity
- Verify DNS resolution

## Monitoring and Alerting

### Key Metrics to Monitor

```bash
# Application metrics
curl -s http://localhost:9090/metrics | grep -E "(conversational_sessions_total|command_processing_duration|nlp_confidence_score)"

# System metrics
iostat -x 1 5
vmstat 1 5
netstat -tuln | grep -E "(3000|5432|6379)"
```

### Log Analysis

```bash
# Error analysis
grep -E "(ERROR|FATAL)" /var/log/sim/application.log | tail -20

# Performance analysis
grep "slow query" /var/log/postgresql/postgresql.log

# Session analysis
grep "session created\|session expired" /var/log/sim/application.log | \
  awk '{print $1, $2}' | uniq -c
```

### Automated Health Checks

```bash
#!/bin/bash
# health-check.sh

ERRORS=0

# Check application health
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "ERROR: Application health check failed"
    ((ERRORS++))
fi

# Check conversational workflows
if ! curl -f http://localhost:3000/api/v1/conversational-workflows/health > /dev/null 2>&1; then
    echo "ERROR: Conversational workflows health check failed"
    ((ERRORS++))
fi

# Check database
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "ERROR: Database not ready"
    ((ERRORS++))
fi

# Check Redis
if ! redis-cli ping > /dev/null 2>&1; then
    echo "ERROR: Redis not responding"
    ((ERRORS++))
fi

if [ $ERRORS -gt 0 ]; then
    echo "Health check failed with $ERRORS errors"
    exit 1
else
    echo "All health checks passed"
    exit 0
fi
```

## Emergency Procedures

### System Recovery

#### Complete System Restart
```bash
# Stop all services
systemctl stop sim-app
systemctl stop conversational-workflow-service
systemctl stop nginx

# Clear Redis cache
redis-cli flushall

# Start services in order
systemctl start postgresql
systemctl start redis
systemctl start conversational-workflow-service
systemctl start sim-app
systemctl start nginx

# Verify all services
./health-check.sh
```

#### Database Recovery
```bash
# Restore from backup
pg_restore -h localhost -U postgres -d sim_production /backups/latest.dump

# Run migrations
npm run db:migrate

# Verify data integrity
psql -d sim_production -c "SELECT count(*) FROM conversational_workflow_sessions;"
```

### Rollback Procedures

#### Application Rollback
```bash
# Rollback to previous version
docker pull sim/app:previous-version
docker stop sim-app
docker run --name sim-app sim/app:previous-version

# Rollback database migrations (if needed)
npm run db:rollback
```

#### Configuration Rollback
```bash
# Restore previous configuration
cp /etc/sim/config.backup.json /etc/sim/config.json
systemctl restart sim-app
```

## Getting Help

### Internal Debugging

1. **Enable Debug Logging:**
```bash
export DEBUG=conversational-workflows:*
export LOG_LEVEL=debug
systemctl restart sim-app
```

2. **Capture Network Traffic:**
```bash
tcpdump -i any -w debug.pcap port 3000 or port 5432 or port 6379
```

3. **Memory Dump Analysis:**
```bash
# Generate heap dump
kill -USR2 $(pgrep -f sim-app)
# Analyze with Chrome DevTools
```

### External Support

#### Information to Collect

Before contacting support, gather:

- System information: `uname -a`
- Application version: `curl http://localhost:3000/version`
- Recent logs: `journalctl -u sim-app --since="1 hour ago"`
- Configuration (sanitized): Remove secrets from config files
- Error reproduction steps
- Screenshots of error messages

#### Support Channels

- **Technical Issues:** Create issue in project repository
- **Emergency:** Contact on-call support
- **Documentation:** Check FAQ and user guides first

### Preventive Measures

#### Regular Maintenance

```bash
#!/bin/bash
# weekly-maintenance.sh

# Clean up old sessions
psql -d sim_production -c "
  DELETE FROM conversational_workflow_sessions
  WHERE updated_at < NOW() - INTERVAL '7 days'
  AND execution_status IN ('completed', 'cancelled', 'failed');
"

# Clean up old conversation history
psql -d sim_production -c "
  DELETE FROM conversation_turns
  WHERE created_at < NOW() - INTERVAL '30 days';
"

# Vacuum database
psql -d sim_production -c "VACUUM ANALYZE;"

# Clean Redis cache
redis-cli eval "return redis.call('del',unpack(redis.call('keys',ARGV[1])))" 0 "session:expired:*"

# Rotate logs
logrotate /etc/logrotate.d/sim-app

echo "Maintenance completed at $(date)"
```

#### Monitoring Alerts

Set up alerts for:
- High error rates (>5% over 5 minutes)
- Response time increases (>2s 95th percentile)
- Memory usage (>80% of available)
- Database connection usage (>80% of pool)
- Failed conversational sessions (>10% failure rate)

This troubleshooting guide should help resolve most common issues with the Workflow to Journey Mapping System. Keep it updated as new issues are discovered and resolved.

---

*Troubleshooting Guide last updated: $(date)*