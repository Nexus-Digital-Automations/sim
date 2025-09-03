/**
 * Nexus Tool: Environment Variable Management
 * Secure management of environment variables and configuration
 * Includes encryption, access control, and audit logging
 */

import { tool } from 'ai'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { decryptSecret, encryptSecret } from '@/lib/utils'
import { db } from '@/db'
import { environment } from '@/db/schema'

const logger = createLogger('NexusEnvironmentManagement')

/**
 * Enhanced Environment Variable Management Tool
 *
 * Provides comprehensive environment variable operations including:
 * - Secure encrypted storage of sensitive variables
 * - Bulk operations for efficient management
 * - Access control and audit logging
 * - Variable categorization and organization
 * - Import/export capabilities for deployment
 * - Real-time validation and error handling
 */
export const manageEnvironment = tool({
  description:
    'Manage environment variables: list, create, update, delete with secure encryption and audit logging',
  parameters: z.object({
    action: z
      .enum([
        'list',
        'get',
        'set',
        'delete',
        'bulk-update',
        'bulk-delete',
        'export',
        'validate',
        'getStats',
      ])
      .describe('Environment operation to perform'),

    // Variable identification
    key: z.string().optional().describe('Environment variable key'),
    keys: z
      .array(z.string())
      .optional()
      .describe('Multiple environment variable keys for bulk operations'),

    // Variable data
    value: z.string().optional().describe('Environment variable value (will be encrypted)'),
    description: z.string().optional().describe('Description of the variable and its usage'),
    category: z
      .string()
      .optional()
      .describe('Category for organizing variables (e.g., api, database, auth)'),
    isSecret: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether variable contains sensitive data'),

    // Bulk operations
    variables: z
      .array(
        z.object({
          key: z.string(),
          value: z.string(),
          description: z.string().optional(),
          category: z.string().optional(),
          isSecret: z.boolean().optional().default(false),
        })
      )
      .optional()
      .describe('Multiple variables for bulk operations'),

    // Filtering and search
    searchQuery: z.string().optional().describe('Search query for variable keys and descriptions'),
    categoryFilter: z.string().optional().describe('Filter by variable category'),
    secretsOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe('Filter to show only secret variables'),

    // Export options
    format: z.enum(['json', 'env', 'yaml']).optional().default('json').describe('Export format'),
    includeSecrets: z
      .boolean()
      .optional()
      .default(false)
      .describe('Include secret values in export (use with caution)'),

    // Validation
    validateOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe('Only validate without making changes'),

    // Pagination
    limit: z.number().min(1).max(100).default(50).describe('Maximum number of results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
  }),

  execute: async (params) => {
    const operationId = `env-${params.action}-${Date.now()}`

    try {
      const session = await getSession()
      if (!session?.user) {
        throw new Error('Authentication required')
      }

      logger.info(`[${operationId}] Environment ${params.action} operation started`, {
        userId: session.user.id,
        action: params.action,
        keyCount: params.keys?.length || (params.key ? 1 : 0),
        hasVariables: !!params.variables?.length,
      })

      switch (params.action) {
        case 'list':
          return await listEnvironmentVariables(params, session.user.id, operationId)

        case 'get':
          return await getEnvironmentVariable(params, session.user.id, operationId)

        case 'set':
          return await setEnvironmentVariable(params, session.user.id, operationId)

        case 'delete':
          return await deleteEnvironmentVariable(params, session.user.id, operationId)

        case 'bulk-update':
          return await bulkUpdateVariables(params, session.user.id, operationId)

        case 'bulk-delete':
          return await bulkDeleteVariables(params, session.user.id, operationId)

        case 'export':
          return await exportEnvironmentVariables(params, session.user.id, operationId)

        case 'validate':
          return await validateEnvironmentVariables(params, session.user.id, operationId)

        case 'getStats':
          return await getEnvironmentStats(params, session.user.id, operationId)

        default:
          throw new Error(`Unsupported action: ${params.action}`)
      }
    } catch (error) {
      logger.error(`[${operationId}] Environment management failed`, {
        userId: session?.user?.id,
        action: params.action,
        error: error.message,
        stack: error.stack,
      })

      return {
        status: 'error',
        message: error.message,
        operationId,
      }
    }
  },
})

/**
 * Enhanced variable metadata storage format
 */
interface VariableMetadata {
  value: string // Encrypted value
  description?: string // Human-readable description
  category?: string // Organization category
  isSecret: boolean // Security classification
  createdAt: string // Creation timestamp
  updatedAt: string // Last update timestamp
  accessCount?: number // Usage tracking
  lastAccessed?: string // Last access timestamp
}

/**
 * List all environment variables with advanced filtering and search
 */
async function listEnvironmentVariables(params: any, userId: string, operationId: string) {
  const { searchQuery, categoryFilter, secretsOnly, limit, offset } = params

  // Get user's environment record
  const envRecord = await db
    .select()
    .from(environment)
    .where(eq(environment.userId, userId))
    .limit(1)

  if (!envRecord.length) {
    return {
      status: 'success',
      action: 'list',
      variables: [],
      pagination: { total: 0, limit, offset, hasMore: false },
      operationId,
    }
  }

  const envVars = (envRecord[0].variables as Record<string, VariableMetadata>) || {}
  let filteredVars = Object.entries(envVars)

  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filteredVars = filteredVars.filter(
      ([key, meta]) =>
        key.toLowerCase().includes(query) ||
        meta.description?.toLowerCase().includes(query) ||
        meta.category?.toLowerCase().includes(query)
    )
  }

  // Apply category filter
  if (categoryFilter) {
    filteredVars = filteredVars.filter(([, meta]) => meta.category === categoryFilter)
  }

  // Apply secrets filter
  if (secretsOnly) {
    filteredVars = filteredVars.filter(([, meta]) => meta.isSecret)
  }

  // Apply pagination
  const total = filteredVars.length
  const paginatedVars = filteredVars.slice(offset, offset + limit)

  // Format response (exclude actual values for security)
  const formattedVars = paginatedVars.map(([key, meta]) => ({
    key,
    description: meta.description,
    category: meta.category,
    isSecret: meta.isSecret,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    accessCount: meta.accessCount || 0,
    lastAccessed: meta.lastAccessed,
    hasValue: !!meta.value,
  }))

  return {
    status: 'success',
    action: 'list',
    variables: formattedVars,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
    operationId,
  }
}

