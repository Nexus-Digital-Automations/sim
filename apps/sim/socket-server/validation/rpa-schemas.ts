/**
 * RPA Zod Validation Schemas
 * 
 * Comprehensive validation schemas for all RPA operations, agent communications,
 * and Socket.io event payloads. These schemas ensure type safety and data integrity
 * across the entire RPA system.
 * 
 * Used by:
 * - API endpoints for request validation
 * - Socket.io handlers for event payload validation
 * - Database operations for data consistency
 * - Client-server communication validation
 */

import { z } from 'zod'

// ========================
// BASE VALIDATION SCHEMAS
// ========================

/**
 * Agent Capability Schema
 * Defines the types of RPA operations an agent can perform
 */
export const agentCapabilitySchema = z.enum([
  'desktop-automation',
  'image-recognition',
  'ocr-processing', 
  'screen-capture',
  'mouse-keyboard',
  'accessibility-api',
  'window-management',
  'file-operations',
  'clipboard-access'
])

/**
 * Platform Schema
 * Supported operating systems for Desktop Agents
 */
export const platformSchema = z.enum(['windows', 'macos', 'linux'])

/**
 * Operation Status Schema
 * Lifecycle states for RPA operations
 */
export const operationStatusSchema = z.enum([
  'pending',
  'running', 
  'completed',
  'failed',
  'cancelled'
])

/**
 * Priority Level Schema
 * Priority levels for operation and workflow execution
 */
export const prioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])

/**
 * Coordinate Schema
 * Screen coordinate validation
 */
export const coordinateSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0)
})

/**
 * Region Schema  
 * Screen region validation
 */
export const regionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive()
})

/**
 * Base64 Image Schema
 * Validates base64 encoded images with data URI format
 */
export const base64ImageSchema = z.string().regex(
  /^data:image\/(png|jpeg|jpg|bmp);base64,/,
  'Must be a valid base64 image data URI'
)

// ========================
// AGENT SCHEMAS
// ========================

/**
 * Agent Metadata Schema
 * Additional information about the Desktop Agent
 */
export const agentMetadataSchema = z.object({
  hostname: z.string().min(1),
  ip: z.string().ip().optional(),
  userAgent: z.string().min(1),
  screenResolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }).optional(),
  availableEngines: z.array(z.string()).min(1)
})

/**
 * Agent Registration Schema
 * Validates new agent registration requests
 */
export const agentRegistrationSchema = z.object({
  name: z.string().min(1).max(100),
  platform: platformSchema,
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semantic version (e.g., 1.0.0)'),
  capabilities: z.array(agentCapabilitySchema).min(1),
  metadata: agentMetadataSchema
})

/**
 * Agent Authentication Schema
 * Validates agent authentication data
 */
export const agentAuthSchema = z.object({
  apiKey: z.string().min(32).max(128),
  agentId: z.string().uuid(),
  userId: z.string().min(1),
  workspaceId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional()
})

/**
 * Agent Status Schema
 * Validates agent status updates
 */
export const agentStatusSchema = z.enum(['online', 'offline', 'busy', 'error'])

/**
 * Agent Metrics Schema
 * Validates agent performance metrics
 */
export const agentMetricsSchema = z.object({
  agentId: z.string().uuid(),
  timestamp: z.date(),
  cpuUsage: z.number().min(0).max(100),
  memoryUsage: z.number().min(0).max(100),
  activeOperations: z.number().int().min(0),
  totalOperationsCompleted: z.number().int().min(0),
  averageResponseTime: z.number().positive(),
  errorRate: z.number().min(0).max(100),
  lastError: z.string().optional()
})

// ========================
// OPERATION PARAMETER SCHEMAS
// ========================

/**
 * Click Operation Parameters Schema
 */
