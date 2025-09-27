import type {
  ParlantAgent,
  ParlantAgentKnowledgeBase,
  ParlantAgentTool,
  ParlantEvent,
  ParlantGuideline,
  ParlantJourney,
  ParlantJourneyGuideline,
  ParlantJourneyState,
  ParlantJourneyTransition,
  ParlantSession,
  ParlantTool,
  ParlantToolIntegration,
  ParlantVariable,
} from "./parlant-types";

/**
 * Parlant Union Types and Polymorphic Relationships
 *
 * This file defines advanced type unions, discriminated unions, and polymorphic
 * relationship types for complex Parlant operations and data structures.
 */

// =============================================================================
// Event Content Union Types
// =============================================================================

/**
 * Base event content structure
 */
interface BaseEventContent {
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Customer message event content
 */
export interface CustomerMessageContent extends BaseEventContent {
  type: "customer_message";
  message: {
    text: string;
    attachments?: Array<{
      type: "image" | "document" | "audio" | "video";
      url: string;
      filename: string;
      size: number;
      mimeType: string;
    }>;
    metadata?: {
      channelId?: string;
      threadId?: string;
      replyToMessageId?: string;
      isEdited?: boolean;
      editedAt?: string;
    };
  };
  sender: {
    customerId?: string;
    userId?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    isAnonymous: boolean;
  };
}

/**
 * Agent message event content
 */
export interface AgentMessageContent extends BaseEventContent {
  type: "agent_message";
  message: {
    text: string;
    thoughts?: string; // Internal reasoning
    confidence?: number; // 0-1 confidence score
    tone?: "friendly" | "professional" | "casual" | "empathetic" | "direct";
    containsSensitiveInfo?: boolean;
    generationMetrics?: {
      tokensUsed: number;
      responseTimeMs: number;
      modelUsed: string;
      temperature: number;
    };
  };
  guidelines?: Array<{
    guidelineId: string;
    condition: string;
    applied: boolean;
    reason?: string;
  }>;
  cannedResponse?: {
    responseId: string;
    template: string;
    variables?: Record<string, string>;
  };
}

/**
 * Tool call event content
 */
export interface ToolCallContent extends BaseEventContent {
  type: "tool_call";
  toolCall: {
    toolId: string;
    toolName: string;
    callId: string;
    parameters: Record<string, unknown>;
    reasoning?: string;
    expectedOutcome?: string;
  };
  context: {
    triggeredByGuideline?: string;
    relatedToJourney?: string;
    urgencyLevel?: "low" | "medium" | "high";
  };
}

/**
 * Tool result event content
 */
export interface ToolResultContent extends BaseEventContent {
  type: "tool_result";
  toolResult: {
    callId: string;
    toolId: string;
    toolName: string;
    status: "success" | "error" | "timeout";
    result?: Record<string, unknown>;
    error?: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };
    executionTimeMs: number;
    retryCount?: number;
  };
  impact: {
    changedVariables?: string[];
    triggeredJourneyTransition?: boolean;
    affectedGuidelines?: string[];
  };
}

/**
 * Status update event content
 */
export interface StatusUpdateContent extends BaseEventContent {
  type: "status_update";
  statusChange: {
    field: "mode" | "journey" | "state" | "satisfaction" | "priority";
    from: string | number | null;
    to: string | number | null;
    reason: string;
    triggeredBy: "user" | "agent" | "system" | "tool" | "guideline";
  };
  context: {
    journeyId?: string;
    stateId?: string;
    guidelineId?: string;
    toolCallId?: string;
  };
}

/**
 * Journey transition event content
 */
export interface JourneyTransitionContent extends BaseEventContent {
  type: "journey_transition";
  transition: {
    journeyId: string;
    fromStateId?: string;
    toStateId: string;
    transitionId?: string;
    condition?: string;
    automatic: boolean;
    confidence?: number; // 0-1 confidence in transition decision
  };
  context: {
    triggerReason: string;
    userInput?: string;
    variablesEvaluated?: Record<string, unknown>;
    guidelinesConsidered?: string[];
    alternativeStates?: Array<{
      stateId: string;
      confidence: number;
      reason: string;
    }>;
  };
}

/**
 * Variable update event content
 */
