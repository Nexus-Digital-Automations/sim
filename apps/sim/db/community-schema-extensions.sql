/**
 * Community User Management System - Database Schema Extensions
 * 
 * Comprehensive community user management system to support Sim's community marketplace.
 * This schema extends the existing user system with reputation, badges, achievements,
 * and social features for template sharing and community engagement.
 * 
 * ARCHITECTURE OVERVIEW:
 * - User Profile Extensions: Enhanced profiles with bio, specializations, social links
 * - Reputation System: Point-based system tracking contributions and quality
 * - Badge System: Achievement badges for milestones and community recognition
 * - Social Features: Following, activity feeds, user relationships
 * - Privacy Controls: Granular settings for profile visibility and data sharing
 * - Anti-Gaming: Fraud detection and reputation protection mechanisms
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Efficient reputation calculation with materialized views
 * - Optimized indexing for user discovery and social queries
 * - Reputation history tracking for audit trails
 * - Activity feed optimization for real-time updates
 * 
 * INTEGRATION POINTS:
 * - Seamless integration with existing user and template systems
 * - Compatible with authentication and workspace management
 * - GDPR compliant with data protection and user consent
 * 
 * @created 2025-09-04
 * @author Community User Management System
 */

-- ========================
-- EXTENDED USER PROFILES
-- ========================

/**
 * Community user profiles table - Extended user information
 * 
 * Extends the core user system with community-specific profile data:
 * - Professional information and specializations
 * - Social links and contact preferences  
 * - Bio and personal branding
 * - Community settings and privacy controls
 * - Activity tracking and engagement metrics
 */
CREATE TABLE IF NOT EXISTS community_user_profiles (
  id TEXT PRIMARY KEY, -- UUID for profile identification
  user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE, -- Links to core user
  
  -- Extended profile information
  display_name TEXT, -- Public display name (can differ from user.name)
  bio TEXT, -- Personal bio and description (max 500 chars)
  title TEXT, -- Professional title (e.g., "Automation Engineer")
  company TEXT, -- Company or organization
  location TEXT, -- City, country for networking
  timezone TEXT, -- User timezone for collaboration
  
  -- Specializations and expertise
  specializations JSONB DEFAULT '[]', -- Array of expertise areas (e.g., ["CRM", "E-commerce"])
  skills JSONB DEFAULT '[]', -- Array of technical skills (e.g., ["JavaScript", "Python"])
  industries JSONB DEFAULT '[]', -- Array of industry experience (e.g., ["Healthcare", "Finance"])
  
  -- Social and contact information
  website_url TEXT, -- Personal or company website
  github_username TEXT, -- GitHub profile for developers
  linkedin_username TEXT, -- LinkedIn for professional networking
  twitter_username TEXT, -- Twitter for community engagement
  discord_username TEXT, -- Discord for community chat
  
  -- Profile customization
  avatar_url TEXT, -- Custom avatar (can override user.image)
  banner_url TEXT, -- Profile banner image
  theme_color TEXT DEFAULT '#6366F1', -- Profile theme color
  
  -- Privacy and visibility settings
  profile_visibility TEXT NOT NULL DEFAULT 'public', -- 'public', 'community', 'private'
  show_email BOOLEAN NOT NULL DEFAULT false, -- Display email publicly
  show_real_name BOOLEAN NOT NULL DEFAULT true, -- Display real name vs display_name
  show_location BOOLEAN NOT NULL DEFAULT true, -- Display location publicly
  show_company BOOLEAN NOT NULL DEFAULT true, -- Display company publicly
  allow_direct_messages BOOLEAN NOT NULL DEFAULT true, -- Allow community messages
  show_activity BOOLEAN NOT NULL DEFAULT true, -- Show public activity
  
  -- Community engagement settings
  email_notifications BOOLEAN NOT NULL DEFAULT true, -- Community email notifications
  push_notifications BOOLEAN NOT NULL DEFAULT false, -- Browser push notifications
  weekly_digest BOOLEAN NOT NULL DEFAULT true, -- Weekly community digest email
  marketing_emails BOOLEAN NOT NULL DEFAULT false, -- Marketing and promotional emails
  
  -- Verification and trust
  is_verified BOOLEAN NOT NULL DEFAULT false, -- Verified community member status
  verification_type TEXT, -- 'email', 'identity', 'organization', 'contribution'
  verified_at TIMESTAMP, -- When verification was completed
  trust_score DECIMAL(3,2) DEFAULT 0, -- Algorithmic trust score (0.00 to 1.00)
  
  -- Content and contribution preferences
  preferred_categories JSONB DEFAULT '[]', -- Preferred template categories
  content_language TEXT DEFAULT 'en', -- Preferred language for content
  expertise_level TEXT DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced', 'expert'
  
  -- Activity and engagement metrics
  last_active_at TIMESTAMP, -- Last community activity
  total_contributions INTEGER NOT NULL DEFAULT 0, -- Total community contributions
  monthly_active_days INTEGER NOT NULL DEFAULT 0, -- Days active this month
  
  -- Audit and timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Privacy compliance
  gdpr_consent_at TIMESTAMP, -- GDPR consent timestamp
  data_retention_until TIMESTAMP, -- Data retention period
  anonymization_requested BOOLEAN NOT NULL DEFAULT false -- User requested data anonymization
);

