# API Reference - Workflow to Journey Mapping System

## Overview

This document provides comprehensive API reference for all endpoints, types, and interfaces in the Workflow to Journey Mapping System. The API follows RESTful conventions and provides both HTTP and WebSocket interfaces for real-time communication.

## Base URL

```
Production:  https://api.sim.dev/v1/conversational-workflows
Development: http://localhost:3000/v1/conversational-workflows
```

## Authentication

All API endpoints require authentication using Bearer tokens:

```http
Authorization: Bearer {your_access_token}
```

The system integrates with Better Auth and respects workspace isolation.

## Core Endpoints

### 1. Workflow Conversion

#### Convert Workflow to Journey

Convert an existing ReactFlow workflow into a Parlant journey for conversational interaction.

**Endpoint:** `POST /workflows/{workflowId}/convert`

**Parameters:**
- `workflowId` (path): The ID of the workflow to convert

**Request Body:**
```typescript
{
  workspaceId: string
  conversationalConfig?: ConversationalConfig
  executionConfig?: WorkflowExecutionConfig
  customMappings?: NodeStateMapping[]
}
```

**Response:**
```typescript
{
  success: boolean
  journeyId: string
  mapping: WorkflowToJourneyMapping
  validationResults: ValidationResult[]
  estimatedConversionTime: number
}
```

**Example:**
```http
POST /workflows/wf_123456/convert
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "workspaceId": "ws_789012",
  "conversationalConfig": {
    "personalityProfile": "helpful-assistant",
    "communicationStyle": "friendly",
    "verbosityLevel": "normal",
    "showProgress": true,
    "explainSteps": true
  },
  "executionConfig": {
    "mode": "step-by-step",
    "autoApproval": false,
    "timeoutMs": 30000
  }
}
```

#### Get Workflow Mapping

Retrieve the current workflow-to-journey mapping for a workflow.

**Endpoint:** `GET /workflows/{workflowId}/mapping`

**Response:**
```typescript
{
  mapping: WorkflowToJourneyMapping | null
  isActive: boolean
  lastUpdated: string
  conversionMetrics: {
    totalNodes: number
    mappedNodes: number
    unmappedNodes: string[]
    supportedNodeTypes: string[]
  }
}
```

### 2. Conversational Workflow Sessions

#### Create Conversational Workflow Session

Start a new conversational session for a workflow.

**Endpoint:** `POST /sessions`

**Request Body:**
```typescript
{
  workflowId: string
  workspaceId: string
  conversationalConfig?: ConversationalConfig
  executionConfig?: WorkflowExecutionConfig
  initialInput?: Record<string, any>
  sessionMetadata?: Record<string, any>
}
```

**Response:**
```typescript
{
  sessionId: string
  journeyId: string
  initialState: ConversationalWorkflowState
  welcomeMessage: string
  availableCommands: string[]
  socketEndpoint: string
}
```

#### Get Session State

Get the current state of a conversational workflow session.

**Endpoint:** `GET /sessions/{sessionId}`

**Response:**
```typescript
{
  currentState: ConversationalWorkflowState
  recentHistory: ConversationTurn[]
  availableActions: AvailableAction[]
  progressSummary: string
  sessionMetrics: SessionMetrics
}
```

#### Update Session Configuration

Update the configuration of an active session.

**Endpoint:** `PUT /sessions/{sessionId}/config`

**Request Body:**
```typescript
{
  conversationalConfig?: Partial<ConversationalConfig>
  executionConfig?: Partial<WorkflowExecutionConfig>
}
```

#### Terminate Session

Terminate a conversational workflow session.

**Endpoint:** `DELETE /sessions/{sessionId}`

**Response:**
```typescript
{
  success: boolean
  finalState: ConversationalWorkflowState
  sessionSummary: {
    duration: number
    completedSteps: number
    totalSteps: number
    errorCount: number
  }
}
```

### 3. Natural Language Processing

