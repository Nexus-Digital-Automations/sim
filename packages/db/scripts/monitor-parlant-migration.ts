#!/usr/bin/env tsx

/**
 * Parlant Migration Monitoring and Logging Utilities
 *
 * This script provides comprehensive monitoring capabilities for the
 * Parlant schema migration, including real-time progress tracking,
 * performance metrics, and automated alerting.
 *
 * @version 1.0.0
 * @created 2025-09-24
 */

import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { config } from 'dotenv'
import { Pool } from 'pg'

// Load environment variables
config()

const sleep = promisify(setTimeout)

interface MigrationMetrics {
  timestamp: Date
  phase: string
  tablesCreated: number
  indexesCreated: number
  constraintsAdded: number
  triggersCreated: number
  totalSize: string
  duration: number
  activeConnections: number
  locksHeld: number
  cpuUsage?: number
  memoryUsage?: number
  queryPerformance: QueryPerformanceMetric[]
}

interface QueryPerformanceMetric {
  query: string
  executionTime: number
  rowsAffected: number
}

interface AlertThreshold {
  metric: string
  threshold: number
  severity: 'warning' | 'critical'
  message: string
}

class ParlantMigrationMonitor {
  private pool: Pool
  private logFile: string
  private metricsFile: string
  private alertThresholds: AlertThreshold[]
  private isMonitoring = false
  private startTime: Date

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      max: 5, // Limit connections for monitoring
    })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    this.logFile = path.join(__dirname, `../logs/parlant-migration-${timestamp}.log`)
    this.metricsFile = path.join(__dirname, `../logs/parlant-metrics-${timestamp}.json`)

    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile)
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    this.setupAlertThresholds()
    this.startTime = new Date()
  }

  private setupAlertThresholds(): void {
    this.alertThresholds = [
      {
        metric: 'activeConnections',
        threshold: 80,
        severity: 'warning',
        message: 'High number of active database connections',
      },
      {
        metric: 'activeConnections',
        threshold: 100,
        severity: 'critical',
        message: 'Critical number of active database connections',
      },
      {
        metric: 'locksHeld',
        threshold: 50,
        severity: 'warning',
        message: 'High number of database locks held',
      },
      {
        metric: 'locksHeld',
        threshold: 100,
        severity: 'critical',
        message: 'Critical number of database locks held',
      },
      {
        metric: 'queryExecutionTime',
        threshold: 30000, // 30 seconds
        severity: 'warning',
        message: 'Long-running query detected',
      },
      {
        metric: 'queryExecutionTime',
        threshold: 60000, // 60 seconds
        severity: 'critical',
        message: 'Critical long-running query detected',
      },
    ]
  }

  private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = 'INFO'): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level}] ${message}`

    console.log(logMessage)

    // Write to log file
    fs.appendFileSync(this.logFile, `${logMessage}\n`)
  }

  private async executeQuery(query: string): Promise<any> {
    const startTime = Date.now()
    try {
      const result = await this.pool.query(query)
      const executionTime = Date.now() - startTime

      // Log slow queries
      if (executionTime > 5000) {
        // 5 seconds
        this.log(`Slow query detected (${executionTime}ms): ${query.substring(0, 100)}...`, 'WARN')
      }

      return { result, executionTime }
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.log(`Query failed (${executionTime}ms): ${error.message}`, 'ERROR')
      throw error
    }
  }

  /**
   * Check if Parlant tables exist
   */
  private async checkParlantTables(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_name LIKE 'parlant_%'
      AND table_type = 'BASE TABLE'
    `

    const { result } = await this.executeQuery(query)
    return Number.parseInt(result.rows[0].count)
  }

  /**
   * Check Parlant indexes
   */
  private async checkParlantIndexes(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE tablename LIKE 'parlant_%'
      OR indexname LIKE '%parlant%'
    `

    const { result } = await this.executeQuery(query)
    return Number.parseInt(result.rows[0].count)
  }

  /**
   * Check foreign key constraints
   */
  private async checkParlantConstraints(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM information_schema.referential_constraints rc
      JOIN information_schema.table_constraints tc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.table_name LIKE 'parlant_%'
    `

    const { result } = await this.executeQuery(query)
    return Number.parseInt(result.rows[0].count)
  }

  /**
   * Check triggers on Parlant tables
   */
  private async checkParlantTriggers(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM information_schema.triggers
      WHERE event_object_table LIKE 'parlant_%'
    `

    const { result } = await this.executeQuery(query)
    return Number.parseInt(result.rows[0].count)
  }

  /**
   * Get total size of Parlant tables
   */
  private async getParlantTableSize(): Promise<string> {
    const query = `
      SELECT pg_size_pretty(SUM(pg_total_relation_size(c.oid))) as total_size
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname LIKE 'parlant_%'
      AND c.relkind = 'r'
    `

    const { result } = await this.executeQuery(query)
    return result.rows[0]?.total_size || '0 bytes'
  }

  /**
   * Get active connections count
   */
  private async getActiveConnections(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM pg_stat_activity
      WHERE state = 'active'
    `

    const { result } = await this.executeQuery(query)
    return Number.parseInt(result.rows[0].count)
  }

  /**
   * Get locks held count
   */
  private async getLocksHeld(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM pg_locks
      WHERE granted = true
    `

    const { result } = await this.executeQuery(query)
    return Number.parseInt(result.rows[0].count)
  }

  /**
   * Get long-running queries
   */
  private async getLongRunningQueries(): Promise<QueryPerformanceMetric[]> {
    const query = `
      SELECT
        query,
        EXTRACT(EPOCH FROM (NOW() - query_start)) * 1000 as execution_time_ms,
        pid
      FROM pg_stat_activity
      WHERE state = 'active'
      AND query_start < NOW() - INTERVAL '10 seconds'
      AND query NOT LIKE '%pg_stat_activity%'
      ORDER BY execution_time_ms DESC
      LIMIT 10
    `

    const { result } = await this.executeQuery(query)
    return result.rows.map((row) => ({
      query: row.query.substring(0, 200),
      executionTime: Number.parseFloat(row.execution_time_ms),
      rowsAffected: 0, // Not available in pg_stat_activity
    }))
  }

  /**
   * Check for migration advisory locks
   */
  private async checkMigrationLocks(): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM pg_locks
      WHERE locktype = 'advisory'
      AND classid = 5555
      AND objid IN (2024, 2025)
    `

    const { result } = await this.executeQuery(query)
    return Number.parseInt(result.rows[0].count) > 0
  }

  /**
   * Collect comprehensive metrics
   */
  private async collectMetrics(phase: string): Promise<MigrationMetrics> {
    this.log(`Collecting metrics for phase: ${phase}`, 'DEBUG')

    const [
      tablesCreated,
      indexesCreated,
      constraintsAdded,
      triggersCreated,
      totalSize,
      activeConnections,
      locksHeld,
      queryPerformance,
    ] = await Promise.all([
      this.checkParlantTables(),
      this.checkParlantIndexes(),
      this.checkParlantConstraints(),
      this.checkParlantTriggers(),
      this.getParlantTableSize(),
      this.getActiveConnections(),
      this.getLocksHeld(),
      this.getLongRunningQueries(),
    ])

    const now = new Date()
    const duration = now.getTime() - this.startTime.getTime()

    return {
      timestamp: now,
      phase,
      tablesCreated,
      indexesCreated,
      constraintsAdded,
      triggersCreated,
      totalSize,
      duration,
      activeConnections,
      locksHeld,
      queryPerformance,
    }
  }

  /**
   * Check alert thresholds and send alerts if necessary
   */
  private checkAlerts(metrics: MigrationMetrics): void {
    for (const threshold of this.alertThresholds) {
      let value: number

      switch (threshold.metric) {
        case 'activeConnections':
          value = metrics.activeConnections
          break
        case 'locksHeld':
          value = metrics.locksHeld
          break
        case 'queryExecutionTime':
          value = Math.max(...metrics.queryPerformance.map((q) => q.executionTime))
          break
        default:
          continue
      }

      if (value >= threshold.threshold) {
        this.sendAlert(threshold.severity, threshold.message, value, metrics)
      }
    }
  }

  /**
   * Send alert (log for now, could be extended to send to monitoring systems)
   */
  private sendAlert(
    severity: 'warning' | 'critical',
    message: string,
    value: number,
    metrics: MigrationMetrics
  ): void {
    const alertMessage = `ALERT [${severity.toUpperCase()}]: ${message} (Value: ${value})`
    this.log(alertMessage, severity === 'critical' ? 'ERROR' : 'WARN')

    // In production, this could send to:
    // - Slack/Teams notifications
    // - PagerDuty/OpsGenie
    // - Email alerts
    // - Monitoring dashboards (Grafana, DataDog, etc.)
  }

  /**
   * Save metrics to file
   */
  private saveMetrics(metrics: MigrationMetrics[]): void {
    const metricsData = {
      migration: 'parlant_schema_comprehensive',
      startTime: this.startTime,
      endTime: new Date(),
      totalDuration: Date.now() - this.startTime.getTime(),
      metrics,
    }

    fs.writeFileSync(this.metricsFile, JSON.stringify(metricsData, null, 2))
    this.log(`Metrics saved to: ${this.metricsFile}`)
  }

  /**
   * Generate metrics summary report
   */
  private generateReport(metrics: MigrationMetrics[]): void {
    if (metrics.length === 0) return

    const firstMetric = metrics[0]
    const lastMetric = metrics[metrics.length - 1]

    this.log('==========================================')
    this.log('PARLANT MIGRATION MONITORING REPORT')
    this.log('==========================================')
    this.log(`Migration Duration: ${(lastMetric.duration / 1000 / 60).toFixed(2)} minutes`)
    this.log(`Tables Created: ${lastMetric.tablesCreated}`)
    this.log(`Indexes Created: ${lastMetric.indexesCreated}`)
    this.log(`Constraints Added: ${lastMetric.constraintsAdded}`)
    this.log(`Triggers Created: ${lastMetric.triggersCreated}`)
    this.log(`Final Size: ${lastMetric.totalSize}`)
    this.log(`Peak Connections: ${Math.max(...metrics.map((m) => m.activeConnections))}`)
    this.log(`Peak Locks: ${Math.max(...metrics.map((m) => m.locksHeld))}`)

    // Query performance summary
    const allQueries = metrics.flatMap((m) => m.queryPerformance)
    const slowQueries = allQueries.filter((q) => q.executionTime > 10000) // 10+ seconds

    if (slowQueries.length > 0) {
      this.log(`Slow Queries Detected: ${slowQueries.length}`)
      slowQueries.slice(0, 5).forEach((q) => {
        this.log(`  - ${(q.executionTime / 1000).toFixed(2)}s: ${q.query.substring(0, 80)}...`)
      })
    }

    this.log('==========================================')
  }

  /**
   * Monitor pre-migration phase
   */
  async monitorPreMigration(): Promise<void> {
    this.log('Starting pre-migration monitoring')

    // Check if migration lock is held
    const lockHeld = await this.checkMigrationLocks()
    if (lockHeld) {
      this.log('Migration advisory lock detected - migration in progress', 'WARN')
    }

    // Collect initial metrics
    const metrics = await this.collectMetrics('pre-migration')
    this.log(
      `Initial state - Tables: ${metrics.tablesCreated}, Active connections: ${metrics.activeConnections}`
    )

    // Check alerts
    this.checkAlerts(metrics)

    return metrics
  }

  /**
   * Monitor migration progress in real-time
   */
  async monitorMigrationProgress(): Promise<void> {
    this.log('Starting real-time migration monitoring')
    this.isMonitoring = true

    const metrics: MigrationMetrics[] = []
    let previousTables = 0
    let previousIndexes = 0

    while (this.isMonitoring) {
      try {
        const currentMetrics = await this.collectMetrics('migration-progress')
        metrics.push(currentMetrics)

        // Log progress if changes detected
        if (
          currentMetrics.tablesCreated !== previousTables ||
          currentMetrics.indexesCreated !== previousIndexes
        ) {
          this.log(
            `Progress - Tables: ${currentMetrics.tablesCreated}, Indexes: ${currentMetrics.indexesCreated}, Size: ${currentMetrics.totalSize}`
          )
          previousTables = currentMetrics.tablesCreated
          previousIndexes = currentMetrics.indexesCreated
        }

        // Check for alerts
        this.checkAlerts(currentMetrics)

        // Check if migration is complete (look for migration lock)
        const lockHeld = await this.checkMigrationLocks()
        if (!lockHeld && currentMetrics.tablesCreated >= 11) {
          this.log('Migration appears to be complete - stopping monitoring')
          this.isMonitoring = false
        }

        // Wait before next check
        if (this.isMonitoring) {
          await sleep(5000) // Check every 5 seconds
        }
      } catch (error) {
        this.log(`Error during monitoring: ${error.message}`, 'ERROR')
        await sleep(10000) // Wait longer on error
      }
    }

    // Save final metrics
    this.saveMetrics(metrics)
    this.generateReport(metrics)
  }

  /**
   * Monitor post-migration validation
   */
  async monitorPostMigration(): Promise<void> {
    this.log('Starting post-migration monitoring')

    const metrics = await this.collectMetrics('post-migration')

    this.log(
      `Final state - Tables: ${metrics.tablesCreated}, Indexes: ${metrics.indexesCreated}, Triggers: ${metrics.triggersCreated}`
    )
    this.log(`Total size: ${metrics.totalSize}`)

    // Validation checks
    if (metrics.tablesCreated < 11) {
      this.log(`WARNING: Expected 11+ tables, found ${metrics.tablesCreated}`, 'WARN')
    }

    if (metrics.indexesCreated < 50) {
      this.log(`WARNING: Expected 50+ indexes, found ${metrics.indexesCreated}`, 'WARN')
    }

    if (metrics.constraintsAdded < 15) {
      this.log(`WARNING: Expected 15+ constraints, found ${metrics.constraintsAdded}`, 'WARN')
    }

    // Check for any remaining locks
    const lockHeld = await this.checkMigrationLocks()
    if (lockHeld) {
      this.log('WARNING: Migration lock still held after completion', 'WARN')
    }

    // Check for any long-running queries
    if (metrics.queryPerformance.length > 0) {
      const longQueries = metrics.queryPerformance.filter((q) => q.executionTime > 30000)
      if (longQueries.length > 0) {
        this.log(`WARNING: ${longQueries.length} long-running queries still active`, 'WARN')
      }
    }

    return metrics
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.log('Stopping migration monitoring')
    this.isMonitoring = false
  }

  /**
   * Cleanup resources
   */
  async cleanup(): void {
    this.stopMonitoring()
    await this.pool.end()
    this.log('Monitoring cleanup completed')
  }
}

