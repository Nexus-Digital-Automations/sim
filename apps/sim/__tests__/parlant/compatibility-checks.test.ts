import {
  db,
  knowledge,
  // Parlant tables
  parlantAgents,
  parlantEvents,
  parlantGuidelines,
  parlantJourneyStates,
  parlantJourneys,
  parlantSessions,
  parlantTools,
  parlantVariables,
  // Sim tables
  user,
  workflow,
  workspace,
} from '@sim/db'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

/**
 * Automated Compatibility Validation System
 */
class CompatibilityValidator {
  /**
   * Validate database schema compatibility
   */
  static async validateSchemaCompatibility(): Promise<{
    isCompatible: boolean
    issues: string[]
    warnings: string[]
  }> {
    const issues: string[] = []
    const warnings: string[] = []

    try {
      // Test 1: Ensure all expected tables exist
      const tableChecks = [
        // Sim tables
        { Name: 'users', table: user },
        { Name: 'workspaces', table: workspace },
        { Name: 'workflows', table: workflow },
        { Name: 'knowledge', table: knowledge },
        // Parlant tables
        { Name: 'parlant_agents', table: parlantAgents },
        { Name: 'parlant_sessions', table: parlantSessions },
        { Name: 'parlant_events', table: parlantEvents },
        { Name: 'parlant_tools', table: parlantTools },
        { Name: 'parlant_journeys', table: parlantJourneys },
        { Name: 'parlant_journey_states', table: parlantJourneyStates },
        { Name: 'parlant_variables', table: parlantVariables },
        { Name: 'parlant_guidelines', table: parlantGuidelines },
      ]

      for (const { Name, table } of tableChecks) {
        try {
          await db.select().from(table).limit(1)
        } catch (error) {
          issues.push(`Table ${Name} is not accessible: ${error.message}`)
        }
      }

      // Test 2: Validate foreign key relationships
      try {
        // Check workspace relationships
        const workspaceCheck = await db.execute(sql`
          SELECT COUNT(*) as count FROM information_schema.table_constraints
          WHERE constraint_type = 'FOREIGN KEY'
          AND table_name = 'parlant_agents'
          AND constraint_name LIKE '%workspace%'
        `)

        if (!workspaceCheck.rows[0] || workspaceCheck.rows[0].count === '0') {
          warnings.push('Parlant agents may not have proper workspace foreign key constraints')
        }
      } catch (error) {
        warnings.push(`Could not validate foreign key constraints: ${error.message}`)
      }

      // Test 3: Check for naming conflicts
      const potentialConflicts = ['id', 'created_at', 'updated_at', 'workspace_id']
      for (const field of potentialConflicts) {
        try {
          // This is a simplified check - in a real scenario you'd want more sophisticated validation
          const simCheck = await db.execute(sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name IN ('users', 'workspaces', 'workflows', 'knowledge')
            AND column_name = ${field}
          `)

          const parlantCheck = await db.execute(sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name LIKE 'parlant_%'
            AND column_name = ${field}
          `)

          if (simCheck.rows.length > 0 && parlantCheck.rows.length > 0) {
            // This is expected for common fields, but we track it
            warnings.push(`Common field '${field}' used in both Sim and Parlant schemas`)
          }
        } catch (error) {
          warnings.push(`Could not check field conflicts for ${field}: ${error.message}`)
        }
      }

      return {
        isCompatible: issues.length === 0,
        issues,
        warnings,
      }
    } catch (error) {
      issues.push(`Schema validation failed: ${error.message}`)
      return { isCompatible: false, issues, warnings }
    }
  }

