/**
 * Enhanced Function Execution API with Intelligent Routing
 * 
 * Backward-compatible enhancement of the existing function execution API
 * that automatically routes requests to optimal execution methods while
 * preserving existing API contracts and behavior.
 * 
 * Features:
 * - 100% backward compatibility with existing API
 * - Intelligent routing between VM and Docker execution
 * - Automatic security analysis and threat detection
 * - Performance optimization with caching
 * - Comprehensive error handling and debugging
 * - Seamless integration with existing workflow systems
 * 
 * Author: Claude Development Agent
 * Created: September 3, 2025
 */

import { createContext, Script } from 'vm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { executionRouter, type LegacyExecutionRequest } from '@/lib/execution/execution-router'
import { enhancedExecutionManager } from '@/lib/execution/enhanced-execution-manager'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const logger = createLogger('EnhancedFunctionExecuteAPI')

// Enable enhanced routing (can be toggled via environment variable)
const ENABLE_ENHANCED_ROUTING = process.env.ENABLE_ENHANCED_EXECUTION !== 'false'

/**
 * Enhanced error information interface (preserved for compatibility)
 */
interface EnhancedError {
  message: string
  line?: number
  column?: number
  stack?: string
  name: string
  originalError: any
  lineContent?: string
}

/**
 * Extract enhanced error information from VM execution errors (legacy function)
 */
function extractEnhancedError(
  error: any,
  userCodeStartLine: number,
  userCode?: string
): EnhancedError {
  const enhanced: EnhancedError = {
    message: error.message || 'Unknown error',
    name: error.name || 'Error',
    originalError: error,
  }

  if (error.stack) {
    enhanced.stack = error.stack

    const stackLines: string[] = error.stack.split('\n')

    for (const line of stackLines) {
      let match = line.match(/user-function\.js:(\d+)(?::(\d+))?/)

      if (!match) {
        match = line.match(/at\s+user-function\.js:(\d+):(\d+)/)
      }

      if (!match) {
        match = line.match(/user-function\.js:(\d+)(?::(\d+))?/)
      }

      if (match) {
        const stackLine = Number.parseInt(match[1], 10)
        const stackColumn = match[2] ? Number.parseInt(match[2], 10) : undefined

        const adjustedLine = stackLine - userCodeStartLine + 1

        const isWrapperSyntaxError =
          stackLine > userCodeStartLine &&
          error.name === 'SyntaxError' &&
          (error.message.includes('Unexpected token') ||
            error.message.includes('Unexpected end of input'))

        if (isWrapperSyntaxError && userCode) {
          const codeLines = userCode.split('\n')
          const lastUserLine = codeLines.length
          enhanced.line = lastUserLine
          enhanced.column = codeLines[lastUserLine - 1]?.length || 0
          enhanced.lineContent = codeLines[lastUserLine - 1]?.trim()
          break
        }

        if (adjustedLine > 0) {
          enhanced.line = adjustedLine
          enhanced.column = stackColumn

          if (userCode) {
            const codeLines = userCode.split('\n')
            if (adjustedLine <= codeLines.length) {
              enhanced.lineContent = codeLines[adjustedLine - 1]?.trim()
            }
          }
          break
        }

        if (stackLine <= userCodeStartLine) {
          enhanced.line = stackLine
          enhanced.column = stackColumn
          break
        }
      }
    }

    const cleanedStackLines: string[] = stackLines
      .filter(
        (line: string) =>
          line.includes('user-function.js') ||
          (!line.includes('vm.js') && !line.includes('internal/'))
      )
      .map((line: string) => line.replace(/\s+at\s+/, '    at '))

    if (cleanedStackLines.length > 0) {
      enhanced.stack = cleanedStackLines.join('\n')
    }
  }

  return enhanced
}

/**
 * Create user-friendly error message (legacy function)
 */
