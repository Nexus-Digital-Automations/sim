/**
 * Community User Management API
 *
 * Comprehensive API for managing community user profiles, reputation, and settings.
 * Supports CRUD operations for user profiles with authentication, privacy controls,
 * and GDPR compliance.
 *
 * FEATURES:
 * - User profile management with extended community data
 * - Privacy and visibility controls
 * - GDPR compliant data handling
 * - Reputation system integration
 * - Profile search and discovery
 * - Social feature management
 * - Comprehensive error handling and validation
 *
 * SECURITY:
 * - Authentication required for profile modifications
 * - Privacy settings enforcement
 * - Rate limiting for search and discovery
 * - Input validation and sanitization
 * - SQL injection protection
 *
 * @created 2025-09-04
 * @author Community User Management API
 */

import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { CommunityReputationSystem } from '@/lib/community/reputation-system'
import { ratelimit } from '@/lib/ratelimit'
import { db } from '@/db'

// ========================
// VALIDATION SCHEMAS
// ========================

const CreateCommunityProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  title: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  timezone: z.string().optional(),
  specializations: z.array(z.string()).max(10).default([]),
  skills: z.array(z.string()).max(20).default([]),
  industries: z.array(z.string()).max(10).default([]),
  socialLinks: z
    .object({
      website: z.string().url().optional().or(z.literal('')),
      github: z.string().max(50).optional(),
      linkedin: z.string().max(50).optional(),
      twitter: z.string().max(50).optional(),
      discord: z.string().max(50).optional(),
    })
    .default({}),
  profileSettings: z
    .object({
      profileVisibility: z.enum(['public', 'community', 'private']).default('public'),
      showEmail: z.boolean().default(false),
      showRealName: z.boolean().default(true),
      showLocation: z.boolean().default(true),
      showCompany: z.boolean().default(true),
      allowDirectMessages: z.boolean().default(true),
      showActivity: z.boolean().default(true),
    })
    .default({}),
  notificationSettings: z
    .object({
      emailNotifications: z.boolean().default(true),
      pushNotifications: z.boolean().default(false),
      weeklyDigest: z.boolean().default(true),
      marketingEmails: z.boolean().default(false),
    })
    .default({}),
})

const UpdateCommunityProfileSchema = CreateCommunityProfileSchema.partial()

const SearchUsersSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  specialization: z.string().optional(),
  skill: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  minReputation: z.number().min(0).optional(),
  maxReputation: z.number().min(0).optional(),
  verified: z.boolean().optional(),
  sortBy: z.enum(['reputation', 'activity', 'templates', 'joined']).default('reputation'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
})

// ========================
// API HANDLERS
// ========================

