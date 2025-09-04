-- ================================================================================================
-- Help System Database Schema Extensions
-- ================================================================================================
--
-- Comprehensive database schema for Sim's context-sensitive help and documentation system.
-- This schema supports:
-- - Help content management with versioning and localization
-- - User interaction tracking and analytics
-- - Feedback collection and sentiment analysis  
-- - Search indexing and performance optimization
-- - Content personalization and recommendation
-- - A/B testing and content effectiveness measurement
--
-- Created: 2025-09-04
-- Author: Claude Development System
-- ================================================================================================

-- ================================================================================================
-- HELP CONTENT TABLES
-- ================================================================================================

-- Help Content Documents
CREATE TABLE IF NOT EXISTS help_content (
    id VARCHAR(255) PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_format ENUM('markdown', 'html', 'json', 'video') DEFAULT 'markdown',
    
    -- Categorization
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    tags JSON, -- Array of tags for flexible categorization
    
    -- User targeting
    user_levels JSON NOT NULL DEFAULT '["beginner"]', -- Array of user levels
    components JSON, -- Array of component contexts where this content applies
    pages JSON, -- Array of page paths where this content is relevant
    
    -- Content metadata
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    version INTEGER NOT NULL DEFAULT 1,
    status ENUM('draft', 'published', 'archived', 'deprecated') DEFAULT 'draft',
    
    -- SEO and discovery
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    keywords JSON, -- Array of search keywords
    search_terms JSON, -- Array of alternate search terms
    
    -- Content properties
    difficulty_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner',
    estimated_reading_time INTEGER, -- in seconds
    content_type ENUM('guide', 'tutorial', 'reference', 'troubleshooting', 'faq', 'video', 'interactive') NOT NULL,
    
    -- Display settings
    show_in_search BOOLEAN DEFAULT TRUE,
    show_in_navigation BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 100, -- Lower numbers = higher priority
    
    -- Version control
    parent_id VARCHAR(255), -- Reference to original content for versions
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_help_content_category (category),
    INDEX idx_help_content_status (status),
    INDEX idx_help_content_language (language),
    INDEX idx_help_content_user_levels (user_levels(255)),
    INDEX idx_help_content_components (components(255)),
    INDEX idx_help_content_search (show_in_search, status, language),
    INDEX idx_help_content_featured (featured, priority),
    INDEX idx_help_content_updated (updated_at),
    
    -- Full-text search index
    FULLTEXT KEY idx_help_content_search_text (title, content, meta_description, keywords)
);

-- Help Content Relationships (for content linking and prerequisites)
CREATE TABLE IF NOT EXISTS help_content_relationships (
    id VARCHAR(255) PRIMARY KEY,
    source_content_id VARCHAR(255) NOT NULL,
    target_content_id VARCHAR(255) NOT NULL,
    relationship_type ENUM('prerequisite', 'related', 'next_step', 'see_also', 'alternative') NOT NULL,
    relationship_strength DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0 relevance score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_relationship (source_content_id, target_content_id, relationship_type),
    FOREIGN KEY (source_content_id) REFERENCES help_content(id) ON DELETE CASCADE,
    FOREIGN KEY (target_content_id) REFERENCES help_content(id) ON DELETE CASCADE,
    
    INDEX idx_relationships_source (source_content_id),
    INDEX idx_relationships_target (target_content_id),
    INDEX idx_relationships_type (relationship_type)
);

-- Help Content Media Assets
CREATE TABLE IF NOT EXISTS help_content_media (
    id VARCHAR(255) PRIMARY KEY,
    content_id VARCHAR(255) NOT NULL,
    media_type ENUM('image', 'video', 'audio', 'document', 'interactive') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER, -- in bytes
    mime_type VARCHAR(100),
    alt_text VARCHAR(500),
    caption TEXT,
    transcript TEXT, -- For video/audio accessibility
    
    -- Media metadata
    duration INTEGER, -- for video/audio in seconds
    dimensions JSON, -- {width: number, height: number} for images/videos
    quality_variants JSON, -- Array of different quality versions
    
    -- Display properties
    display_order INTEGER DEFAULT 0,
    thumbnail_path VARCHAR(500),
    is_primary BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (content_id) REFERENCES help_content(id) ON DELETE CASCADE,
    INDEX idx_media_content (content_id),
    INDEX idx_media_type (media_type),
    INDEX idx_media_primary (is_primary)
);

