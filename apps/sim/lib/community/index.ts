/**
 * Community User Management System - Main Export Module
 * 
 * Central export module for all community user management components including:
 * - Reputation system and calculations
 * - Badge definitions and award logic
 * - User profile management utilities
 * - Social features and relationship management
 * - Anti-gaming protection and monitoring
 * 
 * FEATURES:
 * - Complete reputation system with anti-gaming
 * - Comprehensive badge and achievement system
 * - Privacy-aware user profile management
 * - Social following and activity tracking
 * - GDPR compliant data handling
 * - Production-ready error handling and logging
 * 
 * USAGE:
 * ```typescript
 * import { CommunityReputationSystem, REPUTATION_LEVELS } from '@/lib/community'
 * 
 * const reputationSystem = CommunityReputationSystem.getInstance()
 * const userReputation = await reputationSystem.getUserReputationSummary(userId)
 * ```
 * 
 * @created 2025-09-04
 * @author Community User Management System
 */

// Export core reputation system
export { 
  CommunityReputationSystem,
  REPUTATION_POINT_VALUES,
  REPUTATION_LEVELS
} from './reputation-system'

// Export utility types and interfaces
export interface CommunityUser {
  id: string
  name: string
  displayName?: string
  image?: string
  bio?: string
  title?: string
  company?: string
  location?: string
  specializations: string[]
  skills: string[]
  industries: string[]
  isVerified: boolean
  trustScore: number
  joinedAt: string
  lastActiveAt?: string
}

export interface ReputationSummary {
  userId: string
  totalPoints: number
  level: number
  levelName: string
  levelProgress: number
  benefits: string[]
  nextLevelPoints?: number
  breakdown: {
    templatePoints: number
    ratingPoints: number
    communityPoints: number
    qualityBonus: number
    penalties: number
  }
  qualityMetrics: {
    averageTemplateRating: number
    helpfulReviewPercentage: number
    consistencyScore: number
  }
  lastCalculated: string
  isVerified: boolean
}

export interface CommunityBadge {
  id: string
  name: string
  description: string
  icon: string
  color: string
  backgroundColor: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'special'
  category: string
  earnedAt: string
  isFeatured: boolean
  level: number
}

export interface SocialStats {
  followerCount: number
  followingCount: number
  isFollowing?: boolean
  isMutual?: boolean
}

export interface UserActivity {
  id: string
  type: string
  title: string
  description: string
  targetType?: string
  targetId?: string
  createdAt: string
  metadata?: any
}

// Export validation schemas for API usage
export const CommunityUserSearchSchema = {
  query: 'string',
  specialization: 'string',
  skill: 'string', 
  industry: 'string',
  location: 'string',
  minReputation: 'number',
  maxReputation: 'number',
  verified: 'boolean',
  sortBy: ['reputation', 'activity', 'templates', 'joined'],
  sortOrder: ['asc', 'desc'],
  limit: 'number',
  offset: 'number'
} as const

// Export utility functions
export class CommunityUtils {
  /**
   * Format reputation points for display
   */
  static formatReputationPoints(points: number): string {
    if (points >= 1000000) {
      return `${(points / 1000000).toFixed(1)}M`
    }
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}K`
    }
    return points.toString()
  }

  /**
   * Get level name from level number
   */
  static getLevelName(level: number): string {
    const levelInfo = REPUTATION_LEVELS.find(l => l.level === level)
    return levelInfo?.name || 'Unknown'
  }

  /**
   * Get badge tier color for UI display
   */
  static getBadgeTierColor(tier: string): string {
    const colors = {
      bronze: 'from-amber-600 to-amber-800',
      silver: 'from-gray-400 to-gray-600', 
      gold: 'from-yellow-400 to-yellow-600',
      platinum: 'from-purple-400 to-purple-600',
      special: 'from-pink-400 to-purple-600'
    }
    return colors[tier as keyof typeof colors] || colors.bronze
  }

  /**
   * Calculate time since date for activity display
   */
  static getTimeAgo(date: string | Date): string {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))
    
    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return `${diffMonths}mo ago`
  }

  /**
   * Validate community profile data
   */
  static validateProfileData(data: any): { isValid: boolean, errors: string[] } {
    const errors: string[] = []

    if (data.displayName && (data.displayName.length > 50 || data.displayName.length < 1)) {
      errors.push('Display name must be 1-50 characters')
    }

    if (data.bio && data.bio.length > 500) {
      errors.push('Bio must be less than 500 characters')
    }

    if (data.title && data.title.length > 100) {
      errors.push('Title must be less than 100 characters')
    }

    if (data.company && data.company.length > 100) {
      errors.push('Company must be less than 100 characters')
    }

    if (data.location && data.location.length > 100) {
      errors.push('Location must be less than 100 characters')
    }

    if (data.specializations && data.specializations.length > 10) {
      errors.push('Maximum 10 specializations allowed')
    }

    if (data.skills && data.skills.length > 20) {
      errors.push('Maximum 20 skills allowed')
    }

    if (data.industries && data.industries.length > 10) {
      errors.push('Maximum 10 industries allowed')
    }

    if (data.websiteUrl && data.websiteUrl.length > 0) {
      try {
        new URL(data.websiteUrl)
      } catch {
        errors.push('Website URL is not valid')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Sanitize user input for safety
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>?/gm, '') // Remove HTML tags
      .substring(0, 1000) // Limit length
  }

  /**
   * Check if user has permission to view profile
   */
  static canViewProfile(
    targetUserId: string, 
    viewerUserId: string | null, 
    profileVisibility: 'public' | 'community' | 'private'
  ): boolean {
    if (targetUserId === viewerUserId) return true // Own profile
    
    switch (profileVisibility) {
      case 'public':
        return true
      case 'community':
        return viewerUserId !== null // Logged in community members only
      case 'private':
        return false
      default:
        return false
    }
  }

  /**
   * Generate user avatar URL with fallback
   */
  static getUserAvatarUrl(user: { image?: string, name: string }, size: number = 40): string {
    if (user.image) return user.image
    
    // Generate a deterministic avatar based on user name
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
    const colorIndex = user.name.charCodeAt(0) % colors.length
    const backgroundColor = colors[colorIndex]
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=${backgroundColor.slice(1)}&color=fff&format=png`
  }

  /**
   * Format social stats for display
   */
  static formatSocialCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }
}