-- Indexes for community profile performance
CREATE INDEX IF NOT EXISTS community_profiles_user_id_idx ON community_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS community_profiles_visibility_idx ON community_user_profiles(profile_visibility);
CREATE INDEX IF NOT EXISTS community_profiles_verified_idx ON community_user_profiles(is_verified, trust_score DESC);
CREATE INDEX IF NOT EXISTS community_profiles_active_idx ON community_user_profiles(last_active_at DESC) WHERE profile_visibility = 'public';
CREATE INDEX IF NOT EXISTS community_profiles_specializations_gin_idx ON community_user_profiles USING gin(specializations);
CREATE INDEX IF NOT EXISTS community_profiles_skills_gin_idx ON community_user_profiles USING gin(skills);
CREATE INDEX IF NOT EXISTS community_profiles_industries_gin_idx ON community_user_profiles USING gin(industries);
CREATE INDEX IF NOT EXISTS community_profiles_search_idx ON community_user_profiles(display_name, bio, title, company);

-- ========================
-- REPUTATION SYSTEM
-- ========================

/**
 * User reputation table - Point-based reputation tracking
 * 
 * Comprehensive reputation system tracking user contributions and quality:
 * - Point-based scoring with different contribution types
 * - Reputation levels and milestone tracking
 * - Anti-gaming protection with decay and validation
 * - Historical tracking for transparency
 */
