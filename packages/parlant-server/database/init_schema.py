"""
Database Schema Initialization for Parlant

This module ensures that the Parlant-specific database tables are properly
created and up-to-date in Sim's PostgreSQL database.
"""

import asyncio
import logging
from typing import Dict, Any

import asyncpg
from database.connection import get_database_url

logger = logging.getLogger(__name__)


class ParlantSchemaManager:
    """Manages Parlant database schema initialization and migrations."""

    def __init__(self, database_url: str = None):
        self.database_url = database_url or get_database_url()

    async def verify_tables_exist(self) -> Dict[str, bool]:
        """Verify that all Parlant tables exist in the database."""
        required_tables = [
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
        ]

        table_status = {}

        try:
            conn = await asyncpg.connect(self.database_url)

            for table in required_tables:
                exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = $1
                    )
                """, table)

                table_status[table] = exists

            await conn.close()

        except Exception as e:
            logger.error(f"Error verifying table existence: {e}")
            raise

        return table_status

    async def verify_schema_compatibility(self) -> Dict[str, Any]:
        """Verify that the database schema is compatible with Parlant requirements."""
        compatibility_status = {
            'tables_exist': False,
            'workspace_references': False,
            'user_references': False,
            'required_enums': False,
            'indexes_created': False,
            'issues': []
        }

        try:
            conn = await asyncpg.connect(self.database_url)

            # Check if core Sim tables exist (workspace, user)
            workspace_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'workspace'
                )
            """)

            user_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'user'
                )
            """)

            compatibility_status['workspace_references'] = workspace_exists
            compatibility_status['user_references'] = user_exists

            if not workspace_exists:
                compatibility_status['issues'].append("Missing 'workspace' table - required for workspace isolation")

            if not user_exists:
                compatibility_status['issues'].append("Missing 'user' table - required for user associations")

            # Check if Parlant tables exist
            table_status = await self.verify_tables_exist()
            all_tables_exist = all(table_status.values())
            compatibility_status['tables_exist'] = all_tables_exist

            missing_tables = [table for table, exists in table_status.items() if not exists]
            if missing_tables:
                compatibility_status['issues'].append(f"Missing Parlant tables: {', '.join(missing_tables)}")

            # Check for required enums
            required_enums = [
                'agent_status',
                'session_mode',
                'session_status',
                'event_type',
                'journey_state_type',
                'composition_mode'
            ]

            enum_status = {}
            for enum_name in required_enums:
                exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM pg_type
                        WHERE typname = $1 AND typtype = 'e'
                    )
                """, enum_name)
                enum_status[enum_name] = exists

            compatibility_status['required_enums'] = all(enum_status.values())
            missing_enums = [enum for enum, exists in enum_status.items() if not exists]
            if missing_enums:
                compatibility_status['issues'].append(f"Missing required enums: {', '.join(missing_enums)}")

            await conn.close()

        except Exception as e:
            logger.error(f"Error verifying schema compatibility: {e}")
            compatibility_status['issues'].append(f"Database connection error: {str(e)}")

        return compatibility_status

    async def get_schema_status(self) -> Dict[str, Any]:
        """Get complete schema status for Parlant integration."""
        try:
            table_status = await self.verify_tables_exist()
            compatibility = await self.verify_schema_compatibility()

            return {
                'ready': compatibility['tables_exist'] and
                        compatibility['workspace_references'] and
                        compatibility['user_references'] and
                        compatibility['required_enums'],
                'table_status': table_status,
                'compatibility': compatibility,
                'total_tables': len(table_status),
                'tables_ready': sum(1 for exists in table_status.values() if exists),
                'recommendations': self._get_recommendations(compatibility)
            }

        except Exception as e:
            logger.error(f"Error getting schema status: {e}")
            return {
                'ready': False,
                'error': str(e),
                'recommendations': [
                    "Check database connection",
                    "Verify environment variables are set correctly",
                    "Ensure database migrations have been run"
                ]
            }

    def _get_recommendations(self, compatibility: Dict[str, Any]) -> list[str]:
        """Generate recommendations based on schema compatibility status."""
        recommendations = []

        if not compatibility['tables_exist']:
            recommendations.append("Run database migrations to create Parlant tables")

        if not compatibility['workspace_references']:
            recommendations.append("Ensure Sim's workspace table exists before creating Parlant tables")

        if not compatibility['user_references']:
            recommendations.append("Ensure Sim's user table exists before creating Parlant tables")

        if not compatibility['required_enums']:
            recommendations.append("Create required PostgreSQL enums for Parlant")

        if compatibility['issues']:
            recommendations.append("Review and resolve schema compatibility issues")

        if all([
            compatibility['tables_exist'],
            compatibility['workspace_references'],
            compatibility['user_references'],
            compatibility['required_enums']
        ]):
            recommendations.append("Schema is ready - Parlant can be started safely")

        return recommendations


async def check_parlant_schema() -> Dict[str, Any]:
    """Check Parlant database schema status."""
    schema_manager = ParlantSchemaManager()
    return await schema_manager.get_schema_status()


async def main():
    """CLI entry point for schema checking."""
    logging.basicConfig(level=logging.INFO)

    print("Checking Parlant database schema...")
    status = await check_parlant_schema()

    print(f"\nSchema Status: {'✅ Ready' if status['ready'] else '❌ Not Ready'}")
    print(f"Tables: {status.get('tables_ready', 0)}/{status.get('total_tables', 0)}")

    if 'table_status' in status:
        print("\nTable Status:")
        for table, exists in status['table_status'].items():
            status_icon = "✅" if exists else "❌"
            print(f"  {status_icon} {table}")

    if 'compatibility' in status and status['compatibility'].get('issues'):
        print("\nIssues Found:")
        for issue in status['compatibility']['issues']:
            print(f"  ❌ {issue}")

    if 'recommendations' in status:
        print("\nRecommendations:")
        for rec in status['recommendations']:
            print(f"  💡 {rec}")


if __name__ == "__main__":
    asyncio.run(main())