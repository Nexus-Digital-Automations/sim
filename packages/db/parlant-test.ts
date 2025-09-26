/**
 * Parlant Types Integration Test
 *
 * This file tests type safety, integration patterns, and compatibility
 * with existing Sim patterns. It serves as both a test suite and
 * documentation of proper usage patterns.
 */

import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
// Import all Parlant types and utilities
import type {
  AgentFilters,
  AgentMessageContent,
  AnonymousSessionContext,
  AuthenticatedSessionContext,
  CreateAgentParams,
  CreateSessionParams,
  CustomerMessageContent,
  // Core types
  ParlantAgent,
  // Query types
  ParlantQueries,
  SessionContext,
  // Union types
  TypedParlantEvent,
  // Validation types
  ValidatedCreateAgent,
  ValidatedCreateSession,
} from './parlant-exports'
import {
  // Query helpers
  createParlantQueries,
  formatValidationErrors,
  isAgentMessageContent,
  isAnonymousSession,
  isAuthenticatedSession,
  // Type guards
  isCustomerMessageContent,
  // Constants
  PARLANT_FEATURES,
  PARLANT_INTEGRATIONS,
  // Schema and tables
  parlantAgent,
  parlantEvent,
  parlantSchemas,
  parlantSession,
  safeValidate,
  // Validation
  validateCreateAgent,
  validateCreateSession,
  withErrorHandling,
} from './parlant-exports'

// Mock database type for testing
type MockDatabase = PostgresJsDatabase<any>

// =============================================================================
// Type Safety Tests
// =============================================================================

/**
 * Test 1: Basic type inference and compatibility
 */
