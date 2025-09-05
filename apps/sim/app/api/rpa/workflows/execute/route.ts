/**
 * RPA Workflow Execution API Endpoint
 * 
 * Handles execution of complete RPA workflows containing multiple operations.
 * Provides orchestration, sequencing, error handling, and progress tracking
 * for complex automation workflows across Desktop Agents.
 * 
 * Features:
 * - Sequential operation execution with dependencies
 * - Error handling and retry logic
 * - Variable substitution and context management
 * - Real-time progress tracking
 * - Workflow pause/resume/cancel capabilities
 * 
 * Endpoints:
 * - POST /api/rpa/workflows/execute - Execute complete workflow
 * - GET /api/rpa/workflows/execute - Get workflow execution templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { ratelimit } from '@/lib/ratelimit'
import { agentStore, agentAuthStore } from '@/app/api/rpa/agents/route'
import { 
  rpaWorkflowExecutionSchema,
  executeWorkflowRequestSchema,
  workflowConfigSchema,
  rpaOperationSchema
} from '@/socket-server/validation/rpa-schemas'
import type { 
  RPAWorkflowExecution, 
  ExecuteWorkflowRequest, 
  ExecuteWorkflowResponse,
  RPAOperation,
  RPAExecutionLog
} from '@/types/rpa'
import crypto from 'crypto'

const logger = createLogger('RPAWorkflowExecutionAPI')

// Mock workflow execution store (in production, use Redis or database)
const workflowExecutionStore = new Map<string, RPAWorkflowExecution>()

/**
 * Generate unique execution ID
 */
function generateExecutionId(): string {
  return 'exec-' + crypto.randomUUID()
}

/**
 * Generate unique operation ID
 */
function generateOperationId(type: string): string {
  return `${type}-${crypto.randomUUID()}`
}

/**
 * Validate agent availability for workflow execution
 */
async function validateAgentAvailability(agentId: string, userId: string) {
  const agent = agentStore.get(agentId)
  if (!agent) {
    return { error: 'Agent not found', status: 404 }
  }

  const agentAuth = agentAuthStore.get(agentId)
  if (!agentAuth || agentAuth.userId !== userId) {
    return { error: 'Insufficient permissions to use this agent', status: 403 }
  }

  if (agent.status === 'offline') {
    return { error: 'Agent is currently offline', status: 409 }
  }

  if (agent.status === 'error') {
    return { error: 'Agent is in error state and unavailable', status: 409 }
  }

  // Check if agent supports required capabilities
  if (!agent.capabilities.includes('desktop-automation')) {
    return { error: 'Agent does not support desktop automation', status: 409 }
  }

  return { agent, agentAuth }
}

/**
 * Authenticate request and extract user info
 */
async function authenticateRequest(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { error: 'Authentication required', status: 401 }
    }

    return { 
      user: session.user, 
      organizationId: session.session?.activeOrganizationId 
    }
  } catch (error) {
    logger.error('Authentication error:', error)
    return { error: 'Authentication failed', status: 401 }
  }
}

/**
 * Validate workflow operations for capability requirements
 */
function validateWorkflowCapabilities(operations: any[], agentCapabilities: string[]): { isValid: boolean; missingCapabilities: string[] } {
  const requiredCapabilities = new Set<string>()
  
  // Add base requirement
  requiredCapabilities.add('desktop-automation')
  
  // Check each operation for specific capability requirements
  operations.forEach(operation => {
    switch (operation.type) {
      case 'click':
        if (operation.parameters?.targetingMethod === 'image_recognition') {
          requiredCapabilities.add('image-recognition')
        }
        if (operation.parameters?.targetingMethod === 'ocr_text') {
          requiredCapabilities.add('ocr-processing')
        }
        break
      
      case 'extract':
        if (operation.parameters?.extractionMethod === 'ocr') {
          requiredCapabilities.add('ocr-processing')
        }
        if (operation.parameters?.extractionMethod === 'accessibility') {
          requiredCapabilities.add('accessibility-api')
        }
        break
      
      case 'screenshot':
        requiredCapabilities.add('screen-capture')
        if (operation.parameters?.saveToFile) {
          requiredCapabilities.add('file-operations')
        }
        break
      
      case 'find-element':
        if (operation.parameters?.searchMethod === 'image_recognition') {
          requiredCapabilities.add('image-recognition')
        }
        if (operation.parameters?.searchMethod === 'ocr_text') {
          requiredCapabilities.add('ocr-processing')
        }
        if (operation.parameters?.searchMethod === 'accessibility') {
          requiredCapabilities.add('accessibility-api')
        }
        break
      
      case 'wait':
        if (operation.parameters?.waitType?.includes('image')) {
          requiredCapabilities.add('image-recognition')
        }
        if (operation.parameters?.waitType?.includes('text')) {
          requiredCapabilities.add('ocr-processing')
        }
        break
    }
  })

  const missingCapabilities = Array.from(requiredCapabilities).filter(
    capability => !agentCapabilities.includes(capability)
  )

  return {
    isValid: missingCapabilities.length === 0,
    missingCapabilities
  }
}