export const clickParametersSchema = z.object({
  clickType: z.enum(['left_click', 'right_click', 'double_click', 'middle_click']),
  targetingMethod: z.enum(['coordinates', 'image_recognition', 'ocr_text']),
  
  // Coordinate targeting
  coordinates: coordinateSchema.optional(),
  
  // Image recognition targeting  
  templateImage: base64ImageSchema.optional(),
  imageConfidenceThreshold: z.number().min(0.1).max(1.0).optional(),
  
  // OCR text targeting
  ocrText: z.string().min(1).optional(),
  ocrLanguage: z.string().length(3).default('eng').optional(),
  ocrConfidenceThreshold: z.number().min(0.1).max(1.0).optional(),
  
  // Common options
  searchRegion: regionSchema.optional(),
  holdModifiers: z.array(z.enum(['ctrl', 'alt', 'shift', 'meta'])).optional(),
  postClickDelay: z.number().int().min(0).max(10000).optional(),
  captureScreenshot: z.boolean().optional()
}).refine((data) => {
  // Ensure required fields are present based on targeting method
  if (data.targetingMethod === 'coordinates' && !data.coordinates) {
    return false
  }
  if (data.targetingMethod === 'image_recognition' && !data.templateImage) {
    return false
  }
  if (data.targetingMethod === 'ocr_text' && !data.ocrText) {
    return false
  }
  return true
}, {
  message: 'Missing required parameters for selected targeting method'
})

/**
 * Type Operation Parameters Schema
 */
export const typeParametersSchema = z.object({
  text: z.string().min(1).max(10000),
  targetingMethod: z.enum(['active_element', 'coordinates', 'image_recognition', 'ocr_text']).optional(),
  
  // Optional targeting
  coordinates: coordinateSchema.optional(),
  templateImage: base64ImageSchema.optional(),
  ocrText: z.string().min(1).optional(),
  ocrLanguage: z.string().length(3).default('eng').optional(),
  
  // Typing behavior
  typingSpeed: z.number().int().min(50).max(2000).optional(), // CPM
  humanTyping: z.boolean().optional(),
  clearFirst: z.boolean().optional(),
  pressEnterAfter: z.boolean().optional(),
  
  // Special keys
  specialKeys: z.array(z.enum(['tab', 'enter', 'escape', 'backspace', 'delete'])).optional(),
  modifierKeys: z.array(z.enum(['ctrl', 'alt', 'shift', 'meta'])).optional(),
  
  // Advanced options
  simulateKeyPress: z.boolean().optional(),
  postTypeDelay: z.number().int().min(0).max(5000).optional()
})

/**
 * Extract Operation Parameters Schema
 */
export const extractParametersSchema = z.object({
  extractionMethod: z.enum(['ocr', 'accessibility', 'clipboard', 'selected_text']),
  regionMode: z.enum(['fullscreen', 'custom', 'window', 'active_element']),
  
  // Custom region
  region: regionSchema.optional(),
  
  // OCR specific options
  ocrLanguage: z.string().length(3).default('eng').optional(),
  ocrEngine: z.enum(['tesseract', 'windows_ocr', 'macos_vision']).optional(),
  preprocessImage: z.boolean().optional(),
  
  // Text processing
  cleanupWhitespace: z.boolean().optional(),
  removeLineBreaks: z.boolean().optional(),
  filterPattern: z.string().optional(), // Regex pattern
  extractNumbers: z.boolean().optional(),
  extractEmails: z.boolean().optional(),
  extractUrls: z.boolean().optional(),
  
  // Accessibility options
  elementType: z.string().optional(),
  elementAttribute: z.string().optional()
}).refine((data) => {
  if (data.regionMode === 'custom' && !data.region) {
    return false
  }
  return true
}, {
  message: 'Custom region required when regionMode is custom'
})

/**
 * Screenshot Operation Parameters Schema
 */
export const screenshotParametersSchema = z.object({
  captureMode: z.enum(['fullscreen', 'custom_region', 'active_window', 'primary_monitor']),
  
  // Custom region capture
  region: regionSchema.optional(),
  
  // Image format and quality
  format: z.enum(['png', 'jpeg', 'bmp']).optional(),
  quality: z.number().int().min(1).max(100).optional(), // JPEG quality
  
  // Processing options
  includeMouseCursor: z.boolean().optional(),
  highlightClicks: z.boolean().optional(),
  addTimestamp: z.boolean().optional(),
  addWatermark: z.boolean().optional(),
  
  // Multiple monitor handling
  monitorIndex: z.number().int().min(0).optional(),
  
  // File handling
  saveToFile: z.boolean().optional(),
  fileName: z.string().max(255).optional(),
  filePath: z.string().max(1000).optional()
}).refine((data) => {
  if (data.captureMode === 'custom_region' && !data.region) {
    return false
  }
  if (data.saveToFile && !data.fileName) {
    return false
  }
  return true
}, {
  message: 'Missing required parameters for selected capture mode or file saving'
})

