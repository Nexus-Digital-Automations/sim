/**
 * Agent Configuration and Customization Framework
 * ===============================================
 *
 * Comprehensive framework for dynamically configuring agents based on user selection,
 * workspace requirements, and conversation context. Includes personality customization,
 * capability activation, feature toggles, and workspace-specific configurations.
 *
 * Key Features:
 * - Dynamic agent configuration based on user selection and context
 * - Agent personality and behavior customization
 * - Feature toggles and capability activation
 * - Workspace-specific agent configuration management
 * - Configuration validation and schema enforcement
 * - Real-time configuration updates
 * - Configuration versioning and rollback
 * - Performance impact assessment for configurations
 */

import { EventEmitter } from 'events'
import { createLogger } from '@/lib/logs/console/logger'
import type { AgentConfig, AuthContext, Guideline } from '../types'

const logger = createLogger('AgentConfigurationFramework')

/**
 * Agent personality profiles
 */
export interface AgentPersonality {
  id: string
  name: string
  description: string
  traits: {
    formality: 'casual' | 'professional' | 'formal'
    verbosity: 'concise' | 'balanced' | 'detailed'
    helpfulness: 'direct' | 'supportive' | 'proactive'
    creativity: 'conservative' | 'balanced' | 'creative'
    empathy: 'low' | 'medium' | 'high'
  }
  systemPromptModifiers: string[]
  responseTemplates: Record<string, string>
  prohibitedBehaviors: string[]
}

/**
 * Agent capability definitions
 */
export interface AgentCapability {
  id: string
  name: string
  description: string
  category: 'core' | 'tool' | 'integration' | 'advanced'
  enabled: boolean
  permissions: string[]
  prerequisites: string[]
  performanceImpact: 'low' | 'medium' | 'high'
  resourceRequirements: {
    memoryMB: number
    cpuIntensive: boolean
    networkAccess: boolean
  }
}

/**
 * Configuration template for different use cases
 */
export interface AgentConfigurationTemplate {
  id: string
  name: string
  description: string
  category: 'general' | 'support' | 'sales' | 'technical' | 'custom'
  baseConfig: AgentConfig
  personality: string // Personality ID
  enabledCapabilities: string[]
  guidelines: Omit<Guideline, 'id' | 'agent_id' | 'created_at' | 'updated_at'>[]
  workspaceSpecific: boolean
  metadata: Record<string, any>
}

/**
 * Dynamic configuration rules
 */
export interface ConfigurationRule {
  id: string
  name: string
  description: string
  conditions: {
    workspaceType?: string
    userRole?: string
    timeOfDay?: { start: string; end: string }
    conversationContext?: string[]
    previousInteractions?: number
  }
  actions: {
    setPersonality?: string
    enableCapabilities?: string[]
    disableCapabilities?: string[]
    updateConfig?: Partial<AgentConfig>
    addGuidelines?: string[]
  }
  priority: number
  active: boolean
}

/**
 * Configuration validation schema
 */
export interface ConfigurationSchema {
  version: string
  requiredFields: string[]
  fieldValidators: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object'
      required: boolean
      min?: number
      max?: number
      pattern?: string
      enum?: any[]
    }
  >
  capabilities: {
    allowed: string[]
    mutuallyExclusive: string[][]
    requiredCombinations: string[][]
  }
}

/**
 * Configuration change history
 */
export interface ConfigurationChange {
  id: string
  agentId: string
  sessionId?: string
  changeType: 'personality' | 'capability' | 'config' | 'template' | 'rule'
  previousValue: any
  newValue: any
  reason: string
  timestamp: Date
  userId: string
  rollbackAvailable: boolean
}

/**
 * Main Agent Configuration Framework class
 */
export class AgentConfigurationFramework extends EventEmitter {
  private personalities = new Map<string, AgentPersonality>()
  private capabilities = new Map<string, AgentCapability>()
  private templates = new Map<string, AgentConfigurationTemplate>()
  private rules = new Map<string, ConfigurationRule>()
  private activeConfigurations = new Map<string, any>() // sessionId -> config
  private configurationHistory = new Map<string, ConfigurationChange[]>()
  private schema: ConfigurationSchema

