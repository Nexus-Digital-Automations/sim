/**
 * Nexus Copilot Server Tool: Knowledge Base Management
 * Server-side implementation for knowledge base management operations
 * Direct database access with comprehensive error handling and logging
 */

import { tool } from 'ai'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { document, embedding, knowledgeBase } from '@/db/schema'

const logger = createLogger('NexusKnowledgeManagementServer')

/**
 * Enhanced management parameters with server-side capabilities
 */
const serverManageKnowledgeSchema = z.object({
  action: z
    .enum([
      'create',
      'update',
      'delete',
      'list',
      'getDetails',
      'getStats',
      'listDocuments',
      'enableDisable',
      'cleanup',
    ])
    .describe('Management action to perform'),

  workspaceId: z
    .string()
    .optional()
    .describe('Workspace ID for organization (optional for personal)'),

  // Knowledge base fields
  knowledgeBaseId: z.string().optional().describe('Knowledge base ID for specific operations'),
  name: z.string().optional().describe('Knowledge base name'),
  description: z.string().optional().describe('Knowledge base description'),

  // Configuration fields
  embeddingModel: z
    .literal('text-embedding-3-small')
    .default('text-embedding-3-small')
    .describe('Embedding model'),
  embeddingDimension: z.literal(1536).default(1536).describe('Vector dimensions'),
  chunkingConfig: z
    .object({
      maxSize: z.number().min(100).max(4000).default(1024),
      minSize: z.number().min(1).max(2000).default(1),
      overlap: z.number().min(0).max(500).default(200),
    })
    .optional()
    .describe('Chunking configuration'),

  // Operation parameters
  enabled: z.boolean().optional().describe('Enable/disable state for enableDisable action'),
  includeDeleted: z.boolean().default(false).describe('Include soft-deleted items in results'),
  includeStats: z.boolean().default(false).describe('Include detailed statistics'),
})

/**
 * Creates a new knowledge base with comprehensive validation
 */
