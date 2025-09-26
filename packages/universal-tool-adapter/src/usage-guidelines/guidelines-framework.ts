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
  value?: any
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
  expectedOutput?: any
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
    result?: any
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
  public readonly schema: z.ZodType<
    Partial<GuidelineDefinition>,
    z.ZodTypeDef,
    Partial<GuidelineDefinition>
  >

  constructor(
    id: string,
    name: string,
    description: string,
    applicableCategories: GuidelineCategory[],
    schema: z.ZodType<Partial<GuidelineDefinition>, z.ZodTypeDef, Partial<GuidelineDefinition>>
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
// Zod Schema Definitions
// =============================================================================

// Supporting schemas for nested objects
const UsageContextMatcherSchema = z.object({
  type: z.enum(['user', 'workflow', 'environment', 'tool', 'custom']),
  field: z.string(),
  operator: z.enum(['equals', 'contains', 'matches', 'in', 'range', 'exists']),
  value: z.any().optional(),
  weight: z.number(),
  description: z.string().optional(),
})

const ScenarioDefinitionSchema = z.object({
  title: z.string(),
  description: z.string(),
  context: z.record(z.any()),
  preconditions: z.array(z.string()),
  expectedOutcome: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
})

const ContextConditionSchema = z.object({
  description: z.string(),
  condition: z.string(),
  examples: z.array(z.string()),
})

const QuickStartGuideSchema = z.object({
  summary: z.string(),
  essentialSteps: z.array(z.string()),
  minimumRequiredFields: z.array(z.string()),
  estimatedTime: z.string(),
  successCriteria: z.array(z.string()),
})

const GuideStepSchema = z.object({
  stepNumber: z.number(),
  title: z.string(),
  description: z.string(),
  action: z.string(),
  expectedResult: z.string().optional(),
  screenshots: z.array(z.string()).optional(),
  codeExamples: z.array(z.any()).optional(),
  tips: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
})

const VerificationStepSchema = z.object({
  description: z.string(),
  method: z.enum(['visual', 'programmatic', 'behavioral', 'output']),
  criteria: z.string(),
  troubleshooting: z.array(z.string()).optional(),
})

const StepByStepGuideSchema = z.object({
  title: z.string(),
  overview: z.string(),
  prerequisites: z.array(z.string()),
  steps: z.array(GuideStepSchema),
  verification: z.array(VerificationStepSchema),
  troubleshooting: z.array(z.string()),
})

const ConditionalParameterGuidanceSchema = z.object({
  condition: z.string(),
  guidance: z.string(),
  examples: z.array(z.any()),
})

const ParameterGuidanceSchema = z.object({
  description: z.string(),
  importance: z.enum(['required', 'recommended', 'optional']),
  dataType: z.string(),
  format: z.string().optional(),
  examples: z.array(z.any()),
  defaultValue: z.any().optional(),
  validationRules: z.array(z.string()),
  commonValues: z.array(z.any()),
  tips: z.array(z.string()),
  relatedParameters: z.array(z.string()),
  conditionalGuidance: z.array(ConditionalParameterGuidanceSchema).optional(),
})

const BestPracticeSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum(['performance', 'security', 'usability', 'maintenance', 'integration']),
  importance: z.enum(['low', 'medium', 'high', 'critical']),
  implementation: z.array(z.string()),
  benefits: z.array(z.string()),
  evidence: z.string().optional(),
})

const CommonMistakeSchema = z.object({
  title: z.string(),
  description: z.string(),
  consequence: z.string(),
  howToAvoid: z.array(z.string()),
  howToFix: z.array(z.string()),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  frequency: z.enum(['rare', 'uncommon', 'common', 'very-common']),
})

const ExampleUsageSchema = z.object({
  title: z.string(),
  description: z.string(),
  input: z.record(z.any()),
  context: z.record(z.any()).optional(),
  expectedOutput: z.any().optional(),
  explanation: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  tags: z.array(z.string()),
})

const RealWorldExampleSchema = z.object({
  title: z.string(),
  scenario: z.string(),
  businessContext: z.string(),
  implementation: z.object({
    approach: z.string(),
    parameters: z.record(z.any()),
    workflow: z.array(z.string()),
  }),
  results: z.object({
    outcome: z.string(),
    metrics: z.record(z.number()).optional(),
    learnings: z.array(z.string()),
  }),
  applicability: z.array(z.string()),
})

const ConversationTurnSchema = z.object({
  speaker: z.enum(['user', 'assistant']),
  message: z.string(),
  context: z.record(z.any()).optional(),
  toolInvocation: z
    .object({
      tool: z.string(),
      parameters: z.record(z.any()),
      result: z.any().optional(),
    })
    .optional(),
  explanation: z.string().optional(),
})

