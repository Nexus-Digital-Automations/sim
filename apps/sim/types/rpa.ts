/**
 * RPA (Robotic Process Automation) Types and Interfaces
 * 
 * Comprehensive type definitions for RPA operations, Desktop Agent communication,
 * and workflow integration within the Sim platform.
 * 
 * This module defines the contract between:
 * - Sim ReactFlow RPA blocks
 * - Server-side RPA API endpoints  
 * - Desktop Agent Socket.io client
 * - Real-time workflow execution engine
 */

import type { z } from 'zod'

// ========================
// DESKTOP AGENT TYPES
// ========================

/**
 * Desktop Agent Connection Information
 * Defines the structure for managing Desktop Agent connections
 */
export interface DesktopAgent {
  id: string
  name: string
  status: 'online' | 'offline' | 'busy' | 'error'
  platform: 'windows' | 'macos' | 'linux'
  version: string
  capabilities: AgentCapability[]
  connectionId: string // Socket.io connection ID
  lastHeartbeat: Date
  metadata: {
    hostname: string
    ip: string
    userAgent: string
    screenResolution?: { width: number; height: number }
    availableEngines: string[]
  }
}

/**
 * Agent Capabilities - What RPA operations the agent supports
 */
export type AgentCapability = 
  | 'desktop-automation'
  | 'image-recognition' 
  | 'ocr-processing'
  | 'screen-capture'
  | 'mouse-keyboard'
  | 'accessibility-api'
  | 'window-management'
  | 'file-operations'
  | 'clipboard-access'

/**
 * Agent Authentication and Registration
 */
export interface AgentAuth {
  apiKey: string
  agentId: string
  userId: string
  workspaceId?: string
  organizationId?: string
}

/**
 * Agent Health and Performance Metrics
 */
export interface AgentMetrics {
  agentId: string
  timestamp: Date
  cpuUsage: number
  memoryUsage: number
  activeOperations: number
  totalOperationsCompleted: number
  averageResponseTime: number
  errorRate: number
  lastError?: string
}

// ========================
// RPA OPERATION TYPES
// ========================

/**
 * Base RPA Operation Structure
 * All RPA operations inherit from this base interface
 */
