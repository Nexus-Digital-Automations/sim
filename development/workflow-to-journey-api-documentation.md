# Workflow to Journey Mapping API Documentation
## Comprehensive API Reference for Developers

### Table of Contents
1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Core Endpoints](#core-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Integration Examples](#integration-examples)
7. [SDK Reference](#sdk-reference)

---

## API Overview

The Workflow to Journey Mapping API provides comprehensive endpoints for converting Sim ReactFlow workflows into Parlant journey definitions and managing their execution through conversational interfaces.

**Base URL**: `https://api.sim.co/v1`
**Protocol**: HTTPS
**Format**: JSON

### API Versioning
- **Current Version**: v1
- **Version Header**: `Sim-API-Version: v1`
- **Deprecation Policy**: 6 months advance notice for breaking changes

---

## Authentication

### Bearer Token Authentication

All API requests require authentication using Bearer tokens obtained through the Sim authentication system.

```http
Authorization: Bearer <your_access_token>
Content-Type: application/json
Sim-API-Version: v1
X-Workspace-ID: <workspace_id>
```

### Required Headers

| Header | Description | Required |
|--------|-------------|----------|
| `Authorization` | Bearer token for authentication | Yes |
| `Content-Type` | Must be `application/json` | Yes |
| `Sim-API-Version` | API version (currently `v1`) | Yes |
| `X-Workspace-ID` | Target workspace identifier | Yes |
| `X-Request-ID` | Unique request identifier for tracking | No |

---

## Core Endpoints

### 1. Workflow Analysis

#### `POST /workflows/{workflowId}/analyze`

Analyzes an existing Sim workflow to prepare it for journey conversion.

**Parameters:**
- `workflowId` (path): The unique identifier of the workflow to analyze

**Request Body:**
```json
{
  "analysisOptions": {
    "includeToolDependencies": true,
    "validateIntegrity": true,
    "optimizeForConversation": true,
    "preserveMetadata": true
  },
  "conversionScope": {
    "includeSubworkflows": false,
    "maxComplexity": 100,
    "timeoutSeconds": 30
  }
}
```

**Response:**
```json
{
  "success": true,
  "analysisId": "analysis_123456789",
  "workflowId": "workflow_abc123",
  "analysis": {
    "blocksCount": 15,
    "edgesCount": 18,
    "complexity": 75,
    "entryPoints": ["start_block_1"],
    "exitPoints": ["end_block_1", "end_block_2"],
    "conditionalPaths": [
      {
        "blockId": "condition_block_1",
        "truePath": ["block_2", "block_3"],
        "falsePath": ["block_4", "block_5"]
      }
    ],
    "toolDependencies": [
      {
        "blockId": "api_block_1",
        "toolType": "http_request",
        "adapterAvailable": true,
        "configurationValid": true
      }
    ],
    "parallelSections": [
      {
        "id": "parallel_1",
        "blocks": ["block_6", "block_7", "block_8"],
        "convergencePoint": "block_9"
      }
    ],
    "loopStructures": [
      {
        "id": "loop_1",
        "entryBlock": "block_10",
        "bodyBlocks": ["block_11", "block_12"],
        "exitCondition": "block_13"
      }
    ]
  },
  "conversionFeasibility": {
    "canConvert": true,
    "confidence": 0.95,
    "blockedBy": [],
    "warnings": [
      "Complex condition logic in block_condition_1 may require user clarification"
    ]
  },
  "metadata": {
    "analysisTimestamp": "2024-01-15T10:30:00Z",
    "analysisVersion": "1.2.0",
    "processingTimeMs": 1250
  }
}
```

### 2. Journey Conversion

#### `POST /workflows/{workflowId}/convert-to-journey`

Converts an analyzed workflow into a Parlant journey definition.

**Parameters:**
- `workflowId` (path): The workflow to convert

**Request Body:**
```json
{
  "analysisId": "analysis_123456789",
  "conversionOptions": {
    "journeyName": "Customer Onboarding Process",
    "journeyDescription": "Automated customer onboarding with document verification",
    "conversationalStyle": "professional",
    "includeProgressIndicators": true,
    "enableUserInterruption": true,
    "optimizationLevel": "balanced"
  },
  "agentConfiguration": {
    "agentName": "Onboarding Assistant",
    "personality": "helpful and thorough",
    "capabilities": ["document_processing", "verification", "communication"],
    "responseLength": "concise"
  }
}
```

**Response:**
```json
{
  "success": true,
  "conversionId": "conversion_789012345",
  "journeyId": "journey_def456789",
  "journey": {
    "id": "journey_def456789",
    "name": "Customer Onboarding Process",
    "description": "Automated customer onboarding with document verification",
    "version": "1.0.0",
    "states": [
      {
        "id": "state_welcome",
        "type": "input_collection",
        "name": "Welcome and Initial Information",
        "description": "Collect customer basic information",
        "prompt": "Welcome! I'll help you with the onboarding process. First, I'll need some basic information.",
        "requiredInputs": [
          {
            "name": "customer_name",
            "type": "string",
            "validation": "required|min:2|max:50"
          },
          {
            "name": "customer_email",
            "type": "email",
            "validation": "required|email"
          }
        ],
        "nextStates": ["state_document_upload"]
      },
      {
        "id": "state_document_upload",
        "type": "tool_execution",
        "name": "Document Upload and Verification",
        "description": "Process uploaded documents",
        "toolId": "document_processor",
        "configuration": {
          "acceptedFormats": ["pdf", "jpg", "png"],
          "maxSizeMb": 10,
          "verificationLevel": "standard"
        },
        "onSuccess": ["state_review_documents"],
        "onError": ["state_document_retry"]
      }
    ],
    "transitions": [
      {
        "from": "state_welcome",
        "to": "state_document_upload",
        "condition": "inputs_valid",
        "trigger": "automatic"
      }
    ],
    "initialState": "state_welcome",
    "finalStates": ["state_onboarding_complete"],
    "context": {
      "variables": [
        {
          "name": "customer_data",
          "type": "object",
          "scope": "journey",
          "persistent": true
        }
      ],
      "settings": {
        "timeoutMinutes": 30,
        "maxRetries": 3,
        "saveProgress": true
      }
    }
  },
  "toolMappings": [
    {
      "simToolId": "document_block_1",
      "parlantToolId": "document_processor",
      "mappingConfidence": 0.98,
      "parameterMappings": [
        {
          "simParameter": "file_input",
          "parlantParameter": "document_file",
          "transformation": "file_path_to_base64"
        }
      ]
    }
  ],
  "conversionMetadata": {
    "conversionTimestamp": "2024-01-15T10:35:00Z",
    "processingTimeMs": 3400,
    "originalComplexity": 75,
    "journeyComplexity": 68,
    "optimizationsApplied": ["state_consolidation", "parallel_optimization"]
  }
}
```

### 3. Journey Management

#### `GET /journeys`

Retrieves a list of available journeys in the workspace.

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of results per page (default: 20, max: 100)
- `filter` (optional): Filter by journey status (`active`, `draft`, `archived`)
- `search` (optional): Search by journey name or description
- `sortBy` (optional): Sort field (`name`, `created_at`, `updated_at`)
- `sortOrder` (optional): Sort order (`asc`, `desc`)

**Response:**
```json
{
  "success": true,
  "journeys": [
    {
      "id": "journey_def456789",
      "name": "Customer Onboarding Process",
      "description": "Automated customer onboarding with document verification",
      "status": "active",
      "version": "1.0.0",
      "sourceWorkflowId": "workflow_abc123",
      "agentId": "agent_xyz789",
      "createdAt": "2024-01-15T10:35:00Z",
      "updatedAt": "2024-01-15T10:35:00Z",
      "stats": {
        "totalExecutions": 127,
        "successRate": 0.94,
        "averageDurationMinutes": 8.5,
        "lastExecuted": "2024-01-15T15:20:00Z"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 89,
    "itemsPerPage": 20
  }
}
```

#### `GET /journeys/{journeyId}`

Retrieves detailed information about a specific journey.

**Parameters:**
- `journeyId` (path): The journey identifier

**Response:**
```json
{
  "success": true,
  "journey": {
    "id": "journey_def456789",
    "name": "Customer Onboarding Process",
    "description": "Automated customer onboarding with document verification",
    "status": "active",
    "version": "1.0.0",
    "sourceWorkflowId": "workflow_abc123",
    "agentId": "agent_xyz789",
    "definition": {
      // Full journey definition as shown in conversion response
    },
    "toolMappings": [
      // Tool mapping information
    ],
    "metadata": {
      "createdAt": "2024-01-15T10:35:00Z",
      "updatedAt": "2024-01-15T10:35:00Z",
      "createdBy": "user_123",
      "tags": ["onboarding", "automated", "customer"],
      "category": "business_process"
    }
  }
}
```

#### `PUT /journeys/{journeyId}`

Updates a journey definition.

**Parameters:**
- `journeyId` (path): The journey identifier

**Request Body:**
```json
{
  "name": "Updated Customer Onboarding Process",
  "description": "Enhanced automated customer onboarding with document verification",
  "definition": {
    // Updated journey definition
  },
  "agentConfiguration": {
    // Updated agent configuration
  },
  "metadata": {
    "tags": ["onboarding", "automated", "customer", "enhanced"],
    "category": "business_process"
  }
}
```

**Response:**
```json
{
  "success": true,
  "journey": {
    // Updated journey information
  },
  "validationResult": {
    "valid": true,
    "warnings": [],
    "errors": []
  }
}
```

#### `DELETE /journeys/{journeyId}`

Deletes a journey (archives it).

**Parameters:**
- `journeyId` (path): The journey identifier

**Response:**
```json
{
  "success": true,
  "message": "Journey archived successfully",
  "archivalTimestamp": "2024-01-15T16:00:00Z"
}
```

### 4. Journey Execution

#### `POST /journeys/{journeyId}/execute`

Starts a new journey execution session.

**Parameters:**
- `journeyId` (path): The journey to execute

**Request Body:**
```json
{
  "executionOptions": {
    "sessionName": "Customer Onboarding - John Doe",
    "initialContext": {
      "customer_id": "cust_123456",
      "source": "web_signup"
    },
    "notifications": {
      "onComplete": true,
      "onError": true,
      "progressUpdates": false
    }
  },
  "agentSettings": {
    "responseStyle": "detailed",
    "language": "en",
    "timezone": "America/New_York"
  }
}
```

**Response:**
```json
{
  "success": true,
  "executionId": "execution_987654321",
  "sessionId": "session_abc789def",
  "currentState": "state_welcome",
  "status": "active",
  "conversationUrl": "https://chat.sim.co/sessions/session_abc789def",
  "estimatedDurationMinutes": 8,
  "createdAt": "2024-01-15T16:05:00Z"
}
```

#### `GET /journeys/{journeyId}/executions/{executionId}`

Retrieves the status and progress of a journey execution.

**Parameters:**
- `journeyId` (path): The journey identifier
- `executionId` (path): The execution identifier

**Response:**
```json
{
  "success": true,
  "execution": {
    "id": "execution_987654321",
    "journeyId": "journey_def456789",
    "sessionId": "session_abc789def",
    "status": "in_progress",
    "currentState": "state_document_upload",
    "progress": {
      "completedStates": ["state_welcome"],
      "currentState": "state_document_upload",
      "remainingStates": ["state_review_documents", "state_onboarding_complete"],
      "progressPercentage": 33
    },
    "context": {
      "variables": {
        "customer_name": "John Doe",
        "customer_email": "john.doe@example.com",
        "customer_data": {
          "signup_date": "2024-01-15T16:05:00Z",
          "source": "web_signup"
        }
      }
    },
    "history": [
      {
        "timestamp": "2024-01-15T16:05:00Z",
        "stateId": "state_welcome",
        "action": "state_entered",
        "data": {
          "userInput": "John Doe, john.doe@example.com"
        }
      },
      {
        "timestamp": "2024-01-15T16:06:30Z",
        "stateId": "state_document_upload",
        "action": "state_entered",
        "data": {
          "prompt": "Please upload your identification document"
        }
      }
    ],
    "startedAt": "2024-01-15T16:05:00Z",
    "estimatedCompletionAt": "2024-01-15T16:13:00Z"
  }
}
```

#### `POST /journeys/{journeyId}/executions/{executionId}/interact`

Send user input to an active journey execution.

**Parameters:**
- `journeyId` (path): The journey identifier
- `executionId` (path): The execution identifier

**Request Body:**
```json
{
  "message": "I've uploaded my driver's license",
  "attachments": [
    {
      "type": "file",
      "filename": "drivers_license.pdf",
      "contentType": "application/pdf",
      "size": 2048576,
      "url": "https://uploads.sim.co/temp/file_xyz789.pdf"
    }
  ],
  "metadata": {
    "timestamp": "2024-01-15T16:07:00Z",
    "source": "web_chat"
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "message": "Thank you! I've received your driver's license. Let me process this document for verification.",
    "actions": [
      {
        "type": "tool_execution",
        "toolId": "document_processor",
        "status": "processing",
        "estimatedDurationMs": 5000
      }
    ],
    "nextExpectedInput": "none",
    "stateTransition": {
      "from": "state_document_upload",
      "to": "state_processing_documents",
      "triggered": true
    }
  },
  "execution": {
    "currentState": "state_processing_documents",
    "progress": {
      "progressPercentage": 50
    }
  }
}
```

### 5. Tool Integration

#### `GET /tool-mappings`

Retrieves available tool mappings between Sim and Parlant.

**Query Parameters:**
- `simToolType` (optional): Filter by Sim tool type
- `category` (optional): Filter by tool category
- `status` (optional): Filter by mapping status (`available`, `deprecated`, `unavailable`)

**Response:**
```json
{
  "success": true,
  "toolMappings": [
    {
      "id": "mapping_http_request",
      "simToolId": "api_block",
      "simToolType": "http_request",
      "parlantToolId": "http_client",
      "status": "available",
      "category": "integration",
      "description": "Maps HTTP API requests between Sim and Parlant",
      "parameterMappings": [
        {
          "simParameter": "url",
          "parlantParameter": "endpoint",
          "type": "string",
          "required": true
        },
        {
          "simParameter": "method",
          "parlantParameter": "http_method",
          "type": "string",
          "enum": ["GET", "POST", "PUT", "DELETE"]
        }
      ],
      "capabilities": [
        "async_execution",
        "retry_logic",
        "response_caching",
        "error_handling"
      ],
      "limitations": [
        "Max payload size: 10MB",
        "Timeout limit: 60 seconds"
      ]
    }
  ]
}
```

#### `GET /tool-mappings/{mappingId}/validate`

Validates a tool mapping configuration.

**Parameters:**
- `mappingId` (path): The tool mapping identifier

**Request Body:**
```json
{
  "configuration": {
    "endpoint": "https://api.example.com/users",
    "http_method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer token123"
    },
    "body": {
      "name": "{{user_name}}",
      "email": "{{user_email}}"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "validationResult": {
    "valid": true,
    "errors": [],
    "warnings": [
      "Consider adding request timeout configuration"
    ],
    "suggestions": [
      "Add retry configuration for better reliability"
    ]
  },
  "estimatedPerformance": {
    "averageExecutionMs": 750,
    "successRate": 0.99,
    "reliabilityScore": 0.95
  }
}
```

---

## Data Models

### Workflow Analysis Result

```typescript
interface WorkflowAnalysisResult {
  analysisId: string
  workflowId: string
  analysis: {
    blocksCount: number
    edgesCount: number
    complexity: number
    entryPoints: string[]
    exitPoints: string[]
    conditionalPaths: ConditionalPath[]
    toolDependencies: ToolDependency[]
    parallelSections: ParallelSection[]
    loopStructures: LoopStructure[]
  }
  conversionFeasibility: {
    canConvert: boolean
    confidence: number
    blockedBy: string[]
    warnings: string[]
  }
  metadata: {
    analysisTimestamp: string
    analysisVersion: string
    processingTimeMs: number
  }
}

interface ConditionalPath {
  blockId: string
  truePath: string[]
  falsePath: string[]
  condition: ConditionDefinition
}

interface ToolDependency {
  blockId: string
  toolType: string
  adapterAvailable: boolean
  configurationValid: boolean
  requirements: string[]
}

interface ParallelSection {
  id: string
  blocks: string[]
  convergencePoint: string
  maxConcurrency?: number
}

interface LoopStructure {
  id: string
  entryBlock: string
  bodyBlocks: string[]
  exitCondition: string
  maxIterations?: number
}
```

### Journey Definition

```typescript
interface JourneyDefinition {
  id: string
  name: string
  description: string
  version: string
  states: JourneyState[]
  transitions: StateTransition[]
  initialState: string
  finalStates: string[]
  context: JourneyContext
  metadata: JourneyMetadata
}

interface JourneyState {
  id: string
  type: 'input_collection' | 'tool_execution' | 'conditional' | 'parallel' | 'loop' | 'notification'
  name: string
  description: string
  prompt?: string
  toolId?: string
  configuration?: Record<string, any>
  requiredInputs?: InputDefinition[]
  nextStates?: string[]
  onSuccess?: string[]
  onError?: string[]
  onEntry?: Action[]
  onExit?: Action[]
  timeoutSeconds?: number
  retryConfig?: RetryConfiguration
}

interface StateTransition {
  from: string
  to: string
  condition?: string
  trigger: 'automatic' | 'user_input' | 'tool_completion' | 'timer' | 'external_event'
  weight?: number
  metadata?: Record<string, any>
}

interface JourneyContext {
  variables: VariableDefinition[]
  settings: ContextSettings
  permissions?: PermissionSet
}
```

### Execution Models

```typescript
interface JourneyExecution {
  id: string
  journeyId: string
  sessionId: string
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'
  currentState: string
  progress: ExecutionProgress
  context: ExecutionContext
  history: ExecutionEvent[]
  startedAt: string
  estimatedCompletionAt?: string
  completedAt?: string
  error?: ExecutionError
}

interface ExecutionProgress {
  completedStates: string[]
  currentState: string
  remainingStates: string[]
  progressPercentage: number
  estimatedRemainingMinutes?: number
}

interface ExecutionContext {
  variables: Record<string, any>
  sessionData: Record<string, any>
  userProfile?: UserProfile
  permissions: PermissionSet
}

interface ExecutionEvent {
  timestamp: string
  stateId: string
  action: 'state_entered' | 'state_exited' | 'tool_executed' | 'user_input' | 'error' | 'transition'
  data: Record<string, any>
  duration?: number
  success?: boolean
}
```

---

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "WORKFLOW_CONVERSION_FAILED",
    "message": "Unable to convert workflow to journey format",
    "details": "Complex conditional logic in block 'condition_advanced_1' requires manual intervention",
    "timestamp": "2024-01-15T16:00:00Z",
    "requestId": "req_abc123def456",
    "context": {
      "workflowId": "workflow_abc123",
      "blockId": "condition_advanced_1"
    },
    "suggestions": [
      "Simplify the conditional logic in the problematic block",
      "Consider splitting the complex condition into multiple simpler conditions",
      "Contact support for assistance with complex workflow conversion"
    ],
    "retryable": false,
    "supportContact": "support@sim.co"
  }
}
```

### Common Error Codes

#### Authentication Errors
- `AUTH_TOKEN_INVALID`: Invalid or expired authentication token
- `AUTH_INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `AUTH_WORKSPACE_ACCESS_DENIED`: User cannot access specified workspace

