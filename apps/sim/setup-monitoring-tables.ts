#!/usr/bin/env tsx

/**
 * Setup script to create monitoring system database tables directly
 */

import { db } from './db/index';

async function createMonitoringTables() {
  console.log('🚀 Creating monitoring system database tables...');

  try {
    // Create alert_rules table
    console.log('Creating alert_rules table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS alert_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          workspace_id UUID NOT NULL,
          workflow_ids TEXT[],
          folder_ids TEXT[],
          enabled BOOLEAN NOT NULL DEFAULT true,
          conditions JSONB NOT NULL,
          actions JSONB NOT NULL,
          escalation_policy JSONB,
          cooldown_period INTEGER NOT NULL DEFAULT 15,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by UUID NOT NULL
      )
    `);

    // Create alert_instances table
    console.log('Creating alert_instances table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS alert_instances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          rule_id UUID NOT NULL,
          workflow_id UUID,
          execution_id TEXT,
          severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          status TEXT NOT NULL CHECK (status IN ('active', 'acknowledged', 'resolved', 'silenced')),
          triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
          resolved_at TIMESTAMP,
          acknowledged_at TIMESTAMP,
          acknowledged_by UUID,
          message TEXT NOT NULL,
          details JSONB,
          escalation_level INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create alert_notifications table
    console.log('Creating alert_notifications table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS alert_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          alert_id UUID NOT NULL,
          action_id TEXT NOT NULL,
          action_type TEXT NOT NULL CHECK (action_type IN ('email', 'slack', 'webhook', 'sms', 'dashboard_notification')),
          sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
          status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'delivered', 'bounced')),
          details JSONB,
          error_message TEXT,
          escalation_level INTEGER DEFAULT 0
      )
    `);

    // Create performance_metrics table
    console.log('Creating performance_metrics table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          execution_id TEXT NOT NULL,
          workflow_id UUID NOT NULL,
          block_id TEXT,
          metric_type TEXT NOT NULL CHECK (metric_type IN ('execution_time', 'cpu_usage', 'memory_usage', 'network_usage', 'throughput', 'error_rate')),
          value NUMERIC NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          time_window TEXT,
          aggregation_type TEXT CHECK (aggregation_type IN ('instant', 'avg', 'sum', 'max', 'min', 'count')),
          created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create workflow_executions_monitoring table
    console.log('Creating workflow_executions_monitoring table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS workflow_executions_monitoring (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          execution_id TEXT NOT NULL UNIQUE,
          workflow_id UUID NOT NULL,
          workflow_name TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
          progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
          trigger_type TEXT NOT NULL,
          user_id UUID NOT NULL,
          workspace_id UUID NOT NULL,
          started_at TIMESTAMP NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP,
          current_block_id TEXT,
          current_block_name TEXT,
          current_block_type TEXT,
          current_block_started_at TIMESTAMP,
          estimated_completion TIMESTAMP,
          total_blocks INTEGER,
          completed_blocks INTEGER DEFAULT 0,
          error_details JSONB,
          final_result JSONB,
          resource_usage JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create workflow_execution_steps table
    console.log('Creating workflow_execution_steps table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS workflow_execution_steps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          execution_id TEXT NOT NULL,
          workflow_id UUID NOT NULL,
          block_id TEXT NOT NULL,
          block_name TEXT NOT NULL,
          block_type TEXT NOT NULL,
          step_number INTEGER NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          execution_time_ms INTEGER,
          input_data JSONB,
          output_data JSONB,
          error_details JSONB,
          resource_usage JSONB,
          created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create monitoring_dashboards table
    console.log('Creating monitoring_dashboards table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS monitoring_dashboards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          workspace_id UUID NOT NULL,
          layout JSONB NOT NULL,
          widgets JSONB NOT NULL,
          filters JSONB,
          refresh_interval INTEGER DEFAULT 30,
          is_public BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by UUID NOT NULL
      )
    `);

    // Create debug_sessions table
    console.log('Creating debug_sessions table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS debug_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          execution_id TEXT NOT NULL,
          workflow_id UUID NOT NULL,
          user_id UUID NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
          breakpoints JSONB DEFAULT '[]',
          variable_inspections JSONB DEFAULT '[]',
          execution_steps JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          completed_at TIMESTAMP
      )
    `);

    // Create execution_replays table
    console.log('Creating execution_replays table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS execution_replays (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          original_execution_id TEXT NOT NULL,
          new_execution_id TEXT,
          user_id UUID NOT NULL,
          options JSONB NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('preparing', 'running', 'completed', 'failed')),
          differences JSONB DEFAULT '[]',
          started_at TIMESTAMP NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create monitoring_events table
    console.log('Creating monitoring_events table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS monitoring_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_type TEXT NOT NULL,
          source TEXT NOT NULL CHECK (source IN ('execution', 'alert', 'performance', 'system', 'user')),
          workspace_id UUID,
          user_id UUID,
          entity_id TEXT,
          entity_type TEXT,
          event_data JSONB,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create business_metrics_snapshots table
    console.log('Creating business_metrics_snapshots table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS business_metrics_snapshots (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL,
          snapshot_date DATE NOT NULL,
          snapshot_hour INTEGER,
          metrics JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          
          UNIQUE(workspace_id, snapshot_date, snapshot_hour)
      )
    `);

    // Create workflow_analytics_cache table
    console.log('Creating workflow_analytics_cache table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS workflow_analytics_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID NOT NULL,
          time_range_start TIMESTAMP NOT NULL,
          time_range_end TIMESTAMP NOT NULL,
          granularity TEXT NOT NULL,
          analytics_data JSONB NOT NULL,
          cached_at TIMESTAMP NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMP NOT NULL,
          
          UNIQUE(workflow_id, time_range_start, time_range_end, granularity)
      )
    `);

    console.log('Creating indexes...');

    // Create essential indexes
    await db.execute('CREATE INDEX IF NOT EXISTS idx_alert_rules_workspace_id ON alert_rules(workspace_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_alert_instances_rule_id ON alert_instances(rule_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_performance_metrics_execution_id ON performance_metrics(execution_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_workflow_executions_monitoring_workspace_id ON workflow_executions_monitoring(workspace_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_workflow_execution_steps_execution_id ON workflow_execution_steps(execution_id)');

    console.log('✅ All monitoring tables created successfully!');

    // Verify tables exist
    console.log('🧪 Verifying table creation...');
    const tables = [
      'alert_rules',
      'alert_instances',
      'alert_notifications', 
      'performance_metrics',
      'workflow_executions_monitoring',
      'workflow_execution_steps',
      'monitoring_dashboards',
      'debug_sessions',
      'execution_replays',
      'monitoring_events',
      'business_metrics_snapshots',
      'workflow_analytics_cache'
    ];

    for (const table of tables) {
      try {
        const result = await db.execute(`SELECT 1 FROM ${table} LIMIT 0`);
        console.log(`✅ Table ${table} exists and accessible`);
      } catch (error) {
        console.log(`❌ Table ${table} verification failed:`, error);
      }
    }

    console.log('🎉 Monitoring system database setup completed successfully!');

  } catch (error) {
    console.error('❌ Failed to create monitoring tables:', error);
    throw error;
  }
}

createMonitoringTables().catch(console.error);