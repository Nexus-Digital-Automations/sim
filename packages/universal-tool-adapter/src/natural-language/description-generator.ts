/**
 * Natural Language Description Generator
 *
 * Generates human-friendly descriptions and usage guidelines for all Sim tools
 * to enable intuitive conversational interactions with Parlant agents.
 *
 * @author NATURAL_LANGUAGE_ENGINE_AGENT
 * @version 1.0.0
 */

import type { ConversationalHint, NaturalLanguageConfig } from '../types/adapter-interfaces'
import type { ToolConfig } from '../types/tools-types'

// =============================================================================
// Core Description Templates
// =============================================================================

/**
 * Template for generating natural language descriptions
 */
export interface DescriptionTemplate {
  // Template metadata
  id: string
  name: string
  category: string

  // Template patterns
  purposeTemplate: string
  usageTemplate: string
  parameterTemplate: string
  resultTemplate: string

  // Conversational patterns
  whenToUseTemplate: string
  examplePhrasesTemplate: string[]

  // Context hints
  contextualHints: {
    businessContext: string[]
    technicalContext: string[]
    userTypeContext: Record<string, string>
  }
}

/**
 * Pre-defined templates for common tool categories
 */
export const TOOL_DESCRIPTION_TEMPLATES: Record<string, DescriptionTemplate> = {
  communication: {
    id: 'communication',
    name: 'Communication Tools',
    category: 'communication',
    purposeTemplate: 'Connect and communicate with others through {platform}',
    usageTemplate: 'Use when you need to {action} with {target}',
    parameterTemplate: 'Provide {paramName}: {description}',
    resultTemplate: 'Successfully {pastAction} {result}',
    whenToUseTemplate: 'When you need to send messages, emails, or collaborate',
    examplePhrasesTemplate: [
      'send an email to {recipient}',
      'message {person} about {topic}',
      'schedule a meeting with {team}',
    ],
    contextualHints: {
      businessContext: ['team coordination', 'client communication', 'project updates'],
      technicalContext: ['API integration', 'OAuth authentication', 'message formatting'],
      userTypeContext: {
        'business-user': 'Perfect for staying connected with your team and clients',
        developer: 'Integrate communication workflows into your applications',
        manager: 'Coordinate teams and manage project communications',
      },
    },
  },

  data_storage: {
    id: 'data_storage',
    name: 'Data Storage Tools',
    category: 'data',
    purposeTemplate: 'Store, retrieve, and manage data in {platform}',
    usageTemplate: 'Use when you need to {action} data from {source}',
    parameterTemplate: 'Specify {paramName}: {description}',
    resultTemplate: 'Data {pastAction} successfully',
    whenToUseTemplate: 'When you need to store, query, or manage structured data',
    examplePhrasesTemplate: [
      'save data to {database}',
      'find records where {condition}',
      'update {table} with {data}',
    ],
    contextualHints: {
      businessContext: ['data analytics', 'customer management', 'inventory tracking'],
      technicalContext: ['database queries', 'data persistence', 'CRUD operations'],
      userTypeContext: {
        'business-user': 'Easily manage your business data and records',
        developer: 'Integrate database operations into your workflows',
        analyst: 'Query and analyze data for insights',
      },
    },
  },

  productivity: {
    id: 'productivity',
    name: 'Productivity Tools',
    category: 'productivity',
    purposeTemplate: 'Enhance productivity by {capability} with {platform}',
    usageTemplate: 'Use when you want to {action} more efficiently',
    parameterTemplate: 'Configure {paramName}: {description}',
    resultTemplate: 'Task {pastAction} to boost productivity',
    whenToUseTemplate: 'When you need to automate tasks or improve efficiency',
    examplePhrasesTemplate: [
      'create a {document} for {purpose}',
      'schedule {task} for {time}',
      'organize {content} in {system}',
    ],
    contextualHints: {
      businessContext: ['task management', 'document creation', 'workflow automation'],
      technicalContext: ['API integrations', 'data formatting', 'automation logic'],
      userTypeContext: {
        'business-user': 'Streamline your daily tasks and workflows',
        developer: 'Automate development and deployment processes',
        manager: 'Organize team tasks and track progress',
      },
    },
  },

  search_research: {
    id: 'search_research',
    name: 'Search & Research Tools',
    category: 'research',
    purposeTemplate: 'Search and research information using {platform}',
    usageTemplate: 'Use when you need to find {type} about {topic}',
    parameterTemplate: 'Search for {paramName}: {description}',
    resultTemplate: 'Found {count} relevant {resultType}',
    whenToUseTemplate: 'When you need to research, discover, or gather information',
    examplePhrasesTemplate: [
      'search for {query}',
      'find information about {topic}',
      'research {subject} thoroughly',
    ],
    contextualHints: {
      businessContext: ['market research', 'competitive analysis', 'content discovery'],
      technicalContext: ['search algorithms', 'data retrieval', 'result ranking'],
      userTypeContext: {
        'business-user': 'Research markets, competitors, and opportunities',
        developer: 'Find technical documentation and code examples',
        researcher: 'Conduct comprehensive research across multiple sources',
      },
    },
  },

  ai_ml: {
    id: 'ai_ml',
    name: 'AI & Machine Learning Tools',
    category: 'ai',
    purposeTemplate: 'Leverage AI capabilities for {purpose} using {platform}',
    usageTemplate: 'Use when you need AI-powered {capability}',
    parameterTemplate: 'Input {paramName}: {description}',
    resultTemplate: 'AI generated {result} successfully',
    whenToUseTemplate: 'When you need artificial intelligence or machine learning capabilities',
    examplePhrasesTemplate: [
      'generate {content} using AI',
      'analyze {data} with machine learning',
      'create {output} automatically',
    ],
    contextualHints: {
      businessContext: ['content generation', 'data analysis', 'automation'],
      technicalContext: ['neural networks', 'model inference', 'API integrations'],
      userTypeContext: {
        'business-user': 'Harness AI to create content and analyze data',
        developer: 'Integrate AI capabilities into your applications',
        'data-scientist': 'Apply machine learning models to solve problems',
      },
    },
  },
}