/**
 * Main monitoring function
 */
async function main() {
  const monitor = new ParlantMigrationMonitor()

  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\n🛑 Monitoring interrupted by user')
    await monitor.cleanup()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Monitoring terminated')
    await monitor.cleanup()
    process.exit(0)
  })

  try {
    const args = process.argv.slice(2)
    const mode = args[0] || 'full'

    switch (mode) {
      case 'pre':
        console.log('🔍 Running pre-migration monitoring...')
        await monitor.monitorPreMigration()
        break

      case 'progress':
        console.log('📊 Starting real-time migration monitoring...')
        await monitor.monitorMigrationProgress()
        break

      case 'post':
        console.log('✅ Running post-migration monitoring...')
        await monitor.monitorPostMigration()
        break
      default:
        console.log('🔄 Running full migration monitoring cycle...')
        console.log('   Phase 1: Pre-migration check')
        await monitor.monitorPreMigration()

        console.log('   Phase 2: Real-time progress monitoring')
        await monitor.monitorMigrationProgress()

        console.log('   Phase 3: Post-migration validation')
        await monitor.monitorPostMigration()
        break
    }

    console.log('✅ Migration monitoring completed successfully')
  } catch (error) {
    console.error('❌ Migration monitoring failed:', error.message)
    process.exit(1)
  } finally {
    await monitor.cleanup()
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { ParlantMigrationMonitor }
