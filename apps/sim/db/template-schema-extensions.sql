/**
 * Template Library System - Database Schema Extensions
 * 
 * Comprehensive template system for business automation workflows to compete with n8n.
 * This schema extends the existing Sim database with template storage, categorization,
 * rating, discovery, and community features.
 * 
 * ARCHITECTURE OVERVIEW:
 * - Template Storage: JSONB workflow templates with metadata and versioning
 * - Category System: Hierarchical categories with tags for organization  
 * - Discovery System: Full-text search, filtering, and recommendation engine
 * - Rating System: 5-star ratings, reviews, and quality metrics
 * - Usage Analytics: Template adoption tracking and optimization insights
 * - Community Features: User contributions, moderation, and social engagement
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - GIN indexes on JSONB fields for fast template search
 * - Full-text search indexes for content discovery
 * - Materialized views for analytics and trending templates
 * - Efficient category hierarchies with path enumeration
 * - Optimized for high-read workloads with template browsing
 *
 * INTEGRATION POINTS:
 * - Seamless integration with existing workflow and user tables
 * - Compatible with workflow editor for one-click template instantiation
 * - Integration with existing analytics and monitoring systems
 * 
 * @created 2025-09-04
 * @author Sim Template Library System
 */

-- ========================
-- TEMPLATE CATEGORIES & TAGS
-- ========================

/**
 * Template categories table - Hierarchical organization system
 * 
 * Provides structured categorization for templates with support for:
 * - Nested categories (Business > CRM > Lead Management)
 * - Visual customization (colors, icons)
 * - SEO optimization (slugs, descriptions)
 * - Analytics tracking (usage counts)
 * 
 * PERFORMANCE: Materialized path pattern for efficient hierarchy queries
 */
CREATE TABLE IF NOT EXISTS template_categories (
  id TEXT PRIMARY KEY, -- UUID format for category identification
  name TEXT NOT NULL, -- Display name (e.g., "Business Automation")
  slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier (e.g., "business-automation")
  description TEXT, -- Category purpose and content description
  icon TEXT, -- Lucide icon name for UI display
  color TEXT NOT NULL DEFAULT '#6366F1', -- Hex color for visual theming
  
  -- Hierarchical organization
  parent_id TEXT REFERENCES template_categories(id) ON DELETE CASCADE,
  path TEXT NOT NULL, -- Materialized path (e.g., "/business/crm/leads")
  depth INTEGER NOT NULL DEFAULT 0, -- Nesting level for query optimization
  sort_order INTEGER NOT NULL DEFAULT 0, -- Display order within parent
  
  -- Analytics and metadata
  template_count INTEGER NOT NULL DEFAULT 0, -- Number of templates in category
  is_featured BOOLEAN NOT NULL DEFAULT false, -- Highlight in discovery UI
  is_active BOOLEAN NOT NULL DEFAULT true, -- Enable/disable category
  
  -- SEO and content
  meta_title TEXT, -- SEO page title
  meta_description TEXT, -- SEO page description
  content_description TEXT, -- Rich content for category pages
  
  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL
);

-- Indexes for category performance
CREATE INDEX IF NOT EXISTS template_categories_parent_id_idx ON template_categories(parent_id);
CREATE INDEX IF NOT EXISTS template_categories_path_idx ON template_categories(path);
CREATE INDEX IF NOT EXISTS template_categories_depth_idx ON template_categories(depth);
CREATE INDEX IF NOT EXISTS template_categories_featured_active_idx ON template_categories(is_featured, is_active);
CREATE INDEX IF NOT EXISTS template_categories_slug_idx ON template_categories(slug);

/**
 * Template tags table - Flexible labeling system
 * 
 * Provides cross-cutting concerns and metadata tagging:
 * - Skill levels (beginner, intermediate, advanced)
 * - Integration types (salesforce, hubspot, slack)
 * - Use cases (automation, reporting, integration)
 * - Industry tags (ecommerce, finance, marketing)
 */
