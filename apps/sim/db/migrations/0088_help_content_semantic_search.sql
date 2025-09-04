-- Migration: Add dedicated help content table with vector embeddings support
-- Purpose: Enable advanced semantic search for help content matching
-- Created: 2025-09-04
-- Dependencies: pgvector extension enabled

-- Ensure pgvector extension is available
CREATE EXTENSION IF NOT EXISTS vector;

-- Create help content categories enum
CREATE TYPE help_content_category AS ENUM (
    'getting-started',
    'workflow-basics', 
    'advanced-features',
    'troubleshooting',
    'integrations',
    'api-reference',
    'tutorials',
    'best-practices',
    'faqs',
    'community'
);

-- Create help content difficulty enum
CREATE TYPE help_content_difficulty AS ENUM (
    'beginner',
    'intermediate', 
    'advanced'
);

-- Create help content visibility enum
CREATE TYPE help_content_visibility AS ENUM (
    'public',
    'internal',
    'restricted'
);

-- Create help_content table with comprehensive vector embedding support
CREATE TABLE IF NOT EXISTS "help_content" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT, -- Brief summary for quick previews
    "category" help_content_category NOT NULL,
    "difficulty" help_content_difficulty NOT NULL DEFAULT 'beginner',
    "visibility" help_content_visibility NOT NULL DEFAULT 'public',
    
    -- Content organization
    "slug" TEXT UNIQUE NOT NULL, -- URL-friendly identifier
    "parent_id" TEXT REFERENCES "help_content"("id") ON DELETE SET NULL, -- Hierarchical structure
    "sort_order" INTEGER DEFAULT 0, -- Display ordering
    "featured" BOOLEAN DEFAULT FALSE, -- Featured content priority
    
    -- Content metadata
    "tags" TEXT[] DEFAULT '{}', -- Searchable tags array
    "keywords" TEXT[] DEFAULT '{}', -- SEO and search keywords  
    "workflow_types" TEXT[] DEFAULT '{}', -- Associated workflow types
    "block_types" TEXT[] DEFAULT '{}', -- Associated block types
    "metadata" JSONB DEFAULT '{}', -- Additional flexible metadata
    
    -- Content attributes
    "reading_time_minutes" INTEGER, -- Estimated reading time
    "last_reviewed_at" TIMESTAMP, -- Content quality review
    "review_notes" TEXT, -- Internal review notes
    "is_outdated" BOOLEAN DEFAULT FALSE, -- Content freshness flag
    
    -- Analytics and feedback
    "view_count" INTEGER DEFAULT 0,
    "helpful_votes" INTEGER DEFAULT 0,
    "unhelpful_votes" INTEGER DEFAULT 0,
    "avg_rating" DECIMAL(3,2), -- 1.00 to 5.00 rating
    "rating_count" INTEGER DEFAULT 0,
    
    -- Vector embeddings for semantic search
    "content_embedding" vector(1536), -- OpenAI text-embedding-3-large
    "title_embedding" vector(1536), -- Separate title embedding for title matching
    "summary_embedding" vector(1536), -- Summary embedding for quick matching
    "combined_embedding" vector(1536), -- Combined content for general search
    "embedding_model" TEXT DEFAULT 'text-embedding-3-large',
    "embedding_version" TEXT DEFAULT '1.0', -- Track embedding model versions
    "embedding_last_updated" TIMESTAMP,
    
    -- Full-text search support
    "search_vector" TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', title), 'A') ||
        setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
        setweight(to_tsvector('english', content), 'C') ||
        setweight(to_tsvector('english', array_to_string(tags, ' ')), 'D')
    ) STORED,
    
    -- Authorship and ownership
    "author_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
    "author_name" TEXT, -- Display name for attribution
    "contributor_ids" TEXT[] DEFAULT '{}', -- Additional contributors
    "organization_id" TEXT REFERENCES "organization"("id") ON DELETE CASCADE,
    
    -- Content lifecycle
    "status" TEXT DEFAULT 'published' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    "published_at" TIMESTAMP,
    "scheduled_review_at" TIMESTAMP, -- Next review due date
    
    -- Timestamps
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create comprehensive indexes for optimal query performance