#### Process Natural Language Command

Process a natural language command within a session context.

**Endpoint:** `POST /sessions/{sessionId}/commands`

**Request Body:**
```typescript
{
  naturalLanguageInput: string
  context?: Record<string, any>
  enableLearning?: boolean
}
```

**Response:**
```typescript
{
  commandProcessed: boolean
  workflowAction: string | null
  agentResponse: string
  updatedState: ConversationalWorkflowState
  suggestedActions: AvailableAction[]
  nlpAnalysis: NLPProcessingResult
  confidence: number
}
```

#### Get NLP Analysis

Get detailed NLP analysis for a given input without executing commands.

**Endpoint:** `POST /nlp/analyze`

**Request Body:**
```typescript
{
  input: string
  sessionId?: string
  context?: Record<string, any>
}
```

**Response:**
```typescript
{
  analysis: NLPProcessingResult
  supportedIntents: string[]
  alternativeInterpretations: {
    intent: string
    confidence: number
    entities: ExtractedEntity[]
  }[]
}
```

### 4. Workflow Execution Control

#### Execute Workflow Command

Execute a specific workflow command programmatically.

**Endpoint:** `POST /sessions/{sessionId}/execute`

**Request Body:**
```typescript
{
  commandType: WorkflowCommandType
  parameters?: Record<string, any>
  confirmationOverride?: boolean
}
```

**Response:**
```typescript
{
  success: boolean
  executionResult: any
  stateChanges: Partial<ConversationalWorkflowState>
  agentResponse: string
  nextActions: AvailableAction[]
}
```

#### Get Workflow Progress

Get detailed progress information for a workflow session.

**Endpoint:** `GET /sessions/{sessionId}/progress`

**Response:**
```typescript
{
  overallProgress: number
  currentStep: {
    nodeId: string
    nodeName: string
    nodeType: string
    status: 'not-started' | 'running' | 'completed' | 'failed'
    startedAt?: string
    completedAt?: string
  }
  completedSteps: WorkflowStep[]
  upcomingSteps: WorkflowStep[]
  executionTimeline: ExecutionEvent[]
  estimatedTimeRemaining?: number
}
```

### 5. Tool Integration

#### List Available Tools

Get all tools available for workflow execution.

**Endpoint:** `GET /tools`

**Query Parameters:**
- `workspaceId` (required): Workspace ID for tool filtering
- `category` (optional): Filter by tool category
- `search` (optional): Search tools by name or description

**Response:**
```typescript
{
  tools: ToolDefinition[]
  categories: string[]
  totalCount: number
}
```

#### Get Tool Details

Get detailed information about a specific tool.

**Endpoint:** `GET /tools/{toolId}`

**Response:**
```typescript
{
  tool: ToolDefinition
  usage: ToolUsageStats
  conversationalDescription: string
  examples: ToolUsageExample[]
  integration: ToolIntegrationInfo
}
```

### 6. Analytics and Monitoring

#### Get Session Analytics

Get analytics data for workflow sessions.

**Endpoint:** `GET /analytics/sessions`

**Query Parameters:**
- `workspaceId` (required): Workspace ID
- `workflowId` (optional): Filter by specific workflow
- `dateFrom` (optional): Start date for analytics
- `dateTo` (optional): End date for analytics

**Response:**
```typescript
{
  metrics: {
    totalSessions: number
    completedSessions: number
    averageCompletionTime: number
    errorRate: number
    userSatisfactionScore?: number
  }
  trends: AnalyticsTrend[]
  popularCommands: CommandUsageStats[]
  performanceMetrics: PerformanceMetrics[]
}
```

#### Get System Health

Get system health and performance metrics.

**Endpoint:** `GET /health`

**Response:**
```typescript
{
  status: 'healthy' | 'degraded' | 'down'
  services: {
    parlantServer: ServiceStatus
    database: ServiceStatus
    redis: ServiceStatus
    socketServer: ServiceStatus
  }
  performance: {
    averageResponseTime: number
    activeSessions: number
    queueLength: number
    errorRate: number
  }
  version: string
  uptime: number
}
```