export interface VariableUpdateContent extends BaseEventContent {
  type: "variable_update";
  variableChange: {
    variableId: string;
    key: string;
    valueType: "string" | "number" | "boolean" | "object" | "array";
    from: unknown;
    to: unknown;
    operation: "create" | "update" | "delete";
    source: "user_input" | "tool_result" | "agent_inference" | "journey_logic";
  };
  context: {
    relatedEventId?: string;
    confidenceScore?: number;
    extractionMethod?: string;
    validationStatus: "validated" | "pending" | "failed";
  };
}

/**
 * Discriminated union of all event content types
 */
export type ParlantEventContent =
  | CustomerMessageContent
  | AgentMessageContent
  | ToolCallContent
  | ToolResultContent
  | StatusUpdateContent
  | JourneyTransitionContent
  | VariableUpdateContent;

// =============================================================================
// Journey State Content Union Types
// =============================================================================

/**
 * Base journey state configuration
 */
interface BaseJourneyStateConfig {
  metadata?: Record<string, unknown>;
  skipConditions?: string[];
  timeoutMs?: number;
}

/**
 * Chat state configuration
 */
export interface ChatStateConfig extends BaseJourneyStateConfig {
  stateType: "chat";
  prompt: {
    template: string;
    variables?: Record<string, string>;
    tone?: "friendly" | "professional" | "casual" | "empathetic";
    maxLength?: number;
  };
  validation?: {
    required: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    allowedValues?: string[];
  };
  followUpActions?: Array<{
    condition: string;
    action: "continue" | "repeat" | "branch" | "collect_more_info";
    parameters?: Record<string, unknown>;
  }>;
}

/**
 * Tool state configuration
 */
export interface ToolStateConfig extends BaseJourneyStateConfig {
  stateType: "tool";
  tool: {
    toolId: string;
    parameters: Record<string, unknown>;
    parameterMapping?: Record<string, string>; // Map from variables to tool params
    retryPolicy?: {
      maxAttempts: number;
      backoffMs: number;
      retryConditions: string[];
    };
  };
  resultHandling: {
    successTransition?: string;
    errorTransition?: string;
    variableMapping?: Record<string, string>; // Map from tool results to variables
    validationRules?: string[];
  };
}

/**
 * Decision state configuration
 */
export interface DecisionStateConfig extends BaseJourneyStateConfig {
  stateType: "decision";
  decision: {
    condition: string;
    evaluationMethod: "rule_based" | "ai_assisted" | "user_choice";
    options: Array<{
      label: string;
      value: string;
      condition?: string;
      nextStateId: string;
      confidence?: number;
    }>;
  };
  fallback: {
    defaultOption?: string;
    clarificationPrompt?: string;
    maxAttempts?: number;
  };
}

/**
 * Final state configuration
 */
export interface FinalStateConfig extends BaseJourneyStateConfig {
  stateType: "final";
  completion: {
    message?: string;
    summary?: {
      includeVariables: boolean;
      customTemplate?: string;
      highlightAchievements?: boolean;
    };
    followUpActions?: Array<{
      type:
        | "schedule_reminder"
        | "send_email"
        | "create_task"
        | "trigger_workflow";
      parameters: Record<string, unknown>;
      delay?: string; // ISO 8601 duration
    }>;
  };
  analytics: {
    trackCompletion: boolean;
    customMetrics?: Record<string, unknown>;
    satisfactionSurvey?: {
      enabled: boolean;
      questions: Array<{
        text: string;
        type: "rating" | "text" | "choice";
        required: boolean;
      }>;
    };
  };
}

/**
 * Discriminated union of journey state configurations
 */
export type JourneyStateConfiguration =
  | ChatStateConfig
  | ToolStateConfig
  | DecisionStateConfig
  | FinalStateConfig;

// =============================================================================
// Tool Integration Union Types
// =============================================================================

/**
 * Base tool integration configuration
 */
interface BaseToolIntegrationConfig {
  enabled: boolean;
  description?: string;
  tags?: string[];
}

/**
 * Custom tool integration
 */
export interface CustomToolIntegration extends BaseToolIntegrationConfig {
  integrationType: "custom_tool";
  customTool: {
    toolId: string;
    version?: string;
    configuration: Record<string, unknown>;
  };
  parameterMapping: {
    input: Record<string, string>;
    output: Record<string, string>;
  };
}

