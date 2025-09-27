import { z } from "zod";

/**
 * Parlant Validation Schemas
 *
 * This file provides comprehensive Zod validation schemas for all Parlant database entities.
 * These schemas are used for API validation, form validation, and ensuring data integrity.
 */

// =============================================================================
// Base Validation Schemas
// =============================================================================

/**
 * Common UUID schema
 */
export const uuidSchema = z.string().uuid("Invalid UUID format");

/**
 * Common timestamp schema
 */
export const timestampSchema = z.union([
  z.string().datetime("Invalid datetime format"),
  z.date(),
]);

/**
 * JSON object schema
 */
export const jsonObjectSchema = z.record(z.unknown());

/**
 * JSON array schema
 */
export const jsonArraySchema = z.array(z.unknown());

/**
 * Flexible JSON schema (object or array)
 */
export const jsonSchema = z.union([jsonObjectSchema, jsonArraySchema]);

// =============================================================================
// Enum Schemas
// =============================================================================

export const agentStatusSchema = z.enum(["active", "inactive", "archived"], {
  errorMap: () => ({
    message: "Agent status must be active, inactive, or archived",
  }),
});

export const sessionModeSchema = z.enum(["auto", "manual", "paused"], {
  errorMap: () => ({ message: "Session mode must be auto, manual, or paused" }),
});

export const sessionStatusSchema = z.enum(
  ["active", "completed", "abandoned"],
  {
    errorMap: () => ({
      message: "Session status must be active, completed, or abandoned",
    }),
  },
);

export const eventTypeSchema = z.enum(
  [
    "customer_message",
    "agent_message",
    "tool_call",
    "tool_result",
    "status_update",
    "journey_transition",
    "variable_update",
  ],
  {
    errorMap: () => ({ message: "Invalid event type" }),
  },
);

export const journeyStateTypeSchema = z.enum(
  ["chat", "tool", "decision", "final"],
  {
    errorMap: () => ({
      message: "Journey state type must be chat, tool, decision, or final",
    }),
  },
);

export const compositionModeSchema = z.enum(["fluid", "strict"], {
  errorMap: () => ({ message: "Composition mode must be fluid or strict" }),
});

// =============================================================================
// Agent Validation Schemas
// =============================================================================

/**
 * Agent creation schema
 */
export const createAgentSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  createdBy: z.string().min(1, "Created by is required"),
  name: z
    .string()
    .min(1, "Agent name is required")
    .max(255, "Agent name is too long"),
  description: z.string().max(2000, "Description is too long").optional(),

  // Behavior configuration
  compositionMode: compositionModeSchema.default("fluid"),
  systemPrompt: z.string().max(10000, "System prompt is too long").optional(),

  // AI Model configuration
  modelProvider: z
    .string()
    .min(1, "Model provider is required")
    .default("openai"),
  modelName: z.string().min(1, "Model name is required").default("gpt-4"),
  temperature: z
    .number()
    .int()
    .min(0)
    .max(100, "Temperature must be between 0 and 100")
    .default(70),
  maxTokens: z
    .number()
    .int()
    .min(1)
    .max(100000, "Max tokens must be between 1 and 100,000")
    .default(2000),

  // Advanced configuration
  responseTimeoutMs: z
    .number()
    .int()
    .min(1000)
    .max(300000, "Response timeout must be between 1-300 seconds")
    .default(30000),
  maxContextLength: z
    .number()
    .int()
    .min(100)
    .max(200000, "Max context length must be between 100-200,000")
    .default(8000),
  systemInstructions: z
    .string()
    .max(5000, "System instructions are too long")
    .optional(),

  // Behavior controls
  allowInterruption: z.boolean().default(true),
  allowProactiveMessages: z.boolean().default(false),
  conversationStyle: z
    .enum(["casual", "professional", "technical", "friendly"])
    .default("professional"),

  // Privacy and security
  dataRetentionDays: z
    .number()
    .int()
    .min(1)
    .max(365, "Data retention must be between 1-365 days")
    .default(30),
  allowDataExport: z.boolean().default(true),
  piiHandlingMode: z
    .enum(["strict", "standard", "relaxed"])
    .default("standard"),

  // Metadata
  integrationMetadata: jsonObjectSchema.default({}),
  customConfig: jsonObjectSchema.default({}),
});