function createUserFriendlyErrorMessage(
  enhanced: EnhancedError,
  requestId: string,
  userCode?: string
): string {
  let errorMessage = enhanced.message

  if (enhanced.line !== undefined) {
    let lineInfo = `Line ${enhanced.line}${enhanced.column !== undefined ? `:${enhanced.column}` : ''}`

    if (enhanced.lineContent) {
      lineInfo += `: \`${enhanced.lineContent}\``
    }

    errorMessage = `${lineInfo} - ${errorMessage}`
  } else {
    if (enhanced.stack) {
      const stackMatch = enhanced.stack.match(/user-function\.js:(\d+)(?::(\d+))?/)
      if (stackMatch) {
        const line = Number.parseInt(stackMatch[1], 10)
        const column = stackMatch[2] ? Number.parseInt(stackMatch[2], 10) : undefined
        let lineInfo = `Line ${line}${column ? `:${column}` : ''}`

        if (userCode) {
          const codeLines = userCode.split('\n')
          if (line <= codeLines.length) {
            const lineContent = codeLines[line - 1]?.trim()
            if (lineContent) {
              lineInfo += `: \`${lineContent}\``
            }
          }
        }

        errorMessage = `${lineInfo} - ${errorMessage}`
      }
    }
  }

  if (enhanced.name !== 'Error') {
    const errorTypePrefix =
      enhanced.name === 'SyntaxError'
        ? 'Syntax Error'
        : enhanced.name === 'TypeError'
          ? 'Type Error'
          : enhanced.name === 'ReferenceError'
            ? 'Reference Error'
            : enhanced.name

    if (!errorMessage.toLowerCase().includes(errorTypePrefix.toLowerCase())) {
      errorMessage = `${errorTypePrefix}: ${errorMessage}`
    }
  }

  if (enhanced.name === 'SyntaxError') {
    if (errorMessage.includes('Invalid or unexpected token')) {
      errorMessage += ' (Check for missing quotes, brackets, or semicolons)'
    } else if (errorMessage.includes('Unexpected end of input')) {
      errorMessage += ' (Check for missing closing brackets or braces)'
    } else if (errorMessage.includes('Unexpected token')) {
      if (
        enhanced.lineContent &&
        ((enhanced.lineContent.includes('(') && !enhanced.lineContent.includes(')')) ||
          (enhanced.lineContent.includes('[') && !enhanced.lineContent.includes(']')) ||
          (enhanced.lineContent.includes('{') && !enhanced.lineContent.includes('}')))
      ) {
        errorMessage += ' (Check for missing closing parentheses, brackets, or braces)'
      } else {
        errorMessage += ' (Check your syntax)'
      }
    }
  }

  return errorMessage
}

/**
 * Variable resolution functions (preserved from original)
 */
function resolveWorkflowVariables(
  code: string,
  workflowVariables: Record<string, any>,
  contextVariables: Record<string, any>
): string {
  let resolvedCode = code

  const variableMatches = resolvedCode.match(/<variable\.([^>]+)>/g) || []
  for (const match of variableMatches) {
    const variableName = match.slice('<variable.'.length, -1).trim()

    const foundVariable = Object.entries(workflowVariables).find(
      ([_, variable]) => (variable.name || '').replace(/\s+/g, '') === variableName
    )

    if (foundVariable) {
      const variable = foundVariable[1]
      let variableValue = variable.value

      if (variable.value !== undefined && variable.value !== null) {
        try {
          const type = variable.type === 'string' ? 'plain' : variable.type

          if (type === 'plain' && typeof variableValue === 'string') {
            // Use as-is for plain text
          } else if (type === 'number') {
            variableValue = Number(variableValue)
          } else if (type === 'boolean') {
            variableValue = variableValue === 'true' || variableValue === true
          } else if (type === 'json') {
            try {
              variableValue =
                typeof variableValue === 'string' ? JSON.parse(variableValue) : variableValue
            } catch {
              // Keep original value if JSON parsing fails
            }
          }
        } catch (error) {
          variableValue = variable.value
        }
      }

      const safeVarName = `__variable_${variableName.replace(/[^a-zA-Z0-9_]/g, '_')}`
      contextVariables[safeVarName] = variableValue

      resolvedCode = resolvedCode.replace(new RegExp(escapeRegExp(match), 'g'), safeVarName)
    } else {
      resolvedCode = resolvedCode.replace(new RegExp(escapeRegExp(match), 'g'), '')
    }
  }

  return resolvedCode
}

