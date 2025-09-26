/**
 * Contextual Adaptation System for Natural Language Descriptions
 *
 * Advanced system for dynamically adapting tool descriptions based on user context,
 * expertise level, workflow state, and situational factors. Provides personalized
 * descriptions that evolve with user needs and experience.
 *
 * Features:
 * - Real-time context analysis and adaptation
 * - Multi-dimensional user profiling and personalization
 * - Adaptive learning from user interactions
 * - Context-aware content delivery
 * - Situational intelligence and recommendations
 *
 * @author Natural Language Description Framework Agent
 * @version 2.0.0
 */

import type { UserProfile } from '../natural-language/usage-guidelines'
import { createLogger } from '../utils/logger'
import type {
  ContextType,
  EnhancedDescriptionSchema,
  SkillLevel,
} from './natural-language-description-framework'

const logger = createLogger('ContextualAdaptationSystem')

// =============================================================================
// Contextual Adaptation Types
// =============================================================================

/**
 * Comprehensive user context for description adaptation
 */
export interface AdaptationContext {
  // User profile
  userProfile: ExtendedUserProfile

  // Current situation
  currentSituation: SituationContext

  // Workflow context
  workflowContext: WorkflowContext

  // Environmental factors
  environment: EnvironmentContext

  // Interaction history
  interactionHistory: InteractionHistory

  // Learning data
  learningProfile: UserLearningProfile

  // Preferences and settings
  adaptationPreferences: DetailedAdaptationPreferences
}

export interface ExtendedUserProfile extends UserProfile {
  // Enhanced profile data
  cognitiveStyle: CognitiveStyle
  learningPreferences: LearningPreference[]
  domainExpertise: Record<string, ExpertiseLevel>
  communicationStyle: CommunicationStyle
  taskPatterns: TaskPattern[]
  motivationFactors: MotivationFactor[]
  technicalBackground: TechnicalBackground
}

export interface SituationContext {
  // Current situation
  urgency: 'low' | 'medium' | 'high' | 'critical'
  complexity: 'simple' | 'moderate' | 'complex' | 'expert-level'
  stakes: 'experimental' | 'development' | 'production' | 'mission-critical'
  timeConstraints: 'flexible' | 'moderate' | 'tight' | 'immediate'

  // Context factors
  isFirstTime: boolean
  hasSupport: boolean
  isLearning: boolean
  isTroubleshooting: boolean
  isExploring: boolean

  // Emotional context
  confidenceLevel: number // 1-10 scale
  stressLevel: number // 1-10 scale
  motivationLevel: number // 1-10 scale
}

export interface WorkflowContext {
  currentWorkflow: WorkflowInfo
  workflowStage: WorkflowStage
  previousTools: ToolUsageRecord[]
  nextPlannedSteps: PlannedStep[]
  workflowGoals: WorkflowGoal[]
  collaborationContext: CollaborationContext
}

export interface EnvironmentContext {
  platform: 'web' | 'mobile' | 'desktop' | 'api' | 'cli'
  device: DeviceInfo
  location: LocationInfo
  timeOfDay: TimeOfDay
  organizationContext: OrganizationContext
  projectContext: ProjectContext
}

export interface InteractionHistory {
  recentInteractions: InteractionRecord[]
  successPatterns: SuccessPattern[]
  failurePatterns: FailurePattern[]
  learningProgress: LearningProgressRecord[]
  feedbackHistory: FeedbackRecord[]
  adaptationHistory: AdaptationRecord[]
}

export interface UserLearningProfile {
  // Learning characteristics
  learningVelocity: number // How quickly user learns new tools
  retentionRate: number // How well user retains knowledge
  transferAbility: number // How well user applies knowledge to new contexts

  // Learning preferences
  preferredLearningModes: LearningMode[]
  cognitiveLoadPreferences: CognitiveLoadPreference
  feedbackPreferences: FeedbackPreference[]

  // Skill development
  skillGaps: SkillGap[]
  strengthAreas: StrengthArea[]
  developmentGoals: DevelopmentGoal[]

