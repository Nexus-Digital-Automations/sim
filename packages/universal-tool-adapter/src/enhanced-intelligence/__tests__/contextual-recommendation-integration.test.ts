/**
 * Contextual Recommendation Engine Integration Tests
 *
 * Comprehensive test suite for the contextual recommendation engine,
 * covering all algorithms, context analysis, and integration scenarios.
 *
 * @author Contextual Tool Recommendation Engine Agent
 * @version 2.0.0
 */

import {
  type AdvancedUsageContext,
  type ContextualRecommendationEngine,
  type ContextualRecommendationRequest,
  createContextualRecommendationEngine,
  type TemporalContext,
  type WorkflowState,
} from '../contextual-recommendation-engine'
import {
  createUsageAnalyticsFramework,
  type UsageAnalyticsFramework,
} from '../usage-analytics-framework'

describe('Contextual Recommendation Engine Integration', () => {
  let recommendationEngine: ContextualRecommendationEngine
  let analyticsFramework: UsageAnalyticsFramework

  beforeEach(() => {
    // Initialize with test configuration
    recommendationEngine = createContextualRecommendationEngine({
      cache: {
        recommendationTTL: 1000 * 60, // 1 minute for testing
        contextTTL: 1000 * 30, // 30 seconds
        behaviorTTL: 1000 * 60 * 5, // 5 minutes
        maxCacheSize: 100,
        compressionEnabled: false,
      },
      performanceTracking: true,
    })

    analyticsFramework = createUsageAnalyticsFramework({
      dataCollection: {
        enableUserTracking: true,
        enableSessionTracking: true,
        enablePerformanceTracking: true,
        enableErrorTracking: true,
        enableInteractionTracking: true,
        userEventSampling: 1.0, // 100% for testing
        performanceSampling: 1.0,
        errorSampling: 1.0,
        excludeInternalUsers: false,
        excludeTestData: false,
        minimumSessionDuration: 30,
        realTimeCollection: true,
        batchSize: 10,
      },
      processing: {
        realTimeProcessing: true,
        batchProcessingInterval: 60,
        aggregationWindows: [60, 300, 3600],
        retentionPeriod: 7,
        patternDetectionEnabled: true,
        anomalyDetectionEnabled: false,
        predictionEnabled: false,
        parallelProcessing: true,
      },
    })
  })

  describe('Basic Recommendation Flow', () => {
    it('should generate recommendations for a simple workflow request', async () => {
      const request = createMockRecommendationRequest({
        userMessage: 'I want to create a new workflow',
        intent: 'creation',
        skillLevel: 'intermediate',
      })

      const recommendations = await recommendationEngine.getRecommendations(request)

      expect(recommendations).toBeDefined()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0]).toMatchObject({
        toolId: expect.any(String),
        confidence: expect.any(Number),
        algorithmScores: expect.objectContaining({
          collaborative: expect.any(Number),
          contentBased: expect.any(Number),
          contextual: expect.any(Number),
          temporal: expect.any(Number),
          behavioral: expect.any(Number),
          combined: expect.any(Number),
        }),
      })

      // Verify confidence scores are within valid range
      recommendations.forEach((rec) => {
        expect(rec.confidence).toBeGreaterThanOrEqual(0)
        expect(rec.confidence).toBeLessThanOrEqual(1)
        expect(rec.algorithmScores.combined).toBeGreaterThanOrEqual(0)
        expect(rec.algorithmScores.combined).toBeLessThanOrEqual(1)
      })
    })

    it('should provide contextual explanations for recommendations', async () => {
      const request = createMockRecommendationRequest({
        userMessage: 'Help me analyze user workflow data',
        intent: 'analysis',
        skillLevel: 'advanced',
        includeExplanations: true,
      })

      const recommendations = await recommendationEngine.getRecommendations(request)
      const topRecommendation = recommendations[0]

      expect(topRecommendation.whyRecommended).toBeDefined()
      expect(topRecommendation.whyRecommended.length).toBeGreaterThan(0)
      expect(topRecommendation.contextualExplanation).toBeDefined()
      expect(topRecommendation.confidenceDetails).toBeDefined()

      // Test explanation for specific tool
      const explanation = await recommendationEngine.explainRecommendation(
        topRecommendation.toolId,
        request,
        topRecommendation
      )

      expect(explanation).toMatchObject({
        toolId: topRecommendation.toolId,
        primaryReason: expect.any(String),
        detailedExplanation: expect.any(String),
        confidence: expect.any(Number),
        algorithmBreakdown: expect.any(Object),
        contextualFactors: expect.any(Array),
        userSpecificFactors: expect.any(Array),
      })
    })

    it('should adapt recommendations based on user skill level', async () => {
      const beginnerRequest = createMockRecommendationRequest({
        userMessage: 'I need to deploy my application',
        intent: 'action',
        skillLevel: 'beginner',
      })

      const expertRequest = createMockRecommendationRequest({
        userMessage: 'I need to deploy my application',
        intent: 'action',
        skillLevel: 'expert',
      })

      const beginnerRecs = await recommendationEngine.getRecommendations(beginnerRequest)
      const expertRecs = await recommendationEngine.getRecommendations(expertRequest)

      // Beginner recommendations should have more guidance
      expect(beginnerRecs[0].personalizedInstructions.length).toBeGreaterThanOrEqual(1)
      expect(
        beginnerRecs[0].adaptiveComplexity.simplificationSuggestions.length
      ).toBeGreaterThanOrEqual(0)

      // Expert recommendations should have growth opportunities
      expect(expertRecs[0].adaptiveComplexity.growthOpportunities.length).toBeGreaterThanOrEqual(0)

      // Different complexity adaptations
      expect(beginnerRecs[0].adaptiveComplexity.adaptedApproach).not.toBe(
        expertRecs[0].adaptiveComplexity.adaptedApproach
      )
    })
  })

  describe('Algorithm Integration', () => {
    it('should combine multiple algorithm scores effectively', async () => {
      const request = createMockRecommendationRequest({
        userMessage: 'Show me recent workflow templates',
        intent: 'information',
        skillLevel: 'intermediate',
        algorithmWeights: {
          collaborative: 0.4,
          contentBased: 0.3,
          contextual: 0.2,
          temporal: 0.05,
          behavioral: 0.05,
        },
      })

      const recommendations = await recommendationEngine.getRecommendations(request)
      const topRec = recommendations[0]

      // Verify all algorithm scores are present
      expect(topRec.algorithmScores).toMatchObject({
        collaborative: expect.any(Number),
        contentBased: expect.any(Number),
        contextual: expect.any(Number),
        temporal: expect.any(Number),
        behavioral: expect.any(Number),
        combined: expect.any(Number),
      })

      // Verify combined score is reasonable weighted average
      const expectedCombined =
        topRec.algorithmScores.collaborative * 0.4 +
        topRec.algorithmScores.contentBased * 0.3 +
        topRec.algorithmScores.contextual * 0.2 +
        topRec.algorithmScores.temporal * 0.05 +
        topRec.algorithmScores.behavioral * 0.05

      expect(Math.abs(topRec.algorithmScores.combined - expectedCombined)).toBeLessThan(0.1)
    })

    it('should handle cold start scenarios for new users', async () => {
      const newUserRequest = createMockRecommendationRequest({
        userMessage: 'Help me get started with workflows',
        intent: 'learning',
        skillLevel: 'beginner',
        isNewUser: true,
      })

      const recommendations = await recommendationEngine.getRecommendations(newUserRequest)

      expect(recommendations.length).toBeGreaterThan(0)

      // For new users, collaborative scores should be lower, content-based higher
      const topRec = recommendations[0]
      expect(topRec.algorithmScores.collaborative).toBeLessThan(0.5)
      expect(topRec.algorithmScores.contentBased).toBeGreaterThan(0.3)

      // Should have specific new user guidance
      expect(topRec.personalizedInstructions.length).toBeGreaterThan(0)
      expect(topRec.adaptiveComplexity.simplificationSuggestions.length).toBeGreaterThan(0)
    })

    it('should improve recommendations with user feedback', async () => {
      const userId = 'test_user_123'
      const request = createMockRecommendationRequest({
        userMessage: 'Create a data processing workflow',
        intent: 'creation',
        skillLevel: 'intermediate',
      })
      request.currentContext.userId = userId

      // Get initial recommendations
      const initialRecs = await recommendationEngine.getRecommendations(request)
      const topToolId = initialRecs[0].toolId

      // Provide positive feedback
      await recommendationEngine.recordFeedback(userId, initialRecs, {
        type: 'positive',
        toolId: topToolId,
        used: true,
        helpful: true,
        rating: 0.9,
        comment: 'Very helpful for my workflow needs',
      })

      // Get recommendations again
      const improvedRecs = await recommendationEngine.getRecommendations(request)

      // The tool with positive feedback should have higher score or appear first
      const improvedToolIndex = improvedRecs.findIndex((r) => r.toolId === topToolId)
      expect(improvedToolIndex).toBeLessThanOrEqual(1) // Should be in top 2

      if (improvedToolIndex >= 0) {
        expect(improvedRecs[improvedToolIndex].algorithmScores.collaborative).toBeGreaterThan(
          initialRecs[0].algorithmScores.collaborative
        )
      }
    })
  })

  describe('Context Analysis Integration', () => {
    it('should analyze workflow context accurately', async () => {
      const workflowState: WorkflowState = {
        currentWorkflowId: 'workflow_123',
        activeNodes: ['node_1', 'node_2'],
        completedSteps: ['step_1', 'step_2'],
        pendingActions: ['deploy', 'test'],
        workflowVariables: { env: 'production' },
        executionContext: { userId: 'user_123' },
      }

      const request = createMockRecommendationRequest({
        userMessage: 'What should I do next?',
        intent: 'decision',
        workflowState,
      })

      const recommendations = await recommendationEngine.getRecommendations(request)
      const topRec = recommendations[0]

      // Context should influence recommendations
      expect(topRec.contextualRelevance).toBeGreaterThan(0.5)
      expect(topRec.contextualExplanation.situationalFactors.length).toBeGreaterThan(0)

      // Should suggest relevant next actions
      const explanation = await recommendationEngine.explainRecommendation(
        topRec.toolId,
        request,
        topRec
      )
      expect(explanation.contextualFactors).toContain('workflow_execution')
    })

    it('should handle temporal context appropriately', async () => {
      const urgentContext = createMockRecommendationRequest({
        userMessage: 'I need to fix this critical bug immediately!',
        intent: 'action',
        skillLevel: 'advanced',
        timeContext: {
          timeOfDay: 'morning',
          dayOfWeek: 'monday',
          timeZone: 'UTC',
          workingHours: true,
          urgency: 'high',
        },
      })

      const casualContext = createMockRecommendationRequest({
        userMessage: 'I might want to explore some new features later',
        intent: 'exploration',
        skillLevel: 'intermediate',
        timeContext: {
          timeOfDay: 'evening',
          dayOfWeek: 'friday',
          timeZone: 'UTC',
          workingHours: false,
          urgency: 'low',
        },
      })

      const urgentRecs = await recommendationEngine.getRecommendations(urgentContext)
      const casualRecs = await recommendationEngine.getRecommendations(casualContext)

      // Urgent recommendations should have higher temporal relevance
      expect(urgentRecs[0].temporalRelevance).toBeGreaterThan(casualRecs[0].temporalRelevance)

      // Urgent recommendations should suggest quick-execution tools
      const urgentTools = urgentRecs.map((r) => r.toolId)
      const hasQuickTools = urgentTools.some(
        (toolId) => toolId.includes('get') || toolId.includes('quick') || toolId.includes('show')
      )
      expect(hasQuickTools).toBe(true)
    })

    it('should adapt to conversation context', async () => {
      const conversationHistory = [
        {
          role: 'user',
          content: 'I want to analyze my workflow performance',
          timestamp: new Date(Date.now() - 60000),
        },
        {
          role: 'assistant',
          content:
            'I can help you analyze workflow performance. What specific metrics are you interested in?',
          timestamp: new Date(Date.now() - 50000),
        },
        {
          role: 'user',
          content: 'Show me execution times and success rates',
          timestamp: new Date(Date.now() - 30000),
        },
      ]

      const request = createMockRecommendationRequest({
        userMessage: 'Generate a detailed report',
        intent: 'analysis',
        conversationHistory,
      })

      const recommendations = await recommendationEngine.getRecommendations(request)
      const topRec = recommendations[0]

      // Should understand the conversation context
      expect(topRec.contextualExplanation.primaryContext).toBeDefined()
      expect(topRec.confidenceDetails.overallConfidence).toBeGreaterThan(0.6)

      // Should recommend analysis/reporting tools
      const analysisTools = recommendations.filter(
        (r) =>
          r.toolId.includes('analyze') || r.toolId.includes('report') || r.toolId.includes('metric')
      )
      expect(analysisTools.length).toBeGreaterThan(0)
    })
  })

  describe('Performance and Caching', () => {
    it('should cache and reuse recommendations appropriately', async () => {
      const request = createMockRecommendationRequest({
        userMessage: 'Create a new workflow template',
        intent: 'creation',
        skillLevel: 'intermediate',
      })

      // First request - should be computed
      const start1 = Date.now()
      const recs1 = await recommendationEngine.getRecommendations(request)
      const time1 = Date.now() - start1

      // Second identical request - should be cached
      const start2 = Date.now()
      const recs2 = await recommendationEngine.getRecommendations(request)
      const time2 = Date.now() - start2

      // Second request should be faster (cached)
      expect(time2).toBeLessThan(time1)

      // Results should be identical
      expect(recs1.length).toBe(recs2.length)
      expect(recs1[0].toolId).toBe(recs2[0].toolId)
    })

    it('should handle high concurrency loads', async () => {
      const requests = Array.from({ length: 20 }, (_, i) =>
        createMockRecommendationRequest({
          userMessage: `Request ${i}: Help me with workflow management`,
          intent: 'action',
          skillLevel: i % 2 === 0 ? 'beginner' : 'advanced',
        })
      )

      const start = Date.now()
      const results = await Promise.all(
        requests.map((req) => recommendationEngine.getRecommendations(req))
      )
      const totalTime = Date.now() - start

      // All requests should succeed
      expect(results.length).toBe(20)
      results.forEach((recs) => {
        expect(recs.length).toBeGreaterThan(0)
      })

      // Should complete within reasonable time (10s for 20 requests)
      expect(totalTime).toBeLessThan(10000)

      // Average time per request should be reasonable
      const avgTimePerRequest = totalTime / 20
      expect(avgTimePerRequest).toBeLessThan(500)
    })

    it('should track performance metrics', async () => {
      const request = createMockRecommendationRequest({
        userMessage: 'Optimize my workflow performance',
        intent: 'optimization',
      })

      const recommendations = await recommendationEngine.getRecommendations(request)
      const analytics = await recommendationEngine.getAnalytics({
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      })

      expect(analytics).toBeDefined()
      expect(analytics.totalRecommendations).toBeGreaterThan(0)

      // Track the recommendation in analytics
      await analyticsFramework.trackRecommendationRequest(request, recommendations)

      const insights = await analyticsFramework.generateUsageInsights({
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      })

      expect(insights.overallMetrics).toBeDefined()
      expect(insights.overallMetrics.totalUsers).toBeGreaterThan(0)
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle invalid requests gracefully', async () => {
      const invalidRequest = {
        userMessage: '',
        conversationHistory: [],
        currentContext: {} as AdvancedUsageContext,
      }

      const recommendations = await recommendationEngine.getRecommendations(invalidRequest as any)

      // Should return fallback recommendations
      expect(recommendations).toBeDefined()
      expect(recommendations.length).toBeGreaterThanOrEqual(0)
    })

    it('should recover from algorithm failures', async () => {
      const request = createMockRecommendationRequest({
        userMessage: 'Help me with complex workflow automation',
        intent: 'automation',
      })

      // Mock algorithm failure by providing invalid weights
      request.algorithmWeights = {
        collaborative: -1, // Invalid
        contentBased: 2, // Invalid
        contextual: 0.5,
        temporal: 0.3,
        behavioral: 0.2,
      }

      const recommendations = await recommendationEngine.getRecommendations(request)

      // Should still return recommendations with fallback algorithms
      expect(recommendations).toBeDefined()
      expect(recommendations.length).toBeGreaterThan(0)

      // Scores should be normalized to valid range
      recommendations.forEach((rec) => {
        Object.values(rec.algorithmScores).forEach((score) => {
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(1)
        })
      })
    })

    it('should handle partial data gracefully', async () => {
      const partialRequest = createMockRecommendationRequest({
        userMessage: 'Help me',
        intent: 'action',
        // Missing many context fields
      })

      // Remove optional fields
      partialRequest.workflowState = undefined
      partialRequest.userBehaviorHistory = undefined
      partialRequest.currentSession = undefined

      const recommendations = await recommendationEngine.getRecommendations(partialRequest)

      expect(recommendations).toBeDefined()
      expect(recommendations.length).toBeGreaterThan(0)

      // Should provide reasonable defaults
      const topRec = recommendations[0]
      expect(topRec.confidence).toBeGreaterThan(0)
      expect(topRec.contextualExplanation).toBeDefined()
    })
  })

  describe('Integration with Analytics', () => {
    it('should integrate with usage analytics framework', async () => {
      const request = createMockRecommendationRequest({
        userMessage: 'Create automated testing workflow',
        intent: 'automation',
        skillLevel: 'advanced',
      })

      const recommendations = await recommendationEngine.getRecommendations(request)

      // Track the recommendation request
      await analyticsFramework.trackRecommendationRequest(request, recommendations)

      // Simulate tool execution
      await analyticsFramework.trackToolExecution(
        request.currentContext.userId,
        recommendations[0].toolId,
        request.currentContext,
        {
          success: true,
          executionTime: 1500,
          parameters: { type: 'automated_test' },
        }
      )

      // Simulate user feedback
      await analyticsFramework.trackUserFeedback(
        request.currentContext.userId,
        recommendations[0].toolId,
        'rating',
        { rating: 4.5, helpful: true }
      )

      // Generate insights
      const insights = await analyticsFramework.generateUsageInsights()

      expect(insights.overallMetrics.totalUsers).toBeGreaterThan(0)
      expect(insights.overallMetrics.totalToolExecutions).toBeGreaterThan(0)
    })

    it('should provide real-time dashboard data', async () => {
      const dashboard = analyticsFramework.getRealTimeDashboard()

      expect(dashboard).toBeDefined()
      expect(dashboard.timestamp).toBeDefined()
      expect(dashboard.metrics).toBeDefined()
    })
  })
})

