/**
 * Contextual Adaptation System for Natural Language Descriptions
 *
 * Provides sophisticated adaptation capabilities that modify tool descriptions
 * based on user context, role, skill level, domain, and situational factors.
 * This system ensures that tool descriptions are contextually relevant and
 * appropriately tailored for each user.
 *
 * @author Natural Language Framework Agent
 * @version 2.0.0
 */

import type { UsageContext, UserProfile } from '../natural-language/usage-guidelines'
import type {
  AdaptationPreferences,
  AdaptedDescription,
  ContextType,
  DescriptionAdaptation,
  EnhancedDescriptionSchema,
  SkillLevel,
  UserRole,
} from './natural-language-description-framework'

// Extended UserProfile with additional fields for enhanced adaptation
interface ExtendedUserProfile extends UserProfile {
  skillLevel?: SkillLevel
  isLearning?: boolean
}

// Extended UsageContext with additional fields for enhanced adaptation
interface ExtendedUsageContext extends UsageContext {
  userProfile?: ExtendedUserProfile
  organizationId?: string
  projectId?: string
  teamId?: string
  teamSize?: number
  intent?: 'learning' | 'troubleshooting' | 'implementation' | 'exploration'
  urgency?: 'low' | 'medium' | 'high' | 'critical'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  hasErrors?: boolean
  taskType?: string
  domain?: string
}

import { createLogger } from '../utils/logger'

const logger = createLogger('ContextualAdapters')

// =============================================================================
// Adaptation Context Types
// =============================================================================

export interface AdaptationContext {
  userProfile?: UserProfile
  organizationalContext?: OrganizationalContext
  projectContext?: ProjectContext
  temporalContext?: TemporalContext
  environmentContext?: EnvironmentContext
  preferenceContext?: PreferenceContext
}

export interface OrganizationalContext {
  industry: string
  companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  complianceRequirements: string[]
  technologyStack: string[]
  securityLevel: 'basic' | 'standard' | 'enhanced' | 'strict'
}

export interface ProjectContext {
  projectType: string
  timeline: 'urgent' | 'normal' | 'extended'
  complexity: 'simple' | 'moderate' | 'complex'
  teamSize: number
  budget: 'limited' | 'moderate' | 'flexible'
}

export interface TemporalContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  dayOfWeek: 'weekday' | 'weekend'
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

export interface EnvironmentContext {
  platform: 'web' | 'mobile' | 'desktop' | 'api'
  connectivity: 'high' | 'medium' | 'low' | 'offline'
  deviceType: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'server'
  location: 'office' | 'home' | 'mobile' | 'unknown'
}

export interface PreferenceContext {
  verbosity: 'minimal' | 'concise' | 'detailed' | 'comprehensive'
  technicalDepth: 'basic' | 'intermediate' | 'advanced' | 'expert'
  examplePreference: 'none' | 'few' | 'many'
  formatPreference: 'text' | 'structured' | 'visual' | 'interactive'
}

// =============================================================================
// Base Contextual Adapter
// =============================================================================

export abstract class BaseContextualAdapter {
  protected adapterId: string
  protected adapterName: string
  protected supportedContextTypes: ContextType[]

  constructor(adapterId: string, adapterName: string, supportedContextTypes: ContextType[]) {
    this.adapterId = adapterId
    this.adapterName = adapterName
    this.supportedContextTypes = supportedContextTypes

    logger.debug(`Contextual adapter initialized: ${adapterName}`)
  }

  /**
   * Check if this adapter can handle the given context
   */
  canHandle(context: ExtendedUsageContext): boolean {
    // Check if any supported context type matches the usage context
    return this.supportedContextTypes.some((type) => this.isContextTypeRelevant(type, context))
  }

  /**
   * Abstract method for adapting descriptions
   */
  abstract adapt(
    schema: EnhancedDescriptionSchema,
    context: ExtendedUsageContext
  ): Promise<DescriptionAdaptation>

  /**
   * Get adapter priority for conflict resolution
   */
  getPriority(context: ExtendedUsageContext): number {
    return 1.0 // Default priority, override in subclasses
  }

