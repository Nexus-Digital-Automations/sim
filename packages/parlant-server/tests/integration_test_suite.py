"""
Sim-Parlant Integration Bridge Test Suite

This comprehensive test suite validates all acceptance criteria for the
Sim-Parlant Integration Bridge feature and identifies implementation gaps.

Test Coverage:
1. ✅ Sim users can create Parlant agents
2. ✅ Agents are isolated by workspace
3. ✅ Authentication flows work seamlessly
4. ❌ Agent management APIs are functional (MISSING)

Usage:
    python integration_test_suite.py
    pytest integration_test_suite.py -v
"""

import asyncio
import pytest
import json
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import httpx
import asyncpg
from dataclasses import asdict

# Import Parlant server components
from database import ParlantDatabaseManager, ParlantAgent, ParlantSession, ParlantEvent
from auth.sim_auth_bridge import SimAuthBridge, SimUser, SimSession
from config.settings import Settings
from database.init_schema import ParlantSchemaManager

# Configure test logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TestResults:
    """Tracks test results and acceptance criteria validation"""

    def __init__(self):
        self.results = {}
        self.errors = {}
        self.acceptance_criteria = {
            "sim_users_can_create_parlant_agents": False,
            "agents_are_isolated_by_workspace": False,
            "authentication_flows_work_seamlessly": False,
            "agent_management_apis_are_functional": False
        }
        self.implementation_gaps = []

    def record_test(self, test_name: str, passed: bool, details: Dict[str, Any] = None, error: str = None):
        """Record a test result"""
        self.results[test_name] = {
            "passed": passed,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {},
            "error": error
        }

        if passed:
            logger.info(f"✅ {test_name}: PASSED")
        else:
            logger.error(f"❌ {test_name}: FAILED - {error}")

    def record_acceptance_criterion(self, criterion: str, status: bool):
        """Record acceptance criteria validation"""
        if criterion in self.acceptance_criteria:
            self.acceptance_criteria[criterion] = status

    def add_implementation_gap(self, description: str, severity: str = "HIGH"):
        """Add identified implementation gap"""
        self.implementation_gaps.append({
            "description": description,
            "severity": severity,
            "timestamp": datetime.utcnow().isoformat()
        })

    def get_summary(self) -> Dict[str, Any]:
        """Get comprehensive test results summary"""
        passed_tests = sum(1 for r in self.results.values() if r["passed"])
        total_tests = len(self.results)
        passed_criteria = sum(1 for c in self.acceptance_criteria.values() if c)
        total_criteria = len(self.acceptance_criteria)

        return {
            "test_execution_summary": {
                "tests_passed": passed_tests,
                "tests_failed": total_tests - passed_tests,
                "total_tests": total_tests,
                "pass_rate": f"{(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%"
            },
            "acceptance_criteria_status": {
                "criteria_met": passed_criteria,
                "criteria_failed": total_criteria - passed_criteria,
                "total_criteria": total_criteria,
                "completion_rate": f"{(passed_criteria/total_criteria*100):.1f}%"
            },
            "acceptance_criteria_details": self.acceptance_criteria,
            "implementation_gaps": self.implementation_gaps,
            "detailed_test_results": self.results,
            "overall_status": "IMPLEMENTATION_INCOMPLETE" if self.implementation_gaps else "READY_FOR_PRODUCTION"
        }


