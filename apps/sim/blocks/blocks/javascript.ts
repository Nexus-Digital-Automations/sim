import { CodeIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { CodeExecutionOutput } from '@/tools/function/types'

/**
 * Enhanced JavaScript Code Block
 *
 * Provides advanced JavaScript code execution capabilities with:
 * - Enhanced Monaco editor integration
 * - NPM package import support (whitelisted)
 * - Advanced debugging capabilities
 * - Improved error handling and reporting
 * - Resource monitoring and limits
 * - Security sandboxing options
 */
export const JavaScriptBlock: BlockConfig<CodeExecutionOutput> = {
  type: 'javascript',
  name: 'JavaScript Code',
  description: 'Execute JavaScript code with advanced features',
  longDescription:
    'Execute JavaScript code with enhanced features including NPM package imports, advanced debugging, resource monitoring, and secure sandboxing. Supports async/await, promises, and access to workflow context variables.',
  docsLink: 'https://docs.sim.ai/blocks/javascript',
  category: 'blocks',
  bgColor: '#F7DF1E',
  icon: CodeIcon,
  subBlocks: [
    {
      id: 'code',
      title: 'JavaScript Code',
      type: 'code',
      language: 'javascript',
      layout: 'full',
      required: true,
      placeholder: 'Enter your JavaScript code here...',
      description: 'Write JavaScript code that will be executed in a secure sandbox environment',
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert JavaScript programmer specializing in workflow automation and data processing.
Generate ONLY the raw body of a JavaScript function based on the user's request.
The code should be executable within an 'async function(params, environmentVariables, context) {...}' context.

AVAILABLE CONTEXT:
- 'params' (object): Input parameters from workflow
- 'environmentVariables' (object): Environment variables from workflow
- 'context' (object): Additional workflow context including previous block outputs
- Standard Node.js built-in modules (crypto, fs, path, url, etc.)
- Whitelisted NPM packages (lodash, moment, axios, uuid, etc.)

VARIABLE ACCESS PATTERNS:
1. Environment Variables: {{VARIABLE_NAME}} - replaced before execution
2. Input Parameters: <paramName> - replaced with actual values
3. Block Outputs: <blockName.outputField> - access outputs from other blocks
4. Workflow Variables: <variable.variableName> - access workflow-level variables

ENHANCED FEATURES:
- Package imports: const _ = require('lodash') // whitelisted packages only
- Async operations: await fetch(), database queries, file operations
- Error handling: try/catch blocks with detailed error messages
- Logging: console.log(), console.error(), console.warn()
- Data transformation: JSON manipulation, array operations, string processing
- API calls: HTTP requests, webhook processing, data validation

SECURITY CONSIDERATIONS:
- Code runs in a secure sandbox with resource limits
- No access to file system outside allowed paths
- Network access limited to approved domains
- Execution timeout enforced
- Memory and CPU usage monitored

BEST PRACTICES:
1. Always use async/await for asynchronous operations
2. Include proper error handling with try/catch blocks
3. Validate inputs and sanitize outputs
4. Use console.log() for debugging and progress tracking
5. Return meaningful data for downstream blocks
6. Comment complex logic for maintainability

Example - Data Processing:
\`\`\`javascript
// Access workflow variables and previous block outputs
const userData = <getUserData.response>;
const apiKey = {{API_KEY}};
const threshold = <threshold>;

// Process and transform data
const processedData = userData.map(user => {
  return {
    id: user.id,
    fullName: \`\${user.firstName} \${user.lastName}\`,
    score: calculateScore(user.activities),
    active: user.lastLogin > threshold
  };
});

// Filter and sort results
const activeUsers = processedData
  .filter(user => user.active && user.score > 50)
  .sort((a, b) => b.score - a.score);

console.log(\`Processed \${activeUsers.length} active users\`);
return activeUsers;
\`\`\`

Generate clean, well-documented JavaScript code without the function wrapper or explanatory text.`,
        placeholder: 'Describe what you want the JavaScript code to do...',
        generationType: 'javascript-function-body',
      },
    },
    {
      id: 'packages',
      title: 'NPM Packages',
      type: 'checkbox-list',
      layout: 'full',
      description: 'Select NPM packages to make available in your code (whitelisted packages only)',
      options: [
        { label: 'lodash - Utility library for common programming tasks', id: 'lodash' },
        { label: 'moment - Date and time manipulation library', id: 'moment' },
        { label: 'axios - HTTP client for making API requests', id: 'axios' },
        { label: 'uuid - Generate unique identifiers', id: 'uuid' },
        { label: 'crypto-js - Cryptographic functions', id: 'crypto-js' },
        { label: 'validator - String validation and sanitization', id: 'validator' },
        { label: 'cheerio - Server-side jQuery for HTML parsing', id: 'cheerio' },
        { label: 'csv-parser - Parse CSV files', id: 'csv-parser' },
        { label: 'xml2js - Convert XML to JavaScript objects', id: 'xml2js' },
        { label: 'bcrypt - Password hashing', id: 'bcrypt' },
        { label: 'jsonwebtoken - JWT token handling', id: 'jsonwebtoken' },
        { label: 'sharp - Image processing', id: 'sharp' },
      ],
      multiSelect: true,
    },
    {
      id: 'timeout',
      title: 'Execution Timeout',
      type: 'slider',
      layout: 'half',
      min: 5,
      max: 300,
      step: 5,
      description: 'Maximum execution time in seconds (5-300 seconds)',
      placeholder: '30',
    },
    {
      id: 'memoryLimit',
      title: 'Memory Limit',
      type: 'slider',
      layout: 'half',
      min: 50,
      max: 1000,
      step: 50,
      description: 'Maximum memory usage in MB (50-1000 MB)',
      placeholder: '256',
    },
    {
      id: 'enableDebugging',
      title: 'Enable Debugging',
      type: 'switch',
      layout: 'half',
      description: 'Enable advanced debugging features with breakpoints and variable inspection',
    },
    {
      id: 'enableNetworking',
      title: 'Enable Network Access',
      type: 'switch',
      layout: 'half',
      description: 'Allow HTTP requests to external APIs (subject to security policies)',
    },
    {
      id: 'sandboxMode',
      title: 'Sandbox Mode',
      type: 'dropdown',
      layout: 'half',
      description: 'Select execution environment security level',
      options: [
        { label: 'Standard - VM Context (Fast)', id: 'vm' },
        { label: 'Enhanced - Process Isolation (Balanced)', id: 'process' },
        { label: 'Maximum - Docker Container (Secure)', id: 'docker' },
      ],
    },
    {
      id: 'logLevel',
      title: 'Log Level',
      type: 'dropdown',
      layout: 'half',
      description: 'Set logging verbosity for debugging',
      options: [
        { label: 'Error - Only errors', id: 'error' },
        { label: 'Warn - Warnings and errors', id: 'warn' },
        { label: 'Info - General information', id: 'info' },
        { label: 'Debug - Detailed debugging', id: 'debug' },
        { label: 'Trace - Full execution trace', id: 'trace' },
      ],
    },
  ],
  tools: {
    access: ['javascript_execute'],
    config: {
      tool: (params: Record<string, any>) => 'javascript_execute',
      params: (params: Record<string, any>) => ({
        code: params.code,
        packages: params.packages || [],
        timeout: (params.timeout || 30) * 1000, // Convert to milliseconds
        memoryLimit: params.memoryLimit || 256,
        enableDebugging: params.enableDebugging || false,
        enableNetworking: params.enableNetworking || true,
        sandboxMode: params.sandboxMode || 'vm',
        logLevel: params.logLevel || 'info',
        // Pass through workflow context
        envVars: params._context?.environmentVariables || {},
        workflowVariables: params._context?.workflowVariables || {},
        blockData: params._context?.blockData || {},
        blockNameMapping: params._context?.blockNameMapping || {},
        workflowId: params._context?.workflowId,
      }),
    },
  },
  inputs: {
    code: {
      type: 'string',
      description: 'JavaScript code to execute with enhanced features',
    },
    packages: {
      type: 'json',
      description: 'Array of NPM packages to make available',
    },
    timeout: {
      type: 'number',
      description: 'Execution timeout in seconds',
    },
    memoryLimit: {
      type: 'number',
      description: 'Memory limit in MB',
    },
    enableDebugging: {
      type: 'boolean',
      description: 'Enable debugging features',
    },
    enableNetworking: {
      type: 'boolean',
      description: 'Allow network access',
    },
    sandboxMode: {
      type: 'string',
      description: 'Sandbox security level',
    },
    logLevel: {
      type: 'string',
      description: 'Logging verbosity level',
    },
  },
  outputs: {
    result: {
      type: 'json',
      description: 'Return value from the executed JavaScript function',
    },
    stdout: {
      type: 'string',
      description: 'Console output and debug messages from execution',
    },
    stderr: {
      type: 'string',
      description: 'Error messages and warnings from execution',
    },
    executionTime: {
      type: 'number',
      description: 'Actual execution time in milliseconds',
    },
    memoryUsage: {
      type: 'number',
      description: 'Peak memory usage in MB',
    },
    debugInfo: {
      type: 'json',
      description: 'Debugging information including breakpoints and variable states',
    },
    securityReport: {
      type: 'json',
      description: 'Security analysis report including resource usage and policy violations',
    },
  },
}
