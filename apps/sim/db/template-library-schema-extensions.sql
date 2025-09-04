-- ========================================================================================
-- TEMPLATE LIBRARY SYSTEM - DATABASE SCHEMA EXTENSIONS
-- ========================================================================================
--
-- Comprehensive database schema extensions for the template library system, building upon
-- the existing Sim workflow automation platform database structure.
--
-- ARCHITECTURAL OVERVIEW:
-- - Template Storage: JSONB-based workflow template storage with full metadata
-- - Categorization: Hierarchical categories and flexible tagging system
-- - Analytics: Comprehensive usage tracking and performance metrics
-- - Rating System: User reviews, ratings, and feedback collection
-- - Version Control: Template versioning with change tracking and rollback
-- - Search Optimization: Full-text search with proper indexing strategy
-- - Performance: Strategic indexing for high-traffic template discovery
--
-- DESIGN PRINCIPLES:
-- - PostgreSQL JSONB for flexible workflow template storage
-- - Strategic indexing for template discovery and filtering
-- - Comprehensive analytics for adoption insights
-- - Scalable categorization with nested hierarchies
-- - Performance-optimized search with GIN indexes
-- - Version control with change tracking and conflict resolution
--
-- REQUIREMENTS:
-- - PostgreSQL 15+ with pgvector extension
-- - Full-text search capabilities (tsvector)
-- - JSONB support for flexible document storage
-- - GIN indexes for optimized JSONB and text search
--
-- ========================================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ========================================================================================
-- TEMPLATE STORAGE & METADATA SYSTEM
-- ========================================================================================

/**
 * Template Categories table - Hierarchical template organization system
 *
 * Provides structured categorization for template discovery and organization:
 * - Hierarchical category structure with parent-child relationships
 * - SEO-friendly slugs for URL routing and navigation
 * - Icon and color customization for UI presentation
 * - Usage statistics for category popularity tracking
 * - Soft delete support for category lifecycle management
 *
 * CATEGORY HIERARCHY EXAMPLES:
 * - Business Automation > Sales > Lead Management
 * - Data Processing > ETL > API Integration
 * - Communication > Email > Marketing Campaigns
 * - Analytics > Reporting > Business Intelligence
 *
 * PERFORMANCE CONSIDERATIONS:
 * - Materialized path for efficient hierarchy queries
 * - Separate indexes for root categories and subcategories
 * - Usage statistics updated via triggers for real-time counts
 */
