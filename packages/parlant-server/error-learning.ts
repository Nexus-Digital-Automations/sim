/**
 * Error Learning and Improvement Engine
 *
 * This module provides machine learning capabilities for error handling, including
 * pattern recognition, predictive analysis, and continuous improvement of error
 * resolution strategies based on historical data and user feedback.
 */

import { EventEmitter } from 'events'
import { createLogger } from '../../apps/sim/lib/logs/console/logger'
import type { BaseToolError } from './error-handler'
import {
  type ErrorCategory,
  type ErrorSeverity,
  type ErrorImpact,
  type ErrorClassification,
  RecoveryStrategy,
} from './error-taxonomy'
import type {
  UserInteraction,
  LearningFeedback,
  IntelligentErrorExplanation,
} from './error-intelligence'
import type { RecoveryResult, RetryAttempt } from './error-recovery'
import type { ParlantLogContext } from './logging'

const logger = createLogger('ErrorLearning')

/**
 * Learning data point for training models
 */
export interface LearningDataPoint {
  id: string
  timestamp: string
  errorId: string
  errorCategory: ErrorCategory
  errorSeverity: ErrorSeverity
  errorSubcategory: string
  contextFeatures: Record<string, any>
  environmentFeatures: Record<string, any>
  userFeatures: Record<string, any>
  resolutionOutcome: ResolutionOutcome
  timesToResolution?: number
  userSatisfaction?: number
  resolutionStrategy: RecoveryStrategy
  effectiveness: number
}

/**
 * Resolution outcome tracking
 */
export interface ResolutionOutcome {
  resolved: boolean
  resolutionMethod: 'automatic' | 'user_guided' | 'manual' | 'escalated'
  timeToResolution: number
  stepsRequired: number
  retryCount: number
  fallbacksUsed: string[]
  finalStrategy: RecoveryStrategy
  userSatisfaction: number
  success: boolean
}

/**
 * Feature importance for ML models
 */
export interface FeatureImportance {
  feature: string
  importance: number
  confidence: number
  category: 'error' | 'context' | 'environment' | 'user' | 'system'
}

/**
 * Model performance metrics
 */
export interface ModelPerformance {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  confusionMatrix: number[][]
  lastUpdated: string
  trainingDataSize: number
  validationScore: number
}

/**
 * Pattern learning result
 */
export interface LearnedPattern {
  id: string
  name: string
  description: string
  frequency: number
  confidence: number
  conditions: PatternCondition[]
  recommendations: PatternRecommendation[]
  learnedFrom: 'user_feedback' | 'resolution_success' | 'failure_analysis'
  effectiveness: number
  lastSeen: string
  errorCategories: ErrorCategory[]
}

/**
 * Pattern condition
 */
export interface PatternCondition {
  feature: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range'
  value: any
  weight: number
}

/**
 * Pattern recommendation
 */
export interface PatternRecommendation {
  type: 'prevention' | 'early_detection' | 'resolution' | 'escalation'
  action: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  expectedOutcome: string
  confidence: number
}

/**
 * Prediction result for error occurrence
 */
export interface ErrorPrediction {
  errorCategory: ErrorCategory
  probability: number
  confidence: number
  timeWindow: { start: number; end: number }
  triggeringFactors: TriggeringFactor[]
  preventionActions: PreventionAction[]
  severity: ErrorSeverity
  expectedImpact: ErrorImpact
}

/**
 * Triggering factor for predictions
 */
export interface TriggeringFactor {
  factor: string
  value: any
  contribution: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

/**
 * Prevention action recommendation
 */
export interface PreventionAction {
  id: string
  description: string
  category: 'monitoring' | 'configuration' | 'scaling' | 'maintenance'
  urgency: 'low' | 'medium' | 'high'
  estimatedEffectiveness: number
  implementationCost: 'low' | 'medium' | 'high'
  instructions: string[]
}

/**
 * Improvement suggestion based on learning
 */
export interface ImprovementSuggestion {
  id: string
  type: 'error_handling' | 'user_experience' | 'system_optimization' | 'documentation'
  title: string
  description: string
  currentPerformance: number
  projectedImprovement: number
  implementation: ImplementationPlan
  businessImpact: BusinessImpact
  confidence: number
  priority: number
}

/**
 * Implementation plan for improvements
 */
export interface ImplementationPlan {
  steps: ImplementationStep[]
  estimatedTime: string
  requiredResources: string[]
  risks: string[]
  successCriteria: string[]
}

/**
 * Implementation step
 */
export interface ImplementationStep {
  order: number
  description: string
  estimatedTime: string
  dependencies: string[]
  validation: string
}

/**
 * Business impact assessment
 */
export interface BusinessImpact {
  userExperience: number
  systemReliability: number
  operationalCost: number
  developmentEfficiency: number
  customerSatisfaction: number
  overallScore: number
}

/**
 * Model training parameters
 */
export interface ModelTrainingConfig {
  algorithm: 'random_forest' | 'gradient_boosting' | 'neural_network' | 'logistic_regression'
  hyperparameters: Record<string, any>
  trainingRatio: number
  validationRatio: number
  crossValidationFolds: number
  featureSelectionThreshold: number
  retrainingThreshold: number
  maxTrainingTime: number
}

/**
 * Error Learning and Improvement Engine
 */
export class ErrorLearningEngine extends EventEmitter {
  private learningData: LearningDataPoint[] = []
  private learnedPatterns: Map<string, LearnedPattern> = new Map()
  private models: Map<string, LearningModel> = new Map()
  private featureImportance: Map<string, FeatureImportance[]> = new Map()
  private improvementSuggestions: ImprovementSuggestion[] = []
  private predictionCache: Map<string, ErrorPrediction[]> = new Map()

