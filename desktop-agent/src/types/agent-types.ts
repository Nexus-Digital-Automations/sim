/**
 * Type definitions for Sim Desktop Agent
 * 
 * Comprehensive TypeScript type definitions for all agent components including
 * RPA workflows, security events, system monitoring, and server communication.
 * 
 * @fileoverview Core type definitions for desktop agent architecture
 * @version 1.0.0
 */

// ================================
// Core Agent Types
// ================================

/**
 * Desktop Agent configuration interface
 */
export interface DesktopAgentConfig {
  /** Agent identification */
  agent: {
    id: string;
    name: string;
    version: string;
    machineId: string;
  };

  /** Server connection configuration */
  server: {
    url: string;
    timeout: number;
    reconnectionDelay: number;
    maxReconnectionAttempts: number;
    encryptionEnabled: boolean;
    authToken?: string;
    autoConnect: boolean;
  };

  /** RPA engine configuration */
  rpa: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    maxConcurrentExecutions: number;
    executionTimeout: number;
    engines: {
      nutjs: boolean;
      playwright: boolean;
      pyautogui: boolean;
    };
  };

  /** Security configuration */
  security: {
    enableMonitoring: boolean;
    enableAuditLogging: boolean;
    enableThreatDetection: boolean;
    maxViolations: {
      high: number;
      medium: number;
      low: number;
    };
    sandboxMode: boolean;
  };

  /** UI configuration */
  ui: {
    startMinimized: boolean;
    showInTray: boolean;
    enableNotifications: boolean;
    theme: 'light' | 'dark' | 'auto';
  };

  /** Update configuration */
  updates: {
    autoCheck: boolean;
    autoDownload: boolean;
    autoInstall: boolean;
    checkInterval: number;
  };

  /** Monitoring configuration */
  monitoring: {
    enableMetrics: boolean;
    metricsInterval: number;
    maxMemoryMB: number;
    maxCpuPercent: number;
    enableHealthChecks: boolean;
  };
}

/**
 * Agent capabilities enumeration
 */
export type AgentCapabilities = 
  | 'desktop-automation'
  | 'web-automation'
  | 'image-recognition'
  | 'ocr-processing'
  | 'file-operations'
  | 'system-monitoring'
  | 'cross-platform-support'
  | 'security-monitoring'
  | 'performance-monitoring';

/**
 * Connection status types
 */
export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'authenticated'
  | 'error'
  | 'locked';

/**
 * Agent status information
 */
export interface AgentStatus {
  id: string;
  machineId: string;
  version: string;
  platform: string;
  arch: string;
  connectionStatus: ConnectionStatus;
  capabilities: AgentCapabilities[];
  rpaEngines: string[];
  uptime: number;
  lastActivity: Date;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
}

// ================================
// RPA Workflow Types
// ================================

/**
 * RPA workflow step types
 */
export type RPAStepType = 
  | 'click'
  | 'type'
  | 'key-press'
  | 'wait'
  | 'screenshot'
  | 'read-text'
  | 'open-application'
  | 'navigate-url'
  | 'extract-data'
  | 'condition'
  | 'loop'
  | 'custom';

/**
 * Individual RPA workflow step
 */
export interface RPAWorkflowStep {
  id: string;
  type: RPAStepType;
  name: string;
  description?: string;
  action: string;
  parameters: Record<string, any>;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  condition?: {
    type: 'element-exists' | 'text-contains' | 'custom';
    expression: string;
    expectedValue?: any;
  };
  onError?: 'continue' | 'stop' | 'retry' | 'fallback';
  fallbackStep?: string;
  enabled: boolean;
}

/**
 * RPA workflow definition
 */
