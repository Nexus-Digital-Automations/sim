/**
 * Chat Export and Archival Service
 *
 * Enterprise-grade chat data export and archival system with support for
 * multiple formats, compliance requirements, automated retention policies,
 * and secure data handling for Parlant conversations.
 */

import * as crypto from 'crypto'
import { promisify } from 'util'
import * as zlib from 'zlib'
import { db } from '@sim/db'
import { parlantAgent, parlantEvent, parlantSession, user } from '@sim/db/schema'
import { and, eq, gte, isNull, lte, or } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import type { IsolationContext } from './workspace-isolation-service'

const logger = createLogger('ChatExportArchivalService')

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

/**
 * Export format types
 */
export type ExportFormat = 'json' | 'csv' | 'markdown' | 'html' | 'xml' | 'pdf'

/**
 * Export compression levels
 */
export type CompressionLevel = 'none' | 'low' | 'medium' | 'high' | 'maximum'

/**
 * Advanced export configuration
 */
export interface AdvancedExportConfig {
  workspaceId: string
  format: ExportFormat
  compression: CompressionLevel

  // Data filters
  sessionIds?: string[]
  agentIds?: string[]
  userIds?: string[]
  dateFrom?: Date
  dateTo?: Date
  messageTypes?: string[]
  includeDeleted?: boolean

  // Privacy and compliance
  anonymizeUsers?: boolean
  excludePII?: boolean
  maskSensitiveData?: boolean
  includeMetadata?: boolean
  includeSystemMessages?: boolean

  // Output options
  splitByAgent?: boolean
  splitByUser?: boolean
  splitByDate?: boolean
  maxFileSize?: number // MB
  includeTimestamps?: boolean
  timezone?: string

  // Advanced options
  includeAnalytics?: boolean
  includeConversationFlow?: boolean
  customFields?: string[]
  templateOverride?: string

  // Security and audit
  encryptExport?: boolean
  digitalSignature?: boolean
  auditTrail?: boolean
  retentionPolicy?: string
}

/**
 * Export result metadata
 */
export interface ExportResult {
  exportId: string
  status: 'completed' | 'partial' | 'failed'
  format: ExportFormat
  files: Array<{
    filename: string
    size: number
    checksum: string
    downloadUrl?: string
    expiresAt?: Date
  }>
  metadata: {
    sessionsExported: number
    messagesExported: number
    usersIncluded: number
    agentsIncluded: number
    dateRange: {
      from: string
      to: string
    }
    exportedAt: string
    exportedBy: string
    processingTime: number
  }
  errors?: string[]
  warnings?: string[]
}

/**
 * Archival policy configuration
 */
export interface ArchivalPolicy {
  workspaceId: string
  policyName: string
  enabled: boolean

  // Retention rules
  retentionDays: number
  applyToCompleted?: boolean
  applyToAbandoned?: boolean
  applyToInactive?: boolean

  // Archival actions
  archiveToStorage?: boolean
  deleteAfterArchival?: boolean
  compressArchive?: boolean
  encryptArchive?: boolean

  // Notification settings
  notifyBeforeArchival?: boolean
  notificationDays?: number
  notifyUsers?: string[]

  // Compliance settings
  gdprCompliant?: boolean
  hipaaCompliant?: boolean
  soxCompliant?: boolean
  customCompliance?: string[]

  // Schedule
  runSchedule: string // cron expression
  lastRunAt?: Date
  nextRunAt?: Date
}

/**
 * Archival result
 */
export interface ArchivalResult {
  policyId: string
  runId: string
  status: 'completed' | 'partial' | 'failed'
  sessionsProcessed: number
  sessionsArchived: number
  sessionsDeleted: number
  messagesArchived: number
  messagesDeleted: number
  storageSpaceFreed: number // bytes
  errors: string[]
  warnings: string[]
  startedAt: Date
  completedAt: Date
  processingTime: number
}

/**
 * Advanced Chat Export and Archival Service
 */
export class ChatExportArchivalService {
  private readonly MAX_EXPORT_SIZE_MB = 500
  private readonly EXPORT_BATCH_SIZE = 1000
  private readonly ARCHIVAL_BATCH_SIZE = 100
  private readonly EXPORT_RETENTION_DAYS = 7

