-- ========================================================================================
-- MIGRATION: Template Library System Extensions
-- Version: 001
-- Description: Comprehensive template library database schema extensions
-- Author: Database Architecture Specialist
-- Date: 2025-09-04
-- ========================================================================================

BEGIN;

-- ========================================================================================
-- STEP 1: CREATE CORE TEMPLATE ORGANIZATION TABLES
-- ========================================================================================

-- Template Categories - Hierarchical organization system
CREATE TABLE IF NOT EXISTS template_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- Hierarchical structure
    parent_id UUID REFERENCES template_categories(id) ON DELETE CASCADE,
    path LTREE,
    level INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Visual presentation
    icon VARCHAR(50) DEFAULT 'folder',
    color VARCHAR(7) DEFAULT '#6B7280',
    
    -- Usage analytics
    template_count INTEGER NOT NULL DEFAULT 0,
    total_views INTEGER NOT NULL DEFAULT 0,
    total_downloads INTEGER NOT NULL DEFAULT 0,
    
    -- Lifecycle management
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Template Tags - Flexible labeling system
CREATE TABLE IF NOT EXISTS template_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    
    -- Visual presentation
    color VARCHAR(7) DEFAULT '#3B82F6',
    
    -- Usage analytics
    usage_count INTEGER NOT NULL DEFAULT 0,
    weekly_growth INTEGER NOT NULL DEFAULT 0,
    trend_score DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    
    -- Tag management
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_system BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Template Tag Assignments - Many-to-many relationship
CREATE TABLE IF NOT EXISTS template_tag_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES template_tags(id) ON DELETE CASCADE,
    
    -- Assignment metadata
    assigned_by_user_id UUID REFERENCES users(id),
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    assignment_type VARCHAR(20) DEFAULT 'manual',
    
    -- Audit
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(template_id, tag_id)
);

-- ========================================================================================
-- STEP 2: CREATE VERSION CONTROL SYSTEM
-- ========================================================================================

-- Template Versions - Complete version control with snapshots
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Semantic versioning
    version_number VARCHAR(20) NOT NULL,
    version_major INTEGER NOT NULL,
    version_minor INTEGER NOT NULL,
    version_patch INTEGER NOT NULL,
    
    -- Version metadata
    title VARCHAR(200) NOT NULL,
    description TEXT,
    changelog TEXT,
    
    -- Complete state snapshot
    workflow_state JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Change tracking
    parent_version_id UUID REFERENCES template_versions(id),
    diff_from_parent JSONB,
    breaking_changes BOOLEAN NOT NULL DEFAULT false,
    
    -- Publication workflow
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    published_at TIMESTAMP,
    deprecated_at TIMESTAMP,
    
    -- Analytics
    download_count INTEGER NOT NULL DEFAULT 0,
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    -- Author and audit
    author_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(template_id, version_major, version_minor, version_patch)
);

-- ========================================================================================
-- STEP 3: EXTEND EXISTING TEMPLATES TABLE
-- ========================================================================================

-- Add enhanced metadata columns to existing templates table
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    difficulty_level VARCHAR(20) DEFAULT 'intermediate' 
    CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert'));
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    estimated_setup_time INTEGER;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    documentation JSONB DEFAULT '{}';
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    requirements JSONB DEFAULT '{}';
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    example_use_cases TEXT[];

-- Publication and lifecycle
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    status VARCHAR(20) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'review', 'published', 'deprecated', 'archived'));
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    published_at TIMESTAMP;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    featured_until TIMESTAMP;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    is_premium BOOLEAN DEFAULT false;

-- Enhanced analytics
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    download_count INTEGER NOT NULL DEFAULT 0;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    usage_count INTEGER NOT NULL DEFAULT 0;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    success_rate DECIMAL(5,2) DEFAULT 0.0;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    avg_rating DECIMAL(3,2) DEFAULT 0.0;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    rating_count INTEGER DEFAULT 0;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    weekly_views INTEGER DEFAULT 0;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    monthly_downloads INTEGER DEFAULT 0;

-- Search optimization
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    search_vector TSVECTOR;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    keywords TEXT[];