export interface RPAWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  created: Date;
  modified: Date;
  tags?: string[];
  category?: string;
  steps: RPAWorkflowStep[];
  variables?: Record<string, any>;
  settings: {
    timeout?: number;
    retryCount?: number;
    runHeadless?: boolean;
    captureScreenshots?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
  permissions?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Workflow execution context
 */
export interface WorkflowExecutionContext {
  executionId: string;
  workflowId: string;
  agentId: string;
  userId?: string;
  workspaceId?: string;
  startTime: Date;
  endTime?: Date;
  status: WorkflowExecutionStatus;
  variables: Record<string, any>;
  currentStep?: number;
  totalSteps: number;
  progress: number;
  onProgress?: (progress: WorkflowProgress) => void;
  onError?: (error: WorkflowError) => void;
  onComplete?: (result: WorkflowResult) => void;
}

/**
 * Workflow execution status
 */
export type WorkflowExecutionStatus = 
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

/**
 * Workflow execution progress
 */
export interface WorkflowProgress {
  executionId: string;
  workflowId: string;
  percentage: number;
  stepIndex: number;
  stepName: string;
  stepDescription?: string;
  duration: number;
  estimatedTimeRemaining?: number;
  metrics?: Record<string, any>;
  screenshot?: string; // Base64 encoded
}

/**
 * Workflow execution error
 */
export interface WorkflowError {
  executionId: string;
  workflowId: string;
  stepIndex?: number;
  stepId?: string;
  error: string;
  message: string;
  stack?: string;
  screenshot?: string; // Base64 encoded
  recoverable: boolean;
  retryCount: number;
  timestamp: Date;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  executionId: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  startTime: Date;
  endTime: Date;
  duration: number;
  stepsExecuted: number;
  stepsSkipped: number;
  stepsFailed: number;
  data?: Record<string, any>;
  screenshots?: string[]; // Base64 encoded
  metrics: {
    performanceScore: number;
    reliability: number;
    resourceUsage: {
      memory: number;
      cpu: number;
    };
  };
  errors: WorkflowError[];
}

// ================================
// RPA Engine Types
// ================================

/**
 * RPA engine types
 */
export type RPAEngineType = 'nutjs' | 'playwright' | 'pyautogui' | 'custom';

/**
 * RPA engine configuration
 */
export interface RPAEngineConfig {
  type: RPAEngineType;
  name: string;
  version: string;
  enabled: boolean;
  priority: number;
  capabilities: string[];
  settings: Record<string, any>;
}

/**
 * RPA engine interface
 */
export interface IRPAEngine {
  name: string;
  type: RPAEngineType;
  version: string;
  capabilities: string[];
  isInitialized: boolean;

  initialize(config?: Record<string, any>): Promise<boolean>;
  shutdown(): Promise<void>;
  execute(workflow: RPAWorkflow, context: WorkflowExecutionContext): Promise<WorkflowResult>;
  stop(executionId: string): Promise<boolean>;
  getStatus(): EngineStatus;
  getMetrics(): EngineMetrics;
}

/**
 * Engine status
 */
export interface EngineStatus {
  name: string;
  type: RPAEngineType;
  status: 'initializing' | 'ready' | 'busy' | 'error' | 'shutdown';
  activeExecutions: number;
  totalExecutions: number;
  successRate: number;
  lastActivity?: Date;
  errorMessage?: string;
}

/**
 * Engine performance metrics
 */
export interface EngineMetrics {
  name: string;
  type: RPAEngineType;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageStepsPerExecution: number;
  resourceUsage: {
    memory: number;
    cpu: number;
  };
  performanceScore: number;
  lastUpdated: Date;
}

// ================================
// Security Types
// ================================

/**
 * Security event types
 */
export type SecurityEventType = 
  | 'unauthorized-access'
  | 'malicious-activity'
  | 'data-exfiltration'
  | 'privilege-escalation'
  | 'resource-violation'
  | 'network-anomaly'
  | 'file-system-violation'
  | 'process-anomaly'
  | 'certificate-error'
  | 'authentication-failure'
  | 'permission-violation'
  | 'code-injection'
  | 'suspicious-behavior';

/**
 * Security event severity levels
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security event interface
 */
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  agentId: string;
  message: string;
  details: Record<string, any>;
  sourceComponent?: string;
  remediationAction?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * Security violation threshold
 */
export interface SecurityViolationThreshold {
  severity: SecuritySeverity;
  count: number;
  timeWindow: number; // milliseconds
  action: 'log' | 'alert' | 'block' | 'lockdown';
}

/**
 * Security monitoring configuration
 */
export interface SecurityMonitoringConfig {
  enabled: boolean;
  auditLogging: boolean;
  threatDetection: boolean;
  behaviorAnalysis: boolean;
  resourceMonitoring: boolean;
  networkMonitoring: boolean;
  fileSystemMonitoring: boolean;
  processMonitoring: boolean;
  thresholds: SecurityViolationThreshold[];
  alertEndpoints: string[];
}

// ================================
// UI and System Types
// ================================

/**
 * UI element selector types
 */
export type SelectorType = 'coordinates' | 'image' | 'text' | 'accessibility' | 'css' | 'xpath';

/**
 * UI element selector
 */
export interface ElementSelector {
  type: SelectorType;
  value: string;
  confidence?: number; // For image recognition
  timeout?: number;
  retryCount?: number;
  description?: string;
  fallbackSelectors?: ElementSelector[];
}

/**
 * System information
 */
export interface SystemInfo {
  platform: string;
  arch: string;
  osVersion: string;
  nodeVersion: string;
  electronVersion: string;
  agentVersion: string;
  totalMemory: number;
  availableMemory: number;
  cpuCores: number;
  cpuModel: string;
  displayInfo: {
    screens: Array<{
      id: string;
      bounds: { x: number; y: number; width: number; height: number };
      primary: boolean;
      scaleFactor: number;
    }>;
  };
  networkInterfaces: Record<string, any>;
  installedSoftware?: string[];
}

/**
 * System metrics
 */
export interface SystemMetrics {
  agentId: string;
  timestamp: Date;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
    percent: number;
  };
  uptime: number;
  loadAverage?: number[];
  diskUsage?: {
    total: number;
    free: number;
    used: number;
  };
  networkStats?: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
}