-- ================================================================================================
-- USER INTERACTION TABLES
-- ================================================================================================

-- User Help Sessions (for tracking user help journey)
CREATE TABLE IF NOT EXISTS help_user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255), -- Can be null for anonymous users
    session_token VARCHAR(255) NOT NULL,
    
    -- Session context
    user_agent TEXT,
    ip_address VARCHAR(45), -- Supports both IPv4 and IPv6
    referrer VARCHAR(500),
    entry_point VARCHAR(255), -- How user entered help system
    
    -- User characteristics
    user_level ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    detected_language VARCHAR(10),
    timezone VARCHAR(50),
    
    -- Session metadata
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    session_duration INTEGER, -- in seconds
    
    -- Session outcome
    goal_achieved BOOLEAN,
    satisfaction_score INTEGER, -- 1-5 rating if provided
    exit_reason ENUM('goal_achieved', 'abandoned', 'frustrated', 'completed_tour', 'external_link'),
    
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_token (session_token),
    INDEX idx_sessions_activity (last_activity_at),
    INDEX idx_sessions_duration (session_duration),
    INDEX idx_sessions_satisfaction (satisfaction_score)
);

-- Help Content Views (detailed content interaction tracking)
CREATE TABLE IF NOT EXISTS help_content_views (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255), -- Can be null for anonymous users
    
    -- View context
    component_context VARCHAR(255), -- Which UI component user was in
    page_context VARCHAR(255), -- Which page user was on
    workflow_state ENUM('empty', 'creating', 'editing', 'running', 'debugging'),
    error_state BOOLEAN DEFAULT FALSE,
    
    -- View behavior
    view_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    view_ended_at TIMESTAMP,
    view_duration INTEGER, -- in seconds
    scroll_depth DECIMAL(5,2), -- Percentage of content scrolled
    
    -- Interaction metrics
    clicks_count INTEGER DEFAULT 0,
    copy_actions INTEGER DEFAULT 0, -- How many times user copied content
    link_clicks INTEGER DEFAULT 0,
    media_interactions INTEGER DEFAULT 0,
    
    -- Exit behavior
    exit_action ENUM('navigated_away', 'closed_help', 'followed_link', 'completed_task', 'abandoned'),
    next_content_id VARCHAR(255), -- What content user viewed next
    
    -- Effectiveness indicators
    task_completed BOOLEAN,
    found_helpful BOOLEAN,
    shared BOOLEAN DEFAULT FALSE,
    bookmarked BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (session_id) REFERENCES help_user_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES help_content(id) ON DELETE CASCADE,
    FOREIGN KEY (next_content_id) REFERENCES help_content(id) ON DELETE SET NULL,
    
    INDEX idx_content_views_session (session_id),
    INDEX idx_content_views_content (content_id),
    INDEX idx_content_views_user (user_id),
    INDEX idx_content_views_component (component_context),
    INDEX idx_content_views_duration (view_duration),
    INDEX idx_content_views_helpful (found_helpful),
    INDEX idx_content_views_time (view_started_at)
);

-- Help Search Queries (search behavior and effectiveness)
CREATE TABLE IF NOT EXISTS help_search_queries (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255), -- Can be null for anonymous users
    
    -- Query details
    query_text VARCHAR(500) NOT NULL,
    query_normalized VARCHAR(500), -- Cleaned/normalized version for analysis
    query_intent ENUM('find_specific', 'browse_category', 'troubleshoot', 'learn_concept', 'comparison'),
    
    -- Search context
    component_context VARCHAR(255),
    page_context VARCHAR(255),
    previous_query_id VARCHAR(255), -- For query refinement tracking
    
    -- Search results
    results_count INTEGER NOT NULL DEFAULT 0,
    results_shown INTEGER, -- How many results were actually displayed
    zero_results BOOLEAN GENERATED ALWAYS AS (results_count = 0) STORED,
    
    -- User interaction with results
    first_click_position INTEGER, -- Position of first clicked result (1-based)
    clicks_total INTEGER DEFAULT 0,
    results_clicked JSON, -- Array of clicked result positions
    
    -- Search quality metrics
    user_satisfied BOOLEAN, -- Did user find what they needed
    refinement_needed BOOLEAN DEFAULT FALSE,
    spelling_corrected BOOLEAN DEFAULT FALSE,
    suggestion_used BOOLEAN DEFAULT FALSE,
    
    -- Performance metrics
    search_duration INTEGER, -- Time to execute search in milliseconds
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES help_user_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (previous_query_id) REFERENCES help_search_queries(id) ON DELETE SET NULL,
    
    INDEX idx_search_queries_session (session_id),
    INDEX idx_search_queries_user (user_id),
    INDEX idx_search_queries_text (query_text),
    INDEX idx_search_queries_normalized (query_normalized),
    INDEX idx_search_queries_zero_results (zero_results),
    INDEX idx_search_queries_satisfied (user_satisfied),
    INDEX idx_search_queries_time (created_at),
    
    -- Full-text search on queries for analysis
    FULLTEXT KEY idx_search_queries_fulltext (query_text, query_normalized)
);

