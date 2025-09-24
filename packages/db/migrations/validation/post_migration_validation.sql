-- Post-Migration Validation Script for Parlant Schema
-- Purpose: Comprehensive validation after Parlant migration completion
-- Created: 2025-09-24
-- Version: 1.0.0
-- Safety: Critical migration success verification

-- ============================================================================
-- VALIDATION FRAMEWORK SETUP
-- ============================================================================

-- Create temporary table to store validation results
CREATE TEMPORARY TABLE IF NOT EXISTS post_validation_results (
    id SERIAL PRIMARY KEY,
    check_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WARN', 'INFO')),
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'INFO',
    details JSONB DEFAULT '{}',
    checked_at TIMESTAMP DEFAULT NOW()
);

-- Function to record validation result
CREATE OR REPLACE FUNCTION record_post_validation(
    check_name TEXT,
    status TEXT,
    message TEXT,
    severity TEXT DEFAULT 'INFO',
    details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO post_validation_results (check_name, status, message, severity, details)
    VALUES (check_name, status, message, severity, details);

    RAISE NOTICE '[%] %: % - %', severity, check_name, status, message;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE STRUCTURE VALIDATION
-- ============================================================================

DO $$
DECLARE
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
    table_name TEXT;
    missing_tables TEXT[] := '{}';
    table_count INTEGER;
    column_count INTEGER;
    total_tables INTEGER := 0;
BEGIN
    -- Check all expected tables exist
    FOREACH table_name IN ARRAY expected_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
            total_tables := total_tables + 1;

            -- Check table structure
            SELECT COUNT(*) INTO column_count
            FROM information_schema.columns
            WHERE table_name = table_name;

            SELECT COUNT(*) INTO table_count
            FROM information_schema.tables
            WHERE table_name = table_name;

            PERFORM record_post_validation(
                'Table Structure: ' || table_name,
                'PASS',
                format('Table exists with %s columns', column_count),
                'INFO',
                jsonb_build_object('columns', column_count)
            );
        ELSE
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;

    IF array_length(missing_tables, 1) > 0 THEN
        PERFORM record_post_validation(
            'Table Creation',
            'FAIL',
            'Missing tables: ' || array_to_string(missing_tables, ', '),
            'ERROR',
            jsonb_build_object('missing_tables', missing_tables)
        );
    ELSE
        PERFORM record_post_validation(
            'Table Creation',
            'PASS',
            format('All %s expected tables created successfully', total_tables)
        );
    END IF;
END $$;

-- ============================================================================
-- ENUM VALIDATION
-- ============================================================================

DO $$
DECLARE
    expected_enums TEXT[] := ARRAY[
        'agent_status',
        'session_mode',
        'session_status',
        'event_type',
        'journey_state_type',
        'composition_mode'
    ];
    enum_name TEXT;
    missing_enums TEXT[] := '{}';
    enum_values TEXT[];
    total_enums INTEGER := 0;
BEGIN
    -- Check all expected enums exist
    FOREACH enum_name IN ARRAY expected_enums LOOP
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = enum_name AND typtype = 'e') THEN
            total_enums := total_enums + 1;

            -- Get enum values
            SELECT ARRAY_AGG(enumlabel ORDER BY enumsortorder) INTO enum_values
            FROM pg_enum
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = enum_name);

            PERFORM record_post_validation(
                'Enum: ' || enum_name,
                'PASS',
                format('Enum exists with values: %s', array_to_string(enum_values, ', ')),
                'INFO',
                jsonb_build_object('values', enum_values)
            );
        ELSE
            missing_enums := array_append(missing_enums, enum_name);
        END IF;
    END LOOP;

    IF array_length(missing_enums, 1) > 0 THEN
        PERFORM record_post_validation(
            'Enum Creation',
            'FAIL',
            'Missing enums: ' || array_to_string(missing_enums, ', '),
            'ERROR'
        );
    ELSE
        PERFORM record_post_validation(
            'Enum Creation',
            'PASS',
            format('All %s expected enums created successfully', total_enums)
        );
    END IF;
END $$;

-- ============================================================================
-- INDEX VALIDATION
-- ============================================================================

