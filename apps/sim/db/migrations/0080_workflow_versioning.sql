-- Migration: 0080_workflow_versioning.sql
-- Description: Add comprehensive workflow versioning and history tracking system
-- This migration creates dedicated tables for workflow version management, change tracking, and history

-- Create workflow_versions table for storing workflow versions with semantic versioning
CREATE TABLE workflow_versions (
  id text PRIMARY KEY,
  workflow_id text NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
  
  -- Semantic versioning fields
  version_number text NOT NULL, -- e.g., "1.2.3"
  version_major integer NOT NULL DEFAULT 0,
  version_minor integer NOT NULL DEFAULT 0, 
  version_patch integer NOT NULL DEFAULT 1,
  
  -- Version metadata
  version_type text NOT NULL CHECK (version_type IN ('auto', 'manual', 'checkpoint', 'branch')),
  version_tag text, -- optional tag like 'stable', 'beta', 'production'
  version_description text,
  change_summary jsonb DEFAULT '{}',
  
  -- Workflow state storage
  workflow_state jsonb NOT NULL,
  state_hash text NOT NULL,
  state_size integer NOT NULL,
  compression_type text DEFAULT 'none' CHECK (compression_type IN ('none', 'gzip', 'delta')),
  
  -- Version relationships
  parent_version_id text REFERENCES workflow_versions(id),
  branch_name text DEFAULT 'main',
  
  -- Audit fields
  created_by_user_id text REFERENCES "user"(id),
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  
  -- Status flags
  is_current boolean DEFAULT false,
  is_deployed boolean DEFAULT false,
  deployed_at timestamp,
  
  -- Performance metadata
  creation_duration_ms integer,
  serialization_time_ms integer
);

-- Create indexes for workflow_versions table
CREATE INDEX idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX idx_workflow_versions_version_number ON workflow_versions(workflow_id, version_major DESC, version_minor DESC, version_patch DESC);
CREATE INDEX idx_workflow_versions_created_at ON workflow_versions(workflow_id, created_at DESC);
CREATE INDEX idx_workflow_versions_current ON workflow_versions(workflow_id, is_current) WHERE is_current = true;
CREATE INDEX idx_workflow_versions_deployed ON workflow_versions(workflow_id, is_deployed) WHERE is_deployed = true;
CREATE INDEX idx_workflow_versions_branch ON workflow_versions(workflow_id, branch_name);
CREATE INDEX idx_workflow_versions_type ON workflow_versions(workflow_id, version_type);
CREATE INDEX idx_workflow_versions_hash ON workflow_versions(state_hash);

-- Create unique constraints
CREATE UNIQUE INDEX idx_workflow_versions_unique_version ON workflow_versions(workflow_id, version_number);
CREATE UNIQUE INDEX idx_workflow_versions_unique_current ON workflow_versions(workflow_id) WHERE is_current = true;

-- Create workflow_version_changes table for detailed change tracking
CREATE TABLE workflow_version_changes (
  id text PRIMARY KEY,
  version_id text NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  
  -- Change classification
  change_type text NOT NULL CHECK (change_type IN (
    'block_added', 'block_removed', 'block_modified', 'block_moved',
    'edge_added', 'edge_removed', 'edge_modified',
    'loop_added', 'loop_removed', 'loop_modified', 
    'parallel_added', 'parallel_removed', 'parallel_modified',
    'metadata_modified', 'variable_added', 'variable_removed', 'variable_modified',
    'permission_changed', 'deployment_changed'
  )),
  
  -- Entity identification
  entity_type text NOT NULL CHECK (entity_type IN ('block', 'edge', 'loop', 'parallel', 'metadata', 'variable', 'permission')),
  entity_id text NOT NULL,
  entity_name text, -- Human-readable entity name for UI display
  
  -- Change data
  old_data jsonb,
  new_data jsonb,
  change_description text,
  
  -- Change impact assessment
  impact_level text CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  breaking_change boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamp NOT NULL DEFAULT NOW()
);

-- Create indexes for workflow_version_changes table
CREATE INDEX idx_version_changes_version_id ON workflow_version_changes(version_id);
CREATE INDEX idx_version_changes_type ON workflow_version_changes(version_id, change_type);
CREATE INDEX idx_version_changes_entity ON workflow_version_changes(version_id, entity_type, entity_id);
CREATE INDEX idx_version_changes_impact ON workflow_version_changes(version_id, impact_level);
CREATE INDEX idx_version_changes_breaking ON workflow_version_changes(version_id, breaking_change) WHERE breaking_change = true;

