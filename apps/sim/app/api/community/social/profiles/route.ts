/**
 * Community Social Profiles API
 *
 * Manages user profiles with comprehensive social features and statistics.
 * Provides rich user profile data including reputation, social connections,
 * content statistics, and community engagement metrics.
 *
 * FEATURES:
 * - Enhanced user profile retrieval with social stats
 * - Profile update management with privacy controls
 * - Social network analysis (followers, following, mutual connections)
 * - Content statistics (templates, reviews, activities)
 * - Reputation and badge management
 * - Profile privacy and visibility controls
 * - Activity timeline and engagement history
 * - User discovery and recommendation features
 *
 * SECURITY:
 * - Authentication required for profile updates
 * - Privacy settings enforcement for profile visibility
 * - Rate limiting for profile access and updates
 * - Input validation and sanitization
 * - GDPR compliance for user data
 *
 * @created 2025-09-04
 * @author Community Social Profiles API
 */

import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { ratelimit } from '@/lib/ratelimit'
import { db } from '@/db'

// ========================
// VALIDATION SCHEMAS
// ========================

const ProfileQuerySchema = z.object({
  userId: z.string().optional(),
  username: z.string().optional(),
  includeSocialStats: z.boolean().default(true),
  includeContent: z.boolean().default(true),
  includeActivity: z.boolean().default(false),
  includeBadges: z.boolean().default(true),
  includeReputation: z.boolean().default(true),
  activityLimit: z.number().min(1).max(50).default(10),
})

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  title: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  githubUsername: z.string().max(50).optional(),
  linkedinUsername: z.string().max(50).optional(),
  twitterUsername: z.string().max(50).optional(),
  specializations: z.array(z.string()).max(10).optional(),
  skills: z.array(z.string()).max(20).optional(),
  industries: z.array(z.string()).max(10).optional(),
  profileVisibility: z.enum(['public', 'community', 'private']).optional(),
  showEmail: z.boolean().optional(),
  showRealName: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  showCompany: z.boolean().optional(),
  allowDirectMessages: z.boolean().optional(),
  showActivity: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
})

const UserDiscoverySchema = z.object({
  query: z.string().min(1).max(100).optional(),
  specializations: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  location: z.string().optional(),
  excludeFollowed: z.boolean().default(true),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
})

// ========================
// API HANDLERS
// ========================

