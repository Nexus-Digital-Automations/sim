/**
 * RPA Type Operation API Endpoint
 * 
 * Handles desktop text input operations with advanced typing simulation:
 * - Natural human-like typing with timing variations
 * - Multiple targeting methods for input focus
 * - Special key combinations and modifiers
 * - Clipboard integration and text clearing
 * 
 * Supports realistic typing speeds, key combinations, and post-typing actions
 * for comprehensive text input automation.
 * 
 * Endpoints:
 * - POST /api/rpa/operations/type - Execute type operation
 * - GET /api/rpa/operations/type - Get type operation templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { ratelimit } from '@/lib/ratelimit'
import { agentStore, agentAuthStore } from '@/app/api/rpa/agents/route'
import { 
  rpaTypeOperationSchema, 
  executeOperationRequestSchema,
  typeParametersSchema 
} from '@/socket-server/validation/rpa-schemas'
import type { 
  RPATypeOperation, 
  ExecuteOperationRequest, 
  ExecuteOperationResponse 
} from '@/types/rpa'
import crypto from 'crypto'

const logger = createLogger('RPATypeOperationAPI')

// Mock operation store (in production, use Redis or database queue)
const operationStore = new Map<string, RPATypeOperation>()

/**
 * Generate unique operation ID
 */
function generateOperationId(): string {
  return 'type-' + crypto.randomUUID()
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
  const textLength = parameters.text?.length || 0
  const typingSpeed = parameters.typingSpeed || 300 // CPM (characters per minute)
  
  // Calculate base typing time
  const baseTypingTime = (textLength / typingSpeed) * 60 * 1000 // Convert to milliseconds
  
  // Add time for targeting (if not using active element)
  let targetingTime = 0
  if (parameters.targetingMethod && parameters.targetingMethod !== 'active_element') {
    switch (parameters.targetingMethod) {
      case 'image_recognition':
        targetingTime = 3000
        break
      case 'ocr_text':
        targetingTime = 4000
        break
      case 'coordinates':
        targetingTime = 1000 // Time to focus on element
        break
    }
  }
  
  // Add time for special actions
  const clearTime = parameters.clearFirst ? 500 : 0
  const specialKeysTime = (parameters.specialKeys?.length || 0) * 100
  const modifierTime = (parameters.modifierKeys?.length || 0) * 100
  const postTypeDelay = parameters.postTypeDelay || 0
  
  // Add human typing variations if enabled
  const humanTypingMultiplier = parameters.humanTyping ? 1.3 : 1.0
  
  const totalTime = (baseTypingTime + targetingTime + clearTime + specialKeysTime + modifierTime + postTypeDelay) * humanTypingMultiplier
  
  return Math.max(totalTime, 1000) // Minimum 1 second
}

