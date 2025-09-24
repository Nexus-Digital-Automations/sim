/**
 * Universal Tool Adapter System for Sim-Parlant Integration
 * ========================================================
 *
 * This module implements the Universal Tool Adapter System that bridges
 * Sim's existing 70+ tools with Parlant's conversational AI interface.
 *
 * Key Features:
 * - Natural language descriptions for all tools
 * - Context-aware tool recommendations
 * - Conversational parameter input and validation
 * - Intelligent result formatting for chat interfaces
 * - Real-time tool suggestion and usage guidance
 * - Multi-modal tool interaction support
 *
 * Architecture:
 * - Tool Registry: Centralized catalog of all available tools
 * - Adapter Pattern: Converts Sim BlockConfig to Parlant Tool format
 * - Natural Language Engine: Provides descriptions and usage guidance
 * - Context Engine: Understands conversation flow for tool recommendations
 * - Result Formatter: Converts tool outputs to conversational format
 */

import type { BlockConfig } from '@/blocks/types'
import type { Tool, ToolExecution, AuthContext } from './types'

// =============================================
// Core Types and Interfaces
// =============================================

/**
 * Enhanced tool description with natural language intelligence
 */
export interface EnhancedToolDescription {
  /** Unique identifier for the tool */
  id: string
  /** Human-readable name */
  name: string
  /** Brief description for quick understanding */
  shortDescription: string
  /** Comprehensive explanation with use cases */
  longDescription: string
  /** Natural language usage examples */
  usageExamples: string[]
  /** When to use this tool vs alternatives */
  usageGuidelines: {
    /** Scenarios where this tool is most appropriate */
    bestUsedFor: string[]
    /** Situations where other tools might be better */
    avoidWhen: string[]
    /** Common mistakes users make */
    commonMistakes: string[]
  }
  /** Conversational prompts to help users configure the tool */
  conversationalPrompts: {
    /** Questions to ask when configuring parameters */
    parameterQuestions: Array<{
      parameter: string
      question: string
      examples: string[]
      validation?: string
    }>
    /** Follow-up questions based on user input */
    followUpQuestions?: Array<{
      condition: string
      question: string
      examples: string[]
    }>
  }
  /** Tags for categorization and search */
  tags: string[]
  /** Difficulty level for new users */
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  /** Integration complexity */
  complexity: 'simple' | 'moderate' | 'complex'
}

/**
 * Tool recommendation context
 */
export interface ToolRecommendationContext {
  /** Current conversation history */
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
  /** User's stated goals or intentions */
  userIntents: string[]
  /** Previously used tools in this session */
  usedTools: string[]
  /** Current workflow context if available */
  workflowContext?: {
    workflowId: string
    currentStep: number
    availableInputs: Record<string, any>
  }
  /** User's skill level and preferences */
  userProfile?: {
    skillLevel: 'beginner' | 'intermediate' | 'advanced'
    preferredCategories: string[]
    frequentlyUsedTools: string[]
  }
}

/**
 * Tool recommendation with confidence scoring
 */
export interface ToolRecommendation {
  /** The recommended tool */
  tool: EnhancedToolDescription
  /** Confidence score (0-1) */
  confidence: number
  /** Reasoning for the recommendation */
  reasoning: string
  /** Suggested parameter values based on context */
  suggestedParameters: Record<string, any>
  /** Natural language explanation of how to use it */
  usageExplanation: string
}

/**
 * Conversational tool interaction
 */
export interface ConversationalToolExecution {
  /** Original tool execution */
  execution: ToolExecution
  /** Natural language explanation of what happened */
  explanation: string
  /** Formatted result for conversation display */
  conversationalResult: {
    /** Summary suitable for chat display */
    summary: string
    /** Detailed breakdown if user requests more info */
    details?: string
    /** Suggested next actions */
    suggestedNextSteps?: string[]
  }
  /** Any errors formatted for user understanding */
  userFriendlyErrors?: string[]
}

// =============================================
// Tool Registry System
// =============================================

/**
 * Centralized registry of all Sim tools with enhanced descriptions
 */
