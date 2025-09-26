/**
 * @fileoverview Integration tests for complete Error Handling System
 * Tests the full workflow from error occurrence to analytics and learning
 *
 * @version 1.0.0
 * @author Intelligent Error Handling Agent
 * @created 2025-09-24
 */

import { EventEmitter } from 'events'
import {
  createErrorAnalyticsSystem,
  DEVELOPMENT_ANALYTICS_CONFIG,
  type ErrorAnalyticsSystem,
  type ErrorRecoveryOutcome,
  type UserErrorFeedback,
} from '../error-analytics-system'
import {
  type ErrorRecoveryContext,
  IntelligentErrorRecoveryEngine,
} from '../intelligent-error-recovery-engine'

/**
 * Mock implementations for testing the integration
 */
class MockErrorIntelligenceService extends EventEmitter {
  private learningData = new Map()

  async analyzeError(error: Error, context: any) {
    await this.simulateDelay(100) // Simulate processing time

    let category = 'unknown'
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'

    // Simple error classification based on error properties
    if (
      error instanceof Error
        ? error.message
        : String(error).includes('network') || error instanceof Error
          ? error.message
          : String(error).includes('timeout')
    ) {
      category = 'network'
      severity = 'high'
    } else if (
      error instanceof Error
        ? error.message
        : String(error).includes('validation') || error instanceof Error
          ? error.message
          : String(error).includes('invalid')
    ) {
      category = 'validation'
      severity = 'low'
    } else if (
      error instanceof Error
        ? error.message
        : String(error).includes('system') || error instanceof Error
          ? error.message
          : String(error).includes('memory')
    ) {
      category = 'system'
      severity = 'critical'
    }

    return {
      category,
      severity,
      confidence: 0.85,
      patterns: [`${category}_pattern`],
      suggestedActions: ['retry', 'check_inputs', 'escalate'],
    }
  }

  async generateExplanation(error: Error, context: any) {
    await this.simulateDelay(50)

    const errorType = error.constructor.name
    let userFriendlyMessage = `An error occurred: ${error instanceof Error ? error.message : String(error)}`
    let technicalDetails = `${errorType}: ${error instanceof Error ? error.message : String(error)}`

    if (error instanceof Error ? error.message : String(error).includes('network')) {
      userFriendlyMessage =
        'A network connection problem prevented this operation from completing. This is usually temporary.'
      technicalDetails = `Network error: ${error instanceof Error ? error.message : String(error)}. Stack: ${error.stack?.slice(0, 200)}`
    } else if (error instanceof Error ? error.message : String(error).includes('validation')) {
      userFriendlyMessage =
        "The information provided doesn't meet the required format. Please check your input and try again."
      technicalDetails = `Validation error: ${error instanceof Error ? error.message : String(error)}`
    }

    return {
      userFriendlyMessage,
      technicalDetails,
      possibleCauses: ['Network connectivity issues', 'Invalid input data', 'System overload'],
      nextSteps: [
        'Try again in a moment',
        'Check your input data',
        'Contact support if the problem persists',
      ],
    }
  }

  async getRecommendations(error: Error, context: any) {
    await this.simulateDelay(75)

    const recommendations = [
      {
        action: 'retry',
        confidence: 0.8,
        reasoning: 'Many errors are transient and resolve with retry',
      },
    ]

    if (error instanceof Error ? error.message : String(error).includes('network')) {
      recommendations.push(
        {
          action: 'check_connection',
          confidence: 0.9,
          reasoning: 'Network errors often indicate connectivity issues',
        },
        {
          action: 'use_alternative_endpoint',
          confidence: 0.7,
          reasoning: 'Alternative endpoints may be available',
        }
      )
    } else if (error instanceof Error ? error.message : String(error).includes('validation')) {
      recommendations.push(
        {
          action: 'correct_input',
          confidence: 0.95,
          reasoning: 'Validation errors require input correction',
        },
        {
          action: 'show_examples',
          confidence: 0.8,
          reasoning: 'Examples help users understand correct format',
        }
      )
    }

    return recommendations
  }

