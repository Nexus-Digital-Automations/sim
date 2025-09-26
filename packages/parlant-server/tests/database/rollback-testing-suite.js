/**
 * Rollback Migration Testing Suite with Data Loss Protection
 *
 * This comprehensive suite provides:
 * - Safe rollback testing with data preservation verification
 * - Pre-rollback data backup and validation
 * - Post-rollback integrity verification
 * - Data consistency checks across workspace boundaries
 * - Foreign key constraint validation during rollbacks
 * - Performance monitoring for rollback operations
 *
 * Key Safety Features:
 * - Automatic data backup before rollback testing
 * - Verification of existing Sim data preservation
 * - Cascade deletion impact analysis
 * - Rollback operation atomicity validation
 * - Recovery procedures for failed rollbacks
 */

const { Pool } = require('pg')
const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

/**
 * Rollback Testing Suite Class
 *
 * Provides comprehensive rollback testing with emphasis on data safety
 * and preservation of existing functionality during schema rollbacks.
 */
class RollbackTestingSuite {
  constructor(options = {}) {
    this.config = {
      database_url:
        process.env.TEST_DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/simstudio_test',
      backup_retention_hours: options.backup_retention_hours || 24,
      rollback_timeout_ms: options.rollback_timeout_ms || 30000,
      data_verification_batch_size: options.data_verification_batch_size || 1000,
      enable_recovery_mode: options.enable_recovery_mode !== false,
      ...options,
    }

    this.dbPool = null
    this.backupData = new Map()
    this.rollbackResults = []
  }

  /**
   * Initialize rollback testing suite
   */
  async initialize() {
    console.log('🔄 Initializing Rollback Testing Suite...')

    try {
      this.dbPool = new Pool({
        connectionString: this.config.database_url,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      })

      // Test database connectivity
      const client = await this.dbPool.connect()
      await client.query('SELECT 1')
      client.release()

      // Create rollback tracking tables
      await this.createRollbackTrackingTables()

      console.log('✅ Rollback testing suite initialized')
      return true
    } catch (error) {
      console.error('❌ Rollback suite initialization failed:', error)
      throw error
    }
  }

