-- Sim Workflow Monitoring Database Schema Extensions
-- These tables extend the existing database schema to support comprehensive monitoring

-- Alert Rules table - stores configurable alert rules
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    workflow_ids TEXT[], -- Array of workflow IDs (NULL means all workflows)
    folder_ids TEXT[], -- Array of folder IDs (NULL means all folders)
    enabled BOOLEAN NOT NULL DEFAULT true,
    conditions JSONB NOT NULL, -- Array of alert conditions
    actions JSONB NOT NULL, -- Array of alert actions
    escalation_policy JSONB, -- Escalation policy configuration
    cooldown_period INTEGER NOT NULL DEFAULT 15, -- Minutes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Alert Instances table - stores triggered alert instances
CREATE TABLE IF NOT EXISTS alert_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflow(id) ON DELETE SET NULL,
    execution_id TEXT, -- References workflow execution logs
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('active', 'acknowledged', 'resolved', 'silenced')),
    triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    details JSONB, -- Condition results, metrics, etc.
    escalation_level INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Alert Notifications table - tracks sent notifications
CREATE TABLE IF NOT EXISTS alert_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alert_instances(id) ON DELETE CASCADE,
    action_id TEXT NOT NULL, -- ID from alert rule actions
    action_type TEXT NOT NULL CHECK (action_type IN ('email', 'slack', 'webhook', 'sms', 'dashboard_notification')),
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'delivered', 'bounced')),
    details JSONB, -- Delivery details, error messages, etc.
    error_message TEXT,
    escalation_level INTEGER DEFAULT 0
);

-- Performance Metrics table - stores aggregated performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id TEXT NOT NULL,
    workflow_id UUID NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
    block_id TEXT,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('execution_time', 'cpu_usage', 'memory_usage', 'network_usage', 'throughput', 'error_rate')),
    value NUMERIC NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    time_window TEXT, -- For aggregated metrics: '5m', '1h', '1d', etc.
    aggregation_type TEXT CHECK (aggregation_type IN ('instant', 'avg', 'sum', 'max', 'min', 'count')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Monitoring Dashboards table - stores custom dashboard configurations
CREATE TABLE IF NOT EXISTS monitoring_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    layout JSONB NOT NULL, -- Dashboard layout configuration
    widgets JSONB NOT NULL, -- Widget configurations
    filters JSONB, -- Default dashboard filters
    refresh_interval INTEGER DEFAULT 30, -- Seconds
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Debug Sessions table - stores debugging session data
CREATE TABLE IF NOT EXISTS debug_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id TEXT NOT NULL,
    workflow_id UUID NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
    breakpoints JSONB DEFAULT '[]', -- Array of breakpoint configurations
    variable_inspections JSONB DEFAULT '[]', -- Array of variable inspection records
    execution_steps JSONB DEFAULT '[]', -- Array of execution steps for timeline
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Execution Replays table - stores workflow execution replay data
CREATE TABLE IF NOT EXISTS execution_replays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_execution_id TEXT NOT NULL,
    new_execution_id TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    options JSONB NOT NULL, -- Replay configuration options
    status TEXT NOT NULL CHECK (status IN ('preparing', 'running', 'completed', 'failed')),
    differences JSONB DEFAULT '[]', -- Array of execution differences
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Monitoring Events table - stores system monitoring events for audit trail
CREATE TABLE IF NOT EXISTS monitoring_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'alert_triggered', 'rule_created', 'debug_session_started', etc.
    source TEXT NOT NULL CHECK (source IN ('execution', 'alert', 'performance', 'system', 'user')),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_id TEXT, -- ID of related entity (alert, rule, session, etc.)
    entity_type TEXT, -- Type of entity
    event_data JSONB, -- Event-specific data
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Business Metrics Snapshots table - stores periodic business metrics snapshots
CREATE TABLE IF NOT EXISTS business_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    snapshot_hour INTEGER, -- Hour of day for hourly snapshots (0-23)
    metrics JSONB NOT NULL, -- Business metrics data
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(workspace_id, snapshot_date, snapshot_hour)
);

-- Workflow Analytics Cache table - caches analytics calculations
CREATE TABLE IF NOT EXISTS workflow_analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
    time_range_start TIMESTAMP NOT NULL,
    time_range_end TIMESTAMP NOT NULL,
    granularity TEXT NOT NULL,
    analytics_data JSONB NOT NULL,
    cached_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    
    UNIQUE(workflow_id, time_range_start, time_range_end, granularity)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alert_rules_workspace_id ON alert_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_created_at ON alert_rules(created_at);

