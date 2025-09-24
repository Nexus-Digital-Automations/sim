/**
 * Agent Management API - Validation Schemas
 *
 * Comprehensive Zod schemas for validating agent lifecycle management requests
 * and responses. These schemas ensure type safety and data integrity across
 * all agent-related API endpoints.
 */

import { z } from 'zod'

// Agent status enum validation
export const AgentStatusEnum = z.enum(['active', 'inactive', 'archived'])
export type AgentStatus = z.infer<typeof AgentStatusEnum>

// Composition mode enum validation
export const CompositionModeEnum = z.enum(['fluid', 'strict'])
export type CompositionMode = z.infer<typeof CompositionModeEnum>

// Session mode enum validation
export const SessionModeEnum = z.enum(['auto', 'manual', 'paused'])
export type SessionMode = z.infer<typeof SessionModeEnum>

// Session status enum validation
export const SessionStatusEnum = z.enum(['active', 'completed', 'abandoned'])
export type SessionStatus = z.infer<typeof SessionStatusEnum>

/**
 * Agent Creation Request Schema
 */
export const CreateAgentRequestSchema = z.object({
  name: z.string()
    .min(1, 'Agent name is required')
    .max(255, 'Agent name must be 255 characters or less')
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Agent name contains invalid characters'),

  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),

  workspaceId: z.string()
    .uuid('Invalid workspace ID format'),

  // Behavior configuration
  compositionMode: CompositionModeEnum.default('fluid'),
  systemPrompt: z.string()
    .max(10000, 'System prompt must be 10000 characters or less')
    .optional(),

  // AI Model configuration
  modelProvider: z.string()
    .min(1, 'Model provider is required')
    .max(100, 'Model provider must be 100 characters or less')
    .default('openai'),

  modelName: z.string()
    .min(1, 'Model name is required')
    .max(100, 'Model name must be 100 characters or less')
    .default('gpt-4'),

  temperature: z.number()
    .min(0, 'Temperature must be between 0 and 100')
    .max(100, 'Temperature must be between 0 and 100')
    .default(70),

  maxTokens: z.number()
    .min(1, 'Max tokens must be at least 1')
    .max(32000, 'Max tokens must be 32000 or less')
    .default(2000),
})

export type CreateAgentRequest = z.infer<typeof CreateAgentRequestSchema>

/**
 * Agent Update Request Schema
 */
export const UpdateAgentRequestSchema = z.object({
  name: z.string()
    .min(1, 'Agent name is required')
    .max(255, 'Agent name must be 255 characters or less')
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Agent name contains invalid characters')
    .optional(),

  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),

  status: AgentStatusEnum.optional(),

  // Behavior configuration
  compositionMode: CompositionModeEnum.optional(),
  systemPrompt: z.string()
    .max(10000, 'System prompt must be 10000 characters or less')
    .optional(),

  // AI Model configuration
  modelProvider: z.string()
    .min(1, 'Model provider is required')
    .max(100, 'Model provider must be 100 characters or less')
    .optional(),

  modelName: z.string()
    .min(1, 'Model name is required')
    .max(100, 'Model name must be 100 characters or less')
    .optional(),

  temperature: z.number()
    .min(0, 'Temperature must be between 0 and 100')
    .max(100, 'Temperature must be between 0 and 100')
    .optional(),

  maxTokens: z.number()
    .min(1, 'Max tokens must be at least 1')
    .max(32000, 'Max tokens must be 32000 or less')
    .optional(),
})

export type UpdateAgentRequest = z.infer<typeof UpdateAgentRequestSchema>

/**
 * Agent Response Schema
 */
export const AgentResponseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  createdBy: z.string().uuid(),

  // Agent configuration
  name: z.string(),
  description: z.string().nullable(),
  status: AgentStatusEnum,

  // Behavior configuration
  compositionMode: CompositionModeEnum,
  systemPrompt: z.string().nullable(),

  // AI Model configuration
  modelProvider: z.string(),
  modelName: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),

  // Usage tracking
  totalSessions: z.number(),
  totalMessages: z.number(),
  lastActiveAt: z.string().datetime().nullable(),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type AgentResponse = z.infer<typeof AgentResponseSchema>

/**
 * Agent List Query Parameters Schema
 */
export const AgentListQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  status: AgentStatusEnum.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'lastActiveAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(255).optional(),
})

export type AgentListQuery = z.infer<typeof AgentListQuerySchema>

/**
 * Agent List Response Schema
 */
export const AgentListResponseSchema = z.object({
  agents: z.array(AgentResponseSchema),
  pagination: z.object({
    total: z.number(),
    offset: z.number(),
    limit: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

export type AgentListResponse = z.infer<typeof AgentListResponseSchema>

/**
 * Session Creation Request Schema
 */
export const CreateSessionRequestSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID format'),
  mode: SessionModeEnum.default('auto'),
  title: z.string()
    .max(255, 'Title must be 255 characters or less')
    .optional(),
  customerId: z.string()
    .max(255, 'Customer ID must be 255 characters or less')
    .optional(),
  metadata: z.record(z.any()).default({}),
  variables: z.record(z.any()).default({}),
})

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>

/**
 * Session Response Schema
 */
export const SessionResponseSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  customerId: z.string().nullable(),

  // Session configuration
  mode: SessionModeEnum,
  status: SessionStatusEnum,
  title: z.string().nullable(),
  metadata: z.record(z.any()),

  // Context and state
  currentJourneyId: z.string().uuid().nullable(),
  currentStateId: z.string().uuid().nullable(),
  variables: z.record(z.any()),

  // Tracking
  eventCount: z.number(),
  messageCount: z.number(),

  // Timing
  startedAt: z.string().datetime(),
  lastActivityAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type SessionResponse = z.infer<typeof SessionResponseSchema>

/**
 * Session List Query Parameters Schema
 */
export const SessionListQuerySchema = z.object({
  status: SessionStatusEnum.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['startedAt', 'lastActivityAt', 'createdAt']).default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type SessionListQuery = z.infer<typeof SessionListQuerySchema>

/**
 * Session List Response Schema
 */
export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionResponseSchema),
  pagination: z.object({
    total: z.number(),
    offset: z.number(),
    limit: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

export type SessionListResponse = z.infer<typeof SessionListResponseSchema>

/**
 * Agent Status Response Schema
 */
export const AgentStatusResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: AgentStatusEnum,
  workspaceId: z.string().uuid(),

  // Health metrics
  isHealthy: z.boolean(),
  lastHealthCheck: z.string().datetime(),

  // Performance metrics
  metrics: z.object({
    totalSessions: z.number(),
    totalMessages: z.number(),
    activeSessions: z.number(),
    averageResponseTime: z.number(), // milliseconds
    successRate: z.number(), // percentage
    errorCount: z.number(),
    lastActiveAt: z.string().datetime().nullable(),
  }),

  // Configuration summary
  configuration: z.object({
    modelProvider: z.string(),
    modelName: z.string(),
    temperature: z.number(),
    maxTokens: z.number(),
    compositionMode: CompositionModeEnum,
  }),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type AgentStatusResponse = z.infer<typeof AgentStatusResponseSchema>

/**
 * Error Response Schema
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  requestId: z.string().optional(),
  timestamp: z.string().datetime(),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

/**
 * Success Response Schema (for operations that don't return data)
 */
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  requestId: z.string().optional(),
  timestamp: z.string().datetime(),
})

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>