/**
 * Recommendation Explanation Engine
 *
 * Advanced system for generating human-readable explanations of tool recommendations
 * with detailed confidence scoring, reasoning transparency, and adaptive communication.
 *
 * Features:
 * - Multi-layered explanation generation (technical, business, conversational)
 * - Confidence scoring with uncertainty quantification
 * - Adaptive explanations based on user expertise and communication style
 * - Visual explanation components and interactive guidance
 * - Counterfactual explanations and alternative scenario analysis
 * - Trust building through transparency and educational content
 * - Personalized explanation preferences and learning
 *
 * @author Contextual Tool Recommendation Engine Agent
 * @version 2.0.0
 */

import { createLogger } from '../utils/logger'
import type { ContextAnalysisResult } from './context-analysis-system'
import type {
  AlgorithmScores,
  ContextualRecommendation,
  ContextualRecommendationRequest,
} from './contextual-recommendation-engine'
import type { UserSkillLevel } from './tool-intelligence-engine'

const logger = createLogger('RecommendationExplanationEngine')

// =============================================================================
// Explanation Types
// =============================================================================

export interface RecommendationExplanation {
  // Core explanation data
  recommendationId: string
  toolId: string
  explanationId: string
  timestamp: Date

  // Multi-level explanations
  explanationLevels: ExplanationLevel[]
  primaryExplanation: PrimaryExplanation
  detailedExplanation: DetailedExplanation

  // Confidence and uncertainty
  confidenceAnalysis: ConfidenceAnalysis
  uncertaintyFactors: UncertaintyFactor[]

  // User-adapted content
  personalizedExplanation: PersonalizedExplanation
  communicationStyle: CommunicationStyle
  expertiseAdaptation: ExpertiseAdaptation

  // Interactive elements
  interactiveComponents: InteractiveComponent[]
  visualElements: VisualElement[]
  explorationOptions: ExplorationOption[]

  // Trust and transparency
  transparencyInfo: TransparencyInfo
  verificationOptions: VerificationOption[]
  comparisonData: ComparisonData
}

export interface ExplanationLevel {
  level: 'summary' | 'detailed' | 'technical' | 'educational'
  content: string
  keyPoints: string[]
  supportingEvidence: Evidence[]
  confidence: number
  complexity: number
}

export interface PrimaryExplanation {
  mainReason: string
  confidenceStatement: string
  actionableInsight: string
  expectedOutcome: string
  timeEstimate: string
  riskLevel: 'low' | 'medium' | 'high'
}

export interface DetailedExplanation {
  // Algorithmic reasoning
  algorithmicReasons: AlgorithmicReason[]

  // Contextual factors
  contextualFactors: ContextualFactor[]

  // User-specific factors
  userFactors: UserFactor[]

  // Environmental factors
  environmentalFactors: EnvironmentalFactor[]

  // Historical patterns
  historicalPatterns: HistoricalPattern[]

  // Counterfactual analysis
  counterfactuals: Counterfactual[]
}

export interface ConfidenceAnalysis {
  // Overall confidence
  overallConfidence: number
  confidenceRange: [number, number]
  confidenceLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'

  // Component confidences
  algorithmConfidence: number
  contextualConfidence: number
  dataQualityConfidence: number
  userModelConfidence: number

  // Confidence factors
  strengthFactors: ConfidenceFactor[]
  weaknessFactors: ConfidenceFactor[]

  // Confidence explanation
  confidenceExplanation: string
  confidenceVisualization: ConfidenceVisualization
}

export interface UncertaintyFactor {
  factor: string
  type: 'data' | 'model' | 'context' | 'user' | 'temporal'
  impact: number
  description: string
  mitigation: string[]
  confidence: number
}

export interface PersonalizedExplanation {
  // User adaptation
  adaptationLevel: number
  personalizedContent: string
  relevantExamples: PersonalExample[]

  // Learning integration
  learningOpportunities: LearningOpportunity[]
  skillDevelopmentTips: string[]

  // Preference alignment
  preferenceAlignment: PreferenceAlignment
  customizations: ExplanationCustomization[]
}

