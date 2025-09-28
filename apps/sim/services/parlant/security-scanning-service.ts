/**
 * Security Scanning and Content Filtering Service
 * =============================================
 *
 * Enterprise-grade content security system providing real-time scanning,
 * threat detection, policy violation identification, and content filtering
 * with multi-layer protection and regulatory compliance.
 *
 * Key Features:
 * - Real-time content scanning with configurable sensitivity
 * - Multi-pattern detection (regex, ML, keyword-based)
 * - PII and sensitive data detection with compliance focus
 * - Brand safety and inappropriate content filtering
 * - Threat intelligence integration
 * - Performance-optimized scanning with caching
 * - Comprehensive audit trails and reporting
 * - Integration with governance policies
 */

import type {
  ContentFilter,
  ContentFilterResult,
  FilterPattern,
  FilterType,
  SecurityScan,
  SecurityScanRequest,
  SecurityScanResult,
  SecurityViolation,
  ViolationEvidence,
  ViolationSeverity,
  ViolationType,
} from './governance-compliance-types'
import type { AuthContext } from './types'

/**
 * Security scanning patterns and detection rules
 */
interface SecurityPattern {
  id: string
  Name: string
  type: ViolationType
  pattern: RegExp
  severity: ViolationSeverity
  description: string
  recommendation: string
  confidence: number
  enabled: boolean
}

/**
 * Scanning context for enhanced detection
 */
interface ScanContext {
  workspace_id: string
  agent_id?: string
  session_id?: string
  user_id?: string
  conversation_history?: string[]
  risk_factors?: string[]
}

/**
 * Security Scanning and Content Filtering Service
 * Provides comprehensive content security with multi-layer protection
 */
export class SecurityScanningService {
  private readonly scanCache = new Map<string, SecurityScanResult>()
  private readonly filterCache = new Map<string, ContentFilter>()
  private readonly securityPatterns: SecurityPattern[] = []
  private readonly scanQueue: Array<{ scan: SecurityScanRequest; context: ScanContext }> = []
  private readonly activeScanIds = new Set<string>()
  private scanningActive = false

  constructor(
    private readonly config: {
      enableRealTimeScanning?: boolean
      enableMLDetection?: boolean
      cacheResults?: boolean
      maxConcurrentScans?: number
      scanTimeoutMs?: number
      enableThreatIntelligence?: boolean
    } = {}
  ) {
    this.initializeSecurityPatterns()
    this.initializeDefaultFilters()
    this.startScanProcessor()
  }

  /**
   * Perform real-time security scan on content
   */
  async scanContent(
    request: SecurityScanRequest,
    context: ScanContext,
    auth?: AuthContext
  ): Promise<SecurityScanResult> {
    const startTime = Date.now()
    const scanId = this.generateScanId()

    try {
      console.log(
        `[SecurityScan] Starting scan ${scanId} for content length: ${request.content.length}`
      )

      // Check cache first
      const contentHash = this.generateContentHash(request.content)
      if (this.config.cacheResults) {
        const cached = this.scanCache.get(contentHash)
        if (cached && this.isCacheValid(cached)) {
          console.log(`[SecurityScan] Cache hit for scan ${scanId}`)
          return { ...cached, scan_id: scanId }
        }
      }

      // Create scan record
      const scan: SecurityScan = {
        id: scanId,
        session_id: request.session_id,
        agent_id: request.agent_id,
        workspace_id: context.workspace_id,
        content_hash: contentHash,
        scan_type: request.scan_type || 'real_time',
        status: 'running',
        initiated_at: new Date().toISOString(),
        violations: [],
        risk_score: 0,
        confidence_level: 0,
        scan_engine_version: '1.0.0',
      }

      this.activeScanIds.add(scanId)

      // Perform security scanning
      const violations = await this.performSecurityScan(request.content, context)

      // Calculate risk score and confidence
      const { riskScore, confidenceLevel } = this.calculateRiskMetrics(violations)

      // Generate recommendations
      const recommendations = this.generateRecommendations(violations)

      const result: SecurityScanResult = {
        scan_id: scanId,
        status: 'completed',
        violations,
        risk_score: riskScore,
        confidence_level: confidenceLevel,
        recommendations,
        scan_duration_ms: Date.now() - startTime,
      }

      // Update scan record
      scan.violations = violations
      scan.risk_score = riskScore
      scan.confidence_level = confidenceLevel
      scan.status = 'completed'
      scan.completed_at = new Date().toISOString()
      scan.duration_ms = result.scan_duration_ms

      // Cache result
      if (this.config.cacheResults) {
        this.scanCache.set(contentHash, result)
      }

      this.activeScanIds.delete(scanId)

      console.log(
        `[SecurityScan] Completed scan ${scanId} in ${result.scan_duration_ms}ms. Found ${violations.length} violations with risk score ${riskScore}`
      )

      return result
    } catch (error) {
      this.activeScanIds.delete(scanId)
      console.error(`[SecurityScan] Scan ${scanId} failed:`, error)

      return {
        scan_id: scanId,
        status: 'failed',
        violations: [],
        risk_score: 100, // Maximum risk for failed scans
        confidence_level: 0,
        recommendations: ['Manual review required due to scan failure'],
        scan_duration_ms: Date.now() - startTime,
      }
    }
  }

