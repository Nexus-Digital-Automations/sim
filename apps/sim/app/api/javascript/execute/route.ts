import { spawn } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { createContext, Script } from 'vm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max

const logger = createLogger('JavaScriptExecuteAPI')

/**
 * Enhanced JavaScript Execution API
 *
 * Provides secure JavaScript code execution with:
 * - Multiple sandbox modes (VM, Process, Docker)
 * - NPM package management with whitelisted packages
 * - Resource monitoring and limits
 * - Advanced debugging capabilities
 * - Security analysis and reporting
 * - Network access controls
 */

// Whitelisted NPM packages for security
const WHITELISTED_PACKAGES = new Set([
  'lodash',
  'moment',
  'axios',
  'uuid',
  'crypto-js',
  'validator',
  'cheerio',
  'csv-parser',
  'xml2js',
  'bcrypt',
  'jsonwebtoken',
  'sharp',
  'date-fns',
  'ramda',
  'immutable',
  'rxjs',
  'bluebird',
  'async',
  'underscore',
  'qs',
  'mime-types',
  'node-fetch',
  'form-data',
  'multiparty',
  'file-type',
  'js-yaml',
  'marked',
  'highlight.js',
  'sanitize-html',
  'express-validator',
])

interface ExecutionRequest {
  code: string
  packages: string[]
  timeout: number
  memoryLimit: number
  enableDebugging: boolean
  enableNetworking: boolean
  sandboxMode: 'vm' | 'process' | 'docker'
  logLevel: string
  envVars: Record<string, any>
  workflowVariables: Record<string, any>
  blockData: Record<string, any>
  blockNameMapping: Record<string, string>
  workflowId?: string
  isEnhancedJavaScript?: boolean
}

interface ExecutionResult {
  success: boolean
  output: {
    result: any
    stdout: string
    stderr: string
    executionTime: number
    memoryUsage: number
    debugInfo?: any
    securityReport?: any
  }
  error?: string
}

/**
 * Enhanced error information interface
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
 * Resource monitoring utilities
 */
class ResourceMonitor {
  private startTime: number
  private startMemory: number
  private peakMemory = 0

  constructor() {
    this.startTime = Date.now()
    const memUsage = process.memoryUsage()
    this.startMemory = memUsage.heapUsed
  }

  updatePeakMemory() {
    const memUsage = process.memoryUsage()
    const currentMemory = memUsage.heapUsed
    this.peakMemory = Math.max(this.peakMemory, currentMemory - this.startMemory)
  }

  getStats() {
    this.updatePeakMemory()
    return {
      executionTime: Date.now() - this.startTime,
      memoryUsage: Math.round(this.peakMemory / (1024 * 1024)), // Convert to MB
    }
  }
}

/**
 * Security analyzer for code execution
 */
class SecurityAnalyzer {
  private networkAttempts: string[] = []
  private fileSystemAccess: string[] = []
  private suspiciousPatterns: string[] = []