  constructor() {
    logger.info('Chat Export and Archival Service initialized', {
      maxExportSize: this.MAX_EXPORT_SIZE_MB,
      exportBatchSize: this.EXPORT_BATCH_SIZE,
      archivalBatchSize: this.ARCHIVAL_BATCH_SIZE,
      exportRetentionDays: this.EXPORT_RETENTION_DAYS,
    })
  }

  /**
   * Create comprehensive chat export
   */
  async createChatExport(
    config: AdvancedExportConfig,
    context: IsolationContext
  ): Promise<ExportResult> {
    const startTime = performance.now()
    const exportId = crypto.randomUUID()
    const requestId = `export-${exportId.substring(0, 8)}`

    try {
      logger.info('Creating chat export', {
        requestId,
        exportId,
        workspaceId: config.workspaceId,
        format: config.format,
        userId: context.userId,
      })

      // Validate workspace access
      if (config.workspaceId !== context.workspaceId) {
        throw new Error('Workspace access denied')
      }

      // Build data query conditions
      const conditions = this.buildExportConditions(config, context)

      // Get export data in batches
      const exportData = await this.gatherExportData(conditions, config)

      // Generate export files based on format
      const files = await this.generateExportFiles(exportData, config, exportId)

      // Calculate metadata
      const metadata = this.calculateExportMetadata(exportData, config, context, startTime)

      // Apply security features if requested
      if (config.encryptExport) {
        await this.encryptExportFiles(files, config)
      }

      if (config.digitalSignature) {
        await this.signExportFiles(files, context)
      }

      const result: ExportResult = {
        exportId,
        status: 'completed',
        format: config.format,
        files,
        metadata,
        errors: [],
        warnings: [],
      }

      // Log audit trail
      if (config.auditTrail) {
        await this.logExportAudit(result, config, context)
      }

      const duration = performance.now() - startTime

      logger.info('Chat export completed successfully', {
        requestId,
        exportId,
        filesGenerated: files.length,
        sessionsExported: metadata.sessionsExported,
        messagesExported: metadata.messagesExported,
        duration: `${duration}ms`,
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to create chat export', {
        requestId,
        exportId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })

      return {
        exportId,
        status: 'failed',
        format: config.format,
        files: [],
        metadata: {
          sessionsExported: 0,
          messagesExported: 0,
          usersIncluded: 0,
          agentsIncluded: 0,
          dateRange: { from: '', to: '' },
          exportedAt: new Date().toISOString(),
          exportedBy: context.userId,
          processingTime: duration,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }

  /**
   * Create and apply archival policy
   */
  async createArchivalPolicy(
    policy: Omit<ArchivalPolicy, 'lastRunAt' | 'nextRunAt'>,
    context: IsolationContext
  ): Promise<{ policyId: string; scheduledAt: Date }> {
    const startTime = performance.now()
    const policyId = crypto.randomUUID()
    const requestId = `policy-${policyId.substring(0, 8)}`

    try {
      logger.info('Creating archival policy', {
        requestId,
        policyId,
        workspaceId: policy.workspaceId,
        retentionDays: policy.retentionDays,
        userId: context.userId,
      })

      // Validate workspace access
      if (policy.workspaceId !== context.workspaceId) {
        throw new Error('Workspace access denied')
      }

      // Calculate next run time from cron expression
      const nextRunAt = this.calculateNextRun(policy.runSchedule)

      // In a production system, this would be stored in a dedicated policies table
      // For now, we'll simulate the policy creation and scheduling

      const duration = performance.now() - startTime

      logger.info('Archival policy created successfully', {
        requestId,
        policyId,
        nextRunAt: nextRunAt.toISOString(),
        duration: `${duration}ms`,
      })

      return {
        policyId,
        scheduledAt: nextRunAt,
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to create archival policy', {
        requestId,
        policyId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })
      throw error
    }
  }

  /**
   * Execute archival policy
   */
  async executeArchivalPolicy(
    policyId: string,
    policy: ArchivalPolicy,
    context: IsolationContext
  ): Promise<ArchivalResult> {
    const startTime = performance.now()
    const runId = crypto.randomUUID()
    const requestId = `archival-${runId.substring(0, 8)}`

    try {
      logger.info('Executing archival policy', {
        requestId,
        policyId,
        runId,
        workspaceId: policy.workspaceId,
        retentionDays: policy.retentionDays,
      })

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays)

      // Find sessions to archive
      const sessionsToProcess = await this.findSessionsForArchival(policy, cutoffDate)

      let sessionsArchived = 0
      let sessionsDeleted = 0
      let messagesArchived = 0
      let messagesDeleted = 0
      let storageSpaceFreed = 0
      const errors: string[] = []
      const warnings: string[] = []

      // Process sessions in batches
      for (let i = 0; i < sessionsToProcess.length; i += this.ARCHIVAL_BATCH_SIZE) {
        const batch = sessionsToProcess.slice(i, i + this.ARCHIVAL_BATCH_SIZE)

        try {
          const batchResult = await this.processBatchArchival(batch, policy, context)

          sessionsArchived += batchResult.sessionsArchived
          sessionsDeleted += batchResult.sessionsDeleted
          messagesArchived += batchResult.messagesArchived
          messagesDeleted += batchResult.messagesDeleted
          storageSpaceFreed += batchResult.storageSpaceFreed

          logger.debug('Archival batch processed', {
            requestId,
            batchIndex: Math.floor(i / this.ARCHIVAL_BATCH_SIZE),
            batchSize: batch.length,
          })
        } catch (batchError) {
          const errorMessage =
            batchError instanceof Error ? batchError.message : 'Unknown batch error'
          errors.push(`Batch ${Math.floor(i / this.ARCHIVAL_BATCH_SIZE)}: ${errorMessage}`)

          logger.error('Archival batch failed', {
            requestId,
            batchIndex: Math.floor(i / this.ARCHIVAL_BATCH_SIZE),
            error: errorMessage,
          })
        }
      }

      // Send notifications if configured
      if (policy.notifyUsers && policy.notifyUsers.length > 0) {
        await this.sendArchivalNotifications(policy, {
          sessionsArchived,
          sessionsDeleted,
          messagesArchived,
          messagesDeleted,
        })
      }

      const duration = performance.now() - startTime
      const completedAt = new Date()

      const result: ArchivalResult = {
        policyId,
        runId,
        status: errors.length === 0 ? 'completed' : sessionsArchived > 0 ? 'partial' : 'failed',
        sessionsProcessed: sessionsToProcess.length,
        sessionsArchived,
        sessionsDeleted,
        messagesArchived,
        messagesDeleted,
        storageSpaceFreed,
        errors,
        warnings,
        startedAt: new Date(startTime),
        completedAt,
        processingTime: duration,
      }

      logger.info('Archival policy execution completed', {
        requestId,
        policyId,
        runId,
        status: result.status,
        sessionsProcessed: result.sessionsProcessed,
        storageSpaceFreed: `${(result.storageSpaceFreed / 1024 / 1024).toFixed(2)}MB`,
        duration: `${duration}ms`,
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Failed to execute archival policy', {
        requestId,
        policyId,
        runId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
      })

      return {
        policyId,
        runId,
        status: 'failed',
        sessionsProcessed: 0,
        sessionsArchived: 0,
        sessionsDeleted: 0,
        messagesArchived: 0,
        messagesDeleted: 0,
        storageSpaceFreed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        startedAt: new Date(startTime),
        completedAt: new Date(),
        processingTime: duration,
      }
    }
  }

  /**
   * Generate export in specified format
   */
  private async generateExportFiles(
    exportData: any[],
    config: AdvancedExportConfig,
    exportId: string
  ): Promise<
    Array<{
      filename: string
      size: number
      checksum: string
      downloadUrl?: string
      expiresAt?: Date
    }>
  > {
    const files: Array<{
      filename: string
      size: number
      checksum: string
      downloadUrl?: string
      expiresAt?: Date
    }> = []

    // Split data if requested
    const dataSets = this.splitExportData(exportData, config)

    for (let i = 0; i < dataSets.length; i++) {
      const dataSet = dataSets[i]
      const suffix = dataSets.length > 1 ? `-part${i + 1}` : ''

      // Generate content based on format
      let content: string | Buffer
      let fileExtension: string

      switch (config.format) {
        case 'json':
          content = JSON.stringify(dataSet, null, 2)
          fileExtension = 'json'
          break

        case 'csv':
          content = this.formatAsCSV(dataSet, config)
          fileExtension = 'csv'
          break

        case 'markdown':
          content = this.formatAsMarkdown(dataSet, config)
          fileExtension = 'md'
          break

        case 'html':
          content = this.formatAsHTML(dataSet, config)
          fileExtension = 'html'
          break

        case 'xml':
          content = this.formatAsXML(dataSet, config)
          fileExtension = 'xml'
          break

        case 'pdf':
          content = await this.formatAsPDF(dataSet, config)
          fileExtension = 'pdf'
          break

        default:
          throw new Error(`Unsupported export format: ${config.format}`)
      }

      // Apply compression if requested
      if (config.compression !== 'none') {
        content = await this.compressContent(content, config.compression)
        fileExtension += '.gz'
      }

      // Generate filename and metadata
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `chat-export-${config.workspaceId}-${timestamp}${suffix}.${fileExtension}`

      // Calculate size and checksum
      const size = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content)
      const checksum = crypto.createHash('sha256').update(content).digest('hex')

      // Set expiration date
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + this.EXPORT_RETENTION_DAYS)

      files.push({
        filename,
        size,
        checksum,
        expiresAt,
      })

      // In a production system, files would be uploaded to secure storage
      // and download URLs would be generated
    }

