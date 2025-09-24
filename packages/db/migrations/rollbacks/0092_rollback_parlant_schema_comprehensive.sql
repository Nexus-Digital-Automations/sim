-- Rollback Script for Parlant Schema Migration
-- Migration: 0092_parlant_schema_comprehensive
-- Purpose: Safe rollback of Parlant schema with data preservation options
-- Created: 2025-09-24
-- Version: 1.1.0
-- Safety: CRITICAL - This will permanently delete data

-- ============================================================================
-- PRE-ROLLBACK WARNINGS AND VALIDATION
-- ============================================================================

DO $$
DECLARE
    total_agents INTEGER;
    total_sessions INTEGER;
    total_events INTEGER;
    migration_safe BOOLEAN := false;
BEGIN
    -- Check if Parlant tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parlant_agent') THEN
        RAISE NOTICE 'PARLANT ROLLBACK: No Parlant tables found. Nothing to rollback.';
        RETURN;
    END IF;

    -- Count existing data
    SELECT COUNT(*) INTO total_agents FROM parlant_agent WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO total_sessions FROM parlant_session;
    SELECT COUNT(*) INTO total_events FROM parlant_event;

    RAISE WARNING '========================================';
    RAISE WARNING 'PARLANT SCHEMA ROLLBACK WARNING';
    RAISE WARNING '========================================';
    RAISE WARNING 'This rollback will permanently delete:';
    RAISE WARNING '- % active agents', total_agents;
    RAISE WARNING '- % conversation sessions', total_sessions;
    RAISE WARNING '- % events and messages', total_events;
    RAISE WARNING 'Total data loss: ALL PARLANT DATA';
    RAISE WARNING '========================================';

    -- Check if safe to proceed (no critical data)
    IF total_agents = 0 AND total_sessions = 0 AND total_events = 0 THEN
        migration_safe := true;
        RAISE NOTICE 'SAFE ROLLBACK: No data to lose';
    ELSE
        RAISE NOTICE 'DATA LOSS ROLLBACK: Proceeding with data destruction';
    END IF;

    -- Log rollback start
    RAISE NOTICE 'PARLANT ROLLBACK START: timestamp=%', NOW();
END $$;

-- ============================================================================
-- DATA BACKUP OPTIONS (Optional - Uncomment if needed)
-- ============================================================================

-- OPTION 1: Backup to temporary tables (uncomment to enable)
/*
-- Create backup schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS parlant_backup;

-- Backup critical data
CREATE TABLE IF NOT EXISTS parlant_backup.agents_backup AS SELECT * FROM parlant_agent;
CREATE TABLE IF NOT EXISTS parlant_backup.sessions_backup AS SELECT * FROM parlant_session;
CREATE TABLE IF NOT EXISTS parlant_backup.events_backup AS SELECT * FROM parlant_event;
CREATE TABLE IF NOT EXISTS parlant_backup.guidelines_backup AS SELECT * FROM parlant_guideline;

RAISE NOTICE 'Data backed up to parlant_backup schema';
*/

-- OPTION 2: Export to JSON files (requires file system access)
/*
-- Export agents
COPY (SELECT row_to_json(t) FROM parlant_agent t) TO '/tmp/parlant_agents_backup.json';
-- Export sessions
COPY (SELECT row_to_json(t) FROM parlant_session t) TO '/tmp/parlant_sessions_backup.json';

RAISE NOTICE 'Data exported to /tmp/parlant_*_backup.json';
*/

-- ============================================================================
-- MIGRATION LOCK (Prevent concurrent operations)
-- ============================================================================

SELECT pg_advisory_lock(5555, 2025);

-- ============================================================================
-- DROP DEPENDENT OBJECTS FIRST
-- ============================================================================

-- Drop views that depend on Parlant tables
DROP VIEW IF EXISTS v_parlant_agent_performance CASCADE;
DROP VIEW IF EXISTS v_parlant_session_analytics CASCADE;

-- Drop utility functions
DROP FUNCTION IF EXISTS increment_parlant_counter(TEXT, TEXT, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS calculate_success_rate(INTEGER, INTEGER) CASCADE;

-- ============================================================================
-- DROP TRIGGERS AND FUNCTIONS
-- ============================================================================

DO $$
DECLARE
    table_name TEXT;
    trigger_name TEXT;
BEGIN
    -- Drop all updated_at triggers
    FOR table_name IN
        SELECT unnest(ARRAY[
            'parlant_agent',
            'parlant_session',
            'parlant_guideline',
            'parlant_journey',
            'parlant_journey_state',
            'parlant_variable',
            'parlant_tool',
            'parlant_term',
            'parlant_canned_response'
        ])
    LOOP
        trigger_name := 'update_' || table_name || '_updated_at';
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, table_name);
            RAISE NOTICE 'Dropped trigger: %', trigger_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop trigger %: %', trigger_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Drop the updated_at trigger function if no other tables use it
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name LIKE '%updated_at%'
    AND trigger_name NOT LIKE '%parlant%';

    IF trigger_count = 0 THEN
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
        RAISE NOTICE 'Dropped update_updated_at_column function';
    ELSE
        RAISE NOTICE 'Keeping update_updated_at_column function (used by % other triggers)', trigger_count;
    END IF;