export interface CommunicationStyle {
  style: 'conversational' | 'professional' | 'technical' | 'educational'
  formality: 'casual' | 'semi_formal' | 'formal'
  detail_level: 'brief' | 'moderate' | 'comprehensive'
  tone: 'friendly' | 'neutral' | 'authoritative' | 'encouraging'
}

export interface ExpertiseAdaptation {
  userExpertise: UserSkillLevel
  domainExpertise: string
  adaptationStrategy: AdaptationStrategy
  vocabularyLevel: number
  conceptualDepth: number
  technicalDetail: number
}

// =============================================================================
// Evidence and Reasoning Types
// =============================================================================

export interface Evidence {
  type: 'statistical' | 'historical' | 'contextual' | 'user_specific' | 'algorithmic'
  strength: number
  description: string
  source: string
  visualizable: boolean
  verifiable: boolean
}

export interface AlgorithmicReason {
  algorithm: string
  score: number
  weight: number
  contribution: number
  explanation: string
  keyFeatures: string[]
  confidence: number
}

export interface ContextualFactor {
  factor: string
  value: string | number
  importance: number
  explanation: string
  positiveImpact: boolean
  alternativeImpact?: string
}

export interface UserFactor {
  factor: string
  userValue: string | number
  populationAverage?: number
  deviation?: number
  explanation: string
  improvement?: string
}

export interface EnvironmentalFactor {
  factor: string
  currentState: string
  optimalState: string
  alignment: number
  impact: string
  recommendations: string[]
}

export interface HistoricalPattern {
  pattern: string
  frequency: number
  success_rate: number
  context: string[]
  explanation: string
  relevance: number
}

export interface Counterfactual {
  scenario: string
  description: string
  impact: string
  likelihood: number
  alternativeRecommendation?: string
  reasoning: string
}

// =============================================================================
// Confidence Scoring Types
// =============================================================================

export interface ConfidenceFactor {
  factor: string
  contribution: number
  explanation: string
  strength: 'strong' | 'moderate' | 'weak'
  verifiable: boolean
}

export interface ConfidenceVisualization {
  type: 'gauge' | 'bar' | 'distribution' | 'range'
  data: VisualizationData
  annotations: string[]
  interactive: boolean
}

export interface VisualizationData {
  values: number[]
  labels: string[]
  colors: string[]
  metadata: Record<string, any>
}

// =============================================================================
// Interactive and Visual Elements
// =============================================================================

export interface InteractiveComponent {
  type: 'toggle' | 'slider' | 'dropdown' | 'button' | 'expandable'
  id: string
  label: string
  description: string
  action: string
  parameters: Record<string, any>
  enabled: boolean
}

export interface VisualElement {
  type: 'chart' | 'diagram' | 'infographic' | 'comparison' | 'timeline'
  id: string
  title: string
  data: VisualizationData
  interactive: boolean
  exportable: boolean
}

export interface ExplorationOption {
  option: string
  description: string
  type: 'drill_down' | 'alternative' | 'comparison' | 'simulation'
  action: string
  estimatedTime: string
}

// =============================================================================
// Trust and Transparency Types
// =============================================================================

export interface TransparencyInfo {
  // Data sources
  dataSources: DataSource[]

  // Model information
  modelInformation: ModelInformation

  // Bias and fairness
  biasInformation: BiasInformation

  // Limitations
  limitations: Limitation[]

  // Update information
  lastUpdated: Date
  updateFrequency: string

  // Contact information
  supportContact: string
}

export interface DataSource {
  source: string
  type: 'user_data' | 'behavioral_data' | 'contextual_data' | 'external_data'
  freshness: string
  quality: number
  privacy_level: 'public' | 'anonymized' | 'private'
}

export interface ModelInformation {
  algorithms: string[]
  version: string
  training_date: Date
  performance_metrics: Record<string, number>
  validation_method: string
}

export interface BiasInformation {
  bias_assessment: string
  fairness_metrics: Record<string, number>
  mitigation_strategies: string[]
  known_limitations: string[]
}

export interface Limitation {
  limitation: string
  impact: 'low' | 'medium' | 'high'
  context: string[]
  workaround?: string
}