/**
 * Get a specific environment variable with optional value decryption
 */
async function getEnvironmentVariable(params: any, userId: string, operationId: string) {
  const { key } = params

  if (!key) {
    throw new Error('Key is required for get operation')
  }

  const envRecord = await db
    .select()
    .from(environment)
    .where(eq(environment.userId, userId))
    .limit(1)

  if (!envRecord.length) {
    return {
      status: 'error',
      message: 'Environment variable not found',
      operationId,
    }
  }

  const envVars = (envRecord[0].variables as Record<string, VariableMetadata>) || {}
  const variable = envVars[key]

  if (!variable) {
    return {
      status: 'error',
      message: 'Environment variable not found',
      operationId,
    }
  }

  let decryptedValue = '[ENCRYPTED]'

  // Decrypt value if it's not marked as secret or if explicitly requested
  try {
    if (!variable.isSecret) {
      const result = await decryptSecret(variable.value)
      decryptedValue = result.decrypted
    }
  } catch (error) {
    logger.warn(`[${operationId}] Failed to decrypt variable ${key}`, { error: error.message })
    decryptedValue = '[DECRYPTION_FAILED]'
  }

  // Update access tracking
  const updatedMetadata = {
    ...variable,
    accessCount: (variable.accessCount || 0) + 1,
    lastAccessed: new Date().toISOString(),
  }

  const updatedVars = { ...envVars, [key]: updatedMetadata }

  // Update access tracking in database
  await db
    .update(environment)
    .set({
      variables: updatedVars,
      updatedAt: new Date(),
    })
    .where(eq(environment.userId, userId))

  return {
    status: 'success',
    action: 'get',
    variable: {
      key,
      value: decryptedValue,
      description: variable.description,
      category: variable.category,
      isSecret: variable.isSecret,
      createdAt: variable.createdAt,
      updatedAt: variable.updatedAt,
      accessCount: updatedMetadata.accessCount,
      lastAccessed: updatedMetadata.lastAccessed,
    },
    operationId,
  }
}

/**
 * Set or update an environment variable with encryption
 */
