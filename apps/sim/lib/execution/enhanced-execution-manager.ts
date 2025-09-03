/**
 * Enhanced Code Execution Manager
 * 
 * Provides enterprise-grade code execution with comprehensive security,
 * performance optimization, and backward compatibility. Integrates Docker
 * sandboxing, security analysis, and governance workflows.
 * 
 * Features:
 * - Backward compatibility with existing VM-based execution
 * - Docker-based security sandboxing for enhanced protection
 * - Real-time security analysis and threat detection
 * - Performance optimization and caching
 * - Enterprise governance and compliance
 * - Comprehensive audit logging and monitoring
 * 
 * Author: Claude Development Agent
 * Created: September 3, 2025
 */

import { createLogger } from '@/lib/logs/console/logger'
import { dockerSandbox, type ContainerConfig, type ExecutionResult } from './docker-sandbox'
import { codeSecurityAnalyzer, type SecurityAnalysis } from '../security/code-analyzer'
import { createContext, Script } from 'vm'
import { randomBytes } from 'crypto'

const logger = createLogger('EnhancedExecutionManager')

/**
 * Execution method options
 */
export type ExecutionMethod = 'vm' | 'docker' | 'auto'

/**
 * Security level configuration
 */
export type SecurityLevel = 'basic' | 'enhanced' | 'maximum'

/**
 * Enhanced execution configuration
 */
export interface EnhancedExecutionConfig {
  method: ExecutionMethod
  securityLevel: SecurityLevel
  enableSecurityAnalysis: boolean
  enableGovernance: boolean
  enableCaching: boolean
  enableMetrics: boolean
  timeout: number
  memoryLimit: string
  networkAccess: 'none' | 'restricted' | 'monitored'
  customPackages?: string[]
  complianceFrameworks?: string[]
}

/**
 * Enhanced execution request
 */
export interface EnhancedExecutionRequest {
  code: string
  language: 'javascript' | 'python'
  params?: Record<string, any>
  environmentVariables?: Record<string, string>
  blockData?: Record<string, any>
  blockNameMapping?: Record<string, string>
  workflowVariables?: Record<string, any>
  workflowId?: string
  isCustomTool?: boolean
  config?: Partial<EnhancedExecutionConfig>
}

/**
 * Enhanced execution response
 */
export interface EnhancedExecutionResponse {
  success: boolean
  output: {
    result: any
    stdout: string
    stderr: string
    executionTime: number
    memoryUsage: number
    resourceUsage: {
      cpu: { usage: number; time: number }
      memory: { used: number; max: number; limit: number }
      disk: { read: number; write: number }
      network: { incoming: number; outgoing: number; requests: number }
    }
    securityReport: {
      riskScore: number
      violations: any[]
      networkRequests: any[]
      fileOperations: any[]
      policyCompliance: boolean
      threatLevel: string
      executionTimeMs: number
    }
  }
  securityAnalysis?: SecurityAnalysis
  executionMethod: string
  governanceApproval?: GovernanceApproval
  cacheHit?: boolean
  error?: string
  debug?: any
}

/**
 * Governance approval details
 */
export interface GovernanceApproval {
  required: boolean
  approved: boolean
  approver?: string
  timestamp?: Date
  conditions?: string[]
  workflow?: string
}

/**
 * Execution cache entry
 */
interface ExecutionCacheEntry {
  result: EnhancedExecutionResponse
  timestamp: Date
  hits: number
  securityHash: string
}

/**
 * Performance metrics
 */
interface PerformanceMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  cacheHitRate: number
  securityViolations: number
  governanceBlocks: number
}

/**
 * Main enhanced execution manager
 */
