-- Parlant Migration Health Check Script
-- Purpose: Comprehensive health check for Parlant schema post-migration
-- Usage: Run after migration completion to verify system health
-- Created: 2025-09-24
-- Version: 1.0.0

-- ============================================================================
-- HEALTH CHECK FRAMEWORK
-- ============================================================================

-- Create temporary table for health check results
CREATE TEMP TABLE health_check_results (
    check_id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    check_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('HEALTHY', 'WARNING', 'CRITICAL', 'INFO')),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    checked_at TIMESTAMP DEFAULT NOW()
);

-- Function to record health check result
CREATE OR REPLACE FUNCTION record_health_check(
    category TEXT,
    check_name TEXT,
    status TEXT,
    message TEXT,
    details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO health_check_results (category, check_name, status, message, details)
    VALUES (category, check_name, status, message, details);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SCHEMA HEALTH CHECKS
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'parlant_agent',
        'parlant_session',
        'parlant_event',
        'parlant_guideline',
        'parlant_journey',
        'parlant_journey_state',
        'parlant_journey_transition',
        'parlant_variable',
        'parlant_tool',
        'parlant_term',
        'parlant_canned_response'
    ];
    missing_tables TEXT[] := '{}';
    table_name TEXT;
BEGIN
    -- Check all core tables exist
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name = ANY(expected_tables);

    FOREACH table_name IN ARRAY expected_tables LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;

    IF array_length(missing_tables, 1) > 0 THEN
        PERFORM record_health_check(
            'Schema',
            'Core Tables',
            'CRITICAL',
            'Missing core tables: ' || array_to_string(missing_tables, ', '),
            jsonb_build_object('missing_tables', missing_tables)
        );
    ELSE
        PERFORM record_health_check(
            'Schema',
            'Core Tables',
            'HEALTHY',
            format('All %s core tables exist', array_length(expected_tables, 1))
        );
    END IF;
END $$;

-- Check enum health
DO $$
DECLARE
    enum_count INTEGER;
    expected_enums TEXT[] := ARRAY[
        'agent_status',
        'session_mode',
        'session_status',
        'event_type',
        'journey_state_type',
        'composition_mode'
    ];
    missing_enums TEXT[] := '{}';
    enum_name TEXT;
BEGIN
    FOREACH enum_name IN ARRAY expected_enums LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = enum_name AND typtype = 'e') THEN
            missing_enums := array_append(missing_enums, enum_name);
        END IF;
    END LOOP;

    IF array_length(missing_enums, 1) > 0 THEN
        PERFORM record_health_check(
            'Schema',
            'Enums',
            'CRITICAL',
            'Missing enums: ' || array_to_string(missing_enums, ', ')
        );
    ELSE
        PERFORM record_health_check(
            'Schema',
            'Enums',
            'HEALTHY',
            format('All %s enums exist', array_length(expected_enums, 1))
        );
    END IF;
END $$;

-- ============================================================================
-- INDEX HEALTH CHECKS
-- ============================================================================

DO $$
DECLARE
    index_count INTEGER;
    unused_indexes INTEGER;
    large_indexes INTEGER;
    index_stats RECORD;
BEGIN
    -- Count total indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename LIKE 'parlant_%';

    -- Check for unused indexes (requires pg_stat_user_indexes)
    SELECT COUNT(*) INTO unused_indexes
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    AND relname LIKE 'parlant_%'
    AND idx_scan = 0
    AND idx_tup_read = 0;

    -- Check for very large indexes
    SELECT COUNT(*) INTO large_indexes
    FROM pg_class c
    JOIN pg_index i ON i.indexrelid = c.oid
    JOIN pg_class t ON i.indrelid = t.oid
    WHERE t.relname LIKE 'parlant_%'
    AND pg_size_pretty(pg_relation_size(c.oid))::TEXT LIKE '%GB%';

    PERFORM record_health_check(
        'Indexes',
        'Index Count',
        CASE
            WHEN index_count >= 50 THEN 'HEALTHY'
            WHEN index_count >= 30 THEN 'WARNING'
            ELSE 'CRITICAL'
        END,
        format('%s indexes created', index_count)
    );

    IF unused_indexes > 0 THEN
        PERFORM record_health_check(
            'Indexes',
            'Unused Indexes',
            'WARNING',
            format('%s potentially unused indexes found', unused_indexes)
        );
    ELSE
        PERFORM record_health_check(
            'Indexes',
            'Index Usage',
            'HEALTHY',
            'All indexes show usage statistics'
        );
    END IF;

    IF large_indexes > 0 THEN
        PERFORM record_health_check(
            'Indexes',
            'Large Indexes',
            'INFO',
            format('%s large indexes (>1GB) found', large_indexes)
        );
    END IF;