  /**
   * Check if a context type is relevant to the usage context
   */
  protected isContextTypeRelevant(
    contextType: ContextType,
    context: ExtendedUsageContext
  ): boolean {
    switch (contextType) {
      case 'workflow':
        return Boolean(context.workflowId || context.taskType)
      case 'project':
        return Boolean(context.projectId || context.projectType)
      case 'team':
        return Boolean(context.teamId || context.teamSize)
      case 'organization':
        return Boolean(context.organizationId || context.industry)
      case 'industry':
        return Boolean(context.industry)
      case 'emergency':
        return context.urgency === 'critical' || context.priority === 'urgent'
      case 'learning':
        return context.intent === 'learning' || Boolean(context.userProfile?.isLearning)
      case 'troubleshooting':
        return context.intent === 'troubleshooting' || Boolean(context.hasErrors)
      default:
        return false
    }
  }

  /**
   * Calculate adaptation confidence score
   */
  protected calculateConfidence(
    schema: EnhancedDescriptionSchema,
    context: ExtendedUsageContext
  ): number {
    let confidence = 0.5 // Base confidence

    // Increase confidence based on context completeness
    if (context.userProfile) confidence += 0.2
    if (context.organizationId) confidence += 0.1
    if (context.projectId) confidence += 0.1
    if (context.intent) confidence += 0.1

    return Math.min(confidence, 1.0)
  }
}

// =============================================================================
// Role-Based Contextual Adapter
// =============================================================================

export class RoleBasedAdapter extends BaseContextualAdapter {
  private roleStrategies: Map<UserRole, RoleAdaptationStrategy>

  constructor() {
    super('role-based', 'Role-Based Adapter', ['team', 'organization'])
    this.roleStrategies = new Map()
    this.initializeRoleStrategies()
  }

  async adapt(
    schema: EnhancedDescriptionSchema,
    context: ExtendedUsageContext
  ): Promise<DescriptionAdaptation> {
    const userRole = context.userProfile?.role
    if (!userRole) {
      throw new Error('User role required for role-based adaptation')
    }

    const strategy = this.roleStrategies.get(userRole)
    if (!strategy) {
      logger.warn(`No adaptation strategy found for role: ${userRole}`)
      return this.createDefaultAdaptation(schema, context)
    }

    logger.debug(`Applying role-based adaptation for: ${userRole}`)

    const adaptedSchema = await this.applyRoleStrategy(schema, strategy, context)
    const adaptationSummary = this.generateAdaptationSummary(userRole as UserRole, strategy)

    return {
      type: 'role-based',
      adapterId: this.adapterId,
      confidence: this.calculateConfidence(schema, context),
      changes: {
        perspective: strategy.perspective,
        emphasis: strategy.emphasis,
        language: strategy.languageAdjustments,
        examples: await this.generateRoleSpecificExamples(schema, strategy, context),
      },
      metadata: {
        role: userRole,
        strategy: strategy.name,
        adaptedSections: ['descriptions', 'usageGuidance', 'examples'],
      },
      summary: adaptationSummary,
    }
  }

  private initializeRoleStrategies(): void {
    this.roleStrategies.set('business_user', {
      name: 'Business User Strategy',
      perspective: 'business-focused',
      emphasis: ['roi', 'efficiency', 'ease-of-use'],
      languageAdjustments: {
        technicalTerms: 'simplify',
        businessTerms: 'emphasize',
        tone: 'professional',
      },
      contentFocus: ['business-value', 'use-cases', 'benefits'],
      exampleTypes: ['business-scenarios', 'roi-examples'],
    })

    this.roleStrategies.set('developer', {
      name: 'Developer Strategy',
      perspective: 'technical-focused',
      emphasis: ['implementation', 'integration', 'customization'],
      languageAdjustments: {
        technicalTerms: 'preserve',
        businessTerms: 'maintain',
        tone: 'technical',
      },
      contentFocus: ['technical-details', 'api-usage', 'code-examples'],
      exampleTypes: ['code-samples', 'integration-patterns'],
    })

    this.roleStrategies.set('admin', {
      name: 'Administrator Strategy',
      perspective: 'operational-focused',
      emphasis: ['security', 'scalability', 'management'],
      languageAdjustments: {
        technicalTerms: 'preserve',
        businessTerms: 'maintain',
        tone: 'authoritative',
      },
      contentFocus: ['security-features', 'admin-controls', 'scalability'],
      exampleTypes: ['security-scenarios', 'configuration-examples'],
    })

    this.roleStrategies.set('analyst', {
      name: 'Analyst Strategy',
      perspective: 'data-focused',
      emphasis: ['data-insights', 'reporting', 'analytics'],
      languageAdjustments: {
        technicalTerms: 'explain',
        businessTerms: 'emphasize',
        tone: 'analytical',
      },
      contentFocus: ['data-capabilities', 'reporting-features', 'analysis-tools'],
      exampleTypes: ['analysis-scenarios', 'report-examples'],
    })

    this.roleStrategies.set('manager', {
      name: 'Manager Strategy',
      perspective: 'oversight-focused',
      emphasis: ['team-productivity', 'visibility', 'control'],
      languageAdjustments: {
        technicalTerms: 'simplify',
        businessTerms: 'emphasize',
        tone: 'executive',
      },
      contentFocus: ['team-benefits', 'oversight-tools', 'productivity-metrics'],
      exampleTypes: ['management-scenarios', 'team-examples'],
    })

    // Add more role strategies as needed...
    this.addAdditionalRoleStrategies()
  }

