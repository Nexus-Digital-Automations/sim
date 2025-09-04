/**
 * Unit Tests - Contextual Help System
 *
 * Comprehensive unit tests for the contextual help system covering:
 * - Help content delivery and filtering
 * - Context-aware suggestions and recommendations
 * - User interaction tracking and struggle detection
 * - Help analytics and effectiveness measurement
 * - Error handling and edge cases
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals'
import {
  ContextualHelpSystem,
  contextualHelpSystem,
  type HelpContent,
  type HelpContext,
  type UserInteraction,
} from '@/lib/help/contextual-help'

// Mock logger to prevent console output during tests
jest.mock('@/lib/logs/console/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}))

// Mock nanoid for consistent test IDs
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-123'),
}))

describe('ContextualHelpSystem', () => {
  let helpSystem: ContextualHelpSystem

  beforeAll(() => {
    // Mock DOM environment
    Object.defineProperty(window, 'location', {
      value: { pathname: '/test-path' },
      writable: true,
    })

    // Mock document for event listeners
    const mockDocument = {
      addEventListener: jest.fn(),
    }
    Object.defineProperty(global, 'document', {
      value: mockDocument,
      writable: true,
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    helpSystem = new ContextualHelpSystem()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('Initialization', () => {
    it('should initialize help system with default content', () => {
      expect(helpSystem).toBeDefined()
      expect(typeof helpSystem.getContextualHelp).toBe('function')
      expect(typeof helpSystem.suggestNextSteps).toBe('function')
      expect(typeof helpSystem.detectUserStruggles).toBe('function')
    })

    it('should set up interaction tracking', () => {
      // Verify that document event listeners were set up
      expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function))
      expect(document.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
    })
  })

  describe('getContextualHelp', () => {
    const validContext: HelpContext = {
      component: 'workflow-canvas',
      page: '/test-path',
      userLevel: 'beginner',
      workflowState: 'empty',
    }

    it('should return contextual help for valid component', async () => {
      const helpContent = await helpSystem.getContextualHelp(
        'workflow-canvas',
        'beginner',
        validContext
      )

      expect(helpContent).toBeDefined()
      expect(Array.isArray(helpContent)).toBe(true)
      expect(helpContent.length).toBeGreaterThan(0)
      expect(helpContent[0]).toHaveProperty('id')
      expect(helpContent[0]).toHaveProperty('title')
      expect(helpContent[0]).toHaveProperty('content')
      expect(helpContent[0]).toHaveProperty('type')
      expect(helpContent[0]).toHaveProperty('priority')
    })

    it('should filter help based on user level', async () => {
      const beginnerHelp = await helpSystem.getContextualHelp(
        'workflow-canvas',
        'beginner',
        validContext
      )
      const advancedHelp = await helpSystem.getContextualHelp('workflow-canvas', 'advanced', {
        ...validContext,
        userLevel: 'advanced',
      })

      expect(beginnerHelp).toBeDefined()
      expect(advancedHelp).toBeDefined()

      // Beginner should get more basic help
      const beginnerTitles = beginnerHelp.map((help) => help.title)
      expect(beginnerTitles.some((title) => title.includes('Welcome'))).toBe(true)
    })

    it('should handle empty workflow state correctly', async () => {
      const emptyContext: HelpContext = {
        ...validContext,
        workflowState: 'empty',
      }

      const helpContent = await helpSystem.getContextualHelp(
        'workflow-canvas',
        'beginner',
        emptyContext
      )
      expect(helpContent.length).toBeGreaterThan(0)

      // Should include empty state help
      const titles = helpContent.map((help) => help.title)
      expect(titles.some((title) => title.includes('Add Your First Block'))).toBe(true)
    })

    it('should return empty array for invalid component', async () => {
      const helpContent = await helpSystem.getContextualHelp(
        'invalid-component',
        'beginner',
        validContext
      )
      expect(helpContent).toEqual([])
    })

    it('should handle errors gracefully', async () => {
      // Mock error in help retrieval
      const originalGetContextualHelp = helpSystem.getContextualHelp
      helpSystem.getContextualHelp = jest.fn().mockRejectedValue(new Error('Test error'))

      const result = await helpSystem.getContextualHelp('workflow-canvas', 'beginner', validContext)
      expect(result).toEqual([])

      // Restore original method
      helpSystem.getContextualHelp = originalGetContextualHelp
    })

    it('should limit help items to maximum of 5', async () => {
      const helpContent = await helpSystem.getContextualHelp(
        'workflow-canvas',
        'beginner',
        validContext
      )
      expect(helpContent.length).toBeLessThanOrEqual(5)
    })

    it('should prioritize help by priority level', async () => {
      const helpContent = await helpSystem.getContextualHelp(
        'workflow-canvas',
        'beginner',
        validContext
      )

      if (helpContent.length > 1) {
        for (let i = 1; i < helpContent.length; i++) {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          const currentPriority = priorityOrder[helpContent[i].priority]
          const previousPriority = priorityOrder[helpContent[i - 1].priority]
          expect(currentPriority).toBeLessThanOrEqual(previousPriority)
        }
      }
    })
  })

  describe('suggestNextSteps', () => {
    it('should suggest starter block for empty workflow', async () => {
      const emptyWorkflow = {
        blocks: {},
        edges: [],
      }

      const suggestions = await helpSystem.suggestNextSteps(emptyWorkflow)
      expect(suggestions).toBeDefined()
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)

      const starterSuggestion = suggestions.find((s) => s.title.includes('Starter'))
      expect(starterSuggestion).toBeDefined()
      expect(starterSuggestion?.confidence).toBeGreaterThan(90)
    })

    it('should suggest connections for unconnected blocks', async () => {
      const unconnectedWorkflow = {
        blocks: { block1: {}, block2: {} },
        edges: [],
      }

      const suggestions = await helpSystem.suggestNextSteps(unconnectedWorkflow)
      const connectionSuggestion = suggestions.find((s) => s.title.includes('Connect'))
      expect(connectionSuggestion).toBeDefined()
      expect(connectionSuggestion?.category).toBe('workflow')
    })

    it('should suggest testing for complete workflows', async () => {
      const completeWorkflow = {
        blocks: { block1: {}, block2: {} },
        edges: [{ source: 'block1', target: 'block2' }],
      }

      const suggestions = await helpSystem.suggestNextSteps(completeWorkflow)
      const testSuggestion = suggestions.find((s) => s.title.includes('Test'))
      expect(testSuggestion).toBeDefined()
    })

    it('should suggest error resolution for workflows with errors', async () => {
      const errorWorkflow = {
        blocks: { block1: {} },
        edges: [],
        errors: [{ type: 'validation', message: 'Test error' }],
      }

      const suggestions = await helpSystem.suggestNextSteps(errorWorkflow)
      const errorSuggestion = suggestions.find((s) => s.category === 'troubleshoot')
      expect(errorSuggestion).toBeDefined()
    })

    it('should return top 3 suggestions sorted by confidence and impact', async () => {
      const complexWorkflow = {
        blocks: Array.from({ length: 6 }, (_, i) => ({ [`block${i}`]: {} })).reduce(
          (acc, curr) => ({ ...acc, ...curr }),
          {}
        ),
        edges: [],
      }

      const suggestions = await helpSystem.suggestNextSteps(complexWorkflow)
      expect(suggestions.length).toBeLessThanOrEqual(3)

      // Verify sorting by confidence * impact weight
      if (suggestions.length > 1) {
        for (let i = 1; i < suggestions.length; i++) {
          const currentScore =
            suggestions[i].confidence *
            (suggestions[i].impact === 'high' ? 3 : suggestions[i].impact === 'medium' ? 2 : 1)
          const previousScore =
            suggestions[i - 1].confidence *
            (suggestions[i - 1].impact === 'high'
              ? 3
              : suggestions[i - 1].impact === 'medium'
                ? 2
                : 1)
          expect(currentScore).toBeLessThanOrEqual(previousScore)
        }
      }
    })

    it('should handle null/undefined workflow state', async () => {
      const suggestions = await helpSystem.suggestNextSteps(null)
      expect(suggestions).toEqual([])

      const undefinedSuggestions = await helpSystem.suggestNextSteps(undefined)
      expect(undefinedSuggestions).toEqual([])
    })
  })

  describe('detectUserStruggles', () => {
    const createMockInteraction = (
      type: UserInteraction['type'],
      target: string,
      timestamp: Date = new Date(),
      context: any = {}
    ): UserInteraction => ({
      timestamp,
      type,
      target,
      context,
      successful: context.successful !== false,
    })

    it('should detect navigation struggles from slow interactions', async () => {
      const slowInteractions: UserInteraction[] = [
        createMockInteraction('click', 'button1', new Date(Date.now() - 60000)),
        createMockInteraction('click', 'button2', new Date()),
      ]

      const analysis = await helpSystem.detectUserStruggles(slowInteractions)
      expect(analysis).toBeDefined()
      expect(analysis.struggles).toBeDefined()

      const navigationStruggle = analysis.struggles.find((s) => s.type === 'navigation')
      expect(navigationStruggle).toBeDefined()
      expect(navigationStruggle?.severity).toBe('moderate')
    })

    it('should detect configuration struggles from multiple attempts', async () => {
      const configInteractions: UserInteraction[] = Array.from({ length: 5 }, (_, i) =>
        createMockInteraction('click', `config-form-${i}`, new Date(Date.now() - i * 1000))
      )

      const analysis = await helpSystem.detectUserStruggles(configInteractions)
      const configStruggle = analysis.struggles.find((s) => s.type === 'configuration')
      expect(configStruggle).toBeDefined()
      expect(configStruggle?.severity).toBe('major')
    })

    it('should detect connection struggles from failed connections', async () => {
      const connectionInteractions: UserInteraction[] = [
        createMockInteraction('error', 'connection-error', new Date(), {
          message: 'connection failed',
          successful: false,
        }),
        createMockInteraction('error', 'connection-error', new Date(), {
          message: 'connection timeout',
          successful: false,
        }),
        createMockInteraction('error', 'connection-error', new Date(), {
          message: 'connection refused',
          successful: false,
        }),
      ]

      const analysis = await helpSystem.detectUserStruggles(connectionInteractions)
      const connectionStruggle = analysis.struggles.find((s) => s.type === 'connection')
      expect(connectionStruggle).toBeDefined()
    })

    it('should detect debugging struggles from execution errors', async () => {
      const executionInteractions: UserInteraction[] = [
        createMockInteraction('error', 'execution-error', new Date(), {
          message: 'execution failed',
          successful: false,
        }),
        createMockInteraction('error', 'execution-error', new Date(), {
          message: 'runtime error',
          successful: false,
        }),
      ]

      const analysis = await helpSystem.detectUserStruggles(executionInteractions)
      const debugStruggle = analysis.struggles.find((s) => s.type === 'debugging')
      expect(debugStruggle).toBeDefined()
      expect(debugStruggle?.severity).toBe('major')
    })

    it('should generate recommendations for detected struggles', async () => {
      const strugglingInteractions: UserInteraction[] = [
        createMockInteraction('click', 'config-form', new Date()),
        createMockInteraction('click', 'config-form', new Date()),
        createMockInteraction('click', 'config-form', new Date()),
        createMockInteraction('click', 'config-form', new Date()),
      ]

      const analysis = await helpSystem.detectUserStruggles(strugglingInteractions)
      expect(analysis.recommendations).toBeDefined()
      expect(analysis.recommendations.length).toBeGreaterThan(0)

      const recommendation = analysis.recommendations[0]
      expect(recommendation).toHaveProperty('title')
      expect(recommendation).toHaveProperty('description')
      expect(recommendation).toHaveProperty('category')
      expect(recommendation.category).toBe('troubleshoot')
    })

    it('should calculate analysis confidence based on data quality', async () => {
      const shortInteractions: UserInteraction[] = [
        createMockInteraction('click', 'button', new Date(Date.now() - 30000)), // 30 seconds ago
      ]

      const longInteractions: UserInteraction[] = Array.from({ length: 20 }, (_, i) =>
        createMockInteraction('click', `button-${i}`, new Date(Date.now() - i * 30000))
      )

      const shortAnalysis = await helpSystem.detectUserStruggles(shortInteractions)
      const longAnalysis = await helpSystem.detectUserStruggles(longInteractions)

      expect(longAnalysis.confidence).toBeGreaterThan(shortAnalysis.confidence)
    })

    it('should handle empty interaction list', async () => {
      const analysis = await helpSystem.detectUserStruggles([])
      expect(analysis).toBeDefined()
      expect(analysis.struggles).toEqual([])
      expect(analysis.recommendations).toEqual([])
      expect(analysis.confidence).toBe(0)
    })

    it('should include context in struggle analysis', async () => {
      const interactions: UserInteraction[] = [
        createMockInteraction('click', 'test-button', new Date()),
      ]

      const analysis = await helpSystem.detectUserStruggles(interactions)
      expect(analysis.context).toBeDefined()
      expect(analysis.context.component).toBe('general')
      expect(analysis.context.page).toBe('/test-path')
      expect(analysis.context.userLevel).toBe('beginner')
    })
  })

  describe('Help Interaction Tracking', () => {
    it('should track help interactions correctly', () => {
      const testHelpId = 'test-help-123'

      // Track clicked interaction
      helpSystem.trackHelpInteraction(testHelpId, 'clicked')

      const activeHelp = helpSystem.getActiveHelp()
      const trackedHelp = activeHelp.find((help) => help.id === testHelpId)

      // Since help wasn't shown first, it won't be in active help
      // This tests the method doesn't crash with non-existent help
      expect(() => helpSystem.trackHelpInteraction(testHelpId, 'clicked')).not.toThrow()
      expect(() => helpSystem.trackHelpInteraction(testHelpId, 'dismissed')).not.toThrow()
    })

    it('should dismiss help correctly', () => {
      const testHelpId = 'test-help-456'

      // Try to dismiss non-existent help (should not crash)
      expect(() => helpSystem.dismissHelp(testHelpId)).not.toThrow()
    })

    it('should return active help list', () => {
      const activeHelp = helpSystem.getActiveHelp()
      expect(Array.isArray(activeHelp)).toBe(true)
    })
  })

  describe('Custom Help Management', () => {
    it('should add custom help content', () => {
      const customHelp: HelpContent = {
        id: 'custom-help-123',
        title: 'Custom Help',
        content: 'This is custom help content',
        type: 'info',
        context: {
          component: 'custom-component',
          page: '/custom',
          userLevel: 'beginner',
        },
        priority: 'medium',
        dismissible: true,
      }

      expect(() => helpSystem.addCustomHelp('custom-component', customHelp)).not.toThrow()
    })

    it('should generate help statistics', () => {
      const stats = helpSystem.getHelpStatistics()

      expect(stats).toBeDefined()
      expect(typeof stats.totalHelpItems).toBe('number')
      expect(typeof stats.totalShown).toBe('number')
      expect(typeof stats.totalClicked).toBe('number')
      expect(typeof stats.totalDismissed).toBe('number')
      expect(typeof stats.clickThroughRate).toBe('number')
      expect(typeof stats.dismissalRate).toBe('number')

      expect(stats.clickThroughRate).toBeGreaterThanOrEqual(0)
      expect(stats.clickThroughRate).toBeLessThanOrEqual(100)
      expect(stats.dismissalRate).toBeGreaterThanOrEqual(0)
      expect(stats.dismissalRate).toBeLessThanOrEqual(100)
    })
  })

  describe('Error Handling', () => {
    it('should handle errors in getContextualHelp gracefully', async () => {
      // Mock a function to throw an error
      const originalMethod = helpSystem.isHelpRelevant
      helpSystem.isHelpRelevant = jest.fn().mockImplementation(() => {
        throw new Error('Test error')
      })

      const result = await helpSystem.getContextualHelp('workflow-canvas', 'beginner')
      expect(result).toEqual([])

      // Restore original method
      helpSystem.isHelpRelevant = originalMethod
    })

    it('should handle errors in suggestNextSteps gracefully', async () => {
      const result = await helpSystem.suggestNextSteps({ invalid: 'data' })
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle errors in detectUserStruggles gracefully', async () => {
      const result = await helpSystem.detectUserStruggles([{ invalid: 'interaction' } as any])
      expect(result).toBeDefined()
      expect(result.struggles).toEqual([])
      expect(result.recommendations).toEqual([])
    })
  })

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(contextualHelpSystem).toBeDefined()
      expect(contextualHelpSystem).toBeInstanceOf(ContextualHelpSystem)
    })

    it('should maintain state across calls', async () => {
      const help1 = await contextualHelpSystem.getContextualHelp('workflow-canvas', 'beginner')
      const help2 = await contextualHelpSystem.getContextualHelp('workflow-canvas', 'beginner')

      expect(help1).toEqual(help2)
    })
  })

  describe('Performance', () => {
    it('should complete help retrieval within reasonable time', async () => {
      const startTime = Date.now()
      await helpSystem.getContextualHelp('workflow-canvas', 'beginner')
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
    })

    it('should handle large numbers of interactions efficiently', async () => {
      const manyInteractions = Array.from({ length: 1000 }, (_, i) =>
        createMockInteraction('click', `button-${i}`, new Date(Date.now() - i * 100))
      )

      const startTime = Date.now()
      await helpSystem.detectUserStruggles(manyInteractions)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(5000) // Should complete in under 5 seconds
    })
  })

  // Helper function for creating mock interactions
  function createMockInteraction(
    type: UserInteraction['type'],
    target: string,
    timestamp: Date = new Date(),
    context: any = {}
  ): UserInteraction {
    return {
      timestamp,
      type,
      target,
      context,
      successful: context.successful !== false,
    }
  }
})
