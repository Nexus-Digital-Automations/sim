/**
 * Universal Tool Adapter System - Main Integration Module
 * =====================================================
 *
 * This module provides a complete integration point for the Universal Tool Adapter System.
 * It initializes all components, registers adapters, and provides a unified API for
 * interacting with Sim tools through Parlant-compatible interfaces.
 */

import { GoogleSheetsBlock } from '@/blocks/blocks/google_sheets'
import { SlackBlock } from '@/blocks/blocks/slack'
import { UniversalToolAdapter } from './adapter-framework'
import { globalAdapterRegistry, UniversalToolAdapterRegistry } from './adapter-registry'
import { GitHubAdapter } from './adapters/github-adapter'
import { GoogleSheetsAdapter } from './adapters/google-sheets-adapter'
// Import specific adapters
import { OpenAIAdapter } from './adapters/openai-adapter'
import { PostgreSQLAdapter } from './adapters/postgresql-adapter'
import { SlackAdapter } from './adapters/slack-adapter'
import { AdapterMonitoringSystem, globalAdapterMonitoring } from './quality/adapter-monitoring'
// Import template utilities
import { AdapterTemplates } from './templates/adapter-templates'
import { AdapterTestingFramework } from './testing/adapter-testing-framework'

// ================================
// System Configuration
// ================================

export interface UniversalToolAdapterSystemConfig {
  /** Enable automatic adapter registration for all Sim blocks */
  autoRegisterAdapters?: boolean
  /** Enable comprehensive testing during initialization */
  enableTesting?: boolean
  /** Enable monitoring and health checks */
  enableMonitoring?: boolean
  /** Registry configuration */
  registryConfig?: {
    enableCaching?: boolean
    cacheTTL?: number
    maxRetries?: number
    healthCheckInterval?: number
    enableLogging?: boolean
  }
  /** List of specific adapters to register (if autoRegister is false) */
  adaptersToRegister?: string[]
}

// ================================
// System Initialization
// ================================

/**
 * Initialize the Universal Tool Adapter System
 * Sets up registry, monitoring, and registers all adapters
 */
export async function initializeUniversalToolAdapterSystem(
  config: UniversalToolAdapterSystemConfig = {}
): Promise<{
  registry: UniversalToolAdapterRegistry
  monitoring: AdapterMonitoringSystem
  testing: AdapterTestingFramework
  registeredAdapters: string[]
}> {
  console.log('[UniversalToolAdapter] Initializing Universal Tool Adapter System...')

  const {
    autoRegisterAdapters = true,
    enableTesting = true,
    enableMonitoring = true,
    adaptersToRegister = [],
  } = config

  // Track registered adapters
  const registeredAdapters: string[] = []

  try {
    // 1. Register core adapters
    if (autoRegisterAdapters || adaptersToRegister.includes('openai')) {
      await globalAdapterRegistry.registerAdapter(new OpenAIAdapter())
      registeredAdapters.push('openai_embeddings')
    }

    if (autoRegisterAdapters || adaptersToRegister.includes('github')) {
      await globalAdapterRegistry.registerAdapter(new GitHubAdapter())
      registeredAdapters.push('github')
    }

    if (autoRegisterAdapters || adaptersToRegister.includes('slack')) {
      await globalAdapterRegistry.registerAdapter(new SlackAdapter(SlackBlock))
      registeredAdapters.push('slack')
    }

    if (autoRegisterAdapters || adaptersToRegister.includes('google_sheets')) {
      await globalAdapterRegistry.registerAdapter(new GoogleSheetsAdapter(GoogleSheetsBlock))
      registeredAdapters.push('google_sheets')
    }

    // 2. Initialize testing framework if enabled
    let testingFramework: AdapterTestingFramework
    if (enableTesting) {
      testingFramework = new AdapterTestingFramework(globalAdapterRegistry)

      // Register standard test suites for all adapters
      for (const adapterId of registeredAdapters) {
        try {
          const testCases = testingFramework.createStandardTestSuite(adapterId)
          testingFramework.registerTestSuite(`${adapterId}_standard`, testCases)
          console.log(
            `[UniversalToolAdapter] Registered ${testCases.length} test cases for ${adapterId}`
          )
        } catch (error) {
          console.warn(
            `[UniversalToolAdapter] Failed to create test suite for ${adapterId}:`,
            error.message
          )
        }
      }
    }

    // 3. Setup monitoring and alerts if enabled
    if (enableMonitoring) {
      // Register performance alerts for all adapters
      for (const adapterId of registeredAdapters) {
        globalAdapterMonitoring.registerAlert({
          Name: `${adapterId}_high_latency`,
          adapterId,
          condition: {
            metric: 'latency',
            operator: 'gt',
            threshold: 10000, // 10 seconds
            duration: 300, // 5 minutes
          },
          severity: 'medium',
          actions: [
            { type: 'log', config: {} },
            { type: 'auto_recover', config: {} },
          ],
          enabled: true,
        })

        globalAdapterMonitoring.registerAlert({
          Name: `${adapterId}_high_error_rate`,
          adapterId,
          condition: {
            metric: 'error_rate',
            operator: 'gt',
            threshold: 0.1, // 10%
            duration: 180, // 3 minutes
          },
          severity: 'high',
          actions: [
            { type: 'log', config: {} },
            { type: 'auto_recover', config: {} },
          ],
          enabled: true,
        })
      }
    }

    // 4. Log initialization success
    console.log(
      `[UniversalToolAdapter] Successfully initialized with ${registeredAdapters.length} adapters:`
    )
    registeredAdapters.forEach((adapterId) => {
      console.log(`[UniversalToolAdapter] - ${adapterId}`)
    })

    // 5. Return system components
    return {
      registry: globalAdapterRegistry,
      monitoring: globalAdapterMonitoring,
      testing: testingFramework!,
      registeredAdapters,
    }
  } catch (error) {
    console.error('[UniversalToolAdapter] Failed to initialize system:', error)
    throw new Error(`Universal Tool Adapter System initialization failed: ${error.message}`)
  }
}

