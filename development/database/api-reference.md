# Parlant Database API Reference

## Overview

This document provides comprehensive API documentation for the Parlant database services, query helpers, and utility functions. It includes method signatures, parameters, return types, error handling, and usage examples.

## Service Layer APIs

### ParlantService (Main Service)

The main service class that orchestrates all Parlant database operations with workspace isolation and security.

```typescript
class ParlantService {
  constructor(db: DrizzleDB, config?: ParlantConfig)

  // Agent Management
  async createAgent(params: CreateAgentParams): Promise<ParlantAgent>
  async getAgent(agentId: string, workspaceId: string): Promise<ParlantAgent | null>
  async listAgents(params: ListAgentsParams): Promise<ListAgentsResponse>
  async updateAgent(agentId: string, params: UpdateAgentParams): Promise<ParlantAgent>
  async deleteAgent(agentId: string, workspaceId: string): Promise<void>
  async getAgentAnalytics(agentId: string, workspaceId: string): Promise<AgentAnalytics>

  // Session Management
  async createSession(params: CreateSessionParams): Promise<ParlantSession>
  async getSession(sessionId: string): Promise<ParlantSession | null>
  async listSessions(params: ListSessionsParams): Promise<ListSessionsResponse>
  async updateSession(sessionId: string, params: UpdateSessionParams): Promise<ParlantSession>
  async endSession(sessionId: string, reason?: string): Promise<void>

  // Event Management
  async addEvent(sessionId: string, eventData: CreateEventParams): Promise<ParlantEvent>
  async getEvents(sessionId: string, params?: GetEventsParams): Promise<ParlantEvent[]>
  async getEventHistory(params: EventHistoryParams): Promise<EventHistoryResponse>

  // Tool Management
  async createTool(params: CreateToolParams): Promise<ParlantTool>
  async listTools(workspaceId: string, params?: ListToolsParams): Promise<ParlantTool[]>
  async assignToolToAgent(agentId: string, toolId: string, config?: ToolConfig): Promise<void>
  async removeToolFromAgent(agentId: string, toolId: string): Promise<void>

  // Journey Management
  async createJourney(params: CreateJourneyParams): Promise<ParlantJourney>
  async listJourneys(agentId: string): Promise<ParlantJourney[]>
  async updateJourney(journeyId: string, params: UpdateJourneyParams): Promise<ParlantJourney>
  async deleteJourney(journeyId: string): Promise<void>
}
```

## Agent Management APIs

### createAgent

Creates a new Parlant agent within a workspace with proper validation and initialization.

**Signature:**
```typescript
async createAgent(params: CreateAgentParams): Promise<ParlantAgent>
```

**Parameters:**
```typescript
interface CreateAgentParams {
  workspaceId: string;           // Required: Target workspace ID
  createdBy: string;             // Required: User ID of creator
  name: string;                  // Required: Agent display name (1-100 chars)
  description?: string;          // Optional: Agent description (max 500 chars)
  modelProvider?: string;        // Optional: AI provider ('openai', 'anthropic', 'ollama')
  modelName?: string;           // Optional: Specific model name
  temperature?: number;          // Optional: Temperature 0-100 (default: 70)
  maxTokens?: number;           // Optional: Max tokens (default: 2000)
  systemPrompt?: string;        // Optional: System prompt (max 5000 chars)
  conversationStyle?: string;   // Optional: 'casual', 'professional', 'technical', 'friendly'
  allowInterruption?: boolean;  // Optional: Allow mid-response interruption
  allowProactiveMessages?: boolean; // Optional: Allow unsolicited messages
  defaultTools?: string[];      // Optional: Array of tool IDs to assign
}
```

**Returns:**
```typescript
interface ParlantAgent {
  id: string;
  workspaceId: string;
  createdBy: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive' | 'archived';
  compositionMode: 'fluid' | 'strict';
  systemPrompt: string | null;
  modelProvider: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  // ... additional fields
  createdAt: Date;
  updatedAt: Date;
}
```

