import { db } from '@sim/db'
import { member } from '@sim/db/schema'
import { and, eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import { getUserCanAccessAgent } from './agents'

const logger = createLogger('ParlantConversations')

/**
 * Conversation access control and management utilities
 */

export interface Conversation {
  id: string
  agent_id: string
  user_id: string
  workspace_id: string
  title?: string
  created_at: Date
  updated_at: Date
  message_count: number
  is_archived: boolean
  metadata?: any
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: Date
  metadata?: any
}

/**
 * Get conversation by ID with access validation
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  try {
    // TODO: Replace with actual Parlant conversation query
    // This is a placeholder that would integrate with the Parlant server

    // For now, simulate conversation data structure
    const mockConversation: Conversation = {
      id: conversationId,
      agent_id: 'mock-agent',
      user_id: 'mock-user',
      workspace_id: 'mock-workspace',
      title: 'Sample Conversation',
      created_at: new Date(),
      updated_at: new Date(),
      message_count: 0,
      is_archived: false,
      metadata: {},
    }

    logger.info('Fetched conversation', {
      conversationId,
      agentId: mockConversation.agent_id,
      workspaceId: mockConversation.workspace_id,
    })

    return mockConversation
  } catch (error) {
    logger.error('Failed to fetch conversation', { error, conversationId })
    return null
  }
}

/**
 * Check if user can access a specific conversation
 */
export async function getUserCanAccessConversation(
  userId: string,
  conversationId: string
): Promise<boolean> {
  try {
    // Get the conversation first
    const conversation = await getConversationById(conversationId)
    if (!conversation) {
      return false
    }

    // Check if user owns the conversation
    if (conversation.user_id === userId) {
      return true
    }

    // Check if user has access to the agent and workspace
    const canAccessAgent = await getUserCanAccessAgent(userId, conversation.agent_id)
    if (!canAccessAgent) {
      return false
    }

    // Additional workspace-level permission check
    const membership = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, conversation.workspace_id)))
      .limit(1)

    const hasAccess = membership.length > 0

    logger.info('Conversation access check', {
      userId,
      conversationId,
      isOwner: conversation.user_id === userId,
      hasWorkspaceAccess: hasAccess,
      finalAccess: hasAccess,
    })

    return hasAccess
  } catch (error) {
    logger.error('Conversation access check failed', { error, userId, conversationId })
    return false
  }
}

/**
 * Get all conversations accessible to a user in a workspace
 */
export async function getUserConversations(
  userId: string,
  workspaceId: string,
  options: {
    agentId?: string
    page?: number
    limit?: number
    includeArchived?: boolean
  } = {}
): Promise<{ conversations: Conversation[]; total: number }> {
  try {
    const { agentId, page = 1, limit = 20, includeArchived = false } = options

    // Verify user has access to the workspace
    const membership = await db
      .select()
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, workspaceId)))
      .limit(1)

    if (membership.length === 0) {
      logger.warn('User does not have access to workspace for conversations', {
        userId,
        workspaceId,
      })
      return { conversations: [], total: 0 }
    }

    // TODO: Replace with actual Parlant conversation query
    // This would fetch conversations from the Parlant server
    const conversations: Conversation[] = []

    logger.info('Fetched user conversations', {
      userId,
      workspaceId,
      agentFilter: agentId,
      page,
      limit,
      conversationCount: conversations.length,
    })

    return { conversations, total: conversations.length }
  } catch (error) {
    logger.error('Failed to fetch user conversations', { error, userId, workspaceId, options })
    return { conversations: [], total: 0 }
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  agentId: string,
  workspaceId: string,
  initialMessage?: string
): Promise<Conversation | null> {
  try {
    // Verify user has access to the agent
    const canAccessAgent = await getUserCanAccessAgent(userId, agentId)
    if (!canAccessAgent) {
      logger.warn('User cannot create conversation - no agent access', {
        userId,
        agentId,
        workspaceId,
      })
      return null
    }

    // TODO: Replace with actual Parlant conversation creation
    // This would create the conversation via Parlant server API

    const newConversation: Conversation = {
      id: `conv_${Date.now()}`,
      agent_id: agentId,
      user_id: userId,
      workspace_id: workspaceId,
      title:
        initialMessage?.substring(0, 50) +
          (initialMessage && initialMessage.length > 50 ? '...' : '') || 'New Conversation',
      created_at: new Date(),
      updated_at: new Date(),
      message_count: initialMessage ? 1 : 0,
      is_archived: false,
      metadata: {},
    }

    logger.info('Created new conversation', {
      conversationId: newConversation.id,
      agentId,
      userId,
      workspaceId,
      hasInitialMessage: !!initialMessage,
    })

    return newConversation
  } catch (error) {
    logger.error('Failed to create conversation', {
      error,
      userId,
      agentId,
      workspaceId,
      initialMessage: initialMessage?.substring(0, 100),
    })
    return null
  }
}