/**
 * Agent update schema - all fields optional except validation requirements
 */
export const updateAgentSchema = createAgentSchema.partial().extend({
  id: uuidSchema,
});

/**
 * Agent response schema (what comes back from database)
 */
export const agentResponseSchema = createAgentSchema.extend({
  id: uuidSchema,
  status: agentStatusSchema,
  totalSessions: z.number().int().min(0),
  totalMessages: z.number().int().min(0),
  totalTokensUsed: z.number().int().min(0),
  totalCost: z.number().int().min(0),
  averageSessionDuration: z.number().int().min(0).nullable(),
  lastActiveAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  deletedAt: timestampSchema.nullable(),
});

// =============================================================================
// Session Validation Schemas
// =============================================================================

/**
 * Session creation schema
 */
export const createSessionSchema = z.object({
  agentId: uuidSchema,
  workspaceId: z.string().min(1, "Workspace ID is required"),
  userId: z.string().min(1).optional(), // Optional for anonymous sessions
  customerId: z.string().max(255, "Customer ID is too long").optional(),

  mode: sessionModeSchema.default("auto"),
  title: z.string().max(255, "Session title is too long").optional(),
  metadata: jsonObjectSchema.default({}),
  variables: jsonObjectSchema.default({}),

  // User context
  userAgent: z.string().max(500, "User agent is too long").optional(),
  ipAddress: z.string().ip().optional(),
  referrer: z.string().url().optional(),
  locale: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid locale format")
    .default("en"),
  timezone: z.string().max(50, "Timezone is too long").default("UTC"),
});

/**
 * Session update schema
 */
export const updateSessionSchema = createSessionSchema.partial().extend({
  id: uuidSchema,
  status: sessionStatusSchema.optional(),
  currentJourneyId: uuidSchema.optional(),
  currentStateId: uuidSchema.optional(),
  satisfactionScore: z.number().int().min(1).max(5).optional(),
});

/**
 * Session response schema
 */