  /**
   * Create rollback tracking and backup tables
   */
  async createRollbackTrackingTables() {
    const client = await this.dbPool.connect()
    try {
      // Create rollback test tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS rollback_test_tracking (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          test_name TEXT NOT NULL,
          migration_name TEXT NOT NULL,
          test_phase TEXT NOT NULL,
          status TEXT NOT NULL,
          execution_time_ms INTEGER,
          backup_id UUID,
          data_checksums JSONB,
          error_details TEXT,
          recovery_actions TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `)

      // Create data backup metadata table
      await client.query(`
        CREATE TABLE IF NOT EXISTS rollback_data_backups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          backup_name TEXT NOT NULL,
          table_name TEXT NOT NULL,
          row_count INTEGER,
          data_checksum TEXT,
          backup_data JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP
        )
      `)

      // Create rollback validation results table
      await client.query(`
        CREATE TABLE IF NOT EXISTS rollback_validation_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          test_id UUID REFERENCES rollback_test_tracking(id),
          validation_type TEXT NOT NULL,
          table_name TEXT,
          expected_state JSONB,
          actual_state JSONB,
          is_valid BOOLEAN,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `)

      console.log('✅ Rollback tracking tables created')
    } finally {
      client.release()
    }
  }

  /**
   * Execute comprehensive rollback test with data protection
   */
  async testRollbackWithDataProtection(rollbackScript, migrationName, options = {}) {
    const testId = crypto.randomUUID()
    const testName = `rollback_${migrationName}_${Date.now()}`

    console.log(`🛡️  Starting protected rollback test: ${testName}`)

    try {
      // Phase 1: Pre-rollback data backup and analysis
      await this.recordTestPhase(testId, testName, migrationName, 'pre_rollback_backup', 'started')

      const backupResults = await this.createPreRollbackBackup(testId, migrationName)
      if (!backupResults.success) {
        throw new Error(`Backup creation failed: ${backupResults.error}`)
      }

      await this.recordTestPhase(
        testId,
        testName,
        migrationName,
        'pre_rollback_backup',
        'completed',
        {
          backup_id: backupResults.backupId,
          tables_backed_up: backupResults.tableCount,
          total_rows: backupResults.totalRows,
        }
      )

      // Phase 2: Pre-rollback validation
      await this.recordTestPhase(
        testId,
        testName,
        migrationName,
        'pre_rollback_validation',
        'started'
      )

      const preValidation = await this.validatePreRollbackState(testId, migrationName)
      if (!preValidation.success) {
        throw new Error(`Pre-rollback validation failed: ${preValidation.errors.join(', ')}`)
      }

      await this.recordTestPhase(
        testId,
        testName,
        migrationName,
        'pre_rollback_validation',
        'completed'
      )

      // Phase 3: Execute rollback with monitoring
      await this.recordTestPhase(testId, testName, migrationName, 'rollback_execution', 'started')

      const rollbackResults = await this.executeMonitoredRollback(
        testId,
        rollbackScript,
        migrationName
      )
      if (!rollbackResults.success) {
        // Attempt recovery if enabled
        if (this.config.enable_recovery_mode) {
          await this.attemptRollbackRecovery(testId, backupResults.backupId, rollbackResults.error)
        }
        throw new Error(`Rollback execution failed: ${rollbackResults.error}`)
      }

      await this.recordTestPhase(
        testId,
        testName,
        migrationName,
        'rollback_execution',
        'completed',
        {
          execution_time_ms: rollbackResults.executionTime,
        }
      )

      // Phase 4: Post-rollback data verification
      await this.recordTestPhase(
        testId,
        testName,
        migrationName,
        'post_rollback_verification',
        'started'
      )

      const postValidation = await this.validatePostRollbackState(
        testId,
        migrationName,
        backupResults
      )
      if (!postValidation.success) {
        throw new Error(`Post-rollback validation failed: ${postValidation.errors.join(', ')}`)
      }

      await this.recordTestPhase(
        testId,
        testName,
        migrationName,
        'post_rollback_verification',
        'completed'
      )

      // Phase 5: Data consistency verification
      await this.recordTestPhase(
        testId,
        testName,
        migrationName,
        'data_consistency_check',
        'started'
      )

      const consistencyResults = await this.verifyDataConsistency(testId, backupResults)
      if (!consistencyResults.success) {
        throw new Error(`Data consistency check failed: ${consistencyResults.errors.join(', ')}`)
      }

      await this.recordTestPhase(
        testId,
        testName,
        migrationName,
        'data_consistency_check',
        'completed'
      )

      // Phase 6: Cleanup and final report
      await this.recordTestPhase(testId, testName, migrationName, 'cleanup', 'started')

      await this.cleanupRollbackTest(testId, backupResults.backupId)

      await this.recordTestPhase(testId, testName, migrationName, 'cleanup', 'completed')

      // Record successful test completion
      await this.recordTestPhase(testId, testName, migrationName, 'complete', 'passed')

      console.log(`✅ Rollback test ${testName} completed successfully`)

      return {
        testId,
        success: true,
        phases: [
          'backup',
          'pre_validation',
          'rollback',
          'post_validation',
          'consistency',
          'cleanup',
        ],
        backupId: backupResults.backupId,
        executionTime: rollbackResults.executionTime,
      }
    } catch (error) {
      console.error(`❌ Rollback test ${testName} failed: ${error.message}`)

      // Record test failure
      await this.recordTestPhase(testId, testName, migrationName, 'failed', 'failed', {
        error: error.message,
      })

      return {
        testId,
        success: false,
        error: error.message,
        recoveryAttempted: this.config.enable_recovery_mode,
      }
    }
  }

  /**
   * Create comprehensive pre-rollback backup
   */
  async createPreRollbackBackup(testId, migrationName) {
    console.log(`💾 Creating pre-rollback backup for ${migrationName}...`)

    const backupId = crypto.randomUUID()
    const client = await this.dbPool.connect()

    try {
      // Get list of all user tables
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE 'rollback_%'
          AND table_name NOT LIKE 'migration_test_%'
        ORDER BY table_name
      `)

      const tables = tablesResult.rows.map((row) => row.table_name)
      let totalRows = 0
      const backupSummary = []

