/**
 * Enhanced Function Execution API
 *
 * Provides enterprise-grade code execution with comprehensive security,
 * Docker sandboxing, and performance optimization while maintaining
 * backward compatibility with existing function execution API.
 *
 * Features:
 * - Automatic execution method selection (VM/Docker)
 * - Real-time security analysis and threat detection
 * - Performance optimization with intelligent caching
 * - Enterprise governance and compliance workflows
 * - Comprehensive audit logging and monitoring
 * - Backward compatibility with existing API contracts
 *
 * Author: Claude Development Agent
 * Created: September 3, 2025
 */

import { type NextRequest, NextResponse } from 'next/server'
import {
  type EnhancedExecutionRequest,
  enhancedExecutionManager,
} from '@/lib/execution/enhanced-execution-manager'
import { createLogger } from '@/lib/logs/console/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for complex executions

const logger = createLogger('EnhancedFunctionExecuteAPI')

/**
 * Enhanced execution request body interface
 */
interface EnhancedAPIRequest {
  code: string
  language?: 'javascript' | 'python'
  params?: Record<string, any>
  timeout?: number
  envVars?: Record<string, string>
  blockData?: Record<string, any>
  blockNameMapping?: Record<string, string>
  workflowVariables?: Record<string, any>
  workflowId?: string
  isCustomTool?: boolean

  // Enhanced security and execution options
  security?: {
    level?: 'basic' | 'enhanced' | 'maximum'
    enableAnalysis?: boolean
    enableGovernance?: boolean
    complianceFrameworks?: string[]
  }
  execution?: {
    method?: 'vm' | 'docker' | 'auto'
    memoryLimit?: string
    networkAccess?: 'none' | 'restricted' | 'monitored'
    customPackages?: string[]
    enableCaching?: boolean
    enableMetrics?: boolean
  }
}

/**
 * POST handler for enhanced function execution
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  try {
    const body: EnhancedAPIRequest = await req.json()

    const {
      code,
      language = 'javascript',
      params = {},
      timeout = 30000,
      envVars = {},
      blockData = {},
      blockNameMapping = {},
      workflowVariables = {},
      workflowId,
      isCustomTool = false,
      security = {},
      execution = {},
    } = body

    logger.info(`Enhanced function execution request`, {
      requestId,
      language,
      hasCode: !!code,
      paramsCount: Object.keys(params).length,
      timeout,
      workflowId,
      isCustomTool,
      securityLevel: security.level || 'enhanced',
      executionMethod: execution.method || 'auto',
    })

    // Validate required fields
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Code is required and must be a string',
          output: {
            result: null,
            stdout: '',
            stderr: 'Code validation failed',
            executionTime: 0,
            memoryUsage: 0,
            resourceUsage: {},
            securityReport: {
              riskScore: 100,
              violations: [{ type: 'validation_error', description: 'Invalid code parameter' }],
              networkRequests: [],
              fileOperations: [],
              policyCompliance: false,
              threatLevel: 'high',
              executionTimeMs: 0,
            },
          },
          executionMethod: 'validation',
          requestId,
        },
        { status: 400 }
      )
    }

    // Validate language
    if (!['javascript', 'python'].includes(language)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported language: ${language}. Supported languages: javascript, python`,
          output: {
            result: null,
            stdout: '',
            stderr: 'Language validation failed',
            executionTime: 0,
            memoryUsage: 0,
            resourceUsage: {},
            securityReport: {
              riskScore: 100,
              violations: [{ type: 'validation_error', description: 'Invalid language parameter' }],
              networkRequests: [],
              fileOperations: [],
              policyCompliance: false,
              threatLevel: 'high',
              executionTimeMs: 0,
            },
          },
          executionMethod: 'validation',
          requestId,
        },
        { status: 400 }
      )
    }

    // Build enhanced execution request
    const enhancedRequest: EnhancedExecutionRequest = {
      code,
      language,
      params,
      environmentVariables: envVars,
      blockData,
      blockNameMapping,
      workflowVariables,
      workflowId,
      isCustomTool,
      config: {
        method: execution.method || 'auto',
        securityLevel: security.level || 'enhanced',
        enableSecurityAnalysis: security.enableAnalysis !== false,
        enableGovernance: security.enableGovernance || false,
        enableCaching: execution.enableCaching !== false,
        enableMetrics: execution.enableMetrics !== false,
        timeout,
        memoryLimit: execution.memoryLimit || '512MB',
        networkAccess: execution.networkAccess || 'restricted',
        customPackages: execution.customPackages || [],
        complianceFrameworks: security.complianceFrameworks || ['OWASP'],
      },
    }

    // Execute code with enhanced security and performance
    const result = await enhancedExecutionManager.executeCode(enhancedRequest)

    const executionTime = Date.now() - startTime

    logger.info(`Enhanced function execution completed`, {
      requestId,
      success: result.success,
      method: result.executionMethod,
      executionTime,
      riskScore: result.securityAnalysis?.riskScore || 0,
      cacheHit: result.cacheHit || false,
    })

    // Add request metadata to response
    const response = {
      ...result,
      requestId,
      timestamp: new Date().toISOString(),
      apiVersion: '2.0',

      // Backward compatibility fields
      debug: result.debug || {
        requestId,
        executionMethod: result.executionMethod,
        securityLevel: enhancedRequest.config?.securityLevel,
        cacheHit: result.cacheHit,
        performanceMetrics: enhancedExecutionManager.getMetrics(),
      },
    }

    // Return appropriate HTTP status
    const status = result.success
      ? 200
      : result.error?.includes('Security')
        ? 403
        : result.error?.includes('Governance')
          ? 409
          : 500

    return NextResponse.json(response, { status })
  } catch (error: any) {
    const executionTime = Date.now() - startTime

    logger.error(`Enhanced function execution failed`, {
      requestId,
      error: error.message || 'Unknown error',
      stack: error.stack,
      executionTime,
    })

    const errorResponse = {
      success: false,
      error: error.message || 'Internal server error',
      output: {
        result: null,
        stdout: '',
        stderr: error.message || 'Internal server error',
        executionTime,
        memoryUsage: 0,
        resourceUsage: {
          cpu: { usage: 0, time: 0 },
          memory: { used: 0, max: 0, limit: 0 },
          disk: { read: 0, write: 0 },
          network: { incoming: 0, outgoing: 0, requests: 0 },
        },
        securityReport: {
          riskScore: 100,
          violations: [{ type: 'system_error', description: error.message }],
          networkRequests: [],
          fileOperations: [],
          policyCompliance: false,
          threatLevel: 'critical',
          executionTimeMs: executionTime,
        },
      },
      executionMethod: 'error',
      requestId,
      timestamp: new Date().toISOString(),
      apiVersion: '2.0',
      debug: {
        requestId,
        errorType: error.constructor.name,
        errorMessage: error.message,
        executionTime,
      },
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

/**
 * GET handler for API information and health check
 */