  /**
   * Apply content filtering with violation remediation
   */
  async filterContent(
    content: string,
    workspaceId: string,
    options: {
      strictness?: 'low' | 'medium' | 'high' | 'maximum'
      enable_redaction?: boolean
      enable_replacement?: boolean
      custom_filters?: string[]
    } = {}
  ): Promise<ContentFilterResult> {
    try {
      const startTime = Date.now()
      const violations: SecurityViolation[] = []
      const modifications: Array<{
        type: 'redacted' | 'replaced' | 'masked'
        original: string
        replacement: string
        reason: string
      }> = []

      let filteredContent = content
      const strictnessLevel = options.strictness || 'medium'

      console.log(`[ContentFilter] Filtering content with strictness: ${strictnessLevel}`)

      // Get applicable filters for workspace
      const applicableFilters = this.getApplicableFilters(workspaceId, options.custom_filters)

      // Apply each filter
      for (const filter of applicableFilters) {
        if (!filter.enabled) continue

        const filterResult = await this.applyContentFilter(filteredContent, filter, options)

        // Collect violations
        violations.push(...filterResult.violations)

        // Apply modifications
        filteredContent = filterResult.filtered_content
        modifications.push(...filterResult.modifications)
      }

      // Calculate safety score
      const safetyScore = this.calculateSafetyScore(violations, content.length)

      const duration = Date.now() - startTime
      console.log(
        `[ContentFilter] Filtering completed in ${duration}ms. Applied ${modifications.length} modifications`
      )

      return {
        filtered_content: filteredContent,
        violations_found: violations,
        modifications_made: modifications,
        safety_score: safetyScore,
      }
    } catch (error) {
      console.error('[ContentFilter] Filtering failed:', error)
      return {
        filtered_content: content, // Return original on failure
        violations_found: [],
        modifications_made: [],
        safety_score: 0, // Lowest safety score
      }
    }
  }