const ConversationVariationSchema = z.object({
  title: z.string(),
  description: z.string(),
  modifiedTurns: z.array(z.number()),
  newConversation: z.array(ConversationTurnSchema),
})

const ConversationFlowSchema = z.object({
  title: z.string(),
  description: z.string(),
  userIntent: z.string(),
  conversation: z.array(ConversationTurnSchema),
  keyPoints: z.array(z.string()),
  variations: z.array(ConversationVariationSchema),
})

const DiagnosticStepSchema = z.object({
  step: z.string(),
  command: z.string().optional(),
  expectedResult: z.string(),
  interpretation: z.record(z.string()),
  nextSteps: z.array(z.string()),
})

const SolutionSchema = z.object({
  title: z.string(),
  description: z.string(),
  steps: z.array(z.string()),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  estimatedTime: z.string(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  successCriteria: z.array(z.string()),
})

const TroubleshootingGuideSchema = z.object({
  issue: z.string(),
  symptoms: z.array(z.string()),
  possibleCauses: z.array(z.string()),
  diagnosticSteps: z.array(DiagnosticStepSchema),
  solutions: z.array(SolutionSchema),
  prevention: z.array(z.string()),
  escalation: z
    .object({
      when: z.string(),
      how: z.string(),
      contacts: z.array(z.string()),
    })
    .optional(),
})

const ErrorCodeMapSchema = z.record(
  z.object({
    description: z.string(),
    commonCauses: z.array(z.string()),
    quickFixes: z.array(z.string()),
    detailedSolution: z.string(),
    relatedIssues: z.array(z.string()),
  })
)

const RecoveryProcedureSchema = z.object({
  scenario: z.string(),
  description: z.string(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  steps: z.array(z.string()),
  rollbackOptions: z.array(z.string()),
  verification: z.array(z.string()),
})

const AlternativeToolSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  whenToUse: z.string(),
  advantages: z.array(z.string()),
  disadvantages: z.array(z.string()),
  migrationGuide: z.string().optional(),
})

const ComplementaryToolSchema = z.object({
  toolId: z.string(),
  toolName: z.string(),
  relationship: z.enum(['prerequisite', 'enhancement', 'post-processing', 'validation']),
  description: z.string(),
  integrationPattern: z.string(),
})

const PrerequisiteSchema = z.object({
  type: z.enum(['permission', 'configuration', 'data', 'dependency', 'knowledge']),
  title: z.string(),
  description: z.string(),
  howToFulfill: z.array(z.string()),
  validationMethod: z.string().optional(),
})

const FollowUpActionSchema = z.object({
  title: z.string(),
  description: z.string(),
  when: z.string(),
  steps: z.array(z.string()),
  tools: z.array(z.string()).optional(),
  expectedBenefit: z.string(),
})

const ContentVariationSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  emphasisPoints: z.array(z.string()),
  additionalContent: z.array(z.string()).optional(),
  omittedContent: z.array(z.string()).optional(),
  modifiedExamples: z.array(ExampleUsageSchema).optional(),
  customInstructions: z.array(z.string()).optional(),
})

const LocalizedContentSchema = z.object({
  language: z.string(),
  region: z.string().optional(),
  translatedContent: z.object({}).optional(), // Partial<GuidelineContent>
  culturalAdaptations: z.array(z.string()),
  localExamples: z.array(ExampleUsageSchema),
})

// Main content schemas
const GuidelineContentSchema = z.object({
  whenToUse: z.object({
    primary: z.string(),
    scenarios: z.array(ScenarioDefinitionSchema),
    conditions: z.array(ContextConditionSchema),
    antipatterns: z.array(z.string()),
  }),
  howToUse: z.object({
    quickStart: QuickStartGuideSchema,
    stepByStep: StepByStepGuideSchema,
    parameterGuidance: z.record(ParameterGuidanceSchema),
    bestPractices: z.array(BestPracticeSchema),
    commonMistakes: z.array(CommonMistakeSchema),
  }),
  examples: z.object({
    basic: z.array(ExampleUsageSchema),
    advanced: z.array(ExampleUsageSchema),
    realWorld: z.array(RealWorldExampleSchema),
    conversational: z.array(ConversationFlowSchema),
  }),
  troubleshooting: z.object({
    commonIssues: z.array(TroubleshootingGuideSchema),
    errorCodes: ErrorCodeMapSchema,
    diagnostics: z.array(DiagnosticStepSchema),
    recovery: z.array(RecoveryProcedureSchema),
  }),
  relatedResources: z.object({
    alternativeTools: z.array(AlternativeToolSchema),
    complementaryTools: z.array(ComplementaryToolSchema),
    prerequisites: z.array(PrerequisiteSchema),
    followUpActions: z.array(FollowUpActionSchema),
  }),
})

