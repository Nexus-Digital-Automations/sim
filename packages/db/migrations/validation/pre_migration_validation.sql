-- Pre-Migration Validation Script for Parlant Schema
-- Purpose: Comprehensive validation checks before running Parlant migration
-- Created: 2025-09-24
-- Version: 1.0.0
-- Safety: Critical system readiness validation

-- ============================================================================
-- VALIDATION FRAMEWORK SETUP
-- ============================================================================

-- Create temporary function to track validation results
CREATE OR REPLACE FUNCTION log_validation_result(
    check_name TEXT,
    status TEXT,
    message TEXT,
    severity TEXT DEFAULT 'INFO'
)
RETURNS VOID AS $$
BEGIN
    RAISE NOTICE '[%] %: % - %', severity, check_name, status, message;
END;
$$ LANGUAGE plpgsql;

-- Create temporary table to store validation results
CREATE TEMPORARY TABLE IF NOT EXISTS validation_results (
    id SERIAL PRIMARY KEY,
    check_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WARN')),
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'INFO',
    checked_at TIMESTAMP DEFAULT NOW()
);

-- Function to record validation result
CREATE OR REPLACE FUNCTION record_validation(
    check_name TEXT,
    status TEXT,
    message TEXT,
    severity TEXT DEFAULT 'INFO'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO validation_results (check_name, status, message, severity)
    VALUES (check_name, status, message, severity);

    PERFORM log_validation_result(check_name, status, message, severity);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SYSTEM REQUIREMENTS VALIDATION
-- ============================================================================

DO $$
DECLARE
    pg_version_num INTEGER;
    pg_version_text TEXT;
    available_extensions TEXT[];
BEGIN
    -- Check PostgreSQL version
    SELECT current_setting('server_version_num')::INTEGER INTO pg_version_num;
    SELECT version() INTO pg_version_text;

    IF pg_version_num >= 140000 THEN
        PERFORM record_validation(
            'PostgreSQL Version',
            'PASS',
            'PostgreSQL version: ' || pg_version_text
        );
    ELSE
        PERFORM record_validation(
            'PostgreSQL Version',
            'FAIL',
            'PostgreSQL 14+ required. Current: ' || pg_version_text,
            'ERROR'
        );
    END IF;

    -- Check for required extensions
    SELECT ARRAY_AGG(extname) INTO available_extensions
    FROM pg_available_extensions
    WHERE extname IN ('uuid-ossp', 'pgcrypto', 'btree_gin', 'pg_trgm');

    IF 'uuid-ossp' = ANY(available_extensions) OR 'pgcrypto' = ANY(available_extensions) THEN
        PERFORM record_validation(
            'UUID Extension',
            'PASS',
            'UUID generation extensions available'
        );
    ELSE
        PERFORM record_validation(
            'UUID Extension',
            'WARN',
            'UUID extensions not available - using gen_random_uuid()',
            'WARN'
        );
    END IF;
END $$;

-- ============================================================================
-- PREREQUISITE TABLE VALIDATION
-- ============================================================================

DO $$
DECLARE
    missing_tables TEXT[] := '{}';
    table_name TEXT;
    table_count INTEGER;
    required_tables TEXT[] := ARRAY['user', 'workspace', 'workflow'];
BEGIN
    -- Check for required parent tables
    FOREACH table_name IN ARRAY required_tables LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
            missing_tables := array_append(missing_tables, table_name);
        ELSE
            -- Check table has data
            EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO table_count;

            PERFORM record_validation(
                'Prerequisite Table: ' || table_name,
                'PASS',
                format('Table exists with %s records', table_count)
            );
        END IF;
    END LOOP;

    IF array_length(missing_tables, 1) > 0 THEN
        PERFORM record_validation(
            'Prerequisites',
            'FAIL',
            'Missing required tables: ' || array_to_string(missing_tables, ', '),
            'ERROR'
        );
    ELSE
        PERFORM record_validation(
            'Prerequisites',
            'PASS',
            'All required parent tables exist'
        );
    END IF;
END $$;

-- ============================================================================
-- FOREIGN KEY VALIDATION
-- ============================================================================

DO $$
DECLARE
    fk_violations INTEGER;
    constraint_record RECORD;
BEGIN
    -- Check for foreign key constraint violations in existing data
    fk_violations := 0;

    -- Check user table integrity
    SELECT COUNT(*) INTO fk_violations
    FROM "user" u
    LEFT JOIN workspace w ON w.owner_id = u.id
    WHERE w.id IS NULL AND EXISTS (SELECT 1 FROM workspace WHERE owner_id = u.id);

    IF fk_violations = 0 THEN
        PERFORM record_validation(
            'Foreign Key Integrity',
            'PASS',
            'No foreign key violations detected'
        );
    ELSE
        PERFORM record_validation(
            'Foreign Key Integrity',
            'WARN',
            format('%s potential foreign key violations found', fk_violations),
            'WARN'
        );
    END IF;
END $$;

-- ============================================================================
-- EXISTING PARLANT TABLE VALIDATION
-- ============================================================================

DO $$
DECLARE
    existing_parlant_tables TEXT[];
    table_name TEXT;
    table_count INTEGER;
BEGIN
    -- Check for existing Parlant tables
    SELECT ARRAY_AGG(table_name) INTO existing_parlant_tables
    FROM information_schema.tables
    WHERE table_name LIKE 'parlant_%';

    IF existing_parlant_tables IS NOT NULL THEN
        -- Migration might be a re-run or update
        PERFORM record_validation(
            'Existing Parlant Schema',
            'WARN',
            'Found existing Parlant tables: ' || array_to_string(existing_parlant_tables, ', '),
            'WARN'
        );

        -- Check data in existing tables
        FOREACH table_name IN ARRAY existing_parlant_tables LOOP
            EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO table_count;

            IF table_count > 0 THEN
                PERFORM record_validation(
                    'Existing Data: ' || table_name,
                    'WARN',
                    format('Table contains %s records - data may be overwritten', table_count),
                    'WARN'
                );
            END IF;
        END LOOP;
    ELSE
        PERFORM record_validation(
            'Existing Parlant Schema',
            'PASS',
            'No existing Parlant tables found - clean installation'
        );
    END IF;
END $$;

-- ============================================================================
-- DATABASE PERMISSIONS VALIDATION
-- ============================================================================

DO $$
DECLARE
    can_create_table BOOLEAN := false;
    can_create_index BOOLEAN := false;
    can_create_type BOOLEAN := false;
    can_create_function BOOLEAN := false;
BEGIN
    -- Test table creation permissions
    BEGIN
        CREATE TEMP TABLE validation_test_table (id INTEGER);
        DROP TABLE validation_test_table;
        can_create_table := true;
    EXCEPTION WHEN OTHERS THEN
        can_create_table := false;
    END;

    -- Test index creation (we'll test on a temp table)
    BEGIN
        CREATE TEMP TABLE validation_index_test (id INTEGER);
        CREATE INDEX validation_test_idx ON validation_index_test(id);
        DROP TABLE validation_index_test;
        can_create_index := true;
    EXCEPTION WHEN OTHERS THEN
        can_create_index := false;
    END;

    -- Test type creation permissions
    BEGIN
        CREATE TYPE validation_test_enum AS ENUM ('test');
        DROP TYPE validation_test_enum;
        can_create_type := true;
    EXCEPTION WHEN OTHERS THEN
        can_create_type := false;
    END;

    -- Test function creation permissions
    BEGIN
        CREATE FUNCTION validation_test_func() RETURNS TEXT AS 'SELECT ''test''' LANGUAGE SQL;
        DROP FUNCTION validation_test_func();
        can_create_function := true;
    EXCEPTION WHEN OTHERS THEN
        can_create_function := false;
    END;

    -- Record results
    IF can_create_table AND can_create_index AND can_create_type AND can_create_function THEN
        PERFORM record_validation(
            'Database Permissions',
            'PASS',
            'All required permissions available'
        );
    ELSE
        PERFORM record_validation(
            'Database Permissions',
            'FAIL',
            format('Missing permissions - Tables: %s, Indexes: %s, Types: %s, Functions: %s',
                can_create_table, can_create_index, can_create_type, can_create_function),
            'ERROR'
        );
    END IF;
END $$;

-- ============================================================================
-- DATABASE RESOURCES VALIDATION
-- ============================================================================

DO $$
DECLARE
    db_size_mb NUMERIC;
    available_connections INTEGER;
    current_connections INTEGER;
    max_connections INTEGER;
    shared_buffers_mb NUMERIC;
BEGIN
    -- Check database size
    SELECT ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) INTO db_size_mb;

    -- Check connection limits
    SELECT setting::INTEGER INTO max_connections FROM pg_settings WHERE name = 'max_connections';
    SELECT COUNT(*) INTO current_connections FROM pg_stat_activity;
    available_connections := max_connections - current_connections;

    -- Check shared buffers
    SELECT ROUND(setting::NUMERIC * 8192 / 1024.0 / 1024.0, 2) INTO shared_buffers_mb
    FROM pg_settings WHERE name = 'shared_buffers';

    -- Validate resources
    PERFORM record_validation(
        'Database Size',
        'INFO',
        format('Current database size: %s MB', db_size_mb)
    );

    IF available_connections > 10 THEN
        PERFORM record_validation(
            'Connection Capacity',
            'PASS',
            format('%s connections available (%s/%s)', available_connections, current_connections, max_connections)
        );
    ELSE
        PERFORM record_validation(
            'Connection Capacity',
            'WARN',
            format('Low connection availability: %s available', available_connections),
            'WARN'
        );
    END IF;

    PERFORM record_validation(
        'Memory Configuration',
        'INFO',
        format('Shared buffers: %s MB', shared_buffers_mb)
    );
END $$;

-- ============================================================================
-- CONCURRENT MIGRATION VALIDATION
-- ============================================================================

DO $$
DECLARE
    active_migrations INTEGER;
    migration_locks INTEGER;
BEGIN
    -- Check for other active migrations (advisory locks)
    SELECT COUNT(*) INTO migration_locks
    FROM pg_locks
    WHERE locktype = 'advisory'
    AND classid = 5555;

    -- Check for long-running DDL operations
    SELECT COUNT(*) INTO active_migrations
    FROM pg_stat_activity
    WHERE state = 'active'
    AND query ILIKE '%CREATE TABLE%'
    OR query ILIKE '%ALTER TABLE%'
    OR query ILIKE '%DROP TABLE%'
    AND pid != pg_backend_pid();

    IF migration_locks = 0 AND active_migrations = 0 THEN
        PERFORM record_validation(
            'Concurrent Operations',
            'PASS',
            'No conflicting migrations or DDL operations detected'
        );
    ELSE
        PERFORM record_validation(
            'Concurrent Operations',
            'WARN',
            format('%s migration locks, %s active DDL operations', migration_locks, active_migrations),
            'WARN'
        );
    END IF;
END $$;

-- ============================================================================
-- WORKSPACE DATA INTEGRITY VALIDATION
-- ============================================================================

DO $$
DECLARE
    workspace_count INTEGER;
    user_count INTEGER;
    orphaned_workspaces INTEGER;
    workspace_with_workflows INTEGER;
BEGIN
    SELECT COUNT(*) INTO workspace_count FROM workspace;
    SELECT COUNT(*) INTO user_count FROM "user";

    -- Check for orphaned workspaces
    SELECT COUNT(*) INTO orphaned_workspaces
    FROM workspace w
    LEFT JOIN "user" u ON u.id = w.owner_id
    WHERE u.id IS NULL;

    -- Check workspaces with workflows (important for integration)
    SELECT COUNT(DISTINCT workspace_id) INTO workspace_with_workflows
    FROM workflow
    WHERE workspace_id IS NOT NULL;

    PERFORM record_validation(
        'System Scale',
        'INFO',
        format('System has %s workspaces, %s users, %s workspaces with workflows',
            workspace_count, user_count, workspace_with_workflows)
    );

    IF orphaned_workspaces = 0 THEN
        PERFORM record_validation(
            'Data Integrity',
            'PASS',
            'No orphaned workspaces found'
        );
    ELSE
        PERFORM record_validation(
            'Data Integrity',
            'WARN',
            format('%s orphaned workspaces found', orphaned_workspaces),
            'WARN'
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
    critical_failures INTEGER;
    validation_summary TEXT;
    result_record RECORD;
    migration_safe BOOLEAN := true;
BEGIN
    -- Count validation results
    SELECT COUNT(*) INTO total_checks FROM validation_results;
    SELECT COUNT(*) INTO passed_checks FROM validation_results WHERE status = 'PASS';
    SELECT COUNT(*) INTO failed_checks FROM validation_results WHERE status = 'FAIL';
    SELECT COUNT(*) INTO warnings FROM validation_results WHERE status = 'WARN';
    SELECT COUNT(*) INTO critical_failures FROM validation_results WHERE severity = 'ERROR';

    -- Determine if migration is safe
    migration_safe := (critical_failures = 0);

    -- Generate summary report
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PRE-MIGRATION VALIDATION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total checks: %', total_checks;
    RAISE NOTICE 'Passed: % (%.1f%%)', passed_checks, (passed_checks::FLOAT / total_checks * 100);
    RAISE NOTICE 'Failed: % (%.1f%%)', failed_checks, (failed_checks::FLOAT / total_checks * 100);
    RAISE NOTICE 'Warnings: % (%.1f%%)', warnings, (warnings::FLOAT / total_checks * 100);
    RAISE NOTICE 'Critical failures: %', critical_failures;
    RAISE NOTICE '========================================';

    -- Show detailed results
    FOR result_record IN
        SELECT check_name, status, message, severity
        FROM validation_results
        ORDER BY
            CASE severity
                WHEN 'ERROR' THEN 1
                WHEN 'WARN' THEN 2
                ELSE 3
            END,
            check_name
    LOOP
        RAISE NOTICE '[%] %: %', result_record.severity, result_record.check_name, result_record.message;
    END LOOP;

    RAISE NOTICE '========================================';

    -- Migration recommendation
    IF migration_safe THEN
        RAISE NOTICE 'RECOMMENDATION: MIGRATION IS SAFE TO PROCEED';
        RAISE NOTICE 'All critical requirements are met.';
        IF warnings > 0 THEN
            RAISE NOTICE 'Note: % warnings require attention but do not block migration.', warnings;
        END IF;
    ELSE
        RAISE WARNING 'RECOMMENDATION: MIGRATION IS NOT SAFE';
        RAISE WARNING 'Critical failures must be resolved before proceeding.';
        RAISE WARNING 'Fix all ERROR-level issues and re-run validation.';
    END IF;

    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop temporary validation functions
DROP FUNCTION log_validation_result(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION record_validation(TEXT, TEXT, TEXT, TEXT);

-- Note: validation_results table is temporary and will be dropped automatically

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'PRE-MIGRATION VALIDATION COMPLETED';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Review validation results above';
    RAISE NOTICE '2. Fix any ERROR-level issues';
    RAISE NOTICE '3. Address WARNING-level issues if needed';
    RAISE NOTICE '4. Re-run validation if changes were made';
    RAISE NOTICE '5. Proceed with migration: 0092_parlant_schema_comprehensive.sql';
    RAISE NOTICE '';
END $$;