#### Validation Errors
- `VALIDATION_REQUIRED_FIELD_MISSING`: Required field not provided
- `VALIDATION_INVALID_FORMAT`: Field format is invalid
- `VALIDATION_VALUE_OUT_OF_RANGE`: Field value outside acceptable range

#### Workflow/Journey Errors
- `WORKFLOW_NOT_FOUND`: Specified workflow does not exist
- `WORKFLOW_CONVERSION_FAILED`: Cannot convert workflow to journey
- `JOURNEY_INVALID_DEFINITION`: Journey definition is malformed
- `JOURNEY_EXECUTION_FAILED`: Journey execution encountered an error

#### Tool Integration Errors
- `TOOL_MAPPING_NOT_FOUND`: No mapping available for specified tool
- `TOOL_ADAPTER_UNAVAILABLE`: Required tool adapter is not available
- `TOOL_EXECUTION_FAILED`: Tool execution failed during journey

#### System Errors
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `INTERNAL_SERVER_ERROR`: Unexpected server error

### Error Handling Best Practices

#### Retry Logic
```typescript
interface RetryConfig {
  maxAttempts: number
  backoffStrategy: 'exponential' | 'linear' | 'fixed'
  baseDelayMs: number
  maxDelayMs: number
  retryableErrorCodes: string[]
}

// Example retry implementation
async function apiCallWithRetry(
  apiFunction: () => Promise<any>,
  config: RetryConfig
): Promise<any> {
  let attempt = 0

  while (attempt < config.maxAttempts) {
    try {
      return await apiFunction()
    } catch (error: any) {
      if (!config.retryableErrorCodes.includes(error.code) ||
          attempt === config.maxAttempts - 1) {
        throw error
      }

      const delay = calculateDelay(attempt, config)
      await sleep(delay)
      attempt++
    }
  }
}
```

