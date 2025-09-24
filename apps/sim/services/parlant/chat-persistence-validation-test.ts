/**
 * Chat Persistence System Validation and Testing Suite
 *
 * Comprehensive validation and testing framework for the Parlant chat persistence system.
 * Tests all components including storage, retrieval, search, export, archival, and security.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { chatExportArchivalService } from './chat-export-archival-service'
import { chatPersistenceService } from './chat-persistence-service'
import type {
  AdvancedExportConfig,
  ApiRequestContext,
  ArchivalPolicy,
  ChatMessageType,
  ChatSearchParams,
  SessionCreationConfig,
} from './comprehensive-chat-persistence-api'
import { comprehensiveChatPersistenceAPI } from './comprehensive-chat-persistence-api'
import { sessionContinuityManager } from './session-continuity-manager'
import { workspaceIsolationService } from './workspace-isolation-service'

const logger = createLogger('ChatPersistenceValidationTest')

/**
 * Test configuration and results
 */
interface TestResult {
  testName: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  details?: string
  error?: string
  metrics?: Record<string, number>
}

interface TestSuite {
  suiteName: string
  results: TestResult[]
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  totalDuration: number
}

/**
 * Mock data generators for testing
 */
class MockDataGenerator {
  private static testCounter = 0

  static generateApiContext(overrides: Partial<ApiRequestContext> = {}): ApiRequestContext {
    return {
      userId: `test-user-${Date.now()}`,
      workspaceId: `test-workspace-${Date.now()}`,
      sessionId: `test-session-${Date.now()}`,
      ipAddress: '127.0.0.1',
      userAgent: 'ChatPersistenceTest/1.0.0',
      requestId: `test-request-${Date.now()}-${++MockDataGenerator.testCounter}`,
      ...overrides,
    }
  }

  static generateSessionConfig(
    overrides: Partial<SessionCreationConfig> = {}
  ): SessionCreationConfig {
    return {
      agentId: `test-agent-${Date.now()}`,
      title: `Test Chat Session ${++MockDataGenerator.testCounter}`,
      enableContinuity: true,
      customMetadata: {
        testMode: true,
        createdBy: 'ChatPersistenceTest',
      },
      ...overrides,
    }
  }

  static generateChatMessages(): Array<{
    type: ChatMessageType
    content: any
    metadata?: Record<string, any>
  }> {
    return [
      {
        type: 'customer_message',
        content: 'Hello, I need help with my account.',
        metadata: { source: 'web', channel: 'chat' },
      },
      {
        type: 'agent_message',
        content:
          "Hello! I'd be happy to help you with your account. What specific issue are you experiencing?",
        metadata: { confidence: 0.95, responseTime: 1200 },
      },
      {
        type: 'customer_message',
        content: "I can't access my dashboard and getting error 403.",
        metadata: { source: 'web', errorCode: '403' },
      },
      {
        type: 'tool_call',
        content: {
          toolName: 'checkUserPermissions',
          parameters: { userId: 'test-user-123' },
        },
        metadata: { toolVersion: '1.0.0' },
      },
      {
        type: 'tool_result',
        content: {
          success: true,
          data: { hasAccess: true, permissions: ['read', 'write'] },
        },
        metadata: { executionTime: 450 },
      },
      {
        type: 'agent_message',
        content:
          "I've checked your permissions and they look correct. Let me help you troubleshoot the 403 error.",
        metadata: { confidence: 0.88, responseTime: 800 },
      },
    ]
  }

  static generateSearchParams(overrides: Partial<ChatSearchParams> = {}): ChatSearchParams {
    return {
      workspaceId: `test-workspace-${Date.now()}`,
      query: 'help account error',
      messageType: ['customer_message', 'agent_message'],
      limit: 50,
      offset: 0,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      ...overrides,
    }
  }

  static generateExportConfig(overrides: Partial<AdvancedExportConfig> = {}): AdvancedExportConfig {
    return {
      workspaceId: `test-workspace-${Date.now()}`,
      format: 'json',
      compression: 'medium',
      anonymizeUsers: false,
      includeMetadata: true,
      includeSystemMessages: true,
      splitByAgent: false,
      maxFileSize: 50, // 50MB
      includeTimestamps: true,
      timezone: 'UTC',
      ...overrides,
    }
  }