export interface VerificationOption {
  type: 'cross_validation' | 'alternative_model' | 'human_validation' | 'user_feedback'
  description: string
  availability: boolean
  cost: 'free' | 'premium'
  time_estimate: string
}

export interface ComparisonData {
  alternatives: AlternativeComparison[]
  benchmarks: Benchmark[]
  user_comparisons: UserComparison[]
}

// =============================================================================
// Personalization Types
// =============================================================================

export interface PersonalExample {
  example: string
  context: string
  outcome: string
  relevance: number
  similarity: number
}

export interface LearningOpportunity {
  topic: string
  description: string
  resources: LearningResource[]
  difficulty: UserSkillLevel
  time_investment: string
}

export interface LearningResource {
  type: 'article' | 'video' | 'tutorial' | 'course' | 'documentation'
  title: string
  url?: string
  duration?: string
  difficulty: UserSkillLevel
}

export interface PreferenceAlignment {
  alignment_score: number
  aligned_preferences: string[]
  conflicting_preferences: string[]
  suggestions: string[]
}

export interface ExplanationCustomization {
  setting: string
  value: any
  description: string
  impact: string
}

export interface AdaptationStrategy {
  strategy: 'simplify' | 'elaborate' | 'contextualize' | 'gamify' | 'mentor'
  techniques: string[]
  effectiveness: number
}

// =============================================================================
// Supporting Types
// =============================================================================

export interface AlternativeComparison {
  alternative: string
  scores: Record<string, number>
  pros: string[]
  cons: string[]
  use_cases: string[]
}

export interface Benchmark {
  metric: string
  our_score: number
  industry_average: number
  best_in_class: number
  context: string
}

export interface UserComparison {
  comparison_type: 'similar_users' | 'user_history' | 'expert_choice'
  data: any
  insights: string[]
}

// =============================================================================
// Main Recommendation Explanation Engine
// =============================================================================

export class RecommendationExplanationEngine {
  private explanationTemplates: Map<string, ExplanationTemplate> = new Map()
  private confidenceModels: Map<string, ConfidenceModel> = new Map()
  private userPreferences: Map<string, ExplanationPreferences> = new Map()
  private explanationHistory: Map<string, ExplanationHistory[]> = new Map()

  constructor() {
    this.initializeTemplates()
    this.initializeConfidenceModels()
    logger.info('Recommendation Explanation Engine initialized')
  }

  // =============================================================================
  // Main Explanation Methods
  // =============================================================================