async function setEnvironmentVariable(params: any, userId: string, operationId: string) {
  const { key, value, description, category, isSecret = false, validateOnly = false } = params

  if (!key) {
    throw new Error('Key is required for set operation')
  }

  if (value === undefined) {
    throw new Error('Value is required for set operation')
  }

  // Validate key format
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    return {
      status: 'error',
      message:
        'Environment variable keys must contain only uppercase letters, numbers, and underscores, and start with a letter or underscore',
      operationId,
    }
  }

  if (validateOnly) {
    return {
      status: 'success',
      action: 'validate',
      message: 'Variable format is valid',
      operationId,
    }
  }

  // Encrypt the value
  const encryptionResult = await encryptSecret(value)

  // Get existing environment record
  const existingRecord = await db
    .select()
    .from(environment)
    .where(eq(environment.userId, userId))
    .limit(1)

  const existingVars = (existingRecord[0]?.variables as Record<string, VariableMetadata>) || {}
  const existingVar = existingVars[key]

  const now = new Date().toISOString()
  const variableMetadata: VariableMetadata = {
    value: encryptionResult.encrypted,
    description: description || existingVar?.description,
    category: category || existingVar?.category,
    isSecret: isSecret,
    createdAt: existingVar?.createdAt || now,
    updatedAt: now,
    accessCount: existingVar?.accessCount || 0,
    lastAccessed: existingVar?.lastAccessed,
  }

  const updatedVars = { ...existingVars, [key]: variableMetadata }

  // Upsert environment record
  await db
    .insert(environment)
    .values({
      id: userId, // Using userId as the primary key
      userId,
      variables: updatedVars,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [environment.userId],
      set: {
        variables: updatedVars,
        updatedAt: new Date(),
      },
    })

  const isNewVariable = !existingVar

  return {
    status: 'success',
    action: 'set',
    variable: {
      key,
      description: variableMetadata.description,
      category: variableMetadata.category,
      isSecret: variableMetadata.isSecret,
      createdAt: variableMetadata.createdAt,
      updatedAt: variableMetadata.updatedAt,
    },
    message: `Environment variable ${isNewVariable ? 'created' : 'updated'} successfully`,
    isNewVariable,
    operationId,
  }
}

/**
 * Delete an environment variable
 */
async function deleteEnvironmentVariable(params: any, userId: string, operationId: string) {
  const { key } = params

  if (!key) {
    throw new Error('Key is required for delete operation')
  }

  const existingRecord = await db
    .select()
    .from(environment)
    .where(eq(environment.userId, userId))
    .limit(1)

  if (!existingRecord.length) {
    return {
      status: 'error',
      message: 'Environment variable not found',
      operationId,
    }
  }

  const existingVars = (existingRecord[0].variables as Record<string, VariableMetadata>) || {}

  if (!(key in existingVars)) {
    return {
      status: 'error',
      message: 'Environment variable not found',
      operationId,
    }
  }

  // Remove the variable
  const { [key]: deletedVar, ...remainingVars } = existingVars

  await db
    .update(environment)
    .set({
      variables: remainingVars,
      updatedAt: new Date(),
    })
    .where(eq(environment.userId, userId))

  return {
    status: 'success',
    action: 'delete',
    deletedKey: key,
    deletedVariable: {
      key,
      description: deletedVar.description,
      category: deletedVar.category,
      isSecret: deletedVar.isSecret,
    },
    remainingCount: Object.keys(remainingVars).length,
    operationId,
  }
}

/**
 * Bulk update multiple environment variables
 */
