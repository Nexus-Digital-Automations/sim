import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Re-export Parlant types and utilities
export * from './parlant-exports'
// Re-export everything from schema for type consistency
export * from './schema'

// In production, use the Vercel-generated POSTGRES_URL
// In development, use the direct DATABASE_URL
const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? ''
if (!connectionString) {
  throw new Error('Missing POSTGRES_URL or DATABASE_URL environment variable')
}
/**
 * Connection Pool Allocation Strategy
 *
 * Main App: 60 connections per instance
 * Socket Server: 25 connections (operations) + 5 connections (room manager) = 30 total
 *
 * With ~3-4 Vercel serverless instances typically active:
 * - Main app: 60 × 4 = 240 connections
 * - Socket server: 30 connections total
 * - Buffer: 130 connections
 * - Total: ~400 connections
 * - Supabase limit: 400 connections (16XL instance direct connection pool)
 */
const postgresClient = postgres(connectionString, {
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 30,
  max: 60,
  onnotice: () => {},
})
const drizzleClient = drizzle(postgresClient, { schema })
export const db = globalThis.database || drizzleClient
if (process.env.NODE_ENV !== 'production') globalThis.database = db