**Example Usage:**
```typescript
const agent = await parlantService.createAgent({
  workspaceId: 'ws_123',
  createdBy: 'user_456',
  name: 'Customer Support Agent',
  description: 'Handles customer inquiries and support tickets',
  modelProvider: 'openai',
  modelName: 'gpt-4',
  temperature: 75,
  conversationStyle: 'professional',
  defaultTools: ['email-sender', 'ticket-creator']
});

console.log('Agent created:', agent.id);
```

**Errors:**
- `ValidationError`: Invalid parameters or constraints violated
- `AccessDeniedError`: Insufficient workspace permissions
- `ConflictError`: Agent name already exists in workspace

### listAgents

Retrieves a paginated list of agents for a workspace with filtering options.

**Signature:**
```typescript
async listAgents(params: ListAgentsParams): Promise<ListAgentsResponse>
```

**Parameters:**
```typescript
interface ListAgentsParams {
  workspaceId: string;           // Required: Target workspace ID
  status?: 'active' | 'inactive' | 'archived'; // Optional: Filter by status
  search?: string;               // Optional: Search in name and description
  sortBy?: 'name' | 'created' | 'lastActive'; // Optional: Sort field
  sortOrder?: 'asc' | 'desc';   // Optional: Sort direction
  limit?: number;               // Optional: Page size (default: 20, max: 100)
  offset?: number;              // Optional: Skip count (default: 0)
}
```

**Returns:**
```typescript
interface ListAgentsResponse {
  agents: AgentSummary[];       // Array of agent summaries
  totalCount: number;           // Total matching agents
  hasMore: boolean;            // Whether more results exist
  nextOffset?: number;         // Next offset for pagination
}

interface AgentSummary {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive' | 'archived';
  totalSessions: number;
  totalMessages: number;
  activeSessions: number;       // Current active sessions
  lastActiveAt: Date | null;
  createdAt: Date;
}
```

**Example Usage:**
```typescript
// List active agents with search
const response = await parlantService.listAgents({
  workspaceId: 'ws_123',
  status: 'active',
  search: 'support',
  sortBy: 'lastActive',
  sortOrder: 'desc',
  limit: 10
});

console.log(`Found ${response.totalCount} agents`);
response.agents.forEach(agent => {
  console.log(`${agent.name}: ${agent.activeSessions} active sessions`);
});
```

### getAgentAnalytics

Retrieves comprehensive analytics and usage statistics for an agent.

**Signature:**
```typescript
async getAgentAnalytics(agentId: string, workspaceId: string, options?: AnalyticsOptions): Promise<AgentAnalytics>
```

**Parameters:**
```typescript
interface AnalyticsOptions {
  timeRange?: {
    start: Date;
    end: Date;
  };
  includeDetails?: boolean;     // Include detailed breakdowns
  includeComparisons?: boolean; // Include period comparisons
}
```

**Returns:**
```typescript
interface AgentAnalytics {
  agent: ParlantAgent;
  overview: {
    totalSessions: number;
    totalMessages: number;
    totalTokensUsed: number;
    totalCost: number;           // In cents
    avgSessionDuration: number;  // In seconds
    avgMessagesPerSession: number;
    avgSatisfactionScore: number | null;
    completionRate: number;      // Percentage
  };
  timeSeriesData: Array<{
    period: string;              // ISO date string
    sessionCount: number;
    messageCount: number;
    avgResponseTime: number;
    satisfactionScore: number | null;
    cost: number;
  }>;
  toolUsage: Array<{
    toolName: string;
    useCount: number;
    successRate: number;
    avgExecutionTime: number;
    lastUsedAt: Date | null;
  }>;
  sessionTypes: Array<{
    type: string;
    count: number;
    avgDuration: number;
    completionRate: number;
  }>;
  lastUpdated: Date;
}
```

**Example Usage:**
```typescript
const analytics = await parlantService.getAgentAnalytics(
  'agent_123',
  'ws_456',
  {
    timeRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    },
    includeDetails: true
  }
);

console.log(`Agent handled ${analytics.overview.totalSessions} sessions`);
console.log(`Satisfaction score: ${analytics.overview.avgSatisfactionScore}`);
console.log(`Most used tool: ${analytics.toolUsage[0]?.toolName}`);
```

## Session Management APIs

### createSession

