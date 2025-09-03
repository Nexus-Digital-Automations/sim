import { ApiIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { RequestResponse } from '@/tools/http/types'

export const RestApiBlock: BlockConfig<RequestResponse> = {
  type: 'rest_api',
  name: 'REST API',
  description: 'Advanced REST API integration with authentication and rate limiting',
  longDescription:
    'Connect to any REST API with comprehensive authentication support, intelligent rate limiting, automatic retries, and advanced error handling. Supports all HTTP methods with detailed response parsing.',
  docsLink: 'https://docs.sim.ai/blocks/rest-api',
  category: 'blocks',
  bgColor: '#2563EB',
  icon: ApiIcon,
  subBlocks: [
    {
      id: 'endpoint',
      title: 'API Endpoint',
      type: 'long-input',
      layout: 'full',
      placeholder: 'https://api.example.com/v1/users',
      required: true,
      rows: 2,
    },
    {
      id: 'method',
      title: 'HTTP Method',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'GET', id: 'GET' },
        { label: 'POST', id: 'POST' },
        { label: 'PUT', id: 'PUT' },
        { label: 'PATCH', id: 'PATCH' },
        { label: 'DELETE', id: 'DELETE' },
        { label: 'HEAD', id: 'HEAD' },
        { label: 'OPTIONS', id: 'OPTIONS' },
      ],
    },
    {
      id: 'authentication',
      title: 'Authentication',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'None', id: 'none' },
        { label: 'API Key', id: 'api_key' },
        { label: 'Bearer Token', id: 'bearer' },
        { label: 'OAuth 2.0', id: 'oauth2' },
        { label: 'Basic Auth', id: 'basic' },
        { label: 'Custom Header', id: 'custom' },
      ],
      value: () => 'none',
    },
    {
      id: 'apiKey',
      title: 'API Key',
      type: 'short-input',
      layout: 'half',
      placeholder: 'your-api-key',
      password: true,
      condition: { field: 'authentication', value: 'api_key' },
      required: true,
    },
    {
      id: 'apiKeyHeader',
      title: 'API Key Header Name',
      type: 'short-input',
      layout: 'half',
      placeholder: 'X-API-Key',
      condition: { field: 'authentication', value: 'api_key' },
      value: () => 'X-API-Key',
    },
    {
      id: 'bearerToken',
      title: 'Bearer Token',
      type: 'short-input',
      layout: 'full',
      placeholder: 'your-bearer-token',
      password: true,
      condition: { field: 'authentication', value: 'bearer' },
      required: true,
    },
    {
      id: 'username',
      title: 'Username',
      type: 'short-input',
      layout: 'half',
      placeholder: 'username',
      condition: { field: 'authentication', value: 'basic' },
      required: true,
    },
    {
      id: 'password',
      title: 'Password',
      type: 'short-input',
      layout: 'half',
      placeholder: 'password',
      password: true,
      condition: { field: 'authentication', value: 'basic' },
      required: true,
    },
    {
      id: 'customAuthHeader',
      title: 'Custom Auth Header',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Authorization',
      condition: { field: 'authentication', value: 'custom' },
      required: true,
    },
    {
      id: 'customAuthValue',
      title: 'Custom Auth Value',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Custom auth-value',
      password: true,
      condition: { field: 'authentication', value: 'custom' },
      required: true,
    },
    {
      id: 'headers',
      title: 'Custom Headers',
      type: 'table',
      layout: 'full',
      columns: ['Key', 'Value'],
      description: 'Additional headers (authentication headers are added automatically)',
    },
    {
      id: 'queryParams',
      title: 'Query Parameters',
      type: 'table',
      layout: 'full',
      columns: ['Key', 'Value'],
    },
    {
      id: 'body',
      title: 'Request Body',
      type: 'code',
      layout: 'full',
      placeholder: 'Enter JSON, XML, or plain text...',
      condition: { 
        field: 'method', 
        value: ['POST', 'PUT', 'PATCH'],
      },
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert API developer. Generate the appropriate request body based on the user's description.

Current context: {context}

Generate ONLY the raw request body content. Support JSON, XML, form data, or plain text as appropriate.

For JSON bodies, return valid JSON:
{
  "key": "value",
  "nested": {
    "field": "<referenced.value>"
  }
}

You can reference other block outputs using angle bracket syntax: <block.output.field>
Environment variables using double curly braces: {{ENV_VAR}}

Return only the body content, no explanations or formatting.`,
        placeholder: 'Describe the request body you need...',
        generationType: 'json-object',
      },
    },
    {
      id: 'rateLimiting',
      title: 'Enable Rate Limiting',
      type: 'switch',
      layout: 'half',
      description: 'Intelligent rate limiting to prevent API quota exhaustion',
    },
    {
      id: 'maxRetries',
      title: 'Max Retries',
      type: 'slider',
      layout: 'half',
      min: 0,
      max: 5,
      step: 1,
      value: () => '3',
      description: 'Number of automatic retries on failure',
    },
    {
      id: 'timeout',
      title: 'Timeout (seconds)',
      type: 'slider',
      layout: 'half',
      min: 1,
      max: 300,
      step: 1,
      value: () => '30',
      description: 'Request timeout in seconds',
    },
    {
      id: 'followRedirects',
      title: 'Follow Redirects',
      type: 'switch',
      layout: 'half',
      description: 'Automatically follow HTTP redirects',
      value: () => true,
    },
  ],
  tools: {
    access: ['rest_api_request'],
  },
  inputs: {
    endpoint: { type: 'string', description: 'API endpoint URL' },
    method: { type: 'string', description: 'HTTP method' },
    authentication: { type: 'string', description: 'Authentication type' },
    apiKey: { type: 'string', description: 'API key for authentication' },
    apiKeyHeader: { type: 'string', description: 'Header name for API key' },
    bearerToken: { type: 'string', description: 'Bearer token for authentication' },
    username: { type: 'string', description: 'Username for basic auth' },
    password: { type: 'string', description: 'Password for basic auth' },
    customAuthHeader: { type: 'string', description: 'Custom authentication header name' },
    customAuthValue: { type: 'string', description: 'Custom authentication value' },
    headers: { type: 'json', description: 'Custom request headers' },
    queryParams: { type: 'json', description: 'URL query parameters' },
    body: { type: 'string', description: 'Request body content' },
    rateLimiting: { type: 'boolean', description: 'Enable rate limiting' },
    maxRetries: { type: 'number', description: 'Maximum retry attempts' },
    timeout: { type: 'number', description: 'Request timeout in seconds' },
    followRedirects: { type: 'boolean', description: 'Follow HTTP redirects' },
  },
  outputs: {
    data: { type: 'json', description: 'API response data' },
    status: { type: 'number', description: 'HTTP status code' },
    statusText: { type: 'string', description: 'HTTP status message' },
    headers: { type: 'json', description: 'Response headers' },
    responseTime: { type: 'number', description: 'Response time in milliseconds' },
    retryCount: { type: 'number', description: 'Number of retries performed' },
    error: { type: 'string', description: 'Error message if request failed' },
  },
}