import { ApiIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { RequestResponse } from '@/tools/http/types'

export const GraphQLApiBlock: BlockConfig<RequestResponse> = {
  type: 'graphql_api',
  name: 'GraphQL API',
  description: 'GraphQL API client with query builder and introspection',
  longDescription:
    'Execute GraphQL queries and mutations with built-in query validation, schema introspection, and variable management. Supports subscriptions and advanced GraphQL features.',
  docsLink: 'https://docs.sim.ai/blocks/graphql-api',
  category: 'blocks',
  bgColor: '#E535AB',
  icon: ApiIcon,
  subBlocks: [
    {
      id: 'endpoint',
      title: 'GraphQL Endpoint',
      type: 'long-input',
      layout: 'full',
      placeholder: 'https://api.example.com/graphql',
      required: true,
      rows: 2,
    },
    {
      id: 'operation',
      title: 'Operation Type',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Query', id: 'query' },
        { label: 'Mutation', id: 'mutation' },
        { label: 'Subscription', id: 'subscription' },
      ],
      value: () => 'query',
    },
    {
      id: 'authentication',
      title: 'Authentication',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'None', id: 'none' },
        { label: 'Bearer Token', id: 'bearer' },
        { label: 'API Key', id: 'api_key' },
        { label: 'Custom Header', id: 'custom' },
      ],
      value: () => 'none',
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
      title: 'API Key Header',
      type: 'short-input',
      layout: 'half',
      placeholder: 'X-API-Key',
      condition: { field: 'authentication', value: 'api_key' },
      value: () => 'X-API-Key',
    },
    {
      id: 'customAuthHeader',
      title: 'Auth Header Name',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Authorization',
      condition: { field: 'authentication', value: 'custom' },
      required: true,
    },
    {
      id: 'customAuthValue',
      title: 'Auth Header Value',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Custom auth-value',
      password: true,
      condition: { field: 'authentication', value: 'custom' },
      required: true,
    },
    {
      id: 'query',
      title: 'GraphQL Query/Mutation',
      type: 'code',
      layout: 'full',
      language: 'javascript',
      rows: 12,
      placeholder: `query GetUsers($limit: Int) {
  users(limit: $limit) {
    id
    name
    email
    profile {
      avatar
      bio
    }
  }
}`,
      required: true,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert GraphQL developer. Generate GraphQL queries and mutations based on the user's request.

Current context: {context}

Generate ONLY the raw GraphQL operation. Include proper syntax for:
- Field selections
- Arguments and variables
- Nested queries
- Fragments if needed
- Proper query/mutation/subscription structure

Examples:

Query with variables:
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts(first: 10) {
      edges {
        node {
          title
          content
          createdAt
        }
      }
    }
  }
}

Mutation:
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title
    content
    author {
      name
    }
  }
}

Return only the GraphQL operation, no explanations or markdown formatting.`,
        placeholder: 'Describe the GraphQL operation you need...',
        generationType: 'typescript-function-body',
      },
    },
    {
      id: 'variables',
      title: 'Variables',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "limit": 10,
  "userId": "<user.id>"
}`,
      description: 'GraphQL variables as JSON object',
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `Generate GraphQL variables as a JSON object based on the query above and user's requirements.

Context: {context}

Return ONLY a valid JSON object with the variables needed for the GraphQL operation.
You can reference other block outputs using <block.output.field> syntax.
Use environment variables with {{ENV_VAR}} syntax.

Example:
{
  "userId": "<previous.block.user.id>",
  "limit": 20,
  "filter": {
    "status": "active"
  }
}`,
        placeholder: 'Describe the variables needed...',
        generationType: 'json-object',
      },
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
      id: 'introspection',
      title: 'Enable Introspection',
      type: 'switch',
      layout: 'half',
      description: 'Query schema for validation and autocomplete',
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
  ],
  tools: {
    access: ['graphql_request'],
  },
  inputs: {
    endpoint: { type: 'string', description: 'GraphQL endpoint URL' },
    operation: { type: 'string', description: 'GraphQL operation type' },
    authentication: { type: 'string', description: 'Authentication method' },
    bearerToken: { type: 'string', description: 'Bearer token for authentication' },
    apiKey: { type: 'string', description: 'API key for authentication' },
    apiKeyHeader: { type: 'string', description: 'Header name for API key' },
    customAuthHeader: { type: 'string', description: 'Custom auth header name' },
    customAuthValue: { type: 'string', description: 'Custom auth header value' },
    query: { type: 'string', description: 'GraphQL query or mutation' },
    variables: { type: 'json', description: 'GraphQL variables' },
    headers: { type: 'json', description: 'Custom headers' },
    introspection: { type: 'boolean', description: 'Enable schema introspection' },
    timeout: { type: 'number', description: 'Request timeout in seconds' },
  },
  outputs: {
    data: { type: 'json', description: 'GraphQL response data' },
    errors: { type: 'array', description: 'GraphQL errors if any' },
    extensions: { type: 'json', description: 'GraphQL response extensions' },
    status: { type: 'number', description: 'HTTP status code' },
    responseTime: { type: 'number', description: 'Response time in milliseconds' },
    schema: { type: 'json', description: 'GraphQL schema (if introspection enabled)' },
    error: { type: 'string', description: 'Error message if request failed' },
  },
}