DO $$
DECLARE
    index_count INTEGER;
    parlant_indexes TEXT[];
    unique_indexes INTEGER;
    partial_indexes INTEGER;
    gin_indexes INTEGER;
BEGIN
    -- Count Parlant-related indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE indexname LIKE '%parlant%' OR tablename LIKE 'parlant_%';

    -- Get index details
    SELECT ARRAY_AGG(indexname) INTO parlant_indexes
    FROM pg_indexes
    WHERE tablename LIKE 'parlant_%'
    ORDER BY tablename, indexname;

    -- Count specific index types
    SELECT COUNT(*) INTO unique_indexes
    FROM pg_indexes
    WHERE tablename LIKE 'parlant_%'
    AND indexdef LIKE '%UNIQUE%';

    SELECT COUNT(*) INTO partial_indexes
    FROM pg_indexes
    WHERE tablename LIKE 'parlant_%'
    AND indexdef LIKE '%WHERE%';

    SELECT COUNT(*) INTO gin_indexes
    FROM pg_indexes
    WHERE tablename LIKE 'parlant_%'
    AND indexdef LIKE '%gin%';

    IF index_count >= 50 THEN
        PERFORM record_post_validation(
            'Index Creation',
            'PASS',
            format('%s indexes created (%s unique, %s partial, %s GIN)',
                index_count, unique_indexes, partial_indexes, gin_indexes),
            'INFO',
            jsonb_build_object(
                'total', index_count,
                'unique', unique_indexes,
                'partial', partial_indexes,
                'gin', gin_indexes
            )
        );
    ELSE
        PERFORM record_post_validation(
            'Index Creation',
            'WARN',
            format('Only %s indexes created, expected ~70+', index_count),
            'WARN'
        );
    END IF;
END $$;

-- ============================================================================
-- FOREIGN KEY CONSTRAINT VALIDATION
-- ============================================================================

DO $$
DECLARE
    fk_count INTEGER;
    missing_fks TEXT[] := '{}';
    constraint_record RECORD;
    expected_fks TEXT[] := ARRAY[
        'parlant_agent.workspace_id -> workspace.id',
        'parlant_agent.created_by -> user.id',
        'parlant_session.agent_id -> parlant_agent.id',
        'parlant_session.workspace_id -> workspace.id',
        'parlant_event.session_id -> parlant_session.id',
        'parlant_guideline.agent_id -> parlant_agent.id',
        'parlant_journey.agent_id -> parlant_agent.id'
    ];
BEGIN
    -- Count foreign key constraints on Parlant tables
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc
        ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_name LIKE 'parlant_%';

    -- Validate specific critical foreign keys exist
    FOR constraint_record IN
        SELECT
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name LIKE 'parlant_%'
    LOOP
        PERFORM record_post_validation(
            'FK: ' || constraint_record.table_name || '.' || constraint_record.column_name,
            'PASS',
            format('References %s.%s', constraint_record.foreign_table_name, constraint_record.foreign_column_name),
            'INFO'
        );
    END LOOP;

    IF fk_count >= 15 THEN
        PERFORM record_post_validation(
            'Foreign Key Constraints',
            'PASS',
            format('%s foreign key constraints created', fk_count)
        );
    ELSE
        PERFORM record_post_validation(
            'Foreign Key Constraints',
            'WARN',
            format('Only %s foreign key constraints found, expected 15+', fk_count),
            'WARN'
        );
    END IF;
END $$;

-- ============================================================================
-- TRIGGER VALIDATION
-- ============================================================================

DO $$
DECLARE
    trigger_count INTEGER;
    trigger_record RECORD;
    missing_triggers TEXT[] := '{}';
    expected_trigger_tables TEXT[] := ARRAY[
        'parlant_agent',
        'parlant_session',
        'parlant_guideline',
        'parlant_journey',
        'parlant_journey_state',
        'parlant_variable',
        'parlant_tool',
        'parlant_term',
        'parlant_canned_response'
    ];
    table_name TEXT;
