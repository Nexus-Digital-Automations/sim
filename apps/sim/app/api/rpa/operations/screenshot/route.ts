/**
 * RPA Screenshot Operation API Endpoint
 * 
 * Handles desktop screenshot capture operations with advanced options:
 * - Multiple capture modes (fullscreen, window, region, monitor)
 * - Various image formats and quality settings
 * - Processing options (cursor, highlights, watermarks)
 * - File saving and base64 encoding
 * 
 * Supports comprehensive screenshot automation for documentation,
 * verification, and debugging purposes.
 * 
 * Endpoints:
 * - POST /api/rpa/operations/screenshot - Execute screenshot operation
 * - GET /api/rpa/operations/screenshot - Get screenshot operation templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'
import { ratelimit } from '@/lib/ratelimit'
import { agentStore, agentAuthStore } from '@/app/api/rpa/agents/route'
import { 
  rpaScreenshotOperationSchema, 
  executeOperationRequestSchema,
  screenshotParametersSchema 
} from '@/socket-server/validation/rpa-schemas'
import type { 
  RPAScreenshotOperation, 
  ExecuteOperationRequest, 
  ExecuteOperationResponse 
} from '@/types/rpa'
import crypto from 'crypto'

const logger = createLogger('RPAScreenshotOperationAPI')

// Mock operation store (in production, use Redis or database queue)
const operationStore = new Map<string, RPAScreenshotOperation>()

/**
 * Generate unique operation ID
 */
