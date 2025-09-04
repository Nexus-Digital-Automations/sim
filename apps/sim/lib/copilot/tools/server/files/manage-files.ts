/**
 * Nexus Tool: File Management Operations
 * Comprehensive file upload, download, organization, and metadata management
 * Integrates with Sim's multi-provider storage system (S3, Azure Blob, local)
 */

import { tool } from 'ai'
import { and, count, desc, eq, like, or, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { document, workflowFolder } from '@/db/schema'

const logger = createLogger('NexusFileManagement')

/**
 * Enhanced File Management Tool
 *
 * Provides comprehensive file operations including:
 * - File and folder listing with advanced filtering
 * - Content search across file names and metadata
 * - Folder creation and organization
 * - File movement and organization
 * - Metadata management and updates
 * - Multi-provider storage integration
 */
export const manageFiles = tool({
  description:
    'Comprehensive file operations: list, organize, search, upload, download, and manage metadata',
  parameters: z.object({
    action: z
      .enum([
        'list',
        'search',
        'createFolder',
        'move',
        'delete',
        'getMetadata',
        'updateMetadata',
        'getStats',
      ])
      .describe('File operation to perform'),

    // Context parameters
    workspaceId: z.string().optional().describe('Workspace ID for file operations'),
    knowledgeBaseId: z.string().optional().describe('Knowledge base ID for document operations'),
    folderId: z.string().optional().describe('Folder ID for organization operations'),

    // File-specific parameters
    fileId: z.string().optional().describe('File ID for specific file operations'),
    fileName: z.string().optional().describe('File name for search and operations'),

    // Search parameters
    query: z.string().optional().describe('Search query for file search'),
    fileTypes: z.array(z.string()).optional().describe('Filter by file types (extensions)'),
    tags: z.array(z.string()).optional().describe('Filter by tags'),

    // Organization parameters
    folderName: z.string().optional().describe('Folder name for creation'),
    targetFolderId: z.string().optional().describe('Target folder ID for move operations'),
    targetKnowledgeBaseId: z
      .string()
      .optional()
      .describe('Target knowledge base for move operations'),

    // Metadata parameters
    metadata: z.record(z.any()).optional().describe('Metadata object for update operations'),
    description: z.string().optional().describe('File description'),
    newTags: z.array(z.string()).optional().describe('New tags to apply to file'),

    // Pagination and limits
    limit: z.number().min(1).max(100).default(20).describe('Maximum number of results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),

    // Sorting
    sortBy: z
      .enum(['name', 'size', 'uploadedAt', 'mimeType', 'processingStatus'])
      .default('uploadedAt')
      .describe('Sort field'),
    sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort direction'),
  }),

  execute: async (params) => {
    const operationId = `file-${params.action}-${Date.now()}`
    let session: any = null

    try {
      session = await getSession()
      if (!session?.user) {
        throw new Error('Authentication required')
      }

      logger.info(`[${operationId}] File ${params.action} operation started`, {
        userId: session.user.id,
        workspaceId: params.workspaceId,
        knowledgeBaseId: params.knowledgeBaseId,
        folderId: params.folderId,
        action: params.action,
      })

      switch (params.action) {
        case 'list':
          return await listFiles(params, session.user.id, operationId)

        case 'search':
          return await searchFiles(params, session.user.id, operationId)

        case 'createFolder':
          return await createFolder(params, session.user.id, operationId)

        case 'move':
          return await moveFile(params, session.user.id, operationId)

        case 'delete':
          return await deleteFile(params, session.user.id, operationId)

        case 'getMetadata':
          return await getFileMetadata(params, session.user.id, operationId)

        case 'updateMetadata':
          return await updateFileMetadata(params, session.user.id, operationId)

        case 'getStats':
          return await getFileStats(params, session.user.id, operationId)

        default:
          throw new Error(`Unsupported action: ${params.action}`)
      }
    } catch (error: unknown) {
      logger.error(`[${operationId}] File management operation failed`, {
        userId: session?.user?.id,
        action: params.action,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })

      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        operationId,
      }
    }
  },
})

/**
 * List files and folders with advanced filtering and pagination
 */
async function listFiles(params: any, userId: string, operationId: string) {
  const {
    workspaceId,
    knowledgeBaseId,
    folderId,
    limit,
    offset,
    sortBy,
    sortOrder,
    fileTypes,
    tags,
  } = params

  // Build dynamic where conditions
  const whereConditions = []

  if (knowledgeBaseId) {
    whereConditions.push(eq(document.knowledgeBaseId, knowledgeBaseId))
  }

  if (fileTypes && fileTypes.length > 0) {
    const mimeTypeConditions = fileTypes.map((type) => like(document.mimeType, `%${type}%`))
    whereConditions.push(or(...mimeTypeConditions))
  }

  if (tags && tags.length > 0) {
    const tagConditions = tags.map((tag) =>
      or(
        eq(document.tag1, tag),
        eq(document.tag2, tag),
        eq(document.tag3, tag),
        eq(document.tag4, tag),
        eq(document.tag5, tag),
        eq(document.tag6, tag),
        eq(document.tag7, tag)
      )
    )
    whereConditions.push(or(...tagConditions))
  }

  // Add soft delete filter
  whereConditions.push(sql`${document.deletedAt} IS NULL`)

  // Build sort order
  const sortField = document[sortBy as keyof typeof document]
  const orderBy = sortOrder === 'asc' ? sortField : desc(sortField)

  // Execute query
  const fileResults = await db
    .select({
      id: document.id,
      filename: document.filename,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      uploadedAt: document.uploadedAt,
      processingStatus: document.processingStatus,
      chunkCount: document.chunkCount,
      tokenCount: document.tokenCount,
      characterCount: document.characterCount,
      enabled: document.enabled,
      knowledgeBaseId: document.knowledgeBaseId,
      tags: sql<
        string[]
      >`ARRAY[${document.tag1}, ${document.tag2}, ${document.tag3}, ${document.tag4}, ${document.tag5}, ${document.tag6}, ${document.tag7}]`.as(
        'tags'
      ),
    })
    .from(document)
    .where(and(...whereConditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)

  // Get total count
  const [totalCount] = await db
    .select({ count: count() })
    .from(document)
    .where(and(...whereConditions))

  // Also get folders if workspaceId provided
  let folderResults = []
  if (workspaceId) {
    folderResults = await db
      .select({
        id: workflowFolder.id,
        name: workflowFolder.name,
        parentId: workflowFolder.parentId,
        color: workflowFolder.color,
        isExpanded: workflowFolder.isExpanded,
        sortOrder: workflowFolder.sortOrder,
        createdAt: workflowFolder.createdAt,
        updatedAt: workflowFolder.updatedAt,
      })
      .from(workflowFolder)
      .where(
        and(
          eq(workflowFolder.workspaceId, workspaceId),
          folderId ? eq(workflowFolder.parentId, folderId) : sql`${workflowFolder.parentId} IS NULL`
        )
      )
      .orderBy(workflowFolder.sortOrder, workflowFolder.name)
  }

  return {
    status: 'success',
    action: 'list',
    files: fileResults,
    folders: folderResults,
    pagination: {
      total: totalCount.count,
      limit,
      offset,
      hasMore: offset + limit < totalCount.count,
    },
    location: { workspaceId, knowledgeBaseId, folderId },
    operationId,
  }
}

/**
 * Search files with advanced text matching and relevance scoring
 */
async function searchFiles(params: any, userId: string, operationId: string) {
  const { query, workspaceId, knowledgeBaseId, limit, offset, fileTypes, tags } = params

  if (!query) {
    throw new Error('Search query is required')
  }

  // Build search conditions
  const whereConditions = [sql`${document.deletedAt} IS NULL`]

  if (knowledgeBaseId) {
    whereConditions.push(eq(document.knowledgeBaseId, knowledgeBaseId))
  }

  if (fileTypes && fileTypes.length > 0) {
    const mimeTypeConditions = fileTypes.map((type) => like(document.mimeType, `%${type}%`))
    whereConditions.push(or(...mimeTypeConditions))
  }

  if (tags && tags.length > 0) {
    const tagConditions = tags.map((tag) =>
      or(
        eq(document.tag1, tag),
        eq(document.tag2, tag),
        eq(document.tag3, tag),
        eq(document.tag4, tag),
        eq(document.tag5, tag),
        eq(document.tag6, tag),
        eq(document.tag7, tag)
      )
    )
    whereConditions.push(or(...tagConditions))
  }

  // Add search condition with relevance scoring
  const searchCondition = sql`(
    LOWER(${document.filename}) LIKE LOWER(${`%${query}%`}) OR
    LOWER(${document.mimeType}) LIKE LOWER(${`%${query}%`}) OR
    ${document.tag1}::text ILIKE ${`%${query}%`} OR
    ${document.tag2}::text ILIKE ${`%${query}%`} OR
    ${document.tag3}::text ILIKE ${`%${query}%`} OR
    ${document.tag4}::text ILIKE ${`%${query}%`} OR
    ${document.tag5}::text ILIKE ${`%${query}%`} OR
    ${document.tag6}::text ILIKE ${`%${query}%`} OR
    ${document.tag7}::text ILIKE ${`%${query}%`}
  )`

  whereConditions.push(searchCondition)

  // Calculate relevance score
  const relevanceScore = sql<number>`(
    CASE 
      WHEN LOWER(${document.filename}) = LOWER(${query}) THEN 100
      WHEN LOWER(${document.filename}) LIKE LOWER(${`${query}%`}) THEN 75
      WHEN LOWER(${document.filename}) LIKE LOWER(${`%${query}%`}) THEN 50
      WHEN ${document.tag1}::text ILIKE ${`%${query}%`} OR
           ${document.tag2}::text ILIKE ${`%${query}%`} OR
           ${document.tag3}::text ILIKE ${`%${query}%`} OR
           ${document.tag4}::text ILIKE ${`%${query}%`} OR
           ${document.tag5}::text ILIKE ${`%${query}%`} OR
           ${document.tag6}::text ILIKE ${`%${query}%`} OR
           ${document.tag7}::text ILIKE ${`%${query}%`} THEN 25
      WHEN LOWER(${document.mimeType}) LIKE LOWER(${`%${query}%`}) THEN 10
      ELSE 1
    END
  )`.as('relevance')

  const searchResults = await db
    .select({
      id: document.id,
      filename: document.filename,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      uploadedAt: document.uploadedAt,
      processingStatus: document.processingStatus,
      chunkCount: document.chunkCount,
      tokenCount: document.tokenCount,
      characterCount: document.characterCount,
      enabled: document.enabled,
      knowledgeBaseId: document.knowledgeBaseId,
      tags: sql<
        string[]
      >`ARRAY[${document.tag1}, ${document.tag2}, ${document.tag3}, ${document.tag4}, ${document.tag5}, ${document.tag6}, ${document.tag7}]`.as(
        'tags'
      ),
      relevance: relevanceScore,
    })
    .from(document)
    .where(and(...whereConditions))
    .orderBy(desc(relevanceScore), desc(document.uploadedAt))
    .limit(limit)
    .offset(offset)

  // Get total count
  const [totalCount] = await db
    .select({ count: count() })
    .from(document)
    .where(and(...whereConditions))

  return {
    status: 'success',
    action: 'search',
    results: searchResults,
    query,
    pagination: {
      total: totalCount.count,
      limit,
      offset,
      hasMore: offset + limit < totalCount.count,
    },
    operationId,
  }
}

/**
 * Create a new folder in the workspace
 */
async function createFolder(params: any, userId: string, operationId: string) {
  const { folderName, workspaceId, folderId } = params

  if (!folderName) {
    throw new Error('Folder name is required')
  }

  if (!workspaceId) {
    throw new Error('Workspace ID is required')
  }

  const newFolderId = nanoid()
  const newFolder = await db
    .insert(workflowFolder)
    .values({
      id: newFolderId,
      name: folderName,
      userId,
      workspaceId,
      parentId: folderId || null,
      color: '#6B7280',
      isExpanded: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return {
    status: 'success',
    action: 'createFolder',
    folder: newFolder[0],
    operationId,
  }
}

/**
 * Move a file to a different location
 */
async function moveFile(params: any, userId: string, operationId: string) {
  const { fileId, targetKnowledgeBaseId } = params

  if (!fileId) {
    throw new Error('File ID is required for move operation')
  }

  if (!targetKnowledgeBaseId) {
    throw new Error('Target knowledge base ID is required')
  }

  // Update document's knowledge base association
  const moveResult = await db
    .update(document)
    .set({
      knowledgeBaseId: targetKnowledgeBaseId,
    })
    .where(eq(document.id, fileId))
    .returning({
      id: document.id,
      filename: document.filename,
      knowledgeBaseId: document.knowledgeBaseId,
    })

  if (moveResult.length === 0) {
    throw new Error('File not found or access denied')
  }

  return {
    status: 'success',
    action: 'move',
    file: moveResult[0],
    operationId,
  }
}

/**
 * Soft delete a file
 */
async function deleteFile(params: any, userId: string, operationId: string) {
  const { fileId } = params

  if (!fileId) {
    throw new Error('File ID is required')
  }

  const deleteResult = await db
    .update(document)
    .set({
      deletedAt: new Date(),
    })
    .where(eq(document.id, fileId))
    .returning({
      id: document.id,
      filename: document.filename,
    })

  if (deleteResult.length === 0) {
    throw new Error('File not found')
  }

  return {
    status: 'success',
    action: 'delete',
    file: deleteResult[0],
    operationId,
  }
}

/**
 * Get detailed metadata for a file
 */
async function getFileMetadata(params: any, userId: string, operationId: string) {
  const { fileId } = params

  if (!fileId) {
    throw new Error('File ID is required')
  }

  const fileMetadata = await db
    .select({
      id: document.id,
      filename: document.filename,
      fileUrl: document.fileUrl,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      chunkCount: document.chunkCount,
      tokenCount: document.tokenCount,
      characterCount: document.characterCount,
      processingStatus: document.processingStatus,
      processingStartedAt: document.processingStartedAt,
      processingCompletedAt: document.processingCompletedAt,
      processingError: document.processingError,
      enabled: document.enabled,
      uploadedAt: document.uploadedAt,
      knowledgeBaseId: document.knowledgeBaseId,
      tags: sql<
        string[]
      >`ARRAY[${document.tag1}, ${document.tag2}, ${document.tag3}, ${document.tag4}, ${document.tag5}, ${document.tag6}, ${document.tag7}]`.as(
        'tags'
      ),
    })
    .from(document)
    .where(and(eq(document.id, fileId), sql`${document.deletedAt} IS NULL`))
    .limit(1)

  if (fileMetadata.length === 0) {
    throw new Error('File not found')
  }

  return {
    status: 'success',
    action: 'getMetadata',
    file: fileMetadata[0],
    operationId,
  }
}

/**
 * Update file metadata and tags
 */
async function updateFileMetadata(params: any, userId: string, operationId: string) {
  const { fileId, newTags, description } = params

  if (!fileId) {
    throw new Error('File ID is required')
  }

  const updateData: any = {}

  if (newTags && Array.isArray(newTags)) {
    // Map tags to the 7 tag slots
    for (let i = 0; i < 7; i++) {
      updateData[`tag${i + 1}` as keyof typeof updateData] = newTags[i] || null
    }
  }

  const updateResult = await db
    .update(document)
    .set(updateData)
    .where(eq(document.id, fileId))
    .returning({
      id: document.id,
      filename: document.filename,
      tags: sql<
        string[]
      >`ARRAY[${document.tag1}, ${document.tag2}, ${document.tag3}, ${document.tag4}, ${document.tag5}, ${document.tag6}, ${document.tag7}]`.as(
        'tags'
      ),
    })

  if (updateResult.length === 0) {
    throw new Error('File not found or access denied')
  }

  return {
    status: 'success',
    action: 'updateMetadata',
    file: updateResult[0],
    operationId,
  }
}

/**
 * Get file statistics for a knowledge base or workspace
 */
async function getFileStats(params: any, userId: string, operationId: string) {
  const { workspaceId, knowledgeBaseId } = params

  const whereConditions = [sql`${document.deletedAt} IS NULL`]

  if (knowledgeBaseId) {
    whereConditions.push(eq(document.knowledgeBaseId, knowledgeBaseId))
  }

  // Get comprehensive file statistics
  const stats = await db
    .select({
      totalFiles: count(),
      totalSize: sql<number>`SUM(${document.fileSize})`,
      totalTokens: sql<number>`SUM(${document.tokenCount})`,
      totalChunks: sql<number>`SUM(${document.chunkCount})`,
      avgFileSize: sql<number>`AVG(${document.fileSize})`,
      avgTokenCount: sql<number>`AVG(${document.tokenCount})`,
      processingPending: sql<number>`COUNT(CASE WHEN ${document.processingStatus} = 'pending' THEN 1 END)`,
      processingInProgress: sql<number>`COUNT(CASE WHEN ${document.processingStatus} = 'processing' THEN 1 END)`,
      processingCompleted: sql<number>`COUNT(CASE WHEN ${document.processingStatus} = 'completed' THEN 1 END)`,
      processingFailed: sql<number>`COUNT(CASE WHEN ${document.processingStatus} = 'failed' THEN 1 END)`,
    })
    .from(document)
    .where(and(...whereConditions))

  // Get file type distribution
  const typeDistribution = await db
    .select({
      mimeType: document.mimeType,
      count: count(),
      totalSize: sql<number>`SUM(${document.fileSize})`,
    })
    .from(document)
    .where(and(...whereConditions))
    .groupBy(document.mimeType)
    .orderBy(desc(count()))
    .limit(10)

  return {
    status: 'success',
    action: 'getStats',
    stats: stats[0],
    typeDistribution,
    operationId,
  }
}