export class SimToolRegistry {
  private tools: Map<string, EnhancedToolDescription> = new Map()
  private blockConfigs: Map<string, BlockConfig> = new Map()
  private categories: Map<string, string[]> = new Map()

  /**
   * Register a Sim block configuration with enhanced description
   */
  registerTool(blockConfig: BlockConfig, enhancedDescription: EnhancedToolDescription): void {
    this.blockConfigs.set(blockConfig.type, blockConfig)
    this.tools.set(blockConfig.type, enhancedDescription)

    // Update category index
    const category = blockConfig.category || 'other'
    if (!this.categories.has(category)) {
      this.categories.set(category, [])
    }
    this.categories.get(category)!.push(blockConfig.type)
  }

  /**
   * Get all available tools
   */
  getAllTools(): EnhancedToolDescription[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tool by ID
   */
  getTool(id: string): EnhancedToolDescription | undefined {
    return this.tools.get(id)
  }

  /**
   * Get block configuration by tool ID
   */
  getBlockConfig(id: string): BlockConfig | undefined {
    return this.blockConfigs.get(id)
  }

  /**
   * Search tools by query
   */
  searchTools(query: string, options?: {
    categories?: string[]
    tags?: string[]
    difficulty?: Array<'beginner' | 'intermediate' | 'advanced'>
  }): EnhancedToolDescription[] {
    const searchTerms = query.toLowerCase().split(' ')
    const results = Array.from(this.tools.values()).filter(tool => {
      // Check category filter
      if (options?.categories?.length) {
        const blockConfig = this.blockConfigs.get(tool.id)
        if (!blockConfig || !options.categories.includes(blockConfig.category || 'other')) {
          return false
        }
      }

      // Check tag filter
      if (options?.tags?.length) {
        const hasRequiredTag = options.tags.some(tag => tool.tags.includes(tag))
        if (!hasRequiredTag) return false
      }

      // Check difficulty filter
      if (options?.difficulty?.length && !options.difficulty.includes(tool.difficulty)) {
        return false
      }

      // Text search
      const searchText = `${tool.name} ${tool.shortDescription} ${tool.longDescription} ${tool.tags.join(' ')}`.toLowerCase()
      return searchTerms.every(term => searchText.includes(term))
    })

    // Sort by relevance (simple scoring)
    return results.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, searchTerms)
      const bScore = this.calculateRelevanceScore(b, searchTerms)
      return bScore - aScore
    })
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): EnhancedToolDescription[] {
    const toolIds = this.categories.get(category) || []
    return toolIds.map(id => this.tools.get(id)!).filter(Boolean)
  }

  /**
   * Calculate relevance score for search ranking
   */
  private calculateRelevanceScore(tool: EnhancedToolDescription, searchTerms: string[]): number {
    let score = 0
    const text = `${tool.name} ${tool.shortDescription}`.toLowerCase()

    searchTerms.forEach(term => {
      if (tool.name.toLowerCase().includes(term)) score += 10
      if (tool.shortDescription.toLowerCase().includes(term)) score += 5
      if (tool.longDescription.toLowerCase().includes(term)) score += 2
      if (tool.tags.some(tag => tag.toLowerCase().includes(term))) score += 3
    })

    return score
  }
}

// =============================================
// Universal Tool Adapter
// =============================================

/**
 * Converts Sim BlockConfig to Parlant Tool format with natural language enhancements
 */
export class UniversalToolAdapter {
  constructor(private registry: SimToolRegistry) {}

  /**
   * Convert Sim block to Parlant tool format
   */
  adaptTool(blockConfig: BlockConfig, context?: ToolRecommendationContext): Tool {
    const enhanced = this.registry.getTool(blockConfig.type)
    if (!enhanced) {
      throw new Error(`Tool not found in registry: ${blockConfig.type}`)
    }

    return {
      id: blockConfig.type,
      name: enhanced.name,
      description: this.generateContextualDescription(enhanced, context),
      parameters: this.extractParameterSchema(blockConfig, enhanced)
    }
  }