-- Licensing and attribution
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    license VARCHAR(50) DEFAULT 'MIT';
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    attribution_required BOOLEAN DEFAULT false;
    
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    source_url TEXT;

-- ========================================================================================
-- STEP 4: CREATE ANALYTICS AND TRACKING TABLES
-- ========================================================================================

-- Template Usage Analytics - Detailed event tracking
CREATE TABLE IF NOT EXISTS template_analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID,
    
    -- Event classification
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    event_action VARCHAR(100) NOT NULL,
    event_label VARCHAR(200),
    
    -- Context and metadata
    source VARCHAR(100),
    referrer_url TEXT,
    user_agent TEXT,
    ip_address INET,
    
    -- Session metrics
    session_duration INTEGER,
    page_views_in_session INTEGER DEFAULT 1,
    is_returning_user BOOLEAN DEFAULT false,
    
    -- Template context
    template_version_id UUID REFERENCES template_versions(id),
    deployment_success BOOLEAN,
    error_message TEXT,
    
    -- Geographic context
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(50),
    
    -- A/B testing
    experiment_id VARCHAR(100),
    variation_id VARCHAR(100),
    
    -- Additional properties
    properties JSONB DEFAULT '{}',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Template Performance Metrics - Aggregated statistics
CREATE TABLE IF NOT EXISTS template_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Time dimension
    metric_date DATE NOT NULL,
    metric_period VARCHAR(20) NOT NULL,
    
    -- Engagement metrics
    view_count INTEGER NOT NULL DEFAULT 0,
    unique_views INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    unique_downloads INTEGER NOT NULL DEFAULT 0,
    deployment_count INTEGER NOT NULL DEFAULT 0,
    successful_deployments INTEGER NOT NULL DEFAULT 0,
    
    -- Social engagement
    star_count INTEGER NOT NULL DEFAULT 0,
    share_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    
    -- Performance ratios
    view_to_download_rate DECIMAL(5,4) DEFAULT 0.0000,
    download_to_deploy_rate DECIMAL(5,4) DEFAULT 0.0000,
    deployment_success_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- User engagement
    avg_session_duration INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,4) DEFAULT 0.0000,
    returning_user_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Geographic distribution
    top_countries JSONB DEFAULT '[]',
    geographic_spread_score DECIMAL(5,2) DEFAULT 0.0,
    
    -- Trend calculations
    trend_score DECIMAL(8,4) DEFAULT 0.0000,
    popularity_rank INTEGER,
    velocity_score DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Quality metrics
    avg_rating DECIMAL(3,2) DEFAULT 0.0,
    satisfaction_score DECIMAL(5,4) DEFAULT 0.0000,
    
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(template_id, metric_date, metric_period)
);

-- ========================================================================================
-- STEP 5: CREATE RATING AND REVIEW SYSTEM
-- ========================================================================================

-- Template Reviews - User feedback system
CREATE TABLE IF NOT EXISTS template_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rating system (1-5 stars)
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    documentation_rating INTEGER CHECK (documentation_rating >= 1 AND documentation_rating <= 5),
    ease_of_use_rating INTEGER CHECK (ease_of_use_rating >= 1 AND ease_of_use_rating <= 5),
    reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
    innovation_rating INTEGER CHECK (innovation_rating >= 1 AND innovation_rating <= 5),
    
    -- Review content
    title VARCHAR(200),
    review_text TEXT,
    pros TEXT,
    cons TEXT,
    
    -- Review verification
    verified_usage BOOLEAN DEFAULT false,
    usage_duration VARCHAR(50),
    use_case_context TEXT,
    
    -- Quality metrics
    helpful_votes INTEGER NOT NULL DEFAULT 0,
    unhelpful_votes INTEGER NOT NULL DEFAULT 0,
    helpfulness_score DECIMAL(5,4) DEFAULT 0.5000,
    
    -- Moderation
    status VARCHAR(20) DEFAULT 'published' 
        CHECK (status IN ('draft', 'published', 'flagged', 'moderated', 'deleted')),
    moderation_reason TEXT,
    moderated_at TIMESTAMP,
    moderated_by UUID REFERENCES users(id),
    
    -- Review features
    is_featured BOOLEAN DEFAULT false,
    is_verified_purchase BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(template_id, reviewer_id)
);