async function bulkUpdateVariables(params: any, userId: string, operationId: string) {
  const { variables, validateOnly = false } = params

  if (!variables || !Array.isArray(variables) || variables.length === 0) {
    throw new Error('Variables array is required for bulk update')
  }

  // Validate all variables first
  const validationErrors = []
  for (const variable of variables) {
    if (!variable.key) {
      validationErrors.push('All variables must have a key')
      continue
    }

    if (!/^[A-Z_][A-Z0-9_]*$/.test(variable.key)) {
      validationErrors.push(`Invalid key format: ${variable.key}`)
    }

    if (variable.value === undefined) {
      validationErrors.push(`Value required for variable: ${variable.key}`)
    }
  }

  if (validationErrors.length > 0) {
    return {
      status: 'error',
      message: 'Validation failed',
      errors: validationErrors,
      operationId,
    }
  }

  if (validateOnly) {
    return {
      status: 'success',
      action: 'validate',
      message: `All ${variables.length} variables are valid`,
      operationId,
    }
  }

  // Get existing environment record
  const existingRecord = await db
    .select()
    .from(environment)
    .where(eq(environment.userId, userId))
    .limit(1)

  const existingVars = (existingRecord[0]?.variables as Record<string, VariableMetadata>) || {}

  // Process each variable
  const results = {
    created: [] as string[],
    updated: [] as string[],
    errors: [] as string[],
  }

  const now = new Date().toISOString()
  const updatedVars = { ...existingVars }

  for (const variable of variables) {
    try {
      const encryptionResult = await encryptSecret(variable.value)
      const existingVar = existingVars[variable.key]
      const isNewVariable = !existingVar

      const variableMetadata: VariableMetadata = {
        value: encryptionResult.encrypted,
        description: variable.description || existingVar?.description,
        category: variable.category || existingVar?.category,
        isSecret: variable.isSecret ?? false,
        createdAt: existingVar?.createdAt || now,
        updatedAt: now,
        accessCount: existingVar?.accessCount || 0,
        lastAccessed: existingVar?.lastAccessed,
      }

      updatedVars[variable.key] = variableMetadata

      if (isNewVariable) {
        results.created.push(variable.key)
      } else {
        results.updated.push(variable.key)
      }
    } catch (error) {
      results.errors.push(`Failed to process ${variable.key}: ${error.message}`)
    }
  }

  // Update database
  await db
    .insert(environment)
    .values({
      id: userId,
      userId,
      variables: updatedVars,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [environment.userId],
      set: {
        variables: updatedVars,
        updatedAt: new Date(),
      },
    })

  return {
    status: 'success',
    action: 'bulk-update',
    results,
    summary: {
      total: variables.length,
      created: results.created.length,
      updated: results.updated.length,
      errors: results.errors.length,
    },
    totalVariableCount: Object.keys(updatedVars).length,
    operationId,
  }
}

/**
 * Bulk delete multiple environment variables
 */
async function bulkDeleteVariables(params: any, userId: string, operationId: string) {
  const { keys } = params

  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    throw new Error('Keys array is required for bulk delete')
  }

  const existingRecord = await db
    .select()
    .from(environment)
    .where(eq(environment.userId, userId))
    .limit(1)

  if (!existingRecord.length) {
    return {
      status: 'error',
      message: 'No environment variables found',
      operationId,
    }
  }

  const existingVars = (existingRecord[0].variables as Record<string, VariableMetadata>) || {}

  const results = {
    deleted: [] as string[],
    notFound: [] as string[],
  }

  const updatedVars = { ...existingVars }

  for (const key of keys) {
    if (key in updatedVars) {
      delete updatedVars[key]
      results.deleted.push(key)
    } else {
      results.notFound.push(key)
    }
  }

  if (results.deleted.length > 0) {
    await db
      .update(environment)
      .set({
        variables: updatedVars,
        updatedAt: new Date(),
      })
      .where(eq(environment.userId, userId))
  }

  return {
    status: 'success',
    action: 'bulk-delete',
    results,
    summary: {
      total: keys.length,
      deleted: results.deleted.length,
      notFound: results.notFound.length,
    },
    remainingCount: Object.keys(updatedVars).length,
    operationId,
  }
}

/**
 * Export environment variables in various formats
 */
async function exportEnvironmentVariables(params: any, userId: string, operationId: string) {
  const { format = 'json', includeSecrets = false, categoryFilter } = params

  const existingRecord = await db
    .select()
    .from(environment)
    .where(eq(environment.userId, userId))
    .limit(1)

  if (!existingRecord.length) {
    return {
      status: 'success',
      action: 'export',
      data: format === 'json' ? {} : '',
      format,
      variableCount: 0,
      operationId,
    }
  }

  const envVars = (existingRecord[0].variables as Record<string, VariableMetadata>) || {}
  let filteredVars = Object.entries(envVars)

  // Apply category filter
  if (categoryFilter) {
    filteredVars = filteredVars.filter(([, meta]) => meta.category === categoryFilter)
  }

  const exportData: Record<string, any> = {}

  for (const [key, meta] of filteredVars) {
    let value = '[ENCRYPTED]'

    // Decrypt non-secret values or if explicitly requested
    if (!meta.isSecret || includeSecrets) {
      try {
        const result = await decryptSecret(meta.value)
        value = result.decrypted
      } catch (error) {
        value = '[DECRYPTION_FAILED]'
      }
    }

    if (format === 'json') {
      exportData[key] = {
        value,
        description: meta.description,
        category: meta.category,
        isSecret: meta.isSecret,
      }
    } else {
      exportData[key] = value
    }
  }

  let formattedOutput: string | object = exportData

  if (format === 'env') {
    formattedOutput = Object.entries(exportData)
      .map(([key, value]) => `${key}=${typeof value === 'string' ? value : value.value}`)
      .join('\n')
  } else if (format === 'yaml') {
    formattedOutput = Object.entries(exportData)
      .map(
        ([key, value]) => `${key}: ${typeof value === 'string' ? `"${value}"` : `"${value.value}"`}`
      )
      .join('\n')
  }

  return {
    status: 'success',
    action: 'export',
    data: formattedOutput,
    format,
    variableCount: Object.keys(exportData).length,
    includeSecrets,
    warning: includeSecrets ? 'Export includes sensitive data - handle with care' : undefined,
    operationId,
  }
}

