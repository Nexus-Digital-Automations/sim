-- ========================================================================================
-- TEMPLATE LIBRARY ANALYTICS QUERIES
-- Comprehensive analytics queries for template insights and performance monitoring
-- ========================================================================================

-- ========================================================================================
-- DASHBOARD AND OVERVIEW QUERIES
-- ========================================================================================

/**
 * Query: Template Library Overview Statistics
 * Purpose: High-level metrics for dashboard and reporting
 * Usage: Real-time dashboard updates, executive reporting
 */
-- Template Library Overview
WITH template_stats AS (
  SELECT 
    COUNT(*) as total_templates,
    COUNT(*) FILTER (WHERE status = 'published') as published_templates,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_templates_month,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_templates_week,
    AVG(avg_rating) as overall_avg_rating,
    SUM(views) as total_views,
    SUM(download_count) as total_downloads,
    SUM(usage_count) as total_active_usage
  FROM templates
),
category_stats AS (
  SELECT 
    COUNT(*) as total_categories,
    COUNT(*) FILTER (WHERE is_active = true) as active_categories,
    COUNT(*) FILTER (WHERE is_featured = true) as featured_categories
  FROM template_categories
),
user_engagement AS (
  SELECT 
    COUNT(DISTINCT user_id) as active_users_month,
    COUNT(*) as total_events_month,
    COUNT(*) FILTER (WHERE event_type = 'view') as total_views_month,
    COUNT(*) FILTER (WHERE event_type = 'download') as total_downloads_month,
    COUNT(*) FILTER (WHERE event_type = 'deploy') as total_deployments_month
  FROM template_analytics_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
  ts.*,
  cs.*,
  ue.*,
  ROUND((ue.total_downloads_month::DECIMAL / NULLIF(ue.total_views_month, 0)) * 100, 2) as conversion_rate_month,
  ROUND((ue.total_deployments_month::DECIMAL / NULLIF(ue.total_downloads_month, 0)) * 100, 2) as deployment_rate_month
FROM template_stats ts
CROSS JOIN category_stats cs  
CROSS JOIN user_engagement ue;

/**
 * Query: Top Performing Templates
 * Purpose: Identify most successful templates across different metrics
 * Usage: Featured template selection, success pattern analysis
 */
-- Top Templates by Different Metrics
SELECT 
  'Most Downloaded' as metric_type,
  t.id,
  t.name,
  t.author,
  tc.name as category_name,
  t.download_count as metric_value,
  t.avg_rating,
  t.rating_count,
  t.created_at
FROM templates t
LEFT JOIN template_categories tc ON t.category_id = tc.id
WHERE t.status = 'published'
ORDER BY t.download_count DESC
LIMIT 10

UNION ALL

SELECT 
  'Highest Rated' as metric_type,
  t.id,
  t.name,
  t.author,
  tc.name as category_name,
  t.avg_rating as metric_value,
  t.avg_rating,
  t.rating_count,
  t.created_at
FROM templates t
LEFT JOIN template_categories tc ON t.category_id = tc.id
WHERE t.status = 'published' AND t.rating_count >= 5
ORDER BY t.avg_rating DESC, t.rating_count DESC
LIMIT 10

UNION ALL

SELECT 
  'Most Viewed' as metric_type,
  t.id,
  t.name,
  t.author,
  tc.name as category_name,
  t.views as metric_value,
  t.avg_rating,
  t.rating_count,
  t.created_at
FROM templates t
LEFT JOIN template_categories tc ON t.category_id = tc.id
WHERE t.status = 'published'
ORDER BY t.views DESC
LIMIT 10

UNION ALL

SELECT 
  'Most Active Usage' as metric_type,
  t.id,
  t.name,
  t.author,
  tc.name as category_name,
  t.usage_count as metric_value,
  t.avg_rating,
  t.rating_count,
  t.created_at
FROM templates t
LEFT JOIN template_categories tc ON t.category_id = tc.id
WHERE t.status = 'published'
ORDER BY t.usage_count DESC
LIMIT 10;

/**
 * Query: Category Performance Analysis
 * Purpose: Compare performance across template categories
 * Usage: Category optimization, content strategy planning
 */
-- Category Performance Breakdown
SELECT 
  tc.name as category_name,
  tc.slug as category_slug,
  tc.template_count,
  COUNT(t.id) as active_templates,
  
  -- Engagement metrics
  SUM(t.views) as total_views,
  SUM(t.download_count) as total_downloads,
  SUM(t.usage_count) as total_active_usage,
  SUM(t.stars) as total_stars,
  
  -- Average performance per template
  ROUND(AVG(t.views), 2) as avg_views_per_template,
  ROUND(AVG(t.download_count), 2) as avg_downloads_per_template,
  ROUND(AVG(t.usage_count), 2) as avg_usage_per_template,
  ROUND(AVG(t.avg_rating), 2) as avg_rating_per_template,
  
  -- Conversion rates
  ROUND((SUM(t.download_count)::DECIMAL / NULLIF(SUM(t.views), 0)) * 100, 2) as conversion_rate,
  
  -- Quality indicators
  AVG(t.avg_rating) as category_avg_rating,
  SUM(t.rating_count) as total_ratings,
  
  -- Growth indicators (templates created in last 30 days)
  COUNT(*) FILTER (WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days') as new_templates_month

FROM template_categories tc
LEFT JOIN templates t ON tc.id = t.category_id AND t.status = 'published'
WHERE tc.is_active = true
GROUP BY tc.id, tc.name, tc.slug, tc.template_count
ORDER BY total_downloads DESC;

-- ========================================================================================
-- TRENDING AND DISCOVERY QUERIES
-- ========================================================================================

/**
 * Query: Trending Templates Algorithm
 * Purpose: Identify templates gaining popularity for featured promotion
 * Usage: Homepage trending section, recommendation engine
 */
-- Trending Templates (Velocity-based Algorithm)
WITH recent_activity AS (
  SELECT 
    template_id,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as events_week,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as events_month,
    COUNT(*) FILTER (WHERE event_type = 'view' AND created_at >= CURRENT_DATE - INTERVAL '7 days') as views_week,
    COUNT(*) FILTER (WHERE event_type = 'download' AND created_at >= CURRENT_DATE - INTERVAL '7 days') as downloads_week,
    COUNT(*) FILTER (WHERE event_type = 'deploy' AND created_at >= CURRENT_DATE - INTERVAL '7 days') as deploys_week
  FROM template_analytics_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY template_id
),
template_velocity AS (
  SELECT 
    t.id,
    t.name,
    t.author,
    t.views,
    t.download_count,
    t.avg_rating,
    t.rating_count,
    tc.name as category_name,
    
    -- Recent activity
    COALESCE(ra.events_week, 0) as events_week,
    COALESCE(ra.views_week, 0) as views_week,
    COALESCE(ra.downloads_week, 0) as downloads_week,
    COALESCE(ra.deploys_week, 0) as deploys_week,
    
    -- Velocity calculation (weighted recent activity)
    (
      COALESCE(ra.views_week, 0) * 1.0 +
      COALESCE(ra.downloads_week, 0) * 3.0 +
      COALESCE(ra.deploys_week, 0) * 5.0 +
      (t.avg_rating - 3.0) * COALESCE(ra.events_week, 0) * 0.5
    ) as velocity_score,
    
    -- Trend indicators
    CASE 
      WHEN t.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 'new'
      WHEN COALESCE(ra.events_week, 0) > t.views * 0.1 THEN 'hot'
      WHEN COALESCE(ra.events_week, 0) > 0 THEN 'growing'
      ELSE 'stable'
    END as trend_category,
    
    t.created_at
    
  FROM templates t
  LEFT JOIN recent_activity ra ON t.id = ra.template_id
  LEFT JOIN template_categories tc ON t.category_id = tc.id
  WHERE t.status = 'published'
)
SELECT 
  *,
  ROW_NUMBER() OVER (ORDER BY velocity_score DESC) as trend_rank
FROM template_velocity
WHERE velocity_score > 0
ORDER BY velocity_score DESC
LIMIT 20;

/**
 * Query: Template Discovery - Similar Templates
 * Purpose: Find templates similar to a given template for recommendations
 * Usage: Template detail pages, recommendation engine
 */
-- Similar Templates by Category and Tags (parameterized query)
-- Parameters: @template_id (the template to find similar ones for)
WITH target_template AS (
  SELECT 
    t.id,
    t.category_id,
    t.difficulty_level,
    array_agg(tt.name) as tags
  FROM templates t
  LEFT JOIN template_tag_assignments tta ON t.id = tta.template_id
  LEFT JOIN template_tags tt ON tta.tag_id = tt.id
  WHERE t.id = '@template_id' -- Replace with actual template ID
  GROUP BY t.id, t.category_id, t.difficulty_level
),
similarity_scores AS (
  SELECT 
    t.id,
    t.name,
    t.author,
    t.description,
    t.avg_rating,
    t.rating_count,
    t.download_count,
    t.views,
    tc.name as category_name,
    
    -- Similarity scoring
    (
      -- Category match (high weight)
      CASE WHEN t.category_id = target.category_id THEN 10 ELSE 0 END +
      
      -- Difficulty match (medium weight)  
      CASE WHEN t.difficulty_level = target.difficulty_level THEN 3 ELSE 0 END +
      
      -- Tag overlap (variable weight based on number of common tags)
      (
        SELECT COUNT(*) * 2
        FROM unnest(target.tags) as target_tag
        JOIN template_tag_assignments tta ON tta.template_id = t.id
        JOIN template_tags tt ON tta.tag_id = tt.id AND tt.name = target_tag
      ) +
      
      -- Rating similarity (small weight)
      CASE 
        WHEN ABS(t.avg_rating - 4.0) < 0.5 THEN 1 -- Assume target has 4.0 rating
        ELSE 0 
      END
      
    ) as similarity_score
    
  FROM templates t
  LEFT JOIN template_categories tc ON t.category_id = tc.id
  CROSS JOIN target_template target
  WHERE t.id != target.id 
    AND t.status = 'published'
)
SELECT *
FROM similarity_scores
WHERE similarity_score > 0
ORDER BY similarity_score DESC, avg_rating DESC, download_count DESC
LIMIT 10;

-- ========================================================================================
-- USER ENGAGEMENT AND BEHAVIOR QUERIES
-- ========================================================================================

/**
 * Query: User Engagement Funnel Analysis
 * Purpose: Analyze user journey from discovery to deployment
 * Usage: Conversion optimization, user experience improvements
 */
-- User Engagement Funnel
WITH user_sessions AS (
  SELECT 
    session_id,
    user_id,
    COUNT(DISTINCT template_id) as templates_viewed,
    COUNT(*) FILTER (WHERE event_type = 'view') as total_views,
    COUNT(*) FILTER (WHERE event_type = 'download') as total_downloads,
    COUNT(*) FILTER (WHERE event_type = 'deploy') as total_deployments,
    COUNT(*) FILTER (WHERE event_type = 'star') as total_stars,
    MIN(created_at) as session_start,
    MAX(created_at) as session_end,
    MAX(created_at) - MIN(created_at) as session_duration
  FROM template_analytics_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND session_id IS NOT NULL
  GROUP BY session_id, user_id
),
funnel_metrics AS (
  SELECT 
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE total_views > 0) as sessions_with_views,
    COUNT(*) FILTER (WHERE total_downloads > 0) as sessions_with_downloads,
    COUNT(*) FILTER (WHERE total_deployments > 0) as sessions_with_deployments,
    COUNT(*) FILTER (WHERE total_stars > 0) as sessions_with_stars,
    
    AVG(templates_viewed) as avg_templates_per_session,
    AVG(EXTRACT(EPOCH FROM session_duration)) as avg_session_duration_seconds,
    
    -- Conversion rates
    ROUND((COUNT(*) FILTER (WHERE total_downloads > 0)::DECIMAL / COUNT(*)) * 100, 2) as view_to_download_rate,
    ROUND((COUNT(*) FILTER (WHERE total_deployments > 0)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE total_downloads > 0), 0)) * 100, 2) as download_to_deploy_rate,
    ROUND((COUNT(*) FILTER (WHERE total_stars > 0)::DECIMAL / COUNT(*)) * 100, 2) as engagement_rate
    
  FROM user_sessions
)
SELECT * FROM funnel_metrics;