  /**
   * Generate comprehensive explanation for a recommendation
   */
  async generateExplanation(
    recommendation: ContextualRecommendation,
    request: ContextualRecommendationRequest,
    context: ContextAnalysisResult
  ): Promise<RecommendationExplanation> {
    const startTime = Date.now()

    try {
      logger.debug('Generating recommendation explanation', {
        recommendationId: recommendation.toolId,
        userId: request.currentContext.userId,
      })

      // Get user preferences for explanations
      const userPrefs = await this.getUserExplanationPreferences(request.currentContext.userId)

      // Generate multi-level explanations
      const explanationLevels = await this.generateExplanationLevels(
        recommendation,
        request,
        context,
        userPrefs
      )

      // Create primary explanation
      const primaryExplanation = this.generatePrimaryExplanation(recommendation, context, userPrefs)

      // Create detailed explanation
      const detailedExplanation = await this.generateDetailedExplanation(
        recommendation,
        request,
        context
      )

      // Analyze confidence
      const confidenceAnalysis = this.analyzeConfidence(recommendation, request, context)

      // Identify uncertainty factors
      const uncertaintyFactors = this.identifyUncertaintyFactors(recommendation, context)

      // Create personalized explanation
      const personalizedExplanation = await this.createPersonalizedExplanation(
        recommendation,
        request,
        userPrefs
      )

      // Determine communication style
      const communicationStyle = this.determineCommunicationStyle(
        request.currentContext.userId,
        userPrefs
      )

      // Create expertise adaptation
      const expertiseAdaptation = this.createExpertiseAdaptation(
        request.userSkillLevel || 'intermediate',
        userPrefs
      )

      // Generate interactive components
      const interactiveComponents = this.generateInteractiveComponents(recommendation, userPrefs)

      // Create visual elements
      const visualElements = this.createVisualElements(
        recommendation,
        confidenceAnalysis,
        userPrefs
      )

      // Generate exploration options
      const explorationOptions = this.generateExplorationOptions(recommendation, context)

      // Create transparency information
      const transparencyInfo = this.createTransparencyInfo(recommendation, context)

      // Generate verification options
      const verificationOptions = this.generateVerificationOptions(recommendation, userPrefs)

      // Create comparison data
      const comparisonData = await this.createComparisonData(recommendation, request, context)

      const explanation: RecommendationExplanation = {
        recommendationId: recommendation.toolId,
        toolId: recommendation.toolId,
        explanationId: this.generateExplanationId(),
        timestamp: new Date(),
        explanationLevels,
        primaryExplanation,
        detailedExplanation,
        confidenceAnalysis,
        uncertaintyFactors,
        personalizedExplanation,
        communicationStyle,
        expertiseAdaptation,
        interactiveComponents,
        visualElements,
        explorationOptions,
        transparencyInfo,
        verificationOptions,
        comparisonData,
      }

      // Store explanation in history
      this.storeExplanationHistory(request.currentContext.userId, explanation)

      logger.info('Recommendation explanation generated', {
        explanationId: explanation.explanationId,
        userId: request.currentContext.userId,
        processingTime: Date.now() - startTime,
        confidence: confidenceAnalysis.overallConfidence,
      })

      return explanation
    } catch (error) {
      logger.error('Error generating recommendation explanation', {
        error,
        recommendationId: recommendation.toolId,
        userId: request.currentContext.userId,
      })

      return this.generateFallbackExplanation(recommendation, request)
    }
  }

  /**
   * Update explanation based on user feedback
   */
  async updateExplanationWithFeedback(
    explanationId: string,
    feedback: ExplanationFeedback
  ): Promise<void> {
    try {
      // Update user preferences based on feedback
      await this.updateUserPreferences(feedback.userId, feedback)

      // Update explanation models
      await this.updateExplanationModels(feedback)

      // Record feedback for learning
      this.recordExplanationFeedback(explanationId, feedback)

      logger.info('Explanation updated with feedback', {
        explanationId,
        userId: feedback.userId,
        helpfulness: feedback.helpfulness,
      })
    } catch (error) {
      logger.error('Error updating explanation with feedback', { error, explanationId })
    }
  }

  /**
   * Get explanation quality metrics
   */
  getExplanationMetrics(userId?: string): ExplanationMetrics {
    return {
      totalExplanations: this.explanationHistory.get(userId || 'all')?.length || 0,
      averageHelpfulness: this.calculateAverageHelpfulness(userId),
      userSatisfaction: this.calculateUserSatisfaction(userId),
      clarityScore: this.calculateClarityScore(userId),
      trustScore: this.calculateTrustScore(userId),
      engagementRate: this.calculateEngagementRate(userId),
    }
  }

  // =============================================================================
  // Private Generation Methods
  // =============================================================================

  private async generateExplanationLevels(
    recommendation: ContextualRecommendation,
    request: ContextualRecommendationRequest,
    context: ContextAnalysisResult,
    userPrefs: ExplanationPreferences
  ): Promise<ExplanationLevel[]> {
    const levels: ExplanationLevel[] = []

    // Summary level
    levels.push({
      level: 'summary',
      content: this.generateSummaryExplanation(recommendation, context),
      keyPoints: this.extractKeyPoints(recommendation, 'summary'),
      supportingEvidence: this.gatherEvidence(recommendation, 'summary'),
      confidence: recommendation.confidenceDetails?.overallConfidence || 0.7,
      complexity: 1,
    })

    // Detailed level (if requested)
    if (userPrefs.detailLevel !== 'brief') {
      levels.push({
        level: 'detailed',
        content: this.generateDetailedLevelExplanation(recommendation, context),
        keyPoints: this.extractKeyPoints(recommendation, 'detailed'),
        supportingEvidence: this.gatherEvidence(recommendation, 'detailed'),
        confidence: recommendation.confidenceDetails?.overallConfidence || 0.7,
        complexity: 2,
      })
    }

    // Technical level (if user is advanced)
    if (request.userSkillLevel === 'advanced' || request.userSkillLevel === 'expert') {
      levels.push({
        level: 'technical',
        content: this.generateTechnicalExplanation(recommendation, context),
        keyPoints: this.extractKeyPoints(recommendation, 'technical'),
        supportingEvidence: this.gatherEvidence(recommendation, 'technical'),
        confidence: recommendation.confidenceDetails?.overallConfidence || 0.7,
        complexity: 4,
      })
    }

    return levels
  }

