# Error Taxonomy Reference

## Complete Error Classification System

This document provides a comprehensive reference for all error categories, subcategories, severity levels, and recovery strategies in the Universal Tool Adapter Error Handling System.

## Primary Error Categories

### TOOL_ADAPTER
Errors related to tool interface adaptation and compatibility.

**Subcategories:**
- `interface_mismatch` - Tool API doesn't match expected interface
- `parameter_mapping` - Parameter transformation failures
- `response_transformation` - Response format conversion issues
- `schema_validation` - Schema validation failures
- `version_compatibility` - Version incompatibility issues

**Common Causes:**
- Tool API changes
- Version mismatches
- Schema evolution
- Configuration errors

**Default Recovery:** Fallback to alternative adapter or cached data

### TOOL_EXECUTION
Errors during actual tool operation execution.

**Subcategories:**
- `timeout` - Operation exceeded time limits
- `permission_denied` - Insufficient permissions
- `resource_exhausted` - Tool resources unavailable
- `invalid_state` - Tool in invalid state for operation
- `dependency_failure` - Required dependency unavailable
- `data_corruption` - Data integrity issues

**Common Causes:**
- Network issues
- Resource constraints
- Permission changes
- Data quality problems

**Default Recovery:** Retry with exponential backoff

### TOOL_AUTHENTICATION
Authentication and authorization related errors.

**Subcategories:**
- `invalid_credentials` - Credentials are invalid
- `token_expired` - Authentication token expired
- `insufficient_permissions` - Insufficient access rights
- `oauth_failure` - OAuth flow failures
- `api_key_invalid` - API key issues
- `rate_limit_exceeded` - API rate limits hit

**Common Causes:**
- Expired credentials
- Permission changes
- Rate limiting
- Configuration errors

**Default Recovery:** Token refresh or re-authentication

### TOOL_VALIDATION
Input/output validation failures.

**Subcategories:**
- `input_validation` - Input parameter validation failures
- `output_validation` - Output format validation issues
- `schema_mismatch` - Data schema mismatches
- `constraint_violation` - Business rule violations
- `business_rule_violation` - Business logic constraint failures

**Common Causes:**
- Invalid user input
- Data format changes
- Schema evolution
- Business rule updates

**Default Recovery:** Input sanitization and retry

### SYSTEM_RESOURCE
System-level resource constraint errors.

**Subcategories:**
- `memory_exhausted` - Insufficient memory
- `cpu_overload` - CPU resources exhausted
- `disk_full` - Disk space unavailable
- `handle_exhausted` - System handles depleted
- `connection_pool_full` - Database connections exhausted

**Common Causes:**
- High system load
- Memory leaks
- Resource configuration issues
- Unexpected traffic spikes

**Default Recovery:** Graceful degradation and resource cleanup

### SYSTEM_NETWORK
Network-related connectivity issues.

**Subcategories:**
- `connection_refused` - Connection refused by target
- `timeout` - Network operation timeout
- `dns_resolution` - DNS resolution failures
- `ssl_handshake` - SSL/TLS handshake errors
- `proxy_error` - Proxy configuration issues
- `firewall_blocked` - Firewall blocking connection

**Common Causes:**
- Network infrastructure issues
- DNS problems
- Security policies
- Configuration errors

**Default Recovery:** Retry with different endpoints or fallback

### INTEGRATION_API
API integration specific errors.

**Subcategories:**
- `endpoint_not_found` - API endpoint not available
- `method_not_allowed` - HTTP method not supported
- `payload_too_large` - Request payload exceeds limits
- `unsupported_media_type` - Content type not supported
- `api_version_mismatch` - API version incompatibility

**Common Causes:**
- API changes
- Configuration errors
- Version mismatches
- Rate limiting

**Default Recovery:** Fallback to compatible API version

### USER_INPUT
User input validation and processing errors.

**Subcategories:**
- `invalid_format` - Input format is invalid
- `missing_required_field` - Required fields missing
- `value_out_of_range` - Values outside allowed range
- `unsupported_operation` - Operation not supported
- `malformed_request` - Request structure invalid

**Common Causes:**
- User input errors
- Client-side validation bypass
- API misuse
- Documentation gaps

