/**
 * PostgreSQL Tool Adapter
 * ========================
 *
 * Adapter for PostgreSQL database operations
 * Converts Sim's PostgreSQL block to Parlant-compatible format
 */

import { UniversalToolAdapter, ParlantTool, ToolExecutionContext, AdapterExecutionResult } from '../adapter-framework'
import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

export class PostgreSQLAdapter extends UniversalToolAdapter {
  constructor(blockConfig: BlockConfig) {
    super(blockConfig)
  }

  protected transformToParlant(blockConfig: BlockConfig): ParlantTool {
    return {
      id: 'postgresql',
      name: 'PostgreSQL Database',
      description: 'Execute SQL queries and manage PostgreSQL database operations',
      longDescription: 'Connect to PostgreSQL databases to run queries, insert data, update records, and manage database operations with full SQL support.',
      category: 'data',
      parameters: [
        {
          name: 'query',
          description: 'The SQL query to execute',
          type: 'string',
          required: true,
          examples: [
            'SELECT * FROM users WHERE age > 25',
            'INSERT INTO products (name, price) VALUES ($1, $2)',
            'UPDATE orders SET status = $1 WHERE id = $2',
            'DELETE FROM sessions WHERE expired_at < NOW()'
          ]
        },
        {
          name: 'parameters',
          description: 'Query parameters to prevent SQL injection (optional)',
          type: 'array',
          required: false,
          examples: [
            ['John Doe', 25],
            ['active', 123],
            [100.50, 'Electronics']
          ]
        },
        {
          name: 'connection_string',
          description: 'PostgreSQL connection string or URL',
          type: 'string',
          required: true,
          examples: [
            'postgresql://username:password@localhost:5432/dbname',
            'postgres://user:pass@db.example.com:5432/mydb?sslmode=require'
          ]
        },
        {
          name: 'timeout',
          description: 'Query timeout in seconds (optional, default: 30)',
          type: 'number',
          required: false,
          default: 30,
          constraints: {
            min: 1,
            max: 300
          }
        },
        {
          name: 'max_rows',
          description: 'Maximum number of rows to return (optional, default: 1000)',
          type: 'number',
          required: false,
          default: 1000,
          constraints: {
            min: 1,
            max: 10000
          }
        }
      ],
      outputs: [
        {
          name: 'rows',
          description: 'The rows returned by the query',
          type: 'array'
        },
        {
          name: 'row_count',
          description: 'Number of rows affected or returned',
          type: 'number'
        },
        {
          name: 'columns',
          description: 'Column information from the query result',
          type: 'array',
          optional: true
        },
        {
          name: 'execution_time_ms',
          description: 'Query execution time in milliseconds',
          type: 'number'
        },
        {
          name: 'query_type',
          description: 'Type of SQL operation (SELECT, INSERT, UPDATE, DELETE, etc.)',
          type: 'string'
        }
      ],
      examples: [
        {
          scenario: 'Query user data with age filter',
          input: {
            query: 'SELECT id, name, email FROM users WHERE age > $1 ORDER BY created_at DESC',
            parameters: [25],
            connection_string: 'postgresql://user:pass@localhost:5432/myapp',
            max_rows: 100
          },
          expectedOutput: 'Returns array of user objects with id, name, and email fields'
        },
        {
          scenario: 'Insert new product with parameters',
          input: {
            query: 'INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id',
            parameters: ['Laptop', 999.99, 'Electronics'],
            connection_string: 'postgresql://user:pass@localhost:5432/myapp'
          },
          expectedOutput: 'Returns the ID of the newly inserted product'
        },
        {
          scenario: 'Update order status',
          input: {
            query: 'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
            parameters: ['shipped', 12345],
            connection_string: 'postgresql://user:pass@localhost:5432/myapp'
          },
          expectedOutput: 'Returns confirmation of update with row count'
        }
      ],
      usageHints: [
        'Always use parameterized queries ($1, $2, etc.) to prevent SQL injection',
        'Connection strings should include proper authentication credentials',
        'Use LIMIT clause or max_rows parameter for large result sets',
        'Consider using transactions for multiple related operations',
        'Be careful with DELETE and UPDATE operations - always include WHERE clauses',
        'Use RETURNING clause with INSERT/UPDATE to get modified data back'
      ],
      requiresAuth: {
        type: 'basic',
        provider: 'postgresql'
      }
    }
  }