/**
 * Wait Operation Parameters Schema
 */
export const waitParametersSchema = z.object({
  waitType: z.enum(['fixed_delay', 'element_appears', 'element_disappears', 'image_appears', 'image_disappears', 'text_appears', 'text_disappears', 'condition']),
  
  // Fixed delay
  duration: z.number().int().min(100).max(300000).optional(), // 100ms to 5 minutes
  
  // Element/image/text waiting
  targetingMethod: z.enum(['coordinates', 'image_recognition', 'ocr_text']).optional(),
  templateImage: base64ImageSchema.optional(),
  ocrText: z.string().min(1).optional(),
  ocrLanguage: z.string().length(3).default('eng').optional(),
  coordinates: coordinateSchema.optional(),
  
  // Search parameters
  searchRegion: regionSchema.optional(),
  confidenceThreshold: z.number().min(0.1).max(1.0).optional(),
  
  // Polling configuration
  checkInterval: z.number().int().min(100).max(10000).optional(),
  maxWaitTime: z.number().int().min(1000).max(300000).optional(), // 1s to 5 minutes
  
  // Custom condition
  customCondition: z.string().optional(),
  conditionTimeout: z.number().int().min(1000).max(300000).optional()
}).refine((data) => {
  if (data.waitType === 'fixed_delay' && !data.duration) {
    return false
  }
  if (data.waitType.includes('image') && !data.templateImage) {
    return false
  }
  if (data.waitType.includes('text') && !data.ocrText) {
    return false
  }
  if (data.waitType === 'condition' && !data.customCondition) {
    return false
  }
  return true
}, {
  message: 'Missing required parameters for selected wait type'
})

/**
 * Find Element Operation Parameters Schema
 */
export const findElementParametersSchema = z.object({
  searchMethod: z.enum(['image_recognition', 'ocr_text', 'accessibility', 'color_detection', 'template_matching']),
  
  // Image recognition
  templateImage: base64ImageSchema.optional(),
  imageConfidenceThreshold: z.number().min(0.1).max(1.0).optional(),
  
  // OCR text search
  searchText: z.string().min(1).optional(),
  ocrLanguage: z.string().length(3).default('eng').optional(),
  textMatchMode: z.enum(['exact', 'contains', 'regex', 'fuzzy']).optional(),
  textConfidenceThreshold: z.number().min(0.1).max(1.0).optional(),
  
  // Accessibility search
  accessibilityRole: z.string().optional(),
  accessibilityName: z.string().optional(),
  accessibilityValue: z.string().optional(),
  
  // Color detection
  targetColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color').optional(),
  colorTolerance: z.number().min(0).max(100).optional(),
  
  // Search parameters
  searchRegion: regionSchema.optional(),
  returnStrategy: z.enum(['first', 'best', 'all', 'largest', 'smallest']),
  maxResults: z.number().int().min(1).max(100).optional(),
  
  // Advanced options
  scaleInvariant: z.boolean().optional(),
  rotationInvariant: z.boolean().optional(),
  preprocessImage: z.boolean().optional()
}).refine((data) => {
  if (data.searchMethod === 'image_recognition' && !data.templateImage) {
    return false
  }
  if (data.searchMethod === 'ocr_text' && !data.searchText) {
    return false
  }
  if (data.searchMethod === 'color_detection' && !data.targetColor) {
    return false
  }
  return true
}, {
  message: 'Missing required parameters for selected search method'
})

// ========================
// OPERATION SCHEMAS
// ========================

/**
 * Base RPA Operation Schema
 */
export const baseRPAOperationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['click', 'type', 'extract', 'screenshot', 'wait', 'find-element']),
  agentId: z.string().uuid(),
  workflowId: z.string().uuid().optional(),
  executionId: z.string().uuid().optional(),
  status: operationStatusSchema,
  priority: prioritySchema,
  timeout: z.number().int().min(1000).max(300000), // 1s to 5 minutes
  maxRetries: z.number().int().min(0).max(10),
  retryDelay: z.number().int().min(100).max(10000), // 100ms to 10s
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  error: z.string().optional()
})