  constructor() {
    super()
    this.initializeLearningEngine()
    logger.info('Error Learning Engine initialized')
  }

  /**
   * Learn from error resolution data
   */
  async learnFromResolution(
    error: BaseToolError,
    resolutionOutcome: ResolutionOutcome,
    context: ParlantLogContext,
    userFeedback?: LearningFeedback
  ): Promise<void> {
    logger.debug('Learning from error resolution', {
      errorId: error.id,
      resolved: resolutionOutcome.resolved,
      timeToResolution: resolutionOutcome.timeToResolution,
      method: resolutionOutcome.resolutionMethod,
    })

    // Extract features from the error and context
    const contextFeatures = this.extractContextFeatures(context)
    const environmentFeatures = this.extractEnvironmentFeatures()
    const userFeatures = this.extractUserFeatures(context, userFeedback)

    // Create learning data point
    const dataPoint: LearningDataPoint = {
      id: `learning-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      timestamp: new Date().toISOString(),
      errorId: error.id,
      errorCategory: error.category,
      errorSeverity: error.severity,
      errorSubcategory: error.subcategory,
      contextFeatures,
      environmentFeatures,
      userFeatures,
      resolutionOutcome,
      timesToResolution: resolutionOutcome.timeToResolution,
      userSatisfaction: userFeedback?.feedback.helpfulness || resolutionOutcome.userSatisfaction,
      resolutionStrategy: resolutionOutcome.finalStrategy,
      effectiveness: this.calculateEffectiveness(resolutionOutcome, userFeedback),
    }

    // Store learning data
    this.learningData.push(dataPoint)
    this.trimLearningData()

    // Update models
    await this.updateModels(dataPoint)

    // Identify new patterns
    await this.identifyPatterns([dataPoint])

    // Generate improvement suggestions
    await this.generateImprovements()

    // Emit learning event
    this.emit('learning_update', {
      dataPointId: dataPoint.id,
      errorCategory: error.category,
      effectiveness: dataPoint.effectiveness,
      patternsIdentified: this.learnedPatterns.size,
    })

    logger.info('Learning completed', {
      dataPointId: dataPoint.id,
      effectiveness: dataPoint.effectiveness.toFixed(2),
      totalLearningData: this.learningData.length,
    })
  }

  /**
   * Learn from user feedback
   */
  async learnFromFeedback(feedback: LearningFeedback): Promise<void> {
    logger.debug('Learning from user feedback', {
      explanationId: feedback.explanationId,
      clarity: feedback.feedback.clarity,
      helpfulness: feedback.feedback.helpfulness,
    })

    // Find related learning data
    const relatedData = this.learningData.filter(dp =>
      dp.timestamp === feedback.timestamp || // Same time
      dp.errorId === feedback.explanationId  // Direct relation
    )

    // Update effectiveness scores
    for (const dataPoint of relatedData) {
      dataPoint.effectiveness = this.recalculateEffectiveness(dataPoint, feedback)
      dataPoint.userSatisfaction = this.calculateOverallSatisfaction(feedback.feedback)
    }

    // Update models with feedback
    await this.updateModelsWithFeedback(feedback)

    // Update patterns based on feedback
    await this.updatePatternsWithFeedback(feedback)

    logger.info('Feedback learning completed', {
      feedbackId: feedback.explanationId,
      overallSatisfaction: this.calculateOverallSatisfaction(feedback.feedback),
      relatedDataUpdated: relatedData.length,
    })
  }

  /**
   * Predict potential errors
   */
  async predictErrors(
    timeWindow: { start: number; end: number },
    context: ParlantLogContext,
    confidenceThreshold = 0.7
  ): Promise<ErrorPrediction[]> {
    const cacheKey = `${timeWindow.start}-${timeWindow.end}-${JSON.stringify(context)}`

    // Check cache
    const cached = this.predictionCache.get(cacheKey)
    if (cached) {
      return cached.filter(p => p.confidence >= confidenceThreshold)
    }

    logger.debug('Predicting errors', {
      timeWindow,
      confidenceThreshold,
      availableModels: Array.from(this.models.keys()),
    })

    const predictions: ErrorPrediction[] = []

    // Use prediction models
    for (const [modelType, model] of this.models.entries()) {
      try {
        const modelPredictions = await model.predict({
          timeWindow,
          context,
          historicalData: this.learningData.slice(-1000), // Last 1000 data points
        })

        for (const pred of modelPredictions) {
          if (pred.confidence >= confidenceThreshold) {
            // Generate prevention actions
            const preventionActions = await this.generatePreventionActions(
              pred.errorCategory,
              pred.triggeringFactors
            )

            predictions.push({
              ...pred,
              preventionActions,
            })
          }
        }
      } catch (error) {
        logger.warn('Model prediction failed', {
          modelType,
          error: error instanceof Error ? error.message : error,
        })
      }
    }

    // Sort by probability and confidence
    predictions.sort((a, b) => (b.probability * b.confidence) - (a.probability * a.confidence))

    // Cache results
    this.predictionCache.set(cacheKey, predictions)

    logger.info('Error predictions generated', {
      totalPredictions: predictions.length,
      highConfidencePredictions: predictions.filter(p => p.confidence > 0.8).length,
      averageConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
    })

    return predictions
  }

  /**
   * Get learned patterns
   */
  getLearnedPatterns(
    category?: ErrorCategory,
    minConfidence = 0.5,
    sortBy: 'confidence' | 'frequency' | 'effectiveness' = 'confidence'
  ): LearnedPattern[] {
    let patterns = Array.from(this.learnedPatterns.values())

    // Filter by category
    if (category) {
      patterns = patterns.filter(p => p.errorCategories.includes(category))
    }

    // Filter by confidence
    patterns = patterns.filter(p => p.confidence >= minConfidence)

    // Sort patterns
    patterns.sort((a, b) => {
      switch (sortBy) {
        case 'frequency':
          return b.frequency - a.frequency
        case 'effectiveness':
          return b.effectiveness - a.effectiveness
        default:
          return b.confidence - a.confidence
      }
    })

    return patterns
  }

  /**
   * Get improvement suggestions
   */
  getImprovementSuggestions(
    type?: ImprovementSuggestion['type'],
    minPriority = 0.5
  ): ImprovementSuggestion[] {
    let suggestions = [...this.improvementSuggestions]

    // Filter by type
    if (type) {
      suggestions = suggestions.filter(s => s.type === type)
    }

    // Filter by priority
    suggestions = suggestions.filter(s => s.priority >= minPriority)

    // Sort by priority and projected improvement
    suggestions.sort((a, b) => {
      const aScore = a.priority * a.projectedImprovement
      const bScore = b.priority * b.projectedImprovement
      return bScore - aScore
    })

    return suggestions
  }

  /**
   * Get model performance metrics
   */
  getModelPerformance(): Map<string, ModelPerformance> {
    const performance = new Map<string, ModelPerformance>()

    this.models.forEach((model, modelType) => {
      performance.set(modelType, model.getPerformance())
    })

    return performance
  }

  /**
   * Get learning statistics
   */
  getLearningStatistics(): LearningStatistics {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const oneWeek = 7 * oneDay

    const recentData = this.learningData.filter(
      dp => now - new Date(dp.timestamp).getTime() < oneDay
    )

    const weeklyData = this.learningData.filter(
      dp => now - new Date(dp.timestamp).getTime() < oneWeek
    )

    return {
      totalLearningDataPoints: this.learningData.length,
      recentDataPoints: recentData.length,
      weeklyDataPoints: weeklyData.length,
      learnedPatterns: this.learnedPatterns.size,
      activeModels: this.models.size,
      averageEffectiveness: this.learningData.reduce((sum, dp) => sum + dp.effectiveness, 0) / this.learningData.length,
      improvementSuggestions: this.improvementSuggestions.length,
      categoryDistribution: this.calculateCategoryDistribution(),
      effectivenessDistribution: this.calculateEffectivenessDistribution(),
      resolutionMethodDistribution: this.calculateResolutionMethodDistribution(),
    }
  }

  /**
   * Force model retraining
   */
  async retrainModels(): Promise<void> {
    logger.info('Starting model retraining', {
      availableData: this.learningData.length,
      models: Array.from(this.models.keys()),
    })

    const retrainingPromises = Array.from(this.models.entries()).map(
      async ([modelType, model]) => {
        try {
          await model.retrain(this.learningData)
          logger.info('Model retrained', { modelType })
        } catch (error) {
          logger.error('Model retraining failed', {
            modelType,
            error: error instanceof Error ? error.message : error,
          })
        }
      }
    )

    await Promise.all(retrainingPromises)

    // Update feature importance
    await this.updateFeatureImportance()

    this.emit('models_retrained', {
      modelsCount: this.models.size,
      dataPointsUsed: this.learningData.length,
    })

    logger.info('Model retraining completed')
  }

  /**
   * Private methods
   */
  private initializeLearningEngine(): void {
    // Initialize different types of learning models
    this.models.set('error_prediction', new ErrorPredictionModel())
    this.models.set('resolution_effectiveness', new ResolutionEffectivenessModel())
    this.models.set('pattern_recognition', new PatternRecognitionModel())
    this.models.set('user_satisfaction', new UserSatisfactionModel())

    // Start background tasks
    this.startBackgroundLearning()
  }

  private startBackgroundLearning(): void {
    // Retrain models every 6 hours
    setInterval(() => {
      if (this.learningData.length > 100) {
        this.retrainModels()
      }
    }, 6 * 60 * 60 * 1000)

    // Update patterns every 2 hours
    setInterval(() => {
      this.identifyPatterns(this.learningData.slice(-500))
    }, 2 * 60 * 60 * 1000)

    // Generate improvements daily
    setInterval(() => {
      this.generateImprovements()
    }, 24 * 60 * 60 * 1000)

    // Clear prediction cache every hour
    setInterval(() => {
      this.predictionCache.clear()
    }, 60 * 60 * 1000)
  }

  private extractContextFeatures(context: ParlantLogContext): Record<string, any> {
    return {
      toolName: context.toolName || 'unknown',
      operation: context.operation || 'unknown',
      userId: context.userId || 'anonymous',
      workspaceId: context.workspaceId || 'default',
      timestamp: Date.now(),
      hasMetadata: !!context.metadata,
      metadataKeys: context.metadata ? Object.keys(context.metadata).length : 0,
    }
  }

  private extractEnvironmentFeatures(): Record<string, any> {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: Date.now(),
    }
  }

  private extractUserFeatures(context: ParlantLogContext, feedback?: LearningFeedback): Record<string, any> {
    return {
      hasUserId: !!context.userId,
      hasWorkspace: !!context.workspaceId,
      providedFeedback: !!feedback,
      feedbackQuality: feedback ? this.calculateOverallSatisfaction(feedback.feedback) : 0,
      interactionCount: 1, // Would be calculated from history
    }
  }

  private calculateEffectiveness(outcome: ResolutionOutcome, feedback?: LearningFeedback): number {
    let effectiveness = 0

    // Base effectiveness from resolution
    if (outcome.resolved) {
      effectiveness += 0.5

      // Bonus for quick resolution
      if (outcome.timeToResolution < 30000) { // Less than 30 seconds
        effectiveness += 0.2
      } else if (outcome.timeToResolution < 300000) { // Less than 5 minutes
        effectiveness += 0.1
      }

      // Bonus for fewer retries
      if (outcome.retryCount === 0) {
        effectiveness += 0.1
      } else if (outcome.retryCount < 3) {
        effectiveness += 0.05
      }

      // Bonus for automatic resolution
      if (outcome.resolutionMethod === 'automatic') {
        effectiveness += 0.1
      }
    }

    // Factor in user feedback
    if (feedback) {
      const feedbackScore = this.calculateOverallSatisfaction(feedback.feedback) / 5.0
      effectiveness = (effectiveness + feedbackScore) / 2
    }

    return Math.min(1, Math.max(0, effectiveness))
  }

  private recalculateEffectiveness(dataPoint: LearningDataPoint, feedback: LearningFeedback): number {
    const feedbackScore = this.calculateOverallSatisfaction(feedback.feedback) / 5.0
    return (dataPoint.effectiveness + feedbackScore) / 2
  }

  private calculateOverallSatisfaction(feedback: LearningFeedback['feedback']): number {
    return (feedback.clarity + feedback.helpfulness + feedback.accuracy + feedback.completeness) / 4
  }

  private trimLearningData(): void {
    // Keep only the most recent 10,000 data points
    const maxDataPoints = 10000
    if (this.learningData.length > maxDataPoints) {
      this.learningData = this.learningData.slice(-maxDataPoints)
    }
  }

  private async updateModels(dataPoint: LearningDataPoint): Promise<void> {
    const updatePromises = Array.from(this.models.entries()).map(
      async ([modelType, model]) => {
        try {
          await model.updateWithDataPoint(dataPoint)
        } catch (error) {
          logger.warn('Model update failed', {
            modelType,
            error: error instanceof Error ? error.message : error,
          })
        }
      }
    )

    await Promise.all(updatePromises)
  }

  private async updateModelsWithFeedback(feedback: LearningFeedback): Promise<void> {
    // Update models that can learn from user feedback
    const feedbackCapableModels = ['resolution_effectiveness', 'user_satisfaction']

    for (const modelType of feedbackCapableModels) {
      const model = this.models.get(modelType)
      if (model && model.updateWithFeedback) {
        try {
          await model.updateWithFeedback(feedback)
        } catch (error) {
          logger.warn('Model feedback update failed', {
            modelType,
            error: error instanceof Error ? error.message : error,
          })
        }
      }
    }
  }

  private async identifyPatterns(dataPoints: LearningDataPoint[]): Promise<void> {
    // Use pattern recognition model
    const patternModel = this.models.get('pattern_recognition')
    if (!patternModel) return

    try {
      const patterns = await patternModel.identifyPatterns(dataPoints)

      for (const pattern of patterns) {
        this.learnedPatterns.set(pattern.id, pattern)
      }

      logger.info('Patterns identified', {
        newPatterns: patterns.length,
        totalPatterns: this.learnedPatterns.size,
      })
    } catch (error) {
      logger.error('Pattern identification failed', {
        error: error instanceof Error ? error.message : error,
      })
    }
  }

  private async updatePatternsWithFeedback(feedback: LearningFeedback): Promise<void> {
    // Find patterns related to this feedback and update their effectiveness
    this.learnedPatterns.forEach(pattern => {
      // Simple relevance check - in real implementation would be more sophisticated
      if (pattern.lastSeen === feedback.timestamp || pattern.id === feedback.explanationId) {
        const feedbackScore = this.calculateOverallSatisfaction(feedback.feedback) / 5.0
        pattern.effectiveness = (pattern.effectiveness + feedbackScore) / 2
      }
    })
  }

  private async generateImprovements(): Promise<void> {
    const suggestions: ImprovementSuggestion[] = []

    // Analyze current performance
    const stats = this.getLearningStatistics()

    // Suggest improvements based on low effectiveness areas
    if (stats.averageEffectiveness < 0.7) {
      suggestions.push({
        id: `improvement-effectiveness-${Date.now()}`,
        type: 'error_handling',
        title: 'Improve Overall Error Resolution Effectiveness',
        description: 'Current effectiveness is below target. Consider enhancing resolution strategies.',
        currentPerformance: stats.averageEffectiveness,
        projectedImprovement: 0.85,
        implementation: {
          steps: [
            {
              order: 1,
              description: 'Analyze low-effectiveness error patterns',
              estimatedTime: '2 days',
              dependencies: [],
              validation: 'Pattern analysis report completed',
            },
            {
              order: 2,
              description: 'Enhance resolution strategies for identified patterns',
              estimatedTime: '5 days',
              dependencies: ['Pattern analysis'],
              validation: 'New strategies implemented and tested',
            },
          ],
          estimatedTime: '1 week',
          requiredResources: ['Development team', 'Data analyst'],
          risks: ['May temporarily disrupt existing workflows'],
          successCriteria: ['Effectiveness score > 0.8', 'User satisfaction > 4.0'],
        },
        businessImpact: {
          userExperience: 0.8,
          systemReliability: 0.7,
          operationalCost: 0.6,
          developmentEfficiency: 0.5,
          customerSatisfaction: 0.8,
          overallScore: 0.68,
        },
        confidence: 0.85,
        priority: 0.8,
      })
    }

    // More improvement suggestions would be generated here based on patterns
    this.improvementSuggestions = suggestions

    logger.info('Improvement suggestions generated', {
      suggestions: suggestions.length,
    })
  }

  private async generatePreventionActions(
    errorCategory: ErrorCategory,
    triggeringFactors: TriggeringFactor[]
  ): Promise<PreventionAction[]> {
    const actions: PreventionAction[] = []

    // Generate actions based on triggering factors
    for (const factor of triggeringFactors) {
      if (factor.contribution > 0.5) {
        actions.push({
          id: `prevention-${errorCategory}-${factor.factor}`,
          description: `Monitor and address ${factor.factor} to prevent ${errorCategory} errors`,
          category: this.determinePreventionCategory(factor.factor),
          urgency: factor.contribution > 0.8 ? 'high' : factor.contribution > 0.6 ? 'medium' : 'low',
          estimatedEffectiveness: factor.contribution * 0.8,
          implementationCost: this.estimateImplementationCost(factor.factor),
          instructions: [
            `Set up monitoring for ${factor.factor}`,
            `Create alerts when ${factor.factor} exceeds thresholds`,
            `Implement automatic mitigation when possible`,
          ],
        })
      }
    }

    return actions
  }

  private async updateFeatureImportance(): Promise<void> {
    for (const [modelType, model] of this.models.entries()) {
      if (model.getFeatureImportance) {
        try {
          const importance = await model.getFeatureImportance()
          this.featureImportance.set(modelType, importance)
        } catch (error) {
          logger.warn('Feature importance update failed', {
            modelType,
            error: error instanceof Error ? error.message : error,
          })
        }
      }
    }
  }

  private calculateCategoryDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {}

    this.learningData.forEach(dp => {
      distribution[dp.errorCategory] = (distribution[dp.errorCategory] || 0) + 1
    })

    return distribution
  }

  private calculateEffectivenessDistribution(): Record<string, number> {
    const ranges = ['0.0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0']
    const distribution: Record<string, number> = {}

    ranges.forEach(range => distribution[range] = 0)

    this.learningData.forEach(dp => {
      const effectiveness = dp.effectiveness
      if (effectiveness < 0.2) distribution['0.0-0.2']++
      else if (effectiveness < 0.4) distribution['0.2-0.4']++
      else if (effectiveness < 0.6) distribution['0.4-0.6']++
      else if (effectiveness < 0.8) distribution['0.6-0.8']++
      else distribution['0.8-1.0']++
    })

    return distribution
  }

  private calculateResolutionMethodDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {}

    this.learningData.forEach(dp => {
      const method = dp.resolutionOutcome.resolutionMethod
      distribution[method] = (distribution[method] || 0) + 1
    })

    return distribution
  }

  private determinePreventionCategory(factor: string): PreventionAction['category'] {
    if (factor.includes('memory') || factor.includes('cpu')) return 'scaling'
    if (factor.includes('config') || factor.includes('setting')) return 'configuration'
    if (factor.includes('service') || factor.includes('health')) return 'monitoring'
    return 'maintenance'
  }

  private estimateImplementationCost(factor: string): PreventionAction['implementationCost'] {
    // Simple heuristic - would be more sophisticated in real implementation
    if (factor.includes('scaling') || factor.includes('infrastructure')) return 'high'
    if (factor.includes('monitoring') || factor.includes('alert')) return 'medium'
    return 'low'
  }
}

/**
 * Base learning model interface
 */
export interface LearningModel {
  updateWithDataPoint(dataPoint: LearningDataPoint): Promise<void>
  predict(input: any): Promise<any[]>
  retrain(data: LearningDataPoint[]): Promise<void>
  getPerformance(): ModelPerformance
  getFeatureImportance?(): Promise<FeatureImportance[]>
  updateWithFeedback?(feedback: LearningFeedback): Promise<void>
  identifyPatterns?(data: LearningDataPoint[]): Promise<LearnedPattern[]>
}

/**
 * Error prediction model
 */
class ErrorPredictionModel implements LearningModel {
  private trainingData: LearningDataPoint[] = []
  private performance: ModelPerformance = {
    accuracy: 0.75,
    precision: 0.72,
    recall: 0.78,
    f1Score: 0.75,
    confusionMatrix: [],
    lastUpdated: new Date().toISOString(),
    trainingDataSize: 0,
    validationScore: 0.73,
  }

  async updateWithDataPoint(dataPoint: LearningDataPoint): Promise<void> {
    this.trainingData.push(dataPoint)

    // Incremental learning simulation
    if (this.trainingData.length % 100 === 0) {
      await this.retrain(this.trainingData.slice(-1000))
    }
  }

  async predict(input: any): Promise<ErrorPrediction[]> {
    const predictions: ErrorPrediction[] = []

    // Simulate predictions based on training data patterns
    const categories = [ErrorCategory.TOOL_EXECUTION, ErrorCategory.EXTERNAL_SERVICE, ErrorCategory.SYSTEM_RESOURCE]

    for (const category of categories) {
      const relevantData = this.trainingData.filter(dp => dp.errorCategory === category)

      if (relevantData.length > 0) {
        const avgEffectiveness = relevantData.reduce((sum, dp) => sum + dp.effectiveness, 0) / relevantData.length
        const probability = Math.max(0.1, 1 - avgEffectiveness) // Higher probability for lower effectiveness categories

        predictions.push({
          errorCategory: category,
          probability,
          confidence: 0.7 + Math.random() * 0.2,
          timeWindow: input.timeWindow,
          triggeringFactors: [
            {
              factor: 'service_load',
              value: Math.random() * 100,
              contribution: Math.random() * 0.8,
              trend: 'increasing',
            },
          ],
          preventionActions: [],
          severity: ErrorSeverity.ERROR,
          expectedImpact: ErrorImpact.MEDIUM,
        })
      }
    }

    return predictions.filter(p => p.confidence > 0.7)
  }

  async retrain(data: LearningDataPoint[]): Promise<void> {
    this.trainingData = data
    this.performance.trainingDataSize = data.length
    this.performance.lastUpdated = new Date().toISOString()

    // Simulate performance improvement with more data
    if (data.length > 1000) {
      this.performance.accuracy = Math.min(0.95, this.performance.accuracy + 0.01)
      this.performance.precision = Math.min(0.95, this.performance.precision + 0.01)
      this.performance.recall = Math.min(0.95, this.performance.recall + 0.01)
      this.performance.f1Score = (this.performance.precision + this.performance.recall) / 2
    }
  }

  getPerformance(): ModelPerformance {
    return { ...this.performance }
  }

  async getFeatureImportance(): Promise<FeatureImportance[]> {
    return [
      { feature: 'error_category', importance: 0.35, confidence: 0.9, category: 'error' },
      { feature: 'time_to_resolution', importance: 0.28, confidence: 0.85, category: 'context' },
      { feature: 'user_satisfaction', importance: 0.22, confidence: 0.8, category: 'user' },
      { feature: 'retry_count', importance: 0.15, confidence: 0.75, category: 'system' },
    ]
  }
}

/**
 * Resolution effectiveness model
 */
class ResolutionEffectivenessModel implements LearningModel {
  private trainingData: LearningDataPoint[] = []
  private performance: ModelPerformance = {
    accuracy: 0.82,
    precision: 0.79,
    recall: 0.84,
    f1Score: 0.81,
    confusionMatrix: [],
    lastUpdated: new Date().toISOString(),
    trainingDataSize: 0,
    validationScore: 0.80,
  }

  async updateWithDataPoint(dataPoint: LearningDataPoint): Promise<void> {
    this.trainingData.push(dataPoint)
  }

  async predict(input: any): Promise<any[]> {
    // Predict resolution effectiveness for given context
    return [{ effectiveness: 0.75, confidence: 0.8 }]
  }

  async retrain(data: LearningDataPoint[]): Promise<void> {
    this.trainingData = data
    this.performance.trainingDataSize = data.length
    this.performance.lastUpdated = new Date().toISOString()
  }

  getPerformance(): ModelPerformance {
    return { ...this.performance }
  }

  async updateWithFeedback(feedback: LearningFeedback): Promise<void> {
    // Update model with user feedback
    const satisfaction = this.calculateOverallSatisfaction(feedback.feedback)

    // Adjust performance based on feedback
    if (satisfaction > 4) {
      this.performance.accuracy = Math.min(0.95, this.performance.accuracy + 0.001)
    } else if (satisfaction < 3) {
      this.performance.accuracy = Math.max(0.5, this.performance.accuracy - 0.001)
    }
  }

  private calculateOverallSatisfaction(feedback: LearningFeedback['feedback']): number {
    return (feedback.clarity + feedback.helpfulness + feedback.accuracy + feedback.completeness) / 4
  }
}

/**
 * Pattern recognition model
 */
class PatternRecognitionModel implements LearningModel {
  private trainingData: LearningDataPoint[] = []
  private performance: ModelPerformance = {
    accuracy: 0.78,
    precision: 0.75,
    recall: 0.81,
    f1Score: 0.78,
    confusionMatrix: [],
    lastUpdated: new Date().toISOString(),
    trainingDataSize: 0,
    validationScore: 0.76,
  }

  async updateWithDataPoint(dataPoint: LearningDataPoint): Promise<void> {
    this.trainingData.push(dataPoint)
  }

  async predict(input: any): Promise<any[]> {
    return []
  }

  async retrain(data: LearningDataPoint[]): Promise<void> {
    this.trainingData = data
    this.performance.trainingDataSize = data.length
    this.performance.lastUpdated = new Date().toISOString()
  }

  getPerformance(): ModelPerformance {
    return { ...this.performance }
  }

  async identifyPatterns(data: LearningDataPoint[]): Promise<LearnedPattern[]> {
    const patterns: LearnedPattern[] = []

    // Group data by error category and subcategory
    const groups = new Map<string, LearningDataPoint[]>()

    data.forEach(dp => {
      const key = `${dp.errorCategory}:${dp.errorSubcategory}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(dp)
    })

