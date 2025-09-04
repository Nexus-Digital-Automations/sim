/**
 * Template Library Types - Comprehensive Type Definitions
 *
 * This file defines all TypeScript interfaces, types, and enums for the
 * comprehensive template library and community marketplace system.
 *
 * Type Categories:
 * - Core Template Types: Basic template structure and metadata
 * - Search & Discovery: Query interfaces and result types
 * - Community Features: Rating, review, and social interaction types
 * - Template Management: Creation, validation, and lifecycle types
 * - Analytics & Reporting: Usage metrics and performance tracking
 * - Enterprise Features: Governance, approval, and organization types
 *
 * @author Claude Code Template System
 * @version 2.0.0
 */

// ========================
// CORE TEMPLATE TYPES
// ========================

/**
 * Template visibility levels for access control and marketplace publishing
 */
export type TemplateVisibility = 'public' | 'organization' | 'private' | 'unlisted'

/**
 * Template difficulty levels for user guidance and filtering
 */
export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'

/**
 * Template complexity levels based on workflow structure analysis
 */
export type TemplateComplexity = 'simple' | 'moderate' | 'complex' | 'enterprise'

/**
 * Template status in the publication and review process
 */
export type TemplateStatus =
  | 'draft' // Being created or edited
  | 'pending_review' // Submitted for moderation
  | 'approved' // Ready for publication
  | 'published' // Live in marketplace
  | 'archived' // Deprecated or removed
  | 'rejected' // Failed moderation review

/**
 * Template category system for organization and discovery
 */
export interface TemplateCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  parentId?: string
  subcategories?: TemplateCategory[]
  templateCount: number
  popularTags: string[]
}

/**
 * Comprehensive template metadata structure
 */
export interface TemplateMetadata {
  // Basic Information
  name: string
  description?: string
  author: string
  category: string

  // Visual Branding
  icon: string
  color: string
  thumbnail?: string

  // Classification and Discovery
  tags: string[]
  difficulty: TemplateDifficulty
  complexity?: TemplateComplexity
  version: string

  // Usage Information
  estimatedTime?: string
  estimatedExecutionTime?: string
  requirements: string[]
  useCases: string[]
  blockTypes?: string[]

  // Publishing and Visibility
  visibility: TemplateVisibility
  status: TemplateStatus
  isPublic: boolean
  allowComments: boolean

  // Auto-generated Tags and Metadata
  autoTags?: string[]
  qualityScore?: number

  // Timestamps
  createdAt?: Date
  updatedAt?: Date
  publishedAt?: Date
}

/**
 * Complete template structure with all associated data
 */
export interface Template {
  // Database fields
  id: string
  workflowId?: string
  userId: string
  name: string
  description?: string
  author: string
  views: number
  stars: number
  color: string
  icon: string
  category: string
  state: any // Workflow state with sanitized credentials
  createdAt: Date
  updatedAt: Date

  // Enhanced metadata
  metadata?: TemplateMetadata
  qualityScore?: number

  // User-specific data
  isStarred?: boolean
  isOwner?: boolean
  canEdit?: boolean

  // Community data
  ratingAverage?: number
  ratingCount?: number
  downloadCount?: number
  forkCount?: number

  // Analytics data
  recentViews?: number
  trending?: boolean
  featured?: boolean
}

// ========================
// SEARCH & DISCOVERY TYPES
// ========================

/**
 * Advanced search filters for template discovery
 */
export interface TemplateSearchFilters {
  // Basic filters
  categories?: string[]
  tags?: string[]
  difficulty?: TemplateDifficulty[]

  // Rating and popularity filters
  minStars?: number
  maxStars?: number
  minViews?: number
  minRating?: number

  // Content filters
  hasDescription?: boolean
  hasThumbnail?: boolean

  // Date range filters
  createdAfter?: Date
  createdBefore?: Date
  updatedAfter?: Date
  updatedBefore?: Date

  // User filters
  authorId?: string
  organizationId?: string
  excludeAuthors?: string[]

  // Technical filters
  blockTypes?: string[]
  complexity?: TemplateComplexity[]
  estimatedTimeMin?: number
  estimatedTimeMax?: number
}

/**
 * Template search query with comprehensive options
 */
export interface TemplateSearchQuery {
  // Search parameters
  search?: string
  category?: string
  filters?: TemplateSearchFilters

  // Sorting and ordering
  sortBy?:
    | 'name'
    | 'createdAt'
    | 'updatedAt'
    | 'views'
    | 'stars'
    | 'rating'
    | 'relevance'
    | 'trending'
  sortOrder?: 'asc' | 'desc'

  // Pagination
  page?: number
  limit?: number