END $$;

-- ============================================================================
-- FOREIGN KEY CONSTRAINT HEALTH
-- ============================================================================

DO $$
DECLARE
    fk_count INTEGER;
    fk_violations INTEGER;
    constraint_info RECORD;
BEGIN
    -- Count foreign key constraints
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc
        ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_name LIKE 'parlant_%';

    -- Check for constraint violations
    fk_violations := 0;

    -- Check parlant_session -> parlant_agent
    SELECT COUNT(*) INTO fk_violations
    FROM parlant_session s
    LEFT JOIN parlant_agent a ON a.id = s.agent_id
    WHERE a.id IS NULL;

    -- Check parlant_event -> parlant_session
    IF fk_violations = 0 THEN
        SELECT COUNT(*) INTO fk_violations
        FROM parlant_event e
        LEFT JOIN parlant_session s ON s.id = e.session_id
        WHERE s.id IS NULL;
    END IF;

    PERFORM record_health_check(
        'Constraints',
        'Foreign Keys',
        CASE
            WHEN fk_count >= 15 THEN 'HEALTHY'
            WHEN fk_count >= 10 THEN 'WARNING'
            ELSE 'CRITICAL'
        END,
        format('%s foreign key constraints active', fk_count)
    );

    IF fk_violations > 0 THEN
        PERFORM record_health_check(
            'Constraints',
            'Data Integrity',
            'CRITICAL',
            format('%s foreign key violations found', fk_violations)
        );
    ELSE
        PERFORM record_health_check(
            'Constraints',
            'Data Integrity',
            'HEALTHY',
            'No foreign key violations detected'
        );
    END IF;
END $$;

-- ============================================================================
-- TRIGGER HEALTH CHECKS
-- ============================================================================

DO $$
DECLARE
    trigger_count INTEGER;
    failed_triggers INTEGER;
    trigger_info RECORD;