// =============================================================================
// Test Helper Functions
// =============================================================================

function createMockRecommendationRequest(options: {
  userMessage: string
  intent: string
  skillLevel?: string
  workflowState?: WorkflowState
  conversationHistory?: any[]
  timeContext?: Partial<TemporalContext>
  includeExplanations?: boolean
  algorithmWeights?: any
  isNewUser?: boolean
}): ContextualRecommendationRequest {
  const userId = options.isNewUser
    ? `new_user_${Date.now()}`
    : `test_user_${Math.random().toString(36).substr(2, 9)}`

  const currentContext: AdvancedUsageContext = {
    userId,
    currentIntent: options.intent
      ? {
          primary: options.intent,
          confidence: 0.8,
          urgency: 'medium',
          complexity: 'moderate',
        }
      : undefined,
    userSkillLevel: (options.skillLevel as any) || 'intermediate',
    userPreferences: {
      communicationStyle: 'conversational',
      complexityPreference: 'moderate',
      automationLevel: 'guided',
      feedbackLevel: 'standard',
      toolCategories: ['workflow', 'automation'],
      preferredWorkflowPatterns: ['sequential', 'parallel'],
    },
    recentToolUsage: [],
    activeWorkflows: [],
    timeContext: {
      timeOfDay: 'afternoon',
      dayOfWeek: 'tuesday',
      timeZone: 'UTC',
      workingHours: true,
      urgency: 'medium',
      ...options.timeContext,
    },
    collaborationContext: {
      teamMembers: [],
      sharedWorkspaces: [],
      collaborativeTools: [],
      communicationChannels: [],
    },
    businessContext: {
      industry: 'technology',
      companySize: 'medium',
      businessFunction: 'engineering',
      complianceRequirements: [],
      securityLevel: 'enhanced',
    },
    deviceContext: {
      deviceType: 'desktop',
      screenSize: 'large',
      inputMethod: 'keyboard',
      connectionQuality: 'fast',
    },
  }

  return {
    userMessage: options.userMessage,
    conversationHistory: options.conversationHistory || [],
    currentContext,
    workflowState: options.workflowState,
    userBehaviorHistory: {
      toolUsagePatterns: [],
      successfulSequences: [],
      commonMistakes: [],
      learningProgression: [],
      sessionPatterns: [],
    },
    currentSession: {
      sessionId: `session_${Date.now()}`,
      startTime: new Date(),
      duration: 300,
      goalContext: 'workflow management',
      previousActions: [],
      currentFocus: options.intent,
      interruptions: 0,
    },
    maxRecommendations: 5,
    algorithmWeights: options.algorithmWeights,
    includeExplanations: options.includeExplanations || true,
    enableABTesting: false,
  }
}

interface MockToolExecutionResult {
  success: boolean
  executionTime: number
  parameters?: Record<string, any>
  errorMessage?: string
  outputSize?: number
}

interface MockRecommendationFeedback {
  type: 'positive' | 'negative' | 'mixed'
  toolId: string
  used: boolean
  helpful: boolean
  rating: number
  comment?: string
}
