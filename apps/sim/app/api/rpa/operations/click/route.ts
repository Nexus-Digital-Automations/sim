/**
 * RPA Click Operation API Endpoint
 * 
 * Handles desktop click operations with multiple targeting methods:
 * - Coordinate-based clicking
 * - Image recognition targeting
 * - OCR text-based targeting
 * 
 * Supports all standard click types with advanced configuration options
 * including retries, timeouts, and post-action verification.
 * 
 * Endpoints:
 * - POST /api/rpa/operations/click - Execute click operation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { ratelimit } from '@/lib/ratelimit'
import { agentStore, agentAuthStore } from '@/app/api/rpa/agents/route'
import { 
  rpaClickOperationSchema, 
  executeOperationRequestSchema,
  clickParametersSchema 
} from '@/socket-server/validation/rpa-schemas'
import type { 
  RPAClickOperation, 
  ExecuteOperationRequest, 
  ExecuteOperationResponse 
} from '@/types/rpa'
import crypto from 'crypto'

const logger = createLogger('RPAClickOperationAPI')

// Mock operation store (in production, use Redis or database queue)
const operationStore = new Map<string, RPAClickOperation>()

/**
 * Generate unique operation ID
 */
function generateOperationId(): string {
  return 'click-' + crypto.randomUUID()
}

/**
 * Validate agent availability for operation execution
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
 * Estimate operation duration based on parameters
 */
function estimateOperationDuration(parameters: any): number {
  let baseDuration = 2000 // Base 2 seconds for simple coordinate click
  
  // Add time for different targeting methods
  switch (parameters.targetingMethod) {
    case 'image_recognition':
      baseDuration += 3000 // Add 3 seconds for image processing
      break
    case 'ocr_text':
      baseDuration += 4000 // Add 4 seconds for OCR processing
      break
  }
  
  // Add retry time
  const maxRetries = parameters.maxRetries || 3
  const retryDelay = parameters.retryDelay || 1000
  baseDuration += maxRetries * retryDelay
  
  // Add post-click delay
  baseDuration += parameters.postClickDelay || 100
  
  // Add screenshot time if enabled
  if (parameters.captureScreenshot) {
    baseDuration += 1000
  }
  
  return baseDuration
}

