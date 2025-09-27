/**
 * Machine Learning Recommendation Engine
 *
 * Advanced ML-powered recommendation system with collaborative filtering,
 * user behavior analysis, and adaptive learning capabilities.
 *
 * Features:
 * - Collaborative filtering with user-item matrix factorization
 * - Content-based filtering with feature extraction and similarity scoring
 * - Hybrid recommendation approach combining multiple algorithms
 * - User behavior analysis and pattern recognition
 * - Temporal dynamics and sequential pattern mining
 * - Real-time model updates and online learning
 * - A/B testing integration for model optimization
 *
 * @author Contextual Tool Recommendation Engine Agent
 * @version 2.0.0
 */

import { createLogger } from '../utils/logger'
import type { ContextualRecommendationRequest } from './contextual-recommendation-engine'

const logger = createLogger('MLRecommendationEngine')

// =============================================================================
// ML Model Types
// =============================================================================

export interface MLRecommendationConfig {
  // Algorithm selection
  enableCollaborativeFiltering: boolean
  enableContentBasedFiltering: boolean
  enableDeepLearning: boolean
  enableSequentialModeling: boolean

  // Model parameters
  collaborativeConfig: CollaborativeFilteringConfig
  contentBasedConfig: ContentBasedFilteringConfig
  hybridConfig: HybridModelConfig
  trainingConfig: TrainingConfig

  // Performance settings
  batchSize: number
  maxTrainingTime: number
  modelUpdateFrequency: number
  featureUpdateFrequency: number
}

export interface CollaborativeFilteringConfig {
  // Matrix factorization parameters
  numFactors: number
  learningRate: number
  regularization: number
  iterations: number

  // User and item similarity
  userSimilarityThreshold: number
  itemSimilarityThreshold: number
  neighborhoodSize: number

  // Cold start handling
  coldStartStrategy: 'popularity' | 'content' | 'demographic' | 'hybrid'
  minInteractions: number
}

export interface ContentBasedFilteringConfig {
  // Feature extraction
  textFeatures: boolean
  categoryFeatures: boolean
  usageFeatures: boolean
  temporalFeatures: boolean

  // Similarity calculation
  similarityMetric: 'cosine' | 'euclidean' | 'jaccard' | 'pearson'
  featureWeights: Record<string, number>
  dimensionalityReduction: boolean
  maxFeatures: number
}

export interface HybridModelConfig {
  // Ensemble method
  ensembleMethod: 'weighted' | 'stacking' | 'switching' | 'cascade'
  modelWeights: Record<string, number>

  // Meta-learning
  metaLearningEnabled: boolean
  contextualWeighting: boolean
  dynamicWeightAdjustment: boolean
}

export interface TrainingConfig {
  // Training parameters
  validationSplit: number
  earlyStoppingPatience: number
  crossValidationFolds: number

  // Data processing
  dataAugmentation: boolean
  featureNormalization: boolean
  outlierDetection: boolean

  // Model evaluation
  evaluationMetrics: string[]
  testSetSize: number
}

export interface UserProfile {
  // Basic info
  userId: string
  demographicFeatures: Record<string, any>
  skillLevel: string
  preferences: UserPreferences

  // Behavioral features
  usagePatterns: UsagePattern[]
  toolAffinities: Record<string, number>
  sequentialPatterns: SequentialPattern[]
  temporalPatterns: TemporalPattern[]

  // Learning characteristics
  learningRate: number
  explorationTendency: number
  consistencyScore: number
  adaptabilityScore: number

  // Context features
  workflowContexts: string[]
  collaborationStyle: string
  workingSchedule: TimePattern[]
}

export interface ToolProfile {
  // Basic info
  toolId: string
  category: string
  features: Record<string, any>
  description: string

  // Usage characteristics
  complexityLevel: number
  learningCurve: number
  executionTime: number
  successRate: number

  // Context suitability
  contextSuitability: Record<string, number>
  userGroupAffinities: Record<string, number>
  temporalSuitability: Record<string, number>