  // User context
  userId?: string
  organizationId?: string

  // Result options
  includeState?: boolean
  includeMetadata?: boolean
  includeAnalytics?: boolean
  includeUserData?: boolean

  // Special filters
  starredOnly?: boolean
  ownedOnly?: boolean
  featuredOnly?: boolean
  trendingOnly?: boolean
}

/**
 * Paginated search results with metadata
 */
export interface TemplateSearchResults {
  data: Template[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  facets?: {
    categories: { name: string; count: number }[]
    tags: { name: string; count: number }[]
    authors: { name: string; count: number }[]
    difficulty: { level: TemplateDifficulty; count: number }[]
  }
  analytics?: TemplateSearchAnalytics
  meta: {
    requestId: string
    processingTime: number
    searchQuery: TemplateSearchQuery
  }
}

/**
 * Search analytics and insights
 */
export interface TemplateSearchAnalytics {
  searchTime: number
  resultCount: number
  popularTemplates: Template[]
  relatedSearches: string[]
  categoryDistribution: Record<string, number>
  trendingTags: string[]
  recommendedTemplates: Template[]
}

// ========================
// COMMUNITY & SOCIAL TYPES
// ========================

/**
 * Template rating and review system
 */
export interface TemplateRating {
  id: string
  templateId: string
  userId: string
  rating: number // 1-5 stars
  review?: string
  helpful: number // Helpful votes
  reported: boolean
  createdAt: Date
  updatedAt: Date

  // User information
  userDisplayName?: string
  userAvatar?: string
  isVerifiedUser?: boolean
}

/**
 * Template comment system for community discussion
 */
export interface TemplateComment {
  id: string
  templateId: string
  userId: string
  parentId?: string // For threaded discussions
  content: string
  upvotes: number
  downvotes: number
  isEdited: boolean
  isModerator: boolean
  createdAt: Date
  updatedAt: Date

  // User information
  userDisplayName: string
  userAvatar?: string

  // Moderation
  isHidden: boolean
  reportCount: number

  // Thread information
  replies?: TemplateComment[]
  replyCount: number
}

/**
 * Template collection system for user organization
 */
export interface TemplateCollection {
  id: string
  userId: string
  name: string
  description?: string
  icon?: string
  color?: string
  isPublic: boolean
  templateIds: string[]
  templateCount: number
  views: number
  stars: number
  createdAt: Date
  updatedAt: Date

  // Collection metadata
  tags: string[]
  category?: string

  // Templates (when populated)
  templates?: Template[]
}

/**
 * User profile data for community features
 */
export interface TemplateUserProfile {
  userId: string
  displayName: string
  bio?: string
  avatar?: string
  website?: string
  location?: string

  // Community statistics
  templatesCreated: number
  templatesShared: number
  totalViews: number
  totalStars: number
  contributionScore: number

  // Activity data
  joinedAt: Date
  lastActive: Date
  isActive: boolean
  isVerified: boolean
  isModerator: boolean

  // Social features
  followers: number
  following: number
  collections: TemplateCollection[]
  recentTemplates: Template[]
}

// ========================
// TEMPLATE MANAGEMENT TYPES
// ========================

/**
 * Template creation options and configuration
 */
export interface TemplateCreationOptions {
  userId: string
  workspaceId?: string
  organizationId?: string

  // Processing options
  sanitizeCredentials?: boolean
  validateQuality?: boolean
  generateThumbnail?: boolean
  autoPublish?: boolean

  // Publication options
  visibility?: TemplateVisibility
  requireApproval?: boolean
  moderationLevel?: 'basic' | 'strict' | 'enterprise'
}

/**
 * Template customization for instantiation
 */
export interface TemplateCustomization {
  // Basic customization
  workflowName?: string
  description?: string

  // Variable substitutions
  variables?: Record<string, any>

  // Block-level overrides
  blockOverrides?: Record<string, any>

  // Credential mappings
  credentialMappings?: Record<string, string>

  // Configuration overrides
  configOverrides?: {
    environment?: Record<string, string>
    settings?: Record<string, any>
    permissions?: Record<string, string[]>
  }
}

/**
 * Template instantiation options
 */
export interface TemplateInstantiationOptions {
  userId: string
  workspaceId: string
  organizationId?: string

  // Instantiation behavior
  validateDependencies?: boolean
  resolveCredentials?: boolean
  runPostInstallation?: boolean

  // Naming and organization
  folderPath?: string
  tags?: string[]

