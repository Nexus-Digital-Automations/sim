import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('SecurityPolicy')

/**
 * Security Policy Engine for Code Execution
 * 
 * Provides comprehensive security analysis and policy enforcement for user-submitted code:
 * - Static code analysis for dangerous patterns
 * - Resource usage monitoring and limits
 * - Network access controls and logging
 * - File system protection policies
 * - Runtime security violation detection
 * - Security audit logging and reporting
 */

export interface SecurityViolation {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  line?: number
  column?: number
  suggestion?: string
}

export interface SecurityAnalysisResult {
  passed: boolean
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  violations: SecurityViolation[]
  warnings: string[]
  suggestions: string[]
}

export interface SecurityReport {
  analysisResult: SecurityAnalysisResult
  networkAttempts: NetworkAttempt[]
  fileSystemAccess: FileSystemAccess[]
  resourceUsage: ResourceUsage
  executionTime: number
  violationCount: number
}

interface NetworkAttempt {
  url: string
  method: string
  timestamp: Date
  allowed: boolean
  reason?: string
}

interface FileSystemAccess {
  path: string
  operation: 'read' | 'write' | 'execute' | 'delete'
  timestamp: Date
  allowed: boolean
  reason?: string
}

interface ResourceUsage {
  maxMemoryMB: number
  maxCpuPercent: number
  executionTimeMs: number
  networkRequestCount: number
  fileOperationCount: number
}

/**
 * Comprehensive security policy for code execution
 */
export class SecurityPolicy {
  private networkAttempts: NetworkAttempt[] = []
  private fileSystemAccess: FileSystemAccess[] = []
  private resourceUsage: ResourceUsage = {
    maxMemoryMB: 0,
    maxCpuPercent: 0,
    executionTimeMs: 0,
    networkRequestCount: 0,
    fileOperationCount: 0,
  }