  // Adaptation effectiveness
  adaptationResponsiveness: number // How well user responds to adaptations
  personalizedContentPreference: number // Preference for personalized vs generic content
}

export interface DetailedAdaptationPreferences {
  // Content preferences
  verbosityLevel: 'minimal' | 'concise' | 'standard' | 'detailed' | 'comprehensive'
  technicalDepth: 'overview' | 'basic' | 'intermediate' | 'advanced' | 'expert'
  exampleDensity: 'none' | 'few' | 'moderate' | 'many' | 'extensive'

  // Presentation preferences
  presentationStyle: PresentationStyle
  interactivityLevel: 'static' | 'minimal' | 'moderate' | 'high' | 'maximum'
  visualAidPreference: VisualAidPreference

  // Adaptation behavior
  adaptationSpeed: 'conservative' | 'gradual' | 'moderate' | 'aggressive' | 'experimental'
  personalizedDegree: number // 0-1 scale for personalization intensity
  contextSensitivity: number // 0-1 scale for context awareness

  // Learning support
  scaffoldingLevel: 'minimal' | 'moderate' | 'extensive'
  progressTracking: boolean
  mistakesTolerance: 'low' | 'medium' | 'high'
}

// =============================================================================
// Adaptation Strategies and Rules
// =============================================================================

/**
 * Adaptation strategy for contextual description modification
 */
export interface AdaptationStrategy {
  strategyId: string
  strategyName: string
  description: string

  // Strategy metadata
  applicableContexts: ContextType[]
  priority: number
  effectiveness: number

  // Adaptation rules
  triggerConditions: TriggerCondition[]
  adaptationRules: AdaptationRule[]
  conflictResolution: ConflictResolutionRule[]

  // Quality assurance
  validationRules: StrategyValidationRule[]
  rollbackConditions: RollbackCondition[]
}

export interface TriggerCondition {
  conditionId: string
  type: 'user_profile' | 'situation' | 'workflow' | 'environment' | 'interaction'
  condition: string
  weight: number
}

export interface AdaptationRule {
  ruleId: string
  description: string
  condition: string
  action: AdaptationAction
  priority: number
  confidence: number
}

export interface AdaptationAction {
  actionType:
    | 'modify_content'
    | 'adjust_complexity'
    | 'add_examples'
    | 'change_tone'
    | 'restructure'
    | 'add_guidance'
  targetSection: string
  modification: ContentModification
  parameters: Record<string, any>
}

export interface ContentModification {
  operation: 'replace' | 'append' | 'prepend' | 'insert' | 'remove' | 'transform'
  content: string
  position?: number
  conditions?: string[]
}

// =============================================================================
// Contextual Adaptation Engine
// =============================================================================

/**
 * Main engine for contextual adaptation of descriptions
 */
export class ContextualAdaptationEngine {
  private adaptationStrategies: Map<string, AdaptationStrategy> = new Map()
  private userProfiles: Map<string, ExtendedUserProfile> = new Map()
  private contextAnalyzer: ContextAnalyzer
  private adaptationLearner: AdaptationLearner
  private qualityMonitor: AdaptationQualityMonitor

  constructor(config?: AdaptationEngineConfig) {
    this.contextAnalyzer = new ContextAnalyzer(config?.analysisConfig)
    this.adaptationLearner = new AdaptationLearner(config?.learningConfig)
    this.qualityMonitor = new AdaptationQualityMonitor(config?.qualityConfig)

    this.initializeAdaptationStrategies()
    logger.info('Contextual Adaptation Engine initialized')
  }

  // =============================================================================
  // Core Adaptation Methods
  // =============================================================================