function resolveEnvironmentVariables(
  code: string,
  params: Record<string, any>,
  envVars: Record<string, string>,
  contextVariables: Record<string, any>
): string {
  let resolvedCode = code

  const envVarMatches = resolvedCode.match(/\{\{([^}]+)\}\}/g) || []
  for (const match of envVarMatches) {
    const varName = match.slice(2, -2).trim()
    const varValue = envVars[varName] || params[varName] || ''

    const safeVarName = `__var_${varName.replace(/[^a-zA-Z0-9_]/g, '_')}`
    contextVariables[safeVarName] = varValue

    resolvedCode = resolvedCode.replace(new RegExp(escapeRegExp(match), 'g'), safeVarName)
  }

  return resolvedCode
}

function resolveTagVariables(
  code: string,
  params: Record<string, any>,
  blockData: Record<string, any>,
  blockNameMapping: Record<string, string>,
  contextVariables: Record<string, any>
): string {
  let resolvedCode = code

  const tagMatches = resolvedCode.match(/<([a-zA-Z_][a-zA-Z0-9_.]*[a-zA-Z0-9_])>/g) || []

  for (const match of tagMatches) {
    const tagName = match.slice(1, -1).trim()

    let tagValue = getNestedValue(params, tagName) || getNestedValue(blockData, tagName) || ''

    if (!tagValue && tagName.includes('.')) {
      const pathParts = tagName.split('.')
      const normalizedBlockName = pathParts[0]

      let blockId = null

      for (const [blockName, id] of Object.entries(blockNameMapping)) {
        const normalizedName = blockName.replace(/\s+/g, '').toLowerCase()
        if (normalizedName === normalizedBlockName) {
          blockId = id
          break
        }
      }

      if (blockId) {
        const remainingPath = pathParts.slice(1).join('.')
        const fullPath = `${blockId}.${remainingPath}`
        tagValue = getNestedValue(blockData, fullPath) || ''
      }
    }

    if (
      typeof tagValue === 'string' &&
      tagValue.length > 100 &&
      (tagValue.startsWith('{') || tagValue.startsWith('['))
    ) {
      try {
        tagValue = JSON.parse(tagValue)
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    const safeVarName = `__tag_${tagName.replace(/[^a-zA-Z0-9_]/g, '_')}`
    contextVariables[safeVarName] = tagValue

    resolvedCode = resolvedCode.replace(new RegExp(escapeRegExp(match), 'g'), safeVarName)
  }

  return resolvedCode
}

function resolveCodeVariables(
  code: string,
  params: Record<string, any>,
  envVars: Record<string, string> = {},
  blockData: Record<string, any> = {},
  blockNameMapping: Record<string, string> = {},
  workflowVariables: Record<string, any> = {}
): { resolvedCode: string; contextVariables: Record<string, any> } {
  let resolvedCode = code
  const contextVariables: Record<string, any> = {}

  resolvedCode = resolveWorkflowVariables(resolvedCode, workflowVariables, contextVariables)
  resolvedCode = resolveEnvironmentVariables(resolvedCode, params, envVars, contextVariables)
  resolvedCode = resolveTagVariables(
    resolvedCode,
    params,
    blockData,
    blockNameMapping,
    contextVariables
  )

  return { resolvedCode, contextVariables }
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined

  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined
  }, obj)
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Enhanced POST handler with intelligent routing
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  let stdout = ''
  let userCodeStartLine = 3
  let resolvedCode = ''
  let routingDecision: any = null

  try {
    const body = await req.json()

    const {
      code,
      params = {},
      timeout = 5000,
      envVars = {},
      blockData = {},
      blockNameMapping = {},
      workflowVariables = {},
      workflowId,
      isCustomTool = false,
    } = body

    const executionParams = { ...params }
    executionParams._context = undefined

    logger.info(`[${requestId}] Enhanced function execution request`, {
      hasCode: !!code,
      paramsCount: Object.keys(executionParams).length,
      timeout,
      workflowId,
      isCustomTool,
      routingEnabled: ENABLE_ENHANCED_ROUTING
    })

    // Resolve variables in the code
    const codeResolution = resolveCodeVariables(
      code,
      executionParams,
      envVars,
      blockData,
      blockNameMapping,
      workflowVariables
    )
    resolvedCode = codeResolution.resolvedCode
    const contextVariables = codeResolution.contextVariables

    // Intelligent routing decision
    if (ENABLE_ENHANCED_ROUTING) {
      const routingRequest: LegacyExecutionRequest = {
        code: resolvedCode,
        params: executionParams,
        timeout,
        envVars,
        blockData,
        blockNameMapping,
        workflowVariables,
        workflowId,
        isCustomTool
      }

      const routing = await executionRouter.routeExecution(routingRequest)
      routingDecision = routing.decision

      logger.info(`[${requestId}] Routing decision`, {
        method: routingDecision.method,
        reason: routingDecision.reason,
        confidence: routingDecision.confidence,
        securityRisk: routingDecision.criteria.securityRisk
      })

      // Use enhanced execution if recommended
      if (routing.shouldUseEnhanced) {
        return await executeWithEnhanced(
          requestId,
          routingRequest,
          routingDecision,
          startTime
        )
      }
    }

    // Fall back to legacy VM execution
    return await executeWithLegacyVM(
      requestId,
      resolvedCode,
      contextVariables,
      executionParams,
      envVars,
      timeout,
      userCodeStartLine,
      startTime,
      routingDecision
    )

  } catch (error: any) {
    const executionTime = Date.now() - startTime
    logger.error(`[${requestId}] Function execution failed`, {
      error: error.message || 'Unknown error',
      stack: error.stack,
      executionTime,
    })

    const enhancedError = extractEnhancedError(error, userCodeStartLine, resolvedCode)
    const userFriendlyErrorMessage = createUserFriendlyErrorMessage(
      enhancedError,
      requestId,
      resolvedCode
    )

    const errorResponse = {
      success: false,
      error: userFriendlyErrorMessage,
      output: {
        result: null,
        stdout,
        executionTime,
      },
      debug: {
        line: enhancedError.line,
        column: enhancedError.column,
        errorType: enhancedError.name,
        lineContent: enhancedError.lineContent,
        stack: enhancedError.stack,
        requestId,
        routingDecision: routingDecision ? {
          method: routingDecision.method,
          reason: routingDecision.reason
        } : null
      },
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

/**
 * Execute using enhanced manager
 */
async function executeWithEnhanced(
  requestId: string,
  request: LegacyExecutionRequest,
  routingDecision: any,
  startTime: number
) {
  logger.info(`[${requestId}] Executing with enhanced manager`)

  const enhancedRequest = {
    code: request.code,
    language: 'javascript' as const,
    params: request.params,
    environmentVariables: request.envVars,
    blockData: request.blockData,
    blockNameMapping: request.blockNameMapping,
    workflowVariables: request.workflowVariables,
    workflowId: request.workflowId,
    isCustomTool: request.isCustomTool,
    config: {
      method: routingDecision.recommendation.executionMethod,
      securityLevel: routingDecision.recommendation.securityLevel,
      enableSecurityAnalysis: routingDecision.recommendation.enableAnalysis,
      enableGovernance: false,
      enableCaching: routingDecision.recommendation.enableCaching,
      enableMetrics: true,
      timeout: request.timeout || 5000,
      memoryLimit: routingDecision.criteria.memoryRequirement === 'high' ? '1GB' :
                   routingDecision.criteria.memoryRequirement === 'medium' ? '512MB' : '256MB',
      networkAccess: routingDecision.criteria.hasNetworkOperations ? 'monitored' as const : 'none' as const,
      customPackages: []
    }
  }

  const result = await enhancedExecutionManager.executeCode(enhancedRequest)
  
  // Update routing metrics
  executionRouter.updateMetrics('enhanced', Date.now() - startTime, result.success)

  // Transform to legacy API format for backward compatibility
  const legacyResponse = {
    success: result.success,
    output: {
      result: result.output.result,
      stdout: result.output.stdout,
      executionTime: result.output.executionTime,
    },
    error: result.error,
    debug: {
      requestId,
      executionMethod: result.executionMethod,
      securityAnalysis: result.securityAnalysis ? {
        riskScore: result.securityAnalysis.riskScore,
        threatLevel: result.securityAnalysis.threatLevel,
        approved: result.securityAnalysis.approved
      } : null,
      routingDecision: {
        method: routingDecision.method,
        reason: routingDecision.reason,
        confidence: routingDecision.confidence
      },
      cacheHit: result.cacheHit,
      // Enhanced debug info
      resourceUsage: result.output.resourceUsage,
      securityReport: result.output.securityReport
    }
  }

  return NextResponse.json(legacyResponse, { status: result.success ? 200 : 500 })
}

/**
 * Execute using legacy VM (preserved original logic)
 */
async function executeWithLegacyVM(
  requestId: string,
  resolvedCode: string,
  contextVariables: Record<string, any>,
  executionParams: Record<string, any>,
  envVars: Record<string, string>,
  timeout: number,
  userCodeStartLine: number,
  startTime: number,
  routingDecision: any
) {
  logger.info(`[${requestId}] Using legacy VM for code execution`)

  let stdout = ''

  const context = createContext({
    params: executionParams,
    environmentVariables: envVars,
    ...contextVariables,
    fetch: globalThis.fetch || require('node-fetch').default,
    console: {
      log: (...args: any[]) => {
        const logMessage = `${args
          .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
          .join(' ')}\n`
        stdout += logMessage
      },
      error: (...args: any[]) => {
        const errorMessage = `${args
          .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
          .join(' ')}\n`
        logger.error(`[${requestId}] Code Console Error: ${errorMessage}`)
        stdout += `ERROR: ${errorMessage}`
      },
    },
  })

  const wrapperLines = ['(async () => {', '  try {']

  userCodeStartLine = wrapperLines.length + 1

  const fullScript = [
    ...wrapperLines,
    `    ${resolvedCode.split('\n').join('\n    ')}`,
    '  } catch (error) {',
    '    console.error(error);',
    '    throw error;',
    '  }',
    '})()',
  ].join('\n')

  const script = new Script(fullScript, {
    filename: 'user-function.js',
    lineOffset: 0,
    columnOffset: 0,
  })

  const result = await script.runInContext(context, {
    timeout,
    displayErrors: true,
    breakOnSigint: true,
  })

  const executionTime = Date.now() - startTime
  
  // Update routing metrics
  if (ENABLE_ENHANCED_ROUTING) {
    executionRouter.updateMetrics('legacy', executionTime, true)
  }

  logger.info(`[${requestId}] Function executed successfully using VM`, {
    executionTime,
  })

  const response = {
    success: true,
    output: {
      result,
      stdout,
      executionTime,
    },
    debug: {
      requestId,
      executionMethod: 'vm',
      routingDecision: routingDecision ? {
        method: routingDecision.method,
        reason: routingDecision.reason,
        confidence: routingDecision.confidence
      } : null
    }
  }

  return NextResponse.json(response)
}

/**
 * GET handler for API status and routing statistics
 */
export async function GET(req: NextRequest) {
  try {
    const routingStats = executionRouter.getStatistics()
    const enhancedMetrics = enhancedExecutionManager.getMetrics()

    const response = {
      service: 'Enhanced Function Execution API',
      version: '1.5', // Enhanced version of existing API
      status: 'healthy',
      timestamp: new Date().toISOString(),
      
      // Feature flags
      features: {
        enhancedRoutingEnabled: ENABLE_ENHANCED_ROUTING,
        backwardCompatibility: true,
        intelligentExecutionSelection: true,
        securityAnalysis: true,
        performanceOptimization: true
      },
      
      // Routing statistics
      routing: routingStats,
      
      // Enhanced execution metrics
      enhanced: {
        totalExecutions: enhancedMetrics.totalExecutions,
        successRate: enhancedMetrics.totalExecutions > 0 ? 
          (enhancedMetrics.successfulExecutions / enhancedMetrics.totalExecutions) * 100 : 0,
        averageExecutionTime: Math.round(enhancedMetrics.averageExecutionTime),
        cacheHitRate: Math.round(enhancedMetrics.cacheHitRate * 100)
      },
      
      // API compatibility
      compatibility: {
        legacyAPISupport: true,
        existingContractsPreserved: true,
        errorFormatCompatible: true,
        responseFormatCompatible: true
      }
    }

    return NextResponse.json(response)
    
  } catch (error: any) {
    logger.error('API status check failed', { error: error.message })
    
    return NextResponse.json({
      service: 'Enhanced Function Execution API',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 500 })
  }
}