// =============================================================================
// Description Generator Class
// =============================================================================

/**
 * Generates natural language descriptions for tools
 */
export class DescriptionGenerator {
  private templates: Map<string, DescriptionTemplate>

  constructor(customTemplates?: DescriptionTemplate[]) {
    this.templates = new Map()

    // Load default templates
    Object.values(TOOL_DESCRIPTION_TEMPLATES).forEach((template) => {
      this.templates.set(template.id, template)
    })

    // Add custom templates
    customTemplates?.forEach((template) => {
      this.templates.set(template.id, template)
    })
  }

  /**
   * Generate natural language configuration for a tool
   */
  generateNaturalLanguageConfig(
    tool: ToolConfig,
    category?: string,
    customContext?: Record<string, any>
  ): NaturalLanguageConfig {
    const template = this.getTemplateForTool(tool, category)

    return {
      usageDescription: this.generateUsageDescription(tool, template, customContext),
      exampleUsage: this.generateExampleUsage(tool, template, customContext),
      conversationalHints: this.generateConversationalHints(tool, template, customContext),
      aliases: this.generateAliases(tool),
      keywords: this.generateKeywords(tool, template, customContext),
    }
  }

  /**
   * Generate user-friendly tool description
   */
  generateToolDescription(tool: ToolConfig, category?: string, userType?: string): string {
    const template = this.getTemplateForTool(tool, category)

    // Extract key information from tool
    const toolName = tool.name || tool.id
    const platform = this.extractPlatform(tool)
    const capability = this.extractCapability(tool)

    // Generate contextual description based on user type
    const baseDescription = template.purposeTemplate
      .replace('{platform}', platform)
      .replace('{capability}', capability)

    const userContext = userType
      ? template.contextualHints.userTypeContext[userType]
      : 'A versatile tool for various use cases'

    return `${baseDescription}. ${userContext}`
  }