---

## Integration Examples

### Basic Workflow Conversion

```typescript
import { SimWorkflowAPI } from '@sim/workflow-api'

async function convertWorkflowToJourney(workflowId: string) {
  const api = new SimWorkflowAPI({
    baseUrl: 'https://api.sim.co/v1',
    auth: process.env.SIM_API_TOKEN,
    workspace: process.env.WORKSPACE_ID
  })

  try {
    // 1. Analyze the workflow
    const analysis = await api.workflows.analyze(workflowId, {
      analysisOptions: {
        includeToolDependencies: true,
        validateIntegrity: true,
        optimizeForConversation: true
      }
    })

    if (!analysis.conversionFeasibility.canConvert) {
      throw new Error(`Cannot convert workflow: ${analysis.conversionFeasibility.blockedBy.join(', ')}`)
    }

    // 2. Convert to journey
    const journey = await api.workflows.convertToJourney(workflowId, {
      analysisId: analysis.analysisId,
      conversionOptions: {
        journeyName: 'Automated Customer Process',
        conversationalStyle: 'professional',
        includeProgressIndicators: true
      },
      agentConfiguration: {
        agentName: 'Process Assistant',
        personality: 'helpful and efficient'
      }
    })

    console.log(`Journey created: ${journey.journeyId}`)
    return journey

  } catch (error: any) {
    console.error('Conversion failed:', error.message)
    throw error
  }
}
```