  constructor() {
    super()
    this.schema = this.initializeSchema()
    this.initializeDefaults()
    logger.info('Agent Configuration Framework initialized')
  }

  /**
   * Register a new agent personality profile
   */
  public registerPersonality(personality: AgentPersonality): void {
    this.personalities.set(personality.id, personality)
    logger.info(`Registered personality profile`, {
      personalityId: personality.id,
      name: personality.name,
    })
  }

  /**
   * Register a new agent capability
   */
  public registerCapability(capability: AgentCapability): void {
    this.capabilities.set(capability.id, capability)
    logger.info(`Registered capability`, { capabilityId: capability.id, name: capability.name })
  }

  /**
   * Register a configuration template
   */
  public registerTemplate(template: AgentConfigurationTemplate): void {
    this.templates.set(template.id, template)
    logger.info(`Registered configuration template`, {
      templateId: template.id,
      name: template.name,
    })
  }

  /**
   * Register a configuration rule
   */
  public registerRule(rule: ConfigurationRule): void {
    this.rules.set(rule.id, rule)
    logger.info(`Registered configuration rule`, { ruleId: rule.id, name: rule.name })
  }

  /**
   * Generate dynamic configuration for an agent based on context
   */
  public async generateConfiguration(
    agentId: string,
    sessionId: string,
    context: {
      auth: AuthContext
      userPreferences?: Record<string, any>
      conversationContext?: string[]
      previousInteractions?: number
      templateId?: string
    }
  ): Promise<{
    config: AgentConfig
    personality: AgentPersonality
    capabilities: AgentCapability[]
    appliedRules: ConfigurationRule[]
  }> {
    logger.info(`Generating dynamic configuration`, { agentId, sessionId })

    try {
      // Start with base configuration
      let baseConfig: AgentConfig = {}
      let selectedPersonality: AgentPersonality | undefined
      let selectedCapabilities: AgentCapability[] = []

      // Apply template if specified
      if (context.templateId) {
        const template = this.templates.get(context.templateId)
        if (template) {
          baseConfig = { ...template.baseConfig }
          selectedPersonality = this.personalities.get(template.personality)
          selectedCapabilities = template.enabledCapabilities
            .map((id) => this.capabilities.get(id))
            .filter(Boolean) as AgentCapability[]
        }
      }

      // Apply workspace-specific defaults if no template
      if (!context.templateId) {
        const workspaceDefaults = await this.getWorkspaceDefaults(context.auth.workspace_id!)
        baseConfig = workspaceDefaults.config
        selectedPersonality = workspaceDefaults.personality
        selectedCapabilities = workspaceDefaults.capabilities
      }

      // Apply dynamic rules
      const applicableRules = await this.evaluateRules(agentId, context)
      baseConfig = await this.applyRules(baseConfig, applicableRules, selectedCapabilities)

      // Apply user preferences
      if (context.userPreferences) {
        baseConfig = this.applyUserPreferences(baseConfig, context.userPreferences)
      }

      // Ensure we have a personality
      if (!selectedPersonality) {
        selectedPersonality = this.personalities.get('default') || this.createDefaultPersonality()
      }

      // Apply personality to configuration
      baseConfig = this.applyPersonalityToConfig(baseConfig, selectedPersonality)

      // Validate final configuration
      this.validateConfiguration(baseConfig, selectedCapabilities)

      // Store active configuration
      this.activeConfigurations.set(sessionId, {
        config: baseConfig,
        personality: selectedPersonality,
        capabilities: selectedCapabilities,
        appliedRules: applicableRules,
        generatedAt: new Date(),
        agentId,
        sessionId,
      })

      // Record configuration change
      this.recordConfigurationChange({
        agentId,
        sessionId,
        changeType: 'config',
        previousValue: null,
        newValue: baseConfig,
        reason: 'Dynamic configuration generation',
        userId: context.auth.user_id,
      })

      logger.info(`Configuration generated successfully`, {
        agentId,
        sessionId,
        personalityId: selectedPersonality.id,
        capabilitiesCount: selectedCapabilities.length,
        rulesApplied: applicableRules.length,
      })

      return {
        config: baseConfig,
        personality: selectedPersonality,
        capabilities: selectedCapabilities,
        appliedRules: applicableRules,
      }
    } catch (error) {
      logger.error(`Failed to generate configuration`, {
        agentId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Update agent configuration in real-time
   */
  public async updateConfiguration(
    sessionId: string,
    updates: {
      personalityId?: string
      enableCapabilities?: string[]
      disableCapabilities?: string[]
      configUpdates?: Partial<AgentConfig>
    },
    context: {
      auth: AuthContext
      reason: string
    }
  ): Promise<boolean> {
    logger.info(`Updating configuration`, { sessionId, updates })

    const activeConfig = this.activeConfigurations.get(sessionId)
    if (!activeConfig) {
      throw new Error(`No active configuration found for session ${sessionId}`)
    }

    try {
      let needsUpdate = false
      const previousConfig = { ...activeConfig }

      // Update personality
      if (updates.personalityId) {
        const newPersonality = this.personalities.get(updates.personalityId)
        if (newPersonality) {
          activeConfig.personality = newPersonality
          activeConfig.config = this.applyPersonalityToConfig(activeConfig.config, newPersonality)
          needsUpdate = true
        }
      }

      // Enable capabilities
      if (updates.enableCapabilities) {
        for (const capabilityId of updates.enableCapabilities) {
          const capability = this.capabilities.get(capabilityId)
          if (
            capability &&
            !activeConfig.capabilities.find((c: AgentCapability) => c.id === capabilityId)
          ) {
            activeConfig.capabilities.push(capability)
            needsUpdate = true
          }
        }
      }

      // Disable capabilities
      if (updates.disableCapabilities) {
        activeConfig.capabilities = activeConfig.capabilities.filter(
          (c: AgentCapability) => !updates.disableCapabilities!.includes(c.id)
        )
        needsUpdate = true
      }

      // Update configuration
      if (updates.configUpdates) {
        Object.assign(activeConfig.config, updates.configUpdates)
        needsUpdate = true
      }

      if (needsUpdate) {
        // Validate updated configuration
        this.validateConfiguration(activeConfig.config, activeConfig.capabilities)

        // Record change
        this.recordConfigurationChange({
          agentId: activeConfig.agentId,
          sessionId,
          changeType: 'config',
          previousValue: previousConfig,
          newValue: activeConfig,
          reason: context.reason,
          userId: context.auth.user_id,
        })

        // Emit update event
        this.emit('configuration:updated', {
          sessionId,
          agentId: activeConfig.agentId,
          previousConfig,
          newConfig: activeConfig,
          updates,
        })

        logger.info(`Configuration updated successfully`, { sessionId, updates })
        return true
      }

      return false
    } catch (error) {
      logger.error(`Failed to update configuration`, {
        sessionId,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Get available personalities
   */
  public getAvailablePersonalities(): AgentPersonality[] {
    return Array.from(this.personalities.values())
  }

  /**
   * Get available capabilities
   */
  public getAvailableCapabilities(category?: string): AgentCapability[] {
    const capabilities = Array.from(this.capabilities.values())
    return category ? capabilities.filter((c) => c.category === category) : capabilities
  }

  /**
   * Get available templates
   */
  public getAvailableTemplates(workspaceId?: string): AgentConfigurationTemplate[] {
    const templates = Array.from(this.templates.values())
    return workspaceId
      ? templates.filter((t) => !t.workspaceSpecific || t.metadata.workspaceId === workspaceId)
      : templates.filter((t) => !t.workspaceSpecific)
  }

  /**
   * Get configuration for a session
   */
  public getActiveConfiguration(sessionId: string): any {
    return this.activeConfigurations.get(sessionId)
  }

  /**
   * Rollback configuration to previous state
   */
  public async rollbackConfiguration(
    sessionId: string,
    changeId: string,
    auth: AuthContext
  ): Promise<boolean> {
    logger.info(`Rolling back configuration`, { sessionId, changeId })

    const activeConfig = this.activeConfigurations.get(sessionId)
    if (!activeConfig) {
      throw new Error(`No active configuration found for session ${sessionId}`)
    }

    const history = this.configurationHistory.get(activeConfig.agentId) || []
    const change = history.find((c) => c.id === changeId)

    if (!change || !change.rollbackAvailable) {
      throw new Error(`Configuration change not found or not rollback-able`)
    }

    try {
      // Restore previous configuration
      const restoredConfig = change.previousValue

      this.activeConfigurations.set(sessionId, restoredConfig)

      // Record rollback
      this.recordConfigurationChange({
        agentId: activeConfig.agentId,
        sessionId,
        changeType: 'config',
        previousValue: activeConfig,
        newValue: restoredConfig,
        reason: `Rollback to change ${changeId}`,
        userId: auth.user_id,
      })

      logger.info(`Configuration rolled back successfully`, { sessionId, changeId })
      return true
    } catch (error) {
      logger.error(`Failed to rollback configuration`, {
        sessionId,
        changeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  // Private helper methods

  private initializeSchema(): ConfigurationSchema {
    return {
      version: '1.0.0',
      requiredFields: ['max_turns', 'temperature', 'model'],
      fieldValidators: {
        max_turns: { type: 'number', required: true, min: 1, max: 1000 },
        temperature: { type: 'number', required: true, min: 0, max: 2 },
        model: { type: 'string', required: true, enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3'] },
        system_prompt: { type: 'string', required: false },
        tool_choice: { type: 'string', required: false, enum: ['auto', 'none'] },
      },
      capabilities: {
        allowed: ['web_search', 'file_processing', 'code_execution', 'image_analysis'],
        mutuallyExclusive: [['web_search', 'offline_mode']],
        requiredCombinations: [['code_execution', 'file_processing']],
      },
    }
  }

  private initializeDefaults(): void {
    // Register default personality
    this.registerPersonality({
      id: 'default',
      name: 'Balanced Assistant',
      description: 'A well-balanced, helpful assistant suitable for most interactions',
      traits: {
        formality: 'professional',
        verbosity: 'balanced',
        helpfulness: 'supportive',
        creativity: 'balanced',
        empathy: 'medium',
      },
      systemPromptModifiers: [
        'Be helpful and informative',
        'Maintain a professional but friendly tone',
        'Provide clear and concise responses',
      ],
      responseTemplates: {
        greeting: 'Hello! How can I help you today?',
        error: 'I apologize, but I encountered an issue. Let me try to help you in another way.',
        clarification: 'Could you please provide more details so I can better assist you?',
      },
      prohibitedBehaviors: [
        'Providing medical advice',
        'Generating harmful content',
        'Impersonating individuals',
      ],
    })

    // Register core capabilities
    this.registerCapability({
      id: 'conversational_ai',
      name: 'Conversational AI',
      description: 'Basic conversational abilities',
      category: 'core',
      enabled: true,
      permissions: ['chat'],
      prerequisites: [],
      performanceImpact: 'low',
      resourceRequirements: {
        memoryMB: 50,
        cpuIntensive: false,
        networkAccess: false,
      },
    })

    // Register default template
    this.registerTemplate({
      id: 'general_assistant',
      name: 'General Assistant',
      description: 'A versatile assistant for general workplace tasks',
      category: 'general',
      baseConfig: {
        max_turns: 50,
        temperature: 0.7,
        model: 'gpt-4',
        system_prompt: 'You are a helpful workplace assistant.',
        tool_choice: 'auto',
      },
      personality: 'default',
      enabledCapabilities: ['conversational_ai'],
      guidelines: [
        {
          condition: 'user asks for help',
          action: 'provide helpful and accurate information',
          priority: 1,
        },
      ],
      workspaceSpecific: false,
      metadata: {},
    })
  }

  private createDefaultPersonality(): AgentPersonality {
    return this.personalities.get('default')!
  }

  private async getWorkspaceDefaults(workspaceId: string) {
    // This would typically fetch from database
    return {
      config: {
        max_turns: 50,
        temperature: 0.7,
        model: 'gpt-4',
        tool_choice: 'auto',
      },
      personality: this.personalities.get('default')!,
      capabilities: [this.capabilities.get('conversational_ai')!],
    }
  }

  private async evaluateRules(agentId: string, context: any): Promise<ConfigurationRule[]> {
    const activeRules = Array.from(this.rules.values())
      .filter((rule) => rule.active)
      .sort((a, b) => b.priority - a.priority)

    const applicableRules: ConfigurationRule[] = []

    for (const rule of activeRules) {
      const matches = true

      // Evaluate conditions
      if (rule.conditions.workspaceType && context.auth.workspace_id) {
        // Would check workspace type
      }

      if (rule.conditions.userRole && context.auth.permissions) {
        // Would check user role
      }

      if (rule.conditions.timeOfDay) {
        const now = new Date()
        const currentTime = now.getHours() * 60 + now.getMinutes()
        // Would check time conditions
      }

      if (matches) {
        applicableRules.push(rule)
      }
    }

    return applicableRules
  }

  private async applyRules(
    config: AgentConfig,
    rules: ConfigurationRule[],
    capabilities: AgentCapability[]
  ): Promise<AgentConfig> {
    const modifiedConfig = { ...config }

    for (const rule of rules) {
      if (rule.actions.updateConfig) {
        Object.assign(modifiedConfig, rule.actions.updateConfig)
      }
    }

    return modifiedConfig
  }

  private applyUserPreferences(config: AgentConfig, preferences: Record<string, any>): AgentConfig {
    const modifiedConfig = { ...config }

    // Apply user-specific preferences
    if (preferences.responseLength) {
      // Adjust verbosity based on preference
    }

    if (preferences.formality) {
      // Adjust tone based on preference
    }

    return modifiedConfig
  }

  private applyPersonalityToConfig(
    config: AgentConfig,
    personality: AgentPersonality
  ): AgentConfig {
    const modifiedConfig = { ...config }

    // Apply personality traits to configuration
    if (personality.traits.creativity === 'creative') {
      modifiedConfig.temperature = Math.min((modifiedConfig.temperature || 0.7) + 0.2, 1.0)
    } else if (personality.traits.creativity === 'conservative') {
      modifiedConfig.temperature = Math.max((modifiedConfig.temperature || 0.7) - 0.2, 0.1)
    }

    // Modify system prompt with personality modifiers
    const basePrompt = modifiedConfig.system_prompt || 'You are a helpful assistant.'
    const personalityPrompt = personality.systemPromptModifiers.join('. ')
    modifiedConfig.system_prompt = `${basePrompt} ${personalityPrompt}`

    return modifiedConfig
  }

  private validateConfiguration(config: AgentConfig, capabilities: AgentCapability[]): void {
    // Validate against schema
    for (const field of this.schema.requiredFields) {
      if (!(field in config)) {
        throw new Error(`Required field ${field} is missing from configuration`)
      }
    }

    for (const [field, validator] of Object.entries(this.schema.fieldValidators)) {
      if (field in config) {
        const value = (config as any)[field]

        if (validator.enum && !validator.enum.includes(value)) {
          throw new Error(`Invalid value for ${field}: ${value}`)
        }

        if (validator.min !== undefined && value < validator.min) {
          throw new Error(`Value for ${field} below minimum: ${value}`)
        }

        if (validator.max !== undefined && value > validator.max) {
          throw new Error(`Value for ${field} above maximum: ${value}`)
        }
      }
    }

    logger.debug('Configuration validation passed')
  }

  private recordConfigurationChange(changeData: {
    agentId: string
    sessionId?: string
    changeType: ConfigurationChange['changeType']
    previousValue: any
    newValue: any
    reason: string
    userId: string
  }): void {
    const change: ConfigurationChange = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      rollbackAvailable: true,
      ...changeData,
    }

    const history = this.configurationHistory.get(changeData.agentId) || []
    history.push(change)
    this.configurationHistory.set(changeData.agentId, history)

    // Keep only last 100 changes per agent
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }

    logger.debug('Configuration change recorded', {
      changeId: change.id,
      agentId: changeData.agentId,
    })
  }
}

// Export singleton instance
export const agentConfigurationFramework = new AgentConfigurationFramework()