END $$;

-- ============================================================================
-- DROP FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Remove foreign key constraints to avoid dependency issues
ALTER TABLE IF EXISTS parlant_session DROP CONSTRAINT IF EXISTS fk_parlant_session_current_journey;
ALTER TABLE IF EXISTS parlant_session DROP CONSTRAINT IF EXISTS fk_parlant_session_current_state;
ALTER TABLE IF EXISTS parlant_event DROP CONSTRAINT IF EXISTS fk_parlant_event_journey;
ALTER TABLE IF EXISTS parlant_event DROP CONSTRAINT IF EXISTS fk_parlant_event_state;

RAISE NOTICE 'Dropped foreign key constraints';

-- ============================================================================
-- DROP TABLES IN DEPENDENCY ORDER
-- ============================================================================

-- Drop junction/relationship tables first
DROP TABLE IF EXISTS parlant_tool_integration CASCADE;
DROP TABLE IF EXISTS parlant_agent_knowledge_base CASCADE;
DROP TABLE IF EXISTS parlant_journey_guideline CASCADE;
DROP TABLE IF EXISTS parlant_agent_tool CASCADE;
DROP TABLE IF EXISTS parlant_session_workflow CASCADE;
DROP TABLE IF EXISTS parlant_agent_api_key CASCADE;
DROP TABLE IF EXISTS parlant_agent_workflow CASCADE;

RAISE NOTICE 'Dropped junction tables';

-- Drop child tables that reference parent tables
DROP TABLE IF EXISTS parlant_event CASCADE;
DROP TABLE IF EXISTS parlant_journey_transition CASCADE;
DROP TABLE IF EXISTS parlant_journey_state CASCADE;
DROP TABLE IF EXISTS parlant_variable CASCADE;
DROP TABLE IF EXISTS parlant_canned_response CASCADE;
DROP TABLE IF EXISTS parlant_term CASCADE;
DROP TABLE IF EXISTS parlant_guideline CASCADE;

RAISE NOTICE 'Dropped child tables';

-- Drop parent tables
DROP TABLE IF EXISTS parlant_journey CASCADE;
DROP TABLE IF EXISTS parlant_tool CASCADE;
DROP TABLE IF EXISTS parlant_session CASCADE;
DROP TABLE IF EXISTS parlant_agent CASCADE;

RAISE NOTICE 'Dropped parent tables';

-- ============================================================================
-- DROP ENUMS
-- ============================================================================

-- Drop enums in order (check dependencies first)
DO $$
DECLARE
    enum_name TEXT;
    enum_usage INTEGER;
BEGIN
    FOR enum_name IN
        SELECT unnest(ARRAY[
            'composition_mode',
            'journey_state_type',
            'event_type',
            'session_status',
            'session_mode',
            'agent_status'
        ])
    LOOP
        -- Check if enum is still used elsewhere
        SELECT COUNT(*) INTO enum_usage
        FROM information_schema.columns
        WHERE udt_name = enum_name
        AND table_name NOT LIKE 'parlant_%';

        IF enum_usage = 0 THEN
            BEGIN
                EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', enum_name);
                RAISE NOTICE 'Dropped enum: %', enum_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not drop enum %: %', enum_name, SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'Keeping enum % (used by % non-Parlant columns)', enum_name, enum_usage;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- CLEANUP ORPHANED INDEXES
-- ============================================================================

-- Clean up any remaining Parlant-specific indexes
DO $$
DECLARE
    index_record RECORD;
BEGIN
    FOR index_record IN
        SELECT schemaname, indexname
        FROM pg_indexes
        WHERE indexname LIKE '%parlant%'
        OR indexname LIKE '%idx_parlant_%'
    LOOP
        BEGIN
            EXECUTE format('DROP INDEX IF EXISTS %I.%I', index_record.schemaname, index_record.indexname);
            RAISE NOTICE 'Dropped orphaned index: %', index_record.indexname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop index %: %', index_record.indexname, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- CLEANUP PARLANT-SPECIFIC SEQUENCES
-- ============================================================================

-- Drop any auto-generated sequences for Parlant tables
DO $$
DECLARE
    sequence_record RECORD;