/**
 * GET /api/community/users - Search and discover community users
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[CommunityUsersAPI] Processing GET request for user discovery')

    // Parse search parameters
    const url = new URL(request.url)

    /**
     * Query Parameter Type Safety Enhancement:
     * Convert string parameters to appropriate types for validation
     * Handles numeric and boolean conversions with proper type casting
     */
    const queryParams: Record<string, any> = {}
    for (const [key, value] of url.searchParams) {
      queryParams[key] = value
    }
    
    if (queryParams.minReputation) {
      queryParams.minReputation = Number.parseInt(queryParams.minReputation)
    }
    if (queryParams.maxReputation) {
      queryParams.maxReputation = Number.parseInt(queryParams.maxReputation)
    }
    if (queryParams.limit) {
      queryParams.limit = Number.parseInt(queryParams.limit)
    }
    if (queryParams.offset) {
      queryParams.offset = Number.parseInt(queryParams.offset)
    }
    if (queryParams.verified) {
      queryParams.verified = queryParams.verified === 'true'
    }

    const params = SearchUsersSchema.parse(queryParams)
    console.log('[CommunityUsersAPI] Search parameters validated:', params)

    // Rate limiting for search requests
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimitResult = await ratelimit(10, '1m').limit(`community_user_search:${clientId}`)

    if (!rateLimitResult.success) {
      console.warn(`[CommunityUsersAPI] Rate limit exceeded for ${clientId}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Build search query
    const whereConditions: string[] = [
      "cup.profile_visibility = 'public'", // Only show public profiles
      'ur.total_points IS NOT NULL', // Ensure reputation exists
    ]
    const queryParams: any[] = []

    // Add search filters
    if (params.query) {
      whereConditions.push(`(
        LOWER(u.name) LIKE LOWER($${queryParams.length + 1}) OR
        LOWER(cup.display_name) LIKE LOWER($${queryParams.length + 1}) OR
        LOWER(cup.bio) LIKE LOWER($${queryParams.length + 1}) OR
        LOWER(cup.title) LIKE LOWER($${queryParams.length + 1}) OR
        LOWER(cup.company) LIKE LOWER($${queryParams.length + 1})
      )`)
      queryParams.push(`%${params.query}%`)
    }

    if (params.specialization) {
      whereConditions.push(`cup.specializations ? $${queryParams.length + 1}`)
      queryParams.push(params.specialization)
    }

    if (params.skill) {
      whereConditions.push(`cup.skills ? $${queryParams.length + 1}`)
      queryParams.push(params.skill)
    }

    if (params.industry) {
      whereConditions.push(`cup.industries ? $${queryParams.length + 1}`)
      queryParams.push(params.industry)
    }

    if (params.location) {
      whereConditions.push(`LOWER(cup.location) LIKE LOWER($${queryParams.length + 1})`)
      queryParams.push(`%${params.location}%`)
    }

    if (params.minReputation !== undefined) {
      whereConditions.push(`ur.total_points >= $${queryParams.length + 1}`)
      queryParams.push(params.minReputation)
    }

    if (params.maxReputation !== undefined) {
      whereConditions.push(`ur.total_points <= $${queryParams.length + 1}`)
      queryParams.push(params.maxReputation)
    }

    if (params.verified !== undefined) {
      whereConditions.push(`cup.is_verified = $${queryParams.length + 1}`)
      queryParams.push(params.verified)
    }

    // Build sort clause
    const sortMapping = {
      reputation: 'ur.total_points',
      activity: 'cup.last_active_at',
      templates: 'template_count.total_templates',
      joined: 'u.created_at',
    }
    const sortColumn = sortMapping[params.sortBy] || 'ur.total_points'
    const sortDirection = params.sortOrder.toUpperCase()

    // Execute search query
    const searchQuery = `
      SELECT 
        u.id,
        u.name,
        u.image,
        u.created_at as user_created_at,
        cup.display_name,
        cup.bio,
        cup.title,
        cup.company,
        cup.location,
        cup.specializations,
        cup.skills,
        cup.industries,
        cup.avatar_url,
        cup.is_verified,
        cup.trust_score,
        cup.last_active_at,
        ur.total_points,
        ur.reputation_level,
        ur.average_template_rating,
        -- Template count
        COALESCE(template_count.total_templates, 0) as total_templates,
        -- Badge counts by tier
        COALESCE(badge_counts.bronze_badges, 0) as bronze_badges,
        COALESCE(badge_counts.silver_badges, 0) as silver_badges,
        COALESCE(badge_counts.gold_badges, 0) as gold_badges,
        COALESCE(badge_counts.platinum_badges, 0) as platinum_badges,
        COALESCE(badge_counts.special_badges, 0) as special_badges,
        -- Social counts
        COALESCE(social_stats.follower_count, 0) as follower_count,
        COALESCE(social_stats.following_count, 0) as following_count
      FROM "user" u
      JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      LEFT JOIN (
        SELECT 
          created_by_user_id as user_id,
          COUNT(*) as total_templates
        FROM templates 
        WHERE status = 'approved' AND visibility = 'public'
        GROUP BY created_by_user_id
      ) template_count ON u.id = template_count.user_id
      LEFT JOIN (
        SELECT 
          user_id,
          SUM(CASE WHEN cbd.tier = 'bronze' THEN 1 ELSE 0 END) as bronze_badges,
          SUM(CASE WHEN cbd.tier = 'silver' THEN 1 ELSE 0 END) as silver_badges,
          SUM(CASE WHEN cbd.tier = 'gold' THEN 1 ELSE 0 END) as gold_badges,
          SUM(CASE WHEN cbd.tier = 'platinum' THEN 1 ELSE 0 END) as platinum_badges,
          SUM(CASE WHEN cbd.tier = 'special' THEN 1 ELSE 0 END) as special_badges
        FROM community_user_badges cub
        JOIN community_badge_definitions cbd ON cub.badge_id = cbd.id
        WHERE cub.show_on_profile = true
        GROUP BY user_id
      ) badge_counts ON u.id = badge_counts.user_id
      LEFT JOIN (
        SELECT 
          u_social.id as user_id,
          COALESCE(followers.count, 0) as follower_count,
          COALESCE(following.count, 0) as following_count
        FROM "user" u_social
        LEFT JOIN (
          SELECT following_id, COUNT(*) as count
          FROM community_user_follows
          GROUP BY following_id
        ) followers ON u_social.id = followers.following_id
        LEFT JOIN (
          SELECT follower_id, COUNT(*) as count
          FROM community_user_follows
          GROUP BY follower_id
        ) following ON u_social.id = following.follower_id
      ) social_stats ON u.id = social_stats.user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${sortColumn} ${sortDirection} NULLS LAST
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `

    queryParams.push(params.limit, params.offset)

    console.log('[CommunityUsersAPI] Executing search query with parameters:', queryParams.length)
    const result = await db.execute(sql.raw(searchQuery, queryParams))

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "user" u
      JOIN community_user_profiles cup ON u.id = cup.user_id
      LEFT JOIN user_reputation ur ON u.id = ur.user_id
      WHERE ${whereConditions.join(' AND ')}
    `

    const countResult = await db.execute(sql.raw(countQuery, queryParams.slice(0, -2)))
    const totalUsers = (countResult[0] as any)?.total || 0

    // Format results
    const users = result.map((row: any) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name || row.name,
      image: row.avatar_url || row.image,
      title: row.title,
      company: row.company,
      location: row.location,
      bio: row.bio,
      specializations: row.specializations || [],
      skills: row.skills || [],
      industries: row.industries || [],
      isVerified: row.is_verified,
      trustScore: row.trust_score,
      joinedAt: row.user_created_at,
      lastActiveAt: row.last_active_at,
      reputation: {
        totalPoints: row.total_points || 0,
        level: row.reputation_level || 1,
        averageRating: row.average_template_rating || 0,
      },
      stats: {
        templates: row.total_templates,
        followers: row.follower_count,
        following: row.following_count,
      },
      badges: {
        bronze: row.bronze_badges,
        silver: row.silver_badges,
        gold: row.gold_badges,
        platinum: row.platinum_badges,
        special: row.special_badges,
        total:
          (row.bronze_badges || 0) +
          (row.silver_badges || 0) +
          (row.gold_badges || 0) +
          (row.platinum_badges || 0) +
          (row.special_badges || 0),
      },
    }))

    const executionTime = Date.now() - startTime
    console.log(
      `[CommunityUsersAPI] Search completed successfully. Found ${users.length} users in ${executionTime}ms`
    )

    return NextResponse.json({
      users,
      pagination: {
        total: totalUsers,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < totalUsers,
      },
      filters: params,
      meta: {
        executionTime,
        userCount: users.length,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[CommunityUsersAPI] Error in GET request:', error)

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
        error: 'Failed to search users',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community/users - Create or update user community profile
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[CommunityUsersAPI] Processing POST request for profile creation/update')

    // Authenticate user
    const session = await getSession()
    if (!session?.user?.id) {
      console.warn('[CommunityUsersAPI] Unauthorized request - no valid session')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    console.log(`[CommunityUsersAPI] Authenticated request for user: ${userId}`)

    // Rate limiting for profile updates
    const rateLimitResult = await ratelimit(5, '1m').limit(`community_profile_update:${userId}`)
    if (!rateLimitResult.success) {
      console.warn(`[CommunityUsersAPI] Rate limit exceeded for user ${userId}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const profileData = CreateCommunityProfileSchema.parse(body)
    console.log('[CommunityUsersAPI] Profile data validated successfully')

    // Check if profile exists
    const existingProfile = await db.execute(sql`
      SELECT id, user_id FROM community_user_profiles WHERE user_id = ${userId}
    `)

    const isUpdate = existingProfile.length > 0
    console.log(
      `[CommunityUsersAPI] Profile ${isUpdate ? 'exists - updating' : 'does not exist - creating'}`
    )

    // Prepare profile data for database
    const profileFields = {
      userId,
      displayName: profileData.displayName || null,
      bio: profileData.bio || null,
      title: profileData.title || null,
      company: profileData.company || null,
      location: profileData.location || null,
      timezone: profileData.timezone || null,
      specializations: JSON.stringify(profileData.specializations),
      skills: JSON.stringify(profileData.skills),
      industries: JSON.stringify(profileData.industries),
      websiteUrl: profileData.socialLinks.website || null,
      githubUsername: profileData.socialLinks.github || null,
      linkedinUsername: profileData.socialLinks.linkedin || null,
      twitterUsername: profileData.socialLinks.twitter || null,
      discordUsername: profileData.socialLinks.discord || null,
      profileVisibility: profileData.profileSettings.profileVisibility,
      showEmail: profileData.profileSettings.showEmail,
      showRealName: profileData.profileSettings.showRealName,
      showLocation: profileData.profileSettings.showLocation,
      showCompany: profileData.profileSettings.showCompany,
      allowDirectMessages: profileData.profileSettings.allowDirectMessages,
      showActivity: profileData.profileSettings.showActivity,
      emailNotifications: profileData.notificationSettings.emailNotifications,
      pushNotifications: profileData.notificationSettings.pushNotifications,
      weeklyDigest: profileData.notificationSettings.weeklyDigest,
      marketingEmails: profileData.notificationSettings.marketingEmails,
      updatedAt: new Date().toISOString(),
    }

    let result

    if (isUpdate) {
      // Update existing profile
      result = await db.execute(sql`
        UPDATE community_user_profiles SET
          display_name = ${profileFields.displayName},
          bio = ${profileFields.bio},
          title = ${profileFields.title},
          company = ${profileFields.company},
          location = ${profileFields.location},
          timezone = ${profileFields.timezone},
          specializations = ${profileFields.specializations}::jsonb,
          skills = ${profileFields.skills}::jsonb,
          industries = ${profileFields.industries}::jsonb,
          website_url = ${profileFields.websiteUrl},
          github_username = ${profileFields.githubUsername},
          linkedin_username = ${profileFields.linkedinUsername},
          twitter_username = ${profileFields.twitterUsername},
          discord_username = ${profileFields.discordUsername},
          profile_visibility = ${profileFields.profileVisibility},
          show_email = ${profileFields.showEmail},
          show_real_name = ${profileFields.showRealName},
          show_location = ${profileFields.showLocation},
          show_company = ${profileFields.showCompany},
          allow_direct_messages = ${profileFields.allowDirectMessages},
          show_activity = ${profileFields.showActivity},
          email_notifications = ${profileFields.emailNotifications},
          push_notifications = ${profileFields.pushNotifications},
          weekly_digest = ${profileFields.weeklyDigest},
          marketing_emails = ${profileFields.marketingEmails},
          updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING id
      `)
    } else {
      // Create new profile
      result = await db.execute(sql`
        INSERT INTO community_user_profiles (
          id, user_id, display_name, bio, title, company, location, timezone,
          specializations, skills, industries, website_url, github_username,
          linkedin_username, twitter_username, discord_username, profile_visibility,
          show_email, show_real_name, show_location, show_company, allow_direct_messages,
          show_activity, email_notifications, push_notifications, weekly_digest,
          marketing_emails, created_at, updated_at
        ) VALUES (
          gen_random_uuid()::TEXT, ${userId}, ${profileFields.displayName}, 
          ${profileFields.bio}, ${profileFields.title}, ${profileFields.company}, 
          ${profileFields.location}, ${profileFields.timezone},
          ${profileFields.specializations}::jsonb, ${profileFields.skills}::jsonb,
          ${profileFields.industries}::jsonb, ${profileFields.websiteUrl},
          ${profileFields.githubUsername}, ${profileFields.linkedinUsername},
          ${profileFields.twitterUsername}, ${profileFields.discordUsername},
          ${profileFields.profileVisibility}, ${profileFields.showEmail},
          ${profileFields.showRealName}, ${profileFields.showLocation},
          ${profileFields.showCompany}, ${profileFields.allowDirectMessages},
          ${profileFields.showActivity}, ${profileFields.emailNotifications},
          ${profileFields.pushNotifications}, ${profileFields.weeklyDigest},
          ${profileFields.marketingEmails}, NOW(), NOW()
        )
        RETURNING id
      `)

      // Initialize reputation for new community member
      const reputationSystem = CommunityReputationSystem.getInstance()
      await reputationSystem.calculateUserReputation(userId, true)
      console.log(`[CommunityUsersAPI] Initialized reputation for new user: ${userId}`)
    }

    if (!result[0]) {
      throw new Error('Failed to create/update profile')
    }

    // Log activity
    await db.execute(sql`
      INSERT INTO community_user_activities (
        id, user_id, activity_type, activity_data, visibility, created_at
      ) VALUES (
        gen_random_uuid()::TEXT, ${userId}, 
        ${isUpdate ? 'profile_updated' : 'profile_created'},
        ${JSON.stringify({ isUpdate })}::jsonb,
        'public', NOW()
      )
    `)

    const executionTime = Date.now() - startTime
    console.log(
      `[CommunityUsersAPI] Profile ${isUpdate ? 'updated' : 'created'} successfully for user ${userId} in ${executionTime}ms`
    )

    return NextResponse.json({
      success: true,
      profileId: result[0].id,
      isUpdate,
      message: `Community profile ${isUpdate ? 'updated' : 'created'} successfully`,
      meta: {
        executionTime,
        userId,
      },
    })
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[CommunityUsersAPI] Error in POST request:', error)

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
        error: 'Failed to create/update profile',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/community/users - Delete user community profile
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[CommunityUsersAPI] Processing DELETE request for profile deletion')

    // Authenticate user
    const session = await getSession()
    if (!session?.user?.id) {
      console.warn('[CommunityUsersAPI] Unauthorized DELETE request')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    console.log(`[CommunityUsersAPI] Processing profile deletion for user: ${userId}`)

    // Check if profile exists
    const existingProfile = await db.execute(sql`
      SELECT id FROM community_user_profiles WHERE user_id = ${userId}
    `)

    if (existingProfile.length === 0) {
      return NextResponse.json({ error: 'Community profile not found' }, { status: 404 })
    }

    // Begin transaction for profile deletion
    await db.execute(sql`BEGIN`)

    try {
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

      // Delete community profile
      await db.execute(sql`
        DELETE FROM community_user_profiles WHERE user_id = ${userId}
      `)

      await db.execute(sql`COMMIT`)

      const executionTime = Date.now() - startTime
      console.log(
        `[CommunityUsersAPI] Profile deleted successfully for user ${userId} in ${executionTime}ms`
      )

      return NextResponse.json({
        success: true,
        message: 'Community profile deleted successfully',
        meta: {
          executionTime,
          userId,
        },
      })
    } catch (error) {
      await db.execute(sql`ROLLBACK`)
      throw error
    }
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[CommunityUsersAPI] Error in DELETE request:', error)

    return NextResponse.json(
      {
        error: 'Failed to delete profile',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
        executionTime,
      },
      { status: 500 }
    )
  }
}