  analyzeCode(code: string): { warnings: string[]; risk: 'low' | 'medium' | 'high' } {
    const warnings: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' = 'low'

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/gi, warning: 'Use of eval() detected', risk: 'high' },
      { pattern: /Function\s*\(/gi, warning: 'Dynamic function creation detected', risk: 'medium' },
      { pattern: /process\.exit/gi, warning: 'Process exit attempt detected', risk: 'high' },
      {
        pattern: /require\s*\(['"]child_process['"]\)/gi,
        warning: 'Child process access detected',
        risk: 'high',
      },
      {
        pattern: /require\s*\(['"]fs['"]\)/gi,
        warning: 'File system access detected',
        risk: 'medium',
      },
      { pattern: /\.constructor\s*\(/gi, warning: 'Constructor access detected', risk: 'medium' },
    ]

    for (const { pattern, warning, risk } of dangerousPatterns) {
      if (pattern.test(code)) {
        warnings.push(warning)
        if (risk === 'high') riskLevel = 'high'
        else if (risk === 'medium' && riskLevel !== 'high') riskLevel = 'medium'
      }
    }

    return { warnings, risk: riskLevel }
  }

  logNetworkAttempt(url: string) {
    this.networkAttempts.push(url)
  }

  logFileSystemAccess(path: string) {
    this.fileSystemAccess.push(path)
  }

  getReport() {
    return {
      networkAttempts: this.networkAttempts,
      fileSystemAccess: this.fileSystemAccess,
      suspiciousPatterns: this.suspiciousPatterns,
    }
  }
}

/**
 * Package manager for NPM dependencies
 */
class PackageManager {
  private static installedPackages = new Map<string, any>()

  static async loadPackages(packages: string[]): Promise<Record<string, any>> {
    const loadedPackages: Record<string, any> = {}

    for (const packageName of packages) {
      if (!WHITELISTED_PACKAGES.has(packageName)) {
        logger.warn(`Skipping non-whitelisted package: ${packageName}`)
        continue
      }

      try {
        // Try to load from cache first
        if (PackageManager.installedPackages.has(packageName)) {
          loadedPackages[packageName] = PackageManager.installedPackages.get(packageName)
          continue
        }

        // Dynamically import the package
        const packageModule = await import(packageName)
        loadedPackages[packageName] = packageModule.default || packageModule
        PackageManager.installedPackages.set(packageName, loadedPackages[packageName])

        logger.info(`Successfully loaded package: ${packageName}`)
      } catch (error) {
        logger.warn(`Failed to load package ${packageName}: ${error}`)
        // Don't fail execution for missing packages, just log and continue
      }
    }

    return loadedPackages
  }
}

/**
 * Enhanced VM execution with advanced features
 */
async function executeInVM(
  code: string,
  params: ExecutionRequest,
  monitor: ResourceMonitor,
  analyzer: SecurityAnalyzer
): Promise<any> {
  const { resolvedCode, contextVariables } = await resolveCodeVariables(
    code,
    params.envVars,
    params.workflowVariables,
    params.blockData,
    params.blockNameMapping
  )

  // Load requested packages
  const packages = await PackageManager.loadPackages(params.packages)

  let stdout = ''
  let stderr = ''

  // Create enhanced console with logging
  const enhancedConsole = {
    log: (...args: any[]) => {
      const logMessage = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      stdout += `${logMessage}\n`
      if (params.logLevel === 'debug' || params.logLevel === 'trace') {
        logger.info(`[VM Console] ${logMessage}`)
      }
    },
    error: (...args: any[]) => {
      const errorMessage = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      stderr += `${errorMessage}\n`
      logger.error(`[VM Console Error] ${errorMessage}`)
    },
    warn: (...args: any[]) => {
      const warnMessage = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      stdout += `WARN: ${warnMessage}\n`
      logger.warn(`[VM Console Warn] ${warnMessage}`)
    },
    info: (...args: any[]) => {
      const infoMessage = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      stdout += `INFO: ${infoMessage}\n`
      if (
        params.logLevel === 'info' ||
        params.logLevel === 'debug' ||
        params.logLevel === 'trace'
      ) {
        logger.info(`[VM Console Info] ${infoMessage}`)
      }
    },
    debug: (...args: any[]) => {
      if (params.logLevel === 'debug' || params.logLevel === 'trace') {
        const debugMessage = args
          .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
          .join(' ')
        stdout += `DEBUG: ${debugMessage}\n`
        logger.debug(`[VM Console Debug] ${debugMessage}`)
      }
    },
  }

  // Create secured fetch function if networking is enabled
  const securedFetch = params.enableNetworking
    ? async (url: string, options?: any) => {
        analyzer.logNetworkAttempt(url)
        return fetch(url, options)
      }
    : () => {
        throw new Error('Network access is disabled')
      }

  // Create secure context
  const context = createContext({
    // Standard globals
    console: enhancedConsole,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    Buffer,

    // Package access
    require: (name: string) => {
      if (packages[name]) {
        return packages[name]
      }
      throw new Error(`Package '${name}' is not available or not whitelisted`)
    },

    // Network access
    fetch: securedFetch,

    // Workflow context
    ...contextVariables,

    // Legacy support
    params: params.envVars,
    environmentVariables: params.envVars,

    // Built-in Node.js modules (limited set)
    crypto: require('crypto'),
    url: require('url'),
    querystring: require('querystring'),
    util: require('util'),

    // Math and Date
    Math,
    Date,
    JSON,
    RegExp,

    // Global functions
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
  })

  // Build the script with monitoring
  const fullScript = `
    (async () => {
      try {
        ${resolvedCode}
      } catch (error) {
        console.error(error);
        throw error;
      }
    })()
  `

  const script = new Script(fullScript, {
    filename: 'enhanced-javascript-function.js',
    lineOffset: 0,
    columnOffset: 0,
  })

  // Execute with timeout and memory monitoring
  const result = await script.runInContext(context, {
    timeout: params.timeout,
    displayErrors: true,
    breakOnSigint: true,
  })

  monitor.updatePeakMemory()

  return {
    result,
    stdout,
    stderr,
    debugInfo: params.enableDebugging ? { context: Object.keys(context) } : undefined,
  }
}

/**
 * Process-based execution for enhanced isolation
 */
async function executeInProcess(
  code: string,
  params: ExecutionRequest,
  monitor: ResourceMonitor
): Promise<any> {
  // Create temporary file for code execution
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sim-js-'))
  const codePath = path.join(tempDir, 'code.js')

  try {
    // Resolve variables in code
    const { resolvedCode } = await resolveCodeVariables(
      code,
      params.envVars,
      params.workflowVariables,
      params.blockData,
      params.blockNameMapping
    )

    // Wrap code in async function
    const wrappedCode = `
      (async () => {
        try {
          ${resolvedCode}
        } catch (error) {
          console.error(JSON.stringify({
            error: error.message,
            stack: error.stack,
            name: error.name
          }));
          process.exit(1);
        }
      })().then(result => {
        console.log(JSON.stringify({ result }));
        process.exit(0);
      }).catch(error => {
        console.error(JSON.stringify({
          error: error.message,
          stack: error.stack,
          name: error.name
        }));
        process.exit(1);
      });
    `

    await fs.writeFile(codePath, wrappedCode)

    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''

      const child = spawn('node', [codePath], {
        timeout: params.timeout,
        env: {
          ...process.env,
          ...params.envVars,
          NODE_OPTIONS: `--max-old-space-size=${params.memoryLimit}`,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        monitor.updatePeakMemory()

        if (code === 0) {
          try {
            const lines = stdout.trim().split('\n')
            const lastLine = lines[lines.length - 1]
            const result = JSON.parse(lastLine).result
            resolve({
              result,
              stdout: lines.slice(0, -1).join('\n'),
              stderr,
            })
          } catch (error) {
            resolve({
              result: stdout,
              stdout,
              stderr,
            })
          }
        } else {
          reject(new Error(`Process exited with code ${code}: ${stderr}`))
        }
      })

      child.on('error', (error) => {
        reject(error)
      })
    })
  } finally {
    // Cleanup temp files
    try {
      await fs.rm(tempDir, { recursive: true })
    } catch (error) {
      logger.warn(`Failed to cleanup temp directory: ${error}`)
    }
  }
}

/**
 * Resolves workflow variables and environment variables in code
 */
async function resolveCodeVariables(
  code: string,
  envVars: Record<string, any>,
  workflowVariables: Record<string, any>,
  blockData: Record<string, any>,
  blockNameMapping: Record<string, string>
): Promise<{ resolvedCode: string; contextVariables: Record<string, any> }> {
  let resolvedCode = code
  const contextVariables: Record<string, any> = {}

  // Resolve environment variables {{VAR_NAME}}
  const envVarMatches = resolvedCode.match(/\{\{([^}]+)\}\}/g) || []
  for (const match of envVarMatches) {
    const varName = match.slice(2, -2).trim()
    const varValue = envVars[varName] || ''
    const safeVarName = `__env_${varName.replace(/[^a-zA-Z0-9_]/g, '_')}`
    contextVariables[safeVarName] = varValue
    resolvedCode = resolvedCode.replace(new RegExp(escapeRegExp(match), 'g'), safeVarName)
  }

  // Resolve workflow variables <variable.name>
  const variableMatches = resolvedCode.match(/<variable\.([^>]+)>/g) || []
  for (const match of variableMatches) {
    const variableName = match.slice('<variable.'.length, -1).trim()
    const foundVariable = Object.entries(workflowVariables).find(
      ([_, variable]) => (variable.name || '').replace(/\s+/g, '') === variableName
    )

    if (foundVariable) {
      const variable = foundVariable[1]
      const safeVarName = `__var_${variableName.replace(/[^a-zA-Z0-9_]/g, '_')}`
      contextVariables[safeVarName] = variable.value
      resolvedCode = resolvedCode.replace(new RegExp(escapeRegExp(match), 'g'), safeVarName)
    }
  }

  // Resolve block output variables <blockName.output>
  const blockMatches = resolvedCode.match(/<([a-zA-Z_][a-zA-Z0-9_.]*[a-zA-Z0-9_])>/g) || []
  for (const match of blockMatches) {
    const tagName = match.slice(1, -1).trim()
    const tagValue = getNestedValue(blockData, tagName) || ''
    const safeVarName = `__block_${tagName.replace(/[^a-zA-Z0-9_]/g, '_')}`
    contextVariables[safeVarName] = tagValue
    resolvedCode = resolvedCode.replace(new RegExp(escapeRegExp(match), 'g'), safeVarName)
  }

  return { resolvedCode, contextVariables }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined
  }, obj)
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Main POST handler for JavaScript execution
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const monitor = new ResourceMonitor()
  const analyzer = new SecurityAnalyzer()

