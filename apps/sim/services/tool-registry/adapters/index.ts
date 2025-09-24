/**
 * Tool Adapters - Convert existing Sim tools to Universal Tool Registry format
 *
 * Provides adapters for transforming existing copilot tools, custom tools,
 * and other tool formats into the standardized registry format.
 */

import { z } from 'zod'
import { ToolArgSchemas, type ToolId, ToolResultSchemas } from '@/lib/copilot/registry'
import { getRegisteredTools } from '@/lib/copilot/tools/client/registry'
import { createLogger } from '@/lib/logs/console/logger'
import type {
  ToolAdapter as IToolAdapter,
  ToolDefinition,
  ToolMetadata,
  ToolUsageExample,
} from '../types'

const logger = createLogger('ToolAdapter')

/**
 * Main tool adapter class for converting Sim tools to registry format
 */
export class ToolAdapter implements IToolAdapter {
  /**
   * Get all existing Sim tools for registration
   */
  async getAllSimTools(): Promise<any[]> {
    logger.info('Discovering existing Sim tools')

    try {
      const simTools = []

      // Get copilot tools from registry
      const copilotTools = this.getCopilotTools()
      simTools.push(...copilotTools)

      // Get client tools
      const clientTools = this.getClientTools()
      simTools.push(...clientTools)

      // Get custom tools from database (would be implemented)
      // const customTools = await this.getCustomTools()
      // simTools.push(...customTools)

      logger.info('Discovered Sim tools', { count: simTools.length })
      return simTools
    } catch (error) {
      logger.error('Failed to get Sim tools', { error })
      return []
    }
  }

  /**
   * Adapt a Sim tool to registry format
   */
  adaptTool(originalTool: any): ToolDefinition {
    logger.debug('Adapting tool to registry format', {
      toolId: originalTool.id || originalTool.name,
    })

    try {
      if (originalTool.source === 'copilot') {
        return this.adaptCopilotTool(originalTool)
      }

      if (originalTool.source === 'client') {
        return this.adaptClientTool(originalTool)
      }

      if (originalTool.source === 'custom') {
        return this.adaptCustomTool(originalTool)
      }

      // Default adaptation
      return this.adaptGenericTool(originalTool)
    } catch (error) {
      logger.error('Failed to adapt tool', { tool: originalTool, error })
      throw error
    }
  }

