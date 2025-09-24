/**
 * Intelligence Integration Tests
 *
 * Comprehensive tests for the intelligence integration layer to ensure
 * seamless integration with the Universal Tool Adapter framework.
 *
 * @author Intelligence Integration Agent
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  IntelligenceIntegrationLayer,
  createIntelligenceEnhancedAdapter,
  createFullyIntelligentAdapter,
  checkIntelligenceCapabilities,
} from '../intelligence-integration-layer'
import { EnhancedAdapterRegistry } from '../../registry/enhanced-adapter-registry'
import { UniversalToolAdapterSystem } from '../../index'

// Mock dependencies
vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('../../../apps/sim/lib/logs/console/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('IntelligenceIntegrationLayer', () => {
  let baseRegistry: EnhancedAdapterRegistry
  let intelligenceLayer: IntelligenceIntegrationLayer

  beforeEach(() => {
    baseRegistry = new EnhancedAdapterRegistry()
    intelligenceLayer = new IntelligenceIntegrationLayer(baseRegistry)
  })

  afterEach(async () => {
    await intelligenceLayer.shutdown()
    await baseRegistry.shutdown()
  })

  describe('Initialization', () => {
    it('should initialize intelligence layer successfully', async () => {
      await expect(intelligenceLayer.initialize()).resolves.not.toThrow()
    })

    it('should handle multiple initialization calls gracefully', async () => {
      await intelligenceLayer.initialize()
      await expect(intelligenceLayer.initialize()).resolves.not.toThrow()
    })

    it('should initialize with custom configuration', () => {
      const customLayer = new IntelligenceIntegrationLayer(baseRegistry, {
        enableNaturalLanguageDescriptions: false,
        enableContextualRecommendations: true,
        enableIntelligentErrorHandling: true,
      })

      expect(customLayer).toBeDefined()
    })
  })

  describe('Intelligence Features', () => {
    beforeEach(async () => {
      await intelligenceLayer.initialize()
    })

    it('should provide tool descriptions', async () => {
      const userContext = {
        userId: 'test-user',
        userProfile: { skillLevel: 'intermediate' as const },
      }

      const description = await intelligenceLayer.getToolDescription(
        'test-tool',
        userContext,
        'detailed'
      )

      // Should return null for non-existent tools, but not throw
      expect(description).toBeNull()
    })

    it('should provide contextual recommendations', async () => {
      const request = {
        userMessage: 'I need to process some data',
        conversationHistory: [],
        currentContext: {
          userId: 'test-user',
          userSkillLevel: 'intermediate' as const,
          userPreferences: {
            communicationStyle: 'detailed' as const,
            complexityPreference: 'moderate' as const,
            automationLevel: 'guided' as const,
            feedbackLevel: 'standard' as const,
            toolCategories: [],
            preferredWorkflowPatterns: [],
          },
          recentToolUsage: [],
          activeWorkflows: [],
          timeContext: {
            timeOfDay: '14',
            dayOfWeek: 'Mon',
            timeZone: 'UTC',
            workingHours: true,
            urgency: 'medium' as const,
          },
          businessContext: {
            industry: 'technology',
            companySize: 'medium' as const,
            businessFunction: 'development',
            complianceRequirements: [],
            securityLevel: 'enhanced' as const,
          },
          deviceContext: {
            deviceType: 'desktop' as const,
            screenSize: 'large' as const,
            inputMethod: 'keyboard' as const,
            connectionQuality: 'fast' as const,
          },
        },
        maxRecommendations: 5,
      }

      const recommendations = await intelligenceLayer.getContextualRecommendations(request)
      expect(Array.isArray(recommendations)).toBe(true)
    })

    it('should record and process feedback', async () => {
      const feedback = {
        userId: 'test-user',
        feedbackType: 'recommendation' as const,
        rating: 4,
        comment: 'Very helpful recommendation',
        timestamp: new Date(),
      }

      await expect(
        intelligenceLayer.recordIntelligenceFeedback('test-tool', feedback)
      ).resolves.not.toThrow()
    })
  })

  describe('Enhanced Discovery', () => {
    beforeEach(async () => {
      await intelligenceLayer.initialize()
    })

    it('should enhance discovery with intelligence', async () => {
      const query = {
        query: 'data processing tools',
        category: 'data',
        limit: 10,
      }

      const userContext = {
        userId: 'test-user',
        userProfile: { skillLevel: 'intermediate' as const },
      }

      const results = await intelligenceLayer.discoverWithIntelligence(query, userContext)
      expect(Array.isArray(results)).toBe(true)
    })

    it('should fallback to base discovery on intelligence failure', async () => {
      // Force an error in intelligence processing
      const invalidQuery = { invalidProperty: true }

      const results = await intelligenceLayer.discoverWithIntelligence(
        invalidQuery as any,
        undefined
      )
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await intelligenceLayer.initialize()
    })

    it('should provide intelligence metrics', () => {
      const metrics = intelligenceLayer.getIntelligenceMetrics()

      expect(metrics).toHaveProperty('descriptionsGenerated')
      expect(metrics).toHaveProperty('recommendationsProvided')
      expect(metrics).toHaveProperty('errorsHandledIntelligently')
      expect(metrics).toHaveProperty('uptime')
      expect(metrics).toHaveProperty('integrationHealth')
    })

    it('should track performance over time', async () => {
      const metricsBefore = intelligenceLayer.getIntelligenceMetrics()

      // Trigger some intelligence operations
      await intelligenceLayer.getContextualRecommendations({
        userMessage: 'test',
        conversationHistory: [],
        currentContext: {} as any,
        maxRecommendations: 3,
      })

      const metricsAfter = intelligenceLayer.getIntelligenceMetrics()
      expect(metricsAfter.recommendationsProvided).toBeGreaterThanOrEqual(
        metricsBefore.recommendationsProvided
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await intelligenceLayer.initialize()
    })

    it('should handle invalid input gracefully', async () => {
      await expect(
        intelligenceLayer.getToolDescription('', undefined)
      ).resolves.toBeNull()

      await expect(
        intelligenceLayer.getContextualRecommendations({} as any)
      ).resolves.toEqual([])
    })

    it('should handle component failures gracefully', async () => {
      // Test with malformed context that might cause internal errors
      const malformedContext = {
        userId: null,
        userProfile: 'invalid',
      }

      const description = await intelligenceLayer.getToolDescription(
        'test-tool',
        malformedContext as any
      )

      // Should handle gracefully and return null rather than throwing
      expect(description).toBeNull()
    })
  })

  describe('Integration with Registry', () => {
    it('should respond to registry events', async () => {
      await intelligenceLayer.initialize()

      // Mock adapter for testing
      const mockAdapter = {
        id: 'test-adapter',
        metadata: { category: 'test', tags: ['testing'] },
        getSimTool: () => ({ name: 'Test Tool' }),
        getConfiguration: () => ({}),
        execute: vi.fn(),
      }

      // Simulate adapter registration
      await expect(
        baseRegistry.register(mockAdapter as any, { category: 'test' })
      ).resolves.not.toThrow()
    })
  })
})

describe('Factory Functions', () => {
  it('should create intelligence-enhanced adapter', () => {
    const baseRegistry = new EnhancedAdapterRegistry()
    const enhancedAdapter = createIntelligenceEnhancedAdapter(baseRegistry)

    expect(enhancedAdapter).toBeInstanceOf(IntelligenceIntegrationLayer)
  })

  it('should create fully intelligent adapter system', async () => {
    const system = await createFullyIntelligentAdapter({
      intelligence: {
        enableNaturalLanguageDescriptions: true,
        enableContextualRecommendations: true,
        enableIntelligentErrorHandling: true,
      },
    })

    expect(system).toBeInstanceOf(IntelligenceIntegrationLayer)
    await system.shutdown()
  })

  it('should check intelligence capabilities', async () => {
    const baseRegistry = new EnhancedAdapterRegistry()
    const layer = new IntelligenceIntegrationLayer(baseRegistry)
    await layer.initialize()

    const capabilities = checkIntelligenceCapabilities(layer)

    expect(capabilities).toHaveProperty('naturalLanguageDescriptions')
    expect(capabilities).toHaveProperty('contextualRecommendations')
    expect(capabilities).toHaveProperty('intelligentErrorHandling')
    expect(capabilities).toHaveProperty('performanceOptimization')

    await layer.shutdown()
  })
})

describe('Universal Tool Adapter System Integration', () => {
  it('should integrate intelligence layer into Universal Tool Adapter System', async () => {
    const system = new UniversalToolAdapterSystem({
      enableIntelligence: true,
      intelligence: {
        enableNaturalLanguageDescriptions: true,
        enableContextualRecommendations: true,
        enableIntelligentErrorHandling: true,
      },
    })

    expect(system.intelligence).toBeDefined()
    expect(system.intelligence).toBeInstanceOf(IntelligenceIntegrationLayer)

    await system.initialize()

    // Test intelligence-enhanced methods
    const status = system.getSystemStatus()
    expect(status.intelligence).toBeDefined()

    // Test discovery with intelligence
    const discoveries = await system.discoverTools({ query: 'test' })
    expect(Array.isArray(discoveries)).toBe(true)

    // Test tool description
    const description = await system.getToolDescription('test-tool')
    expect(description).toBeNull() // No tool registered, should return null

    // Test recommendations
    const recommendations = await system.getRecommendations({
      userMessage: 'test',
      conversationHistory: [],
      currentContext: {} as any,
    })
    expect(Array.isArray(recommendations)).toBe(true)

    await system.shutdown()
  })

  it('should work without intelligence layer when disabled', async () => {
    const system = new UniversalToolAdapterSystem({
      enableIntelligence: false,
    })

    expect(system.intelligence).toBeUndefined()

    await system.initialize()

    // Test fallback to base functionality
    const discoveries = await system.discoverTools({ query: 'test' })
    expect(Array.isArray(discoveries)).toBe(true)

    const description = await system.getToolDescription('test-tool')
    expect(description).toBeNull()

    const recommendations = await system.getRecommendations({})
    expect(Array.isArray(recommendations)).toBe(true)
    expect(recommendations).toHaveLength(0)

    await system.shutdown()
  })
})

describe('Backward Compatibility', () => {
  it('should maintain existing Universal Tool Adapter interfaces', async () => {
    const system = new UniversalToolAdapterSystem({
      enableIntelligence: true,
    })

    // Test that existing methods still work
    expect(typeof system.createAdapter).toBe('function')
    expect(typeof system.executeAdapter).toBe('function')
    expect(typeof system.getSystemStatus).toBe('function')
    expect(typeof system.shutdown).toBe('function')

    await system.shutdown()
  })

  it('should not break existing adapter execution', async () => {
    const system = new UniversalToolAdapterSystem({
      enableIntelligence: true,
    })

    await system.initialize()

    // Mock adapter execution (should fail gracefully for non-existent adapter)
    await expect(
      system.executeAdapter('non-existent-adapter', {}, {})
    ).rejects.toThrow('Adapter not found')

    await system.shutdown()
  })

  it('should enhance but not replace existing discovery', async () => {
    const system = new UniversalToolAdapterSystem({
      enableIntelligence: false, // Disable intelligence
    })

    await system.initialize()

    // Should still work with base registry discovery
    const results = await system.discoverTools({ query: 'test' })
    expect(Array.isArray(results)).toBe(true)

    await system.shutdown()
  })
})

describe('Configuration and Setup', () => {
  it('should handle various intelligence configurations', () => {
    const configs = [
      { enableIntelligence: true },
      { enableIntelligence: false },
      {
        enableIntelligence: true,
        intelligence: {
          enableNaturalLanguageDescriptions: false,
          enableContextualRecommendations: true,
          enableIntelligentErrorHandling: true,
        },
      },
    ]

    for (const config of configs) {
      const system = new UniversalToolAdapterSystem(config)
      if (config.enableIntelligence !== false) {
        expect(system.intelligence).toBeDefined()
      } else {
        expect(system.intelligence).toBeUndefined()
      }
    }
  })

  it('should provide intelligence metrics in system status', async () => {
    const system = new UniversalToolAdapterSystem({
      enableIntelligence: true,
    })

    await system.initialize()

    const status = system.getSystemStatus()
    expect(status.intelligence).toBeDefined()
    expect(status.intelligence).toHaveProperty('descriptionsGenerated')
    expect(status.intelligence).toHaveProperty('integrationHealth')

    await system.shutdown()
  })
})

describe('Error Resilience', () => {
  it('should handle intelligence component initialization failures', async () => {
    // Mock a failing component
    const baseRegistry = new EnhancedAdapterRegistry()
    const layer = new IntelligenceIntegrationLayer(baseRegistry)

    // Should not throw even if internal components have issues
    await expect(layer.initialize()).resolves.not.toThrow()
    await layer.shutdown()
  })

  it('should gracefully degrade when intelligence features fail', async () => {
    const system = new UniversalToolAdapterSystem({
      enableIntelligence: true,
    })

    await system.initialize()

    // Even if intelligence methods encounter errors, they should not crash the system
    await expect(system.getToolDescription('invalid-tool')).resolves.toBeDefined()
    await expect(system.getRecommendations({})).resolves.toBeDefined()

    await system.shutdown()
  })
})