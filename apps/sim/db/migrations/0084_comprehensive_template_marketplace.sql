-- =============================================
-- COMPREHENSIVE TEMPLATE MARKETPLACE MIGRATION
-- =============================================
-- 
-- This migration adds comprehensive template marketplace functionality including:
-- - Enhanced template metadata and categorization
-- - Community features (ratings, reviews, comments)
-- - Template collections and user profiles
-- - Analytics and usage tracking
-- - Enterprise governance and repositories
-- 
-- Migration: 0084_comprehensive_template_marketplace
-- Author: Claude Code Template System
-- Version: 2.0.0
-- Date: 2025-01-03

-- =========================
-- TEMPLATE CATEGORIES SYSTEM
-- =========================

-- Template categories for hierarchical organization
CREATE TABLE IF NOT EXISTS template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20) DEFAULT '#64748b',
  parent_category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  template_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for category system
CREATE INDEX idx_template_categories_parent ON template_categories(parent_category_id);
CREATE INDEX idx_template_categories_slug ON template_categories(slug);
CREATE INDEX idx_template_categories_active ON template_categories(is_active);
CREATE INDEX idx_template_categories_sort ON template_categories(sort_order);

-- =========================
-- TEMPLATE RATINGS & REVIEWS
-- =========================

-- Template ratings and reviews for community feedback
CREATE TABLE IF NOT EXISTS template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  review_text TEXT,
  helpful_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  reported_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one rating per user per template
  CONSTRAINT unique_user_template_rating UNIQUE(template_id, user_id)
);

-- Indexes for ratings system
CREATE INDEX idx_template_ratings_template ON template_ratings(template_id);
CREATE INDEX idx_template_ratings_user ON template_ratings(user_id);
CREATE INDEX idx_template_ratings_rating ON template_ratings(rating);
CREATE INDEX idx_template_ratings_created ON template_ratings(created_at);
CREATE INDEX idx_template_ratings_helpful ON template_ratings(helpful_count);

-- Rating helpfulness tracking
CREATE TABLE IF NOT EXISTS template_rating_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES template_ratings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- One vote per user per rating
  CONSTRAINT unique_user_rating_vote UNIQUE(rating_id, user_id)
);

-- =========================
-- TEMPLATE COMMENTS SYSTEM
-- =========================

-- Template comments for community discussion
CREATE TABLE IF NOT EXISTS template_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES template_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  reported_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for comments system
CREATE INDEX idx_template_comments_template ON template_comments(template_id);
CREATE INDEX idx_template_comments_user ON template_comments(user_id);
CREATE INDEX idx_template_comments_parent ON template_comments(parent_id);
CREATE INDEX idx_template_comments_created ON template_comments(created_at);

-- Comment voting system
CREATE TABLE IF NOT EXISTS template_comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES template_comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  is_upvote BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- One vote per user per comment
  CONSTRAINT unique_user_comment_vote UNIQUE(comment_id, user_id)
);

-- =========================
-- TEMPLATE COLLECTIONS
-- =========================

-- User-created template collections
CREATE TABLE IF NOT EXISTS template_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'folder',
  color VARCHAR(20) DEFAULT '#64748b',
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  template_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  star_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Collection templates (many-to-many relationship)
CREATE TABLE IF NOT EXISTS collection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES template_collections(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  added_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate templates in same collection
  CONSTRAINT unique_collection_template UNIQUE(collection_id, template_id)
);

-- Collection stars (users who starred collections)
CREATE TABLE IF NOT EXISTS collection_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES template_collections(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  starred_at TIMESTAMP DEFAULT NOW(),
  
  -- One star per user per collection
  CONSTRAINT unique_user_collection_star UNIQUE(collection_id, user_id)
);

-- Indexes for collections system
CREATE INDEX idx_template_collections_user ON template_collections(user_id);
CREATE INDEX idx_template_collections_public ON template_collections(is_public);
CREATE INDEX idx_template_collections_featured ON template_collections(is_featured);
CREATE INDEX idx_collection_templates_collection ON collection_templates(collection_id);
CREATE INDEX idx_collection_templates_template ON collection_templates(template_id);

