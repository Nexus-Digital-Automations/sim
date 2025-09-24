/**
 * Hash Utilities
 * ==============
 *
 * Utilities for creating consistent hashes for caching and identification
 */

import { createHash as cryptoCreateHash } from 'crypto'

/**
 * Create a consistent hash from a string
 */
export function createHash(input: string, algorithm = 'sha256'): string {
  return cryptoCreateHash(algorithm).update(input).digest('hex').substring(0, 32) // Truncate to 32 characters for readability
}

/**
 * Create a hash from an object by stringifying it consistently
 */
export function createObjectHash(obj: any, algorithm = 'sha256'): string {
  const jsonString = JSON.stringify(obj, Object.keys(obj).sort())
  return createHash(jsonString, algorithm)
}

/**
 * Create a cache key hash from multiple components
 */
export function createCacheKey(...components: (string | number | object)[]): string {
  const keyString = components
    .map((component) => {
      if (typeof component === 'object') {
        return JSON.stringify(component, Object.keys(component).sort())
      }
      return String(component)
    })
    .join('|')

  return createHash(keyString)
}