/**
 * Estimate total workflow duration
 */
function estimateWorkflowDuration(operations: any[], config: any): number {
  let totalDuration = 0
  const retryMultiplier = config.continueOnError ? 1 : (config.maxRetries + 1)
  
  operations.forEach(operation => {
    let operationDuration = 5000 // Base 5 seconds per operation
    
    // Add duration based on operation type
    switch (operation.type) {
      case 'click':
        operationDuration = 3000
        if (operation.parameters?.targetingMethod === 'image_recognition') operationDuration += 3000
        if (operation.parameters?.targetingMethod === 'ocr_text') operationDuration += 4000
        break
      
      case 'type':
        const textLength = operation.parameters?.text?.length || 0
        const typingSpeed = operation.parameters?.typingSpeed || 300
        operationDuration = Math.max((textLength / typingSpeed) * 60 * 1000, 2000)
        if (operation.parameters?.targetingMethod !== 'active_element') operationDuration += 2000
        break
      
      case 'screenshot':
        operationDuration = 2000
        if (operation.parameters?.captureMode === 'fullscreen') operationDuration += 1000
        break
      
      case 'extract':
        operationDuration = 3000
        if (operation.parameters?.extractionMethod === 'ocr') operationDuration += 2000
        break
      
      case 'wait':
        operationDuration = operation.parameters?.duration || operation.parameters?.maxWaitTime || 10000
        break
      
      case 'find-element':
        operationDuration = 4000
        if (operation.parameters?.searchMethod === 'image_recognition') operationDuration += 2000
        if (operation.parameters?.searchMethod === 'ocr_text') operationDuration += 3000
        break
    }
    
    totalDuration += operationDuration * retryMultiplier
  })
  
  // Add buffer time for orchestration overhead
  totalDuration += operations.length * 1000 // 1 second overhead per operation
  
  return totalDuration
}