/**
 * Workflow block integration
 */
export interface WorkflowBlockIntegration extends BaseToolIntegrationConfig {
  integrationType: "workflow_block";
  workflowBlock: {
    blockId: string;
    workflowId: string;
    blockType: string;
    configuration: Record<string, unknown>;
  };
  executionContext: {
    inheritSessionVariables: boolean;
    passthrough: Record<string, string>;
    outputCapture: string[];
  };
}

/**
 * MCP server integration
 */
export interface McpServerIntegration extends BaseToolIntegrationConfig {
  integrationType: "mcp_server";
  mcpServer: {
    serverId: string;
    toolName: string;
    version?: string;
    configuration: Record<string, unknown>;
  };
  connectionSettings: {
    timeout: number;
    retries: number;
    healthCheckInterval: number;
  };
}

/**
 * External API integration
 */
export interface ExternalApiIntegration extends BaseToolIntegrationConfig {
  integrationType: "external_api";
  apiConfig: {
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    authentication: {
      type: "api_key" | "bearer" | "basic" | "oauth2";
      configuration: Record<string, unknown>;
    };
  };
  requestMapping: {
    parameters: Record<string, string>;
    bodyTemplate?: string;
    queryParams?: Record<string, string>;
  };
  responseMapping: {
    successPath?: string;
    errorPath?: string;
    dataExtraction: Record<string, string>;
  };
}

/**
 * Discriminated union of tool integration types
 */
export type ToolIntegrationConfiguration =
  | CustomToolIntegration
  | WorkflowBlockIntegration
  | McpServerIntegration
  | ExternalApiIntegration;

// =============================================================================
// Session Context Union Types
// =============================================================================

/**
 * Anonymous session context
 */
export interface AnonymousSessionContext {
  userType: "anonymous";
  sessionId: string;
  fingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  locale: string;
  timezone: string;
  entryPoint: {
    source: "website" | "chat_widget" | "api" | "mobile_app" | "social_media";
    page?: string;
    campaign?: string;
    referralCode?: string;
  };
}

/**
 * Authenticated session context
 */
export interface AuthenticatedSessionContext {
  userType: "authenticated";
  sessionId: string;
  user: {
    userId: string;
    email?: string;
    name?: string;
    role?: string;
    permissions?: string[];
    preferences?: Record<string, unknown>;
  };
  workspace: {
    workspaceId: string;
    name: string;
    plan?: string;
    features?: string[];
  };
  entryPoint: {
    source: "dashboard" | "api" | "mobile_app" | "integration";
    context?: Record<string, unknown>;
  };
}

/**
 * Customer session context (external users)
 */
export interface CustomerSessionContext {
  userType: "customer";
  sessionId: string;
  customer: {
    customerId: string;
    email?: string;
    name?: string;
    segment?: string;
    tier?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
  };
  businessContext: {
    organizationId?: string;
    accountId?: string;
    subscriptionStatus?: string;
    supportTier?: string;
  };
  entryPoint: {
    source:
      | "support_portal"
      | "website"
      | "email_link"
      | "mobile_app"
      | "chat_widget";
    ticketId?: string;
    campaignId?: string;
    context?: Record<string, unknown>;
  };
}

/**
 * Discriminated union of session contexts
 */
export type SessionContext =
  | AnonymousSessionContext
  | AuthenticatedSessionContext
  | CustomerSessionContext;

// =============================================================================
// Composite Entity Types
// =============================================================================

/**
 * Full event with typed content
 */
export interface TypedParlantEvent<
  T extends ParlantEventContent = ParlantEventContent,
> extends Omit<ParlantEvent, "content"> {
  content: T;
  typedMetadata?: Record<string, unknown>;
}

/**
 * Journey state with typed configuration
 */
export interface TypedJourneyState<
  T extends JourneyStateConfiguration = JourneyStateConfiguration,
> extends Omit<ParlantJourneyState, "toolConfig"> {
  configuration: T;
}

/**
 * Tool with typed integration
 */
export interface TypedParlantTool<
  T extends ToolIntegrationConfiguration = ToolIntegrationConfiguration,