/**
 * Query: User Behavior Patterns
 * Purpose: Understand how different user segments interact with templates
 * Usage: Personalization, user experience optimization
 */
-- User Behavior Segmentation
WITH user_behavior AS (
  SELECT 
    user_id,
    COUNT(DISTINCT template_id) as templates_interacted,
    COUNT(*) FILTER (WHERE event_type = 'view') as total_views,
    COUNT(*) FILTER (WHERE event_type = 'download') as total_downloads,
    COUNT(*) FILTER (WHERE event_type = 'deploy') as total_deployments,
    COUNT(*) FILTER (WHERE deployment_success = true) as successful_deployments,
    COUNT(DISTINCT DATE(created_at)) as active_days,
    MIN(created_at) as first_activity,
    MAX(created_at) as last_activity,
    
    -- Calculate user preferences
    mode() WITHIN GROUP (ORDER BY 
      CASE WHEN event_type = 'download' THEN 
        (SELECT category FROM templates WHERE id = template_id LIMIT 1)
      END
    ) as preferred_category,
    
    -- User classification
    CASE 
      WHEN COUNT(*) FILTER (WHERE event_type = 'download') = 0 THEN 'browser'
      WHEN COUNT(*) FILTER (WHERE event_type = 'deploy') = 0 THEN 'downloader'
      WHEN COUNT(*) FILTER (WHERE deployment_success = true) / NULLIF(COUNT(*) FILTER (WHERE event_type = 'deploy'), 0) > 0.8 THEN 'expert_user'
      ELSE 'regular_user'
    END as user_segment
    
  FROM template_analytics_events
  WHERE user_id IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY user_id
)
SELECT 
  user_segment,
  COUNT(*) as user_count,
  ROUND(AVG(templates_interacted), 2) as avg_templates_per_user,
  ROUND(AVG(total_views), 2) as avg_views_per_user,
  ROUND(AVG(total_downloads), 2) as avg_downloads_per_user,
  ROUND(AVG(total_deployments), 2) as avg_deployments_per_user,
  ROUND(AVG(successful_deployments::DECIMAL / NULLIF(total_deployments, 0)) * 100, 2) as avg_success_rate,
  ROUND(AVG(active_days), 2) as avg_active_days,
  
  -- Most common preferred category per segment
  mode() WITHIN GROUP (ORDER BY preferred_category) as most_common_category
  
