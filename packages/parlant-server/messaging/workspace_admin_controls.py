"""
Workspace Administration Controls for Messaging
==============================================

This module provides comprehensive administrative controls for workspace messaging,
including user management, channel administration, security policies, compliance
configuration, and detailed analytics and reporting.
"""

import asyncio
import logging
import json
from typing import Dict, List, Optional, Set, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4
import statistics

from sqlalchemy import select, and_, func, text, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, validator

from database.connection import get_async_session_context
from auth.sim_auth_bridge import SimSession, SimUser
from workspace_isolation import WorkspaceContext, workspace_isolation_manager
from messaging.workspace_messaging_system import workspace_messaging_system
from messaging.security_compliance_system import (
    SecurityPolicy,
    ComplianceSettings,
    ComplianceFramework,
    DataRetentionPolicy
)
from config.settings import get_settings

logger = logging.getLogger(__name__)


class AdminAction(str, Enum):
    """Administrative actions for audit logging."""
    CREATE_CHANNEL = "create_channel"
    DELETE_CHANNEL = "delete_channel"
    MODIFY_CHANNEL = "modify_channel"
    ADD_USER = "add_user"
    REMOVE_USER = "remove_user"
    CHANGE_PERMISSIONS = "change_permissions"
    UPDATE_SETTINGS = "update_settings"
    EXPORT_DATA = "export_data"
    DELETE_MESSAGES = "delete_messages"
    SUSPEND_USER = "suspend_user"
    UNSUSPEND_USER = "unsuspend_user"


class UserRole(str, Enum):
    """User roles within workspace messaging."""
    OWNER = "owner"
    ADMIN = "admin"
    MODERATOR = "moderator"
    MEMBER = "member"
    GUEST = "guest"
    SUSPENDED = "suspended"


class ChannelType(str, Enum):
    """Channel types for organization."""
    PUBLIC = "public"
    PRIVATE = "private"
    DIRECT = "direct"
    ANNOUNCEMENT = "announcement"
    ARCHIVE = "archive"


@dataclass
class ChannelSettings:
    """Configuration settings for messaging channels."""
    name: str
    description: str = ""
    channel_type: ChannelType = ChannelType.PUBLIC
    is_default: bool = False
    member_limit: Optional[int] = None
    retention_days: Optional[int] = None
    encryption_enabled: bool = False
    message_approval_required: bool = False
    allowed_file_types: Set[str] = field(default_factory=set)
    max_file_size_mb: int = 100
    rate_limit_messages_per_minute: int = 60
    custom_permissions: Dict[str, List[str]] = field(default_factory=dict)


@dataclass
class WorkspaceMessagingConfig:
    """Comprehensive workspace messaging configuration."""
    workspace_id: str

    # General settings
    messaging_enabled: bool = True
    default_retention_days: int = 90
    max_channels: int = 100
    max_users_per_channel: int = 1000

    # Security settings
    security_policy: Optional[SecurityPolicy] = None
    compliance_settings: Optional[ComplianceSettings] = None

    # Feature settings
    file_sharing_enabled: bool = True
    reactions_enabled: bool = True
    threads_enabled: bool = True
    message_editing_enabled: bool = True
    message_deletion_enabled: bool = True

    # Moderation settings
    profanity_filtering: bool = False
    spam_detection: bool = True
    auto_moderation_enabled: bool = False
    manual_approval_channels: Set[str] = field(default_factory=set)

    # Integration settings
    agent_integration_enabled: bool = True
    webhook_notifications_enabled: bool = False
    external_integrations: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MessagingAnalytics:
    """Comprehensive messaging analytics data."""
    workspace_id: str
    period_start: datetime
    period_end: datetime

    # Message statistics
    total_messages: int = 0
    messages_by_type: Dict[str, int] = field(default_factory=dict)
    messages_by_channel: Dict[str, int] = field(default_factory=dict)
    messages_by_user: Dict[str, int] = field(default_factory=dict)

    # User engagement
    active_users: int = 0
    average_messages_per_user: float = 0.0
    top_contributors: List[Dict[str, Any]] = field(default_factory=list)
    user_retention_rate: float = 0.0

    # Channel statistics
    most_active_channels: List[Dict[str, Any]] = field(default_factory=list)
    channel_growth: Dict[str, int] = field(default_factory=dict)
    average_channel_activity: float = 0.0

    # Performance metrics
    average_response_time: float = 0.0
    message_delivery_rate: float = 100.0
    uptime_percentage: float = 100.0

    # Security metrics
    security_incidents: int = 0
    blocked_messages: int = 0
    spam_detected: int = 0

    # Compliance metrics
    data_retention_compliance: float = 100.0
    audit_completeness: float = 100.0
    privacy_requests_processed: int = 0