> extends ParlantTool {
  integrations: Array<ParlantToolIntegration & { configuration: T }>;
}

/**
 * Session with typed context
 */
export interface TypedParlantSession<T extends SessionContext = SessionContext>
  extends Omit<ParlantSession, "metadata"> {
  context: T;
  typedMetadata?: Record<string, unknown>;
}

// =============================================================================
// Query Result Union Types
// =============================================================================

/**
 * Agent query result with relationships
 */
export type AgentQueryResult = ParlantAgent & {
  _relations?: {
    activeSessions?: ParlantSession[];
    recentEvents?: TypedParlantEvent[];
    tools?: (ParlantAgentTool & { tool: ParlantTool })[];
    guidelines?: ParlantGuideline[];
    journeys?: ParlantJourney[];
    knowledgeBases?: (ParlantAgentKnowledgeBase & {
      knowledgeBase: { id: string; name: string };
    })[];
  };
};

/**
 * Session query result with full context
 */
export type SessionQueryResult = TypedParlantSession & {
  _relations?: {
    agent?: ParlantAgent;
    events?: TypedParlantEvent[];
    currentJourney?: ParlantJourney & {
      states?: TypedJourneyState[];
      transitions?: ParlantJourneyTransition[];
    };
    currentState?: TypedJourneyState;
    variables?: ParlantVariable[];
    workflows?: Array<{
      workflowId: string;
      executionId?: string;
      status: string;
      triggeredAt: string;
    }>;
  };
};

/**
 * Journey query result with complete flow
 */
export type JourneyQueryResult = ParlantJourney & {
  _relations?: {
    agent?: ParlantAgent;
    states?: Array<
      TypedJourneyState & {
        transitions?: Array<
          ParlantJourneyTransition & { toState?: TypedJourneyState }
        >;
      }
    >;
    guidelines?: (ParlantJourneyGuideline & { guideline: ParlantGuideline })[];
    analytics?: {
      totalSessions: number;
      completionRate: number;
      averageDuration: number;
      dropoffPoints: Array<{
        stateId: string;
        stateName: string;
        dropoffRate: number;
      }>;
    };
  };
};

// =============================================================================
// Entity Factory Types
// =============================================================================

/**
 * Event factory function signatures
 */
export interface EventFactory {
  createCustomerMessage: (params: {
    sessionId: string;
    offset: number;
    message: CustomerMessageContent["message"];
    sender: CustomerMessageContent["sender"];
    metadata?: Record<string, unknown>;
  }) => TypedParlantEvent<CustomerMessageContent>;

  createAgentMessage: (params: {
    sessionId: string;
    offset: number;
    message: AgentMessageContent["message"];
    guidelines?: AgentMessageContent["guidelines"];
    cannedResponse?: AgentMessageContent["cannedResponse"];
    metadata?: Record<string, unknown>;
  }) => TypedParlantEvent<AgentMessageContent>;

  createToolCall: (params: {
    sessionId: string;
    offset: number;
    toolCall: ToolCallContent["toolCall"];
    context?: ToolCallContent["context"];
    metadata?: Record<string, unknown>;
  }) => TypedParlantEvent<ToolCallContent>;

  createToolResult: (params: {
    sessionId: string;
    offset: number;
    toolResult: ToolResultContent["toolResult"];
    impact?: ToolResultContent["impact"];
    metadata?: Record<string, unknown>;
  }) => TypedParlantEvent<ToolResultContent>;
}

/**
 * State factory function signatures
 */
export interface StateFactory {
  createChatState: (params: {
    journeyId: string;
    name: string;
    configuration: ChatStateConfig;
  }) => TypedJourneyState<ChatStateConfig>;

  createToolState: (params: {
    journeyId: string;
    name: string;
    configuration: ToolStateConfig;
  }) => TypedJourneyState<ToolStateConfig>;

  createDecisionState: (params: {
    journeyId: string;
    name: string;
    configuration: DecisionStateConfig;
  }) => TypedJourneyState<DecisionStateConfig>;

  createFinalState: (params: {
    journeyId: string;
    name: string;
    configuration: FinalStateConfig;
  }) => TypedJourneyState<FinalStateConfig>;
}

// =============================================================================
// Type Guard Functions
// =============================================================================

