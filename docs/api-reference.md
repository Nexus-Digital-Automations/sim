# Sim Platform API Reference

**Version**: 2.0.0  
**Generated**: 2025-09-04  
**Total Endpoints**: 180+  
**Categories**: 15

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Workflow APIs](#workflow-apis)
3. [AI Copilot APIs](#ai-copilot-apis)
4. [Knowledge Base APIs](#knowledge-base-apis)
5. [File Management APIs](#file-management-apis)
6. [Template Library APIs](#template-library-apis)
7. [Community & Marketplace APIs](#community--marketplace-apis)
8. [User Management APIs](#user-management-apis)
9. [Execution & Monitoring APIs](#execution--monitoring-apis)
10. [Integration APIs](#integration-apis)
11. [Registry & Extension APIs](#registry--extension-apis)
12. [Webhook APIs](#webhook-apis)
13. [Analytics & Reporting APIs](#analytics--reporting-apis)
14. [Admin & System APIs](#admin--system-apis)
15. [Common Patterns](#common-patterns)

---

## Authentication & Authorization

### Base Path: `/api/auth`

The Sim platform uses multiple authentication methods to support different use cases:

#### Authentication Methods

| Method | Description | Usage |
|--------|-------------|-------|
| `session` | Better Auth session cookies | Web UI authentication |
| `api_key` | X-API-Key header | Programmatic access |
| `webhook` | Signature-based verification | Webhook endpoints |
| `internal` | JWT tokens | Service-to-service |

#### Core Authentication Endpoints

##### All Auth Operations
```http
GET|POST|PUT|DELETE /api/auth/[...all]
```
**Description**: Better Auth integration handling all authentication operations  
**Authentication**: None (public auth endpoints)  
**Features**: OAuth providers, session management, user registration

##### Password Reset Flow
```http
POST /api/auth/forget-password
```
**Authentication**: None  
**Request Schema**:
```json
{
  "email": "string (required)"
}
```

```http
POST /api/auth/reset-password
```
**Authentication**: Token-based  
**Request Schema**:
```json
{
  "token": "string (required)",
  "password": "string (required, min 8 chars)"
}
```

#### OAuth Management

##### List OAuth Connections
```http
GET /api/auth/oauth/connections
```
**Authentication**: Session  
**Response**: Array of connected OAuth providers with connection status

##### Manage OAuth Credentials
```http
GET|POST|DELETE /api/auth/oauth/credentials
```
**Authentication**: Session  
**Description**: Create, read, and revoke OAuth credentials for third-party integrations

##### OAuth Token Operations
```http
GET|POST /api/auth/oauth/token
```
**Authentication**: API Key or Session  
**Request Schema** (POST):
```json
{
  "credentialId": "string (required)",
  "workflowId": "string (optional)"
}
```
**Response**:
```json
{
  "accessToken": "string",
  "expiresAt": "string (ISO date)"
}
```

##### WebSocket Authentication
```http
POST /api/auth/socket-token
```
**Authentication**: Session  
**Description**: Generate JWT token for WebSocket authentication  
**Response**:
```json
{
  "token": "string",
  "expiresAt": "string"
}
```

---

## Workflow APIs

### Base Path: `/api/workflows`

Core workflow management system supporting CRUD operations, execution, collaboration, and version control.

#### List Workflows
```http
GET /api/workflows
```
**Authentication**: Session | API Key  
**Query Parameters**:
- `page`: number (default: 1, pagination)
- `limit`: number (default: 20, max: 100)
- `workspaceId`: string (filter by workspace)
- `folderId`: string | null (filter by folder)
- `search`: string (text search in name/description)
- `tags`: string (comma-separated tags)
- `status`: enum: `deployed|draft|all` (default: all)
- `sortBy`: enum: `name|createdAt|updatedAt|runCount` (default: updatedAt)
- `sortOrder`: enum: `asc|desc` (default: desc)
- `hasTemplates`: boolean (workflows with templates)
- `isPublished`: boolean (published workflows)
- `collaboratorId`: string (workflows with specific collaborator)
- `createdAfter`: string (ISO date)
- `createdBefore`: string (ISO date)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "status": "deployed|draft",
      "createdAt": "string",
      "updatedAt": "string",
      "runCount": "number",
      "color": "string",
      "workspaceId": "string",
      "folderId": "string|null",
      "tags": ["string"]
    }
  ],
  "pagination": {
    "page": "number",
    "totalPages": "number",
    "totalItems": "number",
    "hasNext": "boolean"
  }
}
```

#### Create Workflow
```http
POST /api/workflows
```
**Authentication**: Session | API Key  
**Request Schema**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "color": "string (optional, default: #3972F6)",
  "workspaceId": "string (optional)",
  "folderId": "string|null (optional)",
  "templateId": "string (optional, create from template)",
  "cloneFromId": "string (optional, clone existing)",
  "yaml": "string (optional, create from YAML)",
  "tags": ["string"] 
}
```

#### Individual Workflow Operations
```http
GET|PUT|DELETE /api/workflows/{id}
```
**Authentication**: Session | API Key  
**Path Parameters**: `id` - Workflow UUID

#### Execute Workflow
```http
POST /api/workflows/{id}/execute
```
**Authentication**: Session | API Key  
**Request Schema**:
```json
{
  "input": "any (workflow input data)",
  "variables": "object (execution variables)",
  "metadata": {
    "source": "string (optional)",
    "requestId": "string (optional)"
  }
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "executionId": "string",
    "status": "running|completed|failed",
    "startedAt": "string",
    "output": "any (when completed)",
    "logs": ["object"]
  }
}
```
**Rate Limiting**: Per-user based on plan  
**Usage Tracking**: Enabled for billing

#### Deploy Workflow
```http
POST /api/workflows/{id}/deploy
```
**Authentication**: Session  
**Features**: State snapshot, rollback capability  
**Description**: Deploy workflow to production environment with atomic deployment

#### Real-time Collaboration
```http
GET|POST /api/workflows/{id}/collaborate
```
**Authentication**: Session  
**Features**: Operational transforms, presence awareness  
**WebSocket**: Real-time collaborative editing support

#### Version Management
```http
GET /api/workflows/{id}/versions
```
**Authentication**: Session | API Key  
**Features**: Change tracking, diff comparison  
**Response**: Array of workflow versions with metadata

```http
GET /api/workflows/{id}/versions/{versionId}
```
**Authentication**: Session | API Key  
**Description**: Get specific version details

```http
POST /api/workflows/{id}/versions/{versionId}/revert
```
**Authentication**: Session  
**Description**: Revert workflow to specific version

#### Export Workflow
```http
GET /api/workflows/{id}/export
```
**Authentication**: Session | API Key  
**Query Parameters**:
- `format`: enum: `json|yaml` (default: json)

#### Dry Run Testing
```http
POST /api/workflows/{id}/dry-run
```
**Authentication**: Session | API Key  
**Request Schema**:
```json
{
  "input": "any (test input data)",
  "variables": "object (optional)"
}
```
**Description**: Test workflow execution without side effects

#### Environment Variables
```http
GET|PUT /api/workflows/{id}/variables
```
**Authentication**: Session | API Key  
**Description**: Manage workflow-specific environment variables

#### Workflow Statistics
```http
GET /api/workflows/{id}/stats
```
**Authentication**: Session | API Key  
**Response**: Execution statistics, performance metrics, error rates

---

## AI Copilot APIs

### Base Path: `/api/copilot`

AI-powered assistant and chat interface with streaming support and file attachments.

#### Chat Interface
```http
POST /api/copilot/chat
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "message": "string (required)",
  "workflowId": "string (required)",
  "chatId": "string (optional)",
  "userMessageId": "string (optional)",
  "mode": "enum: ask|agent (default: agent)",
  "depth": "number (0-3, default: 0)",
  "stream": "boolean (default: true)",
  "createNewChat": "boolean (default: false)",
  "fileAttachments": [
    {
      "id": "string",
      "key": "string", 
      "filename": "string",
      "media_type": "string",
      "size": "number"
    }
  ],
  "provider": "string (default: openai)",
  "contexts": [
    {
      "kind": "enum: past_chat|workflow|blocks|logs|knowledge|templates",
      "label": "string",
      "chatId": "string (optional)",
      "workflowId": "string (optional)",
      "knowledgeId": "string (optional)",
      "blockId": "string (optional)",
      "templateId": "string (optional)"
    }
  ]
}
```
**Features**: Streaming response, file attachments, context processing  
**Response**: Server-sent events stream or JSON response

#### List Chat Conversations
```http
GET /api/copilot/chats
```
**Authentication**: Session  
**Query Parameters**:
- `workflowId`: string (required)
- `page`: number
- `limit`: number

#### Tool Execution Management
```http
POST /api/copilot/tools/mark-complete
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "toolCallId": "string (required)",
  "status": "enum: completed|rejected"
}
```

#### Conversation Checkpoints
```http
GET|POST /api/copilot/checkpoints
```
**Authentication**: Session  
**Description**: Save and restore conversation states

#### User Feedback
```http
POST /api/copilot/feedback
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "messageId": "string (required)",
  "rating": "number (1-5)",
  "feedback": "string (optional)",
  "category": "string (optional)"
}
```

#### API Key Management
```http
GET|POST /api/copilot/api-keys
```
**Authentication**: Session  
**Description**: Manage API keys for external copilot access

---

## Knowledge Base APIs

### Base Path: `/api/knowledge`

Vector search-enabled knowledge base with RAG capabilities and structured metadata.

#### Knowledge Base CRUD
```http
GET|POST /api/knowledge
```
**Authentication**: Session | API Key  
**POST Request Schema**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "visibility": "enum: private|shared|public (default: private)",
  "settings": {
    "chunkSize": "number (optional)",
    "chunkOverlap": "number (optional)",
    "embeddingModel": "string (optional)"
  }
}
```

```http
GET|PUT|DELETE /api/knowledge/{id}
```
**Authentication**: Session | API Key

#### Document Management
```http
GET|POST /api/knowledge/{id}/documents
```
**Authentication**: Session | API Key  
**Features**: Batch operations, content processing  
**POST Request Schema**:
```json
{
  "title": "string (required)",
  "content": "string (required)",
  "metadata": "object (optional)",
  "tags": ["string"],
  "source": "string (optional)"
}
```

```http
GET|PUT|DELETE /api/knowledge/{id}/documents/{documentId}
```
**Authentication**: Session | API Key

#### Document Chunks
```http
GET|POST /api/knowledge/{id}/documents/{documentId}/chunks
```
**Authentication**: Session | API Key

```http
GET /api/knowledge/{id}/documents/{documentId}/chunks/{chunkId}
```
**Authentication**: Session | API Key

#### Tag Definitions (Structured Metadata)
```http
GET|POST /api/knowledge/{id}/tag-definitions
```
**Authentication**: Session | API Key  
**Description**: Manage structured metadata schemas for documents

```http
GET|PUT|DELETE /api/knowledge/{id}/tag-definitions/{tagId}
```
**Authentication**: Session | API Key

#### Vector Search with RAG
```http
POST /api/knowledge/search
```
**Authentication**: Session | API Key  
**Request Schema**:
```json
{
  "knowledgeBaseIds": "string|array (required)",
  "query": "string (optional)",
  "topK": "number (default: 10, max: 100)",
  "minRelevanceScore": "number (0-1, optional)",
  "filters": {
    "tags": ["string"],
    "metadata": "object",
    "dateRange": {
      "start": "string (ISO date)",
      "end": "string (ISO date)"
    }
  },
  "includeMetadata": "boolean (default: false)",
  "includeContent": "boolean (default: true)"
}
```
**Features**: Semantic search, tag filtering, relevance scoring  
**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "string",
        "documentId": "string",
        "chunkId": "string",
        "content": "string",
        "relevanceScore": "number",
        "metadata": "object",
        "tags": ["string"]
      }
    ],
    "totalResults": "number",
    "searchId": "string"
  }
}
```

---

## File Management APIs

### Base Path: `/api/files`

Comprehensive file management with multi-format support, virus scanning, and CDN integration.

#### File Upload
```http
POST /api/files/upload
```
**Authentication**: Session  
**Content-Type**: multipart/form-data  
**Supported Types**: PDF, DOC, DOCX, TXT, MD, PNG, JPG, JPEG, CSV, XLSX  
**Max Size**: 50MB per file  
**Features**: Virus scanning, content extraction, metadata generation

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "filename": "string",
      "size": "number",
      "contentType": "string",
      "key": "string",
      "url": "string",
      "metadata": "object"
    }
  ]
}
```

#### File Download
```http
GET /api/files/download
```
**Authentication**: Session | API Key  
**Query Parameters**:
- `fileId`: string (required)
- `inline`: boolean (optional, display inline vs download)

**Features**: Secure download with signed URLs, access control

#### Presigned URLs
```http
POST /api/files/presigned
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "files": [
    {
      "filename": "string",
      "contentType": "string",
      "size": "number"
    }
  ]
}
```
**Features**: Client-side upload, S3-compatible  
**Response**: Presigned upload URLs with expiration

#### Content Parsing
```http
POST /api/files/parse
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "fileId": "string (required)",
  "extractText": "boolean (default: true)",
  "extractMetadata": "boolean (default: true)",
  "language": "string (optional)"
}
```
**Supported Formats**: PDF, DOCX, XLSX, CSV, TXT, MD  
**Response**: Extracted text content and metadata

#### Static File Serving
```http
GET /api/files/serve/{...path}
```
**Authentication**: Session | Public (based on file permissions)  
**Features**: Caching, compression, CDN support

---

## Template Library APIs

### Base Path: `/api/templates`

Enterprise-grade template system with hierarchical categorization, community features, and ML-powered recommendations.

#### Template Discovery (v2)
```http
GET /api/templates/v2
```
**Authentication**: Session | API Key  
**Query Parameters**:
- `page`: number (pagination)
- `limit`: number (max 100)
- `search`: string (full-text search)
- `categoryId|categorySlug`: string (category filter)
- `tagIds|tagSlugs`: string (comma-separated)
- `status`: enum: `draft|pending_review|approved|rejected|archived`
- `visibility`: enum: `private|unlisted|public`
- `difficultyLevel`: enum: `beginner|intermediate|advanced|expert`
- `isFeatured`: boolean
- `isCommunityTemplate`: boolean
- `minRating`: number (0-5)
- `maxRating`: number (0-5)
- `minDownloads`: number
- `requiredIntegrations`: string (comma-separated)
- `favorited`: boolean (user's favorites)
- `myTemplates`: boolean (user's templates)

#### Individual Template
```http
GET /api/templates/v2/{templateId}
```
**Authentication**: Session | API Key  
**Response**: Complete template with metadata, ratings, usage analytics

#### Template Favorites
```http
POST|DELETE /api/templates/v2/{templateId}/favorite
```
**Authentication**: Session  
**Description**: Add/remove template from user favorites

#### Template Ratings & Reviews
```http
GET|POST /api/templates/v2/{templateId}/ratings
```
**Authentication**: Session | API Key  
**POST Request Schema**:
```json
{
  "rating": "number (1-5, required)",
  "review": "string (optional)",
  "category": "string (optional)",
  "recommendToOthers": "boolean (optional)"
}
```

```http
POST /api/templates/v2/{templateId}/ratings/{ratingId}/vote
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "voteType": "enum: helpful|not_helpful"
}
```

#### Template Categories
```http
GET /api/templates/v2/categories
```
**Authentication**: None  
**Response**: Hierarchical category structure with metadata

#### Template Tags
```http
GET /api/templates/v2/tags
```
**Authentication**: None  
**Response**: Available tags with usage counts

#### Template Collections
```http
GET /api/templates/v2/collections
```
**Authentication**: Session | API Key  
**Description**: Curated template collections

```http
GET /api/templates/v2/collections/{collectionId}
```
**Authentication**: Session | API Key  
**Response**: Collection details with template list

#### Template Submission
```http
POST /api/templates/v2/submission
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "name": "string (required)",
  "description": "string (required)",
  "category": "string (required)",
  "difficulty": "enum: beginner|intermediate|advanced|expert",
  "workflowData": "object (required)",
  "tags": ["string"],
  "businessValue": {
    "timeSavings": "string",
    "costSavings": "string",
    "description": "string"
  },
  "requiredIntegrations": ["string"],
  "documentation": "string"
}
```

#### Template Analytics
```http
GET /api/templates/v2/analytics
```
**Authentication**: Session  
**Query Parameters**:
- `templateId`: string (optional, specific template)
- `timeRange`: string (optional, date range)
- `metrics`: string (comma-separated metric types)

---

## Community & Marketplace APIs

### Base Path: `/api/community`

Social features, marketplace, and community-driven content discovery.

#### Marketplace Templates
```http
GET /api/community/marketplace/templates
```
**Authentication**: None (public)  
**Query Parameters**:
- `query`: string (search term)
- `category`: string
- `tags`: string (comma-separated)
- `difficulty`: string
- `minRating`: number
- `minDownloads`: number
- `author`: string (author ID)
- `sortBy`: enum: `relevance|rating|downloads|recent`
- `sortOrder`: enum: `asc|desc`
- `page`: number
- `limit`: number
- `includeMetadata`: boolean
- `starred`: boolean (requires authentication)

#### Marketplace Analytics
```http
GET /api/community/marketplace/analytics
```
**Authentication**: Session  
**Response**: Marketplace performance metrics, trending templates

#### Social Feed
```http
GET /api/community/social/feed
```
**Authentication**: Session  
**Query Parameters**:
- `type`: enum: `following|trending|recent|featured`
- `page`: number
- `limit`: number

#### Follow System
```http
POST|DELETE /api/community/social/follow
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "userId": "string (required)",
  "type": "enum: user|workspace|collection"
}
```

#### User Profiles
```http
GET /api/community/social/profiles/{userId}
```
**Authentication**: Session | None  
**Response**: Public profile with templates, collections, activity

#### User Reputation
```http
GET /api/community/users/{userId}/reputation
```
**Authentication**: Session  
**Response**: Reputation score, badges, contribution history

---

## User Management APIs

### Base Path: `/api/users`

User profile management, preferences, and account settings.

#### User Profile
```http
GET|PUT /api/users/me/profile
```
**Authentication**: Session  
**PUT Request Schema**:
```json
{
  "name": "string",
  "bio": "string",
  "avatar": "string (URL)",
  "website": "string",
  "location": "string",
  "preferences": {
    "theme": "enum: light|dark|system",
    "language": "string",
    "notifications": "object"
  }
}
```

#### User Settings
```http
GET|PUT /api/users/me/settings
```
**Authentication**: Session  
**Description**: User preferences, notification settings, privacy controls

#### API Key Management
```http
GET|POST|DELETE /api/users/me/api-keys
```
**Authentication**: Session  
**POST Request Schema**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "permissions": ["string"],
  "expiresAt": "string (ISO date, optional)"
}
```

#### Subscription Management
```http
GET /api/users/me/subscription/{id}/transfer
```
**Authentication**: Session  
**Description**: Transfer subscription between organizations

---

## Execution & Monitoring APIs

### Base Path: `/api/logs` & `/api/monitoring`

Comprehensive logging, monitoring, and analytics for workflow execution.

#### Execution Logs
```http
GET /api/logs
```
**Authentication**: Session | API Key  
**Query Parameters**:
- `workflowId`: string (optional)
- `executionId`: string (optional)  
- `level`: enum: `debug|info|warn|error`
- `limit`: number (max 1000)
- `startDate`: string (ISO date)
- `endDate`: string (ISO date)

```http
GET /api/logs/by-id/{id}
```
**Authentication**: Session | API Key  
**Description**: Get specific log entry details

```http
GET /api/logs/{executionId}/frozen-canvas
```
**Authentication**: Session | API Key  
**Description**: Get execution state snapshot for debugging

#### Live Execution Monitoring
```http
GET /api/monitoring/live-executions
```
**Authentication**: Session  
**Response**: Real-time execution status across workspace

#### Analytics Dashboard
```http
GET /api/monitoring/analytics
```
**Authentication**: Session  
**Query Parameters**:
- `type`: enum: `workflow|business` (required)
- `workflowId`: string (for workflow analytics)
- `workspaceId`: string (for business analytics)
- `startDate`: string (ISO date)
- `endDate`: string (ISO date)
- `granularity`: enum: `minute|hour|day|week|month`
- `includeCostMetrics`: boolean
- `includePerformanceMetrics`: boolean
- `includeErrorAnalysis`: boolean

**Response** (Workflow Analytics):
```json
{
  "success": true,
  "data": {
    "workflowId": "string",
    "workflowName": "string",
    "timeRange": "object",
    "executionMetrics": {
      "totalExecutions": "number",
      "successRate": "number",
      "avgExecutionTime": "number",
      "errorCount": "number"
    },
    "costMetrics": {
      "totalCost": "number",
      "costPerExecution": "number",
      "trend": "object"
    },
    "performanceMetrics": {
      "p50ExecutionTime": "number",
      "p95ExecutionTime": "number",
      "p99ExecutionTime": "number"
    },
    "errorAnalysis": {
      "errorsByType": "object",
      "errorsByBlock": "object",
      "recentErrors": ["object"]
    }
  }
}
```

#### Performance Metrics
```http
GET /api/monitoring/performance-metrics
```
**Authentication**: Session  
**Query Parameters**:
- `workflowId`: string
- `timeRange`: string
- `metrics`: string (comma-separated)

#### Alert Rules
```http
GET|POST /api/monitoring/alerts/rules
```
**Authentication**: Session  
**POST Request Schema**:
```json
{
  "name": "string (required)",
  "condition": {
    "metric": "string",
    "operator": "enum: gt|lt|eq|gte|lte",
    "threshold": "number"
  },
  "actions": [
    {
      "type": "enum: email|slack|webhook",
      "config": "object"
    }
  ],
  "enabled": "boolean"
}
```

---

## Integration APIs

### Base Path: `/api/tools`

Third-party service integrations organized by category with consistent patterns.

#### Integration Categories

##### Communication Tools
- **Slack**: `/api/tools/slack/channels`, `/api/tools/slack/message`
- **Discord**: `/api/tools/discord/channels`, `/api/tools/discord/servers`  
- **Microsoft Teams**: `/api/tools/microsoft-teams/channels`, `/api/tools/microsoft-teams/chats`

##### Productivity Tools
- **Notion**: `/api/tools/notion/pages`, `/api/tools/notion/databases`
- **Jira**: `/api/tools/jira/issues`, `/api/tools/jira/projects`
- **Linear**: `/api/tools/linear/issues`, `/api/tools/linear/teams`

##### Cloud Services
- **Google**: `/api/tools/google_*/*` (Drive, Sheets, Calendar, Docs)
- **Microsoft**: `/api/tools/microsoft_*/*` (OneDrive, Excel, Planner)
- **AWS**: `/api/tools/s3/*`

##### Databases
- **MySQL**: `/api/tools/mysql/query`, `/api/tools/mysql/insert`, `/api/tools/mysql/update`, `/api/tools/mysql/delete`
- **PostgreSQL**: `/api/tools/postgresql/query`, `/api/tools/postgresql/insert`, `/api/tools/postgresql/update`, `/api/tools/postgresql/delete`

#### Common Integration Patterns

##### List Resources
```http
GET /api/tools/{service}/{resource}
```
**Authentication**: Session  
**Example**: `GET /api/tools/slack/channels`

##### Create Resource  
```http
POST /api/tools/{service}/{resource}
```
**Authentication**: Session  
**Example**: `POST /api/tools/jira/issues`

##### Update Resource
```http
PUT /api/tools/{service}/{resource}/{id}
```
**Authentication**: Session  
**Example**: `PUT /api/tools/linear/issues/123`

##### Database Query Example
```http
POST /api/tools/mysql/query
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "credentialId": "string (required)",
  "query": "string (required)",
  "parameters": ["any"] 
}
```

#### OAuth Setup Pattern
```http
GET /api/tools/{service}/oauth
```
**Authentication**: Session  
**Description**: Initiate OAuth flow for service integration

---

## Registry & Extension APIs

### Base Path: `/api/registry`

Dynamic tool registration system allowing developers to extend the platform with custom tools.

#### Register Custom Tool
```http
POST /api/registry/tools
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "name": "string (required, alphanumeric with underscores)",
  "displayName": "string (required)",
  "description": "string (optional)",
  "icon": "string (optional)",
  "category": "string (optional)",
  "version": "string (semver format)",
  "manifest": {
    "configSchema": {
      "type": "object",
      "properties": "object",
      "required": ["string"]
    },
    "inputSchema": {
      "type": "object", 
      "properties": "object"
    },
    "outputSchema": {
      "type": "object",
      "properties": "object"
    }
  },
  "webhookUrl": "string (required, URL)",
  "webhookMethod": "enum: GET|POST|PUT|DELETE (default: POST)",
  "webhookTimeout": "number (1000-300000ms)",
  "webhookRetryCount": "number (0-5)",
  "authentication": {
    "type": "enum: none|bearer|api_key|oauth",
    "tokenValidationUrl": "string (optional)",
    "requirements": "object"
  },
  "tags": ["string"],
  "metadata": "object"
}
```
**Features**: Manifest validation, webhook verification, rate limiting

#### List Registered Tools
```http
GET /api/registry/tools
```
**Authentication**: Session  
**Query Parameters**:
- `category`: string
- `status`: enum: `active|inactive|error|pending_approval`
- `search`: string
- `page`: number
- `limit`: number (max 100)

#### Individual Tool Management
```http
GET|PUT|DELETE /api/registry/tools/{toolId}
```
**Authentication**: Session  
**Description**: Manage individual registered tools

#### Execute Custom Tool
```http
POST /api/registry/execute
```
**Authentication**: Session | API Key  
**Request Schema**:
```json
{
  "toolId": "string (required)",
  "input": "any (tool-specific input data)",
  "config": "object (tool configuration)",
  "timeout": "number (optional)"
}
```
**Features**: Webhook execution, timeout handling, retry logic

#### Validate Webhook
```http
POST /api/registry/webhooks/validate
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "webhookUrl": "string (required)",
  "method": "string (optional)",
  "authentication": "object (optional)"
}
```
**Features**: Security checks, response validation

---

## Webhook APIs

### Base Path: `/api/webhooks`

Webhook management and execution system with signature verification and replay protection.

#### Webhook Registration
```http
GET|POST /api/webhooks
```
**Authentication**: Session | API Key  
**POST Request Schema**:
```json
{
  "name": "string (required)",
  "url": "string (required, webhook endpoint)",
  "events": ["string"] ,
  "secret": "string (optional, for signature verification)",
  "headers": "object (optional, custom headers)",
  "enabled": "boolean (default: true)"
}
```

#### Individual Webhook Management
```http
GET|PUT|DELETE /api/webhooks/{id}
```
**Authentication**: Session | API Key

#### Webhook Trigger Endpoint
```http
POST|GET|PUT|DELETE /api/webhooks/trigger/{path}
```
**Authentication**: Webhook signature verification  
**Features**: Signature verification, replay protection, rate limiting

#### Test Webhook
```http
POST /api/webhooks/test
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "webhookId": "string (required)",
  "testData": "any (optional)"
}
```
**Description**: Send test payload to webhook endpoint

---

## Analytics & Reporting APIs

### Base Path: `/api/monitoring/analytics`

Business intelligence and custom report generation.

#### Generate Custom Reports
```http
POST /api/monitoring/analytics
```
**Authentication**: Session  
**Request Schema**:
```json
{
  "reportType": "enum: workflow_performance|cost_analysis|error_summary|resource_utilization|business_overview|sla_compliance|user_activity|trend_analysis",
  "timeRange": {
    "start": "string (ISO date)",
    "end": "string (ISO date)",
    "granularity": "enum: minute|hour|day|week|month"
  },
  "workspaceId": "string (required)",
  "workflowIds": ["string"],
  "includeCharts": "boolean (default: true)",
  "format": "enum: json|csv|pdf (default: json)",
  "parameters": "object (report-specific parameters)"
}
```

**Response** (JSON format):
```json
{
  "success": true,
  "data": {
    "reportType": "string",
    "generatedAt": "string",
    "timeRange": "object",
    "data": "object (report-specific data)"
  }
}
```

**Response** (CSV/PDF format):
```json
{
  "success": true,  
  "data": {
    "downloadUrl": "string",
    "expires": "string (ISO date)"
  }
}
```

#### Cache Management
```http
PUT /api/monitoring/analytics/cache/invalidate
```
**Authentication**: Session (Admin)  
**Request Schema**:
```json
{
  "workflowId": "string (optional)",
  "workspaceId": "string (optional)",
  "timeRange": "object (optional)"
}
```

---

## Admin & System APIs

### Organization Management
```http
GET|POST /api/organizations
```
**Authentication**: Session  
**Description**: Multi-tenant organization management

```http
GET|POST /api/organizations/{id}/members
```
**Authentication**: Session  
**Features**: Role management, invitation system

### Workspace Management  
```http
GET|POST /api/workspaces
```
**Authentication**: Session

```http
GET /api/workspaces/{id}/permissions
```
**Authentication**: Session  
**Response**: Permission matrix for workspace

### Billing & Usage
```http
GET /api/billing
```
**Authentication**: Session  
**Query Parameters**:
- `context`: enum: `user|organization`
- `id`: string (organization ID, optional)

```http
GET /api/billing/portal
```
**Authentication**: Session  
**Response**: Stripe customer portal URL

```http
GET /api/usage/check
```
**Authentication**: Session | API Key  
**Response**:
```json
{
  "within_limits": "boolean",
  "current_usage": "object",
  "limits": "object", 
  "reset_date": "string"
}
```

### Scheduled Execution
```http
GET|POST /api/schedules
```
**Authentication**: Session | API Key  
**POST Request Schema**:
```json
{
  "workflowId": "string (required)",
  "cronExpression": "string (required)", 
  "timezone": "string (optional)",
  "enabled": "boolean (default: true)"
}
```

### Environment Management
```http
GET /api/environment
```
**Authentication**: Session  
**Response**: Environment configuration and status

```http
GET /api/environment/variables
```
**Authentication**: Session  
**Response**: Available environment variables (filtered for security)

---

## Common Patterns

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": "any",
  "metadata": "object (optional)"
}
```

#### Error Response
```json
{
  "success": false,
  "error": "string (message)",
  "code": "string (optional error code)",
  "details": "any (optional additional info)"
}
```

### Pagination

#### Query Parameters
- `page`: number (1-based, default: 1)
- `limit`: number (varies by endpoint, max: 100)
- `cursor`: string (cursor-based pagination, where applicable)

#### Pagination Response
```json
{
  "data": ["array"],
  "pagination": {
    "page": "number",
    "totalPages": "number",
    "totalItems": "number", 
    "hasNext": "boolean",
    "hasPrev": "boolean"
  }
}
```

### Filtering

#### Common Filter Parameters
- `search`: Full-text search
- `createdAfter`: ISO date string
- `createdBefore`: ISO date string  
- `userId`: Filter by user
- `workspaceId`: Filter by workspace
- `tags`: Comma-separated tag list
- `status`: Entity status filtering

### Rate Limiting

#### Rate Limit Headers
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Window reset time (Unix timestamp)

#### Rate Limits by Authentication Type
- **Authenticated Users**: 1,000 requests/hour
- **API Key Users**: 5,000 requests/hour  
- **Premium Plans**: 10,000 requests/hour
- **Enterprise**: Custom limits

### Security Features

#### Input Validation
- **Schema Validation**: Zod schema validation on all endpoints
- **Sanitization**: XSS prevention and output sanitization
- **Rate Limiting**: Configurable rate limits per user/plan

#### CORS & CSRF
- **CORS**: Configurable CORS policies
- **CSRF**: CSRF token validation for state-changing operations
- **Encryption**: At-rest data encryption for sensitive data

### Error Codes

#### Common HTTP Status Codes
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (resource conflict)
- `422`: Unprocessable Entity (business logic errors)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

#### Custom Error Codes
- `INVALID_PARAMETERS`: Request parameters failed validation
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `QUOTA_EXCEEDED`: Usage quota exceeded
- `WORKFLOW_EXECUTION_FAILED`: Workflow execution error
- `WEBHOOK_DELIVERY_FAILED`: Webhook delivery failure

---

## SDK & Integration Examples

### JavaScript/TypeScript SDK
```typescript
import { SimAPI } from '@sim/sdk'

const sim = new SimAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.sim.io'
})