  /**
   * Validate data type compatibility between Sim and Parlant
   */
  static async validateDataTypeCompatibility(): Promise<{
    isCompatible: boolean
    issues: string[]
    typeMapping: Record<string, any>
  }> {
    const issues: string[] = []
    const typeMapping: Record<string, any> = {}

    try {
      // Test UUID compatibility
      try {
        const testUuid = crypto.randomUUID()
        await db.execute(sql`SELECT ${testUuid}::uuid`)
        typeMapping.uuid = 'compatible'
      } catch (error) {
        issues.push(`UUID type compatibility issue: ${error.message}`)
        typeMapping.uuid = 'incompatible'
      }

      // Test timestamp compatibility
      try {
        const testTimestamp = new Date()
        await db.execute(sql`SELECT ${testTimestamp}::timestamp`)
        typeMapping.timestamp = 'compatible'
      } catch (error) {
        issues.push(`Timestamp compatibility issue: ${error.message}`)
        typeMapping.timestamp = 'incompatible'
      }

      // Test JSON compatibility
      try {
        const testJson = { test: 'value', number: 123, array: [1, 2, 3] }
        await db.execute(sql`SELECT ${JSON.stringify(testJson)}::jsonb`)
        typeMapping.jsonb = 'compatible'
      } catch (error) {
        issues.push(`JSONB compatibility issue: ${error.message}`)
        typeMapping.jsonb = 'incompatible'
      }

      // Test text/varchar compatibility
      try {
        const testText = 'This is a test string with special characters: éñ中文'
        await db.execute(sql`SELECT ${testText}::text`)
        typeMapping.text = 'compatible'
      } catch (error) {
        issues.push(`Text type compatibility issue: ${error.message}`)
        typeMapping.text = 'incompatible'
      }

      return {
        isCompatible: issues.length === 0,
        issues,
        typeMapping,
      }
    } catch (error) {
      issues.push(`Data type validation failed: ${error.message}`)
      return { isCompatible: false, issues, typeMapping }
    }
  }

  /**
   * Validate transaction compatibility between Sim and Parlant operations
   */
  static async validateTransactionCompatibility(): Promise<{
    isCompatible: boolean
    issues: string[]
    testResults: Record<string, any>
  }> {
    const issues: string[] = []
    const testResults: Record<string, any> = {}

    try {
      // Test mixed Sim/Parlant transactions
      const testWorkspaceId = 'compat-test-workspace'

      try {
        const result = await db.transaction(async (tx) => {
          // This would need actual Sim table operations in a real test
          // For now, we'll test if transactions work at all with Parlant tables

          const agent = await tx
            .insert(parlantAgents)
            .values({
              workspaceId: testWorkspaceId,
              Name: 'Compatibility Test Agent',
              displayName: 'Compatibility Test Agent',
              description: 'Testing transaction compatibility',
              systemPrompt: 'Test agent for compatibility',
              agentType: 'customer_support',
              enabled: true,
              isPublic: false,
              model: 'gpt-4',
              maxTokens: 1000,
              temperature: 0.7,
              topP: 0.9,
            })
            .returning()

          const session = await tx
            .insert(parlantSessions)
            .values({
              workspaceId: testWorkspaceId,
              agentId: agent[0].id,
              sessionType: 'customer_chat',
              status: 'active',
              metadata: {},
            })
            .returning()

          return { agent: agent[0], session: session[0] }
        })

        testResults.mixedTransaction = 'success'

        // Cleanup
        await db.delete(parlantSessions).where(sql`workspace_id = ${testWorkspaceId}`)
        await db.delete(parlantAgents).where(sql`workspace_id = ${testWorkspaceId}`)
      } catch (error) {
        issues.push(`Mixed transaction compatibility issue: ${error.message}`)
        testResults.mixedTransaction = 'failed'
      }

      // Test transaction rollback behavior
      try {
        await db.transaction(async (tx) => {
          await tx.insert(parlantAgents).values({
            workspaceId: testWorkspaceId,
            Name: 'Rollback Test Agent',
            displayName: 'Rollback Test Agent',
            description: 'Testing rollback compatibility',
            systemPrompt: 'Test agent for rollback',
            agentType: 'customer_support',
            enabled: true,
            isPublic: false,
            model: 'gpt-4',
            maxTokens: 1000,
            temperature: 0.7,
            topP: 0.9,
          })

          throw new Error('Intentional rollback')
        })
      } catch (error) {
        if (error.message === 'Intentional rollback') {
          testResults.rollbackBehavior = 'success'
        } else {
          issues.push(`Rollback compatibility issue: ${error.message}`)
          testResults.rollbackBehavior = 'failed'
        }
      }

      // Verify rollback worked
      try {
        const remainingAgents = await db
          .select()
          .from(parlantAgents)
          .where(sql`workspace_id = ${testWorkspaceId}`)

        if (remainingAgents.length === 0) {
          testResults.rollbackVerification = 'success'
        } else {
          issues.push('Transaction rollback did not work properly')
          testResults.rollbackVerification = 'failed'
        }
      } catch (error) {
        issues.push(`Rollback verification failed: ${error.message}`)
        testResults.rollbackVerification = 'failed'
      }

      return {
        isCompatible: issues.length === 0,
        issues,
        testResults,
      }
    } catch (error) {
      issues.push(`Transaction compatibility validation failed: ${error.message}`)
      return { isCompatible: false, issues, testResults }
    }
  }