-- Help Interactions (granular interaction tracking)
CREATE TABLE IF NOT EXISTS help_interactions (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    content_id VARCHAR(255), -- Can be null for general interactions
    user_id VARCHAR(255), -- Can be null for anonymous users
    
    -- Interaction details
    interaction_type ENUM('tooltip_shown', 'tooltip_clicked', 'panel_opened', 'panel_closed', 
                         'spotlight_started', 'spotlight_completed', 'spotlight_skipped',
                         'search_performed', 'content_bookmarked', 'content_shared',
                         'feedback_given', 'link_clicked', 'media_played', 'code_copied',
                         'tour_started', 'tour_completed', 'help_requested') NOT NULL,
    
    -- Interaction context
    component_context VARCHAR(255) NOT NULL,
    page_context VARCHAR(255),
    element_context VARCHAR(255), -- Specific UI element if applicable
    
    -- Interaction data
    interaction_data JSON, -- Flexible storage for interaction-specific data
    duration INTEGER, -- How long the interaction lasted in milliseconds
    success BOOLEAN, -- Whether the interaction was successful
    
    -- User state
    user_level ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    workflow_state ENUM('empty', 'creating', 'editing', 'running', 'debugging'),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES help_user_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES help_content(id) ON DELETE CASCADE,
    
    INDEX idx_interactions_session (session_id),
    INDEX idx_interactions_content (content_id),
    INDEX idx_interactions_user (user_id),
    INDEX idx_interactions_type (interaction_type),
    INDEX idx_interactions_component (component_context),
    INDEX idx_interactions_success (success),
    INDEX idx_interactions_time (created_at)
);

-- ================================================================================================
-- FEEDBACK AND QUALITY TABLES  
-- ================================================================================================

-- Help Feedback (user feedback on content and system)
CREATE TABLE IF NOT EXISTS help_feedback (
    id VARCHAR(255) PRIMARY KEY,
    content_id VARCHAR(255), -- Can be null for general system feedback
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255), -- Can be null for anonymous users
    
    -- Feedback type and content
    feedback_type ENUM('rating', 'helpful', 'suggestion', 'error_report', 'content_request', 'general_feedback') NOT NULL,
    
    -- Rating feedback (1-5 stars)
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    
    -- Helpful/not helpful feedback
    helpful BOOLEAN,
    
    -- Text feedback
    comment TEXT,
    suggestion TEXT,
    
    -- Error reporting
    error_description TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    
    -- Content request
    requested_topic VARCHAR(500),
    use_case TEXT,
    
    -- Context information
    user_level ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    difficulty ENUM('too_easy', 'just_right', 'too_difficult'),
    completion_time INTEGER, -- seconds taken to complete task
    followed_instructions BOOLEAN,
    
    -- Classification and processing
    tags JSON, -- Array of tags for categorization
    category VARCHAR(100),
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    sentiment_score DECIMAL(3,2), -- -1.0 to 1.0 sentiment analysis result
    sentiment_label ENUM('negative', 'neutral', 'positive'),
    
    -- Moderation and spam detection
    is_spam BOOLEAN DEFAULT FALSE,
    spam_score DECIMAL(3,2), -- 0.0 to 1.0 spam probability
    moderation_status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'pending',
    
    -- Feedback lifecycle
    status ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
    response TEXT, -- Admin response to feedback
    assigned_to VARCHAR(255), -- Team member assigned to handle feedback
    internal_notes TEXT,
    
    -- Resolution tracking
    resolution_action ENUM('content_updated', 'bug_fixed', 'feature_added', 'no_action_needed'),
    resolution_description TEXT,
    related_changes JSON, -- Array of related content/code changes
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES help_user_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES help_content(id) ON DELETE CASCADE,
    
    INDEX idx_feedback_content (content_id),
    INDEX idx_feedback_session (session_id),
    INDEX idx_feedback_user (user_id),
    INDEX idx_feedback_type (feedback_type),
    INDEX idx_feedback_rating (rating),
    INDEX idx_feedback_helpful (helpful),
    INDEX idx_feedback_priority (priority),
    INDEX idx_feedback_status (status),
    INDEX idx_feedback_spam (is_spam),
    INDEX idx_feedback_sentiment (sentiment_label),
    INDEX idx_feedback_time (created_at)
);

