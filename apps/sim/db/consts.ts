/**
 * Database Constants - Schema-Level Configuration Values
 *
 * This module contains database-specific constants used in schema definitions
 * and migrations. These constants are kept separate from application logic to:
 * - Maintain lightweight migration files
 * - Ensure consistent schema defaults across environments
 * - Enable easy configuration updates through schema changes
 * - Prevent circular dependencies in database layer
 *
 * DESIGN PRINCIPLES:
 * - Constants are immutable and schema-focused
 * - No application logic or business rules
 * - Safe for use in migration files
 * - Database-agnostic where possible
 */

/**
 * Default Free Credits Configuration
 *
 * Initial credit allocation for new user accounts in USD.
 * Used as default value in userStats table to bootstrap user spending limits.
 *
 * RATIONALE:
 * - $10 provides meaningful trial experience
 * - Sufficient for testing workflows and automation
 * - Encourages upgrade to paid plans for production use
 * - Balances user experience with cost control
 *
 * IMPACT:
 * - Applied to new user registrations
 * - Referenced in billing calculations
 * - Used in usage limit enforcement
 */
export const DEFAULT_FREE_CREDITS = 10

/**
 * Knowledge Base Tag Slot Configuration
 *
 * Defines available tag columns for document organization and filtering.
 * Each slot corresponds to a database column in document and embedding tables.
 *
 * DESIGN RATIONALE:
 * - Fixed number of slots for optimal database performance
 * - Indexed columns for fast filtering and search
 * - Flexible tagging system without JOIN complexity
 * - Backwards compatible schema evolution
 *
 * PERFORMANCE CONSIDERATIONS:
 * - Each tag slot has dedicated database index
 * - Direct column filtering avoids expensive JOINs
 * - 7 slots balance flexibility with index overhead
 * - JSONB alternative considered but rejected for performance
 *
 * USAGE PATTERNS:
 * - Document categorization (department, project, type)
 * - Access control and permission filtering
 * - Search faceting and result filtering
 * - Automated document classification
 */
export const TAG_SLOTS = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7'] as const

/**
 * Type definition for tag slot identifiers
 *
 * Provides type safety when referencing tag slots in application code:
 * - Compile-time validation of tag slot names
 * - IntelliSense support for tag operations
 * - Prevents typos in tag slot references
 * - Enables safe refactoring of tag system
 */
export type TagSlot = (typeof TAG_SLOTS)[number]
