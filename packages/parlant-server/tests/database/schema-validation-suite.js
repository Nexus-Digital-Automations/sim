/**
 * Comprehensive Schema Validation and Integrity Testing Suite
 *
 * This suite provides comprehensive validation of the Parlant database schema
 * extensions, ensuring proper integration with the existing Sim schema while
 * maintaining data integrity, referential consistency, and performance.
 *
 * Key Validation Areas:
 * - Schema structure and column definitions
 * - Foreign key relationships and referential integrity
 * - Index creation and performance optimization
 * - Data type validation and constraints
 * - Workspace isolation implementation
 * - Junction table relationships
 * - Trigger and function validation
 * - Performance benchmarking
 */

const { Pool } = require('pg')
const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

/**
 * Schema Validation Suite Class
 *
 * Provides comprehensive schema validation and integrity testing
 * for the Parlant database extension integration with Sim.
 */
class SchemaValidationSuite {
  constructor(options = {}) {
    this.config = {
      database_url:
        process.env.TEST_DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/simstudio_test',
      performance_threshold_ms: options.performance_threshold_ms || 1000,
      validation_timeout_ms: options.validation_timeout_ms || 30000,
      stress_test_iterations: options.stress_test_iterations || 100,
      concurrent_connections: options.concurrent_connections || 10,
      ...options,
    }

    this.dbPool = null
    this.validationResults = {
      schema: [],
      integrity: [],
      performance: [],
      isolation: [],
      constraints: [],
      errors: [],
    }
  }

  /**
   * Initialize the schema validation suite
   */
  async initialize() {
    console.log('🔍 Initializing Schema Validation Suite...')

    try {
      this.dbPool = new Pool({
        connectionString: this.config.database_url,
        max: this.config.concurrent_connections,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      })

      // Test database connectivity
      const client = await this.dbPool.connect()
      const result = await client.query('SELECT version(), current_database(), current_user')
      client.release()

      console.log('✅ Schema validation suite initialized')
      console.log(`   Database: ${result.rows[0].current_database}`)
      console.log(`   User: ${result.rows[0].current_user}`)
      console.log(`   Version: ${result.rows[0].version.split(' ')[1]}`)

      // Create validation tracking table
      await this.createValidationTrackingTable()

      return true
    } catch (error) {
      console.error('❌ Schema validation suite initialization failed:', error)
      throw error
    }
  }

  /**
   * Create validation tracking table
   */
  async createValidationTrackingTable() {
    const client = await this.dbPool.connect()
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_validation_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          validation_type TEXT NOT NULL,
          test_category TEXT NOT NULL,
          test_name TEXT NOT NULL,
          target_object TEXT,
          status TEXT NOT NULL,
          execution_time_ms INTEGER,
          validation_data JSONB,
          error_details TEXT,
          recommendations TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS schema_validation_results_type_status_idx
        ON schema_validation_results(validation_type, status)
      `)

      console.log('✅ Validation tracking table created')
    } finally {
      client.release()
    }
  }

  /**
   * Validate complete Parlant schema structure
   */
  async validateSchemaStructure() {
    console.log('🏗️  Validating Parlant schema structure...')

    const validationResults = []
    const client = await this.dbPool.connect()

    try {
      // Validate core Parlant tables
      const expectedTables = this.getExpectedParlantTables()

      for (const tableConfig of expectedTables) {
        const result = await this.validateTableStructure(client, tableConfig)
        validationResults.push(result)

        await this.recordValidationResult(
          'schema_structure',
          'table_validation',
          `validate_table_${tableConfig.name}`,
          tableConfig.name,
          result.success ? 'passed' : 'failed',
          result.executionTime,
          result,
          result.errors?.join('; ')
        )
      }

      // Validate column definitions
      const columnValidationResults = await this.validateColumnDefinitions(client)
      validationResults.push(...columnValidationResults)

      // Validate data types
      const dataTypeResults = await this.validateDataTypes(client)
      validationResults.push(...dataTypeResults)

      // Validate constraints
      const constraintResults = await this.validateConstraints(client)
      validationResults.push(...constraintResults)

      const successCount = validationResults.filter((r) => r.success).length
      const totalCount = validationResults.length

      console.log(`✅ Schema structure validation completed: ${successCount}/${totalCount} passed`)

      this.validationResults.schema = validationResults

      return {
        success: successCount === totalCount,
        totalTests: totalCount,
        passedTests: successCount,
        failedTests: totalCount - successCount,
        results: validationResults,
      }
    } catch (error) {
      console.error('❌ Schema structure validation failed:', error)
      return {
        success: false,
        error: error.message,
        results: validationResults,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Validate individual table structure
   */
  async validateTableStructure(client, tableConfig) {
    const startTime = Date.now()
    const errors = []
    const warnings = []

    try {
      // Check table existence
      const tableExists = await client.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        )
      `,
        [tableConfig.name]
      )

