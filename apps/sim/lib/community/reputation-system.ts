import { sql } from 'drizzle-orm'
import { db } from '../../db'

// ========================
// TYPE DEFINITIONS
// ========================

/**
 * Reputation point sources and their base values
 */
export const REPUTATION_POINT_VALUES = {
  // Template contributions
  TEMPLATE_CREATED: 50,
  TEMPLATE_FEATURED: 100,
  TEMPLATE_DOWNLOAD: 2,
  TEMPLATE_FAVORITED: 5,

  // Rating and reviews
  FIVE_STAR_RATING_RECEIVED: 25,
  FOUR_STAR_RATING_RECEIVED: 15,
  THREE_STAR_RATING_RECEIVED: 5,
  RATING_GIVEN: 1,

  // Community engagement
  HELPFUL_REVIEW_WRITTEN: 10,
  REVIEW_MARKED_HELPFUL: 5,
  ANSWER_ACCEPTED: 15,
  QUESTION_ANSWERED: 3,

  // Social contributions
  USER_FOLLOWED: 1,
  TEMPLATE_SHARED: 2,
  COMMUNITY_CONTRIBUTION: 10,
  MENTORSHIP_ACTIVITY: 20,

  // Quality bonuses
  CONSISTENCY_BONUS: 50,
  QUALITY_STREAK_BONUS: 30,
  VERIFIED_USER_BONUS: 100,

  // Penalties
  VIOLATION_PENALTY: -20,
  SPAM_PENALTY: -50,
  QUALITY_ISSUE_PENALTY: -10,

  // Decay
  MONTHLY_DECAY_RATE: 0.02, // 2% per month for inactive users
} as const

/**
 * Reputation levels with thresholds and benefits
 */
export const REPUTATION_LEVELS = [
  { level: 1, minPoints: 0, name: 'Newcomer', benefits: ['Create templates', 'Write reviews'] },
  { level: 2, minPoints: 100, name: 'Contributor', benefits: ['Feature requests', 'Beta access'] },
  { level: 3, minPoints: 250, name: 'Active Member', benefits: ['Verified badge eligibility'] },
  {
    level: 4,
    minPoints: 500,
    name: 'Trusted User',
    benefits: ['Moderate reviews', 'Priority support'],
  },
  {
    level: 5,
    minPoints: 1000,
    name: 'Expert',
    benefits: ['Featured content', 'Community leadership'],
  },
  {
    level: 6,
    minPoints: 2500,
    name: 'Master',
    benefits: ['Template verification', 'Mentor program'],
  },
  {
    level: 7,
    minPoints: 5000,
    name: 'Legend',
    benefits: ['Platform advisory', 'Special recognition'],
  },
  {
    level: 8,
    minPoints: 10000,
    name: 'Hall of Fame',
    benefits: ['Platform governance', 'Legacy status'],
  },
] as const

/**
 * Badge award criteria
 */
interface BadgeAwardCriteria {
  templateCount?: number
  averageRating?: number
  reputationPoints?: number
  helpfulReviews?: number
  communityContributions?: number
  customCheck?: (userId: string) => Promise<boolean>
}

/**
 * Reputation calculation result
 */
interface ReputationCalculation {
  userId: string
  previousPoints: number
  newPoints: number
  pointsChange: number
  previousLevel: number
  newLevel: number
  levelChanged: boolean
  badgesAwarded: string[]
  calculationDetails: {
    templatePoints: number
    ratingPoints: number
    communityPoints: number
    qualityBonus: number
    penalties: number
    decay: number
  }
}

/**
 * Anti-gaming detection result
 */
interface AntiGamingCheck {
  isSuspicious: boolean
  suspicionScore: number
  flags: string[]
  recommendedAction: 'none' | 'review' | 'limit' | 'block'
}

// ========================
// CORE REPUTATION SERVICE
// ========================