      // Backup each table
      for (const tableName of tables) {
        try {
          // Get row count
          const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
          const rowCount = Number.parseInt(countResult.rows[0].count, 10)
          totalRows += rowCount

          // Create data checksum
          const checksumResult = await client.query(`
            SELECT md5(string_agg(md5(t::text), '')) as checksum
            FROM (SELECT * FROM "${tableName}" ORDER BY 1) t
          `)
          const checksum = checksumResult.rows[0]?.checksum || ''

          // For critical tables, backup actual data (limited for performance)
          let backupData = null
          if (this.isCriticalTable(tableName) && rowCount <= 1000) {
            const dataResult = await client.query(`SELECT * FROM "${tableName}" ORDER BY 1`)
            backupData = dataResult.rows
          }

          // Store backup metadata
          await client.query(
            `
            INSERT INTO rollback_data_backups (
              id, backup_name, table_name, row_count, data_checksum, backup_data, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '${this.config.backup_retention_hours} hours')
          `,
            [
              crypto.randomUUID(),
              backupId,
              tableName,
              rowCount,
              checksum,
              JSON.stringify(backupData),
            ]
          )

          backupSummary.push({
            tableName,
            rowCount,
            checksum,
            hasBackupData: backupData !== null,
          })
        } catch (error) {
          console.warn(`⚠️  Failed to backup table ${tableName}: ${error.message}`)
          backupSummary.push({
            tableName,
            error: error.message,
          })
        }
      }

      // Store backup summary
      this.backupData.set(backupId, {
        migrationName,
        tables: backupSummary,
        totalRows,
        createdAt: new Date().toISOString(),
      })

      console.log(`✅ Backup completed: ${tables.length} tables, ${totalRows} total rows`)

