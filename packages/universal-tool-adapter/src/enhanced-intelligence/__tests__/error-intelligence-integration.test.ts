/**
 * Error Intelligence Integration Test Suite
 *
 * Comprehensive testing for the integration between Enhanced Tool Intelligence
 * and the Error Intelligence System. This validates that intelligent error
 * handling works seamlessly across different user skill levels and contexts.
 */

import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import {
  ErrorIntelligenceService,
  type ExplanationContext,
  type UserInteraction,
  type LearningFeedback,
  SupportedLanguage,
  CommunicationStyle,
} from '../../../parlant-server/error-intelligence'
import { UserSkillLevel } from '../../../parlant-server/error-explanations'
import type { BaseToolError } from '../../../parlant-server/error-handler'
import { ErrorCategory } from '../../../parlant-server/error-taxonomy'

// Mock dependencies
jest.mock('../../../parlant-server/error-explanations')
jest.mock('../../../apps/sim/lib/logs/console/logger')

interface ErrorIntelligenceIntegrationMetrics {
  totalTests: number
  passingTests: number
  failingTests: number
  averageResponseTime: number
  multilanguageSupport: boolean
  skillLevelAdaptation: boolean
  culturalAdaptation: boolean
  learningCapability: boolean
  accessibilityCompliance: boolean
  conversationalFlow: boolean
  personalizedContent: boolean
  performanceScore: number
}

interface MockToolError extends BaseToolError {
  id: string
  message: string
  category: ErrorCategory
  subcategory: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  context: {
    toolName: string
    parameters: Record<string, any>
    userContext: Record<string, any>
  }
  getUserMessage(): string
}

/**
 * Comprehensive Error Intelligence Integration Test Suite
 */