-- ================================================================================================
-- ANALYTICS AND PERFORMANCE TABLES
-- ================================================================================================

-- Help Content Analytics (aggregated content performance metrics)
CREATE TABLE IF NOT EXISTS help_content_analytics (
    id VARCHAR(255) PRIMARY KEY,
    content_id VARCHAR(255) NOT NULL,
    
    -- Time period for this analytics record
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type ENUM('day', 'week', 'month', 'quarter', 'year') NOT NULL,
    
    -- View metrics
    total_views INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    
    -- Engagement metrics
    average_view_duration INTEGER, -- seconds
    median_view_duration INTEGER, -- seconds
    bounce_rate DECIMAL(5,4), -- percentage as decimal (0.0000 to 1.0000)
    completion_rate DECIMAL(5,4), -- percentage of users who viewed entire content
    
    -- Interaction metrics
    total_interactions INTEGER DEFAULT 0,
    tooltip_shows INTEGER DEFAULT 0,
    link_clicks INTEGER DEFAULT 0,
    media_interactions INTEGER DEFAULT 0,
    copy_actions INTEGER DEFAULT 0,
    
    -- Search and discovery
    search_appearances INTEGER DEFAULT 0, -- How often this content appeared in search
    search_clicks INTEGER DEFAULT 0, -- How often users clicked from search
    search_ctr DECIMAL(5,4), -- Click-through rate from search
    
    -- User feedback aggregation
    total_ratings INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2), -- 1.00 to 5.00
    helpful_votes INTEGER DEFAULT 0,
    not_helpful_votes INTEGER DEFAULT 0,
    helpful_percentage DECIMAL(5,4),
    
    feedback_count INTEGER DEFAULT 0,
    suggestion_count INTEGER DEFAULT 0,
    error_reports INTEGER DEFAULT 0,
    
    -- Content effectiveness
    task_completion_rate DECIMAL(5,4), -- How often users completed their task
    user_satisfaction_score DECIMAL(3,2), -- Aggregated satisfaction
    return_rate DECIMAL(5,4), -- How often users return to this content
    
    -- Performance indicators
    load_time_avg INTEGER, -- Average content load time in milliseconds
    search_rank_avg DECIMAL(5,2), -- Average position in search results
    
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_content_period (content_id, period_start, period_end, period_type),
    FOREIGN KEY (content_id) REFERENCES help_content(id) ON DELETE CASCADE,
    
    INDEX idx_analytics_content (content_id),
    INDEX idx_analytics_period (period_start, period_end),
    INDEX idx_analytics_type (period_type),
    INDEX idx_analytics_views (total_views),
    INDEX idx_analytics_rating (average_rating),
    INDEX idx_analytics_helpful (helpful_percentage),
    INDEX idx_analytics_completion (completion_rate)
);