/**
 * GET /api/community/social/profiles - Get user profile with social stats
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialProfiles] Processing GET request for user profile')

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    // Type conversions for schema validation
    const processedParams: Record<string, any> = { ...queryParams }
    if (processedParams.includeSocialStats)
      processedParams.includeSocialStats = processedParams.includeSocialStats === 'true'
    if (processedParams.includeContent)
      processedParams.includeContent = processedParams.includeContent === 'true'
    if (processedParams.includeActivity)
      processedParams.includeActivity = processedParams.includeActivity === 'true'
    if (processedParams.includeBadges)
      processedParams.includeBadges = processedParams.includeBadges === 'true'
    if (processedParams.includeReputation)
      processedParams.includeReputation = processedParams.includeReputation === 'true'
    if (processedParams.activityLimit)
      processedParams.activityLimit = Number.parseInt(processedParams.activityLimit as string)

    const params = ProfileQuerySchema.parse(processedParams)
    console.log('[SocialProfiles] Profile query parameters validated:', params)

    // Get current user session for privacy checks
    const currentUser = await getSession()
    const currentUserId = currentUser?.user?.id

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimitResult = await ratelimit(100, '1m').limit(`profiles_get:${clientId}`)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Determine target user ID
    let targetUserId = params.userId || currentUserId
    if (params.username) {
      // Look up user by username/display_name
      const userLookup = await db.execute(sql`
        SELECT u.id 
        FROM "user" u
        LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
        WHERE LOWER(u.name) = LOWER(${params.username}) OR LOWER(cup.display_name) = LOWER(${params.username})
        LIMIT 1
      `)
      if (userLookup.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      targetUserId = (userLookup[0] as any).id
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get comprehensive user profile data
    const profile = await getUserProfile(targetUserId, currentUserId, params)

    if (!profile) {
      return NextResponse.json({ error: 'User not found or access denied' }, { status: 404 })
    }

    // Check privacy settings
    if (!canViewProfile(profile, currentUserId)) {
      return NextResponse.json({ error: 'Profile access denied' }, { status: 403 })
    }

    // Sanitize private information based on privacy settings
    const sanitizedProfile = sanitizeProfileForViewer(profile, currentUserId)

    const executionTime = Date.now() - startTime
    console.log(`[SocialProfiles] Retrieved profile for user ${targetUserId} in ${executionTime}ms`)

    return NextResponse.json({
      data: sanitizedProfile,
      meta: {
        executionTime,
        targetUserId,
        currentUserId,
        includedSections: {
          socialStats: params.includeSocialStats,
          content: params.includeContent,
          activity: params.includeActivity,
          badges: params.includeBadges,
          reputation: params.includeReputation,
        },
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialProfiles] Error in GET request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to retrieve profile',
        message:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/community/social/profiles - Update user profile
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialProfiles] Processing PUT request for profile update')

    // Authenticate user
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    console.log(`[SocialProfiles] Authenticated user: ${userId}`)

    // Rate limiting for profile updates
    const rateLimitResult = await ratelimit(10, '5m').limit(`profile_update:${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const updateData = UpdateProfileSchema.parse(body)
    console.log('[SocialProfiles] Profile update data validated')

    // Sanitize input data
    const sanitizedData = sanitizeProfileUpdateData(updateData)

    // Check if profile exists, create if not
    const existingProfile = await db.execute(sql`
      SELECT id FROM community_user_profiles WHERE user_id = ${userId}
    `)

    let profileId: string
    if (existingProfile.length === 0) {
      // Create new profile
      profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await db.execute(sql`
        INSERT INTO community_user_profiles (id, user_id, created_at, updated_at)
        VALUES (${profileId}, ${userId}, NOW(), NOW())
      `)
      console.log(`[SocialProfiles] Created new profile: ${profileId}`)
    } else {
      profileId = (existingProfile[0] as any).id
    }

    // Build update query
    const updateFields: string[] = []
    const updateValues: any[] = []

    for (const [key, value] of Object.entries(sanitizedData)) {
      if (value !== undefined) {
        const dbField = camelToSnakeCase(key)
        updateFields.push(`${dbField} = $${updateValues.length + 1}`)
        updateValues.push(Array.isArray(value) ? JSON.stringify(value) : value)
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Add updated_at
    updateFields.push('updated_at = NOW()')
    updateValues.push(userId) // For WHERE clause

    // Execute update
    await db.execute(
      sql.raw(`
      UPDATE community_user_profiles 
      SET ${updateFields.join(', ')}
      WHERE user_id = '${userId}'
    `)
    )

    // Update user activity
    await db.execute(sql`
      UPDATE community_user_profiles 
      SET last_active_at = NOW()
      WHERE user_id = ${userId}
    `)

    // Get updated profile
    const updatedProfile = await getUserProfile(userId, userId, {
      includeSocialStats: true,
      includeContent: true,
      includeActivity: false,
      includeBadges: true,
      includeReputation: true,
    })

    const executionTime = Date.now() - startTime
    console.log(`[SocialProfiles] Profile updated successfully in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      meta: {
        executionTime,
        updatedFields: Object.keys(sanitizedData),
        profileId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialProfiles] Error in PUT request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid profile data',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to update profile',
        message:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/social/profiles/discover - User discovery and search
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[SocialProfiles] Processing POST request for user discovery')

    // Parse and validate request body
    const body = await request.json()
    const searchParams = UserDiscoverySchema.parse(body)
    console.log('[SocialProfiles] User discovery parameters validated:', searchParams)

    // Get current user session for personalization
    const currentUser = await getSession()
    const currentUserId = currentUser?.user?.id

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimitResult = await ratelimit(50, '1m').limit(`user_discovery:${clientId}`)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Build search query
    const users = await searchUsers(searchParams, currentUserId)

    const executionTime = Date.now() - startTime
    console.log(
      `[SocialProfiles] Found ${users.length} users in discovery search in ${executionTime}ms`
    )

    return NextResponse.json({
      data: users,
      pagination: {
        limit: searchParams.limit,
        offset: searchParams.offset,
        hasMore: users.length === searchParams.limit,
      },
      searchParams,
      meta: {
        executionTime,
        userCount: users.length,
        currentUserId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[SocialProfiles] Error in POST discovery request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid search parameters',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to discover users',
        message:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Get comprehensive user profile with all requested data
 */