CREATE TABLE IF NOT EXISTS template_tags (
  id TEXT PRIMARY KEY, -- UUID format for tag identification
  name TEXT NOT NULL UNIQUE, -- Tag display name (e.g., "Salesforce Integration")
  slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier (e.g., "salesforce-integration")
  description TEXT, -- Tag purpose and usage description
  color TEXT NOT NULL DEFAULT '#6B7280', -- Hex color for visual theming
  
  -- Tag categorization
  tag_type TEXT NOT NULL DEFAULT 'general', -- 'skill', 'integration', 'industry', 'use_case', 'general'
  is_system_tag BOOLEAN NOT NULL DEFAULT false, -- System-managed vs user-created
  
  -- Usage analytics
  usage_count INTEGER NOT NULL DEFAULT 0, -- Number of templates using this tag
  
  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL
);

-- Indexes for tag performance
CREATE INDEX IF NOT EXISTS template_tags_type_idx ON template_tags(tag_type);
CREATE INDEX IF NOT EXISTS template_tags_usage_idx ON template_tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS template_tags_system_idx ON template_tags(is_system_tag);

-- ========================
-- CORE TEMPLATE SYSTEM
-- ========================

/**
 * Templates table - Core template storage and metadata
 * 
 * Stores workflow templates with comprehensive metadata:
 * - Complete workflow definition in JSONB format
 * - Rich metadata for discovery and analytics
 * - Version control and approval workflow
 * - Performance and usage tracking
 * - SEO and content management
 * 
 * STORAGE: Uses JSONB for flexible workflow template storage
 * PERFORMANCE: Optimized for read-heavy workloads with comprehensive indexing
 */
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY, -- UUID format for template identification
  
  -- Core template information
  name TEXT NOT NULL, -- Template display name (e.g., "Lead Qualification Workflow")
  slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier for SEO
  description TEXT NOT NULL, -- Brief template description for discovery
  long_description TEXT, -- Detailed explanation and use cases
  
  -- Template storage and structure
  workflow_template JSONB NOT NULL, -- Complete workflow definition (blocks, edges, configuration)
  template_version TEXT NOT NULL DEFAULT '1.0.0', -- Semantic version for template updates
  min_sim_version TEXT, -- Minimum required Sim version for compatibility
  
  -- Categorization and organization
  category_id TEXT NOT NULL REFERENCES template_categories(id) ON DELETE CASCADE,
  
  -- Template metadata and configuration
  difficulty_level TEXT NOT NULL DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced', 'expert'
  estimated_setup_time INTEGER, -- Setup time in minutes
  estimated_execution_time INTEGER, -- Average execution time in seconds
  
  -- Publishing and moderation
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_review', 'approved', 'rejected', 'archived'
  visibility TEXT NOT NULL DEFAULT 'private', -- 'private', 'unlisted', 'public'
  is_featured BOOLEAN NOT NULL DEFAULT false, -- Highlight in discovery UI
  is_community_template BOOLEAN NOT NULL DEFAULT false, -- User-contributed vs official
  
  -- Analytics and performance tracking
  view_count INTEGER NOT NULL DEFAULT 0, -- Number of times template was viewed
  download_count INTEGER NOT NULL DEFAULT 0, -- Number of times template was used
  like_count INTEGER NOT NULL DEFAULT 0, -- Number of user likes/favorites
  rating_average DECIMAL(3,2) DEFAULT 0, -- Average rating (0.00 to 5.00)
  rating_count INTEGER NOT NULL DEFAULT 0, -- Number of ratings received
  
  -- Quality and validation metrics
  last_tested_at TIMESTAMP, -- Last successful template validation
  test_success_rate DECIMAL(5,2) DEFAULT 0, -- Percentage of successful test runs
  community_score DECIMAL(5,2) DEFAULT 0, -- Algorithm-calculated quality score
  
  -- SEO and content management
  meta_title TEXT, -- SEO page title
  meta_description TEXT, -- SEO page description
  cover_image_url TEXT, -- Template preview image
  preview_images JSONB DEFAULT '[]', -- Array of screenshot URLs
  
  -- Business value and ROI
  estimated_cost_savings DECIMAL(10,2), -- Estimated monthly cost savings in USD
  estimated_time_savings INTEGER, -- Estimated time savings per execution in minutes
  business_value_description TEXT, -- Explanation of business benefits
  
  -- Integration requirements
  required_integrations JSONB DEFAULT '[]', -- Array of required external services
  supported_integrations JSONB DEFAULT '[]', -- Array of supported but optional services
  technical_requirements TEXT, -- Additional setup requirements
  
  -- User and ownership
  created_by_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  approved_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  
  -- Versioning and history
  parent_template_id TEXT REFERENCES templates(id) ON DELETE SET NULL, -- For template forks/variants
  original_template_id TEXT REFERENCES templates(id) ON DELETE SET NULL, -- Track original for forks
  
  -- Audit and timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP,
  last_modified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', name), 'A') ||
    setweight(to_tsvector('english', description), 'B') ||
    setweight(to_tsvector('english', COALESCE(long_description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(business_value_description, '')), 'D')
  ) STORED
);

