import { ApiIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { WebhookResponse } from '@/tools/webhook/types'

export const WebhookProcessorBlock: BlockConfig<WebhookResponse> = {
  type: 'webhook_processor',
  name: 'Webhook Processor',
  description: 'Advanced webhook processing with payload validation and transformation',
  longDescription:
    'Process incoming webhooks with automatic payload parsing, signature verification, data transformation, and response customization. Support for multiple webhook providers and security standards.',
  docsLink: 'https://docs.sim.ai/blocks/webhook-processor',
  category: 'triggers',
  bgColor: '#059669',
  icon: ApiIcon,
  subBlocks: [
    {
      id: 'webhookUrl',
      title: 'Webhook URL',
      type: 'long-input',
      layout: 'full',
      placeholder: 'https://hooks.sim.ai/webhook/your-unique-id',
      description: 'Generated webhook URL for external services',
      value: (params) => `https://hooks.sim.ai/webhook/${Math.random().toString(36).substring(7)}`,
    },
    {
      id: 'httpMethod',
      title: 'Accepted HTTP Methods',
      type: 'checkbox-list',
      layout: 'full',
      options: [
        { label: 'POST', id: 'POST' },
        { label: 'PUT', id: 'PUT' },
        { label: 'PATCH', id: 'PATCH' },
        { label: 'GET', id: 'GET' },
        { label: 'DELETE', id: 'DELETE' },
      ],
      value: () => ['POST'],
      required: true,
    },
    {
      id: 'contentType',
      title: 'Expected Content Type',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Any', id: 'any' },
        { label: 'JSON (application/json)', id: 'application/json' },
        {
          label: 'Form Data (application/x-www-form-urlencoded)',
          id: 'application/x-www-form-urlencoded',
        },
        { label: 'XML (application/xml)', id: 'application/xml' },
        { label: 'Plain Text (text/plain)', id: 'text/plain' },
        { label: 'Multipart Form (multipart/form-data)', id: 'multipart/form-data' },
      ],
      value: () => 'any',
    },
    {
      id: 'authentication',
      title: 'Webhook Authentication',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'None', id: 'none' },
        { label: 'Secret Token', id: 'secret' },
        { label: 'HMAC Signature', id: 'hmac' },
        { label: 'Basic Auth', id: 'basic' },
        { label: 'Custom Header', id: 'custom' },
      ],
      value: () => 'none',
    },
    {
      id: 'secretToken',
      title: 'Secret Token',
      type: 'short-input',
      layout: 'full',
      placeholder: 'your-webhook-secret',
      password: true,
      condition: { field: 'authentication', value: 'secret' },
      required: true,
      description: 'Secret token to verify webhook authenticity',
    },
    {
      id: 'hmacSecret',
      title: 'HMAC Secret',
      type: 'short-input',
      layout: 'half',
      placeholder: 'hmac-secret-key',
      password: true,
      condition: { field: 'authentication', value: 'hmac' },
      required: true,
    },
    {
      id: 'hmacHeader',
      title: 'HMAC Header Name',
      type: 'short-input',
      layout: 'half',
      placeholder: 'X-Hub-Signature-256',
      condition: { field: 'authentication', value: 'hmac' },
      value: () => 'X-Hub-Signature-256',
    },
    {
      id: 'basicUsername',
      title: 'Basic Auth Username',
      type: 'short-input',
      layout: 'half',
      placeholder: 'webhook-username',
      condition: { field: 'authentication', value: 'basic' },
      required: true,
    },
    {
      id: 'basicPassword',
      title: 'Basic Auth Password',
      type: 'short-input',
      layout: 'half',
      placeholder: 'webhook-password',
      password: true,
      condition: { field: 'authentication', value: 'basic' },
      required: true,
    },
    {
      id: 'customHeaderName',
      title: 'Custom Header Name',
      type: 'short-input',
      layout: 'half',
      placeholder: 'X-Webhook-Auth',
      condition: { field: 'authentication', value: 'custom' },
      required: true,
    },
    {
      id: 'customHeaderValue',
      title: 'Expected Header Value',
      type: 'short-input',
      layout: 'half',
      placeholder: 'expected-auth-value',
      password: true,
      condition: { field: 'authentication', value: 'custom' },
      required: true,
    },
    {
      id: 'payloadValidation',
      title: 'Enable Payload Validation',
      type: 'switch',
      layout: 'half',
      description: 'Validate incoming payload against schema',
    },
    {
      id: 'validationSchema',
      title: 'JSON Schema',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "type": "object",
  "required": ["event", "data"],
  "properties": {
    "event": { "type": "string" },
    "data": { "type": "object" }
  }
}`,
      condition: { field: 'payloadValidation', value: true },
      description: 'JSON Schema for payload validation',
    },
    {
      id: 'dataTransformation',
      title: 'Enable Data Transformation',
      type: 'switch',
      layout: 'half',
      description: 'Transform webhook payload before processing',
    },
    {
      id: 'transformationRules',
      title: 'Transformation Rules',
      type: 'code',
      layout: 'full',
      language: 'javascript',
      placeholder: `// Transform the incoming webhook payload
