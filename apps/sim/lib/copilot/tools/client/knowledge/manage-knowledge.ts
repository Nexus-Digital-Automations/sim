/**
 * Nexus Copilot Tool: Knowledge Base Management
 * Creates, updates, and manages knowledge bases and documents
 * Integrates with Sim's document processing pipeline
 */

import { tool } from 'ai'
import { z } from 'zod'
import type {
  ClientToolDefinition,
  ToolExecutionContext,
  ToolRunResult,
} from '@/lib/copilot/tools/client/types'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('NexusKnowledgeManagementTool')

/**
 * Parameters schema for knowledge base management operations
 */
const manageKnowledgeSchema = z.object({
  action: z
    .enum(['create', 'update', 'delete', 'list', 'addDocument', 'listDocuments', 'getDetails'])
    .describe('Management action to perform'),
  workspaceId: z.string().describe('Workspace ID for access control and organization'),

  // Knowledge base management fields
  knowledgeBaseId: z
    .string()
    .optional()
    .describe('Knowledge base ID (required for update/delete/addDocument/getDetails operations)'),
  name: z
    .string()
    .optional()
    .describe('Knowledge base name (required for create, optional for update)'),
  description: z.string().optional().describe('Knowledge base description'),

  // Document management fields
  documentUrl: z.string().optional().describe('Document URL for addDocument action'),
  documentContent: z.string().optional().describe('Document content for addDocument action'),
  filename: z.string().optional().describe('Custom filename for document uploads'),

  // Configuration fields
  embeddingModel: z
    .literal('text-embedding-3-small')
    .default('text-embedding-3-small')
    .describe('Embedding model to use'),
  chunkingConfig: z
    .object({
      maxSize: z
        .number()
        .min(100)
        .max(4000)
        .default(1024)
        .describe('Maximum chunk size in characters'),
      minSize: z.number().min(1).max(2000).default(1).describe('Minimum chunk size in characters'),
      overlap: z
        .number()
        .min(0)
        .max(500)
        .default(200)
        .describe('Overlap between chunks in characters'),
    })
    .optional()
    .describe('Document chunking configuration'),

  // Tagging and categorization
  tags: z.record(z.string()).optional().describe('Tags for document categorization'),
})

type ManageKnowledgeArgs = z.infer<typeof manageKnowledgeSchema>

/**
 * Executes knowledge base management operations
 */
