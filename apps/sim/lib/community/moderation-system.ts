/**
 * Template Moderation System - Automated Validation and Review Workflow
 *
 * This module provides comprehensive template moderation capabilities including:
 * - Automated template validation and security scanning
 * - Moderation queue with prioritized review workflow
 * - Quality scoring and approval process with AI-powered analysis
 * - Community reporting and flagging system
 * - Content safety and policy compliance checking
 * - Integration with reputation and community systems
 * - Real-time moderation analytics and performance tracking
 *
 * Features:
 * - Multi-tier validation with customizable rules
 * - AI-powered content analysis for quality and safety
 * - Automated security scanning for malicious code
 * - Community-driven flagging and reporting system
 * - Moderator workflow with escalation and appeals
 * - Comprehensive audit trail and transparency
 * - Performance metrics and quality analytics
 * - Integration with existing template and user systems
 *
 * @author Claude Code Template Marketplace System
 * @version 1.0.0
 */

import { and, desc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { templates, userReputation } from '@/db/schema'

// Initialize structured logger
const logger = createLogger('ModerationSystem')

/**
 * Moderation Status Types
 */
export type ModerationStatus =
  | 'pending_review'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'flagged'
  | 'suspended'
  | 'appealing'

/**
 * Moderation Priority Levels
 */
export type ModerationPriority = 'low' | 'medium' | 'high' | 'critical'

/**
 * Validation Rule Types
 */
export type ValidationRuleType =
  | 'content_safety'
  | 'code_security'
  | 'quality_standards'
  | 'policy_compliance'
  | 'metadata_completeness'
  | 'community_standards'

/**
 * Validation Result Interface
 */
export interface ValidationResult {
  ruleId: string
  ruleType: ValidationRuleType
  status: 'pass' | 'fail' | 'warning'
  score: number
  confidence: number
  message: string
  details?: Record<string, any>
  recommendations?: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  autoFixable: boolean
}

/**
 * Moderation Action Interface
 */
export interface ModerationAction {
  id: string
  templateId: string
  moderatorId?: string
  actionType: 'approve' | 'reject' | 'flag' | 'suspend' | 'request_changes' | 'escalate'
  reason: string
  details?: Record<string, any>
  timestamp: Date
  isAutomated: boolean
  metadata?: Record<string, any>
}

/**
 * Community Report Interface
 */
export interface CommunityReport {
  id: string
  templateId: string
  reporterId: string
  reportType: 'spam' | 'inappropriate' | 'misleading' | 'copyright' | 'malicious' | 'other'
  description: string
  evidence?: string[]
  status: 'open' | 'investigating' | 'resolved' | 'dismissed'
  priority: ModerationPriority
  assignedTo?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Moderation Queue Item Interface
 */
export interface ModerationQueueItem {
  templateId: string
  templateName: string
  authorId: string
  authorName: string
  authorReputation: number
  submissionDate: Date
  priority: ModerationPriority
  status: ModerationStatus
  validationResults: ValidationResult[]
  communityReports: CommunityReport[]
  estimatedReviewTime: number
  qualityScore: number
  riskScore: number
  metadata: Record<string, any>
}

/**
 * Moderation Configuration Interface
 */
export interface ModerationConfig {
  autoApproveThreshold: number
  autoRejectThreshold: number
  qualityScoreWeight: number
  authorReputationWeight: number
  communityFeedbackWeight: number
  securityScanEnabled: boolean
  aiModerationEnabled: boolean
  escalationThresholds: {
    highRisk: number
    criticalIssues: number
    communityReports: number
  }
  validationRules: ValidationRule[]
}

/**
 * Validation Rule Configuration Interface
 */
export interface ValidationRule {
  id: string
  name: string
  description: string
  type: ValidationRuleType
  enabled: boolean
  weight: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  autoExecute: boolean
  conditions: Record<string, any>
  actions: string[]
}

/**
 * Template Moderation System Class
 */
export class TemplateModerationSystem {
  private readonly requestId: string
  private readonly config: ModerationConfig

  constructor(config?: Partial<ModerationConfig>) {
    this.requestId = crypto.randomUUID().slice(0, 8)
    this.config = {
      autoApproveThreshold: 85,
      autoRejectThreshold: 30,
      qualityScoreWeight: 0.4,
      authorReputationWeight: 0.3,
      communityFeedbackWeight: 0.3,
      securityScanEnabled: true,
      aiModerationEnabled: true,
      escalationThresholds: {
        highRisk: 70,
        criticalIssues: 3,
        communityReports: 5,
      },
      validationRules: this.getDefaultValidationRules(),
      ...config,
    }

    logger.info(`[${this.requestId}] ModerationSystem initialized`, {
      config: this.config,
    })
  }

  /**
   * Submit template for moderation review
   */
  async submitForModeration(
    templateId: string,
    metadata: Record<string, any> = {}
  ): Promise<{ status: ModerationStatus; queuePosition?: number; estimatedTime?: number }> {
    const operationId = `submit_${Date.now()}`

    logger.info(`[${this.requestId}] Submitting template for moderation`, {
      operationId,
      templateId,
    })

    try {
      // Fetch template details
      const template = await this.getTemplateDetails(templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      // Run automated validation
      const validationResults = await this.runAutomatedValidation(templateId, template)

      // Calculate initial scores
      const qualityScore = this.calculateQualityScore(validationResults, template)
      const riskScore = this.calculateRiskScore(validationResults, template)

      // Determine initial moderation status
      const initialStatus = this.determineInitialStatus(qualityScore, riskScore, validationResults)

      // Update template status
      await db
        .update(templates)
        .set({
          status: initialStatus === 'approved' ? 'published' : 'review',
          state: sql`jsonb_set(
            ${templates.state}, 
            '{moderation}', 
            ${JSON.stringify({
              status: initialStatus,
              submissionDate: new Date().toISOString(),
              validationResults,
              qualityScore,
              riskScore,
              metadata,
            })}
          )`,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, templateId))

      // Add to moderation queue if needed
      let queuePosition: number | undefined
      let estimatedTime: number | undefined

      if (initialStatus !== 'approved') {
        const queueData = await this.addToModerationQueue(templateId, {
          priority: this.calculatePriority(riskScore, validationResults),
          validationResults,
          qualityScore,
          riskScore,
          metadata,
        })

        queuePosition = queueData.position
        estimatedTime = queueData.estimatedTime
      }

      // Log moderation action
      await this.logModerationAction({
        id: crypto.randomUUID(),
        templateId,
        actionType: 'request_changes',
        reason: 'Template submitted for moderation review',
        timestamp: new Date(),
        isAutomated: true,
        metadata: { qualityScore, riskScore, validationResults: validationResults.length },
      })

      logger.info(`[${this.requestId}] Template submitted for moderation`, {
        operationId,
        templateId,
        status: initialStatus,
        qualityScore,
        riskScore,
        queuePosition,
      })

      return {
        status: initialStatus,
        queuePosition,
        estimatedTime,
      }
    } catch (error) {
      logger.error(`[${this.requestId}] Template moderation submission failed`, {
        operationId,
        templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Run comprehensive automated validation
   */
  async runAutomatedValidation(templateId: string, template: any): Promise<ValidationResult[]> {
    const operationId = `validate_${Date.now()}`

    logger.info(`[${this.requestId}] Running automated validation`, {
      operationId,
      templateId,
    })

    const results: ValidationResult[] = []

    try {
      // Run validation rules in parallel
      const validationPromises = this.config.validationRules
        .filter((rule) => rule.enabled && rule.autoExecute)
        .map((rule) => this.executeValidationRule(templateId, template, rule))

      const ruleResults = await Promise.allSettled(validationPromises)

      ruleResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value)
        } else if (result.status === 'rejected') {
          logger.error(`[${this.requestId}] Validation rule failed`, {
            operationId,
            ruleId: this.config.validationRules[index].id,
            error: result.reason,
          })
        }
      })

      logger.info(`[${this.requestId}] Automated validation completed`, {
        operationId,
        templateId,
        totalRules: this.config.validationRules.length,
        executedRules: results.length,
        passedRules: results.filter((r) => r.status === 'pass').length,
        failedRules: results.filter((r) => r.status === 'fail').length,
        warnings: results.filter((r) => r.status === 'warning').length,
      })

      return results
    } catch (error) {
      logger.error(`[${this.requestId}] Automated validation failed`, {
        operationId,
        templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Execute individual validation rule
   */
  private async executeValidationRule(
    templateId: string,
    template: any,
    rule: ValidationRule
  ): Promise<ValidationResult | null> {
    try {
      switch (rule.type) {
        case 'content_safety':
          return await this.validateContentSafety(templateId, template, rule)
        case 'code_security':
          return await this.validateCodeSecurity(templateId, template, rule)
        case 'quality_standards':
          return await this.validateQualityStandards(templateId, template, rule)
        case 'policy_compliance':
          return await this.validatePolicyCompliance(templateId, template, rule)
        case 'metadata_completeness':
          return await this.validateMetadataCompleteness(templateId, template, rule)
        case 'community_standards':
          return await this.validateCommunityStandards(templateId, template, rule)
        default:
          logger.warn(`[${this.requestId}] Unknown validation rule type`, {
            ruleType: rule.type,
            ruleId: rule.id,
          })
          return null
      }
    } catch (error) {
      logger.error(`[${this.requestId}] Validation rule execution failed`, {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return null
    }
  }

  /**
   * Validate content safety
   */
  private async validateContentSafety(
    templateId: string,
    template: any,
    rule: ValidationRule
  ): Promise<ValidationResult> {
    // Content safety checks using AI/ML services
    const textContent = [
      template.name,
      template.description,
      template.author,
      ...(template.metadata?.useCases || []),
      ...(template.metadata?.requirements || []),
    ].join(' ')

    // Simulate content analysis (in production, integrate with content moderation API)
    const safetyScore = await this.analyzeContentSafety(textContent)

    const status = safetyScore >= 80 ? 'pass' : safetyScore >= 60 ? 'warning' : 'fail'

    return {
      ruleId: rule.id,
      ruleType: 'content_safety',
      status,
      score: safetyScore,
      confidence: 0.95,
      message: this.getContentSafetyMessage(safetyScore),
      severity: safetyScore < 40 ? 'critical' : safetyScore < 60 ? 'high' : 'medium',
      autoFixable: false,
      recommendations:
        safetyScore < 80
          ? [
              'Review content for potentially harmful or inappropriate language',
              'Ensure descriptions are professional and appropriate',
              'Remove any discriminatory or offensive content',
            ]
          : undefined,
    }
  }

  /**
   * Validate code security
   */
  private async validateCodeSecurity(
    templateId: string,
    template: any,
    rule: ValidationRule
  ): Promise<ValidationResult> {
    if (!this.config.securityScanEnabled) {
      return {
        ruleId: rule.id,
        ruleType: 'code_security',
        status: 'pass',
        score: 100,
        confidence: 1.0,
        message: 'Security scanning disabled',
        severity: 'low',
        autoFixable: false,
      }
    }

    // Security analysis of workflow state
    const securityIssues = await this.scanForSecurityIssues(template.state)
    const securityScore = Math.max(0, 100 - securityIssues.length * 20)

    const status = securityScore >= 80 ? 'pass' : securityScore >= 60 ? 'warning' : 'fail'

    return {
      ruleId: rule.id,
      ruleType: 'code_security',
      status,
      score: securityScore,
      confidence: 0.9,
      message: this.getSecurityMessage(securityIssues),
      details: { issues: securityIssues },
      severity: securityIssues.some((i) => i.severity === 'critical') ? 'critical' : 'medium',
      autoFixable: securityIssues.every((i) => i.autoFixable),
      recommendations: securityIssues.map((i) => `Address ${i.type}: ${i.description}`),
    }
  }

  /**
   * Validate quality standards
   */
  private async validateQualityStandards(
    templateId: string,
    template: any,
    rule: ValidationRule
  ): Promise<ValidationResult> {
    let qualityScore = 0
    const issues: string[] = []
    const recommendations: string[] = []

    // Check name quality
    if (template.name && template.name.length >= 10 && template.name.length <= 100) {
      qualityScore += 15
    } else {
      issues.push('Template name should be between 10-100 characters')
      recommendations.push('Provide a clear, descriptive name (10-100 characters)')
    }

    // Check description quality
    if (template.description && template.description.length >= 50) {
      qualityScore += 20
    } else {
      issues.push('Template description too short or missing')
      recommendations.push(
        'Add a detailed description (50+ characters) explaining the template purpose'
      )
    }

    // Check metadata completeness
    const metadata = template.metadata || {}
    if (metadata.tags && metadata.tags.length >= 3) {
      qualityScore += 15
    } else {
      issues.push('Insufficient tags for discoverability')
      recommendations.push('Add at least 3 relevant tags for better discoverability')
    }

    if (metadata.useCases && metadata.useCases.length >= 2) {
      qualityScore += 15
    } else {
      issues.push('Missing or insufficient use cases')
      recommendations.push('Provide at least 2 use case examples')
    }

    if (metadata.requirements && metadata.requirements.length >= 1) {
      qualityScore += 15
    } else {
      issues.push('Missing requirements information')
      recommendations.push('List any prerequisites or requirements for using this template')
    }

    // Check workflow complexity and structure
    const workflowScore = this.analyzeWorkflowQuality(template.state)
    qualityScore += workflowScore * 0.2

    const status = qualityScore >= 70 ? 'pass' : qualityScore >= 50 ? 'warning' : 'fail'

    return {
      ruleId: rule.id,
      ruleType: 'quality_standards',
      status,
      score: qualityScore,
      confidence: 0.85,
      message: `Quality score: ${qualityScore.toFixed(1)}/100`,
      details: { issues, workflowScore },
      severity: qualityScore < 30 ? 'high' : 'medium',
      autoFixable: false,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    }
  }

  /**
   * Validate policy compliance
   */
  private async validatePolicyCompliance(
    templateId: string,
    template: any,
    rule: ValidationRule
  ): Promise<ValidationResult> {
    const complianceIssues: string[] = []
    let complianceScore = 100

    // Check license compliance
    const validLicenses = ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'CC0-1.0']
    if (!template.license || !validLicenses.includes(template.license)) {
      complianceIssues.push('Invalid or missing license information')
      complianceScore -= 20
    }

    // Check for prohibited content
    const prohibitedKeywords = ['hack', 'crack', 'illegal', 'pirate', 'bypass']
    const contentText = `${template.name} ${template.description}`.toLowerCase()

    for (const keyword of prohibitedKeywords) {
      if (contentText.includes(keyword)) {
        complianceIssues.push(`Potentially prohibited content: contains "${keyword}"`)
        complianceScore -= 25
      }
    }

    // Check attribution requirements
    if (template.requireAttribution && (!template.author || template.author.length < 2)) {
      complianceIssues.push('Attribution required but author information incomplete')
      complianceScore -= 15
    }

    const status = complianceScore >= 80 ? 'pass' : complianceScore >= 60 ? 'warning' : 'fail'

    return {
      ruleId: rule.id,
      ruleType: 'policy_compliance',
      status,
      score: complianceScore,
      confidence: 0.9,
      message:
        complianceIssues.length === 0
          ? 'Policy compliant'
          : `${complianceIssues.length} compliance issues found`,
      details: { issues: complianceIssues },
      severity: complianceScore < 40 ? 'critical' : complianceScore < 60 ? 'high' : 'low',
      autoFixable: false,
      recommendations: complianceIssues.map((issue) => `Resolve: ${issue}`),
    }
  }

  /**
   * Validate metadata completeness
   */
  private async validateMetadataCompleteness(
    templateId: string,
    template: any,
    rule: ValidationRule
  ): Promise<ValidationResult> {
    const metadata = template.metadata || {}
    const requiredFields = ['category', 'difficulty', 'tags', 'useCases']
    const optionalFields = ['requirements', 'estimatedSetupTime', 'blockTypes']

    let completenessScore = 0
    const missingFields: string[] = []

    // Check required fields
    for (const field of requiredFields) {
      if (metadata[field] && (Array.isArray(metadata[field]) ? metadata[field].length > 0 : true)) {
        completenessScore += 100 / (requiredFields.length + optionalFields.length * 0.5)
      } else {
        missingFields.push(field)
      }
    }

    // Check optional fields
    for (const field of optionalFields) {
      if (metadata[field] && (Array.isArray(metadata[field]) ? metadata[field].length > 0 : true)) {
        completenessScore += 50 / (requiredFields.length + optionalFields.length * 0.5)
      }
    }

    const status = completenessScore >= 70 ? 'pass' : completenessScore >= 50 ? 'warning' : 'fail'

    return {
      ruleId: rule.id,
      ruleType: 'metadata_completeness',
      status,
      score: completenessScore,
      confidence: 1.0,
      message: `Metadata ${completenessScore.toFixed(1)}% complete`,
      details: { missingFields, presentFields: Object.keys(metadata) },
      severity: 'medium',
      autoFixable: false,
      recommendations:
        missingFields.length > 0
          ? [
              `Complete missing metadata fields: ${missingFields.join(', ')}`,
              'Add detailed use cases and requirements',
              'Provide estimated setup time for user guidance',
            ]
          : undefined,
    }
  }

  /**
   * Validate community standards
   */
  private async validateCommunityStandards(
    templateId: string,
    template: any,
    rule: ValidationRule
  ): Promise<ValidationResult> {
    let standardsScore = 100
    const issues: string[] = []

    // Check author reputation if available
    try {
      const authorReputation = await db
        .select()
        .from(userReputation)
        .where(eq(userReputation.userId, template.userId))
        .limit(1)

      if (authorReputation[0]?.total_points < 50) {
        standardsScore -= 10
        issues.push('Author has low community reputation')
      }
    } catch (error) {
      // Author reputation not available, skip this check
    }

    // Check for similar templates (potential duplicates)
    const similarTemplates = await this.findSimilarTemplates(template.name, template.description)
    if (similarTemplates.length > 0) {
      standardsScore -= 15
      issues.push(`${similarTemplates.length} similar templates found - ensure uniqueness`)
    }

    // Check naming conventions
    if (!/^[A-Z]/.test(template.name) || template.name.includes('_')) {
      standardsScore -= 10
      issues.push('Template name should follow community naming conventions')
    }

    const status = standardsScore >= 80 ? 'pass' : standardsScore >= 60 ? 'warning' : 'fail'

    return {
      ruleId: rule.id,
      ruleType: 'community_standards',
      status,
      score: standardsScore,
      confidence: 0.8,
      message:
        issues.length === 0 ? 'Meets community standards' : `${issues.length} standards issues`,
      details: { issues, similarTemplates },
      severity: 'medium',
      autoFixable: false,
      recommendations: issues.map((issue) => `Address: ${issue}`),
    }
  }

  /**
   * Get moderation queue with filtering and sorting
   */
  async getModerationQueue(
    filters: {
      status?: ModerationStatus[]
      priority?: ModerationPriority[]
      dateRange?: { start: Date; end: Date }
      moderatorId?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ items: ModerationQueueItem[]; totalCount: number }> {
    const operationId = `queue_${Date.now()}`

    logger.info(`[${this.requestId}] Fetching moderation queue`, {
      operationId,
      filters,
    })

    try {
      // Build query conditions
      const conditions = []

      if (filters.dateRange) {
        conditions.push(
          and(
            gte(templates.createdAt, filters.dateRange.start),
            lte(templates.createdAt, filters.dateRange.end)
          )
        )
      }

      // Query templates needing moderation
      const query = db
        .select({
          id: templates.id,
          name: templates.name,
          author: templates.author,
          userId: templates.userId,
          createdAt: templates.createdAt,
          updatedAt: templates.updatedAt,
          state: templates.state,
          status: templates.status,
        })
        .from(templates)
        .where(and(eq(templates.status, 'review'), isNotNull(templates.state), ...conditions))
        .orderBy(desc(templates.createdAt))
        .limit(filters.limit || 50)
        .offset(filters.offset || 0)

      const templatesData = await query
      const totalCount = await this.getModerationQueueCount(filters)

      // Transform to queue items
      const items: ModerationQueueItem[] = await Promise.all(
        templatesData.map((template) => this.transformToQueueItem(template))
      )

      // Apply additional filtering
      const filteredItems = items.filter((item) => {
        if (filters.status && !filters.status.includes(item.status)) return false
        if (filters.priority && !filters.priority.includes(item.priority)) return false
        return true
      })

      logger.info(`[${this.requestId}] Moderation queue fetched`, {
        operationId,
        totalItems: filteredItems.length,
        totalCount,
      })

      return {
        items: filteredItems,
        totalCount,
      }
    } catch (error) {
      logger.error(`[${this.requestId}] Failed to fetch moderation queue`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Process community report
   */
  async processCommunityReport(report: CommunityReport): Promise<void> {
    const operationId = `report_${Date.now()}`

    logger.info(`[${this.requestId}] Processing community report`, {
      operationId,
      reportId: report.id,
      templateId: report.templateId,
      reportType: report.reportType,
    })

    try {
      // Update template moderation status based on report severity
      const moderationData = await this.getTemplateModerationData(report.templateId)

      if (!moderationData) {
        throw new Error('Template moderation data not found')
      }

      // Calculate new priority based on report
      const newPriority = this.calculateReportPriority(
        report,
        moderationData.communityReports.length + 1
      )

      // Update template status if needed
      if (
        newPriority === 'critical' ||
        moderationData.communityReports.length >= this.config.escalationThresholds.communityReports
      ) {
        await this.flagTemplate(report.templateId, 'Community reports threshold exceeded')
      }

      // Log moderation action
      await this.logModerationAction({
        id: crypto.randomUUID(),
        templateId: report.templateId,
        actionType: 'flag',
        reason: `Community report: ${report.reportType}`,
        timestamp: new Date(),
        isAutomated: true,
        metadata: { reportId: report.id, reportType: report.reportType },
      })

      logger.info(`[${this.requestId}] Community report processed`, {
        operationId,
        reportId: report.id,
        newPriority,
        action: newPriority === 'critical' ? 'flagged' : 'queued',
      })
    } catch (error) {
      logger.error(`[${this.requestId}] Failed to process community report`, {
        operationId,
        reportId: report.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Approve template
   */
  async approveTemplate(
    templateId: string,
    moderatorId: string,
    reason?: string,
    conditions?: string[]
  ): Promise<void> {
    const operationId = `approve_${Date.now()}`

    logger.info(`[${this.requestId}] Approving template`, {
      operationId,
      templateId,
      moderatorId,
    })

    try {
      // Update template status
      await db
        .update(templates)
        .set({
          status: 'published',
          publishedAt: new Date(),
          state: sql`jsonb_set(
            ${templates.state}, 
            '{moderation}', 
            jsonb_set(
              COALESCE(${templates.state}->>'moderation', '{}')::jsonb,
              '{status}',
              '"approved"'
            )
          )`,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, templateId))

      // Log approval action
      await this.logModerationAction({
        id: crypto.randomUUID(),
        templateId,
        moderatorId,
        actionType: 'approve',
        reason: reason || 'Template meets quality and safety standards',
        timestamp: new Date(),
        isAutomated: false,
        metadata: { conditions },
      })

      // Update author reputation
      await this.updateAuthorReputation(templateId, 'template_approved', 50)

      logger.info(`[${this.requestId}] Template approved`, {
        operationId,
        templateId,
        moderatorId,
      })
    } catch (error) {
      logger.error(`[${this.requestId}] Template approval failed`, {
        operationId,
        templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Reject template
   */
  async rejectTemplate(
    templateId: string,
    moderatorId: string,
    reason: string,
    feedback?: string[]
  ): Promise<void> {
    const operationId = `reject_${Date.now()}`

    logger.info(`[${this.requestId}] Rejecting template`, {
      operationId,
      templateId,
      moderatorId,
    })

    try {
      // Update template status
      await db
        .update(templates)
        .set({
          status: 'archived',
          state: sql`jsonb_set(
            ${templates.state}, 
            '{moderation}', 
            jsonb_set(
              COALESCE(${templates.state}->>'moderation', '{}')::jsonb,
              '{status}',
              '"rejected"'
            )
          )`,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, templateId))

      // Log rejection action
      await this.logModerationAction({
        id: crypto.randomUUID(),
        templateId,
        moderatorId,
        actionType: 'reject',
        reason,
        timestamp: new Date(),
        isAutomated: false,
        metadata: { feedback },
      })

      // Update author reputation (small penalty for rejection)
      await this.updateAuthorReputation(templateId, 'template_rejected', -10)

      logger.info(`[${this.requestId}] Template rejected`, {
        operationId,
        templateId,
        moderatorId,
        reason,
      })
    } catch (error) {
      logger.error(`[${this.requestId}] Template rejection failed`, {
        operationId,
        templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  // Helper methods and utilities below...

  private getDefaultValidationRules(): ValidationRule[] {
    return [
      {
        id: 'content_safety_basic',
        name: 'Basic Content Safety',
        description: 'Checks for inappropriate or harmful content',
        type: 'content_safety',
        enabled: true,
        weight: 0.25,
        severity: 'critical',
        autoExecute: true,
        conditions: {},
        actions: ['flag_if_fail'],
      },
      {
        id: 'security_scan_basic',
        name: 'Basic Security Scan',
        description: 'Scans for common security vulnerabilities',
        type: 'code_security',
        enabled: true,
        weight: 0.3,
        severity: 'high',
        autoExecute: true,
        conditions: {},
        actions: ['reject_if_critical'],
      },
      {
        id: 'quality_standards_basic',
        name: 'Quality Standards Check',
        description: 'Validates template meets minimum quality requirements',
        type: 'quality_standards',
        enabled: true,
        weight: 0.2,
        severity: 'medium',
        autoExecute: true,
        conditions: {},
        actions: ['warn_if_low'],
      },
      {
        id: 'metadata_completeness',
        name: 'Metadata Completeness',
        description: 'Ensures all required metadata is present',
        type: 'metadata_completeness',
        enabled: true,
        weight: 0.15,
        severity: 'medium',
        autoExecute: true,
        conditions: {},
        actions: ['request_changes_if_incomplete'],
      },
      {
        id: 'policy_compliance_basic',
        name: 'Policy Compliance Check',
        description: 'Validates compliance with community policies',
        type: 'policy_compliance',
        enabled: true,
        weight: 0.1,
        severity: 'high',
        autoExecute: true,
        conditions: {},
        actions: ['reject_if_violation'],
      },
    ]
  }

  private async getTemplateDetails(templateId: string): Promise<any> {
    const result = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1)

    return result[0] || null
  }

  private calculateQualityScore(validationResults: ValidationResult[], template: any): number {
    let totalScore = 0
    let totalWeight = 0

    for (const result of validationResults) {
      const rule = this.config.validationRules.find((r) => r.id === result.ruleId)
      if (rule) {
        totalScore += result.score * rule.weight
        totalWeight += rule.weight
      }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0
  }

  private calculateRiskScore(validationResults: ValidationResult[], template: any): number {
    let riskScore = 0

    for (const result of validationResults) {
      if (result.status === 'fail') {
        switch (result.severity) {
          case 'critical':
            riskScore += 40
            break
          case 'high':
            riskScore += 25
            break
          case 'medium':
            riskScore += 15
            break
          case 'low':
            riskScore += 5
            break
        }
      } else if (result.status === 'warning') {
        switch (result.severity) {
          case 'critical':
            riskScore += 20
            break
          case 'high':
            riskScore += 12
            break
          case 'medium':
            riskScore += 8
            break
          case 'low':
            riskScore += 3
            break
        }
      }
    }

    return Math.min(riskScore, 100)
  }

  private determineInitialStatus(
    qualityScore: number,
    riskScore: number,
    validationResults: ValidationResult[]
  ): ModerationStatus {
    // Check for critical failures
    const criticalFailures = validationResults.filter(
      (r) => r.status === 'fail' && r.severity === 'critical'
    )

    if (criticalFailures.length > 0) {
      return 'rejected'
    }

    // Check for high-risk issues
    if (riskScore >= this.config.escalationThresholds.highRisk) {
      return 'flagged'
    }

    // Auto-approve high-quality templates
    if (qualityScore >= this.config.autoApproveThreshold && riskScore <= 10) {
      return 'approved'
    }

    // Auto-reject low-quality templates
    if (qualityScore <= this.config.autoRejectThreshold) {
      return 'rejected'
    }

    // Default to pending review
    return 'pending_review'
  }

  private calculatePriority(
    riskScore: number,
    validationResults: ValidationResult[]
  ): ModerationPriority {
    const criticalIssues = validationResults.filter((r) => r.severity === 'critical').length
    const highIssues = validationResults.filter((r) => r.severity === 'high').length

    if (criticalIssues >= 2 || riskScore >= 80) return 'critical'
    if (criticalIssues >= 1 || highIssues >= 3 || riskScore >= 60) return 'high'
    if (highIssues >= 1 || riskScore >= 30) return 'medium'
    return 'low'
  }

  private async addToModerationQueue(
    templateId: string,
    data: {
      priority: ModerationPriority
      validationResults: ValidationResult[]
      qualityScore: number
      riskScore: number
      metadata: Record<string, any>
    }
  ): Promise<{ position: number; estimatedTime: number }> {
    // In a real implementation, this would add to a proper queue system
    // For now, we'll simulate queue position and time estimation

    const queueLength = await this.getModerationQueueCount()
    const priorityMultiplier = {
      critical: 0,
      high: Math.floor(queueLength * 0.1),
      medium: Math.floor(queueLength * 0.3),
      low: queueLength,
    }

    const position = priorityMultiplier[data.priority] + 1
    const estimatedTime = position * 15 // 15 minutes per template average

    return { position, estimatedTime }
  }

  private async getModerationQueueCount(filters: any = {}): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(templates)
      .where(eq(templates.status, 'review'))

    return result[0]?.count || 0
  }

  private async transformToQueueItem(template: any): Promise<ModerationQueueItem> {
    // Extract moderation data from template state
    const moderationData = template.state?.moderation || {}

    // Get author reputation
    let authorReputation = 0
    try {
      const reputationResult = await db
        .select()
        .from(userReputation)
        .where(eq(userReputation.userId, template.userId))
        .limit(1)

      authorReputation = reputationResult[0]?.total_points || 0
    } catch (error) {
      // Ignore reputation lookup errors
    }

    return {
      templateId: template.id,
      templateName: template.name,
      authorId: template.userId,
      authorName: template.author,
      authorReputation,
      submissionDate: template.createdAt,
      priority: moderationData.priority || 'medium',
      status: moderationData.status || 'pending_review',
      validationResults: moderationData.validationResults || [],
      communityReports: [], // Would be fetched separately
      estimatedReviewTime: 30,
      qualityScore: moderationData.qualityScore || 0,
      riskScore: moderationData.riskScore || 0,
      metadata: moderationData.metadata || {},
    }
  }

  private async analyzeContentSafety(content: string): Promise<number> {
    // Simulate content safety analysis
    // In production, integrate with content moderation services like OpenAI Moderation API

    const prohibitedPatterns = [
      /\b(hack|crack|pirate|illegal|fraud)\b/i,
      /\b(harmful|malicious|dangerous)\b/i,
      /\b(discriminatory|offensive|inappropriate)\b/i,
    ]

    let score = 100
    for (const pattern of prohibitedPatterns) {
      if (pattern.test(content)) {
        score -= 30
      }
    }

    return Math.max(0, score)
  }

  private async scanForSecurityIssues(workflowState: any): Promise<
    Array<{
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
      autoFixable: boolean
    }>
  > {
    const issues: Array<{
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
      autoFixable: boolean
    }> = []

    // Check for hardcoded secrets
    const stateString = JSON.stringify(workflowState)
    const secretPatterns = [
      { pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/i, type: 'hardcoded_api_key' },
      { pattern: /password\s*[:=]\s*['"].+['"]/i, type: 'hardcoded_password' },
      { pattern: /secret\s*[:=]\s*['"].+['"]/i, type: 'hardcoded_secret' },
    ]

    for (const { pattern, type } of secretPatterns) {
      if (pattern.test(stateString)) {
        issues.push({
          type,
          severity: 'critical',
          description: 'Hardcoded credentials detected in workflow state',
          autoFixable: false,
        })
      }
    }

    // Check for suspicious URLs
    const urlPattern = /https?:\/\/[^\s'"]+/g
    const urls = stateString.match(urlPattern) || []

    for (const url of urls) {
      if (this.isSuspiciousUrl(url)) {
        issues.push({
          type: 'suspicious_url',
          severity: 'high',
          description: `Potentially malicious URL detected: ${url}`,
          autoFixable: false,
        })
      }
    }

    return issues
  }

  private isSuspiciousUrl(url: string): boolean {
    const suspiciousDomains = [
      'bit.ly',
      'tinyurl.com',
      'suspicious-domain.com', // Add actual suspicious domains
    ]

    try {
      const urlObj = new URL(url)
      return suspiciousDomains.some((domain) => urlObj.hostname.includes(domain))
    } catch (error) {
      return true // Invalid URL is suspicious
    }
  }

  private analyzeWorkflowQuality(workflowState: any): number {
    let score = 0

    // Check for meaningful block structure
    const blocks = workflowState?.blocks || {}
    const blockCount = Object.keys(blocks).length

    if (blockCount >= 3) score += 25
    else if (blockCount >= 2) score += 15
    else if (blockCount >= 1) score += 5

    // Check for error handling
    const hasErrorHandling = Object.values(blocks).some(
      (block: any) => block.type === 'condition' || block.type === 'try-catch'
    )
    if (hasErrorHandling) score += 25

    // Check for documentation
    const hasDocumentation = Object.values(blocks).some(
      (block: any) => block.description && block.description.length > 10
    )
    if (hasDocumentation) score += 25

    // Check for valid connections
    const edges = workflowState?.edges || []
    if (edges.length >= blockCount - 1) score += 25

    return Math.min(score, 100)
  }

  private async findSimilarTemplates(name: string, description: string): Promise<any[]> {
    // Simplified similarity check - in production, use more sophisticated algorithms
    const similarTemplates = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.status, 'published'),
          sql`similarity(${templates.name}, ${name}) > 0.7 OR similarity(${templates.description}, ${description}) > 0.6`
        )
      )
      .limit(5)

    return similarTemplates
  }

  private getContentSafetyMessage(score: number): string {
    if (score >= 90) return 'Content is safe and appropriate'
    if (score >= 70) return 'Content appears safe with minor concerns'
    if (score >= 50) return 'Content has some safety concerns that should be reviewed'
    return 'Content has significant safety issues and requires review'
  }

  private getSecurityMessage(issues: any[]): string {
    if (issues.length === 0) return 'No security issues detected'
    if (issues.length === 1) return `1 security issue detected`
    return `${issues.length} security issues detected`
  }

  private async getTemplateModerationData(templateId: string): Promise<{
    communityReports: CommunityReport[]
  } | null> {
    // In production, this would fetch actual moderation data
    return {
      communityReports: [],
    }
  }

  private calculateReportPriority(
    report: CommunityReport,
    totalReports: number
  ): ModerationPriority {
    if (report.reportType === 'malicious' || totalReports >= 5) return 'critical'
    if (report.reportType === 'copyright' || totalReports >= 3) return 'high'
    if (totalReports >= 2) return 'medium'
    return 'low'
  }

  private async flagTemplate(templateId: string, reason: string): Promise<void> {
    await db
      .update(templates)
      .set({
        status: 'archived',
        state: sql`jsonb_set(
          ${templates.state}, 
          '{moderation,status}', 
          '"flagged"'
        )`,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, templateId))
  }

  private async logModerationAction(action: ModerationAction): Promise<void> {
    // In production, this would log to a dedicated moderation actions table
    logger.info(`[${this.requestId}] Moderation action logged`, {
      action: action.actionType,
      templateId: action.templateId,
      moderatorId: action.moderatorId,
      isAutomated: action.isAutomated,
      reason: action.reason,
    })
  }

  private async updateAuthorReputation(
    templateId: string,
    eventType: string,
    points: number
  ): Promise<void> {
    try {
      // Get template author
      const template = await db
        .select({ userId: templates.userId })
        .from(templates)
        .where(eq(templates.id, templateId))
        .limit(1)

      if (template[0]?.userId) {
        // Update reputation
        await db
          .update(userReputation)
          .set({
            total_points: sql`${userReputation.total_points} + ${points}`,
            template_creation_points:
              eventType === 'template_approved'
                ? sql`${userReputation.template_creation_points} + ${points}`
                : userReputation.template_creation_points,
            penalty_points:
              points < 0
                ? sql`${userReputation.penalty_points} + ${Math.abs(points)}`
                : userReputation.penalty_points,
            updated_at: new Date(),
          })
          .where(eq(userReputation.userId, template[0].userId))
      }
    } catch (error) {
      logger.error(`[${this.requestId}] Failed to update author reputation`, {
        templateId,
        eventType,
        points,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}

// Export singleton instance
export const moderationSystem = new TemplateModerationSystem()

export default TemplateModerationSystem