async function createKnowledgeBase(params: {
  userId: string
  name: string
  description?: string
  workspaceId?: string
  embeddingModel: string
  embeddingDimension: number
  chunkingConfig?: any
}): Promise<any> {
  const kbId = nanoid()

  const newKb = await db
    .insert(knowledgeBase)
    .values({
      id: kbId,
      userId: params.userId,
      workspaceId: params.workspaceId || null,
      name: params.name,
      description: params.description || '',
      embeddingModel: params.embeddingModel,
      embeddingDimension: params.embeddingDimension,
      chunkingConfig: params.chunkingConfig || {
        maxSize: 1024,
        minSize: 1,
        overlap: 200,
      },
      tokenCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return newKb[0]
}

/**
 * Gets detailed knowledge base statistics
 */
async function getKnowledgeBaseStats(kbId: string): Promise<any> {
  try {
    // Get basic knowledge base info
    const kb = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, kbId)).limit(1)

    if (kb.length === 0) {
      throw new Error('Knowledge base not found')
    }

    // Get document statistics
    const docStats = await db
      .select({
        totalDocuments: count(),
        enabledDocuments: sql<number>`COUNT(CASE WHEN ${document.enabled} = true THEN 1 END)`.as(
          'enabled_documents'
        ),
        processingDocuments:
          sql<number>`COUNT(CASE WHEN ${document.processingStatus} = 'processing' THEN 1 END)`.as(
            'processing_documents'
          ),
        failedDocuments:
          sql<number>`COUNT(CASE WHEN ${document.processingStatus} = 'failed' THEN 1 END)`.as(
            'failed_documents'
          ),
        totalFileSize: sql<number>`COALESCE(SUM(${document.fileSize}), 0)`.as('total_file_size'),
        totalTokens: sql<number>`COALESCE(SUM(${document.tokenCount}), 0)`.as('total_tokens'),
        totalChunks: sql<number>`COALESCE(SUM(${document.chunkCount}), 0)`.as('total_chunks'),
      })
      .from(document)
      .where(and(eq(document.knowledgeBaseId, kbId), sql`${document.deletedAt} IS NULL`))

    // Get embedding statistics
    const embeddingStats = await db
      .select({
        totalEmbeddings: count(),
        enabledEmbeddings: sql<number>`COUNT(CASE WHEN ${embedding.enabled} = true THEN 1 END)`.as(
          'enabled_embeddings'
        ),
        avgContentLength: sql<number>`COALESCE(AVG(${embedding.contentLength}), 0)`.as(
          'avg_content_length'
        ),
        totalEmbeddingTokens: sql<number>`COALESCE(SUM(${embedding.tokenCount}), 0)`.as(
          'total_embedding_tokens'
        ),
      })
      .from(embedding)
      .where(eq(embedding.knowledgeBaseId, kbId))

    return {
      knowledgeBase: kb[0],
      documents: docStats[0] || {
        totalDocuments: 0,
        enabledDocuments: 0,
        processingDocuments: 0,
        failedDocuments: 0,
        totalFileSize: 0,
        totalTokens: 0,
        totalChunks: 0,
      },
      embeddings: embeddingStats[0] || {
        totalEmbeddings: 0,
        enabledEmbeddings: 0,
        avgContentLength: 0,
        totalEmbeddingTokens: 0,
      },
    }
  } catch (error) {
    logger.error('Failed to get knowledge base statistics', {
      knowledgeBaseId: kbId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Lists knowledge bases with optional statistics
 */
async function listKnowledgeBases(params: {
  userId: string
  workspaceId?: string
  includeDeleted: boolean
  includeStats: boolean
}): Promise<any[]> {
  const whereConditions = [eq(knowledgeBase.userId, params.userId)]

  if (params.workspaceId) {
    whereConditions.push(eq(knowledgeBase.workspaceId, params.workspaceId))
  }

  if (!params.includeDeleted) {
    whereConditions.push(sql`${knowledgeBase.deletedAt} IS NULL`)
  }

  const kbs = await db
    .select()
    .from(knowledgeBase)
    .where(and(...whereConditions))
    .orderBy(desc(knowledgeBase.updatedAt))

  if (!params.includeStats) {
    return kbs
  }

  // Enrich with statistics if requested
  const enrichedKbs = await Promise.all(
    kbs.map(async (kb) => {
      try {
        const stats = await getKnowledgeBaseStats(kb.id)
        return {
          ...kb,
          statistics: stats,
        }
      } catch (error) {
        logger.warn(`Failed to get stats for knowledge base ${kb.id}`, { error })
        return kb
      }
    })
  )

  return enrichedKbs
}

/**
 * Updates knowledge base properties
 */
async function updateKnowledgeBase(params: {
  knowledgeBaseId: string
  userId: string
  name?: string
  description?: string
  chunkingConfig?: any
}): Promise<any> {
  const updateData: any = {
    updatedAt: new Date(),
  }

  if (params.name) updateData.name = params.name
  if (params.description !== undefined) updateData.description = params.description
  if (params.chunkingConfig) updateData.chunkingConfig = params.chunkingConfig

  const updated = await db
    .update(knowledgeBase)
    .set(updateData)
    .where(
      and(
        eq(knowledgeBase.id, params.knowledgeBaseId),
        eq(knowledgeBase.userId, params.userId),
        sql`${knowledgeBase.deletedAt} IS NULL`
      )
    )
    .returning()

  if (updated.length === 0) {
    throw new Error('Knowledge base not found or access denied')
  }

  return updated[0]
}

/**
 * Soft deletes a knowledge base
 */
async function deleteKnowledgeBase(params: {
  knowledgeBaseId: string
  userId: string
}): Promise<boolean> {
  const deleted = await db
    .update(knowledgeBase)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(knowledgeBase.id, params.knowledgeBaseId),
        eq(knowledgeBase.userId, params.userId),
        sql`${knowledgeBase.deletedAt} IS NULL`
      )
    )
    .returning()

  return deleted.length > 0
}

/**
 * Lists documents in a knowledge base
 */
async function listDocumentsInKnowledgeBase(params: {
  knowledgeBaseId: string
  userId: string
  includeDeleted: boolean
  includeStats: boolean
}): Promise<any[]> {
  // First verify access to knowledge base
  const kb = await db
    .select()
    .from(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.id, params.knowledgeBaseId),
        eq(knowledgeBase.userId, params.userId),
        params.includeDeleted ? sql`true` : sql`${knowledgeBase.deletedAt} IS NULL`
      )
    )
    .limit(1)

  if (kb.length === 0) {
    throw new Error('Knowledge base not found or access denied')
  }

  const whereConditions = [eq(document.knowledgeBaseId, params.knowledgeBaseId)]
  if (!params.includeDeleted) {
    whereConditions.push(sql`${document.deletedAt} IS NULL`)
  }

  const docs = await db
    .select()
    .from(document)
    .where(and(...whereConditions))
    .orderBy(desc(document.uploadedAt))

  return docs
}

/**
 * Server-side Knowledge Base Management Tool
 */