// Execute workflow
const result = await sim.workflows.execute('workflow-id', {
  input: { message: 'Hello World' }
})

// Search knowledge base
const searchResults = await sim.knowledge.search({
  knowledgeBaseIds: ['kb-1'],
  query: 'customer onboarding',
  topK: 5
})
```

### Python SDK
```python
from sim import SimAPI

sim = SimAPI(api_key='your-api-key')

# List templates
templates = sim.templates.list(
    category='automation',
    min_rating=4.0,
    limit=20
)

# Create workflow from template
workflow = sim.workflows.create_from_template(
    template_id='template-123',
    name='My Custom Workflow'
)
```

### cURL Examples
```bash
# Execute workflow
curl -X POST "https://api.sim.io/api/workflows/123/execute" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"input": {"message": "Hello World"}}'

# Search templates
curl "https://api.sim.io/api/templates/v2?search=customer+service&limit=10" \
  -H "X-API-Key: your-api-key"
```

---

## Changelog & Versioning

### API Versioning Strategy
- **URL Versioning**: Major versions in URL path (`/api/v2/`)
- **Header Versioning**: Minor versions via `API-Version` header
- **Backwards Compatibility**: Maintained for one major version

### Recent Updates

#### v2.0.0 (2025-09-04)
- Complete template system overhaul with marketplace features
- Enhanced community and social features
- Advanced analytics and monitoring capabilities  
- Registry system for custom tool extensions
- Improved authentication with Better Auth integration

#### v1.8.0 (2025-08-15)
- Real-time collaboration features
- Enhanced file management with virus scanning
- Copilot API with streaming support
- Workflow version control and rollback

---

*For additional information, code examples, or support, visit our [Developer Documentation](https://docs.sim.io) or contact our API support team.*