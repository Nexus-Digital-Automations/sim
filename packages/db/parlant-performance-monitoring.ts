/**
 * Parlant Performance Monitoring and Query Analysis Framework
 *
 * This file implements comprehensive performance monitoring, query analysis,
 * and optimization recommendations for the Parlant database schema extension.
 *
 * MONITORING OBJECTIVES:
 * 1. Track query performance patterns and bottlenecks
 * 2. Monitor workspace isolation effectiveness
 * 3. Analyze index usage and optimization opportunities
 * 4. Provide real-time performance alerts and recommendations
 * 5. Generate performance regression testing data
 */

import { type SQL, sql } from 'drizzle-orm'
import { index, type PgTableWithColumns } from 'drizzle-orm/pg-core'

/**
 * PERFORMANCE MONITORING VIEWS
 * Comprehensive views for tracking database performance
 */

/**
 * Query Performance Monitoring
 * Track slow queries and performance patterns
 */
export const performanceMonitoringViews = {
  // Slow query monitoring for Parlant tables
  parlantSlowQueries: sql`
    CREATE OR REPLACE VIEW parlant_slow_queries AS
    SELECT
      query,
      calls,
      total_time,
      mean_time,
      max_time,
      min_time,
      stddev_time,
      rows,
      100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
    FROM pg_stat_statements
    WHERE query ~* 'parlant_(agent|session|event|tool|journey|guideline|variable|term|canned_response)'
      AND calls > 10  -- Only queries executed more than 10 times
      AND mean_time > 100  -- Only queries taking more than 100ms on average
    ORDER BY mean_time DESC;
  `,

  // Index usage statistics for Parlant tables
  parlantIndexUsage: sql`
    CREATE OR REPLACE VIEW parlant_index_usage AS
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan,
      idx_tup_read,
      idx_tup_fetch,
      pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
      CASE
        WHEN idx_scan = 0 THEN 'Unused'
        WHEN idx_scan < 10 THEN 'Low Usage'
        WHEN idx_scan < 100 THEN 'Moderate Usage'
        ELSE 'High Usage'
      END AS usage_category
    FROM pg_stat_user_indexes
    WHERE tablename LIKE 'parlant_%'
    ORDER BY tablename, idx_scan DESC;
  `,

  // Table performance statistics
  parlantTableStats: sql`
    CREATE OR REPLACE VIEW parlant_table_stats AS
    SELECT
      schemaname,
      tablename,
      seq_scan,
      seq_tup_read,
      idx_scan,
      idx_tup_fetch,
      n_tup_ins,
      n_tup_upd,
      n_tup_del,
      n_tup_hot_upd,
      n_live_tup,
      n_dead_tup,
      pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
      pg_size_pretty(pg_relation_size(relid)) AS table_size,
      last_vacuum,
      last_autovacuum,
      last_analyze,
      last_autoanalyze
    FROM pg_stat_user_tables
    WHERE tablename LIKE 'parlant_%'
    ORDER BY pg_total_relation_size(relid) DESC;
  `,

  // Workspace query performance analysis
  workspaceQueryPerformance: sql`
    CREATE OR REPLACE VIEW workspace_query_performance AS
    SELECT
      'agent' AS table_name,
      COUNT(*) as total_queries,
      AVG(pg_stat_get_tuples_returned(c.oid)) as avg_rows_returned,
      SUM(pg_stat_get_tuples_returned(c.oid)) as total_rows_returned,
      pg_size_pretty(pg_total_relation_size(c.oid)) as table_size
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'parlant_agent'
      AND n.nspname = 'public'
    UNION ALL
    SELECT
      'session' AS table_name,
      COUNT(*) as total_queries,
      AVG(pg_stat_get_tuples_returned(c.oid)) as avg_rows_returned,
      SUM(pg_stat_get_tuples_returned(c.oid)) as total_rows_returned,
      pg_size_pretty(pg_total_relation_size(c.oid)) as table_size
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'parlant_session'
      AND n.nspname = 'public'
    UNION ALL
    SELECT
      'event' AS table_name,
      COUNT(*) as total_queries,
      AVG(pg_stat_get_tuples_returned(c.oid)) as avg_rows_returned,
      SUM(pg_stat_get_tuples_returned(c.oid)) as total_rows_returned,
      pg_size_pretty(pg_total_relation_size(c.oid)) as table_size
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'parlant_event'
      AND n.nspname = 'public';
  `
}