-- Template Review Votes - Helpfulness voting
CREATE TABLE IF NOT EXISTS template_review_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES template_reviews(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(review_id, voter_id)
);

-- ========================================================================================
-- STEP 6: CREATE SEARCH OPTIMIZATION TABLES
-- ========================================================================================

-- Template Search Index - Optimized search performance
CREATE TABLE IF NOT EXISTS template_search_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL UNIQUE REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Search content and vectors
    search_content TEXT NOT NULL,
    search_vector TSVECTOR NOT NULL,
    
    -- Content weighting
    title_weight DECIMAL(3,2) DEFAULT 1.0,
    description_weight DECIMAL(3,2) DEFAULT 0.8,
    tag_weight DECIMAL(3,2) DEFAULT 0.6,
    category_weight DECIMAL(3,2) DEFAULT 0.4,
    
    -- Ranking factors
    popularity_boost DECIMAL(5,4) DEFAULT 1.0000,
    quality_boost DECIMAL(5,4) DEFAULT 1.0000,
    recency_boost DECIMAL(5,4) DEFAULT 1.0000,
    
    -- Performance metrics
    search_impressions INTEGER DEFAULT 0,
    search_clicks INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Language support
    language_code VARCHAR(5) DEFAULT 'en',
    search_config REGCONFIG DEFAULT 'english',
    
    -- Maintenance
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Search metadata
    keywords JSONB DEFAULT '[]',
    synonyms JSONB DEFAULT '[]'
);

-- Template Search Queries - Search analytics
CREATE TABLE IF NOT EXISTS template_search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID,
    
    -- Query details
    query_text TEXT NOT NULL,
    normalized_query TEXT NOT NULL,
    query_tokens TEXT[],
    
    -- Search context
    search_filters JSONB DEFAULT '{}',
    sort_order VARCHAR(50) DEFAULT 'relevance',
    page_number INTEGER DEFAULT 1,
    results_per_page INTEGER DEFAULT 20,
    
    -- Results performance
    total_results INTEGER NOT NULL,
    results_returned INTEGER NOT NULL,
    search_time_ms INTEGER,
    
    -- User engagement
    clicked_results JSONB DEFAULT '[]',
    result_positions_clicked INTEGER[],
    highest_clicked_position INTEGER,
    
    -- Quality metrics
    had_results BOOLEAN NOT NULL,
    user_refined_search BOOLEAN DEFAULT false,
    session_converted BOOLEAN DEFAULT false,
    
    -- Context
    country_code VARCHAR(2),
    language_preference VARCHAR(5) DEFAULT 'en',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ========================================================================================
-- STEP 7: CREATE STRATEGIC INDEXES FOR PERFORMANCE
-- ========================================================================================

-- Template Categories indexes
CREATE INDEX IF NOT EXISTS template_categories_parent_id_idx ON template_categories(parent_id);
CREATE INDEX IF NOT EXISTS template_categories_path_idx ON template_categories USING GIST(path);
CREATE INDEX IF NOT EXISTS template_categories_level_idx ON template_categories(level);
CREATE INDEX IF NOT EXISTS template_categories_slug_idx ON template_categories(slug);
CREATE INDEX IF NOT EXISTS template_categories_active_idx ON template_categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS template_categories_featured_idx ON template_categories(is_featured) WHERE is_featured = true;

-- Template Tags indexes
CREATE INDEX IF NOT EXISTS template_tags_name_idx ON template_tags(name);
CREATE INDEX IF NOT EXISTS template_tags_slug_idx ON template_tags(slug);
CREATE INDEX IF NOT EXISTS template_tags_usage_idx ON template_tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS template_tags_trending_idx ON template_tags(trend_score DESC, weekly_growth DESC);

-- Template Tag Assignments indexes
CREATE INDEX IF NOT EXISTS template_tag_assignments_template_idx ON template_tag_assignments(template_id);
CREATE INDEX IF NOT EXISTS template_tag_assignments_tag_idx ON template_tag_assignments(tag_id);