FROM user_behavior
GROUP BY user_segment
ORDER BY user_count DESC;

-- ========================================================================================
-- SEARCH AND DISCOVERY ANALYTICS
-- ========================================================================================

/**
 * Query: Search Performance Analysis
 * Purpose: Optimize search functionality and understand user search patterns
 * Usage: Search algorithm improvements, content gap analysis
 */
-- Search Query Performance
SELECT 
  normalized_query,
  COUNT(*) as search_count,
  AVG(total_results) as avg_results_returned,
  AVG(search_time_ms) as avg_search_time_ms,
  
  -- User engagement with results
  COUNT(*) FILTER (WHERE array_length(clicked_results::json->>0, 1) > 0) as searches_with_clicks,
  AVG(highest_clicked_position) as avg_highest_click_position,
  
  -- Success metrics
  ROUND((COUNT(*) FILTER (WHERE session_converted = true)::DECIMAL / COUNT(*)) * 100, 2) as conversion_rate,
  ROUND((COUNT(*) FILTER (WHERE had_results = true)::DECIMAL / COUNT(*)) * 100, 2) as result_success_rate,
  
  -- Query refinement patterns
  COUNT(*) FILTER (WHERE user_refined_search = true) as refined_searches,
  ROUND((COUNT(*) FILTER (WHERE user_refined_search = true)::DECIMAL / COUNT(*)) * 100, 2) as refinement_rate

