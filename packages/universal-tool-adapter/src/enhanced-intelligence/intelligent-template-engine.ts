/**
 * Intelligent Template Engine for Dynamic Natural Language Generation
 *
 * Provides advanced template processing capabilities with dynamic content generation,
 * context-aware customization, and intelligent template selection. This engine
 * enhances the static templates with runtime intelligence and personalization.
 *
 * @author Natural Language Framework Agent
 * @version 2.0.0
 */

import type { ToolConfig } from '@/tools/types'
import { createLogger } from '../utils/logger'
import type {
  EnhancedDescriptionTemplate,
  SkillLevel,
  ToolCategory,
  UserRole,
} from './description-templates'
import {
  createDescriptionTemplateRegistry,
  type DescriptionTemplateRegistry,
} from './description-templates'
import type {
  BriefDescription,
  DescriptionLevels,
  DetailedDescription,
  ExpertDescription,
} from './natural-language-description-framework'
import { createNLPProcessor, type NLPProcessor } from './nlp-processor'

const logger = createLogger('IntelligentTemplateEngine')

// =============================================================================
// Template Processing Types
// =============================================================================

export interface TemplateContext {
  // Tool context
  tool: ToolConfig
  toolCategory: ToolCategory
  toolMetadata?: ToolMetadata

  // User context
  userRole?: UserRole
  skillLevel?: SkillLevel
  userPreferences?: UserPreferences

  // Environmental context
  organizationContext?: OrganizationalContext
  projectContext?: ProjectContext
  domainContext?: DomainContext

  // Processing context
  processingOptions?: ProcessingOptions
  customVariables?: Record<string, any>
}

export interface ToolMetadata {
  complexity: number
  popularity: number
  maturityLevel: 'experimental' | 'beta' | 'stable' | 'mature'
  lastUpdated: Date
  supportLevel: 'community' | 'supported' | 'enterprise'
  relatedTools: string[]
}

export interface UserPreferences {
  verbosity: 'minimal' | 'concise' | 'detailed' | 'comprehensive'
  technicalDepth: 'basic' | 'intermediate' | 'advanced' | 'expert'
  examplePreference: 'none' | 'few' | 'many' | 'comprehensive'
  formatPreference: 'text' | 'structured' | 'visual' | 'interactive'
  languageStyle: 'formal' | 'casual' | 'technical' | 'friendly'
}

export interface OrganizationalContext {
  industry: string
  companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  techMaturity: 'emerging' | 'developing' | 'mature' | 'advanced'
  complianceLevel: 'basic' | 'standard' | 'strict' | 'enterprise'
}

export interface ProjectContext {
  projectType: string
  projectPhase: 'planning' | 'development' | 'testing' | 'deployment' | 'maintenance'
  timeline: 'urgent' | 'normal' | 'relaxed'
  teamSize: number
  budget: 'limited' | 'moderate' | 'flexible' | 'enterprise'
}

export interface DomainContext {
  primaryDomain: string
  subDomains: string[]
  specialTerminology: Record<string, string>
  complianceRequirements: string[]
  bestPractices: string[]
}

export interface ProcessingOptions {
  enableDynamicContent: boolean
  enablePersonalization: boolean
  enableContextualAdaptation: boolean
  contentOptimization: 'speed' | 'quality' | 'balanced'
  outputFormat: 'text' | 'markdown' | 'structured' | 'json'
}

export interface TemplateVariable {
  name: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function'
  description?: string
  required?: boolean
  defaultValue?: any
}

export interface GeneratedContent {
  content: string
  metadata: ContentMetadata
  variables: Record<string, any>
  confidence: number
  processingTime: number
}

export interface ContentMetadata {
  templateUsed: string
  adaptationsApplied: string[]
  personalizationLevel: number
  qualityScore: number
  complexity: number
  estimatedReadingTime: number
}

// =============================================================================
// Intelligent Template Engine
// =============================================================================