-- Template Versions indexes
CREATE INDEX IF NOT EXISTS template_versions_template_idx ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS template_versions_semantic_idx ON template_versions(template_id, version_major DESC, version_minor DESC, version_patch DESC);
CREATE INDEX IF NOT EXISTS template_versions_status_idx ON template_versions(status);
CREATE INDEX IF NOT EXISTS template_versions_published_idx ON template_versions(published_at DESC) WHERE published_at IS NOT NULL;

-- Enhanced Templates table indexes
CREATE INDEX IF NOT EXISTS templates_category_id_idx ON templates(category_id);
CREATE INDEX IF NOT EXISTS templates_difficulty_idx ON templates(difficulty_level);
CREATE INDEX IF NOT EXISTS templates_status_idx ON templates(status);
CREATE INDEX IF NOT EXISTS templates_published_idx ON templates(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS templates_downloads_idx ON templates(download_count DESC);
CREATE INDEX IF NOT EXISTS templates_rating_idx ON templates(avg_rating DESC, rating_count DESC);
CREATE INDEX IF NOT EXISTS templates_search_vector_idx ON templates USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS templates_keywords_idx ON templates USING GIN(keywords);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS template_analytics_events_template_idx ON template_analytics_events(template_id);
CREATE INDEX IF NOT EXISTS template_analytics_events_type_idx ON template_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS template_analytics_events_created_idx ON template_analytics_events(created_at DESC);

-- Performance Metrics indexes
CREATE INDEX IF NOT EXISTS template_performance_metrics_template_idx ON template_performance_metrics(template_id);
CREATE INDEX IF NOT EXISTS template_performance_metrics_date_idx ON template_performance_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS template_performance_metrics_trend_idx ON template_performance_metrics(trend_score DESC);

-- Review indexes
CREATE INDEX IF NOT EXISTS template_reviews_template_idx ON template_reviews(template_id);
CREATE INDEX IF NOT EXISTS template_reviews_rating_idx ON template_reviews(overall_rating DESC);
CREATE INDEX IF NOT EXISTS template_reviews_helpful_idx ON template_reviews(helpful_votes DESC);

-- Search indexes
CREATE INDEX IF NOT EXISTS template_search_index_vector_idx ON template_search_index USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS template_search_index_keywords_idx ON template_search_index USING GIN(keywords);

-- ========================================================================================
-- STEP 8: CREATE AUTOMATION FUNCTIONS AND TRIGGERS
-- ========================================================================================

-- Function: Update template search index
CREATE OR REPLACE FUNCTION update_template_search_index()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO template_search_index (
        template_id,
        search_content,
        search_vector,
        last_updated
    ) VALUES (
        NEW.id,
        COALESCE(NEW.name, '') || ' ' || 
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.author, '') || ' ' ||
        COALESCE(NEW.category, ''),
        
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'D'),
        
        NOW()
    )
    ON CONFLICT (template_id) DO UPDATE SET
        search_content = EXCLUDED.search_content,
        search_vector = EXCLUDED.search_vector,
        last_updated = EXCLUDED.last_updated;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update category template counts
CREATE OR REPLACE FUNCTION update_category_template_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.category_id != NEW.category_id) THEN
        IF NEW.category_id IS NOT NULL THEN
            UPDATE template_categories 
            SET template_count = template_count + 1,
                updated_at = NOW()
            WHERE id = NEW.category_id;
        END IF;
        
        IF TG_OP = 'UPDATE' AND OLD.category_id IS NOT NULL THEN
            UPDATE template_categories 
            SET template_count = template_count - 1,
                updated_at = NOW()
            WHERE id = OLD.category_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        IF OLD.category_id IS NOT NULL THEN
            UPDATE template_categories 
            SET template_count = template_count - 1,
                updated_at = NOW()
            WHERE id = OLD.category_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update template rating statistics
