# Registry API Documentation

The Registry API allows developers to dynamically register custom tools and blocks, transforming Sim from a closed system into an extensible platform.

## Overview

The Registry API enables:
- **Dynamic Tool Registration**: Add custom tools without modifying core backend code
- **Block Registration**: Register custom workflow blocks with validation
- **Webhook Integration**: Execute custom tools via secure webhook calls
- **Manifest-based Configuration**: Define tools using JSON schema manifests
- **Community Extensions**: Build and share integrations with the community

## Endpoints

### Tools Registry

#### `POST /api/registry/tools`
Register a new custom tool.

**Request Body:**
```json
{
  "name": "custom_api_tool",
  "displayName": "Custom API Tool",
  "description": "Calls a custom API endpoint with configured parameters",
  "icon": "api-icon",
  "category": "api",
  "version": "1.0.0",
  "manifest": {
    "configSchema": {
      "type": "object",
      "properties": {
        "apiKey": {
          "type": "string",
          "title": "API Key",
          "description": "Your API key for authentication",
          "secret": true
        },
        "endpoint": {
          "type": "string",
          "title": "API Endpoint",
          "description": "The API endpoint URL to call"
        },
        "method": {
          "type": "string",
          "enum": ["GET", "POST", "PUT", "DELETE"],
          "title": "HTTP Method",
          "default": "GET"
        }
      },
      "required": ["apiKey", "endpoint"]
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "data": {
          "type": "object",
          "title": "Request Data",
          "description": "Data to send with the request"
        }
      }
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "response": {
          "type": "object",
          "title": "API Response"
        },
        "status": {
          "type": "number",
          "title": "HTTP Status Code"
        }
      }
    }
  },
  "webhookUrl": "https://your-service.com/webhook/execute",
  "webhookMethod": "POST",
  "authentication": {
    "type": "bearer",
    "tokenValidationUrl": "https://your-service.com/validate-token"
  }
}
```

**Response:**
```json
{
  "id": "tool_abc123",
  "name": "custom_api_tool",
  "status": "registered",
  "createdAt": "2024-01-15T10:30:00Z",
  "webhookUrl": "https://your-service.com/webhook/execute"
}
```

#### `GET /api/registry/tools`
List all registered custom tools for the current user/workspace.

**Query Parameters:**
- `category` (optional): Filter by tool category
- `status` (optional): Filter by status (`active`, `inactive`, `error`)
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page (max 100)

**Response:**
```json
{
  "tools": [
    {
      "id": "tool_abc123",
      "name": "custom_api_tool",
      "displayName": "Custom API Tool",
      "description": "Calls a custom API endpoint",
      "category": "api",
      "status": "active",
      "version": "1.0.0",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastUsed": "2024-01-16T14:20:00Z",
      "usageCount": 25
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

#### `PUT /api/registry/tools/{toolId}`
Update an existing custom tool.

**Request Body:** Same as POST, but all fields are optional.

#### `DELETE /api/registry/tools/{toolId}`
De-register a custom tool.

**Response:**
```json
{
  "id": "tool_abc123",
  "status": "deleted",
  "deletedAt": "2024-01-17T09:15:00Z"
}
```

### Blocks Registry

#### `POST /api/registry/blocks`
Register a new custom block type.

**Request Body:**
```json
{
  "name": "custom_processor",
  "displayName": "Custom Data Processor",
  "description": "Processes data using custom business logic",
  "category": "processing",
  "version": "1.0.0",
  "manifest": {
    "inputPorts": [
      {
        "name": "data",
        "type": "object",
        "required": true,
        "description": "Input data to process"
      }
    ],
    "outputPorts": [
      {
        "name": "processedData",
        "type": "object",
        "description": "Processed output data"
      },
      {
        "name": "metadata",
        "type": "object",
        "description": "Processing metadata"
      }
    ],
    "configSchema": {
      "type": "object",
      "properties": {
        "processingMode": {
          "type": "string",
          "enum": ["fast", "thorough", "custom"],
          "default": "fast"
        },
        "customRules": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "condition": { "type": "string" },
              "action": { "type": "string" }
            }
          }
        }
      }
    }
  },
  "executionUrl": "https://your-service.com/blocks/processor/execute",
  "validationUrl": "https://your-service.com/blocks/processor/validate"
}
```

#### `GET /api/registry/blocks`
List all registered custom blocks.

#### `PUT /api/registry/blocks/{blockId}`
Update an existing custom block.

#### `DELETE /api/registry/blocks/{blockId}`
De-register a custom block.

## Webhook Integration

### Tool Execution Webhook

When a workflow executes a custom tool, Sim sends a POST request to the registered `webhookUrl`:

**Request to your webhook:**
```json
{
  "executionId": "exec_xyz789",
  "toolId": "tool_abc123",
  "workflowId": "workflow_def456",
  "userId": "user_ghi012",
  "inputs": {
    "data": { "key": "value" }
  },
  "config": {
    "apiKey": "[ENCRYPTED]",
    "endpoint": "https://api.example.com/data",
    "method": "POST"
  },
  "timestamp": "2024-01-17T10:30:00Z"
}
```

**Expected webhook response:**
```json
{
  "success": true,
  "outputs": {
    "response": { "result": "processed" },
    "status": 200
  },
  "executionTime": 1250,
  "metadata": {
    "provider": "custom-service",
    "version": "1.0"
  }
}
```

### Block Execution Webhook

For custom blocks, the execution flow is similar but includes port-based data flow:

**Request to your block execution URL:**
```json
{
  "executionId": "exec_xyz789",
  "blockId": "block_abc123",
  "workflowId": "workflow_def456",
  "inputs": {
    "data": { "items": [1, 2, 3, 4, 5] }
  },
  "config": {
    "processingMode": "thorough",
    "customRules": [
      {
        "condition": "value > 3",
        "action": "multiply_by_2"
      }
    ]
  },
  "context": {
    "executionContext": "workflow",
    "stepNumber": 3
  }
}
```

## Security & Validation

### Authentication
- **Token Validation**: Custom tools must provide a token validation endpoint
- **Request Signing**: All webhook requests are signed with HMAC-SHA256
- **Rate Limiting**: Registry endpoints are rate-limited to prevent abuse

### Schema Validation
- **JSON Schema**: All manifests are validated against JSON Schema
- **Input/Output Validation**: Runtime validation of data flowing through custom components
- **Sandboxing**: Custom tools run in isolated environments

### Error Handling
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Tool manifest validation failed",
    "details": {
      "field": "configSchema.properties.apiKey",
      "issue": "Missing required 'type' property"
    }
  }
}
```

## Examples

See [examples/registry/](../examples/registry/) for:
- Complete tool registration examples
- Webhook implementation samples
- SDK integration code
- Common patterns and best practices

## Limits

- **Tools per user**: 50 custom tools
- **Blocks per user**: 20 custom blocks  
- **Webhook timeout**: 30 seconds
- **Manifest size**: 100KB maximum
- **Schema complexity**: Maximum 10 nested levels