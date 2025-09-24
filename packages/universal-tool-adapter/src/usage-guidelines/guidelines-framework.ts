/**
 * Usage Guidelines Framework
 *
 * Comprehensive system for authoring, managing, and delivering contextual
 * usage guidelines for all tools in the Universal Tool Adapter system.
 *
 * @author USAGE_GUIDELINES_SYSTEM_AGENT
 * @version 1.0.0
 */

import { z } from 'zod'
import { Logger } from '../utils/logger'

// =============================================================================
// Core Framework Types
// =============================================================================

/**
 * Comprehensive guideline structure with contextual adaptations
 */
export interface GuidelineDefinition {
  // Basic identification
  id: string
  toolId: string
  title: string
  description: string
  version: string
  lastUpdated: Date

  // Guideline categories
  category: GuidelineCategory
  complexity: 'beginner' | 'intermediate' | 'advanced'
  priority: 'low' | 'medium' | 'high' | 'critical'

  // Usage contexts where this guideline applies
  applicableContexts: UsageContextMatcher[]

  // Core guideline content
  content: GuidelineContent

  // Contextual adaptations for different scenarios
  adaptations: GuidelineAdaptations

  // Metadata and relationships
  metadata: GuidelineMetadata
}

export interface GuidelineContent {
  // When to use guidance
  whenToUse: {
    primary: string
    scenarios: ScenarioDefinition[]
    conditions: ContextCondition[]
    antipatterns: string[] // When NOT to use
  }

  // How to use guidance
  howToUse: {
    quickStart: QuickStartGuide
    stepByStep: StepByStepGuide
    parameterGuidance: ParameterGuidanceMap
    bestPractices: BestPractice[]
    commonMistakes: CommonMistake[]
  }

  // Examples and patterns
  examples: {
    basic: ExampleUsage[]
    advanced: ExampleUsage[]
    realWorld: RealWorldExample[]
    conversational: ConversationFlow[]
  }

  // Troubleshooting information
  troubleshooting: {
    commonIssues: TroubleshootingGuide[]
    errorCodes: ErrorCodeMap
    diagnostics: DiagnosticStep[]
    recovery: RecoveryProcedure[]
  }

  // Related information
  relatedResources: {
    alternativeTools: AlternativeTool[]
    complementaryTools: ComplementaryTool[]
    prerequisites: Prerequisite[]
    followUpActions: FollowUpAction[]
  }
}

export interface GuidelineAdaptations {
  // User experience level adaptations
  experienceLevel: {
    beginner: ContentVariation
    intermediate: ContentVariation
    advanced: ContentVariation
  }

  // User role adaptations
  userRole: Record<string, ContentVariation>

  // Context-specific adaptations
  contextual: {
    urgent: ContentVariation
    collaborative: ContentVariation
    automated: ContentVariation
  }

  // Industry/domain specific adaptations
  domainSpecific: Record<string, ContentVariation>

  // Language and locale adaptations
  localization: Record<string, LocalizedContent>
}

export interface GuidelineMetadata {
  // Authoring information
  author: string
  contributors: string[]
  reviewedBy: string[]
  approvedBy?: string

  // Usage statistics
  usageStats: {
    viewCount: number
    helpfulVotes: number
    unhelpfulVotes: number
    feedbackCount: number
    lastAccessed: Date
  }

  // Quality metrics
  quality: {
    completeness: number // 0-1 score
    accuracy: number // 0-1 score
    clarity: number // 0-1 score
    usefulness: number // 0-1 score
  }

  // Relationships
  relationships: {
    dependsOn: string[] // Other guideline IDs
    supersedes: string[] // Older guideline versions
    relatedTo: string[] // Related guidelines
    conflictsWith: string[] // Potentially conflicting guidelines
  }

  // Lifecycle information
  lifecycle: {
    status: 'draft' | 'review' | 'approved' | 'published' | 'deprecated'
    reviewDate?: Date
    deprecationDate?: Date
    migrationPath?: string
  }
}

// =============================================================================
// Supporting Types
// =============================================================================

