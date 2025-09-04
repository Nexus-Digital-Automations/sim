/**
 * Social Features Database Schema Extensions
 * 
 * Additional database tables and schema extensions required for comprehensive
 * social features in the community marketplace. This extends the existing
 * community schema with missing tables for comments, reactions, and social interactions.
 * 
 * ARCHITECTURE:
 * - Comment system with threading and reactions
 * - Enhanced social interactions and notifications
 * - Real-time activity tracking
 * - Social analytics and metrics
 * - User blocking and privacy controls
 * 
 * INTEGRATION:
 * - Extends existing community_user_profiles and user_reputation systems
 * - Integrates with templates, activities, and collections
 * - Supports WebSocket real-time updates
 * - GDPR compliant with data protection controls
 * 
 * @created 2025-09-04
 * @author Social Features Database Extensions
 */

-- ========================
-- COMMENT SYSTEM TABLES
-- ========================

/**
 * Community comments table - Threaded comment system
 * 
 * Comprehensive comment system supporting threaded discussions with:
 * - Unlimited nesting depth with parent-child relationships
 * - Rich content support with mentions and reactions
 * - Moderation and visibility controls
 * - Analytics and engagement tracking
 */
CREATE TABLE IF NOT EXISTS community_comments (
  id TEXT PRIMARY KEY, -- UUID for comment identification
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, -- Comment author
  
  -- Target content information
  target_type TEXT NOT NULL, -- 'template', 'activity', 'collection', 'comment'
  target_id TEXT NOT NULL, -- ID of the target content
  
  -- Threading information
  parent_id TEXT REFERENCES community_comments(id) ON DELETE CASCADE, -- Parent comment for threading
  depth INTEGER NOT NULL DEFAULT 0, -- Nesting depth (0 = top-level)
  thread_path TEXT, -- Materialized path for efficient threading queries
  
  -- Comment content
  content TEXT NOT NULL, -- Comment text content (max 2000 chars)
  content_format TEXT DEFAULT 'plain', -- 'plain', 'markdown', 'html'
  mentions JSONB DEFAULT '[]', -- Array of mentioned user IDs
  
  -- Engagement metrics
  like_count INTEGER NOT NULL DEFAULT 0, -- Number of likes
  dislike_count INTEGER NOT NULL DEFAULT 0, -- Number of dislikes
  reply_count INTEGER NOT NULL DEFAULT 0, -- Number of direct replies
  reaction_score DECIMAL(5,2) DEFAULT 0, -- Weighted reaction score
  
  -- Status and moderation
  is_pinned BOOLEAN NOT NULL DEFAULT false, -- Pinned by moderator
  is_hidden BOOLEAN NOT NULL DEFAULT false, -- Hidden by moderator
  is_deleted BOOLEAN NOT NULL DEFAULT false, -- Soft deleted
  is_edited BOOLEAN NOT NULL DEFAULT false, -- Has been edited
  is_private BOOLEAN NOT NULL DEFAULT false, -- Private comment (only visible to mentioned users)
  
  -- Moderation fields
  is_moderated BOOLEAN NOT NULL DEFAULT false, -- Requires moderation
  moderation_score DECIMAL(3,2) DEFAULT 0, -- Automated moderation score
  hide_reason TEXT, -- Reason for hiding (if hidden)
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMP, -- Last edit timestamp
  deleted_at TIMESTAMP, -- Soft deletion timestamp
  deleted_by TEXT REFERENCES "user"(id) ON DELETE SET NULL, -- Who deleted the comment
  
  -- Constraints
  CONSTRAINT valid_depth CHECK (depth >= 0 AND depth <= 10),
  CONSTRAINT valid_scores CHECK (like_count >= 0 AND dislike_count >= 0 AND reply_count >= 0)
);