FROM template_search_queries
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY normalized_query
HAVING COUNT(*) >= 5
ORDER BY search_count DESC
LIMIT 20;

/**
 * Query: Popular Search Terms and Trending Queries
 * Purpose: Identify content opportunities and trending interests
 * Usage: Content strategy, template development priorities
 */
-- Trending Search Terms
WITH search_trends AS (
  SELECT 
    unnest(query_tokens) as search_term,
    COUNT(*) as usage_count,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as usage_week,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as usage_month,
    AVG(total_results) as avg_results,
    ROUND(AVG(CASE WHEN array_length(clicked_results::json->>0, 1) > 0 THEN 1.0 ELSE 0.0 END) * 100, 2) as click_rate
  FROM template_search_queries
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY search_term
  HAVING COUNT(*) >= 3
),
term_growth AS (
  SELECT 
    *,
    CASE 
      WHEN usage_count > 0 THEN 
        ROUND((usage_week::DECIMAL / (usage_month - usage_week + 1)) * 100, 2)
      ELSE 0 
    END as weekly_growth_rate
  FROM search_trends
)
SELECT 
  search_term,
  usage_count,
  usage_week,
  usage_month,
  weekly_growth_rate,
  avg_results,
  click_rate,
  
  -- Categorize trend
  CASE 
    WHEN weekly_growth_rate > 50 THEN 'hot'
    WHEN weekly_growth_rate > 20 THEN 'growing' 
    WHEN usage_week > usage_count * 0.3 THEN 'stable'
    ELSE 'declining'
  END as trend_status