export type GuidelineCategory =
  | 'setup'
  | 'configuration'
  | 'basic-usage'
  | 'advanced-usage'
  | 'integration'
  | 'troubleshooting'
  | 'optimization'
  | 'security'
  | 'best-practices'

export interface UsageContextMatcher {
  type: 'user' | 'workflow' | 'environment' | 'tool' | 'custom'
  field: string
  operator: 'equals' | 'contains' | 'matches' | 'in' | 'range' | 'exists'
  value: any
  weight: number
  description?: string
}

export interface ScenarioDefinition {
  title: string
  description: string
  context: Record<string, any>
  preconditions: string[]
  expectedOutcome: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface ContextCondition {
  description: string
  condition: string // Natural language or programmatic condition
  examples: string[]
}

export interface QuickStartGuide {
  summary: string
  essentialSteps: string[]
  minimumRequiredFields: string[]
  estimatedTime: string
  successCriteria: string[]
}

export interface StepByStepGuide {
  title: string
  overview: string
  prerequisites: string[]
  steps: GuideStep[]
  verification: VerificationStep[]
  troubleshooting: string[]
}

export interface GuideStep {
  stepNumber: number
  title: string
  description: string
  action: string
  expectedResult?: string
  screenshots?: string[]
  codeExamples?: CodeExample[]
  tips?: string[]
  warnings?: string[]
}

export interface ParameterGuidanceMap {
  [parameterName: string]: ParameterGuidance
}

export interface ParameterGuidance {
  description: string
  importance: 'required' | 'recommended' | 'optional'
  dataType: string
  format?: string
  examples: any[]
  defaultValue?: any
  validationRules: string[]
  commonValues: any[]
  tips: string[]
  relatedParameters: string[]
  conditionalGuidance?: ConditionalParameterGuidance[]
}

export interface ConditionalParameterGuidance {
  condition: string
  guidance: string
  examples: any[]
}

export interface BestPractice {
  title: string
  description: string
  category: 'performance' | 'security' | 'usability' | 'maintenance' | 'integration'
  importance: 'low' | 'medium' | 'high' | 'critical'
  implementation: string[]
  benefits: string[]
  evidence?: string // Link to documentation or studies
}

export interface CommonMistake {
  title: string
  description: string
  consequence: string
  howToAvoid: string[]
  howToFix: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  frequency: 'rare' | 'uncommon' | 'common' | 'very-common'
}

export interface ExampleUsage {
  title: string
  description: string
  input: Record<string, any>
  context?: Record<string, any>
  expectedOutput: any
  explanation: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
}

export interface RealWorldExample {
  title: string
  scenario: string
  businessContext: string
  implementation: {
    approach: string
    parameters: Record<string, any>
    workflow: string[]
  }
  results: {
    outcome: string
    metrics?: Record<string, number>
    learnings: string[]
  }
  applicability: string[]
}

export interface ConversationFlow {
  title: string
  description: string
  userIntent: string
  conversation: ConversationTurn[]
  keyPoints: string[]
  variations: ConversationVariation[]
}

export interface ConversationTurn {
  speaker: 'user' | 'assistant'
  message: string
  context?: Record<string, any>
  toolInvocation?: {
    tool: string
    parameters: Record<string, any>
    result: any
  }
  explanation?: string
}

export interface ConversationVariation {
  title: string
  description: string
  modifiedTurns: number[] // Indices of turns that change
  newConversation: ConversationTurn[]
}

export interface TroubleshootingGuide {
  issue: string
  symptoms: string[]
  possibleCauses: string[]
  diagnosticSteps: DiagnosticStep[]
  solutions: Solution[]
  prevention: string[]
  escalation?: {
    when: string
    how: string
    contacts: string[]
  }
}

export interface DiagnosticStep {
  step: string
  command?: string
  expectedResult: string
  interpretation: Record<string, string>
  nextSteps: string[]
}

export interface Solution {
  title: string
  description: string
  steps: string[]
  complexity: 'simple' | 'moderate' | 'complex'
  estimatedTime: string
  riskLevel: 'low' | 'medium' | 'high'
  successCriteria: string[]
}

export interface ErrorCodeMap {
  [errorCode: string]: {
    description: string
    commonCauses: string[]
    quickFixes: string[]
    detailedSolution: string
    relatedIssues: string[]
  }
}

export interface RecoveryProcedure {
  scenario: string
  description: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  steps: string[]
  rollbackOptions: string[]
  verification: string[]
}

export interface AlternativeTool {
  toolId: string
  toolName: string
  whenToUse: string
  advantages: string[]
  disadvantages: string[]
  migrationGuide?: string
}

export interface ComplementaryTool {
  toolId: string
  toolName: string
  relationship: 'prerequisite' | 'enhancement' | 'post-processing' | 'validation'
  description: string
  integrationPattern: string
}

export interface Prerequisite {
  type: 'permission' | 'configuration' | 'data' | 'dependency' | 'knowledge'
  title: string
  description: string
  howToFulfill: string[]
  validationMethod?: string
}

export interface FollowUpAction {
  title: string
  description: string
  when: string
  steps: string[]
  tools?: string[]
  expectedBenefit: string
}

export interface ContentVariation {
  title?: string
  description?: string
  emphasisPoints: string[]
  additionalContent?: string[]
  omittedContent?: string[]
  modifiedExamples?: ExampleUsage[]
  customInstructions?: string[]
}

export interface LocalizedContent {
  language: string
  region?: string
  translatedContent: Partial<GuidelineContent>
  culturalAdaptations: string[]
  localExamples: ExampleUsage[]
}

export interface VerificationStep {
  description: string
  method: 'visual' | 'programmatic' | 'behavioral' | 'output'
  criteria: string
  troubleshooting?: string[]
}

export interface CodeExample {
  language: string
  code: string
  description: string
  runnable: boolean
  dependencies?: string[]
}

// =============================================================================
// Guideline Template System
// =============================================================================

/**
 * Template system for creating standardized guidelines
 */
export class GuidelineTemplate {
  public readonly id: string
  public readonly name: string
  public readonly description: string
  public readonly applicableCategories: GuidelineCategory[]
  public readonly schema: z.ZodSchema<Partial<GuidelineDefinition>>

