"""
Workspace Messaging Database Schema
==================================

This module defines the database schema for enterprise workspace messaging
with comprehensive audit trails, security controls, and compliance features.
"""

from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer, JSON, Index, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()


class WorkspaceMessage(Base):
    """
    Core workspace message entity with encryption and audit support.
    """
    __tablename__ = "workspace_messages"

    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(String(255), nullable=False, index=True)

    # Message participants
    sender_id = Column(String(255), nullable=False, index=True)
    recipient_id = Column(String(255), nullable=True, index=True)  # NULL for broadcast
    channel_id = Column(String(255), nullable=True, index=True)
    agent_id = Column(String(255), nullable=True, index=True)

    # Message content and metadata
    message_type = Column(String(50), nullable=False, default='chat')
    priority = Column(String(20), nullable=False, default='normal')
    content = Column(Text, nullable=False)
    encrypted_content = Column(Text, nullable=True)
    metadata = Column(JSON, nullable=False, default=dict)

    # Threading and replies
    thread_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    reply_to_message_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True, index=True)

    # Security and compliance
    encryption_key_id = Column(String(255), nullable=True)
    audit_log_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    security_labels = Column(ARRAY(String), nullable=False, default=list)
    compliance_flags = Column(ARRAY(String), nullable=False, default=list)

    # Message status
    is_read = Column(Boolean, nullable=False, default=False)
    is_deleted = Column(Boolean, nullable=False, default=False, index=True)
    is_edited = Column(Boolean, nullable=False, default=False)
    edit_count = Column(Integer, nullable=False, default=0)

    # Performance and routing
    delivery_status = Column(String(20), nullable=False, default='pending')
    delivery_attempts = Column(Integer, nullable=False, default=0)
    last_delivery_attempt = Column(DateTime, nullable=True)

    # Relationships
    edit_history = relationship("MessageEditHistory", back_populates="message")
    read_receipts = relationship("MessageReadReceipt", back_populates="message")
    reactions = relationship("MessageReaction", back_populates="message")

    __table_args__ = (
        Index('ix_workspace_messages_workspace_channel', 'workspace_id', 'channel_id'),
        Index('ix_workspace_messages_workspace_created', 'workspace_id', 'created_at'),
        Index('ix_workspace_messages_thread', 'thread_id', 'created_at'),
        Index('ix_workspace_messages_sender_created', 'sender_id', 'created_at'),
        Index('ix_workspace_messages_type_priority', 'message_type', 'priority'),
        Index('ix_workspace_messages_security', 'workspace_id', 'security_labels'),
        Index('ix_workspace_messages_compliance', 'workspace_id', 'compliance_flags'),
    )


class WorkspaceChannel(Base):
    """
    Workspace messaging channels with access control.
    """
    __tablename__ = "workspace_channels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Channel configuration
    channel_type = Column(String(50), nullable=False, default='public')  # public, private, direct
    is_default = Column(Boolean, nullable=False, default=False)
    is_archived = Column(Boolean, nullable=False, default=False, index=True)

    # Access control
    access_level = Column(String(50), nullable=False, default='workspace')  # workspace, invite, admin
    allowed_roles = Column(ARRAY(String), nullable=False, default=list)
    member_limit = Column(Integer, nullable=True)

    # Settings
    settings = Column(JSON, nullable=False, default=dict)
    retention_days = Column(Integer, nullable=True)
    encryption_enabled = Column(Boolean, nullable=False, default=False)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)

    # Relationships
    members = relationship("ChannelMembership", back_populates="channel")

    __table_args__ = (
        Index('ix_workspace_channels_workspace_name', 'workspace_id', 'name'),
        Index('ix_workspace_channels_type', 'workspace_id', 'channel_type'),
    )


class ChannelMembership(Base):
    """
    User membership in workspace channels.
    """
    __tablename__ = "channel_memberships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(String(255), nullable=False, index=True)
    channel_id = Column(UUID(as_uuid=True), ForeignKey('workspace_channels.id'), nullable=False)
    user_id = Column(String(255), nullable=False, index=True)

    # Membership details
    role = Column(String(50), nullable=False, default='member')  # admin, moderator, member
    permissions = Column(ARRAY(String), nullable=False, default=list)

    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    is_muted = Column(Boolean, nullable=False, default=False)
    last_read_message_id = Column(UUID(as_uuid=True), nullable=True)

    # Timestamps
    joined_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)

    # Relationships
    channel = relationship("WorkspaceChannel", back_populates="members")

    __table_args__ = (
        Index('ix_channel_memberships_workspace_user', 'workspace_id', 'user_id'),
        Index('ix_channel_memberships_channel_user', 'channel_id', 'user_id'),
    )