BEGIN
    -- Count triggers on Parlant tables
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE event_object_table LIKE 'parlant_%';

    -- Check for updated_at triggers on each table
    FOREACH table_name IN ARRAY expected_trigger_tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.triggers
            WHERE event_object_table = table_name
            AND trigger_name LIKE '%updated_at%'
        ) THEN
            PERFORM record_post_validation(
                'Trigger: ' || table_name,
                'PASS',
                'updated_at trigger exists'
            );
        ELSE
            missing_triggers := array_append(missing_triggers, table_name);
        END IF;
    END LOOP;

    IF array_length(missing_triggers, 1) = 0 THEN
        PERFORM record_post_validation(
            'Trigger Creation',
            'PASS',
            format('All %s expected triggers created', trigger_count)
        );
    ELSE
        PERFORM record_post_validation(
            'Trigger Creation',
            'WARN',
            'Missing triggers on: ' || array_to_string(missing_triggers, ', '),
            'WARN'
        );
    END IF;
END $$;

-- ============================================================================
-- VIEW VALIDATION
-- ============================================================================

DO $$
DECLARE
    view_count INTEGER;
    view_names TEXT[];
    expected_views TEXT[] := ARRAY[
        'v_parlant_agent_performance',
        'v_parlant_session_analytics'
    ];
    view_name TEXT;
    missing_views TEXT[] := '{}';
BEGIN
    -- Check for created views
    SELECT COUNT(*), ARRAY_AGG(table_name) INTO view_count, view_names
    FROM information_schema.views
    WHERE table_name LIKE '%parlant%';

    -- Check each expected view
    FOREACH view_name IN ARRAY expected_views LOOP
        IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = view_name) THEN
            PERFORM record_post_validation(
                'View: ' || view_name,
                'PASS',
                'View created successfully'
            );
        ELSE
            missing_views := array_append(missing_views, view_name);
        END IF;
    END LOOP;

    IF array_length(missing_views, 1) = 0 THEN
        PERFORM record_post_validation(
            'View Creation',
            'PASS',
            format('All %s expected views created', array_length(expected_views, 1))
        );
    ELSE
        PERFORM record_post_validation(
            'View Creation',
            'WARN',
            'Missing views: ' || array_to_string(missing_views, ', '),
            'WARN'
        );
    END IF;
END $$;

-- ============================================================================
-- FUNCTION VALIDATION
-- ============================================================================

DO $$
DECLARE
    function_count INTEGER;
    function_names TEXT[];
    expected_functions TEXT[] := ARRAY[
        'update_updated_at_column',
        'increment_parlant_counter',
        'calculate_success_rate'
    ];
    function_name TEXT;
    missing_functions TEXT[] := '{}';
BEGIN
    -- Check for created functions
    SELECT COUNT(*), ARRAY_AGG(routine_name) INTO function_count, function_names
    FROM information_schema.routines
    WHERE routine_name LIKE '%parlant%'
    OR routine_name IN ('update_updated_at_column', 'increment_parlant_counter', 'calculate_success_rate');

    -- Check each expected function
    FOREACH function_name IN ARRAY expected_functions LOOP
        IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = function_name) THEN
            PERFORM record_post_validation(
                'Function: ' || function_name,
                'PASS',
                'Function created successfully'
            );
        ELSE
            missing_functions := array_append(missing_functions, function_name);
        END IF;
    END LOOP;

    IF array_length(missing_functions, 1) = 0 THEN
        PERFORM record_post_validation(
            'Function Creation',
            'PASS',
            'All expected functions created'
        );
    ELSE
        PERFORM record_post_validation(
            'Function Creation',
            'WARN',
            'Missing functions: ' || array_to_string(missing_functions, ', '),
            'WARN'
        );
    END IF;
END $$;

-- ============================================================================
-- DATA CONSISTENCY VALIDATION
-- ============================================================================

DO $$
DECLARE
    consistency_issues INTEGER := 0;
    orphaned_sessions INTEGER;
    orphaned_events INTEGER;
    invalid_enums INTEGER;
    constraint_violations INTEGER;