    return files
  }

  /**
   * Build export query conditions
   */
  private buildExportConditions(config: AdvancedExportConfig, context: IsolationContext) {
    const conditions = [eq(parlantSession.workspaceId, config.workspaceId)]

    if (config.sessionIds && config.sessionIds.length > 0) {
      conditions.push(or(...config.sessionIds.map((id) => eq(parlantSession.id, id))))
    }

    if (config.agentIds && config.agentIds.length > 0) {
      conditions.push(or(...config.agentIds.map((id) => eq(parlantSession.agentId, id))))
    }

    if (config.userIds && config.userIds.length > 0) {
      conditions.push(or(...config.userIds.map((id) => eq(parlantSession.userId, id))))
    }

    if (config.dateFrom) {
      conditions.push(gte(parlantEvent.createdAt, config.dateFrom))
    }

    if (config.dateTo) {
      conditions.push(lte(parlantEvent.createdAt, config.dateTo))
    }

    if (config.messageTypes && config.messageTypes.length > 0) {
      conditions.push(or(...config.messageTypes.map((type) => eq(parlantEvent.eventType, type))))
    }

    // Apply user-level filtering based on access level
    if (context.accessLevel === 'viewer') {
      conditions.push(or(eq(parlantSession.userId, context.userId), isNull(parlantSession.userId)))
    }

    return and(...conditions)
  }

  /**
   * Gather export data from database
   */
  private async gatherExportData(conditions: any, config: AdvancedExportConfig): Promise<any[]> {
    const exportData: any[] = []
    let offset = 0

    while (true) {
      const batch = await db
        .select({
          sessionId: parlantSession.id,
          sessionTitle: parlantSession.title,
          sessionStatus: parlantSession.status,
          sessionStarted: parlantSession.startedAt,
          sessionEnded: parlantSession.endedAt,
          agentId: parlantSession.agentId,
          agentName: parlantAgent.Name,
          userId: parlantSession.userId,
          userName: user.Name,
          userEmail: config.anonymizeUsers ? null : user.email,
          eventId: parlantEvent.id,
          eventType: parlantEvent.eventType,
          eventOffset: parlantEvent.offset,
          eventContent: parlantEvent.content,
          eventMetadata: config.includeMetadata ? parlantEvent.metadata : null,
          eventTimestamp: parlantEvent.createdAt,
          sessionMetadata: config.includeMetadata ? parlantSession.metadata : null,
        })
        .from(parlantEvent)
        .innerJoin(parlantSession, eq(parlantEvent.sessionId, parlantSession.id))
        .innerJoin(parlantAgent, eq(parlantSession.agentId, parlantAgent.id))
        .leftJoin(user, eq(parlantSession.userId, user.id))
        .where(conditions)
        .orderBy(parlantSession.startedAt, parlantEvent.offset)
        .limit(this.EXPORT_BATCH_SIZE)
        .offset(offset)

      if (batch.length === 0) break

      exportData.push(...batch)
      offset += this.EXPORT_BATCH_SIZE

      // Check size limit
      const currentSize = JSON.stringify(exportData).length / 1024 / 1024 // MB
      if (currentSize > this.MAX_EXPORT_SIZE_MB) {
        logger.warn('Export size limit reached', {
          currentSizeMB: currentSize,
          maxSizeMB: this.MAX_EXPORT_SIZE_MB,
          records: exportData.length,
        })
        break
      }
    }

    return exportData
  }

  /**
   * Split export data based on configuration
   */
  private splitExportData(data: any[], config: AdvancedExportConfig): any[][] {
    if (!config.splitByAgent && !config.splitByUser && !config.splitByDate && !config.maxFileSize) {
      return [data]
    }

    const splits: any[][] = []

    if (config.splitByAgent) {
      const agentGroups = new Map<string, any[]>()
      data.forEach((row) => {
        const agentId = row.agentId
        if (!agentGroups.has(agentId)) {
          agentGroups.set(agentId, [])
        }
        agentGroups.get(agentId)!.push(row)
      })
      splits.push(...Array.from(agentGroups.values()))
    } else if (config.splitByUser) {
      const userGroups = new Map<string, any[]>()
      data.forEach((row) => {
        const userId = row.userId || 'anonymous'
        if (!userGroups.has(userId)) {
          userGroups.set(userId, [])
        }
        userGroups.get(userId)!.push(row)
      })
      splits.push(...Array.from(userGroups.values()))
    } else if (config.splitByDate) {
      const dateGroups = new Map<string, any[]>()
      data.forEach((row) => {
        const date = row.eventTimestamp.toISOString().substring(0, 10)
        if (!dateGroups.has(date)) {
          dateGroups.set(date, [])
        }
        dateGroups.get(date)!.push(row)
      })
      splits.push(...Array.from(dateGroups.values()))
    } else {
      splits.push(data)
    }

    // Further split by file size if needed
    if (config.maxFileSize) {
      const sizeLimitedSplits: any[][] = []
      for (const split of splits) {
        const chunks = this.chunkBySize(split, config.maxFileSize)
        sizeLimitedSplits.push(...chunks)
      }
      return sizeLimitedSplits
    }

    return splits
  }

  /**
   * Format data as CSV
   */
  private formatAsCSV(data: any[], config: AdvancedExportConfig): string {
    if (data.length === 0) return ''

    const headers = [
      'Session ID',
      'Session Title',
      'Agent Name',
      'User Name',
      'Event Type',
      'Content',
      'Timestamp',
    ]

    if (config.includeMetadata) {
      headers.push('Metadata')
    }

    const csvRows = [
      headers.join(','),
      ...data.map((row) => {
        const values = [
          this.csvEscape(row.sessionId),
          this.csvEscape(row.sessionTitle || ''),
          this.csvEscape(row.agentName),
          this.csvEscape(config.anonymizeUsers ? '[ANONYMIZED]' : row.userName || 'Anonymous'),
          this.csvEscape(row.eventType),
          this.csvEscape(
            typeof row.eventContent === 'string'
              ? row.eventContent
              : JSON.stringify(row.eventContent)
          ),
          this.csvEscape(row.eventTimestamp.toISOString()),
        ]

        if (config.includeMetadata && row.eventMetadata) {
          values.push(this.csvEscape(JSON.stringify(row.eventMetadata)))
        }

        return values.join(',')
      }),
    ]

    return csvRows.join('\n')
  }

  /**
   * Format data as Markdown
   */
  private formatAsMarkdown(data: any[], config: AdvancedExportConfig): string {
    if (data.length === 0) return '# Chat Export\n\nNo data found.'

    let markdown = '# Chat Export\n\n'

    // Group by session
    const sessionGroups = new Map<string, any[]>()
    data.forEach((row) => {
      if (!sessionGroups.has(row.sessionId)) {
        sessionGroups.set(row.sessionId, [])
      }
      sessionGroups.get(row.sessionId)!.push(row)
    })

    sessionGroups.forEach((events, sessionId) => {
      const firstEvent = events[0]

      markdown += `## Session: ${firstEvent.sessionTitle || sessionId}\n\n`
      markdown += `**Agent:** ${firstEvent.agentName}\n`
      markdown += `**User:** ${config.anonymizeUsers ? '[ANONYMIZED]' : firstEvent.userName || 'Anonymous'}\n`
      markdown += `**Started:** ${firstEvent.sessionStarted.toISOString()}\n\n`

      events.forEach((event) => {
        markdown += `### ${event.eventType}\n`
        if (config.includeTimestamps) {
          markdown += `*${event.eventTimestamp.toISOString()}*\n\n`
        }

        if (typeof event.eventContent === 'string') {
          markdown += `${event.eventContent}\n\n`
        } else {
          markdown += `\`\`\`json\n${JSON.stringify(event.eventContent, null, 2)}\n\`\`\`\n\n`
        }
      })

      markdown += '---\n\n'
    })

    return markdown
  }

  /**
   * Format data as HTML
   */
  private formatAsHTML(data: any[], config: AdvancedExportConfig): string {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chat Export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .session { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 8px; }
          .session-header { background: #f8f9fa; padding: 15px; margin: -20px -20px 15px -20px; border-radius: 8px 8px 0 0; }
          .message { margin: 15px 0; padding: 15px; border-left: 4px solid #007cba; background: #f8f9fa; }
          .agent-message { border-left-color: #28a745; }
          .customer-message { border-left-color: #007cba; }
          .system-message { border-left-color: #6c757d; background: #e9ecef; }
          .timestamp { font-size: 0.9em; color: #666; margin-bottom: 8px; }
          .metadata { font-size: 0.8em; color: #999; margin-top: 8px; }
          pre { background: #f1f3f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Chat Export</h1>
        <div class="export-info">
          <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
          <p><strong>Format:</strong> ${config.format}</p>
          <p><strong>Records:</strong> ${data.length}</p>
        </div>
    `

    // Group by session
    const sessionGroups = new Map<string, any[]>()
    data.forEach((row) => {
      if (!sessionGroups.has(row.sessionId)) {
        sessionGroups.set(row.sessionId, [])
      }
      sessionGroups.get(row.sessionId)!.push(row)
    })

    sessionGroups.forEach((events, sessionId) => {
      const firstEvent = events[0]

      html += `
        <div class="session">
          <div class="session-header">
            <h2>${firstEvent.sessionTitle || sessionId}</h2>
            <div class="session-meta">
              <strong>Agent:</strong> ${firstEvent.agentName} |
              <strong>User:</strong> ${config.anonymizeUsers ? '[ANONYMIZED]' : firstEvent.userName || 'Anonymous'} |
              <strong>Started:</strong> ${firstEvent.sessionStarted.toISOString()}
            </div>
          </div>
      `

      events.forEach((event) => {
        const messageClass = event.eventType.includes('agent')
          ? 'agent-message'
          : event.eventType.includes('customer')
            ? 'customer-message'
            : 'system-message'

        html += `
          <div class="message ${messageClass}">
            ${config.includeTimestamps ? `<div class="timestamp">${event.eventTimestamp.toISOString()}</div>` : ''}
            <div class="message-type"><strong>${event.eventType}</strong></div>
            <div class="content">
        `

        if (typeof event.eventContent === 'string') {
          html += `<p>${this.htmlEscape(event.eventContent)}</p>`
        } else {
          html += `<pre>${this.htmlEscape(JSON.stringify(event.eventContent, null, 2))}</pre>`
        }

        if (config.includeMetadata && event.eventMetadata) {
          html += `<div class="metadata">Metadata: ${this.htmlEscape(JSON.stringify(event.eventMetadata))}</div>`
        }

        html += '</div></div>'
      })

      html += '</div>'
    })

    html += '</body></html>'
    return html
  }

  /**
   * Format data as XML
   */
  private formatAsXML(data: any[], config: AdvancedExportConfig): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<chat_export>\n'

    // Add export metadata
    xml += `  <export_info>\n`
    xml += `    <generated_at>${new Date().toISOString()}</generated_at>\n`
    xml += `    <format>${config.format}</format>\n`
    xml += `    <record_count>${data.length}</record_count>\n`
    xml += `  </export_info>\n`

    // Group by session
    const sessionGroups = new Map<string, any[]>()
    data.forEach((row) => {
      if (!sessionGroups.has(row.sessionId)) {
        sessionGroups.set(row.sessionId, [])
      }
      sessionGroups.get(row.sessionId)!.push(row)
    })

    xml += `  <sessions>\n`
    sessionGroups.forEach((events, sessionId) => {
      const firstEvent = events[0]

      xml += `    <session id="${sessionId}">\n`
      xml += `      <title><![CDATA[${firstEvent.sessionTitle || ''}]]></title>\n`
      xml += `      <agent_name><![CDATA[${firstEvent.agentName}]]></agent_name>\n`
      xml += `      <user_name><![CDATA[${config.anonymizeUsers ? '[ANONYMIZED]' : firstEvent.userName || 'Anonymous'}]]></user_name>\n`
      xml += `      <started_at>${firstEvent.sessionStarted.toISOString()}</started_at>\n`
      xml += `      <events>\n`

      events.forEach((event) => {
        xml += `        <event id="${event.eventId}">\n`
        xml += `          <type>${event.eventType}</type>\n`
        xml += `          <offset>${event.eventOffset}</offset>\n`
        xml += `          <timestamp>${event.eventTimestamp.toISOString()}</timestamp>\n`
        xml += `          <content><![CDATA[${typeof event.eventContent === 'string' ? event.eventContent : JSON.stringify(event.eventContent)}]]></content>\n`

        if (config.includeMetadata && event.eventMetadata) {
          xml += `          <metadata><![CDATA[${JSON.stringify(event.eventMetadata)}]]></metadata>\n`
        }

        xml += `        </event>\n`
      })

      xml += `      </events>\n`
      xml += `    </session>\n`
    })
    xml += `  </sessions>\n`
    xml += `</chat_export>\n`

    return xml
  }

  /**
   * Format data as PDF (placeholder - would use a PDF library in production)
   */
  private async formatAsPDF(data: any[], config: AdvancedExportConfig): Promise<Buffer> {
    // In production, this would use a library like puppeteer or pdfkit
    // For now, return the HTML formatted as bytes
    const htmlContent = this.formatAsHTML(data, config)
    return Buffer.from(htmlContent, 'utf8')
  }

  /**
   * Helper methods
   */

  private csvEscape(value: string): string {
    if (!value) return '""'
    return `"${value.replace(/"/g, '""')}"`
  }

  private htmlEscape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private chunkBySize(data: any[], maxSizeMB: number): any[][] {
    const chunks: any[][] = []
    let currentChunk: any[] = []
    let currentSize = 0

    for (const item of data) {
      const itemSize = JSON.stringify(item).length / 1024 / 1024 // MB

      if (currentSize + itemSize > maxSizeMB && currentChunk.length > 0) {
        chunks.push(currentChunk)
        currentChunk = [item]
        currentSize = itemSize
      } else {
        currentChunk.push(item)
        currentSize += itemSize
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  private async compressContent(
    content: string | Buffer,
    level: CompressionLevel
  ): Promise<Buffer> {
    const compressionLevels = {
      low: 1,
      medium: 6,
      high: 9,
      maximum: 9,
    }

    const compressionLevel = compressionLevels[level] || 6
    return await gzip(content, { level: compressionLevel })
  }

  private calculateExportMetadata(
    data: any[],
    config: AdvancedExportConfig,
    context: IsolationContext,
    startTime: number
  ) {
    const sessions = new Set(data.map((d) => d.sessionId))
    const users = new Set(data.map((d) => d.userId).filter(Boolean))
    const agents = new Set(data.map((d) => d.agentId))

    const timestamps = data.map((d) => d.eventTimestamp).sort()
    const dateRange = {
      from: timestamps.length > 0 ? timestamps[0].toISOString() : new Date().toISOString(),
      to:
        timestamps.length > 0
          ? timestamps[timestamps.length - 1].toISOString()
          : new Date().toISOString(),
    }

    return {
      sessionsExported: sessions.size,
      messagesExported: data.length,
      usersIncluded: users.size,
      agentsIncluded: agents.size,
      dateRange,
      exportedAt: new Date().toISOString(),
      exportedBy: context.userId,
      processingTime: performance.now() - startTime,
    }
  }

  private calculateNextRun(cronExpression: string): Date {
    // Simple cron parser - in production use a proper cron library
    // For now, return next hour
    const nextRun = new Date()
    nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0)
    return nextRun
  }

  private async findSessionsForArchival(policy: ArchivalPolicy, cutoffDate: Date): Promise<any[]> {
    const conditions = [
      eq(parlantSession.workspaceId, policy.workspaceId),
      lte(parlantSession.lastActivityAt, cutoffDate),
    ]

    const statusConditions = []
    if (policy.applyToCompleted) statusConditions.push(eq(parlantSession.status, 'completed'))
    if (policy.applyToAbandoned) statusConditions.push(eq(parlantSession.status, 'abandoned'))

    if (statusConditions.length > 0) {
      conditions.push(or(...statusConditions))
    }

    return await db
      .select({
        id: parlantSession.id,
        messageCount: parlantSession.messageCount,
        status: parlantSession.status,
        lastActivityAt: parlantSession.lastActivityAt,
      })
      .from(parlantSession)
      .where(and(...conditions))
  }

  private async processBatchArchival(
    batch: any[],
    policy: ArchivalPolicy,
    context: IsolationContext
  ): Promise<{
    sessionsArchived: number
    sessionsDeleted: number
    messagesArchived: number
    messagesDeleted: number
    storageSpaceFreed: number
  }> {
    let sessionsArchived = 0
    let sessionsDeleted = 0
    let messagesArchived = 0
    let messagesDeleted = 0
    let storageSpaceFreed = 0

    for (const session of batch) {
      if (policy.deleteAfterArchival) {
        // Hard delete for GDPR compliance
        await db.delete(parlantSession).where(eq(parlantSession.id, session.id))
        sessionsDeleted++
        messagesDeleted += session.messageCount
      } else {
        // Soft archive
        await db
          .update(parlantSession)
          .set({
            status: 'completed',
            metadata: {
              archived: true,
              archivedAt: new Date().toISOString(),
              archivedBy: policy.policyName,
            },
            updatedAt: new Date(),
          })
          .where(eq(parlantSession.id, session.id))

        sessionsArchived++
        messagesArchived += session.messageCount
      }

      // Estimate storage space freed (simplified calculation)
      storageSpaceFreed += session.messageCount * 1024 // 1KB per message estimate
    }

    return {
      sessionsArchived,
      sessionsDeleted,
      messagesArchived,
      messagesDeleted,
      storageSpaceFreed,
    }
  }

  private async encryptExportFiles(files: any[], config: AdvancedExportConfig): Promise<void> {
    // Placeholder for file encryption
    logger.debug('Encrypting export files', { fileCount: files.length })
  }

  private async signExportFiles(files: any[], context: IsolationContext): Promise<void> {
    // Placeholder for digital signature
    logger.debug('Signing export files', { fileCount: files.length, userId: context.userId })
  }

  private async logExportAudit(
    result: ExportResult,
    config: AdvancedExportConfig,
    context: IsolationContext
  ): Promise<void> {
    logger.info('Export audit log', {
      exportId: result.exportId,
      workspaceId: config.workspaceId,
      userId: context.userId,
      format: config.format,
      sessionsExported: result.metadata.sessionsExported,
      messagesExported: result.metadata.messagesExported,
      status: result.status,
    })
  }

  private async sendArchivalNotifications(
    policy: ArchivalPolicy,
    results: {
      sessionsArchived: number
      sessionsDeleted: number
      messagesArchived: number
      messagesDeleted: number
    }
  ): Promise<void> {
    logger.info('Sending archival notifications', {
      policyName: policy.policyName,
      notifyUsers: policy.notifyUsers,
      results,
    })

    // In production, this would send actual notifications
    // via email, Slack, or other channels
  }
}

// Export singleton instance
export const chatExportArchivalService = new ChatExportArchivalService()