FROM term_growth
ORDER BY weekly_growth_rate DESC, usage_count DESC
LIMIT 25;

-- ========================================================================================
-- QUALITY AND PERFORMANCE MONITORING
-- ========================================================================================

/**
 * Query: Template Quality Assessment
 * Purpose: Identify templates needing attention or improvement
 * Usage: Content moderation, quality improvement initiatives
 */
-- Template Quality Analysis
WITH template_quality_metrics AS (
  SELECT 
    t.id,
    t.name,
    t.author,
    t.created_at,
    t.avg_rating,
    t.rating_count,
    t.download_count,
    t.usage_count,
    t.success_rate,
    tc.name as category_name,
    
    -- Quality indicators
    CASE 
      WHEN t.rating_count >= 10 AND t.avg_rating >= 4.0 THEN 'excellent'
      WHEN t.rating_count >= 5 AND t.avg_rating >= 3.5 THEN 'good'
      WHEN t.rating_count >= 3 AND t.avg_rating >= 3.0 THEN 'average'
      WHEN t.rating_count >= 1 AND t.avg_rating < 3.0 THEN 'poor'
      ELSE 'unrated'
    END as quality_tier,
    
    -- Performance indicators
    CASE
      WHEN t.success_rate >= 0.9 THEN 'high_performance'
      WHEN t.success_rate >= 0.7 THEN 'good_performance'  
      WHEN t.success_rate >= 0.5 THEN 'average_performance'
      WHEN t.usage_count > 0 THEN 'poor_performance'
      ELSE 'unused'
    END as performance_tier,
    
    -- Engagement level
    CASE
      WHEN t.download_count >= 100 THEN 'high_engagement'
      WHEN t.download_count >= 20 THEN 'medium_engagement'
      WHEN t.download_count >= 5 THEN 'low_engagement'
      ELSE 'no_engagement'
    END as engagement_tier,
    
    -- Issues to investigate
    CASE
      WHEN t.rating_count >= 5 AND t.avg_rating < 2.5 THEN 'quality_issues'
      WHEN t.download_count >= 20 AND t.success_rate < 0.3 THEN 'reliability_issues'
      WHEN t.views >= 100 AND t.download_count < 5 THEN 'conversion_issues'
      ELSE 'no_issues'
    END as issue_type
    
  FROM templates t
  LEFT JOIN template_categories tc ON t.category_id = tc.id
  WHERE t.status = 'published'
)
SELECT 
  quality_tier,
  performance_tier,
  engagement_tier,
  issue_type,
  COUNT(*) as template_count,
  ROUND(AVG(avg_rating), 2) as avg_rating_in_tier,
  ROUND(AVG(success_rate), 2) as avg_success_rate_in_tier,
  ROUND(AVG(download_count), 2) as avg_downloads_in_tier