  /**
   * Generate conversational examples
   */
  generateConversationalExamples(tool: ToolConfig, category?: string, count = 3): string[] {
    const template = this.getTemplateForTool(tool, category)
    const params = this.extractParameterInfo(tool)

    return template.examplePhrasesTemplate
      .slice(0, count)
      .map((phrase) => this.populateTemplate(phrase, { tool, params }))
  }

  /**
   * Generate contextual usage guidelines
   */
  generateUsageGuidelines(
    tool: ToolConfig,
    category?: string
  ): {
    whenToUse: string
    bestPractices: string[]
    commonScenarios: string[]
  } {
    const template = this.getTemplateForTool(tool, category)

    return {
      whenToUse: template.whenToUseTemplate,
      bestPractices: this.generateBestPractices(tool, template),
      commonScenarios: template.contextualHints.businessContext.map(
        (context) => `${context}: ${this.generateScenarioDescription(tool, context)}`
      ),
    }
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private getTemplateForTool(tool: ToolConfig, category?: string): DescriptionTemplate {
    // Try to find specific template based on category
    if (category && this.templates.has(category)) {
      return this.templates.get(category)!
    }

    // Try to infer category from tool properties
    const inferredCategory = this.inferCategory(tool)
    if (inferredCategory && this.templates.has(inferredCategory)) {
      return this.templates.get(inferredCategory)!
    }

    // Fall back to generic template
    return this.templates.get('productivity') || TOOL_DESCRIPTION_TEMPLATES.productivity
  }

  private inferCategory(tool: ToolConfig): string | null {
    const toolId = tool.id.toLowerCase()
    const toolName = (tool.name || '').toLowerCase()

    // Communication tools
    if (
      ['gmail', 'outlook', 'slack', 'discord', 'teams', 'telegram', 'whatsapp', 'mail'].some(
        (term) => toolId.includes(term) || toolName.includes(term)
      )
    ) {
      return 'communication'
    }

    // Data storage tools
    if (
      ['mongodb', 'mysql', 'postgresql', 'pinecone', 'qdrant', 'supabase', 'airtable'].some(
        (term) => toolId.includes(term) || toolName.includes(term)
      )
    ) {
      return 'data_storage'
    }

    // Search/research tools
    if (
      ['search', 'exa', 'serper', 'google', 'arxiv', 'wikipedia', 'tavily'].some(
        (term) => toolId.includes(term) || toolName.includes(term)
      )
    ) {
      return 'search_research'
    }

    // AI/ML tools
    if (
      ['openai', 'huggingface', 'elevenlabs', 'mistral', 'perplexity'].some(
        (term) => toolId.includes(term) || toolName.includes(term)
      )
    ) {
      return 'ai_ml'
    }

    return null
  }

  private generateUsageDescription(
    tool: ToolConfig,
    template: DescriptionTemplate,
    context?: Record<string, any>
  ): string {
    const platform = this.extractPlatform(tool)
    const capability = this.extractCapability(tool)
    const action = this.extractPrimaryAction(tool)

    return template.usageTemplate
      .replace('{action}', action)
      .replace('{platform}', platform)
      .replace('{capability}', capability)
  }

  private generateExampleUsage(
    tool: ToolConfig,
    template: DescriptionTemplate,
    context?: Record<string, any>
  ): string[] {
    const examples: string[] = []
    const params = this.extractParameterInfo(tool)

    // Generate examples based on template patterns
    template.examplePhrasesTemplate.forEach((phrase) => {
      const example = this.populateTemplate(phrase, { tool, params, context })
      examples.push(example)
    })

    return examples
  }

  private generateConversationalHints(
    tool: ToolConfig,
    template: DescriptionTemplate,
    context?: Record<string, any>
  ): ConversationalHint {
    return {
      whenToUse: template.whenToUseTemplate,
      parameters: this.generateParameterHints(tool, template),
      results: this.generateResultHints(tool, template),
    }
  }

  private generateAliases(tool: ToolConfig): string[] {
    const aliases: string[] = []
    const toolName = tool.name || tool.id

    // Add variations of the tool name
    aliases.push(toolName.toLowerCase())
    aliases.push(toolName.replace(/[_-]/g, ' '))

    // Add platform-specific aliases
    const platform = this.extractPlatform(tool)
    if (platform !== toolName) {
      aliases.push(platform)
    }

    return [...new Set(aliases)] // Remove duplicates
  }

  private generateKeywords(
    tool: ToolConfig,
    template: DescriptionTemplate,
    context?: Record<string, any>
  ): string[] {
    const keywords: string[] = []

    // Add category keywords
    keywords.push(...template.contextualHints.businessContext)
    keywords.push(...template.contextualHints.technicalContext)

    // Add tool-specific keywords
    const platform = this.extractPlatform(tool)
    const capability = this.extractCapability(tool)

    keywords.push(platform, capability)

    // Add parameter-based keywords
    Object.keys(tool.params || {}).forEach((param) => {
      keywords.push(param)
    })

    return [...new Set(keywords.filter(Boolean))] // Remove duplicates and empty values
  }

  private extractPlatform(tool: ToolConfig): string {
    // Extract platform name from tool ID or name
    const id = tool.id.toLowerCase()

    // Common platforms
    const platforms = {
      gmail: 'Gmail',
      slack: 'Slack',
      discord: 'Discord',
      notion: 'Notion',
      airtable: 'Airtable',
      github: 'GitHub',
      mongodb: 'MongoDB',
      mysql: 'MySQL',
      postgresql: 'PostgreSQL',
      google: 'Google',
      microsoft: 'Microsoft',
      openai: 'OpenAI',
    }

    for (const [key, name] of Object.entries(platforms)) {
      if (id.includes(key)) {
        return name
      }
    }

    // Fallback to formatted tool name
    return tool.name || tool.id.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  private extractCapability(tool: ToolConfig): string {
    const description = tool.description || ''
    const id = tool.id.toLowerCase()

    // Common capabilities
    if (id.includes('send') || description.includes('send')) return 'sending messages'
    if (id.includes('read') || description.includes('read')) return 'reading data'
    if (id.includes('search') || description.includes('search')) return 'searching information'
    if (id.includes('create') || description.includes('create')) return 'creating content'
    if (id.includes('update') || description.includes('update')) return 'updating records'
    if (id.includes('delete') || description.includes('delete')) return 'deleting data'
    if (id.includes('query') || description.includes('query')) return 'querying databases'

    return 'data processing'
  }

  private extractPrimaryAction(tool: ToolConfig): string {
    const id = tool.id.toLowerCase()

    // Extract action from tool ID
    if (id.includes('send')) return 'send'
    if (id.includes('read')) return 'read'
    if (id.includes('get')) return 'get'
    if (id.includes('create')) return 'create'
    if (id.includes('update')) return 'update'
    if (id.includes('delete')) return 'delete'
    if (id.includes('search')) return 'search'
    if (id.includes('query')) return 'query'
    if (id.includes('execute')) return 'execute'

    return 'use'
  }

  private extractParameterInfo(tool: ToolConfig): Record<string, string> {
    const params: Record<string, string> = {}

    Object.entries(tool.params || {}).forEach(([name, config]) => {
      if (typeof config === 'object' && config.description) {
        params[name] = config.description
      }
    })

    return params
  }

  private populateTemplate(
    template: string,
    context: { tool: ToolConfig; params: Record<string, string>; context?: any }
  ): string {
    let result = template

    // Replace common placeholders
    result = result.replace('{platform}', this.extractPlatform(context.tool))
    result = result.replace('{capability}', this.extractCapability(context.tool))
    result = result.replace('{action}', this.extractPrimaryAction(context.tool))

    // Replace parameter placeholders
    Object.entries(context.params).forEach(([name, description]) => {
      result = result.replace(`{${name}}`, `{${description}}`)
    })

    // Generic replacements for common placeholders
    const genericReplacements = {
      '{recipient}': 'the recipient',
      '{person}': 'someone',
      '{topic}': 'a topic',
      '{team}': 'your team',
      '{database}': 'the database',
      '{table}': 'the table',
      '{query}': 'your search terms',
      '{document}': 'a document',
      '{content}': 'content',
    }

    Object.entries(genericReplacements).forEach(([placeholder, replacement]) => {
      result = result.replace(new RegExp(placeholder, 'g'), replacement)
    })

    return result
  }

  private generateBestPractices(tool: ToolConfig, template: DescriptionTemplate): string[] {
    const practices: string[] = []

    // Generic best practices based on template category
    switch (template.id) {
      case 'communication':
        practices.push('Verify recipient information before sending')
        practices.push('Use clear and concise language')
        practices.push('Include relevant context in your messages')
        break

      case 'data_storage':
        practices.push('Always backup important data')
        practices.push('Use proper data validation')
        practices.push('Follow database naming conventions')
        break

      case 'search_research':
        practices.push('Use specific and relevant keywords')
        practices.push('Combine multiple search terms for better results')
        practices.push('Verify information from multiple sources')
        break

      case 'ai_ml':
        practices.push('Provide clear and specific prompts')
        practices.push('Review AI-generated content carefully')
        practices.push('Understand model limitations')
        break

      default:
        practices.push('Follow the tool documentation')
        practices.push('Test with small datasets first')
        practices.push('Monitor for errors and edge cases')
    }

    return practices
  }

  private generateScenarioDescription(tool: ToolConfig, context: string): string {
    const action = this.extractPrimaryAction(tool)
    const platform = this.extractPlatform(tool)

    return `Use ${platform} to ${action} ${context.toLowerCase()}`
  }

  private generateParameterHints(tool: ToolConfig, template: DescriptionTemplate): string {
    const requiredParams: string[] = []
    const optionalParams: string[] = []

    Object.entries(tool.params || {}).forEach(([name, config]) => {
      if (typeof config === 'object') {
        const hint = `${name}: ${config.description || 'parameter value'}`

        if (config.required) {
          requiredParams.push(hint)
        } else {
          optionalParams.push(hint)
        }
      }
    })

    let result = ''

    if (requiredParams.length > 0) {
      result += `Required: ${requiredParams.join(', ')}`
    }

    if (optionalParams.length > 0) {
      if (result) result += '. '
      result += `Optional: ${optionalParams.join(', ')}`
    }

    return result || 'No specific parameters required'
  }

  private generateResultHints(tool: ToolConfig, template: DescriptionTemplate): string {
    // Generate hints based on tool outputs or common patterns
    const outputs = tool.outputs || {}

    if (Object.keys(outputs).length > 0) {
      const outputDescriptions = Object.entries(outputs).map(([key, config]) => {
        if (typeof config === 'object' && config !== null && config.description) {
          return `${key}: ${config.description}`
        }
        return key
      })

      return `Returns: ${outputDescriptions.join(', ')}`
    }

    // Fallback based on tool type
    const action = this.extractPrimaryAction(tool)
    return `${action.charAt(0).toUpperCase() + action.slice(1)} operation completed successfully`
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a description generator with default templates
 */
export function createDescriptionGenerator(
  customTemplates?: DescriptionTemplate[]
): DescriptionGenerator {
  return new DescriptionGenerator(customTemplates)
}

/**
 * Generate natural language config for a single tool
 */
export function generateToolNaturalLanguage(
  tool: ToolConfig,
  category?: string,
  options?: {
    userType?: string
    customContext?: Record<string, any>
    includeExamples?: boolean
  }
): NaturalLanguageConfig & { description: string; examples: string[]; guidelines: any } {
  const generator = createDescriptionGenerator()

  const config = generator.generateNaturalLanguageConfig(tool, category, options?.customContext)
  const description = generator.generateToolDescription(tool, category, options?.userType)
  const examples = options?.includeExamples
    ? generator.generateConversationalExamples(tool, category)
    : []
  const guidelines = generator.generateUsageGuidelines(tool, category)

  return {
    ...config,
    description,
    examples,
    guidelines,
  }
}
