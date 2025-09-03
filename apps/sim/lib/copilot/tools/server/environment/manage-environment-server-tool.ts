/**
 * Nexus Server Tool: Environment Variable Management
 * Server-side wrapper for the environment management AI tool
 */

import type { BaseServerTool } from '@/lib/copilot/tools/server/base-tool'
import { createLogger } from '@/lib/logs/console/logger'
import { manageEnvironment } from './manage-environment'

interface ManageEnvironmentParams {
  action:
    | 'list'
    | 'get'
    | 'set'
    | 'delete'
    | 'bulk-update'
    | 'bulk-delete'
    | 'export'
    | 'validate'
    | 'getStats'
  key?: string
  keys?: string[]
  value?: string
  description?: string
  category?: string
  isSecret?: boolean
  variables?: Array<{
    key: string
    value: string
    description?: string
    category?: string
    isSecret?: boolean
  }>
  searchQuery?: string
  categoryFilter?: string
  secretsOnly?: boolean
  format?: 'json' | 'env' | 'yaml'
  includeSecrets?: boolean
  validateOnly?: boolean
  limit?: number
  offset?: number
}

export const manageEnvironmentServerTool: BaseServerTool<ManageEnvironmentParams, any> = {
  name: 'manage_environment',
  async execute(params: ManageEnvironmentParams): Promise<any> {
    const logger = createLogger('ManageEnvironmentServerTool')

    try {
      logger.info('Executing environment management operation', {
        action: params.action,
        hasKey: !!params.key,
        hasVariables: !!params.variables?.length,
        secretsOnly: params.secretsOnly,
      })

      // Execute the AI tool directly
      const result = await manageEnvironment.execute(params as any)

      logger.info('Environment management operation completed', {
        action: params.action,
        status: result.status || 'success',
      })

      return result
    } catch (error) {
      logger.error('Environment management operation failed', {
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