**Default Recovery:** Input validation and user guidance

### AGENT_REASONING
AI agent reasoning and decision-making errors.

**Subcategories:**
- `tool_selection_failed` - Unable to select appropriate tool
- `parameter_inference_failed` - Cannot infer required parameters
- `goal_unreachable` - Cannot achieve specified goal
- `logical_contradiction` - Contradictory requirements
- `infinite_loop_detected` - Reasoning loop detected

**Common Causes:**
- Ambiguous requirements
- Insufficient context
- Conflicting constraints
- Model limitations

**Default Recovery:** Fallback to simpler approach or human handoff

### EXTERNAL_SERVICE
External service integration errors.

**Subcategories:**
- `service_unavailable` - External service down
- `api_error` - External API errors
- `authentication_failed` - External auth failures
- `response_invalid` - Invalid response format
- `service_deprecated` - Service version deprecated

**Common Causes:**
- Service outages
- API changes
- Network issues
- Configuration problems

**Default Recovery:** Circuit breaker and fallback services

## Severity Levels

### TRACE
**Usage:** Detailed debugging information for development
**Processing:** Log only, no alerts
**User Impact:** None
**Example:** Parameter value logging

### DEBUG
**Usage:** Development debugging information
**Processing:** Log only, no alerts
**User Impact:** None
**Example:** Internal state changes

### INFO
**Usage:** Informational status messages
**Processing:** Log and optional notification
**User Impact:** None
**Example:** Operation completion status

### WARNING
**Usage:** Potential issues that don't block execution
**Processing:** Log, possible alert based on frequency
**User Impact:** Minimal
**Example:** Deprecated API usage

### ERROR
**Usage:** Errors requiring attention but system continues
**Processing:** Log, alert, attempt recovery
**User Impact:** Single operation affected
**Example:** Tool execution timeout

### CRITICAL
**Usage:** Errors requiring immediate attention
**Processing:** Log, immediate alert, attempt recovery, possible escalation
**User Impact:** Multiple operations or users affected
**Example:** Database connection failure

### FATAL
**Usage:** System-breaking errors requiring shutdown
**Processing:** Log, immediate alert, escalate, possible system shutdown
**User Impact:** System-wide impact
**Example:** Critical security breach

## Impact Levels

### NONE
- No user or system impact
- Background processes only
- No immediate action required

### LOW
- Single user affected
- Single operation impacted
- Temporary inconvenience

### MEDIUM
- Single user, multiple operations
- Temporary performance degradation
- Workarounds available

### HIGH
- Multiple users affected
- Extended performance degradation
- Limited functionality

### CRITICAL
- System-wide impact
- Data loss potential
- Business operations affected

## Recovery Strategies

### NONE
**Description:** No automatic recovery possible
**Use Cases:** Fatal errors, data corruption
**Implementation:** Log error and require manual intervention

### MANUAL
**Description:** Requires manual intervention
**Use Cases:** Configuration errors, permission issues
**Implementation:** Log error with resolution steps

### RETRY
**Description:** Automatic retry with backoff
**Use Cases:** Transient failures, network issues
**Implementation:** Exponential backoff with jitter

### FALLBACK
**Description:** Switch to alternative approach
**Use Cases:** Service unavailable, tool failures
**Implementation:** Use backup tool or cached data

### CIRCUIT_BREAKER
**Description:** Temporarily disable failing component
**Use Cases:** Cascading failures, resource exhaustion
**Implementation:** Open circuit, fail fast, periodic testing

### GRACEFUL_DEGRADATION
**Description:** Continue with reduced functionality
**Use Cases:** Non-critical feature failures
**Implementation:** Disable feature, maintain core functionality

## Error Code Patterns

### Format
`{CATEGORY}_{SUBCATEGORY}_{SEQUENCE}`

Examples:
- `TOOL_EXECUTION_TIMEOUT_001`
- `SYSTEM_RESOURCE_MEMORY_EXHAUSTED_001`
- `INTEGRATION_API_ENDPOINT_NOT_FOUND_001`