export interface BaseRPAOperation {
  id: string
  type: RPAOperationType
  agentId: string
  workflowId?: string
  executionId?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  timeout: number // milliseconds
  maxRetries: number
  retryDelay: number // milliseconds
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

/**
 * Supported RPA Operation Types
 * Maps to the 6 RPA blocks implemented in the ReactFlow system
 */
export type RPAOperationType = 
  | 'click'
  | 'type' 
  | 'extract'
  | 'screenshot'
  | 'wait'
  | 'find-element'

// ========================
// CLICK OPERATION
// ========================

export interface RPAClickOperation extends BaseRPAOperation {
  type: 'click'
  parameters: {
    clickType: 'left_click' | 'right_click' | 'double_click' | 'middle_click'
    targetingMethod: 'coordinates' | 'image_recognition' | 'ocr_text'
    
    // Coordinate targeting
    coordinates?: { x: number; y: number }
    
    // Image recognition targeting
    templateImage?: string // Base64 encoded image
    imageConfidenceThreshold?: number
    
    // OCR text targeting
    ocrText?: string
    ocrLanguage?: string
    ocrConfidenceThreshold?: number
    
    // Common options
    searchRegion?: { x: number; y: number; width: number; height: number }
    holdModifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[]
    postClickDelay?: number
    captureScreenshot?: boolean
  }
}

export interface RPAClickResult {
  success: boolean
  action: string
  target: {
    method: string
    coordinates?: { x: number; y: number }
    imageMatch?: {
      confidence: number
      region: { x: number; y: number; width: number; height: number }
    }
    ocrMatch?: {
      text: string
      confidence: number  
      region: { x: number; y: number; width: number; height: number }
    }
  }
  screenshot?: string
  executionTime: number
  timestamp: Date
  error?: string
}

// ========================
// TYPE OPERATION  
// ========================

export interface RPATypeOperation extends BaseRPAOperation {
  type: 'type'
  parameters: {
    text: string
    targetingMethod?: 'active_element' | 'coordinates' | 'image_recognition' | 'ocr_text'
    
    // Optional targeting (if not using active element)
    coordinates?: { x: number; y: number }
    templateImage?: string
    ocrText?: string
    ocrLanguage?: string
    
    // Typing behavior
    typingSpeed?: number // Characters per minute
    humanTyping?: boolean // Add natural variations in timing
    clearFirst?: boolean // Clear existing text before typing
    pressEnterAfter?: boolean // Press Enter key after typing
    
    // Special key combinations
    specialKeys?: ('tab' | 'enter' | 'escape' | 'backspace' | 'delete')[]
    modifierKeys?: ('ctrl' | 'alt' | 'shift' | 'meta')[]
    
    // Advanced options
    simulateKeyPress?: boolean // Simulate individual key events vs paste
    postTypeDelay?: number
  }
}

export interface RPATypeResult {
  success: boolean
  text: string
  target?: {
    method: string
    coordinates?: { x: number; y: number }
    element?: string
  }
  charactersTyped: number
  executionTime: number
  timestamp: Date
  error?: string
}

// ========================
// EXTRACT OPERATION
// ========================

export interface RPAExtractOperation extends BaseRPAOperation {
  type: 'extract'
  parameters: {
    extractionMethod: 'ocr' | 'accessibility' | 'clipboard' | 'selected_text'
    regionMode: 'fullscreen' | 'custom' | 'window' | 'active_element'
    
    // Custom region (when regionMode is 'custom')
    region?: { x: number; y: number; width: number; height: number }
    
    // OCR specific options
    ocrLanguage?: string
    ocrEngine?: 'tesseract' | 'windows_ocr' | 'macos_vision'
    preprocessImage?: boolean
    
    // Text processing
    cleanupWhitespace?: boolean
    removeLineBreaks?: boolean
    filterPattern?: string // Regex pattern to filter results
    extractNumbers?: boolean // Extract only numeric values
    extractEmails?: boolean // Extract email addresses
    extractUrls?: boolean // Extract URLs
    
    // Accessibility API options (when available)
    elementType?: string
    elementAttribute?: string
  }
}

export interface RPAExtractResult {
  success: boolean
  extractedText: string
  method: string
  region: { x: number; y: number; width: number; height: number }
  confidence?: number // OCR confidence score
  processedData?: {
    numbers?: string[]
    emails?: string[]
    urls?: string[]
  }
  executionTime: number
  timestamp: Date
  error?: string
}

// ========================
// SCREENSHOT OPERATION
// ========================

export interface RPAScreenshotOperation extends BaseRPAOperation {
  type: 'screenshot'
  parameters: {
    captureMode: 'fullscreen' | 'custom_region' | 'active_window' | 'primary_monitor'
    
    // Custom region capture
    region?: { x: number; y: number; width: number; height: number }
    
    // Image format and quality
    format?: 'png' | 'jpeg' | 'bmp'
    quality?: number // 1-100 for JPEG
    
    // Processing options
    includeMouseCursor?: boolean
    highlightClicks?: boolean
    addTimestamp?: boolean
    addWatermark?: boolean
    
    // Multiple monitor handling
    monitorIndex?: number // Which monitor to capture (0-based)
    
    // File handling
    saveToFile?: boolean
    fileName?: string
    filePath?: string
  }
}

export interface RPAScreenshotResult {
  success: boolean
  imageData: string // Base64 encoded image
  format: string
  dimensions: { width: number; height: number }
  fileSize: number // bytes
  filePath?: string // if saved to file
  captureRegion: { x: number; y: number; width: number; height: number }
  executionTime: number
  timestamp: Date
  error?: string
}

// ========================
// WAIT OPERATION
// ========================

export interface RPAWaitOperation extends BaseRPAOperation {
  type: 'wait'
  parameters: {
    waitType: 'fixed_delay' | 'element_appears' | 'element_disappears' | 'image_appears' | 'image_disappears' | 'text_appears' | 'text_disappears' | 'condition'
    
    // Fixed delay
    duration?: number // milliseconds
    
    // Element/image/text waiting
    targetingMethod?: 'coordinates' | 'image_recognition' | 'ocr_text'
    templateImage?: string
    ocrText?: string
    ocrLanguage?: string
    coordinates?: { x: number; y: number }
    
    // Search parameters
    searchRegion?: { x: number; y: number; width: number; height: number }
    confidenceThreshold?: number
    
    // Polling configuration
    checkInterval?: number // milliseconds between checks
    maxWaitTime?: number // maximum wait time before timeout
    
    // Custom condition (JavaScript function as string)
    customCondition?: string
    conditionTimeout?: number
  }
}

export interface RPAWaitResult {
  success: boolean
  waitType: string
  condition: string
  actualWaitTime: number
  conditionMet: boolean
  target?: {
    method: string
    coordinates?: { x: number; y: number }
    found: boolean
    confidence?: number
  }
  executionTime: number
  timestamp: Date
  error?: string
}

// ========================
// FIND ELEMENT OPERATION
// ========================

export interface RPAFindElementOperation extends BaseRPAOperation {
  type: 'find-element'
  parameters: {
    searchMethod: 'image_recognition' | 'ocr_text' | 'accessibility' | 'color_detection' | 'template_matching'
    
    // Image recognition
    templateImage?: string // Base64 encoded template
    imageConfidenceThreshold?: number
    
    // OCR text search
    searchText?: string
    ocrLanguage?: string
    textMatchMode?: 'exact' | 'contains' | 'regex' | 'fuzzy'
    textConfidenceThreshold?: number
    
    // Accessibility search (when available)
    accessibilityRole?: string
    accessibilityName?: string
    accessibilityValue?: string
    
    // Color detection
    targetColor?: string // Hex color code
    colorTolerance?: number // 0-100
    
    // Search parameters
    searchRegion?: { x: number; y: number; width: number; height: number }
    returnStrategy: 'first' | 'best' | 'all' | 'largest' | 'smallest'
    maxResults?: number
    
    // Advanced options
    scaleInvariant?: boolean // Search at multiple scales
    rotationInvariant?: boolean // Search at multiple rotations
    preprocessImage?: boolean // Apply image preprocessing
  }
}

export interface RPAFindElementResult {
  success: boolean
  method: string
  elements: Array<{
    coordinates: { x: number; y: number }
    region: { x: number; y: number; width: number; height: number }
    confidence: number
    metadata?: {
      text?: string
      color?: string
      accessibilityInfo?: Record<string, any>
    }
  }>
  searchRegion: { x: number; y: number; width: number; height: number }
  totalFound: number
  executionTime: number
  timestamp: Date
  error?: string
}

// ========================
// WORKFLOW EXECUTION
// ========================

/**
 * RPA Workflow Execution
 * Manages the execution of complete RPA workflows across Desktop Agents
 */
export interface RPAWorkflowExecution {
  id: string
  workflowId: string
  workflowName: string
  agentId: string
  userId: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  
  // Execution tracking
  operations: RPAOperation[]
  currentOperationIndex: number
  totalOperations: number
  completedOperations: number
  failedOperations: number
  