/**
 * POST /api/rpa/operations/type
 * Execute a type operation on the specified Desktop Agent
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/rpa/operations/type - Executing type operation')

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
      key: `rpa-type-operation-${user.id}`,
      requests: 30, // 30 type operations per minute
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      logger.warn('Type operation rate limit exceeded for user:', user.id)
      return NextResponse.json(
        { error: 'Too many type operations. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    logger.debug('Type operation request:', { 
      agentId: body.agentId,
      textLength: body.operation?.parameters?.text?.length || 0,
      targetingMethod: body.operation?.parameters?.targetingMethod,
      humanTyping: body.operation?.parameters?.humanTyping
    })

    // Validate the basic request structure
    const requestValidation = executeOperationRequestSchema.safeParse(body)
    if (!requestValidation.success) {
      logger.warn('Invalid type operation request structure:', requestValidation.error.errors)
      return NextResponse.json(
        { error: 'Invalid request structure', details: requestValidation.error.errors },
        { status: 400 }
      )
    }

    const { agentId, operation: operationData, workflowId, executionId } = requestValidation.data

    // Ensure operation type is type
    if (operationData.type !== 'type') {
      return NextResponse.json(
        { error: 'Invalid operation type. Expected "type".' },
        { status: 400 }
      )
    }

    // Validate type-specific parameters
    const parametersValidation = typeParametersSchema.safeParse(operationData.parameters)
    if (!parametersValidation.success) {
      logger.warn('Invalid type operation parameters:', parametersValidation.error.errors)
      return NextResponse.json(
        { error: 'Invalid type parameters', details: parametersValidation.error.errors },
        { status: 400 }
      )
    }

    const parameters = parametersValidation.data

    // Validate text length limits
    if (parameters.text.length > 10000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 10,000 characters allowed.' },
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

    // Check for clipboard capability if using clipboard features
    if (parameters.simulateKeyPress === false && !agent.capabilities.includes('clipboard-access')) {
      logger.warn('Agent does not support clipboard access, falling back to key simulation')
    }

    // Create type operation
    const operationId = generateOperationId()
    const now = new Date()
    const estimatedDuration = estimateOperationDuration(parameters)

    const typeOperation: RPATypeOperation = {
      id: operationId,
      type: 'type',
      agentId,
      workflowId,
      executionId,
      status: 'pending',
      priority: operationData.priority || 'normal',
      timeout: operationData.timeout || Math.max(estimatedDuration + 10000, 30000), // Add 10s buffer, min 30s
      maxRetries: operationData.maxRetries || 3,
      retryDelay: operationData.retryDelay || 1000,
      createdAt: now,
      parameters
    }

    // Store operation for tracking
    operationStore.set(operationId, typeOperation)

    // Update agent status to busy if it's currently idle
    if (agent.status === 'online') {
      agentStore.set(agentId, { ...agent, status: 'busy' })
    }

    logger.info('Type operation created successfully:', {
      operationId,
      agentId,
      userId: user.id,
      textLength: parameters.text.length,
      targetingMethod: parameters.targetingMethod || 'active_element',
      humanTyping: parameters.humanTyping,
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
      message: 'Type operation queued successfully. Text will be typed with specified parameters.',
      agentInfo: {
        id: agent.id,
        name: agent.name,
        status: agent.status
      },
      queuePosition: 1, // Mock queue position
      trackingUrl: `/api/rpa/operations/${operationId}/status`,
      operationDetails: {
        textLength: parameters.text.length,
        typingSpeed: parameters.typingSpeed || 300,
        humanTyping: parameters.humanTyping || false,
        clearFirst: parameters.clearFirst || false
      }
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
        
        logger.info('Type operation completed (simulated):', { 
          operationId, 
          agentId, 
          textLength: parameters.text.length 
        })
      }
    }, Math.min(estimatedDuration + Math.random() * 2000, 10000)) // Complete within reasonable time for simulation

    return NextResponse.json(response, { status: 202 }) // 202 Accepted for async operation

  } catch (error) {
    logger.error('Error executing type operation:', error)
    return NextResponse.json(
      { error: 'Failed to execute type operation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rpa/operations/type
 * Return type operation configuration templates and examples
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/rpa/operations/type - Getting type operation templates')

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
      key: `rpa-type-templates-${authResult.user.id}`,
      requests: 30,
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Return type operation templates and examples
    const templates = {
      basicTyping: {
        description: 'Type text into the currently focused element',
        parameters: {
          text: 'Hello, World!',
          targetingMethod: 'active_element'
        }
      },
      humanLikeTyping: {
        description: 'Type text with human-like timing variations',
        parameters: {
          text: 'This text will be typed naturally with realistic timing',
          humanTyping: true,
          typingSpeed: 250,
          postTypeDelay: 500
        }
      },
      formFilling: {
        description: 'Clear existing text and fill form field',
        parameters: {
          text: 'john.doe@example.com',
          clearFirst: true,
          targetingMethod: 'coordinates',
          coordinates: { x: 400, y: 300 },
          postTypeDelay: 200
        }
      },
      textWithSpecialKeys: {
        description: 'Type text followed by special key combinations',
        parameters: {
          text: 'Document content here',
          specialKeys: ['tab', 'enter'],
          modifierKeys: ['ctrl'],
          pressEnterAfter: true
        }
      },
      passwordEntry: {
        description: 'Secure password entry with no clipboard usage',
        parameters: {
          text: '${password}', // Variable placeholder
          targetingMethod: 'ocr_text',
          ocrText: 'Password',
          simulateKeyPress: true, // Force keystroke simulation
          postTypeDelay: 100
        }
      },
      fastDataEntry: {
        description: 'Fast typing for data entry scenarios',
        parameters: {
          text: 'BULK DATA ENTRY CONTENT',
          typingSpeed: 600, // Fast typing
          humanTyping: false,
          simulateKeyPress: false, // Use clipboard for speed
          clearFirst: true
        }
      }
    }

    const documentation = {
      targetingMethods: [
        {
          method: 'active_element',
          description: 'Type into currently focused input element',
          requiredCapabilities: ['desktop-automation'],
          notes: 'Fastest method when input is already focused'
        },
        {
          method: 'coordinates',
          description: 'Click at coordinates then type',
          requiredCapabilities: ['desktop-automation'],
          requiredFields: ['coordinates'],
          notes: 'Good for precise element targeting'
        },
        {
          method: 'image_recognition',
          description: 'Find input field by image then type',
          requiredCapabilities: ['desktop-automation', 'image-recognition'],
          requiredFields: ['templateImage'],
          notes: 'Best for finding form fields visually'
        },
        {
          method: 'ocr_text',
          description: 'Find input field by nearby text then type',
          requiredCapabilities: ['desktop-automation', 'ocr-processing'],
          requiredFields: ['ocrText'],
          notes: 'Good for finding fields by label text'
        }
      ],
      typingFeatures: {
        humanTyping: 'Adds realistic timing variations between keystrokes',
        typingSpeed: 'Characters per minute (50-2000), default is 300',
        clearFirst: 'Clear existing text before typing new content',
        simulateKeyPress: 'Use individual keystroke events vs clipboard paste',
        pressEnterAfter: 'Press Enter key after typing text',
        specialKeys: ['tab', 'enter', 'escape', 'backspace', 'delete'],
        modifierKeys: ['ctrl', 'alt', 'shift', 'meta']
      },
      tips: [
        'Use active_element targeting for fastest execution when field is already focused',
        'Enable humanTyping for realistic automation that avoids detection',
        'Set appropriate typing speed - too fast may cause issues with some applications',
        'Use clearFirst to ensure clean input when overwriting existing text',
        'simulateKeyPress: false uses clipboard for faster bulk text entry',
        'Add postTypeDelay to allow applications to process the input',
        'Use special keys and modifiers for complex input scenarios'
      ],
      security: [
        'Sensitive text like passwords should use simulateKeyPress: true',
        'Avoid logging actual text content in production systems',
        'Use variable placeholders for dynamic content',
        'Consider clearing clipboard after paste operations'
      ]
    }

    return NextResponse.json({
      templates,
      documentation,
      schema: typeParametersSchema._def, // Zod schema definition for reference
      limits: {
        maxTextLength: 10000,
        minTypingSpeed: 50,
        maxTypingSpeed: 2000,
        defaultTypingSpeed: 300
      }
    })

  } catch (error) {
    logger.error('Error getting type operation templates:', error)
    return NextResponse.json(
      { error: 'Failed to get type operation templates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Export operation store for use by status endpoints
export { operationStore }