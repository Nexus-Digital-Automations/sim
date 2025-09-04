-- Migration: 0087_community_marketplace_social_features.sql
-- Description: Comprehensive community marketplace and social features implementation
-- Created: September 4, 2025
-- Based on research report: research-complete-community-marketplace-with-social-features-and-integration-discovery-1757002072081.md

-- ========================================================================
-- ENABLE REQUIRED EXTENSIONS
-- ========================================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for improved text search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========================================================================
-- SOCIAL FEATURES IMPLEMENTATION
-- ========================================================================

/**
 * User Following System - Social networking foundation
 *
 * Enables users to follow other users and creators, forming the basis
 * for personalized content discovery and social engagement features.
 */
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    
    -- Relationship metadata for advanced social features
    relationship_strength DECIMAL(3,2) DEFAULT 1.0 CHECK (relationship_strength >= 0 AND relationship_strength <= 1),
    interaction_frequency DECIMAL(5,2) DEFAULT 0 CHECK (interaction_frequency >= 0),
    last_interaction_at TIMESTAMP,
    
    -- Follow context and source tracking
    follow_source TEXT DEFAULT 'direct',
    follow_context JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Prevent self-following
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),
    
    -- Unique relationship constraint
    UNIQUE(follower_id, following_id)
);

-- Create indexes for user_follows
CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON user_follows(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON user_follows(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_follows_strength_idx ON user_follows(relationship_strength DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_follows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_follows_updated_at
    BEFORE UPDATE ON user_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_user_follows_updated_at();

/**
 * Activity Feed System - Comprehensive social activity tracking
 *
 * Central system for tracking and distributing user activities across the platform.
 * Powers personalized activity feeds, notifications, and social engagement features.
 */
CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    
    -- Activity classification
    activity_type TEXT NOT NULL,
    object_type TEXT NOT NULL,
    object_id UUID NOT NULL,
    
    -- Feed optimization and ranking
    engagement_score DECIMAL(5,2) DEFAULT 1.0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
    relevance_score DECIMAL(5,2) DEFAULT 1.0 CHECK (relevance_score >= 0 AND relevance_score <= 1),
    feed_weight DECIMAL(5,2) DEFAULT 1.0,
    
    -- Activity aggregation support
    aggregation_key TEXT,
    participant_count INTEGER DEFAULT 1 CHECK (participant_count >= 1),
    participants JSONB DEFAULT '[]',
    
    -- Activity metadata
    activity_data JSONB DEFAULT '{}',
    context_data JSONB DEFAULT '{}',
    
    -- Visibility and moderation
    is_visible BOOLEAN DEFAULT true,
    moderation_status TEXT DEFAULT 'approved',
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for activity_feed
CREATE INDEX IF NOT EXISTS activity_feed_user_feed_idx ON activity_feed(user_id, created_at DESC, is_visible);
CREATE INDEX IF NOT EXISTS activity_feed_actor_activity_idx ON activity_feed(actor_id, activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_object_idx ON activity_feed(object_type, object_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_engagement_idx ON activity_feed(engagement_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_relevance_idx ON activity_feed(user_id, relevance_score DESC);
CREATE INDEX IF NOT EXISTS activity_feed_aggregation_idx ON activity_feed(aggregation_key, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_moderation_idx ON activity_feed(moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_type_idx ON activity_feed(activity_type, created_at DESC);

/**
 * Social Interactions System - Comprehensive user engagement tracking
 *
 * Tracks all user interactions with content and other users across the platform.
 * Provides data for recommendation algorithms, engagement analytics, and social features.
 */
CREATE TABLE IF NOT EXISTS social_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    
    -- Interaction context and analytics
    session_id TEXT,
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    interaction_value DECIMAL(10,4),
    
    -- Context and metadata
    source_context TEXT,
    device_type TEXT,
    user_agent TEXT,
    referrer TEXT,
    
    -- Geographic and temporal context
    ip_address TEXT,
    timezone TEXT,
    
    -- Interaction metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- A/B testing and experiments
    experiment_id TEXT,
    variant_id TEXT,
    
    -- Quality and validation
    is_validated BOOLEAN DEFAULT false,
    quality_score DECIMAL(3,2) CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for social_interactions
CREATE INDEX IF NOT EXISTS social_interactions_user_interaction_idx ON social_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_interactions_user_type_idx ON social_interactions(user_id, interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS social_interactions_target_idx ON social_interactions(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_interactions_target_interaction_idx ON social_interactions(target_id, interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS social_interactions_session_idx ON social_interactions(session_id, created_at);
CREATE INDEX IF NOT EXISTS social_interactions_source_context_idx ON social_interactions(source_context, interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS social_interactions_experiment_idx ON social_interactions(experiment_id, variant_id, created_at);
CREATE INDEX IF NOT EXISTS social_interactions_quality_idx ON social_interactions(quality_score DESC, is_validated);
CREATE INDEX IF NOT EXISTS social_interactions_time_analysis_idx ON social_interactions(created_at, timezone);

-- ========================================================================
-- ENHANCED RECOMMENDATION AND PERSONALIZATION SYSTEM
-- ========================================================================

/**
 * Enhanced User Preferences System - AI-powered personalization
 *
 * Comprehensive user preference learning system that combines explicit preferences
 * with implicit behavior analysis to power advanced recommendation algorithms.
 */
CREATE TABLE IF NOT EXISTS enhanced_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE UNIQUE,
    
    -- Explicit preferences set by user
    preferred_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferred_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    difficulty_preference TEXT DEFAULT 'intermediate',
    content_type_preferences JSONB DEFAULT '{}',
    
    -- Implicit behavioral learning
    category_scores JSONB DEFAULT '{}',
    tag_scores JSONB DEFAULT '{}',
    creator_scores JSONB DEFAULT '{}',
    
    -- Usage pattern analysis
    usage_patterns JSONB DEFAULT '{}',
    success_rates JSONB DEFAULT '{}',
    failure_patterns JSONB DEFAULT '{}',
    
    -- Advanced ML features
    embedding_vector vector(128),
    cluster_assignment INTEGER,
    cluster_confidence DECIMAL(3,2) CHECK (cluster_confidence IS NULL OR (cluster_confidence >= 0 AND cluster_confidence <= 1)),
    
    -- Temporal preference tracking
    preference_stability DECIMAL(3,2) CHECK (preference_stability IS NULL OR (preference_stability >= 0 AND preference_stability <= 1)),
    trending_interests JSONB DEFAULT '{}',
    declining_interests JSONB DEFAULT '{}',
    
    -- Learning metadata
    total_interactions INTEGER DEFAULT 0 CHECK (total_interactions >= 0),
    last_learning_update TIMESTAMP,
    learning_confidence DECIMAL(3,2) CHECK (learning_confidence IS NULL OR (learning_confidence >= 0 AND learning_confidence <= 1)),
    
    -- Cold-start and onboarding
    onboarding_completed BOOLEAN DEFAULT false,
    cold_start_phase BOOLEAN DEFAULT true,
    explicit_feedback_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for enhanced_user_preferences
CREATE INDEX IF NOT EXISTS enhanced_user_preferences_user_idx ON enhanced_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS enhanced_user_preferences_cluster_idx ON enhanced_user_preferences(cluster_assignment, cluster_confidence DESC);
CREATE INDEX IF NOT EXISTS enhanced_user_preferences_confidence_idx ON enhanced_user_preferences(learning_confidence DESC, total_interactions DESC);
CREATE INDEX IF NOT EXISTS enhanced_user_preferences_cold_start_idx ON enhanced_user_preferences(cold_start_phase, explicit_feedback_count DESC);
CREATE INDEX IF NOT EXISTS enhanced_user_preferences_last_update_idx ON enhanced_user_preferences(last_learning_update DESC);

-- Create HNSW index for user similarity (if pgvector supports it)
CREATE INDEX IF NOT EXISTS enhanced_user_preferences_embedding_hnsw_idx 
ON enhanced_user_preferences USING hnsw (embedding_vector vector_cosine_ops);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_enhanced_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enhanced_user_preferences_updated_at
    BEFORE UPDATE ON enhanced_user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_enhanced_user_preferences_updated_at();

/**
 * Template Embeddings System - Advanced semantic search and recommendations
 *
 * Stores vector embeddings for templates to enable semantic search, similarity matching,
 * and advanced recommendation algorithms based on content and usage patterns.
 */
CREATE TABLE IF NOT EXISTS template_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE UNIQUE,
    
    -- Multi-dimensional embeddings
    content_embedding vector(256),
    usage_embedding vector(128),
    metadata_embedding vector(64),
    
    -- Embedding generation metadata
    embedding_model TEXT NOT NULL,
    model_version TEXT NOT NULL,
    embedding_source TEXT NOT NULL,
    
    -- Cluster assignments for grouping similar templates
    content_cluster INTEGER,
    usage_cluster INTEGER,
    metadata_cluster INTEGER,
    
    -- Cluster confidence scores
    content_cluster_confidence DECIMAL(3,2) CHECK (content_cluster_confidence IS NULL OR (content_cluster_confidence >= 0 AND content_cluster_confidence <= 1)),
    usage_cluster_confidence DECIMAL(3,2) CHECK (usage_cluster_confidence IS NULL OR (usage_cluster_confidence >= 0 AND usage_cluster_confidence <= 1)),
    metadata_cluster_confidence DECIMAL(3,2) CHECK (metadata_cluster_confidence IS NULL OR (metadata_cluster_confidence >= 0 AND metadata_cluster_confidence <= 1)),
    
    -- Embedding quality metrics
    embedding_quality DECIMAL(3,2) CHECK (embedding_quality IS NULL OR (embedding_quality >= 0 AND embedding_quality <= 1)),
    dimensionality_reduction DECIMAL(5,2),
    
    -- Template context for embedding
    context_data JSONB DEFAULT '{}',
    processing_stats JSONB DEFAULT '{}',
    
    -- Embedding lifecycle
    is_stale BOOLEAN DEFAULT false,
    regeneration_reason TEXT,
    last_validated TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for template_embeddings
CREATE INDEX IF NOT EXISTS template_embeddings_template_idx ON template_embeddings(template_id);
CREATE INDEX IF NOT EXISTS template_embeddings_content_cluster_idx ON template_embeddings(content_cluster, content_cluster_confidence DESC);
CREATE INDEX IF NOT EXISTS template_embeddings_usage_cluster_idx ON template_embeddings(usage_cluster, usage_cluster_confidence DESC);
CREATE INDEX IF NOT EXISTS template_embeddings_metadata_cluster_idx ON template_embeddings(metadata_cluster, metadata_cluster_confidence DESC);
CREATE INDEX IF NOT EXISTS template_embeddings_quality_idx ON template_embeddings(embedding_quality DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS template_embeddings_stale_idx ON template_embeddings(is_stale, updated_at DESC);
CREATE INDEX IF NOT EXISTS template_embeddings_model_idx ON template_embeddings(embedding_model, model_version, created_at DESC);
CREATE INDEX IF NOT EXISTS template_embeddings_validation_idx ON template_embeddings(last_validated DESC);

-- Create HNSW indexes for vector similarity search (if pgvector supports it)
CREATE INDEX IF NOT EXISTS template_embeddings_content_hnsw_idx 
ON template_embeddings USING hnsw (content_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS template_embeddings_usage_hnsw_idx 
ON template_embeddings USING hnsw (usage_embedding vector_cosine_ops);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_template_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER template_embeddings_updated_at
    BEFORE UPDATE ON template_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_template_embeddings_updated_at();

-- ========================================================================
-- ENHANCED MARKETPLACE MONETIZATION SYSTEM
-- ========================================================================

/**
 * Enhanced Template Pricing System - Comprehensive marketplace monetization
 *
 * Advanced pricing and monetization system for the template marketplace,
 * supporting multiple pricing models, dynamic pricing, and revenue sharing.
 */
CREATE TABLE IF NOT EXISTS enhanced_template_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE UNIQUE,
    
    -- Core pricing configuration
    pricing_model TEXT NOT NULL DEFAULT 'free',
    base_price DECIMAL(10,2) DEFAULT 0.00 CHECK (base_price >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    
    -- Tier-based pricing
    tier_pricing JSONB DEFAULT '{}',
    volume_discounts JSONB DEFAULT '{}',
    subscription_pricing JSONB DEFAULT '{}',
    
    -- Dynamic and promotional pricing
    dynamic_pricing_enabled BOOLEAN DEFAULT false,
    current_dynamic_price DECIMAL(10,2),
    promotional_pricing JSONB DEFAULT '{}',
    
    -- Revenue sharing configuration
    creator_share_percentage DECIMAL(5,2) DEFAULT 70.00 CHECK (creator_share_percentage >= 0 AND creator_share_percentage <= 100),
    platform_fee_percentage DECIMAL(5,2) DEFAULT 30.00 CHECK (platform_fee_percentage >= 0 AND platform_fee_percentage <= 100),
    minimum_payout DECIMAL(10,2) DEFAULT 10.00 CHECK (minimum_payout >= 0),
    
    -- Enterprise and custom pricing
    enterprise_pricing_available BOOLEAN DEFAULT false,
    custom_licensing_terms JSONB DEFAULT '{}',
    bulk_licensing_discount DECIMAL(5,2),
    
    -- Pricing analytics and optimization
    price_elasticity DECIMAL(5,4),
    optimal_price_range JSONB DEFAULT '{}',
    conversion_rate DECIMAL(5,4) CHECK (conversion_rate IS NULL OR (conversion_rate >= 0 AND conversion_rate <= 1)),
    
    -- Market positioning
    competitive_pricing JSONB DEFAULT '{}',
    market_position TEXT,
    value_positioning JSONB DEFAULT '{}',
    
    -- Pricing lifecycle management
    is_active BOOLEAN DEFAULT true,
    effective_date TIMESTAMP NOT NULL DEFAULT NOW(),
    expiration_date TIMESTAMP,
    last_price_update TIMESTAMP DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Ensure revenue sharing adds up to 100%
    CONSTRAINT shares_sum_check CHECK (creator_share_percentage + platform_fee_percentage = 100)
);

-- Create indexes for enhanced_template_pricing
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_template_idx ON enhanced_template_pricing(template_id);
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_model_active_idx ON enhanced_template_pricing(pricing_model, is_active, effective_date);
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_range_idx ON enhanced_template_pricing(base_price, currency, is_active);
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_dynamic_idx ON enhanced_template_pricing(current_dynamic_price, dynamic_pricing_enabled);
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_revenue_share_idx ON enhanced_template_pricing(creator_share_percentage, platform_fee_percentage);
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_market_position_idx ON enhanced_template_pricing(market_position, base_price DESC);
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_conversion_rate_idx ON enhanced_template_pricing(conversion_rate DESC);
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_elasticity_idx ON enhanced_template_pricing(price_elasticity);
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_effective_date_idx ON enhanced_template_pricing(effective_date, is_active);
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_update_tracking_idx ON enhanced_template_pricing(last_price_update DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_enhanced_template_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enhanced_template_pricing_updated_at
    BEFORE UPDATE ON enhanced_template_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_enhanced_template_pricing_updated_at();

/**
 * Template Purchase History - Comprehensive transaction tracking
 *
 * Complete transaction history and purchase analytics for the marketplace,
 * including payment processing, refunds, and revenue analytics.
 */
CREATE TABLE IF NOT EXISTS template_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    purchaser_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    
    -- Transaction details
    purchase_price DECIMAL(10,2) NOT NULL CHECK (purchase_price >= 0),
    original_price DECIMAL(10,2) NOT NULL CHECK (original_price >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    discount_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    
    -- Payment processing
    payment_method TEXT NOT NULL,
    payment_gateway TEXT NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE,
    gateway_transaction_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    
    -- Purchase context and attribution
    purchase_source TEXT,
    referral_code TEXT,
    campaign_id TEXT,
    discount_code TEXT,
    
    -- Customer and billing information
    billing_address JSONB DEFAULT '{}',
    billing_email TEXT,
    customer_ip_address TEXT,
    customer_user_agent TEXT,
    
    -- Enterprise and licensing
    organization_id TEXT REFERENCES organization(id),
    license_type TEXT DEFAULT 'standard',
    license_quantity INTEGER DEFAULT 1 CHECK (license_quantity >= 1),
    license_terms JSONB DEFAULT '{}',
    
    -- Revenue tracking
    creator_revenue DECIMAL(10,2) NOT NULL CHECK (creator_revenue >= 0),
    platform_revenue DECIMAL(10,2) NOT NULL CHECK (platform_revenue >= 0),
    affiliate_revenue DECIMAL(10,2) DEFAULT 0.00,
    
    -- Fulfillment and delivery
    fulfillment_status TEXT DEFAULT 'pending',
    delivery_method TEXT DEFAULT 'instant',
    delivered_at TIMESTAMP,
    access_granted_at TIMESTAMP,
    
    -- Refund and dispute management
    refund_status TEXT DEFAULT 'none',
    refund_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (refund_amount >= 0),
    refund_reason TEXT,
    refund_processed_at TIMESTAMP,
    dispute_status TEXT DEFAULT 'none',
    
    -- Analytics and insights
    customer_lifetime_value DECIMAL(10,2),
    purchase_sequence INTEGER,
    time_since_last_purchase INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Ensure refund amount doesn't exceed total amount
    CONSTRAINT refund_amount_check CHECK (refund_amount <= total_amount)
);

-- Create indexes for template_purchases
CREATE INDEX IF NOT EXISTS template_purchases_template_purchaser_idx ON template_purchases(template_id, purchaser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_purchaser_idx ON template_purchases(purchaser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_template_idx ON template_purchases(template_id, payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_transaction_idx ON template_purchases(transaction_id, payment_status);
CREATE INDEX IF NOT EXISTS template_purchases_payment_status_idx ON template_purchases(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_payment_method_idx ON template_purchases(payment_method, payment_gateway);
CREATE INDEX IF NOT EXISTS template_purchases_revenue_idx ON template_purchases(total_amount DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_creator_revenue_idx ON template_purchases(creator_revenue DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_organization_idx ON template_purchases(organization_id, license_type, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_license_idx ON template_purchases(license_type, license_quantity, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_refund_idx ON template_purchases(refund_status, refund_processed_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_dispute_idx ON template_purchases(dispute_status, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_source_idx ON template_purchases(purchase_source, campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_referral_idx ON template_purchases(referral_code, created_at DESC);
CREATE INDEX IF NOT EXISTS template_purchases_customer_sequence_idx ON template_purchases(purchaser_id, purchase_sequence);
CREATE INDEX IF NOT EXISTS template_purchases_clv_idx ON template_purchases(customer_lifetime_value DESC);
CREATE INDEX IF NOT EXISTS template_purchases_fulfillment_idx ON template_purchases(fulfillment_status, delivered_at DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_template_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER template_purchases_updated_at
    BEFORE UPDATE ON template_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_template_purchases_updated_at();

-- ========================================================================
-- COMMUNITY ANALYTICS AND HEALTH MONITORING
-- ========================================================================

/**
 * Community Metrics and Health System - Platform analytics and insights
 *
 * Comprehensive community health tracking and analytics system for monitoring
 * platform growth, engagement, and community dynamics.
 */
CREATE TABLE IF NOT EXISTS community_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date TIMESTAMP NOT NULL,
    metric_type TEXT NOT NULL,
    
    -- User engagement metrics
    total_active_users INTEGER DEFAULT 0 CHECK (total_active_users >= 0),
    daily_active_users INTEGER DEFAULT 0 CHECK (daily_active_users >= 0),
    weekly_active_users INTEGER DEFAULT 0 CHECK (weekly_active_users >= 0),
    monthly_active_users INTEGER DEFAULT 0 CHECK (monthly_active_users >= 0),
    new_user_signups INTEGER DEFAULT 0,
    user_retention_rate DECIMAL(5,2) CHECK (user_retention_rate IS NULL OR (user_retention_rate >= 0 AND user_retention_rate <= 100)),
    average_session_duration DECIMAL(8,2),
    
    -- Content creation metrics
    templates_created INTEGER DEFAULT 0,
    templates_updated INTEGER DEFAULT 0,
    total_template_views INTEGER DEFAULT 0,
    total_template_downloads INTEGER DEFAULT 0,
    average_template_rating DECIMAL(3,2) CHECK (average_template_rating IS NULL OR (average_template_rating >= 0 AND average_template_rating <= 5)),
    template_quality_score DECIMAL(5,2),
    
    -- Social interaction metrics
    total_social_interactions INTEGER DEFAULT 0,
    followers_gained INTEGER DEFAULT 0,
    likes_given INTEGER DEFAULT 0,
    shares_performed INTEGER DEFAULT 0,
    comments_created INTEGER DEFAULT 0,
    collections_created INTEGER DEFAULT 0,
    social_engagement_rate DECIMAL(5,2),
    
    -- Marketplace transaction metrics
    total_purchases INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00 CHECK (total_revenue >= 0),
    average_transaction_value DECIMAL(10,2),
    conversion_rate DECIMAL(5,4) CHECK (conversion_rate IS NULL OR (conversion_rate >= 0 AND conversion_rate <= 1)),
    refund_rate DECIMAL(5,4),
    creator_earnings DECIMAL(12,2) DEFAULT 0.00 CHECK (creator_earnings >= 0),
    
    -- Creator ecosystem metrics
    active_creators INTEGER DEFAULT 0,
    new_creators INTEGER DEFAULT 0,
    creator_retention_rate DECIMAL(5,2),
    average_creator_earnings DECIMAL(10,2),
    top_creator_earnings DECIMAL(10,2),
    creator_satisfaction_score DECIMAL(3,2),
    
    -- Platform health indicators
    search_success_rate DECIMAL(5,4),
    recommendation_click_rate DECIMAL(5,4),
    error_rate DECIMAL(5,4),
    average_load_time DECIMAL(6,2),
    support_tickets_created INTEGER DEFAULT 0,
    platform_satisfaction_score DECIMAL(3,2),
    
    -- Growth and trend indicators
    growth_rate DECIMAL(5,2),
    churn_rate DECIMAL(5,4),
    viral_coefficient DECIMAL(5,4),
    net_promoter_score DECIMAL(3,2),
    competitive_metrics JSONB DEFAULT '{}',
    
    -- Detailed breakdowns and metadata
    category_breakdown JSONB DEFAULT '{}',
    geographic_breakdown JSONB DEFAULT '{}',
    device_breakdown JSONB DEFAULT '{}',
    cohort_analysis JSONB DEFAULT '{}',
    
    -- Data quality and validation
    data_completeness DECIMAL(3,2) CHECK (data_completeness IS NULL OR (data_completeness >= 0 AND data_completeness <= 1)),
    calculation_method TEXT,
    data_source TEXT,
    confidence_level DECIMAL(3,2) CHECK (confidence_level IS NULL OR (confidence_level >= 0 AND confidence_level <= 1)),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for community_metrics
CREATE INDEX IF NOT EXISTS community_metrics_date_type_idx ON community_metrics(metric_date, metric_type);
CREATE INDEX IF NOT EXISTS community_metrics_date_idx ON community_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS community_metrics_type_idx ON community_metrics(metric_type, metric_date DESC);
CREATE INDEX IF NOT EXISTS community_metrics_kpi_idx ON community_metrics(monthly_active_users DESC, total_revenue DESC, metric_date DESC);
CREATE INDEX IF NOT EXISTS community_metrics_growth_idx ON community_metrics(growth_rate DESC, metric_date DESC);
CREATE INDEX IF NOT EXISTS community_metrics_retention_idx ON community_metrics(user_retention_rate DESC, creator_retention_rate DESC);
CREATE INDEX IF NOT EXISTS community_metrics_engagement_idx ON community_metrics(social_engagement_rate DESC, average_session_duration DESC);
CREATE INDEX IF NOT EXISTS community_metrics_revenue_idx ON community_metrics(total_revenue DESC, average_transaction_value DESC, metric_date DESC);
CREATE INDEX IF NOT EXISTS community_metrics_health_idx ON community_metrics(error_rate, average_load_time, metric_date DESC);
CREATE INDEX IF NOT EXISTS community_metrics_satisfaction_idx ON community_metrics(platform_satisfaction_score DESC, net_promoter_score DESC);
CREATE INDEX IF NOT EXISTS community_metrics_quality_idx ON community_metrics(data_completeness DESC, confidence_level DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_community_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_metrics_updated_at
    BEFORE UPDATE ON community_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_community_metrics_updated_at();

-- ========================================================================
-- DATA INTEGRITY AND PERFORMANCE OPTIMIZATIONS
-- ========================================================================

-- Create GIN indexes for JSONB columns for faster queries
CREATE INDEX IF NOT EXISTS user_follows_follow_context_gin_idx ON user_follows USING GIN (follow_context);
CREATE INDEX IF NOT EXISTS activity_feed_activity_data_gin_idx ON activity_feed USING GIN (activity_data);
CREATE INDEX IF NOT EXISTS activity_feed_context_data_gin_idx ON activity_feed USING GIN (context_data);
CREATE INDEX IF NOT EXISTS activity_feed_participants_gin_idx ON activity_feed USING GIN (participants);
CREATE INDEX IF NOT EXISTS social_interactions_metadata_gin_idx ON social_interactions USING GIN (metadata);
CREATE INDEX IF NOT EXISTS enhanced_user_preferences_category_scores_gin_idx ON enhanced_user_preferences USING GIN (category_scores);
CREATE INDEX IF NOT EXISTS enhanced_user_preferences_tag_scores_gin_idx ON enhanced_user_preferences USING GIN (tag_scores);
CREATE INDEX IF NOT EXISTS enhanced_user_preferences_creator_scores_gin_idx ON enhanced_user_preferences USING GIN (creator_scores);
CREATE INDEX IF NOT EXISTS template_embeddings_context_data_gin_idx ON template_embeddings USING GIN (context_data);
CREATE INDEX IF NOT EXISTS template_embeddings_processing_stats_gin_idx ON template_embeddings USING GIN (processing_stats);
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_tier_pricing_gin_idx ON enhanced_template_pricing USING GIN (tier_pricing);
CREATE INDEX IF NOT EXISTS enhanced_template_pricing_competitive_pricing_gin_idx ON enhanced_template_pricing USING GIN (competitive_pricing);
CREATE INDEX IF NOT EXISTS template_purchases_billing_address_gin_idx ON template_purchases USING GIN (billing_address);
CREATE INDEX IF NOT EXISTS template_purchases_license_terms_gin_idx ON template_purchases USING GIN (license_terms);
CREATE INDEX IF NOT EXISTS community_metrics_category_breakdown_gin_idx ON community_metrics USING GIN (category_breakdown);
CREATE INDEX IF NOT EXISTS community_metrics_competitive_metrics_gin_idx ON community_metrics USING GIN (competitive_metrics);

-- Create text search indexes using pg_trgm for improved search performance
CREATE INDEX IF NOT EXISTS social_interactions_user_agent_trgm_idx ON social_interactions USING GIN (user_agent gin_trgm_ops);
CREATE INDEX IF NOT EXISTS social_interactions_referrer_trgm_idx ON social_interactions USING GIN (referrer gin_trgm_ops);
CREATE INDEX IF NOT EXISTS template_embeddings_embedding_model_trgm_idx ON template_embeddings USING GIN (embedding_model gin_trgm_ops);
CREATE INDEX IF NOT EXISTS template_purchases_referral_code_trgm_idx ON template_purchases USING GIN (referral_code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS template_purchases_discount_code_trgm_idx ON template_purchases USING GIN (discount_code gin_trgm_ops);

-- ========================================================================
-- ANALYTICS AND REPORTING VIEWS
-- ========================================================================

-- View for user engagement analytics
CREATE OR REPLACE VIEW user_engagement_analytics AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    u.created_at as user_created_at,
    
    -- Following statistics
    COALESCE(following_stats.following_count, 0) as following_count,
    COALESCE(follower_stats.follower_count, 0) as follower_count,
    
    -- Activity statistics
    COALESCE(activity_stats.total_activities, 0) as total_activities,
    COALESCE(activity_stats.recent_activities, 0) as recent_activities_7d,
    
    -- Interaction statistics
    COALESCE(interaction_stats.total_interactions, 0) as total_interactions,
    COALESCE(interaction_stats.recent_interactions, 0) as recent_interactions_7d,
    
    -- Purchase statistics
    COALESCE(purchase_stats.total_purchases, 0) as total_purchases,
    COALESCE(purchase_stats.total_spent, 0) as total_spent,
    
    -- Engagement score calculation
    CASE 
        WHEN COALESCE(interaction_stats.total_interactions, 0) = 0 THEN 0
        ELSE (
            COALESCE(activity_stats.recent_activities, 0) * 0.3 +
            COALESCE(interaction_stats.recent_interactions, 0) * 0.4 +
            COALESCE(follower_stats.follower_count, 0) * 0.2 +
            COALESCE(purchase_stats.total_purchases, 0) * 0.1
        )
    END as engagement_score

FROM "user" u
LEFT JOIN (
    SELECT follower_id, COUNT(*) as following_count
    FROM user_follows
    GROUP BY follower_id
) following_stats ON u.id = following_stats.follower_id
LEFT JOIN (
    SELECT following_id, COUNT(*) as follower_count
    FROM user_follows
    GROUP BY following_id
) follower_stats ON u.id = follower_stats.following_id
LEFT JOIN (
    SELECT actor_id, 
           COUNT(*) as total_activities,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_activities
    FROM activity_feed
    GROUP BY actor_id
) activity_stats ON u.id = activity_stats.actor_id
LEFT JOIN (
    SELECT user_id, 
           COUNT(*) as total_interactions,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_interactions
    FROM social_interactions
    GROUP BY user_id
) interaction_stats ON u.id = interaction_stats.user_id
LEFT JOIN (
    SELECT purchaser_id, 
           COUNT(*) as total_purchases,
           SUM(total_amount) as total_spent
    FROM template_purchases
    WHERE payment_status = 'completed'
    GROUP BY purchaser_id
) purchase_stats ON u.id = purchase_stats.purchaser_id;

-- View for template marketplace analytics
CREATE OR REPLACE VIEW template_marketplace_analytics AS
SELECT 
    t.id as template_id,
    t.name,
    t.description,
    t.created_at as template_created_at,
    t.is_published,
    
    -- Pricing information
    COALESCE(pricing.base_price, 0) as base_price,
    pricing.currency,
    pricing.pricing_model,
    
    -- Purchase statistics
    COALESCE(purchase_stats.total_purchases, 0) as total_purchases,
    COALESCE(purchase_stats.total_revenue, 0) as total_revenue,
    COALESCE(purchase_stats.avg_price, 0) as avg_price,
    
    -- Social engagement
    COALESCE(social_stats.total_views, 0) as total_views,
    COALESCE(social_stats.total_likes, 0) as total_likes,
    COALESCE(social_stats.total_shares, 0) as total_shares,
    
    -- Quality metrics
    COALESCE(rating_stats.avg_rating, 0) as avg_rating,
    COALESCE(rating_stats.rating_count, 0) as rating_count,
    COALESCE(embedding_stats.embedding_quality, 0) as embedding_quality,
    
    -- Performance score calculation
    CASE 
        WHEN COALESCE(purchase_stats.total_purchases, 0) = 0 AND COALESCE(social_stats.total_views, 0) = 0 THEN 0
        ELSE (
            COALESCE(purchase_stats.total_purchases, 0) * 0.4 +
            COALESCE(social_stats.total_views, 0) * 0.001 +
            COALESCE(social_stats.total_likes, 0) * 0.2 +
            COALESCE(rating_stats.avg_rating, 0) * 10
        )
    END as performance_score

FROM templates t
LEFT JOIN enhanced_template_pricing pricing ON t.id = pricing.template_id AND pricing.is_active = true
LEFT JOIN (
    SELECT template_id,
           COUNT(*) as total_purchases,
           SUM(total_amount) as total_revenue,
           AVG(total_amount) as avg_price
    FROM template_purchases
    WHERE payment_status = 'completed'
    GROUP BY template_id
) purchase_stats ON t.id = purchase_stats.template_id
LEFT JOIN (
    SELECT target_id,
           COUNT(*) FILTER (WHERE interaction_type = 'view') as total_views,
           COUNT(*) FILTER (WHERE interaction_type = 'like') as total_likes,
           COUNT(*) FILTER (WHERE interaction_type = 'share') as total_shares
    FROM social_interactions
    WHERE target_type = 'template'
    GROUP BY target_id
) social_stats ON t.id::uuid = social_stats.target_id
LEFT JOIN (
    SELECT template_id,
           AVG(rating) as avg_rating,
           COUNT(*) as rating_count
    FROM template_ratings
    WHERE is_approved = true
    GROUP BY template_id
) rating_stats ON t.id = rating_stats.template_id
LEFT JOIN (
    SELECT template_id,
           embedding_quality
    FROM template_embeddings
) embedding_stats ON t.id = embedding_stats.template_id;

-- ========================================================================
-- UTILITY FUNCTIONS FOR COMMUNITY FEATURES
-- ========================================================================

-- Function to calculate user influence score
CREATE OR REPLACE FUNCTION calculate_user_influence_score(user_id_param TEXT)
RETURNS DECIMAL AS $$
DECLARE
    follower_count INTEGER;
    template_count INTEGER;
    total_purchases INTEGER;
    avg_template_rating DECIMAL;
    influence_score DECIMAL;
BEGIN
    -- Get follower count
    SELECT COUNT(*) INTO follower_count
    FROM user_follows
    WHERE following_id = user_id_param;
    
    -- Get template count
    SELECT COUNT(*) INTO template_count
    FROM templates
    WHERE created_by_user_id = user_id_param AND is_published = true;
    
    -- Get total purchases of user's templates
    SELECT COUNT(*) INTO total_purchases
    FROM template_purchases tp
    JOIN templates t ON tp.template_id = t.id
    WHERE t.created_by_user_id = user_id_param AND tp.payment_status = 'completed';
    
    -- Get average rating of user's templates
    SELECT AVG(tr.rating) INTO avg_template_rating
    FROM template_ratings tr
    JOIN templates t ON tr.template_id = t.id
    WHERE t.created_by_user_id = user_id_param AND tr.is_approved = true;
    
    -- Calculate influence score
    influence_score := (
        COALESCE(follower_count, 0) * 0.3 +
        COALESCE(template_count, 0) * 0.2 +
        COALESCE(total_purchases, 0) * 0.4 +
        COALESCE(avg_template_rating, 0) * 2
    );
    
    RETURN GREATEST(influence_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to generate activity feed for a user
CREATE OR REPLACE FUNCTION generate_user_activity_feed(user_id_param TEXT, limit_param INTEGER DEFAULT 20)
RETURNS TABLE (
    activity_id UUID,
    actor_name TEXT,
    activity_type TEXT,
    object_type TEXT,
    object_id UUID,
    activity_data JSONB,
    engagement_score DECIMAL,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        af.id as activity_id,
        u.name as actor_name,
        af.activity_type,
        af.object_type,
        af.object_id,
        af.activity_data,
        af.engagement_score,
        af.created_at
    FROM activity_feed af
    JOIN "user" u ON af.actor_id = u.id
    WHERE af.user_id = user_id_param 
      AND af.is_visible = true
      AND af.moderation_status = 'approved'
    ORDER BY 
        af.relevance_score DESC,
        af.created_at DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate template similarity score
CREATE OR REPLACE FUNCTION calculate_template_similarity(template1_id TEXT, template2_id TEXT)
RETURNS DECIMAL AS $$
DECLARE
    similarity_score DECIMAL := 0;
    content_similarity DECIMAL := 0;
    usage_similarity DECIMAL := 0;
    metadata_similarity DECIMAL := 0;
BEGIN
    -- Calculate content embedding similarity
    SELECT 1 - (e1.content_embedding <=> e2.content_embedding) INTO content_similarity
    FROM template_embeddings e1, template_embeddings e2
    WHERE e1.template_id = template1_id AND e2.template_id = template2_id
      AND e1.content_embedding IS NOT NULL AND e2.content_embedding IS NOT NULL;
    
    -- Calculate usage embedding similarity
    SELECT 1 - (e1.usage_embedding <=> e2.usage_embedding) INTO usage_similarity
    FROM template_embeddings e1, template_embeddings e2
    WHERE e1.template_id = template1_id AND e2.template_id = template2_id
      AND e1.usage_embedding IS NOT NULL AND e2.usage_embedding IS NOT NULL;
    
    -- Calculate metadata similarity (simplified - could be more sophisticated)
    SELECT 
        CASE 
            WHEN t1.category_id = t2.category_id THEN 0.5
            ELSE 0
        END INTO metadata_similarity
    FROM templates t1, templates t2
    WHERE t1.id = template1_id AND t2.id = template2_id;
    
    -- Combine similarities with weights
    similarity_score := (
        COALESCE(content_similarity, 0) * 0.5 +
        COALESCE(usage_similarity, 0) * 0.3 +
        COALESCE(metadata_similarity, 0) * 0.2
    );
    
    RETURN GREATEST(similarity_score, 0);
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- COMPLETION MESSAGE
-- ========================================================================

-- Add a comment to track migration completion
COMMENT ON SCHEMA public IS 'Community Marketplace & Social Features Migration 0087 completed on 2025-09-04';

-- Insert initial community metrics record
INSERT INTO community_metrics (
    metric_date,
    metric_type,
    total_active_users,
    calculation_method,
    data_source,
    confidence_level
) VALUES (
    NOW(),
    'baseline',
    (SELECT COUNT(*) FROM "user"),
    'initial_migration',
    'database_count',
    1.0
) ON CONFLICT DO NOTHING;

-- Success notification
SELECT 'Community Marketplace & Social Features Migration 0087 completed successfully!' as migration_status;