  /**
   * Validate tool configuration
   */
  validateConfiguration(config: any): { isValid: boolean; errors: string[] } {
    try {
      // Basic validation - in practice, this would be more sophisticated
      if (!config || typeof config !== 'object') {
        return {
          isValid: false,
          errors: ['Configuration must be an object'],
        }
      }

      return {
        isValid: true,
        errors: [],
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error}`],
      }
    }
  }

  /**
   * Convert parameters to registry format
   */
  convertParameters(params: any): any {
    // Pass through for now - could add parameter transformation logic
    return params
  }

  /**
   * Convert result to registry format
   */
  convertResult(result: any): any {
    // Pass through for now - could add result transformation logic
    return result
  }

  // Private methods for different tool types

  /**
   * Get copilot tools from the registry
   */
  private getCopilotTools(): any[] {
    const copilotTools = []

    // Get all tool IDs from the copilot registry
    for (const [toolId, schemas] of Object.entries(ToolArgSchemas)) {
      copilotTools.push({
        id: toolId,
        source: 'copilot',
        name: toolId,
        schema: schemas,
        resultSchema: (ToolResultSchemas as any)[toolId],
      })
    }

    return copilotTools
  }

  /**
   * Get client-side tools
   */
  private getClientTools(): any[] {
    const clientTools = []

    try {
      const registeredTools = getRegisteredTools()

      for (const [name, tool] of Object.entries(registeredTools)) {
        clientTools.push({
          id: name,
          source: 'client',
          name: name,
          definition: tool,
          metadata: tool.metadata,
        })
      }
    } catch (error) {
      logger.warn('Failed to get client tools', { error })
    }

    return clientTools
  }

  /**
   * Adapt a copilot tool to registry format
   */
  private adaptCopilotTool(tool: any): ToolDefinition {
    const toolId = tool.id as ToolId
    const categoryMap = this.getCategoryMapping()

    return {
      id: toolId,
      name: toolId,
      displayName: this.formatDisplayName(toolId),
      description: this.generateDescription(toolId),
      longDescription: this.generateLongDescription(toolId),
      version: '1.0.0',
      toolType: 'builtin',
      scope: 'global',
      status: 'active',
      categoryId: categoryMap[toolId] || 'cat_utilities',
      tags: this.generateTags(toolId),
      keywords: this.generateKeywords(toolId),
      schema: tool.schema || z.object({}),
      resultSchema: tool.resultSchema,
      metadata: this.generateMetadata(toolId),
      implementationType: 'server',
      executionContext: {},
      isPublic: true,
      requiresAuth: this.requiresAuth(toolId),
      requiredPermissions: this.getRequiredPermissions(toolId),
      naturalLanguageDescription: this.generateNaturalLanguageDescription(toolId),
      usageExamples: this.generateUsageExamples(toolId),
      commonQuestions: this.generateCommonQuestions(toolId),
    }
  }

  /**
   * Adapt a client tool to registry format
   */
  private adaptClientTool(tool: any): ToolDefinition {
    const toolId = tool.id
    const definition = tool.definition

    return {
      id: toolId,
      name: toolId,
      displayName: definition.metadata?.displayName || this.formatDisplayName(toolId),
      description: definition.metadata?.description || this.generateDescription(toolId),
      longDescription: definition.metadata?.longDescription,
      version: definition.metadata?.version || '1.0.0',
      toolType: 'builtin',
      scope: 'global',
      status: 'active',
      categoryId: this.getCategoryForClientTool(toolId),
      tags: definition.metadata?.tags || this.generateTags(toolId),
      keywords: definition.metadata?.keywords || this.generateKeywords(toolId),
      schema: z.object({}), // Would need to extract from client tool definition
      resultSchema: undefined,
      metadata: this.generateClientToolMetadata(definition),
      implementationType: 'client',
      executionContext: {},
      isPublic: true,
      requiresAuth: definition.metadata?.requiresAuth || false,
      requiredPermissions: definition.metadata?.requiredPermissions || [],
      naturalLanguageDescription: definition.metadata?.naturalLanguageDescription,
      usageExamples: definition.metadata?.usageExamples || [],
      commonQuestions: definition.metadata?.commonQuestions || [],
    }
  }

  /**
   * Adapt a custom tool to registry format
   */
  private adaptCustomTool(tool: any): ToolDefinition {
    return {
      id: tool.id,
      name: tool.name || tool.id,
      displayName: tool.title || tool.name || this.formatDisplayName(tool.id),
      description: tool.description || 'Custom tool',
      longDescription: tool.longDescription,
      version: tool.version || '1.0.0',
      toolType: 'custom',
      scope: 'user',
      status: 'active',
      categoryId: 'cat_custom',
      tags: tool.tags || ['custom'],
      keywords: tool.keywords || [tool.name],
      schema: tool.schema || z.object({}),
      resultSchema: tool.resultSchema,
      metadata: {
        author: tool.author,
        custom: true,
        ...tool.metadata,
      },
      implementationType: tool.implementationType || 'hybrid',
      executionContext: tool.executionContext || {},
      isPublic: tool.isPublic !== false,
      requiresAuth: tool.requiresAuth || false,
      requiredPermissions: tool.requiredPermissions || [],
      naturalLanguageDescription: tool.naturalLanguageDescription,
      usageExamples: tool.usageExamples || [],
      commonQuestions: tool.commonQuestions || [],
    }
  }

  /**
   * Adapt a generic tool to registry format
   */
  private adaptGenericTool(tool: any): ToolDefinition {
    return {
      id: tool.id || tool.name,
      name: tool.name || tool.id,
      displayName: tool.displayName || tool.title || this.formatDisplayName(tool.id || tool.name),
      description: tool.description || 'Tool',
      version: '1.0.0',
      toolType: 'integration',
      scope: 'global',
      status: 'active',
      categoryId: 'cat_utilities',
      tags: tool.tags || [],
      keywords: tool.keywords || [],
      schema: tool.schema || z.object({}),
      metadata: tool.metadata || {},
      implementationType: 'hybrid',
      executionContext: {},
      isPublic: true,
      requiresAuth: false,
      requiredPermissions: [],
      naturalLanguageDescription: tool.naturalLanguageDescription,
      usageExamples: tool.usageExamples || [],
      commonQuestions: tool.commonQuestions || [],
    }
  }

  // Helper methods for generating tool information

  private formatDisplayName(toolId: string): string {
    return toolId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  private generateDescription(toolId: string): string {
    const descriptions: Record<string, string> = {
      get_user_workflow: 'Retrieve the current user workflow configuration',
      build_workflow: 'Build and compile workflow from YAML definition',
      edit_workflow: 'Edit existing workflow with specified operations',
      run_workflow: 'Execute a workflow with given input parameters',
      get_workflow_console: 'Get workflow execution logs and console output',
      get_blocks_and_tools: 'Retrieve available workflow blocks and tools',
      get_blocks_metadata: 'Get detailed metadata for specific workflow blocks',
      search_documentation: 'Search through documentation and help content',
      search_online: 'Perform online search queries',
      make_api_request: 'Make HTTP API requests to external services',
      get_environment_variables: 'Retrieve environment variables and settings',
      set_environment_variables: 'Update environment variables and settings',
      get_oauth_credentials: 'Get OAuth credentials for external services',
      list_gdrive_files: 'List files from Google Drive',
      read_gdrive_file: 'Read content from Google Drive files',
      // Add more as needed
    }

    return descriptions[toolId] || `Tool for ${toolId.replace(/_/g, ' ')}`
  }

  private generateLongDescription(toolId: string): string {
    return `${this.generateDescription(toolId)}. This tool is part of Sim's integrated workflow system and provides essential functionality for workflow management and automation.`
  }

  private generateTags(toolId: string): string[] {
    const tagMap: Record<string, string[]> = {
      get_user_workflow: ['workflow', 'user', 'configuration'],
      build_workflow: ['workflow', 'build', 'yaml', 'compilation'],
      edit_workflow: ['workflow', 'edit', 'operations'],
      run_workflow: ['workflow', 'execution', 'run'],
      get_workflow_console: ['workflow', 'console', 'logs', 'debugging'],
      get_blocks_and_tools: ['workflow', 'blocks', 'tools', 'metadata'],
      get_blocks_metadata: ['blocks', 'metadata', 'information'],
      search_documentation: ['search', 'documentation', 'help'],
      search_online: ['search', 'web', 'internet'],
      make_api_request: ['api', 'http', 'request', 'integration'],
      get_environment_variables: ['environment', 'variables', 'settings'],
      set_environment_variables: ['environment', 'variables', 'configuration'],
      get_oauth_credentials: ['oauth', 'authentication', 'credentials'],
      list_gdrive_files: ['google', 'drive', 'files', 'storage'],
      read_gdrive_file: ['google', 'drive', 'file', 'content'],
    }

    return tagMap[toolId] || ['utility']
  }

  private generateKeywords(toolId: string): string[] {
    const baseKeywords = toolId.split('_')
    const additionalKeywords = this.generateTags(toolId)
    return [...baseKeywords, ...additionalKeywords]
  }

  private generateMetadata(toolId: string): ToolMetadata {
    return {
      author: 'Sim Team',
      documentation: `/docs/tools/${toolId}`,
      license: 'proprietary',
      integrations: this.getToolIntegrations(toolId),
    }
  }

  private generateClientToolMetadata(definition: any): ToolMetadata {
    return {
      author: 'Sim Team',
      license: 'proprietary',
      ...definition.metadata,
    }
  }

  private getCategoryMapping(): Record<string, string> {
    return {
      get_user_workflow: 'cat_workflow',
      build_workflow: 'cat_workflow',
      edit_workflow: 'cat_workflow',
      run_workflow: 'cat_workflow',
      get_workflow_console: 'cat_workflow',
      get_blocks_and_tools: 'cat_workflow',
      get_blocks_metadata: 'cat_workflow',
      search_documentation: 'cat_documentation',
      search_online: 'cat_utilities',
      make_api_request: 'cat_api',
      get_environment_variables: 'cat_environment',
      set_environment_variables: 'cat_environment',
      get_oauth_credentials: 'cat_environment',
      list_gdrive_files: 'cat_files',
      read_gdrive_file: 'cat_files',
    }
  }

  private getCategoryForClientTool(toolId: string): string {
    if (toolId.includes('workflow')) return 'cat_workflow'
    if (toolId.includes('oauth') || toolId.includes('credential')) return 'cat_environment'
    if (toolId.includes('gdrive') || toolId.includes('file')) return 'cat_files'
    if (toolId.includes('api')) return 'cat_api'
    if (toolId.includes('search') || toolId.includes('doc')) return 'cat_documentation'
    return 'cat_utilities'
  }

  private requiresAuth(toolId: string): boolean {
    const authRequiredTools = [
      'get_oauth_credentials',
      'list_gdrive_files',
      'read_gdrive_file',
      'set_environment_variables',
    ]
    return authRequiredTools.includes(toolId)
  }

  private getRequiredPermissions(toolId: string): string[] {
    const permissionMap: Record<string, string[]> = {
      set_environment_variables: ['write:environment'],
      edit_workflow: ['write:workflow'],
      list_gdrive_files: ['read:gdrive'],
      read_gdrive_file: ['read:gdrive'],
    }
    return permissionMap[toolId] || []
  }

  private generateNaturalLanguageDescription(toolId: string): string {
    const nlDescriptions: Record<string, string> = {
      get_user_workflow: 'Get the workflow that you are currently working on',
      build_workflow: 'Create a new workflow from a YAML description',
      edit_workflow: 'Modify an existing workflow by adding, editing, or removing blocks',
      run_workflow: 'Execute a workflow with specific input data',
      search_documentation: 'Find information in the documentation',
      make_api_request: 'Call an external API or web service',
      get_environment_variables: 'Check what environment variables are configured',
      set_environment_variables: 'Configure environment variables and settings',
    }

    return nlDescriptions[toolId] || this.generateDescription(toolId)
  }

  private generateUsageExamples(toolId: string): ToolUsageExample[] {
    const examples: Record<string, ToolUsageExample[]> = {
      search_documentation: [
        {
          title: 'Search for workflow help',
          description: 'Find documentation about workflow creation',
          userInput: 'How do I create a workflow?',
          parameters: { query: 'create workflow' },
          scenario: 'When you need help with workflow creation',
        },
      ],
      make_api_request: [
        {
          title: 'Get weather data',
          description: 'Fetch current weather from an API',
          parameters: {
            url: 'https://api.weather.com/current',
            method: 'GET',
            queryParams: { city: 'New York' },
          },
          scenario: 'When you need to fetch data from an external service',
        },
      ],
    }

    return examples[toolId] || []
  }

  private generateCommonQuestions(toolId: string): Array<{ question: string; answer: string }> {
    const questions: Record<string, Array<{ question: string; answer: string }>> = {
      build_workflow: [
        {
          question: 'What format should the workflow be in?',
          answer: 'Workflows should be provided in YAML format following the Sim workflow schema.',
        },
        {
          question: 'Can I build a workflow without YAML?',
          answer:
            'Currently, workflows must be defined in YAML format, but you can use the visual editor to generate YAML.',
        },
      ],
    }

    return questions[toolId] || []
  }

  private getToolIntegrations(toolId: string): string[] {
    const integrations: Record<string, string[]> = {
      list_gdrive_files: ['Google Drive'],
      read_gdrive_file: ['Google Drive'],
      search_online: ['Web Search APIs'],
    }

    return integrations[toolId] || []
  }
}