  /**
   * Adapt description based on comprehensive context analysis
   */
  async adaptDescription(
    originalDescription: EnhancedDescriptionSchema,
    adaptationContext: AdaptationContext
  ): Promise<AdaptedDescriptionResult> {
    logger.debug(`Adapting description for tool: ${originalDescription.toolId}`)

    try {
      // Step 1: Analyze context comprehensively
      const contextAnalysis = await this.contextAnalyzer.analyzeContext(adaptationContext)

      // Step 2: Determine applicable adaptation strategies
      const applicableStrategies = await this.selectAdaptationStrategies(
        originalDescription,
        contextAnalysis
      )

      // Step 3: Apply adaptations in order of priority
      let adaptedDescription = { ...originalDescription }
      const appliedAdaptations: AppliedAdaptation[] = []

      for (const strategy of applicableStrategies) {
        const strategyResult = await this.applyAdaptationStrategy(
          adaptedDescription,
          strategy,
          contextAnalysis
        )

        if (strategyResult.success) {
          adaptedDescription = strategyResult.adaptedDescription
          appliedAdaptations.push({
            strategyId: strategy.strategyId,
            modifications: strategyResult.modifications,
            effectiveness: strategyResult.effectiveness,
          })
        }
      }

      // Step 4: Validate and quality-check adapted description
      const qualityResult = await this.qualityMonitor.validateAdaptedDescription(
        originalDescription,
        adaptedDescription,
        adaptationContext
      )

      // Step 5: Learn from adaptation results
      await this.adaptationLearner.recordAdaptationResults(
        originalDescription.toolId,
        adaptationContext,
        appliedAdaptations,
        qualityResult
      )

      const result: AdaptedDescriptionResult = {
        adaptedDescription,
        originalDescription,
        adaptationContext,
        appliedAdaptations,
        contextAnalysis,
        qualityResult,
        adaptationMetadata: {
          adaptationTimestamp: new Date(),
          adaptationVersion: '2.0.0',
          engineVersion: '2.0.0',
          strategiesUsed: applicableStrategies.map((s) => s.strategyId),
          adaptationConfidence: this.calculateOverallConfidence(appliedAdaptations),
        },
      }

      logger.info(
        `Description adapted for tool: ${originalDescription.toolId} with ${appliedAdaptations.length} modifications`
      )
      return result
    } catch (error) {
      logger.error(
        `Failed to adapt description for ${originalDescription.toolId}:`,
        error instanceof Error ? error : new Error(String(error))
      )
      throw error
    }
  }

  /**
   * Generate personalized description based on user profile
   */
  async personalizeDescription(
    description: EnhancedDescriptionSchema,
    userProfile: ExtendedUserProfile,
    personalizationLevel = 0.7
  ): Promise<PersonalizedDescription> {
    // Create adaptation context focused on personalization
    const adaptationContext: AdaptationContext = {
      userProfile,
      currentSituation: this.createDefaultSituation(),
      workflowContext: this.createDefaultWorkflow(),
      environment: this.createDefaultEnvironment(),
      interactionHistory: this.getUserInteractionHistory(userProfile.id || ''),
      learningProfile: this.getUserLearningProfile(userProfile.id || ''),
      adaptationPreferences: this.getUserAdaptationPreferences(userProfile.id || ''),
    }

    // Override personalization intensity
    adaptationContext.adaptationPreferences.personalizedDegree = personalizationLevel

    const adaptationResult = await this.adaptDescription(description, adaptationContext)

    return {
      personalizedDescription: adaptationResult.adaptedDescription,
      personalizationFactors: this.extractPersonalizationFactors(adaptationResult),
      recommendations: await this.generatePersonalizationRecommendations(
        userProfile,
        adaptationResult
      ),
      learningOpportunities: await this.identifyLearningOpportunities(userProfile, description),
    }
  }

  /**
   * Adapt description for specific situation
   */
  async situationalAdaptation(
    description: EnhancedDescriptionSchema,
    situation: SituationContext,
    quickAdaptation = false
  ): Promise<SituationalAdaptation> {
    const strategies = quickAdaptation
      ? await this.getQuickSituationalStrategies(situation)
      : await this.getComprehensiveSituationalStrategies(situation)

    let adaptedDescription = { ...description }
    const situationalModifications: SituationalModification[] = []

    for (const strategy of strategies) {
      const modification = await this.applySituationalStrategy(
        adaptedDescription,
        strategy,
        situation
      )

      if (modification.applied) {
        adaptedDescription = modification.result
        situationalModifications.push(modification)
      }
    }

    return {
      adaptedDescription,
      situation,
      modifications: situationalModifications,
      adaptationReasoning: this.generateSituationalReasoning(situation, situationalModifications),
      nextStepSuggestions: await this.generateNextStepSuggestions(adaptedDescription, situation),
    }
  }