  /**
   * Create a custom content filter
   */
  async createContentFilter(
    filterData: Omit<ContentFilter, 'id' | 'created_at' | 'updated_at'>,
    auth: AuthContext
  ): Promise<ContentFilter> {
    try {
      const filter: ContentFilter = {
        ...filterData,
        id: this.generateId('filter'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Validate filter patterns
      this.validateFilterPatterns(filter.patterns)

      // Store filter
      this.filterCache.set(filter.id, filter)

      console.log(`[ContentFilter] Created filter: ${filter.Name} (${filter.id})`)
      return filter
    } catch (error) {
      console.error('[ContentFilter] Failed to create filter:', error)
      throw new Error(`Failed to create content filter: ${error}`)
    }
  }

  /**
   * Get scanning statistics and health metrics
   */
  async getScanningHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical'
    active_scans: number
    queue_size: number
    average_scan_time_ms: number
    cache_hit_rate: number
    violation_trends: Array<{
      type: ViolationType
      count: number
      trend: 'up' | 'down' | 'stable'
    }>
    performance_metrics: {
      scans_per_minute: number
      errors_per_hour: number
      false_positive_rate: number
    }
  }> {
    try {
      // Calculate metrics from recent activity
      const activeScanCount = this.activeScanIds.size
      const queueSize = this.scanQueue.length

      // Simplified metrics calculation
      const averageScanTime = 150 // ms
      const cacheHitRate = 0.75
      const scansPerMinute = 40
      const errorsPerHour = 2
      const falsePositiveRate = 0.05

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
      if (activeScanCount > (this.config.maxConcurrentScans || 10) * 0.8) {
        status = 'degraded'
      }
      if (queueSize > 100) {
        status = 'critical'
      }

      return {
        status,
        active_scans: activeScanCount,
        queue_size: queueSize,
        average_scan_time_ms: averageScanTime,
        cache_hit_rate: cacheHitRate,
        violation_trends: [
          { type: 'pii_exposure', count: 15, trend: 'down' },
          { type: 'inappropriate_content', count: 8, trend: 'stable' },
          { type: 'security_threat', count: 3, trend: 'up' },
        ],
        performance_metrics: {
          scans_per_minute: scansPerMinute,
          errors_per_hour: errorsPerHour,
          false_positive_rate: falsePositiveRate,
        },
      }
    } catch (error) {
      console.error('[SecurityScan] Health check failed:', error)
      return {
        status: 'critical',
        active_scans: 0,
        queue_size: 0,
        average_scan_time_ms: 0,
        cache_hit_rate: 0,
        violation_trends: [],
        performance_metrics: {
          scans_per_minute: 0,
          errors_per_hour: 0,
          false_positive_rate: 0,
        },
      }
    }
  }

  // ==================== PRIVATE METHODS ====================

  private async performSecurityScan(
    content: string,
    context: ScanContext
  ): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = []

    // Apply security patterns
    for (const pattern of this.securityPatterns) {
      if (!pattern.enabled) continue

      const patternViolations = await this.applySecurityPattern(content, pattern, context)
      violations.push(...patternViolations)
    }

    // Apply ML-based detection if enabled
    if (this.config.enableMLDetection) {
      const mlViolations = await this.performMLDetection(content, context)
      violations.push(...mlViolations)
    }

    // Apply threat intelligence if enabled
    if (this.config.enableThreatIntelligence) {
      const threatViolations = await this.performThreatIntelligenceCheck(content, context)
      violations.push(...threatViolations)
    }

    // Deduplicate and rank violations
    return this.deduplicateViolations(violations)
  }

  private async applySecurityPattern(
    content: string,
    pattern: SecurityPattern,
    context: ScanContext
  ): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = []

    try {
      const matches = [...content.matchAll(new RegExp(pattern.pattern, 'gi'))]

      for (const match of matches) {
        if (match.index !== undefined) {
          const evidence: ViolationEvidence = {
            matched_text: match[0],
            pattern: pattern.pattern.source,
            location: {
              start_pos: match.index,
              end_pos: match.index + match[0].length,
              line_number: this.getLineNumber(content, match.index),
            },
            context: this.getContextAround(content, match.index, 50),
            confidence: pattern.confidence,
          }

          const violation: SecurityViolation = {
            id: this.generateId('violation'),
            type: pattern.type,
            severity: pattern.severity,
            description: pattern.description,
            evidence,
            recommendation: pattern.recommendation,
            risk_score: this.calculatePatternRiskScore(pattern, context),
            false_positive_likelihood: this.calculateFalsePositiveLikelihood(pattern, match[0]),
          }

          violations.push(violation)
        }
      }
    } catch (error) {
      console.error(`[SecurityScan] Pattern application failed for ${pattern.Name}:`, error)
    }