Creates a new conversation session between a user and an agent.

**Signature:**
```typescript
async createSession(params: CreateSessionParams): Promise<ParlantSession>
```

**Parameters:**
```typescript
interface CreateSessionParams {
  agentId: string;              // Required: Target agent ID
  workspaceId: string;          // Required: Workspace for validation
  userId?: string;              // Optional: Sim user ID (null for anonymous)
  customerId?: string;          // Optional: External customer ID
  title?: string;               // Optional: Session title
  sessionType?: 'conversation' | 'support' | 'onboarding' | 'survey';
  mode?: 'auto' | 'manual' | 'paused'; // Optional: Session mode
  locale?: string;              // Optional: User language (ISO code)
  timezone?: string;            // Optional: User timezone
  metadata?: Record<string, any>; // Optional: Custom metadata
  variables?: Record<string, any>; // Optional: Initial session variables
  context?: {                   // Optional: User context
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    source?: string;
  };
}
```

**Returns:**
```typescript
interface ParlantSession {
  id: string;
  agentId: string;
  workspaceId: string;
  userId: string | null;
  customerId: string | null;
  mode: 'auto' | 'manual' | 'paused';
  status: 'active' | 'completed' | 'abandoned';
  title: string | null;
  metadata: Record<string, any>;
  currentJourneyId: string | null;
  currentStateId: string | null;
  variables: Record<string, any>;
  eventCount: number;
  messageCount: number;
  tokensUsed: number;
  cost: number;
  sessionType: string;
  locale: string;
  timezone: string;
  startedAt: Date;
  lastActivityAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example Usage:**
```typescript
const session = await parlantService.createSession({
  agentId: 'agent_123',
  workspaceId: 'ws_456',
  userId: 'user_789',
  title: 'Support Chat - Payment Issue',
  sessionType: 'support',
  locale: 'en',
  timezone: 'America/New_York',
  metadata: {
    ticketId: 'TICK-12345',
    priority: 'high'
  },
  context: {
    userAgent: 'Mozilla/5.0...',
    referrer: 'https://app.sim.com/billing'
  }
});

console.log('Session created:', session.id);
```

### addEvent

Adds an event to a session with proper ordering and validation.

**Signature:**
```typescript
async addEvent(sessionId: string, eventData: CreateEventParams): Promise<ParlantEvent>
```

**Parameters:**
```typescript
interface CreateEventParams {
  eventType: 'customer_message' | 'agent_message' | 'tool_call' | 'tool_result' |
            'status_update' | 'journey_transition' | 'variable_update';
  content: Record<string, any>;  // Event-specific content
  metadata?: Record<string, any>; // Optional: Additional metadata
  toolCallId?: string;           // Required for tool_call/tool_result events
  journeyId?: string;           // Optional: Associated journey
  stateId?: string;             // Optional: Associated journey state
}

// Content structure by event type
interface MessageContent {
  text: string;                 // Message text
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
    size: number;
  }>;
}

interface ToolCallContent {
  toolId: string;
  toolName: string;
  parameters: Record<string, any>;
  callId: string;
}

interface ToolResultContent {
  callId: string;
  result: any;
  success: boolean;
  executionTime: number;        // In milliseconds
  error?: string;
}
```

**Returns:**
```typescript
interface ParlantEvent {
  id: string;
  sessionId: string;
  offset: number;               // Sequential offset within session
  eventType: string;
  content: Record<string, any>;
  metadata: Record<string, any>;
  toolCallId: string | null;
  journeyId: string | null;
  stateId: string | null;
  createdAt: Date;
}
```

**Example Usage:**
```typescript
// Add user message
const messageEvent = await parlantService.addEvent(sessionId, {
  eventType: 'customer_message',
  content: {
    text: 'I need help with my billing',
    attachments: [{
      type: 'image',
      url: 'https://uploads.sim.com/screenshot.png',
      name: 'billing_issue.png',
      size: 245760
    }]
  },
  metadata: {
    platform: 'web',
    timestamp: new Date().toISOString()
  }
});