// ================================
// Validation and Health Check
// ================================

/**
 * Validate that the Universal Tool Adapter System is properly configured
 */
export async function validateUniversalToolAdapterSystem(): Promise<{
  isValid: boolean
  issues: string[]
  recommendations: string[]
  systemHealth: any
}> {
  const issues: string[] = []
  const recommendations: string[] = []

  console.log('[UniversalToolAdapter] Validating system configuration...')

  try {
    // 1. Check registry health
    const registryHealth = globalAdapterRegistry.getHealthSummary()
    if (registryHealth.totalAdapters === 0) {
      issues.push('No adapters registered in the system')
      recommendations.push(
        'Register at least one adapter using initializeUniversalToolAdapterSystem()'
      )
    }

    if (registryHealth.unhealthyAdapters > 0) {
      issues.push(`${registryHealth.unhealthyAdapters} adapters are unhealthy`)
      recommendations.push('Check adapter logs and perform health diagnostics')
    }

    // 2. Test a sample of adapters
    const adapters = globalAdapterRegistry.listAdapters()
    const testResults = []

    for (const adapterId of adapters.slice(0, 3)) {
      // Test first 3 adapters
      try {
        // Get adapter tool definition
        const adapter = globalAdapterRegistry.getAdapter(adapterId)
        if (adapter) {
          const parlantTool = adapter.getParlantTool()

          // Validate tool definition structure
          if (!parlantTool.id || !parlantTool.Name || !parlantTool.description) {
            issues.push(`Adapter '${adapterId}' has incomplete tool definition`)
          }

          if (!parlantTool.parameters || parlantTool.parameters.length === 0) {
            recommendations.push(
              `Adapter '${adapterId}' should define parameters for better usability`
            )
          }

          testResults.push({ adapterId, status: 'valid' })
        }
      } catch (error) {
        issues.push(`Adapter '${adapterId}' failed validation: ${error.message}`)
        testResults.push({ adapterId, status: 'invalid', error: error.message })
      }
    }

    // 3. Check system integrations
    const parlantTools = globalAdapterRegistry.getParlantTools()
    if (parlantTools.length === 0) {
      issues.push('No Parlant tools available - check adapter registration')
    }

    // 4. Check monitoring system
    const monitoringHealth = globalAdapterMonitoring.getAllHealthStatus()
    if (monitoringHealth.length === 0) {
      recommendations.push('Enable monitoring for better system observability')
    }

    // 5. Performance check
    if (registryHealth.overallSuccessRate < 0.95) {
      issues.push(
        `System success rate is low: ${(registryHealth.overallSuccessRate * 100).toFixed(1)}%`
      )
      recommendations.push('Investigate adapter error patterns and implement fixes')
    }

    // 6. Security validation
    for (const tool of parlantTools) {
      if (tool.requiresAuth && !tool.requiresAuth.type) {
        issues.push(`Tool '${tool.id}' requires authentication but has no auth type specified`)
      }
    }

    const isValid = issues.length === 0

    console.log(`[UniversalToolAdapter] Validation complete: ${isValid ? 'PASSED' : 'FAILED'}`)
    if (issues.length > 0) {
      console.log(`[UniversalToolAdapter] Issues found: ${issues.length}`)
      issues.forEach((issue) => {
        console.log(`[UniversalToolAdapter] - ${issue}`)
      })
    }

    return {
      isValid,
      issues,
      recommendations,
      systemHealth: {
        registryHealth,
        testResults,
        monitoringHealth,
      },
    }
  } catch (error) {
    issues.push(`Validation failed with error: ${error.message}`)
    return {
      isValid: false,
      issues,
      recommendations: ['Check system initialization and configuration'],
      systemHealth: null,
    }
  }
}

// ================================
// Comprehensive System Test
// ================================

/**
 * Run comprehensive end-to-end tests on the Universal Tool Adapter System
 */
