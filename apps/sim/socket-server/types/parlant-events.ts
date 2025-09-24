/**
 * Parlant Socket.io Event Types
 *
 * Type definitions for real-time Parlant agent communication events
 * Supports agent lifecycle, session management, and message streaming
 */

/**
 * Agent status enumeration
 */
export enum ParlantAgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  MAINTENANCE = 'maintenance'
}

/**
 * Session status enumeration
 */
export enum ParlantSessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  ERROR = 'error'
}

/**
 * Message types enumeration
 */
export enum ParlantMessageType {
  USER_MESSAGE = 'user_message',
  AGENT_MESSAGE = 'agent_message',
  SYSTEM_MESSAGE = 'system_message',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result'
}

/**
 * Event types enumeration for Parlant real-time events
 */
export enum ParlantEventType {
  // Agent lifecycle events
  AGENT_CREATED = 'agent_created',
  AGENT_UPDATED = 'agent_updated',
  AGENT_DELETED = 'agent_deleted',
  AGENT_STATUS_UPDATE = 'agent_status_update',

  // Session lifecycle events
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  SESSION_STATUS_CHANGED = 'session_status_changed',

  // Message events
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_TYPING = 'message_typing',
  MESSAGE_ERROR = 'message_error',

  // Tool events
  TOOL_CALL_STARTED = 'tool_call_started',
  TOOL_CALL_COMPLETED = 'tool_call_completed',
  TOOL_CALL_FAILED = 'tool_call_failed',

  // Performance and analytics events
  AGENT_PERFORMANCE_UPDATE = 'agent_performance_update',
  SESSION_ANALYTICS_UPDATE = 'session_analytics_update'
}

/**
 * Base event interface
 */
export interface ParlantBaseEvent {
  type: ParlantEventType
  timestamp: number
  workspaceId: string
  metadata?: Record<string, any>
}

/**
 * Agent-related events
 */
export interface ParlantAgentEvent extends ParlantBaseEvent {
  agentId: string
  agentName?: string
  userId?: string // User who triggered the event
  data?: {
    name?: string
    description?: string
    status?: ParlantAgentStatus
    configuration?: Record<string, any>
    performance?: {
      totalSessions: number
      totalMessages: number
      averageResponseTime: number
      successRate: number
    }
  }
}

/**
 * Session-related events
 */
export interface ParlantSessionEvent extends ParlantBaseEvent {
  sessionId: string
  agentId: string
  userId?: string
  customerId?: string
  data?: {
    status?: ParlantSessionStatus
    title?: string
    messageCount?: number
    duration?: number
    endReason?: string
    variables?: Record<string, any>
    analytics?: {
      messagesExchanged: number
      toolCallsExecuted: number
      averageResponseTime: number
      userSatisfaction?: number
    }
  }
}

/**
 * Message-related events
 */
export interface ParlantMessageEvent extends ParlantBaseEvent {
  sessionId: string
  messageId: string
  messageType: ParlantMessageType
  content: string
  userId?: string
  data?: {
    isTyping?: boolean
    messageIndex?: number
    toolCallId?: string
    toolName?: string
    toolParameters?: Record<string, any>
    toolResult?: any
    error?: {
      code: string
      message: string
      details?: any
    }
    processingTime?: number
    tokens?: {
      prompt: number
      completion: number
      total: number
    }
  }
}

/**
 * Status and performance events
 */
export interface ParlantStatusEvent extends ParlantBaseEvent {
  agentId: string
  status: ParlantAgentStatus
  data?: {
    reason?: string
    expectedDuration?: number
    activeSessions?: number
    queuedMessages?: number
    resourceUsage?: {
      cpu: number
      memory: number
      tokens: number
    }
  }
}

/**
 * Union type for all Parlant events
 */
export type ParlantEvent =
  | ParlantAgentEvent
  | ParlantSessionEvent
  | ParlantMessageEvent
  | ParlantStatusEvent

/**
 * Client-to-server event payloads
 */
export interface JoinAgentRoomPayload {
  agentId: string
  workspaceId: string
}

export interface JoinSessionRoomPayload {
  sessionId: string
  agentId: string
  workspaceId: string
}

export interface LeaveAgentRoomPayload {
  agentId: string
}

export interface LeaveSessionRoomPayload {
  sessionId: string
}

export interface RequestAgentStatusPayload {
  agentId: string
  workspaceId: string
}

/**
 * Server-to-client event responses
 */
export interface JoinRoomSuccessResponse {
  agentId?: string
  sessionId?: string
  workspaceId: string
  roomId: string
  workspaceRoomId?: string
  timestamp: number
}

export interface JoinRoomErrorResponse {
  error: string
  agentId?: string
  sessionId?: string
  workspaceId?: string
}

export interface LeaveRoomSuccessResponse {
  agentId?: string
  sessionId?: string
  roomId: string
  timestamp: number
}

export interface LeaveRoomErrorResponse {
  error: string
  agentId?: string
  sessionId?: string
}

/**
 * Analytics and metrics interfaces
 */
export interface ParlantAgentMetrics {
  agentId: string
  workspaceId: string
  period: {
    start: number
    end: number
  }
  metrics: {
    totalSessions: number
    completedSessions: number
    averageSessionDuration: number
    totalMessages: number
    averageResponseTime: number
    successRate: number
    toolCallsExecuted: number
    errorRate: number
    userSatisfactionScore?: number
    costMetrics?: {
      totalTokens: number
      estimatedCost: number
    }
  }
}

export interface ParlantWorkspaceMetrics {
  workspaceId: string
  period: {
    start: number
    end: number
  }
  agents: ParlantAgentMetrics[]
  totals: {
    activeAgents: number
    totalSessions: number
    totalMessages: number
    averageResponseTime: number
    totalCost?: number
  }
}

/**
 * Real-time typing indicator
 */
export interface ParlantTypingIndicator {
  sessionId: string
  agentId?: string
  userId?: string
  isTyping: boolean
  timestamp: number
}

/**
 * Connection status for agents
 */
export interface ParlantConnectionStatus {
  agentId: string
  workspaceId: string
  status: ParlantAgentStatus
  activeConnections: number
  lastActivityAt: number
  version: string
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: {
      database: boolean
      memory: boolean
      responseTime: boolean
    }
  }
}

/**
 * Event acknowledgment for guaranteed delivery
 */
export interface ParlantEventAck {
  eventId: string
  timestamp: number
  status: 'received' | 'processed' | 'error'
  error?: {
    code: string
    message: string
  }
}

/**
 * Rate limiting information
 */
export interface ParlantRateLimitInfo {
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * Security context for events
 */
export interface ParlantSecurityContext {
  userId: string
  workspaceId: string
  permissions: string[]
  sessionId?: string
  ipAddress?: string
  userAgent?: string
}