-- Help System Analytics (overall system performance metrics)
CREATE TABLE IF NOT EXISTS help_system_analytics (
    id VARCHAR(255) PRIMARY KEY,
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type ENUM('day', 'week', 'month', 'quarter', 'year') NOT NULL,
    
    -- User metrics
    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    returning_users INTEGER DEFAULT 0,
    active_sessions INTEGER DEFAULT 0,
    
    -- Usage patterns
    average_session_duration INTEGER, -- seconds
    pages_per_session DECIMAL(5,2),
    help_requests_total INTEGER DEFAULT 0,
    successful_help_sessions INTEGER DEFAULT 0,
    abandoned_sessions INTEGER DEFAULT 0,
    
    -- Search metrics
    total_searches INTEGER DEFAULT 0,
    unique_search_queries INTEGER DEFAULT 0,
    zero_result_searches INTEGER DEFAULT 0,
    zero_result_percentage DECIMAL(5,4),
    average_search_results INTEGER,
    
    -- Content metrics
    total_content_views INTEGER DEFAULT 0,
    most_viewed_content_id VARCHAR(255),
    least_viewed_content_id VARCHAR(255),
    content_gap_areas JSON, -- Areas where users search but no content exists
    
    -- Feedback and quality
    total_feedback INTEGER DEFAULT 0,
    average_satisfaction DECIMAL(3,2),
    critical_issues INTEGER DEFAULT 0,
    resolved_issues INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_response_time INTEGER, -- milliseconds
    system_uptime DECIMAL(5,4), -- percentage
    error_rate DECIMAL(5,4), -- percentage of failed requests
    
    -- Growth metrics
    user_growth_rate DECIMAL(5,4), -- compared to previous period
    content_growth_rate DECIMAL(5,4),
    engagement_growth_rate DECIMAL(5,4),
    
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_system_period (period_start, period_end, period_type),
    FOREIGN KEY (most_viewed_content_id) REFERENCES help_content(id) ON DELETE SET NULL,
    FOREIGN KEY (least_viewed_content_id) REFERENCES help_content(id) ON DELETE SET NULL,
    
    INDEX idx_system_analytics_period (period_start, period_end),
    INDEX idx_system_analytics_type (period_type),
    INDEX idx_system_analytics_users (total_users),
    INDEX idx_system_analytics_satisfaction (average_satisfaction)
);

-- ================================================================================================
-- PERSONALIZATION AND RECOMMENDATIONS
-- ================================================================================================

-- User Help Preferences (personalization settings)
CREATE TABLE IF NOT EXISTS help_user_preferences (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    
    -- Display preferences
    preferred_language VARCHAR(10) DEFAULT 'en',
    content_density ENUM('compact', 'comfortable', 'spacious') DEFAULT 'comfortable',
    theme ENUM('light', 'dark', 'auto') DEFAULT 'auto',
    font_size ENUM('small', 'medium', 'large') DEFAULT 'medium',
    
    -- Content preferences
    preferred_content_types JSON, -- Array of preferred content types
    complexity_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner',
    show_tooltips BOOLEAN DEFAULT TRUE,
    auto_play_videos BOOLEAN DEFAULT FALSE,
    
    -- Interaction preferences
    keyboard_shortcuts_enabled BOOLEAN DEFAULT TRUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_digest BOOLEAN DEFAULT FALSE,
    digest_frequency ENUM('daily', 'weekly', 'monthly', 'never') DEFAULT 'never',
    
    -- Learning tracking
    completed_tours JSON, -- Array of completed tour IDs
    bookmarked_content JSON, -- Array of bookmarked content IDs
    hidden_content JSON, -- Array of content IDs user has chosen to hide
    recent_topics JSON, -- Array of recently viewed topic categories
    
    -- Personalization data
    interests JSON, -- Array of user interest areas
    skill_level_per_topic JSON, -- Object mapping topics to skill levels
    preferred_learning_style ENUM('visual', 'auditory', 'kinesthetic', 'reading') DEFAULT 'visual',
    
    -- Privacy settings
    analytics_tracking BOOLEAN DEFAULT TRUE,
    personalized_recommendations BOOLEAN DEFAULT TRUE,
    data_sharing_consent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_preferences_user (user_id),
    INDEX idx_user_preferences_language (preferred_language),
    INDEX idx_user_preferences_level (complexity_level)
);