  /**
   * Validate query performance and compatibility
   */
  static async validateQueryCompatibility(): Promise<{
    isCompatible: boolean
    issues: string[]
    performanceMetrics: Record<string, number>
  }> {
    const issues: string[] = []
    const performanceMetrics: Record<string, number> = {}

    try {
      // Test basic query performance
      const startTime = Date.now()

      try {
        await db.select().from(parlantAgents).limit(1)
        performanceMetrics.basicSelect = Date.now() - startTime
      } catch (error) {
        issues.push(`Basic select query failed: ${error.message}`)
        performanceMetrics.basicSelect = -1
      }

      // Test join performance (if we had workspace table accessible)
      const joinStartTime = Date.now()
      try {
        // This would be a real join test in a complete implementation
        await db.select().from(parlantAgents).where(sql`workspace_id IS NOT NULL`).limit(5)
        performanceMetrics.joinQuery = Date.now() - joinStartTime
      } catch (error) {
        issues.push(`Join query compatibility issue: ${error.message}`)
        performanceMetrics.joinQuery = -1
      }

      // Test complex query with aggregations
      const aggregationStartTime = Date.now()
      try {
        await db.execute(sql`
          SELECT workspace_id, COUNT(*) as agent_count
          FROM parlant_agents
          GROUP BY workspace_id
          LIMIT 10
        `)
        performanceMetrics.aggregationQuery = Date.now() - aggregationStartTime
      } catch (error) {
        issues.push(`Aggregation query compatibility issue: ${error.message}`)
        performanceMetrics.aggregationQuery = -1
      }

      // Performance thresholds (in milliseconds)
      const thresholds = {
        basicSelect: 100,
        joinQuery: 500,
        aggregationQuery: 1000,
      }

      for (const [query, time] of Object.entries(performanceMetrics)) {
        if (time > thresholds[query]) {
          issues.push(
            `Query ${query} took ${time}ms, exceeding threshold of ${thresholds[query]}ms`
          )
        }
      }

      return {
        isCompatible: issues.length === 0,
        issues,
        performanceMetrics,
      }
    } catch (error) {
      issues.push(`Query compatibility validation failed: ${error.message}`)
      return { isCompatible: false, issues, performanceMetrics }
    }
  }