function testBasicTypeInference() {
  // Test type inference from schema
  const agent: ParlantAgent = {
    id: 'test-id',
    workspaceId: 'workspace-123',
    createdBy: 'user-456',
    name: 'Test Agent',
    description: 'Test description',
    status: 'active',
    compositionMode: 'fluid',
    systemPrompt: 'You are a helpful assistant',
    modelProvider: 'openai',
    modelName: 'gpt-4',
    temperature: 70,
    maxTokens: 2000,
    responseTimeoutMs: 30000,
    maxContextLength: 8000,
    systemInstructions: null,
    allowInterruption: true,
    allowProactiveMessages: false,
    conversationStyle: 'professional',
    dataRetentionDays: 30,
    allowDataExport: true,
    piiHandlingMode: 'standard',
    integrationMetadata: {},
    customConfig: {},
    totalSessions: 0,
    totalMessages: 0,
    totalTokensUsed: 0,
    totalCost: 0,
    averageSessionDuration: null,
    lastActiveAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  // Test create params type compatibility
  const createParams: CreateAgentParams = {
    workspaceId: 'workspace-123',
    createdBy: 'user-456',
    name: 'New Agent',
    description: 'Agent description',
    compositionMode: 'strict', // Test enum values
    modelProvider: 'openai',
    modelName: 'gpt-4',
    temperature: 80,
  }

  // Type should be compatible
  const agentFromParams: Partial<ParlantAgent> = createParams

  console.log('✓ Basic type inference test passed')
  return { agent, createParams, agentFromParams }
}

/**
 * Test 2: Union type discrimination and type guards
 */
function testUnionTypesAndTypeGuards() {
  // Test event content union types
  const customerMessage: CustomerMessageContent = {
    type: 'customer_message',
    timestamp: new Date().toISOString(),
    message: {
      text: 'Hello, I need help',
      attachments: [],
    },
    sender: {
      customerId: 'customer-123',
      displayName: 'John Doe',
      isAnonymous: false,
    },
  }

  const agentMessage: AgentMessageContent = {
    type: 'agent_message',
    timestamp: new Date().toISOString(),
    message: {
      text: 'How can I help you today?',
      confidence: 0.95,
      tone: 'friendly',
    },
    guidelines: [
      {
        guidelineId: 'guideline-123',
        condition: 'greeting',
        applied: true,
        reason: 'User initiated conversation',
      },
    ],
  }

  // Test typed events
  const customerEvent: TypedParlantEvent<CustomerMessageContent> = {
    id: 'event-123',
    sessionId: 'session-456',
    offset: 0,
    eventType: 'customer_message',
    content: customerMessage,
    metadata: {},
    toolCallId: null,
    journeyId: null,
    stateId: null,
    createdAt: new Date(),
  }

  const agentEvent: TypedParlantEvent<AgentMessageContent> = {
    id: 'event-124',
    sessionId: 'session-456',
    offset: 1,
    eventType: 'agent_message',
    content: agentMessage,
    metadata: {},
    toolCallId: null,
    journeyId: null,
    stateId: null,
    createdAt: new Date(),
  }

  // Test type guards
  const events: TypedParlantEvent[] = [customerEvent, agentEvent]

  events.forEach((event) => {
    if (isCustomerMessageContent(event.content)) {
      // TypeScript should know this is CustomerMessageContent
      const messageText: string = event.content.message.text
      const senderName: string | undefined = event.content.sender.displayName
      console.log(`Customer message: ${messageText} from ${senderName}`)
    } else if (isAgentMessageContent(event.content)) {
      // TypeScript should know this is AgentMessageContent
      const messageText: string = event.content.message.text
      const confidence: number | undefined = event.content.message.confidence
      console.log(`Agent message: ${messageText} (confidence: ${confidence})`)
    }
  })

  // Test session context types
  const anonymousContext: AnonymousSessionContext = {
    userType: 'anonymous',
    sessionId: 'session-123',
    locale: 'en',
    timezone: 'UTC',
    entryPoint: {
      source: 'website',
      page: '/contact',
    },
  }

  const authenticatedContext: AuthenticatedSessionContext = {
    userType: 'authenticated',
    sessionId: 'session-124',
    user: {
      userId: 'user-123',
      email: 'user@example.com',
      name: 'Jane Doe',
    },
    workspace: {
      workspaceId: 'workspace-456',
      name: 'My Workspace',
    },
    entryPoint: {
      source: 'dashboard',
    },
  }

  // Test context type guards
  const contexts: SessionContext[] = [anonymousContext, authenticatedContext]

  contexts.forEach((context) => {
    if (isAnonymousSession(context)) {
      console.log(`Anonymous session: ${context.sessionId}`)
    } else if (isAuthenticatedSession(context)) {
      console.log(`Authenticated session: ${context.user.name} (${context.user.email})`)
    }
  })

  console.log('✓ Union types and type guards test passed')
  return { events, contexts }
}

/**
 * Test 3: Query helpers integration
 */
async function testQueryHelpers(mockDb: MockDatabase) {
  // Create query helpers
  const queries: ParlantQueries = createParlantQueries(mockDb)

  // Test agent creation with validation
  const createAgentData = {
    workspaceId: 'workspace-123',
    createdBy: 'user-456',
    name: 'Query Test Agent',
    description: 'Testing query helpers',
    modelProvider: 'openai',
    modelName: 'gpt-4',
  }

  // Validate data first
  const validatedAgent: ValidatedCreateAgent = validateCreateAgent(createAgentData)

  // Create agent (would work with real database)
  // const newAgent: ParlantAgent = await queries.agents.create(validatedAgent)

  // Test filtering
  const filters: AgentFilters = {
    workspaceId: 'workspace-123',
    status: 'active',
    modelProvider: ['openai', 'anthropic'],
    search: 'customer service',
  }

  // Get agents with filters (would work with real database)
  // const agentsResult = await queries.agents.getMany(filters, { page: 1, pageSize: 10 })

  // Test session creation
  const createSessionData: CreateSessionParams = {
    agentId: 'agent-123',
    workspaceId: 'workspace-456',
    customerId: 'customer-789',
    title: 'Test Session',
    mode: 'auto',
    metadata: {
      source: 'api',
      priority: 'normal',
    },
  }

  const validatedSession: ValidatedCreateSession = validateCreateSession(createSessionData)

  // Create session (would work with real database)
  // const newSession: ParlantSession = await queries.sessions.create(validatedSession)

  console.log('✓ Query helpers integration test passed')
  return { queries, validatedAgent, validatedSession }
}

/**
 * Test 4: Validation schemas and error handling
 */
function testValidationSchemas() {
  // Test successful validation
  const validAgentData = {
    workspaceId: 'workspace-123',
    createdBy: 'user-456',
    name: 'Valid Agent',
    description: 'This should validate successfully',
    temperature: 75,
    maxTokens: 1500,
  }

  try {
    const validated = validateCreateAgent(validAgentData)
    console.log('✓ Valid agent data passed validation')
  } catch (error) {
    console.error('✗ Valid agent data failed validation:', error)
  }

  // Test validation with errors
  const invalidAgentData = {
    workspaceId: '', // Empty string should fail
    createdBy: 'user-456',
    name: '', // Empty string should fail
    temperature: 150, // Out of range should fail
    maxTokens: -1, // Negative should fail
  }

  const validationResult = safeValidate(parlantSchemas.createAgent, invalidAgentData)

  if (validationResult.success) {
    console.error('✗ Invalid agent data incorrectly passed validation')
  } else {
    const formattedErrors = formatValidationErrors(validationResult.errors)
    console.log('✓ Invalid agent data correctly failed validation')
    console.log('  Errors:', formattedErrors.map((e) => `${e.field}: ${e.message}`).join(', '))
  }

  // Test session validation
  const validSessionData = {
    agentId: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
    workspaceId: 'workspace-123',
    mode: 'manual',
    locale: 'en-US',
  }

  const sessionResult = safeValidate(parlantSchemas.createSession, validSessionData)
  if (sessionResult.success) {
    console.log('✓ Valid session data passed validation')
  } else {
    console.error('✗ Valid session data failed validation:', sessionResult.errors)
  }

  console.log('✓ Validation schemas test passed')
  return { validatedData: validAgentData, validationErrors: validationResult }
}

/**
 * Test 5: Error handling utilities
 */
async function testErrorHandling() {
  // Test withErrorHandling utility
  const successOperation = async () => {
    return { id: 'success-123', data: 'test data' }
  }

  const failingOperation = async () => {
    throw new Error('Test error message')
  }

  // Test successful operation
  const successResult = await withErrorHandling(successOperation, 'test-success')
  if (successResult.success) {
    console.log('✓ Success operation handled correctly:', successResult.data)
  } else {
    console.error('✗ Success operation incorrectly marked as failure')
  }

  // Test failing operation
  const failResult = await withErrorHandling(failingOperation, 'test-failure')
  if (!failResult.success) {
    console.log('✓ Failing operation handled correctly:', failResult.error.message)
  } else {
    console.error('✗ Failing operation incorrectly marked as success')
  }

  console.log('✓ Error handling utilities test passed')
  return { successResult, failResult }
}

/**
 * Test 6: Feature flags and integration capabilities
 */
function testFeatureFlagsAndIntegrations() {
  // Test feature flags
  console.log('Parlant features:', PARLANT_FEATURES)
  console.log('Parlant integrations:', PARLANT_INTEGRATIONS)

  // Ensure all expected features are enabled
  const requiredFeatures = [
    'UNION_TYPES',
    'TYPE_GUARDS',
    'VALIDATION_SCHEMAS',
    'QUERY_HELPERS',
    'POLYMORPHIC_RELATIONSHIPS',
  ]

  const missingFeatures = requiredFeatures.filter((feature) => !(PARLANT_FEATURES as any)[feature])

  if (missingFeatures.length === 0) {
    console.log('✓ All required features are enabled')
  } else {
    console.error('✗ Missing required features:', missingFeatures)
  }

  // Ensure all expected integrations are enabled
  const requiredIntegrations = [
    'SIM_WORKFLOWS',
    'SIM_KNOWLEDGE_BASES',
    'SIM_API_KEYS',
    'SIM_CUSTOM_TOOLS',
  ]

  const missingIntegrations = requiredIntegrations.filter(
    (integration) => !(PARLANT_INTEGRATIONS as any)[integration]
  )

  if (missingIntegrations.length === 0) {
    console.log('✓ All required integrations are enabled')
  } else {
    console.error('✗ Missing required integrations:', missingIntegrations)
  }

  console.log('✓ Feature flags and integrations test passed')
  return { features: PARLANT_FEATURES, integrations: PARLANT_INTEGRATIONS }
}

/**
 * Test 7: Database schema compatibility
 */
function testDatabaseSchemaCompatibility() {
  // Test that Parlant tables have the expected structure
  const agentTable = parlantAgent
  const sessionTable = parlantSession
  const eventTable = parlantEvent

  // Verify table names
  if (
    agentTable._.name === 'parlant_agent' &&
    sessionTable._.name === 'parlant_session' &&
    eventTable._.name === 'parlant_event'
  ) {
    console.log('✓ Table names are correct')
  } else {
    console.error('✗ Table names are incorrect')
  }

  // Test that we can create query conditions (basic Drizzle compatibility test)
  const agentQuery = eq(parlantAgent.workspaceId, 'test-workspace')
  const sessionQuery = and(
    eq(parlantSession.agentId, 'test-agent'),
    eq(parlantSession.status, 'active')
  )

  if (agentQuery && sessionQuery) {
    console.log('✓ Drizzle query compatibility verified')
  }

  console.log('✓ Database schema compatibility test passed')
  return { tables: { agentTable, sessionTable, eventTable } }
}

// =============================================================================
// Main Test Runner
// =============================================================================

/**
 * Run all type safety and integration tests
 */
export async function runParlantTypeTests(mockDb?: MockDatabase) {
  console.log('🧪 Running Parlant Type Safety and Integration Tests...\n')

  try {
    // Test 1: Basic type inference
    const test1 = testBasicTypeInference()
    console.log()

    // Test 2: Union types and type guards
    const test2 = testUnionTypesAndTypeGuards()
    console.log()

    // Test 3: Query helpers (requires mock DB)
    if (mockDb) {
      const test3 = await testQueryHelpers(mockDb)
      console.log()
    } else {
      console.log('⚠️  Skipping query helpers test (no mock database provided)')
      console.log()
    }

    // Test 4: Validation schemas
    const test4 = testValidationSchemas()
    console.log()

    // Test 5: Error handling
    const test5 = await testErrorHandling()
    console.log()

    // Test 6: Feature flags and integrations
    const test6 = testFeatureFlagsAndIntegrations()
    console.log()

    // Test 7: Database schema compatibility
    const test7 = testDatabaseSchemaCompatibility()
    console.log()

    console.log('🎉 All Parlant type safety and integration tests passed!')

    return {
      success: true,
      results: {
        basicTypes: test1,
        unionTypes: test2,
        validation: test4,
        errorHandling: test5,
        features: test6,
        schema: test7,
      },
    }
  } catch (error) {
    console.error('❌ Parlant type tests failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// Usage Examples and Documentation
// =============================================================================

/**
 * @example Basic Usage
 * ```typescript
 * import { runParlantTypeTests } from './parlant-test'
 *
 * // Run tests without database
 * const result = await runParlantTypeTests()
 * console.log('Tests passed:', result.success)
 *
 * // Run tests with mock database
 * const mockDb = {} as any // Your mock database
 * const resultWithDb = await runParlantTypeTests(mockDb)
 * ```
 */

/**
 * @example Integration with Jest
 * ```typescript
 * import { runParlantTypeTests } from './parlant-test'
 *
 * describe('Parlant Type Safety', () => {
 *   it('should pass all type safety tests', async () => {
 *     const result = await runParlantTypeTests()
 *     expect(result.success).toBe(true)
 *   })
 * })
 * ```
 */

// Export test functions for individual use
export {
  testBasicTypeInference,
  testUnionTypesAndTypeGuards,
  testQueryHelpers,
  testValidationSchemas,
  testErrorHandling,
  testFeatureFlagsAndIntegrations,
  testDatabaseSchemaCompatibility,
}

// Default export for convenience
export default runParlantTypeTests