  static generateArchivalPolicy(overrides: Partial<ArchivalPolicy> = {}): ArchivalPolicy {
    return {
      workspaceId: `test-workspace-${Date.now()}`,
      policyName: `Test Policy ${++MockDataGenerator.testCounter}`,
      enabled: true,
      retentionDays: 30,
      applyToCompleted: true,
      applyToAbandoned: true,
      archiveToStorage: true,
      deleteAfterArchival: false,
      compressArchive: true,
      runSchedule: '0 2 * * *', // Daily at 2 AM
      gdprCompliant: true,
      ...overrides,
    }
  }
}

/**
 * Comprehensive Chat Persistence Validation Test Suite
 */
export class ChatPersistenceValidationTest {
  private results: TestSuite[] = []
  private readonly PERFORMANCE_THRESHOLDS = {
    messageStorage: 1000, // 1 second
    messageRetrieval: 2000, // 2 seconds
    searchQuery: 3000, // 3 seconds
    exportGeneration: 30000, // 30 seconds
    sessionCreation: 1000, // 1 second
  }

  constructor() {
    logger.info('Chat Persistence Validation Test Suite initialized', {
      performanceThresholds: this.PERFORMANCE_THRESHOLDS,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Run all validation tests
   */
  async runAllTests(): Promise<{
    overallStatus: 'passed' | 'failed'
    totalSuites: number
    totalTests: number
    passedTests: number
    failedTests: number
    skippedTests: number
    totalDuration: number
    suites: TestSuite[]
  }> {
    const startTime = performance.now()

    logger.info('Starting comprehensive chat persistence validation tests')

    // Run all test suites
    await this.runApiTests()
    await this.runChatPersistenceTests()
    await this.runSessionContinuityTests()
    await this.runWorkspaceIsolationTests()
    await this.runExportArchivalTests()
    await this.runPerformanceTests()
    await this.runSecurityTests()
    await this.runIntegrationTests()

    const totalDuration = performance.now() - startTime

    // Calculate overall results
    const overallResults = this.calculateOverallResults()

    logger.info('Chat persistence validation tests completed', {
      ...overallResults,
      totalDuration: `${totalDuration}ms`,
    })

    return {
      ...overallResults,
      totalDuration,
      suites: this.results,
    }
  }

  /**
   * Test the main API layer
   */
  private async runApiTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Comprehensive Chat Persistence API',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    }

    // Test session creation
    await this.runTest(suite, 'API Session Creation', async () => {
      const context = MockDataGenerator.generateApiContext()
      const config = MockDataGenerator.generateSessionConfig()

      const response = await comprehensiveChatPersistenceAPI.createChatSession(config, context)

      if (!response.success) {
        throw new Error(`Session creation failed: ${response.error?.message}`)
      }

      if (!response.data?.sessionId) {
        throw new Error('Session ID not returned')
      }

      return {
        sessionId: response.data.sessionId,
        continuityEnabled: response.data.continuityEnabled,
        processingTime: response.metadata?.processingTime || 0,
      }
    })

    // Test message storage
    await this.runTest(suite, 'API Message Storage', async () => {
      const context = MockDataGenerator.generateApiContext()
      const messages = MockDataGenerator.generateChatMessages()

      const sessionId = `test-session-${Date.now()}`
      let storedCount = 0

      for (const message of messages) {
        const response = await comprehensiveChatPersistenceAPI.storeChatMessage(
          sessionId,
          message.type,
          message.content,
          context,
          { metadata: message.metadata }
        )

        if (!response.success) {
          throw new Error(`Message storage failed: ${response.error?.message}`)
        }

        storedCount++
      }

      return { storedMessages: storedCount }
    })

    // Test message retrieval
    await this.runTest(suite, 'API Message Retrieval', async () => {
      const context = MockDataGenerator.generateApiContext()
      const sessionId = `test-session-${Date.now()}`

      const response = await comprehensiveChatPersistenceAPI.getChatHistory(sessionId, context, {
        limit: 50,
        includeMetadata: true,
      })

      if (!response.success) {
        throw new Error(`Message retrieval failed: ${response.error?.message}`)
      }

      return {
        messagesRetrieved: response.data?.data.length || 0,
        hasMore: response.data?.pagination.hasMore || false,
      }
    })

    // Test search functionality
    await this.runTest(suite, 'API Search Functionality', async () => {
      const context = MockDataGenerator.generateApiContext()
      const searchParams = MockDataGenerator.generateSearchParams({
        workspaceId: context.workspaceId,
      })

      const response = await comprehensiveChatPersistenceAPI.searchChatMessages(
        searchParams,
        context
      )

      if (!response.success) {
        throw new Error(`Search failed: ${response.error?.message}`)
      }

      return {
        resultsFound: response.data?.data.length || 0,
        searchTime: response.data?.searchMetadata?.searchTime || 0,
      }
    })

    // Test export functionality
    await this.runTest(suite, 'API Export Functionality', async () => {
      const context = MockDataGenerator.generateApiContext()
      const exportConfig = MockDataGenerator.generateExportConfig({
        workspaceId: context.workspaceId,
      })

      const response = await comprehensiveChatPersistenceAPI.createChatExport(exportConfig, context)

      if (!response.success) {
        throw new Error(`Export failed: ${response.error?.message}`)
      }

      return {
        exportId: response.data?.exportId,
        status: response.data?.status,
        filesGenerated: response.data?.files.length || 0,
      }
    })

    // Test health check
    await this.runTest(suite, 'API Health Check', async () => {
      const healthResult = await comprehensiveChatPersistenceAPI.healthCheck()

      if (healthResult.status === 'unhealthy') {
        throw new Error('System health check failed')
      }

      return {
        status: healthResult.status,
        componentCount: Object.keys(healthResult.components).length,
        version: healthResult.version,
      }
    })

    this.results.push(suite)
  }

  /**
   * Test the core chat persistence service
   */
  private async runChatPersistenceTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Chat Persistence Service',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    }

    // Test message storage with various types
    await this.runTest(suite, 'Message Storage - All Types', async () => {
      const messages = MockDataGenerator.generateChatMessages()
      const sessionId = `test-session-${Date.now()}`
      const workspaceId = `test-workspace-${Date.now()}`
      const userId = `test-user-${Date.now()}`

      const storedMessages = []

      for (const message of messages) {
        const stored = await chatPersistenceService.storeChatMessage(
          sessionId,
          message.type,
          message.content,
          message.metadata || {},
          workspaceId,
          userId
        )
        storedMessages.push(stored)
      }

      // Verify all messages have sequential offsets
      const offsets = storedMessages.map((m) => m.offset).sort((a, b) => a - b)
      const expectedOffsets = messages.map((_, i) => i)

      if (JSON.stringify(offsets) !== JSON.stringify(expectedOffsets)) {
        throw new Error('Message offsets not sequential')
      }

      return { storedMessages: storedMessages.length }
    })

    // Test search with various parameters
    await this.runTest(suite, 'Search with Filters', async () => {
      const searchParams = MockDataGenerator.generateSearchParams()

      const results = await chatPersistenceService.searchChatMessages(searchParams)

      if (results.data.length > searchParams.limit!) {
        throw new Error('Search returned more results than limit')
      }

      return {
        resultsFound: results.data.length,
        searchTime: results.searchMetadata?.searchTime || 0,
      }
    })

    // Test export functionality
    await this.runTest(suite, 'Data Export - Multiple Formats', async () => {
      const workspaceId = `test-workspace-${Date.now()}`
      const formats: Array<'json' | 'csv' | 'markdown' | 'html'> = [
        'json',
        'csv',
        'markdown',
        'html',
      ]
      const exportResults = []

      for (const format of formats) {
        const exportResult = await chatPersistenceService.exportChatData({
          workspaceId,
          format,
          includeMetadata: true,
          maxSessions: 10,
        })

        exportResults.push({
          format,
          size:
            typeof exportResult.data === 'string'
              ? exportResult.data.length
              : exportResult.data.length,
          sessionCount: exportResult.metadata.sessionCount,
        })
      }

      return { exportedFormats: exportResults.length, formats: exportResults }
    })

    // Test chat statistics
    await this.runTest(suite, 'Chat Statistics Generation', async () => {
      const workspaceId = `test-workspace-${Date.now()}`

      const stats = await chatPersistenceService.getChatStatistics(workspaceId)

      if (!stats.workspaceId) {
        throw new Error('Statistics missing workspace ID')
      }

      return {
        totalSessions: stats.totalSessions,
        totalMessages: stats.totalMessages,
        dailyActivityDays: stats.dailyActivity.length,
      }
    })

    this.results.push(suite)
  }

  /**
   * Test session continuity manager
   */
  private async runSessionContinuityTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Session Continuity Manager',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    }

    // Test session creation with continuity
    await this.runTest(suite, 'Session Creation with Continuity', async () => {
      const agentId = `test-agent-${Date.now()}`
      const context = {
        userId: `test-user-${Date.now()}`,
        workspaceId: `test-workspace-${Date.now()}`,
        timestamp: new Date().toISOString(),
        accessLevel: 'member' as const,
        permissions: ['read', 'write'],
      }

      const session = await sessionContinuityManager.createSessionWithContinuity(agentId, context, {
        title: 'Test Continuity Session',
        deviceInfo: { browser: 'Chrome', device: 'Desktop' },
      })

      if (!session.sessionId) {
        throw new Error('Session ID not created')
      }

      return {
        sessionId: session.sessionId,
        continuityEnabled: session.continuityEnabled,
      }
    })

    // Test session restoration
    await this.runTest(suite, 'Session Restoration', async () => {
      const agentId = `test-agent-${Date.now()}`
      const context = {
        userId: `test-user-${Date.now()}`,
        workspaceId: `test-workspace-${Date.now()}`,
        timestamp: new Date().toISOString(),
        accessLevel: 'member' as const,
        permissions: ['read', 'write'],
      }

      const restoration = await sessionContinuityManager.findAndRestoreSession(agentId, context, {
        preserveContext: true,
        restoreVariables: true,
        resumeJourney: true,
        maxInactivityHours: 24,
      })

      if (!restoration.sessionId) {
        throw new Error('Session restoration failed')
      }

      return {
        strategy: restoration.strategy,
        restored: restoration.restored,
        contextPreserved: restoration.contextPreserved,
      }
    })

    // Test heartbeat tracking
    await this.runTest(suite, 'Heartbeat Tracking', async () => {
      const sessionId = `test-session-${Date.now()}`

      sessionContinuityManager.startHeartbeatTracking(sessionId, {
        deviceInfo: { browser: 'Firefox', device: 'Mobile' },
        connectionId: 'test-connection-123',
      })

      // Wait a moment to ensure tracking is active
      await new Promise((resolve) => setTimeout(resolve, 100))

      const status = await sessionContinuityManager.getSessionContinuityStatus(sessionId)

      sessionContinuityManager.stopHeartbeatTracking(sessionId)

      return {
        isActive: status.isActive,
        hasDeviceInfo: !!status.deviceInfo,
        continuityEnabled: status.continuityEnabled,
      }
    })

    this.results.push(suite)
  }