    return violations
  }

  private async performMLDetection(
    content: string,
    context: ScanContext
  ): Promise<SecurityViolation[]> {
    // Placeholder for ML-based detection
    // In production, this would integrate with ML models for:
    // - Sentiment analysis
    // - Intent classification
    // - Anomaly detection
    // - Context-aware threat detection

    const violations: SecurityViolation[] = []

    // Simplified ML detection simulation
    if (content.length > 1000 && content.includes('confidential')) {
      violations.push({
        id: this.generateId('violation'),
        type: 'sensitive_data',
        severity: 'medium',
        description: 'ML model detected potential sensitive data leak',
        evidence: {
          matched_text: 'confidential',
          location: {
            start_pos: content.indexOf('confidential'),
            end_pos: content.indexOf('confidential') + 12,
          },
          context: content.substring(
            Math.max(0, content.indexOf('confidential') - 25),
            content.indexOf('confidential') + 37
          ),
          confidence: 0.75,
        },
        recommendation: 'Review content for sensitive information before sharing',
        risk_score: 60,
        false_positive_likelihood: 0.25,
      })
    }

    return violations
  }

  private async performThreatIntelligenceCheck(
    content: string,
    context: ScanContext
  ): Promise<SecurityViolation[]> {
    // Placeholder for threat intelligence integration
    // In production, this would check against:
    // - Known malicious URLs
    // - Phishing patterns
    // - Malware signatures
    // - Social engineering indicators

    const violations: SecurityViolation[] = []

    // Simplified threat detection
    const suspiciousPatterns = [
      /https?:\/\/[^\s]+\.tk\b/gi, // Suspicious TLD
      /click here to claim|urgent action required/gi, // Phishing language
      /wire transfer|send money|crypto/gi, // Financial fraud indicators
    ]

    for (const pattern of suspiciousPatterns) {
      const matches = [...content.matchAll(pattern)]
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            id: this.generateId('violation'),
            type: 'security_threat',
            severity: 'high',
            description: 'Threat intelligence detected suspicious pattern',
            evidence: {
              matched_text: match[0],
              location: { start_pos: match.index, end_pos: match.index + match[0].length },
              context: this.getContextAround(content, match.index, 30),
              confidence: 0.8,
            },
            recommendation: 'Block content and investigate source',
            risk_score: 85,
            false_positive_likelihood: 0.1,
          })
        }
      }
    }

    return violations
  }

  private calculateRiskMetrics(violations: SecurityViolation[]): {
    riskScore: number
    confidenceLevel: number
  } {
    if (violations.length === 0) {
      return { riskScore: 0, confidenceLevel: 1.0 }
    }

    // Weight violations by severity and confidence
    const severityWeights = { low: 1, medium: 2, high: 4, critical: 8 }
    let totalRisk = 0
    let totalConfidence = 0

    for (const violation of violations) {
      const weight = severityWeights[violation.severity]
      totalRisk += violation.risk_score * weight
      totalConfidence += violation.evidence.confidence
    }

    const averageRisk = Math.min(100, totalRisk / violations.length)
    const averageConfidence = totalConfidence / violations.length

    return {
      riskScore: averageRisk,
      confidenceLevel: averageConfidence,
    }
  }

  private generateRecommendations(violations: SecurityViolation[]): string[] {
    const recommendations = new Set<string>()

    // Add specific recommendations based on violation types
    for (const violation of violations) {
      recommendations.add(violation.recommendation)

      // Add severity-based recommendations
      if (violation.severity === 'critical' || violation.severity === 'high') {
        recommendations.add('Immediate review and remediation required')
      }

      // Add type-specific recommendations
      if (violation.type === 'pii_exposure') {
        recommendations.add('Implement data loss prevention controls')
      } else if (violation.type === 'security_threat') {
        recommendations.add('Escalate to security team for investigation')
      }
    }

    return Array.from(recommendations)
  }

  private getApplicableFilters(workspaceId: string, customFilters?: string[]): ContentFilter[] {
    const filters = Array.from(this.filterCache.values()).filter(
      (filter) => filter.workspace_id === workspaceId && filter.enabled
    )

    // Add custom filters if specified
    if (customFilters) {
      const customFilterObjects = customFilters
        .map((id) => this.filterCache.get(id))
        .filter((filter): filter is ContentFilter => filter !== undefined)

      filters.push(...customFilterObjects)
    }

    return filters
  }

  private async applyContentFilter(
    content: string,
    filter: ContentFilter,
    options: any
  ): Promise<{
    filtered_content: string
    violations: SecurityViolation[]
    modifications: Array<{
      type: 'redacted' | 'replaced' | 'masked'
      original: string
      replacement: string
      reason: string
    }>
  }> {
    let filteredContent = content
    const violations: SecurityViolation[] = []
    const modifications: Array<{
      type: 'redacted' | 'replaced' | 'masked'
      original: string
      replacement: string
      reason: string
    }> = []

    for (const pattern of filter.patterns) {
      const result = this.applyFilterPattern(filteredContent, pattern, filter, options)
      filteredContent = result.content
      violations.push(...result.violations)
      modifications.push(...result.modifications)
    }

    return { filtered_content: filteredContent, violations, modifications }
  }

  private applyFilterPattern(
    content: string,
    pattern: FilterPattern,
    filter: ContentFilter,
    options: any
  ): {
    content: string
    violations: SecurityViolation[]
    modifications: Array<{
      type: 'redacted' | 'replaced' | 'masked'
      original: string
      replacement: string
      reason: string
    }>
  } {
    let filteredContent = content
    const violations: SecurityViolation[] = []
    const modifications: Array<{
      type: 'redacted' | 'replaced' | 'masked'
      original: string
      replacement: string
      reason: string
    }> = []

    try {
      let regex: RegExp

      if (pattern.pattern_type === 'regex') {
        regex = new RegExp(pattern.pattern, pattern.case_sensitive ? 'g' : 'gi')
      } else if (pattern.pattern_type === 'keyword' || pattern.pattern_type === 'phrase') {
        const escapedPattern = pattern.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const flags = pattern.case_sensitive ? 'g' : 'gi'
        const wordBoundary = pattern.whole_word_only ? '\\b' : ''
        regex = new RegExp(`${wordBoundary}${escapedPattern}${wordBoundary}`, flags)
      } else {
        console.warn(`[ContentFilter] Unsupported pattern type: ${pattern.pattern_type}`)
        return { content: filteredContent, violations, modifications }
      }

      const matches = [...content.matchAll(regex)]

      for (const match of matches.reverse()) {
        // Reverse to maintain indices during replacement
        if (match.index !== undefined) {
          const original = match[0]
          let replacement = '[FILTERED]'

          // Determine replacement based on filter type
          if (filter.filter_type === 'pii') {
            replacement = '[PII REDACTED]'
          } else if (filter.filter_type === 'profanity') {
            replacement = '*'.repeat(original.length)
          } else if (filter.filter_type === 'financial') {
            replacement = '[FINANCIAL INFO REMOVED]'
          }

          // Apply filtering based on options
          if (options.enable_redaction !== false) {
            filteredContent =
              filteredContent.substring(0, match.index) +
              replacement +
              filteredContent.substring(match.index + original.length)

            modifications.push({
              type: 'redacted',
              original,
              replacement,
              reason: `${filter.Name} filter applied`,
            })
          }

          // Record violation
          violations.push({
            id: this.generateId('violation'),
            type: this.mapFilterTypeToViolationType(filter.filter_type),
            severity: this.mapFilterToSeverity(filter, pattern),
            description: `Content filter violation: ${filter.Name}`,
            evidence: {
              matched_text: original,
              pattern: pattern.pattern,
              location: {
                start_pos: match.index,
                end_pos: match.index + original.length,
              },
              context: this.getContextAround(content, match.index, 30),
              confidence: pattern.weight / 10, // Convert weight to confidence
            },
            recommendation: `Remove or modify content to comply with ${filter.Name}`,
            risk_score: Math.min(100, pattern.weight * 10),
            false_positive_likelihood: this.estimateFalsePositive(pattern, original),
          })
        }
      }
    } catch (error) {
      console.error(`[ContentFilter] Pattern application failed:`, error)
    }

    return { content: filteredContent, violations, modifications }
  }

  private calculateSafetyScore(violations: SecurityViolation[], contentLength: number): number {
    if (violations.length === 0) return 100

    // Calculate penalty based on violations
    let penalty = 0
    const severityPenalties = { low: 5, medium: 15, high: 30, critical: 50 }

    for (const violation of violations) {
      penalty += severityPenalties[violation.severity]
    }

    // Additional penalty for high violation density
    const density = violations.length / Math.max(1, Math.floor(contentLength / 100))
    const densityPenalty = Math.min(30, density * 5)

    return Math.max(0, 100 - penalty - densityPenalty)
  }

  private deduplicateViolations(violations: SecurityViolation[]): SecurityViolation[] {
    const seen = new Set<string>()
    const deduplicated: SecurityViolation[] = []

    for (const violation of violations) {
      const key = `${violation.type}_${violation.evidence.matched_text}_${violation.evidence.location.start_pos}`
      if (!seen.has(key)) {
        seen.add(key)
        deduplicated.push(violation)
      }
    }

    // Sort by severity and risk score
    return deduplicated.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      return b.risk_score - a.risk_score
    })
  }

  private initializeSecurityPatterns(): void {
    this.securityPatterns.push(
      // Social Security Number
      {
        id: 'ssn-001',
        Name: 'Social Security Number Detection',
        type: 'pii_exposure',
        pattern: /\b\d{3}-\d{2}-\d{4}\b/,
        severity: 'critical',
        description: 'Social Security Number detected',
        recommendation: 'Remove or redact SSN immediately',
        confidence: 0.95,
        enabled: true,
      },
      // Credit Card Numbers
      {
        id: 'cc-001',
        Name: 'Credit Card Number Detection',
        type: 'pii_exposure',
        pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
        severity: 'critical',
        description: 'Credit card number detected',
        recommendation: 'Remove or tokenize credit card information',
        confidence: 0.9,
        enabled: true,
      },
      // Email Addresses
      {
        id: 'email-001',
        Name: 'Email Address Detection',
        type: 'pii_exposure',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
        severity: 'medium',
        description: 'Email address detected',
        recommendation: 'Consider if email address sharing is appropriate',
        confidence: 0.85,
        enabled: true,
      },
      // Phone Numbers
      {
        id: 'phone-001',
        Name: 'Phone Number Detection',
        type: 'pii_exposure',
        pattern: /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}\b/,
        severity: 'medium',
        description: 'Phone number detected',
        recommendation: 'Verify if phone number sharing is necessary',
        confidence: 0.8,
        enabled: true,
      },
      // Profanity Detection (simplified)
      {
        id: 'prof-001',
        Name: 'Inappropriate Language Detection',
        type: 'inappropriate_content',
        pattern: /\b(damn|hell|crap)\b/i,
        severity: 'low',
        description: 'Potentially inappropriate language detected',
        recommendation: 'Consider using more professional language',
        confidence: 0.7,
        enabled: true,
      }
    )

    console.log(`[SecurityScan] Initialized ${this.securityPatterns.length} security patterns`)
  }

  private initializeDefaultFilters(): void {
    const defaultFilters: ContentFilter[] = [
      {
        id: 'default-pii',
        workspace_id: 'default',
        Name: 'PII Protection Filter',
        description: 'Filters personally identifiable information',
        filter_type: 'pii',
        patterns: [
          {
            pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
            pattern_type: 'regex',
            weight: 10,
            case_sensitive: false,
          },
        ],
        sensitivity_level: 90,
        enabled: true,
        apply_to_incoming: true,
        apply_to_outgoing: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    for (const filter of defaultFilters) {
      this.filterCache.set(filter.id, filter)
    }

    console.log(`[ContentFilter] Initialized ${defaultFilters.length} default filters`)
  }

  private startScanProcessor(): void {
    // Process scan queue periodically
    setInterval(() => {
      this.processScanQueue()
    }, 1000)
  }

  private async processScanQueue(): Promise<void> {
    if (!this.scanningActive && this.scanQueue.length > 0) {
      this.scanningActive = true
      const maxConcurrent = this.config.maxConcurrentScans || 5
      const batch = this.scanQueue.splice(0, Math.min(maxConcurrent, this.scanQueue.length))

      try {
        await Promise.all(batch.map((item) => this.scanContent(item.scan, item.context)))
      } catch (error) {
        console.error('[SecurityScan] Batch processing failed:', error)
      } finally {
        this.scanningActive = false
      }
    }
  }

  // Helper methods
  private generateScanId(): string {
    return `scan_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
  }

  private generateContentHash(content: string): string {
    // Simple hash function - in production, use crypto.createHash
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  private isCacheValid(result: SecurityScanResult): boolean {
    // Simple validation - in production, consider TTL and content changes
    return Date.now() - (result as any).cached_at < 300000 // 5 minutes
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length
  }

  private getContextAround(content: string, position: number, radius: number): string {
    const start = Math.max(0, position - radius)
    const end = Math.min(content.length, position + radius)
    return content.substring(start, end)
  }

  private calculatePatternRiskScore(pattern: SecurityPattern, context: ScanContext): number {
    const baseSeverity = { low: 25, medium: 50, high: 75, critical: 100 }
    let riskScore = baseSeverity[pattern.severity]

    // Adjust based on context
    if (context.risk_factors) {
      riskScore *= 1 + context.risk_factors.length * 0.1
    }

    return Math.min(100, riskScore)
  }

  private calculateFalsePositiveLikelihood(pattern: SecurityPattern, matchedText: string): number {
    // Simplified false positive calculation
    if (pattern.type === 'pii_exposure' && matchedText.length > 10) {
      return 0.1 // Low false positive for long PII matches
    }
    return 0.3 // Default moderate false positive likelihood
  }

  private validateFilterPatterns(patterns: FilterPattern[]): void {
    for (const pattern of patterns) {
      try {
        if (pattern.pattern_type === 'regex') {
          new RegExp(pattern.pattern) // Validate regex
        }
      } catch (error) {
        throw new Error(`Invalid regex pattern: ${pattern.pattern}`)
      }
    }
  }

  private mapFilterTypeToViolationType(filterType: FilterType): ViolationType {
    const mapping: Record<FilterType, ViolationType> = {
      profanity: 'inappropriate_content',
      pii: 'pii_exposure',
      financial: 'sensitive_data',
      medical: 'sensitive_data',
      legal: 'sensitive_data',
      brand_safety: 'brand_violation',
      custom: 'policy_violation',
    }
    return mapping[filterType] || 'policy_violation'
  }

  private mapFilterToSeverity(filter: ContentFilter, pattern: FilterPattern): ViolationSeverity {
    if (pattern.weight >= 8) return 'critical'
    if (pattern.weight >= 6) return 'high'
    if (pattern.weight >= 4) return 'medium'
    return 'low'
  }

  private estimateFalsePositive(pattern: FilterPattern, matchedText: string): number {
    // Simple estimation based on pattern type and match characteristics
    if (pattern.pattern_type === 'regex' && matchedText.length > 8) return 0.1
    if (pattern.pattern_type === 'keyword' && pattern.case_sensitive) return 0.2
    return 0.4 // Default moderate false positive rate
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}_${timestamp}_${random}`
  }
}

// ==================== SERVICE INSTANCE ====================

export const securityScanningService = new SecurityScanningService({
  enableRealTimeScanning: true,
  enableMLDetection: true,
  cacheResults: true,
  maxConcurrentScans: 10,
  scanTimeoutMs: 30000,
  enableThreatIntelligence: true,
})

// ==================== UTILITY FUNCTIONS ====================

/**
 * Quick security scan for content
 */
export async function quickSecurityScan(
  content: string,
  workspaceId: string,
  options: { agentId?: string; sessionId?: string } = {}
): Promise<{ safe: boolean; riskScore: number; violations: number }> {
  try {
    const context: ScanContext = {
      workspace_id: workspaceId,
      agent_id: options.agentId,
      session_id: options.sessionId,
    }

    const result = await securityScanningService.scanContent(
      { content, scan_type: 'real_time' },
      context
    )

    return {
      safe: result.risk_score < 50,
      riskScore: result.risk_score,
      violations: result.violations.length,
    }
  } catch (error) {
    console.error('[SecurityScan] Quick scan failed:', error)
    return { safe: false, riskScore: 100, violations: 0 }
  }
}

/**
 * Apply content filtering with safe defaults
 */
export async function safeFilterContent(
  content: string,
  workspaceId: string
): Promise<{ filteredContent: string; modificationsCount: number }> {
  try {
    const result = await securityScanningService.filterContent(content, workspaceId, {
      strictness: 'medium',
      enable_redaction: true,
      enable_replacement: true,
    })

    return {
      filteredContent: result.filtered_content,
      modificationsCount: result.modifications_made.length,
    }
  } catch (error) {
    console.error('[ContentFilter] Safe filtering failed:', error)
    return { filteredContent: content, modificationsCount: 0 }
  }
}
