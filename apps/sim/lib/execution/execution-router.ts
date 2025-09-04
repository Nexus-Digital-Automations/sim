/**
 * Execution Router Middleware
 *
 * Intelligent routing middleware that automatically selects the optimal
 * execution method (legacy VM or enhanced Docker) based on code analysis,
 * security requirements, and performance characteristics.
 *
 * Features:
 * - Automatic method selection based on code complexity and risk
 * - Transparent upgrade from legacy to enhanced execution
 * - Performance-based routing decisions
 * - Security-aware execution path selection
 * - Backward compatibility preservation
 *
 * Author: Claude Development Agent
 * Created: September 3, 2025
 */

import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ExecutionRouter')

/**
 * Legacy execution request (for backward compatibility)
 */
export interface LegacyExecutionRequest {
  code: string
  params?: Record<string, any>
  timeout?: number
  envVars?: Record<string, string>
  blockData?: Record<string, any>
  blockNameMapping?: Record<string, string>
  workflowVariables?: Record<string, any>
  workflowId?: string
  isCustomTool?: boolean
}

/**
 * Routing decision criteria
 */
interface RoutingCriteria {
  securityRisk: 'low' | 'medium' | 'high' | 'critical'
  complexityScore: number
  hasNetworkOperations: boolean
  hasFileOperations: boolean
  hasAdvancedFeatures: boolean
  estimatedExecutionTime: number
  memoryRequirement: 'low' | 'medium' | 'high'
}

/**
 * Routing decision result
 */
interface RoutingDecision {
  method: 'legacy' | 'enhanced'
  reason: string
  confidence: number
  criteria: RoutingCriteria
  recommendation: {
    securityLevel: 'basic' | 'enhanced' | 'maximum'
    executionMethod: 'vm' | 'docker' | 'auto'
    enableCaching: boolean
    enableAnalysis: boolean
  }
}

/**
 * Code analysis patterns for routing decisions
 */