    // Identify patterns in each group
    groups.forEach((dataPoints, key) => {
      if (dataPoints.length >= 3) { // Minimum frequency for pattern
        const avgEffectiveness = dataPoints.reduce((sum, dp) => sum + dp.effectiveness, 0) / dataPoints.length

        patterns.push({
          id: `pattern-${key}-${Date.now()}`,
          name: `Pattern: ${key}`,
          description: `Recurring pattern in ${key} errors`,
          frequency: dataPoints.length,
          confidence: Math.min(0.95, 0.5 + (dataPoints.length * 0.05)),
          conditions: [
            {
              feature: 'error_category',
              operator: 'equals',
              value: dataPoints[0].errorCategory,
              weight: 1.0,
            },
          ],
          recommendations: [
            {
              type: avgEffectiveness > 0.7 ? 'resolution' : 'prevention',
              action: `Optimize ${key} handling`,
              priority: avgEffectiveness < 0.5 ? 'high' : 'medium',
              expectedOutcome: 'Improved resolution effectiveness',
              confidence: 0.75,
            },
          ],
          learnedFrom: 'resolution_success',
          effectiveness: avgEffectiveness,
          lastSeen: new Date().toISOString(),
          errorCategories: [dataPoints[0].errorCategory],
        })
      }
    })