-- Help Content Recommendations (personalized content suggestions)
CREATE TABLE IF NOT EXISTS help_content_recommendations (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    
    -- Recommendation details
    recommendation_type ENUM('personalized', 'trending', 'related', 'popular', 'new', 'seasonal') NOT NULL,
    score DECIMAL(5,4) NOT NULL, -- Relevance score 0.0000 to 1.0000
    confidence DECIMAL(5,4), -- Confidence in recommendation 0.0000 to 1.0000
    
    -- Recommendation context
    context_component VARCHAR(255), -- Where recommendation should be shown
    context_trigger ENUM('login', 'search', 'content_view', 'error', 'onboarding', 'periodic'),
    
    -- Recommendation reasoning
    reasoning JSON, -- Explanation of why this was recommended
    similar_users_count INTEGER, -- How many similar users found this helpful
    
    -- Engagement tracking
    shown_at TIMESTAMP,
    clicked_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    engagement_type ENUM('shown', 'clicked', 'dismissed', 'ignored'),
    
    -- Effectiveness
    helpful_feedback BOOLEAN, -- User feedback on recommendation quality
    conversion_achieved BOOLEAN, -- Did user complete intended action
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- When this recommendation becomes stale
    
    UNIQUE KEY unique_user_content_rec (user_id, content_id, recommendation_type),
    FOREIGN KEY (content_id) REFERENCES help_content(id) ON DELETE CASCADE,
    
    INDEX idx_recommendations_user (user_id),
    INDEX idx_recommendations_content (content_id),
    INDEX idx_recommendations_score (score),
    INDEX idx_recommendations_type (recommendation_type),
    INDEX idx_recommendations_context (context_component),
    INDEX idx_recommendations_engagement (engagement_type),
    INDEX idx_recommendations_expires (expires_at)
);

-- ================================================================================================
-- INDEXING AND PERFORMANCE OPTIMIZATION
-- ================================================================================================

-- Help Search Index (optimized search index for content discovery)
CREATE TABLE IF NOT EXISTS help_search_index (
    id VARCHAR(255) PRIMARY KEY,
    content_id VARCHAR(255) NOT NULL,
    
    -- Indexed content
    indexed_title VARCHAR(500),
    indexed_content TEXT,
    indexed_keywords JSON,
    indexed_synonyms JSON,
    
    -- Search optimization
    search_weight DECIMAL(5,4) DEFAULT 1.0000, -- Content importance weight
    boost_score DECIMAL(5,4) DEFAULT 1.0000, -- Temporary boost for trending content
    quality_score DECIMAL(5,4), -- Content quality indicator
    
    -- Language and localization
    language VARCHAR(10) NOT NULL,
    stemmed_content TEXT, -- Linguistically processed content for better matching
    
    -- Performance optimization
    last_indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    index_version INTEGER DEFAULT 1,
    
    UNIQUE KEY unique_content_language (content_id, language),
    FOREIGN KEY (content_id) REFERENCES help_content(id) ON DELETE CASCADE,
    
    INDEX idx_search_index_content (content_id),
    INDEX idx_search_index_language (language),
    INDEX idx_search_index_weight (search_weight),
    INDEX idx_search_index_quality (quality_score),
    INDEX idx_search_index_updated (last_indexed_at),
    
    -- Full-text search indexes for optimal search performance
    FULLTEXT KEY idx_search_title (indexed_title),
    FULLTEXT KEY idx_search_content (indexed_content),
    FULLTEXT KEY idx_search_all (indexed_title, indexed_content, stemmed_content)
);

-- ================================================================================================
-- TRIGGERS FOR AUTOMATED MAINTENANCE
-- ================================================================================================

-- Auto-update help content updated_at timestamp
DELIMITER ;;
CREATE TRIGGER IF NOT EXISTS help_content_update_timestamp 
    BEFORE UPDATE ON help_content 
    FOR EACH ROW 
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END;;

-- Auto-update help_user_sessions last_activity_at
CREATE TRIGGER IF NOT EXISTS help_sessions_activity_update
    BEFORE UPDATE ON help_user_sessions
    FOR EACH ROW
BEGIN
    SET NEW.last_activity_at = CURRENT_TIMESTAMP;
END;;

-- Auto-calculate session duration when session ends
CREATE TRIGGER IF NOT EXISTS help_sessions_duration_calculation
    BEFORE UPDATE ON help_user_sessions
    FOR EACH ROW
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        SET NEW.session_duration = TIMESTAMPDIFF(SECOND, NEW.started_at, NEW.ended_at);
    END IF;
END;;