function generateOperationId(): string {
  return 'screenshot-' + crypto.randomUUID()
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
  if (!agent.capabilities.includes('screen-capture')) {
    return { error: 'Agent does not support screen capture', status: 409 }
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
 * Estimate operation duration and file size based on parameters
 */
function estimateOperationMetrics(parameters: any): { duration: number; estimatedFileSize: number } {
  // Base duration for screenshot capture
  let baseDuration = 1000 // 1 second base

  // Add time based on capture mode
  switch (parameters.captureMode) {
    case 'fullscreen':
      baseDuration += 1000 // Additional time for full screen
      break
    case 'active_window':
      baseDuration += 500
      break
    case 'custom_region':
      baseDuration += 300
      break
    case 'primary_monitor':
      baseDuration += 800
      break
  }

  // Add time for processing options
  if (parameters.includeMouseCursor) baseDuration += 200
  if (parameters.highlightClicks) baseDuration += 300
  if (parameters.addTimestamp) baseDuration += 200
  if (parameters.addWatermark) baseDuration += 400
  if (parameters.saveToFile) baseDuration += 500

  // Estimate file size (rough approximation)
  const screenResolution = parameters.region || { width: 1920, height: 1080 }
  const pixelCount = screenResolution.width * screenResolution.height
  
  let estimatedFileSize
  switch (parameters.format) {
    case 'png':
      estimatedFileSize = pixelCount * 3 // 3 bytes per pixel for PNG
      break
    case 'jpeg':
      const quality = parameters.quality || 85
      estimatedFileSize = (pixelCount * quality / 100) * 0.5 // JPEG compression approximation
      break
    case 'bmp':
      estimatedFileSize = pixelCount * 3 // Uncompressed
      break
    default:
      estimatedFileSize = pixelCount * 2 // Default estimate
  }

  return { 
    duration: baseDuration, 
    estimatedFileSize: Math.round(estimatedFileSize) 
  }
}

/**
 * POST /api/rpa/operations/screenshot
 * Execute a screenshot operation on the specified Desktop Agent
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/rpa/operations/screenshot - Executing screenshot operation')

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
      key: `rpa-screenshot-operation-${user.id}`,
      requests: 20, // 20 screenshot operations per minute
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      logger.warn('Screenshot operation rate limit exceeded for user:', user.id)
      return NextResponse.json(
        { error: 'Too many screenshot operations. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    logger.debug('Screenshot operation request:', { 
      agentId: body.agentId,
      captureMode: body.operation?.parameters?.captureMode,
      format: body.operation?.parameters?.format,
      saveToFile: body.operation?.parameters?.saveToFile
    })

    // Validate the basic request structure
    const requestValidation = executeOperationRequestSchema.safeParse(body)
    if (!requestValidation.success) {
      logger.warn('Invalid screenshot operation request structure:', requestValidation.error.errors)
      return NextResponse.json(
        { error: 'Invalid request structure', details: requestValidation.error.errors },
        { status: 400 }
      )
    }

    const { agentId, operation: operationData, workflowId, executionId } = requestValidation.data

    // Ensure operation type is screenshot
    if (operationData.type !== 'screenshot') {
      return NextResponse.json(
        { error: 'Invalid operation type. Expected "screenshot".' },
        { status: 400 }
      )
    }

    // Validate screenshot-specific parameters
    const parametersValidation = screenshotParametersSchema.safeParse(operationData.parameters)
    if (!parametersValidation.success) {
      logger.warn('Invalid screenshot operation parameters:', parametersValidation.error.errors)
      return NextResponse.json(
        { error: 'Invalid screenshot parameters', details: parametersValidation.error.errors },
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

    // Additional capability checks
    if (parameters.saveToFile && !agent.capabilities.includes('file-operations')) {
      logger.warn('Agent does not support file operations, screenshot will only return base64 data')
    }

    // Validate file path if saving to file
    if (parameters.saveToFile && parameters.filePath) {
      // Basic path validation (in production, implement more thorough validation)
      const invalidChars = /[<>:"|?*]/
      if (invalidChars.test(parameters.filePath)) {
        return NextResponse.json(
          { error: 'Invalid file path. Contains forbidden characters.' },
          { status: 400 }
        )
      }
    }

    // Calculate operation metrics
    const metrics = estimateOperationMetrics(parameters)

    // Create screenshot operation
    const operationId = generateOperationId()
    const now = new Date()

    const screenshotOperation: RPAScreenshotOperation = {
      id: operationId,
      type: 'screenshot',
      agentId,
      workflowId,
      executionId,
      status: 'pending',
      priority: operationData.priority || 'normal',
      timeout: operationData.timeout || 30000, // Default 30 seconds
      maxRetries: operationData.maxRetries || 2, // Screenshots usually don't need many retries
      retryDelay: operationData.retryDelay || 1000,
      createdAt: now,
      parameters
    }

    // Store operation for tracking
    operationStore.set(operationId, screenshotOperation)

    // Update agent status to busy if it's currently idle
    if (agent.status === 'online') {
      agentStore.set(agentId, { ...agent, status: 'busy' })
    }

    logger.info('Screenshot operation created successfully:', {
      operationId,
      agentId,
      userId: user.id,
      captureMode: parameters.captureMode,
      format: parameters.format || 'png',
      estimatedFileSize: metrics.estimatedFileSize,
      estimatedDuration: metrics.duration,
      saveToFile: parameters.saveToFile
    })

    // Prepare response
    const response: ExecuteOperationResponse = {
      operationId,
      status: 'queued',
      estimatedDuration: metrics.duration,
      message: 'Screenshot operation queued successfully. Image will be captured with specified parameters.',
      agentInfo: {
        id: agent.id,
        name: agent.name,
        status: agent.status
      },
      queuePosition: 1, // Mock queue position
      trackingUrl: `/api/rpa/operations/${operationId}/status`,
      operationDetails: {
        captureMode: parameters.captureMode,
        format: parameters.format || 'png',
        estimatedFileSize: metrics.estimatedFileSize,
        region: parameters.region,
        saveToFile: parameters.saveToFile,
        fileName: parameters.fileName
      }
    }

    // Simulate async operation execution
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
        
        logger.info('Screenshot operation completed (simulated):', { 
          operationId, 
          agentId,
          captureMode: parameters.captureMode
        })
      }
    }, Math.min(metrics.duration + Math.random() * 1000, 8000)) // Complete within reasonable time

    return NextResponse.json(response, { status: 202 }) // 202 Accepted for async operation

  } catch (error) {
    logger.error('Error executing screenshot operation:', error)
    return NextResponse.json(
      { error: 'Failed to execute screenshot operation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rpa/operations/screenshot
 * Return screenshot operation configuration templates and examples
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('GET /api/rpa/operations/screenshot - Getting screenshot operation templates')

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
      key: `rpa-screenshot-templates-${authResult.user.id}`,
      requests: 30,
      window: 60 * 1000,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Return screenshot operation templates and examples
    const templates = {
      fullScreenCapture: {
        description: 'Capture entire screen with high quality',
        parameters: {
          captureMode: 'fullscreen',
          format: 'png',
          includeMouseCursor: false,
          addTimestamp: true
        }
      },
      activeWindowCapture: {
        description: 'Capture currently active window',
        parameters: {
          captureMode: 'active_window',
          format: 'png',
          includeMouseCursor: true,
          highlightClicks: false
        }
      },
      customRegionCapture: {
        description: 'Capture specific screen region',
        parameters: {
          captureMode: 'custom_region',
          region: { x: 100, y: 100, width: 800, height: 600 },
          format: 'jpeg',
          quality: 85,
          addWatermark: false
        }
      },
      multiMonitorCapture: {
        description: 'Capture specific monitor in multi-monitor setup',
        parameters: {
          captureMode: 'primary_monitor',
          monitorIndex: 0,
          format: 'png',
          saveToFile: true,
          fileName: 'monitor_capture.png'
        }
      },
      documentationScreenshot: {
        description: 'High-quality screenshot for documentation',
        parameters: {
          captureMode: 'active_window',
          format: 'png',
          includeMouseCursor: false,
          addTimestamp: true,
          addWatermark: true,
          saveToFile: true,
          fileName: 'documentation_screenshot.png'
        }
      },
      debugScreenshot: {
        description: 'Screenshot for debugging with all visual aids',
        parameters: {
          captureMode: 'fullscreen',
          format: 'png',
          includeMouseCursor: true,
          highlightClicks: true,
          addTimestamp: true,
          saveToFile: true,
          fileName: 'debug_screenshot.png'
        }
      }
    }

    const documentation = {
      captureModes: [
        {
          mode: 'fullscreen',
          description: 'Capture entire desktop including all monitors',
          requiredCapabilities: ['screen-capture'],
          notes: 'Best for complete system documentation'
        },
        {
          mode: 'active_window',
          description: 'Capture currently focused window',
          requiredCapabilities: ['screen-capture'],
          notes: 'Good for application-specific screenshots'
        },
        {
          mode: 'custom_region',
          description: 'Capture specific rectangular region',
          requiredCapabilities: ['screen-capture'],
          requiredFields: ['region'],
          notes: 'Precise control over captured area'
        },
        {
          mode: 'primary_monitor',
          description: 'Capture specific monitor by index',
          requiredCapabilities: ['screen-capture'],
          optionalFields: ['monitorIndex'],
          notes: 'Useful for multi-monitor setups'
        }
      ],
      formats: {
        png: {
          description: 'Lossless compression, best quality',
          pros: ['No quality loss', 'Transparent backgrounds', 'Sharp text'],
          cons: ['Larger file sizes'],
          recommendedFor: ['UI screenshots', 'Documentation', 'Text-heavy content']
        },
        jpeg: {
          description: 'Lossy compression, configurable quality',
          pros: ['Smaller file sizes', 'Good for photos'],
          cons: ['Quality loss', 'No transparency'],
          recommendedFor: ['Photo content', 'Large images', 'Web use'],
          qualityRange: '1-100, default 85'
        },
        bmp: {
          description: 'Uncompressed bitmap format',
          pros: ['No compression artifacts', 'Fast to create'],
          cons: ['Very large files', 'Limited compatibility'],
          recommendedFor: ['Raw image processing', 'Temporary files']
        }
      },
      processingOptions: {
        includeMouseCursor: 'Show mouse cursor in screenshot',
        highlightClicks: 'Add visual indicators for recent clicks',
        addTimestamp: 'Add timestamp overlay to image',
        addWatermark: 'Add configurable watermark',
        saveToFile: 'Save to local file in addition to returning base64'
      },
      tips: [
        'Use PNG for UI screenshots and documentation',
        'Use JPEG with quality 80-90 for general screenshots',
        'Custom regions are faster and create smaller files',
        'Include mouse cursor for debugging click issues',
        'Add timestamps for sequential screenshot documentation',
        'Save to file for large images to avoid memory issues',
        'Test monitor indices in multi-monitor setups'
      ],
      limits: {
        maxImageSize: '50MB (estimated)',
        maxRegionSize: '7680x4320 (8K resolution)',
        supportedMonitors: '0-7 (8 monitors max)',
        jpegQualityRange: '1-100',
        fileNameMaxLength: 255
      }
    }

    return NextResponse.json({
      templates,
      documentation,
      schema: screenshotParametersSchema._def, // Zod schema definition for reference
      supportedFormats: ['png', 'jpeg', 'bmp'],
      defaultSettings: {
        format: 'png',
        quality: 85,
        includeMouseCursor: false,
        addTimestamp: false,
        addWatermark: false,
        saveToFile: false
      }
    })

  } catch (error) {
    logger.error('Error getting screenshot operation templates:', error)
    return NextResponse.json(
      { error: 'Failed to get screenshot operation templates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Export operation store for use by status endpoints
export { operationStore }