// Add tool call
const toolEvent = await parlantService.addEvent(sessionId, {
  eventType: 'tool_call',
  content: {
    toolId: 'billing-lookup',
    toolName: 'Billing Account Lookup',
    parameters: {
      userId: 'user_789',
      includeTransactions: true
    },
    callId: 'call_' + Date.now()
  },
  toolCallId: 'call_' + Date.now()
});
```

## Tool Management APIs

### createTool

Creates a new tool integration within a workspace.

**Signature:**
```typescript
async createTool(params: CreateToolParams): Promise<ParlantTool>
```

**Parameters:**
```typescript
interface CreateToolParams {
  workspaceId: string;          // Required: Target workspace
  name: string;                 // Required: Tool identifier (unique in workspace)
  displayName: string;          // Required: Human-readable name
  description: string;          // Required: Tool description
  toolType: 'sim_native' | 'custom' | 'external' | 'mcp_server';
  parameters: JSONSchema;       // Required: Parameter schema
  returnSchema?: JSONSchema;    // Optional: Return value schema
  usageGuidelines?: string;     // Optional: Usage instructions
  configuration?: {             // Optional: Tool-specific config
    timeout?: number;
    retryPolicy?: RetryPolicy;
    rateLimits?: RateLimits;
    authentication?: AuthConfig;
  };
  integration?: {               // Required for integrations
    type: 'custom_tool' | 'workflow_block' | 'mcp_server';
    targetId: string;
    parameterMapping?: Record<string, string>;
    responseMapping?: Record<string, string>;
  };
}

interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  description?: string;
}
```

**Returns:**
```typescript
interface ParlantTool {
  id: string;
  workspaceId: string;
  name: string;
  displayName: string;
  description: string;
  simToolId: string | null;
  toolType: string;
  parameters: JSONSchema;
  returnSchema: JSONSchema | null;
  usageGuidelines: string | null;
  errorHandling: Record<string, any>;
  enabled: boolean;
  isPublic: boolean;
  useCount: number;
  successRate: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example Usage:**
```typescript
const tool = await parlantService.createTool({
  workspaceId: 'ws_123',
  name: 'email-sender',
  displayName: 'Email Sender',
  description: 'Sends emails to customers and team members',
  toolType: 'sim_native',
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        format: 'email',
        description: 'Recipient email address'
      },
      subject: {
        type: 'string',
        description: 'Email subject line'
      },
      body: {
        type: 'string',
        description: 'Email body content'
      },
      template: {
        type: 'string',
        enum: ['support', 'billing', 'marketing'],
        description: 'Email template to use'
      }
    },
    required: ['to', 'subject', 'body']
  },
  usageGuidelines: 'Use this tool to send professional emails to customers. Always use appropriate templates and ensure content is helpful and polite.',
  integration: {
    type: 'custom_tool',
    targetId: 'custom_email_tool_456',
    parameterMapping: {
      'to': 'recipient_email',
      'subject': 'email_subject',
      'body': 'email_content'
    }
  }
});
```

### assignToolToAgent

Assigns a tool to an agent with specific configuration.

**Signature:**
```typescript
async assignToolToAgent(agentId: string, toolId: string, config?: ToolAssignmentConfig): Promise<void>
```

**Parameters:**
```typescript
interface ToolAssignmentConfig {
  enabled?: boolean;            // Default: true
  priority?: number;            // Default: 100 (higher = more preferred)
  configuration?: Record<string, any>; // Tool-specific config overrides
  usageInstructions?: string;   // Agent-specific usage instructions
  rateLimits?: {
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
}
```

**Example Usage:**
```typescript
await parlantService.assignToolToAgent('agent_123', 'email-sender', {
  priority: 90,
  configuration: {
    defaultTemplate: 'support',
    autoSignature: true
  },
  usageInstructions: 'Only send emails for customer support issues. Always use professional tone.',
  rateLimits: {
    perMinute: 2,
    perHour: 20
  }
});
```

## Journey Management APIs

### createJourney

Creates a multi-step conversational journey for an agent.

**Signature:**
```typescript
async createJourney(params: CreateJourneyParams): Promise<ParlantJourney>
```

**Parameters:**
```typescript
interface CreateJourneyParams {
  agentId: string;              // Required: Owner agent
  title: string;                // Required: Journey name
  description?: string;         // Optional: Journey description
  conditions: string[];         // Required: Trigger conditions
  enabled?: boolean;            // Default: true
  allowSkipping?: boolean;      // Default: true
  allowRevisiting?: boolean;    // Default: true
  states: CreateJourneyStateParams[]; // Required: Journey states
  transitions: CreateTransitionParams[]; // Required: State transitions
}

interface CreateJourneyStateParams {
  name: string;                 // Required: State name
  stateType: 'chat' | 'tool' | 'decision' | 'final';
  isInitial?: boolean;          // Mark as starting state
  isFinal?: boolean;           // Mark as ending state
  allowSkip?: boolean;         // Allow skipping this state
  config: {
    chatPrompt?: string;        // For chat states
    toolId?: string;           // For tool states
    toolConfig?: Record<string, any>; // Tool configuration
    condition?: string;        // For decision states
  };
  metadata?: Record<string, any>; // Additional state data
}

interface CreateTransitionParams {
  fromStateName: string;        // Source state name
  toStateName: string;         // Target state name
  condition?: string;          // Transition condition
  priority?: number;           // Default: 100
}
```

**Returns:**
```typescript
interface ParlantJourney {
  id: string;
  agentId: string;
  title: string;
  description: string | null;
  conditions: string[];
  enabled: boolean;
  allowSkipping: boolean;
  allowRevisiting: boolean;
  totalSessions: number;
  completionRate: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example Usage:**
```typescript
const journey = await parlantService.createJourney({
  agentId: 'agent_123',
  title: 'Customer Support Flow',
  description: 'Handles customer support inquiries with escalation',
  conditions: [
    'message.content includes "help"',
    'message.content includes "support"',
    'session.type == "support"'
  ],
  states: [
    {
      name: 'greeting',
      stateType: 'chat',
      isInitial: true,
      config: {
        chatPrompt: 'Hello! I\'m here to help with your question. Can you tell me more about the issue you\'re experiencing?'
      }
    },
    {
      name: 'gather_info',
      stateType: 'tool',
      config: {
        toolId: 'user-info-lookup',
        toolConfig: {
          includeAccountDetails: true,
          includeBillingInfo: true
        }
      }
    },
    {
      name: 'assess_complexity',
      stateType: 'decision',
      config: {
        condition: 'user.subscription_tier == "enterprise" OR issue.priority == "high"'
      }
    },
    {
      name: 'resolution',
      stateType: 'chat',
      isFinal: true,
      config: {
        chatPrompt: 'I\'ve resolved your issue. Is there anything else I can help you with today?'
      }
    }
  ],
  transitions: [
    {
      fromStateName: 'greeting',
      toStateName: 'gather_info'
    },
    {
      fromStateName: 'gather_info',
      toStateName: 'assess_complexity'
    },
    {
      fromStateName: 'assess_complexity',
      toStateName: 'resolution',
      condition: 'complexity == "low"'
    },
    {
      fromStateName: 'assess_complexity',
      toStateName: 'escalation',
      condition: 'complexity == "high"',
      priority: 90
    }
  ]
});
```

## Query Helper Functions

### Workspace Validation

```typescript
// Validate user access to workspace
async function validateWorkspaceAccess(
  userId: string,
  workspaceId: string,
  requiredPermission: 'read' | 'write' | 'admin' = 'read'
): Promise<boolean>

// Get user's workspaces with permission level
async function getUserWorkspaces(userId: string): Promise<Array<{
  workspaceId: string;
  name: string;
  permission: 'read' | 'write' | 'admin';
}>>
```

### Analytics Helpers

```typescript
// Get session metrics for time period
async function getSessionMetrics(params: {
  agentId?: string;
  workspaceId?: string;
  startDate: Date;
  endDate: Date;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
}): Promise<Array<{
  period: string;
  sessionCount: number;
  messageCount: number;
  avgResponseTime: number;
  satisfactionScore: number | null;
  cost: number;
}>>

// Get tool usage statistics
async function getToolUsageStats(params: {
  agentId?: string;
  workspaceId: string;
  startDate: Date;
  endDate: Date;
}): Promise<Array<{
  toolId: string;
  toolName: string;
  useCount: number;
  successRate: number;
  avgExecutionTime: number;
  totalCost: number;
}>>

// Get conversation flow analysis
async function getConversationFlowAnalysis(journeyId: string): Promise<{
  totalSessions: number;
  completionRate: number;
  avgSessionLength: number;
  stateUsage: Array<{
    stateName: string;
    visitCount: number;
    avgDwellTime: number;
    exitRate: number;
  }>;
  commonPaths: Array<{
    path: string[];
    frequency: number;
    avgCompletionTime: number;
  }>;
}>
```

### Pagination Helpers

```typescript
// Standard pagination interface
interface PaginationParams {
  limit?: number;               // Default: 20, Max: 100
  offset?: number;              // Default: 0
  cursor?: string;              // Alternative to offset
}

interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  nextOffset?: number;
}