class WorkspaceMessagingAdmin:
    """
    Comprehensive administration system for workspace messaging.

    Provides enterprise-grade administrative controls including:
    - User and channel management
    - Security policy configuration
    - Compliance settings management
    - Analytics and reporting
    - Data export and retention
    """

    def __init__(self):
        self.settings = get_settings()
        self._workspace_configs: Dict[str, WorkspaceMessagingConfig] = {}
        self._analytics_cache: Dict[str, MessagingAnalytics] = {}

    async def initialize(self):
        """Initialize the workspace messaging admin system."""
        logger.info("Initializing Workspace Messaging Admin System")

        try:
            # Load existing workspace configurations
            await self._load_workspace_configurations()

            # Initialize analytics collection
            await self._initialize_analytics_collection()

            logger.info("Workspace Messaging Admin System initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize admin system: {e}")
            raise

    async def create_messaging_channel(
        self,
        session: SimSession,
        workspace_id: str,
        channel_settings: ChannelSettings
    ) -> Dict[str, Any]:
        """Create new messaging channel with administrative controls."""
        logger.info(f"Creating channel '{channel_settings.name}' in workspace {workspace_id}")

        # Validate admin permissions
        await self._validate_admin_permissions(session, workspace_id, AdminAction.CREATE_CHANNEL)

        # Validate channel settings
        await self._validate_channel_settings(workspace_id, channel_settings)

        try:
            async with get_async_session_context() as db_session:
                # Create channel record
                channel_id = str(uuid4())

                channel_data = {
                    'id': channel_id,
                    'workspace_id': workspace_id,
                    'name': channel_settings.name,
                    'description': channel_settings.description,
                    'channel_type': channel_settings.channel_type.value,
                    'is_default': channel_settings.is_default,
                    'member_limit': channel_settings.member_limit,
                    'retention_days': channel_settings.retention_days,
                    'encryption_enabled': channel_settings.encryption_enabled,
                    'settings': {
                        'message_approval_required': channel_settings.message_approval_required,
                        'allowed_file_types': list(channel_settings.allowed_file_types),
                        'max_file_size_mb': channel_settings.max_file_size_mb,
                        'rate_limit_messages_per_minute': channel_settings.rate_limit_messages_per_minute,
                        'custom_permissions': channel_settings.custom_permissions
                    },
                    'created_at': datetime.now(),
                    'created_by': session.user.id
                }

                # Store in database (would use actual ORM model)
                await self._store_channel_data(db_session, channel_data)

                # Log administrative action
                await self._log_admin_action(
                    session,
                    workspace_id,
                    AdminAction.CREATE_CHANNEL,
                    {'channel_id': channel_id, 'channel_name': channel_settings.name}
                )

                logger.info(f"Channel '{channel_settings.name}' created successfully")

                return {
                    'channel_id': channel_id,
                    'name': channel_settings.name,
                    'type': channel_settings.channel_type.value,
                    'created_at': channel_data['created_at'].isoformat(),
                    'settings': channel_data['settings']
                }

        except Exception as e:
            logger.error(f"Failed to create channel: {e}")
            raise

    async def update_workspace_messaging_config(
        self,
        session: SimSession,
        workspace_id: str,
        config_updates: Dict[str, Any]
    ) -> WorkspaceMessagingConfig:
        """Update workspace messaging configuration."""
        logger.info(f"Updating messaging configuration for workspace {workspace_id}")

        # Validate admin permissions
        await self._validate_admin_permissions(session, workspace_id, AdminAction.UPDATE_SETTINGS)

        try:
            # Get current configuration
            current_config = await self._get_workspace_config(workspace_id)

            # Apply updates
            for key, value in config_updates.items():
                if hasattr(current_config, key):
                    setattr(current_config, key, value)

            # Validate updated configuration
            await self._validate_workspace_config(current_config)

            # Store updated configuration
            await self._store_workspace_config(current_config)

            # Log administrative action
            await self._log_admin_action(
                session,
                workspace_id,
                AdminAction.UPDATE_SETTINGS,
                {'updated_fields': list(config_updates.keys())}
            )

            # Cache updated configuration
            self._workspace_configs[workspace_id] = current_config

            logger.info(f"Messaging configuration updated for workspace {workspace_id}")
            return current_config

        except Exception as e:
            logger.error(f"Failed to update workspace configuration: {e}")
            raise

    async def manage_channel_membership(
        self,
        session: SimSession,
        workspace_id: str,
        channel_id: str,
        user_id: str,
        action: str,  # add, remove, promote, demote
        role: Optional[UserRole] = None
    ) -> Dict[str, Any]:
        """Manage channel membership and roles."""
        logger.info(f"Managing channel membership: {action} user {user_id} in channel {channel_id}")

        # Validate admin permissions
        action_type = AdminAction.ADD_USER if action == 'add' else AdminAction.REMOVE_USER
        await self._validate_admin_permissions(session, workspace_id, action_type)

        try:
            async with get_async_session_context() as db_session:
                if action == 'add':
                    # Add user to channel
                    membership_data = {
                        'id': str(uuid4()),
                        'workspace_id': workspace_id,
                        'channel_id': channel_id,
                        'user_id': user_id,
                        'role': (role or UserRole.MEMBER).value,
                        'permissions': await self._get_default_permissions(role or UserRole.MEMBER),
                        'joined_at': datetime.now(),
                        'is_active': True
                    }

                    await self._store_membership_data(db_session, membership_data)

                elif action == 'remove':
                    # Remove user from channel
                    await self._remove_channel_membership(db_session, channel_id, user_id)

                elif action in ['promote', 'demote']:
                    # Update user role
                    await self._update_member_role(db_session, channel_id, user_id, role)

                # Log administrative action
                await self._log_admin_action(
                    session,
                    workspace_id,
                    action_type,
                    {
                        'channel_id': channel_id,
                        'target_user_id': user_id,
                        'action': action,
                        'role': role.value if role else None
                    }
                )

                return {
                    'success': True,
                    'action': action,
                    'user_id': user_id,
                    'channel_id': channel_id,
                    'role': role.value if role else None,
                    'timestamp': datetime.now().isoformat()
                }

        except Exception as e:
            logger.error(f"Failed to manage channel membership: {e}")
            raise

    async def moderate_messages(
        self,
        session: SimSession,
        workspace_id: str,
        message_ids: List[str],
        action: str,  # delete, flag, approve, reject
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Moderate messages with administrative controls."""
        logger.info(f"Moderating {len(message_ids)} messages in workspace {workspace_id}")

        # Validate admin permissions
        await self._validate_admin_permissions(session, workspace_id, AdminAction.DELETE_MESSAGES)

        moderation_results = []

        try:
            async with get_async_session_context() as db_session:
                for message_id in message_ids:
                    result = await self._moderate_single_message(
                        db_session, message_id, action, reason, session.user.id
                    )
                    moderation_results.append(result)

                # Log administrative action
                await self._log_admin_action(
                    session,
                    workspace_id,
                    AdminAction.DELETE_MESSAGES,
                    {
                        'message_count': len(message_ids),
                        'action': action,
                        'reason': reason,
                        'message_ids': message_ids
                    }
                )

                return {
                    'success': True,
                    'action': action,
                    'processed_count': len(moderation_results),
                    'results': moderation_results,
                    'timestamp': datetime.now().isoformat()
                }

        except Exception as e:
            logger.error(f"Failed to moderate messages: {e}")
            raise

    async def generate_workspace_analytics(
        self,
        session: SimSession,
        workspace_id: str,
        start_date: datetime,
        end_date: datetime,
        include_detailed_breakdown: bool = True
    ) -> MessagingAnalytics:
        """Generate comprehensive messaging analytics for workspace."""
        logger.info(f"Generating analytics for workspace {workspace_id}")

        # Validate admin permissions
        await self._validate_admin_permissions(session, workspace_id, "view_analytics")

        try:
            analytics = MessagingAnalytics(
                workspace_id=workspace_id,
                period_start=start_date,
                period_end=end_date
            )

            # Calculate message statistics
            analytics.total_messages = await self._calculate_total_messages(
                workspace_id, start_date, end_date
            )
            analytics.messages_by_type = await self._calculate_messages_by_type(
                workspace_id, start_date, end_date
            )
            analytics.messages_by_channel = await self._calculate_messages_by_channel(
                workspace_id, start_date, end_date
            )

            # Calculate user engagement metrics
            analytics.active_users = await self._calculate_active_users(
                workspace_id, start_date, end_date
            )
            analytics.average_messages_per_user = (
                analytics.total_messages / max(analytics.active_users, 1)
            )
            analytics.top_contributors = await self._get_top_contributors(
                workspace_id, start_date, end_date, limit=10
            )

            # Calculate channel statistics
            analytics.most_active_channels = await self._get_most_active_channels(
                workspace_id, start_date, end_date, limit=10
            )

            # Calculate performance metrics
            analytics.average_response_time = await self._calculate_average_response_time(
                workspace_id, start_date, end_date
            )
            analytics.message_delivery_rate = await self._calculate_delivery_rate(
                workspace_id, start_date, end_date
            )

            # Calculate security metrics
            analytics.security_incidents = await self._count_security_incidents(
                workspace_id, start_date, end_date
            )
            analytics.blocked_messages = await self._count_blocked_messages(
                workspace_id, start_date, end_date
            )

            # Cache analytics for performance
            cache_key = f"{workspace_id}_{start_date.date()}_{end_date.date()}"
            self._analytics_cache[cache_key] = analytics

            logger.info(f"Analytics generated for workspace {workspace_id}")
            return analytics

        except Exception as e:
            logger.error(f"Failed to generate analytics: {e}")
            raise

    async def export_workspace_data(
        self,
        session: SimSession,
        workspace_id: str,
        export_format: str = 'json',  # json, csv, excel
        include_deleted: bool = False,
        date_range: Optional[tuple] = None
    ) -> Dict[str, Any]:
        """Export workspace messaging data for compliance or backup."""
        logger.info(f"Exporting workspace data for {workspace_id}")

        # Validate admin permissions
        await self._validate_admin_permissions(session, workspace_id, AdminAction.EXPORT_DATA)

        try:
            export_data = {
                'workspace_id': workspace_id,
                'export_timestamp': datetime.now().isoformat(),
                'exported_by': session.user.id,
                'format': export_format,
                'include_deleted': include_deleted
            }

            # Export messages
            messages = await self._export_messages(
                workspace_id, include_deleted, date_range
            )
            export_data['messages'] = messages

            # Export channels
            channels = await self._export_channels(workspace_id)
            export_data['channels'] = channels

            # Export user activity
            user_activity = await self._export_user_activity(
                workspace_id, date_range
            )
            export_data['user_activity'] = user_activity

            # Export audit logs
            audit_logs = await self._export_audit_logs(
                workspace_id, date_range
            )
            export_data['audit_logs'] = audit_logs

            # Log administrative action
            await self._log_admin_action(
                session,
                workspace_id,
                AdminAction.EXPORT_DATA,
                {
                    'format': export_format,
                    'message_count': len(messages),
                    'include_deleted': include_deleted
                }
            )

            # Generate download link or file
            download_info = await self._generate_export_file(export_data, export_format)

            return {
                'success': True,
                'export_id': str(uuid4()),
                'format': export_format,
                'file_size': download_info.get('file_size', 0),
                'download_url': download_info.get('download_url'),
                'expires_at': (datetime.now() + timedelta(hours=24)).isoformat(),
                'record_counts': {
                    'messages': len(messages),
                    'channels': len(channels),
                    'users': len(user_activity)
                }
            }

        except Exception as e:
            logger.error(f"Failed to export workspace data: {e}")
            raise

    async def configure_data_retention(
        self,
        session: SimSession,
        workspace_id: str,
        retention_policy: DataRetentionPolicy,
        custom_days: Optional[int] = None,
        channel_specific_policies: Optional[Dict[str, int]] = None
    ) -> Dict[str, Any]:
        """Configure data retention policies for workspace."""
        logger.info(f"Configuring data retention for workspace {workspace_id}")

        # Validate admin permissions
        await self._validate_admin_permissions(session, workspace_id, AdminAction.UPDATE_SETTINGS)

        try:
            retention_config = {
                'workspace_id': workspace_id,
                'policy': retention_policy.value,
                'custom_days': custom_days,
                'channel_specific_policies': channel_specific_policies or {},
                'configured_by': session.user.id,
                'configured_at': datetime.now().isoformat()
            }

            # Update workspace configuration
            workspace_config = await self._get_workspace_config(workspace_id)
            if not workspace_config.compliance_settings:
                workspace_config.compliance_settings = ComplianceSettings(workspace_id=workspace_id)

            workspace_config.compliance_settings.retention_policy = retention_policy
            workspace_config.compliance_settings.custom_retention_days = custom_days

            await self._store_workspace_config(workspace_config)

            # Schedule retention job
            await self._schedule_retention_cleanup(workspace_id, retention_config)

            # Log administrative action
            await self._log_admin_action(
                session,
                workspace_id,
                AdminAction.UPDATE_SETTINGS,
                {
                    'setting_type': 'data_retention',
                    'retention_policy': retention_policy.value,
                    'custom_days': custom_days
                }
            )

            return retention_config

        except Exception as e:
            logger.error(f"Failed to configure data retention: {e}")
            raise

    # Private implementation methods

    async def _validate_admin_permissions(
        self,
        session: SimSession,
        workspace_id: str,
        action: Union[AdminAction, str]
    ):
        """Validate that user has administrative permissions for the action."""
        workspace_context = await workspace_isolation_manager._validate_workspace_access(
            session, workspace_id
        )

        required_permissions = {
            AdminAction.CREATE_CHANNEL: ['admin', 'channel_management'],
            AdminAction.DELETE_CHANNEL: ['admin', 'channel_management'],
            AdminAction.MODIFY_CHANNEL: ['admin', 'channel_management'],
            AdminAction.ADD_USER: ['admin', 'user_management'],
            AdminAction.REMOVE_USER: ['admin', 'user_management'],
            AdminAction.CHANGE_PERMISSIONS: ['admin', 'user_management'],
            AdminAction.UPDATE_SETTINGS: ['admin'],
            AdminAction.EXPORT_DATA: ['admin', 'data_export'],
            AdminAction.DELETE_MESSAGES: ['admin', 'moderation'],
            AdminAction.SUSPEND_USER: ['admin', 'user_management'],
            'view_analytics': ['admin', 'analytics']
        }

        action_permissions = required_permissions.get(action, ['admin'])
        user_permissions = workspace_context.user_permissions

        if not any(perm in user_permissions for perm in action_permissions):
            raise Exception(f"Insufficient permissions for action: {action}")

    async def _get_workspace_config(self, workspace_id: str) -> WorkspaceMessagingConfig:
        """Get workspace messaging configuration."""
        if workspace_id in self._workspace_configs:
            return self._workspace_configs[workspace_id]

        # Load from database
        config = await self._load_workspace_config_from_db(workspace_id)
        if not config:
            # Create default configuration
            config = WorkspaceMessagingConfig(workspace_id=workspace_id)
            await self._store_workspace_config(config)

        self._workspace_configs[workspace_id] = config
        return config

    async def _calculate_total_messages(
        self,
        workspace_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> int:
        """Calculate total messages in date range."""
        # Implementation would query database
        return 0

    async def _calculate_messages_by_type(
        self,
        workspace_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, int]:
        """Calculate message counts by type."""
        return {
            'chat': 0,
            'system': 0,
            'file': 0,
            'agent_response': 0
        }

    async def _calculate_messages_by_channel(
        self,
        workspace_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, int]:
        """Calculate message counts by channel."""
        return {}

    async def _calculate_active_users(
        self,
        workspace_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> int:
        """Calculate number of active users."""
        return 0

    async def _get_top_contributors(
        self,
        workspace_id: str,
        start_date: datetime,
        end_date: datetime,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get top message contributors."""
        return []

    async def _log_admin_action(
        self,
        session: SimSession,
        workspace_id: str,
        action: AdminAction,
        details: Dict[str, Any]
    ):
        """Log administrative action for audit trail."""
        audit_entry = {
            'timestamp': datetime.now().isoformat(),
            'workspace_id': workspace_id,
            'admin_user_id': session.user.id,
            'action': action.value if isinstance(action, AdminAction) else action,
            'details': details,
            'ip_address': getattr(session, 'ip_address', None),
            'user_agent': getattr(session, 'user_agent', None)
        }

        # Store audit entry (implementation would use actual database)
        logger.info(f"Admin action logged: {action} by {session.user.id} in workspace {workspace_id}")

    # Additional private methods would be implemented for database operations,
    # file generation, cleanup scheduling, etc.

    async def _load_workspace_configurations(self):
        """Load workspace configurations from database."""
        pass

    async def _initialize_analytics_collection(self):
        """Initialize analytics data collection."""
        pass

    async def _validate_channel_settings(
        self,
        workspace_id: str,
        settings: ChannelSettings
    ):
        """Validate channel settings before creation."""
        pass

    async def _store_channel_data(self, db_session: AsyncSession, channel_data: Dict[str, Any]):
        """Store channel data in database."""
        pass

    async def _moderate_single_message(
        self,
        db_session: AsyncSession,
        message_id: str,
        action: str,
        reason: Optional[str],
        moderator_id: str
    ) -> Dict[str, Any]:
        """Moderate a single message."""
        return {
            'message_id': message_id,
            'action': action,
            'success': True,
            'reason': reason
        }


# Global admin system instance
workspace_messaging_admin = WorkspaceMessagingAdmin()


# Convenience functions for integration

async def create_messaging_channel(
    session: SimSession,
    workspace_id: str,
    channel_settings: ChannelSettings
) -> Dict[str, Any]:
    """Create messaging channel with admin controls."""
    return await workspace_messaging_admin.create_messaging_channel(
        session, workspace_id, channel_settings
    )


async def generate_messaging_analytics(
    session: SimSession,
    workspace_id: str,
    start_date: datetime,
    end_date: datetime
) -> MessagingAnalytics:
    """Generate messaging analytics for workspace."""
    return await workspace_messaging_admin.generate_workspace_analytics(
        session, workspace_id, start_date, end_date
    )


async def export_messaging_data(
    session: SimSession,
    workspace_id: str,
    export_format: str = 'json'
) -> Dict[str, Any]:
    """Export workspace messaging data."""
    return await workspace_messaging_admin.export_workspace_data(
        session, workspace_id, export_format
    )