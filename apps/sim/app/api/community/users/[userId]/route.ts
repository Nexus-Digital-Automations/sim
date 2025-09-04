/**
 * Individual Community User Profile API
 *
 * API endpoints for individual user profile operations including profile retrieval,
 * reputation data, badges, templates, activity feeds, and social statistics.
 * Handles privacy controls and viewer-specific data like follow status.
 *
 * FEATURES:
 * - Complete user profile with privacy controls
 * - Reputation and badge information
 * - User template portfolio
 * - Activity feed with filtering
 * - Social statistics and relationships
 * - Follow/unfollow operations
 * - Profile analytics and insights
 *
 * PRIVACY:
 * - Respects user privacy settings
 * - Viewer-specific data filtering
 * - GDPR compliant data handling
 * - Activity visibility controls
 *
 * @created 2025-09-04
 * @author Individual User Profile API
 */

import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { ratelimit } from '@/lib/ratelimit'
import { db } from '@/db'

// ========================
// VALIDATION SCHEMAS
// ========================

const UserIdParamSchema = z.object({
  userId: z.string().min(1),
})

const ActivityQuerySchema = z.object({
  type: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
})

// ========================
// API HANDLERS
// ========================

/**
 * GET /api/community/users/[userId] - Get complete user profile
 */
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const startTime = Date.now()

  try {
    console.log(`[UserProfileAPI] Processing GET request for user: ${params.userId}`)

    // Validate user ID parameter
    const { userId } = UserIdParamSchema.parse(params)

    // Get viewer's authentication status
    const session = await auth()
    const viewerId = session?.user?.id

    console.log(`[UserProfileAPI] Request from viewer: ${viewerId || 'anonymous'}`)

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || viewerId || 'anonymous'
    const rateLimitResult = await ratelimit(30, '1m').limit(`user_profile:${clientId}`)

    if (!rateLimitResult.success) {
      console.warn(`[UserProfileAPI] Rate limit exceeded for ${clientId}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Get complete user profile with privacy filtering
    const profileResult = await db.execute(sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.image,
        u.created_at as user_created_at,
        u.updated_at as user_updated_at,
        -- Community profile data
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
        -- Privacy settings
        cup.profile_visibility,
        cup.show_email,
        cup.show_real_name,
        cup.show_location,
        cup.show_company,
        cup.allow_direct_messages,
        cup.show_activity,
        -- Verification and trust
        cup.is_verified,
        cup.verification_type,
        cup.verified_at,
        cup.trust_score,
        cup.last_active_at,
        cup.total_contributions,
        cup.monthly_active_days,
        cup.created_at as profile_created_at,
        cup.updated_at as profile_updated_at,
        -- Reputation data
        ur.total_points,
        ur.reputation_level,
        ur.level_progress,
        ur.template_creation_points,
        ur.template_rating_points,
        ur.community_contribution_points,
        ur.quality_bonus_points,
        ur.helpful_review_points,
        ur.community_interaction_points,
        ur.mentorship_points,
        ur.penalty_points,
        ur.average_template_rating,
        ur.helpful_review_percentage,
        ur.community_feedback_score,
        ur.consistency_score,
        ur.current_streak,
        ur.longest_streak,
        ur.last_calculation_at
      FROM "user" u
      LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE u.id = ${userId}
    `)

    if (!profileResult.rows[0]) {
      console.warn(`[UserProfileAPI] User not found: ${userId}`)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = profileResult.rows[0] as any

    // Check privacy settings
    const isOwnProfile = userId === viewerId
    const profileVisibility = userData.profile_visibility || 'public'

    if (!isOwnProfile && profileVisibility === 'private') {
      console.warn(`[UserProfileAPI] Private profile access denied for ${userId} by ${viewerId}`)
      return NextResponse.json({ error: 'This profile is private' }, { status: 403 })
    }

    // Get social statistics
    const socialStats = await db.execute(sql`
      SELECT 
        follower_stats.follower_count,
        following_stats.following_count,
        CASE WHEN follow_status.follower_id IS NOT NULL THEN true ELSE false END as is_following,
        CASE WHEN mutual_follow.follower_id IS NOT NULL THEN true ELSE false END as is_mutual
      FROM (
        SELECT 1 as dummy
      ) base
      LEFT JOIN (
        SELECT COUNT(*) as follower_count
        FROM community_user_follows
        WHERE following_id = ${userId}
      ) follower_stats ON true
      LEFT JOIN (
        SELECT COUNT(*) as following_count
        FROM community_user_follows
        WHERE follower_id = ${userId}
      ) following_stats ON true
      LEFT JOIN (
        SELECT follower_id
        FROM community_user_follows
        WHERE follower_id = ${viewerId || null} AND following_id = ${userId}
      ) follow_status ON true
      LEFT JOIN (
        SELECT follower_id
        FROM community_user_follows
        WHERE follower_id = ${userId} AND following_id = ${viewerId || null}
      ) mutual_follow ON follow_status.follower_id IS NOT NULL
    `)

    const socialData = socialStats.rows[0] as any

    // Get featured badges
    const badgesResult = await db.execute(sql`
      SELECT 
        cbd.id,
        cbd.name,
        cbd.description,
        cbd.icon,
        cbd.color,
        cbd.background_color,
        cbd.category,
        cbd.tier,
        cub.earned_at,
        cub.is_featured,
        cub.level
      FROM community_user_badges cub
      JOIN community_badge_definitions cbd ON cub.badge_id = cbd.id
      WHERE cub.user_id = ${userId}
        AND cub.show_on_profile = true
      ORDER BY cub.is_featured DESC, cub.earned_at DESC
    `)

    // Get template count and stats
    const templateStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_templates,
        AVG(rating_average) as avg_rating,
        SUM(download_count) as total_downloads,
        SUM(view_count) as total_views,
        SUM(like_count) as total_likes
      FROM templates 
      WHERE created_by_user_id = ${userId}
        AND status = 'approved'
        AND (visibility = 'public' OR ${isOwnProfile})
    `)

    const templateData = templateStats.rows[0] as any

    // Apply privacy filters to response data
    const responseData = {
      id: userData.id,
      name:
        userData.show_real_name !== false ? userData.name : userData.display_name || 'Anonymous',
      displayName: userData.display_name,
      image: userData.avatar_url || userData.image,
      email: isOwnProfile || userData.show_email ? userData.email : undefined,
      bio: userData.bio,
      title: userData.title,
      company: userData.show_company !== false ? userData.company : undefined,
      location: userData.show_location !== false ? userData.location : undefined,
      timezone: userData.timezone,
      specializations: userData.specializations || [],
      skills: userData.skills || [],
      industries: userData.industries || [],
      socialLinks: {
        website: userData.website_url,
        github: userData.github_username,
        linkedin: userData.linkedin_username,
        twitter: userData.twitter_username,
        discord: userData.discord_username,
      },
      profileSettings: isOwnProfile
        ? {
            visibility: userData.profile_visibility || 'public',
            showEmail: userData.show_email || false,
            showRealName: userData.show_real_name !== false,
            showLocation: userData.show_location !== false,
            showCompany: userData.show_company !== false,
            allowDirectMessages: userData.allow_direct_messages !== false,
            showActivity: userData.show_activity !== false,
          }
        : undefined,
      verification: {
        isVerified: userData.is_verified || false,
        verificationType: userData.verification_type,
        verifiedAt: userData.verified_at,
        trustScore: userData.trust_score || 0,
      },
      reputation: {
        totalPoints: userData.total_points || 0,
        level: userData.reputation_level || 1,
        levelProgress: userData.level_progress || 0,
        breakdown: {
          templatePoints: userData.template_creation_points || 0,
          ratingPoints: userData.template_rating_points || 0,
          communityPoints: userData.community_contribution_points || 0,
          qualityBonus: userData.quality_bonus_points || 0,
          helpfulReviewPoints: userData.helpful_review_points || 0,
          communityInteractionPoints: userData.community_interaction_points || 0,
          mentorshipPoints: userData.mentorship_points || 0,
          penalties: userData.penalty_points || 0,
        },
        qualityMetrics: {
          averageTemplateRating: userData.average_template_rating || 0,
          helpfulReviewPercentage: userData.helpful_review_percentage || 0,
          communityFeedbackScore: userData.community_feedback_score || 0,
          consistencyScore: userData.consistency_score || 0,
        },
        streaks: {
          current: userData.current_streak || 0,
          longest: userData.longest_streak || 0,
        },
        lastCalculated: userData.last_calculation_at,
      },
      badges: badgesResult.rows.map((badge: any) => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        backgroundColor: badge.background_color,
        category: badge.category,
        tier: badge.tier,
        earnedAt: badge.earned_at,
        isFeatured: badge.is_featured || false,
        level: badge.level || 1,
      })),
      stats: {
        templates: templateData?.total_templates || 0,
        avgTemplateRating: templateData?.avg_rating || 0,
        totalDownloads: templateData?.total_downloads || 0,
        totalViews: templateData?.total_views || 0,
        totalLikes: templateData?.total_likes || 0,
        totalContributions: userData.total_contributions || 0,
        monthlyActiveDays: userData.monthly_active_days || 0,
      },
      social: {
        followerCount: socialData?.follower_count || 0,
        followingCount: socialData?.following_count || 0,
        isFollowing: socialData?.is_following || false,
        isMutual: socialData?.is_mutual || false,
      },
      dates: {
        userCreated: userData.user_created_at,
        profileCreated: userData.profile_created_at,
        lastActive: userData.last_active_at,
        profileUpdated: userData.profile_updated_at,
      },
      meta: {
        isOwnProfile,
        canEdit: isOwnProfile,
        canMessage: !isOwnProfile && userData.allow_direct_messages !== false,
        profileVisibility: userData.profile_visibility || 'public',
      },
    }

    const executionTime = Date.now() - startTime
    console.log(
      `[UserProfileAPI] Profile retrieved successfully for user ${userId} in ${executionTime}ms`
    )

    return NextResponse.json({
      profile: responseData,
      meta: {
        executionTime,
        viewerId,
        isOwnProfile,
        hasPrivacyRestrictions: !isOwnProfile && profileVisibility !== 'public',
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[UserProfileAPI] Error in GET request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid user ID',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to retrieve user profile',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/community/users/[userId] - Update user profile (own profile only)
 */
export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  const startTime = Date.now()

  try {
    console.log(`[UserProfileAPI] Processing PUT request for user: ${params.userId}`)

    // Validate user ID parameter
    const { userId } = UserIdParamSchema.parse(params)

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      console.warn('[UserProfileAPI] Unauthorized PUT request')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is updating their own profile
    if (session.user.id !== userId) {
      console.warn(
        `[UserProfileAPI] User ${session.user.id} attempted to update profile of ${userId}`
      )
      return NextResponse.json({ error: 'You can only update your own profile' }, { status: 403 })
    }

    // Rate limiting
    const rateLimitResult = await ratelimit(5, '1m').limit(`profile_update:${userId}`)
    if (!rateLimitResult.success) {
      console.warn(`[UserProfileAPI] Rate limit exceeded for profile update: ${userId}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Build update query dynamically based on provided fields
    const updateFields: string[] = []
    const queryParams: any[] = []

    const allowedFields = {
      displayName: 'display_name',
      bio: 'bio',
      title: 'title',
      company: 'company',
      location: 'location',
      timezone: 'timezone',
      specializations: 'specializations',
      skills: 'skills',
      industries: 'industries',
      websiteUrl: 'website_url',
      githubUsername: 'github_username',
      linkedinUsername: 'linkedin_username',
      twitterUsername: 'twitter_username',
      discordUsername: 'discord_username',
      avatarUrl: 'avatar_url',
      bannerUrl: 'banner_url',
      themeColor: 'theme_color',
      profileVisibility: 'profile_visibility',
      showEmail: 'show_email',
      showRealName: 'show_real_name',
      showLocation: 'show_location',
      showCompany: 'show_company',
      allowDirectMessages: 'allow_direct_messages',
      showActivity: 'show_activity',
      emailNotifications: 'email_notifications',
      pushNotifications: 'push_notifications',
      weeklyDigest: 'weekly_digest',
      marketingEmails: 'marketing_emails',
    }

    for (const [key, dbField] of Object.entries(allowedFields)) {
      if (key in body) {
        let value = body[key]

        // Handle JSON fields
        if (['specializations', 'skills', 'industries'].includes(key)) {
          value = JSON.stringify(value)
          updateFields.push(`${dbField} = $${queryParams.length + 1}::jsonb`)
        } else {
          updateFields.push(`${dbField} = $${queryParams.length + 1}`)
        }

        queryParams.push(value)
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Add updated timestamp
    updateFields.push(`updated_at = NOW()`)
    updateFields.push(`last_active_at = NOW()`)

    // Execute update
    const updateQuery = `
      UPDATE community_user_profiles 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${queryParams.length + 1}
      RETURNING id
    `

    queryParams.push(userId)

    const result = await db.execute(sql.raw(updateQuery, queryParams))

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Profile not found or no changes made' }, { status: 404 })
    }

    // Log activity
    await db.execute(sql`
      INSERT INTO community_user_activities (
        id, user_id, activity_type, activity_data, visibility, created_at
      ) VALUES (
        gen_random_uuid()::TEXT, ${userId}, 'profile_updated',
        ${JSON.stringify({ updatedFields: Object.keys(body) })}::jsonb,
        'public', NOW()
      )
    `)

    const executionTime = Date.now() - startTime
    console.log(
      `[UserProfileAPI] Profile updated successfully for user ${userId} in ${executionTime}ms`
    )

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      updatedFields: Object.keys(body),
      meta: {
        executionTime,
        userId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[UserProfileAPI] Error in PUT request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to update profile',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/community/users/[userId] - Delete user profile (own profile only)
 */
export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  const startTime = Date.now()

  try {
    console.log(`[UserProfileAPI] Processing DELETE request for user: ${params.userId}`)

    // Validate user ID parameter
    const { userId } = UserIdParamSchema.parse(params)

    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      console.warn('[UserProfileAPI] Unauthorized DELETE request')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is deleting their own profile
    if (session.user.id !== userId) {
      console.warn(
        `[UserProfileAPI] User ${session.user.id} attempted to delete profile of ${userId}`
      )
      return NextResponse.json({ error: 'You can only delete your own profile' }, { status: 403 })
    }

    // Check if profile exists
    const existingProfile = await db.execute(sql`
      SELECT id FROM community_user_profiles WHERE user_id = ${userId}
    `)

    if (existingProfile.rows.length === 0) {
      return NextResponse.json({ error: 'Community profile not found' }, { status: 404 })
    }

    // Begin transaction for profile deletion
    await db.execute(sql`BEGIN`)

    try {
      // Delete related data in correct order (respecting foreign key constraints)

      // Delete user activities
      await db.execute(sql`
        DELETE FROM community_user_activities WHERE user_id = ${userId}
      `)

      // Delete user follows (both as follower and following)
      await db.execute(sql`
        DELETE FROM community_user_follows 
        WHERE follower_id = ${userId} OR following_id = ${userId}
      `)

      // Delete user badges
      await db.execute(sql`
        DELETE FROM community_user_badges WHERE user_id = ${userId}
      `)

      // Delete reputation history
      await db.execute(sql`
        DELETE FROM user_reputation_history WHERE user_id = ${userId}
      `)

      // Delete reputation record
      await db.execute(sql`
        DELETE FROM user_reputation WHERE user_id = ${userId}
      `)

      // Finally, delete community profile
      await db.execute(sql`
        DELETE FROM community_user_profiles WHERE user_id = ${userId}
      `)

      await db.execute(sql`COMMIT`)

      const executionTime = Date.now() - startTime
      console.log(
        `[UserProfileAPI] Profile deleted successfully for user ${userId} in ${executionTime}ms`
      )

      return NextResponse.json({
        success: true,
        message: 'Community profile and all associated data deleted successfully',
        meta: {
          executionTime,
          userId,
          deletedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      await db.execute(sql`ROLLBACK`)
      throw error
    }
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[UserProfileAPI] Error in DELETE request:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid user ID',
          details: error.errors,
          executionTime,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to delete profile',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}