  // Timing and performance
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  estimatedDuration?: number // milliseconds
  actualDuration?: number // milliseconds
  
  // Configuration
  config: {
    continueOnError: boolean
    maxRetries: number
    retryDelay: number
    screenshotOnError: boolean
    pauseOnError: boolean
    notifyOnCompletion: boolean
  }
  
  // Results and state
  results: RPAOperationResult[]
  variables: Record<string, any> // Workflow variables
  context: Record<string, any> // Execution context
  error?: string
  logs: RPAExecutionLog[]
}

/**
 * Union type for all RPA operations
 */
export type RPAOperation = 
  | RPAClickOperation
  | RPATypeOperation  
  | RPAExtractOperation
  | RPAScreenshotOperation
  | RPAWaitOperation
  | RPAFindElementOperation

/**
 * Union type for all RPA operation results
 */
export type RPAOperationResult = 
  | RPAClickResult
  | RPATypeResult
  | RPAExtractResult
  | RPAScreenshotResult
  | RPAWaitResult
  | RPAFindElementResult

/**
 * RPA Execution Log Entry
 */
export interface RPAExecutionLog {
  id: string
  executionId: string
  operationId?: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: Record<string, any>
  timestamp: Date
}

// ========================
// SOCKET.IO EVENTS
// ========================

/**
 * Socket.io Event Types for RPA Communication
 * Defines the contract between Sim server and Desktop Agents
 */
export interface RPASocketEvents {
  // Agent lifecycle
  'rpa:agent:register': (data: { agentInfo: Partial<DesktopAgent>; auth: AgentAuth }) => void
  'rpa:agent:heartbeat': (data: { agentId: string; metrics: Partial<AgentMetrics> }) => void
  'rpa:agent:disconnect': (data: { agentId: string; reason?: string }) => void
  
