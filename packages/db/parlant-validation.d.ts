import { z } from 'zod'
/**
 * Parlant Validation Schemas
 *
 * This file provides comprehensive Zod validation schemas for all Parlant database entities.
 * These schemas are used for API validation, form validation, and ensuring data integrity.
 */
/**
 * Common UUID schema
 */
export declare const uuidSchema: z.ZodString
/**
 * Common timestamp schema
 */
export declare const timestampSchema: z.ZodUnion<[z.ZodString, z.ZodDate]>
/**
 * JSON object schema
 */
export declare const jsonObjectSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>
/**
 * JSON array schema
 */
export declare const jsonArraySchema: z.ZodArray<z.ZodUnknown, 'many'>
/**
 * Flexible JSON schema (object or array)
 */
export declare const jsonSchema: z.ZodUnion<
  [z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodUnknown, 'many'>]
>
export declare const agentStatusSchema: z.ZodEnum<['active', 'inactive', 'archived']>
export declare const sessionModeSchema: z.ZodEnum<['auto', 'manual', 'paused']>
export declare const sessionStatusSchema: z.ZodEnum<['active', 'completed', 'abandoned']>
export declare const eventTypeSchema: z.ZodEnum<
  [
    'customer_message',
    'agent_message',
    'tool_call',
    'tool_result',
    'status_update',
    'journey_transition',
    'variable_update',
  ]
>
export declare const journeyStateTypeSchema: z.ZodEnum<['chat', 'tool', 'decision', 'final']>
export declare const compositionModeSchema: z.ZodEnum<['fluid', 'strict']>
/**
 * Agent creation schema
 */
export declare const createAgentSchema: z.ZodObject<
  {
    workspaceId: z.ZodString
    createdBy: z.ZodString
    name: z.ZodString
    description: z.ZodOptional<z.ZodString>
    compositionMode: z.ZodDefault<z.ZodEnum<['fluid', 'strict']>>
    systemPrompt: z.ZodOptional<z.ZodString>
    modelProvider: z.ZodDefault<z.ZodString>
    modelName: z.ZodDefault<z.ZodString>
    temperature: z.ZodDefault<z.ZodNumber>
    maxTokens: z.ZodDefault<z.ZodNumber>
    responseTimeoutMs: z.ZodDefault<z.ZodNumber>
    maxContextLength: z.ZodDefault<z.ZodNumber>
    systemInstructions: z.ZodOptional<z.ZodString>
    allowInterruption: z.ZodDefault<z.ZodBoolean>
    allowProactiveMessages: z.ZodDefault<z.ZodBoolean>
    conversationStyle: z.ZodDefault<z.ZodEnum<['casual', 'professional', 'technical', 'friendly']>>
    dataRetentionDays: z.ZodDefault<z.ZodNumber>
    allowDataExport: z.ZodDefault<z.ZodBoolean>
    piiHandlingMode: z.ZodDefault<z.ZodEnum<['strict', 'standard', 'relaxed']>>
    integrationMetadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    customConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string
    workspaceId: string
    createdBy: string
    compositionMode: 'strict' | 'fluid'
    modelProvider: string
    modelName: string
    temperature: number
    maxTokens: number
    responseTimeoutMs: number
    maxContextLength: number
    allowInterruption: boolean
    allowProactiveMessages: boolean
    conversationStyle: 'professional' | 'technical' | 'friendly' | 'casual'
    dataRetentionDays: number
    allowDataExport: boolean
    piiHandlingMode: 'strict' | 'standard' | 'relaxed'
    integrationMetadata: Record<string, unknown>
    customConfig: Record<string, unknown>
    description?: string | undefined
    systemPrompt?: string | undefined
    systemInstructions?: string | undefined
  },
  {
    name: string
    workspaceId: string
    createdBy: string
    description?: string | undefined
    compositionMode?: 'strict' | 'fluid' | undefined
    systemPrompt?: string | undefined
    modelProvider?: string | undefined
    modelName?: string | undefined
    temperature?: number | undefined
    maxTokens?: number | undefined
    responseTimeoutMs?: number | undefined
    maxContextLength?: number | undefined
    systemInstructions?: string | undefined
    allowInterruption?: boolean | undefined
    allowProactiveMessages?: boolean | undefined
    conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
    dataRetentionDays?: number | undefined
    allowDataExport?: boolean | undefined
    piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
    integrationMetadata?: Record<string, unknown> | undefined
    customConfig?: Record<string, unknown> | undefined
  }
>
/**
 * Agent update schema - all fields optional except validation requirements
 */
export declare const updateAgentSchema: z.ZodObject<
  {
    workspaceId: z.ZodOptional<z.ZodString>
    createdBy: z.ZodOptional<z.ZodString>
    name: z.ZodOptional<z.ZodString>
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>
    compositionMode: z.ZodOptional<z.ZodDefault<z.ZodEnum<['fluid', 'strict']>>>
    systemPrompt: z.ZodOptional<z.ZodOptional<z.ZodString>>
    modelProvider: z.ZodOptional<z.ZodDefault<z.ZodString>>
    modelName: z.ZodOptional<z.ZodDefault<z.ZodString>>
    temperature: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
    maxTokens: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
    responseTimeoutMs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
    maxContextLength: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
    systemInstructions: z.ZodOptional<z.ZodOptional<z.ZodString>>
    allowInterruption: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
    allowProactiveMessages: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
    conversationStyle: z.ZodOptional<
      z.ZodDefault<z.ZodEnum<['casual', 'professional', 'technical', 'friendly']>>
    >
    dataRetentionDays: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
    allowDataExport: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
    piiHandlingMode: z.ZodOptional<z.ZodDefault<z.ZodEnum<['strict', 'standard', 'relaxed']>>>
    integrationMetadata: z.ZodOptional<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>>
    customConfig: z.ZodOptional<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>>
  } & {
    id: z.ZodString
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string
    name?: string | undefined
    description?: string | undefined
    workspaceId?: string | undefined
    createdBy?: string | undefined
    compositionMode?: 'strict' | 'fluid' | undefined
    systemPrompt?: string | undefined
    modelProvider?: string | undefined
    modelName?: string | undefined
    temperature?: number | undefined
    maxTokens?: number | undefined
    responseTimeoutMs?: number | undefined
    maxContextLength?: number | undefined
    systemInstructions?: string | undefined
    allowInterruption?: boolean | undefined
    allowProactiveMessages?: boolean | undefined
    conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
    dataRetentionDays?: number | undefined
    allowDataExport?: boolean | undefined
    piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
    integrationMetadata?: Record<string, unknown> | undefined
    customConfig?: Record<string, unknown> | undefined
  },
  {
    id: string
    name?: string | undefined
    description?: string | undefined
    workspaceId?: string | undefined
    createdBy?: string | undefined
    compositionMode?: 'strict' | 'fluid' | undefined
    systemPrompt?: string | undefined
    modelProvider?: string | undefined
    modelName?: string | undefined
    temperature?: number | undefined
    maxTokens?: number | undefined
    responseTimeoutMs?: number | undefined
    maxContextLength?: number | undefined
    systemInstructions?: string | undefined
    allowInterruption?: boolean | undefined
    allowProactiveMessages?: boolean | undefined
    conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
    dataRetentionDays?: number | undefined
    allowDataExport?: boolean | undefined
    piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
    integrationMetadata?: Record<string, unknown> | undefined
    customConfig?: Record<string, unknown> | undefined
  }
>
/**
 * Agent response schema (what comes back from database)
 */
export declare const agentResponseSchema: z.ZodObject<
  {
    workspaceId: z.ZodString
    createdBy: z.ZodString
    name: z.ZodString
    description: z.ZodOptional<z.ZodString>
    compositionMode: z.ZodDefault<z.ZodEnum<['fluid', 'strict']>>
    systemPrompt: z.ZodOptional<z.ZodString>
    modelProvider: z.ZodDefault<z.ZodString>
    modelName: z.ZodDefault<z.ZodString>
    temperature: z.ZodDefault<z.ZodNumber>
    maxTokens: z.ZodDefault<z.ZodNumber>
    responseTimeoutMs: z.ZodDefault<z.ZodNumber>
    maxContextLength: z.ZodDefault<z.ZodNumber>
    systemInstructions: z.ZodOptional<z.ZodString>
    allowInterruption: z.ZodDefault<z.ZodBoolean>
    allowProactiveMessages: z.ZodDefault<z.ZodBoolean>
    conversationStyle: z.ZodDefault<z.ZodEnum<['casual', 'professional', 'technical', 'friendly']>>
    dataRetentionDays: z.ZodDefault<z.ZodNumber>
    allowDataExport: z.ZodDefault<z.ZodBoolean>
    piiHandlingMode: z.ZodDefault<z.ZodEnum<['strict', 'standard', 'relaxed']>>
    integrationMetadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    customConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
  } & {
    id: z.ZodString
    status: z.ZodEnum<['active', 'inactive', 'archived']>
    totalSessions: z.ZodNumber
    totalMessages: z.ZodNumber
    totalTokensUsed: z.ZodNumber
    totalCost: z.ZodNumber
    averageSessionDuration: z.ZodNullable<z.ZodNumber>
    lastActiveAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    deletedAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string
    id: string
    status: 'active' | 'inactive' | 'archived'
    workspaceId: string
    createdAt: string | Date
    updatedAt: string | Date
    createdBy: string
    compositionMode: 'strict' | 'fluid'
    modelProvider: string
    modelName: string
    temperature: number
    maxTokens: number
    responseTimeoutMs: number
    maxContextLength: number
    allowInterruption: boolean
    allowProactiveMessages: boolean
    conversationStyle: 'professional' | 'technical' | 'friendly' | 'casual'
    dataRetentionDays: number
    allowDataExport: boolean
    piiHandlingMode: 'strict' | 'standard' | 'relaxed'
    integrationMetadata: Record<string, unknown>
    customConfig: Record<string, unknown>
    totalSessions: number
    totalMessages: number
    totalTokensUsed: number
    totalCost: number
    averageSessionDuration: number | null
    lastActiveAt: string | Date | null
    deletedAt: string | Date | null
    description?: string | undefined
    systemPrompt?: string | undefined
    systemInstructions?: string | undefined
  },
  {
    name: string
    id: string
    status: 'active' | 'inactive' | 'archived'
    workspaceId: string
    createdAt: string | Date
    updatedAt: string | Date
    createdBy: string
    totalSessions: number
    totalMessages: number
    totalTokensUsed: number
    totalCost: number
    averageSessionDuration: number | null
    lastActiveAt: string | Date | null
    deletedAt: string | Date | null
    description?: string | undefined
    compositionMode?: 'strict' | 'fluid' | undefined
    systemPrompt?: string | undefined
    modelProvider?: string | undefined
    modelName?: string | undefined
    temperature?: number | undefined
    maxTokens?: number | undefined
    responseTimeoutMs?: number | undefined
    maxContextLength?: number | undefined
    systemInstructions?: string | undefined
    allowInterruption?: boolean | undefined
    allowProactiveMessages?: boolean | undefined
    conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
    dataRetentionDays?: number | undefined
    allowDataExport?: boolean | undefined
    piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
    integrationMetadata?: Record<string, unknown> | undefined
    customConfig?: Record<string, unknown> | undefined
  }
>
/**
 * Session creation schema
 */
export declare const createSessionSchema: z.ZodObject<
  {
    agentId: z.ZodString
    workspaceId: z.ZodString
    userId: z.ZodOptional<z.ZodString>
    customerId: z.ZodOptional<z.ZodString>
    mode: z.ZodDefault<z.ZodEnum<['auto', 'manual', 'paused']>>
    title: z.ZodOptional<z.ZodString>
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    variables: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    userAgent: z.ZodOptional<z.ZodString>
    ipAddress: z.ZodOptional<z.ZodString>
    referrer: z.ZodOptional<z.ZodString>
    locale: z.ZodDefault<z.ZodString>
    timezone: z.ZodDefault<z.ZodString>
  },
  'strip',
  z.ZodTypeAny,
  {
    metadata: Record<string, unknown>
    agentId: string
    workspaceId: string
    variables: Record<string, unknown>
    mode: 'manual' | 'auto' | 'paused'
    locale: string
    timezone: string
    userId?: string | undefined
    title?: string | undefined
    customerId?: string | undefined
    userAgent?: string | undefined
    ipAddress?: string | undefined
    referrer?: string | undefined
  },
  {
    agentId: string
    workspaceId: string
    metadata?: Record<string, unknown> | undefined
    userId?: string | undefined
    variables?: Record<string, unknown> | undefined
    title?: string | undefined
    mode?: 'manual' | 'auto' | 'paused' | undefined
    customerId?: string | undefined
    userAgent?: string | undefined
    ipAddress?: string | undefined
    referrer?: string | undefined
    locale?: string | undefined
    timezone?: string | undefined
  }
>
/**
 * Session update schema
 */
export declare const updateSessionSchema: z.ZodObject<
  {
    agentId: z.ZodOptional<z.ZodString>
    workspaceId: z.ZodOptional<z.ZodString>
    userId: z.ZodOptional<z.ZodOptional<z.ZodString>>
    customerId: z.ZodOptional<z.ZodOptional<z.ZodString>>
    mode: z.ZodOptional<z.ZodDefault<z.ZodEnum<['auto', 'manual', 'paused']>>>
    title: z.ZodOptional<z.ZodOptional<z.ZodString>>
    metadata: z.ZodOptional<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>>
    variables: z.ZodOptional<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>>
    userAgent: z.ZodOptional<z.ZodOptional<z.ZodString>>
    ipAddress: z.ZodOptional<z.ZodOptional<z.ZodString>>
    referrer: z.ZodOptional<z.ZodOptional<z.ZodString>>
    locale: z.ZodOptional<z.ZodDefault<z.ZodString>>
    timezone: z.ZodOptional<z.ZodDefault<z.ZodString>>
  } & {
    id: z.ZodString
    status: z.ZodOptional<z.ZodEnum<['active', 'completed', 'abandoned']>>
    currentJourneyId: z.ZodOptional<z.ZodString>
    currentStateId: z.ZodOptional<z.ZodString>
    satisfactionScore: z.ZodOptional<z.ZodNumber>
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string
    metadata?: Record<string, unknown> | undefined
    status?: 'completed' | 'active' | 'abandoned' | undefined
    agentId?: string | undefined
    userId?: string | undefined
    workspaceId?: string | undefined
    variables?: Record<string, unknown> | undefined
    title?: string | undefined
    mode?: 'manual' | 'auto' | 'paused' | undefined
    customerId?: string | undefined
    currentJourneyId?: string | undefined
    currentStateId?: string | undefined
    satisfactionScore?: number | undefined
    userAgent?: string | undefined
    ipAddress?: string | undefined
    referrer?: string | undefined
    locale?: string | undefined
    timezone?: string | undefined
  },
  {
    id: string
    metadata?: Record<string, unknown> | undefined
    status?: 'completed' | 'active' | 'abandoned' | undefined
    agentId?: string | undefined
    userId?: string | undefined
    workspaceId?: string | undefined
    variables?: Record<string, unknown> | undefined
    title?: string | undefined
    mode?: 'manual' | 'auto' | 'paused' | undefined
    customerId?: string | undefined
    currentJourneyId?: string | undefined
    currentStateId?: string | undefined
    satisfactionScore?: number | undefined
    userAgent?: string | undefined
    ipAddress?: string | undefined
    referrer?: string | undefined
    locale?: string | undefined
    timezone?: string | undefined
  }
