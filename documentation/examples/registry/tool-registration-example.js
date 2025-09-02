/**
 * Complete example of registering a custom tool with the Sim Registry API
 *
 * This example demonstrates:
 * - Tool registration with comprehensive manifest
 * - Webhook endpoint implementation
 * - Security with HMAC signature validation
 * - Error handling and logging
 * - Testing and validation
 */

const crypto = require('crypto')
const express = require('express')

// Sim API client configuration
const SIM_API_BASE = 'https://your-sim-instance.com/api'
const SIM_API_KEY = process.env.SIM_API_KEY
const WEBHOOK_SECRET = process.env.REGISTRY_WEBHOOK_SECRET || 'your-webhook-secret'

/**
 * Example: Custom CRM Integration Tool
 * Integrates with a fictional CRM system to create/update customers
 */

// 1. Tool Manifest Definition
const toolManifest = {
  name: 'custom_crm_integration',
  displayName: 'Custom CRM Integration',
  description: 'Create and update customer records in our custom CRM system',
  icon: 'users',
  category: 'crm',
  version: '1.0.0',
  manifest: {
    // Configuration schema - what users need to configure
    configSchema: {
      type: 'object',
      properties: {
        crmApiUrl: {
          type: 'string',
          title: 'CRM API URL',
          description: 'Base URL for your CRM API',
          format: 'uri',
        },
        apiKey: {
          type: 'string',
          title: 'API Key',
          description: 'Your CRM API key',
          secret: true,
        },
        defaultStatus: {
          type: 'string',
          title: 'Default Customer Status',
          description: 'Default status for new customers',
          enum: ['lead', 'prospect', 'customer', 'inactive'],
          default: 'lead',
        },
      },
      required: ['crmApiUrl', 'apiKey'],
    },
    // Input schema - what data the tool expects
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'update', 'get'],
          title: 'Action',
          description: 'Action to perform',
        },
        customerData: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              title: 'Email Address',
            },
            firstName: {
              type: 'string',
              title: 'First Name',
            },
            lastName: {
              type: 'string',
              title: 'Last Name',
            },
            company: {
              type: 'string',
              title: 'Company',
            },
            phone: {
              type: 'string',
              title: 'Phone Number',
            },
          },
          required: ['email'],
        },
        customerId: {
          type: 'string',
          title: 'Customer ID',
          description: 'Required for update and get actions',
        },
      },
      required: ['action', 'customerData'],
    },
    // Output schema - what the tool returns
    outputSchema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          title: 'Success Status',
        },
        customer: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              title: 'Customer ID',
            },
            email: {
              type: 'string',
              title: 'Email Address',
            },
            fullName: {
              type: 'string',
              title: 'Full Name',
            },
            status: {
              type: 'string',
              title: 'Customer Status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              title: 'Created At',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              title: 'Updated At',
            },
          },
        },
        message: {
          type: 'string',
          title: 'Status Message',
        },
      },
      required: ['success'],
    },
  },
  webhookUrl: 'https://your-service.com/webhooks/sim-registry/crm-integration',
  webhookMethod: 'POST',
  webhookTimeout: 30000,
  webhookRetryCount: 3,
  authentication: {
    type: 'bearer',
    tokenValidationUrl: 'https://your-service.com/validate-token',
  },
  tags: ['crm', 'customers', 'integration'],
  metadata: {
    author: 'Your Company',
    supportUrl: 'https://your-company.com/support',
    documentationUrl: 'https://docs.your-company.com/sim-integration',
  },
}

// 2. Register the Tool with Sim
async function registerTool() {
  console.log('Registering custom CRM tool with Sim Registry...')

  try {
    const response = await fetch(`${SIM_API_BASE}/registry/tools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SIM_API_KEY}`,
      },
      body: JSON.stringify(toolManifest),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Tool registration failed:', error)
      process.exit(1)
    }

    const result = await response.json()
    console.log('Tool registered successfully:', result)

    return result
  } catch (error) {
    console.error('Registration error:', error)
    process.exit(1)
  }
}

// 3. Webhook Endpoint Implementation
const app = express()
app.use(express.json())

// Middleware to validate webhook signatures
function validateSignature(req, res, next) {
  const signature = req.headers['x-signature']
  const timestamp = req.headers['x-timestamp']
  const body = JSON.stringify(req.body)

  if (!signature || !timestamp) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_SIGNATURE',
        message: 'Missing signature or timestamp headers',
      },
    })
  }

  // Check timestamp to prevent replay attacks (5 minute window)
  const now = Date.now()
  const requestTime = new Date(timestamp).getTime()
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'REQUEST_TOO_OLD',
        message: 'Request timestamp is too old',
      },
    })
  }

  // Validate HMAC signature
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex')}`

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'Invalid webhook signature',
      },
    })
  }

  next()
}

