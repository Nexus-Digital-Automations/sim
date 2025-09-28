/**
 * Type definitions for the Universal Tool Registry System
 */

import type { z } from 'zod'
import type {
  toolCategories,
  toolConfigurations,
  toolRecommendations,
  toolRegistry,
  toolUsageAnalytics,
} from '@/packages/db/schema'

// Database schema types
export type ToolRegistryRow = typeof toolRegistry.$inferSelect
export type ToolRegistryInsert = typeof toolRegistry.$inferInsert
export type ToolCategoryRow = typeof toolCategories.$inferSelect
export type ToolCategoryInsert = typeof toolCategories.$inferInsert
export type ToolConfigurationRow = typeof toolConfigurations.$inferSelect
export type ToolConfigurationInsert = typeof toolConfigurations.$inferInsert
export type ToolUsageAnalyticsRow = typeof toolUsageAnalytics.$inferSelect
export type ToolUsageAnalyticsInsert = typeof toolUsageAnalytics.$inferInsert
export type ToolRecommendationRow = typeof toolRecommendations.$inferSelect
export type ToolRecommendationInsert = typeof toolRecommendations.$inferInsert

// Enums from database
export type ToolStatus = 'active' | 'inactive' | 'deprecated' | 'maintenance'
export type ToolScope = 'global' | 'workspace' | 'user'
export type ToolType = 'builtin' | 'custom' | 'integration' | 'plugin'

// Core tool definition with rich metadata
export interface ToolDefinition {
  id: string
  Name: string
  displayName: string
  description: string
  longDescription?: string
  version: string
  toolType: ToolType
  scope: ToolScope
  status: ToolStatus

  // Categorization
  categoryId?: string
  tags: string[]
  keywords: string[]

  // Schema definitions
  schema: z.ZodSchema<any> // Parameter schema
  resultSchema?: z.ZodSchema<any> // Result schema
  metadata: ToolMetadata

  // Implementation
  implementationType: 'client' | 'server' | 'hybrid'
  executionContext: Record<string, any>

  // Natural language support
  naturalLanguageDescription?: string
  usageExamples: ToolUsageExample[]
  commonQuestions: ToolFAQ[]

  // Access control
  isPublic: boolean
  requiresAuth: boolean
  requiredPermissions: string[]
}

// Extended metadata for tools
export interface ToolMetadata {
  author?: string
  documentation?: string
  homepage?: string
  repository?: string
  license?: string
  icon?: string
  screenshots?: string[]
  videos?: string[]
  changelog?: string
  supportEmail?: string
  supportChat?: string
  pricing?: 'free' | 'paid' | 'freemium'
  enterprise?: boolean
  integrations?: string[] // List of services this tool integrates with
  dependencies?: string[] // Dependencies on other tools or services
  outputs?: string[] // What types of outputs this tool produces
  inputs?: string[] // What types of inputs this tool accepts
}

// Usage examples for natural language understanding
export interface ToolUsageExample {
  title: string
  description: string
  userInput?: string // What a user might say/type
  parameters?: Record<string, any> // Example parameters
  expectedOutput?: string // What the output might look like
  scenario?: string // When this would be useful
}

// FAQ for tool usage
export interface ToolFAQ {
  question: string
  answer: string
  category?: string // 'usage' | 'troubleshooting' | 'integration' | 'billing'
  keywords?: string[]
}

// Tool discovery and search
export interface ToolSearchQuery {
  query?: string // Text search query
  categoryId?: string
  toolType?: ToolType
  scope?: ToolScope
  status?: ToolStatus
  tags?: string[]
  requiresAuth?: boolean
  isPublic?: boolean
  workspaceId?: string
  userId?: string
  limit?: number
  offset?: number
  sortBy?: 'Name' | 'usage' | 'rating' | 'recent' | 'relevance'
  sortOrder?: 'asc' | 'desc'
}

export interface ToolSearchResult {
  tools: EnrichedTool[]
  total: number
  facets: ToolSearchFacets
  suggestions?: string[]
}

export interface ToolSearchFacets {
  categories: { id: string; Name: string; count: number }[]
  types: { type: ToolType; count: number }[]
  tags: { tag: string; count: number }[]
  scopes: { scope: ToolScope; count: number }[]
}

// Enhanced tool with runtime information
export interface EnrichedTool extends ToolDefinition {
  category?: ToolCategoryRow
  configuration?: ToolConfigurationRow
  analytics: ToolAnalytics
  healthStatus: ToolHealth
  recommendation?: ToolRecommendationData
}

// Analytics data for tools
export interface ToolAnalytics {
  usageCount: number
  successRate: number
  avgExecutionTimeMs: number
  lastUsed?: Date
  errorRate: number
  popularityScore: number
  userRating?: number
  reviewCount: number
}

// Health monitoring for tools
export interface ToolHealth {
  status: 'healthy' | 'warning' | 'error' | 'unknown'
  lastCheckTime?: Date
  uptime?: number
  responseTime?: number
  errorDetails?: string
  dependencies?: ToolDependencyHealth[]
}

export interface ToolDependencyHealth {
  Name: string
  status: 'healthy' | 'warning' | 'error'
  responseTime?: number
  lastChecked?: Date
}