/**
 * Advanced template engine with intelligent content generation
 */
export class IntelligentTemplateEngine {
  private templateRegistry: DescriptionTemplateRegistry
  private nlpProcessor: NLPProcessor
  private variableProcessor: VariableProcessor
  private contentOptimizer: ContentOptimizer
  private personalizationEngine: PersonalizationEngine
  private qualityAnalyzer: QualityAnalyzer

  constructor(options: TemplateEngineOptions = {}) {
    this.templateRegistry = options.templateRegistry || createDescriptionTemplateRegistry()
    this.nlpProcessor = options.nlpProcessor || createNLPProcessor()
    this.variableProcessor = new VariableProcessor()
    this.contentOptimizer = new ContentOptimizer()
    this.personalizationEngine = new PersonalizationEngine()
    this.qualityAnalyzer = new QualityAnalyzer()

    logger.info('Intelligent Template Engine initialized')
  }

  /**
   * Generate enhanced descriptions using intelligent templates
   */
  async generateEnhancedDescriptions(context: TemplateContext): Promise<DescriptionLevels> {
    logger.debug(`Generating enhanced descriptions for tool: ${context.tool.id}`)

    const startTime = performance.now()

    try {
      // Get appropriate template
      const template = await this.selectOptimalTemplate(context)

      // Extract and process tool information
      const toolAnalysis = await this.nlpProcessor.analyzeToolComprehensively(context.tool)

      // Prepare template variables
      const variables = await this.prepareTemplateVariables(context, toolAnalysis, template)

      // Generate multi-level descriptions
      const brief = await this.generateBriefDescription(template, variables, context)
      const detailed = await this.generateDetailedDescription(template, variables, context)
      const expert = await this.generateExpertDescription(template, variables, context)
      const contextual = await this.generateContextualVariations(template, variables, context)

      // Apply personalization if enabled
      const personalizedDescriptions = await this.applyPersonalization(
        {
          brief,
          detailed,
          expert,
          contextual,
        },
        context
      )

      const processingTime = performance.now() - startTime
      logger.info(`Descriptions generated in ${processingTime.toFixed(2)}ms`)

      return personalizedDescriptions
    } catch (error) {
      logger.error(`Failed to generate enhanced descriptions:`, error)
      throw error
    }
  }