// Mock CRM API functions
class MockCRMAPI {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl
    this.apiKey = apiKey
    this.customers = new Map() // In-memory storage for demo
  }

  async createCustomer(customerData, defaultStatus) {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100))

    const customerId = `cust_${Math.random().toString(36).substr(2, 9)}`
    const customer = {
      id: customerId,
      email: customerData.email,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      fullName: `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim(),
      company: customerData.company,
      phone: customerData.phone,
      status: defaultStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.customers.set(customerId, customer)

    return customer
  }

  async updateCustomer(customerId, customerData) {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 80))

    const existing = this.customers.get(customerId)
    if (!existing) {
      throw new Error('Customer not found')
    }

    const updated = {
      ...existing,
      ...customerData,
      fullName:
        `${customerData.firstName || existing.firstName || ''} ${customerData.lastName || existing.lastName || ''}`.trim(),
      updatedAt: new Date().toISOString(),
    }

    this.customers.set(customerId, updated)

    return updated
  }

  async getCustomer(customerId) {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 50))

    const customer = this.customers.get(customerId)
    if (!customer) {
      throw new Error('Customer not found')
    }

    return customer
  }
}

// Webhook endpoint for tool execution
app.post('/webhooks/sim-registry/crm-integration', validateSignature, async (req, res) => {
  const startTime = Date.now()

  console.log('Received webhook execution request:', {
    executionId: req.body.executionId,
    toolId: req.body.toolId,
    workflowId: req.body.workflowId,
    userId: req.body.userId,
    action: req.body.inputs?.action,
  })

  try {
    const { inputs, config } = req.body

    // Validate required inputs
    if (!inputs.action || !inputs.customerData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing required inputs: action and customerData',
        },
      })
    }

    // Initialize CRM API client
    const crmApi = new MockCRMAPI(config.crmApiUrl, config.apiKey)

    let result

    switch (inputs.action) {
      case 'create':
        result = await crmApi.createCustomer(inputs.customerData, config.defaultStatus || 'lead')
        break

      case 'update':
        if (!inputs.customerId) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_CUSTOMER_ID',
              message: 'Customer ID is required for update action',
            },
          })
        }
        result = await crmApi.updateCustomer(inputs.customerId, inputs.customerData)
        break

      case 'get':
        if (!inputs.customerId) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_CUSTOMER_ID',
              message: 'Customer ID is required for get action',
            },
          })
        }
        result = await crmApi.getCustomer(inputs.customerId)
        break

      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: `Invalid action: ${inputs.action}. Supported actions: create, update, get`,
          },
        })
    }

    const executionTime = Date.now() - startTime

    // Return successful response
    res.json({
      success: true,
      outputs: {
        customer: result,
        message: `Customer ${inputs.action} completed successfully`,
      },
      executionTime,
      metadata: {
        provider: 'custom-crm-integration',
        version: '1.0.0',
        action: inputs.action,
      },
    })

    console.log('Tool execution completed successfully:', {
      executionId: req.body.executionId,
      action: inputs.action,
      customerId: result.id,
      executionTime,
    })
  } catch (error) {
    const executionTime = Date.now() - startTime

    console.error('Tool execution failed:', {
      executionId: req.body.executionId,
      error: error.message,
      executionTime,
    })

    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTION_FAILED',
        message: error.message,
      },
      executionTime,
      metadata: {
        provider: 'custom-crm-integration',
        version: '1.0.0',
      },
    })
  }
})

// Health check endpoint
app.get('/webhooks/sim-registry/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

// 4. Testing Functions
async function testToolRegistration() {
  console.log('Testing tool registration...')

  // Register the tool
  const registrationResult = await registerTool()

  // Test webhook endpoint
  console.log('Testing webhook endpoint...')

  const testPayload = {
    executionId: 'test_exec_123',
    toolId: registrationResult.id,
    workflowId: 'test_workflow_456',
    userId: 'test_user_789',
    inputs: {
      action: 'create',
      customerData: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Test Company',
      },
    },
    config: {
      crmApiUrl: 'https://api.example-crm.com/v1',
      apiKey: 'test-api-key-123',
      defaultStatus: 'lead',
    },
    timestamp: new Date().toISOString(),
  }

  // Generate test signature
  const body = JSON.stringify(testPayload)
  const signature = `sha256=${crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex')}`

  try {
    const response = await fetch('http://localhost:3000/webhooks/sim-registry/crm-integration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': testPayload.timestamp,
      },
      body,
    })

    const result = await response.json()
    console.log('Webhook test result:', result)

    if (result.success) {
      console.log('✅ Tool registration and webhook test completed successfully!')
    } else {
      console.log('❌ Tool test failed:', result.error)
    }
  } catch (error) {
    console.error('Webhook test error:', error)
  }
}

// 5. Start the server and run tests
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`)

  // Run tests if in test mode
  if (process.argv.includes('--test')) {
    setTimeout(() => {
      testToolRegistration()
    }, 1000)
  }
})

// Export for testing
module.exports = { app, toolManifest, registerTool }

/**
 * Usage Instructions:
 *
 * 1. Set environment variables:
 *    export SIM_API_KEY="your-sim-api-key"
 *    export REGISTRY_WEBHOOK_SECRET="your-webhook-secret"
 *
 * 2. Install dependencies:
 *    npm install express
 *
 * 3. Run the server:
 *    node tool-registration-example.js
 *
 * 4. Run with tests:
 *    node tool-registration-example.js --test
 *
 * 5. Register the tool manually:
 *    curl -X POST https://your-sim-instance.com/api/registry/tools \
 *         -H "Content-Type: application/json" \
 *         -H "Authorization: Bearer YOUR_API_KEY" \
 *         -d @tool-manifest.json
 */