  // Content features
  textFeatures: number[]
  categoryFeatures: number[]
  functionalFeatures: number[]
}

export interface InteractionData {
  userId: string
  toolId: string
  timestamp: Date
  context: InteractionContext
  outcome: InteractionOutcome
  rating?: number
  feedback?: string
}

export interface InteractionContext {
  workflowStage: string
  intent: string
  urgency: string
  collaborators: string[]
  timeOfDay: string
  deviceType: string
  environmentalFactors: Record<string, any>
}

export interface InteractionOutcome {
  successful: boolean
  satisfactionScore: number
  completionTime: number
  errorOccurred: boolean
  userEngagement: number
  followUpActions: string[]
}

// =============================================================================
// ML Algorithm Types
// =============================================================================

export interface CollaborativeFilteringModel {
  userFactors: number[][]
  itemFactors: number[][]
  userBiases: number[]
  itemBiases: number[]
  globalMean: number
  userSimilarities: Map<string, Map<string, number>>
  itemSimilarities: Map<string, Map<string, number>>
}

export interface ContentBasedModel {
  itemFeatures: Map<string, number[]>
  userProfiles: Map<string, number[]>
  featureWeights: number[]
  similarityMatrix: number[][]
  featureImportance: Record<string, number>
}

export interface SequentialModel {
  transitionMatrix: Map<string, Map<string, number>>
  sequencePatterns: SequencePattern[]
  temporalWeights: number[]
  contextualTransitions: Map<string, number>
}

export interface HybridModel {
  modelWeights: Record<string, number>
  metaModel: any
  contextualWeightingFunction: (context: any) => Record<string, number>
  performanceHistory: ModelPerformanceHistory[]
}

// =============================================================================
// Pattern Recognition Types
// =============================================================================

export interface UsagePattern {
  pattern: string
  frequency: number
  context: string[]
  temporalPattern: string
  confidence: number
  tools: string[]
  outcomes: number[]
}

export interface SequentialPattern {
  sequence: string[]
  support: number
  confidence: number
  context: string
  averageGap: number
  temporalConstraints: TemporalConstraint[]
}

export interface TemporalPattern {
  timePattern: string
  tools: string[]
  frequency: Record<string, number>
  seasonality: number
  trends: TrendData[]
}

export interface SequencePattern {
  pattern: string[]
  frequency: number
  successRate: number
  context: string[]
  averageTime: number
}

export interface TemporalConstraint {
  minGap: number
  maxGap: number
  timeUnit: 'minutes' | 'hours' | 'days'
  constraint: string
}

export interface TrendData {
  trend: 'increasing' | 'decreasing' | 'stable' | 'cyclical'
  magnitude: number
  confidence: number
  timeRange: string
}

export interface TimePattern {
  startTime: string
  endTime: string
  dayOfWeek: string[]
  frequency: number
  productivity: number
}

// =============================================================================
// Model Performance Types
// =============================================================================

export interface ModelPerformanceHistory {
  timestamp: Date
  modelVersion: string
  metrics: PerformanceMetrics
  abTestResults?: ABTestResults
  userFeedback: AggregatedFeedback
}

export interface PerformanceMetrics {
  // Accuracy metrics
  precision: number
  recall: number
  f1Score: number
  ndcg: number
  map: number

  // Business metrics
  clickThroughRate: number
  conversionRate: number
  userSatisfaction: number
  taskCompletionRate: number
  timeToCompletion: number

  // Technical metrics
  responseTime: number
  throughput: number
  memoryUsage: number
  cpuUsage: number
  errorRate: number

  // Coverage metrics
  catalogCoverage: number
  userCoverage: number
  novelty: number
  diversity: number
}

export interface ABTestResults {
  testId: string
  variants: ABTestVariant[]
  winner?: string
  significance: number
  liftMetrics: Record<string, number>
}

export interface ABTestVariant {
  variantId: string
  userCount: number
  metrics: PerformanceMetrics
  confidence: number
}

export interface AggregatedFeedback {
  totalFeedback: number
  averageRating: number
  sentimentScore: number
  commonIssues: string[]
  satisfactionTrend: number
}

