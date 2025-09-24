/**
 * Database Schema for Journey Conversion System
 * =============================================
 *
 * Tables for workflow templates, parameters, conversion cache,
 * and analytics for the workflow-to-journey conversion system.
 */

import { sql } from 'drizzle-orm'
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { users, workspaces } from '../core'
import { agents } from './agents'

// Workflow Templates Table
export const workflowTemplates = pgTable(
  'workflow_templates',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    workflow_id: text('workflow_id').notNull(),
    version: text('version').notNull().default('1.0.0'),
    workflow_data: jsonb('workflow_data').notNull().default({}),
    tags: text('tags').array().default([]),
    usage_count: integer('usage_count').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    created_by: text('created_by').references(() => users.id),
  },
  (table) => ({
    workspaceIdx: index('workflow_templates_workspace_idx').on(table.workspace_id),
    workflowIdx: index('workflow_templates_workflow_idx').on(table.workflow_id),
    nameIdx: index('workflow_templates_name_idx').on(table.name),
    tagsIdx: index('workflow_templates_tags_idx').on(table.tags),
    usageCountIdx: index('workflow_templates_usage_count_idx').on(table.usage_count),
    createdAtIdx: index('workflow_templates_created_at_idx').on(table.created_at),
    uniqueWorkspaceWorkflow: uniqueIndex('workflow_templates_workspace_workflow_unique').on(
      table.workspace_id,
      table.workflow_id,
      table.name
    ),
  })
)

// Template Parameters Table
export const templateParameters = pgTable(
  'template_parameters',
  {
    id: text('id').primaryKey(),
    template_id: text('template_id')
      .notNull()
      .references(() => workflowTemplates.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'string' | 'number' | 'boolean' | 'array' | 'object' | 'json'
    description: text('description').notNull(),
    default_value: jsonb('default_value'),
    required: boolean('required').notNull().default(false),
    validation: jsonb('validation').default({}),
    display_order: integer('display_order').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    templateIdx: index('template_parameters_template_idx').on(table.template_id),
    orderIdx: index('template_parameters_order_idx').on(table.display_order),
    uniqueTemplateName: uniqueIndex('template_parameters_template_name_unique').on(
      table.template_id,
      table.name
    ),
  })
)

// Conversion Cache Table
export const conversionCache = pgTable(
  'conversion_cache',
  {
    id: text('id').primaryKey(),
    cache_key: text('cache_key').notNull(),
    workflow_id: text('workflow_id').notNull(),
    template_id: text('template_id').references(() => workflowTemplates.id, {
      onDelete: 'cascade',
    }),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    parameters_hash: text('parameters_hash').notNull(),
    conversion_result: jsonb('conversion_result').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    hit_count: integer('hit_count').notNull().default(0),
    last_accessed: timestamp('last_accessed', { withTimezone: true }).notNull().defaultNow(),
    size_bytes: integer('size_bytes').notNull().default(0),
  },
  (table) => ({
    cacheKeyIdx: uniqueIndex('conversion_cache_key_unique').on(table.cache_key),
    workflowIdx: index('conversion_cache_workflow_idx').on(table.workflow_id),
    templateIdx: index('conversion_cache_template_idx').on(table.template_id),
    workspaceIdx: index('conversion_cache_workspace_idx').on(table.workspace_id),
    expiresAtIdx: index('conversion_cache_expires_at_idx').on(table.expires_at),
    lastAccessedIdx: index('conversion_cache_last_accessed_idx').on(table.last_accessed),
    hitCountIdx: index('conversion_cache_hit_count_idx').on(table.hit_count),
  })
)

