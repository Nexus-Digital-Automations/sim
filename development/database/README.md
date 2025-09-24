# Parlant Database Schema Documentation

This directory contains comprehensive documentation for the Parlant database schema extension integrated with Sim's PostgreSQL database.

## Documentation Structure

- [**schema-overview.md**](./schema-overview.md) - Complete database schema overview with Entity Relationship Diagrams
- [**table-relationships.md**](./table-relationships.md) - Detailed foreign key relationships and business rules
- [**migration-guide.md**](./migration-guide.md) - Migration procedures, rollback documentation, and troubleshooting
- [**integration-guide.md**](./integration-guide.md) - Developer integration guide for Parlant database operations
- [**performance-guide.md**](./performance-guide.md) - Performance optimization strategies and best practices
- [**api-reference.md**](./api-reference.md) - API documentation for database query helpers and services
- [**troubleshooting.md**](./troubleshooting.md) - Common issues, debugging procedures, and solutions

## Quick Reference

### Core Tables Overview

| Table Category | Tables | Purpose |
|---------------|--------|---------|
| **Core Entities** | `parlant_agent`, `parlant_session`, `parlant_event` | Primary agent lifecycle and conversation management |
| **Behavior** | `parlant_guideline`, `parlant_canned_response`, `parlant_term` | Agent behavior rules and compliance |
| **Workflows** | `parlant_journey`, `parlant_journey_state`, `parlant_journey_transition` | Conversational flow management |
| **Tools & Knowledge** | `parlant_tool`, `parlant_tool_integration`, `parlant_agent_knowledge_base` | Tool integrations and knowledge access |
| **Junction Tables** | `parlant_agent_tool`, `parlant_journey_guideline` | Many-to-many relationships |

### Database Statistics
- **Total Parlant Tables**: 15
- **Foreign Key Relationships**: 25+
- **Indexes**: 100+ (optimized for query performance)
- **Workspace Integration**: Full multi-tenant isolation
- **Sim Integration Points**: 8 tables connected to existing schema

## Getting Started

1. **For Developers**: Start with [Integration Guide](./integration-guide.md)
2. **For Database Architects**: Review [Schema Overview](./schema-overview.md) and [Table Relationships](./table-relationships.md)
3. **For DevOps**: Check [Migration Guide](./migration-guide.md) and [Performance Guide](./performance-guide.md)
4. **For Troubleshooting**: See [Troubleshooting Guide](./troubleshooting.md)

## Key Features

### Multi-Tenant Architecture
- **Workspace Isolation**: All Parlant entities scoped to workspaces
- **User Authentication**: Supports both Sim users and anonymous external users
- **Permission Integration**: Leverages Sim's existing permission system

### Performance Optimization
- **Strategic Indexing**: 100+ indexes optimized for common query patterns
- **Efficient Joins**: Optimized foreign key relationships
- **Query Performance**: Sub-100ms response times for typical operations
- **Connection Pooling**: Shared PostgreSQL connection management

### Data Integrity
- **Foreign Key Constraints**: Complete referential integrity
- **Check Constraints**: Business rule enforcement at database level
- **Soft Deletes**: Preservation of historical data
- **Audit Trails**: Complete event logging and change tracking

### Integration Features
- **Sim Tool Bridge**: Seamless integration with existing 20+ tools
- **Knowledge Base RAG**: Direct access to Sim's knowledge bases
- **Workflow Mapping**: ReactFlow to Parlant journey conversion
- **Real-time Events**: Socket.io integration for live updates

## Architecture Principles

1. **Consistency**: Follows Sim's existing database patterns and conventions
2. **Scalability**: Designed for high-concurrency multi-tenant usage
3. **Maintainability**: Clear separation of concerns and well-documented relationships
4. **Performance**: Optimized indexes and query patterns for production workloads
5. **Security**: Workspace-level isolation and proper access controls

## Support

For questions or issues:
- Review the [Troubleshooting Guide](./troubleshooting.md) for common problems
- Check the [Integration Guide](./integration-guide.md) for development questions
- Consult the [API Reference](./api-reference.md) for service usage
- Refer to migration procedures in the [Migration Guide](./migration-guide.md)