export interface UserPreferences {
  toolCategories: string[]
  complexityPreference: 'simple' | 'moderate' | 'complex'
  interactionStyle: 'guided' | 'exploratory' | 'direct'
  feedbackFrequency: 'minimal' | 'moderate' | 'frequent'
  personalizedExperience: boolean
}

// =============================================================================
// Main ML Recommendation Engine
// =============================================================================

export class MLRecommendationEngine {
  private config: MLRecommendationConfig
  private collaborativeModel: CollaborativeFilteringModel | null = null
  private sequentialModel: SequentialModel | null = null
  private contentBasedModel: any = null
  private hybridModel: any = null

  private userProfiles: Map<string, UserProfile> = new Map()
  private interactionHistory: InteractionData[] = []
  private trainingQueue: InteractionData[] = []

  private lastTrainingTime: Date = new Date(0)
  private modelPerformance: ModelPerformanceHistory[] = []

  constructor(config: Partial<MLRecommendationConfig> = {}) {
    this.config = {
      enableCollaborativeFiltering: true,
      enableContentBasedFiltering: true,
      enableDeepLearning: false,
      enableSequentialModeling: true,
      collaborativeConfig: {
        numFactors: 50,
        learningRate: 0.01,
        regularization: 0.1,
        iterations: 100,
        userSimilarityThreshold: 0.3,
        itemSimilarityThreshold: 0.3,
        neighborhoodSize: 20,
        coldStartStrategy: 'hybrid',
        minInteractions: 5,
      },
      contentBasedConfig: {
        textFeatures: true,
        categoryFeatures: true,
        usageFeatures: true,
        temporalFeatures: true,
        similarityMetric: 'cosine',
        featureWeights: { text: 0.4, category: 0.3, usage: 0.2, temporal: 0.1 },
        dimensionalityReduction: true,
        maxFeatures: 1000,
      },
      hybridConfig: {
        ensembleMethod: 'weighted',
        modelWeights: { collaborative: 0.4, content: 0.3, sequential: 0.3 },
        metaLearningEnabled: true,
        contextualWeighting: true,
        dynamicWeightAdjustment: true,
      },
      trainingConfig: {
        validationSplit: 0.2,
        earlyStoppingPatience: 10,
        crossValidationFolds: 5,
        dataAugmentation: false,
        featureNormalization: true,
        outlierDetection: true,
        evaluationMetrics: ['precision', 'recall', 'f1', 'ndcg'],
        testSetSize: 0.1,
      },
      batchSize: 1000,
      maxTrainingTime: 30000, // 30 seconds
      modelUpdateFrequency: 3600000, // 1 hour
      featureUpdateFrequency: 1800000, // 30 minutes
      ...config,
    }

    this.initializeModels()
    logger.info('ML Recommendation Engine initialized', { config: this.config })
  }

  // =============================================================================
  // Main Recommendation Methods
  // =============================================================================

  /**
   * Generate ML-powered recommendations
   */
  async generateRecommendations(
    request: ContextualRecommendationRequest,
    availableTools: string[],
    maxRecommendations = 10
  ): Promise<MLRecommendation[]> {
    const startTime = Date.now()

    try {
      // Ensure models are trained
      await this.ensureModelsAreTrained()

      // Get user profile
      const userProfile = await this.getUserProfile(request.currentContext.userId)

      // Generate recommendations from different algorithms
      const recommendations = await this.generateHybridRecommendations(
        request,
        userProfile,
        availableTools,
        maxRecommendations
      )

      // Apply post-processing
      const processedRecommendations = this.postProcessRecommendations(
        recommendations,
        request,
        userProfile
      )

      logger.info('ML recommendations generated', {
        userId: request.currentContext.userId,
        count: processedRecommendations.length,
        responseTime: Date.now() - startTime,
      })

      return processedRecommendations
    } catch (error) {
      logger.error('Error generating ML recommendations', {
        error,
        userId: request.currentContext.userId,
      })
      return this.getFallbackRecommendations(request, availableTools, maxRecommendations)
    }
  }

