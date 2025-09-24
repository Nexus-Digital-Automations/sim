"""
Test Database Integration for Parlant-Sim Integration

This module provides comprehensive tests for the Parlant PostgreSQL integration
to ensure proper functionality with Sim's existing database.

Run tests with: python -m pytest test_integration.py -v
"""

import os
import asyncio
import pytest
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any

from database import (
    ParlantDatabaseManager,
    PostgreSQLSessionStore,
    ParlantAgent,
    ParlantSession,
    ParlantEvent,
    db_manager
)

# Test configuration
TEST_WORKSPACE_ID = "test-workspace-123"
TEST_USER_ID = "test-user-456"


@pytest.fixture
async def database_manager():
    """Create a test database manager"""
    # Use a test database URL if available, otherwise use main database
    test_db_url = os.getenv('TEST_DATABASE_URL') or os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')

    if not test_db_url:
        pytest.skip("No database URL available for testing")

    manager = ParlantDatabaseManager(test_db_url)
    await manager.initialize()

    yield manager

    # Cleanup
    await manager.close()


@pytest.fixture
async def session_store():
    """Create a test session store"""
    store = PostgreSQLSessionStore(workspace_id=TEST_WORKSPACE_ID)
    await store.initialize()

    yield store

    await store.close()


@pytest.fixture
async def test_agent_data():
    """Create test agent data"""
    return ParlantAgent(
        id=str(uuid.uuid4()),
        workspace_id=TEST_WORKSPACE_ID,
        created_by=TEST_USER_ID,
        name="Test Agent",
        description="A test agent for integration testing",
        status="active",
        model_provider="openai",
        model_name="gpt-4",
        temperature=70,
        max_tokens=2000
    )


@pytest.fixture
async def test_session_data():
    """Create test session data"""
    return ParlantSession(
        id=str(uuid.uuid4()),
        agent_id="test-agent-id",
        workspace_id=TEST_WORKSPACE_ID,
        user_id=TEST_USER_ID,
        title="Test Session",
        metadata={"test": True, "environment": "integration_test"},
        variables={"user_name": "Test User", "session_type": "test"}
    )