  constructor(
    id: string,
    name: string,
    description: string,
    applicableCategories: GuidelineCategory[],
    schema: z.ZodSchema<Partial<GuidelineDefinition>>
  ) {
    this.id = id
    this.name = name
    this.description = description
    this.applicableCategories = applicableCategories
    this.schema = schema
  }

  /**
   * Create a guideline definition from this template
   */
  createGuideline(toolId: string, content: Partial<GuidelineDefinition>): GuidelineDefinition {
    const validated = this.schema.parse(content)

    return {
      id: `${toolId}_${this.id}_${Date.now()}`,
      toolId,
      title: validated.title || `${this.name} for ${toolId}`,
      description: validated.description || `${this.description} for ${toolId}`,
      version: '1.0.0',
      lastUpdated: new Date(),
      category: validated.category || this.applicableCategories[0],
      complexity: validated.complexity || 'beginner',
      priority: validated.priority || 'medium',
      applicableContexts: validated.applicableContexts || [],
      content: this.getDefaultContent(validated.content),
      adaptations: this.getDefaultAdaptations(validated.adaptations),
      metadata: this.getDefaultMetadata(validated.metadata),
    }
  }

  private getDefaultContent(providedContent?: Partial<GuidelineContent>): GuidelineContent {
    return {
      whenToUse: {
        primary:
          providedContent?.whenToUse?.primary || 'When you need to use this tool effectively',
        scenarios: providedContent?.whenToUse?.scenarios || [],
        conditions: providedContent?.whenToUse?.conditions || [],
        antipatterns: providedContent?.whenToUse?.antipatterns || [],
      },
      howToUse: {
        quickStart: providedContent?.howToUse?.quickStart || {
          summary: 'Quick start guide for this tool',
          essentialSteps: [],
          minimumRequiredFields: [],
          estimatedTime: '5 minutes',
          successCriteria: [],
        },
        stepByStep: providedContent?.howToUse?.stepByStep || {
          title: 'Step-by-step guide',
          overview: 'Detailed walkthrough of tool usage',
          prerequisites: [],
          steps: [],
          verification: [],
          troubleshooting: [],
        },
        parameterGuidance: providedContent?.howToUse?.parameterGuidance || {},
        bestPractices: providedContent?.howToUse?.bestPractices || [],
        commonMistakes: providedContent?.howToUse?.commonMistakes || [],
      },
      examples: {
        basic: providedContent?.examples?.basic || [],
        advanced: providedContent?.examples?.advanced || [],
        realWorld: providedContent?.examples?.realWorld || [],
        conversational: providedContent?.examples?.conversational || [],
      },
      troubleshooting: {
        commonIssues: providedContent?.troubleshooting?.commonIssues || [],
        errorCodes: providedContent?.troubleshooting?.errorCodes || {},
        diagnostics: providedContent?.troubleshooting?.diagnostics || [],
        recovery: providedContent?.troubleshooting?.recovery || [],
      },
      relatedResources: {
        alternativeTools: providedContent?.relatedResources?.alternativeTools || [],
        complementaryTools: providedContent?.relatedResources?.complementaryTools || [],
        prerequisites: providedContent?.relatedResources?.prerequisites || [],
        followUpActions: providedContent?.relatedResources?.followUpActions || [],
      },
    }
  }