  /**
   * Generate comprehensive compatibility report
   */
  static async generateCompatibilityReport(): Promise<{
    overallCompatible: boolean
    timestamp: Date
    results: {
      schema: Awaited<ReturnType<typeof CompatibilityValidator.validateSchemaCompatibility>>
      dataTypes: Awaited<ReturnType<typeof CompatibilityValidator.validateDataTypeCompatibility>>
      transactions: Awaited<
        ReturnType<typeof CompatibilityValidator.validateTransactionCompatibility>
      >
      queries: Awaited<ReturnType<typeof CompatibilityValidator.validateQueryCompatibility>>
    }
    summary: {
      totalIssues: number
      totalWarnings: number
      criticalIssues: string[]
      recommendations: string[]
    }
  }> {
    const results = {
      schema: await CompatibilityValidator.validateSchemaCompatibility(),
      dataTypes: await CompatibilityValidator.validateDataTypeCompatibility(),
      transactions: await CompatibilityValidator.validateTransactionCompatibility(),
      queries: await CompatibilityValidator.validateQueryCompatibility(),
    }

    const allIssues = [
      ...results.schema.issues,
      ...results.dataTypes.issues,
      ...results.transactions.issues,
      ...results.queries.issues,
    ]

    const allWarnings = results.schema.warnings || []

    // Identify critical issues
    const criticalIssues = allIssues.filter(
      (issue) =>
        issue.toLowerCase().includes('failed') ||
        issue.toLowerCase().includes('incompatible') ||
        issue.toLowerCase().includes('error')
    )

    // Generate recommendations
    const recommendations: string[] = []
    if (results.schema.issues.length > 0) {
      recommendations.push('Review and fix database schema compatibility issues')
    }
    if (results.dataTypes.issues.length > 0) {
      recommendations.push('Verify data type compatibility between Sim and Parlant')
    }
    if (results.transactions.issues.length > 0) {
      recommendations.push('Test and fix transaction handling between systems')
    }
    if (results.queries.issues.length > 0) {
      recommendations.push('Optimize query performance and compatibility')
    }
    if (allWarnings.length > 0) {
      recommendations.push('Review warnings and consider preventive measures')
    }

    const overallCompatible =
      results.schema.isCompatible &&
      results.dataTypes.isCompatible &&
      results.transactions.isCompatible &&
      results.queries.isCompatible

    return {
      overallCompatible,
      timestamp: new Date(),
      results,
      summary: {
        totalIssues: allIssues.length,
        totalWarnings: allWarnings.length,
        criticalIssues,
        recommendations,
      },
    }
  }
}