>
/**
 * Session response schema
 */
export declare const sessionResponseSchema: z.ZodObject<
  {
    agentId: z.ZodString
    workspaceId: z.ZodString
    userId: z.ZodOptional<z.ZodString>
    customerId: z.ZodOptional<z.ZodString>
    mode: z.ZodDefault<z.ZodEnum<['auto', 'manual', 'paused']>>
    title: z.ZodOptional<z.ZodString>
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    variables: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    userAgent: z.ZodOptional<z.ZodString>
    ipAddress: z.ZodOptional<z.ZodString>
    referrer: z.ZodOptional<z.ZodString>
    locale: z.ZodDefault<z.ZodString>
    timezone: z.ZodDefault<z.ZodString>
  } & {
    id: z.ZodString
    status: z.ZodEnum<['active', 'completed', 'abandoned']>
    currentJourneyId: z.ZodNullable<z.ZodString>
    currentStateId: z.ZodNullable<z.ZodString>
    eventCount: z.ZodNumber
    messageCount: z.ZodNumber
    tokensUsed: z.ZodNumber
    cost: z.ZodNumber
    averageResponseTime: z.ZodNullable<z.ZodNumber>
    satisfactionScore: z.ZodNullable<z.ZodNumber>
    sessionType: z.ZodDefault<z.ZodEnum<['conversation', 'support', 'onboarding', 'survey']>>
    tags: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>
    startedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    lastActivityAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    endedAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string
    metadata: Record<string, unknown>
    status: 'completed' | 'active' | 'abandoned'
    agentId: string
    workspaceId: string
    variables: Record<string, unknown>
    tags: string[]
    startedAt: string | Date
    mode: 'manual' | 'auto' | 'paused'
    createdAt: string | Date
    updatedAt: string | Date
    currentJourneyId: string | null
    currentStateId: string | null
    eventCount: number
    messageCount: number
    tokensUsed: number
    cost: number
    averageResponseTime: number | null
    satisfactionScore: number | null
    sessionType: 'conversation' | 'support' | 'onboarding' | 'survey'
    locale: string
    timezone: string
    lastActivityAt: string | Date
    endedAt: string | Date | null
    userId?: string | undefined
    title?: string | undefined
    customerId?: string | undefined
    userAgent?: string | undefined
    ipAddress?: string | undefined
    referrer?: string | undefined
  },
  {
    id: string
    status: 'completed' | 'active' | 'abandoned'
    agentId: string
    workspaceId: string
    startedAt: string | Date
    createdAt: string | Date
    updatedAt: string | Date
    currentJourneyId: string | null
    currentStateId: string | null
    eventCount: number
    messageCount: number
    tokensUsed: number
    cost: number
    averageResponseTime: number | null
    satisfactionScore: number | null
    lastActivityAt: string | Date
    endedAt: string | Date | null
    metadata?: Record<string, unknown> | undefined
    userId?: string | undefined
    variables?: Record<string, unknown> | undefined
    tags?: string[] | undefined
    title?: string | undefined
    mode?: 'manual' | 'auto' | 'paused' | undefined
    customerId?: string | undefined
    sessionType?: 'conversation' | 'support' | 'onboarding' | 'survey' | undefined
    userAgent?: string | undefined
    ipAddress?: string | undefined
    referrer?: string | undefined
    locale?: string | undefined
    timezone?: string | undefined
  }
>
/**
 * Event creation schema
 */
export declare const createEventSchema: z.ZodObject<
  {
    sessionId: z.ZodString
    offset: z.ZodNumber
    eventType: z.ZodEnum<
      [
        'customer_message',
        'agent_message',
        'tool_call',
        'tool_result',
        'status_update',
        'journey_transition',
        'variable_update',
      ]
    >
    content: z.ZodRecord<z.ZodString, z.ZodUnknown>
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    toolCallId: z.ZodOptional<z.ZodString>
    journeyId: z.ZodOptional<z.ZodString>
    stateId: z.ZodOptional<z.ZodString>
  },
  'strip',
  z.ZodTypeAny,
  {
    metadata: Record<string, unknown>
    sessionId: string
    content: Record<string, unknown>
    offset: number
    eventType:
      | 'customer_message'
      | 'agent_message'
      | 'tool_call'
      | 'tool_result'
      | 'status_update'
      | 'journey_transition'
      | 'variable_update'
    toolCallId?: string | undefined
    journeyId?: string | undefined
    stateId?: string | undefined
  },
  {
    sessionId: string
    content: Record<string, unknown>
    offset: number
    eventType:
      | 'customer_message'
      | 'agent_message'
      | 'tool_call'
      | 'tool_result'
      | 'status_update'
      | 'journey_transition'
      | 'variable_update'
    metadata?: Record<string, unknown> | undefined
    toolCallId?: string | undefined
    journeyId?: string | undefined
    stateId?: string | undefined
  }
>
/**
 * Event response schema
 */
export declare const eventResponseSchema: z.ZodObject<
  {
    sessionId: z.ZodString
    offset: z.ZodNumber
    eventType: z.ZodEnum<
      [
        'customer_message',
        'agent_message',
        'tool_call',
        'tool_result',
        'status_update',
        'journey_transition',
        'variable_update',
      ]
    >
    content: z.ZodRecord<z.ZodString, z.ZodUnknown>
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    toolCallId: z.ZodOptional<z.ZodString>
    journeyId: z.ZodOptional<z.ZodString>
    stateId: z.ZodOptional<z.ZodString>
  } & {
    id: z.ZodString
    createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string
    metadata: Record<string, unknown>
    sessionId: string
    content: Record<string, unknown>
    createdAt: string | Date
    offset: number
    eventType:
      | 'customer_message'
      | 'agent_message'
      | 'tool_call'
      | 'tool_result'
      | 'status_update'
      | 'journey_transition'
      | 'variable_update'
    toolCallId?: string | undefined
    journeyId?: string | undefined
    stateId?: string | undefined
  },
  {
    id: string
    sessionId: string
    content: Record<string, unknown>
    createdAt: string | Date
    offset: number
    eventType:
      | 'customer_message'
      | 'agent_message'
      | 'tool_call'
      | 'tool_result'
      | 'status_update'
      | 'journey_transition'
      | 'variable_update'
    metadata?: Record<string, unknown> | undefined
    toolCallId?: string | undefined
    journeyId?: string | undefined
    stateId?: string | undefined
  }
>
/**
 * Guideline creation schema
 */
export declare const createGuidelineSchema: z.ZodObject<
  {
    agentId: z.ZodString
    condition: z.ZodString
    action: z.ZodString
    priority: z.ZodDefault<z.ZodNumber>
    enabled: z.ZodDefault<z.ZodBoolean>
    toolIds: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>
  },
  'strip',
  z.ZodTypeAny,
  {
    agentId: string
    action: string
    enabled: boolean
    condition: string
    priority: number
    toolIds: string[]
  },
  {
    agentId: string
    action: string
    condition: string
    enabled?: boolean | undefined
    priority?: number | undefined
    toolIds?: string[] | undefined
  }
>
/**
 * Guideline update schema
 */
export declare const updateGuidelineSchema: z.ZodObject<
  {
    agentId: z.ZodOptional<z.ZodString>
    condition: z.ZodOptional<z.ZodString>
    action: z.ZodOptional<z.ZodString>
    priority: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
    toolIds: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>>
  } & {
    id: z.ZodString
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string
    agentId?: string | undefined
    action?: string | undefined
    enabled?: boolean | undefined
    condition?: string | undefined
    priority?: number | undefined
    toolIds?: string[] | undefined
  },
  {
    id: string
    agentId?: string | undefined
    action?: string | undefined
    enabled?: boolean | undefined
    condition?: string | undefined
    priority?: number | undefined
    toolIds?: string[] | undefined
  }
>
/**
 * Guideline response schema
 */
export declare const guidelineResponseSchema: z.ZodObject<
  {
    agentId: z.ZodString
    condition: z.ZodString
    action: z.ZodString
    priority: z.ZodDefault<z.ZodNumber>
    enabled: z.ZodDefault<z.ZodBoolean>
    toolIds: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>
  } & {
    id: z.ZodString
    matchCount: z.ZodNumber
    lastMatchedAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string
    agentId: string
    action: string
    enabled: boolean
    condition: string
    createdAt: string | Date
    updatedAt: string | Date
    priority: number
    toolIds: string[]
    matchCount: number
    lastMatchedAt: string | Date | null
  },
  {
    id: string
    agentId: string
    action: string
    condition: string
    createdAt: string | Date
    updatedAt: string | Date
    matchCount: number
    lastMatchedAt: string | Date | null
    enabled?: boolean | undefined
    priority?: number | undefined
    toolIds?: string[] | undefined
  }
>
/**
 * Journey creation schema
 */
export declare const createJourneySchema: z.ZodObject<
  {
    agentId: z.ZodString
    title: z.ZodString
    description: z.ZodOptional<z.ZodString>
    conditions: z.ZodArray<z.ZodString, 'many'>
    enabled: z.ZodDefault<z.ZodBoolean>
    allowSkipping: z.ZodDefault<z.ZodBoolean>
    allowRevisiting: z.ZodDefault<z.ZodBoolean>
  },
  'strip',
  z.ZodTypeAny,
  {
    agentId: string
    enabled: boolean
    title: string
    conditions: string[]
    allowSkipping: boolean
    allowRevisiting: boolean
    description?: string | undefined
  },
  {
    agentId: string
    title: string
    conditions: string[]
    description?: string | undefined
    enabled?: boolean | undefined
    allowSkipping?: boolean | undefined
    allowRevisiting?: boolean | undefined
  }
>
/**
 * Journey update schema
 */
export declare const updateJourneySchema: z.ZodObject<
  {
    agentId: z.ZodOptional<z.ZodString>
    title: z.ZodOptional<z.ZodString>
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>
    conditions: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
    allowSkipping: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
    allowRevisiting: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
  } & {
    id: z.ZodString
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string
    description?: string | undefined
    agentId?: string | undefined
    enabled?: boolean | undefined
    title?: string | undefined
    conditions?: string[] | undefined
    allowSkipping?: boolean | undefined
    allowRevisiting?: boolean | undefined
  },
  {
    id: string
    description?: string | undefined
    agentId?: string | undefined
    enabled?: boolean | undefined
    title?: string | undefined
    conditions?: string[] | undefined
    allowSkipping?: boolean | undefined
    allowRevisiting?: boolean | undefined
  }
>
/**
 * Journey response schema
 */
export declare const journeyResponseSchema: z.ZodObject<
  {
    agentId: z.ZodString
    title: z.ZodString
    description: z.ZodOptional<z.ZodString>
    conditions: z.ZodArray<z.ZodString, 'many'>
    enabled: z.ZodDefault<z.ZodBoolean>
    allowSkipping: z.ZodDefault<z.ZodBoolean>
    allowRevisiting: z.ZodDefault<z.ZodBoolean>
  } & {
    id: z.ZodString
    totalSessions: z.ZodNumber
    completionRate: z.ZodNumber
    lastUsedAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string
    agentId: string
    enabled: boolean
    title: string
    createdAt: string | Date
    updatedAt: string | Date
    totalSessions: number
    conditions: string[]
    allowSkipping: boolean
    allowRevisiting: boolean
    completionRate: number
    lastUsedAt: string | Date | null
    description?: string | undefined
  },
  {
    id: string
    agentId: string
    title: string
    createdAt: string | Date
    updatedAt: string | Date
    totalSessions: number
    conditions: string[]
    completionRate: number
    lastUsedAt: string | Date | null
    description?: string | undefined
    enabled?: boolean | undefined
    allowSkipping?: boolean | undefined
    allowRevisiting?: boolean | undefined
  }
>
/**
 * Journey state creation schema (with validation refinements)
 */
export declare const createJourneyStateSchema: z.ZodEffects<
  z.ZodObject<
    {
      journeyId: z.ZodString
      name: z.ZodString
      stateType: z.ZodEnum<['chat', 'tool', 'decision', 'final']>
      chatPrompt: z.ZodOptional<z.ZodString>
      toolId: z.ZodOptional<z.ZodString>
      toolConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      condition: z.ZodOptional<z.ZodString>
      isInitial: z.ZodDefault<z.ZodBoolean>
      isFinal: z.ZodDefault<z.ZodBoolean>
      allowSkip: z.ZodDefault<z.ZodBoolean>
      metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    },
    'strip',
    z.ZodTypeAny,
    {
      name: string
      metadata: Record<string, unknown>
      journeyId: string
      stateType: 'chat' | 'tool' | 'decision' | 'final'
      toolConfig: Record<string, unknown>
      isInitial: boolean
      isFinal: boolean
      allowSkip: boolean
      toolId?: string | undefined
      condition?: string | undefined
      chatPrompt?: string | undefined
    },
    {
      name: string
      journeyId: string
      stateType: 'chat' | 'tool' | 'decision' | 'final'
      toolId?: string | undefined
      metadata?: Record<string, unknown> | undefined
      condition?: string | undefined
      chatPrompt?: string | undefined
      toolConfig?: Record<string, unknown> | undefined
      isInitial?: boolean | undefined
      isFinal?: boolean | undefined
      allowSkip?: boolean | undefined
    }
  >,
  {
    name: string
    metadata: Record<string, unknown>
    journeyId: string
    stateType: 'chat' | 'tool' | 'decision' | 'final'
    toolConfig: Record<string, unknown>
    isInitial: boolean
    isFinal: boolean
    allowSkip: boolean
    toolId?: string | undefined
    condition?: string | undefined
    chatPrompt?: string | undefined
  },
  {
    name: string
    journeyId: string
    stateType: 'chat' | 'tool' | 'decision' | 'final'
    toolId?: string | undefined
    metadata?: Record<string, unknown> | undefined
    condition?: string | undefined
    chatPrompt?: string | undefined
    toolConfig?: Record<string, unknown> | undefined
    isInitial?: boolean | undefined
    isFinal?: boolean | undefined
    allowSkip?: boolean | undefined
  }
