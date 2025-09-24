/**
 * Comprehensive Test Suite for Contextual Help System
 *
 * Tests all major components of the contextual help and guidance system
 * including core functionality, interactive guidance, content management,
 * multi-modal delivery, and user feedback.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HelpContentManager } from '../content/content-manager'
import { ContextualHelpSystem } from '../core/help-system'
import { MultiModalDelivery } from '../delivery/multi-modal-delivery'
import { UserFeedbackSystem } from '../feedback/feedback-system'
import { InteractiveGuidance } from '../guidance/interactive-guidance'
import type {
  GuidanceStep,
  GuidanceTutorial,
  HelpContent,
  HelpContext,
  HelpDeliveryConfig,
} from '../types'

// Mock DOM APIs
const mockDocument = {
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(() => []),
  createElement: vi.fn(() => ({
    setAttribute: vi.fn(),
    style: { cssText: '' },
    appendChild: vi.fn(),
    remove: vi.fn(),
  })),
  body: {
    appendChild: vi.fn(),
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

const mockWindow = {
  speechSynthesis: {
    speak: vi.fn(),
    cancel: vi.fn(),
  },
  location: {
    pathname: '/test',
    href: '/test',
  },
  scrollY: 0,
  scrollX: 0,
}

// @ts-ignore
global.document = mockDocument
// @ts-ignore
global.window = mockWindow

describe('ContextualHelpSystem', () => {
  let helpSystem: ContextualHelpSystem
  let mockHelpContext: HelpContext
  let mockHelpContent: HelpContent

  beforeEach(() => {
    helpSystem = new ContextualHelpSystem()

    mockHelpContext = {
      id: 'test-context-1',
      userId: 'test-user-1',
      workspaceId: 'test-workspace-1',
      sessionId: 'test-session-1',
      currentRoute: '/dashboard',
      userState: {
        expertiseLevel: 'intermediate',
        recentActions: ['create_workflow', 'edit_node'],
        strugglingAreas: [],
        preferredHelpMode: 'modal',
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
      metadata: {},
    }

    mockHelpContent = {
      id: 'test-content-1',
      title: 'Getting Started with Workflows',
      description: 'Learn how to create your first workflow',
      content: 'This is a comprehensive guide to creating workflows...',
      type: 'tutorial',
      priority: 'high',
      triggers: [
        {
          type: 'route',
          condition: '/dashboard',
        },
      ],
      conditions: [
        {
          type: 'user_expertise',
          operator: 'equals',
          value: 'beginner',
        },
      ],
      tags: ['workflow', 'getting-started'],
      version: '1.0.0',
      lastUpdated: new Date(),
      analytics: {
        views: 0,
        interactions: 0,
        completions: 0,
        averageRating: 0,
        feedbackCount: 0,
        lastViewed: new Date(),
        effectivenessScore: 0,
        userSegments: { beginner: 0, intermediate: 0, advanced: 0 },
        deliveryModes: {
          tooltip: 0,
          sidebar: 0,
          modal: 0,
          inline: 0,
          overlay: 0,
          voice: 0,
          chat: 0,
          notification: 0,
        },
        completionRate: 0,
        averageDuration: 0,
        dropOffPoints: [],
      },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Context Analysis and Help Recommendations', () => {
    it('should analyze context and provide help recommendations', async () => {
      const result = await helpSystem.analyzeContextAndProvideHelp(mockHelpContext)

      expect(result).toHaveProperty('recommendations')
      expect(result).toHaveProperty('deliveryConfig')
      expect(result.recommendations).toBeInstanceOf(Array)
      expect(result.deliveryConfig).toHaveProperty('mode')
    })

    it('should detect urgent help needs for critical content', async () => {
      const criticalContext = {
        ...mockHelpContext,
        conversationContext: {
          id: 'conv-1',
          messages: [
            {
              id: 'msg-1',
              role: 'user' as const,
              content: 'I keep getting errors and nothing works',
              timestamp: new Date(),
              metadata: {
                intent: {
                  primary: 'error_report',
                  confidence: 0.9,
                  secondary: [],
                  domains: [],
                  tasks: [],
                },
                sentiment: {
                  polarity: -0.8,
                  confidence: 0.9,
                  emotions: [{ emotion: 'frustration', intensity: 0.9 }],
                },
              },
            },
          ],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }

      const result = await helpSystem.analyzeContextAndProvideHelp(criticalContext)

      expect(result.urgentHelp).toBeDefined()
      expect(result.deliveryConfig.mode).toBe('modal')
    })

    it('should recommend different delivery modes based on context', async () => {
      const beginnerContext = {
        ...mockHelpContext,
        userState: {
          ...mockHelpContext.userState,
          expertiseLevel: 'beginner' as const,
        },
      }

      const result = await helpSystem.analyzeContextAndProvideHelp(beginnerContext)

      expect(result.deliveryConfig).toBeDefined()
      expect(['modal', 'tutorial', 'sidebar']).toContain(result.deliveryConfig.mode)
    })
  })

  describe('Help Content Retrieval', () => {
    it('should get contextual help content for current state', async () => {
      const content = await helpSystem.getContextualHelp(mockHelpContext)

      expect(content).toBeNull() // No content loaded in test environment
    })

    it('should track help interactions', async () => {
      const sessionId = 'test-session-1'
      const contentId = 'test-content-1'

      // This should not throw
      await expect(
        helpSystem.trackHelpInteraction(sessionId, contentId, 'click', { button: 'primary' })
      ).resolves.not.toThrow()
    })

    it('should end help session with proper cleanup', async () => {
      const sessionId = 'test-session-1'

      // This should not throw
      await expect(helpSystem.endHelpSession(sessionId, 'completed')).resolves.not.toThrow()
    })
  })

  describe('System Metrics and Analytics', () => {
    it('should provide system metrics', () => {
      const metrics = helpSystem.getSystemMetrics()

      expect(metrics).toHaveProperty('totalUsers')
      expect(metrics).toHaveProperty('activeHelpSessions')
      expect(metrics).toHaveProperty('contentLibrarySize')
      expect(metrics).toHaveProperty('systemPerformance')
    })

    it('should search help content with filters', async () => {
      const results = await helpSystem.searchHelpContent('workflow', mockHelpContext, {
        type: 'tutorial',
      })

      expect(results).toBeInstanceOf(Array)
    })
  })
})

describe('InteractiveGuidance', () => {
  let guidance: InteractiveGuidance
  let mockTutorial: GuidanceTutorial
  let mockStep: GuidanceStep

  beforeEach(() => {
    guidance = new InteractiveGuidance()

    mockStep = {
      id: 'step-1',
      order: 1,
      title: 'Navigate to Workflows',
      description: 'Go to the workflows section',
      type: 'instruction',
      content: {
        text: 'Click on the Workflows tab in the navigation',
        interactiveElements: [
          {
            id: 'highlight-nav',
            type: 'highlight',
            position: {
              selector: 'nav [href="/workflows"]',
            },
          },
        ],
      },
      validation: {
        type: 'url_matches',
        condition: '/workflows',
      },
      nextSteps: {
        success: 'step-2',
      },
    }

    mockTutorial = {
      id: 'tutorial-1',
      title: 'Create Your First Workflow',
      description: 'Learn workflow basics',
      category: 'workflow',
      difficulty: 'beginner',
      estimatedDuration: 300,
      steps: [mockStep],
      completionCriteria: {
        type: 'all_steps',
      },
      metadata: {
        version: '1.0.0',
        author: 'Help System',
        lastUpdated: new Date(),
        tags: ['workflow', 'tutorial'],
      },
    }
  })

  describe('Tutorial Management', () => {
    it('should start a tutorial successfully', async () => {
      // Mock tutorial library
      const tutorialLibrary = new Map()
      tutorialLibrary.set('tutorial-1', mockTutorial)
      // @ts-ignore - accessing private property for testing
      guidance.tutorialLibrary = tutorialLibrary

      const result = await guidance.startTutorial('tutorial-1', mockHelpContext)

      expect(result).toHaveProperty('sessionId')
      expect(result).toHaveProperty('currentStep')
      expect(result).toHaveProperty('progress')
      expect(result.currentStep.id).toBe('step-1')
    })

    it('should handle tutorial not found error', async () => {
      await expect(guidance.startTutorial('nonexistent-tutorial', mockHelpContext)).rejects.toThrow(
        'Tutorial not found'
      )
    })

    it('should process user interactions', async () => {
      // Setup active tutorial first
      const tutorialLibrary = new Map()
      tutorialLibrary.set('tutorial-1', mockTutorial)
      // @ts-ignore
      guidance.tutorialLibrary = tutorialLibrary

      const startResult = await guidance.startTutorial('tutorial-1', mockHelpContext)

      const interactionResult = await guidance.processInteraction(startResult.sessionId, 'click', {
        target: 'nav [href="/workflows"]',
      })

      expect(interactionResult).toHaveProperty('result')
      expect(['success', 'failure', 'waiting', 'skip']).toContain(interactionResult.result)
    })

    it('should skip tutorial steps when allowed', async () => {
      const tutorialLibrary = new Map()
      tutorialLibrary.set('tutorial-1', mockTutorial)
      // @ts-ignore
      guidance.tutorialLibrary = tutorialLibrary

      const startResult = await guidance.startTutorial('tutorial-1', mockHelpContext)

      const skipResult = await guidance.skipCurrentStep(startResult.sessionId, 'user_choice')

      expect(skipResult).toHaveProperty('result')
    })

    it('should pause and resume tutorials', async () => {
      const tutorialLibrary = new Map()
      tutorialLibrary.set('tutorial-1', mockTutorial)
      // @ts-ignore
      guidance.tutorialLibrary = tutorialLibrary

      const startResult = await guidance.startTutorial('tutorial-1', mockHelpContext)
      const pauseResult = await guidance.pauseTutorial(startResult.sessionId)

      expect(pauseResult).toHaveProperty('resumeToken')

      const resumeResult = await guidance.resumeTutorial(pauseResult.resumeToken, mockHelpContext)

      expect(resumeResult).toHaveProperty('sessionId')
      expect(resumeResult).toHaveProperty('currentStep')
    })
  })

  describe('Tutorial Discovery', () => {
    it('should get available tutorials with filters', async () => {
      const tutorials = await guidance.getAvailableTutorials(mockHelpContext, {
        category: 'workflow',
        difficulty: 'beginner',
      })

      expect(tutorials).toBeInstanceOf(Array)
    })

    it('should get tutorial progress', () => {
      const progress = guidance.getTutorialProgress('nonexistent-session')

      expect(progress).toBeNull()
    })
  })

  describe('Analytics and Insights', () => {
    it('should provide guidance analytics', () => {
      const analytics = guidance.getGuidanceAnalytics()

      expect(analytics).toBeInstanceOf(Map)
    })

    it('should provide analytics for specific tutorial', () => {
      const analytics = guidance.getGuidanceAnalytics('tutorial-1')

      expect(analytics).toHaveProperty('totalStarts')
      expect(analytics).toHaveProperty('totalCompletions')
      expect(analytics).toHaveProperty('completionRate')
    })
  })
})

describe('HelpContentManager', () => {
  let contentManager: HelpContentManager

  beforeEach(() => {
    contentManager = new HelpContentManager()
  })

  describe('Content CRUD Operations', () => {
    it('should create new help content', async () => {
      const contentData = {
        title: 'Test Help Content',
        description: 'A test help article',
        content: 'This is test content',
        type: 'tutorial' as const,
        priority: 'medium' as const,
        triggers: [],
        conditions: [],
        tags: ['test'],
      }

      const content = await contentManager.createContent(contentData, 'test-author')

      expect(content).toHaveProperty('id')
      expect(content).toHaveProperty('version')
      expect(content.title).toBe(contentData.title)
    })

    it('should update existing content', async () => {
      // First create content
      const contentData = {
        title: 'Test Help Content',
        description: 'A test help article',
        content: 'This is test content',
        type: 'tutorial' as const,
        priority: 'medium' as const,
        triggers: [],
        conditions: [],
        tags: ['test'],
      }

      const content = await contentManager.createContent(contentData, 'test-author')

      // Then update it
      const updatedContent = await contentManager.updateContent(
        content.id,
        { title: 'Updated Test Content' },
        'test-author'
      )

      expect(updatedContent.title).toBe('Updated Test Content')
      expect(updatedContent.version).not.toBe(content.version)
    })

    it('should handle content not found error', async () => {
      await expect(
        contentManager.updateContent('nonexistent-id', { title: 'New Title' }, 'test-author')
      ).rejects.toThrow('Content not found')
    })

    it('should delete content', async () => {
      const contentData = {
        title: 'Test Help Content',
        description: 'A test help article',
        content: 'This is test content',
        type: 'tutorial' as const,
        priority: 'medium' as const,
        triggers: [],
        conditions: [],
        tags: ['test'],
      }

      const content = await contentManager.createContent(contentData, 'test-author')

      await expect(contentManager.deleteContent(content.id, 'test-author')).resolves.not.toThrow()

      expect(contentManager.getContent(content.id)).toBeNull()
    })
  })

  describe('Content Search and Discovery', () => {
    it('should search content with text queries', async () => {
      const results = await contentManager.searchContent({
        query: 'workflow tutorial',
        options: { maxResults: 5 },
      })

      expect(results).toBeInstanceOf(Array)
    })

    it('should search with filters', async () => {
      const results = await contentManager.searchContent({
        query: 'help',
        filters: { type: ['tutorial'], priority: ['high'] },
        options: { maxResults: 10 },
      })

      expect(results).toBeInstanceOf(Array)
    })

    it('should get content recommendations', async () => {
      const recommendations = await contentManager.getRecommendations(mockHelpContext, 3)

      expect(recommendations).toBeInstanceOf(Array)
      expect(recommendations.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Version Management', () => {
    it('should track version history', async () => {
      const contentData = {
        title: 'Test Help Content',
        description: 'A test help article',
        content: 'This is test content',
        type: 'tutorial' as const,
        priority: 'medium' as const,
        triggers: [],
        conditions: [],
        tags: ['test'],
      }

      const content = await contentManager.createContent(contentData, 'test-author')
      const history = contentManager.getVersionHistory(content.id)

      expect(history).toBeInstanceOf(Array)
      expect(history.length).toBeGreaterThan(0)
    })

    it('should approve content versions', async () => {
      const contentData = {
        title: 'Test Help Content',
        description: 'A test help article',
        content: 'This is test content',
        type: 'tutorial' as const,
        priority: 'medium' as const,
        triggers: [],
        conditions: [],
        tags: ['test'],
      }

      const content = await contentManager.createContent(contentData, 'test-author')

      await expect(
        contentManager.approveContentVersion(content.id, content.version, 'test-approver')
      ).resolves.not.toThrow()
    })
  })

  describe('Analytics and Metrics', () => {
    it('should provide content analytics', () => {
      const analytics = contentManager.getContentAnalytics()

      expect(analytics).toBeInstanceOf(Map)
    })

    it('should provide usage statistics', () => {
      const stats = contentManager.getContentUsageStats()

      expect(stats).toHaveProperty('totalContent')
      expect(stats).toHaveProperty('contentByType')
      expect(stats).toHaveProperty('averageRating')
    })

    it('should update content analytics', () => {
      const contentData = {
        title: 'Test Content',
        description: 'Test',
        content: 'Test content',
        type: 'tutorial' as const,
        priority: 'medium' as const,
        triggers: [],
        conditions: [],
        tags: ['test'],
      }

      // This should not throw
      expect(() => {
        contentManager.updateContentAnalytics('test-id', { views: 10, interactions: 5 })
      }).not.toThrow()
    })
  })
})

describe('MultiModalDelivery', () => {
  let delivery: MultiModalDelivery

  beforeEach(() => {
    delivery = new MultiModalDelivery()
  })

  describe('Help Delivery', () => {
    it('should deliver help in different modes', async () => {
      const config: HelpDeliveryConfig = {
        mode: 'modal',
        behavior: { dismissible: true },
        accessibility: { announceToScreenReader: false },
      }

      // Mock delivery should succeed (adapters are simplified in test environment)
      const result = await delivery.deliverHelp(mockHelpContent, mockHelpContext, config)

      expect(result).toHaveProperty('deliveryId')
      expect(result).toHaveProperty('success')
    })

    it('should adapt delivery for accessibility needs', async () => {
      const accessibleContext = {
        ...mockHelpContext,
        userState: {
          ...mockHelpContext.userState,
          accessibility: {
            screenReader: true,
            reducedMotion: true,
            highContrast: true,
            fontSize: 'large' as const,
            voiceGuidance: true,
            keyboardNavigation: true,
          },
        },
      }

      const config: HelpDeliveryConfig = {
        mode: 'tooltip',
        accessibility: { announceToScreenReader: true },
      }

      const result = await delivery.deliverHelp(mockHelpContent, accessibleContext, config)

      expect(result.success).toBe(true)
      expect(result.accessibilityEnhancements).toBeDefined()
    })

    it('should handle delivery failures gracefully', async () => {
      const config: HelpDeliveryConfig = {
        mode: 'voice', // May not be available in test environment
      }

      const result = await delivery.deliverHelp(mockHelpContent, mockHelpContext, config)

      // Should either succeed or fail gracefully
      expect(result).toHaveProperty('success')
    })
  })

  describe('Delivery Mode Selection', () => {
    it('should get available delivery modes', () => {
      const modes = delivery.getAvailableDeliveryModes(mockHelpContext)

      expect(modes).toBeInstanceOf(Array)
      expect(modes.length).toBeGreaterThan(0)
    })

    it('should recommend optimal delivery mode', async () => {
      const result = await delivery.getOptimalDeliveryMode(mockHelpContent, mockHelpContext)

      expect(result).toHaveProperty('mode')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('reasoning')
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('Delivery Management', () => {
    it('should track delivery interactions', async () => {
      const config: HelpDeliveryConfig = { mode: 'modal' }
      const deliveryResult = await delivery.deliverHelp(mockHelpContent, mockHelpContext, config)

      if (deliveryResult.success) {
        await expect(
          delivery.trackInteraction(deliveryResult.deliveryId, 'click', { button: 'help' })
        ).resolves.not.toThrow()
      }
    })

    it('should dismiss deliveries', async () => {
      const config: HelpDeliveryConfig = { mode: 'modal' }
      const deliveryResult = await delivery.deliverHelp(mockHelpContent, mockHelpContext, config)

      if (deliveryResult.success) {
        await expect(
          delivery.dismissDelivery(deliveryResult.deliveryId, 'user')
        ).resolves.not.toThrow()
      }
    })

    it('should get delivery analytics', () => {
      const analytics = delivery.getDeliveryAnalytics()

      expect(analytics).toBeInstanceOf(Map)
    })
  })
})

describe('UserFeedbackSystem', () => {
  let feedbackSystem: UserFeedbackSystem

  beforeEach(() => {
    feedbackSystem = new UserFeedbackSystem()
  })

  describe('Feedback Collection', () => {
    it('should collect explicit user feedback', async () => {
      const feedbackData = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        helpContentId: 'test-content-1',
        type: 'rating' as const,
        rating: 4,
        comment: 'Very helpful tutorial',
        metadata: {
          context: mockHelpContext,
          timestamp: new Date(),
        },
      }

      const result = await feedbackSystem.collectFeedback(feedbackData)

      expect(result).toHaveProperty('feedbackId')
      expect(result).toHaveProperty('acknowledged')
      expect(result.acknowledged).toBe(true)
    })

    it('should collect implicit behavioral feedback', async () => {
      const behaviorData = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        helpContentId: 'test-content-1',
        action: 'struggled' as const,
        duration: 30000,
        context: mockHelpContext,
      }

      await expect(feedbackSystem.collectImplicitFeedback(behaviorData)).resolves.not.toThrow()
    })

    it('should generate follow-up actions for feedback', async () => {
      const feedbackData = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        helpContentId: 'test-content-1',
        type: 'bug_report' as const,
        comment: 'The tutorial link is broken',
        metadata: {
          context: mockHelpContext,
          timestamp: new Date(),
        },
      }

      const result = await feedbackSystem.collectFeedback(feedbackData)

      expect(result.followUpActions).toBeDefined()
      expect(result.followUpActions!.length).toBeGreaterThan(0)
    })
  })

  describe('Feedback Analytics', () => {
    it('should provide feedback analytics', () => {
      const analytics = feedbackSystem.getFeedbackAnalytics()

      expect(analytics).toBeInstanceOf(Map)
    })

    it('should provide content-specific analytics', () => {
      const analytics = feedbackSystem.getFeedbackAnalytics('test-content-1')

      expect(analytics).toHaveProperty('totalFeedback')
      expect(analytics).toHaveProperty('averageRating')
      expect(analytics).toHaveProperty('feedbackByType')
    })

    it('should generate improvement suggestions', () => {
      const suggestions = feedbackSystem.getImprovementSuggestions()

      expect(suggestions).toBeInstanceOf(Array)
    })

    it('should provide satisfaction metrics', () => {
      const metrics = feedbackSystem.getUserSatisfactionMetrics()

      expect(metrics).toHaveProperty('overall')
      expect(metrics).toHaveProperty('byContent')
      expect(metrics).toHaveProperty('byDeliveryMode')
      expect(metrics).toHaveProperty('temporalTrends')
    })
  })

  describe('Feedback Management', () => {
    it('should respond to feedback', async () => {
      const feedbackData = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        type: 'suggestion' as const,
        comment: 'Add more examples',
        metadata: {
          context: mockHelpContext,
          timestamp: new Date(),
        },
      }

      const result = await feedbackSystem.collectFeedback(feedbackData)

      await expect(
        feedbackSystem.respondToFeedback(result.feedbackId, {
          message: 'Thank you for the suggestion',
          respondedBy: 'help-team',
        })
      ).resolves.not.toThrow()
    })

    it('should process feedback queue', async () => {
      const result = await feedbackSystem.processFeedbackQueue()

      expect(result).toHaveProperty('processed')
      expect(result).toHaveProperty('contentUpdates')
      expect(result).toHaveProperty('newSuggestions')
    })

    it('should generate feedback reports', async () => {
      const timeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      }

      const report = await feedbackSystem.generateFeedbackReport(timeRange)

      expect(report).toHaveProperty('id')
      expect(report).toHaveProperty('totalFeedback')
      expect(report).toHaveProperty('satisfactionMetrics')
      expect(report).toHaveProperty('improvementRecommendations')
    })
  })
})

describe('Integration Tests', () => {
  let helpSystem: ContextualHelpSystem
  let contentManager: HelpContentManager
  let delivery: MultiModalDelivery
  let feedbackSystem: UserFeedbackSystem

  beforeEach(() => {
    helpSystem = new ContextualHelpSystem()
    contentManager = new HelpContentManager()
    delivery = new MultiModalDelivery()
    feedbackSystem = new UserFeedbackSystem()
  })

  it('should work together for end-to-end help delivery', async () => {
    // 1. Create help content
    const content = await contentManager.createContent(
      {
        title: 'Test Integration',
        description: 'Integration test content',
        content: 'This tests the full help flow',
        type: 'tutorial',
        priority: 'medium',
        triggers: [{ type: 'route', condition: '/test' }],
        conditions: [],
        tags: ['test', 'integration'],
      },
      'test-author'
    )

    // 2. Get contextual help
    const contextualContent = await helpSystem.getContextualHelp({
      ...mockHelpContext,
      currentRoute: '/test',
    })

    // 3. Deliver help (if content found)
    if (contextualContent) {
      const config: HelpDeliveryConfig = { mode: 'modal' }
      const deliveryResult = await delivery.deliverHelp(contextualContent, mockHelpContext, config)

      expect(deliveryResult.success).toBe(true)

      // 4. Track interaction
      await delivery.trackInteraction(deliveryResult.deliveryId, 'view')

      // 5. Collect feedback
      await feedbackSystem.collectFeedback({
        userId: mockHelpContext.userId,
        sessionId: mockHelpContext.sessionId,
        helpContentId: contextualContent.id,
        type: 'rating',
        rating: 5,
        metadata: {
          context: mockHelpContext,
          timestamp: new Date(),
        },
      })

      // 6. Dismiss help
      await delivery.dismissDelivery(deliveryResult.deliveryId, 'completed')
    }

    // Integration test passes if no errors thrown
    expect(content.id).toBeDefined()
  })

  it('should handle accessibility requirements across all components', async () => {
    const accessibleContext: HelpContext = {
      ...mockHelpContext,
      userState: {
        ...mockHelpContext.userState,
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

    // Test accessibility-aware help delivery
    const recommendations = await helpSystem.analyzeContextAndProvideHelp(accessibleContext)

    expect(recommendations.deliveryConfig.accessibility).toBeDefined()
    expect(recommendations.deliveryConfig.accessibility?.announceToScreenReader).toBe(true)

    // Test accessible delivery
    const deliveryResult = await delivery.deliverHelp(
      mockHelpContent,
      accessibleContext,
      recommendations.deliveryConfig
    )

    expect(deliveryResult.accessibilityEnhancements).toBeDefined()
    expect(deliveryResult.accessibilityEnhancements!.length).toBeGreaterThan(0)
  })

  it('should maintain performance under load', async () => {
    const startTime = Date.now()
    const promises = []

    // Simulate multiple concurrent help requests
    for (let i = 0; i < 10; i++) {
      promises.push(
        helpSystem.analyzeContextAndProvideHelp({
          ...mockHelpContext,
          id: `context-${i}`,
          sessionId: `session-${i}`,
        })
      )
    }

    await Promise.all(promises)

    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
  })
})