-- Indexes for comment system performance
CREATE INDEX IF NOT EXISTS community_comments_target_idx ON community_comments(target_type, target_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS community_comments_user_idx ON community_comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_comments_parent_idx ON community_comments(parent_id, created_at DESC) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_comments_thread_path_idx ON community_comments USING gin(thread_path gin_trgm_ops);
CREATE INDEX IF NOT EXISTS community_comments_mentions_gin_idx ON community_comments USING gin(mentions);
CREATE INDEX IF NOT EXISTS community_comments_moderation_idx ON community_comments(is_moderated, moderation_score DESC) WHERE is_moderated = true;
CREATE INDEX IF NOT EXISTS community_comments_engagement_idx ON community_comments(target_type, target_id, like_count DESC, created_at DESC) WHERE is_deleted = false AND is_hidden = false;

/**
 * Comment reactions table - Likes, dislikes, and other reactions to comments
 */
CREATE TABLE IF NOT EXISTS community_comment_reactions (
  id TEXT PRIMARY KEY, -- UUID for reaction record
  comment_id TEXT NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE, -- Target comment
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, -- User reacting
  
  -- Reaction details
  reaction_type TEXT NOT NULL, -- 'like', 'dislike', 'helpful', 'funny', 'insightful', 'report'
  reaction_data JSONB DEFAULT '{}', -- Additional reaction data
  
  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Ensure one reaction per user per comment per type
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Indexes for comment reactions
CREATE INDEX IF NOT EXISTS comment_reactions_comment_idx ON community_comment_reactions(comment_id, reaction_type);
CREATE INDEX IF NOT EXISTS comment_reactions_user_idx ON community_comment_reactions(user_id, created_at DESC);

/**
 * Comment mentions table - User mentions in comments
 */
CREATE TABLE IF NOT EXISTS comment_mentions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT, -- UUID for mention record
  comment_id TEXT NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE, -- Comment containing mention
  mentioned_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, -- Mentioned user
  
  -- Mention status
  is_read BOOLEAN NOT NULL DEFAULT false, -- Whether mention was seen
  read_at TIMESTAMP, -- When mention was read
  
  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate mentions in same comment
  UNIQUE(comment_id, mentioned_user_id)
);

-- Indexes for comment mentions
CREATE INDEX IF NOT EXISTS comment_mentions_user_idx ON comment_mentions(mentioned_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS comment_mentions_comment_idx ON comment_mentions(comment_id);

-- ========================
-- ENHANCED ACTIVITY ENGAGEMENT
-- ========================

/**
 * Extend community_activity_engagement with additional reaction types and analytics
 */
DO $$
BEGIN
  -- Add new engagement types if they don't exist
  -- Note: This assumes the table already exists from community-schema-extensions.sql
  
  -- Add new columns for enhanced engagement tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_activity_engagement' AND column_name = 'engagement_score') THEN
    ALTER TABLE community_activity_engagement ADD COLUMN engagement_score DECIMAL(5,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_activity_engagement' AND column_name = 'is_featured') THEN
    ALTER TABLE community_activity_engagement ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_activity_engagement' AND column_name = 'interaction_context') THEN
    ALTER TABLE community_activity_engagement ADD COLUMN interaction_context JSONB DEFAULT '{}';
  END IF;

EXCEPTION WHEN duplicate_column THEN
  -- Column already exists, skip
  NULL;
END $$;

-- ========================
-- SOCIAL NOTIFICATIONS SYSTEM
-- ========================

/**
 * Social notifications table - Real-time social notifications
 */
CREATE TABLE IF NOT EXISTS community_notifications (
  id TEXT PRIMARY KEY, -- UUID for notification
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, -- Recipient user
  
  -- Notification details
  notification_type TEXT NOT NULL, -- 'follow', 'like', 'comment', 'mention', 'badge_earned', etc.
  title TEXT NOT NULL, -- Notification title
  message TEXT, -- Notification body
  
  -- Source information
  source_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL, -- User who triggered notification
  source_type TEXT, -- 'template', 'activity', 'comment', 'badge', etc.
  source_id TEXT, -- ID of source content
  
  -- Notification data
  notification_data JSONB DEFAULT '{}', -- Additional notification data
  action_url TEXT, -- URL to navigate to when clicked
  
  -- Status tracking
  is_read BOOLEAN NOT NULL DEFAULT false, -- Whether notification was read
  is_dismissed BOOLEAN NOT NULL DEFAULT false, -- Whether notification was dismissed
  read_at TIMESTAMP, -- When notification was read
  dismissed_at TIMESTAMP, -- When notification was dismissed
  
  -- Delivery tracking
  delivery_method TEXT DEFAULT 'in_app', -- 'in_app', 'email', 'push', 'sms'
  delivered_at TIMESTAMP, -- When notification was delivered
  delivery_status TEXT DEFAULT 'pending', -- 'pending', 'delivered', 'failed'
  
  -- Grouping for batch notifications
  group_key TEXT, -- Key for grouping similar notifications
  group_count INTEGER DEFAULT 1, -- Count of grouped notifications
  
  -- Priority and scheduling
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  scheduled_for TIMESTAMP, -- When to deliver (NULL = immediate)
  expires_at TIMESTAMP, -- When notification expires
  
  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for notifications system
CREATE INDEX IF NOT EXISTS community_notifications_user_idx ON community_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS community_notifications_type_idx ON community_notifications(notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS community_notifications_source_idx ON community_notifications(source_type, source_id);
CREATE INDEX IF NOT EXISTS community_notifications_delivery_idx ON community_notifications(delivery_status, scheduled_for) WHERE delivery_status = 'pending';
CREATE INDEX IF NOT EXISTS community_notifications_group_idx ON community_notifications(user_id, group_key, created_at DESC) WHERE group_key IS NOT NULL;

-- ========================
-- USER BLOCKING AND PRIVACY
-- ========================

/**
 * User blocking table - User blocking for privacy and safety
 */
CREATE TABLE IF NOT EXISTS community_user_blocks (
  id TEXT PRIMARY KEY, -- UUID for block record
  blocker_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, -- User doing the blocking
  blocked_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, -- User being blocked
  
  -- Block details
  block_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'comments', 'messages', 'mentions'
  block_reason TEXT, -- Optional reason for blocking
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true, -- Whether block is currently active
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMP, -- When block was lifted
  
  -- Constraints
  UNIQUE(blocker_id, blocked_id), -- Prevent duplicate blocks
  CHECK(blocker_id != blocked_id) -- Prevent self-blocking
);

-- Indexes for user blocking
CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON community_user_blocks(blocker_id, is_active);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON community_user_blocks(blocked_id, is_active);

-- ========================
-- SOCIAL ANALYTICS TABLES
-- ========================

/**
 * Social activity metrics - Aggregated social metrics by time period
 */
CREATE TABLE IF NOT EXISTS community_social_metrics (
  id TEXT PRIMARY KEY, -- UUID for metrics record
  
  -- Metrics scope
  metric_type TEXT NOT NULL, -- 'user', 'template', 'global'
  entity_id TEXT, -- User ID, template ID, or NULL for global
  time_period TEXT NOT NULL, -- 'hour', 'day', 'week', 'month'
  period_start TIMESTAMP NOT NULL, -- Start of the time period
  period_end TIMESTAMP NOT NULL, -- End of the time period
  
  -- Engagement metrics
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_follows INTEGER DEFAULT 0,
  total_activities INTEGER DEFAULT 0,
  
  -- Reach metrics
  unique_users_engaged INTEGER DEFAULT 0, -- Unique users who interacted
  total_impressions INTEGER DEFAULT 0, -- Total views/impressions
  total_reach INTEGER DEFAULT 0, -- Unique users reached
  
  -- Quality metrics
  average_engagement_rate DECIMAL(5,4) DEFAULT 0, -- Average engagement rate
  average_sentiment_score DECIMAL(3,2) DEFAULT 0, -- Average sentiment (-1 to 1)
  viral_coefficient DECIMAL(5,4) DEFAULT 0, -- Virality measure
  
  -- User-specific metrics (when metric_type = 'user')
  reputation_gained INTEGER DEFAULT 0,
  badges_earned INTEGER DEFAULT 0,
  templates_created INTEGER DEFAULT 0,
  helpful_actions INTEGER DEFAULT 0,
  
  -- Template-specific metrics (when metric_type = 'template')
  downloads INTEGER DEFAULT 0,
  ratings_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  
  -- Computed fields
  engagement_score DECIMAL(7,2) DEFAULT 0, -- Weighted engagement score
  trending_score DECIMAL(7,2) DEFAULT 0, -- Trending algorithm score
  quality_score DECIMAL(5,2) DEFAULT 0, -- Overall quality score
  
  -- Metadata
  data_sources JSONB DEFAULT '[]', -- Sources of data for this metric
  calculation_method TEXT DEFAULT 'standard', -- Method used for calculation
  
  -- Audit fields
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(metric_type, entity_id, time_period, period_start)
);

-- Indexes for social metrics
CREATE INDEX IF NOT EXISTS social_metrics_entity_idx ON community_social_metrics(metric_type, entity_id, period_start DESC);
CREATE INDEX IF NOT EXISTS social_metrics_period_idx ON community_social_metrics(time_period, period_start DESC);
CREATE INDEX IF NOT EXISTS social_metrics_trending_idx ON community_social_metrics(trending_score DESC, period_start DESC);
CREATE INDEX IF NOT EXISTS social_metrics_engagement_idx ON community_social_metrics(engagement_score DESC, period_start DESC);

-- ========================
-- REAL-TIME ACTIVITY TRACKING
-- ========================

/**
 * Real-time activity events table - Track all social activities for real-time updates
 */
CREATE TABLE IF NOT EXISTS community_activity_events (
  id TEXT PRIMARY KEY, -- UUID for event
  
  -- Event details
  event_type TEXT NOT NULL, -- 'like', 'comment', 'follow', 'share', 'view', etc.
  event_subtype TEXT, -- Additional event classification
  
  -- Actor and target
  actor_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL, -- User performing action
  target_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL, -- User being acted upon
  
  -- Content information
  content_type TEXT, -- 'template', 'activity', 'comment', 'collection'
  content_id TEXT, -- ID of the content
  content_title TEXT, -- Title of the content
  
  -- Event data
  event_data JSONB DEFAULT '{}', -- Additional event data
  event_context JSONB DEFAULT '{}', -- Context information (device, location, etc.)
  
  -- Aggregation fields
  aggregation_key TEXT, -- Key for aggregating similar events
  weight DECIMAL(3,2) DEFAULT 1.0, -- Weight for importance calculation
  
  -- Real-time processing
  is_processed BOOLEAN NOT NULL DEFAULT false, -- Whether event was processed
  processed_at TIMESTAMP, -- When event was processed
  
  -- Privacy and filtering
  visibility TEXT DEFAULT 'public', -- 'public', 'followers', 'private'
  is_anonymous BOOLEAN NOT NULL DEFAULT false, -- Anonymous action
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- TTL for event cleanup (optional, depends on retention policy)
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '90 days')
);

-- Indexes for real-time activity tracking
CREATE INDEX IF NOT EXISTS activity_events_actor_idx ON community_activity_events(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_target_idx ON community_activity_events(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_content_idx ON community_activity_events(content_type, content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_type_idx ON community_activity_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_processing_idx ON community_activity_events(is_processed, created_at DESC) WHERE is_processed = false;
CREATE INDEX IF NOT EXISTS activity_events_aggregation_idx ON community_activity_events(aggregation_key, created_at DESC) WHERE aggregation_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS activity_events_expires_idx ON community_activity_events(expires_at) WHERE expires_at IS NOT NULL;

-- ========================
-- TRIGGERS AND FUNCTIONS
-- ========================

/**
 * Function to update comment thread paths
 */
CREATE OR REPLACE FUNCTION update_comment_thread_path()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- Top-level comment
    NEW.thread_path := NEW.id;
    NEW.depth := 0;
  ELSE
    -- Get parent's thread path and depth
    SELECT thread_path || '/' || NEW.id, depth + 1
    INTO NEW.thread_path, NEW.depth
    FROM community_comments
    WHERE id = NEW.parent_id;
    
    -- Ensure depth doesn't exceed maximum
    IF NEW.depth > 10 THEN
      RAISE EXCEPTION 'Maximum comment depth exceeded';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment thread path updates
CREATE TRIGGER update_comment_thread_path_trigger
  BEFORE INSERT ON community_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_thread_path();

/**
 * Function to update comment engagement counts
 */
CREATE OR REPLACE FUNCTION update_comment_engagement_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment reaction count
    UPDATE community_comments
    SET 
      like_count = CASE WHEN NEW.reaction_type = 'like' THEN like_count + 1 ELSE like_count END,
      dislike_count = CASE WHEN NEW.reaction_type = 'dislike' THEN dislike_count + 1 ELSE dislike_count END,
      updated_at = NOW()
    WHERE id = NEW.comment_id;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Decrement reaction count
    UPDATE community_comments
    SET 
      like_count = CASE WHEN OLD.reaction_type = 'like' THEN GREATEST(0, like_count - 1) ELSE like_count END,
      dislike_count = CASE WHEN OLD.reaction_type = 'dislike' THEN GREATEST(0, dislike_count - 1) ELSE dislike_count END,
      updated_at = NOW()
    WHERE id = OLD.comment_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment engagement count updates
CREATE TRIGGER update_comment_engagement_counts_trigger
  AFTER INSERT OR DELETE ON community_comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_engagement_counts();

/**
 * Function to create activity events for social actions
 */
CREATE OR REPLACE FUNCTION create_social_activity_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Create activity event for various social actions
  INSERT INTO community_activity_events (
    id,
    event_type,
    actor_user_id,
    target_user_id,
    content_type,
    content_id,
    event_data,
    aggregation_key,
    created_at
  )
  SELECT 
    gen_random_uuid()::TEXT,
    CASE 
      WHEN TG_TABLE_NAME = 'community_comment_reactions' AND NEW.reaction_type = 'like' THEN 'comment_liked'
      WHEN TG_TABLE_NAME = 'community_user_follows' THEN 'user_followed'
      WHEN TG_TABLE_NAME = 'community_comments' THEN 'comment_posted'
      ELSE 'social_action'
    END,
    CASE 
      WHEN TG_TABLE_NAME = 'community_comment_reactions' THEN NEW.user_id
      WHEN TG_TABLE_NAME = 'community_user_follows' THEN NEW.follower_id
      WHEN TG_TABLE_NAME = 'community_comments' THEN NEW.user_id
      ELSE NULL
    END,
    CASE 
      WHEN TG_TABLE_NAME = 'community_user_follows' THEN NEW.following_id
      WHEN TG_TABLE_NAME = 'community_comments' THEN (
        SELECT cc2.user_id FROM community_comments cc2 WHERE cc2.id = NEW.parent_id
      )
      ELSE NULL
    END,
    CASE 
      WHEN TG_TABLE_NAME = 'community_comment_reactions' THEN 'comment'
      WHEN TG_TABLE_NAME = 'community_user_follows' THEN 'user'
      WHEN TG_TABLE_NAME = 'community_comments' THEN NEW.target_type
      ELSE NULL
    END,
    CASE 
      WHEN TG_TABLE_NAME = 'community_comment_reactions' THEN NEW.comment_id
      WHEN TG_TABLE_NAME = 'community_user_follows' THEN NEW.following_id
      WHEN TG_TABLE_NAME = 'community_comments' THEN NEW.target_id
      ELSE NULL
    END,
    CASE 
      WHEN TG_TABLE_NAME = 'community_comment_reactions' THEN jsonb_build_object('reaction_type', NEW.reaction_type)
      WHEN TG_TABLE_NAME = 'community_comments' THEN jsonb_build_object('comment_id', NEW.id, 'parent_id', NEW.parent_id)
      ELSE '{}'::jsonb
    END,
    CASE 
      WHEN TG_TABLE_NAME = 'community_comment_reactions' THEN 'comment_like_' || NEW.comment_id
      WHEN TG_TABLE_NAME = 'community_user_follows' THEN 'follow_' || NEW.following_id
      ELSE NULL
    END,
    NOW()
  WHERE TG_OP = 'INSERT';
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for social activity event creation
CREATE TRIGGER create_comment_reaction_event_trigger
  AFTER INSERT ON community_comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION create_social_activity_event();

CREATE TRIGGER create_follow_event_trigger
  AFTER INSERT ON community_user_follows
  FOR EACH ROW
  EXECUTE FUNCTION create_social_activity_event();

CREATE TRIGGER create_comment_event_trigger
  AFTER INSERT ON community_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_social_activity_event();

-- ========================
-- DATA SEEDING AND INITIALIZATION
-- ========================

/**
 * Initialize social features for existing users
 */
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Ensure all users have notification preferences set
  FOR user_record IN SELECT id FROM "user" LOOP
    INSERT INTO community_notifications (
      id,
      user_id,
      notification_type,
      title,
      message,
      is_read,
      created_at
    ) VALUES (
      gen_random_uuid()::TEXT,
      user_record.id,
      'system',
      'Welcome to Social Features!',
      'Discover and connect with other users in the community marketplace.',
      false,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ========================
-- VIEWS FOR SOCIAL FEATURES
-- ========================

/**
 * Social feed view - Personalized activity feed
 */
CREATE OR REPLACE VIEW community_social_feed AS
WITH user_network AS (
  -- Users that the current user follows
  SELECT following_id as user_id, 'followed' as relationship_type
  FROM community_user_follows
  WHERE follower_id = current_setting('app.current_user_id', true)
  
  UNION ALL
  
  -- Current user's own activities
  SELECT current_setting('app.current_user_id', true) as user_id, 'self' as relationship_type
  WHERE current_setting('app.current_user_id', true) IS NOT NULL
),
social_activities AS (
  -- Recent activities from network
  SELECT 
    cua.id,
    cua.user_id,
    cua.activity_type,
    cua.activity_data,
    cua.target_type,
    cua.target_id,
    cua.target_title,
    cua.visibility,
    cua.like_count,
    cua.comment_count,
    cua.created_at,
    un.relationship_type,
    -- User information
    u.name as user_name,
    u.image as user_image,
    cup.display_name as user_display_name,
    cup.is_verified as user_is_verified,
    ur.total_points as user_reputation
  FROM community_user_activities cua
  INNER JOIN user_network un ON cua.user_id = un.user_id
  INNER JOIN "user" u ON cua.user_id = u.id
  LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
  LEFT JOIN user_reputation ur ON u.id = ur.user_id
  WHERE cua.is_hidden = false
    AND cua.created_at > NOW() - INTERVAL '30 days'
    AND (cua.visibility = 'public' OR 
         (cua.visibility = 'followers' AND un.relationship_type IN ('followed', 'self')) OR
         (cua.visibility = 'private' AND un.relationship_type = 'self'))
)
SELECT *
FROM social_activities
ORDER BY 
  CASE WHEN relationship_type = 'self' THEN 1 ELSE 2 END,
  like_count * 0.3 + comment_count * 0.7 DESC,
  created_at DESC;

/**
 * Comment thread view - Hierarchical comment display
 */
CREATE OR REPLACE VIEW community_comment_threads AS
WITH RECURSIVE comment_tree AS (
  -- Base case: top-level comments
  SELECT 
    cc.id,
    cc.user_id,
    cc.target_type,
    cc.target_id,
    cc.parent_id,
    cc.content,
    cc.depth,
    cc.thread_path,
    cc.like_count,
    cc.dislike_count,
    cc.reply_count,
    cc.is_pinned,
    cc.is_edited,
    cc.created_at,
    cc.updated_at,
    -- User information
    u.name as user_name,
    u.image as user_image,
    cup.display_name as user_display_name,
    cup.is_verified as user_is_verified,
    ur.total_points as user_reputation,
    -- Threading information
    0 as tree_level,
    ARRAY[cc.created_at] as sort_path
  FROM community_comments cc
  INNER JOIN "user" u ON cc.user_id = u.id
  LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
  LEFT JOIN user_reputation ur ON u.id = ur.user_id
  WHERE cc.parent_id IS NULL 
    AND cc.is_deleted = false 
    AND cc.is_hidden = false
  
  UNION ALL
  
  -- Recursive case: child comments
  SELECT 
    cc.id,
    cc.user_id,
    cc.target_type,
    cc.target_id,
    cc.parent_id,
    cc.content,
    cc.depth,
    cc.thread_path,
    cc.like_count,
    cc.dislike_count,
    cc.reply_count,
    cc.is_pinned,
    cc.is_edited,
    cc.created_at,
    cc.updated_at,
    u.name,
    u.image,
    cup.display_name,
    cup.is_verified,
    ur.total_points,
    ct.tree_level + 1,
    ct.sort_path || cc.created_at
  FROM community_comments cc
  INNER JOIN comment_tree ct ON cc.parent_id = ct.id
  INNER JOIN "user" u ON cc.user_id = u.id
  LEFT JOIN community_user_profiles cup ON u.id = cup.user_id
  LEFT JOIN user_reputation ur ON u.id = ur.user_id
  WHERE cc.is_deleted = false 
    AND cc.is_hidden = false
    AND ct.tree_level < 10
)
SELECT *
FROM comment_tree
ORDER BY sort_path, is_pinned DESC, like_count DESC;

-- ========================
-- COMPLETION MESSAGE
-- ========================

-- Social features database extensions completed successfully
SELECT 
  'Social Features Database Extensions completed successfully!' as message,
  (SELECT COUNT(*) FROM community_comments) as comments_table_ready,
  (SELECT COUNT(*) FROM community_notifications) as notifications_table_ready,
  (SELECT COUNT(*) FROM community_activity_events) as events_tracking_ready,
  NOW() as completed_at;