### Journey Execution Management

```typescript
import { SimJourneyAPI } from '@sim/journey-api'
import { EventEmitter } from 'events'

class JourneyExecutionManager extends EventEmitter {
  private api: SimJourneyAPI

  constructor(apiKey: string, workspaceId: string) {
    super()
    this.api = new SimJourneyAPI({
      baseUrl: 'https://api.sim.co/v1',
      auth: apiKey,
      workspace: workspaceId
    })
  }

  async executeJourney(journeyId: string, initialContext?: any) {
    try {
      // Start journey execution
      const execution = await this.api.journeys.execute(journeyId, {
        executionOptions: {
          initialContext,
          notifications: {
            onComplete: true,
            onError: true,
            progressUpdates: true
          }
        }
      })

      this.emit('execution:started', execution)

      // Monitor progress
      const progressMonitor = setInterval(async () => {
        try {
          const status = await this.api.journeys.getExecution(
            journeyId,
            execution.executionId
          )

          this.emit('execution:progress', status.execution)

          if (['completed', 'failed', 'cancelled'].includes(status.execution.status)) {
            clearInterval(progressMonitor)
            this.emit(`execution:${status.execution.status}`, status.execution)
          }
        } catch (error) {
          this.emit('execution:error', error)
        }
      }, 5000)

      return execution

    } catch (error: any) {
      this.emit('execution:error', error)
      throw error
    }
  }

  async sendUserInput(journeyId: string, executionId: string, message: string, attachments?: any[]) {
    try {
      const response = await this.api.journeys.interact(journeyId, executionId, {
        message,
        attachments
      })

      this.emit('user:input', { message, response })
      return response

    } catch (error: any) {
      this.emit('interaction:error', error)
      throw error
    }
  }
}

// Usage example
const journeyManager = new JourneyExecutionManager(
  process.env.SIM_API_KEY!,
  process.env.WORKSPACE_ID!
)

journeyManager.on('execution:started', (execution) => {
  console.log('Journey execution started:', execution.executionId)
})

journeyManager.on('execution:progress', (execution) => {
  console.log(`Progress: ${execution.progress.progressPercentage}%`)
})

journeyManager.on('execution:completed', (execution) => {
  console.log('Journey completed successfully!')
})

// Start a journey
await journeyManager.executeJourney('journey_def456789', {
  customerType: 'premium',
  source: 'web_signup'
})
```