// Conversion History Table
export const conversionHistory = pgTable(
  'conversion_history',
  {
    id: text('id').primaryKey(),
    conversion_id: text('conversion_id').notNull(),
    workflow_id: text('workflow_id').notNull(),
    template_id: text('template_id').references(() => workflowTemplates.id),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    user_id: text('user_id').references(() => users.id),
    agent_id: text('agent_id').references(() => agents.id),
    parameters: jsonb('parameters').notNull().default({}),
    status: text('status').notNull(), // 'queued' | 'processing' | 'completed' | 'failed'
    result: jsonb('result'),
    error_details: jsonb('error_details'),
    metadata: jsonb('metadata').notNull().default({}),
    duration_ms: integer('duration_ms'),
    blocks_converted: integer('blocks_converted').default(0),
    edges_converted: integer('edges_converted').default(0),
    warnings_count: integer('warnings_count').default(0),
    cache_hit: boolean('cache_hit').default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    started_at: timestamp('started_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    conversionIdIdx: index('conversion_history_conversion_id_idx').on(table.conversion_id),
    workflowIdx: index('conversion_history_workflow_idx').on(table.workflow_id),
    templateIdx: index('conversion_history_template_idx').on(table.template_id),
    workspaceIdx: index('conversion_history_workspace_idx').on(table.workspace_id),
    userIdx: index('conversion_history_user_idx').on(table.user_id),
    statusIdx: index('conversion_history_status_idx').on(table.status),
    createdAtIdx: index('conversion_history_created_at_idx').on(table.created_at),
    durationIdx: index('conversion_history_duration_idx').on(table.duration_ms),
    cacheHitIdx: index('conversion_history_cache_hit_idx').on(table.cache_hit),
  })
)

// Template Usage Statistics Table
export const templateUsageStats = pgTable(
  'template_usage_stats',
  {
    id: text('id').primaryKey(),
    template_id: text('template_id')
      .notNull()
      .references(() => workflowTemplates.id, { onDelete: 'cascade' }),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    conversion_count: integer('conversion_count').notNull().default(0),
    success_count: integer('success_count').notNull().default(0),
    failure_count: integer('failure_count').notNull().default(0),
    average_duration_ms: integer('average_duration_ms').default(0),
    total_duration_ms: integer('total_duration_ms').default(0),
    cache_hit_rate: decimal('cache_hit_rate', { precision: 5, scale: 4 }).default('0.0000'),
    last_used_at: timestamp('last_used_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    templateIdx: uniqueIndex('template_usage_stats_template_unique').on(table.template_id),
    workspaceIdx: index('template_usage_stats_workspace_idx').on(table.workspace_id),
    conversionCountIdx: index('template_usage_stats_conversion_count_idx').on(
      table.conversion_count
    ),
    lastUsedIdx: index('template_usage_stats_last_used_idx').on(table.last_used_at),
  })
)

// Journey Generation History Table
export const journeyGenerationHistory = pgTable(
  'journey_generation_history',
  {
    id: text('id').primaryKey(),
    journey_id: text('journey_id').notNull(),
    conversion_id: text('conversion_id').references(() => conversionHistory.id, {
      onDelete: 'set null',
    }),
    template_id: text('template_id').references(() => workflowTemplates.id),
    workflow_id: text('workflow_id').notNull(),
    agent_id: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    user_id: text('user_id').references(() => users.id),
    parameters_used: jsonb('parameters_used').notNull().default({}),
    journey_title: text('journey_title').notNull(),
    journey_description: text('journey_description'),
    steps_created: integer('steps_created').notNull().default(0),
    optimization_level: text('optimization_level').notNull().default('standard'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    journeyIdx: uniqueIndex('journey_generation_history_journey_unique').on(table.journey_id),
    conversionIdx: index('journey_generation_history_conversion_idx').on(table.conversion_id),
    templateIdx: index('journey_generation_history_template_idx').on(table.template_id),
    agentIdx: index('journey_generation_history_agent_idx').on(table.agent_id),
    workspaceIdx: index('journey_generation_history_workspace_idx').on(table.workspace_id),
    createdAtIdx: index('journey_generation_history_created_at_idx').on(table.created_at),
  })
)

// Parameter Usage Analytics Table
export const parameterUsageAnalytics = pgTable(
  'parameter_usage_analytics',
  {
    id: text('id').primaryKey(),
    template_id: text('template_id')
      .notNull()
      .references(() => workflowTemplates.id, { onDelete: 'cascade' }),
    parameter_name: text('parameter_name').notNull(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    usage_count: integer('usage_count').notNull().default(0),
    unique_values_count: integer('unique_values_count').notNull().default(0),
    most_common_values: jsonb('most_common_values').default([]),
    value_distribution: jsonb('value_distribution').default({}),
    last_value_seen: jsonb('last_value_seen'),
    last_used_at: timestamp('last_used_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    templateParamIdx: uniqueIndex('parameter_usage_analytics_template_param_unique').on(
      table.template_id,
      table.parameter_name
    ),
    workspaceIdx: index('parameter_usage_analytics_workspace_idx').on(table.workspace_id),
    usageCountIdx: index('parameter_usage_analytics_usage_count_idx').on(table.usage_count),
    lastUsedIdx: index('parameter_usage_analytics_last_used_idx').on(table.last_used_at),
  })
)

