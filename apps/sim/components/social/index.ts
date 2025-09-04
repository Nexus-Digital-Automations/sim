/**
 * Social Components - Comprehensive Social Features Suite
 *
 * Export all social components for the community marketplace:
 * - ActivityFeed: Real-time social activity stream
 * - UserProfile: Comprehensive user profile with social stats
 * - FollowingManagement: Following/followers management system
 * - SocialInteractions: Like, comment, share, bookmark functionality
 * - SocialFeaturesPlatform: Complete social platform integration (existing)
 *
 * Usage:
 * ```tsx
 * import {
 *   ActivityFeed,
 *   UserProfile,
 *   FollowingManagement,
 *   SocialInteractions,
 *   SocialFeaturesPlatform,
 * } from '@/components/social'
 * ```
 *
 * @author Claude Code Social Platform
 * @version 1.0.0
 */

export { ActivityFeed, type ActivityFeedProps, type ActivityItem, type User } from './activity-feed'
export {
  UserProfile,
  type UserProfileProps,
  type UserProfileData,
  type Badge,
  type Achievement,
  type ActivitySummary,
  type TemplateSummary,
  type CollectionSummary,
} from './user-profile'
export {
  FollowingManagement,
  type FollowingManagementProps,
  type FollowUser,
  type FollowingStats,
} from './following-management'
export {
  SocialInteractions,
  type SocialInteractionsProps,
  type EngagementMetrics,
  type Comment,
  type ShareOptions,
} from './social-interactions'

// Re-export existing social features platform
export { SocialFeaturesPlatform, type SocialFeaturesPlatformProps } from './social-features'