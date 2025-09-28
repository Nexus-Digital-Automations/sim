/**
 * ToolConfigurationService - Tool configuration and credential management
 *
 * Handles tool-specific configurations, environment variables, credential management,
 * and configuration validation across workspaces and users.
 */

import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/packages/db'
import { toolConfigurations, toolRegistry } from '@/packages/db/schema'
import type { IToolConfigurationService, ToolConfiguration } from './types'

const logger = createLogger('ToolConfigurationService')

/**
 * Service for managing tool configurations, credentials, and environment variables
 */
export class ToolConfigurationService implements IToolConfigurationService {
  /**
   * Create a new tool configuration
   */
  async createConfiguration(config: Omit<ToolConfiguration, 'id'>): Promise<ToolConfiguration> {
    logger.info('Creating tool configuration', {
      toolId: config.toolId,
      workspaceId: config.workspaceId,
      userId: config.userId,
      Name: config.Name,
    })

    try {
      // Validate the tool exists
      const tool = await db
        .select()
        .from(toolRegistry)
        .where(eq(toolRegistry.id, config.toolId))
        .limit(1)

      if (tool.length === 0) {
        throw new Error(`Tool not found: ${config.toolId}`)
      }

      // Validate configuration against tool schema
      const validation = await this.validateConfiguration(config.toolId, config.configuration)
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`)
      }

      // Encrypt sensitive credentials
      const encryptedCredentials = await this.encryptCredentials(config.credentials)

      // Generate configuration ID
      const configId = `cfg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Insert configuration
      const [newConfig] = await db
        .insert(toolConfigurations)
        .values({
          id: configId,
          toolId: config.toolId,
          workspaceId: config.workspaceId || null,
          userId: config.userId || null,
          Name: config.Name,
          description: config.description || null,
          configuration: JSON.stringify(config.configuration),
          environmentVariables: JSON.stringify(config.environmentVariables),
          credentials: JSON.stringify(encryptedCredentials),
          isActive: config.isActive,
          isValid: validation.isValid,
          validationErrors: JSON.stringify(validation.errors),
          lastValidated: new Date(),
          usageCount: 0,
          createdBy: config.userId || null,
          updatedBy: config.userId || null,
        })
        .returning()

      logger.info('Tool configuration created successfully', { configId })

      // Convert back to service format
      return await this.mapDatabaseToService(newConfig)
    } catch (error) {
      logger.error('Failed to create tool configuration', { config, error })
      throw error
    }
  }

  /**
   * Get a specific tool configuration
   */
  async getConfiguration(configId: string): Promise<ToolConfiguration | null> {
    try {
      const [config] = await db
        .select()
        .from(toolConfigurations)
        .where(eq(toolConfigurations.id, configId))
        .limit(1)

      if (!config) {
        return null
      }

      return await this.mapDatabaseToService(config)
    } catch (error) {
      logger.error('Failed to get tool configuration', { configId, error })
      throw error
    }
  }