-- Primary access patterns
CREATE INDEX "help_content_category_idx" ON "help_content" ("category", "published_at" DESC);
CREATE INDEX "help_content_difficulty_idx" ON "help_content" ("difficulty");
CREATE INDEX "help_content_visibility_idx" ON "help_content" ("visibility");
CREATE INDEX "help_content_status_idx" ON "help_content" ("status", "published_at" DESC);

-- Hierarchical content structure
CREATE INDEX "help_content_parent_idx" ON "help_content" ("parent_id", "sort_order");

-- Content discovery and organization
CREATE INDEX "help_content_featured_idx" ON "help_content" ("featured", "view_count" DESC) WHERE featured = true;
CREATE INDEX "help_content_popular_idx" ON "help_content" ("view_count" DESC, "helpful_votes" DESC);
CREATE INDEX "help_content_rating_idx" ON "help_content" ("avg_rating" DESC, "rating_count" DESC) WHERE avg_rating IS NOT NULL;

-- Content freshness and quality
CREATE INDEX "help_content_outdated_idx" ON "help_content" ("is_outdated", "last_reviewed_at" DESC);
CREATE INDEX "help_content_review_due_idx" ON "help_content" ("scheduled_review_at") WHERE scheduled_review_at IS NOT NULL;

-- Author and organization queries
CREATE INDEX "help_content_author_idx" ON "help_content" ("author_id", "created_at" DESC);
CREATE INDEX "help_content_organization_idx" ON "help_content" ("organization_id", "status", "created_at" DESC);

-- Array-based filtering indexes
CREATE INDEX "help_content_tags_gin_idx" ON "help_content" USING gin ("tags");
CREATE INDEX "help_content_keywords_gin_idx" ON "help_content" USING gin ("keywords");
CREATE INDEX "help_content_workflow_types_gin_idx" ON "help_content" USING gin ("workflow_types");
CREATE INDEX "help_content_block_types_gin_idx" ON "help_content" USING gin ("block_types");
CREATE INDEX "help_content_contributors_gin_idx" ON "help_content" USING gin ("contributor_ids");

-- JSONB metadata index
CREATE INDEX "help_content_metadata_gin_idx" ON "help_content" USING gin ("metadata");

-- Full-text search index
CREATE INDEX "help_content_search_vector_idx" ON "help_content" USING gin ("search_vector");

-- Vector similarity search indexes (HNSW) - optimized for semantic search
CREATE INDEX "help_content_content_embedding_hnsw_idx" ON "help_content" 
    USING hnsw ("content_embedding" vector_cosine_ops) 
    WITH (m=16, ef_construction=64);

CREATE INDEX "help_content_title_embedding_hnsw_idx" ON "help_content" 
    USING hnsw ("title_embedding" vector_cosine_ops) 
    WITH (m=16, ef_construction=64);

CREATE INDEX "help_content_combined_embedding_hnsw_idx" ON "help_content" 
    USING hnsw ("combined_embedding" vector_cosine_ops) 
    WITH (m=16, ef_construction=64);

-- Composite indexes for complex queries
CREATE INDEX "help_content_category_difficulty_idx" ON "help_content" ("category", "difficulty", "published_at" DESC);
CREATE INDEX "help_content_embedding_model_idx" ON "help_content" ("embedding_model", "embedding_version", "embedding_last_updated" DESC);

-- Performance optimizations
-- Set table storage parameters for optimal performance
ALTER TABLE "help_content" SET (fillfactor = 90, autovacuum_analyze_scale_factor = 0.05);