class WorkspacePresence(Base):
    """
    User presence information within workspaces.
    """
    __tablename__ = "workspace_presence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(String(255), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)

    # Presence status
    status = Column(String(20), nullable=False, default='offline')  # online, away, busy, offline, invisible
    custom_status = Column(String(255), nullable=True)
    last_seen = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Connection details
    socket_id = Column(String(255), nullable=True)
    device_info = Column(JSON, nullable=False, default=dict)
    location_info = Column(JSON, nullable=False, default=dict)

    # Activity tracking
    is_active = Column(Boolean, nullable=False, default=True)
    activity_score = Column(Integer, nullable=False, default=0)
    last_activity = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Timestamps
    session_start = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_workspace_presence_workspace_status', 'workspace_id', 'status'),
        Index('ix_workspace_presence_user_updated', 'user_id', 'updated_at'),
        Index('ix_workspace_presence_activity', 'workspace_id', 'last_activity'),
    )


class MessageEditHistory(Base):
    """
    Audit trail for message edits.
    """
    __tablename__ = "message_edit_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('workspace_messages.id'), nullable=False, index=True)
    editor_id = Column(String(255), nullable=False, index=True)

    # Edit details
    original_content = Column(Text, nullable=False)
    new_content = Column(Text, nullable=False)
    edit_reason = Column(String(255), nullable=True)

    # Change tracking
    changes = Column(JSON, nullable=False, default=dict)
    revision_number = Column(Integer, nullable=False)

    # Timestamps
    edited_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    message = relationship("WorkspaceMessage", back_populates="edit_history")

    __table_args__ = (
        Index('ix_message_edit_history_message_revision', 'message_id', 'revision_number'),
    )


class MessageReadReceipt(Base):
    """
    Read receipts for workspace messages.
    """
    __tablename__ = "message_read_receipts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('workspace_messages.id'), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    workspace_id = Column(String(255), nullable=False, index=True)

    # Read details
    read_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    delivery_method = Column(String(50), nullable=False, default='realtime')

    # Relationships
    message = relationship("WorkspaceMessage", back_populates="read_receipts")

    __table_args__ = (
        Index('ix_message_read_receipts_message_user', 'message_id', 'user_id'),
        Index('ix_message_read_receipts_workspace_user', 'workspace_id', 'user_id', 'read_at'),
    )


class MessageReaction(Base):
    """
    Reactions to workspace messages.
    """
    __tablename__ = "message_reactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('workspace_messages.id'), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    workspace_id = Column(String(255), nullable=False, index=True)

    # Reaction details
    reaction_type = Column(String(50), nullable=False)  # emoji, custom, etc.
    reaction_value = Column(String(255), nullable=False)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    message = relationship("WorkspaceMessage", back_populates="reactions")

    __table_args__ = (
        Index('ix_message_reactions_message_type', 'message_id', 'reaction_type'),
        Index('ix_message_reactions_user_workspace', 'user_id', 'workspace_id'),
    )