/**
 * POST /api/rpa/workflows/execute
 * Execute a complete RPA workflow on the specified Desktop Agent
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/rpa/workflows/execute - Executing workflow')

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user, organizationId } = authResult

    // Apply rate limiting for workflow execution (stricter than individual operations)
    const rateLimitResult = await ratelimit.limit({
      key: `rpa-workflow-execute-${user.id}`,
      requests: 10, // 10 workflow executions per minute
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      logger.warn('Workflow execution rate limit exceeded for user:', user.id)
      return NextResponse.json(
        { error: 'Too many workflow executions. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    logger.debug('Workflow execution request:', { 
      agentId: body.agentId,
      workflowId: body.workflowId,
      operationCount: body.operations?.length || 0,
      hasConfig: !!body.config,
      hasVariables: !!body.variables
    })

    // Validate the request structure
    const requestValidation = executeWorkflowRequestSchema.safeParse(body)
    if (!requestValidation.success) {
      logger.warn('Invalid workflow execution request structure:', requestValidation.error.errors)
      return NextResponse.json(
        { error: 'Invalid request structure', details: requestValidation.error.errors },
        { status: 400 }
      )
    }

    const { agentId, workflowId, operations: operationTemplates, config, variables } = requestValidation.data

    // Validate operation count limits
    if (operationTemplates.length === 0) {
      return NextResponse.json(
        { error: 'Workflow must contain at least one operation' },
        { status: 400 }
      )
    }

    if (operationTemplates.length > 100) {
      return NextResponse.json(
        { error: 'Workflow cannot contain more than 100 operations' },
        { status: 400 }
      )
    }

    // Validate agent availability
    const agentValidation = await validateAgentAvailability(agentId, user.id)
    if ('error' in agentValidation) {
      return NextResponse.json(
        { error: agentValidation.error },
        { status: agentValidation.status }
      )
    }

    const { agent } = agentValidation

    // Validate workflow capability requirements
    const capabilityValidation = validateWorkflowCapabilities(operationTemplates, agent.capabilities)
    if (!capabilityValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Agent missing required capabilities for this workflow',
          details: {
            missingCapabilities: capabilityValidation.missingCapabilities,
            agentCapabilities: agent.capabilities
          }
        },
        { status: 409 }
      )
    }

    // Create workflow configuration with defaults
    const workflowConfig = {
      continueOnError: false,
      maxRetries: 3,
      retryDelay: 1000,
      screenshotOnError: true,
      pauseOnError: false,
      notifyOnCompletion: true,
      ...config
    }

    // Generate execution and operation IDs
    const executionId = generateExecutionId()
    const now = new Date()

    // Transform operation templates into full operations with IDs and metadata
    const operations: RPAOperation[] = operationTemplates.map(template => ({
      id: generateOperationId(template.type),
      agentId,
      workflowId,
      executionId,
      status: 'pending',
      createdAt: now,
      ...template,
    }))

    // Calculate estimated duration
    const estimatedDuration = estimateWorkflowDuration(operations, workflowConfig)

    // Create workflow execution record
    const workflowExecution: RPAWorkflowExecution = {
      id: executionId,
      workflowId,
      workflowName: `Workflow ${workflowId}`, // In production, fetch actual workflow name
      agentId,
      userId: user.id,
      status: 'pending',
      priority: 'normal', // Could be configurable
      operations,
      currentOperationIndex: 0,
      totalOperations: operations.length,
      completedOperations: 0,
      failedOperations: 0,
      createdAt: now,
      estimatedDuration,
      config: workflowConfig,
      results: [],
      variables: variables || {},
      context: {
        userId: user.id,
        organizationId,
        startedBy: user.name || user.email,
        platform: agent.platform
      },
      logs: [{
        id: crypto.randomUUID(),
        executionId,
        level: 'info',
        message: `Workflow execution created with ${operations.length} operations`,
        data: {
          operationTypes: operations.map(op => op.type),
          estimatedDuration,
          config: workflowConfig
        },
        timestamp: now
      }]
    }

    // Store workflow execution for tracking
    workflowExecutionStore.set(executionId, workflowExecution)

    // Update agent status to busy
    agentStore.set(agentId, { ...agent, status: 'busy' })

    logger.info('Workflow execution created successfully:', {
      executionId,
      workflowId,
      agentId,
      userId: user.id,
      operationCount: operations.length,
      estimatedDuration,
      config: workflowConfig
    })

    // In a real implementation, this would:
    // 1. Add workflow to execution queue (Redis/Bull/etc.)
    // 2. Start workflow orchestrator process
    // 3. Send initial operations to agent via Socket.io
    // 4. Return immediately with execution ID for status tracking

    const response: ExecuteWorkflowResponse = {
      executionId,
      status: 'queued',
      totalOperations: operations.length,
      estimatedDuration,
      message: 'Workflow execution queued successfully. Operations will be executed sequentially.',
      agentInfo: {
        id: agent.id,
        name: agent.name,
        status: 'busy'
      },
      workflowInfo: {
        id: workflowId,
        name: workflowExecution.workflowName,
        operationCount: operations.length,
        operationTypes: [...new Set(operations.map(op => op.type))]
      },
      trackingUrl: `/api/rpa/workflows/${executionId}/status`,
      controlUrls: {
        pause: `/api/rpa/workflows/${executionId}/pause`,
        resume: `/api/rpa/workflows/${executionId}/resume`,
        cancel: `/api/rpa/workflows/${executionId}/cancel`
      }
    }

    // Simulate async workflow execution (in production, handled by background orchestrator)
    setTimeout(() => {
      const execution = workflowExecutionStore.get(executionId)
      if (execution) {
        // Simulate workflow progression
        const updatedExecution = {
          ...execution,
          status: 'running' as const,
          startedAt: new Date(),
          currentOperationIndex: 1,
          completedOperations: Math.floor(operations.length * 0.3), // Simulate partial completion
        }
        workflowExecutionStore.set(executionId, updatedExecution)
        
        logger.info('Workflow execution started (simulated):', { executionId, agentId })
        
        // Complete workflow after estimated duration
        setTimeout(() => {
          const finalExecution = workflowExecutionStore.get(executionId)
          if (finalExecution) {
            const completedExecution = {
              ...finalExecution,
              status: 'completed' as const,
              completedAt: new Date(),
              currentOperationIndex: operations.length,
              completedOperations: operations.length,
              actualDuration: estimatedDuration + Math.random() * 5000 - 2500 // ±2.5s variation
            }
            workflowExecutionStore.set(executionId, completedExecution)
            
            // Reset agent status
            agentStore.set(agentId, { ...agent, status: 'online' })
            
            logger.info('Workflow execution completed (simulated):', { 
              executionId, 
              agentId,
              totalOperations: operations.length
            })
          }
        }, Math.min(estimatedDuration, 30000)) // Cap simulation time at 30 seconds
      }
    }, 2000) // Start after 2 seconds

    return NextResponse.json(response, { status: 202 }) // 202 Accepted for async operation

  } catch (error) {
    logger.error('Error executing workflow:', error)
    return NextResponse.json(
      { error: 'Failed to execute workflow', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rpa/workflows/execute
 * Return workflow execution templates and examples
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/rpa/workflows/execute - Getting workflow execution templates')

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    // Apply rate limiting
    const rateLimitResult = await ratelimit.limit({
      key: `rpa-workflow-templates-${authResult.user.id}`,
      requests: 30,
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Return workflow execution templates and examples
    const templates = {
      simpleFormFilling: {
        description: 'Fill out a web form with user data',
        operations: [
          {
            type: 'screenshot',
            parameters: { captureMode: 'active_window', format: 'png' },
            priority: 'normal',
            timeout: 10000,
            maxRetries: 2,
            retryDelay: 1000
          },
          {
            type: 'click',
            parameters: {
              targetingMethod: 'ocr_text',
              ocrText: 'First Name',
              clickType: 'left_click',
              postClickDelay: 500
            },
            priority: 'normal',
            timeout: 15000,
            maxRetries: 3,
            retryDelay: 1000
          },
          {
            type: 'type',
            parameters: {
              text: '${firstName}',
              targetingMethod: 'active_element',
              humanTyping: true,
              typingSpeed: 250
            },
            priority: 'normal',
            timeout: 10000,
            maxRetries: 2,
            retryDelay: 1000
          },
          {
            type: 'click',
            parameters: {
              targetingMethod: 'ocr_text',
              ocrText: 'Submit',
              clickType: 'left_click'
            },
            priority: 'normal',
            timeout: 15000,
            maxRetries: 3,
            retryDelay: 2000
          }
        ],
        config: {
          continueOnError: false,
          screenshotOnError: true,
          maxRetries: 3,
          retryDelay: 1000
        },
        variables: {
          firstName: 'John',
          lastName: 'Doe'
        }
      },
      dataExtractionWorkflow: {
        description: 'Extract and verify data from multiple screens',
        operations: [
          {
            type: 'screenshot',
            parameters: { captureMode: 'fullscreen', format: 'png' },
            priority: 'normal',
            timeout: 10000,
            maxRetries: 1,
            retryDelay: 1000
          },
          {
            type: 'extract',
            parameters: {
              extractionMethod: 'ocr',
              regionMode: 'custom',
              region: { x: 100, y: 100, width: 600, height: 400 },
              ocrLanguage: 'eng',
              cleanupWhitespace: true
            },
            priority: 'high',
            timeout: 20000,
            maxRetries: 2,
            retryDelay: 2000
          },
          {
            type: 'find-element',
            parameters: {
              searchMethod: 'ocr_text',
              searchText: 'Total:',
              textMatchMode: 'contains',
              returnStrategy: 'first'
            },
            priority: 'normal',
            timeout: 15000,
            maxRetries: 3,
            retryDelay: 1500
          }
        ],
        config: {
          continueOnError: true,
          screenshotOnError: true,
          maxRetries: 2,
          retryDelay: 2000,
          notifyOnCompletion: true
        }
      },
      waitAndClickWorkflow: {
        description: 'Wait for element to appear then interact',
        operations: [
          {
            type: 'wait',
            parameters: {
              waitType: 'image_appears',
              templateImage: 'data:image/png;base64,...',
              maxWaitTime: 30000,
              checkInterval: 1000
            },
            priority: 'normal',
            timeout: 35000,
            maxRetries: 1,
            retryDelay: 0
          },
          {
            type: 'click',
            parameters: {
              targetingMethod: 'image_recognition',
              templateImage: 'data:image/png;base64,...',
              clickType: 'left_click',
              captureScreenshot: true
            },
            priority: 'high',
            timeout: 10000,
            maxRetries: 3,
            retryDelay: 1000
          },
          {
            type: 'wait',
            parameters: {
              waitType: 'fixed_delay',
              duration: 2000
            },
            priority: 'low',
            timeout: 5000,
            maxRetries: 1,
            retryDelay: 0
          }
        ],
        config: {
          continueOnError: false,
          pauseOnError: true,
          screenshotOnError: true
        }
      }
    }

    const documentation = {
      executionFlow: {
        phases: [
          'Validation: Check agent capabilities and operation requirements',
          'Queuing: Add workflow to execution queue with priority',
          'Initialization: Set up execution context and variables',
          'Sequential Execution: Execute operations in order',
          'Error Handling: Apply retry logic and error recovery',
          'Completion: Finalize results and cleanup resources'
        ]
      },
      configurationOptions: {
        continueOnError: 'Continue workflow even if individual operations fail',
        maxRetries: 'Maximum retry attempts per operation (0-10)',
        retryDelay: 'Delay between retry attempts in milliseconds',
        screenshotOnError: 'Capture screenshot when operation fails',
        pauseOnError: 'Pause workflow execution on first error',
        notifyOnCompletion: 'Send notification when workflow completes'
      },
      variableSubstitution: {
        syntax: 'Use ${variableName} in operation parameters',
        types: 'Supports string, number, boolean, and object variables',
        scope: 'Variables are available throughout entire workflow execution',
        examples: [
          '${username} - Simple string substitution',
          '${config.timeout} - Nested object property',
          '${users[0].name} - Array element access'
        ]
      },
      errorHandling: {
        strategies: [
          'Fail Fast: Stop on first error (continueOnError: false)',
          'Continue: Skip failed operations and continue (continueOnError: true)',
          'Pause: Stop and wait for manual intervention (pauseOnError: true)'
        ],
        recovery: [
          'Automatic retries with configurable delays',
          'Screenshot capture for debugging',
          'Detailed error logging with context',
          'Operation rollback capabilities (where supported)'
        ]
      },
      tips: [
        'Order operations logically - later operations may depend on earlier ones',
        'Use screenshots strategically for debugging and verification',
        'Set appropriate timeouts based on expected operation duration',
        'Use variables for dynamic content and reusable workflows',
        'Test individual operations before combining into workflows',
        'Enable screenshot-on-error for troubleshooting failed executions',
        'Consider using pause-on-error for complex workflows during development'
      ]
    }

    return NextResponse.json({
      templates,
      documentation,
      schema: {
        workflow: rpaWorkflowExecutionSchema._def,
        config: workflowConfigSchema._def,
        operation: rpaOperationSchema._def
      },
      limits: {
        maxOperationsPerWorkflow: 100,
        maxWorkflowDuration: 3600000, // 1 hour
        maxVariableSize: 1048576, // 1MB
        maxConcurrentExecutions: 10
      }
    })

  } catch (error) {
    logger.error('Error getting workflow execution templates:', error)
    return NextResponse.json(
      { error: 'Failed to get workflow execution templates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Export workflow execution store for use by status and control endpoints
export { workflowExecutionStore }