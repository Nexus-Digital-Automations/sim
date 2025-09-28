import { boolean, index, integer, json, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { apiKey, user, workspace } from './base-schema'

/**
 * Workflow Core Schema
 *
 * This file contains the core workflow-related tables that are referenced
 * by multiple other schema files. Separated to avoid circular dependencies.
 */

export const workflowFolder = pgTable(
  'workflow_folder',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'), // Self-reference will be handled by foreign key constraint
    color: text('color').default('#6B7280'),
    isExpanded: boolean('is_expanded').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('workflow_folder_user_idx').on(table.userId),
    workspaceParentIdx: index('workflow_folder_workspace_parent_idx').on(
      table.workspaceId,
      table.parentId
    ),
    parentSortIdx: index('workflow_folder_parent_sort_idx').on(table.parentId, table.sortOrder),
  })
)

export const workflow = pgTable(
  'workflow',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').references(() => workspace.id, {
      onDelete: 'cascade',
    }),
    folderId: text('folder_id').references(() => workflowFolder.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').notNull().default('#3972F6'),
    lastSynced: timestamp('last_synced').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    isDeployed: boolean('is_deployed').notNull().default(false),
    deployedState: json('deployed_state'),
    deployedAt: timestamp('deployed_at'),
    pinnedApiKey: text('pinned_api_key').references(() => apiKey.id, {
      onDelete: 'set null',
    }),
    collaborators: json('collaborators').notNull().default('[]'),
    runCount: integer('run_count').notNull().default(0),
    lastRunAt: timestamp('last_run_at'),
    variables: json('variables').default('{}'),
    isPublished: boolean('is_published').notNull().default(false),
    marketplaceData: json('marketplace_data'),
  },
  (table) => ({
    userIdIdx: index('workflow_user_id_idx').on(table.userId),
    workspaceIdIdx: index('workflow_workspace_id_idx').on(table.workspaceId),
    userWorkspaceIdx: index('workflow_user_workspace_idx').on(table.userId, table.workspaceId),
  })
)