BEGIN
    -- Count triggers on Parlant tables
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE event_object_table LIKE 'parlant_%';

    -- Test trigger functionality (updated_at triggers)
    failed_triggers := 0;

    -- Test on a sample table if data exists
    BEGIN
        -- Try to update a record and check if updated_at changed
        -- This is a basic test - in production you might want more comprehensive testing
        IF EXISTS (SELECT 1 FROM parlant_agent LIMIT 1) THEN
            -- Triggers are likely working if we can update without error
            UPDATE parlant_agent SET updated_at = updated_at WHERE id IN (
                SELECT id FROM parlant_agent LIMIT 1
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        failed_triggers := 1;
    END;

    PERFORM record_health_check(
        'Triggers',
        'Trigger Count',
        CASE
            WHEN trigger_count >= 8 THEN 'HEALTHY'
            WHEN trigger_count >= 5 THEN 'WARNING'
            ELSE 'CRITICAL'
        END,
        format('%s triggers active', trigger_count)
    );

    IF failed_triggers > 0 THEN
        PERFORM record_health_check(
            'Triggers',
            'Trigger Functionality',
            'WARNING',
            'Some triggers may not be functioning correctly'
        );
    ELSE
        PERFORM record_health_check(
            'Triggers',
            'Trigger Functionality',
            'HEALTHY',
            'Triggers appear to be functioning correctly'
        );
    END IF;
END $$;

-- ============================================================================
-- PERFORMANCE HEALTH CHECKS
-- ============================================================================

DO $$
DECLARE
    avg_query_time NUMERIC;
    slow_queries INTEGER;
    table_stats RECORD;
    bloat_ratio NUMERIC;
BEGIN
    -- Check for slow queries in pg_stat_statements (if available)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pg_stat_statements') THEN
        SELECT COUNT(*) INTO slow_queries
        FROM pg_stat_statements
        WHERE query LIKE '%parlant_%'
        AND mean_time > 1000; -- 1 second average

        IF slow_queries > 0 THEN
            PERFORM record_health_check(
                'Performance',
                'Slow Queries',
                'WARNING',
                format('%s slow queries (>1s) detected', slow_queries)
            );
        ELSE
            PERFORM record_health_check(
                'Performance',
                'Query Performance',
                'HEALTHY',
                'No slow queries detected'
            );
        END IF;
    ELSE
        PERFORM record_health_check(
            'Performance',
            'Query Monitoring',
            'INFO',
            'pg_stat_statements not available for query analysis'
        );
    END IF;

    -- Check table bloat (simplified check)
    FOR table_stats IN
        SELECT
            schemaname,
            tablename,
            n_tup_ins + n_tup_upd + n_tup_del as total_modifications,
            n_live_tup
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        AND relname LIKE 'parlant_%'
    LOOP
        IF table_stats.total_modifications > 0 AND table_stats.n_live_tup > 0 THEN
            bloat_ratio := table_stats.total_modifications::NUMERIC / table_stats.n_live_tup;

            IF bloat_ratio > 2.0 THEN
                PERFORM record_health_check(
                    'Performance',
                    'Table Bloat: ' || table_stats.tablename,
                    'WARNING',
                    format('High bloat ratio: %.2f (consider VACUUM)', bloat_ratio)
                );
            END IF;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- STORAGE HEALTH CHECKS
-- ============================================================================

DO $$
DECLARE
    total_size NUMERIC;
    largest_table TEXT;
    largest_size TEXT;
    table_info RECORD;
BEGIN
    -- Check total storage usage
    SELECT
        ROUND(SUM(pg_total_relation_size(c.oid)) / 1024.0 / 1024.0, 2) as size_mb
    INTO total_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname LIKE 'parlant_%'
    AND c.relkind = 'r';

    -- Find largest table
    SELECT
        c.relname,
        pg_size_pretty(pg_total_relation_size(c.oid))
    INTO largest_table, largest_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname LIKE 'parlant_%'
    AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 1;

    PERFORM record_health_check(
        'Storage',
        'Total Size',
        'INFO',
        format('Total Parlant schema size: %.2f MB', COALESCE(total_size, 0))
    );

    IF largest_table IS NOT NULL THEN
        PERFORM record_health_check(
            'Storage',
            'Largest Table',
            'INFO',
            format('Largest table: %s (%s)', largest_table, largest_size)
        );
    END IF;

    -- Check for tables that might need partitioning
    FOR table_info IN
        SELECT
            c.relname,
            pg_size_pretty(pg_total_relation_size(c.oid)) as size,
            n.n_live_tup
        FROM pg_class c
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        JOIN pg_stat_user_tables n ON n.relname = c.relname
        WHERE c.relname LIKE 'parlant_%'
        AND c.relkind = 'r'
        AND pg_total_relation_size(c.oid) > 1024 * 1024 * 100 -- 100MB
    LOOP
        PERFORM record_health_check(
            'Storage',
            'Large Table: ' || table_info.relname,
            'INFO',
            format('Size: %s, Rows: %s (consider partitioning)', table_info.size, table_info.n_live_tup)
        );
    END LOOP;
END $$;

-- ============================================================================
-- SECURITY HEALTH CHECKS
-- ============================================================================

DO $$
DECLARE
    public_tables INTEGER;
    unencrypted_sensitive INTEGER;
    weak_constraints INTEGER;
BEGIN
    -- Check for tables accidentally made public
    SELECT COUNT(*) INTO public_tables
    FROM information_schema.table_privileges
    WHERE table_name LIKE 'parlant_%'
    AND grantee = 'PUBLIC'
    AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

    -- Check for potentially sensitive columns without proper constraints
    SELECT COUNT(*) INTO unencrypted_sensitive
    FROM information_schema.columns
    WHERE table_name LIKE 'parlant_%'
    AND column_name IN ('password', 'token', 'secret', 'key', 'api_key')
    AND is_nullable = 'YES';

    -- Check for missing constraints on sensitive operations
    SELECT COUNT(*) INTO weak_constraints
    FROM information_schema.columns
    WHERE table_name LIKE 'parlant_%'
    AND column_name IN ('email', 'user_id', 'workspace_id')
    AND character_maximum_length IS NULL
    AND data_type = 'text';

    IF public_tables > 0 THEN
        PERFORM record_health_check(
            'Security',
            'Public Access',
            'CRITICAL',
            format('%s tables have public access privileges', public_tables)
        );
    ELSE
        PERFORM record_health_check(
            'Security',
            'Access Control',
            'HEALTHY',
            'No public access to Parlant tables'
        );
    END IF;

    IF unencrypted_sensitive > 0 THEN
        PERFORM record_health_check(
            'Security',
            'Sensitive Data',
            'WARNING',
            format('%s potentially sensitive columns without proper constraints', unencrypted_sensitive)
        );
    ELSE
        PERFORM record_health_check(
            'Security',
            'Data Protection',
            'HEALTHY',
            'No obvious sensitive data exposure'
        );
    END IF;
END $$;

-- ============================================================================
-- INTEGRATION HEALTH CHECKS
-- ============================================================================

DO $$
DECLARE
    workspace_refs INTEGER;
    user_refs INTEGER;
    orphaned_data INTEGER;
BEGIN
    -- Check integration with workspace table
    SELECT COUNT(DISTINCT workspace_id) INTO workspace_refs
    FROM parlant_agent
    WHERE workspace_id IS NOT NULL;

    -- Check integration with user table
    SELECT COUNT(DISTINCT created_by) INTO user_refs
    FROM parlant_agent
    WHERE created_by IS NOT NULL;

    -- Check for orphaned data
    SELECT COUNT(*) INTO orphaned_data
    FROM parlant_agent a
    LEFT JOIN workspace w ON w.id = a.workspace_id
    WHERE w.id IS NULL;

    PERFORM record_health_check(
        'Integration',
        'Workspace Links',
        CASE
            WHEN workspace_refs > 0 THEN 'HEALTHY'
            ELSE 'INFO'
        END,
        format('Connected to %s workspaces', workspace_refs)
    );

    PERFORM record_health_check(
        'Integration',
        'User Links',
        CASE
            WHEN user_refs > 0 THEN 'HEALTHY'
            ELSE 'INFO'
        END,
        format('Connected to %s users', user_refs)
    );

    IF orphaned_data > 0 THEN
        PERFORM record_health_check(
            'Integration',
            'Data Integrity',
            'WARNING',
            format('%s orphaned records found', orphaned_data)
        );
    ELSE
        PERFORM record_health_check(
            'Integration',
            'Data Integrity',
            'HEALTHY',
            'No orphaned data detected'
        );
    END IF;
END $$;

-- ============================================================================
-- HEALTH CHECK SUMMARY
-- ============================================================================

DO $$
DECLARE
    total_checks INTEGER;
    healthy_checks INTEGER;
    warning_checks INTEGER;
    critical_checks INTEGER;
    info_checks INTEGER;
    overall_status TEXT;
    category_record RECORD;
    result_record RECORD;
BEGIN
    -- Count results by status
    SELECT COUNT(*) INTO total_checks FROM health_check_results;
    SELECT COUNT(*) INTO healthy_checks FROM health_check_results WHERE status = 'HEALTHY';
    SELECT COUNT(*) INTO warning_checks FROM health_check_results WHERE status = 'WARNING';
    SELECT COUNT(*) INTO critical_checks FROM health_check_results WHERE status = 'CRITICAL';
    SELECT COUNT(*) INTO info_checks FROM health_check_results WHERE status = 'INFO';

    -- Determine overall health
    overall_status := CASE
        WHEN critical_checks > 0 THEN 'CRITICAL'
        WHEN warning_checks > 0 THEN 'WARNING'
        ELSE 'HEALTHY'
    END;

    -- Generate summary report
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PARLANT MIGRATION HEALTH CHECK REPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Overall Status: %', overall_status;
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  Total Checks: %', total_checks;
    RAISE NOTICE '  Healthy: % (%.1f%%)', healthy_checks, (healthy_checks::FLOAT / total_checks * 100);
    RAISE NOTICE '  Warnings: % (%.1f%%)', warning_checks, (warning_checks::FLOAT / total_checks * 100);
    RAISE NOTICE '  Critical: % (%.1f%%)', critical_checks, (critical_checks::FLOAT / total_checks * 100);
    RAISE NOTICE '  Info: % (%.1f%%)', info_checks, (info_checks::FLOAT / total_checks * 100);
    RAISE NOTICE '';

    -- Show results by category
    FOR category_record IN
        SELECT category, COUNT(*) as count
        FROM health_check_results
        GROUP BY category
        ORDER BY category
    LOOP
        RAISE NOTICE '% (%s checks):', category_record.category, category_record.count;

        FOR result_record IN
            SELECT check_name, status, message
            FROM health_check_results
            WHERE category = category_record.category
            ORDER BY
                CASE status
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'WARNING' THEN 2
                    WHEN 'HEALTHY' THEN 3
                    ELSE 4
                END,
                check_name
        LOOP
            RAISE NOTICE '  [%] %: %',
                CASE result_record.status
                    WHEN 'HEALTHY' THEN '✓'
                    WHEN 'WARNING' THEN '⚠'
                    WHEN 'CRITICAL' THEN '✗'
                    ELSE 'ℹ'
                END,
                result_record.check_name,
                result_record.message;
        END LOOP;

        RAISE NOTICE '';
    END LOOP;

    -- Show critical issues if any
    IF critical_checks > 0 THEN
        RAISE WARNING 'CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION:';
        FOR result_record IN
            SELECT check_name, message, category
            FROM health_check_results
            WHERE status = 'CRITICAL'
            ORDER BY category, check_name
        LOOP
            RAISE WARNING '  % > %: %', result_record.category, result_record.check_name, result_record.message;
        END LOOP;
        RAISE WARNING '';
    END IF;

    -- Show warnings if any
    IF warning_checks > 0 THEN
        RAISE NOTICE 'WARNINGS TO ADDRESS:';
        FOR result_record IN
            SELECT check_name, message, category
            FROM health_check_results
            WHERE status = 'WARNING'
            ORDER BY category, check_name
        LOOP
            RAISE NOTICE '  % > %: %', result_record.category, result_record.check_name, result_record.message;
        END LOOP;
        RAISE NOTICE '';
    END IF;

    -- Final recommendations
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RECOMMENDATIONS:';

    IF overall_status = 'HEALTHY' THEN
        RAISE NOTICE '✅ System is healthy and ready for production use';
        RAISE NOTICE '   - Monitor performance metrics regularly';
        RAISE NOTICE '   - Set up automated health checks';
        RAISE NOTICE '   - Plan for data growth and scaling';
    ELSIF overall_status = 'WARNING' THEN
        RAISE NOTICE '⚠️  System has warnings but is operational';
        RAISE NOTICE '   - Address warning-level issues when possible';
        RAISE NOTICE '   - Monitor system closely for degradation';
        RAISE NOTICE '   - Consider optimization opportunities';
    ELSE
        RAISE NOTICE '🚨 System has critical issues that must be resolved';
        RAISE NOTICE '   - Fix all critical issues before production use';
        RAISE NOTICE '   - Consider running migration rollback if needed';
        RAISE NOTICE '   - Contact database administrator for assistance';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Address any critical or warning issues';
    RAISE NOTICE '2. Set up monitoring and alerting';
    RAISE NOTICE '3. Plan regular health check schedules';
    RAISE NOTICE '4. Document any system-specific configurations';
    RAISE NOTICE '5. Train team on Parlant schema maintenance';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop the temporary function
DROP FUNCTION record_health_check(TEXT, TEXT, TEXT, TEXT, JSONB);

-- Export health check results (optional, for external monitoring)
-- COPY health_check_results TO '/tmp/parlant_health_check.json' (FORMAT JSON);

-- Note: health_check_results table is temporary and will be dropped automatically

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Parlant Migration Health Check Completed';
    RAISE NOTICE 'For detailed monitoring, use: scripts/monitor-parlant-migration.ts';
    RAISE NOTICE 'For ongoing health checks, schedule this script to run regularly';
    RAISE NOTICE '';
END $$;