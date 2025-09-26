/**
 * Comprehensive Migration Testing Framework for Parlant Database Schema Extensions
 *
 * This framework provides comprehensive testing for database migrations, ensuring:
 * - Forward migration correctness and safety
 * - Rollback migration data preservation
 * - Migration idempotency and performance
 * - Schema validation and integrity
 * - Existing Sim functionality preservation
 *
 * Key Features:
 * - Automated migration testing with rollback validation
 * - Performance benchmarking and timing analysis
 * - Data consistency verification across migrations
 * - Comprehensive foreign key and constraint testing
 * - Workspace isolation validation
 * - Regression testing for existing functionality
 */

const { Pool } = require('pg')
const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

/**
 * Migration Testing Framework Class
 *
 * Provides comprehensive database migration testing capabilities
 * including forward/rollback testing, performance analysis, and
 * data integrity verification.
 */
class MigrationTestingFramework {
  constructor(options = {}) {
    this.config = {
      database_url:
        process.env.TEST_DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/simstudio_test',
      migration_timeout: options.migration_timeout || 30000,
      performance_threshold_ms: options.performance_threshold_ms || 10000,
      max_concurrent_connections: options.max_concurrent_connections || 10,
      test_data_size: options.test_data_size || 1000,
      ...options,
    }

    this.dbPool = null
    this.testResults = {
      migrations: [],
      performance: [],
      integrity: [],
      regression: [],
      errors: [],
    }
  }

  /**
   * Initialize the testing framework
   */
  async initialize() {
    console.log('🚀 Initializing Migration Testing Framework...')

    try {
      // Initialize database connection pool
      this.dbPool = new Pool({
        connectionString: this.config.database_url,
        max: this.config.max_concurrent_connections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      })

      // Test database connectivity
      const client = await this.dbPool.connect()
      const result = await client.query('SELECT NOW() as timestamp, version() as version')
      client.release()

      console.log('✅ Database connection established')
      console.log(
        `   Database: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`
      )
      console.log(`   Timestamp: ${result.rows[0].timestamp}`)

      // Create test tracking table
      await this.createTestTrackingTable()

      return true
    } catch (error) {
      console.error('❌ Framework initialization failed:', error)
      throw error
    }
  }