## WebSocket Events

The system provides real-time updates via WebSocket connections.

### Connection

Connect to the WebSocket endpoint provided in the session creation response:

```javascript
const ws = new WebSocket('wss://api.sim.dev/v1/conversational-workflows/ws');
ws.send(JSON.stringify({
  type: 'auth',
  token: 'Bearer ' + accessToken,
  sessionId: sessionId
}));
```

### Event Types

#### 1. Workflow State Updates

**Event:** `workflow-state-update`

**Payload:**
```typescript
{
  sessionId: string
  updateType: WorkflowUpdateType
  state: ConversationalWorkflowState
  changes: Partial<ConversationalWorkflowState>
  timestamp: string
}
```

#### 2. Agent Messages

**Event:** `agent-message`

**Payload:**
```typescript
{
  sessionId: string
  message: string
  messageType: 'response' | 'notification' | 'error' | 'system'
  metadata?: Record<string, any>
  timestamp: string
}
```

#### 3. Execution Events

**Event:** `execution-event`

**Payload:**
```typescript
{
  sessionId: string
  eventType: 'node-started' | 'node-completed' | 'node-failed' | 'workflow-completed'
  nodeId?: string
  nodeName?: string
  result?: any
  error?: string
  timestamp: string
}
```

#### 4. Input Required

**Event:** `input-required`

**Payload:**
```typescript
{
  sessionId: string
  inputType: 'confirmation' | 'parameter' | 'choice'
  prompt: string
  options?: string[]
  schema?: Record<string, any>
  timeout?: number
  timestamp: string
}
```

## TypeScript Interfaces

### Core Types

```typescript
// Workflow to Journey Mapping
interface WorkflowToJourneyMapping {
  workflowId: string
  journeyId: string
  mappingVersion: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  nodeStateMappings: NodeStateMapping[]
  edgeTransitionMappings: EdgeTransitionMapping[]
  contextVariableMappings: ContextVariableMapping[]
  executionConfig: WorkflowExecutionConfig
  conversationalConfig: ConversationalConfig
}

// Node State Mapping
interface NodeStateMapping {
  nodeId: string
  nodeType: string
  journeyStateId: string
  displayName: string
  description: string
  isStartState: boolean
  isEndState: boolean
  conversationTemplate: string
  userPrompts: string[]
  agentResponses: string[]
  executionTrigger: ExecutionTrigger
  validationRules: ValidationRule[]
}

// Conversational Configuration
interface ConversationalConfig {
  personalityProfile: string
  communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly'
  verbosityLevel: 'minimal' | 'normal' | 'detailed' | 'verbose'
  showProgress: boolean
  explainSteps: boolean
  askForConfirmation: boolean
  provideSuggestions: boolean
  gracefulDegradation: boolean
  fallbackToVisual: boolean
}

// Workflow Execution Configuration
interface WorkflowExecutionConfig {
  mode: 'step-by-step' | 'autonomous' | 'hybrid'
  pausePoints: string[]
  autoApproval: boolean
  timeoutMs: number
  retryPolicy: RetryPolicy
}

// Conversational Workflow State
interface ConversationalWorkflowState {
  workflowId: string
  journeyId: string
  sessionId: string
  currentNodeId: string | null
  currentStateId: string | null
  executionStatus: WorkflowExecutionStatus
  completedNodes: string[]
  failedNodes: string[]
  skippedNodes: string[]
  totalNodes: number
  workflowContext: Record<string, any>
  journeyContext: Record<string, any>
  userInputs: Record<string, any>
  startedAt: Date
  lastUpdatedAt: Date
  estimatedCompletionTime?: Date
  awaitingUserInput: boolean
  currentUserPrompt?: string
  availableActions: AvailableAction[]
  lastError?: WorkflowExecutionError
  errorCount: number
}
```

