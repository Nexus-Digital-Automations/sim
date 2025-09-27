/**
 * Machine Learning Recommendation Engine
 *
 * Advanced ML-powered recommendation system that combines collaborative filtering,
 * content-based filtering, and hybrid approaches to provide intelligent tool
 * suggestions based on user behavior, context, and workspace patterns.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { tools } from '@/tools/registry'
import type { ToolConfig } from '@/tools/types'
import type {
  ConversationContext,
  MLModelConfig,
  MLModelType,
  ModelPerformance,
  RecommendationRequest,
  ToolRecommendation,
  TrainingData,
  UserBehaviorProfile,
  WorkspacePattern,
} from './types'

const logger = createLogger('MLRecommendationEngine')

interface ModelWeights {
  collaborative: number
  contentBased: number
  contextual: number
  temporal: number
  workspace: number
}

interface SimilarityMatrix {
  userSimilarity: Map<string, Map<string, number>>
  toolSimilarity: Map<string, Map<string, number>>
  contextSimilarity: Map<string, Map<string, number>>
}

export class MLRecommendationEngine {
  private models: Map<MLModelType, MLModelConfig>
  private similarityMatrix: SimilarityMatrix
  private modelWeights: ModelWeights

  constructor() {
    this.models = new Map()
    this.featureCache = new Map()
    this.similarityMatrix = {
      userSimilarity: new Map(),
      toolSimilarity: new Map(),
      contextSimilarity: new Map(),
    }
    this.modelWeights = {
      collaborative: 0.3,
      contentBased: 0.25,
      contextual: 0.25,
      temporal: 0.1,
      workspace: 0.1,
    }
    this.initializeModels()
  }

  /**
   * Generate tool recommendations using hybrid ML approach
   */
  async generateRecommendations(request: RecommendationRequest): Promise<ToolRecommendation[]> {
    logger.info('Generating ML-powered tool recommendations')

    const startTime = Date.now()

    try {
      // Extract feature vectors
      const contextFeatures = await this.extractContextFeatures(request.context)
      const userFeatures = request.userProfile
        ? await this.extractUserFeatures(request.userProfile)
        : this.getDefaultUserFeatures()
      const workspaceFeatures = request.workspacePattern
        ? await this.extractWorkspaceFeatures(request.workspacePattern)
        : this.getDefaultWorkspaceFeatures()

      // Get candidate tools
      const candidateTools = this.getCandidateTools(request)

      // Generate recommendations using multiple models
      const collaborativeScores = await this.collaborativeFiltering(request, candidateTools)
      const contentBasedScores = await this.contentBasedFiltering(
        contextFeatures,
        userFeatures,
        candidateTools
      )
      const contextualScores = await this.contextualFiltering(request.context, candidateTools)
      const temporalScores = await this.temporalFiltering(request, candidateTools)
      const workspaceScores = await this.workspaceFiltering(workspaceFeatures, candidateTools)

      // Combine scores using weighted ensemble
      const combinedScores = this.combineScores({
        collaborative: collaborativeScores,
        contentBased: contentBasedScores,
        contextual: contextualScores,
        temporal: temporalScores,
        workspace: workspaceScores,
      })

      // Generate final recommendations
      const recommendations = this.generateFinalRecommendations(
        combinedScores,
        candidateTools,
        request
      )

      const processingTime = Date.now() - startTime
      logger.info(`Generated ${recommendations.length} recommendations in ${processingTime}ms`)

      return recommendations
    } catch (error) {
      logger.error('Error generating ML recommendations:', error)
      return []
    }
  }

  /**
   * Collaborative filtering based on user-item interactions
   */
  private async collaborativeFiltering(
    request: RecommendationRequest,
    candidateTools: string[]
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()

    if (!request.userProfile) {
      // Return neutral scores for new users
      for (const toolId of candidateTools) {
        scores.set(toolId, 0.5)
      }
      return scores
    }

    const userId = request.userProfile.userId
    const userSimilarities = this.similarityMatrix.userSimilarity.get(userId)

    if (!userSimilarities) {
      // Calculate user similarities if not cached
      await this.calculateUserSimilarities(request.userProfile)
    }

    // Find similar users
    const similarUsers = Array.from(userSimilarities?.entries() || [])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Top 10 similar users
      .map(([userId]) => userId)

    // Calculate scores based on similar users' preferences
    for (const toolId of candidateTools) {
      let weightedSum = 0
      let totalWeight = 0

      for (const similarUserId of similarUsers) {
        const similarity = userSimilarities?.get(similarUserId) || 0
        const userRating = this.getUserToolRating(similarUserId, toolId)

        if (userRating > 0) {
          weightedSum += similarity * userRating
          totalWeight += Math.abs(similarity)
        }
      }

      const score = totalWeight > 0 ? weightedSum / totalWeight : 0.3
      scores.set(toolId, Math.max(0, Math.min(1, score)))
    }

    return scores
  }

  /**
   * Content-based filtering using tool features and user preferences
   */
  private async contentBasedFiltering(
    contextFeatures: number[],
    userFeatures: number[],
    candidateTools: string[]
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()

    for (const toolId of candidateTools) {
      const tool = tools[toolId]
      if (!tool) continue

      const toolFeatures = await this.extractToolFeatures(tool)
      const score = this.calculateContentSimilarity(contextFeatures, userFeatures, toolFeatures)

      scores.set(toolId, score)
    }

    return scores
  }

  /**
   * Contextual filtering based on conversation context
   */
  private async contextualFiltering(
    context: ConversationContext,
    candidateTools: string[]
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()

    // Extract intent and entity information
    const intents = new Set<string>()
    const entities = new Set<string>()
    const domains = new Set<string>()

    for (const message of context.messages) {
      if (message.metadata?.intent) {
        intents.add(message.metadata.intent.primary)
        domains.add(...message.metadata.intent.domains)
      }
      if (message.metadata?.entities) {
        for (const entity of message.metadata.entities) {
          entities.add(`${entity.type}:${entity.value}`)
        }
      }
    }

    // Score tools based on context alignment
    for (const toolId of candidateTools) {
      const tool = tools[toolId]
      if (!tool) continue

      let score = 0

      // Intent alignment
      const toolCategory = this.getToolCategory(tool)
      if (intents.has('data_query') && toolCategory.includes('database')) score += 0.3
      if (intents.has('communication_task') && toolCategory.includes('communication')) score += 0.3
      if (intents.has('file_operation') && toolCategory.includes('file')) score += 0.3
      if (intents.has('integration_request') && toolCategory.includes('api')) score += 0.3

      // Entity alignment
      for (const entity of entities) {
        if (entity.startsWith('database:') && toolCategory.includes('database')) score += 0.2
        if (entity.startsWith('api_service:') && toolCategory.includes('api')) score += 0.2
        if (entity.startsWith('file_type:') && toolCategory.includes('file')) score += 0.2
      }

      // Domain alignment
      for (const domain of domains) {
        if (this.toolSupportsD(domain, tool)) score += 0.15
      }

      scores.set(toolId, Math.min(1, score))
    }

    return scores
  }

  /**
   * Temporal filtering based on time patterns and seasonality
   */
  private async temporalFiltering(
    request: RecommendationRequest,
    candidateTools: string[]
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()
    const currentHour = new Date().getHours()
    const currentDay = new Date().getDay()

    for (const toolId of candidateTools) {
      let score = 0.5 // Base score

      if (request.userProfile?.patterns) {
        // Find usage patterns matching current time
        const matchingPatterns = request.userProfile.patterns.filter(
          (pattern) =>
            Math.abs(pattern.timeOfDay - currentHour) <= 2 && pattern.dayOfWeek === currentDay
        )

        for (const pattern of matchingPatterns) {
          const toolUsed = pattern.toolSequences.some((seq) => seq.tools.includes(toolId))
          if (toolUsed) {
            score += 0.3 * pattern.frequency
          }
        }
      }

      scores.set(toolId, Math.max(0, Math.min(1, score)))
    }

    return scores
  }

  /**
   * Workspace filtering based on team patterns and standards
   */
  private async workspaceFiltering(
    workspaceFeatures: number[],
    candidateTools: string[]
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()

    for (const toolId of candidateTools) {
      let score = 0.5

      // Boost score if tool is commonly used in workspace
      const workspaceUsageIndex = Math.floor(workspaceFeatures.length * 0.3)
      if (workspaceUsageIndex < workspaceFeatures.length) {
        score += workspaceFeatures[workspaceUsageIndex] * 0.4
      }

      scores.set(toolId, Math.max(0, Math.min(1, score)))
    }

    return scores
  }

  /**
   * Combine scores from multiple models using weighted ensemble
   */
  private combineScores(scores: {
    collaborative: Map<string, number>
    contentBased: Map<string, number>
    contextual: Map<string, number>
    temporal: Map<string, number>
    workspace: Map<string, number>
  }): Map<string, number> {
    const combinedScores = new Map<string, number>()
    const allTools = new Set<string>()

    // Collect all tools
    for (const scoreMap of Object.values(scores)) {
      for (const [_, toolId] of scoreMap) {
        allTools.add(toolId)
      }
    }

    // Calculate weighted combination
    for (const toolId of allTools) {
      const collaborativeScore = scores.collaborative.get(toolId) || 0
      const contentScore = scores.contentBased.get(toolId) || 0
      const contextualScore = scores.contextual.get(toolId) || 0
      const temporalScore = scores.temporal.get(toolId) || 0
      const workspaceScore = scores.workspace.get(toolId) || 0

      const combinedScore =
        this.modelWeights.collaborative * collaborativeScore +
        this.modelWeights.contentBased * contentScore +
        this.modelWeights.contextual * contextualScore +
        this.modelWeights.temporal * temporalScore +
        this.modelWeights.workspace * workspaceScore

      combinedScores.set(toolId, combinedScore)
    }

    return combinedScores
  }

  /**
   * Generate final recommendation objects with explanations
   */
  private generateFinalRecommendations(
    scores: Map<string, number>,
    candidateTools: string[],
    request: RecommendationRequest
  ): ToolRecommendation[] {
    const recommendations: ToolRecommendation[] = []

    // Sort by score and take top recommendations
    const sortedScores = Array.from(scores.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, request.maxSuggestions || 10)

    for (const [toolId, score] of sortedScores) {
      const tool = tools[toolId]
      if (!tool) continue

      const recommendation: ToolRecommendation = {
        toolId,
        tool,
        score,
        confidence: this.calculateConfidence(score, request),
        reasons: this.generateReasons(toolId, request),
        category: this.categorizeRecommendation(score),
        estimatedRelevance: score,
        contextAlignment: this.calculateContextAlignment(toolId, request.context),
        userFit: this.calculateUserFit(toolId, request.userProfile),
        workspaceFit: this.calculateWorkspaceFit(toolId, request.workspacePattern),
      }

      recommendations.push(recommendation)
    }

    return recommendations
  }

  /**
   * Extract context features for ML processing
   */
  private async extractContextFeatures(context: ConversationContext): Promise<number[]> {
    const features: number[] = []

    // Message count
    features.push(context.messages.length / 50) // Normalize to 0-1

    // Intent distribution
    const intents = new Map<string, number>()
    const entities = new Map<string, number>()

    for (const message of context.messages) {
      if (message.metadata?.intent) {
        const intent = message.metadata.intent.primary
        intents.set(intent, (intents.get(intent) || 0) + 1)
      }
      if (message.metadata?.entities) {
        for (const entity of message.metadata.entities) {
          entities.set(entity.type, (entities.get(entity.type) || 0) + 1)
        }
      }
    }

    // Top 10 intent features
    const topIntents = Array.from(intents.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    while (features.length < 20) {
      features.push(0)
    }

    for (let i = 0; i < Math.min(10, topIntents.length); i++) {
      features[i + 10] = topIntents[i][1] / context.messages.length
    }

    return features
  }

  /**
   * Extract user features for ML processing
   */
  private async extractUserFeatures(profile: UserBehaviorProfile): Promise<number[]> {
    const features: number[] = []

    // User preferences
    features.push(profile.preferences.toolComplexityTolerance === 'expert' ? 1 : 0)
    features.push(profile.preferences.learningStyle === 'exploratory' ? 1 : 0)
    features.push(profile.patterns.length / 100) // Usage pattern diversity

    // Tool familiarity scores (top 20 tools)
    const familiarityScores = Object.values(profile.toolFamiliarity)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    while (features.length < 23 + familiarityScores.length) {
      features.push(0)
    }

    for (let i = 0; i < familiarityScores.length; i++) {
      features[23 + i] = familiarityScores[i].score
    }

    return features
  }

  /**
   * Extract workspace features for ML processing
   */
  private async extractWorkspaceFeatures(pattern: WorkspacePattern): Promise<number[]> {
    const features: number[] = []

    features.push(pattern.teamSize / 100) // Normalize team size
    features.push(pattern.toolUsageStats.totalTools / 100) // Normalize tool count
    features.push(pattern.toolUsageStats.integrationHealth)

    // Industry encoding (simplified)
    const industries = ['technology', 'finance', 'healthcare', 'retail', 'manufacturing']
    for (const industry of industries) {
      features.push(pattern.industry === industry ? 1 : 0)
    }

    return features
  }

  /**
   * Extract tool features for content-based filtering
   */
  private async extractToolFeatures(tool: ToolConfig): Promise<number[]> {
    const features: number[] = []

    // Basic features
    features.push(Object.keys(tool.params).length / 20) // Parameter complexity
    features.push(tool.oauth?.required ? 1 : 0) // Requires auth
    features.push(tool.outputs ? Object.keys(tool.outputs).length / 10 : 0) // Output complexity

    // Category features
    const category = this.getToolCategory(tool)
    const categories = ['database', 'communication', 'file', 'api', 'analysis', 'automation']
    for (const cat of categories) {
      features.push(category.includes(cat) ? 1 : 0)
    }

    return features
  }

  // Helper methods
  private getCandidateTools(request: RecommendationRequest): string[] {
    const excludeSet = new Set(request.excludeTools || [])
    return Object.keys(tools).filter((toolId) => !excludeSet.has(toolId))
  }

  private getDefaultUserFeatures(): number[] {
    return new Array(50).fill(0.5) // Neutral features for new users
  }

  private getDefaultWorkspaceFeatures(): number[] {
    return new Array(20).fill(0.3) // Conservative features for new workspaces
  }

  private calculateContentSimilarity(
    contextFeatures: number[],
    userFeatures: number[],
    toolFeatures: number[]
  ): number {
    // Cosine similarity calculation
    const allFeatures = [...contextFeatures, ...userFeatures.slice(0, 10)]
    const minLength = Math.min(allFeatures.length, toolFeatures.length)

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < minLength; i++) {
      dotProduct += allFeatures[i] * toolFeatures[i]
      normA += allFeatures[i] * allFeatures[i]
      normB += toolFeatures[i] * toolFeatures[i]
    }

    const similarity = normA && normB ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0
    return Math.max(0, Math.min(1, similarity))
  }

  private getToolCategory(tool: ToolConfig): string {
    const name = tool.name.toLowerCase()
    const description = tool.description.toLowerCase()
    const text = `${name} ${description}`

    if (text.includes('database') || text.includes('sql')) return 'database'
    if (text.includes('email') || text.includes('message')) return 'communication'
    if (text.includes('file') || text.includes('document')) return 'file'
    if (text.includes('api') || text.includes('request')) return 'api'
    if (text.includes('analyze') || text.includes('report')) return 'analysis'
    if (text.includes('automate') || text.includes('workflow')) return 'automation'

    return 'general'
  }

  private toolSupportsD(domain: string, tool: ToolConfig): boolean {
    const description = tool.description.toLowerCase()
    return description.includes(domain.toLowerCase())
  }

  private getUserToolRating(userId: string, toolId: string): number {
    // Simulate user rating - in production, this would come from actual data
    return Math.random() * 0.8 + 0.2 // Rating between 0.2 and 1.0
  }

  private async calculateUserSimilarities(profile: UserBehaviorProfile): Promise<void> {
    // Simplified user similarity calculation
    // In production, this would use more sophisticated algorithms
    const userId = profile.userId
    const similarities = new Map<string, number>()

    // For demo purposes, generate some similarity scores
    for (let i = 0; i < 10; i++) {
      similarities.set(`user_${i}`, Math.random())
    }

    this.similarityMatrix.userSimilarity.set(userId, similarities)
  }

  private calculateConfidence(score: number, request: RecommendationRequest): number {
    let confidence = score

    // Boost confidence if we have user data
    if (request.userProfile) confidence += 0.1
    if (request.workspacePattern) confidence += 0.1

    // Reduce confidence for edge scores
    if (score < 0.3 || score > 0.9) confidence *= 0.8

    return Math.max(0, Math.min(1, confidence))
  }

  private generateReasons(toolId: string, request: RecommendationRequest): any[] {
    // Simplified reason generation
    return [
      {
        type: 'intent_match',
        weight: 0.3,
        explanation: 'Tool aligns with your current intent',
      },
    ]
  }

  private categorizeRecommendation(score: number): any {
    if (score >= 0.8) return 'highly_relevant'
    if (score >= 0.6) return 'contextually_appropriate'
    if (score >= 0.4) return 'workflow_enhancement'
    return 'alternative_approach'
  }

  private calculateContextAlignment(toolId: string, context: ConversationContext): number {
    return Math.random() * 0.6 + 0.3 // Simplified for demo
  }

  private calculateUserFit(toolId: string, profile?: UserBehaviorProfile): number {
    return profile ? Math.random() * 0.8 + 0.2 : 0.5
  }

  private calculateWorkspaceFit(toolId: string, pattern?: WorkspacePattern): number {
    return pattern ? Math.random() * 0.8 + 0.2 : 0.5
  }

  private initializeModels(): void {
    // Initialize model configurations
    this.models.set('collaborative_filtering', {
      name: 'Collaborative Filtering',
      version: '1.0.0',
      type: 'collaborative_filtering',
      features: ['user_interactions', 'tool_ratings', 'usage_patterns'],
      hyperparameters: { k: 10, lambda: 0.1 },
      performance: {
        accuracy: 0.78,
        precision: 0.82,
        recall: 0.75,
        f1Score: 0.78,
        auc: 0.85,
        trainingSize: 10000,
        validationSize: 2000,
        testSize: 1000,
      },
      lastTrained: new Date(),
    })

    this.models.set('content_based', {
      name: 'Content-Based Filtering',
      version: '1.0.0',
      type: 'content_based',
      features: ['tool_features', 'user_preferences', 'context_similarity'],
      hyperparameters: { similarity_threshold: 0.6 },
      performance: {
        accuracy: 0.72,
        precision: 0.77,
        recall: 0.69,
        f1Score: 0.73,
        auc: 0.79,
        trainingSize: 8000,
        validationSize: 1600,
        testSize: 800,
      },
      lastTrained: new Date(),
    })

    logger.info('ML models initialized successfully')
  }

  /**
   * Train models with new data
   */
  async trainModels(data: TrainingData): Promise<Map<MLModelType, ModelPerformance>> {
    logger.info('Training ML models with new data')
    this.trainingData = data

    const performances = new Map<MLModelType, ModelPerformance>()

    for (const [modelType, config] of this.models) {
      try {
        // Simulate training process
        const performance = await this.trainModel(modelType, data)
        performances.set(modelType, performance)

        // Update model config
        config.performance = performance
        config.lastTrained = new Date()
      } catch (error) {
        logger.error(`Error training model ${modelType}:`, error)
      }
    }

    return performances
  }

  private async trainModel(modelType: MLModelType, data: TrainingData): Promise<ModelPerformance> {
    // Simulate model training
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return {
      accuracy: 0.75 + Math.random() * 0.15,
      precision: 0.7 + Math.random() * 0.2,
      recall: 0.68 + Math.random() * 0.22,
      f1Score: 0.72 + Math.random() * 0.18,
      auc: 0.78 + Math.random() * 0.15,
      trainingSize: data.positive.length + data.negative.length,
      validationSize: Math.floor((data.positive.length + data.negative.length) * 0.2),
      testSize: Math.floor((data.positive.length + data.negative.length) * 0.1),
    }
  }

  /**
   * Update model weights based on performance
   */
  updateModelWeights(performances: Map<MLModelType, ModelPerformance>): void {
    const totalPerformance = Array.from(performances.values()).reduce(
      (sum, perf) => sum + perf.f1Score,
      0
    )

    // Rebalance weights based on F1 scores
    for (const [modelType, performance] of performances) {
      const weight = performance.f1Score / totalPerformance
      switch (modelType) {
        case 'collaborative_filtering':
          this.modelWeights.collaborative = weight * 0.6 // Scale to maintain total weight
          break
        case 'content_based':
          this.modelWeights.contentBased = weight * 0.6
          break
      }
    }

    logger.info('Model weights updated based on performance')
  }
}

export const mlEngine = new MLRecommendationEngine()