  private addAdditionalRoleStrategies(): void {
    this.roleStrategies.set('researcher', {
      name: 'Researcher Strategy',
      perspective: 'research-focused',
      emphasis: ['data-quality', 'methodology', 'collaboration'],
      languageAdjustments: {
        technicalTerms: 'explain',
        businessTerms: 'contextualize',
        tone: 'academic',
      },
      contentFocus: ['research-capabilities', 'data-sources', 'collaboration-tools'],
      exampleTypes: ['research-scenarios', 'methodology-examples'],
    })

    this.roleStrategies.set('designer', {
      name: 'Designer Strategy',
      perspective: 'design-focused',
      emphasis: ['user-experience', 'workflow', 'creativity'],
      languageAdjustments: {
        technicalTerms: 'explain',
        businessTerms: 'maintain',
        tone: 'creative',
      },
      contentFocus: ['design-integration', 'workflow-enhancement', 'creative-features'],
      exampleTypes: ['design-scenarios', 'workflow-examples'],
    })

    this.roleStrategies.set('qa_tester', {
      name: 'QA Tester Strategy',
      perspective: 'quality-focused',
      emphasis: ['testing', 'validation', 'reliability'],
      languageAdjustments: {
        technicalTerms: 'preserve',
        businessTerms: 'maintain',
        tone: 'methodical',
      },
      contentFocus: ['testing-capabilities', 'validation-features', 'quality-metrics'],
      exampleTypes: ['testing-scenarios', 'validation-examples'],
    })
  }

  private async applyRoleStrategy(
    schema: EnhancedDescriptionSchema,
    strategy: RoleAdaptationStrategy,
    context: ExtendedUsageContext
  ): Promise<EnhancedDescriptionSchema> {
    // Create adapted schema with role-specific modifications
    const adaptedSchema = JSON.parse(JSON.stringify(schema)) // Deep copy

    // Adjust descriptions based on role strategy
    if (adaptedSchema.descriptions.brief) {
      adaptedSchema.descriptions.brief = await this.adaptBriefDescription(
        adaptedSchema.descriptions.brief,
        strategy
      )
    }

    if (adaptedSchema.descriptions.detailed) {
      adaptedSchema.descriptions.detailed = await this.adaptDetailedDescription(
        adaptedSchema.descriptions.detailed,
        strategy
      )
    }

    // Adjust usage guidance
    if (adaptedSchema.usageGuidance) {
      adaptedSchema.usageGuidance = await this.adaptUsageGuidance(
        adaptedSchema.usageGuidance,
        strategy,
        context
      )
    }

    return adaptedSchema
  }

  private async adaptBriefDescription(brief: any, strategy: RoleAdaptationStrategy): Promise<any> {
    // Adjust language and emphasis based on role
    const adapted = { ...brief }

    // Modify summary based on perspective
    if (strategy.perspective === 'business-focused') {
      adapted.summary = this.emphasizeBusinessValue(adapted.summary)
    } else if (strategy.perspective === 'technical-focused') {
      adapted.summary = this.emphasizeTechnicalCapabilities(adapted.summary)
    }

    return adapted
  }

  private async adaptDetailedDescription(
    detailed: any,
    strategy: RoleAdaptationStrategy
  ): Promise<any> {
    const adapted = { ...detailed }

    // Filter and prioritize benefits based on role emphasis
    if (detailed.benefits && strategy.emphasis) {
      adapted.benefits = this.prioritizeBenefitsByRole(detailed.benefits, strategy.emphasis)
    }

    return adapted
  }