export async function runComprehensiveSystemTest(): Promise<{
  passed: boolean
  results: any[]
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    passRate: number
    duration: number
  }
}> {
  console.log('[UniversalToolAdapter] Running comprehensive system test...')

  const startTime = Date.now()
  const results: any[] = []
  let passedTests = 0
  let totalTests = 0

  const testingFramework = new AdapterTestingFramework(globalAdapterRegistry)

  // Test each registered adapter
  const adapters = globalAdapterRegistry.listAdapters()

  for (const adapterId of adapters) {
    try {
      console.log(`[UniversalToolAdapter] Testing adapter: ${adapterId}`)

      // Create and run standard test suite
      const testCases = testingFramework.createStandardTestSuite(adapterId)
      testingFramework.registerTestSuite(`${adapterId}_comprehensive`, testCases)

      const suiteResult = await testingFramework.executeTestSuite(
        adapterId,
        `${adapterId}_comprehensive`,
        {
          timeout: 30000,
          concurrency: 1,
          failFast: false,
          environment: 'development',
          mocking: {
            enabled: true,
            mockApiResponses: true,
            mockAuthCredentials: true,
          },
        }
      )

      results.push({
        adapterId,
        suiteResult,
        status: suiteResult.summary.passRate >= 0.8 ? 'passed' : 'failed',
      })

      totalTests += suiteResult.summary.total
      passedTests += suiteResult.summary.passed
    } catch (error) {
      console.error(`[UniversalToolAdapter] Test failed for ${adapterId}:`, error.message)
      results.push({
        adapterId,
        status: 'error',
        error: error.message,
      })
      totalTests += 1 // Count as one failed test
    }
  }

  const duration = Date.now() - startTime
  const passRate = totalTests > 0 ? passedTests / totalTests : 0
  const passed = passRate >= 0.8 && results.every((r) => r.status !== 'error')

  const summary = {
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    passRate,
    duration,
  }

  console.log(`[UniversalToolAdapter] Comprehensive test complete:`)
  console.log(
    `[UniversalToolAdapter] - Tests: ${passedTests}/${totalTests} passed (${(passRate * 100).toFixed(1)}%)`
  )
  console.log(`[UniversalToolAdapter] - Duration: ${duration}ms`)
  console.log(`[UniversalToolAdapter] - Overall: ${passed ? 'PASSED' : 'FAILED'}`)

  return {
    passed,
    results,
    summary,
  }
}

// ================================
// System Health Dashboard Data
// ================================

/**
 * Get comprehensive system health data for dashboards
 */
export function getSystemHealthDashboard(): {
  overview: any
  adapters: any[]
  performance: any
  alerts: any[]
  recentActivity: any[]
} {
  // Registry overview
  const registryHealth = globalAdapterRegistry.getHealthSummary()
  const aggregatedMetrics = globalAdapterMonitoring.getAggregatedMetrics()

  // Individual adapter health
  const adapters = globalAdapterRegistry.listAdapters().map((adapterId) => {
    const adapter = globalAdapterRegistry.getAdapter(adapterId)
    const metadata = globalAdapterRegistry.getAdapterMetadata(adapterId)
    const healthStatus = globalAdapterMonitoring.getHealthStatus(adapterId)

    return {
      id: adapterId,
      Name: adapter?.getParlantTool().Name || adapterId,
      category: adapter?.getParlantTool().category || 'unknown',
      health: metadata?.health || 'unknown',
      metrics: metadata?.metrics || {},
      lastExecuted: metadata?.metrics.lastExecuted,
      healthScore: healthStatus?.score || 0,
    }
  })

  // Recent activity
  const recentLogs = globalAdapterMonitoring.searchLogs({
    limit: 50,
    startTime: new Date(Date.now() - 3600000).toISOString(), // Last hour
  })

  const recentActivity = recentLogs.map((log) => ({
    timestamp: log.timestamp,
    adapterId: log.adapterId,
    operation: log.operation,
    level: log.level,
    message: log.message,
    duration: log.performance?.duration,
  }))

  return {
    overview: {
      totalAdapters: registryHealth.totalAdapters,
      healthyAdapters: registryHealth.healthyAdapters,
      totalExecutions: registryHealth.totalExecutions,
      overallSuccessRate: registryHealth.overallSuccessRate,
      averageLatency: aggregatedMetrics.averageLatency,
      totalRequests: aggregatedMetrics.totalRequests,
      totalErrors: aggregatedMetrics.totalErrors,
    },
    adapters,
    performance: aggregatedMetrics,
    alerts: [], // Would include active alerts
    recentActivity,
  }
}

// ================================
// Export System Components
// ================================

export {
  // Core Framework
  UniversalToolAdapter,
  UniversalToolAdapterRegistry,
  globalAdapterRegistry,
  // Testing
  AdapterTestingFramework,
  // Monitoring
  AdapterMonitoringSystem,
  globalAdapterMonitoring,
  // Templates and Utilities
  AdapterTemplates,
  // Specific Adapters
  OpenAIAdapter,
  GitHubAdapter,
  PostgreSQLAdapter,
  SlackAdapter,
  GoogleSheetsAdapter,
}

// ================================
// Default Export - System Interface
// ================================

export default {
  initialize: initializeUniversalToolAdapterSystem,
  validate: validateUniversalToolAdapterSystem,
  test: runComprehensiveSystemTest,
  getDashboardData: getSystemHealthDashboard,
  registry: globalAdapterRegistry,
  monitoring: globalAdapterMonitoring,
}