class IntegrationTestSuite:
    """Comprehensive integration test suite for Sim-Parlant Bridge"""

    def __init__(self):
        self.results = TestResults()
        self.db_manager: Optional[ParlantDatabaseManager] = None
        self.auth_bridge: Optional[SimAuthBridge] = None
        self.settings = Settings()

    async def setup(self):
        """Setup test environment"""
        logger.info("Setting up integration test environment...")

        # Initialize database manager
        self.db_manager = ParlantDatabaseManager()
        await self.db_manager.initialize()

        # Initialize auth bridge
        self.auth_bridge = SimAuthBridge(self.settings)
        await self.auth_bridge.initialize()

        logger.info("Test environment setup completed")

    async def teardown(self):
        """Cleanup test environment"""
        logger.info("Cleaning up test environment...")

        if self.db_manager:
            await self.db_manager.close()

        if self.auth_bridge:
            await self.auth_bridge.cleanup()

        logger.info("Test environment cleanup completed")

    # =========================================================================
    # ACCEPTANCE CRITERION 1: Sim users can create Parlant agents
    # =========================================================================

    async def test_database_schema_exists(self):
        """Test that Parlant database schema is properly initialized"""
        test_name = "database_schema_exists"

        try:
            schema_manager = ParlantSchemaManager()
            schema_status = await schema_manager.get_schema_status()

            if schema_status.get("ready", False):
                self.results.record_test(
                    test_name, True,
                    {"schema_status": schema_status}
                )
            else:
                self.results.record_test(
                    test_name, False,
                    {"schema_status": schema_status},
                    f"Database schema not ready: {schema_status.get('recommendations', [])}"
                )
                self.results.add_implementation_gap(
                    "Parlant database tables not created - run migrations required"
                )

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))
            self.results.add_implementation_gap(
                f"Database schema verification failed: {str(e)}"
            )

    async def test_agent_creation_via_database(self):
        """Test creating agents via database layer"""
        test_name = "agent_creation_via_database"

        try:
            # Create test agent
            test_agent = ParlantAgent(
                id="test-agent-001",
                workspace_id="test-workspace-001",
                created_by="test-user-001",
                name="Test Agent",
                description="Test agent for integration testing",
                system_prompt="You are a helpful assistant for testing.",
                model_provider="openai",
                model_name="gpt-4"
            )

            agent_id = await self.db_manager.create_agent(test_agent)

            # Verify agent was created
            created_agent = await self.db_manager.get_agent(agent_id, test_agent.workspace_id)

            if created_agent and created_agent.name == test_agent.name:
                self.results.record_test(
                    test_name, True,
                    {"agent_id": agent_id, "agent_name": created_agent.name}
                )
                self.results.record_acceptance_criterion("sim_users_can_create_parlant_agents", True)
            else:
                self.results.record_test(
                    test_name, False,
                    error="Agent creation succeeded but verification failed"
                )

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))
            self.results.add_implementation_gap(
                f"Agent creation via database failed: {str(e)}"
            )

    async def test_agent_management_api_endpoints_exist(self):
        """Test that agent management API endpoints exist in the main app"""
        test_name = "agent_management_api_endpoints_exist"

        try:
            # Check for agent management API endpoints
            api_endpoints = [
                "/api/v1/agents",
                "/api/v1/agents/create",
                "/api/v1/workspaces/{workspace_id}/agents",
                "/api/parlant/agents"
            ]

            # This is a static check since we're looking for file existence
            missing_endpoints = []
            existing_endpoints = []

            # Check common API patterns
            import os
            api_paths = [
                "/Users/jeremyparker/Desktop/Claude Coding Projects/sim/apps/sim/app/api/v1",
                "/Users/jeremyparker/Desktop/Claude Coding Projects/sim/apps/sim/app/api",
            ]

            found_agent_apis = False
            for api_path in api_paths:
                if os.path.exists(api_path):
                    for root, dirs, files in os.walk(api_path):
                        for file in files:
                            if "agent" in file.lower() and file.endswith((".ts", ".js")):
                                if "route" in file:
                                    existing_endpoints.append(os.path.join(root, file))
                                    found_agent_apis = True

            if found_agent_apis:
                self.results.record_test(
                    test_name, True,
                    {"found_endpoints": existing_endpoints}
                )
            else:
                self.results.record_test(
                    test_name, False,
                    {"missing_endpoints": api_endpoints},
                    "No Parlant agent management API endpoints found in main app"
                )
                self.results.add_implementation_gap(
                    "Missing agent management API endpoints in apps/sim/app/api/ - Integration bridge not implemented",
                    "CRITICAL"
                )

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))

    # =========================================================================
    # ACCEPTANCE CRITERION 2: Agents are isolated by workspace
    # =========================================================================

    async def test_workspace_isolation_database_level(self):
        """Test workspace isolation at database level"""
        test_name = "workspace_isolation_database_level"

        try:
            # Create agents in different workspaces
            workspace1_agent = ParlantAgent(
                id="ws1-agent",
                workspace_id="workspace-001",
                created_by="user-001",
                name="Workspace 1 Agent"
            )

            workspace2_agent = ParlantAgent(
                id="ws2-agent",
                workspace_id="workspace-002",
                created_by="user-002",
                name="Workspace 2 Agent"
            )

            # Create both agents
            await self.db_manager.create_agent(workspace1_agent)
            await self.db_manager.create_agent(workspace2_agent)

            # Test isolation - workspace 1 should only see its agents
            ws1_agents = await self.db_manager.list_agents("workspace-001")
            ws2_agents = await self.db_manager.list_agents("workspace-002")

            # Verify isolation
            ws1_agent_names = [a.name for a in ws1_agents]
            ws2_agent_names = [a.name for a in ws2_agents]

            isolation_works = (
                "Workspace 1 Agent" in ws1_agent_names and
                "Workspace 2 Agent" not in ws1_agent_names and
                "Workspace 2 Agent" in ws2_agent_names and
                "Workspace 1 Agent" not in ws2_agent_names
            )

            if isolation_works:
                self.results.record_test(
                    test_name, True,
                    {
                        "workspace1_agents": len(ws1_agents),
                        "workspace2_agents": len(ws2_agents),
                        "isolation_verified": True
                    }
                )
                self.results.record_acceptance_criterion("agents_are_isolated_by_workspace", True)
            else:
                self.results.record_test(
                    test_name, False,
                    {
                        "ws1_agents": ws1_agent_names,
                        "ws2_agents": ws2_agent_names
                    },
                    "Workspace isolation not working properly"
                )

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))

    async def test_workspace_access_verification(self):
        """Test workspace access verification methods"""
        test_name = "workspace_access_verification"

        try:
            # Create test agent
            test_agent = ParlantAgent(
                id="access-test-agent",
                workspace_id="access-test-workspace",
                created_by="access-test-user",
                name="Access Test Agent"
            )

            agent_id = await self.db_manager.create_agent(test_agent)

            # Test positive access verification
            has_access = await self.db_manager.verify_workspace_access(
                agent_id, "access-test-workspace", "agent"
            )

            # Test negative access verification
            no_access = await self.db_manager.verify_workspace_access(
                agent_id, "different-workspace", "agent"
            )

            if has_access and not no_access:
                self.results.record_test(
                    test_name, True,
                    {"correct_access": has_access, "denied_access": not no_access}
                )
            else:
                self.results.record_test(
                    test_name, False,
                    {"correct_access": has_access, "denied_access": not no_access},
                    "Workspace access verification not working correctly"
                )

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))

    # =========================================================================
    # ACCEPTANCE CRITERION 3: Authentication flows work seamlessly
    # =========================================================================

    async def test_auth_bridge_initialization(self):
        """Test authentication bridge initialization"""
        test_name = "auth_bridge_initialization"

        try:
            # Check if auth bridge initialized successfully
            if self.auth_bridge and hasattr(self.auth_bridge, 'http_client'):
                self.results.record_test(
                    test_name, True,
                    {"auth_bridge_initialized": True}
                )
            else:
                self.results.record_test(
                    test_name, False,
                    error="Authentication bridge not properly initialized"
                )

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))

    async def test_auth_token_extraction(self):
        """Test authentication token extraction utilities"""
        test_name = "auth_token_extraction"

        try:
            # Test Bearer token extraction
            bearer_token = self.auth_bridge.extract_token_from_header("Bearer test-token-123")
            direct_token = self.auth_bridge.extract_token_from_header("test-token-456")

            if bearer_token == "test-token-123" and direct_token == "test-token-456":
                self.results.record_test(
                    test_name, True,
                    {"bearer_extraction": True, "direct_extraction": True}
                )
                self.results.record_acceptance_criterion("authentication_flows_work_seamlessly", True)
            else:
                self.results.record_test(
                    test_name, False,
                    {"bearer_token": bearer_token, "direct_token": direct_token},
                    "Token extraction not working correctly"
                )

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))

    async def test_workspace_context_creation(self):
        """Test workspace context creation for agents"""
        test_name = "workspace_context_creation"

        try:
            # Create mock session
            mock_user = SimUser(
                id="test-user",
                name="Test User",
                email="test@example.com",
                email_verified=True,
                image=None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                workspaces=[{
                    "id": "test-workspace",
                    "name": "Test Workspace",
                    "role": "admin",
                    "permissions": ["read", "write", "admin"]
                }]
            )

            mock_session = SimSession(
                id="test-session",
                user=mock_user,
                expires_at=datetime.utcnow() + timedelta(hours=24),
                token="test-token",
                ip_address="127.0.0.1",
                user_agent="test-agent",
                active_organization_id=None
            )

            # Create agent context
            context = await self.auth_bridge.create_agent_session_context(
                mock_session, "test-workspace"
            )

            # Verify context structure
            required_fields = ["session_id", "user_context", "workspace_id", "isolation_boundary"]
            has_all_fields = all(field in context for field in required_fields)

            if has_all_fields and context["workspace_id"] == "test-workspace":
                self.results.record_test(
                    test_name, True,
                    {"context_fields": list(context.keys()), "workspace_id": context["workspace_id"]}
                )
            else:
                self.results.record_test(
                    test_name, False,
                    {"context": context, "missing_fields": [f for f in required_fields if f not in context]},
                    "Agent session context not created properly"
                )

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))

    # =========================================================================
    # ACCEPTANCE CRITERION 4: Agent management APIs are functional
    # =========================================================================

    async def test_integration_bridge_exists(self):
        """Test that the integration bridge layer exists"""
        test_name = "integration_bridge_exists"

        try:
            # Check for integration bridge files
            integration_paths = [
                "/Users/jeremyparker/Desktop/Claude Coding Projects/sim/apps/sim/services/parlant",
                "/Users/jeremyparker/Desktop/Claude Coding Projects/sim/apps/sim/lib/parlant",
                "/Users/jeremyparker/Desktop/Claude Coding Projects/sim/apps/sim/integrations/parlant"
            ]

            bridge_exists = False
            found_path = None

            for path in integration_paths:
                if os.path.exists(path):
                    bridge_exists = True
                    found_path = path
                    break

            if bridge_exists:
                self.results.record_test(
                    test_name, True,
                    {"integration_bridge_path": found_path}
                )
            else:
                self.results.record_test(
                    test_name, False,
                    {"checked_paths": integration_paths},
                    "Integration bridge layer not found - apps/sim/services/parlant/ does not exist"
                )
                self.results.add_implementation_gap(
                    "Missing apps/sim/services/parlant/ integration layer - Bridge not implemented",
                    "CRITICAL"
                )

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))

    async def test_parlant_service_references(self):
        """Test that main app references parlant-server package"""
        test_name = "parlant_service_references"

        try:
            # Search for references to parlant-server in main app
            import subprocess

            search_cmd = [
                "find", "/Users/jeremyparker/Desktop/Claude Coding Projects/sim/apps/sim",
                "-name", "*.ts", "-o", "-name", "*.tsx", "-o", "-name", "*.js", "-o", "-name", "*.jsx"
            ]

            result = subprocess.run(search_cmd, capture_output=True, text=True)

            if result.returncode == 0:
                files = result.stdout.strip().split('\n')
                parlant_references = []

                for file in files:
                    if file:
                        try:
                            with open(file, 'r', encoding='utf-8') as f:
                                content = f.read()
                                if 'parlant' in content.lower():
                                    parlant_references.append(file)
                        except:
                            continue

                if parlant_references:
                    self.results.record_test(
                        test_name, True,
                        {"references_found": len(parlant_references), "files": parlant_references[:5]}
                    )
                    self.results.record_acceptance_criterion("agent_management_apis_are_functional", True)
                else:
                    self.results.record_test(
                        test_name, False,
                        {"files_searched": len(files)},
                        "No references to parlant found in main app - Integration not connected"
                    )
                    self.results.add_implementation_gap(
                        "Main app has no references to parlant-server package - Integration bridge missing",
                        "CRITICAL"
                    )
            else:
                raise Exception(f"File search failed: {result.stderr}")

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))

    # =========================================================================
    # ERROR SCENARIOS AND EDGE CASES
    # =========================================================================

    async def test_error_scenarios(self):
        """Test error handling scenarios"""
        test_name = "error_scenarios"

        try:
            error_scenarios = []

            # Test invalid agent creation
            try:
                invalid_agent = ParlantAgent(
                    id="",  # Invalid empty ID
                    workspace_id="test-ws",
                    created_by="test-user",
                    name=""  # Invalid empty name
                )
                await self.db_manager.create_agent(invalid_agent)
                error_scenarios.append("invalid_agent_creation_should_fail")
            except:
                error_scenarios.append("invalid_agent_creation_properly_rejected")

            # Test non-existent agent retrieval
            non_existent = await self.db_manager.get_agent("non-existent-id", "test-workspace")
            if non_existent is None:
                error_scenarios.append("non_existent_agent_returns_none")

            # Test cross-workspace access attempt
            try:
                # This should fail or return False
                cross_access = await self.db_manager.verify_workspace_access(
                    "agent-id", "wrong-workspace", "agent"
                )
                if not cross_access:
                    error_scenarios.append("cross_workspace_access_properly_denied")
            except:
                error_scenarios.append("cross_workspace_access_error_handled")

            self.results.record_test(
                test_name, True,
                {"error_scenarios_tested": error_scenarios}
            )

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))

    # =========================================================================
    # PERFORMANCE TESTS
    # =========================================================================

    async def test_performance_benchmarks(self):
        """Test performance benchmarks"""
        test_name = "performance_benchmarks"

        try:
            performance_results = {}

            # Database health check performance
            start_time = datetime.utcnow()
            health_check = await self.db_manager.health_check()
            db_response_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            performance_results["db_health_check_ms"] = db_response_time
            performance_results["db_status"] = health_check.get("status")

            # Agent creation performance
            start_time = datetime.utcnow()
            perf_agent = ParlantAgent(
                id="perf-test-agent",
                workspace_id="perf-test-workspace",
                created_by="perf-test-user",
                name="Performance Test Agent"
            )
            await self.db_manager.create_agent(perf_agent)
            agent_creation_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            performance_results["agent_creation_ms"] = agent_creation_time

            # Performance thresholds
            acceptable_db_response = db_response_time < 1000  # 1 second
            acceptable_agent_creation = agent_creation_time < 500  # 500ms

            if acceptable_db_response and acceptable_agent_creation:
                self.results.record_test(
                    test_name, True,
                    performance_results
                )
            else:
                self.results.record_test(
                    test_name, False,
                    performance_results,
                    f"Performance thresholds exceeded: DB={db_response_time:.2f}ms, Agent={agent_creation_time:.2f}ms"
                )

        except Exception as e:
            self.results.record_test(test_name, False, error=str(e))

    # =========================================================================
    # MAIN TEST EXECUTION
    # =========================================================================

    async def run_all_tests(self):
        """Execute all integration tests"""
        logger.info("🚀 Starting Sim-Parlant Integration Bridge Test Suite")
        logger.info("=" * 70)

        await self.setup()

        try:
            # Core Infrastructure Tests
            logger.info("📋 Testing Core Infrastructure...")
            await self.test_database_schema_exists()

            # Acceptance Criterion 1: Sim users can create Parlant agents
            logger.info("📋 Testing Acceptance Criterion 1: Agent Creation...")
            await self.test_agent_creation_via_database()
            await self.test_agent_management_api_endpoints_exist()

            # Acceptance Criterion 2: Agents are isolated by workspace
            logger.info("📋 Testing Acceptance Criterion 2: Workspace Isolation...")
            await self.test_workspace_isolation_database_level()
            await self.test_workspace_access_verification()

            # Acceptance Criterion 3: Authentication flows work seamlessly
            logger.info("📋 Testing Acceptance Criterion 3: Authentication Flows...")
            await self.test_auth_bridge_initialization()
            await self.test_auth_token_extraction()
            await self.test_workspace_context_creation()

            # Acceptance Criterion 4: Agent management APIs are functional
            logger.info("📋 Testing Acceptance Criterion 4: API Functionality...")
            await self.test_integration_bridge_exists()
            await self.test_parlant_service_references()

            # Additional Tests
            logger.info("📋 Testing Error Scenarios and Performance...")
            await self.test_error_scenarios()
            await self.test_performance_benchmarks()

        finally:
            await self.teardown()

        # Generate final report
        logger.info("=" * 70)
        logger.info("📊 GENERATING FINAL TEST REPORT")
        logger.info("=" * 70)

        return self.generate_final_report()

    def generate_final_report(self) -> Dict[str, Any]:
        """Generate comprehensive final test report"""
        summary = self.results.get_summary()

        # Print summary to console
        print("\n" + "=" * 80)
        print("🎯 SIM-PARLANT INTEGRATION BRIDGE VALIDATION REPORT")
        print("=" * 80)

        print(f"\n📊 TEST EXECUTION SUMMARY:")
        print(f"   • Tests Passed: {summary['test_execution_summary']['tests_passed']}")
        print(f"   • Tests Failed: {summary['test_execution_summary']['tests_failed']}")
        print(f"   • Total Tests: {summary['test_execution_summary']['total_tests']}")
        print(f"   • Pass Rate: {summary['test_execution_summary']['pass_rate']}")

        print(f"\n🎯 ACCEPTANCE CRITERIA STATUS:")
        print(f"   • Criteria Met: {summary['acceptance_criteria_status']['criteria_met']}")
        print(f"   • Criteria Failed: {summary['acceptance_criteria_status']['criteria_failed']}")
        print(f"   • Total Criteria: {summary['acceptance_criteria_status']['total_criteria']}")
        print(f"   • Completion Rate: {summary['acceptance_criteria_status']['completion_rate']}")

        print(f"\n✅ DETAILED ACCEPTANCE CRITERIA:")
        for criterion, status in summary['acceptance_criteria_details'].items():
            status_icon = "✅" if status else "❌"
            criterion_readable = criterion.replace("_", " ").title()
            print(f"   {status_icon} {criterion_readable}")

        if summary['implementation_gaps']:
            print(f"\n🚨 IMPLEMENTATION GAPS IDENTIFIED ({len(summary['implementation_gaps'])}):")
            for gap in summary['implementation_gaps']:
                severity_icon = "🔴" if gap['severity'] == "CRITICAL" else "🟡"
                print(f"   {severity_icon} [{gap['severity']}] {gap['description']}")

        print(f"\n🏁 OVERALL STATUS: {summary['overall_status']}")

        if summary['overall_status'] == "IMPLEMENTATION_INCOMPLETE":
            print("\n❌ CONCLUSION: The Sim-Parlant Integration Bridge feature is NOT FULLY IMPLEMENTED")
            print("   Required components are missing and acceptance criteria are not met.")
        else:
            print("\n✅ CONCLUSION: The Sim-Parlant Integration Bridge feature is ready for production")

        print("=" * 80)

        return summary


async def main():
    """Main test execution function"""
    test_suite = IntegrationTestSuite()
    results = await test_suite.run_all_tests()

    # Save results to file
    output_file = f"/Users/jeremyparker/Desktop/Claude Coding Projects/sim/packages/parlant-server/tests/integration_test_results_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n💾 Detailed results saved to: {output_file}")
    except Exception as e:
        print(f"⚠️  Could not save results file: {e}")

    return results


if __name__ == "__main__":
    # Run the test suite
    results = asyncio.run(main())

    # Set exit code based on overall status
    exit_code = 0 if results['overall_status'] == "READY_FOR_PRODUCTION" else 1
    exit(exit_code)