  /**
   * Generate contextual description based on conversation context
   */
  private generateContextualDescription(tool: EnhancedToolDescription, context?: ToolRecommendationContext): string {
    let description = tool.longDescription

    // Add contextual guidance based on conversation history
    if (context?.userIntents?.length) {
      const relevantExamples = tool.usageExamples.filter(example =>
        context.userIntents.some(intent =>
          example.toLowerCase().includes(intent.toLowerCase())
        )
      )

      if (relevantExamples.length > 0) {
        description += `\n\nBased on your current goals, here are relevant examples:\n${relevantExamples.join('\n')}`
      }
    }

    // Add warnings about common mistakes
    if (tool.usageGuidelines.commonMistakes.length > 0) {
      description += `\n\n⚠️ Common mistakes to avoid:\n${tool.usageGuidelines.commonMistakes.map(m => `• ${m}`).join('\n')}`
    }

    return description
  }

  /**
   * Extract parameter schema from block configuration
   */
  private extractParameterSchema(blockConfig: BlockConfig, enhanced: EnhancedToolDescription): Record<string, any> {
    const schema: Record<string, any> = {}

    // Convert inputs to parameter schema
    if (blockConfig.inputs) {
      Object.entries(blockConfig.inputs).forEach(([key, input]) => {
        schema[key] = {
          type: input.type,
          description: input.description,
          required: blockConfig.subBlocks?.find(sub => sub.id === key)?.required || false
        }

        // Add conversational prompts for better UX
        const prompt = enhanced.conversationalPrompts.parameterQuestions.find(p => p.parameter === key)
        if (prompt) {
          schema[key].conversationalPrompt = prompt.question
          schema[key].examples = prompt.examples
          if (prompt.validation) {
            schema[key].validation = prompt.validation
          }
        }
      })
    }

    return schema
  }
}

// =============================================
// Natural Language Intelligence Engine
// =============================================

/**
 * Provides natural language intelligence for tool interactions
 */
export class ToolIntelligenceEngine {
  constructor(private registry: SimToolRegistry, private adapter: UniversalToolAdapter) {}

  /**
   * Recommend tools based on conversation context
   */
  recommendTools(context: ToolRecommendationContext, limit: number = 5): ToolRecommendation[] {
    const allTools = this.registry.getAllTools()
    const recommendations: ToolRecommendation[] = []

    for (const tool of allTools) {
      const confidence = this.calculateToolRelevance(tool, context)
      if (confidence > 0.1) { // Minimum confidence threshold
        recommendations.push({
          tool,
          confidence,
          reasoning: this.generateRecommendationReasoning(tool, context, confidence),
          suggestedParameters: this.suggestParameters(tool, context),
          usageExplanation: this.generateUsageExplanation(tool, context)
        })
      }
    }

    // Sort by confidence and return top recommendations
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
  }

  /**
   * Calculate how relevant a tool is to the current context
   */
  private calculateToolRelevance(tool: EnhancedToolDescription, context: ToolRecommendationContext): number {
    let score = 0

    // Intent matching
    context.userIntents.forEach(intent => {
      const intentLower = intent.toLowerCase()

      // Check if intent matches tool usage guidelines
      tool.usageGuidelines.bestUsedFor.forEach(usage => {
        if (usage.toLowerCase().includes(intentLower) || intentLower.includes(usage.toLowerCase())) {
          score += 0.3
        }
      })

      // Check examples
      tool.usageExamples.forEach(example => {
        if (example.toLowerCase().includes(intentLower) || intentLower.includes(example.toLowerCase())) {
          score += 0.2
        }
      })

      // Check tags
      tool.tags.forEach(tag => {
        if (tag.toLowerCase().includes(intentLower) || intentLower.includes(tag.toLowerCase())) {
          score += 0.1
        }
      })
    })

    // Conversation history matching
    const conversationText = context.conversationHistory
      .map(msg => msg.content.toLowerCase())
      .join(' ')

    tool.tags.forEach(tag => {
      if (conversationText.includes(tag.toLowerCase())) {
        score += 0.05
      }
    })

    // User profile matching
    if (context.userProfile) {
      // Skill level appropriateness
      if (context.userProfile.skillLevel === tool.difficulty) {
        score += 0.1
      } else if (
        context.userProfile.skillLevel === 'intermediate' &&
        (tool.difficulty === 'beginner' || tool.difficulty === 'advanced')
      ) {
        score += 0.05
      }

      // Preferred categories
      context.userProfile.preferredCategories?.forEach(category => {
        if (tool.tags.includes(category)) {
          score += 0.1
        }
      })

      // Frequently used tools (boost similar tools)
      context.userProfile.frequentlyUsedTools?.forEach(frequentTool => {
        const frequentToolData = this.registry.getTool(frequentTool)
        if (frequentToolData) {
          const commonTags = tool.tags.filter(tag => frequentToolData.tags.includes(tag))
          score += commonTags.length * 0.05
        }
      })
    }

    // Avoid recently used tools (unless specifically relevant)
    if (context.usedTools.includes(tool.id)) {
      score *= 0.7
    }

    return Math.min(score, 1.0) // Cap at 1.0
  }