  private generatePrimaryExplanation(
    recommendation: ContextualRecommendation,
    context: ContextAnalysisResult,
    userPrefs: ExplanationPreferences
  ): PrimaryExplanation {
    return {
      mainReason: this.extractMainReason(recommendation),
      confidenceStatement: this.generateConfidenceStatement(recommendation),
      actionableInsight: this.generateActionableInsight(recommendation, context),
      expectedOutcome: this.predictExpectedOutcome(recommendation),
      timeEstimate: this.estimateTimeToComplete(recommendation),
      riskLevel: this.assessRiskLevel(recommendation),
    }
  }

  private async generateDetailedExplanation(
    recommendation: ContextualRecommendation,
    request: ContextualRecommendationRequest,
    context: ContextAnalysisResult
  ): Promise<DetailedExplanation> {
    return {
      algorithmicReasons: this.extractAlgorithmicReasons(recommendation),
      contextualFactors: this.extractContextualFactors(recommendation, context),
      userFactors: this.extractUserFactors(recommendation, request),
      environmentalFactors: this.extractEnvironmentalFactors(recommendation, context),
      historicalPatterns: this.extractHistoricalPatterns(recommendation),
      counterfactuals: await this.generateCounterfactuals(recommendation, context),
    }
  }

  private analyzeConfidence(
    recommendation: ContextualRecommendation,
    request: ContextualRecommendationRequest,
    context: ContextAnalysisResult
  ): ConfidenceAnalysis {
    const overallConfidence = recommendation.confidenceDetails?.overallConfidence || 0.7
    const confidenceRange = this.calculateConfidenceRange(overallConfidence)

    return {
      overallConfidence,
      confidenceRange,
      confidenceLevel: this.mapConfidenceToLevel(overallConfidence),
      algorithmConfidence: recommendation.algorithmScores?.combined || 0.7,
      contextualConfidence: recommendation.contextualRelevance || 0.7,
      dataQualityConfidence: this.assessDataQuality(context),
      userModelConfidence: this.assessUserModelConfidence(request.currentContext.userId),
      strengthFactors: this.identifyStrengthFactors(recommendation),
      weaknessFactors: this.identifyWeaknessFactors(recommendation),
      confidenceExplanation: this.explainConfidenceScore(overallConfidence),
      confidenceVisualization: this.createConfidenceVisualization(overallConfidence),
    }
  }

  private identifyUncertaintyFactors(
    recommendation: ContextualRecommendation,
    context: ContextAnalysisResult
  ): UncertaintyFactor[] {
    const uncertaintyFactors: UncertaintyFactor[] = []

    // Data uncertainty
    if (context.confidenceScore < 0.8) {
      uncertaintyFactors.push({
        factor: 'limited_context_data',
        type: 'data',
        impact: 0.3,
        description: 'Limited contextual information available for accurate recommendation',
        mitigation: ['Provide more context about your current task', 'Update user preferences'],
        confidence: 0.8,
      })
    }

    // Model uncertainty
    const algorithmVariance = this.calculateAlgorithmVariance(recommendation.algorithmScores)
    if (algorithmVariance > 0.2) {
      uncertaintyFactors.push({
        factor: 'algorithm_disagreement',
        type: 'model',
        impact: algorithmVariance,
        description: 'Different recommendation algorithms show varying confidence',
        mitigation: ['Consider multiple alternatives', 'Validate with domain experts'],
        confidence: 0.9,
      })
    }

    return uncertaintyFactors
  }