  private getDefaultAdaptations(
    providedAdaptations?: Partial<GuidelineAdaptations>
  ): GuidelineAdaptations {
    const defaultVariation: ContentVariation = {
      emphasisPoints: [],
      additionalContent: [],
      omittedContent: [],
      modifiedExamples: [],
      customInstructions: [],
    }

    return {
      experienceLevel: {
        beginner: providedAdaptations?.experienceLevel?.beginner || {
          ...defaultVariation,
          emphasisPoints: ['Step-by-step guidance', 'Basic concepts', 'Safety considerations'],
        },
        intermediate: providedAdaptations?.experienceLevel?.intermediate || {
          ...defaultVariation,
          emphasisPoints: ['Best practices', 'Efficiency tips', 'Common patterns'],
        },
        advanced: providedAdaptations?.experienceLevel?.advanced || {
          ...defaultVariation,
          emphasisPoints: ['Advanced techniques', 'Optimization', 'Edge cases'],
        },
      },
      userRole: providedAdaptations?.userRole || {},
      contextual: {
        urgent: providedAdaptations?.contextual?.urgent || {
          ...defaultVariation,
          emphasisPoints: ['Quick solutions', 'Time-critical steps', 'Risk mitigation'],
        },
        collaborative: providedAdaptations?.contextual?.collaborative || {
          ...defaultVariation,
          emphasisPoints: ['Team coordination', 'Permission considerations', 'Communication'],
        },
        automated: providedAdaptations?.contextual?.automated || {
          ...defaultVariation,
          emphasisPoints: ['Automation setup', 'Error handling', 'Monitoring'],
        },
      },
      domainSpecific: providedAdaptations?.domainSpecific || {},
      localization: providedAdaptations?.localization || {},
    }
  }

