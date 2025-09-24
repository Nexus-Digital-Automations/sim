/**
 * Universal Tool Adapter System - Result Formatting Types
 *
 * Comprehensive type definitions for the sophisticated result formatting system
 * that enables natural language tool interactions and multi-modal output support.
 */

import type { ToolConfig, ToolResponse } from '@/tools/types'

/**
 * Supported result formats for conversational display
 */
export type ResultFormat =
  | 'text'
  | 'json'
  | 'table'
  | 'chart'
  | 'image'
  | 'file'
  | 'list'
  | 'card'
  | 'timeline'
  | 'map'
  | 'code'
  | 'markdown'

/**
 * Context information for result formatting
 */
export interface FormatContext {
  /** The tool that generated this result */
  toolId: string
  toolConfig: ToolConfig

  /** Conversation context */
  conversationId?: string
  userId?: string
  workspaceId?: string

  /** Display preferences */
  displayMode: 'compact' | 'detailed' | 'summary'
  targetAudience: 'technical' | 'business' | 'general'

  /** Locale and formatting preferences */
  locale?: string
  timezone?: string
  currency?: string

  /** Additional context */
  previousResults?: FormattedResult[]
  metadata?: Record<string, any>
}

/**
 * Formatted result with conversational presentation
 */
export interface FormattedResult {
  /** Original tool response */
  originalResult: ToolResponse

  /** Primary formatted content */
  format: ResultFormat
  content: FormattedContent

  /** Natural language summary */
  summary: {
    /** Brief one-line description */
    headline: string
    /** Detailed explanation */
    description: string
    /** Key insights or highlights */
    highlights: string[]
    /** Suggested follow-up actions */
    suggestions: string[]
  }

  /** Multi-modal representations */
  representations: Array<{
    format: ResultFormat
    content: FormattedContent
    label: string
    priority: number
  }>

  /** Metadata */
  metadata: {
    /** Formatting timestamp */
    formattedAt: string
    /** Processing time in ms */
    processingTime: number
    /** Format version */
    version: string
    /** Quality score (0-1) */
    qualityScore: number
  }

  /** Error information if formatting partially failed */
  errors?: Array<{
    type: string
    message: string
    field?: string
  }>
}

/**
 * Base interface for all formatted content types
 */
export interface BaseFormattedContent {
  type: ResultFormat
  title?: string
  description?: string
  metadata?: Record<string, any>
}

/**
 * Text-based formatted content
 */
export interface TextContent extends BaseFormattedContent {
  type: 'text'
  text: string
  format?: 'plain' | 'rich' | 'html'
  wordCount?: number
}

/**
 * JSON data with enhanced display
 */
export interface JsonContent extends BaseFormattedContent {
  type: 'json'
  data: any
  schema?: Record<string, any>
  displayHints?: {
    expandable: boolean
    maxDepth: number
    highlightFields: string[]
  }
}

/**
 * Tabular data representation
 */
export interface TableContent extends BaseFormattedContent {
  type: 'table'
  columns: Array<{
    key: string
    label: string
    type: 'string' | 'number' | 'boolean' | 'date' | 'url' | 'email'
    sortable?: boolean
    filterable?: boolean
    width?: number
  }>
  rows: Array<Record<string, any>>
  pagination?: {
    page: number
    pageSize: number
    totalRows: number
    totalPages: number
  }
  sorting?: {
    column: string
    direction: 'asc' | 'desc'
  }
  filters?: Array<{
    column: string
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt'
    value: any
  }>
}

/**
 * Chart/visualization data
 */
export interface ChartContent extends BaseFormattedContent {
  type: 'chart'
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'histogram' | 'heatmap' | 'treemap'
  data: Array<Record<string, any>>
  config: {
    xAxis?: string
    yAxis?: string | string[]
    groupBy?: string
    colors?: string[]
    legend?: boolean
    tooltips?: boolean
    responsive?: boolean
  }
  dimensions?: {
    width: number
    height: number
  }
}

/**
 * Image content with metadata
 */
export interface ImageContent extends BaseFormattedContent {
  type: 'image'
  url?: string
  base64?: string
  mimeType: string
  dimensions?: {
    width: number
    height: number
  }
  alt: string
  caption?: string
  thumbnailUrl?: string
}

/**
 * File attachment content
 */
export interface FileContent extends BaseFormattedContent {
  type: 'file'
  filename: string
  mimeType: string
  size: number
  url?: string
  downloadUrl?: string
  previewUrl?: string
  thumbnail?: ImageContent
  isDownloadable: boolean
}

/**
 * List-based content
 */
export interface ListContent extends BaseFormattedContent {
  type: 'list'
  items: Array<{
    id: string
    title: string
    description?: string
    metadata?: Record<string, any>
    actions?: Array<{
      label: string
      action: string
      parameters?: Record<string, any>
    }>
  }>
  listType: 'unordered' | 'ordered' | 'checklist'
  maxItems?: number
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
  }
}

/**
 * Card-based content for rich displays
 */
export interface CardContent extends BaseFormattedContent {
  type: 'card'
  cards: Array<{
    id: string
    title: string
    subtitle?: string
    description?: string
    image?: ImageContent
    fields: Array<{
      label: string
      value: string
      type?: 'text' | 'number' | 'date' | 'url' | 'email' | 'tag'
    }>
    actions?: Array<{
      label: string
      action: string
      parameters?: Record<string, any>
      style?: 'primary' | 'secondary' | 'danger'
    }>
  }>
  layout: 'grid' | 'list' | 'masonry'
  columns?: number
}