class TestDatabaseIntegration:
    """Test database integration functionality"""

    async def test_database_connection(self, database_manager: ParlantDatabaseManager):
        """Test basic database connectivity"""
        health = await database_manager.health_check()

        assert health['status'] == 'healthy'
        assert health['connected'] is True
        assert 'database_version' in health
        assert 'stats' in health

    async def test_agent_crud_operations(
        self,
        database_manager: ParlantDatabaseManager,
        test_agent_data: ParlantAgent
    ):
        """Test agent CRUD operations"""

        # Create agent
        agent_id = await database_manager.create_agent(test_agent_data)
        assert agent_id == test_agent_data.id

        # Read agent
        retrieved_agent = await database_manager.get_agent(agent_id, TEST_WORKSPACE_ID)
        assert retrieved_agent is not None
        assert retrieved_agent.name == test_agent_data.name
        assert retrieved_agent.workspace_id == TEST_WORKSPACE_ID
        assert retrieved_agent.status == "active"

        # Update agent
        retrieved_agent.description = "Updated test description"
        updated = await database_manager.update_agent(retrieved_agent)
        assert updated is True

        # Verify update
        updated_agent = await database_manager.get_agent(agent_id, TEST_WORKSPACE_ID)
        assert updated_agent.description == "Updated test description"

        # List agents
        agents = await database_manager.list_agents(TEST_WORKSPACE_ID)
        assert len(agents) >= 1
        assert any(agent.id == agent_id for agent in agents)

        # Delete agent (soft delete)
        deleted = await database_manager.delete_agent(agent_id, TEST_WORKSPACE_ID)
        assert deleted is True

        # Verify deletion
        deleted_agent = await database_manager.get_agent(agent_id, TEST_WORKSPACE_ID)
        assert deleted_agent is None

    async def test_session_crud_operations(
        self,
        database_manager: ParlantDatabaseManager,
        test_session_data: ParlantSession
    ):
        """Test session CRUD operations"""

        # Create session
        session_id = await database_manager.create_session(test_session_data)
        assert session_id == test_session_data.id

        # Read session
        retrieved_session = await database_manager.get_session(session_id, TEST_WORKSPACE_ID)
        assert retrieved_session is not None
        assert retrieved_session.title == test_session_data.title
        assert retrieved_session.workspace_id == TEST_WORKSPACE_ID
        assert retrieved_session.metadata["test"] is True

        # Update session
        retrieved_session.status = "completed"
        retrieved_session.ended_at = datetime.utcnow()
        updated = await database_manager.update_session(retrieved_session)
        assert updated is True

        # List sessions
        sessions = await database_manager.list_sessions(
            workspace_id=TEST_WORKSPACE_ID,
            user_id=TEST_USER_ID
        )
        assert len(sessions) >= 1
        assert any(session.id == session_id for session in sessions)

    async def test_event_operations(
        self,
        database_manager: ParlantDatabaseManager,
        test_session_data: ParlantSession
    ):
        """Test event creation and retrieval"""

        # Create session first
        session_id = await database_manager.create_session(test_session_data)

        # Create test events
        events = [
            ParlantEvent(
                id=str(uuid.uuid4()),
                session_id=session_id,
                offset=0,
                event_type="customer_message",
                content={"message": "Hello, AI agent!"},
                metadata={"timestamp": datetime.utcnow().isoformat()}
            ),
            ParlantEvent(
                id=str(uuid.uuid4()),
                session_id=session_id,
                offset=1,
                event_type="agent_message",
                content={"message": "Hello! How can I help you today?"},
                metadata={"model": "gpt-4", "tokens_used": 15}
            )
        ]

        # Create events
        event_ids = []
        for event in events:
            event_id = await database_manager.create_event(event)
            event_ids.append(event_id)

        # Retrieve events
        retrieved_events = await database_manager.get_events(session_id)
        assert len(retrieved_events) == 2
        assert retrieved_events[0].event_type == "customer_message"
        assert retrieved_events[1].event_type == "agent_message"

        # Test event filtering
        message_events = await database_manager.get_events(
            session_id,
            event_types=["customer_message", "agent_message"]
        )
        assert len(message_events) == 2

        # Test offset filtering
        later_events = await database_manager.get_events(session_id, from_offset=1)
        assert len(later_events) == 1
        assert later_events[0].event_type == "agent_message"

        # Verify session counters were updated
        updated_session = await database_manager.get_session(session_id)
        assert updated_session.event_count == 2
        assert updated_session.message_count == 2

    async def test_workspace_isolation(
        self,
        database_manager: ParlantDatabaseManager,
        test_agent_data: ParlantAgent
    ):
        """Test workspace data isolation"""

        # Create agent in first workspace
        agent_id_1 = await database_manager.create_agent(test_agent_data)

        # Create agent in second workspace
        test_agent_data.id = str(uuid.uuid4())
        test_agent_data.workspace_id = "test-workspace-999"
        agent_id_2 = await database_manager.create_agent(test_agent_data)

        # Verify workspace isolation
        agent_from_ws1 = await database_manager.get_agent(agent_id_1, TEST_WORKSPACE_ID)
        agent_from_ws2 = await database_manager.get_agent(agent_id_2, "test-workspace-999")

        assert agent_from_ws1 is not None
        assert agent_from_ws2 is not None

        # Cross-workspace access should be denied
        no_access_1 = await database_manager.get_agent(agent_id_1, "test-workspace-999")
        no_access_2 = await database_manager.get_agent(agent_id_2, TEST_WORKSPACE_ID)

        assert no_access_1 is None
        assert no_access_2 is None

        # List agents should be workspace-scoped
        ws1_agents = await database_manager.list_agents(TEST_WORKSPACE_ID)
        ws2_agents = await database_manager.list_agents("test-workspace-999")

        ws1_ids = [agent.id for agent in ws1_agents]
        ws2_ids = [agent.id for agent in ws2_agents]

        assert agent_id_1 in ws1_ids
        assert agent_id_1 not in ws2_ids
        assert agent_id_2 in ws2_ids
        assert agent_id_2 not in ws1_ids

        # Clean up
        await database_manager.delete_agent(agent_id_1, TEST_WORKSPACE_ID)
        await database_manager.delete_agent(agent_id_2, "test-workspace-999")

    async def test_session_store_integration(
        self,
        session_store: PostgreSQLSessionStore
    ):
        """Test the session store integration"""

        # Create test agent first (session store needs valid agent)
        agent_data = ParlantAgent(
            id=str(uuid.uuid4()),
            workspace_id=TEST_WORKSPACE_ID,
            created_by=TEST_USER_ID,
            name="Session Store Test Agent",
            description="Agent for session store testing"
        )
        agent_id = await db_manager.create_agent(agent_data)

        try:
            # Create session via session store
            session_data = {
                "user_id": TEST_USER_ID,
                "title": "Test Session via Store",
                "metadata": {"source": "session_store_test"},
                "variables": {"test_var": "test_value"}
            }

            session_id = await session_store.create_session(agent_id, session_data)
            assert session_id is not None

            # Retrieve session
            retrieved_session = await session_store.get_session(session_id)
            assert retrieved_session is not None
            assert retrieved_session['title'] == "Test Session via Store"
            assert retrieved_session['metadata']['source'] == "session_store_test"

            # Create events via session store
            event_data = {
                "event_type": "customer_message",
                "content": {"message": "Test message via session store"},
                "metadata": {"test": True}
            }

            event_id = await session_store.create_event(session_id, event_data)
            assert event_id is not None

            # Retrieve events
            events = await session_store.get_events(session_id)
            assert len(events) == 1
            assert events[0]['event_type'] == "customer_message"
            assert events[0]['content']['message'] == "Test message via session store"

            # Update session
            update_data = {"status": "completed", "ended_at": datetime.utcnow()}
            updated = await session_store.update_session(session_id, update_data)
            assert updated is True

        finally:
            # Cleanup
            await db_manager.delete_agent(agent_id, TEST_WORKSPACE_ID)