-- Create help_content_analytics table for detailed usage tracking
CREATE TABLE IF NOT EXISTS "help_content_analytics" (
    "id" TEXT PRIMARY KEY,
    "help_content_id" TEXT NOT NULL REFERENCES "help_content"("id") ON DELETE CASCADE,
    "user_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
    "organization_id" TEXT REFERENCES "organization"("id") ON DELETE CASCADE,
    
    -- Event tracking
    "event_type" TEXT NOT NULL CHECK (event_type IN ('view', 'search_result_click', 'helpful_vote', 'unhelpful_vote', 'rating', 'share', 'bookmark')),
    "search_query" TEXT, -- Original search query that led to this content
    "search_score" DECIMAL(5,4), -- Relevance score when found via search
    "search_rank" INTEGER, -- Position in search results
    
    -- Context information
    "workflow_id" TEXT, -- Current workflow context
    "workflow_type" TEXT, -- Type of workflow user was working on
    "block_type" TEXT, -- Current block type being configured
    "user_role" TEXT, -- User's experience level at time of access
    "referrer_url" TEXT, -- How user arrived at this content
    
    -- Interaction details
    "time_spent_seconds" INTEGER, -- Time spent reading/viewing
    "scroll_percentage" INTEGER, -- How much content was consumed
    "rating_value" INTEGER CHECK (rating_value IS NULL OR (rating_value >= 1 AND rating_value <= 5)),
    "feedback_text" TEXT, -- Optional user feedback
    
    -- Technical metadata
    "user_agent" TEXT,
    "ip_address" INET,
    "session_id" TEXT,
    "device_type" TEXT, -- desktop, mobile, tablet
    
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Analytics indexes for reporting and optimization
CREATE INDEX "help_content_analytics_content_idx" ON "help_content_analytics" ("help_content_id", "created_at" DESC);
CREATE INDEX "help_content_analytics_user_idx" ON "help_content_analytics" ("user_id", "created_at" DESC);
CREATE INDEX "help_content_analytics_event_idx" ON "help_content_analytics" ("event_type", "created_at" DESC);
CREATE INDEX "help_content_analytics_search_idx" ON "help_content_analytics" ("search_query", "search_score" DESC) WHERE search_query IS NOT NULL;
CREATE INDEX "help_content_analytics_workflow_idx" ON "help_content_analytics" ("workflow_type", "block_type", "created_at" DESC);

-- Create help_content_suggestions table for ML-driven recommendations
CREATE TABLE IF NOT EXISTS "help_content_suggestions" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT REFERENCES "user"("id") ON DELETE CASCADE,
    "help_content_id" TEXT NOT NULL REFERENCES "help_content"("id") ON DELETE CASCADE,
    
    -- Suggestion context
    "suggestion_type" TEXT NOT NULL CHECK (suggestion_type IN ('contextual', 'similar_content', 'trending', 'personalized', 'workflow_specific')),
    "confidence_score" DECIMAL(5,4) NOT NULL, -- 0.0000 to 1.0000
    "relevance_factors" JSONB DEFAULT '{}', -- What made this relevant
    
    -- Context that generated suggestion
    "workflow_context" JSONB, -- Current workflow state
    "user_context" JSONB, -- User preferences and history
    "search_context" JSONB, -- Recent search patterns
    
    -- Suggestion performance tracking
    "was_clicked" BOOLEAN DEFAULT FALSE,
    "was_helpful" BOOLEAN, -- User feedback on suggestion quality
    "click_rank" INTEGER, -- Position when clicked
    
    -- Timestamps
    "suggested_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP, -- When suggestion is no longer relevant
    "clicked_at" TIMESTAMP,
    "feedback_at" TIMESTAMP
);

-- Suggestion indexes for real-time delivery
CREATE INDEX "help_content_suggestions_user_idx" ON "help_content_suggestions" ("user_id", "suggested_at" DESC);
CREATE INDEX "help_content_suggestions_content_idx" ON "help_content_suggestions" ("help_content_id", "confidence_score" DESC);
CREATE INDEX "help_content_suggestions_type_idx" ON "help_content_suggestions" ("suggestion_type", "confidence_score" DESC);
CREATE INDEX "help_content_suggestions_active_idx" ON "help_content_suggestions" ("suggested_at" DESC) WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP;

