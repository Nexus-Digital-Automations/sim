-- =============================================
-- MARKETPLACE AND SOCIAL FEATURES SCHEMA EXTENSIONS
-- =============================================
-- Extensions to the existing Sim database schema to support comprehensive
-- marketplace functionality with social features and advanced discovery capabilities
-- Based on research report: research-complete-community-marketplace-with-social-features-and-integration-discovery-1757002072081.md

-- =============================================
-- SOCIAL FEATURES EXTENSIONS
-- =============================================

-- User Following System
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

-- Indexes for user following system
CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS user_follows_created_idx ON user_follows(created_at DESC);

-- Activity Feed System
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'template_created', 'template_liked', 'user_followed', 'collection_created', etc.
  object_type TEXT NOT NULL,   -- 'template', 'user', 'collection', 'rating'
  object_id UUID NOT NULL,
  
  -- Engagement optimization
  engagement_score DECIMAL(5,2) DEFAULT 1.0,
  relevance_score DECIMAL(5,2) DEFAULT 1.0,
  
  -- Feed aggregation support
  aggregation_key TEXT,
  participants JSONB DEFAULT '[]'::jsonb,
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for activity feed
CREATE INDEX IF NOT EXISTS activity_feed_user_idx ON activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_actor_idx ON activity_feed(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_type_idx ON activity_feed(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_object_idx ON activity_feed(object_type, object_id);
CREATE INDEX IF NOT EXISTS activity_feed_engagement_idx ON activity_feed(engagement_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_relevance_idx ON activity_feed(relevance_score DESC, created_at DESC);

-- Social Interactions Tracking
CREATE TABLE IF NOT EXISTS social_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL, -- 'template', 'user', 'collection', 'comment', 'rating'
  interaction_type TEXT NOT NULL, -- 'view', 'like', 'share', 'comment', 'download', 'favorite'
  
  -- Context and analytics
  session_id TEXT,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for social interactions
CREATE INDEX IF NOT EXISTS social_interactions_user_idx ON social_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_interactions_target_idx ON social_interactions(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_interactions_type_idx ON social_interactions(interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS social_interactions_session_idx ON social_interactions(session_id);

-- =============================================
-- ENHANCED TEMPLATE COLLECTIONS SYSTEM
-- =============================================

-- Template Collections Comments/Reviews
CREATE TABLE IF NOT EXISTS collection_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES template_collections(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES collection_comments(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for collection comments
CREATE INDEX IF NOT EXISTS collection_comments_collection_idx ON collection_comments(collection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS collection_comments_user_idx ON collection_comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS collection_comments_parent_idx ON collection_comments(parent_id);
CREATE INDEX IF NOT EXISTS collection_comments_approved_idx ON collection_comments(is_approved, created_at DESC);

-- Collection Likes/Social Engagement
CREATE TABLE IF NOT EXISTS collection_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES template_collections(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(collection_id, user_id)
);

-- Indexes for collection likes
CREATE INDEX IF NOT EXISTS collection_likes_collection_idx ON collection_likes(collection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS collection_likes_user_idx ON collection_likes(user_id, created_at DESC);

-- =============================================
-- MARKETPLACE COMMERCE EXTENSIONS  
-- =============================================

-- Template Pricing and Monetization
CREATE TABLE IF NOT EXISTS template_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  
  -- Pricing model
  pricing_type TEXT NOT NULL DEFAULT 'free', -- 'free', 'paid', 'freemium', 'subscription'
  base_price DECIMAL(10,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  
  -- Advanced pricing
  tier_pricing JSONB DEFAULT '{}'::jsonb, -- Different prices for user tiers
  volume_discounts JSONB DEFAULT '{}'::jsonb,
  promotional_pricing JSONB DEFAULT '{}'::jsonb,
  
  -- Revenue sharing
  creator_share_percentage DECIMAL(5,2) DEFAULT 70.00,
  platform_fee_percentage DECIMAL(5,2) DEFAULT 30.00,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(template_id)
);

-- Indexes for template pricing
CREATE INDEX IF NOT EXISTS template_pricing_template_idx ON template_pricing(template_id);
CREATE INDEX IF NOT EXISTS template_pricing_type_idx ON template_pricing(pricing_type);
CREATE INDEX IF NOT EXISTS template_pricing_price_idx ON template_pricing(base_price);

-- Purchase History and Analytics
CREATE TABLE IF NOT EXISTS template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  purchaser_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  
  -- Transaction details
  price_paid DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT,
  transaction_id TEXT UNIQUE,
  
  -- Purchase context
  referral_source TEXT,
  discount_applied DECIMAL(5,2) DEFAULT 0.00,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for template purchases
CREATE INDEX IF NOT EXISTS template_purchases_template_idx ON template_purchases(template_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_user_idx ON template_purchases(purchaser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_transaction_idx ON template_purchases(transaction_id);

-- Creator Revenue Tracking
CREATE TABLE IF NOT EXISTS creator_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES template_purchases(id) ON DELETE CASCADE,
  
  -- Revenue breakdown
  gross_amount DECIMAL(10,2) NOT NULL,
  creator_share DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  processing_fee DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  
  -- Payout tracking
  payout_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'paid', 'failed'
  payout_date TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for creator revenue
CREATE INDEX IF NOT EXISTS creator_revenue_creator_idx ON creator_revenue(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS creator_revenue_template_idx ON creator_revenue(template_id, created_at DESC);
CREATE INDEX IF NOT EXISTS creator_revenue_status_idx ON creator_revenue(payout_status, created_at DESC);

-- =============================================
-- RECOMMENDATION ENGINE EXTENSIONS
-- =============================================

-- User Preference Learning
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  
  -- Explicit preferences
  preferred_categories TEXT[] DEFAULT '{}',
  preferred_tags TEXT[] DEFAULT '{}',
  difficulty_preference TEXT DEFAULT 'intermediate',
  
  -- Implicit learning from behavior
  category_scores JSONB DEFAULT '{}'::jsonb,
  tag_scores JSONB DEFAULT '{}'::jsonb,
  creator_scores JSONB DEFAULT '{}'::jsonb,
  
  -- ML features (for future use with vector embeddings)
  -- embedding_vector VECTOR(128), -- User preference embedding for similarity
  cluster_assignment INTEGER,   -- User behavior cluster
  
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Indexes for user preferences
CREATE INDEX IF NOT EXISTS user_preferences_user_idx ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS user_preferences_cluster_idx ON user_preferences(cluster_assignment);
CREATE INDEX IF NOT EXISTS user_preferences_updated_idx ON user_preferences(last_updated DESC);

-- Template Similarity and ML Features
CREATE TABLE IF NOT EXISTS template_similarity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  
  -- Content embeddings for semantic search (for future use)
  -- content_embedding VECTOR(256),
  -- usage_embedding VECTOR(128),
  -- metadata_embedding VECTOR(64),
  
  -- Similarity clusters
  content_cluster INTEGER,
  usage_cluster INTEGER,
  
  -- Precomputed similarity scores with other templates
  similar_templates JSONB DEFAULT '{}'::jsonb, -- {template_id: similarity_score}
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(template_id)
);

-- Indexes for template similarity
CREATE INDEX IF NOT EXISTS template_similarity_template_idx ON template_similarity(template_id);
CREATE INDEX IF NOT EXISTS template_similarity_content_cluster_idx ON template_similarity(content_cluster);
CREATE INDEX IF NOT EXISTS template_similarity_usage_cluster_idx ON template_similarity(usage_cluster);

-- =============================================
-- MARKETPLACE ANALYTICS AND INSIGHTS
-- =============================================

-- Marketplace Performance Metrics
CREATE TABLE IF NOT EXISTS marketplace_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL, -- 'daily_active_users', 'template_downloads', 'revenue', etc.
  metric_value DECIMAL(15,2) NOT NULL,
  metric_date DATE NOT NULL,
  
  -- Dimensions for filtering
  category_id TEXT,
  creator_id TEXT,
  template_id TEXT,
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(metric_type, metric_date, category_id, creator_id, template_id)
);

-- Indexes for marketplace metrics
CREATE INDEX IF NOT EXISTS marketplace_metrics_type_date_idx ON marketplace_metrics(metric_type, metric_date DESC);
CREATE INDEX IF NOT EXISTS marketplace_metrics_category_idx ON marketplace_metrics(category_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS marketplace_metrics_creator_idx ON marketplace_metrics(creator_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS marketplace_metrics_template_idx ON marketplace_metrics(template_id, metric_date DESC);

-- Template Trending Scores (computed periodically)
CREATE TABLE IF NOT EXISTS template_trending_scores (
  template_id TEXT PRIMARY KEY REFERENCES templates(id) ON DELETE CASCADE,
  
  -- Trending algorithm components
  download_velocity DECIMAL(8,4) NOT NULL DEFAULT 0, -- Downloads per day trend
  view_velocity DECIMAL(8,4) NOT NULL DEFAULT 0,     -- Views per day trend
  rating_momentum DECIMAL(8,4) NOT NULL DEFAULT 0,   -- Rating trend
  social_engagement DECIMAL(8,4) NOT NULL DEFAULT 0, -- Likes, shares, comments
  
  -- Final trending score
  trending_score DECIMAL(10,4) NOT NULL DEFAULT 0,
  trending_rank INTEGER,
  
  -- Time decay factors
  recency_factor DECIMAL(4,3) NOT NULL DEFAULT 1.0,
  last_calculated TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Category-specific trending
  category_rank INTEGER,
  category_score DECIMAL(10,4) DEFAULT 0
);

-- Indexes for trending scores
CREATE INDEX IF NOT EXISTS trending_scores_score_idx ON template_trending_scores(trending_score DESC);
CREATE INDEX IF NOT EXISTS trending_scores_rank_idx ON template_trending_scores(trending_rank ASC);
CREATE INDEX IF NOT EXISTS trending_scores_category_rank_idx ON template_trending_scores(category_rank ASC);
CREATE INDEX IF NOT EXISTS trending_scores_calculated_idx ON template_trending_scores(last_calculated DESC);

-- User Reputation and Trust Scores
CREATE TABLE IF NOT EXISTS user_reputation (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  
  -- Core reputation metrics
  reputation_score INTEGER NOT NULL DEFAULT 0,
  trust_level TEXT NOT NULL DEFAULT 'new', -- 'new', 'trusted', 'veteran', 'expert'
  
  -- Contribution metrics
  templates_created INTEGER NOT NULL DEFAULT 0,
  templates_featured INTEGER NOT NULL DEFAULT 0,
  helpful_reviews INTEGER NOT NULL DEFAULT 0,
  community_contributions INTEGER NOT NULL DEFAULT 0,
  
  -- Quality metrics
  average_template_rating DECIMAL(3,2) DEFAULT 0,
  template_download_count INTEGER DEFAULT 0,
  positive_feedback_ratio DECIMAL(4,3) DEFAULT 0,
  
  -- Trust indicators
  is_verified_creator BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured_creator BOOLEAN NOT NULL DEFAULT FALSE,
  badges_earned TEXT[] DEFAULT '{}',
  
  last_calculated TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for user reputation
CREATE INDEX IF NOT EXISTS user_reputation_score_idx ON user_reputation(reputation_score DESC);
CREATE INDEX IF NOT EXISTS user_reputation_trust_idx ON user_reputation(trust_level);
CREATE INDEX IF NOT EXISTS user_reputation_verified_idx ON user_reputation(is_verified_creator);
CREATE INDEX IF NOT EXISTS user_reputation_featured_idx ON user_reputation(is_featured_creator);

-- =============================================
-- MARKETPLACE MODERATION AND GOVERNANCE
-- =============================================

-- Content Moderation Queue
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'template', 'comment', 'collection', 'rating'
  content_id UUID NOT NULL,
  reporter_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  
  -- Moderation details
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'flagged'
  moderator_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  
  -- AI moderation scores
  ai_safety_score DECIMAL(4,3),
  ai_quality_score DECIMAL(4,3),
  ai_relevance_score DECIMAL(4,3),
  
  -- Resolution details
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for moderation queue
CREATE INDEX IF NOT EXISTS moderation_queue_status_idx ON moderation_queue(status, created_at ASC);
CREATE INDEX IF NOT EXISTS moderation_queue_content_idx ON moderation_queue(content_type, content_id);
CREATE INDEX IF NOT EXISTS moderation_queue_reporter_idx ON moderation_queue(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_queue_moderator_idx ON moderation_queue(moderator_id);

-- Marketplace Feature Flags
CREATE TABLE IF NOT EXISTS marketplace_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL UNIQUE,
  
  -- Feature configuration
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage INTEGER NOT NULL DEFAULT 0, -- 0-100
  target_user_groups TEXT[] DEFAULT '{}',
  
  -- Feature metadata
  description TEXT,
  configuration JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for feature flags
CREATE INDEX IF NOT EXISTS marketplace_features_enabled_idx ON marketplace_features(is_enabled);
CREATE INDEX IF NOT EXISTS marketplace_features_name_idx ON marketplace_features(feature_name);

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for template discovery with all metadata
CREATE OR REPLACE VIEW template_discovery_view AS
SELECT 
  t.*,
  tc.name as category_name,
  tc.slug as category_slug,
  tc.color as category_color,
  tc.icon as category_icon,
  tp.pricing_type,
  tp.base_price,
  tp.currency,
  ts.trending_score,
  ts.trending_rank,
  ur.reputation_score as creator_reputation,
  ur.trust_level as creator_trust_level,
  ur.is_verified_creator,
  
  -- Social engagement metrics
  COALESCE(social_stats.view_count, 0) as social_views,
  COALESCE(social_stats.like_count, 0) as social_likes,
  COALESCE(social_stats.share_count, 0) as social_shares,
  COALESCE(social_stats.comment_count, 0) as social_comments
  
FROM templates t
LEFT JOIN template_categories tc ON t.category_id = tc.id
LEFT JOIN template_pricing tp ON t.id = tp.template_id
LEFT JOIN template_trending_scores ts ON t.id = ts.template_id
LEFT JOIN user_reputation ur ON t.created_by_user_id = ur.user_id
LEFT JOIN (
  SELECT 
    target_id,
    COUNT(CASE WHEN interaction_type = 'view' THEN 1 END) as view_count,
    COUNT(CASE WHEN interaction_type = 'like' THEN 1 END) as like_count,
    COUNT(CASE WHEN interaction_type = 'share' THEN 1 END) as share_count,
    COUNT(CASE WHEN interaction_type = 'comment' THEN 1 END) as comment_count
  FROM social_interactions 
  WHERE target_type = 'template'
  GROUP BY target_id
) social_stats ON t.id::text = social_stats.target_id::text
WHERE t.status = 'published' AND t.visibility = 'public';

-- View for user social stats
CREATE OR REPLACE VIEW user_social_stats AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.image,
  
  -- Following stats
  COALESCE(followers.count, 0) as follower_count,
  COALESCE(following.count, 0) as following_count,
  
  -- Content stats
  COALESCE(template_stats.total_templates, 0) as templates_created,
  COALESCE(template_stats.featured_templates, 0) as featured_templates,
  COALESCE(collection_stats.total_collections, 0) as collections_created,
  
  -- Engagement stats
  COALESCE(engagement_stats.total_likes_received, 0) as likes_received,
  COALESCE(engagement_stats.total_views_received, 0) as views_received,
  
  -- Reputation
  ur.reputation_score,
  ur.trust_level,
  ur.is_verified_creator
  
FROM "user" u
LEFT JOIN user_reputation ur ON u.id = ur.user_id
LEFT JOIN (
  SELECT following_id, COUNT(*) as count 
  FROM user_follows 
  GROUP BY following_id
) followers ON u.id = followers.following_id
LEFT JOIN (
  SELECT follower_id, COUNT(*) as count 
  FROM user_follows 
  GROUP BY follower_id
) following ON u.id = following.follower_id
LEFT JOIN (
  SELECT 
    created_by_user_id,
    COUNT(*) as total_templates,
    COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_templates
  FROM templates 
  WHERE status = 'published'
  GROUP BY created_by_user_id
) template_stats ON u.id = template_stats.created_by_user_id
LEFT JOIN (
  SELECT 
    created_by_user_id,
    COUNT(*) as total_collections
  FROM template_collections 
  WHERE is_public = true
  GROUP BY created_by_user_id
) collection_stats ON u.id = collection_stats.created_by_user_id
LEFT JOIN (
  SELECT 
    t.created_by_user_id,
    COUNT(CASE WHEN si.interaction_type = 'like' THEN 1 END) as total_likes_received,
    COUNT(CASE WHEN si.interaction_type = 'view' THEN 1 END) as total_views_received
  FROM templates t
  LEFT JOIN social_interactions si ON t.id::text = si.target_id::text AND si.target_type = 'template'
  GROUP BY t.created_by_user_id
) engagement_stats ON u.id = engagement_stats.created_by_user_id;

-- =============================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =============================================

-- Function to update trending scores (to be called periodically)
CREATE OR REPLACE FUNCTION update_template_trending_scores()
RETURNS void AS $$
BEGIN
  INSERT INTO template_trending_scores (
    template_id,
    download_velocity,
    view_velocity,
    rating_momentum,
    social_engagement,
    trending_score,
    recency_factor
  )
  SELECT 
    t.id,
    
    -- Download velocity (downloads in last 7 days vs previous 7 days)
    COALESCE(recent_downloads.velocity, 0) as download_velocity,
    
    -- View velocity (views in last 7 days vs previous 7 days)  
    COALESCE(recent_views.velocity, 0) as view_velocity,
    
    -- Rating momentum (recent ratings trend)
    COALESCE(rating_trend.momentum, 0) as rating_momentum,
    
    -- Social engagement score
    COALESCE(social_score.engagement, 0) as social_engagement,
    
    -- Combined trending score
    (
      COALESCE(recent_downloads.velocity, 0) * 0.3 +
      COALESCE(recent_views.velocity, 0) * 0.2 +
      COALESCE(rating_trend.momentum, 0) * 0.25 +
      COALESCE(social_score.engagement, 0) * 0.25
    ) * COALESCE(recency.factor, 0.5) as trending_score,
    
    -- Recency factor (exponential decay)
    COALESCE(recency.factor, 0.5) as recency_factor
    
  FROM templates t
  
  -- Download velocity calculation
  LEFT JOIN (
    SELECT 
      template_id,
      (recent_count - previous_count)::decimal / GREATEST(previous_count, 1) as velocity
    FROM (
      SELECT 
        template_id,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '14 days' 
                       AND created_at < CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as previous_count
      FROM template_purchases
      GROUP BY template_id
    ) velocity_calc
  ) recent_downloads ON t.id = recent_downloads.template_id
  
  -- View velocity calculation  
  LEFT JOIN (
    SELECT 
      target_id::text as template_id,
      (recent_count - previous_count)::decimal / GREATEST(previous_count, 1) as velocity
    FROM (
      SELECT 
        target_id,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '14 days' 
                       AND created_at < CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as previous_count
      FROM social_interactions
      WHERE target_type = 'template' AND interaction_type = 'view'
      GROUP BY target_id
    ) velocity_calc
  ) recent_views ON t.id = recent_views.template_id
  
  -- Rating momentum
  LEFT JOIN (
    SELECT 
      template_id,
      (recent_avg - overall_avg) as momentum
    FROM (
      SELECT 
        template_id,
        AVG(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN rating END) as recent_avg,
        AVG(rating) as overall_avg
      FROM template_ratings
      WHERE is_approved = true
      GROUP BY template_id
    ) rating_calc
  ) rating_trend ON t.id = rating_trend.template_id
  
  -- Social engagement
  LEFT JOIN (
    SELECT 
      target_id::text as template_id,
      COUNT(*) / 30.0 as engagement -- interactions per day over last 30 days
    FROM social_interactions
    WHERE target_type = 'template' 
      AND interaction_type IN ('like', 'share', 'comment')
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY target_id
  ) social_score ON t.id = social_score.template_id
  
  -- Recency factor (exponential decay based on creation date)
  LEFT JOIN (
    SELECT 
      id,
      EXP(-EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / (86400.0 * 90)) as factor -- 90-day decay
    FROM templates
  ) recency ON t.id = recency.id
  
  WHERE t.status = 'published' AND t.visibility = 'public'
  
  ON CONFLICT (template_id) DO UPDATE SET
    download_velocity = EXCLUDED.download_velocity,
    view_velocity = EXCLUDED.view_velocity,
    rating_momentum = EXCLUDED.rating_momentum,
    social_engagement = EXCLUDED.social_engagement,
    trending_score = EXCLUDED.trending_score,
    recency_factor = EXCLUDED.recency_factor,
    last_calculated = NOW();
    
  -- Update ranking
  WITH ranked_templates AS (
    SELECT 
      template_id,
      ROW_NUMBER() OVER (ORDER BY trending_score DESC) as rank,
      ROW_NUMBER() OVER (
        PARTITION BY (
          SELECT category_id FROM templates WHERE id = template_trending_scores.template_id
        ) 
        ORDER BY trending_score DESC
      ) as category_rank
    FROM template_trending_scores
  )
  UPDATE template_trending_scores 
  SET 
    trending_rank = ranked_templates.rank,
    category_rank = ranked_templates.category_rank
  FROM ranked_templates
  WHERE template_trending_scores.template_id = ranked_templates.template_id;
  
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL DATA AND CONFIGURATION
-- =============================================

-- Insert default marketplace features
INSERT INTO marketplace_features (feature_name, is_enabled, description) VALUES
('social_features', true, 'Enable social features like following, activity feeds, and social interactions'),
('template_monetization', false, 'Enable paid templates and creator revenue sharing'),
('advanced_recommendations', true, 'Enable ML-powered template recommendations'),
('community_moderation', true, 'Enable community-driven moderation features'),
('trending_algorithms', true, 'Enable trending template detection and ranking')
ON CONFLICT (feature_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS templates_social_stats_idx 
ON templates(status, visibility) 
WHERE status = 'published' AND visibility = 'public';

CREATE INDEX CONCURRENTLY IF NOT EXISTS social_interactions_template_agg_idx
ON social_interactions(target_id, target_type, interaction_type, created_at)
WHERE target_type = 'template';

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE user_follows IS 'User following relationships for social features';
COMMENT ON TABLE activity_feed IS 'Social activity feed with engagement optimization';
COMMENT ON TABLE social_interactions IS 'Comprehensive tracking of user interactions with content';
COMMENT ON TABLE template_pricing IS 'Template monetization and pricing configuration';
COMMENT ON TABLE template_purchases IS 'Purchase history and transaction tracking';
COMMENT ON TABLE creator_revenue IS 'Revenue tracking and payout management for creators';
COMMENT ON TABLE user_preferences IS 'User preferences for personalized recommendations';
COMMENT ON TABLE template_similarity IS 'Template similarity data for recommendation engine';
COMMENT ON TABLE marketplace_metrics IS 'Marketplace performance and analytics metrics';
COMMENT ON TABLE template_trending_scores IS 'Computed trending scores for template ranking';
COMMENT ON TABLE user_reputation IS 'User reputation and trust scores';
COMMENT ON TABLE moderation_queue IS 'Content moderation queue and review system';
COMMENT ON TABLE marketplace_features IS 'Feature flags for marketplace functionality';

COMMENT ON VIEW template_discovery_view IS 'Comprehensive template view with all metadata for discovery';
COMMENT ON VIEW user_social_stats IS 'User social statistics and reputation metrics';

COMMENT ON FUNCTION update_template_trending_scores() IS 'Updates trending scores for all templates based on recent activity';