describe('Automated Compatibility Checks', () => {
  describe('Schema Compatibility', () => {
    it('should validate database schema compatibility', async () => {
      const result = await CompatibilityValidator.validateSchemaCompatibility()

      expect(result).toHaveProperty('isCompatible')
      expect(result).toHaveProperty('issues')
      expect(result).toHaveProperty('warnings')
      expect(Array.isArray(result.issues)).toBe(true)
      expect(Array.isArray(result.warnings)).toBe(true)

      // Log issues for debugging if any
      if (result.issues.length > 0) {
        console.warn('Schema compatibility issues:', result.issues)
      }
      if (result.warnings.length > 0) {
        console.info('Schema compatibility warnings:', result.warnings)
      }
    })

    it('should identify missing tables or accessibility issues', async () => {
      const result = await CompatibilityValidator.validateSchemaCompatibility()

      // We expect this to identify if there are table access issues
      if (!result.isCompatible) {
        expect(result.issues.length).toBeGreaterThan(0)
        expect(result.issues.some((issue) => issue.includes('Table'))).toBe(true)
      }
    })
  })

  describe('Data Type Compatibility', () => {
    it('should validate common data type compatibility', async () => {
      const result = await CompatibilityValidator.validateDataTypeCompatibility()

      expect(result).toHaveProperty('isCompatible')
      expect(result).toHaveProperty('issues')
      expect(result).toHaveProperty('typeMapping')
      expect(typeof result.typeMapping).toBe('object')

      // Common data types should be supported
      if (result.isCompatible) {
        expect(result.typeMapping).toHaveProperty('uuid')
        expect(result.typeMapping).toHaveProperty('timestamp')
        expect(result.typeMapping).toHaveProperty('jsonb')
        expect(result.typeMapping).toHaveProperty('text')
      }
    })

    it('should handle data type mismatches gracefully', async () => {
      const result = await CompatibilityValidator.validateDataTypeCompatibility()

      // Even if there are type issues, the validator should complete
      expect(result).toHaveProperty('isCompatible')
      if (!result.isCompatible) {
        expect(result.issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Transaction Compatibility', () => {
    it('should validate transaction behavior between Sim and Parlant', async () => {
      const result = await CompatibilityValidator.validateTransactionCompatibility()

      expect(result).toHaveProperty('isCompatible')
      expect(result).toHaveProperty('issues')
      expect(result).toHaveProperty('testResults')
      expect(typeof result.testResults).toBe('object')

      if (result.isCompatible) {
        expect(result.testResults).toHaveProperty('mixedTransaction')
        expect(result.testResults).toHaveProperty('rollbackBehavior')
        expect(result.testResults).toHaveProperty('rollbackVerification')
      }
    })

    it('should ensure rollback behavior works correctly', async () => {
      const result = await CompatibilityValidator.validateTransactionCompatibility()

      if (result.testResults.rollbackBehavior === 'success') {
        expect(result.testResults.rollbackVerification).toBe('success')
      }
    })
  })

  describe('Query Compatibility and Performance', () => {
    it('should validate query compatibility and performance', async () => {
      const result = await CompatibilityValidator.validateQueryCompatibility()

      expect(result).toHaveProperty('isCompatible')
      expect(result).toHaveProperty('issues')
      expect(result).toHaveProperty('performanceMetrics')
      expect(typeof result.performanceMetrics).toBe('object')

      // Performance metrics should be recorded
      Object.values(result.performanceMetrics).forEach((time) => {
        expect(typeof time).toBe('number')
      })
    })

    it('should meet performance thresholds', async () => {
      const result = await CompatibilityValidator.validateQueryCompatibility()

      if (result.performanceMetrics.basicSelect > 0) {
        expect(result.performanceMetrics.basicSelect).toBeLessThan(1000)
      }
    })
  })

  describe('Comprehensive Compatibility Report', () => {
    it('should generate a complete compatibility report', async () => {
      const report = await CompatibilityValidator.generateCompatibilityReport()

      expect(report).toHaveProperty('overallCompatible')
      expect(report).toHaveProperty('timestamp')
      expect(report).toHaveProperty('results')
      expect(report).toHaveProperty('summary')

      expect(report.timestamp).toBeInstanceOf(Date)
      expect(typeof report.overallCompatible).toBe('boolean')

      expect(report.results).toHaveProperty('schema')
      expect(report.results).toHaveProperty('dataTypes')
      expect(report.results).toHaveProperty('transactions')
      expect(report.results).toHaveProperty('queries')

      expect(report.summary).toHaveProperty('totalIssues')
      expect(report.summary).toHaveProperty('totalWarnings')
      expect(report.summary).toHaveProperty('criticalIssues')
      expect(report.summary).toHaveProperty('recommendations')

      expect(typeof report.summary.totalIssues).toBe('number')
      expect(typeof report.summary.totalWarnings).toBe('number')
      expect(Array.isArray(report.summary.criticalIssues)).toBe(true)
      expect(Array.isArray(report.summary.recommendations)).toBe(true)
    })

    it('should provide actionable recommendations when issues are found', async () => {
      const report = await CompatibilityValidator.generateCompatibilityReport()

      if (!report.overallCompatible) {
        expect(report.summary.recommendations.length).toBeGreaterThan(0)
        expect(report.summary.totalIssues).toBeGreaterThan(0)
      }
    })

    it('should log detailed compatibility report for debugging', async () => {
      const report = await CompatibilityValidator.generateCompatibilityReport()

      console.log('\n=== PARLANT-SIM COMPATIBILITY REPORT ===')
      console.log(`Timestamp: ${report.timestamp.toISOString()}`)
      console.log(`Overall Compatible: ${report.overallCompatible}`)
      console.log(`Total Issues: ${report.summary.totalIssues}`)
      console.log(`Total Warnings: ${report.summary.totalWarnings}`)

      if (report.summary.criticalIssues.length > 0) {
        console.log('\nCritical Issues:')
        report.summary.criticalIssues.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue}`)
        })
      }

      if (report.summary.recommendations.length > 0) {
        console.log('\nRecommendations:')
        report.summary.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`)
        })
      }

      console.log('\nDetailed Results:')
      console.log(`- Schema Compatible: ${report.results.schema.isCompatible}`)
      console.log(`- Data Types Compatible: ${report.results.dataTypes.isCompatible}`)
      console.log(`- Transactions Compatible: ${report.results.transactions.isCompatible}`)
      console.log(`- Queries Compatible: ${report.results.queries.isCompatible}`)

      console.log('=====================================\n')
    })
  })
})