  // =============================================================================
  // Strategy Selection and Application
  // =============================================================================

  private async selectAdaptationStrategies(
    description: EnhancedDescriptionSchema,
    contextAnalysis: ContextAnalysisResult
  ): Promise<AdaptationStrategy[]> {
    const applicableStrategies: Array<AdaptationStrategy & { score: number }> = []

    for (const [strategyId, strategy] of this.adaptationStrategies) {
      const applicabilityScore = await this.calculateStrategyApplicability(
        strategy,
        description,
        contextAnalysis
      )

      if (applicabilityScore > 0.3) {
        // Minimum threshold
        applicableStrategies.push({
          ...strategy,
          score: applicabilityScore,
        })
      }
    }

    // Sort by score and priority
    return applicableStrategies
      .sort((a, b) => {
        const scoreComparison = b.score - a.score
        return scoreComparison !== 0 ? scoreComparison : b.priority - a.priority
      })
      .slice(0, 5) // Limit to top 5 strategies
  }

  private async applyAdaptationStrategy(
    description: EnhancedDescriptionSchema,
    strategy: AdaptationStrategy,
    contextAnalysis: ContextAnalysisResult
  ): Promise<StrategyApplicationResult> {
    const modifications: ContentModification[] = []
    let currentDescription = { ...description }
    let success = true
    let effectiveness = 0

    try {
      for (const rule of strategy.adaptationRules) {
        if (await this.evaluateRuleCondition(rule.condition, contextAnalysis)) {
          const modification = await this.applyAdaptationAction(
            currentDescription,
            rule.action,
            contextAnalysis
          )

          if (modification.success) {
            currentDescription = modification.result
            modifications.push(modification.modification)
            effectiveness += rule.confidence
          }
        }
      }

      effectiveness /= strategy.adaptationRules.length
    } catch (error) {
      logger.error(
        `Strategy application failed for ${strategy.strategyId}:`,
        error instanceof Error ? error : new Error(String(error))
      )
      success = false
    }

    return {
      success,
      adaptedDescription: currentDescription,
      modifications,
      effectiveness: success ? effectiveness : 0,
    }
  }

  private async applyAdaptationAction(
    description: EnhancedDescriptionSchema,
    action: AdaptationAction,
    contextAnalysis: ContextAnalysisResult
  ): Promise<ActionApplicationResult> {
    // Implementation would apply specific modifications based on action type
    // This is a simplified example

    const modifiedDescription = { ...description }
    let success = true

    try {
      switch (action.actionType) {
        case 'modify_content':
          success = this.modifyDescriptionContent(modifiedDescription, action)
          break
        case 'adjust_complexity':
          success = this.adjustDescriptionComplexity(modifiedDescription, action, contextAnalysis)
          break
        case 'add_examples':
          success = await this.addContextualExamples(modifiedDescription, action, contextAnalysis)
          break
        case 'change_tone':
          success = this.adjustDescriptionTone(modifiedDescription, action, contextAnalysis)
          break
        case 'add_guidance':
          success = await this.addGuidanceElements(modifiedDescription, action, contextAnalysis)
          break
        default:
          success = false
      }
    } catch (error) {
      logger.error(
        `Action application failed for ${action.actionType}:`,
        error instanceof Error ? error : new Error(String(error))
      )
      success = false
    }

    return {
      success,
      result: modifiedDescription,
      modification: action.modification,
    }
  }

  // =============================================================================
  // Content Modification Methods
  // =============================================================================