  /**
   * Generate reasoning for why a tool was recommended
   */
  private generateRecommendationReasoning(
    tool: EnhancedToolDescription,
    context: ToolRecommendationContext,
    confidence: number
  ): string {
    const reasons: string[] = []

    // Check intent matching
    context.userIntents.forEach(intent => {
      const relevantUsages = tool.usageGuidelines.bestUsedFor.filter(usage =>
        usage.toLowerCase().includes(intent.toLowerCase()) ||
        intent.toLowerCase().includes(usage.toLowerCase())
      )

      if (relevantUsages.length > 0) {
        reasons.push(`matches your goal to ${intent}`)
      }
    })

    // Check conversation context
    const recentMessages = context.conversationHistory.slice(-3)
    const mentionedKeywords = recentMessages
      .flatMap(msg => msg.content.toLowerCase().split(' '))
      .filter(word => tool.tags.some(tag => tag.toLowerCase().includes(word)))

    if (mentionedKeywords.length > 0) {
      reasons.push(`you mentioned ${mentionedKeywords.slice(0, 2).join(' and ')}`)
    }

    // User profile reasons
    if (context.userProfile?.skillLevel === tool.difficulty) {
      reasons.push(`matches your ${tool.difficulty} skill level`)
    }

    if (reasons.length === 0) {
      reasons.push(`commonly used for similar tasks`)
    }

    return `Recommended because it ${reasons.join(' and ')}.`
  }

  /**
   * Suggest parameter values based on context
   */
  private suggestParameters(tool: EnhancedToolDescription, context: ToolRecommendationContext): Record<string, any> {
    const suggestions: Record<string, any> = {}

    // Extract potential parameter values from conversation history
    const conversationText = context.conversationHistory
      .map(msg => msg.content)
      .join(' ')

    // Look for email addresses, URLs, file names, etc.
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const urlRegex = /https?:\/\/[^\s]+/g
    const emails = conversationText.match(emailRegex) || []
    const urls = conversationText.match(urlRegex) || []

    // Suggest values based on tool type
    if (tool.id.includes('email') || tool.id.includes('gmail') || tool.id.includes('mail')) {
      if (emails.length > 0) {
        suggestions.to = emails[0]
      }
    }

    if (tool.id.includes('api') || tool.id.includes('webhook')) {
      if (urls.length > 0) {
        suggestions.url = urls[0]
      }
    }

    // Use workflow context if available
    if (context.workflowContext?.availableInputs) {
      // Match parameter names with available inputs
      Object.keys(context.workflowContext.availableInputs).forEach(input => {
        if (suggestions[input] === undefined) {
          suggestions[input] = `<${input}>`
        }
      })
    }

    return suggestions
  }

  /**
   * Generate usage explanation for the current context
   */
  private generateUsageExplanation(tool: EnhancedToolDescription, context: ToolRecommendationContext): string {
    const relevantExamples = tool.usageExamples.filter(example => {
      return context.userIntents.some(intent =>
        example.toLowerCase().includes(intent.toLowerCase()) ||
        intent.toLowerCase().includes(example.toLowerCase())
      )
    })

    if (relevantExamples.length > 0) {
      return `For your current task: ${relevantExamples[0]}`
    }

    return tool.usageExamples[0] || tool.shortDescription
  }