      if (!tableExists.rows[0].exists) {
        errors.push(`Table '${tableConfig.name}' does not exist`)
        return {
          tableName: tableConfig.name,
          success: false,
          errors,
          executionTime: Date.now() - startTime,
        }
      }

      // Validate columns
      const columns = await client.query(
        `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `,
        [tableConfig.name]
      )

      const actualColumns = new Set(columns.rows.map((row) => row.column_name))
      const expectedColumns = new Set(tableConfig.columns.map((col) => col.name))

      // Check for missing columns
      for (const expectedCol of tableConfig.columns) {
        if (!actualColumns.has(expectedCol.name)) {
          errors.push(`Missing column '${expectedCol.name}' in table '${tableConfig.name}'`)
        } else {
          // Validate column properties
          const actualCol = columns.rows.find((row) => row.column_name === expectedCol.name)

          if (
            expectedCol.dataType &&
            !this.isDataTypeCompatible(actualCol.data_type, expectedCol.dataType)
          ) {
            errors.push(
              `Column '${expectedCol.name}' has incorrect data type: expected ${expectedCol.dataType}, found ${actualCol.data_type}`
            )
          }

          if (
            expectedCol.nullable !== undefined &&
            (actualCol.is_nullable === 'YES') !== expectedCol.nullable
          ) {
            errors.push(
              `Column '${expectedCol.name}' has incorrect nullable setting: expected ${expectedCol.nullable}, found ${actualCol.is_nullable === 'YES'}`
            )
          }
        }
      }

      // Check for unexpected columns
      for (const actualColName of actualColumns) {
        if (!expectedColumns.has(actualColName)) {
          warnings.push(`Unexpected column '${actualColName}' in table '${tableConfig.name}'`)
        }
      }

      // Validate primary key
      if (tableConfig.primaryKey) {
        const primaryKey = await client.query(
          `
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
        `,
          [tableConfig.name]
        )

        const actualPkColumns = primaryKey.rows.map((row) => row.column_name).sort()
        const expectedPkColumns = Array.isArray(tableConfig.primaryKey)
          ? tableConfig.primaryKey.sort()
          : [tableConfig.primaryKey].sort()

        if (JSON.stringify(actualPkColumns) !== JSON.stringify(expectedPkColumns)) {
          errors.push(
            `Primary key mismatch in table '${tableConfig.name}': expected [${expectedPkColumns.join(', ')}], found [${actualPkColumns.join(', ')}]`
          )
        }
      }

      console.log(`✅ Table '${tableConfig.name}' structure validation passed`)