FROM template_quality_metrics
GROUP BY ROLLUP(quality_tier, performance_tier, engagement_tier, issue_type)
ORDER BY quality_tier, performance_tier, engagement_tier, issue_type;

/**
 * Query: Template Performance Over Time
 * Purpose: Track template performance trends and lifecycle patterns
 * Usage: Template lifecycle management, success prediction
 */
-- Template Performance Trends
SELECT 
  DATE_TRUNC('week', tpm.metric_date) as week_start,
  COUNT(DISTINCT tpm.template_id) as active_templates,
  
  -- Engagement trends
  SUM(tpm.view_count) as total_views,
  SUM(tpm.download_count) as total_downloads,  
  SUM(tpm.deployment_count) as total_deployments,
  
  -- Success metrics trends
  ROUND(AVG(tpm.deployment_success_rate), 4) as avg_success_rate,
  ROUND(AVG(tpm.view_to_download_rate), 4) as avg_conversion_rate,
  
  -- Quality trends
  ROUND(AVG(tpm.avg_rating), 2) as avg_rating,
  
  -- Growth indicators
  ROUND(AVG(tpm.velocity_score), 2) as avg_velocity_score

FROM template_performance_metrics tpm
WHERE tpm.metric_period = 'weekly'
  AND tpm.metric_date >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', tpm.metric_date)
ORDER BY week_start DESC;

-- ========================================================================================
-- BUSINESS INTELLIGENCE QUERIES
-- ========================================================================================

/**
 * Query: Revenue and Monetization Analysis (for premium templates)
 * Purpose: Track revenue and identify monetization opportunities
 * Usage: Business strategy, premium template performance
 */
-- Premium Template Performance (placeholder for future premium features)
SELECT 
  t.is_premium,
  COUNT(*) as template_count,
  SUM(t.download_count) as total_downloads,
  AVG(t.avg_rating) as avg_rating,
  AVG(t.success_rate) as avg_success_rate,
  
  -- Engagement comparison
  ROUND(AVG(t.views), 2) as avg_views_per_template,
  ROUND(AVG(t.download_count), 2) as avg_downloads_per_template,
  
  -- Conversion rates
  ROUND((SUM(t.download_count)::DECIMAL / NULLIF(SUM(t.views), 0)) * 100, 2) as conversion_rate

FROM templates t
WHERE t.status = 'published'
GROUP BY t.is_premium
ORDER BY t.is_premium DESC;

/**
 * Query: Author/Creator Performance Analysis
 * Purpose: Identify top contributing authors and their success patterns
 * Usage: Creator recognition, partnership opportunities
 */