  /**
   * Format tool execution results for conversational display
   */
  formatExecutionResult(execution: ToolExecution, tool: EnhancedToolDescription): ConversationalToolExecution {
    let explanation = `Executed ${tool.name} successfully.`
    let summary = 'Task completed.'
    let details: string | undefined
    let suggestedNextSteps: string[] | undefined
    let userFriendlyErrors: string[] | undefined

    // Handle different result types
    if (execution.result) {
      if (typeof execution.result === 'object') {
        // API responses, structured data
        if (execution.result.status) {
          explanation = `${tool.name} returned status ${execution.result.status}.`
          summary = `Request completed with status ${execution.result.status}.`
        }

        if (execution.result.data) {
          details = `Result: ${JSON.stringify(execution.result.data, null, 2)}`
        }
      } else if (typeof execution.result === 'string') {
        summary = execution.result.length > 100
          ? execution.result.substring(0, 100) + '...'
          : execution.result
        details = execution.result
      }
    }

    // Handle errors
    if (execution.status === 'failed' && execution.error) {
      explanation = `${tool.name} encountered an error.`
      summary = 'Task failed.'
      userFriendlyErrors = [this.formatErrorForUser(execution.error, tool)]
    }

    // Suggest next steps based on tool type and result
    if (execution.status === 'completed') {
      suggestedNextSteps = this.generateNextSteps(tool, execution.result)
    }

    return {
      execution,
      explanation,
      conversationalResult: {
        summary,
        details,
        suggestedNextSteps
      },
      userFriendlyErrors
    }
  }

  /**
   * Format error messages for user understanding
   */
  private formatErrorForUser(error: string, tool: EnhancedToolDescription): string {
    // Common error patterns and user-friendly explanations
    const errorPatterns = [
      {
        pattern: /authentication|auth|token|credential/i,
        message: `Authentication issue with ${tool.name}. Please check your login credentials and try again.`
      },
      {
        pattern: /network|connection|timeout/i,
        message: `Network connection problem with ${tool.name}. Please check your internet connection and try again.`
      },
      {
        pattern: /rate limit|quota|too many requests/i,
        message: `${tool.name} is temporarily unavailable due to rate limits. Please wait a moment and try again.`
      },
      {
        pattern: /invalid|validation|required/i,
        message: `Some required information is missing or invalid for ${tool.name}. Please check your input and try again.`
      }
    ]

    for (const pattern of errorPatterns) {
      if (pattern.pattern.test(error)) {
        return pattern.message
      }
    }

    return `${tool.name} encountered an error: ${error.substring(0, 100)}${error.length > 100 ? '...' : ''}`
  }

  /**
   * Generate suggested next steps based on tool execution
   */
  private generateNextSteps(tool: EnhancedToolDescription, result: any): string[] {
    const steps: string[] = []

    // Tool-specific suggestions
    if (tool.id.includes('email') || tool.id.includes('gmail')) {
      steps.push('Check your sent folder to confirm delivery')
      steps.push('Set up email tracking if needed')
    } else if (tool.id.includes('api') || tool.id.includes('http')) {
      steps.push('Process the API response data')
      steps.push('Handle any errors in the response')
    } else if (tool.id.includes('database') || tool.id.includes('sql')) {
      steps.push('Verify the data was updated correctly')
      steps.push('Consider backing up important changes')
    } else if (tool.id.includes('file') || tool.id.includes('s3') || tool.id.includes('drive')) {
      steps.push('Verify the file was uploaded/downloaded correctly')
      steps.push('Share the file if needed')
    }

    // Generic suggestions
    if (steps.length === 0) {
      steps.push('Review the results')
      steps.push('Consider next actions in your workflow')
    }

    return steps.slice(0, 3) // Limit to 3 suggestions
  }
}

// =============================================
// Enhanced Tool Descriptions
// =============================================

/**
 * Pre-defined enhanced descriptions for common Sim tools
 */
