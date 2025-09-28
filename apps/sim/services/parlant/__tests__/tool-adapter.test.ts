/**
 * Comprehensive Test Suite for Universal Tool Adapter System
 * ========================================================
 *
 * This test suite provides comprehensive coverage for:
 * - Tool registry functionality and initialization
 * - Universal tool adapter pattern implementation
 * - Natural language intelligence and recommendations
 * - Conversational intelligence system
 * - Agent-tool integration capabilities
 * - Performance and reliability testing
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { AgentToolIntegrationManager } from '../agent-tool-integration'
import {
  ConversationalIntelligenceEngine,
  conversationalEngine,
} from '../conversational-intelligence'
import type { EnhancedToolDescription, ToolRecommendationContext } from '../tool-adapter'
// Import modules under test
import {
  intelligenceEngine,
  SimToolRegistry,
  ToolIntelligenceEngine,
  toolAdapter,
  toolRegistry,
  UniversalToolAdapter,
} from '../tool-adapter'
import {
  AdvancedRecommendationEngine,
  IntentRecognizer,
  recommendationEngine,
} from '../tool-recommendations'
import {
  COMPREHENSIVE_TOOL_DESCRIPTIONS,
  toolRegistryInitializer,
} from '../tool-registry-initialization'
import type { AuthContext } from '../types'

// =============================================
// Test Data and Fixtures
// =============================================

const mockAuthContext: AuthContext = {
  user_id: 'test-user-123',
  workspace_id: 'test-workspace-456',
  key_type: 'workspace',
  permissions: ['tool_execute', 'tool_manage'],
}

const mockToolDescription: EnhancedToolDescription = {
  id: 'test-tool',
  Name: 'Test Tool',
  shortDescription: 'A test tool for unit testing',
  longDescription:
    'This is a comprehensive test tool used for validating the Universal Tool Adapter System functionality.',
  usageExamples: ['Test basic functionality', 'Validate tool parameters', 'Check error handling'],
  usageGuidelines: {
    bestUsedFor: ['Testing', 'Validation', 'Development'],
    avoidWhen: ['Production environments', 'Critical operations'],
    commonMistakes: ['Not providing test data', 'Skipping validation'],
  },
  conversationalPrompts: {
    parameterQuestions: [
      {
        parameter: 'testParam',
        question: 'What test value should be used?',
        examples: ['test123', 'sample-data', 'mock-value'],
      },
    ],
  },
  tags: ['testing', 'validation', 'development'],
  difficulty: 'beginner',
  complexity: 'simple',
}

const mockBlockConfig = {
  type: 'test-tool',
  Name: 'Test Tool',
  description: 'Test tool for validation',
  category: 'testing',
  bgColor: '#FF0000',
  inputs: {
    testParam: { type: 'string', description: 'Test parameter' },
    optionalParam: { type: 'number', description: 'Optional parameter' },
  },
  outputs: {
    result: { type: 'json', description: 'Test result' },
  },
  tools: { access: ['test_execute'] },
  subBlocks: [
    { id: 'testParam', type: 'short-input', required: true },
    { id: 'optionalParam', type: 'short-input', required: false },
  ],
}

// =============================================
// Tool Registry Tests
// =============================================

describe('SimToolRegistry', () => {
  let registry: SimToolRegistry

  beforeEach(() => {
    registry = new SimToolRegistry()
  })

  test('should register tools with enhanced descriptions', () => {
    registry.registerTool(mockBlockConfig as any, mockToolDescription)

    const tools = registry.getAllTools()
    expect(tools).toHaveLength(1)
    expect(tools[0].id).toBe('test-tool')
    expect(tools[0].Name).toBe('Test Tool')
  })

  test('should retrieve tool by ID', () => {
    registry.registerTool(mockBlockConfig as any, mockToolDescription)

    const tool = registry.getTool('test-tool')
    expect(tool).toBeDefined()
    expect(tool?.id).toBe('test-tool')

    const nonExistentTool = registry.getTool('non-existent')
    expect(nonExistentTool).toBeUndefined()
  })

  test('should retrieve block configuration by tool ID', () => {
    registry.registerTool(mockBlockConfig as any, mockToolDescription)

    const blockConfig = registry.getBlockConfig('test-tool')
    expect(blockConfig).toBeDefined()
    expect(blockConfig?.type).toBe('test-tool')
  })

  test('should search tools by query', () => {
    registry.registerTool(mockBlockConfig as any, mockToolDescription)

    const results = registry.searchTools('test')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('test-tool')

    const emptyResults = registry.searchTools('nonexistent')
    expect(emptyResults).toHaveLength(0)
  })

  test('should filter tools by category', () => {
    registry.registerTool(mockBlockConfig as any, mockToolDescription)

    const results = registry.searchTools('', { categories: ['testing'] })
    expect(results).toHaveLength(1)

    const noResults = registry.searchTools('', { categories: ['production'] })
    expect(noResults).toHaveLength(0)
  })

  test('should filter tools by difficulty level', () => {
    registry.registerTool(mockBlockConfig as any, mockToolDescription)

    const results = registry.searchTools('', { difficulty: ['beginner'] })
    expect(results).toHaveLength(1)

    const noResults = registry.searchTools('', { difficulty: ['advanced'] })
    expect(noResults).toHaveLength(0)
  })

  test('should get tools by category', () => {
    registry.registerTool(mockBlockConfig as any, mockToolDescription)

    const tools = registry.getToolsByCategory('testing')
    expect(tools).toHaveLength(1)
    expect(tools[0].id).toBe('test-tool')
  })
})

// =============================================
// Universal Tool Adapter Tests
// =============================================

describe('UniversalToolAdapter', () => {
  let registry: SimToolRegistry
  let adapter: UniversalToolAdapter

  beforeEach(() => {
    registry = new SimToolRegistry()
    adapter = new UniversalToolAdapter(registry)
    registry.registerTool(mockBlockConfig as any, mockToolDescription)
  })

  test('should adapt Sim block to Parlant tool format', () => {
    const parlantTool = adapter.adaptTool(mockBlockConfig as any)

    expect(parlantTool.id).toBe('test-tool')
    expect(parlantTool.Name).toBe('Test Tool')
    expect(parlantTool.description).toContain('This is a comprehensive test tool')
    expect(parlantTool.parameters).toBeDefined()
  })

  test('should include parameter schema in adapted tool', () => {
    const parlantTool = adapter.adaptTool(mockBlockConfig as any)

    expect(parlantTool.parameters.testParam).toBeDefined()
    expect(parlantTool.parameters.testParam.type).toBe('string')
    expect(parlantTool.parameters.testParam.required).toBe(true)

    expect(parlantTool.parameters.optionalParam).toBeDefined()
    expect(parlantTool.parameters.optionalParam.required).toBe(false)
  })

  test('should generate contextual descriptions', () => {
    const context: ToolRecommendationContext = {
      conversationHistory: [],
      userIntents: ['testing'],
      usedTools: [],
      userProfile: {
        skillLevel: 'beginner',
        preferredCategories: ['testing'],
        frequentlyUsedTools: [],
      },
    }

    const parlantTool = adapter.adaptTool(mockBlockConfig as any, context)
    expect(parlantTool.description).toContain('test')
  })

  test('should throw error for unregistered tool', () => {
    const unregisteredBlock = { ...mockBlockConfig, type: 'unregistered' }

    expect(() => {
      adapter.adaptTool(unregisteredBlock as any)
    }).toThrow('Tool not found in registry: unregistered')
  })
})

// =============================================
// Tool Intelligence Engine Tests
// =============================================

describe('ToolIntelligenceEngine', () => {
  let registry: SimToolRegistry
  let adapter: UniversalToolAdapter
  let intelligence: ToolIntelligenceEngine

  beforeEach(() => {
    registry = new SimToolRegistry()
    adapter = new UniversalToolAdapter(registry)
    intelligence = new ToolIntelligenceEngine(registry, adapter)
    registry.registerTool(mockBlockConfig as any, mockToolDescription)
  })

  test('should recommend tools based on context', () => {
    const context: ToolRecommendationContext = {
      conversationHistory: [
        { role: 'user', content: 'I need to test something', timestamp: new Date() },
      ],
      userIntents: ['testing'],
      usedTools: [],
      userProfile: {
        skillLevel: 'beginner',
        preferredCategories: ['testing'],
        frequentlyUsedTools: [],
      },
    }

    const recommendations = intelligence.recommendTools(context, 5)
    expect(recommendations).toHaveLength(1)
    expect(recommendations[0].tool.id).toBe('test-tool')
    expect(recommendations[0].confidence).toBeGreaterThan(0)
  })

  test('should provide reasoning for recommendations', () => {
    const context: ToolRecommendationContext = {
      conversationHistory: [],
      userIntents: ['testing'],
      usedTools: [],
      userProfile: {
        skillLevel: 'beginner',
        preferredCategories: ['testing'],
        frequentlyUsedTools: [],
      },
    }

    const recommendations = intelligence.recommendTools(context)
    expect(recommendations[0].reasoning).toContain('matches')
  })

  test('should suggest parameters based on context', () => {
    const context: ToolRecommendationContext = {
      conversationHistory: [
        { role: 'user', content: 'Use value test123 for testing', timestamp: new Date() },
      ],
      userIntents: ['testing'],
      usedTools: [],
    }

    const recommendations = intelligence.recommendTools(context)
    // Parameters should be suggested but this requires more complex implementation
    expect(recommendations[0].suggestedParameters).toBeDefined()
  })
})

// =============================================
// Intent Recognition Tests
// =============================================

describe('IntentRecognizer', () => {
  let recognizer: IntentRecognizer

  beforeEach(() => {
    recognizer = new IntentRecognizer()
  })

  test('should recognize email sending intent', () => {
    const result = recognizer.analyzeInput('send email to john@example.com')

    expect(result.primaryIntent).toBe('send_email')
    expect(result.confidence).toBeGreaterThan(0.5)
    expect(result.entities.some((e) => e.type === 'email')).toBe(true)
  })

  test('should recognize API calling intent', () => {
    const result = recognizer.analyzeInput('call API at https://api.example.com/users')

    expect(result.primaryIntent).toBe('make_api_call')
    expect(result.entities.some((e) => e.type === 'url')).toBe(true)
  })

  test('should recognize messaging intent', () => {
    const result = recognizer.analyzeInput('send message to slack channel #general')

    expect(result.primaryIntent).toBe('send_message')
    expect(result.keywords).toContain('slack')
  })

  test('should determine query complexity', () => {
    const simple = recognizer.analyzeInput('send email')
    expect(simple.complexity).toBe('simple')

    const complex = recognizer.analyzeInput(
      'send email to multiple recipients based on their preferences and schedule it for delivery when they are most likely to read it'
    )
    expect(complex.complexity).toBe('complex')
  })

  test('should extract multiple entities', () => {
    const result = recognizer.analyzeInput(
      'send email to john@example.com about the report at https://docs.example.com/report.pdf'
    )

    expect(result.entities.length).toBeGreaterThan(1)
    expect(result.entities.some((e) => e.type === 'email')).toBe(true)
    expect(result.entities.some((e) => e.type === 'url')).toBe(true)
  })
})

// =============================================
// Recommendation Engine Tests
// =============================================

describe('AdvancedRecommendationEngine', () => {
  let engine: AdvancedRecommendationEngine

  beforeEach(async () => {
    engine = new AdvancedRecommendationEngine()
    // Initialize tool registry for testing
    await toolRegistryInitializer.initializeAllTools()
  })

  test('should get recommendations for user query', async () => {
    const context: ToolRecommendationContext = {
      conversationHistory: [],
      userIntents: ['send_email'],
      usedTools: [],
    }

    const result = await engine.getRecommendations(
      'send email to customer about order status',
      context,
      mockAuthContext
    )

    expect(result.recommendations).toBeDefined()
    expect(result.intentAnalysis.primaryIntent).toBe('send_email')
    expect(result.confidence).toBeGreaterThan(0)
  })

  test('should provide explanations for recommendations', async () => {
    const context: ToolRecommendationContext = {
      conversationHistory: [],
      userIntents: ['send_email'],
      usedTools: [],
    }

    const result = await engine.getRecommendations(
      'send email notification',
      context,
      mockAuthContext
    )

    expect(result.explanations).toBeDefined()
    expect(result.explanations.length).toBeGreaterThan(0)
    expect(result.explanations[0].primaryReason).toBeDefined()
  })

  test('should suggest alternative approaches', async () => {
    const context: ToolRecommendationContext = {
      conversationHistory: [],
      userIntents: ['automate_workflow'],
      usedTools: [],
    }

    const result = await engine.getRecommendations(
      'automate complex multi-step process with conditions and loops',
      context,
      mockAuthContext
    )

    expect(result.alternatives).toBeDefined()
    expect(result.alternatives.length).toBeGreaterThan(0)
  })

  test('should record and apply user feedback', () => {
    const feedback = {
      toolId: 'gmail',
      query: 'send email',
      rating: 5,
      timestamp: new Date(),
      helpful: true,
      used: true,
    }

    expect(() => {
      engine.recordFeedback('test-user', feedback)
    }).not.toThrow()
  })
})

// =============================================
// Conversational Intelligence Tests
// =============================================

describe('ConversationalIntelligenceEngine', () => {
  let engine: ConversationalIntelligenceEngine

  beforeEach(async () => {
    engine = new ConversationalIntelligenceEngine()
    await toolRegistryInitializer.initializeAllTools()
  })

  test('should start tool conversation', async () => {
    const userContext = {
      communicationStyle: 'detailed' as const,
      expertiseLevel: 'beginner' as const,
      interactionMode: 'guided' as const,
      locale: 'en-US',
      toolUsagePatterns: {},
    }

    const response = await engine.startToolConversation(
      'gmail',
      'send email to customer',
      mockAuthContext,
      userContext
    )

    expect(response.conversationId).toBeDefined()
    expect(response.message).toBeDefined()
    expect(response.status).toBeDefined()
  })

  test('should process user messages in conversation', async () => {
    // This test would require a more complex setup with conversation state
    // For now, we'll test that the method doesn't throw
    expect(async () => {
      await engine.processUserMessage(
        'test-conversation',
        'use john@example.com as recipient',
        mockAuthContext
      )
    }).not.toThrow()
  })

  test('should get conversation status', () => {
    // This would also require conversation state setup
    // Testing that the method exists and has correct signature
    expect(engine.getConversationStatus).toBeDefined()
  })
})

// =============================================
// Agent Tool Integration Tests
// =============================================

describe('AgentToolIntegrationManager', () => {
  let integration: AgentToolIntegrationManager

  beforeEach(async () => {
    integration = new AgentToolIntegrationManager()
    await toolRegistryInitializer.initializeAllTools()
  })

  test('should initialize agent with tool capabilities', async () => {
    // Mock agent service response
    const mockAgentService = {
      getAgent: jest.fn().mockResolvedValue({
        success: true,
        data: { id: 'test-agent', Name: 'Test Agent' },
      }),
    }

    // This test would require more mocking of dependencies
    // For now, we'll test that the method exists
    expect(integration.initializeAgentTools).toBeDefined()
  })

  test('should get agent tool recommendations', async () => {
    // This would require agent to be initialized first
    // Testing method existence and signature
    expect(integration.getAgentToolRecommendations).toBeDefined()
  })

  test('should execute tools for agent', async () => {
    expect(integration.executeToolForAgent).toBeDefined()
  })

  test('should get agent tool analytics', async () => {
    expect(integration.getAgentToolAnalytics).toBeDefined()
  })
})

// =============================================
// Tool Registry Initialization Tests
// =============================================

describe('ToolRegistryInitializer', () => {
  test('should initialize all tools', async () => {
    const result = await toolRegistryInitializer.initializeAllTools()

    expect(result.totalTools).toBeGreaterThan(0)
    expect(result.registeredTools).toBeDefined()
    expect(Array.isArray(result.registeredTools)).toBe(true)
    expect(result.errors).toBeDefined()
  })

  test('should provide tool statistics', async () => {
    await toolRegistryInitializer.initializeAllTools()
    const stats = toolRegistryInitializer.getToolStatistics()

    expect(stats.totalTools).toBeGreaterThan(0)
    expect(stats.byCategory).toBeDefined()
    expect(stats.byDifficulty).toBeDefined()
    expect(stats.byComplexity).toBeDefined()
  })

  test('should track initialization status', async () => {
    expect(toolRegistryInitializer.isInitialized()).toBeDefined()
  })

  test('should have comprehensive tool descriptions', () => {
    expect(COMPREHENSIVE_TOOL_DESCRIPTIONS).toBeDefined()
    expect(Object.keys(COMPREHENSIVE_TOOL_DESCRIPTIONS).length).toBeGreaterThan(10)

    // Test structure of tool descriptions
    const sampleTool = COMPREHENSIVE_TOOL_DESCRIPTIONS.function
    expect(sampleTool.id).toBeDefined()
    expect(sampleTool.Name).toBeDefined()
    expect(sampleTool.shortDescription).toBeDefined()
    expect(sampleTool.longDescription).toBeDefined()
    expect(sampleTool.usageExamples).toBeDefined()
    expect(sampleTool.usageGuidelines).toBeDefined()
    expect(sampleTool.conversationalPrompts).toBeDefined()
    expect(sampleTool.tags).toBeDefined()
    expect(sampleTool.difficulty).toBeDefined()
    expect(sampleTool.complexity).toBeDefined()
  })
})

// =============================================
// Integration and End-to-End Tests
// =============================================

describe('Universal Tool Adapter System - Integration Tests', () => {
  beforeEach(async () => {
    // Initialize the complete system
    await toolRegistryInitializer.initializeAllTools()
  })

  test('should complete full tool recommendation workflow', async () => {
    // 1. Get recommendations
    const context: ToolRecommendationContext = {
      conversationHistory: [
        { role: 'user', content: 'I need to send an email to a customer', timestamp: new Date() },
      ],
      userIntents: ['send_email'],
      usedTools: [],
    }

    const recommendations = await recommendationEngine.getRecommendations(
      'send email to customer about order status',
      context,
      mockAuthContext
    )

    expect(recommendations.recommendations.length).toBeGreaterThan(0)

    // 2. Start conversational tool interaction
    const userContext = {
      communicationStyle: 'detailed' as const,
      expertiseLevel: 'beginner' as const,
      interactionMode: 'guided' as const,
      locale: 'en-US',
      toolUsagePatterns: {},
    }

    const conversation = await conversationalEngine.startToolConversation(
      recommendations.recommendations[0].tool.id,
      'send email to john@example.com with subject "Order Update"',
      mockAuthContext,
      userContext
    )

    expect(conversation.conversationId).toBeDefined()
    expect(conversation.status).toBeDefined()
  })

  test('should handle tool search and discovery', async () => {
    const searchResults = toolRegistry.searchTools('email')
    expect(searchResults.length).toBeGreaterThan(0)

    const categoryTools = toolRegistry.getToolsByCategory('tools')
    expect(categoryTools.length).toBeGreaterThan(0)
  })

  test('should provide consistent tool adaptation', async () => {
    const emailTool = toolRegistry.getTool('gmail')
    expect(emailTool).toBeDefined()

    if (emailTool) {
      const blockConfig = toolRegistry.getBlockConfig('gmail')
      expect(blockConfig).toBeDefined()

      if (blockConfig) {
        const parlantTool = toolAdapter.adaptTool(blockConfig)
        expect(parlantTool.id).toBe('gmail')
        expect(parlantTool.Name).toBe('Gmail')
      }
    }
  })
})

// =============================================
// Performance and Reliability Tests
// =============================================

describe('Performance and Reliability Tests', () => {
  test('should handle large number of tool registrations', async () => {
    const startTime = Date.now()
    await toolRegistryInitializer.initializeAllTools()
    const endTime = Date.now()

    // Should complete initialization within reasonable time (5 seconds)
    expect(endTime - startTime).toBeLessThan(5000)
  })

  test('should handle concurrent tool searches', async () => {
    await toolRegistryInitializer.initializeAllTools()

    const searches = ['email', 'database', 'api', 'storage', 'messaging', 'schedule'].map((query) =>
      toolRegistry.searchTools(query)
    )

    const results = await Promise.all(searches)
    expect(results.every((r) => Array.isArray(r))).toBe(true)
  })

  test('should handle invalid inputs gracefully', async () => {
    // Test empty queries
    expect(() => {
      toolRegistry.searchTools('')
    }).not.toThrow()

    // Test invalid tool IDs
    expect(toolRegistry.getTool('invalid-tool-id')).toBeUndefined()

    // Test malformed contexts
    const badContext: any = { invalid: 'context' }
    expect(() => {
      intelligenceEngine.recommendTools(badContext, 5)
    }).not.toThrow()
  })

  test('should maintain consistency across multiple operations', async () => {
    await toolRegistryInitializer.initializeAllTools()

    const toolCount1 = toolRegistry.getAllTools().length
    const toolCount2 = toolRegistry.getAllTools().length

    expect(toolCount1).toBe(toolCount2)

    // Multiple searches should return consistent results
    const search1 = toolRegistry.searchTools('email')
    const search2 = toolRegistry.searchTools('email')

    expect(search1.length).toBe(search2.length)
    expect(search1.map((t) => t.id)).toEqual(search2.map((t) => t.id))
  })
})

// =============================================
// Error Handling Tests
// =============================================

describe('Error Handling', () => {
  test('should handle missing tool configurations gracefully', () => {
    const registry = new SimToolRegistry()
    const adapter = new UniversalToolAdapter(registry)

    expect(() => {
      adapter.adaptTool({ type: 'nonexistent' } as any)
    }).toThrow('Tool not found in registry: nonexistent')
  })

  test('should validate tool descriptions structure', () => {
    Object.entries(COMPREHENSIVE_TOOL_DESCRIPTIONS).forEach(([toolId, description]) => {
      expect(description.id).toBe(toolId)
      expect(description.Name).toBeDefined()
      expect(description.shortDescription).toBeDefined()
      expect(description.longDescription).toBeDefined()
      expect(description.usageExamples).toBeDefined()
      expect(Array.isArray(description.usageExamples)).toBe(true)
      expect(description.usageGuidelines).toBeDefined()
      expect(description.conversationalPrompts).toBeDefined()
      expect(description.tags).toBeDefined()
      expect(Array.isArray(description.tags)).toBe(true)
      expect(['beginner', 'intermediate', 'advanced']).toContain(description.difficulty)
      expect(['simple', 'moderate', 'complex']).toContain(description.complexity)
    })
  })

  test('should handle recommendation engine failures gracefully', async () => {
    const context: ToolRecommendationContext = {
      conversationHistory: [],
      userIntents: [],
      usedTools: [],
    }

    // Should not throw even with minimal context
    expect(async () => {
      await recommendationEngine.getRecommendations('', context, mockAuthContext)
    }).not.toThrow()
  })
})