  /**
   * Update a tool configuration
   */
  async updateConfiguration(
    configId: string,
    updates: Partial<ToolConfiguration>
  ): Promise<ToolConfiguration> {
    logger.info('Updating tool configuration', { configId, updates: Object.keys(updates) })

    try {
      const existingConfig = await this.getConfiguration(configId)
      if (!existingConfig) {
        throw new Error(`Configuration not found: ${configId}`)
      }

      const updateData: any = {}

      // Map updates to database format
      if (updates.Name !== undefined) updateData.Name = updates.Name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.configuration !== undefined) {
        // Validate configuration if it's being updated
        const validation = await this.validateConfiguration(
          existingConfig.toolId,
          updates.configuration
        )
        updateData.configuration = JSON.stringify(updates.configuration)
        updateData.isValid = validation.isValid
        updateData.validationErrors = JSON.stringify(validation.errors)
        updateData.lastValidated = new Date()
      }
      if (updates.environmentVariables !== undefined) {
        updateData.environmentVariables = JSON.stringify(updates.environmentVariables)
      }
      if (updates.credentials !== undefined) {
        const encryptedCredentials = await this.encryptCredentials(updates.credentials)
        updateData.credentials = JSON.stringify(encryptedCredentials)
      }
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive

      updateData.updatedAt = sql`NOW()`

      // Update database
      const [updatedConfig] = await db
        .update(toolConfigurations)
        .set(updateData)
        .where(eq(toolConfigurations.id, configId))
        .returning()

      if (!updatedConfig) {
        throw new Error(`Failed to update configuration: ${configId}`)
      }

      logger.info('Tool configuration updated successfully', { configId })

      return await this.mapDatabaseToService(updatedConfig)
    } catch (error) {
      logger.error('Failed to update tool configuration', { configId, error })
      throw error
    }
  }

  /**
   * Delete a tool configuration
   */
  async deleteConfiguration(configId: string): Promise<void> {
    logger.info('Deleting tool configuration', { configId })

    try {
      const result = await db.delete(toolConfigurations).where(eq(toolConfigurations.id, configId))

      if (result.rowCount === 0) {
        throw new Error(`Configuration not found: ${configId}`)
      }

      logger.info('Tool configuration deleted successfully', { configId })
    } catch (error) {
      logger.error('Failed to delete tool configuration', { configId, error })
      throw error
    }
  }

  /**
   * List configurations for a tool
   */
  async listConfigurations(
    toolId: string,
    workspaceId?: string,
    userId?: string
  ): Promise<ToolConfiguration[]> {
    try {
      let query = db.select().from(toolConfigurations).where(eq(toolConfigurations.toolId, toolId))

      // Apply workspace/user filters
      if (workspaceId) {
        query = query.where(
          and(
            eq(toolConfigurations.toolId, toolId),
            eq(toolConfigurations.workspaceId, workspaceId)
          )
        )
      }

      if (userId) {
        query = query.where(
          and(eq(toolConfigurations.toolId, toolId), eq(toolConfigurations.userId, userId))
        )
      }

      const configs = await query.orderBy(desc(toolConfigurations.createdAt))

      // Convert to service format
      return await Promise.all(configs.map((config) => this.mapDatabaseToService(config)))
    } catch (error) {
      logger.error('Failed to list tool configurations', { toolId, workspaceId, userId, error })
      throw error
    }
  }

  /**
   * Validate a tool configuration against its schema
   */
  async validateConfiguration(
    toolId: string,
    config: Record<string, any>
  ): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      // Get tool definition to access schema
      const [tool] = await db
        .select()
        .from(toolRegistry)
        .where(eq(toolRegistry.id, toolId))
        .limit(1)

      if (!tool) {
        return {
          isValid: false,
          errors: [`Tool not found: ${toolId}`],
        }
      }

      // Parse the tool schema
      const toolSchema = JSON.parse(tool.schema as string)

      // Convert to Zod schema if needed
      let zodSchema: z.ZodSchema
      try {
        zodSchema = this.convertToZodSchema(toolSchema)
      } catch (error) {
        logger.warn('Failed to convert tool schema to Zod', { toolId, error })
        // If we can't convert, assume valid for now
        return { isValid: true, errors: [] }
      }

      // Validate configuration
      const result = zodSchema.safeParse(config)

      if (result.success) {
        return { isValid: true, errors: [] }
      }
      const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`)
      return { isValid: false, errors }
    } catch (error) {
      logger.error('Failed to validate tool configuration', { toolId, error })
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      }
    }
  }

  /**
   * Get effective configuration for a tool (merged workspace + user config)
   */
  async getEffectiveConfiguration(
    toolId: string,
    workspaceId?: string,
    userId?: string
  ): Promise<ToolConfiguration | null> {
    try {
      // Get configurations in order of precedence: user > workspace > global
      const configs = await db
        .select()
        .from(toolConfigurations)
        .where(and(eq(toolConfigurations.toolId, toolId), eq(toolConfigurations.isActive, true)))
        .orderBy(desc(toolConfigurations.createdAt))

      // Filter and prioritize configurations
      let userConfig = null
      let workspaceConfig = null
      let globalConfig = null

      for (const config of configs) {
        if (config.userId === userId) {
          userConfig = config
        } else if (config.workspaceId === workspaceId) {
          workspaceConfig = config
        } else if (!config.userId && !config.workspaceId) {
          globalConfig = config
        }
      }

      // Return highest priority config available
      const selectedConfig = userConfig || workspaceConfig || globalConfig

      if (!selectedConfig) {
        return null
      }

      return await this.mapDatabaseToService(selectedConfig)
    } catch (error) {
      logger.error('Failed to get effective configuration', { toolId, workspaceId, userId, error })
      throw error
    }
  }

  /**
   * Update usage statistics for a configuration
   */
  async recordUsage(configId: string): Promise<void> {
    try {
      await db
        .update(toolConfigurations)
        .set({
          usageCount: sql`${toolConfigurations.usageCount} + 1`,
          lastUsed: new Date(),
          updatedAt: sql`NOW()`,
        })
        .where(eq(toolConfigurations.id, configId))

      logger.debug('Configuration usage recorded', { configId })
    } catch (error) {
      logger.error('Failed to record configuration usage', { configId, error })
    }
  }

  // Private helper methods

  /**
   * Convert database row to service format
   */
  private async mapDatabaseToService(dbConfig: any): Promise<ToolConfiguration> {
    // Decrypt credentials for service use
    const decryptedCredentials = await this.decryptCredentials(
      JSON.parse(dbConfig.credentials as string)
    )

    return {
      id: dbConfig.id,
      toolId: dbConfig.toolId,
      workspaceId: dbConfig.workspaceId || undefined,
      userId: dbConfig.userId || undefined,
      Name: dbConfig.Name,
      description: dbConfig.description || undefined,
      configuration: JSON.parse(dbConfig.configuration as string),
      environmentVariables: JSON.parse(dbConfig.environmentVariables as string),
      credentials: decryptedCredentials,
      isActive: dbConfig.isActive,
      isValid: dbConfig.isValid,
      validationErrors: JSON.parse(dbConfig.validationErrors as string),
      lastValidated: dbConfig.lastValidated || undefined,
    }
  }

  /**
   * Encrypt sensitive credentials
   */
  private async encryptCredentials(credentials: Record<string, any>): Promise<Record<string, any>> {
    // This is a simplified implementation
    // In a real system, we'd use proper encryption and key management
    const encrypted: Record<string, any> = {}

    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string' && this.isSensitive(key)) {
        // Store as encrypted reference instead of actual value
        encrypted[key] = {
          encrypted: true,
          reference: `cred_${key}_${Date.now()}`,
          // In practice, store the actual encrypted value securely
        }
      } else {
        encrypted[key] = value
      }
    }

    return encrypted
  }

  /**
   * Decrypt credentials for use
   */
  private async decryptCredentials(
    encryptedCredentials: Record<string, any>
  ): Promise<Record<string, any>> {
    // This is a simplified implementation
    const decrypted: Record<string, any> = {}

    for (const [key, value] of Object.entries(encryptedCredentials)) {
      if (typeof value === 'object' && value.encrypted) {
        // In practice, decrypt using the reference
        decrypted[key] = '[ENCRYPTED_VALUE]' // Placeholder
      } else {
        decrypted[key] = value
      }
    }

    return decrypted
  }

  /**
   * Check if a configuration key contains sensitive data
   */
  private isSensitive(key: string): boolean {
    const sensitiveKeys = [
      'password',
      'secret',
      'key',
      'token',
      'credential',
      'auth',
      'apikey',
      'api_key',
    ]

    const lowerKey = key.toLowerCase()
    return sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))
  }

  /**
   * Convert tool schema to Zod schema for validation
   */
  private convertToZodSchema(schema: any): z.ZodSchema {
    // This is a simplified implementation
    // In practice, we'd need a more sophisticated schema converter

    if (schema.type === 'object' && schema.properties) {
      const shape: Record<string, z.ZodTypeAny> = {}

      for (const [key, prop] of Object.entries(schema.properties as any)) {
        shape[key] = this.convertPropertyToZod(prop)
      }

      return z.object(shape)
    }

    // Default to allowing any object
    return z.record(z.any())
  }

  /**
   * Convert schema property to Zod type
   */
  private convertPropertyToZod(prop: any): z.ZodTypeAny {
    switch (prop.type) {
      case 'string':
        return z.string()
      case 'number':
        return z.number()
      case 'boolean':
        return z.boolean()
      case 'array':
        return z.array(z.any())
      case 'object':
        return z.object({})
      default:
        return z.any()
    }
  }
}
