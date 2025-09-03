/**
 * Python Code Execution Types
 *
 * Type definitions for Python code execution with data science capabilities
 */

export interface PythonExecutionInput {
  code: string | Array<{ content: string }>
  packages: string[]
  customPackages: string[]
  timeout: number
  memoryLimit: number
  enableDebugging: boolean
  enableNetworking: boolean
  pythonVersion: '3.9' | '3.10' | '3.11'
  outputFormat: 'auto' | 'json' | 'string' | 'pickle' | 'csv'
  saveFiles: boolean
  logLevel: 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG'
  envVars: Record<string, any>
  workflowVariables: Record<string, any>
  blockData: Record<string, any>
  blockNameMapping: Record<string, string>
  workflowId?: string
  isPythonExecution?: boolean
  _context?: {
    workflowId?: string
    environmentVariables?: Record<string, any>
    workflowVariables?: Record<string, any>
    blockData?: Record<string, any>
    blockNameMapping?: Record<string, string>
  }
}

export interface PythonExecutionOutput {
  success: boolean
  output: {
    result: any
    stdout: string
    stderr: string
    executionTime: number
    memoryUsage: number
    installedPackages: string[]
    generatedFiles: Array<{
      name: string
      path: string
      size: number
      type: string
    }>
    debugInfo?: any
    securityReport?: {
      packagesRequested: number
      packagesInstalled: number
      packagesFailed: number
      filesGenerated: number
      networkAttempts?: string[]
      securityWarnings?: string[]
    }
  }
  error?: string
}

export interface PythonPackageInfo {
  name: string
  version?: string
  description?: string
  whitelisted: boolean
  installationStatus: 'pending' | 'installing' | 'installed' | 'failed'
  installationError?: string
}

export interface PythonEnvironmentConfig {
  pythonVersion: string
  virtualEnvironment?: string
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
  }
}

export interface GeneratedFile {
  name: string
  path: string
  absolutePath: string
  size: number
  type: string
  mimeType?: string
  createdAt: Date
  downloadUrl?: string
  thumbnail?: string // For image files
}

export interface PythonDebugInfo {
  breakpoints: Array<{
    line: number
    condition?: string
    hitCount: number
  }>
  variables: Record<
    string,
    {
      type: string
      value: any
      scope: 'local' | 'global' | 'builtin'
    }
  >
  stackTrace: Array<{
    file: string
    line: number
    function: string
    code: string
  }>
  executionTrace: Array<{
    timestamp: number
    line: number
    event: 'line' | 'call' | 'return' | 'exception'
    locals?: Record<string, any>
  }>
  performanceProfile: {
    totalTime: number
    functionCalls: Array<{
      function: string
      callCount: number
      totalTime: number
      averageTime: number
    }>
    memoryProfile: Array<{
      timestamp: number
      memoryUsage: number
      line: number
    }>
  }
}

export interface PythonSecurityReport {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  securityWarnings: string[]
  resourceUsage: {
    peakMemory: number
    cpuTime: number
    diskUsage: number
    networkRequests: number
  }
  packageSecurity: Array<{
    package: string
    version: string
    vulnerabilities: Array<{
      id: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
      fixedVersion?: string
    }>
  }>
  codeAnalysis: {
    suspiciousPatterns: string[]
    dangerousFunctions: string[]
    externalCalls: string[]
    fileOperations: string[]
  }
  complianceReport: {
    gdprCompliant: boolean
    sopCompliant: boolean
    dataProcessingActivities: string[]
    personalDataAccessed: boolean
  }
}

export interface PythonExecutionMetrics {
  startTime: Date
  endTime: Date
  totalExecutionTime: number
  compilationTime: number
  packageInstallationTime: number
  codeExecutionTime: number
  peakMemoryUsage: number
  averageMemoryUsage: number
  cpuUtilization: number
  diskIOOperations: number
  networkRequests: number
  linesExecuted: number
  functionsExecuted: number
  exceptionsRaised: number
}

export interface PythonExecutionContext {
  workflowId?: string
  blockId: string
  executionId: string
  userId: string
  workspaceId: string
  environment: 'development' | 'staging' | 'production'
  executionMode: 'vm' | 'container' | 'sandbox'
  resourceQuota: {
    maxMemory: number
    maxCpu: number
    maxTime: number
    maxStorage: number
  }
  permissions: {
    networking: boolean
    fileSystem: boolean
    systemCalls: boolean
    packageInstallation: boolean
  }
}
