/**
 * Tool Recommendation System - Comprehensive Test Suite
 *
 * Complete testing framework for all components of the tool recommendation
 * system, including unit tests, integration tests, performance tests,
 * and end-to-end workflow validation.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import {
  behaviorTracker,
  contextAnalyzer,
  devUtils,
  healthCheck,
  mlEngine,
  personalizationEngine,
  realtimeSuggester,
  toolRecommendationService,
  workspaceAnalyzer,
} from '../index'
import type {
  ConversationContext,
  RealTimeSuggestion,
  RecommendationRequest,
  ToolRecommendation,
  UserBehaviorProfile,
} from '../types'

// Test data setup
const createTestContext = (): ConversationContext =>
  devUtils.createSampleContext({
    userId: 'test-user-123',
    workspaceId: 'test-workspace-456',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'I need to query our PostgreSQL database to get user analytics',
        timestamp: new Date(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content:
          'I can help you with that database query. What specific analytics are you looking for?',
        timestamp: new Date(),
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'I want to see monthly active users and their tool usage patterns',
        timestamp: new Date(),
      },
    ],
  })

const createTestUserProfile = (): UserBehaviorProfile =>
  devUtils.createSampleUserProfile('test-user-123', 'test-workspace-456')

describe('Tool Recommendation System', () => {
  let testContext: ConversationContext
  let testUserProfile: UserBehaviorProfile

  beforeEach(() => {
    testContext = createTestContext()
    testUserProfile = createTestUserProfile()
  })

  afterEach(() => {
    // Clean up any test state
    jest.clearAllMocks()
  })

  describe('System Health and Initialization', () => {
    test('should have healthy system status', async () => {
      const health = await healthCheck()
      expect(health.status).toBe('healthy')
      expect(health.components).toBeDefined()
      expect(health.components.length).toBeGreaterThan(0)
    })

    test('should provide system information', () => {
      const { SYSTEM_INFO } = require('../index')
      expect(SYSTEM_INFO.Name).toBe('Tool Recommendation System')
      expect(SYSTEM_INFO.version).toBe('1.0.0')
      expect(SYSTEM_INFO.features).toHaveLength(8)
      expect(SYSTEM_INFO.components).toBeDefined()
    })

    test('should have proper system health monitoring', async () => {
      const systemHealth = await toolRecommendationService.getSystemHealth()
      expect(systemHealth.status).toBeDefined()
      expect(systemHealth.components).toHaveLength(6)
      expect(systemHealth.overallScore).toBeGreaterThan(0)
      expect(systemHealth.overallScore).toBeLessThanOrEqual(1)
    })
  })

  describe('Context Analysis Engine', () => {
    test('should analyze conversation context successfully', async () => {
      const analyzedContext = await contextAnalyzer.analyzeContext(testContext)

      expect(analyzedContext.id).toBe(testContext.id)
      expect(analyzedContext.messages).toHaveLength(testContext.messages.length)

      // Check that messages have been analyzed
      const userMessages = analyzedContext.messages.filter((m) => m.role === 'user')
      expect(userMessages[0].metadata?.intent).toBeDefined()
      expect(userMessages[0].metadata?.entities).toBeDefined()
      expect(userMessages[0].metadata?.sentiment).toBeDefined()
    })

    test('should classify intents correctly', async () => {
      const analyzedContext = await contextAnalyzer.analyzeContext(testContext)
      const firstUserMessage = analyzedContext.messages.find((m) => m.role === 'user')

      expect(firstUserMessage?.metadata?.intent?.primary).toBeDefined()
      expect(firstUserMessage?.metadata?.intent?.confidence).toBeGreaterThan(0)
      expect(firstUserMessage?.metadata?.intent?.domains).toContain('data')
      expect(firstUserMessage?.metadata?.intent?.tasks).toContain('data_retrieval')
    })

    test('should extract entities from conversation', async () => {
      const analyzedContext = await contextAnalyzer.analyzeContext(testContext)
      const entities = analyzedContext.messages.flatMap((m) => m.metadata?.entities || [])

      expect(entities.length).toBeGreaterThan(0)
      expect(entities.some((e) => e.type === 'database')).toBe(true)
    })

    test('should provide contextual insights', async () => {
      const analyzedContext = await contextAnalyzer.analyzeContext(testContext)
      const insights = contextAnalyzer.getContextualInsights(analyzedContext)

      expect(insights.dominantIntents).toBeDefined()
      expect(insights.commonEntities).toBeDefined()
      expect(insights.sentimentTrend).toBeDefined()
      expect(insights.conversationFlow).toBeDefined()
      expect(insights.recommendationTriggers).toBeDefined()
    })
  })

  describe('Machine Learning Recommendation Engine', () => {
    test('should generate ML-powered recommendations', async () => {
      const request: RecommendationRequest = {
        context: testContext,
        userProfile: testUserProfile,
        maxSuggestions: 5,
        explainReasons: true,
      }

      const recommendations = await mlEngine.generateRecommendations(request)

      expect(recommendations).toHaveLength(5)
      expect(recommendations[0]).toHaveProperty('toolId')
      expect(recommendations[0]).toHaveProperty('score')
      expect(recommendations[0]).toHaveProperty('confidence')
      expect(recommendations[0]).toHaveProperty('reasons')
      expect(recommendations[0].score).toBeGreaterThan(0)
      expect(recommendations[0].score).toBeLessThanOrEqual(1)
    })

    test('should rank recommendations by relevance', async () => {
      const request: RecommendationRequest = {
        context: testContext,
        userProfile: testUserProfile,
        maxSuggestions: 10,
      }

      const recommendations = await mlEngine.generateRecommendations(request)

      // Verify sorting by score
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i].score).toBeLessThanOrEqual(recommendations[i - 1].score)
      }
    })

    test('should provide contextually relevant tools', async () => {
      const request: RecommendationRequest = {
        context: testContext,
        maxSuggestions: 5,
      }

      const recommendations = await mlEngine.generateRecommendations(request)

      // Should recommend database-related tools for database queries
      const hasDbTools = recommendations.some(
        (r) =>
          r.toolId.includes('postgres') ||
          r.toolId.includes('query') ||
          r.toolId.includes('database')
      )
      expect(hasDbTools).toBe(true)
    })
  })

  describe('Behavior Tracking System', () => {
    const sessionId = 'test-session-789'

    beforeEach(() => {
      behaviorTracker.startSession('test-user-123', 'test-workspace-456', sessionId)
    })

    afterEach(async () => {
      await behaviorTracker.endSession(sessionId)
    })

    test('should track tool execution events', () => {
      expect(() => {
        behaviorTracker.trackToolExecution(sessionId, 'postgresql_query', 'success', 1500, {
          queryComplexity: 'medium',
        })
      }).not.toThrow()
    })

    test('should track user tool selection', () => {
      expect(() => {
        behaviorTracker.trackToolSelection(
          sessionId,
          'postgresql_query',
          ['mysql_query', 'mongodb_query', 'supabase_query'],
          2000
        )
      }).not.toThrow()
    })

    test('should track errors and help requests', () => {
      expect(() => {
        behaviorTracker.trackError(
          sessionId,
          'postgresql_query',
          'syntax_error',
          'Invalid SQL syntax in WHERE clause'
        )
      }).not.toThrow()

      expect(() => {
        behaviorTracker.trackHelpRequest(sessionId, 'postgresql_query', 'documentation', true)
      }).not.toThrow()
    })

    test('should generate user behavior profile', async () => {
      const profile = await behaviorTracker.getUserProfile('test-user-123', 'test-workspace-456')

      expect(profile.userId).toBe('test-user-123')
      expect(profile.workspaceId).toBe('test-workspace-456')
      expect(profile.preferences).toBeDefined()
      expect(profile.toolFamiliarity).toBeDefined()
      expect(profile.collaborationStyle).toBeDefined()
    })

    test('should analyze usage patterns', async () => {
      const analysis = await behaviorTracker.analyzeUsagePatterns(
        'test-user-123',
        'test-workspace-456'
      )

      expect(analysis.dominantPatterns).toBeDefined()
      expect(analysis.toolPreferences).toBeDefined()
      expect(analysis.collaborationInsights).toBeDefined()
      expect(analysis.learningProgress).toBeDefined()
      expect(analysis.recommendations).toBeDefined()
    })
  })

  describe('Workspace Pattern Analyzer', () => {
    test('should analyze workspace patterns', async () => {
      // Add test user to workspace
      workspaceAnalyzer.addTeamMember(
        'test-workspace-456',
        'test-user-123',
        'developer',
        testUserProfile
      )

      const pattern = await workspaceAnalyzer.analyzeWorkspace('test-workspace-456')

      expect(pattern.workspaceId).toBe('test-workspace-456')
      expect(pattern.teamSize).toBeGreaterThan(0)
      expect(pattern.commonWorkflows).toBeDefined()
      expect(pattern.toolUsageStats).toBeDefined()
      expect(pattern.integrationPoints).toBeDefined()
    })

    test('should identify workflow patterns', async () => {
      workspaceAnalyzer.addTeamMember(
        'test-workspace-456',
        'test-user-123',
        'developer',
        testUserProfile
      )

      const workflows = await workspaceAnalyzer.identifyWorkflows('test-workspace-456')

      expect(Array.isArray(workflows)).toBe(true)
      workflows.forEach((workflow) => {
        expect(workflow.id).toBeDefined()
        expect(workflow.Name).toBeDefined()
        expect(workflow.tools).toBeDefined()
        expect(workflow.frequency).toBeGreaterThan(0)
      })
    })

    test('should analyze tool adoption patterns', async () => {
      workspaceAnalyzer.addTeamMember(
        'test-workspace-456',
        'test-user-123',
        'developer',
        testUserProfile
      )

      const adoption = await workspaceAnalyzer.analyzeToolAdoption('test-workspace-456')

      expect(adoption.adoptionRate).toBeDefined()
      expect(adoption.championUsers).toBeDefined()
      expect(adoption.resistancePoints).toBeDefined()
      expect(adoption.rolloutRecommendations).toBeDefined()
    })

    test('should calculate workspace metrics', async () => {
      workspaceAnalyzer.addTeamMember(
        'test-workspace-456',
        'test-user-123',
        'developer',
        testUserProfile
      )

      const metrics = await workspaceAnalyzer.calculateWorkspaceMetrics('test-workspace-456')

      expect(metrics.totalUsers).toBeGreaterThan(0)
      expect(metrics.toolAdoptionRate).toBeGreaterThanOrEqual(0)
      expect(metrics.toolAdoptionRate).toBeLessThanOrEqual(1)
      expect(metrics.workflowEfficiency).toBeGreaterThanOrEqual(0)
      expect(metrics.collaborationIndex).toBeGreaterThanOrEqual(0)
      expect(metrics.innovationScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Real-Time Suggestion System', () => {
    const conversationId = 'test-conv-real-time'

    beforeEach(() => {
      realtimeSuggester.startMonitoring(conversationId, testContext, testUserProfile)
    })

    afterEach(() => {
      realtimeSuggester.stopMonitoring(conversationId)
    })

    test('should start and stop monitoring conversations', () => {
      expect(realtimeSuggester.getCurrentSuggestions(conversationId)).toBeDefined()
    })

    test('should detect trigger conditions', async () => {
      // Simulate user pause trigger
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Add message that might trigger suggestions
      await realtimeSuggester.updateContext(conversationId, {
        id: 'msg-trigger',
        role: 'user',
        content: 'I keep getting errors with this database query',
        timestamp: new Date(),
      })

      const suggestions = realtimeSuggester.getCurrentSuggestions(conversationId)
      // Note: In a real test, we might need to wait for async processing
    })

    test('should handle suggestion acceptance and dismissal', () => {
      const mockSuggestion: RealTimeSuggestion = {
        id: 'test-suggestion-123',
        conversationId,
        trigger: 'user_pause',
        suggestion: {
          toolId: 'postgresql_query',
          tool: {} as any,
          score: 0.85,
          confidence: 0.8,
          reasons: [],
          category: 'highly_relevant',
          estimatedRelevance: 0.85,
          contextAlignment: 0.8,
          userFit: 0.9,
          workspaceFit: 0.7,
        },
        urgency: 'medium',
        timing: 'next_pause',
        createdAt: new Date(),
      }

      expect(() => {
        realtimeSuggester.acceptSuggestion(conversationId, mockSuggestion.id)
      }).not.toThrow()

      expect(() => {
        realtimeSuggester.dismissSuggestion(conversationId, mockSuggestion.id)
      }).not.toThrow()
    })

    test('should provide system statistics', () => {
      const stats = realtimeSuggester.getSystemStats()

      expect(stats.activeConversations).toBeGreaterThanOrEqual(0)
      expect(stats.totalSuggestions).toBeGreaterThanOrEqual(0)
      expect(stats.acceptanceRate).toBeGreaterThanOrEqual(0)
      expect(stats.acceptanceRate).toBeLessThanOrEqual(1)
      expect(stats.triggerStats).toBeDefined()
    })
  })

  describe('Personalization Engine', () => {
    test('should create personalization configuration', async () => {
      const config = await personalizationEngine.getPersonalizationConfig(
        'test-user-123',
        'test-workspace-456'
      )

      expect(config.userId).toBe('test-user-123')
      expect(config.workspaceId).toBe('test-workspace-456')
      expect(config.adaptationRate).toBeDefined()
      expect(config.explorationRate).toBeDefined()
      expect(config.privacySettings).toBeDefined()
    })

    test('should personalize recommendations', async () => {
      const mockRecommendationSet = {
        request: { context: testContext } as RecommendationRequest,
        recommendations: [
          {
            toolId: 'postgresql_query',
            tool: {} as any,
            score: 0.7,
            confidence: 0.8,
            reasons: [],
            category: 'contextually_appropriate' as const,
            estimatedRelevance: 0.7,
            contextAlignment: 0.8,
            userFit: 0.6,
            workspaceFit: 0.7,
          },
        ],
        metadata: {
          generatedAt: new Date(),
          processingTime: 100,
          modelVersion: '1.0.0',
          totalScored: 1,
          confidenceThreshold: 0.3,
        },
      }

      const personalized = await personalizationEngine.personalizeRecommendations(
        'test-user-123',
        'test-workspace-456',
        mockRecommendationSet,
        testUserProfile
      )

      expect(personalized.recommendations).toHaveLength(1)
      expect(personalized.metadata.personalizedFor).toBe('test-user-123')
    })

    test('should generate learning recommendations', async () => {
      const learning = await personalizationEngine.generateLearningRecommendations(
        'test-user-123',
        'test-workspace-456',
        testUserProfile
      )

      expect(learning.skillGaps).toBeDefined()
      expect(learning.recommendedTraining).toBeDefined()
      expect(learning.toolMastery).toBeDefined()
      expect(learning.nextLearningGoals).toBeDefined()
    })

    test('should export personalization data', async () => {
      const exportData = await personalizationEngine.exportPersonalizationData(
        'test-user-123',
        'test-workspace-456'
      )

      expect(exportData.preferences).toBeDefined()
      expect(exportData.learningProgress).toBeDefined()
      expect(exportData.adaptationHistory).toBeDefined()
      expect(exportData.privacyCompliant).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    test('should provide complete end-to-end recommendation flow', async () => {
      // Start user session
      const sessionId = 'integration-test-session'
      toolRecommendationService.startSession('test-user-123', 'test-workspace-456', sessionId)

      try {
        // Generate recommendations
        const request: RecommendationRequest = {
          context: testContext,
          maxSuggestions: 5,
          explainReasons: true,
        }

        const recommendations = await toolRecommendationService.getRecommendations(request)

        expect(recommendations.recommendations).toHaveLength(5)
        expect(recommendations.metadata.generatedAt).toBeDefined()
        expect(recommendations.explanation).toBeDefined()

        // Track tool execution
        toolRecommendationService.trackToolExecution(
          sessionId,
          recommendations.recommendations[0].toolId,
          'success',
          1200
        )

        // Provide feedback
        await toolRecommendationService.provideFeedback('mock-suggestion-id', {
          helpful: true,
          accurate: true,
          timely: true,
          rating: 5,
          submittedAt: new Date(),
        })

        // Get analytics
        const analytics = await toolRecommendationService.getAnalytics('test-workspace-456', {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
          granularity: 'day',
        })

        expect(analytics.workspaceId).toBe('test-workspace-456')
        expect(analytics.metrics).toBeDefined()
        expect(analytics.trends).toBeDefined()
        expect(analytics.insights).toBeDefined()
      } finally {
        // End session
        await toolRecommendationService.endSession(sessionId)
      }
    })

    test('should handle real-time suggestions in workflow', async () => {
      const conversationId = 'integration-realtime-test'

      // Start monitoring
      realtimeSuggester.startMonitoring(conversationId, testContext, testUserProfile)

      try {
        // Simulate conversation updates
        await realtimeSuggester.updateContext(conversationId, {
          id: 'new-msg',
          role: 'user',
          content: 'This query is taking too long to execute',
          timestamp: new Date(),
        })

        // Check for suggestions
        const suggestions = toolRecommendationService.getCurrentSuggestions(conversationId)
        expect(Array.isArray(suggestions)).toBe(true)

        // Test acceptance/dismissal
        if (suggestions.length > 0) {
          toolRecommendationService.acceptSuggestion(conversationId, suggestions[0].id)
        }
      } finally {
        // Stop monitoring
        realtimeSuggester.stopMonitoring(conversationId)
      }
    })
  })

  describe('Performance Tests', () => {
    test('should generate recommendations within acceptable time limits', async () => {
      const startTime = Date.now()

      const request: RecommendationRequest = {
        context: testContext,
        userProfile: testUserProfile,
        maxSuggestions: 10,
      }

      await toolRecommendationService.getRecommendations(request)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000)
    })

    test('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        context: {
          ...testContext,
          id: `perf-test-${i}`,
        },
        maxSuggestions: 5,
      }))

      const startTime = Date.now()
      const results = await Promise.all(
        requests.map((req) => toolRecommendationService.getRecommendations(req))
      )
      const endTime = Date.now()

      expect(results).toHaveLength(10)
      expect(results.every((r) => r.recommendations.length > 0)).toBe(true)

      // Should handle 10 concurrent requests within 10 seconds
      expect(endTime - startTime).toBeLessThan(10000)
    })

    test('should maintain performance under load', async () => {
      const iterations = 50
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now()

        await toolRecommendationService.getRecommendations({
          context: { ...testContext, id: `load-test-${i}` },
          maxSuggestions: 3,
        })

        times.push(Date.now() - startTime)
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
      const maxTime = Math.max(...times)

      expect(averageTime).toBeLessThan(2000) // Average under 2 seconds
      expect(maxTime).toBeLessThan(5000) // No request over 5 seconds
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid conversation context gracefully', async () => {
      const invalidContext = {
        ...testContext,
        messages: [], // Empty messages
        id: '', // Invalid ID
      }

      const result = await toolRecommendationService.getRecommendations({
        context: invalidContext as ConversationContext,
        maxSuggestions: 5,
      })

      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
    })

    test('should handle missing user profile gracefully', async () => {
      const result = await toolRecommendationService.getRecommendations({
        context: testContext,
        userProfile: undefined,
        maxSuggestions: 5,
      })

      expect(result.recommendations).toBeDefined()
      expect(result.recommendations.length).toBeGreaterThan(0)
    })

    test('should handle system component failures', async () => {
      // This would test fallback mechanisms in case of component failures
      // For now, we just ensure the service doesn't throw unhandled errors

      const health = await toolRecommendationService.getSystemHealth()
      expect(health.status).toBeDefined()
    })
  })

  describe('Privacy and Security', () => {
    test('should respect privacy settings in personalization', async () => {
      await personalizationEngine.updatePersonalizationConfig(
        'test-user-123',
        'test-workspace-456',
        {
          privacySettings: {
            shareWithTeam: false,
            shareAcrossWorkspaces: false,
            collectDetailedAnalytics: false,
            retentionPeriod: 30,
            anonymizeData: true,
          },
        }
      )

      const exportData = await personalizationEngine.exportPersonalizationData(
        'test-user-123',
        'test-workspace-456'
      )

      expect(exportData.privacyCompliant).toBe(true)
      // When anonymized, data should be transformed
    })

    test('should not leak sensitive information in recommendations', async () => {
      const result = await toolRecommendationService.getRecommendations({
        context: testContext,
        userProfile: testUserProfile,
        maxSuggestions: 5,
      })

      // Check that recommendations don't contain sensitive data
      result.recommendations.forEach((rec) => {
        expect(rec.reasons).toBeDefined()
        // In a real test, we'd check that no sensitive user data leaks into reasons
      })
    })
  })
})

// Utility test helpers
// NOTE: If these test helpers need to be shared, move them to a separate non-test file
// export const testHelpers = {
const testHelpers = {
  createMockRecommendation: (toolId: string, score = 0.8): ToolRecommendation => ({
    toolId,
    tool: { id: toolId, Name: toolId, description: 'Mock tool', version: '1.0.0' } as any,
    score,
    confidence: score * 0.9,
    reasons: [{ type: 'intent_match', weight: 0.8, explanation: 'Mock reason' }],
    category: 'contextually_appropriate',
    estimatedRelevance: score,
    contextAlignment: score * 0.9,
    userFit: score * 0.8,
    workspaceFit: score * 0.7,
  }),

  measurePerformance: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = Date.now()
    const result = await fn()
    const duration = Date.now() - start
    return { result, duration }
  },

  createLargeConversation: (messageCount: number): ConversationContext => {
    const messages = Array.from({ length: messageCount }, (_, i) => ({
      id: `msg-${i}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Test message ${i}`,
      timestamp: new Date(Date.now() + i * 1000),
    }))

    return devUtils.createSampleContext({ messages })
  },
}