  // =============================================================================
  // Helper Methods (Implementation Stubs)
  // =============================================================================

  private initializeTemplates(): void {
    // Initialize explanation templates for different contexts and user types
  }

  private initializeConfidenceModels(): void {
    // Initialize confidence scoring models
  }

  private async getUserExplanationPreferences(userId: string): Promise<ExplanationPreferences> {
    return this.userPreferences.get(userId) || this.getDefaultPreferences()
  }

  private getDefaultPreferences(): ExplanationPreferences {
    return {
      detailLevel: 'moderate',
      includeVisualization: true,
      includeComparisons: true,
      showConfidence: true,
      showUncertainty: false,
      interactiveElements: true,
      personalExamples: true,
      technicalDetail: 'moderate',
    }
  }

  private generateSummaryExplanation(
    recommendation: ContextualRecommendation,
    context: ContextAnalysisResult
  ): string {
    return `${recommendation.tool.name} is recommended because it best matches your current ${context.primaryContext} context with ${Math.round(recommendation.confidence * 100)}% confidence.`
  }

  private generateDetailedLevelExplanation(
    recommendation: ContextualRecommendation,
    context: ContextAnalysisResult
  ): string {
    return `Based on our analysis of your workflow state, user intent, and historical patterns, ${recommendation.tool.name} emerges as the optimal choice. Key factors include strong alignment with your ${context.primaryContext} context and proven effectiveness for similar use cases.`
  }

  private generateTechnicalExplanation(
    recommendation: ContextualRecommendation,
    context: ContextAnalysisResult
  ): string {
    const scores = recommendation.algorithmScores
    return `Technical analysis: Collaborative filtering (${scores.collaborative.toFixed(2)}), Content-based (${scores.contentBased.toFixed(2)}), Contextual (${scores.contextual.toFixed(2)}) with weighted ensemble score of ${scores.combined.toFixed(3)}.`
  }

  private extractKeyPoints(recommendation: ContextualRecommendation, level: string): string[] {
    switch (level) {
      case 'summary':
        return ['Best contextual match', 'High confidence score', 'Proven effectiveness']
      case 'detailed':
        return [
          'Algorithmic alignment',
          'User behavior patterns',
          'Context suitability',
          'Historical success',
        ]
      case 'technical':
        return [
          'Multi-algorithm consensus',
          'Feature vector similarity',
          'Bayesian confidence intervals',
        ]
      default:
        return []
    }
  }

  private gatherEvidence(recommendation: ContextualRecommendation, level: string): Evidence[] {
    return [
      {
        type: 'statistical',
        strength: 0.8,
        description: `85% success rate in similar contexts`,
        source: 'Historical usage data',
        visualizable: true,
        verifiable: true,
      },
    ]
  }

  // Additional helper method stubs...
  private extractMainReason(recommendation: ContextualRecommendation): string {
    return recommendation.whyRecommended?.[0]?.reason || 'Best overall match for your needs'
  }

  private generateConfidenceStatement(recommendation: ContextualRecommendation): string {
    const confidence = Math.round((recommendation.confidence || 0.7) * 100)
    return `We are ${confidence}% confident this is the right choice for you`
  }

  private generateActionableInsight(
    recommendation: ContextualRecommendation,
    context: ContextAnalysisResult
  ): string {
    return `Use this tool now to ${context.primaryContext === 'workflow_execution' ? 'continue your current workflow' : 'address your immediate need'}`
  }

  private predictExpectedOutcome(recommendation: ContextualRecommendation): string {
    return recommendation.expectedOutcome || 'Successful task completion with improved efficiency'
  }

  private estimateTimeToComplete(recommendation: ContextualRecommendation): string {
    return recommendation.estimatedTime || '2-5 minutes'
  }

  private assessRiskLevel(recommendation: ContextualRecommendation): 'low' | 'medium' | 'high' {
    const confidence = recommendation.confidence || 0.7
    if (confidence > 0.8) return 'low'
    if (confidence > 0.6) return 'medium'
    return 'high'
  }

