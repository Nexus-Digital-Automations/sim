-- Migration: Add collaborative workflow editing features
-- This migration adds the necessary database tables and enhancements
-- for real-time collaborative workflow editing capabilities

-- Collaboration sessions tracking
CREATE TABLE IF NOT EXISTS workflow_collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    socket_id TEXT NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW(),
    permissions TEXT NOT NULL DEFAULT 'edit', -- 'view', 'edit', 'admin'
    user_agent TEXT,
    ip_address INET,
    
    -- Foreign key constraints
    CONSTRAINT fk_workflow_collaboration_workflow 
        FOREIGN KEY (workflow_id) REFERENCES workflow(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_collaboration_user 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        
    -- Ensure one session per user per workflow per socket
    CONSTRAINT unique_user_workflow_socket UNIQUE (workflow_id, user_id, socket_id)
);

-- Element locking system for granular editing control
CREATE TABLE IF NOT EXISTS workflow_element_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT NOT NULL,
    element_type TEXT NOT NULL, -- 'block', 'edge', 'subblock', 'variable'
    element_id TEXT NOT NULL,
    locked_by_user_id TEXT NOT NULL,
    locked_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    lock_reason TEXT DEFAULT 'editing', -- 'editing', 'reviewing', 'custom'
    metadata JSONB DEFAULT '{}',
    
    -- Foreign key constraints
    CONSTRAINT fk_workflow_element_locks_workflow 
        FOREIGN KEY (workflow_id) REFERENCES workflow(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_element_locks_user 
        FOREIGN KEY (locked_by_user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        
    -- Ensure one lock per element
    CONSTRAINT unique_workflow_element_lock UNIQUE (workflow_id, element_type, element_id)
);

-- Collaborative comments system
CREATE TABLE IF NOT EXISTS workflow_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT NOT NULL,
    element_type TEXT NOT NULL, -- 'block', 'edge', 'workflow', 'variable'
    element_id TEXT, -- NULL for workflow-level comments
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    parent_comment_id UUID,
    position_x FLOAT, -- For positioning comments on canvas
    position_y FLOAT,
    metadata JSONB DEFAULT '{}',
    
    -- Foreign key constraints
    CONSTRAINT fk_workflow_comments_workflow 
        FOREIGN KEY (workflow_id) REFERENCES workflow(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_comments_author 
        FOREIGN KEY (author_id) REFERENCES "user"(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_comments_parent 
        FOREIGN KEY (parent_comment_id) REFERENCES workflow_comments(id) ON DELETE CASCADE
);

-- Live edit operations for conflict resolution and operational transform
CREATE TABLE IF NOT EXISTS workflow_live_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- 'insert', 'delete', 'update', 'move'
    operation_target TEXT NOT NULL, -- 'block', 'edge', 'property', 'subblock'
    operation_payload JSONB NOT NULL,
    author_id TEXT NOT NULL,
    timestamp_ms BIGINT NOT NULL, -- Microsecond precision timestamp for ordering
    vector_clock JSONB DEFAULT '{}', -- For operational transform
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_workflow_live_operations_workflow 
        FOREIGN KEY (workflow_id) REFERENCES workflow(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_live_operations_author 
        FOREIGN KEY (author_id) REFERENCES "user"(id) ON DELETE CASCADE
);

-- Workflow collaborator permissions (explicit collaborator management)
CREATE TABLE IF NOT EXISTS workflow_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    permission_level TEXT NOT NULL DEFAULT 'edit', -- 'view', 'edit', 'admin'
    added_by_user_id TEXT NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    last_access TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_workflow_collaborators_workflow 
        FOREIGN KEY (workflow_id) REFERENCES workflow(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_collaborators_user 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_collaborators_added_by 
        FOREIGN KEY (added_by_user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        
    -- Ensure one permission per user per workflow
    CONSTRAINT unique_workflow_collaborator UNIQUE (workflow_id, user_id)
);

-- Indexes for performance optimization

-- Collaboration sessions indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_workflow_id 
    ON workflow_collaboration_sessions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_user_id 
    ON workflow_collaboration_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_socket_id 
    ON workflow_collaboration_sessions(socket_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_last_activity 
    ON workflow_collaboration_sessions(last_activity);

-- Element locks indexes
CREATE INDEX IF NOT EXISTS idx_element_locks_workflow_id 
    ON workflow_element_locks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_element_locks_user_id 
    ON workflow_element_locks(locked_by_user_id);
CREATE INDEX IF NOT EXISTS idx_element_locks_expires_at 
    ON workflow_element_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_element_locks_element_type_id 
    ON workflow_element_locks(element_type, element_id);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_workflow_comments_workflow_id 
    ON workflow_comments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_element 
    ON workflow_comments(workflow_id, element_type, element_id);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_author_id 
    ON workflow_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_parent 
    ON workflow_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_created_at 
    ON workflow_comments(created_at);

-- Live operations indexes
CREATE INDEX IF NOT EXISTS idx_live_operations_workflow_id 
    ON workflow_live_operations(workflow_id);
CREATE INDEX IF NOT EXISTS idx_live_operations_timestamp 
    ON workflow_live_operations(workflow_id, timestamp_ms);
CREATE INDEX IF NOT EXISTS idx_live_operations_author_id 
    ON workflow_live_operations(author_id);
CREATE INDEX IF NOT EXISTS idx_live_operations_applied 
    ON workflow_live_operations(applied);

-- Collaborators indexes
CREATE INDEX IF NOT EXISTS idx_workflow_collaborators_workflow_id 
    ON workflow_collaborators(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_collaborators_user_id 
    ON workflow_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_collaborators_added_by 
    ON workflow_collaborators(added_by_user_id);

-- Add triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workflow comments
CREATE TRIGGER trigger_workflow_comments_updated_at
    BEFORE UPDATE ON workflow_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add cleanup functions for expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM workflow_element_locks 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add cleanup function for old collaboration sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions(inactive_minutes INTEGER DEFAULT 60)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM workflow_collaboration_sessions 
    WHERE last_activity < NOW() - INTERVAL '1 minute' * inactive_minutes;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments on tables for documentation
COMMENT ON TABLE workflow_collaboration_sessions IS 'Tracks active collaborative editing sessions per workflow';
COMMENT ON TABLE workflow_element_locks IS 'Manages granular locking of workflow elements during editing';
COMMENT ON TABLE workflow_comments IS 'Stores collaborative comments and discussions on workflow elements';
COMMENT ON TABLE workflow_live_operations IS 'Logs all real-time operations for conflict resolution and replay';
COMMENT ON TABLE workflow_collaborators IS 'Manages explicit collaborator permissions for workflows';

COMMENT ON COLUMN workflow_collaboration_sessions.permissions IS 'User permission level: view, edit, admin';
COMMENT ON COLUMN workflow_element_locks.element_type IS 'Type of element being locked: block, edge, subblock, variable';
COMMENT ON COLUMN workflow_element_locks.expires_at IS 'When the lock expires (prevents stale locks)';
COMMENT ON COLUMN workflow_comments.element_type IS 'Type of element comment is attached to: block, edge, workflow, variable';
COMMENT ON COLUMN workflow_live_operations.vector_clock IS 'Vector clock for operational transform conflict resolution';
COMMENT ON COLUMN workflow_live_operations.timestamp_ms IS 'High precision timestamp for operation ordering';