-- Auto-calculate view duration when view ends
CREATE TRIGGER IF NOT EXISTS help_content_views_duration
    BEFORE UPDATE ON help_content_views
    FOR EACH ROW
BEGIN
    IF NEW.view_ended_at IS NOT NULL AND OLD.view_ended_at IS NULL THEN
        SET NEW.view_duration = TIMESTAMPDIFF(SECOND, NEW.view_started_at, NEW.view_ended_at);
    END IF;
END;;

DELIMITER ;

-- ================================================================================================
-- INITIAL DATA AND CONFIGURATION
-- ================================================================================================

-- Insert default help categories
INSERT IGNORE INTO help_content (
    id, slug, title, content, category, user_levels, content_type, status, language
) VALUES 
(
    'welcome-guide',
    'welcome-to-sim', 
    'Welcome to Sim',
    '# Welcome to Sim\n\nWelcome to Sim, the powerful workflow automation platform...',
    'getting-started',
    '["beginner", "intermediate", "advanced", "expert"]',
    'guide',
    'published',
    'en'
),
(
    'quick-start-guide',
    'quick-start-guide',
    'Quick Start Guide', 
    '# Quick Start Guide\n\nGet up and running with Sim in just 5 minutes...',
    'getting-started',
    '["beginner"]',
    'tutorial',
    'published',
    'en'
),
(
    'workflow-creation-basics',
    'creating-workflows',
    'Creating Effective Workflows',
    '# Creating Effective Workflows\n\nLearn the fundamental principles...',
    'workflow-basics',
    '["beginner", "intermediate"]',
    'guide', 
    'published',
    'en'
);

-- ================================================================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================================================================

-- Content performance summary view
CREATE OR REPLACE VIEW help_content_performance_summary AS
SELECT 
    hc.id,
    hc.title,
    hc.category,
    hc.status,
    hc.created_at,
    COUNT(DISTINCT hcv.session_id) as unique_sessions,
    COUNT(hcv.id) as total_views,
    AVG(hcv.view_duration) as avg_view_duration,
    SUM(CASE WHEN hcv.found_helpful = TRUE THEN 1 ELSE 0 END) as helpful_count,
    SUM(CASE WHEN hcv.found_helpful = FALSE THEN 1 ELSE 0 END) as not_helpful_count,
    AVG(hf.rating) as avg_rating,
    COUNT(hf.id) as feedback_count
FROM help_content hc
LEFT JOIN help_content_views hcv ON hc.id = hcv.content_id
LEFT JOIN help_feedback hf ON hc.id = hf.content_id AND hf.rating IS NOT NULL
GROUP BY hc.id, hc.title, hc.category, hc.status, hc.created_at;

-- User engagement summary view  
CREATE OR REPLACE VIEW help_user_engagement_summary AS
SELECT
    DATE(hus.started_at) as date,
    COUNT(DISTINCT hus.id) as total_sessions,
    COUNT(DISTINCT hus.user_id) as unique_users,
    AVG(hus.session_duration) as avg_session_duration,
    COUNT(DISTINCT hcv.content_id) as unique_content_viewed,
    COUNT(hcv.id) as total_content_views,
    SUM(CASE WHEN hus.goal_achieved = TRUE THEN 1 ELSE 0 END) as successful_sessions
FROM help_user_sessions hus
LEFT JOIN help_content_views hcv ON hus.id = hcv.session_id
GROUP BY DATE(hus.started_at)
ORDER BY date DESC;

-- Search analytics summary view
CREATE OR REPLACE VIEW help_search_analytics_summary AS
SELECT
    DATE(hsq.created_at) as date,
    COUNT(hsq.id) as total_searches,
    COUNT(DISTINCT hsq.session_id) as unique_searchers,
    COUNT(DISTINCT hsq.query_normalized) as unique_queries,
    SUM(CASE WHEN hsq.results_count = 0 THEN 1 ELSE 0 END) as zero_result_searches,
    AVG(hsq.results_count) as avg_results_per_search,
    SUM(CASE WHEN hsq.user_satisfied = TRUE THEN 1 ELSE 0 END) as satisfied_searches
FROM help_search_queries hsq
GROUP BY DATE(hsq.created_at)
ORDER BY date DESC;

-- ================================================================================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- ================================================================================================

DELIMITER ;;