function transform(payload, headers, query) {
  return {
    originalEvent: payload.event,
    processedData: {
      id: payload.data.id,
      timestamp: new Date().toISOString(),
      source: headers['user-agent']
    }
  }
}`,
      condition: { field: 'dataTransformation', value: true },
      description: 'JavaScript function to transform webhook data',
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert JavaScript developer. Create a transformation function for webhook data.

The function should:
1. Take parameters: (payload, headers, query)
2. Return transformed data object
3. Handle common webhook transformations

Current context: {context}

Generate ONLY the JavaScript function body, no explanations:

function transform(payload, headers, query) {
  // Your transformation logic here
  return transformedData;
}`,
        placeholder: 'Describe how to transform the webhook data...',
        generationType: 'javascript-function-body',
      },
    },
    {
      id: 'responseCode',
      title: 'Response Status Code',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: '200 OK', id: '200' },
        { label: '201 Created', id: '201' },
        { label: '202 Accepted', id: '202' },
        { label: '204 No Content', id: '204' },
      ],
      value: () => '200',
      description: 'HTTP status code to return to webhook sender',
    },
    {
      id: 'responseBody',
      title: 'Custom Response Body',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "status": "received",
  "message": "Webhook processed successfully"
}`,
      description: 'Optional custom response body (JSON)',
    },
    {
      id: 'enableLogging',
      title: 'Enable Request Logging',
      type: 'switch',
      layout: 'half',
      description: 'Log all webhook requests for debugging',
      value: () => true,
    },
    {
      id: 'rateLimiting',
      title: 'Enable Rate Limiting',
      type: 'switch',
      layout: 'half',
      description: 'Limit requests per IP address',
    },
    {
      id: 'rateLimit',
      title: 'Requests per Minute',
      type: 'slider',
      layout: 'full',
      min: 1,
      max: 1000,
      step: 10,
      value: () => '60',
      condition: { field: 'rateLimiting', value: true },
      description: 'Maximum requests per minute per IP',
    },
  ],
  tools: {
    access: ['webhook_processor'],
  },
  inputs: {
    webhookUrl: { type: 'string', description: 'Generated webhook URL' },
    httpMethod: { type: 'json', description: 'Accepted HTTP methods' },
    contentType: { type: 'string', description: 'Expected content type' },
    authentication: { type: 'string', description: 'Authentication method' },
    secretToken: { type: 'string', description: 'Secret token for verification' },
    hmacSecret: { type: 'string', description: 'HMAC secret key' },
    hmacHeader: { type: 'string', description: 'HMAC header name' },
    basicUsername: { type: 'string', description: 'Basic auth username' },
    basicPassword: { type: 'string', description: 'Basic auth password' },
    customHeaderName: { type: 'string', description: 'Custom auth header name' },
    customHeaderValue: { type: 'string', description: 'Expected custom header value' },
    payloadValidation: { type: 'boolean', description: 'Enable payload validation' },
    validationSchema: { type: 'json', description: 'JSON schema for validation' },
    dataTransformation: { type: 'boolean', description: 'Enable data transformation' },
    transformationRules: { type: 'string', description: 'JavaScript transformation function' },
    responseCode: { type: 'string', description: 'HTTP response status code' },
    responseBody: { type: 'json', description: 'Custom response body' },
    enableLogging: { type: 'boolean', description: 'Enable request logging' },
    rateLimiting: { type: 'boolean', description: 'Enable rate limiting' },
    rateLimit: { type: 'number', description: 'Requests per minute limit' },
  },
  outputs: {
    payload: { type: 'json', description: 'Processed webhook payload' },
    headers: { type: 'json', description: 'Request headers' },
    query: { type: 'json', description: 'Query parameters' },
    method: { type: 'string', description: 'HTTP method used' },
    timestamp: { type: 'string', description: 'Request timestamp' },
    sourceIp: { type: 'string', description: 'Source IP address' },
    userAgent: { type: 'string', description: 'User agent string' },
    validationResult: { type: 'json', description: 'Payload validation result' },
    transformedData: { type: 'json', description: 'Transformed webhook data' },
    error: { type: 'string', description: 'Error message if processing failed' },
  },
  triggers: {
    enabled: true,
    available: ['webhook'],
  },
}