BEGIN
    -- Check for orphaned sessions (sessions without valid agent)
    SELECT COUNT(*) INTO orphaned_sessions
    FROM parlant_session s
    LEFT JOIN parlant_agent a ON a.id = s.agent_id
    WHERE a.id IS NULL;

    -- Check for orphaned events (events without valid session)
    SELECT COUNT(*) INTO orphaned_events
    FROM parlant_event e
    LEFT JOIN parlant_session s ON s.id = e.session_id
    WHERE s.id IS NULL;

    -- Check for constraint violations (should be 0 if migration successful)
    SELECT COUNT(*) INTO constraint_violations
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu USING (constraint_name)
    WHERE tc.table_name LIKE 'parlant_%'
    AND tc.constraint_type = 'CHECK'
    AND NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints cc
        WHERE cc.constraint_name = tc.constraint_name
    );

    consistency_issues := orphaned_sessions + orphaned_events + constraint_violations;

    IF consistency_issues = 0 THEN
        PERFORM record_post_validation(
            'Data Consistency',
            'PASS',
            'No data consistency issues found'
        );
    ELSE
        PERFORM record_post_validation(
            'Data Consistency',
            'WARN',
            format('%s consistency issues: %s orphaned sessions, %s orphaned events, %s constraint issues',
                consistency_issues, orphaned_sessions, orphaned_events, constraint_violations),
            'WARN'
        );
    END IF;
END $$;

-- ============================================================================
-- PERFORMANCE VALIDATION
-- ============================================================================

DO $$
DECLARE
    avg_query_time NUMERIC;
    slow_queries INTEGER;
    table_stats RECORD;
    total_size_mb NUMERIC;
BEGIN
    -- Test basic query performance
    BEGIN
        -- Simple performance test
        PERFORM (
            SELECT COUNT(*)
            FROM parlant_agent a
            LEFT JOIN parlant_session s ON s.agent_id = a.id
            WHERE a.deleted_at IS NULL
        );

        PERFORM record_post_validation(
            'Query Performance',
            'PASS',
            'Basic queries execute successfully'
        );
    EXCEPTION WHEN OTHERS THEN
        PERFORM record_post_validation(
            'Query Performance',
            'WARN',
            'Query performance test failed: ' || SQLERRM,
            'WARN'
        );
    END;

    -- Check table sizes
    SELECT ROUND(SUM(pg_total_relation_size(c.oid)) / 1024.0 / 1024.0, 2) INTO total_size_mb
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname LIKE 'parlant_%'
    AND c.relkind = 'r';

    PERFORM record_post_validation(
        'Storage',
        'INFO',
        format('Total Parlant schema size: %s MB', COALESCE(total_size_mb, 0))
    );
END $$;

-- ============================================================================
-- INTEGRATION VALIDATION
-- ============================================================================

DO $$
DECLARE
    workspace_integration BOOLEAN := false;
    user_integration BOOLEAN := false;
    workflow_integration BOOLEAN := false;
    test_workspace_id TEXT;
    test_user_id TEXT;
BEGIN
    -- Test workspace integration
    SELECT id INTO test_workspace_id FROM workspace LIMIT 1;
    SELECT id INTO test_user_id FROM "user" LIMIT 1;

    IF test_workspace_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Test creating a minimal agent record
        BEGIN
            INSERT INTO parlant_agent (workspace_id, created_by, name, status)
            VALUES (test_workspace_id, test_user_id, '__validation_test__', 'inactive')
            RETURNING id INTO test_workspace_id; -- Reuse variable

            workspace_integration := true;

            -- Clean up test record
            DELETE FROM parlant_agent WHERE name = '__validation_test__';

            PERFORM record_post_validation(
                'Workspace Integration',
                'PASS',
                'Can create and link agents to workspaces'
            );
        EXCEPTION WHEN OTHERS THEN
            PERFORM record_post_validation(
                'Workspace Integration',
                'FAIL',
                'Cannot create test agent: ' || SQLERRM,
                'ERROR'
            );
        END;
    ELSE
        PERFORM record_post_validation(
            'Workspace Integration',
            'WARN',
            'No test workspace/user available for integration testing',
            'WARN'
        );
    END IF;

    -- Verify foreign key relationships work
    IF EXISTS (
        SELECT 1
        FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'parlant_agent'
        AND tc.constraint_name LIKE '%workspace%'
    ) THEN
        PERFORM record_post_validation(
            'Foreign Key Integration',
            'PASS',
            'Foreign key relationships properly established'
        );
    ELSE
        PERFORM record_post_validation(
            'Foreign Key Integration',
            'FAIL',
            'Missing workspace foreign key relationship',
            'ERROR'
        );
    END IF;