-- Create workflow_version_activity table for activity timeline tracking
CREATE TABLE workflow_version_activity (
  id text PRIMARY KEY,
  workflow_id text NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
  version_id text REFERENCES workflow_versions(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type text NOT NULL CHECK (activity_type IN (
    'version_created', 'version_restored', 'version_deleted', 'version_tagged',
    'checkpoint_created', 'branch_created', 'branch_merged',
    'conflict_resolved', 'backup_created', 'backup_restored'
  )),
  activity_description text NOT NULL,
  activity_details jsonb DEFAULT '{}',
  
  -- User context
  user_id text REFERENCES "user"(id),
  user_agent text,
  ip_address text,
  
  -- Related entities
  related_version_id text REFERENCES workflow_versions(id),
  related_entity_type text,
  related_entity_id text,
  
  -- Timestamps
  created_at timestamp NOT NULL DEFAULT NOW()
);

-- Create indexes for workflow_version_activity table  
CREATE INDEX idx_version_activity_workflow_id ON workflow_version_activity(workflow_id, created_at DESC);
CREATE INDEX idx_version_activity_version_id ON workflow_version_activity(version_id, created_at DESC);
CREATE INDEX idx_version_activity_user_id ON workflow_version_activity(user_id, created_at DESC);
CREATE INDEX idx_version_activity_type ON workflow_version_activity(workflow_id, activity_type);

-- Create workflow_version_conflicts table for conflict resolution tracking
CREATE TABLE workflow_version_conflicts (
  id text PRIMARY KEY,
  workflow_id text NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
  source_version_id text NOT NULL REFERENCES workflow_versions(id),
  target_version_id text NOT NULL REFERENCES workflow_versions(id),
  
  -- Conflict details
  conflict_type text NOT NULL CHECK (conflict_type IN (
    'block_conflict', 'edge_conflict', 'metadata_conflict', 'structural_conflict'
  )),
  entity_path text NOT NULL, -- JSON path to conflicting entity
  conflict_description text,
  
  -- Resolution data
  resolution_strategy text CHECK (resolution_strategy IN (
    'use_source', 'use_target', 'merge_auto', 'merge_manual', 'create_branch'
  )),
  resolution_data jsonb,
  resolved_by_user_id text REFERENCES "user"(id),
  resolved_at timestamp,
  
  -- Status
  status text DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'resolved', 'deferred')),
  
  -- Timestamps
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

-- Create indexes for workflow_version_conflicts table
CREATE INDEX idx_version_conflicts_workflow ON workflow_version_conflicts(workflow_id, status);
CREATE INDEX idx_version_conflicts_source ON workflow_version_conflicts(source_version_id);
CREATE INDEX idx_version_conflicts_target ON workflow_version_conflicts(target_version_id);
CREATE INDEX idx_version_conflicts_status ON workflow_version_conflicts(status, created_at DESC);

-- Create workflow_version_tags table for version tagging system
CREATE TABLE workflow_version_tags (
  id text PRIMARY KEY,
  version_id text NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  
  -- Tag details
  tag_name text NOT NULL,
  tag_color text DEFAULT '#6B7280',
  tag_description text,
  
  -- Tag metadata
  is_system_tag boolean DEFAULT false, -- System tags vs user tags
  tag_order integer DEFAULT 0,
  
  -- Audit
  created_by_user_id text REFERENCES "user"(id),
  created_at timestamp NOT NULL DEFAULT NOW(),
  
  UNIQUE(version_id, tag_name)
);

-- Create indexes for workflow_version_tags table
CREATE INDEX idx_version_tags_version_id ON workflow_version_tags(version_id);
CREATE INDEX idx_version_tags_name ON workflow_version_tags(tag_name);
CREATE INDEX idx_version_tags_system ON workflow_version_tags(is_system_tag);