class WorkspaceMessagingSettings(Base):
    """
    Workspace-specific messaging configuration.
    """
    __tablename__ = "workspace_messaging_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(String(255), nullable=False, unique=True, index=True)

    # General settings
    is_enabled = Column(Boolean, nullable=False, default=True)
    default_retention_days = Column(Integer, nullable=False, default=90)
    max_message_length = Column(Integer, nullable=False, default=10000)

    # Security settings
    encryption_required = Column(Boolean, nullable=False, default=False)
    audit_logging_enabled = Column(Boolean, nullable=False, default=True)
    content_scanning_enabled = Column(Boolean, nullable=False, default=True)

    # Rate limiting
    message_rate_limit = Column(Integer, nullable=False, default=100)  # per minute
    file_upload_limit_mb = Column(Integer, nullable=False, default=100)

    # Features
    reactions_enabled = Column(Boolean, nullable=False, default=True)
    threads_enabled = Column(Boolean, nullable=False, default=True)
    file_sharing_enabled = Column(Boolean, nullable=False, default=True)
    agent_integration_enabled = Column(Boolean, nullable=False, default=True)

    # Compliance
    data_residency = Column(String(100), nullable=True)
    compliance_mode = Column(String(50), nullable=True)  # gdpr, hipaa, sox, etc.
    retention_policy = Column(JSON, nullable=False, default=dict)

    # Custom configuration
    custom_settings = Column(JSON, nullable=False, default=dict)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class MessagingAuditLog(Base):
    """
    Comprehensive audit log for messaging activities.
    """
    __tablename__ = "messaging_audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(String(255), nullable=False, index=True)

    # Event details
    event_type = Column(String(100), nullable=False, index=True)
    event_action = Column(String(100), nullable=False)
    event_description = Column(Text, nullable=True)

    # Actor information
    actor_id = Column(String(255), nullable=False, index=True)
    actor_type = Column(String(50), nullable=False, default='user')  # user, agent, system
    actor_ip = Column(String(45), nullable=True)

    # Target information
    target_type = Column(String(50), nullable=True)  # message, channel, user, etc.
    target_id = Column(String(255), nullable=True, index=True)

    # Event context
    session_id = Column(String(255), nullable=True)
    request_id = Column(String(255), nullable=True)
    user_agent = Column(Text, nullable=True)

    # Event data
    event_data = Column(JSON, nullable=False, default=dict)
    security_context = Column(JSON, nullable=False, default=dict)

    # Compliance and retention
    severity = Column(String(20), nullable=False, default='info')  # info, warning, error, critical
    compliance_tags = Column(ARRAY(String), nullable=False, default=list)
    retention_until = Column(DateTime, nullable=True)

    # Timestamps
    occurred_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    recorded_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_messaging_audit_workspace_event', 'workspace_id', 'event_type', 'occurred_at'),
        Index('ix_messaging_audit_actor_occurred', 'actor_id', 'occurred_at'),
        Index('ix_messaging_audit_target', 'target_type', 'target_id', 'occurred_at'),
        Index('ix_messaging_audit_severity', 'severity', 'occurred_at'),
    )


class WorkspaceMessagingMetrics(Base):
    """
    Performance and usage metrics for workspace messaging.
    """
    __tablename__ = "workspace_messaging_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(String(255), nullable=False, index=True)

    # Time aggregation
    metric_date = Column(DateTime, nullable=False, index=True)
    aggregation_period = Column(String(20), nullable=False, default='daily')  # hourly, daily, weekly, monthly

    # Message metrics
    total_messages = Column(Integer, nullable=False, default=0)
    total_active_users = Column(Integer, nullable=False, default=0)
    total_channels = Column(Integer, nullable=False, default=0)

    # Performance metrics
    average_response_time_ms = Column(Integer, nullable=False, default=0)
    message_delivery_success_rate = Column(Integer, nullable=False, default=100)  # percentage
    peak_concurrent_users = Column(Integer, nullable=False, default=0)

    # Usage patterns
    messages_by_type = Column(JSON, nullable=False, default=dict)
    top_channels = Column(JSON, nullable=False, default=dict)
    user_activity_distribution = Column(JSON, nullable=False, default=dict)

    # Security metrics
    security_events_count = Column(Integer, nullable=False, default=0)
    blocked_messages_count = Column(Integer, nullable=False, default=0)
    encryption_usage_rate = Column(Integer, nullable=False, default=0)  # percentage

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_messaging_metrics_workspace_date', 'workspace_id', 'metric_date'),
        Index('ix_messaging_metrics_period', 'aggregation_period', 'metric_date'),
    )


class MessageFileAttachment(Base):
    """
    File attachments for workspace messages.
    """
    __tablename__ = "message_file_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('workspace_messages.id'), nullable=False, index=True)
    workspace_id = Column(String(255), nullable=False, index=True)

    # File details
    file_name = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(200), nullable=False)

    # Storage details
    storage_path = Column(String(1000), nullable=False)
    storage_provider = Column(String(100), nullable=False, default='local')
    is_encrypted = Column(Boolean, nullable=False, default=False)
    encryption_key_id = Column(String(255), nullable=True)

    # Security
    virus_scan_status = Column(String(50), nullable=False, default='pending')
    virus_scan_result = Column(JSON, nullable=True)
    content_hash = Column(String(128), nullable=False)

    # Access control
    is_public = Column(Boolean, nullable=False, default=False)
    download_count = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime, nullable=True)

    # Timestamps
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index('ix_file_attachments_message_workspace', 'message_id', 'workspace_id'),
        Index('ix_file_attachments_type_size', 'file_type', 'file_size'),
    )