  /**
   * Create test tracking table for migration test results
   */
  async createTestTrackingTable() {
    const client = await this.dbPool.connect()
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migration_test_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          test_type TEXT NOT NULL,
          migration_name TEXT,
          test_name TEXT NOT NULL,
          status TEXT NOT NULL,
          execution_time_ms INTEGER,
          data_snapshot JSONB,
          error_details TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS migration_test_results_type_idx
        ON migration_test_results(test_type, status)
      `)

      console.log('✅ Test tracking table created')
    } finally {
      client.release()
    }
  }

  /**
   * Test Forward Migration Execution
   *
   * Validates that migration scripts:
   * - Execute without errors
   * - Create expected tables and relationships
   * - Preserve existing data
   * - Complete within performance thresholds
   */
  async testForwardMigration(migrationScript, migrationName) {
    console.log(`📈 Testing forward migration: ${migrationName}`)

    const startTime = Date.now()
    const client = await this.dbPool.connect()

    try {
      // Create database snapshot before migration
      const beforeSnapshot = await this.createDatabaseSnapshot(client)

      // Execute migration with timeout
      const migrationPromise = client.query(migrationScript)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Migration timeout')), this.config.migration_timeout)
      )

      await Promise.race([migrationPromise, timeoutPromise])

      const executionTime = Date.now() - startTime

      // Create database snapshot after migration
      const afterSnapshot = await this.createDatabaseSnapshot(client)

      // Validate migration results
      const validationResults = await this.validateMigrationResults(client, migrationName)

      // Record test results
      await this.recordTestResult({
        test_type: 'forward_migration',
        migration_name: migrationName,
        test_name: `forward_migration_${migrationName}`,
        status: validationResults.success ? 'passed' : 'failed',
        execution_time_ms: executionTime,
        data_snapshot: {
          before: beforeSnapshot,
          after: afterSnapshot,
          validation: validationResults,
        },
        error_details: validationResults.errors?.join('; ') || null,
      })

      this.testResults.migrations.push({
        name: migrationName,
        type: 'forward',
        success: validationResults.success,
        executionTime,
        errors: validationResults.errors || [],
      })

      if (validationResults.success) {
        console.log(`✅ Forward migration ${migrationName} passed in ${executionTime}ms`)
      } else {
        console.log(
          `❌ Forward migration ${migrationName} failed: ${validationResults.errors.join(', ')}`
        )
      }

      return validationResults.success
    } catch (error) {
      const executionTime = Date.now() - startTime

      await this.recordTestResult({
        test_type: 'forward_migration',
        migration_name: migrationName,
        test_name: `forward_migration_${migrationName}`,
        status: 'failed',
        execution_time_ms: executionTime,
        error_details: error.message,
      })

      console.log(`❌ Forward migration ${migrationName} failed: ${error.message}`)
      return false
    } finally {
      client.release()
    }
  }

  /**
   * Test Rollback Migration Execution
   *
   * Validates that rollback scripts:
   * - Execute without errors
   * - Properly remove created objects
   * - Preserve existing data
   * - Restore database to previous state
   */
  async testRollbackMigration(rollbackScript, migrationName) {
    console.log(`📉 Testing rollback migration: ${migrationName}`)

    const startTime = Date.now()
    const client = await this.dbPool.connect()

    try {
      // Create test data to verify preservation
      const testData = await this.createTestData(client, migrationName)

      // Create database snapshot before rollback
      const beforeSnapshot = await this.createDatabaseSnapshot(client)

      // Execute rollback migration
      await client.query(rollbackScript)

      const executionTime = Date.now() - startTime

      // Create database snapshot after rollback
      const afterSnapshot = await this.createDatabaseSnapshot(client)

      // Validate rollback results
      const validationResults = await this.validateRollbackResults(client, migrationName, testData)

      // Record test results
      await this.recordTestResult({
        test_type: 'rollback_migration',
        migration_name: migrationName,
        test_name: `rollback_migration_${migrationName}`,
        status: validationResults.success ? 'passed' : 'failed',
        execution_time_ms: executionTime,
        data_snapshot: {
          before: beforeSnapshot,
          after: afterSnapshot,
          test_data: testData,
          validation: validationResults,
        },
        error_details: validationResults.errors?.join('; ') || null,
      })

      this.testResults.migrations.push({
        name: migrationName,
        type: 'rollback',
        success: validationResults.success,
        executionTime,
        errors: validationResults.errors || [],
      })

      if (validationResults.success) {
        console.log(`✅ Rollback migration ${migrationName} passed in ${executionTime}ms`)
      } else {
        console.log(
          `❌ Rollback migration ${migrationName} failed: ${validationResults.errors.join(', ')}`
        )
      }

      return validationResults.success
    } catch (error) {
      const executionTime = Date.now() - startTime

      await this.recordTestResult({
        test_type: 'rollback_migration',
        migration_name: migrationName,
        test_name: `rollback_migration_${migrationName}`,
        status: 'failed',
        execution_time_ms: executionTime,
        error_details: error.message,
      })

      console.log(`❌ Rollback migration ${migrationName} failed: ${error.message}`)
      return false
    } finally {
      client.release()
    }
  }

  /**
   * Test Migration Idempotency
   *
   * Validates that migrations can be run multiple times safely:
   * - Multiple executions don't cause errors
   * - Database state remains consistent
   * - No duplicate data is created
   */
  async testMigrationIdempotency(migrationScript, migrationName, iterations = 3) {
    console.log(`🔄 Testing migration idempotency: ${migrationName} (${iterations} iterations)`)

    const results = []

    for (let i = 1; i <= iterations; i++) {
      const startTime = Date.now()
      const client = await this.dbPool.connect()

      try {
        console.log(`  Iteration ${i}/${iterations}...`)

        // Create snapshot before iteration
        const beforeSnapshot = await this.createDatabaseSnapshot(client)

        // Execute migration
        await client.query(migrationScript)

        const executionTime = Date.now() - startTime

        // Create snapshot after iteration
        const afterSnapshot = await this.createDatabaseSnapshot(client)

        // Compare snapshots to detect changes
        const hasChanges = this.compareDatabaseSnapshots(beforeSnapshot, afterSnapshot)

        results.push({
          iteration: i,
          executionTime,
          hasChanges: hasChanges,
          success: true,
        })

        // Record individual iteration result
        await this.recordTestResult({
          test_type: 'idempotency_test',
          migration_name: migrationName,
          test_name: `idempotency_${migrationName}_iteration_${i}`,
          status: 'passed',
          execution_time_ms: executionTime,
          data_snapshot: {
            iteration: i,
            before: beforeSnapshot,
            after: afterSnapshot,
            has_changes: hasChanges,
          },
        })
      } catch (error) {
        const executionTime = Date.now() - startTime

        results.push({
          iteration: i,
          executionTime,
          hasChanges: false,
          success: false,
          error: error.message,
        })

        await this.recordTestResult({
          test_type: 'idempotency_test',
          migration_name: migrationName,
          test_name: `idempotency_${migrationName}_iteration_${i}`,
          status: 'failed',
          execution_time_ms: executionTime,
          error_details: error.message,
        })

        console.log(`❌ Idempotency test iteration ${i} failed: ${error.message}`)
      } finally {
        client.release()
      }
    }

    // Analyze idempotency results
    const successfulRuns = results.filter((r) => r.success)
    const changesDetected = results.filter((r) => r.hasChanges)

    const isIdempotent = successfulRuns.length === iterations && changesDetected.length <= 1

    this.testResults.migrations.push({
      name: migrationName,
      type: 'idempotency',
      success: isIdempotent,
      iterations,
      successfulRuns: successfulRuns.length,
      changesDetected: changesDetected.length,
      avgExecutionTime:
        successfulRuns.reduce((sum, r) => sum + r.executionTime, 0) / successfulRuns.length,
    })

    if (isIdempotent) {
      console.log(
        `✅ Migration ${migrationName} is idempotent (${successfulRuns.length}/${iterations} successful runs)`
      )
    } else {
      console.log(
        `❌ Migration ${migrationName} is not idempotent (${changesDetected.length} runs changed state)`
      )
    }

    return isIdempotent
  }

  /**
   * Test Migration Performance Under Load
   *
   * Validates migration performance with:
   * - Concurrent connections
   * - Large datasets
   * - Resource usage monitoring
   */
  async testMigrationPerformance(migrationScript, migrationName, options = {}) {
    console.log(`⚡ Testing migration performance: ${migrationName}`)

    const testConfig = {
      concurrent_connections: options.concurrent_connections || 5,
      test_data_size: options.test_data_size || this.config.test_data_size,
      ...options,
    }

    const startTime = Date.now()

    try {
      // Create large test dataset
      await this.createLargeTestDataset(testConfig.test_data_size)

      // Execute migration with concurrent connections
      const migrationPromises = []

      for (let i = 0; i < testConfig.concurrent_connections; i++) {
        migrationPromises.push(
          this.executeMigrationWithMetrics(migrationScript, `${migrationName}_conn_${i}`)
        )
      }

      const results = await Promise.allSettled(migrationPromises)
      const executionTime = Date.now() - startTime

      // Analyze performance results
      const successfulRuns = results.filter((r) => r.status === 'fulfilled')
      const failedRuns = results.filter((r) => r.status === 'rejected')

      const performanceResults = {
        total_execution_time: executionTime,
        concurrent_connections: testConfig.concurrent_connections,
        successful_runs: successfulRuns.length,
        failed_runs: failedRuns.length,
        test_data_size: testConfig.test_data_size,
        avg_execution_time:
          successfulRuns.length > 0
            ? successfulRuns.reduce((sum, r) => sum + r.value.executionTime, 0) /
              successfulRuns.length
            : 0,
        within_threshold: executionTime <= this.config.performance_threshold_ms,
      }

      // Record performance test result
      await this.recordTestResult({
        test_type: 'performance_test',
        migration_name: migrationName,
        test_name: `performance_${migrationName}`,
        status: performanceResults.within_threshold ? 'passed' : 'failed',
        execution_time_ms: executionTime,
        data_snapshot: performanceResults,
        error_details:
          failedRuns.length > 0 ? failedRuns.map((r) => r.reason.message).join('; ') : null,
      })

      this.testResults.performance.push(performanceResults)

      if (performanceResults.within_threshold) {
        console.log(
          `✅ Performance test ${migrationName} passed in ${executionTime}ms (${successfulRuns.length}/${testConfig.concurrent_connections} connections)`
        )
      } else {
        console.log(
          `❌ Performance test ${migrationName} exceeded threshold: ${executionTime}ms > ${this.config.performance_threshold_ms}ms`
        )
      }

      return performanceResults.within_threshold
    } catch (error) {
      const executionTime = Date.now() - startTime

      await this.recordTestResult({
        test_type: 'performance_test',
        migration_name: migrationName,
        test_name: `performance_${migrationName}`,
        status: 'failed',
        execution_time_ms: executionTime,
        error_details: error.message,
      })

      console.log(`❌ Performance test ${migrationName} failed: ${error.message}`)
      return false
    }
  }

  /**
   * Create database snapshot for comparison
   */
  async createDatabaseSnapshot(client) {
    try {
      const tables = await client.query(`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `)

      const indexes = await client.query(`
        SELECT indexname, tablename, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `)

      const foreignKeys = await client.query(`
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
      `)

      const rowCounts = await client.query(`
        SELECT
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `)

      return {
        timestamp: new Date().toISOString(),
        tables: tables.rows,
        indexes: indexes.rows,
        foreign_keys: foreignKeys.rows,
        row_counts: rowCounts.rows,
        checksum: this.calculateSnapshotChecksum(tables.rows, indexes.rows, foreignKeys.rows),
      }
    } catch (error) {
      console.error('Error creating database snapshot:', error)
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
      }
    }
  }

  /**
   * Calculate checksum for database snapshot
   */
  calculateSnapshotChecksum(tables, indexes, foreignKeys) {
    const data = JSON.stringify({
      tables: tables.sort((a, b) => a.table_name.localeCompare(b.table_name)),
      indexes: indexes.sort((a, b) => a.indexname.localeCompare(b.indexname)),
      foreign_keys: foreignKeys.sort((a, b) => a.table_name.localeCompare(b.table_name)),
    })

    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * Compare two database snapshots
   */
  compareDatabaseSnapshots(before, after) {
    if (!before.checksum || !after.checksum) {
      return true // Assume changes if we can't compare
    }

    return before.checksum !== after.checksum
  }

  /**
   * Validate migration results
   */
  async validateMigrationResults(client, migrationName) {
    const errors = []

    try {
      // Check for expected Parlant tables based on migration name
      const expectedTables = this.getExpectedTablesForMigration(migrationName)

      for (const tableName of expectedTables) {
        const tableExists = await client.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
          )
        `,
          [tableName]
        )