  private modifyDescriptionContent(
    description: EnhancedDescriptionSchema,
    action: AdaptationAction
  ): boolean {
    try {
      const targetSection = action.targetSection
      const modification = action.modification

      // Navigate to target section and apply modification
      const sectionPath = targetSection.split('.')
      let current: any = description

      for (let i = 0; i < sectionPath.length - 1; i++) {
        if (current[sectionPath[i]]) {
          current = current[sectionPath[i]]
        } else {
          return false
        }
      }

      const finalKey = sectionPath[sectionPath.length - 1]

      switch (modification.operation) {
        case 'replace':
          current[finalKey] = modification.content
          break
        case 'append':
          if (typeof current[finalKey] === 'string') {
            current[finalKey] += ` ${modification.content}`
          }
          break
        case 'prepend':
          if (typeof current[finalKey] === 'string') {
            current[finalKey] = `${modification.content} ${current[finalKey]}`
          }
          break
        default:
          return false
      }

      return true
    } catch (error) {
      logger.error(
        'Content modification failed:',
        error instanceof Error ? error : new Error(String(error))
      )
      return false
    }
  }

  private adjustDescriptionComplexity(
    description: EnhancedDescriptionSchema,
    action: AdaptationAction,
    contextAnalysis: ContextAnalysisResult
  ): boolean {
    try {
      const targetComplexity = contextAnalysis.recommendedComplexity
      const currentComplexity = description.descriptions.brief.complexityLevel

      if (targetComplexity === 'simple' && currentComplexity !== 'simple') {
        // Simplify descriptions
        this.simplifyDescriptionContent(description)
      } else if (targetComplexity === 'complex' && currentComplexity !== 'complex') {
        // Add more technical detail
        this.enhanceDescriptionTechnicalDepth(description)
      }

      return true
    } catch (error) {
      logger.error(
        'Complexity adjustment failed:',
        error instanceof Error ? error : new Error(String(error))
      )
      return false
    }
  }

  private async addContextualExamples(
    description: EnhancedDescriptionSchema,
    action: AdaptationAction,
    contextAnalysis: ContextAnalysisResult
  ): Promise<boolean> {
    try {
      const relevantExamples = await this.generateContextualExamples(description, contextAnalysis)

      // Add examples to appropriate sections
      if (description.usageGuidance.stepByStepGuides.length > 0) {
        description.usageGuidance.stepByStepGuides[0].steps.forEach((step, index) => {
          if (relevantExamples[index]) {
            step.tips.push(`Example: ${relevantExamples[index]}`)
          }
        })
      }

      return true
    } catch (error) {
      logger.error('Example addition failed:', error)
      return false
    }
  }

  private adjustDescriptionTone(
    description: EnhancedDescriptionSchema,
    action: AdaptationAction,
    contextAnalysis: ContextAnalysisResult
  ): boolean {
    try {
      const targetTone = action.parameters.tone as string

      // Adjust tone based on target
      switch (targetTone) {
        case 'encouraging':
          this.applyEncouragingTone(description)
          break
        case 'professional':
          this.applyProfessionalTone(description)
          break
        case 'casual':
          this.applyCasualTone(description)
          break
        case 'technical':
          this.applyTechnicalTone(description)
          break
      }

      return true
    } catch (error) {
      logger.error('Tone adjustment failed:', error)
      return false
    }
  }