export const sessionResponseSchema = createSessionSchema.extend({
  id: uuidSchema,
  status: sessionStatusSchema,
  currentJourneyId: uuidSchema.nullable(),
  currentStateId: uuidSchema.nullable(),

  // Analytics and tracking
  eventCount: z.number().int().min(0),
  messageCount: z.number().int().min(0),
  tokensUsed: z.number().int().min(0),
  cost: z.number().int().min(0),
  averageResponseTime: z.number().int().min(0).nullable(),
  satisfactionScore: z.number().int().min(1).max(5).nullable(),

  // Session categorization
  sessionType: z
    .enum(["conversation", "support", "onboarding", "survey"])
    .default("conversation"),
  tags: z.array(z.string()).default([]),

  // Timing
  startedAt: timestampSchema,
  lastActivityAt: timestampSchema,
  endedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// =============================================================================
// Event Validation Schemas
// =============================================================================

/**
 * Event creation schema
 */
export const createEventSchema = z.object({
  sessionId: uuidSchema,
  offset: z.number().int().min(0, "Offset must be non-negative"),
  eventType: eventTypeSchema,
  content: jsonObjectSchema,
  metadata: jsonObjectSchema.default({}),

  // Optional references
  toolCallId: z.string().max(255).optional(),
  journeyId: uuidSchema.optional(),
  stateId: uuidSchema.optional(),
});

/**
 * Event response schema
 */
export const eventResponseSchema = createEventSchema.extend({
  id: uuidSchema,
  createdAt: timestampSchema,
});

// =============================================================================
// Guideline Validation Schemas
// =============================================================================

/**
 * Guideline creation schema
 */
export const createGuidelineSchema = z.object({
  agentId: uuidSchema,
  condition: z
    .string()
    .min(1, "Condition is required")
    .max(2000, "Condition is too long"),
  action: z
    .string()
    .min(1, "Action is required")
    .max(2000, "Action is too long"),
  priority: z.number().int().min(1).max(1000).default(100),
  enabled: z.boolean().default(true),
  toolIds: z.array(z.string()).default([]),
});

/**
 * Guideline update schema
 */
export const updateGuidelineSchema = createGuidelineSchema.partial().extend({
  id: uuidSchema,
});

/**
 * Guideline response schema
 */
export const guidelineResponseSchema = createGuidelineSchema.extend({
  id: uuidSchema,
  matchCount: z.number().int().min(0),
  lastMatchedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// =============================================================================
// Journey Validation Schemas
// =============================================================================

/**
 * Journey creation schema
 */
export const createJourneySchema = z.object({
  agentId: uuidSchema,
  title: z
    .string()
    .min(1, "Journey title is required")
    .max(255, "Journey title is too long"),
  description: z
    .string()
    .max(2000, "Journey description is too long")
    .optional(),
  conditions: z
    .array(z.string().min(1, "Condition cannot be empty"))
    .min(1, "At least one condition is required"),
  enabled: z.boolean().default(true),
  allowSkipping: z.boolean().default(true),
  allowRevisiting: z.boolean().default(true),
});

/**
 * Journey update schema
 */
export const updateJourneySchema = createJourneySchema.partial().extend({
  id: uuidSchema,
});

/**
 * Journey response schema
 */
export const journeyResponseSchema = createJourneySchema.extend({
  id: uuidSchema,
  totalSessions: z.number().int().min(0),
  completionRate: z.number().int().min(0).max(100),
  lastUsedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// =============================================================================
// Journey State Validation Schemas
// =============================================================================

/**
 * Journey state base schema (without refinements)
 */
const journeyStateBaseSchema = z.object({
  journeyId: uuidSchema,
  name: z
    .string()
    .min(1, "State name is required")
    .max(255, "State name is too long"),
  stateType: journeyStateTypeSchema,

  // State content based on type
  chatPrompt: z.string().max(5000, "Chat prompt is too long").optional(),
  toolId: z.string().max(255).optional(),
  toolConfig: jsonObjectSchema.default({}),
  condition: z.string().max(2000, "Condition is too long").optional(),

  // State behavior
  isInitial: z.boolean().default(false),
  isFinal: z.boolean().default(false),
  allowSkip: z.boolean().default(true),

  metadata: jsonObjectSchema.default({}),
});

/**
 * Journey state creation schema (with validation refinements)
 */
export const createJourneyStateSchema = journeyStateBaseSchema.refine(
  (data) => {
    // Validate state type requirements
    if (data.stateType === "chat" && !data.chatPrompt) {
      return false;
    }
    if (data.stateType === "tool" && !data.toolId) {
      return false;
    }
    if (data.stateType === "decision" && !data.condition) {
      return false;
    }
    return true;
  },
  {
    message: "State content must match state type requirements",
  },
);

/**
 * Journey state response schema
 */
export const journeyStateResponseSchema = journeyStateBaseSchema.extend({
  id: uuidSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// =============================================================================
// Tool Validation Schemas
// =============================================================================

/**
 * Tool creation schema
 */
export const createToolSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  name: z
    .string()
    .min(1, "Tool name is required")
    .max(255, "Tool name is too long"),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(255, "Display name is too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description is too long"),

  simToolId: z.string().max(255).optional(),
  toolType: z.enum(["sim_native", "custom", "external"], {
    errorMap: () => ({
      message: "Tool type must be sim_native, custom, or external",
    }),
  }),

  // Function signature
  parameters: jsonObjectSchema,
  returnSchema: jsonObjectSchema.optional(),

  // Behavior configuration
  usageGuidelines: z
    .string()
    .max(5000, "Usage guidelines are too long")
    .optional(),
  errorHandling: jsonObjectSchema.default({}),
  executionTimeout: z.number().int().min(1000).max(300000).default(30000),
  retryPolicy: jsonObjectSchema.default({ max_attempts: 3, backoff_ms: 1000 }),

  // Rate limiting
  rateLimitPerMinute: z.number().int().min(1).max(10000).default(60),
  rateLimitPerHour: z.number().int().min(1).max(100000).default(1000),

  // Authentication
  requiresAuth: z.boolean().default(false),
  authType: z.enum(["api_key", "oauth", "basic", "none"]).optional(),
  authConfig: jsonObjectSchema.default({}),

  // Status
  enabled: z.boolean().default(true),
  isPublic: z.boolean().default(false),
});

/**
 * Tool response schema
 */
export const toolResponseSchema = createToolSchema.extend({
  id: uuidSchema,
  isDeprecated: z.boolean(),
  useCount: z.number().int().min(0),
  successRate: z.number().int().min(0).max(100),
  lastUsedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// =============================================================================
// Variable Validation Schemas
// =============================================================================

/**
 * Variable base schema (without refinements)
 */
const variableBaseSchema = z.object({
  agentId: uuidSchema,
  sessionId: uuidSchema.optional(),
  key: z
    .string()
    .min(1, "Variable key is required")
    .max(255, "Variable key is too long")
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      "Variable key must be a valid identifier",
    ),
  scope: z.enum(["session", "customer", "global"]).default("session"),
  value: jsonSchema,
  valueType: z.enum(["string", "number", "boolean", "object", "array"]),
  isPrivate: z.boolean().default(false),
  description: z.string().max(500, "Description is too long").optional(),
});

/**
 * Variable creation schema (with validation refinements)
 */
export const createVariableSchema = variableBaseSchema.refine(
  (data) => {
    // Validate value matches valueType
    const value = data.value;
    switch (data.valueType) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number";
      case "boolean":
        return typeof value === "boolean";
      case "object":
        return (
          typeof value === "object" && !Array.isArray(value) && value !== null
        );
      case "array":
        return Array.isArray(value);
      default:
        return false;
    }
  },
  {
    message: "Variable value must match the specified value type",
  },
);

/**
 * Variable response schema
 */
export const variableResponseSchema = variableBaseSchema.extend({
  id: uuidSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// =============================================================================
// Filter Schemas
// =============================================================================

/**
 * Agent filter schema
 */
export const agentFilterSchema = z.object({
  workspaceId: z.string().optional(),
  status: z.union([agentStatusSchema, z.array(agentStatusSchema)]).optional(),
  compositionMode: z
    .union([compositionModeSchema, z.array(compositionModeSchema)])
    .optional(),
  modelProvider: z.union([z.string(), z.array(z.string())]).optional(),
  conversationStyle: z.union([z.string(), z.array(z.string())]).optional(),
  createdBy: z.string().optional(),
  lastActiveAfter: timestampSchema.optional(),
  lastActiveBefore: timestampSchema.optional(),
  hasActiveSessions: z.boolean().optional(),
  search: z.string().max(255).optional(),
});

/**
 * Session filter schema
 */
export const sessionFilterSchema = z.object({
  agentId: z.union([uuidSchema, z.array(uuidSchema)]).optional(),
  workspaceId: z.string().optional(),
  userId: z.string().optional(),
  customerId: z.string().optional(),
  status: z
    .union([sessionStatusSchema, z.array(sessionStatusSchema)])
    .optional(),
  mode: z.union([sessionModeSchema, z.array(sessionModeSchema)]).optional(),
  hasEvents: z.boolean().optional(),
  startedAfter: timestampSchema.optional(),
  startedBefore: timestampSchema.optional(),
  endedAfter: timestampSchema.optional(),
  endedBefore: timestampSchema.optional(),
  currentJourneyId: uuidSchema.optional(),
  search: z.string().max(255).optional(),
});

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1, "Page must be at least 1").default(1),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100, "Page size must be between 1 and 100")
    .default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// =============================================================================
// Bulk Operation Schemas
// =============================================================================

/**
 * Bulk agent creation schema
 */
export const bulkCreateAgentSchema = z.object({
  agents: z
    .array(createAgentSchema)
    .min(1, "At least one agent is required")
    .max(50, "Cannot create more than 50 agents at once"),
});

/**
 * Bulk session creation schema
 */
export const bulkCreateSessionSchema = z.object({
  sessions: z
    .array(createSessionSchema)
    .min(1, "At least one session is required")
    .max(100, "Cannot create more than 100 sessions at once"),
});

// =============================================================================
// API Request/Response Schemas
// =============================================================================

/**
 * Standard API response schema
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: jsonObjectSchema.optional(),
        field: z.string().optional(),
      })
      .optional(),
    timestamp: timestampSchema,
  });

/**
 * Paginated API response schema
 */
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
) =>
  z.object({
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
      hasNext: z.boolean(),
      hasPrevious: z.boolean(),
    }),
  });

// =============================================================================
// Utility Validation Functions
// =============================================================================

/**
 * Validate and transform create agent data
 */
export function validateCreateAgent(data: unknown) {
  return createAgentSchema.parse(data);
}

/**
 * Validate and transform create session data
 */
export function validateCreateSession(data: unknown) {
  return createSessionSchema.parse(data);
}

/**
 * Validate and transform create event data
 */
export function validateCreateEvent(data: unknown) {
  return createEventSchema.parse(data);
}

/**
 * Validate pagination parameters
 */
export function validatePagination(data: unknown) {
  return paginationSchema.parse(data);
}

/**
 * Validate agent filters
 */
export function validateAgentFilters(data: unknown) {
  return agentFilterSchema.parse(data);
}

/**
 * Validate session filters
 */
export function validateSessionFilters(data: unknown) {
  return sessionFilterSchema.parse(data);
}

/**
 * Safe validation with error handling
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
):
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: z.ZodError;
    } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Transform Zod errors to API-friendly format
 */
export function formatValidationErrors(zodError: z.ZodError) {
  return zodError.errors.map((error) => ({
    field: error.path.join("."),
    message: error.message,
    code: error.code,
    value: (error as any).received,
  }));
}

// =============================================================================
// Export all schemas
// =============================================================================

export const parlantSchemas = {
  // Base schemas
  uuid: uuidSchema,
  timestamp: timestampSchema,
  jsonObject: jsonObjectSchema,
  jsonArray: jsonArraySchema,
  json: jsonSchema,

  // Enum schemas
  agentStatus: agentStatusSchema,
  sessionMode: sessionModeSchema,
  sessionStatus: sessionStatusSchema,
  eventType: eventTypeSchema,
  journeyStateType: journeyStateTypeSchema,
  compositionMode: compositionModeSchema,

  // Entity creation schemas
  createAgent: createAgentSchema,
  createSession: createSessionSchema,
  createEvent: createEventSchema,
  createGuideline: createGuidelineSchema,
  createJourney: createJourneySchema,
  createJourneyState: createJourneyStateSchema,
  createTool: createToolSchema,
  createVariable: createVariableSchema,

  // Entity update schemas
  updateAgent: updateAgentSchema,
  updateSession: updateSessionSchema,
  updateGuideline: updateGuidelineSchema,
  updateJourney: updateJourneySchema,

  // Entity response schemas
  agentResponse: agentResponseSchema,
  sessionResponse: sessionResponseSchema,
  eventResponse: eventResponseSchema,
  guidelineResponse: guidelineResponseSchema,
  journeyResponse: journeyResponseSchema,
  journeyStateResponse: journeyStateResponseSchema,
  toolResponse: toolResponseSchema,
  variableResponse: variableResponseSchema,

  // Filter schemas
  agentFilter: agentFilterSchema,
  sessionFilter: sessionFilterSchema,
  pagination: paginationSchema,

  // Bulk operation schemas
  bulkCreateAgent: bulkCreateAgentSchema,
  bulkCreateSession: bulkCreateSessionSchema,

  // API schemas
  apiResponse: apiResponseSchema,
  paginatedResponse: paginatedResponseSchema,
};

/**
 * Type definitions derived from schemas
 */
export type ValidatedCreateAgent = z.infer<typeof createAgentSchema>;
export type ValidatedCreateSession = z.infer<typeof createSessionSchema>;
export type ValidatedCreateEvent = z.infer<typeof createEventSchema>;
export type ValidatedAgentFilters = z.infer<typeof agentFilterSchema>;
export type ValidatedSessionFilters = z.infer<typeof sessionFilterSchema>;
export type ValidatedPagination = z.infer<typeof paginationSchema>;