/**
 * RPA Click Operation Schema
 */
export const rpaClickOperationSchema = baseRPAOperationSchema.extend({
  type: z.literal('click'),
  parameters: clickParametersSchema
})

/**
 * RPA Type Operation Schema
 */
export const rpaTypeOperationSchema = baseRPAOperationSchema.extend({
  type: z.literal('type'),
  parameters: typeParametersSchema
})

/**
 * RPA Extract Operation Schema
 */
export const rpaExtractOperationSchema = baseRPAOperationSchema.extend({
  type: z.literal('extract'),
  parameters: extractParametersSchema
})

/**
 * RPA Screenshot Operation Schema
 */
export const rpaScreenshotOperationSchema = baseRPAOperationSchema.extend({
  type: z.literal('screenshot'),
  parameters: screenshotParametersSchema
})

/**
 * RPA Wait Operation Schema
 */
export const rpaWaitOperationSchema = baseRPAOperationSchema.extend({
  type: z.literal('wait'),
  parameters: waitParametersSchema
})

/**
 * RPA Find Element Operation Schema
 */
export const rpaFindElementOperationSchema = baseRPAOperationSchema.extend({
  type: z.literal('find-element'),
  parameters: findElementParametersSchema
})

/**
 * Union schema for all RPA operations
 */
export const rpaOperationSchema = z.discriminatedUnion('type', [
  rpaClickOperationSchema,
  rpaTypeOperationSchema,
  rpaExtractOperationSchema,
  rpaScreenshotOperationSchema,
  rpaWaitOperationSchema,
  rpaFindElementOperationSchema
])

// ========================
// RESULT SCHEMAS
// ========================

/**
 * RPA Click Result Schema
 */
export const rpaClickResultSchema = z.object({
  success: z.boolean(),
  action: z.string(),
  target: z.object({
    method: z.string(),
    coordinates: coordinateSchema.optional(),
    imageMatch: z.object({
      confidence: z.number().min(0).max(1),
      region: regionSchema
    }).optional(),
    ocrMatch: z.object({
      text: z.string(),
      confidence: z.number().min(0).max(1),
      region: regionSchema
    }).optional()
  }),
  screenshot: base64ImageSchema.optional(),
  executionTime: z.number().positive(),
  timestamp: z.date(),
  error: z.string().optional()
})

/**
 * RPA Type Result Schema
 */
export const rpaTypeResultSchema = z.object({
  success: z.boolean(),
  text: z.string(),
  target: z.object({
    method: z.string(),
    coordinates: coordinateSchema.optional(),
    element: z.string().optional()
  }).optional(),
  charactersTyped: z.number().int().min(0),
  executionTime: z.number().positive(),
  timestamp: z.date(),
  error: z.string().optional()
})

/**
 * RPA Extract Result Schema
 */
export const rpaExtractResultSchema = z.object({
  success: z.boolean(),
  extractedText: z.string(),
  method: z.string(),
  region: regionSchema,
  confidence: z.number().min(0).max(1).optional(),
  processedData: z.object({
    numbers: z.array(z.string()).optional(),
    emails: z.array(z.string().email()).optional(),
    urls: z.array(z.string().url()).optional()
  }).optional(),
  executionTime: z.number().positive(),
  timestamp: z.date(),
  error: z.string().optional()
})

/**
 * RPA Screenshot Result Schema
 */
export const rpaScreenshotResultSchema = z.object({
  success: z.boolean(),
  imageData: base64ImageSchema,
  format: z.enum(['png', 'jpeg', 'bmp']),
  dimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }),
  fileSize: z.number().int().positive(),
  filePath: z.string().optional(),
  captureRegion: regionSchema,
  executionTime: z.number().positive(),
  timestamp: z.date(),
  error: z.string().optional()
})

/**
 * RPA Wait Result Schema
 */
export const rpaWaitResultSchema = z.object({
  success: z.boolean(),
  waitType: z.string(),
  condition: z.string(),
  actualWaitTime: z.number().min(0),
  conditionMet: z.boolean(),
  target: z.object({
    method: z.string(),
    coordinates: coordinateSchema.optional(),
    found: z.boolean(),
    confidence: z.number().min(0).max(1).optional()
  }).optional(),
  executionTime: z.number().positive(),
  timestamp: z.date(),
  error: z.string().optional()
})