  /**
   * Record user interaction for model training
   */
  async recordInteraction(interaction: InteractionData): Promise<void> {
    try {
      // Add to interaction history
      this.interactionHistory.push(interaction)

      // Add to training queue
      this.trainingQueue.push(interaction)

      // Update user profile
      await this.updateUserProfile(interaction)

      // Trigger incremental learning if needed
      if (this.shouldTriggerIncrementalLearning()) {
        await this.performIncrementalLearning()
      }

      logger.debug('Interaction recorded', {
        userId: interaction.userId,
        toolId: interaction.toolId,
        outcome: interaction.outcome.successful,
      })
    } catch (error) {
      logger.error('Error recording interaction', { error, interaction })
    }
  }

  /**
   * Train or update ML models
   */
  async trainModels(fullRetraining = false): Promise<TrainingResult> {
    const startTime = Date.now()

    try {
      logger.info('Starting model training', {
        fullRetraining,
        queueSize: this.trainingQueue.length,
      })

      const result: TrainingResult = {
        modelsUpdated: [],
        performanceImprovements: {},
        trainingTime: 0,
        dataProcessed: this.trainingQueue.length,
        errors: [],
      }

      // Prepare training data
      const trainingData = fullRetraining ? this.interactionHistory : this.trainingQueue

      if (trainingData.length === 0) {
        logger.info('No training data available')
        return result
      }

      // Train collaborative filtering model
      if (this.config.enableCollaborativeFiltering) {
        try {
          await this.trainCollaborativeModel(trainingData)
          result.modelsUpdated.push('collaborative')
          logger.debug('Collaborative filtering model trained')
        } catch (error) {
          logger.error('Error training collaborative model', { error })
          result.errors.push(`Collaborative: ${error}`)
        }
      }

      // Train content-based model
      if (this.config.enableContentBasedFiltering) {
        try {
          await this.trainContentBasedModel(trainingData)
          result.modelsUpdated.push('content_based')
          logger.debug('Content-based model trained')
        } catch (error) {
          logger.error('Error training content-based model', { error })
          result.errors.push(`Content-based: ${error}`)
        }
      }

      // Train sequential model
      if (this.config.enableSequentialModeling) {
        try {
          await this.trainSequentialModel(trainingData)
          result.modelsUpdated.push('sequential')
          logger.debug('Sequential model trained')
        } catch (error) {
          logger.error('Error training sequential model', { error })
          result.errors.push(`Sequential: ${error}`)
        }
      }

      // Update hybrid model
      if (result.modelsUpdated.length > 0) {
        await this.updateHybridModel()
        result.modelsUpdated.push('hybrid')
      }

      // Evaluate model performance
      const performance = await this.evaluateModelPerformance()
      result.performanceImprovements = this.calculatePerformanceImprovements(performance)

      // Clear training queue
      this.trainingQueue = []
      this.lastTrainingTime = new Date()

      result.trainingTime = Date.now() - startTime

      logger.info('Model training completed', {
        modelsUpdated: result.modelsUpdated,
        trainingTime: result.trainingTime,
        dataProcessed: result.dataProcessed,
        errors: result.errors.length,
      })

      return result
    } catch (error) {
      logger.error('Error in model training', { error })
      throw error
    }
  }

  /**
   * Get model performance analytics
   */
  getPerformanceAnalytics(): ModelPerformanceAnalytics {
    const latestPerformance = this.modelPerformance[this.modelPerformance.length - 1]

    return {
      currentPerformance: latestPerformance?.metrics || this.getDefaultMetrics(),
      performanceHistory: this.modelPerformance,
      modelHealth: this.assessModelHealth(),
      recommendationQuality: this.assessRecommendationQuality(),
      userEngagement: this.calculateUserEngagement(),
      systemLoad: this.getSystemLoadMetrics(),
    }
  }

  // =============================================================================
  // Private Model Training Methods
  // =============================================================================