-- =========================
-- USER PROFILES & SOCIAL
-- =========================

-- Enhanced user profiles for community features
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  display_name VARCHAR(255),
  bio TEXT,
  website VARCHAR(500),
  location VARCHAR(100),
  twitter_handle VARCHAR(50),
  github_handle VARCHAR(50),
  
  -- Community statistics
  templates_created INTEGER DEFAULT 0,
  templates_shared INTEGER DEFAULT 0,
  total_template_views INTEGER DEFAULT 0,
  total_template_stars INTEGER DEFAULT 0,
  contribution_score INTEGER DEFAULT 0,
  
  -- Profile settings
  is_public BOOLEAN DEFAULT true,
  show_email BOOLEAN DEFAULT false,
  show_stats BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  
  -- Verification and moderation
  is_verified BOOLEAN DEFAULT false,
  is_moderator BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User following system
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent self-following and duplicate follows
  CONSTRAINT prevent_self_follow CHECK (follower_id != following_id),
  CONSTRAINT unique_user_follow UNIQUE(follower_id, following_id)
);

-- Indexes for user system
CREATE INDEX idx_user_profiles_public ON user_profiles(is_public);
CREATE INDEX idx_user_profiles_verified ON user_profiles(is_verified);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- =========================
-- TEMPLATE ANALYTICS
-- =========================

-- Template usage analytics and metrics
CREATE TABLE IF NOT EXISTS template_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL, -- 'view', 'instantiate', 'star', 'share', etc.
  event_data JSONB,
  country_code VARCHAR(2),
  user_agent TEXT,
  ip_address INET,
  referrer VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Template performance metrics (aggregated daily)
CREATE TABLE IF NOT EXISTS template_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Daily metrics
  views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  instantiations INTEGER DEFAULT 0,
  stars_added INTEGER DEFAULT 0,
  stars_removed INTEGER DEFAULT 0,
  comments_added INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_rating DECIMAL(3,2),
  total_ratings INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- One record per template per date
  CONSTRAINT unique_template_date UNIQUE(template_id, date)
);

-- Indexes for analytics
CREATE INDEX idx_template_analytics_template ON template_analytics(template_id);
CREATE INDEX idx_template_analytics_event ON template_analytics(event_type);
CREATE INDEX idx_template_analytics_date ON template_analytics(created_at);
CREATE INDEX idx_template_metrics_template ON template_metrics(template_id);
CREATE INDEX idx_template_metrics_date ON template_metrics(date);

-- =========================
-- ENTERPRISE FEATURES
-- =========================

-- Private template repositories for organizations
CREATE TABLE IF NOT EXISTS template_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT, -- References organization table when available
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) NOT NULL,
  visibility VARCHAR(20) DEFAULT 'private', -- 'public', 'internal', 'private'
  
  -- Repository settings
  allow_public_templates BOOLEAN DEFAULT false,
  require_approval BOOLEAN DEFAULT true,
  auto_sync_enabled BOOLEAN DEFAULT false,
  
  -- Statistics
  template_count INTEGER DEFAULT 0,
  contributor_count INTEGER DEFAULT 0,
  
  created_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique slug per organization
  CONSTRAINT unique_org_repo_slug UNIQUE(organization_id, slug)
);

-- Repository permissions and access control
CREATE TABLE IF NOT EXISTS repository_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES template_repositories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- 'viewer', 'contributor', 'maintainer', 'admin'
  granted_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  granted_at TIMESTAMP DEFAULT NOW(),
  
  -- One permission per user per repository
  CONSTRAINT unique_user_repo_permission UNIQUE(repository_id, user_id)
);

-- Template repository assignments
CREATE TABLE IF NOT EXISTS template_repository_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES template_repositories(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMP DEFAULT NOW(),
  
  -- One assignment per template per repository
  CONSTRAINT unique_template_repo_assignment UNIQUE(template_id, repository_id)
);

-- Indexes for enterprise features
CREATE INDEX idx_template_repositories_org ON template_repositories(organization_id);
CREATE INDEX idx_template_repositories_visibility ON template_repositories(visibility);
CREATE INDEX idx_repository_permissions_repo ON repository_permissions(repository_id);
CREATE INDEX idx_repository_permissions_user ON repository_permissions(user_id);

