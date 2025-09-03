/**
 * Nexus Server Tool: File Management Operations
 * Server-side wrapper for the file management AI tool
 */

import type { BaseServerTool } from '@/lib/copilot/tools/server/base-tool'
import { createLogger } from '@/lib/logs/console/logger'
import { manageFiles } from './manage-files'

interface ManageFilesParams {
  action:
    | 'list'
    | 'search'
    | 'createFolder'
    | 'move'
    | 'delete'
    | 'getMetadata'
    | 'updateMetadata'
    | 'getStats'
  workspaceId?: string
  knowledgeBaseId?: string
  folderId?: string
  fileId?: string
  fileName?: string
  query?: string
  fileTypes?: string[]
  tags?: string[]
  folderName?: string
  targetFolderId?: string
  targetKnowledgeBaseId?: string
  metadata?: Record<string, any>
  description?: string
  newTags?: string[]
  limit?: number
  offset?: number
  sortBy?: 'name' | 'size' | 'uploadedAt' | 'mimeType' | 'processingStatus'
  sortOrder?: 'asc' | 'desc'
}

export const manageFilesServerTool: BaseServerTool<ManageFilesParams, any> = {
  name: 'manage_files',
  async execute(params: ManageFilesParams): Promise<any> {
    const logger = createLogger('ManageFilesServerTool')

    try {
      logger.info('Executing file management operation', {
        action: params.action,
        hasWorkspaceId: !!params.workspaceId,
        hasKnowledgeBaseId: !!params.knowledgeBaseId,
        hasFileId: !!params.fileId,
      })

      // Execute the AI tool directly
      const result = await manageFiles.execute(params as any)

      logger.info('File management operation completed', {
        action: params.action,
        status: result.status || 'success',
      })

      return result
    } catch (error) {
      logger.error('File management operation failed', {
        action: params.action,
        error: error.message,
        stack: error.stack,
      })

      return {
        status: 'error',
        message: error.message,
      }
    }
  },
}