/**
 * Timeline content for temporal data
 */
export interface TimelineContent extends BaseFormattedContent {
  type: 'timeline'
  events: Array<{
    id: string
    date: string
    title: string
    description?: string
    category?: string
    icon?: string
    color?: string
    metadata?: Record<string, any>
  }>
  dateRange?: {
    start: string
    end: string
  }
  groupBy?: 'day' | 'week' | 'month' | 'year'
}

/**
 * Map-based content for geographical data
 */
export interface MapContent extends BaseFormattedContent {
  type: 'map'
  center?: {
    lat: number
    lng: number
  }
  zoom?: number
  markers: Array<{
    id: string
    lat: number
    lng: number
    title: string
    description?: string
    icon?: string
    color?: string
    popup?: FormattedContent
  }>
  regions?: Array<{
    id: string
    coordinates: Array<[number, number]>
    title: string
    description?: string
    color?: string
    opacity?: number
  }>
}

/**
 * Code content with syntax highlighting
 */
export interface CodeContent extends BaseFormattedContent {
  type: 'code'
  code: string
  language: string
  filename?: string
  lineNumbers?: boolean
  highlightLines?: number[]
  theme?: 'light' | 'dark' | 'auto'
}

/**
 * Markdown content
 */
export interface MarkdownContent extends BaseFormattedContent {
  type: 'markdown'
  markdown: string
  rendered?: string
  toc?: Array<{
    level: number
    title: string
    anchor: string
  }>
}

/**
 * Union type for all formatted content types
 */
export type FormattedContent =
  | TextContent
  | JsonContent
  | TableContent
  | ChartContent
  | ImageContent
  | FileContent
  | ListContent
  | CardContent
  | TimelineContent
  | MapContent
  | CodeContent
  | MarkdownContent

/**
 * Result formatter interface
 */
export interface ResultFormatter {
  /** Unique identifier for the formatter */
  id: string

  /** Human-readable name */
  name: string

  /** Description of what this formatter does */
  description: string

  /** Supported result formats */
  supportedFormats: ResultFormat[]

  /** Tool compatibility */
  toolCompatibility?: {
    /** Specific tools this formatter works best with */
    preferredTools?: string[]
    /** Tools this formatter should avoid */
    excludedTools?: string[]
    /** Tool output types this formatter handles */
    outputTypes?: string[]
  }

  /** Check if this formatter can handle the given result */
  canFormat(result: ToolResponse, context: FormatContext): boolean

  /** Format the result */
  format(result: ToolResponse, context: FormatContext): Promise<FormattedResult>

  /** Generate natural language summary */
  generateSummary(
    result: ToolResponse,
    context: FormatContext
  ): Promise<{
    headline: string
    description: string
    highlights: string[]
    suggestions: string[]
  }>

  /** Validate formatted result */
  validate?(formattedResult: FormattedResult): Array<{
    type: string
    message: string
    field?: string
  }>

  /** Priority for formatter selection (higher = higher priority) */
  priority: number
}

/**
 * Result processor for validation and enhancement
 */
export interface ResultProcessor {
  /** Unique identifier */
  id: string

  /** Human-readable name */
  name: string

  /** Process and enhance the formatted result */
  process(result: FormattedResult, context: FormatContext): Promise<FormattedResult>

  /** Validation function */
  validate?(result: FormattedResult): boolean

  /** Processing priority */
  priority: number
}

/**
 * Result cache entry
 */
export interface ResultCacheEntry {
  /** Cache key */
  key: string

  /** Cached result */
  result: FormattedResult

  /** Cache metadata */
  metadata: {
    createdAt: string
    expiresAt?: string
    accessCount: number
    lastAccessed: string
    tags: string[]
  }
}

/**
 * Result analytics data
 */
export interface ResultAnalytics {
  /** Tool usage statistics */
  toolUsage: Record<
    string,
    {
      count: number
      avgProcessingTime: number
      errorRate: number
      popularFormats: Record<ResultFormat, number>
    }
  >

  /** Format popularity */
  formatUsage: Record<
    ResultFormat,
    {
      count: number
      avgQualityScore: number
      userSatisfaction: number
    }
  >

  /** Performance metrics */
  performance: {
    avgFormattingTime: number
    cacheHitRate: number
    errorRate: number
  }

  /** User interaction patterns */
  userBehavior: {
    preferredFormats: ResultFormat[]
    commonFollowUpActions: string[]
    sessionDuration: number
  }
}

/**
 * Configuration for the result formatting system
 */
export interface ResultFormattingConfig {
  /** Global formatting preferences */
  defaultFormat: ResultFormat
  defaultDisplayMode: 'compact' | 'detailed' | 'summary'

  /** Cache configuration */
  cache: {
    enabled: boolean
    ttl: number // Time to live in seconds
    maxEntries: number
    compressionEnabled: boolean
  }

  /** Performance configuration */
  performance: {
    maxProcessingTime: number // Max time in ms
    concurrentFormatters: number
    retryAttempts: number
  }

  /** Quality thresholds */
  quality: {
    minQualityScore: number
    enableQualityValidation: boolean
    fallbackOnLowQuality: boolean
  }

  /** Analytics configuration */
  analytics: {
    enabled: boolean
    trackUserInteractions: boolean
    retentionPeriod: number // Days to keep analytics data
  }

  /** Feature flags */
  features: {
    aiSummaries: boolean
    smartFormatDetection: boolean
    adaptiveDisplayMode: boolean
    realtimeUpdates: boolean
  }
}