-- =========================
-- TEMPLATE VERSIONING
-- =========================

-- Template version history and change tracking
CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version_number VARCHAR(50) NOT NULL,
  previous_version_id UUID REFERENCES template_versions(id),
  
  -- Version metadata
  version_name VARCHAR(255),
  description TEXT,
  changelog TEXT[],
  
  -- Template state at this version
  template_state JSONB NOT NULL,
  template_metadata JSONB,
  
  -- Change tracking
  changes_summary JSONB, -- Summary of what changed
  is_breaking BOOLEAN DEFAULT false,
  is_beta BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Publishing information
  published_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  published_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique version per template
  CONSTRAINT unique_template_version UNIQUE(template_id, version_number)
);

-- Version compatibility matrix
CREATE TABLE IF NOT EXISTS template_version_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_version_id UUID NOT NULL REFERENCES template_versions(id) ON DELETE CASCADE,
  to_version_id UUID NOT NULL REFERENCES template_versions(id) ON DELETE CASCADE,
  is_compatible BOOLEAN NOT NULL DEFAULT true,
  migration_required BOOLEAN DEFAULT false,
  migration_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for versioning
CREATE INDEX idx_template_versions_template ON template_versions(template_id);
CREATE INDEX idx_template_versions_number ON template_versions(version_number);
CREATE INDEX idx_template_versions_active ON template_versions(is_active);

-- =========================
-- SEARCH & DISCOVERY
-- =========================

-- Search analytics and popular queries
CREATE TABLE IF NOT EXISTS template_search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query TEXT NOT NULL,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  clicked_template_id TEXT REFERENCES templates(id) ON DELETE SET NULL,
  click_position INTEGER, -- Position of clicked result
  search_filters JSONB, -- Applied filters
  created_at TIMESTAMP DEFAULT NOW()
);

-- Popular search terms (aggregated)
CREATE TABLE IF NOT EXISTS popular_search_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_term VARCHAR(255) NOT NULL UNIQUE,
  search_count INTEGER NOT NULL DEFAULT 1,
  last_searched TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Template recommendations based on user behavior
CREATE TABLE IF NOT EXISTS template_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(50) NOT NULL, -- 'similar', 'trending', 'collaborative', etc.
  score DECIMAL(5,4) NOT NULL DEFAULT 0.5,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Indexes for search and discovery
CREATE INDEX idx_template_search_query ON template_search_analytics(search_query);
CREATE INDEX idx_template_search_user ON template_search_analytics(user_id);
CREATE INDEX idx_template_search_date ON template_search_analytics(created_at);
CREATE INDEX idx_popular_search_terms_count ON popular_search_terms(search_count DESC);
CREATE INDEX idx_template_recommendations_user ON template_recommendations(user_id);
CREATE INDEX idx_template_recommendations_score ON template_recommendations(score DESC);

-- =========================
-- MODERATION & REPORTING
-- =========================

-- Content moderation and reporting system
CREATE TABLE IF NOT EXISTS template_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  reported_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- 'spam', 'inappropriate', 'copyright', 'security', etc.
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  
  -- Moderation response
  reviewed_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  resolution TEXT,
  action_taken VARCHAR(50), -- 'none', 'warning', 'hidden', 'removed', 'banned'
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Moderation actions log
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(20) NOT NULL, -- 'template', 'comment', 'user', 'collection'
  target_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  action_type VARCHAR(50) NOT NULL, -- 'hide', 'remove', 'ban', 'warn', 'feature', etc.
  reason TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for moderation
CREATE INDEX idx_template_reports_template ON template_reports(template_id);
CREATE INDEX idx_template_reports_status ON template_reports(status);
CREATE INDEX idx_template_reports_type ON template_reports(report_type);
CREATE INDEX idx_moderation_actions_target ON moderation_actions(target_type, target_id);
CREATE INDEX idx_moderation_actions_moderator ON moderation_actions(moderator_id);

-- =========================
-- NOTIFICATION SYSTEM
-- =========================