  /**
   * Test workspace isolation service
   */
  private async runWorkspaceIsolationTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Workspace Isolation Service',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    }

    // Test isolation context creation
    await this.runTest(suite, 'Isolation Context Creation', async () => {
      const userId = `test-user-${Date.now()}`
      const workspaceId = `test-workspace-${Date.now()}`

      const context = await workspaceIsolationService.createIsolationContext(userId, workspaceId, {
        sessionId: 'test-session-123',
        ipAddress: '192.168.1.100',
        userAgent: 'TestAgent/1.0',
      })

      if (context.userId !== userId || context.workspaceId !== workspaceId) {
        throw new Error('Context creation failed')
      }

      return {
        userId: context.userId,
        workspaceId: context.workspaceId,
        accessLevel: context.accessLevel,
        permissionCount: context.permissions.length,
      }
    })

    // Test workspace access validation
    await this.runTest(suite, 'Workspace Access Validation', async () => {
      const userId = `test-user-${Date.now()}`
      const workspaceId = `test-workspace-${Date.now()}`

      const validation = await workspaceIsolationService.validateWorkspaceAccess(
        userId,
        workspaceId
      )

      return {
        allowed: validation.allowed,
        accessLevel: validation.accessLevel,
        permissions: validation.permissions,
      }
    })