CREATE INDEX IF NOT EXISTS idx_alert_instances_rule_id ON alert_instances(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_instances_status ON alert_instances(status);
CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered_at ON alert_instances(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_instances_workflow_id ON alert_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_alert_instances_execution_id ON alert_instances(execution_id);

CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert_id ON alert_notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_sent_at ON alert_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_status ON alert_notifications(status);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_execution_id ON performance_metrics(execution_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_workflow_id ON performance_metrics(workflow_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_block_id ON performance_metrics(block_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_dashboards_workspace_id ON monitoring_dashboards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_dashboards_created_by ON monitoring_dashboards(created_by);

CREATE INDEX IF NOT EXISTS idx_debug_sessions_execution_id ON debug_sessions(execution_id);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_workflow_id ON debug_sessions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_user_id ON debug_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_status ON debug_sessions(status);

CREATE INDEX IF NOT EXISTS idx_execution_replays_original_execution_id ON execution_replays(original_execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_replays_user_id ON execution_replays(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_replays_status ON execution_replays(status);

CREATE INDEX IF NOT EXISTS idx_monitoring_events_event_type ON monitoring_events(event_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_source ON monitoring_events(source);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_workspace_id ON monitoring_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_timestamp ON monitoring_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_entity_id ON monitoring_events(entity_id);

CREATE INDEX IF NOT EXISTS idx_business_metrics_snapshots_workspace_id ON business_metrics_snapshots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_business_metrics_snapshots_snapshot_date ON business_metrics_snapshots(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_workflow_analytics_cache_workflow_id ON workflow_analytics_cache(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_cache_expires_at ON workflow_analytics_cache(expires_at);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_alert_rules_updated_at 
    BEFORE UPDATE ON alert_rules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_dashboards_updated_at 
    BEFORE UPDATE ON monitoring_dashboards 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function for cleaning up old data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_date TIMESTAMP;
BEGIN
    cutoff_date := NOW() - INTERVAL '1 day' * retention_days;
    
    -- Clean up resolved alert instances older than retention period
    DELETE FROM alert_instances 
    WHERE status = 'resolved' 
    AND resolved_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old performance metrics
    DELETE FROM performance_metrics 
    WHERE created_at < cutoff_date;
    
    -- Clean up completed debug sessions
    DELETE FROM debug_sessions 
    WHERE status IN ('completed', 'cancelled') 
    AND completed_at < cutoff_date;
    
    -- Clean up completed execution replays
    DELETE FROM execution_replays 
    WHERE status IN ('completed', 'failed') 
    AND completed_at < cutoff_date;
    
    -- Clean up old monitoring events
    DELETE FROM monitoring_events 
    WHERE created_at < cutoff_date;
    
    -- Clean up expired analytics cache
    DELETE FROM workflow_analytics_cache 
    WHERE expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for alert rule summary with statistics
CREATE OR REPLACE VIEW alert_rules_summary AS
SELECT 
    ar.id,
    ar.name,
    ar.description,
    ar.workspace_id,
    ar.enabled,
    ar.created_at,
    ar.updated_at,
    ar.created_by,
    COUNT(ai.id) as total_alerts,
    COUNT(CASE WHEN ai.status = 'active' THEN 1 END) as active_alerts,
    COUNT(CASE WHEN ai.status = 'resolved' THEN 1 END) as resolved_alerts,
    MAX(ai.triggered_at) as last_triggered_at
FROM alert_rules ar
LEFT JOIN alert_instances ai ON ar.id = ai.rule_id
GROUP BY ar.id, ar.name, ar.description, ar.workspace_id, ar.enabled, ar.created_at, ar.updated_at, ar.created_by;

-- Create a view for performance metrics summary
CREATE OR REPLACE VIEW performance_metrics_summary AS
SELECT 
    workflow_id,
    block_id,
    DATE_TRUNC('hour', timestamp) as hour,
    metric_type,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as measurement_count
FROM performance_metrics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY workflow_id, block_id, DATE_TRUNC('hour', timestamp), metric_type
ORDER BY hour DESC;

-- Create a view for workflow execution health
CREATE OR REPLACE VIEW workflow_execution_health AS
SELECT 
    w.id as workflow_id,
    w.name as workflow_name,
    w.workspace_id,
    COUNT(wel.id) as total_executions_24h,
    COUNT(CASE WHEN wel.level = 'error' THEN 1 END) as failed_executions_24h,
    ROUND(
        (COUNT(CASE WHEN wel.level = 'info' THEN 1 END)::NUMERIC / NULLIF(COUNT(wel.id), 0)) * 100, 
        2
    ) as success_rate_24h,
    AVG(wel.total_duration_ms) as avg_duration_ms_24h,
    COUNT(CASE WHEN ai.status = 'active' THEN 1 END) as active_alerts
FROM workflow w
LEFT JOIN workflow_execution_logs wel ON w.id = wel.workflow_id 
    AND wel.started_at >= NOW() - INTERVAL '24 hours'
LEFT JOIN alert_instances ai ON w.id::TEXT = ai.workflow_id::TEXT 
    AND ai.status = 'active'
GROUP BY w.id, w.name, w.workspace_id
ORDER BY total_executions_24h DESC;

-- Comments for documentation
COMMENT ON TABLE alert_rules IS 'Stores configurable alert rules for workflow monitoring';
COMMENT ON TABLE alert_instances IS 'Records of triggered alerts with their current status';
COMMENT ON TABLE alert_notifications IS 'Track all notifications sent for alerts';
COMMENT ON TABLE performance_metrics IS 'Stores performance metrics collected during workflow execution';
COMMENT ON TABLE monitoring_dashboards IS 'Custom monitoring dashboards configurations';
COMMENT ON TABLE debug_sessions IS 'Debug sessions for step-by-step workflow execution analysis';
COMMENT ON TABLE execution_replays IS 'Records of workflow execution replays for debugging';
COMMENT ON TABLE monitoring_events IS 'Audit trail of monitoring system events';
COMMENT ON TABLE business_metrics_snapshots IS 'Periodic snapshots of business metrics for trend analysis';
COMMENT ON TABLE workflow_analytics_cache IS 'Cached analytics calculations to improve performance';

COMMENT ON VIEW alert_rules_summary IS 'Summary view of alert rules with statistics';
COMMENT ON VIEW performance_metrics_summary IS 'Hourly performance metrics aggregation for the last 24 hours';
COMMENT ON VIEW workflow_execution_health IS 'Health overview of workflows with execution statistics and active alerts';