-- Comprehensive indexes for template performance
CREATE INDEX IF NOT EXISTS templates_category_id_idx ON templates(category_id);
CREATE INDEX IF NOT EXISTS templates_created_by_idx ON templates(created_by_user_id);
CREATE INDEX IF NOT EXISTS templates_status_visibility_idx ON templates(status, visibility);
CREATE INDEX IF NOT EXISTS templates_featured_idx ON templates(is_featured, status, visibility);
CREATE INDEX IF NOT EXISTS templates_community_idx ON templates(is_community_template, status, visibility);
CREATE INDEX IF NOT EXISTS templates_rating_idx ON templates(rating_average DESC, rating_count DESC);
CREATE INDEX IF NOT EXISTS templates_popularity_idx ON templates(download_count DESC, view_count DESC);
CREATE INDEX IF NOT EXISTS templates_difficulty_idx ON templates(difficulty_level);
CREATE INDEX IF NOT EXISTS templates_published_idx ON templates(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS templates_search_idx ON templates USING gin(search_vector);
CREATE INDEX IF NOT EXISTS templates_workflow_gin_idx ON templates USING gin(workflow_template);
CREATE INDEX IF NOT EXISTS templates_integrations_gin_idx ON templates USING gin(required_integrations, supported_integrations);

/**
 * Template tags association table - Many-to-many relationship
 * 
 * Links templates to tags for flexible categorization and discovery
 */
CREATE TABLE IF NOT EXISTS template_tag_associations (
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES template_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (template_id, tag_id)
);

-- Indexes for tag associations
CREATE INDEX IF NOT EXISTS template_tag_assoc_template_idx ON template_tag_associations(template_id);
CREATE INDEX IF NOT EXISTS template_tag_assoc_tag_idx ON template_tag_associations(tag_id);

-- ========================
-- RATINGS AND REVIEWS SYSTEM
-- ========================

/**
 * Template ratings table - User rating and review system
 * 
 * Comprehensive review system supporting:
 * - 5-star rating system with detailed feedback
 * - Helpful/unhelpful voting on reviews
 * - Moderation and quality control
 * - Analytics for template improvement
 */
CREATE TABLE IF NOT EXISTS template_ratings (
  id TEXT PRIMARY KEY, -- UUID format for rating identification
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  
  -- Rating and review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- 1-5 star rating
  review_title TEXT, -- Optional review headline
  review_content TEXT, -- Detailed review text
  
  -- Review categorization
  usage_context TEXT, -- How the user used the template
  user_expertise_level TEXT DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced'
  
  -- Template-specific feedback
  ease_of_use_rating INTEGER CHECK (ease_of_use_rating >= 1 AND ease_of_use_rating <= 5),
  documentation_rating INTEGER CHECK (documentation_rating >= 1 AND documentation_rating <= 5),
  performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- Review engagement and quality
  helpful_count INTEGER NOT NULL DEFAULT 0, -- Number of "helpful" votes
  unhelpful_count INTEGER NOT NULL DEFAULT 0, -- Number of "unhelpful" votes
  is_verified_usage BOOLEAN NOT NULL DEFAULT false, -- User actually used the template
  
  -- Moderation and quality control
  is_approved BOOLEAN NOT NULL DEFAULT true, -- Review approval status
  is_featured BOOLEAN NOT NULL DEFAULT false, -- Highlight as exemplary review
  moderation_notes TEXT, -- Internal moderation comments
  flagged_count INTEGER NOT NULL DEFAULT 0, -- Number of user flags for inappropriate content
  
  -- Audit and timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one review per user per template
  UNIQUE(template_id, user_id)
);

-- Indexes for rating system performance
CREATE INDEX IF NOT EXISTS template_ratings_template_idx ON template_ratings(template_id, rating DESC);
CREATE INDEX IF NOT EXISTS template_ratings_user_idx ON template_ratings(user_id);
CREATE INDEX IF NOT EXISTS template_ratings_approved_idx ON template_ratings(is_approved, created_at DESC);
CREATE INDEX IF NOT EXISTS template_ratings_helpful_idx ON template_ratings(helpful_count DESC);
CREATE INDEX IF NOT EXISTS template_ratings_verified_idx ON template_ratings(is_verified_usage, rating DESC);

/**
 * Rating helpfulness votes table - Community-driven review quality
 */
CREATE TABLE IF NOT EXISTS template_rating_votes (
  rating_id TEXT NOT NULL REFERENCES template_ratings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL, -- true = helpful, false = unhelpful
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (rating_id, user_id)
);

-- Index for vote performance
CREATE INDEX IF NOT EXISTS template_rating_votes_rating_idx ON template_rating_votes(rating_id, is_helpful);

-- ========================
-- USAGE ANALYTICS & TRACKING
-- ========================

/**
 * Template usage analytics table - Detailed usage tracking
 * 
 * Comprehensive analytics for template optimization:
 * - Usage patterns and adoption metrics
 * - Performance tracking and optimization insights
 * - User behavior analysis for recommendations
 * - Business impact measurement
 */
CREATE TABLE IF NOT EXISTS template_usage_analytics (
  id TEXT PRIMARY KEY, -- UUID for analytics record
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL, -- NULL for anonymous usage
  
  -- Usage event tracking
  event_type TEXT NOT NULL, -- 'view', 'download', 'instantiate', 'customize', 'deploy', 'execute'
  event_context JSONB DEFAULT '{}', -- Additional event metadata
  
  -- Template instantiation details
  customizations_made JSONB DEFAULT '{}', -- Record of user modifications
  setup_time_seconds INTEGER, -- Time spent customizing template
  success_on_first_try BOOLEAN, -- Whether template worked immediately
  
  -- Performance and outcome tracking
  execution_time_seconds INTEGER, -- Template execution duration
  execution_success BOOLEAN, -- Whether execution completed successfully
  error_details TEXT, -- Error information if execution failed
  cost_incurred DECIMAL(10,4), -- Execution cost in USD
  
  -- User context and environment
  user_agent TEXT, -- Browser/client information
  referrer_url TEXT, -- How user discovered the template
  workspace_id TEXT REFERENCES workspace(id) ON DELETE SET NULL,
  
  -- Geographic and temporal context
  country_code TEXT, -- User location (2-letter ISO code)
  timezone TEXT, -- User timezone
  usage_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Integration and technical details
  integrations_used JSONB DEFAULT '[]', -- Array of integrations activated
  blocks_modified INTEGER DEFAULT 0, -- Number of blocks user customized
  variables_configured INTEGER DEFAULT 0, -- Number of variables user set
  
  -- Business outcome tracking
  estimated_time_saved INTEGER, -- Time savings achieved in minutes
  estimated_cost_saved DECIMAL(10,2), -- Cost savings achieved in USD
  user_satisfaction_score INTEGER, -- 1-5 rating of template experience
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for analytics performance
CREATE INDEX IF NOT EXISTS template_usage_template_idx ON template_usage_analytics(template_id, usage_timestamp DESC);
CREATE INDEX IF NOT EXISTS template_usage_user_idx ON template_usage_analytics(user_id, usage_timestamp DESC);
CREATE INDEX IF NOT EXISTS template_usage_event_idx ON template_usage_analytics(event_type, usage_timestamp DESC);
CREATE INDEX IF NOT EXISTS template_usage_success_idx ON template_usage_analytics(template_id, execution_success);
CREATE INDEX IF NOT EXISTS template_usage_timestamp_idx ON template_usage_analytics(usage_timestamp DESC);
CREATE INDEX IF NOT EXISTS template_usage_workspace_idx ON template_usage_analytics(workspace_id, usage_timestamp DESC);

-- ========================
-- COMMUNITY AND SOCIAL FEATURES
-- ========================

/**
 * Template collections table - User-curated template sets
 * 
 * Allows users to create and share curated collections of templates
 * similar to playlists or reading lists
 */
CREATE TABLE IF NOT EXISTS template_collections (
  id TEXT PRIMARY KEY, -- UUID for collection identification
  name TEXT NOT NULL, -- Collection display name
  description TEXT, -- Collection purpose and contents
  slug TEXT NOT NULL, -- URL-friendly identifier
  
  -- Collection metadata
  is_public BOOLEAN NOT NULL DEFAULT false, -- Public vs private collection
  is_featured BOOLEAN NOT NULL DEFAULT false, -- Highlight in discovery
  cover_image_url TEXT, -- Collection thumbnail
  
  -- User and ownership
  created_by_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  
  -- Analytics
  view_count INTEGER NOT NULL DEFAULT 0,
  follow_count INTEGER NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Unique slug per user
  UNIQUE(created_by_user_id, slug)
);

-- Indexes for collections
CREATE INDEX IF NOT EXISTS template_collections_user_idx ON template_collections(created_by_user_id);
CREATE INDEX IF NOT EXISTS template_collections_public_idx ON template_collections(is_public, is_featured);
CREATE INDEX IF NOT EXISTS template_collections_slug_idx ON template_collections(slug);

/**
 * Collection templates association table - Templates in collections
 */
CREATE TABLE IF NOT EXISTS template_collection_items (
  collection_id TEXT NOT NULL REFERENCES template_collections(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0, -- Display order within collection
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT, -- User notes about why template is in collection
  PRIMARY KEY (collection_id, template_id)
);

-- Indexes for collection items
CREATE INDEX IF NOT EXISTS collection_items_collection_idx ON template_collection_items(collection_id, sort_order);
CREATE INDEX IF NOT EXISTS collection_items_template_idx ON template_collection_items(template_id);

/**
 * User template favorites table - Personal bookmarking system
 */
CREATE TABLE IF NOT EXISTS template_favorites (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT, -- Personal notes about the template
  PRIMARY KEY (user_id, template_id)
);

-- Indexes for favorites
CREATE INDEX IF NOT EXISTS template_favorites_user_idx ON template_favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_favorites_template_idx ON template_favorites(template_id);

-- ========================
-- SEARCH AND DISCOVERY OPTIMIZATION
-- ========================

/**
 * Template search queries table - Search analytics and optimization
 * 
 * Track user search behavior to improve discovery and recommendations
 */
CREATE TABLE IF NOT EXISTS template_search_queries (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL, -- User search query
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  
  -- Search context
  filters_applied JSONB DEFAULT '{}', -- Applied category/tag filters
  sort_order TEXT DEFAULT 'relevance', -- Sort preference
  results_count INTEGER DEFAULT 0, -- Number of results returned
  
  -- User interaction
  clicked_template_ids JSONB DEFAULT '[]', -- Templates user clicked
  no_results BOOLEAN DEFAULT false, -- Whether search returned no results
  
  -- Analytics
  search_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  session_id TEXT, -- User session identifier
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for search analytics
CREATE INDEX IF NOT EXISTS search_queries_query_idx ON template_search_queries(query);
CREATE INDEX IF NOT EXISTS search_queries_timestamp_idx ON template_search_queries(search_timestamp DESC);
CREATE INDEX IF NOT EXISTS search_queries_no_results_idx ON template_search_queries(no_results) WHERE no_results = true;

-- ========================
-- TRIGGERS AND AUTOMATION
-- ========================

/**
 * Trigger: Update template rating aggregates when ratings change
 */
CREATE OR REPLACE FUNCTION update_template_rating_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update rating statistics for the template
  UPDATE templates 
  SET 
    rating_average = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM template_ratings 
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
      AND is_approved = true
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM template_ratings 
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
      AND is_approved = true
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.template_id, OLD.template_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for rating aggregation
CREATE TRIGGER template_rating_insert_trigger
  AFTER INSERT ON template_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating_aggregates();

CREATE TRIGGER template_rating_update_trigger
  AFTER UPDATE ON template_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating_aggregates();

CREATE TRIGGER template_rating_delete_trigger
  AFTER DELETE ON template_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating_aggregates();

/**
 * Trigger: Update category template counts
 */
CREATE OR REPLACE FUNCTION update_category_template_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update count for new category (on INSERT/UPDATE)
  IF NEW IS NOT NULL THEN
    UPDATE template_categories 
    SET template_count = (
      SELECT COUNT(*) 
      FROM templates 
      WHERE category_id = NEW.category_id 
      AND status = 'approved' 
      AND visibility = 'public'
    )
    WHERE id = NEW.category_id;
  END IF;
  
  -- Update count for old category (on UPDATE/DELETE)
  IF OLD IS NOT NULL AND (NEW IS NULL OR OLD.category_id != NEW.category_id) THEN
    UPDATE template_categories 
    SET template_count = (
      SELECT COUNT(*) 
      FROM templates 
      WHERE category_id = OLD.category_id 
      AND status = 'approved' 
      AND visibility = 'public'
    )
    WHERE id = OLD.category_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for category counts
CREATE TRIGGER template_category_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_category_template_counts();

/**
 * Trigger: Update tag usage counts
 */
CREATE OR REPLACE FUNCTION update_tag_usage_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update count for new tag association
  IF NEW IS NOT NULL THEN
    UPDATE template_tags 
    SET usage_count = (
      SELECT COUNT(*) 
      FROM template_tag_associations tta
      JOIN templates t ON tta.template_id = t.id
      WHERE tta.tag_id = NEW.tag_id 
      AND t.status = 'approved' 
      AND t.visibility = 'public'
    )
    WHERE id = NEW.tag_id;
  END IF;
  
  -- Update count for removed tag association
  IF OLD IS NOT NULL THEN
    UPDATE template_tags 
    SET usage_count = (
      SELECT COUNT(*) 
      FROM template_tag_associations tta
      JOIN templates t ON tta.template_id = t.id
      WHERE tta.tag_id = OLD.tag_id 
      AND t.status = 'approved' 
      AND t.visibility = 'public'
    )
    WHERE id = OLD.tag_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tag usage counts
CREATE TRIGGER template_tag_usage_trigger
  AFTER INSERT OR DELETE ON template_tag_associations
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_counts();

-- ========================
-- INITIAL DATA SEEDING
-- ========================

/**
 * Insert default template categories
 * Comprehensive business automation categories to compete with n8n
 */
INSERT INTO template_categories (id, name, slug, description, icon, color, path, depth, sort_order) VALUES
-- Top-level categories
('cat_business_automation', 'Business Automation', 'business-automation', 'CRM workflows, marketing campaigns, sales pipelines, and lead management automation', 'Briefcase', '#3B82F6', '/business-automation', 0, 1),
('cat_data_processing', 'Data Processing & ETL', 'data-processing', 'Data transformation pipelines, database synchronization, and API data collection', 'Database', '#10B981', '/data-processing', 0, 2),
('cat_devops_ci_cd', 'DevOps & CI/CD', 'devops-ci-cd', 'Deployment automation, testing workflows, monitoring and alerting', 'Server', '#F59E0B', '/devops-ci-cd', 0, 3),
('cat_social_media', 'Social Media Management', 'social-media', 'Content publishing, engagement tracking, cross-platform posting automation', 'Share2', '#8B5CF6', '/social-media', 0, 4),
('cat_ecommerce', 'E-commerce Automation', 'ecommerce', 'Order processing, inventory management, customer service workflows', 'ShoppingCart', '#EF4444', '/ecommerce', 0, 5),
('cat_finance_accounting', 'Finance & Accounting', 'finance-accounting', 'Invoice processing, payment automation, financial reporting', 'DollarSign', '#059669', '/finance-accounting', 0, 6)

-- Seed system tags for common use cases
ON CONFLICT (id) DO NOTHING;

INSERT INTO template_tags (id, name, slug, description, tag_type, is_system_tag, color) VALUES
-- Skill level tags
('tag_beginner', 'Beginner', 'beginner', 'Templates suitable for users new to workflow automation', 'skill', true, '#22C55E'),
('tag_intermediate', 'Intermediate', 'intermediate', 'Templates requiring some workflow automation experience', 'skill', true, '#F59E0B'),
('tag_advanced', 'Advanced', 'advanced', 'Templates for experienced automation users', 'skill', true, '#EF4444'),
('tag_expert', 'Expert', 'expert', 'Templates requiring deep technical expertise', 'skill', true, '#7C3AED'),

-- Integration tags
('tag_salesforce', 'Salesforce', 'salesforce', 'Templates that integrate with Salesforce CRM', 'integration', true, '#00A1E0'),
('tag_hubspot', 'HubSpot', 'hubspot', 'Templates that integrate with HubSpot CRM', 'integration', true, '#FF7A59'),
('tag_slack', 'Slack', 'slack', 'Templates that integrate with Slack messaging', 'integration', true, '#4A154B'),
('tag_zapier', 'Zapier Compatible', 'zapier-compatible', 'Templates compatible with Zapier workflows', 'integration', true, '#FF4A00'),
('tag_gmail', 'Gmail', 'gmail', 'Templates that integrate with Gmail email', 'integration', true, '#EA4335'),
('tag_google_sheets', 'Google Sheets', 'google-sheets', 'Templates that integrate with Google Sheets', 'integration', true, '#34A853'),

-- Use case tags
('tag_lead_generation', 'Lead Generation', 'lead-generation', 'Templates focused on generating and capturing leads', 'use_case', true, '#8B5CF6'),
('tag_customer_onboarding', 'Customer Onboarding', 'customer-onboarding', 'Templates for automated customer onboarding processes', 'use_case', true, '#06B6D4'),
('tag_reporting', 'Reporting & Analytics', 'reporting', 'Templates for automated reporting and data analysis', 'use_case', true, '#10B981'),
('tag_notifications', 'Notifications', 'notifications', 'Templates for automated notifications and alerts', 'use_case', true, '#F59E0B'),

-- Industry tags
('tag_saas', 'SaaS', 'saas', 'Templates designed for SaaS businesses', 'industry', true, '#6366F1'),
('tag_ecommerce_industry', 'E-commerce', 'ecommerce-industry', 'Templates for online retail businesses', 'industry', true, '#DC2626'),
('tag_finance_industry', 'Finance', 'finance-industry', 'Templates for financial services', 'industry', true, '#059669'),
('tag_healthcare', 'Healthcare', 'healthcare', 'Templates for healthcare organizations', 'industry', true, '#0EA5E9'),
('tag_education', 'Education', 'education', 'Templates for educational institutions', 'industry', true, '#7C3AED')

ON CONFLICT (id) DO NOTHING;

-- ========================
-- VIEWS AND ANALYTICS
-- ========================

/**
 * Template discovery view - Optimized for template browsing
 * 
 * Pre-computed view with all necessary data for template gallery display
 */
CREATE OR REPLACE VIEW template_discovery AS
SELECT 
  t.id,
  t.name,
  t.slug,
  t.description,
  t.difficulty_level,
  t.estimated_setup_time,
  t.category_id,
  tc.name as category_name,
  tc.slug as category_slug,
  tc.color as category_color,
  tc.icon as category_icon,
  t.rating_average,
  t.rating_count,
  t.download_count,
  t.view_count,
  t.like_count,
  t.is_featured,
  t.cover_image_url,
  t.estimated_cost_savings,
  t.estimated_time_savings,
  t.created_at,
  t.published_at,
  u.name as author_name,
  u.image as author_image,
  -- Aggregate tags for this template
  COALESCE(
    (SELECT json_agg(json_build_object('id', tt.id, 'name', tt.name, 'slug', tt.slug, 'color', tt.color, 'type', tt.tag_type))
     FROM template_tag_associations tta
     JOIN template_tags tt ON tta.tag_id = tt.id
     WHERE tta.template_id = t.id),
    '[]'::json
  ) as tags,
  -- Compute popularity score for ranking
  (
    COALESCE(t.download_count, 0) * 3 +
    COALESCE(t.view_count, 0) * 1 +
    COALESCE(t.like_count, 0) * 2 +
    COALESCE(t.rating_average, 0) * COALESCE(t.rating_count, 0) * 0.5
  ) as popularity_score
FROM templates t
JOIN template_categories tc ON t.category_id = tc.id
JOIN "user" u ON t.created_by_user_id = u.id
WHERE t.status = 'approved' 
  AND t.visibility = 'public'
  AND tc.is_active = true;

/**
 * Template analytics summary view - Performance insights
 */
CREATE OR REPLACE VIEW template_analytics_summary AS
SELECT 
  t.id,
  t.name,
  t.category_id,
  tc.name as category_name,
  -- Usage statistics
  COUNT(tua.id) as total_usage_events,
  COUNT(CASE WHEN tua.event_type = 'view' THEN 1 END) as view_events,
  COUNT(CASE WHEN tua.event_type = 'download' THEN 1 END) as download_events,
  COUNT(CASE WHEN tua.event_type = 'execute' THEN 1 END) as execution_events,
  
  -- Success metrics
  AVG(CASE WHEN tua.execution_success IS NOT NULL THEN 
    CASE WHEN tua.execution_success THEN 1.0 ELSE 0.0 END 
  END) as success_rate,
  AVG(tua.execution_time_seconds) as avg_execution_time,
  AVG(tua.setup_time_seconds) as avg_setup_time,
  
  -- Business impact
  SUM(COALESCE(tua.estimated_cost_saved, 0)) as total_cost_saved,
  SUM(COALESCE(tua.estimated_time_saved, 0)) as total_time_saved,
  AVG(tua.user_satisfaction_score) as avg_satisfaction,
  
  -- Recent activity
  MAX(tua.usage_timestamp) as last_used_at,
  COUNT(CASE WHEN tua.usage_timestamp > NOW() - INTERVAL '30 days' THEN 1 END) as recent_usage_count
  
FROM templates t
JOIN template_categories tc ON t.category_id = tc.id
LEFT JOIN template_usage_analytics tua ON t.id = tua.template_id
WHERE t.status = 'approved' AND t.visibility = 'public'
GROUP BY t.id, t.name, t.category_id, tc.name;

-- Create indexes on views for performance
CREATE INDEX IF NOT EXISTS template_discovery_popularity_idx ON templates((
  COALESCE(download_count, 0) * 3 +
  COALESCE(view_count, 0) * 1 +
  COALESCE(like_count, 0) * 2 +
  COALESCE(rating_average, 0) * COALESCE(rating_count, 0) * 0.5
) DESC) WHERE status = 'approved' AND visibility = 'public';

-- ========================
-- COMPLETION MESSAGE
-- ========================

-- Database schema extensions completed successfully
SELECT 
  'Template Library System schema extensions completed successfully!' as message,
  (SELECT COUNT(*) FROM template_categories) as categories_created,
  (SELECT COUNT(*) FROM template_tags) as system_tags_created,
  NOW() as completed_at;