export class EnhancedExecutionManager {
  private cache = new Map<string, ExecutionCacheEntry>()
  private metrics: PerformanceMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    cacheHitRate: 0,
    securityViolations: 0,
    governanceBlocks: 0
  }
  
  private defaultConfig: EnhancedExecutionConfig = {
    method: 'auto',
    securityLevel: 'enhanced',
    enableSecurityAnalysis: true,
    enableGovernance: false,
    enableCaching: true,
    enableMetrics: true,
    timeout: 30000,
    memoryLimit: '512MB',
    networkAccess: 'restricted',
    complianceFrameworks: ['OWASP']
  }

  constructor(config?: Partial<EnhancedExecutionConfig>) {
    this.defaultConfig = { ...this.defaultConfig, ...config }
    logger.info('Enhanced execution manager initialized', { config: this.defaultConfig })
  }

  /**
   * Execute code with enhanced security and performance
   */
  async executeCode(request: EnhancedExecutionRequest): Promise<EnhancedExecutionResponse> {
    const executionId = randomBytes(8).toString('hex')
    const startTime = Date.now()
    
    logger.info('Starting enhanced code execution', {
      executionId,
      language: request.language,
      codeLength: request.code.length,
      method: request.config?.method || this.defaultConfig.method
    })

    try {
      // Merge configuration
      const config = { ...this.defaultConfig, ...request.config }
      
      // Update metrics
      this.metrics.totalExecutions++

      // Security analysis (if enabled)
      let securityAnalysis: SecurityAnalysis | undefined
      if (config.enableSecurityAnalysis) {
        logger.info('Performing security analysis', { executionId })
        securityAnalysis = await this.performSecurityAnalysis(request, config)
        
        // Check if execution should be blocked due to security
        if (!securityAnalysis.approved) {
          this.metrics.securityViolations++
          return this.createSecurityBlockedResponse(executionId, securityAnalysis, startTime)
        }
      }

      // Governance approval (if enabled)
      let governanceApproval: GovernanceApproval | undefined
      if (config.enableGovernance) {
        governanceApproval = await this.checkGovernanceApproval(request, config, securityAnalysis)
        
        if (governanceApproval.required && !governanceApproval.approved) {
          this.metrics.governanceBlocks++
          return this.createGovernanceBlockedResponse(executionId, governanceApproval, startTime)
        }
      }

      // Check cache (if enabled)
      if (config.enableCaching) {
        const cacheKey = this.generateCacheKey(request, config)
        const cached = this.getFromCache(cacheKey, securityAnalysis)
        
        if (cached) {
          logger.info('Cache hit for execution', { executionId, cacheKey })
          this.updateCacheStats(true)
          return { ...cached.result, cacheHit: true }
        }
      }

      // Determine execution method
      const executionMethod = this.determineExecutionMethod(request, config, securityAnalysis)
      
      // Execute code
      let result: EnhancedExecutionResponse
      switch (executionMethod) {
        case 'docker':
          result = await this.executeWithDocker(request, config, executionId)
          break
        case 'vm':
          result = await this.executeWithVM(request, config, executionId)
          break
        default:
          throw new Error(`Unsupported execution method: ${executionMethod}`)
      }

      // Add metadata
      result.executionMethod = executionMethod
      result.securityAnalysis = securityAnalysis
      result.governanceApproval = governanceApproval
      result.cacheHit = false

      // Cache result (if enabled and successful)
      if (config.enableCaching && result.success) {
        const cacheKey = this.generateCacheKey(request, config)
        this.addToCache(cacheKey, result, securityAnalysis)
      }

      // Update metrics
      if (result.success) {
        this.metrics.successfulExecutions++
      } else {
        this.metrics.failedExecutions++
      }

      const executionTime = Date.now() - startTime
      this.updateAverageExecutionTime(executionTime)

      logger.info('Enhanced code execution completed', {
        executionId,
        success: result.success,
        method: executionMethod,
        executionTime
      })

      return result

    } catch (error) {
      this.metrics.failedExecutions++
      const executionTime = Date.now() - startTime
      
      logger.error('Enhanced code execution failed', {
        executionId,
        error: error.message,
        executionTime
      })

      return this.createErrorResponse(executionId, error, startTime)
    }
  }

  /**
   * Perform comprehensive security analysis
   */
  private async performSecurityAnalysis(
    request: EnhancedExecutionRequest,
    config: EnhancedExecutionConfig
  ): Promise<SecurityAnalysis> {
    const packages = config.customPackages || []
    
    // Configure security analyzer
    codeSecurityAnalyzer.updateConfig({
      enableStaticAnalysis: true,
      enableDynamicMonitoring: true,
      enablePackageScanning: packages.length > 0,
      enablePolicyEnforcement: true,
      riskThreshold: config.securityLevel === 'maximum' ? 30 : 
                   config.securityLevel === 'enhanced' ? 50 : 70,
      strictMode: config.securityLevel === 'maximum',
      complianceFrameworks: config.complianceFrameworks || ['OWASP']
    })

    return await codeSecurityAnalyzer.analyzeCode(
      request.code,
      request.language,
      packages
    )
  }

  /**
   * Check governance approval requirements
   */
  private async checkGovernanceApproval(
    request: EnhancedExecutionRequest,
    config: EnhancedExecutionConfig,
    securityAnalysis?: SecurityAnalysis
  ): Promise<GovernanceApproval> {
    // Simple governance rules - in production, this would integrate with
    // enterprise governance systems
    const requiresApproval = 
      config.securityLevel === 'maximum' ||
      (securityAnalysis && securityAnalysis.riskScore > 40) ||
      request.code.includes('fetch') ||
      request.code.includes('import') ||
      request.code.includes('require')

    return {
      required: requiresApproval,
      approved: !requiresApproval, // Auto-approve if not required
      timestamp: new Date(),
      conditions: requiresApproval ? ['Security review required'] : []
    }
  }

  /**
   * Determine optimal execution method
   */
  private determineExecutionMethod(
    request: EnhancedExecutionRequest,
    config: EnhancedExecutionConfig,
    securityAnalysis?: SecurityAnalysis
  ): ExecutionMethod {
    if (config.method !== 'auto') {
      return config.method
    }

    // Auto-selection based on security analysis
    const riskScore = securityAnalysis?.riskScore || 0
    const hasNetworkAccess = request.code.includes('fetch') || 
                            request.code.includes('requests') ||
                            request.code.includes('urllib')
    const hasFileOperations = request.code.includes('fs.') ||
                             request.code.includes('open(') ||
                             request.code.includes('file')

    // Use Docker for high-risk code or operations requiring enhanced security
    if (riskScore > 30 || hasNetworkAccess || hasFileOperations || config.securityLevel === 'maximum') {
      return 'docker'
    }

    // Use VM for simple, low-risk code
    return 'vm'
  }

  /**
   * Execute code using Docker sandbox
   */
  private async executeWithDocker(
    request: EnhancedExecutionRequest,
    config: EnhancedExecutionConfig,
    executionId: string
  ): Promise<EnhancedExecutionResponse> {
    logger.info('Executing code with Docker sandbox', { executionId })

    const containerConfig: ContainerConfig = {
      language: request.language,
      securityLevel: config.securityLevel,
      resources: {
        cpu: config.securityLevel === 'maximum' ? '0.5' : 
             config.securityLevel === 'enhanced' ? '1.0' : '2.0',
        memory: config.memoryLimit,
        timeout: config.timeout,
        diskSpace: '100MB'
      },
      networking: config.networkAccess,
      filesystem: 'temporary',
      enableDebugging: false,
      customPackages: config.customPackages
    }

    const result = await dockerSandbox.executeCode(
      request.code,
      request.language,
      containerConfig
    )

    // Transform Docker result to enhanced response format
    return {
      success: result.success,
      output: result.output,
      executionMethod: 'docker',
      error: result.error
    }
  }

  /**
   * Execute code using VM sandbox (legacy compatibility)
   */
  private async executeWithVM(
    request: EnhancedExecutionRequest,
    config: EnhancedExecutionConfig,
    executionId: string
  ): Promise<EnhancedExecutionResponse> {
    logger.info('Executing code with VM sandbox', { executionId })

    const startTime = Date.now()
    let stdout = ''
    
    try {
      // Use existing VM logic for backward compatibility
      const context = createContext({
        params: request.params || {},
        environmentVariables: request.environmentVariables || {},
        console: {
          log: (...args: any[]) => {
            const logMessage = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ') + '\n'
            stdout += logMessage
          },
          error: (...args: any[]) => {
            const errorMessage = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ') + '\n'
            stdout += `ERROR: ${errorMessage}`
          }
        }
      })

      const wrappedCode = `
        (async () => {
          try {
            ${request.code}
          } catch (error) {
            console.error('Execution error:', error.message);
            throw error;
          }
        })();
      `

      const script = new Script(wrappedCode, {
        filename: 'user-function.js',
        timeout: config.timeout
      })

      const result = await script.runInContext(context, {
        timeout: config.timeout,
        displayErrors: true,
        breakOnSigint: true
      })

      const executionTime = Date.now() - startTime

      return {
        success: true,
        output: {
          result,
          stdout,
          stderr: '',
          executionTime,
          memoryUsage: 0,
          resourceUsage: {
            cpu: { usage: 0, time: executionTime },
            memory: { used: 0, max: 0, limit: 0 },
            disk: { read: 0, write: 0 },
            network: { incoming: 0, outgoing: 0, requests: 0 }
          },
          securityReport: {
            riskScore: 0,
            violations: [],
            networkRequests: [],
            fileOperations: [],
            policyCompliance: true,
            threatLevel: 'none',
            executionTimeMs: executionTime
          }
        },
        executionMethod: 'vm'
      }

    } catch (error) {
      const executionTime = Date.now() - startTime
      
      return {
        success: false,
        output: {
          result: null,
          stdout,
          stderr: error.message,
          executionTime,
          memoryUsage: 0,
          resourceUsage: {
            cpu: { usage: 0, time: executionTime },
            memory: { used: 0, max: 0, limit: 0 },
            disk: { read: 0, write: 0 },
            network: { incoming: 0, outgoing: 0, requests: 0 }
          },
          securityReport: {
            riskScore: 100,
            violations: [{ type: 'execution_error', description: error.message }],
            networkRequests: [],
            fileOperations: [],
            policyCompliance: false,
            threatLevel: 'high',
            executionTimeMs: executionTime
          }
        },
        executionMethod: 'vm',
        error: error.message
      }
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(
    request: EnhancedExecutionRequest,
    config: EnhancedExecutionConfig
  ): string {
    const keyData = {
      code: request.code,
      language: request.language,
      params: request.params,
      config: {
        method: config.method,
        securityLevel: config.securityLevel,
        networkAccess: config.networkAccess,
        customPackages: config.customPackages
      }
    }
    
    const hash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex')
    
    return hash
  }

  /**
   * Get result from cache
   */
  private getFromCache(cacheKey: string, securityAnalysis?: SecurityAnalysis): ExecutionCacheEntry | null {
    const cached = this.cache.get(cacheKey)
    if (!cached) return null

    // Check cache validity (15 minute TTL)
    const now = new Date()
    const ageMs = now.getTime() - cached.timestamp.getTime()
    const ttlMs = 15 * 60 * 1000
    
    if (ageMs > ttlMs) {
      this.cache.delete(cacheKey)
      return null
    }

    // Security hash validation
    if (securityAnalysis) {
      const currentSecurityHash = this.generateSecurityHash(securityAnalysis)
      if (cached.securityHash !== currentSecurityHash) {
        this.cache.delete(cacheKey)
        return null
      }
    }

    cached.hits++
    return cached
  }

  /**
   * Add result to cache
   */
  private addToCache(
    cacheKey: string,
    result: EnhancedExecutionResponse,
    securityAnalysis?: SecurityAnalysis
  ): void {
    const securityHash = securityAnalysis ? this.generateSecurityHash(securityAnalysis) : ''
    
    this.cache.set(cacheKey, {
      result: { ...result },
      timestamp: new Date(),
      hits: 0,
      securityHash
    })

    // Cleanup old entries if cache gets too large
    if (this.cache.size > 1000) {
      const oldestKeys = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(0, 100)
        .map(([key]) => key)
      
      oldestKeys.forEach(key => this.cache.delete(key))
    }
  }

  /**
   * Generate security hash for cache validation
   */
  private generateSecurityHash(securityAnalysis: SecurityAnalysis): string {
    const securityData = {
      riskScore: securityAnalysis.riskScore,
      threatLevel: securityAnalysis.threatLevel,
      approved: securityAnalysis.approved,
      violationCount: securityAnalysis.staticAnalysis.dangerousPatterns.length
    }
    
    return require('crypto')
      .createHash('md5')
      .update(JSON.stringify(securityData))
      .digest('hex')
  }

  /**
   * Create security blocked response
   */
  private createSecurityBlockedResponse(
    executionId: string,
    securityAnalysis: SecurityAnalysis,
    startTime: number
  ): EnhancedExecutionResponse {
    const executionTime = Date.now() - startTime
    
    return {
      success: false,
      output: {
        result: null,
        stdout: '',
        stderr: 'Code execution blocked due to security violations',
        executionTime,
        memoryUsage: 0,
        resourceUsage: {
          cpu: { usage: 0, time: 0 },
          memory: { used: 0, max: 0, limit: 0 },
          disk: { read: 0, write: 0 },
          network: { incoming: 0, outgoing: 0, requests: 0 }
        },
        securityReport: {
          riskScore: securityAnalysis.riskScore,
          violations: securityAnalysis.staticAnalysis.dangerousPatterns,
          networkRequests: [],
          fileOperations: [],
          policyCompliance: false,
          threatLevel: securityAnalysis.threatLevel,
          executionTimeMs: executionTime
        }
      },
      securityAnalysis,
      executionMethod: 'blocked',
      error: `Security risk too high: ${securityAnalysis.riskScore}/100`
    }
  }

  /**
   * Create governance blocked response
   */
  private createGovernanceBlockedResponse(
    executionId: string,
    governanceApproval: GovernanceApproval,
    startTime: number
  ): EnhancedExecutionResponse {
    const executionTime = Date.now() - startTime
    
    return {
      success: false,
      output: {
        result: null,
        stdout: '',
        stderr: 'Code execution blocked pending governance approval',
        executionTime,
        memoryUsage: 0,
        resourceUsage: {
          cpu: { usage: 0, time: 0 },
          memory: { used: 0, max: 0, limit: 0 },
          disk: { read: 0, write: 0 },
          network: { incoming: 0, outgoing: 0, requests: 0 }
        },
        securityReport: {
          riskScore: 0,
          violations: [],
          networkRequests: [],
          fileOperations: [],
          policyCompliance: true,
          threatLevel: 'none',
          executionTimeMs: executionTime
        }
      },
      governanceApproval,
      executionMethod: 'blocked',
      error: 'Governance approval required'
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    executionId: string,
    error: Error,
    startTime: number
  ): EnhancedExecutionResponse {
    const executionTime = Date.now() - startTime
    
    return {
      success: false,
      output: {
        result: null,
        stdout: '',
        stderr: error.message,
        executionTime,
        memoryUsage: 0,
        resourceUsage: {
          cpu: { usage: 0, time: 0 },
          memory: { used: 0, max: 0, limit: 0 },
          disk: { read: 0, write: 0 },
          network: { incoming: 0, outgoing: 0, requests: 0 }
        },
        securityReport: {
          riskScore: 100,
          violations: [{ type: 'system_error', description: error.message }],
          networkRequests: [],
          fileOperations: [],
          policyCompliance: false,
          threatLevel: 'critical',
          executionTimeMs: executionTime
        }
      },
      executionMethod: 'error',
      error: error.message
    }
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(hit: boolean): void {
    const currentRate = this.metrics.cacheHitRate
    const totalRequests = this.metrics.totalExecutions
    const newRate = hit ? 
      (currentRate * (totalRequests - 1) + 1) / totalRequests :
      (currentRate * (totalRequests - 1)) / totalRequests
    
    this.metrics.cacheHitRate = newRate
  }

  /**
   * Update average execution time
   */
  private updateAverageExecutionTime(newTime: number): void {
    const currentAvg = this.metrics.averageExecutionTime
    const totalExecutions = this.metrics.totalExecutions
    
    this.metrics.averageExecutionTime = 
      (currentAvg * (totalExecutions - 1) + newTime) / totalExecutions
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
    logger.info('Execution cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      hitRate: this.metrics.cacheHitRate,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key: key.substring(0, 16) + '...',
        hits: entry.hits,
        age: Date.now() - entry.timestamp.getTime(),
        success: entry.result.success
      }))
    }
  }
}

// Export singleton instance
export const enhancedExecutionManager = new EnhancedExecutionManager()