const GuidelineAdaptationsSchema = z.object({
  experienceLevel: z.object({
    beginner: ContentVariationSchema,
    intermediate: ContentVariationSchema,
    advanced: ContentVariationSchema,
  }),
  userRole: z.record(ContentVariationSchema),
  contextual: z.object({
    urgent: ContentVariationSchema,
    collaborative: ContentVariationSchema,
    automated: ContentVariationSchema,
  }),
  domainSpecific: z.record(ContentVariationSchema),
  localization: z.record(LocalizedContentSchema),
})

const GuidelineMetadataSchema = z.object({
  author: z.string(),
  contributors: z.array(z.string()),
  reviewedBy: z.array(z.string()),
  approvedBy: z.string().optional(),
  usageStats: z.object({
    viewCount: z.number(),
    helpfulVotes: z.number(),
    unhelpfulVotes: z.number(),
    feedbackCount: z.number(),
    lastAccessed: z.date(),
  }),
  quality: z.object({
    completeness: z.number(),
    accuracy: z.number(),
    clarity: z.number(),
    usefulness: z.number(),
  }),
  relationships: z.object({
    dependsOn: z.array(z.string()),
    supersedes: z.array(z.string()),
    relatedTo: z.array(z.string()),
    conflictsWith: z.array(z.string()),
  }),
  lifecycle: z.object({
    status: z.enum(['draft', 'review', 'approved', 'published', 'deprecated']),
    reviewDate: z.date().optional(),
    deprecationDate: z.date().optional(),
    migrationPath: z.string().optional(),
  }),
})

// Complete GuidelineDefinition schema
const GuidelineDefinitionSchema = z.object({
  id: z.string(),
  toolId: z.string(),
  title: z.string(),
  description: z.string(),
  version: z.string(),
  lastUpdated: z.date(),
  category: z.enum([
    'setup',
    'configuration',
    'basic-usage',
    'advanced-usage',
    'integration',
    'troubleshooting',
    'optimization',
    'security',
    'best-practices',
  ]),
  complexity: z.enum(['beginner', 'intermediate', 'advanced']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  applicableContexts: z.array(UsageContextMatcherSchema),
  content: GuidelineContentSchema,
  adaptations: GuidelineAdaptationsSchema,
  metadata: GuidelineMetadataSchema,
})

// Partial schema for templates
const PartialGuidelineDefinitionSchema = GuidelineDefinitionSchema.partial()

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
    PartialGuidelineDefinitionSchema as z.ZodType<
      Partial<GuidelineDefinition>,
      z.ZodTypeDef,
      Partial<GuidelineDefinition>
    >
  ),

  // Setup and configuration template
  SETUP_CONFIGURATION: new GuidelineTemplate(
    'setup_config',
    'Setup & Configuration Guide',
    'Template for tool setup and configuration guidance',
    ['setup', 'configuration'],
    PartialGuidelineDefinitionSchema as z.ZodType<
      Partial<GuidelineDefinition>,
      z.ZodTypeDef,
      Partial<GuidelineDefinition>
    >
  ),

  // Advanced usage template for complex scenarios
  ADVANCED_USAGE: new GuidelineTemplate(
    'advanced_usage',
    'Advanced Usage Guide',
    'Template for advanced tool usage patterns and techniques',
    ['advanced-usage', 'optimization'],
    PartialGuidelineDefinitionSchema as z.ZodType<
      Partial<GuidelineDefinition>,
      z.ZodTypeDef,
      Partial<GuidelineDefinition>
    >
  ),

  // Troubleshooting template
  TROUBLESHOOTING: new GuidelineTemplate(
    'troubleshooting',
    'Troubleshooting Guide',
    'Template for troubleshooting and problem resolution',
    ['troubleshooting'],
    PartialGuidelineDefinitionSchema as z.ZodType<
      Partial<GuidelineDefinition>,
      z.ZodTypeDef,
      Partial<GuidelineDefinition>
    >
  ),

  // Integration patterns template
  INTEGRATION_PATTERNS: new GuidelineTemplate(
    'integration',
    'Integration Patterns Guide',
    'Template for tool integration patterns and workflows',
    ['integration'],
    PartialGuidelineDefinitionSchema as z.ZodType<
      Partial<GuidelineDefinition>,
      z.ZodTypeDef,
      Partial<GuidelineDefinition>
    >
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