  protected async transformParameters(
    parlantParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<Record<string, any>> {
    return {
      query: parlantParams.query,
      parameters: parlantParams.parameters || [],
      connectionString: parlantParams.connection_string,
      timeout: (parlantParams.timeout || 30) * 1000, // Convert to milliseconds
      maxRows: parlantParams.max_rows || 1000
    }
  }

  protected async executeSimTool(
    simParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResponse> {
    const startTime = Date.now()

    try {
      // Import PostgreSQL client (would be available in the actual environment)
      // For this example, we'll simulate the database operation

      // Parse connection string
      const connectionUrl = new URL(simParams.connectionString)
      const dbConfig = {
        host: connectionUrl.hostname,
        port: parseInt(connectionUrl.port) || 5432,
        database: connectionUrl.pathname.slice(1),
        user: connectionUrl.username,
        password: connectionUrl.password,
        ssl: connectionUrl.searchParams.has('sslmode')
      }

      // Detect query type
      const queryType = this.detectQueryType(simParams.query)

      // Simulate database execution
      const result = await this.simulatePostgreSQLQuery(simParams.query, simParams.parameters, queryType)

      const executionTime = Date.now() - startTime

      return {
        success: true,
        output: {
          rows: result.rows,
          rowCount: result.rowCount,
          columns: result.columns,
          executionTime,
          queryType,
          connection: {
            host: dbConfig.host,
            database: dbConfig.database
          }
        },
        timing: {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          duration: executionTime
        }
      }

    } catch (error) {
      const executionTime = Date.now() - startTime
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'PostgreSQL query execution failed',
        timing: {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          duration: executionTime
        }
      }
    }
  }

  protected async transformResult(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    if (!simResult.success) {
      throw new Error(simResult.error || 'PostgreSQL operation failed')
    }

    return {
      rows: simResult.output.rows,
      row_count: simResult.output.rowCount,
      columns: simResult.output.columns,
      execution_time_ms: simResult.output.executionTime,
      query_type: simResult.output.queryType,
      database_info: simResult.output.connection
    }
  }

  protected async calculateUsage(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    const rowsProcessed = simResult.output.rowCount || 0
    const executionTimeMs = simResult.output.executionTime || 0

    return {
      computeUnits: Math.ceil(executionTimeMs / 1000), // 1 unit per second
      rowsProcessed,
      queryCount: 1,
      databaseConnectionsUsed: 1
    }
  }

  /**
   * Detect the type of SQL query
   */
  private detectQueryType(query: string): string {
    const normalizedQuery = query.trim().toLowerCase()

    if (normalizedQuery.startsWith('select')) return 'SELECT'
    if (normalizedQuery.startsWith('insert')) return 'INSERT'
    if (normalizedQuery.startsWith('update')) return 'UPDATE'
    if (normalizedQuery.startsWith('delete')) return 'DELETE'
    if (normalizedQuery.startsWith('create')) return 'CREATE'
    if (normalizedQuery.startsWith('drop')) return 'DROP'
    if (normalizedQuery.startsWith('alter')) return 'ALTER'
    if (normalizedQuery.startsWith('with')) return 'WITH'

    return 'OTHER'
  }

  /**
   * Simulate PostgreSQL query execution for demonstration
   * In real implementation, this would use an actual PostgreSQL client
   */
  private async simulatePostgreSQLQuery(
    query: string,
    parameters: any[],
    queryType: string
  ): Promise<{ rows: any[], rowCount: number, columns?: any[] }> {

    // Simulate different types of queries
    switch (queryType) {
      case 'SELECT':
        return {
          rows: [
            { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 28 }
          ],
          rowCount: 2,
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'name', type: 'varchar' },
            { name: 'email', type: 'varchar' },
            { name: 'age', type: 'integer' }
          ]
        }

      case 'INSERT':
        return {
          rows: [{ id: 12345 }], // RETURNING clause result
          rowCount: 1,
          columns: [{ name: 'id', type: 'integer' }]
        }

      case 'UPDATE':
        return {
          rows: [],
          rowCount: 3 // Number of rows updated
        }

      case 'DELETE':
        return {
          rows: [],
          rowCount: 1 // Number of rows deleted
        }

      default:
        return {
          rows: [],
          rowCount: 0
        }
    }
  }
}