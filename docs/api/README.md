# API Documentation

Complete API reference and integration guide for the Sim workflow automation platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication) 
- [Core API](#core-api)
- [Specialized APIs](#specialized-apis)
- [SDKs and Libraries](#sdks-and-libraries)
- [Examples](#examples)
- [Rate Limits](#rate-limits)
- [Error Handling](#error-handling)

## 🎯 Overview

The Sim platform provides comprehensive REST and GraphQL APIs for:

- **Workflow Management**: Create, update, execute, and monitor workflows
- **Block Registry**: Register custom automation blocks and tools
- **Template System**: Access and manage workflow templates
- **User Management**: Handle authentication and authorization
- **Analytics**: Track workflow performance and usage metrics

### API Base URLs

- **Development**: `http://localhost:3000/api`
- **Production**: `https://api.sim.dev`
- **Staging**: `https://staging-api.sim.dev`

## 🔐 Authentication

All API endpoints require authentication. Sim supports multiple authentication methods:

### Bearer Token Authentication
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.sim.dev/workflows
```

### API Key Authentication
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://api.sim.dev/workflows
```

### Session-based Authentication
For web applications using session cookies.

**Authentication Endpoints:**
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout  
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Token refresh
- `GET /auth/me` - Current user info

## ⚡ Core API

### Workflows API
Primary endpoints for workflow operations:

- `GET /workflows` - List workflows
- `POST /workflows` - Create workflow
- `GET /workflows/:id` - Get workflow details
- `PUT /workflows/:id` - Update workflow
- `DELETE /workflows/:id` - Delete workflow
- `POST /workflows/:id/execute` - Execute workflow
- `GET /workflows/:id/executions` - Get execution history

### Blocks API
Manage automation blocks:

- `GET /blocks` - List available blocks
- `GET /blocks/:type` - Get block definition
- `POST /blocks/validate` - Validate block configuration
- `POST /blocks/test` - Test block execution

### Templates API
Template library management:

- `GET /templates` - Browse templates
- `GET /templates/:id` - Get template details
- `POST /templates/:id/install` - Install template
- `POST /templates` - Create template
- `PUT /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template

## 🛠️ Specialized APIs

### [Registry API](./registry-api/)
Dynamic tool and block registration system for extending platform capabilities.

**Key Features:**
- Runtime block registration
- Custom tool integration
- Version management
- Validation and testing

### [Versioning API](./versioning-api/)
Workflow versioning and history management for collaboration and rollback.

**Key Features:**
- Workflow version control
- Change tracking
- Rollback capabilities
- Branching and merging

### [Testing API](./testing-api/)
Comprehensive testing and debugging capabilities for workflow validation.

**Key Features:**
- Dry-run execution
- Step-by-step debugging
- Performance profiling
- Error simulation

## 📚 SDKs and Libraries

### Official SDKs

**JavaScript/TypeScript SDK**
```bash
npm install @sim/sdk
```

**Python SDK**
```bash
pip install sim-python-sdk
```

**Go SDK**
```bash
go get github.com/sim/go-sdk
```

### SDK Features
- Full API coverage
- Type safety (TypeScript/Go)
- Async/await support
- Error handling and retries
- Request/response logging
- Authentication management

## 💡 Examples

### Quick Start Example
```javascript
import { SimClient } from '@sim/sdk';

const client = new SimClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.sim.dev'
});

// Create and execute a simple workflow
const workflow = await client.workflows.create({
  name: 'My First Workflow',
  blocks: [
    { type: 'starter', id: 'start' },
    { type: 'response', id: 'end', config: { message: 'Hello World!' } }
  ],
  connections: [{ from: 'start', to: 'end' }]
});

const execution = await client.workflows.execute(workflow.id);
console.log('Execution result:', execution);
```

### Advanced Integration Example
```python
from sim_sdk import SimClient
import asyncio

async def main():
    client = SimClient(api_key='your-api-key')
    
    # Create a complex data processing workflow
    workflow = await client.workflows.create({
        'name': 'Data Processing Pipeline',
        'blocks': [
            {'type': 'starter', 'id': 'start'},
            {'type': 'api', 'id': 'fetch_data', 'config': {
                'url': 'https://api.example.com/data',
                'method': 'GET'
            }},
            {'type': 'javascript', 'id': 'transform', 'config': {
                'code': 'return data.map(item => ({ ...item, processed: true }))'
            }},
            {'type': 'webhook', 'id': 'send_result', 'config': {
                'url': 'https://webhook.site/your-endpoint',
                'method': 'POST'
            }}
        ],
        'connections': [
            {'from': 'start', 'to': 'fetch_data'},
            {'from': 'fetch_data', 'to': 'transform'},
            {'from': 'transform', 'to': 'send_result'}
        ]
    })
    
    execution = await client.workflows.execute(workflow['id'])
    print(f"Workflow executed: {execution['id']}")

asyncio.run(main())
```

## 🚦 Rate Limits

Rate limits protect the platform and ensure fair usage:

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|--------|
| Authentication | 10 requests | 1 minute |
| Workflows (Read) | 100 requests | 1 minute |
| Workflows (Write) | 20 requests | 1 minute |
| Executions | 10 concurrent | N/A |
| Registry | 20 requests | 1 minute |
| Templates | 50 requests | 1 minute |

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 60
```

### Handling Rate Limits
```javascript
try {
  const response = await client.workflows.list();
} catch (error) {
  if (error.status === 429) {
    const retryAfter = error.headers['retry-after'];
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    // Implement exponential backoff
  }
}
```

## ❌ Error Handling

### Standard Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Workflow validation failed",
    "details": [
      {
        "field": "blocks[0].config.url",
        "message": "URL is required"
      }
    ],
    "request_id": "req_1234567890",
    "timestamp": "2025-09-04T12:00:00Z"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid authentication |
| `AUTHORIZATION_FAILED` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `EXECUTION_FAILED` | 422 | Workflow execution error |
| `INTERNAL_ERROR` | 500 | Server-side error |

### Error Handling Best Practices
```javascript
import { SimError } from '@sim/sdk';

try {
  const result = await client.workflows.execute(workflowId);
} catch (error) {
  if (error instanceof SimError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        console.log('Fix validation errors:', error.details);
        break;
      case 'RATE_LIMIT_EXCEEDED':
        await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
        // Retry the request
        break;
      default:
        console.error('Unexpected error:', error.message);
    }
  }
}
```

## 📖 Additional Resources

- **[OpenAPI Specification](./openapi.yaml)**: Complete API specification
- **[Postman Collection](./postman-collection.json)**: Ready-to-use API collection
- **[GraphQL Schema](./graphql-schema.graphql)**: GraphQL type definitions
- **[Webhook Documentation](./webhooks.md)**: Webhook setup and handling
- **[Migration Guides](./migrations/)**: Version upgrade guides

## 🆘 Support

- **API Issues**: [Report API bugs](https://github.com/your-org/sim/issues/new?template=api-bug)
- **Feature Requests**: [Suggest API improvements](https://github.com/your-org/sim/issues/new?template=api-feature)
- **Community**: [Join our developer community](https://community.sim.dev)
- **Documentation**: [Contribute to API docs](../development/contributing-docs.md)

---

**Last Updated**: 2025-09-04 | **API Version**: v1.0 | **Status**: Stable