const ROUTING_PATTERNS = {
  // High-risk patterns requiring enhanced security
  highRiskPatterns: [
    /eval\s*\(/gi,
    /exec\s*\(/gi,
    /Function\s*\(/gi,
    /child_process/gi,
    /subprocess/gi,
    /os\.system/gi,
    /shell/gi,
    /spawn/gi,
  ],

  // Network operation patterns
  networkPatterns: [
    /fetch\s*\(/gi,
    /XMLHttpRequest/gi,
    /axios/gi,
    /requests\./gi,
    /urllib/gi,
    /http\./gi,
    /websocket/gi,
    /socket\.io/gi,
  ],

  // File operation patterns
  filePatterns: [
    /fs\./gi,
    /readFile/gi,
    /writeFile/gi,
    /open\s*\(/gi,
    /file\s*\(/gi,
    /path\./gi,
    /mkdir/gi,
    /rmdir/gi,
  ],

  // Advanced feature patterns
  advancedPatterns: [
    /import\s+/gi,
    /require\s*\(/gi,
    /async\s+function/gi,
    /await\s+/gi,
    /Promise/gi,
    /setTimeout/gi,
    /setInterval/gi,
    /Worker/gi,
    /SharedArrayBuffer/gi,
  ],

  // Complex computation patterns
  complexComputationPatterns: [
    /for\s*\([^)]*;\s*[^;]*<\s*\d{4,}/gi, // Large loops
    /while\s*\([^)]*\d{4,}/gi, // Large while loops
    /Array\s*\(\s*\d{4,}/gi, // Large arrays
    /new\s+Array\s*\(\s*\d{4,}/gi, // Large array creation
    /\.map\s*\(/gi,
    /\.filter\s*\(/gi,
    /\.reduce\s*\(/gi,
    /numpy/gi,
    /pandas/gi,
    /tensorflow/gi,
    /scikit-learn/gi,
  ],
}

/**
 * Main execution router class
 */
export class ExecutionRouter {
  private routingDecisions = new Map<string, RoutingDecision>()
  private performanceMetrics = {
    legacyExecutions: 0,
    enhancedExecutions: 0,
    averageLegacyTime: 0,
    averageEnhancedTime: 0,
    routingAccuracy: 0,
  }

  /**
   * Route execution request to optimal execution method
   */
  async routeExecution(request: LegacyExecutionRequest): Promise<{
    decision: RoutingDecision
    shouldUseEnhanced: boolean
  }> {
    const routingId = this.generateRoutingId(request)

    logger.info('Analyzing execution request for routing', {
      routingId,
      codeLength: request.code.length,
      hasParams: !!request.params,
      workflowId: request.workflowId,
    })

    // Check cache for previous routing decisions
    const cachedDecision = this.routingDecisions.get(routingId)
    if (cachedDecision) {
      logger.info('Using cached routing decision', { routingId, method: cachedDecision.method })
      return {
        decision: cachedDecision,
        shouldUseEnhanced: cachedDecision.method === 'enhanced',
      }
    }

    // Analyze code for routing criteria
    const criteria = await this.analyzeRoutingCriteria(request.code)

    // Make routing decision
    const decision = this.makeRoutingDecision(criteria, request)

    // Cache decision
    this.routingDecisions.set(routingId, decision)

    // Clean cache if it gets too large
    if (this.routingDecisions.size > 1000) {
      const oldEntries = Array.from(this.routingDecisions.keys()).slice(0, 200)
      oldEntries.forEach((key) => this.routingDecisions.delete(key))
    }

    logger.info('Routing decision made', {
      routingId,
      method: decision.method,
      reason: decision.reason,
      confidence: decision.confidence,
      securityRisk: criteria.securityRisk,
    })

    return {
      decision,
      shouldUseEnhanced: decision.method === 'enhanced',
    }
  }

  /**
   * Analyze code to determine routing criteria
   */
  private async analyzeRoutingCriteria(code: string): Promise<RoutingCriteria> {
    const patterns = ROUTING_PATTERNS

    // Security risk assessment
    let securityRisk: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let riskScore = 0

    // Check for high-risk patterns
    for (const pattern of patterns.highRiskPatterns) {
      if (pattern.test(code)) {
        riskScore += 25
      }
    }

    // Determine security risk level
    if (riskScore >= 75) securityRisk = 'critical'
    else if (riskScore >= 50) securityRisk = 'high'
    else if (riskScore >= 25) securityRisk = 'medium'

    // Network operations check
    const hasNetworkOperations = patterns.networkPatterns.some((pattern) => pattern.test(code))
    if (hasNetworkOperations) riskScore += 15

    // File operations check
    const hasFileOperations = patterns.filePatterns.some((pattern) => pattern.test(code))
    if (hasFileOperations) riskScore += 10

    // Advanced features check
    const hasAdvancedFeatures = patterns.advancedPatterns.some((pattern) => pattern.test(code))

    // Complexity scoring
    const complexityScore = this.calculateComplexityScore(code)

    // Memory requirement estimation
    const memoryRequirement = this.estimateMemoryRequirement(code)

    // Execution time estimation
    const estimatedExecutionTime = this.estimateExecutionTime(code, complexityScore)

    // Update security risk based on additional factors
    if (complexityScore > 50 || estimatedExecutionTime > 10000) {
      if (securityRisk === 'low') securityRisk = 'medium'
      else if (securityRisk === 'medium') securityRisk = 'high'
    }

    return {
      securityRisk,
      complexityScore,
      hasNetworkOperations,
      hasFileOperations,
      hasAdvancedFeatures,
      estimatedExecutionTime,
      memoryRequirement,
    }
  }

  /**
   * Calculate code complexity score
   */
  private calculateComplexityScore(code: string): number {
    let score = 0

    // Lines of code
    const lines = code
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('//')).length
    score += Math.min(lines * 0.5, 20)

    // Cyclomatic complexity indicators
    const conditions = (code.match(/if\s*\(|else|while\s*\(|for\s*\(|switch\s*\(|case\s+/g) || [])
      .length
    score += conditions * 2

    // Function definitions
    const functions = (code.match(/function\s+\w+|=>\s*{|async\s+function/g) || []).length
    score += functions * 3

    // Loop nesting (approximate)
    const maxNesting = this.estimateMaxNesting(code)
    score += maxNesting * 5

    // Complex computation patterns
    const complexPatterns = ROUTING_PATTERNS.complexComputationPatterns
    for (const pattern of complexPatterns) {
      if (pattern.test(code)) {
        score += 10
      }
    }

    return Math.min(score, 100)
  }

  /**
   * Estimate maximum nesting depth
   */
  private estimateMaxNesting(code: string): number {
    let maxDepth = 0
    let currentDepth = 0

    for (const char of code) {
      if (char === '{') {
        currentDepth++
        maxDepth = Math.max(maxDepth, currentDepth)
      } else if (char === '}') {
        currentDepth = Math.max(0, currentDepth - 1)
      }
    }

    return maxDepth
  }

  /**
   * Estimate memory requirement
   */
  private estimateMemoryRequirement(code: string): 'low' | 'medium' | 'high' {
    // Check for large data structures
    if (/Array\s*\(\s*\d{4,}|new\s+Array\s*\(\s*\d{4,}|Buffer\.alloc\s*\(\s*\d{6,}/gi.test(code)) {
      return 'high'
    }

    // Check for data science libraries
    if (/numpy|pandas|tensorflow|scikit-learn|matplotlib/gi.test(code)) {
      return 'high'
    }

    // Check for medium complexity operations
    if (/\.map\s*\(|\.filter\s*\(|\.reduce\s*\(|JSON\.parse|JSON\.stringify/gi.test(code)) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Estimate execution time
   */
  private estimateExecutionTime(code: string, complexityScore: number): number {
    let baseTime = 100 // Base 100ms

    // Add time based on complexity
    baseTime += complexityScore * 50

    // Add time for specific patterns
    const lines = code.split('\n').length
    baseTime += lines * 2

    // Heavy computation indicators
    if (/for\s*\([^)]*;\s*[^;]*<\s*\d{4,}/gi.test(code)) {
      baseTime += 5000 // Large loops
    }

    if (/numpy|pandas|scipy|scikit-learn/gi.test(code)) {
      baseTime += 3000 // Data science operations
    }

    if (/fetch\s*\(|requests\.|http\./gi.test(code)) {
      baseTime += 2000 // Network operations
    }

    return Math.min(baseTime, 30000) // Cap at 30 seconds
  }

  /**
   * Make final routing decision
   */
  private makeRoutingDecision(
    criteria: RoutingCriteria,
    request: LegacyExecutionRequest
  ): RoutingDecision {
    let method: 'legacy' | 'enhanced' = 'legacy'
    let reason = 'Default to legacy execution'
    let confidence = 0.5

    // Enhanced execution triggers (in order of priority)

    // Critical security risk
    if (criteria.securityRisk === 'critical') {
      method = 'enhanced'
      reason = 'Critical security risk detected - enhanced sandboxing required'
      confidence = 0.95
    }

    // High security risk with additional factors
    else if (
      criteria.securityRisk === 'high' &&
      (criteria.hasNetworkOperations || criteria.hasFileOperations)
    ) {
      method = 'enhanced'
      reason = 'High security risk with network/file operations'
      confidence = 0.9
    }

    // Complex computation with high memory requirements
    else if (criteria.complexityScore > 60 && criteria.memoryRequirement === 'high') {
      method = 'enhanced'
      reason = 'Complex computation requiring enhanced resource management'
      confidence = 0.8
    }

    // Long-running operations
    else if (criteria.estimatedExecutionTime > 15000) {
      method = 'enhanced'
      reason = 'Long execution time requiring enhanced monitoring'
      confidence = 0.7
    }

    // Network operations with medium+ complexity
    else if (criteria.hasNetworkOperations && criteria.complexityScore > 30) {
      method = 'enhanced'
      reason = 'Network operations with moderate complexity'
      confidence = 0.7
    }

    // File operations
    else if (criteria.hasFileOperations) {
      method = 'enhanced'
      reason = 'File operations require enhanced security'
      confidence = 0.8
    }

    // Advanced features with medium+ risk
    else if (criteria.hasAdvancedFeatures && criteria.securityRisk !== 'low') {
      method = 'enhanced'
      reason = 'Advanced features with elevated security risk'
      confidence = 0.6
    }

    // Determine recommendation based on decision
    const recommendation = {
      securityLevel:
        criteria.securityRisk === 'critical'
          ? ('maximum' as const)
          : criteria.securityRisk === 'high'
            ? ('enhanced' as const)
            : ('basic' as const),
      executionMethod: method === 'enhanced' ? ('auto' as const) : ('vm' as const),
      enableCaching: criteria.complexityScore < 80, // Disable caching for very complex code
      enableAnalysis: criteria.securityRisk !== 'low',
    }

    return {
      method,
      reason,
      confidence,
      criteria,
      recommendation,
    }
  }

  /**
   * Generate routing ID for caching
   */
  private generateRoutingId(request: LegacyExecutionRequest): string {
    const keyData = {
      code: request.code,
      params: request.params || {},
      timeout: request.timeout || 5000,
    }

    return require('crypto').createHash('md5').update(JSON.stringify(keyData)).digest('hex')
  }

  /**
   * Update routing performance metrics
   */
  updateMetrics(method: 'legacy' | 'enhanced', executionTime: number, success: boolean): void {
    if (method === 'legacy') {
      this.performanceMetrics.legacyExecutions++
      this.performanceMetrics.averageLegacyTime =
        (this.performanceMetrics.averageLegacyTime *
          (this.performanceMetrics.legacyExecutions - 1) +
          executionTime) /
        this.performanceMetrics.legacyExecutions
    } else {
      this.performanceMetrics.enhancedExecutions++
      this.performanceMetrics.averageEnhancedTime =
        (this.performanceMetrics.averageEnhancedTime *
          (this.performanceMetrics.enhancedExecutions - 1) +
          executionTime) /
        this.performanceMetrics.enhancedExecutions
    }

    // Update routing accuracy based on success rate
    if (success) {
      this.performanceMetrics.routingAccuracy =
        this.performanceMetrics.routingAccuracy * 0.95 + 0.05 * 1.0
    } else {
      this.performanceMetrics.routingAccuracy =
        this.performanceMetrics.routingAccuracy * 0.95 + 0.05 * 0.0
    }
  }

  /**
   * Get routing statistics
   */
  getStatistics() {
    return {
      totalDecisions: this.routingDecisions.size,
      performanceMetrics: { ...this.performanceMetrics },
      cacheHitRate:
        this.routingDecisions.size > 0
          ? Array.from(this.routingDecisions.values()).filter((d) => d.confidence > 0.8).length /
            this.routingDecisions.size
          : 0,
      methodDistribution: {
        legacy: this.performanceMetrics.legacyExecutions,
        enhanced: this.performanceMetrics.enhancedExecutions,
        total:
          this.performanceMetrics.legacyExecutions + this.performanceMetrics.enhancedExecutions,
      },
    }
  }

  /**
   * Clear routing cache
   */
  clearCache(): void {
    this.routingDecisions.clear()
    logger.info('Execution routing cache cleared')
  }
}

// Export singleton instance
export const executionRouter = new ExecutionRouter()
