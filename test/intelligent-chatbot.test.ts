/**
 * Test Suite for Intelligent Chatbot Backend Service
 *
 * Comprehensive testing of the enhanced chatbot backend including:
 * - Message processing and intent recognition
 * - Context awareness and conversation management
 * - Claude API integration and response generation
 * - Proactive assistance and suggestion algorithms
 * - Performance optimization and error handling
 *
 * @created 2025-09-04
 * @author Intelligent Chatbot Implementation Specialist
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { IntelligentChatbot } from '../lib/help/ai/intelligent-chatbot'
import type { ChatContext, ChatMessage } from '../lib/help/ai/types'

// Mock dependencies
const mockClaudeClient = {
  generateResponse: vi.fn(),
  classifyIntent: vi.fn(),
  extractEntities: vi.fn(),
}

const mockSemanticSearch = {
  search: vi.fn(),
  indexDocument: vi.fn(),
}

const mockHelpContentManager = {
  getRelevantContent: vi.fn(),
  getContextualHelp: vi.fn(),
}

const mockAnalytics = {
  trackInteraction: vi.fn(),
  recordMetrics: vi.fn(),
}

vi.mock('../lib/help/ai/claude-client', () => ({
  ClaudeAPIClient: vi.fn().mockImplementation(() => mockClaudeClient),
}))

vi.mock('../lib/help/semantic-search', () => ({
  SemanticSearch: vi.fn().mockImplementation(() => mockSemanticSearch),
}))

vi.mock('../lib/help/content-manager', () => ({
  HelpContentManager: vi.fn().mockImplementation(() => mockHelpContentManager),
}))

vi.mock('../lib/analytics', () => ({
  Analytics: vi.fn().mockImplementation(() => mockAnalytics),
}))

describe('IntelligentChatbot', () => {
  let chatbot: IntelligentChatbot
  let defaultContext: ChatContext

  beforeEach(() => {
    vi.clearAllMocks()

    chatbot = new IntelligentChatbot({
      claudeApiKey: 'test-api-key',
      enableSemanticSearch: true,
      enableProactiveAssistance: true,
      responseTimeout: 5000,
    })

    defaultContext = {
      sessionId: 'test-session-123',
      workflowContext: {
        type: 'data-processing',
        currentStep: 'validation',
        blockTypes: ['transform', 'filter'],
        completedSteps: ['import'],
        errors: [],
        timeSpent: 300000,
      },
      userProfile: {
        expertiseLevel: 'intermediate',
        preferredLanguage: 'en',
        previousInteractions: 5,
        commonIssues: ['data-validation'],
      },
    }

    // Set up default mock responses
    mockClaudeClient.generateResponse.mockResolvedValue({
      content: 'Hello! I can help you with your data processing workflow.',
      confidence: 0.9,
      reasoning: 'User is asking for general help with data processing.',
    })

    mockClaudeClient.classifyIntent.mockResolvedValue({
      name: 'help_request',
      confidence: 0.85,
      entities: [
        { type: 'workflow_step', value: 'validation', confidence: 0.9 },
        { type: 'workflow_type', value: 'data-processing', confidence: 0.8 },
      ],
    })

    mockSemanticSearch.search.mockResolvedValue([
      {
        id: 'doc-1',
        content: 'Data validation best practices...',
        score: 0.95,
        metadata: { type: 'help_article', category: 'data-processing' },
      },
      {
        id: 'doc-2',
        content: 'Common validation errors and solutions...',
        score: 0.88,
        metadata: { type: 'troubleshooting', category: 'validation' },
      },
    ])

    mockHelpContentManager.getRelevantContent.mockResolvedValue([
      {
        id: 'help-1',
        title: 'Data Validation Guide',
        content: 'Step-by-step guide for data validation...',
        category: 'tutorials',
        difficulty: 'intermediate',
      },
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Message Processing', () => {
    test('should process basic text message successfully', async () => {
      const message: ChatMessage = {
        id: 'msg-1',
        content: 'How do I validate my data?',
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(message, defaultContext)

      expect(response).toBeDefined()
      expect(response.message).toContain('help you with your data processing')
      expect(response.intent).toBeDefined()
      expect(response.intent.name).toBe('help_request')
      expect(response.intent.confidence).toBeGreaterThan(0.8)
      expect(mockClaudeClient.generateResponse).toHaveBeenCalledTimes(1)
      expect(mockClaudeClient.classifyIntent).toHaveBeenCalledTimes(1)
    })

    test('should handle empty or invalid messages', async () => {
      const emptyMessage: ChatMessage = {
        id: 'msg-2',
        content: '',
        timestamp: new Date(),
        role: 'user',
      }

      await expect(chatbot.processMessage(emptyMessage, defaultContext)).rejects.toThrow(
        'Message content cannot be empty'
      )
    })

    test('should process complex queries with multiple intents', async () => {
      mockClaudeClient.classifyIntent.mockResolvedValueOnce({
        name: 'complex_help_request',
        confidence: 0.92,
        entities: [
          { type: 'workflow_step', value: 'validation', confidence: 0.9 },
          { type: 'action', value: 'troubleshoot', confidence: 0.85 },
          { type: 'data_type', value: 'csv', confidence: 0.8 },
        ],
      })

      const complexMessage: ChatMessage = {
        id: 'msg-3',
        content: "I'm having trouble validating my CSV data, can you help me troubleshoot?",
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(complexMessage, defaultContext)

      expect(response.intent.entities).toHaveLength(3)
      expect(response.intent.entities.map((e) => e.type)).toContain('data_type')
      expect(response.suggestedActions).toBeDefined()
      expect(response.suggestedActions.length).toBeGreaterThan(0)
    })

    test('should handle API timeouts gracefully', async () => {
      mockClaudeClient.generateResponse.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 6000))
      )

      const message: ChatMessage = {
        id: 'msg-4',
        content: 'Test timeout handling',
        timestamp: new Date(),
        role: 'user',
      }

      await expect(chatbot.processMessage(message, defaultContext)).rejects.toThrow(/timeout/i)
    })
  })

  describe('Context Awareness', () => {
    test('should adapt responses based on workflow context', async () => {
      const validationContext: ChatContext = {
        ...defaultContext,
        workflowContext: {
          type: 'data-processing',
          currentStep: 'validation',
          blockTypes: ['validate'],
          completedSteps: ['import', 'clean'],
          errors: [
            { type: 'validation_error', message: 'Invalid date format', field: 'created_at' },
          ],
          timeSpent: 600000,
        },
      }

      const message: ChatMessage = {
        id: 'msg-5',
        content: "I'm getting validation errors",
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(message, validationContext)

      expect(mockClaudeClient.generateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          message: message.content,
          context: expect.objectContaining({
            hasErrors: true,
            currentStep: 'validation',
            timeSpent: 600000,
          }),
        })
      )

      expect(response.contextualInfo).toBeDefined()
      expect(response.contextualInfo?.currentStep).toBe('validation')
      expect(response.contextualInfo?.hasErrors).toBe(true)
    })

    test('should personalize responses based on user expertise', async () => {
      const beginnerContext: ChatContext = {
        ...defaultContext,
        userProfile: {
          expertiseLevel: 'beginner',
          preferredLanguage: 'en',
          previousInteractions: 1,
          commonIssues: [],
        },
      }

      mockClaudeClient.generateResponse.mockResolvedValueOnce({
        content: "I'll guide you through the basics of data validation step by step.",
        confidence: 0.9,
        reasoning: 'User is a beginner, providing detailed guidance.',
      })

      const message: ChatMessage = {
        id: 'msg-6',
        content: 'How do I start with data validation?',
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(message, beginnerContext)

      expect(response.message).toContain('step by step')
      expect(response.suggestedActions).toBeDefined()
      expect(
        response.suggestedActions.some(
          (action) => action.type === 'tutorial' || action.priority === 1
        )
      ).toBe(true)
    })

    test('should maintain conversation state across messages', async () => {
      const message1: ChatMessage = {
        id: 'msg-7',
        content: 'I need help with data validation',
        timestamp: new Date(),
        role: 'user',
      }

      const message2: ChatMessage = {
        id: 'msg-8',
        content: 'What about error handling?',
        timestamp: new Date(),
        role: 'user',
      }

      // First message
      const response1 = await chatbot.processMessage(message1, defaultContext)
      expect(response1.conversationState).toBeDefined()

      // Second message should reference previous context
      const contextWithHistory = {
        ...defaultContext,
        conversationHistory: [message1],
        conversationState: response1.conversationState,
      }

      const response2 = await chatbot.processMessage(message2, contextWithHistory)

      expect(mockClaudeClient.generateResponse).toHaveBeenLastCalledWith(
        expect.objectContaining({
          conversationHistory: expect.arrayContaining([
            expect.objectContaining({ content: 'I need help with data validation' }),
          ]),
        })
      )

      expect(response2.conversationState.phase).toBeDefined()
      expect(response2.conversationState.context).toMatchObject(
        expect.objectContaining({ previousTopic: expect.any(String) })
      )
    })
  })

  describe('Proactive Assistance', () => {
    test('should generate proactive suggestions based on workflow state', async () => {
      const contextWithStuckUser: ChatContext = {
        ...defaultContext,
        workflowContext: {
          type: 'data-processing',
          currentStep: 'validation',
          blockTypes: ['validate'],
          completedSteps: ['import'],
          errors: [{ type: 'validation_error', message: 'Multiple validation failures' }],
          timeSpent: 1200000, // 20 minutes - user seems stuck
        },
      }

      const assistance = await chatbot.generateProactiveAssistance(contextWithStuckUser)

      expect(assistance).toBeDefined()
      expect(assistance.suggestions).toHaveLength(expect.any(Number))
      expect(assistance.suggestions.some((s) => s.priority === 1)).toBe(true)
      expect(assistance.reason).toContain('stuck') ||
        expect(assistance.reason).toContain('difficulty')
      expect(assistance.triggerConditions).toContain('time_spent_threshold')
    })

    test('should suggest relevant actions based on common issues', async () => {
      const contextWithCommonIssues: ChatContext = {
        ...defaultContext,
        userProfile: {
          expertiseLevel: 'intermediate',
          preferredLanguage: 'en',
          previousInteractions: 10,
          commonIssues: ['data-validation', 'schema-mismatch'],
        },
        workflowContext: {
          type: 'data-processing',
          currentStep: 'import',
          blockTypes: ['import'],
          completedSteps: [],
          errors: [{ type: 'schema_error', message: 'Column mismatch detected' }],
          timeSpent: 300000,
        },
      }

      const assistance = await chatbot.generateProactiveAssistance(contextWithCommonIssues)

      expect(
        assistance.suggestions.some(
          (s) => s.action === 'check_schema' || s.description.toLowerCase().includes('schema')
        )
      ).toBe(true)
      expect(assistance.triggerConditions).toContain('common_issue_pattern')
    })

    test('should not generate excessive proactive suggestions', async () => {
      const recentlyHelpedContext: ChatContext = {
        ...defaultContext,
        lastProactiveAssistance: new Date(Date.now() - 30000), // 30 seconds ago
      }

      const assistance = await chatbot.generateProactiveAssistance(recentlyHelpedContext)

      expect(assistance.suggestions).toHaveLength(0)
      expect(assistance.reason).toContain('recently provided')
    })
  })

  describe('Semantic Search Integration', () => {
    test('should enhance responses with relevant search results', async () => {
      const message: ChatMessage = {
        id: 'msg-9',
        content: 'What are the best practices for data validation?',
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(message, defaultContext)

      expect(mockSemanticSearch.search).toHaveBeenCalledWith(
        expect.stringContaining('data validation best practices'),
        expect.objectContaining({
          limit: expect.any(Number),
          threshold: expect.any(Number),
        })
      )

      expect(response.searchResults).toBeDefined()
      expect(response.searchResults.length).toBeGreaterThan(0)
      expect(response.searchResults[0].score).toBeGreaterThan(0.8)
    })

    test('should handle search failures gracefully', async () => {
      mockSemanticSearch.search.mockRejectedValueOnce(new Error('Search service unavailable'))

      const message: ChatMessage = {
        id: 'msg-10',
        content: 'Help with validation',
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(message, defaultContext)

      expect(response).toBeDefined()
      expect(response.message).toBeDefined()
      expect(response.searchResults).toEqual([])
      expect(mockAnalytics.recordMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          searchError: true,
        })
      )
    })

    test('should filter search results by relevance', async () => {
      mockSemanticSearch.search.mockResolvedValueOnce([
        { id: 'doc-1', content: 'Highly relevant content', score: 0.95 },
        { id: 'doc-2', content: 'Moderately relevant content', score: 0.75 },
        { id: 'doc-3', content: 'Low relevance content', score: 0.45 },
      ])

      const message: ChatMessage = {
        id: 'msg-11',
        content: 'Data validation help',
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(message, defaultContext)

      expect(response.searchResults.length).toBeLessThanOrEqual(2)
      expect(response.searchResults.every((result) => result.score > 0.7)).toBe(true)
    })
  })

  describe('Performance and Reliability', () => {
    test('should handle high concurrency gracefully', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Test message ${i}`,
        timestamp: new Date(),
        role: 'user' as const,
      }))

      const promises = messages.map((message) => chatbot.processMessage(message, defaultContext))

      const responses = await Promise.all(promises)

      expect(responses).toHaveLength(10)
      responses.forEach((response) => {
        expect(response).toBeDefined()
        expect(response.message).toBeDefined()
      })
    })

    test('should implement response caching for similar queries', async () => {
      const message1: ChatMessage = {
        id: 'msg-12',
        content: 'How to validate CSV data?',
        timestamp: new Date(),
        role: 'user',
      }

      const message2: ChatMessage = {
        id: 'msg-13',
        content: 'How to validate CSV data?', // Identical content
        timestamp: new Date(),
        role: 'user',
      }

      const response1 = await chatbot.processMessage(message1, defaultContext)
      const response2 = await chatbot.processMessage(message2, defaultContext)

      expect(response1.message).toBe(response2.message)
      expect(mockClaudeClient.generateResponse).toHaveBeenCalledTimes(1) // Should use cache
    })

    test('should track performance metrics', async () => {
      const message: ChatMessage = {
        id: 'msg-14',
        content: 'Performance test message',
        timestamp: new Date(),
        role: 'user',
      }

      const startTime = Date.now()
      const response = await chatbot.processMessage(message, defaultContext)
      const endTime = Date.now()

      expect(response.metadata).toBeDefined()
      expect(response.metadata.processingTime).toBeWithinRange(0, endTime - startTime + 100)
      expect(response.metadata.timestamp).toBeDefined()

      expect(mockAnalytics.recordMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          responseTime: expect.any(Number),
          intentConfidence: expect.any(Number),
          searchResultsCount: expect.any(Number),
        })
      )
    })

    test('should handle memory cleanup properly', async () => {
      // Process many messages to test memory management
      for (let i = 0; i < 100; i++) {
        const message: ChatMessage = {
          id: `memory-test-${i}`,
          content: `Memory test message ${i}`,
          timestamp: new Date(),
          role: 'user',
        }
        await chatbot.processMessage(message, defaultContext)
      }

      // Verify that conversation history is properly managed
      const memoryUsage = process.memoryUsage()
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024) // Less than 100MB
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle Claude API errors gracefully', async () => {
      mockClaudeClient.generateResponse.mockRejectedValueOnce(
        new Error('Claude API rate limit exceeded')
      )

      const message: ChatMessage = {
        id: 'msg-15',
        content: 'Test API error handling',
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(message, defaultContext)

      expect(response.message).toContain('temporarily unavailable')
      expect(response.error).toBeDefined()
      expect(response.error.type).toBe('api_error')
      expect(response.suggestedActions.some((a) => a.action === 'retry')).toBe(true)
    })

    test('should validate message format and content', async () => {
      const invalidMessage = {
        id: 'msg-16',
        content: null,
        timestamp: new Date(),
        role: 'user',
      } as any

      await expect(chatbot.processMessage(invalidMessage, defaultContext)).rejects.toThrow(
        'Invalid message format'
      )
    })

    test('should handle malformed context gracefully', async () => {
      const malformedContext = {
        sessionId: 'test-session',
        workflowContext: null,
        userProfile: undefined,
      } as any

      const message: ChatMessage = {
        id: 'msg-17',
        content: 'Test with malformed context',
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(message, malformedContext)

      expect(response).toBeDefined()
      expect(response.message).toBeDefined()
      expect(response.contextualInfo).toBeDefined()
    })

    test('should implement circuit breaker for external services', async () => {
      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        mockSemanticSearch.search.mockRejectedValueOnce(new Error('Service unavailable'))

        const message: ChatMessage = {
          id: `circuit-test-${i}`,
          content: `Circuit breaker test ${i}`,
          timestamp: new Date(),
          role: 'user',
        }

        await chatbot.processMessage(message, defaultContext)
      }

      // Next call should bypass the failing service
      const message: ChatMessage = {
        id: 'circuit-test-final',
        content: 'Final circuit breaker test',
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(message, defaultContext)

      expect(response.searchResults).toEqual([])
      expect(response.metadata.serviceStatus.semanticSearch).toBe('circuit_open')
    })
  })

  describe('Analytics and Monitoring', () => {
    test('should track user interaction patterns', async () => {
      const messages = [
        { content: 'How do I start?', intent: 'getting_started' },
        { content: 'What about validation?', intent: 'validation_help' },
        { content: "I'm stuck on errors", intent: 'troubleshooting' },
      ]

      for (const msgData of messages) {
        const message: ChatMessage = {
          id: crypto.randomUUID(),
          content: msgData.content,
          timestamp: new Date(),
          role: 'user',
        }

        await chatbot.processMessage(message, defaultContext)
      }

      expect(mockAnalytics.trackInteraction).toHaveBeenCalledTimes(messages.length)
      expect(mockAnalytics.recordMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationProgression: expect.any(Array),
          userJourney: expect.any(Object),
        })
      )
    })

    test('should measure response quality metrics', async () => {
      const message: ChatMessage = {
        id: 'quality-test',
        content: 'Comprehensive question about data validation best practices and error handling',
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(message, defaultContext)

      expect(response.qualityMetrics).toBeDefined()
      expect(response.qualityMetrics.relevanceScore).toBeWithinRange(0, 1)
      expect(response.qualityMetrics.completenessScore).toBeWithinRange(0, 1)
      expect(response.qualityMetrics.clarityScore).toBeWithinRange(0, 1)
      expect(response.qualityMetrics.helpfulnessScore).toBeWithinRange(0, 1)
    })
  })

  describe('Conversation Management', () => {
    test('should handle multi-turn conversations effectively', async () => {
      const conversationHistory: ChatMessage[] = []

      // Turn 1
      const msg1: ChatMessage = {
        id: 'turn-1',
        content: 'I need help with data validation',
        timestamp: new Date(),
        role: 'user',
      }

      const response1 = await chatbot.processMessage(msg1, defaultContext)
      conversationHistory.push(msg1, {
        id: 'assistant-1',
        content: response1.message,
        timestamp: new Date(),
        role: 'assistant',
      })

      // Turn 2
      const msg2: ChatMessage = {
        id: 'turn-2',
        content: 'Can you show me examples?',
        timestamp: new Date(),
        role: 'user',
      }

      const contextWithHistory = {
        ...defaultContext,
        conversationHistory,
        conversationState: response1.conversationState,
      }

      const response2 = await chatbot.processMessage(msg2, contextWithHistory)

      expect(response2.message).toContain('example') ||
        expect(response2.message).toContain('validation')
      expect(response2.conversationState.turn).toBe(2)
      expect(response2.conversationState.context.previousTopic).toContain('validation')
    })

    test('should reset conversation context when appropriate', async () => {
      const oldConversationContext: ChatContext = {
        ...defaultContext,
        conversationState: {
          sessionId: 'old-session',
          turn: 5,
          phase: 'detailed_help',
          confidence: 0.8,
          context: { topic: 'data-import', lastActivity: Date.now() - 3600000 }, // 1 hour ago
        },
      }

      const message: ChatMessage = {
        id: 'new-topic',
        content: 'I want to learn about machine learning',
        timestamp: new Date(),
        role: 'user',
      }

      const response = await chatbot.processMessage(message, oldConversationContext)

      expect(response.conversationState.turn).toBe(1)
      expect(response.conversationState.phase).toBe('greeting')
      expect(response.conversationState.context.topic).toContain('machine learning')
    })
  })
})

// Custom Jest matchers for better test assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R
    }
  }
}