  private async adaptUsageGuidance(
    guidance: any,
    strategy: RoleAdaptationStrategy,
    context: ExtendedUsageContext
  ): Promise<any> {
    const adapted = { ...guidance }

    // Add role-specific best practices
    if (adapted.bestPractices) {
      adapted.bestPractices = [
        ...adapted.bestPractices,
        ...this.generateRoleSpecificBestPractices(strategy, context),
      ]
    }

    return adapted
  }

  private generateAdaptationSummary(role: UserRole, strategy: RoleAdaptationStrategy): string {
    return `Adapted for ${role} with ${strategy.perspective} perspective, emphasizing ${strategy.emphasis.join(', ')}`
  }

  private async generateRoleSpecificExamples(
    schema: EnhancedDescriptionSchema,
    strategy: RoleAdaptationStrategy,
    context: ExtendedUsageContext
  ): Promise<string[]> {
    const examples: string[] = []

    strategy.exampleTypes.forEach((type) => {
      switch (type) {
        case 'business-scenarios':
          examples.push(
            `Business use: Improve ${strategy.contentFocus[0]} by implementing ${schema.toolName}`
          )
          break
        case 'code-samples':
          examples.push(`Technical implementation: Configure ${schema.toolName} API integration`)
          break
        case 'security-scenarios':
          examples.push(
            `Security configuration: Set up ${schema.toolName} with enterprise security policies`
          )
          break
        // Add more example types...
      }
    })

    return examples
  }

  private generateRoleSpecificBestPractices(
    strategy: RoleAdaptationStrategy,
    context: ExtendedUsageContext
  ): string[] {
    const practices: string[] = []

    strategy.emphasis.forEach((emphasis) => {
      switch (emphasis) {
        case 'roi':
          practices.push('Measure and track ROI metrics regularly')
          break
        case 'security':
          practices.push('Follow security best practices and compliance requirements')
          break
        case 'implementation':
          practices.push('Follow coding standards and testing protocols')
          break
        // Add more practices...
      }
    })

    return practices
  }

  // Helper methods for content adaptation
  private emphasizeBusinessValue(text: string): string {
    // Add business-focused language
    if (!text.includes('business')) {
      return text.replace(/^/, 'For business operations: ')
    }
    return text
  }

  private emphasizeTechnicalCapabilities(text: string): string {
    // Add technical-focused language
    if (!text.includes('technical') && !text.includes('API')) {
      return text.replace(/^/, 'Technical solution: ')
    }
    return text
  }

  private prioritizeBenefitsByRole(benefits: string[], emphasis: string[]): string[] {
    // Reorder benefits based on role emphasis
    const prioritized: string[] = []
    const remaining: string[] = []

    benefits.forEach((benefit) => {
      const isHighPriority = emphasis.some((emp) =>
        benefit.toLowerCase().includes(emp.toLowerCase())
      )

      if (isHighPriority) {
        prioritized.push(benefit)
      } else {
        remaining.push(benefit)
      }
    })

    return [...prioritized, ...remaining]
  }

  private createDefaultAdaptation(
    schema: EnhancedDescriptionSchema,
    context: ExtendedUsageContext
  ): DescriptionAdaptation {
    return {
      type: 'role-based',
      adapterId: this.adapterId,
      confidence: 0.3,
      changes: {},
      metadata: { fallback: true },
      summary: 'Default adaptation applied (no specific role strategy)',
    }
  }

  getPriority(context: ExtendedUsageContext): number {
    return context.userProfile?.role ? 0.9 : 0.1
  }
}

// =============================================================================
// Skill Level Adapter
// =============================================================================

export class SkillLevelAdapter extends BaseContextualAdapter {
  private skillStrategies: Map<SkillLevel, SkillAdaptationStrategy>

  constructor() {
    super('skill-level', 'Skill Level Adapter', ['learning', 'troubleshooting'])
    this.skillStrategies = new Map()
    this.initializeSkillStrategies()
  }

  async adapt(
    schema: EnhancedDescriptionSchema,
    context: ExtendedUsageContext
  ): Promise<DescriptionAdaptation> {
    const skillLevel = context.userProfile?.skillLevel || 'intermediate'
    const strategy = this.skillStrategies.get(skillLevel)

    if (!strategy) {
      throw new Error(`No strategy found for skill level: ${skillLevel}`)
    }

    logger.debug(`Applying skill-level adaptation for: ${skillLevel}`)

    const adaptedContent = await this.applySkillStrategy(schema, strategy, context)

    return {
      type: 'skill-level',
      adapterId: this.adapterId,
      confidence: this.calculateConfidence(schema, context),
      changes: {
        complexity: strategy.complexityAdjustment,
        guidance: strategy.guidanceLevel,
        examples: adaptedContent.examples,
        explanations: adaptedContent.explanations,
      },
      metadata: {
        skillLevel,
        strategy: strategy.name,
        adaptedComplexity: strategy.complexityAdjustment.targetLevel,
      },
      summary: `Adapted for ${skillLevel} skill level with ${strategy.guidanceLevel} guidance`,
    }
  }