BEGIN
    FOR sequence_record IN
        SELECT schemaname, sequencename
        FROM pg_sequences
        WHERE sequencename LIKE '%parlant%'
    LOOP
        BEGIN
            EXECUTE format('DROP SEQUENCE IF EXISTS %I.%I CASCADE', sequence_record.schemaname, sequence_record.sequencename);
            RAISE NOTICE 'Dropped sequence: %', sequence_record.sequencename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop sequence %: %', sequence_record.sequencename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- VERIFY ROLLBACK COMPLETION
-- ============================================================================

DO $$
DECLARE
    remaining_tables INTEGER;
    remaining_enums INTEGER;
    remaining_functions INTEGER;
BEGIN
    -- Check for remaining Parlant tables
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables
    WHERE table_name LIKE 'parlant_%';

    -- Check for remaining Parlant enums
    SELECT COUNT(*) INTO remaining_enums
    FROM pg_type
    WHERE typname IN ('agent_status', 'session_mode', 'session_status', 'event_type', 'journey_state_type', 'composition_mode');

    -- Check for remaining Parlant functions
    SELECT COUNT(*) INTO remaining_functions
    FROM information_schema.routines
    WHERE routine_name LIKE '%parlant%';

    IF remaining_tables = 0 AND remaining_enums = 0 AND remaining_functions = 0 THEN
        RAISE NOTICE 'ROLLBACK SUCCESSFUL: All Parlant schema objects removed';
    ELSE
        RAISE WARNING 'ROLLBACK INCOMPLETE: % tables, % enums, % functions remain',
            remaining_tables, remaining_enums, remaining_functions;
    END IF;

    -- Final verification
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parlant_agent') THEN
        RAISE EXCEPTION 'ROLLBACK FAILED: Core table parlant_agent still exists';
    END IF;
END $$;

-- ============================================================================
-- CLEANUP MIGRATION TRACKING (Optional)
-- ============================================================================

-- Remove migration record if migration tracking exists
-- NOTE: This depends on your migration system structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '__drizzle_migrations') THEN
        DELETE FROM __drizzle_migrations WHERE hash LIKE '%parlant%' OR folder LIKE '%0092%';
        RAISE NOTICE 'Removed migration tracking records';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not clean migration tracking: %', SQLERRM;
END $$;

-- ============================================================================
-- VACUUM AND ANALYZE
-- ============================================================================

-- Clean up any remaining references and update statistics
VACUUM ANALYZE;

-- Release advisory lock
SELECT pg_advisory_unlock(5555, 2025);

-- ============================================================================
-- ROLLBACK COMPLETION LOG
-- ============================================================================

DO $$
DECLARE
    final_verification BOOLEAN := true;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PARLANT SCHEMA ROLLBACK COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables dropped: 11+ (all Parlant tables)';
    RAISE NOTICE 'Enums dropped: 6 (if not used elsewhere)';
    RAISE NOTICE 'Indexes dropped: ~75+ (all Parlant indexes)';
    RAISE NOTICE 'Triggers dropped: 9';
    RAISE NOTICE 'Views dropped: 2';
    RAISE NOTICE 'Functions dropped: 2-3';
    RAISE NOTICE 'Data loss: ALL PARLANT DATA PERMANENTLY DELETED';
    RAISE NOTICE 'Rollback timestamp: %', NOW();
    RAISE NOTICE '========================================';
    RAISE NOTICE 'WARNING: This rollback cannot be undone!';
    RAISE NOTICE 'Restore from backup if data recovery needed.';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- POST-ROLLBACK INSTRUCTIONS
-- ============================================================================

/*
POST-ROLLBACK CHECKLIST:

1. VERIFY APPLICATION FUNCTIONALITY
   - Ensure existing Sim features work correctly
   - Check that no Parlant references remain in application code
   - Test that workspace and user operations are unaffected

2. DATA RECOVERY (if needed)
   - Restore from parlant_backup schema if created above
   - Import from JSON backups if exported above
   - Recreate test data if in development environment

3. CLEAN UP CODE REFERENCES
   - Update application imports that reference parlant-schema
   - Remove Parlant-related API endpoints
   - Clean up any remaining Parlant service files

4. MONITOR LOGS
   - Watch for any Parlant-related errors in application logs
   - Check for foreign key violations or missing table errors
   - Monitor database performance after cleanup

5. OPTIONAL CLEANUP
   - Remove backup data when no longer needed:
     DROP SCHEMA IF EXISTS parlant_backup CASCADE;
   - Clean up exported files:
     rm /tmp/parlant_*_backup.json

RECOVERY COMMANDS (if rollback was unintended):
- Re-run the forward migration: 0092_parlant_schema_comprehensive.sql
- Restore backed up data if available
- Contact DBA if critical data was lost

*/