-- Create workflow_version_stats table for analytics and performance tracking
CREATE TABLE workflow_version_stats (
  id text PRIMARY KEY,
  workflow_id text NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
  version_id text REFERENCES workflow_versions(id) ON DELETE CASCADE,
  
  -- Version statistics
  total_versions integer DEFAULT 0,
  total_storage_bytes bigint DEFAULT 0,
  avg_version_size_bytes integer DEFAULT 0,
  
  -- Change statistics  
  total_changes integer DEFAULT 0,
  breaking_changes integer DEFAULT 0,
  blocks_added integer DEFAULT 0,
  blocks_removed integer DEFAULT 0,
  blocks_modified integer DEFAULT 0,
  
  -- Usage statistics
  restore_count integer DEFAULT 0,
  comparison_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  
  -- Performance metrics
  avg_creation_time_ms integer DEFAULT 0,
  avg_restore_time_ms integer DEFAULT 0,
  
  -- Time windows
  stats_period text DEFAULT 'all_time', -- 'all_time', 'last_30_days', 'last_7_days'
  calculated_at timestamp NOT NULL DEFAULT NOW(),
  
  UNIQUE(workflow_id, version_id, stats_period)
);

-- Create indexes for workflow_version_stats table
CREATE INDEX idx_version_stats_workflow ON workflow_version_stats(workflow_id, stats_period);
CREATE INDEX idx_version_stats_calculated ON workflow_version_stats(calculated_at DESC);

-- Add trigger to automatically update workflow.updatedAt when versions are created
CREATE OR REPLACE FUNCTION update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workflow 
  SET "updatedAt" = NOW() 
  WHERE id = NEW.workflow_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workflow_on_version_create
  AFTER INSERT ON workflow_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

-- Add trigger to ensure only one current version per workflow
CREATE OR REPLACE FUNCTION ensure_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE workflow_versions 
    SET is_current = false 
    WHERE workflow_id = NEW.workflow_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_current_version
  BEFORE INSERT OR UPDATE ON workflow_versions
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION ensure_single_current_version();

-- Create function to automatically increment version numbers
CREATE OR REPLACE FUNCTION get_next_version_number(
  p_workflow_id text,
  p_increment_type text DEFAULT 'patch'
) RETURNS text AS $$
DECLARE
  current_major integer := 0;
  current_minor integer := 0;
  current_patch integer := 0;
  next_version text;
BEGIN
  -- Get the latest version numbers for this workflow
  SELECT version_major, version_minor, version_patch
  INTO current_major, current_minor, current_patch
  FROM workflow_versions
  WHERE workflow_id = p_workflow_id
  ORDER BY version_major DESC, version_minor DESC, version_patch DESC
  LIMIT 1;
  
  -- Handle case where no versions exist yet
  IF current_major IS NULL THEN
    current_major := 1;
    current_minor := 0;
    current_patch := 0;
  END IF;
  
  -- Increment based on type
  CASE p_increment_type
    WHEN 'major' THEN
      current_major := current_major + 1;
      current_minor := 0;
      current_patch := 0;
    WHEN 'minor' THEN  
      current_minor := current_minor + 1;
      current_patch := 0;
    ELSE -- 'patch' is default
      current_patch := current_patch + 1;
  END CASE;
  
  -- Format version string
  next_version := current_major || '.' || current_minor || '.' || current_patch;
  
  RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate state hash for deduplication
CREATE OR REPLACE FUNCTION calculate_workflow_state_hash(workflow_state_json jsonb) 
RETURNS text AS $$
BEGIN
  RETURN encode(sha256(workflow_state_json::text::bytea), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE workflow_versions IS 'Stores workflow versions with semantic versioning and full state snapshots';
COMMENT ON TABLE workflow_version_changes IS 'Tracks detailed changes between workflow versions';
COMMENT ON TABLE workflow_version_activity IS 'Maintains activity timeline for workflow version operations';
COMMENT ON TABLE workflow_version_conflicts IS 'Manages conflicts during version merge/restore operations';
COMMENT ON TABLE workflow_version_tags IS 'Provides tagging system for workflow versions';
COMMENT ON TABLE workflow_version_stats IS 'Analytics and performance metrics for workflow versioning';

-- Add initial system tags
INSERT INTO workflow_version_tags (id, version_id, tag_name, tag_color, is_system_tag, created_at)
SELECT 
  'system_tag_' || generate_random_uuid()::text,
  id,
  'initial',
  '#10B981',
  true,
  created_at
FROM workflow_versions WHERE version_number = '1.0.0';