/**
 * Event content type guards
 */
export function isCustomerMessageContent(
  content: ParlantEventContent,
): content is CustomerMessageContent {
  return content.type === "customer_message";
}

export function isAgentMessageContent(
  content: ParlantEventContent,
): content is AgentMessageContent {
  return content.type === "agent_message";
}

export function isToolCallContent(
  content: ParlantEventContent,
): content is ToolCallContent {
  return content.type === "tool_call";
}

export function isToolResultContent(
  content: ParlantEventContent,
): content is ToolResultContent {
  return content.type === "tool_result";
}

export function isJourneyTransitionContent(
  content: ParlantEventContent,
): content is JourneyTransitionContent {
  return content.type === "journey_transition";
}

/**
 * Journey state configuration type guards
 */
export function isChatStateConfig(
  config: JourneyStateConfiguration,
): config is ChatStateConfig {
  return config.stateType === "chat";
}

export function isToolStateConfig(
  config: JourneyStateConfiguration,
): config is ToolStateConfig {
  return config.stateType === "tool";
}

export function isDecisionStateConfig(
  config: JourneyStateConfiguration,
): config is DecisionStateConfig {
  return config.stateType === "decision";
}

export function isFinalStateConfig(
  config: JourneyStateConfiguration,
): config is FinalStateConfig {
  return config.stateType === "final";
}

/**
 * Tool integration type guards
 */
export function isCustomToolIntegration(
  config: ToolIntegrationConfiguration,
): config is CustomToolIntegration {
  return config.integrationType === "custom_tool";
}

export function isWorkflowBlockIntegration(
  config: ToolIntegrationConfiguration,
): config is WorkflowBlockIntegration {
  return config.integrationType === "workflow_block";
}

export function isMcpServerIntegration(
  config: ToolIntegrationConfiguration,
): config is McpServerIntegration {
  return config.integrationType === "mcp_server";
}

/**
 * Session context type guards
 */
export function isAnonymousSession(
  context: SessionContext,
): context is AnonymousSessionContext {
  return context.userType === "anonymous";
}

export function isAuthenticatedSession(
  context: SessionContext,
): context is AuthenticatedSessionContext {
  return context.userType === "authenticated";
}

export function isCustomerSession(
  context: SessionContext,
): context is CustomerSessionContext {
  return context.userType === "customer";
}

// =============================================================================
// Export all union types
// =============================================================================

export type ParlantUnionTypes = {
  // Event content types
  EventContent: ParlantEventContent;
  CustomerMessageContent: CustomerMessageContent;
  AgentMessageContent: AgentMessageContent;
  ToolCallContent: ToolCallContent;
  ToolResultContent: ToolResultContent;
  StatusUpdateContent: StatusUpdateContent;
  JourneyTransitionContent: JourneyTransitionContent;
  VariableUpdateContent: VariableUpdateContent;

  // Journey state types
  JourneyStateConfiguration: JourneyStateConfiguration;
  ChatStateConfig: ChatStateConfig;
  ToolStateConfig: ToolStateConfig;
  DecisionStateConfig: DecisionStateConfig;
  FinalStateConfig: FinalStateConfig;

  // Tool integration types
  ToolIntegrationConfiguration: ToolIntegrationConfiguration;
  CustomToolIntegration: CustomToolIntegration;
  WorkflowBlockIntegration: WorkflowBlockIntegration;
  McpServerIntegration: McpServerIntegration;
  ExternalApiIntegration: ExternalApiIntegration;

  // Session context types
  SessionContext: SessionContext;
  AnonymousSessionContext: AnonymousSessionContext;
  AuthenticatedSessionContext: AuthenticatedSessionContext;
  CustomerSessionContext: CustomerSessionContext;

  // Composite entity types
  TypedParlantEvent: TypedParlantEvent;
  TypedJourneyState: TypedJourneyState;
  TypedParlantTool: TypedParlantTool;
  TypedParlantSession: TypedParlantSession;

  // Query result types
  AgentQueryResult: AgentQueryResult;
  SessionQueryResult: SessionQueryResult;
  JourneyQueryResult: JourneyQueryResult;

  // Factory types
  EventFactory: EventFactory;
  StateFactory: StateFactory;
};