/**
 * RPA Find Element Result Schema
 */
export const rpaFindElementResultSchema = z.object({
  success: z.boolean(),
  method: z.string(),
  elements: z.array(z.object({
    coordinates: coordinateSchema,
    region: regionSchema,
    confidence: z.number().min(0).max(1),
    metadata: z.object({
      text: z.string().optional(),
      color: z.string().optional(),
      accessibilityInfo: z.record(z.any()).optional()
    }).optional()
  })),
  searchRegion: regionSchema,
  totalFound: z.number().int().min(0),
  executionTime: z.number().positive(),
  timestamp: z.date(),
  error: z.string().optional()
})

// ========================
// WORKFLOW SCHEMAS
// ========================

/**
 * Workflow Execution Configuration Schema
 */
export const workflowConfigSchema = z.object({
  continueOnError: z.boolean().default(false),
  maxRetries: z.number().int().min(0).max(10).default(3),
  retryDelay: z.number().int().min(100).max(10000).default(1000),
  screenshotOnError: z.boolean().default(true),
  pauseOnError: z.boolean().default(false),
  notifyOnCompletion: z.boolean().default(true)
})

/**
 * RPA Workflow Execution Schema
 */
export const rpaWorkflowExecutionSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  workflowName: z.string().min(1).max(200),
  agentId: z.string().uuid(),
  userId: z.string().min(1),
  status: z.enum(['pending', 'running', 'paused', 'completed', 'failed', 'cancelled']),
  priority: prioritySchema,
  
  operations: z.array(rpaOperationSchema),
  currentOperationIndex: z.number().int().min(0),
  totalOperations: z.number().int().min(0),
  completedOperations: z.number().int().min(0),
  failedOperations: z.number().int().min(0),
  
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  estimatedDuration: z.number().int().positive().optional(),
  actualDuration: z.number().int().positive().optional(),
  
  config: workflowConfigSchema,
  
  variables: z.record(z.any()),
  context: z.record(z.any()),
  error: z.string().optional()
})

// ========================
// SOCKET EVENT SCHEMAS
// ========================

/**
 * Agent Registration Event Schema
 */
export const agentRegisterEventSchema = z.object({
  agentInfo: agentRegistrationSchema,
  auth: agentAuthSchema
})

/**
 * Agent Heartbeat Event Schema
 */
export const agentHeartbeatEventSchema = z.object({
  agentId: z.string().uuid(),
  metrics: agentMetricsSchema.partial()
})

/**
 * Operation Execute Event Schema
 */
export const operationExecuteEventSchema = z.object({
  operation: rpaOperationSchema
})

/**
 * Operation Progress Event Schema
 */
export const operationProgressEventSchema = z.object({
  operationId: z.string().uuid(),
  progress: z.number().min(0).max(100),
  message: z.string().optional()
})

/**
 * Operation Complete Event Schema
 */
export const operationCompleteEventSchema = z.object({
  operationId: z.string().uuid(),
  result: z.union([
    rpaClickResultSchema,
    rpaTypeResultSchema,
    rpaExtractResultSchema,
    rpaScreenshotResultSchema,
    rpaWaitResultSchema,
    rpaFindElementResultSchema
  ])
})

/**
 * Workflow Start Event Schema
 */
export const workflowStartEventSchema = z.object({
  execution: rpaWorkflowExecutionSchema
})

// ========================
// API REQUEST SCHEMAS
// ========================

/**
 * Execute Operation API Request Schema
 */
export const executeOperationRequestSchema = z.object({
  agentId: z.string().uuid(),
  operation: rpaOperationSchema.omit({ id: true, status: true, createdAt: true }),
  workflowId: z.string().uuid().optional(),
  executionId: z.string().uuid().optional()
})

/**
 * Execute Workflow API Request Schema
 */