export const ENHANCED_TOOL_DESCRIPTIONS: Record<string, EnhancedToolDescription> = {
  function: {
    id: 'function',
    name: 'Function',
    shortDescription: 'Execute custom JavaScript or Python code within your workflow',
    longDescription: 'Run custom logic with JavaScript or Python. Perfect for data transformation, calculations, API processing, and complex business logic. Choose between local execution (fast) or remote execution (secure sandbox with imports).',
    usageExamples: [
      'Transform data between different formats',
      'Calculate business metrics and KPIs',
      'Process API responses and extract key information',
      'Validate and clean user input data',
      'Generate dynamic content based on variables'
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Custom data transformations',
        'Complex calculations and logic',
        'API response processing',
        'Data validation and cleaning',
        'Dynamic content generation'
      ],
      avoidWhen: [
        'Simple operations that existing tools can handle',
        'Long-running processes (use appropriate service tools)',
        'File operations (use File tools instead)',
        'Database operations (use Database tools instead)'
      ],
      commonMistakes: [
        'Not handling errors properly in the code',
        'Forgetting to return values',
        'Using synchronous APIs in async contexts',
        'Not validating input parameters'
      ]
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'code',
          question: 'What logic do you want to implement? Describe the transformation or calculation you need.',
          examples: [
            'Convert temperature from Celsius to Fahrenheit',
            'Calculate total price with tax and discount',
            'Extract email addresses from text',
            'Generate a random password'
          ],
          validation: 'Code must be valid JavaScript or Python'
        },
        {
          parameter: 'language',
          question: 'Do you prefer JavaScript or Python for this task?',
          examples: ['JavaScript for web APIs', 'Python for data science'],
        },
        {
          parameter: 'remoteExecution',
          question: 'Do you need to import external libraries or packages?',
          examples: ['Yes, for numpy/pandas', 'No, using built-in functions only'],
        }
      ]
    },
    tags: ['code', 'programming', 'transformation', 'calculation', 'logic', 'custom'],
    difficulty: 'intermediate',
    complexity: 'moderate'
  },

  api: {
    id: 'api',
    name: 'API',
    shortDescription: 'Connect to any REST API with full HTTP method support',
    longDescription: 'Make HTTP requests to any API endpoint. Supports all HTTP methods (GET, POST, PUT, DELETE, PATCH) with custom headers, query parameters, and request bodies. Perfect for integrating with third-party services and internal APIs.',
    usageExamples: [
      'Fetch user data from a CRM system',
      'Submit form data to an external service',
      'Update records in a third-party database',
      'Trigger webhooks and notifications',
      'Integrate with payment processors'
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Third-party API integrations',
        'Custom webhook triggers',
        'Data synchronization between systems',
        'External service interactions',
        'REST API communications'
      ],
      avoidWhen: [
        'Specific service tools are available (use Gmail tool instead of Gmail API)',
        'Complex authentication flows (use OAuth tools)',
        'File uploads (use dedicated file tools)',
        'Real-time communications (use WebSocket tools)'
      ],
      commonMistakes: [
        'Not handling HTTP error codes properly',
        'Missing required headers or authentication',
        'Incorrect JSON formatting in request body',
        'Not encoding query parameters properly'
      ]
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'url',
          question: 'What API endpoint do you want to call?',
          examples: [
            'https://api.example.com/users',
            'https://jsonplaceholder.typicode.com/posts',
            'https://api.github.com/user'
          ],
          validation: 'Must be a valid HTTP/HTTPS URL'
        },
        {
          parameter: 'method',
          question: 'What HTTP method do you need?',
          examples: [
            'GET to fetch data',
            'POST to create new records',
            'PUT to update existing data',
            'DELETE to remove records'
          ]
        },
        {
          parameter: 'headers',
          question: 'Do you need any custom headers (like API keys or content type)?',
          examples: [
            'Authorization: Bearer your-token',
            'Content-Type: application/json',
            'X-API-Key: your-api-key'
          ]
        }
      ]
    },
    tags: ['api', 'http', 'rest', 'web', 'integration', 'external'],
    difficulty: 'beginner',
    complexity: 'simple'
  },

  slack: {
    id: 'slack',
    name: 'Slack',
    shortDescription: 'Send messages, create canvases, and read Slack conversations',
    longDescription: 'Integrate with Slack to send messages, create rich canvases, and read channel conversations. Supports both OAuth and bot token authentication. Can trigger workflows from Slack events and provide real-time team collaboration.',
    usageExamples: [
      'Send automated status updates to team channels',
      'Create rich documentation canvases',
      'Monitor channel conversations for keywords',
      'Send alerts and notifications to specific users',
      'Create interactive workflow triggers from Slack messages'
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Team notifications and alerts',
        'Status updates and reporting',
        'Documentation and knowledge sharing',
        'Workflow triggers from team communications',
        'Customer support notifications'
      ],
      avoidWhen: [
        'External communications (use email instead)',
        'Formal business communications',
        'Large file transfers (use file tools)',
        'Complex rich text formatting (use dedicated document tools)'
      ],
      commonMistakes: [
        'Not setting up proper OAuth scopes',
        'Sending messages to wrong channels',
        'Forgetting to handle rate limits',
        'Not formatting messages for readability'
      ]
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'channel',
          question: 'Which Slack channel should receive the message?',
          examples: [
            '#general for company-wide announcements',
            '#dev-team for development updates',
            '#alerts for automated notifications',
            'Direct message to @username'
          ]
        },
        {
          parameter: 'text',
          question: 'What message do you want to send?',
          examples: [
            'Deployment completed successfully ✅',
            'New customer signup: John Doe',
            'Daily report: 150 orders processed'
          ]
        }
      ]
    },
    tags: ['slack', 'messaging', 'team', 'collaboration', 'notifications', 'chat'],
    difficulty: 'beginner',
    complexity: 'simple'
  },

  gmail: {
    id: 'gmail',
    name: 'Gmail',
    shortDescription: 'Send, read, draft, and search Gmail messages',
    longDescription: 'Full Gmail integration for email automation. Send emails with attachments, read messages from specific folders, create drafts for review, and search through your email history. Supports rich HTML formatting and advanced filtering.',
    usageExamples: [
      'Send automated customer follow-up emails',
      'Monitor inbox for specific types of messages',
      'Create email drafts for approval workflows',
      'Search for emails containing order information',
      'Send weekly reports to stakeholders'
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Customer communications',
        'Automated reporting and notifications',
        'Email-based workflow triggers',
        'Business correspondence',
        'Document sharing and collaboration'
      ],
      avoidWhen: [
        'Internal team communications (use Slack)',
        'Real-time conversations (use chat tools)',
        'Large file sharing (use cloud storage)',
        'Marketing emails (use dedicated email marketing tools)'
      ],
      commonMistakes: [
        'Not personalizing automated emails',
        'Forgetting to handle bounced emails',
        'Sending emails without proper subject lines',
        'Not respecting email frequency limits'
      ]
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'to',
          question: 'Who should receive this email?',
          examples: [
            'customer@example.com',
            'team@company.com',
            'Multiple recipients separated by commas'
          ]
        },
        {
          parameter: 'subject',
          question: 'What should the email subject line be?',
          examples: [
            'Welcome to our service!',
            'Weekly Report - Week of [Date]',
            'Action Required: Please review'
          ]
        },
        {
          parameter: 'body',
          question: 'What should the email message say?',
          examples: [
            'Professional greeting with personalized content',
            'Clear call-to-action',
            'Helpful information and next steps'
          ]
        }
      ]
    },
    tags: ['gmail', 'email', 'communication', 'automation', 'messaging', 'business'],
    difficulty: 'beginner',
    complexity: 'simple'
  }
}

// =============================================
// Exports
// =============================================

export { SimToolRegistry, UniversalToolAdapter, ToolIntelligenceEngine }

// Singleton instances for convenience
export const toolRegistry = new SimToolRegistry()
export const toolAdapter = new UniversalToolAdapter(toolRegistry)
export const intelligenceEngine = new ToolIntelligenceEngine(toolRegistry, toolAdapter)