  // Tracking options
  trackUsage?: boolean
  analyticsContext?: Record<string, any>
}

/**
 * Template validation result with detailed feedback
 */
export interface TemplateValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]

  // Validation scores
  qualityScore: number
  securityScore: number
  completenessScore: number

  // Detailed checks
  checks: {
    syntax: boolean
    security: boolean
    performance: boolean
    accessibility: boolean
    compliance: boolean
    quality: boolean
  }

  // Recommendations
  recommendations: {
    priority: 'low' | 'medium' | 'high' | 'critical'
    category: string
    message: string
    fixSuggestion?: string
  }[]
}

/**
 * Template version information for change tracking
 */
export interface TemplateVersionInfo {
  templateId: string
  version: string
  previousVersion?: string

  // Version metadata
  versionName?: string
  description?: string
  changelog: string[]

  // Change tracking
  changedBlocks: string[]
  addedBlocks: string[]
  removedBlocks: string[]

  // Publication information
  publishedBy: string
  publishedAt: Date
  isActive: boolean
  isBeta: boolean

  // Compatibility
  compatibilityNotes?: string[]
  migrationRequired: boolean
  migrationGuide?: string
}

// ========================
// ANALYTICS & METRICS TYPES
// ========================

/**
 * Template usage analytics and metrics
 */
export interface TemplateUsageAnalytics {
  templateId: string
  period: 'day' | 'week' | 'month' | 'year' | 'all'

  // Usage metrics
  views: number
  downloads: number
  instantiations: number
  forks: number

  // Engagement metrics
  stars: number
  comments: number
  ratings: number
  averageRating: number

  // Performance metrics
  successRate: number
  averageExecutionTime: number
  errorRate: number

  // User analytics
  uniqueUsers: number
  returningUsers: number
  newUsers: number

  // Geographic and temporal data
  topCountries: { country: string; count: number }[]
  dailyActivity: { date: string; count: number }[]
  peakUsageTimes: { hour: number; count: number }[]

  // Conversion metrics
  instantiationRate: number // views to instantiations
  retentionRate: number
  shareRate: number
}

/**
 * Template marketplace analytics
 */
export interface TemplateMarketplaceAnalytics {
  // Overall marketplace statistics
  totalTemplates: number
  activeTemplates: number
  totalUsers: number
  activeUsers: number

  // Category distribution
  categoryStats: {
    category: string
    templateCount: number
    activeCount: number
    averageRating: number
    totalViews: number
  }[]

  // Trending data
  trendingTemplates: Template[]
  trendingCategories: string[]
  trendingTags: string[]

  // Quality metrics
  averageQualityScore: number
  averageRating: number
  moderationQueue: number

  // Community metrics
  totalRatings: number
  totalComments: number
  activeContributors: number

  // Growth metrics
  newTemplatesThisMonth: number
  newUsersThisMonth: number
  monthlyGrowthRate: number
}

// ========================
// ENTERPRISE FEATURES TYPES
// ========================

/**
 * Template governance configuration for organizations
 */
export interface TemplateGovernance {
  organizationId: string

  // Approval workflows
  requiresApproval: boolean
  approvalWorkflow: {
    stages: {
      name: string
      approvers: string[]
      requiredApprovals: number
      autoApprove?: boolean
    }[]
  }

  // Quality gates
  qualityGates: {
    minimumQualityScore: number
    requiredTags: string[]
    prohibitedContent: string[]
    securityScanRequired: boolean
  }

  // Visibility controls
  defaultVisibility: TemplateVisibility
  allowedVisibilityLevels: TemplateVisibility[]

  // Category restrictions
  allowedCategories: string[]
  restrictedCategories: string[]

  // Publishing controls
  autoPublishEnabled: boolean
  moderationLevel: 'basic' | 'strict' | 'enterprise'

  // Compliance requirements
  complianceChecks: string[]
  auditingEnabled: boolean
  retentionPolicy: {
    archiveAfterDays?: number
    deleteAfterDays?: number
  }
}

/**
 * Template repository for private/organization templates
 */
export interface TemplateRepository {
  id: string
  organizationId: string
  name: string
  description?: string

  // Repository settings
  visibility: 'public' | 'internal' | 'private'
  accessLevel: 'read' | 'write' | 'admin'

  // Content organization
  categories: TemplateCategory[]
  tags: string[]
  templateCount: number

  // Access control
  permissions: {
    userId: string
    role: 'viewer' | 'contributor' | 'maintainer' | 'admin'
    permissions: string[]
  }[]

  // Repository metadata
  createdBy: string
  createdAt: Date
  updatedAt: Date
  lastActivityAt: Date

  // Analytics
  totalViews: number
  totalDownloads: number
  activeContributors: number
}

// ========================
// API RESPONSE TYPES
// ========================

/**
 * Standard API response wrapper for template operations
 */