/**
 * Update conversation (e.g., title, archive status)
 */
export async function updateConversation(
  userId: string,
  conversationId: string,
  updates: Partial<Pick<Conversation, 'title' | 'is_archived' | 'metadata'>>
): Promise<Conversation | null> {
  try {
    // Verify user can access this conversation
    const canAccess = await getUserCanAccessConversation(userId, conversationId)
    if (!canAccess) {
      logger.warn('User cannot update conversation - no access', { userId, conversationId })
      return null
    }

    const conversation = await getConversationById(conversationId)
    if (!conversation) {
      return null
    }

    // TODO: Replace with actual Parlant conversation update
    const updatedConversation: Conversation = {
      ...conversation,
      ...updates,
      updated_at: new Date(),
    }

    logger.info('Updated conversation', {
      conversationId,
      updatedBy: userId,
      updates: Object.keys(updates),
    })

    return updatedConversation
  } catch (error) {
    logger.error('Failed to update conversation', { error, userId, conversationId, updates })
    return null
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(userId: string, conversationId: string): Promise<boolean> {
  try {
    const conversation = await getConversationById(conversationId)
    if (!conversation) {
      return false
    }

    // Only conversation owner or workspace admin can delete
    const canAccess = await getUserCanAccessConversation(userId, conversationId)
    if (!canAccess) {
      return false
    }

    // Additional check - only owner or admin can delete
    if (conversation.user_id !== userId) {
      const membership = await db
        .select()
        .from(member)
        .where(and(eq(member.userId, userId), eq(member.organizationId, conversation.workspace_id)))
        .limit(1)

      const userRole = membership[0]?.role
      if (!['admin', 'owner'].includes(userRole)) {
        logger.warn('User cannot delete conversation - insufficient permissions', {
          userId,
          conversationId,
          userRole,
          conversationOwner: conversation.user_id,
        })
        return false
      }
    }

    // TODO: Replace with actual Parlant conversation deletion
    // This would delete the conversation via Parlant server API

    logger.info('Deleted conversation', {
      conversationId,
      deletedBy: userId,
      workspaceId: conversation.workspace_id,
    })

    return true
  } catch (error) {
    logger.error('Failed to delete conversation', { error, userId, conversationId })
    return false
  }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  userId: string,
  conversationId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ messages: Message[]; total: number }> {
  try {
    const { page = 1, limit = 50 } = options

    // Verify user can access this conversation
    const canAccess = await getUserCanAccessConversation(userId, conversationId)
    if (!canAccess) {
      logger.warn('User cannot access conversation messages - no access', {
        userId,
        conversationId,
      })
      return { messages: [], total: 0 }
    }

    // TODO: Replace with actual Parlant message query
    // This would fetch messages from the Parlant server
    const messages: Message[] = []

    logger.info('Fetched conversation messages', {
      conversationId,
      userId,
      page,
      limit,
      messageCount: messages.length,
    })

    return { messages, total: messages.length }
  } catch (error) {
    logger.error('Failed to fetch conversation messages', {
      error,
      userId,
      conversationId,
      options,
    })
    return { messages: [], total: 0 }
  }
}
