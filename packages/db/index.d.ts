import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
export * from './schema'
export type { PostgresJsDatabase }
export * from './parlant-exports'
declare global {
  var database: PostgresJsDatabase<typeof schema> | undefined
}
export declare const db: PostgresJsDatabase<typeof schema>