// Tool recommendation system
export interface ToolRecommendationData {
  score: number
  confidence: number
  reason: string
  recommendationType: 'contextual' | 'popular' | 'similar' | 'workflow'
  contextData?: Record<string, any>
}

export interface RecommendationContext {
  userId?: string
  workspaceId?: string
  sessionId?: string
  currentTask?: string
  recentTools?: string[]
  workflowContext?: any
  userPreferences?: UserToolPreferences
}

export interface UserToolPreferences {
  favoriteCategories: string[]
  preferredTypes: ToolType[]
  recentlyUsed: string[]
  dismissed: string[]
  customTags: Record<string, string[]>
}

// Tool configuration management
export interface ToolConfiguration {
  id: string
  toolId: string
  workspaceId?: string
  userId?: string
  Name: string
  description?: string
  configuration: Record<string, any>
  environmentVariables: Record<string, string>
  credentials: Record<string, any> // Encrypted references
  isActive: boolean
  isValid: boolean
  validationErrors: string[]
  lastValidated?: Date
}

// Tool execution context
export interface ToolExecutionContext {
  toolId: string
  configurationId?: string
  userId?: string
  workspaceId?: string
  sessionId?: string
  executionId: string
  parameters: Record<string, any>
  environment: Record<string, string>
  credentials: Record<string, any>
}

// Tool execution result
export interface ToolExecutionResult {
  success: boolean
  data?: any
  error?: {
    type: string
    message: string
    details?: any
  }
  performance: {
    startTime: Date
    endTime: Date
    durationMs: number
    cpuUsage?: number
    memoryUsage?: number
    networkCalls?: number
  }
  metadata?: {
    inputSize?: number
    outputSize?: number
    cacheHit?: boolean
    rateLimited?: boolean
  }
}

// Tool adapter interface - for converting existing tools to registry format
export interface ToolAdapter<T = any> {
  adaptTool(originalTool: T): ToolDefinition
  validateConfiguration(config: any): { isValid: boolean; errors: string[] }
  convertParameters(params: any): any
  convertResult(result: any): any
}

// Registry service interfaces
export interface IToolRegistryService {
  // Core registration
  registerTool(tool: ToolDefinition): Promise<void>
  unregisterTool(toolId: string): Promise<void>
  updateTool(toolId: string, updates: Partial<ToolDefinition>): Promise<void>
  getTool(toolId: string): Promise<EnrichedTool | null>
  listTools(query?: ToolSearchQuery): Promise<ToolSearchResult>

  // Categories
  createCategory(
    category: Omit<ToolCategoryRow, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ToolCategoryRow>
  getCategories(): Promise<ToolCategoryRow[]>

  // Health monitoring
  checkToolHealth(toolId: string): Promise<ToolHealth>
  updateHealthStatus(toolId: string, health: ToolHealth): Promise<void>
}

export interface IToolDiscoveryService {
  searchTools(query: ToolSearchQuery): Promise<ToolSearchResult>
  getSimilarTools(toolId: string, limit?: number): Promise<EnrichedTool[]>
  getPopularTools(workspaceId?: string, limit?: number): Promise<EnrichedTool[]>
  getRecommendedTools(context: RecommendationContext, limit?: number): Promise<EnrichedTool[]>
  getToolsByCategory(categoryId: string): Promise<EnrichedTool[]>
  getToolsByTags(tags: string[]): Promise<EnrichedTool[]>
}

export interface IToolConfigurationService {
  createConfiguration(config: Omit<ToolConfiguration, 'id'>): Promise<ToolConfiguration>
  getConfiguration(configId: string): Promise<ToolConfiguration | null>
  updateConfiguration(
    configId: string,
    updates: Partial<ToolConfiguration>
  ): Promise<ToolConfiguration>
  deleteConfiguration(configId: string): Promise<void>
  listConfigurations(
    toolId: string,
    workspaceId?: string,
    userId?: string
  ): Promise<ToolConfiguration[]>
  validateConfiguration(
    toolId: string,
    config: Record<string, any>
  ): Promise<{ isValid: boolean; errors: string[] }>
}

export interface IToolAnalyticsService {
  recordUsage(usage: ToolUsageAnalyticsInsert): Promise<void>
  getToolAnalytics(toolId: string, timeRange?: { start: Date; end: Date }): Promise<ToolAnalytics>
  getWorkspaceAnalytics(
    workspaceId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<Record<string, ToolAnalytics>>
  getUserAnalytics(
    userId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<Record<string, ToolAnalytics>>
  getPopularityTrends(timeRange?: {
    start: Date
    end: Date
  }): Promise<Array<{ toolId: string; trend: number }>>
}

// Event system for tool registry
export interface ToolRegistryEvent {
  type: 'tool.registered' | 'tool.updated' | 'tool.unregistered' | 'tool.used' | 'health.changed'
  toolId: string
  userId?: string
  workspaceId?: string
  timestamp: Date
  data?: any
}

export interface IToolEventEmitter {
  emit(event: ToolRegistryEvent): void
  on(eventType: string, handler: (event: ToolRegistryEvent) => void): void
  off(eventType: string, handler: (event: ToolRegistryEvent) => void): void
}