export const executeWorkflowRequestSchema = z.object({
  agentId: z.string().uuid(),
  workflowId: z.string().uuid(),
  operations: z.array(rpaOperationSchema.omit({ id: true, agentId: true, status: true, createdAt: true })).min(1),
  config: workflowConfigSchema.optional(),
  variables: z.record(z.any()).optional()
})

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Factory function to create agent registration schema
 * Allows for runtime customization of validation rules
 */
export function createAgentRegistrationSchema(options?: {
  maxNameLength?: number
  requiredCapabilities?: number
  allowedEngines?: string[]
}) {
  const maxNameLength = options?.maxNameLength || 100
  const requiredCapabilities = options?.requiredCapabilities || 1
  const allowedEngines = options?.allowedEngines
  
  let schema = z.object({
    name: z.string().min(1).max(maxNameLength),
    platform: platformSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semantic version'),
    capabilities: z.array(agentCapabilitySchema).min(requiredCapabilities),
    metadata: agentMetadataSchema
  })
  
  if (allowedEngines) {
    schema = schema.extend({
      metadata: agentMetadataSchema.extend({
        availableEngines: z.array(z.enum(allowedEngines as [string, ...string[]]))
      })
    })
  }
  
  return schema
}

/**
 * Factory function to create RPA operation schema
 * Allows for operation-specific validation customization
 */
export function createRPAOperationSchema(operationType?: string) {
  if (!operationType) {
    return rpaOperationSchema
  }
  
  switch (operationType) {
    case 'click':
      return rpaClickOperationSchema
    case 'type':
      return rpaTypeOperationSchema
    case 'extract':
      return rpaExtractOperationSchema
    case 'screenshot':
      return rpaScreenshotOperationSchema
    case 'wait':
      return rpaWaitOperationSchema
    case 'find-element':
      return rpaFindElementOperationSchema
    default:
      return rpaOperationSchema
  }
}

/**
 * Factory function to create workflow execution schema
 * Allows for customization based on workflow requirements
 */
export function createWorkflowExecutionSchema(options?: {
  maxOperations?: number
  requiresApproval?: boolean
  allowedStatuses?: string[]
}) {
  const maxOperations = options?.maxOperations || 1000
  const requiresApproval = options?.requiresApproval || false
  
  let schema = rpaWorkflowExecutionSchema
  
  if (maxOperations > 0) {
    schema = schema.extend({
      operations: z.array(rpaOperationSchema).max(maxOperations),
      totalOperations: z.number().int().min(0).max(maxOperations)
    })
  }
  
  if (requiresApproval) {
    schema = schema.extend({
      status: z.enum(['pending', 'awaiting_approval', 'running', 'paused', 'completed', 'failed', 'cancelled']),
      approvedBy: z.string().optional(),
      approvedAt: z.date().optional()
    })
  }
  
  return schema
}

// Export all schemas for use in the application
export {
  // Base schemas
  agentCapabilitySchema,
  platformSchema,
  operationStatusSchema,
  prioritySchema,
  coordinateSchema,
  regionSchema,
  base64ImageSchema,
  
  // Agent schemas
  agentRegistrationSchema,
  agentAuthSchema,
  agentStatusSchema,
  agentMetricsSchema,
  agentMetadataSchema,
  
  // Operation schemas
  rpaOperationSchema,
  rpaClickOperationSchema,
  rpaTypeOperationSchema,
  rpaExtractOperationSchema,
  rpaScreenshotOperationSchema,
  rpaWaitOperationSchema,
  rpaFindElementOperationSchema,
  
  // Parameter schemas
  clickParametersSchema,
  typeParametersSchema,
  extractParametersSchema,
  screenshotParametersSchema,
  waitParametersSchema,
  findElementParametersSchema,
  
  // Result schemas
  rpaClickResultSchema,
  rpaTypeResultSchema,
  rpaExtractResultSchema,
  rpaScreenshotResultSchema,
  rpaWaitResultSchema,
  rpaFindElementResultSchema,
  
  // Workflow schemas
  rpaWorkflowExecutionSchema,
  workflowConfigSchema,
  
  // Socket event schemas
  agentRegisterEventSchema,
  agentHeartbeatEventSchema,
  operationExecuteEventSchema,
  operationProgressEventSchema,
  operationCompleteEventSchema,
  workflowStartEventSchema,
  
  // API request schemas
  executeOperationRequestSchema,
  executeWorkflowRequestSchema
}