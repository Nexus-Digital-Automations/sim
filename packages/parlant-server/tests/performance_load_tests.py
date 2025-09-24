"""
Performance and Load Testing for Sim-Parlant Integration

This module contains performance benchmarks and load testing scenarios
to validate the integration can handle production workloads.
"""

import asyncio
import time
import statistics
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import json
import concurrent.futures
from dataclasses import dataclass

from database import ParlantDatabaseManager, ParlantAgent, ParlantSession, ParlantEvent
from auth.sim_auth_bridge import SimAuthBridge, SimUser, SimSession
from config.settings import Settings

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Performance metric data structure"""
    operation: str
    duration_ms: float
    timestamp: datetime
    success: bool
    details: Dict[str, Any] = None


class PerformanceTestSuite:
    """Comprehensive performance and load testing suite"""

    def __init__(self):
        self.metrics: List[PerformanceMetric] = []
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

    def record_metric(self, operation: str, duration_ms: float, success: bool, details: Dict[str, Any] = None):
        """Record a performance metric"""
        metric = PerformanceMetric(
            operation=operation,
            duration_ms=duration_ms,
            timestamp=datetime.utcnow(),
            success=success,
            details=details or {}
        )
        self.metrics.append(metric)

        status = "✅" if success else "❌"
        logger.info(f"{status} {operation}: {duration_ms:.2f}ms")

    async def time_operation(self, operation_name: str, operation_func, *args, **kwargs):
        """Time an async operation and record metrics"""
        start_time = time.time()
        success = True
        error = None

        try:
            result = await operation_func(*args, **kwargs)
        except Exception as e:
            success = False
            error = str(e)
            result = None

        end_time = time.time()
        duration_ms = (end_time - start_time) * 1000

        self.record_metric(
            operation_name,
            duration_ms,
            success,
            {"error": error} if error else {}
        )

        return result, duration_ms, success

    # =========================================================================
    # DATABASE PERFORMANCE TESTS
    # =========================================================================

    async def test_database_connection_performance(self):
        """Test database connection establishment performance"""
        logger.info("🔗 Testing Database Connection Performance...")

        connection_times = []

        for i in range(10):
            start_time = time.time()
            health_check = await self.db_manager.health_check()
            end_time = time.time()

            duration_ms = (end_time - start_time) * 1000
            success = health_check.get("status") == "healthy"

            self.record_metric(f"db_connection_{i}", duration_ms, success, health_check)
            connection_times.append(duration_ms)

            await asyncio.sleep(0.1)  # Brief pause between connections

        # Calculate statistics
        avg_connection_time = statistics.mean(connection_times)
        max_connection_time = max(connection_times)
        min_connection_time = min(connection_times)

        logger.info(f"   • Average connection time: {avg_connection_time:.2f}ms")
        logger.info(f"   • Max connection time: {max_connection_time:.2f}ms")
        logger.info(f"   • Min connection time: {min_connection_time:.2f}ms")

        return {
            "average_ms": avg_connection_time,
            "max_ms": max_connection_time,
            "min_ms": min_connection_time,
            "connection_times": connection_times
        }

    async def test_agent_crud_performance(self):
        """Test agent CRUD operation performance"""
        logger.info("⚡ Testing Agent CRUD Performance...")

        # Test CREATE performance
        create_times = []
        agent_ids = []

        for i in range(50):  # Create 50 agents
            agent = ParlantAgent(
                id=f"perf-test-agent-{i}",
                workspace_id="perf-test-workspace",
                created_by="perf-test-user",
                name=f"Performance Test Agent {i}",
                description=f"Agent created for performance testing - iteration {i}"
            )

            result, duration_ms, success = await self.time_operation(
                f"create_agent_{i}",
                self.db_manager.create_agent,
                agent
            )

            create_times.append(duration_ms)
            if success:
                agent_ids.append(result)

        # Test READ performance
        read_times = []
        for i, agent_id in enumerate(agent_ids[:20]):  # Read first 20 agents
            result, duration_ms, success = await self.time_operation(
                f"read_agent_{i}",
                self.db_manager.get_agent,
                agent_id,
                "perf-test-workspace"
            )
            read_times.append(duration_ms)

        # Test LIST performance
        list_result, list_duration_ms, list_success = await self.time_operation(
            "list_agents",
            self.db_manager.list_agents,
            "perf-test-workspace"
        )

        # Test UPDATE performance
        update_times = []
        for i, agent_id in enumerate(agent_ids[:10]):  # Update first 10 agents
            # First get the agent
            agent = await self.db_manager.get_agent(agent_id, "perf-test-workspace")
            if agent:
                agent.description = f"Updated description for performance test {i}"

                result, duration_ms, success = await self.time_operation(
                    f"update_agent_{i}",
                    self.db_manager.update_agent,
                    agent
                )
                update_times.append(duration_ms)

        # Test DELETE performance
        delete_times = []
        for i, agent_id in enumerate(agent_ids[:5]):  # Delete first 5 agents
            result, duration_ms, success = await self.time_operation(
                f"delete_agent_{i}",
                self.db_manager.delete_agent,
                agent_id,
                "perf-test-workspace"
            )
            delete_times.append(duration_ms)

        crud_stats = {
            "create": {
                "count": len(create_times),
                "average_ms": statistics.mean(create_times) if create_times else 0,
                "max_ms": max(create_times) if create_times else 0,
                "min_ms": min(create_times) if create_times else 0
            },
            "read": {
                "count": len(read_times),
                "average_ms": statistics.mean(read_times) if read_times else 0,
                "max_ms": max(read_times) if read_times else 0,
                "min_ms": min(read_times) if read_times else 0
            },
            "list": {
                "duration_ms": list_duration_ms,
                "success": list_success,
                "agents_returned": len(list_result) if list_result else 0
            },
            "update": {
                "count": len(update_times),
                "average_ms": statistics.mean(update_times) if update_times else 0,
                "max_ms": max(update_times) if update_times else 0,
                "min_ms": min(update_times) if update_times else 0
            },
            "delete": {
                "count": len(delete_times),
                "average_ms": statistics.mean(delete_times) if delete_times else 0,
                "max_ms": max(delete_times) if delete_times else 0,
                "min_ms": min(delete_times) if delete_times else 0
            }
        }

        logger.info(f"   • Create operations: {crud_stats['create']['average_ms']:.2f}ms avg")
        logger.info(f"   • Read operations: {crud_stats['read']['average_ms']:.2f}ms avg")
        logger.info(f"   • List operation: {crud_stats['list']['duration_ms']:.2f}ms")
        logger.info(f"   • Update operations: {crud_stats['update']['average_ms']:.2f}ms avg")
        logger.info(f"   • Delete operations: {crud_stats['delete']['average_ms']:.2f}ms avg")

        return crud_stats

    # =========================================================================
    # CONCURRENT LOAD TESTS
    # =========================================================================

    async def test_concurrent_agent_operations(self):
        """Test concurrent agent operations under load"""
        logger.info("🔄 Testing Concurrent Agent Operations...")

        async def create_agent_batch(batch_id: int, batch_size: int):
            """Create a batch of agents concurrently"""
            tasks = []
            for i in range(batch_size):
                agent = ParlantAgent(
                    id=f"concurrent-batch-{batch_id}-agent-{i}",
                    workspace_id=f"concurrent-workspace-{batch_id}",
                    created_by=f"concurrent-user-{batch_id}",
                    name=f"Concurrent Agent {batch_id}-{i}"
                )
                tasks.append(self.db_manager.create_agent(agent))

            start_time = time.time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            end_time = time.time()

            batch_duration = (end_time - start_time) * 1000
            successful_creates = sum(1 for r in results if not isinstance(r, Exception))
            failed_creates = len(results) - successful_creates

            return {
                "batch_id": batch_id,
                "batch_size": batch_size,
                "duration_ms": batch_duration,
                "successful": successful_creates,
                "failed": failed_creates,
                "throughput_ops_per_sec": (successful_creates / (batch_duration / 1000)) if batch_duration > 0 else 0
            }

        # Test different concurrency levels
        concurrency_results = []

        # Test 1: Low concurrency (5 batches of 5 agents each)
        low_concurrency_tasks = [create_agent_batch(i, 5) for i in range(5)]
        low_results = await asyncio.gather(*low_concurrency_tasks)
        concurrency_results.extend(low_results)

        await asyncio.sleep(1)  # Brief pause

        # Test 2: Medium concurrency (10 batches of 10 agents each)
        medium_concurrency_tasks = [create_agent_batch(i + 100, 10) for i in range(10)]
        medium_results = await asyncio.gather(*medium_concurrency_tasks)
        concurrency_results.extend(medium_results)

        await asyncio.sleep(1)  # Brief pause

        # Test 3: High concurrency (20 batches of 5 agents each)
        high_concurrency_tasks = [create_agent_batch(i + 200, 5) for i in range(20)]
        high_results = await asyncio.gather(*high_concurrency_tasks)
        concurrency_results.extend(high_results)

        # Calculate overall statistics
        total_operations = sum(r["successful"] for r in concurrency_results)
        total_duration = sum(r["duration_ms"] for r in concurrency_results)
        avg_throughput = statistics.mean([r["throughput_ops_per_sec"] for r in concurrency_results])
        max_throughput = max([r["throughput_ops_per_sec"] for r in concurrency_results])

        concurrency_stats = {
            "total_operations": total_operations,
            "total_duration_ms": total_duration,
            "average_throughput_ops_per_sec": avg_throughput,
            "max_throughput_ops_per_sec": max_throughput,
            "batch_results": concurrency_results
        }

        logger.info(f"   • Total operations: {total_operations}")
        logger.info(f"   • Average throughput: {avg_throughput:.2f} ops/sec")
        logger.info(f"   • Max throughput: {max_throughput:.2f} ops/sec")

        return concurrency_stats

    async def test_session_event_throughput(self):
        """Test session and event creation throughput"""
        logger.info("📝 Testing Session and Event Throughput...")

        # First create a test agent
        test_agent = ParlantAgent(
            id="throughput-test-agent",
            workspace_id="throughput-test-workspace",
            created_by="throughput-user",
            name="Throughput Test Agent"
        )
        await self.db_manager.create_agent(test_agent)

        # Test session creation throughput
        session_creation_times = []
        session_ids = []

        for i in range(20):
            session = ParlantSession(
                id=f"throughput-session-{i}",
                agent_id="throughput-test-agent",
                workspace_id="throughput-test-workspace",
                user_id=f"user-{i}",
                title=f"Throughput Test Session {i}"
            )

            result, duration_ms, success = await self.time_operation(
                f"create_session_{i}",
                self.db_manager.create_session,
                session
            )

            session_creation_times.append(duration_ms)
            if success:
                session_ids.append(result)

        # Test event creation throughput for first session
        if session_ids:
            event_creation_times = []
            session_id = session_ids[0]

            # Create 100 events rapidly
            for i in range(100):
                event = ParlantEvent(
                    id=f"throughput-event-{i}",
                    session_id=session_id,
                    offset=i,
                    event_type="customer_message" if i % 2 == 0 else "agent_message",
                    content={"message": f"Throughput test message {i}", "timestamp": datetime.utcnow().isoformat()}
                )

                result, duration_ms, success = await self.time_operation(
                    f"create_event_{i}",
                    self.db_manager.create_event,
                    event
                )

                event_creation_times.append(duration_ms)

        throughput_stats = {
            "session_creation": {
                "count": len(session_creation_times),
                "average_ms": statistics.mean(session_creation_times) if session_creation_times else 0,
                "throughput_ops_per_sec": len(session_creation_times) / (sum(session_creation_times) / 1000) if session_creation_times else 0
            },
            "event_creation": {
                "count": len(event_creation_times),
                "average_ms": statistics.mean(event_creation_times) if event_creation_times else 0,
                "throughput_ops_per_sec": len(event_creation_times) / (sum(event_creation_times) / 1000) if event_creation_times else 0
            }
        }

        logger.info(f"   • Session creation throughput: {throughput_stats['session_creation']['throughput_ops_per_sec']:.2f} ops/sec")
        logger.info(f"   • Event creation throughput: {throughput_stats['event_creation']['throughput_ops_per_sec']:.2f} ops/sec")

        return throughput_stats

    # =========================================================================
    # AUTHENTICATION PERFORMANCE TESTS
    # =========================================================================

    async def test_authentication_performance(self):
        """Test authentication operations performance"""
        logger.info("🔐 Testing Authentication Performance...")

        auth_times = []

        # Test token extraction performance
        for i in range(1000):
            start_time = time.time()
            token = self.auth_bridge.extract_token_from_header(f"Bearer test-token-{i}")
            end_time = time.time()

            duration_ms = (end_time - start_time) * 1000
            success = token == f"test-token-{i}"

            self.record_metric(f"token_extraction_{i}", duration_ms, success)
            auth_times.append(duration_ms)

        # Test workspace context creation performance
        context_times = []

        mock_user = SimUser(
            id="perf-test-user",
            name="Performance Test User",
            email="perf@test.com",
            email_verified=True,
            image=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            workspaces=[{
                "id": f"workspace-{i}",
                "name": f"Workspace {i}",
                "role": "admin",
                "permissions": ["read", "write", "admin"]
            } for i in range(10)]
        )

        for i in range(50):
            mock_session = SimSession(
                id=f"perf-session-{i}",
                user=mock_user,
                expires_at=datetime.utcnow() + timedelta(hours=24),
                token=f"perf-token-{i}",
                ip_address="127.0.0.1",
                user_agent="performance-test",
                active_organization_id=None
            )

            result, duration_ms, success = await self.time_operation(
                f"create_context_{i}",
                self.auth_bridge.create_agent_session_context,
                mock_session,
                "workspace-0"
            )

            context_times.append(duration_ms)

        auth_stats = {
            "token_extraction": {
                "count": len(auth_times),
                "average_ms": statistics.mean(auth_times),
                "max_ms": max(auth_times),
                "min_ms": min(auth_times),
                "throughput_ops_per_sec": len(auth_times) / (sum(auth_times) / 1000) if auth_times else 0
            },
            "context_creation": {
                "count": len(context_times),
                "average_ms": statistics.mean(context_times) if context_times else 0,
                "max_ms": max(context_times) if context_times else 0,
                "min_ms": min(context_times) if context_times else 0,
                "throughput_ops_per_sec": len(context_times) / (sum(context_times) / 1000) if context_times else 0
            }
        }

        logger.info(f"   • Token extraction: {auth_stats['token_extraction']['throughput_ops_per_sec']:.2f} ops/sec")
        logger.info(f"   • Context creation: {auth_stats['context_creation']['throughput_ops_per_sec']:.2f} ops/sec")

        return auth_stats

    # =========================================================================
    # STRESS TESTS
    # =========================================================================

    async def test_sustained_load(self):
        """Test sustained load over time"""
        logger.info("⏱️  Testing Sustained Load (60 seconds)...")

        start_time = time.time()
        end_time = start_time + 60  # Run for 60 seconds
        operations_completed = 0
        errors = 0

        while time.time() < end_time:
            try:
                # Create agent
                agent = ParlantAgent(
                    id=f"sustained-load-{int(time.time()*1000)}",
                    workspace_id="sustained-load-workspace",
                    created_by="sustained-load-user",
                    name=f"Sustained Load Agent {operations_completed}"
                )

                await self.db_manager.create_agent(agent)
                operations_completed += 1

                # Brief pause to avoid overwhelming the system
                await asyncio.sleep(0.1)

            except Exception as e:
                errors += 1
                logger.warning(f"Error during sustained load test: {e}")

            # Log progress every 10 seconds
            elapsed = time.time() - start_time
            if int(elapsed) % 10 == 0 and elapsed > 0:
                ops_per_sec = operations_completed / elapsed
                logger.info(f"   • {elapsed:.0f}s elapsed: {operations_completed} ops, {ops_per_sec:.2f} ops/sec")

        total_duration = time.time() - start_time
        average_throughput = operations_completed / total_duration

        sustained_load_stats = {
            "duration_seconds": total_duration,
            "operations_completed": operations_completed,
            "errors": errors,
            "average_throughput_ops_per_sec": average_throughput,
            "error_rate": (errors / (operations_completed + errors)) * 100 if (operations_completed + errors) > 0 else 0
        }

        logger.info(f"   • Sustained load completed: {operations_completed} ops in {total_duration:.1f}s")
        logger.info(f"   • Average throughput: {average_throughput:.2f} ops/sec")
        logger.info(f"   • Error rate: {sustained_load_stats['error_rate']:.2f}%")

        return sustained_load_stats

    # =========================================================================
    # MAIN TEST EXECUTION
    # =========================================================================

    async def run_all_performance_tests(self):
        """Execute all performance tests"""
        logger.info("🚀 Starting Performance and Load Testing Suite")
        logger.info("=" * 70)

        await self.setup()

        try:
            results = {}

            # Database performance tests
            results["db_connection_performance"] = await self.test_database_connection_performance()
            results["agent_crud_performance"] = await self.test_agent_crud_performance()

            # Concurrent load tests
            results["concurrent_operations"] = await self.test_concurrent_agent_operations()
            results["session_event_throughput"] = await self.test_session_event_throughput()

            # Authentication performance tests
            results["authentication_performance"] = await self.test_authentication_performance()

            # Stress tests
            results["sustained_load"] = await self.test_sustained_load()

        finally:
            await self.teardown()

        # Generate performance report
        return self.generate_performance_report(results)

    def generate_performance_report(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        # Calculate overall metrics
        all_operations = [m for m in self.metrics if m.success]
        failed_operations = [m for m in self.metrics if not m.success]

        if all_operations:
            avg_response_time = statistics.mean([m.duration_ms for m in all_operations])
            p95_response_time = statistics.quantiles([m.duration_ms for m in all_operations], n=20)[18] if len(all_operations) > 20 else max([m.duration_ms for m in all_operations])
            p99_response_time = statistics.quantiles([m.duration_ms for m in all_operations], n=100)[98] if len(all_operations) > 100 else max([m.duration_ms for m in all_operations])
        else:
            avg_response_time = p95_response_time = p99_response_time = 0

        performance_summary = {
            "test_execution_summary": {
                "total_operations": len(self.metrics),
                "successful_operations": len(all_operations),
                "failed_operations": len(failed_operations),
                "success_rate": f"{(len(all_operations)/len(self.metrics)*100):.1f}%" if self.metrics else "0%"
            },
            "response_time_metrics": {
                "average_ms": avg_response_time,
                "p95_ms": p95_response_time,
                "p99_ms": p99_response_time
            },
            "performance_benchmarks": results,
            "detailed_metrics": [
                {
                    "operation": m.operation,
                    "duration_ms": m.duration_ms,
                    "success": m.success,
                    "timestamp": m.timestamp.isoformat()
                }
                for m in self.metrics
            ]
        }

        # Print performance summary
        print("\n🚀 PERFORMANCE TEST RESULTS:")
        print(f"   • Total Operations: {len(self.metrics)}")
        print(f"   • Success Rate: {performance_summary['test_execution_summary']['success_rate']}")
        print(f"   • Average Response Time: {avg_response_time:.2f}ms")
        print(f"   • P95 Response Time: {p95_response_time:.2f}ms")
        print(f"   • P99 Response Time: {p99_response_time:.2f}ms")

        # Performance assessment
        if avg_response_time < 100 and len(failed_operations) == 0:
            performance_grade = "EXCELLENT"
        elif avg_response_time < 500 and len(failed_operations) < len(self.metrics) * 0.01:
            performance_grade = "GOOD"
        elif avg_response_time < 1000 and len(failed_operations) < len(self.metrics) * 0.05:
            performance_grade = "ACCEPTABLE"
        else:
            performance_grade = "NEEDS_IMPROVEMENT"

        performance_summary["overall_performance_grade"] = performance_grade
        print(f"   • Overall Performance Grade: {performance_grade}")

        return performance_summary


async def main():
    """Main execution function for performance tests"""
    test_suite = PerformanceTestSuite()
    return await test_suite.run_all_performance_tests()


if __name__ == "__main__":
    results = asyncio.run(main())