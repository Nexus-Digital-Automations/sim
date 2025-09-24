/**
 * Agent Lifecycle Management - Integration Tests
 * ===============================================
 *
 * Comprehensive integration tests for the agent lifecycle management system.
 * Tests the full lifecycle from session creation through configuration,
 * coordination, monitoring, and cleanup.
 *
 * Test Coverage:
 * - Session lifecycle management
 * - Agent configuration and customization
 * - Multi-agent coordination and handoffs
 * - Performance monitoring and analytics
 * - Resource management and optimization
 * - Error handling and recovery
 * - Cross-component integration
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { agentPerformanceMonitor } from '../agent-performance-monitor'
import { agentResourceManager } from '../agent-resource-manager'
import { agentLifecycleOrchestrator } from '../index'
import { multiAgentCoordinator } from '../multi-agent-coordinator'

describe('Agent Lifecycle Management - Integration Tests', () => {
  const mockAuth = {
    user_id: 'test-user-123',
    workspace_id: 'test-workspace-456',
    key_type: 'personal' as const,
    permissions: ['workspace:admin'],
  }

  const mockAgentId = 'test-agent-789'
  let testSessionId: string

  beforeAll(async () => {
    // Initialize the lifecycle orchestrator
    await agentLifecycleOrchestrator.initialize({
      enableRealTimeMonitoring: true,
      enableAutoScaling: false,
      enablePerformanceOptimization: true,
    })
  })

  beforeEach(() => {
    // Reset mocks and clear state
    jest.clearAllMocks()
    testSessionId = `test-session-${Date.now()}`
  })

  afterEach(async () => {
    // Clean up any active sessions
    try {
      if (testSessionId) {
        await agentLifecycleOrchestrator.endAgentSession(testSessionId, mockAuth, 'Test cleanup')
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Complete Session Lifecycle', () => {
    it('should create, manage, and end a comprehensive agent session', async () => {
      // 1. Create comprehensive agent session
      const createResult = await agentLifecycleOrchestrator.createAgentSession(
        mockAgentId,
        mockAuth,
        {
          sessionOptions: {
            maxTurns: 50,
            idleTimeoutMs: 300000, // 5 minutes
            enablePerformanceTracking: true,
            enableResourceMonitoring: true,
          },
          configurationTemplate: 'general_assistant',
          userPreferences: {
            formality: 'professional',
            verbosity: 'balanced',
          },
          priority: 'medium',
        }
      )

      expect(createResult.success).toBe(true)
      expect(createResult.data).toBeDefined()
      expect(createResult.data!.session.agentId).toBe(mockAgentId)
      expect(createResult.data!.session.userId).toBe(mockAuth.user_id)
      expect(createResult.data!.session.workspaceId).toBe(mockAuth.workspace_id)

      testSessionId = createResult.data!.session.sessionId

      // Verify all components are properly initialized
      expect(createResult.data!.configuration).toBeDefined()
      expect(createResult.data!.performance).toBeDefined()
      expect(createResult.data!.resources).toBeDefined()

      // 2. Update agent configuration
      const configUpdateResult = await agentLifecycleOrchestrator.updateAgentConfiguration(
        testSessionId,
        {
          personalityId: 'professional_assistant',
          enableCapabilities: ['advanced_reasoning'],
          configUpdates: {
            temperature: 0.8,
            max_turns: 100,
          },
        },
        mockAuth
      )

      expect(configUpdateResult.success).toBe(true)

      // 3. Get agent context to verify updates
      const context = await agentLifecycleOrchestrator.getAgentContext(testSessionId)
      expect(context).toBeDefined()
      expect(context!.session.sessionId).toBe(testSessionId)

      // 4. End session with comprehensive cleanup
      const endResult = await agentLifecycleOrchestrator.endAgentSession(
        testSessionId,
        mockAuth,
        'Integration test completion'
      )

      expect(endResult.success).toBe(true)
      expect(endResult.data).toBeDefined()
      expect(endResult.data!.finalMetrics).toBeDefined()
      expect(endResult.data!.resourceSummary).toBeDefined()

      // Clear testSessionId to prevent double cleanup
      testSessionId = ''
    })

    it('should handle session creation with team assignment', async () => {
      // First create a team
      const team = await multiAgentCoordinator.createTeam(
        {
          name: 'Test Integration Team',
          description: 'Team for integration testing',
          workspaceId: mockAuth.workspace_id!,
          members: [
            {
              agentId: mockAgentId,
              role: 'primary',
              specialization: 'general',
              priority: 1,
              availabilityStatus: 'available',
              currentWorkload: 0,
              maxWorkload: 5,
              capabilities: ['conversational_ai'],
              handoffTriggers: [],
              metadata: {},
            },
          ],
          workflow: {
            id: 'test-workflow',
            name: 'Test Workflow',
            steps: [],
            handoffRules: [],
            escalationPath: [],
            parallelProcessing: false,
            requiresHumanApproval: false,
          },
        },
        mockAuth
      )

      // Create session with team assignment
      const createResult = await agentLifecycleOrchestrator.createAgentSession(
        mockAgentId,
        mockAuth,
        {
          teamId: team.id,
          priority: 'high',
        }
      )

      expect(createResult.success).toBe(true)
      expect(createResult.data!.coordination).toBeDefined()
      expect(createResult.data!.coordination!.teamId).toBe(team.id)

      testSessionId = createResult.data!.session.sessionId
    })
  })

  describe('Multi-Agent Coordination', () => {
    let primarySessionId: string
    let teamId: string

    beforeEach(async () => {
      // Create a team for coordination tests
      const team = await multiAgentCoordinator.createTeam(
        {
          name: 'Coordination Test Team',
          description: 'Team for coordination testing',
          workspaceId: mockAuth.workspace_id!,
          members: [
            {
              agentId: mockAgentId,
              role: 'primary',
              specialization: 'general',
              priority: 1,
              availabilityStatus: 'available',
              currentWorkload: 0,
              maxWorkload: 5,
              capabilities: ['conversational_ai'],
              handoffTriggers: [],
              metadata: {},
            },
            {
              agentId: 'specialist-agent-456',
              role: 'specialist',
              specialization: 'technical_support',
              priority: 2,
              availabilityStatus: 'available',
              currentWorkload: 0,
              maxWorkload: 3,
              capabilities: ['technical_analysis'],
              handoffTriggers: [],
              metadata: {},
            },
          ],
          workflow: {
            id: 'coordination-workflow',
            name: 'Coordination Workflow',
            steps: [],
            handoffRules: [],
            escalationPath: [],
            parallelProcessing: false,
            requiresHumanApproval: false,
          },
        },
        mockAuth
      )

      teamId = team.id

      // Create initial session
      const createResult = await agentLifecycleOrchestrator.createAgentSession(
        mockAgentId,
        mockAuth,
        { teamId }
      )

      primarySessionId = createResult.data!.session.sessionId
    })

    afterEach(async () => {
      try {
        if (primarySessionId) {
          await agentLifecycleOrchestrator.endAgentSession(
            primarySessionId,
            mockAuth,
            'Test cleanup'
          )
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })

    it('should handle agent handoff with context preservation', async () => {
      const handoffResult = await agentLifecycleOrchestrator.handleAgentHandoff(
        primarySessionId,
        {
          reason: 'User requested technical specialist',
          targetSpecialization: 'technical_support',
          urgency: 'medium',
          preserveFullContext: true,
        },
        mockAuth
      )

      expect(handoffResult.success).toBe(true)
      expect(handoffResult.data).toBeDefined()
      expect(handoffResult.data!.fromAgentId).toBe(mockAgentId)
      expect(handoffResult.data!.toAgentId).toBe('specialist-agent-456')
      expect(handoffResult.data!.preservedContext).toBeDefined()
    })

    it('should handle escalation to human intervention', async () => {
      const escalationResult = await multiAgentCoordinator.escalateToHuman(
        primarySessionId,
        {
          reason: 'Complex technical issue requires human expertise',
          urgency: 'high',
          category: 'technical',
          humanRequired: true,
        },
        mockAuth
      )

      expect(escalationResult.escalationId).toBeDefined()
      expect(escalationResult.status).toBe('queued')
      expect(escalationResult.estimatedWaitTime).toBeGreaterThan(0)
    })
  })

  describe('Performance Monitoring and Analytics', () => {
    let monitoredSessionId: string

    beforeEach(async () => {
      const createResult = await agentLifecycleOrchestrator.createAgentSession(
        mockAgentId,
        mockAuth,
        {
          sessionOptions: {
            enablePerformanceTracking: true,
          },
        }
      )

      monitoredSessionId = createResult.data!.session.sessionId
    })

    afterEach(async () => {
      try {
        if (monitoredSessionId) {
          await agentLifecycleOrchestrator.endAgentSession(
            monitoredSessionId,
            mockAuth,
            'Test cleanup'
          )
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })

    it('should collect and analyze performance metrics', async () => {
      // Simulate conversation events
      const mockEvents = [
        {
          id: 'event-1',
          session_id: monitoredSessionId,
          type: 'customer_message' as const,
          content: 'Hello, I need help with my account',
          offset: 0,
          source: 'customer' as const,
          created_at: new Date().toISOString(),
        },
        {
          id: 'event-2',
          session_id: monitoredSessionId,
          type: 'agent_message' as const,
          content:
            "I'd be happy to help you with your account. What specific issue are you experiencing?",
          offset: 1,
          source: 'agent' as const,
          created_at: new Date().toISOString(),
        },
      ]

      // Analyze conversation quality
      const qualityMetrics = await agentPerformanceMonitor.analyzeConversationQuality(
        monitoredSessionId,
        mockEvents,
        {
          userGoals: ['resolve account issue'],
          expectedOutcomes: ['account issue resolved'],
        }
      )

      expect(qualityMetrics).toBeDefined()
      expect(qualityMetrics.sessionId).toBe(monitoredSessionId)
      expect(qualityMetrics.overallQualityScore).toBeGreaterThan(0)
      expect(qualityMetrics.qualityFactors).toHaveLength(7)

      // Generate performance summary
      const performanceSummary = agentPerformanceMonitor.generatePerformanceSummary(
        mockAgentId,
        '1h'
      )

      expect(performanceSummary).toBeDefined()
      expect(performanceSummary.agentId).toBe(mockAgentId)
      expect(performanceSummary.recommendations).toBeDefined()
      expect(performanceSummary.trendAnalysis).toBeDefined()
    })

    it('should generate performance insights and recommendations', async () => {
      const insights = agentPerformanceMonitor.getPerformanceInsights(mockAgentId)

      expect(insights).toBeDefined()
      expect(insights.insights).toBeDefined()
      expect(insights.optimizations).toBeDefined()
      expect(insights.trends).toBeDefined()
      expect(insights.alerts).toBeDefined()
    })
  })

  describe('Resource Management and Optimization', () => {
    let resourceSessionId: string

    beforeEach(async () => {
      const createResult = await agentLifecycleOrchestrator.createAgentSession(
        mockAgentId,
        mockAuth,
        {
          sessionOptions: {
            enableResourceMonitoring: true,
          },
        }
      )

      resourceSessionId = createResult.data!.session.sessionId
    })

    afterEach(async () => {
      try {
        if (resourceSessionId) {
          await agentLifecycleOrchestrator.endAgentSession(
            resourceSessionId,
            mockAuth,
            'Test cleanup'
          )
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })

    it('should manage resource allocation and optimization', async () => {
      // Monitor resource usage
      const resourceMetrics = await agentResourceManager.monitorResourceUsage(
        mockAgentId,
        resourceSessionId
      )

      expect(resourceMetrics).toBeDefined()
      expect(resourceMetrics.agentId).toBe(mockAgentId)
      expect(resourceMetrics.sessionId).toBe(resourceSessionId)
      expect(resourceMetrics.memoryUsageMB).toBeGreaterThan(0)
      expect(resourceMetrics.cpuUsagePercent).toBeGreaterThan(0)

      // Generate optimization recommendations
      const optimizationResult = await agentResourceManager.optimizeAgentResources(mockAgentId, {
        preservePerformance: true,
        targetCostReduction: 20,
      })

      expect(optimizationResult).toBeDefined()
      expect(optimizationResult.optimizations).toBeDefined()
      expect(optimizationResult.projectedSavings).toBeDefined()
      expect(optimizationResult.implementationPlan).toBeDefined()
    })

    it('should provide resource forecasting', async () => {
      const forecast = agentResourceManager.getResourceForecast(mockAgentId, '24h')

      if (forecast) {
        expect(forecast.agentId).toBe(mockAgentId)
        expect(forecast.predictions).toBeDefined()
        expect(forecast.confidence).toBeGreaterThan(0)
        expect(forecast.confidence).toBeLessThanOrEqual(1)
      }
    })

    it('should manage resource pools', async () => {
      const pool = agentResourceManager.createResourcePool({
        name: 'Test Resource Pool',
        agentIds: [mockAgentId],
        limits: {
          maxMemoryMB: 4096,
          maxCpuPercent: 80,
          maxConcurrentSessions: 10,
          maxTokensPerMinute: 5000,
          maxNetworkBytesPerSecond: 1024 * 1024,
          maxStorageMB: 1000,
        },
        allocation: {
          strategy: 'balanced',
          reservedMemoryMB: 512,
          reservedCpuPercent: 20,
          priorityWeights: {
            responseTime: 0.3,
            throughput: 0.3,
            quality: 0.2,
            cost: 0.2,
          },
          elasticLimits: {
            minMemoryMB: 256,
            maxMemoryMB: 2048,
            minCpuPercent: 10,
            maxCpuPercent: 60,
          },
        },
        scaling: {
          enabled: false,
          triggers: [],
          cooldownMs: 300000,
          minInstances: 1,
          maxInstances: 5,
          scaleUpThreshold: 0.8,
          scaleDownThreshold: 0.3,
          predictiveScaling: false,
        },
        monitoring: {
          enabled: true,
          intervalMs: 30000,
          alertThresholds: {
            memory: 0.85,
            cpu: 0.8,
            sessions: 0.9,
            tokens: 0.95,
          },
          retentionDays: 7,
          aggregationLevel: 'summary',
        },
      })

      expect(pool).toBeDefined()
      expect(pool.id).toBeDefined()
      expect(pool.name).toBe('Test Resource Pool')
      expect(pool.agentIds).toContain(mockAgentId)
      expect(pool.isActive).toBe(true)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle session creation errors gracefully', async () => {
      const invalidAgentResult = await agentLifecycleOrchestrator.createAgentSession(
        'invalid-agent-id',
        mockAuth
      )

      expect(invalidAgentResult.success).toBe(false)
      expect(invalidAgentResult.error).toBeDefined()
      expect(invalidAgentResult.metadata.operation).toBe('create_session')
    })

    it('should handle configuration update errors', async () => {
      const invalidConfigResult = await agentLifecycleOrchestrator.updateAgentConfiguration(
        'invalid-session-id',
        {
          personalityId: 'non-existent-personality',
        },
        mockAuth
      )

      expect(invalidConfigResult.success).toBe(false)
      expect(invalidConfigResult.error).toBeDefined()
    })

    it('should handle handoff errors gracefully', async () => {
      const invalidHandoffResult = await agentLifecycleOrchestrator.handleAgentHandoff(
        'invalid-session-id',
        {
          reason: 'Test handoff',
          urgency: 'medium',
        },
        mockAuth
      )

      expect(invalidHandoffResult.success).toBe(false)
      expect(invalidHandoffResult.error).toBeDefined()
    })
  })

  describe('System Status and Analytics', () => {
    it('should provide comprehensive system status', () => {
      const systemStatus = agentLifecycleOrchestrator.getSystemStatus()

      expect(systemStatus).toBeDefined()
      expect(systemStatus.status).toBeDefined()
      expect(systemStatus.components).toBeDefined()
      expect(systemStatus.systemUptime).toBeGreaterThan(0)
      expect(systemStatus.lastHealthCheck).toBeDefined()
    })

    it('should provide system analytics', () => {
      const analytics = agentLifecycleOrchestrator.getSystemAnalytics()

      expect(analytics).toBeDefined()
      expect(analytics.sessions).toBeDefined()
      expect(analytics.performance).toBeDefined()
      expect(analytics.resources).toBeDefined()
      expect(analytics.health).toBeDefined()
    })

    it('should track system health over time', () => {
      const initialStatus = agentLifecycleOrchestrator.getSystemStatus()
      expect(initialStatus.status).toBe('healthy')

      // Health status should remain consistent
      setTimeout(() => {
        const laterStatus = agentLifecycleOrchestrator.getSystemStatus()
        expect(laterStatus.systemUptime).toBeGreaterThan(initialStatus.systemUptime)
      }, 1000)
    })
  })

  describe('Event Coordination', () => {
    it('should emit lifecycle events across components', (done) => {
      let eventCount = 0
      const expectedEvents = ['lifecycle:session_created']

      // Listen for lifecycle events
      expectedEvents.forEach((eventName) => {
        agentLifecycleOrchestrator.once(eventName, (data) => {
          expect(data).toBeDefined()
          eventCount++

          if (eventCount === expectedEvents.length) {
            done()
          }
        })
      })

      // Create a session to trigger events
      agentLifecycleOrchestrator
        .createAgentSession(mockAgentId, mockAuth)
        .then((result) => {
          testSessionId = result.data?.session.sessionId || ''
        })
        .catch(done)
    })
  })
})

describe('Agent Lifecycle Management - Load Testing', () => {
  const mockAuth = {
    user_id: 'load-test-user',
    workspace_id: 'load-test-workspace',
    key_type: 'personal' as const,
    permissions: ['workspace:admin'],
  }

  it('should handle multiple concurrent sessions', async () => {
    const numberOfSessions = 10
    const sessionPromises: Promise<any>[] = []
    const sessionIds: string[] = []

    // Create multiple sessions concurrently
    for (let i = 0; i < numberOfSessions; i++) {
      const promise = agentLifecycleOrchestrator.createAgentSession(
        `load-test-agent-${i}`,
        {
          ...mockAuth,
          user_id: `load-test-user-${i}`,
        },
        {
          priority: i % 3 === 0 ? 'high' : 'medium',
        }
      )
      sessionPromises.push(promise)
    }

    const results = await Promise.all(sessionPromises)

    // Verify all sessions were created successfully
    results.forEach((result, index) => {
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      sessionIds.push(result.data!.session.sessionId)
    })

    expect(sessionIds).toHaveLength(numberOfSessions)

    // Clean up all sessions
    const cleanupPromises = sessionIds.map((sessionId) =>
      agentLifecycleOrchestrator.endAgentSession(sessionId, mockAuth, 'Load test cleanup')
    )

    const cleanupResults = await Promise.all(cleanupPromises)
    cleanupResults.forEach((result) => {
      expect(result.success).toBe(true)
    })
  }, 30000) // 30 second timeout for load test

  it('should maintain performance under load', async () => {
    const startTime = Date.now()
    const numberOfOperations = 50
    const operations: Promise<any>[] = []

    // Mix different types of operations
    for (let i = 0; i < numberOfOperations; i++) {
      if (i % 5 === 0) {
        // System status checks
        operations.push(Promise.resolve(agentLifecycleOrchestrator.getSystemStatus()))
      } else if (i % 3 === 0) {
        // Analytics requests
        operations.push(Promise.resolve(agentLifecycleOrchestrator.getSystemAnalytics()))
      } else {
        // Resource summary requests
        operations.push(Promise.resolve(agentResourceManager.getResourceSummary()))
      }
    }

    const results = await Promise.all(operations)
    const endTime = Date.now()
    const totalTime = endTime - startTime
    const averageTime = totalTime / numberOfOperations

    // Performance expectations
    expect(averageTime).toBeLessThan(100) // Average operation should take less than 100ms
    expect(totalTime).toBeLessThan(5000) // Total time should be less than 5 seconds

    // Verify all operations completed successfully
    results.forEach((result) => {
      expect(result).toBeDefined()
    })
  })
})
