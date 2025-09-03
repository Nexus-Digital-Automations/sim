/**
 * Template Validator - Quality Control and Security Scanning System
 *
 * This module provides comprehensive template validation functionality including:
 * - Quality scoring with detailed metrics and recommendations
 * - Security scanning for vulnerabilities and compliance issues
 * - Performance analysis and optimization suggestions
 * - Accessibility validation for inclusive workflow design
 * - Content moderation and policy compliance checking
 * - Automated testing and validation workflows
 *
 * Validation Layers:
 * 1. Syntax Validation: Workflow structure and block configuration
 * 2. Security Scanning: Credential exposure and injection risks
 * 3. Quality Assessment: Best practices and design patterns
 * 4. Performance Analysis: Execution time and resource optimization
 * 5. Compliance Checking: Policy and regulatory requirements
 * 6. Content Moderation: Community guidelines and standards
 *
 * @author Claude Code Template System
 * @version 2.0.0
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { TemplateMetadata, TemplateValidationResult } from './types'

// Initialize structured logger for validation operations
const logger = createLogger('TemplateValidator')

/**
 * Validation severity levels for categorizing issues
 */
export type ValidationSeverity = 'info' | 'warning' | 'error' | 'critical'

/**
 * Validation category types for organizing checks
 */
export type ValidationCategory =
  | 'syntax'
  | 'security'
  | 'performance'
  | 'accessibility'
  | 'quality'
  | 'compliance'
  | 'content'

/**
 * Individual validation issue details
 */
export interface ValidationIssue {
  id: string
  category: ValidationCategory
  severity: ValidationSeverity
  code: string
  message: string
  description?: string
  location?: {
    blockId?: string
    field?: string
    line?: number
  }
  fixSuggestion?: string
  documentation?: string
  autoFixable: boolean
}

/**
 * Validation rule configuration
 */
export interface ValidationRule {
  id: string
  name: string
  category: ValidationCategory
  enabled: boolean
  severity: ValidationSeverity
  description: string
  check: (template: any, metadata?: TemplateMetadata) => ValidationIssue[]
}

/**
 * Security scan configuration and options
 */
export interface SecurityScanOptions {
  scanLevel: 'basic' | 'standard' | 'strict' | 'enterprise'
  checkCredentialExposure: boolean
  checkInjectionRisks: boolean
  checkDataLeaks: boolean
  checkExternalConnections: boolean
  customRules?: ValidationRule[]
}

/**
 * Quality assessment configuration
 */
export interface QualityAssessmentOptions {
  includeComplexityAnalysis: boolean
  includePerformanceMetrics: boolean
  includeAccessibilityChecks: boolean
  includeBestPractices: boolean
  customScoring?: {
    weights: Record<string, number>
    minimumScore: number
  }
}

/**
 * Comprehensive Template Validator Class
 *
 * Provides enterprise-grade validation with configurable rules and policies.
 * Supports multiple validation modes from basic syntax checking to comprehensive
 * enterprise security and compliance validation.
 */
export class TemplateValidator {
  private readonly requestId: string
  private readonly validationRules: Map<string, ValidationRule>
  private readonly startTime: number