### Categories by Prefix
- `TA_` - Tool Adapter errors
- `TE_` - Tool Execution errors
- `TAU_` - Tool Authentication errors
- `TV_` - Tool Validation errors
- `SR_` - System Resource errors
- `SN_` - System Network errors
- `IA_` - Integration API errors
- `UI_` - User Input errors
- `AR_` - Agent Reasoning errors
- `ES_` - External Service errors

## Common Error Patterns

### Pattern: Cascading Tool Failures
**Signature:** Multiple TOOL_EXECUTION errors within short timeframe
**Root Cause:** Upstream dependency failure
**Recovery:** Circuit breaker activation
**Prevention:** Dependency health monitoring

### Pattern: Authentication Storm
**Signature:** Multiple TOOL_AUTHENTICATION errors across tools
**Root Cause:** Expired global credentials
**Recovery:** Global credential refresh
**Prevention:** Proactive token refresh

### Pattern: Resource Exhaustion Cascade
**Signature:** SYSTEM_RESOURCE errors followed by TOOL_EXECUTION timeouts
**Root Cause:** System under high load
**Recovery:** Load shedding and graceful degradation
**Prevention:** Resource monitoring and scaling

### Pattern: Integration Version Mismatch
**Signature:** TOOL_ADAPTER interface_mismatch errors
**Root Cause:** API version changes
**Recovery:** Fallback to compatible version
**Prevention:** API version monitoring

## Error Context Requirements

### Minimum Context
```typescript
{
  operation: string      // What operation was being performed
  component: string      // Which component encountered the error
  timestamp: string      // When the error occurred
}
```

### Recommended Context
```typescript
{
  operation: string
  component: string
  timestamp: string
  userId?: string        // User affected
  workspaceId?: string   // Workspace context
  toolName?: string      // Tool involved
  sessionId?: string     // Session identifier
  requestId?: string     // Request correlation ID
}
```

### Full Context
```typescript
{
  operation: string
  component: string
  timestamp: string
  userId?: string
  workspaceId?: string
  toolName?: string
  sessionId?: string
  requestId?: string
  traceId?: string       // Distributed tracing
  correlationId?: string // Error correlation
  metadata: Record<string, any> // Additional context
}
```

## Error Message Templates

### User-Facing Messages

#### Beginner Level
- Simple, action-oriented
- No technical jargon
- Clear next steps
- Example: "The tool is taking longer than expected. Please try again in a moment."

#### Intermediate Level
- Some technical context
- Guidance for resolution
- Alternative approaches
- Example: "The API request timed out. This usually means the service is busy. Try again or use the simplified option."

#### Advanced Level
- Technical details
- Root cause hints
- Multiple resolution paths
- Example: "HTTP 504 Gateway Timeout from upstream service. Check service status or configure longer timeout."

#### Developer Level
- Full technical details
- Stack traces
- Debugging information
- Example: "ToolExecutionError: API timeout after 30s. Stack: [trace]. Context: {request_id: 123, tool: csv-processor}"

## Monitoring and Alerting Guidelines

### Alert Thresholds

#### Error Rate Alerts
- **Warning:** >0.1 errors/second sustained for 5 minutes
- **Critical:** >0.5 errors/second sustained for 2 minutes
- **Emergency:** >2 errors/second sustained for 1 minute

#### Response Time Alerts
- **Warning:** >5 seconds average for 10 minutes
- **Critical:** >15 seconds average for 5 minutes
- **Emergency:** >30 seconds average for 2 minutes

#### Circuit Breaker Alerts
- **Warning:** Circuit breaker half-open
- **Critical:** Circuit breaker open
- **Emergency:** Multiple circuit breakers open

### Alert Routing

#### By Severity
- **WARNING:** Development team notification
- **ERROR:** Development team + oncall
- **CRITICAL:** Escalation to management
- **EMERGENCY:** All hands, executive notification

#### By Category
- **TOOL_ADAPTER:** Tool integration team
- **SYSTEM_RESOURCE:** Infrastructure team
- **EXTERNAL_SERVICE:** API integration team
- **SECURITY:** Security team immediate notification

This reference provides the complete taxonomy and guidelines for implementing consistent error handling across the Universal Tool Adapter System.