### Tool Mapping Validation

```typescript
import { SimToolMappingAPI } from '@sim/tool-mapping-api'

async function validateToolMappings(journeyId: string) {
  const api = new SimToolMappingAPI({
    baseUrl: 'https://api.sim.co/v1',
    auth: process.env.SIM_API_TOKEN,
    workspace: process.env.WORKSPACE_ID
  })

  try {
    // Get journey definition
    const journey = await api.journeys.get(journeyId)

    // Validate all tool mappings
    const validationPromises = journey.toolMappings.map(async (mapping) => {
      const validation = await api.toolMappings.validate(mapping.id, {
        configuration: mapping.configuration
      })

      return {
        mappingId: mapping.id,
        toolType: mapping.simToolType,
        valid: validation.validationResult.valid,
        errors: validation.validationResult.errors,
        warnings: validation.validationResult.warnings,
        performance: validation.estimatedPerformance
      }
    })

    const results = await Promise.all(validationPromises)

    // Report validation results
    const invalid = results.filter(r => !r.valid)
    const warnings = results.filter(r => r.warnings.length > 0)

    if (invalid.length > 0) {
      console.error('Invalid tool mappings found:')
      invalid.forEach(result => {
        console.error(`- ${result.toolType}: ${result.errors.join(', ')}`)
      })
      return false
    }

    if (warnings.length > 0) {
      console.warn('Tool mapping warnings:')
      warnings.forEach(result => {
        console.warn(`- ${result.toolType}: ${result.warnings.join(', ')}`)
      })
    }

    // Performance analysis
    const avgPerformance = results.reduce((sum, r) =>
      sum + r.performance.reliabilityScore, 0) / results.length

    console.log(`Tool mappings validated successfully. Average reliability: ${avgPerformance.toFixed(2)}`)
    return true

  } catch (error: any) {
    console.error('Tool mapping validation failed:', error.message)
    return false
  }
}
```