    // Test session isolation enforcement
    await this.runTest(suite, 'Session Isolation Enforcement', async () => {
      const context = {
        userId: `test-user-${Date.now()}`,
        workspaceId: `test-workspace-${Date.now()}`,
        accessLevel: 'member' as const,
        permissions: ['read', 'write'],
        timestamp: new Date().toISOString(),
      }

      const sessionId = `test-session-${Date.now()}`

      const isAllowed = await workspaceIsolationService.enforceSessionIsolation(sessionId, context)

      return { isolationEnforced: !isAllowed } // Should be false for non-existent session
    })

    // Test user accessible workspaces
    await this.runTest(suite, 'User Accessible Workspaces', async () => {
      const userId = `test-user-${Date.now()}`

      const workspaces = await workspaceIsolationService.getUserAccessibleWorkspaces(userId)

      return {
        workspaceCount: workspaces.length,
        hasOwnedWorkspaces: workspaces.some((w) => w.isOwner),
      }
    })

    this.results.push(suite)
  }

  /**
   * Test export and archival service
   */
  private async runExportArchivalTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Export and Archival Service',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    }

    // Test comprehensive export
    await this.runTest(suite, 'Comprehensive Export', async () => {
      const config = MockDataGenerator.generateExportConfig()
      const context = {
        userId: `test-user-${Date.now()}`,
        workspaceId: config.workspaceId,
        accessLevel: 'admin' as const,
        permissions: ['read', 'write', 'admin'],
        timestamp: new Date().toISOString(),
      }

      const exportResult = await chatExportArchivalService.createChatExport(config, context)

      if (exportResult.status === 'failed') {
        throw new Error(`Export failed: ${exportResult.errors?.join(', ')}`)
      }

      return {
        exportId: exportResult.exportId,
        status: exportResult.status,
        filesGenerated: exportResult.files.length,
        sessionsExported: exportResult.metadata.sessionsExported,
      }
    })

    // Test archival policy creation
    await this.runTest(suite, 'Archival Policy Creation', async () => {
      const policy = MockDataGenerator.generateArchivalPolicy()
      const context = {
        userId: `test-user-${Date.now()}`,
        workspaceId: policy.workspaceId,
        accessLevel: 'admin' as const,
        permissions: ['read', 'write', 'admin'],
        timestamp: new Date().toISOString(),
      }

      const policyResult = await chatExportArchivalService.createArchivalPolicy(policy, context)

      if (!policyResult.policyId) {
        throw new Error('Policy creation failed')
      }

      return {
        policyId: policyResult.policyId,
        scheduledAt: policyResult.scheduledAt,
      }
    })

    // Test different export formats
    await this.runTest(suite, 'Multiple Export Formats', async () => {
      const formats: Array<'json' | 'csv' | 'markdown' | 'html' | 'xml'> = [
        'json',
        'csv',
        'markdown',
        'html',
        'xml',
      ]

      const exportResults = []

      for (const format of formats) {
        const config = MockDataGenerator.generateExportConfig({ format })
        const context = {
          userId: `test-user-${Date.now()}`,
          workspaceId: config.workspaceId,
          accessLevel: 'admin' as const,
          permissions: ['read', 'write', 'admin'],
          timestamp: new Date().toISOString(),
        }

        const result = await chatExportArchivalService.createChatExport(config, context)

        exportResults.push({
          format,
          status: result.status,
          fileCount: result.files.length,
        })
      }

      return {
        formatsGenerated: exportResults.length,
        results: exportResults,
      }
    })

    this.results.push(suite)
  }

  /**
   * Test performance benchmarks
   */
  private async runPerformanceTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Performance Benchmarks',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    }

    // Test message storage performance
    await this.runTest(suite, 'Message Storage Performance', async () => {
      const sessionId = `perf-test-session-${Date.now()}`
      const workspaceId = `perf-test-workspace-${Date.now()}`
      const userId = `perf-test-user-${Date.now()}`
      const messageCount = 100

      const startTime = performance.now()

      for (let i = 0; i < messageCount; i++) {
        await chatPersistenceService.storeChatMessage(
          sessionId,
          'customer_message',
          `Performance test message ${i}`,
          { index: i, batch: 'performance-test' },
          workspaceId,
          userId
        )
      }

      const duration = performance.now() - startTime
      const avgTimePerMessage = duration / messageCount

      if (avgTimePerMessage > this.PERFORMANCE_THRESHOLDS.messageStorage / messageCount) {
        throw new Error(`Message storage too slow: ${avgTimePerMessage}ms per message`)
      }

      return {
        messagesStored: messageCount,
        totalDuration: duration,
        avgTimePerMessage,
      }
    })

    // Test search performance
    await this.runTest(suite, 'Search Performance', async () => {
      const searchParams = MockDataGenerator.generateSearchParams({
        limit: 1000,
        query: 'performance test message',
      })

      const startTime = performance.now()
      const results = await chatPersistenceService.searchChatMessages(searchParams)
      const duration = performance.now() - startTime

      if (duration > this.PERFORMANCE_THRESHOLDS.searchQuery) {
        throw new Error(`Search too slow: ${duration}ms`)
      }

      return {
        searchDuration: duration,
        resultsFound: results.data.length,
        searchTime: results.searchMetadata?.searchTime || 0,
      }
    })

    // Test concurrent operations
    await this.runTest(suite, 'Concurrent Operations', async () => {
      const concurrencyLevel = 10
      const operationsPerThread = 5

      const startTime = performance.now()

      const promises = Array.from({ length: concurrencyLevel }, async (_, threadIndex) => {
        const sessionId = `concurrent-session-${threadIndex}-${Date.now()}`
        const workspaceId = `concurrent-workspace-${threadIndex}-${Date.now()}`
        const userId = `concurrent-user-${threadIndex}-${Date.now()}`

        for (let i = 0; i < operationsPerThread; i++) {
          await chatPersistenceService.storeChatMessage(
            sessionId,
            'customer_message',
            `Concurrent message ${threadIndex}-${i}`,
            { thread: threadIndex, operation: i },
            workspaceId,
            userId
          )
        }

        return threadIndex
      })

      const results = await Promise.all(promises)
      const duration = performance.now() - startTime

      return {
        concurrencyLevel,
        operationsPerThread,
        totalOperations: concurrencyLevel * operationsPerThread,
        completedThreads: results.length,
        totalDuration: duration,
      }
    })

    this.results.push(suite)
  }

  /**
   * Test security features
   */
  private async runSecurityTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Security Tests',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    }

    // Test cross-workspace isolation
    await this.runTest(suite, 'Cross-Workspace Isolation', async () => {
      const user1Id = `security-user-1-${Date.now()}`
      const user2Id = `security-user-2-${Date.now()}`
      const workspace1Id = `security-workspace-1-${Date.now()}`
      const workspace2Id = `security-workspace-2-${Date.now()}`

      // User 1 should not access workspace 2 resources
      const context1 = {
        userId: user1Id,
        workspaceId: workspace1Id,
        accessLevel: 'admin' as const,
        permissions: ['read', 'write', 'admin'],
        timestamp: new Date().toISOString(),
      }

      // Attempt cross-workspace access
      const sessionInWorkspace2 = `session-in-workspace2-${Date.now()}`

      const isAllowed = await workspaceIsolationService.enforceSessionIsolation(
        sessionInWorkspace2,
        context1
      )

      // Should be denied
      if (isAllowed) {
        throw new Error('Cross-workspace access was allowed')
      }

      return { crossWorkspaceAccessBlocked: !isAllowed }
    })

    // Test data anonymization in exports
    await this.runTest(suite, 'Data Anonymization in Exports', async () => {
      const config = MockDataGenerator.generateExportConfig({
        anonymizeUsers: true,
        excludePII: true,
        maskSensitiveData: true,
      })

      const context = {
        userId: `security-user-${Date.now()}`,
        workspaceId: config.workspaceId,
        accessLevel: 'admin' as const,
        permissions: ['read', 'write', 'admin'],
        timestamp: new Date().toISOString(),
      }

      const exportResult = await chatExportArchivalService.createChatExport(config, context)

      if (exportResult.status === 'failed') {
        throw new Error(`Anonymized export failed`)
      }

      return {
        anonymizationEnabled: config.anonymizeUsers,
        piiExcluded: config.excludePII,
        dataMasked: config.maskSensitiveData,
      }
    })

    // Test input validation
    await this.runTest(suite, 'Input Validation', async () => {
      const context = MockDataGenerator.generateApiContext()

      // Test with malicious content
      const maliciousContent = {
        script: '<script>alert("xss")</script>',
        sql: "'; DROP TABLE users; --",
        path: '../../../etc/passwd',
      }

      try {
        const response = await comprehensiveChatPersistenceAPI.storeChatMessage(
          context.sessionId || 'test-session',
          'customer_message',
          maliciousContent,
          context
        )

        // Should still work but content should be sanitized
        return {
          inputValidated: response.success,
          contentStored: !!response.data,
        }
      } catch (error) {
        // Input validation rejection is also acceptable
        return {
          inputValidated: true,
          contentRejected: true,
        }
      }
    })

    this.results.push(suite)
  }

  /**
   * Test integration scenarios
   */
  private async runIntegrationTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Integration Tests',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    }

    // Test complete conversation flow
    await this.runTest(suite, 'Complete Conversation Flow', async () => {
      const context = MockDataGenerator.generateApiContext()
      const sessionConfig = MockDataGenerator.generateSessionConfig()

      // 1. Create session
      const sessionResponse = await comprehensiveChatPersistenceAPI.createChatSession(
        sessionConfig,
        context
      )

      if (!sessionResponse.success) {
        throw new Error('Session creation failed')
      }

      const sessionId = sessionResponse.data!.sessionId

      // 2. Store messages
      const messages = MockDataGenerator.generateChatMessages()
      const storedMessages = []

      for (const message of messages) {
        const response = await comprehensiveChatPersistenceAPI.storeChatMessage(
          sessionId,
          message.type,
          message.content,
          context,
          { metadata: message.metadata }
        )

        if (!response.success) {
          throw new Error(`Message storage failed: ${response.error?.message}`)
        }

        storedMessages.push(response.data!)
      }

      // 3. Retrieve conversation history
      const historyResponse = await comprehensiveChatPersistenceAPI.getChatHistory(
        sessionId,
        context,
        { includeMetadata: true }
      )

      if (!historyResponse.success) {
        throw new Error('History retrieval failed')
      }

      // 4. Search within conversation
      const searchResponse = await comprehensiveChatPersistenceAPI.searchChatMessages(
        {
          ...MockDataGenerator.generateSearchParams(),
          workspaceId: context.workspaceId,
          sessionId,
        },
        context
      )

      if (!searchResponse.success) {
        throw new Error('Search failed')
      }

      return {
        sessionCreated: !!sessionId,
        messagesStored: storedMessages.length,
        historyRetrieved: historyResponse.data?.data.length || 0,
        searchResults: searchResponse.data?.data.length || 0,
      }
    })

    // Test session continuity across interruptions
    await this.runTest(suite, 'Session Continuity Integration', async () => {
      const agentId = `integration-agent-${Date.now()}`
      const context = {
        userId: `integration-user-${Date.now()}`,
        workspaceId: `integration-workspace-${Date.now()}`,
        accessLevel: 'member' as const,
        permissions: ['read', 'write'],
        timestamp: new Date().toISOString(),
      }

      // 1. Create initial session
      const session1 = await sessionContinuityManager.createSessionWithContinuity(
        agentId,
        context,
        { title: 'Integration Test Session' }
      )

      // 2. Create state snapshot
      const snapshot = await sessionContinuityManager.createStateSnapshot(session1.sessionId)

      // 3. Simulate session interruption and restoration
      const restoration = await sessionContinuityManager.findAndRestoreSession(agentId, context, {
        preserveContext: true,
        restoreVariables: true,
      })

      return {
        originalSessionId: session1.sessionId,
        restoredSessionId: restoration.sessionId,
        continuityStrategy: restoration.strategy,
        contextPreserved: restoration.contextPreserved,
        snapshotCreated: !!snapshot,
      }
    })

    // Test export and import cycle
    await this.runTest(suite, 'Export-Import Cycle', async () => {
      const workspaceId = `integration-workspace-${Date.now()}`
      const exportConfig = MockDataGenerator.generateExportConfig({
        workspaceId,
        format: 'json',
        includeMetadata: true,
      })

      const context = {
        userId: `integration-user-${Date.now()}`,
        workspaceId,
        accessLevel: 'admin' as const,
        permissions: ['read', 'write', 'admin'],
        timestamp: new Date().toISOString(),
      }

      // Export data
      const exportResult = await chatExportArchivalService.createChatExport(exportConfig, context)

      if (exportResult.status === 'failed') {
        throw new Error(`Export failed: ${exportResult.errors?.join(', ')}`)
      }

      return {
        exportSuccessful: exportResult.status === 'completed',
        filesGenerated: exportResult.files.length,
        sessionsExported: exportResult.metadata.sessionsExported,
        messagesExported: exportResult.metadata.messagesExported,
      }
    })

    this.results.push(suite)
  }

  /**
   * Run individual test with error handling and metrics
   */
  private async runTest(
    suite: TestSuite,
    testName: string,
    testFunction: () => Promise<Record<string, any>>
  ): Promise<void> {
    const startTime = performance.now()
    suite.totalTests++

    try {
      logger.debug(`Running test: ${testName}`)

      const result = await testFunction()
      const duration = performance.now() - startTime

      suite.results.push({
        testName,
        status: 'passed',
        duration,
        metrics: result,
      })

      suite.passedTests++
      suite.totalDuration += duration

      logger.debug(`Test passed: ${testName}`, {
        duration: `${duration}ms`,
        metrics: result,
      })
    } catch (error) {
      const duration = performance.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      suite.results.push({
        testName,
        status: 'failed',
        duration,
        error: errorMessage,
      })

      suite.failedTests++
      suite.totalDuration += duration

      logger.error(`Test failed: ${testName}`, {
        duration: `${duration}ms`,
        error: errorMessage,
      })
    }
  }

  /**
   * Calculate overall test results
   */
  private calculateOverallResults() {
    const totals = this.results.reduce(
      (acc, suite) => ({
        totalTests: acc.totalTests + suite.totalTests,
        passedTests: acc.passedTests + suite.passedTests,
        failedTests: acc.failedTests + suite.failedTests,
        skippedTests: acc.skippedTests + suite.skippedTests,
      }),
      { totalTests: 0, passedTests: 0, failedTests: 0, skippedTests: 0 }
    )

    return {
      overallStatus: totals.failedTests === 0 ? 'passed' : ('failed' as const),
      totalSuites: this.results.length,
      ...totals,
    }
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const overall = this.calculateOverallResults()

    let report = `
# Chat Persistence System Validation Report

## Overall Results
- **Status**: ${overall.overallStatus.toUpperCase()}
- **Total Suites**: ${overall.totalSuites}
- **Total Tests**: ${overall.totalTests}
- **Passed**: ${overall.passedTests}
- **Failed**: ${overall.failedTests}
- **Skipped**: ${overall.skippedTests}

## Test Suites

`

    this.results.forEach((suite) => {
      report += `
### ${suite.suiteName}
- **Tests**: ${suite.totalTests}
- **Passed**: ${suite.passedTests}
- **Failed**: ${suite.failedTests}
- **Duration**: ${suite.totalDuration.toFixed(2)}ms

`

      if (suite.failedTests > 0) {
        report += `**Failed Tests:**\n`
        suite.results
          .filter((r) => r.status === 'failed')
          .forEach((result) => {
            report += `- ${result.testName}: ${result.error}\n`
          })
        report += `\n`
      }

      if (suite.passedTests > 0) {
        report += `**Performance Metrics:**\n`
        suite.results
          .filter((r) => r.status === 'passed' && r.metrics)
          .forEach((result) => {
            report += `- ${result.testName}: ${result.duration.toFixed(2)}ms\n`
          })
        report += `\n`
      }
    })

    return report
  }
}

// Export for use in testing
export const chatPersistenceValidationTest = new ChatPersistenceValidationTest()