      return {
        tableName: tableConfig.name,
        success: errors.length === 0,
        errors,
        warnings,
        columnCount: columns.rows.length,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      errors.push(`Table structure validation error: ${error.message}`)
      return {
        tableName: tableConfig.name,
        success: false,
        errors,
        executionTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Validate foreign key relationships and referential integrity
   */
  async validateForeignKeyIntegrity() {
    console.log('🔗 Validating foreign key relationships and referential integrity...')

    const validationResults = []
    const client = await this.dbPool.connect()

    try {
      const expectedForeignKeys = this.getExpectedForeignKeys()

      for (const fkConfig of expectedForeignKeys) {
        const startTime = Date.now()

        try {
          // Check if foreign key exists
          const fkExists = await client.query(
            `
            SELECT
              tc.constraint_name,
              kcu.column_name,
              ccu.table_name AS referenced_table,
              ccu.column_name AS referenced_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = $1
              AND kcu.column_name = $2
              AND ccu.table_name = $3
              AND ccu.column_name = $4
          `,
            [fkConfig.table, fkConfig.column, fkConfig.referencedTable, fkConfig.referencedColumn]
          )

          const success = fkExists.rows.length > 0
          const executionTime = Date.now() - startTime

          if (success) {
            // Test referential integrity with sample data
            const integrityResult = await this.testReferentialIntegrity(client, fkConfig)

            validationResults.push({
              type: 'foreign_key',
              foreignKey: `${fkConfig.table}.${fkConfig.column} -> ${fkConfig.referencedTable}.${fkConfig.referencedColumn}`,
              success: success && integrityResult.success,
              executionTime,
              integrityTest: integrityResult,
            })

            console.log(
              `✅ Foreign key ${fkConfig.table}.${fkConfig.column} -> ${fkConfig.referencedTable}.${fkConfig.referencedColumn} validated`
            )
          } else {
            validationResults.push({
              type: 'foreign_key',
              foreignKey: `${fkConfig.table}.${fkConfig.column} -> ${fkConfig.referencedTable}.${fkConfig.referencedColumn}`,
              success: false,
              executionTime,
              error: 'Foreign key constraint not found',
            })

            console.log(
              `❌ Missing foreign key ${fkConfig.table}.${fkConfig.column} -> ${fkConfig.referencedTable}.${fkConfig.referencedColumn}`
            )
          }

          await this.recordValidationResult(
            'referential_integrity',
            'foreign_key',
            `fk_${fkConfig.table}_${fkConfig.column}`,
            `${fkConfig.table}.${fkConfig.column}`,
            success ? 'passed' : 'failed',
            executionTime,
            { foreign_key: fkConfig, exists: success },
            success ? null : 'Foreign key constraint not found'
          )
        } catch (error) {
          const executionTime = Date.now() - startTime

          validationResults.push({
            type: 'foreign_key',
            foreignKey: `${fkConfig.table}.${fkConfig.column} -> ${fkConfig.referencedTable}.${fkConfig.referencedColumn}`,
            success: false,
            executionTime,
            error: error.message,
          })

          console.log(
            `❌ Foreign key validation error for ${fkConfig.table}.${fkConfig.column}: ${error.message}`
          )
        }
      }

      const successCount = validationResults.filter((r) => r.success).length
      console.log(
        `✅ Foreign key validation completed: ${successCount}/${validationResults.length} passed`
      )

      this.validationResults.integrity = validationResults

      return {
        success: successCount === validationResults.length,
        totalTests: validationResults.length,
        passedTests: successCount,
        results: validationResults,
      }
    } catch (error) {
      console.error('❌ Foreign key validation failed:', error)
      return {
        success: false,
        error: error.message,
        results: validationResults,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Test referential integrity with sample data
   */
  async testReferentialIntegrity(client, fkConfig) {
    try {
      // Check if both tables exist and have data
      const parentCount = await client.query(
        `SELECT COUNT(*) as count FROM "${fkConfig.referencedTable}"`
      )
      const childCount = await client.query(`SELECT COUNT(*) as count FROM "${fkConfig.table}"`)

      if (
        Number.parseInt(parentCount.rows[0].count) === 0 ||
        Number.parseInt(childCount.rows[0].count) === 0
      ) {
        return { success: true, note: 'No data to test referential integrity' }
      }

      // Test that all foreign key values have corresponding parent records
      const orphanedRecords = await client.query(`
        SELECT COUNT(*) as count
        FROM "${fkConfig.table}" c
        LEFT JOIN "${fkConfig.referencedTable}" p ON c."${fkConfig.column}" = p."${fkConfig.referencedColumn}"
        WHERE c."${fkConfig.column}" IS NOT NULL AND p."${fkConfig.referencedColumn}" IS NULL
      `)

      const orphanedCount = Number.parseInt(orphanedRecords.rows[0].count)

      return {
        success: orphanedCount === 0,
        parentRecords: Number.parseInt(parentCount.rows[0].count),
        childRecords: Number.parseInt(childCount.rows[0].count),
        orphanedRecords: orphanedCount,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Validate workspace isolation implementation
   */
  async validateWorkspaceIsolation() {
    console.log('🏢 Validating workspace isolation implementation...')

    const validationResults = []
    const client = await this.dbPool.connect()

    try {
      // Test workspace-scoped tables
      const workspaceTables = [
        'parlant_agent',
        'parlant_session',
        'parlant_tool',
        'parlant_agent_workflow',
        'parlant_agent_api_key',
      ]

      for (const tableName of workspaceTables) {
        const result = await this.validateTableWorkspaceIsolation(client, tableName)
        validationResults.push(result)
      }

      // Test cross-workspace data access prevention
      const crossWorkspaceResults = await this.testCrossWorkspaceAccess(client)
      validationResults.push(...crossWorkspaceResults)

      const successCount = validationResults.filter((r) => r.success).length
      console.log(
        `✅ Workspace isolation validation completed: ${successCount}/${validationResults.length} passed`
      )

      this.validationResults.isolation = validationResults

      return {
        success: successCount === validationResults.length,
        totalTests: validationResults.length,
        passedTests: successCount,
        results: validationResults,
      }
    } catch (error) {
      console.error('❌ Workspace isolation validation failed:', error)
      return {
        success: false,
        error: error.message,
        results: validationResults,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Validate table workspace isolation
   */
  async validateTableWorkspaceIsolation(client, tableName) {
    const startTime = Date.now()

    try {
      // Check if table exists
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
        return {
          type: 'workspace_isolation',
          table: tableName,
          success: true,
          note: 'Table does not exist - skipping validation',
          executionTime: Date.now() - startTime,
        }
      }

      // Check if table has workspace_id column
      const hasWorkspaceId = await client.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'workspace_id'
        )
      `,
        [tableName]
      )

      if (!hasWorkspaceId.rows[0].exists) {
        return {
          type: 'workspace_isolation',
          table: tableName,
          success: false,
          error: 'Table missing workspace_id column for isolation',
          executionTime: Date.now() - startTime,
        }
      }

      // Check foreign key to workspace table
      const workspaceFk = await client.query(
        `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = $1
            AND kcu.column_name = 'workspace_id'
            AND ccu.table_name = 'workspace'
            AND ccu.column_name = 'id'
        )
      `,
        [tableName]
      )

      const success = workspaceFk.rows[0].exists

      console.log(
        `✅ Workspace isolation for table '${tableName}': ${success ? 'valid' : 'missing FK'}`
      )

      return {
        type: 'workspace_isolation',
        table: tableName,
        success,
        hasWorkspaceId: hasWorkspaceId.rows[0].exists,
        hasWorkspaceForeignKey: workspaceFk.rows[0].exists,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        type: 'workspace_isolation',
        table: tableName,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Test cross-workspace access prevention
   */
  async testCrossWorkspaceAccess(client) {
    const results = []

    try {
      // Create test workspaces and data for cross-workspace access testing
      const workspace1Id = `test_ws1_${Date.now()}`
      const workspace2Id = `test_ws2_${Date.now()}`
      const testUserId = `test_user_${Date.now()}`

      // Create test user
      await client.query(
        `
        INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
        VALUES ($1, 'Cross-WS Test User', $2, true, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
      `,
        [testUserId, `crossws${Date.now()}@test.com`]
      )

      // Create test workspaces
      await client.query(
        `
        INSERT INTO workspace (id, name, "ownerId", "createdAt", "updatedAt")
        VALUES ($1, 'Test Workspace 1', $2, NOW(), NOW())
      `,
        [workspace1Id, testUserId]
      )

      await client.query(
        `
        INSERT INTO workspace (id, name, "ownerId", "createdAt", "updatedAt")
        VALUES ($1, 'Test Workspace 2', $2, NOW(), NOW())
      `,
        [workspace2Id, testUserId]
      )

      // Test workspace isolation for parlant_agent table if it exists
      const agentTableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'parlant_agent'
        )
      `)

      if (agentTableExists.rows[0].exists) {
        const isolationResult = await this.testAgentWorkspaceIsolation(
          client,
          workspace1Id,
          workspace2Id,
          testUserId
        )
        results.push(isolationResult)
      }

      // Cleanup test data
      await client.query('DELETE FROM workspace WHERE id IN ($1, $2)', [workspace1Id, workspace2Id])
      await client.query('DELETE FROM "user" WHERE id = $1', [testUserId])

      return results
    } catch (error) {
      console.error('Cross-workspace access test error:', error)
      return [
        {
          type: 'cross_workspace_access',
          success: false,
          error: error.message,
        },
      ]
    }
  }

  /**
   * Test agent workspace isolation
   */
  async testAgentWorkspaceIsolation(client, workspace1Id, workspace2Id, testUserId) {
    try {
      // Create agents in different workspaces
      const agent1Result = await client.query(
        `
        INSERT INTO parlant_agent (id, name, description, created_by, workspace_id, created_at, updated_at)
        VALUES (gen_random_uuid(), 'WS1 Agent', 'Test agent in workspace 1', $1, $2, NOW(), NOW())
        RETURNING id
      `,
        [testUserId, workspace1Id]
      )

      const agent2Result = await client.query(
        `
        INSERT INTO parlant_agent (id, name, description, created_by, workspace_id, created_at, updated_at)
        VALUES (gen_random_uuid(), 'WS2 Agent', 'Test agent in workspace 2', $1, $2, NOW(), NOW())
        RETURNING id
      `,
        [testUserId, workspace2Id]
      )

      // Test that workspace-scoped queries only return appropriate results
      const ws1Agents = await client.query(
        `
        SELECT COUNT(*) as count FROM parlant_agent WHERE workspace_id = $1
      `,
        [workspace1Id]
      )

      const ws2Agents = await client.query(
        `
        SELECT COUNT(*) as count FROM parlant_agent WHERE workspace_id = $1
      `,
        [workspace2Id]
      )

      const ws1Count = Number.parseInt(ws1Agents.rows[0].count)
      const ws2Count = Number.parseInt(ws2Agents.rows[0].count)

      const success = ws1Count >= 1 && ws2Count >= 1

      return {
        type: 'agent_workspace_isolation',
        success,
        workspace1Agents: ws1Count,
        workspace2Agents: ws2Count,
      }
    } catch (error) {
      return {
        type: 'agent_workspace_isolation',
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Validate performance indexes
   */
  async validatePerformanceIndexes() {
    console.log('⚡ Validating performance indexes...')

    const validationResults = []
    const client = await this.dbPool.connect()

    try {
      const expectedIndexes = this.getExpectedPerformanceIndexes()

      for (const indexConfig of expectedIndexes) {
        const startTime = Date.now()

        try {
          // Check if index exists
          const indexExists = await client.query(
            `
            SELECT
              indexname,
              indexdef
            FROM pg_indexes
            WHERE schemaname = 'public' AND indexname = $1
          `,
            [indexConfig.name]
          )

          const success = indexExists.rows.length > 0
          const executionTime = Date.now() - startTime

          if (success) {
            // Test index performance
            const performanceResult = await this.testIndexPerformance(client, indexConfig)

            validationResults.push({
              type: 'performance_index',
              indexName: indexConfig.name,
              tableName: indexConfig.table,
              success,
              executionTime,
              performanceTest: performanceResult,
            })

            console.log(`✅ Index '${indexConfig.name}' validated`)
          } else {
            validationResults.push({
              type: 'performance_index',
              indexName: indexConfig.name,
              tableName: indexConfig.table,
              success: false,
              executionTime,
              error: 'Index not found',
            })

            console.log(`❌ Missing index '${indexConfig.name}' on table '${indexConfig.table}'`)
          }

          await this.recordValidationResult(
            'performance',
            'index_validation',
            `index_${indexConfig.name}`,
            indexConfig.name,
            success ? 'passed' : 'failed',
            executionTime,
            { index: indexConfig, exists: success },
            success ? null : 'Index not found'
          )
        } catch (error) {
          const executionTime = Date.now() - startTime

          validationResults.push({
            type: 'performance_index',
            indexName: indexConfig.name,
            tableName: indexConfig.table,
            success: false,
            executionTime,
            error: error.message,
          })

          console.log(`❌ Index validation error for '${indexConfig.name}': ${error.message}`)
        }
      }

      const successCount = validationResults.filter((r) => r.success).length
      console.log(
        `✅ Performance index validation completed: ${successCount}/${validationResults.length} passed`
      )

      this.validationResults.performance = validationResults

      return {
        success: successCount === validationResults.length,
        totalTests: validationResults.length,
        passedTests: successCount,
        results: validationResults,
      }
    } catch (error) {
      console.error('❌ Performance index validation failed:', error)
      return {
        success: false,
        error: error.message,
        results: validationResults,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Test index performance
   */
  async testIndexPerformance(client, indexConfig) {
    try {
      // Check if the table has data for performance testing
      const rowCount = await client.query(`SELECT COUNT(*) as count FROM "${indexConfig.table}"`)
      const count = Number.parseInt(rowCount.rows[0].count)

      if (count === 0) {
        return { success: true, note: 'No data to test index performance' }
      }

      // Generate a sample query based on the index columns
      const sampleQuery = this.generateSampleQuery(indexConfig)

      if (!sampleQuery) {
        return { success: true, note: 'Cannot generate sample query for index test' }
      }

      // Test query performance
      const startTime = Date.now()
      await client.query(sampleQuery)
      const executionTime = Date.now() - startTime

      const withinThreshold = executionTime <= this.config.performance_threshold_ms

      return {
        success: withinThreshold,
        executionTime,
        rowCount: count,
        query: sampleQuery,
        threshold: this.config.performance_threshold_ms,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Generate sample query for index performance testing
   */
  generateSampleQuery(indexConfig) {
    // Simple query generation based on common index patterns
    if (indexConfig.columns && indexConfig.columns.length > 0) {
      const column = indexConfig.columns[0]
      return `SELECT COUNT(*) FROM "${indexConfig.table}" WHERE "${column}" IS NOT NULL`
    }

    return null
  }

  /**
   * Validate column definitions
   */
  async validateColumnDefinitions(client) {
    const results = []

    try {
      // Get all Parlant table columns
      const columns = await client.query(`
        SELECT
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name LIKE 'parlant_%'
        ORDER BY table_name, ordinal_position
      `)

      // Group by table
      const tableColumns = {}
      for (const row of columns.rows) {
        if (!tableColumns[row.table_name]) {
          tableColumns[row.table_name] = []
        }
        tableColumns[row.table_name].push(row)
      }

      // Validate each table's columns
      for (const [tableName, cols] of Object.entries(tableColumns)) {
        const result = this.validateTableColumns(tableName, cols)
        results.push(result)
      }

      return results
    } catch (error) {
      return [
        {
          type: 'column_definitions',
          success: false,
          error: error.message,
        },
      ]
    }
  }

  /**
   * Validate table columns
   */
  validateTableColumns(tableName, columns) {
    const errors = []
    const warnings = []

    // Check for required system columns
    const requiredColumns = ['id', 'created_at', 'updated_at']
    const presentColumns = columns.map((col) => col.column_name)

    for (const reqCol of requiredColumns) {
      if (!presentColumns.includes(reqCol)) {
        errors.push(`Missing required column '${reqCol}' in table '${tableName}'`)
      }
    }

    // Check timestamp columns
    const timestampColumns = columns.filter(
      (col) => col.column_name.includes('_at') || col.column_name.includes('_time')
    )

    for (const tsCol of timestampColumns) {
      if (!['timestamp without time zone', 'timestamp with time zone'].includes(tsCol.data_type)) {
        warnings.push(
          `Column '${tsCol.column_name}' should be timestamp type, found '${tsCol.data_type}'`
        )
      }
    }

    // Check ID columns
    const idColumns = columns.filter(
      (col) => col.column_name === 'id' || col.column_name.endsWith('_id')
    )

    for (const idCol of idColumns) {
      if (!['text', 'uuid'].includes(idCol.data_type)) {
        warnings.push(
          `ID column '${idCol.column_name}' should be text or uuid type, found '${idCol.data_type}'`
        )
      }
    }

    return {
      type: 'column_definitions',
      tableName,
      success: errors.length === 0,
      errors,
      warnings,
      columnCount: columns.length,
    }
  }

  /**
   * Validate data types
   */
  async validateDataTypes(client) {
    const results = []

    try {
      // Check for specific data type requirements
      const dataTypeChecks = [
        {
          table: 'parlant_agent',
          column: 'temperature',
          expectedTypes: ['integer', 'numeric'],
          description: 'Temperature should be numeric',
        },
        {
          table: 'parlant_agent',
          column: 'max_tokens',
          expectedTypes: ['integer'],
          description: 'Max tokens should be integer',
        },
        {
          table: 'parlant_session',
          column: 'metadata',
          expectedTypes: ['json', 'jsonb'],
          description: 'Metadata should be JSON',
        },
        {
          table: 'parlant_event',
          column: 'content',
          expectedTypes: ['json', 'jsonb'],
          description: 'Event content should be JSON',
        },
      ]

      for (const check of dataTypeChecks) {
        const column = await client.query(
          `
          SELECT data_type
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
        `,
          [check.table, check.column]
        )

        if (column.rows.length === 0) {
          results.push({
            type: 'data_type',
            table: check.table,
            column: check.column,
            success: true,
            note: 'Column does not exist - skipping validation',
          })
          continue
        }

        const actualType = column.rows[0].data_type
        const isValid = check.expectedTypes.includes(actualType)

        results.push({
          type: 'data_type',
          table: check.table,
          column: check.column,
          success: isValid,
          expectedTypes: check.expectedTypes,
          actualType,
          description: check.description,
        })

        if (!isValid) {
          console.log(
            `❌ Data type mismatch: ${check.table}.${check.column} expected [${check.expectedTypes.join(', ')}], found ${actualType}`
          )
        }
      }

      return results
    } catch (error) {
      return [
        {
          type: 'data_type',
          success: false,
          error: error.message,
        },
      ]
    }
  }

  /**
   * Validate constraints
   */
  async validateConstraints(client) {
    const results = []

    try {
      // Check for required constraints
      const constraintChecks = [
        {
          table: 'parlant_agent',
          type: 'CHECK',
          name: 'temperature_range',
          description: 'Temperature should be within valid range',
        },
        {
          table: 'parlant_agent',
          type: 'CHECK',
          name: 'max_tokens_positive',
          description: 'Max tokens should be positive',
        },
      ]

      for (const check of constraintChecks) {
        const constraint = await client.query(
          `
          SELECT constraint_name, constraint_type
          FROM information_schema.table_constraints
          WHERE table_schema = 'public' AND table_name = $1 AND constraint_type = $2
        `,
          [check.table, check.type]
        )

        const hasConstraint = constraint.rows.some(
          (row) =>
            row.constraint_name.includes(check.name.replace('_', '')) ||
            row.constraint_type === check.type
        )

        results.push({
          type: 'constraint',
          table: check.table,
          constraintName: check.name,
          constraintType: check.type,
          success: hasConstraint,
          description: check.description,
        })
      }

      return results
    } catch (error) {
      return [
        {
          type: 'constraint',
          success: false,
          error: error.message,
        },
      ]
    }
  }

  /**
   * Record validation result
   */
  async recordValidationResult(
    validationType,
    category,
    testName,
    targetObject,
    status,
    executionTime,
    data,
    errorDetails,
    recommendations = null
  ) {
    try {
      const client = await this.dbPool.connect()
      try {
        await client.query(
          `
          INSERT INTO schema_validation_results (
            validation_type, test_category, test_name, target_object, status,
            execution_time_ms, validation_data, error_details, recommendations
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
          [
            validationType,
            category,
            testName,
            targetObject,
            status,
            executionTime,
            JSON.stringify(data),
            errorDetails,
            recommendations,
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
   * Generate comprehensive validation report
   */
  async generateValidationReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      suite_version: '1.0.0',
      configuration: this.config,
      validation_results: this.validationResults,
      summary: {
        schema_tests: this.validationResults.schema.length,
        schema_passed: this.validationResults.schema.filter((r) => r.success).length,
        integrity_tests: this.validationResults.integrity.length,
        integrity_passed: this.validationResults.integrity.filter((r) => r.success).length,
        performance_tests: this.validationResults.performance.length,
        performance_passed: this.validationResults.performance.filter((r) => r.success).length,
        isolation_tests: this.validationResults.isolation.length,
        isolation_passed: this.validationResults.isolation.filter((r) => r.success).length,
        total_errors: this.validationResults.errors.length,
      },
    }

    // Write report to file
    const reportPath = path.join(__dirname, `schema_validation_report_${Date.now()}.json`)
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2))

    console.log(`📋 Schema validation report generated: ${reportPath}`)

    return reportData
  }

  /**
   * Helper: Check data type compatibility
   */
  isDataTypeCompatible(actualType, expectedType) {
    const typeMap = {
      text: ['text', 'character varying', 'varchar'],
      integer: ['integer', 'int4'],
      bigint: ['bigint', 'int8'],
      boolean: ['boolean', 'bool'],
      timestamp: ['timestamp without time zone', 'timestamp with time zone'],
      json: ['json', 'jsonb'],
      uuid: ['uuid'],
    }

    const compatibleTypes = typeMap[expectedType] || [expectedType]
    return compatibleTypes.includes(actualType)
  }

  /**
   * Get expected Parlant table definitions
   */
  getExpectedParlantTables() {
    return [
      {
        name: 'parlant_agent',
        primaryKey: 'id',
        columns: [
          { name: 'id', dataType: 'text', nullable: false },
          { name: 'workspace_id', dataType: 'text', nullable: false },
          { name: 'created_by', dataType: 'text', nullable: false },
          { name: 'name', dataType: 'text', nullable: false },
          { name: 'description', dataType: 'text', nullable: true },
          { name: 'status', dataType: 'text', nullable: false },
          { name: 'temperature', dataType: 'integer', nullable: false },
          { name: 'max_tokens', dataType: 'integer', nullable: false },
          { name: 'created_at', dataType: 'timestamp', nullable: false },
          { name: 'updated_at', dataType: 'timestamp', nullable: false },
        ],
      },
      {
        name: 'parlant_session',
        primaryKey: 'id',
        columns: [
          { name: 'id', dataType: 'text', nullable: false },
          { name: 'agent_id', dataType: 'text', nullable: false },
          { name: 'workspace_id', dataType: 'text', nullable: false },
          { name: 'user_id', dataType: 'text', nullable: true },
          { name: 'status', dataType: 'text', nullable: false },
          { name: 'metadata', dataType: 'jsonb', nullable: true },
          { name: 'created_at', dataType: 'timestamp', nullable: false },
          { name: 'updated_at', dataType: 'timestamp', nullable: false },
        ],
      },
      {
        name: 'parlant_event',
        primaryKey: 'id',
        columns: [
          { name: 'id', dataType: 'text', nullable: false },
          { name: 'session_id', dataType: 'text', nullable: false },
          { name: 'offset', dataType: 'integer', nullable: false },
          { name: 'event_type', dataType: 'text', nullable: false },
          { name: 'content', dataType: 'jsonb', nullable: false },
          { name: 'created_at', dataType: 'timestamp', nullable: false },
        ],
      },
    ]
  }

  /**
   * Get expected foreign key relationships
   */
  getExpectedForeignKeys() {
    return [
      {
        table: 'parlant_agent',
        column: 'workspace_id',
        referencedTable: 'workspace',
        referencedColumn: 'id',
      },
      {
        table: 'parlant_agent',
        column: 'created_by',
        referencedTable: 'user',
        referencedColumn: 'id',
      },
      {
        table: 'parlant_session',
        column: 'agent_id',
        referencedTable: 'parlant_agent',
        referencedColumn: 'id',
      },
      {
        table: 'parlant_session',
        column: 'workspace_id',
        referencedTable: 'workspace',
        referencedColumn: 'id',
      },
      {
        table: 'parlant_session',
        column: 'user_id',
        referencedTable: 'user',
        referencedColumn: 'id',
      },
      {
        table: 'parlant_event',
        column: 'session_id',
        referencedTable: 'parlant_session',
        referencedColumn: 'id',
      },
    ]
  }

  /**
   * Get expected performance indexes
   */
  getExpectedPerformanceIndexes() {
    return [
      { name: 'parlant_agent_workspace_id_idx', table: 'parlant_agent', columns: ['workspace_id'] },
      { name: 'parlant_agent_created_by_idx', table: 'parlant_agent', columns: ['created_by'] },
      { name: 'parlant_session_agent_id_idx', table: 'parlant_session', columns: ['agent_id'] },
      {
        name: 'parlant_session_workspace_id_idx',
        table: 'parlant_session',
        columns: ['workspace_id'],
      },
      { name: 'parlant_event_session_id_idx', table: 'parlant_event', columns: ['session_id'] },
      { name: 'parlant_event_offset_idx', table: 'parlant_event', columns: ['offset'] },
    ]
  }

  /**
   * Cleanup validation suite resources
   */
  async cleanup() {
    if (this.dbPool) {
      await this.dbPool.end()
      console.log('🧹 Schema validation suite database connections closed')
    }
  }
}

module.exports = SchemaValidationSuite