  private initializeSkillStrategies(): void {
    this.skillStrategies.set('beginner', {
      name: 'Beginner Strategy',
      complexityAdjustment: {
        targetLevel: 'simplified',
        reductionFactor: 0.3,
        simplifications: ['step-by-step', 'definitions', 'examples'],
      },
      guidanceLevel: 'comprehensive',
      explanationDepth: 'detailed',
      exampleCount: 'many',
      prerequisites: ['basic-concepts', 'foundational-knowledge'],
      confidenceBuilders: ['quick-wins', 'progressive-complexity'],
    })

    this.skillStrategies.set('intermediate', {
      name: 'Intermediate Strategy',
      complexityAdjustment: {
        targetLevel: 'moderate',
        reductionFactor: 0.7,
        simplifications: ['key-concepts', 'practical-examples'],
      },
      guidanceLevel: 'moderate',
      explanationDepth: 'focused',
      exampleCount: 'some',
      prerequisites: ['working-knowledge', 'related-tools'],
      confidenceBuilders: ['skill-building', 'advanced-techniques'],
    })

    this.skillStrategies.set('advanced', {
      name: 'Advanced Strategy',
      complexityAdjustment: {
        targetLevel: 'full',
        reductionFactor: 0.9,
        simplifications: ['edge-cases', 'optimization'],
      },
      guidanceLevel: 'minimal',
      explanationDepth: 'concise',
      exampleCount: 'few',
      prerequisites: ['expert-knowledge', 'system-understanding'],
      confidenceBuilders: ['innovation', 'leadership'],
    })

    this.skillStrategies.set('expert', {
      name: 'Expert Strategy',
      complexityAdjustment: {
        targetLevel: 'comprehensive',
        reductionFactor: 1.0,
        simplifications: ['none'],
      },
      guidanceLevel: 'reference',
      explanationDepth: 'technical',
      exampleCount: 'selective',
      prerequisites: ['mastery', 'architecture-knowledge'],
      confidenceBuilders: ['thought-leadership', 'innovation'],
    })
  }

  private async applySkillStrategy(
    schema: EnhancedDescriptionSchema,
    strategy: SkillAdaptationStrategy,
    context: ExtendedUsageContext
  ): Promise<{ examples: string[]; explanations: string[] }> {
    const examples = await this.generateSkillAppropriateExamples(schema, strategy, context)
    const explanations = await this.generateSkillAppropriateExplanations(schema, strategy)

    return { examples, explanations }
  }

  private async generateSkillAppropriateExamples(
    schema: EnhancedDescriptionSchema,
    strategy: SkillAdaptationStrategy,
    context: ExtendedUsageContext
  ): Promise<string[]> {
    const examples: string[] = []
    const toolName = schema.toolName

    switch (strategy.exampleCount) {
      case 'many':
        examples.push(
          `Basic example: Use ${toolName} for simple operations`,
          `Step-by-step: Follow the guided setup process`,
          `Common use case: Apply ${toolName} to everyday tasks`
        )
        break
      case 'some':
        examples.push(
          `Standard usage: Implement ${toolName} for typical workflows`,
          `Best practice: Optimize ${toolName} configuration for your needs`
        )
        break
      case 'few':
        examples.push(`Advanced implementation: Leverage ${toolName} for complex scenarios`)
        break
      case 'selective':
        examples.push(`Expert application: Architect solutions using ${toolName}`)
        break
    }

    return examples
  }

  private async generateSkillAppropriateExplanations(
    schema: EnhancedDescriptionSchema,
    strategy: SkillAdaptationStrategy
  ): Promise<string[]> {
    const explanations: string[] = []

    switch (strategy.explanationDepth) {
      case 'detailed':
        explanations.push(
          'This tool works by processing your input through several stages',
          'Each step has specific requirements and produces predictable outputs',
          'Understanding these fundamentals will help you use the tool effectively'
        )
        break
      case 'focused':
        explanations.push(
          'The key concept is how the tool transforms your input into desired output',
          'Focus on the main workflow and common configuration options'
        )
        break
      case 'concise':
        explanations.push(
          'Core functionality centers on input transformation and output generation'
        )
        break
      case 'technical':
        explanations.push(
          'Architecture leverages established patterns with extensible design principles'
        )
        break
    }

    return explanations
  }