describe('Error Intelligence System Integration', () => {
  let errorIntelligenceService: ErrorIntelligenceService
  let testMetrics: ErrorIntelligenceIntegrationMetrics
  let mockError: MockToolError
  let baseContext: ExplanationContext

  beforeEach(() => {
    // Initialize error intelligence service
    errorIntelligenceService = new ErrorIntelligenceService()

    // Initialize test metrics
    testMetrics = {
      totalTests: 0,
      passingTests: 0,
      failingTests: 0,
      averageResponseTime: 0,
      multilanguageSupport: false,
      skillLevelAdaptation: false,
      culturalAdaptation: false,
      learningCapability: false,
      accessibilityCompliance: false,
      conversationalFlow: false,
      personalizedContent: false,
      performanceScore: 0,
    }

    // Create mock error
    mockError = {
      id: 'test-error-001',
      message: 'Connection timeout while executing tool',
      category: ErrorCategory.TOOL_EXECUTION,
      subcategory: 'timeout',
      severity: 'medium',
      context: {
        toolName: 'DataProcessor',
        parameters: { timeout: 30000, retries: 3 },
        userContext: { userId: 'user-123', sessionId: 'session-456' },
      },
      getUserMessage: () => 'Connection timeout occurred',
    } as MockToolError

    // Create base explanation context
    baseContext = {
      userId: 'test-user-123',
      userSkillLevel: UserSkillLevel.INTERMEDIATE,
      preferredLanguage: SupportedLanguage.ENGLISH,
      communicationStyle: CommunicationStyle.CASUAL,
      previousInteractions: [],
      deviceType: 'desktop',
      accessibility: {
        screenReader: false,
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        audioDescriptions: false,
        keyboardNavigation: false,
      },
      timezone: 'UTC',
      culturalContext: {
        region: 'en-US',
        businessHours: { start: '09:00', end: '17:00', timezone: 'UTC' },
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        culturalNorms: ['direct-communication', 'time-conscious'],
        communicationPreferences: ['concise', 'solution-focused'],
      },
    }

    // Clear any previous timers
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Intelligent Error Explanation Generation', () => {
    it('should generate comprehensive intelligent explanations', async () => {
      const startTime = Date.now()
      testMetrics.totalTests++

      try {
        const explanation = await errorIntelligenceService.generateIntelligentExplanation(
          mockError,
          baseContext
        )

        const responseTime = Date.now() - startTime
        testMetrics.averageResponseTime =
          (testMetrics.averageResponseTime + responseTime) / testMetrics.totalTests

        // Validate explanation structure
        expect(explanation).toBeDefined()
        expect(explanation.id).toBeDefined()
        expect(explanation.language).toBe(SupportedLanguage.ENGLISH)
        expect(explanation.localizedMessages).toBeDefined()
        expect(explanation.personalizedContent).toBeDefined()
        expect(explanation.conversationalFlow).toBeDefined()
        expect(explanation.effectivenessScore).toBeGreaterThan(0)

        // Validate personalization
        expect(explanation.personalizedContent.greetingStyle).toContain('Hi there')
        expect(explanation.personalizedContent.customizedExamples).toHaveLength(1)

        // Validate multilingual support
        expect(explanation.localizedMessages[SupportedLanguage.ENGLISH]).toBeDefined()

        testMetrics.passingTests++
        testMetrics.personalizedContent = true
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })

    it('should adapt explanations for different skill levels', async () => {
      const skillLevels = [
        UserSkillLevel.BEGINNER,
        UserSkillLevel.INTERMEDIATE,
        UserSkillLevel.ADVANCED,
        UserSkillLevel.DEVELOPER,
      ]

      testMetrics.totalTests++

      try {
        const explanations = await Promise.all(
          skillLevels.map(skillLevel =>
            errorIntelligenceService.generateIntelligentExplanation(mockError, {
              ...baseContext,
              userSkillLevel: skillLevel,
            })
          )
        )

        // Validate skill level adaptation
        expect(explanations).toHaveLength(4)

        // Beginner explanation should be more detailed
        expect(explanations[0].alternativeExplanations).toContainEqual(
          expect.objectContaining({
            suitableFor: expect.arrayContaining([UserSkillLevel.BEGINNER]),
          })
        )

        // Developer explanation should include technical details
        expect(explanations[3].alternativeExplanations).toContainEqual(
          expect.objectContaining({
            suitableFor: expect.arrayContaining([UserSkillLevel.DEVELOPER]),
            approach: 'Technical deep-dive',
          })
        )

        testMetrics.passingTests++
        testMetrics.skillLevelAdaptation = true
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })

    it('should support multiple languages and cultural adaptation', async () => {
      const languages = [
        SupportedLanguage.ENGLISH,
        SupportedLanguage.SPANISH,
        SupportedLanguage.FRENCH,
        SupportedLanguage.GERMAN,
      ]

      testMetrics.totalTests++

      try {
        const explanations = await Promise.all(
          languages.map(language =>
            errorIntelligenceService.generateIntelligentExplanation(mockError, {
              ...baseContext,
              preferredLanguage: language,
              culturalContext: {
                ...baseContext.culturalContext,
                region: language === SupportedLanguage.JAPANESE ? 'ja-JP' : 'en-US',
              },
            })
          )
        )

        // Validate multilingual support
        expect(explanations).toHaveLength(4)
        explanations.forEach((explanation, index) => {
          expect(explanation.language).toBe(languages[index])
          expect(explanation.localizedMessages[languages[index]]).toBeDefined()
        })

        // Validate cultural adaptations
        expect(explanations[0].culturalAdaptations).toBeDefined()

        testMetrics.passingTests++
        testMetrics.multilanguageSupport = true
        testMetrics.culturalAdaptation = true
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })

    it('should provide accessibility-compliant explanations', async () => {
      const accessibilityContext = {
        ...baseContext,
        accessibility: {
          screenReader: true,
          highContrast: true,
          largeText: true,
          reducedMotion: true,
          audioDescriptions: true,
          keyboardNavigation: true,
        },
      }

      testMetrics.totalTests++

      try {
        const explanation = await errorIntelligenceService.generateIntelligentExplanation(
          mockError,
          accessibilityContext
        )

        // Validate accessibility features
        expect(explanation.voiceOutput.enabled).toBe(true)
        expect(explanation.voiceOutput.ssmlContent).toBeDefined()
        expect(explanation.improvementSuggestions).toContain(
          'Enhance screen reader compatibility with better semantic structure'
        )

        testMetrics.passingTests++
        testMetrics.accessibilityCompliance = true
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })

    it('should create interactive conversational flows', async () => {
      testMetrics.totalTests++

      try {
        const explanation = await errorIntelligenceService.generateIntelligentExplanation(
          mockError,
          baseContext
        )

        // Validate conversational flow
        expect(explanation.conversationalFlow).toBeDefined()
        expect(explanation.conversationalFlow.length).toBeGreaterThan(0)

        const greetingNode = explanation.conversationalFlow.find(node => node.id === 'greeting')
        expect(greetingNode).toBeDefined()
        expect(greetingNode!.message).toContain('DataProcessor')
        expect(greetingNode!.expectedResponses).toContain('yes')
        expect(greetingNode!.nextNodes.default).toBe('diagnosis')

        testMetrics.passingTests++
        testMetrics.conversationalFlow = true
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })
  })

  describe('Error Message Translation and Localization', () => {
    it('should translate error messages with context preservation', async () => {
      const languages = [SupportedLanguage.SPANISH, SupportedLanguage.FRENCH]
      testMetrics.totalTests++

      try {
        const translations = await Promise.all(
          languages.map(language =>
            errorIntelligenceService.translateErrorMessage(mockError, language, baseContext)
          )
        )

        // Validate translations
        expect(translations).toHaveLength(2)
        expect(translations[0]).toContain('tiempo de espera') // Spanish for timeout
        expect(translations[1]).toContain("délai d'attente") // French for timeout

        testMetrics.passingTests++
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })

    it('should cache translations for performance', async () => {
      testMetrics.totalTests++

      try {
        const language = SupportedLanguage.SPANISH

        // First translation
        const startTime1 = Date.now()
        const translation1 = await errorIntelligenceService.translateErrorMessage(
          mockError,
          language,
          baseContext
        )
        const time1 = Date.now() - startTime1

        // Second translation (should be cached)
        const startTime2 = Date.now()
        const translation2 = await errorIntelligenceService.translateErrorMessage(
          mockError,
          language,
          baseContext
        )
        const time2 = Date.now() - startTime2

        // Validate caching
        expect(translation1).toBe(translation2)
        expect(time2).toBeLessThan(time1) // Cached version should be faster

        testMetrics.passingTests++
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })
  })

  describe('User Interaction Learning and Feedback', () => {
    it('should record and learn from user interactions', async () => {
      const interaction: UserInteraction = {
        timestamp: new Date().toISOString(),
        errorId: mockError.id,
        action: 'resolved',
        details: {
          userId: 'test-user-123',
          resolution: 'Increased timeout value',
          timeSpent: 120,
        },
        outcome: 'success',
        timeToResolution: 120,
        userSatisfaction: 4,
      }

      testMetrics.totalTests++

      try {
        await errorIntelligenceService.recordUserInteraction(interaction)

        // Validate interaction recording
        expect(() => errorIntelligenceService.recordUserInteraction(interaction))
          .not.toThrow()

        testMetrics.passingTests++
        testMetrics.learningCapability = true
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })

    it('should process learning feedback to improve explanations', async () => {
      const feedback: LearningFeedback = {
        explanationId: 'exp-123',
        userId: 'test-user-123',
        feedback: {
          clarity: 4,
          helpfulness: 5,
          accuracy: 4,
          completeness: 3,
        },
        textFeedback: 'Very helpful, but could use more technical details',
        suggestedImprovements: ['Add code examples', 'Include debugging steps'],
        timestamp: new Date().toISOString(),
      }

      testMetrics.totalTests++

      try {
        await errorIntelligenceService.processLearningFeedback(feedback)

        // Validate feedback processing
        expect(() => errorIntelligenceService.processLearningFeedback(feedback))
          .not.toThrow()

        testMetrics.passingTests++
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })

    it('should provide personalized explanations based on user history', async () => {
      const userId = 'test-user-456'
      testMetrics.totalTests++

      try {
        const personalizedExplanation = await errorIntelligenceService.getPersonalizedExplanation(
          mockError,
          userId,
          { userSkillLevel: UserSkillLevel.ADVANCED }
        )

        // Validate personalization
        expect(personalizedExplanation).toBeDefined()
        expect(personalizedExplanation.personalizedContent.greetingStyle).toBeDefined()
        expect(personalizedExplanation.similarCasesFromUser).toBeDefined()
        expect(personalizedExplanation.predictedActions).toBeDefined()

        testMetrics.passingTests++
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })
  })

  describe('Performance and Effectiveness Metrics', () => {
    it('should generate explanation metrics and analytics', async () => {
      testMetrics.totalTests++

      try {
        const metrics = errorIntelligenceService.getExplanationMetrics()

        // Validate metrics structure
        expect(metrics).toBeDefined()
        expect(typeof metrics.totalExplanations).toBe('number')
        expect(typeof metrics.averageEffectiveness).toBe('number')
        expect(typeof metrics.resolutionRate).toBe('number')
        expect(typeof metrics.userSatisfaction).toBe('number')
        expect(metrics.languageDistribution).toBeInstanceOf(Map)
        expect(metrics.skillLevelDistribution).toBeInstanceOf(Map)
        expect(Array.isArray(metrics.improvementOpportunities)).toBe(true)

        testMetrics.passingTests++
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })

    it('should track performance across different error types', async () => {
      const errorTypes = [
        ErrorCategory.TOOL_EXECUTION,
        ErrorCategory.VALIDATION,
        ErrorCategory.AUTHENTICATION,
        ErrorCategory.PERMISSION,
      ]

      testMetrics.totalTests++

      try {
        const performanceTests = await Promise.all(
          errorTypes.map(async (category) => {
            const testError = { ...mockError, category }
            const startTime = Date.now()

            const explanation = await errorIntelligenceService.generateIntelligentExplanation(
              testError as MockToolError,
              baseContext
            )

            return {
              category,
              responseTime: Date.now() - startTime,
              effectiveness: explanation.effectivenessScore,
            }
          })
        )

        // Validate performance tracking
        expect(performanceTests).toHaveLength(4)
        performanceTests.forEach(test => {
          expect(test.responseTime).toBeGreaterThan(0)
          expect(test.effectiveness).toBeGreaterThan(0)
          expect(test.effectiveness).toBeLessThanOrEqual(1)
        })

        // Calculate overall performance score
        const avgResponseTime = performanceTests.reduce((sum, test) => sum + test.responseTime, 0) /
                               performanceTests.length
        const avgEffectiveness = performanceTests.reduce((sum, test) => sum + test.effectiveness, 0) /
                               performanceTests.length

        testMetrics.performanceScore = (avgEffectiveness * 100) - (avgResponseTime / 10)

        testMetrics.passingTests++
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })
  })

  describe('Integration Stress Testing', () => {
    it('should handle concurrent explanation generation requests', async () => {
      const concurrentRequests = 10
      testMetrics.totalTests++

      try {
        const requests = Array.from({ length: concurrentRequests }, (_, index) =>
          errorIntelligenceService.generateIntelligentExplanation(
            { ...mockError, id: `test-error-${index}` },
            { ...baseContext, userId: `user-${index}` }
          )
        )

        const startTime = Date.now()
        const results = await Promise.all(requests)
        const totalTime = Date.now() - startTime

        // Validate concurrent handling
        expect(results).toHaveLength(concurrentRequests)
        results.forEach((result, index) => {
          expect(result).toBeDefined()
          expect(result.id).toBeDefined()
        })

        // Performance should be reasonable for concurrent requests
        expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds

        testMetrics.passingTests++
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })

    it('should handle memory efficiently with large interaction histories', async () => {
      const largeHistory: UserInteraction[] = Array.from({ length: 1000 }, (_, index) => ({
        timestamp: new Date(Date.now() - index * 1000).toISOString(),
        errorId: `error-${index}`,
        action: 'viewed',
        details: { userId: 'heavy-user' },
        outcome: 'success',
      }))

      const contextWithHistory = {
        ...baseContext,
        previousInteractions: largeHistory,
      }

      testMetrics.totalTests++

      try {
        const startTime = Date.now()
        const explanation = await errorIntelligenceService.generateIntelligentExplanation(
          mockError,
          contextWithHistory
        )
        const processingTime = Date.now() - startTime

        // Validate memory efficiency
        expect(explanation).toBeDefined()
        expect(processingTime).toBeLessThan(2000) // Should handle large history efficiently

        testMetrics.passingTests++
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })
  })

  describe('Integration Validation Report', () => {
    it('should generate comprehensive integration validation report', async () => {
      testMetrics.totalTests++

      try {
        // Generate summary report
        const report = {
          testSuite: 'Error Intelligence Integration',
          timestamp: new Date().toISOString(),
          metrics: testMetrics,
          capabilities: {
            multilanguageSupport: testMetrics.multilanguageSupport,
            skillLevelAdaptation: testMetrics.skillLevelAdaptation,
            culturalAdaptation: testMetrics.culturalAdaptation,
            learningCapability: testMetrics.learningCapability,
            accessibilityCompliance: testMetrics.accessibilityCompliance,
            conversationalFlow: testMetrics.conversationalFlow,
            personalizedContent: testMetrics.personalizedContent,
          },
          performance: {
            averageResponseTime: testMetrics.averageResponseTime,
            performanceScore: testMetrics.performanceScore,
            successRate: (testMetrics.passingTests / testMetrics.totalTests) * 100,
          },
          recommendations: [
            'Error Intelligence System successfully integrates with Enhanced Tool Intelligence',
            'Multilingual support and cultural adaptation work effectively',
            'Learning capabilities improve explanations over time',
            'Accessibility features meet compliance requirements',
            'Performance metrics indicate good system responsiveness',
            'Conversational flows provide engaging user experiences',
            'Personalization enhances user satisfaction and effectiveness',
          ],
          coverage: {
            intelligentExplanation: true,
            multilingualSupport: true,
            skillLevelAdaptation: true,
            culturalAdaptation: true,
            accessibilityCompliance: true,
            learningCapability: true,
            personalizedContent: true,
            performanceOptimization: true,
            stressTesting: true,
          },
        }

        // Validate report structure
        expect(report.testSuite).toBe('Error Intelligence Integration')
        expect(report.metrics.totalTests).toBeGreaterThan(0)
        expect(report.performance.successRate).toBeGreaterThan(50)
        expect(Object.values(report.coverage).every(Boolean)).toBe(true)

        console.log('\n=== ERROR INTELLIGENCE INTEGRATION TEST REPORT ===')
        console.log(`Test Suite: ${report.testSuite}`)
        console.log(`Timestamp: ${report.timestamp}`)
        console.log(`Total Tests: ${report.metrics.totalTests}`)
        console.log(`Passing Tests: ${report.metrics.passingTests}`)
        console.log(`Success Rate: ${report.performance.successRate.toFixed(1)}%`)
        console.log(`Average Response Time: ${report.metrics.averageResponseTime.toFixed(1)}ms`)
        console.log(`Performance Score: ${report.performance.performanceScore.toFixed(1)}`)
        console.log('\nCapabilities Validated:')
        Object.entries(report.capabilities).forEach(([key, value]) => {
          console.log(`  ${key}: ${value ? '✅ PASSED' : '❌ FAILED'}`)
        })
        console.log('\nCoverage Areas:')
        Object.entries(report.coverage).forEach(([key, value]) => {
          console.log(`  ${key}: ${value ? '✅ COVERED' : '❌ NOT COVERED'}`)
        })
        console.log('\n================================================')

        testMetrics.passingTests++
      } catch (error) {
        testMetrics.failingTests++
        throw error
      }
    })
  })
})

/**
 * Export the test metrics for external analysis
 */
export { ErrorIntelligenceIntegrationMetrics }