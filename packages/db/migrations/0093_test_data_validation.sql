-- Test Script for Data Validation Constraints
-- This script tests all validation constraints and triggers implemented for Parlant tables
-- Run this script after applying the main data validation migration

DO $$
DECLARE
  test_workspace_id TEXT;
  test_user_id TEXT;
  test_agent_id UUID;
  test_session_id UUID;
  test_journey_id UUID;
  test_state_id UUID;
  test_tool_id UUID;
  test_kb_id TEXT;
  test_workflow_id TEXT;
  test_api_key_id TEXT;
  constraint_violation_count INTEGER := 0;
  test_passed_count INTEGER := 0;
  test_failed_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting Parlant Data Validation Constraint Tests...';

  -- Create test data first
  INSERT INTO "workspace" (id, name, owner_id, created_at, updated_at)
  VALUES ('test_ws_validation', 'Test Workspace', 'test_user_validation', NOW(), NOW());
  test_workspace_id := 'test_ws_validation';

  INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
  VALUES ('test_user_validation', 'Test User', 'test@validation.com', TRUE, NOW(), NOW());
  test_user_id := 'test_user_validation';

  -- Create a test knowledge base
  INSERT INTO knowledge_base (id, user_id, workspace_id, name, description, created_at, updated_at)
  VALUES ('test_kb_validation', test_user_id, test_workspace_id, 'Test KB', 'Test Knowledge Base', NOW(), NOW());
  test_kb_id := 'test_kb_validation';

  -- Create a test workflow
  INSERT INTO workflow (id, user_id, workspace_id, name, description, last_synced, created_at, updated_at)
  VALUES ('test_workflow_validation', test_user_id, test_workspace_id, 'Test Workflow', 'Test Workflow', NOW(), NOW(), NOW());
  test_workflow_id := 'test_workflow_validation';

  -- Create a test API key
  INSERT INTO api_key (id, user_id, workspace_id, created_by, name, key, type, created_at, updated_at)
  VALUES ('test_api_key_validation', test_user_id, test_workspace_id, test_user_id, 'Test API Key', 'test_key_12345', 'workspace', NOW(), NOW());
  test_api_key_id := 'test_api_key_validation';

  -- ============================================================================
  -- TEST 1: Parlant Agent Validation Constraints
  -- ============================================================================
  RAISE NOTICE 'Testing Parlant Agent Constraints...';

  -- Test valid agent creation
  BEGIN
    INSERT INTO parlant_agent (id, workspace_id, created_by, name, description, temperature, max_tokens, response_timeout_ms, max_context_length, conversation_style, pii_handling_mode, data_retention_days)
    VALUES (gen_random_uuid(), test_workspace_id, test_user_id, 'Test Agent', 'Test Agent Description', 70, 2000, 30000, 8000, 'professional', 'standard', 30)
    RETURNING id INTO test_agent_id;
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Valid agent creation passed';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Valid agent creation failed: %', SQLERRM;
  END;

  -- Test invalid temperature (should fail)
  BEGIN
    INSERT INTO parlant_agent (workspace_id, created_by, name, temperature)
    VALUES (test_workspace_id, test_user_id, 'Invalid Agent', 150);
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Invalid temperature constraint not enforced';
  EXCEPTION WHEN check_violation THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Temperature constraint properly enforced';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Unexpected error testing temperature: %', SQLERRM;
  END;

  -- Test invalid conversation style (should fail)
  BEGIN
    INSERT INTO parlant_agent (workspace_id, created_by, name, conversation_style)
    VALUES (test_workspace_id, test_user_id, 'Invalid Agent', 'invalid_style');
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Invalid conversation style constraint not enforced';
  EXCEPTION WHEN check_violation THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Conversation style constraint properly enforced';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Unexpected error testing conversation style: %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 2: Parlant Session Validation Constraints
  -- ============================================================================
  RAISE NOTICE 'Testing Parlant Session Constraints...';

  -- Test valid session creation
  BEGIN
    INSERT INTO parlant_session (id, agent_id, workspace_id, user_id, title, session_type, locale, satisfaction_score)
    VALUES (gen_random_uuid(), test_agent_id, test_workspace_id, test_user_id, 'Test Session', 'conversation', 'en', 5)
    RETURNING id INTO test_session_id;
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Valid session creation passed';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Valid session creation failed: %', SQLERRM;
  END;

  -- Test invalid satisfaction score (should fail)
  BEGIN
    INSERT INTO parlant_session (agent_id, workspace_id, title, satisfaction_score)
    VALUES (test_agent_id, test_workspace_id, 'Invalid Session', 10);
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Invalid satisfaction score constraint not enforced';
  EXCEPTION WHEN check_violation THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Satisfaction score constraint properly enforced';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Unexpected error testing satisfaction score: %', SQLERRM;
  END;

  -- Test invalid locale format (should fail)
  BEGIN
    INSERT INTO parlant_session (agent_id, workspace_id, title, locale)
    VALUES (test_agent_id, test_workspace_id, 'Invalid Session', 'invalid_locale_format');
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Invalid locale format constraint not enforced';
  EXCEPTION WHEN check_violation THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Locale format constraint properly enforced';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Unexpected error testing locale format: %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 3: Workspace Isolation Validation
  -- ============================================================================
  RAISE NOTICE 'Testing Workspace Isolation Constraints...';

  -- Create second workspace for isolation testing
  INSERT INTO "workspace" (id, name, owner_id, created_at, updated_at)
  VALUES ('test_ws2_validation', 'Test Workspace 2', test_user_id, NOW(), NOW());

  -- Create agent in second workspace
  INSERT INTO parlant_agent (id, workspace_id, created_by, name)
  VALUES (gen_random_uuid(), 'test_ws2_validation', test_user_id, 'Agent in WS2')
  RETURNING id INTO test_agent_id;

  -- Test session with mismatched workspace (should fail due to trigger)
  BEGIN
    INSERT INTO parlant_session (agent_id, workspace_id, title)
    VALUES (test_agent_id, test_workspace_id, 'Cross-workspace Session');
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Workspace isolation constraint not enforced for sessions';
  EXCEPTION WHEN OTHERS THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Workspace isolation constraint properly enforced for sessions';
  END;

  -- ============================================================================
  -- TEST 4: Journey and State Validation
  -- ============================================================================
  RAISE NOTICE 'Testing Journey and State Constraints...';

  -- Reset agent to first workspace for further tests
  SELECT id INTO test_agent_id FROM parlant_agent WHERE workspace_id = test_workspace_id LIMIT 1;

  -- Create valid journey
  BEGIN
    INSERT INTO parlant_journey (id, agent_id, title, conditions, completion_rate)
    VALUES (gen_random_uuid(), test_agent_id, 'Test Journey', '["condition1"]', 85)
    RETURNING id INTO test_journey_id;
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Valid journey creation passed';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Valid journey creation failed: %', SQLERRM;
  END;

  -- Test invalid completion rate (should fail)
  BEGIN
    INSERT INTO parlant_journey (agent_id, title, conditions, completion_rate)
    VALUES (test_agent_id, 'Invalid Journey', '["condition1"]', 150);
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Invalid completion rate constraint not enforced';
  EXCEPTION WHEN check_violation THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Completion rate constraint properly enforced';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Unexpected error testing completion rate: %', SQLERRM;
  END;

  -- Create journey states for transition testing
  INSERT INTO parlant_journey_state (id, journey_id, name, state_type, chat_prompt, is_initial)
  VALUES (gen_random_uuid(), test_journey_id, 'Initial State', 'chat', 'Hello! How can I help?', TRUE)
  RETURNING id INTO test_state_id;

  -- Test transition to same state (should fail)
  BEGIN
    INSERT INTO parlant_journey_transition (journey_id, from_state_id, to_state_id)
    VALUES (test_journey_id, test_state_id, test_state_id);
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Self-loop constraint not enforced';
  EXCEPTION WHEN check_violation THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Self-loop constraint properly enforced';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Unexpected error testing self-loop: %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 5: Tool Validation Constraints
  -- ============================================================================
  RAISE NOTICE 'Testing Tool Validation Constraints...';

  -- Create valid tool
  BEGIN
    INSERT INTO parlant_tool (id, workspace_id, name, display_name, description, parameters, execution_timeout, rate_limit_per_minute, auth_type)
    VALUES (gen_random_uuid(), test_workspace_id, 'test_tool', 'Test Tool', 'A test tool', '{"type": "object"}', 30000, 60, 'api_key')
    RETURNING id INTO test_tool_id;
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Valid tool creation passed';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Valid tool creation failed: %', SQLERRM;
  END;

  -- Test invalid execution timeout (should fail)
  BEGIN
    INSERT INTO parlant_tool (workspace_id, name, display_name, description, parameters, execution_timeout)
    VALUES (test_workspace_id, 'invalid_tool', 'Invalid Tool', 'Invalid tool', '{"type": "object"}', 400000);
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Invalid execution timeout constraint not enforced';
  EXCEPTION WHEN check_violation THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Execution timeout constraint properly enforced';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Unexpected error testing execution timeout: %', SQLERRM;
  END;

  -- Test invalid auth type (should fail)
  BEGIN
    INSERT INTO parlant_tool (workspace_id, name, display_name, description, parameters, auth_type)
    VALUES (test_workspace_id, 'invalid_tool2', 'Invalid Tool 2', 'Invalid tool', '{"type": "object"}', 'invalid_auth');
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Invalid auth type constraint not enforced';
  EXCEPTION WHEN check_violation THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Auth type constraint properly enforced';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Unexpected error testing auth type: %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 6: Junction Table Validation
  -- ============================================================================
  RAISE NOTICE 'Testing Junction Table Constraints...';

  -- Test valid agent-tool relationship
  BEGIN
    INSERT INTO parlant_agent_tool (agent_id, tool_id, priority)
    VALUES (test_agent_id, test_tool_id, 100);
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Valid agent-tool relationship created';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Valid agent-tool relationship failed: %', SQLERRM;
  END;

  -- Test valid agent-knowledge base relationship
  BEGIN
    INSERT INTO parlant_agent_knowledge_base (agent_id, knowledge_base_id, search_threshold, max_results, priority)
    VALUES (test_agent_id, test_kb_id, 80, 5, 100);
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Valid agent-knowledge base relationship created';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Valid agent-knowledge base relationship failed: %', SQLERRM;
  END;

  -- Test invalid search threshold (should fail)
  BEGIN
    INSERT INTO parlant_agent_knowledge_base (agent_id, knowledge_base_id, search_threshold)
    VALUES (test_agent_id, test_kb_id, 150);
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Invalid search threshold constraint not enforced';
  EXCEPTION WHEN check_violation THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Search threshold constraint properly enforced';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Unexpected error testing search threshold: %', SQLERRM;
  END;

  -- Test valid agent-workflow relationship
  BEGIN
    INSERT INTO parlant_agent_workflow (agent_id, workflow_id, workspace_id, integration_type, trigger_conditions, input_mapping)
    VALUES (test_agent_id, test_workflow_id, test_workspace_id, 'trigger', '["condition1"]', '{"input": "value"}');
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Valid agent-workflow relationship created';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Valid agent-workflow relationship failed: %', SQLERRM;
  END;

  -- Test invalid integration type (should fail)
  BEGIN
    INSERT INTO parlant_agent_workflow (agent_id, workflow_id, workspace_id, integration_type)
    VALUES (test_agent_id, test_workflow_id, test_workspace_id, 'invalid_type');
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Invalid integration type constraint not enforced';
  EXCEPTION WHEN check_violation THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Integration type constraint properly enforced';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Unexpected error testing integration type: %', SQLERRM;
  END;

  -- Test valid agent-API key relationship
  BEGIN
    INSERT INTO parlant_agent_api_key (agent_id, api_key_id, workspace_id, purpose, priority)
    VALUES (test_agent_id, test_api_key_id, test_workspace_id, 'tools', 100);
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Valid agent-API key relationship created';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Valid agent-API key relationship failed: %', SQLERRM;
  END;

  -- Test invalid purpose (should fail)
  BEGIN
    INSERT INTO parlant_agent_api_key (agent_id, api_key_id, workspace_id, purpose)
    VALUES (test_agent_id, test_api_key_id, test_workspace_id, 'invalid_purpose');
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Invalid purpose constraint not enforced';
  EXCEPTION WHEN check_violation THEN
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Purpose constraint properly enforced';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Unexpected error testing purpose: %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST 7: Data Consistency Functions
  -- ============================================================================
  RAISE NOTICE 'Testing Data Consistency Functions...';

  -- Test validation function
  BEGIN
    PERFORM validate_parlant_data_consistency();
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Data consistency validation function executed successfully';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Data consistency validation function failed: %', SQLERRM;
  END;

  -- Test repair function
  BEGIN
    PERFORM repair_parlant_data_inconsistencies();
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Data repair function executed successfully';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Data repair function failed: %', SQLERRM;
  END;

  -- Test cleanup functions
  BEGIN
    PERFORM cleanup_abandoned_sessions(24);
    test_passed_count := test_passed_count + 1;
    RAISE NOTICE '✓ Abandoned sessions cleanup function executed successfully';
  EXCEPTION WHEN OTHERS THEN
    test_failed_count := test_failed_count + 1;
    RAISE NOTICE '✗ Abandoned sessions cleanup function failed: %', SQLERRM;
  END;

  -- ============================================================================
  -- TEST RESULTS SUMMARY
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Parlant Data Validation Constraint Test Results:';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Tests Passed: %', test_passed_count;
  RAISE NOTICE 'Tests Failed: %', test_failed_count;
  RAISE NOTICE 'Total Tests: %', (test_passed_count + test_failed_count);

  IF test_failed_count = 0 THEN
    RAISE NOTICE '✓ ALL TESTS PASSED! Data validation constraints are working correctly.';
  ELSE
    RAISE NOTICE '✗ Some tests failed. Please review the constraints and fix any issues.';
  END IF;

  -- Cleanup test data
  RAISE NOTICE 'Cleaning up test data...';

  DELETE FROM parlant_agent_api_key WHERE workspace_id LIKE 'test_%_validation';
  DELETE FROM parlant_agent_workflow WHERE workspace_id LIKE 'test_%_validation';
  DELETE FROM parlant_agent_knowledge_base WHERE agent_id IN (SELECT id FROM parlant_agent WHERE workspace_id LIKE 'test_%_validation');
  DELETE FROM parlant_agent_tool WHERE agent_id IN (SELECT id FROM parlant_agent WHERE workspace_id LIKE 'test_%_validation');
  DELETE FROM parlant_journey_state WHERE journey_id IN (SELECT id FROM parlant_journey WHERE agent_id IN (SELECT id FROM parlant_agent WHERE workspace_id LIKE 'test_%_validation'));
  DELETE FROM parlant_journey WHERE agent_id IN (SELECT id FROM parlant_agent WHERE workspace_id LIKE 'test_%_validation');
  DELETE FROM parlant_session WHERE workspace_id LIKE 'test_%_validation';
  DELETE FROM parlant_agent WHERE workspace_id LIKE 'test_%_validation';
  DELETE FROM parlant_tool WHERE workspace_id LIKE 'test_%_validation';
  DELETE FROM api_key WHERE id LIKE 'test_%_validation';
  DELETE FROM workflow WHERE id LIKE 'test_%_validation';
  DELETE FROM knowledge_base WHERE id LIKE 'test_%_validation';
  DELETE FROM workspace WHERE id LIKE 'test_%_validation';
  DELETE FROM "user" WHERE id LIKE 'test_%_validation';

  RAISE NOTICE 'Test cleanup completed.';

END $$;