>
/**
 * Journey state response schema
 */
export declare const journeyStateResponseSchema: z.ZodObject<
  {
    journeyId: z.ZodString
    name: z.ZodString
    stateType: z.ZodEnum<['chat', 'tool', 'decision', 'final']>
    chatPrompt: z.ZodOptional<z.ZodString>
    toolId: z.ZodOptional<z.ZodString>
    toolConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    condition: z.ZodOptional<z.ZodString>
    isInitial: z.ZodDefault<z.ZodBoolean>
    isFinal: z.ZodDefault<z.ZodBoolean>
    allowSkip: z.ZodDefault<z.ZodBoolean>
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
  } & {
    id: z.ZodString
    createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string
    id: string
    metadata: Record<string, unknown>
    createdAt: string | Date
    updatedAt: string | Date
    journeyId: string
    stateType: 'chat' | 'tool' | 'decision' | 'final'
    toolConfig: Record<string, unknown>
    isInitial: boolean
    isFinal: boolean
    allowSkip: boolean
    toolId?: string | undefined
    condition?: string | undefined
    chatPrompt?: string | undefined
  },
  {
    name: string
    id: string
    createdAt: string | Date
    updatedAt: string | Date
    journeyId: string
    stateType: 'chat' | 'tool' | 'decision' | 'final'
    toolId?: string | undefined
    metadata?: Record<string, unknown> | undefined
    condition?: string | undefined
    chatPrompt?: string | undefined
    toolConfig?: Record<string, unknown> | undefined
    isInitial?: boolean | undefined
    isFinal?: boolean | undefined
    allowSkip?: boolean | undefined
  }
>
/**
 * Tool creation schema
 */
export declare const createToolSchema: z.ZodObject<
  {
    workspaceId: z.ZodString
    name: z.ZodString
    displayName: z.ZodString
    description: z.ZodString
    simToolId: z.ZodOptional<z.ZodString>
    toolType: z.ZodEnum<['sim_native', 'custom', 'external']>
    parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>
    returnSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    usageGuidelines: z.ZodOptional<z.ZodString>
    errorHandling: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    executionTimeout: z.ZodDefault<z.ZodNumber>
    retryPolicy: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    rateLimitPerMinute: z.ZodDefault<z.ZodNumber>
    rateLimitPerHour: z.ZodDefault<z.ZodNumber>
    requiresAuth: z.ZodDefault<z.ZodBoolean>
    authType: z.ZodOptional<z.ZodEnum<['api_key', 'oauth', 'basic', 'none']>>
    authConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    enabled: z.ZodDefault<z.ZodBoolean>
    isPublic: z.ZodDefault<z.ZodBoolean>
  },
  'strip',
  z.ZodTypeAny,
  {
    parameters: Record<string, unknown>
    name: string
    description: string
    workspaceId: string
    displayName: string
    errorHandling: Record<string, unknown>
    enabled: boolean
    toolType: 'custom' | 'external' | 'sim_native'
    executionTimeout: number
    retryPolicy: Record<string, unknown>
    rateLimitPerMinute: number
    rateLimitPerHour: number
    requiresAuth: boolean
    authConfig: Record<string, unknown>
    isPublic: boolean
    simToolId?: string | undefined
    returnSchema?: Record<string, unknown> | undefined
    usageGuidelines?: string | undefined
    authType?: 'oauth' | 'api_key' | 'basic' | 'none' | undefined
  },
  {
    parameters: Record<string, unknown>
    name: string
    description: string
    workspaceId: string
    displayName: string
    toolType: 'custom' | 'external' | 'sim_native'
    errorHandling?: Record<string, unknown> | undefined
    enabled?: boolean | undefined
    simToolId?: string | undefined
    returnSchema?: Record<string, unknown> | undefined
    usageGuidelines?: string | undefined
    executionTimeout?: number | undefined
    retryPolicy?: Record<string, unknown> | undefined
    rateLimitPerMinute?: number | undefined
    rateLimitPerHour?: number | undefined
    requiresAuth?: boolean | undefined
    authType?: 'oauth' | 'api_key' | 'basic' | 'none' | undefined
    authConfig?: Record<string, unknown> | undefined
    isPublic?: boolean | undefined
  }
>
/**
 * Tool response schema
 */
export declare const toolResponseSchema: z.ZodObject<
  {
    workspaceId: z.ZodString
    name: z.ZodString
    displayName: z.ZodString
    description: z.ZodString
    simToolId: z.ZodOptional<z.ZodString>
    toolType: z.ZodEnum<['sim_native', 'custom', 'external']>
    parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>
    returnSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    usageGuidelines: z.ZodOptional<z.ZodString>
    errorHandling: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    executionTimeout: z.ZodDefault<z.ZodNumber>
    retryPolicy: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    rateLimitPerMinute: z.ZodDefault<z.ZodNumber>
    rateLimitPerHour: z.ZodDefault<z.ZodNumber>
    requiresAuth: z.ZodDefault<z.ZodBoolean>
    authType: z.ZodOptional<z.ZodEnum<['api_key', 'oauth', 'basic', 'none']>>
    authConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    enabled: z.ZodDefault<z.ZodBoolean>
    isPublic: z.ZodDefault<z.ZodBoolean>
  } & {
    id: z.ZodString
    isDeprecated: z.ZodBoolean
    useCount: z.ZodNumber
    successRate: z.ZodNumber
    lastUsedAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
  },
  'strip',
  z.ZodTypeAny,
  {
    parameters: Record<string, unknown>
    name: string
    id: string
    description: string
    workspaceId: string
    displayName: string
    errorHandling: Record<string, unknown>
    enabled: boolean
    successRate: number
    createdAt: string | Date
    updatedAt: string | Date
    lastUsedAt: string | Date | null
    useCount: number
    toolType: 'custom' | 'external' | 'sim_native'
    executionTimeout: number
    retryPolicy: Record<string, unknown>
    rateLimitPerMinute: number
    rateLimitPerHour: number
    requiresAuth: boolean
    authConfig: Record<string, unknown>
    isPublic: boolean
    isDeprecated: boolean
    simToolId?: string | undefined
    returnSchema?: Record<string, unknown> | undefined
    usageGuidelines?: string | undefined
    authType?: 'oauth' | 'api_key' | 'basic' | 'none' | undefined
  },
  {
    parameters: Record<string, unknown>
    name: string
    id: string
    description: string
    workspaceId: string
    displayName: string
    successRate: number
    createdAt: string | Date
    updatedAt: string | Date
    lastUsedAt: string | Date | null
    useCount: number
    toolType: 'custom' | 'external' | 'sim_native'
    isDeprecated: boolean
    errorHandling?: Record<string, unknown> | undefined
    enabled?: boolean | undefined
    simToolId?: string | undefined
    returnSchema?: Record<string, unknown> | undefined
    usageGuidelines?: string | undefined
    executionTimeout?: number | undefined
    retryPolicy?: Record<string, unknown> | undefined
    rateLimitPerMinute?: number | undefined
    rateLimitPerHour?: number | undefined
    requiresAuth?: boolean | undefined
    authType?: 'oauth' | 'api_key' | 'basic' | 'none' | undefined
    authConfig?: Record<string, unknown> | undefined
    isPublic?: boolean | undefined
  }
>
/**
 * Variable creation schema (with validation refinements)
 */
export declare const createVariableSchema: z.ZodEffects<
  z.ZodObject<
    {
      agentId: z.ZodString
      sessionId: z.ZodOptional<z.ZodString>
      key: z.ZodString
      scope: z.ZodDefault<z.ZodEnum<['session', 'customer', 'global']>>
      value: z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodUnknown, 'many'>]>
      valueType: z.ZodEnum<['string', 'number', 'boolean', 'object', 'array']>
      isPrivate: z.ZodDefault<z.ZodBoolean>
      description: z.ZodOptional<z.ZodString>
    },
    'strip',
    z.ZodTypeAny,
    {
      key: string
      value: unknown[] | Record<string, unknown>
      agentId: string
      scope: 'session' | 'customer' | 'global'
      valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
      isPrivate: boolean
      description?: string | undefined
      sessionId?: string | undefined
    },
    {
      key: string
      value: unknown[] | Record<string, unknown>
      agentId: string
      valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
      description?: string | undefined
      sessionId?: string | undefined
      scope?: 'session' | 'customer' | 'global' | undefined
      isPrivate?: boolean | undefined
    }
  >,
  {
    key: string
    value: unknown[] | Record<string, unknown>
    agentId: string
    scope: 'session' | 'customer' | 'global'
    valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
    isPrivate: boolean
    description?: string | undefined
    sessionId?: string | undefined
  },
  {
    key: string
    value: unknown[] | Record<string, unknown>
    agentId: string
    valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
    description?: string | undefined
    sessionId?: string | undefined
    scope?: 'session' | 'customer' | 'global' | undefined
    isPrivate?: boolean | undefined
  }
>
/**
 * Variable response schema
 */
export declare const variableResponseSchema: z.ZodObject<
  {
    agentId: z.ZodString
    sessionId: z.ZodOptional<z.ZodString>
    key: z.ZodString
    scope: z.ZodDefault<z.ZodEnum<['session', 'customer', 'global']>>
    value: z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodUnknown, 'many'>]>
    valueType: z.ZodEnum<['string', 'number', 'boolean', 'object', 'array']>
    isPrivate: z.ZodDefault<z.ZodBoolean>
    description: z.ZodOptional<z.ZodString>
  } & {
    id: z.ZodString
    createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string
    key: string
    value: unknown[] | Record<string, unknown>
    agentId: string
    createdAt: string | Date
    updatedAt: string | Date
    scope: 'session' | 'customer' | 'global'
    valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
    isPrivate: boolean
    description?: string | undefined
    sessionId?: string | undefined
  },
  {
    id: string
    key: string
    value: unknown[] | Record<string, unknown>
    agentId: string
    createdAt: string | Date
    updatedAt: string | Date
    valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
    description?: string | undefined
    sessionId?: string | undefined
    scope?: 'session' | 'customer' | 'global' | undefined
    isPrivate?: boolean | undefined
  }
>
/**
 * Agent filter schema
 */
export declare const agentFilterSchema: z.ZodObject<
  {
    workspaceId: z.ZodOptional<z.ZodString>
    status: z.ZodOptional<
      z.ZodUnion<
        [
          z.ZodEnum<['active', 'inactive', 'archived']>,
          z.ZodArray<z.ZodEnum<['active', 'inactive', 'archived']>, 'many'>,
        ]
      >
    >
    compositionMode: z.ZodOptional<
      z.ZodUnion<
        [z.ZodEnum<['fluid', 'strict']>, z.ZodArray<z.ZodEnum<['fluid', 'strict']>, 'many'>]
      >
    >
    modelProvider: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, 'many'>]>>
    conversationStyle: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, 'many'>]>>
    createdBy: z.ZodOptional<z.ZodString>
    lastActiveAfter: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    lastActiveBefore: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    hasActiveSessions: z.ZodOptional<z.ZodBoolean>
    search: z.ZodOptional<z.ZodString>
  },
  'strip',
  z.ZodTypeAny,
  {
    status?: 'active' | 'inactive' | 'archived' | ('active' | 'inactive' | 'archived')[] | undefined
    workspaceId?: string | undefined
    search?: string | undefined
    createdBy?: string | undefined
    compositionMode?: 'strict' | 'fluid' | ('strict' | 'fluid')[] | undefined
    modelProvider?: string | string[] | undefined
    conversationStyle?: string | string[] | undefined
    lastActiveAfter?: string | Date | undefined
    lastActiveBefore?: string | Date | undefined
    hasActiveSessions?: boolean | undefined
  },
  {
    status?: 'active' | 'inactive' | 'archived' | ('active' | 'inactive' | 'archived')[] | undefined
    workspaceId?: string | undefined
    search?: string | undefined
    createdBy?: string | undefined
    compositionMode?: 'strict' | 'fluid' | ('strict' | 'fluid')[] | undefined
    modelProvider?: string | string[] | undefined
    conversationStyle?: string | string[] | undefined
    lastActiveAfter?: string | Date | undefined
    lastActiveBefore?: string | Date | undefined
    hasActiveSessions?: boolean | undefined
  }
>
/**
 * Session filter schema
 */
export declare const sessionFilterSchema: z.ZodObject<
  {
    agentId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, 'many'>]>>
    workspaceId: z.ZodOptional<z.ZodString>
    userId: z.ZodOptional<z.ZodString>
    customerId: z.ZodOptional<z.ZodString>
    status: z.ZodOptional<
      z.ZodUnion<
        [
          z.ZodEnum<['active', 'completed', 'abandoned']>,
          z.ZodArray<z.ZodEnum<['active', 'completed', 'abandoned']>, 'many'>,
        ]
      >
    >
    mode: z.ZodOptional<
      z.ZodUnion<
        [
          z.ZodEnum<['auto', 'manual', 'paused']>,
          z.ZodArray<z.ZodEnum<['auto', 'manual', 'paused']>, 'many'>,
        ]
      >
    >
    hasEvents: z.ZodOptional<z.ZodBoolean>
    startedAfter: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    startedBefore: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    endedAfter: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    endedBefore: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    currentJourneyId: z.ZodOptional<z.ZodString>
    search: z.ZodOptional<z.ZodString>
  },
  'strip',
  z.ZodTypeAny,
  {
    status?:
      | 'completed'
      | 'active'
      | 'abandoned'
      | ('completed' | 'active' | 'abandoned')[]
      | undefined
    agentId?: string | string[] | undefined
    userId?: string | undefined
    workspaceId?: string | undefined
    search?: string | undefined
    mode?: 'manual' | 'auto' | 'paused' | ('manual' | 'auto' | 'paused')[] | undefined
    customerId?: string | undefined
    currentJourneyId?: string | undefined
    hasEvents?: boolean | undefined
    startedAfter?: string | Date | undefined
    startedBefore?: string | Date | undefined
    endedAfter?: string | Date | undefined
    endedBefore?: string | Date | undefined
  },
  {
    status?:
      | 'completed'
      | 'active'
      | 'abandoned'
      | ('completed' | 'active' | 'abandoned')[]
      | undefined
    agentId?: string | string[] | undefined
    userId?: string | undefined
    workspaceId?: string | undefined
    search?: string | undefined
    mode?: 'manual' | 'auto' | 'paused' | ('manual' | 'auto' | 'paused')[] | undefined
    customerId?: string | undefined
    currentJourneyId?: string | undefined
    hasEvents?: boolean | undefined
    startedAfter?: string | Date | undefined
    startedBefore?: string | Date | undefined
    endedAfter?: string | Date | undefined
    endedBefore?: string | Date | undefined
  }