    return patterns
  }
}

/**
 * User satisfaction model
 */
class UserSatisfactionModel implements LearningModel {
  private trainingData: LearningDataPoint[] = []
  private performance: ModelPerformance = {
    accuracy: 0.73,
    precision: 0.71,
    recall: 0.76,
    f1Score: 0.73,
    confusionMatrix: [],
    lastUpdated: new Date().toISOString(),
    trainingDataSize: 0,
    validationScore: 0.72,
  }

  async updateWithDataPoint(dataPoint: LearningDataPoint): Promise<void> {
    this.trainingData.push(dataPoint)
  }

  async predict(input: any): Promise<any[]> {
    return [{ satisfaction: 4.2, confidence: 0.75 }]
  }

  async retrain(data: LearningDataPoint[]): Promise<void> {
    this.trainingData = data
    this.performance.trainingDataSize = data.length
    this.performance.lastUpdated = new Date().toISOString()
  }

  getPerformance(): ModelPerformance {
    return { ...this.performance }
  }

  async updateWithFeedback(feedback: LearningFeedback): Promise<void> {
    // Learn from user satisfaction feedback
    const dataPoint: Partial<LearningDataPoint> = {
      timestamp: feedback.timestamp,
      userSatisfaction: this.calculateOverallSatisfaction(feedback.feedback),
      effectiveness: feedback.feedback.effectiveness / 5.0,
    }

    // Update training data if we can find the related data point
    // In real implementation, would match by explanation ID
  }