-- Top Template Authors
SELECT 
  t.author,
  COUNT(*) as total_templates,
  COUNT(*) FILTER (WHERE t.status = 'published') as published_templates,
  
  -- Engagement metrics
  SUM(t.views) as total_views,
  SUM(t.download_count) as total_downloads,
  SUM(t.usage_count) as total_active_usage,
  SUM(t.stars) as total_stars,
  
  -- Quality metrics
  ROUND(AVG(t.avg_rating), 2) as avg_rating,
  SUM(t.rating_count) as total_ratings,
  ROUND(AVG(t.success_rate), 2) as avg_success_rate,
  
  -- Performance per template
  ROUND(AVG(t.views), 2) as avg_views_per_template,
  ROUND(AVG(t.download_count), 2) as avg_downloads_per_template,
  
  -- Conversion rate
  ROUND((SUM(t.download_count)::DECIMAL / NULLIF(SUM(t.views), 0)) * 100, 2) as conversion_rate,
  
  -- Activity timeline
  MIN(t.created_at) as first_template_date,
  MAX(t.created_at) as latest_template_date,
  COUNT(*) FILTER (WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days') as templates_this_month

FROM templates t
WHERE t.author IS NOT NULL
GROUP BY t.author
HAVING COUNT(*) >= 2
ORDER BY total_downloads DESC, avg_rating DESC
LIMIT 20;

-- ========================================================================================
-- ADVANCED ANALYTICS AND MACHINE LEARNING PREP QUERIES
-- ========================================================================================

/**
 * Query: Template Feature Matrix for ML Models
 * Purpose: Prepare data for machine learning models (success prediction, recommendations)
 * Usage: ML model training, predictive analytics
 */
-- Template Feature Matrix
WITH template_features AS (
  SELECT 
    t.id,
    
    -- Basic features
    EXTRACT(EPOCH FROM (NOW() - t.created_at))/86400 as days_since_creation,
    length(t.name) as title_length,
    length(t.description) as description_length,
    t.difficulty_level,
    COALESCE(t.estimated_setup_time, 30) as setup_time,
    
    -- Category features
    tc.level as category_level,
    tc.template_count as category_popularity,
    
    -- Tag features
    COUNT(tta.tag_id) as tag_count,
    COALESCE(AVG(tt.usage_count), 0) as avg_tag_popularity,
    
    -- Historical performance (target variables)
    t.views,
    t.download_count,
    t.usage_count,
    t.avg_rating,
    t.rating_count,
    t.success_rate,
    
    -- Calculated performance metrics
    CASE WHEN t.views > 0 THEN t.download_count::DECIMAL / t.views ELSE 0 END as conversion_rate,
    CASE WHEN t.download_count > 0 THEN t.usage_count::DECIMAL / t.download_count ELSE 0 END as adoption_rate,
    
    -- Success classification (for supervised learning)
    CASE 
      WHEN t.download_count >= 50 AND t.avg_rating >= 4.0 AND t.success_rate >= 0.8 THEN 'high_success'
      WHEN t.download_count >= 20 AND t.avg_rating >= 3.5 AND t.success_rate >= 0.6 THEN 'medium_success'
      WHEN t.download_count >= 5 THEN 'low_success'
      ELSE 'minimal_success'
    END as success_category
    
  FROM templates t
  LEFT JOIN template_categories tc ON t.category_id = tc.id
  LEFT JOIN template_tag_assignments tta ON t.id = tta.template_id
  LEFT JOIN template_tags tt ON tta.tag_id = tt.id
  WHERE t.status = 'published'
    AND t.created_at <= CURRENT_DATE - INTERVAL '30 days' -- Ensure sufficient data
  GROUP BY t.id, tc.level, tc.template_count
)
SELECT * FROM template_features
ORDER BY download_count DESC;

-- ========================================================================================
-- MAINTENANCE AND MONITORING QUERIES
-- ========================================================================================

/**
 * Query: System Health and Data Quality Checks
 * Purpose: Monitor database health and identify data quality issues
 * Usage: Automated monitoring, data quality assurance
 */
-- Data Quality Health Check
SELECT 
  'Template Data Quality' as check_category,
  
  -- Basic data completeness
  COUNT(*) as total_templates,
  COUNT(*) FILTER (WHERE name IS NULL OR name = '') as missing_names,
  COUNT(*) FILTER (WHERE description IS NULL OR description = '') as missing_descriptions,
  COUNT(*) FILTER (WHERE category_id IS NULL) as missing_categories,
  
  -- Data consistency
  COUNT(*) FILTER (WHERE download_count > views) as download_gt_views,
  COUNT(*) FILTER (WHERE rating_count > 0 AND avg_rating = 0) as rating_inconsistency,
  COUNT(*) FILTER (WHERE usage_count > download_count * 2) as usage_anomaly,
  
  -- Performance indicators
  COUNT(*) FILTER (WHERE search_vector IS NULL) as missing_search_index,
  COUNT(*) FILTER (WHERE updated_at < created_at) as timestamp_inconsistency

FROM templates

UNION ALL

SELECT 
  'Analytics Data Quality' as check_category,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE template_id NOT IN (SELECT id FROM templates)) as orphaned_events,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)) as invalid_users,
  COUNT(*) FILTER (WHERE session_id IS NULL) as missing_sessions,
  COUNT(*) FILTER (WHERE event_type NOT IN ('view', 'download', 'deploy', 'star', 'share')) as invalid_event_types,
  COUNT(*) FILTER (WHERE created_at > NOW()) as future_timestamps,
  0 as unused_1,
  0 as unused_2,
  0 as unused_3