  // Operation execution
  'rpa:operation:execute': (data: { operation: RPAOperation }) => void
  'rpa:operation:progress': (data: { operationId: string; progress: number; message?: string }) => void
  'rpa:operation:complete': (data: { operationId: string; result: RPAOperationResult }) => void
  'rpa:operation:error': (data: { operationId: string; error: string; details?: any }) => void
  'rpa:operation:cancel': (data: { operationId: string }) => void
  
  // Workflow execution
  'rpa:workflow:start': (data: { execution: RPAWorkflowExecution }) => void
  'rpa:workflow:pause': (data: { executionId: string }) => void
  'rpa:workflow:resume': (data: { executionId: string }) => void
  'rpa:workflow:cancel': (data: { executionId: string }) => void
  'rpa:workflow:status': (data: { executionId: string; status: string; progress: number }) => void
  
  // Real-time streaming
  'rpa:stream:screenshot': (data: { agentId: string; imageData: string }) => void
  'rpa:stream:logs': (data: { agentId: string; logs: RPAExecutionLog[] }) => void
  'rpa:stream:metrics': (data: { agentId: string; metrics: AgentMetrics }) => void
}

/**
 * Server-to-Client Socket.io Events
 */
export interface RPASocketServerEvents {
  // Agent management responses
  'rpa:agent:registered': (data: { agentId: string; status: string }) => void
  'rpa:agent:status': (data: { agentId: string; status: string; metadata?: any }) => void
  'rpa:agent:error': (data: { error: string; details?: any }) => void
  
  // Operation responses
  'rpa:operation:assigned': (data: { operationId: string; agentId: string }) => void
  'rpa:operation:started': (data: { operationId: string; startedAt: Date }) => void
  'rpa:operation:updated': (data: { operationId: string; status: string; progress?: number }) => void
  
  // Workflow responses
  'rpa:workflow:assigned': (data: { executionId: string; agentId: string }) => void
  'rpa:workflow:updated': (data: { executionId: string; status: string; progress: number }) => void
  'rpa:workflow:completed': (data: { executionId: string; results: RPAOperationResult[] }) => void
  