  /**
   * Generate content from template with intelligent processing
   */
  async generateContentFromTemplate(
    template: string,
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<GeneratedContent> {
    const startTime = performance.now()

    try {
      // Process variables
      const processedVariables = await this.variableProcessor.processVariables(variables, context)

      // Generate content
      let content = await this.processTemplate(template, processedVariables, context)

      // Apply optimizations
      if (context.processingOptions?.enableContextualAdaptation) {
        content = await this.contentOptimizer.optimizeForContext(content, context)
      }

      // Apply personalization
      if (context.processingOptions?.enablePersonalization) {
        content = await this.personalizationEngine.personalize(content, context)
      }

      // Analyze quality
      const qualityScore = await this.qualityAnalyzer.analyzeContent(content)

      const processingTime = performance.now() - startTime

      return {
        content,
        metadata: {
          templateUsed: 'custom',
          adaptationsApplied: [],
          personalizationLevel: context.processingOptions?.enablePersonalization ? 0.8 : 0,
          qualityScore,
          complexity: this.calculateComplexity(content),
          estimatedReadingTime: this.estimateReadingTime(content),
        },
        variables: processedVariables,
        confidence: qualityScore,
        processingTime,
      }
    } catch (error) {
      logger.error('Failed to generate content from template:', error)
      throw error
    }
  }

  /**
   * Customize template for specific context
   */
  async customizeTemplate(
    templateId: string,
    context: TemplateContext,
    customizations: TemplateCustomization = {}
  ): Promise<EnhancedDescriptionTemplate> {
    const baseTemplate = this.templateRegistry.getTemplateById(templateId)
    if (!baseTemplate) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const customizedTemplate = JSON.parse(JSON.stringify(baseTemplate)) // Deep copy

    // Apply role-specific customizations
    if (context.userRole && customizations.roleCustomizations) {
      await this.applyRoleCustomizations(
        customizedTemplate,
        context.userRole,
        customizations.roleCustomizations
      )
    }

    // Apply skill-level customizations
    if (context.skillLevel && customizations.skillCustomizations) {
      await this.applySkillCustomizations(
        customizedTemplate,
        context.skillLevel,
        customizations.skillCustomizations
      )
    }

    // Apply domain-specific customizations
    if (context.domainContext && customizations.domainCustomizations) {
      await this.applyDomainCustomizations(
        customizedTemplate,
        context.domainContext,
        customizations.domainCustomizations
      )
    }

    return customizedTemplate
  }

  // =============================================================================
  // Template Processing Methods
  // =============================================================================

  private async selectOptimalTemplate(
    context: TemplateContext
  ): Promise<EnhancedDescriptionTemplate> {
    // Get template by category
    let template = this.templateRegistry.getTemplate(context.toolCategory)

    if (!template) {
      // Fallback to productivity template
      template = this.templateRegistry.getTemplate('productivity')
    }

    if (!template) {
      throw new Error(`No template found for category: ${context.toolCategory}`)
    }

    return template
  }

  private async prepareTemplateVariables(
    context: TemplateContext,
    toolAnalysis: any,
    template: EnhancedDescriptionTemplate
  ): Promise<Record<string, any>> {
    const variables: Record<string, any> = {}

    // Tool-specific variables
    variables.toolName = context.tool.name || context.tool.id
    variables.toolId = context.tool.id
    variables.toolDescription = context.tool.description || 'A powerful tool for your workflow'

    // Analysis-derived variables
    variables.primaryCapability = toolAnalysis.functionality
    variables.keyBenefits = toolAnalysis.benefits
    variables.mainLimitations = toolAnalysis.limitations
    variables.workingPrinciple = toolAnalysis.workingPrinciple

    // Context-derived variables
    if (context.userRole) {
      variables.userRole = context.userRole
      variables.roleSpecificContent = await this.generateRoleSpecificContent(
        context.userRole,
        context.tool
      )
    }

    if (context.skillLevel) {
      variables.skillLevel = context.skillLevel
      variables.skillAppropriateLanguage = this.getSkillAppropriateLanguage(context.skillLevel)
    }

    if (context.domainContext) {
      variables.industry = context.domainContext.primaryDomain
      variables.domainTerminology = context.domainContext.specialTerminology
      variables.complianceRequirements = context.domainContext.complianceRequirements
    }

    // Dynamic variables
    variables.platform = this.extractPlatform(context.tool)
    variables.category = context.toolCategory
    variables.complexity = context.toolMetadata?.complexity || 0.5
    variables.maturityLevel = context.toolMetadata?.maturityLevel || 'stable'

    // Custom variables
    if (context.customVariables) {
      Object.assign(variables, context.customVariables)
    }

    return variables
  }

  private async processTemplate(
    template: string,
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<string> {
    let processed = template

    // Replace simple variable placeholders
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g')

      if (typeof value === 'string') {
        processed = processed.replace(regex, value)
      } else if (Array.isArray(value)) {
        processed = processed.replace(regex, value.join(', '))
      } else if (value !== null && value !== undefined) {
        processed = processed.replace(regex, String(value))
      }
    }

    // Process conditional placeholders
    processed = await this.processConditionalPlaceholders(processed, variables, context)

    // Process dynamic placeholders
    processed = await this.processDynamicPlaceholders(processed, variables, context)

    // Clean up any remaining placeholders
    processed = this.cleanupPlaceholders(processed)

    return processed
  }

  private async generateBriefDescription(
    template: EnhancedDescriptionTemplate,
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<BriefDescription> {
    const briefTemplate = template.briefTemplate

    const summary = await this.processTemplate(briefTemplate.summaryPattern, variables, context)
    const primaryUseCase = await this.processTemplate(
      briefTemplate.useCasePattern,
      variables,
      context
    )
    const keyCapability = await this.processTemplate(
      briefTemplate.capabilityPattern,
      variables,
      context
    )

    // Generate complexity assessment
    const complexityLevel = this.assessComplexityLevel(
      context.tool,
      briefTemplate.complexityIndicators,
      variables
    )

    // Generate contextual tags
    const quickTags = await this.generateQuickTags(
      briefTemplate.tagGenerationRules,
      variables,
      context
    )

    return {
      summary,
      primaryUseCase,
      keyCapability,
      complexityLevel,
      quickTags,
    }
  }

  private async generateDetailedDescription(
    template: EnhancedDescriptionTemplate,
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<DetailedDescription> {
    const detailedTemplate = template.detailedTemplate

    const overview = await this.processTemplate(
      detailedTemplate.overviewPattern,
      variables,
      context
    )
    const functionality = await this.processTemplate(
      detailedTemplate.functionalityPattern,
      variables,
      context
    )

    // Generate use cases from templates
    const useCases = await Promise.all(
      detailedTemplate.useCaseTemplates.map(async (useCaseTemplate) => ({
        title: useCaseTemplate.scenario,
        description: await this.processTemplate(useCaseTemplate.pattern, variables, context),
        scenario: useCaseTemplate.scenario,
        expectedOutcome: `Successfully ${useCaseTemplate.scenario}`,
        difficulty: useCaseTemplate.difficulty,
        estimatedTime: this.estimateUseCaseTime(useCaseTemplate.difficulty),
      }))
    )

    const workingPrinciple =
      variables.workingPrinciple ||
      'Operates through standard interface patterns with reliable execution'

    // Process benefit patterns
    const benefits = await Promise.all(
      detailedTemplate.benefitsPattern.map((pattern) =>
        this.processTemplate(pattern, variables, context)
      )
    )

    // Process limitation patterns
    const limitations = await Promise.all(
      detailedTemplate.limitationsPattern.map((pattern) =>
        this.processTemplate(pattern, variables, context)
      )
    )

    const integrationInfo = {
      integratedWith: variables.integratedServices || [],
      apiEndpoints: variables.apiEndpoints || [],
    }

    return {
      overview,
      functionality,
      useCases,
      workingPrinciple,
      benefits,
      limitations,
      integrationInfo,
    }
  }

  private async generateExpertDescription(
    template: EnhancedDescriptionTemplate,
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<ExpertDescription> {
    const expertTemplate = template.expertTemplate

    const technicalArchitecture = {
      architecture: await this.processTemplate(
        expertTemplate.architecturePattern,
        variables,
        context
      ),
      dependencies: variables.dependencies || [],
      integrationPoints: variables.integrationPoints || [],
      scalabilityFactors: variables.scalabilityFactors || [],
      performanceConsiderations: variables.performanceConsiderations || [],
    }

    // Generate configuration templates
    const configurableParameters = await Promise.all(
      expertTemplate.configurationTemplates.map(async (configTemplate) => ({
        name: configTemplate.aspect,
        type: 'string',
        defaultValue: 'auto',
        description: await this.processTemplate(configTemplate.pattern, variables, context),
        validationRules: [],
        examples: configTemplate.examples,
      }))
    )

    const advancedConfiguration = {
      configurableParameters,
      advancedOptions: [],
      customizationPoints: [],
      extensionMechanisms: [],
    }

    // Generate performance templates
    const performanceMetrics = await Promise.all(
      expertTemplate.performanceTemplates.map(async (perfTemplate) => ({
        metric: perfTemplate.metric,
        description: await this.processTemplate(perfTemplate.pattern, variables, context),
        benchmarks: perfTemplate.benchmarks,
      }))
    )

    const performanceProfile = {
      responseTime: { average: 0, p95: 0, p99: 0 },
      throughput: { average: 0, p95: 0, p99: 0 },
      resourceUsage: { cpu: 0, memory: 0, network: 0 },
      scalabilityLimits: { maxConcurrentUsers: 0, maxDataSize: 0 },
    }

    const securityProfile = {
      authenticationRequirements: variables.authRequirements || [],
      authorizationModel: variables.authModel || 'role-based',
      dataProtection: variables.dataProtection || [],
      auditingCapabilities: variables.auditCapabilities || [],
      complianceFrameworks: variables.complianceFrameworks || [],
    }

    const troubleshooting = {
      commonIssues: [],
      diagnosticSteps: [],
      resolutionProcedures: [],
      escalationPaths: [],
    }

    const extensibilityInfo = {
      extensionPoints: variables.extensionPoints || [],
      customization: variables.customizationOptions || [],
    }

    return {
      technicalArchitecture,
      advancedConfiguration,
      performanceProfile,
      securityProfile,
      troubleshooting,
      extensibilityInfo,
    }
  }

  private async generateContextualVariations(
    template: EnhancedDescriptionTemplate,
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<Record<string, any>> {
    const variations: Record<string, any> = {}

    // Generate role-based variations if user role is specified
    if (context.userRole && template.roleTemplates[context.userRole]) {
      const roleTemplate = template.roleTemplates[context.userRole]
      variations[`role-${context.userRole}`] = {
        contextType: 'workflow',
        contextValue: context.userRole,
        adaptedDescription: await this.processTemplate(
          roleTemplate.recommendedApproachPattern,
          variables,
          context
        ),
        specificGuidance: roleTemplate.benefitsEmphasis,
        relevantExamples: await this.generateRoleSpecificExamples(context.userRole, variables),
      }
    }

    // Generate skill-level variations
    if (context.skillLevel && template.skillTemplates[context.skillLevel]) {
      const skillTemplate = template.skillTemplates[context.skillLevel]
      variations[`skill-${context.skillLevel}`] = {
        contextType: 'learning',
        contextValue: context.skillLevel,
        adaptedDescription: await this.generateSkillLevelDescription(
          skillTemplate,
          variables,
          context
        ),
        specificGuidance: skillTemplate.guidanceIntensity.patterns,
        relevantExamples: await this.generateSkillLevelExamples(context.skillLevel, variables),
      }
    }

    return variations
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private async applyPersonalization(
    descriptions: DescriptionLevels,
    context: TemplateContext
  ): Promise<DescriptionLevels> {
    if (!context.processingOptions?.enablePersonalization) {
      return descriptions
    }

    return await this.personalizationEngine.personalizeDescriptions(descriptions, context)
  }

  private async processConditionalPlaceholders(
    content: string,
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<string> {
    // Process {?condition} conditionals
    const conditionalRegex = /\{\?(\w+)\}(.*?)\{\?\/\}/g
    return content.replace(conditionalRegex, (match, condition, content) => {
      return variables[condition] ? content : ''
    })
  }

  private async processDynamicPlaceholders(
    content: string,
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<string> {
    // Process {@function} dynamic content
    const dynamicRegex = /\{@(\w+)(?:\(([^)]*)\))?\}/g
    let result = content

    const matches = Array.from(content.matchAll(dynamicRegex))
    for (const match of matches) {
      const functionName = match[1]
      const args = match[2] ? match[2].split(',').map((s) => s.trim()) : []

      const replacement = await this.executeDynamicFunction(functionName, args, variables, context)
      result = result.replace(match[0], replacement)
    }

    return result
  }

  private async executeDynamicFunction(
    functionName: string,
    args: string[],
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<string> {
    switch (functionName) {
      case 'currentDate':
        return new Date().toLocaleDateString()
      case 'toolCount':
        return String(variables.relatedTools?.length || 0)
      case 'industryTerm': {
        const term = args[0]
        return context.domainContext?.specialTerminology[term] || term
      }
      case 'skillAdjust': {
        const text = args[0]
        return this.adjustForSkillLevel(text, context.skillLevel)
      }
      default:
        logger.warn(`Unknown dynamic function: ${functionName}`)
        return `{@${functionName}}`
    }
  }

  private cleanupPlaceholders(content: string): string {
    // Remove any remaining placeholder brackets
    return content.replace(/\{[^}]*\}/g, '')
  }

  private assessComplexityLevel(
    tool: ToolConfig,
    indicators: any[],
    variables: Record<string, any>
  ): 'simple' | 'moderate' | 'complex' {
    const paramCount = Object.keys(tool.params || {}).length
    const hasDescription = Boolean(tool.description && tool.description.length > 20)

    if (paramCount <= 2 && hasDescription) return 'simple'
    if (paramCount <= 5) return 'moderate'
    return 'complex'
  }

  private async generateQuickTags(
    rules: any[],
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<string[]> {
    const tags = new Set<string>()

    // Add category tag
    tags.add(context.toolCategory)

    // Add platform tag if available
    if (variables.platform) {
      tags.add(variables.platform.toLowerCase())
    }

    // Add role-based tags
    if (context.userRole) {
      tags.add(context.userRole.replace('_', '-'))
    }

    // Add complexity tag
    tags.add(variables.complexityLevel || 'moderate')

    return Array.from(tags).slice(0, 6)
  }

  private estimateUseCaseTime(difficulty: SkillLevel): string {
    const timeEstimates = {
      beginner: '10-15 minutes',
      intermediate: '5-10 minutes',
      advanced: '3-5 minutes',
      expert: '1-3 minutes',
    }
    return timeEstimates[difficulty] || '5-10 minutes'
  }

  private extractPlatform(tool: ToolConfig): string {
    const toolId = tool.id.toLowerCase()
    const name = (tool.name || '').toLowerCase()
    const description = (tool.description || '').toLowerCase()

    const platformKeywords = {
      gmail: 'Gmail',
      slack: 'Slack',
      discord: 'Discord',
      notion: 'Notion',
      airtable: 'Airtable',
      github: 'GitHub',
      mongodb: 'MongoDB',
      openai: 'OpenAI',
    }

    for (const [keyword, platform] of Object.entries(platformKeywords)) {
      if (toolId.includes(keyword) || name.includes(keyword) || description.includes(keyword)) {
        return platform
      }
    }

    return tool.name || 'Platform'
  }

  private getSkillAppropriateLanguage(
    skillLevel: SkillLevel
  ): 'simple' | 'standard' | 'advanced' | 'expert' {
    switch (skillLevel) {
      case 'beginner':
        return 'simple'
      case 'intermediate':
        return 'standard'
      case 'advanced':
        return 'advanced'
      case 'expert':
        return 'expert'
      default:
        return 'standard'
    }
  }

  private async generateRoleSpecificContent(role: UserRole, tool: ToolConfig): Promise<string> {
    const roleContexts = {
      business_user: 'business efficiency and ROI optimization',
      developer: 'technical implementation and integration',
      admin: 'system administration and security management',
      analyst: 'data analysis and reporting capabilities',
      manager: 'team coordination and project oversight',
      researcher: 'research methodology and collaboration',
      designer: 'design workflow and creative process enhancement',
      qa_tester: 'quality assurance and testing automation',
    }

    return `Optimized for ${roleContexts[role] || 'general usage'} scenarios`
  }

  private async generateRoleSpecificExamples(
    role: UserRole,
    variables: Record<string, any>
  ): Promise<string[]> {
    const examples = []
    const toolName = variables.toolName

    switch (role) {
      case 'business_user':
        examples.push(`Use ${toolName} to improve business processes and increase productivity`)
        break
      case 'developer':
        examples.push(
          `Integrate ${toolName} into your development workflow for enhanced automation`
        )
        break
      case 'admin':
        examples.push(`Configure ${toolName} with enterprise security policies and user management`)
        break
      default:
        examples.push(`Apply ${toolName} to your specific ${role} workflows`)
    }

    return examples
  }

  private async generateSkillLevelDescription(
    skillTemplate: any,
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<string> {
    const complexity = skillTemplate.complexityAdjustment
    const toolName = variables.toolName

    switch (complexity.targetLevel) {
      case 'simplified':
        return `${toolName} is designed to be easy to use with step-by-step guidance and clear instructions`
      case 'moderate':
        return `${toolName} provides a balanced approach with key features and practical examples`
      case 'full':
        return `${toolName} offers comprehensive capabilities with advanced configuration options`
      case 'comprehensive':
        return `${toolName} delivers enterprise-grade functionality with full extensibility and customization`
      default:
        return `${toolName} adapts to your skill level and provides appropriate guidance`
    }
  }

  private async generateSkillLevelExamples(
    skillLevel: SkillLevel,
    variables: Record<string, any>
  ): Promise<string[]> {
    const toolName = variables.toolName
    const examples = []

    switch (skillLevel) {
      case 'beginner':
        examples.push(`Start with basic ${toolName} setup and simple operations`)
        examples.push(`Follow the getting started guide for ${toolName}`)
        break
      case 'intermediate':
        examples.push(`Implement ${toolName} for common use cases and workflows`)
        examples.push(`Customize ${toolName} settings for your specific needs`)
        break
      case 'advanced':
        examples.push(`Leverage advanced ${toolName} features for complex scenarios`)
        examples.push(`Integrate ${toolName} with other advanced tools and systems`)
        break
      case 'expert':
        examples.push(`Architect solutions using ${toolName} at enterprise scale`)
        examples.push(`Extend ${toolName} capabilities through custom development`)
        break
    }

    return examples
  }

  private adjustForSkillLevel(text: string, skillLevel?: SkillLevel): string {
    if (!skillLevel) return text

    switch (skillLevel) {
      case 'beginner':
        return `${text} (with guided assistance and clear explanations)`
      case 'expert':
        return `${text} (with advanced customization options)`
      default:
        return text
    }
  }

  private calculateComplexity(content: string): number {
    // Simple complexity calculation based on content length and technical terms
    const wordCount = content.split(/\s+/).length
    const technicalTerms = (
      content.match(/\b(API|SDK|integration|configuration|authentication|authorization)\b/gi) || []
    ).length

    return Math.min(wordCount / 100 + technicalTerms / 10, 1.0)
  }

  private estimateReadingTime(content: string): number {
    // Assume 200 words per minute reading speed
    const wordCount = content.split(/\s+/).length
    return Math.ceil(wordCount / 200)
  }

  // Apply customization methods (simplified implementations)
  private async applyRoleCustomizations(
    template: EnhancedDescriptionTemplate,
    role: UserRole,
    customizations: any
  ): Promise<void> {
    // Apply role-specific template customizations
    logger.debug(`Applying role customizations for: ${role}`)
  }

  private async applySkillCustomizations(
    template: EnhancedDescriptionTemplate,
    skillLevel: SkillLevel,
    customizations: any
  ): Promise<void> {
    // Apply skill-level template customizations
    logger.debug(`Applying skill customizations for: ${skillLevel}`)
  }

  private async applyDomainCustomizations(
    template: EnhancedDescriptionTemplate,
    domainContext: DomainContext,
    customizations: any
  ): Promise<void> {
    // Apply domain-specific template customizations
    logger.debug(`Applying domain customizations for: ${domainContext.primaryDomain}`)
  }
}

// =============================================================================
// Supporting Classes
// =============================================================================

class VariableProcessor {
  async processVariables(
    variables: Record<string, any>,
    context: TemplateContext
  ): Promise<Record<string, any>> {
    const processed = { ...variables }

    // Process dynamic variables
    for (const [key, value] of Object.entries(processed)) {
      if (typeof value === 'function') {
        processed[key] = await value(context)
      }
    }

    return processed
  }
}

class ContentOptimizer {
  async optimizeForContext(content: string, context: TemplateContext): Promise<string> {
    // Apply context-specific optimizations
    let optimized = content

    // Adjust for user preferences
    if (context.userPreferences?.verbosity === 'minimal') {
      optimized = this.makeMoreConcise(optimized)
    } else if (context.userPreferences?.verbosity === 'comprehensive') {
      optimized = this.addMoreDetail(optimized)
    }

    return optimized
  }

  private makeMoreConcise(content: string): string {
    // Simplify and shorten content
    return content
      .replace(/\b(very|quite|really|extremely)\s+/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private addMoreDetail(content: string): string {
    // Add more explanatory content
    return `${content} This provides comprehensive functionality with detailed configuration options and extensive customization capabilities.`
  }
}

class PersonalizationEngine {
  async personalizeDescriptions(
    descriptions: DescriptionLevels,
    context: TemplateContext
  ): Promise<DescriptionLevels> {
    // Apply personalization based on user context
    return descriptions // Simplified implementation
  }

  async personalize(content: string, context: TemplateContext): Promise<string> {
    // Apply personalization to content
    return content // Simplified implementation
  }
}

class QualityAnalyzer {
  async analyzeContent(content: string): Promise<number> {
    // Analyze content quality and return score (0-1)
    const wordCount = content.split(/\s+/).length
    const hasProperStructure = content.includes('.') && content.length > 10
    const hasVariedVocabulary = new Set(content.toLowerCase().split(/\s+/)).size / wordCount > 0.5

    let score = 0.5
    if (wordCount > 20) score += 0.2
    if (hasProperStructure) score += 0.2
    if (hasVariedVocabulary) score += 0.1

    return Math.min(score, 1.0)
  }
}

// =============================================================================
// Supporting Types
// =============================================================================

export interface TemplateEngineOptions {
  templateRegistry?: DescriptionTemplateRegistry
  nlpProcessor?: NLPProcessor
}

export interface TemplateCustomization {
  roleCustomizations?: Record<UserRole, any>
  skillCustomizations?: Record<SkillLevel, any>
  domainCustomizations?: Record<string, any>
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create intelligent template engine
 */
export function createIntelligentTemplateEngine(
  options?: TemplateEngineOptions
): IntelligentTemplateEngine {
  return new IntelligentTemplateEngine(options)
}

/**
 * Generate descriptions using intelligent templates
 */
export async function generateIntelligentDescriptions(
  tool: ToolConfig,
  context: Partial<TemplateContext> = {}
): Promise<DescriptionLevels> {
  const engine = createIntelligentTemplateEngine()

  const fullContext: TemplateContext = {
    tool,
    toolCategory: inferToolCategory(tool),
    processingOptions: {
      enableDynamicContent: true,
      enablePersonalization: true,
      enableContextualAdaptation: true,
      contentOptimization: 'balanced',
      outputFormat: 'text',
    },
    ...context,
  }

  return await engine.generateEnhancedDescriptions(fullContext)
}

/**
 * Infer tool category from tool configuration
 */
function inferToolCategory(tool: ToolConfig): ToolCategory {
  const toolId = tool.id.toLowerCase()
  const name = (tool.name || '').toLowerCase()
  const description = (tool.description || '').toLowerCase()
  const text = `${toolId} ${name} ${description}`

  if (['email', 'slack', 'message', 'send', 'notify'].some((term) => text.includes(term))) {
    return 'communication'
  }
  if (['database', 'store', 'save', 'mongo', 'sql'].some((term) => text.includes(term))) {
    return 'data_storage'
  }
  if (['search', 'find', 'google', 'query'].some((term) => text.includes(term))) {
    return 'search_research'
  }
  if (['ai', 'openai', 'generate', 'ml', 'model'].some((term) => text.includes(term))) {
    return 'ai_ml'
  }

  return 'productivity'
}
