/**
 * @fileoverview Unit tests for Intelligent Error Recovery Engine
 * Comprehensive test suite covering error recovery, classification, and analytics
 *
 * @version 1.0.0
 * @author Intelligent Error Handling Agent
 * @created 2025-09-24
 */

import { EventEmitter } from 'events';
import {
  IntelligentErrorRecoveryEngine,
  ErrorRecoveryContext,
  IntelligentRecoveryPlan,
  RecoveryAction,
  ErrorClassification,
  AlternativeToolRecommendation,
  RecoveryActionType,
  ErrorCategory,
  ErrorSeverity,
  createErrorRecoveryEngine,
  PRODUCTION_ERROR_CONFIG,
  DEVELOPMENT_ERROR_CONFIG
} from '../intelligent-error-recovery-engine';

// Mock dependencies
jest.mock('../../../parlant-server/error-intelligence', () => ({
  ErrorIntelligenceService: jest.fn().mockImplementation(() => ({
    analyzeError: jest.fn(),
    generateExplanation: jest.fn(),
    getRecommendations: jest.fn(),
    getCulturalAdaptations: jest.fn(),
    learnFromOutcome: jest.fn()
  }))
}));

jest.mock('../contextual-recommendation-engine', () => ({
  ContextualRecommendationEngine: jest.fn().mockImplementation(() => ({
    getToolRecommendations: jest.fn(),
    getSimilarityScore: jest.fn(),
    updateUserPreferences: jest.fn(),
    getContextualSuggestions: jest.fn()
  }))
}));

jest.mock('../natural-language-description-framework', () => ({
  NaturalLanguageDescriptionFramework: jest.fn().mockImplementation(() => ({
    generateDescription: jest.fn(),
    formatMessage: jest.fn(),
    adaptToUserLevel: jest.fn(),
    getContextualExamples: jest.fn()
  }))
}));

/**
 * Mock implementations for testing
 */
class MockErrorIntelligenceService extends EventEmitter {
  async analyzeError(error: Error, context: any) {
    return {
      category: 'network',
      severity: 'high',
      confidence: 0.85,
      patterns: ['timeout_pattern'],
      suggestedActions: ['retry', 'check_connection']
    };
  }

  async generateExplanation(error: Error, context: any) {
    return {
      userFriendlyMessage: 'Network connection failed. Please check your internet connection.',
      technicalDetails: 'Connection timeout after 5000ms',
      possibleCauses: ['Network connectivity issues', 'Server overload'],
      nextSteps: ['Try again in a moment', 'Check network settings']
    };
  }

  async getRecommendations(error: Error, context: any) {
    return [
      { action: 'retry', confidence: 0.9, reasoning: 'Transient network issues often resolve with retry' },
      { action: 'alternative_endpoint', confidence: 0.7, reasoning: 'Use backup server endpoint' }
    ];
  }
}

class MockContextualRecommendationEngine extends EventEmitter {
  async getToolRecommendations(context: any, options: any = {}) {
    return {
      recommendations: [
        {
          toolName: 'backup_api_client',
          confidence: 0.85,
          reasoning: 'Proven reliable alternative for API calls',
          estimatedSuccess: 0.9,
          userSpecific: false
        }
      ],
      metadata: {
        totalAlternatives: 3,
        processingTime: 120,
        cacheHit: false
      }
    };
  }

  async getSimilarityScore(tool1: string, tool2: string) {
    return 0.75;
  }
}

class MockNaturalLanguageFramework extends EventEmitter {
  async generateDescription(content: any, options: any = {}) {
    return {
      brief: 'Network error occurred',
      detailed: 'A network connection error prevented the operation from completing successfully.',
      expert: 'TCP connection timeout (ETIMEDOUT) after 5000ms to endpoint api.example.com:443',
      examples: ['Check your internet connection', 'Verify the server is accessible'],
      alternatives: ['Use offline mode', 'Try alternative server']
    };
  }

  async formatMessage(message: string, options: any = {}) {
    return `Formatted: ${message}`;
  }
}