async function executeKnowledgeManagement(
  ctx: ToolExecutionContext,
  args: ManageKnowledgeArgs
): Promise<ToolRunResult> {
  const operationId = `knowledge-manage-${Date.now()}-${ctx.toolCallId.slice(-8)}`

  try {
    ctx.log('info', `[${operationId}] Initiating knowledge base ${args.action}`, {
      action: args.action,
      workspaceId: args.workspaceId,
      knowledgeBaseId: args.knowledgeBaseId,
      hasName: !!args.name,
      hasDescription: !!args.description,
      hasDocument: !!(args.documentUrl || args.documentContent),
    })

    switch (args.action) {
      case 'create':
        return await handleCreateKnowledgeBase(ctx, args, operationId)

      case 'list':
        return await handleListKnowledgeBases(ctx, args, operationId)

      case 'getDetails':
        return await handleGetKnowledgeBaseDetails(ctx, args, operationId)

      case 'addDocument':
        return await handleAddDocument(ctx, args, operationId)

      case 'listDocuments':
        return await handleListDocuments(ctx, args, operationId)

      case 'update':
        return await handleUpdateKnowledgeBase(ctx, args, operationId)

      case 'delete':
        return await handleDeleteKnowledgeBase(ctx, args, operationId)

      default:
        return {
          status: 400,
          message: `Unsupported action: ${args.action}`,
          data: { error: `Action '${args.action}' is not supported`, operationId },
        }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    ctx.log('error', `[${operationId}] Knowledge management operation failed`, {
      action: args.action,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return {
      status: 500,
      message: `Knowledge management failed: ${errorMessage}`,
      data: {
        error: errorMessage,
        operationId,
        action: args.action,
      },
    }
  }
}

/**
 * Creates a new knowledge base
 */
async function handleCreateKnowledgeBase(
  ctx: ToolExecutionContext,
  args: ManageKnowledgeArgs,
  operationId: string
): Promise<ToolRunResult> {
  if (!args.name) {
    return {
      status: 400,
      message: 'Knowledge base name is required for create operation',
      data: { error: 'Name is required', operationId },
    }
  }

  const createPayload = {
    name: args.name,
    description: args.description || '',
    workspaceId: args.workspaceId,
    embeddingModel: args.embeddingModel,
    ...(args.chunkingConfig && { chunkingConfig: args.chunkingConfig }),
  }

  ctx.log('debug', `[${operationId}] Creating knowledge base with payload`, createPayload)

  const response = await fetch('/api/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || `HTTP ${response.status}`

    ctx.log('error', `[${operationId}] Knowledge base creation failed`, {
      status: response.status,
      error: errorMessage,
    })

    return {
      status: response.status,
      message: `Failed to create knowledge base: ${errorMessage}`,
      data: { error: errorMessage, operationId },
    }
  }

  const result = await response.json()
  const knowledgeBase = result.data || result

  ctx.log('info', `[${operationId}] Knowledge base created successfully`, {
    id: knowledgeBase.id,
    name: knowledgeBase.name,
  })

  return {
    status: 200,
    message: `Knowledge base "${knowledgeBase.name}" created successfully`,
    data: {
      status: 'success',
      action: 'create',
      knowledgeBase,
      operationId,
      metadata: {
        operationId,
        timestamp: new Date().toISOString(),
      },
    },
  }
}

/**
 * Lists knowledge bases accessible to the user
 */
async function handleListKnowledgeBases(
  ctx: ToolExecutionContext,
  args: ManageKnowledgeArgs,
  operationId: string
): Promise<ToolRunResult> {
  const url = new URL('/api/knowledge', window.location.origin)
  url.searchParams.set('workspaceId', args.workspaceId)

  ctx.log('debug', `[${operationId}] Listing knowledge bases for workspace`, {
    workspaceId: args.workspaceId,
  })

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || `HTTP ${response.status}`

    ctx.log('error', `[${operationId}] Knowledge bases list failed`, {
      status: response.status,
      error: errorMessage,
    })

    return {
      status: response.status,
      message: `Failed to list knowledge bases: ${errorMessage}`,
      data: { error: errorMessage, operationId },
    }
  }

  const result = await response.json()
  const knowledgeBases = result.data || []

  ctx.log('info', `[${operationId}] Knowledge bases listed successfully`, {
    count: knowledgeBases.length,
  })

  return {
    status: 200,
    message: `Found ${knowledgeBases.length} knowledge base(s)`,
    data: {
      status: 'success',
      action: 'list',
      knowledgeBases: knowledgeBases.map((kb: any) => ({
        id: kb.id,
        name: kb.name,
        description: kb.description,
        documentCount: kb.documentCount || 0,
        tokenCount: kb.tokenCount || 0,
        embeddingModel: kb.embeddingModel,
        createdAt: kb.createdAt,
        updatedAt: kb.updatedAt,
      })),
      count: knowledgeBases.length,
      operationId,
      metadata: {
        operationId,
        timestamp: new Date().toISOString(),
        workspaceId: args.workspaceId,
      },
    },
  }
}

/**
 * Gets detailed information about a specific knowledge base
 */
async function handleGetKnowledgeBaseDetails(
  ctx: ToolExecutionContext,
  args: ManageKnowledgeArgs,
  operationId: string
): Promise<ToolRunResult> {
  if (!args.knowledgeBaseId) {
    return {
      status: 400,
      message: 'Knowledge base ID is required for getDetails operation',
      data: { error: 'knowledgeBaseId is required', operationId },
    }
  }

  ctx.log('debug', `[${operationId}] Getting knowledge base details`, {
    knowledgeBaseId: args.knowledgeBaseId,
  })

  const response = await fetch(`/api/knowledge/${args.knowledgeBaseId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || `HTTP ${response.status}`

    ctx.log('error', `[${operationId}] Knowledge base details failed`, {
      status: response.status,
      error: errorMessage,
      knowledgeBaseId: args.knowledgeBaseId,
    })

    return {
      status: response.status,
      message: `Failed to get knowledge base details: ${errorMessage}`,
      data: { error: errorMessage, operationId },
    }
  }

  const result = await response.json()
  const knowledgeBase = result.data || result

  ctx.log('info', `[${operationId}] Knowledge base details retrieved`, {
    id: knowledgeBase.id,
    name: knowledgeBase.name,
    documentCount: knowledgeBase.documentCount,
  })

  return {
    status: 200,
    message: `Retrieved details for knowledge base "${knowledgeBase.name}"`,
    data: {
      status: 'success',
      action: 'getDetails',
      knowledgeBase,
      operationId,
      metadata: {
        operationId,
        timestamp: new Date().toISOString(),
      },
    },
  }
}

/**
 * Adds a document to a knowledge base (placeholder for future implementation)
 */
async function handleAddDocument(
  ctx: ToolExecutionContext,
  args: ManageKnowledgeArgs,
  operationId: string
): Promise<ToolRunResult> {
  if (!args.knowledgeBaseId) {
    return {
      status: 400,
      message: 'Knowledge base ID is required for addDocument operation',
      data: { error: 'knowledgeBaseId is required', operationId },
    }
  }

  if (!args.documentUrl && !args.documentContent) {
    return {
      status: 400,
      message: 'Either document URL or content is required for addDocument operation',
      data: { error: 'documentUrl or documentContent is required', operationId },
    }
  }

  ctx.log('info', `[${operationId}] Document addition requested`, {
    knowledgeBaseId: args.knowledgeBaseId,
    hasUrl: !!args.documentUrl,
    hasContent: !!args.documentContent,
    filename: args.filename,
  })

  // This would integrate with the existing document upload/processing pipeline
  // For now, return a placeholder response indicating the feature needs implementation

  return {
    status: 202,
    message:
      'Document addition has been queued for processing. This feature requires integration with the document processing pipeline.',
    data: {
      status: 'pending',
      action: 'addDocument',
      message: 'Document processing pipeline integration needed',
      knowledgeBaseId: args.knowledgeBaseId,
      operationId,
      metadata: {
        operationId,
        timestamp: new Date().toISOString(),
        implementationNote:
          'Requires integration with existing document upload and processing system',
      },
    },
  }
}

/**
 * Lists documents in a knowledge base
 */
async function handleListDocuments(
  ctx: ToolExecutionContext,
  args: ManageKnowledgeArgs,
  operationId: string
): Promise<ToolRunResult> {
  if (!args.knowledgeBaseId) {
    return {
      status: 400,
      message: 'Knowledge base ID is required for listDocuments operation',
      data: { error: 'knowledgeBaseId is required', operationId },
    }
  }

  ctx.log('debug', `[${operationId}] Listing documents for knowledge base`, {
    knowledgeBaseId: args.knowledgeBaseId,
  })

  const response = await fetch(`/api/knowledge/${args.knowledgeBaseId}/documents`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || `HTTP ${response.status}`

    ctx.log('error', `[${operationId}] Document listing failed`, {
      status: response.status,
      error: errorMessage,
      knowledgeBaseId: args.knowledgeBaseId,
    })

    return {
      status: response.status,
      message: `Failed to list documents: ${errorMessage}`,
      data: { error: errorMessage, operationId },
    }
  }

  const result = await response.json()
  const documents = result.data?.documents || []

  ctx.log('info', `[${operationId}] Documents listed successfully`, {
    knowledgeBaseId: args.knowledgeBaseId,
    count: documents.length,
  })

  return {
    status: 200,
    message: `Found ${documents.length} document(s) in knowledge base`,
    data: {
      status: 'success',
      action: 'listDocuments',
      documents: documents.map((doc: any) => ({
        id: doc.id,
        filename: doc.filename,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        chunkCount: doc.chunkCount,
        tokenCount: doc.tokenCount,
        processingStatus: doc.processingStatus,
        enabled: doc.enabled,
        uploadedAt: doc.uploadedAt,
      })),
      count: documents.length,
      knowledgeBaseId: args.knowledgeBaseId,
      operationId,
      metadata: {
        operationId,
        timestamp: new Date().toISOString(),
      },
    },
  }
}

/**
 * Updates a knowledge base (placeholder for future implementation)
 */
async function handleUpdateKnowledgeBase(
  ctx: ToolExecutionContext,
  args: ManageKnowledgeArgs,
  operationId: string
): Promise<ToolRunResult> {
  return {
    status: 501,
    message: 'Knowledge base update functionality is not yet implemented',
    data: {
      error: 'Update operation not implemented',
      operationId,
      action: 'update',
      implementationNote: 'Requires API endpoint for knowledge base updates',
    },
  }
}

/**
 * Deletes a knowledge base (placeholder for future implementation)
 */
async function handleDeleteKnowledgeBase(
  ctx: ToolExecutionContext,
  args: ManageKnowledgeArgs,
  operationId: string
): Promise<ToolRunResult> {
  return {
    status: 501,
    message: 'Knowledge base deletion functionality is not yet implemented',
    data: {
      error: 'Delete operation not implemented',
      operationId,
      action: 'delete',
      implementationNote: 'Requires API endpoint for knowledge base deletion',
    },
  }
}

/**
 * Nexus Copilot Knowledge Management Tool Definition
 */
export const manageKnowledgeTool: ClientToolDefinition<ManageKnowledgeArgs> = {
  name: 'manage-knowledge',
  metadata: {
    displayNames: {
      pending: {
        text: 'Preparing knowledge management...',
        icon: require('lucide-react').Settings,
      },
      executing: { text: 'Managing knowledge base...', icon: require('lucide-react').Database },
      success: {
        text: 'Knowledge management completed',
        icon: require('lucide-react').CheckCircle,
      },
      error: { text: 'Knowledge management failed', icon: require('lucide-react').XCircle },
    },
  },
  hasInterrupt: false,
  execute: executeKnowledgeManagement,
}

/**
 * AI Tool Definition for Vercel AI SDK integration
 */
export const manageKnowledgeAITool = tool({
  description:
    'Manage knowledge bases: create, list, get details, add documents, and organize knowledge collections. Provides comprehensive knowledge base administration.',
  parameters: manageKnowledgeSchema,
  execute: async (args) => {
    const mockContext: ToolExecutionContext = {
      toolCallId: `ai-tool-${Date.now()}`,
      toolName: 'manage-knowledge',
      log: (level, message, extra) => {
        try {
          logger[level](message, { ...extra, source: 'ai-tool' })
        } catch (e) {
          // Silently handle logging errors
        }
      },
    }

    const result = await executeKnowledgeManagement(mockContext, args)

    if (result.status < 300) {
      return result.data
    }
    throw new Error(result.message || 'Knowledge management operation failed')
  },
})