  getPriority(context: ExtendedUsageContext): number {
    return context.userProfile?.skillLevel ? 0.8 : 0.2
  }
}

// =============================================================================
// Domain-Specific Adapter
// =============================================================================

export class DomainSpecificAdapter extends BaseContextualAdapter {
  private domainStrategies: Map<string, DomainAdaptationStrategy>

  constructor() {
    super('domain-specific', 'Domain-Specific Adapter', ['industry', 'organization'])
    this.domainStrategies = new Map()
    this.initializeDomainStrategies()
  }

  async adapt(
    schema: EnhancedDescriptionSchema,
    context: ExtendedUsageContext
  ): Promise<DescriptionAdaptation> {
    const domain = context.industry || context.domain
    if (!domain) {
      throw new Error('Domain information required for domain-specific adaptation')
    }

    const strategy = this.domainStrategies.get(domain.toLowerCase())
    if (!strategy) {
      logger.warn(`No adaptation strategy found for domain: ${domain}`)
      return this.createDefaultDomainAdaptation(schema, context, domain)
    }

    logger.debug(`Applying domain-specific adaptation for: ${domain}`)

    const adaptedContent = await this.applyDomainStrategy(schema, strategy, context)

    return {
      type: 'domain-specific',
      adapterId: this.adapterId,
      confidence: this.calculateConfidence(schema, context),
      changes: {
        terminology: strategy.terminology,
        useCases: adaptedContent.useCases,
        compliance: strategy.complianceConsiderations,
        bestPractices: adaptedContent.bestPractices,
      },
      metadata: {
        domain,
        strategy: strategy.name,
        relevanceScore: strategy.relevanceScore,
      },
      summary: `Adapted for ${domain} domain with industry-specific terminology and use cases`,
    }
  }

  private initializeDomainStrategies(): void {
    this.domainStrategies.set('healthcare', {
      name: 'Healthcare Strategy',
      relevanceScore: 0.95,
      terminology: {
        user: 'patient',
        data: 'patient data',
        record: 'medical record',
        access: 'secure access',
        system: 'healthcare system',
      },
      specificUseCases: [
        'patient data management',
        'medical record keeping',
        'healthcare workflow automation',
        'clinical decision support',
      ],
      complianceConsiderations: ['HIPAA', 'HITECH', 'FDA regulations'],
      bestPracticesForDomain: [
        'Ensure patient data privacy and security',
        'Follow medical documentation standards',
        'Implement audit trails for compliance',
      ],
      industryContext: 'healthcare and medical services',
    })

    this.domainStrategies.set('finance', {
      name: 'Financial Services Strategy',
      relevanceScore: 0.9,
      terminology: {
        transaction: 'financial transaction',
        data: 'financial data',
        record: 'financial record',
        user: 'client',
        system: 'financial system',
      },
      specificUseCases: [
        'financial data analysis',
        'transaction processing',
        'risk management',
        'regulatory reporting',
      ],
      complianceConsiderations: ['SOX', 'PCI DSS', 'Basel III', 'GDPR'],
      bestPracticesForDomain: [
        'Maintain data integrity and accuracy',
        'Implement strong financial controls',
        'Ensure regulatory compliance',
      ],
      industryContext: 'financial services and banking',
    })

    this.domainStrategies.set('education', {
      name: 'Education Strategy',
      relevanceScore: 0.85,
      terminology: {
        user: 'student',
        content: 'educational content',
        system: 'learning management system',
        data: 'student data',
        record: 'academic record',
      },
      specificUseCases: [
        'student information management',
        'educational content delivery',
        'assessment and grading',
        'learning analytics',
      ],
      complianceConsiderations: ['FERPA', 'COPPA', 'state education regulations'],
      bestPracticesForDomain: [
        'Protect student privacy and data',
        'Support diverse learning styles',
        'Ensure accessibility compliance',
      ],
      industryContext: 'education and academic institutions',
    })

    // Add more domain strategies...
    this.addAdditionalDomainStrategies()
  }