export class CommunityReputationSystem {
  private static instance: CommunityReputationSystem
  private reputationCache = new Map<string, { points: number; level: number; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  public static getInstance(): CommunityReputationSystem {
    if (!CommunityReputationSystem.instance) {
      CommunityReputationSystem.instance = new CommunityReputationSystem()
    }
    return CommunityReputationSystem.instance
  }

  /**
   * Calculate reputation for a specific user
   *
   * @param userId - User ID to calculate reputation for
   * @param recalculateFromScratch - Whether to recalculate from scratch (default: false)
   * @returns Promise<ReputationCalculation>
   */
  async calculateUserReputation(
    userId: string,
    recalculateFromScratch = false
  ): Promise<ReputationCalculation> {
    try {
      console.log(`[ReputationSystem] Calculating reputation for user: ${userId}`)

      // Get current reputation
      const currentReputation = await this.getCurrentReputation(userId)
      const previousPoints = currentReputation?.totalPoints || 0
      const previousLevel = this.calculateLevel(previousPoints)

      // Calculate new reputation points
      const calculationDetails = await this.calculateReputationComponents(userId)

      const newPoints = Math.max(
        0,
        calculationDetails.templatePoints +
          calculationDetails.ratingPoints +
          calculationDetails.communityPoints +
          calculationDetails.qualityBonus -
          calculationDetails.penalties -
          calculationDetails.decay
      )

      const pointsChange = newPoints - previousPoints
      const newLevel = this.calculateLevel(newPoints)
      const levelChanged = newLevel !== previousLevel

      // Update reputation in database
      await this.updateReputationRecord(userId, {
        totalPoints: newPoints,
        level: newLevel,
        ...calculationDetails,
      })

      // Log reputation change
      if (pointsChange !== 0) {
        await this.logReputationChange(userId, {
          change: pointsChange,
          previousTotal: previousPoints,
          newTotal: newPoints,
          source: 'system_calculation',
          reason: 'Automated reputation calculation',
          details: calculationDetails,
        })
      }

      // Award badges if applicable
      const badgesAwarded = await this.checkAndAwardBadges(userId, newPoints, calculationDetails)

      // Clear cache for this user
      this.reputationCache.delete(userId)

      const result: ReputationCalculation = {
        userId,
        previousPoints,
        newPoints,
        pointsChange,
        previousLevel,
        newLevel,
        levelChanged,
        badgesAwarded,
        calculationDetails,
      }

      console.log(
        `[ReputationSystem] Reputation calculated for ${userId}: ${previousPoints} → ${newPoints} points (${pointsChange >= 0 ? '+' : ''}${pointsChange})`
      )

      if (levelChanged) {
        console.log(
          `[ReputationSystem] Level changed for ${userId}: ${REPUTATION_LEVELS[previousLevel - 1]?.name} → ${REPUTATION_LEVELS[newLevel - 1]?.name}`
        )
      }

      return result
    } catch (error: unknown) {
      console.error(`[ReputationSystem] Error calculating reputation for user ${userId}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to calculate reputation: ${errorMessage}`)
    }
  }

  /**
   * Calculate reputation components from user activities
   */
  private async calculateReputationComponents(userId: string) {
    const components = {
      templatePoints: 0,
      ratingPoints: 0,
      communityPoints: 0,
      qualityBonus: 0,
      penalties: 0,
      decay: 0,
    }

    try {
      // Template contribution points
      const templateStats = await db.execute(sql`
        SELECT 
          COUNT(*) as template_count,
          AVG(rating_average) as avg_rating,
          SUM(download_count) as total_downloads,
          SUM(like_count) as total_favorites
        FROM templates 
        WHERE created_by_user_id = ${userId}
          AND status = 'approved'
          AND visibility = 'public'
      `)

      if (templateStats.length > 0) {
        const stats = templateStats[0] as any
        components.templatePoints =
          stats.template_count * REPUTATION_POINT_VALUES.TEMPLATE_CREATED +
          stats.total_downloads * REPUTATION_POINT_VALUES.TEMPLATE_DOWNLOAD +
          stats.total_favorites * REPUTATION_POINT_VALUES.TEMPLATE_FAVORITED
      }

      // Rating points from ratings received on templates
      const ratingStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_ratings,
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star_count,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star_count,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star_count,
          AVG(rating) as avg_rating
        FROM template_ratings tr
        JOIN templates t ON tr.template_id = t.id
        WHERE t.created_by_user_id = ${userId}
          AND tr.is_approved = true
      `)

      if (ratingStats.length > 0) {
        const stats = ratingStats[0] as any
        components.ratingPoints =
          stats.five_star_count * REPUTATION_POINT_VALUES.FIVE_STAR_RATING_RECEIVED +
          stats.four_star_count * REPUTATION_POINT_VALUES.FOUR_STAR_RATING_RECEIVED +
          stats.three_star_count * REPUTATION_POINT_VALUES.THREE_STAR_RATING_RECEIVED
      }

      // Community engagement points
      const communityStats = await db.execute(sql`
        SELECT 
          COUNT(*) as reviews_given,
          SUM(CASE WHEN helpful_count > unhelpful_count THEN 1 ELSE 0 END) as helpful_reviews
        FROM template_ratings 
        WHERE user_id = ${userId}
          AND is_approved = true
          AND review_content IS NOT NULL
      `)

      if (communityStats.length > 0) {
        const stats = communityStats[0] as any
        components.communityPoints =
          stats.reviews_given * REPUTATION_POINT_VALUES.RATING_GIVEN +
          stats.helpful_reviews * REPUTATION_POINT_VALUES.HELPFUL_REVIEW_WRITTEN
      }

      // Quality bonuses
      if (templateStats.length > 0) {
        const stats = templateStats[0] as any
        if (stats.template_count >= 5 && stats.avg_rating >= 4.0) {
          components.qualityBonus += REPUTATION_POINT_VALUES.CONSISTENCY_BONUS
        }
      }

      // Calculate decay for inactive users
      const lastActivityResult = await db.execute(sql`
        SELECT MAX(created_at) as last_activity
        FROM (
          SELECT created_at FROM templates WHERE created_by_user_id = ${userId}
          UNION ALL
          SELECT created_at FROM template_ratings WHERE user_id = ${userId}
          UNION ALL
          SELECT created_at FROM community_user_activities WHERE user_id = ${userId}
        ) activities
      `)

      if (lastActivityResult.length > 0 && lastActivityResult[0]?.last_activity) {
        const lastActivity = new Date(lastActivityResult[0].last_activity as string)
        const monthsSinceActivity =
          (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24 * 30)

        if (monthsSinceActivity > 3) {
          // Apply decay after 3 months of inactivity
          const totalPoints =
            components.templatePoints + components.ratingPoints + components.communityPoints
          components.decay = Math.floor(
            totalPoints * REPUTATION_POINT_VALUES.MONTHLY_DECAY_RATE * monthsSinceActivity
          )
        }
      }
    } catch (error) {
      console.error(
        `[ReputationSystem] Error calculating reputation components for ${userId}:`,
        error
      )
    }

    return components
  }

  /**
   * Calculate reputation level from points
   */
  private calculateLevel(points: number): number {
    for (let i = REPUTATION_LEVELS.length - 1; i >= 0; i--) {
      if (points >= REPUTATION_LEVELS[i].minPoints) {
        return REPUTATION_LEVELS[i].level
      }
    }
    return 1
  }

  /**
   * Get current reputation from database with caching
   */
  private async getCurrentReputation(userId: string) {
    // Check cache first
    const cached = this.reputationCache.get(userId)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { totalPoints: cached.points, level: cached.level }
    }

    try {
      const result = await db.execute(sql`
        SELECT total_points, reputation_level 
        FROM user_reputation 
        WHERE user_id = ${userId}
      `)

      if (result.length > 0) {
        const rep = result[0] as any
        // Update cache
        this.reputationCache.set(userId, {
          points: rep.total_points,
          level: rep.reputation_level,
          timestamp: Date.now(),
        })
        return { totalPoints: rep.total_points, level: rep.reputation_level }
      }

      return null
    } catch (error) {
      console.error(`[ReputationSystem] Error getting current reputation for ${userId}:`, error)
      return null
    }
  }

  /**
   * Update reputation record in database
   */
  private async updateReputationRecord(userId: string, data: any) {
    try {
      // Upsert reputation record
      await db.execute(sql`
        INSERT INTO user_reputation (
          id, user_id, total_points, reputation_level, level_progress,
          template_creation_points, template_rating_points, community_contribution_points,
          quality_bonus_points, penalty_points, decay_applied, last_calculation_at, updated_at
        ) VALUES (
          gen_random_uuid()::TEXT, ${userId}, ${data.totalPoints}, ${data.level}, 
          ${this.calculateLevelProgress(data.totalPoints)},
          ${data.templatePoints}, ${data.ratingPoints}, ${data.communityPoints},
          ${data.qualityBonus}, ${data.penalties}, ${data.decay}, NOW(), NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          total_points = EXCLUDED.total_points,
          reputation_level = EXCLUDED.reputation_level,
          level_progress = EXCLUDED.level_progress,
          template_creation_points = EXCLUDED.template_creation_points,
          template_rating_points = EXCLUDED.template_rating_points,
          community_contribution_points = EXCLUDED.community_contribution_points,
          quality_bonus_points = EXCLUDED.quality_bonus_points,
          penalty_points = EXCLUDED.penalty_points,
          decay_applied = EXCLUDED.decay_applied,
          last_calculation_at = EXCLUDED.last_calculation_at,
          updated_at = EXCLUDED.updated_at
      `)
    } catch (error) {
      console.error(`[ReputationSystem] Error updating reputation record for ${userId}:`, error)
      throw error
    }
  }

  /**
   * Calculate progress toward next level
   */
  private calculateLevelProgress(points: number): number {
    const currentLevel = this.calculateLevel(points)
    const nextLevel = REPUTATION_LEVELS.find((level) => level.level > currentLevel)

    if (!nextLevel) return 100 // Max level reached

    const currentLevelMin = REPUTATION_LEVELS[currentLevel - 1].minPoints
    const nextLevelMin = nextLevel.minPoints
    const progress = ((points - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100

    return Math.min(100, Math.max(0, progress))
  }

  /**
   * Log reputation change for transparency
   */
  private async logReputationChange(
    userId: string,
    change: {
      change: number
      previousTotal: number
      newTotal: number
      source: string
      reason: string
      details?: any
    }
  ) {
    try {
      await db.execute(sql`
        INSERT INTO user_reputation_history (
          id, user_id, change_type, points_change, previous_total, new_total,
          source_type, reason, triggered_by, created_at
        ) VALUES (
          gen_random_uuid()::TEXT, ${userId}, 
          ${change.change > 0 ? 'earned' : 'penalty'}, ${change.change}, 
          ${change.previousTotal}, ${change.newTotal}, ${change.source}, 
          ${change.reason}, 'system', NOW()
        )
      `)
    } catch (error) {
      console.error(`[ReputationSystem] Error logging reputation change for ${userId}:`, error)
    }
  }

  /**
   * Check and award eligible badges
   */
  private async checkAndAwardBadges(
    userId: string,
    reputationPoints: number,
    calculationDetails: any
  ): Promise<string[]> {
    const badgesAwarded: string[] = []

    try {
      // Get user's current badges
      const currentBadges = await db.execute(sql`
        SELECT badge_id 
        FROM community_user_badges 
        WHERE user_id = ${userId}
      `)

      const currentBadgeIds = new Set(
        currentBadges.map((row: { badge_id: string }) => row.badge_id)
      )

      // Get all available badges
      const availableBadges = await db.execute(sql`
        SELECT id, slug, name, criteria_config
        FROM community_badge_definitions
        WHERE is_active = true
      `)

      for (const badge of availableBadges) {
        const badgeData = badge as any

        // Skip if user already has this badge
        if (currentBadgeIds.has(badgeData.id)) continue

        const criteria = JSON.parse(badgeData.criteria_config)
        const isEligible = await this.checkBadgeEligibility(
          userId,
          criteria,
          reputationPoints,
          calculationDetails
        )

        if (isEligible) {
          await this.awardBadge(userId, badgeData.id, 'system', null)
          badgesAwarded.push(badgeData.name)
        }
      }
    } catch (error) {
      console.error(`[ReputationSystem] Error checking badges for ${userId}:`, error)
    }

    return badgesAwarded
  }

  /**
   * Check if user is eligible for a specific badge
   */
  private async checkBadgeEligibility(
    userId: string,
    criteria: any,
    reputationPoints: number,
    calculationDetails: any
  ): Promise<boolean> {
    try {
      // Reputation-based badges
      if (criteria.min_reputation && reputationPoints < criteria.min_reputation) {
        return false
      }

      // Template-based badges
      if (criteria.action === 'template_created') {
        const templateCount = await this.getUserTemplateCount(userId)
        if (templateCount < criteria.count) return false

        if (criteria.min_rating) {
          const avgRating = await this.getUserAverageRating(userId)
          if (avgRating < criteria.min_rating) return false
        }
      }

      // Review-based badges
      if (criteria.action === 'helpful_reviews') {
        const helpfulCount = await this.getUserHelpfulReviewCount(userId)
        if (helpfulCount < criteria.count) return false
      }

      // Rating-based badges
      if (criteria.min_rating && criteria.min_reviews) {
        const hasQualityRating = await this.checkUserRatingQuality(
          userId,
          criteria.min_rating,
          criteria.min_reviews
        )
        if (!hasQualityRating) return false
      }

      return true
    } catch (error) {
      console.error(`[ReputationSystem] Error checking badge eligibility for ${userId}:`, error)
      return false
    }
  }

  /**
   * Award badge to user
   */
  private async awardBadge(
    userId: string,
    badgeId: string,
    sourceType: string,
    sourceId: string | null
  ) {
    try {
      await db.execute(sql`
        INSERT INTO community_user_badges (
          id, user_id, badge_id, source_type, source_id, earned_at
        ) VALUES (
          gen_random_uuid()::TEXT, ${userId}, ${badgeId}, ${sourceType}, ${sourceId || null}, NOW()
        )
        ON CONFLICT (user_id, badge_id, level) DO NOTHING
      `)

      // Log activity
      await db.execute(sql`
        INSERT INTO community_user_activities (
          id, user_id, activity_type, target_type, target_id, visibility, created_at
        ) VALUES (
          gen_random_uuid()::TEXT, ${userId}, 'badge_earned', 'badge', ${badgeId}, 'public', NOW()
        )
      `)
    } catch (error) {
      console.error(`[ReputationSystem] Error awarding badge to ${userId}:`, error)
    }
  }

  // ========================
  // HELPER METHODS
  // ========================

  /**
   * Get user's template count
   */
  private async getUserTemplateCount(userId: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM templates 
      WHERE created_by_user_id = ${userId}
        AND status = 'approved' 
        AND visibility = 'public'
    `)

    return result.length > 0 ? (result[0] as any)?.count || 0 : 0
  }

  /**
   * Get user's average template rating
   */
  private async getUserAverageRating(userId: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT AVG(rating_average) as avg_rating
      FROM templates 
      WHERE created_by_user_id = ${userId}
        AND status = 'approved' 
        AND visibility = 'public'
        AND rating_count > 0
    `)

    return result.length > 0 ? (result[0] as any)?.avg_rating || 0 : 0
  }

  /**
   * Get user's helpful review count
   */
  private async getUserHelpfulReviewCount(userId: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM template_ratings 
      WHERE user_id = ${userId}
        AND helpful_count > unhelpful_count
        AND is_approved = true
    `)

    return result.length > 0 ? (result[0] as any)?.count || 0 : 0
  }

  /**
   * Check if user has templates with minimum rating quality
   */
  private async checkUserRatingQuality(
    userId: string,
    minRating: number,
    minReviews: number
  ): Promise<boolean> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM templates 
      WHERE created_by_user_id = ${userId}
        AND rating_average >= ${minRating}
        AND rating_count >= ${minReviews}
        AND status = 'approved'
    `)

    return result.length > 0 ? ((result[0] as any)?.count || 0) > 0 : false
  }

  // ========================
  // PUBLIC API METHODS
  // ========================

  /**
   * Get user reputation summary
   * @param userId - User ID to get reputation summary for
   * @returns Promise<UserReputationSummary> - Complete reputation summary with levels and metrics
   */
  async getUserReputationSummary(userId: string): Promise<{
    userId: string
    totalPoints: number
    level: number
    levelName: string
    levelProgress: number
    benefits: string[]
    nextLevelPoints: number | null
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
    lastCalculated: Date
    isVerified: boolean
  }> {
    try {
      const result = await db.execute(sql`
        SELECT 
          ur.*,
          u.name,
          u.image,
          cup.display_name,
          cup.is_verified
        FROM user_reputation ur
        JOIN "user" u ON ur.user_id = u.id
        LEFT JOIN community_user_profiles cup ON ur.user_id = cup.user_id
        WHERE ur.user_id = ${userId}
      `)

      if (result.length === 0) {
        // Initialize reputation for new user
        await this.calculateUserReputation(userId, true)
        return this.getUserReputationSummary(userId)
      }

      const rep = result[0] as any
      const levelInfo = REPUTATION_LEVELS[rep.reputation_level - 1]

      return {
        userId: rep.user_id,
        totalPoints: rep.total_points,
        level: rep.reputation_level,
        levelName: levelInfo?.name || 'Unknown',
        levelProgress: rep.level_progress,
        benefits: levelInfo?.benefits ? [...levelInfo.benefits] : [],
        nextLevelPoints: REPUTATION_LEVELS[rep.reputation_level]?.minPoints || null,
        breakdown: {
          templatePoints: rep.template_creation_points,
          ratingPoints: rep.template_rating_points,
          communityPoints: rep.community_contribution_points,
          qualityBonus: rep.quality_bonus_points,
          penalties: rep.penalty_points,
        },
        qualityMetrics: {
          averageTemplateRating: rep.average_template_rating,
          helpfulReviewPercentage: rep.helpful_review_percentage,
          consistencyScore: rep.consistency_score,
        },
        lastCalculated: rep.last_calculation_at,
        isVerified: rep.is_verified || false,
      }
    } catch (error) {
      console.error(`[ReputationSystem] Error getting reputation summary for ${userId}:`, error)
      throw new Error('Failed to get reputation summary')
    }
  }

  /**
   * Get community leaderboard
   */
  async getLeaderboard(limit = 50, offset = 0) {
    try {
      const result = await db.execute(sql`
        SELECT * FROM community_leaderboard
        LIMIT ${limit} OFFSET ${offset}
      `)

      return result.map((row: any) => ({
        userId: row.id,
        name: row.name,
        displayName: row.display_name,
        image: row.image,
        title: row.title,
        company: row.company,
        specializations: row.specializations,
        totalPoints: row.total_points,
        level: row.reputation_level,
        averageRating: row.average_template_rating,
        badges: {
          bronze: row.bronze_badges,
          silver: row.silver_badges,
          gold: row.gold_badges,
          platinum: row.platinum_badges,
          special: row.special_badges,
        },
        templateCount: row.total_templates,
        recentActivity: row.recent_activity_count,
      }))
    } catch (error) {
      console.error('[ReputationSystem] Error getting leaderboard:', error)
      throw new Error('Failed to get leaderboard')
    }
  }

  /**
   * Batch calculate reputation for multiple users
   */
  async batchCalculateReputation(userIds: string[]) {
    const results = []

    for (const userId of userIds) {
      try {
        const result = await this.calculateUserReputation(userId)
        results.push(result)
      } catch (error) {
        console.error(`[ReputationSystem] Error in batch calculation for ${userId}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          userId,
          error: errorMessage,
        } as any)
      }
    }

    return results
  }

  /**
   * Anti-gaming detection
   */
  async detectSuspiciousActivity(userId: string): Promise<AntiGamingCheck> {
    const flags: string[] = []
    let suspicionScore = 0

    try {
      // Check for rapid point gain
      const recentHistory = await db.execute(sql`
        SELECT points_change, created_at
        FROM user_reputation_history
        WHERE user_id = ${userId}
          AND created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
      `)

      const rapidGains = recentHistory.filter(
        (row: { points_change: number }) => row.points_change > 100
      )
      if (rapidGains.length > 5) {
        flags.push('rapid_point_gain')
        suspicionScore += 30
      }

      // Check for suspicious review patterns
      const reviewPattern = await db.execute(sql`
        SELECT 
          COUNT(*) as review_count,
          COUNT(DISTINCT template_id) as unique_templates
        FROM template_ratings
        WHERE user_id = ${userId}
          AND created_at > NOW() - INTERVAL '24 hours'
      `)

      const reviewData = reviewPattern.length > 0 ? (reviewPattern[0] as any) : null
      if (reviewData?.review_count > 10 && reviewData.unique_templates < 3) {
        flags.push('suspicious_review_pattern')
        suspicionScore += 25
      }

      // Determine recommended action
      let recommendedAction: 'none' | 'review' | 'limit' | 'block' = 'none'
      if (suspicionScore > 50) recommendedAction = 'block'
      else if (suspicionScore > 30) recommendedAction = 'limit'
      else if (suspicionScore > 15) recommendedAction = 'review'

      return {
        isSuspicious: suspicionScore > 15,
        suspicionScore,
        flags,
        recommendedAction,
      }
    } catch (error) {
      console.error(`[ReputationSystem] Error in anti-gaming detection for ${userId}:`, error)
      return {
        isSuspicious: false,
        suspicionScore: 0,
        flags: ['detection_error'],
        recommendedAction: 'none',
      }
    }
  }
}