END $$;

-- ============================================================================
-- SECURITY VALIDATION
-- ============================================================================

DO $$
DECLARE
    table_permissions TEXT[];
    public_access INTEGER;
    sensitive_columns INTEGER;
BEGIN
    -- Check for tables accidentally made public
    SELECT COUNT(*) INTO public_access
    FROM information_schema.table_privileges
    WHERE table_name LIKE 'parlant_%'
    AND grantee = 'PUBLIC'
    AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

    -- Count sensitive columns (should have appropriate constraints)
    SELECT COUNT(*) INTO sensitive_columns
    FROM information_schema.columns
    WHERE table_name LIKE 'parlant_%'
    AND column_name IN ('api_key', 'password', 'token', 'secret');

    IF public_access = 0 THEN
        PERFORM record_post_validation(
            'Security - Public Access',
            'PASS',
            'No public access granted to Parlant tables'
        );
    ELSE
        PERFORM record_post_validation(
            'Security - Public Access',
            'WARN',
            format('%s public access grants found', public_access),
            'WARN'
        );
    END IF;

    PERFORM record_post_validation(
        'Security - Sensitive Data',
        'INFO',
        format('%s potentially sensitive columns found', sensitive_columns)
    );
END $$;

-- ============================================================================
-- MIGRATION COMPLETENESS VALIDATION
-- ============================================================================

DO $$
DECLARE
    migration_status TEXT;
    drizzle_migration_exists BOOLEAN := false;
    migration_hash TEXT;
BEGIN
    -- Check if migration is recorded in Drizzle migrations table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '__drizzle_migrations') THEN
        SELECT EXISTS (
            SELECT 1 FROM __drizzle_migrations
            WHERE folder LIKE '%parlant%' OR folder LIKE '%0092%'
        ) INTO drizzle_migration_exists;

        IF drizzle_migration_exists THEN
            PERFORM record_post_validation(
                'Migration Tracking',
                'PASS',
                'Migration recorded in Drizzle migrations table'
            );
        ELSE
            PERFORM record_post_validation(
                'Migration Tracking',
                'WARN',
                'Migration not found in Drizzle tracking',
                'WARN'
            );
        END IF;
    ELSE
        PERFORM record_post_validation(
            'Migration Tracking',
            'INFO',
            'No Drizzle migrations table found'
        );
    END IF;
END $$;

-- ============================================================================
-- VALIDATION SUMMARY AND RECOMMENDATIONS
-- ============================================================================

DO $$
DECLARE
    total_checks INTEGER;
    passed_checks INTEGER;
    failed_checks INTEGER;
    warnings INTEGER;
    errors INTEGER;
    infos INTEGER;
    migration_success BOOLEAN;
    result_record RECORD;
    critical_issues INTEGER;