>
/**
 * Pagination schema
 */
export declare const paginationSchema: z.ZodObject<
  {
    page: z.ZodDefault<z.ZodNumber>
    pageSize: z.ZodDefault<z.ZodNumber>
    sortBy: z.ZodOptional<z.ZodString>
    sortOrder: z.ZodDefault<z.ZodEnum<['asc', 'desc']>>
  },
  'strip',
  z.ZodTypeAny,
  {
    sortOrder: 'asc' | 'desc'
    page: number
    pageSize: number
    sortBy?: string | undefined
  },
  {
    sortOrder?: 'asc' | 'desc' | undefined
    page?: number | undefined
    pageSize?: number | undefined
    sortBy?: string | undefined
  }
>
/**
 * Bulk agent creation schema
 */
export declare const bulkCreateAgentSchema: z.ZodObject<
  {
    agents: z.ZodArray<
      z.ZodObject<
        {
          workspaceId: z.ZodString
          createdBy: z.ZodString
          name: z.ZodString
          description: z.ZodOptional<z.ZodString>
          compositionMode: z.ZodDefault<z.ZodEnum<['fluid', 'strict']>>
          systemPrompt: z.ZodOptional<z.ZodString>
          modelProvider: z.ZodDefault<z.ZodString>
          modelName: z.ZodDefault<z.ZodString>
          temperature: z.ZodDefault<z.ZodNumber>
          maxTokens: z.ZodDefault<z.ZodNumber>
          responseTimeoutMs: z.ZodDefault<z.ZodNumber>
          maxContextLength: z.ZodDefault<z.ZodNumber>
          systemInstructions: z.ZodOptional<z.ZodString>
          allowInterruption: z.ZodDefault<z.ZodBoolean>
          allowProactiveMessages: z.ZodDefault<z.ZodBoolean>
          conversationStyle: z.ZodDefault<
            z.ZodEnum<['casual', 'professional', 'technical', 'friendly']>
          >
          dataRetentionDays: z.ZodDefault<z.ZodNumber>
          allowDataExport: z.ZodDefault<z.ZodBoolean>
          piiHandlingMode: z.ZodDefault<z.ZodEnum<['strict', 'standard', 'relaxed']>>
          integrationMetadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
          customConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
        },
        'strip',
        z.ZodTypeAny,
        {
          name: string
          workspaceId: string
          createdBy: string
          compositionMode: 'strict' | 'fluid'
          modelProvider: string
          modelName: string
          temperature: number
          maxTokens: number
          responseTimeoutMs: number
          maxContextLength: number
          allowInterruption: boolean
          allowProactiveMessages: boolean
          conversationStyle: 'professional' | 'technical' | 'friendly' | 'casual'
          dataRetentionDays: number
          allowDataExport: boolean
          piiHandlingMode: 'strict' | 'standard' | 'relaxed'
          integrationMetadata: Record<string, unknown>
          customConfig: Record<string, unknown>
          description?: string | undefined
          systemPrompt?: string | undefined
          systemInstructions?: string | undefined
        },
        {
          name: string
          workspaceId: string
          createdBy: string
          description?: string | undefined
          compositionMode?: 'strict' | 'fluid' | undefined
          systemPrompt?: string | undefined
          modelProvider?: string | undefined
          modelName?: string | undefined
          temperature?: number | undefined
          maxTokens?: number | undefined
          responseTimeoutMs?: number | undefined
          maxContextLength?: number | undefined
          systemInstructions?: string | undefined
          allowInterruption?: boolean | undefined
          allowProactiveMessages?: boolean | undefined
          conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
          dataRetentionDays?: number | undefined
          allowDataExport?: boolean | undefined
          piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
          integrationMetadata?: Record<string, unknown> | undefined
          customConfig?: Record<string, unknown> | undefined
        }
      >,
      'many'
    >
  },
  'strip',
  z.ZodTypeAny,
  {
    agents: {
      name: string
      workspaceId: string
      createdBy: string
      compositionMode: 'strict' | 'fluid'
      modelProvider: string
      modelName: string
      temperature: number
      maxTokens: number
      responseTimeoutMs: number
      maxContextLength: number
      allowInterruption: boolean
      allowProactiveMessages: boolean
      conversationStyle: 'professional' | 'technical' | 'friendly' | 'casual'
      dataRetentionDays: number
      allowDataExport: boolean
      piiHandlingMode: 'strict' | 'standard' | 'relaxed'
      integrationMetadata: Record<string, unknown>
      customConfig: Record<string, unknown>
      description?: string | undefined
      systemPrompt?: string | undefined
      systemInstructions?: string | undefined
    }[]
  },
  {
    agents: {
      name: string
      workspaceId: string
      createdBy: string
      description?: string | undefined
      compositionMode?: 'strict' | 'fluid' | undefined
      systemPrompt?: string | undefined
      modelProvider?: string | undefined
      modelName?: string | undefined
      temperature?: number | undefined
      maxTokens?: number | undefined
      responseTimeoutMs?: number | undefined
      maxContextLength?: number | undefined
      systemInstructions?: string | undefined
      allowInterruption?: boolean | undefined
      allowProactiveMessages?: boolean | undefined
      conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
      dataRetentionDays?: number | undefined
      allowDataExport?: boolean | undefined
      piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
      integrationMetadata?: Record<string, unknown> | undefined
      customConfig?: Record<string, unknown> | undefined
    }[]
  }
>
/**
 * Bulk session creation schema
 */
export declare const bulkCreateSessionSchema: z.ZodObject<
  {
    sessions: z.ZodArray<
      z.ZodObject<
        {
          agentId: z.ZodString
          workspaceId: z.ZodString
          userId: z.ZodOptional<z.ZodString>
          customerId: z.ZodOptional<z.ZodString>
          mode: z.ZodDefault<z.ZodEnum<['auto', 'manual', 'paused']>>
          title: z.ZodOptional<z.ZodString>
          metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
          variables: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
          userAgent: z.ZodOptional<z.ZodString>
          ipAddress: z.ZodOptional<z.ZodString>
          referrer: z.ZodOptional<z.ZodString>
          locale: z.ZodDefault<z.ZodString>
          timezone: z.ZodDefault<z.ZodString>
        },
        'strip',
        z.ZodTypeAny,
        {
          metadata: Record<string, unknown>
          agentId: string
          workspaceId: string
          variables: Record<string, unknown>
          mode: 'manual' | 'auto' | 'paused'
          locale: string
          timezone: string
          userId?: string | undefined
          title?: string | undefined
          customerId?: string | undefined
          userAgent?: string | undefined
          ipAddress?: string | undefined
          referrer?: string | undefined
        },
        {
          agentId: string
          workspaceId: string
          metadata?: Record<string, unknown> | undefined
          userId?: string | undefined
          variables?: Record<string, unknown> | undefined
          title?: string | undefined
          mode?: 'manual' | 'auto' | 'paused' | undefined
          customerId?: string | undefined
          userAgent?: string | undefined
          ipAddress?: string | undefined
          referrer?: string | undefined
          locale?: string | undefined
          timezone?: string | undefined
        }
      >,
      'many'
    >
  },
  'strip',
  z.ZodTypeAny,
  {
    sessions: {
      metadata: Record<string, unknown>
      agentId: string
      workspaceId: string
      variables: Record<string, unknown>
      mode: 'manual' | 'auto' | 'paused'
      locale: string
      timezone: string
      userId?: string | undefined
      title?: string | undefined
      customerId?: string | undefined
      userAgent?: string | undefined
      ipAddress?: string | undefined
      referrer?: string | undefined
    }[]
  },
  {
    sessions: {
      agentId: string
      workspaceId: string
      metadata?: Record<string, unknown> | undefined
      userId?: string | undefined
      variables?: Record<string, unknown> | undefined
      title?: string | undefined
      mode?: 'manual' | 'auto' | 'paused' | undefined
      customerId?: string | undefined
      userAgent?: string | undefined
      ipAddress?: string | undefined
      referrer?: string | undefined
      locale?: string | undefined
      timezone?: string | undefined
    }[]
  }
>
/**
 * Standard API response schema
 */
export declare const apiResponseSchema: <T extends z.ZodTypeAny>(
  dataSchema: T
) => z.ZodObject<
  {
    success: z.ZodBoolean
    data: z.ZodOptional<T>
    error: z.ZodOptional<
      z.ZodObject<
        {
          code: z.ZodString
          message: z.ZodString
          details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
          field: z.ZodOptional<z.ZodString>
        },
        'strip',
        z.ZodTypeAny,
        {
          message: string
          code: string
          details?: Record<string, unknown> | undefined
          field?: string | undefined
        },
        {
          message: string
          code: string
          details?: Record<string, unknown> | undefined
          field?: string | undefined
        }
      >
    >
    timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>
  },
  'strip',
  z.ZodTypeAny,
  z.objectUtil.addQuestionMarks<
    z.baseObjectOutputType<{
      success: z.ZodBoolean
      data: z.ZodOptional<T>
      error: z.ZodOptional<
        z.ZodObject<
          {
            code: z.ZodString
            message: z.ZodString
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
            field: z.ZodOptional<z.ZodString>
          },
          'strip',
          z.ZodTypeAny,
          {
            message: string
            code: string
            details?: Record<string, unknown> | undefined
            field?: string | undefined
          },
          {
            message: string
            code: string
            details?: Record<string, unknown> | undefined
            field?: string | undefined
          }
        >
      >
      timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>
    }>,
    any
  > extends infer T_1
    ? { [k in keyof T_1]: T_1[k] }
    : never,
  z.baseObjectInputType<{
    success: z.ZodBoolean
    data: z.ZodOptional<T>
    error: z.ZodOptional<
      z.ZodObject<
        {
          code: z.ZodString
          message: z.ZodString
          details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
          field: z.ZodOptional<z.ZodString>
        },
        'strip',
        z.ZodTypeAny,
        {
          message: string
          code: string
          details?: Record<string, unknown> | undefined
          field?: string | undefined
        },
        {
          message: string
          code: string
          details?: Record<string, unknown> | undefined
          field?: string | undefined
        }
      >
    >
    timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>
  }> extends infer T_2
    ? { [k_1 in keyof T_2]: T_2[k_1] }
    : never
>
/**
 * Paginated API response schema
 */
export declare const paginatedResponseSchema: <T extends z.ZodTypeAny>(
  dataSchema: T
) => z.ZodObject<
  {
    data: z.ZodArray<T, 'many'>
    pagination: z.ZodObject<
      {
        page: z.ZodNumber
        pageSize: z.ZodNumber
        total: z.ZodNumber
        totalPages: z.ZodNumber
        hasNext: z.ZodBoolean
        hasPrevious: z.ZodBoolean
      },
      'strip',
      z.ZodTypeAny,
      {
        total: number
        page: number
        pageSize: number
        totalPages: number
        hasNext: boolean
        hasPrevious: boolean
      },
      {
        total: number
        page: number
        pageSize: number
        totalPages: number
        hasNext: boolean
        hasPrevious: boolean
      }
    >
  },
  'strip',
  z.ZodTypeAny,
  {
    data: T['_output'][]
    pagination: {
      total: number
      page: number
      pageSize: number
      totalPages: number
      hasNext: boolean
      hasPrevious: boolean
    }
  },
  {
    data: T['_input'][]
    pagination: {
      total: number
      page: number
      pageSize: number
      totalPages: number
      hasNext: boolean
      hasPrevious: boolean
    }
  }
>
/**
 * Validate and transform create agent data
 */
export declare function validateCreateAgent(data: unknown): {
  name: string
  workspaceId: string
  createdBy: string
  compositionMode: 'strict' | 'fluid'
  modelProvider: string
  modelName: string
  temperature: number
  maxTokens: number
  responseTimeoutMs: number
  maxContextLength: number
  allowInterruption: boolean
  allowProactiveMessages: boolean
  conversationStyle: 'professional' | 'technical' | 'friendly' | 'casual'
  dataRetentionDays: number
  allowDataExport: boolean
  piiHandlingMode: 'strict' | 'standard' | 'relaxed'
  integrationMetadata: Record<string, unknown>
  customConfig: Record<string, unknown>
  description?: string | undefined
  systemPrompt?: string | undefined
  systemInstructions?: string | undefined
}
/**
 * Validate and transform create session data
 */
export declare function validateCreateSession(data: unknown): {
  metadata: Record<string, unknown>
  agentId: string
  workspaceId: string
  variables: Record<string, unknown>
  mode: 'manual' | 'auto' | 'paused'
  locale: string
  timezone: string
  userId?: string | undefined
  title?: string | undefined
  customerId?: string | undefined
  userAgent?: string | undefined
  ipAddress?: string | undefined
  referrer?: string | undefined
}
/**
 * Validate and transform create event data
 */
export declare function validateCreateEvent(data: unknown): {
  metadata: Record<string, unknown>
  sessionId: string
  content: Record<string, unknown>
  offset: number
  eventType:
    | 'customer_message'
    | 'agent_message'
    | 'tool_call'
    | 'tool_result'
    | 'status_update'
    | 'journey_transition'
    | 'variable_update'
  toolCallId?: string | undefined
  journeyId?: string | undefined
  stateId?: string | undefined
}
/**
 * Validate pagination parameters
 */