  /**
   * Validate code against security policies
   */
  async validateCode(code: string, language: 'javascript' | 'python'): Promise<SecurityAnalysisResult> {
    logger.info('Performing security analysis', { 
      language, 
      codeLength: code.length 
    })

    const violations: SecurityViolation[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Language-specific analysis
    if (language === 'javascript') {
      this.analyzeJavaScript(code, violations, warnings, suggestions)
    } else {
      this.analyzePython(code, violations, warnings, suggestions)
    }

    // Determine risk level based on violations
    const riskLevel = this.calculateRiskLevel(violations)
    const passed = riskLevel !== 'critical' && violations.filter(v => v.severity === 'high').length === 0

    logger.info('Security analysis completed', {
      passed,
      riskLevel,
      violationCount: violations.length,
      warningCount: warnings.length,
    })

    return {
      passed,
      riskLevel,
      violations,
      warnings,
      suggestions,
    }
  }

  /**
   * JavaScript-specific security analysis
   */
  private analyzeJavaScript(
    code: string,
    violations: SecurityViolation[],
    warnings: string[],
    suggestions: string[]
  ): void {
    const lines = code.split('\n')

    // Dangerous patterns for JavaScript
    const dangerousPatterns = [
      {
        pattern: /eval\s*\(/gi,
        severity: 'critical' as const,
        type: 'code_injection',
        description: 'Use of eval() can lead to code injection vulnerabilities',
        suggestion: 'Use JSON.parse() for data parsing or avoid dynamic code execution',
      },
      {
        pattern: /new\s+Function\s*\(/gi,
        severity: 'high' as const,
        type: 'dynamic_function',
        description: 'Dynamic function creation can be exploited for code injection',
        suggestion: 'Use predefined functions or safe alternatives',
      },
      {
        pattern: /process\.exit\s*\(/gi,
        severity: 'high' as const,
        type: 'process_control',
        description: 'Attempting to exit the process',
        suggestion: 'Return values instead of forcing process exit',
      },
      {
        pattern: /require\s*\(\s*['"]child_process['"]\s*\)/gi,
        severity: 'critical' as const,
        type: 'process_spawn',
        description: 'Attempting to spawn child processes',
        suggestion: 'Use approved APIs for external operations',
      },
      {
        pattern: /require\s*\(\s*['"]fs['"]\s*\)/gi,
        severity: 'medium' as const,
        type: 'file_system',
        description: 'Direct file system access detected',
        suggestion: 'Use provided file operation APIs instead',
      },
      {
        pattern: /\.constructor\s*\(/gi,
        severity: 'medium' as const,
        type: 'prototype_pollution',
        description: 'Potential prototype pollution via constructor access',
        suggestion: 'Avoid accessing constructor properties directly',
      },
      {
        pattern: /__proto__/gi,
        severity: 'high' as const,
        type: 'prototype_pollution',
        description: 'Direct __proto__ manipulation detected',
        suggestion: 'Use Object.create() or Object.setPrototypeOf() safely',
      },
      {
        pattern: /require\s*\(\s*['"]vm['"]\s*\)/gi,
        severity: 'high' as const,
        type: 'vm_escape',
        description: 'Attempting to access VM module for sandbox escape',
        suggestion: 'VM access is restricted in sandboxed environments',
      },
      {
        pattern: /global\s*\[/gi,
        severity: 'medium' as const,
        type: 'global_access',
        description: 'Dynamic global object access detected',
        suggestion: 'Use explicit variable declarations instead',
      },
      {
        pattern: /setTimeout\s*\(\s*['"][^'"]*eval/gi,
        severity: 'high' as const,
        type: 'delayed_injection',
        description: 'Potential delayed code injection via setTimeout',
        suggestion: 'Pass functions directly to setTimeout instead of strings',
      },
    ]

    // Analysis with line numbers
    lines.forEach((line, lineIndex) => {
      for (const { pattern, severity, type, description, suggestion } of dangerousPatterns) {
        const matches = line.matchAll(pattern)
        for (const match of matches) {
          violations.push({
            type,
            severity,
            description,
            line: lineIndex + 1,
            column: match.index ? match.index + 1 : undefined,
            suggestion,
          })
        }
      }
    })

    // Additional context-aware checks
    this.checkJavaScriptContext(code, violations, warnings, suggestions)
  }

  /**
   * Python-specific security analysis
   */
  private analyzePython(
    code: string,
    violations: SecurityViolation[],
    warnings: string[],
    suggestions: string[]
  ): void {
    const lines = code.split('\n')

    // Dangerous patterns for Python
    const dangerousPatterns = [
      {
        pattern: /exec\s*\(/gi,
        severity: 'critical' as const,
        type: 'code_injection',
        description: 'Use of exec() can lead to code injection vulnerabilities',
        suggestion: 'Use safe alternatives like ast.literal_eval() for data parsing',
      },
      {
        pattern: /eval\s*\(/gi,
        severity: 'critical' as const,
        type: 'code_injection',
        description: 'Use of eval() can execute arbitrary code',
        suggestion: 'Use ast.literal_eval() for safe evaluation of literals',
      },
      {
        pattern: /__import__\s*\(/gi,
        severity: 'high' as const,
        type: 'dynamic_import',
        description: 'Dynamic imports can bypass security restrictions',
        suggestion: 'Use standard import statements',
      },
      {
        pattern: /import\s+os/gi,
        severity: 'medium' as const,
        type: 'system_access',
        description: 'OS module access detected',
        suggestion: 'OS access should be limited to approved operations',
      },
      {
        pattern: /import\s+subprocess/gi,
        severity: 'high' as const,
        type: 'process_spawn',
        description: 'Subprocess module can execute system commands',
        suggestion: 'Use approved APIs for external operations',
      },
      {
        pattern: /open\s*\(/gi,
        severity: 'medium' as const,
        type: 'file_access',
        description: 'File operations detected',
        suggestion: 'File access should be limited to approved paths',
      },
      {
        pattern: /compile\s*\(/gi,
        severity: 'high' as const,
        type: 'code_compilation',
        description: 'Dynamic code compilation detected',
        suggestion: 'Avoid compiling arbitrary code at runtime',
      },
      {
        pattern: /globals\s*\(\s*\)/gi,
        severity: 'medium' as const,
        type: 'global_access',
        description: 'Access to global namespace detected',
        suggestion: 'Limit global variable manipulation',
      },
      {
        pattern: /locals\s*\(\s*\)/gi,
        severity: 'low' as const,
        type: 'local_access',
        description: 'Access to local namespace detected',
        suggestion: 'Use explicit variable references',
      },
      {
        pattern: /setattr\s*\(/gi,
        severity: 'medium' as const,
        type: 'attribute_manipulation',
        description: 'Dynamic attribute setting detected',
        suggestion: 'Use direct attribute assignment when possible',
      },
      {
        pattern: /getattr\s*\(/gi,
        severity: 'low' as const,
        type: 'attribute_access',
        description: 'Dynamic attribute access detected',
        suggestion: 'Use direct attribute access when the attribute name is known',
      },
      {
        pattern: /sys\.exit/gi,
        severity: 'high' as const,
        type: 'process_control',
        description: 'Attempting to exit the process',
        suggestion: 'Return values instead of forcing process exit',
      },
    ]

    // Analysis with line numbers
    lines.forEach((line, lineIndex) => {
      for (const { pattern, severity, type, description, suggestion } of dangerousPatterns) {
        const matches = line.matchAll(pattern)
        for (const match of matches) {
          violations.push({
            type,
            severity,
            description,
            line: lineIndex + 1,
            column: match.index ? match.index + 1 : undefined,
            suggestion,
          })
        }
      }
    })

    // Additional context-aware checks
    this.checkPythonContext(code, violations, warnings, suggestions)
  }

  /**
   * JavaScript context-aware security checks
   */
  private checkJavaScriptContext(
    code: string,
    violations: SecurityViolation[],
    warnings: string[],
    suggestions: string[]
  ): void {
    // Check for complex code patterns
    const complexityMetrics = this.calculateComplexity(code)
    
    if (complexityMetrics.cyclomaticComplexity > 20) {
      warnings.push('High code complexity detected - consider breaking into smaller functions')
    }

    if (complexityMetrics.nesting > 5) {
      warnings.push('Deep nesting detected - consider refactoring for better readability')
    }

    // Check for potential infinite loops
    if (/while\s*\(\s*true\s*\)|for\s*\(\s*;;\s*\)/.test(code)) {
      violations.push({
        type: 'infinite_loop',
        severity: 'high',
        description: 'Potential infinite loop detected',
        suggestion: 'Ensure loop has proper exit conditions and consider timeout mechanisms',
      })
    }

    // Check for large data structures
    if (/new\s+Array\s*\(\s*\d{6,}\s*\)/.test(code)) {
      violations.push({
        type: 'memory_exhaustion',
        severity: 'medium',
        description: 'Large array allocation detected',
        suggestion: 'Consider streaming or pagination for large datasets',
      })
    }
  }

  /**
   * Python context-aware security checks
   */
  private checkPythonContext(
    code: string,
    violations: SecurityViolation[],
    warnings: string[],
    suggestions: string[]
  ): void {
    // Check for potential infinite loops
    if (/while\s+True\s*:|for\s+.*\s+in\s+itertools\.count\s*\(\s*\)/.test(code)) {
      violations.push({
        type: 'infinite_loop',
        severity: 'high',
        description: 'Potential infinite loop detected',
        suggestion: 'Ensure loop has proper exit conditions and consider timeout mechanisms',
      })
    }

    // Check for large memory allocations
    if (/\[\s*.*\s*\]\s*\*\s*\d{6,}/.test(code) || /range\s*\(\s*\d{6,}\s*\)/.test(code)) {
      violations.push({
        type: 'memory_exhaustion',
        severity: 'medium',
        description: 'Large memory allocation detected',
        suggestion: 'Consider generators or itertools for large sequences',
      })
    }

    // Check for dangerous pickle usage
    if (/pickle\.loads?\s*\(/.test(code)) {
      violations.push({
        type: 'deserialization',
        severity: 'high',
        description: 'Pickle deserialization can execute arbitrary code',
        suggestion: 'Use json or other safe serialization formats',
      })
    }
  }

  /**
   * Calculate code complexity metrics
   */
  private calculateComplexity(code: string): {
    cyclomaticComplexity: number
    nesting: number
    lines: number
  } {
    const lines = code.split('\n').filter(line => line.trim().length > 0).length
    
    // Simple cyclomatic complexity calculation
    const cyclomaticKeywords = (code.match(/\b(if|while|for|catch|case|&&|\|\|)\b/g) || []).length
    const cyclomaticComplexity = cyclomaticKeywords + 1

    // Simple nesting calculation
    const openBraces = (code.match(/[\(\[\{]/g) || []).length
    const closeBraces = (code.match(/[\)\]\}]/g) || []).length
    const nesting = Math.abs(openBraces - closeBraces) + Math.max(openBraces, closeBraces) / 10

    return {
      cyclomaticComplexity,
      nesting: Math.floor(nesting),
      lines,
    }
  }

  /**
   * Calculate overall risk level from violations
   */
  private calculateRiskLevel(violations: SecurityViolation[]): 'low' | 'medium' | 'high' | 'critical' {
    if (violations.some(v => v.severity === 'critical')) {
      return 'critical'
    }
    if (violations.filter(v => v.severity === 'high').length >= 2) {
      return 'high'
    }
    if (violations.some(v => v.severity === 'high') || violations.filter(v => v.severity === 'medium').length >= 3) {
      return 'high'
    }
    if (violations.filter(v => v.severity === 'medium').length >= 1) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * Log network access attempt
   */
  logNetworkAttempt(url: string, method: string = 'GET', allowed: boolean = true, reason?: string): void {
    const attempt: NetworkAttempt = {
      url,
      method,
      timestamp: new Date(),
      allowed,
      reason,
    }
    
    this.networkAttempts.push(attempt)
    this.resourceUsage.networkRequestCount++

    if (!allowed) {
      logger.warn('Network access blocked', { url, method, reason })
    }
  }

  /**
   * Log file system access attempt
   */
  logFileSystemAccess(
    path: string,
    operation: 'read' | 'write' | 'execute' | 'delete',
    allowed: boolean = true,
    reason?: string
  ): void {
    const access: FileSystemAccess = {
      path,
      operation,
      timestamp: new Date(),
      allowed,
      reason,
    }
    
    this.fileSystemAccess.push(access)
    this.resourceUsage.fileOperationCount++

    if (!allowed) {
      logger.warn('File system access blocked', { path, operation, reason })
    }
  }

  /**
   * Update resource usage tracking
   */
  updateResourceUsage(usage: Partial<ResourceUsage>): void {
    this.resourceUsage = {
      ...this.resourceUsage,
      ...usage,
      maxMemoryMB: Math.max(this.resourceUsage.maxMemoryMB, usage.maxMemoryMB || 0),
      maxCpuPercent: Math.max(this.resourceUsage.maxCpuPercent, usage.maxCpuPercent || 0),
    }
  }

  /**
   * Generate comprehensive security report
   */
  generateReport(analysisResult: SecurityAnalysisResult, executionTime: number): SecurityReport {
    const report: SecurityReport = {
      analysisResult,
      networkAttempts: [...this.networkAttempts],
      fileSystemAccess: [...this.fileSystemAccess],
      resourceUsage: {
        ...this.resourceUsage,
        executionTimeMs: executionTime,
      },
      executionTime,
      violationCount: analysisResult.violations.length,
    }

    logger.info('Security report generated', {
      riskLevel: analysisResult.riskLevel,
      violationCount: report.violationCount,
      networkAttempts: report.networkAttempts.length,
      fileSystemAccess: report.fileSystemAccess.length,
    })

    return report
  }

  /**
   * Reset security tracking for new execution
   */
  reset(): void {
    this.networkAttempts = []
    this.fileSystemAccess = []
    this.resourceUsage = {
      maxMemoryMB: 0,
      maxCpuPercent: 0,
      executionTimeMs: 0,
      networkRequestCount: 0,
      fileOperationCount: 0,
    }
  }

  /**
   * Check if URL is allowed by network policy
   */
  isUrlAllowed(url: string): { allowed: boolean; reason?: string } {
    try {
      const urlObj = new URL(url)
      
      // Block local/private network access
      const privateNetworks = [
        '127.0.0.1',
        'localhost',
        '10.',
        '172.16.',
        '172.17.',
        '172.18.',
        '172.19.',
        '172.20.',
        '172.21.',
        '172.22.',
        '172.23.',
        '172.24.',
        '172.25.',
        '172.26.',
        '172.27.',
        '172.28.',
        '172.29.',
        '172.30.',
        '172.31.',
        '192.168.',
      ]

      if (privateNetworks.some(network => urlObj.hostname.startsWith(network))) {
        return { allowed: false, reason: 'Access to private networks is blocked' }
      }

      // Block dangerous protocols
      const allowedProtocols = ['http:', 'https:']
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return { allowed: false, reason: `Protocol ${urlObj.protocol} is not allowed` }
      }

      // Block suspicious ports
      const suspiciousPorts = ['22', '23', '25', '53', '135', '139', '445', '1433', '3389', '5432', '5984', '6379', '9200', '11211', '27017']
      if (urlObj.port && suspiciousPorts.includes(urlObj.port)) {
        return { allowed: false, reason: `Port ${urlObj.port} is blocked for security` }
      }

      return { allowed: true }

    } catch (error) {
      return { allowed: false, reason: 'Invalid URL format' }
    }
  }

  /**
   * Check if file path is allowed
   */
  isPathAllowed(path: string, operation: 'read' | 'write' | 'execute' | 'delete'): { allowed: boolean; reason?: string } {
    // Block access to system directories
    const systemPaths = [
      '/etc/',
      '/proc/',
      '/sys/',
      '/dev/',
      '/boot/',
      '/root/',
      '/usr/bin/',
      '/bin/',
      '/sbin/',
      '/usr/sbin/',
    ]

    if (systemPaths.some(sysPath => path.startsWith(sysPath))) {
      return { allowed: false, reason: 'Access to system directories is blocked' }
    }

    // Block sensitive files
    const sensitiveFiles = [
      '/etc/passwd',
      '/etc/shadow',
      '/etc/hosts',
      '/etc/ssh/ssh_host_rsa_key',
      '/home/.ssh/',
    ]

    if (sensitiveFiles.some(file => path.includes(file))) {
      return { allowed: false, reason: 'Access to sensitive files is blocked' }
    }

    // Only allow specific operations in temp directories
    if (operation === 'write' && !path.startsWith('/tmp/') && !path.startsWith('/var/tmp/')) {
      return { allowed: false, reason: 'Write operations only allowed in temporary directories' }
    }

    return { allowed: true }
  }
}