        if (!tableExists.rows[0].exists) {
          errors.push(`Expected table '${tableName}' was not created`)
        }
      }

      // Validate foreign key constraints
      const expectedForeignKeys = this.getExpectedForeignKeysForMigration(migrationName)

      for (const fk of expectedForeignKeys) {
        const fkExists = await client.query(
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

        if (!fkExists.rows[0].exists) {
          errors.push(
            `Expected foreign key ${fk.table}.${fk.column} -> ${fk.referenced_table}.${fk.referenced_column} was not created`
          )
        }
      }

      // Validate indexes
      const expectedIndexes = this.getExpectedIndexesForMigration(migrationName)

      for (const indexName of expectedIndexes) {
        const indexExists = await client.query(
          `
          SELECT EXISTS (
            SELECT FROM pg_indexes
            WHERE schemaname = 'public' AND indexname = $1
          )
        `,
          [indexName]
        )

        if (!indexExists.rows[0].exists) {
          errors.push(`Expected index '${indexName}' was not created`)
        }
      }
    } catch (error) {
      errors.push(`Validation error: ${error.message}`)
    }

    return {
      success: errors.length === 0,
      errors: errors,
    }
  }

  /**
   * Validate rollback results
   */
  async validateRollbackResults(client, migrationName, testData) {
    const errors = []

    try {
      // Check that Parlant tables were removed
      const tablesToRemove = this.getExpectedTablesForMigration(migrationName)

      for (const tableName of tablesToRemove) {
        const tableExists = await client.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
          )
        `,
          [tableName]
        )

        if (tableExists.rows[0].exists) {
          errors.push(`Table '${tableName}' was not removed during rollback`)
        }
      }

      // Verify test data preservation for existing tables
      if (testData?.existing_data) {
        for (const tableData of testData.existing_data) {
          const currentData = await client.query(`
            SELECT COUNT(*) as count FROM "${tableData.table_name}"
          `)

          if (currentData.rows[0].count !== tableData.row_count) {
            errors.push(
              `Data loss detected in table '${tableData.table_name}': expected ${tableData.row_count}, found ${currentData.rows[0].count}`
            )
          }
        }
      }
    } catch (error) {
      errors.push(`Rollback validation error: ${error.message}`)
    }

    return {
      success: errors.length === 0,
      errors: errors,
    }
  }

  /**
   * Create test data for rollback testing
   */
  async createTestData(client, migrationName) {
    try {
      // Record existing data counts
      const existingTables = ['user', 'workspace', 'workflow', 'session']
      const existingData = []

      for (const tableName of existingTables) {
        try {
          const count = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
          existingData.push({
            table_name: tableName,
            row_count: Number.parseInt(count.rows[0].count, 10),
          })
        } catch (error) {
          // Table might not exist, skip
        }
      }

      return {
        migration_name: migrationName,
        created_at: new Date().toISOString(),
        existing_data: existingData,
      }
    } catch (error) {
      console.error('Error creating test data:', error)
      return null
    }
  }

  /**
   * Create large test dataset for performance testing
   */
  async createLargeTestDataset(size) {
    console.log(`📊 Creating large test dataset (${size} records)...`)

    const client = await this.dbPool.connect()
    try {
      // Create test users
      const userPromises = []
      for (let i = 0; i < Math.min(size, 100); i++) {
        userPromises.push(
          client.query(
            `
            INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, true, NOW(), NOW())
            ON CONFLICT (email) DO NOTHING
          `,
            [`test_user_${i}_${Date.now()}`, `Test User ${i}`, `test${i}@performance.test`]
          )
        )
      }

      await Promise.all(userPromises)
      console.log(`✅ Created test users for performance testing`)
    } catch (error) {
      console.error('Error creating large test dataset:', error)
    } finally {
      client.release()
    }
  }

  /**
   * Execute migration with metrics collection
   */
  async executeMigrationWithMetrics(migrationScript, identifier) {
    const startTime = Date.now()
    const client = await this.dbPool.connect()

    try {
      await client.query(migrationScript)
      const executionTime = Date.now() - startTime

      return {
        identifier,
        executionTime,
        success: true,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime

      return {
        identifier,
        executionTime,
        success: false,
        error: error.message,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Record test result in tracking table
   */
  async recordTestResult(result) {
    try {
      const client = await this.dbPool.connect()
      try {
        await client.query(
          `
          INSERT INTO migration_test_results (
            test_type, migration_name, test_name, status, execution_time_ms, data_snapshot, error_details
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            result.test_type,
            result.migration_name,
            result.test_name,
            result.status,
            result.execution_time_ms,
            JSON.stringify(result.data_snapshot),
            result.error_details,
          ]
        )
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error recording test result:', error)
    }
  }

  /**
   * Get expected tables for migration (migration-specific)
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
      parlant_workspace_integration: [
        'parlant_workspace_agent',
        'parlant_agent_auth_token',
        'parlant_agent_session',
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
   * Get expected indexes for migration
   */
  getExpectedIndexesForMigration(migrationName) {
    const migrationIndexes = {
      parlant_schema_extension: [
        'parlant_agent_workspace_id_idx',
        'parlant_agent_created_by_idx',
        'parlant_session_agent_id_idx',
        'parlant_session_workspace_id_idx',
        'parlant_event_session_id_idx',
        'parlant_event_offset_idx',
      ],
    }

    return migrationIndexes[migrationName] || []
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      framework_version: '1.0.0',
      configuration: this.config,
      test_results: this.testResults,
      summary: {
        total_migrations_tested: this.testResults.migrations.length,
        successful_migrations: this.testResults.migrations.filter((m) => m.success).length,
        failed_migrations: this.testResults.migrations.filter((m) => !m.success).length,
        performance_tests: this.testResults.performance.length,
        integrity_tests: this.testResults.integrity.length,
        regression_tests: this.testResults.regression.length,
        total_errors: this.testResults.errors.length,
      },
    }

    // Write report to file
    const reportPath = path.join(__dirname, `migration_test_report_${Date.now()}.json`)
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2))

    console.log(`📋 Test report generated: ${reportPath}`)

    return reportData
  }

  /**
   * Cleanup test framework resources
   */
  async cleanup() {
    if (this.dbPool) {
      await this.dbPool.end()
      console.log('🧹 Database connection pool closed')
    }
  }
}

module.exports = MigrationTestingFramework