export async function GET(req: NextRequest) {
  try {
    const metrics = enhancedExecutionManager.getMetrics()
    const cacheStats = enhancedExecutionManager.getCacheStats()

    const response = {
      service: 'Enhanced Function Execution API',
      version: '2.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      capabilities: [
        'javascript-execution',
        'python-execution',
        'docker-sandboxing',
        'vm-execution',
        'security-analysis',
        'performance-optimization',
        'enterprise-governance',
        'comprehensive-logging',
      ],
      supportedLanguages: ['javascript', 'python'],
      securityLevels: ['basic', 'enhanced', 'maximum'],
      executionMethods: ['vm', 'docker', 'auto'],
      networkAccessModes: ['none', 'restricted', 'monitored'],

      // Performance metrics
      metrics: {
        totalExecutions: metrics.totalExecutions,
        successfulExecutions: metrics.successfulExecutions,
        failedExecutions: metrics.failedExecutions,
        averageExecutionTime: Math.round(metrics.averageExecutionTime),
        cacheHitRate: Math.round(metrics.cacheHitRate * 100) / 100,
        securityViolations: metrics.securityViolations,
        governanceBlocks: metrics.governanceBlocks,
      },

      // Cache statistics
      cache: {
        size: cacheStats.size,
        hitRate: Math.round(cacheStats.hitRate * 100) / 100,
        recentEntries: cacheStats.entries.slice(0, 5), // Show recent 5 entries
      },

      // API documentation
      documentation: {
        endpoint: '/api/function/execute/enhanced',
        methods: ['POST', 'GET'],
        postDescription: 'Execute code with enhanced security and performance features',
        getDescription: 'Get API status, metrics, and capabilities information',
      },

      // Example request format
      exampleRequest: {
        code: 'console.log("Hello from enhanced execution!"); return {message: "success"};',
        language: 'javascript',
        params: { input: 'value' },
        security: {
          level: 'enhanced',
          enableAnalysis: true,
          enableGovernance: false,
        },
        execution: {
          method: 'auto',
          memoryLimit: '256MB',
          networkAccess: 'restricted',
          enableCaching: true,
        },
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    logger.error('Enhanced function API health check failed', { error: error.message })

    return NextResponse.json(
      {
        service: 'Enhanced Function Execution API',
        version: '2.0',
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        Allow: 'GET, POST, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
