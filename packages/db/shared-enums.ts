import { pgEnum } from 'drizzle-orm/pg-core'

/**
 * Shared Database Enums
 *
 * This file contains enum definitions that are shared across multiple schema files
 * to avoid circular dependencies between schema modules.
 */

// Chat message enums (moved from chat-persistence-schema.ts)
export const messageStatusEnum = pgEnum('message_status', [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
])

export const conversationTypeEnum = pgEnum('conversation_type', [
  'direct',
  'group',
  'workflow',
  'support',
  'onboarding',
])

export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'tool_call',
  'tool_result',
  'system',
  'error',
  'media',
  'file',
])

// Parlant agent enums (for potential future shared usage)
export const agentStatusEnum = pgEnum('agent_status', ['active', 'inactive', 'archived'])
export const sessionModeEnum = pgEnum('session_mode', ['auto', 'manual', 'paused'])
export const sessionStatusEnum = pgEnum('session_status', ['active', 'completed', 'abandoned'])
export const eventTypeEnum = pgEnum('event_type', [
  'customer_message',
  'agent_message',
  'tool_call',
  'tool_result',
  'status_update',
  'journey_transition',
  'variable_update',
])
export const journeyStateTypeEnum = pgEnum('journey_state_type', [
  'chat',
  'tool',
  'decision',
  'final',
])
export const compositionModeEnum = pgEnum('composition_mode', ['fluid', 'strict'])