// Create paginated query
function createPaginatedQuery<T>(
  baseQuery: any,
  params: PaginationParams
): Promise<PaginatedResponse<T>>
```

## Error Handling

### Error Types

```typescript
// Base error class
class ParlantError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  )
}

// Specific error types
class ValidationError extends ParlantError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

class NotFoundError extends ParlantError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      'NOT_FOUND',
      404
    );
  }
}

class AccessDeniedError extends ParlantError {
  constructor(resource: string, action: string = 'access') {
    super(
      `Access denied: Cannot ${action} ${resource}`,
      'ACCESS_DENIED',
      403
    );
  }
}

class ConflictError extends ParlantError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
  }
}

class RateLimitError extends ParlantError {
  constructor(resource: string, limit: string) {
    super(
      `Rate limit exceeded for ${resource}: ${limit}`,
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }
}
```

### Error Handling Patterns

```typescript
// Service method error handling
async function handleServiceCall<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ParlantError) {
      throw error; // Re-throw known errors
    }

    // Log unexpected errors
    console.error(`Unexpected error in ${context}:`, error);

    // Convert to generic service error
    throw new ParlantError(
      'An unexpected error occurred',
      'INTERNAL_ERROR',
      500,
      { context, originalError: error.message }
    );
  }
}

// Usage example
async createAgent(params: CreateAgentParams): Promise<ParlantAgent> {
  return handleServiceCall(
    async () => {
      // Validate parameters
      if (!params.name || params.name.length < 1) {
        throw new ValidationError('Agent name is required');
      }

      // Check workspace access
      const hasAccess = await validateWorkspaceAccess(
        params.createdBy,
        params.workspaceId,
        'write'
      );

      if (!hasAccess) {
        throw new AccessDeniedError('workspace', 'create agents in');
      }

      // Create agent...
      return await this.agentManager.create(params);
    },
    'createAgent'
  );
}
```

## Rate Limiting

### Rate Limit Configuration

```typescript
interface RateLimitConfig {
  windowMs: number;             // Time window in milliseconds
  maxRequests: number;          // Max requests per window
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean; // Only count successful requests
  keyGenerator?: (req: any) => string; // Custom key generation
}

// Default rate limits by endpoint type
const rateLimits: Record<string, RateLimitConfig> = {
  'agent.create': {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 5              // 5 agents per minute
  },
  'session.create': {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 100            // 100 sessions per minute
  },
  'event.create': {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 1000           // 1000 events per minute
  },
  'analytics.query': {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 30             // 30 analytics queries per minute
  }
};
```

## Type Definitions

### Core Types

```typescript
// Export all database table types
export {
  ParlantAgent,
  ParlantSession,
  ParlantEvent,
  ParlantGuideline,
  ParlantJourney,
  ParlantJourneyState,
  ParlantJourneyTransition,
  ParlantVariable,
  ParlantTool,
  ParlantTerm,
  ParlantCannedResponse
} from '@repo/db/schema';

// Enhanced response types
export interface ServiceResponse<T> {
  data: T;
  success: boolean;
  timestamp: Date;
  requestId: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  success: false;
  timestamp: Date;
  requestId: string;
}
```

This comprehensive API reference provides developers with complete documentation for integrating with the Parlant database services, including proper error handling, type safety, and usage examples.