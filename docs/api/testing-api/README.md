# Testing & Debugging API Documentation

The Testing & Debugging API enables safe workflow execution without side effects, providing comprehensive testing, validation, and debugging capabilities.

## Overview

The Testing API enables:
- **Dry-Run Execution**: Execute workflows safely without triggering real actions
- **Mock External Services**: Simulate API calls, databases, and third-party integrations
- **Data Flow Analysis**: Track data flow through each block step-by-step
- **Performance Profiling**: Measure execution times and identify bottlenecks
- **Error Simulation**: Test error handling and recovery scenarios
- **Step-by-Step Debugging**: Pause execution at specific blocks
- **Output Validation**: Verify workflow outputs match expected schemas

## Endpoints

### `POST /api/workflows/{id}/dry-run`
Execute a workflow in safe dry-run mode without triggering real-world side effects.

**Request Body:**
```json
{
  "inputs": {
    "email": "test@example.com",
    "name": "John Doe",
    "amount": 100
  },
  "mockExternalCalls": true,
  "includeOutputs": true,
  "includeDataFlow": true,
  "includeTimingInfo": true,
  "includeErrorDetails": true,
  "stepByStep": false,
  "breakpoints": ["block_validation_123", "block_api_456"],
  "maxExecutionTime": 60000,
  "mockResponses": {
    "block_api_456": {
      "status": 200,
      "data": {
        "id": "mock_id_123",
        "success": true
      }
    },
    "block_db_789": {
      "rows": [
        {
          "id": 1,
          "name": "Mock Data"
        }
      ]
    }
  },
  "validateOutputs": true,
  "strictMode": false
}
```

**Response:**
```json
{
  "executionId": "dryrun_abc123def456",
  "workflowId": "workflow_123",
  "status": "completed",
  "startedAt": "2024-01-16T10:30:00Z",
  "completedAt": "2024-01-16T10:30:05Z", 
  "totalExecutionTime": 5234,
  "blockResults": [
    {
      "blockId": "block_starter_123",
      "blockName": "Start",
      "blockType": "starter",
      "status": "success",
      "inputs": {
        "email": "test@example.com",
        "name": "John Doe"
      },
      "outputs": {
        "email": "test@example.com",
        "name": "John Doe"
      },
      "executionTime": 12,
      "warnings": [],
      "metadata": {
        "isMocked": false,
        "hasMockResponse": false,
        "dataFlowFrom": [],
        "dataFlowTo": ["block_validation_456"]
      }
    },
    {
      "blockId": "block_api_456",
      "blockName": "Send Email",
      "blockType": "gmail_send",
      "status": "success",
      "inputs": {
        "to": "test@example.com",
        "subject": "Welcome John Doe",
        "body": "Hello John!"
      },
      "outputs": {
        "messageId": "mock_msg_123",
        "sent": true
      },
      "executionTime": 234,
      "warnings": ["External call mocked to prevent side effects"],
      "metadata": {
        "isMocked": true,
        "hasMockResponse": false,
        "dataFlowFrom": ["block_starter_123"],
        "dataFlowTo": []
      }
    }
  ],
  "executionOrder": [
    "block_starter_123",
    "block_validation_456", 
    "block_api_456"
  ],
  "finalOutputs": {
    "block_api_456": {
      "messageId": "mock_msg_123",
      "sent": true,
      "status": "Email sent successfully"
    }
  },
  "dataFlow": [
    {
      "blockId": "block_starter_123",
      "inputs": {
        "email": "test@example.com",
        "name": "John Doe"
      },
      "outputs": {
        "email": "test@example.com", 
        "name": "John Doe"
      },
      "connections": ["block_validation_456"]
    },
    {
      "blockId": "block_api_456",
      "inputs": {
        "to": "test@example.com",
        "subject": "Welcome John Doe"
      },
      "outputs": {
        "messageId": "mock_msg_123",
        "sent": true
      },
      "connections": []
    }
  ],
  "performance": {
    "totalBlocks": 3,
    "executedBlocks": 3,
    "mockedBlocks": 1,
    "failedBlocks": 0,
    "averageBlockTime": 95.5,
    "slowestBlock": {
      "blockId": "block_api_456",
      "executionTime": 234
    },
    "fastestBlock": {
      "blockId": "block_starter_123", 
      "executionTime": 12
    }
  },
  "validation": {
    "outputValidation": {
      "valid": true,
      "errors": [],
      "warnings": [
        "External call mocked to prevent side effects"
      ]
    },
    "dataTypeValidation": {
      "valid": true,
      "issues": []
    }
  }
}
```

## Request Parameters

### Execution Options
- **`inputs`**: Input data for workflow execution
- **`mockExternalCalls`**: Replace external API calls with mock responses
- **`includeOutputs`**: Include block outputs in response
- **`includeDataFlow`**: Include data flow analysis
- **`includeTimingInfo`**: Include execution timing details
- **`includeErrorDetails`**: Include detailed error information

### Debugging Options
- **`stepByStep`**: Enable step-by-step debugging mode
- **`breakpoints`**: Array of block IDs to pause execution at
- **`maxExecutionTime`**: Maximum execution time in milliseconds

### Mock Configuration
- **`mockResponses`**: Custom mock responses for specific blocks
- **`strictMode`**: Fail on warnings and non-critical errors

### Validation Options
- **`validateOutputs`**: Validate outputs against expected schemas
- **`strictMode`**: Enable strict validation mode