CREATE TABLE IF NOT EXISTS user_reputation (
  id TEXT PRIMARY KEY, -- UUID for reputation record
  user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE, -- User being scored
  
  -- Core reputation metrics
  total_points INTEGER NOT NULL DEFAULT 0, -- Total reputation points earned
  reputation_level INTEGER NOT NULL DEFAULT 1, -- Level based on points (1-100)
  level_progress DECIMAL(5,2) DEFAULT 0, -- Progress to next level (0.00-100.00)
  
  -- Contribution-based points
  template_creation_points INTEGER NOT NULL DEFAULT 0, -- Points from creating templates
  template_rating_points INTEGER NOT NULL DEFAULT 0, -- Points from quality ratings received
  community_contribution_points INTEGER NOT NULL DEFAULT 0, -- Points from reviews, help, etc.
  quality_bonus_points INTEGER NOT NULL DEFAULT 0, -- Bonus points for exceptional quality
  
  -- Engagement-based points
  helpful_review_points INTEGER NOT NULL DEFAULT 0, -- Points from helpful reviews written
  community_interaction_points INTEGER NOT NULL DEFAULT 0, -- Points from discussions, Q&A
  mentorship_points INTEGER NOT NULL DEFAULT 0, -- Points from helping other users
  
  -- Quality metrics
  average_template_rating DECIMAL(3,2) DEFAULT 0, -- Average rating of user's templates
  helpful_review_percentage DECIMAL(5,2) DEFAULT 0, -- % of reviews marked as helpful
  community_feedback_score DECIMAL(3,2) DEFAULT 0, -- Community feedback score
  consistency_score DECIMAL(3,2) DEFAULT 0, -- Consistency of contributions over time
  
  -- Reputation modifiers
  penalty_points INTEGER NOT NULL DEFAULT 0, -- Points lost due to violations
  bonus_multiplier DECIMAL(3,2) DEFAULT 1.00, -- Multiplier for verified users, etc.
  decay_applied INTEGER NOT NULL DEFAULT 0, -- Points lost to inactivity decay
  
  -- Milestone tracking
  current_streak INTEGER NOT NULL DEFAULT 0, -- Current contribution streak (days)
  longest_streak INTEGER NOT NULL DEFAULT 0, -- Longest contribution streak achieved
  milestones_achieved JSONB DEFAULT '[]', -- Array of milestone achievements
  
  -- Anti-gaming protection
  rapid_point_gain_flags INTEGER NOT NULL DEFAULT 0, -- Suspicious activity flags
  point_source_diversity DECIMAL(3,2) DEFAULT 0, -- Diversity of point sources (anti-gaming)
  peer_validation_score DECIMAL(3,2) DEFAULT 0, -- Peer validation of contributions
  
  -- Reputation history and transparency
  last_calculation_at TIMESTAMP NOT NULL DEFAULT NOW(), -- Last reputation update
  calculation_version INTEGER NOT NULL DEFAULT 1, -- Algorithm version used
  manual_adjustments INTEGER NOT NULL DEFAULT 0, -- Manual moderator adjustments
  
  -- Audit and timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for reputation system performance
CREATE INDEX IF NOT EXISTS user_reputation_user_id_idx ON user_reputation(user_id);
CREATE INDEX IF NOT EXISTS user_reputation_total_points_idx ON user_reputation(total_points DESC);
CREATE INDEX IF NOT EXISTS user_reputation_level_idx ON user_reputation(reputation_level DESC, level_progress DESC);
CREATE INDEX IF NOT EXISTS user_reputation_updated_idx ON user_reputation(updated_at DESC);

/**
 * Reputation history table - Audit trail of reputation changes
 * 
 * Detailed logging of all reputation changes for transparency and debugging
 */
CREATE TABLE IF NOT EXISTS user_reputation_history (
  id TEXT PRIMARY KEY, -- UUID for history record
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, -- User whose reputation changed
  
  -- Change details
  change_type TEXT NOT NULL, -- 'earned', 'penalty', 'decay', 'bonus', 'manual_adjustment'
  points_change INTEGER NOT NULL, -- Points added or subtracted (can be negative)
  previous_total INTEGER NOT NULL, -- Total points before change
  new_total INTEGER NOT NULL, -- Total points after change
  
  -- Source and context
  source_type TEXT NOT NULL, -- 'template_creation', 'rating_received', 'review_written', etc.
  source_id TEXT, -- ID of the template, review, etc. that caused the change
  source_context JSONB DEFAULT '{}', -- Additional context data
  
  -- Change metadata
  reason TEXT, -- Human-readable reason for the change
  triggered_by TEXT, -- 'system', 'user_action', 'moderator', 'algorithm'
  algorithm_version INTEGER DEFAULT 1, -- Version of reputation algorithm used
  
  -- Moderation and validation
  is_validated BOOLEAN NOT NULL DEFAULT false, -- Whether change was validated by system
  moderator_id TEXT REFERENCES "user"(id) ON DELETE SET NULL, -- Moderator who made manual changes
  reversal_id TEXT REFERENCES user_reputation_history(id), -- If this change was reversed
  
  -- Audit timestamp
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for reputation history
CREATE INDEX IF NOT EXISTS reputation_history_user_id_idx ON user_reputation_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reputation_history_source_idx ON user_reputation_history(source_type, source_id);
CREATE INDEX IF NOT EXISTS reputation_history_change_type_idx ON user_reputation_history(change_type, created_at DESC);

-- ========================
-- BADGE AND ACHIEVEMENT SYSTEM
-- ========================

/**
 * Badge definitions table - Available badges and achievements
 * 
 * Defines the available badges that users can earn through various activities
 */
CREATE TABLE IF NOT EXISTS community_badge_definitions (
  id TEXT PRIMARY KEY, -- UUID for badge definition
  
  -- Badge identity
  name TEXT NOT NULL UNIQUE, -- Badge name (e.g., "Template Master")
  slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier
  description TEXT NOT NULL, -- What this badge represents
  
  -- Badge visual design
  icon TEXT NOT NULL, -- Icon name (Lucide icon or custom)
  color TEXT NOT NULL DEFAULT '#6366F1', -- Badge color theme
  background_color TEXT DEFAULT '#EEF2FF', -- Badge background color
  icon_url TEXT, -- Custom icon URL if not using Lucide
  
  -- Badge categorization
  category TEXT NOT NULL, -- 'contribution', 'quality', 'milestone', 'special', 'community'
  tier TEXT NOT NULL DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum', 'special'
  difficulty TEXT NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard', 'legendary'
  
  -- Achievement criteria
  criteria_description TEXT NOT NULL, -- Human-readable criteria
  criteria_config JSONB NOT NULL, -- Machine-readable criteria configuration
  required_points INTEGER, -- Reputation points required (if applicable)
  required_actions INTEGER, -- Number of actions required
  
  -- Badge metadata
  is_active BOOLEAN NOT NULL DEFAULT true, -- Whether badge can be earned
  is_hidden BOOLEAN NOT NULL DEFAULT false, -- Hidden until earned (surprise badges)
  is_stackable BOOLEAN NOT NULL DEFAULT false, -- Can be earned multiple times
  max_awards INTEGER DEFAULT 1, -- Maximum times this badge can be awarded
  
  -- Rarity and exclusivity
  total_awarded INTEGER NOT NULL DEFAULT 0, -- Total number of times awarded
  award_percentage DECIMAL(5,2) DEFAULT 0, -- Percentage of users who have this badge
  
  -- Display and ordering
  display_order INTEGER NOT NULL DEFAULT 0, -- Order in badge lists
  show_on_profile BOOLEAN NOT NULL DEFAULT true, -- Display on user profiles
  
  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL -- Creator (admin/system)
);

-- Indexes for badge definitions
CREATE INDEX IF NOT EXISTS badge_definitions_category_idx ON community_badge_definitions(category, tier);
CREATE INDEX IF NOT EXISTS badge_definitions_active_idx ON community_badge_definitions(is_active, display_order);
CREATE INDEX IF NOT EXISTS badge_definitions_rarity_idx ON community_badge_definitions(award_percentage ASC);

/**
 * User badges table - Badges earned by users
 * 
 * Records badges awarded to users with earning context and display preferences
 */
CREATE TABLE IF NOT EXISTS community_user_badges (
  id TEXT PRIMARY KEY, -- UUID for badge award record
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, -- Badge recipient
  badge_id TEXT NOT NULL REFERENCES community_badge_definitions(id) ON DELETE CASCADE, -- Badge earned
  
  -- Award context
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(), -- When badge was earned
  earning_context JSONB DEFAULT '{}', -- Context data about how badge was earned
  source_id TEXT, -- ID of template, review, etc. that triggered badge
  source_type TEXT, -- 'template', 'review', 'milestone', 'manual'
  
  -- Award validation
  is_validated BOOLEAN NOT NULL DEFAULT true, -- Whether award is confirmed
  awarded_by TEXT DEFAULT 'system', -- 'system', 'moderator', 'peer_nomination'
  moderator_id TEXT REFERENCES "user"(id) ON DELETE SET NULL, -- Moderator who awarded
  
  -- Display preferences
  show_on_profile BOOLEAN NOT NULL DEFAULT true, -- Display on user profile
  is_featured BOOLEAN NOT NULL DEFAULT false, -- Featured badge on profile
  display_order INTEGER NOT NULL DEFAULT 0, -- Order on profile
  
  -- Badge progression (for stackable badges)
  level INTEGER NOT NULL DEFAULT 1, -- Level of this badge (for multi-level badges)
  progress_value INTEGER DEFAULT 0, -- Current progress toward next level
  
  -- Metadata
  celebration_shown BOOLEAN NOT NULL DEFAULT false, -- Whether celebration UI was shown
  announcement_sent BOOLEAN NOT NULL DEFAULT false, -- Whether announcement was sent
  
  UNIQUE(user_id, badge_id, level) -- Prevent duplicate badge awards at same level
);

-- Indexes for user badges
CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON community_user_badges(user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS user_badges_badge_id_idx ON community_user_badges(badge_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS user_badges_featured_idx ON community_user_badges(user_id, is_featured DESC);
CREATE INDEX IF NOT EXISTS user_badges_display_idx ON community_user_badges(user_id, show_on_profile, display_order);

-- ========================
-- SOCIAL FEATURES
-- ========================

/**
 * User following table - User-to-user following relationships
 * 
 * Manages social following relationships between community members
 */
CREATE TABLE IF NOT EXISTS community_user_follows (
  id TEXT PRIMARY KEY, -- UUID for follow relationship
  follower_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, -- User who follows
  following_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, -- User being followed
  
  -- Follow metadata
  followed_at TIMESTAMP NOT NULL DEFAULT NOW(), -- When follow relationship started
  notification_enabled BOOLEAN NOT NULL DEFAULT true, -- Notifications for followed user's activity
  
  -- Follow source and context
  follow_source TEXT DEFAULT 'manual', -- 'manual', 'suggestion', 'template_author', 'collaboration'
  follow_reason TEXT, -- Optional reason for following
  
  -- Mutual relationship tracking
  is_mutual BOOLEAN NOT NULL DEFAULT false, -- Whether the follow is mutual
  
  UNIQUE(follower_id, following_id), -- Prevent duplicate follows
  CHECK(follower_id != following_id) -- Prevent self-following
);

-- Indexes for user follows
CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON community_user_follows(follower_id, followed_at DESC);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON community_user_follows(following_id, followed_at DESC);
CREATE INDEX IF NOT EXISTS user_follows_mutual_idx ON community_user_follows(is_mutual) WHERE is_mutual = true;

/**
 * User activity feed table - Community activity tracking
 * 
 * Tracks user activities for social feeds and community engagement
 */
CREATE TABLE IF NOT EXISTS community_user_activities (
  id TEXT PRIMARY KEY, -- UUID for activity record
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, -- User who performed activity
  
  -- Activity details
  activity_type TEXT NOT NULL, -- 'template_created', 'review_posted', 'badge_earned', etc.
  activity_data JSONB NOT NULL DEFAULT '{}', -- Activity-specific data
  
  -- Activity targets and references
  target_type TEXT, -- 'template', 'review', 'user', 'badge'
  target_id TEXT, -- ID of the target object
  target_title TEXT, -- Display title of target
  
  -- Visibility and privacy
  visibility TEXT NOT NULL DEFAULT 'public', -- 'public', 'followers', 'private'
  is_featured BOOLEAN NOT NULL DEFAULT false, -- Featured activity (highlighted)
  
  -- Engagement tracking
  like_count INTEGER NOT NULL DEFAULT 0, -- Likes on this activity
  comment_count INTEGER NOT NULL DEFAULT 0, -- Comments on this activity
  
  -- Activity metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP, -- When activity should be removed from feeds
  
  -- Moderation
  is_hidden BOOLEAN NOT NULL DEFAULT false, -- Hidden by moderators
  hide_reason TEXT -- Reason for hiding activity
);

-- Indexes for activity feed
CREATE INDEX IF NOT EXISTS user_activities_user_id_idx ON community_user_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_activities_visibility_idx ON community_user_activities(visibility, created_at DESC) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS user_activities_type_idx ON community_user_activities(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS user_activities_target_idx ON community_user_activities(target_type, target_id);

-- ========================
-- TRIGGERS AND AUTOMATION
-- ========================

/**
 * Trigger: Update user reputation when templates are rated
 */
CREATE OR REPLACE FUNCTION update_user_reputation_from_ratings()
RETURNS TRIGGER AS $$
BEGIN
  -- Update template author's reputation based on new rating
  UPDATE user_reputation 
  SET 
    template_rating_points = (
      SELECT COALESCE(SUM(rating), 0) * 10 -- 10 points per star received
      FROM template_ratings tr 
      JOIN templates t ON tr.template_id = t.id 
      WHERE t.created_by_user_id = (
        SELECT created_by_user_id 
        FROM templates 
        WHERE id = NEW.template_id
      )
      AND tr.is_approved = true
    ),
    average_template_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM template_ratings tr 
      JOIN templates t ON tr.template_id = t.id 
      WHERE t.created_by_user_id = (
        SELECT created_by_user_id 
        FROM templates 
        WHERE id = NEW.template_id
      )
      AND tr.is_approved = true
    ),
    updated_at = NOW()
  WHERE user_id = (
    SELECT created_by_user_id 
    FROM templates 
    WHERE id = NEW.template_id
  );
  
  -- Recalculate total points
  UPDATE user_reputation 
  SET total_points = template_creation_points + template_rating_points + 
                    community_contribution_points + quality_bonus_points + 
                    helpful_review_points + community_interaction_points + 
                    mentorship_points - penalty_points
  WHERE user_id = (
    SELECT created_by_user_id 
    FROM templates 
    WHERE id = NEW.template_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for reputation updates
CREATE TRIGGER update_reputation_on_template_rating
  AFTER INSERT OR UPDATE ON template_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reputation_from_ratings();

/**
 * Trigger: Update follow count and mutual status
 */
CREATE OR REPLACE FUNCTION update_follow_relationships()
RETURNS TRIGGER AS $$
BEGIN
  -- Update mutual follow status
  IF TG_OP = 'INSERT' THEN
    -- Check if this creates a mutual follow
    UPDATE community_user_follows 
    SET is_mutual = true 
    WHERE follower_id = NEW.following_id 
      AND following_id = NEW.follower_id;
    
    -- Update the new follow if it's mutual
    UPDATE community_user_follows 
    SET is_mutual = true 
    WHERE id = NEW.id 
      AND EXISTS (
        SELECT 1 FROM community_user_follows 
        WHERE follower_id = NEW.following_id 
          AND following_id = NEW.follower_id
      );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Remove mutual status from the reverse relationship
    UPDATE community_user_follows 
    SET is_mutual = false 
    WHERE follower_id = OLD.following_id 
      AND following_id = OLD.follower_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for follow relationship updates
CREATE TRIGGER update_follow_relationships_trigger
  AFTER INSERT OR DELETE ON community_user_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_relationships();

/**
 * Function: Award badge to user
 */
CREATE OR REPLACE FUNCTION award_user_badge(
  p_user_id TEXT,
  p_badge_slug TEXT,
  p_source_type TEXT DEFAULT 'system',
  p_source_id TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  badge_def RECORD;
  existing_badge RECORD;
BEGIN
  -- Get badge definition
  SELECT * INTO badge_def 
  FROM community_badge_definitions 
  WHERE slug = p_badge_slug AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if user already has this badge (for non-stackable badges)
  SELECT * INTO existing_badge 
  FROM community_user_badges 
  WHERE user_id = p_user_id AND badge_id = badge_def.id;
  
  IF FOUND AND NOT badge_def.is_stackable THEN
    RETURN false; -- Badge already awarded and not stackable
  END IF;
  
  -- Award the badge
  INSERT INTO community_user_badges (
    id, user_id, badge_id, earning_context, 
    source_type, source_id, earned_at
  ) VALUES (
    gen_random_uuid()::TEXT, p_user_id, badge_def.id, p_context,
    p_source_type, p_source_id, NOW()
  );
  
  -- Update badge statistics
  UPDATE community_badge_definitions 
  SET total_awarded = total_awarded + 1
  WHERE id = badge_def.id;
  
  -- Log activity
  INSERT INTO community_user_activities (
    id, user_id, activity_type, activity_data, 
    target_type, target_id, target_title, visibility
  ) VALUES (
    gen_random_uuid()::TEXT, p_user_id, 'badge_earned', 
    jsonb_build_object('badge_name', badge_def.name, 'badge_tier', badge_def.tier),
    'badge', badge_def.id, badge_def.name, 'public'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ========================
-- INITIAL DATA SEEDING
-- ========================

/**
 * Seed default badge definitions
 */
INSERT INTO community_badge_definitions (id, name, slug, description, icon, color, category, tier, criteria_description, criteria_config) VALUES
-- Contribution badges
('badge_first_template', 'First Template', 'first-template', 'Created your first community template', 'Zap', '#22C55E', 'contribution', 'bronze', 'Create and publish your first template', '{"action": "template_created", "count": 1}'),
('badge_template_master', 'Template Master', 'template-master', 'Created 10 high-quality templates', 'Crown', '#F59E0B', 'contribution', 'gold', 'Create 10 templates with average 4+ stars', '{"action": "template_created", "count": 10, "min_rating": 4.0}'),
('badge_helpful_reviewer', 'Helpful Reviewer', 'helpful-reviewer', 'Written 25 helpful reviews', 'ThumbsUp', '#3B82F6', 'community', 'silver', 'Write 25 reviews marked as helpful', '{"action": "helpful_reviews", "count": 25}'),

-- Quality badges  
('badge_five_star', 'Five Star Creator', 'five-star', 'Received a perfect 5-star rating', 'Star', '#EF4444', 'quality', 'silver', 'Receive at least one 5-star rating', '{"min_rating": 5.0, "min_reviews": 1}'),
('badge_quality_master', 'Quality Master', 'quality-master', 'Maintained 4.5+ average rating across 5+ templates', 'Award', '#7C3AED', 'quality', 'platinum', 'Average 4.5+ stars across 5+ templates', '{"min_avg_rating": 4.5, "min_templates": 5}'),

-- Milestone badges
('badge_reputation_1000', 'Reputation Hero', 'reputation-1000', 'Earned 1000 reputation points', 'TrendingUp', '#10B981', 'milestone', 'silver', 'Reach 1000 reputation points', '{"min_reputation": 1000}'),
('badge_reputation_5000', 'Reputation Legend', 'reputation-5000', 'Earned 5000 reputation points', 'Trophy', '#F59E0B', 'milestone', 'gold', 'Reach 5000 reputation points', '{"min_reputation": 5000}'),

-- Community badges
('badge_community_leader', 'Community Leader', 'community-leader', 'Helped 100 community members', 'Users', '#8B5CF6', 'community', 'gold', 'Help 100 community members through reviews, answers, and mentorship', '{"community_help_count": 100}'),
('badge_early_adopter', 'Early Adopter', 'early-adopter', 'One of the first 100 community members', 'Rocket', '#EC4899', 'special', 'special', 'Join the community in the first 100 members', '{"user_id_threshold": 100}')

ON CONFLICT (id) DO NOTHING;

-- Create initial reputation records for existing users
INSERT INTO user_reputation (id, user_id, created_at)
SELECT gen_random_uuid()::TEXT, id, NOW()
FROM "user" 
WHERE NOT EXISTS (
  SELECT 1 FROM user_reputation WHERE user_id = "user".id
);

-- ========================
-- VIEWS AND ANALYTICS
-- ========================

/**
 * Community leaderboard view - Top users by reputation
 */
CREATE OR REPLACE VIEW community_leaderboard AS
SELECT 
  u.id,
  u.name,
  u.image,
  cup.display_name,
  cup.title,
  cup.company,
  cup.specializations,
  ur.total_points,
  ur.reputation_level,
  ur.average_template_rating,
  ur.helpful_review_percentage,
  -- Badge count by tier
  COALESCE(badge_counts.bronze_badges, 0) as bronze_badges,
  COALESCE(badge_counts.silver_badges, 0) as silver_badges,
  COALESCE(badge_counts.gold_badges, 0) as gold_badges,
  COALESCE(badge_counts.platinum_badges, 0) as platinum_badges,
  COALESCE(badge_counts.special_badges, 0) as special_badges,
  -- Activity metrics
  template_count.total_templates,
  recent_activity.recent_activity_count,
  ur.updated_at as reputation_updated_at
FROM "user" u
JOIN user_reputation ur ON u.id = ur.user_id
LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
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
  SELECT created_by_user_id as user_id, COUNT(*) as total_templates
  FROM templates 
  WHERE status = 'approved' AND visibility = 'public'
  GROUP BY created_by_user_id
) template_count ON u.id = template_count.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as recent_activity_count
  FROM community_user_activities
  WHERE created_at > NOW() - INTERVAL '30 days'
    AND is_hidden = false
  GROUP BY user_id
) recent_activity ON u.id = recent_activity.user_id
WHERE (cup.profile_visibility = 'public' OR cup.profile_visibility IS NULL)
ORDER BY ur.total_points DESC, ur.reputation_level DESC;

/**
 * User profile summary view - Complete user profile with stats
 */
CREATE OR REPLACE VIEW community_user_profile_summary AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.image,
  u.created_at as user_created_at,
  -- Extended profile
  cup.display_name,
  cup.bio,
  cup.title,
  cup.company,
  cup.location,
  cup.specializations,
  cup.skills,
  cup.industries,
  cup.website_url,
  cup.github_username,
  cup.linkedin_username,
  cup.avatar_url,
  cup.profile_visibility,
  cup.is_verified,
  cup.last_active_at,
  -- Reputation
  ur.total_points,
  ur.reputation_level,
  ur.level_progress,
  ur.average_template_rating,
  ur.consistency_score,
  -- Social metrics
  follower_counts.follower_count,
  follower_counts.following_count,
  -- Content metrics
  COALESCE(template_stats.template_count, 0) as template_count,
  COALESCE(template_stats.avg_template_rating, 0) as template_avg_rating,
  COALESCE(review_stats.review_count, 0) as review_count,
  COALESCE(review_stats.helpful_reviews, 0) as helpful_reviews,
  -- Badge count
  COALESCE(badge_stats.total_badges, 0) as total_badges,
  badge_stats.featured_badges
FROM "user" u
LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
LEFT JOIN user_reputation ur ON u.id = ur.user_id
LEFT JOIN (
  SELECT 
    u_inner.id as user_id,
    COALESCE(followers.count, 0) as follower_count,
    COALESCE(following.count, 0) as following_count
  FROM "user" u_inner
  LEFT JOIN (
    SELECT following_id, COUNT(*) as count
    FROM community_user_follows
    GROUP BY following_id
  ) followers ON u_inner.id = followers.following_id
  LEFT JOIN (
    SELECT follower_id, COUNT(*) as count
    FROM community_user_follows
    GROUP BY follower_id
  ) following ON u_inner.id = following.follower_id
) follower_counts ON u.id = follower_counts.user_id
LEFT JOIN (
  SELECT 
    created_by_user_id as user_id,
    COUNT(*) as template_count,
    AVG(rating_average) as avg_template_rating
  FROM templates 
  WHERE status = 'approved'
  GROUP BY created_by_user_id
) template_stats ON u.id = template_stats.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as review_count,
    SUM(CASE WHEN helpful_count > unhelpful_count THEN 1 ELSE 0 END) as helpful_reviews
  FROM template_ratings
  WHERE is_approved = true
  GROUP BY user_id
) review_stats ON u.id = review_stats.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as total_badges,
    json_agg(
      json_build_object(
        'id', cbd.id,
        'name', cbd.name, 
        'icon', cbd.icon,
        'color', cbd.color,
        'tier', cbd.tier
      ) ORDER BY cub.display_order
    ) FILTER (WHERE cub.is_featured = true) as featured_badges
  FROM community_user_badges cub
  JOIN community_badge_definitions cbd ON cub.badge_id = cbd.id
  WHERE cub.show_on_profile = true
  GROUP BY user_id
) badge_stats ON u.id = badge_stats.user_id;

-- ========================
-- COMPLETION MESSAGE
-- ========================

-- Database schema extensions completed successfully
SELECT 
  'Community User Management System schema extensions completed successfully!' as message,
  (SELECT COUNT(*) FROM community_badge_definitions) as badges_created,
  (SELECT COUNT(*) FROM user_reputation) as reputation_records_created,
  NOW() as completed_at;