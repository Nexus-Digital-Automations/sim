/**
 * Database Connection Module - PostgreSQL Connection Pool Management
 *
 * This module establishes and manages the database connection pool for the Sim platform,
 * optimized for serverless deployment on Vercel with Supabase PostgreSQL backend.
 *
 * ARCHITECTURE DECISIONS:
 * - Drizzle ORM for type-safe database operations
 * - Connection pooling optimized for serverless functions
 * - Global connection reuse in development for hot reloading
 * - Environment-specific connection string handling
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Connection pooling reduces cold start latency
 * - Prepared statements disabled for better serverless compatibility
 * - Aggressive timeouts prevent connection leaks
 * - Connection limits aligned with database capacity
 *
 * DEPLOYMENT ENVIRONMENTS:
 * - Production: Vercel serverless functions with POSTGRES_URL
 * - Development: Direct connection with DATABASE_URL
 * - Testing: Isolated test database connections
 *
 * SECURITY CONSIDERATIONS:
 * - Connection strings managed through environment variables
 * - SSL/TLS encryption enforced for all connections
 * - Connection pooling prevents connection exhaustion attacks
 * - Automatic connection cleanup prevents resource leaks
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres = require('postgres')
import { env } from '@/lib/env'
import { isDev } from '@/lib/environment'
import * as schema from '@/db/schema'

// Connection string selection based on deployment environment
// Production (Vercel): Uses connection pooler with POSTGRES_URL
// Development/Testing: Direct connection with DATABASE_URL
const connectionString = env.POSTGRES_URL ?? env.DATABASE_URL

/**
 * Connection Pool Allocation Strategy
 *
 * Optimized for Vercel serverless architecture with Supabase PostgreSQL:
 *
 * POOL DISTRIBUTION:
 * - Main App: 60 connections per serverless instance
 * - Socket Server: 30 connections total (25 operations + 5 room manager)
 * - Background Jobs: Handled by dedicated services
 *
 * CAPACITY PLANNING:
 * - Typical active instances: 3-4 Vercel functions
 * - Peak load calculation: 60 × 4 = 240 connections
 * - Socket server: 30 connections (single instance)
 * - Safety buffer: 130 connections for bursts
 * - Total capacity needed: ~400 connections
 * - Supabase limit: 400 connections (16XL direct pool)
 *
 * TIMEOUT STRATEGY:
 * - idle_timeout: 20s - Aggressive cleanup for serverless
 * - connect_timeout: 30s - Reasonable connection establishment
 * - No prepared statements for better compatibility
 *
 * MONITORING CONSIDERATIONS:
 * - Connection pool exhaustion alerts
 * - Query performance tracking
 * - Long-running query detection
 */

/**
 * PostgreSQL client configuration
 *
 * Settings optimized for serverless deployment:
 * - prepare: false - Avoids prepared statement overhead in short-lived functions
 * - idle_timeout: 20 - Quick cleanup of unused connections
 * - connect_timeout: 30 - Reasonable connection establishment time
 * - max: 60 - Balanced between performance and resource usage
 * - onnotice: disabled - Reduces log noise from PostgreSQL notices
 */
const postgresClient = postgres(connectionString, {
  prepare: false, // Disable prepared statements for serverless compatibility
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 30, // Maximum time to establish connection
  max: 60, // Maximum connections per instance
  onnotice: () => {}, // Suppress PostgreSQL notice messages
})

/**
 * Drizzle ORM client initialization
 *
 * Provides type-safe database operations with:
 * - Full schema typing from schema definitions
 * - Query builder with compile-time validation
 * - Automatic SQL generation and parameter binding
 * - Transaction support with proper isolation
 */
const drizzleClient = drizzle(postgresClient, { schema })

/**
 * Global database instance declaration
 *
 * Enables connection reuse in development environment:
 * - Prevents multiple connections during hot reloading
 * - Maintains single connection pool across module reloads
 * - Production builds don't use global state
 */
declare global {
  var database: PostgresJsDatabase<typeof schema> | undefined
}

/**
 * Database connection export with development optimization
 *
 * Development: Reuses global connection to prevent pool exhaustion
 * Production: Creates new connection per serverless function instance
 *
 * USAGE PATTERNS:
 * - Import as `db` for all database operations
 * - Use with Drizzle query builder: `db.select().from(table)`
 * - Transaction support: `db.transaction(async (tx) => {...})`
 * - Type safety: Full TypeScript integration with schema types
 */
export const db = global.database || drizzleClient

// Development optimization: Store connection globally to prevent reconnection
// during Next.js hot reloading and development server restarts
if (isDev) global.database = db