  private addAdditionalDomainStrategies(): void {
    this.domainStrategies.set('retail', {
      name: 'Retail Strategy',
      relevanceScore: 0.8,
      terminology: {
        user: 'customer',
        system: 'retail system',
        data: 'customer data',
        transaction: 'purchase',
        record: 'sales record',
      },
      specificUseCases: [
        'customer relationship management',
        'inventory management',
        'sales analytics',
        'e-commerce integration',
      ],
      complianceConsiderations: ['PCI DSS', 'consumer protection laws', 'data privacy'],
      bestPracticesForDomain: [
        'Enhance customer experience',
        'Optimize inventory turnover',
        'Protect payment information',
      ],
      industryContext: 'retail and e-commerce',
    })

    this.domainStrategies.set('manufacturing', {
      name: 'Manufacturing Strategy',
      relevanceScore: 0.85,
      terminology: {
        process: 'manufacturing process',
        system: 'production system',
        data: 'production data',
        user: 'operator',
        record: 'production record',
      },
      specificUseCases: [
        'production planning',
        'quality control',
        'supply chain management',
        'equipment monitoring',
      ],
      complianceConsiderations: ['ISO 9001', 'safety regulations', 'environmental standards'],
      bestPracticesForDomain: [
        'Ensure production quality',
        'Maintain safety standards',
        'Optimize operational efficiency',
      ],
      industryContext: 'manufacturing and production',
    })
  }

  private async applyDomainStrategy(
    schema: EnhancedDescriptionSchema,
    strategy: DomainAdaptationStrategy,
    context: ExtendedUsageContext
  ): Promise<{ useCases: string[]; bestPractices: string[] }> {
    const useCases = await this.generateDomainSpecificUseCases(schema, strategy)
    const bestPractices = await this.generateDomainBestPractices(schema, strategy, context)

    return { useCases, bestPractices }
  }

  private async generateDomainSpecificUseCases(
    schema: EnhancedDescriptionSchema,
    strategy: DomainAdaptationStrategy
  ): Promise<string[]> {
    const toolName = schema.toolName
    const useCases: string[] = []

    strategy.specificUseCases.forEach((useCase) => {
      useCases.push(`${toolName} for ${useCase} in ${strategy.industryContext}`)
    })

    return useCases
  }

  private async generateDomainBestPractices(
    schema: EnhancedDescriptionSchema,
    strategy: DomainAdaptationStrategy,
    context: ExtendedUsageContext
  ): Promise<string[]> {
    const practices: string[] = []

    // Add domain-specific best practices
    practices.push(...strategy.bestPracticesForDomain)

    // Add compliance-related practices
    if (strategy.complianceConsiderations.length > 0) {
      practices.push(`Ensure compliance with ${strategy.complianceConsiderations.join(', ')}`)
    }

    return practices
  }

  private createDefaultDomainAdaptation(
    schema: EnhancedDescriptionSchema,
    context: ExtendedUsageContext,
    domain: string
  ): DescriptionAdaptation {
    return {
      type: 'domain-specific',
      adapterId: this.adapterId,
      confidence: 0.3,
      changes: {
        terminology: {},
        useCases: [`Apply ${schema.toolName} to ${domain} workflows`],
        compliance: [],
        bestPractices: [`Follow ${domain} industry standards`],
      },
      metadata: {
        domain,
        fallback: true,
      },
      summary: `Generic adaptation for ${domain} domain`,
    }
  }

  getPriority(context: ExtendedUsageContext): number {
    return context.industry || context.domain ? 0.7 : 0.1
  }
}

// =============================================================================
// Contextual Adapter Registry
// =============================================================================

export class ContextualAdapterRegistry {
  private adapters: Map<string, BaseContextualAdapter> = new Map()

  constructor() {
    this.registerDefaultAdapters()
  }

  /**
   * Register a contextual adapter
   */
  registerAdapter(adapter: BaseContextualAdapter): void {
    this.adapters.set(adapter.adapterId, adapter)
    logger.info(`Registered contextual adapter: ${adapter.adapterName}`)
  }

  /**
   * Get all adapters that can handle the given context
   */
  getApplicableAdapters(context: ExtendedUsageContext): BaseContextualAdapter[] {
    const applicable: BaseContextualAdapter[] = []

    for (const adapter of this.adapters.values()) {
      if (adapter.canHandle(context)) {
        applicable.push(adapter)
      }
    }

    // Sort by priority
    return applicable.sort((a, b) => b.getPriority(context) - a.getPriority(context))
  }

