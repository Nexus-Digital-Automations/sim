/**
 * Drizzle Migration Configuration
 *
 * This configuration file defines settings for Drizzle Kit, the migration tool
 * that manages database schema changes and generates SQL migration files.
 *
 * MIGRATION STRATEGY:
 * - Schema-first approach: TypeScript schema defines database structure
 * - Automatic migration generation from schema changes
 * - Sequential migration files for version control
 * - Safe rollback capability with migration tracking
 *
 * WORKFLOW:
 * 1. Modify schema.ts with new tables/columns/indexes
 * 2. Run `drizzle-kit generate:pg` to create migration
 * 3. Review generated SQL for accuracy and safety
 * 4. Run `drizzle-kit migrate` to apply changes
 * 5. Commit schema.ts and migration files together
 *
 * SAFETY FEATURES:
 * - Drizzle validates schema changes for breaking changes
 * - Migration files are immutable once applied
 * - Database introspection ensures consistency
 * - Rollback support for schema changes
 *
 * PRODUCTION DEPLOYMENT:
 * - Migrations run automatically during deployment
 * - Zero-downtime migration strategies for large tables
 * - Database backup recommended before major changes
 * - Monitoring for migration performance and errors
 */

import type { Config } from 'drizzle-kit'
import { env } from './lib/env'

export default {
  // Schema definition file - single source of truth for database structure
  schema: './db/schema.ts',

  // Migration output directory - contains sequential SQL migration files
  // Each migration has a timestamp and descriptive name for version control
  out: './db/migrations',

  // Database dialect - PostgreSQL with support for advanced features
  // Enables PostgreSQL-specific types: JSONB, arrays, enums, vectors
  dialect: 'postgresql',

  // Database connection credentials
  // Uses environment variable for security and deployment flexibility
  dbCredentials: {
    url: env.DATABASE_URL, // Full PostgreSQL connection string with auth
  },

  // Migration execution options (using defaults for safety)
  // - Automatic migration tracking in drizzle.__drizzle_migrations table
  // - Transaction-wrapped migrations for atomicity
  // - Error handling with detailed migration failure reporting
  // - Schema introspection for validation
} satisfies Config