class TestDataIntegrity:
    """Test data integrity and constraints"""

    async def test_foreign_key_constraints(self, database_manager: ParlantDatabaseManager):
        """Test that foreign key constraints are properly enforced"""

        # Attempt to create session with non-existent agent
        invalid_session = ParlantSession(
            id=str(uuid.uuid4()),
            agent_id="non-existent-agent-id",
            workspace_id=TEST_WORKSPACE_ID,
            user_id=TEST_USER_ID,
            title="Invalid Session"
        )

        with pytest.raises(Exception):  # Should raise foreign key constraint error
            await database_manager.create_session(invalid_session)

    async def test_unique_constraints(
        self,
        database_manager: ParlantDatabaseManager,
        test_session_data: ParlantSession
    ):
        """Test unique constraints on events"""

        # Create session first
        session_id = await database_manager.create_session(test_session_data)

        # Create first event
        event1 = ParlantEvent(
            id=str(uuid.uuid4()),
            session_id=session_id,
            offset=0,
            event_type="customer_message",
            content={"message": "First message"}
        )
        await database_manager.create_event(event1)

        # Attempt to create event with same offset (should fail)
        event2 = ParlantEvent(
            id=str(uuid.uuid4()),
            session_id=session_id,
            offset=0,  # Same offset as event1
            event_type="customer_message",
            content={"message": "Second message"}
        )

        with pytest.raises(Exception):  # Should raise unique constraint error
            await database_manager.create_event(event2)


@pytest.mark.asyncio
async def test_performance_baseline(database_manager: ParlantDatabaseManager):
    """Test basic performance benchmarks"""
    start_time = datetime.utcnow()

    # Perform health check (should be fast)
    health = await database_manager.health_check()

    end_time = datetime.utcnow()
    response_time = (end_time - start_time).total_seconds() * 1000

    assert health['status'] == 'healthy'
    assert response_time < 1000  # Should complete within 1 second
    assert 'response_time_ms' in health
    assert health['response_time_ms'] < 500  # DB response should be under 500ms


async def run_integration_tests():
    """Run all integration tests manually (without pytest)"""
    print("🔄 Starting Parlant-Sim Database Integration Tests...")

    try:
        # Test database connection
        print("📡 Testing database connection...")
        health = await db_manager.health_check()
        print(f"✅ Database health: {health['status']}")
        print(f"   - Database version: {health.get('database_version', 'unknown')}")
        print(f"   - Response time: {health.get('response_time_ms', 0)}ms")
        print(f"   - Pool status: {health.get('pool_size', 'unknown')}")

        # Test agent operations
        print("\n👤 Testing agent operations...")
        test_agent = ParlantAgent(
            id=str(uuid.uuid4()),
            workspace_id=TEST_WORKSPACE_ID,
            created_by=TEST_USER_ID,
            name="Integration Test Agent",
            description="Test agent for manual integration testing"
        )

        agent_id = await db_manager.create_agent(test_agent)
        print(f"✅ Created agent: {agent_id}")

        retrieved_agent = await db_manager.get_agent(agent_id, TEST_WORKSPACE_ID)
        assert retrieved_agent.name == test_agent.name
        print(f"✅ Retrieved agent: {retrieved_agent.name}")

        # Test session operations
        print("\n💬 Testing session operations...")
        test_session = ParlantSession(
            id=str(uuid.uuid4()),
            agent_id=agent_id,
            workspace_id=TEST_WORKSPACE_ID,
            user_id=TEST_USER_ID,
            title="Integration Test Session"
        )

        session_id = await db_manager.create_session(test_session)
        print(f"✅ Created session: {session_id}")

        # Test event operations
        print("\n📝 Testing event operations...")
        test_event = ParlantEvent(
            id=str(uuid.uuid4()),
            session_id=session_id,
            offset=0,
            event_type="customer_message",
            content={"message": "Hello from integration test!"}
        )

        event_id = await db_manager.create_event(test_event)
        print(f"✅ Created event: {event_id}")

        events = await db_manager.get_events(session_id)
        assert len(events) == 1
        print(f"✅ Retrieved {len(events)} events")

        # Test workspace isolation
        print("\n🏢 Testing workspace isolation...")
        workspace_access = await db_manager.verify_workspace_access(
            agent_id, TEST_WORKSPACE_ID, 'agent'
        )
        assert workspace_access is True
        print("✅ Workspace isolation working correctly")

        # Cleanup
        print("\n🧹 Cleaning up test data...")
        await db_manager.delete_agent(agent_id, TEST_WORKSPACE_ID)
        print("✅ Test data cleaned up")

        print("\n🎉 All integration tests passed successfully!")

    except Exception as e:
        print(f"\n❌ Integration test failed: {e}")
        raise
    finally:
        await db_manager.close()


if __name__ == "__main__":
    # Run manual integration tests
    asyncio.run(run_integration_tests())