-- Performance tracking for suggestions
CREATE INDEX "help_content_suggestions_performance_idx" ON "help_content_suggestions" ("was_clicked", "was_helpful", "confidence_score" DESC);

-- Add table comments for documentation
COMMENT ON TABLE "help_content" IS 'Main help content table with vector embeddings for semantic search and contextual matching';
COMMENT ON COLUMN "help_content"."content_embedding" IS 'Vector embedding of full content for semantic similarity search';
COMMENT ON COLUMN "help_content"."combined_embedding" IS 'Combined embedding of title, summary, and content for general matching';
COMMENT ON COLUMN "help_content"."search_vector" IS 'Full-text search vector with weighted content sections';

COMMENT ON TABLE "help_content_analytics" IS 'Detailed analytics for help content usage and search performance optimization';
COMMENT ON TABLE "help_content_suggestions" IS 'ML-driven content recommendations and performance tracking';

-- Add function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_help_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER help_content_update_timestamp
    BEFORE UPDATE ON help_content
    FOR EACH ROW
    EXECUTE FUNCTION update_help_content_updated_at();

-- Insert some initial help content categories and featured content
INSERT INTO "help_content" (
    "id", "title", "content", "summary", "category", "difficulty", "slug", 
    "tags", "workflow_types", "featured", "author_name", "status", "published_at"
) VALUES 
(
    'help-getting-started-welcome',
    'Welcome to Sim - Your Workflow Automation Platform',
    'Welcome to Sim! This comprehensive guide will help you get started with building powerful workflow automations. Sim makes it easy to connect different tools and services to create automated processes that save you time and reduce manual work.\n\nIn this guide, you''ll learn:\n- How to create your first workflow\n- Understanding blocks and connections\n- Best practices for reliable automations\n- Common use cases and templates\n\nLet''s begin your automation journey!',
    'Complete introduction to Sim workflow automation platform covering basics, concepts, and getting started.',
    'getting-started',
    'beginner', 
    'welcome-to-sim',
    ARRAY['welcome', 'introduction', 'basics', 'getting-started'],
    ARRAY['all'],
    true,
    'Sim Team',
    'published',
    CURRENT_TIMESTAMP
),
(
    'help-workflow-basics-creating',
    'Creating Your First Workflow',
    'Creating workflows in Sim is intuitive and powerful. Start by understanding the core concepts:\n\n## What is a Workflow?\nA workflow is a series of connected blocks that automate a process. Each block performs a specific action, like sending an email, processing data, or calling an API.\n\n## Building Your First Workflow\n1. Click "New Workflow" in your dashboard\n2. Choose a template or start from scratch\n3. Add blocks by dragging from the sidebar\n4. Connect blocks to define the flow\n5. Configure each block''s settings\n6. Test your workflow\n7. Deploy when ready\n\n## Best Practices\n- Start simple and add complexity gradually\n- Test each step before adding the next\n- Use descriptive names for your workflows\n- Add error handling for production workflows',
    'Step-by-step guide to creating and deploying your first workflow automation.',
    'workflow-basics',
    'beginner',
    'creating-first-workflow', 
    ARRAY['workflow', 'creation', 'tutorial', 'blocks'],
    ARRAY['all'],
    true,
    'Sim Team',
    'published',
    CURRENT_TIMESTAMP
);

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Help content semantic search migration completed successfully!';
    RAISE NOTICE 'Created tables: help_content, help_content_analytics, help_content_suggestions';
    RAISE NOTICE 'Added comprehensive indexes for vector similarity search and full-text search';
    RAISE NOTICE 'Inserted initial help content entries';
END $$;