FROM template_analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

/**
 * Query: Performance Monitoring - Slow Queries and Resource Usage
 * Purpose: Identify performance bottlenecks and optimization opportunities
 * Usage: Database performance tuning, resource planning
 */
-- Database Performance Monitoring (requires pg_stat_statements extension)
-- Note: This query requires the pg_stat_statements extension to be enabled
/*
SELECT 
  substring(query, 1, 100) as query_preview,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) as hit_percent
FROM pg_stat_statements 
WHERE query ILIKE '%template%'
ORDER BY mean_time DESC
LIMIT 10;
*/

-- Table size monitoring
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE tablename LIKE 'template%'
ORDER BY size_bytes DESC;

-- ========================================================================================
-- CONCLUSION
-- ========================================================================================

/*
ANALYTICS QUERY USAGE GUIDE:

1. Dashboard Queries:
   - Run template library overview every 15 minutes for real-time dashboards
   - Update top performing templates hourly
   - Refresh category performance daily

2. Trending and Discovery:
   - Calculate trending templates every hour
   - Update similar templates on template view
   - Refresh discovery algorithms daily

3. User Engagement:
   - Process funnel analysis daily for conversion optimization
   - Update user behavior segmentation weekly
   - Monitor engagement patterns continuously

4. Search Analytics:
   - Analyze search performance daily
   - Update trending search terms hourly
   - Monitor search quality continuously

5. Quality Monitoring:
   - Run quality assessment weekly
   - Monitor performance trends daily
   - Check data quality daily

6. Business Intelligence:
   - Generate revenue reports weekly/monthly
   - Analyze author performance monthly
   - Track business metrics continuously

PERFORMANCE NOTES:
- Most queries are optimized for the indexes created in the migration
- Consider materializing frequently-used aggregations for large datasets
- Use query result caching for dashboard queries
- Monitor query performance and adjust indexes as needed

AUTOMATION RECOMMENDATIONS:
- Set up scheduled jobs for metric calculations
- Create alerts for data quality issues
- Automate trending algorithm updates
- Schedule regular performance monitoring
*/