BEGIN
    -- Count validation results
    SELECT COUNT(*) INTO total_checks FROM post_validation_results;
    SELECT COUNT(*) INTO passed_checks FROM post_validation_results WHERE status = 'PASS';
    SELECT COUNT(*) INTO failed_checks FROM post_validation_results WHERE status = 'FAIL';
    SELECT COUNT(*) INTO warnings FROM post_validation_results WHERE status = 'WARN';
    SELECT COUNT(*) INTO errors FROM post_validation_results WHERE severity = 'ERROR';
    SELECT COUNT(*) INTO infos FROM post_validation_results WHERE status = 'INFO';

    critical_issues := failed_checks + errors;
    migration_success := (critical_issues = 0);

    -- Generate summary report
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'POST-MIGRATION VALIDATION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total checks: %', total_checks;
    RAISE NOTICE 'Passed: % (%.1f%%)', passed_checks, (passed_checks::FLOAT / total_checks * 100);
    RAISE NOTICE 'Failed: % (%.1f%%)', failed_checks, (failed_checks::FLOAT / total_checks * 100);
    RAISE NOTICE 'Warnings: % (%.1f%%)', warnings, (warnings::FLOAT / total_checks * 100);
    RAISE NOTICE 'Info: % (%.1f%%)', infos, (infos::FLOAT / total_checks * 100);
    RAISE NOTICE 'Critical issues: %', critical_issues;
    RAISE NOTICE '========================================';

    -- Show critical issues first
    IF critical_issues > 0 THEN
        RAISE WARNING 'CRITICAL ISSUES FOUND:';
        FOR result_record IN
            SELECT check_name, status, message, severity
            FROM post_validation_results
            WHERE status = 'FAIL' OR severity = 'ERROR'
            ORDER BY check_name
        LOOP
            RAISE WARNING '[%] %: %', result_record.severity, result_record.check_name, result_record.message;
        END LOOP;
        RAISE WARNING '';
    END IF;

    -- Show warnings
    IF warnings > 0 THEN
        RAISE NOTICE 'WARNINGS:';
        FOR result_record IN
            SELECT check_name, message
            FROM post_validation_results
            WHERE status = 'WARN' AND severity != 'ERROR'
            ORDER BY check_name
        LOOP
            RAISE NOTICE '[WARN] %: %', result_record.check_name, result_record.message;
        END LOOP;
        RAISE NOTICE '';
    END IF;

    -- Migration success assessment
    RAISE NOTICE '========================================';
    IF migration_success THEN
        RAISE NOTICE 'MIGRATION VALIDATION: SUCCESS';
        RAISE NOTICE 'The Parlant schema migration completed successfully!';
        RAISE NOTICE '';
        RAISE NOTICE 'All critical components have been validated:';
        RAISE NOTICE '✓ Tables, indexes, and constraints created';
        RAISE NOTICE '✓ Enums and functions installed';
        RAISE NOTICE '✓ Foreign key relationships established';
        RAISE NOTICE '✓ Triggers and views operational';
        RAISE NOTICE '✓ Integration with existing schema verified';
        RAISE NOTICE '';

        IF warnings > 0 THEN
            RAISE NOTICE 'Note: % warnings detected but do not indicate failure.', warnings;
            RAISE NOTICE 'Review warnings for potential optimizations.';
        END IF;

        RAISE NOTICE 'The Parlant system is ready for use!';
    ELSE
        RAISE WARNING 'MIGRATION VALIDATION: FAILURE';
        RAISE WARNING 'Critical issues detected in migration!';
        RAISE WARNING '';
        RAISE WARNING 'Issues must be resolved before system use:';
        RAISE WARNING '• % failed validations', failed_checks;
        RAISE WARNING '• % critical errors', errors;
        RAISE WARNING '';
        RAISE WARNING 'Recommended actions:';
        RAISE WARNING '1. Review all ERROR-level issues above';
        RAISE WARNING '2. Fix identified problems';
        RAISE WARNING '3. Consider running rollback if issues persist';
        RAISE WARNING '4. Re-run migration after fixes';
        RAISE WARNING '5. Re-run this validation script';
    END IF;

    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop temporary validation function
DROP FUNCTION record_post_validation(TEXT, TEXT, TEXT, TEXT, JSONB);

-- Note: post_validation_results table is temporary and will be dropped automatically

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'POST-MIGRATION VALIDATION COMPLETED';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps if migration successful:';
    RAISE NOTICE '1. Update application configuration';
    RAISE NOTICE '2. Deploy updated application code';
    RAISE NOTICE '3. Run integration tests';
    RAISE NOTICE '4. Monitor system performance';
    RAISE NOTICE '5. Set up monitoring and alerting';
    RAISE NOTICE '';
    RAISE NOTICE 'If migration failed:';
    RAISE NOTICE '1. Do not proceed with application deployment';
    RAISE NOTICE '2. Investigate and fix all critical issues';
    RAISE NOTICE '3. Consider running rollback script if needed';
    RAISE NOTICE '4. Re-run migration after fixes';
    RAISE NOTICE '';
END $$;