// Real-time Conversion Progress Table (for WebSocket subscriptions)
export const conversionProgress = pgTable(
  'conversion_progress',
  {
    id: text('id').primaryKey(),
    conversion_id: text('conversion_id').notNull(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    user_id: text('user_id').references(() => users.id),
    status: text('status').notNull(), // 'queued' | 'processing' | 'completed' | 'failed'
    progress_percentage: integer('progress_percentage').notNull().default(0),
    current_step: text('current_step'),
    blocks_processed: integer('blocks_processed').notNull().default(0),
    total_blocks: integer('total_blocks').notNull().default(0),
    estimated_completion_ms: integer('estimated_completion_ms'),
    error_details: jsonb('error_details'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp('expires_at', { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '1 hour'`),
  },
  (table) => ({
    conversionIdIdx: uniqueIndex('conversion_progress_conversion_id_unique').on(
      table.conversion_id
    ),
    workspaceUserIdx: index('conversion_progress_workspace_user_idx').on(
      table.workspace_id,
      table.user_id
    ),
    statusIdx: index('conversion_progress_status_idx').on(table.status),
    expiresAtIdx: index('conversion_progress_expires_at_idx').on(table.expires_at),
    updatedAtIdx: index('conversion_progress_updated_at_idx').on(table.updated_at),
  })
)

// Zod schemas for validation
export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates)
export const selectWorkflowTemplateSchema = createSelectSchema(workflowTemplates)

export const insertTemplateParameterSchema = createInsertSchema(templateParameters)
export const selectTemplateParameterSchema = createSelectSchema(templateParameters)

export const insertConversionCacheSchema = createInsertSchema(conversionCache)
export const selectConversionCacheSchema = createSelectSchema(conversionCache)

export const insertConversionHistorySchema = createInsertSchema(conversionHistory)
export const selectConversionHistorySchema = createSelectSchema(conversionHistory)

export const insertTemplateUsageStatsSchema = createInsertSchema(templateUsageStats)
export const selectTemplateUsageStatsSchema = createSelectSchema(templateUsageStats)

export const insertJourneyGenerationHistorySchema = createInsertSchema(journeyGenerationHistory)
export const selectJourneyGenerationHistorySchema = createSelectSchema(journeyGenerationHistory)

export const insertParameterUsageAnalyticsSchema = createInsertSchema(parameterUsageAnalytics)
export const selectParameterUsageAnalyticsSchema = createSelectSchema(parameterUsageAnalytics)

export const insertConversionProgressSchema = createInsertSchema(conversionProgress)
export const selectConversionProgressSchema = createSelectSchema(conversionProgress)

// Type exports
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect
export type InsertWorkflowTemplate = typeof workflowTemplates.$inferInsert

export type TemplateParameter = typeof templateParameters.$inferSelect
export type InsertTemplateParameter = typeof templateParameters.$inferInsert

export type ConversionCache = typeof conversionCache.$inferSelect
export type InsertConversionCache = typeof conversionCache.$inferInsert

export type ConversionHistory = typeof conversionHistory.$inferSelect
export type InsertConversionHistory = typeof conversionHistory.$inferInsert

export type TemplateUsageStats = typeof templateUsageStats.$inferSelect
export type InsertTemplateUsageStats = typeof templateUsageStats.$inferInsert

export type JourneyGenerationHistory = typeof journeyGenerationHistory.$inferSelect
export type InsertJourneyGenerationHistory = typeof journeyGenerationHistory.$inferInsert

export type ParameterUsageAnalytics = typeof parameterUsageAnalytics.$inferSelect
export type InsertParameterUsageAnalytics = typeof parameterUsageAnalytics.$inferInsert

export type ConversionProgress = typeof conversionProgress.$inferSelect
export type InsertConversionProgress = typeof conversionProgress.$inferInsert