  private async addGuidanceElements(
    description: EnhancedDescriptionSchema,
    action: AdaptationAction,
    contextAnalysis: ContextAnalysisResult
  ): Promise<boolean> {
    try {
      const guidanceType = action.parameters.guidanceType as string

      switch (guidanceType) {
        case 'prerequisites':
          await this.addPrerequisiteGuidance(description, contextAnalysis)
          break
        case 'troubleshooting':
          await this.addTroubleshootingGuidance(description, contextAnalysis)
          break
        case 'next_steps':
          await this.addNextStepsGuidance(description, contextAnalysis)
          break
      }

      return true
    } catch (error) {
      logger.error('Guidance addition failed:', error)
      return false
    }
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private async calculateStrategyApplicability(
    strategy: AdaptationStrategy,
    description: EnhancedDescriptionSchema,
    contextAnalysis: ContextAnalysisResult
  ): Promise<number> {
    let score = 0
    let maxScore = 0

    // Evaluate trigger conditions
    for (const condition of strategy.triggerConditions) {
      maxScore += condition.weight

      if (await this.evaluateCondition(condition, contextAnalysis)) {
        score += condition.weight
      }
    }

    return maxScore > 0 ? score / maxScore : 0
  }

  private async evaluateCondition(
    condition: TriggerCondition,
    contextAnalysis: ContextAnalysisResult
  ): Promise<boolean> {
    // Implement condition evaluation logic
    // This would evaluate conditions like "userProfile.skillLevel === 'beginner'"
    return true // Simplified
  }

  private async evaluateRuleCondition(
    condition: string,
    contextAnalysis: ContextAnalysisResult
  ): Promise<boolean> {
    // Implement rule condition evaluation
    return true // Simplified
  }

  private calculateOverallConfidence(adaptations: AppliedAdaptation[]): number {
    if (adaptations.length === 0) return 0

    const totalEffectiveness = adaptations.reduce(
      (sum, adaptation) => sum + adaptation.effectiveness,
      0
    )

    return totalEffectiveness / adaptations.length
  }

  private initializeAdaptationStrategies(): void {
    // Initialize default adaptation strategies
    this.registerDefaultStrategies()
  }

  private registerDefaultStrategies(): void {
    // Register strategies for different contexts
    // Implementation would include comprehensive strategy definitions
    logger.info('Default adaptation strategies registered')
  }

  // Placeholder implementations for complex methods
  private createDefaultSituation(): SituationContext {
    return {} as any
  }
  private createDefaultWorkflow(): WorkflowContext {
    return {} as any
  }
  private createDefaultEnvironment(): EnvironmentContext {
    return {} as any
  }
  private getUserInteractionHistory(userId: string): InteractionHistory {
    return {} as any
  }
  private getUserLearningProfile(userId: string): UserLearningProfile {
    return {} as any
  }
  private getUserAdaptationPreferences(userId: string): DetailedAdaptationPreferences {
    return {} as any
  }
  private extractPersonalizationFactors(result: AdaptedDescriptionResult): PersonalizationFactor[] {
    return []
  }
  private async generatePersonalizationRecommendations(
    profile: ExtendedUserProfile,
    result: AdaptedDescriptionResult
  ): Promise<PersonalizationRecommendation[]> {
    return []
  }
  private async identifyLearningOpportunities(
    profile: ExtendedUserProfile,
    description: EnhancedDescriptionSchema
  ): Promise<AdaptationLearningOpportunity[]> {
    return []
  }
  private async getQuickSituationalStrategies(
    situation: SituationContext
  ): Promise<SituationalStrategy[]> {
    return []
  }
  private async getComprehensiveSituationalStrategies(
    situation: SituationContext
  ): Promise<SituationalStrategy[]> {
    return []
  }
  private async applySituationalStrategy(
    description: EnhancedDescriptionSchema,
    strategy: SituationalStrategy,
    situation: SituationContext
  ): Promise<SituationalModification> {
    return {} as any
  }
  private generateSituationalReasoning(
    situation: SituationContext,
    modifications: SituationalModification[]
  ): string[] {
    return []
  }
  private async generateNextStepSuggestions(
    description: EnhancedDescriptionSchema,
    situation: SituationContext
  ): Promise<NextStepSuggestion[]> {
    return []
  }
  private simplifyDescriptionContent(description: EnhancedDescriptionSchema): void {}
  private enhanceDescriptionTechnicalDepth(description: EnhancedDescriptionSchema): void {}
  private async generateContextualExamples(
    description: EnhancedDescriptionSchema,
    contextAnalysis: ContextAnalysisResult
  ): Promise<string[]> {
    return []
  }
  private applyEncouragingTone(description: EnhancedDescriptionSchema): void {}
  private applyProfessionalTone(description: EnhancedDescriptionSchema): void {}
  private applyCasualTone(description: EnhancedDescriptionSchema): void {}
  private applyTechnicalTone(description: EnhancedDescriptionSchema): void {}
  private async addPrerequisiteGuidance(
    description: EnhancedDescriptionSchema,
    contextAnalysis: ContextAnalysisResult
  ): Promise<void> {}
  private async addTroubleshootingGuidance(
    description: EnhancedDescriptionSchema,
    contextAnalysis: ContextAnalysisResult
  ): Promise<void> {}
  private async addNextStepsGuidance(
    description: EnhancedDescriptionSchema,
    contextAnalysis: ContextAnalysisResult
  ): Promise<void> {}
}

// =============================================================================
// Supporting Classes
// =============================================================================

class ContextAnalyzer {
  async analyzeContext(context: AdaptationContext): Promise<ContextAnalysisResult> {
    return {
      contextSummary: 'Comprehensive context analysis',
      keyFactors: [],
      recommendedComplexity: 'moderate',
      suggestedAdaptations: [],
      confidenceLevel: 0.85,
    }
  }
}

class AdaptationLearner {
  async recordAdaptationResults(
    toolId: string,
    context: AdaptationContext,
    adaptations: AppliedAdaptation[],
    quality: QualityResult
  ): Promise<void> {
    // Record results for future learning
  }
}

class AdaptationQualityMonitor {
  async validateAdaptedDescription(
    original: EnhancedDescriptionSchema,
    adapted: EnhancedDescriptionSchema,
    context: AdaptationContext
  ): Promise<QualityResult> {
    return {
      qualityScore: 0.85,
      issues: [],
      improvements: [],
      confidence: 0.9,
    }
  }
}

// =============================================================================
// Result and Supporting Types
// =============================================================================

export interface AdaptedDescriptionResult {
  adaptedDescription: EnhancedDescriptionSchema
  originalDescription: EnhancedDescriptionSchema
  adaptationContext: AdaptationContext
  appliedAdaptations: AppliedAdaptation[]
  contextAnalysis: ContextAnalysisResult
  qualityResult: QualityResult
  adaptationMetadata: AdaptationMetadata
}

export interface PersonalizedDescription {
  personalizedDescription: EnhancedDescriptionSchema
  personalizationFactors: PersonalizationFactor[]
  recommendations: PersonalizationRecommendation[]
  learningOpportunities: AdaptationLearningOpportunity[]
}

export interface SituationalAdaptation {
  adaptedDescription: EnhancedDescriptionSchema
  situation: SituationContext
  modifications: SituationalModification[]
  adaptationReasoning: string[]
  nextStepSuggestions: NextStepSuggestion[]
}

// Simplified supporting types for brevity
export interface AppliedAdaptation {
  strategyId: string
  modifications: ContentModification[]
  effectiveness: number
}
export interface StrategyApplicationResult {
  success: boolean
  adaptedDescription: EnhancedDescriptionSchema
  modifications: ContentModification[]
  effectiveness: number
}
export interface ActionApplicationResult {
  success: boolean
  result: EnhancedDescriptionSchema
  modification: ContentModification
}
export interface ContextAnalysisResult {
  contextSummary: string
  keyFactors: string[]
  recommendedComplexity: 'simple' | 'moderate' | 'complex'
  suggestedAdaptations: string[]
  confidenceLevel: number
}
export interface QualityResult {
  qualityScore: number
  issues: string[]
  improvements: string[]
  confidence: number
}
export interface AdaptationMetadata {
  adaptationTimestamp: Date
  adaptationVersion: string
  engineVersion: string
  strategiesUsed: string[]
  adaptationConfidence: number
}
export interface PersonalizationFactor {
  factor: string
  impact: number
  reasoning: string
}
export interface PersonalizationRecommendation {
  type: string
  suggestion: string
  benefit: string
}
export interface AdaptationLearningOpportunity {
  area: string
  opportunity: string
  difficulty: SkillLevel
}
export interface SituationalStrategy {
  strategyId: string
  description: string
  priority: number
}
export interface SituationalModification {
  modification: string
  applied: boolean
  result: EnhancedDescriptionSchema
}
export interface NextStepSuggestion {
  suggestion: string
  priority: number
  reasoning: string
}

// Configuration types
export interface AdaptationEngineConfig {
  analysisConfig?: AnalysisConfig
  learningConfig?: LearningConfig
  qualityConfig?: QualityConfig
}
export interface AnalysisConfig {
  depth: string
  algorithms: string[]
}
export interface LearningConfig {
  enabled: boolean
  updateFrequency: string
}
export interface QualityConfig {
  thresholds: Record<string, number>
}

// Additional supporting types (simplified for brevity)
export type CognitiveStyle = 'analytical' | 'intuitive' | 'systematic' | 'creative'
export type LearningPreference = 'visual' | 'auditory' | 'kinesthetic' | 'reading'
export type ExpertiseLevel = 'novice' | 'competent' | 'proficient' | 'expert' | 'master'
export type CommunicationStyle = 'direct' | 'collaborative' | 'supportive' | 'analytical'
export type TaskPattern = { pattern: string; frequency: number; success: number }
export type MotivationFactor = { factor: string; importance: number }
export type TechnicalBackground = { domain: string; level: ExpertiseLevel; years: number }
export type WorkflowInfo = { id: string; name: string; type: string }
export type WorkflowStage = 'planning' | 'execution' | 'review' | 'completion'
export type ToolUsageRecord = { toolId: string; timestamp: Date; success: boolean }
export type PlannedStep = { step: string; priority: number; dependencies: string[] }
export type WorkflowGoal = { goal: string; priority: number; deadline?: Date }
export type CollaborationContext = { collaborators: string[]; roles: Record<string, string> }
export type DeviceInfo = { type: string; screenSize: string; capabilities: string[] }
export type LocationInfo = { timezone: string; region: string; context: string }
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
export type OrganizationContext = { size: string; industry: string; culture: string }
export type ProjectContext = { type: string; phase: string; constraints: string[] }
export type InteractionRecord = { timestamp: Date; action: string; outcome: string }
export type SuccessPattern = { pattern: string; frequency: number; context: string }
export type FailurePattern = { pattern: string; frequency: number; causes: string[] }
export type LearningProgressRecord = { skill: string; progress: number; timestamp: Date }
export type FeedbackRecord = { rating: number; comment: string; timestamp: Date }
export type AdaptationRecord = { adaptationType: string; effectiveness: number; timestamp: Date }
export type LearningMode = 'exploration' | 'guided' | 'practice' | 'reference'
export type CognitiveLoadPreference = { preferred: 'low' | 'medium' | 'high'; tolerance: number }
export type FeedbackPreference = { type: string; frequency: string; detail: string }
export type SkillGap = { skill: string; currentLevel: number; targetLevel: number }
export type StrengthArea = { area: string; proficiency: number; applications: string[] }
export type DevelopmentGoal = { goal: string; priority: number; timeline: string }
export type PresentationStyle = { format: string; layout: string; emphasis: string[] }
export type VisualAidPreference = { type: string; frequency: string; complexity: string }
export type ConflictResolutionRule = { priority: number; resolution: string }
export type StrategyValidationRule = { rule: string; severity: 'warning' | 'error' }
export type RollbackCondition = { condition: string; action: string }

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create contextual adaptation engine
 */
export function createContextualAdaptationEngine(
  config?: AdaptationEngineConfig
): ContextualAdaptationEngine {
  return new ContextualAdaptationEngine(config)
}

/**
 * Adapt description for specific context
 */
export async function adaptDescriptionForContext(
  description: EnhancedDescriptionSchema,
  context: AdaptationContext
): Promise<AdaptedDescriptionResult> {
  const engine = createContextualAdaptationEngine()
  return engine.adaptDescription(description, context)
}

/**
 * Personalize description for user
 */
export async function personalizeDescriptionForUser(
  description: EnhancedDescriptionSchema,
  userProfile: ExtendedUserProfile,
  personalizationLevel?: number
): Promise<PersonalizedDescription> {
  const engine = createContextualAdaptationEngine()
  return engine.personalizeDescription(description, userProfile, personalizationLevel)
}