/**
 * Validate environment variable configurations
 */
async function validateEnvironmentVariables(params: any, userId: string, operationId: string) {
  const existingRecord = await db
    .select()
    .from(environment)
    .where(eq(environment.userId, userId))
    .limit(1)

  if (!existingRecord.length) {
    return {
      status: 'success',
      action: 'validate',
      issues: [],
      summary: { total: 0, valid: 0, issues: 0 },
      operationId,
    }
  }

  const envVars = (existingRecord[0].variables as Record<string, VariableMetadata>) || {}
  const issues = []
  let validCount = 0

  for (const [key, meta] of Object.entries(envVars)) {
    // Validate key format
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      issues.push({
        key,
        type: 'invalid_key_format',
        message: 'Key should contain only uppercase letters, numbers, and underscores',
      })
      continue
    }

    // Try to decrypt value
    try {
      await decryptSecret(meta.value)
      validCount++
    } catch (error) {
      issues.push({
        key,
        type: 'decryption_failed',
        message: 'Failed to decrypt value - may be corrupted',
      })
    }

    // Check for missing descriptions on secrets
    if (meta.isSecret && !meta.description) {
      issues.push({
        key,
        type: 'missing_description',
        message: 'Secret variables should have descriptions',
      })
    }
  }

  return {
    status: 'success',
    action: 'validate',
    issues,
    summary: {
      total: Object.keys(envVars).length,
      valid: validCount,
      issues: issues.length,
    },
    operationId,
  }
}

/**
 * Get comprehensive environment variable statistics
 */
async function getEnvironmentStats(params: any, userId: string, operationId: string) {
  const existingRecord = await db
    .select()
    .from(environment)
    .where(eq(environment.userId, userId))
    .limit(1)

  if (!existingRecord.length) {
    return {
      status: 'success',
      action: 'getStats',
      stats: {
        total: 0,
        secrets: 0,
        categories: {},
        recentlyAccessed: [],
        oldestVariables: [],
        usage: { totalAccess: 0, averageAccess: 0 },
      },
      operationId,
    }
  }

  const envVars = (existingRecord[0].variables as Record<string, VariableMetadata>) || {}
  const entries = Object.entries(envVars)

  // Basic counts
  const total = entries.length
  const secrets = entries.filter(([, meta]) => meta.isSecret).length

  // Category distribution
  const categories = entries.reduce(
    (acc, [, meta]) => {
      const category = meta.category || 'uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Usage statistics
  const totalAccess = entries.reduce((sum, [, meta]) => sum + (meta.accessCount || 0), 0)
  const averageAccess = total > 0 ? totalAccess / total : 0

  // Recently accessed variables
  const recentlyAccessed = entries
    .filter(([, meta]) => meta.lastAccessed)
    .sort((a, b) => new Date(b[1].lastAccessed!).getTime() - new Date(a[1].lastAccessed!).getTime())
    .slice(0, 10)
    .map(([key, meta]) => ({
      key,
      lastAccessed: meta.lastAccessed,
      accessCount: meta.accessCount || 0,
    }))

  // Oldest variables (by creation date)
  const oldestVariables = entries
    .sort((a, b) => new Date(a[1].createdAt).getTime() - new Date(b[1].createdAt).getTime())
    .slice(0, 10)
    .map(([key, meta]) => ({
      key,
      createdAt: meta.createdAt,
      category: meta.category,
    }))

  return {
    status: 'success',
    action: 'getStats',
    stats: {
      total,
      secrets,
      regular: total - secrets,
      categories,
      recentlyAccessed,
      oldestVariables,
      usage: {
        totalAccess,
        averageAccess: Math.round(averageAccess * 100) / 100,
      },
    },
    operationId,
  }
}