---

## SDK Reference

### TypeScript SDK Installation

```bash
npm install @sim/workflow-journey-sdk
```

### SDK Initialization

```typescript
import { SimWorkflowJourneySDK } from '@sim/workflow-journey-sdk'

const sdk = new SimWorkflowJourneySDK({
  apiKey: process.env.SIM_API_KEY,
  workspace: process.env.WORKSPACE_ID,
  baseUrl: 'https://api.sim.co/v1', // optional, defaults to production
  timeout: 30000, // optional, request timeout in ms
  retryConfig: { // optional retry configuration
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    baseDelayMs: 1000
  }
})
```

### SDK Methods

#### Workflow Analysis
```typescript
// Analyze workflow for conversion feasibility
const analysis = await sdk.workflows.analyze(workflowId, options?)

// Get analysis results
const analysisResult = await sdk.workflows.getAnalysis(analysisId)
```

#### Journey Conversion
```typescript
// Convert workflow to journey
const journey = await sdk.workflows.convertToJourney(workflowId, config)

// Batch convert multiple workflows
const journeys = await sdk.workflows.batchConvert(workflowIds, config)
```

#### Journey Management
```typescript
// List journeys
const journeys = await sdk.journeys.list(filters?)

// Get journey details
const journey = await sdk.journeys.get(journeyId)

// Update journey
const updated = await sdk.journeys.update(journeyId, updates)

// Delete journey
await sdk.journeys.delete(journeyId)
```

