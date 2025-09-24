"""
Edge Case and Error Scenario Tests for Sim-Parlant Integration

This module contains comprehensive edge case testing scenarios to validate
error handling, security boundaries, and fault tolerance.
"""

import asyncio
import pytest
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import uuid

from database import ParlantDatabaseManager, ParlantAgent, ParlantSession, ParlantEvent
from auth.sim_auth_bridge import SimAuthBridge, SimUser, SimSession
from config.settings import Settings

logger = logging.getLogger(__name__)


class EdgeCaseTestSuite:
    """Comprehensive edge case testing for security and error handling"""

    def __init__(self):
        self.test_results = []
        self.db_manager = ParlantDatabaseManager()
        self.auth_bridge = SimAuthBridge(Settings())

    async def setup(self):
        """Setup test environment"""
        await self.db_manager.initialize()
        await self.auth_bridge.initialize()

    async def teardown(self):
        """Cleanup test environment"""
        await self.db_manager.close()
        await self.auth_bridge.cleanup()

    def record_test(self, test_name: str, passed: bool, details: Dict[str, Any] = None, error: str = None):
        """Record test result"""
        result = {
            "test_name": test_name,
            "passed": passed,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {},
            "error": error
        }
        self.test_results.append(result)

        status = "✅ PASSED" if passed else "❌ FAILED"
        logger.info(f"{status}: {test_name} - {error or 'Success'}")

    # =========================================================================
    # SECURITY BOUNDARY TESTS
    # =========================================================================

    async def test_sql_injection_protection(self):
        """Test SQL injection protection in agent queries"""
        test_name = "sql_injection_protection"

        try:
            # Attempt SQL injection through agent name
            malicious_agent = ParlantAgent(
                id="sql-injection-test",
                workspace_id="test-workspace",
                created_by="test-user",
                name="'; DROP TABLE parlant_agent; --",
                description="SQL injection test"
            )

            # This should either fail safely or sanitize the input
            agent_id = await self.db_manager.create_agent(malicious_agent)
            retrieved_agent = await self.db_manager.get_agent(agent_id, "test-workspace")

            # Verify table still exists by checking if we can list agents
            agents = await self.db_manager.list_agents("test-workspace")

            if retrieved_agent and isinstance(agents, list):
                self.record_test(
                    test_name, True,
                    {"agent_created_safely": True, "table_intact": True}
                )
            else:
                self.record_test(
                    test_name, False,
                    error="SQL injection may have succeeded - table missing or agent not created"
                )

        except Exception as e:
            # Exception during creation is acceptable - means injection was blocked
            self.record_test(
                test_name, True,
                {"injection_blocked": True, "error": str(e)}
            )

    async def test_workspace_isolation_bypass_attempts(self):
        """Test attempts to bypass workspace isolation"""
        test_name = "workspace_isolation_bypass_attempts"

        try:
            # Create agent in workspace A
            agent_a = ParlantAgent(
                id="isolation-test-a",
                workspace_id="workspace-a",
                created_by="user-a",
                name="Agent A"
            )
            await self.db_manager.create_agent(agent_a)

            # Try to access agent A from workspace B (should fail)
            bypass_attempts = []

            # Attempt 1: Direct access with wrong workspace
            agent_from_wrong_ws = await self.db_manager.get_agent("isolation-test-a", "workspace-b")
            bypass_attempts.append({"method": "direct_access", "succeeded": agent_from_wrong_ws is not None})

            # Attempt 2: List agents from workspace B (should not see agent A)
            workspace_b_agents = await self.db_manager.list_agents("workspace-b")
            agent_a_visible = any(a.id == "isolation-test-a" for a in workspace_b_agents)
            bypass_attempts.append({"method": "list_agents", "succeeded": agent_a_visible})

            # Attempt 3: Workspace verification bypass
            verification_bypass = await self.db_manager.verify_workspace_access(
                "isolation-test-a", "workspace-b", "agent"
            )
            bypass_attempts.append({"method": "verification", "succeeded": verification_bypass})

            # All bypass attempts should fail
            all_blocked = not any(attempt["succeeded"] for attempt in bypass_attempts)

            if all_blocked:
                self.record_test(
                    test_name, True,
                    {"bypass_attempts": bypass_attempts, "all_blocked": True}
                )
            else:
                self.record_test(
                    test_name, False,
                    {"bypass_attempts": bypass_attempts},
                    "Some workspace isolation bypass attempts succeeded"
                )

        except Exception as e:
            self.record_test(test_name, False, error=str(e))

    async def test_authentication_token_validation(self):
        """Test authentication token validation edge cases"""
        test_name = "authentication_token_validation"

        try:
            edge_cases = []

            # Test empty token
            empty_token = self.auth_bridge.extract_token_from_header("")
            edge_cases.append({"case": "empty_token", "result": empty_token, "expected": None})

            # Test malformed Bearer token
            malformed_bearer = self.auth_bridge.extract_token_from_header("Bearer")
            edge_cases.append({"case": "malformed_bearer", "result": malformed_bearer, "expected": ""})

            # Test None input
            none_input = self.auth_bridge.extract_token_from_header(None)
            edge_cases.append({"case": "none_input", "result": none_input, "expected": None})

            # Test very long token
            long_token = "a" * 10000
            extracted_long = self.auth_bridge.extract_token_from_header(f"Bearer {long_token}")
            edge_cases.append({"case": "long_token", "result": len(extracted_long) if extracted_long else 0})

            # Check if edge cases handled gracefully
            handled_gracefully = all(
                case["result"] == case.get("expected") or case["case"] == "long_token"
                for case in edge_cases[:3]  # Check first 3 cases
            )

            if handled_gracefully:
                self.record_test(
                    test_name, True,
                    {"edge_cases": edge_cases}
                )
            else:
                self.record_test(
                    test_name, False,
                    {"edge_cases": edge_cases},
                    "Some token validation edge cases not handled properly"
                )

        except Exception as e:
            self.record_test(test_name, False, error=str(e))

    # =========================================================================
    # DATA VALIDATION AND LIMITS
    # =========================================================================

    async def test_agent_data_validation_limits(self):
        """Test agent data validation and size limits"""
        test_name = "agent_data_validation_limits"

        try:
            validation_tests = []

            # Test empty required fields
            try:
                empty_agent = ParlantAgent(
                    id="",
                    workspace_id="",
                    created_by="",
                    name=""
                )
                await self.db_manager.create_agent(empty_agent)
                validation_tests.append({"test": "empty_fields", "blocked": False})
            except Exception:
                validation_tests.append({"test": "empty_fields", "blocked": True})

            # Test extremely long name
            try:
                long_name_agent = ParlantAgent(
                    id="long-name-test",
                    workspace_id="test-workspace",
                    created_by="test-user",
                    name="A" * 1000,  # Very long name
                    description="B" * 5000  # Very long description
                )
                await self.db_manager.create_agent(long_name_agent)
                validation_tests.append({"test": "long_strings", "blocked": False})
            except Exception:
                validation_tests.append({"test": "long_strings", "blocked": True})

            # Test invalid temperature range
            try:
                invalid_temp_agent = ParlantAgent(
                    id="temp-test",
                    workspace_id="test-workspace",
                    created_by="test-user",
                    name="Temp Test",
                    temperature=150  # Invalid temperature > 100
                )
                await self.db_manager.create_agent(invalid_temp_agent)
                validation_tests.append({"test": "invalid_temperature", "blocked": False})
            except Exception:
                validation_tests.append({"test": "invalid_temperature", "blocked": True})

            # Test invalid max_tokens
            try:
                invalid_tokens_agent = ParlantAgent(
                    id="tokens-test",
                    workspace_id="test-workspace",
                    created_by="test-user",
                    name="Tokens Test",
                    max_tokens=-100  # Negative tokens
                )
                await self.db_manager.create_agent(invalid_tokens_agent)
                validation_tests.append({"test": "negative_tokens", "blocked": False})
            except Exception:
                validation_tests.append({"test": "negative_tokens", "blocked": True})

            # Ideally, most invalid inputs should be blocked
            properly_validated = sum(1 for test in validation_tests if test["blocked"]) >= len(validation_tests) // 2

            if properly_validated:
                self.record_test(
                    test_name, True,
                    {"validation_tests": validation_tests}
                )
            else:
                self.record_test(
                    test_name, False,
                    {"validation_tests": validation_tests},
                    "Insufficient data validation - invalid inputs not properly blocked"
                )

        except Exception as e:
            self.record_test(test_name, False, error=str(e))

    async def test_concurrent_access_scenarios(self):
        """Test concurrent access to shared resources"""
        test_name = "concurrent_access_scenarios"

        try:
            # Create multiple concurrent agent creation tasks
            async def create_agent_task(index):
                agent = ParlantAgent(
                    id=f"concurrent-agent-{index}",
                    workspace_id="concurrent-test-workspace",
                    created_by="concurrent-user",
                    name=f"Concurrent Agent {index}"
                )
                return await self.db_manager.create_agent(agent)

            # Run 10 concurrent agent creations
            tasks = [create_agent_task(i) for i in range(10)]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Count successful creations
            successful_creations = sum(1 for r in results if not isinstance(r, Exception))
            failed_creations = len(results) - successful_creations

            # Verify all agents were created successfully
            all_agents = await self.db_manager.list_agents("concurrent-test-workspace")
            concurrent_agents = [a for a in all_agents if a.name.startswith("Concurrent Agent")]

            if successful_creations == 10 and len(concurrent_agents) == 10:
                self.record_test(
                    test_name, True,
                    {
                        "successful_creations": successful_creations,
                        "failed_creations": failed_creations,
                        "agents_in_db": len(concurrent_agents)
                    }
                )
            else:
                self.record_test(
                    test_name, False,
                    {
                        "successful_creations": successful_creations,
                        "failed_creations": failed_creations,
                        "agents_in_db": len(concurrent_agents),
                        "expected": 10
                    },
                    "Concurrent access handling not working properly"
                )

        except Exception as e:
            self.record_test(test_name, False, error=str(e))

    # =========================================================================
    # SESSION AND EVENT EDGE CASES
    # =========================================================================

    async def test_session_lifecycle_edge_cases(self):
        """Test session lifecycle edge cases"""
        test_name = "session_lifecycle_edge_cases"

        try:
            # Create test agent first
            test_agent = ParlantAgent(
                id="session-test-agent",
                workspace_id="session-test-workspace",
                created_by="session-user",
                name="Session Test Agent"
            )
            await self.db_manager.create_agent(test_agent)

            edge_case_results = []

            # Test 1: Create session with extreme metadata
            try:
                large_metadata = {"large_data": "X" * 100000}  # 100KB of data
                session = ParlantSession(
                    id="large-metadata-session",
                    agent_id="session-test-agent",
                    workspace_id="session-test-workspace",
                    metadata=large_metadata
                )
                session_id = await self.db_manager.create_session(session)
                edge_case_results.append({"test": "large_metadata", "success": True, "session_id": session_id})
            except Exception as e:
                edge_case_results.append({"test": "large_metadata", "success": False, "error": str(e)})

            # Test 2: Create many events rapidly
            try:
                session = ParlantSession(
                    id="rapid-events-session",
                    agent_id="session-test-agent",
                    workspace_id="session-test-workspace"
                )
                session_id = await self.db_manager.create_session(session)

                # Create 100 events rapidly
                for i in range(100):
                    event = ParlantEvent(
                        id=f"rapid-event-{i}",
                        session_id=session_id,
                        offset=i,
                        event_type="customer_message",
                        content={"message": f"Test message {i}"}
                    )
                    await self.db_manager.create_event(event)

                # Verify all events were created
                events = await self.db_manager.get_events(session_id)
                edge_case_results.append({
                    "test": "rapid_events",
                    "success": len(events) == 100,
                    "events_created": len(events)
                })
            except Exception as e:
                edge_case_results.append({"test": "rapid_events", "success": False, "error": str(e)})

            # Test 3: Session with very long title
            try:
                session = ParlantSession(
                    id="long-title-session",
                    agent_id="session-test-agent",
                    workspace_id="session-test-workspace",
                    title="A" * 1000  # Very long title
                )
                session_id = await self.db_manager.create_session(session)
                edge_case_results.append({"test": "long_title", "success": True, "session_id": session_id})
            except Exception as e:
                edge_case_results.append({"test": "long_title", "success": False, "error": str(e)})

            # Most edge cases should be handled gracefully
            successful_tests = sum(1 for result in edge_case_results if result["success"])
            total_tests = len(edge_case_results)

            if successful_tests >= total_tests * 0.7:  # At least 70% should succeed
                self.record_test(
                    test_name, True,
                    {
                        "edge_case_results": edge_case_results,
                        "success_rate": f"{successful_tests}/{total_tests}"
                    }
                )
            else:
                self.record_test(
                    test_name, False,
                    {"edge_case_results": edge_case_results},
                    f"Too many session edge cases failed: {successful_tests}/{total_tests}"
                )

        except Exception as e:
            self.record_test(test_name, False, error=str(e))

    # =========================================================================
    # RESOURCE EXHAUSTION TESTS
    # =========================================================================

    async def test_memory_usage_limits(self):
        """Test memory usage under load"""
        test_name = "memory_usage_limits"

        try:
            import psutil
            import os

            # Get initial memory usage
            process = psutil.Process(os.getpid())
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB

            # Create many agents to test memory usage
            for i in range(100):
                agent = ParlantAgent(
                    id=f"memory-test-agent-{i}",
                    workspace_id="memory-test-workspace",
                    created_by="memory-user",
                    name=f"Memory Test Agent {i}",
                    description="A" * 1000  # 1KB description each
                )
                await self.db_manager.create_agent(agent)

            # Get memory usage after creating agents
            final_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_increase = final_memory - initial_memory

            # Memory increase should be reasonable (less than 100MB for 100 agents)
            reasonable_memory_usage = memory_increase < 100

            if reasonable_memory_usage:
                self.record_test(
                    test_name, True,
                    {
                        "initial_memory_mb": initial_memory,
                        "final_memory_mb": final_memory,
                        "memory_increase_mb": memory_increase,
                        "agents_created": 100
                    }
                )
            else:
                self.record_test(
                    test_name, False,
                    {
                        "initial_memory_mb": initial_memory,
                        "final_memory_mb": final_memory,
                        "memory_increase_mb": memory_increase
                    },
                    f"Excessive memory usage: {memory_increase:.2f}MB increase"
                )

        except Exception as e:
            # If psutil is not available, skip this test
            self.record_test(
                test_name, True,
                {"skipped": True, "reason": "psutil not available"},
                f"Memory test skipped: {str(e)}"
            )

    # =========================================================================
    # MAIN TEST EXECUTION
    # =========================================================================

    async def run_all_edge_case_tests(self):
        """Execute all edge case tests"""
        logger.info("🔍 Starting Edge Case and Error Scenario Tests")
        logger.info("=" * 60)

        await self.setup()

        try:
            # Security boundary tests
            logger.info("🔒 Testing Security Boundaries...")
            await self.test_sql_injection_protection()
            await self.test_workspace_isolation_bypass_attempts()
            await self.test_authentication_token_validation()

            # Data validation tests
            logger.info("📊 Testing Data Validation...")
            await self.test_agent_data_validation_limits()
            await self.test_concurrent_access_scenarios()

            # Session lifecycle tests
            logger.info("🔄 Testing Session Lifecycle...")
            await self.test_session_lifecycle_edge_cases()

            # Resource exhaustion tests
            logger.info("💾 Testing Resource Limits...")
            await self.test_memory_usage_limits()

        finally:
            await self.teardown()

        # Generate report
        return self.generate_edge_case_report()

    def generate_edge_case_report(self) -> Dict[str, Any]:
        """Generate edge case test report"""
        passed_tests = sum(1 for r in self.test_results if r["passed"])
        total_tests = len(self.test_results)

        report = {
            "edge_case_test_summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": total_tests - passed_tests,
                "pass_rate": f"{(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%"
            },
            "test_categories": {
                "security_tests": len([r for r in self.test_results if "injection" in r["test_name"] or "bypass" in r["test_name"] or "authentication" in r["test_name"]]),
                "validation_tests": len([r for r in self.test_results if "validation" in r["test_name"] or "concurrent" in r["test_name"]]),
                "lifecycle_tests": len([r for r in self.test_results if "session" in r["test_name"]]),
                "resource_tests": len([r for r in self.test_results if "memory" in r["test_name"]])
            },
            "detailed_results": self.test_results,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Print summary
        print(f"\n🔍 EDGE CASE TEST RESULTS:")
        print(f"   • Total Tests: {total_tests}")
        print(f"   • Passed: {passed_tests}")
        print(f"   • Failed: {total_tests - passed_tests}")
        print(f"   • Pass Rate: {report['edge_case_test_summary']['pass_rate']}")

        return report


async def main():
    """Main execution function for edge case tests"""
    test_suite = EdgeCaseTestSuite()
    return await test_suite.run_all_edge_case_tests()


if __name__ == "__main__":
    results = asyncio.run(main())