export const manageKnowledgeServerTool = tool({
  description:
    'Comprehensive knowledge base management with direct database access. Supports creation, updates, statistics, and advanced operations.',
  parameters: serverManageKnowledgeSchema,
  execute: async (args) => {
    const operationId = `server-knowledge-mgmt-${Date.now()}`

    try {
      const session = await getSession()
      if (!session?.user) {
        throw new Error('Authentication required for knowledge base management')
      }

      logger.info(`[${operationId}] Server knowledge management: ${args.action}`, {
        userId: session.user.id,
        workspaceId: args.workspaceId,
        knowledgeBaseId: args.knowledgeBaseId,
      })

      switch (args.action) {
        case 'create': {
          if (!args.name) {
            throw new Error('Name is required for knowledge base creation')
          }

          const newKb = await createKnowledgeBase({
            userId: session.user.id,
            name: args.name,
            description: args.description,
            workspaceId: args.workspaceId,
            embeddingModel: args.embeddingModel,
            embeddingDimension: args.embeddingDimension,
            chunkingConfig: args.chunkingConfig,
          })

          logger.info(`[${operationId}] Knowledge base created`, {
            id: newKb.id,
            name: newKb.name,
            userId: session.user.id,
          })

          return {
            status: 'success',
            action: 'create',
            knowledgeBase: newKb,
            operationId,
            message: `Knowledge base "${newKb.name}" created successfully`,
          }
        }

        case 'list': {
          const kbs = await listKnowledgeBases({
            userId: session.user.id,
            workspaceId: args.workspaceId,
            includeDeleted: args.includeDeleted,
            includeStats: args.includeStats,
          })

          logger.info(`[${operationId}] Knowledge bases listed`, {
            count: kbs.length,
            userId: session.user.id,
          })

          return {
            status: 'success',
            action: 'list',
            knowledgeBases: kbs,
            count: kbs.length,
            operationId,
            message: `Found ${kbs.length} knowledge base(s)`,
          }
        }

        case 'getDetails': {
          if (!args.knowledgeBaseId) {
            throw new Error('Knowledge base ID is required for getDetails')
          }

          const stats = await getKnowledgeBaseStats(args.knowledgeBaseId)

          // Verify user has access
          if (stats.knowledgeBase.userId !== session.user.id) {
            throw new Error('Access denied to knowledge base')
          }

          logger.info(`[${operationId}] Knowledge base details retrieved`, {
            knowledgeBaseId: args.knowledgeBaseId,
            userId: session.user.id,
          })

          return {
            status: 'success',
            action: 'getDetails',
            knowledgeBase: stats.knowledgeBase,
            statistics: {
              documents: stats.documents,
              embeddings: stats.embeddings,
            },
            operationId,
            message: `Retrieved details for "${stats.knowledgeBase.name}"`,
          }
        }

        case 'getStats': {
          if (!args.knowledgeBaseId) {
            throw new Error('Knowledge base ID is required for getStats')
          }

          const stats = await getKnowledgeBaseStats(args.knowledgeBaseId)

          if (stats.knowledgeBase.userId !== session.user.id) {
            throw new Error('Access denied to knowledge base')
          }

          return {
            status: 'success',
            action: 'getStats',
            statistics: stats,
            operationId,
            message: 'Statistics retrieved successfully',
          }
        }

        case 'listDocuments': {
          if (!args.knowledgeBaseId) {
            throw new Error('Knowledge base ID is required for listDocuments')
          }

          const docs = await listDocumentsInKnowledgeBase({
            knowledgeBaseId: args.knowledgeBaseId,
            userId: session.user.id,
            includeDeleted: args.includeDeleted,
            includeStats: args.includeStats,
          })

          logger.info(`[${operationId}] Documents listed`, {
            knowledgeBaseId: args.knowledgeBaseId,
            count: docs.length,
            userId: session.user.id,
          })

          return {
            status: 'success',
            action: 'listDocuments',
            documents: docs,
            count: docs.length,
            knowledgeBaseId: args.knowledgeBaseId,
            operationId,
            message: `Found ${docs.length} document(s)`,
          }
        }

        case 'update': {
          if (!args.knowledgeBaseId) {
            throw new Error('Knowledge base ID is required for update')
          }

          const updated = await updateKnowledgeBase({
            knowledgeBaseId: args.knowledgeBaseId,
            userId: session.user.id,
            name: args.name,
            description: args.description,
            chunkingConfig: args.chunkingConfig,
          })

          logger.info(`[${operationId}] Knowledge base updated`, {
            knowledgeBaseId: args.knowledgeBaseId,
            userId: session.user.id,
          })

          return {
            status: 'success',
            action: 'update',
            knowledgeBase: updated,
            operationId,
            message: `Knowledge base "${updated.name}" updated successfully`,
          }
        }

        case 'delete': {
          if (!args.knowledgeBaseId) {
            throw new Error('Knowledge base ID is required for delete')
          }

          const deleted = await deleteKnowledgeBase({
            knowledgeBaseId: args.knowledgeBaseId,
            userId: session.user.id,
          })

          if (!deleted) {
            throw new Error('Knowledge base not found or access denied')
          }

          logger.info(`[${operationId}] Knowledge base deleted`, {
            knowledgeBaseId: args.knowledgeBaseId,
            userId: session.user.id,
          })

          return {
            status: 'success',
            action: 'delete',
            knowledgeBaseId: args.knowledgeBaseId,
            operationId,
            message: 'Knowledge base deleted successfully',
          }
        }

        default:
          throw new Error(`Unsupported action: ${args.action}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error(`[${operationId}] Server knowledge management failed`, {
        action: args.action,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        userId: session?.user?.id,
      })

      throw new Error(`Knowledge management failed: ${errorMessage}`)
    }
  },
})