  private getDefaultMetadata(providedMetadata?: Partial<GuidelineMetadata>): GuidelineMetadata {
    return {
      author: providedMetadata?.author || 'System Generated',
      contributors: providedMetadata?.contributors || [],
      reviewedBy: providedMetadata?.reviewedBy || [],
      approvedBy: providedMetadata?.approvedBy,
      usageStats: {
        viewCount: 0,
        helpfulVotes: 0,
        unhelpfulVotes: 0,
        feedbackCount: 0,
        lastAccessed: new Date(),
      },
      quality: {
        completeness: 0.7,
        accuracy: 0.8,
        clarity: 0.7,
        usefulness: 0.7,
      },
      relationships: {
        dependsOn: [],
        supersedes: [],
        relatedTo: [],
        conflictsWith: [],
      },
      lifecycle: {
        status: 'draft',
      },
    }
  }
}

// =============================================================================
// Standard Template Definitions
// =============================================================================

export const STANDARD_TEMPLATES = {
  // Basic usage template for simple tools
  BASIC_USAGE: new GuidelineTemplate(
    'basic_usage',
    'Basic Usage Guide',
    'Standard template for basic tool usage guidance',
    ['basic-usage'],
    z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(['basic-usage']).optional(),
      complexity: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      content: z
        .object({
          whenToUse: z
            .object({
              primary: z.string(),
              scenarios: z.array(z.any()).optional(),
            })
            .optional(),
          howToUse: z
            .object({
              quickStart: z
                .object({
                  summary: z.string(),
                  essentialSteps: z.array(z.string()),
                })
                .optional(),
            })
            .optional(),
        })
        .optional(),
    })
  ),

  // Setup and configuration template
  SETUP_CONFIGURATION: new GuidelineTemplate(
    'setup_config',
    'Setup & Configuration Guide',
    'Template for tool setup and configuration guidance',
    ['setup', 'configuration'],
    z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(['setup', 'configuration']).optional(),
      content: z
        .object({
          relatedResources: z
            .object({
              prerequisites: z.array(z.any()).optional(),
            })
            .optional(),
        })
        .optional(),
    })
  ),

  // Advanced usage template for complex scenarios
  ADVANCED_USAGE: new GuidelineTemplate(
    'advanced_usage',
    'Advanced Usage Guide',
    'Template for advanced tool usage patterns and techniques',
    ['advanced-usage', 'optimization'],
    z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(['advanced-usage', 'optimization']).optional(),
      complexity: z.enum(['intermediate', 'advanced']).default('advanced'),
    })
  ),

  // Troubleshooting template
  TROUBLESHOOTING: new GuidelineTemplate(
    'troubleshooting',
    'Troubleshooting Guide',
    'Template for troubleshooting and problem resolution',
    ['troubleshooting'],
    z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(['troubleshooting']).optional(),
      content: z
        .object({
          troubleshooting: z
            .object({
              commonIssues: z.array(z.any()).optional(),
              errorCodes: z.record(z.any()).optional(),
            })
            .optional(),
        })
        .optional(),
    })
  ),

  // Integration patterns template
  INTEGRATION_PATTERNS: new GuidelineTemplate(
    'integration',
    'Integration Patterns Guide',
    'Template for tool integration patterns and workflows',
    ['integration'],
    z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(['integration']).optional(),
      content: z
        .object({
          relatedResources: z
            .object({
              complementaryTools: z.array(z.any()).optional(),
            })
            .optional(),
        })
        .optional(),
    })
  ),
}

// =============================================================================
// Template Registry
// =============================================================================

export class GuidelineTemplateRegistry {
  private templates: Map<string, GuidelineTemplate> = new Map()
  private logger: Logger

  constructor() {
    this.logger = new Logger('GuidelineTemplateRegistry')
    this.registerStandardTemplates()
  }

  /**
   * Register a new guideline template
   */
  registerTemplate(template: GuidelineTemplate): void {
    this.templates.set(template.id, template)
    this.logger.info(`Registered guideline template: ${template.id}`, {
      templateId: template.id,
      name: template.name,
      categories: template.applicableCategories,
    })
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId: string): GuidelineTemplate | null {
    return this.templates.get(templateId) || null
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): GuidelineTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Find templates by category
   */
  getTemplatesByCategory(category: GuidelineCategory): GuidelineTemplate[] {
    return Array.from(this.templates.values()).filter((template) =>
      template.applicableCategories.includes(category)
    )
  }

  private registerStandardTemplates(): void {
    Object.values(STANDARD_TEMPLATES).forEach((template) => {
      this.registerTemplate(template)
    })
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createGuidelineTemplateRegistry(): GuidelineTemplateRegistry {
  return new GuidelineTemplateRegistry()
}

export function createGuidelineFromTemplate(
  templateId: string,
  toolId: string,
  content: Partial<GuidelineDefinition>,
  registry?: GuidelineTemplateRegistry
): GuidelineDefinition | null {
  const templateRegistry = registry || createGuidelineTemplateRegistry()
  const template = templateRegistry.getTemplate(templateId)

  if (!template) {
    return null
  }

  return template.createGuideline(toolId, content)
}