CREATE OR REPLACE FUNCTION update_template_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    template_id_to_update UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        template_id_to_update := OLD.template_id;
    ELSE
        template_id_to_update := NEW.template_id;
    END IF;
    
    UPDATE templates 
    SET 
        avg_rating = COALESCE((
            SELECT ROUND(AVG(overall_rating), 2)
            FROM template_reviews 
            WHERE template_id = template_id_to_update 
            AND status = 'published'
        ), 0),
        rating_count = COALESCE((
            SELECT COUNT(*)
            FROM template_reviews 
            WHERE template_id = template_id_to_update 
            AND status = 'published'
        ), 0),
        updated_at = NOW()
    WHERE id = template_id_to_update;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_template_search_index ON templates;
CREATE TRIGGER trigger_update_template_search_index
    AFTER INSERT OR UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_template_search_index();

DROP TRIGGER IF EXISTS trigger_update_category_template_counts ON templates;
CREATE TRIGGER trigger_update_category_template_counts
    AFTER INSERT OR UPDATE OR DELETE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_category_template_counts();

DROP TRIGGER IF EXISTS trigger_update_template_rating_stats ON template_reviews;
CREATE TRIGGER trigger_update_template_rating_stats
    AFTER INSERT OR UPDATE OR DELETE ON template_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_template_rating_stats();

-- ========================================================================================
-- STEP 9: CREATE PERFORMANCE VIEWS
-- ========================================================================================

-- Template Library Dashboard View
CREATE OR REPLACE VIEW template_library_dashboard AS
SELECT 
    t.id,
    t.name,
    t.description,
    t.author,
    t.color,
    t.icon,
    t.views,
    t.stars,
    t.download_count,
    t.avg_rating,
    t.rating_count,
    t.difficulty_level,
    t.estimated_setup_time,
    t.created_at,
    t.updated_at,
    t.published_at,
    t.status,
    
    -- Category information
    tc.name AS category_name,
    tc.slug AS category_slug,
    tc.color AS category_color,
    tc.icon AS category_icon,
    
    -- Calculated metrics
    CASE 
        WHEN t.views > 0 THEN ROUND((t.download_count::DECIMAL / t.views) * 100, 2)
        ELSE 0 
    END AS conversion_rate

FROM templates t
LEFT JOIN template_categories tc ON t.category_id = tc.id
WHERE t.status = 'published'
ORDER BY t.created_at DESC;

-- ========================================================================================
-- STEP 10: INSERT SAMPLE DATA FOR TESTING
-- ========================================================================================

-- Insert sample template categories
INSERT INTO template_categories (name, slug, description, level, sort_order, icon, color) VALUES
('Business Automation', 'business-automation', 'Templates for automating business processes', 0, 1, 'briefcase', '#3B82F6'),
('Data Processing', 'data-processing', 'Templates for data transformation and analysis', 0, 2, 'database', '#10B981'),
('Communication', 'communication', 'Templates for messaging and notifications', 0, 3, 'message-circle', '#F59E0B'),
('Analytics', 'analytics', 'Templates for reporting and business intelligence', 0, 4, 'bar-chart-3', '#8B5CF6')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample template tags
INSERT INTO template_tags (name, display_name, slug, description, color, usage_count) VALUES
('api', 'API', 'api', 'Templates involving API integrations', '#3B82F6', 25),
('automation', 'Automation', 'automation', 'Workflow automation templates', '#10B981', 40),
('beginner', 'Beginner', 'beginner', 'Easy to use templates for beginners', '#F59E0B', 30),
('advanced', 'Advanced', 'advanced', 'Complex templates for experienced users', '#EF4444', 15),
('real-time', 'Real-time', 'real-time', 'Templates with real-time processing capabilities', '#8B5CF6', 20)
ON CONFLICT (name) DO NOTHING;

-- Update existing templates with new columns (set reasonable defaults)
UPDATE templates 
SET 
    status = 'published',
    difficulty_level = 'intermediate',
    license = 'MIT'
WHERE status IS NULL;

COMMIT;

-- ========================================================================================
-- POST-MIGRATION VALIDATION
-- ========================================================================================

-- Verify all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'template_%';
    
    RAISE NOTICE 'Created % template-related tables', table_count;
    
    -- Verify indexes were created
    SELECT COUNT(*) INTO table_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE '%template%';
    
    RAISE NOTICE 'Created % template-related indexes', table_count;
END
$$;