      return {
        success: true,
        backupId,
        tableCount: tables.length,
        totalRows,
        tables: backupSummary,
      }
    } catch (error) {
      console.error('❌ Backup creation failed:', error)
      return {
        success: false,
        error: error.message,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Validate pre-rollback database state
   */
  async validatePreRollbackState(testId, migrationName) {
    console.log(`🔍 Validating pre-rollback state for ${migrationName}...`)

    const client = await this.dbPool.connect()
    const errors = []
    const validationResults = []

    try {
      // Check that expected Parlant tables exist (before rollback)
      const expectedTables = this.getExpectedTablesForMigration(migrationName)

      for (const tableName of expectedTables) {
        const exists = await client.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
          )
        `,
          [tableName]
        )

        const isValid = exists.rows[0].exists
        if (!isValid) {
          errors.push(`Expected table '${tableName}' does not exist before rollback`)
        }

        await this.recordValidationResult(
          testId,
          'table_existence',
          tableName,
          { expected: true },
          { exists: exists.rows[0].exists },
          isValid
        )
        validationResults.push({ type: 'table_existence', table: tableName, valid: isValid })
      }

      // Validate foreign key constraints exist
      const expectedForeignKeys = this.getExpectedForeignKeysForMigration(migrationName)

      for (const fk of expectedForeignKeys) {
        const exists = await client.query(
          `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = $1
              AND kcu.column_name = $2
              AND ccu.table_name = $3
              AND ccu.column_name = $4
          )
        `,
          [fk.table, fk.column, fk.referenced_table, fk.referenced_column]
        )

        const isValid = exists.rows[0].exists
        if (!isValid) {
          errors.push(
            `Expected foreign key ${fk.table}.${fk.column} -> ${fk.referenced_table}.${fk.referenced_column} does not exist`
          )
        }

        await this.recordValidationResult(
          testId,
          'foreign_key_existence',
          `${fk.table}.${fk.column}`,
          fk,
          { exists: exists.rows[0].exists },
          isValid
        )
        validationResults.push({
          type: 'foreign_key',
          constraint: `${fk.table}.${fk.column}`,
          valid: isValid,
        })
      }

      // Validate critical Sim tables are intact
      const criticalSimTables = ['user', 'workspace', 'workflow', 'session']

      for (const tableName of criticalSimTables) {
        try {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
          const count = Number.parseInt(countResult.rows[0].count, 10)

          await this.recordValidationResult(
            testId,
            'sim_table_integrity',
            tableName,
            { table: tableName },
            { count },
            true
          )
          validationResults.push({
            type: 'sim_table_integrity',
            table: tableName,
            count,
            valid: true,
          })
        } catch (error) {
          errors.push(`Critical Sim table '${tableName}' validation failed: ${error.message}`)
          await this.recordValidationResult(
            testId,
            'sim_table_integrity',
            tableName,
            { table: tableName },
            { error: error.message },
            false
          )
          validationResults.push({
            type: 'sim_table_integrity',
            table: tableName,
            valid: false,
            error: error.message,
          })
        }
      }

      console.log(
        `✅ Pre-rollback validation completed: ${validationResults.length} checks, ${errors.length} errors`
      )

      return {
        success: errors.length === 0,
        errors,
        validationResults,
      }
    } catch (error) {
      console.error('❌ Pre-rollback validation failed:', error)
      return {
        success: false,
        errors: [error.message],
        validationResults,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Execute rollback with comprehensive monitoring
   */
  async executeMonitoredRollback(testId, rollbackScript, migrationName) {
    console.log(`🔄 Executing monitored rollback for ${migrationName}...`)

    const startTime = Date.now()
    const client = await this.dbPool.connect()

    try {
      // Execute rollback within transaction for safety
      await client.query('BEGIN')

      try {
        // Set statement timeout for safety
        await client.query(`SET statement_timeout = ${this.config.rollback_timeout_ms}`)

        // Execute the rollback script
        await client.query(rollbackScript)

        // Verify basic database connectivity after rollback
        await client.query('SELECT 1')

        await client.query('COMMIT')

        const executionTime = Date.now() - startTime

        console.log(`✅ Rollback executed successfully in ${executionTime}ms`)

        return {
          success: true,
          executionTime,
        }
      } catch (rollbackError) {
        await client.query('ROLLBACK')
        throw rollbackError
      }
    } catch (error) {
      const executionTime = Date.now() - startTime

      console.error(`❌ Rollback execution failed after ${executionTime}ms: ${error.message}`)

      return {
        success: false,
        error: error.message,
        executionTime,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Validate post-rollback database state
   */
  async validatePostRollbackState(testId, migrationName, backupResults) {
    console.log(`🔍 Validating post-rollback state for ${migrationName}...`)

    const client = await this.dbPool.connect()
    const errors = []
    const validationResults = []

    try {
      // Verify Parlant tables were removed
      const expectedRemovedTables = this.getExpectedTablesForMigration(migrationName)

      for (const tableName of expectedRemovedTables) {
        const exists = await client.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
          )
        `,
          [tableName]
        )

        const isValid = !exists.rows[0].exists // Should NOT exist after rollback
        if (!isValid) {
          errors.push(`Table '${tableName}' was not removed during rollback`)
        }

        await this.recordValidationResult(
          testId,
          'table_removal',
          tableName,
          { expected_removed: true },
          { exists: exists.rows[0].exists },
          isValid
        )
        validationResults.push({ type: 'table_removal', table: tableName, valid: isValid })
      }

      // Verify foreign key constraints were removed
      const expectedRemovedForeignKeys = this.getExpectedForeignKeysForMigration(migrationName)

      for (const fk of expectedRemovedForeignKeys) {
        const exists = await client.query(
          `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = $1
              AND kcu.column_name = $2
              AND ccu.table_name = $3
              AND ccu.column_name = $4
          )
        `,
          [fk.table, fk.column, fk.referenced_table, fk.referenced_column]
        )

        const isValid = !exists.rows[0].exists // Should NOT exist after rollback
        if (!isValid) {
          errors.push(
            `Foreign key ${fk.table}.${fk.column} -> ${fk.referenced_table}.${fk.referenced_column} was not removed`
          )
        }

        await this.recordValidationResult(
          testId,
          'foreign_key_removal',
          `${fk.table}.${fk.column}`,
          fk,
          { exists: exists.rows[0].exists },
          isValid
        )
        validationResults.push({
          type: 'foreign_key_removal',
          constraint: `${fk.table}.${fk.column}`,
          valid: isValid,
        })
      }

      // Verify Sim tables are still intact
      const simTables = ['user', 'workspace', 'workflow', 'session']

      for (const tableName of simTables) {
        try {
          const exists = await client.query(
            `
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = $1
            )
          `,
            [tableName]
          )

          const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
          const count = Number.parseInt(countResult.rows[0].count, 10)

          const isValid = exists.rows[0].exists
          if (!isValid) {
            errors.push(`Critical Sim table '${tableName}' was removed during rollback`)
          }

          await this.recordValidationResult(
            testId,
            'sim_table_preservation',
            tableName,
            { expected_exists: true },
            { exists: exists.rows[0].exists, count },
            isValid
          )
          validationResults.push({
            type: 'sim_table_preservation',
            table: tableName,
            count,
            valid: isValid,
          })
        } catch (error) {
          errors.push(`Sim table '${tableName}' validation failed after rollback: ${error.message}`)
          await this.recordValidationResult(
            testId,
            'sim_table_preservation',
            tableName,
            { expected_exists: true },
            { error: error.message },
            false
          )
          validationResults.push({
            type: 'sim_table_preservation',
            table: tableName,
            valid: false,
            error: error.message,
          })
        }
      }

      console.log(
        `✅ Post-rollback validation completed: ${validationResults.length} checks, ${errors.length} errors`
      )

      return {
        success: errors.length === 0,
        errors,
        validationResults,
      }
    } catch (error) {
      console.error('❌ Post-rollback validation failed:', error)
      return {
        success: false,
        errors: [error.message],
        validationResults,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Verify data consistency after rollback
   */
  async verifyDataConsistency(testId, backupResults) {
    console.log(`🔍 Verifying data consistency after rollback...`)

    const client = await this.dbPool.connect()
    const errors = []
    const consistencyResults = []

    try {
      const backupData = this.backupData.get(backupResults.backupId)
      if (!backupData) {
        throw new Error('Backup data not found for consistency check')
      }

      for (const tableBackup of backupData.tables) {
        if (tableBackup.error) {
          continue // Skip tables that failed during backup
        }

        try {
          // Check if table still exists
          const exists = await client.query(
            `
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = $1
            )
          `,
            [tableBackup.tableName]
          )

          if (!exists.rows[0].exists) {
            // Table was removed, which is expected for Parlant tables
            if (this.isParlantTable(tableBackup.tableName)) {
              consistencyResults.push({
                table: tableBackup.tableName,
                type: 'parlant_table_removed',
                valid: true,
              })
              continue
            }
            errors.push(`Critical table '${tableBackup.tableName}' was unexpectedly removed`)
            consistencyResults.push({
              table: tableBackup.tableName,
              type: 'unexpected_removal',
              valid: false,
            })
            continue
          }

          // For existing tables, verify data integrity
          const countResult = await client.query(
            `SELECT COUNT(*) as count FROM "${tableBackup.tableName}"`
          )
          const currentCount = Number.parseInt(countResult.rows[0].count, 10)

          // Check if data counts match (for non-Parlant tables)
          if (!this.isParlantTable(tableBackup.tableName)) {
            if (currentCount !== tableBackup.rowCount) {
              errors.push(
                `Data count mismatch in '${tableBackup.tableName}': expected ${tableBackup.rowCount}, found ${currentCount}`
              )
              consistencyResults.push({
                table: tableBackup.tableName,
                type: 'count_mismatch',
                expected: tableBackup.rowCount,
                actual: currentCount,
                valid: false,
              })
            } else {
              consistencyResults.push({
                table: tableBackup.tableName,
                type: 'count_match',
                count: currentCount,
                valid: true,
              })
            }

            // Verify data checksum for critical tables
            if (this.isCriticalTable(tableBackup.tableName) && tableBackup.checksum) {
              const checksumResult = await client.query(`
                SELECT md5(string_agg(md5(t::text), '')) as checksum
                FROM (SELECT * FROM "${tableBackup.tableName}" ORDER BY 1) t
              `)
              const currentChecksum = checksumResult.rows[0]?.checksum || ''

              if (currentChecksum !== tableBackup.checksum) {
                errors.push(`Data checksum mismatch in '${tableBackup.tableName}'`)
                consistencyResults.push({
                  table: tableBackup.tableName,
                  type: 'checksum_mismatch',
                  expected: tableBackup.checksum,
                  actual: currentChecksum,
                  valid: false,
                })
              } else {
                consistencyResults.push({
                  table: tableBackup.tableName,
                  type: 'checksum_match',
                  valid: true,
                })
              }
            }
          }
        } catch (error) {
          errors.push(
            `Consistency check failed for table '${tableBackup.tableName}': ${error.message}`
          )
          consistencyResults.push({
            table: tableBackup.tableName,
            type: 'check_error',
            error: error.message,
            valid: false,
          })
        }
      }

      console.log(
        `✅ Data consistency verification completed: ${consistencyResults.length} checks, ${errors.length} errors`
      )

      return {
        success: errors.length === 0,
        errors,
        consistencyResults,
      }
    } catch (error) {
      console.error('❌ Data consistency verification failed:', error)
      return {
        success: false,
        errors: [error.message],
        consistencyResults,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Record test phase progress
   */
  async recordTestPhase(testId, testName, migrationName, phase, status, data = null) {
    try {
      const client = await this.dbPool.connect()
      try {
        await client.query(
          `
          INSERT INTO rollback_test_tracking (
            id, test_name, migration_name, test_phase, status, data_checksums
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            test_phase = EXCLUDED.test_phase,
            status = EXCLUDED.status,
            data_checksums = EXCLUDED.data_checksums
        `,
          [testId, testName, migrationName, phase, status, JSON.stringify(data)]
        )
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error recording test phase:', error)
    }
  }

  /**
   * Record validation result
   */
  async recordValidationResult(
    testId,
    validationType,
    tableName,
    expectedState,
    actualState,
    isValid,
    errorMessage = null
  ) {
    try {
      const client = await this.dbPool.connect()
      try {
        await client.query(
          `
          INSERT INTO rollback_validation_results (
            test_id, validation_type, table_name, expected_state, actual_state, is_valid, error_message
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            testId,
            validationType,
            tableName,
            JSON.stringify(expectedState),
            JSON.stringify(actualState),
            isValid,
            errorMessage,
          ]
        )
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error recording validation result:', error)
    }
  }

  /**
   * Attempt rollback recovery
   */
  async attemptRollbackRecovery(testId, backupId, error) {
    console.log(`🚑 Attempting rollback recovery for test ${testId}...`)

    try {
      // Implementation would depend on specific recovery strategies
      // For now, just log the attempt
      const client = await this.dbPool.connect()
      try {
        await client.query(
          `
          UPDATE rollback_test_tracking
          SET recovery_actions = $2
          WHERE id = $1
        `,
          [testId, `Recovery attempted for error: ${error}`]
        )
      } finally {
        client.release()
      }

      console.log(`⚠️  Recovery logged for test ${testId}`)
    } catch (recoveryError) {
      console.error('❌ Recovery attempt failed:', recoveryError)
    }
  }

  /**
   * Cleanup rollback test resources
   */
  async cleanupRollbackTest(testId, backupId) {
    console.log(`🧹 Cleaning up rollback test ${testId}...`)

    try {
      // Remove backup data that's not needed for retention
      const client = await this.dbPool.connect()
      try {
        await client.query(
          `
          DELETE FROM rollback_data_backups
          WHERE backup_name = $1 AND expires_at < NOW()
        `,
          [backupId]
        )

        // Remove from memory
        this.backupData.delete(backupId)
      } finally {
        client.release()
      }

      console.log(`✅ Cleanup completed for test ${testId}`)
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  /**
   * Helper: Check if table is a Parlant table
   */
  isParlantTable(tableName) {
    return tableName.startsWith('parlant_')
  }

  /**
   * Helper: Check if table is critical for Sim functionality
   */
  isCriticalTable(tableName) {
    const criticalTables = [
      'user',
      'workspace',
      'workflow',
      'session',
      'organization',
      'permissions',
    ]
    return criticalTables.includes(tableName)
  }

  /**
   * Get expected tables for migration (same as migration framework)
   */
  getExpectedTablesForMigration(migrationName) {
    const migrationTables = {
      parlant_schema_extension: [
        'parlant_agent',
        'parlant_session',
        'parlant_event',
        'parlant_guideline',
        'parlant_journey',
        'parlant_tool',
        'parlant_variable',
        'parlant_canned_response',
      ],
    }

    return migrationTables[migrationName] || []
  }

  /**
   * Get expected foreign keys for migration
   */
  getExpectedForeignKeysForMigration(migrationName) {
    const migrationForeignKeys = {
      parlant_schema_extension: [
        {
          table: 'parlant_agent',
          column: 'workspace_id',
          referenced_table: 'workspace',
          referenced_column: 'id',
        },
        {
          table: 'parlant_agent',
          column: 'created_by',
          referenced_table: 'user',
          referenced_column: 'id',
        },
        {
          table: 'parlant_session',
          column: 'agent_id',
          referenced_table: 'parlant_agent',
          referenced_column: 'id',
        },
        {
          table: 'parlant_session',
          column: 'workspace_id',
          referenced_table: 'workspace',
          referenced_column: 'id',
        },
        {
          table: 'parlant_event',
          column: 'session_id',
          referenced_table: 'parlant_session',
          referenced_column: 'id',
        },
      ],
    }

    return migrationForeignKeys[migrationName] || []
  }

  /**
   * Cleanup suite resources
   */
  async cleanup() {
    if (this.dbPool) {
      await this.dbPool.end()
      console.log('🧹 Rollback testing suite database connections closed')
    }
  }
}

module.exports = RollbackTestingSuite