## Response Structure

### Execution Status
- **`completed`**: All blocks executed successfully
- **`failed`**: Execution failed due to errors
- **`partial`**: Some blocks executed, others failed or skipped
- **`timeout`**: Execution exceeded time limit

### Block Execution Results
Each block result includes:
- **Basic Info**: Block ID, name, type, execution status
- **Data**: Input and output data for the block
- **Performance**: Execution time in milliseconds
- **Debugging**: Warnings, errors, and metadata
- **Mocking**: Whether the block was mocked and why

### Performance Metrics
- **Execution Counts**: Total, executed, mocked, and failed blocks
- **Timing Analysis**: Average, fastest, and slowest block execution
- **Bottleneck Identification**: Performance insights and recommendations

## Mock System

### Automatic Mocking
The system automatically mocks common external services:

**Email Services:**
- `gmail_send` → `{ messageId: "mock_msg_123", sent: true }`
- `outlook_send` → `{ messageId: "mock_msg_456", sent: true }`

**API Calls:**
- `api_call` → `{ status: 200, data: { message: "Mock API response" } }`
- `webhook` → `{ status: "delivered", id: "mock_webhook_789" }`

**Databases:**
- `mysql_query` → `{ rows: [{ id: 1, name: "Mock Data" }], affected: 1 }`
- `postgresql_query` → `{ rows: [{ id: 1, name: "Mock Data" }], affected: 1 }`

**File Operations:**
- `s3_upload` → `{ url: "https://mock-s3-url.com/file.txt", success: true }`
- `file_write` → `{ path: "/mock/file/path.txt", bytes: 1024 }`

**Communication:**
- `slack_message` → `{ ts: "1234567890.123456", channel: "mock_channel" }`
- `discord_message` → `{ id: "mock_msg_discord_123" }`
- `twilio_sms` → `{ sid: "mock_sms_sid_456", status: "sent" }`

**AI Services:**
- `openai_chat` → `{ response: "This is a mock AI response", tokens: 50 }`
- `huggingface_inference` → `{ generated_text: "Mock generated text" }`

### Custom Mock Responses
Override automatic mocking by providing custom responses:

```json
{
  "mockResponses": {
    "block_payment_api": {
      "transaction_id": "txn_123456",
      "status": "success",
      "amount": 100.00,
      "currency": "USD"
    },
    "block_user_lookup": {
      "user": {
        "id": "user_789",
        "name": "Test User",
        "email": "test@example.com",
        "verified": true
      }
    }
  }
}
```

## Debugging Features

### Step-by-Step Execution
Enable step-by-step debugging to pause at specific blocks:

```json
{
  "stepByStep": true,
  "breakpoints": [
    "block_validation_123",
    "block_api_call_456",
    "block_final_output"
  ]
}
```

### Data Flow Analysis
Track how data flows through your workflow:

```json
{
  "dataFlow": [
    {
      "blockId": "block_input",
      "inputs": { "email": "user@example.com" },
      "outputs": { "validated_email": "user@example.com" },
      "connections": ["block_send_email", "block_log_activity"]
    }
  ]
}
```

### Performance Profiling
Identify performance bottlenecks:

```json
{
  "performance": {
    "slowestBlock": {
      "blockId": "block_heavy_computation",
      "executionTime": 2456
    },
    "averageBlockTime": 123.4,
    "recommendations": [
      "Consider optimizing block_heavy_computation",
      "Add caching to reduce API call times"
    ]
  }
}
```

## Validation & Testing

### Output Validation
Validate that workflow outputs match expected schemas:

```json
{
  "validation": {
    "outputValidation": {
      "valid": false,
      "errors": [
        "Expected 'email' field in final output",
        "Output 'amount' should be a number, got string"
      ],
      "warnings": [
        "Output contains unexpected field 'debug_info'"
      ]
    }
  }
}
```

### Data Type Validation
Check data type consistency between blocks:

```json
{
  "dataTypeValidation": {
    "valid": false,
    "issues": [
      {
        "blockId": "block_calculation",
        "port": "input_amount", 
        "expected": "number",
        "actual": "string"
      }
    ]
  }
}
```

## Best Practices

### Testing Strategy
1. **Start Simple**: Test with basic inputs before complex scenarios
2. **Mock Externals**: Always mock external services in testing
3. **Validate Outputs**: Use output validation to catch schema issues
4. **Performance Test**: Monitor execution times during development
5. **Error Cases**: Test error scenarios with invalid inputs

### Debugging Workflow
1. **Use Dry-Run**: Always test changes with dry-run first
2. **Add Breakpoints**: Place breakpoints at critical decision points
3. **Check Data Flow**: Verify data flows correctly between blocks
4. **Monitor Performance**: Watch for performance regressions
5. **Validate Results**: Ensure outputs match expectations

### Production Preparation
1. **Comprehensive Testing**: Test all code paths and edge cases
2. **Mock Validation**: Verify mocks accurately represent real services
3. **Performance Baseline**: Establish performance benchmarks
4. **Error Handling**: Test error scenarios and recovery
5. **Output Verification**: Validate all possible output combinations

## Security Considerations

- Dry-run mode prevents all external side effects
- Mock responses don't contain real sensitive data
- Execution logs are sanitized of credentials
- All dry-run executions are logged for audit
- Rate limiting applies to prevent abuse
- Only users with read access can run dry-runs