// ================================
// Communication Types
// ================================

/**
 * Socket message types
 */
export type SocketMessageType = 
  | 'agent-register'
  | 'agent-status'
  | 'workflow-execute'
  | 'workflow-cancel'
  | 'workflow-progress'
  | 'workflow-result'
  | 'system-command'
  | 'security-event'
  | 'heartbeat'
  | 'configuration-update';

/**
 * Socket message interface
 */
export interface SocketMessage {
  type: SocketMessageType;
  id: string;
  timestamp: Date;
  agentId: string;
  payload: any;
  encrypted?: boolean;
  signature?: string;
}

/**
 * Server credentials
 */
export interface ServerCredentials {
  token: string;
  agentId: string;
  machineId: string;
  capabilities: AgentCapabilities[];
}

// ================================
// Database Types
// ================================

/**
 * Database table schemas
 */
export interface AgentInfoRecord {
  agentId: string;
  machineId: string;
  version: string;
  platform: string;
  arch: string;
  lastStartup: Date;
  capabilities: string; // JSON string
  configHash?: string;
}

export interface WorkflowExecutionRecord {
  executionId: string;
  workflowId: string;
  agentId: string;
  userId?: string;
  workspaceId?: string;
  status: WorkflowExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  stepsExecuted: number;
  stepsFailed: number;
  result?: string; // JSON string
  errorMessage?: string;
}

export interface SecurityEventRecord {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  agentId: string;
  message: string;
  details: string; // JSON string
  resolved: boolean;
  resolvedAt?: Date;
}

export interface SystemMetricsRecord {
  id: string;
  agentId: string;
  timestamp: Date;
  memoryRss: number;
  memoryHeapTotal: number;
  memoryHeapUsed: number;
  cpuUser: number;
  cpuSystem: number;
  uptime: number;
  additionalMetrics?: string; // JSON string
}

// ================================
// Event Types
// ================================

/**
 * Application event types
 */
export interface AppEvents {
  'agent-initialized': (agent: AgentStatus) => void;
  'agent-shutdown': () => void;
  'connection-status-changed': (status: ConnectionStatus) => void;
  'workflow-started': (execution: WorkflowExecutionContext) => void;
  'workflow-progress': (progress: WorkflowProgress) => void;
  'workflow-completed': (result: WorkflowResult) => void;
  'workflow-error': (error: WorkflowError) => void;
  'security-event': (event: SecurityEvent) => void;
  'threat-detected': (threat: any) => void;
  'system-metrics': (metrics: SystemMetrics) => void;
  'update-available': (version: string) => void;
  'update-downloaded': () => void;
  'configuration-updated': (config: DesktopAgentConfig) => void;
}

// ================================
// Configuration Defaults
// ================================

/**
 * Default agent configuration
 */
export const DEFAULT_AGENT_CONFIG: DesktopAgentConfig = {
  agent: {
    id: '',
    name: 'Sim Desktop Agent',
    version: '1.0.0',
    machineId: ''
  },
  server: {
    url: 'https://api.sim.platform',
    timeout: 30000,
    reconnectionDelay: 1000,
    maxReconnectionAttempts: 10,
    encryptionEnabled: true,
    autoConnect: true
  },
  rpa: {
    logLevel: 'info',
    maxConcurrentExecutions: 3,
    executionTimeout: 300000, // 5 minutes
    engines: {
      nutjs: true,
      playwright: true,
      pyautogui: false
    }
  },
  security: {
    enableMonitoring: true,
    enableAuditLogging: true,
    enableThreatDetection: true,
    maxViolations: {
      high: 1,
      medium: 5,
      low: 20
    },
    sandboxMode: false
  },
  ui: {
    startMinimized: false,
    showInTray: true,
    enableNotifications: true,
    theme: 'auto'
  },
  updates: {
    autoCheck: true,
    autoDownload: false,
    autoInstall: false,
    checkInterval: 86400000 // 24 hours
  },
  monitoring: {
    enableMetrics: true,
    metricsInterval: 60000, // 1 minute
    maxMemoryMB: 1000,
    maxCpuPercent: 80,
    enableHealthChecks: true
  }
};

// ================================
// Utility Types
// ================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search parameters
 */
export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Export types
 */
export type {
  // Re-export commonly used types for convenience
  RPAWorkflow as Workflow,
  WorkflowExecutionContext as ExecutionContext,
  WorkflowResult as ExecutionResult,
  SecurityEvent as Event,
  SystemMetrics as Metrics
};