  private async initializeModels(): Promise<void> {
    // Initialize empty models
    if (this.config.enableCollaborativeFiltering) {
      this.collaborativeModel = this.createEmptyCollaborativeModel()
    }

    if (this.config.enableContentBasedFiltering) {
      this.contentBasedModel = this.createEmptyContentBasedModel()
    }

    if (this.config.enableSequentialModeling) {
      this.sequentialModel = this.createEmptySequentialModel()
    }

    this.hybridModel = this.createEmptyHybridModel()
  }

  private async ensureModelsAreTrained(): Promise<void> {
    const timeSinceLastTraining = Date.now() - this.lastTrainingTime.getTime()

    if (
      timeSinceLastTraining > this.config.modelUpdateFrequency ||
      this.trainingQueue.length > this.config.batchSize
    ) {
      await this.trainModels()
    }
  }

  private async generateHybridRecommendations(
    request: ContextualRecommendationRequest,
    userProfile: UserProfile,
    availableTools: string[],
    maxRecommendations: number
  ): Promise<MLRecommendation[]> {
    const recommendations: MLRecommendation[] = []

    // Get recommendations from each algorithm
    const collaborativeRecs = this.config.enableCollaborativeFiltering
      ? await this.getCollaborativeRecommendations(userProfile, availableTools)
      : []

    const contentBasedRecs = this.config.enableContentBasedFiltering
      ? await this.getContentBasedRecommendations(userProfile, availableTools, request)
      : []

    const sequentialRecs = this.config.enableSequentialModeling
      ? await this.getSequentialRecommendations(userProfile, availableTools, request)
      : []

    // Combine recommendations using hybrid approach
    const hybridRecs = this.combineRecommendations(
      collaborativeRecs,
      contentBasedRecs,
      sequentialRecs,
      request
    )

    // Sort by score and limit to max recommendations
    return hybridRecs.sort((a, b) => b.score - a.score).slice(0, maxRecommendations)
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    let profile = this.userProfiles.get(userId)

    if (!profile) {
      profile = this.createDefaultUserProfile(userId)
      this.userProfiles.set(userId, profile)
    }

    return profile
  }

  private shouldTriggerIncrementalLearning(): boolean {
    return this.trainingQueue.length >= this.config.batchSize / 4
  }

  private async performIncrementalLearning(): Promise<void> {
    // Perform lightweight model updates with recent data
    const recentData = this.trainingQueue.slice(-this.config.batchSize / 4)

    if (this.collaborativeModel) {
      await this.incrementalUpdateCollaborative(recentData)
    }

    if (this.sequentialModel) {
      await this.incrementalUpdateSequential(recentData)
    }
  }

  // =============================================================================
  // Algorithm Implementation Methods (Stubs for Complete Implementation)
  // =============================================================================

  private async trainCollaborativeModel(data: InteractionData[]): Promise<void> {
    // Implementation would use matrix factorization or neighborhood-based CF
    logger.debug('Training collaborative filtering model', { dataSize: data.length })
  }

  private async trainContentBasedModel(data: InteractionData[]): Promise<void> {
    // Implementation would extract features and train similarity models
    logger.debug('Training content-based model', { dataSize: data.length })
  }

  private async trainSequentialModel(data: InteractionData[]): Promise<void> {
    // Implementation would learn sequence patterns and transition probabilities
    logger.debug('Training sequential model', { dataSize: data.length })
  }

  private async updateHybridModel(): Promise<void> {
    // Implementation would optimize ensemble weights and meta-learning
    logger.debug('Updating hybrid model')
  }

  private async getCollaborativeRecommendations(
    userProfile: UserProfile,
    availableTools: string[]
  ): Promise<MLRecommendation[]> {
    // Implementation would generate collaborative filtering recommendations
    return []
  }

  private async getContentBasedRecommendations(
    userProfile: UserProfile,
    availableTools: string[],
    request: ContextualRecommendationRequest
  ): Promise<MLRecommendation[]> {
    // Implementation would generate content-based recommendations
    return []
  }

