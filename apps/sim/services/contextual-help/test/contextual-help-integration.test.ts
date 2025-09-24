/**
 * Comprehensive Integration Tests for Contextual Help System
 *
 * Tests all components of the contextual help system including:
 * - Natural Language Framework integration
 * - Help content generation and adaptation
 * - Interactive guidance workflows
 * - Multi-modal delivery system
 * - User feedback and analytics
 *
 * @author Contextual Help Agent
 * @version 1.0.0
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { contextualHelpAPI } from '../api/help-api'
import type { NLHelpContentConfig } from '../content/nl-framework-integration'
import { nlFrameworkIntegration } from '../content/nl-framework-integration'
import type { HelpContent, HelpContext, HelpDeliveryConfig, HelpSearchQuery } from '../types'

// Mock data
const mockUserContext: HelpContext = {
  id: 'test_context_1',
  userId: 'test_user_1',
  workspaceId: 'test_workspace_1',
  sessionId: 'test_session_1',
  currentRoute: '/dashboard',
  currentAction: 'viewing_analytics',
  toolContext: {
    toolId: 'analytics_dashboard',
    toolName: 'Analytics Dashboard',
    currentStep: 'data_visualization',
    parameters: {
      dateRange: '30d',
      metrics: ['impressions', 'clicks', 'conversions'],
    },
  },
  userState: {
    expertiseLevel: 'intermediate',
    recentActions: ['opened_dashboard', 'selected_metrics', 'applied_filters'],
    strugglingAreas: ['advanced_filtering', 'custom_metrics'],
    preferredHelpMode: 'tooltip',
    accessibility: {
      screenReader: false,
      reducedMotion: false,
      highContrast: false,
      fontSize: 'normal',
      voiceGuidance: false,
      keyboardNavigation: true,
    },
  },
  timestamp: new Date(),
  metadata: {
    sourceChannel: 'web_app',
    deviceType: 'desktop',
    browserInfo: 'Chrome/91.0',
  },
}

const mockRequestContext = {
  userId: 'test_user_1',
  sessionId: 'test_session_1',
  userAgent: 'Mozilla/5.0 Test Browser',
  requestId: 'req_test_123',
}

describe('Contextual Help System Integration Tests', () => {
  beforeEach(() => {
    // Reset any state between tests
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up after tests
  })

  describe('Natural Language Framework Integration', () => {
    test('should generate intelligent help content based on tool context', async () => {
      const nlConfig: NLHelpContentConfig = {
        toolId: 'analytics_dashboard',
        toolName: 'Analytics Dashboard',
        userExpertiseLevel: 'intermediate',
        currentContext: mockUserContext,
        contentType: 'tooltip',
        deliveryMode: 'tooltip',
        adaptToAccessibility: false,
      }

      const result = await nlFrameworkIntegration.generateHelpContent(nlConfig)

      expect(result).toBeDefined()
      expect(result.primaryContent).toBeDefined()
      expect(result.primaryContent.id).toMatch(/^help_/)
      expect(result.primaryContent.title).toContain('Analytics Dashboard')
      expect(result.primaryContent.type).toBe('tooltip')
      expect(result.adaptedForContext).toBe(true)
      expect(result.generationMetadata.qualityScore).toBeGreaterThan(0)
    })

    test('should generate interactive tutorial for specific tool', async () => {
      const tutorial = await nlFrameworkIntegration.generateInteractiveTutorial(
        'analytics_dashboard',
        mockUserContext,
        'quick_start'
      )

      expect(tutorial).toBeDefined()
      expect(tutorial.id).toMatch(/^tutorial_analytics_dashboard_quick_start_/)
      expect(tutorial.title).toContain('Analytics Dashboard')
      expect(tutorial.difficulty).toBe('intermediate')
      expect(tutorial.steps).toBeInstanceOf(Array)
      expect(tutorial.estimatedDuration).toBeGreaterThan(0)
    })

    test('should adapt existing content for new user context', async () => {
      // First generate some content
      const originalContent: HelpContent = {
        id: 'test_content_1',
        title: 'Basic Dashboard Help',
        description: 'General dashboard guidance',
        content: 'This is basic help content for beginners',
        type: 'panel',
        priority: 'medium',
        triggers: [],
        conditions: [],
        tags: ['dashboard', 'basic'],
        version: '1.0.0',
        lastUpdated: new Date(),
        analytics: {
          views: 5,
          interactions: 3,
          completions: 2,
          averageRating: 4.2,
          feedbackCount: 2,
          lastViewed: new Date(),
          effectivenessScore: 0.8,
          userSegments: { beginner: 3, intermediate: 2, advanced: 0 },
          deliveryModes: {
            tooltip: 2,
            panel: 3,
            modal: 0,
            inline: 0,
            overlay: 0,
            voice: 0,
            chat: 0,
            notification: 0,
          },
          completionRate: 0.6,
          averageDuration: 120,
          dropOffPoints: [],
        },
      }

      // Create new context for advanced user
      const advancedContext: HelpContext = {
        ...mockUserContext,
        userState: {
          ...mockUserContext.userState,
          expertiseLevel: 'advanced',
        },
      }

      const adaptedContent = await nlFrameworkIntegration.adaptContentForNewContext(
        originalContent,
        advancedContext
      )

      expect(adaptedContent).toBeDefined()
      expect(adaptedContent.id).not.toBe(originalContent.id)
      expect(adaptedContent.analytics.views).toBe(originalContent.analytics.views + 1)
    })
  })

  describe('Contextual Help API', () => {
    test('should retrieve contextual help content', async () => {
      const response = await contextualHelpAPI.getContextualHelp(
        mockUserContext,
        mockRequestContext
      )

      expect(response.success).toBe(true)
      expect(response.data).toBeInstanceOf(Array)
      expect(response.metadata).toBeDefined()
      expect(response.metadata?.timestamp).toBeInstanceOf(Date)
      expect(response.metadata?.requestId).toBe(mockRequestContext.requestId)
    })

    test('should generate intelligent help using API', async () => {
      const nlConfig: NLHelpContentConfig = {
        toolId: 'analytics_dashboard',
        toolName: 'Analytics Dashboard',
        userExpertiseLevel: 'intermediate',
        currentContext: mockUserContext,
        contentType: 'modal',
        deliveryMode: 'modal',
        adaptToAccessibility: false,
      }

      const response = await contextualHelpAPI.generateIntelligentHelp(nlConfig, mockRequestContext)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data?.primaryContent.type).toBe('modal')
      expect(response.data?.generationMetadata.qualityScore).toBeGreaterThan(0)
    })

    test('should start interactive guidance session', async () => {
      const response = await contextualHelpAPI.startInteractiveGuidance(
        'analytics_dashboard',
        'comprehensive',
        mockUserContext,
        mockRequestContext
      )

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data?.tutorial).toBeDefined()
      expect(response.data?.sessionId).toBeDefined()
      expect(response.data?.tutorial.title).toContain('Analytics Dashboard')
    })

    test('should search help content with contextual ranking', async () => {
      const searchQuery: HelpSearchQuery = {
        query: 'dashboard analytics metrics',
        filters: {
          type: ['tooltip', 'tutorial'],
          difficulty: ['intermediate'],
        },
        context: mockUserContext,
        options: {
          semantic: true,
          maxResults: 5,
          includeAnalytics: true,
        },
      }

      const response = await contextualHelpAPI.searchHelpContent(searchQuery, mockRequestContext)

      expect(response.success).toBe(true)
      expect(response.data).toBeInstanceOf(Array)
      expect(response.data?.length).toBeLessThanOrEqual(5)
    })

    test('should submit user feedback', async () => {
      const feedbackData = {
        userId: mockUserContext.userId,
        sessionId: mockUserContext.sessionId,
        helpContentId: 'test_content_1',
        type: 'rating' as const,
        rating: 5,
        comment: 'Very helpful tutorial!',
        category: 'tutorial_feedback',
        metadata: {
          context: mockUserContext,
          timestamp: new Date(),
          userAgent: mockRequestContext.userAgent,
          helpDeliveryMode: 'modal' as const,
        },
      }

      const response = await contextualHelpAPI.submitFeedback(feedbackData, mockRequestContext)

      expect(response.success).toBe(true)
      expect(response.data?.feedbackId).toBeDefined()
    })

    test('should adapt help content for new context', async () => {
      const response = await contextualHelpAPI.adaptHelpContent(
        'test_content_1',
        mockUserContext,
        mockRequestContext
      )

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data?.id).toBeDefined()
    })

    test('should retrieve help system metrics', async () => {
      const response = await contextualHelpAPI.getHelpMetrics(
        { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
        mockRequestContext
      )

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data?.totalUsers).toBeTypeOf('number')
      expect(response.data?.activeHelpSessions).toBeTypeOf('number')
      expect(response.data?.contentLibrarySize).toBeTypeOf('number')
    })
  })

  describe('Help Content Delivery and Adaptation', () => {
    test('should determine optimal delivery configuration based on context', async () => {
      const deliveryConfig: HelpDeliveryConfig = {
        mode: 'tooltip',
        styling: {
          theme: 'auto',
          animation: 'fade',
        },
        behavior: {
          autoClose: 10000,
          dismissible: true,
        },
        accessibility: {
          announceToScreenReader: true,
          trapFocus: true,
        },
      }

      const response = await contextualHelpAPI.getContextualHelp(
        mockUserContext,
        mockRequestContext,
        deliveryConfig
      )

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
    })

    test('should adapt content for accessibility needs', async () => {
      const accessibilityContext: HelpContext = {
        ...mockUserContext,
        userState: {
          ...mockUserContext.userState,
          accessibility: {
            screenReader: true,
            reducedMotion: true,
            highContrast: true,
            fontSize: 'large',
            voiceGuidance: true,
            keyboardNavigation: true,
          },
        },
      }

      const nlConfig: NLHelpContentConfig = {
        toolId: 'analytics_dashboard',
        toolName: 'Analytics Dashboard',
        userExpertiseLevel: 'intermediate',
        currentContext: accessibilityContext,
        contentType: 'panel',
        deliveryMode: 'panel',
        adaptToAccessibility: true,
      }

      const result = await nlFrameworkIntegration.generateHelpContent(nlConfig)

      expect(result).toBeDefined()
      expect(result.adaptedForContext).toBe(true)
      expect(result.primaryContent.accessibility).toBeDefined()
    })

    test('should provide expertise-level appropriate content', async () => {
      // Test beginner content
      const beginnerContext: HelpContext = {
        ...mockUserContext,
        userState: {
          ...mockUserContext.userState,
          expertiseLevel: 'beginner',
        },
      }

      const beginnerConfig: NLHelpContentConfig = {
        toolId: 'analytics_dashboard',
        toolName: 'Analytics Dashboard',
        userExpertiseLevel: 'beginner',
        currentContext: beginnerContext,
        contentType: 'tutorial',
        deliveryMode: 'modal',
        adaptToAccessibility: false,
      }

      const beginnerResult = await nlFrameworkIntegration.generateHelpContent(beginnerConfig)

      // Test advanced content
      const advancedContext: HelpContext = {
        ...mockUserContext,
        userState: {
          ...mockUserContext.userState,
          expertiseLevel: 'advanced',
        },
      }

      const advancedConfig: NLHelpContentConfig = {
        toolId: 'analytics_dashboard',
        toolName: 'Analytics Dashboard',
        userExpertiseLevel: 'advanced',
        currentContext: advancedContext,
        contentType: 'tooltip',
        deliveryMode: 'tooltip',
        adaptToAccessibility: false,
      }

      const advancedResult = await nlFrameworkIntegration.generateHelpContent(advancedConfig)

      expect(beginnerResult.primaryContent.type).toBe('tutorial')
      expect(advancedResult.primaryContent.type).toBe('tooltip')
      expect(beginnerResult.generationMetadata.adaptationRules).not.toEqual(
        advancedResult.generationMetadata.adaptationRules
      )
    })
  })

  describe('Interactive Guidance Workflow', () => {
    test('should complete full guidance tutorial workflow', async () => {
      // Start guidance
      const startResponse = await contextualHelpAPI.startInteractiveGuidance(
        'analytics_dashboard',
        'quick_start',
        mockUserContext,
        mockRequestContext
      )

      expect(startResponse.success).toBe(true)
      const tutorial = startResponse.data?.tutorial

      // Verify tutorial structure
      expect(tutorial).toBeDefined()
      expect(tutorial?.steps.length).toBeGreaterThan(0)
      expect(tutorial?.estimatedDuration).toBeGreaterThan(0)
      expect(tutorial?.completionCriteria).toBeDefined()

      // Test step navigation (would typically involve UI interactions)
      for (let i = 0; i < (tutorial?.steps.length || 0); i++) {
        const step = tutorial?.steps[i]
        expect(step).toBeDefined()
        expect(step?.title).toBeDefined()
        expect(step?.description).toBeDefined()
        expect(step?.type).toMatch(/^(instruction|action|validation|decision)$/)
      }
    })

    test('should track tutorial completion and collect feedback', async () => {
      const startResponse = await contextualHelpAPI.startInteractiveGuidance(
        'analytics_dashboard',
        'troubleshooting',
        mockUserContext,
        mockRequestContext
      )

      expect(startResponse.success).toBe(true)

      // Simulate completion feedback
      const feedbackData = {
        userId: mockUserContext.userId,
        sessionId: mockUserContext.sessionId,
        tutorialId: startResponse.data?.tutorial.id,
        type: 'completion' as const,
        rating: 4,
        comment: 'Tutorial was clear and helpful',
        category: 'tutorial_completion',
        metadata: {
          context: mockUserContext,
          timestamp: new Date(),
          userAgent: mockRequestContext.userAgent,
          helpDeliveryMode: 'panel' as const,
        },
      }

      const feedbackResponse = await contextualHelpAPI.submitFeedback(
        feedbackData,
        mockRequestContext
      )

      expect(feedbackResponse.success).toBe(true)
      expect(feedbackResponse.data?.feedbackId).toBeDefined()
    })
  })

  describe('Analytics and Performance', () => {
    test('should track help system performance metrics', async () => {
      const startTime = Date.now()

      // Perform various operations
      await contextualHelpAPI.getContextualHelp(mockUserContext, mockRequestContext)
      await contextualHelpAPI.searchHelpContent(
        { query: 'test query', context: mockUserContext },
        mockRequestContext
      )

      const metricsResponse = await contextualHelpAPI.getHelpMetrics(undefined, mockRequestContext)

      expect(metricsResponse.success).toBe(true)
      expect(metricsResponse.data).toBeDefined()
      expect(metricsResponse.metadata?.performance.duration).toBeLessThan(5000) // Less than 5 seconds
    })

    test('should provide analytics on help content effectiveness', async () => {
      const metricsResponse = await contextualHelpAPI.getHelpMetrics(
        { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
        mockRequestContext
      )

      expect(metricsResponse.success).toBe(true)
      const metrics = metricsResponse.data

      expect(metrics?.userSatisfactionScore).toBeTypeOf('number')
      expect(metrics?.contentEffectiveness).toBeTypeOf('object')
      expect(metrics?.systemPerformance).toBeTypeOf('object')
      expect(metrics?.systemPerformance.averageResponseTime).toBeTypeOf('number')
      expect(metrics?.systemPerformance.cacheHitRate).toBeTypeOf('number')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid tool IDs gracefully', async () => {
      const response = await contextualHelpAPI.startInteractiveGuidance(
        'nonexistent_tool',
        'quick_start',
        mockUserContext,
        mockRequestContext
      )

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe('GUIDANCE_START_FAILED')
    })

    test('should handle malformed user context', async () => {
      const malformedContext = {
        ...mockUserContext,
        userState: undefined,
      } as any

      const response = await contextualHelpAPI.getContextualHelp(
        malformedContext,
        mockRequestContext
      )

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })

    test('should handle network failures gracefully', async () => {
      // Mock network failure
      vi.spyOn(nlFrameworkIntegration, 'generateHelpContent').mockRejectedValueOnce(
        new Error('Network timeout')
      )

      const nlConfig: NLHelpContentConfig = {
        toolId: 'test_tool',
        toolName: 'Test Tool',
        userExpertiseLevel: 'intermediate',
        currentContext: mockUserContext,
        contentType: 'tooltip',
        deliveryMode: 'tooltip',
        adaptToAccessibility: false,
      }

      const response = await contextualHelpAPI.generateIntelligentHelp(nlConfig, mockRequestContext)

      expect(response.success).toBe(false)
      expect(response.error?.message).toContain('Failed to generate intelligent help')
    })

    test('should validate content quality before delivery', async () => {
      const nlConfig: NLHelpContentConfig = {
        toolId: 'analytics_dashboard',
        toolName: 'Analytics Dashboard',
        userExpertiseLevel: 'intermediate',
        currentContext: mockUserContext,
        contentType: 'tooltip',
        deliveryMode: 'tooltip',
        adaptToAccessibility: false,
      }

      const result = await nlFrameworkIntegration.generateHelpContent(nlConfig)

      expect(result.generationMetadata.qualityScore).toBeGreaterThan(0)
      expect(result.generationMetadata.qualityScore).toBeLessThanOrEqual(1)
      expect(result.primaryContent.version).toBeDefined()
      expect(result.primaryContent.lastUpdated).toBeInstanceOf(Date)
    })
  })

  describe('Multi-User Scenarios', () => {
    test('should handle concurrent users with different contexts', async () => {
      const user1Context: HelpContext = {
        ...mockUserContext,
        userId: 'user_1',
        userState: { ...mockUserContext.userState, expertiseLevel: 'beginner' },
      }

      const user2Context: HelpContext = {
        ...mockUserContext,
        userId: 'user_2',
        userState: { ...mockUserContext.userState, expertiseLevel: 'advanced' },
      }

      const [response1, response2] = await Promise.all([
        contextualHelpAPI.getContextualHelp(user1Context, {
          ...mockRequestContext,
          userId: 'user_1',
        }),
        contextualHelpAPI.getContextualHelp(user2Context, {
          ...mockRequestContext,
          userId: 'user_2',
        }),
      ])

      expect(response1.success).toBe(true)
      expect(response2.success).toBe(true)
      expect(response1.data).not.toEqual(response2.data)
    })

    test('should maintain session isolation between users', async () => {
      const user1Session = 'session_user_1'
      const user2Session = 'session_user_2'

      const tutorial1 = await contextualHelpAPI.startInteractiveGuidance(
        'analytics_dashboard',
        'quick_start',
        { ...mockUserContext, userId: 'user_1', sessionId: user1Session },
        { ...mockRequestContext, userId: 'user_1', sessionId: user1Session }
      )

      const tutorial2 = await contextualHelpAPI.startInteractiveGuidance(
        'analytics_dashboard',
        'comprehensive',
        { ...mockUserContext, userId: 'user_2', sessionId: user2Session },
        { ...mockRequestContext, userId: 'user_2', sessionId: user2Session }
      )

      expect(tutorial1.success).toBe(true)
      expect(tutorial2.success).toBe(true)
      expect(tutorial1.data?.sessionId).not.toBe(tutorial2.data?.sessionId)
    })
  })
})

// Performance and load testing helpers
describe('Performance Tests', () => {
  test('should handle high volume of help requests', async () => {
    const requests = Array.from({ length: 50 }, (_, i) =>
      contextualHelpAPI.getContextualHelp(
        { ...mockUserContext, userId: `user_${i}` },
        { ...mockRequestContext, userId: `user_${i}`, requestId: `req_${i}` }
      )
    )

    const startTime = Date.now()
    const responses = await Promise.all(requests)
    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    expect(responses.every((r) => r.success)).toBe(true)
  })

  test('should maintain response times under load', async () => {
    const measurements: number[] = []

    for (let i = 0; i < 10; i++) {
      const start = Date.now()
      await contextualHelpAPI.getContextualHelp(
        { ...mockUserContext, userId: `load_test_${i}` },
        { ...mockRequestContext, requestId: `load_${i}` }
      )
      measurements.push(Date.now() - start)
    }

    const averageResponseTime = measurements.reduce((a, b) => a + b) / measurements.length
    const maxResponseTime = Math.max(...measurements)

    expect(averageResponseTime).toBeLessThan(2000) // Average under 2 seconds
    expect(maxResponseTime).toBeLessThan(5000) // Maximum under 5 seconds
  })
})