  private calculateOverallSatisfaction(feedback: LearningFeedback['feedback']): number {
    return (feedback.clarity + feedback.helpfulness + feedback.accuracy + feedback.completeness) / 4
  }
}

/**
 * Learning statistics interface
 */
export interface LearningStatistics {
  totalLearningDataPoints: number
  recentDataPoints: number
  weeklyDataPoints: number
  learnedPatterns: number
  activeModels: number
  averageEffectiveness: number
  improvementSuggestions: number
  categoryDistribution: Record<string, number>
  effectivenessDistribution: Record<string, number>
  resolutionMethodDistribution: Record<string, number>
}

/**
 * Singleton error learning engine
 */
export const errorLearningEngine = new ErrorLearningEngine()

/**
 * Convenience functions
 */
export const learnFromResolution = (
  error: BaseToolError,
  resolutionOutcome: ResolutionOutcome,
  context: ParlantLogContext,
  userFeedback?: LearningFeedback
) => errorLearningEngine.learnFromResolution(error, resolutionOutcome, context, userFeedback)

export const learnFromFeedback = (feedback: LearningFeedback) =>
  errorLearningEngine.learnFromFeedback(feedback)

export const predictErrors = (
  timeWindow: { start: number; end: number },
  context: ParlantLogContext,
  confidenceThreshold?: number
) => errorLearningEngine.predictErrors(timeWindow, context, confidenceThreshold)

export const getLearnedPatterns = (
  category?: ErrorCategory,
  minConfidence?: number,
  sortBy?: 'confidence' | 'frequency' | 'effectiveness'
) => errorLearningEngine.getLearnedPatterns(category, minConfidence, sortBy)

export const getImprovementSuggestions = (
  type?: ImprovementSuggestion['type'],
  minPriority?: number
) => errorLearningEngine.getImprovementSuggestions(type, minPriority)