  async learnFromOutcome(planId: string, action: any, outcome: any) {
    await this.simulateDelay(25)

    const key = `${action.type}_${outcome.success}`
    const current = this.learningData.get(key) || { count: 0, totalTime: 0 }
    current.count++
    current.totalTime += outcome.actualResolutionTime || 0
    this.learningData.set(key, current)

    return { success: true, updatedConfidence: outcome.success ? 0.05 : -0.05 }
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

class MockContextualRecommendationEngine extends EventEmitter {
  private toolDatabase = [
    { name: 'backup_api_client', category: 'network', reliability: 0.9, performance: 0.8 },
    { name: 'offline_cache', category: 'network', reliability: 0.7, performance: 0.9 },
    { name: 'validation_helper', category: 'validation', reliability: 0.95, performance: 0.85 },
    { name: 'input_formatter', category: 'validation', reliability: 0.8, performance: 0.9 },
    { name: 'system_monitor', category: 'system', reliability: 0.85, performance: 0.7 },
  ]

  async getToolRecommendations(context: any, options: any = {}) {
    await this.simulateDelay(80)

    const { toolName, operation, parameters } = context
    const relevantTools = this.toolDatabase.filter(
      (tool) => !toolName?.includes(tool.name) // Don't recommend the same tool
    )

    const recommendations = relevantTools.slice(0, 3).map((tool) => ({
      toolName: tool.name,
      confidence: tool.reliability * 0.9, // Slight reduction for uncertainty
      reasoning: `${tool.name} has ${(tool.reliability * 100).toFixed(0)}% reliability for similar operations`,
      estimatedSuccess: tool.reliability,
      userSpecific: false,
      performance: tool.performance,
    }))

    return {
      recommendations,
      metadata: {
        totalAlternatives: relevantTools.length,
        processingTime: 80,
        cacheHit: false,
      },
    }
  }

  async getSimilarityScore(tool1: string, tool2: string) {
    // Simple similarity based on name matching
    const commonWords = tool1.split('_').filter((word) => tool2.split('_').includes(word))
    return commonWords.length / Math.max(tool1.split('_').length, tool2.split('_').length)
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

class MockNaturalLanguageFramework extends EventEmitter {
  async generateDescription(content: any, options: any = {}) {
    await this.simulateDelay(60)

    const userLevel = options.userLevel || 'intermediate'
    const context = options.context || {}

    let brief = 'An error occurred'
    let detailed = 'An error occurred that prevented the operation from completing successfully.'
    let expert = 'Technical error details and stack trace information.'

    if (typeof content === 'object' && content.error) {
      const error = content.error

      if (error instanceof Error ? error.message : String(error).includes('network')) {
        brief = 'Network connection failed'
        detailed =
          'A network connection error prevented data from being retrieved or sent. This is often temporary and may resolve quickly.'
        expert = `Network error: ${error instanceof Error ? error.message : String(error)}. Connection details: ${JSON.stringify(context, null, 2)}`
      } else if (error instanceof Error ? error.message : String(error).includes('validation')) {
        brief = 'Data format error'
        detailed =
          "The data provided doesn't match the expected format. Please verify your input and try again."
        expert = `Validation error: ${error instanceof Error ? error.message : String(error)}. Input validation failed on: ${JSON.stringify(content.parameters, null, 2)}`
      }
    }

    return {
      brief,
      detailed,
      expert,
      examples: [
        'Check your internet connection',
        'Verify input data format',
        'Try again in a moment',
      ],
      alternatives: [
        'Use offline mode if available',
        'Try an alternative method',
        'Contact support for assistance',
      ],
    }
  }

  async formatMessage(message: string, options: any = {}) {
    await this.simulateDelay(20)

    const formatted = options.includeTimestamp
      ? `[${new Date().toISOString()}] ${message}`
      : message

    return options.uppercase ? formatted.toUpperCase() : formatted
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

describe('Error Handling System Integration', () => {
  let recoveryEngine: IntelligentErrorRecoveryEngine
  let analyticsSystem: ErrorAnalyticsSystem
  let mockErrorIntelligence: MockErrorIntelligenceService
  let mockRecommendationEngine: MockContextualRecommendationEngine
  let mockNLFramework: MockNaturalLanguageFramework

  beforeEach(async () => {
    // Create mock service instances
    mockErrorIntelligence = new MockErrorIntelligenceService()
    mockRecommendationEngine = new MockContextualRecommendationEngine()
    mockNLFramework = new MockNaturalLanguageFramework()

    // Create recovery engine with mocked dependencies
    recoveryEngine = new IntelligentErrorRecoveryEngine({
      errorIntelligenceService: mockErrorIntelligence as any,
      recommendationEngine: mockRecommendationEngine as any,
      nlFramework: mockNLFramework as any,
      enableAnalytics: false, // Will connect manually
      retryConfiguration: {
        maxRetries: 3,
        baseDelay: 100, // Faster for tests
        maxDelay: 1000,
        backoffMultiplier: 2,
      },
    })

    // Create analytics system with development configuration
    analyticsSystem = createErrorAnalyticsSystem({
      ...DEVELOPMENT_ANALYTICS_CONFIG,
      aggregationIntervals: {
        realtime: 1, // 1 second for testing
        hourly: false,
        daily: false,
        weekly: false,
        monthly: false,
      },
    })
  })

  afterEach(async () => {
    await analyticsSystem.shutdown()
    recoveryEngine.removeAllListeners()
    jest.clearAllMocks()
  })

  describe('Complete Error Handling Workflow', () => {
    it('should handle network error end-to-end', async () => {
      // 1. Simulate a network error
      const networkError = new Error('Network timeout: Connection failed after 5000ms')
      ;(networkError as any).code = 'ETIMEDOUT'
      ;(networkError as any).name = 'NetworkError'

      const context: ErrorRecoveryContext = {
        toolName: 'api_client',
        operation: 'fetchUserData',
        parameters: { userId: '12345', endpoint: 'https://api.example.com/users' },
        timestamp: new Date(),
        sessionId: 'integration_session_network',
        userAgent: 'IntegrationTest/1.0',
        previousAttempts: 0,
        platform: 'web',
      }

      // 2. Record error in analytics
      const classification = await recoveryEngine.classifyError(networkError, context)
      const eventId = await analyticsSystem.recordErrorEvent(networkError, context, classification)

      expect(eventId).toBeDefined()
      expect(classification.category).toBe('network')

      // 3. Generate recovery plan
      const recoveryPlan = await recoveryEngine.generateRecoveryPlan(networkError, context)
      await analyticsSystem.recordRecoveryPlan(eventId, recoveryPlan)

      expect(recoveryPlan).toBeDefined()
      expect(recoveryPlan.recoveryActions.length).toBeGreaterThan(0)
      expect(recoveryPlan.alternativeTools.length).toBeGreaterThan(0)
      expect(recoveryPlan.userFriendlyExplanation).toContain('network')

      // 4. Simulate user selecting a recovery action
      const selectedAction = recoveryPlan.recoveryActions[0]
      await analyticsSystem.recordSelectedAction(eventId, selectedAction)

      // 5. Execute recovery action (simulate execution)
      const executionResult = await recoveryEngine.executeRecoveryAction(selectedAction, context)

      // 6. Record recovery outcome
      const outcome: ErrorRecoveryOutcome = {
        success: executionResult.success,
        resolutionTimeMs: executionResult.executionTime,
        attemptCount: 1,
        resolutionMethod: 'automatic',
        resolutionNotes: 'Retry successful after network issue resolved',
        alternativeToolUsed: false,
        successfulTool: 'api_client',
      }

      await analyticsSystem.recordRecoveryOutcome(eventId, outcome)

      // 7. Collect user feedback
      const userFeedback: UserErrorFeedback = {
        satisfactionRating: 4,
        messageHelpfulness: 4,
        recoveryEffectiveness: 4,
        resolutionEase: 4,
        comments: 'The error was handled well and resolved quickly',
        wouldRecommend: true,
        feedbackTimestamp: new Date(),
      }

      await analyticsSystem.recordUserFeedback(eventId, userFeedback)

      // 8. Learn from the outcome
      const learningResult = await recoveryEngine.learnFromOutcome(
        recoveryPlan.id,
        selectedAction,
        {
          success: outcome.success,
          actualResolutionTime: outcome.resolutionTimeMs,
          userSatisfaction: userFeedback.satisfactionRating,
          effectivenessRating: userFeedback.recoveryEffectiveness,
          additionalFeedback: userFeedback.comments,
        }
      )

      expect(learningResult.success).toBe(true)
      expect(learningResult.learningApplied).toBe(true)

      // 9. Verify analytics data
      const frequencyAnalytics = await analyticsSystem.getErrorFrequencyAnalytics(1)
      expect(frequencyAnalytics.totalErrors).toBe(1)

      const effectivenessAnalytics = await analyticsSystem.getRecoveryEffectivenessAnalytics(1)
      expect(effectivenessAnalytics.overallSuccessRate).toBeGreaterThan(0)

      const uxAnalytics = await analyticsSystem.getUserExperienceAnalytics(1)
      expect(uxAnalytics.averageSatisfaction).toBe(4)
    }, 10000) // 10 second timeout for integration test

    it('should handle validation error with user correction workflow', async () => {
      // 1. Simulate a validation error
      const validationError = new Error('Validation failed: Invalid email format provided')
      ;(validationError as any).name = 'ValidationError'

      const context: ErrorRecoveryContext = {
        toolName: 'user_validator',
        operation: 'validateUserRegistration',
        parameters: {
          email: 'invalid-email-format',
          username: 'testuser',
          password: 'securepass123',
        },
        timestamp: new Date(),
        sessionId: 'integration_session_validation',
        userAgent: 'IntegrationTest/1.0',
        previousAttempts: 1,
        platform: 'web',
      }

      // 2. Full workflow execution
      const classification = await recoveryEngine.classifyError(validationError, context)
      const eventId = await analyticsSystem.recordErrorEvent(
        validationError,
        context,
        classification
      )

      expect(classification.category).toBe('validation')
      expect(classification.requiresUserAction).toBe(true)

      const recoveryPlan = await recoveryEngine.generateRecoveryPlan(validationError, context)
      await analyticsSystem.recordRecoveryPlan(eventId, recoveryPlan)

      // Validation errors should have specific user-action focused recovery steps
      const userActionSteps = recoveryPlan.recoveryActions.filter(
        (action) => action.type === 'user_action' || action.type === 'input_correction'
      )
      expect(userActionSteps.length).toBeGreaterThan(0)

      // 3. Simulate user correcting input
      const correctionAction =
        recoveryPlan.recoveryActions.find(
          (action) =>
            action.description.toLowerCase().includes('correct') ||
            action.description.toLowerCase().includes('input')
        ) || recoveryPlan.recoveryActions[0]

      await analyticsSystem.recordSelectedAction(eventId, correctionAction)

      const outcome: ErrorRecoveryOutcome = {
        success: true,
        resolutionTimeMs: 30000, // User took 30 seconds to correct
        attemptCount: 2,
        resolutionMethod: 'user_guided',
        resolutionNotes: 'User corrected email format',
        alternativeToolUsed: false,
      }

      await analyticsSystem.recordRecoveryOutcome(eventId, outcome)

      // 4. User feedback for validation error handling
      const feedback: UserErrorFeedback = {
        satisfactionRating: 5,
        messageHelpfulness: 5,
        recoveryEffectiveness: 5,
        resolutionEase: 4,
        comments: 'The error message was very clear about what needed to be fixed',
        wouldRecommend: true,
        feedbackTimestamp: new Date(),
      }

      await analyticsSystem.recordUserFeedback(eventId, feedback)

      // 5. Verify learning occurred
      const learningResult = await recoveryEngine.learnFromOutcome(
        recoveryPlan.id,
        correctionAction,
        {
          success: true,
          actualResolutionTime: 30000,
          userSatisfaction: 5,
          effectivenessRating: 5,
          additionalFeedback: feedback.comments,
        }
      )

      expect(learningResult.success).toBe(true)

      // 6. Check analytics reflect the validation error characteristics
      const analytics = await analyticsSystem.getRecoveryEffectivenessAnalytics(1)
      expect(analytics.resolutionTimeByType.ValidationError).toBe(30000)
    }, 10000)

    it('should handle system error with escalation workflow', async () => {
      // 1. Critical system error
      const systemError = new Error(
        'System error: Out of memory - Cannot allocate additional heap space'
      )
      ;(systemError as any).name = 'SystemError'
      ;(systemError as any).code = 'ERR_MEMORY_ALLOCATION_FAILED'

      const context: ErrorRecoveryContext = {
        toolName: 'data_processor',
        operation: 'processLargeDataset',
        parameters: {
          dataSize: 1000000000, // 1GB dataset
          processingMode: 'in_memory',
        },
        timestamp: new Date(),
        sessionId: 'integration_session_system',
        userAgent: 'IntegrationTest/1.0',
        previousAttempts: 2,
        platform: 'server',
      }

      // 2. Process critical error
      const classification = await recoveryEngine.classifyError(systemError, context)
      const eventId = await analyticsSystem.recordErrorEvent(systemError, context, classification)

      expect(classification.category).toBe('system')
      expect(classification.severity).toBe('critical')
      expect(classification.requiresEscalation).toBe(true)

      const recoveryPlan = await recoveryEngine.generateRecoveryPlan(systemError, context)
      await analyticsSystem.recordRecoveryPlan(eventId, recoveryPlan)

      // System errors should suggest escalation or alternative approaches
      const escalationActions = recoveryPlan.recoveryActions.filter(
        (action) => action.type === 'escalation' || action.type === 'manual_intervention'
      )
      expect(escalationActions.length).toBeGreaterThan(0)

      // Alternative tools should be available for processing
      expect(recoveryPlan.alternativeTools.length).toBeGreaterThan(0)

      // 3. Simulate escalation to support
      const escalationAction = escalationActions[0]
      await analyticsSystem.recordSelectedAction(eventId, escalationAction)

      const outcome: ErrorRecoveryOutcome = {
        success: false, // System errors often require manual intervention
        resolutionTimeMs: 1800000, // 30 minutes to resolve
        attemptCount: 3,
        resolutionMethod: 'escalation',
        resolutionNotes: 'Escalated to system administrator - memory allocation increased',
        alternativeToolUsed: true,
        successfulTool: 'streaming_processor', // Used streaming instead of in-memory
      }

      await analyticsSystem.recordRecoveryOutcome(eventId, outcome)

      // 4. System error feedback (typically lower satisfaction due to disruption)
      const feedback: UserErrorFeedback = {
        satisfactionRating: 2,
        messageHelpfulness: 3,
        recoveryEffectiveness: 2,
        resolutionEase: 1,
        comments: 'System error caused significant delay and required manual intervention',
        wouldRecommend: false,
        feedbackTimestamp: new Date(),
      }

      await analyticsSystem.recordUserFeedback(eventId, feedback)

      // 5. This should trigger a satisfaction alert
      await new Promise((resolve) => setTimeout(resolve, 100)) // Wait for alert processing

      const activeAlerts = analyticsSystem.getActiveAlerts()
      const satisfactionAlert = activeAlerts.find((alert) => alert.type === 'satisfaction_drop')
      expect(satisfactionAlert).toBeDefined()

      // 6. Verify analytics capture the severity
      const uxAnalytics = await analyticsSystem.getUserExperienceAnalytics(1)
      expect(uxAnalytics.averageSatisfaction).toBe(2)
    }, 15000)
  })

  describe('Multi-Error Scenarios', () => {
    it('should handle multiple concurrent errors', async () => {
      const errors = [
        { error: new Error('Network timeout A'), type: 'NetworkError' },
        { error: new Error('Validation failed B'), type: 'ValidationError' },
        { error: new Error('Network timeout C'), type: 'NetworkError' },
        { error: new Error('System overload D'), type: 'SystemError' },
      ]

      const promises = errors.map(async (errorData, index) => {
        ;(errorData.error as any).name = errorData.type

        const context: ErrorRecoveryContext = {
          toolName: `concurrent_tool_${index}`,
          operation: `concurrent_operation_${index}`,
          parameters: { index },
          timestamp: new Date(),
          sessionId: `concurrent_session_${index}`,
          userAgent: 'IntegrationTest/1.0',
          previousAttempts: 0,
          platform: 'web',
        }

        const classification = await recoveryEngine.classifyError(errorData.error, context)
        const eventId = await analyticsSystem.recordErrorEvent(
          errorData.error,
          context,
          classification
        )
        const recoveryPlan = await recoveryEngine.generateRecoveryPlan(errorData.error, context)
        await analyticsSystem.recordRecoveryPlan(eventId, recoveryPlan)

        return { eventId, recoveryPlan, classification }
      })

      const results = await Promise.all(promises)

      expect(results).toHaveLength(4)
      results.forEach((result) => {
        expect(result.eventId).toBeDefined()
        expect(result.recoveryPlan).toBeDefined()
        expect(result.classification).toBeDefined()
      })

      // Verify analytics aggregate correctly
      const frequencyAnalytics = await analyticsSystem.getErrorFrequencyAnalytics(1)
      expect(frequencyAnalytics.totalErrors).toBe(4)
      expect(frequencyAnalytics.topErrorTypes.length).toBeGreaterThan(0)

      // Network errors should be most common
      const networkErrorStats = frequencyAnalytics.topErrorTypes.find(
        (type) => type.type === 'NetworkError'
      )
      expect(networkErrorStats).toBeDefined()
      expect(networkErrorStats?.count).toBe(2)
    }, 15000)

    it('should track error patterns and trends', async () => {
      // Generate a series of similar errors to establish a pattern
      const errorPattern = Array.from({ length: 10 }, (_, i) => ({
        error: new Error(`API rate limit exceeded - Request ${i + 1}`),
        timestamp: new Date(Date.now() - (10 - i) * 60000), // Spread over 10 minutes
      }))

      for (const errorData of errorPattern) {
        ;(errorData.error as any).name = 'RateLimitError'

        const context: ErrorRecoveryContext = {
          toolName: 'rate_limited_api',
          operation: 'api_call',
          parameters: { apiKey: 'test_key', endpoint: '/api/data' },
          timestamp: errorData.timestamp,
          sessionId: 'pattern_session',
          userAgent: 'IntegrationTest/1.0',
          previousAttempts: 0,
          platform: 'server',
        }

        const classification = await recoveryEngine.classifyError(errorData.error, context)
        await analyticsSystem.recordErrorEvent(errorData.error, context, classification)
      }

      // Check if pattern is detected in analytics
      const frequencyAnalytics = await analyticsSystem.getErrorFrequencyAnalytics(1) // Last hour
      expect(frequencyAnalytics.totalErrors).toBe(10)
      expect(frequencyAnalytics.errorsPerDay).toBe(240) // 10 errors in 10 minutes = 144 per day

      // Trends should show increasing pattern
      expect(frequencyAnalytics.trends.increasing).toContain('RateLimitError')
    }, 10000)
  })

  describe('Learning and Adaptation', () => {
    it('should improve recommendations based on success patterns', async () => {
      // Create multiple similar errors with different outcomes
      const testScenarios = [
        { action: 'retry', success: true, time: 2000 },
        { action: 'retry', success: true, time: 1500 },
        { action: 'retry', success: false, time: 5000 },
        { action: 'alternative_tool', success: true, time: 3000 },
        { action: 'alternative_tool', success: true, time: 2800 },
      ]

      const learningPromises = testScenarios.map(async (scenario, index) => {
        const error = new Error(`Learning test error ${index}`)
        const context: ErrorRecoveryContext = {
          toolName: 'learning_tool',
          operation: 'learning_test',
          parameters: { scenario: index },
          timestamp: new Date(),
          sessionId: `learning_session_${index}`,
          userAgent: 'IntegrationTest/1.0',
          previousAttempts: 0,
          platform: 'web',
        }

        const classification = await recoveryEngine.classifyError(error, context)
        const eventId = await analyticsSystem.recordErrorEvent(error, context, classification)
        const recoveryPlan = await recoveryEngine.generateRecoveryPlan(error, context)

        // Find or create action matching scenario
        const mockAction = {
          id: `action_${index}`,
          type: scenario.action as any,
          description: `Test ${scenario.action}`,
          instructions: [],
          estimatedTime: scenario.time,
          successProbability: 0.8,
          requirements: [],
          risks: [],
          parameters: {},
        }

        await analyticsSystem.recordSelectedAction(eventId, mockAction)

        const outcome: ErrorRecoveryOutcome = {
          success: scenario.success,
          resolutionTimeMs: scenario.time,
          attemptCount: 1,
          resolutionMethod: 'automatic',
          alternativeToolUsed: scenario.action === 'alternative_tool',
        }

        await analyticsSystem.recordRecoveryOutcome(eventId, outcome)

        return recoveryEngine.learnFromOutcome(recoveryPlan.id, mockAction, {
          success: scenario.success,
          actualResolutionTime: scenario.time,
          userSatisfaction: scenario.success ? 4 : 2,
          effectivenessRating: scenario.success ? 4 : 2,
        })
      })

      const learningResults = await Promise.all(learningPromises)

      expect(learningResults).toHaveLength(5)
      learningResults.forEach((result) => {
        expect(result.success).toBe(true)
        expect(result.learningApplied).toBe(true)
      })

      // Verify learning is reflected in analytics
      const effectivenessAnalytics = await analyticsSystem.getRecoveryEffectivenessAnalytics(1)
      expect(effectivenessAnalytics.topRecoveryActions.length).toBeGreaterThan(0)

      // Alternative tool should have higher success rate than retry
      const retryAction = effectivenessAnalytics.topRecoveryActions.find(
        (action) => action.action === 'retry'
      )
      const altToolAction = effectivenessAnalytics.topRecoveryActions.find(
        (action) => action.action === 'alternative_tool'
      )

      if (retryAction && altToolAction) {
        expect(altToolAction.successRate).toBeGreaterThan(retryAction.successRate)
      }
    }, 15000)
  })

  describe('Performance and Scalability', () => {
    it('should maintain performance under high error volume', async () => {
      const startTime = Date.now()
      const errorCount = 100

      // Generate high volume of errors
      const highVolumePromises = Array.from({ length: errorCount }, async (_, i) => {
        const error = new Error(`High volume error ${i}`)
        const context: ErrorRecoveryContext = {
          toolName: `volume_tool_${i % 10}`, // 10 different tools
          operation: 'volume_test',
          parameters: { index: i },
          timestamp: new Date(),
          sessionId: `volume_session_${Math.floor(i / 10)}`,
          userAgent: 'IntegrationTest/1.0',
          previousAttempts: i % 3,
          platform: 'web',
        }

        const classification = await recoveryEngine.classifyError(error, context)
        const eventId = await analyticsSystem.recordErrorEvent(error, context, classification)

        // Only generate recovery plans for every 10th error to simulate realistic load
        if (i % 10 === 0) {
          const recoveryPlan = await recoveryEngine.generateRecoveryPlan(error, context)
          await analyticsSystem.recordRecoveryPlan(eventId, recoveryPlan)
        }

        return eventId
      })

      const results = await Promise.all(highVolumePromises)
      const totalTime = Date.now() - startTime

      expect(results).toHaveLength(errorCount)
      expect(totalTime).toBeLessThan(30000) // Should complete within 30 seconds

      // Verify system status remains healthy
      const systemStatus = analyticsSystem.getSystemStatus()
      expect(systemStatus.status).toMatch(/^(healthy|warning)$/) // Should not be critical
      expect(systemStatus.eventCount).toBe(errorCount)

      // Analytics should still be accurate
      const frequencyAnalytics = await analyticsSystem.getErrorFrequencyAnalytics(1)
      expect(frequencyAnalytics.totalErrors).toBe(errorCount)

      console.log(
        `Processed ${errorCount} errors in ${totalTime}ms (${(totalTime / errorCount).toFixed(2)}ms per error)`
      )
    }, 45000)

    it('should handle memory efficiently with large error datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Create large error events with substantial data
      const largeDataPromises = Array.from({ length: 50 }, async (_, i) => {
        const error = new Error(`Large data error ${i}`)
        const largeContext: ErrorRecoveryContext = {
          toolName: 'memory_test_tool',
          operation: 'memory_test',
          parameters: {
            largeData: 'x'.repeat(10000), // 10KB of data
            complexObject: Array.from({ length: 1000 }, (_, j) => ({ id: j, data: `item_${j}` })),
            index: i,
          },
          timestamp: new Date(),
          sessionId: `memory_session_${i}`,
          userAgent: 'IntegrationTest/1.0',
          previousAttempts: 0,
          platform: 'web',
        }

        const classification = await recoveryEngine.classifyError(error, largeContext)
        const eventId = await analyticsSystem.recordErrorEvent(error, largeContext, classification)

        return eventId
      })

      const results = await Promise.all(largeDataPromises)
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      expect(results).toHaveLength(50)

      // Memory increase should be reasonable (less than 100MB for 50 * 10KB events)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // 100MB limit

      console.log(
        `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB for 50 large events`
      )

      // System should still be responsive
      const quickError = new Error('Quick response test')
      const quickContext: ErrorRecoveryContext = {
        toolName: 'quick_tool',
        operation: 'response_test',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'quick_session',
        userAgent: 'IntegrationTest/1.0',
        previousAttempts: 0,
        platform: 'web',
      }

      const quickStart = Date.now()
      const quickClassification = await recoveryEngine.classifyError(quickError, quickContext)
      const quickTime = Date.now() - quickStart

      expect(quickTime).toBeLessThan(1000) // Should respond within 1 second
      expect(quickClassification).toBeDefined()
    }, 30000)
  })

  describe('Error Boundary and Resilience', () => {
    it('should handle service failures gracefully', async () => {
      // Mock service failure
      jest
        .spyOn(mockErrorIntelligence, 'analyzeError')
        .mockRejectedValueOnce(new Error('Error Intelligence Service temporarily unavailable'))

      const error = new Error('Test error during service failure')
      const context: ErrorRecoveryContext = {
        toolName: 'resilience_tool',
        operation: 'service_failure_test',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'resilience_session',
        userAgent: 'IntegrationTest/1.0',
        previousAttempts: 0,
        platform: 'web',
      }

      // System should still provide a recovery plan despite service failure
      const recoveryPlan = await recoveryEngine.generateRecoveryPlan(error, context)

      expect(recoveryPlan).toBeDefined()
      expect(recoveryPlan.classification.category).toBe('unknown') // Fallback classification
      expect(recoveryPlan.recoveryActions.length).toBeGreaterThan(0) // Should have fallback actions
      expect(recoveryPlan.userFriendlyExplanation).toBeDefined()

      // Analytics should still work
      const eventId = await analyticsSystem.recordErrorEvent(
        error,
        context,
        recoveryPlan.classification
      )
      expect(eventId).toBeDefined()
    })

    it('should maintain data integrity during partial system failures', async () => {
      // Create error events
      const errors = Array.from({ length: 10 }, (_, i) => new Error(`Integrity test error ${i}`))

      const promises = errors.map(async (error, i) => {
        const context: ErrorRecoveryContext = {
          toolName: `integrity_tool_${i}`,
          operation: 'integrity_test',
          parameters: { index: i },
          timestamp: new Date(),
          sessionId: `integrity_session_${i}`,
          userAgent: 'IntegrationTest/1.0',
          previousAttempts: 0,
          platform: 'web',
        }

        const classification = await recoveryEngine.classifyError(error, context)
        const eventId = await analyticsSystem.recordErrorEvent(error, context, classification)

        // Simulate some failures in the middle
        if (i === 5) {
          throw new Error('Simulated processing failure')
        }

        return { eventId, classification }
      })

      // Some promises will fail, but others should succeed
      const results = await Promise.allSettled(promises)

      const successful = results.filter((result) => result.status === 'fulfilled')
      const failed = results.filter((result) => result.status === 'rejected')

      expect(successful.length).toBe(9) // All except index 5
      expect(failed.length).toBe(1) // Only index 5

      // Analytics should only reflect successful events
      const frequencyAnalytics = await analyticsSystem.getErrorFrequencyAnalytics(1)
      expect(frequencyAnalytics.totalErrors).toBe(9)
    })
  })
})
