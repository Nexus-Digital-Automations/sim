/**
 * Enhanced JavaScript Code Execution Types
 *
 * Type definitions for JavaScript code execution with advanced features
 */

export interface JavaScriptExecutionInput {
  code: string | Array<{ content: string }>
  packages: string[]
  timeout: number
  memoryLimit: number
  enableDebugging: boolean
  enableNetworking: boolean
  sandboxMode: 'vm' | 'process' | 'docker'
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace'
  envVars: Record<string, any>
  workflowVariables: Record<string, any>
  blockData: Record<string, any>
  blockNameMapping: Record<string, string>
  workflowId?: string
  isEnhancedJavaScript?: boolean
  _context?: {
    workflowId?: string
    environmentVariables?: Record<string, any>
    workflowVariables?: Record<string, any>
    blockData?: Record<string, any>
    blockNameMapping?: Record<string, string>
  }
}

export interface JavaScriptExecutionOutput {
  success: boolean
  output: {
    result: any
    stdout: string
    stderr: string
    executionTime: number
    memoryUsage: number
    debugInfo?: any
    securityReport?: {
      networkAttempts: string[]
      fileSystemAccess: string[]
      suspiciousPatterns: string[]
      riskLevel: 'low' | 'medium' | 'high'
      analysis: {
        warnings: string[]
        risk: 'low' | 'medium' | 'high'
      }
    }
  }
  error?: string
}

export interface JavaScriptPackageInfo {
  name: string
  version?: string
  description?: string
  whitelisted: boolean
  loadStatus: 'pending' | 'loading' | 'loaded' | 'failed'
  loadError?: string
}

export interface JavaScriptEnvironmentConfig {
  nodeVersion: string
  sandboxMode: 'vm' | 'process' | 'docker'
  workingDirectory: string
  environmentVariables: Record<string, string>
  resourceLimits: {
    memory: number // MB
    cpu: number // cores
    timeout: number // milliseconds
    diskSpace: number // MB
  }
  securityPolicy: {
    allowNetworking: boolean
    allowFileSystem: boolean
    allowedDomains: string[]
    blockedDomains: string[]
    maxFileSize: number // bytes
    allowEval: boolean
    allowDynamicImports: boolean
  }
}

export interface JavaScriptDebugInfo {
  breakpoints: Array<{
    line: number
    column?: number
    condition?: string
    hitCount: number
  }>
  variables: Record<
    string,
    {
      type: string
      value: any
      scope: 'local' | 'global' | 'closure'
    }
  >
  callStack: Array<{
    function: string
    file: string
    line: number
    column: number
  }>
  executionProfile: {
    totalTime: number
    functionCalls: Array<{
      function: string
      callCount: number
      totalTime: number
      averageTime: number
    }>
    memoryProfile: Array<{
      timestamp: number
      heapUsed: number
      heapTotal: number
      external: number
    }>
  }
  v8Flags: string[]
  nodeEnvironment: {
    version: string
    platform: string
    arch: string
    features: string[]
  }
}

export interface JavaScriptSecurityReport {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  securityWarnings: string[]
  analysis: {
    warnings: string[]
    risk: 'low' | 'medium' | 'high'
  }
  resourceUsage: {
    peakMemory: number
    cpuTime: number
    diskUsage: number
    networkRequests: number
  }
  networkAttempts: Array<{
    url: string
    method: string
    timestamp: number
    allowed: boolean
    blocked?: string
  }>
  fileSystemAccess: Array<{
    path: string
    operation: 'read' | 'write' | 'delete' | 'create'
    timestamp: number
    allowed: boolean
    blocked?: string
  }>
  codeAnalysis: {
    suspiciousPatterns: Array<{
      pattern: string
      line: number
      severity: 'low' | 'medium' | 'high'
      description: string
    }>
    dangerousFunctions: string[]
    dynamicCode: Array<{
      type: 'eval' | 'Function' | 'setTimeout' | 'setInterval'
      line: number
      code: string
    }>
    externalRequires: string[]
  }
  packageSecurity: Array<{
    package: string
    trusted: boolean
    source: 'npm' | 'local' | 'url'
    vulnerabilities?: Array<{
      id: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
    }>
  }>
}

export interface JavaScriptExecutionMetrics {
  startTime: Date
  endTime: Date
  totalExecutionTime: number
  compilationTime: number
  packageLoadingTime: number
  codeExecutionTime: number
  peakMemoryUsage: number
  averageMemoryUsage: number
  cpuUtilization: number
  gcStats: {
    collections: number
    totalTime: number
    averageTime: number
  }
  eventLoopLag: number
  linesExecuted: number
  functionsExecuted: number
  exceptionsRaised: number
  promisesCreated: number
  callbacksExecuted: number
}

export interface JavaScriptExecutionContext {
  workflowId?: string
  blockId: string
  executionId: string
  userId: string
  workspaceId: string
  environment: 'development' | 'staging' | 'production'
  executionMode: 'vm' | 'process' | 'docker'
  nodeVersion: string
  v8Version: string
  resourceQuota: {
    maxMemory: number
    maxCpu: number
    maxTime: number
    maxStorage: number
  }
  permissions: {
    networking: boolean
    fileSystem: boolean
    childProcesses: boolean
    dynamicImports: boolean
    eval: boolean
  }
  sandboxFeatures: {
    contextIsolation: boolean
    codeGeneration: boolean
    wasmCodeGeneration: boolean
    wasmSIMD: boolean
  }
}