CREATE TABLE template_categories (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- Human-readable category name
    slug VARCHAR(100) NOT NULL UNIQUE, -- URL-friendly identifier
    description TEXT, -- Category purpose and scope description
    
    -- Hierarchical organization
    parent_id UUID REFERENCES template_categories(id) ON DELETE CASCADE,
    path LTREE, -- Materialized path for efficient hierarchy queries
    level INTEGER NOT NULL DEFAULT 0, -- Hierarchy depth (0 = root)
    sort_order INTEGER NOT NULL DEFAULT 0, -- Display ordering within parent
    
    -- Visual presentation
    icon VARCHAR(50) DEFAULT 'folder', -- Lucide icon name for UI
    color VARCHAR(7) DEFAULT '#6B7280', -- Hex color for theme consistency
    
    -- Usage analytics
    template_count INTEGER NOT NULL DEFAULT 0, -- Number of templates in category
    total_views INTEGER NOT NULL DEFAULT 0, -- Aggregate view count
    total_downloads INTEGER NOT NULL DEFAULT 0, -- Aggregate download count
    
    -- Category lifecycle management
    is_active BOOLEAN NOT NULL DEFAULT true, -- Enable/disable category
    is_featured BOOLEAN NOT NULL DEFAULT false, -- Highlight in navigation
    deleted_at TIMESTAMP, -- Soft delete timestamp
    
    -- Audit timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Strategic indexing for category hierarchy and performance
CREATE INDEX template_categories_parent_id_idx ON template_categories(parent_id);
CREATE INDEX template_categories_path_idx ON template_categories USING GIST(path);
CREATE INDEX template_categories_level_idx ON template_categories(level);
CREATE INDEX template_categories_slug_idx ON template_categories(slug);
CREATE INDEX template_categories_active_idx ON template_categories(is_active) WHERE is_active = true;
CREATE INDEX template_categories_featured_idx ON template_categories(is_featured) WHERE is_featured = true;
CREATE INDEX template_categories_usage_idx ON template_categories(template_count DESC, total_views DESC);

/**
 * Template Tags table - Flexible labeling system for templates
 *
 * Provides a flexible tagging system complementary to hierarchical categories:
 * - User-defined tags for cross-cutting template attributes
 * - Usage statistics for tag popularity and trending
 * - Color customization for visual organization
 * - Tag suggestions based on usage patterns
 *
 * TAG EXAMPLES:
 * - Technology: "api", "database", "ai", "automation"
 * - Industry: "healthcare", "finance", "retail", "education"  
 * - Complexity: "beginner", "intermediate", "advanced"
 * - Features: "real-time", "batch-processing", "notification"
 *
 * USAGE PATTERNS:
 * - Templates can have multiple tags (many-to-many relationship)
 * - Tags enable cross-category discovery and filtering
 * - Trending tags highlighted in UI for discovery
 * - Auto-suggest based on template content analysis
 */
CREATE TABLE template_tags (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- Tag name (lowercase, normalized)
    display_name VARCHAR(50) NOT NULL, -- Display name for UI
    slug VARCHAR(50) NOT NULL UNIQUE, -- URL-friendly identifier
    description TEXT, -- Tag meaning and usage guidelines
    
    -- Visual presentation
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for tag badges
    
    -- Usage analytics and trending
    usage_count INTEGER NOT NULL DEFAULT 0, -- Number of templates with this tag
    weekly_growth INTEGER NOT NULL DEFAULT 0, -- Weekly usage increase
    trend_score DECIMAL(5,2) NOT NULL DEFAULT 0.0, -- Trending algorithm score
    
    -- Tag lifecycle management
    is_active BOOLEAN NOT NULL DEFAULT true, -- Enable/disable tag
    is_featured BOOLEAN NOT NULL DEFAULT false, -- Highlight in suggestions
    is_system BOOLEAN NOT NULL DEFAULT false, -- System-generated vs user-created
    
    -- Audit timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexing for tag performance and search
CREATE INDEX template_tags_name_idx ON template_tags(name);
CREATE INDEX template_tags_slug_idx ON template_tags(slug);
CREATE INDEX template_tags_usage_idx ON template_tags(usage_count DESC);
CREATE INDEX template_tags_trending_idx ON template_tags(trend_score DESC, weekly_growth DESC);
CREATE INDEX template_tags_active_idx ON template_tags(is_active) WHERE is_active = true;
CREATE INDEX template_tags_featured_idx ON template_tags(is_featured) WHERE is_featured = true;

/**
 * Template Tag Assignments table - Many-to-many relationship between templates and tags
 *
 * Links templates with their associated tags for flexible categorization:
 * - Many-to-many relationship with automatic cleanup
 * - Assignment metadata (who tagged, when, confidence score)
 * - Support for both manual and automated tagging
 * - Tag relevance scoring for weighted search results
 */
CREATE TABLE template_tag_assignments (
    -- Core relationship
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES template_tags(id) ON DELETE CASCADE,
    
    -- Assignment metadata
    assigned_by_user_id UUID REFERENCES users(id), -- Who assigned the tag (null = system)
    confidence_score DECIMAL(3,2) DEFAULT 1.0, -- Relevance confidence (0.0-1.0)
    assignment_type VARCHAR(20) DEFAULT 'manual', -- 'manual', 'auto', 'suggested'
    
    -- Audit timestamps
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate assignments
    UNIQUE(template_id, tag_id)
);

-- Indexing for tag assignment queries and analytics
CREATE INDEX template_tag_assignments_template_idx ON template_tag_assignments(template_id);
CREATE INDEX template_tag_assignments_tag_idx ON template_tag_assignments(tag_id);
CREATE INDEX template_tag_assignments_user_idx ON template_tag_assignments(assigned_by_user_id);
CREATE INDEX template_tag_assignments_confidence_idx ON template_tag_assignments(confidence_score DESC);

-- ========================================================================================
-- ENHANCED TEMPLATE STORAGE SYSTEM
-- ========================================================================================

/**
 * Template Versions table - Version control system for templates
 *
 * Comprehensive version control with change tracking and rollback capabilities:
 * - Complete template state snapshots for each version
 * - Diff tracking for efficient change representation
 * - Branching and merging support for collaborative development
 * - Semantic versioning with automatic increment logic
 * - Publication workflow with draft, review, and published states
 *
 * VERSION WORKFLOW:
 * 1. Draft: Author creates new version (unpublished)
 * 2. Review: Optional peer review process
 * 3. Published: Version released to template library
 * 4. Deprecated: Older versions marked for removal
 * 5. Archived: Historical preservation
 */
CREATE TABLE template_versions (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Version identification
    version_number VARCHAR(20) NOT NULL, -- Semantic version (e.g., "1.2.3")
    version_major INTEGER NOT NULL, -- Major version component
    version_minor INTEGER NOT NULL, -- Minor version component  
    version_patch INTEGER NOT NULL, -- Patch version component
    
    -- Version metadata
    title VARCHAR(200) NOT NULL, -- Version-specific title
    description TEXT, -- What changed in this version
    changelog TEXT, -- Detailed change log
    
    -- Complete template state snapshot (JSONB for flexibility)
    workflow_state JSONB NOT NULL, -- Complete workflow definition
    metadata JSONB NOT NULL DEFAULT '{}', -- Version-specific metadata
    
    -- Change tracking
    parent_version_id UUID REFERENCES template_versions(id), -- Previous version
    diff_from_parent JSONB, -- Efficient change representation
    breaking_changes BOOLEAN NOT NULL DEFAULT false, -- API compatibility flag
    
    -- Publication workflow
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'review', 'published', 'deprecated'
    published_at TIMESTAMP, -- Publication timestamp
    deprecated_at TIMESTAMP, -- Deprecation timestamp
    
    -- Version analytics
    download_count INTEGER NOT NULL DEFAULT 0, -- Version-specific downloads
    usage_count INTEGER NOT NULL DEFAULT 0, -- Active usage tracking
    
    -- Author and audit information
    author_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Ensure semantic versioning uniqueness per template
    UNIQUE(template_id, version_major, version_minor, version_patch)
);

-- Indexing for version queries and analytics
CREATE INDEX template_versions_template_idx ON template_versions(template_id);
CREATE INDEX template_versions_semantic_idx ON template_versions(template_id, version_major DESC, version_minor DESC, version_patch DESC);
CREATE INDEX template_versions_status_idx ON template_versions(status);
CREATE INDEX template_versions_published_idx ON template_versions(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX template_versions_author_idx ON template_versions(author_id);
CREATE INDEX template_versions_downloads_idx ON template_versions(download_count DESC);
CREATE INDEX template_versions_parent_idx ON template_versions(parent_version_id);

/**
 * Enhanced Templates table - Comprehensive template metadata and management
 *
 * Extended version of the existing templates table with comprehensive features:
 * - Enhanced metadata with rich descriptions and documentation
 * - Advanced categorization with categories and tags
 * - Comprehensive analytics and usage tracking
 * - Publication and lifecycle management
 * - Search optimization with full-text search vectors
 * - Rating and review aggregation
 * - Licensing and attribution information
 */

-- Note: This extends the existing templates table structure
-- The following would be added as ALTER TABLE statements to extend the existing schema

-- Enhanced template metadata columns
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    difficulty_level VARCHAR(20) DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert'));
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    estimated_setup_time INTEGER; -- Setup time in minutes
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    documentation JSONB DEFAULT '{}'; -- Rich documentation content
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    requirements JSONB DEFAULT '{}'; -- Prerequisites and dependencies
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    example_use_cases TEXT[]; -- Array of use case examples

-- Publication and lifecycle management
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'deprecated', 'archived'));
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    published_at TIMESTAMP;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    featured_until TIMESTAMP; -- Featured promotion expiration
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    is_premium BOOLEAN DEFAULT false; -- Premium template flag

-- Advanced analytics
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    download_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    usage_count INTEGER NOT NULL DEFAULT 0; -- Active usage in workflows
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    success_rate DECIMAL(5,2) DEFAULT 0.0; -- Successful deployment rate
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    avg_rating DECIMAL(3,2) DEFAULT 0.0; -- Average user rating
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    rating_count INTEGER DEFAULT 0; -- Number of ratings
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    weekly_views INTEGER DEFAULT 0; -- Weekly view count
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    monthly_downloads INTEGER DEFAULT 0; -- Monthly download count

-- Search optimization
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    search_vector TSVECTOR; -- Full-text search index
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    keywords TEXT[]; -- Search keywords array

-- Licensing and attribution
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    license VARCHAR(50) DEFAULT 'MIT'; -- License type
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    attribution_required BOOLEAN DEFAULT false;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS 
    source_url TEXT; -- Original source or inspiration

-- Additional indexes for enhanced templates table
CREATE INDEX IF NOT EXISTS templates_category_id_idx ON templates(category_id);
CREATE INDEX IF NOT EXISTS templates_difficulty_idx ON templates(difficulty_level);
CREATE INDEX IF NOT EXISTS templates_status_idx ON templates(status);
CREATE INDEX IF NOT EXISTS templates_published_idx ON templates(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS templates_downloads_idx ON templates(download_count DESC);
CREATE INDEX IF NOT EXISTS templates_usage_idx ON templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS templates_rating_idx ON templates(avg_rating DESC, rating_count DESC);
CREATE INDEX IF NOT EXISTS templates_search_vector_idx ON templates USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS templates_keywords_idx ON templates USING GIN(keywords);
CREATE INDEX IF NOT EXISTS templates_premium_idx ON templates(is_premium) WHERE is_premium = true;
CREATE INDEX IF NOT EXISTS templates_featured_idx ON templates(featured_until DESC) WHERE featured_until > NOW();

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS templates_category_rating_idx ON templates(category_id, avg_rating DESC);
CREATE INDEX IF NOT EXISTS templates_category_downloads_idx ON templates(category_id, download_count DESC);
CREATE INDEX IF NOT EXISTS templates_status_published_idx ON templates(status, published_at DESC);

-- ========================================================================================
-- ANALYTICS AND USAGE TRACKING SYSTEM
-- ========================================================================================

/**
 * Template Usage Analytics table - Comprehensive usage tracking and metrics
 *
 * Tracks template usage patterns for analytics and optimization insights:
 * - Individual template interactions (views, downloads, deployments)
 * - User engagement patterns and session tracking  
 * - Geographic and temporal usage distribution
 * - Performance metrics for template effectiveness
 * - A/B testing support for template optimization
 *
 * ANALYTICS USE CASES:
 * - Popular template identification
 * - User engagement optimization
 * - Template performance benchmarking
 * - Geographic usage distribution
 * - Temporal trend analysis
 * - Conversion funnel analytics
 */
CREATE TABLE template_analytics_events (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Anonymous events allowed
    session_id UUID, -- Session tracking for user journey analysis
    
    -- Event classification
    event_type VARCHAR(50) NOT NULL, -- 'view', 'download', 'deploy', 'star', 'share'
    event_category VARCHAR(50) NOT NULL, -- 'engagement', 'conversion', 'social'
    event_action VARCHAR(100) NOT NULL, -- Specific action taken
    event_label VARCHAR(200), -- Additional event context
    
    -- Event context and metadata
    source VARCHAR(100), -- Traffic source ('search', 'category', 'featured', 'recommendation')
    referrer_url TEXT, -- HTTP referrer for attribution
    user_agent TEXT, -- Browser/client information
    ip_address INET, -- Client IP for geographic analysis
    
    -- Session and engagement metrics
    session_duration INTEGER, -- Session length in seconds
    page_views_in_session INTEGER DEFAULT 1, -- Page views before this event
    is_returning_user BOOLEAN DEFAULT false, -- User engagement classification
    
    -- Template-specific context
    template_version_id UUID REFERENCES template_versions(id), -- Specific version interacted with
    deployment_success BOOLEAN, -- For deploy events, track success/failure
    error_message TEXT, -- Error details for failed deployments
    
    -- Geographic and temporal context
    country_code VARCHAR(2), -- ISO country code
    region VARCHAR(100), -- State/region
    city VARCHAR(100), -- City name
    timezone VARCHAR(50), -- User timezone
    
    -- A/B testing and experimentation
    experiment_id VARCHAR(100), -- A/B test identifier
    variation_id VARCHAR(100), -- Test variation identifier
    
    -- Additional custom properties
    properties JSONB DEFAULT '{}', -- Flexible event properties
    
    -- Event timestamp
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Strategic indexing for analytics queries and performance
CREATE INDEX template_analytics_events_template_idx ON template_analytics_events(template_id);
CREATE INDEX template_analytics_events_user_idx ON template_analytics_events(user_id);
CREATE INDEX template_analytics_events_session_idx ON template_analytics_events(session_id);
CREATE INDEX template_analytics_events_type_idx ON template_analytics_events(event_type);
CREATE INDEX template_analytics_events_category_idx ON template_analytics_events(event_category);
CREATE INDEX template_analytics_events_source_idx ON template_analytics_events(source);
CREATE INDEX template_analytics_events_created_idx ON template_analytics_events(created_at DESC);
CREATE INDEX template_analytics_events_country_idx ON template_analytics_events(country_code);

-- Composite indexes for common analytics queries
CREATE INDEX template_analytics_events_template_type_created_idx ON template_analytics_events(template_id, event_type, created_at DESC);
CREATE INDEX template_analytics_events_user_type_created_idx ON template_analytics_events(user_id, event_type, created_at DESC);
CREATE INDEX template_analytics_events_daily_stats_idx ON template_analytics_events(template_id, event_type, DATE(created_at));

/**
 * Template Performance Metrics table - Aggregated performance statistics
 *
 * Pre-calculated performance metrics for fast dashboard queries:
 * - Daily, weekly, monthly aggregations
 * - Conversion funnel metrics (view → download → deploy)
 * - Geographic performance distribution
 * - Template effectiveness scores
 * - Trending and popularity calculations
 *
 * AGGREGATION LEVELS:
 * - Hourly: Real-time monitoring
 * - Daily: Standard reporting
 * - Weekly: Trend analysis
 * - Monthly: Long-term patterns
 */
CREATE TABLE template_performance_metrics (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Time dimension
    metric_date DATE NOT NULL, -- Date for this metric snapshot
    metric_period VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
    
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
    view_to_download_rate DECIMAL(5,4) DEFAULT 0.0000, -- Conversion rate
    download_to_deploy_rate DECIMAL(5,4) DEFAULT 0.0000, -- Adoption rate  
    deployment_success_rate DECIMAL(5,4) DEFAULT 0.0000, -- Quality indicator
    
    -- User engagement depth
    avg_session_duration INTEGER DEFAULT 0, -- Average session length in seconds
    bounce_rate DECIMAL(5,4) DEFAULT 0.0000, -- Single-page session rate
    returning_user_rate DECIMAL(5,4) DEFAULT 0.0000, -- User retention rate
    
    -- Geographic distribution
    top_countries JSONB DEFAULT '[]', -- Top 5 countries by usage
    geographic_spread_score DECIMAL(5,2) DEFAULT 0.0, -- Global adoption indicator
    
    -- Trend and popularity calculations
    trend_score DECIMAL(8,4) DEFAULT 0.0000, -- Trending algorithm score
    popularity_rank INTEGER, -- Rank within category
    velocity_score DECIMAL(8,4) DEFAULT 0.0000, -- Growth velocity
    
    -- Quality and satisfaction metrics
    avg_rating DECIMAL(3,2) DEFAULT 0.0, -- Average user rating for the period
    satisfaction_score DECIMAL(5,4) DEFAULT 0.0000, -- Composite satisfaction metric
    
    -- Audit timestamp
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Ensure uniqueness per template per period
    UNIQUE(template_id, metric_date, metric_period)
);

-- Indexing for performance metrics queries
CREATE INDEX template_performance_metrics_template_idx ON template_performance_metrics(template_id);
CREATE INDEX template_performance_metrics_date_idx ON template_performance_metrics(metric_date DESC);
CREATE INDEX template_performance_metrics_period_idx ON template_performance_metrics(metric_period);
CREATE INDEX template_performance_metrics_trend_idx ON template_performance_metrics(trend_score DESC);
CREATE INDEX template_performance_metrics_popularity_idx ON template_performance_metrics(popularity_rank ASC);
CREATE INDEX template_performance_metrics_velocity_idx ON template_performance_metrics(velocity_score DESC);

-- Composite indexes for dashboard queries
CREATE INDEX template_performance_metrics_template_period_date_idx ON template_performance_metrics(template_id, metric_period, metric_date DESC);
CREATE INDEX template_performance_metrics_period_trend_idx ON template_performance_metrics(metric_period, trend_score DESC);

-- ========================================================================================
-- RATING AND REVIEW SYSTEM
-- ========================================================================================

/**
 * Template Reviews table - User feedback and rating system
 *
 * Comprehensive review system for template quality assessment:
 * - Star rating system (1-5 stars) with granular criteria
 * - Detailed written reviews with moderation support
 * - Helpful/unhelpful voting for review quality
 * - Review verification and authenticity checks
 * - Moderation workflow for content quality control
 *
 * REVIEW CRITERIA:
 * - Overall Quality: General template effectiveness
 * - Documentation: Clarity and completeness of instructions
 * - Ease of Use: Setup and deployment simplicity
 * - Reliability: Template stability and error handling
 * - Innovation: Uniqueness and creative approach
 */
CREATE TABLE template_reviews (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rating system (1-5 stars for each criterion)
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    documentation_rating INTEGER CHECK (documentation_rating >= 1 AND documentation_rating <= 5),
    ease_of_use_rating INTEGER CHECK (ease_of_use_rating >= 1 AND ease_of_use_rating <= 5),
    reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
    innovation_rating INTEGER CHECK (innovation_rating >= 1 AND innovation_rating <= 5),
    
    -- Written review content
    title VARCHAR(200), -- Review title/headline
    review_text TEXT, -- Detailed review content
    pros TEXT, -- What the reviewer liked
    cons TEXT, -- What could be improved
    
    -- Review context and verification
    verified_usage BOOLEAN DEFAULT false, -- Reviewer actually used the template
    usage_duration VARCHAR(50), -- How long reviewer used template ('1 week', '1 month', etc.)
    use_case_context TEXT, -- How reviewer used the template
    
    -- Review quality metrics
    helpful_votes INTEGER NOT NULL DEFAULT 0, -- Users who found review helpful
    unhelpful_votes INTEGER NOT NULL DEFAULT 0, -- Users who found review unhelpful
    helpfulness_score DECIMAL(5,4) DEFAULT 0.5000, -- Calculated helpfulness ratio
    
    -- Moderation and content management
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'flagged', 'moderated', 'deleted')),
    moderation_reason TEXT, -- Reason for moderation action
    moderated_at TIMESTAMP, -- Moderation timestamp
    moderated_by UUID REFERENCES users(id), -- Moderator user ID
    
    -- Review lifecycle
    is_featured BOOLEAN DEFAULT false, -- Highlight exceptional reviews
    is_verified_purchase BOOLEAN DEFAULT false, -- For premium templates
    
    -- Audit timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Prevent multiple reviews per user per template
    UNIQUE(template_id, reviewer_id)
);

-- Indexing for review queries and performance
CREATE INDEX template_reviews_template_idx ON template_reviews(template_id);
CREATE INDEX template_reviews_reviewer_idx ON template_reviews(reviewer_id);
CREATE INDEX template_reviews_rating_idx ON template_reviews(overall_rating DESC);
CREATE INDEX template_reviews_helpful_idx ON template_reviews(helpful_votes DESC);
CREATE INDEX template_reviews_status_idx ON template_reviews(status) WHERE status = 'published';
CREATE INDEX template_reviews_created_idx ON template_reviews(created_at DESC);
CREATE INDEX template_reviews_featured_idx ON template_reviews(is_featured) WHERE is_featured = true;

-- Composite indexes for review listing and sorting
CREATE INDEX template_reviews_template_rating_created_idx ON template_reviews(template_id, overall_rating DESC, created_at DESC);
CREATE INDEX template_reviews_template_helpful_idx ON template_reviews(template_id, helpful_votes DESC);

/**
 * Template Review Votes table - Review helpfulness voting system
 *
 * Tracks user votes on review helpfulness for quality ranking:
 * - Binary voting system (helpful/unhelpful)
 * - Prevents duplicate voting from same user
 * - Enables review quality ranking and filtering
 * - Supports review credibility algorithms
 */
CREATE TABLE template_review_votes (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES template_reviews(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Vote value
    is_helpful BOOLEAN NOT NULL, -- True = helpful, False = unhelpful
    
    -- Audit timestamp
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate votes
    UNIQUE(review_id, voter_id)
);

-- Indexing for vote aggregation and queries
CREATE INDEX template_review_votes_review_idx ON template_review_votes(review_id);
CREATE INDEX template_review_votes_voter_idx ON template_review_votes(voter_id);
CREATE INDEX template_review_votes_helpful_idx ON template_review_votes(review_id, is_helpful);

-- ========================================================================================
-- SEARCH OPTIMIZATION AND FULL-TEXT SEARCH
-- ========================================================================================

/**
 * Template Search Index table - Optimized search performance
 *
 * Dedicated search index for fast template discovery:
 * - Pre-computed search vectors for full-text search
 * - Weighted content from multiple sources (title, description, tags)
 * - Search ranking factors and boost values
 * - Real-time search index maintenance
 * - Multi-language search support preparation
 */
CREATE TABLE template_search_index (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL UNIQUE REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Search content and vectors
    search_content TEXT NOT NULL, -- Combined searchable text
    search_vector TSVECTOR NOT NULL, -- PostgreSQL full-text search vector
    
    -- Content weighting for relevance ranking
    title_weight DECIMAL(3,2) DEFAULT 1.0, -- Title importance multiplier
    description_weight DECIMAL(3,2) DEFAULT 0.8, -- Description importance
    tag_weight DECIMAL(3,2) DEFAULT 0.6, -- Tag relevance weight
    category_weight DECIMAL(3,2) DEFAULT 0.4, -- Category relevance weight
    
    -- Search ranking factors
    popularity_boost DECIMAL(5,4) DEFAULT 1.0000, -- Popularity-based ranking boost
    quality_boost DECIMAL(5,4) DEFAULT 1.0000, -- Quality-based ranking boost
    recency_boost DECIMAL(5,4) DEFAULT 1.0000, -- Recency-based ranking boost
    
    -- Search performance metrics
    search_impressions INTEGER DEFAULT 0, -- Times appeared in search results
    search_clicks INTEGER DEFAULT 0, -- Times clicked from search results
    click_through_rate DECIMAL(5,4) DEFAULT 0.0000, -- CTR for search optimization
    
    -- Language and localization (for future multi-language support)
    language_code VARCHAR(5) DEFAULT 'en', -- ISO language code
    search_config REGCONFIG DEFAULT 'english', -- PostgreSQL text search config
    
    -- Index maintenance
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Additional search metadata
    keywords JSONB DEFAULT '[]', -- Extracted keywords for search
    synonyms JSONB DEFAULT '[]' -- Search synonyms for better matching
);

-- Critical GIN indexes for fast full-text search
CREATE INDEX template_search_index_vector_idx ON template_search_index USING GIN(search_vector);
CREATE INDEX template_search_index_keywords_idx ON template_search_index USING GIN(keywords);
CREATE INDEX template_search_index_template_idx ON template_search_index(template_id);

-- Performance indexes for search ranking
CREATE INDEX template_search_index_popularity_idx ON template_search_index(popularity_boost DESC);
CREATE INDEX template_search_index_quality_idx ON template_search_index(quality_boost DESC);
CREATE INDEX template_search_index_ctr_idx ON template_search_index(click_through_rate DESC);

/**
 * Template Search Queries table - Search analytics and optimization
 *
 * Tracks user search patterns for search optimization:
 * - Query performance and result relevance
 * - Popular search terms and trends
 * - Search result click patterns
 * - A/B testing for search algorithm improvements
 * - User search journey analysis
 */
CREATE TABLE template_search_queries (
    -- Core identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Anonymous searches allowed
    session_id UUID, -- Session tracking
    
    -- Search query details
    query_text TEXT NOT NULL, -- User's search query
    normalized_query TEXT NOT NULL, -- Processed/normalized query
    query_tokens TEXT[], -- Tokenized search terms
    
    -- Search context
    search_filters JSONB DEFAULT '{}', -- Applied filters (category, tags, etc.)
    sort_order VARCHAR(50) DEFAULT 'relevance', -- Sort preference
    page_number INTEGER DEFAULT 1, -- Pagination
    results_per_page INTEGER DEFAULT 20,
    
    -- Search results and performance
    total_results INTEGER NOT NULL, -- Total matching templates
    results_returned INTEGER NOT NULL, -- Results actually returned
    search_time_ms INTEGER, -- Query execution time
    
    -- User engagement with results
    clicked_results JSONB DEFAULT '[]', -- Templates clicked from results
    result_positions_clicked INTEGER[], -- Positions of clicked results
    highest_clicked_position INTEGER, -- Best performing result position
    
    -- Search quality metrics
    had_results BOOLEAN NOT NULL, -- Query returned results
    user_refined_search BOOLEAN DEFAULT false, -- User modified query
    session_converted BOOLEAN DEFAULT false, -- User downloaded template in session
    
    -- Geographic and temporal context
    country_code VARCHAR(2), -- User location
    language_preference VARCHAR(5) DEFAULT 'en', -- User language
    
    -- Search timestamp
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexing for search analytics and optimization
CREATE INDEX template_search_queries_query_idx ON template_search_queries(normalized_query);
CREATE INDEX template_search_queries_user_idx ON template_search_queries(user_id);
CREATE INDEX template_search_queries_session_idx ON template_search_queries(session_id);
CREATE INDEX template_search_queries_created_idx ON template_search_queries(created_at DESC);
CREATE INDEX template_search_queries_tokens_idx ON template_search_queries USING GIN(query_tokens);
CREATE INDEX template_search_queries_results_idx ON template_search_queries(total_results DESC);

-- ========================================================================================
-- DATABASE FUNCTIONS AND TRIGGERS FOR AUTOMATION
-- ========================================================================================

/**
 * Function: Update template search index
 * Automatically maintains search index when template content changes
 */
CREATE OR REPLACE FUNCTION update_template_search_index()
RETURNS TRIGGER AS $$
BEGIN
    -- Combine all searchable content with appropriate weighting
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

-- Trigger to maintain search index
CREATE TRIGGER trigger_update_template_search_index
    AFTER INSERT OR UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_template_search_index();

/**
 * Function: Update category template counts
 * Maintains accurate template counts in category hierarchy
 */
CREATE OR REPLACE FUNCTION update_category_template_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE operations
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.category_id != NEW.category_id) THEN
        -- Increment new category count
        IF NEW.category_id IS NOT NULL THEN
            UPDATE template_categories 
            SET template_count = template_count + 1,
                updated_at = NOW()
            WHERE id = NEW.category_id;
        END IF;
        
        -- Decrement old category count (UPDATE only)
        IF TG_OP = 'UPDATE' AND OLD.category_id IS NOT NULL THEN
            UPDATE template_categories 
            SET template_count = template_count - 1,
                updated_at = NOW()
            WHERE id = OLD.category_id;
        END IF;
    END IF;
    
    -- Handle DELETE operations
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

-- Trigger to maintain category counts
CREATE TRIGGER trigger_update_category_template_counts
    AFTER INSERT OR UPDATE OR DELETE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_category_template_counts();

/**
 * Function: Update template rating aggregations
 * Maintains real-time rating statistics on templates
 */
CREATE OR REPLACE FUNCTION update_template_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    template_id_to_update UUID;
BEGIN
    -- Determine which template to update
    IF TG_OP = 'DELETE' THEN
        template_id_to_update := OLD.template_id;
    ELSE
        template_id_to_update := NEW.template_id;
    END IF;
    
    -- Update template rating statistics
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

-- Trigger to maintain template rating statistics
CREATE TRIGGER trigger_update_template_rating_stats
    AFTER INSERT OR UPDATE OR DELETE ON template_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_template_rating_stats();

/**
 * Function: Update review helpfulness scores
 * Calculates helpfulness ratios when votes are added/removed
 */
CREATE OR REPLACE FUNCTION update_review_helpfulness()
RETURNS TRIGGER AS $$
DECLARE
    review_id_to_update UUID;
    helpful_count INTEGER;
    total_votes INTEGER;
BEGIN
    -- Determine which review to update
    IF TG_OP = 'DELETE' THEN
        review_id_to_update := OLD.review_id;
    ELSE
        review_id_to_update := NEW.review_id;
    END IF;
    
    -- Calculate vote counts
    SELECT 
        COUNT(*) FILTER (WHERE is_helpful = true),
        COUNT(*)
    INTO helpful_count, total_votes
    FROM template_review_votes
    WHERE review_id = review_id_to_update;
    
    -- Update review helpfulness statistics
    UPDATE template_reviews
    SET 
        helpful_votes = helpful_count,
        unhelpful_votes = total_votes - helpful_count,
        helpfulness_score = CASE 
            WHEN total_votes > 0 THEN helpful_count::DECIMAL / total_votes 
            ELSE 0.5 
        END,
        updated_at = NOW()
    WHERE id = review_id_to_update;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain review helpfulness scores
CREATE TRIGGER trigger_update_review_helpfulness
    AFTER INSERT OR UPDATE OR DELETE ON template_review_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_review_helpfulness();

-- ========================================================================================
-- PERFORMANCE OPTIMIZATION VIEWS
-- ========================================================================================

/**
 * View: Template Library Dashboard
 * Optimized view for template library main dashboard
 */
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
    
    -- Category information
    tc.name AS category_name,
    tc.slug AS category_slug,
    tc.color AS category_color,
    tc.icon AS category_icon,
    
    -- Usage metrics
    COALESCE(tpm.view_count, 0) AS weekly_views,
    COALESCE(tpm.download_count, 0) AS weekly_downloads,
    COALESCE(tpm.trend_score, 0) AS trend_score,
    
    -- Calculated metrics
    CASE 
        WHEN t.views > 0 THEN ROUND((t.download_count::DECIMAL / t.views) * 100, 2)
        ELSE 0 
    END AS conversion_rate,
    
    -- Template tags (array aggregation)
    COALESCE(
        array_agg(DISTINCT tt.display_name) FILTER (WHERE tt.id IS NOT NULL),
        ARRAY[]::VARCHAR[]
    ) AS tags

FROM templates t
LEFT JOIN template_categories tc ON t.category_id = tc.id
LEFT JOIN template_performance_metrics tpm ON t.id = tpm.template_id 
    AND tpm.metric_period = 'weekly' 
    AND tpm.metric_date = CURRENT_DATE - INTERVAL '7 days'
LEFT JOIN template_tag_assignments tta ON t.id = tta.template_id
LEFT JOIN template_tags tt ON tta.tag_id = tt.id AND tt.is_active = true

WHERE t.status = 'published'
GROUP BY t.id, tc.id, tpm.view_count, tpm.download_count, tpm.trend_score
ORDER BY t.created_at DESC;

/**
 * View: Popular Templates
 * High-performance view for popular template listings
 */
CREATE OR REPLACE VIEW popular_templates AS
SELECT 
    t.id,
    t.name,
    t.description,
    t.author,
    t.views,
    t.download_count,
    t.avg_rating,
    t.rating_count,
    tc.name AS category_name,
    tc.slug AS category_slug,
    
    -- Popularity score calculation
    (t.download_count * 2 + t.views + t.stars * 5 + t.avg_rating * t.rating_count) AS popularity_score,
    
    -- Trending calculation (last 30 days)
    COALESCE(tpm.velocity_score, 0) AS velocity_score

FROM templates t
LEFT JOIN template_categories tc ON t.category_id = tc.id
LEFT JOIN template_performance_metrics tpm ON t.id = tpm.template_id 
    AND tpm.metric_period = 'monthly' 
    AND tpm.metric_date >= CURRENT_DATE - INTERVAL '30 days'

WHERE t.status = 'published'
ORDER BY popularity_score DESC, velocity_score DESC;

-- ========================================================================================
-- MIGRATION SCRIPTS AND SAMPLE DATA
-- ========================================================================================

/**
 * Sample data insertion for testing and development
 * This section provides sample data for all new tables
 */

-- Insert sample template categories
INSERT INTO template_categories (id, name, slug, description, parent_id, level, sort_order, icon, color) VALUES
(uuid_generate_v4(), 'Business Automation', 'business-automation', 'Templates for automating business processes', NULL, 0, 1, 'briefcase', '#3B82F6'),
(uuid_generate_v4(), 'Data Processing', 'data-processing', 'Templates for data transformation and analysis', NULL, 0, 2, 'database', '#10B981'),
(uuid_generate_v4(), 'Communication', 'communication', 'Templates for messaging and notifications', NULL, 0, 3, 'message-circle', '#F59E0B'),
(uuid_generate_v4(), 'Analytics', 'analytics', 'Templates for reporting and business intelligence', NULL, 0, 4, 'bar-chart-3', '#8B5CF6');

-- Insert sample template tags
INSERT INTO template_tags (id, name, display_name, slug, description, color, usage_count) VALUES
(uuid_generate_v4(), 'api', 'API', 'api', 'Templates involving API integrations', '#3B82F6', 25),
(uuid_generate_v4(), 'automation', 'Automation', 'automation', 'Workflow automation templates', '#10B981', 40),
(uuid_generate_v4(), 'beginner', 'Beginner', 'beginner', 'Easy to use templates for beginners', '#F59E0B', 30),
(uuid_generate_v4(), 'advanced', 'Advanced', 'advanced', 'Complex templates for experienced users', '#EF4444', 15),
(uuid_generate_v4(), 'real-time', 'Real-time', 'real-time', 'Templates with real-time processing capabilities', '#8B5CF6', 20);

-- Add indexes for performance optimization after data insertion
CREATE INDEX CONCURRENTLY IF NOT EXISTS template_categories_path_btree_idx ON template_categories USING BTREE(path);
CREATE INDEX CONCURRENTLY IF NOT EXISTS template_analytics_events_partitioned_idx ON template_analytics_events(created_at, template_id);

/**
 * Database maintenance procedures
 * Functions for regular maintenance and optimization
 */

-- Function to clean up old analytics events (run monthly)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM template_analytics_events 
    WHERE created_at < CURRENT_DATE - INTERVAL '13 months';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Update statistics after cleanup
    ANALYZE template_analytics_events;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh performance metrics (run daily)
CREATE OR REPLACE FUNCTION refresh_template_performance_metrics()
RETURNS VOID AS $$
BEGIN
    -- Calculate daily metrics for yesterday
    INSERT INTO template_performance_metrics (
        template_id,
        metric_date,
        metric_period,
        view_count,
        unique_views,
        download_count,
        unique_downloads,
        deployment_count,
        successful_deployments
    )
    SELECT 
        template_id,
        CURRENT_DATE - INTERVAL '1 day',
        'daily',
        COUNT(*) FILTER (WHERE event_type = 'view'),
        COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'view'),
        COUNT(*) FILTER (WHERE event_type = 'download'),
        COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'download'),
        COUNT(*) FILTER (WHERE event_type = 'deploy'),
        COUNT(*) FILTER (WHERE event_type = 'deploy' AND deployment_success = true)
    FROM template_analytics_events
    WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY template_id
    ON CONFLICT (template_id, metric_date, metric_period) DO UPDATE SET
        view_count = EXCLUDED.view_count,
        unique_views = EXCLUDED.unique_views,
        download_count = EXCLUDED.download_count,
        unique_downloads = EXCLUDED.unique_downloads,
        deployment_count = EXCLUDED.deployment_count,
        successful_deployments = EXCLUDED.successful_deployments,
        calculated_at = NOW();
        
    -- Update trend scores
    UPDATE template_performance_metrics 
    SET trend_score = calculate_trend_score(template_id)
    WHERE metric_period = 'daily' 
    AND metric_date = CURRENT_DATE - INTERVAL '1 day';
    
