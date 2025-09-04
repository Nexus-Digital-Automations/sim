/**
 * Enhanced Authentication Type Definitions
 *
 * This module extends Better Auth types to include the role property that exists
 * in the database schema but is not included in the default Better Auth session types.
 * 
 * INTEGRATION WITH DATABASE SCHEMA:
 * - Aligns with user table definition in /apps/sim/db/schema.ts
 * - Includes role property for authorization checks (admin, user, moderator)
 * - Maintains type safety across community and monitoring features
 *
 * USAGE PATTERNS:
 * - Import EnhancedUser for type-safe role access
 * - Use EnhancedSession for session objects with role property
 * - Safe role access: user.role || 'user' for backward compatibility
 *
 * SECURITY CONSIDERATIONS:
 * - Role property supports authorization in community features
 * - Default role is 'user' as defined in database schema
 * - Type-safe access prevents undefined role access errors
 *
 * @created 2025-09-04
 * @author Wave 2 Subagent 3 - User Type Schema Alignment
 */

/**
 * Generic User type that may or may not have role property
 * 
 * Represents any user object, whether from Better Auth or enhanced with role.
 * This provides flexibility while maintaining type safety.
 */
export type AnyUser = {
  id?: string
  name?: string | null
  email?: string
  [key: string]: any
}

/**
 * Enhanced User interface with role property
 *
 * User object that includes the role property from database schema.
 * This ensures type safety when accessing user roles in authorization checks.
 *
 * ROLE VALUES:
 * - 'admin': Full administrative access
 * - 'moderator': Community moderation permissions
 * - 'user': Standard user permissions (default)
 */
export interface EnhancedUser extends AnyUser {
  /**
   * User role for authorization checks
   * @default 'user'
   * @values 'admin' | 'moderator' | 'user'
   */
  role: string
}

/**
 * Type guard to check if a user object has the role property
 * 
 * @param user - User object to check
 * @returns True if user has role property
 */
export function hasRole(user: AnyUser | EnhancedUser): user is EnhancedUser {
  return user && 'role' in user && typeof user.role === 'string'
}

/**
 * Safe role accessor with fallback to default
 *
 * Provides a safe way to access the user role with a fallback to 'user'
 * if the role property is not present or is undefined.
 *
 * @param user - User object (may or may not have role property)
 * @returns User role or 'user' as default
 */
export function getUserRole(user: AnyUser | EnhancedUser | null | undefined): string {
  if (!user) return 'user'
  return hasRole(user) ? user.role : 'user'
}

/**
 * Authorization helper functions
 */
export const AuthHelpers = {
  /**
   * Check if user is admin
   */
  isAdmin: (user: AnyUser | EnhancedUser | null | undefined): boolean => {
    return getUserRole(user) === 'admin'
  },

  /**
   * Check if user is moderator
   */
  isModerator: (user: AnyUser | EnhancedUser | null | undefined): boolean => {
    return getUserRole(user) === 'moderator'
  },

  /**
   * Check if user has admin or moderator permissions
   */
  isAdminOrModerator: (user: AnyUser | EnhancedUser | null | undefined): boolean => {
    const role = getUserRole(user)
    return role === 'admin' || role === 'moderator'
  },

  /**
   * Check if user can moderate content
   */
  canModerate: (user: AnyUser | EnhancedUser | null | undefined): boolean => {
    return AuthHelpers.isAdminOrModerator(user)
  }
}

