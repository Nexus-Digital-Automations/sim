-- Comprehensive Workflow Wizard Database Schema Extensions
-- Migration: wizard-schema-extensions.sql
-- GDPR Compliant | Production-Ready | Performance Optimized
-- Integration with existing Sim database architecture

-- ============================================================================
-- WIZARD SESSION TRACKING AND STATE MANAGEMENT
-- ============================================================================

/**
 * Wizard Sessions table - tracks all wizard sessions with comprehensive state management
 * Features: Auto-save, session recovery, progress tracking, performance monitoring
 * GDPR: Includes data retention policies and user consent tracking
 */
CREATE TABLE IF NOT EXISTS wizard_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE, -- Client-generated session identifier
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Session metadata
    wizard_type TEXT NOT NULL CHECK (wizard_type IN ('workflow_creation', 'template_setup', 'integration_config', 'automation_builder')),
    flow_version TEXT NOT NULL DEFAULT '1.0', -- Version of wizard flow for A/B testing
    source TEXT, -- How user entered wizard: 'dashboard', 'template_gallery', 'api', etc.
    referrer_url TEXT,
    
    -- State management
    current_step_id TEXT NOT NULL,
    total_steps INTEGER NOT NULL DEFAULT 0,
    completed_steps INTEGER NOT NULL DEFAULT 0,
    progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    session_data JSONB NOT NULL DEFAULT '{}', -- Complete wizard state
    auto_save_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Session lifecycle
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned', 'expired')),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Performance tracking
    estimated_completion_time INTEGER, -- Minutes
    actual_duration INTEGER, -- Minutes from start to completion
    step_durations JSONB DEFAULT '{}', -- Time spent on each step
    
    -- User context
    user_agent TEXT,
    ip_address INET, -- For security and analytics (GDPR compliant)
    timezone TEXT,
    locale TEXT DEFAULT 'en-US',
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    
    -- GDPR compliance
    data_consent_given BOOLEAN NOT NULL DEFAULT false,
    analytics_consent BOOLEAN NOT NULL DEFAULT false,
    data_retention_until TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '2 years'),
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for wizard_sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_sessions_user_workspace ON wizard_sessions(user_id, workspace_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_sessions_status_active ON wizard_sessions(status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_sessions_expires_at ON wizard_sessions(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_sessions_session_id ON wizard_sessions(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_sessions_last_activity ON wizard_sessions(last_activity_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_sessions_wizard_type ON wizard_sessions(wizard_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_sessions_data_retention ON wizard_sessions(data_retention_until) WHERE data_retention_until < NOW();

/**
 * Wizard Step Analytics table - detailed step-by-step tracking for optimization
 * Features: Step completion times, error tracking, user behavior analysis
 */
CREATE TABLE IF NOT EXISTS wizard_step_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    step_name TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    
    -- Step lifecycle
    entered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    exited_at TIMESTAMP,
    duration_seconds INTEGER, -- Calculated duration
    completion_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (completion_status IN ('in_progress', 'completed', 'skipped', 'error', 'abandoned')),
    
    -- Interaction tracking
    field_interactions JSONB DEFAULT '{}', -- Which fields were modified
    validation_errors JSONB DEFAULT '[]', -- Validation errors encountered
    help_accessed BOOLEAN DEFAULT false, -- Whether user accessed help
    retries INTEGER DEFAULT 0, -- Number of retry attempts
    
    -- Data quality
    input_data JSONB DEFAULT '{}', -- Sanitized user inputs for analysis
    output_data JSONB DEFAULT '{}', -- Step outputs
    error_details JSONB DEFAULT '{}', -- Error information if step failed
    
    -- Performance metrics
    render_time_ms INTEGER, -- Time to render step UI
    validation_time_ms INTEGER, -- Time for validation checks
    save_time_ms INTEGER, -- Time to save step data
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for wizard_step_analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_step_analytics_session ON wizard_step_analytics(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_step_analytics_step_completion ON wizard_step_analytics(step_id, completion_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_step_analytics_duration ON wizard_step_analytics(duration_seconds) WHERE duration_seconds IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_step_analytics_created_at ON wizard_step_analytics(created_at);

-- ============================================================================
-- TEMPLATE USAGE ANALYTICS AND RECOMMENDATIONS
-- ============================================================================

/**
 * Template Recommendations table - tracks AI-generated template recommendations
 * Features: ML scoring, A/B testing, recommendation optimization, feedback loops
 */
CREATE TABLE IF NOT EXISTS template_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Recommendation context
    goal_context JSONB NOT NULL, -- User's stated goals and requirements
    user_profile JSONB NOT NULL, -- User behavior, preferences, history
    recommendation_algorithm TEXT NOT NULL DEFAULT 'collaborative_filtering', -- Algorithm used
    algorithm_version TEXT NOT NULL DEFAULT '1.0',
    
    -- Scoring system
    relevance_score NUMERIC(4,3) NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
    popularity_score NUMERIC(4,3) NOT NULL CHECK (popularity_score >= 0 AND popularity_score <= 1),
    success_rate_score NUMERIC(4,3) NOT NULL CHECK (success_rate_score >= 0 AND success_rate_score <= 1),
    complexity_match_score NUMERIC(4,3) NOT NULL CHECK (complexity_match_score >= 0 AND complexity_match_score <= 1),
    integration_compatibility_score NUMERIC(4,3) NOT NULL CHECK (integration_compatibility_score >= 0 AND integration_compatibility_score <= 1),
    final_score NUMERIC(4,3) NOT NULL CHECK (final_score >= 0 AND final_score <= 1),
    
    -- Recommendation ranking
    recommendation_rank INTEGER NOT NULL CHECK (recommendation_rank > 0),
    presentation_position INTEGER, -- Position in UI (1 = first shown)
    recommendation_type TEXT NOT NULL DEFAULT 'primary' CHECK (recommendation_type IN ('primary', 'alternative', 'similar', 'fallback')),
    
    -- User interaction
    viewed BOOLEAN NOT NULL DEFAULT false,
    viewed_at TIMESTAMP,
    clicked BOOLEAN NOT NULL DEFAULT false,
    clicked_at TIMESTAMP,
    selected BOOLEAN NOT NULL DEFAULT false,
    selected_at TIMESTAMP,
    dismissed BOOLEAN NOT NULL DEFAULT false,
    dismissed_at TIMESTAMP,
    dismissal_reason TEXT,
    
    -- A/B testing
    experiment_id TEXT, -- A/B test identifier
    test_variant TEXT, -- A/B test variant
    control_group BOOLEAN DEFAULT false,
    
    -- Performance tracking
    recommendation_generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    recommendation_served_at TIMESTAMP,
    time_to_decision_seconds INTEGER, -- Time from showing to user decision
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for template_recommendations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_recommendations_session ON template_recommendations(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_recommendations_template_selected ON template_recommendations(template_id) WHERE selected = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_recommendations_user_interactions ON template_recommendations(user_id, selected, clicked, viewed);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_recommendations_scoring ON template_recommendations(final_score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_recommendations_ab_testing ON template_recommendations(experiment_id, test_variant) WHERE experiment_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_recommendations_created_at ON template_recommendations(created_at);

/**
 * Template Performance Metrics table - comprehensive template analytics
 * Features: Success rates, completion times, user satisfaction, ROI tracking
 */
CREATE TABLE IF NOT EXISTS template_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflow(id) ON DELETE SET NULL, -- Created workflow
    
    -- Usage context
    goal_category TEXT NOT NULL, -- Business goal category
    industry TEXT, -- User's industry
    use_case TEXT, -- Specific use case
    complexity_level TEXT NOT NULL CHECK (complexity_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    
    -- Implementation metrics
    setup_duration_minutes INTEGER, -- Time to complete setup
    configuration_attempts INTEGER DEFAULT 1, -- Number of setup attempts
    validation_errors_count INTEGER DEFAULT 0, -- Validation errors during setup
    help_requests_count INTEGER DEFAULT 0, -- Times user requested help
    
    -- Success tracking
    implementation_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (implementation_status IN ('in_progress', 'completed', 'failed', 'abandoned')),
    implementation_completed_at TIMESTAMP,
    first_execution_at TIMESTAMP, -- When workflow first ran successfully
    first_execution_success BOOLEAN, -- Whether first execution succeeded
    
    -- Performance outcomes
    workflow_success_rate NUMERIC(4,3), -- Success rate of created workflow (0-1)
    average_execution_time_seconds NUMERIC(10,2), -- Average execution time
    error_rate NUMERIC(4,3), -- Error rate of created workflow (0-1)
    total_executions INTEGER DEFAULT 0, -- Total times workflow has run
    successful_executions INTEGER DEFAULT 0, -- Successful executions
    
    -- User satisfaction
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5), -- 1-5 star rating
    user_feedback TEXT, -- Free-form user feedback
    would_recommend BOOLEAN, -- Would user recommend this template
    satisfaction_survey_data JSONB, -- Detailed survey responses
    
    -- Business impact (where measurable)
    estimated_time_saved_hours NUMERIC(8,2), -- Estimated automation time savings
    estimated_cost_savings_usd NUMERIC(12,2), -- Estimated cost savings
    roi_percentage NUMERIC(8,2), -- Return on investment percentage
    
    -- Quality metrics
    template_modifications_made INTEGER DEFAULT 0, -- How many changes user made
    blocks_added INTEGER DEFAULT 0, -- Additional blocks added
    blocks_removed INTEGER DEFAULT 0, -- Blocks removed from template
    integrations_added INTEGER DEFAULT 0, -- Additional integrations configured
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for template_performance_metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_performance_template_success ON template_performance_metrics(template_id, implementation_status) WHERE implementation_status = 'completed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_performance_user_rating ON template_performance_metrics(user_rating) WHERE user_rating IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_performance_industry_goal ON template_performance_metrics(industry, goal_category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_performance_success_rate ON template_performance_metrics(workflow_success_rate DESC) WHERE workflow_success_rate IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_template_performance_created_at ON template_performance_metrics(created_at);

-- ============================================================================
-- USER PREFERENCES AND WIZARD CUSTOMIZATION
-- ============================================================================

/**
 * User Wizard Preferences table - personalized wizard settings and preferences
 * Features: UI customization, accessibility preferences, behavioral patterns
 * GDPR: User-controlled preference management with data portability
 */
CREATE TABLE IF NOT EXISTS user_wizard_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- UI/UX Preferences
    preferred_theme TEXT NOT NULL DEFAULT 'system' CHECK (preferred_theme IN ('light', 'dark', 'system', 'high-contrast')),
    animation_preferences TEXT NOT NULL DEFAULT 'normal' CHECK (animation_preferences IN ('disabled', 'reduced', 'normal', 'enhanced')),
    step_navigation_style TEXT NOT NULL DEFAULT 'progressive' CHECK (step_navigation_style IN ('progressive', 'tabs', 'sidebar')),
    show_progress_indicator BOOLEAN NOT NULL DEFAULT true,
    show_estimated_time BOOLEAN NOT NULL DEFAULT true,
    show_help_tips BOOLEAN NOT NULL DEFAULT true,
    
    -- Accessibility preferences
    screen_reader_mode BOOLEAN NOT NULL DEFAULT false,
    high_contrast_mode BOOLEAN NOT NULL DEFAULT false,
    large_text_mode BOOLEAN NOT NULL DEFAULT false,
    keyboard_navigation_only BOOLEAN NOT NULL DEFAULT false,
    reduced_motion BOOLEAN NOT NULL DEFAULT false,
    focus_indicators_enhanced BOOLEAN NOT NULL DEFAULT false,
    
    -- Wizard behavior preferences
    auto_save_frequency TEXT NOT NULL DEFAULT 'onchange' CHECK (auto_save_frequency IN ('disabled', 'onchange', 'periodic_30s', 'periodic_60s')),
    skip_intro_screens BOOLEAN NOT NULL DEFAULT false,
    remember_form_data BOOLEAN NOT NULL DEFAULT true,
    show_advanced_options BOOLEAN NOT NULL DEFAULT false,
    enable_keyboard_shortcuts BOOLEAN NOT NULL DEFAULT true,
    confirm_navigation_away BOOLEAN NOT NULL DEFAULT true,
    
    -- Template and recommendation preferences
    preferred_complexity_level TEXT CHECK (preferred_complexity_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    favorite_template_categories TEXT[] DEFAULT '{}', -- Array of preferred categories
    excluded_template_categories TEXT[] DEFAULT '{}', -- Categories to exclude
    preferred_integrations TEXT[] DEFAULT '{}', -- Preferred integration types
    recommendation_algorithm TEXT DEFAULT 'hybrid', -- Preferred recommendation style
    
    -- Learning and onboarding
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    tutorial_progress JSONB DEFAULT '{}', -- Tutorial completion state
    skill_level_self_reported TEXT CHECK (skill_level_self_reported IN ('beginner', 'intermediate', 'advanced', 'expert')),
    preferred_learning_style TEXT CHECK (preferred_learning_style IN ('visual', 'textual', 'hands_on', 'guided')),
    
    -- Notification preferences
    email_wizard_tips BOOLEAN NOT NULL DEFAULT false,
    email_new_templates BOOLEAN NOT NULL DEFAULT false,
    email_completion_reminders BOOLEAN NOT NULL DEFAULT true,
    push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Analytics and privacy
    analytics_consent BOOLEAN NOT NULL DEFAULT false,
    performance_tracking_consent BOOLEAN NOT NULL DEFAULT false,
    personalization_consent BOOLEAN NOT NULL DEFAULT true,
    data_sharing_consent BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    preferences_version TEXT NOT NULL DEFAULT '1.0', -- For schema evolution
    last_preferences_import TIMESTAMP, -- For data portability (GDPR)
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for user_wizard_preferences
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_wizard_preferences_user_id ON user_wizard_preferences(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_wizard_preferences_onboarding ON user_wizard_preferences(onboarding_completed) WHERE onboarding_completed = false;

/**
 * User Wizard History table - comprehensive history of user wizard interactions
 * Features: Completion tracking, pattern analysis, recommendation improvement
 */
CREATE TABLE IF NOT EXISTS user_wizard_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    
    -- Session summary
    wizard_type TEXT NOT NULL,
    completion_status TEXT NOT NULL CHECK (completion_status IN ('completed', 'abandoned', 'failed', 'expired')),
    total_duration_minutes INTEGER NOT NULL,
    steps_completed INTEGER NOT NULL,
    steps_total INTEGER NOT NULL,
    
    -- Goal and outcome
    stated_goal JSONB NOT NULL, -- User's original goal
    selected_template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    created_workflow_id UUID REFERENCES workflow(id) ON DELETE SET NULL,
    outcome_achieved BOOLEAN, -- Whether user achieved their stated goal
    outcome_assessment_date TIMESTAMP, -- When outcome was assessed
    
    -- Behavioral patterns
    navigation_pattern TEXT[], -- Sequence of step navigation (forward/back/skip)
    time_per_step JSONB NOT NULL DEFAULT '{}', -- Time spent on each step
    errors_encountered JSONB DEFAULT '[]', -- Errors user encountered
    help_topics_accessed TEXT[] DEFAULT '{}', -- Help topics user viewed
    
    -- Template interaction
    templates_viewed INTEGER DEFAULT 0, -- Number of templates viewed
    templates_compared INTEGER DEFAULT 0, -- Number of templates compared
    recommendation_click_rate NUMERIC(4,3), -- Percentage of recommendations clicked
    final_template_source TEXT CHECK (final_template_source IN ('recommendation', 'search', 'browse', 'favorite')),
    
    -- Success metrics
    post_wizard_workflow_executions INTEGER DEFAULT 0, -- How many times created workflow ran
    post_wizard_workflow_success_rate NUMERIC(4,3), -- Success rate of created workflow
    user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating >= 1 AND user_satisfaction_rating <= 5),
    
    -- Learning indicators
    complexity_progression TEXT, -- Whether user moved to higher complexity
    skill_demonstration TEXT[], -- Skills user demonstrated
    improvement_areas TEXT[], -- Areas where user struggled
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for user_wizard_history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_wizard_history_user_completion ON user_wizard_history(user_id, completion_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_wizard_history_outcome ON user_wizard_history(outcome_achieved) WHERE outcome_achieved IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_wizard_history_created_at ON user_wizard_history(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_wizard_history_template_success ON user_wizard_history(selected_template_id) WHERE completion_status = 'completed';

-- ============================================================================
-- A/B TESTING DATA AND CONVERSION TRACKING
-- ============================================================================

/**
 * Wizard AB Tests table - manages A/B testing experiments for wizard optimization
 * Features: Multi-variant testing, statistical analysis, automated rollout
 */
CREATE TABLE IF NOT EXISTS wizard_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id TEXT NOT NULL UNIQUE, -- Human-readable test identifier
    test_name TEXT NOT NULL,
    description TEXT NOT NULL,
    hypothesis TEXT, -- What we're testing and why
    
    -- Test configuration
    test_type TEXT NOT NULL CHECK (test_type IN ('ui_variation', 'algorithm_variant', 'flow_change', 'content_test')),
    target_component TEXT NOT NULL, -- Which part of wizard is being tested
    traffic_allocation NUMERIC(4,3) NOT NULL DEFAULT 0.5 CHECK (traffic_allocation > 0 AND traffic_allocation <= 1), -- Percentage of users in test
    
    -- Variants configuration
    control_variant JSONB NOT NULL, -- Control group configuration
    test_variants JSONB NOT NULL, -- Array of test variant configurations
    variant_distribution JSONB NOT NULL, -- Percentage allocation per variant
    
    -- Test lifecycle
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    planned_duration_days INTEGER,
    early_termination_criteria JSONB, -- Conditions for early stopping
    
    -- Success metrics
    primary_metric TEXT NOT NULL, -- Main metric being optimized
    secondary_metrics TEXT[] DEFAULT '{}', -- Additional metrics to track
    success_threshold NUMERIC(8,4), -- Minimum improvement threshold
    confidence_level NUMERIC(4,3) DEFAULT 0.95 CHECK (confidence_level > 0 AND confidence_level < 1),
    
    -- Sample size and power analysis
    minimum_sample_size INTEGER, -- Minimum participants per variant
    expected_effect_size NUMERIC(8,4), -- Expected improvement percentage
    statistical_power NUMERIC(4,3) DEFAULT 0.8 CHECK (statistical_power > 0 AND statistical_power < 1),
    
    -- User targeting
    target_criteria JSONB, -- Who should be included in test
    exclusion_criteria JSONB, -- Who should be excluded
    user_segments TEXT[] DEFAULT '{}', -- Specific user segments to target
    
    -- Results and analysis
    results JSONB, -- Statistical results and analysis
    winner_variant TEXT, -- Winning variant (if test completed)
    statistical_significance BOOLEAN DEFAULT false,
    practical_significance BOOLEAN DEFAULT false,
    rollout_decision TEXT CHECK (rollout_decision IN ('rollout_winner', 'rollout_control', 'extend_test', 'inconclusive')),
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analyst_assigned UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for wizard_ab_tests
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_ab_tests_status_active ON wizard_ab_tests(status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_ab_tests_test_id ON wizard_ab_tests(test_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_ab_tests_date_range ON wizard_ab_tests(start_date, end_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_ab_tests_created_by ON wizard_ab_tests(created_by);

/**
 * Wizard AB Test Participants table - tracks user participation in A/B tests
 * Features: Consistent variant assignment, cross-test analysis, user journey tracking
 */
CREATE TABLE IF NOT EXISTS wizard_ab_test_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id TEXT NOT NULL REFERENCES wizard_ab_tests(test_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    
    -- Assignment details
    variant_assigned TEXT NOT NULL, -- Which variant user was assigned
    assignment_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    assignment_method TEXT NOT NULL DEFAULT 'random' CHECK (assignment_method IN ('random', 'deterministic', 'manual')),
    assignment_hash TEXT, -- Hash for consistent assignment across sessions
    
    -- Participation tracking
    exposure_confirmed BOOLEAN NOT NULL DEFAULT false, -- Whether user actually saw the variant
    exposure_timestamp TIMESTAMP,
    primary_metric_recorded BOOLEAN DEFAULT false,
    conversion_achieved BOOLEAN DEFAULT false,
    conversion_timestamp TIMESTAMP,
    
    -- User context at assignment
    user_segment TEXT, -- User segment at time of assignment
    device_type TEXT, -- Device type when assigned
    geographic_region TEXT, -- User's region
    previous_wizard_experience INTEGER DEFAULT 0, -- Number of previous wizard completions
    
    -- Cross-test tracking
    concurrent_tests TEXT[] DEFAULT '{}', -- Other active tests user is in
    test_interaction_effects JSONB, -- Detected interactions with other tests
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for wizard_ab_test_participants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_ab_test_participants_test_user ON wizard_ab_test_participants(test_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_ab_test_participants_variant ON wizard_ab_test_participants(test_id, variant_assigned);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_ab_test_participants_conversion ON wizard_ab_test_participants(test_id, conversion_achieved);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_ab_test_participants_exposure ON wizard_ab_test_participants(exposure_confirmed) WHERE exposure_confirmed = true;

/**
 * Wizard Conversion Events table - tracks conversion events for A/B testing and analytics
 * Features: Multi-step funnel tracking, attribution modeling, cohort analysis
 */
CREATE TABLE IF NOT EXISTS wizard_conversion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN ('session_start', 'step_complete', 'template_select', 'wizard_complete', 'workflow_create', 'first_execution', 'goal_achieve')),
    event_name TEXT NOT NULL, -- Specific event name for tracking
    step_id TEXT, -- Which wizard step (if applicable)
    
    -- Conversion funnel
    funnel_stage TEXT NOT NULL CHECK (funnel_stage IN ('awareness', 'interest', 'consideration', 'intent', 'evaluation', 'purchase', 'retention')),
    conversion_value NUMERIC(12,2), -- Business value of conversion
    conversion_currency TEXT DEFAULT 'USD',
    
    -- Attribution and context
    traffic_source TEXT, -- How user arrived at wizard
    campaign_id TEXT, -- Marketing campaign identifier
    referrer_domain TEXT,
    landing_page TEXT,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    
    -- A/B testing context
    active_tests JSONB, -- All active A/B tests and variants user was in
    primary_test_id TEXT, -- Primary test being measured for this conversion
    primary_variant TEXT, -- Primary test variant
    
    -- Timing and attribution
    time_to_conversion_seconds INTEGER, -- Time from session start to conversion
    previous_touchpoints INTEGER DEFAULT 0, -- Number of previous interactions
    session_sequence_number INTEGER DEFAULT 1, -- Which session in user's journey
    
    -- Event properties
    event_properties JSONB DEFAULT '{}', -- Custom event properties
    technical_properties JSONB DEFAULT '{}', -- Technical context (browser, device, etc.)
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for wizard_conversion_events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_conversion_events_session_funnel ON wizard_conversion_events(session_id, funnel_stage);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_conversion_events_user_journey ON wizard_conversion_events(user_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_conversion_events_ab_testing ON wizard_conversion_events(primary_test_id, primary_variant) WHERE primary_test_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_conversion_events_event_type ON wizard_conversion_events(event_type, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_conversion_events_template ON wizard_conversion_events(template_id) WHERE template_id IS NOT NULL;

-- ============================================================================
-- PERFORMANCE METRICS AND USAGE PATTERNS
-- ============================================================================

/**
 * Wizard Performance Metrics table - comprehensive performance monitoring
 * Features: Real-time performance tracking, bottleneck identification, optimization insights
 */
CREATE TABLE IF NOT EXISTS wizard_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    
    -- Performance measurement context
    metric_type TEXT NOT NULL CHECK (metric_type IN ('page_load', 'step_render', 'api_response', 'validation', 'save_operation', 'recommendation_generation')),
    component TEXT NOT NULL, -- Which component/step being measured
    operation TEXT, -- Specific operation being measured
    
    -- Timing metrics (all in milliseconds)
    start_time BIGINT NOT NULL, -- Unix timestamp in milliseconds
    end_time BIGINT, -- Unix timestamp in milliseconds
    duration_ms INTEGER, -- Total duration
    
    -- Breakdown timings
    dns_time_ms INTEGER, -- DNS resolution time
    connect_time_ms INTEGER, -- Connection establishment time
    request_time_ms INTEGER, -- Request time
    response_time_ms INTEGER, -- Response time
    render_time_ms INTEGER, -- UI render time
    interaction_delay_ms INTEGER, -- Time until interactive
    
    -- Resource usage
    memory_usage_mb NUMERIC(10,2), -- Memory consumption
    cpu_utilization_percent NUMERIC(5,2), -- CPU usage percentage
    network_bytes_sent BIGINT, -- Bytes sent
    network_bytes_received BIGINT, -- Bytes received
    cache_hit_ratio NUMERIC(4,3), -- Cache hit ratio (0-1)
    
    -- Quality metrics
    error_occurred BOOLEAN NOT NULL DEFAULT false,
    error_type TEXT, -- Type of error if any
    error_details JSONB, -- Error details
    retry_count INTEGER DEFAULT 0,
    success_after_retry BOOLEAN,
    
    -- User experience metrics
    user_abandoned BOOLEAN DEFAULT false, -- Whether user abandoned during this operation
    user_satisfaction_implicit NUMERIC(4,3), -- Inferred satisfaction (0-1)
    frustration_indicators JSONB, -- Signs of user frustration
    
    -- Technical context
    browser_type TEXT,
    browser_version TEXT,
    device_type TEXT,
    connection_type TEXT CHECK (connection_type IN ('ethernet', 'wifi', 'cellular', 'unknown')),
    connection_speed TEXT CHECK (connection_speed IN ('slow-2g', '2g', '3g', '4g', '5g', 'broadband', 'unknown')),
    
    -- Geographic and temporal context
    geographic_region TEXT,
    timezone TEXT,
    server_region TEXT, -- Which server handled the request
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for wizard_performance_metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_performance_metrics_session ON wizard_performance_metrics(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_performance_metrics_type_component ON wizard_performance_metrics(metric_type, component);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_performance_metrics_duration ON wizard_performance_metrics(duration_ms) WHERE duration_ms IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_performance_metrics_errors ON wizard_performance_metrics(error_occurred, error_type) WHERE error_occurred = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_performance_metrics_created_at ON wizard_performance_metrics(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_performance_metrics_connection ON wizard_performance_metrics(connection_type, connection_speed);

/**
 * Wizard Usage Patterns table - analyzes user behavior patterns for optimization
 * Features: Behavioral analysis, pattern recognition, personalization insights
 */
CREATE TABLE IF NOT EXISTS wizard_usage_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Pattern identification
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('navigation', 'timing', 'error', 'abandonment', 'success', 'preference')),
    pattern_name TEXT NOT NULL, -- Specific pattern identified
    pattern_description TEXT,
    pattern_frequency INTEGER NOT NULL DEFAULT 1, -- How often pattern occurs
    
    -- Pattern details
    pattern_data JSONB NOT NULL, -- Detailed pattern information
    confidence_score NUMERIC(4,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1), -- Confidence in pattern identification
    statistical_significance BOOLEAN DEFAULT false,
    
    -- Context and triggers
    trigger_conditions JSONB, -- What conditions trigger this pattern
    environmental_factors JSONB, -- Device, time, context factors
    user_state_factors JSONB, -- User experience level, mood indicators, etc.
    
    -- Pattern evolution
    first_observed_at TIMESTAMP NOT NULL,
    last_observed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    trend_direction TEXT CHECK (trend_direction IN ('increasing', 'decreasing', 'stable', 'cyclical')),
    pattern_stability_score NUMERIC(4,3) CHECK (pattern_stability_score >= 0 AND pattern_stability_score <= 1),
    
    -- Business impact
    positive_outcome BOOLEAN, -- Whether pattern leads to positive outcomes
    impact_on_completion_rate NUMERIC(5,4), -- Impact on wizard completion rate
    impact_on_satisfaction NUMERIC(5,4), -- Impact on user satisfaction
    business_value_impact NUMERIC(12,2), -- Estimated business value impact
    
    -- Recommendations
    recommended_actions JSONB, -- What actions to take based on this pattern
    intervention_opportunities JSONB, -- Where to intervene in user journey
    personalization_suggestions JSONB, -- How to personalize for this pattern
    
    -- Analysis metadata
    analysis_algorithm TEXT NOT NULL, -- Algorithm used to identify pattern
    analysis_date TIMESTAMP NOT NULL DEFAULT NOW(),
    analyst_verified BOOLEAN DEFAULT false, -- Whether human analyst verified pattern
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for wizard_usage_patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_usage_patterns_user_type ON wizard_usage_patterns(user_id, pattern_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_usage_patterns_positive_outcome ON wizard_usage_patterns(positive_outcome) WHERE positive_outcome = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_usage_patterns_business_impact ON wizard_usage_patterns(business_value_impact DESC) WHERE business_value_impact IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_usage_patterns_frequency ON wizard_usage_patterns(pattern_frequency DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_usage_patterns_confidence ON wizard_usage_patterns(confidence_score DESC);

-- ============================================================================
-- DATA RETENTION AND GDPR COMPLIANCE
-- ============================================================================

/**
 * Wizard Data Retention table - manages GDPR-compliant data retention policies
 * Features: Automated cleanup, audit trails, data portability, consent management
 */
CREATE TABLE IF NOT EXISTS wizard_data_retention (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Data categories and retention
    data_category TEXT NOT NULL CHECK (data_category IN ('session_data', 'analytics_data', 'preferences', 'performance_metrics', 'ab_test_data', 'conversion_events')),
    retention_period_days INTEGER NOT NULL, -- Days to retain data
    retention_basis TEXT NOT NULL CHECK (retention_basis IN ('consent', 'legitimate_interest', 'contract', 'legal_obligation', 'public_task', 'vital_interests')),
    
    -- Consent tracking
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMP,
    consent_version TEXT, -- Version of privacy policy when consent given
    consent_method TEXT CHECK (consent_method IN ('explicit', 'implicit', 'opt_out', 'granular')),
    
    -- Data lifecycle
    data_created_at TIMESTAMP NOT NULL,
    scheduled_deletion_at TIMESTAMP NOT NULL,
    actual_deletion_at TIMESTAMP,
    deletion_status TEXT NOT NULL DEFAULT 'pending' CHECK (deletion_status IN ('pending', 'in_progress', 'completed', 'failed', 'postponed')),
    
    -- GDPR rights tracking
    data_export_requested BOOLEAN DEFAULT false,
    data_export_provided_at TIMESTAMP,
    data_rectification_requested BOOLEAN DEFAULT false,
    data_rectification_completed_at TIMESTAMP,
    data_portability_requested BOOLEAN DEFAULT false,
    data_portability_provided_at TIMESTAMP,
    
    -- Audit information
    retention_rule_id TEXT, -- Reference to retention rule that created this record
    legal_hold BOOLEAN DEFAULT false, -- Whether data is under legal hold
    legal_hold_reason TEXT,
    legal_hold_until TIMESTAMP,
    
    -- Processing log
    processing_activities JSONB DEFAULT '[]', -- Log of all processing activities
    last_processing_activity TIMESTAMP,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for wizard_data_retention
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_data_retention_user_category ON wizard_data_retention(user_id, data_category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_data_retention_scheduled_deletion ON wizard_data_retention(scheduled_deletion_at) WHERE deletion_status = 'pending';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_data_retention_legal_hold ON wizard_data_retention(legal_hold) WHERE legal_hold = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_data_retention_consent ON wizard_data_retention(consent_given, consent_date);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION AND MAINTENANCE
-- ============================================================================

-- Create materialized views for common analytics queries
CREATE MATERIALIZED VIEW IF NOT EXISTS wizard_daily_metrics AS
SELECT 
    DATE(created_at) as metric_date,
    wizard_type,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
    COUNT(*) FILTER (WHERE status = 'abandoned') as abandoned_sessions,
    ROUND(AVG(progress_percentage), 2) as avg_progress_percentage,
    ROUND(AVG(actual_duration), 2) as avg_duration_minutes,
    COUNT(DISTINCT user_id) as unique_users
FROM wizard_sessions 
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at), wizard_type;

CREATE UNIQUE INDEX ON wizard_daily_metrics (metric_date, wizard_type);

-- Create materialized view for template performance
CREATE MATERIALIZED VIEW IF NOT EXISTS template_performance_summary AS
SELECT 
    t.id as template_id,
    t.name as template_name,
    COUNT(tpm.*) as total_uses,
    COUNT(*) FILTER (WHERE tpm.implementation_status = 'completed') as successful_implementations,
    ROUND(AVG(tpm.user_rating), 2) as avg_rating,
    ROUND(AVG(tpm.setup_duration_minutes), 2) as avg_setup_time,
    ROUND(AVG(tpm.workflow_success_rate), 3) as avg_workflow_success_rate,
    COUNT(*) FILTER (WHERE tpm.would_recommend = true) * 100.0 / NULLIF(COUNT(*) FILTER (WHERE tpm.would_recommend IS NOT NULL), 0) as recommendation_rate
FROM templates t
LEFT JOIN template_performance_metrics tpm ON t.id = tpm.template_id
WHERE tpm.created_at >= CURRENT_DATE - INTERVAL '30 days' OR tpm.created_at IS NULL
GROUP BY t.id, t.name;

CREATE UNIQUE INDEX ON template_performance_summary (template_id);

-- Data cleanup function for GDPR compliance
CREATE OR REPLACE FUNCTION cleanup_expired_wizard_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete expired wizard sessions and cascade to related data
    WITH deleted AS (
        DELETE FROM wizard_sessions 
        WHERE expires_at < NOW()
        OR (data_retention_until < NOW() AND data_consent_given = false)
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY wizard_daily_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY template_performance_summary;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Performance monitoring function
CREATE OR REPLACE FUNCTION get_wizard_performance_insights(
    time_range_days INTEGER DEFAULT 7
)
RETURNS TABLE(
    insight_type TEXT,
    metric_name TEXT,
    current_value NUMERIC,
    previous_value NUMERIC,
    change_percentage NUMERIC,
    trend TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH current_metrics AS (
        SELECT 
            'completion_rate' as metric,
            COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as value
        FROM wizard_sessions 
        WHERE created_at >= CURRENT_DATE - INTERVAL '%s days' 
            AND created_at < CURRENT_DATE
    ),
    previous_metrics AS (
        SELECT 
            'completion_rate' as metric,
            COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as value
        FROM wizard_sessions 
        WHERE created_at >= CURRENT_DATE - INTERVAL '%s days' - INTERVAL '%s days'
            AND created_at < CURRENT_DATE - INTERVAL '%s days'
    )
    SELECT 
        'performance'::TEXT as insight_type,
        cm.metric::TEXT as metric_name,
        cm.value as current_value,
        pm.value as previous_value,
        CASE 
            WHEN pm.value > 0 THEN ROUND((cm.value - pm.value) / pm.value * 100, 2)
            ELSE 0
        END as change_percentage,
        CASE 
            WHEN cm.value > pm.value THEN 'improving'
            WHEN cm.value < pm.value THEN 'declining'
            ELSE 'stable'
        END as trend,
        CASE 
            WHEN cm.value > pm.value THEN 'Performance is improving - continue current strategies'
            WHEN cm.value < pm.value THEN 'Performance is declining - investigate bottlenecks'
            ELSE 'Performance is stable - consider optimization experiments'
        END as recommendation
    FROM current_metrics cm
    JOIN previous_metrics pm ON cm.metric = pm.metric;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECURITY AND ACCESS CONTROL
-- ============================================================================

-- Row Level Security (RLS) policies
ALTER TABLE wizard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wizard_step_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wizard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wizard_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wizard_conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wizard_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE wizard_usage_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wizard_data_retention ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY wizard_sessions_user_access ON wizard_sessions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_wizard_preferences_access ON user_wizard_preferences
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_wizard_history_access ON user_wizard_history
    FOR ALL USING (user_id = auth.uid());

-- Workspace members can access workspace data (through workspace permissions)
CREATE POLICY wizard_sessions_workspace_access ON wizard_sessions
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Admins can access all data (implement based on your role system)
-- CREATE POLICY wizard_admin_access ON wizard_sessions
--     FOR ALL USING (auth.has_role('admin'));

-- ============================================================================
-- TRIGGERS FOR AUTOMATED MAINTENANCE
-- ============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
CREATE TRIGGER update_wizard_sessions_updated_at 
    BEFORE UPDATE ON wizard_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_performance_metrics_updated_at 
    BEFORE UPDATE ON template_performance_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_wizard_preferences_updated_at 
    BEFORE UPDATE ON user_wizard_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wizard_ab_tests_updated_at 
    BEFORE UPDATE ON wizard_ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wizard_usage_patterns_updated_at 
    BEFORE UPDATE ON wizard_usage_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wizard_data_retention_updated_at 
    BEFORE UPDATE ON wizard_data_retention
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update last_activity_at on wizard_sessions
CREATE OR REPLACE FUNCTION update_wizard_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wizard_session_activity_trigger
    BEFORE UPDATE ON wizard_sessions
    FOR EACH ROW EXECUTE FUNCTION update_wizard_session_activity();

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

-- Table comments
COMMENT ON TABLE wizard_sessions IS 'Tracks wizard sessions with comprehensive state management and GDPR compliance';
COMMENT ON TABLE wizard_step_analytics IS 'Detailed step-by-step analytics for wizard optimization and user behavior analysis';
COMMENT ON TABLE template_recommendations IS 'AI-generated template recommendations with ML scoring and A/B testing';
COMMENT ON TABLE template_performance_metrics IS 'Comprehensive template performance tracking and success metrics';
COMMENT ON TABLE user_wizard_preferences IS 'User-controlled preferences for wizard customization and accessibility';
COMMENT ON TABLE user_wizard_history IS 'Historical record of user wizard interactions for pattern analysis';
COMMENT ON TABLE wizard_ab_tests IS 'A/B testing framework for wizard optimization and conversion improvement';
COMMENT ON TABLE wizard_ab_test_participants IS 'Tracks user participation in A/B tests with consistent variant assignment';
COMMENT ON TABLE wizard_conversion_events IS 'Conversion tracking for funnel analysis and attribution modeling';
COMMENT ON TABLE wizard_performance_metrics IS 'Real-time performance monitoring and bottleneck identification';
COMMENT ON TABLE wizard_usage_patterns IS 'Machine learning-powered behavioral pattern analysis';
COMMENT ON TABLE wizard_data_retention IS 'GDPR-compliant data retention and user rights management';

-- Critical column comments
COMMENT ON COLUMN wizard_sessions.session_data IS 'Complete wizard state stored as JSONB for recovery and analysis';
COMMENT ON COLUMN wizard_sessions.data_consent_given IS 'GDPR consent for data processing and analytics';
COMMENT ON COLUMN wizard_sessions.data_retention_until IS 'GDPR retention deadline - data must be deleted after this date';
COMMENT ON COLUMN template_recommendations.final_score IS 'ML-generated composite score from multiple recommendation algorithms';
COMMENT ON COLUMN wizard_ab_tests.confidence_level IS 'Statistical confidence level required for test conclusion (e.g., 0.95 for 95%)';
COMMENT ON COLUMN wizard_performance_metrics.frustration_indicators IS 'Behavioral signs of user frustration (rapid clicks, back navigation, etc.)';

-- ============================================================================
-- PERFORMANCE MAINTENANCE SCHEDULE
-- ============================================================================

-- Schedule regular maintenance (implement with your job scheduler)
-- Example cron jobs or scheduled tasks:

-- Daily: Clean up expired data (GDPR compliance)
-- SELECT cleanup_expired_wizard_data();

-- Weekly: Refresh materialized views
-- REFRESH MATERIALIZED VIEW CONCURRENTLY wizard_daily_metrics;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY template_performance_summary;

-- Monthly: Update table statistics
-- ANALYZE wizard_sessions;
-- ANALYZE template_performance_metrics;
-- ANALYZE wizard_conversion_events;

-- Quarterly: Review and optimize indexes based on query patterns
-- Run query analysis and index optimization

-- ============================================================================
-- SCHEMA VERSION TRACKING
-- ============================================================================

INSERT INTO schema_versions (version, description, applied_at) VALUES 
('wizard_1.0.0', 'Comprehensive Workflow Wizard Database Schema Extensions', NOW())
ON CONFLICT DO NOTHING;