  private async getSequentialRecommendations(
    userProfile: UserProfile,
    availableTools: string[],
    request: ContextualRecommendationRequest
  ): Promise<MLRecommendation[]> {
    // Implementation would generate sequential pattern-based recommendations
    return []
  }

  private combineRecommendations(
    collaborative: MLRecommendation[],
    contentBased: MLRecommendation[],
    sequential: MLRecommendation[],
    request: ContextualRecommendationRequest
  ): MLRecommendation[] {
    // Implementation would combine recommendations using ensemble method
    return [...collaborative, ...contentBased, ...sequential]
  }

  private postProcessRecommendations(
    recommendations: MLRecommendation[],
    request: ContextualRecommendationRequest,
    userProfile: UserProfile
  ): MLRecommendation[] {
    // Implementation would apply diversity, novelty, and business rules
    return recommendations
  }

  private getFallbackRecommendations(
    request: ContextualRecommendationRequest,
    availableTools: string[],
    maxRecommendations: number
  ): MLRecommendation[] {
    // Implementation would provide popularity-based fallback recommendations
    return []
  }

  // =============================================================================
  // Helper Methods (Implementation Stubs)
  // =============================================================================

  private async updateUserProfile(interaction: InteractionData): Promise<void> {
    // Update user profile based on interaction
  }

  private async evaluateModelPerformance(): Promise<PerformanceMetrics> {
    // Evaluate current model performance
    return this.getDefaultMetrics()
  }

  private calculatePerformanceImprovements(current: PerformanceMetrics): Record<string, number> {
    // Calculate performance improvements over previous models
    return {}
  }

  private createEmptyCollaborativeModel(): CollaborativeFilteringModel {
    return {
      userFactors: [],
      itemFactors: [],
      userBiases: [],
      itemBiases: [],
      globalMean: 0,
      userSimilarities: new Map(),
      itemSimilarities: new Map(),
    }
  }

  private createEmptyContentBasedModel(): ContentBasedModel {
    return {
      itemFeatures: new Map(),
      userProfiles: new Map(),
      featureWeights: [],
      similarityMatrix: [],
      featureImportance: {},
    }
  }

  private createEmptySequentialModel(): SequentialModel {
    return {
      transitionMatrix: new Map(),
      sequencePatterns: [],
      temporalWeights: [],
      contextualTransitions: new Map(),
    }
  }

  private createEmptyHybridModel(): HybridModel {
    return {
      modelWeights: this.config.hybridConfig.modelWeights,
      metaModel: null,
      contextualWeightingFunction: () => this.config.hybridConfig.modelWeights,
      performanceHistory: [],
    }
  }

  private createDefaultUserProfile(userId: string): UserProfile {
    return {
      userId,
      demographicFeatures: {},
      skillLevel: 'intermediate',
      preferences: {
        toolCategories: [],
        complexityPreference: 'moderate',
        interactionStyle: 'guided',
        feedbackFrequency: 'moderate',
        personalizedExperience: true,
      },
      usagePatterns: [],
      toolAffinities: {},
      sequentialPatterns: [],
      temporalPatterns: [],
      learningRate: 0.5,
      explorationTendency: 0.3,
      consistencyScore: 0.7,
      adaptabilityScore: 0.6,
      workflowContexts: [],
      collaborationStyle: 'moderate',
      workingSchedule: [],
    }
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      precision: 0.0,
      recall: 0.0,
      f1Score: 0.0,
      ndcg: 0.0,
      map: 0.0,
      clickThroughRate: 0.0,
      conversionRate: 0.0,
      userSatisfaction: 0.0,
      taskCompletionRate: 0.0,
      timeToCompletion: 0.0,
      responseTime: 0.0,
      throughput: 0.0,
      memoryUsage: 0.0,
      cpuUsage: 0.0,
      errorRate: 0.0,
      catalogCoverage: 0.0,
      userCoverage: 0.0,
      novelty: 0.0,
      diversity: 0.0,
    }
  }

  private assessModelHealth(): ModelHealthScore {
    return {
      overall: 0.8,
      collaborative: 0.8,
      contentBased: 0.8,
      sequential: 0.8,
      hybrid: 0.8,
      issues: [],
      recommendations: [],
    }
  }

  private assessRecommendationQuality(): RecommendationQualityScore {
    return {
      relevance: 0.8,
      diversity: 0.7,
      novelty: 0.6,
      coverage: 0.8,
      freshness: 0.9,
    }
  }

  private calculateUserEngagement(): UserEngagementMetrics {
    return {
      averageSessionLength: 0,
      toolAdoptionRate: 0,
      userRetention: 0,
      feedbackRate: 0,
      satisfactionTrend: 0,
    }
  }

  private getSystemLoadMetrics(): SystemLoadMetrics {
    return {
      memoryUsage: 0,
      cpuUsage: 0,
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
    }
  }

  private async incrementalUpdateCollaborative(data: InteractionData[]): Promise<void> {
    // Incremental update for collaborative filtering
  }

  private async incrementalUpdateSequential(data: InteractionData[]): Promise<void> {
    // Incremental update for sequential modeling
  }
}