  // System events
  'rpa:system:notification': (data: { type: string; message: string; data?: any }) => void
  'rpa:system:maintenance': (data: { message: string; scheduledTime?: Date }) => void
}

// ========================
// API REQUEST/RESPONSE TYPES
// ========================

/**
 * API Request and Response types for RPA endpoints
 */
export interface RegisterAgentRequest {
  name: string
  platform: 'windows' | 'macos' | 'linux'  
  version: string
  capabilities: AgentCapability[]
  metadata: {
    hostname: string
    userAgent: string
    screenResolution?: { width: number; height: number }
    availableEngines: string[]
  }
}

export interface RegisterAgentResponse {
  agentId: string
  apiKey: string
  status: string
  connectionInstructions: {
    socketUrl: string
    authToken: string
    heartbeatInterval: number
  }
}

export interface ExecuteOperationRequest {
  agentId: string
  operation: Omit<RPAOperation, 'id' | 'status' | 'createdAt'>
  workflowId?: string
  executionId?: string
}

export interface ExecuteOperationResponse {
  operationId: string
  status: string
  estimatedDuration?: number
  message: string
}

export interface ExecuteWorkflowRequest {
  agentId: string
  workflowId: string
  operations: Omit<RPAOperation, 'id' | 'agentId' | 'status' | 'createdAt'>[]
  config?: {
    continueOnError?: boolean
    maxRetries?: number
    retryDelay?: number
    screenshotOnError?: boolean
    pauseOnError?: boolean
    notifyOnCompletion?: boolean
  }
  variables?: Record<string, any>
}

export interface ExecuteWorkflowResponse {
  executionId: string
  status: string
  totalOperations: number
  estimatedDuration?: number
  message: string
}

export interface GetAgentStatusResponse {
  agent: DesktopAgent
  metrics: AgentMetrics
  activeOperations: RPAOperation[]
  recentExecutions: RPAWorkflowExecution[]
}

export interface ListAgentsResponse {
  agents: DesktopAgent[]
  total: number
  online: number
  offline: number
}

// ========================
// ERROR TYPES
// ========================

/**
 * RPA-specific error types for comprehensive error handling
 */
export interface RPAError {
  code: string
  message: string
  details?: any
  agentId?: string
  operationId?: string
  executionId?: string
  timestamp: Date
  stack?: string
}

export type RPAErrorCode = 
  | 'AGENT_NOT_FOUND'
  | 'AGENT_OFFLINE'
  | 'AGENT_BUSY'
  | 'OPERATION_TIMEOUT'
  | 'OPERATION_FAILED'
  | 'INVALID_PARAMETERS'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'CAPABILITY_NOT_SUPPORTED'
  | 'WORKFLOW_EXECUTION_FAILED'
  | 'IMAGE_RECOGNITION_FAILED'
  | 'OCR_PROCESSING_FAILED'
  | 'ELEMENT_NOT_FOUND'
  | 'SCREENSHOT_FAILED'
  | 'CONNECTION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNKNOWN_ERROR'

// ========================
// CONFIGURATION TYPES
// ========================

/**
 * RPA System Configuration
 */
export interface RPAConfig {
  agents: {
    maxConcurrentOperations: number
    heartbeatInterval: number // milliseconds
    heartbeatTimeout: number // milliseconds
    connectionTimeout: number // milliseconds
    defaultOperationTimeout: number // milliseconds
  }
  operations: {
    defaultRetries: number
    defaultRetryDelay: number // milliseconds
    screenshotQuality: number // 1-100
    ocrLanguageDefault: string
    imageMatchThreshold: number // 0-1
    textMatchThreshold: number // 0-1
  }
  workflows: {
    maxConcurrentExecutions: number
    executionTimeoutDefault: number // milliseconds
    logRetentionDays: number
    screenshotRetentionDays: number
  }
  security: {
    apiKeyLength: number
    tokenExpirationTime: number // milliseconds
    allowedOrigins: string[]
    rateLimitRequests: number
    rateLimitWindow: number // milliseconds
  }
}

/**
 * Type definitions for Zod schema validation
 * These will be used to create the actual Zod schemas in validation files
 */
export type AgentRegistrationSchema = z.infer<ReturnType<typeof import('../socket-server/validation/rpa-schemas').createAgentRegistrationSchema>>
export type RPAOperationSchema = z.infer<ReturnType<typeof import('../socket-server/validation/rpa-schemas').createRPAOperationSchema>>
export type WorkflowExecutionSchema = z.infer<ReturnType<typeof import('../socket-server/validation/rpa-schemas').createWorkflowExecutionSchema>>