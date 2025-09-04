-- Migration: 0085_comprehensive_wizard_system.sql
-- Comprehensive Workflow Wizard Database Schema Extensions
-- GDPR Compliant | Production-Ready | Performance Optimized
-- Integration with existing Sim database architecture

-- ============================================================================
-- ENUMS - Define all enumeration types first
-- ============================================================================

DO $$ BEGIN
    -- Wizard session status enum
    CREATE TYPE "wizard_session_status" AS ENUM(
        'active',
        'paused', 
        'completed',
        'abandoned',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Wizard type enum
    CREATE TYPE "wizard_type" AS ENUM(
        'workflow_creation',
        'template_setup',
        'integration_config',
        'automation_builder'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Device type enum
    CREATE TYPE "device_type" AS ENUM(
        'desktop',
        'mobile',
        'tablet'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Step completion status enum
    CREATE TYPE "step_completion_status" AS ENUM(
        'in_progress',
        'completed',
        'skipped',
        'error',
        'abandoned'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Recommendation type enum
    CREATE TYPE "recommendation_type" AS ENUM(
        'primary',
        'alternative', 
        'similar',
        'fallback'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Implementation status enum
    CREATE TYPE "implementation_status" AS ENUM(
        'in_progress',
        'completed',
        'failed',
        'abandoned'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Complexity level enum
    CREATE TYPE "complexity_level" AS ENUM(
        'beginner',
        'intermediate', 
        'advanced',
        'expert'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Theme preference enum
    CREATE TYPE "theme_preference" AS ENUM(
        'light',
        'dark',
        'system',
        'high-contrast'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Animation preference enum
    CREATE TYPE "animation_preference" AS ENUM(
        'disabled',
        'reduced',
        'normal',
        'enhanced'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Navigation style enum
    CREATE TYPE "navigation_style" AS ENUM(
        'progressive',
        'tabs',
        'sidebar'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Auto-save frequency enum
    CREATE TYPE "auto_save_frequency" AS ENUM(
        'disabled',
        'onchange',
        'periodic_30s',
        'periodic_60s'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Learning style enum
    CREATE TYPE "learning_style" AS ENUM(
        'visual',
        'textual',
        'hands_on',
        'guided'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- History completion status enum
    CREATE TYPE "history_completion_status" AS ENUM(
        'completed',
        'abandoned',
        'failed',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Template source enum
    CREATE TYPE "template_source" AS ENUM(
        'recommendation',
        'search',
        'browse',
        'favorite'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CORE WIZARD TABLES
-- ============================================================================

/**
 * Wizard Sessions table - comprehensive wizard session tracking
 */
CREATE TABLE IF NOT EXISTS "wizard_sessions" (
    "id" TEXT PRIMARY KEY,
    "session_id" TEXT NOT NULL UNIQUE,
    "user_id" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "workspace_id" TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Session metadata
    "wizard_type" "wizard_type" NOT NULL,
    "flow_version" TEXT NOT NULL DEFAULT '1.0',
    "source" TEXT,
    "referrer_url" TEXT,
    
    -- State management
    "current_step_id" TEXT NOT NULL,
    "total_steps" INTEGER NOT NULL DEFAULT 0,
    "completed_steps" INTEGER NOT NULL DEFAULT 0,
    "progress_percentage" NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    "session_data" JSONB NOT NULL DEFAULT '{}',
    "auto_save_enabled" BOOLEAN NOT NULL DEFAULT true,
    
    -- Session lifecycle
    "status" "wizard_session_status" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "last_activity_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "completed_at" TIMESTAMP,
    "expires_at" TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Performance tracking
    "estimated_completion_time" INTEGER,
    "actual_duration" INTEGER,
    "step_durations" JSONB DEFAULT '{}',
    
    -- User context
    "user_agent" TEXT,
    "ip_address" TEXT,
    "timezone" TEXT,
    "locale" TEXT DEFAULT 'en-US',
    "device_type" "device_type",
    
    -- GDPR compliance
    "data_consent_given" BOOLEAN NOT NULL DEFAULT false,
    "analytics_consent" BOOLEAN NOT NULL DEFAULT false,
    "data_retention_until" TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '2 years'),
    
    -- Audit fields
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wizard Sessions Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_sessions_user_workspace_idx" ON "wizard_sessions"("user_id", "workspace_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_sessions_status_active_idx" ON "wizard_sessions"("status") WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_sessions_expires_at_idx" ON "wizard_sessions"("expires_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_sessions_session_id_idx" ON "wizard_sessions"("session_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_sessions_last_activity_idx" ON "wizard_sessions"("last_activity_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_sessions_wizard_type_idx" ON "wizard_sessions"("wizard_type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_sessions_data_retention_idx" ON "wizard_sessions"("data_retention_until") WHERE data_retention_until < NOW();

/**
 * Wizard Step Analytics table - detailed step-by-step tracking
 */
CREATE TABLE IF NOT EXISTS "wizard_step_analytics" (
    "id" TEXT PRIMARY KEY,
    "session_id" TEXT NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    "step_id" TEXT NOT NULL,
    "step_name" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    
    -- Step lifecycle
    "entered_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "exited_at" TIMESTAMP,
    "duration_seconds" INTEGER,
    "completion_status" "step_completion_status" NOT NULL DEFAULT 'in_progress',
    
    -- Interaction tracking
    "field_interactions" JSONB DEFAULT '{}',
    "validation_errors" JSONB DEFAULT '[]',
    "help_accessed" BOOLEAN DEFAULT false,
    "retries" INTEGER DEFAULT 0,
    
    -- Data quality
    "input_data" JSONB DEFAULT '{}',
    "output_data" JSONB DEFAULT '{}',
    "error_details" JSONB DEFAULT '{}',
    
    -- Performance metrics
    "render_time_ms" INTEGER,
    "validation_time_ms" INTEGER,
    "save_time_ms" INTEGER,
    
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wizard Step Analytics Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_step_analytics_session_idx" ON "wizard_step_analytics"("session_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_step_analytics_step_completion_idx" ON "wizard_step_analytics"("step_id", "completion_status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_step_analytics_duration_idx" ON "wizard_step_analytics"("duration_seconds") WHERE duration_seconds IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_step_analytics_created_at_idx" ON "wizard_step_analytics"("created_at");

-- ============================================================================
-- TEMPLATE RECOMMENDATION SYSTEM
-- ============================================================================

/**
 * Template Recommendations table - AI-generated recommendations tracking
 */
CREATE TABLE IF NOT EXISTS "template_recommendations" (
    "id" TEXT PRIMARY KEY,
    "session_id" TEXT NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    "template_id" TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    "user_id" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Recommendation context
    "goal_context" JSONB NOT NULL,
    "user_profile" JSONB NOT NULL,
    "recommendation_algorithm" TEXT NOT NULL DEFAULT 'collaborative_filtering',
    "algorithm_version" TEXT NOT NULL DEFAULT '1.0',
    
    -- Scoring system
    "relevance_score" NUMERIC(4,3) NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
    "popularity_score" NUMERIC(4,3) NOT NULL CHECK (popularity_score >= 0 AND popularity_score <= 1),
    "success_rate_score" NUMERIC(4,3) NOT NULL CHECK (success_rate_score >= 0 AND success_rate_score <= 1),
    "complexity_match_score" NUMERIC(4,3) NOT NULL CHECK (complexity_match_score >= 0 AND complexity_match_score <= 1),
    "integration_compatibility_score" NUMERIC(4,3) NOT NULL CHECK (integration_compatibility_score >= 0 AND integration_compatibility_score <= 1),
    "final_score" NUMERIC(4,3) NOT NULL CHECK (final_score >= 0 AND final_score <= 1),
    
    -- Recommendation ranking
    "recommendation_rank" INTEGER NOT NULL CHECK (recommendation_rank > 0),
    "presentation_position" INTEGER,
    "recommendation_type" "recommendation_type" NOT NULL DEFAULT 'primary',
    
    -- User interaction
    "viewed" BOOLEAN NOT NULL DEFAULT false,
    "viewed_at" TIMESTAMP,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "clicked_at" TIMESTAMP,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "selected_at" TIMESTAMP,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissed_at" TIMESTAMP,
    "dismissal_reason" TEXT,
    
    -- A/B testing
    "experiment_id" TEXT,
    "test_variant" TEXT,
    "control_group" BOOLEAN DEFAULT false,
    
    -- Performance tracking
    "recommendation_generated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "recommendation_served_at" TIMESTAMP,
    "time_to_decision_seconds" INTEGER,
    
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Template Recommendations Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "template_recommendations_session_idx" ON "template_recommendations"("session_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "template_recommendations_template_selected_idx" ON "template_recommendations"("template_id") WHERE selected = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "template_recommendations_user_interactions_idx" ON "template_recommendations"("user_id", "selected", "clicked", "viewed");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "template_recommendations_scoring_idx" ON "template_recommendations"("final_score" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "template_recommendations_ab_testing_idx" ON "template_recommendations"("experiment_id", "test_variant") WHERE experiment_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "template_recommendations_created_at_idx" ON "template_recommendations"("created_at");

/**
 * Template Performance Metrics table - comprehensive template analytics
 */
CREATE TABLE IF NOT EXISTS "template_performance_metrics" (
    "id" TEXT PRIMARY KEY,
    "template_id" TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    "user_id" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "workspace_id" TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    "workflow_id" TEXT REFERENCES workflow(id) ON DELETE SET NULL,
    
    -- Usage context
    "goal_category" TEXT NOT NULL,
    "industry" TEXT,
    "use_case" TEXT,
    "complexity_level" "complexity_level" NOT NULL,
    
    -- Implementation metrics
    "setup_duration_minutes" INTEGER,
    "configuration_attempts" INTEGER DEFAULT 1,
    "validation_errors_count" INTEGER DEFAULT 0,
    "help_requests_count" INTEGER DEFAULT 0,
    
    -- Success tracking
    "implementation_status" "implementation_status" NOT NULL DEFAULT 'in_progress',
    "implementation_completed_at" TIMESTAMP,
    "first_execution_at" TIMESTAMP,
    "first_execution_success" BOOLEAN,
    
    -- Performance outcomes
    "workflow_success_rate" NUMERIC(4,3) CHECK (workflow_success_rate >= 0 AND workflow_success_rate <= 1),
    "average_execution_time_seconds" NUMERIC(10,2),
    "error_rate" NUMERIC(4,3) CHECK (error_rate >= 0 AND error_rate <= 1),
    "total_executions" INTEGER DEFAULT 0,
    "successful_executions" INTEGER DEFAULT 0,
    
    -- User satisfaction
    "user_rating" INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    "user_feedback" TEXT,
    "would_recommend" BOOLEAN,
    "satisfaction_survey_data" JSONB,
    
    -- Business impact
    "estimated_time_saved_hours" NUMERIC(8,2),
    "estimated_cost_savings_usd" NUMERIC(12,2),
    "roi_percentage" NUMERIC(8,2),
    
    -- Quality metrics
    "template_modifications_made" INTEGER DEFAULT 0,
    "blocks_added" INTEGER DEFAULT 0,
    "blocks_removed" INTEGER DEFAULT 0,
    "integrations_added" INTEGER DEFAULT 0,
    
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Template Performance Metrics Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "template_performance_template_success_idx" ON "template_performance_metrics"("template_id", "implementation_status") WHERE implementation_status = 'completed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "template_performance_user_rating_idx" ON "template_performance_metrics"("user_rating") WHERE user_rating IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "template_performance_industry_goal_idx" ON "template_performance_metrics"("industry", "goal_category");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "template_performance_success_rate_idx" ON "template_performance_metrics"("workflow_success_rate" DESC) WHERE workflow_success_rate IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "template_performance_created_at_idx" ON "template_performance_metrics"("created_at");

-- ============================================================================
-- USER PREFERENCES AND CUSTOMIZATION
-- ============================================================================

/**
 * User Wizard Preferences table - personalized wizard settings
 */
CREATE TABLE IF NOT EXISTS "user_wizard_preferences" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- UI/UX Preferences
    "preferred_theme" "theme_preference" NOT NULL DEFAULT 'system',
    "animation_preferences" "animation_preference" NOT NULL DEFAULT 'normal',
    "step_navigation_style" "navigation_style" NOT NULL DEFAULT 'progressive',
    "show_progress_indicator" BOOLEAN NOT NULL DEFAULT true,
    "show_estimated_time" BOOLEAN NOT NULL DEFAULT true,
    "show_help_tips" BOOLEAN NOT NULL DEFAULT true,
    
    -- Accessibility preferences
    "screen_reader_mode" BOOLEAN NOT NULL DEFAULT false,
    "high_contrast_mode" BOOLEAN NOT NULL DEFAULT false,
    "large_text_mode" BOOLEAN NOT NULL DEFAULT false,
    "keyboard_navigation_only" BOOLEAN NOT NULL DEFAULT false,
    "reduced_motion" BOOLEAN NOT NULL DEFAULT false,
    "focus_indicators_enhanced" BOOLEAN NOT NULL DEFAULT false,
    
    -- Wizard behavior preferences
    "auto_save_frequency" "auto_save_frequency" NOT NULL DEFAULT 'onchange',
    "skip_intro_screens" BOOLEAN NOT NULL DEFAULT false,
    "remember_form_data" BOOLEAN NOT NULL DEFAULT true,
    "show_advanced_options" BOOLEAN NOT NULL DEFAULT false,
    "enable_keyboard_shortcuts" BOOLEAN NOT NULL DEFAULT true,
    "confirm_navigation_away" BOOLEAN NOT NULL DEFAULT true,
    
    -- Template and recommendation preferences
    "preferred_complexity_level" "complexity_level",
    "favorite_template_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excluded_template_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_integrations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendation_algorithm" TEXT DEFAULT 'hybrid',
    
    -- Learning and onboarding
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "tutorial_progress" JSONB DEFAULT '{}',
    "skill_level_self_reported" "complexity_level",
    "preferred_learning_style" "learning_style",
    
    -- Notification preferences
    "email_wizard_tips" BOOLEAN NOT NULL DEFAULT false,
    "email_new_templates" BOOLEAN NOT NULL DEFAULT false,
    "email_completion_reminders" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    
    -- Analytics and privacy
    "analytics_consent" BOOLEAN NOT NULL DEFAULT false,
    "performance_tracking_consent" BOOLEAN NOT NULL DEFAULT false,
    "personalization_consent" BOOLEAN NOT NULL DEFAULT true,
    "data_sharing_consent" BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    "preferences_version" TEXT NOT NULL DEFAULT '1.0',
    "last_preferences_import" TIMESTAMP,
    
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User Wizard Preferences Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_wizard_preferences_user_id_idx" ON "user_wizard_preferences"("user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_wizard_preferences_onboarding_idx" ON "user_wizard_preferences"("onboarding_completed") WHERE onboarding_completed = false;

/**
 * User Wizard History table - comprehensive interaction history
 */
CREATE TABLE IF NOT EXISTS "user_wizard_history" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "session_id" TEXT NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    
    -- Session summary
    "wizard_type" "wizard_type" NOT NULL,
    "completion_status" "history_completion_status" NOT NULL,
    "total_duration_minutes" INTEGER NOT NULL,
    "steps_completed" INTEGER NOT NULL,
    "steps_total" INTEGER NOT NULL,
    
    -- Goal and outcome
    "stated_goal" JSONB NOT NULL,
    "selected_template_id" TEXT REFERENCES templates(id) ON DELETE SET NULL,
    "created_workflow_id" TEXT REFERENCES workflow(id) ON DELETE SET NULL,
    "outcome_achieved" BOOLEAN,
    "outcome_assessment_date" TIMESTAMP,
    
    -- Behavioral patterns
    "navigation_pattern" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "time_per_step" JSONB NOT NULL DEFAULT '{}',
    "errors_encountered" JSONB DEFAULT '[]',
    "help_topics_accessed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Template interaction
    "templates_viewed" INTEGER DEFAULT 0,
    "templates_compared" INTEGER DEFAULT 0,
    "recommendation_click_rate" NUMERIC(4,3) CHECK (recommendation_click_rate >= 0 AND recommendation_click_rate <= 1),
    "final_template_source" "template_source",
    
    -- Success metrics
    "post_wizard_workflow_executions" INTEGER DEFAULT 0,
    "post_wizard_workflow_success_rate" NUMERIC(4,3) CHECK (post_wizard_workflow_success_rate >= 0 AND post_wizard_workflow_success_rate <= 1),
    "user_satisfaction_rating" INTEGER CHECK (user_satisfaction_rating >= 1 AND user_satisfaction_rating <= 5),
    
    -- Learning indicators
    "complexity_progression" TEXT,
    "skill_demonstration" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "improvement_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User Wizard History Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_wizard_history_user_completion_idx" ON "user_wizard_history"("user_id", "completion_status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_wizard_history_outcome_idx" ON "user_wizard_history"("outcome_achieved") WHERE outcome_achieved IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_wizard_history_created_at_idx" ON "user_wizard_history"("created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_wizard_history_template_success_idx" ON "user_wizard_history"("selected_template_id") WHERE completion_status = 'completed';

-- ============================================================================
-- A/B TESTING FRAMEWORK
-- ============================================================================

/**
 * Wizard AB Tests table - manages A/B testing experiments
 */
CREATE TABLE IF NOT EXISTS "wizard_ab_tests" (
    "id" TEXT PRIMARY KEY,
    "test_id" TEXT NOT NULL UNIQUE,
    "test_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hypothesis" TEXT,
    
    -- Test configuration
    "test_type" TEXT NOT NULL CHECK (test_type IN ('ui_variation', 'algorithm_variant', 'flow_change', 'content_test')),
    "target_component" TEXT NOT NULL,
    "traffic_allocation" NUMERIC(4,3) NOT NULL DEFAULT 0.5 CHECK (traffic_allocation > 0 AND traffic_allocation <= 1),
    
    -- Variants configuration
    "control_variant" JSONB NOT NULL,
    "test_variants" JSONB NOT NULL,
    "variant_distribution" JSONB NOT NULL,
    
    -- Test lifecycle
    "status" TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    "start_date" TIMESTAMP,
    "end_date" TIMESTAMP,
    "planned_duration_days" INTEGER,
    "early_termination_criteria" JSONB,
    
    -- Success metrics
    "primary_metric" TEXT NOT NULL,
    "secondary_metrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "success_threshold" NUMERIC(8,4),
    "confidence_level" NUMERIC(4,3) DEFAULT 0.95 CHECK (confidence_level > 0 AND confidence_level < 1),
    
    -- Sample size and power analysis
    "minimum_sample_size" INTEGER,
    "expected_effect_size" NUMERIC(8,4),
    "statistical_power" NUMERIC(4,3) DEFAULT 0.8 CHECK (statistical_power > 0 AND statistical_power < 1),
    
    -- User targeting
    "target_criteria" JSONB,
    "exclusion_criteria" JSONB,
    "user_segments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Results and analysis
    "results" JSONB,
    "winner_variant" TEXT,
    "statistical_significance" BOOLEAN DEFAULT false,
    "practical_significance" BOOLEAN DEFAULT false,
    "rollout_decision" TEXT CHECK (rollout_decision IN ('rollout_winner', 'rollout_control', 'extend_test', 'inconclusive')),
    
    -- Metadata
    "created_by" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "analyst_assigned" TEXT REFERENCES users(id) ON DELETE SET NULL,
    
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wizard AB Tests Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_ab_tests_status_active_idx" ON "wizard_ab_tests"("status") WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_ab_tests_test_id_idx" ON "wizard_ab_tests"("test_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_ab_tests_date_range_idx" ON "wizard_ab_tests"("start_date", "end_date");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_ab_tests_created_by_idx" ON "wizard_ab_tests"("created_by");

/**
 * Wizard AB Test Participants table - tracks user participation
 */
CREATE TABLE IF NOT EXISTS "wizard_ab_test_participants" (
    "id" TEXT PRIMARY KEY,
    "test_id" TEXT NOT NULL REFERENCES wizard_ab_tests(test_id) ON DELETE CASCADE,
    "user_id" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "session_id" TEXT NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    
    -- Assignment details
    "variant_assigned" TEXT NOT NULL,
    "assignment_timestamp" TIMESTAMP NOT NULL DEFAULT NOW(),
    "assignment_method" TEXT NOT NULL DEFAULT 'random' CHECK (assignment_method IN ('random', 'deterministic', 'manual')),
    "assignment_hash" TEXT,
    
    -- Participation tracking
    "exposure_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "exposure_timestamp" TIMESTAMP,
    "primary_metric_recorded" BOOLEAN DEFAULT false,
    "conversion_achieved" BOOLEAN DEFAULT false,
    "conversion_timestamp" TIMESTAMP,
    
    -- User context at assignment
    "user_segment" TEXT,
    "device_type" TEXT,
    "geographic_region" TEXT,
    "previous_wizard_experience" INTEGER DEFAULT 0,
    
    -- Cross-test tracking
    "concurrent_tests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "test_interaction_effects" JSONB,
    
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wizard AB Test Participants Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_ab_test_participants_test_user_idx" ON "wizard_ab_test_participants"("test_id", "user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_ab_test_participants_variant_idx" ON "wizard_ab_test_participants"("test_id", "variant_assigned");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_ab_test_participants_conversion_idx" ON "wizard_ab_test_participants"("test_id", "conversion_achieved");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_ab_test_participants_exposure_idx" ON "wizard_ab_test_participants"("exposure_confirmed") WHERE exposure_confirmed = true;

/**
 * Wizard Conversion Events table - tracks conversion events
 */
CREATE TABLE IF NOT EXISTS "wizard_conversion_events" (
    "id" TEXT PRIMARY KEY,
    "session_id" TEXT NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    "user_id" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event details
    "event_type" TEXT NOT NULL CHECK (event_type IN ('session_start', 'step_complete', 'template_select', 'wizard_complete', 'workflow_create', 'first_execution', 'goal_achieve')),
    "event_name" TEXT NOT NULL,
    "step_id" TEXT,
    
    -- Conversion funnel
    "funnel_stage" TEXT NOT NULL CHECK (funnel_stage IN ('awareness', 'interest', 'consideration', 'intent', 'evaluation', 'purchase', 'retention')),
    "conversion_value" NUMERIC(12,2),
    "conversion_currency" TEXT DEFAULT 'USD',
    
    -- Attribution and context
    "traffic_source" TEXT,
    "campaign_id" TEXT,
    "referrer_domain" TEXT,
    "landing_page" TEXT,
    "template_id" TEXT REFERENCES templates(id) ON DELETE SET NULL,
    
    -- A/B testing context
    "active_tests" JSONB,
    "primary_test_id" TEXT,
    "primary_variant" TEXT,
    
    -- Timing and attribution
    "time_to_conversion_seconds" INTEGER,
    "previous_touchpoints" INTEGER DEFAULT 0,
    "session_sequence_number" INTEGER DEFAULT 1,
    
    -- Event properties
    "event_properties" JSONB DEFAULT '{}',
    "technical_properties" JSONB DEFAULT '{}',
    
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wizard Conversion Events Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_conversion_events_session_funnel_idx" ON "wizard_conversion_events"("session_id", "funnel_stage");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_conversion_events_user_journey_idx" ON "wizard_conversion_events"("user_id", "created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_conversion_events_ab_testing_idx" ON "wizard_conversion_events"("primary_test_id", "primary_variant") WHERE primary_test_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_conversion_events_event_type_idx" ON "wizard_conversion_events"("event_type", "created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_conversion_events_template_idx" ON "wizard_conversion_events"("template_id") WHERE template_id IS NOT NULL;

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================

/**
 * Wizard Performance Metrics table - comprehensive performance monitoring
 */
CREATE TABLE IF NOT EXISTS "wizard_performance_metrics" (
    "id" TEXT PRIMARY KEY,
    "session_id" TEXT NOT NULL REFERENCES wizard_sessions(id) ON DELETE CASCADE,
    
    -- Performance measurement context
    "metric_type" TEXT NOT NULL CHECK (metric_type IN ('page_load', 'step_render', 'api_response', 'validation', 'save_operation', 'recommendation_generation')),
    "component" TEXT NOT NULL,
    "operation" TEXT,
    
    -- Timing metrics (all in milliseconds)
    "start_time" BIGINT NOT NULL,
    "end_time" BIGINT,
    "duration_ms" INTEGER,
    
    -- Breakdown timings
    "dns_time_ms" INTEGER,
    "connect_time_ms" INTEGER,
    "request_time_ms" INTEGER,
    "response_time_ms" INTEGER,
    "render_time_ms" INTEGER,
    "interaction_delay_ms" INTEGER,
    
    -- Resource usage
    "memory_usage_mb" NUMERIC(10,2),
    "cpu_utilization_percent" NUMERIC(5,2),
    "network_bytes_sent" BIGINT,
    "network_bytes_received" BIGINT,
    "cache_hit_ratio" NUMERIC(4,3),
    
    -- Quality metrics
    "error_occurred" BOOLEAN NOT NULL DEFAULT false,
    "error_type" TEXT,
    "error_details" JSONB,
    "retry_count" INTEGER DEFAULT 0,
    "success_after_retry" BOOLEAN,
    
    -- User experience metrics
    "user_abandoned" BOOLEAN DEFAULT false,
    "user_satisfaction_implicit" NUMERIC(4,3),
    "frustration_indicators" JSONB,
    
    -- Technical context
    "browser_type" TEXT,
    "browser_version" TEXT,
    "device_type" TEXT,
    "connection_type" TEXT CHECK (connection_type IN ('ethernet', 'wifi', 'cellular', 'unknown')),
    "connection_speed" TEXT CHECK (connection_speed IN ('slow-2g', '2g', '3g', '4g', '5g', 'broadband', 'unknown')),
    
    -- Geographic and temporal context
    "geographic_region" TEXT,
    "timezone" TEXT,
    "server_region" TEXT,
    
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wizard Performance Metrics Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_performance_metrics_session_idx" ON "wizard_performance_metrics"("session_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_performance_metrics_type_component_idx" ON "wizard_performance_metrics"("metric_type", "component");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_performance_metrics_duration_idx" ON "wizard_performance_metrics"("duration_ms") WHERE duration_ms IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_performance_metrics_errors_idx" ON "wizard_performance_metrics"("error_occurred", "error_type") WHERE error_occurred = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_performance_metrics_created_at_idx" ON "wizard_performance_metrics"("created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_performance_metrics_connection_idx" ON "wizard_performance_metrics"("connection_type", "connection_speed");

/**
 * Wizard Usage Patterns table - behavioral pattern analysis
 */
CREATE TABLE IF NOT EXISTS "wizard_usage_patterns" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Pattern identification
    "pattern_type" TEXT NOT NULL CHECK (pattern_type IN ('navigation', 'timing', 'error', 'abandonment', 'success', 'preference')),
    "pattern_name" TEXT NOT NULL,
    "pattern_description" TEXT,
    "pattern_frequency" INTEGER NOT NULL DEFAULT 1,
    
    -- Pattern details
    "pattern_data" JSONB NOT NULL,
    "confidence_score" NUMERIC(4,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    "statistical_significance" BOOLEAN DEFAULT false,
    
    -- Context and triggers
    "trigger_conditions" JSONB,
    "environmental_factors" JSONB,
    "user_state_factors" JSONB,
    
    -- Pattern evolution
    "first_observed_at" TIMESTAMP NOT NULL,
    "last_observed_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "trend_direction" TEXT CHECK (trend_direction IN ('increasing', 'decreasing', 'stable', 'cyclical')),
    "pattern_stability_score" NUMERIC(4,3) CHECK (pattern_stability_score >= 0 AND pattern_stability_score <= 1),
    
    -- Business impact
    "positive_outcome" BOOLEAN,
    "impact_on_completion_rate" NUMERIC(5,4),
    "impact_on_satisfaction" NUMERIC(5,4),
    "business_value_impact" NUMERIC(12,2),
    
    -- Recommendations
    "recommended_actions" JSONB,
    "intervention_opportunities" JSONB,
    "personalization_suggestions" JSONB,
    
    -- Analysis metadata
    "analysis_algorithm" TEXT NOT NULL,
    "analysis_date" TIMESTAMP NOT NULL DEFAULT NOW(),
    "analyst_verified" BOOLEAN DEFAULT false,
    
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wizard Usage Patterns Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_usage_patterns_user_type_idx" ON "wizard_usage_patterns"("user_id", "pattern_type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_usage_patterns_positive_outcome_idx" ON "wizard_usage_patterns"("positive_outcome") WHERE positive_outcome = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_usage_patterns_business_impact_idx" ON "wizard_usage_patterns"("business_value_impact" DESC) WHERE business_value_impact IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_usage_patterns_frequency_idx" ON "wizard_usage_patterns"("pattern_frequency" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_usage_patterns_confidence_idx" ON "wizard_usage_patterns"("confidence_score" DESC);

-- ============================================================================
-- GDPR COMPLIANCE AND DATA RETENTION
-- ============================================================================

/**
 * Wizard Data Retention table - GDPR-compliant data management
 */
CREATE TABLE IF NOT EXISTS "wizard_data_retention" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Data categories and retention
    "data_category" TEXT NOT NULL CHECK (data_category IN ('session_data', 'analytics_data', 'preferences', 'performance_metrics', 'ab_test_data', 'conversion_events')),
    "retention_period_days" INTEGER NOT NULL,
    "retention_basis" TEXT NOT NULL CHECK (retention_basis IN ('consent', 'legitimate_interest', 'contract', 'legal_obligation', 'public_task', 'vital_interests')),
    
    -- Consent tracking
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consent_date" TIMESTAMP,
    "consent_version" TEXT,
    "consent_method" TEXT CHECK (consent_method IN ('explicit', 'implicit', 'opt_out', 'granular')),
    
    -- Data lifecycle
    "data_created_at" TIMESTAMP NOT NULL,
    "scheduled_deletion_at" TIMESTAMP NOT NULL,
    "actual_deletion_at" TIMESTAMP,
    "deletion_status" TEXT NOT NULL DEFAULT 'pending' CHECK (deletion_status IN ('pending', 'in_progress', 'completed', 'failed', 'postponed')),
    
    -- GDPR rights tracking
    "data_export_requested" BOOLEAN DEFAULT false,
    "data_export_provided_at" TIMESTAMP,
    "data_rectification_requested" BOOLEAN DEFAULT false,
    "data_rectification_completed_at" TIMESTAMP,
    "data_portability_requested" BOOLEAN DEFAULT false,
    "data_portability_provided_at" TIMESTAMP,
    
    -- Audit information
    "retention_rule_id" TEXT,
    "legal_hold" BOOLEAN DEFAULT false,
    "legal_hold_reason" TEXT,
    "legal_hold_until" TIMESTAMP,
    
    -- Processing log
    "processing_activities" JSONB DEFAULT '[]',
    "last_processing_activity" TIMESTAMP,
    
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wizard Data Retention Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_data_retention_user_category_idx" ON "wizard_data_retention"("user_id", "data_category");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_data_retention_scheduled_deletion_idx" ON "wizard_data_retention"("scheduled_deletion_at") WHERE deletion_status = 'pending';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_data_retention_legal_hold_idx" ON "wizard_data_retention"("legal_hold") WHERE legal_hold = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wizard_data_retention_consent_idx" ON "wizard_data_retention"("consent_given", "consent_date");

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Wizard daily metrics view
CREATE MATERIALIZED VIEW IF NOT EXISTS "wizard_daily_metrics" AS
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

-- Create unique index for materialized view refresh
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "wizard_daily_metrics_unique_idx" ON "wizard_daily_metrics" (metric_date, wizard_type);

-- Template performance summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS "wizard_template_performance_summary" AS
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

-- Create unique index for materialized view refresh
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "wizard_template_performance_summary_unique_idx" ON "wizard_template_performance_summary" (template_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers to relevant tables
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

-- GDPR compliance cleanup function
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
    
    -- Refresh materialized views if available
    REFRESH MATERIALIZED VIEW CONCURRENTLY wizard_daily_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY wizard_template_performance_summary;
    
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
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * time_range_days
            AND created_at < CURRENT_DATE
    ),
    previous_metrics AS (
        SELECT 
            'completion_rate' as metric,
            COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as value
        FROM wizard_sessions 
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * (time_range_days * 2)
            AND created_at < CURRENT_DATE - INTERVAL '1 day' * time_range_days
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
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all wizard tables
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

-- Users can only access their own data policy
DO $$
BEGIN
    -- Note: Adjust these policies based on your auth system
    -- These assume a function auth.uid() exists that returns current user ID
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'uid' AND routine_schema = 'auth') THEN
        -- Create policies for user data access
        CREATE POLICY wizard_sessions_user_access ON wizard_sessions
            FOR ALL USING (user_id = auth.uid());

        CREATE POLICY user_wizard_preferences_access ON user_wizard_preferences
            FOR ALL USING (user_id = auth.uid());

        CREATE POLICY user_wizard_history_access ON user_wizard_history
            FOR ALL USING (user_id = auth.uid());

        CREATE POLICY wizard_usage_patterns_access ON wizard_usage_patterns
            FOR ALL USING (user_id = auth.uid());

        CREATE POLICY wizard_data_retention_access ON wizard_data_retention
            FOR ALL USING (user_id = auth.uid());
    END IF;
    
EXCEPTION
    WHEN others THEN 
        -- Continue without RLS policies if auth system not available
        NULL;
END $$;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

-- Table comments for documentation
COMMENT ON TABLE wizard_sessions IS 'Comprehensive wizard session tracking with state management, progress tracking, performance monitoring, and GDPR compliance';
COMMENT ON TABLE wizard_step_analytics IS 'Detailed step-by-step analytics for wizard optimization and user behavior analysis';
COMMENT ON TABLE template_recommendations IS 'AI-generated template recommendations with ML scoring, A/B testing, and user interaction tracking';
COMMENT ON TABLE template_performance_metrics IS 'Comprehensive template performance tracking including success rates, user satisfaction, and business impact';
COMMENT ON TABLE user_wizard_preferences IS 'User-controlled preferences for wizard customization, accessibility, and behavioral patterns';
COMMENT ON TABLE user_wizard_history IS 'Complete history of user wizard interactions for pattern analysis and recommendation improvement';
COMMENT ON TABLE wizard_ab_tests IS 'A/B testing framework for wizard optimization with statistical analysis and automated rollout';
COMMENT ON TABLE wizard_ab_test_participants IS 'User participation tracking in A/B tests with consistent variant assignment';
COMMENT ON TABLE wizard_conversion_events IS 'Conversion event tracking for funnel analysis and attribution modeling';
COMMENT ON TABLE wizard_performance_metrics IS 'Real-time performance monitoring with comprehensive metrics and bottleneck identification';
COMMENT ON TABLE wizard_usage_patterns IS 'Machine learning-powered behavioral pattern analysis for personalization';
COMMENT ON TABLE wizard_data_retention IS 'GDPR-compliant data retention and user rights management system';

-- Critical column comments
COMMENT ON COLUMN wizard_sessions.session_data IS 'Complete wizard state stored as JSONB for recovery and analysis';
COMMENT ON COLUMN wizard_sessions.data_consent_given IS 'GDPR consent for data processing and analytics tracking';
COMMENT ON COLUMN wizard_sessions.data_retention_until IS 'GDPR retention deadline - data must be deleted after this date';
COMMENT ON COLUMN template_recommendations.final_score IS 'ML-generated composite score from multiple recommendation algorithms';
COMMENT ON COLUMN wizard_ab_tests.confidence_level IS 'Statistical confidence level required for test conclusion (e.g., 0.95 for 95%)';
COMMENT ON COLUMN wizard_performance_metrics.frustration_indicators IS 'Behavioral signs of user frustration (rapid clicks, back navigation, etc.)';

-- Migration completion marker
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('0085_comprehensive_wizard_system', NOW())
ON CONFLICT (version) DO NOTHING;