export declare function validatePagination(data: unknown): {
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: number
  sortBy?: string | undefined
}
/**
 * Validate agent filters
 */
export declare function validateAgentFilters(data: unknown): {
  status?: 'active' | 'inactive' | 'archived' | ('active' | 'inactive' | 'archived')[] | undefined
  workspaceId?: string | undefined
  search?: string | undefined
  createdBy?: string | undefined
  compositionMode?: 'strict' | 'fluid' | ('strict' | 'fluid')[] | undefined
  modelProvider?: string | string[] | undefined
  conversationStyle?: string | string[] | undefined
  lastActiveAfter?: string | Date | undefined
  lastActiveBefore?: string | Date | undefined
  hasActiveSessions?: boolean | undefined
}
/**
 * Validate session filters
 */
export declare function validateSessionFilters(data: unknown): {
  status?:
    | 'completed'
    | 'active'
    | 'abandoned'
    | ('completed' | 'active' | 'abandoned')[]
    | undefined
  agentId?: string | string[] | undefined
  userId?: string | undefined
  workspaceId?: string | undefined
  search?: string | undefined
  mode?: 'manual' | 'auto' | 'paused' | ('manual' | 'auto' | 'paused')[] | undefined
  customerId?: string | undefined
  currentJourneyId?: string | undefined
  hasEvents?: boolean | undefined
  startedAfter?: string | Date | undefined
  startedBefore?: string | Date | undefined
  endedAfter?: string | Date | undefined
  endedBefore?: string | Date | undefined
}
/**
 * Safe validation with error handling
 */
export declare function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | {
      success: true
      data: T
    }
  | {
      success: false
      errors: z.ZodError
    }
/**
 * Transform Zod errors to API-friendly format
 */