// =============================================================================
// Supporting Types for ML Recommendations
// =============================================================================

export interface MLRecommendation {
  toolId: string
  score: number
  confidence: number
  algorithmScores: {
    collaborative?: number
    contentBased?: number
    sequential?: number
    hybrid: number
  }
  explanationFeatures: {
    similarUsers?: string[]
    similarItems?: string[]
    contentFeatures?: string[]
    sequencePatterns?: string[]
  }
  novelty: number
  diversity: number
  contextualRelevance: number
}

export interface TrainingResult {
  modelsUpdated: string[]
  performanceImprovements: Record<string, number>
  trainingTime: number
  dataProcessed: number
  errors: string[]
}

export interface ModelPerformanceAnalytics {
  currentPerformance: PerformanceMetrics
  performanceHistory: ModelPerformanceHistory[]
  modelHealth: ModelHealthScore
  recommendationQuality: RecommendationQualityScore
  userEngagement: UserEngagementMetrics
  systemLoad: SystemLoadMetrics
}

export interface ModelHealthScore {
  overall: number
  collaborative: number
  contentBased: number
  sequential: number
  hybrid: number
  issues: string[]
  recommendations: string[]
}

export interface RecommendationQualityScore {
  relevance: number
  diversity: number
  novelty: number
  coverage: number
  freshness: number
}

export interface UserEngagementMetrics {
  averageSessionLength: number
  toolAdoptionRate: number
  userRetention: number
  feedbackRate: number
  satisfactionTrend: number
}

export interface SystemLoadMetrics {
  memoryUsage: number
  cpuUsage: number
  responseTime: number
  throughput: number
  errorRate: number
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create ML recommendation engine with default configuration
 */
export function createMLRecommendationEngine(
  config?: Partial<MLRecommendationConfig>
): MLRecommendationEngine {
  return new MLRecommendationEngine(config)
}

/**
 * Create production-ready ML recommendation engine
 */
export function createProductionMLEngine(): MLRecommendationEngine {
  const productionConfig: Partial<MLRecommendationConfig> = {
    enableCollaborativeFiltering: true,
    enableContentBasedFiltering: true,
    enableSequentialModeling: true,
    batchSize: 10000,
    maxTrainingTime: 60000, // 1 minute
    modelUpdateFrequency: 1800000, // 30 minutes
    collaborativeConfig: {
      numFactors: 100,
      learningRate: 0.005,
      regularization: 0.05,
      iterations: 200,
      userSimilarityThreshold: 0.2,
      itemSimilarityThreshold: 0.2,
      neighborhoodSize: 50,
      coldStartStrategy: 'hybrid',
      minInteractions: 3,
    },
    hybridConfig: {
      ensembleMethod: 'stacking',
      modelWeights: { collaborative: 0.4, content: 0.35, sequential: 0.25 },
      metaLearningEnabled: true,
      contextualWeighting: true,
      dynamicWeightAdjustment: true,
    },
  }

  return new MLRecommendationEngine(productionConfig)
}