describe('IntelligentErrorRecoveryEngine', () => {
  let recoveryEngine: IntelligentErrorRecoveryEngine;
  let mockErrorIntelligence: MockErrorIntelligenceService;
  let mockRecommendationEngine: MockContextualRecommendationEngine;
  let mockNLFramework: MockNaturalLanguageFramework;

  beforeEach(() => {
    // Create mock instances
    mockErrorIntelligence = new MockErrorIntelligenceService();
    mockRecommendationEngine = new MockContextualRecommendationEngine();
    mockNLFramework = new MockNaturalLanguageFramework();

    // Create recovery engine with mocked dependencies
    recoveryEngine = new IntelligentErrorRecoveryEngine({
      errorIntelligenceService: mockErrorIntelligence as any,
      recommendationEngine: mockRecommendationEngine as any,
      nlFramework: mockNLFramework as any,
      enableAnalytics: false, // Disable for unit tests
      retryConfiguration: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      }
    });
  });

  afterEach(() => {
    // Clean up any timers or listeners
    recoveryEngine.removeAllListeners();
    jest.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('should correctly classify network errors', async () => {
      const error = new Error('Connection timeout');
      (error as any).code = 'ETIMEDOUT';

      const context: ErrorRecoveryContext = {
        toolName: 'api_client',
        operation: 'fetchUserData',
        parameters: { userId: '123' },
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const classification = await recoveryEngine.classifyError(error, context);

      expect(classification).toBeDefined();
      expect(classification.category).toBe('network');
      expect(classification.severity).toBe('medium');
      expect(classification.isRetryable).toBe(true);
      expect(classification.confidence).toBeGreaterThan(0.8);
      expect(classification.patterns).toContain('network_timeout');
    });

    it('should classify validation errors correctly', async () => {
      const error = new Error('Invalid input: email format');
      (error as any).name = 'ValidationError';

      const context: ErrorRecoveryContext = {
        toolName: 'user_validator',
        operation: 'validateUserInput',
        parameters: { email: 'invalid-email' },
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const classification = await recoveryEngine.classifyError(error, context);

      expect(classification.category).toBe('validation');
      expect(classification.severity).toBe('low');
      expect(classification.isRetryable).toBe(false);
      expect(classification.requiresUserAction).toBe(true);
    });

    it('should handle system errors appropriately', async () => {
      const error = new Error('Out of memory');
      (error as any).name = 'SystemError';

      const context: ErrorRecoveryContext = {
        toolName: 'data_processor',
        operation: 'processLargeDataset',
        parameters: { size: 1000000 },
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 1,
        platform: 'server'
      };

      const classification = await recoveryEngine.classifyError(error, context);

      expect(classification.category).toBe('system');
      expect(classification.severity).toBe('critical');
      expect(classification.isRetryable).toBe(false);
      expect(classification.requiresEscalation).toBe(true);
    });
  });

  describe('Recovery Plan Generation', () => {
    it('should generate comprehensive recovery plan for network errors', async () => {
      const error = new Error('Network timeout');
      (error as any).code = 'ETIMEDOUT';

      const context: ErrorRecoveryContext = {
        toolName: 'api_client',
        operation: 'fetchData',
        parameters: { url: 'https://api.example.com/data' },
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const recoveryPlan = await recoveryEngine.generateRecoveryPlan(error, context);

      expect(recoveryPlan).toBeDefined();
      expect(recoveryPlan.id).toBeDefined();
      expect(recoveryPlan.classification).toBeDefined();
      expect(recoveryPlan.userFriendlyExplanation).toBeDefined();
      expect(recoveryPlan.technicalAnalysis).toBeDefined();
      expect(recoveryPlan.recoveryActions).toHaveLength(3);
      expect(recoveryPlan.alternativeTools).toBeDefined();
      expect(recoveryPlan.preventionSuggestions).toBeDefined();
      expect(recoveryPlan.estimatedRecoveryTime).toBeGreaterThan(0);

      // Verify recovery actions are properly structured
      recoveryPlan.recoveryActions.forEach(action => {
        expect(action.type).toBeDefined();
        expect(action.description).toBeDefined();
        expect(action.instructions).toBeDefined();
        expect(action.estimatedTime).toBeGreaterThan(0);
        expect(action.successProbability).toBeGreaterThan(0);
        expect(action.successProbability).toBeLessThanOrEqual(1);
      });
    });

    it('should prioritize recovery actions by success probability', async () => {
      const error = new Error('Service unavailable');
      const context: ErrorRecoveryContext = {
        toolName: 'service_client',
        operation: 'callService',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 1,
        platform: 'web'
      };

      const recoveryPlan = await recoveryEngine.generateRecoveryPlan(error, context);

      const actions = recoveryPlan.recoveryActions;
      expect(actions.length).toBeGreaterThan(1);

      // Verify actions are sorted by success probability (descending)
      for (let i = 0; i < actions.length - 1; i++) {
        expect(actions[i].successProbability).toBeGreaterThanOrEqual(actions[i + 1].successProbability);
      }
    });

    it('should include alternative tools when available', async () => {
      // Mock recommendation engine to return alternatives
      jest.spyOn(mockRecommendationEngine, 'getToolRecommendations').mockResolvedValue({
        recommendations: [
          {
            toolName: 'alternative_client',
            confidence: 0.9,
            reasoning: 'Backup tool with high reliability',
            estimatedSuccess: 0.85,
            userSpecific: false
          }
        ],
        metadata: {
          totalAlternatives: 1,
          processingTime: 150,
          cacheHit: false
        }
      });

      const error = new Error('Primary tool failed');
      const context: ErrorRecoveryContext = {
        toolName: 'primary_client',
        operation: 'fetchData',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const recoveryPlan = await recoveryEngine.generateRecoveryPlan(error, context);

      expect(recoveryPlan.alternativeTools).toBeDefined();
      expect(recoveryPlan.alternativeTools.length).toBeGreaterThan(0);
      expect(recoveryPlan.alternativeTools[0].toolName).toBe('alternative_client');
      expect(recoveryPlan.alternativeTools[0].confidence).toBe(0.9);
    });
  });

  describe('Recovery Action Execution', () => {
    it('should execute retry action successfully', async () => {
      const retryAction: RecoveryAction = {
        id: 'retry_001',
        type: 'retry' as RecoveryActionType,
        description: 'Retry the failed operation',
        instructions: ['Wait 2 seconds', 'Retry the operation'],
        estimatedTime: 2000,
        successProbability: 0.8,
        requirements: [],
        risks: [],
        parameters: {
          delay: 2000,
          maxRetries: 3
        }
      };

      const context: ErrorRecoveryContext = {
        toolName: 'test_tool',
        operation: 'testOperation',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const result = await recoveryEngine.executeRecoveryAction(retryAction, context);

      expect(result.success).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.actionId).toBe('retry_001');
    });

    it('should handle failed recovery action execution', async () => {
      const failingAction: RecoveryAction = {
        id: 'failing_001',
        type: 'manual_intervention' as RecoveryActionType,
        description: 'This action will fail',
        instructions: ['Manual step'],
        estimatedTime: 1000,
        successProbability: 0.1,
        requirements: [],
        risks: [],
        parameters: {
          forceFailure: true
        }
      };

      const context: ErrorRecoveryContext = {
        toolName: 'test_tool',
        operation: 'testOperation',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 2,
        platform: 'web'
      };

      const result = await recoveryEngine.executeRecoveryAction(failingAction, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.actionId).toBe('failing_001');
    });
  });

  describe('Alternative Tool Recommendations', () => {
    it('should get alternative tools for failed operations', async () => {
      const context: ErrorRecoveryContext = {
        toolName: 'primary_tool',
        operation: 'dataProcessing',
        parameters: { format: 'json' },
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 1,
        platform: 'web'
      };

      const alternatives = await recoveryEngine.getAlternativeTools(context);

      expect(alternatives).toBeDefined();
      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives[0].toolName).toBe('backup_api_client');
      expect(alternatives[0].confidence).toBe(0.85);
      expect(alternatives[0].reasoning).toBeDefined();
    });

    it('should filter alternatives by confidence threshold', async () => {
      // Mock low confidence recommendations
      jest.spyOn(mockRecommendationEngine, 'getToolRecommendations').mockResolvedValue({
        recommendations: [
          { toolName: 'high_confidence', confidence: 0.9, reasoning: 'Good option', estimatedSuccess: 0.9, userSpecific: false },
          { toolName: 'low_confidence', confidence: 0.3, reasoning: 'Poor option', estimatedSuccess: 0.4, userSpecific: false },
          { toolName: 'medium_confidence', confidence: 0.6, reasoning: 'OK option', estimatedSuccess: 0.7, userSpecific: false }
        ],
        metadata: { totalAlternatives: 3, processingTime: 100, cacheHit: false }
      });

      const context: ErrorRecoveryContext = {
        toolName: 'primary_tool',
        operation: 'operation',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const alternatives = await recoveryEngine.getAlternativeTools(context, {
        confidenceThreshold: 0.5
      });

      expect(alternatives.length).toBe(2); // Only high and medium confidence
      expect(alternatives.every(alt => alt.confidence >= 0.5)).toBe(true);
    });
  });

  describe('Learning and Improvement', () => {
    it('should learn from successful recovery outcomes', async () => {
      const recoveryPlanId = 'plan_123';
      const selectedAction: RecoveryAction = {
        id: 'action_123',
        type: 'retry' as RecoveryActionType,
        description: 'Retry operation',
        instructions: [],
        estimatedTime: 1000,
        successProbability: 0.8,
        requirements: [],
        risks: [],
        parameters: {}
      };

      const outcome = {
        success: true,
        actualResolutionTime: 1200,
        userSatisfaction: 4.5,
        effectivenessRating: 4.0,
        additionalFeedback: 'Worked well'
      };

      const result = await recoveryEngine.learnFromOutcome(recoveryPlanId, selectedAction, outcome);

      expect(result.success).toBe(true);
      expect(result.learningApplied).toBe(true);
      expect(result.confidenceUpdates).toBeDefined();
    });

    it('should adapt strategies based on failure patterns', async () => {
      const recoveryPlanId = 'plan_456';
      const selectedAction: RecoveryAction = {
        id: 'action_456',
        type: 'alternative_tool' as RecoveryActionType,
        description: 'Use backup tool',
        instructions: [],
        estimatedTime: 2000,
        successProbability: 0.9,
        requirements: [],
        risks: [],
        parameters: { toolName: 'backup_tool' }
      };

      const outcome = {
        success: false,
        actualResolutionTime: 5000,
        userSatisfaction: 2.0,
        effectivenessRating: 1.5,
        additionalFeedback: 'Did not help'
      };

      const result = await recoveryEngine.learnFromOutcome(recoveryPlanId, selectedAction, outcome);

      expect(result.success).toBe(true);
      expect(result.learningApplied).toBe(true);
      expect(result.confidenceUpdates.length).toBeGreaterThan(0);

      // Verify confidence was decreased for this action type
      const relevantUpdate = result.confidenceUpdates.find(
        update => update.actionType === 'alternative_tool'
      );
      expect(relevantUpdate).toBeDefined();
      expect(relevantUpdate?.confidenceAdjustment).toBeLessThan(0);
    });
  });

  describe('Integration with Analytics', () => {
    it('should emit analytics events during recovery process', (done) => {
      let eventCount = 0;
      const expectedEvents = ['error_classified', 'recovery_plan_generated', 'alternative_tools_found'];

      recoveryEngine.on('analytics_event', (event) => {
        expect(expectedEvents).toContain(event.type);
        eventCount++;

        if (eventCount === expectedEvents.length) {
          done();
        }
      });

      const error = new Error('Test error');
      const context: ErrorRecoveryContext = {
        toolName: 'test_tool',
        operation: 'test_op',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      recoveryEngine.generateRecoveryPlan(error, context);
    });

    it('should track performance metrics', async () => {
      const startTime = Date.now();

      const error = new Error('Performance test error');
      const context: ErrorRecoveryContext = {
        toolName: 'perf_tool',
        operation: 'perf_test',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'perf_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const plan = await recoveryEngine.generateRecoveryPlan(error, context);
      const endTime = Date.now();

      expect(plan.metadata.processingTime).toBeGreaterThan(0);
      expect(plan.metadata.processingTime).toBeLessThan(endTime - startTime + 100); // Allow some margin
    });
  });

  describe('Configuration and Factory Functions', () => {
    it('should create engine with production configuration', () => {
      const prodEngine = createErrorRecoveryEngine(PRODUCTION_ERROR_CONFIG);

      expect(prodEngine).toBeInstanceOf(IntelligentErrorRecoveryEngine);
      // Verify production settings are applied (would need to access internal config)
    });

    it('should create engine with development configuration', () => {
      const devEngine = createErrorRecoveryEngine(DEVELOPMENT_ERROR_CONFIG);

      expect(devEngine).toBeInstanceOf(IntelligentErrorRecoveryEngine);
      // Verify development settings are applied
    });

    it('should create engine with custom configuration', () => {
      const customConfig = {
        enableAnalytics: false,
        retryConfiguration: {
          maxRetries: 5,
          baseDelay: 500,
          maxDelay: 10000,
          backoffMultiplier: 1.5
        },
        confidenceThresholds: {
          highConfidence: 0.9,
          mediumConfidence: 0.7,
          lowConfidence: 0.4
        }
      };

      const customEngine = createErrorRecoveryEngine(customConfig);

      expect(customEngine).toBeInstanceOf(IntelligentErrorRecoveryEngine);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null or undefined errors gracefully', async () => {
      const context: ErrorRecoveryContext = {
        toolName: 'test_tool',
        operation: 'test_op',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      await expect(recoveryEngine.generateRecoveryPlan(null as any, context))
        .rejects.toThrow('Invalid error object provided');

      await expect(recoveryEngine.generateRecoveryPlan(undefined as any, context))
        .rejects.toThrow('Invalid error object provided');
    });

    it('should handle invalid context gracefully', async () => {
      const error = new Error('Test error');

      await expect(recoveryEngine.generateRecoveryPlan(error, null as any))
        .rejects.toThrow('Invalid context provided');

      await expect(recoveryEngine.generateRecoveryPlan(error, {} as any))
        .rejects.toThrow('Invalid context provided');
    });

    it('should handle service failures gracefully', async () => {
      // Mock service failure
      jest.spyOn(mockErrorIntelligence, 'analyzeError').mockRejectedValue(new Error('Service unavailable'));

      const error = new Error('Test error');
      const context: ErrorRecoveryContext = {
        toolName: 'test_tool',
        operation: 'test_op',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      // Should fallback to basic recovery plan
      const plan = await recoveryEngine.generateRecoveryPlan(error, context);

      expect(plan).toBeDefined();
      expect(plan.classification.category).toBe('unknown');
      expect(plan.recoveryActions.length).toBeGreaterThan(0);
    });

    it('should handle extremely long error messages', async () => {
      const longMessage = 'A'.repeat(10000); // 10KB error message
      const error = new Error(longMessage);

      const context: ErrorRecoveryContext = {
        toolName: 'test_tool',
        operation: 'test_op',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'test_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const plan = await recoveryEngine.generateRecoveryPlan(error, context);

      expect(plan).toBeDefined();
      // Verify message is truncated in user-friendly explanation
      expect(plan.userFriendlyExplanation.length).toBeLessThan(1000);
    });
  });

  describe('Concurrent Processing', () => {
    it('should handle multiple concurrent recovery requests', async () => {
      const errors = Array.from({ length: 5 }, (_, i) => new Error(`Concurrent error ${i}`));
      const contexts = errors.map((_, i) => ({
        toolName: `tool_${i}`,
        operation: `op_${i}`,
        parameters: {},
        timestamp: new Date(),
        sessionId: `session_${i}`,
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web' as const
      }));

      const promises = errors.map((error, i) =>
        recoveryEngine.generateRecoveryPlan(error, contexts[i])
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.id).toContain(i.toString()); // Should contain some reference to the index
      });
    });

    it('should maintain performance under concurrent load', async () => {
      const startTime = Date.now();
      const concurrentCount = 10;

      const promises = Array.from({ length: concurrentCount }, (_, i) => {
        const error = new Error(`Load test error ${i}`);
        const context: ErrorRecoveryContext = {
          toolName: `load_tool_${i}`,
          operation: 'load_test',
          parameters: { index: i },
          timestamp: new Date(),
          sessionId: `load_session_${i}`,
          userAgent: 'Test/1.0',
          previousAttempts: 0,
          platform: 'web'
        };

        return recoveryEngine.generateRecoveryPlan(error, context);
      });

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentCount);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Average processing time should be reasonable
      const avgProcessingTime = results.reduce((sum, result) =>
        sum + (result.metadata.processingTime || 0), 0) / results.length;
      expect(avgProcessingTime).toBeLessThan(2000); // Each request < 2 seconds on average
    });
  });
});