### Request/Response Types

```typescript
// Session Creation Request
interface CreateConversationalWorkflowRequest {
  workflowId: string
  workspaceId: string
  userId: string
  conversationalConfig: ConversationalConfig
  executionConfig: WorkflowExecutionConfig
  initialInput?: Record<string, any>
  sessionMetadata?: Record<string, any>
}

// Natural Language Command Request
interface ProcessNaturalLanguageCommandRequest {
  sessionId: string
  workflowId: string
  naturalLanguageInput: string
  userId: string
  workspaceId: string
}

// Command Processing Response
interface ProcessNaturalLanguageCommandResponse {
  commandProcessed: boolean
  workflowAction: string | null
  agentResponse: string
  updatedState: ConversationalWorkflowState
  suggestedActions: AvailableAction[]
}
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```typescript
interface APIError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, any>
    retryable: boolean
    timestamp: string
  }
  requestId: string
}
```

### Common Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `INVALID_REQUEST` | Request validation failed | No |
| `SESSION_NOT_FOUND` | Session does not exist | No |
| `WORKFLOW_NOT_FOUND` | Workflow does not exist | No |
| `UNAUTHORIZED` | Invalid authentication | No |
| `FORBIDDEN` | Insufficient permissions | No |
| `MAPPING_FAILED` | Workflow mapping creation failed | Yes |
| `EXECUTION_ERROR` | Workflow execution error | Yes |
| `NLP_PROCESSING_FAILED` | Natural language processing failed | Yes |
| `INTERNAL_SERVER_ERROR` | Unexpected server error | Yes |
| `SERVICE_UNAVAILABLE` | External service unavailable | Yes |
| `RATE_LIMIT_EXCEEDED` | API rate limit exceeded | Yes |

### Error Recovery

For retryable errors, implement exponential backoff:

```javascript
async function apiCallWithRetry(apiCall, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (!error.retryable || attempt === maxRetries) {
        throw error;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Per User**: 100 requests per minute
- **Per Workspace**: 1000 requests per minute
- **Per Session**: 60 commands per minute

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## SDKs and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @sim/conversational-workflows
```

```javascript
import { ConversationalWorkflowClient } from '@sim/conversational-workflows';

const client = new ConversationalWorkflowClient({
  baseURL: 'https://api.sim.dev/v1/conversational-workflows',
  accessToken: 'your_access_token'
});

// Create a session
const session = await client.createSession({
  workflowId: 'wf_123456',
  workspaceId: 'ws_789012'
});

// Process natural language
const result = await client.processCommand(session.sessionId,
  'Start the workflow and notify me when the data processing is complete'
);
```

### Python SDK

```bash
pip install sim-conversational-workflows
```

```python
from sim_conversational_workflows import ConversationalWorkflowClient

client = ConversationalWorkflowClient(
    base_url='https://api.sim.dev/v1/conversational-workflows',
    access_token='your_access_token'
)

# Create a session
session = client.create_session(
    workflow_id='wf_123456',
    workspace_id='ws_789012'
)

# Process natural language
result = client.process_command(
    session['sessionId'],
    'Start the workflow and notify me when the data processing is complete'
)
```

## Testing

### Testing Endpoints

Use the development environment for testing:

```
Base URL: http://localhost:3000/v1/conversational-workflows
```

### Sample Data

The development environment includes sample workflows and test data:

- **Simple Linear Workflow**: `wf_sample_linear`
- **Conditional Workflow**: `wf_sample_conditional`
- **Loop Workflow**: `wf_sample_loop`
- **Complex Integration**: `wf_sample_complex`

### Postman Collection

A Postman collection with all API endpoints and examples is available:

```bash
curl -o workflow-journey-api.postman_collection.json \
  https://api.sim.dev/v1/conversational-workflows/postman-collection
```

---

*API Reference last updated: $(date)*