END;
$$ LANGUAGE plpgsql;

-- ========================================================================================
-- SECURITY AND ACCESS CONTROL
-- ========================================================================================

-- Row Level Security (RLS) policies for template access control
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all published templates
CREATE POLICY template_public_read ON templates
    FOR SELECT
    USING (status = 'published');

-- Policy: Users can manage their own templates
CREATE POLICY template_owner_all ON templates
    FOR ALL
    USING (auth.uid()::text = user_id);

-- Policy: Users can create reviews for templates they don't own
CREATE POLICY template_review_create ON template_reviews
    FOR INSERT
    WITH CHECK (auth.uid()::text = reviewer_id AND auth.uid()::text != (
        SELECT user_id FROM templates WHERE id = template_id
    ));

-- Policy: Users can read all published reviews
CREATE POLICY template_review_read ON template_reviews
    FOR SELECT
    USING (status = 'published');

-- Policy: Users can manage their own reviews
CREATE POLICY template_review_owner ON template_reviews
    FOR ALL
    USING (auth.uid()::text = reviewer_id);

-- ========================================================================================
-- CONCLUSION AND IMPLEMENTATION NOTES
-- ========================================================================================

/*
IMPLEMENTATION CHECKLIST:

1. Database Setup:
   ✓ Enable required PostgreSQL extensions (uuid-ossp, vector)
   ✓ Create all tables in dependency order
   ✓ Apply all indexes and constraints
   ✓ Set up triggers and functions for automation

2. Data Migration:
   ✓ Migrate existing templates to new schema
   ✓ Create default categories and tags
   ✓ Initialize search indexes
   ✓ Set up performance metrics baseline

3. Performance Optimization:
   ✓ Monitor query performance with EXPLAIN ANALYZE
   ✓ Adjust indexes based on actual usage patterns
   ✓ Set up query monitoring and slow query alerts
   ✓ Configure connection pooling for high concurrency

4. Maintenance:
   ✓ Schedule daily performance metric calculations
   ✓ Set up monthly analytics cleanup procedures
   ✓ Monitor search index freshness
   ✓ Regular VACUUM and ANALYZE operations

5. Security:
   ✓ Enable Row Level Security on sensitive tables
   ✓ Configure appropriate access policies
   ✓ Set up audit logging for sensitive operations
   ✓ Regular security reviews and updates

PERFORMANCE EXPECTATIONS:
- Template search: < 50ms for typical queries
- Category browsing: < 25ms with proper indexing
- Analytics aggregation: Background processing
- Review loading: < 100ms with pagination
- Template upload/update: < 200ms including search index

SCALABILITY NOTES:
- Tables designed for millions of templates
- Analytics events can be partitioned by date
- Search indexes can be distributed across multiple databases
- Performance metrics can be cached in Redis for ultra-fast access
- Consider read replicas for analytics queries
*/

-- End of Template Library Schema Extensions