#### Journey Execution
```typescript
// Execute journey
const execution = await sdk.journeys.execute(journeyId, options?)

// Get execution status
const status = await sdk.journeys.getExecution(journeyId, executionId)

// Send user input
const response = await sdk.journeys.interact(journeyId, executionId, input)

// Cancel execution
await sdk.journeys.cancelExecution(journeyId, executionId)
```

#### Tool Integration
```typescript
// List tool mappings
const mappings = await sdk.tools.getMappings(filters?)

// Validate tool configuration
const validation = await sdk.tools.validate(mappingId, config)

// Get tool capabilities
const capabilities = await sdk.tools.getCapabilities(toolId)
```

### Error Handling with SDK

```typescript
import { SimAPIError, ValidationError, AuthenticationError } from '@sim/workflow-journey-sdk'

try {
  const journey = await sdk.workflows.convertToJourney(workflowId, config)
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.validationErrors)
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message)
  } else if (error instanceof SimAPIError) {
    console.error('API error:', error.code, error.message)
    if (error.retryable) {
      // Implement retry logic
    }
  } else {
    console.error('Unexpected error:', error)
  }
}
```

---

This comprehensive API documentation provides developers with all necessary information to integrate with the Workflow to Journey Mapping system effectively. The documentation includes detailed endpoint references, data models, error handling, and practical integration examples to ensure successful implementation.