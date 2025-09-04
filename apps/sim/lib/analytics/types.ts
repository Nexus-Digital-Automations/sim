/**
 * Analytics Types - Community Marketplace Analytics Type Definitions
 *
 * Comprehensive type definitions for the community marketplace analytics
 * infrastructure covering user engagement, template usage, social interactions,
 * marketplace metrics, and recommendation analytics.
 *
 * @author Claude Code Analytics Team
 * @version 1.0.0
 * @created 2025-09-04
 */

// ============================================================================
// CORE ANALYTICS TYPES
// ============================================================================

/**
 * Base analytics event structure
 */
export interface AnalyticsEvent {
  id: string
  type:
    | 'user_engagement'
    | 'template_usage'
    | 'social_interaction'
    | 'marketplace'
    | 'recommendation'
  userId: string
  sessionId?: string
  timestamp: number
  data: Record<string, any>
  source: 'web_client' | 'mobile_app' | 'api' | 'webhook'
  category: string
  metadata?: Record<string, any>
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfiguration {
  batchSize: number
  flushIntervalMs: number
  metricsIntervalMs: number
  retentionDays: number
  enableRealTimeMetrics: boolean
  enableBatching: boolean
  enablePrivacyMode: boolean
  maxEventQueueSize: number
}

/**
 * Real-time tracking metrics
 */
export interface TrackingMetrics {
  activeUsers: number
  totalEvents: number
  queuedEvents: number
  batchedEvents: number
  batchCount: number
  uptime: number
  memoryUsage: NodeJS.MemoryUsage
  metricsSnapshot: {
    userEngagement: UserEngagementMetrics
    templateMetrics: TemplateMetrics
    socialMetrics: SocialMetrics
    marketplaceMetrics: MarketplaceMetrics
  }
}

// ============================================================================
// USER ENGAGEMENT ANALYTICS
// ============================================================================

/**
 * User engagement event data
 */
export interface UserEngagementEvent {
  userId: string
  sessionId: string
  action: 'page_view' | 'click' | 'scroll' | 'focus' | 'blur' | 'search' | 'navigation'
  page: string
  element?: string
  duration?: number
  context?: Record<string, any>
  userAgent?: string
  viewport?: { width: number; height: number }
  referrer?: string
  utmParams?: Record<string, string>
}

/**
 * User engagement metrics aggregation
 */
export interface UserEngagementMetrics {
  activeUsers: number
  sessionCount: number
  pageViews: number
  interactions: number
  averageSessionDuration?: number
  bounceRate?: number
  topPages?: Array<{ page: string; views: number }>
  topElements?: Array<{ element: string; clicks: number }>
}

/**
 * User behavior profile for personalization
 */
export interface UserBehaviorProfile {
  userId: string
  totalSessions: number
  totalPageViews: number
  averageSessionDuration: number
  preferredPages: string[]
  preferredFeatures: string[]
  engagementScore: number
  lastActivity: Date
  activityPatterns: {
    hourOfDay: Record<number, number>
    dayOfWeek: Record<number, number>
    monthlyTrend: Array<{ month: string; activity: number }>
  }
  deviceInfo: {
    deviceType: 'desktop' | 'mobile' | 'tablet'
    operatingSystem: string
    browser: string
    preferredViewport: { width: number; height: number }
  }
}

// ============================================================================
// TEMPLATE USAGE ANALYTICS
// ============================================================================

/**
 * Template usage event data
 */
export interface TemplateUsageEvent {
  userId: string
  sessionId: string
  templateId: string
  templateName: string
  templateCategory: string
  templateVersion?: string
  templateAuthor: string
  action: 'view' | 'download' | 'like' | 'share' | 'clone' | 'install' | 'rate'
  context?: Record<string, any>
  discoveryMethod?: 'search' | 'recommendation' | 'trending' | 'category' | 'creator_profile'
  searchQuery?: string
  referrer?: string
  rating?: number
}

/**
 * Template performance metrics
 */
export interface TemplateMetrics {
  totalViews: number
  totalDownloads: number
  totalLikes: number
  totalShares: number
  conversionRate?: number
  popularTemplates?: Array<{
    templateId: string
    templateName: string
    views: number
    downloads: number
    likes: number
    rating: number
  }>
  categoryPerformance?: Array<{
    category: string
    views: number
    downloads: number
    conversionRate: number
  }>
}

/**
 * Template discovery analytics
 */
export interface TemplateDiscoveryMetrics {
  searchQueries: Array<{
    query: string
    count: number
    avgResultsClicked: number
    conversionRate: number
  }>
  discoveryMethods: Record<string, number>
  categoryPopularity: Record<string, number>
  trendingPatterns: Array<{
    templateId: string
    velocityScore: number
    trendDirection: 'rising' | 'stable' | 'declining'
  }>
}

// ============================================================================
// SOCIAL INTERACTION ANALYTICS
// ============================================================================

/**
 * Social interaction event data
 */
export interface SocialInteractionEvent {
  userId: string
  sessionId: string
  action: 'follow' | 'unfollow' | 'like' | 'unlike' | 'comment' | 'share' | 'mention' | 'message'
  targetType: 'user' | 'template' | 'collection' | 'comment'
  targetId: string
  targetUserId?: string
  content?: string
  context?: Record<string, any>
  networkEffect?: number
  reciprocal?: boolean
  referrer?: string
}

/**
 * Social network metrics
 */
export interface SocialMetrics {
  follows: number
  comments: number
  likes: number
  shares: number
  networkGrowthRate?: number
  engagementRate?: number
  topInfluencers?: Array<{
    userId: string
    username: string
    followersCount: number
    engagementScore: number
    networkReach: number
  }>
  communityHealth?: {
    activeConnections: number
    reciprocalFollows: number
    averagePathLength: number
    clusteringCoefficient: number
  }
}

/**
 * Social network analysis
 */
export interface SocialNetworkAnalysis {
  networkSize: number
  connectionDensity: number
  averagePathLength: number
  clusteringCoefficient: number
  centralityMeasures: {
    degree: Record<string, number>
    betweenness: Record<string, number>
    closeness: Record<string, number>
    pagerank: Record<string, number>
  }
  communityDetection: {
    communities: Array<{
      id: string
      memberCount: number
      density: number
      topics: string[]
    }>
    modularityScore: number
  }
}

// ============================================================================
// MARKETPLACE ANALYTICS
// ============================================================================

/**
 * Marketplace event data
 */
export interface MarketplaceEvent {
  userId: string
  sessionId: string
  action: 'search' | 'filter' | 'browse_category' | 'view_creator' | 'purchase' | 'browse'
  category?: string
  query?: string
  filters?: Record<string, any>
  results?: any[]
  searchResultCount?: number
  filterCount?: number
  sortBy?: string
  viewType?: 'grid' | 'list' | 'card'
  context?: Record<string, any>
  referrer?: string
}

/**
 * Marketplace performance metrics
 */
export interface MarketplaceMetrics {
  totalSearches: number
  categoryViews: Record<string, number>
  creatorViews: Record<string, number>
  searchSuccessRate?: number
  averageResultsPerSearch?: number
  topSearchQueries?: Array<{
    query: string
    count: number
    successRate: number
  }>
  categoryPerformance?: Array<{
    category: string
    views: number
    searchVolume: number
    conversionRate: number
  }>
}

/**
 * Marketplace conversion funnel
 */
export interface MarketplaceConversionFunnel {
  stages: Array<{
    stage: 'visit' | 'search' | 'view' | 'engage' | 'convert'
    count: number
    conversionRate: number
    dropoffRate: number
  }>
  conversionPaths: Array<{
    path: string[]
    count: number
    averageTimeToConvert: number
    conversionRate: number
  }>
  abandonment: {
    searchAbandonment: number
    browseAbandonment: number
    cartAbandonment: number
  }
}

// ============================================================================
// RECOMMENDATION ANALYTICS
// ============================================================================

/**
 * Recommendation event data
 */
export interface RecommendationEvent {
  userId: string
  sessionId: string
  recommendationId: string
  algorithm: string
  templateIds: string[]
  context: 'homepage' | 'search' | 'template_view' | 'category' | 'profile'
  clickedTemplateId?: string
  clickPosition?: number
  timestamp: number
}

/**
 * Recommendation performance metrics
 */
export interface RecommendationMetrics {
  impressions: number
  clicks: number
  conversions: number
  clickThroughRate: number
  conversionRate: number
  algorithmPerformance: Record<
    string,
    {
      impressions: number
      clicks: number
      ctr: number
      conversionRate: number
    }
  >
  contextualPerformance: Record<
    string,
    {
      impressions: number
      clicks: number
      ctr: number
    }
  >
}

/**
 * A/B test configuration for recommendations
 */
export interface RecommendationABTest {
  testId: string
  testName: string
  variants: Array<{
    id: string
    name: string
    algorithm: string
    trafficAllocation: number
    config: Record<string, any>
  }>
  metrics: string[]
  startDate: Date
  endDate: Date
  status: 'running' | 'completed' | 'paused'
}

// ============================================================================
// COMMUNITY HEALTH ANALYTICS
// ============================================================================

/**
 * Community health metrics
 */
export interface CommunityHealthMetrics {
  totalUsers: number
  activeUsers: {
    daily: number
    weekly: number
    monthly: number
  }
  retentionRates: {
    day1: number
    day7: number
    day30: number
    day90: number
  }
  contentMetrics: {
    totalTemplates: number
    templatesCreatedToday: number
    averageQualityScore: number
    flaggedContentRate: number
  }
  engagementMetrics: {
    averageSessionsPerUser: number
    averageTimePerSession: number
    socialInteractionsPerUser: number
    contentCreationRate: number
  }
  networkHealthScore: number
  toxicityScore: number
  diversityIndex: number
}

/**
 * Content moderation metrics
 */
export interface ModerationMetrics {
  totalReports: number
  resolvedReports: number
  averageResolutionTime: number
  reportCategories: Record<string, number>
  moderationActions: Record<string, number>
  falsePositiveRate: number
  communityModerationScore: number
  autoModerationAccuracy: number
}

// ============================================================================
// CREATOR ECONOMY ANALYTICS
// ============================================================================

/**
 * Creator performance metrics
 */
export interface CreatorMetrics {
  creatorId: string
  username: string
  totalTemplates: number
  totalDownloads: number
  averageRating: number
  totalRevenue: number
  followerCount: number
  engagementRate: number
  performanceMetrics: {
    viewsPerTemplate: number
    downloadsPerTemplate: number
    conversionRate: number
    retentionRate: number
  }
  growthMetrics: {
    followersGrowthRate: number
    revenueGrowthRate: number
    templatesGrowthRate: number
  }
  qualityScore: number
}

/**
 * Revenue analytics
 */
export interface RevenueAnalytics {
  totalRevenue: number
  revenueByPeriod: Array<{
    period: string
    revenue: number
    transactionCount: number
  }>
  revenueByCategory: Record<string, number>
  revenueByCreator: Array<{
    creatorId: string
    revenue: number
    percentage: number
  }>
  averageTransactionValue: number
  conversionFunnel: {
    visitors: number
    browsers: number
    viewers: number
    purchasers: number
    conversionRate: number
  }
}

// ============================================================================
// ANALYTICS DASHBOARD TYPES
// ============================================================================

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'heatmap' | 'funnel'
  title: string
  description?: string
  size: 'small' | 'medium' | 'large'
  position: { x: number; y: number; w: number; h: number }
  config: {
    metrics: string[]
    timeRange: TimeRange
    filters?: Record<string, any>
    refreshInterval?: number
  }
  permissions: string[]
}