  try {
    const body: ExecutionRequest = await req.json()
    const {
      code,
      packages = [],
      timeout = 30000,
      memoryLimit = 256,
      enableDebugging = false,
      enableNetworking = true,
      sandboxMode = 'vm',
      logLevel = 'info',
      envVars = {},
      workflowVariables = {},
      blockData = {},
      blockNameMapping = {},
      workflowId,
    } = body

    logger.info(`[${requestId}] Enhanced JavaScript execution request`, {
      hasCode: !!code,
      packagesCount: packages.length,
      sandboxMode,
      timeout,
      memoryLimit,
      enableDebugging,
      enableNetworking,
      workflowId,
    })

    // Security analysis
    const securityAnalysis = analyzer.analyzeCode(code)
    if (securityAnalysis.risk === 'high') {
      logger.warn(`[${requestId}] High-risk code detected`, { warnings: securityAnalysis.warnings })
    }

    let executionResult: any

    // Execute based on sandbox mode
    switch (sandboxMode) {
      case 'process':
        executionResult = await executeInProcess(code, body, monitor)
        break
      case 'docker':
        // TODO: Implement Docker-based execution
        throw new Error('Docker sandbox mode not yet implemented')
      default:
        executionResult = await executeInVM(code, body, monitor, analyzer)
        break
    }

    const stats = monitor.getStats()
    const securityReport = analyzer.getReport()

    const response: ExecutionResult = {
      success: true,
      output: {
        result: executionResult.result,
        stdout: executionResult.stdout || '',
        stderr: executionResult.stderr || '',
        executionTime: stats.executionTime,
        memoryUsage: stats.memoryUsage,
        debugInfo: executionResult.debugInfo,
        securityReport: {
          ...securityReport,
          analysis: securityAnalysis,
          riskLevel: securityAnalysis.risk,
        },
      },
    }

    logger.info(`[${requestId}] JavaScript execution completed successfully`, {
      executionTime: stats.executionTime,
      memoryUsage: stats.memoryUsage,
      sandboxMode,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    const stats = monitor.getStats()
    const errorMessage = error.message || 'Unknown error occurred'

    logger.error(`[${requestId}] JavaScript execution failed`, {
      error: errorMessage,
      stack: error.stack,
      executionTime: stats.executionTime,
    })

    const response: ExecutionResult = {
      success: false,
      output: {
        result: null,
        stdout: '',
        stderr: errorMessage,
        executionTime: stats.executionTime,
        memoryUsage: stats.memoryUsage,
      },
      error: errorMessage,
    }

    return NextResponse.json(response, { status: 500 })
  }
}