  /**
   * Apply all applicable adapters to a schema
   */
  async adaptSchema(
    schema: EnhancedDescriptionSchema,
    context: ExtendedUsageContext,
    preferences: AdaptationPreferences = {}
  ): Promise<AdaptedDescription> {
    const applicableAdapters = this.getApplicableAdapters(context)
    const adaptations: DescriptionAdaptation[] = []

    logger.debug(`Applying ${applicableAdapters.length} contextual adapters`)

    // Apply each applicable adapter
    for (const adapter of applicableAdapters) {
      try {
        const adaptation = await adapter.adapt(schema, context)
        adaptations.push(adaptation)
      } catch (error) {
        logger.warn(
          `Adapter ${adapter.adapterId} failed:`,
          error instanceof Error ? { error } : { error: String(error) }
        )
      }
    }

    // Combine adaptations into final result
    return this.combineAdaptations(schema, adaptations, preferences)
  }

  private registerDefaultAdapters(): void {
    this.registerAdapter(new RoleBasedAdapter())
    this.registerAdapter(new SkillLevelAdapter())
    this.registerAdapter(new DomainSpecificAdapter())

    logger.info('Default contextual adapters registered')
  }

  private combineAdaptations(
    originalSchema: EnhancedDescriptionSchema,
    adaptations: DescriptionAdaptation[],
    preferences: AdaptationPreferences
  ): AdaptedDescription {
    // Start with original schema
    const adaptedSchema = JSON.parse(JSON.stringify(originalSchema))
    const adaptationsSummary: string[] = []
    const personalizedElements: string[] = []
    const recommendedNext: string[] = []

    // Apply adaptations in priority order
    adaptations.forEach((adaptation) => {
      // Merge changes into adapted schema
      if (adaptation.changes) {
        this.mergeAdaptationChanges(adaptedSchema, adaptation.changes)
      }

      adaptationsSummary.push(adaptation.summary)

      // Extract personalization elements
      if (adaptation.metadata) {
        personalizedElements.push(`${adaptation.type}: ${JSON.stringify(adaptation.metadata)}`)
      }
    })

    return {
      adaptedSchema,
      adaptationsSummary,
      personalizedElements,
      recommendedNext,
    }
  }

  private mergeAdaptationChanges(schema: any, changes: any): void {
    // Simple deep merge implementation
    Object.keys(changes).forEach((key) => {
      if (typeof changes[key] === 'object' && changes[key] !== null) {
        if (!schema[key]) schema[key] = {}
        this.mergeAdaptationChanges(schema[key], changes[key])
      } else {
        schema[key] = changes[key]
      }
    })
  }
}

// =============================================================================
// Supporting Types
// =============================================================================

interface RoleAdaptationStrategy {
  name: string
  perspective: string
  emphasis: string[]
  languageAdjustments: {
    technicalTerms: 'preserve' | 'simplify' | 'explain'
    businessTerms: 'emphasize' | 'maintain' | 'contextualize'
    tone:
      | 'professional'
      | 'technical'
      | 'authoritative'
      | 'analytical'
      | 'executive'
      | 'academic'
      | 'creative'
      | 'methodical'
  }
  contentFocus: string[]
  exampleTypes: string[]
}

interface SkillAdaptationStrategy {
  name: string
  complexityAdjustment: {
    targetLevel: 'simplified' | 'moderate' | 'full' | 'comprehensive'
    reductionFactor: number
    simplifications: string[]
  }
  guidanceLevel: 'comprehensive' | 'moderate' | 'minimal' | 'reference'
  explanationDepth: 'detailed' | 'focused' | 'concise' | 'technical'
  exampleCount: 'many' | 'some' | 'few' | 'selective'
  prerequisites: string[]
  confidenceBuilders: string[]
}

interface DomainAdaptationStrategy {
  name: string
  relevanceScore: number
  terminology: Record<string, string>
  specificUseCases: string[]
  complianceConsiderations: string[]
  bestPracticesForDomain: string[]
  industryContext: string
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create contextual adapter registry with default adapters
 */
export function createContextualAdapterRegistry(): ContextualAdapterRegistry {
  return new ContextualAdapterRegistry()
}

/**
 * Apply contextual adaptations to a schema
 */
export async function adaptSchemaToContext(
  schema: EnhancedDescriptionSchema,
  context: ExtendedUsageContext,
  preferences?: AdaptationPreferences
): Promise<AdaptedDescription> {
  const registry = createContextualAdapterRegistry()
  return await registry.adaptSchema(schema, context, preferences)
}