-- Procedure to update content analytics
CREATE PROCEDURE IF NOT EXISTS UpdateHelpContentAnalytics(
    IN content_id_param VARCHAR(255),
    IN start_date DATE,
    IN end_date DATE,
    IN period_type_param ENUM('day', 'week', 'month', 'quarter', 'year')
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Delete existing analytics for this period
    DELETE FROM help_content_analytics 
    WHERE content_id = content_id_param 
      AND period_start = start_date 
      AND period_end = end_date 
      AND period_type = period_type_param;
    
    -- Insert new analytics data
    INSERT INTO help_content_analytics (
        id, content_id, period_start, period_end, period_type,
        total_views, unique_users, unique_sessions,
        average_view_duration, bounce_rate, completion_rate,
        total_ratings, average_rating, helpful_votes, not_helpful_votes,
        helpful_percentage, task_completion_rate
    )
    SELECT 
        CONCAT(content_id_param, '_', start_date, '_', end_date, '_', period_type_param) as id,
        content_id_param,
        start_date,
        end_date, 
        period_type_param,
        COUNT(hcv.id) as total_views,
        COUNT(DISTINCT hcv.user_id) as unique_users,
        COUNT(DISTINCT hcv.session_id) as unique_sessions,
        AVG(hcv.view_duration) as average_view_duration,
        SUM(CASE WHEN hcv.view_duration < 30 THEN 1 ELSE 0 END) / COUNT(hcv.id) as bounce_rate,
        SUM(CASE WHEN hcv.scroll_depth >= 80 THEN 1 ELSE 0 END) / COUNT(hcv.id) as completion_rate,
        COUNT(hf.rating) as total_ratings,
        AVG(hf.rating) as average_rating,
        SUM(CASE WHEN hcv.found_helpful = TRUE THEN 1 ELSE 0 END) as helpful_votes,
        SUM(CASE WHEN hcv.found_helpful = FALSE THEN 1 ELSE 0 END) as not_helpful_votes,
        CASE 
            WHEN (SUM(CASE WHEN hcv.found_helpful = TRUE THEN 1 ELSE 0 END) + 
                  SUM(CASE WHEN hcv.found_helpful = FALSE THEN 1 ELSE 0 END)) > 0 
            THEN SUM(CASE WHEN hcv.found_helpful = TRUE THEN 1 ELSE 0 END) / 
                 (SUM(CASE WHEN hcv.found_helpful = TRUE THEN 1 ELSE 0 END) + 
                  SUM(CASE WHEN hcv.found_helpful = FALSE THEN 1 ELSE 0 END))
            ELSE 0 
        END as helpful_percentage,
        SUM(CASE WHEN hcv.task_completed = TRUE THEN 1 ELSE 0 END) / COUNT(hcv.id) as task_completion_rate
    FROM help_content_views hcv
    LEFT JOIN help_feedback hf ON hcv.content_id = hf.content_id AND hcv.session_id = hf.session_id
    WHERE hcv.content_id = content_id_param
      AND DATE(hcv.view_started_at) BETWEEN start_date AND end_date
    GROUP BY hcv.content_id;
    
    COMMIT;
END;;

DELIMITER ;

-- ================================================================================================
-- PERFORMANCE OPTIMIZATION RECOMMENDATIONS
-- ================================================================================================

/*
PERFORMANCE OPTIMIZATION NOTES:

1. INDEXING STRATEGY:
   - Primary indexes on frequently queried columns (content_id, user_id, session_id)
   - Composite indexes for common query patterns
   - Full-text indexes for content search
   - Time-based indexes for analytics queries

2. PARTITIONING RECOMMENDATIONS:
   - Partition analytics tables by date for better performance
   - Consider partitioning large interaction tables by month
   
3. ARCHIVAL STRATEGY:
   - Archive old session data (>1 year) to separate tables
   - Implement data retention policies for privacy compliance
   - Keep aggregated analytics data longer than raw interaction data

4. CACHING STRATEGY:
   - Cache frequently accessed content in Redis
   - Cache analytics summaries with appropriate TTL
   - Use materialized views for complex aggregations

5. MONITORING:
   - Monitor query performance with slow query log
   - Track table growth rates and plan for scaling
   - Set up alerts for unusual patterns or performance degradation
*/