async function getUserProfile(
  targetUserId: string,
  currentUserId?: string,
  options: {
    includeSocialStats?: boolean
    includeContent?: boolean
    includeActivity?: boolean
    includeBadges?: boolean
    includeReputation?: boolean
    activityLimit?: number
  } = {}
): Promise<any | null> {
  try {
    console.log(`[SocialProfiles] Fetching comprehensive profile for user ${targetUserId}`)

    // Main profile query
    const profileResult = await db.execute(sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.image,
        u.created_at as user_created_at,
        -- Extended profile information
        cup.display_name,
        cup.bio,
        cup.title,
        cup.company,
        cup.location,
        cup.timezone,
        cup.specializations,
        cup.skills,
        cup.industries,
        cup.website_url,
        cup.github_username,
        cup.linkedin_username,
        cup.twitter_username,
        cup.discord_username,
        cup.avatar_url,
        cup.banner_url,
        cup.theme_color,
        cup.profile_visibility,
        cup.show_email,
        cup.show_real_name,
        cup.show_location,
        cup.show_company,
        cup.allow_direct_messages,
        cup.show_activity,
        cup.is_verified,
        cup.verification_type,
        cup.verified_at,
        cup.trust_score,
        cup.expertise_level,
        cup.last_active_at,
        cup.total_contributions,
        cup.monthly_active_days,
        cup.created_at as profile_created_at,
        cup.updated_at as profile_updated_at
      FROM "user" u
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      WHERE u.id = ${targetUserId}
    `)

    if (profileResult.length === 0) {
      return null
    }

    const profile = profileResult[0] as any

    // Get reputation data if requested
    if (options.includeReputation) {
      const reputationResult = await db.execute(sql`
        SELECT 
          total_points,
          reputation_level,
          level_progress,
          template_creation_points,
          template_rating_points,
          community_contribution_points,
          quality_bonus_points,
          helpful_review_points,
          community_interaction_points,
          mentorship_points,
          average_template_rating,
          helpful_review_percentage,
          community_feedback_score,
          consistency_score,
          current_streak,
          longest_streak,
          milestones_achieved,
          last_calculation_at
        FROM user_reputation
        WHERE user_id = ${targetUserId}
      `)

      profile.reputation =
        reputationResult.length > 0
          ? reputationResult[0]
          : {
              total_points: 0,
              reputation_level: 1,
              level_progress: 0,
            }
    }

    // Get social stats if requested
    if (options.includeSocialStats) {
      const socialStatsResult = await db.execute(sql`
        SELECT 
          -- Follower counts
          follower_counts.follower_count,
          follower_counts.following_count,
          -- Mutual follow status with current user
          ${
            currentUserId
              ? `
          CASE WHEN mutual_follow.follower_id IS NOT NULL THEN true ELSE false END as is_mutual_follow,
          CASE WHEN user_follows.follower_id IS NOT NULL THEN true ELSE false END as is_following,
          CASE WHEN follows_user.follower_id IS NOT NULL THEN true ELSE false END as follows_current_user
          `
              : `
          false as is_mutual_follow,
          false as is_following,
          false as follows_current_user
          `
          }
        FROM (SELECT 1) dummy
        LEFT JOIN (
          SELECT 
            ${targetUserId}::TEXT as user_id,
            COALESCE(followers.count, 0) as follower_count,
            COALESCE(following.count, 0) as following_count
          FROM (
            SELECT following_id, COUNT(*) as count
            FROM community_user_follows
            WHERE following_id = ${targetUserId}
            GROUP BY following_id
          ) followers
          FULL OUTER JOIN (
            SELECT follower_id, COUNT(*) as count
            FROM community_user_follows
            WHERE follower_id = ${targetUserId}
            GROUP BY follower_id
          ) following ON followers.following_id = following.follower_id
        ) follower_counts ON true
        ${
          currentUserId
            ? `
        LEFT JOIN community_user_follows mutual_follow 
          ON mutual_follow.follower_id = ${currentUserId} 
          AND mutual_follow.following_id = ${targetUserId}
          AND EXISTS (
            SELECT 1 FROM community_user_follows cuf2 
            WHERE cuf2.follower_id = ${targetUserId} 
            AND cuf2.following_id = ${currentUserId}
          )
        LEFT JOIN community_user_follows user_follows
          ON user_follows.follower_id = ${currentUserId} 
          AND user_follows.following_id = ${targetUserId}
        LEFT JOIN community_user_follows follows_user
          ON follows_user.follower_id = ${targetUserId} 
          AND follows_user.following_id = ${currentUserId}
        `
            : ''
        }
      `)

      profile.socialStats =
        socialStatsResult.length > 0
          ? socialStatsResult[0]
          : {
              follower_count: 0,
              following_count: 0,
              is_mutual_follow: false,
              is_following: false,
              follows_current_user: false,
            }
    }

    // Get content statistics if requested
    if (options.includeContent) {
      const contentStatsResult = await db.execute(sql`
        SELECT 
          COALESCE(template_stats.template_count, 0) as template_count,
          COALESCE(template_stats.avg_rating, 0) as avg_template_rating,
          COALESCE(template_stats.total_likes, 0) as total_template_likes,
          COALESCE(review_stats.review_count, 0) as review_count,
          COALESCE(review_stats.helpful_reviews, 0) as helpful_reviews,
          COALESCE(activity_stats.activity_count, 0) as activity_count,
          COALESCE(collection_stats.collection_count, 0) as collection_count
        FROM (SELECT 1) dummy
        LEFT JOIN (
          SELECT 
            created_by_user_id,
            COUNT(*) as template_count,
            AVG(rating_average) as avg_rating,
            SUM(like_count) as total_likes
          FROM templates 
          WHERE created_by_user_id = ${targetUserId} AND status = 'approved'
          GROUP BY created_by_user_id
        ) template_stats ON template_stats.created_by_user_id = ${targetUserId}
        LEFT JOIN (
          SELECT 
            user_id,
            COUNT(*) as review_count,
            SUM(CASE WHEN helpful_count > unhelpful_count THEN 1 ELSE 0 END) as helpful_reviews
          FROM template_ratings
          WHERE user_id = ${targetUserId} AND is_approved = true
          GROUP BY user_id
        ) review_stats ON review_stats.user_id = ${targetUserId}
        LEFT JOIN (
          SELECT 
            user_id,
            COUNT(*) as activity_count
          FROM community_user_activities
          WHERE user_id = ${targetUserId} AND is_hidden = false AND visibility = 'public'
          GROUP BY user_id
        ) activity_stats ON activity_stats.user_id = ${targetUserId}
        LEFT JOIN (
          SELECT 
            user_id,
            COUNT(*) as collection_count
          FROM template_collections
          WHERE user_id = ${targetUserId} AND visibility = 'public'
          GROUP BY user_id
        ) collection_stats ON collection_stats.user_id = ${targetUserId}
      `)

      profile.contentStats =
        contentStatsResult.length > 0
          ? contentStatsResult[0]
          : {
              template_count: 0,
              avg_template_rating: 0,
              total_template_likes: 0,
              review_count: 0,
              helpful_reviews: 0,
              activity_count: 0,
              collection_count: 0,
            }
    }

    // Get badges if requested
    if (options.includeBadges) {
      const badgesResult = await db.execute(sql`
        SELECT 
          cub.id,
          cub.earned_at,
          cub.is_featured,
          cub.level,
          cbd.name,
          cbd.slug,
          cbd.description,
          cbd.icon,
          cbd.color,
          cbd.category,
          cbd.tier,
          cbd.difficulty
        FROM community_user_badges cub
        JOIN community_badge_definitions cbd ON cub.badge_id = cbd.id
        WHERE cub.user_id = ${targetUserId} 
          AND cub.show_on_profile = true
        ORDER BY cub.is_featured DESC, cub.earned_at DESC
        LIMIT 20
      `)

      profile.badges = badgesResult
    }

    // Get recent activity if requested
    if (options.includeActivity) {
      const activityResult = await db.execute(sql`
        SELECT 
          id,
          activity_type,
          activity_data,
          target_type,
          target_id,
          target_title,
          visibility,
          is_featured,
          like_count,
          comment_count,
          created_at
        FROM community_user_activities
        WHERE user_id = ${targetUserId}
          AND is_hidden = false
          AND (visibility = 'public' ${currentUserId === targetUserId ? " OR visibility IN ('followers', 'private')" : ''})
        ORDER BY created_at DESC
        LIMIT ${options.activityLimit || 10}
      `)

      profile.recentActivity = activityResult
    }

    return profile
  } catch (error) {
    console.error(`[SocialProfiles] Error fetching profile for user ${targetUserId}:`, error)
    return null
  }
}

/**
 * Check if current user can view target profile
 */
function canViewProfile(profile: any, currentUserId?: string): boolean {
  // Public profiles are always visible
  if (!profile.profile_visibility || profile.profile_visibility === 'public') {
    return true
  }

  // Private profiles only visible to owner
  if (profile.profile_visibility === 'private') {
    return currentUserId === profile.id
  }

  // Community profiles visible to authenticated users
  if (profile.profile_visibility === 'community') {
    return !!currentUserId
  }

  return false
}

/**
 * Sanitize profile data based on privacy settings and viewer permissions
 */
function sanitizeProfileForViewer(profile: any, currentUserId?: string): any {
  const isOwner = currentUserId === profile.id
  const sanitized = { ...profile }

  // Remove sensitive fields if not owner
  if (!isOwner) {
    sanitized.email = undefined

    // Apply privacy settings
    if (!profile.show_email) sanitized.email = undefined
    if (!profile.show_real_name) sanitized.name = profile.display_name || 'Anonymous'
    if (!profile.show_location) sanitized.location = undefined
    if (!profile.show_company) sanitized.company = undefined

    // Remove private profile settings
    sanitized.show_email = undefined
    sanitized.show_real_name = undefined
    sanitized.show_location = undefined
    sanitized.show_company = undefined
    sanitized.allow_direct_messages = undefined
    sanitized.show_activity = undefined
  }

  return sanitized
}

/**
 * Sanitize profile update data
 */
function sanitizeProfileUpdateData(data: any): any {
  const sanitized = { ...data }

  // Trim string fields
  const stringFields = [
    'displayName',
    'bio',
    'title',
    'company',
    'location',
    'websiteUrl',
    'githubUsername',
    'linkedinUsername',
    'twitterUsername',
  ]
  stringFields.forEach((field) => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitized[field].trim()
    }
  })

  // Validate and clean arrays
  const arrayFields = ['specializations', 'skills', 'industries']
  arrayFields.forEach((field) => {
    if (sanitized[field] && Array.isArray(sanitized[field])) {
      sanitized[field] = sanitized[field]
        .filter((item: any) => typeof item === 'string' && item.trim())
        .map((item: string) => item.trim())
        .slice(0, field === 'skills' ? 20 : 10) // Limit array sizes
    }
  })

  return sanitized
}

/**
 * Search users based on discovery parameters
 */
async function searchUsers(params: any, currentUserId?: string): Promise<any[]> {
  try {
    console.log('[SocialProfiles] Performing user discovery search')

    // Build WHERE conditions
    const whereConditions: string[] = [
      "cup.profile_visibility = 'public' OR cup.profile_visibility = 'community'",
    ]
    const queryValues: any[] = []

    // Text search
    if (params.query) {
      whereConditions.push(`(
        LOWER(u.name) LIKE LOWER($${queryValues.length + 1}) OR 
        LOWER(cup.display_name) LIKE LOWER($${queryValues.length + 2}) OR
        LOWER(cup.bio) LIKE LOWER($${queryValues.length + 3}) OR
        LOWER(cup.title) LIKE LOWER($${queryValues.length + 4}) OR
        LOWER(cup.company) LIKE LOWER($${queryValues.length + 5})
      )`)
      const searchTerm = `%${params.query}%`
      queryValues.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
    }

    // Specializations filter
    if (params.specializations && params.specializations.length > 0) {
      whereConditions.push(`cup.specializations ?| $${queryValues.length + 1}`)
      queryValues.push(params.specializations)
    }

    // Skills filter
    if (params.skills && params.skills.length > 0) {
      whereConditions.push(`cup.skills ?| $${queryValues.length + 1}`)
      queryValues.push(params.skills)
    }

    // Industries filter
    if (params.industries && params.industries.length > 0) {
      whereConditions.push(`cup.industries ?| $${queryValues.length + 1}`)
      queryValues.push(params.industries)
    }

    // Location filter
    if (params.location) {
      whereConditions.push(`LOWER(cup.location) LIKE LOWER($${queryValues.length + 1})`)
      queryValues.push(`%${params.location}%`)
    }

    // Exclude already followed users
    if (params.excludeFollowed && currentUserId) {
      whereConditions.push(`NOT EXISTS (
        SELECT 1 FROM community_user_follows cuf 
        WHERE cuf.follower_id = $${queryValues.length + 1} 
        AND cuf.following_id = u.id
      )`)
      queryValues.push(currentUserId)
    }

    // Exclude current user
    if (currentUserId) {
      whereConditions.push(`u.id != $${queryValues.length + 1}`)
      queryValues.push(currentUserId)
    }

    // Build main query
    const query = `
      SELECT 
        u.id,
        u.name,
        u.image,
        cup.display_name,
        cup.bio,
        cup.title,
        cup.company,
        cup.location,
        cup.specializations,
        cup.skills,
        cup.industries,
        cup.is_verified,
        cup.trust_score,
        cup.expertise_level,
        cup.last_active_at,
        ur.total_points as reputation_points,
        ur.reputation_level,
        -- Social stats
        COALESCE(follower_counts.follower_count, 0) as follower_count,
        COALESCE(template_counts.template_count, 0) as template_count,
        COALESCE(template_counts.avg_rating, 0) as avg_template_rating
      FROM "user" u
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      LEFT JOIN (
        SELECT following_id, COUNT(*) as follower_count
        FROM community_user_follows
        GROUP BY following_id
      ) follower_counts ON u.id = follower_counts.following_id
      LEFT JOIN (
        SELECT 
          created_by_user_id,
          COUNT(*) as template_count,
          AVG(rating_average) as avg_rating
        FROM templates 
        WHERE status = 'approved'
        GROUP BY created_by_user_id
      ) template_counts ON u.id = template_counts.created_by_user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY 
        (COALESCE(ur.total_points, 0) * 0.3 + 
         COALESCE(follower_counts.follower_count, 0) * 0.2 + 
         COALESCE(template_counts.template_count, 0) * 0.3 +
         COALESCE(template_counts.avg_rating, 0) * 50 * 0.2) DESC,
        cup.last_active_at DESC NULLS LAST
      LIMIT $${queryValues.length + 1} OFFSET $${queryValues.length + 2}
    `

    queryValues.push(params.limit, params.offset)

    const result = await db.execute(sql.raw(query))
    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      image: row.image,
      bio: row.bio,
      title: row.title,
      company: row.company,
      location: row.location,
      specializations: row.specializations || [],
      skills: row.skills || [],
      industries: row.industries || [],
      isVerified: row.is_verified || false,
      trustScore: row.trust_score || 0,
      expertiseLevel: row.expertise_level || 'intermediate',
      lastActiveAt: row.last_active_at,
      reputation: {
        points: row.reputation_points || 0,
        level: row.reputation_level || 1,
      },
      socialStats: {
        followerCount: row.follower_count || 0,
        templateCount: row.template_count || 0,
        avgTemplateRating: row.avg_template_rating || 0,
      },
    }))
  } catch (error) {
    console.error('[SocialProfiles] Error in user search:', error)
    return []
  }
}

/**
 * Convert camelCase to snake_case
 */
function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}