/**
 * POST /api/rpa/operations/click
 * Execute a click operation on the specified Desktop Agent
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/rpa/operations/click - Executing click operation')

    // Authenticate request
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user, organizationId } = authResult

    // Apply rate limiting for operation execution
    const rateLimitResult = await ratelimit.limit({
      key: `rpa-click-operation-${user.id}`,
      requests: 30, // 30 click operations per minute
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      logger.warn('Click operation rate limit exceeded for user:', user.id)
      return NextResponse.json(
        { error: 'Too many click operations. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    logger.debug('Click operation request:', { 
      agentId: body.agentId,
      targetingMethod: body.operation?.parameters?.targetingMethod,
      clickType: body.operation?.parameters?.clickType
    })

    // Validate the basic request structure
    const requestValidation = executeOperationRequestSchema.safeParse(body)
    if (!requestValidation.success) {
      logger.warn('Invalid click operation request structure:', requestValidation.error.errors)
      return NextResponse.json(
        { error: 'Invalid request structure', details: requestValidation.error.errors },
        { status: 400 }
      )
    }

    const { agentId, operation: operationData, workflowId, executionId } = requestValidation.data

    // Ensure operation type is click
    if (operationData.type !== 'click') {
      return NextResponse.json(
        { error: 'Invalid operation type. Expected "click".' },
        { status: 400 }
      )
    }

    // Validate click-specific parameters
    const parametersValidation = clickParametersSchema.safeParse(operationData.parameters)
    if (!parametersValidation.success) {
      logger.warn('Invalid click operation parameters:', parametersValidation.error.errors)
      return NextResponse.json(
        { error: 'Invalid click parameters', details: parametersValidation.error.errors },
        { status: 400 }
      )
    }

    const parameters = parametersValidation.data

    // Validate agent availability
    const agentValidation = await validateAgentAvailability(agentId, user.id)
    if ('error' in agentValidation) {
      return NextResponse.json(
        { error: agentValidation.error },
        { status: agentValidation.status }
      )
    }

    const { agent } = agentValidation

    // Additional capability checks based on targeting method
    if (parameters.targetingMethod === 'image_recognition' && !agent.capabilities.includes('image-recognition')) {
      return NextResponse.json(
        { error: 'Agent does not support image recognition' },
        { status: 409 }
      )
    }

    if (parameters.targetingMethod === 'ocr_text' && !agent.capabilities.includes('ocr-processing')) {
      return NextResponse.json(
        { error: 'Agent does not support OCR processing' },
        { status: 409 }
      )
    }

    // Create click operation
    const operationId = generateOperationId()
    const now = new Date()
    const estimatedDuration = estimateOperationDuration(parameters)

    const clickOperation: RPAClickOperation = {
      id: operationId,
      type: 'click',
      agentId,
      workflowId,
      executionId,
      status: 'pending',
      priority: operationData.priority || 'normal',
      timeout: operationData.timeout || 30000, // Default 30 seconds
      maxRetries: operationData.maxRetries || 3,
      retryDelay: operationData.retryDelay || 1000,
      createdAt: now,
      parameters
    }

    // Store operation for tracking
    operationStore.set(operationId, clickOperation)

    // Update agent status to busy if it's currently idle
    if (agent.status === 'online') {
      agentStore.set(agentId, { ...agent, status: 'busy' })
    }

    logger.info('Click operation created successfully:', {
      operationId,
      agentId,
      userId: user.id,
      targetingMethod: parameters.targetingMethod,
      clickType: parameters.clickType,
      estimatedDuration
    })

    // In a real implementation, this would:
    // 1. Add operation to a job queue (Redis/Bull/etc.)
    // 2. Send operation to agent via Socket.io
    // 3. Return immediately with operation ID for status tracking

    const response: ExecuteOperationResponse = {
      operationId,
      status: 'queued',
      estimatedDuration,
      message: 'Click operation queued successfully. Monitor operation status for completion.',
      agentInfo: {
        id: agent.id,
        name: agent.name,
        status: agent.status
      },
      queuePosition: 1, // Mock queue position
      trackingUrl: `/api/rpa/operations/${operationId}/status`
    }

    // Simulate async operation execution (in production, this would be handled by background workers)
    setTimeout(() => {
      const operation = operationStore.get(operationId)
      if (operation) {
        // Simulate operation completion
        const completedOperation = {
          ...operation,
          status: 'completed' as const,
          startedAt: new Date(),
          completedAt: new Date()
        }
        operationStore.set(operationId, completedOperation)
        
        // Reset agent status to online
        agentStore.set(agentId, { ...agent, status: 'online' })
        
        logger.info('Click operation completed (simulated):', { operationId, agentId })
      }
    }, Math.random() * 5000 + 2000) // Complete after 2-7 seconds

    return NextResponse.json(response, { status: 202 }) // 202 Accepted for async operation

  } catch (error) {
    logger.error('Error executing click operation:', error)
    return NextResponse.json(
      { error: 'Failed to execute click operation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rpa/operations/click (Optional: for getting operation templates or examples)
 * Return click operation configuration templates and examples
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/rpa/operations/click - Getting click operation templates')

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
      key: `rpa-click-templates-${authResult.user.id}`,
      requests: 30,
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Return click operation templates and examples
    const templates = {
      coordinateClick: {
        description: 'Click at specific screen coordinates',
        parameters: {
          clickType: 'left_click',
          targetingMethod: 'coordinates',
          coordinates: { x: 500, y: 300 },
          postClickDelay: 500
        }
      },
      imageRecognitionClick: {
        description: 'Click on element found through image recognition',
        parameters: {
          clickType: 'left_click',
          targetingMethod: 'image_recognition',
          templateImage: 'data:image/png;base64,<base64_encoded_image>',
          imageConfidenceThreshold: 0.8,
          captureScreenshot: true
        }
      },
      ocrTextClick: {
        description: 'Click on text found through OCR',
        parameters: {
          clickType: 'left_click',
          targetingMethod: 'ocr_text',
          ocrText: 'Submit',
          ocrLanguage: 'eng',
          ocrConfidenceThreshold: 0.7
        }
      },
      doubleClickWithModifiers: {
        description: 'Double-click while holding modifier keys',
        parameters: {
          clickType: 'double_click',
          targetingMethod: 'coordinates',
          coordinates: { x: 400, y: 250 },
          holdModifiers: ['ctrl'],
          postClickDelay: 1000
        }
      }
    }

    const documentation = {
      supportedClickTypes: ['left_click', 'right_click', 'double_click', 'middle_click'],
      targetingMethods: [
        {
          method: 'coordinates',
          description: 'Click at exact screen coordinates',
          requiredCapabilities: ['desktop-automation'],
          requiredFields: ['coordinates']
        },
        {
          method: 'image_recognition',
          description: 'Find and click on image matches',
          requiredCapabilities: ['desktop-automation', 'image-recognition'],
          requiredFields: ['templateImage']
        },
        {
          method: 'ocr_text',
          description: 'Find and click on text using OCR',
          requiredCapabilities: ['desktop-automation', 'ocr-processing'],
          requiredFields: ['ocrText']
        }
      ],
      tips: [
        'Use coordinate clicking for fastest execution when positions are known',
        'Image recognition is best for UI elements that might move slightly',
        'OCR text clicking is ideal for buttons and labels with text',
        'Set appropriate confidence thresholds to balance accuracy and reliability',
        'Enable screenshot capture for debugging failed operations'
      ]
    }

    return NextResponse.json({
      templates,
      documentation,
      schema: clickParametersSchema._def // Zod schema definition for reference
    })

  } catch (error) {
    logger.error('Error getting click operation templates:', error)
    return NextResponse.json(
      { error: 'Failed to get click operation templates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Export operation store for use by status endpoints
export { operationStore }