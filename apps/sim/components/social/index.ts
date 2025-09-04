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
  FollowingManagement,
  type FollowingManagementProps,
  type FollowingStats,
  type FollowUser,
} from './following-management'
// Re-export existing social features platform
export { SocialFeaturesPlatform, type SocialFeaturesPlatformProps } from './social-features'
export {
  type Comment,
  type EngagementMetrics,
  type ShareOptions,
  SocialInteractions,
  type SocialInteractionsProps,
} from './social-interactions'
export {
  type Achievement,
  type ActivitySummary,
  type Badge,
  type CollectionSummary,
  type TemplateSummary,
  UserProfile,
  type UserProfileData,
  type UserProfileProps,
} from './user-profile'
