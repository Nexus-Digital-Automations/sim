/**
 * Jest Setup for Conversational Workflows Tests
 * ==============================================
 *
 * Global test setup and configuration
 */

import 'jest'

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidConversationalWorkflowState(): R
      toBeValidNLPProcessingResult(): R
      toBeValidWorkflowMapping(): R
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidConversationalWorkflowState(received: any) {
    const requiredFields = [
      'workflowId',
      'journeyId',
      'sessionId',
      'executionStatus',
      'completedNodes',
      'failedNodes',
      'skippedNodes',
      'totalNodes',
      'workflowContext',
      'journeyContext',
      'userInputs',
      'startedAt',
      'lastUpdatedAt',
      'awaitingUserInput',
      'availableActions',
      'errorCount',
    ]

    const missingFields = requiredFields.filter((field) => !(field in received))

    if (missingFields.length > 0) {
      return {
        message: () =>
          `Expected valid ConversationalWorkflowState but missing fields: ${missingFields.join(', ')}`,
        pass: false,
      }
    }

    // Validate field types
    const validations = [
      ['workflowId', 'string'],
      ['journeyId', 'string'],
      ['sessionId', 'string'],
      ['executionStatus', 'string'],
      ['completedNodes', 'array'],
      ['failedNodes', 'array'],
      ['skippedNodes', 'array'],
      ['totalNodes', 'number'],
      ['workflowContext', 'object'],
      ['journeyContext', 'object'],
      ['userInputs', 'object'],
      ['startedAt', 'date'],
      ['lastUpdatedAt', 'date'],
      ['awaitingUserInput', 'boolean'],
      ['availableActions', 'array'],
      ['errorCount', 'number'],
    ]

    for (const [field, expectedType] of validations) {
      const actualType =
        expectedType === 'array'
          ? 'array'
          : expectedType === 'date'
            ? 'date'
            : typeof received[field]

      if (expectedType === 'array' && !Array.isArray(received[field])) {
        return {
          message: () => `Expected ${field} to be an array but got ${typeof received[field]}`,
          pass: false,
        }
      }

      if (expectedType === 'date' && !(received[field] instanceof Date)) {
        return {
          message: () => `Expected ${field} to be a Date but got ${typeof received[field]}`,
          pass: false,
        }
      }

      if (expectedType !== 'array' && expectedType !== 'date' && actualType !== expectedType) {
        return {
          message: () => `Expected ${field} to be ${expectedType} but got ${actualType}`,
          pass: false,
        }
      }
    }

    return {
      message: () => `Expected invalid ConversationalWorkflowState but all validations passed`,
      pass: true,
    }
  },

  toBeValidNLPProcessingResult(received: any) {
    const requiredFields = [
      'originalInput',
      'processedAt',
      'detectedIntent',
      'intentConfidence',
      'alternativeIntents',
      'extractedEntities',
      'mappedCommand',
      'commandParameters',
      'contextualReferences',
      'conversationHistory',
    ]

    const missingFields = requiredFields.filter((field) => !(field in received))

    if (missingFields.length > 0) {
      return {
        message: () =>
          `Expected valid NLPProcessingResult but missing fields: ${missingFields.join(', ')}`,
        pass: false,
      }
    }

    // Validate specific constraints
    if (
      typeof received.intentConfidence !== 'number' ||
      received.intentConfidence < 0 ||
      received.intentConfidence > 1
    ) {
      return {
        message: () =>
          `Expected intentConfidence to be a number between 0 and 1 but got ${received.intentConfidence}`,
        pass: false,
      }
    }

    if (!Array.isArray(received.alternativeIntents)) {
      return {
        message: () =>
          `Expected alternativeIntents to be an array but got ${typeof received.alternativeIntents}`,
        pass: false,
      }
    }

    if (!Array.isArray(received.extractedEntities)) {
      return {
        message: () =>
          `Expected extractedEntities to be an array but got ${typeof received.extractedEntities}`,
        pass: false,
      }
    }

    return {
      message: () => `Expected invalid NLPProcessingResult but all validations passed`,
      pass: true,
    }
  },

  toBeValidWorkflowMapping(received: any) {
    const requiredFields = [
      'workflowId',
      'journeyId',
      'mappingVersion',
      'createdAt',
      'updatedAt',
      'isActive',
      'nodeStateMappings',
      'edgeTransitionMappings',
      'contextVariableMappings',
      'executionConfig',
      'conversationalConfig',
    ]

    const missingFields = requiredFields.filter((field) => !(field in received))

    if (missingFields.length > 0) {
      return {
        message: () =>
          `Expected valid WorkflowToJourneyMapping but missing fields: ${missingFields.join(', ')}`,
        pass: false,
      }
    }

    // Validate arrays
    const arrayFields = ['nodeStateMappings', 'edgeTransitionMappings', 'contextVariableMappings']
    for (const field of arrayFields) {
      if (!Array.isArray(received[field])) {
        return {
          message: () => `Expected ${field} to be an array but got ${typeof received[field]}`,
          pass: false,
        }
      }
    }

    // Validate boolean
    if (typeof received.isActive !== 'boolean') {
      return {
        message: () => `Expected isActive to be boolean but got ${typeof received.isActive}`,
        pass: false,
      }
    }

    return {
      message: () => `Expected invalid WorkflowToJourneyMapping but all validations passed`,
      pass: true,
    }
  },
})

// Mock global dependencies that are commonly used
global.console = {
  ...console,
  // Suppress debug logs in tests unless explicitly testing logging
  debug: jest.fn(),
}

// Mock timers for consistent testing
jest.useFakeTimers()

// Setup environment variables for tests
process.env.NODE_ENV = 'test'
process.env.SOCKET_URL = 'http://localhost:3001'

// Global test timeout
jest.setTimeout(30000)

// Global beforeEach setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()

  // Reset fake timers
  jest.clearAllTimers()
})

// Global afterEach cleanup
afterEach(() => {
  // Clean up any pending promises or timers
  jest.runOnlyPendingTimers()
})

// Suppress specific console warnings during tests
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeAll(() => {
  console.warn = (...args: any[]) => {
    // Filter out specific warnings we don't want in test output
    const message = args[0]
    if (
      typeof message === 'string' &&
      (message.includes('Socket.io') ||
        message.includes('Parlant client') ||
        message.includes('Warning: ReactDOM.render'))
    ) {
      return
    }
    originalConsoleWarn(...args)
  }

  console.error = (...args: any[]) => {
    // Filter out specific errors we don't want in test output
    const message = args[0]
    if (
      typeof message === 'string' &&
      (message.includes("Warning: Can't perform a React state update") ||
        message.includes('Warning: Each child in a list should have a unique "key" prop'))
    ) {
      return
    }
    originalConsoleError(...args)
  }
})

afterAll(() => {
  // Restore original console methods
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})