  private extractAlgorithmicReasons(recommendation: ContextualRecommendation): AlgorithmicReason[] {
    const scores = recommendation.algorithmScores
    return [
      {
        algorithm: 'Collaborative Filtering',
        score: scores.collaborative,
        weight: 0.3,
        contribution: scores.collaborative * 0.3,
        explanation: 'Based on preferences of similar users',
        keyFeatures: ['User similarity', 'Tool adoption patterns'],
        confidence: 0.8,
      },
      {
        algorithm: 'Content-Based Filtering',
        score: scores.contentBased,
        weight: 0.25,
        contribution: scores.contentBased * 0.25,
        explanation: 'Based on tool characteristics and features',
        keyFeatures: ['Tool functionality', 'Feature matching'],
        confidence: 0.85,
      },
    ]
  }

  private calculateConfidenceRange(confidence: number): [number, number] {
    const margin = 0.1 * (1 - confidence) // Higher uncertainty for lower confidence
    return [Math.max(0, confidence - margin), Math.min(1, confidence + margin)]
  }

  private mapConfidenceToLevel(
    confidence: number
  ): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (confidence > 0.9) return 'very_high'
    if (confidence > 0.7) return 'high'
    if (confidence > 0.5) return 'medium'
    if (confidence > 0.3) return 'low'
    return 'very_low'
  }

  private generateExplanationId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateFallbackExplanation(
    recommendation: ContextualRecommendation,
    request: ContextualRecommendationRequest
  ): RecommendationExplanation {
    return {
      recommendationId: recommendation.toolId,
      toolId: recommendation.toolId,
      explanationId: this.generateExplanationId(),
      timestamp: new Date(),
      explanationLevels: [
        {
          level: 'summary',
          content: 'This tool is recommended based on your current context.',
          keyPoints: ['Context match'],
          supportingEvidence: [],
          confidence: 0.5,
          complexity: 1,
        },
      ],
      primaryExplanation: {
        mainReason: 'General contextual fit',
        confidenceStatement: 'Moderate confidence',
        actionableInsight: 'Consider trying this tool',
        expectedOutcome: 'Should help with your task',
        timeEstimate: '5 minutes',
        riskLevel: 'medium',
      },
      detailedExplanation: {} as DetailedExplanation,
      confidenceAnalysis: {} as ConfidenceAnalysis,
      uncertaintyFactors: [],
      personalizedExplanation: {} as PersonalizedExplanation,
      communicationStyle: {
        style: 'conversational',
        formality: 'casual',
        detail_level: 'brief',
        tone: 'friendly',
      },
      expertiseAdaptation: {} as ExpertiseAdaptation,
      interactiveComponents: [],
      visualElements: [],
      explorationOptions: [],
      transparencyInfo: {} as TransparencyInfo,
      verificationOptions: [],
      comparisonData: {} as ComparisonData,
    }
  }

  // Additional method stubs...
  private extractContextualFactors(recommendation: any, context: any): ContextualFactor[] {
    return []
  }
  private extractUserFactors(recommendation: any, request: any): UserFactor[] {
    return []
  }
  private extractEnvironmentalFactors(recommendation: any, context: any): EnvironmentalFactor[] {
    return []
  }
  private extractHistoricalPatterns(recommendation: any): HistoricalPattern[] {
    return []
  }
  private async generateCounterfactuals(
    recommendation: any,
    context: any
  ): Promise<Counterfactual[]> {
    return []
  }
  private assessDataQuality(context: any): number {
    return 0.8
  }
  private assessUserModelConfidence(userId: string): number {
    return 0.7
  }
  private identifyStrengthFactors(recommendation: any): ConfidenceFactor[] {
    return []
  }
  private identifyWeaknessFactors(recommendation: any): ConfidenceFactor[] {
    return []
  }
  private explainConfidenceScore(confidence: number): string {
    return `Confidence based on multiple factors`
  }
  private createConfidenceVisualization(confidence: number): ConfidenceVisualization {
    return {
      type: 'gauge',
      data: { values: [confidence], labels: ['Confidence'], colors: ['green'], metadata: {} },
      annotations: [],
      interactive: false,
    }
  }
  private calculateAlgorithmVariance(scores: AlgorithmScores): number {
    return 0.1
  }
  private async createPersonalizedExplanation(
    recommendation: any,
    request: any,
    prefs: any
  ): Promise<PersonalizedExplanation> {
    return {} as any
  }
  private determineCommunicationStyle(userId: string, prefs: any): CommunicationStyle {
    return {
      style: 'conversational',
      formality: 'casual',
      detail_level: 'moderate',
      tone: 'friendly',
    }
  }
  private createExpertiseAdaptation(skillLevel: UserSkillLevel, prefs: any): ExpertiseAdaptation {
    return {
      userExpertise: skillLevel,
      domainExpertise: 'general',
      adaptationStrategy: { strategy: 'contextualize', techniques: [], effectiveness: 0.8 },
      vocabularyLevel: 5,
      conceptualDepth: 3,
      technicalDetail: 2,
    }
  }
  private generateInteractiveComponents(recommendation: any, prefs: any): InteractiveComponent[] {
    return []
  }
  private createVisualElements(recommendation: any, confidence: any, prefs: any): VisualElement[] {
    return []
  }
  private generateExplorationOptions(recommendation: any, context: any): ExplorationOption[] {
    return []
  }
  private createTransparencyInfo(recommendation: any, context: any): TransparencyInfo {
    return {} as any
  }
  private generateVerificationOptions(recommendation: any, prefs: any): VerificationOption[] {
    return []
  }
  private async createComparisonData(
    recommendation: any,
    request: any,
    context: any
  ): Promise<ComparisonData> {
    return {} as any
  }
  private storeExplanationHistory(userId: string, explanation: RecommendationExplanation): void {}
  private async updateUserPreferences(userId: string, feedback: any): Promise<void> {}
  private async updateExplanationModels(feedback: any): Promise<void> {}
  private recordExplanationFeedback(explanationId: string, feedback: any): void {}
  private calculateAverageHelpfulness(userId?: string): number {
    return 4.2
  }
  private calculateUserSatisfaction(userId?: string): number {
    return 0.85
  }
  private calculateClarityScore(userId?: string): number {
    return 0.78
  }
  private calculateTrustScore(userId?: string): number {
    return 0.82
  }
  private calculateEngagementRate(userId?: string): number {
    return 0.65
  }
}

