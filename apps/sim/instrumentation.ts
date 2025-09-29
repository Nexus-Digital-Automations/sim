/**
 * Simplified instrumentation to prevent build hanging
 * This disables all instrumentation during build time to fix the optimization hang issue
 */

export function register() {
  // Empty function to satisfy Next.js instrumentation contract
  // Instrumentation is disabled to prevent build hanging issues
}