export interface TemplateApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta: {
    requestId: string
    timestamp: Date
    processingTime: number
    version: string
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Template operation result for create/update operations
 */
export interface TemplateOperationResult {
  id: string
  name: string
  category: string
  author: string
  qualityScore?: number
  warnings: string[]
  recommendations: string[]
  processingTime: number
}

// ========================
// EVENT & WEBHOOK TYPES
// ========================

/**
 * Template system events for real-time updates and webhooks
 */
export interface TemplateEvent {
  id: string
  type:
    | 'template.created'
    | 'template.updated'
    | 'template.published'
    | 'template.starred'
    | 'template.instantiated'
  templateId: string
  userId: string
  organizationId?: string

  // Event data
  data: Record<string, any>

  // Event metadata
  timestamp: Date
  version: string
  source: string

  // Delivery information
  deliveryAttempts: number
  lastDelivery?: Date
  nextDelivery?: Date
}

// ========================
// CONFIGURATION TYPES
// ========================

/**
 * Template system configuration
 */
export interface TemplateSystemConfig {
  // Feature flags
  features: {
    communityTemplates: boolean
    privateRepositories: boolean
    templateVersioning: boolean
    advancedAnalytics: boolean
    enterpriseGovernance: boolean
  }

  // Limits and quotas
  limits: {
    maxTemplatesPerUser: number
    maxTemplateSize: number
    maxCategoriesPerTemplate: number
    maxTagsPerTemplate: number
    maxCollectionsPerUser: number
  }

  // Quality and validation
  validation: {
    enableQualityScoring: boolean
    minimumQualityScore: number
    enableSecurityScanning: boolean
    enableComplianceChecks: boolean
  }

  // Community features
  community: {
    enableRatings: boolean
    enableComments: boolean
    enableCollections: boolean
    enableFollowing: boolean
    moderationEnabled: boolean
  }

  // Analytics and tracking
  analytics: {
    enableUsageTracking: boolean
    enablePerformanceMetrics: boolean
    enableUserBehaviorTracking: boolean
    retentionPeriodDays: number
  }
}

// ========================
// UTILITY TYPES
// ========================

/**
 * Template search suggestions for auto-completion
 */
export interface TemplateSearchSuggestion {
  type: 'template' | 'category' | 'tag' | 'author'
  value: string
  label: string
  count: number
  icon?: string
}

/**
 * Template recommendation based on user behavior
 */
export interface TemplateRecommendation {
  template: Template
  score: number
  reason:
    | 'similar_to_used'
    | 'trending'
    | 'highly_rated'
    | 'same_category'
    | 'collaborative_filtering'
  confidence: number
}

/**
 * Template diff for version comparison
 */
export interface TemplateDiff {
  templateId: string
  fromVersion: string
  toVersion: string

  changes: {
    type: 'added' | 'removed' | 'modified'
    path: string
    oldValue?: any
    newValue?: any
    description: string
  }[]

  summary: {
    blocksAdded: number
    blocksRemoved: number
    blocksModified: number
    breaking: boolean
  }
}

// ========================
// TEMPLATE TAGS INTERFACE
// ========================

/**
 * Template tag interface with enhanced database schema alignment
 * Includes new properties for active status and featured designation
 */
export interface TemplateTag {
  id: string
  name: string
  description?: string
  /** Active status for tag visibility control */
  isActive: boolean
  /** Featured status for prominent display in marketplace */
  isFeatured: boolean
  /** Usage frequency counter for popularity tracking */
  usageCount: number
  color?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Enhanced user reputation interface aligned with database schema
 * Integrates with community reputation system
 */
export interface UserReputation {
  id: string
  userId: string
  totalPoints: number
  /** Reputation level enum: novice, contributor, expert, mentor */
  reputationLevel: 'novice' | 'contributor' | 'expert' | 'mentor'
  levelProgress: number
  weeklyPoints: number
  monthlyPoints: number
  averageTemplateRating?: number
  helpfulReviewPercentage?: number
  consistencyScore?: number
  lastCalculationAt: Date
  createdAt: Date
  updatedAt: Date
}

// ========================
// ALL TYPES EXPORTED ABOVE
// ========================

/**
 * Template Library Types - Complete Export Summary
 *
 * This module provides comprehensive TypeScript type definitions for:
 * - Core template structures and metadata
 * - Search and discovery interfaces
 * - Community features (ratings, comments, collections)
 * - Template management and validation
 * - Analytics and performance tracking
 * - Enterprise governance features
 * - API response wrappers and event types
 * - Enhanced database schema integration
 *
 * All types are directly exported from their definitions above.
 * Import any type directly: import { Template, TemplateTag, UserReputation } from './types'
 */