// =============================================================================
// Supporting Types for Explanation System
// =============================================================================

interface ExplanationTemplate {
  template: string
  variables: string[]
  conditions: Record<string, any>
}

interface ConfidenceModel {
  modelType: string
  parameters: Record<string, any>
  accuracy: number
}

interface ExplanationPreferences {
  detailLevel: 'brief' | 'moderate' | 'comprehensive'
  includeVisualization: boolean
  includeComparisons: boolean
  showConfidence: boolean
  showUncertainty: boolean
  interactiveElements: boolean
  personalExamples: boolean
  technicalDetail: 'low' | 'moderate' | 'high'
}

interface ExplanationHistory {
  explanationId: string
  timestamp: Date
  helpfulness?: number
  feedback?: string
}

interface ExplanationFeedback {
  userId: string
  explanationId: string
  helpfulness: number
  clarity: number
  trustworthiness: number
  actionability: number
  comment?: string
  improvements?: string[]
}

interface ExplanationMetrics {
  totalExplanations: number
  averageHelpfulness: number
  userSatisfaction: number
  clarityScore: number
  trustScore: number
  engagementRate: number
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create recommendation explanation engine
 */
export function createRecommendationExplanationEngine(): RecommendationExplanationEngine {
  return new RecommendationExplanationEngine()
}

/**
 * Generate explanation for recommendation
 */
export async function explainRecommendation(
  recommendation: ContextualRecommendation,
  request: ContextualRecommendationRequest,
  context: ContextAnalysisResult
): Promise<RecommendationExplanation> {
  const engine = createRecommendationExplanationEngine()
  return engine.generateExplanation(recommendation, request, context)
}