/**
 * Analytics dashboard configuration
 */
export interface AnalyticsDashboard {
  id: string
  name: string
  description?: string
  category:
    | 'overview'
    | 'user_engagement'
    | 'template_performance'
    | 'social_network'
    | 'marketplace'
    | 'creator'
  widgets: DashboardWidget[]
  layout: 'grid' | 'masonry' | 'tabs'
  permissions: {
    view: string[]
    edit: string[]
    share: string[]
  }
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

/**
 * Time range for analytics queries
 */
export interface TimeRange {
  start: string | Date
  end: string | Date
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
  timezone?: string
}

/**
 * Analytics query configuration
 */
export interface AnalyticsQuery {
  metrics: string[]
  dimensions?: string[]
  filters?: Array<{
    field: string
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex'
    value: any
  }>
  timeRange: TimeRange
  groupBy?: string[]
  orderBy?: Array<{
    field: string
    direction: 'asc' | 'desc'
  }>
  limit?: number
  offset?: number
}

/**
 * Analytics query result
 */
export interface AnalyticsQueryResult {
  data: Array<Record<string, any>>
  totalCount: number
  executionTime: number
  metadata: {
    query: AnalyticsQuery
    timestamp: Date
    dataRange: TimeRange
    samplingRate?: number
  }
}

// ============================================================================
// REAL-TIME ANALYTICS TYPES
// ============================================================================

/**
 * Real-time analytics stream configuration
 */
export interface RealTimeStreamConfig {
  streamId: string
  metrics: string[]
  filters?: Record<string, any>
  aggregationWindow: number // in seconds
  bufferSize: number
  updateInterval: number
}

/**
 * Real-time analytics update
 */
export interface RealTimeUpdate {
  streamId: string
  timestamp: Date
  data: Record<string, any>
  metadata?: Record<string, any>
}

/**
 * WebSocket subscription for real-time analytics
 */
export interface AnalyticsSubscription {
  subscriptionId: string
  userId: string
  streamConfig: RealTimeStreamConfig
  connectionId: string
  createdAt: Date
  lastUpdate: Date
}