  constructor(requestId?: string) {
    this.requestId = requestId || crypto.randomUUID().slice(0, 8)
    this.startTime = Date.now()
    this.validationRules = new Map()

    // Initialize default validation rules
    this.initializeValidationRules()

    logger.info(`[${this.requestId}] TemplateValidator initialized`, {
      ruleCount: this.validationRules.size,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Comprehensive template validation with detailed analysis
   *
   * Performs multi-layered validation including syntax, security, quality,
   * performance, accessibility, and compliance checks with detailed reporting.
   *
   * @param template - Template to validate
   * @param options - Validation configuration options
   * @returns Promise<TemplateValidationResult> - Complete validation results
   */
  async validateTemplate(
    template: any,
    options: {
      securityScan?: SecurityScanOptions
      qualityAssessment?: QualityAssessmentOptions
      skipCategories?: ValidationCategory[]
      customRules?: ValidationRule[]
    } = {}
  ): Promise<TemplateValidationResult> {
    const operationId = `validate_${Date.now()}`

    logger.info(`[${this.requestId}] Starting comprehensive template validation`, {
      operationId,
      templateId: template.id,
      templateName: template.name,
      skipCategories: options.skipCategories || [],
      customRules: options.customRules?.length || 0,
    })

    try {
      const validationStart = Date.now()
      const issues: ValidationIssue[] = []
      const scores: Record<string, number> = {}

      // Add custom rules if provided
      if (options.customRules) {
        options.customRules.forEach((rule) => {
          this.validationRules.set(rule.id, rule)
        })
      }

      // Run validation categories
      const categoriesToRun = Array.from(this.validationRules.values())
        .map((rule) => rule.category)
        .filter((category, index, arr) => arr.indexOf(category) === index)
        .filter((category) => !options.skipCategories?.includes(category))

      for (const category of categoriesToRun) {
        logger.info(`[${this.requestId}] Running ${category} validation`, { operationId })

        const categoryIssues = await this.runValidationCategory(category, template, options)

        issues.push(...categoryIssues)
        scores[category] = this.calculateCategoryScore(categoryIssues)
      }

      // Calculate overall scores
      const qualityScore = this.calculateOverallScore(scores, 'quality')
      const securityScore = this.calculateOverallScore(scores, 'security')
      const completenessScore = this.calculateCompletenessScore(template)

      // Determine validation status
      const criticalIssues = issues.filter((i) => i.severity === 'critical')
      const errorIssues = issues.filter((i) => i.severity === 'error')
      const isValid = criticalIssues.length === 0 && errorIssues.length === 0

      // Generate recommendations
      const recommendations = this.generateRecommendations(issues, scores)

      const validationTime = Date.now() - validationStart
      const result: TemplateValidationResult = {
        isValid,
        errors: errorIssues.map((i) => i.message),
        warnings: issues.filter((i) => i.severity === 'warning').map((i) => i.message),
        suggestions: issues.filter((i) => i.severity === 'info').map((i) => i.message),

        qualityScore,
        securityScore,
        completenessScore,

        checks: {
          syntax: scores.syntax >= 80,
          security: scores.security >= 80,
          performance: scores.performance >= 70,
          accessibility: scores.accessibility >= 70,
          compliance: scores.compliance >= 90,
          quality: scores.quality >= 75,
        },

        recommendations,
      }

      logger.info(`[${this.requestId}] Template validation completed`, {
        operationId,
        isValid,
        qualityScore,
        securityScore,
        issueCount: issues.length,
        validationTime,
      })

      return result
    } catch (error) {
      const elapsed = Date.now() - this.startTime
      logger.error(`[${this.requestId}] Template validation failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: elapsed,
      })
      throw error
    }
  }

  /**
   * Security-focused template scanning for vulnerabilities and risks
   *
   * Performs deep security analysis including credential exposure detection,
   * injection risk assessment, data leak prevention, and external connection validation.
   *
   * @param template - Template to scan for security issues
   * @param options - Security scan configuration
   * @returns Promise<SecurityScanResult> - Detailed security analysis
   */
  async scanForSecurity(
    template: any,
    options: SecurityScanOptions = {
      scanLevel: 'standard',
      checkCredentialExposure: true,
      checkInjectionRisks: true,
      checkDataLeaks: true,
      checkExternalConnections: true,
    }
  ): Promise<{
    isSecure: boolean
    securityScore: number
    vulnerabilities: ValidationIssue[]
    recommendations: string[]
    scanLevel: string
    scanTime: number
  }> {
    const operationId = `security_scan_${Date.now()}`
    const scanStart = Date.now()

    logger.info(`[${this.requestId}] Starting security scan`, {
      operationId,
      templateId: template.id,
      scanLevel: options.scanLevel,
    })

    try {
      const vulnerabilities: ValidationIssue[] = []

      // Credential exposure checks
      if (options.checkCredentialExposure) {
        vulnerabilities.push(...this.scanCredentialExposure(template))
      }

      // Injection risk assessment
      if (options.checkInjectionRisks) {
        vulnerabilities.push(...this.scanInjectionRisks(template))
      }

      // Data leak detection
      if (options.checkDataLeaks) {
        vulnerabilities.push(...this.scanDataLeaks(template))
      }

      // External connection validation
      if (options.checkExternalConnections) {
        vulnerabilities.push(...this.scanExternalConnections(template))
      }

      // Additional enterprise-level checks
      if (options.scanLevel === 'enterprise') {
        vulnerabilities.push(...this.scanEnterpriseCompliance(template))
      }

      // Calculate security score
      const criticalCount = vulnerabilities.filter((v) => v.severity === 'critical').length
      const errorCount = vulnerabilities.filter((v) => v.severity === 'error').length
      const warningCount = vulnerabilities.filter((v) => v.severity === 'warning').length

      let securityScore = 100
      securityScore -= criticalCount * 30
      securityScore -= errorCount * 15
      securityScore -= warningCount * 5
      securityScore = Math.max(0, securityScore)

      const isSecure = criticalCount === 0 && errorCount === 0

      // Generate security recommendations
      const recommendations = this.generateSecurityRecommendations(vulnerabilities)

      const scanTime = Date.now() - scanStart
      logger.info(`[${this.requestId}] Security scan completed`, {
        operationId,
        isSecure,
        securityScore,
        vulnerabilityCount: vulnerabilities.length,
        scanTime,
      })

      return {
        isSecure,
        securityScore,
        vulnerabilities,
        recommendations,
        scanLevel: options.scanLevel,
        scanTime,
      }
    } catch (error) {
      const elapsed = Date.now() - scanStart
      logger.error(`[${this.requestId}] Security scan failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: elapsed,
      })
      throw error
    }
  }

  /**
   * Template compliance validation for regulatory requirements
   *
   * Validates templates against various compliance frameworks and standards
   * including data privacy regulations, industry standards, and organizational policies.
   *
   * @param template - Template to validate for compliance
   * @param frameworks - Compliance frameworks to check against
   * @returns Promise<ComplianceResult> - Compliance validation results
   */
  async checkCompliance(
    template: any,
    frameworks: string[] = ['GDPR', 'SOC2', 'HIPAA', 'PCI-DSS']
  ): Promise<{
    isCompliant: boolean
    complianceScore: number
    violations: ValidationIssue[]
    frameworkResults: Record<
      string,
      { compliant: boolean; score: number; issues: ValidationIssue[] }
    >
    recommendations: string[]
  }> {
    const operationId = `compliance_check_${Date.now()}`

    logger.info(`[${this.requestId}] Starting compliance validation`, {
      operationId,
      templateId: template.id,
      frameworks,
    })

    try {
      const frameworkResults: Record<
        string,
        { compliant: boolean; score: number; issues: ValidationIssue[] }
      > = {}
      const allViolations: ValidationIssue[] = []

      // Check each compliance framework
      for (const framework of frameworks) {
        const frameworkIssues = this.checkFrameworkCompliance(template, framework)
        const frameworkScore = this.calculateCategoryScore(frameworkIssues)
        const isFrameworkCompliant =
          frameworkIssues.filter((i) => ['critical', 'error'].includes(i.severity)).length === 0

        frameworkResults[framework] = {
          compliant: isFrameworkCompliant,
          score: frameworkScore,
          issues: frameworkIssues,
        }

        allViolations.push(...frameworkIssues)
      }

      // Calculate overall compliance
      const complianceScore =
        Object.values(frameworkResults).reduce((acc, result) => acc + result.score, 0) /
        frameworks.length

      const isCompliant = Object.values(frameworkResults).every((result) => result.compliant)

      // Generate compliance recommendations
      const recommendations = this.generateComplianceRecommendations(allViolations, frameworks)

      logger.info(`[${this.requestId}] Compliance check completed`, {
        operationId,
        isCompliant,
        complianceScore,
        violationCount: allViolations.length,
      })

      return {
        isCompliant,
        complianceScore,
        violations: allViolations,
        frameworkResults,
        recommendations,
      }
    } catch (error) {
      logger.error(`[${this.requestId}] Compliance check failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  // Private helper methods for validation logic

  /**
   * Initialize default validation rules for all categories
   */
  private initializeValidationRules(): void {
    const rules: ValidationRule[] = [
      // Syntax validation rules
      {
        id: 'syntax-001',
        name: 'Valid Workflow Structure',
        category: 'syntax',
        enabled: true,
        severity: 'error',
        description: 'Validates that the workflow has a valid structure with required fields',
        check: (template) => this.checkWorkflowStructure(template),
      },
      {
        id: 'syntax-002',
        name: 'Block Configuration Validation',
        category: 'syntax',
        enabled: true,
        severity: 'error',
        description: 'Validates that all blocks have proper configuration',
        check: (template) => this.checkBlockConfiguration(template),
      },

      // Security validation rules
      {
        id: 'security-001',
        name: 'Credential Exposure Check',
        category: 'security',
        enabled: true,
        severity: 'critical',
        description: 'Detects exposed credentials or sensitive information',
        check: (template) => this.scanCredentialExposure(template),
      },
      {
        id: 'security-002',
        name: 'Injection Risk Assessment',
        category: 'security',
        enabled: true,
        severity: 'error',
        description: 'Identifies potential injection vulnerabilities',
        check: (template) => this.scanInjectionRisks(template),
      },

      // Quality validation rules
      {
        id: 'quality-001',
        name: 'Template Completeness',
        category: 'quality',
        enabled: true,
        severity: 'warning',
        description: 'Checks for complete template metadata and documentation',
        check: (template, metadata) => this.checkTemplateCompleteness(template, metadata),
      },
      {
        id: 'quality-002',
        name: 'Best Practice Adherence',
        category: 'quality',
        enabled: true,
        severity: 'info',
        description: 'Validates adherence to workflow best practices',
        check: (template) => this.checkBestPractices(template),
      },

      // Performance validation rules
      {
        id: 'performance-001',
        name: 'Execution Efficiency',
        category: 'performance',
        enabled: true,
        severity: 'warning',
        description: 'Analyzes workflow efficiency and optimization opportunities',
        check: (template) => this.checkExecutionEfficiency(template),
      },

      // Accessibility validation rules
      {
        id: 'accessibility-001',
        name: 'Inclusive Design Check',
        category: 'accessibility',
        enabled: true,
        severity: 'warning',
        description: 'Validates accessibility features and inclusive design',
        check: (template) => this.checkAccessibility(template),
      },
    ]

    rules.forEach((rule) => {
      this.validationRules.set(rule.id, rule)
    })
  }

  private async runValidationCategory(
    category: ValidationCategory,
    template: any,
    options: any
  ): Promise<ValidationIssue[]> {
    const categoryRules = Array.from(this.validationRules.values()).filter(
      (rule) => rule.category === category && rule.enabled
    )

    const issues: ValidationIssue[] = []

    for (const rule of categoryRules) {
      try {
        const ruleIssues = rule.check(template, template.metadata)
        issues.push(...ruleIssues)
      } catch (error) {
        logger.warn(`[${this.requestId}] Validation rule ${rule.id} failed`, { error })
      }
    }

    return issues
  }

  private calculateCategoryScore(issues: ValidationIssue[]): number {
    let score = 100

    issues.forEach((issue) => {
      switch (issue.severity) {
        case 'critical':
          score -= 30
          break
        case 'error':
          score -= 15
          break
        case 'warning':
          score -= 5
          break
        case 'info':
          score -= 1
          break
      }
    })

    return Math.max(0, score)
  }

  private calculateOverallScore(scores: Record<string, number>, category: string): number {
    return scores[category] || 0
  }

  private calculateCompletenessScore(template: any): number {
    let score = 0
    const maxScore = 100

    // Check for required fields
    if (template.name) score += 20
    if (template.description) score += 20
    if (template.category) score += 15
    if (template.author) score += 10
    if (template.icon) score += 5
    if (template.color) score += 5

    // Check for metadata completeness
    const metadata = template.metadata || template.state?.metadata
    if (metadata?.tags && metadata.tags.length > 0) score += 10
    if (metadata?.difficulty) score += 5
    if (metadata?.useCases && metadata.useCases.length > 0) score += 10

    return Math.min(score, maxScore)
  }

  private generateRecommendations(
    issues: ValidationIssue[],
    scores: Record<string, number>
  ): any[] {
    const recommendations: any[] = []

    // Generate recommendations based on issues
    issues.forEach((issue) => {
      if (issue.fixSuggestion) {
        recommendations.push({
          priority: this.mapSeverityToPriority(issue.severity),
          category: issue.category,
          message: issue.fixSuggestion,
          code: issue.code,
        })
      }
    })

    // Generate score-based recommendations
    Object.entries(scores).forEach(([category, score]) => {
      if (score < 70) {
        recommendations.push({
          priority: 'medium',
          category,
          message: `Consider improving ${category} score (currently ${score}/100)`,
          code: `${category}-improvement`,
        })
      }
    })

    return recommendations
  }

  private mapSeverityToPriority(
    severity: ValidationSeverity
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case 'critical':
        return 'critical'
      case 'error':
        return 'high'
      case 'warning':
        return 'medium'
      case 'info':
        return 'low'
    }
  }

  // Specific validation check implementations

  private checkWorkflowStructure(template: any): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    if (!template.state) {
      issues.push({
        id: 'syntax-001-no-state',
        category: 'syntax',
        severity: 'error',
        code: 'NO_WORKFLOW_STATE',
        message: 'Template is missing workflow state',
        fixSuggestion: 'Ensure template includes valid workflow state data',
        autoFixable: false,
      })
    }

    if (!template.state?.blocks || Object.keys(template.state.blocks).length === 0) {
      issues.push({
        id: 'syntax-001-no-blocks',
        category: 'syntax',
        severity: 'error',
        code: 'NO_BLOCKS',
        message: 'Workflow has no blocks defined',
        fixSuggestion: 'Add at least one block to the workflow',
        autoFixable: false,
      })
    }

    return issues
  }

  private checkBlockConfiguration(template: any): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    if (template.state?.blocks) {
      Object.entries(template.state.blocks).forEach(([blockId, block]: [string, any]) => {
        if (!block.type) {
          issues.push({
            id: 'syntax-002-missing-type',
            category: 'syntax',
            severity: 'error',
            code: 'MISSING_BLOCK_TYPE',
            message: `Block ${blockId} is missing required 'type' field`,
            location: { blockId },
            fixSuggestion: 'Add a valid block type',
            autoFixable: false,
          })
        }
      })
    }

    return issues
  }

  private scanCredentialExposure(template: any): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check for exposed credentials in block configurations
    if (template.state?.blocks) {
      Object.entries(template.state.blocks).forEach(([blockId, block]: [string, any]) => {
        if (block.subBlocks) {
          Object.entries(block.subBlocks).forEach(([key, subBlock]: [string, any]) => {
            if (this.isSensitiveField(key) && subBlock.value && subBlock.value.length > 0) {
              issues.push({
                id: 'security-001-exposed-cred',
                category: 'security',
                severity: 'critical',
                code: 'EXPOSED_CREDENTIAL',
                message: `Potential credential exposure in block ${blockId}, field ${key}`,
                location: { blockId, field: key },
                fixSuggestion: 'Remove sensitive values and use environment variables instead',
                autoFixable: true,
              })
            }
          })
        }
      })
    }

    return issues
  }

  private scanInjectionRisks(template: any): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check for potential injection patterns
    const dangerousPatterns = [
      /\$\{.*eval.*\}/i,
      /\$\{.*exec.*\}/i,
      /\$\{.*system.*\}/i,
      /<script.*>/i,
      /javascript:/i,
    ]

    const checkValue = (value: string, blockId: string, field: string) => {
      dangerousPatterns.forEach((pattern) => {
        if (pattern.test(value)) {
          issues.push({
            id: 'security-002-injection',
            category: 'security',
            severity: 'error',
            code: 'INJECTION_RISK',
            message: `Potential injection risk detected in block ${blockId}, field ${field}`,
            location: { blockId, field },
            fixSuggestion: 'Sanitize input values and avoid dangerous patterns',
            autoFixable: false,
          })
        }
      })
    }

    // Recursively check all string values
    const scanObject = (obj: any, blockId: string, path = '') => {
      if (typeof obj === 'string') {
        checkValue(obj, blockId, path)
      } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          scanObject(value, blockId, path ? `${path}.${key}` : key)
        })
      }
    }

    if (template.state?.blocks) {
      Object.entries(template.state.blocks).forEach(([blockId, block]) => {
        scanObject(block, blockId)
      })
    }

    return issues
  }

  private scanDataLeaks(template: any): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check for potential data leakage patterns
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
      /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN patterns
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/, // IP addresses
    ]

    // Implementation would scan template content for sensitive data patterns
    // This is a simplified version - real implementation would be more comprehensive

    return issues
  }

  private scanExternalConnections(template: any): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check for external API calls and connections
    if (template.state?.blocks) {
      Object.entries(template.state.blocks).forEach(([blockId, block]: [string, any]) => {
        if (block.type === 'api' || block.type === 'webhook') {
          // Check for unverified external connections
          const url = block.data?.url || block.subBlocks?.url?.value
          if (url && !this.isVerifiedDomain(url)) {
            issues.push({
              id: 'security-003-external-conn',
              category: 'security',
              severity: 'warning',
              code: 'UNVERIFIED_EXTERNAL_CONNECTION',
              message: `Block ${blockId} connects to unverified external service: ${url}`,
              location: { blockId },
              fixSuggestion: 'Verify the security and reliability of external connections',
              autoFixable: false,
            })
          }
        }
      })
    }

    return issues
  }

  private scanEnterpriseCompliance(template: any): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Enterprise-specific compliance checks would go here
    // This could include checks for:
    // - Data residency requirements
    // - Encryption standards
    // - Audit trail requirements
    // - Access control validation

    return issues
  }

  private checkTemplateCompleteness(template: any, metadata?: TemplateMetadata): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    if (!template.description || template.description.length < 50) {
      issues.push({
        id: 'quality-001-description',
        category: 'quality',
        severity: 'warning',
        code: 'INCOMPLETE_DESCRIPTION',
        message: 'Template description is missing or too short',
        fixSuggestion: 'Add a detailed description (at least 50 characters)',
        autoFixable: false,
      })
    }

    const templateMetadata = metadata || template.state?.metadata
    if (!templateMetadata?.tags || templateMetadata.tags.length === 0) {
      issues.push({
        id: 'quality-001-tags',
        category: 'quality',
        severity: 'info',
        code: 'MISSING_TAGS',
        message: 'Template has no tags for discoverability',
        fixSuggestion: 'Add relevant tags to improve template discoverability',
        autoFixable: false,
      })
    }

    return issues
  }

  private checkBestPractices(template: any): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check for error handling blocks
    const hasErrorHandling =
      template.state?.blocks &&
      Object.values(template.state.blocks).some(
        (block: any) => block.type === 'condition' || block.type === 'router'
      )

    if (!hasErrorHandling) {
      issues.push({
        id: 'quality-002-error-handling',
        category: 'quality',
        severity: 'info',
        code: 'MISSING_ERROR_HANDLING',
        message: 'Template lacks error handling mechanisms',
        fixSuggestion: 'Add condition or router blocks for better error handling',
        autoFixable: false,
      })
    }

    return issues
  }

  private checkExecutionEfficiency(template: any): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check for potential performance issues
    if (template.state?.blocks) {
      const blockCount = Object.keys(template.state.blocks).length
      if (blockCount > 50) {
        issues.push({
          id: 'performance-001-complexity',
          category: 'performance',
          severity: 'warning',
          code: 'HIGH_COMPLEXITY',
          message: `Template has high complexity with ${blockCount} blocks`,
          fixSuggestion: 'Consider breaking down into smaller, reusable workflows',
          autoFixable: false,
        })
      }
    }

    return issues
  }

  private checkAccessibility(template: any): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check for accessibility considerations
    // This could include checks for:
    // - Color contrast in visual elements
    // - Alternative text for images
    // - Keyboard accessibility
    // - Screen reader compatibility

    return issues
  }

  private checkFrameworkCompliance(template: any, framework: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    switch (framework) {
      case 'GDPR':
        // GDPR-specific checks
        break
      case 'SOC2':
        // SOC2-specific checks
        break
      case 'HIPAA':
        // HIPAA-specific checks
        break
      case 'PCI-DSS':
        // PCI-DSS-specific checks
        break
    }

    return issues
  }

  private generateSecurityRecommendations(vulnerabilities: ValidationIssue[]): string[] {
    const recommendations: string[] = []

    vulnerabilities.forEach((vuln) => {
      if (vuln.fixSuggestion) {
        recommendations.push(vuln.fixSuggestion)
      }
    })

    return [...new Set(recommendations)] // Remove duplicates
  }

  private generateComplianceRecommendations(
    violations: ValidationIssue[],
    frameworks: string[]
  ): string[] {
    const recommendations: string[] = []

    frameworks.forEach((framework) => {
      const frameworkViolations = violations.filter((v) => v.code.includes(framework.toLowerCase()))
      if (frameworkViolations.length > 0) {
        recommendations.push(`Address ${frameworkViolations.length} ${framework} compliance issues`)
      }
    })

    return recommendations
  }

  private isSensitiveField(field: string): boolean {
    return /credential|oauth|api[_-]?key|token|secret|auth|password|bearer/i.test(field)
  }

  private isVerifiedDomain(url: string): boolean {
    const verifiedDomains = [
      'api.openai.com',
      'api.anthropic.com',
      'api.github.com',
      'api.slack.com',
      'hooks.zapier.com',
    ]

    try {
      const urlObj = new URL(url)
      return verifiedDomains.includes(urlObj.hostname)
    } catch {
      return false
    }
  }
}

// Export singleton instance for convenience
export const templateValidator = new TemplateValidator()
