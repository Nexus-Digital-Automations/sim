/**
 * Comprehensive Test Suite for Intelligent Chatbot Implementation
 *
 * Tests all core functionality of the intelligent chatbot system including:
 * - Message processing and NLP capabilities
 * - Context-aware response generation
 * - Conversation state management
 * - Error handling and edge cases
 * - Performance and scalability
 *
 * @created 2025-09-04
 * @author Intelligent Chatbot Implementation Specialist
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import {
  type ChatbotConfig,
  type ConversationContext,
  IntelligentChatbot,
} from '../lib/help/ai/intelligent-chatbot'
import type { SemanticSearchService } from '../lib/help/ai/semantic-search'
import type { Logger } from '../lib/monitoring/logger'

// Mock implementations
const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
}

const mockSemanticSearch = {
  search: jest.fn(),
  getSuggestions: jest.fn(),
  indexContent: jest.fn(),
  getMetrics: jest.fn().mockReturnValue({}),
} as unknown as SemanticSearchService

// Test configuration
const testConfig: ChatbotConfig = {
  claudeApiKey: 'test-api-key-12345',
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 1024,
  temperature: 0.7,
  conversationTimeout: 3600000,
  maxConversationHistory: 50,
  enableProactiveAssistance: true,
  enableContextRetention: true,
}

describe('IntelligentChatbot', () => {
  let chatbot: IntelligentChatbot
  let mockFetch: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    // Mock global fetch for Claude API calls
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
    global.fetch = mockFetch

    // Reset mocks
    jest.clearAllMocks()

    // Create chatbot instance
    chatbot = new IntelligentChatbot(testConfig, mockSemanticSearch, mockLogger)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(chatbot).toBeInstanceOf(IntelligentChatbot)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'IntelligentChatbot initialized',
        expect.objectContaining({
          model: testConfig.model,
          maxTokens: testConfig.maxTokens,
          enableProactiveAssistance: testConfig.enableProactiveAssistance,
        })
      )
    })

    test('should throw error with invalid configuration', () => {
      const invalidConfig = { ...testConfig, maxTokens: -1 }
      expect(() => new IntelligentChatbot(invalidConfig, mockSemanticSearch, mockLogger)).toThrow()
    })

    test('should set default values for optional config parameters', () => {
      const minimalConfig: ChatbotConfig = {
        claudeApiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022',
      }

      const chatbotWithDefaults = new IntelligentChatbot(
        minimalConfig,
        mockSemanticSearch,
        mockLogger
      )
      expect(chatbotWithDefaults).toBeInstanceOf(IntelligentChatbot)
    })
  })

  describe('Message Processing', () => {
    test('should process simple message successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'Hello! I can help you with your questions about the platform.',
            },
          ],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      mockSemanticSearch.search = jest.fn().mockResolvedValue([
        {
          id: '1',
          title: 'Getting Started Guide',
          content: 'Welcome to our platform...',
          score: 0.9,
          tags: ['getting-started', 'tutorial'],
        },
      ])

      const response = await chatbot.processMessage(
        'user123',
        'session456',
        'Hello, how do I get started?'
      )

      expect(response).toMatchObject({
        message: expect.stringContaining('Hello!'),
        intent: expect.objectContaining({
          name: expect.any(String),
          confidence: expect.any(Number),
        }),
        conversationState: expect.objectContaining({
          phase: expect.any(String),
          confidence: expect.any(Number),
        }),
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': testConfig.claudeApiKey,
            'anthropic-version': '2023-06-01',
          }),
        })
      )
    })

    test('should handle context-aware message processing', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'Based on your workflow context, here are specific steps to resolve this error.',
            },
          ],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const context: ConversationContext = {
        workflowContext: {
          type: 'data-processing',
          currentStep: 'validation',
          blockTypes: ['transform', 'filter'],
          completedSteps: ['import', 'clean'],
          errors: [
            {
              code: 'VALIDATION_ERROR',
              message: 'Invalid data format',
              context: 'Row 15: Expected number, got string',
              timestamp: new Date().toISOString(),
              resolved: false,
            },
          ],
          timeSpent: 300000, // 5 minutes
        },
        userProfile: {
          expertiseLevel: 'intermediate',
          preferredLanguage: 'en',
          previousInteractions: 5,
          commonIssues: ['data-validation', 'format-conversion'],
        },
      }

      const response = await chatbot.processMessage(
        'user123',
        'session456',
        "I'm getting a validation error in my data processing workflow",
        context
      )

      expect(response.message).toContain('workflow context')
      expect(response.metadata.hasWorkflowContext).toBe(true)
      expect(response.suggestedActions).toBeDefined()
      expect(response.relatedContent).toBeDefined()
    })

    test('should handle API rate limiting gracefully', async () => {
      const rateLimitResponse = {
        ok: false,
        status: 429,
        json: jest.fn().mockResolvedValue({
          error: { type: 'rate_limit_error', message: 'Rate limit exceeded' },
        }),
      }
      mockFetch.mockResolvedValue(rateLimitResponse as any)

      await expect(chatbot.processMessage('user123', 'session456', 'Hello')).rejects.toThrow(
        'Rate limit exceeded'
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] Claude API request failed/),
        expect.objectContaining({
          error: 'Rate limit exceeded',
          statusCode: 429,
        })
      )
    })

    test('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(chatbot.processMessage('user123', 'session456', 'Hello')).rejects.toThrow(
        'Network error'
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] Message processing failed/),
        expect.objectContaining({
          error: 'Network error',
        })
      )
    })
  })

  describe('Intent Classification', () => {
    test('should classify help-seeking intents correctly', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'I can help you with that.' }],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const testCases = [
        { message: 'How do I create a new project?', expectedIntent: 'how_to_question' },
        { message: 'My workflow is not working', expectedIntent: 'troubleshooting' },
        {
          message: 'What is the best way to handle large datasets?',
          expectedIntent: 'best_practices',
        },
        { message: 'Can you explain how transforms work?', expectedIntent: 'explanation_request' },
      ]

      for (const testCase of testCases) {
        const response = await chatbot.processMessage('user123', 'session456', testCase.message)
        expect(response.intent?.name).toBe(testCase.expectedIntent)
        expect(response.intent?.confidence).toBeGreaterThan(0.5)
      }
    })

    test('should extract entities from user messages', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'I can help with CSV file processing.' }],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const response = await chatbot.processMessage(
        'user123',
        'session456',
        'How do I import a CSV file with 10,000 rows into my workflow?'
      )

      expect(response.entities).toContainEqual({
        type: 'file_format',
        value: 'CSV',
        confidence: expect.any(Number),
      })
      expect(response.entities).toContainEqual({
        type: 'data_size',
        value: '10,000 rows',
        confidence: expect.any(Number),
      })
      expect(response.entities).toContainEqual({
        type: 'workflow_component',
        value: 'import',
        confidence: expect.any(Number),
      })
    })
  })

  describe('Conversation State Management', () => {
    test('should maintain conversation context across messages', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Following up on your previous question...' }],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      // First message
      const response1 = await chatbot.processMessage(
        'user123',
        'session456',
        'I need help with data validation'
      )

      expect(response1.conversationState.phase).toBe('problem_identification')

      // Follow-up message
      const response2 = await chatbot.processMessage(
        'user123',
        'session456',
        'The error is happening on row 15'
      )

      expect(response2.conversationState.phase).toBe('solution_providing')
      expect(response2.conversationState.context.previousTopics).toContain('data_validation')
    })

    test('should clear conversation on timeout', async () => {
      // Set short timeout for testing
      const shortTimeoutConfig = { ...testConfig, conversationTimeout: 1000 } // 1 second
      const testChatbot = new IntelligentChatbot(shortTimeoutConfig, mockSemanticSearch, mockLogger)

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Hello!' }],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      // First message
      await testChatbot.processMessage('user123', 'session456', 'Hello')

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 1100))

      // Second message after timeout
      const response = await testChatbot.processMessage('user123', 'session456', 'Are you there?')

      expect(response.conversationState.phase).toBe('greeting')
      expect(response.conversationState.context.isNewConversation).toBe(true)
    })

    test('should manage conversation history correctly', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      // Send multiple messages
      for (let i = 0; i < 5; i++) {
        await chatbot.processMessage('user123', 'session456', `Message ${i + 1}`)
      }

      const conversationHistory = chatbot.getConversationHistory('user123', 'session456')

      expect(conversationHistory).toBeDefined()
      expect(conversationHistory?.conversationHistory).toHaveLength(5)
      expect(conversationHistory?.conversationHistory[0].userMessage).toBe('Message 1')
      expect(conversationHistory?.conversationHistory[4].userMessage).toBe('Message 5')
    })

    test('should limit conversation history size', async () => {
      const limitedConfig = { ...testConfig, maxConversationHistory: 3 }
      const testChatbot = new IntelligentChatbot(limitedConfig, mockSemanticSearch, mockLogger)

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      // Send more messages than the limit
      for (let i = 0; i < 5; i++) {
        await testChatbot.processMessage('user123', 'session456', `Message ${i + 1}`)
      }

      const conversationHistory = testChatbot.getConversationHistory('user123', 'session456')

      expect(conversationHistory?.conversationHistory).toHaveLength(3)
      expect(conversationHistory?.conversationHistory[0].userMessage).toBe('Message 3')
      expect(conversationHistory?.conversationHistory[2].userMessage).toBe('Message 5')
    })
  })

  describe('Proactive Assistance', () => {
    test('should generate proactive suggestions based on workflow context', async () => {
      const workflowContext = {
        type: 'data-processing',
        currentStep: 'validation',
        blockTypes: ['transform', 'filter'],
        completedSteps: ['import'],
        errors: [
          {
            code: 'HIGH_ERROR_RATE',
            message: 'Many validation failures detected',
            context: 'Error rate: 15%',
            timestamp: new Date().toISOString(),
            resolved: false,
          },
        ],
        timeSpent: 900000, // 15 minutes
      }

      mockSemanticSearch.getSuggestions = jest.fn().mockResolvedValue([
        {
          id: 'validation-tips',
          title: 'Data Validation Best Practices',
          content: 'Tips for improving data validation...',
          score: 0.95,
          tags: ['validation', 'best-practices'],
        },
      ])

      const suggestions = await chatbot.generateProactiveAssistance('user123', workflowContext)

      expect(suggestions).toBeDefined()
      expect(suggestions?.message).toContain('high error rate')
      expect(suggestions?.suggestedActions).toHaveLength(expect.any(Number))
      expect(suggestions?.relatedContent).toHaveLength(expect.any(Number))
      expect(suggestions?.priority).toBeGreaterThan(7) // High priority due to errors
    })

    test('should not generate suggestions for normal workflow progress', async () => {
      const normalWorkflowContext = {
        type: 'data-processing',
        currentStep: 'transform',
        blockTypes: ['transform'],
        completedSteps: ['import', 'validation'],
        errors: [],
        timeSpent: 120000, // 2 minutes
      }

      const suggestions = await chatbot.generateProactiveAssistance(
        'user123',
        normalWorkflowContext
      )

      expect(suggestions).toBeNull()
    })
  })

  describe('Performance and Scalability', () => {
    test('should handle concurrent message processing', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(chatbot.processMessage(`user${i}`, `session${i}`, `Message ${i}`))
      }

      const responses = await Promise.all(promises)

      expect(responses).toHaveLength(10)
      responses.forEach((response, index) => {
        expect(response.message).toBeDefined()
        expect(response.conversationState).toBeDefined()
      })
    })

    test('should clean up expired conversations', async () => {
      const shortTimeoutConfig = { ...testConfig, conversationTimeout: 1000 }
      const testChatbot = new IntelligentChatbot(shortTimeoutConfig, mockSemanticSearch, mockLogger)

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      // Create conversations
      await testChatbot.processMessage('user1', 'session1', 'Hello')
      await testChatbot.processMessage('user2', 'session2', 'Hello')

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1200))

      // Check that conversations were cleaned up
      const conversation1 = testChatbot.getConversationHistory('user1', 'session1')
      const conversation2 = testChatbot.getConversationHistory('user2', 'session2')

      expect(conversation1).toBeNull()
      expect(conversation2).toBeNull()
    })

    test('should measure and report performance metrics', () => {
      const metrics = chatbot.getMetrics()

      expect(metrics).toMatchObject({
        totalConversations: expect.any(Number),
        totalMessages: expect.any(Number),
        averageResponseTime: expect.any(Number),
        successRate: expect.any(Number),
        activeConversations: expect.any(Number),
        intentClassificationAccuracy: expect.any(Number),
        proactiveAssistanceTriggered: expect.any(Number),
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty messages gracefully', async () => {
      await expect(chatbot.processMessage('user123', 'session456', '')).rejects.toThrow(
        'Message cannot be empty'
      )
    })

    test('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(10000)

      await expect(chatbot.processMessage('user123', 'session456', longMessage)).rejects.toThrow(
        'Message too long'
      )
    })

    test('should handle invalid user IDs', async () => {
      await expect(chatbot.processMessage('', 'session456', 'Hello')).rejects.toThrow(
        'User ID is required'
      )
    })

    test('should handle Claude API errors gracefully', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: { type: 'invalid_request_error', message: 'Invalid request' },
        }),
      }
      mockFetch.mockResolvedValue(errorResponse as any)

      await expect(chatbot.processMessage('user123', 'session456', 'Hello')).rejects.toThrow(
        'Invalid request'
      )
    })

    test('should handle malformed API responses', async () => {
      const malformedResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          // Missing required fields
        }),
      }
      mockFetch.mockResolvedValue(malformedResponse as any)

      await expect(chatbot.processMessage('user123', 'session456', 'Hello')).rejects.toThrow()
    })
  })

  describe('Integration with Semantic Search', () => {
    test('should integrate with semantic search for context enhancement', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: "Based on the search results, here's how to help." }],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      mockSemanticSearch.search = jest.fn().mockResolvedValue([
        {
          id: 'doc1',
          title: 'Troubleshooting Guide',
          content: 'Common solutions...',
          score: 0.9,
          tags: ['troubleshooting'],
        },
      ])

      const response = await chatbot.processMessage(
        'user123',
        'session456',
        "I'm having trouble with my workflow"
      )

      expect(mockSemanticSearch.search).toHaveBeenCalledWith(
        expect.stringContaining('trouble'),
        expect.any(Object),
        expect.any(Object)
      )

      expect(response.relatedContent).toBeDefined()
      expect(response.relatedContent).toHaveLength(expect.any(Number))
    })

    test('should handle semantic search failures gracefully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'I can help without search results.' }],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      mockSemanticSearch.search = jest.fn().mockRejectedValue(new Error('Search failed'))

      const response = await chatbot.processMessage('user123', 'session456', 'Hello')

      expect(response.message).toBeDefined()
      expect(response.relatedContent).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to get semantic search results/),
        expect.any(Object)
      )
    })
  })

  describe('Memory and Resource Management', () => {
    test('should clear conversation when requested', () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Hello!' }],
        }),
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      // Create conversation
      chatbot.processMessage('user123', 'session456', 'Hello')

      // Clear conversation
      chatbot.clearConversation('user123', 'session456')

      // Verify cleared
      const conversation = chatbot.getConversationHistory('user123', 'session456')
      expect(conversation).toBeNull()
    })

    test('should handle shutdown gracefully', async () => {
      await expect(chatbot.shutdown()).resolves.not.toThrow()

      expect(mockLogger.info).toHaveBeenCalledWith('IntelligentChatbot shutdown completed')
    })
  })
})