-- User notification preferences and delivery
CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  
  -- Email notifications
  email_template_updates BOOLEAN DEFAULT true,
  email_new_ratings BOOLEAN DEFAULT true,
  email_new_comments BOOLEAN DEFAULT true,
  email_new_followers BOOLEAN DEFAULT true,
  email_weekly_digest BOOLEAN DEFAULT true,
  
  -- In-app notifications
  app_template_updates BOOLEAN DEFAULT true,
  app_new_ratings BOOLEAN DEFAULT true,
  app_new_comments BOOLEAN DEFAULT true,
  app_new_followers BOOLEAN DEFAULT true,
  app_system_announcements BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification queue and delivery tracking
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  
  -- Delivery tracking
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  delivery_method VARCHAR(20), -- 'email', 'app', 'push'
  delivery_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  delivery_attempts INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  scheduled_for TIMESTAMP DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX idx_notifications_status ON notifications(delivery_status);

-- =========================
-- UPDATE EXISTING TEMPLATES TABLE
-- =========================

-- Add new columns to existing templates table for enhanced functionality
ALTER TABLE templates 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES template_categories(id),
  ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fork_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS metadata_version VARCHAR(10) DEFAULT '2.0';

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_rating ON templates(rating_average DESC);
CREATE INDEX IF NOT EXISTS idx_templates_downloads ON templates(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_templates_featured ON templates(featured);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_visibility ON templates(visibility);

-- =========================
-- SEED DATA FOR CATEGORIES
-- =========================

-- Insert default template categories
INSERT INTO template_categories (name, slug, description, icon, color, sort_order) VALUES
  ('Business Automation', 'business-automation', 'Streamline business processes with CRM workflows, marketing campaigns, and operational automation', 'briefcase', '#3b82f6', 1),
  ('Data Processing & ETL', 'data-processing', 'Data transformation, database synchronization, and analytics workflows', 'database', '#6366f1', 2),
  ('DevOps & CI/CD', 'devops-cicd', 'Deployment automation, testing workflows, and infrastructure management', 'server', '#ef4444', 3),
  ('Social Media Management', 'social-media', 'Content publishing, engagement tracking, and social media automation', 'share-2', '#ec4899', 4),
  ('E-commerce Automation', 'ecommerce', 'Order processing, inventory management, and customer service workflows', 'shopping-cart', '#059669', 5),
  ('Financial & Accounting', 'financial', 'Invoice processing, payment automation, and financial reporting', 'dollar-sign', '#eab308', 6),
  ('Human Resources', 'human-resources', 'Employee onboarding, recruitment workflows, and HR automation', 'users', '#06b6d4', 7),
  ('Education & Training', 'education', 'Course management, student workflows, and educational automation', 'graduation-cap', '#7c3aed', 8)
ON CONFLICT (slug) DO NOTHING;

-- =========================
-- FUNCTIONS AND TRIGGERS
-- =========================

-- Function to update template rating average when new ratings are added
CREATE OR REPLACE FUNCTION update_template_rating_average()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE templates 
  SET 
    rating_average = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM template_ratings 
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
      AND is_hidden = false
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM template_ratings 
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
      AND is_hidden = false
    )
  WHERE id = COALESCE(NEW.template_id, OLD.template_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for rating average updates
DROP TRIGGER IF EXISTS trigger_update_template_rating_average ON template_ratings;
CREATE TRIGGER trigger_update_template_rating_average
  AFTER INSERT OR UPDATE OR DELETE ON template_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating_average();

-- Function to update collection template count
CREATE OR REPLACE FUNCTION update_collection_template_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE template_collections 
  SET template_count = (
    SELECT COUNT(*) 
    FROM collection_templates 
    WHERE collection_id = COALESCE(NEW.collection_id, OLD.collection_id)
  )
  WHERE id = COALESCE(NEW.collection_id, OLD.collection_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for collection template count updates
DROP TRIGGER IF EXISTS trigger_update_collection_template_count ON collection_templates;
CREATE TRIGGER trigger_update_collection_template_count
  AFTER INSERT OR UPDATE OR DELETE ON collection_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_template_count();

-- Function to update user profile statistics
CREATE OR REPLACE FUNCTION update_user_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles 
  SET 
    templates_created = (
      SELECT COUNT(*) 
      FROM templates 
      WHERE userId = COALESCE(NEW.userId, OLD.userId)
    ),
    total_template_views = (
      SELECT COALESCE(SUM(views), 0)
      FROM templates 
      WHERE userId = COALESCE(NEW.userId, OLD.userId)
    ),
    total_template_stars = (
      SELECT COALESCE(SUM(stars), 0)
      FROM templates 
      WHERE userId = COALESCE(NEW.userId, OLD.userId)
    )
  WHERE user_id = COALESCE(NEW.userId, OLD.userId);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for user profile statistics updates
DROP TRIGGER IF EXISTS trigger_update_user_profile_stats ON templates;
CREATE TRIGGER trigger_update_user_profile_stats
  AFTER INSERT OR UPDATE OR DELETE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_stats();

-- =========================
-- VIEWS FOR COMMON QUERIES
-- =========================

-- View for template details with enhanced metadata
CREATE OR REPLACE VIEW template_details_view AS
SELECT 
  t.*,
  tc.name as category_name,
  tc.icon as category_icon,
  tc.color as category_color,
  up.display_name as author_display_name,
  up.is_verified as author_verified,
  COALESCE(star_counts.star_count, 0) as current_star_count,
  COALESCE(comment_counts.comment_count, 0) as comment_count,
  recent_ratings.recent_rating_count,
  recent_ratings.recent_rating_average
FROM templates t
LEFT JOIN template_categories tc ON t.category_id = tc.id
LEFT JOIN user_profiles up ON t.userId = up.user_id
LEFT JOIN (
  SELECT template_id, COUNT(*) as star_count
  FROM template_stars
  GROUP BY template_id
) star_counts ON t.id = star_counts.template_id
LEFT JOIN (
  SELECT template_id, COUNT(*) as comment_count
  FROM template_comments
  WHERE is_hidden = false
  GROUP BY template_id
) comment_counts ON t.id = comment_counts.template_id
LEFT JOIN (
  SELECT 
    template_id,
    COUNT(*) as recent_rating_count,
    ROUND(AVG(rating)::numeric, 2) as recent_rating_average
  FROM template_ratings
  WHERE created_at >= NOW() - INTERVAL '30 days'
  AND is_hidden = false
  GROUP BY template_id
) recent_ratings ON t.id = recent_ratings.template_id;

-- View for popular templates with trending metrics
CREATE OR REPLACE VIEW popular_templates_view AS
SELECT 
  t.*,
  tc.name as category_name,
  -- Calculate trending score based on recent activity
  COALESCE(
    (recent_metrics.recent_views * 1.0) +
    (recent_metrics.recent_stars * 3.0) +
    (recent_metrics.recent_instantiations * 5.0) +
    (recent_metrics.recent_ratings * 2.0),
    0
  ) as trending_score,
  recent_metrics.recent_views,
  recent_metrics.recent_stars,
  recent_metrics.recent_instantiations
FROM templates t
LEFT JOIN template_categories tc ON t.category_id = tc.id
LEFT JOIN (
  SELECT 
    tm.template_id,
    SUM(tm.views) as recent_views,
    SUM(tm.stars_added) as recent_stars,
    SUM(tm.instantiations) as recent_instantiations,
    COUNT(tr.id) as recent_ratings
  FROM template_metrics tm
  LEFT JOIN template_ratings tr ON tm.template_id = tr.template_id 
    AND tr.created_at >= NOW() - INTERVAL '7 days'
  WHERE tm.date >= NOW() - INTERVAL '7 days'
  GROUP BY tm.template_id
) recent_metrics ON t.id = recent_metrics.template_id
WHERE t.status = 'published'
AND t.visibility = 'public'
ORDER BY trending_score DESC;

-- =========================
-- COMPLETION MESSAGE
-- =========================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Successfully completed comprehensive template marketplace migration 0084';
  RAISE NOTICE 'Added: Categories, Ratings, Comments, Collections, Analytics, Enterprise features';
  RAISE NOTICE 'Created: % tables, % indexes, % views, % functions', 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'template_%' OR table_name LIKE 'collection_%' OR table_name LIKE 'user_%'),
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%template%'),
    2, -- number of views created
    3; -- number of functions created
END $$;