export declare function formatValidationErrors(zodError: z.ZodError): {
  field: string
  message: string
  code:
    | 'custom'
    | 'invalid_literal'
    | 'invalid_type'
    | 'invalid_enum_value'
    | 'invalid_union'
    | 'unrecognized_keys'
    | 'invalid_union_discriminator'
    | 'invalid_arguments'
    | 'invalid_return_type'
    | 'invalid_string'
    | 'not_multiple_of'
    | 'invalid_intersection_types'
    | 'invalid_date'
    | 'not_finite'
    | 'too_big'
    | 'too_small'
  value: any
}[]
export declare const parlantSchemas: {
  uuid: z.ZodString
  timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>
  jsonObject: z.ZodRecord<z.ZodString, z.ZodUnknown>
  jsonArray: z.ZodArray<z.ZodUnknown, 'many'>
  json: z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodUnknown, 'many'>]>
  agentStatus: z.ZodEnum<['active', 'inactive', 'archived']>
  sessionMode: z.ZodEnum<['auto', 'manual', 'paused']>
  sessionStatus: z.ZodEnum<['active', 'completed', 'abandoned']>
  eventType: z.ZodEnum<
    [
      'customer_message',
      'agent_message',
      'tool_call',
      'tool_result',
      'status_update',
      'journey_transition',
      'variable_update',
    ]
  >
  journeyStateType: z.ZodEnum<['chat', 'tool', 'decision', 'final']>
  compositionMode: z.ZodEnum<['fluid', 'strict']>
  createAgent: z.ZodObject<
    {
      workspaceId: z.ZodString
      createdBy: z.ZodString
      name: z.ZodString
      description: z.ZodOptional<z.ZodString>
      compositionMode: z.ZodDefault<z.ZodEnum<['fluid', 'strict']>>
      systemPrompt: z.ZodOptional<z.ZodString>
      modelProvider: z.ZodDefault<z.ZodString>
      modelName: z.ZodDefault<z.ZodString>
      temperature: z.ZodDefault<z.ZodNumber>
      maxTokens: z.ZodDefault<z.ZodNumber>
      responseTimeoutMs: z.ZodDefault<z.ZodNumber>
      maxContextLength: z.ZodDefault<z.ZodNumber>
      systemInstructions: z.ZodOptional<z.ZodString>
      allowInterruption: z.ZodDefault<z.ZodBoolean>
      allowProactiveMessages: z.ZodDefault<z.ZodBoolean>
      conversationStyle: z.ZodDefault<
        z.ZodEnum<['casual', 'professional', 'technical', 'friendly']>
      >
      dataRetentionDays: z.ZodDefault<z.ZodNumber>
      allowDataExport: z.ZodDefault<z.ZodBoolean>
      piiHandlingMode: z.ZodDefault<z.ZodEnum<['strict', 'standard', 'relaxed']>>
      integrationMetadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      customConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    },
    'strip',
    z.ZodTypeAny,
    {
      name: string
      workspaceId: string
      createdBy: string
      compositionMode: 'strict' | 'fluid'
      modelProvider: string
      modelName: string
      temperature: number
      maxTokens: number
      responseTimeoutMs: number
      maxContextLength: number
      allowInterruption: boolean
      allowProactiveMessages: boolean
      conversationStyle: 'professional' | 'technical' | 'friendly' | 'casual'
      dataRetentionDays: number
      allowDataExport: boolean
      piiHandlingMode: 'strict' | 'standard' | 'relaxed'
      integrationMetadata: Record<string, unknown>
      customConfig: Record<string, unknown>
      description?: string | undefined
      systemPrompt?: string | undefined
      systemInstructions?: string | undefined
    },
    {
      name: string
      workspaceId: string
      createdBy: string
      description?: string | undefined
      compositionMode?: 'strict' | 'fluid' | undefined
      systemPrompt?: string | undefined
      modelProvider?: string | undefined
      modelName?: string | undefined
      temperature?: number | undefined
      maxTokens?: number | undefined
      responseTimeoutMs?: number | undefined
      maxContextLength?: number | undefined
      systemInstructions?: string | undefined
      allowInterruption?: boolean | undefined
      allowProactiveMessages?: boolean | undefined
      conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
      dataRetentionDays?: number | undefined
      allowDataExport?: boolean | undefined
      piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
      integrationMetadata?: Record<string, unknown> | undefined
      customConfig?: Record<string, unknown> | undefined
    }
  >
  createSession: z.ZodObject<
    {
      agentId: z.ZodString
      workspaceId: z.ZodString
      userId: z.ZodOptional<z.ZodString>
      customerId: z.ZodOptional<z.ZodString>
      mode: z.ZodDefault<z.ZodEnum<['auto', 'manual', 'paused']>>
      title: z.ZodOptional<z.ZodString>
      metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      variables: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      userAgent: z.ZodOptional<z.ZodString>
      ipAddress: z.ZodOptional<z.ZodString>
      referrer: z.ZodOptional<z.ZodString>
      locale: z.ZodDefault<z.ZodString>
      timezone: z.ZodDefault<z.ZodString>
    },
    'strip',
    z.ZodTypeAny,
    {
      metadata: Record<string, unknown>
      agentId: string
      workspaceId: string
      variables: Record<string, unknown>
      mode: 'manual' | 'auto' | 'paused'
      locale: string
      timezone: string
      userId?: string | undefined
      title?: string | undefined
      customerId?: string | undefined
      userAgent?: string | undefined
      ipAddress?: string | undefined
      referrer?: string | undefined
    },
    {
      agentId: string
      workspaceId: string
      metadata?: Record<string, unknown> | undefined
      userId?: string | undefined
      variables?: Record<string, unknown> | undefined
      title?: string | undefined
      mode?: 'manual' | 'auto' | 'paused' | undefined
      customerId?: string | undefined
      userAgent?: string | undefined
      ipAddress?: string | undefined
      referrer?: string | undefined
      locale?: string | undefined
      timezone?: string | undefined
    }
  >
  createEvent: z.ZodObject<
    {
      sessionId: z.ZodString
      offset: z.ZodNumber
      eventType: z.ZodEnum<
        [
          'customer_message',
          'agent_message',
          'tool_call',
          'tool_result',
          'status_update',
          'journey_transition',
          'variable_update',
        ]
      >
      content: z.ZodRecord<z.ZodString, z.ZodUnknown>
      metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      toolCallId: z.ZodOptional<z.ZodString>
      journeyId: z.ZodOptional<z.ZodString>
      stateId: z.ZodOptional<z.ZodString>
    },
    'strip',
    z.ZodTypeAny,
    {
      metadata: Record<string, unknown>
      sessionId: string
      content: Record<string, unknown>
      offset: number
      eventType:
        | 'customer_message'
        | 'agent_message'
        | 'tool_call'
        | 'tool_result'
        | 'status_update'
        | 'journey_transition'
        | 'variable_update'
      toolCallId?: string | undefined
      journeyId?: string | undefined
      stateId?: string | undefined
    },
    {
      sessionId: string
      content: Record<string, unknown>
      offset: number
      eventType:
        | 'customer_message'
        | 'agent_message'
        | 'tool_call'
        | 'tool_result'
        | 'status_update'
        | 'journey_transition'
        | 'variable_update'
      metadata?: Record<string, unknown> | undefined
      toolCallId?: string | undefined
      journeyId?: string | undefined
      stateId?: string | undefined
    }
  >
  createGuideline: z.ZodObject<
    {
      agentId: z.ZodString
      condition: z.ZodString
      action: z.ZodString
      priority: z.ZodDefault<z.ZodNumber>
      enabled: z.ZodDefault<z.ZodBoolean>
      toolIds: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>
    },
    'strip',
    z.ZodTypeAny,
    {
      agentId: string
      action: string
      enabled: boolean
      condition: string
      priority: number
      toolIds: string[]
    },
    {
      agentId: string
      action: string
      condition: string
      enabled?: boolean | undefined
      priority?: number | undefined
      toolIds?: string[] | undefined
    }
  >
  createJourney: z.ZodObject<
    {
      agentId: z.ZodString
      title: z.ZodString
      description: z.ZodOptional<z.ZodString>
      conditions: z.ZodArray<z.ZodString, 'many'>
      enabled: z.ZodDefault<z.ZodBoolean>
      allowSkipping: z.ZodDefault<z.ZodBoolean>
      allowRevisiting: z.ZodDefault<z.ZodBoolean>
    },
    'strip',
    z.ZodTypeAny,
    {
      agentId: string
      enabled: boolean
      title: string
      conditions: string[]
      allowSkipping: boolean
      allowRevisiting: boolean
      description?: string | undefined
    },
    {
      agentId: string
      title: string
      conditions: string[]
      description?: string | undefined
      enabled?: boolean | undefined
      allowSkipping?: boolean | undefined
      allowRevisiting?: boolean | undefined
    }
  >
  createJourneyState: z.ZodEffects<
    z.ZodObject<
      {
        journeyId: z.ZodString
        name: z.ZodString
        stateType: z.ZodEnum<['chat', 'tool', 'decision', 'final']>
        chatPrompt: z.ZodOptional<z.ZodString>
        toolId: z.ZodOptional<z.ZodString>
        toolConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
        condition: z.ZodOptional<z.ZodString>
        isInitial: z.ZodDefault<z.ZodBoolean>
        isFinal: z.ZodDefault<z.ZodBoolean>
        allowSkip: z.ZodDefault<z.ZodBoolean>
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      },
      'strip',
      z.ZodTypeAny,
      {
        name: string
        metadata: Record<string, unknown>
        journeyId: string
        stateType: 'chat' | 'tool' | 'decision' | 'final'
        toolConfig: Record<string, unknown>
        isInitial: boolean
        isFinal: boolean
        allowSkip: boolean
        toolId?: string | undefined
        condition?: string | undefined
        chatPrompt?: string | undefined
      },
      {
        name: string
        journeyId: string
        stateType: 'chat' | 'tool' | 'decision' | 'final'
        toolId?: string | undefined
        metadata?: Record<string, unknown> | undefined
        condition?: string | undefined
        chatPrompt?: string | undefined
        toolConfig?: Record<string, unknown> | undefined
        isInitial?: boolean | undefined
        isFinal?: boolean | undefined
        allowSkip?: boolean | undefined
      }
    >,
    {
      name: string
      metadata: Record<string, unknown>
      journeyId: string
      stateType: 'chat' | 'tool' | 'decision' | 'final'
      toolConfig: Record<string, unknown>
      isInitial: boolean
      isFinal: boolean
      allowSkip: boolean
      toolId?: string | undefined
      condition?: string | undefined
      chatPrompt?: string | undefined
    },
    {
      name: string
      journeyId: string
      stateType: 'chat' | 'tool' | 'decision' | 'final'
      toolId?: string | undefined
      metadata?: Record<string, unknown> | undefined
      condition?: string | undefined
      chatPrompt?: string | undefined
      toolConfig?: Record<string, unknown> | undefined
      isInitial?: boolean | undefined
      isFinal?: boolean | undefined
      allowSkip?: boolean | undefined
    }
  >
  createTool: z.ZodObject<
    {
      workspaceId: z.ZodString
      name: z.ZodString
      displayName: z.ZodString
      description: z.ZodString
      simToolId: z.ZodOptional<z.ZodString>
      toolType: z.ZodEnum<['sim_native', 'custom', 'external']>
      parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>
      returnSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      usageGuidelines: z.ZodOptional<z.ZodString>
      errorHandling: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      executionTimeout: z.ZodDefault<z.ZodNumber>
      retryPolicy: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      rateLimitPerMinute: z.ZodDefault<z.ZodNumber>
      rateLimitPerHour: z.ZodDefault<z.ZodNumber>
      requiresAuth: z.ZodDefault<z.ZodBoolean>
      authType: z.ZodOptional<z.ZodEnum<['api_key', 'oauth', 'basic', 'none']>>
      authConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      enabled: z.ZodDefault<z.ZodBoolean>
      isPublic: z.ZodDefault<z.ZodBoolean>
    },
    'strip',
    z.ZodTypeAny,
    {
      parameters: Record<string, unknown>
      name: string
      description: string
      workspaceId: string
      displayName: string
      errorHandling: Record<string, unknown>
      enabled: boolean
      toolType: 'custom' | 'external' | 'sim_native'
      executionTimeout: number
      retryPolicy: Record<string, unknown>
      rateLimitPerMinute: number
      rateLimitPerHour: number
      requiresAuth: boolean
      authConfig: Record<string, unknown>
      isPublic: boolean
      simToolId?: string | undefined
      returnSchema?: Record<string, unknown> | undefined
      usageGuidelines?: string | undefined
      authType?: 'oauth' | 'api_key' | 'basic' | 'none' | undefined
    },
    {
      parameters: Record<string, unknown>
      name: string
      description: string
      workspaceId: string
      displayName: string
      toolType: 'custom' | 'external' | 'sim_native'
      errorHandling?: Record<string, unknown> | undefined
      enabled?: boolean | undefined
      simToolId?: string | undefined
      returnSchema?: Record<string, unknown> | undefined
      usageGuidelines?: string | undefined
      executionTimeout?: number | undefined
      retryPolicy?: Record<string, unknown> | undefined
      rateLimitPerMinute?: number | undefined
      rateLimitPerHour?: number | undefined
      requiresAuth?: boolean | undefined
      authType?: 'oauth' | 'api_key' | 'basic' | 'none' | undefined
      authConfig?: Record<string, unknown> | undefined
      isPublic?: boolean | undefined
    }
  >
  createVariable: z.ZodEffects<
    z.ZodObject<
      {
        agentId: z.ZodString
        sessionId: z.ZodOptional<z.ZodString>
        key: z.ZodString
        scope: z.ZodDefault<z.ZodEnum<['session', 'customer', 'global']>>
        value: z.ZodUnion<
          [z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodUnknown, 'many'>]
        >
        valueType: z.ZodEnum<['string', 'number', 'boolean', 'object', 'array']>
        isPrivate: z.ZodDefault<z.ZodBoolean>
        description: z.ZodOptional<z.ZodString>
      },
      'strip',
      z.ZodTypeAny,
      {
        key: string
        value: unknown[] | Record<string, unknown>
        agentId: string
        scope: 'session' | 'customer' | 'global'
        valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
        isPrivate: boolean
        description?: string | undefined
        sessionId?: string | undefined
      },
      {
        key: string
        value: unknown[] | Record<string, unknown>
        agentId: string
        valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
        description?: string | undefined
        sessionId?: string | undefined
        scope?: 'session' | 'customer' | 'global' | undefined
        isPrivate?: boolean | undefined
      }
    >,
    {
      key: string
      value: unknown[] | Record<string, unknown>
      agentId: string
      scope: 'session' | 'customer' | 'global'
      valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
      isPrivate: boolean
      description?: string | undefined
      sessionId?: string | undefined
    },
    {
      key: string
      value: unknown[] | Record<string, unknown>
      agentId: string
      valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
      description?: string | undefined
      sessionId?: string | undefined
      scope?: 'session' | 'customer' | 'global' | undefined
      isPrivate?: boolean | undefined
    }
  >
  updateAgent: z.ZodObject<
    {
      workspaceId: z.ZodOptional<z.ZodString>
      createdBy: z.ZodOptional<z.ZodString>
      name: z.ZodOptional<z.ZodString>
      description: z.ZodOptional<z.ZodOptional<z.ZodString>>
      compositionMode: z.ZodOptional<z.ZodDefault<z.ZodEnum<['fluid', 'strict']>>>
      systemPrompt: z.ZodOptional<z.ZodOptional<z.ZodString>>
      modelProvider: z.ZodOptional<z.ZodDefault<z.ZodString>>
      modelName: z.ZodOptional<z.ZodDefault<z.ZodString>>
      temperature: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
      maxTokens: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
      responseTimeoutMs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
      maxContextLength: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
      systemInstructions: z.ZodOptional<z.ZodOptional<z.ZodString>>
      allowInterruption: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
      allowProactiveMessages: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
      conversationStyle: z.ZodOptional<
        z.ZodDefault<z.ZodEnum<['casual', 'professional', 'technical', 'friendly']>>
      >
      dataRetentionDays: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
      allowDataExport: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
      piiHandlingMode: z.ZodOptional<z.ZodDefault<z.ZodEnum<['strict', 'standard', 'relaxed']>>>
      integrationMetadata: z.ZodOptional<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>>
      customConfig: z.ZodOptional<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>>
    } & {
      id: z.ZodString
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string
      name?: string | undefined
      description?: string | undefined
      workspaceId?: string | undefined
      createdBy?: string | undefined
      compositionMode?: 'strict' | 'fluid' | undefined
      systemPrompt?: string | undefined
      modelProvider?: string | undefined
      modelName?: string | undefined
      temperature?: number | undefined
      maxTokens?: number | undefined
      responseTimeoutMs?: number | undefined
      maxContextLength?: number | undefined
      systemInstructions?: string | undefined
      allowInterruption?: boolean | undefined
      allowProactiveMessages?: boolean | undefined
      conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
      dataRetentionDays?: number | undefined
      allowDataExport?: boolean | undefined
      piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
      integrationMetadata?: Record<string, unknown> | undefined
      customConfig?: Record<string, unknown> | undefined
    },
    {
      id: string
      name?: string | undefined
      description?: string | undefined
      workspaceId?: string | undefined
      createdBy?: string | undefined
      compositionMode?: 'strict' | 'fluid' | undefined
      systemPrompt?: string | undefined
      modelProvider?: string | undefined
      modelName?: string | undefined
      temperature?: number | undefined
      maxTokens?: number | undefined
      responseTimeoutMs?: number | undefined
      maxContextLength?: number | undefined
      systemInstructions?: string | undefined
      allowInterruption?: boolean | undefined
      allowProactiveMessages?: boolean | undefined
      conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
      dataRetentionDays?: number | undefined
      allowDataExport?: boolean | undefined
      piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
      integrationMetadata?: Record<string, unknown> | undefined
      customConfig?: Record<string, unknown> | undefined
    }
  >
  updateSession: z.ZodObject<
    {
      agentId: z.ZodOptional<z.ZodString>
      workspaceId: z.ZodOptional<z.ZodString>
      userId: z.ZodOptional<z.ZodOptional<z.ZodString>>
      customerId: z.ZodOptional<z.ZodOptional<z.ZodString>>
      mode: z.ZodOptional<z.ZodDefault<z.ZodEnum<['auto', 'manual', 'paused']>>>
      title: z.ZodOptional<z.ZodOptional<z.ZodString>>
      metadata: z.ZodOptional<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>>
      variables: z.ZodOptional<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>>
      userAgent: z.ZodOptional<z.ZodOptional<z.ZodString>>
      ipAddress: z.ZodOptional<z.ZodOptional<z.ZodString>>
      referrer: z.ZodOptional<z.ZodOptional<z.ZodString>>
      locale: z.ZodOptional<z.ZodDefault<z.ZodString>>
      timezone: z.ZodOptional<z.ZodDefault<z.ZodString>>
    } & {
      id: z.ZodString
      status: z.ZodOptional<z.ZodEnum<['active', 'completed', 'abandoned']>>
      currentJourneyId: z.ZodOptional<z.ZodString>
      currentStateId: z.ZodOptional<z.ZodString>
      satisfactionScore: z.ZodOptional<z.ZodNumber>
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string
      metadata?: Record<string, unknown> | undefined
      status?: 'completed' | 'active' | 'abandoned' | undefined
      agentId?: string | undefined
      userId?: string | undefined
      workspaceId?: string | undefined
      variables?: Record<string, unknown> | undefined
      title?: string | undefined
      mode?: 'manual' | 'auto' | 'paused' | undefined
      customerId?: string | undefined
      currentJourneyId?: string | undefined
      currentStateId?: string | undefined
      satisfactionScore?: number | undefined
      userAgent?: string | undefined
      ipAddress?: string | undefined
      referrer?: string | undefined
      locale?: string | undefined
      timezone?: string | undefined
    },
    {
      id: string
      metadata?: Record<string, unknown> | undefined
      status?: 'completed' | 'active' | 'abandoned' | undefined
      agentId?: string | undefined
      userId?: string | undefined
      workspaceId?: string | undefined
      variables?: Record<string, unknown> | undefined
      title?: string | undefined
      mode?: 'manual' | 'auto' | 'paused' | undefined
      customerId?: string | undefined
      currentJourneyId?: string | undefined
      currentStateId?: string | undefined
      satisfactionScore?: number | undefined
      userAgent?: string | undefined
      ipAddress?: string | undefined
      referrer?: string | undefined
      locale?: string | undefined
      timezone?: string | undefined
    }
  >
  updateGuideline: z.ZodObject<
    {
      agentId: z.ZodOptional<z.ZodString>
      condition: z.ZodOptional<z.ZodString>
      action: z.ZodOptional<z.ZodString>
      priority: z.ZodOptional<z.ZodDefault<z.ZodNumber>>
      enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
      toolIds: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>>
    } & {
      id: z.ZodString
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string
      agentId?: string | undefined
      action?: string | undefined
      enabled?: boolean | undefined
      condition?: string | undefined
      priority?: number | undefined
      toolIds?: string[] | undefined
    },
    {
      id: string
      agentId?: string | undefined
      action?: string | undefined
      enabled?: boolean | undefined
      condition?: string | undefined
      priority?: number | undefined
      toolIds?: string[] | undefined
    }
  >
  updateJourney: z.ZodObject<
    {
      agentId: z.ZodOptional<z.ZodString>
      title: z.ZodOptional<z.ZodString>
      description: z.ZodOptional<z.ZodOptional<z.ZodString>>
      conditions: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>
      enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
      allowSkipping: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
      allowRevisiting: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>
    } & {
      id: z.ZodString
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string
      description?: string | undefined
      agentId?: string | undefined
      enabled?: boolean | undefined
      title?: string | undefined
      conditions?: string[] | undefined
      allowSkipping?: boolean | undefined
      allowRevisiting?: boolean | undefined
    },
    {
      id: string
      description?: string | undefined
      agentId?: string | undefined
      enabled?: boolean | undefined
      title?: string | undefined
      conditions?: string[] | undefined
      allowSkipping?: boolean | undefined
      allowRevisiting?: boolean | undefined
    }
  >
  agentResponse: z.ZodObject<
    {
      workspaceId: z.ZodString
      createdBy: z.ZodString
      name: z.ZodString
      description: z.ZodOptional<z.ZodString>
      compositionMode: z.ZodDefault<z.ZodEnum<['fluid', 'strict']>>
      systemPrompt: z.ZodOptional<z.ZodString>
      modelProvider: z.ZodDefault<z.ZodString>
      modelName: z.ZodDefault<z.ZodString>
      temperature: z.ZodDefault<z.ZodNumber>
      maxTokens: z.ZodDefault<z.ZodNumber>
      responseTimeoutMs: z.ZodDefault<z.ZodNumber>
      maxContextLength: z.ZodDefault<z.ZodNumber>
      systemInstructions: z.ZodOptional<z.ZodString>
      allowInterruption: z.ZodDefault<z.ZodBoolean>
      allowProactiveMessages: z.ZodDefault<z.ZodBoolean>
      conversationStyle: z.ZodDefault<
        z.ZodEnum<['casual', 'professional', 'technical', 'friendly']>
      >
      dataRetentionDays: z.ZodDefault<z.ZodNumber>
      allowDataExport: z.ZodDefault<z.ZodBoolean>
      piiHandlingMode: z.ZodDefault<z.ZodEnum<['strict', 'standard', 'relaxed']>>
      integrationMetadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      customConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    } & {
      id: z.ZodString
      status: z.ZodEnum<['active', 'inactive', 'archived']>
      totalSessions: z.ZodNumber
      totalMessages: z.ZodNumber
      totalTokensUsed: z.ZodNumber
      totalCost: z.ZodNumber
      averageSessionDuration: z.ZodNullable<z.ZodNumber>
      lastActiveAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
      createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
      updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
      deletedAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
    },
    'strip',
    z.ZodTypeAny,
    {
      name: string
      id: string
      status: 'active' | 'inactive' | 'archived'
      workspaceId: string
      createdAt: string | Date
      updatedAt: string | Date
      createdBy: string
      compositionMode: 'strict' | 'fluid'
      modelProvider: string
      modelName: string
      temperature: number
      maxTokens: number
      responseTimeoutMs: number
      maxContextLength: number
      allowInterruption: boolean
      allowProactiveMessages: boolean
      conversationStyle: 'professional' | 'technical' | 'friendly' | 'casual'
      dataRetentionDays: number
      allowDataExport: boolean
      piiHandlingMode: 'strict' | 'standard' | 'relaxed'
      integrationMetadata: Record<string, unknown>
      customConfig: Record<string, unknown>
      totalSessions: number
      totalMessages: number
      totalTokensUsed: number
      totalCost: number
      averageSessionDuration: number | null
      lastActiveAt: string | Date | null
      deletedAt: string | Date | null
      description?: string | undefined
      systemPrompt?: string | undefined
      systemInstructions?: string | undefined
    },
    {
      name: string
      id: string
      status: 'active' | 'inactive' | 'archived'
      workspaceId: string
      createdAt: string | Date
      updatedAt: string | Date
      createdBy: string
      totalSessions: number
      totalMessages: number
      totalTokensUsed: number
      totalCost: number
      averageSessionDuration: number | null
      lastActiveAt: string | Date | null
      deletedAt: string | Date | null
      description?: string | undefined
      compositionMode?: 'strict' | 'fluid' | undefined
      systemPrompt?: string | undefined
      modelProvider?: string | undefined
      modelName?: string | undefined
      temperature?: number | undefined
      maxTokens?: number | undefined
      responseTimeoutMs?: number | undefined
      maxContextLength?: number | undefined
      systemInstructions?: string | undefined
      allowInterruption?: boolean | undefined
      allowProactiveMessages?: boolean | undefined
      conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
      dataRetentionDays?: number | undefined
      allowDataExport?: boolean | undefined
      piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
      integrationMetadata?: Record<string, unknown> | undefined
      customConfig?: Record<string, unknown> | undefined
    }
  >
  sessionResponse: z.ZodObject<
    {
      agentId: z.ZodString
      workspaceId: z.ZodString
      userId: z.ZodOptional<z.ZodString>
      customerId: z.ZodOptional<z.ZodString>
      mode: z.ZodDefault<z.ZodEnum<['auto', 'manual', 'paused']>>
      title: z.ZodOptional<z.ZodString>
      metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      variables: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      userAgent: z.ZodOptional<z.ZodString>
      ipAddress: z.ZodOptional<z.ZodString>
      referrer: z.ZodOptional<z.ZodString>
      locale: z.ZodDefault<z.ZodString>
      timezone: z.ZodDefault<z.ZodString>
    } & {
      id: z.ZodString
      status: z.ZodEnum<['active', 'completed', 'abandoned']>
      currentJourneyId: z.ZodNullable<z.ZodString>
      currentStateId: z.ZodNullable<z.ZodString>
      eventCount: z.ZodNumber
      messageCount: z.ZodNumber
      tokensUsed: z.ZodNumber
      cost: z.ZodNumber
      averageResponseTime: z.ZodNullable<z.ZodNumber>
      satisfactionScore: z.ZodNullable<z.ZodNumber>
      sessionType: z.ZodDefault<z.ZodEnum<['conversation', 'support', 'onboarding', 'survey']>>
      tags: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>
      startedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
      lastActivityAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
      endedAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
      createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
      updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string
      metadata: Record<string, unknown>
      status: 'completed' | 'active' | 'abandoned'
      agentId: string
      workspaceId: string
      variables: Record<string, unknown>
      tags: string[]
      startedAt: string | Date
      mode: 'manual' | 'auto' | 'paused'
      createdAt: string | Date
      updatedAt: string | Date
      currentJourneyId: string | null
      currentStateId: string | null
      eventCount: number
      messageCount: number
      tokensUsed: number
      cost: number
      averageResponseTime: number | null
      satisfactionScore: number | null
      sessionType: 'conversation' | 'support' | 'onboarding' | 'survey'
      locale: string
      timezone: string
      lastActivityAt: string | Date
      endedAt: string | Date | null
      userId?: string | undefined
      title?: string | undefined
      customerId?: string | undefined
      userAgent?: string | undefined
      ipAddress?: string | undefined
      referrer?: string | undefined
    },
    {
      id: string
      status: 'completed' | 'active' | 'abandoned'
      agentId: string
      workspaceId: string
      startedAt: string | Date
      createdAt: string | Date
      updatedAt: string | Date
      currentJourneyId: string | null
      currentStateId: string | null
      eventCount: number
      messageCount: number
      tokensUsed: number
      cost: number
      averageResponseTime: number | null
      satisfactionScore: number | null
      lastActivityAt: string | Date
      endedAt: string | Date | null
      metadata?: Record<string, unknown> | undefined
      userId?: string | undefined
      variables?: Record<string, unknown> | undefined
      tags?: string[] | undefined
      title?: string | undefined
      mode?: 'manual' | 'auto' | 'paused' | undefined
      customerId?: string | undefined
      sessionType?: 'conversation' | 'support' | 'onboarding' | 'survey' | undefined
      userAgent?: string | undefined
      ipAddress?: string | undefined
      referrer?: string | undefined
      locale?: string | undefined
      timezone?: string | undefined
    }
  >
  eventResponse: z.ZodObject<
    {
      sessionId: z.ZodString
      offset: z.ZodNumber
      eventType: z.ZodEnum<
        [
          'customer_message',
          'agent_message',
          'tool_call',
          'tool_result',
          'status_update',
          'journey_transition',
          'variable_update',
        ]
      >
      content: z.ZodRecord<z.ZodString, z.ZodUnknown>
      metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      toolCallId: z.ZodOptional<z.ZodString>
      journeyId: z.ZodOptional<z.ZodString>
      stateId: z.ZodOptional<z.ZodString>
    } & {
      id: z.ZodString
      createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string
      metadata: Record<string, unknown>
      sessionId: string
      content: Record<string, unknown>
      createdAt: string | Date
      offset: number
      eventType:
        | 'customer_message'
        | 'agent_message'
        | 'tool_call'
        | 'tool_result'
        | 'status_update'
        | 'journey_transition'
        | 'variable_update'
      toolCallId?: string | undefined
      journeyId?: string | undefined
      stateId?: string | undefined
    },
    {
      id: string
      sessionId: string
      content: Record<string, unknown>
      createdAt: string | Date
      offset: number
      eventType:
        | 'customer_message'
        | 'agent_message'
        | 'tool_call'
        | 'tool_result'
        | 'status_update'
        | 'journey_transition'
        | 'variable_update'
      metadata?: Record<string, unknown> | undefined
      toolCallId?: string | undefined
      journeyId?: string | undefined
      stateId?: string | undefined
    }
  >
  guidelineResponse: z.ZodObject<
    {
      agentId: z.ZodString
      condition: z.ZodString
      action: z.ZodString
      priority: z.ZodDefault<z.ZodNumber>
      enabled: z.ZodDefault<z.ZodBoolean>
      toolIds: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>
    } & {
      id: z.ZodString
      matchCount: z.ZodNumber
      lastMatchedAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
      createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
      updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string
      agentId: string
      action: string
      enabled: boolean
      condition: string
      createdAt: string | Date
      updatedAt: string | Date
      priority: number
      toolIds: string[]
      matchCount: number
      lastMatchedAt: string | Date | null
    },
    {
      id: string
      agentId: string
      action: string
      condition: string
      createdAt: string | Date
      updatedAt: string | Date
      matchCount: number
      lastMatchedAt: string | Date | null
      enabled?: boolean | undefined
      priority?: number | undefined
      toolIds?: string[] | undefined
    }
  >
  journeyResponse: z.ZodObject<
    {
      agentId: z.ZodString
      title: z.ZodString
      description: z.ZodOptional<z.ZodString>
      conditions: z.ZodArray<z.ZodString, 'many'>
      enabled: z.ZodDefault<z.ZodBoolean>
      allowSkipping: z.ZodDefault<z.ZodBoolean>
      allowRevisiting: z.ZodDefault<z.ZodBoolean>
    } & {
      id: z.ZodString
      totalSessions: z.ZodNumber
      completionRate: z.ZodNumber
      lastUsedAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
      createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
      updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string
      agentId: string
      enabled: boolean
      title: string
      createdAt: string | Date
      updatedAt: string | Date
      totalSessions: number
      conditions: string[]
      allowSkipping: boolean
      allowRevisiting: boolean
      completionRate: number
      lastUsedAt: string | Date | null
      description?: string | undefined
    },
    {
      id: string
      agentId: string
      title: string
      createdAt: string | Date
      updatedAt: string | Date
      totalSessions: number
      conditions: string[]
      completionRate: number
      lastUsedAt: string | Date | null
      description?: string | undefined
      enabled?: boolean | undefined
      allowSkipping?: boolean | undefined
      allowRevisiting?: boolean | undefined
    }
  >
  journeyStateResponse: z.ZodObject<
    {
      journeyId: z.ZodString
      name: z.ZodString
      stateType: z.ZodEnum<['chat', 'tool', 'decision', 'final']>
      chatPrompt: z.ZodOptional<z.ZodString>
      toolId: z.ZodOptional<z.ZodString>
      toolConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      condition: z.ZodOptional<z.ZodString>
      isInitial: z.ZodDefault<z.ZodBoolean>
      isFinal: z.ZodDefault<z.ZodBoolean>
      allowSkip: z.ZodDefault<z.ZodBoolean>
      metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
    } & {
      id: z.ZodString
      createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
      updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    },
    'strip',
    z.ZodTypeAny,
    {
      name: string
      id: string
      metadata: Record<string, unknown>
      createdAt: string | Date
      updatedAt: string | Date
      journeyId: string
      stateType: 'chat' | 'tool' | 'decision' | 'final'
      toolConfig: Record<string, unknown>
      isInitial: boolean
      isFinal: boolean
      allowSkip: boolean
      toolId?: string | undefined
      condition?: string | undefined
      chatPrompt?: string | undefined
    },
    {
      name: string
      id: string
      createdAt: string | Date
      updatedAt: string | Date
      journeyId: string
      stateType: 'chat' | 'tool' | 'decision' | 'final'
      toolId?: string | undefined
      metadata?: Record<string, unknown> | undefined
      condition?: string | undefined
      chatPrompt?: string | undefined
      toolConfig?: Record<string, unknown> | undefined
      isInitial?: boolean | undefined
      isFinal?: boolean | undefined
      allowSkip?: boolean | undefined
    }
  >
  toolResponse: z.ZodObject<
    {
      workspaceId: z.ZodString
      name: z.ZodString
      displayName: z.ZodString
      description: z.ZodString
      simToolId: z.ZodOptional<z.ZodString>
      toolType: z.ZodEnum<['sim_native', 'custom', 'external']>
      parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>
      returnSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      usageGuidelines: z.ZodOptional<z.ZodString>
      errorHandling: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      executionTimeout: z.ZodDefault<z.ZodNumber>
      retryPolicy: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      rateLimitPerMinute: z.ZodDefault<z.ZodNumber>
      rateLimitPerHour: z.ZodDefault<z.ZodNumber>
      requiresAuth: z.ZodDefault<z.ZodBoolean>
      authType: z.ZodOptional<z.ZodEnum<['api_key', 'oauth', 'basic', 'none']>>
      authConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
      enabled: z.ZodDefault<z.ZodBoolean>
      isPublic: z.ZodDefault<z.ZodBoolean>
    } & {
      id: z.ZodString
      isDeprecated: z.ZodBoolean
      useCount: z.ZodNumber
      successRate: z.ZodNumber
      lastUsedAt: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodDate]>>
      createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
      updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    },
    'strip',
    z.ZodTypeAny,
    {
      parameters: Record<string, unknown>
      name: string
      id: string
      description: string
      workspaceId: string
      displayName: string
      errorHandling: Record<string, unknown>
      enabled: boolean
      successRate: number
      createdAt: string | Date
      updatedAt: string | Date
      lastUsedAt: string | Date | null
      useCount: number
      toolType: 'custom' | 'external' | 'sim_native'
      executionTimeout: number
      retryPolicy: Record<string, unknown>
      rateLimitPerMinute: number
      rateLimitPerHour: number
      requiresAuth: boolean
      authConfig: Record<string, unknown>
      isPublic: boolean
      isDeprecated: boolean
      simToolId?: string | undefined
      returnSchema?: Record<string, unknown> | undefined
      usageGuidelines?: string | undefined
      authType?: 'oauth' | 'api_key' | 'basic' | 'none' | undefined
    },
    {
      parameters: Record<string, unknown>
      name: string
      id: string
      description: string
      workspaceId: string
      displayName: string
      successRate: number
      createdAt: string | Date
      updatedAt: string | Date
      lastUsedAt: string | Date | null
      useCount: number
      toolType: 'custom' | 'external' | 'sim_native'
      isDeprecated: boolean
      errorHandling?: Record<string, unknown> | undefined
      enabled?: boolean | undefined
      simToolId?: string | undefined
      returnSchema?: Record<string, unknown> | undefined
      usageGuidelines?: string | undefined
      executionTimeout?: number | undefined
      retryPolicy?: Record<string, unknown> | undefined
      rateLimitPerMinute?: number | undefined
      rateLimitPerHour?: number | undefined
      requiresAuth?: boolean | undefined
      authType?: 'oauth' | 'api_key' | 'basic' | 'none' | undefined
      authConfig?: Record<string, unknown> | undefined
      isPublic?: boolean | undefined
    }
  >
  variableResponse: z.ZodObject<
    {
      agentId: z.ZodString
      sessionId: z.ZodOptional<z.ZodString>
      key: z.ZodString
      scope: z.ZodDefault<z.ZodEnum<['session', 'customer', 'global']>>
      value: z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodUnknown>, z.ZodArray<z.ZodUnknown, 'many'>]>
      valueType: z.ZodEnum<['string', 'number', 'boolean', 'object', 'array']>
      isPrivate: z.ZodDefault<z.ZodBoolean>
      description: z.ZodOptional<z.ZodString>
    } & {
      id: z.ZodString
      createdAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
      updatedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>
    },
    'strip',
    z.ZodTypeAny,
    {
      id: string
      key: string
      value: unknown[] | Record<string, unknown>
      agentId: string
      createdAt: string | Date
      updatedAt: string | Date
      scope: 'session' | 'customer' | 'global'
      valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
      isPrivate: boolean
      description?: string | undefined
      sessionId?: string | undefined
    },
    {
      id: string
      key: string
      value: unknown[] | Record<string, unknown>
      agentId: string
      createdAt: string | Date
      updatedAt: string | Date
      valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'
      description?: string | undefined
      sessionId?: string | undefined
      scope?: 'session' | 'customer' | 'global' | undefined
      isPrivate?: boolean | undefined
    }
  >
  agentFilter: z.ZodObject<
    {
      workspaceId: z.ZodOptional<z.ZodString>
      status: z.ZodOptional<
        z.ZodUnion<
          [
            z.ZodEnum<['active', 'inactive', 'archived']>,
            z.ZodArray<z.ZodEnum<['active', 'inactive', 'archived']>, 'many'>,
          ]
        >
      >
      compositionMode: z.ZodOptional<
        z.ZodUnion<
          [z.ZodEnum<['fluid', 'strict']>, z.ZodArray<z.ZodEnum<['fluid', 'strict']>, 'many'>]
        >
      >
      modelProvider: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, 'many'>]>>
      conversationStyle: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, 'many'>]>>
      createdBy: z.ZodOptional<z.ZodString>
      lastActiveAfter: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
      lastActiveBefore: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
      hasActiveSessions: z.ZodOptional<z.ZodBoolean>
      search: z.ZodOptional<z.ZodString>
    },
    'strip',
    z.ZodTypeAny,
    {
      status?:
        | 'active'
        | 'inactive'
        | 'archived'
        | ('active' | 'inactive' | 'archived')[]
        | undefined
      workspaceId?: string | undefined
      search?: string | undefined
      createdBy?: string | undefined
      compositionMode?: 'strict' | 'fluid' | ('strict' | 'fluid')[] | undefined
      modelProvider?: string | string[] | undefined
      conversationStyle?: string | string[] | undefined
      lastActiveAfter?: string | Date | undefined
      lastActiveBefore?: string | Date | undefined
      hasActiveSessions?: boolean | undefined
    },
    {
      status?:
        | 'active'
        | 'inactive'
        | 'archived'
        | ('active' | 'inactive' | 'archived')[]
        | undefined
      workspaceId?: string | undefined
      search?: string | undefined
      createdBy?: string | undefined
      compositionMode?: 'strict' | 'fluid' | ('strict' | 'fluid')[] | undefined
      modelProvider?: string | string[] | undefined
      conversationStyle?: string | string[] | undefined
      lastActiveAfter?: string | Date | undefined
      lastActiveBefore?: string | Date | undefined
      hasActiveSessions?: boolean | undefined
    }
  >
  sessionFilter: z.ZodObject<
    {
      agentId: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, 'many'>]>>
      workspaceId: z.ZodOptional<z.ZodString>
      userId: z.ZodOptional<z.ZodString>
      customerId: z.ZodOptional<z.ZodString>
      status: z.ZodOptional<
        z.ZodUnion<
          [
            z.ZodEnum<['active', 'completed', 'abandoned']>,
            z.ZodArray<z.ZodEnum<['active', 'completed', 'abandoned']>, 'many'>,
          ]
        >
      >
      mode: z.ZodOptional<
        z.ZodUnion<
          [
            z.ZodEnum<['auto', 'manual', 'paused']>,
            z.ZodArray<z.ZodEnum<['auto', 'manual', 'paused']>, 'many'>,
          ]
        >
      >
      hasEvents: z.ZodOptional<z.ZodBoolean>
      startedAfter: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
      startedBefore: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
      endedAfter: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
      endedBefore: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>
      currentJourneyId: z.ZodOptional<z.ZodString>
      search: z.ZodOptional<z.ZodString>
    },
    'strip',
    z.ZodTypeAny,
    {
      status?:
        | 'completed'
        | 'active'
        | 'abandoned'
        | ('completed' | 'active' | 'abandoned')[]
        | undefined
      agentId?: string | string[] | undefined
      userId?: string | undefined
      workspaceId?: string | undefined
      search?: string | undefined
      mode?: 'manual' | 'auto' | 'paused' | ('manual' | 'auto' | 'paused')[] | undefined
      customerId?: string | undefined
      currentJourneyId?: string | undefined
      hasEvents?: boolean | undefined
      startedAfter?: string | Date | undefined
      startedBefore?: string | Date | undefined
      endedAfter?: string | Date | undefined
      endedBefore?: string | Date | undefined
    },
    {
      status?:
        | 'completed'
        | 'active'
        | 'abandoned'
        | ('completed' | 'active' | 'abandoned')[]
        | undefined
      agentId?: string | string[] | undefined
      userId?: string | undefined
      workspaceId?: string | undefined
      search?: string | undefined
      mode?: 'manual' | 'auto' | 'paused' | ('manual' | 'auto' | 'paused')[] | undefined
      customerId?: string | undefined
      currentJourneyId?: string | undefined
      hasEvents?: boolean | undefined
      startedAfter?: string | Date | undefined
      startedBefore?: string | Date | undefined
      endedAfter?: string | Date | undefined
      endedBefore?: string | Date | undefined
    }
  >
  pagination: z.ZodObject<
    {
      page: z.ZodDefault<z.ZodNumber>
      pageSize: z.ZodDefault<z.ZodNumber>
      sortBy: z.ZodOptional<z.ZodString>
      sortOrder: z.ZodDefault<z.ZodEnum<['asc', 'desc']>>
    },
    'strip',
    z.ZodTypeAny,
    {
      sortOrder: 'asc' | 'desc'
      page: number
      pageSize: number
      sortBy?: string | undefined
    },
    {
      sortOrder?: 'asc' | 'desc' | undefined
      page?: number | undefined
      pageSize?: number | undefined
      sortBy?: string | undefined
    }
  >
  bulkCreateAgent: z.ZodObject<
    {
      agents: z.ZodArray<
        z.ZodObject<
          {
            workspaceId: z.ZodString
            createdBy: z.ZodString
            name: z.ZodString
            description: z.ZodOptional<z.ZodString>
            compositionMode: z.ZodDefault<z.ZodEnum<['fluid', 'strict']>>
            systemPrompt: z.ZodOptional<z.ZodString>
            modelProvider: z.ZodDefault<z.ZodString>
            modelName: z.ZodDefault<z.ZodString>
            temperature: z.ZodDefault<z.ZodNumber>
            maxTokens: z.ZodDefault<z.ZodNumber>
            responseTimeoutMs: z.ZodDefault<z.ZodNumber>
            maxContextLength: z.ZodDefault<z.ZodNumber>
            systemInstructions: z.ZodOptional<z.ZodString>
            allowInterruption: z.ZodDefault<z.ZodBoolean>
            allowProactiveMessages: z.ZodDefault<z.ZodBoolean>
            conversationStyle: z.ZodDefault<
              z.ZodEnum<['casual', 'professional', 'technical', 'friendly']>
            >
            dataRetentionDays: z.ZodDefault<z.ZodNumber>
            allowDataExport: z.ZodDefault<z.ZodBoolean>
            piiHandlingMode: z.ZodDefault<z.ZodEnum<['strict', 'standard', 'relaxed']>>
            integrationMetadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
            customConfig: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
          },
          'strip',
          z.ZodTypeAny,
          {
            name: string
            workspaceId: string
            createdBy: string
            compositionMode: 'strict' | 'fluid'
            modelProvider: string
            modelName: string
            temperature: number
            maxTokens: number
            responseTimeoutMs: number
            maxContextLength: number
            allowInterruption: boolean
            allowProactiveMessages: boolean
            conversationStyle: 'professional' | 'technical' | 'friendly' | 'casual'
            dataRetentionDays: number
            allowDataExport: boolean
            piiHandlingMode: 'strict' | 'standard' | 'relaxed'
            integrationMetadata: Record<string, unknown>
            customConfig: Record<string, unknown>
            description?: string | undefined
            systemPrompt?: string | undefined
            systemInstructions?: string | undefined
          },
          {
            name: string
            workspaceId: string
            createdBy: string
            description?: string | undefined
            compositionMode?: 'strict' | 'fluid' | undefined
            systemPrompt?: string | undefined
            modelProvider?: string | undefined
            modelName?: string | undefined
            temperature?: number | undefined
            maxTokens?: number | undefined
            responseTimeoutMs?: number | undefined
            maxContextLength?: number | undefined
            systemInstructions?: string | undefined
            allowInterruption?: boolean | undefined
            allowProactiveMessages?: boolean | undefined
            conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
            dataRetentionDays?: number | undefined
            allowDataExport?: boolean | undefined
            piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
            integrationMetadata?: Record<string, unknown> | undefined
            customConfig?: Record<string, unknown> | undefined
          }
        >,
        'many'
      >
    },
    'strip',
    z.ZodTypeAny,
    {
      agents: {
        name: string
        workspaceId: string
        createdBy: string
        compositionMode: 'strict' | 'fluid'
        modelProvider: string
        modelName: string
        temperature: number
        maxTokens: number
        responseTimeoutMs: number
        maxContextLength: number
        allowInterruption: boolean
        allowProactiveMessages: boolean
        conversationStyle: 'professional' | 'technical' | 'friendly' | 'casual'
        dataRetentionDays: number
        allowDataExport: boolean
        piiHandlingMode: 'strict' | 'standard' | 'relaxed'
        integrationMetadata: Record<string, unknown>
        customConfig: Record<string, unknown>
        description?: string | undefined
        systemPrompt?: string | undefined
        systemInstructions?: string | undefined
      }[]
    },
    {
      agents: {
        name: string
        workspaceId: string
        createdBy: string
        description?: string | undefined
        compositionMode?: 'strict' | 'fluid' | undefined
        systemPrompt?: string | undefined
        modelProvider?: string | undefined
        modelName?: string | undefined
        temperature?: number | undefined
        maxTokens?: number | undefined
        responseTimeoutMs?: number | undefined
        maxContextLength?: number | undefined
        systemInstructions?: string | undefined
        allowInterruption?: boolean | undefined
        allowProactiveMessages?: boolean | undefined
        conversationStyle?: 'professional' | 'technical' | 'friendly' | 'casual' | undefined
        dataRetentionDays?: number | undefined
        allowDataExport?: boolean | undefined
        piiHandlingMode?: 'strict' | 'standard' | 'relaxed' | undefined
        integrationMetadata?: Record<string, unknown> | undefined
        customConfig?: Record<string, unknown> | undefined
      }[]
    }
  >
  bulkCreateSession: z.ZodObject<
    {
      sessions: z.ZodArray<
        z.ZodObject<
          {
            agentId: z.ZodString
            workspaceId: z.ZodString
            userId: z.ZodOptional<z.ZodString>
            customerId: z.ZodOptional<z.ZodString>
            mode: z.ZodDefault<z.ZodEnum<['auto', 'manual', 'paused']>>
            title: z.ZodOptional<z.ZodString>
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
            variables: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>
            userAgent: z.ZodOptional<z.ZodString>
            ipAddress: z.ZodOptional<z.ZodString>
            referrer: z.ZodOptional<z.ZodString>
            locale: z.ZodDefault<z.ZodString>
            timezone: z.ZodDefault<z.ZodString>
          },
          'strip',
          z.ZodTypeAny,
          {
            metadata: Record<string, unknown>
            agentId: string
            workspaceId: string
            variables: Record<string, unknown>
            mode: 'manual' | 'auto' | 'paused'
            locale: string
            timezone: string
            userId?: string | undefined
            title?: string | undefined
            customerId?: string | undefined
            userAgent?: string | undefined
            ipAddress?: string | undefined
            referrer?: string | undefined
          },
          {
            agentId: string
            workspaceId: string
            metadata?: Record<string, unknown> | undefined
            userId?: string | undefined
            variables?: Record<string, unknown> | undefined
            title?: string | undefined
            mode?: 'manual' | 'auto' | 'paused' | undefined
            customerId?: string | undefined
            userAgent?: string | undefined
            ipAddress?: string | undefined
            referrer?: string | undefined
            locale?: string | undefined
            timezone?: string | undefined
          }
        >,
        'many'
      >
    },
    'strip',
    z.ZodTypeAny,
    {
      sessions: {
        metadata: Record<string, unknown>
        agentId: string
        workspaceId: string
        variables: Record<string, unknown>
        mode: 'manual' | 'auto' | 'paused'
        locale: string
        timezone: string
        userId?: string | undefined
        title?: string | undefined
        customerId?: string | undefined
        userAgent?: string | undefined
        ipAddress?: string | undefined
        referrer?: string | undefined
      }[]
    },
    {
      sessions: {
        agentId: string
        workspaceId: string
        metadata?: Record<string, unknown> | undefined
        userId?: string | undefined
        variables?: Record<string, unknown> | undefined
        title?: string | undefined
        mode?: 'manual' | 'auto' | 'paused' | undefined
        customerId?: string | undefined
        userAgent?: string | undefined
        ipAddress?: string | undefined
        referrer?: string | undefined
        locale?: string | undefined
        timezone?: string | undefined
      }[]
    }
  >
  apiResponse: <T extends z.ZodTypeAny>(
    dataSchema: T
  ) => z.ZodObject<
    {
      success: z.ZodBoolean
      data: z.ZodOptional<T>
      error: z.ZodOptional<
        z.ZodObject<
          {
            code: z.ZodString
            message: z.ZodString
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
            field: z.ZodOptional<z.ZodString>
          },
          'strip',
          z.ZodTypeAny,
          {
            message: string
            code: string
            details?: Record<string, unknown> | undefined
            field?: string | undefined
          },
          {
            message: string
            code: string
            details?: Record<string, unknown> | undefined
            field?: string | undefined
          }
        >
      >
      timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>
    },
    'strip',
    z.ZodTypeAny,
    z.objectUtil.addQuestionMarks<
      z.baseObjectOutputType<{
        success: z.ZodBoolean
        data: z.ZodOptional<T>
        error: z.ZodOptional<
          z.ZodObject<
            {
              code: z.ZodString
              message: z.ZodString
              details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
              field: z.ZodOptional<z.ZodString>
            },
            'strip',
            z.ZodTypeAny,
            {
              message: string
              code: string
              details?: Record<string, unknown> | undefined
              field?: string | undefined
            },
            {
              message: string
              code: string
              details?: Record<string, unknown> | undefined
              field?: string | undefined
            }
          >
        >
        timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>
      }>,
      any
    > extends infer T_1
      ? { [k in keyof T_1]: T_1[k] }
      : never,
    z.baseObjectInputType<{
      success: z.ZodBoolean
      data: z.ZodOptional<T>
      error: z.ZodOptional<
        z.ZodObject<
          {
            code: z.ZodString
            message: z.ZodString
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
            field: z.ZodOptional<z.ZodString>
          },
          'strip',
          z.ZodTypeAny,
          {
            message: string
            code: string
            details?: Record<string, unknown> | undefined
            field?: string | undefined
          },
          {
            message: string
            code: string
            details?: Record<string, unknown> | undefined
            field?: string | undefined
          }
        >
      >
      timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>
    }> extends infer T_2
      ? { [k_1 in keyof T_2]: T_2[k_1] }
      : never
  >
  paginatedResponse: <T extends z.ZodTypeAny>(
    dataSchema: T
  ) => z.ZodObject<
    {
      data: z.ZodArray<T, 'many'>
      pagination: z.ZodObject<
        {
          page: z.ZodNumber
          pageSize: z.ZodNumber
          total: z.ZodNumber
          totalPages: z.ZodNumber
          hasNext: z.ZodBoolean
          hasPrevious: z.ZodBoolean
        },
        'strip',
        z.ZodTypeAny,
        {
          total: number
          page: number
          pageSize: number
          totalPages: number
          hasNext: boolean
          hasPrevious: boolean
        },
        {
          total: number
          page: number
          pageSize: number
          totalPages: number
          hasNext: boolean
          hasPrevious: boolean
        }
      >
    },
    'strip',
    z.ZodTypeAny,
    {
      data: T['_output'][]
      pagination: {
        total: number
        page: number
        pageSize: number
        totalPages: number
        hasNext: boolean
        hasPrevious: boolean
      }
    },
    {
      data: T['_input'][]
      pagination: {
        total: number
        page: number
        pageSize: number
        totalPages: number
        hasNext: boolean
        hasPrevious: boolean
      }
    }
  >
}
/**
 * Type definitions derived from schemas
 */
export type ValidatedCreateAgent = z.infer<typeof createAgentSchema>
export type ValidatedCreateSession = z.infer<typeof createSessionSchema>
export type ValidatedCreateEvent = z.infer<typeof createEventSchema>
export type ValidatedAgentFilters = z.infer<typeof agentFilterSchema>
export type ValidatedSessionFilters = z.infer<typeof sessionFilterSchema>
export type ValidatedPagination = z.infer<typeof paginationSchema>