/**
 * REAL-TIME PERFORMANCE MONITORING FUNCTIONS
 * Functions for live performance analysis and alerting
 */
export const performanceMonitoringFunctions = {
  // Monitor active queries hitting Parlant tables
  monitorActiveParlantQueries: sql`
    CREATE OR REPLACE FUNCTION monitor_active_parlant_queries()
    RETURNS TABLE(
      pid integer,
      duration interval,
      query text,
      state text,
      wait_event text,
      backend_type text
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        pa.pid,
        NOW() - pa.query_start AS duration,
        pa.query,
        pa.state,
        pa.wait_event,
        pa.backend_type
      FROM pg_stat_activity pa
      WHERE pa.query ~* 'parlant_(agent|session|event|tool|journey|guideline|variable|term|canned_response)'
        AND pa.state != 'idle'
        AND pa.pid != pg_backend_pid()
      ORDER BY pa.query_start;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Detect missing workspace_id filters (security breach detection)
  detectMissingWorkspaceFilters: sql`
    CREATE OR REPLACE FUNCTION detect_missing_workspace_filters()
    RETURNS TABLE(
      query text,
      calls bigint,
      mean_time numeric,
      risk_level text
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        pss.query,
        pss.calls,
        pss.mean_time,
        CASE
          WHEN pss.query ~* 'parlant_(agent|session|tool)'
               AND NOT pss.query ~* 'workspace_id'
               AND pss.calls > 5
          THEN 'HIGH RISK - Missing workspace isolation'
          WHEN pss.query ~* 'parlant_'
               AND NOT pss.query ~* 'workspace_id|agent_id|session_id'
               AND pss.calls > 10
          THEN 'MEDIUM RISK - Potential workspace leak'
          ELSE 'LOW RISK'
        END as risk_level
      FROM pg_stat_statements pss
      WHERE pss.query ~* 'parlant_'
        AND pss.calls > 5
      ORDER BY
        CASE
          WHEN pss.query ~* 'workspace_id' THEN 0
          ELSE 1
        END,
        pss.mean_time DESC;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Analyze index effectiveness for workspace isolation
  analyzeWorkspaceIndexEffectiveness: sql`
    CREATE OR REPLACE FUNCTION analyze_workspace_index_effectiveness()
    RETURNS TABLE(
      table_name text,
      index_name text,
      scans bigint,
      tuples_read bigint,
      tuples_fetched bigint,
      effectiveness_score numeric,
      recommendation text
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        psi.tablename::text,
        psi.indexname::text,
        psi.idx_scan,
        psi.idx_tup_read,
        psi.idx_tup_fetch,
        CASE
          WHEN psi.idx_scan = 0 THEN 0
          ELSE ROUND((psi.idx_tup_fetch::numeric / psi.idx_tup_read::numeric) * 100, 2)
        END as effectiveness_score,
        CASE
          WHEN psi.idx_scan = 0 THEN 'Consider dropping unused index'
          WHEN psi.idx_scan < 10 THEN 'Low usage - monitor for removal'
          WHEN psi.idx_tup_fetch::numeric / psi.idx_tup_read::numeric < 0.1 THEN 'Poor selectivity - consider composite index'
          WHEN psi.indexname LIKE '%workspace%' AND psi.idx_scan > 100 THEN 'Excellent workspace isolation performance'
          ELSE 'Good performance'
        END as recommendation
      FROM pg_stat_user_indexes psi
      WHERE psi.tablename LIKE 'parlant_%'
      ORDER BY psi.idx_scan DESC;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Generate performance optimization recommendations
  generatePerformanceRecommendations: sql`
    CREATE OR REPLACE FUNCTION generate_performance_recommendations()
    RETURNS TABLE(
      category text,
      priority integer,
      table_name text,
      issue text,
      recommendation text,
      estimated_impact text
    ) AS $$
    BEGIN
      -- Index recommendations
      RETURN QUERY
      SELECT
        'Index Optimization'::text as category,
        1 as priority,
        psi.tablename::text,
        'Unused index detected'::text as issue,
        'DROP INDEX ' || psi.indexname as recommendation,
        'Reduce storage overhead and maintenance cost'::text as estimated_impact
      FROM pg_stat_user_indexes psi
      WHERE psi.tablename LIKE 'parlant_%'
        AND psi.idx_scan = 0;

      -- Workspace isolation recommendations
      RETURN QUERY
      SELECT
        'Security'::text as category,
        1 as priority,
        'Multiple tables'::text,
        'Queries without workspace filtering detected'::text as issue,
        'Implement RLS policies and audit queries'::text as recommendation,
        'Critical security improvement'::text as estimated_impact
      WHERE EXISTS (
        SELECT 1 FROM pg_stat_statements pss
        WHERE pss.query ~* 'parlant_(agent|session|tool)'
          AND NOT pss.query ~* 'workspace_id'
          AND pss.calls > 5
      );

      -- Table bloat recommendations
      RETURN QUERY
      SELECT
        'Maintenance'::text as category,
        2 as priority,
        pst.tablename::text,
        'High dead tuple ratio'::text as issue,
        'VACUUM ANALYZE ' || pst.tablename as recommendation,
        'Improved query performance and storage efficiency'::text as estimated_impact
      FROM pg_stat_user_tables pst
      WHERE pst.tablename LIKE 'parlant_%'
        AND pst.n_dead_tup > pst.n_live_tup * 0.1;

      -- Query performance recommendations
      RETURN QUERY
      SELECT
        'Query Optimization'::text as category,
        2 as priority,
        'Application queries'::text,
        'Slow queries detected (>500ms average)'::text as issue,
        'Review and optimize slow queries'::text as recommendation,
        'Significant user experience improvement'::text as estimated_impact
      WHERE EXISTS (
        SELECT 1 FROM pg_stat_statements pss
        WHERE pss.query ~* 'parlant_'
          AND pss.mean_time > 500
          AND pss.calls > 10
      );
    END;
    $$ LANGUAGE plpgsql;
  `
}

/**
 * PERFORMANCE REGRESSION TESTING FRAMEWORK
 * Automated testing for performance regressions
 */
export const performanceRegressionTesting = {
  // Create performance baseline
  createPerformanceBaseline: sql`
    CREATE OR REPLACE FUNCTION create_performance_baseline()
    RETURNS json AS $$
    DECLARE
      baseline json;
    BEGIN
      SELECT json_build_object(
        'timestamp', NOW(),
        'table_sizes', (
          SELECT json_object_agg(tablename, pg_total_relation_size(schemaname||'.'||tablename))
          FROM pg_tables
          WHERE tablename LIKE 'parlant_%'
        ),
        'index_usage', (
          SELECT json_object_agg(indexname, idx_scan)
          FROM pg_stat_user_indexes
          WHERE tablename LIKE 'parlant_%'
        ),
        'query_performance', (
          SELECT json_object_agg(
            substring(query from 1 for 50),
            json_build_object('calls', calls, 'mean_time', mean_time)
          )
          FROM pg_stat_statements
          WHERE query ~* 'parlant_'
            AND calls > 10
          LIMIT 20
        )
      ) INTO baseline;

      -- Store baseline for comparison
      INSERT INTO performance_baselines (baseline_data, created_at)
      VALUES (baseline, NOW())
      ON CONFLICT (id) DO UPDATE SET
        baseline_data = baseline,
        created_at = NOW();

      RETURN baseline;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Compare current performance against baseline
  compareAgainstBaseline: sql`
    CREATE OR REPLACE FUNCTION compare_against_baseline()
    RETURNS json AS $$
    DECLARE
      current_metrics json;
      baseline_metrics json;
      comparison json;
    BEGIN
      -- Get current metrics
      SELECT json_build_object(
        'timestamp', NOW(),
        'table_sizes', (
          SELECT json_object_agg(tablename, pg_total_relation_size(schemaname||'.'||tablename))
          FROM pg_tables
          WHERE tablename LIKE 'parlant_%'
        ),
        'index_usage', (
          SELECT json_object_agg(indexname, idx_scan)
          FROM pg_stat_user_indexes
          WHERE tablename LIKE 'parlant_%'
        ),
        'slow_queries', (
          SELECT COUNT(*)
          FROM pg_stat_statements
          WHERE query ~* 'parlant_'
            AND mean_time > 100
            AND calls > 5
        )
      ) INTO current_metrics;

      -- Get latest baseline
      SELECT baseline_data INTO baseline_metrics
      FROM performance_baselines
      ORDER BY created_at DESC
      LIMIT 1;

      -- Generate comparison
      SELECT json_build_object(
        'comparison_time', NOW(),
        'current', current_metrics,
        'baseline', baseline_metrics,
        'regressions', (
          SELECT json_agg(
            json_build_object(
              'type', 'slow_query_increase',
              'severity', CASE WHEN current_metrics->>'slow_queries' > baseline_metrics->>'slow_queries' THEN 'high' ELSE 'low' END
            )
          )
          WHERE (current_metrics->>'slow_queries')::int > (baseline_metrics->>'slow_queries')::int * 1.2
        )
      ) INTO comparison;

      RETURN comparison;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Performance test suite for common operations
  performanceTestSuite: sql`
    CREATE OR REPLACE FUNCTION run_performance_test_suite(workspace_id_param text)
    RETURNS json AS $$
    DECLARE
      test_results json;
      start_time timestamp;
      end_time timestamp;
      agent_query_time numeric;
      session_query_time numeric;
      event_query_time numeric;
      join_query_time numeric;
    BEGIN
      -- Test 1: Agent listing query
      start_time := clock_timestamp();
      PERFORM * FROM parlant_agent
      WHERE workspace_id = workspace_id_param
        AND status = 'active'
        AND deleted_at IS NULL
      LIMIT 100;
      end_time := clock_timestamp();
      agent_query_time := EXTRACT(milliseconds FROM end_time - start_time);

      -- Test 2: Session listing query
      start_time := clock_timestamp();
      PERFORM * FROM parlant_session
      WHERE workspace_id = workspace_id_param
        AND status = 'active'
      ORDER BY last_activity_at DESC
      LIMIT 100;
      end_time := clock_timestamp();
      session_query_time := EXTRACT(milliseconds FROM end_time - start_time);

      -- Test 3: Event history query
      start_time := clock_timestamp();
      PERFORM e.* FROM parlant_event e
      INNER JOIN parlant_session s ON e.session_id = s.id
      WHERE s.workspace_id = workspace_id_param
      ORDER BY e.created_at DESC
      LIMIT 1000;
      end_time := clock_timestamp();
      event_query_time := EXTRACT(milliseconds FROM end_time - start_time);

      -- Test 4: Complex join query
      start_time := clock_timestamp();
      PERFORM a.name, s.customer_id, COUNT(e.id)
      FROM parlant_agent a
      INNER JOIN parlant_session s ON a.id = s.agent_id
      INNER JOIN parlant_event e ON s.id = e.session_id
      WHERE a.workspace_id = workspace_id_param
        AND s.workspace_id = workspace_id_param
        AND a.status = 'active'
        AND s.status = 'active'
      GROUP BY a.name, s.customer_id
      LIMIT 50;
      end_time := clock_timestamp();
      join_query_time := EXTRACT(milliseconds FROM end_time - start_time);

      -- Compile test results
      SELECT json_build_object(
        'test_timestamp', NOW(),
        'workspace_id', workspace_id_param,
        'results', json_build_object(
          'agent_listing_ms', agent_query_time,
          'session_listing_ms', session_query_time,
          'event_history_ms', event_query_time,
          'complex_join_ms', join_query_time,
          'total_test_time_ms', agent_query_time + session_query_time + event_query_time + join_query_time
        ),
        'performance_grade', CASE
          WHEN (agent_query_time + session_query_time + event_query_time + join_query_time) < 100 THEN 'A'
          WHEN (agent_query_time + session_query_time + event_query_time + join_query_time) < 500 THEN 'B'
          WHEN (agent_query_time + session_query_time + event_query_time + join_query_time) < 1000 THEN 'C'
          ELSE 'D'
        END
      ) INTO test_results;

      RETURN test_results;
    END;
    $$ LANGUAGE plpgsql;
  `
}

/**
 * PERFORMANCE BASELINE STORAGE TABLE
 * Store performance baselines for regression testing
 */
export const performanceBaselineTable = sql`
  CREATE TABLE IF NOT EXISTS performance_baselines (
    id serial PRIMARY KEY,
    baseline_data jsonb NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW(),
    migration_version text,
    notes text
  );

  CREATE INDEX IF NOT EXISTS performance_baselines_created_at_idx
  ON performance_baselines (created_at);
`;

/**
 * AUTOMATED PERFORMANCE ALERTS
 * Triggers and functions for real-time performance alerting
 */
export const performanceAlerts = {
  // Create alert log table
  createAlertTable: sql`
    CREATE TABLE IF NOT EXISTS parlant_performance_alerts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      alert_type text NOT NULL,
      severity text NOT NULL, -- 'low', 'medium', 'high', 'critical'
      table_name text,
      metric_name text NOT NULL,
      current_value numeric,
      threshold_value numeric,
      message text NOT NULL,
      resolved boolean DEFAULT false,
      created_at timestamp DEFAULT NOW(),
      resolved_at timestamp
    );

    CREATE INDEX parlant_performance_alerts_type_severity_idx
    ON parlant_performance_alerts (alert_type, severity, created_at);

    CREATE INDEX parlant_performance_alerts_resolved_idx
    ON parlant_performance_alerts (resolved, created_at);
  `,

  // Function to check and create alerts
  checkPerformanceThresholds: sql`
    CREATE OR REPLACE FUNCTION check_performance_thresholds()
    RETURNS integer AS $$
    DECLARE
      alerts_created integer := 0;
      slow_query_count integer;
      unused_index_count integer;
      table_bloat_count integer;
    BEGIN
      -- Check for slow queries
      SELECT COUNT(*) INTO slow_query_count
      FROM pg_stat_statements
      WHERE query ~* 'parlant_'
        AND mean_time > 1000  -- 1 second threshold
        AND calls > 5;

      IF slow_query_count > 0 THEN
        INSERT INTO parlant_performance_alerts (
          alert_type, severity, metric_name, current_value,
          threshold_value, message
        ) VALUES (
          'slow_query', 'high', 'mean_query_time', slow_query_count,
          1000, slow_query_count || ' slow Parlant queries detected (>1000ms)'
        );
        alerts_created := alerts_created + 1;
      END IF;

      -- Check for unused indexes
      SELECT COUNT(*) INTO unused_index_count
      FROM pg_stat_user_indexes
      WHERE tablename LIKE 'parlant_%'
        AND idx_scan = 0;

      IF unused_index_count > 5 THEN
        INSERT INTO parlant_performance_alerts (
          alert_type, severity, metric_name, current_value,
          threshold_value, message
        ) VALUES (
          'unused_index', 'medium', 'unused_index_count', unused_index_count,
          5, unused_index_count || ' unused indexes on Parlant tables'
        );
        alerts_created := alerts_created + 1;
      END IF;

      -- Check for table bloat
      SELECT COUNT(*) INTO table_bloat_count
      FROM pg_stat_user_tables
      WHERE tablename LIKE 'parlant_%'
        AND n_dead_tup > n_live_tup * 0.2;

      IF table_bloat_count > 0 THEN
        INSERT INTO parlant_performance_alerts (
          alert_type, severity, metric_name, current_value,
          threshold_value, message
        ) VALUES (
          'table_bloat', 'medium', 'bloated_table_count', table_bloat_count,
          0, table_bloat_count || ' Parlant tables with high dead tuple ratio'
        );
        alerts_created := alerts_created + 1;
      END IF;

      RETURN alerts_created;
    END;
    $$ LANGUAGE plpgsql;
  `,

  // Schedule periodic performance checks
  schedulePerformanceChecks: sql`
    -- This would typically be set up as a cron job or scheduled task
    -- Example: Run every 5 minutes during business hours
    SELECT cron.schedule('parlant-performance-check', '*/5 * * * *', 'SELECT check_performance_thresholds();');
  `
}

/**
 * QUERY PLAN ANALYSIS
 * Tools for analyzing and optimizing query execution plans
 */
export const queryPlanAnalysis = {
  // Analyze execution plans for common Parlant queries
  analyzeCommonQueryPlans: sql`
    CREATE OR REPLACE FUNCTION analyze_common_query_plans(workspace_id_param text)
    RETURNS TABLE(
      query_type text,
      execution_time numeric,
      plan_summary text,
      recommendations text
    ) AS $$
    BEGIN
      -- Analyze agent listing query plan
      RETURN QUERY
      SELECT
        'agent_listing'::text,
        0::numeric,  -- Placeholder - would be filled by actual EXPLAIN ANALYZE
        'Workspace index scan -> Status filter -> Sort by last_active_at'::text,
        'Ensure workspace_status composite index exists'::text;

      -- Analyze session history query plan
      RETURN QUERY
      SELECT
        'session_history'::text,
        0::numeric,  -- Placeholder - would be filled by actual EXPLAIN ANALYZE
        'Workspace-agent join -> Status filter -> Date sort'::text,
        'Consider denormalizing agent_name in session table'::text;

      -- Analyze event retrieval query plan
      RETURN QUERY
      SELECT
        'event_retrieval'::text,
        0::numeric,  -- Placeholder - would be filled by actual EXPLAIN ANALYZE
        'Session lookup -> Offset range scan -> Content retrieval'::text,
        'Session-offset composite index should handle this efficiently'::text;
    END;
    $$ LANGUAGE plpgsql;
  `,

  -- Get detailed execution statistics
  getDetailedExecutionStats: sql`
    CREATE OR REPLACE FUNCTION get_detailed_execution_stats()
    RETURNS TABLE(
      table_name text,
      total_scans bigint,
      index_scans bigint,
      sequential_scans bigint,
      index_efficiency numeric,
      recommendation text
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        pst.tablename::text,
        COALESCE(psi_agg.total_idx_scans, 0) + pst.seq_scan as total_scans,
        COALESCE(psi_agg.total_idx_scans, 0) as index_scans,
        pst.seq_scan as sequential_scans,
        CASE
          WHEN (COALESCE(psi_agg.total_idx_scans, 0) + pst.seq_scan) = 0 THEN 0
          ELSE ROUND((COALESCE(psi_agg.total_idx_scans, 0)::numeric /
                     (COALESCE(psi_agg.total_idx_scans, 0) + pst.seq_scan)::numeric) * 100, 2)
        END as index_efficiency,
        CASE
          WHEN pst.seq_scan > COALESCE(psi_agg.total_idx_scans, 0) * 2 THEN 'High sequential scan ratio - add indexes'
          WHEN COALESCE(psi_agg.total_idx_scans, 0) = 0 AND pst.seq_scan > 100 THEN 'No index usage - investigate'
          WHEN pst.n_dead_tup > pst.n_live_tup * 0.1 THEN 'High dead tuple ratio - vacuum needed'
          ELSE 'Performance looks good'
        END as recommendation
      FROM pg_stat_user_tables pst
      LEFT JOIN (
        SELECT
          tablename,
          SUM(idx_scan) as total_idx_scans
        FROM pg_stat_user_indexes
        GROUP BY tablename
      ) psi_agg ON pst.tablename = psi_agg.tablename
      WHERE pst.tablename LIKE 'parlant_%'
      ORDER BY total_scans DESC;
    END;
    $$ LANGUAGE plpgsql;
  `
}

/**
 * EXPORT ALL MONITORING COMPONENTS
 */
export const parlantPerformanceMonitoring = {
  // Monitoring views
  ...performanceMonitoringViews,

  // Monitoring functions
  ...performanceMonitoringFunctions,

  // Regression testing
  ...performanceRegressionTesting,

  // Performance alerts
  ...performanceAlerts,

  // Query plan analysis
  ...queryPlanAnalysis,

  // Baseline storage
  performanceBaselineTable
}

/**
 * PERFORMANCE MONITORING BEST PRACTICES
 *
 * 1. Set up automated performance baselines before deployments
 * 2. Monitor workspace isolation effectiveness regularly
 * 3. Alert on queries missing workspace_id filtering
 * 4. Track index usage and remove unused indexes
 * 5. Monitor table bloat and schedule maintenance
 * 6. Analyze slow query patterns for optimization opportunities
 * 7. Use query plan analysis to validate index effectiveness
 * 8. Set up proactive alerts for performance degradation
 * 9. Regular performance regression testing in CI/CD
 * 10. Document all performance optimizations and their impact
 */